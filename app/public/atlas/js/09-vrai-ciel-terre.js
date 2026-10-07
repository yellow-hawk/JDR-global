/* Atlas des ciels imaginaires — Vrai ciel de la Terre
   Module chargé par index.html. Tous les modules partagent le même espace global :
   l'ordre de chargement est celui de la liste <script> dans index.html. */
"use strict";

/* ================= vrai ciel de la Terre ================= */
const CON_ART = {And:'',Ant:'la',Aps:'l’',Aqr:'le',Aql:'l’',Ara:'l’',Ari:'le',Aur:'le',Boo:'le',Cae:'le',Cam:'la',Cnc:'le',CVn:'les',CMa:'le',CMi:'le',Cap:'le',Car:'la',Cas:'',Cen:'le',Cep:'',Cet:'la',Cha:'le',Cir:'le',Col:'la',Com:'la',CrA:'la',CrB:'la',Crv:'le',Crt:'la',Cru:'la',Cyg:'le',Del:'le',Dor:'la',Dra:'le',Equ:'le',Eri:'l’',For:'le',Gem:'les',Gru:'la',Her:'',Hor:'l’',Hya:'l’',Hyi:'l’',Ind:'l’',Lac:'le',Leo:'le',LMi:'le',Lep:'le',Lib:'la',Lup:'le',Lyn:'le',Lyr:'la',Men:'la',Mic:'le',Mon:'la',Mus:'la',Nor:'la',Oct:'l’',Oph:'',Ori:'',Pav:'le',Peg:'',Per:'',Phe:'le',Pic:'le',Psc:'les',PsA:'le',Pup:'la',Pyx:'la',Ret:'le',Sge:'la',Sgr:'le',Sco:'le',Scl:'le',Sct:'l’',Ser:'le',Sex:'le',Tau:'le',Tel:'le',Tri:'le',TrA:'le',Tuc:'le',UMa:'la',UMi:'la',Vel:'les',Vir:'la',Vol:'le',Vul:'le'};
const KH = 'introduite à la fin du XVIe siècle d’après les observations des navigateurs néerlandais Keyser et de Houtman';
const LAC = 'créée par l’astronome français Nicolas-Louis de Lacaille vers 1750, lors de son séjour au cap de Bonne-Espérance';
const HEV = 'créée par l’astronome polonais Johannes Hevelius à la fin du XVIIe siècle';
const CON_TXT = {
And:'Andromède est la princesse enchaînée à un rocher pour être livrée au monstre marin, puis délivrée par Persée. Elle abrite la galaxie d’Andromède, à environ 2,5 millions d’années-lumière : c’est l’objet le plus lointain que l’on puisse voir à l’œil nu.',
Ant:`La Machine pneumatique est une constellation discrète du ciel austral, ${LAC}. Elle rend hommage à la pompe à air, une invention toute récente à l’époque.`,
Aps:`L’Oiseau de Paradis est une petite constellation proche du pôle Sud céleste, ${KH}.`,
Aqr:'Le Verseau est une constellation du zodiaque. On y voit souvent Ganymède, l’échanson qui servait à boire aux dieux de l’Olympe. Les étoiles filantes des Êta Aquarides semblent en jaillir chaque année début mai.',
Aql:'L’Aigle représente l’oiseau de Zeus, porteur de sa foudre. Son étoile principale, Altaïr, forme avec Véga et Deneb le Triangle d’été, repère majeur des nuits estivales de l’hémisphère Nord.',
Ara:'L’Autel serait celui sur lequel les dieux prêtèrent serment avant de combattre les Titans. Il se trouve dans une partie riche de la voie lactée australe.',
Ari:'Le Bélier évoque l’animal à la toison d’or recherché par Jason et les Argonautes. Il y a environ 2 000 ans, le Soleil s’y trouvait à l’équinoxe de printemps, d’où le nom de « point gamma » ou point vernal, qui s’est depuis déplacé dans les Poissons.',
Aur:'Le Cocher est souvent associé à Érichthonios, roi légendaire d’Athènes et inventeur du char à quatre chevaux. Il porte sur son épaule la chèvre Capella, l’une des étoiles les plus brillantes du ciel d’hiver.',
Boo:'Le Bouvier semble pousser la Grande Ourse autour du pôle. On trouve son étoile Arcturus en prolongeant la courbe de la queue de la Grande Ourse : c’est l’étoile la plus brillante de l’hémisphère céleste nord.',
Cae:`Le Burin est une très petite et très faible constellation australe, ${LAC}. Elle représente un outil de graveur.`,
Cam:'La Girafe est une vaste constellation du nord, pauvre en étoiles brillantes, dessinée au début du XVIIe siècle par le cartographe Petrus Plancius. Elle ne se couche jamais depuis la France.',
Cnc:'Le Cancer est le crabe envoyé par Héra pour gêner Héraclès pendant son combat contre l’Hydre ; le héros l’écrasa d’un coup de pied. C’est la plus discrète des constellations du zodiaque, mais elle abrite l’amas de la Crèche, visible à l’œil nu comme une petite tache laiteuse.',
CVn:`Les Chiens de Chasse tiennent en laisse les chiens du Bouvier. Constellation ${HEV.replace('créée','créée')}, elle contient la galaxie du Tourbillon (M51), l’une des spirales les plus photographiées.`,
CMa:'Le Grand Chien suit Orion, son maître chasseur. Il abrite Sirius, l’étoile la plus brillante de tout le ciel nocturne, dont le lever à l’aube annonçait autrefois la crue du Nil aux Égyptiens.',
CMi:'Le Petit Chien est le second chien d’Orion. Il ne compte que deux étoiles notables, dont Procyon, l’une des étoiles les plus proches du Soleil.',
Cap:'Le Capricorne est une chèvre à queue de poisson, associée au dieu Pan. Le tropique du Capricorne tient son nom de l’époque où le Soleil s’y trouvait au solstice de décembre.',
Car:'La Carène est la coque du navire Argo des Argonautes, un ancien géant céleste que Lacaille a découpé en trois constellations. Elle contient Canopus, deuxième étoile la plus brillante du ciel, et la grande nébuleuse de la Carène.',
Cas:'Cassiopée est la reine d’Éthiopie, mère d’Andromède, punie pour s’être vantée d’être plus belle que les Néréides. Ses cinq étoiles principales dessinent un W bien reconnaissable, qui ne se couche jamais depuis la France.',
Cen:'Le Centaure représente Chiron, le sage centaure qui éduqua de nombreux héros grecs. Il abrite Alpha du Centaure, le système stellaire le plus proche du Soleil, et Oméga du Centaure, le plus grand amas globulaire de notre galaxie.',
Cep:'Céphée est le roi d’Éthiopie, époux de Cassiopée et père d’Andromède. L’étoile Delta de Céphée a donné son nom aux céphéides, des étoiles pulsantes qui servent à mesurer les distances dans l’univers.',
Cet:'La Baleine est le monstre marin Céto, envoyé par Poséidon pour dévorer Andromède. Elle contient Mira, « la merveilleuse », une étoile dont l’éclat varie énormément en moins d’un an.',
Cha:`Le Caméléon est une petite constellation proche du pôle Sud céleste, ${KH}.`,
Cir:`Le Compas est une petite constellation australe, ${LAC}, qui rend hommage aux instruments de dessin.`,
Col:'La Colombe a été dessinée par Petrus Plancius à la fin du XVIe siècle. On y voit la colombe de Noé, ou celle que les Argonautes lâchèrent pour franchir les roches Symplégades.',
Com:'La Chevelure de Bérénice rappelle la reine d’Égypte Bérénice II, qui sacrifia sa chevelure aux dieux pour le retour de son époux. Les cheveux disparurent du temple, et l’astronome Conon affirma qu’ils avaient été placés au ciel. Cette région est riche en galaxies lointaines.',
CrA:'La Couronne australe est un petit arc d’étoiles au pied du Sagittaire, parfois vu comme une couronne de laurier ou de lierre.',
CrB:'La Couronne boréale est la couronne offerte par Dionysos à Ariane lors de leurs noces. Son demi-cercle d’étoiles est l’une des figures les plus élégantes du ciel du printemps.',
Crv:'Le Corbeau est l’oiseau d’Apollon, puni pour avoir menti : il fut condamné à la soif éternelle, placé près de la Coupe sans jamais pouvoir y boire. Ses quatre étoiles forment un quadrilatère facile à repérer.',
Crt:'La Coupe est celle d’Apollon, liée à la légende du Corbeau. Elle repose sur le dos de l’Hydre.',
Cru:'La Croix du Sud est la plus petite des 88 constellations, mais aussi l’une des plus célèbres. Son grand axe indique la direction du pôle Sud céleste, et elle figure sur les drapeaux de l’Australie, de la Nouvelle-Zélande, du Brésil et d’autres pays.',
Cyg:'Le Cygne serait Zeus transformé pour séduire Léda. Il vole le long de la voie lactée, avec Deneb à la queue et la belle étoile double Albireo au bec. Sa forme lui vaut aussi le nom de Croix du Nord.',
Del:'Le Dauphin est l’animal envoyé par Poséidon pour convaincre la néréide Amphitrite de l’épouser. Ce petit losange d’étoiles est facile à reconnaître près de l’Aigle.',
Dor:`La Dorade est une constellation australe ${KH}. Elle abrite la plus grande partie du Grand Nuage de Magellan, une galaxie voisine de la nôtre.`,
Dra:'Le Dragon est Ladon, le gardien des pommes d’or du jardin des Hespérides, tué par Héraclès. Il serpente autour du pôle Nord ; son étoile Thuban était l’étoile polaire à l’époque où l’on construisait les pyramides d’Égypte.',
Equ:'Le Petit Cheval est la deuxième plus petite constellation du ciel. On y voit la tête d’un cheval, parfois considéré comme le frère de Pégase.',
Eri:'L’Éridan est le fleuve céleste dans lequel tomba Phaéton après avoir perdu le contrôle du char du Soleil. Il serpente sur une très grande longueur jusqu’à Achernar, dont le nom signifie « la fin du fleuve ».',
For:`Le Fourneau est une constellation australe ${LAC} ; elle représente un four de chimiste. C’est dans sa direction que le télescope Hubble a réalisé son célèbre champ ultra-profond.`,
Gem:'Les Gémeaux sont Castor et Pollux, les jumeaux Dioscures, protecteurs des marins. Leurs deux étoiles brillantes sont côte à côte. C’est de là que semblent venir les étoiles filantes des Géminides, à la mi-décembre.',
Gru:`La Grue est une constellation australe ${KH}. Son étoile principale est Alnaïr.`,
Her:'Hercule est le héros Héraclès, célèbre pour ses douze travaux. Il abrite le grand amas globulaire M13, vers lequel un message radio a été envoyé depuis la Terre en 1974.',
Hor:`L’Horloge est une constellation australe discrète, ${LAC}, en hommage à l’horloge à pendule.`,
Hya:'L’Hydre est la plus grande des 88 constellations : elle s’étend sur plus d’un quart du ciel. Elle représente le serpent à plusieurs têtes de Lerne, vaincu par Héraclès. Son étoile principale, Alphard, est surnommée « la solitaire ».',
Hyi:`L’Hydre mâle est une constellation proche du pôle Sud, ${KH}. Elle se trouve entre les deux Nuages de Magellan.`,
Ind:`L’Indien est une constellation australe ${KH}. Elle abrite Epsilon Indi, l’une des étoiles les plus proches du Soleil.`,
Lac:`Le Lézard est une petite constellation en zigzag entre le Cygne et Andromède, ${HEV}.`,
Leo:'Le Lion est le lion de Némée, invulnérable, étouffé par Héraclès lors de son premier travail. Sa tête forme une « faucille » bien reconnaissable, terminée par Régulus. Les étoiles filantes des Léonides en jaillissent en novembre.',
LMi:`Le Petit Lion est une constellation discrète au-dessus du Lion, ${HEV}.`,
Lep:'Le Lièvre se cache sous les pieds d’Orion, poursuivi par le chasseur et ses chiens.',
Lib:'La Balance est la seule constellation du zodiaque qui représente un objet. Pour les Grecs, ses étoiles formaient les pinces du Scorpion, ce que rappellent encore leurs noms arabes.',
Lup:'Le Loup est l’animal que le Centaure s’apprête à sacrifier sur l’Autel voisin. Il se trouve dans une partie riche de la voie lactée australe.',
Lyn:`Le Lynx est une constellation très faible, ${HEV}. Selon lui, il fallait des « yeux de lynx » pour la voir.`,
Lyr:'La Lyre est l’instrument d’Orphée, dont la musique charmait les animaux et les pierres. Elle abrite Véga, sommet du Triangle d’été, et la nébuleuse de l’Anneau, reste d’une étoile semblable au Soleil. Les Lyrides filent en avril.',
Men:`La Table est une constellation faible, ${LAC}, qui la nomma d’après la montagne de la Table dominant Le Cap. Elle contient une partie du Grand Nuage de Magellan.`,
Mic:`Le Microscope est une petite constellation australe, ${LAC}.`,
Mon:'La Licorne, dessinée par Petrus Plancius au début du XVIIe siècle, se trouve dans la voie lactée d’hiver, entre Orion et le Petit Chien. Elle abrite la nébuleuse de la Rosette.',
Mus:`La Mouche est une petite constellation au sud de la Croix du Sud, ${KH}.`,
Nor:`La Règle est une petite constellation australe, ${LAC}, qui représente une équerre et une règle de dessinateur.`,
Oct:`L’Octant, ${LAC}, porte le nom d’un instrument de navigation. Il contient le pôle Sud céleste, marqué seulement par une étoile très faible, Sigma de l’Octant.`,
Oph:'Ophiuchus, le « porteur de serpent », représente Asclépios, le dieu de la médecine. Le Soleil la traverse chaque année entre fin novembre et mi-décembre, bien qu’elle ne fasse pas partie des signes traditionnels du zodiaque.',
Ori:'Orion est le chasseur géant de la mythologie grecque, tué par un scorpion ; on dit que les deux constellations ne sont jamais visibles en même temps. Elle réunit Bételgeuse, Rigel et les trois étoiles du Baudrier, et abrite la nébuleuse d’Orion, une pouponnière d’étoiles visible à l’œil nu.',
Pav:`Le Paon est une constellation australe ${KH}. Son étoile principale s’appelle d’ailleurs Peacock, « paon » en anglais.`,
Peg:'Pégase est le cheval ailé né du sang de Méduse. Son Grand Carré est un repère majeur du ciel d’automne. C’est autour de l’étoile 51 Pegasi qu’a été découverte en 1995 la première planète tournant autour d’une étoile semblable au Soleil.',
Per:'Persée est le héros qui trancha la tête de Méduse et délivra Andromède. Son étoile Algol, « la tête du démon », faiblit tous les trois jours environ. Les Perséides, les étoiles filantes du mois d’août, semblent en provenir.',
Phe:`Le Phénix, l’oiseau qui renaît de ses cendres, est une constellation australe ${KH}.`,
Pic:`Le Peintre est une constellation australe ${LAC}, qui représente un chevalet. L’étoile Bêta du Peintre est entourée d’un disque de poussières et de planètes en formation.`,
Psc:'Les Poissons sont Aphrodite et son fils Éros, changés en poissons et liés par une corde pour fuir le monstre Typhon. C’est aujourd’hui dans cette constellation que se trouve le point vernal, où passe le Soleil à l’équinoxe de printemps.',
PsA:'Le Poisson austral boit l’eau que lui verse le Verseau. Son étoile Fomalhaut, dont le nom signifie « la bouche du poisson », est la seule étoile brillante de cette région du ciel d’automne.',
Pup:'La Poupe est l’arrière du navire Argo des Argonautes. Traversée par la voie lactée, elle est riche en amas d’étoiles.',
Pyx:`La Boussole est une petite constellation australe ${LAC}, qui représente un compas de marine.`,
Ret:`Le Réticule est une petite constellation australe ${LAC}, en hommage au réticule de son télescope, qui lui servait à mesurer la position des étoiles.`,
Sge:'La Flèche est la troisième plus petite constellation. On y voit la flèche d’Héraclès, d’Apollon ou d’Éros selon les récits.',
Sgr:'Le Sagittaire est un centaure archer qui vise le cœur du Scorpion. Ses étoiles les plus brillantes dessinent une « théière ». C’est dans sa direction que se trouve le centre de notre galaxie et son trou noir géant, Sagittarius A*.',
Sco:'Le Scorpion est l’animal envoyé pour tuer le chasseur Orion. C’est l’une des rares constellations qui ressemblent vraiment à ce qu’elles représentent, avec sa longue queue recourbée. Son cœur est Antarès, une supergéante rouge.',
Scl:`Le Sculpteur est une constellation australe discrète, ${LAC}. Elle contient le pôle Sud galactique, la direction perpendiculaire au disque de notre galaxie.`,
Sct:'L’Écu de Sobieski a été créé par Hevelius en hommage au roi de Pologne Jean III Sobieski, vainqueur des Ottomans devant Vienne en 1683. Il se trouve dans un nuage d’étoiles très dense de la voie lactée.',
Ser:'Le Serpent est tenu par Ophiuchus, qui le coupe en deux : la Tête et la Queue du Serpent. C’est la seule constellation en deux morceaux. Il abrite la nébuleuse de l’Aigle et ses célèbres « piliers de la création ».',
Sex:`Le Sextant est une constellation faible, ${HEV}, en souvenir de l’instrument qu’il perdit dans l’incendie de son observatoire en 1679.`,
Tau:'Le Taureau est Zeus transformé pour enlever la princesse Europe. Son œil rouge est Aldébaran, et il porte les amas des Pléiades et des Hyades. Il abrite aussi la nébuleuse du Crabe, reste de l’explosion d’étoile observée en 1054.',
Tel:`Le Télescope est une constellation australe discrète, ${LAC}.`,
Tri:'Le Triangle est une petite constellation boréale formée de trois étoiles. Il contient la galaxie du Triangle, l’une des plus proches de la nôtre.',
TrA:`Le Triangle austral est une constellation compacte, ${KH}. Son étoile principale est Atria.`,
Tuc:`Le Toucan est une constellation australe ${KH}. Elle abrite le Petit Nuage de Magellan et le magnifique amas globulaire 47 Tucanae.`,
UMa:'La Grande Ourse est la nymphe Callisto, changée en ourse puis placée au ciel par Zeus. Ses sept étoiles les plus brillantes forment la « Grande Casserole ». En prolongeant le bord de la casserole, on trouve l’étoile polaire.',
UMi:'La Petite Ourse est Arcas, fils de Callisto. L’étoile polaire se trouve au bout de sa queue, à moins d’un degré du pôle Nord céleste : autour d’elle, tout le ciel semble tourner.',
Vel:'Les Voiles sont celles du navire Argo. Elles abritent les restes d’une étoile qui a explosé il y a environ 11 000 ans, dont le cœur est devenu un pulsar.',
Vir:'La Vierge est souvent Déméter, déesse des moissons, ou sa fille Perséphone ; son étoile Spica signifie « l’épi ». C’est la deuxième plus grande constellation du ciel, et elle abrite l’amas de galaxies de la Vierge.',
Vol:`Le Poisson volant est une petite constellation australe ${KH}.`,
Vul:`Le Petit Renard est une constellation faible, ${HEV}. Elle abrite la nébuleuse de l’Haltère, reste d’une étoile en fin de vie.`
};
const STAR_NOTES = {
32349:'C’est l’étoile la plus brillante du ciel nocturne. Elle est accompagnée d’une naine blanche, Sirius B, à peine plus grande que la Terre.',
30438:'C’est la deuxième étoile la plus brillante du ciel. Les sondes spatiales s’en servent souvent de repère pour s’orienter.',
69673:'On la trouve en prolongeant l’arc de la queue de la Grande Ourse. C’est l’étoile la plus brillante de l’hémisphère céleste nord.',
71683:'Avec Toliman et la petite Proxima du Centaure, elle forme le système stellaire le plus proche du Soleil.',
91262:'Elle forme avec Altaïr et Deneb le Triangle d’été. Elle a été l’étoile polaire il y a environ 14 000 ans et le redeviendra dans très longtemps, à cause du lent balancement de l’axe de la Terre.',
24608:'Il s’agit en réalité de deux étoiles géantes jaunes très proches l’une de l’autre, que l’œil ne peut séparer.',
24436:'Cette supergéante bleue marque le pied d’Orion ; elle est des dizaines de milliers de fois plus lumineuse que le Soleil.',
37279:'Son nom signifie « avant le chien », car elle se lève juste avant Sirius. Elle est l’une des étoiles les plus proches du Soleil.',
7588:'Son nom signifie « la fin du fleuve » Éridan. Elle tourne si vite sur elle-même qu’elle est très aplatie.',
27989:'Cette supergéante rouge marque l’épaule d’Orion. Si elle était à la place du Soleil, elle engloutirait les orbites de Mars et probablement de Jupiter. Elle finira en supernova, sans doute d’ici quelques centaines de milliers d’années ; sa baisse d’éclat spectaculaire fin 2019 avait fait le tour du monde.',
68702:'Avec Alpha du Centaure, elle forme les « pointeurs » qui indiquent la direction de la Croix du Sud.',
97649:'Elle tourne sur elle-même en moins de dix heures, ce qui l’aplatit nettement. En Asie, elle représente le Bouvier séparé de la Tisserande (Véga) par la voie lactée, qu’ils ne peuvent traverser qu’une nuit par an.',
60718:'Elle marque le pied de la Croix du Sud ; c’est en réalité un système de plusieurs étoiles.',
21421:'Son nom arabe signifie « celle qui suit », car elle se lève après les Pléiades. Elle marque l’œil rouge du Taureau.',
80763:'Son nom signifie « rival de Mars », à cause de sa couleur rouge. Cette supergéante est le cœur du Scorpion.',
65474:'Son nom signifie « l’épi » que tient la Vierge. Il s’agit de deux étoiles bleues très chaudes qui tournent l’une autour de l’autre en quatre jours.',
37826:'Plus brillante que son jumeau Castor, cette géante orange possède une planète géante découverte en 2006.',
36850:'Castor est en réalité un système de six étoiles liées entre elles.',
113368:'Son nom signifie « la bouche du poisson ». Elle est entourée d’un large anneau de poussières, photographié par les télescopes spatiaux.',
102098:'Cette supergéante blanche, très lointaine, est l’une des étoiles les plus lumineuses que l’on puisse voir à l’œil nu. Elle forme la queue du Cygne et un sommet du Triangle d’été ; sa distance exacte reste incertaine.',
62434:'Elle forme le bras gauche de la Croix du Sud.',
49669:'Son nom signifie « petit roi ». Cœur du Lion, elle se trouve presque sur la route du Soleil et de la Lune, et la Lune passe régulièrement devant elle.',
11767:'C’est l’étoile polaire : elle est à moins d’un degré du pôle Nord céleste, si bien qu’elle semble immobile pendant que tout le ciel tourne autour d’elle. Contrairement à une idée répandue, ce n’est pas l’étoile la plus brillante du ciel.',
14576:'Son nom signifie « la tête du démon ». Son éclat baisse nettement tous les 2 jours et 21 heures, quand une étoile compagne passe devant elle.',
65378:'Avec sa voisine Alcor, elle forme un couple visible à l’œil nu qui servait autrefois de test de vue. Elle fut aussi la première étoile double découverte au télescope, au XVIIe siècle.',
65477:'Alcor est la compagne visible à l’œil nu de Mizar, dans la queue de la Grande Ourse.',
95947:'Au télescope, elle se sépare en deux étoiles aux couleurs contrastées, l’une dorée et l’autre bleue : l’un des plus beaux spectacles du ciel.',
54061:'Avec Merak, elle forme les « gardes » : en prolongeant la ligne qui les relie, on arrive à l’étoile polaire.',
53910:'Avec Dubhe, elle forme les « gardes » qui indiquent la direction de l’étoile polaire.',
26727:'Elle fait partie du Baudrier d’Orion, avec Alnilam et Mintaka, parfois appelées les Trois Rois. Près d’elle se trouve la nébuleuse de la Tête de Cheval.',
26311:'Étoile centrale du Baudrier d’Orion, c’est une supergéante bleue très lointaine et très lumineuse.',
25930:'C’est l’étoile du Baudrier d’Orion la plus proche de l’équateur céleste.',
68756:'Elle était l’étoile polaire il y a environ 4 700 ans, à l’époque de la construction des grandes pyramides d’Égypte.',
17702:'C’est l’étoile la plus brillante des Pléiades, cet amas d’étoiles jeunes que l’on appelle aussi les Sept Sœurs.',
25336:'Son nom signifie « la guerrière ». Elle marque l’épaule gauche d’Orion.',
72607:'Avec sa voisine Pherkad, elle forme les « gardiennes du pôle » qui tournent autour de l’étoile polaire.',
15863:'Elle se trouve au milieu d’un amas d’étoiles jeunes, visible aux jumelles.',
85927:'Elle marque le dard du Scorpion, au bout de sa queue recourbée.',
57632:'Son nom signifie « la queue du Lion ».',
9884:'Elle marque la tête du Bélier.',
677:'Elle forme un coin du Grand Carré de Pégase, bien qu’elle appartienne officiellement à Andromède.',
3179:'Elle fait partie du W de Cassiopée.',
746:'Elle fait partie du W de Cassiopée.',
87833:'Son nom signifie « la tête du dragon ». C’est en l’observant que l’astronome James Bradley découvrit l’aberration de la lumière en 1725.',
86032:'Son nom signifie « la tête du charmeur de serpent ».',
46390:'Son nom signifie « la solitaire », car aucune étoile brillante ne l’entoure. C’est le cœur de l’Hydre.',
107315:'Son nom signifie « le nez » de Pégase.',
113963:'Elle forme un coin du Grand Carré de Pégase.',
100453:'Elle marque le centre de la Croix du Nord, formée par les étoiles du Cygne.',
67301:'Elle marque le bout de la queue de la Grande Ourse.',
62956:'C’est l’étoile la plus brillante de la Grande Ourse.',
61084:'Elle marque le sommet de la Croix du Sud. En prolongeant l’axe de la croix depuis elle, on se dirige vers le pôle Sud céleste.',
92855:'Elle fait partie de la « théière » du Sagittaire.',
90185:'C’est l’étoile la plus brillante du Sagittaire, au bas de sa « théière ».',
50583:'Elle marque la crinière du Lion ; au télescope, c’est une belle étoile double dorée.',
72622:'Son nom signifie « la pince du sud », souvenir de l’époque où la Balance formait les pinces du Scorpion.',
34444:'Cette supergéante jaune, très lointaine, est l’une des étoiles les plus lumineuses de la galaxie visibles à l’œil nu.',
31681:'Elle marque le pied de Pollux dans les Gémeaux.',
25428:'Son nom signifie « celle qui frappe avec les cornes » : elle marque une corne du Taureau.',
27366:'Elle marque le genou droit d’Orion.',
14135:'Son nom signifie « le nez » de la Baleine.',
82273:'C’est l’étoile la plus brillante du Triangle austral.',
100751:'Elle doit son nom à la constellation du Paon.',
109268:'Son nom signifie « la brillante », dans la queue de la Grue.'
};
const SPECT_OVERRIDE = {24608:'G8III'};
const REAL_MOONS = {
  ter:[['Lune','rocheuse',1737,60.3,27.32,'#bdb8ae','Le seul satellite naturel de la Terre. Elle nous montre toujours la même face, et c’est le seul astre sur lequel des humains ont marché.']],
  mar:[['Phobos','cratérisée',11,2.76,.319,'#8a7f73','Une petite lune irrégulière qui tourne plus vite que Mars ne tourne sur elle-même. Elle se rapproche lentement de la planète et finira par se briser.'],
       ['Deimos','cratérisée',6,6.9,1.26,'#9a9084','La plus petite et la plus lointaine des deux lunes de Mars, probablement un astéroïde capturé.']],
  jup:[['Io','volcanique',1822,5.9,1.77,'#dcc04e','Le corps le plus volcanique du système solaire, chauffé par les marées de Jupiter.'],
       ['Europe','à océan gelé',1561,9.4,3.55,'#d9cfb8','Sous sa croûte de glace se cache un océan d’eau liquide, l’un des meilleurs endroits pour chercher la vie ailleurs.'],
       ['Ganymède','glacée',2634,15,7.15,'#a89f93','La plus grande lune du système solaire, plus grande que la planète Mercure.'],
       ['Callisto','cratérisée',2410,26.3,16.69,'#6f675f','L’un des objets les plus criblés de cratères du système solaire.']],
  sat:[['Mimas','cratérisée',198,3.08,.94,'#c9c6c0','Un immense cratère lui donne un air de ressemblance avec l’Étoile de la mort de Star Wars.'],
       ['Encelade','à océan gelé',252,3.95,1.37,'#f1f4f6','Des geysers d’eau jaillissent de son pôle sud, alimentés par un océan souterrain.'],
       ['Téthys','glacée',531,4.89,1.89,'#dedad4','Une lune de glace marquée par un immense canyon.'],
       ['Dioné','glacée',561,6.26,2.74,'#d6d2cc','Une lune glacée striée de falaises brillantes.'],
       ['Rhéa','glacée',764,8.74,4.52,'#cfcac2','La deuxième plus grande lune de Saturne.'],
       ['Titan','brumeuse',2575,20.3,15.95,'#d9a860','La seule lune dotée d’une atmosphère épaisse. Des lacs de méthane liquide couvrent ses régions polaires.'],
       ['Japet','cratérisée',734,61,79.3,'#8f8577','Une face presque noire et une face claire comme la neige lui donnent un aspect unique.']],
  ura:[['Miranda','cratérisée',236,5.1,1.41,'#b8b7b4','Ses falaises, parmi les plus hautes du système solaire, dépassent 10 km.'],
       ['Ariel','glacée',579,7.5,2.52,'#c7c5c2','La plus brillante des lunes d’Uranus.'],
       ['Umbriel','cratérisée',585,10.4,4.14,'#7d7a77','La plus sombre des grandes lunes d’Uranus.'],
       ['Titania','glacée',789,17.1,8.71,'#b5afa8','La plus grande lune d’Uranus.'],
       ['Obéron','cratérisée',761,22.8,13.46,'#a39b93','La plus lointaine des grandes lunes d’Uranus.']],
  nep:[['Protée','cratérisée',210,4.8,1.12,'#8d8a86','Une lune sombre et irrégulière, presque trop grosse pour ne pas être ronde.'],
       ['Triton','glacée',1353,14.3,5.88,'#d9cfc9','Elle tourne à l’envers autour de Neptune : c’est sans doute un objet de la ceinture de Kuiper capturé par la planète. Des geysers d’azote s’échappent de sa surface.']]
};
const REAL_PLANETS = {
  mer:{name:'Mercure', type:'mercure', radius:.383, a:.387, period:88, T:440, moonCount:0, desc:'La plus petite planète et la plus proche du Soleil. Sans atmosphère pour retenir la chaleur, elle passe de plus de 400 °C le jour à −180 °C la nuit. On ne la voit qu’à l’aube ou au crépuscule, toujours près de l’horizon.'},
  ven:{name:'Vénus', type:'venus', radius:.949, a:.723, period:224.7, T:737, moonCount:0, desc:'Presque de la taille de la Terre, mais cachée sous d’épais nuages d’acide sulfurique. Son effet de serre en fait la planète la plus chaude du système solaire, avec 464 °C en surface. C’est l’astre le plus brillant du ciel après le Soleil et la Lune : l’« étoile du Berger ».'},
  ter:{name:'Terre', type:'terre', radius:1, a:1, period:365.25, T:288, moonCount:1, desc:'Notre planète, la seule connue à abriter la vie. Son eau liquide recouvre environ 71 % de sa surface.'},
  mar:{name:'Mars', type:'mars', radius:.532, a:1.524, period:687, T:210, moonCount:2, desc:'La planète rouge doit sa couleur à l’oxyde de fer de son sol. Elle possède le plus haut volcan du système solaire, Olympus Mons, et des traces d’anciennes rivières. Plusieurs robots l’explorent aujourd’hui.'},
  jup:{name:'Jupiter', type:'jupiter', radius:11.21, a:5.203, period:4333, T:165, moonCount:97, rings:{inner:1.4,outer:1.8,col:'150,130,110',a:.35}, desc:'La plus grande planète : plus de 1 300 Terre pourraient y tenir. Sa Grande Tache rouge est une tempête plus large que la Terre, qui souffle depuis des siècles. On lui connaît près d’une centaine de lunes.'},
  sat:{name:'Saturne', type:'saturne', radius:9.45, a:9.537, period:10759, T:134, moonCount:274, rings:{inner:1.24,outer:2.27,col:'225,205,165'}, desc:'Célèbre pour ses anneaux spectaculaires, faits de milliards de morceaux de glace. Elle est si peu dense qu’elle flotterait dans une baignoire géante. Elle détient le record du nombre de lunes connues, plus de 270 en 2025.'},
  ura:{name:'Uranus', type:'uranus', radius:4.01, a:19.19, period:30687, T:76, moonCount:29, rings:{inner:1.6,outer:2,col:'160,170,180',a:.5}, desc:'Une géante de glace qui tourne couchée sur le côté, probablement après une collision géante. Elle a été la première planète découverte au télescope, par William Herschel en 1781.'},
  nep:{name:'Neptune', type:'neptune', radius:3.88, a:30.07, period:60190, T:72, moonCount:16, rings:{inner:1.7,outer:2.5,col:'150,160,175',a:.4}, desc:'La planète la plus lointaine, où soufflent les vents les plus violents du système solaire. Elle a été découverte en 1846 par le calcul, grâce aux travaux d’Urbain Le Verrier, avant même d’être observée.'}
};
const EARTH_CITIES = [['Paris',48.857,2.352],['Lyon',45.76,4.84],['Marseille',43.3,5.37],['Bordeaux',44.84,-.58],['Toulouse',43.6,1.44],['Nantes',47.22,-1.55],['Lille',50.63,3.06],['Strasbourg',48.57,7.75],['Bruxelles',50.85,4.35],['Genève',46.2,6.14],['Montréal',45.5,-73.57],['Londres',51.51,-.13],['Madrid',40.42,-3.7],['Rome',41.9,12.5],['Berlin',52.52,13.4],['Reykjavik',64.15,-21.94],['Moscou',55.76,37.62],['Le Caire',30.04,31.24],['Dakar',14.69,-17.44],['Nairobi',-1.29,36.82],['Le Cap',-33.92,18.42],['New York',40.71,-74.01],['Mexico',19.43,-99.13],['Rio de Janeiro',-22.91,-43.17],['Désert d’Atacama (Chili)',-24.63,-70.4],['Mauna Kea (Hawaï)',19.82,-155.47],['Tokyo',35.68,139.69],['Pékin',39.9,116.41],['Mumbai',19.08,72.88],['Sydney',-33.87,151.21],['Nouméa',-22.27,166.44],['Pôle Nord',89.9,0],['Pôle Sud',-89.9,0]];
const EARTH_PLACES = [['Afrique','continent',5,20],['Europe','continent',52,18],['Asie','continent',48,90],['Amérique du Nord','continent',45,-100],['Amérique du Sud','continent',-15,-60],['Océanie','continent',-25,134],['Antarctique','continent',-80,30],['Océan Atlantique','ocean',25,-40],['Océan Pacifique','ocean',5,-150],['Océan Indien','ocean',-20,78],['Océan Arctique','ocean',82,-20],['Océan Austral','ocean',-60,60],['Mer Méditerranée','sea',35,18]];
const PLANET_EL = {
  mer:[.38709927,.20563593,7.00497902,252.2503235,77.45779628,48.33076593,3.7e-07,1.906e-05,-.00594749,149472.67411175,.16047689,-.12534081],
  ven:[.72333566,.00677672,3.39467605,181.9790995,131.60246718,76.67984255,3.9e-06,-4.107e-05,-.0007889,58517.81538729,.00268329,-.27769418],
  ter:[1.00000261,.01671123,-1.531e-05,100.46457166,102.93768193,0,5.62e-06,-4.392e-05,-.01294668,35999.37244981,.32327364,0],
  mar:[1.52371034,.0933941,1.84969142,-4.55343205,-23.94362959,49.55953891,1.847e-05,7.882e-05,-.00813131,19140.30268499,.44441088,-.29257343],
  jup:[5.202887,.04838624,1.30439695,34.39644051,14.72847983,100.47390909,-.00011607,-.00013253,-.00183714,3034.74612775,.21252668,.20469106],
  sat:[9.53667594,.05386179,2.48599187,49.95424423,92.59887831,113.66242448,-.0012506,-.00050991,.00193609,1222.49362201,-.41897216,-.28867794],
  ura:[19.18916464,.04725744,.77263783,313.23810451,170.9542763,74.01692503,-.00196176,-4.397e-05,-.00242939,428.48202785,.40805281,.04240589],
  nep:[30.06992276,.00859048,1.77004347,-55.12002969,44.96476227,131.78422574,.00026291,5.105e-05,.00035372,218.45945325,-.32241464,-.00508664],
  plu:[39.48211675,.2488273,17.14001206,238.92903833,224.06891629,110.30393684,-.00031596,5.17e-05,4.818e-05,145.20780515,-.04062942,-.01183482]
};
const PLANET_H = {mer:-.42, ven:-4.4, mar:-1.52, jup:-9.4, sat:-8.88, ura:-7.19, nep:-6.87};
const OBLIQ = 23.4393*deg;
function helio(key, T){
  const [a0,e0,i0,L0,W0,N0,da,de,di,dL,dW,dN]=PLANET_EL[key];
  const a=a0+da*T, e=e0+de*T, i=(i0+di*T)*deg, L=L0+dL*T, W=W0+dW*T, N=N0+dN*T;
  let M=(((L-W)%360)+540)%360-180; M*=deg; const w=(W-N)*deg, Nn=N*deg;
  let E=M+e*Math.sin(M); for(let k=0;k<8;k++) E-= (E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
  const xp=a*(Math.cos(E)-e), yp=a*Math.sqrt(1-e*e)*Math.sin(E);
  const cw=Math.cos(w), sw=Math.sin(w), cN=Math.cos(Nn), sN=Math.sin(Nn), ci=Math.cos(i), si=Math.sin(i);
  return [(cw*cN-sw*sN*ci)*xp+(-sw*cN-cw*sN*ci)*yp, (cw*sN+sw*cN*ci)*xp+(-sw*sN+cw*cN*ci)*yp, (sw*si)*xp+(cw*si)*yp];
}
function ceresHelio(JD){
  const a=2.7679724, e=.0757825, i=10.5923*deg, w=72.6541*deg, N=80.3272*deg;
  let M=(138.66222+.21402349*(JD-2457200.5))*deg; M=((M%TAU)+TAU)%TAU;
  let E=M; for(let k=0;k<8;k++) E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
  const xp=a*(Math.cos(E)-e), yp=a*Math.sqrt(1-e*e)*Math.sin(E);
  const cw=Math.cos(w), sw=Math.sin(w), cN=Math.cos(N), sN=Math.sin(N), ci=Math.cos(i), si=Math.sin(i);
  return [(cw*cN-sw*sN*ci)*xp+(-sw*cN-cw*sN*ci)*yp, (cw*sN+sw*cN*ci)*xp+(-sw*sN+cw*cN*ci)*yp, (sw*si)*xp+(cw*si)*yp];
}
function eclToRaDec(x,y,z){ const ye=y*Math.cos(OBLIQ)-z*Math.sin(OBLIQ), ze=y*Math.sin(OBLIQ)+z*Math.cos(OBLIQ); return [Math.atan2(ye,x), Math.atan2(ze,Math.hypot(x,ye))]; }
function currentJD(){ const [y,m,d]=(view.date||todayStr()).split('-').map(Number); const t=new Date(y,m-1,d,0,0,0).getTime()+view.hour*3600e3; return t/864e5+2440587.5; }
function todayStr(){ const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; }

/* ---------- catalogue ---------- */
function specInfo(sp){
  sp=(sp||'').trim(); const c=sp[0]; const col={O:'bleue',B:'bleue',A:'blanche',F:'blanc-jaune',G:'jaune',K:'orange',M:'rouge'}[c];
  if(!col) return {kind:'étoile', col:null};
  const rest=sp.replace(/^[OBAFGKM][0-9.]*:?\s*/,''); let cls='';
  if(/^I(a|b|ab)?(?![IV])/.test(rest)) cls='supergéante'; else if(/^III/.test(rest)) cls='géante'; else if(/^II/.test(rest)) cls='géante lumineuse'; else if(/^IV/.test(rest)) cls='sous-géante'; else if(/^V/.test(rest)) cls='naine';
  if(cls==='naine' || !cls) return {kind: {O:'étoile bleue',B:'étoile bleue',A:'étoile blanche',F:'étoile blanc-jaune',G:'naine jaune',K:'naine orange',M:'naine rouge'}[c], col};
  return {kind: cls+' '+col, col};
}
let EARTH_CACHE=null;
function makeEarthSky(){
  if(EARTH_CACHE) return EARTH_CACHE;
  const ED=EARTH_DATA, stars=[], byId={};
  const consts = ED.cons.map((c,ci)=>{ byId[c.id]=ci; return {id:c.id, name:c.fr, name0:c.fr, gen:c.gen, la:c.la, ra:c.ra*deg, dec:c.dec*deg, members:[], edges:[], alpha:-1, realDesc:CON_TXT[c.id]||'', art:CON_ART[c.id]}; });
  ED.stars.forEach((r,i)=>{ const [ra,dec,mag,bv,hip]=r; const m=ED.meta[hip]||{};
    const t=clamp((bv-.33)/1.75,-1,1);
    const s={i, kind:'star', hip, ra:ra*deg, dec:dec*deg, mag, t, col:starColor(t), name:m.n||null, name0:m.n||null, c: m.c && byId[m.c]!==undefined ? byId[m.c] : -1, ph:(i*2.399)%TAU, sp:.8+(i%7)*.35, meta:m};
    const gen = s.c>=0 ? consts[s.c].gen : '';
    s.desig = m.b ? `${m.b} ${gen}` : m.f ? `${m.f} ${gen}` : null;
    stars.push(s); });
  ED.cons.forEach((c,ci)=>{ const C=consts[ci]; const set=new Set();
    for(const seg of c.l){ for(let k=0;k<seg.length;k++){ set.add(seg[k]); if(k) C.edges.push([seg[k-1],seg[k]]); } }
    C.members=[...set]; C.alpha = C.members.length ? C.members.reduce((a,b)=>stars[a].mag<stars[b].mag?a:b) : -1;
    C.members.forEach(j=>{ if(stars[j].c<0) stars[j].c=ci; }); });
  let rk=0; [...stars].sort((a,b)=>a.mag-b.mag).forEach(s=>{ s.rank=++rk; });
  for(const s of stars){ const m=s.meta; if(!m.d) continue;
    const si=specInfo(SPECT_OVERRIDE[s.hip]||m.s); const lum = m.a!==undefined ? Math.pow(10,(4.83-m.a)/2.5) : 1;
    s.colWord=si.col; s.phys={kind:si.kind, dist:m.d, lum, temp:0, mass:1, giant:/géante/.test(si.kind), cls:(m.s||'G')[0]}; s.spec=m.s; }
  // voie lactée
  const dust=ED.mw.map(([ra,dec,L])=>({ra:ra*deg, dec:dec*deg, r:(.9+L*.25)*deg, col: `rgba(${L>3?'235,220,200':'190,200,235'},${(.012+L*.013).toFixed(3)})`}));
  const nebs=[[83.82,-5.39,1,[225,110,150],.22],[161.27,-59.87,2,[225,110,150],.18],[270.92,-24.38,1.2,[225,120,160],.15],[274.7,-13.8,.8,[200,130,170],.12]].map(([ra,dec,r,c,al])=>({ra:ra*deg, dec:dec*deg, r:r*deg, c, al}));
  // galaxies proches
  const GAL=[['Galaxie d’Andromède',10.68,41.27,'spirale',2.5,220,1000,3,35,.32,3.4,'La grande voisine de notre galaxie, et l’objet le plus lointain visible à l’œil nu : sa lumière a voyagé 2,5 millions d’années pour nous parvenir. Elle se rapproche de la Voie lactée et fusionnera avec elle dans quelques milliards d’années.'],
    ['Galaxie du Triangle',23.46,30.66,'spirale',2.7,60,40,1,23,.6,5.7,'Une petite galaxie spirale du Groupe local, visible à l’œil nu seulement sous un ciel parfaitement noir.'],
    ['Grand Nuage de Magellan',80.89,-69.76,'irreguliere',.16,32,30,9,0,.85,.9,'Une galaxie satellite de la Voie lactée, visible à l’œil nu depuis l’hémisphère Sud comme un nuage détaché de la voie lactée. Elle porte le nom de Magellan, dont l’expédition la décrivit au XVIe siècle.'],
    ['Petit Nuage de Magellan',13.19,-72.83,'irreguliere',.2,19,3,4.5,45,.6,2.7,'La petite sœur du Grand Nuage, une galaxie naine qui tourne autour de la nôtre et se fait lentement déchirer par sa gravité.']];
  GAL.forEach(([n,ra,dec,gt,dm,dk,ns,sz,pa,q,mag,txt],k)=>{ stars.push({i:stars.length, kind:'galaxy', real:true, name:n, name0:n, ra:ra*deg, dec:dec*deg, mag, t:0, col:gt==='spirale'?[215,215,245]:[205,215,255], gtype:gt, distMly:dm, diamKly:dk, nStars:ns, size:sz*deg, pa:pa*deg, q, gkey:'egx|'+k, realDesc:txt, c:-1, ph:0, sp:0}); });
  // système solaire
  for(const k of ['mer','ven','mar','jup','sat','ura','nep']){ const pl=REAL_PLANETS[k]; stars.push({i:stars.length, kind:'planet', real:true, pid:k, ptype:pl.type, name:pl.name, name0:pl.name, ra:0, dec:0, mag:0, t:0, col:PTYPES[pl.type].sky, realDesc:pl.desc, pkey:'ep|'+k, c:-1, ph:0, sp:0}); }
  const sun={i:stars.length, kind:'sun', name:'Soleil', name0:'Soleil', ra:0, dec:0, mag:-26.7, t:.18, col:[255,246,220], c:-1, ph:0, sp:0}; stars.push(sun);
  const moon={i:stars.length, kind:'moon', name:'Lune', name0:'Lune', ra:0, dec:0, mag:-12.7, t:0, col:[240,236,226], c:-1, ph:0, sp:0}; stars.push(moon);
  for(const C of consts){ let x=0,y=0,z=0; C.members.forEach(j=>{ const s=stars[j]; x+=Math.cos(s.dec)*Math.cos(s.ra); y+=Math.cos(s.dec)*Math.sin(s.ra); z+=Math.sin(s.dec); });
    if(C.members.length){ const n=Math.hypot(x,y,z); C.dec=Math.asin(z/n); C.ra=Math.atan2(y,x); } }
  const order = stars.map((s,i)=>i).sort((x,y)=>stars[x].mag-stars[y].mag);
  EARTH_CACHE = {earth:true, stars, order, dust, nebs, consts, hills:[.4,1.9,3.1,5.2], name:'Ciel de la Terre', st:STYLES.celeste, lang:'', sun, moon, maxSize:0, minSize:0};
  return EARTH_CACHE;
}
function earthEphemeris(){
  const JD=currentJD(), T=(JD-2451545)/36525, E=helio('ter',T);
  sky.JD=JD;
  for(const s of sky.stars){ if(s.kind!=='planet') continue;
    const p=helio(s.pid,T), g=[p[0]-E[0],p[1]-E[1],p[2]-E[2]]; [s.ra,s.dec]=eclToRaDec(...g);
    const r=Math.hypot(...p), dl=Math.hypot(...g); s.distAU=dl; s.mag=PLANET_H[s.pid]+5*Math.log10(r*dl) + (s.pid==='sat'?-.4:0); }
  [sky.sun.ra, sky.sun.dec] = eclToRaDec(-E[0],-E[1],-E[2]);
  const d=JD-2451545, L=218.316+13.176396*d, M=(134.963+13.064993*d)*deg, F=(93.272+13.22935*d)*deg, Ms=(357.529+.98560028*d)*deg, Dm=(297.85+12.190749*d)*deg;
  const lam=(L+6.289*Math.sin(M)+1.274*Math.sin(2*Dm-M)+.658*Math.sin(2*Dm)-.186*Math.sin(Ms))*deg, bet=5.128*Math.sin(F)*deg;
  [sky.moon.ra, sky.moon.dec] = eclToRaDec(Math.cos(bet)*Math.cos(lam), Math.cos(bet)*Math.sin(lam), Math.sin(bet));
  const lamS=Math.atan2(-E[1],-E[0]);
  const su=[Math.cos(sky.sun.dec)*Math.cos(sky.sun.ra), Math.cos(sky.sun.dec)*Math.sin(sky.sun.ra), Math.sin(sky.sun.dec)];
  const mo=[Math.cos(sky.moon.dec)*Math.cos(sky.moon.ra), Math.cos(sky.moon.dec)*Math.sin(sky.moon.ra), Math.sin(sky.moon.dec)];
  const ce=clamp(dot(su,mo),-1,1); sky.moon.illum=(1-ce)/2; sky.moon.waxing = ((((lam-lamS)%TAU)+TAU)%TAU) < Math.PI;
  return JD;
}
function earthApplyTime(){
  const JD=earthEphemeris();
  const gmst=((280.46061837+360.98564736629*(JD-2451545))%360)*deg, lst=gmst+obsLon()*deg;
  const phi=obsLat()*deg, sf=Math.sin(phi), cf=Math.cos(phi);
  const rot=o=>{ const ra = o.cel ? Math.atan2(o.cel[1],o.cel[0]) : o.ra, dec = o.cel ? Math.asin(clamp(o.cel[2],-1,1)) : o.dec; if(ra===undefined) return;
    const H=lst-ra, cd=Math.cos(dec), e0=cd*Math.cos(H), e1=-cd*Math.sin(H), e2=Math.sin(dec);
    const d=[e1, e0*cf+e2*sf, -e0*sf+e2*cf]; o.d=d; o.lon=lonOf(d); o.lat=latOf(d); o.eqz=e2; };
  sky.stars.forEach(rot); sky.dust.forEach(rot); sky.nebs.forEach(rot); sky.consts.forEach(rot);
  const alt=sky.sun.lat; sky.day = smooth((alt+13*deg)/(13*deg)); sky.day2 = smooth((alt+1*deg)/(9*deg));
  dirty=true;
}
function moonPhaseName(m){ const k=m.illum;
  if(k<.03) return 'Nouvelle lune'; if(k>.97) return 'Pleine lune';
  if(Math.abs(k-.5)<.06) return m.waxing?'Premier quartier':'Dernier quartier';
  return m.waxing ? (k<.5?'Premier croissant':'Gibbeuse croissante') : (k<.5?'Dernier croissant':'Gibbeuse décroissante'); }
function earthStarText(s){
  const m=s.meta||{}, c=s.c>=0?sky.consts[s.c]:null, parts=[];
  const nm = s.name || s.desig || ('HIP '+s.hip);
  if(s.phys){
    const where = c ? ` dans ${c.art ? c.art+(c.art.endsWith('’')?'':' ') : ''}${c.name}` : '';
    parts.push(`${nm} est une ${s.phys.kind}${where}.`);
    const dist = s.phys.dist<20 ? fr(s.phys.dist,1) : fr(Math.round(s.phys.dist/(s.phys.dist>500?10:1))*(s.phys.dist>500?10:1),0);
    parts.push(`Située à environ ${dist} années-lumière, elle est ${lumText(s.phys.lum)}.`);
  } else if(c) parts.push(`${nm} appartient à la constellation ${c.name}.`);
  if(STAR_NOTES[s.hip]) parts.push(STAR_NOTES[s.hip]);
  if(s.rank<=10 && !STAR_NOTES[s.hip]) parts.push(`C’est la ${s.rank}e étoile la plus brillante du ciel.`);
  return parts.join(' ');
}

/* ---------- lieu d'observation ---------- */
function obsLat(){ if(sky && sky.surface) return sky.surface.lat; return P.mode==='earth' ? (D.elat ?? 48.857) : D.lat; }
function obsLon(){ if(sky && sky.surface) return sky.surface.lon; return P.mode==='earth' ? (D.elon ?? 2.352) : D.lon; }
function setObs(lat,lon){ if(P.mode==='earth'){ D.elat=lat; D.elon=lon; } else { D.lat=lat; D.lon=lon; D.placed=true; } }

/* ---------- la Terre ---------- */
let EARTH_WORLD=null;
function inRing(lon,lat,ring){ let ins=false; for(let i=0,j=ring.length-1;i<ring.length;j=i++){ const [xi,yi]=ring[i],[xj,yj]=ring[j]; if(((yi>lat)!==(yj>lat)) && lon<(xj-xi)*(lat-yi)/(yj-yi)+xi) ins=!ins; } return ins; }
function countryAt(lonD,latD){ for(const c of EARTH_COUNTRIES){ for(const poly of c.p){ let ins=false; for(const ring of poly) if(inRing(lonD,latD,ring)) ins=!ins; if(ins) return c.n; } } return null; }
function oceanAt(lonD,latD){
  if(latD>66) return 'Océan Arctique'; if(latD<-58) return 'Océan Austral';
  if(lonD>-6 && lonD<36 && latD>30 && latD<46) return 'Mer Méditerranée';
  if(lonD>27 && lonD<42 && latD>40 && latD<47) return 'Mer Noire';
  if(lonD>20 && lonD<147 && latD<25 && !(lonD>100 && latD>-10)) return 'Océan Indien';
  if(lonD>-100 && lonD<20 && (lonD>-70 || latD>8)) return 'Océan Atlantique';
  return 'Océan Pacifique';
}
function earthPlaceName(latD,lonD){ return countryAt(lonD,latD) || oceanAt(lonD,latD); }
function makeEarthWorld(){
  if(EARTH_WORLD) return EARTH_WORLD;
  const cw=1024, ch=512, can=document.createElement('canvas'); can.width=cw; can.height=ch; const c=can.getContext('2d');
  const g=c.createLinearGradient(0,0,0,ch); g.addColorStop(0,'#2a5a8c'); g.addColorStop(.5,'#1e4f86'); g.addColorStop(1,'#2a5a8c'); c.fillStyle=g; c.fillRect(0,0,cw,ch);
  const X=l=>(l+180)/360*cw, Y=l=>(90-l)/180*ch;
  const drawPoly=(poly)=>{ c.beginPath(); for(const ring of poly){ ring.forEach(([lo,la],k)=>k?c.lineTo(X(lo),Y(la)):c.moveTo(X(lo),Y(la))); c.closePath(); } };
  for(const ct of EARTH_COUNTRIES){ const ice = ct.n==='Antarctique' || ct.n==='Groenland';
    for(const poly of ct.p){ drawPoly(poly); c.fillStyle = ice ? '#eef2f5' : '#7f9763'; c.fill('evenodd'); c.strokeStyle= ice?'rgba(160,170,180,.6)':'rgba(40,52,30,.55)'; c.lineWidth=.6; c.stroke(); } }
  const img=c.getImageData(0,0,cw,ch);
  const places=[...EARTH_PLACES.map(([n,k,la,lo])=>({kind:k, name:n, lat:la*deg, lon:lo*deg, size:k==='sea'?WN*.03:WN})),
                ...EARTH_CITIES.filter(x=>Math.abs(x[1])<89).map(([n,la,lo])=>({kind:'city', name:n, lat:la*deg, lon:lo*deg, size:1}))];
  EARTH_WORLD = {earth:true, name:'Terre', canvas:can, px:img.data, cw, ch, places, key:'earth',
    desc:'Notre planète : un monde recouvert d’eau à 71 %, où l’on observe le ciel depuis tous les continents. Touche un endroit ou choisis une ville pour voir le ciel tel qu’il apparaît depuis là-bas, à la date et à l’heure choisies.'};
  return EARTH_WORLD;
}

/* ---------- système solaire ---------- */
function realBody(pid){
  return cached('rb|'+pid, ()=>{ const pl=REAL_PLANETS[pid];
    const p={id:uid(), kind:'planet', name:pl.name, type:pl.type, a:pl.a, T:pl.T, period:pl.period, radius:pl.radius, seedN:hashStr(pl.name), angle0:0, habitable:false, rings:pl.rings||null, moonCount:pl.moonCount, desc:pl.desc};
    p.moons=(REAL_MOONS[pid]||[]).map(([n,t,r,d,per,col,desc],k)=>({id:uid(), kind:'moon', name:n, mtype:t, radiusKm:r, dist:d, period:per, angle0:k*2.1, col, parent:pl.name, desc}));
    return p; });
}
function realSolarSystem(){
  const JD=currentJD(), T=(JD-2451545)/36525, r=mulberry32(7);
  const sun={id:'sun', kind:'sysstar', name:'Soleil', phys:{kind:'naine jaune', lum:1, temp:5772, dist:0, mass:1, cls:'G', giant:false}, t:.18, col:[255,244,214],
    desc:'Notre étoile, une naine jaune ordinaire âgée d’environ 4,6 milliards d’années. Elle contient 99,8 % de la masse du système solaire. Sa lumière met un peu plus de 8 minutes pour atteindre la Terre. Les positions des planètes ci-contre sont celles de la date choisie.',
    facts:[['Âge','environ 4,6 milliards d’années'],['Rayon','109 × Terre'],['Masse','333 000 × Terre'],['Température de surface','5 772 K'],['Distance à la Terre','150 millions de km']]};
  const planets=['mer','ven','ter','mar','jup','sat','ura','nep'].map(k=>{ const b=realBody(k); const h=helio(k,T); return {...b, angle0:Math.atan2(h[1],h[0])}; });
  const mk=(name,a1,a2,icy,np,desc)=>{ const b={id:uid(), kind:'belt', name, a1, a2, icy, desc, parts:[]}; for(let k=0;k<np;k++) b.parts.push([r(), r()*TAU, .6+r()*1.2]); return b; };
  const belts=[mk('Ceinture principale',2.2,3.3,false,380,'Entre Mars et Jupiter tournent des millions d’astéroïdes rocheux et métalliques. Leur masse totale ne représente pourtant que quelques pour cent de celle de la Lune.'),
               mk('Ceinture de Kuiper',30,50,true,500,'Au-delà de Neptune s’étend un vaste anneau de corps glacés, restes de la formation du système solaire. Pluton en est le membre le plus célèbre.')];
  const ce=ceresHelio(JD), pl=helio('plu',T);
  const dwarfs=[{id:uid(), kind:'dwarf', name:'Cérès', a:2.77, period:1682, angle0:Math.atan2(ce[1],ce[0]), radiusKm:470, desc:'Le plus gros objet de la ceinture principale, classé planète naine. La sonde Dawn y a découvert des dépôts de sel brillants.'},
                {id:uid(), kind:'dwarf', name:'Pluton', a:39.5, period:90560, angle0:Math.atan2(pl[1],pl[0]), radiusKm:1188, desc:'Considérée comme la neuvième planète jusqu’en 2006, Pluton est aujourd’hui une planète naine. La sonde New Horizons y a photographié en 2015 une grande plaine de glace en forme de cœur. Elle possède cinq lunes, dont Charon.'}];
  const comets=[{id:uid(), kind:'comet', name:'Comète de Halley', q:.586, Q:35.1, am:17.83, e:.967, w:169.7*deg, M0:TAU*(JD-2446470.5)/(75.3*365.25), period:75.3*365.25,
    desc:'La plus célèbre des comètes, visible à l’œil nu tous les 75 à 76 ans. Son dernier passage près du Soleil date de 1986 ; le prochain aura lieu en 2061.'}];
  return {star:sun, planets, belts, dwarfs, comets, companion:null, aMax:50, starR:18, hz:1, real:true};
}
