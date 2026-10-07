/* Atlas des ciels imaginaires — Planète de l'observateur (génération et vue du monde)
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ================= planète de l'observateur ================= */
const WW=512, WH=256, WN=WW*WH;
const BIOMES = {
  deep:{label:'Océan profond', col:[20,44,92], water:true, txt:'Des eaux sombres et froides, à des milliers de mètres de profondeur.'},
  ocean:{label:'Haute mer', col:[31,72,130], water:true, txt:'La pleine mer, loin de toute côte.'},
  shallow:{label:'Eaux côtières', col:[56,114,166], water:true, txt:'Des eaux peu profondes et claires, bordées de récifs et de bancs de sable.'},
  seaice:{label:'Banquise', col:[214,228,238], water:true, txt:'Une mer gelée en permanence, où la glace craque sous le vent.'},
  ice:{label:'Calotte glaciaire', col:[238,243,248], txt:'Un désert de glace épais de plusieurs kilomètres, où rien ne pousse.', names:['Inlandsis de X','Glaces de X']},
  tundra:{label:'Toundra', col:[146,156,132], txt:'Une plaine froide couverte de mousses et de lichens, gelée une grande partie de l’année.', names:['Toundra de X','Terres froides de X']},
  taiga:{label:'Taïga', col:[58,94,70], txt:'Une immense forêt de conifères, sombre et silencieuse sous la neige.', names:['Taïga de X','Forêt boréale de X']},
  temperate:{label:'Forêt tempérée', col:[72,126,64], txt:'Des forêts de feuillus qui changent de couleur au fil des saisons.', names:['Forêt de X','Bois de X','Grande Forêt de X']},
  grass:{label:'Prairie', col:[138,166,86], txt:'De grandes plaines herbeuses, parcourues par des troupeaux.', names:['Plaines de X','Prairies de X']},
  steppe:{label:'Steppe', col:[174,170,108], txt:'Une étendue d’herbes rases et de vent, entre la prairie et le désert.', names:['Steppes de X','Hautes Terres de X']},
  desert:{label:'Désert chaud', col:[224,198,138], txt:'Des dunes et des regs brûlés par le soleil, où il ne pleut presque jamais.', names:['Désert de X','Erg de X','Grand Désert de X']},
  colddesert:{label:'Désert froid', col:[186,176,150], txt:'Un plateau sec et venteux, glacial la nuit.', names:['Plateau de X','Désert de X']},
  savanna:{label:'Savane', col:[184,174,92], txt:'Des herbes hautes et des arbres épars, rythmées par la saison des pluies.', names:['Savane de X']},
  jungle:{label:'Forêt tropicale', col:[34,106,50], txt:'Une jungle chaude et humide, d’une densité étouffante.', names:['Jungle de X','Forêt profonde de X']},
  swamp:{label:'Marais', col:[78,108,84], txt:'Des terres noyées, des roseaux et des brumes tenaces.', names:['Marais de X','Marécages de X']},
  mountain:{label:'Montagnes', col:[126,114,102], txt:'Des sommets rocheux et des vallées encaissées.', names:['Monts X','Chaîne de X','Montagnes de X']},
  peak:{label:'Sommets enneigés', col:[232,234,240], txt:'Des cimes couvertes de neiges éternelles.', names:['Monts X','Pics de X']}
};
const BKEYS = Object.keys(BIOMES);
const BI = Object.fromEntries(BKEYS.map((k,i)=>[k,i]));
let world=null, W_OPEN=false, wDirty=true, wSel=null;
const wView={mode:'globe', glon:0, glat:.35, gz:1, mcx:0, mcy:0, mz:1, peoples:true};
const wcv=$('wcv'), wctx=wcv.getContext('2d');
const gCan=document.createElement('canvas'), gctx=gCan.getContext('2d');
let WSW=0, WSH=0;

function makeNoise(r){
  const a=[...Array(256).keys()]; for(let i=255;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  const p=new Uint8Array(512); for(let i=0;i<512;i++) p[i]=a[i&255];
  const fade=t=>t*t*t*(t*(t*6-15)+10), lerp=(x,y,t)=>x+t*(y-x);
  const g=(h,x,y,z)=>{ h&=15; const u=h<8?x:y, v=h<4?y:(h===12||h===14?x:z); return ((h&1)?-u:u)+((h&2)?-v:v); };
  return (x,y,z)=>{ const fx=Math.floor(x), fy=Math.floor(y), fz=Math.floor(z); const X=fx&255, Y=fy&255, Z=fz&255; x-=fx; y-=fy; z-=fz;
    const u=fade(x), v=fade(y), w=fade(z);
    const A=p[X]+Y, AA=p[A]+Z, AB=p[A+1]+Z, B=p[X+1]+Y, BA=p[B]+Z, BB=p[B+1]+Z;
    return lerp(lerp(lerp(g(p[AA],x,y,z),g(p[BA],x-1,y,z),u),lerp(g(p[AB],x,y-1,z),g(p[BB],x-1,y-1,z),u),v),
                lerp(lerp(g(p[AA+1],x,y,z-1),g(p[BA+1],x-1,y,z-1),u),lerp(g(p[AB+1],x,y-1,z-1),g(p[BB+1],x-1,y-1,z-1),u),v),w); };
}
const cellLon = i => (i+.5)/WW*TAU-Math.PI;
const cellLat = j => Math.PI/2-(j+.5)/WH*Math.PI;
function cellOf(lon,lat){ let i=Math.floor((wrapPi(lon)+Math.PI)/TAU*WW); i=((i%WW)+WW)%WW; const j=clamp(Math.floor((Math.PI/2-lat)/Math.PI*WH),0,WH-1); return j*WW+i; }

function components(mask){
  const lab=new Int32Array(WN).fill(-1), sizes=[]; const stack=new Int32Array(WN);
  for(let s0=0;s0<WN;s0++){ if(!mask[s0]||lab[s0]>=0) continue;
    const id=sizes.length; let sp=0, n=0; stack[sp++]=s0; lab[s0]=id;
    while(sp){ const c=stack[--sp]; n++; const i=c%WW, j=(c/WW)|0;
      const nb=[j*WW+((i+1)%WW), j*WW+((i+WW-1)%WW), j>0?c-WW:-1, j<WH-1?c+WW:-1];
      for(const q of nb){ if(q>=0 && mask[q] && lab[q]<0){ lab[q]=id; stack[sp++]=q; } } }
    sizes.push(n); }
  return {lab, sizes};
}
function labelPoints(lab, count, cs){
  const sum=new Float64Array(count*3);
  for(let c=0;c<WN;c++){ const l=lab[c]; if(l<0) continue; const i=c%WW, j=(c/WW)|0; const cl=cs.cosLat[j];
    sum[l*3]+=cl*cs.sinLon[i]; sum[l*3+1]+=cs.sinLat[j]; sum[l*3+2]+=cl*cs.cosLon[i]; }
  const best=new Float64Array(count).fill(-2), bc=new Int32Array(count).fill(-1);
  const cen=[]; for(let l=0;l<count;l++) cen.push(norm([sum[l*3],sum[l*3+1],sum[l*3+2]]));
  for(let c=0;c<WN;c++){ const l=lab[c]; if(l<0) continue; const i=c%WW, j=(c/WW)|0; const cl=cs.cosLat[j];
    const v=cl*cs.sinLon[i]*cen[l][0]+cs.sinLat[j]*cen[l][1]+cl*cs.cosLon[i]*cen[l][2]; if(v>best[l]){ best[l]=v; bc[l]=c; } }
  return [...bc].map(c=>({lon:cellLon(c%WW), lat:cellLat((c/WW)|0)}));
}

function makeWorld(){
  const r = rngFor('world|'+P.wvar), rN = rngFor('wnames|'+P.wvar), st = sky.st;
  const n1=makeNoise(r), n2=makeNoise(r), n3=makeNoise(r), n4=makeNoise(r);
  const fbm=(n,x,y,z,o)=>{ let s=0,a=1,f=1,t=0; for(let k=0;k<o;k++){ s+=a*n(x*f,y*f,z*f); t+=a; a*=.5; f*=2; } return s/t; };
  const relief = P.wrelief/100;
  const cz=(P.wcsize??50)/100, csz=.38+cz*1.25, noiseW=1.75-cz*1.15;
  const cc=[]; for(let k=0;k<P.wconts;k++){ const z=(2*r()-1)*.62, t=r()*TAU, q=Math.sqrt(1-z*z); cc.push({d:[q*Math.cos(t), z, q*Math.sin(t)], s:(.26+r()*.24)*csz, w:.8+r()*.4}); }
  const cs={cosLat:new Float64Array(WH), sinLat:new Float64Array(WH), cosLon:new Float64Array(WW), sinLon:new Float64Array(WW)};
  for(let j=0;j<WH;j++){ const l=cellLat(j); cs.cosLat[j]=Math.cos(l); cs.sinLat[j]=Math.sin(l); }
  for(let i=0;i<WW;i++){ const l=cellLon(i); cs.cosLon[i]=Math.cos(l); cs.sinLon[i]=Math.sin(l); }
  const Ev=new Float32Array(WN), Mn=new Float32Array(WN);
  for(let j=0;j<WH;j++) for(let i=0;i<WW;i++){
    const x=cs.cosLat[j]*cs.sinLon[i], y=cs.sinLat[j], z=cs.cosLat[j]*cs.cosLon[i];
    const qx=x+.3*n2(x*1.7+11,y*1.7,z*1.7), qy=y+.3*n2(x*1.7,y*1.7+23,z*1.7), qz=z+.3*n2(x*1.7,y*1.7,z*1.7+37);
    let c=0; for(const k of cc){ const dt=qx*k.d[0]+qy*k.d[1]+qz*k.d[2]; c+=k.w*Math.exp(-(1-dt)/(k.s*k.s)); }
    const f=fbm(n1,qx*2+5,qy*2+5,qz*2+5,5);
    const rg=1-Math.abs(n3(qx*3.1,qy*3.1,qz*3.1));
    Ev[j*WW+i]=c*.9 + f*(.5+.6*relief)*noiseW + rg*rg*rg*.3*relief;
    Mn[j*WW+i]=fbm(n4,x*2.3+40,y*2.3,z*2.3,3);
  }
  const sorted=Float32Array.from(Ev).sort();
  const oi=clamp(Math.floor(WN*P.wocean/100),1,WN-2), sea=sorted[oi], maxE=sorted[WN-1], minE=sorted[0];
  const mtE=sorted[Math.floor(oi+(WN-oi)*(1-.05-.1*relief))];
  const hm=Math.max(.05,(mtE-sea)/(maxE-sea));
  const h=new Float32Array(WN);
  for(let c=0;c<WN;c++){ const e=Ev[c];
    if(e>=sea){ const v=(e-sea)/(maxE-sea); h[c]= v<hm ? .6*v/hm : .6+.4*(v-hm)/(1-hm); }
    else h[c]=-(sea-e)/(sea-minE); }
  // distance à la mer
  const dist=new Int16Array(WN).fill(-1), qd=new Int32Array(WN); let qh=0, qt=0;
  for(let c=0;c<WN;c++) if(h[c]<0){ dist[c]=0; qd[qt++]=c; }
  while(qh<qt){ const c=qd[qh++], i=c%WW, j=(c/WW)|0;
    for(const q of [j*WW+((i+1)%WW), j*WW+((i+WW-1)%WW), j>0?c-WW:-1, j<WH-1?c+WW:-1]) if(q>=0 && dist[q]<0){ dist[q]=dist[c]+1; qd[qt++]=q; } }
  // climat
  const T=new Float32Array(WN), M=new Float32Array(WN), B=new Uint8Array(WN);
  const tOff=(P.wtemp-50)*.32, mOff=(P.whumid-50)/90;
  for(let j=0;j<WH;j++){ const lat=cellLat(j), al=Math.abs(Math.sin(lat));
    for(let i=0;i<WW;i++){ const c=j*WW+i, hh=h[c];
      const t=28+tOff-50*Math.pow(al,2.6)-Math.max(0,hh)*30; T[c]=t;
      const d=dist[c]<0?60:dist[c];
      const m=clamp(.38*(.5+.5*Math.cos(lat*6)) + .42*Math.exp(-d/11) + .55*Mn[c] + mOff - (hh>.6?.1:0), 0, 1); M[c]=m;
      let b;
      if(hh<0){ b = t<-14 ? 'seaice' : hh>-.1 ? 'shallow' : hh>-.42 ? 'ocean' : 'deep'; }
      else if(hh>.6) b = t<-4 ? 'peak' : 'mountain';
      else if(t<-10) b='ice';
      else if(t<-2) b='tundra';
      else if(t<6) b = m>.42 ? 'taiga' : m<.16 ? 'colddesert' : 'tundra';
      else if(t<19) b = m<.17 ? (t<12?'colddesert':'desert') : m<.3 ? 'steppe' : m<.48 ? 'grass' : (m>.8 && hh<.06 ? 'swamp' : 'temperate');
      else b = m<.2 ? 'desert' : m<.44 ? 'savanna' : (m>.82 && hh<.06 ? 'swamp' : 'jungle');
      B[c]=BI[b]; } }
  // lieux nommés
  const places=[]; const taken=new Set();
  const nameW = () => { let n, k=0; do{ n=starName(rN,st,true); k++; } while(taken.has(n) && k<30); taken.add(n); return n; };
  const fill = (tpl) => tpl.replace('X', nameW());
  // terres
  const landMask=new Uint8Array(WN); for(let c=0;c<WN;c++) landMask[c]=h[c]>=0?1:0;
  const L=components(landMask), lpts=labelPoints(L.lab, L.sizes.length, cs);
  const landId=new Int32Array(WN).fill(-1), lmap=new Int32Array(L.sizes.length).fill(-1);
  const order=L.sizes.map((n,k)=>k).sort((a,b)=>L.sizes[b]-L.sizes[a]);
  for(const k of order){ const n=L.sizes[k];
    if(n>=WN*.012){ lmap[k]=places.length; places.push({kind:'continent', name:nameW(), size:n, ...lpts[k]}); }
    else if(n>=60){ lmap[k]=places.length; places.push({kind:'island', name:'Île de '+nameW(), size:n, ...lpts[k]}); } }
  for(let c=0;c<WN;c++){ const l=L.lab[c]; if(l>=0) landId[c]=lmap[l]; }
  // eaux
  const waterMask=new Uint8Array(WN); for(let c=0;c<WN;c++) waterMask[c]=h[c]<0?1:0;
  const Wc=components(waterMask), wpts=labelPoints(Wc.lab, Wc.sizes.length, cs);
  const waterId=new Int32Array(WN).fill(-1);
  Wc.sizes.forEach((n,k)=>{
    if(n>=WN*.08){
      const cells=[]; for(let c=0;c<WN;c+=7) if(Wc.lab[c]===k) cells.push(c);
      const dirC = c => { const i=c%WW, j=(c/WW)|0; return [cs.cosLat[j]*cs.sinLon[i], cs.sinLat[j], cs.cosLat[j]*cs.cosLon[i]]; };
      const nk=clamp(Math.round(n/(WN*.13)),1,5); const seeds=[dirC(cells[Math.floor(rN()*cells.length)])];
      while(seeds.length<nk){ let bd=2, bc=null; for(const c of cells){ const d=dirC(c); const m=Math.max(...seeds.map(s=>dot(s,d))); if(m<bd){ bd=m; bc=d; } } if(!bc) break; seeds.push(bc); }
      const ids=seeds.map(()=>{ const id=places.length; places.push({kind:'ocean', name:'Océan '+nameW(), size:0}); return id; });
      const sub=new Int32Array(WN).fill(-1);
      for(let c=0;c<WN;c++){ if(Wc.lab[c]!==k) continue; const d=dirC(c); let b=0, bv=-2; seeds.forEach((s,si)=>{ const v=dot(s,d); if(v>bv){ bv=v; b=si; } }); sub[c]=b; waterId[c]=ids[b]; places[ids[b]].size++; }
      const sp=labelPoints(sub, seeds.length, cs); ids.forEach((id,si)=>Object.assign(places[id], sp[si]));
    } else if(n>=25){
      const id=places.length; places.push({kind: n>=300?'sea':'lake', name:(n>=300?'Mer ':'Lac ')+nameW(), size:n, ...wpts[k]});
      for(let c=0;c<WN;c++) if(Wc.lab[c]===k) waterId[c]=id;
    }
  });
  // régions
  const regionId=new Int32Array(WN).fill(-1);
  const groups=['ice','tundra','taiga','temperate','grass','steppe','desert','colddesert','savanna','jungle','swamp'];
  const regCands=[];
  for(const g of groups){ const gi=BI[g]; const mask=new Uint8Array(WN); let any=0; for(let c=0;c<WN;c++) if(B[c]===gi){ mask[c]=1; any=1; } if(!any) continue;
    const R=components(mask); const pts=labelPoints(R.lab, R.sizes.length, cs);
    R.sizes.forEach((n,k)=>{ if(n>=WN*.003) regCands.push({g, n, k, R, pt:pts[k]}); }); }
  { const mask=new Uint8Array(WN); for(let c=0;c<WN;c++) if(h[c]>.6) mask[c]=1;
    const R=components(mask); const pts=labelPoints(R.lab, R.sizes.length, cs);
    R.sizes.forEach((n,k)=>{ if(n>=WN*.0012) regCands.push({g:'mountain', n, k, R, pt:pts[k]}); }); }
  regCands.sort((a,b)=>b.n-a.n).slice(0,60).forEach(rc=>{
    const id=places.length; places.push({kind: rc.g==='mountain'?'mountains':'region', biome:rc.g, name:fill(pick(rN,BIOMES[rc.g].names)), size:rc.n, ...rc.pt});
    for(let c=0;c<WN;c++) if(rc.R.lab[c]===rc.k && (rc.g==='mountain' || regionId[c]<0)) regionId[c]=id;
  });
  const peoples = makePeoples({h, B, dist, lab:L.lab, cs, rN, places});
  // image
  const img=new ImageData(WW,WH), px8=img.data;
  for(let j=0;j<WH;j++) for(let i=0;i<WW;i++){ const c=j*WW+i, hh=h[c], bk=BKEYS[B[c]]; let col=BIOMES[bk].col.slice();
    if(hh<0 && bk!=='seaice'){ const k=clamp(-hh,0,1); const a=[62,124,176], b2=[14,34,78]; col=a.map((v,q)=>v+(b2[q]-v)*Math.pow(k,.6)); }
    else if(hh>=0){ const hw=h[j*WW+((i+WW-1)%WW)], he=h[j*WW+((i+1)%WW)], hn=j>0?h[c-WW]:hh, hs=j<WH-1?h[c+WW]:hh;
      const sh=clamp(1+((hw-he)+(hn-hs))*(4+6*relief),.65,1.35); col=col.map(v=>v*sh);
      if(hw<0||he<0||hn<0||hs<0) col=col.map(v=>v*.82); }
    px8[c*4]=clamp(col[0],0,255); px8[c*4+1]=clamp(col[1],0,255); px8[c*4+2]=clamp(col[2],0,255); px8[c*4+3]=255; }
  const can=document.createElement('canvas'); can.width=WW; can.height=WH; can.getContext('2d').putImageData(img,0,0);
  // description
  let landN=0; const bc={}; for(let c=0;c<WN;c++) if(h[c]>=0){ landN++; const k=BKEYS[B[c]]; bc[k]=(bc[k]||0)+1; }
  const topB=Object.entries(bc).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>BIOMES[k].label.toLowerCase());
  const conts=places.filter(p=>p.kind==='continent'), oceans=places.filter(p=>p.kind==='ocean');
  const pname = cap(starName(rngFor('wtitle|'+P.wvar), st, true));
  const climate = P.wtemp<30?'froid':P.wtemp>70?'chaud':'tempéré';
  const desc = `${pname} est un monde ${climate} dont ${Math.round(100-landN/WN*100)} % de la surface est recouverte d’eau. `+
    (conts.length ? (conts.length===1 ? `Un seul continent, ${conts[0].name}, émerge des flots` : `${conts.length} continents émergent des flots, dont ${conts[0].name}, le plus vaste`) : 'Aucun continent n’émerge, seulement des îles') +
    (oceans.length ? `, entourés par ${oceans.length>1?oceans.length+' océans':'un océan unique, '+oceans[0].name}. ` : '. ') +
    (topB.length ? `Les terres sont surtout couvertes de ${topB.join(', ').replace(/, ([^,]*)$/,' et $1')}.` : '');
  const frame = makeHomeFrame(pname);
  const peopleImg = peoples.list.length ? buildPeopleImage(px8, peoples) : null;
  return {h, T, M, B, dist, landId, waterId, regionId, places, canvas:can, px:px8, name:pname, desc: desc + (peoples.list.length ? ` ${peoples.list.length} peuples s’en partagent les terres : ${peoples.list.map(p=>p.name).join(', ').replace(/, ([^,]*)$/,' et $1')}.` : ''), cs, peoples, frame, peopleImg};
}

const worldKey = () => [P.seed,P.style,P.wocean,P.wconts,P.wcsize,P.wrelief,P.wtemp,P.whumid,P.wvar,P.wtilt,P.wyear,P.wmoons,P.wsuns,P.wpeoples].join('|');
function buildWorld(){
  const key=worldKey();
  if(!world || world.key!==key){ world = makeWorld(); world.key=key; world.pois=makeWorldPOIs(world); }
  wSel=null;
  if(!D.placed) placeDefault();
  wDirty=true;
}
function placeDefault(){
  let best=-1, bs=1e9;
  for(let c=0;c<WN;c+=3){ const hh=world.h[c]; if(hh<0||hh>.55) continue; const t=world.T[c]; if(t<4||t>22) continue;
    const lat=cellLat((c/WW)|0), lon=cellLon(c%WW); const sc=Math.abs(lat-45*deg)*3+Math.abs(lon)*.5+(world.regionId[c]<0?.3:0);
    if(sc<bs){ bs=sc; best=c; } }
  if(best<0){ for(let c=0;c<WN;c+=3) if(world.h[c]>=0){ best=c; break; } }
  if(best>=0){ D.lat=cellLat((best/WW)|0)/deg; D.lon=cellLon(best%WW)/deg; }
  D.placed=true;
}
function placeName(c){
  const w=world, P2=w.places;
  if(w.h[c]<0) return w.waterId[c]>=0 ? P2[w.waterId[c]].name : 'la haute mer';
  if(w.regionId[c]>=0) return P2[w.regionId[c]].name;
  if(w.landId[c]>=0) return P2[w.landId[c]].name;
  return 'un îlot sans nom';
}
function updateLocation(){
  if(!sky) return;
  if(sky.surface){ const F=sky.surface; sky.hillAmp=F.hillAmp; sky.groundCol=F.groundCol;
    $('skyMeta').textContent=`Sur ${F.name}, autour de ${F.suns[0].name}${F.gas?', dans la haute atmosphère':''}${sky.vantage!=null?', à '+fmtLy(Math.hypot(...starPos(sky.stars[sky.vantage])))+' de '+homeName():''}`; dirty=true; return; }
  if(sky.vantage!=null){ const st=sky.stars[sky.vantage]; $('skyMeta').textContent=`Dans l’espace près de ${starLabel(st)}, à ${fmtLy(Math.hypot(...starPos(st)))} de ${homeName()}`; dirty=true; return; }
  if(!world) return;
  if(sky.earth){
    const n = D.eplace || earthPlaceName(obsLat(),obsLon());
    sky.hillAmp=.8; sky.groundCol=[64,84,52];
    $('skyMeta').textContent=`Vu depuis ${n}, ${latLabel(obsLat())} ${lonLabel(obsLon())}`;
    const lh=$('locHint'); if(lh) lh.textContent=`${n}, ${latLabel(obsLat())} ${lonLabel(obsLon())}`;
    dirty=true; return;
  }
  const c=cellOf(obsLon()*deg, obsLat()*deg), hh=world.h[c];
  sky.hillAmp = hh<0 ? .1 : clamp(.35 + hh*hh*9*(.5+P.wrelief/100), .35, 5.5);
  sky.groundCol = hh<0 ? [18,36,70] : BIOMES[BKEYS[world.B[c]]].col;
  sky.localPeople = peopleAt(c);
  const pp = sky.localPeople>=0 ? world.peoples.list[sky.localPeople] : null;
  const where = D.gplace || placeName(c), cont = world.landId[c]>=0 ? world.places[world.landId[c]].name : null;
  $('skyMeta').textContent = `Vu depuis ${where}${pp ? ', au pays '+pp.name.replace(/^les /,'des ') : cont && cont!==where ? ', '+cont : ''}, sur ${world.name}`;
  calCache=null;
  const lh=$('locHint'); if(lh) lh.textContent = `${cap(where)}${cont && cont!==where ? ' ('+cont+')' : ''}, ${latLabel(obsLat())} ${lonLabel(obsLon())}`;
  dirty=true;
}

/* ---------- ouverture ---------- */
function openWorld(){ W_OPEN=true; $('world').hidden=false; $('card').hidden=true; closeSheets(); wView.glon=obsLon()*deg; wView.glat=clamp(obsLat()*deg,-1.2,1.2); wView.mcx=obsLon()*deg; wView.mcy=0; wSel=null; wPanel(); wDirty=true; }
function closeWorld(){ W_OPEN=false; $('world').hidden=true; dirty=true; }

$('wBack').onclick=closeWorld;
document.querySelectorAll('[data-wmode]').forEach(b=>b.onclick=()=>{ wView.mode=b.dataset.wmode; document.querySelectorAll('[data-wmode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); wDirty=true; });
$('wZin').onclick=()=>wZoom(.8); $('wZout').onclick=()=>wZoom(1.25);
function wZoom(f){ if(wView.mode==='globe') wView.gz=clamp(wView.gz/f,.6,4); else wView.mz=clamp(wView.mz/f,.8,12); wDirty=true; }
function wPan(dx,dy){
  if(wView.mode==='globe'){ const R=wR(); wView.glon=wrapPi(wView.glon-dx/R); wView.glat=clamp(wView.glat+dy/R,-1.45,1.45); }
  else { const s=wS(); wView.mcx=wrapPi(wView.mcx-dx/s); wView.mcy=clamp(wView.mcy+dy/s,-Math.PI/2,Math.PI/2); }
  wDirty=true;
}
attachDrag(wcv, wPan, wZoom, wTap, null);
const wR = () => Math.min(WSW,WSH)*.42*wView.gz;
const wS = () => (WSW<WSH ? WSH/Math.PI*.8 : Math.min(WSW/TAU, WSH/Math.PI)*.94)*wView.mz;
function gBasis(){ const lo=wView.glon, la=wView.glat; const f=dirOf(lo,la), e=[Math.cos(lo),0,-Math.sin(lo)], n=cross(f,e); return {f,e,n}; }
function wToScreen(lon,lat){
  if(wView.mode==='globe'){ const {f,e,n}=gBasis(), d=dirOf(lon,lat), z=dot(d,f); const R=wR(); return {x:WSW/2+dot(d,e)*R, y:WSH/2-dot(d,n)*R, vis:z>.12, z}; }
  const s=wS(); return {x:WSW/2+wrapPi(lon-wView.mcx)*s, y:WSH/2-(lat-wView.mcy)*s, vis:true, z:1};
}
function wTap(x,y){
  if(world && !world.earth){ let best=null, bd=13; for(const h of wHits){ const d=Math.hypot(h.x-x,h.y-y); if(d<bd){ bd=d; best=h.o; } }
    if(best){ const isPoi=best.kind==='poi'||best.kind==='poi-major'; wSel={lon:best.lon, lat:best.lat, c: best.cell ?? cellOf(best.lon,best.lat)}; if(isPoi) wSel.poi=best; else wSel.city=best; wPanel(); wDirty=true; return; } }
  let lon, lat;
  if(wView.mode==='globe'){ const R=wR(), gx=(x-WSW/2)/R, gy=-(y-WSH/2)/R, rr=gx*gx+gy*gy; if(rr>1){ wSel=null; wPanel(); wDirty=true; return; }
    const gz=Math.sqrt(1-rr), {f,e,n}=gBasis(); const v=[gx*e[0]+gy*n[0]+gz*f[0], gx*e[1]+gy*n[1]+gz*f[1], gx*e[2]+gy*n[2]+gz*f[2]]; lon=lonOf(v); lat=latOf(v); }
  else { const s=wS(); lon=wrapPi(wView.mcx+(x-WSW/2)/s); lat=wView.mcy-(y-WSH/2)/s; if(Math.abs(lat)>Math.PI/2 || Math.abs(x-WSW/2)>Math.PI*s){ wSel=null; wPanel(); wDirty=true; return; } }
  wSel={lon, lat, c: world.earth ? -1 : cellOf(lon,lat)}; wPanel(); wDirty=true;
}

/* ---------- dessin ---------- */
function drawWorld(){
  const rect=$('wStage').getBoundingClientRect(), dpr=Math.min(2,devicePixelRatio||1);
  if(Math.round(rect.width*dpr)!==wcv.width || Math.round(rect.height*dpr)!==wcv.height){ wcv.width=Math.round(rect.width*dpr); wcv.height=Math.round(rect.height*dpr); }
  WSW=rect.width; WSH=rect.height; wctx.setTransform(dpr,0,0,dpr,0,0);
  wctx.fillStyle='#02040b'; wctx.fillRect(0,0,WSW,WSH);
  for(const [x,y,a,s2] of bgStars){ wctx.fillStyle=`rgba(220,225,240,${a*.5})`; wctx.fillRect(x*WSW,y*WSH,s2,s2); }
  if(!world) return;
  if(wView.mode==='globe') drawGlobe(); else drawWMap();
  drawWLabels();
}
function drawGlobe(){
  const R=wR(), cx=WSW/2, cy=WSH/2, S=Math.min(900, Math.ceil(2*R));
  if(gCan.width!==S){ gCan.width=S; gCan.height=S; }
  const id=gctx.createImageData(S,S), d=id.data, src=(wView.peoples && world.peopleImg) ? world.peopleImg.px : world.px;
  const {f,e,n}=gBasis(), CW=world.cw||WW, CH=world.ch||WH;
  for(let py=0;py<S;py++){ const gy=1-(py+.5)/S*2;
    for(let px2=0;px2<S;px2++){ const gx=(px2+.5)/S*2-1, rr=gx*gx+gy*gy; if(rr>1) continue;
      const gz=Math.sqrt(1-rr);
      const vx=gx*e[0]+gy*n[0]+gz*f[0], vy=gx*e[1]+gy*n[1]+gz*f[1], vz=gx*e[2]+gy*n[2]+gz*f[2];
      const lon=Math.atan2(vx,vz), lat=Math.asin(vy);
      let i=Math.floor((lon+Math.PI)/TAU*CW); if(i>=CW) i=CW-1; const j=clamp(Math.floor((Math.PI/2-lat)/Math.PI*CH),0,CH-1);
      const c=(j*CW+i)*4, o=(py*S+px2)*4, l=.5+.5*Math.pow(gz,.6);
      d[o]=src[c]*l; d[o+1]=src[c+1]*l; d[o+2]=src[c+2]*l; d[o+3]=255; } }
  gctx.putImageData(id,0,0);
  const at=wctx.createRadialGradient(cx,cy,R*.95,cx,cy,R*1.12); at.addColorStop(0,'rgba(120,170,255,.35)'); at.addColorStop(1,'rgba(120,170,255,0)');
  wctx.fillStyle=at; wctx.beginPath(); wctx.arc(cx,cy,R*1.12,0,TAU); wctx.fill();
  wctx.imageSmoothingEnabled=true; wctx.drawImage(gCan,cx-R,cy-R,2*R,2*R);
}
function drawWMap(){
  const s=wS(), x0=WSW/2-Math.PI*s, y0=WSH/2-(Math.PI/2-wView.mcy)*s, w=TAU*s, hgt=Math.PI*s;
  wctx.save(); wctx.beginPath(); wctx.rect(x0,y0,w,hgt); wctx.clip(); wctx.imageSmoothingEnabled=true;
  const xL=WSW/2+(-Math.PI-wView.mcx)*s;
  const wimg=(wView.peoples && world.peopleImg) ? world.peopleImg.can : world.canvas;
  for(const k of [-1,0,1]) wctx.drawImage(wimg, xL+k*w, y0, w, hgt);
  wctx.strokeStyle='rgba(255,255,255,.12)'; wctx.lineWidth=1;
  for(let la=-60;la<=60;la+=30){ const y=WSH/2-(la*deg-wView.mcy)*s; wctx.beginPath(); wctx.moveTo(x0,y); wctx.lineTo(x0+w,y); wctx.stroke(); }
  for(let lo=-180;lo<180;lo+=30){ const x=WSW/2+wrapPi(lo*deg-wView.mcx)*s; wctx.beginPath(); wctx.moveTo(x,y0); wctx.lineTo(x,y0+hgt); wctx.stroke(); }
  wctx.restore();
  wctx.strokeStyle='rgba(216,181,106,.4)'; wctx.strokeRect(x0,y0,w,hgt);
}
let wHits=[];
function drawWLabels(){
  wHits=[];
  const boxes=[]; const free=(x,y,w,h)=>{ for(const b of boxes) if(x<b[0]+b[2]&&x+w>b[0]&&y<b[1]+b[3]&&y+h>b[1]) return false; boxes.push([x,y,w,h]); return true; };
  const z = wView.mode==='globe' ? wView.gz : wView.mz;
  const sorted=[...world.places].sort((a,b)=>{ const pr={continent:0,people:.5,ocean:1,capital:1.5,sea:2,mountains:3,city:3.5,region:4,island:5,lake:6}; return (pr[a.kind]??8)-(pr[b.kind]??8) || b.size-a.size; });
  wctx.textAlign='center'; wctx.textBaseline='middle'; wctx.lineJoin='round';
  // points d'observation
  const mark=(lon,lat,col,r2)=>{ const p=wToScreen(lon,lat); if(!p.vis) return null; wctx.fillStyle=col; wctx.beginPath(); wctx.arc(p.x,p.y,r2,0,TAU); wctx.fill(); wctx.strokeStyle='#141a33'; wctx.lineWidth=1.5; wctx.stroke(); return p; };
  const me=mark(obsLon()*deg, obsLat()*deg, '#d8b56a', 6);
  if(me){ wctx.strokeStyle='rgba(216,181,106,.8)'; wctx.lineWidth=1.2; wctx.beginPath(); wctx.arc(me.x,me.y,12,0,TAU); wctx.stroke(); boxes.push([me.x-14,me.y-14,28,28]); }
  if(wSel){ const p=wToScreen(wSel.lon,wSel.lat); if(p.vis){ wctx.strokeStyle='#fff4d6'; wctx.lineWidth=1.6; wctx.beginPath(); wctx.arc(p.x,p.y,9,0,TAU); wctx.stroke(); wctx.beginPath(); wctx.moveTo(p.x-14,p.y); wctx.lineTo(p.x-5,p.y); wctx.moveTo(p.x+5,p.y); wctx.lineTo(p.x+14,p.y); wctx.stroke(); boxes.push([p.x-14,p.y-14,28,28]); } }
  if(!world.earth && world.pois){
    for(const o of world.pois){ const p=wToScreen(o.lon,o.lat); if(!p.vis||p.x<0||p.x>WSW||p.y<0||p.y>WSH) continue; const maj=o.kind==='poi-major';
      wctx.save(); wctx.translate(p.x,p.y); wctx.rotate(Math.PI/4); const q=maj?6:3.5; wctx.fillStyle=maj?'#f0c14b':'#e6cf94'; wctx.strokeStyle='#2b1d08'; wctx.lineWidth=1.3; wctx.fillRect(-q,-q,2*q,2*q); wctx.strokeRect(-q,-q,2*q,2*q); wctx.restore();
      if(wSel && wSel.poi===o){ wctx.strokeStyle='#fff4d6'; wctx.lineWidth=1.6; wctx.beginPath(); wctx.arc(p.x,p.y,11,0,TAU); wctx.stroke(); }
      wHits.push({x:p.x,y:p.y,o});
      if(maj || z>=1.5){ wctx.font=maj?`italic 600 14px ${SERIF}`:`italic 500 12px ${SERIF}`; const w=wctx.measureText(o.name).width+8, ly=p.y+(maj?15:12);
        if(free(p.x-w/2,ly-9,w,18)){ wctx.textAlign='center'; wctx.textBaseline='middle'; wctx.strokeStyle='rgba(8,12,24,.7)'; wctx.lineWidth=3; wctx.strokeText(o.name,p.x,ly); wctx.fillStyle=maj?'#ffe29a':'#f3e2b8'; wctx.fillText(o.name,p.x,ly); } } }
    for(const pl of world.places){ if(pl.kind!=='city'&&pl.kind!=='capital') continue; const p=wToScreen(pl.lon,pl.lat); if(p.vis) wHits.push({x:p.x,y:p.y,o:pl}); }
  }
  for(const pl of sorted){
    const minSize = {continent:0, ocean:0, sea:WN*.02/z, mountains:WN*.004/z, region:WN*.012/(z*z), island:WN*.004/(z*z), lake:WN*.003/(z*z), city: world.earth ? (z>=1.4 ? 0 : 2) : (z>=1.3 ? 0 : 3), capital:0, people: wView.peoples ? 0 : 99}[pl.kind];
    if(pl.size<minSize) continue;
    const p=wToScreen(pl.lon,pl.lat); if(!p.vis||p.x<0||p.x>WSW||p.y<0||p.y>WSH) continue;
    let font, col;
    if(pl.kind==='continent'){ font=`600 ${Math.round(clamp(17*Math.sqrt(z),16,30))}px ${SERIF}`; col='#fbf5e4'; }
    else if(pl.kind==='ocean'||pl.kind==='sea'){ font=`italic 500 ${pl.kind==='ocean'?17:15}px ${SERIF}`; col='#d6e7ff'; }
    else if(pl.kind==='lake'){ font=`italic 500 13px ${SERIF}`; col='#d6e7ff'; }
    else if(pl.kind==='people'){ font=`italic 600 ${Math.round(clamp(15*Math.sqrt(z),15,24))}px ${SERIF}`; col='#fff1c9'; }
    else if(pl.kind==='capital'){ font='600 12.5px Figtree, system-ui, sans-serif'; col='#ffe3a3'; wctx.fillStyle='#ffd98a'; wctx.strokeStyle='#141a33'; wctx.lineWidth=1.5; wctx.beginPath(); wctx.arc(p.x,p.y,4.5,0,TAU); wctx.fill(); wctx.stroke(); p.y-=12; }
    else if(pl.kind==='city'){ font='500 12px Figtree, system-ui, sans-serif'; col='#ffffff'; wctx.fillStyle='#fff'; wctx.beginPath(); wctx.arc(p.x,p.y,2.5,0,TAU); wctx.fill(); p.y-=11; }
    else { font=`italic 500 14px ${SERIF}`; col='#f3ecd9'; }
    wctx.font=font; const w=wctx.measureText(pl.name).width+8;
    if(!free(p.x-w/2,p.y-10,w,20)) continue;
    wctx.strokeStyle='rgba(8,12,24,.65)'; wctx.lineWidth=3; wctx.strokeText(pl.name,p.x,p.y); wctx.fillStyle=col; wctx.fillText(pl.name,p.x,p.y);
  }
}

/* ---------- panneau ---------- */
const W_SPEC=[['wocean','Part d’océans',20,92,1,v=>v+' %'],['wconts','Nombre de continents',1,8,1,v=>v],['wcsize','Taille des continents',0,100,1,v=>v<25?'archipels':v<45?'petits':v<65?'moyens':v<85?'grands':'immenses'],['wrelief','Relief',0,100,1,v=>v+' %'],['wtemp','Température',0,100,1,v=>v<30?'froide':v>70?'chaude':'tempérée'],['whumid','Humidité',0,100,1,v=>v<30?'sèche':v>70?'humide':'moyenne'],['wpeoples','Peuples',0,16,1,v=>v],['wmoons','Lunes',0,3,1,v=>v],['wsuns','Soleils',1,2,1,v=>v],['wtilt','Inclinaison de l’axe',0,45,1,v=>v+'°'],['wyear','Jours par an',200,600,5,v=>v]];
(function buildWParams(){
  const box=$('wParams');
  for(const [k,label,min,max,step,fmt] of W_SPEC){
    const row=document.createElement('div'); row.className='row';
    row.innerHTML=`<label for="w_${k}"><span>${label}</span><output id="wo_${k}"></output></label><input type="range" id="w_${k}" min="${min}" max="${max}" step="${step}">`;
    box.append(row);
    const inp=row.querySelector('input'); inp.addEventListener('input',()=>{ P[k]=+inp.value; $('wo_'+k).textContent=fmt(P[k]); regenWorldSoon(); });
  }
})();
$('wOther').onclick=()=>{ P.wvar=(P.wvar||0)+1; regenWorld(); };
function syncWParams(){ for(const [k,,,,,fmt] of W_SPEC){ $('w_'+k).value=P[k]; $('wo_'+k).textContent=fmt(P[k]); } }
let wT=0; function regenWorldSoon(){ clearTimeout(wT); wT=setTimeout(regenWorld,160); }
function regenWorld(){ world=makeWorld(); world.key=worldKey(); world.pois=makeWorldPOIs(world); wSel=null; objCache.clear(); if(!sky.surface){ attachFrame(world.frame); if(sky.vantage!=null) setVantage(sky.vantage); } view.gday=Math.min(view.gday||0, world.frame.yearLen-1); applyTime(); updateLocation(); wPanel(); wDirty=true; syncTime(); }
function wPanel(){
  if(!world) return;
  $('wParamBlock').hidden=!!world.earth;
  if(world.earth){ earthWPanel(); return; }
  $('wListTitle').textContent='Continents et océans';
  syncWParams();
  $('wTitle').textContent=world.name;
  const info=$('wInfo'); info.innerHTML='';
  const h=document.createElement('h3'), sub=document.createElement('p'), p=document.createElement('p'), dl=document.createElement('dl'), acts=document.createElement('div');
  sub.className='sub'; p.className='desc'; dl.className='facts'; acts.className='acts';
  if(wSel){
    const c=wSel.c, hh=world.h[c], bk=BKEYS[world.B[c]], b=BIOMES[bk], pk=peopleAt(c), pp=pk>=0?world.peoples.list[pk]:null;
    if(wSel.poi){ const o=wSel.poi; h.textContent=o.name; sub.textContent=(o.kind==='poi-major'?'Lieu légendaire':'Lieu remarquable')+', danger '+o.danger; p.textContent=o.desc+' Rumeur : '+o.hook; }
    else if(wSel.city){ h.textContent=wSel.city.name; sub.textContent=(wSel.city.kind==='capital'?'Capitale ':'Cité ')+(pp?pp.name.replace(/^les /,'des '):'sans peuple'); p.textContent=wSel.city.desc+' '+b.txt; }
    else { h.textContent=cap(placeName(c)); sub.textContent=b.label; p.textContent=b.txt; }
    const rows=[]; if(pp) rows.push(['Peuple', cap(pp.name)]);
    if(hh>=0){ if(world.landId[c]>=0) rows.push([world.places[world.landId[c]].kind==='island'?'Île':'Continent', world.places[world.landId[c]].name]); rows.push(['Altitude', fr(Math.round(hh*hh*5600/10)*10,0)+' m']); }
    else { if(world.waterId[c]>=0) rows.push(['Étendue d’eau', world.places[world.waterId[c]].name]); rows.push(['Profondeur', fr(Math.round(-hh*6200/10)*10,0)+' m']); }
    rows.push(['Coordonnées', latLabel(wSel.lat/deg)+', '+lonLabel(wSel.lon/deg)], ['Température moyenne', fr(Math.round(world.T[c]),0)+' °C'], ['Précipitations', world.M[c]<.25?'faibles':world.M[c]<.55?'modérées':'abondantes']);
    fillFacts(dl, rows);
    const go=document.createElement('button'); go.className='act primary'; go.textContent='Observer le ciel d’ici';
    go.onclick=()=>{ setObs(wSel.lat/deg, wSel.lon/deg); D.gplace = wSel.city ? wSel.city.name : wSel.poi ? wSel.poi.name : null; closeWorld(); setMode('pov'); applyTime(); updateLocation(); toast('Tu observes maintenant depuis '+(wSel.city?wSel.city.name:wSel.poi?wSel.poi.name:placeName(wSel.c))); syncTime(); };
    acts.append(go);
    if(pk>=0){ const cm=document.createElement('button'); cm.className='act'; cm.textContent='Carte du pays '+pp.name.replace(/^les /,'des '); cm.onclick=()=>{ closeWorld(); openCountryMap(pk); }; acts.append(cm); }
    if(wSel.city){ const pc=document.createElement('button'); pc.className='act'; pc.textContent='Plan de la ville'; pc.onclick=()=>{ const ct=wSel.city; closeWorld(); openCityPlan(ct, ct.people); }; acts.append(pc); }
  } else {
    h.textContent=world.name; sub.textContent='Ta planète'; p.textContent=world.desc+' Touche un endroit pour le découvrir et observer le ciel depuis là-bas.';
    if(world.peoples && world.peoples.list.length){ const tg=document.createElement('button'); tg.className='act'; tg.textContent = wView.peoples ? 'Masquer les peuples' : 'Afficher les peuples'; tg.onclick=()=>{ wView.peoples=!wView.peoples; wPanel(); wDirty=true; }; acts.append(tg); }
    const c=cellOf(obsLon()*deg,obsLat()*deg); fillFacts(dl, [['Tu observes depuis', cap(placeName(c))], ['Coordonnées', latLabel(obsLat())+', '+lonLabel(obsLon())]]);
  }
  info.append(h,sub,p,dl); if(acts.children.length) info.append(acts);
  const ul=$('wList'); ul.innerHTML='';
  for(const pl of world.places.filter(q=>q.kind==='continent'||q.kind==='ocean'||q.kind==='sea').sort((a,b)=>(a.kind==='continent'?0:1)-(b.kind==='continent'?0:1)||b.size-a.size)){
    const li=document.createElement('li'), bt=document.createElement('button');
    const d2=document.createElement('span'); d2.className='dot'; d2.style.background=pl.kind==='continent'?'#6f9a5a':'#3a6fae';
    const n=document.createElement('span'); n.className='nm'; n.textContent=pl.name;
    const t=document.createElement('span'); t.className='ty'; t.textContent={continent:'Continent',ocean:'Océan',sea:'Mer'}[pl.kind];
    bt.append(d2,n,t); bt.onclick=()=>{ wView.glon=pl.lon; wView.glat=clamp(pl.lat,-1.2,1.2); wView.mcx=pl.lon; wView.mcy=clamp(pl.lat,-.8,.8); wSel={lon:pl.lon, lat:pl.lat, c:cellOf(pl.lon,pl.lat)}; wPanel(); wDirty=true; };
    li.append(bt); ul.append(li);
  }
  if(world.peoples){ for(const pp of world.peoples.list) for(const ct of pp.cities){
    const li=document.createElement('li'), bt=document.createElement('button');
    const d2=document.createElement('span'); d2.className='dot'; d2.style.background=pp.col;
    const n=document.createElement('span'); n.className='nm'; n.textContent=ct.name;
    const t=document.createElement('span'); t.className='ty'; t.textContent=(ct.kind==='capital'?'Capitale, ':'')+pp.name;
    bt.append(d2,n,t); bt.onclick=()=>{ wView.glon=ct.lon; wView.glat=clamp(ct.lat,-1.2,1.2); wView.mcx=ct.lon; wView.mcy=clamp(ct.lat,-.8,.8); wSel={lon:ct.lon, lat:ct.lat, c:ct.cell, city:ct}; wPanel(); wDirty=true; };
    li.append(bt); ul.append(li); } }
  $('wListTitle').textContent = world.peoples && world.peoples.list.length ? 'Continents, océans et cités' : 'Continents et océans';
}
new ResizeObserver(()=>{ wDirty=true; }).observe($('wStage'));
function earthWPanel(){
  $('wTitle').textContent='Terre'; $('wListTitle').textContent='Villes et lieux célèbres';
  const info=$('wInfo'); info.innerHTML='';
  const h=document.createElement('h3'), sub=document.createElement('p'), p=document.createElement('p'), dl=document.createElement('dl'), acts=document.createElement('div');
  sub.className='sub'; p.className='desc'; dl.className='facts'; acts.className='acts';
  if(wSel){
    const la=wSel.lat/deg, lo=wSel.lon/deg, country=countryAt(lo,la), n = wSel.name || country || oceanAt(lo,la);
    h.textContent=n; sub.textContent = wSel.name ? (country||'') : country ? 'Pays' : 'En mer';
    const rows=[['Coordonnées', latLabel(la)+', '+lonLabel(lo)]]; if(wSel.name && country) rows.unshift(['Pays', country]);
    fillFacts(dl, rows);
    const go=document.createElement('button'); go.className='act primary'; go.textContent='Observer le ciel d’ici';
    go.onclick=()=>{ setObs(la, lo); D.eplace = wSel.name || n; closeWorld(); setMode('pov'); applyTime(); updateLocation(); syncTime(); toast('Tu observes maintenant depuis '+(wSel.name||n)); };
    acts.append(go);
  } else {
    h.textContent='Terre'; sub.textContent='Notre planète'; p.textContent=world.desc;
    fillFacts(dl, [['Tu observes depuis', D.eplace||earthPlaceName(obsLat(),obsLon())], ['Coordonnées', latLabel(obsLat())+', '+lonLabel(obsLon())]]);
  }
  info.append(h,sub); if(p.textContent) info.append(p); info.append(dl); if(acts.children.length) info.append(acts);
  const ul=$('wList'); ul.innerHTML='';
  for(const [n,la,lo] of EARTH_CITIES){
    const li=document.createElement('li'), bt=document.createElement('button');
    const d2=document.createElement('span'); d2.className='dot'; d2.style.background='#d8b56a';
    const nm=document.createElement('span'); nm.className='nm'; nm.textContent=n;
    const t=document.createElement('span'); t.className='ty'; t.textContent=latLabel(la)+' '+lonLabel(lo);
    bt.append(d2,nm,t); bt.onclick=()=>{ wView.glon=lo*deg; wView.glat=clamp(la*deg,-1.2,1.2); wView.mcx=lo*deg; wView.mcy=clamp(la*deg,-.8,.8); wSel={lon:lo*deg, lat:la*deg, c:-1, name:n}; wPanel(); wDirty=true; };
    li.append(bt); ul.append(li);
  }
}
