/* Atlas des ciels imaginaires — Monde de jeu : astres, calendrier, peuples, voyages, carte 3D
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ================= monde de jeu : astres, calendrier, peuples ================= */
const MOON_LORE = ['Les pêcheurs règlent leurs sorties sur ses marées.','Sa pleine lune ouvre les grandes foires.','On dit qu’elle garde les âmes des marins disparus.','Les chasseurs attendent sa lune nouvelle pour partir en forêt.','Les enfants nés sous sa pleine lune passent pour chanceux.','Sa lumière pâle passe pour éloigner les loups.','Les sorciers cueillent leurs herbes lorsqu’elle est pleine.'];
const SEASONS_N = ['printemps','été','automne','hiver'];
const hexToRgb = h => [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const fmtLy = d => (d<20 ? fr(d,1) : fr(Math.round(d),0))+' années-lumière';
function starLabel(s){ return s.name || s.desig || (s.hip ? 'HIP '+s.hip : 'Étoile n° '+(s.i+1)); }

function makeHomeFrame(worldName){
  const r = rngFor('frame|'+P.wvar), st = sky.st, nm = () => cap(starName(r,st,true));
  const sunName = nm();
  const suns=[{name:sunName, col:[255,244,214], size:.53}];
  if(P.wsuns>=2) suns.push({name:nm(), col:[255,176,128], size:.22, off:(35+r()*70)*deg});
  const moons=[]; let d=22+r()*30;
  for(let k=0;k<P.wmoons;k++){
    const rad=500+r()*1600, days=TAU*Math.sqrt(Math.pow(d*6371,3)/398600)/86400, mt=pick(r,Object.keys(MOON_T));
    moons.push({name:nm(), radiusKm:rad, dist:d, period:days, phase:r(), incl:(1+r()*7)*deg, node:r()*TAU, col:MOON_T[mt], mtype:mt, size:2*rad/(d*6371)/deg, lore:pick(r,MOON_LORE)});
    d*=1.5+r()*1.1; }
  moons.forEach((m,k)=>{ m.desc = `${m.name} est ${P.wmoons===1?'la lune':k===0?'la plus proche des lunes':'l’une des lunes'} de ${worldName}. Elle en fait le tour en ${periodText(m.period)} et mesure ${fr(Math.round(m.radiusKm),0)} km de rayon. ${m.lore}`; });
  return {kind:'home', name:worldName, tilt:P.wtilt*deg, yearLen:Math.max(10,Math.round(P.wyear)), dayH:24, suns, moons, planets:[], rings:null, homeSunName:sunName};
}

/* ---------- objets du cadre (soleils, lunes, planètes vues depuis la surface) ---------- */
function attachFrame(F){
  if(sky.baseCount===undefined) sky.baseCount=sky.stars.length;
  sky.stars.length = sky.baseCount; sky.fobjs=[]; sky.frame=F;
  const push=o=>{ o.i=sky.stars.length; o.fobj=true; o.c=-1; o.ph=0; o.sp=0; o.t=o.t||0; o.name0=o.name; sky.stars.push(o); sky.fobjs.push(o); return o; };
  sky.homeStarObj = push({kind:'star', homeStar:true, name: sky.earth ? 'Soleil' : (world && world.frame ? world.frame.homeSunName : 'Ton soleil'), mag:99, mag0:99, col:[255,244,214], t:.18, phys:{kind:'naine jaune', dist:0, lum:1, cls:'G', temp:5772}});
  sky.fsun=null;
  if(F){
    const sun=push({kind:'sun', fk:'sun', name:F.suns[0].name, col:F.suns[0].col, sizeDeg:F.suns[0].size, mag:-26}); sky.fsun=sun;
    if(F.suns[1]) push({kind:'sun2', fk:'sun2', name:F.suns[1].name, col:F.suns[1].col, sizeDeg:F.suns[1].size, off:F.suns[1].off, mag:-20});
    for(const m of F.moons) push({kind:'moon', fk:'moon', name:m.name, period:m.period, phase:m.phase, incl:m.incl, node:m.node, col:m.col, sizeDeg:m.size, mag:-10, sunRef:sun, mdata:m, illum:.5});
    if(F.kind==='home' && worldComet()) push({kind:'comet', fk:'comet', name:worldComet().name, mag:0, col:[210,230,255], cvis:false});
    for(const q of (F.planets||[])) push({kind:'planet', fk:'planet', name:q.name, ptype:q.type, body:q, col:PTYPES[q.type].sky, mag:2});
  }
  sky.order = sky.stars.map((s,i)=>i).sort((x,y)=>sky.stars[x].mag-sky.stars[y].mag);
  calCache=null;
}
function frameApplyTime(F){
  const Y=F.yearLen, t=(view.gday||0)+view.hour/24, eps=F.tilt, ce=Math.cos(eps), se=Math.sin(eps);
  const lamS=Math.PI+TAU*t/Y, th=TAU*(view.hour/24-1)+obsLon()*deg+TAU*t/Y;
  const c=Math.cos(th), sn=Math.sin(th), phi=obsLat()*deg, sf=Math.sin(phi), cf=Math.cos(phi);
  const ecl=(lam,bet)=>{ const cb=Math.cos(bet), x=cb*Math.cos(lam), y=cb*Math.sin(lam), z=Math.sin(bet); return [x, y*ce-z*se, y*se+z*ce]; };
  for(const o of sky.fobjs||[]){
    if(o.fk==='sun') o.cel=ecl(lamS,0);
    else if(o.fk==='sun2') o.cel=ecl(lamS+o.off,0);
    else if(o.fk==='moon'){ const lam=lamS+TAU*(t/o.period+o.phase), bet=o.incl*Math.sin(lam-o.node); o.cel=ecl(lam,bet); const el=lam-lamS; o.illum=(1-Math.cos(el)*Math.cos(bet))/2; o.waxing=((el%TAU)+TAU)%TAU<Math.PI; }
    else if(o.fk==='comet'){ const stc=cometState(); if(stc && stc.visible){ const cc=stc.c, lam=lamS+cc.side*(20+40*Math.abs(stc.u))*deg, bet=cc.beta*(1-.4*Math.abs(stc.u)); o.cel=ecl(lam,bet); o.mag=-1+4*Math.abs(stc.u); o.cvis=true; } else { o.cel=null; o.d=null; o.cvis=false; } }
    else if(o.fk==='planet'){ const td=t*F.dayH/24, h=F.home, q=o.body;
      const pa=h.angle0+TAU*td/h.period, qa=q.angle0+TAU*td/q.period;
      const dx=q.a*Math.cos(qa)-h.a*Math.cos(pa), dy=q.a*Math.sin(qa)-h.a*Math.sin(pa), dd=Math.hypot(dx,dy)||1e-3;
      o.cel=ecl(lamS+Math.atan2(dy,dx)-(pa+Math.PI),0); o.distAU=dd;
      o.mag=clamp(-4-5*Math.log10(Math.max(.05,q.radius))+5*Math.log10(q.a*dd),-5,8); }
  }
  const rot=o=>{ const e=o.cel||(sky.earth?o.eqv:o.eq); if(!e) return; const a=e[0]*c+e[1]*sn, b=-e[0]*sn+e[1]*c;
    const d=[b, a*cf+e[2]*sf, -a*sf+e[2]*cf]; o.d=d; o.lon=lonOf(d); o.lat=latOf(d); o.eqz=e[2]; };
  sky.stars.forEach(rot); sky.dust.forEach(rot); sky.nebs.forEach(rot); sky.consts.forEach(rot);
  sky.ringCurves=null;
  if(F.rings && !sky.space){
    const zen=[cf*c, cf*sn, sf], curves=[];
    for(let k=0;k<=6;k++){ const rr=F.rings.inner+(F.rings.outer-F.rings.inner)*k/6, pts=[];
      for(let a=0;a<=360;a+=3){ const v=[rr*Math.cos(a*deg)-zen[0], rr*Math.sin(a*deg)-zen[1], -zen[2]], n=Math.hypot(v[0],v[1],v[2]); const o={cel:[v[0]/n,v[1]/n,v[2]/n]}; rot(o); pts.push(o); }
      curves.push(pts); }
    sky.ringCurves=curves;
  }
  const alt = sky.fsun && !sky.space ? sky.fsun.lat : -1;
  sky.day = sky.space ? 0 : smooth((alt+13*deg)/(13*deg)); sky.day2 = sky.space ? 0 : smooth((alt+1*deg)/(9*deg));
  if(!sky.space) eclipseCheck(F);
  dirty=true;
}
function drawRingArc(pov){
  const cv2=sky.ringCurves, F=sky.surface; if(!cv2||!F) return;
  const al=[.3,.55,.22,.5,.28,.42];
  for(let k=0;k<cv2.length-1;k++){
    ctx.fillStyle=`rgba(${F.rings.col},${al[k%6]*(F.rings.a||1)})`;
    const A=cv2[k], B=cv2[k+1];
    for(let j=0;j<A.length-1;j++){
      const q=[A[j],A[j+1],B[j+1],B[j]], pts=[]; let ok=true;
      for(const o of q){ if(pov) projP(o.d); else projM(o.lon,o.lat); if(!pf){ ok=false; break; } pts.push([px,py]); }
      if(!ok) continue; if(!pov && Math.abs(pts[0][0]-pts[1][0])>W/2) continue;
      ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); for(let m=1;m<4;m++) ctx.lineTo(pts[m][0],pts[m][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle=ctx.fillStyle; ctx.lineWidth=.8; ctx.stroke();
    }
  }
}

/* ---------- calendrier ---------- */
let calCache=null;
function currentFrame(){ return sky ? (sky.surface || sky.frame) : null; }
function computeCalendar(){
  const F=currentFrame(); if(!F) return null;
  if(calCache && calCache.F===F && calCache.lp===calPeopleObj() && calCache.year===view.year) return calCache;
  const Y=Math.max(1,Math.round(F.yearLen)), eps=F.tilt, ce=Math.cos(eps), se=Math.sin(eps);
  const eclOf=v=>{ const x=v[0], y=v[1]*ce+v[2]*se, z=-v[1]*se+v[2]*ce; return [Math.atan2(y,x), Math.asin(clamp(z,-1,1))]; };
  const dayOfLam = lam => { let f=((lam-Math.PI)/TAU)%1; if(f<0) f+=1; return f*Y; };
  const cands = sky.consts.map((c,ci)=>{ const base=sky.earth?c.eqv:c.eq; if(!base) return null; const [l,b]=eclOf(base); return {ci,l,b}; }).filter(Boolean).sort((a,b)=>Math.abs(a.b)-Math.abs(b.b));
  let zod=cands.filter(z=>Math.abs(z.b)<24*deg); if(zod.length<6) zod=cands.slice(0,Math.min(6,cands.length)); if(zod.length>13) zod=zod.slice(0,13);
  zod.sort((a,b)=>a.l-b.l);
  const n=zod.length, months=[];
  if(n){
    const w=zod.map((z,k)=>{ const nx=zod[(k+1)%n]; let d=((nx.l-z.l)%TAU+TAU)%TAU; if(n===1) d=TAU; return d; });
    zod.forEach((z,k)=>{ const wp=w[(k-1+n)%n]; const lo=z.l-wp/2; const len=(wp+w[k])/2/TAU*Y; months.push({ci:z.ci, start:dayOfLam(lo), lenF:len}); });
    months.sort((a,b)=>a.start-b.start);
    months.forEach((m,k)=>{ m.s=Math.round(m.start)%Y; }); months.forEach((m,k)=>{ const nx=months[(k+1)%months.length]; m.len = months.length===1 ? Y : ((nx.s-m.s)%Y+Y)%Y || Y; });
  }
  const north = obsLat()>=0;
  const fest=[];
  const seasonDays=[[Y/2,'Équinoxe de printemps','Les jours et les nuits ont la même durée ; la saison claire commence.'],[3*Y/4,'Solstice d’été','Le jour le plus long de l’année.'],[0,'Équinoxe d’automne','Les nuits rattrapent les jours.'],[Y/4,'Solstice d’hiver','La nuit la plus longue de l’année.']];
  seasonDays.forEach(([d,nm,tx],k)=>{ const kk = north ? k : (k+2)%4; fest.push({day:Math.round(seasonDays[kk][0])%Y, name:nm, text:tx}); });
  const lp=calPeopleObj(), culture = lp ? lp.name : (sky.consts[0] && sky.consts[0].culture) || 'les anciens';
  const bright = sky.stars.filter(s=>s.kind==='star' && !s.fobj && s.name && s.mag<1.8).sort((a,b)=>a.mag-b.mag).slice(0,5);
  for(const s of bright){ const base=sky.earth?s.eqv:s.eq; if(!base) continue; const [l]=eclOf(base);
    fest.push({day:Math.round(dayOfLam(l+18*deg))%Y, name:'Retour de '+s.name, text:`${cap(culture)} fêtent le retour de ${s.name}${s.meaning?', « '+s.meaning+' »':''}, lorsqu’elle réapparaît à l’aube après des semaines d’absence.`}); }
  if(F.moons && F.moons.length>=2){ let best=0, bv=-1; for(let d=0;d<Y;d++){ let mn=1; for(const m of F.moons){ const il=(1-Math.cos(TAU*(d/m.period+m.phase)))/2; mn=Math.min(mn,il); } if(mn>bv){ bv=mn; best=d; } }
    fest.push({day:best, name:`Nuit des ${F.moons.length} lunes`, text:`Toutes les lunes sont presque pleines en même temps : une nuit si claire qu’on y lit sans lampe.`}); }
  if(lp){ const cv=civOf(lp.key); fest.push({day:hashStr(lp.name)%Y, name:'Fondation de '+(lp.capital?lp.capital.name:'la capitale'), text:`${cap(lp.name)} célèbrent la fondation de ${lp.capital?lp.capital.name:'leur capitale'} par ${cv.founder}, avec des processions aux flambeaux.`}); }
  for(const e of eclipsesOfYear(F)) fest.push(e);
  if(!sky.surface){ for(const s2 of worldShowers()) fest.push({day:Math.round(s2.day)%Y, hour:2, name:'Pluie des '+s2.name, text:`Des dizaines d’étoiles filantes par heure semblent jaillir de ${constDisplayName(s2.ci)}.`});
    const cs=cometState(); if(cs && cs.next===(view.year||1)) fest.push({day:cs.c.peak%Y, hour:21, name:'Passage de la '+cs.c.name, text:`La ${cs.c.name} revient cette année ; elle reste visible plusieurs semaines autour de cette date.`}); }
  const eqD=Math.round(north?Y/2:0)%Y; let y0=0, mi0=0;
  months.forEach((m,k)=>{ if(((eqD-m.s)%Y+Y)%Y < m.len){ y0=m.s; mi0=k; } });
  const ordered=months.slice(mi0).concat(months.slice(0,mi0));
  fest.sort((a,b)=>((a.day-y0+Y)%Y)-((b.day-y0+Y)%Y));
  calCache={F, lp, Y, months:ordered, fest, north, y0, year:view.year};
  return calCache;
}
function monthName(m){ const lp=calCache?calCache.lp:null; return lp ? getCN(lp,m.ci).name : sky.consts[m.ci].name; }
function yearLabel(){ const lp=calCache?calCache.lp:null; if(lp && world && world.peoples){ const cv=civOf(lp.key); return `${cv.era0+(view.year||1)-1} de l’ère de ${lp.capital?lp.capital.name:'la fondation'}`; } return String(view.year||1); }
function dateParts(){
  const cal=computeCalendar(); if(!cal || !cal.months.length) return null;
  const Y=cal.Y, d=((Math.floor(view.gday||0)%Y)+Y)%Y;
  let mi=0; for(let k=0;k<cal.months.length;k++){ const m=cal.months[k]; if(((d-m.s)%Y+Y)%Y < m.len){ mi=k; break; } }
  const m=cal.months[mi]; return {Y, d, mi, m, dim:((d-m.s)%Y+Y)%Y+1, doy:((d-cal.y0)%Y+Y)%Y};
}
function seasonNow(){ const F=currentFrame(); if(!F) return ''; const Y=F.yearLen, t=(view.gday||0)+view.hour/24; const lam=((Math.PI+TAU*t/Y)%TAU+TAU)%TAU; let q=Math.floor(lam/(Math.PI/2))%4; if(obsLat()<0) q=(q+2)%4; return SEASONS_N[q]; }
function fmtGenDate(short){ const p=dateParts(); if(!p) return ''; return short ? `${p.dim} ${monthName(p.m)}` : `${p.dim} ${monthName(p.m)}, an ${view.year||1}`; }
function renderCalendar(){
  const cal=computeCalendar(), F=currentFrame(); if(!cal||!F) return;
  fillCalPeopleSelect(); const lpc=cal.lp; $('calTitle').textContent = lpc ? 'Calendrier '+lpc.name.replace(/^les /,'des ') : 'Calendrier de '+F.name;
  const p=dateParts();
  $('calNow').textContent = p ? `Nous sommes le ${p.dim} ${monthName(p.m)} de l’an ${yearLabel()}, en ${seasonNow()}. L’année compte ${cal.Y} jours répartis en ${cal.months.length} mois, qui portent le nom des constellations que traverse ${F.suns[0].name}.` : '';
  const cd=$('calDay'); cd.max=cal.Y-1; cd.value=p?p.doy:0; $('calDayO').textContent='jour '+((p?p.doy:0)+1)+' sur '+cal.Y;
  const ul=$('calMonths'); ul.innerHTML='';
  cal.months.forEach((m,k)=>{ const li=document.createElement('li'), b=document.createElement('button');
    b.setAttribute('aria-current', String(p && p.mi===k));
    const dt=document.createElement('span'); dt.className='dot'; dt.style.background='#d8b56a';
    const n=document.createElement('span'); n.className='nm'; n.textContent=monthName(m);
    const ty=document.createElement('span'); ty.className='ty'; ty.textContent=`${m.len} jours`;
    b.append(dt,n,ty); b.onclick=()=>{ view.gday=m.s; applyTime(); syncTime(); renderCalendar(); }; li.append(b); ul.append(li); });
  const fl=$('calFests'); fl.innerHTML='';
  cal.fest.forEach(f=>{ const li=document.createElement('li'), b=document.createElement('button');
    const dt=document.createElement('span'); dt.className='dot'; dt.style.background='#8fb6e8';
    const wrap=document.createElement('span'); wrap.style.cssText='display:flex;flex-direction:column;gap:2px;min-width:0';
    const n=document.createElement('span'); n.className='nm'; n.textContent=f.name;
    const tx=document.createElement('span'); tx.style.cssText='font-size:12.5px;color:var(--ink-soft);line-height:1.35'; tx.textContent=f.text;
    wrap.append(n,tx);
    const ty=document.createElement('span'); ty.className='ty'; const save=view.gday; view.gday=f.day; ty.textContent=fmtGenDate(true); view.gday=save;
    b.append(dt,wrap,ty); b.onclick=()=>{ view.gday=f.day; view.hour=f.hour!=null?f.hour:(f.name.startsWith('Retour')?5.5:22); applyTime(); syncTime(); renderCalendar(); toast(f.name); }; li.append(b); fl.append(li); });
  const as=$('calAstres'); as.innerHTML='';
  const rows=[['Soleil', F.suns.map(s=>s.name).join(' et ')], ['Durée du jour', F.dayH ? fr(F.dayH,1)+' heures' : '24 heures'], ['Inclinaison de l’axe', fr(F.tilt/deg,0)+'°']];
  for(const m of F.moons) rows.push(['Lune '+m.name, 'cycle de '+fr(m.period,1)+' jours']);
  if(!sky.surface){ const cs=cometState(); if(cs) rows.push([cs.c.name, `revient tous les ${cs.c.period} ans, prochain passage en l’an ${cs.next}`]); }
  const dl=document.createElement('dl'); dl.className='facts'; fillFacts(dl, rows); as.append(dl);
}
$('calDay').addEventListener('input',()=>{ const cal=computeCalendar(); view.gday=(+$('calDay').value+cal.y0)%cal.Y; applyTime(); syncTime(); renderCalendar(); });
$('calPrev').onclick=()=>{ const cal=computeCalendar(); if(((view.gday||0)%cal.Y)===cal.y0) view.year=Math.max(1,(view.year||1)-1); view.gday=((view.gday||0)-1+cal.Y)%cal.Y; applyTime(); syncTime(); renderCalendar(); };
$('calNext').onclick=()=>{ const cal=computeCalendar(); view.gday=((view.gday||0)+1)%cal.Y; if(view.gday===cal.y0) view.year=(view.year||1)+1; applyTime(); syncTime(); renderCalendar(); };
$('tLabel').onclick=()=>{ if(P.mode==='earth' && !sky.surface) return; if(openSheet('panelCal')) renderCalendar(); };

/* ---------- corps du monde et système natal ---------- */
function worldBody(){
  return cached('worldbody', ()=>{ const F=world.frame;
    const type = P.wocean>82 ? 'ocean' : P.wtemp<22 ? 'glace' : P.wocean<35 ? 'desert' : 'tempere';
    const p={id:uid(), kind:'planet', name:world.name, type, radius:1, a:1, T:288+(P.wtemp-50)*.3, period:F.yearLen, seedN:hashStr(world.name), angle0:0, rings:null, isHome:true, desc:world.desc};
    p.moons=F.moons.map(m=>({id:uid(), kind:'moon', name:m.name, mtype:m.mtype, radiusKm:m.radiusKm, dist:m.dist, period:m.period, angle0:m.phase*TAU, col:m.col, parent:world.name, desc:m.desc}));
    return p; });
}
function homeSystem(){
  return cached('homesys', ()=>{ const F=world.frame;
    const star={id:uid(), kind:'sysstar', name:F.homeSunName, phys:{kind:'naine jaune', lum:1, temp:5700, dist:0, mass:1, cls:'G', giant:false}, t:.15, col:[255,244,214], lore:`${F.homeSunName} est le soleil de ${world.name}.`};
    const sys=makeSystem(star, rngFor('homesys|'+P.wvar)); const wb=worldBody();
    if(sys.planets.length){ let bi=0, bd=1e9; sys.planets.forEach((q,k)=>{ const d=Math.abs(Math.log(q.a/sys.hz)); if(d<bd){ bd=d; bi=k; } });
      const q=sys.planets[bi]; wb.a=q.a; wb.angle0=q.angle0; wb.period=365.25*Math.sqrt(Math.pow(q.a,3)); sys.planets[bi]=wb; }
    else { wb.a=sys.hz; wb.period=365.25*Math.pow(sys.hz,1.5); sys.planets.push(wb); }
    if(F.suns[1] && !sys.companion){ const aOut=Math.max(...sys.planets.map(q=>q.a)); sys.companion={id:uid(), kind:'star2', name:F.suns[1].name, t:.6, col:F.suns[1].col, a:aOut*2.6, angle0:1.3, period:365.25*Math.sqrt(Math.pow(aOut*2.6,3)/1.5), desc:`Le second soleil de ${world.name}, plus petit et plus rouge.`}; sys.aMax=Math.max(sys.aMax, aOut*2.6); }
    sys.skyIndex='home'; return sys; });
}

/* ---------- peuples ---------- */
function makePeoples(o){
  const {h,B,dist,lab,cs,rN}=o, K=P.wpeoples|0;
  const map=new Int8Array(WN).fill(-1), list=[];
  if(!K) return {list, map};
  const habW={temperate:1,grass:1,savanna:.8,jungle:.6,steppe:.6,taiga:.5,swamp:.35,desert:.2,colddesert:.2,tundra:.2};
  const hab=c=>{ if(h[c]<0||h[c]>.6) return 0; return (habW[BKEYS[B[c]]]||0)*(dist[c]<=4?1.3:1); };
  const dirC=c=>{ const i=c%WW, j=(c/WW)|0; return [cs.cosLat[j]*cs.sinLon[i], cs.sinLat[j], cs.cosLat[j]*cs.cosLon[i]]; };
  const cand=[]; for(let c=0;c<WN;c+=5){ const v=hab(c); if(v>.45) cand.push(c); }
  if(!cand.length) return {list, map};
  const seeds=[cand[Math.floor(rN()*cand.length)]];
  while(seeds.length<K){ let bc=-1, bv=-1; for(const c of cand){ const d=dirC(c); let md=9; for(const s of seeds) md=Math.min(md,1-dot(d,dirC(s))); const v=md*hab(c)*(.7+rN()*.6); if(v>bv){ bv=v; bc=c; } } if(bc<0) break; seeds.push(bc); }
  const sd=seeds.map(dirC), sl=seeds.map(c=>lab[c]);
  { const cost=new Float64Array(WN).fill(1e9), hc=[], hk=[];
    const hpush=(c,v)=>{ hc.push(c); hk.push(v); let i=hc.length-1; while(i>0){ const pa=(i-1)>>1; if(hk[pa]<=hk[i]) break; [hc[pa],hc[i]]=[hc[i],hc[pa]]; [hk[pa],hk[i]]=[hk[i],hk[pa]]; i=pa; } };
    const hpop=()=>{ const c=hc[0], v=hk[0], lc=hc.pop(), lv=hk.pop(); if(hc.length){ hc[0]=lc; hk[0]=lv; let i=0; for(;;){ const l=2*i+1, rr=l+1; let m=i; if(l<hc.length&&hk[l]<hk[m]) m=l; if(rr<hc.length&&hk[rr]<hk[m]) m=rr; if(m===i) break; [hc[m],hc[i]]=[hc[i],hc[m]]; [hk[m],hk[i]]=[hk[i],hk[m]]; i=m; } } return [c,v]; };
    seeds.forEach((c,k)=>{ cost[c]=0; map[c]=k; hpush(c,0); });
    const limit=700, nz=q=>((Math.imul(q,2654435761)>>>0)%1000)/1000*1.4;
    while(hc.length){ const [c,v]=hpop(); if(v>cost[c]) continue; const i=c%WW, j=(c/WW)|0;
      for(const q of [j*WW+((i+1)%WW), j*WW+((i+WW-1)%WW), j>0?c-WW:-1, j<WH-1?c+WW:-1]){ if(q<0||h[q]<0) continue;
        const bq=BKEYS[B[q]];
        const step=1+(h[q]>.5?5:0)+(B[q]!==B[c]?2.2:0)+((bq==='ice'||bq==='desert'||bq==='colddesert')?.8:0)+nz(q);
        const nv=v+step; if(nv<cost[q] && nv<limit){ cost[q]=nv; map[q]=map[c]; hpush(q,nv); } } } }
  const styles=shuffle(rN,['celeste','nordique','ancien','elfique']);
  const hue0=rN()*360;
  seeds.forEach((sc,k)=>{
    const style=styles[k%4], S=STYLES[style];
    const base=cap((stem(rN,S,1+(rN()<.5?1:0))+pick(rN,S.on)).replace(/(.)\1\1/g,'$1$1'));
    const name='les '+base+pick(rN,['i','ens','ides','ar','im','éens']);
    const col=`hsl(${(hue0+k*360/seeds.length)%360},55%,55%)`;
    const cells=[]; for(let c=0;c<WN;c+=3) if(map[c]===k && hab(c)>.3) cells.push(c);
    const cities=[sc];
    const nc=3+Math.floor(rN()*3);
    for(let t=0;t<200 && cities.length<nc+1 && cells.length;t++){ const c=cells[Math.floor(rN()*cells.length)]; const d=dirC(c);
      if(cities.every(q=>dot(d,dirC(q))<Math.cos(4*deg)) && (dist[c]<=3 || rN()<.5)) cities.push(c); }
    const people={key:k, name, base, style, col, capital:null, cities:[], cn:{}};
    cities.forEach((c,ci)=>{ const bk=BKEYS[B[c]], coast=dist[c]<=2, cap_=ci===0;
      const cname=starName(rN,S,true);
      const env = coast ? pick(rN,['un port animé','une cité portuaire','une ville de pêcheurs']) : {jungle:'une cité noyée dans la jungle',desert:'une oasis fortifiée',colddesert:'une citadelle battue par les vents',taiga:'une ville de bois au milieu des sapins',tundra:'un avant-poste dans les terres froides',savanna:'une cité de terre ocre au milieu de la savane',steppe:'une ville de cavaliers',swamp:'une cité sur pilotis'}[bk] || pick(rN,['une ville de marchés','une cité de pierre','une ville de vallée']);
      const city={kind:cap_?'capital':'city', name:cname, lon:cellLon(c%WW), lat:cellLat((c/WW)|0), size:cap_?3:2, people:k, cell:c,
        desc:`${cname} est une cité ${name.replace(/^les /,'des ')}, ${env}.`};
      if(cap_) city.desc = `${cname} est la capitale ${name.replace(/^les /,'des ')}, ${env}. C’est ici que leurs astronomes ont nommé les constellations.`;
      people.cities.push(city); if(cap_) people.capital=city; o.places.push(city); });
    list.push(people);
  });
  // noms des peuples au centre de leur territoire
  const pts=labelPoints(Int32Array.from(map), list.length, cs);
  list.forEach((p,k)=>{ const pt=pts[k]; if(pt) o.places.push({kind:'people', name:cap(p.name.replace(/^les /,'')), lon:pt.lon, lat:pt.lat, size:9, people:k}); });
  return {list, map};
}
function getCN(p, ci){
  if(p.cn[ci]) return p.cn[ci];
  const r=mulberry32(hashStr(P.seed+'|cn|'+P.wvar+'|'+p.key+'|'+ci)), S=STYLES[p.style], c=sky.consts[ci];
  const fg=pick(r,FIGURES);
  return p.cn[ci]={name:constName(r,S).name, fig:fg[0], meaning:pick(r,C_MEAN), story:pick(r,C_STORY).replace(/\{n\}/g, c?c.members.length:5)};
}
function localPeople(){ return (!sky.earth && !sky.surface && sky.vantage==null && D.cnamesLocal==='local' && world && world.peoples && sky.localPeople>=0) ? world.peoples.list[sky.localPeople] : null; }
function constDisplayName(ci){ const lp=localPeople(); return lp ? getCN(lp,ci).name : sky.consts[ci].name; }
function peopleAt(c){ return world && world.peoples && c>=0 ? world.peoples.map[c] : -1; }
function otherNamesText(ci){
  if(sky.earth || !world || !world.peoples || !world.peoples.list.length) return '';
  const parts=world.peoples.list.slice(0,4).map(p=>{ const n=getCN(p,ci); return `${p.name} l’appellent ${n.name} (${n.fig})`; });
  return 'Chaque peuple la raconte à sa façon : '+parts.join(' ; ')+'.';
}
function buildPeopleImage(W8, peoples){
  const px=new Uint8ClampedArray(W8), map=peoples.map;
  const cols=peoples.list.map(p=>{ const m=p.col.match(/hsl\(([\d.]+),(\d+)%,(\d+)%\)/); const hh=+m[1]/360, s=.55, l=.55; const f=n=>{ const k=(n+hh*12)%12, a=s*Math.min(l,1-l); return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))); }; return [f(0),f(8),f(4)]; });
  for(let c=0;c<WN;c++){ const k=map[c]; if(k<0) continue; const col=cols[k]; const i=c%WW, j=(c/WW)|0;
    const nb=[j*WW+((i+1)%WW), j*WW+((i+WW-1)%WW), j>0?c-WW:c, j<WH-1?c+WW:c]; const edge=nb.some(q=>map[q]!==k && map[q]>=0);
    const a=edge?.7:.22; for(let q=0;q<3;q++) px[c*4+q]=px[c*4+q]*(1-a)+col[q]*a*(edge?.8:1); }
  const can=document.createElement('canvas'); can.width=WW; can.height=WH; can.getContext('2d').putImageData(new ImageData(px,WW,WH),0,0);
  return {px, can, cols};
}

/* ---------- voyages vers les étoiles ---------- */
function starPos(s){
  if(s.homeStar) return [0,0,0];
  if(s.kind!=='star' || s.fobj) return null;
  const base = sky.earth ? s.eqv : s.eq; if(!base) return null;
  let dist; if(s.phys) dist=s.phys.dist; else if(!sky.earth) dist=physOf(s.i).dist; else return null;
  if(!dist || !isFinite(dist)) return null;
  return [base[0]*dist, base[1]*dist, base[2]*dist];
}
function homeName(){ return sky.earth ? 'la Terre' : (world ? world.name : 'chez toi'); }
function computeVantage(cp, idx, approach){
  const S=sky.stars;
  for(const s of S){ if(s.kind!=='star') continue; if(s.mag0===undefined) s.mag0=s.mag; s.cel=null; s.hidden=false; s.mag=s.mag0; s.vdist=null; }
  for(const c of sky.consts) c.cel=null;
  if(cp){
    for(const s of S){ if(s.kind!=='star') continue; const p=starPos(s); if(!p) continue;
      const v=[p[0]-cp[0],p[1]-cp[1],p[2]-cp[2]], dn=Math.hypot(v[0],v[1],v[2]);
      if(s.i===idx || dn<.01){ s.hidden=true; continue; }
      s.cel=[v[0]/dn,v[1]/dn,v[2]/dn]; s.vdist=dn;
      const d0 = s.homeStar ? 0 : (s.phys ? s.phys.dist : physOf(s.i).dist);
      s.mag = Math.max(-9, s.homeStar ? 4.83+5*Math.log10(dn/3.2616)-5 : s.mag0+5*Math.log10(dn/Math.max(d0,1e-3))); }
    for(const c of sky.consts){ let x=0,y=0,z=0; for(const j of c.members){ const s=S[j]; const e=s.cel||(sky.earth?s.eqv:s.eq); if(e){ x+=e[0]; y+=e[1]; z+=e[2]; } } const n=Math.hypot(x,y,z)||1; c.cel=[x/n,y/n,z/n]; }
  }
  sky.order=S.map((s,i)=>i).sort((x,y)=>S[x].mag-S[y].mag);
}
function setVantage(idx){
  let cp = idx==null ? null : starPos(sky.stars[idx]); if(idx!=null && !cp) idx=null;
  sky.vantage=idx; sky.traveling=false; computeVantage(cp, idx);
  sky.space = sky.vantage!=null && !sky.surface;
  applyTime(); updateLocation(); updateChips(); dirty=true;
  if($('panelShip').classList.contains('open')) renderShip();
}
function goToStar(i){ startTravel(i); }
function updateChips(){
  const hc=$('homeChip'); const on = sky && (sky.surface || sky.vantage!=null) && !sky.traveling;
  hc.hidden=!on; if(on) hc.textContent = sky.surface ? 'Quitter '+sky.surface.name : 'Revenir vers '+homeName();
  $('modeChip').hidden = !!on;
}
$('homeChip').onclick=()=>{ if(sky.surface) exitSurface(); else startTravel(null); };

/* ---------- se poser sur une planète ---------- */
function makeSurfaceFrame(p, sys){
  const r=mulberry32((p.seedN||hashStr(p.name))^0x5f3a);
  const dayH = p.name==='Mars' ? 24.6 : 8+r()*50;
  const star=sys.star, ph=star.phys||{lum:1,temp:5772};
  const Rs=Math.sqrt(Math.max(ph.lum,1e-4))/Math.pow((ph.temp||5772)/5772,2);
  const size=clamp(2*Rs*.00465/Math.max(p.a||1,.01)/deg,.02,40);
  const suns=[{name:star.name, col:star.col||[255,244,214], size}];
  if(sys.companion) suns.push({name:sys.companion.name, col:sys.companion.col, size:.08, off:(40+r()*80)*deg});
  const moons=(p.moons||[]).map(m=>({name:m.name, period:Math.max(.05,m.period*24/dayH), phase:r(), incl:(r()*8)*deg, node:r()*TAU, col:m.col, size:clamp(2*m.radiusKm/(m.dist*p.radius*6371)/deg,.03,60), mtype:m.mtype, desc:m.desc, radiusKm:m.radiusKm, dist:m.dist}));
  const pk=PTYPES[p.type].kind;
  return {kind:'surface', name:p.name, body:p, sys, tilt:(r()*40)*deg, yearLen:Math.max(1,(p.period||365)*24/dayH), dayH, suns, moons,
    planets:(sys.planets||[]).filter(q=>q!==p && q.name!==p.name && q.a), home:p, rings:p.rings, lat:22, lon:0, gas:pk==='gas',
    groundCol: pk==='gas' ? hexToRgb(PTYPES[p.type].cols[2]||PTYPES[p.type].cols[0]) : hexToRgb(PTYPES[p.type].cols[1]),
    hillAmp: {gas:.12, terra:.9, rock:1.8, lava:1.3}[pk]||1};
}
function landOn(p, sys){
  if(p.isHome || (sky.earth && p.name==='Terre')){ closeViewer(); if(sky.surface) exitSurface(); else setVantage(null); toast('Retour sur '+p.name); return; }
  closeViewer(); closeCard();
  if(sky.surface) sky.surface=null;
  startLandAnim(p);
  const F=makeSurfaceFrame(p, sys); sky.surface=F; attachFrame(F);
  view.gday=0; view.hour=21;
  setVantage(typeof sys.skyIndex==='number' ? sys.skyIndex : null);
  setMode('pov'); view.pitch=clampPitch(20*deg); syncTime(); updateModeUI();
  toast(F.gas ? `Tu flottes dans la haute atmosphère de ${p.name}` : `Tu es posé sur ${p.name}`);
}
function exitSurface(){
  sky.surface=null; attachFrame(sky.earth ? null : world.frame); view.gday=0;
  if(sky.earth){ const n=new Date(); view.hour=n.getHours()+n.getMinutes()/60; }
  setVantage(null); syncTime(); updateModeUI(); toast('Retour sur '+homeName());
}

/* ---------- carte 3D des étoiles voisines ---------- */
function neighborsScene(ci){
  const cp = ci==null ? [0,0,0] : starPos(sky.stars[ci]); if(!cp) return null;
  const list=[];
  for(const s of sky.stars){ if(s.kind!=='star' || (s.fobj && !s.homeStar) || s.i===ci) continue; if(s.homeStar && ci==null) continue;
    const p=starPos(s); if(!p) continue; const d=Math.hypot(p[0]-cp[0],p[1]-cp[1],p[2]-cp[2]); list.push({s,p,d}); }
  list.sort((a,b)=>a.d-b.d); const near=list.slice(0,90);
  const phOf = s => s.phys || physOf(s.i);
  const items=near.map(({s,p,d})=>({id:'n'+s.i, kind:'nstar', i:s.i, name:starLabel(s), dist:d, dhome:Math.hypot(p[0],p[1],p[2]), pos:[p[0]-cp[0],p[1]-cp[1],p[2]-cp[2]], col:s.col, phys:phOf(s), home:!!s.homeStar, named:!!s.name}));
  const cs = ci==null ? null : sky.stars[ci];
  const center={id:'nc', kind:'ncenter', i:ci, name: cs ? starLabel(cs) : (sky.earth ? 'Soleil' : world.frame.homeSunName), col: cs ? cs.col : [255,244,214], phys: cs ? phOf(cs) : {kind:'naine jaune', lum:1, dist:0}, home:ci==null, dhome: ci==null?0:Math.hypot(cp[0],cp[1],cp[2])};
  const maxD = near.length ? near[Math.min(near.length-1,70)].d : 10;
  return {kind:'neighbors', data:{name:center.name, center, items, maxD}};
}
function drawNeighbors(g){
  const cx=V.W/2, cy=V.H/2, R=Math.min(V.W,V.H)*.44*V.zoom/g.maxD;
  const cr=Math.cos(V.rot), sr=Math.sin(V.rot), ct=Math.cos(V.tilt), st=Math.sin(V.tilt);
  const P3=p=>{ const x=p[0]*cr-p[1]*sr, y=p[0]*sr+p[1]*cr, z=p[2]; return [cx+x*R, cy+(y*ct-z*st)*R, y*st+z*ct]; };
  vctx.lineWidth=1; vctx.font='12px Figtree, system-ui, sans-serif'; vctx.textAlign='left'; vctx.textBaseline='middle';
  for(const f of [.25,.5,.75,1]){ const rr=g.maxD*f; vctx.strokeStyle='rgba(160,180,230,.16)'; vctx.beginPath();
    for(let a=0;a<=72;a++){ const [x,y]=P3([rr*Math.cos(a/72*TAU), rr*Math.sin(a/72*TAU), 0]); a?vctx.lineTo(x,y):vctx.moveTo(x,y); } vctx.stroke();
    const [lx,ly]=P3([rr,0,0]); vctx.fillStyle='rgba(180,195,230,.55)'; vctx.fillText(fmtLy(rr),lx+4,ly); }
  const items=[...g.items].map(o=>({o, q:P3(o.pos), b:P3([o.pos[0],o.pos[1],0])})).sort((a,b)=>a.q[2]-b.q[2]);
  const labelN=new Set(g.items.slice(0,14).map(o=>o.id));
  for(const {o,q,b} of items){
    vctx.strokeStyle=`rgba(160,180,230,${o.pos[2]>0?.22:.12})`; vctx.beginPath(); vctx.moveTo(q[0],q[1]); vctx.lineTo(b[0],b[1]); vctx.stroke();
    const rad=clamp(1.6+Math.log10((o.phys&&o.phys.lum||1)+1)*1.1,1.6,6);
    const [r2,g2,b2]=o.col; vctx.fillStyle=`rgb(${r2},${g2},${b2})`; vctx.beginPath(); vctx.arc(q[0],q[1],rad,0,TAU); vctx.fill();
    if(o.home){ vctx.strokeStyle='#d8b56a'; vctx.beginPath(); vctx.arc(q[0],q[1],rad+5,0,TAU); vctx.stroke(); }
    if(V.sel===o){ vctx.strokeStyle='rgba(245,220,150,.95)'; vctx.lineWidth=1.4; vctx.beginPath(); vctx.arc(q[0],q[1],rad+7,0,TAU); vctx.stroke(); vctx.lineWidth=1; }
    if(V.sel===o || o.home || labelN.has(o.id) || (o.named && V.zoom>1.4)){ vctx.fillStyle=V.sel===o?'#f5dc96':o.home?'#e8cf8f':'rgba(225,230,245,.85)'; vctx.fillText(o.name, q[0]+rad+5, q[1]); }
    V.hits.push({x:q[0], y:q[1], r:Math.max(rad+7,12), obj:o});
  }
  const c0=P3([0,0,0]); drawStarDisc(c0[0],c0[1],7,g.center.col); vctx.fillStyle='#f5dc96'; vctx.font=`italic 600 16px ${SERIF}`; vctx.fillText(g.center.name, c0[0]+14, c0[1]-2);
  V.hits.push({x:c0[0], y:c0[1], r:14, obj:g.center});
}
