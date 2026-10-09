// Assistant de création pas à pas : origine, caractéristiques, compétences, personnalité, résumé.
import { useMemo, useState } from 'react';
import type { ChoixCreation, SystemeAvecFiche } from '../../../noyau/regles';
import { Champ, Onglets } from '../../../interface/composants';

const CARACS = ['for', 'dex', 'con', 'int', 'sag', 'cha'];
const ETAPES = [['origine', '1. Origine'], ['caracs', '2. Caractéristiques'], ['competences', '3. Compétences'], ['personnalite', '4. Personnalité'], ['resume', '5. Résumé']] as const;
type Etape = (typeof ETAPES)[number][0];
type Methode = 'standard' | 'achat' | 'tirage';
const hasard = () => Math.random().toString(36).slice(2);

export function Assistant({ R, onCreer }: { R: SystemeAvecFiche; onCreer(c: ChoixCreation, avecApparence: boolean): void }) {
  const [etape, setEtape] = useState<Etape>('origine');
  const [c, setC] = useState<ChoixCreation>(() => ({ ...R.creation.aleatoire(hasard(), { methode: 'standard' }), competences: [] }));
  const [methode, setMethode] = useState<Methode>('standard');
  const [valeurs, setValeurs] = useState<number[]>(R.creation.tableauStandard);
  const [avecApparence, setAvecApparence] = useState(true);
  const maj = (patch: Partial<ChoixCreation>) => setC((x) => ({ ...x, ...patch }));
  const cl = R.catalogue.classes.find((x) => x.id === c.classe);
  const pe = R.catalogue.peuples.find((x) => x.id === c.espece);
  const lib = (id: string) => R.catalogue.caracs.find((x) => x.id === id)?.libelle ?? id;
  const libComp = (id: string) => R.catalogue.competences.find((x) => x.id === id)?.libelle ?? id;
  const apercu = useMemo(() => {
    const r = R.creation.creer(c);
    return { ...r, calcul: R.calculer({ id: 'apercu', nom: r.nom, sorte: 'pj', combat: { regles: R.id, stats: r.stats }, fiche: r.fiche }) };
  }, [c, R]);
  const pointsAchat = CARACS.reduce((s, k) => s + (R.creation.achat.cout(c.caracs[k] ?? 8) ?? 99), 0);
  const historique = R.catalogue.historiques.find((h) => h.id === c.historique);
  const dejaAcquises = new Set([...(historique?.competences ?? []), ...(pe?.competences ?? [])]);
  const choisies = (c.competences ?? []).filter((x) => !dejaAcquises.has(x));
  const affecter = (k: string, v: number) => maj({ caracs: { ...c.caracs, [k]: v } });

  return (
    <div className="pile">
      <Onglets<Etape> onglets={ETAPES.map(([id, l]) => [id, l] as [Etape, string])} actif={etape} onChoix={setEtape} />

      {etape === 'origine' && (
        <div className="perso-champs">
          <Champ libelle="Nom"><input value={c.nom} onChange={(e) => maj({ nom: e.target.value })} /></Champ>
          <Champ libelle="Genre">
            <select value={c.feminin ? 'f' : 'm'} onChange={(e) => maj({ feminin: e.target.value === 'f' })}><option value="f">féminin</option><option value="m">masculin</option></select>
          </Champ>
          <Champ libelle="Peuple">
            <select value={c.espece} onChange={(e) => maj({ espece: e.target.value, bonusLibres: [] })}>
              {R.catalogue.peuples.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </Champ>
          <Champ libelle="Classe">
            <select value={c.classe} onChange={(e) => { const n = R.catalogue.classes.find((x) => x.id === e.target.value); maj({ classe: e.target.value, sousClasse: n?.sousClasses[0]?.id, competences: [] }); }}>
              {R.catalogue.classes.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
            </select>
          </Champ>
          <Champ libelle="Niveau"><input type="number" min={1} max={20} value={c.niveau} onChange={(e) => maj({ niveau: Number(e.target.value) })} /></Champ>
          {cl && c.niveau >= cl.niveauSousClasse && (
            <Champ libelle="Sous-classe">
              <select value={c.sousClasse ?? ''} onChange={(e) => maj({ sousClasse: e.target.value })}>
                {cl.sousClasses.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </Champ>
          )}
          <p className="discret" style={{ gridColumn: '1 / -1' }}>
            {cl?.texte} Dé de vie d{cl?.deVie}, sauvegardes {cl?.sauvegardes.map(lib).join(' et ')}.{' '}
            {pe && <>Peuple : {Object.entries(pe.bonus).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}{pe.bonusLibres ? ` et +1 à ${pe.bonusLibres} autres` : ''}, vitesse {pe.vitesse} cases ; {pe.traits.map((t) => t.nom).join(', ')}.</>}
          </p>
          {pe?.bonusLibres ? (
            <div className="ligne" style={{ gridColumn: '1 / -1' }}>
              <span className="discret">+1 libres ({(c.bonusLibres ?? []).length}/{pe.bonusLibres}) :</span>
              {CARACS.filter((k) => !(k in pe.bonus)).map((k) => (
                <label key={k} className="ligne discret">
                  <input type="checkbox" checked={(c.bonusLibres ?? []).includes(k)}
                    disabled={!(c.bonusLibres ?? []).includes(k) && (c.bonusLibres ?? []).length >= pe.bonusLibres!}
                    onChange={(e) => maj({ bonusLibres: e.target.checked ? [...(c.bonusLibres ?? []), k] : (c.bonusLibres ?? []).filter((x) => x !== k) })} />{k.toUpperCase()}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {etape === 'caracs' && (
        <div className="pile">
          <div className="ligne">
            {(['standard', 'achat', 'tirage'] as Methode[]).map((m) => (
              <label key={m} className="ligne"><input type="radio" checked={methode === m} onChange={() => {
                setMethode(m);
                if (m === 'achat') maj({ caracs: Object.fromEntries(CARACS.map((k) => [k, 8])) });
                if (m === 'standard') { setValeurs(R.creation.tableauStandard); maj({ caracs: Object.fromEntries(CARACS.map((k, i) => [k, R.creation.tableauStandard[i]])) }); }
              }} />{m === 'standard' ? 'Tableau standard' : m === 'achat' ? `Achat de points (${R.creation.achat.points})` : 'Tirage 4d6'}</label>
            ))}
            {methode === 'tirage' && <button className="btn btn-petit" onClick={() => { const v = R.creation.tirage(hasard()); setValeurs(v); maj({ caracs: Object.fromEntries(CARACS.map((k, i) => [k, v[i]])) }); }}>Tirer les dés</button>}
            {methode === 'achat' && <span className={pointsAchat > R.creation.achat.points ? 'perso-erreur' : 'discret'}>{R.creation.achat.points - pointsAchat} points restants</span>}
          </div>
          <div className="perso-caracs">
            {CARACS.map((k) => {
              const final = (apercu.stats.carac as Record<string, number>)[k];
              return (
                <label key={k} className="perso-carac">
                  <span>{k.toUpperCase()}</span><strong>{final}</strong>
                  {methode === 'achat'
                    ? <input type="number" min={8} max={15} value={c.caracs[k] ?? 8} onChange={(e) => affecter(k, Number(e.target.value))} />
                    : <select value={c.caracs[k]} onChange={(e) => affecter(k, Number(e.target.value))}>{[...new Set(valeurs)].sort((a, b) => b - a).map((v) => <option key={v}>{v}</option>)}</select>}
                  <small>{lib(k)}</small>
                </label>
              );
            })}
          </div>
          <p className="discret">Valeur en gros : après les bonus du peuple. Principales pour la classe : {cl?.principales.map(lib).join(', ')}.</p>
        </div>
      )}

      {etape === 'competences' && (
        <div className="pile">
          <Champ libelle="Historique">
            <select value={c.historique} onChange={(e) => maj({ historique: e.target.value })}>
              {R.catalogue.historiques.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
            </select>
          </Champ>
          <p className="discret">Déjà acquises (historique et peuple) : {[...dejaAcquises].map(libComp).join(', ') || 'aucune'}.</p>
          <p>Compétences de classe : {choisies.length} / {cl?.competences.choix}</p>
          <div className="perso-champs">
            {cl?.competences.parmi.filter((x) => !dejaAcquises.has(x)).map((x) => (
              <label key={x} className="ligne">
                <input type="checkbox" checked={choisies.includes(x)} disabled={!choisies.includes(x) && choisies.length >= cl.competences.choix}
                  onChange={(e) => maj({ competences: e.target.checked ? [...choisies, x] : choisies.filter((y) => y !== x) })} />{libComp(x)}
              </label>
            ))}
          </div>
        </div>
      )}

      {etape === 'personnalite' && (
        <div className="pile">
          <Champ libelle="Alignement">
            <select value={c.alignement} onChange={(e) => maj({ alignement: e.target.value })}>{R.catalogue.alignements.map((a) => <option key={a}>{a}</option>)}</select>
          </Champ>
          {(['traits', 'ideaux', 'liens', 'defauts'] as const).map((k) => (
            <Champ key={k} libelle={{ traits: 'Traits', ideaux: 'Idéaux', liens: 'Liens', defauts: 'Défauts' }[k]}>
              <div className="ligne">
                <textarea rows={2} style={{ flex: 1 }} value={c.personnalite?.[k] ?? ''} onChange={(e) => maj({ personnalite: { ...c.personnalite, [k]: e.target.value } })} />
                <button className="btn btn-petit" title="Au hasard" onClick={() => maj({ personnalite: { ...c.personnalite, [k]: R.creation.aleatoire(hasard()).personnalite?.[k] } })}>🎲</button>
              </div>
            </Champ>
          ))}
        </div>
      )}

      {etape === 'resume' && (
        <div className="pile">
          <p><strong>{c.nom}</strong>, {pe?.nom} {cl?.nom} de niveau {c.niveau}{historique ? `, ${historique.nom.toLowerCase()}` : ''}.</p>
          <div className="perso-derives">
            {apercu.calcul.derives.filter((d) => ['ca', 'initiative', 'perceptionPassive', 'vitesse', 'maitrise'].includes(d.cle)).map((d) => (
              <div key={d.cle} className="perso-derive"><span>{d.libelle}</span><strong>{d.texte}</strong></div>
            ))}
            <div className="perso-derive"><span>PV</span><strong>{String(apercu.stats.pvMax)}</strong></div>
          </div>
          <p className="discret">Compétences : {apercu.calcul.competences.filter((x) => x.maitrise).map((x) => `${x.libelle} ${x.texte}`).join(', ')}.</p>
          <p className="discret">Équipement : {apercu.fiche.inventaire?.objets.map((o) => o.nom + (o.equipe ? ' (équipé)' : '')).join(', ')}.</p>
          <label className="ligne discret"><input type="checkbox" checked={avecApparence} onChange={(e) => setAvecApparence(e.target.checked)} /> Avatar 3D et portrait automatiques</label>
          <button className="btn btn-principal" style={{ alignSelf: 'flex-start' }} disabled={methode === 'achat' && pointsAchat > R.creation.achat.points} onClick={() => onCreer({ ...c, competences: choisies, equipement: true }, avecApparence)}>Créer le personnage</button>
        </div>
      )}

      {etape !== 'resume' && (
        <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setEtape(ETAPES[ETAPES.findIndex((e) => e[0] === etape) + 1][0])}>Suivant →</button>
      )}
    </div>
  );
}
