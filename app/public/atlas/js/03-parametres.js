/* Atlas des ciels imaginaires — Données physiques et paramètres (génération, affichage, état)
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";
/* ---------- données physiques ---------- */
const PTYPES = {
  lave:{label:'Planète de lave', kind:'lava', cols:['#2b120c','#5a1e10','#ff7a2a'], sky:[255,150,110]},
  brulee:{label:'Planète rocheuse brûlée', kind:'rock', cols:['#6d5a4b','#8b7765','#4a3c32'], sky:[230,210,190]},
  desert:{label:'Planète désertique', kind:'rock', cols:['#c89a5a','#e0b877','#9c6d3a'], sky:[255,215,160]},
  tempere:{label:'Planète tempérée', kind:'terra', cols:['#2e6aa0','#4a7f45','#e8eef2'], sky:[190,215,255]},
  ocean:{label:'Planète océan', kind:'terra', cols:['#1c5a94','#2f7fbf','#e6f0f6'], sky:[170,205,255]},
  glace:{label:'Planète glacée', kind:'rock', cols:['#cfe3ee','#a9c6d8','#f4fbff'], sky:[230,240,255]},
  gazeuse:{label:'Géante gazeuse', kind:'gas', cols:['#d8b98a','#b8865a','#ecdcbc','#9c6a44'], sky:[255,230,190]},
  glacegeante:{label:'Géante de glace', kind:'gas', cols:['#7fb7d6','#9fcbe2','#5f97bb','#b8dcec'], sky:[190,225,255]},
  mercure:{label:'Planète rocheuse', kind:'rock', cols:['#8c8680','#a39d96','#6f6a65'], sky:[235,225,215]},
  venus:{label:'Planète rocheuse nuageuse', kind:'gas', cols:['#e8d7a8','#dcc692','#f0e4c0','#d2b882'], sky:[255,252,235]},
  terre:{label:'Planète rocheuse', kind:'terra', cols:['#1f5f9e','#4a7f45','#eef3f6'], sky:[190,215,255]},
  mars:{label:'Planète rocheuse', kind:'rock', cols:['#b5552d','#c8703f','#8e3f22'], sky:[255,175,135]},
  jupiter:{label:'Géante gazeuse', kind:'gas', cols:['#d9c3a0','#b07d56','#efe3cf','#9a6a48'], sky:[255,242,215]},
  saturne:{label:'Géante gazeuse', kind:'gas', cols:['#e3cf9f','#cbb07a','#efe2bf','#b89a64'], sky:[255,236,195]},
  uranus:{label:'Géante de glace', kind:'gas', cols:['#9fd6de','#a8dce3','#93cdd6','#b3e2e8'], sky:[195,235,240]},
  neptune:{label:'Géante de glace', kind:'gas', cols:['#3f64c8','#4a72d4','#3558b8','#5a82de'], sky:[160,185,255]}
};
const PT_TEXT = {
  lave:'Sa surface est un océan de roche en fusion, craquelé de croûtes noires.',
  brulee:'Nue et criblée de cratères, elle cuit sous le rayonnement de son étoile.',
  desert:'De vastes dunes rouillées la recouvrent, balayées par des tempêtes de poussière.',
  tempere:'Des continents, des océans et des nuages : c’est un monde où la vie pourrait exister.',
  ocean:'Un unique océan couvre toute sa surface, sous une épaisse couche de nuages.',
  glace:'Figée sous des kilomètres de glace, elle cache peut-être un océan liquide.',
  gazeuse:'Une géante sans surface solide, striée de bandes nuageuses et de tempêtes grandes comme des mondes.',
  glacegeante:'Enveloppée de méthane bleuté, elle cache un manteau de glaces sous pression.'
};
const MOON_T = {'rocheuse':'#9a948c','glacée':'#d7e4ea','volcanique':'#d9b84a','cratérisée':'#7d7873','à océan gelé':'#bcd3de'};
const GTYPES = {
  spirale:{label:'galaxie spirale', word:'Tourbillon', txt:'Ses bras spiraux, piquetés de jeunes étoiles bleues, s’enroulent autour d’un bulbe doré.'},
  barree:{label:'galaxie spirale barrée', word:'Roue', txt:'Une barre d’étoiles anciennes traverse son cœur, d’où partent deux grands bras.'},
  elliptique:{label:'galaxie elliptique', word:'Perle', txt:'Ovale et lisse, elle est peuplée d’étoiles vieilles et rougeâtres et forme peu de nouvelles étoiles.'},
  lenticulaire:{label:'galaxie lenticulaire', word:'Lentille', txt:'Un disque brillant sans bras, comme une spirale qui aurait épuisé son gaz.'},
  irreguliere:{label:'galaxie irrégulière', word:'Nuée', txt:'Sans forme précise, elle est faite d’amas lumineux où naissent sans cesse des étoiles.'}
};
const GSTAR_KINDS = [
  ['supergéante bleue',-.9,'Une étoile colossale et brûlante, qui vivra à peine quelques millions d’années.'],
  ['géante rouge',.85,'Une étoile vieillissante qui a enflé jusqu’à des centaines de fois sa taille d’origine.'],
  ['naine jaune',.1,'Une étoile paisible, semblable au Soleil.'],
  ['naine rouge',.9,'Petite et économe, elle brillera pendant des milliers de milliards d’années.'],
  ['céphéide',-.05,'Son éclat pulse à un rythme régulier, ce qui permet de mesurer la distance de la galaxie.'],
  ['naine blanche',-.4,'Le noyau refroidissant d’une étoile morte, pas plus grand qu’une planète.'],
  ['étoile binaire',.2,'Deux étoiles en orbite serrée l’une autour de l’autre.'],
  ['géante orange',.55,'Une étoile en fin de vie, gonflée et plus froide.'],
  ['pulsar',-.7,'Un cadavre d’étoile qui tourne sur lui-même des centaines de fois par seconde.'],
  ['étoile de carbone',1,'Une géante si riche en carbone que sa lumière paraît rouge sang.'],
  ['hypergéante',-.6,'L’une des étoiles les plus massives de la galaxie, au bord de l’explosion.']
];
function starColor(t){
  let r,g,b;
  if(t<0){const k=-t; r=255+(150-255)*k; g=248+(178-248)*k; b=240+(255-240)*k;}
  else {const k=t; r=255; g=248+(150-248)*k; b=240+(95-240)*k;}
  return [r|0,g|0,b|0];
}
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
function colorLabel(t){ return t<-.5?'Bleue':t<-.15?'Blanc-bleu':t<.18?'Blanche':t<.45?'Jaune':t<.72?'Orangée':'Rouge'; }

function starPhysics(s, r){
  const cls = s.t<-.6?'B':s.t<-.3?'A':s.t<-.1?'F':s.t<.2?'G':s.t<.5?'K':'M';
  const R = {B:[80,3000],A:[6,40],F:[1.6,5],G:[.6,1.5],K:[.12,.6],M:[.01,.1]}[cls];
  let lum = R[0]*Math.pow(R[1]/R[0], r());
  let kind = {B:'étoile bleue',A:'étoile blanche',F:'étoile blanc-jaune',G:'naine jaune',K:'naine orange',M:'naine rouge'}[cls];
  let giant = false;
  if((cls==='K'||cls==='M') && s.mag<2.8 && r()<.6){ lum = 100*Math.pow(20,r()); kind = cls==='K'?'géante orange':'géante rouge'; giant=true; }
  else if(cls==='B' && s.mag<1.2 && r()<.4){ lum *= 10; kind='supergéante bleue'; giant=true; }
  const M = 4.83 - 2.5*Math.log10(lum);
  const dist = 32.6*Math.pow(10,(s.mag - M)/5);
  const mass = giant ? 1+r()*6 : Math.pow(lum,.25);
  const temp = Math.round({B:15000,A:8500,F:6700,G:5700,K:4500,M:3200}[cls]*(.9+r()*.2));
  return {cls, kind, lum, dist, mass, temp, giant};
}
const sig2 = v => { if(v<100) return v; const p=Math.pow(10,Math.floor(Math.log10(v))-1); return Math.round(v/p)*p; };
function lumText(l){ return l>=1.5 ? `${fr(sig2(l), l<10?1:0)} fois plus lumineuse que le Soleil` : l>=.7 ? 'à peu près aussi lumineuse que le Soleil' : `${fr(l*100, l<.1?1:0)} % de la luminosité du Soleil`; }
function periodText(days){ return days<2 ? fr(days*24,0)+' heures' : days<400 ? fr(days,0)+' jours' : fr(days/365.25, days<3650?1:0)+' ans'; }

/* ---------- paramètres ---------- */
const GEN_DEF = {seed:'', count:2600, bright:40, colors:60, milky:60, tilt:35, nebulae:4, planets:4, galaxies:3, consts:16, cmin:4, cmax:8, style:'celeste', mode:'gen', wocean:65, wconts:4, wrelief:50, wtemp:50, whumid:50, wvar:0, wtilt:23, wyear:365, wmoons:1, wsuns:1, wpeoples:7, wcsize:50};
const DISP_DEF = {lines:true, cnames:true, smag:2, grid:false, horizon:true, twinkle:true, tint:'nuit', lat:45, lon:0, placed:false, legend:'complet', cnamesLocal:'savant', gplace:null, meteors:true, aurora:true, weather:true};
const GEN_SPEC = [
  ['count',"Nombre d'étoiles",500,8000,100,v=>v.toLocaleString('fr-FR')],
  ['bright','Étoiles brillantes',0,100,1,v=>v+' %'],
  ['colors','Variété de couleurs',0,100,1,v=>v+' %'],
  ['milky','Voie lactée',0,100,1,v=>v+' %'],
  ['tilt','Inclinaison de la voie lactée',0,90,1,v=>v+'°'],
  ['nebulae','Nébuleuses',0,14,1,v=>v],
  ['planets','Planètes visibles',0,8,1,v=>v],
  ['galaxies','Galaxies lointaines',0,10,1,v=>v],
  ['consts','Constellations',0,40,1,v=>v],
  ['cmin','Étoiles par constellation, minimum',3,12,1,v=>v],
  ['cmax','Étoiles par constellation, maximum',3,14,1,v=>v],
];
const DISP_TOGGLES = [['meteors','Étoiles filantes'],['aurora','Aurores polaires'],['weather','Météo et nuages'],['lines','Tracés des constellations'],['cnames','Noms des constellations'],['grid','Grille de coordonnées'],['horizon','Horizon et relief (vue au sol)'],['twinkle','Scintillement et mouvements']];
const TINTS = {
  nuit:{top:'#040817',mid:'#0a1434',hor:'#16244f',glow:'rgba(70,100,170,.35)'},
  crepuscule:{top:'#050a1d',mid:'#1a1d48',hor:'#4a2c4f',glow:'rgba(210,120,90,.35)'},
  aurore:{top:'#030a16',mid:'#08203a',hor:'#0d3d3a',glow:'rgba(80,220,160,.28)'},
  encre:{top:'#020308',mid:'#05070f',hor:'#0b0e1c',glow:'rgba(120,130,170,.12)'}
};
const randomSeed = () => { const r=mulberry32((Math.random()*4294967296)>>>0); return stem(r,STYLES.celeste,2).toLowerCase()+'-'+Math.floor(r()*900+100); };
let P = {...GEN_DEF, seed: randomSeed()};
let D = {...DISP_DEF};
let view = {mode:'pov', yaw:0, pitch:28*deg, fov:90*deg, mcx:0, mcy:0, mz:1, hour:22, gday:0, year:1};
let E = {}, currentEntry = null, exporting = false, playing = false, editTarget = null, editPrefill = '';
let sky = null, currentName = null, sel = -1, selC = -1, dirty = true, cardMode = 'star';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
