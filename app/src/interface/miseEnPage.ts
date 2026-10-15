// Contrôle de mise en page d'un écran joueurs (mur des écrans) : page qui défile de travers, éléments coupés hors
// de l'écran, éléments fixes qui se recouvrent, boutons ou textes trop petits sur téléphone.
// `problemes` est pur (testé) ; `boitesDuDocument` lit les boîtes d'un document (copie de l'écran dans un cadre).

export interface Boite {
  nom: string;
  x: number; y: number; l: number; h: number;
  /** Position fixe (bandeaux, boutons flottants) : ne défile jamais. */
  fixe: boolean;
  /** Dans une zone qui défile en hauteur (panneau, liste) : le bas n'est pas contrôlé. */
  defile: boolean;
  /** Dans une zone qui coupe exprès en largeur (carte zoomée, cadre) : la largeur n'est pas contrôlée. */
  coupeX?: boolean;
  /** Dans une zone qui défile sur le côté : hors de l'écran, il faut faire défiler (alerte). */
  defileX?: boolean;
  /** Bouton, lien, champ. */
  interactif: boolean;
  /** Taille du texte (px), si l'élément porte du texte. */
  police?: number;
  /** Bouton recouvert par un autre élément (pas un grand panneau voulu) : son nom. */
  cachePar?: string;
}
export interface Vue { l: number; h: number; largeurPage: number; hauteurPage: number }
export interface Probleme { gravite: 'erreur' | 'alerte'; texte: string }

const couvre = (a: Boite, b: Boite): number => {
  const l = Math.min(a.x + a.l, b.x + b.l) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return l > 0 && h > 0 ? (l * h) / Math.min(a.l * a.h, b.l * b.h) : 0;
};

export function problemes(boites: Boite[], v: Vue): Probleme[] {
  const res: Probleme[] = [];
  if (v.largeurPage > v.l + 1) res.push({ gravite: 'erreur', texte: `La page défile de travers : ${v.largeurPage - v.l} px de trop en largeur.` });
  const defileEnHauteur = v.hauteurPage > v.h + 1;
  const deCote = (b: Boite) => !b.coupeX && (b.x + b.l > v.l + 4 || b.x < -4);
  const caches = boites.filter((b) => b.defileX && deCote(b));
  const coupes = boites.filter((b) => b.l > 0 && b.h > 0 && ((!b.defileX && deCote(b)) || (!b.defile && (b.fixe || !defileEnHauteur) && b.y + b.h > v.h + 4)));
  if (caches.length) res.push({ gravite: 'alerte', texte: `${caches.length} élément${caches.length > 1 ? 's' : ''} à faire défiler sur le côté pour les voir : ${caches.slice(0, 3).map((b) => b.nom).join(', ')}.` });
  for (const b of coupes.slice(0, 4)) res.push({ gravite: 'erreur', texte: `Coupé hors de l’écran : ${b.nom} (${Math.round(Math.max(b.x + b.l - v.l, b.y + b.h - v.h, -b.x))} px).` });
  if (coupes.length > 4) res.push({ gravite: 'erreur', texte: `… et ${coupes.length - 4} autres éléments coupés.` });
  // Éléments fixes qui se cachent l'un l'autre (hors grands fonds qui couvrent tout l'écran).
  const fixes = boites.filter((b) => b.fixe && b.interactif && b.l * b.h < v.l * v.h * 0.4);
  for (let i = 0; i < fixes.length; i++) for (let j = i + 1; j < fixes.length; j++) {
    if (couvre(fixes[i], fixes[j]) > 0.3) res.push({ gravite: 'alerte', texte: `${fixes[i].nom} recouvre ${fixes[j].nom}.` });
  }
  const caches2 = boites.filter((b) => b.cachePar);
  for (const b of caches2.slice(0, 3)) res.push({ gravite: 'erreur', texte: `${b.nom} est caché sous ${b.cachePar}.` });
  if (caches2.length > 3) res.push({ gravite: 'erreur', texte: `… et ${caches2.length - 3} autres boutons cachés.` });
  if (v.l < 700) {
    const petits = boites.filter((b) => b.interactif && !b.defile && (b.h < 26 || b.l < 26));
    if (petits.length) res.push({ gravite: 'alerte', texte: `${petits.length} bouton${petits.length > 1 ? 's' : ''} difficile${petits.length > 1 ? 's' : ''} à toucher au doigt (moins de 26 px) : ${petits.slice(0, 3).map((b) => b.nom).join(', ')}…` });
    const textes = boites.filter((b) => b.police !== undefined && b.police < 11);
    if (textes.length) res.push({ gravite: 'alerte', texte: `${textes.length} texte${textes.length > 1 ? 's' : ''} trop petit${textes.length > 1 ? 's' : ''} pour un téléphone (moins de 11 px).` });
  }
  return res;
}

/* ---------- lecture d'un document réel ---------- */

const IGNORES = '.ecran-zoom-contenu, .graphe-svg, svg, canvas, .des3d, .atelier-racine canvas, script, style';

function nomDe(e: Element): string {
  const classe = typeof e.className === 'string' ? e.className.split(/\s+/).filter(Boolean)[0] : '';
  const texte = (e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
  return `${e.tagName.toLowerCase()}${classe ? `.${classe}` : ''}${texte ? ` « ${texte} »` : ''}`;
}

/** Boîtes visibles d'un document (au plus 2500 éléments) et taille de sa vue. */
export function boitesDuDocument(doc: Document): { boites: Boite[]; vue: Vue } {
  const win = doc.defaultView!;
  const vue: Vue = { l: win.innerWidth, h: win.innerHeight, largeurPage: doc.documentElement.scrollWidth, hauteurPage: doc.documentElement.scrollHeight };
  const boites: Boite[] = [];
  // Ancêtres qui défilent en hauteur, ou qui coupent exprès en largeur (mémorisé par élément).
  // [défile en hauteur, coupe en largeur, dans une couche fixe] pour les descendants de l'élément.
  const memo = new Map<Element, [boolean, boolean, boolean, boolean]>();
  const zone = (e: Element | null): [boolean, boolean, boolean, boolean] => {
    if (!e || e === doc.body || e === doc.documentElement) return [false, false, false, false];
    if (memo.has(e)) return memo.get(e)!;
    const s = win.getComputedStyle(e), p = zone(e.parentElement);
    const r: [boolean, boolean, boolean, boolean] = [p[0] || /(auto|scroll|hidden|clip)/.test(s.overflowY), p[1] || /(hidden|clip)/.test(s.overflowX) || s.transform !== 'none', p[2] || s.position === 'fixed', p[3] || /(auto|scroll)/.test(s.overflowX)];
    memo.set(e, r);
    return r;
  };
  for (const e of [...doc.body.querySelectorAll('*')].slice(0, 2500)) {
    if (e.closest(IGNORES)) continue;
    const s = win.getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05 || s.pointerEvents === 'none' && s.position === 'fixed') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const aTexte = [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
    // Bouton visible à l'écran : qui est vraiment dessus en son centre ? (un grand panneau voulu ne compte pas)
    let cachePar: string | undefined;
    if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && r.left >= 0 && r.top >= 0 && r.right <= vue.l && r.bottom <= vue.h) {
      const dessus = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (dessus && !e.contains(dessus) && !dessus.contains(e)) {
        let grand: Element | null = dessus;
        while (grand && grand !== doc.body) { const g = grand.getBoundingClientRect(); if (g.width * g.height > vue.l * vue.h * 0.5) break; grand = grand.parentElement; }
        if (!grand || grand === doc.body) { let haut: Element = dessus; while (haut.parentElement && haut.parentElement !== doc.body && win.getComputedStyle(haut).position !== 'fixed') haut = haut.parentElement; cachePar = nomDe(haut); }
      }
    }
    boites.push({
      nom: nomDe(e), x: r.left, y: r.top, l: r.width, h: r.height,
      fixe: s.position === 'fixed' || zone(e.parentElement)[2], defile: zone(e.parentElement)[0], coupeX: zone(e.parentElement)[1], defileX: zone(e.parentElement)[3],
      interactif: /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.tagName),
      ...(aTexte ? { police: parseFloat(s.fontSize) } : {}),
      ...(cachePar ? { cachePar } : {}),
    });
  }
  return { boites, vue };
}
