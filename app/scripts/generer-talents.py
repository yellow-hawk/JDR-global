# Génère app/src/noyau/regles/dnd5e/talents.json (lancer : python app/scripts/generer-talents.py) : 6 grands arbres ramifiés (tronc, branches, fourches, jonctions).
# Notation d'un talent : (clé, branche, icône, nom, texte, effets, requis, au_moins_un, sorte)
#   effets : "ca+1, attaque+1" ; requis / au_moins_un : clés séparées par des espaces ; sorte : '' | 'jonction' | 'sommet'
import json, os

NIVEAU = {1: 1, 2: 1, 3: 3, 4: 5, 5: 7, 6: 9, 7: 11, 8: 13, 9: 15}
COUT = {'': 1, 'jonction': 2, 'sommet': 3}

def effets(t):
    res = []
    for p in [x.strip() for x in t.split(',') if x.strip()]:
        i = max(p.rfind('+'), p.rfind('-'))
        res.append({'cible': p[:i], 'valeur': int(p[i:])})
    return res

def arbre(id_, nom, texte, pour, branches, noeuds, magie=None):
    magie = magie or {}
    par = {}
    for (cle, br, ic, n, tx, ef, rq, un, sorte) in noeuds:
        par[cle] = dict(cle=cle, br=br, ic=ic, nom=n, texte=tx, ef=effets(ef), rq=rq.split(), un=un.split(), sorte=sorte)
    rang = {}
    def r(c):
        if c in rang: return rang[c]
        n = par[c]
        a = [r(x) for x in n['rq']]
        b = [r(x) for x in n['un']]
        v = 1 + max([0] + a + ([min(b)] if b else []))
        rang[c] = v
        return v
    out = []
    for bid, bnom, coul in branches:
        nds = []
        for c, n in par.items():
            if n['br'] != bid: continue
            node = {
                'id': f'{id_}.{c}', 'nom': n['nom'], 'texte': n['texte'], 'rang': r(c), 'niveau': NIVEAU[min(9, r(c))],
                'cout': COUT[n['sorte']], 'requis': [f'{id_}.{x}' for x in n['rq']], 'icone': n['ic'],
            }
            if n['un']: node['requisUn'] = [f'{id_}.{x}' for x in n['un']]
            if n['ef']: node['effets'] = n['ef']
            if n['sorte']: node['sorte'] = n['sorte']
            if c in magie: node['magie'] = magie[c]
            nds.append(node)
        nds.sort(key=lambda x: x['rang'])
        out.append({'id': f'{id_}.{bid}', 'nom': bnom, 'couleur': coul, 'noeuds': nds})
    # contrôles
    for n in par.values():
        for x in n['rq'] + n['un']:
            assert x in par, (id_, n['cle'], x)
    assert all(any(n['br'] == b[0] for n in par.values()) for b in branches), id_
    return {'id': id_, 'nom': nom, 'texte': texte, 'pour': pour, 'branches': out}

T = []

# ---------------------------------------------------------------- Voie du fer
T.append(arbre('fer', 'Voie du fer', 'Les combattants : la lame, le bouclier, la fureur, la chasse, le corps et le commandement. Le tronc ouvre toutes les branches ; les jonctions relient deux branches voisines.',
  {'classes': ['guerrier', 'barbare', 'paladin', 'rodeur', 'moine']},
  [('tronc', 'Tronc', '#8a6a4a'), ('bouclier', 'Bouclier', '#3f73b8'), ('lame', 'Lame', '#c0392b'), ('fureur', 'Fureur', '#d35400'),
   ('chasse', 'Chasse', '#27ae60'), ('corps', 'Corps', '#16a085'), ('commandement', 'Commandement', '#8e44ad')],
  [
  ('racine', 'tronc', '⚔️', 'Discipline du combattant', "Des années d'exercice : +1 à l'initiative.", 'initiative+1', '', '', ''),
  # Bouclier
  ('b1', 'bouclier', '🛡️', 'Garde haute', '+1 à la CA.', 'ca+1', 'racine', '', ''),
  ('b2', 'bouclier', '🪨', 'Inébranlable', "+1 aux sauvegardes de CON ; avantage contre la chute à terre et les poussées.", 'sauvegarde.con+1', 'b1', '', ''),
  ('b3', 'bouclier', '🧱', 'Mur de boucliers', "Réaction : une attaque contre un allié adjacent subit le désavantage.", '', 'b2', '', ''),
  ('b3b', 'bouclier', '🐂', 'Peau de cuir', '+1 PV par niveau.', 'pvParNiveau+1', 'b2', '', ''),
  ('b4', 'bouclier', '🏰', 'Rempart vivant', '+1 à la CA ; les alliés derrière vous ont un abri partiel.', 'ca+1', 'b3', '', ''),
  ('b4b', 'bouclier', '❤️‍🩹', 'Second souffle', "Une fois par repos court, en action bonus : regagnez 1d10 + niveau PV.", '', 'b3b', '', ''),
  ('b5', 'bouclier', '🗿', 'Forteresse', "Résistance aux dégâts contondants, perforants et tranchants non magiques tant que vous avez plus de la moitié de vos PV.", '', 'b4', 'b4b', 'sommet'),
  # Lame
  ('l1', 'lame', '🗡️', 'Frappe assurée', "+1 aux jets d'attaque avec les armes.", 'attaque+1', 'racine', '', ''),
  ('l2', 'lame', '💥', 'Coup puissant', '+1 aux dégâts des armes.', 'degats+1', 'l1', '', ''),
  ('l3', 'lame', '↩️', 'Riposte', "Réaction : quand un ennemi vous rate au corps à corps, attaquez-le.", '', 'l2', '', ''),
  ('l3b', 'lame', '🔨', 'Brise-garde', "Sur un coup critique, la cible perd 2 points de CA jusqu'à la fin de votre prochain tour.", '', 'l2', '', ''),
  ('l4', 'lame', '🌪️', "Tempête d'acier", 'Une fois par repos court, faites une attaque supplémentaire pendant votre action.', '', 'l3', '', ''),
  ('l5', 'lame', '👑', "Maître d'armes", "+1 à l'attaque et aux dégâts ; choisissez une arme : ses critiques se font sur 19-20.", 'attaque+1, degats+1', 'l4', '', 'sommet'),
  # Fureur
  ('f1', 'fureur', '🔥', 'Sang chaud', "Sous la moitié de vos PV, +2 aux dégâts au corps à corps.", '', 'racine', '', ''),
  ('f2', 'fureur', '📣', 'Cri de guerre', "Action bonus, une fois par repos court : les ennemis à 3 cases font un jet de SAG (DD 8 + maîtrise + FOR) ou sont effrayés 1 round. +1 en Intimidation.", 'competence.intimidation+1', 'f1', '', ''),
  ('f3', 'fureur', '🩸', 'Insensible à la douleur', '+1 PV par niveau.', 'pvParNiveau+1', 'f2', '', ''),
  ('f3b', 'fureur', '🐗', 'Charge brutale', "Après 4 cases en ligne droite, votre attaque fait tomber la cible à terre si elle rate un jet de FOR.", '', 'f2', '', ''),
  ('f4', 'fureur', '😤', 'Colère sans fin', "Immunité à l'effroi pendant une rage ou un combat entamé ; +1 aux sauvegardes de SAG.", 'sauvegarde.sag+1', 'f3', '', ''),
  ('f5', 'fureur', '🌋', 'Avatar de la bataille', "Une fois par repos long, pendant 1 minute : +2 aux dégâts, avantage aux jets de FOR, vitesse +2 cases.", '', 'f4', 'f3b', 'sommet'),
  # Chasse
  ('c1', 'chasse', '🦅', 'Œil de faucon', '+1 en Perception.', 'competence.perception+1', 'racine', '', ''),
  ('c2', 'chasse', '🏹', 'Tir précis', "Les abris partiels n'apportent plus de bonus de CA contre vos tirs.", '', 'c1', '', ''),
  ('c3', 'chasse', '🐾', 'Pas léger', '+1 case de vitesse ; aucune trace en terrain naturel.', 'vitesse+1', 'c2', '', ''),
  ('c3b', 'chasse', '🎯', 'Proie marquée', "Action bonus, une fois par repos court : +1d4 aux dégâts contre une cible pendant 1 minute.", '', 'c2', '', ''),
  ('c4', 'chasse', '🌧️', 'Volée', "Une fois par repos court, attaquez à distance toutes les créatures choisies dans un rayon de 2 cases.", '', 'c3b', '', ''),
  ('c5', 'chasse', '🐺', "Rien ne m'échappe", "+2 à l'initiative ; avantage aux attaques contre votre proie marquée.", 'initiative+2', 'c4', 'c3', 'sommet'),
  # Corps
  ('k1', 'corps', '🤸', 'Athlète', '+1 en Athlétisme.', 'competence.athletisme+1', 'racine', '', ''),
  ('k2', 'corps', '🦶', 'Pieds agiles', '+1 en Acrobaties ; se relever ne coûte que 1 case.', 'competence.acrobaties+1', 'k1', '', ''),
  ('k3', 'corps', '✋', 'Parade à mains nues', "Réaction : réduisez les dégâts d'une attaque au corps à corps de 1d6 + DEX.", '', 'k2', '', ''),
  ('k3b', 'corps', '💨', 'Course du vent', '+1 case de vitesse ; le terrain difficile ne vous ralentit plus en courant.', 'vitesse+1', 'k2', '', ''),
  ('k4', 'corps', '🪨', 'Corps de pierre', '+1 aux sauvegardes de FOR et de DEX.', 'sauvegarde.for+1, sauvegarde.dex+1', 'k3', '', ''),
  ('k5', 'corps', '☯️', 'Harmonie parfaite', "Immunité aux maladies et aux poisons non magiques ; une fois par repos long, réussissez une sauvegarde ratée.", '', 'k4', 'k3b', 'sommet'),
  # Commandement
  ('o1', 'commandement', '🎖️', "Voix d'officier", '+1 en Persuasion ; vos ordres portent dans le vacarme.', 'competence.persuasion+1', 'racine', '', ''),
  ('o2', 'commandement', '🛡️', 'Formation serrée', "Un allié adjacent gagne +1 à la CA tant qu'il reste à côté de vous.", '', 'o1', '', ''),
  ('o3', 'commandement', '📯', 'Ordre tactique', "Action bonus, une fois par repos court : un allié se déplace de la moitié de sa vitesse sans attaque d'opportunité.", '', 'o2', '', ''),
  ('o4', 'commandement', '✨', 'Inspiration au combat', "Une fois par repos court : les alliés à 6 cases gagnent des PV temporaires égaux à votre niveau.", '', 'o3', '', ''),
  ('o5', 'commandement', '🏳️', 'Seigneur de guerre', "+2 à l'initiative ; les alliés à 6 cases ont +1 aux sauvegardes.", 'initiative+2', 'o4', '', 'sommet'),
  # Jonctions
  ('j1', 'lame', '🛡️', 'Rempart et glaive', "Quand Mur de boucliers fait rater une attaque, attaquez l'agresseur (sans réaction supplémentaire).", '', 'b3 l3', '', 'jonction'),
  ('j2', 'fureur', '⚒️', 'Fureur disciplinée', "Pendant Avatar ou une rage, vos attaques gagnent +1 et vous gardez votre lucidité (ordres, sorts de soutien).", 'attaque+1', 'l3b f3b', '', 'jonction'),
  ('j3', 'chasse', '🐻', 'Chasseur de géants', '+1d6 aux dégâts contre les créatures de taille Grande ou plus.', '', 'f3 c3b', '', 'jonction'),
  ('j4', 'corps', '🍃', 'Danse des lames', "Après une riposte ou une parade, déplacez-vous de 2 cases sans attaque d'opportunité.", '', 'c3 k3', '', 'jonction'),
  ('j5', 'commandement', '🤝', 'Frères d’armes', "Quand un allié adjacent tombe à 0 PV, vous pouvez attaquer en réaction et il reste à 1 PV une fois par repos long.", '', 'k3b o3', '', 'jonction'),
  ('j6', 'bouclier', '⚜️', 'Bannière', "Les alliés qui voient votre bannière ont l'avantage contre l'effroi ; +1 à la CA tant que vous la portez.", 'ca+1', 'o2 b3b', '', 'jonction'),
  ]))

# ---------------------------------------------------------------- Voie de l'ombre
T.append(arbre('ombre', "Voie de l'ombre", "Les gens de l'ombre : furtivité, lames sournoises, doigts agiles, belles paroles, acrobaties et réseau d'informateurs.",
  {'classes': ['roublard', 'barde', 'rodeur', 'occultiste', 'moine']},
  [('tronc', 'Tronc', '#5d5d6e'), ('furtivite', 'Furtivité', '#2c3e50'), ('lames', 'Lames sournoises', '#922b21'), ('doigts', 'Doigts agiles', '#b7950b'),
   ('langue', "Langue d'argent", '#a93226'), ('acrobate', 'Acrobate', '#148f77'), ('reseau', 'Réseau', '#6c3483')],
  [
  ('racine', 'tronc', '👁️', 'Sixième sens', "Vous sentez venir les ennuis : +1 à l'initiative.", 'initiative+1', '', '', ''),
  ('s1', 'furtivite', '🐈‍⬛', 'Pas feutrés', '+1 en Discrétion.', 'competence.discretion+1', 'racine', '', ''),
  ('s2', 'furtivite', '🌫️', 'Fondu dans la foule', "Dans une foule ou un marché, vous pouvez vous cacher même à la vue de tous.", '', 's1', '', ''),
  ('s3', 'furtivite', '🌑', 'Ombre parmi les ombres', "Vous pouvez vous cacher dans une simple pénombre.", '', 's2', '', ''),
  ('s3b', 'furtivite', '🕯️', 'Souffle retenu', "Immobile, vous restez caché même si l'on passe à côté de vous ; avantage pour écouter aux portes.", '', 's2', '', ''),
  ('s4', 'furtivite', '🫥', 'Disparition', "Action bonus, une fois par repos court : invisible jusqu'à votre prochaine attaque ou la fin de votre prochain tour.", '', 's3', '', ''),
  ('s5', 'furtivite', '👻', 'Fantôme', "Vous traversez l'espace des créatures hostiles ; vos pas ne font aucun bruit ; avantage permanent pour vous cacher.", '', 's4', 's3b', 'sommet'),
  ('a1', 'lames', '🔪', 'Lame vicieuse', '+1 aux dégâts des armes légères et à distance.', 'degats+1', 'racine', '', ''),
  ('a2', 'lames', '🧪', 'Connaisseur des poisons', "+1 en Médecine ; vous préparez une dose de poison léger (1d4) par repos long.", 'competence.medecine+1', 'a1', '', ''),
  ('a3', 'lames', '🎯', 'Point faible', "+1 aux attaques contre une créature surprise, à terre ou entravée.", 'attaque+1', 'a2', '', ''),
  ('a3b', 'lames', '🩸', 'Saignée', "Sur un coup critique, la cible saigne : 1d4 dégâts au début de ses tours jusqu'à des soins.", '', 'a2', '', ''),
  ('a4', 'lames', '⚰️', 'Coup de grâce', "Contre une créature surprise, vos dégâts d'arme sont doublés au premier coup.", '', 'a3', '', ''),
  ('a5', 'lames', '🦂', 'Assassin', "Une fois par repos long, une créature que vous touchez par surprise fait un jet de CON (DD 8 + maîtrise + DEX) ou tombe à 0 PV si elle a moins de PV que votre niveau × 5.", '', 'a4', 'a3b', 'sommet'),
  ('d1', 'doigts', '🪙', 'Doigts de fée', '+1 en Escamotage.', 'competence.escamotage+1', 'racine', '', ''),
  ('d2', 'doigts', '🔓', 'Crocheteur', "Avantage pour crocheter serrures et cadenas ; deux fois plus vite.", '', 'd1', '', ''),
  ('d3', 'doigts', '🪤', 'Désamorceur', "+1 en Investigation ; avantage pour repérer et désamorcer les pièges.", 'competence.investigation+1', 'd2', '', ''),
  ('d3b', 'doigts', '👛', 'Vol à la tire', "Action bonus : prenez un petit objet sur une créature adjacente si elle rate un jet de Perception contre votre Escamotage.", '', 'd2', '', ''),
  ('d4', 'doigts', '🧤', 'Main lestée', "Utiliser un objet, crocheter ou désamorcer se fait en action bonus.", '', 'd3', 'd3b', ''),
  ('d5', 'doigts', '💎', 'Maître cambrioleur', "Aucune serrure non magique ne vous résiste plus d'une minute ; vous sentez les compartiments secrets.", '', 'd4', '', 'sommet'),
  ('g1', 'langue', '🎭', 'Belle parole', '+1 en Tromperie.', 'competence.tromperie+1', 'racine', '', ''),
  ('g2', 'langue', '🍷', 'Charmeur', '+1 en Persuasion.', 'competence.persuasion+1', 'g1', '', ''),
  ('g3', 'langue', '🎪', 'Mille visages', "Avec dix minutes et quelques fards, vous vous déguisez en n'importe quel humanoïde de votre taille.", '', 'g2', '', ''),
  ('g3b', 'langue', '🗯️', 'Mot cinglant', "Réaction, une fois par repos court : une créature qui vous entend a le désavantage à son prochain jet.", '', 'g2', '', ''),
  ('g4', 'langue', '🎶', 'Charisme magnétique', '+1 au Charisme.', 'carac.cha+1', 'g3', 'g3b', ''),
  ('g5', 'langue', '🌟', 'Légende vivante', "+1 en Représentation ; dans toute ville, quelqu'un a entendu parler de vous et vous doit un service.", 'competence.representation+1', 'g4', '', 'sommet'),
  ('x1', 'acrobate', '🤾', 'Équilibriste', '+1 en Acrobaties.', 'competence.acrobaties+1', 'racine', '', ''),
  ('x2', 'acrobate', '🧗', 'Grimpeur', "Escalader ne vous ralentit pas ; chute réduite de 3 cases.", '', 'x1', '', ''),
  ('x3', 'acrobate', '💨', 'Fuite éclair', '+1 case de vitesse.', 'vitesse+1', 'x2', '', ''),
  ('x3b', 'acrobate', '🙅', 'Esquive instinctive', "Réaction : divisez par deux les dégâts d'une attaque que vous voyez venir.", '', 'x2', '', ''),
  ('x4', 'acrobate', '⚡', 'Réflexes surhumains', "+1 à l'initiative et aux sauvegardes de DEX.", 'initiative+1, sauvegarde.dex+1', 'x3b', '', ''),
  ('x5', 'acrobate', '🌀', 'Danse du vent', "Se désengager et se cacher sont toujours des actions bonus ; les attaques d'opportunité contre vous ont le désavantage.", '', 'x4', 'x3', 'sommet'),
  ('r1', 'reseau', '👂', 'Lire les gens', '+1 en Intuition.', 'competence.intuition+1', 'racine', '', ''),
  ('r2', 'reseau', '📜', 'Contacts', "Dans chaque ville visitée, vous avez un contact qui connaît les rumeurs (le MJ en donne une utile).", '', 'r1', '', ''),
  ('r3', 'reseau', '✉️', 'Chantage', "Avantage aux jets de Charisme contre une personne dont vous connaissez un secret.", '', 'r2', '', ''),
  ('r3b', 'reseau', '🏚️', 'Refuge de la guilde', "Une planque sûre dans chaque grande ville : repos, soins de base, informations.", '', 'r2', '', ''),
  ('r4', 'reseau', '🕸️', 'Toile d’informateurs', "Une fois par séance, apprenez où se trouve une personne ou un objet dans la région.", '', 'r3', 'r3b', ''),
  ('r5', 'reseau', '🎩', 'Maître-espion', "Vous dirigez un réseau : des agents agissent pour vous entre les séances ; avantage pour démasquer un mensonge.", '', 'r4', '', 'sommet'),
  ('j1', 'lames', '🌘', "Lame dans l'ombre", "Attaquer depuis la cachette ne vous révèle qu'à la fin de votre tour.", '', 's3 a3', '', 'jonction'),
  ('j2', 'doigts', '🎒', 'Voleur acrobate', "Vous dérobez un objet porté en vous déplaçant, sans action, une fois par tour.", '', 'd3b x3', '', 'jonction'),
  ('j3', 'langue', '🃏', 'Comédien', "Votre déguisement tient même face aux proches de la personne imitée ; avantage aux jets de Tromperie déguisé.", '', 'g3 r2', '', 'jonction'),
  ('j4', 'reseau', '🗝️', 'Ombre et murmure', "Vous apprenez les secrets d'une cible en la suivant une journée sans être vu.", '', 's3b r3', '', 'jonction'),
  ('j5', 'acrobate', '🪃', 'Lame dansante', "Après avoir esquivé une attaque, votre prochaine attaque ce round inflige +1d6 dégâts.", '', 'a3b x3b', '', 'jonction'),
  ('j6', 'furtivite', '🪞', 'Double vie', "Une seconde identité solide, avec papiers et logis ; on ne fait pas le lien.", '', 'g3b s2', '', 'jonction'),
  ]))

# ---------------------------------------------------------------- Voie des arcanes
T.append(arbre('arcanes', 'Voie des arcanes', "Les lanceurs de sorts : évocation, protection, précision, érudition, pacte et sang, alchimie.",
  {'classes': ['magicien', 'ensorceleur', 'occultiste', 'barde']},
  [('tronc', 'Tronc', '#4a3a8a'), ('evocation', 'Évocation', '#c0392b'), ('abjuration', 'Abjuration', '#2e86c1'), ('precision', 'Précision', '#7d3c98'),
   ('erudition', 'Érudition', '#9a7d0a'), ('pacte', 'Pacte et sang', '#922b21'), ('alchimie', 'Alchimie', '#1e8449')],
  [
  ('racine', 'tronc', '📖', 'Esprit érudit', '+1 en Arcanes.', 'competence.arcanes+1', '', '', ''),
  ('e1', 'evocation', '🔥', 'Étincelle', '+1 aux dégâts des sorts.', 'degats.sort+1', 'racine', '', ''),
  ('e2', 'evocation', '🎇', 'Sorts sculptés', "Vos sorts de zone épargnent jusqu'à deux alliés de votre choix.", '', 'e1', '', ''),
  ('e3', 'evocation', '⚡', 'Puissance brute', '+1 aux dégâts des sorts.', 'degats.sort+1', 'e2', '', ''),
  ('e3b', 'evocation', '❄️', 'Élément de prédilection', "Choisissez feu, froid ou foudre : vos sorts de cet élément ignorent la résistance.", '', 'e2', '', ''),
  ('e4', 'evocation', '☄️', 'Surcharge', "Une fois par repos long, les dés de dégâts d'un sort donnent leur maximum.", '', 'e3', '', ''),
  ('e5', 'evocation', '🌋', 'Cataclysme', "Une fois par repos long, doublez la zone d'un sort de dégâts ; +1 aux dégâts des sorts.", 'degats.sort+1', 'e4', 'e3b', 'sommet'),
  ('p1', 'abjuration', '🔰', 'Garde arcanique', "Quand vous lancez un sort de protection, vous gagnez 2 PV temporaires par niveau du sort.", '', 'racine', '', ''),
  ('p2', 'abjuration', '🧿', 'Esprit fortifié', '+1 aux sauvegardes de SAG.', 'sauvegarde.sag+1', 'p1', '', ''),
  ('p3', 'abjuration', '🛡️', 'Bouclier réflexe', '+1 à la CA.', 'ca+1', 'p2', '', ''),
  ('p3b', 'abjuration', '🚫', 'Contresort facile', "Avantage aux jets pour contrer ou dissiper un sort.", '', 'p2', '', ''),
  ('p4', 'abjuration', '🌐', 'Résistance aux sorts', "Avantage aux sauvegardes contre les sorts.", '', 'p3', 'p3b', ''),
  ('p5', 'abjuration', '💠', 'Inviolable', "Une fois par repos long, annulez un sort qui vous vise (niveau 5 ou moins).", '', 'p4', '', 'sommet'),
  ('v1', 'precision', '🎯', 'Visée arcanique', "+1 aux jets d'attaque des sorts.", 'attaque.sort+1', 'racine', '', ''),
  ('v2', 'precision', '🧘', 'Concentration de fer', '+1 aux sauvegardes de CON (maintien de la concentration).', 'sauvegarde.con+1', 'v1', '', ''),
  ('v3', 'precision', '🔮', 'Esprit focalisé', '+1 au DD de vos sorts.', 'dd+1', 'v2', '', ''),
  ('v3b', 'precision', '⏩', 'Sort rapide', "Une fois par repos court, lancez un sort d'une action en action bonus.", '', 'v2', '', ''),
  ('v4', 'precision', '📐', 'Portée étendue', "Doublez la portée de vos sorts (au moins 6 cases).", '', 'v3', '', ''),
  ('v5', 'precision', '🌠', 'Maîtrise des formules', "+1 au DD et à l'attaque de vos sorts.", 'dd+1, attaque.sort+1', 'v4', 'v3b', 'sommet'),
  ('u1', 'erudition', '🏛️', 'Mémoire des siècles', '+1 en Histoire.', 'competence.histoire+1', 'racine', '', ''),
  ('u2', 'erudition', '🔍', 'Esprit analytique', '+1 en Investigation.', 'competence.investigation+1', 'u1', '', ''),
  ('u3', 'erudition', '🗣️', 'Polyglotte', "Apprenez deux langues ; vous déchiffrez les écritures anciennes avec du temps.", '', 'u2', '', ''),
  ('u3b', 'erudition', '📚', 'Rituels', "Lancez vos sorts rituels sans dépenser d'emplacement (10 minutes de plus).", '', 'u2', '', ''),
  ('u4', 'erudition', '🧠', 'Bibliothèque intérieure', "Une fois par séance, le MJ vous livre un fait sûr sur une créature, un lieu ou un objet magique.", '', 'u3', 'u3b', ''),
  ('u5', 'erudition', '🎓', 'Archimage', "+1 à l'Intelligence.", 'carac.int+1', 'u4', '', 'sommet'),
  ('s1', 'pacte', '🩸', 'Sang ancien', "+1 PV par niveau : une lignée surnaturelle coule en vous.", 'pvParNiveau+1', 'racine', '', ''),
  ('s2', 'pacte', '🕯️', 'Marque du patron', "Une fois par repos court, maudissez une cible : -1d4 à ses sauvegardes contre vos sorts.", '', 's1', '', ''),
  ('s3', 'pacte', '🔋', 'Puits de magie', "Une fois par repos long, récupérez un emplacement de sort de niveau 2 au plus.", '', 's2', '', ''),
  ('s3b', 'pacte', '🌫️', "Souffle de l'au-delà", "Vous voyez dans le noir magique à 6 cases ; avantage contre l'effroi.", '', 's2', '', ''),
  ('s4', 'pacte', '👁️‍🗨️', 'Faveur ténébreuse', "Quand vous réduisez un ennemi à 0 PV, gagnez des PV temporaires égaux à votre niveau.", '', 's3', 's3b', ''),
  ('s5', 'pacte', '🐉', 'Héritier', "+1 au Charisme ; une fois par repos long, une forme draconique, fiélonne ou céleste pendant 1 minute (vol 6 cases).", 'carac.cha+1', 's4', '', 'sommet'),
  ('a1', 'alchimie', '⚗️', 'Apprenti alchimiste', "Vous identifiez potions et poisons en une minute.", '', 'racine', '', ''),
  ('a2', 'alchimie', '📃', 'Parchemins', "Copiez un sort connu sur parchemin en une journée (coût : 25 po par niveau).", '', 'a1', '', ''),
  ('a3', 'alchimie', '🧪', 'Potions de soin', "Chaque repos long, préparez une potion de soin (2d4 + 2).", '', 'a2', '', ''),
  ('a3b', 'alchimie', '💍', 'Harmonisation', "Vous pouvez vous harmoniser avec un objet magique de plus.", '', 'a2', '', ''),
  ('a4', 'alchimie', '🔧', 'Artificier', "Créez un objet magique mineur par niveau de séance (avec le MJ).", '', 'a3', 'a3b', ''),
  ('a5', 'alchimie', '🏺', 'Grand œuvre', "Une fois dans la campagne, créez un objet magique rare ; vos potions soignent le double.", '', 'a4', '', 'sommet'),
  ('j1', 'precision', '🎆', 'Évocateur précis', "Vos sorts de zone ne touchent jamais vos alliés et +1 au DD des sorts de zone.", 'dd+1', 'e2 v3', '', 'jonction'),
  ('j2', 'abjuration', '⚔️', 'Arcanes martiales', "Lancer un sort ne provoque plus d'attaque d'opportunité ; +1 à la CA en vous concentrant.", '', 'p2 v2', '', 'jonction'),
  ('j3', 'erudition', '🗝️', 'Sceau de garde', "Tracez un glyphe d'alarme sur une porte ou un coffre : vous êtes prévenu quand on l'ouvre.", '', 'p3b u3', '', 'jonction'),
  ('j4', 'pacte', '📕', 'Sang et savoir', "Votre lignée vous murmure : apprenez un sort d'une autre liste de classe.", '', 's3 u3b', '', 'jonction'),
  ('j5', 'alchimie', '💣', 'Alchimie explosive', "Vos fioles lancées infligent 2d6 dégâts (feu ou acide) dans un rayon d'une case, une fois par repos court.", '', 'e3b a3', '', 'jonction'),
  ('j6', 'pacte', '🌑', 'Pacte et parchemin', "Vos parchemins de malédiction imposent le désavantage à la première sauvegarde.", '', 's2 a2', '', 'jonction'),
  ]))

# ---------------------------------------------------------------- Voie du sacré et du sauvage
T.append(arbre('sacre', 'Voie du sacré et du sauvage', "Les serviteurs des dieux et de la nature : guérison, jugement, nature, éléments, esprit et serments.",
  {'classes': ['clerc', 'druide', 'paladin', 'rodeur']},
  [('tronc', 'Tronc', '#9a7d0a'), ('guerison', 'Guérison', '#f1c40f'), ('jugement', 'Jugement', '#c0392b'), ('nature', 'Nature', '#27ae60'),
   ('elements', 'Éléments', '#2980b9'), ('esprit', 'Esprit', '#8e44ad'), ('serments', 'Serments', '#d35400')],
  [
  ('racine', 'tronc', '🌿', 'Foi et instinct', '+1 en Religion ou en Nature (au choix du joueur ; la fiche compte Religion).', 'competence.religion+1', '', '', ''),
  ('g1', 'guerison', '🤲', 'Mains apaisantes', '+1 en Médecine ; stabiliser un mourant est une action bonus.', 'competence.medecine+1', 'racine', '', ''),
  ('g2', 'guerison', '💖', 'Soins renforcés', "Vos sorts de soin rendent +2 PV par niveau de sort.", '', 'g1', '', ''),
  ('g3', 'guerison', '🕊️', 'Bénédiction du matin', "Après un repos long, vous et vos alliés gagnez des PV temporaires égaux à votre niveau.", '', 'g2', '', ''),
  ('g3b', 'guerison', '🩹', 'Purification', "Une fois par repos court, mettez fin à un poison ou à une maladie par le toucher.", '', 'g2', '', ''),
  ('g4', 'guerison', '🌅', 'Aura de vie', "Les alliés à 2 cases qui commencent leur tour à 0 PV regagnent 1 PV.", '', 'g3', 'g3b', ''),
  ('g5', 'guerison', '😇', 'Miracle', "Une fois par repos long, ramenez à la vie une créature morte depuis moins d'une minute, à 1 PV.", '', 'g4', '', 'sommet'),
  ('u1', 'jugement', '⚡', 'Châtiment', '+1 aux dégâts des armes.', 'degats+1', 'racine', '', ''),
  ('u2', 'jugement', '🗡️', 'Arme bénie', "+1 aux jets d'attaque ; vos armes comptent comme magiques.", 'attaque+1', 'u1', '', ''),
  ('u3', 'jugement', '☀️', 'Lumière aveuglante', "Une fois par repos court : les ennemis à 2 cases font un jet de CON ou sont aveuglés 1 round.", '', 'u2', '', ''),
  ('u3b', 'jugement', '💀', 'Fléau des morts', "+1d6 dégâts contre les morts-vivants et les fiélons.", '', 'u2', '', ''),
  ('u4', 'jugement', '⚖️', 'Vengeance divine', "Réaction : quand un allié à 6 cases est blessé, l'agresseur subit 1d8 + SAG dégâts radiants.", '', 'u3', 'u3b', ''),
  ('u5', 'jugement', '🔱', 'Champion des dieux', "+1 à l'attaque et aux dégâts ; une fois par repos long, votre coup est automatiquement critique.", 'attaque+1, degats+1', 'u4', '', 'sommet'),
  ('n1', 'nature', '👣', 'Pisteur', '+1 en Survie.', 'competence.survie+1', 'racine', '', ''),
  ('n2', 'nature', '🌱', 'Herboriste', "+1 en Nature ; vous trouvez de quoi soigner 1d4 PV par jour en pleine nature.", 'competence.nature+1', 'n1', '', ''),
  ('n3', 'nature', '🦌', 'Langage des bêtes', "+1 en Dressage ; vous comprenez les intentions des animaux.", 'competence.dressage+1', 'n2', '', ''),
  ('n3b', 'nature', '🌳', 'Marche des forêts', "Le terrain difficile naturel ne vous ralentit pas ; +1 case de vitesse.", 'vitesse+1', 'n2', '', ''),
  ('n4', 'nature', '🐻', 'Compagnon sauvage', "Un animal (loup, faucon, ours jeune…) vous suit et combat à vos côtés (stats de la bibliothèque).", '', 'n3', 'n3b', ''),
  ('n5', 'nature', '🍃', 'Gardien du bosquet', "Une fois par repos long, faites pousser une forêt dense dans un rayon de 6 cases pendant 1 heure (terrain difficile pour vos ennemis).", '', 'n4', '', 'sommet'),
  ('l1', 'elements', '🪵', "Peau d'écorce", '+1 à la CA.', 'ca+1', 'racine', '', ''),
  ('l2', 'elements', '🌩️', 'Voix du tonnerre', "Une fois par repos court : 2d8 dégâts de tonnerre en cône de 3 cases (jet de CON pour moitié).", '', 'l1', '', ''),
  ('l3', 'elements', '🔥', 'Marche des éléments', "Résistance au feu ou au froid (choix au repos long).", '', 'l2', '', ''),
  ('l3b', 'elements', '🌊', 'Enfant des eaux', "Respiration aquatique ; vitesse de nage égale à votre vitesse.", '', 'l2', '', ''),
  ('l4', 'elements', '🌪️', 'Colère du ciel', "Une fois par repos long, appelez la foudre : 4d10 dégâts sur une cible à 12 cases.", '', 'l3', 'l3b', ''),
  ('l5', 'elements', '🌀', 'Avatar des éléments', "Une fois par repos long, pendant 1 minute : résistance à tous les dégâts élémentaires, +1d6 dégâts élémentaires à vos attaques et sorts.", '', 'l4', '', 'sommet'),
  ('e1', 'esprit', '🧘', 'Méditation', '+1 en Intuition.', 'competence.intuition+1', 'racine', '', ''),
  ('e2', 'esprit', '👁️', 'Vision prophétique', "+2 à l'initiative.", 'initiative+2', 'e1', '', ''),
  ('e3', 'esprit', '🙏', 'Communion', "Une fois par séance, posez une question fermée à votre dieu ou à la nature ; le MJ répond honnêtement.", '', 'e2', '', ''),
  ('e3b', 'esprit', '🌙', 'Rêves', "Pendant un repos long, vous voyez en rêve un lieu que vous connaissez.", '', 'e2', '', ''),
  ('e4', 'esprit', '🧿', 'Âme sereine', '+1 aux sauvegardes de SAG et de CHA ; immunité au charme.', 'sauvegarde.sag+1, sauvegarde.cha+1', 'e3', 'e3b', ''),
  ('e5', 'esprit', '🔮', 'Oracle', "Une fois par repos long, remplacez un jet de d20 de n'importe qui par 1 ou 20.", '', 'e4', '', 'sommet'),
  ('s1', 'serments', '📜', 'Serment de protection', "+1 aux sauvegardes de CON.", 'sauvegarde.con+1', 'racine', '', ''),
  ('s2', 'serments', '🛡️', 'Défenseur des faibles', "Réaction : prenez à votre place les dégâts d'une attaque contre un allié adjacent.", '', 's1', '', ''),
  ('s3', 'serments', '🦁', 'Aura de courage', "Les alliés à 2 cases ne peuvent pas être effrayés.", '', 's2', '', ''),
  ('s3b', 'serments', '🧱', 'Inflexible', "+1 PV par niveau.", 'pvParNiveau+1', 's2', '', ''),
  ('s4', 'serments', '✨', 'Aura de protection', "Les alliés à 2 cases ajoutent +1 à leurs sauvegardes.", '', 's3', 's3b', ''),
  ('s5', 'serments', '👼', 'Saint vivant', "+1 à la Sagesse ; vos alliés à 2 cases ont la résistance aux dégâts nécrotiques.", 'carac.sag+1', 's4', '', 'sommet'),
  ('j1', 'jugement', '💫', 'Main de la justice', "Quand vous soignez un allié, votre prochaine attaque ce round inflige +1d8 dégâts radiants.", '', 'g3 u3', '', 'jonction'),
  ('j2', 'nature', '🏹', 'Chasseur sacré', "+1d6 dégâts contre les ennemis de votre dieu ou de la nature (aberrations, morts-vivants, fiélons au choix).", '', 'u3b n3', '', 'jonction'),
  ('j3', 'elements', '🌾', 'Saisons', "Vous sentez le temps qu'il fera dans 24 h ; une fois par jour, adoucissez une tempête locale.", '', 'n3b l3', '', 'jonction'),
  ('j4', 'esprit', '🌌', 'Esprit des éléments', "Vos sorts élémentaires ignorent l'abri partiel ; +1 au DD des sorts.", 'dd+1', 'l3b e3', '', 'jonction'),
  ('j5', 'serments', '🕯️', 'Veilleur', "Vous ne pouvez pas être surpris ; les alliés qui dorment près de vous ne le sont pas non plus.", '', 'e3b s3', '', 'jonction'),
  ('j6', 'guerison', '🤝', 'Main tendue', "Défendre un allié (Défenseur des faibles) vous soigne de 1d6.", '', 's2 g3b', '', 'jonction'),
  ]))

# ---------------------------------------------------------------- Héritage de l'aventurier
T.append(arbre('aventurier', "Héritage de l'aventurier", "Pour tous : survie, voyage, vie sociale, savoir, chance et artisanat.",
  {'tous': True},
  [('tronc', 'Tronc', '#7f8c8d'), ('survie', 'Survie', '#6e2c00'), ('voyage', 'Voyage', '#1a5276'), ('social', 'Société', '#b03a2e'),
   ('savoir', 'Savoir', '#7d6608'), ('chance', 'Chance', '#239b56'), ('artisanat', 'Artisanat', '#6c3483')],
  [
  ('racine', 'tronc', '🧭', "Goût de l'aventure", '+1 en Perception.', 'competence.perception+1', '', '', ''),
  ('s1', 'survie', '🏕️', 'Bivouac', "Votre campement est sûr : on ne vous surprend pas pendant un repos.", '', 'racine', '', ''),
  ('s2', 'survie', '🍲', 'Cuisine de camp', "Un repas chaud rend 1 dé de vie à chacun pendant un repos court.", '', 's1', '', ''),
  ('s3', 'survie', '🦴', 'Robuste', "+1 PV par niveau.", 'pvParNiveau+1', 's2', '', ''),
  ('s3b', 'survie', '🥾', 'Infatigable', "Avantage contre l'épuisement ; une marche forcée ne vous coûte rien la première journée.", '', 's2', '', ''),
  ('s4', 'survie', '💪', 'Increvable', "Une fois par repos long, tombé à 0 PV, vous restez à 1 PV.", '', 's3', 's3b', 'sommet'),
  ('v1', 'voyage', '🗺️', 'Lecteur de cartes', "Vous ne vous perdez jamais sur un chemin connu ; +1 en Survie.", 'competence.survie+1', 'racine', '', ''),
  ('v2', 'voyage', '🐴', 'Cavalier', "Avantage pour rester en selle ; monter ou descendre ne coûte que 1 case.", '', 'v1', '', ''),
  ('v3', 'voyage', '⛵', 'Pied marin', "Vous savez naviguer ; avantage contre le mal de mer et sur un pont qui tangue.", '', 'v2', '', ''),
  ('v3b', 'voyage', '🏃', 'Grand voyageur', "+1 case de vitesse.", 'vitesse+1', 'v2', '', ''),
  ('v4', 'voyage', '🏔️', 'Pionnier', "Le groupe voyage un tiers plus vite en terrain difficile et ne se fait jamais surprendre en route.", '', 'v3', 'v3b', 'sommet'),
  ('c1', 'social', '🍺', 'Habitué des tavernes', "Dans toute taverne, vous apprenez une rumeur et trouvez un lit à moitié prix.", '', 'racine', '', ''),
  ('c2', 'social', '🤝', 'Négociateur', "+1 en Persuasion ; 10 % de réduction chez les marchands.", 'competence.persuasion+1', 'c1', '', ''),
  ('c3', 'social', '🏅', 'Réputation', "On a entendu parler de vos exploits : les PNJ neutres commencent amicaux.", '', 'c2', '', ''),
  ('c3b', 'social', '👑', 'Ami des puissants', "Une fois par séance, obtenez une audience auprès d'un notable.", '', 'c2', '', ''),
  ('c4', 'social', '🎉', 'Héros du peuple', "Dans toute ville, des gens vous cachent, vous nourrissent et vous informent.", '', 'c3', 'c3b', 'sommet'),
  ('k1', 'savoir', '🐉', 'Bestiaire', "Vous connaissez une faiblesse de chaque créature commune ; +1 en Nature.", 'competence.nature+1', 'racine', '', ''),
  ('k2', 'savoir', '📖', 'Légendes', "+1 en Histoire.", 'competence.histoire+1', 'k1', '', ''),
  ('k3', 'savoir', '🗣️', 'Langues du voyage', "Apprenez une langue ; vous vous faites comprendre partout par gestes et mots simples.", '', 'k2', '', ''),
  ('k3b', 'savoir', '🔎', 'Œil exercé', "+1 en Investigation.", 'competence.investigation+1', 'k2', '', ''),
  ('k4', 'savoir', '🦉', 'Sage', "Une fois par séance, vous connaissez la réponse à une question de savoir (le MJ la donne).", '', 'k3', 'k3b', 'sommet'),
  ('h1', 'chance', '🍀', 'Trèfle à quatre feuilles', "Une fois par repos long, relancez un d20.", '', 'racine', '', ''),
  ('h2', 'chance', '🎲', 'Coup de pouce', "Une fois par repos court, ajoutez 1d4 au jet d'un allié que vous voyez.", '', 'h1', '', ''),
  ('h3', 'chance', '⭐', 'Bonne étoile', "+1 à l'initiative ; les pièges vous visent en dernier.", 'initiative+1', 'h2', '', ''),
  ('h3b', 'chance', '🪙', 'Pile ou face', "Une fois par séance, le MJ tire à pile ou face : sur pile, une coïncidence heureuse vous aide.", '', 'h2', '', ''),
  ('h4', 'chance', '🌈', 'Insolente chance', "Deux relances par repos long ; un 1 naturel peut être relancé.", '', 'h3', 'h3b', 'sommet'),
  ('a1', 'artisanat', '🔨', 'Bricoleur', "Vous réparez armes, armures et outils abîmés pendant un repos court.", '', 'racine', '', ''),
  ('a2', 'artisanat', '⚒️', 'Forgeron', "Une arme ou armure que vous entretenez gagne +1 aux dégâts ou à la CA pour une journée.", '', 'a1', '', ''),
  ('a3', 'artisanat', '💰', 'Commerce', "Vous revendez le butin 20 % plus cher.", '', 'a2', '', ''),
  ('a3b', 'artisanat', '🧵', 'Tailleur', "Vêtements et déguisements de qualité ; avantage pour passer pour un noble.", '', 'a2', '', ''),
  ('a4', 'artisanat', '🏆', 'Maître artisan', "Créez une pièce de maître (+1 non magique) par mois de jeu.", '', 'a3', 'a3b', 'sommet'),
  ('j1', 'voyage', '🔥', 'Feu de camp', "Les histoires autour du feu redonnent courage : chacun gagne 1d4 PV temporaires par niveau.", '', 's2 v2', '', 'jonction'),
  ('j2', 'social', '🗞️', 'Nouvelles des routes', "En arrivant quelque part, vous savez ce qui s'y passe depuis une semaine.", '', 'v3 c2', '', 'jonction'),
  ('j3', 'savoir', '🎭', 'Conteur', "+1 en Représentation ; vos récits ouvrent les portes des notables.", 'competence.representation+1', 'c3b k2', '', 'jonction'),
  ('j4', 'chance', '🔮', 'Pressentiment', "Avantage à la première sauvegarde de chaque combat.", '', 'k3b h2', '', 'jonction'),
  ('j5', 'artisanat', '🎰', 'Trouvaille', "Une fois par séance, vous trouvez un objet utile et banal dont vous aviez besoin.", '', 'h3b a2', '', 'jonction'),
  ('j6', 'survie', '🪢', 'Débrouillard', "Avec une corde, un couteau et du temps, vous fabriquez piège, radeau ou abri.", '', 'a1 s1', '', 'jonction'),
  ]))

# ---------------------------------------------------------------- Magie des sceaux
MAGIE = {
  'coeurs.1': {'eveil': True, 'signes': ['braise', 'source', 'socle', 'souffle', 'lueur', 'jet', 'gerbe', 'plume', 'fenetre', 'halo'], 'emplacements': 5},
  'coeurs.2': {'signes': ['memoire', 'regard']}, 'coeurs.3': {'signes': ['lien', 'mouvement']}, 'coeurs.4': {'signes': ['seve', 'chair', 'esprit']},
  'rameaux.1': {'signes': ['pluie', 'appel']}, 'rameaux.2': {'signes': ['dard', 'etau']}, 'rameaux.3': {'signes': ['rempart', 'tourbillon']},
  'rameaux.4': {'signes': ['ampleur', 'figure', 'tisse']},
  'maitrise.1': {'signes': ['sablier'], 'emplacements': 1}, 'maitrise.2': {'rang': 2, 'signes': ['visee', 'douce', 'echo'], 'emplacements': 2},
  'maitrise.4': {'rang': 3, 'signes': ['guet', 'mot'], 'emplacements': 3},
  'trace.2': {'emplacements': 2},
}
T.append(arbre('sceaux', 'Magie des sceaux', "La magie de l'Atelier de tracé : l'éveil au centre, puis les Cœurs, les Rameaux, les Nœuds et les rangs, et l'art du tracé.",
  {'tous': True, 'magie': True},
  [('coeurs', 'Cœurs', '#7e22ce'), ('rameaux', 'Rameaux', '#2563eb'), ('maitrise', 'Nœuds et rangs', '#b45309'), ('trace', 'Art du tracé', '#0f766e')],
  [
  ('coeurs.1', 'coeurs', '✴️', 'Éveil des sceaux', "Le personnage apprend à tracer : Cœurs élémentaires (Braise, Source, Socle, Souffle, Lueur), formes simples (Jet, Gerbe), Plume, Fenêtre et Halo ; 5 emplacements de grimoire.", '', '', '', ''),
  ('coeurs.2', 'coeurs', '🧠', 'Cœurs de nature I', 'Apprend Mémoire et Regard.', '', 'coeurs.1', '', ''),
  ('coeurs.3', 'coeurs', '🔗', 'Cœurs de nature II', 'Apprend Lien et Mouvement.', '', 'coeurs.2', '', ''),
  ('coeurs.4', 'coeurs', '🌱', 'Cœurs scellés', 'Apprend Sève, Chair et Esprit (rang de Compagnon requis).', '', 'coeurs.3 maitrise.2', '', 'jonction'),
  ('rameaux.1', 'rameaux', '🌧️', "Rameaux d'apprenti", 'Apprend Pluie et Appel.', '', 'coeurs.1', '', ''),
  ('rameaux.2', 'rameaux', '🎯', 'Rameaux de compagnon I', 'Apprend Dard et Étau.', '', 'rameaux.1', '', ''),
  ('rameaux.3', 'rameaux', '🌀', 'Rameaux de compagnon II', 'Apprend Rempart et Tourbillon.', '', 'rameaux.2', '', ''),
  ('rameaux.4', 'rameaux', '🕸️', 'Rameaux de maître', 'Apprend Ampleur, Figure et Tisse.', '', 'rameaux.3 maitrise.4', '', 'jonction'),
  ('maitrise.1', 'maitrise', '⏳', 'Nœud du sablier', 'Apprend Sablier ; +1 emplacement de grimoire.', '', 'coeurs.1', '', ''),
  ('maitrise.2', 'maitrise', '🥈', 'Rang de Compagnon', 'Rang 2 ; apprend Visée, Braise-douce et Écho ; +2 emplacements.', '', 'maitrise.1', 'coeurs.2 rameaux.1', ''),
  ('maitrise.3', 'maitrise', '⚖️', 'Sceaux stables', '+2 à la stabilité perçue : le MJ réduit la difficulté des sceaux complexes.', '', 'maitrise.2', '', ''),
  ('maitrise.4', 'maitrise', '🥇', 'Rang de Maître', 'Rang 3 ; apprend Guet et Mot ; +3 emplacements.', '', 'maitrise.3', '', 'sommet'),
  ('trace.1', 'trace', '✍️', 'Main sûre', "Le tracé d'un sceau connu prend une action de moins (au minimum une action bonus pour un sceau simple).", '', 'coeurs.1', '', ''),
  ('trace.2', 'trace', '📔', 'Grimoire étendu', '+2 emplacements de grimoire.', '', 'trace.1', '', ''),
  ('trace.3', 'trace', '🎼', 'Résonance', "Deux sceaux tracés le même round partagent leur portée : le second part du premier.", '', 'trace.2', '', ''),
  ('trace.3b', 'trace', '🔍', 'Lecture des sceaux', "Vous reconnaissez un sceau tracé par un autre et devinez son effet ; +1 en Arcanes.", 'competence.arcanes+1', 'trace.1', '', ''),
  ('trace.4', 'trace', '✋', 'Tracé à deux mains', "Une fois par repos court, tracez deux sceaux simples en une seule action.", '', 'trace.3', 'trace.3b', 'jonction'),
  ('trace.5', 'trace', '🌌', 'Sceau vivant', "Un sceau que vous tracez peut rester actif une heure sans concentration, une fois par repos long.", '', 'trace.4 maitrise.3', '', 'sommet'),
  ], magie=MAGIE))

donnees = {
  '_doc': "Arbres de talents maison de JDR Global (D&D 5e) : 6 grands arbres ramifiés. Chaque arbre part d'un tronc ; les branches se divisent (fourches) et se rejoignent (jonctions : tous les « requis »). « requisUn » : au moins un de ces talents. Rang = distance au tronc (calculée) ; niveau requis selon le rang ; coût : 1, jonction 2, sommet 3. Effets appliqués automatiquement à la fiche ; « magie » : signes de l'Atelier de tracé, rang, emplacements.",
  'pointsParNiveau': 1,
  'arbres': T,
}
p = r'D:\projet claude\projet JDR Global\app\src\noyau\regles\dnd5e\talents.json'
open(p, 'w', encoding='utf-8').write(json.dumps(donnees, ensure_ascii=False, indent=1) + '\n')
print({a['id']: sum(len(b['noeuds']) for b in a['branches']) for a in T}, sum(sum(len(b['noeuds']) for b in a['branches']) for a in T))
