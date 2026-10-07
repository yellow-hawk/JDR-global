// Organigrammes de la campagne (pur, testé) : monde et peuples, institutions d'un peuple, dynastie, quêtes, cartes, personnages.
import type { Campagne, Civilisation, Personnage } from '../../noyau/contrat';
import type { NoeudArbre } from '../../noyau/graphe';
import { hashStr, mulberry32 } from '../../noyau/hasard';
import donnees from './institutions.json';

interface Poste { titre: string; motif?: string; villes?: string; enfants?: Poste[] }
const REGIMES = donnees.regimes as unknown as Record<string, { postes: Poste[] }>;

/** Données attachées à un nœud : personnage occupant, ou poste vacant à pourvoir. */
export interface InfoNoeud { persoId?: string; page?: string; cible?: string; vacant?: { titre: string; nom: string; peuple: string } }

const n = (id: string, libelle: string, enfants: NoeudArbre[] = [], sousTitre?: string, couleur?: string, donnees?: InfoNoeud): NoeudArbre =>
  ({ id, libelle, sousTitre, couleur, enfants, donnees });

const COUL = { monde: '#d4a050', peuple: '#e0705f', ville: '#41b6c4', poste: '#b48ae6', perso: '#45a84a', vacant: '#a8987d', quete: '#b48ae6', etape: '#c9a84c', carte: '#41b6c4', rencontre: '#e67e22' };

export function organigrammeMonde(c: Campagne): NoeudArbre {
  return n('campagne', c.campagne.nom, c.univers.map((u) => n(`u:${u.id}`, u.nom,
    (u.civilisations?.peuples ?? u.monde?.peuples.map((p) => ({ cle: p.id, nom: p.nom, villes: [], regime: '' } as unknown as Civilisation)) ?? []).map((p) =>
      n(`p:${u.id}:${String(p.cle)}`, p.nom.replace(/^les /, ''), p.villes.map((v) => n(`v:${u.id}:${String(p.cle)}:${v.nom}`, v.nom, [], v.capitale ? 'capitale' : 'cité', COUL.ville)),
        [p.regime, p.souverain].filter(Boolean).join(' · '), p.couleur ?? COUL.peuple, { page: 'pays', cible: JSON.stringify({ univers: u.id, cle: p.cle }) })),
    u.sorte === 'genere' ? 'monde de l’Atlas' : 'monde fait main', COUL.monde)), 'campagne', COUL.monde);
}

/** Institutions d'un peuple : postes selon son régime, occupés par les PNJ de ce peuple dont le rôle convient. */
export function organigrammeInstitutions(c: Campagne, univ: string, civ: Civilisation): NoeudArbre {
  const modele = REGIMES[civ.regime ?? ''] ?? REGIMES._defaut;
  const pnj = c.personnages.filter((p) => p.peuple && 'atlas' in p.peuple && p.peuple.atlas === String(civ.cle));
  const pris = new Set<string>();
  const rng = mulberry32(hashStr(`institutions|${univ}|${String(civ.cle)}`));
  const nomPropose = () => civ.noms.length ? civ.noms[Math.floor(rng() * civ.noms.length)] : '—';
  const occupant = (motif?: string): Personnage | undefined => {
    if (!motif) return undefined;
    const re = new RegExp(motif, 'i');
    const p = pnj.find((x) => !pris.has(x.id) && re.test(x.role ?? ''));
    if (p) pris.add(p.id);
    return p;
  };
  let k = 0;
  const poste = (titre: string, motif?: string, enfants: NoeudArbre[] = []): NoeudArbre => {
    const id = `i:${k++}`;
    if (!motif) return n(id, titre, enfants, undefined, COUL.poste);
    const p = occupant(motif);
    return p ? n(id, p.nom, enfants, titre, COUL.perso, { persoId: p.id, page: 'personnages', cible: p.id })
      : n(id, titre, enfants, 'poste à pourvoir', COUL.vacant, { vacant: { titre, nom: nomPropose(), peuple: String(civ.cle) } });
  };
  const construire = (ps: Poste[]): NoeudArbre[] => ps.map((x) => {
    if (x.villes) return poste(x.titre, undefined, civ.villes.map((v) => poste(x.villes!.replace('{ville}', v.nom), `${x.motif ?? 'seigneur|gouverneur|consul|chef|noble|ruiné'}`)));
    return poste(x.titre, x.motif, construire(x.enfants ?? []));
  });
  const souverainPerso = pnj.find((p) => civ.souverain && civ.souverain.includes(p.nom));
  if (souverainPerso) pris.add(souverainPerso.id);
  const racine = n('souverain', civ.souverain || 'Souverain', construire(modele.postes), civ.regimeTexte ?? civ.regime, civ.couleur ?? COUL.peuple,
    souverainPerso ? { persoId: souverainPerso.id, page: 'personnages', cible: souverainPerso.id } : undefined);
  // Les autres PNJ du peuple, sans poste, dans une branche à part.
  const reste = pnj.filter((p) => !pris.has(p.id));
  if (reste.length) racine.enfants.push(n('autres', 'Autres personnages', reste.map((p) => n(`o:${p.id}`, p.nom, [], p.role, COUL.perso, { persoId: p.id, page: 'personnages', cible: p.id }))));
  return racine;
}

/** Ligne de succession d'une dynastie (souverains dans l'ordre des règnes). */
export function organigrammeDynastie(c: Campagne, familleId: string): NoeudArbre | null {
  const f = (c.familles ?? []).find((x) => x.id === familleId);
  if (!f) return null;
  const regnants = f.membres.filter((m) => m.regne).sort((a, b) => a.regne![0] - b.regne![0]);
  if (!regnants.length) return null;
  let racine: NoeudArbre | null = null, dernier: NoeudArbre | null = null;
  for (const m of regnants) {
    const prec = dernier ? regnants[regnants.indexOf(m) - 1] : null;
    const lien = !prec ? 'fondateur' : m.parents.includes(prec.id) ? 'enfant du précédent' : prec.parents.some((p) => m.parents.includes(p)) ? 'frère ou sœur du précédent' : 'nouvelle lignée';
    const noeud = n(`d:${m.id}`, `${m.nom}`, [], `${m.regne![0]}–${m.regne![1]} · ${lien}`, m.sexe === 'f' ? '#c2577a' : '#3f73b8',
      m.persoId ? { persoId: m.persoId, page: 'personnages', cible: m.persoId } : { page: 'genealogie', cible: f.id });
    if (!racine) racine = noeud; else dernier!.enfants.push(noeud);
    dernier = noeud;
  }
  return racine;
}

export function organigrammeQuetes(c: Campagne): NoeudArbre {
  const sortes = [...new Set(c.quetes.map((q) => q.sorte ?? 'autre'))];
  const perso = (id: string) => c.personnages.find((p) => p.id === id);
  return n('quetes', 'Quêtes', sortes.map((s) => n(`s:${s}`, s.charAt(0).toUpperCase() + s.slice(1), c.quetes.filter((q) => (q.sorte ?? 'autre') === s).map((q) => {
    const rencontres = c.rencontres.filter((r) => r.quete?.id === q.id);
    const etapes = (q.etapes ?? []).map((e, i) => {
      const lieu = typeof e.lieu === 'string' ? e.lieu : '';
      const r = rencontres.find((x) => lieu && x.nom.startsWith(lieu.replace(/\s*\(.*\)$/, '')));
      return n(`e:${q.id}:${i}`, e.titre, r ? [n(`r:${r.id}`, r.nom, [], 'rencontre prête', COUL.rencontre, { page: 'combat', cible: r.id })] : [], lieu, COUL.etape);
    });
    const pnj = q.personnages.map((x) => perso(x.id)).filter((p): p is Personnage => !!p).map((p) => n(`qp:${q.id}:${p.id}`, p.nom, [], p.role ?? 'personnage', COUL.perso, { persoId: p.id, page: 'personnages', cible: p.id }));
    return n(`q:${q.id}`, q.titre, [...etapes, ...(pnj.length ? [n(`qpg:${q.id}`, 'Personnages', pnj)] : [])], q.statut, COUL.quete, { page: 'journal', cible: q.id });
  }))), undefined, COUL.quete);
}

export function organigrammeCartes(c: Campagne): NoeudArbre {
  const enfants = (id: string | null): NoeudArbre[] => c.cartes.filter((k) => (k.parent?.carte.id ?? null) === id)
    .map((k) => n(`k:${k.id}`, k.nom, enfants(k.id), k.type, COUL.carte, { page: 'cartes', cible: k.id }));
  return n('cartes', 'Cartes', enfants(null));
}

export function organigrammePersonnages(c: Campagne): NoeudArbre {
  const u = c.univers.find((x) => x.id === c.campagne.univers?.id) ?? c.univers[0];
  const peuples = u?.civilisations?.peuples ?? [];
  const noms = [...new Set(c.personnages.map((p) => (p.sorte === 'pj' ? 'Personnages joueurs' : peupleNom(p, peuples))))];
  return n('persos', 'Personnages', noms.map((g) => n(`g:${g}`, g.replace(/^les /, ''), c.personnages.filter((p) => (p.sorte === 'pj' ? 'Personnages joueurs' : peupleNom(p, peuples)) === g)
    .sort((a, b) => (a.role ?? '').localeCompare(b.role ?? '')).map((p) => n(`pp:${p.id}`, p.nom, [], p.role ?? p.sorte, p.sorte === 'ennemi' ? '#c0392b' : COUL.perso, { persoId: p.id, page: 'personnages', cible: p.id })))));
}

const peupleNom = (p: Personnage, peuples: Civilisation[]) =>
  (p.peuple && 'atlas' in p.peuple ? peuples.find((x) => String(x.cle) === (p.peuple as { atlas: string }).atlas)?.nom : undefined) ?? 'Sans peuple';
