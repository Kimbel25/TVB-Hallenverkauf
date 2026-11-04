import {mkdir,copyFile,rm} from 'node:fs/promises';
// Ausschließlich dieser erzeugte Ordner wird als Website veröffentlicht.
await rm('public',{recursive:true,force:true});
await mkdir('public/assets/fonts',{recursive:true});
await copyFile('index.html','public/index.html');
await copyFile('assets/tvb-wappen.svg','public/assets/tvb-wappen.svg');
for(const name of ['NotoSans.deflate','OFL.txt']) {
  await copyFile('assets/fonts/'+name,'public/assets/fonts/'+name);
}
await copyFile('_headers','public/_headers');
await copyFile('_routes.json','public/_routes.json');
