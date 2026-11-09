import {offeneBasis,signatur,signaturGueltig,kanonisch} from '../../lib/belegschutz.js';
import {validieren, PublicError} from '../../lib/abrechnung.js';
import {Dropbox} from '../../lib/dropbox.js';
import {dateiname,ordnername} from '../../lib/dateiname.js';
import {createPdf} from '../../lib/pdf.js';
const headers = {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'};
const reply = (data, status=200) => new Response(JSON.stringify(data), {status,headers});
export async function readInput(request) {
  // Tatsächliche Bytes begrenzen, unabhängig vom Content-Length-Header.
  const reader = request.body?.getReader();
  if (!reader) throw new PublicError('Leere Abrechnung.');
  let size=0; const chunks=[];
  try {
    for (;;) {
      const {value, done} = await reader.read(); if(done) break;
      size += value.length;
      if(size > 50000) { await reader.cancel(); throw new PublicError('Abrechnung zu groß.',413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset=0;
  for(const chunk of chunks) {bytes.set(chunk,offset); offset += chunk.length;}
  try {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch {throw new PublicError('Ungültiges JSON.');}
}
export async function sameSecret(actual, expected) {
  if(typeof actual !== 'string') return false;
  const encode = value => new TextEncoder().encode(value);
  const a = new Uint8Array(await crypto.subtle.digest('SHA-256',encode(actual)));
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256',encode(expected)));
  let diff=0; for(let i=0; i<a.length; i++) diff |= a[i]^b[i];
  return diff === 0;
}
export async function handle({request,env},preview=false) {
  try {
    if(request.headers.get('Origin') !== new URL(request.url).origin) throw new PublicError('Zugriff verweigert.',403);
    if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new PublicError('JSON erforderlich.',415);
    if(!env.ASSETS || (!preview && (!env.TVB_VEREINSCODE || !env.DROPBOX_APP_KEY || !env.DROPBOX_APP_SECRET || !env.DROPBOX_REFRESH_TOKEN))) {
      throw new PublicError('Serverkonfiguration muss vom Kassenwart geprüft werden.',503);
    }
    const input = await readInput(request);
    const data = validieren(input);
    const kassiererAbschluss=['6.0','6.1'].includes(data.version)&&data.kassenVerantwortung==='kassierer'&&data.abschlussstatus==='komplett';
    if(kassiererAbschluss || (preview&&['6.0','6.1'].includes(data.version)&&data.abschlussstatus==='komplett'))await kassiererPruefen(input.kassiererPasswort,env);
    if(kassiererAbschluss && !await signaturGueltig(offeneBasis(data),input.nachweisOffen,env))throw new PublicError('Die geladene Vorlage ist verändert oder nicht gültig. Bitte die originale offene JSON laden.',400);
    if(!preview && !kassiererAbschluss && !await sameSecret(input?.vereinscode,env.TVB_VEREINSCODE)) throw new PublicError('Vereinscode ungültig.',403);
    if(['6.0','6.1'].includes(data.version)) data.pruefung={verfahren:'HMAC-SHA256',signatur:await signatur(data,env)};
    const fontResponse = await env.ASSETS.fetch(new URL('/assets/fonts/NotoSans.deflate',request.url));
    if(!fontResponse.ok) throw new Error('font');
    // Vor dem ersten Dropbox-Schreibvorgang auf vollständig erzeugbares PDF prüfen.
    const pdf = await createPdf(data,await fontResponse.arrayBuffer());
    if(preview) return new Response(pdf,{headers:{'Content-Type':'application/pdf','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':"inline; filename=\"Hallenverkauf.pdf\"; filename*=UTF-8''"+encodeURIComponent(dateiname(data)+'.pdf')}});
    const json = new TextEncoder().encode(JSON.stringify(data,null,2));
    const dropbox = new Dropbox(env);
    await dropbox.connect();
    await dropbox.folder('/Abrechnungen');
    await dropbox.folder('/Abrechnungen/V4_1');
    // Globale ID statt Datum/Mannschaft im Pfad: geänderte Daten unter gleicher ID kollidieren.
    let path = '/Abrechnungen/V4_1/' + data.id;
    if(['5.0','6.0','6.1'].includes(data.version)) {
      const base='/Abrechnungen/V'+data.version.replace('.','_');
      await dropbox.folder(base);await dropbox.folder(base+'/_Vorgaenge');
      if(['6.0','6.1'].includes(data.version)){
        await dropbox.file(base+'/_Vorgaenge/'+data.id+'.basis.lock',new TextEncoder().encode(kanonisch(offeneBasis(data))));
        await dropbox.file(base+'/_Vorgaenge/'+data.id+'.'+data.abschlussstatus+'.lock',json);
      }else await dropbox.file(base+'/_Vorgaenge/'+data.id+'.lock',json);
      const basis=ordnername(data);let ordner;
      for(let i=1;i<=30;i++){
        const kandidat=basis+(i===1?'':' ('+i+')');
        try{
          await dropbox.file(base+'/_Vorgaenge/Ordner_'+kandidat+'.lock',new TextEncoder().encode(JSON.stringify({id:data.id})));
          ordner=kandidat;break;
        }catch(error){if(!(error instanceof PublicError)||error.status!==409)throw error;}
      }
      if(!ordner)throw new PublicError('Zu viele gleichnamige Abrechnungen. Bitte den Kassenwart kontaktieren.',409);
      await dropbox.folder(base+'/'+ordner);
      path=base+'/'+ordner+'/'+ordner+(['6.0','6.1'].includes(data.version)&&data.abschlussstatus==='komplett'?'_komplett':'');
    } else if(['4.2','4.3','4.4','4.5'].includes(data.version)) {
      const base='/Abrechnungen/V'+data.version.replace('.','_');
      await dropbox.folder(base);
      await dropbox.folder(base+'/_Vorgaenge');
      await dropbox.file(base+'/_Vorgaenge/'+data.id+'.lock',json);
      const dir=base+'/'+data.id;
      await dropbox.folder(dir);
      path=dir+'/'+dateiname(data);
    }
    const jsonFile = await dropbox.file(path + '.json',json);
    const pdfFile = await dropbox.file(path + '.pdf',pdf,{notify:true});
    return reply({ok:true, version:data.version, id:data.id, status:'vollständig', ...(['6.0','6.1'].includes(data.version)?{abrechnungsstatus:data.abschlussstatus}:{}), dateien:{json:jsonFile,pdf:pdfFile}});
  } catch(error) {
    // Keine Zugangsdaten, Nutzdaten oder Dropbox-Antworten in Logs/Fehlermeldungen.
    if(error instanceof PublicError) return reply({ok:false,error:error.message},error.status);
    return reply({ok:false,error:'Übermittlung nicht bestätigt. Bitte dieselbe Abrechnung erneut übermitteln.'},503);
  }
}

export const onRequestPost = context => handle(context);

export async function kassiererPruefen(passwort,env){
 if(!env.TVB_KASSIERER_PASSWORT)throw new PublicError('Das Kassierer-Passwort ist am Server noch nicht eingerichtet.',503);
 if(!await sameSecret(passwort,env.TVB_KASSIERER_PASSWORT))throw new PublicError('Kassierer-Passwort ungültig.',403);
}
export async function kassiererEndpoint(context,importieren=false){
 try{
  const {request,env}=context;
  if(request.headers.get('Origin')!==new URL(request.url).origin)throw new PublicError('Zugriff verweigert.',403);
  if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')throw new PublicError('JSON erforderlich.',415);
  const input=await readInput(request);await kassiererPruefen(input.kassiererPasswort,env);
  if(!importieren)return reply({ok:true});
  const raw=input.beleg;
  if(!['6.0','6.1'].includes(raw?.version))throw new PublicError('Bitte eine offene JSON-Abrechnung aus Version 6.0 oder neuer laden. Alte fertige Abrechnungen werden nicht verändert.');
  const data=validieren({id:raw.id,abrechnung:raw});
  if(data.abschlussstatus!=='offen')throw new PublicError('Diese Abrechnung ist bereits komplett. Bitte die offene Ausgangsdatei laden.');
  if(!await signaturGueltig(data,raw.pruefung?.signatur,env))throw new PublicError('Die Datei ist verändert oder ihre Echtheit konnte nicht bestätigt werden. Bitte die originale Dropbox-JSON laden.');
  return reply({ok:true,abrechnung:data,nachweisOffen:raw.pruefung.signatur});
 }catch(error){return reply({ok:false,error:error instanceof PublicError?error.message:'Import konnte nicht geprüft werden.'},error instanceof PublicError?error.status:503);}
}
