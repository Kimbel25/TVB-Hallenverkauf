import {mkdir,copyFile,rm} from 'node:fs/promises';
// Ausschließlich dieser erzeugte Ordner wird als Website veröffentlicht.
await rm('public',{recursive:true,force:true});
await mkdir('public/assets/fonts',{recursive:true});
await copyFile('index.html','public/index.html');
for(const name of ['apple-touch-icon.png','apple-touch-icon-precomposed.png','manifest.webmanifest']) await copyFile(name,'public/'+name);
for(const name of ['app-icon-192-v44.png','app-icon-512-v44.png']) await copyFile('assets/'+name,'public/assets/'+name);
for(const name of ['icon-32.png','icon-180.png','icon-100x180.png']) await copyFile('assets/'+name,'public/assets/'+name);
await copyFile('assets/tvb-wappen.svg','public/assets/tvb-wappen.svg');
for(const name of ['NotoSans.deflate','OFL.txt']) {
  await copyFile('assets/fonts/'+name,'public/assets/fonts/'+name);
}
await copyFile('_headers','public/_headers');
await copyFile('_routes.json','public/_routes.json');
