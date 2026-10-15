// Page Joueurs (MJ) : accès à distance (tunnel Cloudflare du serveur local), et pour chaque PJ son lien personnel,
// s'il est connecté, ses messages privés et les notes qu'il écrit. L'écran de table (tablette) reste sur 📱.
import { useEffect, useState } from 'react';
import { commanderTunnel, emettre, infosRelais, salonReseau, suivreJoueursConnectes, type InfosRelais } from '../../noyau/bus';
import { ajouterFichier, choisirFichier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { useUrlFichier } from '../../interface/composants';
import { assurerSalon } from '../../interface/Tablettes';
import { ajouterMessage, avecDroitsEntrainement, avecEntrainement, avecJeton, distantsDe, droitsEntrainement, entrainementActif, lienJoueur, marquerLusMj, nonLusMj, notesJoueur, retirerMessage, type MessagePrive } from './logique';
import './joueurs.css';

function Vignette({ idCampagne, image }: { idCampagne: string; image?: string | null }) {
  const url = useUrlFichier(idCampagne, image ?? null);
  return url ? <img className="joueurs-vignette" src={url} alt="" /> : null;
}

export function Page() {
  const { campagne, role, modifier } = useCampagne();
  const c = campagne!;
  const [infos, setInfos] = useState<InfosRelais | null | undefined>(undefined);
  const [salon, setSalon] = useState<string | null>(salonReseau());
  const [connectes, setConnectes] = useState<Set<string>>(new Set());
  const [brouillons, setBrouillons] = useState<Record<string, string>>({});
  const [image, setImage] = useState<Record<string, string | null>>({});
  const [tous, setTous] = useState('');

  // État du relais et du tunnel, rafraîchi tant que la page est ouverte.
  useEffect(() => {
    let fini = false;
    const lire = async () => { const i = await infosRelais(); if (!fini) { setInfos(i); if (i) setSalon(await assurerSalon()); } };
    void lire();
    const t = window.setInterval(lire, 2000);
    return () => { fini = true; window.clearInterval(t); };
  }, []);
  useEffect(() => suivreJoueursConnectes(setConnectes), []);
  // Messages des joueurs : vus dès qu'ils s'affichent ici.
  const aLire = c.personnages.filter((p) => nonLusMj(distantsDe(c)[p.id])).map((p) => p.id).join(',');
  useEffect(() => { if (aLire && role === 'mj') modifier((x) => aLire.split(',').reduce(marquerLusMj, x)); }, [aLire, role, modifier]);

  if (role !== 'mj') return <div className="vide">Cette page est réservée au MJ.</div>;
  const distants = distantsDe(c);
  const pjs = c.personnages.filter((p) => p.sorte === 'pj');
  const tunnel = infos?.tunnel;
  const base = tunnel?.etat === 'actif' && tunnel.adresse ? tunnel.adresse : infos ? `http://${infos.adresses[0] ?? 'localhost'}:${infos.port}` : '';
  const copier = (t: string) => { void navigator.clipboard?.writeText(t); emettre('message', { texte: 'Lien copié.', sorte: 'succes' }); };
  const envoyer = (persoId: string) => {
    const texte = (brouillons[persoId] ?? '').trim();
    if (!texte && !image[persoId]) return;
    modifier((x) => ajouterMessage(avecJeton(x, persoId), persoId, texte, image[persoId] ?? null));
    setBrouillons((b) => ({ ...b, [persoId]: '' })); setImage((i) => ({ ...i, [persoId]: null }));
  };
  const joindre = async (persoId: string) => {
    const f = await choisirFichier('image/png,image/jpeg,image/webp');
    if (!f) return;
    const fichier = await ajouterFichier(c.campagne.id, f[0], f[0].name);
    modifier((x) => ({ ...x, fichiers: [...x.fichiers, fichier] }));
    setImage((i) => ({ ...i, [persoId]: fichier.id }));
  };

  return (
    <div className="joueurs-page pile">
      <section className="carte-ui pile">
        <h1 style={{ margin: 0 }}>Joueurs</h1>
        <p className="discret" style={{ margin: 0 }}>Chaque joueur reçoit un lien personnel : l’écran de la table, sa fiche (en lecture, avec ses notes) et les messages que tu lui envoies à lui seul. L’écran posé sur la table (tablette) reste sur 📱 en haut.</p>
        {infos === undefined && <p className="discret">Recherche du serveur…</p>}
        {infos === null && <p className="joueurs-alerte">Le relais n’est pas disponible ici : lance JDR Global avec <b>lancer.bat</b> (Node.js installé) sur ton ordinateur, puis ouvre l’application à l’adresse qu’il affiche.</p>}
        {infos && (
          <div className="joueurs-tunnel">
            <strong>Accès par Internet</strong>
            {tunnel?.etat === 'actif' && <span>Ouvert : <code>{tunnel.adresse}</code></span>}
            {tunnel?.etat === 'demarrage' && <span className="discret">Ouverture en cours (une dizaine de secondes)…</span>}
            {(!tunnel || tunnel.etat === 'arrete' || tunnel.etat === 'erreur') && <span className="discret">{tunnel?.erreur ? `Erreur : ${tunnel.erreur}. ` : ''}Fermé : les liens ne marchent que sur ton réseau local.</span>}
            {tunnel?.etat === 'absent' && (
              <span className="joueurs-alerte">
                cloudflared n’est pas installé. Ouvre un terminal et tape <code>winget install --id Cloudflare.cloudflared</code>, puis réessaie (gratuit, sans compte).
              </span>
            )}
            {infos.local === false ? <span className="discret">Le tunnel se commande depuis l’ordinateur du MJ.</span>
              : tunnel?.etat === 'actif' || tunnel?.etat === 'demarrage'
                ? <button className="btn btn-petit" onClick={() => void commanderTunnel('arreter').then(() => infosRelais().then(setInfos))}>Fermer l’accès Internet</button>
                : <button className="btn btn-petit btn-mj" onClick={() => void commanderTunnel('demarrer').then(() => infosRelais().then(setInfos))}>Ouvrir l’accès Internet</button>}
            <span className="discret">L’adresse change à chaque ouverture : renvoie les liens aux joueurs à chaque séance. Ferme l’accès à la fin de la séance.</span>
          </div>
        )}
      </section>

      {pjs.length > 0 && (
        <section className="carte-ui pile">
          <strong>Zone d’entraînement à la magie</strong>
          <p className="discret" style={{ margin: 0 }}>Les joueurs dont le personnage trace des sorts ont un onglet « Entraînement » : tracé libre avec lecture et effet 3D, leçons, défis chronométrés sur les sorts de leur grimoire, calibrage de leur main. Records et calibrage sont toujours gardés.</p>
          <label className="ligne"><input type="checkbox" checked={droitsEntrainement(c).lecons} onChange={(e) => modifier((x) => avecDroitsEntrainement(x, { lecons: e.target.checked }))} /> Une leçon réussie apprend son signe au personnage</label>
          <label className="ligne"><input type="checkbox" checked={droitsEntrainement(c).grimoire} onChange={(e) => modifier((x) => avecDroitsEntrainement(x, { grimoire: e.target.checked }))} /> Les joueurs peuvent inscrire ou retirer des sorts de leur grimoire</label>
        </section>
      )}
      {pjs.length === 0 && <div className="vide">Aucun personnage joueur dans la campagne.</div>}
      {pjs.length > 1 && (
        <section className="carte-ui pile">
          <strong>Message à tous les joueurs à distance</strong>
          <div className="ligne">
            <input value={tous} onChange={(e) => setTous(e.target.value)} placeholder="La séance commence dans 5 minutes !" style={{ flex: 1 }} />
            <button className="btn btn-mj" disabled={!tous.trim()} onClick={() => { modifier((x) => pjs.reduce((y, p) => ajouterMessage(avecJeton(y, p.id), p.id, tous.trim()), x)); setTous(''); }}>Envoyer à tous</button>
          </div>
        </section>
      )}
      <div className="joueurs-grille">
        {pjs.map((p) => {
          const d = distants[p.id];
          const lien = d && salon && base ? lienJoueur(base, salon, d.jeton) : '';
          const en = d ? connectes.has(d.jeton) : false;
          const recus = d ? d.messages.filter((m) => m.de === 'joueur').length : 0;
          return (
            <section key={p.id} className="carte-ui pile joueurs-carte">
              <div className="ligne">
                <strong style={{ flex: 1 }}>{p.nom}{p.joueur ? <span className="discret"> · {p.joueur}</span> : null}</strong>
                <span className={en ? 'joueurs-en-ligne' : 'discret'}>{en ? '● connecté' : '○ hors ligne'}</span>
              </div>
              {!d ? (
                <button className="btn btn-mj" onClick={() => modifier((x) => avecJeton(x, p.id))}>Créer son lien personnel</button>
              ) : (
                <>
                  {lien ? <code className="joueurs-lien">{lien}</code> : <span className="discret">Lien disponible quand le relais est ouvert.</span>}
                  <div className="ligne">
                    <button className="btn btn-petit" disabled={!lien} onClick={() => copier(lien)}>Copier le lien</button>
                    <button className="btn btn-petit" title="L’ancien lien ne marchera plus" onClick={() => window.confirm(`Changer le lien de ${p.nom} ? L’ancien ne marchera plus.`) && modifier((x) => avecJeton(x, p.id, true))}>Nouveau lien</button>
                  </div>
                  <details open={recus > 0}>
                    <summary>Messages privés ({d.messages.length}{recus ? `, dont ${recus} de ${p.joueur || p.nom}` : ''})</summary>
                    <div className="joueurs-messages">
                      {[...d.messages].reverse().map((m: MessagePrive) => (
                        <div key={m.id} className={`joueurs-message ${m.de === 'joueur' ? 'du-joueur' : ''}`}>
                          <span className="discret">{m.de === 'joueur' ? `${p.joueur || p.nom} → toi` : `Toi → ${p.nom}`} · {new Date(m.quand).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          {m.texte && <p>{m.texte}</p>}
                          <Vignette idCampagne={c.campagne.id} image={m.image} />
                          <button className="combat-oeil" title="Retirer ce message" onClick={() => modifier((x) => retirerMessage(x, p.id, m.id))}>×</button>
                        </div>
                      ))}
                    </div>
                  </details>
                  <textarea rows={2} placeholder={`Message pour ${p.nom} seulement (indice, secret, vision…)`} value={brouillons[p.id] ?? ''} onChange={(e) => setBrouillons((b) => ({ ...b, [p.id]: e.target.value }))} />
                  <div className="ligne">
                    <button className="btn btn-petit" onClick={() => void joindre(p.id)}>{image[p.id] ? 'Image jointe ✓' : 'Joindre une image'}</button>
                    <span style={{ flex: 1 }} />
                    <button className="btn btn-petit btn-mj" disabled={!(brouillons[p.id] ?? '').trim() && !image[p.id]} onClick={() => envoyer(p.id)}>Envoyer à {p.nom}</button>
                  </div>
                  <label className="ligne discret"><input type="checkbox" checked={entrainementActif(c, p)} onChange={(e) => modifier((x) => avecEntrainement(x, p.id, e.target.checked))} /> Zone d’entraînement à la magie</label>
                  {notesJoueur(p) && <details><summary>Ses notes</summary><p className="joueurs-notes">{notesJoueur(p)}</p></details>}
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
