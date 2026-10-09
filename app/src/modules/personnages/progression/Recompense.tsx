// Récompenser le groupe : XP libre ou calculée d'après les adversaires vaincus, partagée entre les PJ choisis.
import { useMemo, useState } from 'react';
import type { Campagne } from '../../../noyau/contrat';
import type { SystemeAvecFiche } from '../../../noyau/regles';
import { emettre } from '../../../noyau/bus';
import { Champ } from '../../../interface/composants';
import { donnerXp, etatProgression, xpRencontre } from './logique';

export function Recompense({ c, R, modifier, onFermer }: { c: Campagne; R: SystemeAvecFiche; modifier(f: (x: Campagne) => Campagne): void; onFermer(): void }) {
  const pjs = c.personnages.filter((p) => p.sorte === 'pj' || p.sorte === 'allie');
  const adversaires = c.personnages.filter((p) => p.sorte === 'ennemi' || p.sorte === 'pnj');
  const [choisis, setChoisis] = useState<string[]>(pjs.filter((p) => p.sorte === 'pj').map((p) => p.id));
  const [vaincus, setVaincus] = useState<string[]>([]);
  const [libre, setLibre] = useState(0);
  const [raison, setRaison] = useState('');
  const [partage, setPartage] = useState(true);
  const xpAdv = useMemo(() => xpRencontre(c.personnages.filter((p) => vaincus.includes(p.id)), R), [vaincus, c, R]);
  const total = xpAdv + libre;
  const basculer = (l: string[], id: string) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]);

  const valider = () => {
    const quand = new Date().toLocaleDateString('fr-FR');
    const texte = raison || (vaincus.length ? `Adversaires vaincus : ${c.personnages.filter((p) => vaincus.includes(p.id)).map((p) => p.nom).join(', ')}` : 'Récompense');
    modifier((x) => donnerXp(x, choisis, total, texte, quand, partage));
    const gain = partage ? Math.floor(total / choisis.length) : total;
    const prets = c.personnages.filter((p) => choisis.includes(p.id)).filter((p) => {
      const e = etatProgression(p, R);
      return e.suivant !== null && e.xp + gain >= e.suivant;
    });
    emettre('message', { texte: `+${gain} XP ${partage && choisis.length > 1 ? 'chacun' : ''}.${prets.length ? ` Peut monter de niveau : ${prets.map((p) => p.nom).join(', ')}.` : ''}`, sorte: 'succes' });
    onFermer();
  };

  return (
    <div className="carte-ui pile">
      <div className="ligne" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Récompenser le groupe</h2>
        <button className="btn btn-petit" onClick={onFermer}>Fermer</button>
      </div>
      <div className="perso-colonnes">
        <section>
          <h3>Bénéficiaires</h3>
          {pjs.length === 0 && <p className="discret">Aucun PJ ni allié.</p>}
          {pjs.map((p) => {
            const e = etatProgression(p, R);
            return (
              <label key={p.id} className="ligne">
                <input type="checkbox" checked={choisis.includes(p.id)} onChange={() => setChoisis((l) => basculer(l, p.id))} />
                {p.nom} <span className="discret">niv. {e.niveau}, {e.xp}{e.suivant ? ` / ${e.suivant}` : ''} XP</span>
              </label>
            );
          })}
        </section>
        <section>
          <h3>Adversaires vaincus</h3>
          {adversaires.length === 0 && <p className="discret">Aucun ennemi ni PNJ dans la campagne.</p>}
          <div className="perso-liste-defilante">
            {adversaires.map((p) => (
              <label key={p.id} className="ligne">
                <input type="checkbox" checked={vaincus.includes(p.id)} onChange={() => setVaincus((l) => basculer(l, p.id))} />
                {p.nom} <span className="discret">{xpRencontre([p], R)} XP</span>
              </label>
            ))}
          </div>
        </section>
      </div>
      <div className="perso-champs">
        <Champ libelle="XP en plus (quête, jalon…)"><input type="number" min={0} value={libre} onChange={(e) => setLibre(Number(e.target.value))} /></Champ>
        <Champ libelle="Raison"><input value={raison} placeholder="Libération du gué, fin du chapitre 2…" onChange={(e) => setRaison(e.target.value)} /></Champ>
      </div>
      <label className="ligne discret"><input type="checkbox" checked={partage} onChange={(e) => setPartage(e.target.checked)} /> Partager le total entre les bénéficiaires (sinon chacun reçoit le total)</label>
      <div className="ligne">
        <strong>Total : {total} XP{partage && choisis.length > 1 ? ` (${Math.floor(total / choisis.length)} chacun)` : ''}</strong>
        <button className="btn btn-principal" disabled={!choisis.length || total <= 0} onClick={valider}>Donner l’expérience</button>
      </div>
    </div>
  );
}
