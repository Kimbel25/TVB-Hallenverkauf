import metrics from './pdf-font.json';
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
  const fontData=new Uint8Array(fontBytes);
  const actualHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',fontData))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(actualHash!==metrics.fontHash) throw new Error('PDF font asset invalid');
  const pages=[]; const used=new Map(); let page,y;
  const glyph = char => {
    const value=metrics.chars[char.codePointAt(0)];
    if(!value || value[0]===0) throw new PublicError('Das PDF unterstützt ein verwendetes Sonderzeichen nicht. Bitte Sonderzeichen oder Emojis in den Textfeldern entfernen.');
    return value;
  };
  const width = (text,size) => [...text].reduce((sum,char)=>sum+glyph(char)[1]*size/1000,0);
  function draw(text,x,y,size=10,color=black) {
    let codes='';
    for(const char of text) {
      const [id,w]=glyph(char);codes+=hex(id);
      if(!used.has(id)) used.set(id,{w,unicode:utf16(char)});
    }
    page.push(`BT /F1 ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm <${codes}> Tj ET\n`);
  }
  function nextPage() {
    page=[];pages.push(page);
    page.push(`${red} rg 0 756 595.28 85 re f\n`);
    draw('TVB Hallenverkauf',40,799,20,'1 1 1');
    draw('Turnverein Birkenfeld 1848 · Ausgabenabrechnung 4.1',40,776,10,'1 1 1');
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
  function heading(value) {ensure(46);y-=12;text(value,{size:13,color:red});y-=4;}
  function row(label,amount) {
    const lines=wrap(label,400,10);ensure(lines.length*15+5);
    draw(money(amount),555-width(money(amount),10),y);
    for(const line of lines) {draw(line,40,y);y-=15;}y-=5;
  }
  nextPage();
  text('Vorgang: '+data.id,{size:9});text('Datum: '+data.datum);
  text('Mannschaft: '+data.mannschaft);text('Verantwortliche Person: '+data.person);
  heading('Wareneinsatz Getränke');text('Lieferantenkosten · keine Verkaufseinnahmen',{size:9});
  for(const item of data.waren) row(`${item.anzahl} × ${item.bezeichnung} (${money(item.einzelpreis)})`,item.summe);
  row('Wareneinsatz Getränke gesamt',data.summen.getraenke);
  heading('Sonstige Ausgaben');
  if(!data.ausgaben.length) text('Keine sonstigen Ausgaben.');
  for(const item of data.ausgaben) row(item.text||'Leere Ausgabenzeile',item.betrag);
  row('Sonstige Ausgaben gesamt',data.summen.sonstige);
  text('Quittungen in der Kasse: '+(data.quittungen?'bestätigt':'nicht bestätigt'));
  heading('Gesamtausgaben');row('Wareneinsatz Getränke und sonstige Ausgaben',data.summen.gesamt);
  if(data.bemerkung) {heading('Bemerkungen');text(data.bemerkung);}
  pages.forEach((p,i)=>{
    page=p;page.push(`${red} RG 1 w 40 42 m 555 42 l S\n`);
    draw(`TV Birkenfeld 1848 · Seite ${i+1} / ${pages.length}`,40,26,8);
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
  const pageIds=[];
  for(const commands of pages) {
    const id=objects.length+1;pageIds.push(id);
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 7 0 R >> >> /Contents ${id+1} 0 R >>`);
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
