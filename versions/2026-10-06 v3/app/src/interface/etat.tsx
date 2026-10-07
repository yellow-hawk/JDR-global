// État de l'application : campagne ouverte, rôle (MJ / aperçu joueurs), sauvegarde automatique.
// Les modules lisent l'état avec useCampagne() ; ils ne parlent jamais au stockage pour la campagne elle-même.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Campagne } from '../noyau/contrat';
import { nouvelleCampagne, vueJoueurs } from '../noyau/contrat';
import {
  ecrireFichier, ecrireReglage, lireCampagne, lireReglage, sauverCampagne,
} from '../noyau/stockage';
import { emettre } from '../noyau/bus';

export type Role = 'mj' | 'joueurs';

export interface EtatCampagne {
  /** Campagne complète (MJ). null = aucune campagne ouverte. */
  campagne: Campagne | null;
  /** Ce que la page doit afficher : complète en rôle MJ, filtrée en aperçu joueurs. */
  vue: Campagne | null;
  role: Role;
  lectureSeule: boolean;
  alertes: string[];
  enregistrement: 'ok' | 'en-cours' | 'erreur';
  changerRole(r: Role): void;
  /** Modifie la campagne ; la sauvegarde suit automatiquement. */
  modifier(f: (c: Campagne) => Campagne): void;
  ouvrir(id: string): Promise<void>;
  creer(nom: string): Promise<void>;
  /** Ouvre une campagne importée et range ses fichiers. */
  installer(c: Campagne, fichiers: Map<string, Uint8Array>, alertes: string[]): Promise<void>;
  fermer(): void;
}

const Contexte = createContext<EtatCampagne | null>(null);

export function useCampagne(): EtatCampagne {
  const e = useContext(Contexte);
  if (!e) throw new Error('useCampagne() hors du FournisseurCampagne');
  return e;
}

const DELAI_SAUVEGARDE = 400;

export function FournisseurCampagne({ children }: { children: ReactNode }) {
  const [campagne, setCampagne] = useState<Campagne | null>(null);
  const [role, setRole] = useState<Role>('mj');
  const [alertes, setAlertes] = useState<string[]>([]);
  const [enregistrement, setEnregistrement] = useState<EtatCampagne['enregistrement']>('ok');
  const minuteur = useRef<number | undefined>(undefined);
  const aSauver = useRef<Campagne | null>(null);

  const sauverMaintenant = useCallback(async () => {
    const c = aSauver.current;
    if (!c) return;
    aSauver.current = null;
    try {
      await sauverCampagne(c);
      setEnregistrement('ok');
    } catch (err) {
      setEnregistrement('erreur');
      emettre('message', { texte: `Enregistrement impossible : ${String(err)}`, sorte: 'erreur' });
    }
  }, []);

  const programmerSauvegarde = useCallback((c: Campagne) => {
    aSauver.current = c;
    setEnregistrement('en-cours');
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(sauverMaintenant, DELAI_SAUVEGARDE);
  }, [sauverMaintenant]);

  // Sauvegarde en attente quand on ferme l'onglet.
  useEffect(() => {
    const avant = () => { if (aSauver.current) void sauverMaintenant(); };
    window.addEventListener('beforeunload', avant);
    return () => window.removeEventListener('beforeunload', avant);
  }, [sauverMaintenant]);

  const modifier = useCallback((f: (c: Campagne) => Campagne) => {
    setCampagne((avant) => {
      if (!avant) return avant;
      const apres = f(avant);
      if (apres !== avant) programmerSauvegarde(apres);
      return apres;
    });
  }, [programmerSauvegarde]);

  const ouvrir = useCallback(async (id: string) => {
    const r = await lireCampagne(id);
    if (!r) { emettre('message', { texte: 'Campagne introuvable.', sorte: 'erreur' }); return; }
    setCampagne(r.campagne);
    setAlertes(r.alertes);
    await ecrireReglage('derniere-campagne', id);
  }, []);

  const creer = useCallback(async (nom: string) => {
    const c = await sauverCampagne(nouvelleCampagne(nom));
    setCampagne(c);
    setAlertes([]);
    await ecrireReglage('derniere-campagne', c.campagne.id);
  }, []);

  const installer = useCallback(async (c: Campagne, fichiers: Map<string, Uint8Array>, al: string[]) => {
    for (const f of c.fichiers) {
      const octets = fichiers.get(f.id);
      if (octets) await ecrireFichier(c.campagne.id, f.id, new Blob([octets as BlobPart], { type: f.mime }));
    }
    const sauvee = await sauverCampagne(c);
    setCampagne(sauvee);
    setAlertes(al);
    await ecrireReglage('derniere-campagne', sauvee.campagne.id);
  }, []);

  const fermer = useCallback(() => {
    if (aSauver.current) void sauverMaintenant();
    setCampagne(null);
    setAlertes([]);
    void ecrireReglage('derniere-campagne', null);
  }, [sauverMaintenant]);

  // Réouvre la dernière campagne au démarrage.
  useEffect(() => {
    void (async () => {
      const id = await lireReglage<string | null>('derniere-campagne');
      if (id) await ouvrir(id).catch(() => undefined);
    })();
  }, [ouvrir]);

  const vue = useMemo(
    () => (campagne && role === 'joueurs' ? vueJoueurs(campagne) : campagne),
    [campagne, role],
  );

  const valeur: EtatCampagne = {
    campagne, vue, role, lectureSeule: role === 'joueurs', alertes, enregistrement,
    changerRole: setRole, modifier, ouvrir, creer, installer, fermer,
  };
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}
