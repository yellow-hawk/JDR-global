/* Atlas des ciels imaginaires — Rendu du ciel et boucle d'animation
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ---------- rendu du ciel ---------- */
const cv = $('sky'); let ctx = cv.getContext('2d');
const off = document.createElement('canvas'), octx = off.getContext('2d');
const SERIF = '"Cormorant Garamond", Georgia, serif';
let W=0, H=0, DPR=1;
function resize(){ DPR=Math.min(2,window.devicePixelRatio||1); W=innerWidth; H=innerHeight; cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR); ctx.setTransform(DPR,0,0,DPR,0,0); dirty=true; }
addEventListener('resize', resize);

const cam = {fx:0,fy:0,fz:1,rx:1,rz:0,ux:0,uy:1,uz:0,F:1};
function setCam(){ const cy=Math.cos(view.yaw), sy=Math.sin(view.yaw), cp=Math.cos(view.pitch), sp=Math.sin(view.pitch);
  cam.fx=cp*sy; cam.fy=sp; cam.fz=cp*cy; cam.rx=cy; cam.rz=-sy; cam.ux=-sp*sy; cam.uy=cp; cam.uz=-sp*cy;
  cam.F=(Math.min(W,H)/2)/(2*Math.tan(view.fov/4)); }
let px=0, py=0, pk=1, pf=false;
function projP(d){ const cz=d[0]*cam.fx+d[1]*cam.fy+d[2]*cam.fz; if(cz<-.2){pf=false;return;}
  pf=true; pk=2/(1+cz); px=W/2+(d[0]*cam.rx+d[2]*cam.rz)*pk*cam.F; py=H/2-(d[0]*cam.ux+d[1]*cam.uy+d[2]*cam.uz)*pk*cam.F; }
function projRaw(d){ const cz=d[0]*cam.fx+d[1]*cam.fy+d[2]*cam.fz; const k=Math.min(3000,2/Math.max(1e-6,1+cz));
  return [W/2+(d[0]*cam.rx+d[2]*cam.rz)*k*cam.F, H/2-(d[0]*cam.ux+d[1]*cam.uy+d[2]*cam.uz)*k*cam.F]; }
const mapS = () => (W<H ? H/Math.PI*.8 : Math.min(W/TAU, H/Math.PI)*.94)*view.mz;
function projM(lon,lat){ const s=mapS(); px=W/2+wrapPi(lon-view.mcx)*s; py=H/2-(lat-view.mcy)*s; pf=true; pk=1; }

let SX=new Float32Array(0), SY=new Float32Array(0), SV=new Uint8Array(0), SR=new Float32Array(0);
let labelBoxes = [], constHits = [];
function freeBox(x,y,w,h){ for(const b of labelBoxes){ if(x<b[0]+b[2] && x+w>b[0] && y<b[1]+b[3] && y+h>b[1]) return false; } labelBoxes.push([x,y,w,h]); return true; }

function draw(time){
  if(!sky) return;
  const n = sky.stars.length;
  if(SX.length!==n){ SX=new Float32Array(n); SY=new Float32Array(n); SV=new Uint8Array(n); SR=new Float32Array(n); }
  const T = TINTS[D.tint]||TINTS.nuit, pov = view.mode==='pov';
  const b = skyDay();
  const TT = {top:mixHex(T.top,'#2d4a7e',b), mid:mixHex(T.mid,'#5c7fb5',b), hor:mixHex(T.hor,'#e9a36e',b)};
  if(sky.earth && sky.day2>0){ const b2=sky.day2; TT.top=mixHex(TT.top,'#3b73c4',b2); TT.mid=mixHex(TT.mid,'#6f9fdc',b2); TT.hor=mixHex(TT.hor,'#d2e3f2',b2); }
  labelBoxes = []; constHits = [];
  ctx.globalCompositeOperation='source-over';
  let zs, eff;
  if(pov){
    setCam();
    const fd = view.fov/deg; zs = clamp(Math.pow(90/fd,.4),.75,2.4); eff = D.smag + Math.log2(90/fd)*1.2;
    const h = projRaw(dirOf(view.yaw,0)); const yH = clamp(h[1], -H, H*2);
    const g = ctx.createLinearGradient(0, yH, 0, yH - H*1.3);
    g.addColorStop(0,TT.hor); g.addColorStop(.35,TT.mid); g.addColorStop(1,TT.top);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  } else {
    zs = clamp(.8*Math.pow(view.mz,.45),.6,2.2); eff = D.smag + Math.log2(view.mz)*1.2;
    ctx.fillStyle='#03060f'; ctx.fillRect(0,0,W,H);
    const s = mapS(), x0 = W/2-Math.PI*s, y0 = H/2-(Math.PI/2-view.mcy)*s;
    ctx.fillStyle=TT.mid; ctx.fillRect(x0,y0,TAU*s,Math.PI*s);
  }
  if(b>.01){ const sd=sunDir(); let sx, sy, rad;
    if(pov){ const q2=projRaw(sd); sx=q2[0]; sy=q2[1]; rad=Math.max(W,H)*1.1; } else { projM(lonOf(sd),latOf(sd)); sx=px; sy=py; rad=mapS()*1.4; }
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,rad);
    g.addColorStop(0,`rgba(255,170,110,${.6*b})`); g.addColorStop(.4,`rgba(255,140,100,${.25*b})`); g.addColorStop(1,'rgba(255,140,100,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
  const project = pov ? (o)=>projP(o.d) : (o)=>projM(o.lon,o.lat);
  const scaleOf = pov ? ()=>pk*cam.F : ()=>mapS();

  // voie lactée + nébuleuses (basse résolution, adoucies)
  const q=4, ow=Math.ceil(W/q), oh=Math.ceil(H/q);
  if(off.width!==ow||off.height!==oh){ off.width=ow; off.height=oh; }
  octx.setTransform(1/q,0,0,1/q,0,0); octx.globalCompositeOperation='source-over'; octx.clearRect(0,0,W,H);
  octx.globalCompositeOperation='lighter';
  for(const p of sky.dust){ project(p); if(!pf) continue; const r=p.r*scaleOf(); if(px<-r||px>W+r||py<-r||py>H+r) continue;
    octx.fillStyle=p.col; octx.beginPath(); octx.arc(px,py,Math.max(2,r),0,TAU); octx.fill(); }
  for(const n2 of sky.nebs){ project(n2); if(!pf) continue; const r=n2.r*scaleOf(); if(px<-r||px>W+r||py<-r||py>H+r) continue;
    const g=octx.createRadialGradient(px,py,0,px,py,r); const [cr,cg,cb]=n2.c;
    g.addColorStop(0,`rgba(${cr},${cg},${cb},${n2.al})`); g.addColorStop(.5,`rgba(${cr},${cg},${cb},${n2.al*.45})`); g.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
    octx.fillStyle=g; octx.fillRect(px-r,py-r,2*r,2*r); }
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.imageSmoothingEnabled=true; ctx.globalAlpha=Math.pow(1-b,2);
  if(!pov){ const ms=mapS(); ctx.beginPath(); ctx.rect(W/2-Math.PI*ms, H/2-(Math.PI/2-view.mcy)*ms, TAU*ms, Math.PI*ms); ctx.clip(); }
  if('filter' in ctx) ctx.filter='blur(7px)';
  ctx.drawImage(off,0,0,W,H); ctx.restore();

  if(D.grid) drawGrid(pov);

  const hideBelow = pov && D.horizon && !sky.space; const deferredMoons=[];
  const tw = D.twinkle && !reduceMotion;
  for(let o=n-1;o>=0;o--){ const i=sky.order[o], s=sky.stars[i];
    SV[i]=0;
    if(s.hidden || !s.d) continue;
    if(s.homeStar && sky.vantage==null && !sky.traveling) continue;
    if(s.homeBody && (sky.surface || sky.vantage!=null || sky.traveling)) continue;
    if(s.fobj && !s.homeStar && sky.space) continue;
    if(hideBelow && s.lat<-.005) continue;
    project(s); if(!pf) continue;
    SX[i]=px; SY[i]=py;
    const [cr,cg,cb]=s.col;
    if(s.kind==='comet'){ if(!s.cvis) continue; SR[i]=7; SV[i]=1; drawComet(s,pov); continue; }
    if(s.kind==='sun' || s.kind==='moon' || s.kind==='sun2'){
      const half=(s.sizeDeg ? s.sizeDeg/2 : (s.kind==='sun'?.27:.26))*deg;
      const R=Math.max(half*scaleOf(), s.kind==='sun'?10:s.kind==='sun2'?6:8); SR[i]=R;
      if(px<-R*7||px>W+R*7||py<-R*7||py>H+R*7){ SV[i]=2; continue; } SV[i]=1;
      if(s.kind!=='moon'){ const cl=s.col||[255,240,210]; const g=ctx.createRadialGradient(px,py,0,px,py,R*7); g.addColorStop(0,`rgba(${Math.min(255,cl[0]+30)},${Math.min(255,cl[1]+20)},${cl[2]},.95)`); g.addColorStop(.15,`rgba(${cl[0]},${cl[1]},${cl[2]},.5)`); g.addColorStop(1,`rgba(${cl[0]},${cl[1]},${cl[2]},0)`);
        ctx.fillStyle=g; ctx.fillRect(px-R*7,py-R*7,R*14,R*14); ctx.fillStyle=s.kind==='sun2'?`rgb(${cl[0]},${cl[1]},${cl[2]})`:'#fffbe8'; ctx.beginPath(); ctx.arc(px,py,R,0,TAU); ctx.fill(); }
      else if(s.solarCover>.001) deferredMoons.push([px,py,R,s]);
      else drawMoonPhase(px,py,R,s,pov);
      continue;
    }
    if(s.kind==='galaxy'){
      const R = Math.max(5, s.size*scaleOf()); SR[i]=Math.max(6,R*.6);
      if(px<-R||px>W+R||py<-R||py>H+R){ SV[i]=2; continue; }
      const gf=Math.pow(1-b,2); if(gf<.08) continue; SV[i]=1;
      ctx.save(); ctx.globalAlpha=gf; ctx.translate(px,py); ctx.rotate(s.pa); ctx.scale(1,s.q);
      const g=ctx.createRadialGradient(0,0,0,0,0,R);
      g.addColorStop(0,`rgba(${cr},${cg},${cb},.75)`); g.addColorStop(.15,`rgba(${cr},${cg},${cb},.35)`); g.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.fill(); ctx.restore();
      continue;
    }
    let r = clamp((6.9-s.mag)*.42,.35,5.5)*zs;
    if(s.kind==='planet') r = clamp((6.9-s.mag)*.5,2.2,6.5)*zs;
    SR[i]=r;
    if(px<-20||px>W+20||py<-20||py>H+20){ SV[i]=2; continue; }
    SV[i]=1;
    let al = s.mag>3.5 ? clamp((6.9-s.mag)/3.4,.12,1) : 1;
    if(b>0){ const lim=6.6-8.2*b+(s.kind==='planet'?1.5:0), f=clamp((lim-s.mag)/1.2,0,1); if(f<=0){ SV[i]=0; continue; } al*=f; }
    if(tw && s.kind==='star' && s.mag<4){ al *= 1 + .22*Math.sin(time*s.sp*2.2 + s.ph); r *= 1 + .06*Math.sin(time*s.sp*1.7 + s.ph*1.3); }
    if(s.mag<1.8 || s.kind==='planet'){
      const gr=r*(s.kind==='planet'?3:4.2), g=ctx.createRadialGradient(px,py,0,px,py,gr);
      g.addColorStop(0,`rgba(${cr},${cg},${cb},${.45*al})`); g.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle=g; ctx.fillRect(px-gr,py-gr,gr*2,gr*2);
    }
    ctx.fillStyle=`rgba(${cr},${cg},${cb},${Math.min(1,al)})`;
    if(r<1.1){ const w=Math.max(.8,r*1.6); ctx.fillRect(px-w/2,py-w/2,w,w); }
    else { ctx.beginPath(); ctx.arc(px,py,r,0,TAU); ctx.fill(); }
  }

  for(const [mx,my,mR,ms] of deferredMoons){ if(ms.solarCover>.85){ const g=ctx.createRadialGradient(mx,my,mR,mx,my,mR*4); g.addColorStop(0,'rgba(255,255,245,.7)'); g.addColorStop(1,'rgba(255,255,245,0)'); ctx.fillStyle=g; ctx.fillRect(mx-mR*4,my-mR*4,mR*8,mR*8); } drawMoonPhase(mx,my,mR,ms,pov); }
  if(D.lines || selC>=0){
    ctx.lineWidth=1.1; ctx.globalAlpha=1-.6*b;
    sky.consts.forEach((c,ci)=>{
      if(!D.lines && ci!==selC) return;
      ctx.strokeStyle = ci===selC ? 'rgba(236,205,130,.95)' : 'rgba(216,181,106,.42)';
      ctx.beginPath();
      for(const [a,b] of c.edges){
        if(!SV[a]||!SV[b]) continue;
        const x1=SX[a],y1=SY[a],x2=SX[b],y2=SY[b], dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy);
        if(!pov && L>Math.PI*mapS()) continue;
        const g1=SR[a]+3.5, g2=SR[b]+3.5; if(L<g1+g2+2) continue;
        ctx.moveTo(x1+dx/L*g1, y1+dy/L*g1); ctx.lineTo(x2-dx/L*g2, y2-dy/L*g2);
      }
      ctx.stroke();
    });
    ctx.globalAlpha=1;
  }

  { const nowMs=performance.now(); if(pov){ drawAurora(nowMs); drawMeteors(nowMs); if(D.weather) drawClouds(nowMs); } }
  if(sky.surface && sky.ringCurves) drawRingArc(pov);
  if(pov && D.horizon && !sky.space) drawGround(T);
  if(!pov) drawMapOverlay();

  if(D.cnames && b<.85){
    ctx.globalAlpha=1-b; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font = `600 ${pov?17:15}px ${SERIF}`;
    sky.consts.forEach((c,ci)=>{
      if(hideBelow && c.lat<hillAlt(c.lon)+1*deg) return;
      project(c); if(!pf || px<0||px>W||py<0||py>H) return;
      const cnm=constDisplayName(ci), w = ctx.measureText(cnm).width + 10;
      if(!freeBox(px-w/2,py-11,w,22)) return;
      constHits.push([px-w/2,py-12,w,24,ci]);
      ctx.fillStyle = ci===selC ? 'rgba(245,220,150,1)' : 'rgba(216,181,106,.85)';
      ctx.fillText(cnm, px, py);
    });
    ctx.globalAlpha=1;
  }
  ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.font = `italic 500 15px ${SERIF}`;
  for(const i of sky.order){ const s=sky.stars[i];
    if(SV[i]!==1) continue;
    const show = i===sel || s.kind==='sun' || s.kind==='moon' || s.kind==='sun2' || s.kind==='comet' || s.homeStar || (s.kind==='planet' && D.smag>-1 && s.mag<eff+2) || (s.kind==='galaxy' && eff>1.5) || (s.kind==='star' && s.name && s.mag<eff);
    if(!show) continue;
    if(hideBelow && s.lat<hillAlt(s.lon)) continue;
    const label = s.name || s.desig || '';
    const x=SX[i]+SR[i]+5, y=SY[i]-SR[i]-3, w=ctx.measureText(label).width;
    if(i!==sel && !freeBox(x,y-8,w,16)) continue;
    ctx.fillStyle = i===sel ? '#fff4d6' : s.kind==='planet' ? 'rgba(250,225,180,.9)' : s.kind==='galaxy' ? 'rgba(200,210,240,.8)' : 'rgba(225,228,240,.78)';
    ctx.fillText(label, x, y);
  }
  if(sel>=0 && SV[sel]===1){ ctx.strokeStyle='rgba(245,220,150,.9)'; ctx.lineWidth=1.3; ctx.beginPath(); ctx.arc(SX[sel],SY[sel],SR[sel]+7,0,TAU); ctx.stroke(); }
}

function drawMoonPhase(x0,y0,R,s,pov){
  const sd=(s.sunRef||sky.sun).d, md=s.d, k=dot(sd,md); const t=[sd[0]-md[0]*k, sd[1]-md[1]*k, sd[2]-md[2]*k], tn=Math.hypot(t[0],t[1],t[2])||1;
  const p2=[md[0]+t[0]/tn*.01, md[1]+t[1]/tn*.01, md[2]+t[2]/tn*.01];
  if(pov) projP(p2); else projM(lonOf(p2),latOf(p2));
  let ang=Math.atan2(py-y0, px-x0); if(!pov && Math.abs(px-x0)>W/2) ang=Math.atan2(py-y0, -(px-x0)); px=x0; py=y0;
  const g=ctx.createRadialGradient(x0,y0,R,x0,y0,R*4); g.addColorStop(0,`rgba(230,230,215,${.25*s.illum})`); g.addColorStop(1,'rgba(230,230,215,0)');
  ctx.fillStyle=g; ctx.fillRect(x0-R*4,y0-R*4,R*8,R*8);
  ctx.save(); ctx.translate(x0,y0); ctx.rotate(ang);
  ctx.fillStyle='rgba(52,58,74,.9)'; ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.fill();
  const kI=s.illum; { let c0=s.col && s.fobj ? s.col : [242,238,227]; if(s.lunarCover>0){ const k2=Math.min(1,s.lunarCover*1.2); c0=c0.map((v,ii)=>Math.round(v+([160,68,42][ii]-v)*k2)); } ctx.fillStyle=`rgb(${c0[0]},${c0[1]},${c0[2]})`; } ctx.beginPath(); ctx.arc(0,0,R,-Math.PI/2,Math.PI/2,false);
  ctx.ellipse(0,0,Math.max(.01,Math.abs(R*(1-2*kI))),R,0,Math.PI/2,-Math.PI/2,kI<.5); ctx.fill();
  ctx.restore();
}
function drawGrid(pov){
  ctx.strokeStyle='rgba(140,170,220,.16)'; ctx.lineWidth=1;
  const line = (pts) => { ctx.beginPath(); let pen=false, lx=0;
    for(const [lon,lat] of pts){ if(pov) projP(dirOf(lon,lat)); else projM(lon,lat);
      if(!pf || (!pov && pen && Math.abs(px-lx)>W/2)){ pen=false; if(!pf) continue; }
      if(pen) ctx.lineTo(px,py); else { ctx.moveTo(px,py); pen=true; } lx=px; }
    ctx.stroke(); };
  for(let la=-60; la<=75; la+=15){ if(pov && D.horizon && la<=0) continue; const pts=[]; for(let lo=-180; lo<=180; lo+=3) pts.push([lo*deg, la*deg]); line(pts); }
  for(let lo=0; lo<360; lo+=30){ const pts=[]; for(let la=(pov&&D.horizon?0:-90); la<=90; la+=3) pts.push([lo*deg, la*deg]); line(pts); }
}
function drawGround(T){
  const pts=[]; for(let a=0;a<360;a+=1){ const az=a*deg; pts.push(projRaw(dirOf(az, hillAlt(az)))); }
  const outside = -view.pitch < hillAlt(view.yaw+Math.PI);
  ctx.beginPath();
  if(outside) ctx.rect(-10,-10,W+20,H+20);
  ctx.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]); ctx.closePath();
  { const gc=sky.groundCol||[3,5,12], bb=skyDay(), k=.1+.3*bb; ctx.fillStyle=`rgb(${3+(gc[0]-3)*k|0},${5+(gc[1]-5)*k|0},${12+(gc[2]-12)*k|0})`; } ctx.fill('evenodd');
  ctx.save(); ctx.strokeStyle=T.glow; ctx.lineWidth=2; ctx.shadowColor=T.glow; ctx.shadowBlur=18;
  ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]); ctx.closePath(); ctx.stroke(); ctx.restore();
  ctx.font=`600 18px ${SERIF}`; ctx.textAlign='center'; ctx.textBaseline='bottom';
  [['N',0],['E',90],['S',180],['O',270]].forEach(([l,a])=>{ const az=a*deg; projP(dirOf(az, hillAlt(az)+.8*deg)); if(!pf||px<0||px>W||py<0||py>H) return;
    ctx.fillStyle='rgba(216,181,106,.9)'; ctx.fillText(l,px,py); labelBoxes.push([px-8,py-20,16,20]); });
}
function drawMapOverlay(){
  const s=mapS();
  projM(view.mcx,0); const yh=py;
  if(D.horizon){ const x0=W/2-Math.PI*s, yb=H/2-(-Math.PI/2-view.mcy)*s; ctx.fillStyle='rgba(0,0,0,.32)'; ctx.fillRect(x0,yh,TAU*s,yb-yh); }
  ctx.strokeStyle='rgba(216,181,106,.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(W/2-Math.PI*s,yh); ctx.lineTo(W/2+Math.PI*s,yh); ctx.stroke();
  ctx.font=`600 16px ${SERIF}`; ctx.textAlign='center'; ctx.textBaseline='top';
  [['N',0],['E',90],['S',180],['O',270]].forEach(([l,a])=>{ projM(a*deg,0); ctx.fillStyle='rgba(216,181,106,.95)'; ctx.fillText(l,px,py+4); labelBoxes.push([px-8,py+2,16,20]); });
  if(exporting) return;
  setCam(); const f=[cam.fx,cam.fy,cam.fz], r=[cam.rx,0,cam.rz], u=[cam.ux,cam.uy,cam.uz], half=Math.min(view.fov/2, 80*deg);
  ctx.setLineDash([4,5]); ctx.strokeStyle='rgba(236,205,130,.6)'; ctx.beginPath(); let pen=false, lx=0;
  for(let k=0;k<=72;k++){ const t=k/72*TAU, c=Math.cos(half), sn=Math.sin(half);
    const d=[c*f[0]+sn*(Math.cos(t)*r[0]+Math.sin(t)*u[0]), c*f[1]+sn*(Math.cos(t)*r[1]+Math.sin(t)*u[1]), c*f[2]+sn*(Math.cos(t)*r[2]+Math.sin(t)*u[2])];
    projM(lonOf(d),latOf(d)); if(pen && Math.abs(px-lx)<W/2) ctx.lineTo(px,py); else ctx.moveTo(px,py); pen=true; lx=px; }
  ctx.stroke(); ctx.setLineDash([]);
}

/* ---------- boucle ---------- */
let lastDraw = 0, lastT = 0;
function loop(t){
  const dt = Math.min(.1,(t-lastT)/1000); lastT=t;
  if(camAnim) stepCam(t);
  if(landAnim) drawLandFx(t);
  if(travel) stepTravel(t);
  if(playing && !V.open && !W_OPEN){
    if(P.mode==='earth' && !sky.surface){ view.hour+=dt*.25; if(view.hour>=24){ view.hour-=24; const [y,m,d]=(view.date||todayStr()).split('-').map(Number); const n=new Date(y,m-1,d+1); view.date=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; } }
    else { view.hour+=dt*.25; if(view.hour>=24){ view.hour-=24; const cal=computeCalendar(); const Y=cal?cal.Y:365; view.gday=((view.gday||0)+1)%Y; if(cal && view.gday===cal.y0) view.year=(view.year||1)+1; } }
    applyTime(); syncTime(); }
  stepMeteors(dt,t);
  if(CY_OPEN){ if(cyDirty){ drawCity(); cyDirty=false; } }
  else if(CH_OPEN){ stepChrono(dt); if(chDirty){ drawChrono(); chDirty=false; } }
  else if(M_OPEN){ if(mDirty){ drawMicro(); mDirty=false; } }
  else if(W_OPEN){ if(wDirty){ drawWorld(); wDirty=false; } }
  else if(V.open){ vDraw(dt); }
  else {
    const anim = (D.twinkle && !reduceMotion) || meteors.length>0 || (!reduceMotion && (D.weather||D.aurora) && view.mode==='pov');
    if(dirty || (anim && t-lastDraw>40)){ draw(t/1000); dirty=false; lastDraw=t; }
  }
  requestAnimationFrame(loop);
}
