/* Atlas des ciels imaginaires — Carnet de campagne (PDF)
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ---------- carnet de campagne (PDF) ---------- */
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.append(s); }); }
const GREEKN={'α':'alpha','β':'beta','γ':'gamma','δ':'delta','ε':'epsilon','ζ':'zeta','η':'eta','θ':'theta','ι':'iota','κ':'kappa','λ':'lambda','μ':'mu','ν':'nu','ξ':'xi'};
const pdfT = s => String(s||'').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/œ/g,'oe').replace(/Œ/g,'OE').replace(/…/g,'...').replace(/[αβγδεζηθικλμνξ]/g,m=>GREEKN[m]).replace(/[\u2009\u202f\u2005]/g,' ').replace(/[^\x00-\xFF]/g,'');
function renderWorldImage(ratio=1){
  const cw=1800, ch=900, can=document.createElement('canvas'); can.width=cw*ratio; can.height=ch*ratio; const c=can.getContext('2d'); c.setTransform(ratio,0,0,ratio,0,0);
  c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; c.drawImage(world.peopleImg ? world.peopleImg.can : world.canvas, 0,0,cw,ch);
  c.strokeStyle='rgba(255,255,255,.14)'; c.lineWidth=1;
  for(let la=-60;la<=60;la+=30){ const y=(90-la)/180*ch; c.beginPath(); c.moveTo(0,y); c.lineTo(cw,y); c.stroke(); }
  for(let lo=-150;lo<180;lo+=30){ const x=(lo+180)/360*cw; c.beginPath(); c.moveTo(x,0); c.lineTo(x,ch); c.stroke(); }
  const boxes=[]; const free=(x,y,w,h)=>{ for(const b of boxes) if(x<b[0]+b[2]&&x+w>b[0]&&y<b[1]+b[3]&&y+h>b[1]) return false; boxes.push([x,y,w,h]); return true; };
  const pr={continent:0,ocean:1,people:2,capital:3,city:4,sea:5,mountains:6,region:7,island:8,lake:9};
  const list=[...world.places].filter(p=>p.kind in pr && (p.kind!=='region'||p.size>WN*.01) && (p.kind!=='island'||p.size>WN*.004) && (p.kind!=='lake'||p.size>200)).sort((a,b)=>pr[a.kind]-pr[b.kind]||b.size-a.size);
  c.textAlign='center'; c.textBaseline='middle'; c.lineJoin='round';
  for(const p of list){ let x=(p.lon+Math.PI)/TAU*cw, y=(Math.PI/2-p.lat)/Math.PI*ch, font, col;
    if(p.kind==='continent'){ font=`600 30px ${SERIF}`; col='#fbf5e4'; }
    else if(p.kind==='ocean'||p.kind==='sea'){ font=`italic 500 24px ${SERIF}`; col='#d6e7ff'; }
    else if(p.kind==='people'){ font=`italic 600 22px ${SERIF}`; col='#fff1c9'; }
    else if(p.kind==='capital'||p.kind==='city'){ const cap_=p.kind==='capital'; c.fillStyle=cap_?'#ffd98a':'#fff'; c.strokeStyle='#141a33'; c.lineWidth=1.5; c.beginPath(); c.arc(x,y,cap_?6:4,0,TAU); c.fill(); c.stroke(); y-=15; font=`${cap_?'600 ':''}17px Figtree, system-ui, sans-serif`; col='#ffffff'; }
    else { font=`italic 500 18px ${SERIF}`; col='#f3ecd9'; }
    c.font=font; const w=c.measureText(p.name).width+8; if(!free(x-w/2,y-12,w,24)) continue;
    c.strokeStyle='rgba(8,12,24,.7)'; c.lineWidth=4; c.strokeText(p.name,x,y); c.fillStyle=col; c.fillText(p.name,x,y); }
  c.textAlign='left'; c.font=`italic 500 40px ${SERIF}`; c.fillStyle='#fbf5e4'; c.strokeStyle='rgba(8,12,24,.7)'; c.lineWidth=5; c.strokeText(world.name,30,50); c.fillText(world.name,30,50);
  return can;
}
/* ================= carnet de campagne illustré ================= */
async function buildCarnet(opts={}){
  // opts.blobOnly : renvoie {blob, filename} sans enregistrer (utilisé par l'export complet)
  // opts.onStep(texte) : reçoit les étapes de préparation à la place des messages habituels
  const say = opts.onStep || toast;
  if(sky.earth){ say('Le carnet de campagne est fait pour les ciels imaginaires'); if(opts.blobOnly) return null; return; }
  say('Préparation du carnet…');
  try{ if(!window.jspdf){ try{ await loadScript('lib/jspdf.umd.min.js'); }catch(e1){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); } } }catch(e){ say('Le module PDF n’a pas pu être chargé'); if(opts.blobOnly) throw new Error('Le module PDF n’a pas pu être chargé'); return; }
  await (document.fonts ? document.fonts.ready : Promise.resolve());
  const tick=()=>new Promise(r=>setTimeout(r,15));
  const {jsPDF}=window.jspdf, doc=new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  const INK=[52,38,22], BROWN=[122,88,50], GOLD=[168,124,48], SOFT=[112,92,68];
  const PW=()=>doc.internal.pageSize.getWidth(), PH=()=>doc.internal.pageSize.getHeight();
  const skyTitle=currentName||sky.name, F=world.frame;
  // opts.questsOnly : livret des quêtes seul ; opts.player : version joueurs (sans les secrets du MJ)
  const QO=!!opts.questsOnly, MJ=!opts.player, withQ=QO || opts.quests!==false;
  const BOOK = QO ? (MJ?'Livret des quêtes (MJ)':'Livret des quêtes (joueurs)') : 'Carnet de campagne'+(MJ?'':' (joueurs)');
  const pagesInfo=[]; // {orient, bg}
  const toc=[];
  // --- ressources graphiques ---
  const parch=(w,h)=>{ const k=4, c=document.createElement('canvas'); c.width=w*k; c.height=h*k; const g=c.getContext('2d');
    g.fillStyle='#efe3c4'; g.fillRect(0,0,c.width,c.height);
    const r=mulberry32(7), id=g.getImageData(0,0,c.width,c.height), d=id.data;
    for(let i=0;i<d.length;i+=4){ const n=(r()-.5)*14; d[i]+=n; d[i+1]+=n; d[i+2]+=n*.8; } g.putImageData(id,0,0);
    for(let s=0;s<14;s++){ const x=r()*c.width, y=r()*c.height, rr=40+r()*160; const gr=g.createRadialGradient(x,y,0,x,y,rr); gr.addColorStop(0,'rgba(170,130,70,.07)'); gr.addColorStop(1,'rgba(170,130,70,0)'); g.fillStyle=gr; g.fillRect(x-rr,y-rr,rr*2,rr*2); }
    const v=g.createRadialGradient(c.width/2,c.height/2,Math.min(c.width,c.height)*.35,c.width/2,c.height/2,Math.max(c.width,c.height)*.75); v.addColorStop(0,'rgba(120,80,30,0)'); v.addColorStop(1,'rgba(120,80,30,.28)'); g.fillStyle=v; g.fillRect(0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.82); };
  const BG={p:parch(210,297), l:parch(297,210)};
  const shrink=(cv,maxW)=>{ if(cv.width<=maxW) return cv; const c=document.createElement('canvas'); c.width=maxW; c.height=Math.round(cv.height*maxW/cv.width); c.getContext('2d').drawImage(cv,0,0,c.width,c.height); return c; };
  const SKYMAP=renderMapImage();
  const TI=(text,pt,{color='#5a3a14', font='italic 600', maxW=170}={})=>{ const S=4, c=document.createElement('canvas'), g=c.getContext('2d'); const fs=pt*S; g.font=`${font} ${fs}px ${SERIF}`;
    const w=Math.ceil(g.measureText(text).width)+fs*.2, h=Math.ceil(fs*1.35); c.width=w; c.height=h; g.font=`${font} ${fs}px ${SERIF}`; g.fillStyle=color; g.textBaseline='middle'; g.fillText(text,fs*.1,h/2);
    let wmm=w/S*.3528, hmm=h/S*.3528; if(wmm>maxW){ hmm*=maxW/wmm; wmm=maxW; } return {data:c.toDataURL('image/png'), w:wmm, h:hmm}; };
  const putTI=(t,x,y,align='left')=>{ const xx= align==='center' ? x-t.w/2 : align==='right' ? x-t.w : x; doc.addImage(t.data,'PNG',xx,y,t.w,t.h,undefined,'FAST'); };
  const frame=()=>{ const w=PW(), h=PH(); doc.setDrawColor(...BROWN); doc.setLineWidth(.7); doc.rect(9,9,w-18,h-18); doc.setLineWidth(.25); doc.rect(11,11,w-22,h-22);
    doc.setFillColor(...GOLD); for(const [x,y] of [[9,9],[w-9,9],[9,h-9],[w-9,h-9]]){ doc.lines([[2.2,2.2],[-2.2,2.2],[-2.2,-2.2]],x,y-2.2,[1,1],'F',true); } };
  let first=true;
  const newPage=(o='p', opt={})=>{ if(!first) doc.addPage('a4', o==='p'?'portrait':'landscape'); first=false;
    pagesInfo.push({o, cover:!!opt.cover}); if(!opt.cover){ doc.addImage(BG[o],'JPEG',0,0,PW(),PH(),'bg'+o); frame(); } };
  const divider=(x,y,w)=>{ doc.setDrawColor(...BROWN); doc.setLineWidth(.3); doc.line(x,y,x+w/2-3,y); doc.line(x+w/2+3,y,x+w,y); doc.setFillColor(...GOLD); doc.lines([[2,2],[-2,2],[-2,-2]],x+w/2,y-2,[1,1],'F',true); };
  // --- flux de texte en colonnes ---
  const M=20; let y=0, col=0, cols=1, colW=0, top=0;
  const flow=(n,startY)=>{ cols=n; col=0; top=startY; y=startY; colW=(PW()-2*M-(n-1)*8)/n; };
  const cx=()=>M+col*(colW+8);
  const ensure=h=>{ if(y+h>PH()-M-6){ if(col<cols-1){ col++; y=top; } else { newPage('p'); flow(cols, M+6); } } };
  const colMax=()=>PH()-M-6-top;
  const measure=(t,size,style='normal',indent=0,lead=.43)=>{ doc.setFont('times',style); doc.setFontSize(size); return doc.splitTextToSize(pdfT(t), colW-indent).length*size*lead; };
  const text=(t,{size=10.2,style='normal',color=INK,after=2,indent=0,lead=.43,keep=true}={})=>{ doc.setFont('times',style); doc.setFontSize(size);
    const lines=doc.splitTextToSize(pdfT(t), colW-indent); const tot=lines.length*size*lead; if(keep && tot<colMax()*.6) ensure(tot); doc.setFont('times',style); doc.setFontSize(size); doc.setTextColor(...color); for(const l of lines){ ensure(size*lead); doc.text(l, cx()+indent, y+size*.33); y+=size*lead; } y+=after; };
  const rich=(bold,rest,{size=10.2,after=2}={})=>{ text(bold+' '+rest,{size,after}); };
  const heading=(t,pt=16,color='#6b4414',keepNext)=>{ const rgbC=hexToRgb(color); doc.setFont('times','bolditalic'); doc.setFontSize(pt); const lines=doc.splitTextToSize(pdfT(t),colW); const lh=pt*.42; ensure(lh*lines.length+2.5+(keepNext||14)); doc.setFont('times','bolditalic'); doc.setFontSize(pt); doc.setTextColor(...rgbC); for(const l of lines){ doc.text(l,cx(),y+pt*.34); y+=lh; } y+=1.6; };
  const sectionTitle=(t,sub)=>{ const im=TI(t,30,{maxW:PW()-2*M}); putTI(im,PW()/2,M+2,'center'); let yy=M+2+im.h+2; if(sub){ doc.setFont('times','italic'); doc.setFontSize(11); doc.setTextColor(...SOFT); doc.text(pdfT(sub),PW()/2,yy+3,{align:'center'}); yy+=6; } divider(M+30,yy+2,PW()-2*M-60); return yy+8; };
  const factsBox=(rows,x,yy,w)=>{ doc.setFont('times','normal'); doc.setFontSize(9.8); const lh=4.6; let hgt=4; const lines=rows.map(([k,v])=>{ const ls=doc.splitTextToSize(pdfT(v), w-42); hgt+=ls.length*lh+1; return [k,ls]; });
    doc.setFillColor(248,240,220); doc.setDrawColor(...BROWN); doc.setLineWidth(.3); doc.roundedRect(x,yy,w,hgt+2,2,2,'FD');
    let y2=yy+6; for(const [k,ls] of lines){ doc.setFont('times','bold'); doc.setTextColor(...BROWN); doc.text(pdfT(k),x+4,y2); doc.setFont('times','normal'); doc.setTextColor(...INK); ls.forEach((l,i)=>doc.text(l,x+40,y2+i*lh)); y2+=ls.length*lh+1; } return yy+hgt+6; };
  const dangerCol={paisible:[86,128,70], incertain:[176,138,52], dangereux:[196,104,40], mortel:[150,40,32]};
  const badge=(t,x,yy)=>{ const c=dangerCol[t]||SOFT; doc.setFont('times','bold'); doc.setFontSize(8); const w=doc.getTextWidth(pdfT(t))+4; doc.setFillColor(...c); doc.roundedRect(x-w,yy-3.2,w,4.6,1.2,1.2,'F'); doc.setTextColor(255,250,240); doc.text(pdfT(t),x-w+2,yy); return w; };
  const constImg=c=>{ const cv=document.createElement('canvas'); cv.width=300; cv.height=150; const g=cv.getContext('2d');
    g.fillStyle='#e9dcbc'; g.fillRect(0,0,300,150); g.fillStyle='#1c2442'; g.beginPath(); g.roundRect ? g.roundRect(0,0,300,150,16) : g.rect(0,0,300,150); g.fill();
    const ctr=c.eq, up=Math.abs(ctr[1])>.97?[1,0,0]:[0,1,0], e1=norm(cross(up,ctr)), e2=cross(ctr,e1);
    const pts=c.members.map(j=>{ const s=sky.stars[j], e=s.eq; return {j, u:dot(e,e1), v:dot(e,e2), m:s.mag0??s.mag}; });
    const us=pts.map(p=>p.u), vs=pts.map(p=>p.v), minU=Math.min(...us), maxU=Math.max(...us), minV=Math.min(...vs), maxV=Math.max(...vs);
    const sc=Math.min(250/Math.max(maxU-minU,1e-4), 110/Math.max(maxV-minV,1e-4)), ox=150-(minU+maxU)/2*sc, oy=75+(minV+maxV)/2*sc;
    const P=j=>{ const p=pts.find(q=>q.j===j); return [ox+p.u*sc, oy-p.v*sc]; };
    for(let k=0;k<60;k++){ g.fillStyle=`rgba(220,225,245,${.15+Math.random()*.25})`; g.fillRect(Math.random()*300,Math.random()*150,1.2,1.2); }
    g.strokeStyle='rgba(222,188,110,.85)'; g.lineWidth=2.2; g.beginPath(); for(const [a,b] of c.edges){ const A=P(a), B=P(b); g.moveTo(...A); g.lineTo(...B); } g.stroke();
    for(const p of pts){ const [x,yy]=P(p.j), rr=clamp(5.5-p.m*.9,1.6,6.5); g.fillStyle='#fffaf0'; g.beginPath(); g.arc(x,yy,rr,0,TAU); g.fill(); }
    return cv.toDataURL('image/jpeg',.85); };
  const emblem=p=>{ const c=document.createElement('canvas'); c.width=c.height=220; const g=c.getContext('2d');
    g.fillStyle=p.col; g.beginPath(); g.arc(110,110,100,0,TAU); g.fill(); g.lineWidth=8; g.strokeStyle='#a87c30'; g.stroke(); g.lineWidth=2; g.strokeStyle='#f3e3b8'; g.beginPath(); g.arc(110,110,86,0,TAU); g.stroke();
    g.fillStyle='#fffaf0'; g.font=`italic 600 120px ${SERIF}`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(cap(p.base||p.name.replace(/^les /,''))[0],110,118); return c.toDataURL('image/png'); };
  // ===== couverture =====
  say('Couverture…'); await tick();
  { const sk=SKYMAP, cw=1240, ch=1754, c=document.createElement('canvas'); c.width=cw; c.height=ch; const g=c.getContext('2d');
    const sh=sk.height*.82, sw=sh*cw/ch; g.drawImage(sk,(sk.width-sw)/2,sk.height*.12,sw,sh,0,0,cw,ch);
    const gr=g.createLinearGradient(0,0,0,ch); gr.addColorStop(0,'rgba(6,10,28,.75)'); gr.addColorStop(.35,'rgba(6,10,28,.35)'); gr.addColorStop(.62,'rgba(6,10,28,.55)'); gr.addColorStop(1,'rgba(6,10,28,.92)'); g.fillStyle=gr; g.fillRect(0,0,cw,ch);
    g.strokeStyle='rgba(216,181,106,.8)'; g.lineWidth=3; g.strokeRect(40,40,cw-80,ch-80); g.lineWidth=1.2; g.strokeRect(52,52,cw-104,ch-104);
    g.textAlign='center'; g.fillStyle='#d8b56a'; g.font=`500 34px Figtree, sans-serif`; g.fillText((QO?(MJ?'LIVRET DES QUÊTES · MJ':'LIVRET DES QUÊTES · JOUEURS'):(MJ?'CARNET DE CAMPAGNE':'CARNET DE CAMPAGNE · JOUEURS')).split('').join(String.fromCharCode(8202)),cw/2,ch*.62);
    g.fillStyle='#f4ead0'; g.font=`italic 600 118px ${SERIF}`; g.fillText(world.name,cw/2,ch*.62+140);
    g.font=`italic 500 46px ${SERIF}`; g.fillStyle='#e4d4ac'; g.fillText(skyTitle,cw/2,ch*.62+215);
    g.strokeStyle='#d8b56a'; g.lineWidth=2; g.beginPath(); g.moveTo(cw/2-260,ch*.62+262); g.lineTo(cw/2-16,ch*.62+262); g.moveTo(cw/2+16,ch*.62+262); g.lineTo(cw/2+260,ch*.62+262); g.stroke();
    g.fillStyle='#d8b56a'; g.beginPath(); g.moveTo(cw/2,ch*.62+250); g.lineTo(cw/2+12,ch*.62+262); g.lineTo(cw/2,ch*.62+274); g.lineTo(cw/2-12,ch*.62+262); g.fill();
    g.font=`500 26px Figtree, sans-serif`; g.fillStyle='#cdbf9e'; g.fillText(`${world.peoples.list.length} peuples, ${sky.consts.length} constellations, ${(world.pois||[]).length} lieux à explorer`,cw/2,ch*.62+320);
    g.fillText(`Graine « ${P.seed} »`,cw/2,ch-110);
    newPage('p',{cover:true}); doc.addImage(c.toDataURL('image/jpeg',.84),'JPEG',0,0,210,297); }
  if(!QO){
  // ===== le ciel =====
  say('Le ciel…'); await tick();
  newPage('l'); toc.push(['Le ciel', doc.getNumberOfPages()]);
  { const im=TI('Le ciel de '+world.name,24,{maxW:250}); putTI(im,PW()/2,13,'center');
    const sk=SKYMAP, ar=sk.height/sk.width, w=250, h=w*ar; doc.addImage(sk.toDataURL('image/jpeg',.9),'JPEG',(PW()-w)/2,26,w,h);
    doc.setFont('times','italic'); doc.setFontSize(9.5); doc.setTextColor(...SOFT); doc.text(pdfT('Le ciel entier déplié, vu depuis '+(D.gplace||placeName(cellOf(obsLon()*deg,obsLat()*deg)))+'. Les tracés dorés relient les étoiles des constellations.'),PW()/2,PH()-16,{align:'center'}); }
  newPage('p'); { const y0=sectionTitle('Les astres', `Soleil${F.suns.length>1?'s':''}, lunes et étoiles de ${world.name}`); flow(1,y0);
    let yy=factsBox([['Soleil', F.suns.map(s=>s.name).join(' et ')], ['Lunes', F.moons.length?F.moons.map(m=>`${m.name} (${fr(m.period,1)} jours)`).join(', '):'aucune'], ['Année', `${F.yearLen} jours`], ['Axe', `incliné de ${Math.round(F.tilt/deg)}°`], ['Constellations', String(sky.consts.length)]], M, y, PW()-2*M); y=yy;
    for(const m of F.moons){ heading(m.name,14); text(m.desc); }
    heading('Les étoiles les plus brillantes',14);
    flow(2,y);
    for(const s of sky.stars.filter(s=>s.kind==='star'&&!s.fobj&&s.name).sort((a,b)=>(a.mag0??a.mag)-(b.mag0??b.mag)).slice(0,12)){ heading(s.name,12.5,'#5a3a14'); text(starText(s,false)||'',{size:9.6}); } }
  // ===== système stellaire =====
  say('Le système stellaire…'); await tick();
  { const SYS=homeSystem(), sn=SYS.star.name;
    // vue d'ensemble inclinée, sur une page paysage
    newPage('l'); toc.push(['Le système de '+sn, doc.getNumberOfPages()]);
    { const im=TI('Le système de '+sn,24,{maxW:250}); putTI(im,PW()/2,13,'center');
      const cv=renderSystemView(SYS,{tilt:62*deg, w:1200, h:640, scale:2.4}), ar=cv.height/cv.width, w=262, h=w*ar; doc.addImage(cv.toDataURL('image/jpeg',.9),'JPEG',(PW()-w)/2,27,w,h);
      doc.setFont('times','italic'); doc.setFontSize(9.5); doc.setTextColor(...SOFT); doc.text(pdfT(`${sn} et ses ${SYS.planets.length} planète${SYS.planets.length>1?'s':''}. Les orbites vertes passent dans la zone habitable, les pointillés montrent les comètes et l’étoile compagne.`),PW()/2,PH()-16,{align:'center'}); }
    // fiche de l'étoile et vue de dessus
    newPage('p'); { const y0=sectionTitle('Le système de '+sn, `${cap(SYS.star.phys.kind)} et ses mondes`); flow(1,y0);
      text(descOf(SYS.star),{size:10.5});
      y=factsBox(systemSummaryRows(SYS), M, y+1, PW()-2*M);
      const s=Math.min(PW()-2*M-20, PH()-M-12-y); if(s>60){ const tv=renderSystemView(SYS,{tilt:0, w:900, h:900, scale:2.2}); doc.addImage(tv.toDataURL('image/jpeg',.9),'JPEG',(PW()-s)/2,y,s,s); y+=s+3;
        doc.setFont('times','italic'); doc.setFontSize(9); doc.setTextColor(...SOFT); doc.text(pdfT('Vue de dessus : les orbites et les ceintures à leur place.'),PW()/2,y+2,{align:'center'}); } }
    // les planètes, une par une, avec leurs lunes
    say('Les planètes…'); await tick();
    newPage('p'); { const y0=sectionTitle('Les planètes', `Les mondes qui tournent autour de ${sn}`); flow(2,y0);
      for(const p of SYS.planets){ await tick();
        const ih=colW*560/900; ensure(Math.min(colMax(), ih+2+measure(p.name,14,'bolditalic')+2+measure(descOf(p),9.4)+4));
        const img=renderBodyView(p,{w:900, h:560, scale:2}); doc.addImage(img.toDataURL('image/jpeg',.86),'JPEG',cx(),y,colW,ih); y+=ih+2;
        heading(p.name+(p.isHome?' (votre monde)':''),14,'#5a3a14',1);
        text(kindLabel(p)+(p.alias?' · '+p.alias:''),{size:9.5,style:'italic',color:SOFT,after:1});
        text(descOf(p),{size:9.4,after:1});
        for(const [k,v] of factsOf(p)) text(`${k} : ${v}`,{size:8.8,color:SOFT,after:.2});
        y+=1.5;
        if(p.moons && p.moons.length){ text(p.moons.length>1?'Ses lunes':'Sa lune',{size:10,style:'bolditalic',color:BROWN,after:.6});
          for(const m of p.moons) text(`${m.name}. ${descOf(m)}`,{size:8.8,after:1}); }
        y+=4; }
      const others=[...SYS.belts, ...SYS.dwarfs, ...SYS.comets, ...(SYS.companion?[SYS.companion]:[])];
      if(others.length){ heading('Ceintures, comètes et autres corps',14);
        for(const o of others){ heading(o.name,11.5,'#5a3a14',1); text(kindLabel(o),{size:9.2,style:'italic',color:SOFT,after:.6}); text(descOf(o),{size:9.2,after:.6}); for(const [k,v] of factsOf(o)) text(`${k} : ${v}`,{size:8.6,color:SOFT,after:.2}); y+=2.5; } } }
  }
  // ===== le monde =====
  say('Le monde…'); await tick();
  newPage('l'); toc.push(['Le monde', doc.getNumberOfPages()]);
  { const im=TI(world.name,24,{maxW:250}); putTI(im,PW()/2,13,'center'); const wi=renderWorldImage(2.2), ar=wi.height/wi.width, w=262, h=w*ar; doc.addImage(wi.toDataURL('image/jpeg',.9),'JPEG',(PW()-w)/2,27,w,h); }
  newPage('p'); { const y0=sectionTitle('Le monde', 'Géographie et peuples'); flow(1,y0); text(world.desc,{size:11});
    const conts=world.places.filter(p=>p.kind==='continent'), oceans=world.places.filter(p=>p.kind==='ocean');
    y=factsBox([['Continents', conts.map(c=>c.name).join(', ')||'aucun'], ['Océans', oceans.map(o=>o.name).join(', ')], ['Peuples', world.peoples.list.map(p=>cap(p.name)).join(', ')], ['Lieux', `${(world.pois||[]).filter(o=>o.kind==='poi-major').length} légendaires et ${(world.pois||[]).filter(o=>o.kind==='poi').length} remarquables`]], M, y+2, PW()-2*M);
    heading('Les grandes régions',14); flow(2,y);
    for(const r2 of world.places.filter(p=>p.kind==='region'||p.kind==='mountains').sort((a,b)=>b.size-a.size).slice(0,16)){ text(r2.name+' : '+(r2.kind==='mountains'?'une chaîne de montagnes.':BIOMES[r2.biome].txt),{size:9.6}); } }
  // ===== peuples =====
  for(const [k,p] of world.peoples.list.entries()){
    say('Peuple '+(k+1)+' sur '+world.peoples.list.length+'…'); await tick();
    const cv=civOf(k);
    newPage('p'); toc.push([cap(p.name), doc.getNumberOfPages(), true]);
    doc.addImage(emblem(p),'PNG',PW()/2-11,M-2,22,22,undefined,'FAST');
    const tim=TI(cap(p.name),28,{maxW:160}); putTI(tim,PW()/2,M+21,'center');
    doc.setFont('times','italic'); doc.setFontSize(11); doc.setTextColor(...SOFT); doc.text(pdfT(`${cap(cv.reg.n)}, capitale ${p.capital?p.capital.name:'inconnue'}`),PW()/2,M+21+tim.h+4,{align:'center'});
    divider(M+30,M+21+tim.h+9,PW()-2*M-60);
    y=factsBox([['Population',cv.pop],['Régime',cv.reg.short],['Dirigeant',cap(cv.ruler)],['Époque',cap(ERAS[cv.eraI][0])],['Langue',cv.lang],['Voisins',cv.rel.length?cv.rel.map(r2=>`${r2.o.name} (${r2.kind})`).join(', '):'aucun, isolés par la mer'],['Ère',`an ${cv.era0} depuis la fondation de ${p.capital?p.capital.name:'leur capitale'}`]], M, M+21+tim.h+14, PW()-2*M);
    flow(2,y);
    heading('Histoire',15); for(const [yr,t] of cv.hist){ text(`An ${yr}. ${t}`,{size:9.8}); }
    heading('Époque',15); text(ERAS[cv.eraI][1],{size:9.8});
    heading('Caractéristiques',15); for(const t of cv.traits) text(t,{size:9.8});
    heading('Coutumes',15); for(const t of cv.cust) text(t,{size:9.8});
    heading('Croyances et ciel',15); text(cv.belief,{size:9.8});
    const save=calPeople; calPeople=k; calCache=null; const cal=computeCalendar(); calPeople=save; calCache=null;
    if(cal) text(`Leurs mois : ${cal.months.map(m=>getCN(p,m.ci).name).join(', ')}.`,{size:9.8,style:'italic'});
    heading('Cités',15); for(const ct of p.cities) text(`${ct.name}. ${ct.desc.replace(ct.name+' est ','Une ').replace(/^Une la/,'La')}`,{size:9.6});
    const Mc=makeCountryMap(k); await tick();
    newPage('l'); { const im=renderCountryImage(Mc,1.3,2.4), ar=im.height/im.width; const w=Math.min(270,176/ar), h=w*ar; doc.addImage(im.toDataURL('image/jpeg',.84),'JPEG',(PW()-w)/2,(PH()-h)/2,w,h); }
    newPage('p'); { const y0=sectionTitle('Guide '+p.name.replace(/^les /,'des '), `${Mc.villages.length} villages et ${Mc.minors.length+Mc.wpois.length} lieux à visiter`); flow(2,y0);
      if(Mc.wpois.length){ heading('Lieux remarquables',14); for(const o of Mc.wpois){ ensure(Math.min(colMax(), measure(o.name,11.5,'bolditalic')+2+measure(o.desc,9.4)+1+measure('Rumeur : '+o.hook,9.4,'italic')+2)); heading(o.name,11.5,'#5a3a14',1); text(o.desc,{size:9.4,after:.6}); text('Rumeur : '+o.hook,{size:9.4,style:'italic',color:SOFT}); } }
      heading('Villages',14); for(const v of Mc.villages){ text(`${v.name}. ${v.desc}`,{size:9.3,after:1.4}); }
      heading('Lieux',14); for(const o of Mc.minors){ ensure(Math.min(colMax(), measure(o.name,11.5,'bolditalic')+2+measure(`${o.label}. ${o.desc}`,9.3)+1+measure('Rumeur : '+o.hook,9.3,'italic')+2)); heading(o.name,11.5,'#5a3a14',1); text(`${o.label}. ${o.desc}`,{size:9.3,after:.6}); text('Rumeur : '+o.hook,{size:9.3,style:'italic',color:SOFT}); }
      if(p.capital){ const pl=makeCityPlan(p.capital,k); newPage('p'); const ti=TI('Plan de '+p.capital.name,22); putTI(ti,105,M,'center'); const cim=renderCityExport(pl,1400,2.4); doc.addImage(cim.toDataURL('image/jpeg',.88),'JPEG',25,M+ti.h+3,160,160); flow(2,M+ti.h+168);
        heading('Lieux de la ville',13); for(const o of pl.L.filter(o=>o.role!=='gate')) text(`${o.name}. ${o.desc} Rumeur : ${o.hook}`,{size:9}); }
      if(Mc.rivers.some(r2=>r2.name)){ heading('Fleuves',14); for(const rv of Mc.rivers.filter(r2=>r2.name)) text(`${rv.name}, long d’environ ${fr(Math.round(rv.len*4*Mc.kmPx/10)*10,0)} km.`,{size:9.3}); } }
  }
  // ===== calendrier =====
  say('Calendrier…'); await tick();
  newPage('p'); toc.push(['Le calendrier', doc.getNumberOfPages()]);
  { const save=calPeople; calPeople=-1; calCache=null; const cal=computeCalendar();
    const y0=sectionTitle('Le calendrier', `Une année de ${cal.Y} jours en ${cal.months.length} mois`); flow(1,y0);
    text(`Chaque mois porte le nom de la constellation que traverse ${F.suns[0].name} pendant cette période. L’année commence avec le mois de l’équinoxe de printemps. Chaque peuple donne à ces mois les noms de ses propres constellations.`,{size:10.5});
    const X=[M+2, M+60, M+88, M+120], rowH=7, tTop=y; doc.setFillColor(122,88,50); doc.rect(M,y,PW()-2*M,rowH,'F'); doc.setFont('times','bold'); doc.setFontSize(10); doc.setTextColor(250,242,222);
    ['Mois','Jours','Début','Saison'].forEach((h,i)=>doc.text(h,X[i],y+4.8)); y+=rowH;
    const saveD=view.gday;
    cal.months.forEach((m,i)=>{ if(i%2){ doc.setFillColor(240,228,200); doc.rect(M,y,PW()-2*M,rowH,'F'); } view.gday=m.s; doc.setFont('times','italic'); doc.setFontSize(11); doc.setTextColor(...INK);
      doc.text(pdfT(monthName(m)),X[0],y+4.9); doc.setFont('times','normal'); doc.setFontSize(10); doc.text(String(m.len),X[1],y+4.9); doc.text(pdfT('jour '+(((m.s-cal.y0)%cal.Y+cal.Y)%cal.Y+1)),X[2],y+4.9); doc.text(pdfT(seasonNow()),X[3],y+4.9); y+=rowH; });
    doc.setDrawColor(...BROWN); doc.setLineWidth(.3); doc.rect(M,tTop,PW()-2*M,y-tTop); y+=6;
    heading('Fêtes et événements',16); flow(2,y);
    for(const f of cal.fest){ view.gday=f.day; heading(f.name,11.5,'#5a3a14'); text(`${fmtGenDate(true)}. ${f.text}`,{size:9.6}); }
    view.gday=saveD; calPeople=save; calCache=null; }
  // ===== chronologie =====
  say('Chronologie…'); await tick();
  newPage('p'); toc.push(['La chronologie', doc.getNumberOfPages()]);
  { const G=geoData(), T=civTimeline(); const y0=sectionTitle('La chronologie', 'De la naissance de la planète à nos jours'); flow(1,y0);
    heading('L’histoire de la planète',15); for(const e of G.ev) text(`${cap(maLabel(e.ma))} : ${e.title}. ${e.text}`,{size:9.6});
    heading('L’histoire des peuples',15); text(`Les années sont comptées dans l’ère commune ; nous sommes en l’an ${T.CY}.`,{size:9.6,style:'italic',color:SOFT}); flow(2,y);
    for(const e of [...T.glob,...T.ev].sort((a,b)=>a.year-b.year)){ if(e.pair!=null && e.lane>e.pair) continue; text(`An ${e.year}. ${e.title}${e.people?' ('+e.people+')':''} : ${e.text}`,{size:9.2}); } }
  // ===== lieux légendaires =====
  say('Lieux légendaires…'); await tick();
  newPage('p'); toc.push(['Lieux légendaires', doc.getNumberOfPages()]);
  { const y0=sectionTitle('Lieux légendaires', 'Ce que murmurent les voyageurs'); flow(1,y0);
    for(const o of (world.pois||[]).filter(o=>o.kind==='poi-major')){
      doc.setFont('times','normal'); doc.setFontSize(10); const w=PW()-2*M; const l1=doc.splitTextToSize(pdfT(o.desc),w-10), l2=doc.splitTextToSize(pdfT('Rumeur : '+o.hook),w-10); const hgt=16+(l1.length+l2.length)*4.5;
      ensure(hgt+4); doc.setFillColor(250,243,226); doc.setDrawColor(...GOLD); doc.setLineWidth(.5); doc.roundedRect(M,y,w,hgt,2.5,2.5,'FD');
      doc.setFont('times','bolditalic'); doc.setFontSize(14); doc.setTextColor(90,58,20); doc.text(pdfT(o.name),M+5,y+7.5); badge(o.danger,M+w-4,y+7);
      const pk=o.people>=0?world.peoples.list[o.people]:null; doc.setFont('times','italic'); doc.setFontSize(9); doc.setTextColor(...SOFT); doc.text(pdfT(pk?'Sur les terres '+pk.name.replace(/^les /,'des '):'Terres sauvages'),M+5,y+13.5);
      let yy=y+18.5; doc.setFont('times','normal'); doc.setFontSize(10); doc.setTextColor(...INK); l1.forEach(l=>{ doc.text(l,M+5,yy); yy+=4.5; }); doc.setFont('times','italic'); doc.setTextColor(...BROWN); l2.forEach(l=>{ doc.text(l,M+5,yy); yy+=4.5; }); y+=hgt+5; }
    heading('Lieux remarquables',16); flow(2,y);
    for(const o of (world.pois||[]).filter(o=>o.kind==='poi')){ ensure(14); doc.setFont('times','bolditalic'); doc.setFontSize(11); doc.setTextColor(90,58,20); const nl=doc.splitTextToSize(pdfT(o.name),colW-24); nl.forEach((l,i)=>doc.text(l,cx(),y+3.6+i*4.6)); badge(o.danger,cx()+colW,y+3.4); y+=nl.length*4.6+1; text(o.desc,{size:9.2,after:.5}); text('Rumeur : '+o.hook,{size:9.2,style:'italic',color:SOFT,after:2.4}); } }
  }
  // ===== quêtes =====
  if(withQ && world.peoples && world.peoples.list.length){
    const K={doc, newPage, sectionTitle, flow, text, heading, factsBox, ensure, colMax, measure, cx, toc, say, tick, TI, putTI, PW, PH, M, INK, BROWN, GOLD, SOFT,
      get y(){ return y; }, set y(v){ y=v; }, get colW(){ return colW; }};
    try{ await carnetQuestSection(K, MJ); }catch(e){ console.error('Quêtes :', e); }
  }
  if(!QO){
  // ===== constellations =====
  say('Constellations…'); await tick();
  newPage('p'); toc.push(['Les constellations', doc.getNumberOfPages()]);
  { const y0=sectionTitle('Les constellations', 'Figures, légendes et noms des peuples'); flow(2,y0);
    sky.consts.forEach((c,ci)=>{ const on0=otherNamesText(ci);
      const tot=colW*.5+2 + measure(c.name,14,'bolditalic')+1.6 + measure(cap(c.fig||''),9.5,'italic')+1 + measure(constText(c),9.4)+2 + (on0?measure(on0,8.8,'italic')+2:0) + 2;
      ensure(Math.min(tot, colMax())); const img=constImg(c); doc.addImage(img,'JPEG',cx(),y,colW,colW*.5); y+=colW*.5+2;
      heading(c.name,14,'#5a3a14',1); doc.setFont('times','italic'); doc.setFontSize(9.5); doc.setTextColor(...SOFT); text(cap(c.fig||''),{size:9.5,style:'italic',color:SOFT,after:1});
      text(constText(c),{size:9.4}); const on=otherNamesText(ci); if(on) text(on,{size:8.8,style:'italic',color:SOFT}); y+=2; }); }
  }
  // ===== sommaire, numéros de page =====
  doc.insertPage(2); const tocPage=2;
  doc.setPage(tocPage); doc.addImage(BG.p,'JPEG',0,0,210,297,'bgp'); frame();
  { const im=TI('Sommaire',30); putTI(im,105,M+4,'center'); divider(M+30,M+4+im.h+4,210-2*M-60); let yy=M+im.h+20;
    for(const [t,pg,sub] of toc){ const n=pg+1; doc.setFont('times',sub?'italic':'bold'); doc.setFontSize(sub?11:13); doc.setTextColor(...(sub?SOFT:INK)); const x=sub?M+14:M+4; doc.text(pdfT(t),x,yy);
      const tw=doc.getTextWidth(pdfT(t)); doc.setFont('times','normal'); doc.text(String(n),210-M-4,yy,{align:'right'}); doc.setTextColor(...BROWN); let dx=x+tw+2; const end=210-M-10; doc.setFontSize(9); while(dx<end){ doc.text('.',dx,yy); dx+=1.8; } yy+=sub?7:9; } }
  const N=doc.getNumberOfPages();
  for(let i=2;i<=N;i++){ doc.setPage(i); const w=PW(), h=PH(); doc.setFont('times','italic'); doc.setFontSize(8.5); doc.setTextColor(...BROWN); doc.text(pdfT((QO?'Quêtes de ':'Carnet de campagne de ')+world.name+(MJ?'':' · version joueurs')),16,h-12.5); doc.text(String(i),w-16,h-12.5,{align:'right'}); }
  const blob=doc.output('blob'), filename=((skyTitle||'ciel').replace(/[\\/:*?"<>|]/g,'')+' - '+BOOK.toLowerCase()+'.pdf');
  if(opts.blobOnly) return {blob, filename};
  let dl=null; try{ if(window.claude && typeof window.claude.use==='function') dl=await window.claude.use('downloads'); }catch(e){}
  if(dl){ try{ await dl.save({filename, data:blob}); toast('Carnet enregistré'); }catch(e){ if(!e || e.code!=='declined') toast('Le carnet n’a pas pu être enregistré'); } }
  else localSave(blob, filename);
}

$('exPdf').onclick=()=>buildCarnet({player:$('xpPlayer').checked});
