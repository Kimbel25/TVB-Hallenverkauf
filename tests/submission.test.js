import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {validieren, ARTIKEL} from '../lib/abrechnung.js';
import {createPdf} from '../lib/pdf.js';
import {Dropbox,contentHash} from '../lib/dropbox.js';
import {onRequestPost} from '../functions/api/submit.js';
import {onRequestPost as verbindungstestPost} from '../functions/api/verbindungstest.js';
const font = await readFile(new URL('../assets/fonts/NotoSans.deflate',import.meta.url));
export function fixture(id='00000000-0000-4000-8000-000000000001') {
  return {id,vereinscode:'test-only',abrechnung:{datum:'2026-11-03',mannschaft:'Damen 1',person:'Erika Müller',
    waren:ARTIKEL.map((_,i)=>({anzahl:i===0?2:0,einzelpreis:-999,bezeichnung:'UNGEPRÜFT'})),
    ausgaben:[{text:'Brötchen & Würstchen',betrag:23.45}],quittungen:true,bemerkung:'Testbeleg – keine echte Abrechnung',summen:{gesamt:0}}};
}
const jsonResponse=(data,status=200,headers={})=>Response.json(data,{status,headers});
class FakeDropbox {
  files=new Map(); folders=new Set(); calls=[]; failPdf=0; loseReply=false; corrupt=false; folderFile=false;
  async fetch(url,options) {
    if(url.endsWith('/token')) return jsonResponse({access_token:'not-a-real-token'});
    if(url.endsWith('/create_folder_v2')) {
      const {path}=JSON.parse(options.body);
      if(this.folderFile) return jsonResponse({error:{'.tag':'path',path:{'.tag':'conflict',conflict:{'.tag':'file'}}}},409);
      if(this.folders.has(path)) return jsonResponse({error:{'.tag':'path',path:{'.tag':'conflict',conflict:{'.tag':'folder'}}}},409);
      this.folders.add(path);return jsonResponse({metadata:{path_lower:path.toLowerCase()}});
    }
    if(url.endsWith('/files/get_metadata')) {
      this.metaCalls=(this.metaCalls||0)+1;
      if(this.ablageFehlt) return jsonResponse({error:{'.tag':'path',path:{'.tag':'not_found'}}},409);
      return jsonResponse({'.tag':'folder',name:'Abrechnungen'});
    }
    assert.ok(url.endsWith('/files/upload'));
    const arg=JSON.parse(options.headers['Dropbox-API-Arg']);
    assert.equal(arg.mode,'add');assert.equal(arg.autorename,false);assert.equal(arg.strict_conflict,false);
    this.calls.push(arg.path);
    if(arg.path.endsWith('.pdf') && this.failPdf-->0) return jsonResponse({},503);
    const bytes=new Uint8Array(options.body);
    assert.equal(arg.content_hash,await contentHash(bytes));
    const old=this.files.get(arg.path);
    if(old && !Buffer.from(old).equals(bytes)) return jsonResponse({error:{'.tag':'path',path:{'.tag':'conflict'}}},409);
    this.files.set(arg.path,bytes);
    if(this.loseReply) {this.loseReply=false;throw Error('simulated lost acknowledgement');}
    return jsonResponse({content_hash:this.corrupt?'wrong':arg.content_hash,size:bytes.length,rev:'1',path_lower:arg.path.toLowerCase()});
  }
}
const env={TVB_VEREINSCODE:'test-only',DROPBOX_APP_KEY:'test',DROPBOX_APP_SECRET:'test',DROPBOX_REFRESH_TOKEN:'test',
  ASSETS:{fetch:async()=>new Response(font)}};
async function send(input, overrides={}) {
  const request=new Request('https://example.test/api/submit',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json',...overrides.headers},
    body:typeof input==='string'?input:JSON.stringify(input)});
  const response=await onRequestPost({request,env:{...env,...overrides.env}});
  return {status:response.status,data:await response.json()};
}
async function withDropbox(fn) {
  const saved=globalThis.fetch;const fake=new FakeDropbox();globalThis.fetch=fake.fetch.bind(fake);
  try {await fn(fake);} finally {globalThis.fetch=saved;}
}
test('server ignores submitted prices, labels and totals',()=>{
  const d=validieren(fixture());assert.equal(d.summen.gesamt,55.45);assert.equal(d.waren[0].einzelpreis,16);
  assert.equal(d.waren[0].bezeichnung,ARTIKEL[0][0]);assert.ok(!JSON.stringify(d).includes('UNGEPRÜFT'));
});
test('invalid dates, fractional quantities, nulls, strings, excess cents and receipts rejected',()=>{
  const changes=[d=>d.datum='2026-02-30',d=>d.waren[0]=null,d=>d.waren[0].anzahl=.5,d=>d.waren[0].anzahl='2',
    d=>d.ausgaben[0]=null,d=>d.ausgaben[0].betrag=.001,d=>d.quittungen=false,d=>d.person={},d=>d.ausgaben[0].text=''];
  for(const change of changes) {const input=fixture();change(input.abrechnung);assert.throws(()=>validieren(input));}
});
test('PDF is deterministic and paginates long statements',async()=>{
  const data=validieren(fixture());const a=await createPdf(data,font), b=await createPdf(data,font);
  assert.deepEqual(a,b);assert.equal(Buffer.from(a).subarray(0,5).toString(),'%PDF-');
  const long=fixture();long.abrechnung.mannschaft='Damen '.repeat(20);long.abrechnung.person='Müller '.repeat(17);
  long.abrechnung.ausgaben=Array.from({length:50},(_,i)=>({text:`Ausgabe ${i+1}: `+'Brötchen und Würstchen '.repeat(8),betrag:12.34}));
  long.abrechnung.bemerkung='Langer Hinweis mit Umlauten äöü und €: '.repeat(50);
  await mkdir('tmp/pdfs',{recursive:true});
  await writeFile('tmp/pdfs/beispiel.pdf',a);
  await writeFile('tmp/pdfs/lang.pdf',await createPdf(validieren(long),font));
});
test('unsupported glyphs rejected before storing any file',async()=>withDropbox(async fake=>{
  const input=fixture();input.abrechnung.person='Erika 😀';
  const r=await send(input);assert.equal(r.status,400);assert.equal(fake.files.size,0);
}));
test('success only for verified JSON and PDF; duplicate retry stays at two files',async()=>withDropbox(async fake=>{
  const first=await send(fixture());assert.equal(first.status,200);assert.equal(first.data.status,'vollständig');
  assert.ok(first.data.dateien.json.hash);assert.ok(first.data.dateien.pdf.hash);
  assert.equal(fake.files.size,2);
  const retry=await send(fixture());assert.deepEqual(retry,first);assert.equal(fake.files.size,2);
}));
test('partial upload fails and retry repairs missing PDF with same JSON',async()=>withDropbox(async fake=>{
  fake.failPdf=3;
  const first=await send(fixture());assert.equal(first.status,503);assert.equal(first.data.ok,false);assert.equal(fake.files.size,1);
  const json=[...fake.files.values()][0];
  const second=await send(fixture());assert.equal(second.status,200);assert.equal(fake.files.size,2);
  assert.deepEqual([...fake.files.values()][0],json);
}));
test('lost upload acknowledgement is retried without duplicate file',async()=>withDropbox(async fake=>{
  fake.loseReply=true;assert.equal((await send(fixture())).status,200);assert.equal(fake.files.size,2);
}));
test('same ID with changed date or amount is a conflict and never overwrites',async()=>withDropbox(async fake=>{
  await send(fixture());const before=[...fake.files.values()].map(b=>Buffer.from(b));
  for(const change of [d=>d.datum='2026-11-04',d=>d.ausgaben[0].betrag=2]) {
    const input=fixture();change(input.abrechnung);assert.equal((await send(input)).status,409);
  }
  assert.deepEqual([...fake.files.values()].map(b=>Buffer.from(b)),before);
}));
test('parallel conflicting requests produce only one consistent pair',async()=>withDropbox(async fake=>{
  const b=fixture();b.abrechnung.person='Andere Person';
  const results=await Promise.all([send(fixture()),send(b)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(fake.files.size,2);
}));
test('bad confirmation hash and folder/file conflict cannot count as success',async()=>withDropbox(async fake=>{
  fake.corrupt=true;assert.equal((await send(fixture())).status,503);
  fake.folderFile=true;assert.equal((await send(fixture())).status,503);
}));
test('invalid requests rejected without Dropbox access',async()=>withDropbox(async fake=>{
  assert.equal((await send('{')).status,400);
  assert.equal((await send(fixture(),{headers:{Origin:'https://evil.test'}})).status,403);
  assert.equal((await send(fixture(),{headers:{'Content-Type':'text/plain'}})).status,415);
  const wrong=fixture();wrong.vereinscode='wrong';assert.equal((await send(wrong)).status,403);
  assert.equal((await send(' '.repeat(50001))).status,413);
  assert.equal((await send(fixture(),{env:{DROPBOX_APP_KEY:''}})).status,503);
  assert.equal(fake.files.size,0);assert.equal(fake.folders.size,0);
}));
test('429 respects Retry-After; long delays stop safely; retries are bounded',async()=>{
  let calls=0;const sleeps=[];
  const db=new Dropbox({}, {fetcher:async()=>++calls===1?jsonResponse({},429,{'Retry-After':'1'}):jsonResponse({}),sleep:async n=>sleeps.push(n)});
  await db.request('test',{});assert.equal(calls,2);assert.ok(sleeps[0]>=1000);
  calls=0;db.fetcher=async()=>{calls++;return jsonResponse({},429,{'Retry-After':'60'});};
  await assert.rejects(()=>db.request('test',{}));assert.equal(calls,1);
  calls=0;db.fetcher=async()=>{calls++;return jsonResponse({},503);};
  await assert.rejects(()=>db.request('test',{}));assert.equal(calls,3);
});
test('missing/corrupt font cannot produce a confirmed submission',async()=>withDropbox(async fake=>{
  assert.equal((await send(fixture(),{env:{ASSETS:{fetch:async()=>new Response('<html>fallback</html>')}}})).status,503);
  assert.equal(fake.files.size,0);
}));
test('new cans use supplier price of 1 euro and existing 15-item records remain valid',()=>{
  const input=fixture();input.abrechnung.waren[15]={anzahl:3,einzelpreis:999};
  const data=validieren(input);
  assert.equal(data.waren[15].bezeichnung,'Hugo / Aperol / Spritz – Dose');
  assert.equal(data.waren[15].einzelpreis,1);assert.equal(data.summen.gesamt,58.45);
  input.abrechnung.waren=input.abrechnung.waren.slice(0,15);
  const legacy=validieren(input);assert.equal(legacy.waren.length,15);assert.equal(legacy.summen.gesamt,55.45);
});
test('network function receives no Dropbox instance as receiver',async()=>{
  const db=new Dropbox({}, {fetcher:async function(){assert.equal(this,undefined);return Response.json({});}});
  assert.equal((await db.request('test',{})).status,200);
});
test('4.5 preview is byte-identical to uploaded PDF, named files and stable retry',async()=>withDropbox(async fake=>{
 const input=fixture();input.abrechnung.version='4.5';input.abrechnung.mannschaft='Damen 1 / männliche A-Jugend';
 const req=new Request('https://example.test/api/preview',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify(input)});
 const {handle}=await import('../functions/api/submit.js');
 const preview=await handle({request:req,env},true);assert.equal(preview.status,200);assert.equal(fake.files.size,0);
 assert.match(decodeURIComponent(preview.headers.get('Content-Disposition')),/2026-11-03_Hallenverkauf_Damen 1 _ männliche A-Jugend.pdf/);
 const bytes=new Uint8Array(await preview.arrayBuffer());
 const first=await send(input);assert.equal(first.status,200);
 const entry=[...fake.files.entries()].find(([name])=>name.endsWith('.pdf'));
 assert.deepEqual(entry[1],bytes);assert.match(entry[0],/2026-11-03_Hallenverkauf_Damen 1 _ männliche A-Jugend.pdf$/);
 assert.equal((await send(input)).status,200);assert.equal(fake.files.size,3);
 const changed=structuredClone(input);changed.abrechnung.datum='2026-11-04';assert.equal((await send(changed)).status,409);
 await writeFile('tmp/pdfs/v42.pdf',bytes);
 const long=structuredClone(input);long.abrechnung.ausgaben=Array.from({length:50},(_,i)=>({text:'Ausgabe '+i+' Brötchen '.repeat(15),betrag:12.34}));
 long.abrechnung.bemerkung='Langer Hinweis '.repeat(120);
 await writeFile('tmp/pdfs/v42-lang.pdf',await createPdf(validieren(long),font));
}));
test('only final PDF upload permits Dropbox notifications',async()=>withDropbox(async fake=>{
 const original=globalThis.fetch;const uploads=[];
 globalThis.fetch=async(url,options)=>{if(url.endsWith('/files/upload')) uploads.push(JSON.parse(options.headers['Dropbox-API-Arg']));return original(url,options);};
 const input=fixture();input.abrechnung.version='4.2';
 assert.equal((await send(input)).status,200);
 assert.equal(uploads.filter(a=>!a.mute).length,1);
 assert.ok(uploads.find(a=>!a.mute).path.endsWith('.pdf'));
 assert.ok(uploads.filter(a=>!a.path.endsWith('.pdf')).every(a=>a.mute));
}));

import {berechneKasse,validiereKasse,STUECKELUNG} from '../lib/kasse.js';
import {validiereKasse as validiereKasseLegacy} from '../lib/kasse-v50.js';
function cashFixture(id='00000000-0000-4000-8000-000000000010'){
 const input=fixture(id);input.abrechnung.version='5.0';
 input.abrechnung.kasse={modus:'betrag',bestand:400,sonstigeEinnahmen:20,einnahmenText:'Spende'};
 return input;
}
test('paper example 7 November: 386.40 counted, 56.90 drinks, team 100, department 99.50',()=>{
 const input=cashFixture();input.abrechnung.ausgaben=[];input.abrechnung.kasse={modus:'betrag',bestand:386.40,sonstigeEinnahmen:0,einnahmenText:''};
 const qty=[1,0,8,0,17,0,9,0,5,0,0,0,0,3,0,4];input.abrechnung.waren=qty.map(anzahl=>({anzahl}));
 const d=validieren(input),a=d.kassenabrechnung;
 assert.equal(d.summen.getraenke,56.9);assert.equal(a.verkaufCent,25640);assert.equal(a.endbestandCent,32950);
 assert.equal(a.gewinnCent,19950);assert.equal(a.mannschaftCent,10000);assert.equal(a.abteilungCent,9950);
});
test('paper example 8 November corrects the handwritten one-euro arithmetic discrepancy',()=>{
 const input=cashFixture();input.abrechnung.ausgaben=[];input.abrechnung.kasse={modus:'betrag',bestand:431,sonstigeEinnahmen:0,einnahmenText:''};
 input.abrechnung.waren=[0,0,3,1,1,0,8,0,11,0,7,0,1,12,0,0].map(anzahl=>({anzahl}));
 const d=validieren(input),a=d.kassenabrechnung;
 assert.equal(d.summen.getraenke,57.5);assert.equal(a.verkaufCent,30100);assert.equal(a.endbestandCent,37350);
 assert.equal(a.gewinnCent,24350);assert.equal(a.mannschaftCent,12000);assert.equal(a.abteilungCent,12350);
});
test('expenses reconstruct sales once, donations are already included in counted cash',()=>{
 const a=berechneKasse(40000,5000,6000,2000);
 assert.equal(a.zwischensummeCent,45000);assert.equal(a.verkaufCent,30000);assert.equal(a.endbestandCent,34000);
 assert.equal(a.gewinnCent,21000);assert.equal(a.mannschaftCent,10500);assert.equal(a.abteilungCent,10500);
 assert.equal(a.bestandCent-a.getraenkeCent-a.mannschaftCent-a.abteilungCent,13000);
});
test('rounding is nearest five euros with halfway upwards and residual never lost',()=>{
 for(const [profit,team]of[[499,0],[500,500],[501,500],[1499,500],[1500,1000],[1501,1000]]){
  assert.equal(berechneKasse(13000+profit,0,0,0).mannschaftCent,team);
 }
 for(let profit=0;profit<200000;profit+=37){
  const a=berechneKasse(13000+profit,0,0,0);
  assert.equal(a.mannschaftCent%500,0);assert.equal(a.mannschaftCent+a.abteilungCent,profit);
  assert.ok(a.abteilungCent>=0);assert.ok(Math.abs(a.mannschaftCent-profit/2)<=250);
 }
 const a=berechneKasse(10000,0,2000,0);assert.equal(a.gewinnCent,-5000);
 assert.equal(a.fehlbetragCent,5000);assert.equal(a.uebertragCent,8000);assert.equal(a.wechselgeldSollCent,13000);assert.equal(a.mannschaftCent,0);assert.equal(a.abteilungCent,0);
});
test('denomination count is recomputed and forged total is ignored',()=>{
 const k=validiereKasseLegacy({modus:'stueckelung',bestand:99999,stueckelung:[0,0,2,3,1,1,1,0,1,0,2,0,0,0,0],sonstigeEinnahmen:0,einnahmenText:''});
 assert.equal(k.bestand,386.4);
 const input=cashFixture();input.abrechnung.kasse={...k,bestand:1};input.abrechnung.kassenabrechnung={mannschaftCent:999999};
 const d=validieren(input);assert.equal(d.kasse.bestand,386.4);assert.notEqual(d.kassenabrechnung.mannschaftCent,999999);
});
test('missing cash, invalid precision, negative sums and invalid denomination counts are rejected',()=>{
 for(const change of [k=>delete k.bestand,k=>k.bestand=null,k=>k.bestand='400',k=>k.bestand=-1,k=>k.bestand=.001,
   k=>k.sonstigeEinnahmen=-1,k=>k.einnahmenText='',k=>{k.modus='stueckelung';k.stueckelung=Array(15).fill(.5);},k=>k.modus='invalid']){
  const input=cashFixture();change(input.abrechnung.kasse);assert.throws(()=>validieren(input));
 }
 const input=cashFixture();delete input.abrechnung.kasse;assert.throws(()=>validieren(input));
});
test('5.0 preview equals uploaded report; folder and file have matching human names',async()=>withDropbox(async fake=>{
 const input=cashFixture();input.abrechnung.mannschaft='Damen 1 / Herren';
 const {handle}=await import('../functions/api/submit.js');
 const preview=await handle({env,request:new Request('https://example.test/api/preview',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify(input)})},true);
 assert.equal(preview.status,200);const bytes=new Uint8Array(await preview.arrayBuffer());assert.equal(fake.files.size,0);
 const result=await send(input);assert.equal(result.status,200);assert.equal(result.data.version,'5.0');
 const pair=[...fake.files.entries()].find(([p])=>p.endsWith('.pdf'));
 assert.equal(pair[0],'/Abrechnungen/V5_0/2026-11-03_Hallenverkauf_Damen 1 _ Herren/2026-11-03_Hallenverkauf_Damen 1 _ Herren.pdf');
 assert.deepEqual(bytes,pair[1]);assert.equal((await send(input)).status,200);assert.equal(fake.files.size,4);
 const changed=structuredClone(input);changed.abrechnung.datum='2026-11-04';assert.equal((await send(changed)).status,409);
 await writeFile('tmp/pdfs/v50.pdf',bytes);
}));
test('two distinct IDs on same date/team receive separate stable human folders',async()=>withDropbox(async fake=>{
 const a=cashFixture(),b=cashFixture('00000000-0000-4000-8000-000000000011');
 const results=await Promise.all([send(a),send(b)]);assert.ok(results.every(r=>r.status===200));
 const paths=[...fake.files.keys()].filter(p=>p.endsWith('.pdf'));assert.equal(paths.length,2);
 assert.ok(paths.some(p=>p.includes('Damen 1 (2)/2026-11-03_Hallenverkauf_Damen 1 (2).pdf')));
 const before=[...fake.files.keys()].sort();await send(a);await send(b);assert.deepEqual([...fake.files.keys()].sort(),before);
}));
test('partial 5.0 upload resumes same readable folder without duplicate PDF',async()=>withDropbox(async fake=>{
 fake.failPdf=3;const input=cashFixture();assert.equal((await send(input)).status,503);
 assert.equal([...fake.files.keys()].filter(p=>p.endsWith('.json')).length,1);
 assert.equal((await send(input)).status,200);assert.equal([...fake.files.keys()].filter(p=>p.endsWith('.pdf')).length,1);
 assert.ok(![...fake.files.keys()].some(p=>p.includes(' (2)')));
}));

import {ARTIKEL6} from '../lib/abrechnung.js';
import {kassiererEndpoint} from '../functions/api/submit.js';
const cashAuth={TVB_KASSIERER_PASSWORT:'unit-cashier'};
function nextFixture(id='00000000-0000-4000-8000-000000000060'){
 const input=fixture(id);input.abrechnung.version='6.0';input.abrechnung.mannschaften=['Damen 1','Herren'];
 input.abrechnung.waren=ARTIKEL6.map((_,i)=>({anzahl:i===0?2:0}));
 input.abrechnung.kassenVerantwortung='kassierer';input.abrechnung.kasse={modus:'ausstehend',sonstigeEinnahmen:10,einnahmenText:'Spende'};
 return input;
}
async function admin(payload,importieren=false,config=cashAuth){
 const request=new Request('https://example.test/api/kassierer',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify(payload)});
 const response=await kassiererEndpoint({request,env:{...env,...config}},importieren);return {status:response.status,data:await response.json()};
}
function finalFrom(input,loaded,bestand=400){
 return {id:input.id,abrechnung:{...loaded.data.abrechnung,kasse:{modus:'betrag',bestand,sonstigeEinnahmen:10,einnahmenText:'Spende'}},kassiererPasswort:'unit-cashier',nachweisOffen:loaded.data.nachweisOffen};
}
async function savedOpen(fake,input){
 assert.equal((await send(input,{env:cashAuth})).status,200);
 return JSON.parse(new TextDecoder().decode([...fake.files.entries()].find(([p])=>p.endsWith('.json'))[1]));
}
test('6.0 removes deposit and large banknotes, retaining historical catalogs',()=>{
 assert.equal(ARTIKEL6.length,15);assert.ok(!ARTIKEL6.some(([name])=>name.includes('Pfand')));
 assert.equal(ARTIKEL6[14][1],100);assert.deepEqual(STUECKELUNG.slice(0,3),[10000,5000,2000]);
 const raw=nextFixture();raw.abrechnung.kassenVerantwortung='hallendienst';raw.abrechnung.kasse={modus:'stueckelung',stueckelung:Array(15).fill(0),sonstigeEinnahmen:0,einnahmenText:''};assert.throws(()=>validieren(raw));
 raw.abrechnung.waren.push({anzahl:1});assert.throws(()=>validieren(raw));
});
test('open reports have no fictitious cash result or completed filename',async()=>withDropbox(async fake=>{
 const input=nextFixture();const raw=await savedOpen(fake,input);
 assert.equal(raw.abschlussstatus,'offen');assert.equal(raw.kasse.modus,'ausstehend');assert.ok(!('bestand'in raw.kasse));assert.ok(!('kassenabrechnung'in raw));
 assert.equal(typeof raw.pruefung.signatur,'string');assert.ok(!JSON.stringify(raw).includes('unit-cashier'));
 assert.ok(![...fake.files.keys()].some(p=>p.includes('_komplett')));
 assert.equal((await send(input,{env:cashAuth})).data.abrechnungsstatus,'offen');
 await writeFile('tmp/pdfs/v60-offen.json',JSON.stringify(raw,null,2));
 const pdf=[...fake.files.entries()].find(([p])=>p.endsWith('.pdf'))[1];await writeFile('tmp/pdfs/v60-offen.pdf',pdf);
}));
test('cashier password is checked on server, unset configuration fails closed',async()=>{
 assert.equal((await admin({kassiererPasswort:'wrong'})).status,403);
 assert.equal((await admin({kassiererPasswort:'unit-cashier'})).status,200);
 assert.equal((await admin({kassiererPasswort:'unit-cashier'},false,{})).status,503);
});
test('import verifies signatures, ignores forged derived totals, rejects modified inputs and completed files',async()=>withDropbox(async fake=>{
 const input=nextFixture();const raw=await savedOpen(fake,input);
 assert.equal((await admin({kassiererPasswort:'wrong',beleg:raw},true)).status,403);
 assert.equal((await admin({kassiererPasswort:'unit-cashier',beleg:raw},true)).status,200);
 const changed=structuredClone(raw);changed.waren[0].anzahl++;assert.equal((await admin({kassiererPasswort:'unit-cashier',beleg:changed},true)).status,400);
 const totals=structuredClone(raw);totals.summen.gesamt=999999;
 const normalized=await admin({kassiererPasswort:'unit-cashier',beleg:totals},true);assert.equal(normalized.status,200);assert.equal(normalized.data.abrechnung.summen.gesamt,55.45);
 const loaded=await admin({kassiererPasswort:'unit-cashier',beleg:raw},true);
 const final=finalFrom(input,loaded);assert.equal((await send(final,{env:cashAuth})).status,200);
 const complete=JSON.parse(new TextDecoder().decode([...fake.files.entries()].find(([p])=>p.endsWith('_komplett.json'))[1]));
 assert.equal((await admin({kassiererPasswort:'unit-cashier',beleg:complete},true)).status,400);
}));
test('cashier completes only authenticated signed input, same ID and folder, with immutable finished stage',async()=>withDropbox(async fake=>{
 const input=nextFixture();const raw=await savedOpen(fake,input);
 const before=new Map(fake.files);const loaded=await admin({kassiererPasswort:'unit-cashier',beleg:raw},true);
 const final=finalFrom(input,loaded);
 const noPassword=structuredClone(final);delete noPassword.kassiererPasswort;assert.equal((await send(noPassword,{env:cashAuth})).status,403);
 const noProof=structuredClone(final);delete noProof.nachweisOffen;assert.equal((await send(noProof,{env:cashAuth})).status,400);
 const modified=structuredClone(final);modified.abrechnung.person='Changed';assert.equal((await send(modified,{env:cashAuth})).status,400);
 const result=await send(final,{env:cashAuth});assert.equal(result.status,200);assert.equal(result.data.abrechnungsstatus,'komplett');assert.equal(result.data.id,input.id);
 const pdfPath=[...fake.files.keys()].find(p=>p.endsWith('_komplett.pdf'));assert.ok(pdfPath.includes('/2026-11-03_Hallenverkauf_Damen 1 _ Herren/'));
 for(const [path,bytes]of before)assert.deepEqual(fake.files.get(path),bytes);
 assert.equal(fake.files.size,8);assert.equal((await send(final,{env:cashAuth})).status,200);assert.equal(fake.files.size,8);
 assert.equal((await send(finalFrom(input,loaded,401),{env:cashAuth})).status,409);
 await writeFile('tmp/pdfs/v60-komplett.pdf',fake.files.get(pdfPath));
}));
test('two-team payout splits rounded overall share exactly in half without second rounding',async()=>withDropbox(async fake=>{
 const input=nextFixture();input.abrechnung.kassenVerantwortung='hallendienst';input.abrechnung.kasse={modus:'betrag',bestand:372,sonstigeEinnahmen:0,einnahmenText:''};
 const d=validieren(input);assert.equal(d.kassenabrechnung.mannschaftCent,10500);
 assert.deepEqual(d.kassenabrechnung.auszahlungen,[{name:'Damen 1',betragCent:5250},{name:'Herren',betragCent:5250}]);
 assert.equal((await send(input,{env:cashAuth})).status,200);
 input.abrechnung.mannschaften=['Elterngruppe'];const single=validieren(input);assert.deepEqual(single.kassenabrechnung.auszahlungen,[{name:'Elterngruppe',betragCent:10500}]);
}));
test('complete 6.0 previews require cashier password and match final upload',async()=>withDropbox(async fake=>{
 const input=nextFixture();input.abrechnung.kassenVerantwortung='hallendienst';input.abrechnung.kasse={modus:'betrag',bestand:400,sonstigeEinnahmen:0,einnahmenText:''};
 const {handle}=await import('../functions/api/submit.js');
 async function preview(body){return handle({env:{...env,...cashAuth},request:new Request('https://example.test/api/preview',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify(body)})},true);}
 assert.equal((await preview(input)).status,403);input.kassiererPasswort='unit-cashier';const response=await preview(input);assert.equal(response.status,200);
 const bytes=new Uint8Array(await response.arrayBuffer());assert.equal(fake.files.size,0);assert.equal((await send(input,{env:cashAuth})).status,200);
 assert.deepEqual([...fake.files.entries()].find(([p])=>p.endsWith('_komplett.pdf'))[1],bytes);
}));

test('6.1 removes donations without changing signed 6.0 records and completes in its own folder',async()=>withDropbox(async fake=>{
 const old=nextFixture();const raw=await savedOpen(fake,old);
 const oldPdf=[...fake.files.entries()].find(([p])=>p.endsWith('.pdf'))[1];
 const next=nextFixture('00000000-0000-4000-8000-000000000061');next.abrechnung.version='6.1';
 assert.throws(()=>validieren(next),/Bareinnahmen/);
 next.abrechnung.kasse={modus:'ausstehend'};const data=validieren(next);assert.equal(data.kasse.sonstigeEinnahmen,0);
 assert.equal((await send(next,{env:cashAuth})).status,200);
 const openPath=[...fake.files.keys()].find(p=>p.includes('/V6_1/')&&p.endsWith('.json'));
 const open=JSON.parse(new TextDecoder().decode(fake.files.get(openPath)));
 const loaded=await admin({kassiererPasswort:'unit-cashier',beleg:open},true);assert.equal(loaded.status,200);
 const final={id:next.id,abrechnung:{...loaded.data.abrechnung,kasse:{modus:'betrag',bestand:372}},kassiererPasswort:'unit-cashier',nachweisOffen:loaded.data.nachweisOffen};
 const result=await send(final,{env:cashAuth});assert.equal(result.status,200);assert.equal(result.data.abrechnungsstatus,'komplett');
 assert.ok(fake.files.has(openPath.replace(/\.json$/,'_komplett.pdf')));assert.equal((await send(final,{env:cashAuth})).status,200);
 const oldLoaded=await admin({kassiererPasswort:'unit-cashier',beleg:raw},true);assert.equal(oldLoaded.status,200);assert.equal(oldLoaded.data.abrechnung.kasse.sonstigeEinnahmen,10);
 assert.deepEqual(await createPdf(validieren(old),font),oldPdf);
}));

async function verbindungstest(input, overrides={}) {
  const request=new Request('https://example.test/api/verbindungstest',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json',...overrides.headers},body:JSON.stringify(input)});
  const response=await verbindungstestPost({request,env:{...env,...overrides.env}});
  return {status:response.status,data:await response.json()};
}
test('Verbindungstest mit TVB prüft Server, Dropbox und PDF, speichert aber nichts',async()=>withDropbox(async fake=>{
  const input=fixture('00000000-0000-4000-8000-0000000000aa');
  const r=await verbindungstest({vereinscode:'TVB',id:input.id,abrechnung:input.abrechnung});
  assert.equal(r.status,200);assert.equal(r.data.ok,true);assert.equal(r.data.test,true);assert.equal(r.data.gespeichert,false);
  assert.deepEqual(r.data.schritte.map(s=>s.status),['ok','ok','ok','ok','ok']);
  assert.equal(fake.files.size,0);assert.equal(fake.folders.size,0);assert.equal(fake.calls.length,0);assert.equal(fake.metaCalls,1);
  fake.ablageFehlt=true;
  const ohneFormular=await verbindungstest({vereinscode:'TVB'});
  assert.equal(ohneFormular.data.ok,true);assert.equal(ohneFormular.data.schritte.at(-1).status,'übersprungen');
  assert.match(ohneFormular.data.schritte[3].hinweis,/ersten echten Senden/);
  assert.equal(fake.files.size,0);assert.equal(fake.folders.size,0);
}));
test('Verbindungstest nur mit exakt TVB; echte Übermittlung mit TVB bleibt abgelehnt',async()=>withDropbox(async fake=>{
  for(const code of ['tvb','TVB ','test-only',undefined]){
    const r=await verbindungstest({vereinscode:code});assert.equal(r.status,403);assert.equal(r.data.ok,false);
  }
  assert.equal(fake.metaCalls,undefined);
  const real=fixture();real.vereinscode='TVB';const s=await send(real);
  assert.equal(s.status,403);assert.equal(fake.files.size,0);
}));
test('Verbindungstest meldet fehlende Secrets und Kollision des echten Vereinscodes',async()=>withDropbox(async fake=>{
  const ohne=await verbindungstest({vereinscode:'TVB'},{env:{DROPBOX_REFRESH_TOKEN:''}});
  assert.equal(ohne.status,503);assert.equal(ohne.data.schritte.at(-1).status,'fehler');
  const kollision=await verbindungstest({vereinscode:'TVB'},{env:{TVB_VEREINSCODE:'TVB'}});
  assert.equal(kollision.data.ok,true);assert.equal(kollision.data.schritte[1].status,'warnung');
  assert.equal(fake.files.size,0);
}));
