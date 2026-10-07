/* Atlas des ciels imaginaires — Export complet
   Crée un sous-dossier dans le dossier « exports » avec :
     - le carnet de campagne (PDF),
     - toutes les cartes (ciel, monde, pays) et les plans de ville en JPG,
     - une image JPG par constellation,
     - le ciel au format de sauvegarde (.json) et un sommaire (contenu.txt).
   Chrome et Edge écrivent directement dans le dossier choisi (API File System Access).
   Les autres navigateurs reçoivent une archive .zip à décompresser dans « exports ».
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";

const XP_JPG_QUALITY = 0.92;
const XP = { running:false, cancel:false };
const xpSafe = s => String(s||'').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'').replace(/\s+/g,' ').replace(/[. ]+$/,'').trim().slice(0,90) || 'sans nom';
const xpPad = (n, w=2) => String(n).padStart(w,'0');
const xpTick = () => new Promise(r=>setTimeout(r,20));

/* ---------- images ---------- */
// JPG n'a pas de transparence : on aplatit l'image sur un fond avant l'encodage.
function xpJpg(can, bg='#03060f'){
  const flat=document.createElement('canvas'); flat.width=can.width; flat.height=can.height;
  const g=flat.getContext('2d'); g.fillStyle=bg; g.fillRect(0,0,flat.width,flat.height); g.drawImage(can,0,0);
  return new Promise((res,rej)=>flat.toBlob(b=>{ flat.width=flat.height=0; b?res(b):rej(new Error('L’image n’a pas pu être encodée')); },'image/jpeg',XP_JPG_QUALITY));
}
function xpWrap(g, text, maxW){
  const words=String(text||'').split(/\s+/), lines=[]; let cur='';
  for(const w of words){ const t=cur?cur+' '+w:w; if(g.measureText(t).width>maxW && cur){ lines.push(cur); cur=w; } else cur=t; }
  if(cur) lines.push(cur); return lines;
}
// Constellation vue de près, avec le vrai moteur de rendu du ciel (voie lactée, nébuleuses, couleurs des étoiles).
function renderConstImage(ci){
  const c=sky.consts[ci], LW=1500, LH=1000, scale=2;
  let ctr=[0,0,0]; for(const j of c.members){ const d=sky.stars[j].d; if(d){ ctr[0]+=d[0]; ctr[1]+=d[1]; ctr[2]+=d[2]; } }
  ctr = Math.hypot(...ctr)>1e-9 ? norm(ctr) : (c.d || dirOf(c.lon||0, c.lat||0));
  let th=3*deg; for(const j of c.members){ const d=sky.stars[j].d; if(d) th=Math.max(th, Math.acos(clamp(dot(d,ctr),-1,1))); }
  const fov=clamp(4*Math.atan(Math.tan(th/2)/0.62), 14*deg, 170*deg);
  const ex=document.createElement('canvas'); ex.width=LW*scale; ex.height=LH*scale;
  const hidden=sky.stars.filter(s=>!s.hidden && s.kind!=='star' && s.kind!=='galaxy');
  const saved={ctx, W, H, v:{...view}, sel, selC, D:{...D}, day:sky.day, day2:sky.day2, rings:sky.ringCurves, met:meteors};
  ctx=ex.getContext('2d'); ctx.setTransform(scale,0,0,scale,0,0); W=LW; H=LH;
  Object.assign(view,{mode:'pov', yaw:lonOf(ctr), pitch:latOf(ctr), fov});
  Object.assign(D,{horizon:false, grid:false, weather:false, twinkle:false, aurora:false, cnames:false, lines:true});
  sel=-1; selC=ci; sky.day=0; sky.day2=0; sky.ringCurves=null; meteors=[]; exporting=true;
  for(const s of hidden) s.hidden=true;
  try{
    draw(0);
    const g=ctx; g.globalCompositeOperation='source-over'; g.globalAlpha=1; if('filter' in g) g.filter='none';
    // vignette et bandeau de texte
    const vg=g.createRadialGradient(LW/2,LH/2,LH*.45,LW/2,LH/2,LW*.75); vg.addColorStop(0,'rgba(2,4,11,0)'); vg.addColorStop(1,'rgba(2,4,11,.55)'); g.fillStyle=vg; g.fillRect(0,0,LW,LH);
    const band=g.createLinearGradient(0,LH-260,0,LH); band.addColorStop(0,'rgba(3,6,15,0)'); band.addColorStop(.45,'rgba(3,6,15,.78)'); band.addColorStop(1,'rgba(3,6,15,.92)'); g.fillStyle=band; g.fillRect(0,LH-260,LW,260);
    g.textAlign='left'; g.textBaseline='alphabetic';
    const name=constDisplayName(ci), fig=c.fig ? cap(c.fig) : (c.la||'');
    g.fillStyle='#f4ead0'; g.font=`italic 600 54px ${SERIF}`; g.fillText(name, 56, LH-150);
    g.fillStyle='#d8b56a'; g.font=`italic 500 27px ${SERIF}`; g.fillText(fig + (c.meaning && !sky.earth ? ' — « '+c.meaning+' »' : ''), 58, LH-108);
    g.fillStyle='#cfd3e4'; g.font='17px Figtree, system-ui, sans-serif';
    const lines=xpWrap(g, constText(c), LW-120); const shown=lines.slice(0,3); if(lines.length>3) shown[2]=shown[2].replace(/[ ,;.]*$/,'')+'…';
    shown.forEach((l,i)=>g.fillText(l, 58, LH-70+i*24));
    g.textAlign='right'; g.fillStyle='rgba(216,181,106,.85)'; g.font=`italic 500 22px ${SERIF}`;
    g.fillText(sky.earth ? 'Ciel de la Terre' : (currentName||sky.name)+(world && world.name ? ' — '+world.name : ''), LW-40, 48);
    g.strokeStyle='rgba(216,181,106,.55)'; g.lineWidth=1.5; g.strokeRect(14,14,LW-28,LH-28);
  } finally {
    for(const s of hidden) s.hidden=false;
    ctx=saved.ctx; W=saved.W; H=saved.H; Object.assign(view, saved.v); sel=saved.sel; selC=saved.selC;
    for(const k of Object.keys(D)) if(!(k in saved.D)) delete D[k]; Object.assign(D, saved.D);
    sky.day=saved.day; sky.day2=saved.day2; sky.ringCurves=saved.rings; meteors=saved.met; exporting=false; dirty=true;
  }
  return ex;
}

/* ---------- destinations : dossier (Chrome, Edge) ou archive zip ---------- */
const XP_IDB = { db:null,
  open(){ if(this.db) return Promise.resolve(this.db); return new Promise((res,rej)=>{ const rq=indexedDB.open('atlas-ciels-export',1); rq.onupgradeneeded=()=>rq.result.createObjectStore('h'); rq.onsuccess=()=>{ this.db=rq.result; res(this.db); }; rq.onerror=()=>rej(rq.error); }); },
  async get(k){ try{ const db=await this.open(); return await new Promise(res=>{ const rq=db.transaction('h').objectStore('h').get(k); rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>res(null); }); }catch(e){ return null; } },
  async set(k,v){ try{ const db=await this.open(); await new Promise(res=>{ const tx=db.transaction('h','readwrite'); tx.objectStore('h').put(v,k); tx.oncomplete=res; tx.onerror=res; }); }catch(e){} }
};
const xpCanUseFolders = () => typeof window.showDirectoryPicker==='function';
// Si on choisit le dossier de l'Atlas lui-même, on descend automatiquement dans « exports ».
async function xpResolveExports(h){
  try{ if(h.name!=='exports'){ await h.getFileHandle('index.html'); return await h.getDirectoryHandle('exports',{create:true}); } }catch(e){}
  return h;
}
async function xpPickFolder(force){
  let h = force ? null : await XP_IDB.get('exports');
  if(h){ try{ let p=await h.queryPermission({mode:'readwrite'}); if(p!=='granted') p=await h.requestPermission({mode:'readwrite'}); if(p==='granted') return h; }catch(e){} }
  h = await window.showDirectoryPicker({id:'atlas-exports', mode:'readwrite', startIn:'documents'});
  h = await xpResolveExports(h);
  await XP_IDB.set('exports', h); xpShowDest(h); return h;
}
async function xpUniqueDir(parent, base){
  for(let i=1;i<100;i++){ const name = i===1 ? base : `${base} (${i})`;
    try{ await parent.getDirectoryHandle(name); }catch(e){ return parent.getDirectoryHandle(name,{create:true}); } }
  return parent.getDirectoryHandle(base+' '+Date.now(),{create:true});
}
function xpFolderTarget(dir){
  const cache=new Map();
  const sub=async parts=>{ let d=dir, key=''; for(const p of parts){ key+='/'+p; if(!cache.has(key)) cache.set(key, await d.getDirectoryHandle(p,{create:true})); d=cache.get(key); } return d; };
  return { kind:'folder', name:dir.name,
    async write(path, blob){ const parts=path.split('/'), file=parts.pop(), d=await sub(parts); const fh=await d.getFileHandle(file,{create:true}); const w=await fh.createWritable(); await w.write(blob); await w.close(); },
    async finish(){} };
}
// Archive zip sans compression (les JPG et le PDF sont déjà compressés).
const XP_CRC = (()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
function xpCrc32(u8){ let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=XP_CRC[(c^u8[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function xpZipTarget(rootName){
  const enc=new TextEncoder(), parts=[], central=[]; let offset=0, count=0;
  const d=new Date(), dosT=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1), dosD=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  return { kind:'zip', name:rootName+'.zip',
    async write(path, blob){
      const data=new Uint8Array(await blob.arrayBuffer()), name=enc.encode(rootName+'/'+path), crc=xpCrc32(data);
      const h=new DataView(new ArrayBuffer(30));
      h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true); h.setUint16(10,dosT,true); h.setUint16(12,dosD,true);
      h.setUint32(14,crc,true); h.setUint32(18,data.length,true); h.setUint32(22,data.length,true); h.setUint16(26,name.length,true); h.setUint16(28,0,true);
      parts.push(h.buffer, name, data);
      const c=new DataView(new ArrayBuffer(46));
      c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true); c.setUint16(12,dosT,true); c.setUint16(14,dosD,true);
      c.setUint32(16,crc,true); c.setUint32(20,data.length,true); c.setUint32(24,data.length,true); c.setUint16(28,name.length,true); c.setUint32(42,offset,true);
      central.push(c.buffer, name); offset += 30+name.length+data.length; count++;
    },
    async finish(){
      const size=central.reduce((s,b)=>s+(b.byteLength!==undefined?b.byteLength:b.length),0), e=new DataView(new ArrayBuffer(22));
      e.setUint32(0,0x06054b50,true); e.setUint16(8,count,true); e.setUint16(10,count,true); e.setUint32(12,size,true); e.setUint32(16,offset,true);
      localSave(new Blob([...parts, ...central, e.buffer],{type:'application/zip'}), this.name);
    } };
}

/* ---------- liste de tout ce qu'il faut exporter ---------- */
function xpPlan(withVillages){
  const T=[], earth=!!sky.earth, title=currentName||sky.name;
  if(!earth) T.push({label:'Carnet de campagne (PDF)', big:true, run:async(out,step)=>{
    const r=await buildCarnet({blobOnly:true, player:$('xpPlayer').checked, onStep:t=>step('Carnet de campagne : '+t.replace(/…$/,'').toLowerCase())});
    if(r) await out.write('Carnet de campagne - '+xpSafe(title)+'.pdf', r.blob); }});
  T.push({label:'Carte complète du ciel', run:async out=>{ await (document.fonts ? document.fonts.ready : null); await out.write('cartes/01 - Carte du ciel.jpg', await xpJpg(renderMapImage())); }});
  if(!earth && world && world.peoples){
    T.push({label:'Carte du monde', run:async out=>{ await out.write('cartes/02 - '+xpSafe(world.name)+' - peuples.jpg', await xpJpg(renderWorldImage(2.2))); }});
    if(world.peopleImg) T.push({label:'Carte du relief', run:async out=>{ const keep=world.peopleImg; world.peopleImg=null; let can; try{ can=renderWorldImage(2.2); } finally { world.peopleImg=keep; } await out.write('cartes/03 - '+xpSafe(world.name)+' - relief.jpg', await xpJpg(can)); }});
    world.peoples.list.forEach((p,k)=>{
      const pname=xpSafe(cap(p.name)), pdir=`cartes/Pays ${xpPad(k+1)} - ${pname}/`;
      T.push({label:'Carte du pays '+p.name.replace(/^les /,'des '), run:async out=>{ const M=makeCountryMap(k); await out.write(`${pdir}Carte - ${xpSafe(M.title||pname)}.jpg`, await xpJpg(renderCountryImage(M,2,2),'#efe3c4')); }});
      p.cities.forEach((ct,ci)=>T.push({label:'Plan de '+ct.name, run:async out=>{ const pl=makeCityPlan(ct,k);
        await out.write(`${pdir}villes/${xpPad(ci+1)} - ${xpSafe(ct.name)}${ct.kind==='capital'?' (capitale)':''}.jpg`, await xpJpg(renderCityExport(pl,2000,1.5),'#efe3c4')); pl.imgHi=null; }}));
      if(withVillages) T.push({label:'Plans des villages '+p.name.replace(/^les /,'des '), run:async (out,step)=>{ const M=makeCountryMap(k);
        for(const [vi,v] of M.villages.entries()){ if(XP.cancel) return; step('Plan du village '+v.name); await xpTick();
          const [lon,lat]=M.toLL(v.x,v.y), pl=makeCityPlan({name:v.name, lon, lat, kind:'village', desc:v.desc}, k);
          await out.write(`${pdir}villages/${xpPad(vi+1)} - ${xpSafe(v.name)}.jpg`, await xpJpg(renderCityExport(pl,1600,1.5),'#efe3c4')); pl.imgHi=null; } }});
    });
  }
  // système stellaire : vue inclinée, vue de dessus, chaque planète avec ses lunes, et la fiche complète
  { let SYS=null; try{ SYS=mainSystem(); }catch(e){ console.error('Système stellaire :', e); }
    if(SYS){ const sn=SYS.star.name, dir='systeme stellaire/', sub=`${cap(SYS.star.phys.kind)} · ${SYS.planets.length} planète${SYS.planets.length>1?'s':''}`;
      T.push({label:'Système de '+sn, run:async out=>{
        await out.write(dir+'01 - Système de '+xpSafe(sn)+' (vue inclinée).jpg', await xpJpg(renderSystemView(SYS,{tilt:62*deg, w:1200, h:675, scale:8/3, title:sn, sub})));
        await out.write(dir+'02 - Système de '+xpSafe(sn)+' (vue de dessus).jpg', await xpJpg(renderSystemView(SYS,{tilt:0, w:1000, h:1000, scale:3, title:sn, sub:'Vue de dessus'})));
        await out.write(dir+'fiche du système.txt', new Blob(['﻿'+systemSheetText(SYS)],{type:'text/plain;charset=utf-8'})); }});
      SYS.planets.forEach((p,k)=>T.push({label:'Planète '+p.name, run:async out=>{
        const sub2=kindLabel(p)+(p.isHome?' · votre monde':'')+(p.moons&&p.moons.length?` · ${p.moons.length} lune${p.moons.length>1?'s':''}`:'');
        await out.write(`${dir}planetes/${xpPad(k+1)} - ${xpSafe(p.name)}.jpg`, await xpJpg(renderBodyView(p,{w:1200, h:750, scale:8/3, title:p.name, sub:sub2, footer:factsLine(p)}))); }}));
    } }
  // quêtes : un dossier MJ (tout) et un dossier joueurs (sans secrets)
  if(!earth && makeQuests()){ const Q=makeQuests(), QD={MJ:'quetes/MJ/', J:'quetes/joueurs/'}, all=[Q.main, ...Q.secondary];
    for(const mj of [true,false]){ const d=mj?QD.MJ:QD.J, tag=mj?'MJ':'joueurs';
      T.push({label:`Livret des quêtes (${tag})`, run:async (out,step)=>{ const r=await buildCarnet({blobOnly:true, questsOnly:true, player:!mj, onStep:t=>step(`Livret des quêtes (${tag}) : `+t.replace(/…$/,'').toLowerCase())});
        if(r) await out.write(`${d}Livret des quêtes (${tag}).pdf`, r.blob);
        await out.write(`${d}quêtes (${tag}).txt`, new Blob(['\ufeff'+questsText(Q,mj)],{type:'text/plain;charset=utf-8'})); }});
      T.push({label:`Cartes des quêtes (${tag})`, run:async (out,step)=>{ for(const [i,q] of all.entries()){ if(XP.cancel) return; step('Carte : '+q.title); await xpTick();
          await out.write(`${d}cartes/${xpPad(i+1)} - ${i?'Secondaire':'Principale'} - ${xpSafe(q.title)}.jpg`, await xpJpg(renderQuestMap(q,mj),'#efe3c4')); }
        await out.write(`${d}cartes/${xpPad(all.length+1)} - Quêtes annexes.jpg`, await xpJpg(renderSideQuestsMap(Q))); }});
      T.push({label:`Cartes des personnages (${tag})`, run:async (out,step)=>{ for(const [i,n] of Q.npcs.entries()){ if(XP.cancel) return; if(!mj && n===Q.main.antagonist) continue; step('Personnage : '+n.name); if(i%4===0) await xpTick();
          await out.write(`${d}personnages/${xpPad(i+1)} - ${xpSafe(n.name)}.jpg`, await xpJpg(renderNpcCard(n,mj),'#efe3c4')); } }});
      T.push({label:`Cartes des objets (${tag})`, run:async (out,step)=>{ for(const [i,it] of Q.items.entries()){ if(XP.cancel) return; step('Objet : '+it.name); if(i%4===0) await xpTick();
          await out.write(`${d}objets/${xpPad(i+1)} - ${xpSafe(it.name)}.jpg`, await xpJpg(renderItemCard(it,mj),'#efe3c4')); } }});
    } }
  sky.consts.forEach((c,ci)=>T.push({label:'Constellation '+constDisplayName(ci), run:async out=>{ await out.write(`constellations/${xpPad(ci+1)} - ${xpSafe(constDisplayName(ci))}.jpg`, await xpJpg(renderConstImage(ci))); }}));
  T.push({label:'Fichier SAVE (graine et paramètres) et sommaire', run:async (out,step,done)=>{
    const entry={id:'c'+Date.now().toString(36), name:title, createdAt:new Date().toISOString(), ...snapshot()};
    const data={format:'atlas-des-ciels', version:1, exportedAt:new Date().toISOString(), skies:[entry]};
    await out.write('SAVE - '+xpSafe(title)+'.json', new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));
    const lines=[`Atlas des ciels imaginaires — export complet`, `Ciel : ${title}`, earth?'Vrai ciel de la Terre':`Monde : ${world.name}`, `Graine : ${P.seed}`, `Exporté le ${new Date().toLocaleString('fr-FR')}`, '',
      'Contenu :', ...done.map(f=>'  '+f), '', 'Pour retrouver exactement cet univers (même graine, mêmes paramètres du ciel et du monde, noms et légendes modifiés, lieu d’observation) :', '  Mes ciels → Importer un fichier → choisis « SAVE - '+xpSafe(title)+'.json ». Le ciel s’ouvre directement.'];
    await out.write('contenu.txt', new Blob(['﻿'+lines.join('\r\n')],{type:'text/plain;charset=utf-8'}));
  }});
  return T;
}

/* ---------- déroulement ---------- */
function xpUI(state){
  const v=$('xpView'); v.hidden=false;
  $('xpStep').textContent=state.step||''; $('xpCount').textContent=state.count||'';
  $('xpFill').style.width=Math.round((state.pct||0)*100)+'%';
  $('xpCancel').hidden=!!state.done; $('xpOk').hidden=!state.done; $('xpOpenHint').hidden=!state.hint; $('xpOpenHint').textContent=state.hint||'';
}
async function exportAll(forcePick){
  if(XP.running) return;
  const withVillages=$('xpVillages').checked, title=currentName||sky.name;
  const d=new Date(), stamp=`${d.getFullYear()}-${xpPad(d.getMonth()+1)}-${xpPad(d.getDate())} ${xpPad(d.getHours())}h${xpPad(d.getMinutes())}`;
  const base=xpSafe((sky.earth?'Ciel de la Terre':(world&&world.name?world.name+' - ':'')+title)+' - '+stamp);
  let out;
  if(xpCanUseFolders()){
    let root; try{ root=await xpPickFolder(forcePick); }catch(e){ if(e && e.name==='AbortError') return; toast('Le dossier n’a pas pu être ouvert'); return; }
    try{ out=xpFolderTarget(await xpUniqueDir(root, base)); out.parent=root.name; }catch(e){ toast('Impossible de créer le dossier d’export'); return; }
  } else out=xpZipTarget(base);
  XP.running=true; XP.cancel=false; closeSheets();
  const tasks=xpPlan(withVillages), done=[], errors=[];
  const wrap=out.write.bind(out); out.write=async(path,blob)=>{ await wrap(path,blob); done.push(path); };
  try{
    for(const [i,t] of tasks.entries()){
      if(XP.cancel) break;
      const step=s=>xpUI({step:s, pct:i/tasks.length, count:`Étape ${i+1} sur ${tasks.length} · ${done.length} fichier${done.length>1?'s':''} créé${done.length>1?'s':''}`});
      step(t.label+'…'); await xpTick();
      try{ await t.run(out, step, done); }catch(e){ console.error('Export complet :', t.label, e); errors.push(t.label); }
    }
    if(!XP.cancel) await out.finish();
  } finally { XP.running=false; dirty=true; }
  const where = (out.kind==='folder' ? `Dossier « ${out.parent} / ${out.name} ».` : `Archive « ${out.name} » téléchargée : décompresse-la dans le dossier « exports » de l’Atlas.`)
    + (done.some(f=>f.startsWith('SAVE - ')) ? ' Le fichier « SAVE » permet de rouvrir cet univers : Mes ciels → Importer un fichier.' : '');
  xpUI({done:true, pct:1, step: XP.cancel ? 'Export interrompu.' : errors.length ? 'Export terminé, avec quelques manques.' : 'Export terminé.',
    count:`${done.length} fichier${done.length>1?'s':''} créé${done.length>1?'s':''}`+(errors.length?` · non exporté : ${errors.join(', ')}`:''), hint: XP.cancel && out.kind==='zip' ? '' : where});
}
function xpShowDest(h){ const p=$('exAllDest'); if(!p) return;
  if(!xpCanUseFolders()){ p.textContent='Ce navigateur ne peut pas écrire dans un dossier : tu recevras une archive .zip à décompresser dans « exports ». Avec Chrome ou Edge, le dossier est créé directement.'; $('exAllDir').hidden=true; return; }
  p.textContent = h ? `Dossier d’export : « ${h.name} ». Un sous-dossier est créé à chaque export.` : 'Au premier export, choisis le dossier « exports » de l’Atlas (ou le dossier de l’Atlas lui-même).'; }
$('exAll').onclick=()=>exportAll(false);
$('exAllDir').onclick=()=>exportAll(true);
$('xpCancel').onclick=()=>{ XP.cancel=true; $('xpStep').textContent='Arrêt après l’étape en cours…'; };
$('xpOk').onclick=()=>{ $('xpView').hidden=true; };
XP_IDB.get('exports').then(h=>xpShowDest(xpCanUseFolders()?h:null));
