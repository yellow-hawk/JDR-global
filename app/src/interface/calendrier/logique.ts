// Calendrier en grilles (pur, testé) : mois découpés en semaines, semaine d'un jour, jour de la semaine,
// marques (fêtes, événements, séances) rangées par jour. Indépendant des modules : on lui passe le calendrier.
import type { Calendrier, DateMonde } from '../../noyau/contrat';

/** Jours de la semaine par défaut (calendrier sans semaine définie). */
export const SEMAINE_PAR_DEFAUT = ['Premier-jour', 'Deuxième-jour', 'Troisième-jour', 'Quatrième-jour', 'Cinquième-jour', 'Sixième-jour', 'Septième-jour'];
export const joursDeSemaine = (cal: Calendrier): string[] => (cal.semaine?.length ? cal.semaine : SEMAINE_PAR_DEFAUT);
export const abrege = (nom: string): string => nom.replace(/-jour$/, '').slice(0, 3);

const joursParAn = (cal: Calendrier) => cal.mois.reduce((s, m) => s + m.jours, 0) || 1;

/** Numéro absolu du jour (0 = premier jour de l'an 0). */
export function jourAbsolu(cal: Calendrier, d: DateMonde): number {
  const m = Math.min(Math.max(1, d.mois), cal.mois.length) - 1;
  const avant = cal.mois.slice(0, m).reduce((s, x) => s + x.jours, 0);
  return d.an * joursParAn(cal) + avant + Math.min(Math.max(1, d.jour), cal.mois[m]?.jours ?? 1) - 1;
}

export function dateDuJour(cal: Calendrier, n: number): DateMonde {
  const ja = joursParAn(cal), an = Math.floor(n / ja);
  let reste = n - an * ja, mois = 0;
  while (mois < cal.mois.length - 1 && reste >= cal.mois[mois].jours) { reste -= cal.mois[mois].jours; mois++; }
  return { an, mois: mois + 1, jour: reste + 1 };
}

/** Jour de la semaine (0 = premier), continu d'une année à l'autre. */
export const jourDeLaSemaine = (cal: Calendrier, d: DateMonde): number => {
  const l = joursDeSemaine(cal).length;
  return ((jourAbsolu(cal, d) % l) + l) % l;
};

/** Grille d'un mois : une ligne par semaine, null pour les cases hors du mois. */
export function grilleMois(cal: Calendrier, an: number, mois: number): (DateMonde | null)[][] {
  const l = joursDeSemaine(cal).length, n = cal.mois[mois - 1]?.jours ?? 0;
  const debut = jourDeLaSemaine(cal, { an, mois, jour: 1 });
  const cases: (DateMonde | null)[] = [...Array(debut).fill(null), ...Array.from({ length: n }, (_, i) => ({ an, mois, jour: i + 1 }))];
  while (cases.length % l) cases.push(null);
  return Array.from({ length: cases.length / l }, (_, i) => cases.slice(i * l, (i + 1) * l));
}

/** Les jours de la semaine qui contient `d`. */
export function semaineDe(cal: Calendrier, d: DateMonde): DateMonde[] {
  const n = jourAbsolu(cal, d) - jourDeLaSemaine(cal, d);
  return Array.from({ length: joursDeSemaine(cal).length }, (_, i) => dateDuJour(cal, n + i));
}

export const decaler = (cal: Calendrier, d: DateMonde, jours: number): DateMonde => dateDuJour(cal, jourAbsolu(cal, d) + jours);
export function decalerMois(cal: Calendrier, d: DateMonde, n: number): DateMonde {
  const k = d.mois - 1 + n, l = cal.mois.length;
  const an = d.an + Math.floor(k / l), mois = (((k % l) + l) % l) + 1;
  return { an, mois, jour: Math.min(d.jour, cal.mois[mois - 1].jours) };
}

export const memeJour = (a: DateMonde | null | undefined, b: DateMonde | null | undefined): boolean =>
  !!a && !!b && a.an === b.an && a.mois === b.mois && a.jour === b.jour;

/** Quelque chose à signaler un jour donné. */
export interface Marque { date: DateMonde; titre: string; sorte: 'fete' | 'evenement' | 'seance' | 'histoire' | 'lune'; texte?: string; couleur?: string; cible?: { page: string; cible?: string } }

/** Fêtes du calendrier pour l'année `an` (elles reviennent chaque année). */
export const fetesDeLAn = (cal: Calendrier, an: number): Marque[] =>
  cal.fetes.map((f) => ({ date: { an, mois: f.mois + 1, jour: f.jour }, titre: f.nom, texte: f.texte, sorte: 'fete' as const }));

/** Marques rangées par jour absolu. */
export function parJour(cal: Calendrier, marques: Marque[]): Map<number, Marque[]> {
  const m = new Map<number, Marque[]>();
  for (const x of marques) { const k = jourAbsolu(cal, x.date); m.set(k, [...(m.get(k) ?? []), x]); }
  return m;
}

const e = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Une année en grilles de mois, en HTML autonome (impression, livre de campagne). */
export function anneeHtml(cal: Calendrier, an: number, marques: Marque[] = [], aujourdhui?: DateMonde): string {
  const sem = joursDeSemaine(cal), jours = parJour(cal, [...fetesDeLAn(cal, an), ...marques]);
  const mois = cal.mois.map((m, i) => {
    const lignes = grilleMois(cal, an, i + 1).map((l) => `<tr>${l.map((d) => {
      if (!d) return '<td></td>';
      const ms = jours.get(jourAbsolu(cal, d)) ?? [];
      const cls = [ms.some((x) => x.sorte === 'fete') ? 'fete' : '', memeJour(d, aujourdhui) ? 'auj' : ''].filter(Boolean).join(' ');
      return `<td class="${cls}" title="${e(ms.map((x) => x.titre).join(', '))}">${d.jour}</td>`;
    }).join('')}</tr>`).join('');
    const notes = cal.fetes.filter((f) => f.mois === i).map((f) => `<li><b>${f.jour}</b> ${e(f.nom)}</li>`).join('');
    return `<div class="cal-mois"><h4>${e(m.nom)}</h4><table><tr>${sem.map((s) => `<th>${e(abrege(s))}</th>`).join('')}</tr>${lignes}</table>${notes ? `<ul>${notes}</ul>` : ''}</div>`;
  }).join('');
  return `<div class="cal-annee">${mois}</div>`;
}
