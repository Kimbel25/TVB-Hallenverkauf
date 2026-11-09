// Kassierer-Freigabe bleibt nur im Arbeitsspeicher. Kein Passwort im Browser-Speicher.
let auswertungEntsperrt=false,kassiererPasswort='',formularVersion='6.0';
let importKontext=null;
const importKey='tvb_kassierer_import_v6';
try{const c=JSON.parse(localStorage.getItem(importKey)||'null');if(c&&typeof c.id==='string'&&typeof c.nachweisOffen==='string')importKontext=c;}catch{}
function schutzDaten(){return {kassiererPasswort,nachweisOffen:importKontext?.nachweisOffen};}
function wirdGezaehlt(){
 return $('zaehlVerantwortung').value==='hallendienst'||!!importKontext||
  !!(storedSubmission?.abrechnung.version==='6.0'&&storedSubmission.abrechnung.kasse?.modus!=='ausstehend');
}
function zustaendigkeitAnzeigen(){
 const zaehlen=wirdGezaehlt()||formularVersion!=='6.0';
 $('kassenZaehlbereich').hidden=!zaehlen;
 $('kimbleHinweis').hidden=zaehlen||$('zaehlVerantwortung').value!=='kassierer';
 $('importHinweis').hidden=!importKontext;
}
function zeigeKassiererAnmeldung(text='Bitte das Kassierer-Passwort eingeben.'){
 $('auswertungDetails').open=true;$('authStatus').textContent=text;$('kassiererPasswort').focus();
}
async function kassiererApi(path,payload){
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 let result;try{result=await response.json();}catch{throw Error('Die Serverantwort konnte nicht geprüft werden.');}
 if(!response.ok||!result.ok)throw Error(result.error||'Prüfung fehlgeschlagen.');return result;
}
async function auswertungFreigeben(){
 const button=$('auswertungFreigeben');button.disabled=true;
 try{
  const pass=$('kassiererPasswort').value;
  await kassiererApi('/api/kassierer',{kassiererPasswort:pass});
  kassiererPasswort=pass;auswertungEntsperrt=true;$('kassiererPasswort').value='';
  $('authStatus').textContent='Kassierer-Bereich freigegeben. Nach Neuladen ist das Passwort erneut nötig.';
  $('jsonDatei').hidden=false;berechnen();
 }catch(error){$('authStatus').textContent=error.message;}
 finally{button.disabled=false;}
}
function jsonLadenStarten(){
 if(sending||(storedSubmission&&storedSubmission.state!=='sent')){alert('Bitte zuerst den offenen Übermittlungsversuch abschließen.');return;}
 if(!auswertungEntsperrt){zeigeKassiererAnmeldung('Zum Laden einer JSON bitte zuerst das Kassierer-Passwort eingeben. Danach die JSON-Datei auswählen.');return;}
 $('jsonDatei').hidden=false;$('jsonDatei').click();
}
async function jsonDateiLaden(){
 const input=$('jsonDatei'),file=input.files?.[0];if(!file)return;
 try{
  if(!auswertungEntsperrt||!kassiererPasswort){zeigeKassiererAnmeldung();throw Error('Bitte zuerst den Kassierer-Bereich freigeben.');}
  if(sending||(storedSubmission&&storedSubmission.state!=='sent'))throw Error('Bitte zuerst den offenen Übermittlungsversuch abschließen.');
  if(file.size>50000)throw Error('Diese JSON-Datei ist zu groß.');
  let beleg;try{beleg=JSON.parse(await file.text());}catch{throw Error('Die ausgewählte Datei enthält keine gültige JSON-Abrechnung.');}
  const result=await kassiererApi('/api/import',{kassiererPasswort,beleg});
  if(!confirm('Die aktuellen Formulareingaben durch diese geprüfte offene Abrechnung ersetzen?'))return;
  clearTimeout(saveTimer);
  const context={id:result.abrechnung.id,nachweisOffen:result.nachweisOffen};
  localStorage.setItem(importKey,JSON.stringify(context));localStorage.setItem(key,JSON.stringify(result.abrechnung));localStorage.removeItem(sendKey);
  storedSubmission=null;importKontext=context;previewId=context.id;
  laden();renderWaren();renderAusgaben();berechnen();lockForm(false);
  $('sendenButton').disabled=false;$('sendenButton').textContent='Komplette Abrechnung übermitteln';
  $('sendeStatus').textContent='Offene Vorlage geladen. Bitte nur noch die Kasse zählen und erneut übermitteln.';
  $('importStatus').textContent='Geprüfte Vorlage geladen. Datum, Mannschaften, Waren und Ausgaben bleiben gesperrt.';
  $('kasseAbschnitt').scrollIntoView({behavior:'smooth'});$('kassenbestand').focus();
 }catch(error){$('importStatus').textContent=error.message;}
 finally{input.value='';}
}
function ladeKasseMitMigration(k,version){
 let value=k;
 if(version!=='6.0'&&k?.modus==='stueckelung'&&Array.isArray(k.stueckelung)&&k.stueckelung.length===15){
  const old=[50000,20000,10000,5000,2000,1000,500,200,100,50,20,10,5,2,1];
  const cent=k.stueckelung.reduce((s,n,i)=>s+(Number(n)||0)*old[i],0);
  value={...k,modus:'betrag',bestand:cent/100};
 }
 $('zaehlVerantwortung').value=version==='6.0'&&k?.modus==='ausstehend'?'kassierer':'hallendienst';
 return value;
}

function auswertungSperren(){
 kassiererPasswort='';auswertungEntsperrt=false;$('kassiererPasswort').value='';$('jsonDatei').hidden=true;
 $('authStatus').textContent='Kassierer-Bereich gesperrt.';berechnen();$('auswertungDetails').open=false;
}
