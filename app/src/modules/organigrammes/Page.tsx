// Page Organigrammes : monde et peuples, institutions de chaque peuple, successions dynastiques, quêtes, cartes, personnages.
import { useMemo, useState } from 'react';
import { emettre, prendreCible } from '../../noyau/bus';
import { nouveauPersonnage } from '../../noyau/contrat';
import type { NoeudArbre } from '../../noyau/graphe';
import { regles } from '../../noyau/regles';
import { useCampagne } from '../../interface/etat';
import { VueArbre } from '../../interface/graphe';
import {
  organigrammeCartes, organigrammeDynastie, organigrammeInstitutions, organigrammeMonde, organigrammePersonnages, organigrammeQuetes, type InfoNoeud,
} from './logique';
import './organigrammes.css';

export function Page() {
  const { vue, role, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const [choix, setChoix] = useState<string>(() => prendreCible('organigrammes') ?? 'monde');
  const [horizontal, setHorizontal] = useState(false);
  const [noeud, setNoeud] = useState<NoeudArbre | null>(null);
  const [nomVacant, setNomVacant] = useState('');

  const liste = useMemo(() => {
    const l: { id: string; libelle: string; groupe: string }[] = [
      { id: 'monde', libelle: 'Monde et peuples', groupe: 'Campagne' },
      { id: 'quetes', libelle: 'Quêtes', groupe: 'Campagne' },
      { id: 'personnages', libelle: 'Personnages par peuple', groupe: 'Campagne' },
      { id: 'cartes', libelle: 'Cartes emboîtées', groupe: 'Campagne' },
    ];
    for (const u of c.univers) for (const p of u.civilisations?.peuples ?? []) l.push({ id: `institutions:${u.id}:${String(p.cle)}`, libelle: p.nom.replace(/^les /, ''), groupe: 'Institutions' });
    for (const f of c.familles ?? []) if (f.sorte === 'dynastie') l.push({ id: `dynastie:${f.id}`, libelle: f.nom, groupe: 'Successions' });
    return l;
  }, [c]);

  const racine = useMemo((): NoeudArbre | null => {
    if (choix === 'monde') return organigrammeMonde(c);
    if (choix === 'quetes') return organigrammeQuetes(c);
    if (choix === 'cartes') return organigrammeCartes(c);
    if (choix === 'personnages') return organigrammePersonnages(c);
    if (choix.startsWith('institutions:')) {
      const [, u, k] = choix.split(':');
      const civ = c.univers.find((x) => x.id === u)?.civilisations?.peuples.find((p) => String(p.cle) === k);
      return civ ? organigrammeInstitutions(c, u, civ) : null;
    }
    if (choix.startsWith('dynastie:')) return organigrammeDynastie(c, choix.slice(9));
    return null;
  }, [choix, c]);

  const info = noeud?.donnees as InfoNoeud | undefined;
  const creerVacant = () => {
    if (!info?.vacant) return;
    const R = regles(c.campagne.regles);
    const nom = nomVacant.trim() || info.vacant.nom;
    const p = { ...nouveauPersonnage(nom, 'pnj', R.id, R.statsPourProfil({ role: info.vacant.titre, graine: `${nom}|${info.vacant.titre}` })), role: info.vacant.titre, peuple: { atlas: info.vacant.peuple } };
    modifier((x) => ({ ...x, personnages: [...x.personnages, p] }));
    emettre('message', { texte: `${nom} occupe maintenant le poste « ${info.vacant.titre} ».`, sorte: 'succes' });
    setNoeud(null);
  };
  const groupes = [...new Set(liste.map((x) => x.groupe))];

  return (
    <div className="orga-page">
      <aside className="orga-cote">
        <h1 style={{ margin: 0 }}>Organigrammes</h1>
        {groupes.map((g) => (
          <div key={g}>
            <h3>{g}</h3>
            {liste.filter((x) => x.groupe === g).map((x) => (
              <button key={x.id} className="orga-ligne" aria-current={x.id === choix ? 'true' : undefined} onClick={() => { setChoix(x.id); setNoeud(null); }}>{x.libelle}</button>
            ))}
          </div>
        ))}
        {!liste.some((x) => x.groupe === 'Institutions') && <p className="discret">Les institutions apparaissent quand un monde de l’Atlas est installé (Monde → « Ajouter le ciel affiché »).</p>}
        <label className="orga-coche"><input type="checkbox" checked={horizontal} onChange={(e) => setHorizontal(e.target.checked)} /> De gauche à droite</label>
      </aside>
      <section className="orga-centre">
        {racine ? <VueArbre racine={racine} choisi={noeud?.id ?? null} onChoisir={(x) => { setNoeud(x); setNomVacant((x?.donnees as InfoNoeud | undefined)?.vacant?.nom ?? ''); }} horizontal={horizontal} />
          : <div className="vide">Rien à afficher pour l’instant.</div>}
        {noeud && (
          <aside className="orga-detail carte-ui">
            <h2 style={{ margin: 0 }}>{noeud.libelle}</h2>
            {noeud.sousTitre && <p className="discret" style={{ margin: 0 }}>{noeud.sousTitre}</p>}
            {noeud.enfants.length > 0 && <p className="discret" style={{ margin: 0 }}>{noeud.enfants.length} sous-élément(s)</p>}
            {info?.page && <button className="btn btn-petit btn-principal" onClick={() => emettre('naviguer', { page: info.page!, cible: info.cible })}>Ouvrir</button>}
            {info?.vacant && role === 'mj' && !lectureSeule && (
              <div className="pile" style={{ gap: 6 }}>
                <label className="champ"><span>Nom proposé</span><input value={nomVacant} onChange={(e) => setNomVacant(e.target.value)} /></label>
                <button className="btn btn-petit btn-principal" onClick={creerVacant}>Créer ce personnage</button>
                <p className="discret" style={{ margin: 0 }}>Stats tirées du poste, rattaché à ce peuple.</p>
              </div>
            )}
          </aside>
        )}
      </section>
    </div>
  );
}
