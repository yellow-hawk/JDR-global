/* Atlas des ciels imaginaires — Pont avec JDR Global (ajouté le 5 octobre 2026)
   Quand l'Atlas est ouvert dans un cadre (iframe) de JDR Global, ce module échange des messages
   avec la page parente. Ouvert seul, il ne fait rien.
   Messages reçus  : atlas:ouvrir {entry} · atlas:demander {id} · atlas:quetes {id, mj} · atlas:quetes-donnees {id} · atlas:pnj {id} · atlas:image-monde {id}
                     atlas:cartes-plan {id} · atlas:carte {id, cle}   (ajoutés le 06/10 : toutes les cartes du monde, classées et emboîtées)
                     atlas:civilisations {id}   (peuples : régime, souverain, histoire, relations, coutumes, calendrier, noms)
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
      antagoniste: n === Q.main.antagonist, feminin: !!n.g,
    }));
  }

  /* Quêtes en données structurées : tout ce qui est secret est rangé sous « mj » (règle de JDR Global). */
  function quetes(){
    const Q = makeQuests();
    if (!Q) return [];
    const lieu = p => p && p.name ? `${p.name} (${p.kind})` : '';
    const detail = (p, titre) => p && p.name ? { nom: p.name, sorte: p.kind, type: (p.micro && (p.micro.type || p.micro.kind)) || (p.poi && p.poi.type) || (p.city ? p.city.kind : ''),
      danger: p.danger || '', desc: p.desc || (p.poi && p.poi.desc) || '', peuple: p.people, etape: titre || '', ou: cibleDuLieu(p) } : null;
    const details = L => L.filter(Boolean);
    const etape = s => s.secret
      ? { titre: 'Étape secrète', joueurs: 'Lieu et détails révélés en jeu.', mj: { titre: s.title, lieu: lieu(s.place), texte: s.mj, joueurs: s.players, obstacle: s.obstacle || '', choix: (s.branches || []).map(b => `${b.choice} → ${b.cons}`) } }
      : { titre: s.title, lieu: lieu(s.place), joueurs: s.players, mj: { texte: s.mj, obstacle: s.obstacle || '', choix: (s.branches || []).map(b => `${b.choice} → ${b.cons}`) } };
    const res = [];
    const m = Q.main;
    res.push({ cle: m.id, sorte: 'principale', titre: m.title, resume: m.summary + (m.deadline ? ` Échéance : ${m.deadline.text}.` : ''),
      lieux: m.stages.filter(s => !s.secret).map(s => lieu(s.place)), etapes: m.stages.map(etape), recompenses: m.rewards,
      pnj: m.stages.filter(s => !s.secret).flatMap(s => (s.npcs || []).map(n => n.name)),
      mj: { verite: m.truth, histoire: m.lore, antagoniste: m.antagonist.name, fins: m.endings.map(f => `${f.name} : ${f.cond} ${f.text}`), pnjSecrets: [m.antagonist.name] },
      lieuxDetail: details(m.stages.map(s => detail(s.place, s.title))), adversaire: m.antagonist.name });
    for (const q of Q.secondary) res.push({ cle: q.id, sorte: 'secondaire', titre: q.title, resume: q.summary,
      lieux: q.places.slice(0, 2).map(lieu), etapes: q.stages.map(etape), recompenses: q.rewards, pnj: [q.giver.name],
      mj: { verite: q.truth, histoire: q.lore, lien: q.link, adversaire: q.foe.name },
      lieuxDetail: details(q.stages.map(s => detail(s.place, s.title))), adversaire: q.foe.name });
    for (const q of Q.side) res.push({ cle: q.id, sorte: 'annexe', titre: q.title, resume: q.summary,
      lieux: [lieu(q.place)], etapes: [], recompenses: q.rewards, pnj: [q.giver.name],
      mj: { verite: q.truth || '', danger: q.danger || '', choix: (q.branches || []).map(b => `${b.choice} → ${b.cons}`) },
      lieuxDetail: details([detail(q.place, q.title)]), adversaire: '' });
    return res;
  }


  /* ---------- Toutes les cartes du monde, classées et emboîtées (06/10) ----------
     Clés : monde, relief, ciel, systeme, pays|k, ville|k|i, village|k|i, quete|id.
     Coordonnées des repères et des zones en pixels de l'image rendue. */
  const R_MONDE = 2, PAYS_ECH = 2, VILLE_PX = 2000, VILLAGE_PX = 1200;
  const pxMonde = (lon, lat) => [(wrapPi(lon) + Math.PI) / TAU * 1800 * R_MONDE, (Math.PI / 2 - lat) / Math.PI * 900 * R_MONDE];
  const geoPays = M => { const W2 = Math.round(M.MW * PAYS_ECH * .72), H2 = Math.round(M.MH * PAYS_ECH * .72), s = Math.min(W2 / M.MW, H2 / M.MH) * .98;
    return { W2, H2, s, px: (x, y) => [W2 / 2 + (x - M.MW / 2) * s, H2 / 2 + (y - M.MH / 2) * s] }; };
  const pxVille = (x, y, S) => [S / 2 + (x - 500) * S / 1000 * .98, S / 2 + (y - 500) * S / 1000 * .98];
  const boite = ([x, y], d) => [x - d, y - d, x + d, y + d];

  // Carte la plus précise où placer un lieu de quête : plan de la ville, du village, ou carte du pays.
  function cibleDuLieu(p){
    try {
      const L = world.peoples.list;
      if (p.city){ const k = p.people, i = L[k].cities.indexOf(p.city); if (i >= 0) return { cle: `ville|${k}|${i}`, x: VILLE_PX / 2, y: VILLE_PX / 2 }; }
      const k = p.people;
      if (k == null || k < 0 || !L[k]) { const [x, y] = pxMonde(p.lon, p.lat); return { cle: 'monde', x, y }; }
      const M = makeCountryMap(k);
      if (p.micro){ const i = M.villages.indexOf(p.micro); if (i >= 0) return { cle: `village|${k}|${i}`, x: VILLAGE_PX / 2, y: VILLAGE_PX / 2 }; }
      const G = geoPays(M), [x, y] = G.px(...M.toPx(p.lon, p.lat));
      return { cle: `pays|${k}`, x, y };
    } catch (e) { return null; }
  }

  function planCartes(){
    const res = [], earth = !!sky.earth, nomMonde = world && world.name || currentName || 'Monde';
    res.push({ cle: 'ciel', nom: `Ciel de ${nomMonde}`, type: 'ciel', reperes: [] });
    try { if (mainSystem()) res.push({ cle: 'systeme', nom: 'Système stellaire (vue de dessus)', type: 'systeme', reperes: [] }); } catch (e) {}
    if (earth || !world || !world.peoples) return res;
    const L = world.peoples.list, eqKm = TAU * 6371 / (1800 * R_MONDE);
    const reperesMonde = [];
    res.push({ cle: 'monde', nom: `${nomMonde} (carte du monde)`, type: 'monde', reperes: reperesMonde, metresParPixel: eqKm * 1000,
      projection: { sorte: 'equirectangulaire', lonMin: -180, lonMax: 180, latMin: -90, latMax: 90, remplissagePoles: 'glace' } });
    if (world.peopleImg) res.push({ cle: 'relief', nom: `${nomMonde} (relief)`, type: 'monde', reperes: [], metresParPixel: eqKm * 1000 });
    L.forEach((p, k) => {
      const M = makeCountryMap(k), G = geoPays(M), nomP = cap(p.name);
      const [lo0, la0] = M.toLL(0, 0), [lo1, la1] = M.toLL(M.MW, M.MH);
      const a = pxMonde(lo0, la0), b = pxMonde(lo1, la1);
      const zone = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
      const capi = p.capital || p.cities[0];
      if (capi) { const [x, y] = pxMonde(capi.lon, capi.lat); reperesMonde.push({ nom: nomP, x, y, sorte: 'ville', vers: `pays|${k}`, desc: `Terres ${p.name.replace(/^les /, 'des ')}` }); }
      const rp = [];
      M.cities.forEach(ct => { const i = p.cities.indexOf(ct.ref); const [x, y] = G.px(ct.x, ct.y); rp.push({ nom: ct.name, x, y, sorte: 'ville', vers: i >= 0 ? `ville|${k}|${i}` : null, desc: ct.desc || '' }); });
      M.villages.forEach((v, i) => { const [x, y] = G.px(v.x, v.y); rp.push({ nom: v.name, x, y, sorte: 'ville', vers: `village|${k}|${i}`, desc: v.desc || '' }); });
      [...M.minors, ...M.wpois].forEach(o => { const [x, y] = G.px(o.x, o.y); rp.push({ nom: o.name, x, y, sorte: o.danger && !/^aucun/i.test(o.danger) ? 'danger' : 'lieu', vers: null, desc: [o.label, o.desc, o.hook, o.danger ? 'Danger : ' + o.danger : ''].filter(Boolean).join(' · ') }); });
      res.push({ cle: `pays|${k}`, nom: M.title || nomP, type: 'region', parent: { cle: 'monde', zone }, reperes: rp, metresParPixel: M.kmPx * 1000 / G.s });
      p.cities.forEach((ct, i) => {
        const mc = M.cities.find(x => x.ref === ct), centre = mc ? G.px(mc.x, mc.y) : G.px(...M.toPx(ct.lon, ct.lat));
        res.push({ cle: `ville|${k}|${i}`, nom: `${ct.name}${ct.kind === 'capital' ? ' (capitale)' : ''}`, type: 'ville', parent: { cle: `pays|${k}`, zone: boite(centre, 18) }, reperes: null });
      });
      M.villages.forEach((v, i) => res.push({ cle: `village|${k}|${i}`, nom: v.name, type: 'village', parent: { cle: `pays|${k}`, zone: boite(G.px(v.x, v.y), 10) }, reperes: null }));
    });
    const Q = makeQuests();
    if (Q) [Q.main, ...Q.secondary].forEach(q => res.push({ cle: `quete|${q.id}`, nom: `Quête : ${q.title}`, type: 'quete', reperes: [], mj: true }));
    return res;
  }

  // Repères d'un plan de ville : bâtiments notables (calculés au rendu, le plan n'existe qu'alors).
  const ROLES_NOTABLES = { palace: 'lieu', temple: 'lieu', market: 'lieu', tavern: 'lieu', citadel: 'lieu', observatory: 'lieu', port: 'lieu', forum: 'lieu', souk: 'lieu', arsenal: 'lieu', caravanserai: 'lieu', longhall: 'lieu', greattree: 'lieu' };
  const reperesVille = (pl, S) => (pl.L || []).filter(o => ROLES_NOTABLES[o.role] && o.name).map(o => { const [x, y] = pxVille(o.x, o.y, S); return { nom: o.name, x, y, sorte: 'lieu', vers: null, desc: o.desc || '', role: o.role }; });

  const enBlob = (can, type = 'image/jpeg') => new Promise(ok => can.toBlob(ok, type, .86));
  async function imageCarte(cle){
    const [t, a, b] = cle.split('|'), k = +a, i = +b, L = world && world.peoples ? world.peoples.list : [];
    if (t === 'ciel') return { image: await enBlob(renderMapImage()) };
    if (t === 'systeme') { const S = mainSystem(); return { image: await enBlob(renderSystemView(S, { tilt: 0, w: 1000, h: 1000, scale: 3, title: S.star.name, sub: 'Vue de dessus' })) }; }
    if (t === 'monde') return { image: await enBlob(renderWorldImage(R_MONDE)) };
    if (t === 'relief') { const keep = world.peopleImg; world.peopleImg = null; try { return { image: await enBlob(renderWorldImage(R_MONDE)) }; } finally { world.peopleImg = keep; } }
    if (t === 'pays') return { image: await enBlob(renderCountryImage(makeCountryMap(k), PAYS_ECH, 1)) };
    if (t === 'ville') { const pl = makeCityPlan(L[k].cities[i], k); const can = renderCityExport(pl, VILLE_PX, 1); pl.imgHi = null; return { image: await enBlob(can), reperes: reperesVille(pl, VILLE_PX) }; }
    if (t === 'village') { const M = makeCountryMap(k), v = M.villages[i], [lon, lat] = M.toLL(v.x, v.y);
      const pl = makeCityPlan({ name: v.name, lon, lat, kind: 'village', desc: v.desc }, k); const can = renderCityExport(pl, VILLAGE_PX, 1); pl.imgHi = null;
      return { image: await enBlob(can), reperes: reperesVille(pl, VILLAGE_PX) }; }
    if (t === 'quete') { const Q = makeQuests(), q = [Q.main, ...Q.secondary].find(x => x.id === a);
      return { image: await enBlob(renderQuestMap(q, false)), imageMj: await enBlob(renderQuestMap(q, true)) }; }
    throw new Error('Carte inconnue : ' + cle);
  }


  /* ---------- Civilisations : tout ce qu'il faut pour les fiches pays, organigrammes et généalogies ---------- */
  function calendrierDe(k){
    const save = calPeople; calPeople = k; calCache = null;
    try {
      const cal = computeCalendar(); if (!cal) return null;
      const lp = cal.lp;
      return { jours: cal.Y, mois: cal.months.map(m => ({ nom: lp ? getCN(lp, m.ci).name : sky.consts[m.ci].name, jours: m.len })),
        fetes: cal.fest.map(f => ({ nom: f.name, texte: f.text, jour: ((f.day - cal.y0) % cal.Y + cal.Y) % cal.Y })) };
    } finally { calPeople = save; calCache = null; }
  }
  function civilisations(){
    if (sky.earth || !world || !world.peoples) return { peuples: [], monde: null };
    const L = world.peoples.list, F = world.frame;
    const peuples = L.map((p, k) => {
      const cv = civOf(k), S = STYLES[p.style], r = mulberry32(hashStr(P.seed + '|noms|' + P.wvar + '|' + k));
      const noms = []; for (let i = 0; i < 80; i++) { const n = cap(starName(r, S, true)); if (!noms.includes(n)) noms.push(n); }
      return {
        cle: k, nom: p.name, couleur: p.col, style: p.style, capitale: p.capital ? p.capital.name : '',
        villes: p.cities.map(ct => ({ nom: ct.name, capitale: ct.kind === 'capital', desc: ct.desc || '' })),
        regime: cv.reg.short, regimeTexte: cv.reg.n, titres: cv.reg.t, souverain: cv.ruler, fondateur: cv.founder,
        ere: ERAS[cv.eraI][0], ereTexte: ERAS[cv.eraI][1], population: cv.pop, populationN: cv.popN, anActuel: cv.era0,
        traits: cv.traits, coutumes: cv.cust, croyance: cv.belief, langue: cv.lang,
        relations: cv.rel.map(x => ({ peuple: x.o.key, nom: x.o.name, sorte: x.kind })),
        histoire: cv.hist.map(([an, texte]) => ({ an, texte })),
        calendrier: calendrierDe(k), noms,
      };
    });
    const monde = { nom: world.name, soleils: F.suns.map(s => s.name), lunes: F.moons.map(m => ({ nom: m.name, periode: m.period })), jourHeures: F.dayH || 24 };
    return { peuples, monde };
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
      else if (m.type === 'atlas:civilisations') repondre(m.id, civilisations());
      else if (m.type === 'atlas:cartes-plan') repondre(m.id, { cartes: planCartes() });
      else if (m.type === 'atlas:carte') imageCarte(m.cle).then(r => repondre(m.id, r), e => repondre(m.id, { erreur: String(e && e.message || e) }));
      else if (m.type === 'atlas:image-monde') {
        if (!world || sky.earth) { repondre(m.id, { erreur: 'Pas de monde généré.' }); return; }
        renderWorldImage(2).toBlob(b => repondre(m.id, { image: b, nom: world.name }), 'image/png');
      }
    } catch (e) { if (m.id) repondre(m.id, { erreur: String(e && e.message || e) }); }
  });

  parent.postMessage({ type: 'atlas:pret' }, origine);
})();
