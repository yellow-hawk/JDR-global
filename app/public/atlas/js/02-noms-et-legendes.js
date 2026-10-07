/* Atlas des ciels imaginaires — Noms des étoiles et légendes des constellations
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ---------- noms ---------- */
const STYLES = {
  celeste:{on:['c','d','l','m','n','r','s','t','v','ph','th','qu','x','b','sc'],v:['a','e','i','o','u','ae','ia','e','a'],star:['a','ia','is','on','ar','ea','ix']},
  nordique:{on:['sk','h','br','th','v','gr','r','s','k','fj','d','st','hv','b'],v:['a','e','i','o','u','y','ö','å','a'],star:['ir','ar','un','heim','gard','rún','dis','ald']},
  ancien:{on:['k','h','z','sh','r','m','n','b','d','f','q','j','t'],v:['a','i','u','a','e','aa','ai'],star:['ah','ib','ar','im','un','an','ak'],prefix:'Al '},
  elfique:{on:['l','th','m','n','s','f','gl','c','r','v','ar','el'],v:['a','e','i','ë','ai','ie','ó','ú','a'],star:['iel','wen','ion','ath','ril','dor','las']}
};
const GREEK = ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ'];
const LATIN_END = [['a','ae'],['us','i'],['um','i'],['is','is'],['on','onis'],['ax','acis']];
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
function stem(r,st,syl){let w='';for(let i=0;i<syl;i++){w+=pick(r,st.on)+pick(r,st.v)}return w}
function constName(r,st){
  let base = (stem(r,st,1+(r()<.5?1:0)) + pick(r,st.on)).replace(/(.)\1\1/g,'$1$1');
  const [n,g] = pick(r,LATIN_END);
  return {name:cap(base+n), gen:cap(base+g)};
}
function starName(r,st,noPrefix){
  let w = stem(r,st,1+(r()<.45?1:0)) + pick(r,st.star);
  w = cap(w.replace(/([aeiouyëó])\1+/g,'$1'));
  if(st.prefix && !noPrefix && r()<.55) w = st.prefix + w;
  return w;
}

/* ---------- légendes ---------- */
const FIGURES = [['la Fileuse','h'],['le Veilleur','h'],['le Cerf blanc','a'],['la Barque','o'],['le Serpent de brume','a'],['la Couronne brisée','o'],['le Forgeron','h'],['la Lanterne','o'],['le Loup gris','a'],['la Harpe','o'],['le Héron','a'],['la Balance','o'],['le Chariot','o'],['la Sœur aînée','h'],['le Roi noyé','h'],['la Clé','o'],['le Bélier d’or','a'],['la Méduse','a'],['l’Archer','h'],['l’Ancre','o'],['le Tisserand','h'],['la Chouette','a'],['le Dragon endormi','a'],['la Source','o'],['le Pèlerin','h'],['la Flèche','o'],['le Grand Chêne','o'],['la Tortue','a'],['le Masque','o'],['la Cloche','o'],['le Renard','a'],['la Plume','o'],['le Bouclier','o'],['la Baleine','a'],['le Sablier','o'],['la Danseuse','h'],['le Phare','o'],['la Mante','a'],['l’Oiseau de feu','a'],['le Puits','o'],['la Reine des marées','h'],['le Lynx','a'],['le Navire fantôme','o'],['le Chasseur','h'],['la Licorne','a'],['la Faux','o']];
const deArt = f => f.startsWith('le ') ? 'du '+f.slice(3) : 'de '+f;
const aArt = f => f.startsWith('le ') ? 'au '+f.slice(3) : 'à '+f;
const PARTV = {
  h:{center:['le cœur'], top:['la tête','le front'], bottom:['le pied','le talon'], ends:['le genou','le coude','la main tendue'], up:['l’épaule','la nuque'], low:['la ceinture','la hanche'], mid:['le flanc']},
  a:{center:['le cœur'], top:['la tête','l’oreille'], bottom:['la patte','le sabot'], ends:['la queue','le museau','la patte arrière','l’aile'], up:['le dos','l’échine'], low:['le ventre'], mid:['le flanc']},
  o:{center:['le centre'], top:['le sommet'], bottom:['la base'], ends:['la pointe','l’extrémité','l’autre pointe'], up:['le bord supérieur'], low:['le bord inférieur'], mid:['le flanc']}
};
const PART_OVERRIDE = {
  'la Barque':{top:['le mât'], bottom:['la quille'], ends:['la proue','la poupe','le gouvernail']},
  'le Navire fantôme':{top:['la vigie'], bottom:['la quille'], ends:['la proue','la poupe','la voile déchirée']},
  'la Lanterne':{center:['la flamme'], top:['la poignée']},
  'la Flèche':{ends:['la pointe','l’empennage']},
  'le Phare':{top:['le feu'], bottom:['le rocher']},
  'la Harpe':{top:['la crosse'], ends:['la corde la plus aiguë','la corde la plus grave']},
  'le Sablier':{center:['le goulot']},
  'la Couronne brisée':{ends:['le fleuron brisé','le premier fleuron','le dernier fleuron']},
  'le Grand Chêne':{top:['la cime'], bottom:['la racine'], ends:['la plus haute branche','la branche basse','la branche morte']},
  'la Clé':{top:['l’anneau'], ends:['le panneton']},
  'la Cloche':{top:['l’anse'], center:['le battant']},
  'l’Ancre':{top:['l’organeau'], ends:['la patte gauche','la patte droite']},
  'le Puits':{top:['la margelle'], bottom:['le fond']},
  'la Faux':{ends:['la lame','le manche']},
  'la Balance':{center:['le fléau'], ends:['le plateau gauche','le plateau droit']},
  'le Chariot':{ends:['le timon','la roue arrière','la roue avant']},
  'le Serpent de brume':{top:['la tête'], ends:['la queue','les crochets']},
  'la Méduse':{top:['l’ombrelle'], ends:['un tentacule','le plus long tentacule']},
  'la Baleine':{top:['le souffle'], ends:['la queue','la nageoire','la gueule']},
  'l’Oiseau de feu':{ends:['l’aile gauche','l’aile droite','la longue queue']},
  'la Chouette':{ends:['l’aile','les serres']},
  'le Héron':{ends:['le bec','la longue patte']}
};
const CULTURES = {
  celeste:['les astronomes du Haut-Plateau','les scribes des anciens observatoires','les bergers des collines','les moines des tours blanches'],
  nordique:['les marins des fjords','les skaldes du Nord','les chasseurs des glaces','les bûcherons des forêts noires'],
  ancien:['les caravaniers du désert','les prêtres des cités de sable','les astrologues des palais','les gardiens des puits'],
  elfique:['les veilleurs des forêts','les chanteurs des bois anciens','les gardiens des sources','les tisseurs de lune']
};
const LANGS = {celeste:'la langue savante des observatoires', nordique:'la langue des skaldes', ancien:'la langue des caravaniers', elfique:'la langue des veilleurs'};
const C_MEAN = ['la patience','le chemin du retour','la promesse tenue','le premier feu','ce qui veille','le fil du temps','la maison des vents','l’hiver qui vient','la mémoire','le passage','la mer calme','la dernière récolte','le serment','l’aube lente','la dette','le long voyage','la colère des rois','le chant perdu','la porte du nord','le pardon'];
const C_STORY = [
  'Selon la légende, les dieux l’ont placée au ciel pour guider les voyageurs égarés.',
  'On raconte qu’elle apparut la nuit où la première ville fut fondée.',
  'Ses {n} étoiles seraient les pas d’un héros qui n’est jamais rentré chez lui.',
  'Autrefois, son passage au plus haut du ciel annonçait le retour des oiseaux migrateurs.',
  'Les conteurs disent qu’elle fut dessinée par une reine qui ne parvenait pas à dormir.',
  'Chacune de ses {n} étoiles représenterait une promesse faite à la mer.',
  'Elle aurait été clouée au ciel pour punir un orgueil trop grand.',
  'Les anciens y lisaient la durée des hivers à venir.',
  'On dit qu’elle se lève plus tôt les années de grande famine.',
  'Les enfants apprennent son nom avant celui des saisons.',
  'Un vieux chant affirme qu’elle se rallume chaque fois qu’un serment est tenu.',
  'Les navigateurs la saluent en quittant le port, par superstition.',
  'On croyait que ses {n} étoiles étaient les feux de camp d’une armée disparue.',
  'Les poètes la surnomment la « figure sans repos », car elle semble tourner plus vite que les autres.',
  'Dans les récits les plus anciens, elle gardait l’entrée du pays des morts.',
  'On lui attribuait le pouvoir d’apaiser les tempêtes, et l’on gravait sa forme sur la proue des bateaux.'
];
const S_MEAN_WARM = ['la braise','le fer rouge','la graine de feu','le cœur battant','la forge','l’ambre','la lampe du berger','le vin du soir','la rouille du ciel'];
const S_MEAN_COLD = ['la perle froide','la flamme pâle','la sentinelle','l’œil du chasseur','le givre','la lame','la source claire','la larme du roi','le clou du ciel'];
const S_MEAN_ANY = ['la fidèle','la voyageuse','la messagère','la gardienne du seuil','celle qui ne dort pas','la promesse','l’éclaireuse','la patiente'];
const S_MEAN_BRIGHT = ['la première lueur','la reine de la nuit','le grand phare'];
const S_MEAN_FAINT = ['la lointaine','la timide','le murmure'];
const S_LORE = [
  [s=>s.rank<=3, 'Les enfants apprennent à la reconnaître avant toutes les autres.'],
  [s=>s.t>.45, 'Sa lumière rougeâtre la faisait associer à la guerre et aux forges.'],
  [s=>s.t>.45, 'On disait que lorsqu’elle rougissait davantage, l’été serait brûlant.'],
  [s=>s.t<-.3, 'Sa lueur bleutée passait pour porter chance aux marins.'],
  [s=>s.t<-.3, 'On la croyait faite de glace, et l’on disait qu’elle fondait un peu chaque printemps.'],
  [s=>s.mag>1.5, 'Discrète, elle ne se remarque que par les nuits les plus pures ; les anciens s’en servaient pour tester leur vue.'],
  [s=>s.mag<1, 'Son éclat est tel qu’on l’aperçoit avant même la fin du crépuscule.'],
  [()=>true, 'On disait que la voir scintiller fort annonçait la pluie.'],
  [()=>true, 'Son lever marquait autrefois le début des moissons.'],
  [()=>true, 'Les amants se donnaient rendez-vous sous sa lumière.'],
  [()=>true, 'Les anciens y voyaient l’âme d’un gardien disparu.'],
  [()=>true, 'Elle servait de repère aux caravanes perdues.'],
  [()=>true, 'Un vieux proverbe dit qu’elle se voile quand on ment.'],
  [()=>true, 'Les forgerons attendaient son passage pour tremper leurs lames.'],
  [()=>true, 'On lui adressait des vœux avant les longs voyages.'],
  [()=>true, 'Les bergers comptaient les nuits jusqu’à son retour au-dessus des collines.'],
  [()=>true, 'Une chanson populaire raconte qu’elle fut autrefois une princesse changée en lumière.'],
  [()=>true, 'Les astronomes s’en sont longtemps servis pour régler leurs calendriers.'],
  [()=>true, 'On raconte qu’un voleur tenta de la décrocher du ciel et qu’il erre encore dans les collines.']
];
const RELS = {
  'h-h':['La légende dit que {a} veille sur {b}.','{A} et {b} seraient deux compagnons séparés par une vieille querelle.','{A} tend la main vers {b} sans jamais l’atteindre.'],
  'h-a':['{A} traque {b} à travers le ciel.','{A} aurait apprivoisé {b} au premier âge du monde.'],
  'a-h':['{A} fuit {b} depuis la nuit des temps.','{A} veille sur le sommeil {deB}.'],
  'h-o':['On dit que {a} a perdu {b} en montant au ciel.','{A} porte {b} jusqu’au bout de la nuit.'],
  'o-h':['On dit que {a} appartient {aB}.','{A} aurait été un présent fait {aB}.'],
  'a-a':['{A} poursuit {b} sans jamais l’atteindre.','{A} et {b} se disputent le même coin de ciel.'],
  'a-o':['{A} garde {b} jalousement.','{A} tourne autour {deB} sans oser l’approcher.'],
  'o-a':['On raconte que {a} servait à capturer {b}.','{A} éclaire le chemin {deB}.'],
  'o-o':['{A} et {b} seraient l’œuvre du même artisan.','Les anciens associaient {a} et {b} dans les mêmes rites.']
};
function relText(A,B,r){
  const tpl = pick(r, RELS[A.cat+'-'+B.cat]);
  return tpl.replace('{A}',cap(A.fig)).replace('{a}',A.fig).replace('{b}',B.fig).replace('{deB}',deArt(B.fig)).replace('{aB}',aArt(B.fig));
}
function assignParts(c, stars){
  const V = Object.assign({}, PARTV[c.cat], PART_OVERRIDE[c.fig]||{});
  const used=new Set(); const take=list=>{ for(const w of list||[]) if(!used.has(w)){ used.add(w); return w; } return null; };
  const ctr=c.d; const up = Math.abs(ctr[1])>.97 ? [1,0,0] : [0,1,0];
  const e1=norm(cross(up,ctr)), e2=cross(ctr,e1);
  const dg=new Map(); c.members.forEach(j=>dg.set(j,0)); c.edges.forEach(([a,b])=>{ dg.set(a,dg.get(a)+1); dg.set(b,dg.get(b)+1); });
  const pts=c.members.map(j=>({j, u:dot(stars[j].d,e1), v:dot(stars[j].d,e2), dg:dg.get(j)}));
  const mu=pts.reduce((a,p)=>a+p.u,0)/pts.length, mv=pts.reduce((a,p)=>a+p.v,0)/pts.length;
  const rem=new Set(pts); const set=(p,w)=>{ stars[p.j].part=w; rem.delete(p); };
  pts.forEach(p=>{ stars[p.j].part=null; });
  const inner=[...rem].filter(p=>p.dg>=2);
  if(inner.length){ inner.sort((a,b)=>Math.hypot(a.u-mu,a.v-mv)-Math.hypot(b.u-mu,b.v-mv)); const w=take(V.center); if(w) set(inner[0],w); }
  if(rem.size){ const p=[...rem].sort((a,b)=>b.v-a.v)[0]; if(p.v>mv){ const w=take(V.top); if(w) set(p,w); } }
  if(rem.size && c.members.length>=4){ const p=[...rem].sort((a,b)=>a.v-b.v)[0]; if(p.v<mv){ const w=take(V.bottom); if(w) set(p,w); } }
  for(const p of [...rem].filter(p=>p.dg===1).sort((a,b)=>Math.hypot(b.u-mu,b.v-mv)-Math.hypot(a.u-mu,a.v-mv))){
    let w = c.cat==='h' ? take([p.u<mu?'la main gauche':'la main droite']) : null;
    if(!w) w=take(V.ends); if(w) set(p,w); }
  for(const p of [...rem]){ const w = take(p.v>mv ? V.up : V.low) || take(V.mid); if(w) set(p,w); else rem.delete(p); }
}
function chooseStarLore(s, r){
  const pool=[...S_MEAN_ANY, ...(s.t>.3?S_MEAN_WARM:s.t<-.15?S_MEAN_COLD:[]), ...(s.mag<.6?S_MEAN_BRIGHT:[]), ...(s.mag>1.8?S_MEAN_FAINT:[])];
  s.meaning = pick(r, pool);
  const cond = S_LORE.filter(([f],k)=>k<7 && f(s)), gen = S_LORE.filter(([f],k)=>k>=7);
  s.lore = (cond.length && r()<.65 ? pick(r,cond) : pick(r,gen))[1];
}
const LEG_EQ0 = 45*deg;
const toEq = d => { const sf=Math.sin(LEG_EQ0), cf=Math.cos(LEG_EQ0); return [d[1]*cf - d[2]*sf, d[0], d[1]*sf + d[2]*cf]; };
