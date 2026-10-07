/* Atlas des ciels imaginaires — Civilisations détaillées, menu Monde, calendrier par peuple
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ================= civilisations détaillées ================= */
const ERAS=[
  ['l’âge de la pierre polie','Villages fortifiés, outils de pierre et de cuivre, premiers cercles de pierres alignés sur les levers du soleil.'],
  ['l’âge du bronze','Premières cités, écriture naissante sur tablettes, prêtres-astronomes qui tiennent le calendrier.'],
  ['l’âge du fer','Royaumes guerriers, routes pavées, forges et premières monnaies.'],
  ['un âge classique','Philosophes, grandes bibliothèques et observatoires où l’on mesure la course des astres.'],
  ['un âge féodal','Châteaux, ordres de chevaliers, cathédrales et longues querelles de succession.'],
  ['un âge des voiles','Grandes navigations, cartes précises, premières lunettes astronomiques.'],
  ['un âge des lumières','Imprimerie, sciences naturelles, horloges mécaniques et académies savantes.']];
const REGIMES=[
  {n:'un royaume', t:['le roi','la reine'], short:'Royaume'},
  {n:'un empire', t:['l’empereur','l’impératrice'], short:'Empire'},
  {f:1, n:'une république marchande', t:['le doge','la doyenne des guildes'], short:'République marchande'},
  {f:1, n:'une confédération de clans', t:['le grand chef','la grande cheffe'], short:'Confédération de clans'},
  {f:1, n:'une théocratie des étoiles', t:['le Grand Astrologue','la Grande Voyante'], short:'Théocratie'},
  {n:'un conseil des sages', t:['le Doyen','la Doyenne'], short:'Conseil des sages'},
  {f:1, n:'une ligue de cités-États', t:['le premier consul','la première consule'], short:'Ligue de cités'}];
const LANG_ADJ={celeste:'savante et harmonieuse', nordique:'rude, aux consonnes fortes', ancien:'chantante et gutturale', elfique:'douce et fluide'};
const EXTRA_TRAITS=['d’habiles tisserands, dont les étoffes brodées de constellations se vendent jusqu’au bout du monde','des verriers réputés, qui taillent les meilleures lentilles d’observation','des musiciens qui accordent leurs instruments sur les phases des lunes','des bâtisseurs de hautes tours d’observation','des brasseurs, dont la bière des moissons est célèbre','des cartographes méticuleux','des herboristes qui cueillent leurs plantes selon les astres','des conteurs, qui gardent en mémoire des milliers de vers'];
const HOSPITALITY=['Refuser le pain et le sel à un voyageur porte malheur pendant sept lunes.','Tout invité reçoit une pierre gravée de sa constellation de naissance.','On ne parle jamais d’affaires avant d’avoir partagé un repas.','Un étranger peut demander l’asile pendant trois nuits sans avoir à se justifier.'];
const FUNERAL=['Leurs morts sont brûlés face à l’horizon est, pour rejoindre {fig} à son lever.','Ils enterrent leurs morts sous des tertres orientés vers {cn}.','Les défunts sont confiés à la mer sur de petites barques éclairées d’une lanterne.','Chaque défunt reçoit le nom d’une étoile faible, que sa famille salue chaque année.'];
function peopleRng(p, tag){ return mulberry32(hashStr(P.seed+'|civ|'+P.wvar+'|'+p.key+'|'+tag)); }
function describePeople(p, stat){
  const r=peopleRng(p,'desc'), others=world.peoples.list;
  const reg=REGIMES[Math.floor(r()*REGIMES.length)], fem=r()<.5;
  const S=STYLES[p.style];
  const ruler=`${reg.t[fem?1:0]} ${cap(starName(r,S,true))}${r()<.5?' '+ROMAN[Math.floor(r()*5)]:''}`;
  let eraI = Math.floor(r()*4) + (stat.coast>.3?1:0) + (stat.cells>4000?1:0) + (reg.short==='République marchande'?1:0); eraI=clamp(eraI,0,ERAS.length-1);
  const density = 150+ r()*450 + eraI*180;
  const popN = Math.max(2000, Math.round(stat.hab*density*.8/1000)*1000);
  const pop = popN>=1e6 ? `environ ${fr(popN/1e6, popN<1e7?1:0)} ${popN<2e6?'million':'millions'} d’habitants` : `environ ${fr(Math.round(popN/1000)*1000,0)} habitants`;
  const era0 = 300+Math.floor(r()*1400);
  const tr=[];
  const reg_ = n => (world.places.find(q=>q.kind==='region' && q.biome===n && peopleAt(cellOf(q.lon,q.lat))===p.key)||{}).name;
  const mt = (world.places.find(q=>q.kind==='mountains' && peopleAt(cellOf(q.lon,q.lat))===p.key)||{}).name;
  const bright = sky.stars.filter(s=>s.kind==='star' && !s.fobj && s.name).sort((a,b)=>a.mag-b.mag);
  const guide = bright[Math.floor(r()*Math.min(5,bright.length))];
  if(stat.coast>.25) tr.push(`Des marins réputés, qui naviguent la nuit en se guidant sur ${guide?guide.name:'les étoiles'}.`);
  if(stat.b.mountain>.08 || mt) tr.push(`Des mineurs et des forgerons, qui creusent ${mt?'les '+mt:'leurs montagnes'} à la recherche de métal.`);
  if(stat.b.desert>.15) tr.push(`Des caravaniers qui traversent ${reg_('desert')||'le désert'} de nuit, pour éviter la chaleur.`);
  if(stat.b.forest>.2) tr.push(`Des chasseurs et des bûcherons, qui vivent en lisière de ${reg_('temperate')||reg_('taiga')||reg_('jungle')||'grandes forêts'}.`);
  if(stat.b.plain>.25) tr.push('Des éleveurs et des cavaliers, maîtres des grandes plaines.');
  if(stat.b.cold>.2) tr.push('Un peuple endurant, habitué aux longs hivers et aux nuits interminables.');
  tr.push(cap(pick(r,EXTRA_TRAITS))+'.');
  // voisins
  const rel=[...stat.neigh].map(k=>{ const o=others[k]; const h=hashStr([Math.min(k,p.key),Math.max(k,p.key),P.seed].join('|'))%3; return {o, kind:['alliés','rivaux','partenaires commerciaux'][h]}; });
  // histoire
  const r2=peopleRng(p,'hist'), hist=[];
  const founder=cap(starName(r2,S,true));
  hist.push([1, `Fondation de ${p.capital?p.capital.name:'leur première cité'} par ${founder}, que les légendes disent guidé par ${guide?guide.name:'une étoile'}.`]);
  const evs=[
    ()=>`Unification des tribus sous ${cap(starName(r2,S,true))} ${pick(r2,['le Grand','la Sage','le Fondateur','l’Aveugle'])}.`,
    ()=>`Construction du grand observatoire de ${pick(r2,p.cities).name}.`,
    ()=>rel.length?`Guerre contre ${pick(r2,rel).o.name}, qui dure ${3+Math.floor(r2()*40)} ans.`:'Grande famine après trois étés sans pluie.',
    ()=>rel.length?`Traité de paix et d’échanges avec ${pick(r2,rel).o.name}.`:'Premières routes commerciales vers les îles.',
    ()=>`Une grande épidémie décime ${pick(r2,p.cities).name}.`,
    ()=>`Fondation de ${pick(r2,p.cities).name}.`,
    ()=>`Leurs astronomes établissent le calendrier des ${p.name.replace(/^les /,'')}.`,
    ()=>`Un hiver de trois ans, que les chroniques appellent « la Longue Nuit ».`,
    ()=>`Une comète traverse le ciel pendant quarante nuits ; on y voit la fin d’une dynastie.`];
  let y=1; const picks=shuffle(r2,evs).slice(0,3+Math.floor(r2()*2));
  for(const e of picks){ y+=Math.floor(60+r2()*((era0-y)/(picks.length+1))); if(y>=era0-20) break; hist.push([y, e()]); }
  hist.push([era0, `Aujourd’hui, ${reg.n} ${reg.f?'gouvernée':'gouverné'} par ${ruler}.`]);
  // coutumes
  const r3=peopleRng(p,'cust'), cust=[];
  const zc = sky.consts.length ? sky.consts.reduce((a,c,ci)=>sky.stars[c.alpha].mag<sky.stars[sky.consts[a].alpha].mag?ci:a,0) : -1;
  const cnz = zc>=0 ? getCN(p,zc) : null;
  const moons=world.frame.moons;
  if(guide) cust.push(`Chaque année, au retour de ${guide.name} dans le ciel de l’aube, ils allument des feux sur toutes les collines.`);
  if(moons.length) cust.push(`Les mariages se célèbrent à la pleine lune de ${pick(r3,moons).name}.`);
  if(cnz) cust.push(`Les enfants reçoivent le nom de la constellation sous laquelle ils sont nés ; ceux de ${cnz.name} passent pour ${pick(r3,['têtus','chanceux','rêveurs','courageux'])}.`);
  cust.push(pick(r3,FUNERAL).replace('{fig}', cnz?cnz.fig:'leurs ancêtres').replace('{cn}', cnz?cnz.name:'le nord'));
  cust.push(pick(r3,HOSPITALITY));
  const belief = cnz ? `Ils vénèrent ${cnz.fig}, qu’ils nomment ${cnz.name}, et qu’ils voient comme le gardien de leur peuple. Leur panthéon compte une divinité par constellation traversée par ${world.frame.suns[0].name}.` : 'Ils vénèrent les ancêtres et les forces de la nature.';
  return {reg, ruler, eraI, pop, popN, era0, traits:tr, rel, hist, cust, belief, lang:LANG_ADJ[p.style], founder};
}
function peopleStats(k){
  const w=world, st={cells:0, hab:0, coast:0, b:{mountain:0,desert:0,forest:0,plain:0,cold:0}, neigh:new Set()};
  const habW={temperate:1,grass:1,savanna:.8,jungle:.6,steppe:.6,taiga:.5,swamp:.35,desert:.2,colddesert:.2,tundra:.2};
  const map=w.peoples.map;
  for(let c=0;c<WN;c++){ if(map[c]!==k) continue; st.cells++; const bk=BKEYS[w.B[c]]; st.hab+=habW[bk]||.05;
    const i=c%WW, j=(c/WW)|0; const nb=[j*WW+((i+1)%WW), j*WW+((i+WW-1)%WW), j>0?c-WW:c, j<WH-1?c+WW:c];
    for(const q of nb){ if(w.h[q]<0){ st.coast++; break; } }
    for(const q of nb){ const o=map[q]; if(o>=0 && o!==k) st.neigh.add(o); }
    if(bk==='mountain'||bk==='peak') st.b.mountain++; else if(bk==='desert'||bk==='colddesert') st.b.desert++; else if(bk==='temperate'||bk==='taiga'||bk==='jungle') st.b.forest++; else if(bk==='grass'||bk==='steppe'||bk==='savanna') st.b.plain++; else if(bk==='tundra'||bk==='ice') st.b.cold++; }
  const n=Math.max(1,st.cells); st.coast/=n; for(const k2 in st.b) st.b[k2]/=n;
  return st;
}
function landCount(){ if(world.landN==null){ let n=0; for(let c=0;c<WN;c++) if(world.h[c]>=0) n++; world.landN=n; } return world.landN; }
function civOf(k){ return cached('civ|'+k, ()=>{ const p=world.peoples.list[k]; const st=peopleStats(k); const d=describePeople(p, st); d.stats=st; return d; }); }

/* ---------- menu Monde ---------- */
let worldHub={people:null};
function openWorldHub(){ if(sky.earth){ openWorld(); return; } worldHub.people=null; if(openSheet('panelWorld')) renderWorldHub(); else renderWorldHub(); $('panelWorld').classList.add('open'); }
function el(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!==undefined) e.textContent=txt; return e; }
function renderWorldHub(){
  const box=$('worldBody'); box.innerHTML=''; if(!world) return;
  if(worldHub.people!=null){ renderPeopleDetail(box, worldHub.people); return; }
  $('worldHubTitle').textContent=world.name;
  box.append(el('p','desc', world.desc));
  const acts=el('div','acts');
  const b1=el('button','act primary','Globe et carte'); b1.onclick=()=>{ closeSheets(); openWorld(); };
  const b2=el('button','act','Calendrier'); b2.onclick=()=>{ calPeople=null; if(openSheet('panelCal')) renderCalendar(); };
  const b3=el('button','act','Le système de '+world.frame.homeSunName); b3.onclick=()=>{ closeSheets(); openViewer({kind:'system', data:homeSystem()}); };
  const b4=el('button','act','Chronologie'); b4.onclick=()=>openChrono('planet');
  const b5=el('button','act primary','Quêtes'); b5.onclick=()=>openQuests();
  acts.append(b1,b5,b2,b4,b3); box.append(acts);
  const F=world.frame;
  const dl=el('dl','facts'); fillFacts(dl,[['Soleil', F.suns.map(s=>s.name).join(' et ')], ['Lunes', F.moons.length ? F.moons.map(m=>m.name).join(', ') : 'aucune'], ['Année', F.yearLen+' jours'], ['Tu observes depuis', D.gplace || placeName(cellOf(obsLon()*deg, obsLat()*deg))]]); box.append(dl);
  box.append(el('h3',null,'Les peuples'));
  if(!world.peoples.list.length){ box.append(el('p','hint','Aucun peuple n’habite ce monde. Augmente le réglage « Peuples » dans la vue de la planète.')); return; }
  const ul=el('ul','v-list');
  world.peoples.list.forEach((p,k)=>{ const cv=civOf(k); const li=el('li'), b=el('button');
    const d=el('span','dot'); d.style.background=p.col;
    const w=el('span'); w.style.cssText='display:flex;flex-direction:column;gap:1px;min-width:0';
    w.append(el('span','nm',cap(p.name)), Object.assign(el('span',null,`${cv.reg.short}, ${cv.pop.replace('environ ','')}`),{style:'font-size:12.5px;color:var(--ink-soft)'}));
    b.append(d,w,el('span','ty', p.capital?p.capital.name:'')); b.onclick=()=>{ worldHub.people=k; renderWorldHub(); $('panelWorld').scrollTop=0; }; li.append(b); ul.append(li); });
  box.append(ul);
  poiList(box, (world.pois||[]).filter(o=>o.kind==='poi-major'), 'Lieux légendaires');
  const nm=(world.pois||[]).filter(o=>o.kind==='poi').length; if(nm) box.append(el('p','hint',`Et ${nm} lieux remarquables à découvrir sur la carte (petits losanges dorés).`));
}
function poiList(box, list, title){
  if(!list.length) return; box.append(el('h3',null,title)); const ul=el('ul','v-list');
  for(const o of list){ const li=el('li'), b=el('button'); const d=el('span','dot'); d.style.background=o.kind==='poi-major'?'#f0c14b':'#e6cf94';
    const w=el('span'); w.style.cssText='display:flex;flex-direction:column;gap:1px;min-width:0';
    w.append(el('span','nm',o.name), Object.assign(el('span',null,o.hook),{style:'font-size:12.5px;color:var(--ink-soft);line-height:1.35'}));
    b.append(d,w,el('span','ty',o.danger)); b.onclick=()=>{ closeSheets(); openWorld(); wView.glon=o.lon; wView.glat=clamp(o.lat,-1.2,1.2); wView.mcx=o.lon; wView.mcy=clamp(o.lat,-.8,.8); wSel={lon:o.lon, lat:o.lat, c:o.cell, poi:o}; wPanel(); wDirty=true; }; li.append(b); ul.append(li); }
  box.append(ul);
}
function renderPeopleDetail(box, k){
  const p=world.peoples.list[k], cv=civOf(k);
  $('worldHubTitle').textContent=cap(p.name);
  const back=el('button','act','Tous les peuples'); back.onclick=()=>{ worldHub.people=null; renderWorldHub(); }; box.append(back);
  const sub=el('p','sub', `${cap(cv.reg.n)}, capitale ${p.capital?p.capital.name:'inconnue'}`); sub.style.marginTop='12px'; box.append(sub);
  const dl=el('dl','facts'); fillFacts(dl,[['Population', cv.pop], ['Régime', cv.reg.short], ['Dirigeant', cap(cv.ruler)], ['Époque', cap(ERAS[cv.eraI][0])], ['Langue', cv.lang], ['Territoire', `${fr(cv.stats.cells/landCount()*100,1)} % des terres émergées`], ['Voisins', cv.rel.length ? cv.rel.map(r=>`${r.o.name} (${r.kind})`).join(', ') : 'aucun, isolés par la mer']]); box.append(dl);
  const acts=el('div','acts');
  const a1=el('button','act primary','Observer depuis '+(p.capital?p.capital.name:'leur capitale')); a1.onclick=()=>{ if(!p.capital) return; setObs(p.capital.lat/deg, p.capital.lon/deg); D.gplace=p.capital.name; closeSheets(); setMode('pov'); applyTime(); updateLocation(); syncTime(); toast('Tu observes depuis '+p.capital.name); };
  const a2=el('button','act','Leur calendrier'); a2.onclick=()=>{ calPeople=k; calCache=null; if(openSheet('panelCal')) renderCalendar(); };
  const a3=el('button','act','Voir sur la carte'); a3.onclick=()=>{ closeSheets(); openWorld(); if(p.capital){ wView.glon=p.capital.lon; wView.glat=clamp(p.capital.lat,-1.2,1.2); wView.mcx=p.capital.lon; wView.mcy=clamp(p.capital.lat,-.8,.8); wSel={lon:p.capital.lon, lat:p.capital.lat, c:p.capital.cell, city:p.capital}; wPanel(); wDirty=true; } };
  const a4=el('button','act primary','Carte du pays'); a4.onclick=()=>openCountryMap(k);
  const a5=el('button','act','Plan de la capitale'); a5.onclick=()=>{ if(p.capital) openCityPlan(p.capital,k); };
  const a6=el('button','act','Chronologie'); a6.onclick=()=>openChrono('civ',k);
  acts.append(a4,a5,a1,a2,a3,a6); box.append(acts);
  box.append(el('h3',null,'Époque et civilisation'), el('p','desc', `Ils vivent ${ERAS[cv.eraI][0]}. ${ERAS[cv.eraI][1]}`));
  box.append(el('h3',null,'Histoire'));
  for(const [y,t] of cv.hist){ const d=el('p','desc'); d.style.marginBottom='6px'; const b=el('b',null,`An ${y}. `); b.style.fontWeight='600'; d.append(b, document.createTextNode(t)); box.append(d); }
  box.append(el('h3',null,'Caractéristiques')); for(const t of cv.traits) box.append(Object.assign(el('p','desc',t),{style:'margin-bottom:6px'}));
  box.append(el('h3',null,'Coutumes')); for(const t of cv.cust) box.append(Object.assign(el('p','desc',t),{style:'margin-bottom:6px'}));
  box.append(el('h3',null,'Croyances et ciel'), el('p','desc', cv.belief));
  const saveCP=calPeople; calPeople=k; calCache=null; const cal=computeCalendar(); calPeople=saveCP; calCache=null;
  if(cal && cal.months.length) box.append(el('p','desc', `Leur année compte ${cal.Y} jours et ${cal.months.length} mois : ${cal.months.map(m=>getCN(p,m.ci).name).join(', ')}. Ils comptent les années depuis la fondation de ${p.capital?p.capital.name:'leur capitale'} : nous sommes en l’an ${cv.era0+(view.year||1)-1}.`));
  poiList(box, (world.pois||[]).filter(o=>o.people===k), 'Lieux remarquables sur leurs terres');
  box.append(el('h3',null,'Cités'));
  const ul=el('ul','v-list');
  for(const ct of p.cities){ const li=el('li'), b=el('button'); const d=el('span','dot'); d.style.background=p.col;
    b.append(d, el('span','nm',ct.name), el('span','ty', ct.kind==='capital'?'Capitale':'Observer d’ici'));
    b.onclick=()=>{ setObs(ct.lat/deg, ct.lon/deg); D.gplace=ct.name; closeSheets(); setMode('pov'); applyTime(); updateLocation(); syncTime(); toast('Tu observes depuis '+ct.name); };
    li.append(b); ul.append(li); }
  box.append(ul);
}
$('btnWorld').onclick=()=>openWorldHub();

/* ---------- calendrier par peuple ---------- */
let calPeople=null;
function calPeopleObj(){ if(calPeople===-1) return null; if(calPeople!=null && world && world.peoples && world.peoples.list[calPeople]) return world.peoples.list[calPeople]; return localPeople(); }
function fillCalPeopleSelect(){
  const sel=$('calPeople'); const has = !sky.earth && !sky.surface && world && world.peoples && world.peoples.list.length;
  $('calPeopleRow').hidden=!has; if(!has) return;
  sel.innerHTML=''; const o0=el('option',null,'Le peuple d’où j’observe'); o0.value='auto'; const o1=el('option',null,'Le catalogue savant'); o1.value='-1'; sel.append(o0,o1);
  world.peoples.list.forEach((p,k)=>{ const o=el('option',null,cap(p.name)); o.value=String(k); sel.append(o); });
  sel.value = calPeople==null ? 'auto' : String(calPeople);
}
$('calPeople').onchange=e=>{ const v=e.target.value; calPeople = v==='auto'?null:+v; calCache=null; renderCalendar(); syncTime(); };
