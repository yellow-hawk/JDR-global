// Dossier de sauvegarde sur l'ordinateur (Chrome / Edge : File System Access). Le dossier choisi est retenu ;
// après un redémarrage du navigateur, il faut le réautoriser d'un clic (règle du navigateur).
import { ecrireReglage, lireReglage } from './campagnes';

interface Poignee {
  name: string;
  queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  getFileHandle(nom: string, o: { create: boolean }): Promise<{ createWritable(): Promise<{ write(d: Blob | BufferSource): Promise<void>; close(): Promise<void> }> }>;
}

const CLE = 'dossier-sauvegarde';

export const dossierPossible = (): boolean => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export async function choisirDossier(): Promise<string | null> {
  if (!dossierPossible()) return null;
  try {
    const h = await (window as unknown as { showDirectoryPicker(o: { mode: 'readwrite'; id: string }): Promise<Poignee> }).showDirectoryPicker({ mode: 'readwrite', id: 'jdr-global-sauvegardes' });
    await ecrireReglage(CLE, h);
    return h.name;
  } catch { return null; }
}

export async function oublierDossier(): Promise<void> { await ecrireReglage(CLE, null); }

/** Nom du dossier retenu et état de l'autorisation. */
export async function etatDossier(): Promise<{ nom: string; autorise: boolean } | null> {
  const h = await lireReglage<Poignee | null>(CLE);
  if (!h) return null;
  try { return { nom: h.name, autorise: (await h.queryPermission({ mode: 'readwrite' })) === 'granted' }; } catch { return { nom: h.name, autorise: false }; }
}

/** À appeler depuis un clic : redemande l'autorisation d'écrire dans le dossier retenu. */
export async function autoriserDossier(): Promise<boolean> {
  const h = await lireReglage<Poignee | null>(CLE);
  if (!h) return false;
  try { return (await h.requestPermission({ mode: 'readwrite' })) === 'granted'; } catch { return false; }
}

/** Écrit (ou remplace) un fichier dans le dossier. false si pas de dossier ou pas d'autorisation. */
export async function ecrireDansDossier(nom: string, contenu: Uint8Array): Promise<boolean> {
  const h = await lireReglage<Poignee | null>(CLE);
  if (!h) return false;
  try {
    if ((await h.queryPermission({ mode: 'readwrite' })) !== 'granted') return false;
    const f = await h.getFileHandle(nom, { create: true });
    const w = await f.createWritable();
    await w.write(contenu as BufferSource);
    await w.close();
    return true;
  } catch { return false; }
}
