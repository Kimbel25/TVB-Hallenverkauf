import {createPdf as legacyPdf} from './pdf-v45.js';
import metrics from './pdf-font.js';
import {bytes as crest, alpha as crestAlpha, width as crestWidth, height as crestHeight} from './wappen.js';
import {PublicError} from './abrechnung.js';
// Minimaler PDF-1.7-Schreiber. Schriftkompression und Metriken entstehen beim Build;
// zur Laufzeit keine Bibliothek, Schriftanalyse, Kompression oder Bildverarbeitung.
const encoder = new TextEncoder();
const red = '0.721569 0.035294 0.101961';
const black = '0.1 0.1 0.1';
const money = n => n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const hex = (n,length=4) => n.toString(16).padStart(length,'0').toUpperCase();
const utf16 = char => [...Array(char.length)].map((_,i)=>hex(char.charCodeAt(i))).join('');
export async function createPdf(data, fontBytes) {
  if(data.version!=='5.0') return legacyPdf(data,fontBytes);
  const fontData=new Uint8Array(fontBytes);
  const actualHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',fontData))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(actualHash!==metrics.fontHash) throw new Error('PDF font asset invalid');
  const modern=true;
  const withCrest=data.waren.length>15; // Alte offene 4.1-Vorgänge behalten ihren bytegleichen Beleg.
  const pages=[]; const used=new Map(); let page,y;
  const glyph = char => {
    const value=metrics.chars[char.codePointAt(0)];
    if(!value || value[0]===0) throw new PublicError('Das PDF unterstützt ein verwendetes Sonderzeichen nicht. Bitte Sonderzeichen oder Emojis in den Textfeldern entfernen.');
    return value;
  };
  const width = (text,size) => [...text].reduce((sum,char)=>sum+glyph(char)[1]*size/1000,0);
  function draw(text,x,y,size=10,color=black,bold=false) {
    let codes='';
    for(const char of text) {
      const [id,w]=glyph(char);codes+=hex(id);
      if(!used.has(id)) used.set(id,{w,unicode:utf16(char)});
    }
    page.push(`${bold ? 'q\n' : ''}BT /F1 ${size} Tf ${bold ? '0.3 w 2 Tr '+color+' RG ' : ''}${color} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm <${codes}> Tj ET\n${bold ? 'Q\n' : ''}`);
  }
  function nextPage() {
    page=[];pages.push(page);
    page.push(`0.2 0.2 0.2 RG 0.8 w 40 756 m 555 756 l S\n`);
    if(withCrest) page.push(`q 68 0 0 ${(68*crestHeight/crestWidth).toFixed(2)} 487 765 cm /Wappen Do Q\n`);
    draw('TVB Hallenverkauf',40,799,20,black,true);
    draw('Saison 2026/2027',40,780,12,black);
    draw('Turnverein Birkenfeld · Abteilung Handball · Version 5.0',40,764,9,black);
    y=733;
  }
  function ensure(height) {if(y-height<57) nextPage();}
  function wrap(value,maxWidth,size) {
    const lines=[];
    for(const paragraph of String(value).replace(/\r\n?/g,'\n').replace(/\t/g,'    ').split('\n')) {
      let line='', lineWidth=0;
      for(const word of paragraph.split(/(\s+)/u)) {
        if(line && lineWidth+width(word,size)>maxWidth) {lines.push(line.trimEnd());line='';lineWidth=0;}
        if(!line && /^\s+$/.test(word)) continue;
        // Auch lange Zeichenfolgen ohne Leerzeichen bleiben innerhalb des Satzspiegels.
        for(const char of word) {
          const charWidth=glyph(char)[1]*size/1000;
          if(line && lineWidth+charWidth>maxWidth) {lines.push(line.trimEnd());line='';lineWidth=0;}
          line+=char;lineWidth+=charWidth;
        }
      }
      lines.push(line.trimEnd());
    }
    return lines;
  }
  function text(value,{size=10,x=40,maxWidth=515,color=black}={}) {
    for(const line of wrap(value,maxWidth,size)) {ensure(size+5);if(line) draw(line,x,y,size,color);y-=size+5;}
  }
  function rule() {ensure(14);page.push(`0.75 0.75 0.75 RG 0.5 w 40 ${y+3} m 555 ${y+3} l S\n`);y-=10;}
  function heading(value) {ensure(65);if(modern) rule();y-=modern?5:12;text(value,{size:13,color:red});y-=3;}
  function row(label,amount) {
    const lines=wrap(label,400,10);ensure(lines.length*15+5);
    draw(money(amount),555-width(money(amount),10),y);
    for(const line of lines) {draw(line,40,y);y-=15;}y-=5;
  }
  function kopfZeile(label,value){
    const lines=wrap(value,400,13);ensure(lines.length*18+3);draw(label,40,y,13);
    for(const line of lines){draw(line,155,y,13);y-=18;}
  }
  function kopfdaten(){
    kopfZeile('Datum:',data.datum.split('-').reverse().join('.'));
    kopfZeile('Mannschaft:',data.mannschaft);kopfZeile('Name:',data.person);
  }
  function cashRow(label,cent,strong=false){
    if(!strong){row(label,cent/100);return;}
    const lines=wrap(label,390,11);ensure(lines.length*17+9);
    draw(money(cent/100),555-width(money(cent/100),12),y,12,black,true);
    for(const line of lines){draw(line,40,y,11,black,true);y-=17;}y-=6;
  }
  const a=data.kassenabrechnung;
  nextPage();kopfdaten();
  heading('Einnahmen aus der Kassenzählung');
  text('Kassenbestand zu Beginn: fest 130,00 €. Sonstige Bareinnahmen sind bereits mitgezählt.',{size:9});
  cashRow('Bestand nach Kassenzählung',a.bestandCent);
  cashRow('+ Bereits entnommene Ausgaben aus der Kasse',a.ausgabenCent);
  cashRow('= Zwischensumme vor Ausgaben',a.zwischensummeCent,true);
  cashRow('− Kassenbestand zu Beginn',a.anfangCent);
  cashRow('− Sonstige Bareinnahmen (in der Zählung enthalten)',a.sonstigeEinnahmenCent);
  cashRow('= Einnahmen aus Verkauf',a.verkaufCent,true);
  cashRow('Sonstige Einnahmen – separat ausgewiesen',a.sonstigeEinnahmenCent);
  if(data.kasse.einnahmenText)text(data.kasse.einnahmenText,{size:9});
  heading('Kassenbestand und Getränkeabführung');
  cashRow('Bestand nach Kassenzählung',a.bestandCent);
  cashRow('− Wareneinsatz Getränke – separat abführen',a.getraenkeCent);
  cashRow('= Endbestand nach Getränkeabführung',a.endbestandCent,true);
  cashRow('− Wechselgeld für den nächsten Hallendienst',a.anfangCent);
  cashRow('= Gewinn / Verlust',a.gewinnCent,true);
  heading('Auszahlungen und Übertrag');
  cashRow('Auszahlung an die Mannschaft',a.mannschaftCent,true);
  cashRow('Auszahlung an die Abteilung / zur Einzahlung',a.abteilungCent,true);
  cashRow('Verbleibender Kassenbestand',a.uebertragCent);
  text('Aufteilung 50/50: Mannschaft auf die nächsten 5 € gerundet (bei halbem Schritt aufwärts). Abteilung erhält den exakten Rest.',{size:9});
  if(a.fehlbetragCent>0)text('Fehlbetrag: '+money(a.fehlbetragCent/100)+'. Keine Gewinnauszahlung. Dieser Betrag fehlt für Getränkegeld und 130 € neues Wechselgeld.',{size:10,color:red});
  if(a.verkaufCent<0)text('Achtung: Rechnerische Verkaufseinnahmen negativ. Zählung, Ausgaben und sonstige Einnahmen prüfen.',{size:10,color:red});
  nextPage();kopfdaten();
  heading('Details: Wareneinsatz Getränke');
  text('Lieferantenkosten · separat abzuführen · keine Verkaufseinnahmen',{size:9});rule();
  for(const item of data.waren){
    const lines=wrap(`${item.bezeichnung} (${money(item.einzelpreis)})`,350,10);ensure(lines.length*15+5);
    draw(String(item.anzahl),40,y);draw('×',69,y);
    draw(money(item.summe),555-width(money(item.summe),10),y);
    for(const line of lines){draw(line,88,y);y-=14;}y-=1;
  }
  cashRow('Wareneinsatz Getränke gesamt',a.getraenkeCent,true);
  heading('Details: Ausgaben aus der Kasse');
  if(!data.ausgaben.length)text('Keine sonstigen Ausgaben.');
  for(const item of data.ausgaben)row(item.text||'Leere Ausgabenzeile',item.betrag);
  cashRow('Ausgaben aus der Kasse gesamt',a.ausgabenCent,true);
  text(a.ausgabenCent>0?'Geld aus der Kasse entnommen und Quittungen hinterlegt: bestätigt':'Keine Ausgaben aus der Kasse; keine Belegbestätigung erforderlich.',{size:9});
  cashRow('Gesamtausgaben (Getränke + Ausgaben aus der Kasse)',a.getraenkeCent+a.ausgabenCent,true);
  if(data.kasse.modus==='stueckelung'){
    heading('Details: Scheine und Münzen');
    const werte=[50000,20000,10000,5000,2000,1000,500,200,100,50,20,10,5,2,1];
    data.kasse.stueckelung.forEach((n,i)=>{if(n)row(n+' × '+money(werte[i]/100),n*werte[i]/100);});
    cashRow('Gezählter Bestand',a.bestandCent,true);
  }
  if(data.bemerkung){heading('Bemerkungen');text(data.bemerkung);}
  pages.forEach((p,i)=>{
    page=p;page.push(`${red} RG 1 w 40 42 m 555 42 l S\n`);
    draw(`Turnverein Birkenfeld · Handball · Saison 2026/2027 · Seite ${i+1} / ${pages.length}`,40,26,8);
    if(modern) draw('Vorgang: '+data.id,40,12,7);
  });
  const objects=[];
  const add = value => {objects.push(typeof value==='string'?encoder.encode(value):value);return objects.length;};
  const join = chunks => {const out=new Uint8Array(chunks.reduce((n,b)=>n+b.length,0));let offset=0;for(const b of chunks){out.set(b,offset);offset+=b.length;}return out;};
  const stream = (bytes,extra='') => join([encoder.encode(`<< /Length ${bytes.length} ${extra} >>\nstream\n`),bytes,encoder.encode('\nendstream')]);
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(''); // Seitennummern folgen nach den Schriftobjekten.
  add(stream(new Uint8Array(fontBytes),`/Filter /FlateDecode /Length1 ${metrics.length1}`));
  add(`<< /Type /FontDescriptor /FontName /${metrics.name} /Flags 32 /FontBBox [${metrics.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${metrics.ascent} /Descent ${metrics.descent} /CapHeight ${metrics.capHeight} /StemV 80 /FontFile2 3 0 R >>`);
  const sorted=[...used].sort((a,b)=>a[0]-b[0]);
  add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${metrics.name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 4 0 R /CIDToGIDMap /Identity /W [${sorted.map(([id,v])=>`${id} [${v.w}]`).join(' ')}] >>`);
  let cmap='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /TVBUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
  for(let i=0;i<sorted.length;i+=100) {
    const chunk=sorted.slice(i,i+100);
    cmap+=`${chunk.length} beginbfchar\n`+chunk.map(([id,v])=>`<${hex(id)}> <${v.unicode}>`).join('\n')+'\nendbfchar\n';
  }
  cmap+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
  add(stream(encoder.encode(cmap)));
  add(`<< /Type /Font /Subtype /Type0 /BaseFont /${metrics.name} /Encoding /Identity-H /DescendantFonts [5 0 R] /ToUnicode 6 0 R >>`);
  const maskId=withCrest ? add(stream(crestAlpha,`/Type /XObject /Subtype /Image /Width ${crestWidth} /Height ${crestHeight} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`)) : null;
  const crestId=withCrest ? add(stream(crest,`/Type /XObject /Subtype /Image /Width ${crestWidth} /Height ${crestHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask ${maskId} 0 R`)) : null;
  const pageIds=[];
  for(const commands of pages) {
    const id=objects.length+1;pageIds.push(id);
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 7 0 R >>${withCrest ? ` /XObject << /Wappen ${crestId} 0 R >>` : ''} >> /Contents ${id+1} 0 R >>`);
    add(stream(encoder.encode(commands.join(''))));
  }
  objects[1]=encoder.encode(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] >>`);
  const chunks=[encoder.encode('%PDF-1.7\n%TVB\n')];let length=chunks[0].length;const offsets=[0];
  objects.forEach((obj,i)=>{
    offsets.push(length);
    const header=encoder.encode(`${i+1} 0 obj\n`),end=encoder.encode('\nendobj\n');
    chunks.push(header,obj,end);length+=header.length+obj.length+end.length;
  });
  chunks.push(encoder.encode(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+
    offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')+
    `trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`));
  return join(chunks);
}
