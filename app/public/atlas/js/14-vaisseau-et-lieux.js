/* Atlas des ciels imaginaires — Vaisseau d'exploration et lieux remarquables
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ================= vaisseau d'exploration ================= */
const SPEEDS=[['voiles','Voiles solaires',.1],['lumiere','Vitesse de la lumière',1],['distorsion','Moteur à distorsion (×50)',50],['saut','Saut instantané',Infinity]];
const SHIP_NAMES=['l’Aube lointaine','le Sillage d’argent','le Pèlerin des étoiles','la Veilleuse','l’Horizon','la Comète errante','la Lanterne','le Chant des sphères'];
let travel=null;
function ship(){ if(!D.ship) D.ship={name:SHIP_NAMES[hashStr(P.seed)%SHIP_NAMES.length], speed:'distorsion'}; if(!D.shipLog) D.shipLog=[]; return D.ship; }
function travelTime(ly){ const sp=SPEEDS.find(s=>s[0]===ship().speed)||SPEEDS[2]; const y=ly/sp[2]; if(!isFinite(sp[2])) return 'instantané'; if(y<1/365) return fr(y*365*24,0)+' heures'; if(y<1) return fr(y*365,0)+' jours'; return fr(y, y<10?1:0)+' ans'; }
function curPos(){ return sky.vantage!=null ? starPos(sky.stars[sky.vantage]) : [0,0,0]; }
function curPlaceName(){ return sky.surface ? sky.surface.name : sky.vantage!=null ? starLabel(sky.stars[sky.vantage]) : homeName(); }
function openShip(){ if(openSheet('panelShip')) renderShip(); }
$('btnShip').onclick=openShip;
function renderShip(){
  const box=$('shipBody'); box.innerHTML=''; const sh=ship();
  $('shipTitle').textContent='Vaisseau '+cap(sh.name.replace(/^(l’|le |la )/,''));
  const cp=curPos(), dh=Math.hypot(cp[0],cp[1],cp[2]);
  box.append(el('p','desc', sky.surface ? `Tu es posé sur ${sky.surface.name}.` : sky.vantage!=null ? `Tu dérives dans l’espace près de ${curPlaceName()}, à ${fmtLy(dh)} de ${homeName()}.` : `Tu es en orbite de ${homeName()}, prêt au départ.`));
  const nr=el('div','row'); nr.innerHTML=`<label for="shipName"><span>Nom du vaisseau</span></label>`; const ni=el('input'); ni.type='text'; ni.id='shipName'; ni.value=sh.name; ni.maxLength=40; ni.onchange=()=>{ sh.name=ni.value.trim()||sh.name; renderShip(); }; nr.append(ni); box.append(nr);
  const sr=el('div','row'); sr.innerHTML=`<label for="shipSpeed"><span>Propulsion</span></label>`; const ss=el('select'); ss.id='shipSpeed';
  for(const [k,l] of SPEEDS){ const o=el('option',null,l); o.value=k; ss.append(o); } ss.value=sh.speed; ss.onchange=()=>{ sh.speed=ss.value; renderShip(); }; sr.append(ss); box.append(sr);
  const acts=el('div','acts'); acts.style.marginTop='12px';
  const b1=el('button','act primary','Carte 3D des étoiles'); b1.onclick=()=>{ closeSheets(); const sc=neighborsScene(sky.vantage); if(sc) openViewer(sc); };
  const b2=el('button','act','Explorer ce système'); b2.onclick=()=>{ closeSheets(); openViewer({kind:'system', data: sky.surface ? sky.surface.sys : sky.vantage!=null ? (sky.earth ? null : systemOfSky(sky.vantage)) : (sky.earth ? realSolarSystem() : homeSystem())}); };
  if(sky.earth && sky.vantage!=null && !sky.surface) b2.hidden=true;
  acts.append(b1,b2);
  if(sky.vantage!=null || sky.surface){ const b3=el('button','act','Rentrer vers '+homeName()); b3.onclick=()=>{ closeSheets(); if(sky.surface) exitSurface(); if(sky.vantage!=null) startTravel(null); }; acts.append(b3); }
  box.append(acts);
  box.append(el('h3',null,'Destinations proches'));
  const list=[]; for(const s of sky.stars){ if(s.kind!=='star' || (s.fobj && !s.homeStar) || s.i===sky.vantage) continue; if(s.homeStar && sky.vantage==null) continue; const p=starPos(s); if(!p) continue; list.push({s, d:Math.hypot(p[0]-cp[0],p[1]-cp[1],p[2]-cp[2])}); }
  list.sort((a,b)=>a.d-b.d);
  const ul=el('ul','v-list');
  for(const {s,d} of list.slice(0,14)){ const li=el('li'), b=el('button'); const dt=el('span','dot'); dt.style.background=rgb(s.col);
    const w=el('span'); w.style.cssText='display:flex;flex-direction:column;gap:1px;min-width:0';
    const ph=s.phys||physOf(s.i);
    w.append(el('span','nm',starLabel(s)), Object.assign(el('span',null,`${cap(ph.kind||'étoile')}, ${fmtLy(d)}`),{style:'font-size:12.5px;color:var(--ink-soft)'}));
    b.append(dt,w,el('span','ty',travelTime(d))); b.onclick=()=>startTravel(s.homeStar?null:s.i); li.append(b); ul.append(li); }
  box.append(ul);
  box.append(el('h3',null,'Journal de bord'));
  if(!D.shipLog.length) box.append(el('p','hint','Aucun voyage pour l’instant. Choisis une destination ci-dessus, ou touche une étoile dans le ciel puis « Voir le ciel depuis cette étoile ».'));
  else { const tot=D.shipLog.reduce((a,e)=>a+e.d,0); box.append(el('p','hint',`${D.shipLog.length} voyage${D.shipLog.length>1?'s':''}, ${fmtLy(tot)} parcourues.`));
    for(const e of D.shipLog.slice(-12).reverse()) box.append(Object.assign(el('p','desc',`${e.from} vers ${e.to} : ${fmtLy(e.d)}, en ${e.t}.`),{style:'margin-bottom:4px;font-size:15px'})); }
}
function startTravel(idx){
  const B = idx==null ? [0,0,0] : starPos(sky.stars[idx]); if(!B) return;
  if(sky.surface){ sky.surface=null; attachFrame(sky.earth?null:world.frame); }
  const A=curPos(), from=curPlaceName(), to= idx==null ? homeName() : starLabel(sky.stars[idx]);
  const d=Math.hypot(B[0]-A[0],B[1]-A[1],B[2]-A[2]);
  ship(); D.shipLog.push({from, to, d, t:travelTime(d)}); if(D.shipLog.length>60) D.shipLog.shift();
  closeSheets(); closeCard(); setMode('pov');
  if(reduceMotion || d<1e-6 || ship().speed==='saut'){ setVantage(idx); toast('Arrivée : '+to); return; }
  travel={A,B,idx,t0:performance.now(),dur:3000, to};
  sky.traveling=true; sky.space=true;
  computeVantage(A, sky.vantage); applyTime();
  { const t = idx==null ? sky.homeStarObj : sky.stars[idx]; if(t && t.d) aimView(t.lon, t.lat, 1200); }
  toast('En route vers '+to+' ('+fmtLy(d)+')');
}
function faceTarget(){ if(!travel) return; const t = travel.idx==null ? sky.homeStarObj : sky.stars[travel.idx]; if(!t || !t.d) return; if(camAnim){ camAnim.y1=t.lon; camAnim.p1=t.lat; } else { view.yaw=t.lon; view.pitch=clamp(t.lat,-88*deg,88*deg); } }
function stepTravel(now){
  const f=clamp((now-travel.t0)/travel.dur,0,1), e=f<.5?4*f*f*f:1-Math.pow(-2*f+2,3)/2;
  const A=travel.A, B=travel.B, pos=[A[0]+(B[0]-A[0])*e, A[1]+(B[1]-A[1])*e, A[2]+(B[2]-A[2])*e];
  if(f>=1){ const tr=travel; travel=null; sky.traveling=false; setVantage(tr.idx); toast('Arrivée : '+tr.to); return; }
  computeVantage(pos, null, travel.idx); applyTime(); if(f<.85) faceTarget(); dirty=true;
}

/* ================= lieux remarquables du monde ================= */
const DANGERS=['paisible','incertain','dangereux','mortel'];
const POI_MAJOR=[
  ['ruins','Ruines de {X}','land','Les vestiges d’une cité immense, dont les rues suivent encore le dessin de {const}.',['Sous les ruines dormirait la bibliothèque des premiers astronomes.','Chaque nuit où {star} culmine, une lumière brille dans la plus haute tour.']],
  ['observatory','Grand Observatoire de {X}','hill','Un observatoire millénaire taillé dans la roche, d’où les anciens mesuraient la course de {sun}.',['Ses instruments annonceraient une conjonction que personne n’a vue depuis mille ans.','Le dernier gardien attend un héritier capable de lire ses cartes du ciel.']],
  ['crater','Cratère de l’Étoile tombée','land','Un cratère de plusieurs lieues, creusé selon la légende par une étoile tombée de {const}.',['Des éclats de métal céleste y attirent chercheurs de fortune et fanatiques.','Rien n’y pousse, et les boussoles y deviennent folles.']],
  ['sunken','Cité engloutie de {X}','shallow','Les tours d’une cité engloutie affleurent à marée basse.',['Les pêcheurs entendent des cloches sous l’eau les nuits de pleine lune de {moon}.','Un trésor royal aurait coulé avec la ville.']],
  ['worldtree','Arbre-monde de {X}','forest','Un arbre colossal dont la cime se perd dans les nuages ; ses racines couvrent une vallée entière.',['Ses fruits ne mûrissent qu’une fois par siècle, et le prochain cycle approche.','Un peuple oublié vivrait dans ses branches.']],
  ['blacktower','Tour noire de {X}','harsh','Une tour d’obsidienne sans porte, plus ancienne que tous les royaumes.',['Ceux qui y passent la nuit reviennent avec des souvenirs qui ne sont pas les leurs.','Elle projette son ombre même les nuits sans lune.']],
  ['moontemple','Temple des lunes de {X}','coast','Un temple à ciel ouvert, dont les colonnes s’alignent sur les levers des lunes.',['Les prêtresses prédisent les marées et, dit-on, les morts.','Une lune y serait descendue autrefois pour épouser un mortel.']],
  ['stargate','Porte des étoiles de {X}','dry','Une arche de pierre isolée au milieu des sables ; à travers elle, on voit d’autres étoiles.',['Les nomades refusent d’y camper.','Certains affirment l’avoir traversée et en être revenus des années plus tard.']],
  ['volcano','Mont de feu {X}','peak','Un volcan éveillé, dont les coulées éclairent les nuits.',['Un forgeron travaillerait le métal céleste au cœur du cratère.','Ses grondements annonceraient la colère des dieux de {const}.']],
  ['maelstrom','Maelström de {X}','deep','Un tourbillon marin géant qui avale les navires imprudents.',['Au centre du tourbillon se trouverait une île que nul n’a atteinte.','Les courants y ramènent des épaves venues d’ailleurs.']]];
const POI_MED=[
  ['Ruines de {X}','land','Des murs effondrés envahis par la végétation.',['Des pilleurs y ont disparu la saison dernière.','Une inscription parle d’un trésor caché sous l’autel.']],
  ['Tour de guet de {X}','land','Une vieille tour de pierre qui surveille la région.',['Son feu d’alerte s’est rallumé tout seul.','La garnison n’a plus donné de nouvelles depuis un mois.']],
  ['Monastère de {X}','hill','Un monastère accroché à la pente, où l’on copie de vieux almanachs célestes.',['Les moines cachent un manuscrit interdit.','Un novice affirme avoir vu une étoile bouger.']],
  ['Mine abandonnée de {X}','hill','Des galeries désertées du jour au lendemain.',['Les mineurs ont percé une salle qu’ils refusent de rouvrir.','On y entend encore des coups de pioche la nuit.']],
  ['Grottes de {X}','hill','Un dédale de cavernes aux parois couvertes de peintures d’étoiles.',['Les peintures montrent des constellations qui n’existent plus.','Une créature y hiberne, et le printemps approche.']],
  ['Champ de bataille de {X}','plain','Une plaine où s’est jouée une bataille décisive ; on y trouve encore des armes rouillées.',['Les soirs de brume, les deux armées reviennent.','Un étendard royal n’a jamais été retrouvé.']],
  ['Sanctuaire de {X}','land','Un petit sanctuaire dédié à une constellation, entretenu par des pèlerins.',['L’offrande déposée chaque année a été volée.','Le gardien cherche des escortes pour un pèlerinage.']],
  ['Cercle de pierres de {X}','plain','Des menhirs dressés en cercle, alignés sur le lever de {star}.',['Au solstice, une porte s’ouvrirait au centre.','Une pierre manque, et quelqu’un paie cher pour la retrouver.']],
  ['Repaire de pirates de {X}','coast','Une crique cachée où mouillent des navires sans pavillon.',['Le capitaine recrute pour un coup audacieux.','Une carte au trésor circule dans les tavernes.']],
  ['Oasis de {X}','dry','Un îlot de palmiers et d’eau fraîche au milieu du désert.',['La source se tarit mystérieusement.','Deux clans nomades se disputent son contrôle.']],
  ['Sources chaudes de {X}','hill','Des bassins fumants réputés pour guérir les blessures.',['Les eaux auraient rendu la jeunesse à une vieille reine.','Un noble y soigne une maladie qu’il veut cacher.']],
  ['Phare en ruine de {X}','coast','Un phare éteint depuis des générations, au bord d’une falaise.',['Sa lanterne s’allume seule avant chaque naufrage.','Des contrebandiers s’en servent comme repère.']],
  ['Tombeau de {X}','land','Le tombeau d’un roi oublié, scellé par sept portes.',['La sixième porte vient d’être trouvée ouverte.','Le roi aurait été enterré avec une carte du ciel en or.']],
  ['Village maudit de {X}','wood','Un village désert où les tables sont encore mises.',['Les habitants seraient partis suivre une lumière dans la forêt.','Un enfant en est revenu, muet.']],
  ['Camp nomade de {X}','dry','Un campement de tentes qui se déplace au rythme des saisons.',['Les nomades échangent des nouvelles contre des étoffes.','Leur chaman lit l’avenir dans la course des lunes.']],
  ['Épave du {X}','shallow','La coque d’un grand navire échoué sur les hauts-fonds.',['Sa cale serait encore pleine.','Le navire portait un passager qu’on n’a jamais retrouvé.']],
  ['Geysers de {X}','cold','Des colonnes de vapeur qui jaillissent de la roche gelée.',['Leur rythme annoncerait les tremblements de terre.','Un ermite y étudie le feu sous la glace.']],
  ['Statue colossale de {X}','land','Une statue haute comme une tour, dont le visage a été effacé.',['Elle a tourné la tête d’un degré depuis l’an dernier.','Son socle porte un nom interdit.']],
  ['Forêt pétrifiée de {X}','dry','Des arbres changés en pierre, figés depuis des millénaires.',['Les érudits y cherchent la trace d’une catastrophe céleste.','On y trouve parfois des fossiles de créatures inconnues.']],
  ['Nid de wyvernes de {X}','peak','Des falaises où nichent des wyvernes.',['Un œuf de wyverne vaut une fortune.','Les bergers perdent des bêtes chaque nuit.']],
  ['Bibliothèque oubliée de {X}','land','Une bibliothèque à moitié enterrée, pleine de parchemins moisis.',['On y aurait vu un catalogue d’étoiles plus ancien que le monde.','Un érudit y a disparu en cherchant un livre précis.']],
  ['Marais des brumes de {X}','wood','Un marais noyé de brouillard, où l’on se perd facilement.',['Des feux follets guident les voyageurs vers leur perte.','Une sorcière y échange des remèdes contre des souvenirs.']]];
function poiNeed(tag, w, c){
  const hh=w.h[c], bk=BKEYS[w.B[c]];
  switch(tag){
    case 'land': return hh>=0 && hh<.6 && bk!=='ice';
    case 'hill': return hh>=.35 && hh<.62;
    case 'peak': return hh>=.6;
    case 'forest': return ['temperate','taiga','jungle'].includes(bk);
    case 'wood': return ['temperate','taiga','jungle','swamp'].includes(bk);
    case 'harsh': return hh>=0 && (['tundra','colddesert','ice'].includes(bk) || hh>.5);
    case 'coast': return hh>=0 && hh<.3 && w.dist[c]<=1;
    case 'dry': return ['desert','colddesert','steppe','savanna'].includes(bk);
    case 'plain': return ['grass','steppe','savanna','tundra'].includes(bk);
    case 'cold': return ['tundra','ice','taiga'].includes(bk) || (hh>.5 && w.T[c]<0);
    case 'shallow': return hh<0 && hh>-.12;
    case 'deep': return hh<-.45;
  }
  return false;
}
function poiFill(t, r, ctxInfo){
  return t.replace(/\{X\}/g, ctxInfo.X).replace(/\{const\}/g, ctxInfo.cons).replace(/\{star\}/g, ctxInfo.star).replace(/\{moon\}/g, ctxInfo.moon).replace(/\{sun\}/g, ctxInfo.sun);
}
function makeWorldPOIs(w){
  const r=rngFor('poi|'+P.wvar), out=[];
  const cells=[]; for(let c=0;c<WN;c+=3) cells.push(c);
  const dirC=c=>dirOf(cellLon(c%WW), cellLat((c/WW)|0));
  const bright=sky.stars.filter(s=>s.kind==='star'&&!s.fobj&&s.name).sort((a,b)=>a.mag-b.mag).slice(0,8);
  const info=c=>{ const pk=w.peoples?w.peoples.map[c]:-1, pp=pk>=0?w.peoples.list[pk]:null; const S=STYLES[pp?pp.style:pick(r,Object.keys(STYLES))];
    const ci=Math.floor(r()*sky.consts.length); const cn = pp ? getCN(pp,ci).name : (sky.consts[ci]?sky.consts[ci].name:'la voûte');
    return {X:cap(starName(r,S,true)), cons:cn, star:(bright.length?pick(r,bright).name:'l’étoile du soir'), moon:(w.frame&&w.frame.moons.length?pick(r,w.frame.moons).name:'la lune'), sun:(w.frame?w.frame.suns[0].name:'le soleil'), pk}; };
  const place=(tag, minSep)=>{ for(let t=0;t<400;t++){ const c=cells[Math.floor(r()*cells.length)]; if(!poiNeed(tag,w,c)) continue; const d=dirC(c); if(out.some(o=>dot(d,o.d)>Math.cos(minSep))) continue; return c; } return -1; };
  const nMaj=3+Math.floor(r()*5), types=shuffle(r,POI_MAJOR);
  for(const [id,nm,tag,txt,hooks] of types){ if(out.length>=nMaj) break; const c=place(tag,18*deg); if(c<0) continue; const I=info(c);
    out.push({kind:'poi-major', type:id, name:poiFill(nm,r,I), cell:c, d:dirC(c), lon:cellLon(c%WW), lat:cellLat((c/WW)|0), desc:poiFill(txt,r,I), hook:poiFill(pick(r,hooks),r,I), danger:DANGERS[1+Math.floor(r()*3)], people:I.pk, size:5}); }
  const nMed=28+Math.floor(r()*7);
  for(let t=0;t<nMed*4 && out.length<nMaj+nMed;t++){ const [nm,tag,txt,hooks]=pick(r,POI_MED); const c=place(tag,4.5*deg); if(c<0) continue; const I=info(c);
    out.push({kind:'poi', type:tag, name:poiFill(nm,r,I), cell:c, d:dirC(c), lon:cellLon(c%WW), lat:cellLat((c/WW)|0), desc:poiFill(txt,r,I), hook:poiFill(pick(r,hooks),r,I), danger:DANGERS[Math.floor(r()*4)], people:I.pk, size:4}); }
  return out;
}
