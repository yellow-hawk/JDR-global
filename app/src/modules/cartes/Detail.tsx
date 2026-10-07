// Fiche d'une carte : image, outils (repère, échelle, zone), infos, versions MJ / joueurs.
import { useEffect, useRef, useState } from 'react';
import type { Brouillard, Carte } from '../../noyau/contrat';
import { emettre, montrerAuxJoueurs } from '../../noyau/bus';
import { ajouterFichier, choisirFichier, lireFichier, supprimerFichier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { BlocMj, Champ, useUrlFichier } from '../../interface/composants';
import { ACCEPTE, preparer } from './import';
import {
  TYPES_CARTE, ajouterRepere, chemin, definirVersionMj, distanceLisible, echelleDepuisPoints, enfants,
  modifierCarte, parentPossible, pixelsParCase,
} from './logique';
import { PanneauRepere } from './PanneauRepere';
import { brouillardDe, compacter, imageAvecBrouillard, toutCacher, toutReveler } from './brouillard';
import { CalqueBrouillard } from './CalqueBrouillard';
import { OutilsBrouillard } from './OutilsBrouillard';
import { Visionneuse, type Outil } from './Visionneuse';

interface Props { carte: Carte; onOuvrir(id: string | null): void; onSupprimer(): void }

export function Detail({ carte: k, onOuvrir, onSupprimer }: Props) {
  const { campagne, vue, role, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const idC = c.campagne.id;
  const [version, setVersion] = useState<'joueurs' | 'mj'>(role === 'mj' && k.images.mj ? 'mj' : 'joueurs');
  const [outil, setOutil] = useState<Outil>('voir');
  const [points, setPoints] = useState<[number, number][]>([]);
  const [metres, setMetres] = useState('');
  const [aPlacer, setAPlacer] = useState('');
  const [repere, setRepere] = useState<string | null>(null);
  const idImage = version === 'mj' && k.images.mj ? k.images.mj.image : k.images.joueurs;
  const url = useUrlFichier(idC, idImage);
  const maj = (f: (x: Carte) => Carte) => modifier((x) => modifierCarte(x, k.id, f));
  const pxCase = pixelsParCase(k);
  const b = brouillardDe(k);
  const { l, h } = k.taille ?? { l: 1000, h: 1000 };
  const [revele, setRevele] = useState(true);
  const [taillePinceau, setTaillePinceau] = useState(5);
  const [direct, setDirect] = useState(false);
  const majBrouillard = (f: (x: Brouillard) => Brouillard) => maj((x) => ({ ...x, brouillard: f(brouillardDe(x)) }));

  // Écran joueurs en direct : l'image avec brouillard suit chaque changement (au plus toutes les 0,6 s).
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    if (!direct) return;
    const t = window.setTimeout(() => void montrer(true), 600);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k.brouillard, direct]);

  const choisirOutil = (o: Outil) => { setOutil(outil === o ? 'voir' : o); setPoints([]); };
  const surPoint = (x: number, y: number) => {
    if (outil === 'repere') {
      let id = '';
      modifier((cc) => { const r = ajouterRepere(cc, k.id, x, y); id = r.id; return r.campagne; });
      window.setTimeout(() => setRepere(id), 0);
      setOutil('voir');
    } else if (outil === 'echelle') setPoints((p) => (p.length >= 2 ? [[x, y]] : [...p, [x, y]]));
  };
  const validerEchelle = () => {
    const m = echelleDepuisPoints(points[0], points[1], Number(metres.replace(',', '.')));
    if (!m) return;
    maj((x) => ({ ...x, echelle: { metresParPixel: m } }));
    setOutil('voir'); setPoints([]);
    emettre('message', { texte: 'Échelle enregistrée.', sorte: 'succes' });
  };
  const surZone = (z: [number, number, number, number]) => {
    if (!aPlacer) return;
    modifier((x) => modifierCarte(x, aPlacer, (e) => ({ ...e, parent: { carte: { type: 'carte', id: k.id }, zone: z } })));
    setOutil('voir'); setAPlacer('');
  };
  const versionMj = async () => {
    const choix = await choisirFichier(ACCEPTE);
    if (!choix) return;
    const { contenu, nom } = await preparer(choix[0]);
    const f = await ajouterFichier(idC, contenu, nom);
    let libere: string | null = null;
    modifier((x) => { const r = definirVersionMj(x, k.id, f); libere = r.libere; return r.campagne; });
    window.setTimeout(() => { if (libere) void supprimerFichier(idC, libere); }, 0);
    setVersion('mj');
  };
  const montrer = async (discret = false) => {
    const img = k.images.joueurs ? await lireFichier(idC, k.images.joueurs) : undefined;
    if (!img) return;
    const image = b.actif ? await imageAvecBrouillard(img, b) : img;
    montrerAuxJoueurs({ sorte: 'image', titre: k.nom, image });
    if (!discret) emettre('message', { texte: `« ${k.nom} » est affichée sur l'écran joueurs${b.actif ? ' (avec le brouillard)' : ' (version joueurs)'}.`, sorte: 'succes' });
  };

  const fil = chemin(c, k.id);
  const zones = enfants(c, k.id).filter((e) => e.parent).map((e) => ({ id: e.id, nom: e.nom, zone: e.parent!.zone }));
  const repActif = k.reperes.find((r) => r.id === repere) ?? null;
  const candidats = (campagne?.cartes ?? []).filter((e) => parentPossible(c, e.id, k.id));

  return (
    <div className="cartes-detail">
      <nav className="ligne discret cartes-fil">
        <button className="btn btn-petit" onClick={() => onOuvrir(null)}>Toutes les cartes</button>
        {fil.map((e) => <button key={e.id} className="btn btn-petit" disabled={e.id === k.id} onClick={() => onOuvrir(e.id)}>{e.nom}</button>)}
      </nav>
      <div className="cartes-corps">
        <div className="pile" style={{ gap: 8, minWidth: 0 }}>
          {!lectureSeule && (
            <div className="ligne">
              {role === 'mj' && k.images.mj && (
                <div className="ligne cartes-bascule">
                  <button className={`btn btn-petit ${version === 'mj' ? 'btn-mj' : ''}`} onClick={() => setVersion('mj')}>Version MJ</button>
                  <button className={`btn btn-petit ${version === 'joueurs' ? 'btn-principal' : ''}`} onClick={() => setVersion('joueurs')}>Version joueurs</button>
                </div>
              )}
              <button className={`btn btn-petit ${outil === 'repere' ? 'btn-principal' : ''}`} onClick={() => choisirOutil('repere')}>+ Repère</button>
              <button className={`btn btn-petit ${outil === 'echelle' ? 'btn-principal' : ''}`} onClick={() => choisirOutil('echelle')}>Échelle</button>
              <button className={`btn btn-petit ${outil === 'zone' ? 'btn-principal' : ''}`} onClick={() => choisirOutil('zone')}>Placer une carte ici</button>
              {role === 'mj' && <button className={`btn btn-petit ${outil === 'brouillard' ? 'btn-mj' : ''}`} onClick={() => { choisirOutil('brouillard'); setVersion('joueurs'); if (!k.brouillard) majBrouillard(() => toutCacher()); }}>Brouillard</button>}
              <span style={{ flex: 1 }} />
              <button className="btn btn-petit btn-mj" onClick={() => void montrer()}>Montrer aux joueurs</button>
            </div>
          )}
          {outil === 'brouillard' && (
            <OutilsBrouillard b={b} revele={revele} setRevele={setRevele} taille={taillePinceau} setTaille={setTaillePinceau}
              direct={direct} setDirect={setDirect}
              activer={(v) => majBrouillard((x) => ({ ...x, actif: v }))}
              toutReveler={() => majBrouillard(() => toutReveler(l, h))} toutCacher={() => majBrouillard(() => toutCacher())} />
          )}
          {outil === 'repere' && <p className="discret">Clique sur la carte pour poser le repère.</p>}
          {outil === 'echelle' && (
            <div className="ligne discret">
              Clique deux points dont tu connais la distance ({points.length}/2), puis :
              <input className="cartes-metres" value={metres} onChange={(e) => setMetres(e.target.value)} placeholder="mètres" inputMode="decimal" />
              <button className="btn btn-petit btn-principal" disabled={points.length < 2 || !metres} onClick={validerEchelle}>Valider</button>
            </div>
          )}
          {outil === 'zone' && (
            <div className="ligne discret">
              Carte à placer :
              <select value={aPlacer} onChange={(e) => setAPlacer(e.target.value)}>
                <option value="">Choisir…</option>
                {candidats.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
              puis trace un rectangle sur la carte.
            </div>
          )}
          <Visionneuse
            url={url} carte={k} reperes={k.reperes} zonesEnfants={zones} outil={outil}
            pointsEchelle={points} repereActif={repere}
            onPoint={surPoint} onZone={surZone} onRepere={setRepere} onEnfant={(id) => onOuvrir(id)}
            calque={(b.actif || outil === 'brouillard') && version === 'joueurs' ? (
              <CalqueBrouillard l={l} h={h} traits={b.traits} vue={role === 'mj' ? 'mj' : 'joueurs'}
                pinceau={outil === 'brouillard' ? { r: (Math.max(l, h) * taillePinceau) / 100, revele } : null}
                onTrace={(t) => majBrouillard((x) => ({ ...x, actif: true, traits: compacter([...x.traits, ...t], l, h) }))} />
            ) : undefined}
          />
        </div>

        <aside className="pile cartes-infos">
          {repActif ? (
            <PanneauRepere carte={k} repere={repActif} onFermer={() => setRepere(null)} onOuvrir={(id) => onOuvrir(id)} />
          ) : (
            <fieldset disabled={lectureSeule} className="pile cartes-champs">
              <Champ libelle="Nom"><input value={k.nom} onChange={(e) => maj((x) => ({ ...x, nom: e.target.value }))} /></Champ>
              <Champ libelle="Type">
                <select value={k.type} onChange={(e) => maj((x) => ({ ...x, type: e.target.value }))}>
                  {TYPES_CARTE.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
                </select>
              </Champ>
              <p className="discret">
                {k.taille ? `${k.taille.l} × ${k.taille.h} px` : ''}
                {k.echelle && k.taille ? ` · ${distanceLisible(k.echelle.metresParPixel * k.taille.l)} de large` : ' · échelle non calée'}
                {pxCase ? ` · 1 case de combat = ${pxCase.toFixed(1)} px` : ''}
              </p>
              {role === 'mj' && (
                <BlocMj>
                  <div className="pile" style={{ gap: 8 }}>
                    <Champ libelle="Notes MJ">
                      <textarea value={String((k.mj as { notes?: string } | undefined)?.notes ?? '')}
                        onChange={(e) => maj((x) => ({ ...x, mj: { ...(x.mj ?? {}), notes: e.target.value } }))} />
                    </Champ>
                    <button type="button" className="btn btn-petit btn-mj" onClick={versionMj}>
                      {k.images.mj ? 'Remplacer la version MJ…' : 'Ajouter une version MJ…'}
                    </button>
                    <label className="ligne discret">
                      <input type="checkbox" checked={!!(k.mj as { cache?: boolean } | undefined)?.cache}
                        onChange={(e) => maj((x) => ({ ...x, mj: { ...(x.mj ?? {}), cache: e.target.checked } }))} />
                      Carte entièrement cachée aux joueurs
                    </label>
                  </div>
                </BlocMj>
              )}
              {k.parent && <button type="button" className="btn btn-petit" onClick={() => maj((x) => ({ ...x, parent: null }))}>Retirer de la carte parente</button>}
              {k.reperes.length > 0 && (
                <div>
                  <h3>Repères</h3>
                  {k.reperes.map((r) => <button type="button" key={r.id} className="cartes-lien" onClick={() => setRepere(r.id)}>{r.nom}</button>)}
                </div>
              )}
              <button type="button" className="btn btn-danger" onClick={onSupprimer}>Supprimer la carte</button>
            </fieldset>
          )}
        </aside>
      </div>
    </div>
  );
}
