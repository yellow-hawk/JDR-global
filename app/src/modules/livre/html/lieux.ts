// Repères d'une carte rangés par catégorie (pur, testé) : villes et villages en listes de noms, puis les lieux
// (auberges, ruines, phares…) regroupés d'après leur sorte, avec une description courte.
import type { Campagne, Carte, Repere } from '../../../noyau/contrat';
import { e } from './outils';

export interface Categorie { nom: string; noms: boolean; lieux: { nom: string; texte: string; danger: boolean }[] }

const ORDRE = ['Villes', 'Villages', 'Pays'];

/** Catégorie d'un repère : d'après la carte qu'il ouvre, sinon d'après le début de sa description (« Auberge · … »). */
function categorie(c: Campagne, r: Repere): { nom: string; texte: string } {
  const cible = r.lien?.type === 'carte' ? c.cartes.find((k) => k.id === r.lien!.id) : undefined;
  const cle = cible?.source.cle ?? '';
  const desc = (r.desc ?? '').replace(new RegExp(`^${r.nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+est\\s+`, 'i'), '');
  if (cle.startsWith('ville|')) return { nom: 'Villes', texte: desc };
  if (cle.startsWith('village|')) return { nom: 'Villages', texte: desc.replace(/^Village (\S+) des? [^.]*\.\s*/i, '$1. ') };
  if (cle.startsWith('pays|')) return { nom: 'Pays', texte: desc };
  const morceaux = desc.split(' · ');
  if (morceaux.length > 1 && morceaux[0].length <= 32) return { nom: morceaux[0].replace(/^./, (x) => x.toUpperCase()), texte: morceaux.slice(1).join(' · ') };
  return { nom: r.sorte === 'ville' ? 'Villes et villages' : 'Autres lieux', texte: desc };
}

export function categoriesDe(c: Campagne, k: Carte, avecSecrets: boolean): Categorie[] {
  const parNom = new Map<string, Categorie>();
  for (const r of k.reperes) {
    const { nom, texte } = categorie(c, r);
    const cat = parNom.get(nom) ?? { nom, noms: ORDRE.includes(nom), lieux: [] };
    const mj = avecSecrets ? (r.mj as { notes?: string } | undefined)?.notes : '';
    cat.lieux.push({ nom: r.nom, texte: [texte, mj ? `MJ : ${mj}` : ''].filter(Boolean).join(' · '), danger: r.sorte === 'danger' || /danger/i.test(texte) });
    parNom.set(nom, cat);
  }
  return [...parNom.values()].sort((a, b) => (ORDRE.indexOf(a.nom) + 1 || 99) - (ORDRE.indexOf(b.nom) + 1 || 99) || b.lieux.length - a.lieux.length || a.nom.localeCompare(b.nom, 'fr'));
}

/** Catégories en HTML compact : noms en ligne pour villes et villages, description courte pour les autres lieux. */
export function lieuxHtml(cats: Categorie[], colonnes = 2): string {
  if (!cats.length) return '';
  return `<div class="lieux cols${colonnes}">${cats.map((cat) => `<div><h4>${e(cat.nom)} (${cat.lieux.length})</h4>${cat.noms
    ? `<p class="noms">${cat.lieux.map((l) => `<b>${e(l.nom)}</b>${l.texte ? ` <span class="discret">${e(court(l.texte, 70))}</span>` : ''}`).join(' · ')}</p>`
    : cat.lieux.map((l) => `<p class="lieu${l.danger ? ' danger' : ''}"><b>${e(l.nom)}</b>${l.texte ? ` — ${e(court(l.texte, 140))}` : ''}</p>`).join('')}</div>`).join('')}</div>`;
}

const court = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : t);
