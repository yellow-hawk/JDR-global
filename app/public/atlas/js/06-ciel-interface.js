/* Atlas des ciels imaginaires — Interactions du ciel, fiche, modes et panneaux
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ---------- interactions du ciel ---------- */
function attachDrag(el, onPan, onZoom, onTap, onDouble){
  const pointers = new Map(); let downX=0, downY=0, moved=false, pinchD=0, lastTap=0, lx=0, ly=0;
  el.addEventListener('pointerdown', e=>{ el.setPointerCapture(e.pointerId); pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1){ downX=e.clientX; downY=e.clientY; moved=false; el.classList.add('dragging'); }
    if(pointers.size===2){ const [a,b]=[...pointers.values()]; pinchD=Math.hypot(a.x-b.x,a.y-b.y); moved=true; } });
  el.addEventListener('pointermove', e=>{ const p=pointers.get(e.pointerId); if(!p) return;
    const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
    if(pointers.size===1){ if(Math.hypot(e.clientX-downX,e.clientY-downY)>5) moved=true; if(moved) onPan(dx,dy); }
    else if(pointers.size===2){ const [a,b]=[...pointers.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); if(pinchD>0) onZoom(pinchD/d); pinchD=d; } });
  const up = e=>{ if(!pointers.has(e.pointerId)) return; pointers.delete(e.pointerId);
    if(pointers.size===0){ el.classList.remove('dragging');
      if(!moved && e.type==='pointerup'){ const rect=el.getBoundingClientRect(), x=e.clientX-rect.left, y=e.clientY-rect.top, now=performance.now();
        if(onDouble && now-lastTap<320 && Math.hypot(x-lx,y-ly)<24){ onDouble(x,y); lastTap=0; }
        else { onTap(x,y); lastTap=now; lx=x; ly=y; } } } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e=>{ e.preventDefault(); onZoom(Math.exp(e.deltaY*.0012)); }, {passive:false});
}
let camAnim=null;
function aimView(lon, lat, dur=1000){
  if(reduceMotion){ if(view.mode==='pov'){ view.yaw=lon; view.pitch=clampPitch(lat); } else { view.mcx=lon; view.mcy=clamp(lat,-Math.PI/2,Math.PI/2); } camAnim=null; dirty=true; return; }
  const pov=view.mode==='pov';
  camAnim={t0:performance.now(), dur, mode:view.mode, y0:pov?view.yaw:view.mcx, p0:pov?view.pitch:view.mcy, y1:lon, p1:lat};
}
function stepCam(now){
  const a=camAnim, f=clamp((now-a.t0)/a.dur,0,1), e=f<.5?4*f*f*f:1-Math.pow(-2*f+2,3)/2;
  const yv=wrapPi(a.y0+wrapPi(a.y1-a.y0)*e), pv=a.p0+(a.p1-a.p0)*e;
  if(a.mode==='pov'){ view.yaw=yv; view.pitch=clampPitch(pv); } else { view.mcx=yv; view.mcy=clamp(pv,-Math.PI/2,Math.PI/2); }
  dirty=true; if(f>=1) camAnim=null;
}
function pan(dx,dy){
  camAnim=null;
  if(view.mode==='pov'){ setCam(); view.yaw = wrapPi(view.yaw - dx/cam.F); view.pitch = clampPitch(view.pitch + dy/cam.F); }
  else { const s=mapS(); view.mcx = wrapPi(view.mcx - dx/s); view.mcy = clamp(view.mcy + dy/s, -Math.PI/2, Math.PI/2); }
  dirty=true;
}
function clampPitch(p){ return clamp(p, (D.horizon && !(sky&&sky.space)?-15:-88)*deg, 88*deg); }
function zoom(f){
  if(view.mode==='pov') view.fov = clamp(view.fov*f, 12*deg, 150*deg);
  else view.mz = clamp(view.mz/f, .8, 14);
  dirty=true;
}
function tap(x,y){
  if(!sky) return;
  for(const [bx,by,bw,bh,ci] of constHits){ if(x>=bx&&x<=bx+bw&&y>=by&&y<=by+bh){ showConst(ci); return; } }
  let best=-1, bs=1e9;
  for(let i=0;i<sky.stars.length;i++){ if(SV[i]!==1) continue; const s=sky.stars[i];
    if(view.mode==='pov' && D.horizon && s.lat<hillAlt(s.lon)) continue;
    const d=Math.hypot(SX[i]-x,SY[i]-y); if(d>SR[i]+16) continue;
    const sc=d-(6.9-s.mag)*1.6 - (s.kind!=='star'?8:0); if(sc<bs){bs=sc;best=i;} }
  if(best>=0) select(best); else closeCard();
}
function doubleTap(x,y){
  if(view.mode==='map'){ const s=mapS(); const lon=wrapPi(view.mcx+(x-W/2)/s), lat=clamp(view.mcy-(y-H/2)/s,-Math.PI/2,Math.PI/2);
    view.yaw=lon; view.pitch=clampPitch(lat); setMode('pov'); }
  else zoom(.6);
}
attachDrag(cv, pan, zoom, tap, doubleTap);
addEventListener('keydown', e=>{
  if(e.target.closest && e.target.closest('input,select,textarea')) return;
  if(e.key==='Escape'){ if(!$('imgView').hidden){ $('imgView').hidden=true; return; } if(!$('jsonView').hidden){ $('jsonView').hidden=true; return; } if(CY_OPEN){ closeCity(); return; } if(CH_OPEN){ closeChrono(); return; } if(M_OPEN){ closeMicro(); return; } if(W_OPEN){ closeWorld(); return; } if(V.open) vBack(); else { closeSheets(); closeCard(); } return; }
  if(V.open || W_OPEN || M_OPEN || CY_OPEN || CH_OPEN) return;
  const k=e.key, st=40;
  if(k==='ArrowLeft') pan(st,0); else if(k==='ArrowRight') pan(-st,0); else if(k==='ArrowUp') pan(0,st); else if(k==='ArrowDown') pan(0,-st);
  else if(k==='+'||k==='=') zoom(.85); else if(k==='-') zoom(1.18); else return;
  e.preventDefault();
});
$('zin').onclick=()=>zoom(.8); $('zout').onclick=()=>zoom(1.25);

/* ---------- fiche ---------- */
function fillFacts(el, rows){ el.innerHTML=''; for(const [t,v,html] of rows){ const dt=document.createElement('dt'); dt.textContent=t; const dd=document.createElement('dd'); if(html) dd.innerHTML=html; else dd.textContent=v; el.append(dt,dd); } }
function select(i){
  sel=i; cardMode='star'; const s=sky.stars[i]; selC=s.c; dirty=true; closeEdit(); cancelTell();
  const c = s.c>=0 ? sky.consts[s.c] : null;
  const ex=$('cExplore'), cb=$('cConst');
  const rows=[];
  $('cEdit').hidden=!!sky.earth || !!s.fobj;
  const canGo = s.kind==='star' && !!starPos(s);
  $('cVantage').hidden = !canGo; $('cNear').hidden = !canGo;
  $('cVantage').textContent = s.homeStar ? 'Revenir vers '+homeName() : 'Voir le ciel depuis cette étoile';
  if(s.fobj && s.kind!=='star'){
    const F=currentFrame(), wn = F && F.kind==='surface' ? F.name : world.name;
    $('cName').textContent=s.name; cb.hidden=true;
    if(s.kind==='sun'){ $('cSub').textContent='Soleil de '+wn; rows.push(['Hauteur', fr(s.lat/deg,0)+'°']); ex.textContent='Explorer le système'; }
    else if(s.kind==='sun2'){ $('cSub').textContent='Second soleil'; rows.push(['Hauteur', fr(s.lat/deg,0)+'°']); ex.textContent='Explorer le système'; }
    else if(s.kind==='moon'){ $('cSub').textContent=moonPhaseName(s)+', lune de '+wn; rows.push(['Partie éclairée', fr(s.illum*100,0)+' %'], ['Cycle', fr(s.period,1)+' jours'], ['Hauteur', fr(s.lat/deg,0)+'°']); ex.textContent='Voir '+wn+' et ses lunes'; }
    else if(s.kind==='comet'){ const cs=cometState(); $('cSub').textContent='Comète'; rows.push(['Retour', `tous les ${cs.c.period} ans`], ['Prochain passage', 'an '+(cs.visible ? (view.year||1)+cs.c.period : cs.next)], ['Hauteur', fr(s.lat/deg,0)+'°']); ex.textContent=''; }
    else { $('cSub').textContent=PTYPES[s.ptype].label; rows.push(['Magnitude', fr(s.mag)], ['Distance', fr(s.distAU||0,2)+' UA']); ex.textContent='Voir la planète'; }
    const d=cardDesc(s); $('cDesc').textContent=d; $('cDesc').hidden=!d; ex.hidden=s.kind==='comet';
    fillFacts($('cDl'), rows); $('card').hidden=false; updateTellBtn(); return;
  }
  if(s.kind==='sun'){
    $('cName').textContent='Soleil'; $('cSub').textContent='Notre étoile';
    rows.push(['Hauteur', fr(s.lat/deg,0)+'°'], ['Distance','150 millions de km']);
    ex.textContent='Explorer le système solaire'; cb.hidden=true;
  } else if(s.kind==='moon'){
    $('cName').textContent='Lune'; $('cSub').textContent=moonPhaseName(s);
    rows.push(['Partie éclairée', fr(s.illum*100,0)+' %'], ['Hauteur', fr(s.lat/deg,0)+'°'], ['Distance','environ 384 400 km']);
    ex.textContent='Voir la Terre et la Lune'; cb.hidden=true;
  } else if(s.kind==='planet'){
    $('cName').textContent=s.name; $('cSub').textContent=PTYPES[s.ptype].label;
    const body = homePlanet(s);
    rows.push(['Magnitude', fr(s.mag)]); if(s.distAU) rows.push(['Distance à la Terre', fr(s.distAU, s.distAU<3?2:1)+' UA']);
    rows.push(['Lunes', String(body.moonCount ?? body.moons.length)], ['Anneaux', body.rings?'Oui':'Non']);
    ex.textContent='Voir la planète';
    if(s.real){ cb.textContent='Système solaire'; cb.hidden=false; } else cb.hidden=true;
  } else if(s.kind==='galaxy'){
    const g=GTYPES[s.gtype];
    $('cName').textContent=s.name; $('cSub').textContent=cap(g.label);
    rows.push(['Distance', fr(s.distMly,0)+' millions d’al'], ['Diamètre', fr(s.diamKly,0)+' milliers d’al'], ['Étoiles', 'environ '+fr(s.nStars,0)+' milliards']);
    ex.textContent='Voir la galaxie'; cb.hidden=true;
  } else {
    const ph = physOf(i);
    $('cName').textContent = s.name || s.desig || (s.hip ? 'HIP '+s.hip : 'Étoile n° '+(i+1));
    $('cSub').textContent = s.desig && s.name ? s.desig : cap(ph.kind);
    const [r,g,b]=s.col;
    if(s.desig && s.name) rows.push(['Type', cap(ph.kind)]);
    rows.push(['Magnitude', fr(s.mag)], ['Couleur','',`<span class="swatch" style="background:rgb(${r},${g},${b})"></span>${s.colWord ? cap(s.colWord) : colorLabel(s.t)}`]);
    if(sky.vantage!=null && s.vdist!=null) rows.push(['Distance d’ici', fmtLy(s.vdist)]);
    if(!s.homeStar) rows.push(['Distance de '+homeName(), fr(ph.dist, ph.dist<100?1:0)+' années-lumière']);
    if(sky.vantage==null && !sky.surface) rows.push(['Visibilité', visibilityOf(s)]);
    ex.textContent='Explorer le système';
    if(c){ cb.textContent='Constellation '+c.name; cb.hidden=false; } else cb.hidden=true;
  }
  const d = cardDesc(s); $('cDesc').textContent=d; $('cDesc').hidden=!d;
  ex.hidden = !!(sky.earth && s.kind==='star') || s.homeStar || (sky.earth && sky.vantage!=null && s.kind!=='star');
  if(s.homeStar){ $('cName').textContent=s.name; $('cSub').textContent=sky.earth?'Notre étoile, vue de loin':'Ton soleil, vu de loin'; }
  fillFacts($('cDl'), rows);
  $('card').hidden=false; updateTellBtn();
}
function showConst(ci){
  const c=sky.consts[ci]; cardMode='const'; selC=ci; sel=-1; dirty=true; closeEdit(); cancelTell(); $('cEdit').hidden=!!sky.earth;
  $('cVantage').hidden=true; $('cNear').hidden=true;
  const lp=localPeople();
  if(lp){ const cn=getCN(lp,ci); $('cName').textContent=cn.name; $('cSub').textContent=cap(cn.fig)+', chez '+lp.name;
    $('cDesc').textContent = c.customDesc || `Pour ${lp.name}, cette constellation s’appelle ${cn.name} et représente ${cn.fig}. Son nom veut dire « ${cn.meaning} ». ${cn.story} Dans le catalogue savant, c’est ${c.name}, qui représente ${c.fig}.`; }
  else { $('cName').textContent=c.name; $('cSub').textContent= c.fig ? cap(c.fig) : (c.la ? 'En latin : '+c.la : '');
    const on = D.legend!=='court' && !c.customDesc ? otherNamesText(ci) : ''; $('cDesc').textContent=constText(c)+(on?' '+on:''); }
  $('cDesc').hidden=false;
  const a=sky.stars[c.alpha];
  fillFacts($('cDl'), [['Étoiles', String(c.members.length)], ['Étoile principale', a.name||a.desig], ['Visibilité', visibilityOf(c)], ...(c.name===c.name0?[['Génitif', c.gen]]:[])]);
  $('cExplore').textContent='Voir '+(a.name||'l’étoile principale'); $('cExplore').hidden=false;
  $('cConst').hidden=true;
  $('card').hidden=false; updateTellBtn();
}
function closeCard(){ cancelTell(); if(sel<0 && selC<0 && $('card').hidden) return; sel=-1; selC=-1; $('card').hidden=true; closeEdit(); dirty=true; }
function closeEdit(){ $('editForm').hidden=true; $('cView').hidden=false; editTarget=null; }
function refreshCard(){ if(!editTarget) return; const t=editTarget; closeEdit(); if(t.type==='const') showConst(t.idx); else select(t.idx); }
$('cEdit').onclick=()=>{
  const t = cardMode==='const' ? {type:'const', idx:selC} : {type:'star', idx:sel}; if(t.idx<0) return;
  editTarget=t; const o = t.type==='const' ? sky.consts[t.idx] : sky.stars[t.idx];
  $('eName').value = o.name || '';
  $('eName').placeholder = t.type==='star' && !o.name ? (o.desig || 'Étoile n° '+(o.i+1)) : '';
  editPrefill = t.type==='const' ? constText(o) : cardDesc(o);
  $('eDesc').value = editPrefill;
  $('eDesc').placeholder = 'Écris ici la légende de cet astre';
  $('cView').hidden=true; $('editForm').hidden=false; $('eName').focus();
};
$('eCancel').onclick=()=>{ const t=editTarget; closeEdit(); if(t) (t.type==='const'?showConst(t.idx):select(t.idx)); };
$('eReset').onclick=()=>{ const t=editTarget; if(!t) return; const o = t.type==='const' ? sky.consts[t.idx] : sky.stars[t.idx];
  delete E[t.type==='const' ? 'c'+t.idx : keyOfStar(o)]; applyEdits(); refreshCard(); persistEdits('Nom et légende d’origine rétablis'); };
$('editForm').addEventListener('submit', e=>{
  e.preventDefault(); const t=editTarget; if(!t) return;
  const o = t.type==='const' ? sky.consts[t.idx] : sky.stars[t.idx];
  const key = t.type==='const' ? 'c'+t.idx : keyOfStar(o);
  const prev = E[key] || {};
  const nm = $('eName').value.trim(), ds = $('eDesc').value.trim();
  const ne = {};
  if(nm && nm!==o.name0) ne.name=nm;
  if(!nm && t.type==='const') ne.name=undefined;
  E[key]=ne; applyEdits();
  const def = t.type==='const' ? constText(o,true) : cardDesc(o,true);
  if(ds===editPrefill.trim()){ if(prev.desc) ne.desc=prev.desc; }
  else if(ds && ds!==def) ne.desc=ds;
  if(!ne.name && !ne.desc) delete E[key];
  applyEdits(); refreshCard(); persistEdits('Modification enregistrée');
});
async function persistEdits(msg){
  if(currentEntry){
    currentEntry.edits = editsToArr();
    try{ await Store.save(currentEntry); toast(msg+' dans « '+currentEntry.name+' »'); }catch(e){ toast("La modification n'a pas pu être enregistrée"); }
  } else toast(msg+'. Sauvegarde ce ciel pour la garder.');
}
$('cardClose').onclick=closeCard;
$('cVantage').onclick=()=>{ if(sel<0) return; const s=sky.stars[sel]; if(s.homeStar){ closeCard(); setVantage(null); toast('Retour vers '+homeName()); } else goToStar(sel); };
$('cNear').onclick=()=>{ if(sel<0) return; const s=sky.stars[sel]; const sc=neighborsScene(s.homeStar?null:sel); if(sc) openViewer(sc); };
$('cConst').onclick=()=>{ if(sel>=0 && sky.stars[sel].kind==='planet' && sky.stars[sel].real){ openViewer({kind:'system', data:realSolarSystem()}); return; } if(sel>=0 && sky.stars[sel].c>=0) showConst(sky.stars[sel].c); };
$('cCenter').onclick=()=>{
  const o = cardMode==='const' ? sky.consts[selC] : sel>=0 ? sky.stars[sel] : null; if(!o) return;
  aimView(o.lon, o.lat); };
$('cExplore').onclick=()=>{
  if(cardMode==='const'){ select(sky.consts[selC].alpha); return; }
  if(sel<0) return; const s=sky.stars[sel];
  if(s.fobj){ const F=currentFrame();
    if(s.kind==='sun'||s.kind==='sun2'){ openViewer({kind:'system', data: F && F.kind==='surface' ? F.sys : homeSystem()}); return; }
    if(s.kind==='moon'){ openViewer({kind:'body', data: F && F.kind==='surface' ? F.body : worldBody()}); return; }
    if(s.kind==='planet'){ openViewer({kind:'body', data:s.body}); return; } }
  if(s.kind==='sun') openViewer({kind:'system', data:realSolarSystem()});
  else if(s.kind==='moon') openViewer({kind:'body', data:realBody('ter')});
  else if(s.kind==='planet') openViewer({kind:'body', data:homePlanet(s)});
  else if(s.kind==='galaxy') openViewer({kind:'galaxy', data:galaxyOf(s)});
  else openViewer({kind:'system', data:systemOfSky(sel)});
};

/* ---------- modes et panneaux ---------- */
function setMode(m){ view.mode=m; document.querySelectorAll('.modes button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.mode===m))); dirty=true; }
document.querySelectorAll('.modes button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
function closeSheets(){ document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('open')); }
function openSheet(id){ const el=$(id), was=el.classList.contains('open'); closeSheets(); if(!was) el.classList.add('open'); return !was; }
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeSheets);
$('btnSettings').onclick=()=>openSheet('panelSettings');
$('btnSaves').onclick=()=>{ if(openSheet('panelSaves')) refreshList(); };
$('btnSave').onclick=()=>{ $('panelSaves').classList.contains('open') || openSheet('panelSaves'); refreshList(); $('saveName').value=currentName||sky.name; setTimeout(()=>$('saveName').focus(),250); };
$('btnNew').onclick=()=>{ P.seed=randomSeed(); currentName=null; currentEntry=null; E={}; D.placed=false; syncUI(); regen(); };

function buildControls(){
  const gr=$('genRows');
  for(const [k,label,min,max,step,fmt] of GEN_SPEC){
    const row=document.createElement('div'); row.className='row';
    row.innerHTML=`<label for="g_${k}"><span>${label}</span><output id="o_${k}"></output></label><input type="range" id="g_${k}" min="${min}" max="${max}" step="${step}">`;
    gr.append(row);
    const inp=row.querySelector('input'), out=row.querySelector('output');
    inp.addEventListener('input',()=>{ P[k]=+inp.value; out.textContent=fmt(P[k]); currentEntry=null; regenSoon(); });
  }
  const dr=$('dispRows');
  const mrow=document.createElement('div'); mrow.className='row';
  mrow.innerHTML=`<label for="d_smag"><span>Noms d'étoiles affichés</span><output id="o_smag"></output></label><input type="range" id="d_smag" min="-1" max="5" step="0.5">`;
  dr.append(mrow);
  const mi=mrow.querySelector('input'); mi.addEventListener('input',()=>{ D.smag=+mi.value; $('o_smag').textContent=smagLabel(D.smag); dirty=true; });
  const lrow=document.createElement('div'); lrow.className='row';
  lrow.innerHTML=`<label><span>Lieu d'observation</span></label><p class="hint" id="locHint" style="margin:6px 0 8px"></p><button class="act" id="locBtn" type="button">Choisir sur la planète</button>`;
  dr.append(lrow);
  lrow.querySelector('button').onclick=()=>{ closeSheets(); openWorld(); };
  const nrow=document.createElement('div'); nrow.className='row';
  nrow.innerHTML=`<label for="d_cnl"><span>Noms des constellations</span></label><select id="d_cnl"><option value="savant">Catalogue savant</option><option value="local">Langue du peuple local</option></select><p class="hint" style="margin:6px 0 0">Depuis une cité, le ciel prend les noms que lui donne son peuple.</p>`;
  dr.append(nrow);
  nrow.querySelector('select').onchange=e=>{ D.cnamesLocal=e.target.value; calCache=null; dirty=true; syncTime(); if(!$('card').hidden){ if(cardMode==='const'&&selC>=0) showConst(selC); else if(sel>=0) select(sel); } };
  const grow=document.createElement('div'); grow.className='row';
  grow.innerHTML=`<label for="d_legend"><span>Légendes</span></label><select id="d_legend"><option value="complet">Détaillées</option><option value="court">Courtes</option></select>`;
  dr.append(grow);
  grow.querySelector('select').onchange=e=>{ D.legend=e.target.value; if(!$('card').hidden){ if(cardMode==='const' && selC>=0) showConst(selC); else if(sel>=0) select(sel); } };
  for(const [k,label] of DISP_TOGGLES){
    const row=document.createElement('label'); row.className='toggle';
    row.innerHTML=`<span>${label}</span><input type="checkbox" id="d_${k}">`;
    dr.append(row);
    row.querySelector('input').addEventListener('change',e=>{ D[k]=e.target.checked; if(k==='horizon') view.pitch=clampPitch(view.pitch); dirty=true; });
  }
  $('seedIn').addEventListener('change',()=>{ const v=$('seedIn').value.trim(); if(v){ P.seed=v; currentName=null; currentEntry=null; E={}; D.placed=false; regen(); } });
  $('seedRnd').onclick=()=>{ P.seed=randomSeed(); currentName=null; currentEntry=null; E={}; D.placed=false; syncUI(); regen(); };
  $('styleIn').onchange=()=>{ P.style=$('styleIn').value; currentEntry=null; regen(); };
  $('tintIn').onchange=()=>{ D.tint=$('tintIn').value; dirty=true; };
}
const latLabel = v => Math.abs(v)<.5 ? 'équateur' : fr(Math.abs(v),0)+'° '+(v>0?'N':'S');
const lonLabel = v => Math.abs(v)<.5 ? '0°' : fr(Math.abs(v),0)+'° '+(v>0?'E':'O');
const smagLabel = v => v<=-1 ? 'aucun' : v<1 ? 'les plus brillantes' : v<3 ? 'brillantes' : 'nombreuses';
function syncUI(){
  $('seedIn').value=P.seed; $('styleIn').value=P.style; $('tintIn').value=D.tint;
  for(const [k,,,,,fmt] of GEN_SPEC){ $('g_'+k).value=P[k]; $('o_'+k).textContent=fmt(P[k]); }
  $('d_smag').value=D.smag; $('o_smag').textContent=smagLabel(D.smag);
  $('d_legend').value=D.legend; $('d_cnl').value=D.cnamesLocal||'savant'; syncTime(); updateLocation();
  for(const [k] of DISP_TOGGLES) $('d_'+k).checked=!!D[k];
}
let regenT=0;
function regenSoon(){ clearTimeout(regenT); regenT=setTimeout(regen,120); }
function regen(){
  if(P.mode==='earth'){ sky = makeEarthSky(); world = makeEarthWorld(); if(!view.date) view.date=todayStr(); }
  else { sky = makeSky(P); }
  sel=-1; selC=-1; $('card').hidden=true; closeEdit(); objCache.clear(); calCache=null;
  sky.surface=null; sky.space=false;
  if(sky.baseCount!==undefined) sky.stars.length=sky.baseCount;
  for(const s of sky.stars){ if(s.mag0!==undefined) s.mag=s.mag0; s.cel=null; s.hidden=false; s.vdist=null; if(s.kind==='planet'||s.kind==='sun'||s.kind==='moon') s.homeBody=true; }
  for(const c of sky.consts) c.cel=null;
  sky.vantage=null;
  if(sky.earth){ const ev=o=>{ if(o.ra!==undefined && !o.eqv) o.eqv=[Math.cos(o.dec)*Math.cos(o.ra), Math.cos(o.dec)*Math.sin(o.ra), Math.sin(o.dec)]; };
    sky.stars.forEach(s=>{ if(s.kind==='star'||s.kind==='galaxy') ev(s); }); sky.dust.forEach(ev); sky.nebs.forEach(ev); sky.consts.forEach(ev); }
  if(P.mode!=='earth') buildWorld();
  attachFrame(sky.earth ? null : world.frame);
  if(!sky.earth) view.gday=Math.min(view.gday||0, world.frame.yearLen-1);
  applyEdits(); applyTime();
  $('skyName').textContent = currentName || sky.name;
  updateLocation(); updateChips(); syncTime();
  dirty=true;
}
