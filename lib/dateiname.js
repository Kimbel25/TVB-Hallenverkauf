export function dateiname(data) {
  const team=data.mannschaft.normalize('NFC').replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g,'_').replace(/[. ]+$/g,'').slice(0,100)||'Mannschaft';
  return data.datum+'_Hallenverkauf_'+team;
}
