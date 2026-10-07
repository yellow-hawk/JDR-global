/* Atlas des ciels imaginaires — Pont avec JDR Global (ajouté le 5 octobre 2026)
   Quand l'Atlas est ouvert dans un cadre (iframe) de JDR Global, ce module échange des messages
   avec la page parente. Ouvert seul, il ne fait rien.
   Messages reçus  : atlas:ouvrir {entry} · atlas:demander {id} · atlas:quetes {id, mj} · atlas:quetes-donnees {id} · atlas:pnj {id} · atlas:image-monde {id}
   Messages envoyés : atlas:pret · atlas:reponse {id, …} */
"use strict";
(function(){
  if (window.parent === window) return;
  const parent = window.parent;
  const origine = location.origin === 'null' ? '*' : location.origin; // même origine que la suite
  const repondre = (id, donnees) => parent.postMessage({ type: 'atlas:reponse', id, ...donnees }, origine);

  function etat(){
    const nom = currentName || (sky && sky.name) || 'Ciel sans nom';
    const peuples = (world && world.peoples && !sky.earth) ? world.peoples.list.map(p => ({ cle: p.key, nom: p.name, couleur: p.col })) : [];
    return { entry: { name: nom, ...snapshot() }, monde: { nom: world ? world.name : '', peuples } };
  }

  function pnj(){
    const Q = makeQuests();
    if (!Q) return [];
    return (Q.npcs || []).map(n => ({
      nom: n.name, role: n.role, peuple: n.people, peupleNom: n.peopleName,
      apparence: n.look, humeur: n.mood, citation: n.quote, veut: n.want, secret: n.secret,
      antagoniste: n === Q.main.antagonist,
    }));
  }

  /* Quêtes en données structurées : tout ce qui est secret est rangé sous « mj » (règle de JDR Global). */
  function quetes(){
    const Q = makeQuests();
    if (!Q) return [];
    const lieu = p => p && p.name ? `${p.name} (${p.kind})` : '';
    const etape = s => s.secret
      ? { titre: 'Étape secrète', joueurs: 'Lieu et détails révélés en jeu.', mj: { titre: s.title, lieu: lieu(s.place), texte: s.mj, joueurs: s.players, obstacle: s.obstacle || '', choix: (s.branches || []).map(b => `${b.choice} → ${b.cons}`) } }
      : { titre: s.title, lieu: lieu(s.place), joueurs: s.players, mj: { texte: s.mj, obstacle: s.obstacle || '', choix: (s.branches || []).map(b => `${b.choice} → ${b.cons}`) } };
    const res = [];
    const m = Q.main;
    res.push({ cle: m.id, sorte: 'principale', titre: m.title, resume: m.summary + (m.deadline ? ` Échéance : ${m.deadline.text}.` : ''),
      lieux: m.stages.filter(s => !s.secret).map(s => lieu(s.place)), etapes: m.stages.map(etape), recompenses: m.rewards,
      pnj: m.stages.filter(s => !s.secret).flatMap(s => (s.npcs || []).map(n => n.name)),
      mj: { verite: m.truth, histoire: m.lore, antagoniste: m.antagonist.name, fins: m.endings.map(f => `${f.name} : ${f.cond} ${f.text}`), pnjSecrets: [m.antagonist.name] } });
    for (const q of Q.secondary) res.push({ cle: q.id, sorte: 'secondaire', titre: q.title, resume: q.summary,
      lieux: q.places.slice(0, 2).map(lieu), etapes: q.stages.map(etape), recompenses: q.rewards, pnj: [q.giver.name],
      mj: { verite: q.truth, histoire: q.lore, lien: q.link, adversaire: q.foe.name } });
    for (const q of Q.side) res.push({ cle: q.id, sorte: 'annexe', titre: q.title, resume: q.summary,
      lieux: [lieu(q.place)], etapes: [], recompenses: q.rewards, pnj: [q.giver.name],
      mj: { verite: q.truth || '', danger: q.danger || '', choix: (q.branches || []).map(b => `${b.choice} → ${b.cons}`) } });
    return res;
  }

  addEventListener('message', ev => {
    if (ev.source !== parent) return;
    const m = ev.data || {};
    try {
      if (m.type === 'atlas:ouvrir' && m.entry) openSaved(m.entry);
      else if (m.type === 'atlas:demander') repondre(m.id, etat());
      else if (m.type === 'atlas:quetes') { const Q = makeQuests(); repondre(m.id, { texte: Q ? questsText(Q, !!m.mj) : '' }); }
      else if (m.type === 'atlas:pnj') repondre(m.id, { pnj: pnj() });
      else if (m.type === 'atlas:quetes-donnees') repondre(m.id, { quetes: quetes(), monde: world ? world.name : '' });
      else if (m.type === 'atlas:image-monde') {
        if (!world || sky.earth) { repondre(m.id, { erreur: 'Pas de monde généré.' }); return; }
        renderWorldImage(2).toBlob(b => repondre(m.id, { image: b, nom: world.name }), 'image/png');
      }
    } catch (e) { if (m.id) repondre(m.id, { erreur: String(e && e.message || e) }); }
  });

  parent.postMessage({ type: 'atlas:pret' }, origine);
})();
