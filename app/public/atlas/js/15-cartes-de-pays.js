/* Atlas des ciels imaginaires — Cartes de pays
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ================= cartes de pays ================= */
const PARCH={deep:[140,170,194], ocean:[158,187,207], shallow:[176,202,217], seaice:[226,232,236], ice:[241,241,235], tundra:[221,217,199], taiga:[194,205,171], temperate:[205,213,164], grass:[227,221,175], steppe:[231,219,169], desert:[237,217,165], colddesert:[223,213,183], savanna:[231,213,159], jungle:[184,204,149], swamp:[194,203,167], mountain:[214,200,174], peak:[236,234,228]};
const INNS=['du Loup borgne','de la Lune rousse','du Chaudron fêlé','des Trois Étoiles','du Pèlerin fatigué','de la Chouette ivre','du Sanglier d’or','de la Comète','du Dernier Relais','de la Lanterne bleue'];
const MINOR={
  inn:{label:'Auberge', hooks:['Le patron achète des cartes anciennes au prix fort.','On y recrute des escortes pour les caravanes.','Un voyageur y attend quelqu’un qui ne vient pas.','La cave communique avec un vieux souterrain.']},
  bridge:{label:'Pont', hooks:['Un péage y est exigé par des soldats sans uniforme.','Le pont menace de céder à la prochaine crue.','On dit qu’un troll y réclame une devinette.']},
  tower:{label:'Tour de garde', hooks:['La garnison surveille les passages de contrebandiers.','Le capitaine cherche des éclaireurs.','Des signaux lumineux y sont échangés la nuit avec l’autre rive.']},
  mine:{label:'Mine', hooks:['Un filon de métal céleste vient d’être découvert.','Les mineurs se sont mis en grève après un accident étrange.']},
  ruin:{label:'Ruines', hooks:['Des pilleurs y ont trouvé une clé de bronze.','Des lumières y bougent la nuit.']},
  shrine:{label:'Sanctuaire', hooks:['Les pèlerins s’y rassemblent au retour de {star}.','L’ermite gardien parle aux voyageurs de présages inquiétants.']},
  lighthouse:{label:'Phare', hooks:['Le gardien a vu passer un navire fantôme.','Des naufrageurs éteignent parfois la lanterne.']},
  mill:{label:'Moulin', hooks:['Le meunier paie bien pour qu’on chasse ce qui rôde près de la roue.','La farine de ce moulin serait bénie.']},
  circle:{label:'Cercle de pierres', hooks:['Ses pierres s’alignent sur le lever de {star}.','Les villageois y laissent des offrandes à chaque nouvelle lune.']},
  cave:{label:'Grotte', hooks:['Un ours énorme y a élu domicile.','On y trouve des fresques d’étoiles.']},
  bandits:{label:'Repaire de brigands', hooks:['Leur chef aurait été un noble déchu.','Ils rançonnent les marchands sur la grand-route.']},
  camp:{label:'Campement nomade', hooks:['Les nomades vendent des chevaux rapides.','Leur ancienne connaît les chemins secrets.']},
  fort:{label:'Fort frontalier', hooks:['Les soldats y attendent des renforts qui n’arrivent pas.','Le fort contrôle le seul col praticable.']}};
function makeCountryMap(k){
  return cached('cmap|'+k, ()=>{
    const w=world, p=w.peoples.list[k], own=w.peoples.map, cv=civOf(k);
    const r=mulberry32(hashStr(P.seed+'|cmap|'+P.wvar+'|'+k)), S=STYLES[p.style];
    const lonC=p.capital?p.capital.lon:0;
    let a=1e9,b=-1e9,la0=1e9,la1=-1e9,n=0;
    for(let c=0;c<WN;c++){ if(own[c]!==k) continue; n++; const lo=wrapPi(cellLon(c%WW)-lonC), la=cellLat((c/WW)|0); if(lo<a)a=lo; if(lo>b)b=lo; if(la<la0)la0=la; if(la>la1)la1=la; }
    if(!n){ a=-.15;b=.15;la0=(p.capital?p.capital.lat:0)-.12;la1=la0+.24; }
    const mLo=Math.max(1.5*deg,(b-a)*.08), mLa=Math.max(1.5*deg,(la1-la0)*.08); a-=mLo; b+=mLo; la0=Math.max(-1.45,la0-mLa); la1=Math.min(1.45,la1+mLa);
    const kx=Math.max(.25,Math.cos((la0+la1)/2));
    let sx=(b-a)*kx, sy=la1-la0;
    if(sx/sy>1.9){ const e=(sx/1.9-sy)/2; la0-=e; la1+=e; sy=la1-la0; }
    if(sx/sy<.75){ const e=(sy*.75-sx)/kx/2; a-=e; b+=e; sx=(b-a)*kx; }
    const MW = sx>=sy ? 1400 : Math.round(1400*sx/sy), MH = sx>=sy ? Math.round(1400*sy/sx) : 1400;
    const toLL=(x,y)=>[lonC+a+x/MW*(b-a), la1-y/MH*(la1-la0)];
    const toPx=(lon,lat)=>[(wrapPi(lon-lonC)-a)/(b-a)*MW, (la1-lat)/(la1-la0)*MH];
    const kmPx=(la1-la0)*6371/MH;
    const nz=makeNoise(r);
    const H=w.h;
    const sampleH=(lon,lat)=>{ const fx=(wrapPi(lon)+Math.PI)/TAU*WW-.5, fy=clamp((Math.PI/2-lat)/Math.PI*WH-.5,0,WH-1.001); const i0=Math.floor(fx), j0=Math.floor(fy), tx=fx-i0, ty=fy-j0; const I=i=>((i%WW)+WW)%WW;
      const v00=H[j0*WW+I(i0)], v10=H[j0*WW+I(i0+1)], v01=H[(j0+1)*WW+I(i0)], v11=H[(j0+1)*WW+I(i0+1)]; return (v00*(1-tx)+v10*tx)*(1-ty)+(v01*(1-tx)+v11*tx)*ty; };
    const landBiomeNear=c=>{ const i=c%WW, j=(c/WW)|0; for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){ const jj=clamp(j+dj,0,WH-1), q=jj*WW+(((i+di)%WW)+WW)%WW; if(H[q]>=0) return w.B[q]; } return BI.grass; };
    const sample=(x,y)=>{ const [lon,lat]=toLL(x,y), d=dirOf(lon,lat);
      const hh=sampleH(lon,lat)+.05*nz(d[0]*70,d[1]*70,d[2]*70)+.022*nz(d[0]*170+9,d[1]*170,d[2]*170);
      const c=cellOf(lon,lat);
      const wl=lon+.55*(TAU/WW)*nz(d[0]*38+3,d[1]*38,d[2]*38), wa=lat+.55*(Math.PI/WH)*nz(d[0]*38,d[1]*38+7,d[2]*38);
      const cw=cellOf(wl,wa);
      let bi = hh>=0 ? (H[c]>=0 ? w.B[c] : landBiomeNear(c)) : (w.B[c]===BI.seaice ? BI.seaice : hh>-.1 ? BI.shallow : hh>-.4 ? BI.ocean : BI.deep);
      if(hh>=.6 && H[c]>=0) bi = w.T[c]<-4 ? BI.peak : BI.mountain;
      return {hh, bi, own: hh>=0 ? own[cw] : -2, M:w.M[c], c}; };
    // grille d'analyse
    const G=4, GW=Math.ceil(MW/G), GH=Math.ceil(MH/G), GN=GW*GH;
    const gh=new Float32Array(GN), gB=new Uint8Array(GN), gO=new Int8Array(GN), gM=new Float32Array(GN);
    for(let gy=0;gy<GH;gy++) for(let gx=0;gx<GW;gx++){ const s=sample(gx*G+G/2, gy*G+G/2), q=gy*GW+gx; gh[q]=s.hh; gB[q]=s.bi; gO[q]=s.own; gM[q]=s.M; }
    const gLand=q=>gh[q]>=0, gxy=q=>[(q%GW)*G+G/2, ((q/GW)|0)*G+G/2], gAt=(x,y)=>clamp(Math.floor(y/G),0,GH-1)*GW+clamp(Math.floor(x/G),0,GW-1);
    const NB8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    const nbs=q=>{ const x=q%GW, y=(q/GW)|0, o=[]; for(const [dx,dy] of NB8){ const X=x+dx, Y=y+dy; if(X>=0&&X<GW&&Y>=0&&Y<GH) o.push(Y*GW+X); } return o; };
    const isForest=bi=>[BI.temperate,BI.taiga,BI.jungle].includes(bi);
    // fleuves
    const gRiver=new Int16Array(GN).fill(-1), rivers=[];
    const src=[]; for(let t=0;t<900;t++){ const q=Math.floor(r()*GN); if(gh[q]>.32 && gh[q]<.75 && gM[q]>.3) src.push(q); }
    src.sort((x,y)=>gh[y]-gh[x]);
    for(const s0 of src){ if(rivers.length>=16) break; const [sx0,sy0]=gxy(s0); if(rivers.some(rv=>Math.hypot(rv.pts[0][0]-sx0,rv.pts[0][1]-sy0)<70)) continue;
      const path=[s0], seen=new Set([s0]); let q=s0, joined=-1, sea=false;
      for(let st=0;st<600;st++){ let best=-1, bv=1e9; for(const nq of nbs(q)){ if(seen.has(nq)) continue; const v=gh[nq]; if(v<bv){ bv=v; best=nq; } }
        if(best<0 || bv>gh[q]+.02) break; q=best; seen.add(q); path.push(q);
        if(!gLand(q)){ sea=true; break; } if(gRiver[q]>=0){ joined=gRiver[q]; break; } }
      if(path.length<14 || (!sea && joined<0)) continue;
      const id=rivers.length; path.forEach(qq=>{ if(gRiver[qq]<0) gRiver[qq]=id; });
      rivers.push({id, cells:path, pts:path.map(gxy), len:path.length, joined}); }
    rivers.sort((x,y)=>y.len-x.len);
    rivers.forEach((rv,i)=>{ if(i<3){ rv.name=(i===0?'Fleuve ':'Rivière ')+cap(starName(r,S,true)); } });
    const nearRiver=q=>nbs(q).some(nq=>gRiver[nq]>=0)||gRiver[q]>=0, nearSea=q=>nbs(q).some(nq=>!gLand(nq));
    // cités
    const usedN=new Set(p.cities.map(c=>c.name)); const uname=()=>{ let n2, t=0; do{ n2=cap(starName(r,S,true)); t++; } while(usedN.has(n2) && t<25); usedN.add(n2); return n2; };
    const nudge=(x,y)=>{ let q=gAt(x,y); if(gLand(q)) return [x,y]; let best=q, bd=1e9; for(let dy=-8;dy<=8;dy++) for(let dx=-8;dx<=8;dx++){ const X=(q%GW)+dx, Y=((q/GW)|0)+dy; if(X<0||Y<0||X>=GW||Y>=GH) continue; const nq=Y*GW+X; if(gLand(nq)&&dx*dx+dy*dy<bd){ bd=dx*dx+dy*dy; best=nq; } } return gxy(best); };
    const cities=p.cities.map(ct=>{ const [x,y]=nudge(...toPx(ct.lon,ct.lat)); return {kind:ct.kind==='capital'?'capital':'city', name:ct.name, x, y, desc:ct.desc, ref:ct, own:true}; });
    const foreign=[]; for(const [kk,op] of w.peoples.list.entries()){ if(kk===k) continue; for(const ct of op.cities){ const [x,y]=toPx(ct.lon,ct.lat); if(x>0&&x<MW&&y>0&&y<MH) foreign.push({kind:'foreign', name:ct.name, x, y, desc:`${ct.desc}`, people:op.name, ref:ct}); } }
    // villages
    const villages=[]; const settle=[...cities];
    const nV=12+Math.floor(r()*12);
    for(let t=0;t<3000 && villages.length<nV;t++){ const q=Math.floor(r()*GN); if(!gLand(q)||gO[q]!==k||gh[q]>.52) continue;
      const bk=BKEYS[gB[q]]; if(bk==='ice'||bk==='peak') continue;
      const riv=nearRiver(q), coast=nearSea(q); if(!riv && !coast && r()<.55) continue;
      const [x,y]=gxy(q); if(settle.some(s=>Math.hypot(s.x-x,s.y-y)<(s.kind==='village'?38:55))) continue;
      const vt = coast ? 'Village de pêcheurs' : gh[q]>.4 ? 'Village de montagne' : isForest(gB[q]) ? 'Village forestier' : riv ? 'Bourg sur la rivière' : bk==='desert'||bk==='colddesert' ? 'Hameau des sables' : 'Village agricole';
      const nm=uname();
      const v={kind:'village', name:nm, x, y, q, type:vt, desc:`${vt} ${p.name.replace(/^les /,'des ')}. ${pick(r,['On y trouve une forge et un marché hebdomadaire.','Ses habitants se méfient des étrangers.','Le chef du village cherche de l’aide.','Une fête y a lieu à chaque pleine lune.','On y brasse une bière réputée.','Un vieux conteur y connaît toutes les légendes du ciel.'])}`};
      villages.push(v); settle.push(v); }
    // routes (A*)
    const road=new Uint8Array(GN);
    const stepCost=q=>{ if(!gLand(q)) return Infinity; let c=1; const hh=gh[q]; if(hh>.6) c+=10; else if(hh>.45) c+=2.5; if(isForest(gB[q])) c+=.7; if(gB[q]===BI.swamp) c+=2; if(gRiver[q]>=0) c+=4; if(gO[q]!==k) c+=2.5; if(road[q]) c*=.3; return c; };
    const astar=(s0,t0)=>{ const cost=new Float64Array(GN).fill(Infinity), prev=new Int32Array(GN).fill(-1), hc=[], hk=[];
      const push=(c,v)=>{ hc.push(c); hk.push(v); let i=hc.length-1; while(i>0){ const pa=(i-1)>>1; if(hk[pa]<=hk[i]) break; [hc[pa],hc[i]]=[hc[i],hc[pa]]; [hk[pa],hk[i]]=[hk[i],hk[pa]]; i=pa; } };
      const pop=()=>{ const c=hc[0], lc=hc.pop(), lv=hk.pop(); if(hc.length){ hc[0]=lc; hk[0]=lv; let i=0; for(;;){ const l=2*i+1, rr=l+1; let m=i; if(l<hc.length&&hk[l]<hk[m]) m=l; if(rr<hc.length&&hk[rr]<hk[m]) m=rr; if(m===i) break; [hc[m],hc[i]]=[hc[i],hc[m]]; [hk[m],hk[i]]=[hk[i],hk[m]]; i=m; } } return c; };
      const tx=t0%GW, ty=(t0/GW)|0, hs=q=>Math.hypot((q%GW)-tx,((q/GW)|0)-ty)*.3;
      cost[s0]=0; push(s0,hs(s0)); let it=0;
      while(hc.length && it++<60000){ const q=pop(); if(q===t0) break; const qx=q%GW, qy=(q/GW)|0;
        for(const [dx,dy] of NB8){ const X=qx+dx, Y=qy+dy; if(X<0||Y<0||X>=GW||Y>=GH) continue; const nq=Y*GW+X; const sc=stepCost(nq); if(!isFinite(sc)) continue;
          const nv=cost[q]+sc*(dx&&dy?1.414:1); if(nv<cost[nq]){ cost[nq]=nv; prev[nq]=q; push(nq, nv+hs(nq)); } } }
      if(!isFinite(cost[t0])) return null; const path=[]; let q=t0; while(q>=0){ path.push(q); if(q===s0) break; q=prev[q]; } return path.reverse(); };
    const roads=[];
    const addRoad=(A,B,type)=>{ const pa=astar(gAt(A.x,A.y), gAt(B.x,B.y)); if(!pa||pa.length<2) return null; pa.forEach(q=>road[q]=Math.max(road[q], type==='main'?2:1)); const rd={type, cells:pa, pts:pa.map(gxy), from:A.name, to:B.name}; roads.push(rd); return rd; };
    if(cities.length>1){ const inT=[cities[0]], out=cities.slice(1);
      while(out.length){ let bi=0, bo=0, bd=1e9; inT.forEach((c1,i)=>out.forEach((c2,o)=>{ const d=Math.hypot(c1.x-c2.x,c1.y-c2.y); if(d<bd){ bd=d; bi=i; bo=o; } })); addRoad(inT[bi], out[bo], 'main'); inT.push(out[bo]); out.splice(bo,1); } }
    const nearF=foreign.filter(f=>gLand(gAt(f.x,f.y))).sort((x,y)=>Math.hypot(x.x-cities[0].x,x.y-cities[0].y)-Math.hypot(y.x-cities[0].x,y.y-cities[0].y)).slice(0,2);
    for(const f of nearF){ let bc=cities[0], bd=1e9; for(const c of cities){ const d=Math.hypot(c.x-f.x,c.y-f.y); if(d<bd){ bd=d; bc=c; } } const rd=addRoad(bc,f,'main'); if(rd) rd.trade=f.people; }
    for(const v of villages){ let bc=null, bd=1e9; for(const c of [...cities, ...villages.filter(o=>o!==v && o.linked)]){ const d=Math.hypot(c.x-v.x,c.y-v.y); if(d<bd){ bd=d; bc=c; } } if(bc && addRoad(v,bc,'path')) v.linked=true; }
    // lieux mineurs
    const minors=[]; const taken=[...settle];
    const free=(x,y,d=26)=>!taken.some(o=>Math.hypot(o.x-x,o.y-y)<d);
    const bright=sky.stars.filter(s=>s.kind==='star'&&!s.fobj&&s.name).sort((a2,b2)=>a2.mag-b2.mag);
    const star=()=>bright.length?pick(r,bright.slice(0,6)).name:'l’étoile du soir';
    const addM=(type,x,y,name,extra)=>{ const M=MINOR[type]; const o={kind:'minor', type, label:M.label, name, x, y, hook:pick(r,M.hooks).replace('{star}',star()), desc:extra||''}; minors.push(o); taken.push(o); return o; };
    const rn=()=>uname();
    // ponts
    let nb=0; for(const rd of roads){ if(rd.type!=='main') continue; for(const q of rd.cells){ if(gRiver[q]>=0 && nb<6){ const [x,y]=gxy(q); if(free(x,y,40)){ const rv=rivers.find(v=>v.id===gRiver[q]); addM('bridge',x,y,'Pont de '+rn(), rv&&rv.name?`Un pont de pierre qui franchit le ${rv.name.toLowerCase().replace(/^fleuve /,'fleuve ')}.`.replace('le rivière','la rivière'):'Un vieux pont de pierre sur la rivière.'); nb++; } } } }
    // auberges
    for(const rd of roads.filter(x=>x.type==='main').sort((x,y)=>y.cells.length-x.cells.length).slice(0,5)){ const q=rd.cells[Math.floor(rd.cells.length/2)]; const [x,y]=gxy(q); if(free(x,y,45)) addM('inn',x+6,y-6,'Auberge '+pick(r,INNS),`Un relais sur la route de ${rd.from} à ${rd.to}.`); }
    const tryPlace=(type,count,test,name,desc)=>{ let got=0; for(let t=0;t<2500 && got<count;t++){ const q=Math.floor(r()*GN); if(!test(q)) continue; const [x,y]=gxy(q); if(!free(x,y,34)) continue; addM(type,x,y,name(),desc(q)); got++; } };
    const border=q=>gLand(q)&&gO[q]===k&&nbs(q).some(nq=>gLand(nq)&&gO[nq]!==k);
    tryPlace('fort',2+Math.floor(r()*2), q=>border(q)&&(road[q]||r()<.15), ()=>'Fort '+rn(), ()=>'Une forteresse qui garde la frontière.');
    tryPlace('tower',2, q=>gLand(q)&&gO[q]===k&&road[q]&&gh[q]>.3, ()=>'Tour de '+rn(), ()=>'Une tour de garde dominant la route.');
    tryPlace('mine',1+Math.floor(r()*3), q=>gO[q]===k&&gh[q]>.45&&gh[q]<.6, ()=>'Mine de '+rn(), ()=>'Des galeries creusées à flanc de montagne.');
    tryPlace('ruin',2+Math.floor(r()*3), q=>gO[q]===k&&gLand(q)&&gh[q]<.55, ()=>'Ruines de '+rn(), ()=>'Des pans de murs qui dépassent des herbes.');
    tryPlace('shrine',2, q=>gO[q]===k&&gh[q]>.3&&gh[q]<.5, ()=>{ const ci=Math.floor(r()*sky.consts.length); return 'Sanctuaire de '+getCN(p,ci).name; }, ()=>'Un petit sanctuaire dédié à une constellation.');
    tryPlace('lighthouse',Math.min(2,cities.filter(c=>nearSea(gAt(c.x,c.y))).length), q=>gO[q]===k&&gLand(q)&&nearSea(q)&&cities.some(c=>Math.hypot(...[c.x-gxy(q)[0],c.y-gxy(q)[1]])<90), ()=>'Phare de '+rn(), ()=>'Un phare qui guide les navires vers le port.');
    tryPlace('mill',2, q=>gO[q]===k&&gRiver[q]>=0&&villages.some(v=>Math.hypot(v.x-gxy(q)[0],v.y-gxy(q)[1])<70), ()=>'Moulin de '+rn(), ()=>'Un moulin à eau sur la rivière.');
    tryPlace('circle',1+Math.floor(r()*2), q=>gO[q]===k&&[BI.grass,BI.steppe,BI.tundra,BI.savanna].includes(gB[q]), ()=>'Cercle de '+rn(), ()=>'Des menhirs dressés en cercle.');
    tryPlace('cave',1+Math.floor(r()*2), q=>gO[q]===k&&gh[q]>.5&&gh[q]<.65, ()=>'Grotte de '+rn(), ()=>'Une caverne profonde dans la montagne.');
    tryPlace('bandits',1+Math.floor(r()*2), q=>gO[q]===k&&isForest(gB[q])&&nbs(q).some(nq=>road[nq]), ()=>'Repaire de '+rn()+' '+pick(r,['le Rouge','la Balafrée','le Borgne','sans Nom']), ()=>'Un camp caché dans les bois, près de la route.');
    tryPlace('camp',r()<.6?1:0, q=>gO[q]===k&&[BI.steppe,BI.desert,BI.savanna,BI.colddesert].includes(gB[q]), ()=>'Campement '+rn(), ()=>'Des tentes de nomades.');
    // lieux du monde dans le cadre
    const wpois=(w.pois||[]).map(o=>{ const [x,y]=toPx(o.lon,o.lat); return {o,x,y}; }).filter(({x,y})=>x>0&&x<MW&&y>0&&y<MH).map(({o,x,y})=>({kind:o.kind, name:o.name, x, y, desc:o.desc, hook:o.hook, danger:o.danger, label:o.kind==='poi-major'?'Lieu légendaire':'Lieu remarquable', ref:o}));
    // étiquettes de régions et de mers
    const areas=w.places.filter(q=>['region','mountains','ocean','sea','lake'].includes(q.kind)).map(q=>{ const [x,y]=toPx(q.lon,q.lat); return {kind:q.kind, name:q.name, x, y}; }).filter(o=>o.x>20&&o.x<MW-20&&o.y>20&&o.y<MH-20);
    // image de fond
    const img=renderParchment({MW,MH,sample,k,r,gh,gB,GW,GH,G,gAt,isForest,settle,nz});
    const title = `${cap(cv.reg.short)} ${p.name.replace(/^les /,'des ')}`;
    const renderIn={MW,MH,sample,k,gh,gB,GW,GH,G,gAt,isForest,settle,nz};
    return {renderIn, k, p, cv, MW, MH, toLL, toPx, kmPx, img, rivers, roads, cities, villages, foreign, minors, wpois, areas, title};
  });
}
function renderParchment(o, sc=1){
  const {MW,MH,sample,k,gh,gB,GW,G,gAt,isForest,settle}=o; const r=mulberry32(hashStr(P.seed+'|sym|'+P.wvar+'|'+k)); const step=sc>1?1:2, kk=2/step;
  const hw=Math.ceil(MW/step), hh=Math.ceil(MH/step), id=new ImageData(hw,hh), d=id.data;
  const HH=new Float32Array(hw*hh), OW=new Int8Array(hw*hh), BB=new Uint8Array(hw*hh);
  for(let y=0;y<hh;y++) for(let x=0;x<hw;x++){ const s=sample(x*step+step/2,y*step+step/2), q=y*hw+x; HH[q]=s.hh; OW[q]=s.own; BB[q]=s.bi; }
  for(let y=0;y<hh;y++) for(let x=0;x<hw;x++){ const q=y*hw+x, v=HH[q], bk=BKEYS[BB[q]]; let col=(PARCH[bk]||[220,210,180]).slice();
    const L=x>0?HH[q-1]:v, R=x<hw-1?HH[q+1]:v, U=y>0?HH[q-hw]:v, Dn=y<hh-1?HH[q+hw]:v;
    if(v>=0){
      const sh=clamp(1+((L-R)+(U-Dn))*6,.8,1.15); col=col.map(c=>c*sh);
      if(OW[q]!==k) col=col.map((c,i)=>c*.5+[212,204,186][i]*.5);
      const coast = L<0||R<0||U<0||Dn<0; if(coast) col=[108,90,68];
      else { const ob=[x>0?OW[q-1]:OW[q], y>0?OW[q-hw]:OW[q]]; if(ob.some(z=>z!==OW[q] && z>=-1 && OW[q]>=-1 && (z===k||OW[q]===k))) col=[150,62,46]; }
    } else {
      let nearL=false, ring=false; for(const [dx,dy] of [[3*kk,0],[-3*kk,0],[0,3*kk],[0,-3*kk]]){ const X=x+dx, Y=y+dy; if(X>=0&&Y>=0&&X<hw&&Y<hh&&HH[Y*hw+X]>=0) nearL=true; }
      for(const [dx,dy] of [[6*kk,0],[-6*kk,0],[0,6*kk],[0,-6*kk]]){ const X=x+dx, Y=y+dy; if(X>=0&&Y>=0&&X<hw&&Y<hh&&HH[Y*hw+X]>=0) ring=true; }
      if(nearL) col=col.map(c=>c*1.06); else if(ring) col=col.map(c=>c*.96);
    }
    const g=((Math.imul(q+7,2654435761)>>>0)%13)-6; d[q*4]=clamp(col[0]+g,0,255); d[q*4+1]=clamp(col[1]+g,0,255); d[q*4+2]=clamp(col[2]+g*.8,0,255); d[q*4+3]=255; }
  const half=document.createElement('canvas'); half.width=hw; half.height=hh; half.getContext('2d').putImageData(id,0,0);
  const can=document.createElement('canvas'); can.width=Math.round(MW*sc); can.height=Math.round(MH*sc); const g=can.getContext('2d');
  g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; g.drawImage(half,0,0,can.width,can.height); g.scale(sc,sc);
  const nearSettle=(x,y)=>settle.some(s=>Math.hypot(s.x-x,s.y-y)<16);
  const hAt=(x,y)=>HH[clamp(Math.floor(y/step),0,hh-1)*hw+clamp(Math.floor(x/step),0,hw-1)], bAt=(x,y)=>BB[clamp(Math.floor(y/step),0,hh-1)*hw+clamp(Math.floor(x/step),0,hw-1)], oAt=(x,y)=>OW[clamp(Math.floor(y/step),0,hh-1)*hw+clamp(Math.floor(x/step),0,hw-1)];
  // forêts, dunes, marais
  for(let y=6;y<MH;y+=10) for(let x=6;x<MW;x+=11){ const jx=x+(r()-.5)*6, jy=y+(r()-.5)*6; const v=hAt(jx,jy); if(v<0||v>.55||nearSettle(jx,jy)) continue; const bi=bAt(jx,jy), fade=oAt(jx,jy)===k?1:.45;
    g.globalAlpha=fade;
    if(bi===BI.temperate){ g.strokeStyle='#56663c'; g.lineWidth=1; g.beginPath(); g.moveTo(jx,jy+4); g.lineTo(jx,jy+1); g.stroke(); g.fillStyle='#9db172'; g.beginPath(); g.arc(jx,jy-1,3.2,0,TAU); g.fill(); g.stroke(); }
    else if(bi===BI.taiga){ g.fillStyle='#7f9a6c'; g.strokeStyle='#4a5a3a'; g.beginPath(); g.moveTo(jx,jy-5); g.lineTo(jx+3,jy+3); g.lineTo(jx-3,jy+3); g.closePath(); g.fill(); g.stroke(); }
    else if(bi===BI.jungle){ g.fillStyle='#7ea45e'; g.strokeStyle='#44602f'; g.beginPath(); g.arc(jx-1.5,jy,3,0,TAU); g.arc(jx+2,jy-1.5,3,0,TAU); g.fill(); g.stroke(); }
    else if(bi===BI.swamp && r()<.6){ g.strokeStyle='#5d6f4b'; g.lineWidth=1; g.beginPath(); for(const o2 of [-2,0,2]){ g.moveTo(jx+o2,jy+2); g.lineTo(jx+o2*1.4,jy-2); } g.stroke(); }
    else if((bi===BI.desert||bi===BI.colddesert) && r()<.35){ g.strokeStyle='#b59a66'; g.lineWidth=1; g.beginPath(); g.arc(jx,jy+3,5,Math.PI*1.15,Math.PI*1.85); g.stroke(); }
    else if((bi===BI.grass||bi===BI.steppe||bi===BI.savanna) && r()<.12){ g.strokeStyle='#9c9a6a'; g.lineWidth=.8; g.beginPath(); g.moveTo(jx-2,jy); g.lineTo(jx-1,jy-3); g.moveTo(jx,jy); g.lineTo(jx,jy-4); g.moveTo(jx+2,jy); g.lineTo(jx+1,jy-3); g.stroke(); }
    g.globalAlpha=1; }
  // montagnes et collines
  const peaks=[]; for(let y=10;y<MH;y+=15) for(let x=8;x<MW;x+=17){ const jx=x+(r()-.5)*8, jy=y+(r()-.5)*6; const v=hAt(jx,jy); if(v>.42 && !nearSettle(jx,jy)) peaks.push([jx,jy,v]); }
  peaks.sort((p1,p2)=>p1[1]-p2[1]);
  for(const [x,y,v] of peaks){ const fade=oAt(x,y)===k?1:.5; g.globalAlpha=fade;
    if(v<.55){ g.strokeStyle='#7a6a52'; g.lineWidth=1.1; g.beginPath(); g.arc(x,y+3,5,Math.PI*1.1,Math.PI*1.9); g.stroke(); }
    else { const s=6+Math.min(10,(v-.55)*40); const snow=bAt(x,y)===BI.peak;
      g.fillStyle=snow?'#f7f5ef':'#efe5cf'; g.beginPath(); g.moveTo(x-s,y+s*.4); g.lineTo(x,y-s); g.lineTo(x+s,y+s*.4); g.closePath(); g.fill();
      g.fillStyle=snow?'#c9ccd2':'#b9a684'; g.beginPath(); g.moveTo(x,y-s); g.lineTo(x+s,y+s*.4); g.lineTo(x+s*.15,y+s*.4); g.closePath(); g.fill();
      g.strokeStyle='#5b4b37'; g.lineWidth=1.1; g.beginPath(); g.moveTo(x-s,y+s*.4); g.lineTo(x,y-s); g.lineTo(x+s,y+s*.4); g.stroke(); }
    g.globalAlpha=1; }
  return can;
}

/* ---------- vue de la carte de pays ---------- */
let MICRO=null, M_OPEN=false, mDirty=true, mSel=null, mHits=[];
const mView={x:0,y:0,z:1};
const mcv=$('mcv'), mctx=mcv.getContext('2d');
let MSW=0, MSH=0;
function openCountryMap(k){
  toast('Préparation de la carte…');
  setTimeout(()=>{ MICRO=makeCountryMap(k); mSel=null; mView.x=MICRO.MW/2; mView.y=MICRO.MH/2; mView.z=1;
    M_OPEN=true; $('micro').hidden=false; closeSheets(); $('card').hidden=true; mPanel(); mDirty=true; },30);
}
function closeMicro(){ M_OPEN=false; $('micro').hidden=true; dirty=true; }
$('mBack').onclick=closeMicro;
$('mZin').onclick=()=>{ mView.z=clamp(mView.z*1.3,.6,6); mDirty=true; };
$('mZout').onclick=()=>{ mView.z=clamp(mView.z/1.3,.6,6); mDirty=true; };
const mFit=()=>Math.min(MSW/MICRO.MW, MSH/MICRO.MH)*.96;
attachDrag(mcv,(dx,dy)=>{ const s=mFit()*mView.z; mView.x=clamp(mView.x-dx/s,0,MICRO.MW); mView.y=clamp(mView.y-dy/s,0,MICRO.MH); mDirty=true; }, f=>{ mView.z=clamp(mView.z/f,.6,6); mDirty=true; }, (x,y)=>{
  let best=null, bd=16; for(const h of mHits){ const d=Math.hypot(h.x-x,h.y-y); if(d<bd){ bd=d; best=h.o; } } mSel=best; mPanel(); mDirty=true; }, null);
new ResizeObserver(()=>{ mDirty=true; }).observe($('mStage'));
function drawMicroTo(c, SW, SH, M, vx, vy, z, fitS, hits, forExport){
  const s=fitS*z, T=(x,y)=>[SW/2+(x-vx)*s, SH/2+(y-vy)*s];
  c.fillStyle='#e9dfc6'; c.fillRect(0,0,SW,SH);
  const [x0,y0]=T(0,0); c.imageSmoothingEnabled=true; c.drawImage(M.img,x0,y0,M.MW*s,M.MH*s);
  c.strokeStyle='#6b563c'; c.lineWidth=2; c.strokeRect(x0,y0,M.MW*s,M.MH*s);
  // fleuves
  c.lineCap='round'; c.lineJoin='round';
  for(const rv of M.rivers){ const n=rv.pts.length; for(let i=1;i<n;i++){ const [a1,b1]=T(...rv.pts[i-1]), [a2,b2]=T(...rv.pts[i]); c.strokeStyle='#4f7fa8'; c.lineWidth=Math.max(.8,(.8+2.6*i/n)*Math.sqrt(z)); c.beginPath(); c.moveTo(a1,b1); c.lineTo(a2,b2); c.stroke(); } }
  // routes
  for(const rd of M.roads){ c.strokeStyle= rd.type==='main' ? '#7a4b2a' : '#8d6a48'; c.lineWidth = rd.type==='main' ? 2.2*Math.sqrt(z) : 1.2*Math.sqrt(z); c.setLineDash(rd.type==='main' ? [6*z,3*z] : [2*z,3*z]);
    c.beginPath(); rd.pts.forEach((pt,i)=>{ const [x,y]=T(...pt); i?c.lineTo(x,y):c.moveTo(x,y); }); c.stroke(); }
  c.setLineDash([]);
  const boxes=[]; const free=(x,y,w,h)=>{ for(const b of boxes) if(x<b[0]+b[2]&&x+w>b[0]&&y<b[1]+b[3]&&y+h>b[1]) return false; boxes.push([x,y,w,h]); return true; };
  const label=(txt,x,y,font,col,always)=>{ c.font=font; const w=c.measureText(txt).width; if(!always && !free(x-w/2,y-9,w,18)) return; c.textAlign='center'; c.textBaseline='middle'; c.lineWidth=3; c.strokeStyle='rgba(240,232,212,.85)'; c.strokeText(txt,x,y); c.fillStyle=col; c.fillText(txt,x,y); };
  // régions et mers
  for(const a of M.areas){ const [x,y]=T(a.x,a.y); const water=a.kind==='ocean'||a.kind==='sea'||a.kind==='lake'; label(a.name,x,y,`italic 500 ${water?16:14}px ${SERIF}`, water?'#3d6283':'#6b5a3e'); }
  // noms de fleuves
  for(const rv of M.rivers){ if(!rv.name) continue; const i=Math.floor(rv.pts.length*.45), [xa,ya]=T(...rv.pts[i]), [xb,yb]=T(...rv.pts[Math.min(rv.pts.length-1,i+4)]); c.save(); c.translate(xa,ya); let ang=Math.atan2(yb-ya,xb-xa); if(ang>Math.PI/2) ang-=Math.PI; if(ang<-Math.PI/2) ang+=Math.PI; c.rotate(ang); c.font=`italic 500 13px ${SERIF}`; c.textAlign='center'; c.textBaseline='bottom'; c.lineWidth=3; c.strokeStyle='rgba(240,232,212,.8)'; c.strokeText(rv.name,0,-3); c.fillStyle='#35607f'; c.fillText(rv.name,0,-3); c.restore(); }
  // lieux mineurs
  const icon=(o,x,y)=>{ c.save(); c.translate(x,y); c.strokeStyle='#3e2f20'; c.lineWidth=1.2; const S2=5.5;
    switch(o.type){
      case 'inn': c.fillStyle='#c98d4f'; c.beginPath(); c.rect(-S2,-2,S2*2,S2+2); c.fill(); c.stroke(); c.fillStyle='#8a4a2a'; c.beginPath(); c.moveTo(-S2-1,-2); c.lineTo(0,-S2-2); c.lineTo(S2+1,-2); c.closePath(); c.fill(); c.stroke(); break;
      case 'bridge': c.strokeStyle='#5a4128'; c.lineWidth=2.2; c.beginPath(); c.arc(0,4,6,Math.PI*1.1,Math.PI*1.9); c.stroke(); break;
      case 'tower': case 'fort': c.fillStyle= o.type==='fort'?'#9a8f84':'#b8ada0'; const fw=o.type==='fort'?7:4; c.beginPath(); c.rect(-fw,-6,fw*2,11); c.fill(); c.stroke(); c.beginPath(); for(let i=-fw;i<fw;i+=3){ c.rect(i,-8,1.8,2); } c.fill(); c.stroke(); break;
      case 'mine': c.strokeStyle='#3e2f20'; c.lineWidth=1.8; c.beginPath(); c.moveTo(-5,5); c.lineTo(5,-5); c.moveTo(-5,-5); c.lineTo(5,5); c.stroke(); break;
      case 'ruin': c.fillStyle='#b9ad9b'; c.beginPath(); c.rect(-6,-2,3,7); c.rect(-1,-5,3,10); c.rect(4,0,3,5); c.fill(); c.stroke(); break;
      case 'shrine': case 'circle': c.fillStyle='#e7d6a0'; c.beginPath(); c.arc(0,0,5,0,TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(0,0,1.6,0,TAU); c.fillStyle='#3e2f20'; c.fill(); break;
      case 'lighthouse': c.fillStyle='#f0e6cf'; c.beginPath(); c.moveTo(-3,6); c.lineTo(-2,-5); c.lineTo(2,-5); c.lineTo(3,6); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#f2b84b'; c.beginPath(); c.arc(0,-7,2.5,0,TAU); c.fill(); break;
      case 'mill': c.strokeStyle='#3e2f20'; c.beginPath(); c.moveTo(-5,-5); c.lineTo(5,5); c.moveTo(5,-5); c.lineTo(-5,5); c.stroke(); c.fillStyle='#d8c9a8'; c.beginPath(); c.arc(0,0,2.5,0,TAU); c.fill(); c.stroke(); break;
      case 'cave': c.fillStyle='#3e2f20'; c.beginPath(); c.arc(0,3,5,Math.PI,0); c.closePath(); c.fill(); break;
      case 'bandits': c.fillStyle='#8c2f25'; c.beginPath(); c.moveTo(0,-6); c.lineTo(5,5); c.lineTo(-5,5); c.closePath(); c.fill(); c.stroke(); break;
      case 'camp': c.fillStyle='#d9b36c'; c.beginPath(); c.moveTo(0,-6); c.lineTo(6,5); c.lineTo(-6,5); c.closePath(); c.fill(); c.stroke(); break;
      default: c.fillStyle='#d9c78f'; c.beginPath(); c.arc(0,0,4,0,TAU); c.fill(); c.stroke(); }
    c.restore(); };
  for(const o of M.minors){ const [x,y]=T(o.x,o.y); if(x<-20||y<-20||x>SW+20||y>SH+20) continue; icon(o,x,y); hits&&hits.push({x,y,o}); if(z>=1.5||mSel===o||forExport) label(o.name,x,y+13,`500 11.5px Figtree, system-ui, sans-serif`,'#3e2f20'); }
  for(const o of M.wpois){ const [x,y]=T(o.x,o.y); const maj=o.kind==='poi-major'; c.save(); c.translate(x,y); c.rotate(Math.PI/4); c.fillStyle=maj?'#d6a53a':'#c7a86b'; c.strokeStyle='#4a3413'; c.lineWidth=1.4; const q=maj?7:5; c.fillRect(-q,-q,q*2,q*2); c.strokeRect(-q,-q,q*2,q*2); c.restore(); if(maj){ c.fillStyle='#4a3413'; c.beginPath(); c.arc(x,y,2,0,TAU); c.fill(); }
    hits&&hits.push({x,y,o}); label(o.name,x,y+(maj?16:13),`${maj?'italic 600 14px':'italic 500 12.5px'} ${SERIF}`,'#5a3c14', maj); }
  // villages et cités
  for(const v of M.villages){ const [x,y]=T(v.x,v.y); c.fillStyle='#fff8e6'; c.strokeStyle='#3e2f20'; c.lineWidth=1.2; c.beginPath(); c.arc(x,y,3,0,TAU); c.fill(); c.stroke(); hits&&hits.push({x,y,o:v}); if(z>=1.2||mSel===v||forExport) label(v.name,x,y-11,`500 12px Figtree, system-ui, sans-serif`,'#3e2f20'); }
  for(const f of M.foreign){ const [x,y]=T(f.x,f.y); c.fillStyle='#bdb3a2'; c.strokeStyle='#5d5446'; c.lineWidth=1.2; c.beginPath(); c.rect(x-4,y-4,8,8); c.fill(); c.stroke(); hits&&hits.push({x,y,o:f}); label(f.name,x,y-13,`italic 500 12.5px ${SERIF}`,'#6b6356'); }
  for(const ct of M.cities){ const [x,y]=T(ct.x,ct.y); const capi=ct.kind==='capital';
    if(capi){ c.fillStyle='#b8322a'; c.strokeStyle='#3e2f20'; c.lineWidth=1.4; c.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?4:9; c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } c.closePath(); c.fill(); c.stroke(); }
    else { c.fillStyle='#e8d9b0'; c.strokeStyle='#3e2f20'; c.lineWidth=1.4; c.beginPath(); c.rect(x-5,y-5,10,10); c.fill(); c.stroke(); c.fillStyle='#3e2f20'; c.fillRect(x-1.5,y-1.5,3,3); }
    hits&&hits.push({x,y,o:ct}); label(ct.name,x,y-(capi?17:14),`${capi?'600 17px':'600 15px'} ${SERIF}`,'#2e2114', true); }
  // cartouche, rose des vents, échelle
  c.save(); c.textAlign='left'; c.textBaseline='alphabetic';
  const tw=Math.max(260, (c.font=`italic 600 26px ${SERIF}`, c.measureText(M.title).width+40));
  const cy0=forExport?14:SH-150; c.fillStyle='rgba(244,236,214,.92)'; c.strokeStyle='#6b563c'; c.lineWidth=1.5; c.fillRect(14,cy0,tw,62); c.strokeRect(14,cy0,tw,62); c.strokeRect(18,cy0+4,tw-8,54);
  c.fillStyle='#3a2a18'; c.fillText(M.title,32,cy0+32); c.font=`500 12.5px Figtree, system-ui, sans-serif`; c.fillStyle='#6b563c'; c.fillText(`Capitale ${M.p.capital?M.p.capital.name:''}, ${M.cv.pop}`,33,cy0+50);
  const rx=SW-54, ry=forExport?60:112; c.translate(rx,ry); c.fillStyle='rgba(244,236,214,.85)'; c.beginPath(); c.arc(0,0,30,0,TAU); c.fill(); c.strokeStyle='#6b563c'; c.lineWidth=1; c.stroke();
  for(let i=0;i<4;i++){ c.save(); c.rotate(i*Math.PI/2); c.fillStyle=i===0?'#8a2f24':'#6b563c'; c.beginPath(); c.moveTo(0,-26); c.lineTo(5,0); c.lineTo(-5,0); c.closePath(); c.fill(); c.restore(); }
  c.fillStyle='#3a2a18'; c.font=`600 12px ${SERIF}`; c.textAlign='center'; c.fillText('N',0,-31); c.restore();
  const kmPerScreenPx=M.kmPx/s; let len=100; for(const L of [25,50,100,200,500,1000,2000]){ if(L/kmPerScreenPx>70){ len=L; break; } }
  const px=len/kmPerScreenPx, bx=20, by=SH-(forExport?24:70);
  c.fillStyle='rgba(244,236,214,.9)'; c.fillRect(bx-6,by-18,px+60,28); c.strokeStyle='#3e2f20'; c.lineWidth=2; c.beginPath(); c.moveTo(bx,by); c.lineTo(bx+px,by); c.moveTo(bx,by-5); c.lineTo(bx,by+3); c.moveTo(bx+px,by-5); c.lineTo(bx+px,by+3); c.stroke();
  c.fillStyle='#3e2f20'; c.font='500 11.5px Figtree, system-ui, sans-serif'; c.textAlign='left'; c.fillText(len+' km',bx+px+8,by+4);
}
function drawMicro(){
  const rect=$('mStage').getBoundingClientRect(), dpr=Math.min(2,devicePixelRatio||1);
  if(Math.round(rect.width*dpr)!==mcv.width || Math.round(rect.height*dpr)!==mcv.height){ mcv.width=Math.round(rect.width*dpr); mcv.height=Math.round(rect.height*dpr); }
  MSW=rect.width; MSH=rect.height; mctx.setTransform(dpr,0,0,dpr,0,0); if(!MICRO) return;
  mHits=[]; drawMicroTo(mctx, MSW, MSH, MICRO, mView.x, mView.y, mView.z, mFit(), mHits, false);
  if(mSel){ const s=mFit()*mView.z, x=MSW/2+(mSel.x-mView.x)*s, y=MSH/2+(mSel.y-mView.y)*s; mctx.strokeStyle='#b8322a'; mctx.lineWidth=2; mctx.beginPath(); mctx.arc(x,y,13,0,TAU); mctx.stroke(); }
}
function mPanel(){
  const M=MICRO; if(!M) return; $('mTitle').textContent=M.title; $('mSubT').textContent=`${M.cv.reg.short}, ${M.cv.pop}`;
  const info=$('mInfo'); info.innerHTML='';
  if(mSel){ const o=mSel;
    info.append(el('h3',null,o.name), el('p','sub', o.kind==='capital'?'Capitale':o.kind==='city'?'Cité':o.kind==='village'?o.type:o.kind==='foreign'?'Cité étrangère, '+o.people:o.label||'Lieu'));
    if(o.desc) info.append(el('p','desc',o.desc));
    if(o.hook){ const h=el('p','desc'); const b=el('b',null,'Rumeur. '); b.style.fontWeight='600'; h.append(b, document.createTextNode(o.hook)); info.append(h); }
    const rows=[]; if(o.danger) rows.push(['Danger', o.danger]); const [lon,lat]=M.toLL(o.x,o.y); rows.push(['Coordonnées', latLabel(lat/deg)+', '+lonLabel(lon/deg)]);
    const nearest=M.cities.filter(c=>c!==o).sort((a2,b2)=>Math.hypot(a2.x-o.x,a2.y-o.y)-Math.hypot(b2.x-o.x,b2.y-o.y))[0]; if(nearest) rows.push(['Cité la plus proche', `${nearest.name}, à ${fr(Math.round(Math.hypot(nearest.x-o.x,nearest.y-o.y)*M.kmPx/5)*5,0)} km`]);
    const dl=el('dl','facts'); fillFacts(dl,rows); info.append(dl);
    const acts=el('div','acts'); const b1=el('button','act primary','Observer le ciel d’ici'); b1.onclick=()=>{ setObs(lat/deg, lon/deg); D.gplace=o.name; closeMicro(); setMode('pov'); applyTime(); updateLocation(); syncTime(); toast('Tu observes depuis '+o.name); };
    const b2=el('button','act','Désélectionner'); b2.onclick=()=>{ mSel=null; mPanel(); mDirty=true; };
    if(['capital','city','village','foreign'].includes(o.kind)){ const b3=el('button','act primary','Plan de la ville'); b3.onclick=()=>{ const ref=o.ref||{name:o.name, lon:lon, lat:lat, kind:'village', desc:o.desc}; openCityPlan(ref, o.kind==='foreign'?ref.people:M.k); }; acts.append(b3); }
    acts.append(b1,b2); info.append(acts);
  } else {
    info.append(el('h3',null,M.title), el('p','sub',`Capitale ${M.p.capital?M.p.capital.name:''}`),
      el('p','desc',`${cap(M.cv.reg.n)} ${M.cv.reg.f?'gouvernée':'gouverné'} par ${M.cv.ruler}, ${M.cv.pop}. On y compte ${M.cities.length} ${M.cities.length>1?'cités':'cité'}, ${M.villages.length} villages et ${(n=>n+' '+(n>1?'grandes routes':'grande route'))(M.roads.filter(r2=>r2.type==='main').length)}. Touche un lieu sur la carte pour le découvrir.`));
    const lg=el('p','hint','Étoile rouge : capitale. Carré : cité. Rond : village. Losange doré : lieu légendaire ou remarquable. Tirets bruns : grandes routes ; pointillés : chemins.'); info.append(lg);
  }
  const lists=$('mLists'); lists.innerHTML='';
  const sec=(title, items, sub)=>{ if(!items.length) return; lists.append(el('h4',null,title)); const ul=el('ul','v-list'); for(const o of items){ const li=el('li'), b=el('button'); const d=el('span','dot'); d.style.background=o.kind==='capital'?'#b8322a':o.kind==='city'?'#e8d9b0':o.kind==='village'?'#fff8e6':o.kind&&o.kind.startsWith('poi')?'#d6a53a':'#c98d4f';
    b.append(d, el('span','nm',o.name), el('span','ty',sub(o))); b.setAttribute('aria-current',String(mSel===o)); b.onclick=()=>{ mSel=o; mView.x=o.x; mView.y=o.y; mView.z=Math.max(mView.z,1.8); mPanel(); mDirty=true; }; li.append(b); ul.append(li); } lists.append(ul); };
  sec('Cités', M.cities, o=>o.kind==='capital'?'Capitale':'Cité');
  sec('Lieux légendaires et remarquables', M.wpois, o=>o.label);
  sec('Villages', M.villages, o=>o.type);
  sec('Lieux', M.minors, o=>o.label);
  if(M.rivers.some(rv=>rv.name)){ lists.append(el('h4',null,'Fleuves et rivières')); for(const rv of M.rivers.filter(v=>v.name)) lists.append(Object.assign(el('p','desc',`${rv.name}, long d’environ ${fr(Math.round(rv.len*4*M.kmPx/10)*10,0)} km.`),{style:'margin-bottom:4px;font-size:15px'})); }
}
function renderCountryImage(M, scale=1.5, ratio=1){
  const W2=Math.round(M.MW*scale*.72), H2=Math.round(M.MH*scale*.72); const can=document.createElement('canvas'); can.width=Math.round(W2*ratio); can.height=Math.round(H2*ratio); const c=can.getContext('2d'); c.setTransform(ratio,0,0,ratio,0,0);
  const keep=M.img; if(ratio>1){ if(!M.imgHi) M.imgHi=renderParchment(M.renderIn,2); M.img=M.imgHi; }
  try{ drawMicroTo(c, W2, H2, M, M.MW/2, M.MH/2, 1, Math.min(W2/M.MW,H2/M.MH)*.98, null, true); } finally { M.img=keep; } return can;
}
$('mExport').onclick=async()=>{ if(!MICRO) return; toast('Préparation de l’image…'); const can=renderCountryImage(MICRO,2); const blob=await new Promise(r=>can.toBlob(r,'image/png'));
  let dl=null; try{ if(window.claude && typeof window.claude.use==='function') dl=await window.claude.use('downloads'); }catch(e){}
  if(dl){ try{ await dl.save({filename:MICRO.title.replace(/[\\/:*?"<>|]/g,'')+'.png', data:blob}); toast('Carte enregistrée'); }catch(e){ if(!e||e.code!=='declined') toast('La carte n’a pas pu être enregistrée'); } }
  else localSave(blob, MICRO.title.replace(/[\\/:*?"<>|]/g,'')+'.png'); };
