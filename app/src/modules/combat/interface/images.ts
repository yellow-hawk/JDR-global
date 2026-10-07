// Images de la table : portraits (adresses data: des jetons) et carte de fond (versions MJ et joueurs).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Campagne } from '../../../noyau/contrat';
import { lireFichier } from '../../../noyau/stockage';
import type { EtatTable } from '../moteur';
import type { Fond } from '../rendu';

/** Images des portraits par id de jeton (chargées une fois par adresse). */
export function usePortraits(etat: EtatTable): Map<number, HTMLImageElement> {
  const cache = useRef(new Map<string, HTMLImageElement>()).current;
  const [charges, setCharges] = useState(0);
  return useMemo(() => {
    const m = new Map<number, HTMLImageElement>();
    for (const j of etat.jetons) {
      if (!j.portrait) continue;
      let img = cache.get(j.portrait);
      if (!img) { img = new Image(); img.onload = () => setCharges((n) => n + 1); img.src = j.portrait; cache.set(j.portrait, img); }
      if (img.complete && img.naturalWidth) m.set(j.id, img);
    }
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat.jetons, charges]);
}

async function fondDepuis(idCampagne: string, idImage: string | undefined): Promise<Fond | null> {
  if (!idImage) return null;
  const b = await lireFichier(idCampagne, idImage);
  if (!b) return null;
  const image = await createImageBitmap(b);
  return { image, largeur: image.width, hauteur: image.height };
}

/** Carte de fond de la table : version MJ (si elle existe) et version joueurs. */
export function useFond(c: Campagne, idCarte: string | undefined): { mj: Fond | null; joueurs: Fond | null } {
  const [f, setF] = useState<{ mj: Fond | null; joueurs: Fond | null }>({ mj: null, joueurs: null });
  const k = c.cartes.find((x) => x.id === idCarte);
  const idJ = k?.images.joueurs ?? undefined, idM = k?.images.mj?.image ?? undefined;
  useEffect(() => {
    let annule = false;
    (async () => {
      const joueurs = await fondDepuis(c.campagne.id, idJ);
      const mj = idM ? await fondDepuis(c.campagne.id, idM) : joueurs;
      if (!annule) setF({ mj, joueurs });
    })().catch(() => !annule && setF({ mj: null, joueurs: null }));
    return () => { annule = true; };
  }, [c.campagne.id, idJ, idM]);
  return f;
}

/** Blob → adresse data: (portraits stockés avec les jetons), recadré au carré et réduit à 160 px. */
export async function portraitData(b: Blob): Promise<string> {
  const bmp = await createImageBitmap(b);
  const t = 160;
  const c = document.createElement('canvas');
  c.width = t; c.height = t;
  const s = Math.min(bmp.width, bmp.height);
  c.getContext('2d')!.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, t, t);
  bmp.close();
  return c.toDataURL('image/jpeg', 0.85);
}
