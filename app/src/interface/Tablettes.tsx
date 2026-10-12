// Invitation d'une tablette (ou d'un autre ordinateur) comme écran joueurs, par le relais du serveur local :
// code du salon, adresse et QR code à scanner, nombre d'appareils connectés.
import { useEffect, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { activerReseau, desactiverReseau, infosRelais, salonReseau, suivreAppareils } from '../noyau/bus';

const CLE = 'jdr-salon';
const lireSalon = (): string | null => { try { return localStorage.getItem(CLE); } catch { return null; } };
const ecrireSalon = (s: string | null) => { try { if (s) localStorage.setItem(CLE, s); else localStorage.removeItem(CLE); } catch { /* navigation privée */ } };
const nouveauSalon = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

/** Au démarrage : rouvre le salon de la dernière fois si le serveur sait relayer. */
export async function rouvrirSalon(): Promise<void> {
  const s = lireSalon();
  if (s && (await infosRelais())) activerReseau(s);
}

function QR({ texte }: { texte: string }) {
  const q = qrcode(0, 'M');
  q.addData(texte);
  q.make();
  return <span className="coq-qr" dangerouslySetInnerHTML={{ __html: q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) }} />;
}

export function Tablettes() {
  const [ouvert, setOuvert] = useState(false);
  const [infos, setInfos] = useState<{ adresses: string[]; port: number } | null | undefined>(undefined);
  const [salon, setSalon] = useState<string | null>(salonReseau());
  const [n, setN] = useState(0);
  const boite = useRef<HTMLSpanElement>(null);
  // Le salon peut s'ouvrir ou se fermer ailleurs (réouverture au démarrage) : on suit les deux.
  useEffect(() => suivreAppareils((x) => { setN(x); setSalon(salonReseau()); }), []);
  useEffect(() => { if (ouvert) void infosRelais().then(setInfos); }, [ouvert]);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (ev: PointerEvent) => { if (!boite.current?.contains(ev.target as Node)) setOuvert(false); };
    window.addEventListener('pointerdown', clic);
    return () => window.removeEventListener('pointerdown', clic);
  }, [ouvert]);

  const ouvrir = () => { const s = salon ?? lireSalon() ?? nouveauSalon(); activerReseau(s); ecrireSalon(s); setSalon(s); };
  const fermer = () => { desactiverReseau(); ecrireSalon(null); setSalon(null); };
  const adresse = infos && salon ? `http://${infos.adresses[0] ?? 'localhost'}:${infos.port || location.port}/?ecran=joueurs&salon=${salon}` : '';

  return (
    <span className="coq-ecran" ref={boite}>
      <button className="btn btn-petit" title="Écran joueurs sur une tablette ou un autre appareil du même réseau" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
        📱{salon ? ` ${n}` : ''}
      </button>
      {ouvert && (
        <span className="coq-ecran-reglage carte-ui">
          <strong>Tablettes et autres appareils</strong>
          {infos === undefined && <span className="discret">Recherche du relais…</span>}
          {infos === null && (
            <span className="discret">
              Le relais réseau n’est pas disponible ici. Lance JDR Global avec <b>lancer.bat</b> (Node.js installé) sur l’ordinateur du MJ,
              puis connecte la tablette au même Wi-Fi. Sans relais, l’écran joueurs fonctionne sur cet ordinateur (télé, second écran, écran tactile branché).
            </span>
          )}
          {infos && !salon && (
            <>
              <span className="discret">Ouvre un salon : la tablette affiche l’écran joueurs et les joueurs peuvent y tracer, viser, zoomer.</span>
              <button className="btn btn-petit btn-mj" onClick={ouvrir}>Ouvrir le salon</button>
            </>
          )}
          {infos && salon && (
            <>
              <span>Salon <b className="coq-salon">{salon}</b> · {n} appareil{n > 1 ? 's' : ''} connecté{n > 1 ? 's' : ''}</span>
              <QR texte={adresse} />
              <code className="coq-adresse">{adresse}</code>
              <span className="discret">Scanne le code avec la tablette (même Wi-Fi), puis « Plein écran ». La première fois, Windows peut demander d’autoriser Node.js dans le pare-feu : accepte pour les réseaux privés.</span>
              <span className="ligne">
                <button className="btn btn-petit" onClick={() => void navigator.clipboard?.writeText(adresse)}>Copier l’adresse</button>
                <button className="btn btn-petit" onClick={fermer}>Fermer le salon</button>
              </span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
