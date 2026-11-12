// Zentrale Versionsangaben. Die App-Version ist nur Anzeige; das Datenformat bestimmt
// Server-Prüfung, PDF-Layout und Ablageordner und bleibt bei reinen Oberflächen-Updates gleich.
const APP_VERSION='6.2';
const DATENFORMAT='6.1';
const NEUE_FORMATE=['6.0','6.1'];
const ZAEHL_FORMATE=['5.0',...NEUE_FORMATE];
const BEKANNTE_FORMATE=['4.1','4.2','4.3','4.4','4.5',...ZAEHL_FORMATE];
const SAISON='2026/2027';
const istNeuesFormat=v=>NEUE_FORMATE.includes(v);

// Kassierer-Freigabe bleibt nur im Arbeitsspeicher. Kein Passwort im Browser-Speicher.
let auswertungEntsperrt=false,kassiererPasswort='',formularVersion=DATENFORMAT;
let importKontext=null,sheetZweck='';
const importKey='tvb_kassierer_import_v6';
try{const c=JSON.parse(localStorage.getItem(importKey)||'null');if(c&&typeof c.id==='string'&&typeof c.nachweisOffen==='string')importKontext=c;}catch{}
function schutzDaten(){return {kassiererPasswort,nachweisOffen:importKontext?.nachweisOffen};}
function wirdGezaehlt(){
 return $('zaehlVerantwortung').value==='hallendienst'||!!importKontext||
  !!(istNeuesFormat(storedSubmission?.abrechnung.version)&&storedSubmission.abrechnung.kasse?.modus!=='ausstehend');
}
function zustaendigkeitAnzeigen(){
 const zaehlen=wirdGezaehlt()||!istNeuesFormat(formularVersion);
 $('kassenZaehlbereich').hidden=!zaehlen;
 $('kassiererHinweis').hidden=zaehlen||$('zaehlVerantwortung').value!=='kassierer';
 $('importHinweis').hidden=!importKontext;
}

// Kassierer-Sheet (Passwort, JSON-Import, Sperren)
function sheetZustand(){
 $('anmeldeBlock').hidden=auswertungEntsperrt;
 $('freigabeBlock').hidden=!auswertungEntsperrt;
}
function zeigeKassiererAnmeldung(text='Bitte das Kassierer-Passwort eingeben.',zweck='auswertung'){
 sheetZweck=zweck;
 const dlg=$('kassiererAnmeldung');
 $('authStatus').textContent=auswertungEntsperrt?'Kassierer-Bereich ist freigegeben.':text;
 $('authStatus').classList.remove('fehlerText');
 $('importStatus').textContent='';
 sheetZustand();
 if(!dlg.open)dlg.showModal();
 if(!auswertungEntsperrt)setTimeout(()=>$('kassiererPasswort').focus(),60);
}
function kassiererSchliessen(){const dlg=$('kassiererAnmeldung');if(dlg.open)dlg.close();}
async function kassiererApi(path,payload){
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 let result;try{result=await response.json();}catch{throw Error('Die Serverantwort konnte nicht geprüft werden.');}
 if(!response.ok||!result.ok)throw Error(result.error||'Prüfung fehlgeschlagen.');return result;
}
async function auswertungFreigeben(){
 const button=$('auswertungFreigeben');
 if(!$('kassiererPasswort').value){$('authStatus').textContent='Bitte das Passwort eingeben.';$('authStatus').classList.add('fehlerText');$('kassiererPasswort').focus();return;}
 knopfLaedt(button,true);
 try{
  const pass=$('kassiererPasswort').value;
  await kassiererApi('/api/kassierer',{kassiererPasswort:pass});
  kassiererPasswort=pass;auswertungEntsperrt=true;$('auswertungDetails').open=true;$('kassiererPasswort').value='';
  $('authStatus').textContent='Kassierer-Bereich freigegeben. Nach Neuladen ist das Passwort erneut nötig.';
  $('authStatus').classList.remove('fehlerText');
  sheetZustand();berechnen();
  if(sheetZweck!=='json'){
   kassiererSchliessen();
   const hinweis={abschluss:'Freigegeben. Jetzt „Komplette Abrechnung übermitteln“ erneut tippen.',pdf:'Freigegeben. Die PDF-Vorschau ist jetzt verfügbar.'}[sheetZweck]||'Auswertung freigegeben.';
   toast(hinweis,'ok');
   if(sheetZweck==='auswertung')$('auswertungDetails').scrollIntoView({behavior:'smooth',block:'start'});
  }
 }catch(error){$('authStatus').textContent=error.message;$('authStatus').classList.add('fehlerText');}
 finally{knopfLaedt(button,false);}
}
function jsonLadenStarten(){
 if(sending||(storedSubmission&&storedSubmission.state!=='sent')){toast('Bitte zuerst den offenen Übermittlungsversuch abschließen.','fehler');return;}
 if(!auswertungEntsperrt){zeigeKassiererAnmeldung('Zum Laden einer JSON zuerst das Kassierer-Passwort eingeben. Danach die JSON-Datei auswählen.','json');return;}
 zeigeKassiererAnmeldung('','json');
}
function jsonDateiWaehlen(){$('jsonDatei').click();}
async function jsonDateiLaden(){
 const input=$('jsonDatei'),file=input.files?.[0];if(!file)return;
 try{
  if(!auswertungEntsperrt||!kassiererPasswort){zeigeKassiererAnmeldung(undefined,'json');throw Error('Bitte zuerst den Kassierer-Bereich freigeben.');}
  if(sending||(storedSubmission&&storedSubmission.state!=='sent'))throw Error('Bitte zuerst den offenen Übermittlungsversuch abschließen.');
  if(file.size>50000)throw Error('Diese JSON-Datei ist zu groß.');
  let beleg;try{beleg=JSON.parse(await file.text());}catch{throw Error('Die ausgewählte Datei enthält keine gültige JSON-Abrechnung.');}
  $('importStatus').textContent='Wird geprüft …';
  const result=await kassiererApi('/api/import',{kassiererPasswort,beleg});
  $('importStatus').textContent='';
  if(!await bestaetigen('Abrechnung laden?','Die aktuellen Formulareingaben werden durch diese geprüfte offene Abrechnung ersetzt.','Ersetzen'))return;
  clearTimeout(saveTimer);
  const context={id:result.abrechnung.id,nachweisOffen:result.nachweisOffen};
  localStorage.setItem(importKey,JSON.stringify(context));localStorage.setItem(key,JSON.stringify(result.abrechnung));localStorage.removeItem(sendKey);
  storedSubmission=null;importKontext=context;previewId=context.id;
  laden();renderWaren();renderAusgaben();berechnen();lockForm(false);
  sendeKnopf('Komplette Abrechnung übermitteln');$('sendenButton').disabled=false;
  $('sendeStatus').textContent='Offene Vorlage geladen. Bitte nur noch die Kasse zählen und erneut übermitteln.';
  kassiererSchliessen();
  toast('Geprüfte Vorlage geladen. Nur die Kassenzählung kann ergänzt werden.','ok');
  $('kasseAbschnitt').scrollIntoView({behavior:'smooth'});$('kassenbestand').focus({preventScroll:true});
 }catch(error){$('importStatus').textContent=error.message;}
 finally{input.value='';}
}
function ladeKasseMitMigration(k,version){
 let value=k;
 if(!istNeuesFormat(version)&&k?.modus==='stueckelung'&&Array.isArray(k.stueckelung)&&k.stueckelung.length===15){
  const old=[50000,20000,10000,5000,2000,1000,500,200,100,50,20,10,5,2,1];
  const cent=k.stueckelung.reduce((s,n,i)=>s+(Number(n)||0)*old[i],0);
  value={...k,modus:'betrag',bestand:cent/100};
 }
 $('zaehlVerantwortung').value=istNeuesFormat(version)&&k?.modus==='ausstehend'?'kassierer':'hallendienst';
 return value;
}
function auswertungSperren(){
 kassiererPasswort='';auswertungEntsperrt=false;$('kassiererPasswort').value='';
 $('authStatus').textContent='Kassierer-Bereich gesperrt.';berechnen();$('auswertungDetails').open=false;
 sheetZustand();kassiererSchliessen();toast('Kassierer-Bereich gesperrt.');
}
