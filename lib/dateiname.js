export function dateiname(data) {
  const team=data.mannschaft.normalize('NFC').replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g,'_').replace(/[. ]+$/g,'').slice(0,100)||'Mannschaft';
  let name=data.datum+'_Hallenverkauf_'+team;
  if(['5.0','6.0'].includes(data.version)){while(new TextEncoder().encode(name).length>230)name=[...name].slice(0,-1).join('');name=name.replace(/[. ]+$/g,'');}
  return name+(data.version==='6.0'&&data.abschlussstatus==='komplett'?'_komplett':'');
}

export function ordnername(data){return dateiname(data).replace(data.version==='6.0'&&data.abschlussstatus==='komplett'?/_komplett$/:/$^/,'');}
