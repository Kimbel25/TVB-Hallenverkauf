import {validieren, PublicError} from '../../lib/abrechnung.js';
import {Dropbox} from '../../lib/dropbox.js';
import {dateiname} from '../../lib/dateiname.js';
import {createPdf} from '../../lib/pdf.js';
const headers = {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'};
const reply = (data, status=200) => new Response(JSON.stringify(data), {status,headers});
async function readInput(request) {
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
async function sameSecret(actual, expected) {
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
    if(!preview && !await sameSecret(input?.vereinscode,env.TVB_VEREINSCODE)) throw new PublicError('Vereinscode ungültig.',403);
    const data = validieren(input);
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
    if(['4.2','4.3'].includes(data.version)) {
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
    return reply({ok:true, version:data.version, id:data.id, status:'vollständig', dateien:{json:jsonFile,pdf:pdfFile}});
  } catch(error) {
    // Keine Zugangsdaten, Nutzdaten oder Dropbox-Antworten in Logs/Fehlermeldungen.
    if(error instanceof PublicError) return reply({ok:false,error:error.message},error.status);
    return reply({ok:false,error:'Übermittlung nicht bestätigt. Bitte dieselbe Abrechnung erneut übermitteln.'},503);
  }
}

export const onRequestPost = context => handle(context);
