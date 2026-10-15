// Écran d'un joueur : l'arbre de talents de son personnage. Il explore tous ses arbres (zoom, détail de chaque
// talent, ce qui le verrouille) et, si le MJ le permet, dépense lui-même ses points. La demande part au MJ, qui la
// vérifie avec les mêmes règles avant de l'inscrire sur la fiche ; la fiche à jour revient ici.
import { useEffect, useState } from 'react';
import type { Personnage } from '../../../noyau/contrat';
import { dependants, etatTalent, pointsTalent, type ArbreTalents, type NoeudTalent } from '../../../noyau/talents';
import type { PropsVueJoueurs } from '../../../interface/types';
import { texteEffet } from '../fiche/Talents';
import { VueArbreTalents } from '../talents/VueArbreTalents';
import '../personnages.css';

/** Ce que l'écran du joueur reçoit : son personnage (progression seulement), ses arbres, ce que le MJ permet. */
export interface DonneesTalents { perso: Personnage; arbres: ArbreTalents[]; parNiveau: number; droits: { developper: boolean; retirer: boolean } }

export default function Talents({ donnees, envoyer }: PropsVueJoueurs) {
  const d = donnees as unknown as DonneesTalents;
  const { perso: p, arbres, parNiveau } = d;
  const [actif, setActif] = useState(arbres[0]?.id ?? '');
  const [choisi, setChoisi] = useState<NoeudTalent | null>(null);
  const [attente, setAttente] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const acquis = p.fiche?.progression?.talents ?? [];
  const arbre = arbres.find((a) => a.id === actif) ?? arbres[0];
  const pts = pointsTalent(p, parNiveau, arbres);

  // Réponse du MJ : la fiche revient avec (ou sans) le talent demandé.
  const cle = acquis.join(',');
  useEffect(() => { if (attente) { setAttente(null); setMessage(null); } }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!attente) return;
    const t = window.setTimeout(() => { setAttente(null); setMessage('Le maître du jeu n’a pas validé ce choix.'); }, 6000);
    return () => window.clearTimeout(t);
  }, [attente]);

  if (!arbres.length) return <p className="talents-joueur-vide">Ton personnage n’a pas encore d’arbre de talents : il lui faut une classe (le maître du jeu la choisit dans sa fiche).</p>;
  const e = choisi ? etatTalent(p, choisi, parNiveau, arbres) : null;
  const deps = choisi ? dependants(p, choisi.id, arbres) : [];
  const demander = (faire: 'acquerir' | 'retirer', n: NoeudTalent) => { setAttente(n.id); setMessage(null); envoyer({ faire, id: n.id }); };

  return (
    <div className="talents-joueur pile">
      <div className="ligne">
        <strong className={pts.restants > 0 ? 'perso-points' : ''}>Points de talent : {pts.restants} / {pts.total}</strong>
        <span className="discret">({parNiveau} par niveau · {acquis.length} talent{acquis.length > 1 ? 's' : ''} appris)</span>
      </div>
      <div className="ligne">
        {arbres.map((a) => (
          <button key={a.id} className={`btn btn-petit ${a.id === arbre?.id ? 'btn-principal' : ''}`} onClick={() => { setActif(a.id); setChoisi(null); }}>
            {a.nom} ({acquis.filter((t) => t.startsWith(`${a.id}.`)).length})
          </button>
        ))}
      </div>
      {arbre?.texte && <p className="discret" style={{ margin: 0 }}>{arbre.texte}</p>}
      <div className="talents-disposition">
        {arbre && <VueArbreTalents arbre={arbre} choisi={choisi?.id} onChoisir={setChoisi} etat={(n) => etatTalent(p, n, parNiveau, arbres).etat} hauteur={Math.max(380, window.innerHeight - 230)} />}
        <div className="pile">
          {choisi && e ? (
            <div className="carte-ui pile perso-talent-detail" style={{ gap: 6 }}>
              <div className="ligne"><span style={{ fontSize: '1.6rem' }}>{choisi.icone}</span><strong>{choisi.nom}</strong><span className="discret">coût {choisi.cout} · niveau {choisi.niveau}</span></div>
              <p style={{ margin: 0 }}>{choisi.texte}</p>
              {choisi.effets?.length ? <p className="discret" style={{ margin: 0 }}>Effets : {choisi.effets.map((x) => texteEffet(x.cible, x.valeur)).join(', ')}</p> : null}
              {choisi.action ? <p className="perso-points" style={{ margin: 0 }}>⚔ Débloque une action de combat (bouton « Actions » pendant le tour).</p> : null}
          {choisi.passif ? <p className="perso-points" style={{ margin: 0 }}>⚔ Appliqué automatiquement en combat.</p> : null}
          {choisi.magie?.signes?.length ? <p className="discret" style={{ margin: 0 }}>Signes appris : {choisi.magie.signes.join(', ')}</p> : null}
              {e.etat === 'acquis' && <p className="perso-points" style={{ margin: 0 }}>Appris.</p>}
              {e.raison && <p className="perso-erreur" style={{ margin: 0 }}>Verrouillé : {e.raison}</p>}
              {d.droits.developper && e.etat === 'disponible' && (
                <button className="btn btn-principal" disabled={!!attente} onClick={() => window.confirm(`Apprendre « ${choisi.nom} » pour ${choisi.cout} point${choisi.cout > 1 ? 's' : ''} ?`) && demander('acquerir', choisi)}>
                  {attente === choisi.id ? 'Envoyé au maître du jeu…' : `Apprendre (${choisi.cout} pt)`}
                </button>
              )}
              {d.droits.retirer && e.etat === 'acquis' && (
                <button className="btn" disabled={!!attente || deps.length > 0} title={deps.length ? `Requis par ${deps.map((x) => x.nom).join(', ')}` : undefined} onClick={() => demander('retirer', choisi)}>Oublier ce talent</button>
              )}
              {!d.droits.developper && e.etat === 'disponible' && <p className="discret" style={{ margin: 0 }}>Disponible : demande au maître du jeu de te l’accorder.</p>}
            </div>
          ) : (
            <p className="discret">Touche un talent pour le détail. Au centre, le tronc ; chaque branche se divise. En couleur : appris ; qui brille : disponible ; estompé : verrouillé. Pince ou molette : zoom · glisser : déplacer.</p>
          )}
          {message && <p className="perso-erreur">{message}</p>}
        </div>
      </div>
    </div>
  );
}
