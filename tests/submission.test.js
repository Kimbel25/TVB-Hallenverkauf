import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {validieren, ARTIKEL} from '../lib/abrechnung.js';
import {createPdf} from '../lib/pdf.js';
import {Dropbox,contentHash} from '../lib/dropbox.js';
import {onRequestPost} from '../functions/api/submit.js';
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
test('4.4 preview is byte-identical to uploaded PDF, named files and stable retry',async()=>withDropbox(async fake=>{
 const input=fixture();input.abrechnung.version='4.4';input.abrechnung.mannschaft='Damen 1 / männliche A-Jugend';
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
