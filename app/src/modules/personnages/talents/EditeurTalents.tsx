// Éditeur des arbres de talents (MJ) : arbres des règles en lecture, copies et arbres personnels rangés
// dans la campagne (modules.personnages.arbres), import / export JSON.
import { useState } from 'react';
import type { Campagne } from '../../../noyau/contrat';
import { nouvelId } from '../../../noyau/contrat';
import type { SystemeAvecFiche } from '../../../noyau/regles';
import { arbresDesRegles, enregistrerArbresDeCampagne, tousLesArbres, type ArbreTalents, type NoeudTalent } from '../../../noyau/talents';
import { choisirFichier, telecharger } from '../../../noyau/stockage';
import { emettre } from '../../../noyau/bus';
import { Champ } from '../../../interface/composants';
import { EditeurNoeud } from './EditeurNoeud';
import { VueArbreTalents } from './VueArbreTalents';

export const arbresDeCampagne = (c: Campagne): ArbreTalents[] =>
  ((c.modules?.personnages as { arbres?: ArbreTalents[] } | undefined)?.arbres) ?? [];

export function EditeurTalents({ c, R, modifier, onFermer }: { c: Campagne; R: SystemeAvecFiche; modifier(f: (x: Campagne) => Campagne): void; onFermer(): void }) {
  const perso = arbresDeCampagne(c);
  const [id, setId] = useState<string>(perso[0]?.id ?? tousLesArbres()[0]?.id ?? '');
  const [noeud, setNoeud] = useState<string | null>(null);
  const tous = tousLesArbres();
  const arbre = tous.find((a) => a.id === id);
  const modifiable = perso.some((a) => a.id === id);
  const enregistrer = (liste: ArbreTalents[]) => {
    modifier((x) => ({ ...x, modules: { ...(x.modules ?? {}), personnages: { ...(x.modules?.personnages ?? {}), arbres: liste } } }));
    enregistrerArbresDeCampagne(liste);
  };
  const majArbre = (f: (a: ArbreTalents) => ArbreTalents) => enregistrer(perso.map((a) => (a.id === id ? f(a) : a)));
  const copier = (a: ArbreTalents) => { enregistrer([...perso.filter((x) => x.id !== a.id), { ...structuredClone(a), personnalise: true }]); setId(a.id); };
  const nouveau = () => {
    const a: ArbreTalents = { id: nouvelId('arbre'), nom: 'Nouvel arbre', pour: { tous: true }, personnalise: true, branches: [{ id: nouvelId('branche'), nom: 'Branche', noeuds: [] }] };
    enregistrer([...perso, a]); setId(a.id);
  };
  const importer = async () => {
    const f = await choisirFichier('.json,application/json');
    if (!f) return;
    try {
      const lu = JSON.parse(await f[0].text()) as ArbreTalents | ArbreTalents[];
      const liste = (Array.isArray(lu) ? lu : [lu]).filter((a) => a?.id && Array.isArray(a.branches)).map((a) => ({ ...a, personnalise: true }));
      enregistrer([...perso.filter((x) => !liste.some((y) => y.id === x.id)), ...liste]);
      emettre('message', { texte: `${liste.length} arbre(s) importé(s).`, sorte: 'succes' });
    } catch { emettre('message', { texte: 'Fichier d’arbres illisible.', sorte: 'erreur' }); }
  };
  const tousNoeuds = arbre ? arbre.branches.flatMap((b) => b.noeuds) : [];

  return (
    <div className="carte-ui pile">
      <div className="ligne" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Arbres de talents</h2>
        <div className="ligne">
          <button className="btn btn-petit" onClick={nouveau}>+ Nouvel arbre</button>
          <button className="btn btn-petit" onClick={() => void importer()}>Importer…</button>
          {perso.length > 0 && <button className="btn btn-petit" onClick={() => telecharger(new Blob([JSON.stringify(perso, null, 1)], { type: 'application/json' }), 'arbres-de-talents.json', 'application/json')}>Exporter mes arbres</button>}
          <button className="btn btn-petit" onClick={onFermer}>Fermer</button>
        </div>
      </div>
      <div className="perso-editeur">
        <aside className="pile" style={{ gap: 4 }}>
          {tous.map((a) => (
            <button key={a.id} className="perso-ligne" aria-current={a.id === id ? 'true' : undefined} onClick={() => { setId(a.id); setNoeud(null); }}>
              <span>{a.nom}</span>{a.personnalise && <span className="perso-cache">{arbresDesRegles().some((x) => x.id === a.id) ? 'modifié' : 'maison'}</span>}
            </button>
          ))}
        </aside>
        {arbre && (
          <section className="pile">
            {!modifiable ? (
              <div className="ligne">
                <span className="discret">Arbre fourni par les règles ({R.nom}) : copiez-le dans la campagne pour le modifier.</span>
                <button className="btn btn-petit btn-principal" onClick={() => copier(arbre)}>Copier pour modifier</button>
              </div>
            ) : (
              <div className="ligne">
                <input value={arbre.nom} style={{ fontWeight: 600 }} onChange={(e) => majArbre((a) => ({ ...a, nom: e.target.value }))} />
                <label className="ligne discret"><input type="checkbox" checked={!!arbre.pour.tous} onChange={(e) => majArbre((a) => ({ ...a, pour: { ...a.pour, tous: e.target.checked } }))} /> pour tous</label>
                {!arbre.pour.tous && (
                  <select multiple size={3} value={arbre.pour.classes ?? []} onChange={(e) => majArbre((a) => ({ ...a, pour: { ...a.pour, classes: [...e.target.selectedOptions].map((o) => o.value) } }))}>
                    {R.catalogue.classes.map((cl) => <option key={cl.id} value={cl.id}>{cl.nom}</option>)}
                  </select>
                )}
                <span style={{ flex: 1 }} />
                <button className="btn btn-petit btn-danger" onClick={() => window.confirm(arbresDesRegles().some((x) => x.id === id) ? 'Revenir à l’arbre des règles ?' : 'Supprimer cet arbre ?') && enregistrer(perso.filter((a) => a.id !== id))}>
                  {arbresDesRegles().some((x) => x.id === id) ? 'Revenir à l’original' : 'Supprimer l’arbre'}
                </button>
              </div>
            )}
            {modifiable && <Champ libelle="Description"><input value={arbre.texte ?? ''} onChange={(e) => majArbre((a) => ({ ...a, texte: e.target.value }))} /></Champ>}
            <VueArbreTalents arbre={arbre} choisi={noeud} onChoisir={(n) => setNoeud(n?.id ?? null)} hauteur={480} />
            <div className="perso-arbre" style={{ gridTemplateColumns: `repeat(${arbre.branches.length}, minmax(140px, 1fr))` }}>
              {arbre.branches.map((b) => (
                <div key={b.id} className="pile" style={{ gap: 6 }}>
                  {modifiable ? (
                    <div className="ligne">
                      <input value={b.nom} style={{ flex: 1 }} onChange={(e) => majArbre((a) => ({ ...a, branches: a.branches.map((x) => (x.id === b.id ? { ...x, nom: e.target.value } : x)) }))} />
                      <input type="color" value={b.couleur ?? '#8a6a4a'} onChange={(e) => majArbre((a) => ({ ...a, branches: a.branches.map((x) => (x.id === b.id ? { ...x, couleur: e.target.value } : x)) }))} />
                      <button className="btn btn-petit" title="Supprimer la branche" onClick={() => window.confirm(`Supprimer la branche « ${b.nom} » ?`) && majArbre((a) => ({ ...a, branches: a.branches.filter((x) => x.id !== b.id) }))}>✕</button>
                    </div>
                  ) : <div className="perso-branche-titre" style={{ borderColor: b.couleur }}>{b.nom}</div>}
                  <small className="discret">{b.noeuds.length} talent{b.noeuds.length > 1 ? 's' : ''}</small>
                  {modifiable && (
                    <button className="btn btn-petit" onClick={() => {
                      // Accroché au talent choisi s'il est dans cette branche, sinon au plus profond de la branche, sinon au tronc.
                      const sel = b.noeuds.find((x) => x.id === noeud);
                      const prec = sel ?? [...b.noeuds].sort((x, y) => y.rang - x.rang)[0] ?? tousNoeuds.find((x) => !x.requis.length && !x.requisUn?.length);
                      const rang = (prec?.rang ?? 0) + 1;
                      const n: NoeudTalent = { id: nouvelId('talent'), nom: 'Nouveau talent', texte: '', icone: '✦', rang, niveau: [1, 1, 3, 5, 7, 9, 11, 13][rang - 1] ?? 15, cout: 1, requis: prec ? [prec.id] : [] };
                      majArbre((a) => ({ ...a, branches: a.branches.map((x) => (x.id === b.id ? { ...x, noeuds: [...x.noeuds, n] } : x)) }));
                      setNoeud(n.id);
                    }}>+ Talent</button>
                  )}
                </div>
              ))}
            </div>
            {modifiable && <button className="btn btn-petit" style={{ alignSelf: 'flex-start' }} onClick={() => majArbre((a) => ({ ...a, branches: [...a.branches, { id: nouvelId('branche'), nom: 'Nouvelle branche', noeuds: [] }] }))}>+ Branche</button>}
            {noeud && (() => {
              const n = tousNoeuds.find((x) => x.id === noeud);
              if (!n) return null;
              if (!modifiable) return <div className="carte-ui"><strong>{n.nom}</strong><p>{n.texte}</p><p className="discret">Prérequis : {n.requis.map((r) => tousNoeuds.find((x) => x.id === r)?.nom ?? r).join(', ') || 'aucun'}{n.requisUn?.length ? ` · au moins un de : ${n.requisUn.map((r) => tousNoeuds.find((x) => x.id === r)?.nom ?? r).join(', ')}` : ''}</p></div>;
              return (
                <EditeurNoeud n={n} autres={tousNoeuds.filter((x) => x.id !== n.id)} competences={R.catalogue.competences}
                  onChange={(nv) => majArbre((a) => ({ ...a, branches: a.branches.map((b) => ({ ...b, noeuds: b.noeuds.map((x) => (x.id === nv.id ? nv : x)) })) }))}
                  onSupprimer={() => { majArbre((a) => ({ ...a, branches: a.branches.map((b) => ({ ...b, noeuds: b.noeuds.filter((x) => x.id !== n.id).map((x) => ({ ...x, requis: x.requis.filter((r) => r !== n.id) })) })) })); setNoeud(null); }} />
              );
            })()}
          </section>
        )}
      </div>
      <p className="discret">Un talent supprimé disparaît des fiches qui l’avaient acquis ; ses points redeviennent disponibles.</p>
    </div>
  );
}
