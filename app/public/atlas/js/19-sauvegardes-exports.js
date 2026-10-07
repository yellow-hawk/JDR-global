/* Atlas des ciels imaginaires — Sauvegardes, exports image et JSON, bascule Terre
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ---------- sauvegarde ---------- */
const LS_KEY='atlas-ciels:v1';
const Store = {
  kind:'pending', ref:null, ready:null,
  async init(){
    try{
      if(window.claude && typeof window.claude.use==='function'){
        const [db,user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if(db && user){ const id = await user.id(); if(id){ this.ref = db.doc('data/users/'+id+'/atlas').collection('skies'); this.kind='db'; return; } }
      }
    }catch(e){}
    try{ localStorage.setItem('__t','1'); localStorage.removeItem('__t'); this.kind='local'; }catch(e){ this.kind='none'; }
  },
  localGet(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ return []; } },
  async list(){ if(this.kind==='db'){ const snap=await this.ref.get(); return snap.docs.map(d=>({id:d.id, ...d.data()})); } if(this.kind==='local') return this.localGet(); return []; },
  async save(entry){ if(this.kind==='db'){ await this.ref.doc(entry.id).set(entry); return; } if(this.kind==='local'){ const a=this.localGet().filter(e=>e.id!==entry.id); a.push(entry); localStorage.setItem(LS_KEY, JSON.stringify(a)); return; } throw new Error('none'); },
  async remove(id){ if(this.kind==='db'){ await this.ref.doc(id).delete(); return; } if(this.kind==='local') localStorage.setItem(LS_KEY, JSON.stringify(this.localGet().filter(e=>e.id!==id))); }
};
Store.ready = Store.init();
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2200); }
async function refreshList(){
  const ul=$('savedList'), hint=$('storeHint');
  if(Store.kind==='pending'){ hint.textContent='Connexion à ta bibliothèque…'; ul.innerHTML=''; }
  await Store.ready;
  const ub=$('updBtn'); ub.hidden=!currentEntry; if(currentEntry) ub.textContent='Mettre à jour « '+currentEntry.name+' » avec l’état actuel';
  hint.textContent = Store.kind==='db' ? 'Tes ciels sont gardés dans ton compte, visibles par toi seul.' : Store.kind==='local' ? 'Tes ciels sont gardés dans ce navigateur. Exporte-les régulièrement dans le dossier « sauvegardes » pour ne jamais les perdre.' : "La sauvegarde n'est pas disponible ici. Note la graine pour retrouver un ciel.";
  let items=[];
  try{ items = await Store.list(); }catch(e){ hint.textContent='Impossible de lire tes ciels pour le moment. Réessaie dans un instant.'; }
  items.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  ul.innerHTML='';
  if(!items.length){ const p=document.createElement('p'); p.className='empty'; p.textContent='Aucun ciel sauvegardé. Trouve un ciel qui te plaît et donne-lui un nom ci-dessus.'; ul.append(p); return; }
  for(const it of items){
    const li=document.createElement('li'), meta=document.createElement('div'); meta.className='meta';
    const st=document.createElement('strong'); st.textContent=it.name||'Sans nom';
    const sp=document.createElement('span'); const dt=new Date(it.createdAt);
    sp.textContent = (isNaN(dt)?'':dt.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})+', ') + 'graine « '+(it.params&&it.params.seed||'?')+' »';
    meta.append(st,sp);
    const ob=document.createElement('button'); ob.className='open-btn'; ob.textContent='Ouvrir'; ob.onclick=()=>openSaved(it);
    const xb=document.createElement('button'); xb.textContent='Fichier'; xb.title='Exporter ce ciel'; xb.setAttribute('aria-label','Exporter '+(it.name||'ce ciel')+' dans un fichier'); xb.onclick=()=>exportSaves([it], it.name);
    const db=document.createElement('button'); db.className='danger'; db.textContent='Supprimer'; db.setAttribute('aria-label','Supprimer '+(it.name||''));
    db.onclick=async()=>{ if(!db.dataset.armed){ db.dataset.armed='1'; db.textContent='Confirmer'; setTimeout(()=>{ if(db.isConnected){ delete db.dataset.armed; db.textContent='Supprimer'; } },3000); return; }
      try{ await Store.remove(it.id); toast('Ciel supprimé'); }catch(e){ toast('Suppression impossible'); } refreshList(); };
    li.append(meta,ob,xb,db); ul.append(li);
  }
}
$('saveForm').addEventListener('submit', async e=>{
  e.preventDefault(); await Store.ready;
  const name = $('saveName').value.trim() || sky.name;
  const entry = { id:'c'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36), name, createdAt:new Date().toISOString(), ...snapshot() };
  try{ await Store.save(entry); currentName=name; currentEntry=entry; $('skyName').textContent=name; toast('Ciel sauvegardé'); refreshList(); }
  catch(err){ toast("Ce ciel n'a pas pu être sauvegardé"); }
});
function snapshot(){ return JSON.parse(JSON.stringify({ params:{...P}, display:{...D}, edits:editsToArr(),
  view:{mode:view.mode, yaw:view.yaw, pitch:view.pitch, fov:view.fov, mcx:view.mcx, mcy:view.mcy, mz:view.mz, hour:view.hour, date:view.date||'', gday:view.gday||0, year:view.year||1} })); }
$('updBtn').onclick=async()=>{ if(!currentEntry) return; Object.assign(currentEntry, snapshot());
  try{ await Store.save(currentEntry); toast('« '+currentEntry.name+' » mis à jour'); refreshList(); }catch(e){ toast("La mise à jour n'a pas pu être enregistrée"); } };
function openSaved(it){
  P = {...GEN_DEF, ...(it.params||{})}; D = {...DISP_DEF, ...(it.display||{})};
  view.hour = 22; view.date = ''; view.gday=0; view.year=1; if(it.view) Object.assign(view, it.view); if(view.hour>24) view.hour-=24;
  E = editsFromArr(it.edits); currentEntry = JSON.parse(JSON.stringify(it)); playing=false; updatePlay();
  currentName = it.name || null;
  syncUI(); regen(); setMode(view.mode); updateModeUI(); syncTime(); closeSheets(); toast('« '+(it.name||'Ciel')+' » ouvert');
}

/* ---------- export en image ---------- */
function renderMapImage(){
  const scale=3, LW=1600, LH=960;
  const ex=document.createElement('canvas'); ex.width=LW*scale; ex.height=LH*scale;
  const saved={ctx, W, H, v:{...view}, sel, selC, tw:D.twinkle};
  ctx=ex.getContext('2d'); ctx.setTransform(scale,0,0,scale,0,0); W=LW; H=LH;
  Object.assign(view,{mode:'map', mcx:0, mcy:0, mz:1}); sel=-1; selC=-1; D.twinkle=false; exporting=true;
  try{
    draw(0);
    ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1; ctx.filter='none';
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.fillStyle='#efe9d6'; ctx.font=`italic 500 38px ${SERIF}`; ctx.fillText(currentName||sky.name, 48, 58);
    const hh=Math.floor(view.hour)%24, mm=Math.floor((view.hour%1)*60+1e-6);
    ctx.fillStyle='#b9bdd3'; ctx.font='14px Figtree, system-ui, sans-serif';
    ctx.fillText(sky.earth ? `Ciel entier vu depuis ${D.eplace||earthPlaceName(obsLat(),obsLon())}, le ${new Date((view.date||todayStr())+'T12:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})} à ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}` : `Carte du ciel entier à ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}, ${sky.consts.length} constellations, graine « ${P.seed} »`, 50, 84);
  } finally {
    ctx=saved.ctx; W=saved.W; H=saved.H; Object.assign(view, saved.v); sel=saved.sel; selC=saved.selC; D.twinkle=saved.tw; exporting=false; dirty=true;
  }
  return ex;
}
function renderViewImage(){
  draw(performance.now()/1000);
  const ex=document.createElement('canvas'); ex.width=cv.width; ex.height=cv.height;
  const c2=ex.getContext('2d'); c2.drawImage(cv,0,0);
  c2.setTransform(DPR,0,0,DPR,0,0); c2.fillStyle='rgba(239,233,214,.9)'; c2.font=`italic 500 26px ${SERIF}`; c2.textBaseline='alphabetic';
  c2.fillText(currentName||sky.name, 22, H-22);
  return ex;
}
async function exportImage(kind){
  toast('Préparation de l’image…');
  await (document.fonts ? document.fonts.ready : Promise.resolve());
  const canvas = kind==='map' ? renderMapImage() : renderViewImage();
  const blob = await new Promise(r=>canvas.toBlob(r,'image/png'));
  if(!blob){ toast("L'image n'a pas pu être créée"); return; }
  const base = (currentName||sky.name).replace(/[\\/:*?"<>|]/g,'').trim() || 'ciel';
  const filename = base + (kind==='map' ? ' - carte.png' : ' - vue.png');
  let dl=null;
  try{ if(window.claude && typeof window.claude.use==='function') dl = await window.claude.use('downloads'); }catch(e){}
  if(dl){
    try{ await dl.save({filename, data:blob}); toast('Image enregistrée'); return; }
    catch(e){ if(e && (e.code==='declined')) return; if(e && e.code==='rate_limited'){ toast('Une fenêtre d’enregistrement est déjà ouverte'); return; } }
  }
  localSave(blob, filename);
}
$('exMap').onclick=()=>exportImage('map');
$('exView').onclick=()=>{ closeSheets(); setTimeout(()=>exportImage('view'),320); };
$('imgClose').onclick=()=>{ $('imgView').hidden=true; };

/* ---------- bascule vrai ciel / ciels imaginaires ---------- */
function updateModeUI(){
  const e=P.mode==='earth';
  $('modeChip').textContent = e ? 'Revenir aux ciels imaginaires' : 'Voir le vrai ciel de la Terre';
  document.body.classList.toggle('earth-mode', e);
  $('exPdf').hidden=e; updateChips();
  $('btnNew').hidden=e; $('genBlock').hidden=e; $('tDate').hidden=!e; $('tNow').hidden=!e;
}
function switchMode(m){
  P.mode=m; currentEntry=null; currentName=null; playing=false; updatePlay();
  if(m==='earth'){ const n=new Date(); view.date=todayStr(); view.hour=n.getHours()+n.getMinutes()/60; if(D.elat===undefined){ D.elat=48.857; D.elon=2.352; D.eplace='Paris'; } }
  else { view.hour=22; view.gday=0; view.year=1; }
  syncUI(); regen(); setMode('pov'); updateModeUI(); syncTime(); closeSheets();
  toast(m==='earth' ? 'Vrai ciel de la Terre, à la date et à l’heure actuelles' : 'Retour aux ciels imaginaires');
}
$('modeChip').onclick=()=>switchMode(P.mode==='earth'?'gen':'earth');

/* ---------- export et import des sauvegardes ---------- */
async function exportSaves(list, name){
  await Store.ready;
  let items=list; if(!items){ try{ items=await Store.list(); }catch(e){ toast('Impossible de lire tes ciels'); return; } }
  if(!items.length){ toast('Aucun ciel à exporter'); return; }
  const data={format:'atlas-des-ciels', version:1, exportedAt:new Date().toISOString(), skies:items.map(it=>JSON.parse(JSON.stringify(it)))};
  const json=JSON.stringify(data,null,1), d=new Date();
  const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const filename=(name ? name.replace(/[\\/:*?"<>|]/g,'').trim() : 'mes-ciels')+' - '+stamp+'.json';
  let dl=null; try{ if(window.claude && typeof window.claude.use==='function') dl=await window.claude.use('downloads'); }catch(e){}
  if(dl){ try{ await dl.save({filename, data:new Blob([json],{type:'application/json'})}); toast(items.length>1?items.length+' ciels exportés':'Ciel exporté'); return; }catch(e){ if(e && e.code==='declined') return; } }
  localSave(new Blob([json],{type:'application/json'}), filename);
}
$('exSaves').onclick=()=>exportSaves(null);
$('jsonClose').onclick=()=>{ $('jsonView').hidden=true; };
$('jsonCopy').onclick=async()=>{ try{ await navigator.clipboard.writeText($('jsonOut').value); toast('Copié'); }catch(e){ $('jsonOut').select(); toast('Sélectionne le texte et copie-le'); } };
$('imSaves').onclick=()=>$('imFile').click();
$('imFile').addEventListener('change', async e=>{
  const f=e.target.files && e.target.files[0]; e.target.value=''; if(!f) return;
  let data; try{ data=JSON.parse(await f.text()); }catch(err){ toast('Ce fichier n’est pas un export de ciels valide'); return; }
  const skies = Array.isArray(data) ? data : Array.isArray(data.skies) ? data.skies : (data && data.params ? [data] : null);
  if(!skies){ toast('Ce fichier ne contient aucun ciel'); return; }
  await Store.ready; let n=0, last=null;
  for(const it of skies){ if(!it || typeof it!=='object' || !it.params || typeof it.params!=='object') continue;
    const entry=JSON.parse(JSON.stringify({name:String(it.name||'Ciel importé').slice(0,60), createdAt:it.createdAt||new Date().toISOString(), params:it.params, display:it.display||{}, view:it.view||{}, edits:Array.isArray(it.edits)?it.edits:[]}));
    entry.id='c'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36)+n;
    try{ await Store.save(entry); n++; last=entry; }catch(err){} }
  // un seul ciel (par exemple le fichier SAVE d'un export complet) : on l'ouvre tout de suite
  if(n===1 && skies.length===1 && last){ refreshList(); openSaved(last); return; }
  toast(n ? (n>1?n+' ciels importés':'1 ciel importé') : 'Aucun ciel n’a pu être importé'); refreshList();
});

/* ---------- animation d'arrivée sur une planète ---------- */
let landAnim=null;
const landCv=$('landFx'), landCtx=landCv.getContext('2d');
const ATMO={terra:'150,195,255', rock:'205,200,195', lava:'255,130,70', gas:'232,212,170'};
function atmoCol(p){ if(p.type==='mars'||p.type==='desert') return '232,168,120'; if(p.type==='uranus'||p.type==='glacegeante'||p.type==='neptune') return '150,205,235'; if(p.type==='glace') return '215,235,248'; if(p.type==='venus') return '240,220,160'; return ATMO[PTYPES[p.type].kind]||'200,210,230'; }
function startLandAnim(p){
  if(reduceMotion) return;
  const r=mulberry32(hashStr(p.name)), st=[]; for(let i=0;i<260;i++) st.push([r(),r(),.3+r()*.7]);
  landAnim={p, t0:performance.now(), dur:3400, stars:st, light:Math.PI*1.15, col:atmoCol(p)}; landCv.hidden=false;
}
function drawLandFx(now){
  const a=landAnim, t=(now-a.t0)/a.dur;
  const dpr=Math.min(2,devicePixelRatio||1), w=innerWidth, h=innerHeight;
  if(landCv.width!==Math.round(w*dpr)||landCv.height!==Math.round(h*dpr)){ landCv.width=Math.round(w*dpr); landCv.height=Math.round(h*dpr); }
  const g=landCtx; g.setTransform(dpr,0,0,dpr,0,0);
  if(t>=1){ landAnim=null; landCv.hidden=true; g.clearRect(0,0,w,h); dirty=true; return; }
  const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2, sm=x=>{ x=clamp(x,0,1); return x*x*(3-2*x); };
  const fadeOut=sm((t-.74)/.26);
  g.clearRect(0,0,w,h); g.globalAlpha=1-fadeOut;
  g.fillStyle='#02040b'; g.fillRect(0,0,w,h);
  const approach=clamp(t/.58,0,1), zoom=Math.pow(ease(approach),1.6);
  const R=Math.max(w,h)*(.05+zoom*2.4), cx=w/2, cy=h/2+R*.55*zoom;
  const drift=1+zoom*3;
  for(const [x,y,b] of a.stars){ const X=cx+(x*w-cx)*drift, Y=h/2+(y*h-h/2)*drift; if(X<0||X>w||Y<0||Y>h) continue; g.fillStyle=`rgba(225,230,245,${b*(1-zoom)})`; g.fillRect(X,Y,1.4,1.4); }
  const ag=g.createRadialGradient(cx,cy,R*.96,cx,cy,R*1.18); ag.addColorStop(0,`rgba(${a.col},.55)`); ag.addColorStop(1,`rgba(${a.col},0)`); g.fillStyle=ag; g.beginPath(); g.arc(cx,cy,R*1.18,0,TAU); g.fill();
  const p=a.p;
  if(p.rings && R<Math.max(w,h)*1.2) drawRingHalf(cx,cy,R,p.rings,false,g,70*deg);
  drawPlanet(cx,cy,R,p,a.light,g);
  if(p.rings && R<Math.max(w,h)*1.2) drawRingHalf(cx,cy,R,p.rings,true,g,70*deg);
  const entry=sm((t-.42)/.3);
  if(entry>0){ g.fillStyle=`rgba(${a.col},${entry*.92})`; g.fillRect(0,0,w,h);
    g.strokeStyle=`rgba(255,255,255,${.35*Math.sin(Math.PI*clamp((t-.42)/.4,0,1))})`; g.lineWidth=1.5;
    const rr=mulberry32(Math.floor(now/60)); for(let i=0;i<40;i++){ const ang=rr()*TAU, r1=Math.min(w,h)*(.15+rr()*.5), len=40+rr()*120; g.beginPath(); g.moveTo(w/2+Math.cos(ang)*r1,h/2+Math.sin(ang)*r1); g.lineTo(w/2+Math.cos(ang)*(r1+len),h/2+Math.sin(ang)*(r1+len)); g.stroke(); } }
  g.globalAlpha=(1-fadeOut)*sm(1-Math.abs(t-.3)/.3);
  g.fillStyle='#f4ead0'; g.textAlign='center'; g.font=`italic 500 ${Math.round(clamp(w*.045,22,40))}px ${SERIF}`; g.fillText('Approche de '+p.name, w/2, h*.18);
  g.globalAlpha=1;
}

/* ---------- enregistrement local ---------- */
function localSave(blob, filename){
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=filename; document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000); toast('Fichier enregistré : '+filename);
}
