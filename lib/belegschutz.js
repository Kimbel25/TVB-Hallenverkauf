// Kein Passwort oder Schlüssel in Exportdateien. Der HMAC-Schlüssel bleibt bei Cloudflare.
const enc=new TextEncoder();
export function kanonisch(value){
 if(Array.isArray(value))return '['+value.map(kanonisch).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+kanonisch(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function offeneBasis(data){
 const {kassenabrechnung,pruefung,...rest}=data;
 return {...rest,abschlussstatus:'offen',kasse:{modus:'ausstehend',sonstigeEinnahmen:data.kasse.sonstigeEinnahmen,einnahmenText:data.kasse.einnahmenText}};
}
export async function signatur(data,env){
 if(!env.DROPBOX_APP_SECRET)throw Error('signing configuration');
 const key=await crypto.subtle.importKey('raw',enc.encode('TVB-Beleg-v6:'+env.DROPBOX_APP_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(kanonisch(data))))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function signaturGueltig(data,token,env){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return false;
 const expected=await signatur(data,env);let diff=0;for(let i=0;i<64;i++)diff|=expected.charCodeAt(i)^token.charCodeAt(i);return diff===0;
}
