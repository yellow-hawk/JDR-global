/* Atlas des ciels imaginaires — Phénomènes du ciel et recherche
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ================= phénomènes du ciel ================= */
const EARTH_SHOWERS=[['Quadrantides','Boo',3,2,80],['Lyrides','Lyr',112,2,20],['Êta Aquarides','Aqr',126,4,50],['Perséides','Per',224,5,100],['Orionides','Ori',294,4,25],['Léonides','Leo',321,2,15],['Géminides','Gem',348,3,120]];
const stemOf = n => n.replace(/(a|ae|us|um|is|on|onis|ax|acis|i)$/,'');
function worldShowers(){
  if(sky.earth){ return EARTH_SHOWERS.map(([n,id,day,w,zhr])=>({name:n, ci:sky.consts.findIndex(c=>c.id===id), day, w, zhr})).filter(s=>s.ci>=0); }
  if(!world || !sky.consts.length) return [];
  return cached('showers', ()=>{ const r=rngFor('showers|'+P.wvar), n=2+Math.floor(r()*3), Y=world.frame.yearLen, out=[], used=new Set();
    for(let k=0;k<n;k++){ let ci=Math.floor(r()*sky.consts.length); if(used.has(ci)) continue; used.add(ci);
      out.push({name:cap(stemOf(sky.consts[ci].name0||sky.consts[ci].name))+'ides', ci, day:Math.floor(r()*Y), w:2+r()*3, zhr:30+Math.floor(r()*100)}); }
    return out; });
}
function dayOfYearNow(){
  if(sky.earth && !sky.surface){ const [y,m,d]=(view.date||todayStr()).split('-').map(Number); return (Date.UTC(y,m-1,d)-Date.UTC(y,0,1))/864e5 + view.hour/24; }
  return (view.gday||0) + view.hour/24;
}
function showerActivity(){
  if(sky.surface) return [];
  const Y = sky.earth ? 365.25 : world.frame.yearLen, dn=dayOfYearNow();
  return worldShowers().map(s=>{ let dd=Math.abs(dn-s.day)%Y; dd=Math.min(dd,Y-dd); return {...s, I:Math.exp(-((dd/s.w)**2))}; }).filter(s=>s.I>.02);
}
/* ---------- étoiles filantes ---------- */
let meteors=[], meteorAcc=0;
function tangentAt(R, r){ let t=cross(R,[r()-.5,r()-.5,r()-.5]); const n=Math.hypot(t[0],t[1],t[2])||1; return [t[0]/n,t[1]/n,t[2]/n]; }
function stepMeteors(dt, now){
  if(!sky || !D.meteors || view.mode!=='pov' || sky.space || (sky.day||0)>.35 || V.open || W_OPEN || M_OPEN){ meteors.length=0; return; }
  const act=showerActivity(); let rate=.08; for(const s of act) rate+=s.I*s.zhr/170;
  meteorAcc+=dt*rate;
  while(meteorAcc>=1){
    meteorAcc-=1;
    let R=null, shower=null;
    const tot=act.reduce((a,s)=>a+s.I*s.zhr/170,0);
    if(tot>0 && Math.random()<tot/rate){ let x=Math.random()*tot; for(const s of act){ x-=s.I*s.zhr/170; if(x<=0){ shower=s; break; } } if(shower){ const c=sky.consts[shower.ci]; if(c && c.d && c.lat>-.05) R=c.d; } }
    if(!R){ const az=Math.random()*TAU, alt=(10+Math.random()*60)*deg; R=dirOf(az,alt); }
    const r=Math.random, t=tangentAt(R,r), a=(shower?12:4)*deg+r()*35*deg, L=(6+r()*16)*deg;
    meteors.push({R, t, a, L, t0:now, dur:450+r()*700, b:.6+r()*.4, shower:!!shower});
    if(meteors.length>25) meteors.shift();
  }
  meteors=meteors.filter(m=>now-m.t0<m.dur);
  if(meteors.length) dirty=true;
}
function drawMeteors(now){
  if(!meteors.length) return;
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
  for(const m of meteors){ const q=(now-m.t0)/m.dur, head=q, tail=Math.max(0,q-.35);
    const P=u=>{ const ang=m.a+u*m.L, c=Math.cos(ang), s=Math.sin(ang); return [m.R[0]*c+m.t[0]*s, m.R[1]*c+m.t[1]*s, m.R[2]*c+m.t[2]*s]; };
    const pts=[]; for(let k=0;k<=6;k++){ const u=tail+(head-tail)*k/6, d=P(u); if(d[1]<0) continue; projP(d); if(!pf) continue; pts.push([px,py]); }
    if(pts.length<2) continue;
    const fade=Math.sin(Math.PI*Math.min(1,q))*m.b;
    const g=ctx.createLinearGradient(pts[0][0],pts[0][1],pts[pts.length-1][0],pts[pts.length-1][1]);
    g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(1,`rgba(255,250,235,${fade})`);
    ctx.strokeStyle=g; ctx.lineWidth=1.8; ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.stroke();
    const [hx,hy]=pts[pts.length-1]; ctx.fillStyle=`rgba(255,255,245,${fade})`; ctx.beginPath(); ctx.arc(hx,hy,1.8,0,TAU); ctx.fill(); }
  ctx.restore();
}

/* ---------- grande comète ---------- */
function worldComet(){
  if(sky.earth || !world) return null;
  return cached('comet', ()=>{ const r=rngFor('comet|'+P.wvar); const period=6+Math.floor(r()*55);
    return {name:'Grande comète '+cap(starName(r,sky.st,true)), period, phaseYear:1+Math.floor(r()*period), peak:Math.floor(r()*world.frame.yearLen), win:30+Math.floor(r()*30), beta:(8+r()*22)*deg*(r()<.5?-1:1), side:r()<.5?1:-1}; });
}
function cometState(){
  const c=worldComet(); if(!c) return null; const Y=world.frame.yearLen, yr=view.year||1;
  const passYear = ((yr - c.phaseYear) % c.period + c.period) % c.period === 0;
  const u=((view.gday||0)+view.hour/24 - c.peak)/c.win;
  const next = (()=>{ let y=yr; if(passYear && u<=1) return y; y++; while(((y-c.phaseYear)%c.period+c.period)%c.period) y++; return y; })();
  return {c, visible: passYear && Math.abs(u)<1, u, next};
}
function drawComet(s, pov){
  if(!s.d) return;
  const st=cometState(); if(!st || !st.visible) return;
  project2(s, pov); if(!pf) return; const x0=px, y0=py;
  const sd=(sky.fsun||sky.sun).d, md=s.d, k=dot(sd,md); const t=[md[0]-sd[0]*k, md[1]-sd[1]*k, md[2]-sd[2]*k], tn=Math.hypot(t[0],t[1],t[2])||1;
  const away=[md[0]+t[0]/tn*.03, md[1]+t[1]/tn*.03, md[2]+t[2]/tn*.03];
  if(pov) projP(away); else projM(lonOf(away),latOf(away)); let ang=Math.atan2(py-y0,px-x0); px=x0; py=y0;
  const br=1-Math.abs(st.u), len=(50+160*br)*(pov?Math.sqrt(90*deg/view.fov):1);
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.translate(x0,y0); ctx.rotate(ang);
  for(const [w,a] of [[.18,.35],[.1,.55]]){ const g=ctx.createLinearGradient(0,0,len,0); g.addColorStop(0,`rgba(200,225,255,${a*br+.1})`); g.addColorStop(1,'rgba(200,225,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(0,-2); ctx.quadraticCurveTo(len*.5,-len*w,len,-len*w*1.4); ctx.lineTo(len,len*w*.6); ctx.quadraticCurveTo(len*.5,len*w*.3,0,2); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle='rgba(235,245,255,.95)'; ctx.beginPath(); ctx.arc(0,0,2.6+2*br,0,TAU); ctx.fill(); ctx.restore();
}
function project2(o,pov){ if(pov) projP(o.d); else projM(o.lon,o.lat); }

/* ---------- éclipses ---------- */
function eclipseCheck(F){
  sky.eclipse=null; if(!sky.fsun || !sky.fsun.cel) return;
  const S=sky.fsun.cel, rs=F.suns[0].size/2*deg;
  let best=0, bm=null;
  for(const o of sky.fobjs){ if(o.fk!=='moon' || !o.cel) continue; const rm=(o.sizeDeg||.5)/2*deg;
    const sep=Math.acos(clamp(dot(o.cel,S),-1,1)); let cov=0;
    if(sep<rs+rm){ cov = (rm>=rs && sep<=rm-rs) ? 1 : clamp((rs+rm-sep)/(2*rs),0,1)*Math.min(1,(rm/rs)**2); }
    o.solarCover=cov; if(cov>best){ best=cov; bm=o; }
    const dist=(o.mdata && o.mdata.dist) || 60, um=Math.asin(Math.min(1,1/dist))*.75;
    const sepL=Math.acos(clamp(-dot(o.cel,S),-1,1)); o.lunarCover = sepL<um+rm ? clamp((um+rm-sepL)/(2*rm),0,1) : 0; }
  if(best>0){ sky.eclipse={cover:best, moon:bm}; sky.day*=1-.93*Math.pow(best,3); sky.day2*=1-.97*Math.pow(best,2); }
}
function eclipsesOfYear(F){
  const out=[]; if(!F || !F.moons) return out; const Y=Math.round(F.yearLen), rs=F.suns[0].size/2*deg;
  for(const m of F.moons){ const rm=m.size/2*deg, um=Math.asin(Math.min(1,1/(m.dist||60)))*.75;
    for(let k=-1;k<Y/m.period+2;k++){ for(const full of [0,.5]){ const t=m.period*(k+full-m.phase); if(t<0||t>=Y) continue;
      const lamS=Math.PI+TAU*t/Y, lam=lamS+TAU*full, bet=m.incl*Math.sin(lam-m.node);
      if(!full && Math.abs(bet)<rs+rm*.9) out.push({moon:m.name, type:'s', q:Math.abs(bet), day:Math.floor(t), hour:(t%1)*24, name:`Éclipse de soleil par ${m.name}`, text: (m.size>=F.suns[0].size && Math.abs(bet)<rm-rs ? 'Éclipse totale' : 'Éclipse partielle')+` : ${m.name} passe devant ${F.suns[0].name}. Elle n’est visible que là où le soleil est levé à ce moment.`, eclipse:true});
      if(full && Math.abs(bet)<um+rm*.9) out.push({moon:m.name, type:'l', q:Math.abs(bet), day:Math.floor(t), hour:(t%1)*24, name:`Éclipse de ${m.name}`, text:`${m.name} traverse l’ombre de ${F.name} et se teinte de rouge. Visible partout où elle est levée.`, eclipse:true}); } } }
  const keep=[]; for(const m of F.moons) for(const ty of ['s','l']) keep.push(...out.filter(e=>e.moon===m.name && e.type===ty).sort((a,b)=>a.q-b.q).slice(0,2));
  return keep.sort((a,b)=>a.day-b.day);
}

/* ---------- aurores ---------- */
function drawAurora(now){
  const lat=obsLat(); if(!D.aurora || Math.abs(lat)<50 || (sky.day||0)>.25 || sky.space || view.mode!=='pov') return;
  const key = sky.earth ? (view.date||'') : String(view.gday||0), r=mulberry32(hashStr(P.seed+'|aur|'+key));
  const act=r(); const s=clamp((Math.abs(lat)-50)/18,0,1)*(.25+.75*act); if(s<.08) return;
  const az0 = lat>0 ? 0 : Math.PI, t=now/1000;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(let band=0;band<3;band++){ const base=(7+band*5)*deg, hgt=(14+band*6)*deg, ph=r()*TAU;
    for(let a=-75;a<75;a+=3){ const az1=az0+a*deg, az2=az0+(a+3)*deg;
      const w1=Math.sin(a*.09+t*.35+ph)*4*deg+Math.sin(a*.23-t*.2)*2*deg, w2=Math.sin((a+3)*.09+t*.35+ph)*4*deg+Math.sin((a+3)*.23-t*.2)*2*deg;
      const amp=(.5+.5*Math.sin(a*.05+t*.25+ph*2))*s*(1-Math.abs(a)/80);
      projP(dirOf(az1,base+w1)); if(!pf) continue; const b1=[px,py]; projP(dirOf(az2,base+w2)); if(!pf) continue; const b2=[px,py];
      projP(dirOf(az1,base+w1+hgt)); const t1=[px,py]; projP(dirOf(az2,base+w2+hgt)); const t2=[px,py];
      const g=ctx.createLinearGradient(b1[0],b1[1],t1[0],t1[1]); g.addColorStop(0,`rgba(90,255,160,${.28*amp})`); g.addColorStop(.6,`rgba(120,220,190,${.12*amp})`); g.addColorStop(1,`rgba(170,100,255,0)`);
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(...b1); ctx.lineTo(...b2); ctx.lineTo(...t2); ctx.lineTo(...t1); ctx.closePath(); ctx.fill(); } }
  ctx.restore();
}

/* ---------- météo ---------- */
function weatherNow(){
  if(!D.weather || sky.space) return null;
  const key = sky.earth && !sky.surface ? (view.date||'') : String((view.gday||0)+'|'+(view.year||1));
  let hum=.45; if(!sky.earth && !sky.surface && world){ const c=cellOf(obsLon()*deg, obsLat()*deg); hum=world.M[c]; }
  if(sky.surface){ const pk=PTYPES[sky.surface.body.type].kind; hum = pk==='gas'?.9 : pk==='terra'?.5 : .15; }
  const r=mulberry32(hashStr(P.seed+'|wx|'+key+'|'+Math.round(obsLat())+'|'+Math.round(obsLon())));
  const cover=clamp(hum*1.1-.25+(r()-.5)*.9,0,1);
  const word = cover<.12?'ciel dégagé':cover<.38?'quelques nuages':cover<.7?'nuageux':'couvert';
  const n=Math.round(cover*150), puffs=[];
  for(let i=0;i<n;i++){ const alt=Math.pow(r(),1.7)*70; puffs.push([r()*TAU, (3+alt)*deg, (5+r()*14)*deg, .55+r()*.4]); }
  return {cover, word, puffs, drift:(r()-.5)*.02};
}
let WX=null, WXkey='';
function drawClouds(now){
  if(view.mode!=='pov') return;
  const key=(sky.earth?view.date:view.gday)+'|'+(view.year||1)+'|'+obsLat()+'|'+obsLon()+'|'+D.weather+'|'+!!sky.space+'|'+(sky.surface?sky.surface.name:'');
  if(key!==WXkey){ WX=weatherNow(); WXkey=key; }
  if(!WX || !WX.puffs.length) return;
  const b=skyDay(), t=now/1000;
  const night=[18,22,34], day=[238,242,247], col=night.map((v,i)=>Math.round(v+(day[i]-v)*b));
  for(const [az,alt,sz,op] of WX.puffs){ projP(dirOf(az+t*WX.drift,alt)); if(!pf) continue; const R=sz*pk*cam.F; if(px<-R||px>W+R||py<-R||py>H+R) continue;
    const g=ctx.createRadialGradient(px,py,0,px,py,R); g.addColorStop(0,`rgba(${col[0]},${col[1]},${col[2]},${op*(.75+.2*b)})`); g.addColorStop(.6,`rgba(${col[0]},${col[1]},${col[2]},${op*.45})`); g.addColorStop(1,`rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle=g; ctx.fillRect(px-R,py-R,2*R,2*R); }
}

/* ---------- recherche ---------- */
const normTxt = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function searchAll(q){
  const nq=normTxt(q).trim(); if(nq.length<2) return [];
  const res=[]; const add=(name,type,act)=>{ const n=normTxt(name); const i=n.indexOf(nq); if(i<0) return; res.push({name,type,act,score:(i===0?0:1)+n.length/100}); };
  sky.consts.forEach((c,ci)=>add(constDisplayName(ci),'Constellation',()=>{ closeSheets(); showConst(ci); aimView(c.lon,c.lat); }));
  for(const s of sky.stars){ if(!s.name || s.hidden) continue; if(s.homeStar && sky.vantage==null) continue;
    const ty = s.kind==='planet'?'Planète':s.kind==='galaxy'?'Galaxie':s.kind==='sun'||s.kind==='sun2'?'Soleil':s.kind==='moon'?'Lune':'Étoile';
    add(s.name, ty, ()=>{ closeSheets(); select(s.i); if(s.d) aimView(s.lon,s.lat); if(s.lat<-.02 && view.mode==='pov' && D.horizon) toast(s.name+' est sous l’horizon en ce moment'); }); }
  if(sky.earth){ for(const [n,la,lo] of EARTH_CITIES) add(n,'Ville',()=>{ closeSheets(); setObs(la,lo); D.eplace=n; applyTime(); updateLocation(); syncTime(); toast('Tu observes depuis '+n); }); }
  else if(world){
    const openAt=(o,extra)=>{ closeSheets(); openWorld(); wView.glon=o.lon; wView.glat=clamp(o.lat,-1.2,1.2); wView.mcx=o.lon; wView.mcy=clamp(o.lat,-.8,.8); wSel=Object.assign({lon:o.lon, lat:o.lat, c:o.cell??cellOf(o.lon,o.lat)}, extra); wPanel(); wDirty=true; };
    world.peoples.list.forEach((p,k)=>{ add(cap(p.name),'Peuple',()=>{ closeSheets(); openWorldHub(); worldHub.people=k; renderWorldHub(); });
      for(const ct of p.cities) add(ct.name, ct.kind==='capital'?'Capitale':'Cité', ()=>openAt(ct,{city:ct})); });
    for(const o of world.pois||[]) add(o.name, o.kind==='poi-major'?'Lieu légendaire':'Lieu remarquable', ()=>openAt(o,{poi:o}));
    for(const pl of world.places) if(['continent','ocean','sea','region','mountains','island'].includes(pl.kind)) add(pl.name, {continent:'Continent',ocean:'Océan',sea:'Mer',region:'Région',mountains:'Montagnes',island:'Île'}[pl.kind], ()=>openAt(pl,{}));
  }
  return res.sort((a,b)=>a.score-b.score).slice(0,40);
}
$('btnSearch').onclick=()=>{ if(openSheet('panelSearch')){ $('searchIn').value=''; $('searchRes').innerHTML=''; setTimeout(()=>$('searchIn').focus(),250); } };
$('searchIn').addEventListener('input',()=>{ const ul=$('searchRes'); ul.innerHTML=''; const r=searchAll($('searchIn').value);
  if(!r.length && $('searchIn').value.trim().length>=2){ ul.append(el('p','hint','Aucun résultat.')); return; }
  for(const it of r){ const li=el('li'), b=el('button'); const d=el('span','dot'); d.style.background={Constellation:'#d8b56a',Étoile:'#e8ecf5',Planète:'#e0b27a',Peuple:'#9fb0e0',Capitale:'#b8322a',Cité:'#e8d9b0','Lieu légendaire':'#f0c14b','Lieu remarquable':'#e6cf94'}[it.type]||'#8fa6c8';
    b.append(d, el('span','nm',it.name), el('span','ty',it.type)); b.onclick=it.act; li.append(b); ul.append(li); } });
$('searchIn').addEventListener('keydown',e=>{ if(e.key==='Enter'){ const f=$('searchRes').querySelector('button'); if(f) f.click(); } });
