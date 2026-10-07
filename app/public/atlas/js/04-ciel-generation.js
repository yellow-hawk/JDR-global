/* Atlas des ciels imaginaires — Génération du ciel et heure de la nuit
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ---------- génération du ciel ---------- */
let sky_maxSize=0, sky_minSize=0;
function makeSky(P){
  const R = s => mulberry32(hashStr(P.seed+'|'+s));
  const rS=R('stars'), rG=R('gal'), rD=R('dust'), rN=R('neb'), rC=R('const'), rW=R('names'), rH=R('hills'), rL=R('lore');
  const st = STYLES[P.style]||STYLES.celeste;
  const mkPlane = (r, tiltRad) => { const az=r()*TAU; const n=norm([Math.sin(tiltRad)*Math.sin(az), Math.cos(tiltRad), Math.sin(tiltRad)*Math.cos(az)]);
    const a=norm(cross(n, Math.abs(n[1])<.9?[0,1,0]:[1,0,0])), b=cross(n,a);
    return {n, pt:(rr,spread)=>{const t=rr()*TAU, o=gauss(rr)*spread, c=Math.cos(o), s=Math.sin(o), ct=Math.cos(t), stt=Math.sin(t);
      return norm([c*(a[0]*ct+b[0]*stt)+s*n[0], c*(a[1]*ct+b[1]*stt)+s*n[1], c*(a[2]*ct+b[2]*stt)+s*n[2]]);}}; };
  const gp = mkPlane(rG, P.tilt*deg), plane = gp.pt;
  const sphere = r => {const z=2*r()-1, t=r()*TAU, q=Math.sqrt(1-z*z); return [q*Math.cos(t), z, q*Math.sin(t)];};

  const slope = 1.8 + P.bright/100*2.4, mwFrac = P.milky/100*.5, cv = P.colors/100;
  const stars = [];
  for(let i=0;i<P.count;i++){
    const d = rS() < mwFrac ? plane(rS,.11) : sphere(rS);
    let u = rS(); if(u<1e-9) u=1e-9;
    const mag = Math.max(-1.6, 6.5 + slope*Math.log10(u));
    const t = clamp(gauss(rS)*.55,-1,1)*cv;
    stars.push({i, kind:'star', d, eq:toEq(d), lon:lonOf(d), lat:latOf(d), mag, t, col:starColor(t), name:null, desig:null, c:-1, ph:(i*2.399)%TAU, sp:.8+(i%7)*.35});
  }
  let order = stars.map((s,i)=>i).sort((x,y)=>stars[x].mag-stars[y].mag);

  const dust = [], nd = Math.round(2800*P.milky/100);
  for(let i=0;i<nd;i++){
    const wide = rD()<.3; const d = plane(rD, wide?.17:.075);
    const r = (wide? 2.2+rD()*3 : .5+rD()*1.4)*deg, al = wide? .018+rD()*.02 : .03+rD()*.05, tone = rD();
    dust.push({d, lon:lonOf(d), lat:latOf(d), r, col: tone<.5 ? `rgba(175,190,235,${al.toFixed(3)})` : `rgba(235,215,190,${al.toFixed(3)})`});
  }
  const NEB = [[225,110,150],[90,175,210],[150,110,225],[230,160,95],[110,210,160]];
  const nebs = [];
  for(let i=0;i<P.nebulae;i++){
    const d0 = rN()<.7 ? plane(rN,.1) : sphere(rN), r0 = (3+rN()*6)*deg, c = pick(rN,NEB), al = .09+rN()*.1;
    const blobs = 3+Math.floor(rN()*4);
    for(let k=0;k<blobs;k++){
      const d = norm([d0[0]+gauss(rN)*r0*.55, d0[1]+gauss(rN)*r0*.55, d0[2]+gauss(rN)*r0*.55]);
      nebs.push({d, lon:lonOf(d), lat:latOf(d), r:r0*(.4+rN()*.5), c, al:al*(.6+rN()*.6)});
    }
  }

  // constellations
  const consts = [], used = new Uint8Array(stars.length);
  const cands = order.filter(i=>stars[i].mag<4.8);
  const N = P.consts;
  const figs = shuffle(rL, FIGURES), cultures = CULTURES[P.style]||CULTURES.celeste;
  if(N>0){
    const cmin = Math.min(P.cmin,P.cmax), cmax = Math.max(P.cmin,P.cmax);
    let minSep = .85*Math.sqrt(4*Math.PI/N);
    const anchors = [];
    for(let pass=0; pass<3 && anchors.length<N; pass++){
      const cs = Math.cos(minSep);
      for(const i of cands){ if(anchors.length>=N) break; if(pass===0 && rC()<.25) continue;
        if(anchors.includes(i)) continue;
        if(anchors.every(j=>dot(stars[j].d,stars[i].d)<cs)) anchors.push(i); }
      minSep *= .75;
    }
    const rad = Math.min(.45, .85*Math.sqrt(4*Math.PI/N)*.55), cosR = Math.cos(rad);
    for(const ai of anchors){
      const A = stars[ai]; if(used[ai]) continue;
      const pool = cands.filter(j=>j!==ai && !used[j] && dot(stars[j].d,A.d)>cosR);
      const k = cmin + Math.floor(rC()*(cmax-cmin+1));
      const m = [ai, ...pool.slice(0,k-1)];
      if(m.length<3) continue;
      const inT = [m[0]], out = m.slice(1), edges = [];
      while(out.length){ let best=-2, bi=0, bo=0;
        for(const x of inT) for(let o=0;o<out.length;o++){ const v=dot(stars[x].d,stars[out[o]].d); if(v>best){best=v;bi=x;bo=o;} }
        edges.push([bi,out[bo]]); inT.push(out[bo]); out.splice(bo,1); }
      if(m.length>=4 && rC()<.4){ let best=-2, pr=null;
        for(let x=0;x<m.length;x++) for(let y=x+1;y<m.length;y++){ const p=m[x],q=m[y];
          if(edges.some(e=>(e[0]===p&&e[1]===q)||(e[0]===q&&e[1]===p))) continue;
          const v=dot(stars[p].d,stars[q].d); if(v>best){best=v;pr=[p,q];} }
        if(pr) edges.push(pr); }
      const ci = consts.length, nm = constName(rW,st);
      m.forEach(j=>{used[j]=1; stars[j].c=ci;});
      const byMag = [...m].sort((x,y)=>stars[x].mag-stars[y].mag);
      byMag.forEach((j,g)=>{ if(g<GREEK.length){ stars[j].greek = GREEK[g]; stars[j].desig = GREEK[g]+' '+nm.gen; } });
      let cx=0,cy=0,cz=0; m.forEach(j=>{cx+=stars[j].d[0];cy+=stars[j].d[1];cz+=stars[j].d[2];});
      const center = norm([cx,cy,cz]);
      const fg = figs[ci%figs.length];
      consts.push({name:nm.name, gen:nm.gen, members:m, alpha:byMag[0], edges, d:center, lon:lonOf(center), lat:latOf(center),
        fig: fg[0], cat: fg[1], culture: pick(rL,cultures), meaning: pick(rL,C_MEAN), story: pick(rL,C_STORY).replace(/\{n\}/g, m.length)});
      assignParts(consts[ci], stars);
    }
  }
  // noms propres et légendes des étoiles
  const taken = new Set();
  for(const i of order){ const s = stars[i];
    const alpha = s.desig && s.desig.startsWith('α');
    if(s.mag<2.3 || alpha){ let nm, tries=0; do{ nm = starName(rW,st); tries++; } while(taken.has(nm) && tries<20); taken.add(nm); s.name = nm;
    }
  }
  { let rk=0; for(const i of order){ stars[i].rank = ++rk; } }
  for(const i of order){ const s=stars[i]; if(s.name) chooseStarLore(s, rL); }

  // planètes visibles
  const rP = R('planets'), rPN = R('pnames');
  const ecl = mkPlane(rP, (15+rP()*35)*deg);
  const HOME = ['gazeuse','glacegeante','desert','brulee','tempere','glace','lave','ocean','gazeuse'];
  for(let k=0;k<P.planets;k++){
    const d = ecl.pt(rP,.035), type = pick(rP,HOME), mag = -2.8+rP()*3.8;
    let nm, tries=0; do{ nm = starName(rPN,st,true); tries++; } while(taken.has(nm) && tries<20); taken.add(nm);
    stars.push({i:stars.length, kind:'planet', d, lon:lonOf(d), lat:latOf(d), mag, t:0, col:PTYPES[type].sky, name:nm, ptype:type, pkey:'hp|'+k, c:-1, ph:0, sp:0});
  }
  // galaxies lointaines
  const rX = R('gals'), rXN = R('gnames');
  const GT = ['spirale','spirale','barree','elliptique','lenticulaire','irreguliere'];
  for(let k=0;k<P.galaxies;k++){
    let d = sphere(rX); for(let t=0;t<20 && Math.abs(dot(d,gp.n))<.35;t++) d = sphere(rX);
    const gtype = pick(rX,GT);
    const q = gtype==='elliptique' ? .6+rX()*.35 : .25+rX()*.6;
    const nm = GTYPES[gtype].word+' de '+starName(rXN,st,true);
    stars.push({i:stars.length, kind:'galaxy', d, lon:lonOf(d), lat:latOf(d), mag:3.8+rX()*1.4, t:0, col:(gtype==='elliptique'||gtype==='lenticulaire')?[255,225,185]:[205,215,255],
      name:nm, gtype, size:(.6+rX()*1.6)*deg, pa:rX()*Math.PI, q, gkey:'gx|'+k,
      distMly: 2+Math.pow(rX(),1.5)*120, diamKly: 20+rX()*180, nStars: Math.round(10*Math.pow(100,rX())), c:-1, ph:0, sp:0});
  }
  order = stars.map((s,i)=>i).sort((x,y)=>stars[x].mag-stars[y].mag);

  for(const o of stars){ o.d0=o.d; o.eq=toEq(o.d); o.name0=o.name; }
  for(const o of dust){ o.d0=o.d; o.eq=toEq(o.d); }
  for(const o of nebs){ o.d0=o.d; o.eq=toEq(o.d); }
  for(const c of consts){ c.d0=c.d; c.eq=toEq(c.d); c.name0=c.name; }
  // voisinages et faits vérifiés pour les légendes
  const rR = R('relations');
  const brightest = order.find(i=>stars[i].kind==='star');
  consts.forEach((c,ci)=>{
    let best=-1, bd=-2; consts.forEach((o,oi)=>{ if(oi===ci) return; const v=dot(o.d,c.d); if(v>bd){ bd=v; best=oi; } });
    c.neighbor = best; c.relation = best>=0 ? relText(c, consts[best], rR) : null;
    const spread = Math.max(...c.members.map(j=>Math.acos(clamp(dot(stars[j].d,c.d),-1,1))));
    c.hasNeb = nebs.some(n=>Math.acos(clamp(dot(n.d,c.d),-1,1))<spread);
    const gx = stars.find(g=>g.kind==='galaxy' && Math.acos(clamp(dot(g.d,c.d),-1,1))<spread*1.1); c.galaxy = gx ? gx.i : -1;
    c.inMilky = Math.abs(dot(c.d, gp.n)) < .12;
    c.hasBrightest = c.members.includes(brightest);
    c.size = c.members.length;
  });
  const sizes = consts.map(c=>c.size); sky_maxSize = Math.max(0,...sizes); sky_minSize = Math.min(99,...sizes);
  const hills = [rH()*TAU, rH()*TAU, rH()*TAU, rH()*TAU];
  const skyName = 'Ciel de ' + starName(mulberry32(hashStr(P.seed+'|title')), st, true);
  return {stars, order, dust, nebs, consts, hills, name:skyName, st, lang: LANGS[P.style]||LANGS.celeste, maxSize:sky_maxSize, minSize:sky_minSize, gpn:gp.n};
}
function hillAlt(az){ const h=sky.hills, A=sky.hillAmp||1; return deg*Math.max(.12, A*(1.3+.9*Math.sin(2*az+h[0])+.6*Math.sin(5*az+h[1])+.35*Math.sin(11*az+h[2])+.18*Math.sin(29*az+h[3]))); }
const physCache = new Map();
function physOf(i){ const st=sky.stars[i]; if(st.phys) return st.phys; const k=P.seed+'|'+P.style+'|'+i; if(!physCache.has(k)) physCache.set(k, starPhysics({t:st.t, mag:st.mag0??st.mag}, rngFor('phys|'+i))); return physCache.get(k); }

function partSentence(s, c){ const lp=localPeople(); if(lp){ const cn=getCN(lp,s.c); return `Pour ${lp.name}, elle fait partie ${deArt(cn.fig)}, qu’ils nomment ${cn.name}.`; } return s.part ? `Elle marque ${s.part} ${deArt(c.fig)}.` : `Elle fait partie ${deArt(c.fig)}.`; }
function starText(s, raw){
  if(!raw && s.customDesc) return s.customDesc;
  if(sky.earth) return earthStarText(s);
  const parts=[], full = D.legend!=='court';
  const c = s.c>=0 ? sky.consts[s.c] : null;
  if(s.name && s.meaning) parts.push(`Dans ${sky.lang}, ${s.name} signifie « ${s.meaning} ».`);
  if(c) parts.push(partSentence(s,c));
  if(s.name && s.lore && full) parts.push(s.lore);
  if(full && s.kind==='star' && s.rank<=10) parts.push(s.rank===1 ? 'C’est l’étoile la plus brillante de tout le ciel.' : `C’est la ${s.rank}e étoile la plus brillante du ciel.`);
  return parts.join(' ');
}
function constText(c, raw){
  if(!raw && c.customDesc) return c.customDesc;
  if(c.realDesc) return c.realDesc;
  const a = sky.stars[c.alpha], full = D.legend!=='court';
  const t=[`${c.name} représente ${c.fig}. Pour ${c.culture}, son nom veut dire « ${c.meaning} ».`];
  if(full) t.push(c.story);
  t.push(a.part ? `Son étoile la plus brillante, ${a.name||a.desig}, en marque ${a.part}.` : `Son étoile la plus brillante est ${a.name||a.desig}.`);
  if(full){
    if(c.hasBrightest) t.push('Elle abrite l’étoile la plus brillante de tout le ciel.');
    if(c.size===sky.maxSize && sky.maxSize>sky.minSize) t.push(`Avec ses ${c.size} étoiles, c’est l’une des plus grandes figures du ciel.`);
    else if(c.size===sky.minSize && sky.maxSize>sky.minSize) t.push(`Avec seulement ${c.size} étoiles, c’est l’une des plus modestes figures du ciel.`);
    if(c.inMilky) t.push('Elle baigne dans la lueur de la voie lactée.');
    if(c.hasNeb) t.push('Une nébuleuse colorée flotte entre ses étoiles ; on y voyait la fumée d’un feu très ancien.');
    if(c.galaxy>=0) t.push(`Tout près d’elle se cache ${sky.stars[c.galaxy].name}, une galaxie lointaine visible comme une petite tache floue.`);
    if(c.neighbor>=0){ const B=sky.consts[c.neighbor]; t.push(`Sa voisine, ${B.name}, représente ${B.fig}. ${c.relation}`); }
  }
  return t.join(' ');
}
function visibilityOf(o){
  const phi=obsLat()*deg, dec=Math.asin(clamp(o.eqz ?? (o.eq?o.eq[2]:0),-1,1));
  if(phi>=0){ if(dec>Math.PI/2-phi) return 'Ne se couche jamais d’ici'; if(dec<-(Math.PI/2-phi)) return 'Jamais visible d’ici'; }
  else { if(dec<-(Math.PI/2+phi)) return 'Ne se couche jamais d’ici'; if(dec>Math.PI/2+phi) return 'Jamais visible d’ici'; }
  return 'Se lève et se couche';
}

const SUN_TXT='Notre étoile, autour de laquelle tourne la Terre. Ne la regarde jamais directement, et encore moins avec des jumelles ou un télescope sans filtre adapté : sa lumière peut abîmer la vue en quelques secondes.';
const MOON_TXT='Le satellite naturel de la Terre, à environ 384 400 km. Elle nous montre toujours la même face, et ses phases dépendent de la position du Soleil qui l’éclaire.';
function cardDesc(s, raw){
  if(!raw && s.customDesc) return s.customDesc;
  if(s.homeStar) return `${s.name}, ${sky.earth?'notre Soleil':'ton soleil'}, vu d’ici comme une simple étoile à ${fmtLy(s.vdist||0)}. Toute l’histoire de ${homeName()} tient dans ce petit point de lumière.`;
  if(s.fobj && s.kind==='moon') return s.mdata.desc || '';
  if(s.kind==='comet'){ const cs=cometState(); return `${s.name} ne revient que tous les ${cs.c.period} ans. Sa queue, toujours tournée à l’opposé du soleil, s’étire loin dans le ciel. Les peuples y voient le présage ${pick(mulberry32(hashStr(s.name)),['de la chute d’un roi','d’une grande récolte','d’une guerre prochaine','de la naissance d’un héros'])}.`; }
  if(s.fobj && s.kind==='sun'){ const F=currentFrame(); return F && F.kind==='surface' ? `${s.name} vu depuis ${F.name}. ${F.suns[0].size<.2?'À cette distance, il paraît bien plus petit que depuis chez toi.':F.suns[0].size>1.5?'Si proche, il occupe une large part du ciel.':''}` : `${s.name}, le soleil de ${world.name}.`; }
  if(s.fobj && s.kind==='sun2') return `${s.name}, le second soleil, plus petit et plus rouge. Il accompagne ${sky.fsun?sky.fsun.name:'le soleil'} dans le ciel.`;
  if(s.fobj && s.kind==='planet') return s.body.desc || PT_TEXT[s.body.type] || '';
  if(s.kind==='sun') return SUN_TXT; if(s.kind==='moon') return MOON_TXT;
  if(s.realDesc) return s.realDesc;
  if(s.kind==='planet') return `${s.name} n’est pas une étoile : c’est une planète de notre propre système. Sa lumière ne scintille pas et elle se déplace lentement parmi les constellations. ${PT_TEXT[s.ptype]}`;
  if(s.kind==='galaxy'){ const g=GTYPES[s.gtype]; return `À l’œil nu, ce n’est qu’une petite tache floue. En réalité, c’est une ${g.label} située à environ ${fr(s.distMly,0)} millions d’années-lumière. ${g.txt}`; }
  return starText(s, true);
}
const keyOfStar = s => s.kind==='planet' ? s.pkey : s.kind==='galaxy' ? s.gkey : 's'+s.i;
function applyEdits(){
  if(!sky || sky.earth) return;
  for(const s of sky.stars){ const e=E[keyOfStar(s)]; s.name=(e&&e.name)||s.name0; s.customDesc=(e&&e.desc)||null; }
  sky.consts.forEach((c,ci)=>{ const e=E['c'+ci]; c.name=(e&&e.name)||c.name0; c.customDesc=(e&&e.desc)||null;
    for(const j of c.members){ const s=sky.stars[j]; if(s.greek) s.desig = s.greek+' '+((e&&e.name)?c.name:c.gen); } });
  objCache.clear(); dirty=true;
}
const editsToArr = () => JSON.parse(JSON.stringify(Object.entries(E).map(([k,v])=>({k, name:v.name, desc:v.desc}))));
const editsFromArr = a => { const o={}; (Array.isArray(a)?a:[]).forEach(x=>{ if(x && x.k) o[x.k]={name:x.name||undefined, desc:x.desc||undefined}; }); return o; };

/* ---------- heure de la nuit ---------- */
const smooth = x => { x=clamp(x,0,1); return x*x*(3-2*x); };
function dayness(h){ return h<24 ? 1-smooth((h-18)/2.6) : smooth((h-28.4)/2.6); }
function sunDir(){ if(sky && sky.fsun && sky.fsun.d) return sky.fsun.d; if(sky && sky.earth) return sky.sun.d; const h=view.hour; return h<24 ? dirOf(285*deg, -clamp((h-18)*4,1,40)*deg) : dirOf(75*deg, -clamp((31-h)*4,1,40)*deg); }
function skyDay(){ return sky ? (sky.day||0) : 0; }
function applyTime(){
  if(!sky) return;
  if(sky.surface){ frameApplyTime(sky.surface); return; }
  if(sky.earth){ earthApplyTime(); if(sky.space){ sky.day=0; sky.day2=0; } return; }
  if(sky.frame){ frameApplyTime(sky.frame); return; }
  const th=(view.hour-24)*15*deg + (obsLon()||0)*deg, c=Math.cos(th), sn=Math.sin(th);
  const phi=obsLat()*deg, sf=Math.sin(phi), cf=Math.cos(phi);
  const rot = o => { const e=o.eq, a=e[0]*c+e[1]*sn, b=-e[0]*sn+e[1]*c;
    const d=[b, a*cf+e[2]*sf, -a*sf+e[2]*cf];
    o.d=d; o.lon=lonOf(d); o.lat=latOf(d); };
  sky.stars.forEach(rot); sky.dust.forEach(rot); sky.nebs.forEach(rot); sky.consts.forEach(rot);
  dirty=true;
}
function mixHex(a,b,t){ const pa=[1,3,5].map(i=>parseInt(a.slice(i,i+2),16)), pb=[1,3,5].map(i=>parseInt(b.slice(i,i+2),16));
  return '#'+pa.map((v,i)=>Math.round(v+(pb[i]-v)*t).toString(16).padStart(2,'0')).join(''); }
const PLAY_SVG = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>';
const PAUSE_SVG = '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2.5" width="3.5" height="11" rx="1"/><rect x="9.5" y="2.5" width="3.5" height="11" rx="1"/></svg>';
function syncTime(){
  const e = P.mode==='earth' && !(sky && sky.surface), tr=$('tRange'); tr.min=0; tr.max=24; tr.value=view.hour;
  const hh=Math.floor(view.hour)%24, mm=Math.floor((view.hour%1)*60+1e-6);
  const b=sky&&sky.day||0, b2=sky&&sky.day2||0;
  const state = sky && sky.space ? 'dans l’espace' : b2>.5 ? 'jour' : b>.03 ? (view.hour<12?'aube':'crépuscule') : 'nuit';
  let state2=state; if(sky && !sky.space){ const sh=showerActivity().filter(x=>x.I>.35).sort((a,b)=>b.I-a.I)[0]; if(sh && b<.35) state2+=', pluie des '+sh.name; if(D.weather && (sky.earth || world)){ const wx=weatherNow(); if(wx) state2+=', '+wx.word; } }
  const tm=`<b>${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}</b>`;
  if(e){ $('tDate').value=view.date||todayStr(); $('tLabel').innerHTML=`${tm} ${state2}`; }
  else { const dt2=fmtGenDate(true); $('tLabel').innerHTML=`${tm} ${dt2 ? dt2+(state2!==state?state2.slice(state.length):'') : state2}`; }
  $('tDate').hidden=!e; $('tNow').hidden=!e;
  if($('panelCal').classList.contains('open')) renderCalendar();
}
function updatePlay(){ $('tPlay').innerHTML = playing ? PAUSE_SVG : PLAY_SVG; $('tPlay').setAttribute('aria-label', playing?'Arrêter le temps':'Faire avancer le temps'); }
$('tRange').addEventListener('input',()=>{ view.hour=+$('tRange').value; applyTime(); syncTime(); });
$('tDate').addEventListener('change',()=>{ if($('tDate').value){ view.date=$('tDate').value; applyTime(); syncTime(); } });
$('tNow').onclick=()=>{ const n=new Date(); view.date=todayStr(); view.hour=n.getHours()+n.getMinutes()/60; applyTime(); syncTime(); };
$('tPlay').onclick=()=>{ playing=!playing; updatePlay(); };
