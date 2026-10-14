// Écran d'un joueur à distance (adresse avec ?joueur=<jeton>) : onglets « Table » (ce que voit la table),
// « Ma fiche » (lecture seule, à jour en direct, avec ses notes) et « Messages » (ce que le MJ lui envoie à lui seul).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { envoyerAuMj } from '../noyau/bus';

export interface DonneesPrivees {
  /** Personnage de ce joueur (ses actions sur la table de combat). */
  persoId?: string;
  fiche?: { nom: string; html: string; css: string; notes: string; portrait?: Blob | null };
  messages?: { id: string; quand: string; texte: string; image?: Blob | null; de?: 'joueur' }[];
}

function useUrl(b: Blob | null | undefined): string | null {
  const url = useMemo(() => (b ? URL.createObjectURL(b) : null), [b]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}
function Image({ blob }: { blob?: Blob | null }) {
  const url = useUrl(blob);
  return url ? <img src={url} alt="" /> : null;
}

export function EcranDistant({ prive, children }: { prive: DonneesPrivees; children: ReactNode }) {
  const [onglet, setOnglet] = useState<'table' | 'fiche' | 'messages'>('table');
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
        <button aria-pressed={onglet === 'table'} onClick={() => setOnglet('table')}>Table</button>
        <button aria-pressed={onglet === 'fiche'} onClick={() => setOnglet('fiche')} disabled={!prive.fiche}>{prive.fiche ? `Ma fiche : ${prive.fiche.nom}` : 'Ma fiche'}</button>
        <button aria-pressed={onglet === 'messages'} onClick={() => setOnglet('messages')}>Messages{nouveaux ? <b className="distant-badge">{nouveaux}</b> : null}</button>
      </nav>
      {children}
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
    </>
  );
}
