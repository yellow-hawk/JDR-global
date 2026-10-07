import { useState } from 'react';
import { analyser } from '../engine/analyse';
import { nomRang, type ProfilPJ } from '../engine/profils';
import { formatTemps } from '../engine/defi';
import { imprimer } from '../engine/impression';
import { LECONS } from '../data/lecons';
import { SIGNE, TOUS } from '../data/signes';
import { GlyphIcon } from './Glyph';
import { SceauSVG } from './SceauSVG';
import { Calibrage } from './Calibrage';
import type { Modele } from './Freehand';

interface Props {
  profil: ProfilPJ | null;
  majProfil: (fn: (p: ProfilPJ) => ProfilPJ) => void;
  onModele: (m: Modele) => void;
}

/** Carnet du personnage : signes connus, grimoire personnel, leçons, calibrage et impression. */
export function Carnet({ profil, majProfil, onModele }: Props) {
  const [onglet, setOnglet] = useState<'grimoire' | 'signes' | 'lecons'>('grimoire');
  const [calib, setCalib] = useState(false);
  const [aRetirer, setARetirer] = useState<string | null>(null);

  if (!profil) {
    return (
      <section className="carnet vide-carnet" aria-label="Carnet du personnage">
        <h3>Carnet du personnage</h3>
        <p className="muted">Choisissez ou créez un personnage en haut de la page : il garde ses signes connus, son grimoire ({5} sorts au départ), ses leçons, ses records et le calibrage de sa main.</p>
      </section>
    );
  }

  const connus = TOUS.filter((s) => profil.signes.includes(s.id));
  const lecons = LECONS.filter((l) => l.rang <= profil.rang);
  const plein = profil.grimoire.length >= profil.emplacements;
  const nbCalib = Object.values(profil.calibrage).reduce((n, l) => n + l.length, 0);

  return (
    <section className="carnet" aria-label={`Carnet de ${profil.nom}`} style={{ ['--pj' as string]: profil.couleur }}>
      <div className="carnet-tete">
        <div>
          <div className="tag">Carnet de</div>
          <h3>{profil.nom}{profil.joueur && <small> · {profil.joueur}</small>}</h3>
        </div>
        <div className="badges">
          <span className="badge">{nomRang(profil.rang)}</span>
          <span className="badge">{connus.length} signes</span>
          <span className={`badge ${plein ? 'warn' : ''}`}>Grimoire {profil.grimoire.length}/{profil.emplacements}</span>
          <span className="badge">{profil.lecons.length} leçon(s)</span>
        </div>
        <div className="carnet-actions">
          <button className="btn" onClick={() => setCalib(true)}>Calibrer ma main{nbCalib ? ` (${nbCalib})` : ''}</button>
          <button className="btn" disabled={!profil.grimoire.length}
            onClick={() => imprimer(profil.grimoire.map((s) => ({ nom: s.nom, sceau: s.sceau, notes: s.notes, categorie: 'Grimoire de ' + profil.nom })), `Grimoire de ${profil.nom}`, `${nomRang(profil.rang)}${profil.joueur ? ' · joué par ' + profil.joueur : ''}`)}>
            Imprimer mon grimoire
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={onglet === 'grimoire'} className={onglet === 'grimoire' ? 'on' : ''} onClick={() => setOnglet('grimoire')}>Grimoire</button>
        <button role="tab" aria-selected={onglet === 'signes'} className={onglet === 'signes' ? 'on' : ''} onClick={() => setOnglet('signes')}>Signes connus</button>
        <button role="tab" aria-selected={onglet === 'lecons'} className={onglet === 'lecons' ? 'on' : ''} onClick={() => setOnglet('lecons')}>Leçons</button>
      </div>

      {onglet === 'grimoire' && (
        <div className="carnet-grim">
          {!profil.grimoire.length && <p className="muted">Grimoire vide. Tracez un sort puis « Inscrire dans le grimoire ». Il reste {profil.emplacements} emplacements.</p>}
          {profil.grimoire.map((s) => {
            const a = analyser(s.sceau);
            const rec = profil.defis[s.id];
            return (
              <article key={s.id} className="carnet-sort">
                <div className="mini"><SceauSVG sceau={s.sceau} paire ariaLabel={s.nom} /></div>
                <div className="carnet-sort-texte">
                  <b>{s.nom}</b>
                  <span className="muted">{nomRang(a.rang)} · +{a.difficulte}{rec ? ` · record ${rec.score}/100 en ${formatTemps(rec.temps)}` : ''}</span>
                  <div className="fiche-actions">
                    <button className="btn primary" onClick={() => onModele({ titre: s.nom, consigne: 'Retracez le sort de mémoire, le plus vite et le plus proprement possible.', sceau: s.sceau, sortId: s.id, fantome: false })}>S’entraîner</button>
                    {aRetirer === s.id ? (
                      <>
                        <button className="btn danger" onClick={() => { majProfil((p) => ({ ...p, grimoire: p.grimoire.filter((x) => x.id !== s.id) })); setARetirer(null); }}>Effacer la page</button>
                        <button className="btn ghost" onClick={() => setARetirer(null)}>Garder</button>
                      </>
                    ) : <button className="btn ghost" onClick={() => setARetirer(s.id)}>Retirer</button>}
                  </div>
                </div>
              </article>
            );
          })}
          {Array.from({ length: Math.max(0, profil.emplacements - profil.grimoire.length) }, (_, i) => <div key={i} className="carnet-sort libre-empl" aria-hidden="true">Page libre</div>)}
        </div>
      )}

      {onglet === 'signes' && (
        <div className="carnet-signes">
          {(['coeur', 'rameau', 'noeud'] as const).map((f) => (
            <div key={f}>
              <div className="tag">{f === 'coeur' ? 'Cœurs' : f === 'rameau' ? 'Rameaux' : 'Nœuds'}</div>
              <div className="glyphes-connus">
                {connus.filter((s) => s.famille === f).map((s) => (
                  <span key={s.id} className="glyphe-connu" title={`${s.nom} / ${s.nomInverse}${profil.calibrage[s.id]?.length ? ' · calibré' : ''}`}>
                    <GlyphIcon id={s.id} kind={f} size={34} />
                    <small>{s.nom}{profil.calibrage[s.id]?.length ? ' ✎' : ''}</small>
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="muted">Un signe inconnu est lu mais n’agit pas. Les leçons permettent d’en apprendre de nouveaux ; le MJ peut aussi les accorder.</p>
        </div>
      )}

      {onglet === 'lecons' && (
        <div className="carnet-lecons">
          {lecons.map((l) => {
            const faite = profil.lecons.includes(l.id);
            const rec = profil.defis[l.id];
            return (
              <article key={l.id} className={`lecon ${faite ? 'faite' : ''}`}>
                <div className="mini"><SceauSVG sceau={l.modele} paire ariaLabel={l.titre} /></div>
                <div>
                  <b>{faite ? '✓ ' : ''}{l.titre}</b>
                  <span className="muted"> · {nomRang(l.rang)}{l.apprend ? ` · apprend ${SIGNE[l.apprend].nom}` : ' · technique'}{rec ? ` · ${rec.score}/100` : ''}</span>
                  <p>{l.consigne}</p>
                  <button className="btn" onClick={() => onModele({ titre: l.titre, consigne: l.consigne, sceau: l.modele, lecon: l, fantome: true })}>{faite ? 'Refaire' : 'Commencer'}</button>
                </div>
              </article>
            );
          })}
          {profil.rang < 3 && <p className="muted">D’autres leçons s’ouvrent au rang {nomRang((profil.rang + 1) as 2 | 3)} (le MJ change le rang dans « Personnages »).</p>}
        </div>
      )}

      {calib && <Calibrage profil={profil} majProfil={majProfil} onFermer={() => setCalib(false)} />}
    </section>
  );
}
