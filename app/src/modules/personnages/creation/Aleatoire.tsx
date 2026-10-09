// Génération aléatoire : un ou plusieurs PJ / PNJ complets (fiche, équipement, avatar 3D, portrait).
import { useState } from 'react';
import type { SortePersonnage } from '../../../noyau/contrat';
import type { SystemeAvecFiche } from '../../../noyau/regles';
import { Champ } from '../../../interface/composants';
import { SORTES } from '../logique';
import type { DemandeAleatoire } from './logique';

export function Aleatoire({ R, sorte: sorteInitiale, onGenerer }: { R: SystemeAvecFiche; sorte: SortePersonnage; onGenerer(d: DemandeAleatoire): void }) {
  const [d, setD] = useState<DemandeAleatoire>({ sorte: sorteInitiale, nombre: 1, avecApparence: true, methode: 'tirage' });
  const maj = (patch: Partial<DemandeAleatoire>) => setD((x) => ({ ...x, ...patch }));
  const pnj = d.sorte !== 'pj';
  return (
    <div className="pile">
      <div className="perso-champs">
        <Champ libelle="Sorte">
          <select value={d.sorte} onChange={(e) => maj({ sorte: e.target.value as SortePersonnage })}>
            {SORTES.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        </Champ>
        <Champ libelle="Nombre">
          <input type="number" min={1} max={20} value={d.nombre} onChange={(e) => maj({ nombre: Number(e.target.value) })} />
        </Champ>
        {pnj && (
          <Champ libelle="Rôle (facultatif)">
            <input value={d.role ?? ''} placeholder="garde de la cité, aubergiste, cultiste…" onChange={(e) => maj({ role: e.target.value || undefined })} />
          </Champ>
        )}
        <Champ libelle="Niveau">
          <select value={d.niveau ?? ''} onChange={(e) => maj({ niveau: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">{pnj ? 'au hasard (1 à 6)' : '1'}</option>
            {Array.from({ length: 20 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </Champ>
        <Champ libelle="Classe">
          <select value={d.classe ?? ''} onChange={(e) => maj({ classe: e.target.value || undefined })}>
            <option value="">{pnj ? 'selon le rôle' : 'au hasard'}</option>
            {R.catalogue.classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </Champ>
        <Champ libelle="Peuple">
          <select value={d.espece ?? ''} onChange={(e) => maj({ espece: e.target.value || undefined })}>
            <option value="">au hasard</option>
            {R.catalogue.peuples.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </Champ>
        <Champ libelle="Genre">
          <select value={d.feminin === undefined ? '' : d.feminin ? 'f' : 'm'} onChange={(e) => maj({ feminin: e.target.value === '' ? undefined : e.target.value === 'f' })}>
            <option value="">au hasard</option><option value="f">féminin</option><option value="m">masculin</option>
          </select>
        </Champ>
        <Champ libelle="Caractéristiques">
          <select value={d.methode} onChange={(e) => maj({ methode: e.target.value as 'tirage' | 'standard' })}>
            <option value="tirage">tirage 4d6</option><option value="standard">tableau standard</option>
          </select>
        </Champ>
      </div>
      <label className="ligne discret">
        <input type="checkbox" checked={d.avecApparence} onChange={(e) => maj({ avecApparence: e.target.checked })} />
        Avatar 3D et portrait (jeton de combat) — tenue selon la classe, arme et armure de l’inventaire
      </label>
      <button className="btn btn-principal" style={{ alignSelf: 'flex-start' }} onClick={() => onGenerer(d)}>
        Générer {d.nombre > 1 ? `${d.nombre} personnages` : 'le personnage'}
      </button>
    </div>
  );
}
