// Écran d'un joueur à distance (adresse avec ?joueur=<jeton>) : onglets « Table » (ce que voit la table),
// « Ma fiche » (lecture seule, à jour en direct, avec ses notes), « Entraînement » (magie, si son personnage trace
// des sorts) et « Messages » (échange privé avec le MJ).
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { envoyerAuMj } from '../noyau/bus';
import { moduleParId } from './registre';
import { alerterJoueur, surAlerteJoueur } from './alerteJoueur';

export interface DonneesPrivees {
  /** Personnage de ce joueur (ses actions sur la table de combat). */
  persoId?: string;
  fiche?: { nom: string; html: string; css: string; notes: string; portrait?: Blob | null };
  messages?: { id: string; quand: string; texte: string; image?: Blob | null; de?: 'joueur' }[];
  /** Zone d'entraînement (vue `entrainement` du module Magie) : son carnet et ce que le MJ permet. */
  entrainement?: Record<string, unknown> | null;
  /** Onglets des modules (talents, dés, sac, groupe, niveau, entraînement) : leurs données. */
  talents?: Record<string, unknown> | null;
  des?: Record<string, unknown> | null;
  inventaire?: Record<string, unknown> | null;
  groupe?: Record<string, unknown> | null;
  niveau?: Record<string, unknown> | null;
  /** Pastilles sur les onglets (jets demandés, niveau à choisir…). */
  badges?: Record<string, number>;
  /** Alerte du MJ (jet demandé) : son et bandeau à chaque nouvel `id`. */
  alerte?: { id: string; texte: string } | null;
}

/** Onglets en plus, donnés par les modules : clé des données privées → vue de l'écran joueurs. */
const ONGLETS_MODULES: { cle: 'des' | 'inventaire' | 'talents' | 'niveau' | 'groupe' | 'entrainement'; titre: string; module: string; vue: string }[] = [
  { cle: 'des', titre: 'Dés', module: 'joueurs', vue: 'des' },
  { cle: 'inventaire', titre: 'Sac', module: 'joueurs', vue: 'inventaire' },
  { cle: 'talents', titre: 'Talents', module: 'personnages', vue: 'talents' },
  { cle: 'niveau', titre: 'Niveau ⬆', module: 'personnages', vue: 'niveau' },
  { cle: 'groupe', titre: 'Groupe', module: 'joueurs', vue: 'groupe' },
  { cle: 'entrainement', titre: 'Entraînement', module: 'magie', vue: 'entrainement' },
];

function useUrl(b: Blob | null | undefined): string | null {
  const url = useMemo(() => (b ? URL.createObjectURL(b) : null), [b]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}
function Image({ blob }: { blob?: Blob | null }) {
  const url = useUrl(blob);
  return url ? <img src={url} alt="" /> : null;
}

/**
 * `nouveaute` : ce que montre la table. Quand le MJ affiche autre chose (fiche de peuple, carte, document…) alors que
 * le joueur est sur un autre onglet, on revient à la table ; s'il est en train d'écrire, de tracer ou d'explorer ses
 * talents, un bandeau « Voir » le prévient sans l'interrompre.
 */
export function EcranDistant({ prive, nouveaute, children, pardessus }: { prive: DonneesPrivees; nouveaute?: { cle: string; titre: string }; children: ReactNode; pardessus?: ReactNode }) {
  const [onglet, setOnglet] = useState<string>('table');
  // Onglets fournis par les modules, présents seulement si le MJ envoie leurs données.
  const extras = ONGLETS_MODULES.map((o) => ({ ...o, donnees: prive[o.cle], Vue: prive[o.cle] ? moduleParId(o.module)?.ecranJoueurs?.[o.vue] : undefined })).filter((o) => o.Vue && o.donnees);
  const extra = extras.find((o) => o.cle === onglet);
  const [aVoir, setAVoir] = useState<string | null>(null);
  const derniere = useRef(nouveaute?.cle);
  useEffect(() => {
    if (!nouveaute || nouveaute.cle === derniere.current) return;
    derniere.current = nouveaute.cle;
    if (onglet === 'table') return;
    const ecrit = !!document.activeElement?.matches('textarea, input[type=text], input:not([type])');
    if (ecrit || extras.some((o) => o.cle === onglet)) setAVoir(`Le maître du jeu montre : ${nouveaute.titre}`);
    else setOnglet('table');
  }, [nouveaute?.cle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (onglet === 'table') setAVoir(null); }, [onglet]);
  // Alerte (son tour en combat, jet demandé…) : bandeau même s'il regarde un autre onglet.
  const ongletCourant = useRef(onglet); ongletCourant.current = onglet;
  useEffect(() => surAlerteJoueur((t) => { if (ongletCourant.current !== 'table') setAVoir(t); }), []);
  // Le MJ demande un jet : son, et l'onglet Dés s'ouvre (sauf si le joueur écrit).
  const alerteVue = useRef(prive.alerte?.id);
  useEffect(() => {
    const a = prive.alerte;
    if (!a || a.id === alerteVue.current) return;
    alerteVue.current = a.id;
    alerterJoueur(a.texte);
    if (!document.activeElement?.matches('textarea, input')) setOnglet('des');
  }, [prive.alerte?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!['table', 'fiche', 'messages'].includes(onglet) && !extra) setOnglet('table'); }, [onglet, extra]);
  const [notes, setNotes] = useState(prive.fiche?.notes ?? '');
  const [lus, setLus] = useState(0);
  const portrait = useUrl(prive.fiche?.portrait);
  const ecrit = useRef(false);
  const messages = prive.messages ?? [];
  const [brouillon, setBrouillon] = useState('');
  const duMj = messages.filter((m) => m.de !== 'joueur').length;
  const nouveaux = Math.max(0, duMj - lus);
  const ecrire = () => { const t = brouillon.trim(); if (!t) return; envoyerAuMj('joueurs', { message: t }); setBrouillon(''); };

  // Notes : celles du MJ tant que le joueur n'écrit pas ; les siennes partent au MJ après une courte pause.
  useEffect(() => { if (!ecrit.current) setNotes(prive.fiche?.notes ?? ''); }, [prive.fiche?.notes]);
  useEffect(() => {
    if (!ecrit.current) return;
    const t = window.setTimeout(() => { envoyerAuMj('joueurs', { notes }); ecrit.current = false; }, 800);
    return () => window.clearTimeout(t);
  }, [notes]);
  useEffect(() => { if (onglet === 'messages') setLus(duMj); }, [onglet, duMj]);
  // Nouveau message : petit signal sonore discret… et le titre de l'onglet clignote.
  useEffect(() => { document.title = nouveaux ? `(${nouveaux}) Écran joueurs` : 'Écran joueurs · JDR Global'; }, [nouveaux]);

  const html = (prive.fiche?.html ?? '').replace(/<img src="\{\{portrait\}\}"[^>]*>/, portrait ? `<img src="${portrait}" alt="">` : '');

  return (
    <>
      <nav className="distant-onglets">
        <button aria-pressed={onglet === 'table'} onClick={() => setOnglet('table')}>Table{aVoir ? <b className="distant-badge">●</b> : null}</button>
        <button aria-pressed={onglet === 'fiche'} onClick={() => setOnglet('fiche')} disabled={!prive.fiche}>{prive.fiche ? `Ma fiche : ${prive.fiche.nom}` : 'Ma fiche'}</button>
        {extras.map((o) => <button key={o.cle} aria-pressed={onglet === o.cle} onClick={() => setOnglet(o.cle)}>{o.titre}{prive.badges?.[o.cle] ? <b className="distant-badge">{prive.badges[o.cle]}</b> : null}</button>)}
        <button aria-pressed={onglet === 'messages'} onClick={() => setOnglet('messages')}>Messages{nouveaux ? <b className="distant-badge">{nouveaux}</b> : null}</button>
      </nav>
      {children}
      {aVoir && onglet !== 'table' && (
        <div className="distant-avoir" role="status">
          <span>📺 <b>{aVoir}</b></span>
          <button className="btn btn-petit btn-principal" onClick={() => setOnglet('table')}>Voir</button>
          <button className="btn btn-petit" onClick={() => setAVoir(null)}>Plus tard</button>
        </div>
      )}
      {onglet === 'fiche' && prive.fiche && (
        <div className="distant-panneau distant-fiche">
          <style>{prive.fiche.css}</style>
          <div className="distant-feuille" dangerouslySetInnerHTML={{ __html: html }} />
          <label className="distant-notes">
            <strong>Mes notes</strong> <span>(le MJ peut les lire ; enregistrées automatiquement)</span>
            <textarea rows={8} value={notes} onChange={(e) => { ecrit.current = true; setNotes(e.target.value); }} placeholder="Indices, noms, choses à ne pas oublier…" />
          </label>
        </div>
      )}
      {extra?.Vue && extra.donnees && (
        <div className={`distant-panneau distant-${extra.cle}`}>
          <Suspense fallback={<p>Chargement…</p>}>
            <extra.Vue donnees={extra.donnees} envoyer={(d) => envoyerAuMj('joueurs', { [extra.cle]: d })} moi={{ distant: true, persoId: prive.persoId ?? null }} />
          </Suspense>
        </div>
      )}
      {onglet === 'messages' && (
        <div className="distant-panneau distant-messages">
          <div className="distant-ecrire">
            <textarea rows={3} value={brouillon} onChange={(e) => setBrouillon(e.target.value)} placeholder="Message pour le maître du jeu seulement…"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ecrire(); }} />
            <button className="btn btn-principal" disabled={!brouillon.trim()} onClick={ecrire}>Envoyer au MJ</button>
          </div>
          {!messages.length && <p>Aucun message pour l’instant. Ce que tu écris ici, seul le maître du jeu le lit.</p>}
          {[...messages].reverse().map((m) => (
            <article key={m.id} className={m.de === 'joueur' ? 'de-moi' : ''}>
              <small>{m.de === 'joueur' ? 'Toi → MJ' : 'MJ → toi'} · {new Date(m.quand).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small>
              {m.texte && <p>{m.texte}</p>}
              <Image blob={m.image} />
            </article>
          ))}
        </div>
      )}
      {pardessus && <div className="distant-dessus">{pardessus}</div>}
    </>
  );
}
