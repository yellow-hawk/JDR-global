// Packs d'univers : ceux fournis avec l'application (public/packs/) et ceux importés depuis un fichier.
// Installer un pack l'ajoute à la campagne (toutes les tables suivantes) et à la table en cours.
import { useEffect, useState } from 'react';
import type { Campagne } from '../../../noyau/contrat';
import { choisirFichier } from '../../../noyau/stockage';
import { installerPack, packsDeLaCampagne, retirerPack } from '../logique';
import { appliquerPack, estPack, type Pack } from '../moteur';
import type { Controleur } from './types';

interface Fourni { fichier: string; nom: string; desc?: string }

export function Packs({ ctl, c, modifier }: { ctl: Controleur; c: Campagne; modifier: (f: (c: Campagne) => Campagne) => void }) {
  const [fournis, setFournis] = useState<Fourni[]>([]);
  useEffect(() => {
    fetch('packs/index.json').then((r) => r.json()).then((d: { packs?: Fourni[] }) => setFournis(d.packs ?? [])).catch(() => setFournis([]));
  }, []);
  const installes = packsDeLaCampagne(c);

  const installer = (p: Pack) => {
    modifier((x) => installerPack(x, p));
    ctl.faire((e) => appliquerPack(e, p));
    ctl.dire(`Pack « ${p.nom} » installé : bibliothèque, sorts et états ajoutés.`, 'succes');
  };
  const depuisFichier = async () => {
    const f = (await choisirFichier('application/json,.json'))?.[0];
    if (!f) return;
    try {
      const v: unknown = JSON.parse(await f.text());
      if (!estPack(v)) throw new Error('Ce fichier n’est pas un pack JDR Global.');
      installer(v);
    } catch (e) { ctl.dire((e as Error).message, 'erreur'); }
  };
  const fourni = async (x: Fourni) => {
    try {
      const v: unknown = await (await fetch(`packs/${x.fichier}`)).json();
      if (estPack(v)) installer(v); else throw new Error('Pack invalide.');
    } catch (e) { ctl.dire((e as Error).message, 'erreur'); }
  };

  return (
    <details>
      <summary>Packs d’univers ({installes.length})</summary>
      {installes.map((p) => (
        <div key={p.id} className="ligne combat-renc">
          <span style={{ flex: 1 }} title={p.desc}>{p.nom}</span>
          <button className="btn btn-petit btn-danger" title="Retirer de la campagne (la table en cours garde son contenu)" onClick={() => modifier((x) => retirerPack(x, p.id))}>×</button>
        </div>
      ))}
      {fournis.filter((x) => !installes.some((p) => p.nom === x.nom)).map((x) => (
        <div key={x.fichier} className="ligne combat-renc">
          <span style={{ flex: 1 }} title={x.desc}>{x.nom}</span>
          <button className="btn btn-petit" onClick={() => void fourni(x)}>Installer</button>
        </div>
      ))}
      <button className="btn btn-petit" onClick={() => void depuisFichier()}>Importer un pack (.json)…</button>
      <p className="discret">Un pack apporte des créatures, des sorts et des états propres à un univers.</p>
    </details>
  );
}
