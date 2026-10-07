// Chargement tolérant d'une campagne : migre, complète les valeurs par défaut,
// conserve les champs inconnus, signale les problèmes sans jamais planter.
import type { Campagne, NomCollection } from './types';
import { COLLECTIONS, FORMAT, VERSION } from './types';
import { maintenant, nouvelId } from './creer';
import { migrer } from './migrations';
import { referencesCassees } from './references';

export interface ResultatChargement {
  campagne: Campagne;
  alertes: string[];
}

type Objet = Record<string, unknown>;
const estObjet = (v: unknown): v is Objet => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Valeurs par défaut de chaque objet d'une collection (ajoutées seulement si absentes). */
const DEFAUTS: Record<NomCollection, () => Objet> = {
  univers: () => ({ nom: 'Univers sans nom', sorte: 'fait-main' }),
  cartes: () => ({
    nom: 'Carte sans nom', type: 'lieu', source: { sorte: 'import' },
    images: { joueurs: null }, reperes: [], creeLe: maintenant(), majLe: maintenant(),
  }),
  personnages: () => ({ nom: 'Sans nom', sorte: 'pnj', combat: { regles: 'dnd5e', stats: {} } }),
  sorts: () => ({ nom: 'Sort sans nom', sceau: {} }),
  rencontres: () => ({ nom: 'Rencontre sans nom', jetons: [], terrain: [] }),
  quetes: () => ({ titre: 'Quête sans titre', source: { sorte: 'fait-main' }, lieux: [], personnages: [] }),
  seances: () => ({ numero: 0, date: '', liens: [] }),
  fichiers: () => ({ nom: 'fichier', mime: 'application/octet-stream', octets: 0 }),
  familles: () => ({ nom: 'Famille sans nom', sorte: 'famille', membres: [] }),
};

const PREFIXES: Record<NomCollection, string> = {
  univers: 'univ', cartes: 'carte', personnages: 'perso', sorts: 'sort',
  rencontres: 'renc', quetes: 'quete', seances: 'seance', fichiers: 'fichier', familles: 'famille',
};

function normaliserCollection(nom: NomCollection, brut: unknown, alertes: string[]): Objet[] {
  if (brut === undefined) return [];
  if (!Array.isArray(brut)) {
    alertes.push(`« ${nom} » n'est pas une liste : ignoré.`);
    return [];
  }
  const vus = new Set<string>();
  const sortie: Objet[] = [];
  brut.forEach((el, i) => {
    if (!estObjet(el)) {
      alertes.push(`${nom}[${i}] n'est pas un objet : ignoré.`);
      return;
    }
    const o: Objet = { ...DEFAUTS[nom](), ...el };
    if (typeof o.id !== 'string' || !o.id) {
      o.id = nouvelId(PREFIXES[nom]);
      alertes.push(`${nom}[${i}] n'avait pas d'identifiant : « ${o.id} » attribué.`);
    }
    if (vus.has(o.id as string)) {
      const ancien = o.id;
      o.id = nouvelId(PREFIXES[nom]);
      alertes.push(`${nom} : identifiant en double « ${ancien} », renommé « ${o.id} ».`);
    }
    vus.add(o.id as string);
    sortie.push(o);
  });
  return sortie;
}

/** Charge n'importe quel JSON prétendant être une campagne. Lève une erreur seulement si ce n'en est clairement pas une. */
export function chargerCampagne(brut: unknown): ResultatChargement {
  const alertes: string[] = [];
  if (!estObjet(brut)) throw new Error("Ce fichier n'est pas une campagne (objet JSON attendu).");
  if (brut.format !== undefined && brut.format !== FORMAT) {
    throw new Error(`Format « ${String(brut.format)} » non reconnu (attendu : ${FORMAT}).`);
  }
  const version = typeof brut.version === 'number' ? brut.version : VERSION;
  if (version > VERSION) {
    alertes.push(`Fichier en version ${version}, plus récente que l'application (${VERSION}) : certains champs peuvent être ignorés.`);
  }
  const migre = migrer(brut, version, alertes);

  const infos = estObjet(migre.campagne) ? migre.campagne : {};
  const t = maintenant();
  const campagne = {
    ...migre,
    format: FORMAT,
    version: VERSION,
    campagne: {
      nom: 'Campagne sans nom', regles: 'dnd5e', creeLe: t, majLe: t,
      ...infos,
      id: typeof infos.id === 'string' && infos.id ? infos.id : nouvelId('camp'),
    },
  } as Objet;
  for (const nom of COLLECTIONS) campagne[nom] = normaliserCollection(nom, migre[nom], alertes);

  const resultat = campagne as unknown as Campagne;
  for (const r of referencesCassees(resultat)) {
    alertes.push(`Lien cassé : ${r.depuis} → ${r.ref.type} « ${r.ref.id} » introuvable.`);
  }
  return { campagne: resultat, alertes };
}
