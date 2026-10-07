// Page Magie : l'Atelier de tracé branché sur la campagne.
// Remplace App.tsx de l'Atelier : plus de mot de passe (rôle MJ de la suite), plus de localStorage.
import { useEffect, useMemo, useState } from 'react';
import { useCampagne } from '../../interface/etat';
import { Composer } from './atelier/components/Composer';
import { Freehand } from './atelier/components/Freehand';
import { Grimoire } from './atelier/components/Grimoire';
import { Profils } from './atelier/components/Profils';
import type { ProfilPJ } from './atelier/engine/profils';
import { configurerStockage, EXEMPLES, fusionnerAvecBase, nouvelId } from './atelier/engine/storage';
import type { Sceau, SortEnregistre } from './atelier/engine/types';
import {
  aUneMagie, appliquerProfils, appliquerSortsMj, avecExemplesRetires, exemplesRetires, profilDe, sortsMj,
} from './lien';
import './atelier/atelier.css';
import './magie.css';

type Mode = 'libre' | 'composeur' | 'grimoire' | 'personnages';
const CLE_ACTIF = 'jdr-global.magie.actif';
const lireActif = (): string | null => { try { return localStorage.getItem(CLE_ACTIF); } catch { return null; } };

export function Page() {
  const { campagne, vue: c, role, modifier } = useCampagne();
  const mj = role === 'mj';
  const [mode, setMode] = useState<Mode>('libre');
  const [sceau, setSceau] = useState<Sceau>(EXEMPLES[0].sceau);
  const [nom, setNom] = useState(EXEMPLES[0].nom);
  const [actifId, setActifId] = useState<string | null>(lireActif);

  // Le grimoire de l'Atelier lit et écrit la campagne.
  useEffect(() => {
    configurerStockage({
      lireSorts: () => (campagne ? sortsMj(campagne) : []),
      lireRetires: () => (campagne ? exemplesRetires(campagne) : []),
      ecrireRetires: (ids) => modifier((x) => avecExemplesRetires(x, ids)),
    });
  }, [campagne, modifier]);

  useEffect(() => { try { if (actifId) localStorage.setItem(CLE_ACTIF, actifId); else localStorage.removeItem(CLE_ACTIF); } catch { /* sans importance */ } }, [actifId]);

  const profils = useMemo(() => (c ? c.personnages.filter(aUneMagie).map(profilDe) : []), [c]);
  const sorts = useMemo(() => (campagne ? fusionnerAvecBase(sortsMj(campagne), exemplesRetires(campagne)) : []), [campagne]);
  if (!c) return null;

  const profil = profils.find((p) => p.id === actifId) ?? null;
  const setProfils = (l: ProfilPJ[]) => modifier((x) => appliquerProfils(x, l));
  const majProfil = (fn: (p: ProfilPJ) => ProfilPJ) => {
    if (!profil) return;
    modifier((x) => {
      const actuels = x.personnages.filter(aUneMagie).map(profilDe);
      return appliquerProfils(x, actuels.map((p) => (p.id === profil.id ? fn(p) : p)));
    });
  };
  const setSorts = (l: SortEnregistre[]) => modifier((x) => appliquerSortsMj(x, l));
  const enregistrer = (n: string, notes: string, s: Sceau) => {
    const propre: Sceau = { ...s, trace: undefined, sansCerne: undefined };
    setSorts([{ id: nouvelId(), nom: n, notes, sceau: propre, cree: Date.now() }, ...sorts]);
  };
  const ouvrir = (s: Sceau, n = '') => { setSceau(s); setNom(n); setMode('composeur'); };
  const vueMode: Mode = mj ? mode : 'libre';

  return (
    <div className="atelier-racine magie-page">
      <header className="top">
        <div className="marque">
          <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M20 9 L28 25 L12 25 Z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="20" cy="20" r="1.8" fill="currentColor" /></svg>
          <div><h1>Atelier de tracé</h1><span className="tag">{mj ? 'Maître du jeu' : 'Table de tracé'}</span></div>
        </div>
        {mj && (
          <nav className="modes" aria-label="Modes de l'Atelier">
            <button className={vueMode === 'libre' ? 'on' : ''} onClick={() => setMode('libre')}>Tracé libre<small>table</small></button>
            <button className={vueMode === 'composeur' ? 'on' : ''} onClick={() => setMode('composeur')}>Composeur<small>préparation</small></button>
            <button className={vueMode === 'grimoire' ? 'on' : ''} onClick={() => setMode('grimoire')}>Grimoire<small>{sorts.length} sorts</small></button>
            <button className={vueMode === 'personnages' ? 'on' : ''} onClick={() => setMode('personnages')}>Magie des PJ<small>{profils.length} PJ</small></button>
          </nav>
        )}
        <label className="choix-pj" style={profil ? { ['--pj' as string]: profil.couleur } : undefined}>
          <span className="tag">Personnage à la table</span>
          <select value={actifId ?? ''} onChange={(e) => setActifId(e.target.value || null)} aria-label="Personnage à la table">
            <option value="">Sans personnage</option>
            {profils.map((p) => <option key={p.id} value={p.id}>{p.nom}{p.joueur ? ` (${p.joueur})` : ''}</option>)}
          </select>
        </label>
      </header>

      <main>
        {profils.length === 0 && vueMode === 'libre' && (
          <p className="muted magie-astuce">Astuce : crée des personnages joueurs dans « Personnages » pour leur donner des signes connus et un grimoire.</p>
        )}
        {vueMode === 'libre' && <Freehand mj={mj} profil={profil} majProfil={majProfil} onOuvrir={(s) => ouvrir(s)} onSave={enregistrer} />}
        {vueMode === 'composeur' && <Composer sceau={sceau} setSceau={setSceau} mj={mj} nom={nom} setNom={setNom} onSave={(n, notes) => enregistrer(n, notes, sceau)} />}
        {vueMode === 'grimoire' && <Grimoire sorts={sorts} setSorts={setSorts} onOuvrir={(s) => ouvrir(s.sceau, s.nom)} profils={profils} setProfils={setProfils} />}
        {vueMode === 'personnages' && <Profils profils={profils} setProfils={setProfils} actif={actifId} setActif={setActifId} />}
      </main>
    </div>
  );
}
