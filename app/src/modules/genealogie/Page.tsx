// Page Généalogie : familles et dynasties de la campagne, arbres interactifs, membres promus en personnages.
import { useEffect, useMemo, useState } from 'react';
import type { Campagne, Famille } from '../../noyau/contrat';
import { prendreCible } from '../../noyau/bus';
import { lireFichier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { ArbreFamille } from './ArbreFamille';
import { dynastieDepuisCivilisation, familleDepuisPersonnage } from './generateur';
import { ajouterFamille, civilisationDe, familleDuPersonnage, modifierFamille, supprimerFamille } from './logique';
import { Membre } from './Membre';
import './genealogie.css';

/** Adresses des portraits des personnages liés (chargées depuis le stockage). */
function usePortraits(c: Campagne, f: Famille | undefined): Record<string, string | null> {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const ids = useMemo(() => (f?.membres ?? []).map((m) => m.persoId).filter((x): x is string => !!x).join(','), [f]);
  useEffect(() => {
    let fin = false; const creees: string[] = [];
    void (async () => {
      const res: Record<string, string | null> = {};
      for (const id of ids.split(',').filter(Boolean)) {
        const p = c.personnages.find((x) => x.id === id);
        const b = p?.portrait ? await lireFichier(c.campagne.id, p.portrait) : undefined;
        res[id] = b ? URL.createObjectURL(b) : null;
        if (res[id]) creees.push(res[id]!);
      }
      if (!fin) setUrls(res);
    })();
    return () => { fin = true; creees.forEach((u) => URL.revokeObjectURL(u)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, c.campagne.id]);
  return urls;
}

export function Page() {
  const { vue, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const familles = c.familles ?? [];
  // Arrivée depuis une fiche personnage ou une fiche pays : cible = id de famille, de personnage ou « peuple:<clé> ».
  const [cible] = useState(() => prendreCible('genealogie'));
  const [courante, setCourante] = useState<string | null>(() =>
    (cible && (familles.find((f) => f.id === cible)?.id ?? familleDuPersonnage(c, cible)?.id)) || familles[0]?.id || null);
  const [choisi, setChoisi] = useState<string | null>(null);
  const f = familles.find((x) => x.id === courante);
  const portraits = usePortraits(c, f);
  const defaut = c.univers.find((u) => u.id === c.campagne.univers?.id) ?? c.univers.find((u) => u.civilisations);
  const peuples = defaut?.civilisations?.peuples ?? [];
  const m = f?.membres.find((x) => x.id === choisi);

  const creer = (nouvelle: Famille) => { modifier((x) => ajouterFamille(x, { ...nouvelle, univers: defaut ? { type: 'univers', id: defaut.id } : null })); setCourante(nouvelle.id); setChoisi(nouvelle.racine ?? null); };
  const depuisPerso = (id: string) => {
    const p = c.personnages.find((x) => x.id === id)!;
    const existe = familleDuPersonnage(c, id);
    if (existe) { setCourante(existe.id); return; }
    const k = p.peuple && 'atlas' in p.peuple ? p.peuple.atlas : null;
    creer(familleDepuisPersonnage(p, civilisationDe(c, k)));
  };
  const dynastie = (cle: string) => {
    const civ = peuples.find((p) => String(p.cle) === cle)!;
    const existe = familles.find((x) => x.sorte === 'dynastie' && String(x.peuple) === cle);
    if (existe) { setCourante(existe.id); return; }
    let d = dynastieDepuisCivilisation(civ);
    // Le souverain actuel est relié à sa fiche s'il existe un personnage du même nom.
    d = { ...d, membres: d.membres.map((x) => { const p = x.role === 'souverain actuel' ? c.personnages.find((y) => y.nom === x.nom) : undefined; return p ? { ...x, persoId: p.id } : x; }) };
    creer(d);
  };

  // Personnage ou peuple sans arbre : on le génère à l'arrivée.
  useEffect(() => {
    if (!cible || lectureSeule || familles.some((f) => f.id === cible) || familleDuPersonnage(c, cible)) return;
    if (cible.startsWith('peuple:')) { if (peuples.some((p) => String(p.cle) === cible.slice(7))) dynastie(cible.slice(7)); }
    else if (c.personnages.some((p) => p.id === cible)) depuisPerso(cible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="gen-page">
      <aside className="gen-cote">
        <h1 style={{ margin: 0 }}>Généalogie</h1>
        {(['dynastie', 'famille'] as const).map((s) => {
          const l = familles.filter((x) => x.sorte === s);
          return l.length ? (
            <div key={s}>
              <h3>{s === 'dynastie' ? 'Dynasties' : 'Familles'}</h3>
              {l.map((x) => (
                <button key={x.id} className="gen-famille" aria-current={x.id === courante ? 'true' : undefined} onClick={() => { setCourante(x.id); setChoisi(null); }}>
                  <span>{x.nom}</span><span className="discret">{x.membres.length}</span>
                </button>
              ))}
            </div>
          ) : null;
        })}
        {!familles.length && <p className="discret">Aucun arbre. Génère la famille d’un personnage ou la dynastie d’un peuple.</p>}
        {!lectureSeule && (
          <div className="gen-creer">
            <h3>Nouvel arbre</h3>
            <select value="" onChange={(e) => e.target.value && depuisPerso(e.target.value)}>
              <option value="">Famille d’un personnage…</option>
              {c.personnages.map((p) => <option key={p.id} value={p.id}>{p.nom}{familleDuPersonnage(c, p.id) ? ' (a un arbre)' : ''}</option>)}
            </select>
            {peuples.length > 0 && (
              <select value="" onChange={(e) => e.target.value && dynastie(e.target.value)}>
                <option value="">Dynastie d’un peuple…</option>
                {peuples.map((p) => <option key={String(p.cle)} value={String(p.cle)}>{p.nom.replace(/^les /, '')}{p.souverain ? ` (${p.souverain})` : ''}</option>)}
              </select>
            )}
            <button className="btn btn-petit" onClick={() => creer({ id: `famille-${Date.now().toString(36)}`, nom: 'Nouvelle famille', sorte: 'famille', membres: [{ id: 'mbr-1', nom: 'Premier membre', sexe: '?', parents: [], conjoints: [] }], racine: 'mbr-1' })}>Arbre vide</button>
          </div>
        )}
        {f && !lectureSeule && (
          <div className="gen-creer">
            <h3>Cet arbre</h3>
            <input value={f.nom} onChange={(e) => modifier((x) => modifierFamille(x, f.id, (y) => ({ ...y, nom: e.target.value })))} />
            <button className="btn btn-petit btn-danger" onClick={() => { if (window.confirm(`Supprimer l’arbre « ${f.nom} » ? (les fiches de personnages restent)`)) { modifier((x) => supprimerFamille(x, f.id)); setCourante(null); } }}>Supprimer l’arbre</button>
          </div>
        )}
      </aside>
      <section className="gen-centre">
        {f ? <ArbreFamille famille={f} choisi={choisi} onChoisir={setChoisi} portraits={portraits} /> : <div className="vide">Choisis ou crée un arbre.</div>}
        {f && m && <Membre c={c} f={f} m={m} ro={lectureSeule} modifier={modifier} choisir={setChoisi} />}
        {f && <p className="gen-aide discret">Clic : choisir un membre (sa lignée s’éclaire) · molette : zoom · glisser : déplacer · ♛ règne · ● fiche de personnage</p>}
      </section>
    </div>
  );
}
