// Preise in Cent; Bezeichnungen und Preise werden niemals vom Browser übernommen.
export const ARTIKEL = [
  ['Bier/Radler/Alkoholfrei – 20er Kasten',1600],
  ['Bier/Radler/Alkoholfrei – 24er Kasten',2000],
  ['Bier/Radler/Alkoholfrei – Flasche',80],
  ['Cola – 24er Kasten',1800], ['Cola – Flasche',80],
  ['Hochwald Limo/Apfelschorle – 20er Kasten',2100],
  ['Hochwald Limo/Apfelschorle – Flasche 0,5 l',110],
  ['Hochwald Sprudel – 20er Kasten',1600],
  ['Hochwald Sprudel – Flasche 0,5 l',80],
  ['ISO Sport – 20er Kasten',1800], ['ISO Sport – Flasche',90],
  ['Sekt – Flasche',600], ['Hanuta/Duplo – Stück',40],
  ['Chips – Packung',100], ['Pfand – Flasche',25],
  ['Hugo / Aperol / Spritz – Dose',100]
];
export class PublicError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
    throw new PublicError('Ungültiger Text in der Abrechnung.');
  }
  const result = value.normalize('NFC').trim();
  if (required && !result) throw new PublicError('Bitte alle Pflichtfelder ausfüllen.');
  return result;
}
export function validieren(input) {
  const d = input?.abrechnung;
  const id = input?.id;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) ||
      !d || typeof d !== 'object' || Array.isArray(d) ||
      typeof d.datum !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(d.datum) ||
      !Number.isFinite(Date.parse(d.datum)) || new Date(d.datum).toISOString().slice(0,10) !== d.datum ||
      !Array.isArray(d.waren) || ![15, ARTIKEL.length].includes(d.waren.length) ||
      !Array.isArray(d.ausgaben) || d.ausgaben.length > 50 ||
      typeof d.quittungen !== 'boolean') {
    throw new PublicError('Ungültige Abrechnung.');
  }
  const waren = ARTIKEL.slice(0, d.waren.length).map(([bezeichnung, preis], i) => {
    const anzahl = d.waren[i]?.anzahl;
    if (!Number.isInteger(anzahl) || anzahl < 0 || anzahl > 10000) {
      throw new PublicError('Ungültige Getränkemenge.');
    }
    return {bezeichnung, anzahl, einzelpreis: preis / 100, summe: anzahl * preis / 100};
  });
  let sonstigeCent = 0;
  const ausgaben = d.ausgaben.map(a => {
    if (!a || typeof a.betrag !== 'number' || !Number.isFinite(a.betrag) ||
        a.betrag < 0 || a.betrag > 100000 || Math.abs(a.betrag * 100 - Math.round(a.betrag * 100)) > 0.000001) {
      throw new PublicError('Ungültiger Ausgabenbetrag (höchstens zwei Nachkommastellen).');
    }
    const betrag = Math.round(a.betrag * 100);
    sonstigeCent += betrag;
    return {text: text(a.text, 200, betrag > 0), betrag: betrag / 100};
  });
  if (sonstigeCent > 0 && !d.quittungen) throw new PublicError('Bitte die Quittungen bestätigen.');
  const getraenkeCent = waren.reduce((sum, a, i) => sum + a.anzahl * ARTIKEL[i][1], 0);
  // Feste Reihenfolge, kein wechselnder Zeitstempel, keine ungeprüften Felder.
  return {
    version: ['4.2','4.3','4.4'].includes(d.version) ? d.version : '4.1', id, datum: d.datum,
    mannschaft: text(d.mannschaft, 120, true), person: text(d.person, 120, true),
    waren, ausgaben, quittungen: d.quittungen, bemerkung: text(d.bemerkung ?? '', 2000),
    summen: {getraenke: getraenkeCent / 100, sonstige: sonstigeCent / 100,
      gesamt: (getraenkeCent + sonstigeCent) / 100}
  };
}
