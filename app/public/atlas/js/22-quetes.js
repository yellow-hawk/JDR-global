/* Atlas des ciels imaginaires — Générateur de quêtes
   Une quête principale, 3 ou 4 quêtes secondaires et des quêtes annexes, toutes tirées de l'histoire
   des peuples, de leurs relations, de leurs cités, des lieux légendaires et du ciel du monde.
   Chaque quête a une partie « joueurs » (ce que la table peut savoir) et une partie « MJ » (secrets,
   vérité cachée, embranchements, dénouements). La vue joueurs n'affiche jamais les parties MJ.
   Contenu : générateur, cartes de quête, cartes à jouer (PNJ, objets), texte, section PDF, panneau.
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";

/* ---------- tables ---------- */
const QG = {
  roles:{
    patron:[['conseiller du trône','conseillère du trône'],['grand astronome','grande astronome'],['capitaine de la garde','capitaine de la garde'],['ambassadeur','ambassadrice'],['archiviste royal','archiviste royale']],
    informant:[['receleur','receleuse'],['aubergiste','aubergiste'],['copiste','copiste'],['ancien soldat','ancienne soldate'],['batelier','batelière'],['marchand de cartes','marchande de cartes']],
    guide:[['pisteur','pisteuse'],['ermite','ermite'],['chasseur de reliques','chasseuse de reliques'],['berger des hauteurs','bergère des hauteurs'],['contrebandier','contrebandière']],
    rival:[['mercenaire','mercenaire'],['chasseur de primes','chasseuse de primes'],['noble ruiné','noble ruinée'],['espion','espionne']],
    antagonist:[['grand prêtre','grande prêtresse'],['chancelier','chancelière'],['astrologue déchu','astrologue déchue'],['seigneur de guerre','dame de guerre'],['maître de guilde','maîtresse de guilde']],
    giver:[['forgeron','forgeronne'],['herboriste','herboriste'],['vieux pêcheur','vieille pêcheuse'],['prêtre du temple','prêtresse du temple'],['meunier','meunière'],['marchand','marchande'],['garde','garde'],['bibliothécaire','bibliothécaire'],['enfant des rues','enfant des rues'],['veuf inconsolable','veuve inconsolable']]
  },
  look:[['grand et maigre, la barbe tressée de fils d’argent','grande et maigre, les cheveux tressés de fils d’argent'],['petit, les mains tachées d’encre','petite, les mains tachées d’encre'],['massif, une cicatrice en travers de la joue','massive, une cicatrice en travers de la joue'],['âgé, un œil voilé de blanc','âgée, un œil voilé de blanc'],['jeune, toujours vêtu de bleu nuit','jeune, toujours vêtue de bleu nuit'],['élégant, couvert de bijoux en forme d’étoiles','élégante, couverte de bijoux en forme d’étoiles'],['voûté, le visage tanné par les routes','voûtée, le visage tanné par les routes'],['au regard perçant, une longue-vue à la ceinture','au regard perçant, une longue-vue à la ceinture'],['chauve, le crâne tatoué d’une constellation','le crâne rasé et tatoué d’une constellation'],['souriant, il lui manque deux doigts','souriante, il lui manque deux doigts']],
  mood:[['jovial mais rancunier','joviale mais rancunière'],['froid et méthodique','froide et méthodique'],['superstitieux, il consulte les astres avant chaque décision','superstitieuse, elle consulte les astres avant chaque décision'],['d’une loyauté absolue','d’une loyauté absolue'],['cupide et charmeur','cupide et charmeuse'],['idéaliste, prêt à tout pour une cause juste','idéaliste, prête à tout pour une cause juste'],['las de tout, mais redoutablement lucide','lasse de tout, mais redoutablement lucide'],['ambitieux et patient','ambitieuse et patiente'],['bavard, incapable de garder un secret… sauf un','bavarde, incapable de garder un secret… sauf un'],['méfiant envers les étrangers','méfiante envers les étrangers']],
  want:['protéger sa famille','laver l’honneur de son nom','s’enrichir avant que la guerre n’éclate','retrouver un frère disparu','prouver que les astres ont menti','servir son souverain sans faille','venger la mort de son maître','entrer à l’Académie des astronomes','quitter le pays avec ce qu’il reste de sa fortune','racheter une faute ancienne'],
  secret:['travaille en secret pour {ant}','descend d’une branche oubliée de la dynastie {deruler}','a autrefois volé {item}','connaît une entrée cachée de {place}','doit une fortune à la guilde des marchands','n’est pas {nee} chez {people} mais chez {other}','a vu {ant} commettre un meurtre et se tait par peur','croit à la prophétie et aidera, au dernier moment, à l’accomplir','a déjà trahi un groupe d’aventuriers, dont aucun n’est revenu','possède la moitié d’une carte menant à {place}'],
  quote:['« Les étoiles ne mentent jamais. Les gens, si. »','« Tout se paie, surtout ce qui est gratuit. »','« J’ai vu ce ciel-là une fois. Je ne veux pas le revoir. »','« Parlez moins fort, les murs ont des oreilles et des dettes. »','« Si vous revenez, je vous paierai double. Si. »','« Mon maître disait : regarde où les autres ne regardent pas. »','« Le nord est là où l’on ne t’attend pas. »','« Une promesse faite sous la lune se tient. Les autres… »']
};
const QG_ITEMS=[
  {t:'couronne',g:1,n:['Couronne de {founder}','Couronne aux sept étoiles'],d:'Un cercle d’or pâle serti de pierres disposées comme les étoiles de {cons}.',p:'Celui qui la porte entend les pensées de ceux qui lui ont juré fidélité.'},
  {t:'astrolabe',g:0,n:['Astrolabe de {founder}','Astrolabe des {people}'],d:'Un instrument de cuivre et de cristal, gravé de constellations aujourd’hui disparues du ciel.',p:'Réglé sur une étoile, il indique le chemin le plus court vers ce qu’on cherche.'},
  {t:'épée',g:1,n:['Lame de {star}','Épée du Serment'],d:'Une épée à la lame bleutée, forgée dit-on dans le fer d’une étoile tombée.',p:'Elle luit faiblement en présence d’un mensonge.'},
  {t:'amulette',g:1,n:['Larme de {moon}','Amulette des {cons}'],d:'Une pierre laiteuse qui change de couleur avec les phases de {moon}.',p:'Une fois par nuit, elle protège son porteur d’un coup mortel.'},
  {t:'grimoire',g:0,n:['Livre des Nuits de {founder}','Atlas de la Longue Nuit'],d:'Un épais volume aux pages noires, couvert d’une écriture argentée.',p:'Lu à voix haute sous un ciel dégagé, il permet de prédire le temps qu’il fera pendant une saison.'},
  {t:'carte',g:1,n:['Carte des Étoiles Mortes','Carte de {place}'],d:'Un parchemin dont les tracés changent selon l’heure de la nuit.',p:'Elle révèle un passage caché quand on l’éclaire à la lumière de {moon}.'},
  {t:'sceptre',g:0,n:['Sceptre de {cons}','Sceptre des rois {people}'],d:'Un bâton d’ébène surmonté d’un orbe où tournent de minuscules étoiles.',p:'Il donne à son porteur le droit (et souvent le pouvoir) de parler au nom des {people}.'},
  {t:'anneau',g:0,n:['Anneau de {star}','Anneau du Pacte'],d:'Un anneau de métal sombre, froid même en plein été.',p:'Son porteur voit dans l’obscurité comme en pleine lune.'},
  {t:'lanterne',g:1,n:['Lanterne de {moon}','Lanterne des pèlerins'],d:'Une lanterne de verre ancien dont la flamme ne s’éteint jamais.',p:'Sa lumière fait apparaître les écritures invisibles et les présences cachées.'},
  {t:'masque',g:0,n:['Masque de {cons}','Masque du Devin'],d:'Un masque d’argent sans bouche, aux yeux fermés.',p:'Qui le porte peut voir, une fois, un instant de l’avenir.'}
];
const QG_CURSE=['Chaque utilisation efface un souvenir heureux de son porteur.','Il attire les créatures de la nuit lorsque {moon} est pleine.','Son véritable propriétaire, mort depuis des siècles, le réclame en rêve.','Il ne fonctionne que pour un descendant des {people}.','Il se brise si on l’utilise contre un innocent.','Il chuchote, la nuit, la position de son porteur à {ant}.'];
const QG_TWIST=['Le commanditaire est en réalité le coupable et cherche des boucs émissaires.','La « victime » a organisé sa propre disparition.','Le monstre n’est qu’une bête affamée, chassée de son territoire par des mineurs.','Les deux camps ont raison, et aucun ne mérite d’être aidé.','L’objet recherché est un faux ; l’original est entre les mains d’un enfant du village.','Le coupable agit sous la contrainte : sa famille est retenue en otage.','Rien de surnaturel : une simple affaire de contrebande maquillée en malédiction.','Une ancienne divinité des {people} est bel et bien de retour, mais elle est bienveillante.'];
const QG_TITLES={capital:'la capitale', city:'la cité'};

/* ---------- outils ---------- */
const qPick=(r,a)=>a[Math.floor(r()*a.length)];
const qG=(pair,g)=>Array.isArray(pair)?pair[g?1:0]:pair;
const qPeopleShort = p => p.name.replace(/^les /,'');
const qOf = p => p.name.replace(/^les /,'des ');
function qPlaceOfCity(ct,k){ return {name:ct.name, lon:ct.lon, lat:ct.lat, kind:ct.kind==='capital'?'capitale':'cité', people:k, city:ct}; }
function qPlaceOfPoi(o){ return {name:o.name, lon:o.lon, lat:o.lat, kind:o.kind==='poi-major'?'lieu légendaire':'lieu remarquable', people:o.people, poi:o, danger:o.danger}; }
function qPlaceOfMicro(o,M,kind){ const [lon,lat]=M.toLL(o.x,o.y); return {name:o.name, lon, lat, kind, people:M.k, micro:o, desc:o.desc, hook:o.hook, danger:o.danger}; }
// « à Pheon » pour une cité, « au lieu-dit « X » » pour un lieu nommé
const qAt = pl => (pl.city ? 'à ' : 'au lieu-dit ')+(pl.city?pl.name:'« '+pl.name+' »');
const qNm = pl => pl.city ? pl.name : '« '+pl.name+' »';
// article devant un nom d'objet : « la Couronne de X », « l’Anneau de X »
const qThe = it => (/^[aeiouyéèêâîôûœh]/i.test(it.name) ? 'l’' : it.g ? 'la ' : 'le ')+it.name;
const QG_CLUES=['un registre aux pages arrachées','une lettre codée, signée d’une seule étoile','un sceau brisé aux armes de {foe}','des traces de chariots lourds partant vers l’ouest','un témoin ivre mais étonnamment précis','une carte du ciel annotée à la main','une bourse pleine de pièces étrangères'];
const QG_COMPL=['Une tempête coupe la route pendant deux jours.','Des pillards ont été payés pour les ralentir.','Les autorités locales leur interdisent de poursuivre l’enquête.','Un allié tombe malade et doit être soigné.','Une fausse piste soigneusement préparée les attend.'];
function qFill(s, V){ return String(s).replace(/\{(\w+)\}/g,(m,k)=>V[k]!=null?V[k]:m); }

/* ---------- générateur ---------- */
function makeQuests(){
  if(!world || !world.peoples || !world.peoples.list.length || sky.earth) return null;
  return cached('quests|'+(P.qvar|0), ()=>{
    const r=mulberry32(hashStr(P.seed+'|quetes|'+P.wvar+'|'+(P.qvar|0)));
    const L=world.peoples.list, civs=L.map((p,k)=>civOf(k)), F=world.frame;
    const pois=world.pois||[], majors=pois.filter(o=>o.kind==='poi-major'), minors=pois.filter(o=>o.kind==='poi');
    const bright=sky.stars.filter(s=>s.kind==='star'&&!s.fobj&&s.name).sort((a,b)=>a.mag-b.mag).slice(0,10);
    const moon=F.moons.length?F.moons[0].name:'la lune', sun=F.suns[0].name, comet=worldComet(), ecl=eclipsesOfYear(F);
    const NPCS=[], ITEMS=[]; let uidQ=0;
    const consOf=k=>{ const ci=Math.floor(r()*sky.consts.length); return sky.consts.length ? getCN(L[k],ci) : {name:'la voûte', fig:'le ciel'}; };
    // --- PNJ ---
    const npc=(k, roleKey, extra={})=>{ const p=L[k], S=STYLES[p.style], g=r()<.5?1:0;
      const name=cap(starName(r,S,true))+(r()<.35?' '+cap(starName(r,S,true)):'');
      const role=qG(qPick(r,QG.roles[roleKey]),g);
      const n={id:'n'+(uidQ++), name, g, role, people:k, peopleName:p.name, look:qG(qPick(r,QG.look),g), mood:qG(qPick(r,QG.mood),g), want:qPick(r,QG.want), quote:qPick(r,QG.quote), secretT:qPick(r,QG.secret), ...extra};
      NPCS.push(n); return n; };
    const finishSecrets=V=>{ for(const n of NPCS) if(!n.secret){ const other=L[(n.people+1)%L.length]; n.secret=cap(qFill(n.secretT,{...V, people:L[n.people].name, other:other.name, nee:n.g?'née':'né'}))+'.'; } };
    // --- objets ---
    const item=(k, V, opt={})=>{ const T=opt.type?QG_ITEMS.find(x=>x.t===opt.type):qPick(r,QG_ITEMS);
      const VV={...V, people:qPeopleShort(L[k]), star:bright.length?qPick(r,bright).name:'l’étoile du soir', moon, cons:consOf(k).name};
      const it={id:'i'+(uidQ++), type:T.t, g:T.g, name:qFill(qPick(r,T.n),VV), desc:qFill(T.d,VV), power:qFill(T.p,VV), curse:qFill(qPick(r,QG_CURSE),{...VV, people:L[k].name}), people:k, value:opt.value||(['précieux','inestimable','légendaire'][Math.floor(r()*3)]), lore:opt.lore||''};
      it.the=qThe(it); it.The=cap(it.the); ITEMS.push(it); return it; };
    const gold=(a,b)=>`${fr(Math.round((a+r()*(b-a))/10)*10,0)} pièces d’or`;
    // --- lieux ---
    const cityPl=(k,notCap)=>{ const c=L[k].cities.filter(ct=>!notCap||ct.kind!=='capital'); const ct=c.length?qPick(r,c):L[k].capital||L[k].cities[0]; return qPlaceOfCity(ct,k); };
    const capPl=k=>qPlaceOfCity(L[k].capital||L[k].cities[0],k);
    const majorNear=(k,used)=>{ const own=majors.filter(o=>o.people===k && !used.has(o.name)); const any=majors.filter(o=>!used.has(o.name)); const o=own.length?qPick(r,own):any.length?qPick(r,any):null; if(o) used.add(o.name); return o?qPlaceOfPoi(o):null; };
    const used=new Set();

    /* ===== quête principale ===== */
    const kA=Math.floor(r()*L.length), cvA=civs[kA], pA=L[kA];
    const rivals=cvA.rel.filter(x=>x.kind==='rivaux'), anyRel=cvA.rel;
    const kB = rivals.length ? qPick(r,rivals).o.key : anyRel.length ? qPick(r,anyRel).o.key : (L.length>1 ? (kA+1)%L.length : kA);
    const pB=L[kB], cvB=civs[kB];
    const consA=consOf(kA);
    // échéance céleste
    const eclN = ecl.length ? ecl[0].name.charAt(0).toLowerCase()+ecl[0].name.slice(1) : '';
    const deadline = comet && r()<.5 ? {kind:'comète', text:`le retour de la ${comet.name}`, at:`au retour de la ${comet.name}`, short:comet.name}
      : ecl.length ? {kind:'éclipse', text:'l’'+eclN, at:'lors de l’'+eclN, short:ecl[0].name}
      : {kind:'lune', text:`la prochaine pleine lune de ${moon}`, at:`à la prochaine pleine lune de ${moon}`, short:'pleine lune de '+moon};
    const histA = cvA.hist.slice(1,-1); const anchor = histA.length ? qPick(r,histA) : cvA.hist[0];
    const themes=['fragments','prophetie','nuit','guerre'].filter(t=>t!=='guerre'||kB!==kA);
    const theme=qPick(r,themes);
    const patron=npc(kA,'patron'), antagonist=npc(theme==='guerre'?kA:qPick(r,[kA,kB]),'antagonist'), guide=npc(kA,'guide'), informant=npc(kA,'informant'), rival=npc(kB,'rival'), envoy=npc(kB,'patron');
    const relic=item(kA,{founder:cvA.founder, place:'', ant:antagonist.name},{}); relic.lore=`${relic.g?'Façonnée':'Façonné'}, dit-on, au temps de ${cvA.founder}, fondateur ${qOf(pA)}.`;
    const V={ant:antagonist.name, ruler:cvA.ruler, deruler:cvA.ruler.replace(/^le /,'du ').replace(/^la /,'de la ').replace(/^l’/,'de l’'), item:relic.the, place:''};
    const p1=capPl(kA), p2=cityPl(kA,true), p3=majorNear(kA,used)||cityPl(kA,true), p4=capPl(kB), p5=majorNear(kB,used)||majorNear(kA,used)||cityPl(kB,true);
    V.place='« '+p5.name+' »'; finishSecrets(V);
    const TH={
      fragments:{title:`Les éclats ${relic.the.startsWith('l’')?'de l’'+relic.name:relic.g?'de la '+relic.name:'du '+relic.name}`, hook:`${relic.The}, trésor ${qOf(pA)}, a été brisé${relic.g?'e':''} et ses fragments dispersés. ${cap(cvA.ruler)} offre une récompense à qui les rapportera avant ${deadline.text}.`,
        truth:`${relic.The} n’a pas été brisé${relic.g?'e':''} par accident : ${antagonist.name}, ${antagonist.role}, l’a fait voler pour en réunir les fragments pendant ${deadline.text}. Réunifié à ce moment précis, l’objet lie à son porteur la volonté de tous ceux qui ont juré fidélité à la couronne.`,
        goal:'réunir les fragments avant l’antagoniste'},
      prophetie:{title:`La prophétie de ${deadline.short}`, hook:`Les astronomes ${qOf(pA)} annoncent que ${deadline.text} marquera « la fin d’une lignée ». Des pèlerins affluent, des émeutes éclatent, et ${relic.the} vient de disparaître de son sanctuaire.`,
        truth:`La prophétie est un faux, rédigé par ${antagonist.name}, qui a falsifié les registres de l’observatoire. Pendant ${deadline.text}, la foule rassemblée croira voir un signe : ${antagonist.g?'elle':'il'} compte alors se présenter avec ${relic.the} comme ${antagonist.g?'l’élue':'l’élu'} des astres et renverser ${cvA.ruler}.`,
        goal:'démasquer le faux prophète avant le jour annoncé'},
      nuit:{title:`La Longue Nuit des ${qPeopleShort(pA)}`, hook:`Depuis trois nuits, les étoiles de ${consA.name} s’éteignent une à une dans le ciel ${qOf(pA)}. Les anciens parlent du retour de la Longue Nuit ; ${cap(cvA.ruler)} cherche des volontaires pour comprendre.`,
        truth:`Les étoiles ne s’éteignent pas : un voile de poussière levé par les rituels de ${antagonist.name} obscurcit cette région du ciel. Avec ${relic.the}, ${antagonist.g?'elle':'il'} prépare pour ${deadline.text} un rite qui plongerait le pays dans une nuit de plusieurs mois, dont ${antagonist.g?'elle':'il'} serait la seule lumière.`,
        goal:'interrompre le rite avant que la nuit ne tombe pour de bon'},
      guerre:{title:`Le vol ${relic.the.startsWith('l’')?'de l’'+relic.name:relic.g?'de la '+relic.name:'du '+relic.name}`, hook:`${relic.The}, symbole de la paix entre ${pA.name} et ${pB.name}, a été volé${relic.g?'e':''}. Chaque peuple accuse l’autre ; les armées se massent aux frontières et la guerre éclatera ${deadline.at}.`,
        truth:`Ni ${pA.name} ni ${pB.name} n’ont volé ${relic.the}. ${antagonist.name}, ${antagonist.role} ${qOf(L[antagonist.people])}, a monté le vol pour déclencher une guerre dont ${antagonist.g?'elle':'il'} sortirait maître des deux trônes.`,
        goal:'prouver la vérité et rendre l’objet avant le début de la guerre'}
    }[theme];
    const stages=[
      {title:'L’appel', place:p1, npcs:[patron],
        players:`À ${p1.name}, ${patron.name}, ${patron.role}, reçoit les personnages en secret. ${TH.hook}`,
        mj:`${patron.name} en sait plus qu’${patron.g?'elle':'il'} ne le dit. Son secret : ${patron.secret} ${patron.g?'Elle':'Il'} oriente les personnages vers ${p2.name}, où un témoin aurait vu ${theme==='nuit'?'d’étranges processions':'les voleurs'}.`,
        obstacle:'Des espions de l’antagoniste surveillent le palais : une filature commence dès la sortie.',
        branches:[{choice:`Accepter l’escorte officielle de ${patron.name}`, cons:'Les portes s’ouvrent plus facilement, mais l’antagoniste est informé de chaque déplacement.'},{choice:'Partir discrètement, sans soutien officiel', cons:'Les personnages restent invisibles, mais devront se débrouiller sans laissez-passer.'}]},
      {title:'Le témoin', place:p2, npcs:[informant],
        players:`À ${p2.name}, ${informant.name}, ${informant.role}, aurait vu passer ${theme==='nuit'?'d’étranges processions nocturnes':'les voleurs'}. ${informant.g?'Elle':'Il'} ne parlera pas gratuitement.`,
        mj:`${informant.name} a reçu de l’or de ${antagonist.name} pour se taire. Bien interrogé${informant.g?'e':''}, ${informant.g?'elle':'il'} révèle que la piste mène ${qAt(p3).replace(/^à /,'à ')}${theme==='fragments'?', où repose le premier fragment':''}. ${anchor?`Les archives de la ville rapportent l’événement de l’an ${anchor[0]} : « ${anchor[1]} » C’est la clé de l’énigme.`:''}`,
        obstacle:`${rival.name}, ${rival.role} ${qOf(pB)}, suit la même piste et tente de faire taire le témoin.`,
        branches:[{choice:`Protéger ${informant.name}`, cons:`${informant.g?'Elle devient une alliée précieuse':'Il devient un allié précieux'} et fournit plus tard un plan du lieu ${qNm(p5)}.`},{choice:`Le laisser à son sort et suivre ${rival.name}`, cons:`Les personnages gagnent du temps, mais ${rival.name} les repère et devient un ennemi tenace.`}]},
      {title:'Le lieu oublié', place:p3, npcs:[guide],
        players:`${qNm(p3)}${p3.poi?' : '+p3.poi.desc:''} ${guide.name}, ${guide.role}, accepte de les y mener contre ${gold(30,120)}.`,
        mj:`${p3.poi?'Rumeur vérifiée : '+p3.poi.hook+' ':''}Les personnages y trouvent ${theme==='fragments'?'le premier fragment '+(relic.the.startsWith('l’')?'de l’'+relic.name:relic.g?'de la '+relic.name:'du '+relic.name):'la preuve écrite du complot (lettres signées d’un sceau inconnu)'} et la trace du passage de l’antagoniste. Secret de ${guide.name} : ${guide.secret}`,
        obstacle:`Niveau de danger : ${p3.danger||'incertain'}. Gardiens, éboulements ou créatures, selon la nature du lieu. ${qPick(r,QG_COMPL)}`,
        branches:[{choice:'Fouiller le lieu en profondeur', cons:`Ils découvrent un indice supplémentaire sur ${antagonist.name}, mais perdent un jour précieux.`},{choice:'Repartir aussitôt', cons:'Ils gardent leur avance, mais arriveront au dernier acte sans connaître le point faible de l’antagoniste.'}]},
      {title:`À la cour ${qOf(pB)}`, place:p4, npcs:[envoy, rival],
        players:`La piste mène à ${p4.name}, capitale ${qOf(pB)} (${civs[kB].reg.short.toLowerCase()}). ${envoy.name}, ${envoy.role}, accepte de les recevoir.`,
        mj:`${cap(pA.name)} et ${pB.name} ${({'alliés':'sont alliés, mais l’antagoniste a semé le doute entre les deux cours.','rivaux':'sont rivaux de longue date ; l’antagoniste exploite cette méfiance.','partenaires commerciaux':'sont partenaires commerciaux, et chacun craint de perdre ses routes ; l’antagoniste exploite cette peur.'})[(cvA.rel.find(x=>x.o.key===kB)||{}).kind]||'se méfient l’un de l’autre ; l’antagoniste exploite cette méfiance.'} ${envoy.name} peut devenir un allié décisif si les personnages prouvent leur bonne foi. ${rival.name} tente de les faire arrêter pour espionnage.`,
        obstacle:'Une audience à gagner, une accusation d’espionnage à déjouer.',
        branches:[{choice:`Révéler tout ce qu’ils savent à ${envoy.name}`, cons:`${pB.name} se joignent à eux pour l’acte final : renforts, mais l’antagoniste avance la date du rite ou du coup d’État.`},{choice:'Mentir et voler les archives de la cour', cons:'Ils obtiennent l’emplacement exact du dernier acte, mais deviennent hors-la-loi chez '+pB.name+'.'}]},
      {title:'La nuit décisive', place:p5, npcs:[antagonist], secret:true,
        players:`Tout se jouera ${deadline.at}.`,
        mj:`${cap(qAt(p5))}, ${antagonist.name} attend ${deadline.text} avec ses fidèles. ${TH.truth} Les personnages doivent ${TH.goal}. ${antagonist.g?'Elle':'Il'} propose d’abord un marché : une part du pouvoir contre leur silence.`,
        obstacle:`${antagonist.name} et ses fidèles, sur un terrain choisi par ${antagonist.g?'elle':'lui'}, pendant ${deadline.text}.`,
        branches:[{choice:'Accepter le marché', cons:'Fin « L’ombre derrière le trône » : les personnages deviennent puissants, mais complices.'},{choice:'Combattre', cons:'Fin « L’aube retrouvée » ou « La victoire amère », selon les alliés gagnés en route.'}]}
    ];
    const reward1=item(kA,{founder:cvA.founder, place:p3.name, ant:antagonist.name}); reward1.lore=`${reward1.g?'Offerte':'Offert'} par ${cvA.ruler} aux héros ${qOf(pA)}.`;
    const main={id:'q0', kind:'principale', title:TH.title, peoples:[kA,kB], theme, deadline,
      summary:TH.hook, truth:TH.truth, lore:`${anchor?`En l’an ${anchor[0]} du calendrier ${qOf(pA)} : « ${anchor[1]} » `:''}${relic.lore} ${cvA.belief}`,
      patron, antagonist, relic, stages,
      endings:[{name:'L’aube retrouvée', cond:'Les personnages ont gagné l’appui '+qOf(pB)+' et vaincu l’antagoniste.', text:`${relic.The} retrouve sa place, la paix entre ${pA.name} et ${pB.name} est renforcée et les personnages sont faits citoyens d’honneur des deux peuples.`},
               {name:'La victoire amère', cond:'L’antagoniste est vaincu, mais sans alliés.', text:`${relic.The} est perdu${relic.g?'e':''} ou détruit${relic.g?'e':''} dans l’affrontement. ${cap(cvA.ruler)} garde son trône, mais la méfiance entre ${pA.name} et ${pB.name} débouche sur une guerre froide qui peut nourrir une nouvelle campagne.`},
               {name:'L’ombre derrière le trône', cond:'Les personnages acceptent le marché ou échouent.', text:`${antagonist.name} prend le pouvoir. Les personnages deviennent ses agents, ou ses ennemis traqués. La campagne bascule.`}],
      rewards:[`${gold(800,2000)} versées par ${cvA.ruler}`, `${reward1.The} (objet magique)`, `Le titre de « Gardiens de ${consA.name} »`, `Une dette d’honneur ${qOf(pB)}`], rewardItems:[reward1]};

    /* ===== quêtes secondaires ===== */
    const SEC_T={
      'Royaume':[k=>({title:'L’héritier caché', hook:`On murmure qu’un héritier légitime au trône ${qOf(L[k])} vit caché dans une ville du pays.`, truth:'L’héritier existe, mais ignore tout de sa naissance ; deux factions de la cour veulent le trouver, l’une pour le couronner, l’autre pour l’éliminer.'}),
                 k=>({title:'Le sceau du roi', hook:`Le sceau royal ${qOf(L[k])} a été volé ; des décrets falsifiés circulent déjà dans les provinces.`, truth:'Le chambellan l’a vendu pour payer ses dettes de jeu, sans savoir que l’acheteur prépare une révolte.'})],
      'Empire':[k=>({title:'Les marches de l’Empire', hook:`Une province frontalière ${qOf(L[k])} refuse de payer l’impôt et ferme ses portes aux percepteurs.`, truth:'Le gouverneur de la province a découvert un gisement de métal stellaire et prépare sa sécession.'}),
                k=>({title:'La légion perdue', hook:`Une légion ${qOf(L[k])} partie mater une révolte n’a plus donné de nouvelles depuis deux lunes.`, truth:'La légion a déserté en bloc après avoir découvert que la « révolte » était un massacre ordonné par un général ambitieux.'})],
      'République marchande':[k=>({title:'La guerre des guildes', hook:`Une cargaison de lentilles d’observation a disparu entre deux comptoirs ${qOf(L[k])}.`, truth:'La guilde des verriers a organisé le vol pour faire monter les prix avant le vote du nouveau doge.'}),
                k=>({title:'Le vote truqué', hook:`L’élection du nouveau doge ${qOf(L[k])} approche, et deux électeurs ont disparu.`, truth:'Les électeurs se cachent : ils ont reçu des menaces des deux candidats à la fois.'})],
      'Confédération de clans':[k=>({title:'Le conseil des clans', hook:`Le grand conseil ${qOf(L[k])} se réunit ; un chef de clan a été empoisonné en route.`, truth:'Le chef s’est empoisonné lui-même à faible dose pour accuser un clan rival et prendre la tête de la confédération.'}),
                k=>({title:'Les troupeaux volés', hook:`Des troupeaux entiers disparaissent des pâturages ${qOf(L[k])} ; deux clans sont au bord de la guerre.`, truth:'Une bête ancienne, réveillée par un hiver trop doux, chasse la nuit ; elle laisse des traces que l’on prend pour celles de voleurs.'})],
      'Théocratie':[k=>({title:'Le schisme des astrologues', hook:`Deux écoles d’astrologues ${qOf(L[k])} lisent des présages opposés dans le même ciel.`, truth:'L’une des écoles utilise de vieilles tables de calcul faussées ; l’autre le sait et s’en sert pour la discréditer.'}),
                k=>({title:'L’étoile hérétique', hook:`Une nouvelle étoile est apparue dans le ciel ${qOf(L[k])} ; le clergé interdit d’en parler.`, truth:'L’« étoile » est une lanterne hissée chaque nuit au sommet d’une tour par une secte qui veut prouver que le clergé ment.'})],
      'Conseil des sages':[k=>({title:'La bibliothèque scellée', hook:`Le conseil des sages ${qOf(L[k])} a fait sceller une aile entière de la grande bibliothèque.`, truth:'Un ouvrage y décrit la vraie origine de la dynastie fondatrice, et elle n’a rien de glorieux.'}),
                k=>({title:'Le sage muet', hook:`Le doyen du conseil ${qOf(L[k])} ne parle plus depuis une nuit d’éclipse.`, truth:'Il a été frappé d’un sort de silence par un disciple qui veut prendre sa place au conseil.'})],
      'Ligue de cités':[k=>({title:'La cité qui fait sécession', hook:`Une cité de la ligue ${qOf(L[k])} a chassé son consul et fermé ses portes.`, truth:'Une épidémie y couve ; le nouveau maître de la cité la cache pour éviter la panique… et le pillage.'}),
                k=>({title:'Le pont des trois cités', hook:`Le grand pont qui relie trois cités ${qOf(L[k])} s’est effondré la veille de son inauguration.`, truth:'Les architectes avaient prévenu ; un consul a fait économiser sur la pierre et accuse maintenant des saboteurs étrangers.'})]
    };
    const REL_T={
      'rivaux':(k,o)=>({title:`La frontière de cendres`, hook:`Un village à la frontière entre ${L[k].name} et ${L[o].name} a été incendié. Chaque camp accuse l’autre.`, truth:'Des pillards payés par un marchand d’armes entretiennent le conflit, qui fait sa fortune.'}),
      'alliés':(k,o)=>({title:`L’ambassade disparue`, hook:`L’ambassade envoyée par ${L[k].name} chez ${L[o].name} n’est jamais arrivée.`, truth:'Les ambassadeurs ont été retenus par un seigneur local qui veut négocier pour lui-même.'}),
      'partenaires commerciaux':(k,o)=>({title:`La caravane perdue`, hook:`La grande caravane entre ${L[k].name} et ${L[o].name} a disparu avec ses quarante chariots.`, truth:'Une tempête l’a déroutée vers des ruines habitées ; les caravaniers survivants y sont retenus prisonniers.'})
    };
    const order=shuffle(r,L.map((p,k)=>k)); const nSec=L.length>=4 ? 4 : 3;
    const secondary=[], usedT=new Set([main.title]);
    for(let i=0;i<nSec;i++){
      const k=order[i%order.length], cv=civs[k], M=makeCountryMap(k);
      let rel = cv.rel.length && (i%2===1 || i>=L.length) ? qPick(r,cv.rel) : null;
      let base = rel ? REL_T[rel.kind](k,rel.o.key) : null;
      if(!base || usedT.has(base.title)){ rel=null; const opts=(SEC_T[cv.reg.short]||SEC_T['Royaume']).map(f=>f(k)).filter(b=>!usedT.has(b.title)); base=opts.length?qPick(r,opts):qPick(r,Object.values(SEC_T).flat().map(f=>f(k)).filter(b=>!usedT.has(b.title))); }
      usedT.add(base.title);
      const giver=npc(k,'patron'), ally=npc(k, qPick(r,['informant','guide'])), foe=npc(rel?rel.o.key:k, qPick(r,['rival','antagonist']));
      const pl=[]; const pushPl=x=>{ if(x && !pl.some(q=>q.name===x.name)) pl.push(x); };
      pushPl(qPlaceOfCity(qPick(r,L[k].cities),k));
      if(M.villages.length) pushPl(qPlaceOfMicro(qPick(r,M.villages),M,'village'));
      const mm=[...M.wpois.map(o=>[o,'lieu remarquable']), ...M.minors.map(o=>[o,(o.label||'lieu').toLowerCase()])]; if(mm.length){ const [o,kd]=qPick(r,mm); pushPl(qPlaceOfMicro(o,M,kd)); }
      for(const ct of shuffle(r,L[k].cities)){ if(pl.length>=3) break; pushPl(qPlaceOfCity(ct,k)); }
      for(const v of M.villages){ if(pl.length>=3) break; pushPl(qPlaceOfMicro(v,M,'village')); }
      while(pl.length<3) pl.push(pl[pl.length-1]);
      const rw=item(k,{founder:cv.founder, place:pl[2].name, ant:foe.name});
      const histK=cv.hist.slice(1,-1); const h=histK.length?qPick(r,histK):null;
      const clue=qFill(qPick(r,QG_CLUES),{foe:foe.name});
      const link = qPick(r,[`Le commanditaire détient une information sur ${main.antagonist.name} : réussir cette quête ouvre une piste vers la quête principale.`,`${foe.name} est en contact avec ${main.antagonist.name} ; une lettre trouvée sur ${foe.g?'elle':'lui'} relie les deux affaires.`,`${rw.The}, trouvé${rw.g?'e':''} ici, sera utile lors de « ${main.stages[4].title} ».`,`Les ${qPeopleShort(L[k])} deviendront des alliés pour la quête principale si l’affaire se termine bien.`]);
      secondary.push({id:'q'+(i+1), kind:'secondaire', title:base.title, peoples:rel?[k,rel.o.key]:[k], people:k, summary:base.hook, truth:base.truth,
        lore: h?`En l’an ${h[0]}, ${h[1].charAt(0).toLowerCase()+h[1].slice(1)} Les anciens y voient l’origine de l’affaire.`:`${cv.belief}`,
        giver, foe, link, places:pl,
        stages:[
          {title:'La demande', place:pl[0], npcs:[giver], players:`${cap(qAt(pl[0]))}, ${giver.name}, ${giver.role}, expose l’affaire : ${base.hook.charAt(0).toLowerCase()+base.hook.slice(1)}`, mj:`${giver.name} veut surtout ${giver.want} et ne dit pas tout. La vérité : ${base.truth.charAt(0).toLowerCase()+base.truth.slice(1)}`,
            obstacle:`Quelqu’un a intérêt à ce que l’affaire reste étouffée : les personnages sont suivis dès leur sortie.`},
          {title:'L’enquête', place:pl[1], npcs:[ally], players:`${qNm(pl[1])}${pl[1].desc?' : '+pl[1].desc:''} ${ally.name}, ${ally.role}, peut les aider.`,
            mj:`${ally.name} ne connaît qu’une partie de la vérité : ${ally.g?'elle':'il'} a trouvé ${clue}. ${pl[1].hook?'Ce qu’on raconte ici est vrai : '+pl[1].hook:''}`, obstacle:qPick(r,QG_COMPL),
            branches:[{choice:`Faire confiance à ${ally.name}`, cons:'Raccourci vers le dénouement, mais un piège tendu par '+foe.name+'.'},{choice:'Enquêter seuls', cons:'Plus long, mais les personnages découvrent la vérité complète et un indice sur la quête principale.'}]},
          {title:'Le dénouement', place:pl[2], npcs:[foe], secret:true, players:`L’affaire se dénoue ${qAt(pl[2])}.`, mj:`${foe.name}, ${foe.role}, y attend avec quelques hommes de main. ${pl[2].hook?'Ce qu’on raconte sur ce lieu est vrai : '+pl[2].hook:''} ${foe.g?'Elle':'Il'} veut ${foe.want}.`,
            obstacle:`${foe.name} préfère fuir que mourir, et connaît un passage secret.`,
            branches:[{choice:`Livrer ${foe.name} aux autorités`, cons:`Récompense officielle, et la gratitude des ${qPeopleShort(L[k])}.`},{choice:`Négocier avec ${foe.name}`, cons:`${foe.g?'Elle':'Il'} devient un contact dans l’ombre, mais ${giver.name} se sent trahi${giver.g?'e':''}.`}]}],
        rewards:[gold(150,600), rw.The, `La faveur de ${giver.name}`], rewardItems:[rw]});
    }
    /* ===== quêtes annexes ===== */
    const side=[]; const sidePool=shuffle(r,minors).slice(0,10);
    const nSide=Math.min(sidePool.length, 6+Math.floor(r()*3));
    for(let i=0;i<nSide;i++){ const o=sidePool[i], k=o.people>=0?o.people:Math.floor(r()*L.length);
      const giver=npc(k,'giver'); const twist=qFill(qPick(r,QG_TWIST),{people:L[k].name});
      const rw = r()<.35 ? item(k,{founder:civs[k].founder, place:o.name, ant:giver.name},{value:'modeste'}) : null;
      side.push({id:'a'+(i+1), kind:'annexe', title:o.name, people:k, place:qPlaceOfPoi(o), giver, summary:`${giver.name}, ${giver.role} ${qOf(L[k])}, cherche de l’aide pour une affaire au lieu-dit « ${o.name} ». ${o.desc} On raconte ${/^[aeiouyéèêh]/i.test(o.hook)?'qu’':'que '}${o.hook.charAt(0).toLowerCase()+o.hook.slice(1)}`, desc:o.desc, danger:o.danger, truth:twist,
        branches:[{choice:'Aider le commanditaire jusqu’au bout', cons:'La récompense promise, et un contact fidèle dans la région.'},{choice:'Révéler la vérité au grand jour', cons:'Moins d’or, mais la reconnaissance des habitants.'}],
        rewards:[gold(20,200), ...(rw?[rw.The]:[])], rewardItems:rw?[rw]:[]});
    }
    finishSecrets(V);
    // secrets cohérents des personnages-clés
    antagonist.secret=`Prépare tout pour ${deadline.text}. ${antagonist.secret}`;
    return {main, secondary, side, npcs:NPCS, items:ITEMS, world:world.name, made:Date.now()};
  });
}

/* ---------- cartes de quête ---------- */
function questWorldMap(marks, title, ratio=1.6){
  const can=renderWorldImage(ratio), c=can.getContext('2d'), cw=1800, ch=900; c.setTransform(ratio,0,0,ratio,0,0);
  const pts=marks.map(m=>[(m.lon+Math.PI)/TAU*cw, (Math.PI/2-m.lat)/Math.PI*ch]);
  c.setLineDash([10,8]); c.strokeStyle='rgba(255,226,140,.9)'; c.lineWidth=3; c.beginPath(); pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.stroke(); c.setLineDash([]);
  marks.forEach((m,i)=>qMarker(c, pts[i][0], pts[i][1], m.label, m.name, 1.1));
  qMapTitle(c, title, cw); return can;
}
function questCountryMap(k, marks, title){
  const M=makeCountryMap(k), scale=1.6, ratio=2, can=renderCountryImage(M,scale,ratio), c=can.getContext('2d');
  const W2=Math.round(M.MW*scale*.72), H2=Math.round(M.MH*scale*.72), s=Math.min(W2/M.MW,H2/M.MH)*.98; c.setTransform(ratio,0,0,ratio,0,0);
  const P2=m=>{ const [x,y]=M.toPx(m.lon,m.lat); return [W2/2+(x-M.MW/2)*s, H2/2+(y-M.MH/2)*s]; };
  const pts=marks.map(P2);
  c.setLineDash([9,7]); c.strokeStyle='rgba(140,30,20,.85)'; c.lineWidth=3; c.beginPath(); pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.stroke(); c.setLineDash([]);
  marks.forEach((m,i)=>qMarker(c, pts[i][0], pts[i][1], m.label, m.name, 1));
  qMapTitle(c, title, W2); return can;
}
function qMarker(c,x,y,label,name,k){
  const R=15*k; c.fillStyle='rgba(120,24,16,.92)'; c.strokeStyle='#fff3cf'; c.lineWidth=2.5; c.beginPath(); c.arc(x,y,R,0,TAU); c.fill(); c.stroke();
  c.fillStyle='#fff3cf'; c.font=`600 ${Math.round(16*k)}px Figtree, system-ui, sans-serif`; c.textAlign='center'; c.textBaseline='middle'; c.fillText(label,x,y+1);
  if(name){ c.font=`italic 600 ${Math.round(19*k)}px ${SERIF}`; c.lineJoin='round'; c.strokeStyle='rgba(20,14,8,.85)'; c.lineWidth=5; c.strokeText(name,x,y-R-12); c.fillStyle='#fff6dc'; c.fillText(name,x,y-R-12); }
}
function qMapTitle(c,title,W){
  c.font=`italic 600 30px ${SERIF}`; const w=c.measureText(title).width+40; c.fillStyle='rgba(30,20,10,.78)'; c.fillRect(W/2-w/2,10,w,48);
  c.strokeStyle='rgba(216,181,106,.9)'; c.lineWidth=1.5; c.strokeRect(W/2-w/2+4,14,w-8,40); c.fillStyle='#f4ead0'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(title,W/2,35);
}
// Marques d'une quête : la vue joueurs cache les étapes secrètes.
function questMarks(q, mj){
  if(q.kind==='annexe') return [{...q.place, label:'?', name:q.place.name}];
  return q.stages.filter(s=>mj || !s.secret).map((s,i)=>({...s.place, label:String(q.stages.indexOf(s)+1), name:s.place.name}));
}
function renderQuestMap(q, mj){
  const marks=questMarks(q,mj);
  if(q.kind==='secondaire') return questCountryMap(q.people, marks, q.title);
  return questWorldMap(marks, q.title);
}
function renderSideQuestsMap(Q){ const marks=Q.side.map((q,i)=>({...q.place, label:String(i+1), name:q.place.name}));
  const can=renderWorldImage(1.6), c=can.getContext('2d'), cw=1800, ch=900; c.setTransform(1.6,0,0,1.6,0,0);
  marks.forEach(m=>qMarker(c,(m.lon+Math.PI)/TAU*cw,(Math.PI/2-m.lat)/Math.PI*ch,m.label,m.name,1)); qMapTitle(c,'Quêtes annexes',cw); return can; }

/* ---------- cartes à jouer (PNJ et objets) ---------- */
function qCardBase(title, sub, col){
  const Wc=750, Hc=1050, sc=2, can=document.createElement('canvas'); can.width=Wc*sc; can.height=Hc*sc; const g=can.getContext('2d'); g.setTransform(sc,0,0,sc,0,0);
  g.fillStyle='#efe3c4'; g.fillRect(0,0,Wc,Hc);
  const r=mulberry32(hashStr(title)); for(let i=0;i<1400;i++){ g.fillStyle=`rgba(120,80,30,${r()*.05})`; g.fillRect(r()*Wc,r()*Hc,2+r()*6,2+r()*6); }
  const v=g.createRadialGradient(Wc/2,Hc/2,Hc*.3,Wc/2,Hc/2,Hc*.75); v.addColorStop(0,'rgba(120,80,30,0)'); v.addColorStop(1,'rgba(120,80,30,.3)'); g.fillStyle=v; g.fillRect(0,0,Wc,Hc);
  g.strokeStyle='#7a5832'; g.lineWidth=4; g.strokeRect(18,18,Wc-36,Hc-36); g.lineWidth=1.2; g.strokeRect(28,28,Wc-56,Hc-56);
  g.fillStyle=col; g.beginPath(); g.arc(Wc/2,150,78,0,TAU); g.fill(); g.lineWidth=6; g.strokeStyle='#a87c30'; g.stroke(); g.lineWidth=1.5; g.strokeStyle='#f3e3b8'; g.beginPath(); g.arc(Wc/2,150,66,0,TAU); g.stroke();
  g.textAlign='center'; g.fillStyle='#4a2f12'; g.font=`italic 600 46px ${SERIF}`; const tl=xpWrapSys(g,title,Wc-110).slice(0,2); tl.forEach((l,i)=>g.fillText(l,Wc/2,290+i*48));
  let y=290+tl.length*48; g.fillStyle='#7a5832'; g.font=`italic 500 24px ${SERIF}`; xpWrapSys(g,sub,Wc-120).slice(0,2).forEach(l=>{ g.fillText(l,Wc/2,y); y+=28; });
  g.strokeStyle='#a87c30'; g.lineWidth=1.5; g.beginPath(); g.moveTo(140,y+4); g.lineTo(Wc-140,y+4); g.stroke();
  return {can,g,Wc,Hc,y:y+30};
}
function qCardText(C, label, text, opt={}){
  const {g,Wc}=C; if(!text) return; g.textAlign='left';
  if(opt.box){ g.font='19px Figtree, system-ui, sans-serif'; const lines=xpWrapSys(g,text,Wc-150); const h=lines.length*25+44; g.fillStyle='rgba(140,30,20,.1)'; g.strokeStyle='rgba(140,30,20,.6)'; g.lineWidth=1.5; g.fillRect(55,C.y-6,Wc-110,h); g.strokeRect(55,C.y-6,Wc-110,h);
    g.fillStyle='#8c1e14'; g.font='600 16px Figtree, system-ui, sans-serif'; g.fillText(label.toUpperCase(),72,C.y+16); g.fillStyle='#4a2410'; g.font='19px Figtree, system-ui, sans-serif'; lines.forEach((l,i)=>g.fillText(l,72,C.y+42+i*25)); C.y+=h+14; return; }
  if(label){ g.fillStyle='#8a6420'; g.font='600 16px Figtree, system-ui, sans-serif'; g.fillText(label.toUpperCase(),60,C.y); C.y+=24; }
  g.fillStyle='#34261a'; g.font=opt.italic?`italic 500 23px ${SERIF}`:'19px Figtree, system-ui, sans-serif'; const lh=opt.italic?27:25;
  for(const l of xpWrapSys(g,text,Wc-120)){ if(C.y>C.Hc-60) break; g.fillText(l,60,C.y); C.y+=lh; } C.y+=12;
}
function renderNpcCard(n, mj){
  const p=world.peoples.list[n.people], C=qCardBase(n.name, `${cap(n.role)} ${qOf(p)}`, p.col);
  C.g.fillStyle='#fffaf0'; C.g.font=`italic 600 84px ${SERIF}`; C.g.textAlign='center'; C.g.textBaseline='middle'; C.g.fillText(n.name[0],C.Wc/2,156); C.g.textBaseline='alphabetic';
  qCardText(C,'Apparence',cap(n.look)+'.'); qCardText(C,'Caractère',cap(n.mood)+'.'); qCardText(C,null,n.quote,{italic:true});
  if(mj){ qCardText(C,'Ce qu’il veut'.replace('il',n.g?'elle':'il'),cap(n.want)+'.'); qCardText(C,'Secret (MJ)',n.secret,{box:true}); }
  return C.can;
}
function renderItemCard(it, mj){
  const C=qCardBase(it.name, `${cap(it.type)} ${it.value}`, '#2c3a66'); const g=C.g;
  g.save(); g.translate(C.Wc/2,150); g.fillStyle='#f6e7b8'; g.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?22:52; g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); } g.closePath(); g.fill(); g.restore();
  qCardText(C,'Description',it.desc); qCardText(C,'Pouvoir',it.power); if(it.lore) qCardText(C,'Histoire',it.lore,{italic:true});
  if(mj) qCardText(C,'Revers caché (MJ)',it.curse,{box:true});
  return C.can;
}

/* ---------- texte complet ---------- */
function questsText(Q, mj){
  const L=[], hr='─'.repeat(60), pn=k=>world.peoples.list[k].name;
  const st=(s,i)=>{ L.push('', `  ${i+1}. ${s.title} (${s.place.name}, ${s.place.kind})`); if(!mj && s.secret){ L.push('     Lieu et détails révélés en jeu.'); return; } L.push('     '+s.players); if(mj){ L.push('     [MJ] '+s.mj); if(s.obstacle) L.push('     [MJ] Obstacle : '+s.obstacle); for(const b of s.branches||[]) L.push(`     [MJ] Si : ${b.choice} -> ${b.cons}`); } };
  const q=Q.main; L.push(`QUÊTES DE ${Q.world.toUpperCase()} (${mj?'version du MJ':'version des joueurs'})`, hr, '', `QUÊTE PRINCIPALE : ${q.title}`, hr, q.summary);
  if(mj){ L.push('', '[MJ] La vérité : '+q.truth, '[MJ] Contexte : '+q.lore, `[MJ] Échéance : ${q.deadline.text}`); }
  q.stages.forEach(st);
  if(mj){ L.push('', '  Dénouements :'); for(const e of q.endings) L.push(`   - ${e.name} (${e.cond}) ${e.text}`); }
  L.push('', '  Récompenses : '+q.rewards.join(' ; '));
  for(const s of Q.secondary){ L.push('', hr, `QUÊTE SECONDAIRE : ${s.title} (${pn(s.people)})`, hr, s.summary); if(mj) L.push('', '[MJ] La vérité : '+s.truth, '[MJ] Contexte : '+s.lore, '[MJ] Lien avec la quête principale : '+s.link); s.stages.forEach(st); L.push('', '  Récompenses : '+s.rewards.join(' ; ')); }
  L.push('', hr, 'QUÊTES ANNEXES', hr);
  Q.side.forEach((s,i)=>{ L.push('', `${i+1}. ${s.title} (${pn(s.people)}, danger : ${s.danger})`, '   '+s.summary); if(mj){ L.push('   [MJ] Retournement : '+s.truth); for(const b of s.branches) L.push(`   [MJ] Si : ${b.choice} -> ${b.cons}`); } L.push('   Récompense : '+s.rewards.join(' ; ')); });
  L.push('', hr, 'PERSONNAGES', hr);
  for(const n of Q.npcs){ if(!mj && n===Q.main.antagonist) continue; L.push('', `${n.name}, ${n.role} ${qOf(world.peoples.list[n.people])}`, `   ${cap(n.look)}. ${cap(n.mood)}. ${n.quote}`); if(mj) L.push(`   [MJ] Veut : ${n.want}. Secret : ${n.secret}`); }
  L.push('', hr, 'OBJETS ET RÉCOMPENSES', hr);
  for(const it of Q.items){ L.push('', `${it.name} (${it.type}, ${it.value})`, `   ${it.desc} ${it.power}${it.lore?' '+it.lore:''}`); if(mj) L.push('   [MJ] Revers : '+it.curse); }
  return L.join('\r\n');
}

/* ---------- section du carnet (PDF) ----------
   K : outils du carnet (doc, newPage, sectionTitle, flow, text, heading, factsBox, ensure, colMax, measure, cx, y, colW…)
   mj : true pour la version complète du MJ. */
async function carnetQuestSection(K, mj){
  const Q=makeQuests(); if(!Q) return; const {doc}=K, L=world.peoples.list;
  const box=(title, lines, red)=>{ const w=K.colW-2; K.doc.setFont('times','normal'); K.doc.setFontSize(9.2); const ls=[]; for(const l of lines) ls.push(...K.doc.splitTextToSize(pdfT(l), w-8)); const h=ls.length*4.1+10;
    K.ensure(Math.min(h+2,K.colMax())); const x=K.cx(); let y=K.y; K.doc.setFillColor(...(red?[246,226,214]:[248,240,220])); K.doc.setDrawColor(...(red?[150,40,32]:K.BROWN)); K.doc.setLineWidth(.35); K.doc.roundedRect(x,y,w,Math.min(h,K.colMax()),1.6,1.6,'FD');
    K.doc.setFont('times','bold'); K.doc.setFontSize(8.6); K.doc.setTextColor(...(red?[150,40,32]:K.BROWN)); K.doc.text(pdfT(title),x+4,y+5); y+=9.2; K.doc.setFont('times','normal'); K.doc.setFontSize(9.2); K.doc.setTextColor(...K.INK);
    for(const l of ls){ if(y>K.PH()-K.M-8){ K.y=y; K.ensure(99); y=K.y; } K.doc.text(l,x+4,y); y+=4.1; } K.y=y+3; };
  const mapPage=async(can, cap_)=>{ K.newPage('l'); const ar=can.height/can.width; const w=Math.min(262,(K.PH()-40)/ar), h=w*ar; doc.addImage(can.toDataURL('image/jpeg',.86),'JPEG',(K.PW()-w)/2,(K.PH()-h)/2-4,w,h);
    doc.setFont('times','italic'); doc.setFontSize(9.5); doc.setTextColor(...K.SOFT); doc.text(pdfT(cap_),K.PW()/2,K.PH()-16,{align:'center'}); await K.tick(); };
  const stageBlock=(s,i)=>{ K.heading(`${i+1}. ${s.title}`,12.5,'#5a3a14',1); K.text(`${s.place.name} (${s.place.kind}${s.place.people>=0?', terres '+qOf(L[s.place.people]):''})`,{size:9,style:'italic',color:K.SOFT,after:1});
    if(!mj && s.secret){ K.text('Ce que vous découvrirez ici vous sera révélé en jeu.',{size:9.4,style:'italic'}); return; }
    K.text(s.players,{size:9.4,after:1.2});
    if(mj){ box('MJ : ce qui se passe vraiment',[s.mj, s.obstacle?'Obstacle : '+s.obstacle:''].filter(Boolean),true);
      if(s.branches&&s.branches.length) box('Embranchements',s.branches.map(b=>`Si les personnages choisissent de ${b.choice.charAt(0).toLowerCase()+b.choice.slice(1)} : ${b.cons}`)); } };
  // --- quête principale ---
  const q=Q.main;
  K.say('Quêtes…'); await K.tick();
  K.newPage('p'); K.toc.push(['Les quêtes', doc.getNumberOfPages()]);
  { const y0=K.sectionTitle('Quête principale', q.title); K.flow(1,y0);
    K.text(q.summary,{size:11});
    if(mj){ box('MJ : la vérité',[q.truth]); box('MJ : contexte et histoire',[q.lore]); }
    K.y=K.factsBox([['Peuples', q.peoples.map(k=>cap(L[k].name)).filter((v,i,a)=>a.indexOf(v)===i).join(' et ')], ['Commanditaire', `${q.patron.name}, ${q.patron.role}`], ...(mj?[['Antagoniste', `${q.antagonist.name}, ${q.antagonist.role}`]]:[]), ['Échéance', q.deadline.text], ['Étapes', String(q.stages.length)]], K.M, K.y+1, K.PW()-2*K.M);
    K.flow(2,K.y); q.stages.forEach(stageBlock);
    if(mj){ K.heading('Dénouements',14); for(const e of q.endings){ K.heading(e.name,11.5,'#5a3a14',1); K.text(e.cond,{size:9,style:'italic',color:K.SOFT,after:.6}); K.text(e.text,{size:9.2}); } }
    K.heading('Récompenses',14); for(const t of q.rewards) K.text('· '+t,{size:9.4,after:.6}); }
  await mapPage(renderQuestMap(q,mj), `Carte de la quête « ${q.title} »`+(mj?'':' : les lieux encore inconnus ne sont pas indiqués'));
  // --- secondaires ---
  for(const s of Q.secondary){ await K.tick();
    K.newPage('p'); K.toc.push([s.title, doc.getNumberOfPages(), true]);
    const y0=K.sectionTitle(s.title, `Quête secondaire : ${s.peoples.map(k=>L[k].name).join(' et ')}`); K.flow(1,y0); K.text(s.summary,{size:10.6});
    if(mj){ box('MJ : la vérité',[s.truth]); box('MJ : contexte',[s.lore]); box('MJ : lien avec la quête principale',[s.link]); }
    K.flow(2,K.y); s.stages.forEach(stageBlock);
    K.heading('Récompenses',13); for(const t of s.rewards) K.text('· '+t,{size:9.4,after:.6});
    await mapPage(renderQuestMap(s,mj), `Carte de la quête « ${s.title} »`); }
  // --- annexes ---
  K.newPage('p'); K.toc.push(['Quêtes annexes', doc.getNumberOfPages(), true]);
  { const y0=K.sectionTitle('Quêtes annexes', 'Petites affaires pour remplir les journées de voyage'); K.flow(2,y0);
    Q.side.forEach((s,i)=>{ K.ensure(30); K.heading(`${i+1}. ${s.title}`,12,'#5a3a14',1); K.text(`${cap(L[s.people].name)} · danger : ${s.danger}`,{size:9,style:'italic',color:K.SOFT,after:.8});
      K.text(s.summary,{size:9.3,after:1}); if(mj){ box('MJ : retournement',[s.truth],true); box('Embranchements',s.branches.map(b=>`${b.choice} : ${b.cons}`)); }
      K.text('Récompense : '+s.rewards.join(', '),{size:9,style:'italic',color:K.BROWN,after:3}); }); }
  await mapPage(renderSideQuestsMap(Q), 'Les quêtes annexes : les numéros renvoient à la liste.');
  // --- personnages ---
  K.newPage('p'); K.toc.push(['Personnages', doc.getNumberOfPages(), true]);
  { const y0=K.sectionTitle('Personnages', mj?'Alliés, rivaux et antagonistes':'Les personnages que vous croiserez'); K.flow(2,y0);
    const list = mj ? Q.npcs : Q.npcs.filter(n=>n!==Q.main.antagonist);
    for(const n of list){ K.ensure(26); K.heading(n.name,12,'#5a3a14',1); K.text(`${cap(n.role)} ${qOf(L[n.people])}`,{size:9,style:'italic',color:K.SOFT,after:.6});
      K.text(`${cap(n.look)}. ${cap(n.mood)}. ${n.quote}`,{size:9.1,after:.8}); if(mj) K.text(`Veut ${n.want}. Secret : ${n.secret}`,{size:8.8,color:[140,40,32],after:2.5}); else K.y+=2; } }
  // --- objets ---
  K.newPage('p'); K.toc.push(['Objets et récompenses', doc.getNumberOfPages(), true]);
  { const y0=K.sectionTitle('Objets et récompenses', 'Reliques, armes et trésors de la campagne'); K.flow(2,y0);
    for(const it of Q.items){ K.ensure(26); K.heading(it.name,12,'#5a3a14',1); K.text(`${cap(it.type)} ${it.value}`,{size:9,style:'italic',color:K.SOFT,after:.6});
      K.text(`${it.desc} ${it.power}`,{size:9.1,after:.6}); if(it.lore) K.text(it.lore,{size:8.8,style:'italic',after:.6}); if(mj) K.text('Revers caché : '+it.curse,{size:8.8,color:[140,40,32],after:2.5}); else K.y+=2; } }
}

/* ---------- panneau « Quêtes » ---------- */
const QUI={tab:'main', mj:true};
try{ const s=localStorage.getItem('atlas-quetes-vue'); if(s==='joueurs') QUI.mj=false; }catch(e){}
function openQuests(){ if(sky.earth){ toast('Les quêtes sont faites pour les mondes imaginaires'); return; } if(!world.peoples.list.length){ toast('Ce monde n’a aucun peuple : ajoute des peuples pour générer des quêtes'); return; } openSheet('panelQuests'); $('panelQuests').classList.add('open'); renderQuests(); }
function renderQuests(){
  const box=$('questBody'); box.innerHTML=''; const Q=makeQuests(); if(!Q){ box.append(el('p','hint','Aucune quête pour ce ciel.')); return; }
  const L=world.peoples.list, mj=QUI.mj;
  const bar=el('div','q-bar');
  const tg=el('button','act'+(mj?' primary':''), mj?'Vue MJ (tout est visible)':'Vue joueurs (secrets cachés)'); tg.onclick=()=>{ QUI.mj=!QUI.mj; try{ localStorage.setItem('atlas-quetes-vue', QUI.mj?'mj':'joueurs'); }catch(e){} renderQuests(); };
  const rr=el('button','act','Autres quêtes'); rr.onclick=()=>{ P.qvar=(P.qvar|0)+1; renderQuests(); toast('Nouvelles quêtes générées'); };
  const pm=el('button','act','Livret MJ (PDF)'); pm.onclick=()=>exportQuestBooklet(true);
  const pj=el('button','act','Livret joueurs (PDF)'); pj.onclick=()=>exportQuestBooklet(false);
  bar.append(tg,rr,pm,pj); box.append(bar);
  const tabs=el('div','q-tabs'); [['main','Principale'],['sec','Secondaires'],['side','Annexes'],['npc','Personnages'],['item','Objets']].forEach(([k,t])=>{ const b=el('button',QUI.tab===k?'on':'',t); b.onclick=()=>{ QUI.tab=k; renderQuests(); }; tabs.append(b); }); box.append(tabs);
  const mjBox=(title, txt)=>{ if(!mj||!txt) return null; const d=el('div','q-mj'); d.append(el('b',null,title), el('p',null,txt)); return d; };
  const add=(...xs)=>xs.filter(Boolean).forEach(x=>box.append(x));
  const stages=q=>q.stages.forEach((s,i)=>{ const d=el('div','q-stage'); d.append(el('h4',null,`${i+1}. ${s.title}`), el('p','sub',`${s.place.name} · ${s.place.kind}`));
    if(!mj && s.secret) d.append(el('p','desc','Révélé en jeu.')); else { d.append(el('p','desc',s.players)); const m=mjBox('MJ : ce qui se passe vraiment', s.mj+(s.obstacle?' Obstacle : '+s.obstacle:'')); if(m) d.append(m);
      if(mj && s.branches) { const ul=el('ul','q-br'); for(const b of s.branches){ const li=el('li'); li.append(el('b',null,b.choice+' : '), document.createTextNode(b.cons)); ul.append(li); } d.append(el('p','q-lbl','Embranchements'), ul); } }
    const go=el('button','act','Voir sur la carte'); go.onclick=()=>qShowPlace(s.place); d.append(go); box.append(d); });
  if(QUI.tab==='main'){ const q=Q.main; add(el('h3',null,q.title), el('p','desc',q.summary), mjBox('MJ : la vérité',q.truth), mjBox('MJ : contexte',q.lore));
    const dl=el('dl','facts'); fillFacts(dl,[['Commanditaire',`${q.patron.name}, ${q.patron.role}`], ...(mj?[['Antagoniste',`${q.antagonist.name}, ${q.antagonist.role}`]]:[]), ['Échéance',q.deadline.text]]); box.append(dl); stages(q);
    if(mj){ box.append(el('h3',null,'Dénouements')); for(const e of q.endings) add(mjBox(e.name+' · '+e.cond, e.text)); }
    box.append(el('h3',null,'Récompenses')); for(const t of q.rewards) box.append(el('p','desc','· '+t)); }
  if(QUI.tab==='sec') for(const s of Q.secondary){ add(el('h3',null,s.title), el('p','sub',s.peoples.map(k=>cap(L[k].name)).join(' et ')), el('p','desc',s.summary), mjBox('MJ : la vérité',s.truth), mjBox('MJ : contexte',s.lore), mjBox('MJ : lien avec la quête principale',s.link)); stages(s); box.append(el('p','desc','Récompenses : '+s.rewards.join(', '))); }
  if(QUI.tab==='side') Q.side.forEach((s,i)=>{ add(el('h3',null,`${i+1}. ${s.title}`), el('p','sub',`${cap(L[s.people].name)} · danger : ${s.danger}`), el('p','desc',s.summary), mjBox('MJ : retournement',s.truth));
    if(mj){ const ul=el('ul','q-br'); for(const b of s.branches){ const li=el('li'); li.append(el('b',null,b.choice+' : '), document.createTextNode(b.cons)); ul.append(li); } box.append(ul); }
    box.append(el('p','desc','Récompense : '+s.rewards.join(', '))); const go=el('button','act','Voir sur la carte'); go.onclick=()=>qShowPlace(s.place); box.append(go); });
  if(QUI.tab==='npc') for(const n of Q.npcs){ if(!mj && n===Q.main.antagonist) continue; add(el('h3',null,n.name), el('p','sub',`${cap(n.role)} ${qOf(L[n.people])}`), el('p','desc',`${cap(n.look)}. ${cap(n.mood)}. ${n.quote}`), mjBox('MJ',`Veut ${n.want}. Secret : ${n.secret}`)); }
  if(QUI.tab==='item') for(const it of Q.items){ add(el('h3',null,it.name), el('p','sub',`${cap(it.type)} ${it.value}`), el('p','desc',`${it.desc} ${it.power}`), it.lore?el('p','desc',it.lore):null, mjBox('MJ : revers caché',it.curse)); }
}
function qShowPlace(pl){ closeSheets(); openWorld(); wView.glon=pl.lon; wView.glat=clamp(pl.lat,-1.2,1.2); wView.mcx=pl.lon; wView.mcy=clamp(pl.lat,-.8,.8); wSel={lon:pl.lon, lat:pl.lat, c:cellOf(pl.lon,pl.lat), name:pl.name}; wPanel(); wDirty=true; }
async function exportQuestBooklet(mj){
  toast('Préparation du livret…'); const r=await buildCarnet({blobOnly:true, questsOnly:true, player:!mj}); if(!r) return;
  localSave(r.blob, r.filename);
}
