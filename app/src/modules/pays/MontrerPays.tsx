// Fiche pays pour l'écran joueurs : le MJ coche ce qu'il montre (jamais les notes MJ ni la réputation chiffrée
// s'il ne la coche pas), puis l'affiche. Le dernier choix est retenu sur cet ordinateur.
import { useState } from 'react';
import type { Civilisation } from '../../noyau/contrat';
import { emettre, montrerAuxJoueurs } from '../../noyau/bus';

type Rubrique = { id: string; titre: string; texte: (v: Civilisation) => string };

/** Rubriques possibles, dans l'ordre de la fiche ; une rubrique vide n'est pas proposée. */
export const RUBRIQUES: Rubrique[] = [
  { id: 'gouvernement', titre: 'Gouvernement', texte: (v) => [v.regimeTexte ?? v.regime].filter(Boolean).join('') },
  { id: 'souverain', titre: 'Souverain', texte: (v) => [v.souverain, v.fondateur ? `dans la lignée de ${v.fondateur}, fondateur` : ''].filter(Boolean).join(', ') },
  { id: 'capitale', titre: 'Capitale', texte: (v) => v.capitale ?? '' },
  { id: 'population', titre: 'Population', texte: (v) => v.population ?? '' },
  { id: 'villes', titre: 'Villes', texte: (v) => v.villes.map((x) => `${x.nom}${x.capitale ? ' (capitale)' : ''}`).join(', ') },
  { id: 'peuple', titre: 'Le peuple', texte: (v) => [...v.traits, v.langue ? `Langue : ${v.langue}.` : ''].filter(Boolean).join('\n') },
  { id: 'croyance', titre: 'Croyances', texte: (v) => v.croyance ?? '' },
  { id: 'coutumes', titre: 'Coutumes', texte: (v) => v.coutumes.join('\n') },
  { id: 'ere', titre: 'Époque', texte: (v) => [v.ere, v.ereTexte].filter(Boolean).join(' : ') },
  { id: 'relations', titre: 'Relations', texte: (v) => v.relations.map((r) => `${r.nom.replace(/^les /, '')} : ${r.sorte}`).join('\n') },
  { id: 'histoire', titre: 'Histoire', texte: (v) => [...v.histoire].sort((a, b) => a.an - b.an).map((h) => `An ${h.an} : ${h.texte}`).join('\n') },
  { id: 'calendrier', titre: 'Calendrier', texte: (v) => (v.calendrier?.mois.length ? `${v.calendrier.mois.map((m) => `${m.nom} (${m.jours} j)`).join(', ')}${v.calendrier.fetes.length ? `\nFêtes : ${v.calendrier.fetes.map((f) => `${f.nom} (${f.jour} ${v.calendrier!.mois[f.mois]?.nom ?? ''})`).join(', ')}` : ''}` : '') },
  { id: 'reputation', titre: 'Votre réputation', texte: (v) => (v.reputation !== undefined ? `${v.reputation > 0 ? '+' : ''}${v.reputation} sur 100` : '') },
];
const PAR_DEFAUT = ['gouvernement', 'souverain', 'capitale', 'villes', 'peuple', 'croyance'];
const CLE = 'jdr-pays-montrer';
const lire = (): string[] => { try { return JSON.parse(localStorage.getItem(CLE) ?? 'null') ?? PAR_DEFAUT; } catch { return PAR_DEFAUT; } };

/** Sections retenues (rubriques cochées et non vides). Pur. */
export const sectionsPays = (v: Civilisation, choix: string[]) =>
  RUBRIQUES.filter((r) => choix.includes(r.id)).map((r) => ({ titre: r.titre, texte: r.texte(v) })).filter((x) => x.texte.trim());

/** Montre la fiche d'un peuple (rubriques choisies la dernière fois). */
export function montrerPeuple(civ: Civilisation, choix: string[] = lire()): void {
  montrerAuxJoueurs({ sorte: 'fiche', titre: civ.nom.replace(/^les /, 'Les '), sousTitre: civ.capitale ? `capitale ${civ.capitale}` : undefined, sections: sectionsPays(civ, choix) });
}

export function MontrerPays({ civ, onFermer }: { civ: Civilisation; onFermer(): void }) {
  const [choix, setChoix] = useState<string[]>(lire);
  const dispo = RUBRIQUES.filter((r) => r.texte(civ).trim());
  const basculer = (id: string, oui: boolean) => {
    const n = oui ? [...choix, id] : choix.filter((x) => x !== id);
    setChoix(n);
    try { localStorage.setItem(CLE, JSON.stringify(n)); } catch { /* navigation privée */ }
  };
  const montrer = () => {
    montrerPeuple(civ, choix);
    emettre('message', { texte: `La fiche ${civ.nom.replace(/^les /, 'des ')} est sur l’écran joueurs.`, sorte: 'succes' });
    onFermer();
  };
  return (
    <div className="carte-ui pile pays-montrer">
      <strong>Montrer aux joueurs</strong>
      <span className="discret">Coche ce que les joueurs savent de ce peuple. Les notes MJ ne sont jamais montrées.</span>
      <div className="pays-montrer-liste">
        {dispo.map((r) => (
          <label key={r.id} className="ligne" title={r.texte(civ)}>
            <input type="checkbox" checked={choix.includes(r.id)} onChange={(e) => basculer(r.id, e.target.checked)} /> {r.titre}
          </label>
        ))}
      </div>
      <div className="ligne">
        <button className="btn btn-mj" disabled={!sectionsPays(civ, choix).length} onClick={montrer}>Montrer</button>
        <button className="btn" onClick={onFermer}>Annuler</button>
      </div>
    </div>
  );
}
