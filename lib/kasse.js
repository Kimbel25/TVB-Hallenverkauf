// Geld wird ausschließlich in ganzen Cent gerechnet. Gemeinsame Regeln für Browser/Server.
export const ANFANG_CENT = 13000;
export const STUECKELUNG = [10000,5000,2000,1000,500,200,100,50,20,10,5,2,1];
export function geldCent(value, name='Betrag', maximum=1000000) {
  if(typeof value!=='number' || !Number.isFinite(value) || value<0 || value>maximum ||
      Math.abs(value*100-Math.round(value*100))>0.000001) {
    throw Error(name+': bitte einen gültigen Betrag mit höchstens zwei Nachkommastellen eingeben.');
  }
  return Math.round(value*100);
}
export function validiereKasse(raw) {
  if(!raw || !['betrag','stueckelung'].includes(raw.modus)) throw Error('Bitte die Kasse zählen.');
  let bestandCent, zaehlung;
  if(raw.modus==='stueckelung') {
    if(!Array.isArray(raw.stueckelung) || raw.stueckelung.length!==STUECKELUNG.length ||
        raw.stueckelung.some(n=>!Number.isInteger(n)||n<0||n>100000)) throw Error('Ungültige Anzahl bei der Kassenzählung.');
    zaehlung=[...raw.stueckelung];
    bestandCent=zaehlung.reduce((sum,n,i)=>sum+n*STUECKELUNG[i],0);
    if(bestandCent>100000000) throw Error('Der gezählte Bestand ist zu groß.');
  } else bestandCent=geldCent(raw.bestand,'Gezählter Kassenbestand');
  const sonstigeCent=geldCent(raw.sonstigeEinnahmen,'Sonstige Bareinnahmen');
  if(typeof raw.einnahmenText!=='string' || raw.einnahmenText.length>200 ||
     /[\u0000-\u001f\u007f]/.test(raw.einnahmenText) || (sonstigeCent>0 && !raw.einnahmenText.trim())) {
    throw Error('Bitte die sonstigen Bareinnahmen kurz beschreiben (z. B. Spende).');
  }
  return {modus:raw.modus,bestand:bestandCent/100,...(zaehlung?{stueckelung:zaehlung}:{}),
    sonstigeEinnahmen:sonstigeCent/100,einnahmenText:raw.einnahmenText.normalize('NFC').trim()};
}
export function berechneKasse(bestandCent,ausgabenCent,getraenkeCent,sonstigeEinnahmenCent,mannschaften=[]) {
  for(const n of [bestandCent,ausgabenCent,getraenkeCent,sonstigeEinnahmenCent]) {
    if(!Number.isSafeInteger(n)||n<0) throw Error('Ungültiger Cent-Betrag.');
  }
  const zwischensummeCent=bestandCent+ausgabenCent;
  const verkaufCent=zwischensummeCent-ANFANG_CENT-sonstigeEinnahmenCent;
  const endbestandCent=bestandCent-getraenkeCent;
  const gewinnCent=endbestandCent-ANFANG_CENT;
  // 50 % auf nächstgelegene 5 Euro, genau auf der Mitte nach oben.
  const mannschaftCent=gewinnCent>0?Math.floor((gewinnCent+500)/1000)*500:0;
  const abteilungCent=gewinnCent>0?gewinnCent-mannschaftCent:0;
  const fehlbetragCent=Math.max(0,-gewinnCent);
  const auszahlungen=mannschaften.map(name=>({name,betragCent:mannschaftCent/mannschaften.length}));
  return {auszahlungen,waehrung:'EUR',anfangCent:ANFANG_CENT,bestandCent,ausgabenCent,getraenkeCent,
    sonstigeEinnahmenCent,zwischensummeCent,verkaufCent,endbestandCent,gewinnCent,
    anteilProzent:50,rundungCent:500,mannschaftCent,abteilungCent,fehlbetragCent,
    wechselgeldSollCent:ANFANG_CENT,uebertragCent:Math.max(0,Math.min(ANFANG_CENT,endbestandCent))};
}
