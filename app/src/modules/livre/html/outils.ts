// Outils et styles du livre de campagne (pur). Deux sortes de pages :
// - `page` : une feuille A4 fixe (portrait ou paysage) ; le titre et la carte restent ensemble ; avec `ajuster`,
//   le texte rapetisse jusqu'à tenir sur la feuille (script SCRIPT_AJUSTER) ;
// - `flux` : du texte qui coule sur autant de pages qu'il faut (quêtes, chronologie…), blocs insécables.
export const e = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** Texte avec ses retours à la ligne. */
export const texte = (s: unknown): string => e(s).replace(/\n/g, '<br>');
export const ancre = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, '_');

/** Entrée du sommaire (niveau 2 : sous une partie). */
export interface Entree { id: string; titre: string }
export interface Partie { id: string; titre: string; entrees: Entree[]; html: string }

export const page = (contenu: string, o: { paysage?: boolean; ajuster?: boolean; id?: string } = {}): string =>
  `<section class="page${o.paysage ? ' paysage' : ''}${o.ajuster ? ' ajuster' : ''}"${o.id ? ` id="${ancre(o.id)}"` : ''}>${contenu}</section>`;
export const flux = (contenu: string): string => `<section class="flux">${contenu}</section>`;

/** Partie : son titre (avec retour au sommaire) se place en tête de sa première page. */
export function partie(id: string, titre: string, morceaux: string[], entrees: Entree[] = []): Partie {
  const tete = `<h1 class="partie-titre" id="${ancre(id)}">${e(titre)}<a class="retour" href="#sommaire">↑ sommaire</a></h1>`;
  const html = morceaux.join('\n');
  const i = html.indexOf('>', html.indexOf('<section'));
  return { id: ancre(id), titre, entrees: entrees.map((x) => ({ ...x, id: ancre(x.id) })), html: i > 0 ? html.slice(0, i + 1) + tete + html.slice(i + 1) : tete + html };
}

/** Bloc insécable (dans un flux). */
export const bloc = (titre: string, corps: string, id?: string): string =>
  `<article class="bloc"${id ? ` id="${ancre(id)}"` : ''}>${titre ? `<h2>${e(titre)}</h2>` : ''}${corps}</article>`;

export const champ = (libelle: string, valeur: unknown): string =>
  valeur === undefined || valeur === null || String(valeur).trim() === '' ? '' : `<p class="champ"><b>${e(libelle)} :</b> ${texte(valeur)}</p>`;
export const liste = (l: unknown[]): string => (l.length ? `<ul>${l.map((x) => `<li>${texte(x)}</li>`).join('')}</ul>` : '');
export const secret = (s: unknown): string => (s && String(s).trim() ? `<div class="secret"><b>MJ :</b> ${texte(s)}</div>` : '');
/** Image qui occupe la place restante de la feuille (ou une hauteur fixe), sans jamais déborder. */
export const visuel = (url: string | undefined, hauteur?: string): string =>
  (url ? `<div class="visuel"${hauteur ? ` style="flex:none;height:${hauteur}"` : ''}><img src="${url}" alt=""></div>` : '');
/** Dessin vectoriel qui occupe la place restante de la feuille. */
export const dessin = (svg: string): string => `<div class="visuel">${svg.replace(/style="[^"]*"/, 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"')}</div>`;

/** Rapetisse le texte des feuilles « ajuster » jusqu'à ce qu'il tienne (au plus jusqu'à 55 %). */
export const SCRIPT_AJUSTER = `
for (const el of document.querySelectorAll('.ajuster')) {
  let f = 100;
  while (el.scrollHeight > el.clientHeight + 1 && f > 55) { f -= 4; el.style.fontSize = f + '%'; }
  if (el.scrollHeight > el.clientHeight + 1) el.classList.add('coupe');
}`;

export const STYLE_LIVRE = `
@page { size: A4; margin: 12mm; }
@page paysage { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
html { font-size: 10.5pt; }
body { margin: 0; font: 1rem/1.4 Georgia, 'Times New Roman', serif; color: #1f1a14; background: #fff; }
h1, h2, h3, h4 { font-family: 'Palatino Linotype', Palatino, Georgia, serif; color: #4a3218; }
a { color: inherit; }
/* Feuilles fixes */
.page { width: 186mm; height: 272mm; overflow: hidden; break-after: page; display: flex; flex-direction: column; gap: 2mm; font-size: 1em; position: relative; }
.page.paysage { page: paysage; width: 277mm; height: 189mm; }
.page.coupe::after { content: '… (suite trop longue pour la page)'; position: absolute; right: 0; bottom: 0; background: #fff; font-size: 8pt; color: #8a7a66; }
.flux { break-before: page; }
.flux + .flux, .page + .flux { break-before: page; }
.partie-titre { font-size: 2.1em; border-bottom: 3px double #8a6a4a; margin: 0 0 2mm; padding-bottom: 1mm; display: flex; justify-content: space-between; align-items: baseline; flex: none; }
.retour { font: 0.38em Georgia, serif; color: #8a7a66; text-decoration: none; }
.page > h2, .bloc > h2 { font-size: 1.45em; margin: 0 0 1mm; border-bottom: 1px solid #c8b08a; flex: none; }
.sous { color: #6a5a4a; margin: 0 0 1mm; flex: none; }
h3 { font-size: 1.1em; margin: 2mm 0 0.5mm; }
p { margin: 0.6mm 0; }
.champ { margin: 0.4mm 0; }
ul { margin: 0.5mm 0 1.5mm; padding-left: 4mm; }
.secret { border-left: 3px solid #8e2b2b; background: #f6ecea; padding: 1mm 2mm; margin: 1mm 0; font-size: 0.9em; }
.discret { color: #6a5a4a; font-size: 0.85em; }
.cols2 { columns: 2; column-gap: 6mm; }
.cols3 { columns: 3; column-gap: 5mm; }
.cols2 > *, .cols3 > * { break-inside: avoid; }
.visuel { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
.visuel img { max-width: 100%; max-height: 100%; object-fit: contain; border: 1px solid #c8b08a; }
.visuel svg { max-width: 100%; max-height: 100%; }
.bloc { break-inside: avoid; margin: 0 0 4mm; }
table.tab { width: 100%; border-collapse: collapse; font-size: 0.92em; }
table.tab td, table.tab th { border-bottom: 1px solid #ddd0b8; padding: 0.5mm 1mm; text-align: left; vertical-align: top; }
/* Lieux rangés par catégorie */
.lieux h4 { margin: 1.5mm 0 0.5mm; font-size: 0.95em; color: #6a3e14; text-transform: uppercase; letter-spacing: .05em; }
.lieux .noms { margin: 0; font-size: 0.92em; }
.lieux .lieu { margin: 0 0 0.6mm; font-size: 0.9em; break-inside: avoid; }
.lieux .danger { color: #8e2b2b; }
/* Couverture et sommaire */
.couverture { justify-content: center; align-items: center; text-align: center; border: 3px double #8a6a4a; padding: 20mm; }
.couverture h1 { font-size: 3.2em; margin: 0 0 8mm; }
.couverture p { font-size: 1.25em; margin: 2mm 0; }
#sommaire h2 { font-size: 1.8em; }
.sommaire > li { margin: 2mm 0; font-size: 1.15em; break-inside: avoid; }
.sommaire > li > a { font-weight: 700; text-decoration: none; }
.sommaire ol { font-size: 0.82em; columns: 2; column-gap: 8mm; margin-top: 1mm; }
.sommaire ol a { text-decoration: none; }
/* Calendriers */
.cal-annee { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm 3mm; }
.cal-mois { break-inside: avoid; }
.cal-mois h4 { margin: 0.5mm 0; font-size: 0.85em; }
.cal-mois table { width: 100%; border-collapse: collapse; font-size: 0.66em; table-layout: fixed; }
.cal-mois th { color: #6a5a4a; font-weight: normal; }
.cal-mois td { border: 1px solid #e2d6c0; text-align: center; height: 3.6mm; padding: 0; }
.cal-mois td.fete { background: #f3e2b8; font-weight: 700; }
.cal-mois td.auj { outline: 2px solid #8a5a1a; }
.cal-mois ul { font-size: 0.62em; margin: 0.5mm 0 0; padding-left: 3mm; }
/* Personnages : 4 par feuille */
.grille-pnj { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4mm; flex: 1; min-height: 0; }
.carte-pnj { border: 1px solid #b9a586; border-radius: 3mm; padding: 3mm; overflow: hidden; display: flex; flex-direction: column; gap: 1mm; font-size: 0.92em; }
.carte-pnj .tete { display: flex; gap: 3mm; align-items: center; }
.carte-pnj img { width: 22mm; height: 22mm; border-radius: 50%; object-fit: cover; border: 1px solid #8a6a4a; flex: none; }
.carte-pnj h3 { margin: 0; font-size: 1.3em; }
.carte-pnj .stats { display: flex; flex-wrap: wrap; gap: 1mm 3mm; font-size: 0.9em; border-top: 1px solid #ddd0b8; border-bottom: 1px solid #ddd0b8; padding: 0.8mm 0; }
.talents-liste p { margin: 0 0 1mm; font-size: 0.9em; }
@media screen {
  body { background: #e8e0d0; padding: 6mm 0; }
  .page, .flux { margin: 0 auto 6mm; background: #fff; box-shadow: 0 0 10px rgb(0 0 0 / .25); padding: 0; outline: 12mm solid #fff; }
  .page.paysage { outline-width: 10mm; }
  .flux { width: 186mm; }
}
`;
