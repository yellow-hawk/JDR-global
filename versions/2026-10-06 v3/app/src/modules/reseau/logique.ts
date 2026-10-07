// Réseau de la campagne : tout ce qui est relié à quoi (pur, testé). Une sorte de nœud = une entrée de sortes.json.
import type { Campagne, Personnage } from '../../noyau/contrat';
import type { Graphe, Lien, Noeud } from '../../noyau/graphe';
import donnees from './sortes.json';

export interface SorteNoeud { id: string; libelle: string; couleur: string; page: string; defaut: boolean }
export const SORTES = donnees.sortes as SorteNoeud[];
export const sorteNoeud = (id: string): SorteNoeud | undefined => SORTES.find((s) => s.id === id);

const sortePerso = (p: Personnage) => (p.sorte === 'pj' ? 'pj' : p.sorte === 'ennemi' ? 'ennemi' : 'pnj');

/** Graphe complet de la campagne ; `visibles` filtre les sortes de nœuds (les liens vers un nœud masqué disparaissent). */
export function grapheDeCampagne(c: Campagne, visibles?: Set<string>): Graphe {
  const noeuds: Noeud[] = [], liens: Lien[] = [];
  const ajouter = (n: Noeud) => noeuds.push(n);
  const lier = (de: string, vers: string, sorte: string, oriente = true) => liens.push({ de, vers, sorte, oriente });

  const defaut = c.univers.find((u) => u.id === c.campagne.univers?.id) ?? c.univers[0];
  for (const u of c.univers) {
    ajouter({ id: `univers:${u.id}`, libelle: u.nom, sorte: 'univers', infos: u.sorte === 'genere' ? 'Monde de l’Atlas' : 'Monde fait main', donnees: u.id });
    for (const p of u.civilisations?.peuples ?? []) {
      const id = `peuple:${u.id}:${p.cle}`;
      ajouter({ id, libelle: p.nom.replace(/^les /, ''), sorte: 'peuple', infos: [p.regime, p.souverain].filter(Boolean).join(' · '), donnees: { univers: u.id, cle: p.cle } });
      lier(id, `univers:${u.id}`, 'appartient');
      for (const r of p.relations) if (String(r.peuple) > String(p.cle)) lier(id, `peuple:${u.id}:${r.peuple}`, r.sorte, false);
    }
  }
  for (const p of c.personnages) {
    const id = `personnage:${p.id}`;
    ajouter({ id, libelle: p.nom, sorte: sortePerso(p), infos: p.role ?? '', donnees: p.id });
    const k = p.peuple && 'atlas' in p.peuple ? p.peuple.atlas : null;
    if (k !== null && defaut) lier(id, `peuple:${defaut.id}:${k}`, 'peuple');
    const grimoire = ((p.magie as { grimoire?: { id: string }[] } | null)?.grimoire) ?? [];
    for (const s of grimoire) lier(id, `sort:${s.id}`, 'connaît');
  }
  for (const s of c.sorts) ajouter({ id: `sort:${s.id}`, libelle: s.nom, sorte: 'sort', infos: s.categorie ?? '', donnees: s.id });
  for (const q of c.quetes) {
    const id = `quete:${q.id}`;
    ajouter({ id, libelle: q.titre, sorte: 'quete', infos: [q.sorte, q.statut].filter(Boolean).join(' · '), donnees: q.id });
    if (q.univers) lier(id, `univers:${q.univers.id}`, 'monde');
    for (const r of q.personnages) lier(id, `personnage:${r.id}`, 'implique');
    for (const r of q.lieux) lier(id, `carte:${r.id}`, 'lieu');
  }
  for (const k of c.cartes) {
    const id = `carte:${k.id}`;
    ajouter({ id, libelle: k.nom, sorte: k.type === 'village' ? 'village' : 'carte', infos: k.type, donnees: k.id });
    if (k.parent) lier(id, `carte:${k.parent.carte.id}`, 'dans');
    else if (k.univers) lier(id, `univers:${k.univers.id}`, 'monde');
    for (const r of k.reperes) if (r.lien) lier(id, `${r.lien.type}:${r.lien.id}`, 'repère');
  }
  for (const r of c.rencontres) {
    const id = `rencontre:${r.id}`;
    ajouter({ id, libelle: r.nom, sorte: 'rencontre', donnees: r.id });
    if (r.carte) lier(id, `carte:${r.carte.id}`, 'sur');
    if (r.quete) lier(`quete:${r.quete.id}`, id, 'combat');
    for (const j of r.jetons) lier(id, `personnage:${j.perso.id}`, 'participe');
  }
  for (const s of c.seances) {
    const id = `seance:${s.id}`;
    ajouter({ id, libelle: `Séance ${s.numero}`, sorte: 'seance', donnees: s.id });
    for (const r of s.liens ?? []) lier(id, `${r.type}:${r.id}`, 'parle de');
  }
  // Familles : liens de parenté et de mariage entre personnages liés.
  for (const f of c.familles ?? []) {
    const perso = new Map(f.membres.filter((m) => m.persoId).map((m) => [m.id, `personnage:${m.persoId}`]));
    for (const m of f.membres) {
      const a = perso.get(m.id);
      if (!a) continue;
      for (const pa of m.parents) { const b = perso.get(pa); if (b) lier(b, a, 'parent'); }
      for (const co of m.conjoints) { const b = perso.get(co); if (b && b < a) lier(a, b, 'conjoint', false); }
    }
  }
  const garder = new Set(noeuds.filter((n) => !visibles || visibles.has(n.sorte)).map((n) => n.id));
  return {
    noeuds: noeuds.filter((n) => garder.has(n.id)),
    liens: liens.filter((l) => garder.has(l.de) && garder.has(l.vers) && l.de !== l.vers),
  };
}

/** Page et cible à ouvrir pour un nœud. */
export function cibleDe(n: Noeud): { page: string; cible?: string } | null {
  const s = sorteNoeud(n.sorte);
  if (!s) return null;
  if (n.sorte === 'peuple') return { page: s.page, cible: JSON.stringify(n.donnees) };
  return { page: s.page, cible: typeof n.donnees === 'string' ? n.donnees : undefined };
}
