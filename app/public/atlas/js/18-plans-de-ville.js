/* Atlas des ciels imaginaires — Plans de ville
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ================= plans de ville ================= */
const clipPoly=(poly,nx,ny,c)=>{ const out=[]; for(let i=0;i<poly.length;i++){ const A=poly[i], B=poly[(i+1)%poly.length]; const da=nx*A[0]+ny*A[1]-c, db=nx*B[0]+ny*B[1]-c;
  if(da<=0) out.push(A); if((da<0)!==(db<0) && da!==db){ const t=da/(da-db); out.push([A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t]); } } return out; };
const polyArea=p=>{ let a=0; for(let i=0;i<p.length;i++){ const A=p[i], B=p[(i+1)%p.length]; a+=A[0]*B[1]-B[0]*A[1]; } return Math.abs(a)/2; };
const polyCen=p=>{ let x=0,y=0; for(const q of p){ x+=q[0]; y+=q[1]; } return [x/p.length, y/p.length]; };
const insetPoly=(p,d)=>{ const c=polyCen(p); return p.map(q=>{ const dx=q[0]-c[0], dy=q[1]-c[1], L=Math.hypot(dx,dy)||1, k=Math.max(0,(L-d)/L); return [c[0]+dx*k, c[1]+dy*k]; }); };
const norm2=v=>{ const L=Math.hypot(v[0],v[1])||1; return [v[0]/L, v[1]/L]; };
const distSeg=(p,a,b)=>{ const dx=b[0]-a[0], dy=b[1]-a[1], L=dx*dx+dy*dy||1, t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L,0,1); return Math.hypot(p[0]-a[0]-dx*t, p[1]-a[1]-dy*t); };
const distPoly=(p,pts)=>{ let m=1e9; for(let i=0;i<pts.length-1;i++) m=Math.min(m,distSeg(p,pts[i],pts[i+1])); return m; };
function voronoi(seeds, box){ return seeds.map((s,i)=>{ let poly=box; for(let j=0;j<seeds.length && poly.length;j++){ if(j===i) continue; const t=seeds[j], nx=t[0]-s[0], ny=t[1]-s[1]; poly=clipPoly(poly,nx,ny,nx*(s[0]+t[0])/2+ny*(s[1]+t[1])/2); } return poly; }); }
function splitLots(poly, minA, r, depth=0){
  const A=polyArea(poly); if(A<minA || depth>8 || poly.length<3) return [poly];
  let bi=0, bl=0; for(let i=0;i<poly.length;i++){ const a=poly[i], b=poly[(i+1)%poly.length], l=Math.hypot(b[0]-a[0],b[1]-a[1]); if(l>bl){ bl=l; bi=i; } }
  const a=poly[bi], b=poly[(bi+1)%poly.length], t=.4+r()*.2, m=[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t], n=norm2([b[0]-a[0], b[1]-a[1]]), c=n[0]*m[0]+n[1]*m[1];
  const p1=clipPoly(poly,n[0],n[1],c), p2=clipPoly(poly,-n[0],-n[1],-c);
  if(p1.length<3||p2.length<3) return [poly];
  return [...splitLots(p1,minA,r,depth+1), ...splitLots(p2,minA,r,depth+1)];
}
const CITY_HOOKS={
  palace:['Un conseiller cherche discrètement des gens sûrs pour une mission hors des murs.','On murmure que le souverain ne s’est pas montré depuis trois lunes.'],
  temple:['Les prêtres cherchent des volontaires pour escorter une relique.','Un vitrail représentant la constellation s’est fissuré ; c’est un mauvais présage.'],
  observatory:['L’astronome cherche quelqu’un pour récupérer un instrument volé.','Il a calculé le retour d’un astre que personne n’attendait.'],
  barracks:['La garde recrute pour une expédition contre des brigands.','Un officier vend des informations à qui paie bien.'],
  port:['Un capitaine cherche un équipage pour un voyage vers une île oubliée.','Une cargaison a disparu pendant la nuit.'],
  guild:['La guilde paie bien pour retrouver un apprenti disparu.','Deux guildes rivales se disputent un contrat royal.'],
  tavern:['Le patron achète des cartes anciennes au prix fort.','Un vieux marin y raconte des histoires de comètes.','On y recrute des escortes pour les caravanes.','Une partie de dés truquée tourne mal chaque soir.'],
  library:['Un grimoire céleste a été emprunté et jamais rendu.','Le bibliothécaire cherche un livre sur une constellation disparue.'],
  baths:['On y entend tous les secrets de la ville.'], prison:['Un prisonnier affirme connaître l’emplacement d’un trésor.'], arena:['Des combats clandestins s’y tiennent les nuits sans lune.'],
  cemetery:['Des tombes ont été retrouvées ouvertes de l’intérieur.'], garden:['Une fleur n’y éclot que les nuits de pleine lune.'], market:['Un marchand étranger vend des cartes du ciel inconnues.','Des objets volés circulent sous les étals.'],
  mill:['La roue tourne parfois toute seule la nuit.'], well:['On dit que son eau montre l’avenir les nuits d’éclipse.'], gate:['Les gardes fouillent tous les chariots depuis une semaine.','Un péage illégal y est prélevé par un sergent corrompu.']};
function cityContext(ct,k){
  const c=cellOf(ct.lon,ct.lat), i=c%WW, j=(c/WW)|0; let sx=0, sy=0, nW=0;
  for(let dj=-3;dj<=3;dj++) for(let di=-3;di<=3;di++){ const jj=clamp(j+dj,0,WH-1), q=jj*WW+(((i+di)%WW)+WW)%WW; if(world.h[q]<0){ const d=Math.hypot(di,dj)||1; sx+=di/d/d; sy+=dj/d/d; nW++; } }
  const coastal = nW>0 && world.dist[c]<=2;
  let rd=null; if(k>=0){ const M=makeCountryMap(k); const [x,y]=M.toPx(ct.lon,ct.lat); let best=1e9, bv=null; for(const rv of M.rivers) for(let q=0;q<rv.pts.length-1;q++){ const pt=rv.pts[q], d=Math.hypot(pt[0]-x,pt[1]-y); if(d<best){ best=d; bv=[rv.pts[q+1][0]-pt[0], rv.pts[q+1][1]-pt[1]]; } } if(best<34 && bv) rd=norm2(bv); }
  return {coastal, sd: coastal ? norm2([sx,sy]) : null, rd, hill: world.h[c]>.42, biome:BKEYS[world.B[c]]};
}
const ARCH={
  radial:{label:'Ville en étoile', txt:'Ses grandes rues rayonnent depuis la place centrale vers les portes, comme les branches d’une étoile.'},
  organic:{label:'Ville médiévale', txt:'Un lacis de ruelles tortueuses, qui ont poussé au fil des siècles sans aucun plan.'},
  grid:{label:'Ville quadrillée', txt:'Ses rues se croisent à angle droit, selon un plan tracé d’un seul geste par les arpenteurs de la cité.'},
  hill:{label:'Ville en terrasses', txt:'Bâtie sur une colline, elle s’étage en terrasses concentriques jusqu’à la citadelle du sommet.'},
  linear:{label:'Ville-rue', txt:'Étirée le long de l’eau, elle suit une seule grande artère bordée de maisons.'},
  canal:{label:'Cité des canaux', txt:'Des canaux remplacent la plupart des rues ; on s’y déplace en barque d’un quartier à l’autre.'},
  oasis:{label:'Ville d’oasis', txt:'Des maisons blanches aux toits plats, serrées autour de cours intérieures, au milieu des palmeraies.'},
  nordic:{label:'Bourg nordique', txt:'De longues maisons de bois, protégées par une palissade de rondins.'},
  elf:{label:'Cité sylvestre', txt:'Des demeures rondes nichées parmi les arbres, reliées par des sentiers sinueux, autour d’un arbre immense.'},
  hamlet:{label:'Village', txt:'Quelques maisons autour d’une place, entourées de champs et de vergers.'},
  camp:{label:'Campement', txt:'Des tentes rondes disposées en cercle autour du feu central.'}};
const ROOFS={terracotta:['#b8674a','#c47a52','#a85a40'], slate:['#6f7d8c','#5f6b7a','#7c8896'], thatch:['#c9a45c','#b8934d','#d4b36a'], white:['#ece4d2','#e2d8c3','#f2ecdf'], wood:['#8a6a48','#7a5a3c','#9a7a55'], moss:['#d9c48c','#cdb57a','#e2d09c'], tent:['#efe4c8','#d9c49a','#e8d6ae']};
Object.assign(CITY_HOOKS,{forum:['Un orateur y harangue la foule contre le gouverneur.'], amphitheatre:['Un spectacle y rejouera ce soir une légende des étoiles.'], citadel:['Personne n’est entré dans le donjon depuis la mort du dernier seigneur.'], arsenal:['Un navire de guerre secret y est construit la nuit.'],
  caravanserai:['Une caravane attend une escorte pour traverser le désert.'], souk:['Un marchand vend une carte menant à une oasis oubliée.'], cistern:['On entend des voix dans la citerne quand l’eau est basse.'], longhall:['Le chef organise un grand banquet et cherche des champions.'], runestone:['Une pierre gravée raconte une bataille que personne ne se rappelle.'],
  greattree:['L’arbre aurait parlé la nuit de la dernière éclipse.'], clocktower:['L’horloge s’est arrêtée à la même heure que la mort du roi.'], colossus:['Un trésor serait caché dans la tête de la statue.'], hanging:['Une plante rare n’y fleurit qu’une fois par comète.'], windmill:['Le meunier voit des lumières dans les champs la nuit.'],
  quarry:['Les carriers ont dégagé une porte de pierre sculptée.'], leprosy:['Un malade prétend être un prince disparu.'], livingbridge:['Des boutiques secrètes se cachent sous le tablier du pont.'], boatsheds:['Un drakkar ancien dort sous la paille.'], fire:['Le feu central ne doit jamais s’éteindre, dit la coutume.']});
function chooseArch(kind, X, p, cv, r){
  const cult=p?p.style:'celeste', era=cv?cv.eraI:2, reg=cv?cv.reg.short:'', b=X.biome, dry=['desert','colddesert','savanna','steppe'].includes(b), forest=['temperate','taiga','jungle'].includes(b);
  const W=kind==='village'
    ? {hamlet:2, camp: dry && (reg==='Confédération de clans'||r()<.3) ? 1.8 : 0, elf: cult==='elfique'&&forest ? 2.5 : 0, nordic: cult==='nordique' ? 1.6 : 0, oasis: (b==='desert'||b==='colddesert') ? 1.2 : 0}
    : {radial:1, organic:1.2, grid: (['République marchande','Empire','Ligue de cités'].includes(reg)||era>=3) ? 1.6 : .35, hill: X.hill ? 2.4 : .15, linear: (X.rd||X.coastal) ? 1 : 0, canal: X.coastal ? ((b==='swamp'||reg==='République marchande') ? 2 : .35) : 0,
       oasis: dry ? 2.2 : 0, nordic: cult==='nordique' ? 1.8 : 0, elf: cult==='elfique' && forest ? 2.4 : 0};
  let tot=0; for(const k in W) tot+=W[k]; let x=r()*tot; for(const k in W){ x-=W[k]; if(x<=0) return k; } return kind==='village'?'hamlet':'radial';
}
function makeCityPlan(ct, k){
  return cached('city2|'+ct.name+'|'+k, ()=>{
    const r=mulberry32(hashStr(P.seed+'|city|'+P.wvar+'|'+ct.name)), kind = ct.kind==='capital'?'capital': ct.kind==='village'?'village':'city';
    const p = k>=0 ? world.peoples.list[k] : null, S=STYLES[p?p.style:'celeste'], cv = k>=0 ? civOf(k) : null;
    const X=cityContext(ct,k), ph=r()*TAU, arch=chooseArch(kind,X,p,cv,r), era=cv?cv.eraI:2;
    const nm=()=>cap(starName(r,S,true));
    const R={capital:300, city:235, village:125}[kind]*(arch==='camp'?.8:1);
    // axe et forme
    let ax = X.rd ? Math.atan2(X.rd[1],X.rd[0]) : X.sd ? Math.atan2(X.sd[1],X.sd[0])+Math.PI/2 : r()*Math.PI;
    let A=R, B=R*(.9+r()*.2); if(arch==='linear'){ A=R*1.55; B=R*.55; } if(arch==='grid'||arch==='oasis'){ A=R*(.95+r()*.15); B=R*(.8+r()*.2); }
    const ca=Math.cos(ax), sa=Math.sin(ax), toUV=(x,y)=>{ const dx=x-500, dy=y-500; return [dx*ca+dy*sa, -dx*sa+dy*ca]; }, fromUV=(u,v)=>[500+u*ca-v*sa, 500+u*sa+v*ca];
    const insideShape=(x,y,f=1)=>{ const [u,v]=toUV(x,y); return (arch==='grid'||arch==='oasis') ? Math.abs(u)<=A*f && Math.abs(v)<=B*f : (u*u)/(A*A*f*f)+(v*v)/(B*B*f*f)<=1; };
    // eau
    let isSea=()=>false, seaPoly=null;
    if(X.sd){ const sd=X.sd, pp=[-sd[1],sd[0]], ds=(arch==='canal'?R*.9:R*(.62+r()*.25)), wave=v=>16*Math.sin(v*.018+ph)+7*Math.sin(v*.051+ph*2);
      isSea=(x,y)=>{ const u=(x-500)*sd[0]+(y-500)*sd[1], v=(x-500)*pp[0]+(y-500)*pp[1]; return u>ds+wave(v); };
      seaPoly=[]; for(let v=-900;v<=900;v+=8){ const u=ds+wave(v); seaPoly.push([500+sd[0]*u+pp[0]*v, 500+sd[1]*u+pp[1]*v]); } seaPoly.push([500+sd[0]*1600+pp[0]*900, 500+sd[1]*1600+pp[1]*900],[500+sd[0]*1600-pp[0]*900, 500+sd[1]*1600-pp[1]*900]); }
    let river=null; const rw=kind==='village'?16:26;
    if(X.rd){ const rd=X.rd, rp=[-rd[1],rd[0]], off=arch==='linear'?0:(r()-.5)*R*.45, pts=[];
      for(let t=-900;t<=900;t+=14){ const m=(arch==='linear'?14:26)*Math.sin(t*.011+ph)+10*Math.sin(t*.029+ph*3); const q=[500+rd[0]*t+rp[0]*(off+m), 500+rd[1]*t+rp[1]*(off+m)]; if(isSea(...q)){ pts.push(q); break; } pts.push(q); }
      river=pts; }
    // canaux
    const canals=[]; const sp = kind==='capital'?62:70;
    if(arch==='canal'){ for(let i=-8;i<=8;i+=2){ for(const dir of [0,1]){ const pts=[]; for(let t=-A;t<=A;t+=10){ const q = dir ? fromUV(t, i*sp) : fromUV(i*sp, t); if(insideShape(...q,.98) && !isSea(...q)) pts.push(q); else if(pts.length){ if(pts.length>2) canals.push(pts.slice()); pts.length=0; } } if(pts.length>2) canals.push(pts); } } }
    const inCanal=(x,y)=>canals.some(c=>distPoly([x,y],c)<10);
    const inRiver=(x,y)=>river && distPoly([x,y],river)<rw/2+3;
    const isWater=(x,y)=>isSea(x,y)||inRiver(x,y)||inCanal(x,y);
    // germes selon l'organisation
    const seeds=[], kinds=[];
    const addSeed=(x,y,tag)=>{ if(x<5||y<5||x>995||y>995||isWater(x,y)) return; seeds.push([x,y]); kinds.push(tag); };
    const nIn={capital:62, city:40, village:12}[kind];
    if(arch==='grid'||arch==='canal'){ const cell=Math.sqrt(4*A*B/nIn)*(arch==='canal'?.95:1); for(let u=-A+cell/2;u<A;u+=cell) for(let v=-B+cell/2;v<B;v+=cell){ const [x,y]=fromUV(u+(arch==='canal'?(r()-.5)*4:0),v); addSeed(x,y,'in'); } }
    else if(arch==='hill'){ addSeed(500,500,'in'); for(const t of [.2,.36,.52,.68,.84,.97]){ const n=Math.round(TAU*t*R/(R*.22)); const o=r()*TAU; for(let q=0;q<n;q++){ const a=o+q/n*TAU; addSeed(500+Math.cos(a)*t*R,500+Math.sin(a)*t*R,'in'); } } }
    else if(arch==='camp'){ addSeed(500,500,'in'); }
    else { addSeed(500+(r()-.5)*10,500+(r()-.5)*10,'in'); const n=arch==='organic'?Math.round(nIn*1.5):nIn, minD=Math.sqrt(A*B)*(arch==='organic'?1.15:1.35)/Math.sqrt(n);
      for(let t=0,got=0;t<n*60 && got<n;t++){ const a=r()*TAU, rr=Math.sqrt(r())*.95, [x,y]=fromUV(Math.cos(a)*rr*A, Math.sin(a)*rr*B); if(isWater(x,y)) continue; if(seeds.some(s=>Math.hypot(s[0]-x,s[1]-y)<minD)) continue; addSeed(x,y,'in'); got++; } }
    const nOut={capital:36, city:28, village:18}[kind], ring2=kind==='village'?2.4:1.75;
    for(let t=0,got=0;t<nOut*60 && got<nOut;t++){ const a=r()*TAU, rr=1.08+r()*(ring2-1.08), [x,y]=fromUV(Math.cos(a)*A*rr, Math.sin(a)*B*rr); if(insideShape(x,y,1.02)||isWater(x,y)) continue; if(seeds.some(s=>Math.hypot(s[0]-x,s[1]-y)<R*2.2/Math.sqrt(nOut))) continue; addSeed(x,y,'faub'); got++; }
    for(let t=0,got=0;t<nOut*50 && got<nOut*.8;t++){ const a=r()*TAU, rr=R*ring2+r()*(720-R*ring2), x=500+Math.cos(a)*rr, y=500+Math.sin(a)*rr; if(seeds.some(s=>Math.hypot(s[0]-x,s[1]-y)<90)) continue; addSeed(x,y,'field'); got++; }
    const cells=voronoi(seeds,[[0,0],[1000,0],[1000,1000],[0,1000]]).map((poly,i)=>({i, poly, seed:seeds[i], ring:kinds[i], role:null}));
    const inside=cells.filter(c=>c.ring==='in').sort((a,b)=>Math.hypot(a.seed[0]-500,a.seed[1]-500)-Math.hypot(b.seed[0]-500,b.seed[1]-500));
    // murailles
    let wallKind = kind==='village' ? (arch==='nordic'?'wood':'none') : ({elf:'none', canal:'none', nordic:'wood', camp:'none', hamlet:'none'}[arch] || 'stone');
    const star = wallKind==='stone' && era>=5 && ['radial','grid','organic'].includes(arch);
    const wall=[];
    if(wallKind!=='none'){
      if(arch==='grid'||arch==='oasis'){ const cr=[[-1,-1],[1,-1],[1,1],[-1,1]]; for(let q=0;q<4;q++){ const a1=cr[q], a2=cr[(q+1)%4]; for(let t=0;t<4;t++){ const f=t/4; wall.push(fromUV((a1[0]+(a2[0]-a1[0])*f)*A*1.04,(a1[1]+(a2[1]-a1[1])*f)*B*1.04)); } } }
      else { const n=star?12:16+Math.floor(r()*6), jit=arch==='organic'?.16:.07;
        for(let q=0;q<n;q++){ const a=q/n*TAU; const f=1.03+(r()-.5)*jit; wall.push(fromUV(Math.cos(a)*A*f, Math.sin(a)*B*f)); if(star){ const a2=(q+.5)/n*TAU; wall.push(fromUV(Math.cos(a2)*A*1.22, Math.sin(a2)*B*1.22)); } } } }
    const inner=[]; if(arch==='hill'){ for(let q=0;q<12;q++){ const a=q/12*TAU; inner.push([500+Math.cos(a)*R*.3,500+Math.sin(a)*R*.3]); } }
    // portes
    const others = p ? p.cities.filter(o=>o.name!==ct.name) : [];
    const gates=[]; const nG = arch==='grid'?4 : kind==='capital'?5 : kind==='city'?4 : 3;
    const gateAngles = arch==='grid' ? [0,Math.PI/2,Math.PI,3*Math.PI/2].map(a=>a+ax) : arch==='linear' ? [ax, ax+Math.PI] : null;
    for(let q=0;q<nG*3 && gates.length<nG;q++){
      const a = gateAngles ? gateAngles[q%gateAngles.length] : (gates.length/nG)*TAU+r()*.5+ph;
      const [u,v]=[Math.cos(a-ax),Math.sin(a-ax)]; let f; if(arch==='grid'||arch==='oasis') f=1.04/Math.max(Math.abs(u)/A*A,Math.abs(v)/B*A)*A/A; const rad = (arch==='grid'||arch==='oasis') ? 1.04/Math.max(Math.abs(u)/A,Math.abs(v)/B) : 1.03/Math.sqrt((u*u)/(A*A)+(v*v)/(B*B));
      const gx=500+Math.cos(a)*rad, gy=500+Math.sin(a)*rad;
      if(isWater(gx,gy) || isWater(500+Math.cos(a)*rad*.8,500+Math.sin(a)*rad*.8)) { if(gateAngles) continue; else continue; }
      if(gates.some(g=>Math.abs(wrapPi(g.a-a))<.6)) continue;
      let toward=null, bd=9; for(const o of others){ const bear=Math.atan2(-(o.lat-ct.lat), wrapPi(o.lon-ct.lon)*Math.cos(ct.lat)); const d=Math.abs(wrapPi(bear-a)); if(d<bd){ bd=d; toward=o; } }
      const dirW=['de l’Est','du Sud-Est','du Sud','du Sud-Ouest','de l’Ouest','du Nord-Ouest','du Nord','du Nord-Est'][Math.round(((a%TAU)+TAU)%TAU/(TAU/8))%8];
      if(arch==='camp') break; const gw = wallKind==='none' ? 'Route ' : 'Porte '; gates.push({a, x:gx, y:gy, name: toward && bd<.9 ? gw+'de '+toward.name : gw+dirW}); if(gateAngles && q>=gateAngles.length-1 && gates.length>=gateAngles.length) break; }
    // rues
    const streets=[], lanes=[];
    const curve=(pts)=>{ const out=[]; for(let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1]; for(let t=0;t<1;t+=.1) out.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]); } out.push(pts[pts.length-1]); return out; };
    const extend=(g)=>{ const out=[]; const e=[g.x+Math.cos(g.a)*700, g.y+Math.sin(g.a)*700]; for(let t=.1;t<=1;t+=.1){ const q=[g.x+(e[0]-g.x)*t, g.y+(e[1]-g.y)*t]; if(isSea(...q)) break; out.push(q); } return out; };
    if(arch==='grid'){ for(const g of gates){ streets.push([[500,500],...curve([[500,500],[g.x,g.y]]),...extend(g)]); } }
    else if(arch==='linear'){ const e1=fromUV(-A*1.9,0), e2=fromUV(A*1.9,0); streets.push(curve([e1,[500,500],e2])); for(let u=-A*.8;u<=A*.8;u+=A*.4){ lanes.push(curve([fromUV(u,-B*.95),fromUV(u,B*.95)])); } }
    else if(arch==='hill'){ for(const t of [.44,.76]){ const ring=[]; for(let q=0;q<=48;q++){ const a=q/48*TAU; ring.push([500+Math.cos(a)*t*R,500+Math.sin(a)*t*R]); } streets.push(ring); } for(const g of gates){ const m=[500+Math.cos(g.a+.35)*R*.6, 500+Math.sin(g.a+.35)*R*.6]; streets.push([...curve([[500+Math.cos(g.a)*R*.3,500+Math.sin(g.a)*R*.3], m, [g.x,g.y]]), ...extend(g)]); } }
    else if(arch==='camp'){ }
    else { const curvy = ['organic','oasis','nordic','elf','hamlet'].includes(arch);
      for(const g of gates){ let pts; if(curvy){ const m1=[500+(g.x-500)*.33+(r()-.5)*70, 500+(g.y-500)*.33+(r()-.5)*70], m2=[500+(g.x-500)*.66+(r()-.5)*70, 500+(g.y-500)*.66+(r()-.5)*70]; pts=curve([[500,500],m1,m2,[g.x,g.y]]); }
        else { const mid=[(500+g.x)/2+(r()-.5)*40,(500+g.y)/2+(r()-.5)*40]; pts=[]; for(let t=0;t<=1.0001;t+=.1){ const a=(1-t)*(1-t), b=2*t*(1-t), c=t*t; pts.push([a*500+b*mid[0]+c*g.x, a*500+b*mid[1]+c*g.y]); } }
        (['elf','hamlet','nordic'].includes(arch)?lanes:streets).push([...pts, ...extend(g)]); } }
    if(X.sd && arch!=='canal'){ const sd=X.sd; let u=0; while(u<R*1.6 && !isSea(500+sd[0]*u,500+sd[1]*u)) u+=6; streets.push([[500,500],[500+sd[0]*u*.98, 500+sd[1]*u*.98]]); }
    if(arch==='canal'){ const e1=fromUV(-A*1.5,0), e2=fromUV(A*1.5,0); streets.push(curve([e1,e2])); }
    const sw = {grid:13, radial:12, organic:9, linear:16, hill:9, canal:10, oasis:7, nordic:7, elf:5, hamlet:6, camp:0}[arch];
    const nearStreet=(x,y,w)=>streets.some(s=>distPoly([x,y],s)<w) || lanes.some(s=>distPoly([x,y],s)<w*.6);
    const bridges=[]; for(const wtr of [river,...canals].filter(Boolean)) for(const s of [...streets,...lanes]) for(let q=0;q<s.length-1;q++){ const m=[(s[q][0]+s[q+1][0])/2,(s[q][1]+s[q+1][1])/2]; if(distPoly(m,wtr)<(wtr===river?rw/2+2:9) && !bridges.some(b=>Math.hypot(b[0]-m[0],b[1]-m[1])<30)) bridges.push(m); }
    // lieux
    const L=[]; const used=new Set();
    const take=(role,cell,name,desc)=>{ if(!cell) return null; used.add(cell.i); cell.role=role; const o={role,name,desc,cell,x:0,y:0,hook:pick(r,CITY_HOOKS[role]||CITY_HOOKS.tavern)}; L.push(o); return o; };
    const addSpot=(role,x,y,name,desc)=>{ const o={role,name,desc,x,y,hook:pick(r,CITY_HOOKS[role]||CITY_HOOKS.tavern)}; L.push(o); return o; };
    const free=arr=>arr.filter(c=>!used.has(c.i));
    const cnz = cv && sky.consts.length ? (()=>{ const zc=sky.consts.reduce((a,c,ci)=>sky.stars[c.alpha].mag<sky.stars[sky.consts[a].alpha].mag?ci:a,0); return getCN(p,zc); })() : null;
    const plazaName = {grid:'Forum', oasis:'Grand souk', elf:'Clairière de l’Arbre-cœur', camp:'Feu central', nordic:'Place de l’assemblée'}[arch] || (kind==='village'?'Place du village':'Grand marché');
    const plazaRole = {grid:'forum', oasis:'souk', elf:'greattree', camp:'fire'}[arch] || 'market';
    const plazaDesc = {forum:'Une vaste esplanade dallée entourée de colonnades, cœur politique de la cité.', souk:'Un dédale de ruelles couvertes où s’entassent épices, tissus et cartes du ciel.', greattree:'Un arbre colossal au cœur de la cité ; ses racines servent de places et ses branches de passerelles.', fire:'Un grand feu que l’on n’éteint jamais, autour duquel se réunit le conseil.', market:'Une place couverte d’étals, où l’on vend de tout, des épices aux cartes du ciel.'}[plazaRole];
    take(plazaRole,inside[0],plazaName,plazaDesc);
    const regNames={'Royaume':'Palais royal','Empire':'Palais impérial','République marchande':'Palais des guildes','Confédération de clans':'Grande halle des clans','Théocratie':'Palais du Grand Astrologue','Conseil des sages':'Maison des sages','Ligue de cités':'Palais des consuls'};
    if(kind!=='village' && arch!=='camp'){
      const palRole = arch==='hill' ? 'citadel' : arch==='nordic' ? 'longhall' : 'palace';
      const palName = arch==='hill' ? 'Citadelle de '+ct.name : arch==='nordic' ? 'Grande halle' : kind==='capital' ? (regNames[cv?cv.reg.short:'Royaume']||'Palais') : 'Maison du gouverneur';
      take(palRole, arch==='hill' ? inside[0]===undefined?null:(free(inside)[0]) : free(inside)[0], palName, arch==='hill' ? 'La citadelle fortifiée du sommet, derrière sa propre enceinte.' : arch==='nordic' ? 'Une immense maison longue où le chef tient conseil et banquet.' : `La résidence ${kind==='capital'?'de '+(cv?cv.ruler:'du souverain'):'du gouverneur'}, gardée jour et nuit.`);
      take('temple',free(inside)[0],`Temple de ${cnz?cnz.name:'la voûte'}`,`Le grand temple dédié à ${cnz?cnz.fig+', que '+p.name+' appellent '+cnz.name:'la voûte céleste'}.`);
      const far=free(inside).slice(-6); take('observatory',far[Math.floor(r()*far.length)],`Observatoire de ${ct.name}`,'Une tour coiffée d’un dôme, d’où les astronomes suivent la course des astres et tiennent le calendrier.');
      if(wallKind!=='none'){ const g0=gates[0]; const gc=g0?free(inside).sort((a,b)=>Math.hypot(a.seed[0]-g0.x,a.seed[1]-g0.y)-Math.hypot(b.seed[0]-g0.x,b.seed[1]-g0.y))[0]:null; take('barracks',gc,'Caserne de la Garde','La caserne de la garde, près des remparts.'); }
      for(let g=0;g<(kind==='capital'?2:1);g++){ const f=free(inside); take('guild',f[Math.floor(r()*f.length)],'Guilde des '+pick(r,['orfèvres','tisserands','forgerons','verriers','cartographes','marchands','tanneurs','horlogers','teinturiers','charpentiers de marine']),'La maison d’une guilde puissante, qui fixe les prix et forme les apprentis.'); }
      if(kind==='capital'){ let f=free(inside); take('library',f[Math.floor(r()*f.length)],'Grande bibliothèque','Des milliers de parchemins, dont les plus anciens catalogues d’étoiles du monde.'); f=free(inside); take('prison',f[f.length-1],'Prison de '+nm(),'Une forteresse sombre aux murs épais.'); }
      let f=free(inside); take('baths',f[Math.floor(r()*f.length)],(arch==='oasis'?'Hammam de ':'Bains de ')+nm(),'Des bains publics chauffés, lieu de rencontre et de rumeurs.');
      if(arch!=='elf' && arch!=='oasis'){ f=free(inside); take('garden',f[Math.floor(r()*f.length)],'Jardins de '+nm(),'Un jardin ombragé, avec un bassin et des arbres venus de loin.'); }
    } else if(arch!=='camp'){ take('temple',free(inside)[0],`${arch==='elf'?'Sanctuaire':'Chapelle'} de ${cnz?cnz.name:'la voûte'}`,`Un petit sanctuaire dédié à ${cnz?cnz.fig:'la voûte céleste'}.`); if(river) take('mill',free(inside)[1],'Moulin','Le moulin à eau du village.'); if(arch==='nordic') take('longhall',free(inside)[0],'Maison longue du chef','La plus grande maison du bourg, où l’on se réunit l’hiver.'); }
    // particularités propres à chaque organisation
    const specs=[];
    const spec=(role,name,desc,x,y)=>{ const o=x!=null?addSpot(role,x,y,name,desc):null; specs.push({role,name,desc}); return o; };
    if(arch==='grid' && kind!=='village'){ spec('aqueduct','Aqueduc','Une longue file d’arches qui amène l’eau des collines jusqu’à la cité.'); if(r()<.7){ const f=free(inside); const c=take('amphitheatre',f[Math.floor(f.length*.6)],'Amphithéâtre de '+ct.name,'Des gradins de pierre en ellipse, où se tiennent jeux et combats.'); } }
    if(arch==='canal'){ const nearS=free(cells.filter(c=>c.ring!=='field')).filter(c=>X.sd && isSea(c.seed[0]+X.sd[0]*60,c.seed[1]+X.sd[1]*60)); take('arsenal',nearS[0]||free(inside)[0],'Arsenal de '+ct.name,'Des chantiers navals fortifiés, où l’on construit la flotte de la cité.'); specs.push({role:'canal',name:'Canaux',desc:'Des barques et des gondoles glissent d’un quartier à l’autre.'}); }
    if(arch==='oasis'){ const g0=gates[0]; if(g0) spec('caravanserai','Caravansérail de '+nm(),'Une grande cour fortifiée où font halte les caravanes.',g0.x+(500-g0.x)*.12,g0.y+(500-g0.y)*.12); const f=free(inside); take('cistern',f[Math.floor(r()*f.length)],'Grande citerne','Une citerne souterraine voûtée qui garde l’eau de toute la ville.'); specs.push({role:'palms',name:'Palmeraies',desc:'Des palmeraies irriguées entourent la ville.'}); }
    if(arch==='nordic'){ const f=free(inside); take('runestone',f[Math.floor(r()*f.length)],'Pierres de '+nm(),'Un cercle de pierres gravées de runes, qui racontent les exploits des ancêtres.'); if(X.coastal) specs.push({role:'boatsheds',name:'Hangars à bateaux',desc:'De longs hangars abritent les navires pendant l’hiver.'}); }
    if(arch==='hill'){ specs.push({role:'terraces',name:'Terrasses',desc:'Des murs de soutènement dessinent des terrasses qui montent vers la citadelle.'}); if(r()<.6){ const f=free(cells.filter(c=>c.ring==='faub')); take('quarry',f[0],'Carrière de '+nm(),'La carrière d’où l’on a tiré la pierre de la ville.'); } }
    if(arch==='radial' && kind!=='village') spec('clocktower','Tour de l’horloge','Une haute tour dont l’horloge astronomique indique aussi les phases des lunes.',500+14,500-14);
    if(arch==='organic' && kind!=='village'){ const f=free(cells.filter(c=>c.ring==='faub')); take('leprosy',f[f.length-1],'Léproserie de '+nm(),'Un hospice à l’écart des murs, tenu par des moines.'); }
    if(arch==='linear' && river) specs.push({role:'livingbridge',name:'Pont habité',desc:'Un pont couvert de maisons et de boutiques enjambe la rivière.'});
    if(X.coastal && kind==='capital' && r()<.6 && X.sd){ const sd=X.sd; let u=0; while(u<R*1.6 && !isSea(500+sd[0]*u,500+sd[1]*u)) u+=6; spec('colossus','Colosse de '+ct.name,'Une statue géante veille sur l’entrée du port.',500+sd[0]*(u+26)+(-sd[1])*40,500+sd[1]*(u+26)+sd[0]*40); }
    if(kind==='capital' && era>=3 && r()<.5){ const f=free(inside); take('hanging',f[Math.floor(r()*f.length)],'Jardins suspendus','Des terrasses de verdure accrochées aux murs du palais, irriguées par des roues à eau.'); }
    const windmills=[]; if(['grass','steppe','savanna','tundra'].includes(X.biome) && arch!=='oasis' && arch!=='elf'){ for(let q=0;q<3+Math.floor(r()*3);q++){ const a=r()*TAU, d=R*(1.3+r()*.5); const x=500+Math.cos(a)*d, y=500+Math.sin(a)*d; if(!isWater(x,y) && x>20&&x<980&&y>20&&y<980) windmills.push([x,y]); } if(windmills.length) spec('windmill','Moulins à vent','Une rangée de moulins tourne sur les hauteurs autour de la ville.',windmills[0][0],windmills[0][1]); }
    if(X.sd){ const near=cells.filter(c=>(c.ring==='in'||c.ring==='faub') && !used.has(c.i)).map(c=>{ let u=0; while(u<200 && !isSea(c.seed[0]+X.sd[0]*u, c.seed[1]+X.sd[1]*u)) u+=8; return [c,u]; }).filter(([,u])=>u<60).sort((a,b)=>a[1]-b[1]); if(near.length && arch!=='canal') take('port',near[0][0],'Port de '+ct.name,'Des quais animés, des entrepôts et des navires venus de tout le monde connu.'); }
    const faub=cells.filter(c=>c.ring==='faub' && !used.has(c.i)); if(faub.length && kind!=='village' && arch!=='camp') take('cemetery',faub[Math.floor(r()*faub.length)],'Cimetière de '+nm(),'Les tombes s’alignent face à l’horizon, selon la tradition.');
    // quartiers
    const quarters=[]; if(kind!=='village' && arch!=='camp'){ const qn=kind==='capital'?6:4, qc=[inside[0]]; while(qc.length<qn && qc.length<inside.length){ let best=null, bd=-1; for(const c of inside){ const d=Math.min(...qc.map(q=>Math.hypot(q.seed[0]-c.seed[0],q.seed[1]-c.seed[1]))); if(d>bd){ bd=d; best=c; } } qc.push(best); }
      const groups=qc.map(()=>[]); for(const c of inside){ let bi=0, bd=1e9; qc.forEach((q,i)=>{ const d=Math.hypot(q.seed[0]-c.seed[0],q.seed[1]-c.seed[1]); if(d<bd){ bd=d; bi=i; } }); groups[bi].push(c); }
      const types=shuffle(r, arch==='oasis'?['Quartier des potiers','Quartier des teinturiers','Quartier des caravaniers','Quartier des puits']: arch==='canal'?['Quartier des verriers','Quartier des bateliers','Île des marchands','Quartier de l’arsenal']: arch==='nordic'?['Quartier des forgerons','Quartier des charpentiers','Quartier des pêcheurs']: arch==='elf'?['Cercle des chanteurs','Bosquet des archers','Cercle des tisseurs de lune']:['Quartier des artisans','Quartier marchand','Bas-quartier','Quartier des tisserands','Quartier des forgerons','Quartier des étudiants']);
      groups.forEach((g,i)=>{ const roles=g.map(c=>c.role); const nmq = i===0 ? (arch==='elf'?'Cœur de la forêt':arch==='hill'?'Haute-ville':'Vieille ville') : (roles.includes('palace')||roles.includes('citadel')) ? 'Quartier noble' : roles.includes('port')||roles.includes('arsenal') ? 'Quartier du port' : roles.includes('temple') ? 'Quartier des temples' : types[i%types.length];
        const cen=polyCen(g.map(c=>c.seed)); quarters.push({name:nmq, x:cen[0], y:cen[1], n:g.length}); }); }
    // bâtiments
    const cult=p?p.style:'celeste', cold=['tundra','taiga','ice'].includes(X.biome);
    const roofKey = arch==='oasis' ? 'white' : arch==='elf' ? 'moss' : arch==='camp' ? 'tent' : arch==='nordic' ? (r()<.5?'wood':'thatch') : kind==='village' ? 'thatch' : cold ? 'slate' : cult==='ancien' ? 'white' : cult==='nordique' ? 'slate' : 'terracotta';
    const mode = arch==='oasis' ? 'court' : arch==='nordic' ? 'long' : arch==='elf' ? 'round' : arch==='camp' ? 'tent' : 'block';
    const lots=[]; const minA={capital:300, city:340, village:420}[kind]*(arch==='organic'?.7:arch==='oasis'?1.6:arch==='nordic'?2.2:arch==='elf'?1.8:1);
    const noLots=new Set(['market','forum','souk','garden','cemetery','greattree','fire','runestone']);
    for(const c of cells){ if(c.poly.length<3 || noLots.has(c.role) || c.ring==='field' || arch==='camp') continue;
      const base=insetPoly(c.poly, c.ring==='in'?(arch==='grid'?7:arch==='organic'?3.5:5):9);
      const ls=splitLots(base, c.ring==='in'?minA:minA*2.2, r);
      let biggest=null, ba=0;
      for(const l of ls){ const cc=polyCen(l); if(isWater(cc[0],cc[1]) || nearStreet(cc[0],cc[1],c.ring==='in'?sw*.75:sw)) continue;
        if(wallKind!=='none' && c.ring==='in' && !insideShape(cc[0],cc[1],.99)) continue;
        if(arch==='hill' && c.ring==='in' && Math.abs(Math.hypot(cc[0]-500,cc[1]-500)-R*.3)<8) continue;
        if(r()<(c.ring==='in'?(arch==='elf'?.2:.07):.4)) continue; const b=insetPoly(l,1.6); const a=polyArea(b); if(a<60) continue;
        const lot={poly:b, ring:c.ring, cell:c, special:false}; lots.push(lot); if(a>ba && c.role){ ba=a; biggest=lot; } }
      if(biggest){ biggest.special=true; const o=L.find(q=>q.cell===c); if(o){ const cc=polyCen(biggest.poly); o.x=cc[0]; o.y=cc[1]; } } }
    for(const o of L) if(!o.x && o.cell){ const cc=polyCen(o.cell.poly); o.x=cc[0]; o.y=cc[1]; }
    const tents=[]; if(arch==='camp'){ for(const [rr,n] of [[80,8],[140,13],[200,18],[260,22]]){ for(let q=0;q<n;q++){ const a=q/n*TAU+r()*.2; tents.push([500+Math.cos(a)*rr,500+Math.sin(a)*rr,12+r()*7]); } } }
    // tavernes et portes
    const tav=[]; const nT=kind==='capital'?4:kind==='city'?3:1;
    const cand=lots.filter(l=>!l.special && l.ring!=='field' && nearStreet(...polyCen(l.poly),sw+14)).sort(()=>r()-.5);
    for(const l of cand){ if(tav.length>=nT) break; const cc=polyCen(l.poly); if(tav.some(t=>Math.hypot(t.x-cc[0],t.y-cc[1])<110)) continue; l.special=true; tav.push({role:'tavern', name:(arch==='oasis'?'Maison de thé ':arch==='nordic'?'Salle à hydromel ':'Taverne ')+pick(r,INNS), desc:'Une salle enfumée où l’on boit, joue et échange des nouvelles.', hook:pick(r,CITY_HOOKS.tavern), x:cc[0], y:cc[1], cell:l.cell}); }
    L.push(...tav);
    gates.forEach(g=>L.push({role:'gate', name:g.name, desc: wallKind==='none' ? 'L’une des routes qui entrent dans la ville.' : wallKind==='wood' ? 'Une porte de rondins surmontée d’une tour de guet.' : 'Une porte fortifiée, gardée jour et nuit.', hook:pick(r,CITY_HOOKS.gate), x:g.x, y:g.y}));
    const popN = kind==='capital' ? Math.max(4000, Math.round((cv?cv.popN:40000)*(.04+r()*.04)/100)*100) : kind==='city' ? Math.max(1500, Math.round((cv?cv.popN:20000)*(.01+r()*.015)/100)*100) : (arch==='camp'?80:150)+Math.round(r()*75)*10;
    const kmPx={capital:.0045, city:.0035, village:.0018}[kind];
    const plan={ct, k, kind, p, cv, X, arch, isSea, seaPoly, river, rw, canals, cells, wall, inner, wallKind, star, gates, streets, lanes, sw, bridges, lots, L, quarters, popN, kmPx, walled:wallKind!=='none', R, A, B, ax, fromUV, roofKey, mode, specs, windmills, tents};
    plan.img=renderCityImage(plan);
    return plan;
  });
}
function renderCityImage(pl, sc=1){
  const can=document.createElement('canvas'); can.width=can.height=Math.round(1000*sc); const g=can.getContext('2d'); g.scale(sc,sc); const r=mulberry32(hashStr(pl.ct.name+'|img'));
  const b=pl.X.biome, ground = ['desert','colddesert'].includes(b) ? '#eadcb2' : ['tundra','ice','taiga'].includes(b) ? '#e4e2d8' : pl.arch==='elf' ? '#d9dfbf' : '#e7ddc2';
  g.fillStyle=ground; g.fillRect(0,0,1000,1000);
  const path=(pts,close)=>{ g.beginPath(); pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])); if(close) g.closePath(); };
  // relief de colline
  if(pl.arch==='hill'){ for(const t of [.3,.44,.58,.72,.86,1,1.2,1.45]){ g.strokeStyle='rgba(120,100,70,.28)'; g.lineWidth=1.2; const pts=[]; for(let q=0;q<=60;q++){ const a=q/60*TAU; const w=1+.04*Math.sin(a*3+t*7); pts.push([500+Math.cos(a)*t*pl.R*w,500+Math.sin(a)*t*pl.R*w]); } path(pts); g.stroke(); } }
  // champs, palmeraies, forêt
  for(const c of pl.cells){ if(c.ring!=='field' || c.poly.length<3) continue; const poly=insetPoly(c.poly,6);
    if(pl.arch==='oasis'){ g.fillStyle='#d8d49c'; path(poly,true); g.fill(); const cc=polyCen(poly), A=polyArea(poly); for(let k=0;k<A/700;k++){ const x=cc[0]+(r()-.5)*Math.sqrt(A)*.8, y=cc[1]+(r()-.5)*Math.sqrt(A)*.8; g.strokeStyle='#5f7a3a'; g.lineWidth=1.4; g.beginPath(); for(let s=0;s<6;s++){ const a=s/6*TAU; g.moveTo(x,y); g.lineTo(x+Math.cos(a)*5,y+Math.sin(a)*5); } g.stroke(); } continue; }
    if(pl.arch==='elf'||pl.arch==='camp') continue;
    const col=pick(r, ['#dcdcae','#e4d7a2','#d3d9a6','#e0d4a8']); g.fillStyle=col; path(poly,true); g.fill();
    g.save(); g.clip(); g.strokeStyle='rgba(120,110,70,.25)'; g.lineWidth=1; const a=r()*Math.PI, dx=Math.cos(a), dy=Math.sin(a); for(let t=-1400;t<1400;t+=9){ g.beginPath(); g.moveTo(500+dx*-1400-dy*t,500+dy*-1400+dx*t); g.lineTo(500+dx*1400-dy*t,500+dy*1400+dx*t); g.stroke(); } g.restore(); }
  // eau
  if(pl.seaPoly){ g.fillStyle='#a9c4d8'; path(pl.seaPoly,true); g.fill(); g.strokeStyle='#6b5a45'; g.lineWidth=2; path(pl.seaPoly.slice(0,-2)); g.stroke(); }
  g.lineCap='round'; g.lineJoin='round';
  if(pl.river){ g.strokeStyle='#6b5a45'; g.lineWidth=pl.rw+4; path(pl.river); g.stroke(); g.strokeStyle='#a9c4d8'; g.lineWidth=pl.rw; g.stroke(); }
  for(const c of pl.canals){ g.strokeStyle='#6b5a45'; g.lineWidth=17; path(c); g.stroke(); g.strokeStyle='#9fbfd6'; g.lineWidth=14; g.stroke(); }
  // aqueduc
  if(pl.specs.some(s=>s.role==='aqueduct')){ const a=pl.ax+Math.PI*.75, e=[500+Math.cos(a)*700,500+Math.sin(a)*700], s0=[500+Math.cos(a)*pl.R*.35,500+Math.sin(a)*pl.R*.35];
    g.strokeStyle='#8a7a66'; g.lineWidth=7; g.beginPath(); g.moveTo(...e); g.lineTo(...s0); g.stroke(); g.strokeStyle='#d9ccb0'; g.lineWidth=3; g.stroke();
    const d=norm2([s0[0]-e[0],s0[1]-e[1]]); for(let t=0;t<Math.hypot(s0[0]-e[0],s0[1]-e[1]);t+=12){ g.strokeStyle='#6b5a45'; g.lineWidth=1; g.beginPath(); g.moveTo(e[0]+d[0]*t-d[1]*4,e[1]+d[1]*t+d[0]*4); g.lineTo(e[0]+d[0]*t+d[1]*4,e[1]+d[1]*t-d[0]*4); g.stroke(); } }
  // places et lieux ouverts
  const open={market:'#eee4cb', forum:'#efe8d6', souk:'#e6d2a6', garden:'#b8c98e', cemetery:'#c9cfae', greattree:'#c9d6a4', fire:'#e7dcc0', runestone:'#ddd5bd'};
  for(const c of pl.cells){ if(!open[c.role]) continue; const poly=insetPoly(c.poly,6); g.fillStyle=open[c.role]; g.strokeStyle='#8a7658'; g.lineWidth=1.2; path(poly,true); g.fill(); g.stroke();
    const cc=polyCen(poly), A=polyArea(poly);
    if(c.role==='greattree'){ for(let k=0;k<14;k++){ const a=k/14*TAU; g.fillStyle=k%2?'#6f9a52':'#7fa860'; g.beginPath(); g.arc(cc[0]+Math.cos(a)*22,cc[1]+Math.sin(a)*22,16,0,TAU); g.fill(); } g.fillStyle='#5f8a44'; g.beginPath(); g.arc(cc[0],cc[1],26,0,TAU); g.fill(); g.strokeStyle='#3f5a2c'; g.lineWidth=1.5; g.stroke(); continue; }
    if(c.role==='fire'){ g.fillStyle='#e0863a'; g.beginPath(); g.arc(cc[0],cc[1],9,0,TAU); g.fill(); g.fillStyle='#f5c65a'; g.beginPath(); g.arc(cc[0],cc[1],4.5,0,TAU); g.fill(); continue; }
    if(c.role==='runestone'){ for(let k=0;k<9;k++){ const a=k/9*TAU; g.fillStyle='#8a8478'; g.beginPath(); g.arc(cc[0]+Math.cos(a)*18,cc[1]+Math.sin(a)*18,3.2,0,TAU); g.fill(); } continue; }
    if(c.role==='forum'){ g.strokeStyle='#b9a888'; g.lineWidth=1; const pp=insetPoly(poly,8); path(pp,true); g.stroke(); for(const q of pp){ g.fillStyle='#d6c8a8'; g.beginPath(); g.arc(q[0],q[1],3,0,TAU); g.fill(); } continue; }
    const n=Math.round(A/(c.role==='souk'?250:c.role==='market'?900:500));
    for(let k=0;k<n;k++){ const x=cc[0]+(r()-.5)*Math.sqrt(A)*.9, y=cc[1]+(r()-.5)*Math.sqrt(A)*.9;
      if(c.role==='market'||c.role==='souk'){ g.fillStyle=pick(r,['#c9894f','#b8674a','#d8b56a','#8fa66a','#a45a7a']); g.fillRect(x-4,y-3,8,6); }
      else if(c.role==='garden'){ g.fillStyle='#7f9a58'; g.strokeStyle='#4f6036'; g.beginPath(); g.arc(x,y,5,0,TAU); g.fill(); g.stroke(); }
      else { g.strokeStyle='#6b6356'; g.lineWidth=1.2; g.beginPath(); g.moveTo(x,y-4); g.lineTo(x,y+4); g.moveTo(x-3,y-1.5); g.lineTo(x+3,y-1.5); g.stroke(); } } }
  // rues
  for(const s of pl.streets){ g.strokeStyle='#bfae8c'; g.lineWidth=pl.sw+3; path(s); g.stroke(); g.strokeStyle='#f0e7d0'; g.lineWidth=pl.sw; g.stroke(); }
  for(const s of pl.lanes){ g.strokeStyle='#cdbb95'; g.lineWidth=Math.max(4,pl.sw*.7); path(s); g.stroke(); }
  // bâtiments
  const roof=ROOFS[pl.roofKey]||ROOFS.terracotta;
  const shade=(hex,v)=>{ const c=hexToRgb(hex); return `rgb(${clamp(c[0]+v,0,255)|0},${clamp(c[1]+v,0,255)|0},${clamp(c[2]+v,0,255)|0})`; };
  for(const l of pl.lots){ const base = l.special ? '#d4a23c' : pick(r,roof); const v=(r()-.5)*16, fill=l.ring==='in'?shade(base,v):shade(base,v+14);
    const cc=polyCen(l.poly); let bi=0, bl=0; for(let i=0;i<l.poly.length;i++){ const a=l.poly[i], b2=l.poly[(i+1)%l.poly.length], len=Math.hypot(b2[0]-a[0],b2[1]-a[1]); if(len>bl){ bl=len; bi=i; } }
    const a0=l.poly[bi], a1=l.poly[(bi+1)%l.poly.length], dir=norm2([a1[0]-a0[0],a1[1]-a0[1]]), area=polyArea(l.poly);
    g.strokeStyle='#5a3d2a'; g.lineWidth=.9;
    if(pl.mode==='round'){ const rr=Math.min(14,Math.sqrt(area)/2.4); g.fillStyle=fill; g.beginPath(); g.arc(cc[0],cc[1],rr,0,TAU); g.fill(); g.stroke(); g.beginPath(); for(let s=0;s<6;s++){ const a=s/6*TAU; g.moveTo(cc[0],cc[1]); g.lineTo(cc[0]+Math.cos(a)*rr,cc[1]+Math.sin(a)*rr); } g.strokeStyle='rgba(60,50,30,.35)'; g.stroke(); continue; }
    if(pl.mode==='long'){ const L2=Math.min(bl*.85,48), W2=Math.min(Math.sqrt(area)*.45,13); g.save(); g.translate(cc[0],cc[1]); g.rotate(Math.atan2(dir[1],dir[0])); g.fillStyle=fill; g.beginPath(); g.moveTo(-L2/2,-W2/2+2); g.quadraticCurveTo(0,-W2/2-2,L2/2,-W2/2+2); g.lineTo(L2/2,W2/2-2); g.quadraticCurveTo(0,W2/2+2,-L2/2,W2/2-2); g.closePath(); g.fill(); g.stroke(); g.strokeStyle='rgba(60,40,20,.5)'; g.beginPath(); g.moveTo(-L2/2+3,0); g.lineTo(L2/2-3,0); g.stroke(); g.restore(); continue; }
    g.fillStyle=fill; path(l.poly,true); g.fill(); g.stroke();
    if(pl.mode==='court' && area>260){ const ins=insetPoly(l.poly,Math.min(7,Math.sqrt(area)*.28)); g.fillStyle=ground; path(ins,true); g.fill(); g.strokeStyle='rgba(90,61,42,.6)'; g.stroke(); if(r()<.4){ const ic=polyCen(ins); g.fillStyle='#6f9a52'; g.beginPath(); g.arc(ic[0],ic[1],2.6,0,TAU); g.fill(); } }
    else if(pl.mode==='block' && area>90){ const half=Math.min(bl*.42,Math.sqrt(area)*.6); g.strokeStyle='rgba(50,30,15,.45)'; g.lineWidth=1; g.beginPath(); g.moveTo(cc[0]-dir[0]*half,cc[1]-dir[1]*half); g.lineTo(cc[0]+dir[0]*half,cc[1]+dir[1]*half); g.stroke(); } }
  // tentes
  for(const [x,y,rr] of pl.tents){ g.fillStyle=pick(r,ROOFS.tent); g.strokeStyle='#6b5a3a'; g.lineWidth=1.2; g.beginPath(); g.arc(x,y,rr,0,TAU); g.fill(); g.stroke(); g.fillStyle='#6b5a3a'; g.beginPath(); g.arc(x,y,2,0,TAU); g.fill(); }
  // arbres
  const nT=pl.arch==='elf'?700:pl.arch==='oasis'?60:260;
  for(let k=0;k<nT;k++){ const x=r()*1000, y=r()*1000; if(pl.isSea(x,y) || (pl.river && distPoly([x,y],pl.river)<pl.rw) || pl.canals.some(c=>distPoly([x,y],c)<12)) continue; const d=Math.hypot(x-500,y-500);
    if(pl.arch!=='elf' && d<pl.R*1.05) continue; if(pl.streets.some(s=>distPoly([x,y],s)<pl.sw) || pl.lanes.some(s=>distPoly([x,y],s)<6)) continue; if(pl.lots.some(l=>{ const c=polyCen(l.poly); return Math.hypot(c[0]-x,c[1]-y)<(pl.arch==='elf'?22:14); })) continue;
    if(pl.cells.some(c=>c.role && open[c.role] && Math.hypot(polyCen(c.poly)[0]-x,polyCen(c.poly)[1]-y)<30)) continue;
    const rr=pl.arch==='elf'?5+r()*5:4+r()*3; g.fillStyle=pl.arch==='elf'?pick(r,['#7f9a58','#6f8a4c','#8fa866']):'#9db172'; g.strokeStyle='#56663c'; g.lineWidth=1; g.beginPath(); g.arc(x,y,rr,0,TAU); g.fill(); g.stroke(); }
  // moulins à vent
  for(const [x,y] of pl.windmills){ g.fillStyle='#d9ccb0'; g.strokeStyle='#4a3a2c'; g.lineWidth=1.2; g.beginPath(); g.arc(x,y,4,0,TAU); g.fill(); g.stroke(); g.beginPath(); for(let s=0;s<4;s++){ const a=s/4*TAU+.4; g.moveTo(x,y); g.lineTo(x+Math.cos(a)*11,y+Math.sin(a)*11); } g.stroke(); }
  // ponts
  for(const b2 of pl.bridges){ g.fillStyle='#d9ccb0'; g.strokeStyle='#5a4128'; g.lineWidth=1.5; g.beginPath(); g.arc(b2[0],b2[1],pl.canals.length?7:10,0,TAU); g.fill(); g.stroke(); }
  if(pl.canals.length){ for(let k=0;k<40;k++){ const c=pick(r,pl.canals), q=pick(r,c); g.fillStyle='#4a3a2c'; g.beginPath(); g.ellipse(q[0]+(r()-.5)*4,q[1]+(r()-.5)*4,5,2,r()*Math.PI,0,TAU); g.fill(); } }
  // remparts
  if(pl.wall.length){ const n=pl.wall.length, wood=pl.wallKind==='wood';
    if(pl.star){ g.strokeStyle='#8fb0c8'; g.lineWidth=10; path(pl.wall.map(q=>[500+(q[0]-500)*1.06,500+(q[1]-500)*1.06]),true); g.stroke(); }
    for(let q=0;q<n;q++){ const a=pl.wall[q], b2=pl.wall[(q+1)%n]; if(pl.isSea(...a)&&pl.isSea(...b2)) continue;
      const gt=pl.gates.find(gg=>distSeg([gg.x,gg.y],a,b2)<16);
      g.strokeStyle=wood?'#7a5a3c':'#5b4a3a'; g.lineWidth=wood?5:(pl.star?8:7); g.lineCap='butt'; if(wood) g.setLineDash([3,2]);
      if(gt){ const d=norm2([b2[0]-a[0],b2[1]-a[1]]); g.beginPath(); g.moveTo(...a); g.lineTo(gt.x-d[0]*11,gt.y-d[1]*11); g.moveTo(gt.x+d[0]*11,gt.y+d[1]*11); g.lineTo(...b2); g.stroke(); g.setLineDash([]);
        for(const s of [-1,1]){ g.fillStyle=wood?'#9a7a55':'#8a7a66'; g.beginPath(); if(wood) g.rect(gt.x+d[0]*13*s-5,gt.y+d[1]*13*s-5,10,10); else g.arc(gt.x+d[0]*13*s,gt.y+d[1]*13*s,7.5,0,TAU); g.fill(); g.lineWidth=1.5; g.stroke(); } }
      else { if(pl.isSea((a[0]+b2[0])/2,(a[1]+b2[1])/2)) continue; g.beginPath(); g.moveTo(...a); g.lineTo(...b2); g.stroke(); g.setLineDash([]); } }
    if(!wood) pl.wall.forEach((t,i)=>{ if(pl.isSea(...t)) return; if(pl.star && i%2===0) return; g.fillStyle='#8a7a66'; g.strokeStyle='#4a3a2c'; g.lineWidth=1.5; g.beginPath(); if(pl.arch==='grid'||pl.arch==='oasis') g.rect(t[0]-7,t[1]-7,14,14); else g.arc(t[0],t[1],8,0,TAU); g.fill(); g.stroke(); }); }
  if(pl.inner.length){ g.strokeStyle='#5b4a3a'; g.lineWidth=6; path(pl.inner,true); g.stroke(); for(const t of pl.inner){ g.fillStyle='#8a7a66'; g.beginPath(); g.arc(t[0],t[1],5.5,0,TAU); g.fill(); g.lineWidth=1.2; g.stroke(); } }
  // port, hangars, arsenal
  const port=pl.L.find(o=>o.role==='port'||o.role==='arsenal'); if(port && pl.X.sd){ const sd=pl.X.sd, pp=[-sd[1],sd[0]]; let u=0; while(u<300 && !pl.isSea(port.x+sd[0]*u, port.y+sd[1]*u)) u+=4;
    const nordic=pl.arch==='nordic';
    for(let k=-2;k<=2;k++){ const bx=port.x+sd[0]*u+pp[0]*k*26, by=port.y+sd[1]*u+pp[1]*k*26; g.save(); g.translate(bx,by); g.rotate(Math.atan2(sd[1],sd[0]));
      if(nordic){ g.fillStyle='#8a6a48'; g.strokeStyle='#4a3a2c'; g.lineWidth=1.2; g.fillRect(-18,-5,22,10); g.strokeRect(-18,-5,22,10); g.fillStyle='#5a3d2a'; g.beginPath(); g.ellipse(22,0,14,3.5,0,0,TAU); g.fill(); }
      else { g.fillStyle='#b69a72'; g.strokeStyle='#5a4128'; g.lineWidth=1.2; g.fillRect(0,-3,34,6); g.strokeRect(0,-3,34,6); g.fillStyle='#6b4a2a'; g.beginPath(); g.ellipse(40,11,12,4.5,0,0,TAU); g.fill(); }
      g.restore(); } }
  // amphithéâtre et colosse
  const amph=pl.L.find(o=>o.role==='amphitheatre'); if(amph){ g.fillStyle='#e0d4b6'; g.strokeStyle='#6b5a45'; g.lineWidth=2; g.beginPath(); g.ellipse(amph.x,amph.y,22,15,pl.ax,0,TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(amph.x,amph.y,12,7,pl.ax,0,TAU); g.fillStyle='#d2c09a'; g.fill(); g.stroke(); }
  return can;
}

/* ---------- vue du plan ---------- */
let CITY=null, CY_OPEN=false, cyDirty=true, cySel=null, cyHits=[];
const cyView={x:500,y:500,z:1}; const ccv=$('ccv'), cyctx=ccv.getContext('2d'); let CYW=0, CYH=0;
const CITY_ICON={palace:'♛', temple:'△', observatory:'◉', barracks:'⚑', guild:'◆', library:'▤', prison:'▣', arena:'◎', baths:'≈', garden:'✿', cemetery:'✝', market:'●', port:'⚓', tavern:'◘', gate:'▥', mill:'✱', well:'○'};
function openCityPlan(ct, k){
  toast('Préparation du plan…');
  setTimeout(()=>{ CITY=makeCityPlan(ct,k); cySel=null; cyView.x=500; cyView.y=500; cyView.z=1; CY_OPEN=true; $('cityv').hidden=false; closeSheets(); cyPanel(); cyDirty=true; },30);
}
function closeCity(){ CY_OPEN=false; $('cityv').hidden=true; dirty=true; mDirty=true; }
$('cyBack').onclick=closeCity;
$('cyZin').onclick=()=>{ cyView.z=clamp(cyView.z*1.3,.6,6); cyDirty=true; };
$('cyZout').onclick=()=>{ cyView.z=clamp(cyView.z/1.3,.6,6); cyDirty=true; };
const cyFit=()=>Math.min(CYW,CYH)/1000*.96;
attachDrag(ccv,(dx,dy)=>{ const s=cyFit()*cyView.z; cyView.x=clamp(cyView.x-dx/s,0,1000); cyView.y=clamp(cyView.y-dy/s,0,1000); cyDirty=true; }, f=>{ cyView.z=clamp(cyView.z/f,.6,6); cyDirty=true; }, (x,y)=>{ let best=null, bd=18; for(const h of cyHits){ const d=Math.hypot(h.x-x,h.y-y); if(d<bd){ bd=d; best=h.o; } } cySel=best; cyPanel(); cyDirty=true; }, null);
new ResizeObserver(()=>{ cyDirty=true; }).observe($('cyStage'));
function drawCityTo(c, SW, SH, pl, vx, vy, z, fit, hits, forExport){
  const s=fit*z, T=(x,y)=>[SW/2+(x-vx)*s, SH/2+(y-vy)*s];
  c.fillStyle='#e9dfc6'; c.fillRect(0,0,SW,SH); const [x0,y0]=T(0,0); c.imageSmoothingEnabled=true; c.drawImage(pl.img,x0,y0,1000*s,1000*s); c.strokeStyle='#6b563c'; c.lineWidth=2; c.strokeRect(x0,y0,1000*s,1000*s);
  const boxes=[]; const free=(x,y,w,h)=>{ for(const b of boxes) if(x<b[0]+b[2]&&x+w>b[0]&&y<b[1]+b[3]&&y+h>b[1]) return false; boxes.push([x,y,w,h]); return true; };
  const label=(t,x,y,font,col,always)=>{ c.font=font; const w=c.measureText(t).width; if(!always && !free(x-w/2,y-9,w,18)) return; c.textAlign='center'; c.textBaseline='middle'; c.lineWidth=3.5; c.strokeStyle='rgba(240,232,212,.9)'; c.strokeText(t,x,y); c.fillStyle=col; c.fillText(t,x,y); };
  for(const q of pl.quarters){ const [x,y]=T(q.x,q.y); label(q.name,x,y,`italic 600 ${Math.round(clamp(15*Math.sqrt(z),14,24))}px ${SERIF}`,'#6b4a2a'); }
  for(const o of pl.L){ const [x,y]=T(o.x,o.y); if(x<-20||y<-20||x>SW+20||y>SH+20) continue; const big=['palace','temple','observatory','market','port','citadel','forum','souk','greattree','longhall','arsenal','fire'].includes(o.role);
    c.fillStyle=o.role==='gate'?'#5b4a3a':'#8a2f24'; c.strokeStyle='#fff6e0'; c.lineWidth=2; c.beginPath(); c.arc(x,y,big?10:8,0,TAU); c.fill(); c.stroke();
    c.fillStyle='#fff6e0'; c.font=`${big?13:11}px system-ui, sans-serif`; c.textAlign='center'; c.textBaseline='middle'; c.fillText(CITY_ICON[o.role]||'•',x,y+.5);
    if(cySel===o){ c.strokeStyle='#b8322a'; c.lineWidth=2; c.beginPath(); c.arc(x,y,15,0,TAU); c.stroke(); }
    hits&&hits.push({x,y,o}); if(big || z>=1.4 || cySel===o || forExport) label(o.name,x,y-(big?20:17),`${big?'600 ':''}12.5px Figtree, system-ui, sans-serif`,'#2e2114', big||forExport); }
  c.save(); c.textAlign='left'; c.textBaseline='alphabetic'; const title=pl.ct.name; c.font=`italic 600 26px ${SERIF}`; const tw=Math.max(240,c.measureText(title).width+40); const cy0=forExport?14:SH-150;
  c.fillStyle='rgba(244,236,214,.92)'; c.strokeStyle='#6b563c'; c.lineWidth=1.5; c.fillRect(14,cy0,tw,62); c.strokeRect(14,cy0,tw,62); c.strokeRect(18,cy0+4,tw-8,54);
  c.fillStyle='#3a2a18'; c.fillText(title,32,cy0+32); c.font='500 12.5px Figtree, system-ui, sans-serif'; c.fillStyle='#6b563c'; c.fillText(`${pl.kind==='capital'?'Capitale':pl.kind==='city'?'Cité':'Village'}${pl.p?' '+pl.p.name.replace(/^les /,'des '):''}, ${fr(pl.popN,0)} habitants`,33,cy0+50); c.restore();
  const kmS=pl.kmPx/s; let len=100; for(const L2 of [50,100,200,250,500,1000]){ if(L2/1000/kmS>70){ len=L2; break; } } const pxL=len/1000/kmS, bx=20, by=SH-(forExport?24:70);
  c.fillStyle='rgba(244,236,214,.9)'; c.fillRect(bx-6,by-18,pxL+60,28); c.strokeStyle='#3e2f20'; c.lineWidth=2; c.beginPath(); c.moveTo(bx,by); c.lineTo(bx+pxL,by); c.stroke(); c.fillStyle='#3e2f20'; c.font='500 11.5px Figtree, system-ui, sans-serif'; c.textAlign='left'; c.fillText(len+' m',bx+pxL+8,by+4);
}
function drawCity(){
  const rect=$('cyStage').getBoundingClientRect(), dpr=Math.min(2,devicePixelRatio||1);
  if(Math.round(rect.width*dpr)!==ccv.width || Math.round(rect.height*dpr)!==ccv.height){ ccv.width=Math.round(rect.width*dpr); ccv.height=Math.round(rect.height*dpr); }
  CYW=rect.width; CYH=rect.height; cyctx.setTransform(dpr,0,0,dpr,0,0); if(!CITY) return; cyHits=[]; drawCityTo(cyctx,CYW,CYH,CITY,cyView.x,cyView.y,cyView.z,cyFit(),cyHits,false);
}
const ROLE_LABEL={palace:'Palais', temple:'Temple', observatory:'Observatoire', barracks:'Caserne', guild:'Guilde', library:'Bibliothèque', prison:'Prison', arena:'Arène', baths:'Bains', garden:'Jardins', cemetery:'Cimetière', market:'Marché', port:'Port', tavern:'Taverne', gate:'Porte', mill:'Moulin', well:'Puits'};
Object.assign(CITY_ICON,{forum:'●', amphitheatre:'◎', citadel:'♜', arsenal:'⚓', caravanserai:'⌂', souk:'●', cistern:'◌', longhall:'⌂', runestone:'ᛟ', greattree:'♣', clocktower:'◷', colossus:'☗', hanging:'✿', windmill:'✢', quarry:'◇', leprosy:'✚', livingbridge:'═', boatsheds:'⚓', fire:'✺'});
Object.assign(ROLE_LABEL,{forum:'Forum', amphitheatre:'Amphithéâtre', citadel:'Citadelle', arsenal:'Arsenal', caravanserai:'Caravansérail', souk:'Souk', cistern:'Citerne', longhall:'Grande halle', runestone:'Pierres runiques', greattree:'Arbre-cœur', clocktower:'Tour de l’horloge', colossus:'Colosse', hanging:'Jardins suspendus', windmill:'Moulins à vent', quarry:'Carrière', leprosy:'Léproserie', livingbridge:'Pont habité', boatsheds:'Hangars à bateaux', fire:'Feu central'});
function cyPanel(){
  const pl=CITY; if(!pl) return; $('cyTitle').textContent=pl.ct.name; $('cySubT').textContent=`${pl.kind==='capital'?'Capitale':pl.kind==='city'?'Cité':'Village'}${pl.p?' '+pl.p.name.replace(/^les /,'des '):''}, ${fr(pl.popN,0)} habitants`;
  const info=$('cyInfo'); info.innerHTML='';
  if(cySel){ const o=cySel; info.append(el('h3',null,o.name), el('p','sub',ROLE_LABEL[o.role]||''), el('p','desc',o.desc)); if(o.hook){ const h=el('p','desc'); const b=el('b',null,'Rumeur. '); b.style.fontWeight='600'; h.append(b, document.createTextNode(o.hook)); info.append(h); }
    const bb=el('button','act','Désélectionner'); bb.onclick=()=>{ cySel=null; cyPanel(); cyDirty=true; }; info.append(bb); }
  else { const X=pl.X; const feats=[pl.walled?(pl.wallKind==='wood'?'protégée par une palissade de bois percée de ':pl.star?'défendue par une forteresse en étoile percée de ':'entourée de remparts percés de ')+pl.gates.length+' portes':'sans remparts', X.coastal?'ouverte sur la mer':null, pl.river?'traversée par une rivière'+(pl.bridges.length?' que franchissent '+pl.bridges.length+' ponts':''):null, X.hill?'bâtie sur une hauteur':null].filter(Boolean);
    info.append(el('h3',null,pl.ct.name), el('p','sub',`${ARCH[pl.arch].label}, ${fr(pl.popN,0)} habitants`), el('p','desc',`${pl.ct.desc||''} ${ARCH[pl.arch].txt} La ville est ${feats.join(', ')}. Touche un lieu pour découvrir ce qu’on y trouve.`));
    if(pl.specs && pl.specs.length){ info.append(el('h4',null,'Particularités')); for(const sp of pl.specs) info.append(Object.assign(el('p','desc',sp.name+'. '+sp.desc),{style:'margin-bottom:6px'})); } }
  const lists=$('cyLists'); lists.innerHTML='';
  if(pl.quarters.length){ lists.append(el('h4',null,'Quartiers')); lists.append(el('p','desc', pl.quarters.map(q=>q.name).join(', ')+'.')); }
  lists.append(el('h4',null,'Lieux')); const ul=el('ul','v-list');
  for(const o of pl.L){ const li=el('li'), b=el('button'); const d=el('span','dot'); d.style.background=o.role==='gate'?'#5b4a3a':'#8a2f24'; b.append(d, el('span','nm',o.name), el('span','ty',ROLE_LABEL[o.role]||'')); b.setAttribute('aria-current',String(cySel===o));
    b.onclick=()=>{ cySel=o; cyView.x=o.x; cyView.y=o.y; cyView.z=Math.max(cyView.z,1.8); cyPanel(); cyDirty=true; }; li.append(b); ul.append(li); }
  lists.append(ul);
}
function renderCityExport(pl, size=1600, ratio=1){ const can=document.createElement('canvas'); can.width=can.height=Math.round(size*ratio); const c=can.getContext('2d'); c.setTransform(ratio,0,0,ratio,0,0); const keep=pl.img; if(ratio>1){ if(!pl.imgHi) pl.imgHi=renderCityImage(pl,2.4); pl.img=pl.imgHi; } try{ drawCityTo(c,size,size,pl,500,500,1,size/1000*.98,null,true); } finally { pl.img=keep; } return can; }
$('cyExport').onclick=async()=>{ if(!CITY) return; toast('Préparation de l’image…'); const can=renderCityExport(CITY,2000); const blob=await new Promise(r=>can.toBlob(r,'image/png'));
  let dl=null; try{ if(window.claude && typeof window.claude.use==='function') dl=await window.claude.use('downloads'); }catch(e){}
  if(dl){ try{ await dl.save({filename:'Plan de '+CITY.ct.name.replace(/[\\/:*?"<>|]/g,'')+'.png', data:blob}); toast('Plan enregistré'); }catch(e){ if(!e||e.code!=='declined') toast('Le plan n’a pas pu être enregistré'); } }
  else localSave(blob, 'Plan de '+CITY.ct.name.replace(/[\\/:*?"<>|]/g,'')+'.png'); };
