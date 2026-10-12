// Outils et styles du livre de campagne (pur) : échappement, titres de section, mise en page A4 pour l'impression.
export const e = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** Texte avec ses retours à la ligne. */
export const texte = (s: unknown): string => e(s).replace(/\n/g, '<br>');
export const ancre = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, '_');

/** Partie du livre : grand titre qui commence une page, entrée du sommaire. */
export interface Partie { id: string; titre: string; html: string }
export const partie = (id: string, titre: string, corps: string): Partie =>
  ({ id: ancre(id), titre, html: `<section class="partie" id="${ancre(id)}"><h1>${e(titre)}</h1>${corps}</section>` });

/** Bloc qui ne doit pas être coupé entre deux pages ; `page` : commence une nouvelle page. */
export const bloc = (titre: string, corps: string, o: { page?: boolean; paysage?: boolean; id?: string } = {}): string =>
  `<article class="bloc${o.page ? ' page' : ''}${o.paysage ? ' paysage' : ''}"${o.id ? ` id="${ancre(o.id)}"` : ''}>${titre ? `<h2>${e(titre)}</h2>` : ''}${corps}</article>`;

export const champ = (libelle: string, valeur: unknown): string =>
  valeur === undefined || valeur === null || String(valeur).trim() === '' ? '' : `<p class="champ"><b>${e(libelle)} :</b> ${texte(valeur)}</p>`;
export const liste = (l: unknown[]): string => (l.length ? `<ul>${l.map((x) => `<li>${texte(x)}</li>`).join('')}</ul>` : '');
export const secret = (s: unknown): string => (s && String(s).trim() ? `<div class="secret"><b>MJ :</b> ${texte(s)}</div>` : '');

export const STYLE_LIVRE = `
@page { size: A4; margin: 14mm 13mm; }
@page paysage { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 10.5pt/1.45 Georgia, 'Times New Roman', serif; color: #1f1a14; background: #fff; }
h1, h2, h3, h4 { font-family: 'Palatino Linotype', Palatino, Georgia, serif; color: #4a3218; }
.partie { break-before: page; }
.partie > h1 { font-size: 24pt; border-bottom: 3px double #8a6a4a; padding-bottom: 4px; margin: 0 0 10px; }
.bloc { break-inside: avoid; margin: 0 0 12px; }
.bloc.page { break-before: page; }
.bloc.paysage { page: paysage; break-before: page; }
.bloc h2 { font-size: 15pt; margin: 6px 0 4px; border-bottom: 1px solid #c8b08a; }
h3 { font-size: 12pt; margin: 8px 0 3px; }
.champ { margin: 2px 0; }
ul { margin: 2px 0 6px; padding-left: 16px; }
.secret { border-left: 3px solid #8e2b2b; background: #f6ecea; padding: 4px 8px; margin: 4px 0; font-size: 9.5pt; }
.discret { color: #6a5a4a; font-size: 9pt; }
.colonnes { columns: 2; column-gap: 16px; }
.colonnes > * { break-inside: avoid; }
img.carte { display: block; max-width: 100%; max-height: 235mm; margin: 4px auto; border: 1px solid #c8b08a; }
.paysage img.carte { max-height: 170mm; }
.illustration { display: block; max-width: 100%; max-height: 120mm; margin: 6px auto; }
.dessin { width: 100%; height: 235mm; display: flex; align-items: center; justify-content: center; }
.paysage .dessin { height: 165mm; }
.dessin svg { max-width: 100%; max-height: 100%; }
table.tab { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
table.tab td, table.tab th { border-bottom: 1px solid #ddd0b8; padding: 2px 4px; text-align: left; vertical-align: top; }
/* Couverture */
.couverture { height: 260mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 3px double #8a6a4a; padding: 20mm; }
.couverture h1 { font-size: 36pt; margin: 0 0 8mm; border: 0; }
.couverture p { font-size: 13pt; margin: 2mm 0; }
.sommaire { break-before: page; }
.sommaire ol { font-size: 12pt; line-height: 1.9; }
.sommaire a { color: inherit; text-decoration: none; }
/* Calendriers */
.cal-annee { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 12px; }
.cal-mois { break-inside: avoid; }
.cal-mois h4 { margin: 4px 0 2px; font-size: 10.5pt; }
.cal-mois table { width: 100%; border-collapse: collapse; font-size: 8pt; table-layout: fixed; }
.cal-mois th { color: #6a5a4a; font-weight: normal; font-size: 7pt; }
.cal-mois td { border: 1px solid #e2d6c0; text-align: center; height: 5.2mm; }
.cal-mois td.fete { background: #f3e2b8; font-weight: 700; }
.cal-mois td.auj { outline: 2px solid #8a5a1a; }
.cal-mois ul { font-size: 7.5pt; margin: 2px 0 0; padding-left: 12px; }
/* Organigrammes */
.orga ul { list-style: none; padding-left: 14px; border-left: 1px solid #c8b08a; }
.orga li { margin: 2px 0; }
.orga small { color: #6a5a4a; }
/* Talents */
.talents-liste h3 { font-size: 11pt; }
.talents-liste p { margin: 1px 0 4px; font-size: 9pt; }
@media screen { body { background: #e8e0d0; } .feuille { max-width: 210mm; margin: 0 auto; background: #fff; padding: 14mm 13mm; box-shadow: 0 0 12px rgb(0 0 0 / .25); } }
`;
