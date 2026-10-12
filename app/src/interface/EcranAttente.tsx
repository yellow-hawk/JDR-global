// Commande de l'écran joueurs dans l'en-tête (MJ) : ce qui est affiché, retour à l'écran d'attente
// (bouton ou Alt+A, depuis n'importe quelle page) et réglage de l'écran d'attente (message, image).
import { useEffect, useRef, useState } from 'react';
import type { Campagne } from '../noyau/contrat';
import { avantLAttente, ecranActuel, libelleScene, montrerAuxJoueurs, reprendreApresAttente, suivreEcran, type EcranActuel } from '../noyau/bus';
import { ajouterFichier, choisirFichier, lireFichier, supprimerFichier } from '../noyau/stockage';
import { useCampagne } from './etat';

/** Réglages de l'écran d'attente, rangés dans `modules.ecran.attente`. */
export interface ReglagesAttente { message?: string; image?: string | null }
export const reglagesAttente = (c: Campagne | null): ReglagesAttente =>
  ((c?.modules?.ecran as { attente?: ReglagesAttente } | undefined)?.attente) ?? {};

/** Affiche l'écran d'attente de la campagne sur l'écran joueurs. */
export async function montrerAttente(c: Campagne | null): Promise<void> {
  const r = reglagesAttente(c);
  const image = c && r.image ? (await lireFichier(c.campagne.id, r.image)) ?? null : null;
  montrerAuxJoueurs({ sorte: 'vide', campagne: c?.campagne.nom, message: r.message, image }, 'attente');
}

/** Ce qui est à l'écran joueurs, suivi en direct. */
export function useEcranActuel(): EcranActuel {
  const [e, setE] = useState(ecranActuel);
  useEffect(() => suivreEcran(setE), []);
  return e;
}

export function CommandeEcran() {
  const { campagne, modifier } = useCampagne();
  const ecran = useEcranActuel();
  const [reglage, setReglage] = useState(false);
  const r = reglagesAttente(campagne);
  const attente = ecran.source === 'attente' || ecran.scene.sorte === 'vide';
  const direct = ecran.source.startsWith('perso:') || ecran.source === 'combat';

  // Message ou image changés pendant que l'attente est affichée : mis à jour sur l'écran joueurs.
  useEffect(() => {
    if (ecranActuel().source !== 'attente') return;
    const t = window.setTimeout(() => void montrerAttente(campagne), 300);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.message, r.image]);

  // Alt+A : écran d'attente, où que l'on soit dans l'outil.
  useEffect(() => {
    const touche = (ev: KeyboardEvent) => {
      // Alt+A bascule : attente, puis retour à ce qui était montré.
      if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.key.toLowerCase() === 'a') { ev.preventDefault(); if (!reprendreApresAttente()) void montrerAttente(campagne); }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [campagne]);

  // Le panneau de réglage se ferme d'un clic ailleurs ou avec Échap.
  const boite = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!reglage) return;
    const clic = (ev: PointerEvent) => { if (!boite.current?.contains(ev.target as Node)) setReglage(false); };
    const echap = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setReglage(false); };
    window.addEventListener('pointerdown', clic);
    window.addEventListener('keydown', echap);
    return () => { window.removeEventListener('pointerdown', clic); window.removeEventListener('keydown', echap); };
  }, [reglage]);

  const ecrire = (f: (x: ReglagesAttente) => ReglagesAttente) =>
    modifier((c) => ({ ...c, modules: { ...c.modules, ecran: { ...c.modules?.ecran, attente: f(reglagesAttente(c)) } } }));
  const changerImage = async () => {
    if (!campagne) return;
    const choix = await choisirFichier('image/png,image/jpeg,image/webp');
    if (!choix) return;
    const f = await ajouterFichier(campagne.campagne.id, choix[0], choix[0].name);
    const ancien = r.image;
    modifier((c) => ({ ...c, fichiers: [...c.fichiers.filter((x) => x.id !== ancien), f], modules: { ...c.modules, ecran: { ...c.modules?.ecran, attente: { ...reglagesAttente(c), image: f.id } } } }));
    if (ancien) void supprimerFichier(campagne.campagne.id, ancien);
  };
  const retirerImage = () => {
    if (!campagne || !r.image) return;
    const ancien = r.image;
    modifier((c) => ({ ...c, fichiers: c.fichiers.filter((x) => x.id !== ancien), modules: { ...c.modules, ecran: { ...c.modules?.ecran, attente: { ...reglagesAttente(c), image: null } } } }));
    void supprimerFichier(campagne.campagne.id, ancien);
  };

  return (
    <span className="coq-ecran" ref={boite}>
      <span className="coq-ecran-etat" title="Ce que voient les joueurs en ce moment">
        {direct && <span className="coq-direct">● direct</span>}
        {libelleScene(ecran.scene)}
      </span>
      {attente && avantLAttente() ? (
        <button className="btn btn-petit btn-mj" title={`Remettre « ${libelleScene(avantLAttente()!.scene)} » sur l’écran joueurs (Alt+A)`} onClick={() => reprendreApresAttente()}>
          ↩ Reprendre
        </button>
      ) : (
        <button className="btn btn-petit btn-mj" disabled={attente} title="Remettre l’écran d’attente sur l’écran joueurs (Alt+A)" onClick={() => void montrerAttente(campagne)}>
          ⏸ Attente
        </button>
      )}
      <button className="btn btn-petit" title="Régler l’écran d’attente (message, image)" aria-expanded={reglage} onClick={() => setReglage(!reglage)}>⚙</button>
      {reglage && campagne && (
        <span className="coq-ecran-reglage carte-ui">
          <strong>Écran d’attente</strong>
          <textarea rows={2} placeholder="Message (ex. « Pause, on reprend dans 10 minutes »)" value={r.message ?? ''} onChange={(e) => ecrire((x) => ({ ...x, message: e.target.value }))} />
          <span className="ligne">
            <button className="btn btn-petit" onClick={() => void changerImage()}>{r.image ? 'Changer l’image' : 'Choisir une image'}</button>
            {r.image && <button className="btn btn-petit" onClick={retirerImage}>Retirer l’image</button>}
            <span style={{ flex: 1 }} />
            <button className="btn btn-petit btn-mj" onClick={() => { void montrerAttente(campagne); setReglage(false); }}>Afficher</button>
          </span>
          <span className="discret">Raccourci : Alt+A depuis n’importe quelle page (une fois pour l’attente, une fois pour reprendre).</span>
        </span>
      )}
    </span>
  );
}
