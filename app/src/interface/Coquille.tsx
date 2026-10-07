// Coquille : en-tête (campagne, rôle, écran joueurs, thème), menu des modules, page courante.
import { Suspense, useEffect, useState } from 'react';
import { ecouter, ouvrirEcranJoueurs, preparerDiffusion } from '../noyau/bus';
import { useCampagne } from './etat';
import { Icone, Toasts } from './composants';
import { BoutonDes } from './des';
import { MODULES, moduleParId } from './registre';

type Theme = 'auto' | 'clair' | 'sombre';
const THEMES: Record<Theme, string> = { auto: 'Thème auto', clair: 'Thème clair', sombre: 'Thème sombre' };
const lireTheme = (): Theme => { try { return (localStorage.getItem('jdr-theme') as Theme) || 'auto'; } catch { return 'auto'; } };

const pageDepuisAdresse = (): string => {
  const id = window.location.hash.slice(1);
  return moduleParId(id) ? id : 'campagne';
};

export function Coquille() {
  const { campagne, role, changerRole, enregistrement, modifier } = useCampagne();
  const [page, setPage] = useState(pageDepuisAdresse);
  const [theme, setTheme] = useState<Theme>(lireTheme);

  useEffect(() => {
    const surHash = () => setPage(pageDepuisAdresse());
    window.addEventListener('hashchange', surHash);
    const stop = ecouter('naviguer', ({ page: p }) => { window.location.hash = p; });
    return () => { window.removeEventListener('hashchange', surHash); stop(); };
  }, []);

  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('jdr-theme', theme); } catch { /* stockage indisponible : sans importance */ }
  }, [theme]);

  useEffect(() => { preparerDiffusion(campagne?.campagne.nom); }, [campagne?.campagne.nom]);

  // À l'ouverture d'une campagne : chaque module peut la mettre à niveau (ex. Magie : grimoire de base, PNJ lanceurs).
  useEffect(() => {
    if (!campagne || role !== 'mj') return;
    modifier((c) => MODULES.reduce((x, m) => (m.preparerCampagne ? m.preparerCampagne(x) : x), c));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campagne?.campagne.id]);

  const courant = moduleParId(page) ?? MODULES[0];
  const sansCampagne = courant.besoinCampagne && !campagne;
  const Page = sansCampagne ? moduleParId('campagne')!.Page : courant.Page;
  const suivant: Theme = theme === 'auto' ? 'clair' : theme === 'clair' ? 'sombre' : 'auto';

  return (
    <div className="coq">
      <header className="coq-entete">
        <span className="coq-marque">JDR Global</span>
        <span className="coq-campagne">
          {campagne ? campagne.campagne.nom : 'Aucune campagne ouverte'}
          {campagne && enregistrement !== 'ok' && (
            <span className="discret"> · {enregistrement === 'en-cours' ? 'enregistrement…' : 'erreur d\'enregistrement'}</span>
          )}
        </span>
        <div className="coq-outils">
          {campagne && role === 'mj' && MODULES.filter((m) => m.enTete).map((m) => { const E = m.enTete!; return <E key={m.id} />; })}
          {role === 'mj' && <BoutonDes />}
          <button
            className={`btn btn-petit ${role === 'joueurs' ? 'btn-mj' : ''}`}
            onClick={() => changerRole(role === 'mj' ? 'joueurs' : 'mj')}
            title="Voir l'application comme les joueurs la verraient"
          >
            {role === 'mj' ? 'Aperçu joueurs' : 'Retour vue MJ'}
          </button>
          <button className="btn btn-petit btn-mj" onClick={() => ouvrirEcranJoueurs()} title="Ouvre une fenêtre à placer sur la télé ou le second écran">
            Écran joueurs
          </button>
          <button className="btn btn-petit" onClick={() => setTheme(suivant)} title={`Passer en ${THEMES[suivant].toLowerCase()}`}>
            {THEMES[theme]}
          </button>
        </div>
      </header>
      {role === 'joueurs' && (
        <div className="coq-bandeau-joueurs">Aperçu joueurs : les secrets du MJ sont retirés et rien n'est modifiable.</div>
      )}
      <nav className="coq-nav" aria-label="Modules">
        {MODULES.filter((m) => m.dansMenu).map((m) => (
          <button
            key={m.id}
            aria-current={m.id === courant.id ? 'page' : undefined}
            disabled={m.besoinCampagne && !campagne}
            onClick={() => { window.location.hash = m.id; }}
          >
            <Icone d={m.icone} />
            {m.nom}
            {m.etat === 'bientot' && <span className="bientot">bientôt</span>}
          </button>
        ))}
      </nav>
      <main className="coq-page">
        <Suspense fallback={<div className="vide">Chargement du module…</div>}>
          <Page />
        </Suspense>
      </main>
      <Toasts />
    </div>
  );
}
