// Fiches imprimables façon grimoire : une page A5 par sort, sur parchemin, prête à imprimer ou à enregistrer en PDF.
import { analyser } from './analyse';
import { decrire } from './effets';
import { traitsDuSceau } from './geometry';
import type { Sceau } from './types';
import { RANGS } from '../data/signes';

export interface SortAImprimer { nom: string; sceau: Sceau; categorie?: string; notes?: string }

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Dessin du sceau en SVG (encre ferro-gallique sur parchemin) */
export function svgSceau(s: Sceau, taille = 300): string {
  const chemins: string[] = [];
  const ajouter = (sc: Sceau, cx: number, cy: number, base: number) => {
    for (const st of traitsDuSceau(sc, cx, cy, base)) {
      if (st.length < 2) continue;
      chemins.push(`<path d="M${st.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}"/>`);
    }
  };
  if (s.greffe) {
    ajouter(s, 150, 300, 120); ajouter(s.greffe, 450, 300, 120);
    chemins.push('<path d="M270 300 L330 300"/>');
  } else ajouter(s, 300, 300, 230);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="${taille}" height="${taille}"><g fill="none" stroke="#2b1d10" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">${chemins.join('')}</g></svg>`;
}

function page(x: SortAImprimer): string {
  const a = analyser(x.sceau);
  const d = decrire(x.sceau, a);
  return `
  <section class="page">
    <div class="cadre">
      <header>
        <div class="cat">${esc(x.categorie ?? 'Sort')} · ${RANGS[a.rang]}${a.interdit ? ' · <span class="interdit">Magie interdite</span>' : ''}</div>
        <h1>${esc(x.nom || d.titre)}</h1>
        <div class="compo">${esc(d.composition)}</div>
      </header>
      <div class="sceau">${svgSceau(x.sceau, 230)}</div>
      <p class="bref">${esc(d.enBref)}</p>
      <h2>Ce qui se passe</h2>
      <p>${esc(d.declenchement)}</p>
      ${d.formes.map((f) => `<p>${esc(f)}</p>`).join('')}
      <p class="sens">${esc(d.sensation)}</p>
      ${d.reglages.length ? `<ul>${d.reglages.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
      <h2>Effets sur les cibles</h2>
      <dl>${d.surCibles.map((c) => `<dt>${c.label}</dt><dd>${esc(c.texte)}</dd>`).join('')}</dl>
      <h2>Valeurs de jeu</h2>
      <dl class="valeurs">${d.stats.map((s) => `<dt>${s.label}</dt><dd>${esc(s.valeur)}</dd>`).join('')}<dt>Puissance</dt><dd>${a.puissance} (${a.puissanceLabel})</dd><dt>Difficulté</dt><dd>+${a.difficulte}</dd></dl>
      <p class="fin"><b>Fin du sort.</b> ${esc(d.fin)}</p>
      <p class="fin"><b>Contre.</b> ${esc(d.contre)}</p>
      ${x.notes ? `<p class="notes">${esc(x.notes)}</p>` : ''}
    </div>
  </section>`;
}

export function htmlGrimoire(sorts: SortAImprimer[], titre: string, sousTitre = ''): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=IM+Fell+English:ital@0;1&display=swap">
<style>
@page { size: A5; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #6b5a44; font-family: "IM Fell English", "Garamond", Georgia, serif; color: #2b1d10; }
.page { width: 148mm; height: 210mm; margin: 10mm auto; padding: 9mm; page-break-after: always; break-after: page;
  background: radial-gradient(ellipse at 30% 20%, #f6ead0 0%, #ecdcb8 55%, #d9c193 100%); box-shadow: 0 4px 20px rgba(0,0,0,.4); position: relative; overflow: hidden; }
.page::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 60%, rgba(120,80,30,.28) 100%); }
.cadre { border: 1.5px solid #6b4a24; outline: 1px solid #6b4a24; outline-offset: 3px; height: 100%; padding: 6mm 7mm; display: flex; flex-direction: column; gap: 1.6mm; font-size: 9.6pt; line-height: 1.3; }
header { text-align: center; }
.cat { font-family: "IM Fell English SC", serif; letter-spacing: .12em; font-size: 8pt; color: #7a5228; }
h1 { font-family: "IM Fell English SC", serif; font-weight: 400; font-size: 20pt; margin: 1mm 0 0; letter-spacing: .02em; }
h1::before, h1::after { content: " ❧ "; font-size: 12pt; color: #8a6a3a; }
.compo { font-style: italic; font-size: 8pt; color: #5d4426; }
.sceau { display: flex; justify-content: center; margin: 1mm 0; }
.sceau svg { width: 46mm; height: 46mm; }
.bref { font-style: italic; text-align: center; border-top: 1px solid #a07c4a; border-bottom: 1px solid #a07c4a; padding: 1.5mm 2mm; margin: 0; font-size: 10pt; }
h2 { font-family: "IM Fell English SC", serif; font-weight: 400; font-size: 10.5pt; margin: 1.5mm 0 0; color: #6b3a14; border-bottom: 1px dotted #a07c4a; }
p { margin: 0; text-align: justify; }
.sens { font-style: italic; color: #5d4426; }
ul { margin: 0; padding-left: 4mm; }
dl { display: grid; grid-template-columns: auto 1fr; gap: .4mm 3mm; margin: 0; }
dt { font-family: "IM Fell English SC", serif; color: #6b3a14; }
dd { margin: 0; }
.valeurs { grid-template-columns: auto 1fr auto 1fr; }
.fin { font-size: 8.8pt; }
.notes { margin-top: auto; font-style: italic; font-size: 8.5pt; color: #5d4426; border-left: 2px solid #a07c4a; padding-left: 2mm; }
.interdit { color: #8a1a1a; }
.couverture .cadre { justify-content: center; align-items: center; text-align: center; gap: 6mm; }
.couverture h1 { font-size: 28pt; }
.couverture p { text-align: center; font-style: italic; }
.table li { list-style: none; border-bottom: 1px dotted #a07c4a; padding: .6mm 0; display: flex; justify-content: space-between; gap: 4mm; }
@media print { body { background: none; } .page { margin: 0; box-shadow: none; } .barre { display: none; } }
.barre { position: sticky; top: 0; background: #2b1d10; color: #f6ead0; padding: 8px 16px; display: flex; gap: 12px; align-items: center; font-family: system-ui, sans-serif; font-size: 14px; z-index: 2; }
.barre button { background: #f6ead0; color: #2b1d10; border: 0; border-radius: 4px; padding: 6px 14px; font-weight: 700; cursor: pointer; }
</style></head><body>
<div class="barre"><span>${esc(titre)} · ${sorts.length} fiche(s) — format A5</span><button onclick="window.print()">Imprimer / PDF</button></div>
${sorts.length > 1 ? `<section class="page couverture"><div class="cadre">
  <div class="cat">Atelier de tracé</div>
  <h1>${esc(titre)}</h1>
  ${sousTitre ? `<p>${esc(sousTitre)}</p>` : ''}
  <ul class="table" style="width:80%;padding:0">${sorts.map((x, i) => `<li><span>${esc(x.nom)}</span><span>${i + 2}</span></li>`).join('')}</ul>
</div></section>` : ''}
${sorts.map(page).join('\n')}
</body></html>`;
}

/** Ouvre les fiches dans une nouvelle fenêtre ; à défaut, les télécharge en fichier HTML. */
export function imprimer(sorts: SortAImprimer[], titre: string, sousTitre = ''): 'fenetre' | 'fichier' {
  const html = htmlGrimoire(sorts, titre, sousTitre);
  const w = window.open('', '_blank');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); return 'fenetre'; }
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const a = document.createElement('a'); a.href = url; a.download = `${titre}.html`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'fichier';
}
