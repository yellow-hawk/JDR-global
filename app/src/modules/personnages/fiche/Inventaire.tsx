// Onglet Inventaire : objets (catalogue du système ou objets libres), équipement, harmonisation, effets, monnaie.
import { useState } from 'react';
import type { Effet, ObjetInventaire } from '../../../noyau/contrat';
import { nouvelId } from '../../../noyau/contrat';
import { aUneFiche, type FicheCalculee } from '../../../noyau/regles';
import { majFiche, type PropsOnglet } from './types';

const SORTES: [string, string][] = [['arme', 'Armes'], ['armure', 'Armures et boucliers'], ['objet', 'Équipement']];
/** Effets proposés pour un objet libre (anneau, amulette…). */
const CIBLES: [string, string][] = [
  ['ca', 'CA'], ['attaque', 'Attaque'], ['degats', 'Dégâts'], ['initiative', 'Initiative'], ['vitesse', 'Vitesse'],
  ['sauvegarde.for', 'Sauv. FOR'], ['sauvegarde.dex', 'Sauv. DEX'], ['sauvegarde.con', 'Sauv. CON'],
  ['sauvegarde.int', 'Sauv. INT'], ['sauvegarde.sag', 'Sauv. SAG'], ['sauvegarde.cha', 'Sauv. CHA'],
  ['carac.for', 'FOR'], ['carac.dex', 'DEX'], ['carac.con', 'CON'], ['carac.int', 'INT'], ['carac.sag', 'SAG'], ['carac.cha', 'CHA'],
];
const texteEffets = (e: Effet[] = []) => e.map((x) => `${x.valeur >= 0 ? '+' : ''}${x.valeur} ${CIBLES.find((c) => c[0] === x.cible)?.[1] ?? x.cible}`).join(', ');

export function Inventaire({ p, R, lectureSeule, maj, calcul }: PropsOnglet & { calcul: FicheCalculee | null }) {
  const inv = p.fiche?.inventaire ?? { objets: [] };
  const cat = aUneFiche(R) ? R.catalogue : null;
  const [choix, setChoix] = useState('');
  const [ouvert, setOuvert] = useState<string | null>(null);
  const majObjets = (f: (l: ObjetInventaire[]) => ObjetInventaire[]) =>
    majFiche(maj, 'inventaire', (x) => ({ ...(x ?? { objets: [] }), objets: f(x?.objets ?? []) }));
  const majObjet = (id: string, patch: Partial<ObjetInventaire>) => majObjets((l) => l.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const ajouter = () => {
    const e = cat?.objets.find((o) => o.id === choix);
    const o: ObjetInventaire = e
      ? { id: nouvelId('obj'), nom: e.nom, ref: e.id, quantite: 1, poids: e.poids, description: (e.texte as string | undefined) ?? undefined }
      : { id: nouvelId('obj'), nom: 'Nouvel objet', quantite: 1 };
    majObjets((l) => [...l, o]);
    if (!e) setOuvert(o.id);
    setChoix('');
  };
  const charge = calcul?.derives.find((d) => d.cle === 'encombrement');

  return (
    <div className="pile">
      {!lectureSeule && (
        <div className="ligne">
          <select value={choix} onChange={(e) => setChoix(e.target.value)} style={{ minWidth: 240 }}>
            <option value="">Objet libre (à décrire)…</option>
            {cat && SORTES.map(([s, libelle]) => (
              <optgroup key={s} label={libelle}>
                {cat.objets.filter((o) => o.sorte === s).map((o) => <option key={o.id} value={o.id}>{o.nom}{o.prix ? ` — ${o.prix}` : ''}</option>)}
              </optgroup>
            ))}
          </select>
          <button className="btn btn-petit" onClick={ajouter}>Ajouter</button>
          {charge && <span className="discret" style={{ marginLeft: 'auto' }}>Charge : {charge.texte} kg{charge.detail ? ` — ${charge.detail}` : ''}</span>}
        </div>
      )}
      {inv.objets.length === 0 && <p className="discret">Inventaire vide.</p>}
      {inv.objets.length > 0 && (
        <table className="perso-table">
          <thead><tr><th>Équipé</th><th>Objet</th><th>Qté</th><th>Poids</th><th>Effets</th><th /></tr></thead>
          <tbody>
            {inv.objets.map((o) => {
              const e = cat?.objets.find((x) => x.id === o.ref);
              const equipable = !!e && e.sorte !== 'objet' || !!o.effets?.length;
              return [
                <tr key={o.id}>
                  <td>{equipable && <input type="checkbox" checked={!!o.equipe} disabled={lectureSeule} onChange={(ev) => majObjet(o.id, { equipe: ev.target.checked })} />}</td>
                  <td><button className="perso-lien" onClick={() => setOuvert(ouvert === o.id ? null : o.id)}>{o.nom}</button>{e && e.sorte !== 'objet' && <small className="discret"> {(e.degats as string) ?? (e.ca ? `CA ${e.categorie === 'bouclier' ? '+' : ''}${e.ca}` : '')}</small>}</td>
                  <td><input type="number" min={0} value={o.quantite} disabled={lectureSeule} style={{ width: 56 }} onChange={(ev) => majObjet(o.id, { quantite: Number(ev.target.value) })} /></td>
                  <td>{((o.poids ?? e?.poids ?? 0) * o.quantite).toFixed(1)} kg</td>
                  <td className="discret">{texteEffets(o.effets)}</td>
                  <td>{!lectureSeule && <button className="btn btn-petit" title="Retirer" onClick={() => majObjets((l) => l.filter((x) => x.id !== o.id))}>✕</button>}</td>
                </tr>,
                ouvert === o.id && (
                  <tr key={`${o.id}-d`}><td colSpan={6}>
                    <fieldset disabled={lectureSeule} className="perso-groupe pile" style={{ gap: 8 }}>
                      <div className="ligne">
                        <input value={o.nom} onChange={(ev) => majObjet(o.id, { nom: ev.target.value })} />
                        <label className="ligne discret"><input type="checkbox" checked={!!o.harmonise} onChange={(ev) => majObjet(o.id, { harmonise: ev.target.checked })} /> harmonisé</label>
                        <label className="ligne discret">poids <input type="number" min={0} step={0.1} style={{ width: 70 }} value={o.poids ?? e?.poids ?? 0} onChange={(ev) => majObjet(o.id, { poids: Number(ev.target.value) })} /> kg</label>
                      </div>
                      <textarea rows={2} placeholder="Description, pouvoirs…" value={o.description ?? ''} onChange={(ev) => majObjet(o.id, { description: ev.target.value })} />
                      <div className="ligne">
                        {(o.effets ?? []).map((x, i) => (
                          <span key={i} className="ligne">
                            <select value={x.cible} onChange={(ev) => majObjet(o.id, { effets: o.effets!.map((y, j) => (j === i ? { ...y, cible: ev.target.value } : y)) })}>
                              {CIBLES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
                            </select>
                            <input type="number" style={{ width: 56 }} value={x.valeur} onChange={(ev) => majObjet(o.id, { effets: o.effets!.map((y, j) => (j === i ? { ...y, valeur: Number(ev.target.value) } : y)) })} />
                            <button className="btn btn-petit" onClick={() => majObjet(o.id, { effets: o.effets!.filter((_, j) => j !== i) })}>✕</button>
                          </span>
                        ))}
                        <button className="btn btn-petit" onClick={() => majObjet(o.id, { effets: [...(o.effets ?? []), { cible: 'ca', valeur: 1 }] })}>+ Effet</button>
                        <span className="discret">Les effets comptent quand l’objet est équipé.</span>
                      </div>
                    </fieldset>
                  </td></tr>
                ),
              ];
            })}
          </tbody>
        </table>
      )}
      {cat && (
        <fieldset disabled={lectureSeule} className="perso-groupe">
          <legend>Bourse</legend>
          <div className="champs">
            {cat.monnaies.map((m) => (
              <label key={m.id} className="champ"><span>{m.libelle}</span>
                <input type="number" min={0} value={inv.monnaie?.[m.id] ?? 0}
                  onChange={(e) => majFiche(maj, 'inventaire', (x) => ({ ...(x ?? { objets: [] }), monnaie: { ...(x?.monnaie ?? {}), [m.id]: Number(e.target.value) } }))} />
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
