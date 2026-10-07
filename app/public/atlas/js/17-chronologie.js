/* Atlas des ciels imaginaires — Chronologie du monde
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ================= chronologie du monde ================= */
let CH_OPEN=false, chDirty=true, chTab='planet', chSel=null, chHits=[];
const chcv=$('chcv'), chctx=chcv.getContext('2d');
let CHW=0, CHH=0;
const chState={ma:0, playing:false, civX0:0, civSpan:1, focus:null};

/* ---------- histoire géologique ---------- */
function geoData(){
  return cached('geo', ()=>{
    const r=rngFor('geo|'+P.wvar), w=world, F=w.frame, st=sky.st;
    const age=3+r()*3, T0=250+r()*450;
    const scName=cap(starName(r,st,true))+pick(r,['gée','ia','éa','ane']);
    const cells=[], lmOf=new Map();
    for(let c=0;c<WN;c++){ if(w.h[c]<0) continue; const lid=w.landId[c]; if(lid<0) continue; const i=c%WW, j=(c/WW)|0; const d=dirOf(cellLon(i),cellLat(j)); cells.push(c);
      if(!lmOf.has(lid)) lmOf.set(lid,{sum:[0,0,0], n:0}); const L=lmOf.get(lid); L.sum[0]+=d[0]; L.sum[1]+=d[1]; L.sum[2]+=d[2]; L.n++; }
    const N=cells.length, dirs=new Float32Array(N*3), cols=new Uint8Array(N*3), lmIdx=new Int32Array(N);
    const ids=[...lmOf.keys()], idPos=new Map(ids.map((id,k)=>[id,k]));
    let Cs=[0,0,0]; for(const L of lmOf.values()){ Cs[0]+=L.sum[0]; Cs[1]+=L.sum[1]; Cs[2]+=L.sum[2]; }
    let C=norm(Cs); if(!isFinite(C[0])) C=[0,0,1];
    const lms=ids.map(id=>{ const L=lmOf.get(id), c=norm(L.sum); const p=norm([C[0]+(c[0]-C[0])*.22, C[1]+(c[1]-C[1])*.22, C[2]+(c[2]-C[2])*.22]);
      let ax=cross(c,p); const n=Math.hypot(ax[0],ax[1],ax[2]); const ang=Math.acos(clamp(dot(c,p),-1,1)); ax = n>1e-6 ? [ax[0]/n,ax[1]/n,ax[2]/n] : [0,1,0];
      return {id, c, ax, ang, n:L.n, name:w.places[id]?w.places[id].name:''}; });
    cells.forEach((c,k)=>{ const i=c%WW, j=(c/WW)|0; const d=dirOf(cellLon(i),cellLat(j)); dirs[k*3]=d[0]; dirs[k*3+1]=d[1]; dirs[k*3+2]=d[2]; cols[k*3]=w.px[c*4]; cols[k*3+1]=w.px[c*4+1]; cols[k*3+2]=w.px[c*4+2]; lmIdx[k]=idPos.get(w.landId[c]); });
    // événements
    const ev=[]; const Ga=age*1000; const moonsN=F.moons.map(m=>m.name);
    const push=(ma,title,text,kind)=>ev.push({ma,title,text,kind});
    push(Ga,`Formation de ${w.name}`,`La planète naît de la poussière et des roches qui tournent autour du jeune ${F.suns[0].name}.`,'cosmos');
    if(moonsN.length) push(Ga-20-r()*60,`Naissance ${moonsN.length>1?'des lunes':'de la lune'}`,`Un corps géant percute ${w.name}. Les débris se rassemblent et forment ${moonsN.join(' et ')}.`,'cosmos');
    push(Ga-150-r()*150,'Premiers océans',`La surface refroidit et la pluie tombe pendant des millions d’années : les premiers océans se forment.`,'geo');
    push(Ga-700-r()*600,'Apparition de la vie','De minuscules êtres vivants apparaissent dans les eaux chaudes des océans.','life');
    push(Math.min(Ga-1500,T0*3+r()*800),'Un premier supercontinent','Les terres émergées se rassemblent une première fois, puis se séparent à nouveau.','geo');
    push(T0*1.5+r()*150,'La vie envahit les terres','Plantes puis animaux quittent la mer et colonisent les continents.','life');
    push(T0+60+r()*90,`Formation de ${scName}`,`Tous les continents se soudent en un seul bloc, entouré d’un océan immense.`,'geo');
    push(T0,`Dislocation de ${scName}`,`Le supercontinent commence à se fracturer ; les continents actuels entament leur lente dérive.`,'geo');
    const big=lms.filter(l=>l.name).sort((a,b)=>b.n-a.n);
    if(big.length>=2) push(T0*(.45+r()*.25),`Séparation de ${big[0].name} et ${big[1].name}`,`Un rift s’ouvre entre les deux terres ; un nouvel océan naît entre elles.`,'geo');
    const crater=(w.pois||[]).find(o=>o.type==='crater');
    const nEx=2+Math.floor(r()*3); for(let k=0;k<nEx;k++){ const cause=pick(r,['un volcanisme géant','l’impact d’un astéroïde','un refroidissement brutal','l’empoisonnement des océans']);
      push(20+r()*T0*.95,'Grande extinction',`La plupart des espèces disparaissent, emportées par ${cause}.${cause.includes('astéroïde')&&crater?` Le ${crater.name} en garderait la trace.`:''}`,'life'); }
    for(const m of w.places.filter(q=>q.kind==='mountains').slice(0,3)) push(5+r()*T0*.6,`Surrection des ${m.name.replace(/^Monts /,'monts ')}`,`La collision de deux plaques fait se dresser ${m.name}.`,'geo');
    const nIce=1+Math.floor(r()*3); for(let k=0;k<nIce;k++) push(.5+r()*T0*.8,'Âge glaciaire','Les calottes de glace s’étendent loin des pôles et le niveau des océans baisse.','geo');
    push(.15+r()*.4,'Premiers peuples','Les ancêtres des peuples actuels apparaissent et apprennent à lire le ciel.','civ');
    const oldest=Math.max(0,...w.peoples.list.map((p,k)=>civOf(k).era0));
    if(oldest) push(oldest/1e6,'Premières cités',`Fondation des premières cités, il y a environ ${fr(Math.round(oldest/10)*10,0)} ans.`,'civ');
    ev.sort((a,b)=>b.ma-a.ma);
    return {age, T0, scName, C, cells, dirs, cols, lmIdx, lms, ev, N};
  });
}
function geoPos(G, ma){
  if(ma<=G.T0) return Math.min(1, ma/G.T0);
  return 1;
}
const GEO_W=512, GEO_H=256; let geoImg=null;
function renderGeo(G, ma){
  if(!geoImg) geoImg=new ImageData(GEO_W,GEO_H);
  const d=geoImg.data, Ga=G.age*1000;
  const molten = ma>Ga-160, primordial = ma>G.T0*2.4 && !molten;
  for(let j=0;j<GEO_H;j++){ const lat=Math.PI/2-(j+.5)/GEO_H*Math.PI; for(let i=0;i<GEO_W;i++){ const o=(j*GEO_W+i)*4;
    if(molten){ const n=(Math.sin(i*.09+j*.13+ma*.02)+Math.sin(i*.031-j*.07))*.25+.5; d[o]=150+n*100; d[o+1]=40+n*70; d[o+2]=20; }
    else { const k=Math.abs(Math.sin(lat)); d[o]=30+k*10; d[o+1]=72+k*14; d[o+2]=128+k*14; } d[o+3]=255; } }
  if(!molten){
    const f=geoPos(G,ma), R=G.lms.map(l=>{ const a=l.ang*f; return [Math.cos(a),Math.sin(a),l.ax]; });
    const shrink = primordial ? .35 : 1;
    for(let k=0;k<G.N;k++){ const [c,s,ax]=R[G.lmIdx[k]]; let x=G.dirs[k*3], y=G.dirs[k*3+1], z=G.dirs[k*3+2];
      if(primordial){ const h=(Math.imul(k,2654435761)>>>0)%100; if(h>8) continue; }
      const kv=ax[0]*x+ax[1]*y+ax[2]*z, cx=ax[1]*z-ax[2]*y, cy=ax[2]*x-ax[0]*z, cz=ax[0]*y-ax[1]*x;
      const X=x*c+cx*s+ax[0]*kv*(1-c), Y=y*c+cy*s+ax[1]*kv*(1-c), Z=z*c+cz*s+ax[2]*kv*(1-c);
      const lon=Math.atan2(X,Z), lat=Math.asin(clamp(Y,-1,1)); const pi=Math.floor((lon+Math.PI)/TAU*GEO_W), pj=Math.floor((Math.PI/2-lat)/Math.PI*GEO_H);
      let r0=G.cols[k*3], g0=G.cols[k*3+1], b0=G.cols[k*3+2];
      if(ma>G.T0*1.3 && ma<=G.T0*2.4){ const m=(r0+g0+b0)/3; r0=(r0+m*1.2)/2.2+18; g0=(g0+m)/2+6; b0=(b0+m)/2-6; }
      for(const [di,dj] of [[0,0],[1,0],[0,1],[1,1]]){ const ii=((pi+di)%GEO_W+GEO_W)%GEO_W, jj=clamp(pj+dj,0,GEO_H-1), o=(jj*GEO_W+ii)*4; d[o]=r0; d[o+1]=g0; d[o+2]=b0; } }
  }
  return {molten, primordial, f: molten?1:geoPos(G,ma)};
}
function maLabel(ma){ if(ma<.02) return 'aujourd’hui'; if(ma<1) return `il y a ${fr(Math.round(ma*1000)*1000,0)} ans`; if(ma<1000) return `il y a ${fr(ma<10?ma:Math.round(ma), ma<10?1:0)} millions d’années`; return `il y a ${fr(ma/1000,1)} milliards d’années`; }
const maFromPos = (G,p) => p<=0 ? 0 : Math.pow(10, -2 + p*(Math.log10(G.age*1000)+2));
const posFromMa = (G,ma) => ma<=.01 ? 0 : (Math.log10(ma)+2)/(Math.log10(G.age*1000)+2);

/* ---------- chronologie des civilisations ---------- */
function civTimeline(){
  return cached('civtl', ()=>{
    const list=world.peoples.list, civs=list.map((p,k)=>civOf(k));
    const CY = Math.max(...civs.map(c=>c.era0)) + 37;
    const lanes=list.map((p,k)=>({p, k, start: CY-civs[k].era0+1, color:p.col}));
    const ev=[];
    list.forEach((p,k)=>{ const cv=civs[k], base=CY-cv.era0;
      cv.hist.forEach(([y,t],i)=>{ const kind = i===0?'found': /Guerre|guerre/.test(t)?'war': /paix|Traité|échanges/.test(t)?'peace': /épidémie|famine|Hiver|hiver|comète/.test(t)?'disaster':'culture';
        ev.push({year:base+y, lane:k, kind, title: i===0?'Fondation':cap(t.split(/[.,:]/)[0]).slice(0,60), text:t, people:p.name}); }); });
    const r=rngFor('civtl|'+P.wvar);
    const pairs=new Set();
    list.forEach((p,k)=>civs[k].rel.forEach(rel=>{ const o=rel.o.key; const key=Math.min(k,o)+'-'+Math.max(k,o); if(pairs.has(key)) return; pairs.add(key);
      const from=Math.max(lanes[k].start, lanes[o].start)+20; if(from>=CY-5) return;
      const y=Math.floor(from+r()*(CY-5-from));
      const kind = rel.kind==='rivaux' ? 'war' : rel.kind==='alliés' ? 'peace' : 'trade';
      const t = kind==='war' ? `Guerre entre ${p.name} et ${rel.o.name}, qui fixe pour longtemps la frontière entre les deux peuples.` : kind==='peace' ? `Alliance scellée entre ${p.name} et ${rel.o.name}, par un mariage entre leurs dynasties.` : `Ouverture d’une grande route commerciale entre ${p.name} et ${rel.o.name}.`;
      const title = kind==='war'?'Guerre':kind==='peace'?'Alliance':'Route commerciale';
      ev.push({year:y, lane:k, kind, title, text:t, people:p.name, pair:o}); ev.push({year:y, lane:o, kind, title, text:t, people:rel.o.name, pair:k}); }));
    const glob=[];
    const cm=worldComet(); if(cm){ let y=CY-((CY-cm.phaseYear)%cm.period+cm.period)%cm.period; for(let n=0;n<3 && y>0;n++){ glob.push({year:y, kind:'sky', title:'Passage de la '+cm.name, text:`La ${cm.name} traverse le ciel pendant plusieurs semaines ; toutes les chroniques la mentionnent.`}); y-=cm.period*(2+Math.floor(r()*4)); } }
    const minY=Math.min(...lanes.map(l=>l.start));
    glob.push({year:Math.floor(minY+r()*(CY-minY)), kind:'disaster', title:'L’année sans été', text:'Un voile de cendres obscurcit le ciel ; les récoltes gèlent sur tous les continents.'});
    glob.push({year:Math.floor(minY+r()*(CY-minY)), kind:'disaster', title:'La Grande Peste', text:'Une épidémie se répand le long des routes commerciales et touche tous les peuples.'});
    glob.push({year:Math.floor(minY+(CY-minY)*(.3+r()*.5)), kind:'sky', title:'La nuit où tomba une étoile', text:'Une étoile filante géante illumine la nuit ; de nombreux peuples datent leur calendrier de cet événement.'});
    glob.push({year:CY, kind:'now', title:'Aujourd’hui', text:`Nous sommes en l’an ${CY} de l’ère commune, comptée depuis la fondation de la plus ancienne cité.`});
    ev.sort((a,b)=>a.year-b.year); glob.sort((a,b)=>a.year-b.year);
    return {CY, minY, lanes, ev, glob};
  });
}
const EV_COL={found:'#d6a53a', war:'#b8322a', peace:'#4f8a4a', trade:'#4a78b0', disaster:'#6b6358', culture:'#8a5fb0', sky:'#e2c46a', now:'#fff'};

/* ---------- ouverture et dessin ---------- */
function openChrono(tab, focus){
  if(!world || sky.earth){ toast('La chronologie concerne les mondes imaginaires'); return; }
  closeSheets(); CH_OPEN=true; $('chrono').hidden=false; chTab=tab||'planet'; chSel=null; chState.focus=focus??null;
  const G=geoData(); chState.ma=G.T0*1.05; const T=civTimeline(); chState.civX0=T.minY-20; chState.civSpan=(T.CY-T.minY)+40;
  document.querySelectorAll('[data-chtab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chtab===chTab)));
  chPanel(); chDirty=true; syncChSlider();
}
function closeChrono(){ CH_OPEN=false; chState.playing=false; $('chrono').hidden=true; dirty=true; }
$('chBack').onclick=closeChrono;
document.querySelectorAll('[data-chtab]').forEach(b=>b.onclick=()=>{ chTab=b.dataset.chtab; chSel=null; chState.playing=false; $('chPlay').textContent='Lecture'; document.querySelectorAll('[data-chtab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); chPanel(); chDirty=true; syncChSlider(); });
function syncChSlider(){ const on=chTab==='planet'; $('chSlider').hidden=!on; $('chPlay').hidden=!on; if(on){ const G=geoData(); $('chRange').value=Math.round((1-posFromMa(G,chState.ma))*1000); $('chTime').textContent=maLabel(chState.ma); } }
$('chRange').addEventListener('input',()=>{ const G=geoData(); chState.ma=maFromPos(G,1-(+$('chRange').value)/1000); chState.playing=false; $('chPlay').textContent='Lecture'; $('chTime').textContent=maLabel(chState.ma); chDirty=true; chPanel(true); });
$('chPlay').onclick=()=>{ const G=geoData(); if(!chState.playing && chState.ma<.05) chState.ma=G.T0*1.1; chState.playing=!chState.playing; $('chPlay').textContent=chState.playing?'Pause':'Lecture'; };
attachDrag(chcv,(dx,dy)=>{ if(chTab==='civ'){ chState.civX0-=dx/CHW*chState.civSpan*1.1; chDirty=true; } }, f=>{ if(chTab==='civ'){ const T=civTimeline(); const mid=chState.civX0+chState.civSpan/2; chState.civSpan=clamp(chState.civSpan*f,40,(T.CY-T.minY)*1.6); chState.civX0=mid-chState.civSpan/2; chDirty=true; } }, (x,y)=>{
  let best=null, bd=14; for(const h of chHits){ const d=Math.hypot(h.x-x,h.y-y); if(d<bd){ bd=d; best=h.o; } } if(best){ chSel=best; chPanel(); chDirty=true; } }, null);
new ResizeObserver(()=>{ chDirty=true; }).observe($('chStage'));
function stepChrono(dt){ if(!chState.playing || chTab!=='planet') return; const G=geoData(); const p=posFromMa(G,chState.ma)-dt*.06; if(p<=0){ chState.ma=0; chState.playing=false; $('chPlay').textContent='Lecture'; } else chState.ma=maFromPos(G,p); syncChSlider(); chDirty=true; chPanel(true); }
function drawChrono(){
  const rect=$('chStage').getBoundingClientRect(), dpr=Math.min(2,devicePixelRatio||1);
  if(Math.round(rect.width*dpr)!==chcv.width || Math.round(rect.height*dpr)!==chcv.height){ chcv.width=Math.round(rect.width*dpr); chcv.height=Math.round(rect.height*dpr); }
  CHW=rect.width; CHH=rect.height; const g=chctx; g.setTransform(dpr,0,0,dpr,0,0); chHits=[];
  g.fillStyle='#02040b'; g.fillRect(0,0,CHW,CHH);
  if(chTab==='planet') drawGeo(g); else drawCiv(g);
}
function drawGeo(g){
  const G=geoData(), st=renderGeo(G, chState.ma);
  const off=document.createElement('canvas'); off.width=GEO_W; off.height=GEO_H; off.getContext('2d').putImageData(geoImg,0,0);
  const top=80, bottom=90, availH=CHH-top-bottom, s=Math.min((CHW-40)/GEO_W, availH/GEO_H), w=GEO_W*s, h=GEO_H*s, x0=(CHW-w)/2, y0=top+(availH-h)/2;
  g.imageSmoothingEnabled=true; g.drawImage(off,x0,y0,w,h); g.strokeStyle='rgba(216,181,106,.5)'; g.strokeRect(x0,y0,w,h);
  g.textAlign='center'; g.textBaseline='middle';
  const lab=(t,lon,lat,font,col)=>{ const x=x0+(wrapPi(lon)+Math.PI)/TAU*w, y=y0+(Math.PI/2-lat)/Math.PI*h; g.font=font; g.lineWidth=3; g.strokeStyle='rgba(8,12,24,.7)'; g.strokeText(t,x,y); g.fillStyle=col; g.fillText(t,x,y); };
  if(!st.molten && !st.primordial){
    if(st.f<.55){ for(const l of G.lms){ if(!l.name || l.n<400) continue; const a=l.ang*st.f, c=Math.cos(a), sn=Math.sin(a), ax=l.ax, v=l.c, kv=dot(ax,v), cr=cross(ax,v); const X=[v[0]*c+cr[0]*sn+ax[0]*kv*(1-c), v[1]*c+cr[1]*sn+ax[1]*kv*(1-c), v[2]*c+cr[2]*sn+ax[2]*kv*(1-c)]; lab(l.name,lonOf(X),latOf(X),`600 ${Math.round(clamp(14*s/2,13,20))}px ${SERIF}`,'#fbf5e4'); } }
    if(st.f>.8) lab(G.scName, lonOf(G.C), latOf(G.C), `italic 600 ${Math.round(clamp(20*s/2,16,28))}px ${SERIF}`, '#ffe29a');
  }
  g.font=`italic 500 ${Math.round(clamp(CHW*.03,18,30))}px ${SERIF}`; g.fillStyle='#efe9d6'; g.textAlign='center'; g.fillText(maLabel(chState.ma), CHW/2, y0-22);
  const cur=G.ev.filter(e=>e.ma>=chState.ma).pop(); if(cur){ g.font='13px Figtree, system-ui, sans-serif'; g.fillStyle='#b9bdd3'; g.fillText('Dernier grand événement : '+cur.title, CHW/2, y0+h+22); }
}
function drawCiv(g){
  const T=civTimeline(), L=T.lanes.length, left=150, right=24, top=128, laneH=clamp((CHH-top-110)/Math.max(1,L),26,60);
  const X=y=>left+(y-chState.civX0)/chState.civSpan*(CHW-left-right);
  g.font='12px Figtree, system-ui, sans-serif'; g.textAlign='center'; g.textBaseline='top';
  const step=[10,25,50,100,200,500,1000].find(s=>chState.civSpan/s<9)||2000;
  for(let y=Math.ceil(chState.civX0/step)*step; y<chState.civX0+chState.civSpan; y+=step){ const x=X(y); if(x<left) continue; g.strokeStyle='rgba(160,180,230,.12)'; g.beginPath(); g.moveTo(x,top-10); g.lineTo(x,top+L*laneH); g.stroke(); g.fillStyle='rgba(185,189,211,.8)'; g.fillText('an '+y,x,top-28); }
  for(const e of T.glob){ const x=X(e.year); if(x<left||x>CHW-right) continue; g.strokeStyle=EV_COL[e.kind]; g.setLineDash([4,4]); g.beginPath(); g.moveTo(x,top-8); g.lineTo(x,top+L*laneH); g.stroke(); g.setLineDash([]);
    g.fillStyle=EV_COL[e.kind]; g.beginPath(); g.moveTo(x,top-8); g.lineTo(x+5,top-14); g.lineTo(x-5,top-14); g.closePath(); g.fill(); chHits.push({x, y:top-11, o:e}); }
  T.lanes.forEach((ln,i)=>{ const y=top+i*laneH+laneH/2, hl = chState.focus===i;
    g.textAlign='right'; g.textBaseline='middle'; g.font=`${hl?'600 ':''}14px ${SERIF}`; g.fillStyle=hl?'#ffe29a':'#efe6cc'; g.fillText(cap(ln.p.name),left-12,y);
    const xs=Math.max(left,X(ln.start)), xe=Math.min(CHW-right,X(T.CY)); if(xe>xs){ g.fillStyle=ln.color; g.globalAlpha=hl?.55:.3; g.fillRect(xs,y-laneH*.22,xe-xs,laneH*.44); g.globalAlpha=1; } });
  for(const e of T.ev){ const x=X(e.year); if(x<left-4||x>CHW-right+4) continue; const y=top+e.lane*laneH+laneH/2; const sel=chSel===e;
    g.fillStyle=EV_COL[e.kind]; g.strokeStyle='#0b1022'; g.lineWidth=1.5; g.beginPath(); g.arc(x,y,sel?7:5,0,TAU); g.fill(); g.stroke(); if(sel){ g.strokeStyle='#fff4d6'; g.beginPath(); g.arc(x,y,11,0,TAU); g.stroke(); }
    chHits.push({x,y,o:e}); }
  g.textAlign='left'; g.font='12px Figtree, system-ui, sans-serif'; let lx=left, ly=CHH-70;
  for(const [k,t] of [['found','Fondation'],['war','Guerre'],['peace','Alliance'],['trade','Commerce'],['culture','Culture'],['disaster','Catastrophe'],['sky','Ciel']]){ g.fillStyle=EV_COL[k]; g.beginPath(); g.arc(lx+5,ly,5,0,TAU); g.fill(); g.fillStyle='#b9bdd3'; g.fillText(t,lx+14,ly+1); lx+=g.measureText(t).width+34; if(lx>CHW-120){ lx=left; ly+=20; } }
}
function chPanel(light){
  const info=$('chInfo'), lists=$('chLists');
  if(chTab==='planet'){
    const G=geoData(); $('chTitle').textContent='Histoire de '+world.name; $('chSubT').textContent='De la formation de la planète à aujourd’hui';
    if(light){ lists.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.ma>=chState.ma && +b.dataset.ma===Math.min(...G.ev.filter(e=>e.ma>=chState.ma).map(e=>e.ma))))); return; }
    info.innerHTML=''; info.append(el('h3',null,world.name), el('p','sub',`Une planète de ${fr(G.age,1)} milliards d’années`), el('p','desc',`Fais glisser le curseur ou appuie sur Lecture pour remonter le temps : on voit les continents se rassembler en ${G.scName} il y a environ ${fr(Math.round(G.T0),0)} millions d’années, puis dériver jusqu’à leur place actuelle.`));
    lists.innerHTML=''; lists.append(el('h4',null,'Grands événements')); const ul=el('ul','v-list');
    for(const e of G.ev){ const li=el('li'), b=el('button'); b.dataset.ma=e.ma; const d=el('span','dot'); d.style.background={cosmos:'#e2c46a',geo:'#c98d4f',life:'#6fb06a',civ:'#9fb0e0'}[e.kind];
      const w=el('span'); w.style.cssText='display:flex;flex-direction:column;gap:2px;min-width:0'; w.append(el('span','nm',e.title), Object.assign(el('span',null,e.text),{style:'font-size:12.5px;color:var(--ink-soft);line-height:1.35'}));
      b.append(d,w,el('span','ty',maLabel(e.ma).replace('il y a ',''))); b.onclick=()=>{ chState.ma=Math.max(e.ma, .005); chState.playing=false; $('chPlay').textContent='Lecture'; syncChSlider(); chDirty=true; chPanel(true); }; li.append(b); ul.append(li); }
    lists.append(ul); chPanel(true); return;
  }
  if(light) return;
  const T=civTimeline(); $('chTitle').textContent='Chronologie des peuples'; $('chSubT').textContent=`De l’an ${T.minY} à l’an ${T.CY} de l’ère commune`;
  info.innerHTML='';
  if(chSel){ info.append(el('h3',null,chSel.title), el('p','sub',`An ${chSel.year} de l’ère commune${chSel.people?', '+chSel.people:''}`), el('p','desc',chSel.text));
    if(chSel.lane!=null){ const cv=civOf(chSel.lane); const local=chSel.year-(T.CY-cv.era0); if(local>0) info.append(el('p','hint',`Soit l’an ${local} dans le calendrier ${world.peoples.list[chSel.lane].name.replace(/^les /,'des ')}.`)); }
    const b=el('button','act','Désélectionner'); b.onclick=()=>{ chSel=null; chPanel(); chDirty=true; }; info.append(b); }
  else info.append(el('h3',null,'L’ère commune'), el('p','desc',`Les érudits comptent les années depuis la fondation de la plus ancienne cité. Chaque peuple garde aussi son propre calendrier. Pince ou fais glisser la frise pour zoomer et te déplacer ; touche un point pour lire l’événement.`));
  lists.innerHTML=''; lists.append(el('h4',null,'Tous les événements')); const ul=el('ul','v-list');
  for(const e of [...T.glob,...T.ev.filter(e=>e.year<T.CY && !(e.pair!=null && e.lane>e.pair))].sort((a,b)=>b.year-a.year)){ const li=el('li'), b=el('button'); const d=el('span','dot'); d.style.background=EV_COL[e.kind];
    const w=el('span'); w.style.cssText='display:flex;flex-direction:column;gap:1px;min-width:0'; w.append(el('span','nm',e.title), Object.assign(el('span',null,e.people?cap(e.people):'Tous les peuples'),{style:'font-size:12.5px;color:var(--ink-soft)'}));
    b.append(d,w,el('span','ty','an '+e.year)); b.setAttribute('aria-current',String(chSel===e)); b.onclick=()=>{ chSel=e; const T2=civTimeline(); chState.civSpan=Math.min(chState.civSpan,(T2.CY-T2.minY)*.5+40); chState.civX0=e.year-chState.civSpan/2; chPanel(); chDirty=true; }; li.append(b); ul.append(li); }
  lists.append(ul);
}
