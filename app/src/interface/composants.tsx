// Petits composants partagés par les modules.
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ecouter } from '../noyau/bus';
import { lireFichier } from '../noyau/stockage';

export function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Champ de formulaire avec étiquette. */
export function Champ({ libelle, children }: { libelle: string; children: ReactNode }) {
  return <label className="champ"><span>{libelle}</span>{children}</label>;
}

/** Barre d'onglets : `onglets` = [id, libellé] ; `actif` contrôlé par le parent. */
export function Onglets<T extends string>({ onglets, actif, onChoix }: { onglets: [T, string][]; actif: T; onChoix(id: T): void }) {
  return (
    <div className="onglets" role="tablist">
      {onglets.map(([id, libelle]) => (
        <button key={id} role="tab" aria-selected={id === actif} className="onglet" onClick={() => onChoix(id)}>{libelle}</button>
      ))}
    </div>
  );
}

/** Bloc réservé au MJ (masqué en aperçu joueurs par le module qui l'utilise). */
export function BlocMj({ children }: { children: ReactNode }) {
  return <div className="bloc-mj"><span className="etiquette-mj">Réservé au MJ</span>{children}</div>;
}

/** Page d'annonce pour un module pas encore intégré. */
export function PageAVenir({ titre, etape, points }: { titre: string; etape: string; points: string[] }) {
  return (
    <div className="a-venir">
      <h1>{titre}</h1>
      <p className="discret">Arrive à l'{etape}.</p>
      <ul>{points.map((p) => <li key={p}>{p}</li>)}</ul>
    </div>
  );
}

/** Messages courts (événement « message » du bus). */
export function Toasts() {
  const [liste, setListe] = useState<{ id: number; texte: string; sorte?: string }[]>([]);
  useEffect(() => ecouter('message', (m) => {
    const id = Date.now() + Math.random();
    setListe((l) => [...l, { id, ...m }]);
    window.setTimeout(() => setListe((l) => l.filter((x) => x.id !== id)), m.sorte === 'erreur' ? 7000 : 3500);
  }), []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {liste.map((t) => <div key={t.id} className={`toast ${t.sorte ?? ''}`}>{t.texte}</div>)}
    </div>
  );
}

/** URL temporaire d'un fichier de la campagne (image), libérée automatiquement. */
export function useUrlFichier(idCampagne: string | undefined, idFichier: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!idCampagne || !idFichier) { setUrl(null); return; }
    let actif = true;
    let cree: string | null = null;
    void lireFichier(idCampagne, idFichier).then((b) => {
      if (!actif || !b) return;
      cree = URL.createObjectURL(b);
      setUrl(cree);
    });
    return () => { actif = false; if (cree) URL.revokeObjectURL(cree); };
  }, [idCampagne, idFichier]);
  return url;
}
