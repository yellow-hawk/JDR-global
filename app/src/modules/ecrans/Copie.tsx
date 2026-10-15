// Copie fidèle d'un écran joueurs : un cadre de la vraie taille de l'écran (l × h), réduit pour tenir dans le mur.
// La copie regarde sans agir (mode miroir) ; toutes les 4 s, la mise en page est contrôlée.
import { useEffect, useRef, useState } from 'react';
import { demanderDonneesPrivees, etatEcranJoueurs, suivreDiffusion, suivrePrive } from '../../noyau/bus';
import { boitesDuDocument, problemes, type Probleme } from '../../interface/miseEnPage';

/** `jeton` : copie de l'écran d'un joueur à distance (ses onglets) ; absent : écran de la table. */
interface Props { url: string; jeton?: string; l: number; h: number; largeur: number; hauteurMax?: number; titre: string; sousTitre?: string; onglet?: string }

export function Copie({ url, jeton, l, h, largeur, hauteurMax = 520, titre, sousTitre, onglet }: Props) {
  const cadre = useRef<HTMLIFrameElement>(null);
  const [constats, setConstats] = useState<Probleme[] | null>(null);
  const k = Math.min(largeur / l, hauteurMax / h);

  const suivreOnglet = () => { if (onglet) cadre.current?.contentWindow?.postMessage({ type: 'jdr-miroir', onglet }, location.origin); };
  useEffect(suivreOnglet, [onglet]); // eslint-disable-line react-hooks/exhaustive-deps
  // La copie ne se connecte pas au serveur : la page lui passe ce qui part vers les écrans (et vers ce joueur).
  useEffect(() => {
    const vers = (m: Record<string, unknown>) => cadre.current?.contentWindow?.postMessage({ type: 'jdr-miroir-msg', m }, location.origin);
    const pret = (e: MessageEvent) => {
      if (e.source !== cadre.current?.contentWindow || e.data?.type !== 'jdr-miroir-pret') return;
      etatEcranJoueurs().forEach(vers);
      if (jeton) demanderDonneesPrivees(jeton);
      window.setTimeout(suivreOnglet, 300);
    };
    window.addEventListener('message', pret);
    const a = suivreDiffusion(vers);
    const b = suivrePrive((j, m) => { if (j === jeton) vers(m); });
    return () => { window.removeEventListener('message', pret); a(); b(); };
  }, [jeton]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const controler = () => {
      try {
        const doc = cadre.current?.contentDocument;
        if (!doc?.body || !doc.querySelector('.ecran, .ecran-refuse')) return;
        const { boites, vue } = boitesDuDocument(doc);
        setConstats(problemes(boites, vue));
      } catch { setConstats(null); }
    };
    const t = window.setInterval(controler, 4000);
    return () => window.clearInterval(t);
  }, [url, l, h]);

  return (
    <figure className="copie">
      <figcaption>
        <b>{titre}</b>{sousTitre && <span className="discret"> · {sousTitre}</span>}
        <span className="discret"> · {l} × {h}</span>
      </figcaption>
      <div className="copie-cadre" style={{ width: Math.round(l * k), height: Math.round(h * k) }}>
        <iframe ref={cadre} src={url} title={`Copie : ${titre}`} style={{ width: l, height: h, transform: `scale(${k})` }} tabIndex={-1} />
      </div>
      <div className="copie-constats">
        {constats === null ? <span className="discret">Contrôle de la mise en page…</span>
          : constats.length === 0 ? <span className="copie-ok">✔ Mise en page correcte</span>
          : constats.map((p, i) => <span key={i} className={`copie-${p.gravite}`}>{p.gravite === 'erreur' ? '✘' : '⚠'} {p.texte}</span>)}
      </div>
    </figure>
  );
}
