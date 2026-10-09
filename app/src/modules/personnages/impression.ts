// Fiche imprimable (pur) : page HTML autonome, mise en page A4, à imprimer ou enregistrer en PDF depuis le navigateur.
import type { Personnage } from '../../noyau/contrat';
import type { FicheCalculee, SystemeAvecFiche } from '../../noyau/regles';
import { arbresPour, noeudParId } from '../../noyau/talents';

const e = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const signe = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function ficheHtml(p: Personnage, R: SystemeAvecFiche, calcul: FicheCalculee, portrait: string | null): string {
  const f = p.fiche ?? {};
  const id = f.identite ?? {};
  const classes = (f.progression?.classes ?? []).map((c) => {
    const cl = R.catalogue.classes.find((x) => x.id === c.id);
    const sc = cl?.sousClasses.find((s) => s.id === c.sousClasse);
    return `${e(cl?.nom ?? c.id)} ${c.niveau}${sc ? ` (${e(sc.nom)})` : ''}`;
  }).join(' / ');
  const espece = R.catalogue.peuples.find((x) => x.id === id.espece)?.nom ?? '';
  const historique = R.catalogue.historiques.find((x) => x.id === id.historique)?.nom ?? id.historique ?? '';
  const pastille = (m?: number) => ['○', '●', '◉'][m ?? 0];
  const d = (cle: string) => calcul.derives.find((x) => x.cle === cle)?.texte ?? '—';
  const talents = (f.progression?.talents ?? []).map((t) => noeudParId(t)).filter(Boolean);
  const arbres = arbresPour(p).map((a) => a.nom).join(', ');
  const objets = f.inventaire?.objets ?? [];
  const monnaie = Object.entries(f.inventaire?.monnaie ?? {}).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(', ');
  const perso = f.personnalite ?? {};

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${e(p.nom)} — fiche de personnage</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font: 10.5pt/1.35 Georgia, 'Times New Roman', serif; color: #1f1a14; margin: 0; }
  h1 { font-size: 20pt; margin: 0; } h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #8a6a4a; margin: 10px 0 4px; }
  .entete { display: flex; gap: 12px; align-items: center; border-bottom: 2px solid #8a6a4a; padding-bottom: 8px; }
  .entete img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #8a6a4a; }
  .sous { color: #5a4a3a; }
  .grille { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .caracs { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-top: 8px; }
  .carac { border: 1px solid #8a6a4a; border-radius: 6px; text-align: center; padding: 4px; }
  .carac b { display: block; font-size: 16pt; } .carac small { color: #5a4a3a; }
  .derives { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-top: 6px; }
  .derives div { border-left: 3px solid #8a6a4a; padding: 2px 6px; } .derives small { display: block; color: #5a4a3a; font-size: 8pt; }
  ul { margin: 0; padding-left: 14px; } li { margin: 1px 0; }
  table { width: 100%; border-collapse: collapse; } td, th { text-align: left; border-bottom: 1px solid #d8c8b0; padding: 2px 4px; font-size: 9.5pt; }
  .colonnes { columns: 2; column-gap: 14px; } .ligne-comp { display: flex; justify-content: space-between; }
  .pied { margin-top: 10px; font-size: 7.5pt; color: #7a6a5a; }
</style></head><body>
<div class="entete">
  ${portrait ? `<img src="${e(portrait)}" alt="">` : ''}
  <div><h1>${e(p.nom)}</h1>
  <div class="sous">${[classes, espece, historique, id.alignement].filter(Boolean).join(' · ')}</div>
  <div class="sous">${p.joueur ? `Joueur : ${e(p.joueur)} · ` : ''}Niveau ${calcul.niveau} · ${f.progression?.xp ?? 0} XP${p.role ? ` · ${e(p.role)}` : ''}</div></div>
</div>
<div class="caracs">${calcul.caracs.map((c) => `<div class="carac"><small>${e(c.libelle)}</small><b>${signe(Math.floor((c.valeur - 10) / 2))}</b>${c.valeur}</div>`).join('')}</div>
<div class="derives">
  <div><small>Classe d’armure</small>${d('ca')}</div><div><small>PV</small>${e(p.combat.stats.pv)} / ${e(p.combat.stats.pvMax)}</div>
  <div><small>Initiative</small>${d('initiative')}</div><div><small>Vitesse</small>${d('vitesse')}</div>
  <div><small>Maîtrise</small>${d('maitrise')}</div><div><small>Perception passive</small>${d('perceptionPassive')}</div>
</div>
<div class="grille">
  <div><h2>Jets de sauvegarde</h2>${calcul.sauvegardes.map((s) => `<div class="ligne-comp"><span>${pastille(s.maitrise)} ${e(s.libelle)}</span><b>${s.texte}</b></div>`).join('')}</div>
  <div style="grid-column: span 2"><h2>Compétences</h2><div class="colonnes">${calcul.competences.map((c) => `<div class="ligne-comp"><span>${pastille(c.maitrise)} ${e(c.libelle)}</span><b>${c.texte}</b></div>`).join('')}</div></div>
</div>
${calcul.attaques.length ? `<h2>Attaques</h2><table><tr><th>Arme</th><th>Attaque</th><th>Dégâts</th><th>Portée</th></tr>${calcul.attaques.map((a) => `<tr><td>${e(a.nom)}</td><td>${signe(a.bonus)}</td><td>${e(a.degats)}</td><td>${a.portee ? `${e(a.portee)} cases` : 'contact'}</td></tr>`).join('')}</table>` : ''}
${calcul.incantation?.length ? `<h2>Incantation</h2><p>${calcul.incantation.map((i) => `${e(i.classe)} : DD ${i.dd}, attaque ${signe(i.attaque)}`).join(' · ')}${calcul.emplacements?.length ? ` · emplacements ${calcul.emplacements.map((n, k) => `${k + 1}:${n}`).join(' ')}` : ''}</p>` : ''}
<div class="grille">
  <div style="grid-column: span 2"><h2>Aptitudes</h2><ul>${(calcul.aptitudes ?? []).map((a) => `<li><b>${e(a.nom)}</b> (${e(a.source)}) — ${e(a.texte)}</li>`).join('')}${(f.progression?.aptitudes ?? []).map((a) => `<li><b>${e(a.nom)}</b>${a.texte ? ` — ${e(a.texte)}` : ''}</li>`).join('')}</ul>
  ${talents.length ? `<h2>Talents</h2><ul>${talents.map((t) => `<li><b>${e(t!.nom)}</b> — ${e(t!.texte)}</li>`).join('')}</ul>` : ''}</div>
  <div><h2>Équipement</h2><ul>${objets.map((o) => `<li>${o.equipe ? '◆ ' : ''}${e(o.nom)}${o.quantite > 1 ? ` ×${o.quantite}` : ''}</li>`).join('')}</ul>${monnaie ? `<p>Bourse : ${e(monnaie)}</p>` : ''}
  <h2>Langues</h2><p>${e((id.langues ?? []).join(', ') || '—')}</p></div>
</div>
<h2>Personnalité</h2>
<p>${[['Traits', perso.traits], ['Idéaux', perso.ideaux], ['Liens', perso.liens], ['Défauts', perso.defauts]].filter(([, v]) => v).map(([k, v]) => `<b>${k} :</b> ${e(v)}`).join('<br>') || '—'}</p>
${p.notes ? `<h2>Description</h2><p>${e(p.notes)}</p>` : ''}
<p class="pied">JDR Global · arbres : ${e(arbres)} · ${e(R.catalogue.source ?? '')}</p>
<script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body></html>`;
}
