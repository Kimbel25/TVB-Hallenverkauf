// Verbindungstest (Vereinscode „TVB“): prüft Server, Dropbox-Anmeldung, lesenden Zugriff auf die
// Ablage und optional die PDF-Erzeugung. Es wird NICHTS in Dropbox geschrieben oder gespeichert.
import {readInput, sameSecret} from './submit.js';
import {validieren, PublicError} from '../../lib/abrechnung.js';
import {Dropbox} from '../../lib/dropbox.js';
import {signatur} from '../../lib/belegschutz.js';
import {createPdf} from '../../lib/pdf.js';
export const TESTCODE = 'TVB';
const headers = {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'};
const reply = (data, status=200) => new Response(JSON.stringify({...data, test:true, gespeichert:false}), {status,headers});
export async function onRequestPost({request, env}) {
  const schritte = [];
  const start = Date.now();
  const fehler = (name, hinweis, status=503) => {schritte.push({name, status:'fehler', hinweis}); return reply({ok:false, error:hinweis, schritte}, status);};
  try {
    if(request.headers.get('Origin') !== new URL(request.url).origin) throw new PublicError('Zugriff verweigert.',403);
    if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new PublicError('JSON erforderlich.',415);
    const input = await readInput(request);
    if(input?.vereinscode !== TESTCODE) throw new PublicError('Der Verbindungstest ist nur mit dem Testcode möglich.',403);
    schritte.push({name:'Server erreichbar', status:'ok'});
    if(!env.ASSETS || !env.TVB_VEREINSCODE || !env.DROPBOX_APP_KEY || !env.DROPBOX_APP_SECRET || !env.DROPBOX_REFRESH_TOKEN) {
      return fehler('Serverkonfiguration', 'Es fehlen Einstellungen bei Cloudflare. Bitte den Kassenwart informieren.');
    }
    schritte.push(await sameSecret(TESTCODE, env.TVB_VEREINSCODE)
      ? {name:'Serverkonfiguration', status:'warnung', hinweis:'Der echte Vereinscode lautet „TVB“ und kollidiert mit dem Testcode. Bitte bei Cloudflare ändern.'}
      : {name:'Serverkonfiguration', status:'ok'});
    const dropbox = new Dropbox(env);
    try { await dropbox.connect(); }
    catch(error) { return fehler('Dropbox-Anmeldung', error instanceof PublicError ? error.message : 'Dropbox-Anmeldung fehlgeschlagen.'); }
    schritte.push({name:'Dropbox-Anmeldung', status:'ok'});
    try {
      const ablage = await dropbox.pruefen('/Abrechnungen');
      schritte.push({name:'Dropbox-Ablage', status: ablage === 'ohneLeserecht' ? 'warnung' : 'ok',
        hinweis: {fehlt:'Ordner „Abrechnungen“ wird beim ersten echten Senden angelegt.', ohneLeserecht:'Lesezugriff nicht freigegeben; Ablage nur indirekt geprüft.'}[ablage]});
    } catch(error) { return fehler('Dropbox-Ablage', error instanceof PublicError ? error.message : 'Dropbox-Ablage nicht erreichbar.'); }
    if(input.abrechnung) {
      try {
        const data = validieren({id:input.id, abrechnung:input.abrechnung});
        if(['6.0','6.1'].includes(data.version)) data.pruefung = {verfahren:'HMAC-SHA256', signatur:await signatur(data, env)};
        const fontResponse = await env.ASSETS.fetch(new URL('/assets/fonts/NotoSans.deflate', request.url));
        if(!fontResponse.ok) throw new PublicError('Schriftdatei nicht gefunden.', 503);
        const pdf = await createPdf(data, await fontResponse.arrayBuffer());
        schritte.push({name:'Beleg (PDF) als Probe erstellt', status:'ok', hinweis:Math.max(1, Math.round(pdf.length/1024))+' KB – verworfen, nicht gespeichert'});
      } catch(error) {
        schritte.push({name:'Beleg (PDF) als Probe erstellt', status:'warnung', hinweis: error instanceof PublicError ? error.message : 'PDF konnte nicht erstellt werden.'});
      }
    } else schritte.push({name:'Beleg (PDF) als Probe', status:'übersprungen', hinweis:'Formular noch unvollständig – nur die Verbindung wurde geprüft.'});
    return reply({ok:true, dauerMs:Date.now()-start, schritte});
  } catch(error) {
    if(error instanceof PublicError) return reply({ok:false, error:error.message, schritte}, error.status);
    return reply({ok:false, error:'Verbindungstest fehlgeschlagen.', schritte}, 503);
  }
}
