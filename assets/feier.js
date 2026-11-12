// Kleine Erfolgsanimation ohne externe Bibliothek.
// feiern(canvas,'konfetti') für offene Abrechnungen, feiern(canvas,'feuerwerk') für komplette.
// Bei „Bewegung reduzieren“ wird nichts animiert.
(()=>{
const FARBEN=['#c41222','#e0283a','#ffffff','#f2c14e','#d4a017','#ff6b6b'];
let laufend=0;
function feiern(canvas,art='konfetti'){
 if(!canvas||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const lauf=++laufend;
 const dpr=Math.min(2,window.devicePixelRatio||1);
 let w=0,h=0;
 const groesse=()=>{w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);};
 groesse();
 const teile=[],raketen=[];
 const zufall=(a,b)=>a+Math.random()*(b-a);
 const farbe=()=>FARBEN[Math.floor(Math.random()*FARBEN.length)];
 function konfettiSchuss(x,y,winkel,anzahl){
  for(let i=0;i<anzahl;i++){
   const a=winkel+zufall(-0.5,0.5),v=zufall(9,17);
   teile.push({typ:'k',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:0.32,luft:0.985,dreh:zufall(0,6.28),vdreh:zufall(-0.3,0.3),
    b:zufall(6,10),hoehe:zufall(9,15),farbe:farbe(),leben:zufall(150,220),alter:0,kipp:zufall(0,6.28)});
  }
 }
 function explosion(x,y,grundfarbe){
  const n=Math.round(zufall(55,80));
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2+zufall(-0.05,0.05),v=zufall(2.2,5.2);
   teile.push({typ:'f',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:0.045,luft:0.975,farbe:Math.random()<0.75?grundfarbe:'#ffffff',
    leben:zufall(55,85),alter:0,r:zufall(1.6,2.6),spur:[]});
  }
 }
 function rakete(){
  const x=zufall(w*0.18,w*0.82);
  raketen.push({x,y:h+10,vx:zufall(-0.8,0.8),vy:-zufall(h*0.017+6,h*0.019+7.5),ziel:zufall(h*0.15,h*0.42),farbe:farbe()==='#ffffff'?'#f2c14e':farbe()});
 }
 const start=performance.now();
 if(art==='feuerwerk'){
  const zeiten=[0,350,700,1050,1400,1800,2200];
  zeiten.forEach(t=>setTimeout(()=>{if(lauf===laufend)rakete();},t));
  setTimeout(()=>{if(lauf===laufend){konfettiSchuss(-10,h*0.75,-1.0,45);konfettiSchuss(w+10,h*0.75,-2.14,45);}},2500);
 }else{
  konfettiSchuss(-10,h*0.7,-1.05,70);
  konfettiSchuss(w+10,h*0.7,-2.09,70);
  setTimeout(()=>{if(lauf===laufend)konfettiSchuss(w/2,h*0.95,-1.5708,50);},280);
 }
 const dauer=art==='feuerwerk'?5200:3800;
 function schritt(jetzt){
  if(lauf!==laufend)return;
  if(canvas.clientWidth!==w||canvas.clientHeight!==h)groesse();
  ctx.clearRect(0,0,w,h);
  for(let i=raketen.length-1;i>=0;i--){
   const r=raketen[i];r.x+=r.vx;r.y+=r.vy;r.vy*=0.985;
   ctx.fillStyle=r.farbe;ctx.globalAlpha=1;ctx.beginPath();ctx.arc(r.x,r.y,2.4,0,6.28);ctx.fill();
   ctx.globalAlpha=0.35;ctx.beginPath();ctx.arc(r.x-r.vx*2,r.y-r.vy*2,1.6,0,6.28);ctx.fill();
   if(r.y<=r.ziel||r.vy>-1.5){explosion(r.x,r.y,r.farbe);raketen.splice(i,1);}
  }
  for(let i=teile.length-1;i>=0;i--){
   const p=teile[i];p.alter++;
   p.vx*=p.luft;p.vy=p.vy*p.luft+p.g;p.x+=p.vx;p.y+=p.vy;
   const rest=1-p.alter/p.leben;
   if(rest<=0||p.y>h+40){teile.splice(i,1);continue;}
   if(p.typ==='k'){
    p.dreh+=p.vdreh;p.kipp+=0.12;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.dreh);ctx.scale(1,Math.cos(p.kipp));
    ctx.globalAlpha=Math.min(1,rest*3);ctx.fillStyle=p.farbe;
    if(p.farbe==='#ffffff'){ctx.strokeStyle='rgba(0,0,0,.12)';ctx.lineWidth=0.5;ctx.strokeRect(-p.b/2,-p.hoehe/2,p.b,p.hoehe);}
    ctx.fillRect(-p.b/2,-p.hoehe/2,p.b,p.hoehe);ctx.restore();
   }else{
    p.spur.push(p.x,p.y);if(p.spur.length>10)p.spur.splice(0,2);
    ctx.globalAlpha=rest*0.5;ctx.strokeStyle=p.farbe;ctx.lineWidth=p.r;ctx.lineCap='round';ctx.beginPath();
    ctx.moveTo(p.spur[0],p.spur[1]);for(let j=2;j<p.spur.length;j+=2)ctx.lineTo(p.spur[j],p.spur[j+1]);ctx.stroke();
    ctx.globalAlpha=rest;ctx.fillStyle=p.farbe;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.28);ctx.fill();
   }
  }
  ctx.globalAlpha=1;
  if(jetzt-start<dauer||teile.length||raketen.length)requestAnimationFrame(schritt);
  else ctx.clearRect(0,0,w,h);
 }
 requestAnimationFrame(schritt);
 try{navigator.vibrate?.(art==='feuerwerk'?[30,60,30]:25);}catch{}
}
function feierStoppen(canvas){laufend++;const ctx=canvas?.getContext('2d');if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);}
globalThis.TVBFeier={feiern,feierStoppen};
})();
