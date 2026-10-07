// Noms de sorts : un nom évocateur tiré de la forme principale (Rameau), de l'élément (Cœur) et des Nœuds.
import type { Sceau } from './types';

type Genre = 'm' | 'f';
interface Nom { n: string; g: Genre; pl?: boolean }
const N = (n: string, g: Genre, pl = false): Nom => ({ n, g, pl });

/** Nom de la forme, selon sa répartition (radiale = tout autour, sinon dirigée) */
function nomForme(cle: string, radial: boolean, nombre: number, coeur: string): Nom {
  switch (cle) {
    case 'jet': return radial ? N('Colonne', 'f') : N('Lance', 'f');
    case 'jet~': return N('Puits', 'm');
    case 'pluie': return N('Averse', 'f');
    case 'pluie~': return N('Geyser', 'm');
    case 'gerbe': return radial ? N('Nova', 'f') : N('Éventail', 'm');
    case 'gerbe~': return N('Moisson', 'f');
    case 'plume': return N('Lévitation', 'f');
    case 'plume~': return N('Ancre', 'f');
    case 'appel': return N('Étreinte', 'f');
    case 'appel~': return N('Onde', 'f');
    case 'dard': return nombre > 1 ? N('Traits', 'm', true) : N('Trait', 'm');
    case 'dard~': return N('Bouclier', 'm');
    case 'etau': return N('Noyau', 'm');
    case 'etau~': return N('Brume', 'f');
    case 'rempart': return radial ? N('Dôme', 'm') : N('Muraille', 'f');
    case 'rempart~': return N('Brèche', 'f');
    case 'tourbillon': return N('Tourbillon', 'm');
    case 'tourbillon~': return N('Accalmie', 'f');
    case 'figure': return CREATURES[coeur] ?? N('Esprit', 'm');
    case 'figure~': return N('Dissipation', 'f');
    case 'tisse': return N('Rets', 'm', true);
    case 'tisse~': return N('Trempe', 'f');
    case 'ampleur': return N('Croissance', 'f');
    case 'ampleur~': return N('Réduction', 'f');
  }
  return N('Éveil', 'm');
}

const CREATURES: Record<string, Nom> = {
  braise: N('Phénix', 'm'), 'braise~': N('Loup', 'm'), source: N('Serpent', 'm'), 'source~': N('Scarabée', 'm'),
  socle: N('Golem', 'm'), 'socle~': N('Spectre', 'm'), souffle: N('Faucon', 'm'), 'souffle~': N('Hibou', 'm'),
  lueur: N('Cerf', 'm'), 'lueur~': N('Corbeau', 'm'),
};

/** Complément d'élément (« de flammes ») */
const COMPLEMENT: Record<string, string> = {
  braise: 'de flammes', 'braise~': 'de givre', source: 'd’eau', 'source~': 'de sécheresse', socle: 'de pierre', 'socle~': 'de poussière',
  souffle: 'de vent', 'souffle~': 'de silence', lueur: 'de lumière', 'lueur~': 'd’ombre', memoire: 'de mémoire', 'memoire~': 'd’usure',
  regard: 'de clairvoyance', 'regard~': 'de voile', lien: 'de liens', 'lien~': 'de rupture', mouvement: 'd’animation', 'mouvement~': 'd’immobilité',
  seve: 'de sève', 'seve~': 'de flétrissure', chair: 'de métamorphose', 'chair~': 'de pétrification', esprit: 'd’oubli', 'esprit~': 'de réminiscence',
};

/** Adjectif lié à un Nœud marquant : [masc., fém.] */
function adjectif(s: Sceau): [string, string] | null {
  const a = (id: string, inv: boolean) => s.noeuds.some((n) => n.id === id && n.inv === inv);
  if (s.greffe) return ['jumelé', 'jumelée'];
  if (s.couronne) return ['couronné', 'couronnée'];
  if (s.fendu) return ['scindé', 'scindée'];
  if (a('guet', false)) return ['dormant', 'dormante'];
  if (a('sablier', true)) return ['fulgurant', 'fulgurante'];
  if (a('douce', true)) return ['furieux', 'furieuse'];
  if (a('echo', false)) return ['battant', 'battante'];
  if (a('echo', true)) return ['contenu', 'contenue'];
  if (a('halo', true)) return ['protecteur', 'protectrice'];
  if (s.noeuds.filter((n) => n.id === 'sablier' && !n.inv).length >= 2) return ['éternel', 'éternelle'];
  if (a('sablier', false)) return ['persistant', 'persistante'];
  if (a('douce', false)) return ['apaisé', 'apaisée'];
  if (a('mot', false)) return ['scellé', 'scellée'];
  return null;
}

const accorder = (adj: [string, string], nom: Nom) => {
  const base = nom.g === 'f' ? adj[1] : adj[0];
  if (!nom.pl) return base;
  return /[sx]$/.test(base) ? base : base + 's';
};

export interface FormeLue { id: string; inv: boolean; nombre: number }

/** Titre du sort, par ex. « Lance de flammes persistante », « Dôme de givre protecteur », « Phénix de flammes ». */
export function titreSort(s: Sceau, formes: FormeLue[], radial: boolean): string {
  if (!s.coeur) return 'Sceau sans Cœur';
  const cleC = s.coeur.id + (s.coeur.inv ? '~' : '');
  const f = formes[0];
  const nom = f ? nomForme(f.id + (f.inv ? '~' : ''), radial, f.nombre, cleC) : N('Éveil', 'm');
  let t = `${nom.n} ${COMPLEMENT[cleC] ?? ''}`.trim();
  const adj = adjectif(s);
  if (adj) t += ' ' + accorder(adj, nom);
  return t;
}
