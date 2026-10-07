/* Atlas des ciels imaginaires — Visualiseur de systèmes stellaires
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ================= visualiseur de systèmes ================= */
const objCache = new Map();
function cached(key, fn){ if(!objCache.has(key)) objCache.set(key, fn()); return objCache.get(key); }

function planetMass(p){ return p.radius>3 ? 15+(p.radius-3)*30 : Math.pow(p.radius,3); }
function makeMoons(r, p, st){
  const giant = p.radius>3;
  const nm = giant ? 2+Math.floor(r()*7) : (r()<.45?0:1+Math.floor(r()*2));
  const moons=[]; let d = giant ? 3+r()*2 : 8+r()*6;
  const mE = planetMass(p);
  const mtypes = Object.keys(MOON_T);
  for(let k=0;k<nm;k++){
    const mt = p.type==='lave'||p.type==='brulee' ? pick(r,['rocheuse','cratérisée']) : pick(r, mtypes);
    const rad = giant ? 150+Math.pow(r(),2)*2400 : 80+Math.pow(r(),2)*1600;
    const Rkm = d*p.radius*6371, GM = 398600*mE;
    const days = TAU*Math.sqrt(Math.pow(Rkm,3)/GM)/86400;
    const name = (giant && k<3 && r()<.7) || r()<.3 ? starName(r,st,true) : p.name+' '+ROMAN[k];
    moons.push({id:uid(), kind:'moon', name, mtype:mt, radiusKm:rad, dist:d, period:days, angle0:r()*TAU, col:MOON_T[mt], parent:p.name});
    d *= 1.3+r()*.6;
  }
  return moons;
}
function makePlanet(r, st, type, name, a, T, periodDays, alias){
  const giant = PTYPES[type].kind==='gas';
  const radius = giant ? (type==='glacegeante' ? 3.2+r()*1.8 : 6+r()*6) : .35+r()*1.5;
  const p = {id:uid(), kind:'planet', name, alias, type, a, T, period:periodDays, radius, seedN:(r()*1e9)>>>0, angle0:r()*TAU, habitable: !giant && T>245 && T<330 && (type==='tempere'||type==='ocean')};
  p.rings = ((giant && r()<(type==='gazeuse'?.5:.35)) || (!giant && r()<.04)) ? {inner:1.35+r()*.2, outer:1.9+r()*.7, col:pick(r,['220,200,165','190,180,170','200,215,230','210,190,210'])} : null;
  p.moons = makeMoons(r, p, st);
  return p;
}
function planetText(p, starName){
  const parts=[];
  parts.push(PT_TEXT[p.type]);
  if(p.T) parts.push(`Il y fait en moyenne ${fr(Math.round(p.T-273),0)} °C.`);
  if(p.habitable) parts.push(`Elle se trouve dans la zone habitable ${starName?'de '+starName:'de son étoile'} : l’eau pourrait y rester liquide.`);
  if(p.moons.length) parts.push(p.moons.length===1 ? `Une lune l’accompagne, ${p.moons[0].name}.` : `${p.moons.length} lunes tournent autour d’elle, dont ${p.moons[0].name} et ${p.moons[1].name}.`);
  if(p.rings) parts.push('Un système d’anneaux fins l’entoure.');
  return parts.join(' ');
}
function homePlanet(s){
  if(s.body) return s.body;
  if(s.real) return realBody(s.pid);
  return cached('hp|'+s.i, ()=>{
    const r = rngFor(s.pkey), st = sky.st;
    const T = {lave:1100,brulee:600,desert:300,tempere:288,ocean:285,glace:150,gazeuse:130,glacegeante:70}[s.ptype]*(.85+r()*.3);
    const p = makePlanet(r, st, s.ptype, s.name, null, T, null);
    p.desc = s.customDesc || planetText(p, null); return p;
  });
}

function systemOfSky(i){
  return cached('sys|'+i, ()=>{
    const s = sky.stars[i], ph = physOf(i);
    const star = {id:uid(), kind:'sysstar', name: s.name || s.desig || ('Étoile n° '+(i+1)), phys:ph, t:s.t, col:s.col, lore: starText(s)};
    const sys=makeSystem(star, rngFor('sys|'+i)); sys.skyIndex=i; return sys;
  });
}
function makeSystem(star, r){
  const st = sky.st, ph = star.phys;
  const hz = Math.sqrt(Math.max(ph.lum,.001)), snow = 2.7*hz;
  const planets=[], belts=[], comets=[], dwarfs=[];
  const n = r()<.08 ? 0 : 1+Math.floor(r()*8);
  let a = (.12+r()*.35)*Math.sqrt(Math.max(ph.lum,.02)); if(ph.giant) a*=4;
  const letters='bcdefghijk';
  const baseName = star.name;
  for(let k=0;k<n;k++){
    const T = 278*Math.pow(ph.lum,.25)/Math.sqrt(a);
    let type;
    if(k===0 && r()<.07) type='gazeuse';
    else if(a>snow) type = r()<.5 ? 'gazeuse' : r()<.6 ? 'glacegeante' : 'glace';
    else if(T>800) type = r()<.6 ? 'lave' : 'brulee';
    else if(T>360) type = r()<.6 ? 'brulee' : 'desert';
    else if(T>235) type = pick(r,['tempere','ocean','desert','tempere']);
    else type = r()<.55 ? 'glace' : 'desert';
    const days = 365.25*Math.sqrt(Math.pow(a,3)/ph.mass);
    const code = baseName+' '+letters[k];
    const proper = r()<.35 ? starName(r,st,true) : null;
    const p = makePlanet(r, st, type, proper||code, a, T, days, proper?code:null);
    p.desc = planetText(p, star.name);
    planets.push(p);
    a *= 1.45 + r()*.9;
  }
  for(let k=0;k<planets.length-1 && belts.length<1;k++){
    const a1=planets[k].a, a2=planets[k+1].a;
    if(a2/a1>1.9 && r()<.65){ belts.push({id:uid(), kind:'belt', name:'Ceinture de '+starName(r,st,true), a1:a1*1.25, a2:a2*.8, icy:false}); }
  }
  const aOut = planets.length ? planets[planets.length-1].a : 3*hz;
  if(r()<.55) belts.push({id:uid(), kind:'belt', name:'Ceinture glacée de '+starName(r,st,true), a1:aOut*1.3, a2:aOut*1.75, icy:true});
  for(const b of belts){
    b.parts=[]; const np = b.icy?420:320; for(let k=0;k<np;k++) b.parts.push([r(), r()*TAU, .6+r()*1.2]);
    b.desc = b.icy ? `Un anneau de blocs de glace et de roche, au-delà des planètes. Des milliers de petits corps y tournent lentement, entre ${fr(b.a1)} et ${fr(b.a2)} UA de l’étoile.` : `Des millions de rochers et de fragments métalliques, restes d’une planète qui n’a jamais pu se former, entre ${fr(b.a1)} et ${fr(b.a2)} UA de l’étoile.`;
    if(r()<.5){ const da=b.a1+(b.a2-b.a1)*r(); const dn=starName(r,st,true);
      dwarfs.push({id:uid(), kind:'dwarf', name:dn, a:da, period:365.25*Math.sqrt(Math.pow(da,3)/ph.mass), angle0:r()*TAU, radiusKm:300+r()*900,
        desc:`Une planète naine de ${fr(300+r()*900,0)} km de rayon, assez massive pour être ronde mais trop petite pour avoir fait le ménage dans ${b.name.toLowerCase().startsWith('ceinture glacée')?'la ceinture glacée':'sa ceinture'}.`}); }
  }
  const nc = Math.floor(r()*3);
  for(let k=0;k<nc;k++){
    const q = (.3+r()*1.2)*hz, Q = aOut*(1.1+r()*1.3);
    const am = (q+Q)/2, years = Math.sqrt(Math.pow(am,3)/ph.mass);
    comets.push({id:uid(), kind:'comet', name:'Comète '+starName(r,st,true), q, Q, am, e:(Q-q)/(Q+q), w:r()*TAU, M0:r()*TAU, period:years*365.25,
      desc:`Une boule de glace et de poussière sur une orbite très allongée. Elle revient près de l’étoile tous les ${fr(years, years<10?1:0)} ans, et sa queue s’allume à chaque passage.`});
  }
  let companion = null;
  if(r()<.18){ const t = clamp(.1+r()*.9,-1,1), ca = aOut*(2.2+r()*1.5);
    companion = {id:uid(), kind:'star2', name:star.name+' B', t, col:starColor(t), a:ca, angle0:r()*TAU, period:365.25*Math.sqrt(Math.pow(ca,3)/(ph.mass+.5)),
      desc:`Une étoile compagne, plus petite et plus froide, qui tourne autour de ${star.name} en ${fr(Math.sqrt(Math.pow(ca,3)/(ph.mass+.5)),0)} ans.`}; }
  const aMax = Math.max(aOut, ...belts.map(b=>b.a2), companion?companion.a:0);
  // texte de l'étoile
  const t=[]; if(star.lore) t.push(star.lore);
  t.push(`C’est une ${ph.kind}, ${lumText(ph.lum)}, dont la surface atteint ${fr(ph.temp,0)} K.`);
  t.push(planets.length ? `${planets.length} planète${planets.length>1?'s':''} gravite${planets.length>1?'nt':''} autour d’elle${belts.length?', avec '+(belts.length>1?'deux ceintures':'une ceinture')+' d’astéroïdes':''}${comets.length?' et '+comets.length+' comète'+(comets.length>1?'s':''):''}.` : 'Aucune planète ne l’accompagne : seule la poussière tourne autour d’elle.');
  if(planets.some(p=>p.habitable)) t.push('L’une de ses planètes se trouve dans la zone habitable.');
  star.desc = t.join(' ');
  const starR = ph.giant ? 26 : ph.cls==='M' ? 11 : ph.cls==='K' ? 14 : ph.cls==='B'||ph.cls==='A' ? 20 : 16;
  return {star, planets, belts, dwarfs, comets, companion, aMax, starR, hz};
}

function galaxyOf(s){
  return cached('gx|'+s.i, ()=>{
    const r = rngFor(s.gkey), st = sky.st, gt = s.gtype;
    const pts=[];
    const push=(x,y,z,c,sz)=>pts.push([x,y,z,c,sz]);
    const armCol = () => r()<.08 ? 'rgba(255,140,190,.55)' : r()<.5 ? 'rgba(170,195,255,.5)' : 'rgba(225,230,255,.45)';
    const coreCol = () => r()<.5 ? 'rgba(255,215,160,.5)' : 'rgba(255,235,200,.45)';
    const NP = 5200;
    if(gt==='spirale' || gt==='barree'){
      const arms = gt==='barree' ? 2 : 2+Math.floor(r()*3), pitch = (12+r()*14)*deg, r0 = gt==='barree' ? .28 : .08;
      for(let k=0;k<NP;k++){
        const u=r();
        if(u<.22){ const x=gauss(r)*.11, y=gauss(r)*.11, z=gauss(r)*.06; push(x,y,z,coreCol(),1.4); }
        else if(gt==='barree' && u<.32){ push((r()*2-1)*.3, gauss(r)*.035, gauss(r)*.02, coreCol(), 1.3); }
        else if(u<.45){ const rr=Math.sqrt(r()), th=r()*TAU; push(rr*Math.cos(th), rr*Math.sin(th), gauss(r)*.02, 'rgba(190,200,235,.25)', 1.1); }
        else { const arm=Math.floor(r()*arms), rr = r0+(1-r0)*Math.pow(r(),.7);
          const th = arm*TAU/arms + Math.log(rr/r0)/Math.tan(pitch) + gauss(r)*(.18+.12*(1-rr));
          const jit = gauss(r)*.03; push(rr*Math.cos(th)+jit, rr*Math.sin(th)+jit, gauss(r)*.015, armCol(), 1.2+r()*.6); }
      }
    } else if(gt==='elliptique'){
      const q = .55+r()*.4;
      for(let k=0;k<NP;k++){ const s2=Math.pow(r(),1.6); const x=gauss(r)*.38*s2*1.6, y=gauss(r)*.38*q*s2*1.6, z=gauss(r)*.3*s2; push(x,y,z, r()<.6?'rgba(255,210,160,.45)':'rgba(255,230,200,.4)', 1.3); }
    } else if(gt==='lenticulaire'){
      for(let k=0;k<NP;k++){ if(r()<.35){ push(gauss(r)*.12,gauss(r)*.12,gauss(r)*.07,coreCol(),1.4); }
        else { const rr=-Math.log(1-r()*.95)*.28, th=r()*TAU; push(rr*Math.cos(th), rr*Math.sin(th), gauss(r)*.015, 'rgba(240,225,200,.35)', 1.2); } }
    } else {
      const clumps=[]; for(let k=0;k<7+Math.floor(r()*5);k++) clumps.push([gauss(r)*.4, gauss(r)*.3, .06+r()*.14]);
      for(let k=0;k<NP;k++){ const c=pick(r,clumps); push(c[0]+gauss(r)*c[2], c[1]+gauss(r)*c[2], gauss(r)*.05, r()<.15?'rgba(255,140,190,.55)':'rgba(180,200,255,.45)', 1.2+r()*.5); }
    }
    const stars=[]; const kinds = shuffle(r, GSTAR_KINDS);
    const names=new Set();
    for(let k=0;k<10;k++){
      const [kind, tt, txt] = kinds[k%kinds.length];
      let pi; for(let tries=0;tries<30;tries++){ pi=Math.floor(r()*pts.length); const p=pts[pi]; const rr=Math.hypot(p[0],p[1]); if(rr>.15 && rr<1.05) break; }
      let nm; do{ nm=starName(r,st); } while(names.has(nm)); names.add(nm);
      const t = clamp(tt+gauss(r)*.1,-1,1);
      const lum = {'supergéante bleue':1e5,'géante rouge':300,'naine jaune':1,'naine rouge':.02,'céphéide':3000,'naine blanche':.005,'étoile binaire':4,'géante orange':80,'pulsar':.001,'étoile de carbone':2000,'hypergéante':5e5}[kind]*(.5+r());
      const giant = /géante|céphéide|carbone/.test(kind);
      const phys = {kind, lum, dist:s.distMly*1e6, mass: giant?2+r()*8:Math.pow(Math.max(lum,.01),.25), temp:Math.round(3000+(1-t)*6000+ (kind.includes('bleue')||kind==='hypergéante'?15000:0)), giant, cls: t<-.3?'B':t<.2?'G':t<.5?'K':'M'};
      stars.push({id:uid(), kind:'gstar', name:nm, skind:kind, t, col:starColor(t), pi, phys, txt, lore:''});
    }
    const g = GTYPES[gt];
    const desc = s.customDesc ? s.customDesc : `${s.name} est une ${g.label} située à environ ${fr(s.distMly,0)} millions d’années-lumière. ${g.txt} Elle mesure ${fr(s.diamKly,0)} milliers d’années-lumière de diamètre et compte environ ${fr(s.nStars,0)} milliards d’étoiles. Voici dix d’entre elles, parmi les plus remarquables.`;
    return {id:uid(), kind:'galaxy', name:s.name, gtype:gt, pts, stars: s.real?[]:stars, desc: s.real ? s.realDesc : desc, sky:s, tilt:(35+r()*40)*deg};
  });
}
function systemOfGalaxyStar(g, gs){
  return cached('gs|'+gs.id, ()=>{
    const star = {id:uid(), kind:'sysstar', name:gs.name, phys:gs.phys, t:gs.t, col:gs.col, lore:gs.txt};
    const sys=makeSystem(star, rngFor('gsys|'+g.name+'|'+gs.name)); sys.far=true; return sys;
  });
}

/* ---------- état du visualiseur ---------- */
const V = {open:false, stack:[], rot:0, tilt:62*deg, zoom:1, t:0, paused:reduceMotion, sel:null, hits:[], W:0, H:0};
const vcv=$('vcv'); let vctx=vcv.getContext('2d'); // let : l'export peut dessiner le système dans une autre image
const bgStars = (()=>{ const r=mulberry32(99); const a=[]; for(let i=0;i<260;i++) a.push([r(),r(),r()*.6+.2,r()*.9+.3]); return a; })();
const topScene = () => V.stack[V.stack.length-1];
function resetVCam(){ const sc=topScene(); if(sc.kind==='neighbors'){ V.rot=.5; V.tilt=58*deg; V.zoom=1; V.sel=null; return; } V.rot = sc.kind==='galaxy'? .3 : 0; V.tilt = sc.kind==='galaxy' ? sc.data.tilt : sc.kind==='body' ? 72*deg : 62*deg; V.zoom=1; V.sel=null; }
function openViewer(scene){ V.stack=[scene]; V.open=true; $('viewer').hidden=false; $('card').hidden=true; closeSheets(); resetVCam(); vPanel(); updatePauseLabel(); }
function pushScene(scene){ V.stack.push(scene); resetVCam(); vPanel(); }
function vBack(){ V.stack.pop(); if(!V.stack.length){ closeViewer(); return; } resetVCam(); vPanel(); }
function closeViewer(){ V.open=false; V.stack=[]; $('viewer').hidden=true; if(sel>=0) $('card').hidden=false; dirty=true; }
$('vBack').onclick=vBack; $('vClose').onclick=closeViewer;
$('vPause').onclick=()=>{ V.paused=!V.paused; updatePauseLabel(); };
function updatePauseLabel(){ $('vPause').textContent = V.paused ? 'Reprendre' : 'Pause'; }
$('vZin').onclick=()=>{ V.zoom=clamp(V.zoom*1.25,.4,6); }; $('vZout').onclick=()=>{ V.zoom=clamp(V.zoom/1.25,.4,6); };
attachDrag(vcv, (dx,dy)=>{ V.rot -= dx*.006; V.tilt = clamp(V.tilt - dy*.006, 0, 88*deg); }, f=>{ V.zoom=clamp(V.zoom/f,.4,6); }, vTap, null);

function vTap(x,y){
  let best=null, bd=1e9;
  for(const h of V.hits){ const d=Math.hypot(h.x-x,h.y-y); if(d<h.r && d<bd){bd=d;best=h.obj;} }
  if(!best){ const sc=topScene();
    if(sc.kind==='system'){ const sys=sc.data, ct=Math.max(Math.cos(V.tilt),.05); const rr=Math.hypot(x-V.W/2,(y-V.H/2)/ct);
      for(const b of sys.belts){ const r1=vDR(sys,b.a1), r2=vDR(sys,b.a2); if(rr>r1-6 && rr<r2+6){ best=b; break; } } } }
  vSelect(best);
}
function vSelect(o){ V.sel=o; vPanel(); }

function kindLabel(o){
  if(o.kind==='nstar'||o.kind==='ncenter') return o.kind==='ncenter' ? 'Point de départ' : `${cap(o.phys&&o.phys.kind||'étoile')}, à ${fmtLy(o.dist)}`;
  switch(o.kind){
    case 'sysstar': return cap(o.phys.kind);
    case 'planet': return PTYPES[o.type].label;
    case 'moon': return 'Lune '+o.mtype;
    case 'belt': return o.icy?'Ceinture glacée':'Ceinture d’astéroïdes';
    case 'dwarf': return 'Planète naine';
    case 'comet': return 'Comète';
    case 'star2': return 'Étoile compagne';
    case 'galaxy': return cap(GTYPES[o.gtype].label);
    case 'gstar': return cap(o.skind);
  }
  return '';
}
function dotColor(o){
  if(o.kind==='nstar'||o.kind==='ncenter') return rgb(o.col);
  if(o.kind==='sysstar'||o.kind==='gstar'||o.kind==='star2') return rgb(o.col);
  if(o.kind==='planet') return PTYPES[o.type].cols[1];
  if(o.kind==='moon') return o.col;
  if(o.kind==='belt') return o.icy?'#a9c6d8':'#a89a86';
  if(o.kind==='comet') return '#cfe8ff';
  if(o.kind==='dwarf') return '#b8b0a4';
  return '#ccc';
}
function factsOf(o, sc){
  if(o.facts) return o.facts;
  if(o.kind==='nstar'||o.kind==='ncenter'){ const f=[]; if(o.kind==='nstar') f.push(['Distance d’ici', fmtLy(o.dist)]); if(!o.home) f.push(['Distance de '+homeName(), fmtLy(o.dhome)]); if(o.phys){ f.push(['Type', cap(o.phys.kind)]); if(o.phys.lum) f.push(['Luminosité', fr(sig2(o.phys.lum), o.phys.lum<1?3:o.phys.lum<10?1:0)+' × Soleil']); } return f; }
  const f=[];
  if(o.kind==='sysstar'){ const p=o.phys; f.push(['Luminosité', fr(p.lum, p.lum<1?3:p.lum<10?1:0)+' × Soleil'], ['Température', fr(p.temp,0)+' K']); if(p.dist>0) f.push(['Distance', p.dist>1e5 ? fr(p.dist/1e6,0)+' millions d’al' : fr(p.dist, p.dist<100?1:0)+' années-lumière']); }
  if(o.kind==='planet'){ f.push(['Rayon', fr(o.radius)+' × Terre']); if(o.a) f.push(['Distance à l’étoile', fr(o.a, o.a<1?2:1)+' UA']); if(o.period) f.push(['Une année dure', periodText(o.period)]);
    if(o.T) f.push(['Température', fr(Math.round(o.T-273),0)+' °C']); f.push(['Lunes', String(o.moonCount ?? o.moons.length)], ['Anneaux', o.rings?'Oui':'Non']); if(o.alias) f.push(['Désignation', o.alias]); }
  if(o.kind==='moon'){ f.push(['Rayon', fr(o.radiusKm,0)+' km'], ['Tour de sa planète', periodText(o.period)]); }
  if(o.kind==='dwarf'){ f.push(['Distance', fr(o.a)+' UA'], ['Une année dure', periodText(o.period)]); }
  if(o.kind==='comet'){ f.push(['Plus proche', fr(o.q,2)+' UA'], ['Plus lointaine', fr(o.Q,1)+' UA'], ['Retour tous les', periodText(o.period)]); }
  if(o.kind==='star2'){ f.push(['Distance', fr(o.a,0)+' UA'], ['Couleur', colorLabel(o.t)]); }
  if(o.kind==='gstar'){ f.push(['Luminosité', fr(o.phys.lum, o.phys.lum<1?3:0)+' × Soleil'], ['Couleur', colorLabel(o.t)]); }
  if(o.kind==='galaxy'){ const s=o.sky; f.push(['Distance', fr(s.distMly,0)+' millions d’al'], ['Diamètre', fr(s.diamKly,0)+' milliers d’al'], ['Étoiles', 'environ '+fr(s.nStars,0)+' milliards']); }
  return f;
}
function descOf(o){
  if(o.desc && o.kind==='moon') return o.desc;
  if(o.kind==='moon') return `Une lune ${o.mtype} de ${fr(o.radiusKm,0)} km de rayon, qui fait le tour de ${o.parent} en ${periodText(o.period)}.` + ({volcanique:' Ses volcans crachent du soufre en permanence.','glacée':' Sa croûte de glace est striée de longues fissures.','à océan gelé':' Sous sa banquise dort peut-être un océan tiède.','cratérisée':' Sa surface porte les cicatrices de milliards d’années d’impacts.', rocheuse:''}[o.mtype]||'');
  if(o.kind==='gstar') return o.txt;
  return o.desc || '';
}
function vPanel(){
  const sc=topScene(); if(!sc) return;
  const main = sc.kind==='system' ? sc.data.star : sc.kind==='neighbors' ? sc.data.center : sc.data;
  $('vTitle').textContent = sc.kind==='neighbors' ? 'Autour de '+main.name : main.name;
  $('vSubT').textContent = sc.kind==='neighbors' ? 'Les étoiles voisines en trois dimensions' : kindLabel(main);
  const prev = V.stack.length>1 ? V.stack[V.stack.length-2] : null;
  $('vBack').textContent = prev ? 'Retour à '+(prev.kind==='system'?prev.data.star.name:prev.kind==='neighbors'?'la carte des voisines':prev.data.name) : 'Retour au ciel';
  const o = V.sel || main;
  const info=$('vInfo'); info.innerHTML='';
  const h=document.createElement('h3'); h.textContent=o.name;
  const sub=document.createElement('p'); sub.className='sub'; sub.textContent=kindLabel(o);
  info.append(h,sub);
  const dtext = descOf(o); if(dtext){ const p=document.createElement('p'); p.className='desc'; p.textContent=dtext; info.append(p); }
  const dl=document.createElement('dl'); dl.className='facts'; fillFacts(dl, factsOf(o, sc)); info.append(dl);
  const acts=document.createElement('div'); acts.className='acts';
  if(o.kind==='planet' && sc.kind==='system'){ const b=document.createElement('button'); b.className='act primary'; b.textContent='Voir de près'; b.onclick=()=>pushScene({kind:'body', data:o}); acts.append(b); }
  const sysCtx = sc.kind==='system' ? sc.data : (sc.kind==='body' && prev && prev.kind==='system' ? prev.data : null);
  if(o.kind==='planet' && sysCtx && !sysCtx.far && o.a){ const b=document.createElement('button'); b.className='act'; b.textContent = (o.isHome || (sky.earth && o.name==='Terre')) ? 'Revenir sur '+o.name : 'Se poser sur '+o.name; b.onclick=()=>landOn(o, sysCtx); acts.append(b); }
  if(o.kind==='nstar' || o.kind==='ncenter'){
    if(o.kind==='nstar'){ const b=document.createElement('button'); b.className='act primary'; b.textContent='Aller à cette étoile'; b.onclick=()=>{ const ns=neighborsScene(o.home?null:o.i); if(ns){ V.stack[V.stack.length-1]=ns; resetVCam(); vPanel(); } }; acts.append(b); }
    const b2=document.createElement('button'); b2.className='act'; b2.textContent = o.home ? 'Voir le ciel depuis '+homeName() : 'Voir le ciel depuis ici'; b2.onclick=()=>{ closeViewer(); if(o.home) setVantage(null); else goToStar(o.i); }; acts.append(b2);
    if(!sky.earth && !o.home && o.i!=null){ const b3=document.createElement('button'); b3.className='act'; b3.textContent='Explorer son système'; b3.onclick=()=>pushScene({kind:'system', data:systemOfSky(o.i)}); acts.append(b3); }
  }
  if(o.kind==='gstar'){ const b=document.createElement('button'); b.className='act primary'; b.textContent='Explorer son système'; b.onclick=()=>pushScene({kind:'system', data:systemOfGalaxyStar(sc.data,o)}); acts.append(b); }
  if(V.sel){ const b=document.createElement('button'); b.className='act'; b.textContent='Désélectionner'; b.onclick=()=>vSelect(null); acts.append(b); }
  if(acts.children.length) info.append(acts);
  // liste
  let items=[], title='';
  if(sc.kind==='system'){ const s=sc.data; items=[s.star, ...s.planets, ...s.belts, ...s.dwarfs, ...s.comets, ...(s.companion?[s.companion]:[])]; title='Dans ce système'; }
  else if(sc.kind==='body'){ items=[sc.data, ...sc.data.moons]; title= sc.data.moons.length ? 'Lunes' : 'Aucune lune'; if(sc.data.moons.length) items=[sc.data, ...sc.data.moons]; }
  else if(sc.kind==='neighbors'){ items=[sc.data.center, ...sc.data.items.slice(0,40)]; title='Les étoiles les plus proches'; }
  else { items=[sc.data, ...sc.data.stars]; title= sc.data.stars.length ? 'Étoiles remarquables' : ''; }
  $('vListTitle').textContent=title;
  const ul=$('vList'); ul.innerHTML='';
  for(const it of items){ const li=document.createElement('li'); const b=document.createElement('button');
    b.setAttribute('aria-current', String((V.sel||main)===it));
    const d=document.createElement('span'); d.className='dot'; d.style.background=dotColor(it);
    const n=document.createElement('span'); n.className='nm'; n.textContent=it.name;
    const t=document.createElement('span'); t.className='ty'; t.textContent=kindLabel(it);
    b.append(d,n,t); b.onclick=()=>vSelect(it===main?null:it); li.append(b); ul.append(li); }
}

/* ---------- dessin du visualiseur ---------- */
function vDR(sys,a){ const ct=Math.max(Math.cos(V.tilt),.3); const Rout=Math.min(V.W*.46, V.H*.44/ct)*V.zoom, Rin=sys.starR*1.7+12; return Rin+(Rout-Rin)*Math.sqrt(a/sys.aMax); }
function vP(rad, th){ const x=rad*Math.cos(th), y=rad*Math.sin(th), c=Math.cos(V.rot), s=Math.sin(V.rot); const rx=x*c-y*s, ry=x*s+y*c; return [V.W/2+rx, V.H/2+ry*Math.cos(V.tilt), ry]; }
function vDraw(dt){
  const rect = $('vStage').getBoundingClientRect(), dpr=Math.min(2,devicePixelRatio||1);
  if(Math.round(rect.width*dpr)!==vcv.width || Math.round(rect.height*dpr)!==vcv.height){ vcv.width=Math.round(rect.width*dpr); vcv.height=Math.round(rect.height*dpr); }
  V.W=rect.width; V.H=rect.height; vctx.setTransform(dpr,0,0,dpr,0,0);
  if(!V.paused) V.t += dt;
  vctx.globalCompositeOperation='source-over';
  vctx.fillStyle='#02040b'; vctx.fillRect(0,0,V.W,V.H);
  for(const [x,y,a,s] of bgStars){ vctx.fillStyle=`rgba(220,225,240,${a*.6})`; vctx.fillRect(x*V.W,y*V.H,s,s); }
  V.hits=[];
  const sc=topScene(); if(!sc) return;
  if(sc.kind==='system') drawSystem(sc.data); else if(sc.kind==='body') drawBody(sc.data); else if(sc.kind==='neighbors') drawNeighbors(sc.data); else drawGalaxy(sc.data);
}
function drawStarDisc(x,y,R,col){
  const [r,g,b]=col;
  const gl=vctx.createRadialGradient(x,y,R*.4,x,y,R*4.5);
  gl.addColorStop(0,`rgba(${r},${g},${b},.55)`); gl.addColorStop(.3,`rgba(${r},${g},${b},.15)`); gl.addColorStop(1,`rgba(${r},${g},${b},0)`);
  vctx.fillStyle=gl; vctx.fillRect(x-R*4.5,y-R*4.5,R*9,R*9);
  const core=vctx.createRadialGradient(x,y,0,x,y,R);
  core.addColorStop(0,'#fffdf6'); core.addColorStop(.55,`rgb(${Math.min(255,r+20)},${Math.min(255,g+20)},${Math.min(255,b+20)})`); core.addColorStop(1,`rgb(${r*.85|0},${g*.8|0},${b*.75|0})`);
  vctx.fillStyle=core; vctx.beginPath(); vctx.arc(x,y,R,0,TAU); vctx.fill();
}
function drawPlanet(x,y,R,p,lightAng,g=vctx){
  const pt=PTYPES[p.type], cols=pt.cols;
  if(R<2.5){ g.fillStyle=cols[1]; g.beginPath(); g.arc(x,y,Math.max(1.5,R),0,TAU); g.fill(); return; }
  const r=mulberry32(p.seedN);
  g.save(); g.beginPath(); g.arc(x,y,R,0,TAU); g.clip();
  g.fillStyle=cols[0]; g.fillRect(x-R,y-R,2*R,2*R);
  if(pt.kind==='gas'){
    let yy=-R; while(yy<R){ const h=R*(.06+r()*.16); g.fillStyle=pick(r,cols); g.globalAlpha=.55+r()*.4; g.fillRect(x-R,y+yy,2*R,h); yy+=h; }
    g.globalAlpha=1;
    const spot = ['gazeuse','glacegeante','jupiter','neptune'].includes(p.type);
    if(spot && r()<(p.type==='jupiter'||p.type==='neptune'?2:.6)){ g.fillStyle=(p.type==='gazeuse'||p.type==='jupiter')?'rgba(190,90,60,.7)':'rgba(30,50,110,.6)'; g.beginPath(); g.ellipse(x+(r()-.5)*R, y+(r()-.3)*R*.8, R*.16, R*.09, 0, 0, TAU); g.fill(); }
  } else if(pt.kind==='lava'){
    g.strokeStyle=cols[2]; g.lineWidth=Math.max(1,R*.03); g.shadowColor=cols[2]; g.shadowBlur=R*.15;
    for(let k=0;k<14;k++){ let cx=x+(r()*2-1)*R, cy=y+(r()*2-1)*R; g.beginPath(); g.moveTo(cx,cy); for(let j=0;j<5;j++){ cx+=(r()-.5)*R*.4; cy+=(r()-.5)*R*.4; g.lineTo(cx,cy); } g.stroke(); }
    g.shadowBlur=0;
  } else {
    const land = pt.kind==='terra';
    for(let k=0;k<16;k++){ g.fillStyle = land ? (p.type==='ocean'? cols[1] : (r()<.7?cols[1]:'#8a7a4c')) : pick(r,cols.slice(1)); g.globalAlpha=land?.9:.5+r()*.4;
      g.beginPath(); g.ellipse(x+(r()*2-1)*R, y+(r()*2-1)*R, R*(.1+r()*.35), R*(.08+r()*.25), r()*Math.PI, 0, TAU); g.fill(); }
    if(p.type!=='ocean' && pt.kind==='rock'){ g.globalAlpha=.35; for(let k=0;k<10;k++){ g.strokeStyle='rgba(0,0,0,.5)'; g.lineWidth=Math.max(.6,R*.02); g.beginPath(); g.arc(x+(r()*2-1)*R, y+(r()*2-1)*R, R*(.03+r()*.08),0,TAU); g.stroke(); } }
    if(land){ g.globalAlpha=.55; for(let k=0;k<10;k++){ g.fillStyle=cols[2]; g.beginPath(); g.ellipse(x+(r()*2-1)*R, y+(r()*2-1)*R, R*(.15+r()*.3), R*(.03+r()*.05), (r()-.5)*.6, 0, TAU); g.fill(); } }
    if(p.type==='glace'||p.type==='tempere'){ g.globalAlpha=.85; g.fillStyle='#f4f8fb'; g.beginPath(); g.ellipse(x,y-R*.95,R*.6,R*.18,0,0,TAU); g.fill(); g.beginPath(); g.ellipse(x,y+R*.95,R*.55,R*.16,0,0,TAU); g.fill(); }
    g.globalAlpha=1;
  }
  const lx=x+Math.cos(lightAng)*R*.55, ly=y+Math.sin(lightAng)*R*.55;
  const sh=g.createRadialGradient(lx,ly,R*.1,lx,ly,R*2);
  sh.addColorStop(0,'rgba(0,0,0,0)'); sh.addColorStop(.45,'rgba(0,0,0,.35)'); sh.addColorStop(.75,'rgba(0,0,0,.88)'); sh.addColorStop(1,'rgba(0,0,0,.95)');
  g.fillStyle=sh; g.fillRect(x-R,y-R,2*R,2*R);
  g.restore();
  if(pt.kind==='terra'||pt.kind==='gas'){ g.strokeStyle=pt.kind==='terra'?'rgba(140,190,255,.45)':'rgba(255,255,255,.12)'; g.lineWidth=Math.max(1,R*.05); g.beginPath(); g.arc(x,y,R,lightAng-1.3,lightAng+1.3); g.stroke(); }
}
function drawRingHalf(x,y,R,rings,front,g=vctx,tilt=V.tilt){
  const ct=Math.max(Math.cos(tilt),.12);
  g.save(); g.beginPath(); if(front) g.rect(x-R*4,y,R*8,R*4); else g.rect(x-R*4,y-R*4,R*8,R*4); g.clip();
  const ro=R*rings.outer, ri=R*rings.inner;
  for(let k=0;k<5;k++){ const a=ri+(ro-ri)*k/5, b=ri+(ro-ri)*(k+1)/5;
    g.beginPath(); g.ellipse(x,y,b,b*ct,0,0,TAU); g.ellipse(x,y,a,a*ct,0,0,TAU);
    g.fillStyle=`rgba(${rings.col},${[.35,.6,.25,.5,.3][k]*(rings.a||1)})`; g.fill('evenodd'); }
  g.restore();
}
function drawMoon(x,y,R,m,lightAng){
  vctx.fillStyle=m.col; vctx.beginPath(); vctx.arc(x,y,R,0,TAU); vctx.fill();
  if(R>3){ const lx=x+Math.cos(lightAng)*R*.5, ly=y+Math.sin(lightAng)*R*.5; const g=vctx.createRadialGradient(lx,ly,R*.1,lx,ly,R*2);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.6,'rgba(0,0,0,.6)'); g.addColorStop(1,'rgba(0,0,0,.92)'); vctx.fillStyle=g; vctx.beginPath(); vctx.arc(x,y,R,0,TAU); vctx.fill(); }
}
function selRing(x,y,R){ vctx.strokeStyle='rgba(245,220,150,.95)'; vctx.lineWidth=1.4; vctx.beginPath(); vctx.arc(x,y,R+6,0,TAU); vctx.stroke(); }
function vLabel(txt,x,y,hl){ vctx.font=`${hl?'600 ':''}13px Figtree, system-ui, sans-serif`; vctx.textAlign='center'; vctx.textBaseline='top'; vctx.fillStyle=hl?'#f5dc96':'rgba(210,215,235,.8)'; vctx.fillText(txt,x,y); }

function drawSystem(sys){
  const cx=V.W/2, cy=V.H/2, ct=Math.cos(V.tilt);
  const pMin = sys.planets.length ? sys.planets[0].period : 365;
  const om = per => TAU/(6*Math.pow(per/pMin,.6));
  // orbites
  vctx.lineWidth=1;
  for(const p of sys.planets){ const R=vDR(sys,p.a); vctx.strokeStyle = V.sel===p ? 'rgba(236,205,130,.7)' : p.habitable ? 'rgba(120,210,160,.3)' : 'rgba(160,180,230,.17)'; vctx.beginPath(); vctx.ellipse(cx,cy,R,R*ct,0,0,TAU); vctx.stroke(); }
  if(sys.companion){ const R=vDR(sys,sys.companion.a); vctx.strokeStyle='rgba(160,180,230,.12)'; vctx.setLineDash([2,6]); vctx.beginPath(); vctx.ellipse(cx,cy,R,R*ct,0,0,TAU); vctx.stroke(); vctx.setLineDash([]); }
  // ceintures
  for(const b of sys.belts){ const r1=vDR(sys,b.a1), r2=vDR(sys,b.a2), w=-om(365.25*Math.sqrt(Math.pow((b.a1+b.a2)/2,3)/sys.star.phys.mass))*0+om(365.25*Math.sqrt(Math.pow((b.a1+b.a2)/2,3)/sys.star.phys.mass));
    vctx.fillStyle = V.sel===b ? 'rgba(245,220,150,.8)' : b.icy ? 'rgba(175,205,235,.55)' : 'rgba(200,185,160,.6)';
    for(const [f,th,s] of b.parts){ const [x,y]=vP(r1+(r2-r1)*f, th+V.t*w); vctx.fillRect(x,y,s,s); } }
  // comètes : trajectoires
  const cometPos = c => { const M=c.M0+V.t*om(c.period); let E=M; for(let k=0;k<6;k++) E=M+c.e*Math.sin(E);
    const rr=c.am*(1-c.e*Math.cos(E)), nu=2*Math.atan2(Math.sqrt(1+c.e)*Math.sin(E/2), Math.sqrt(1-c.e)*Math.cos(E/2)); return [rr, nu+c.w]; };
  vctx.setLineDash([3,5]);
  for(const c of sys.comets){ vctx.strokeStyle= V.sel===c?'rgba(236,205,130,.6)':'rgba(170,210,255,.15)'; vctx.beginPath();
    for(let k=0;k<=90;k++){ const E=k/90*TAU, rr=c.am*(1-c.e*Math.cos(E)), nu=2*Math.atan2(Math.sqrt(1+c.e)*Math.sin(E/2), Math.sqrt(1-c.e)*Math.cos(E/2)); const [x,y]=vP(vDR(sys,rr),nu+c.w); k?vctx.lineTo(x,y):vctx.moveTo(x,y); }
    vctx.stroke(); }
  vctx.setLineDash([]);
  // objets triés par profondeur
  const L=[];
  const sR = sys.starR*Math.sqrt(V.zoom);
  L.push({d:0, f:()=>{ drawStarDisc(cx,cy,sR,sys.star.col); V.hits.push({x:cx,y:cy,r:sR+8,obj:sys.star}); if(V.sel===sys.star) selRing(cx,cy,sR); }});
  for(const p of sys.planets){ const [x,y,d]=vP(vDR(sys,p.a), p.angle0+V.t*om(p.period)); const R=clamp(3+Math.sqrt(p.radius)*2.6,3.5,15)*Math.sqrt(V.zoom);
    L.push({d, f:()=>{ const la=Math.atan2(cy-y,cx-x); if(p.rings) drawRingHalf(x,y,R,p.rings,false); drawPlanet(x,y,R,p,la); if(p.rings) drawRingHalf(x,y,R,p.rings,true);
      V.hits.push({x,y,r:Math.max(R+8,14),obj:p}); if(V.sel===p) selRing(x,y,R*(p.rings?p.rings.outer:1)); vLabel(p.name,x,y+R*(p.rings?1.3:1)+5,V.sel===p); }}); }
  for(const dw of sys.dwarfs){ const [x,y,d]=vP(vDR(sys,dw.a), dw.angle0+V.t*om(dw.period)); const R=3*Math.sqrt(V.zoom);
    L.push({d, f:()=>{ drawMoon(x,y,R,{col:'#b8b0a4'},Math.atan2(cy-y,cx-x)); V.hits.push({x,y,r:12,obj:dw}); if(V.sel===dw){ selRing(x,y,R); vLabel(dw.name,x,y+R+5,true);} }}); }
  for(const c of sys.comets){ const [rr,th]=cometPos(c); const [x,y,d]=vP(vDR(sys,rr),th);
    L.push({d, f:()=>{ const dx=x-cx, dy=y-cy, l=Math.hypot(dx,dy)||1, tl=clamp(60/Math.max(rr/sys.hz,.2),4,90)*Math.sqrt(V.zoom);
      const g=vctx.createLinearGradient(x,y,x+dx/l*tl,y+dy/l*tl); g.addColorStop(0,'rgba(200,230,255,.8)'); g.addColorStop(1,'rgba(200,230,255,0)');
      vctx.strokeStyle=g; vctx.lineWidth=2; vctx.beginPath(); vctx.moveTo(x,y); vctx.lineTo(x+dx/l*tl,y+dy/l*tl); vctx.stroke();
      vctx.fillStyle='#e8f4ff'; vctx.beginPath(); vctx.arc(x,y,2,0,TAU); vctx.fill(); V.hits.push({x,y,r:12,obj:c}); if(V.sel===c){ selRing(x,y,2); vLabel(c.name,x,y+9,true);} }}); }
  if(sys.companion){ const c=sys.companion; const [x,y,d]=vP(vDR(sys,c.a), c.angle0+V.t*om(c.period)); const R=8*Math.sqrt(V.zoom);
    L.push({d, f:()=>{ drawStarDisc(x,y,R,c.col); V.hits.push({x,y,r:R+8,obj:c}); if(V.sel===c) selRing(x,y,R); vLabel(c.name,x,y+R+6,V.sel===c); }}); }
  L.sort((a,b)=>a.d-b.d).forEach(o=>o.f());
  if(!sys.planets.length && !sys.belts.length){ vLabel('Aucune planète autour de cette étoile', cx, cy+sR*3); }
}
function drawBody(p){
  const cx=V.W/2, cy=V.H/2, ct=Math.cos(V.tilt);
  const Rp = Math.min(V.W,V.H)*(p.radius>3?.17:.13)*V.zoom;
  const Rmax = Math.min(V.W*.47, V.H*.46/Math.max(ct,.3))*V.zoom;
  const start = Rp*(p.rings? p.rings.outer+.5 : 1.8), n=p.moons.length;
  const light = Math.PI*1.2;
  const pMin = n ? p.moons[0].period : 1;
  const L=[];
  p.moons.forEach((m,k)=>{
    const R = n>1 ? start + k*(Math.max(Rmax,start*1.2)-start)/(n-1) : start+Rp*.9;
    vctx.strokeStyle = V.sel===m ? 'rgba(236,205,130,.6)' : 'rgba(160,180,230,.14)'; vctx.lineWidth=1; vctx.beginPath(); vctx.ellipse(cx,cy,R,R*ct,0,0,TAU); vctx.stroke();
    const [x,y,d]=vP(R, m.angle0 + V.t*TAU/(5*Math.pow(m.period/pMin,.6)));
    const ms = clamp(Rp*(m.radiusKm/(p.radius*6371))*2.2, 3, Rp*.32);
    L.push({d, f:()=>{ drawMoon(x,y,ms,m,light); V.hits.push({x,y,r:Math.max(ms+8,14),obj:m}); if(V.sel===m) selRing(x,y,ms); vLabel(m.name,x,y+ms+5,V.sel===m); }});
  });
  L.sort((a,b)=>a.d-b.d);
  L.filter(o=>o.d<0).forEach(o=>o.f());
  if(p.rings) drawRingHalf(cx,cy,Rp,p.rings,false);
  drawPlanet(cx,cy,Rp,p,light);
  if(p.rings) drawRingHalf(cx,cy,Rp,p.rings,true);
  V.hits.push({x:cx,y:cy,r:Rp,obj:p});
  L.filter(o=>o.d>=0).forEach(o=>o.f());
}
function drawGalaxy(g){
  const cx=V.W/2, cy=V.H/2, ct=Math.cos(V.tilt), st=Math.sin(V.tilt);
  const R = Math.min(V.W,V.H)*.44*V.zoom, rot = V.rot + V.t*.04;
  const c=Math.cos(rot), s=Math.sin(rot);
  const warm = g.gtype==='elliptique'||g.gtype==='lenticulaire';
  const cg=vctx.createRadialGradient(cx,cy,0,cx,cy,R*.45);
  cg.addColorStop(0, warm?'rgba(255,220,170,.45)':'rgba(255,225,180,.4)'); cg.addColorStop(1,'rgba(255,220,170,0)');
  vctx.save(); vctx.translate(cx,cy); vctx.scale(1,Math.max(ct,.15)); vctx.translate(-cx,-cy); vctx.fillStyle=cg; vctx.fillRect(cx-R,cy-R,2*R,2*R); vctx.restore();
  vctx.globalCompositeOperation='lighter';
  const proj = p => { const rx=p[0]*c-p[1]*s, ry=p[0]*s+p[1]*c; return [cx+rx*R, cy+ry*R*ct - p[2]*R*st]; };
  for(const p of g.pts){ const [x,y]=proj(p); vctx.fillStyle=p[3]; vctx.fillRect(x,y,p[4],p[4]); }
  vctx.globalCompositeOperation='source-over';
  for(const gs of g.stars){ const [x,y]=proj(g.pts[gs.pi]); const hl=V.sel===gs;
    vctx.fillStyle=rgb(gs.col); vctx.beginPath(); vctx.arc(x,y,hl?3.5:2.6,0,TAU); vctx.fill();
    vctx.strokeStyle=hl?'rgba(245,220,150,.95)':'rgba(216,181,106,.55)'; vctx.lineWidth=1; vctx.beginPath(); vctx.arc(x,y,hl?9:7,0,TAU); vctx.stroke();
    vctx.font=`italic ${hl?'600 ':'500 '}15px ${SERIF}`; vctx.textAlign='left'; vctx.textBaseline='middle'; vctx.fillStyle=hl?'#f5dc96':'rgba(230,232,245,.85)'; vctx.fillText(gs.name,x+11,y-6);
    V.hits.push({x,y,r:16,obj:gs}); }
}
