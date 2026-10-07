// Export / import d'une campagne en archive .zip : campagne.json + fichiers/<id>.<ext>
// Fonctions pures (pas d'IndexedDB) : testables sous Node.
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Zippable } from 'fflate';
import type { Campagne, Fichier } from '../contrat';
import { chargerCampagne, vueJoueurs } from '../contrat';

const EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'image/svg+xml': 'svg', 'application/pdf': 'pdf', 'application/json': 'json',
};

const nomDansArchive = (f: Fichier): string => {
  const ext = EXT[f.mime] ?? (f.nom.includes('.') ? f.nom.split('.').pop() : 'bin');
  return `fichiers/${f.id}.${ext}`;
};

export interface OptionsExport {
  /** Version joueurs : sans secrets et sans les fichiers réservés au MJ. */
  joueurs?: boolean;
}

/**
 * Construit l'archive. `lire(id)` fournit le contenu de chaque fichier
 * (un fichier absent est signalé dans `manquants` et omis).
 */
export async function construireArchive(
  c: Campagne,
  lire: (idFichier: string) => Promise<Uint8Array | undefined>,
  opts: OptionsExport = {},
): Promise<{ octets: Uint8Array; manquants: string[] }> {
  const campagne = opts.joueurs ? vueJoueurs(c) : c;
  const contenu: Zippable = {
    'campagne.json': [strToU8(JSON.stringify(campagne, null, 2)), { level: 6 }],
  };
  const manquants: string[] = [];
  for (const f of campagne.fichiers) {
    const octets = await lire(f.id);
    if (!octets) { manquants.push(f.id); continue; }
    contenu[nomDansArchive(f)] = [octets, { level: 0 }]; // images déjà compressées
  }
  return { octets: zipSync(contenu), manquants };
}

/** Lit une archive (ou un simple campagne.json) : campagne normalisée + contenus des fichiers. */
export function lireArchive(octets: Uint8Array): {
  campagne: Campagne; alertes: string[]; fichiers: Map<string, Uint8Array>;
} {
  // Un JSON seul commence par "{" (éventuellement après des espaces / BOM).
  const debut = strFromU8(octets.subarray(0, 8)).replace(/^﻿/, '').trimStart();
  if (debut.startsWith('{')) {
    const r = chargerCampagne(JSON.parse(strFromU8(octets).replace(/^﻿/, '')));
    return { ...r, fichiers: new Map() };
  }
  const zip = unzipSync(octets);
  const json = zip['campagne.json'];
  if (!json) throw new Error("Archive invalide : « campagne.json » est absent.");
  const r = chargerCampagne(JSON.parse(strFromU8(json)));
  const fichiers = new Map<string, Uint8Array>();
  for (const f of r.campagne.fichiers) {
    const contenu = zip[nomDansArchive(f)];
    if (contenu) fichiers.set(f.id, contenu);
    else r.alertes.push(`Fichier « ${f.nom} » absent de l'archive.`);
  }
  return { ...r, fichiers };
}

/** Nom de fichier proposé à l'export. */
export function nomArchive(c: Campagne, joueurs = false): string {
  const propre = c.campagne.nom.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'campagne';
  const date = new Date().toISOString().slice(0, 10);
  return `${propre}${joueurs ? ' - joueurs' : ''} - ${date}.zip`;
}
