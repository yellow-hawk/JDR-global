// Parties « monde » du livre (pur) : couverture, peuples, institutions, calendriers, chronologie.
import type { Campagne, Civilisation, DateMonde } from '../../../noyau/contrat';
import type { NoeudArbre } from '../../../noyau/graphe';
import { anneeHtml, type Marque } from '../../../interface/calendrier';
import { absolu, anneeActuelle, dateLisible, reference, tempsDe } from '../../chronologie';
import { organigrammeInstitutions } from '../../organigrammes';
import { bloc, champ, e, liste, partie, secret, texte, type Partie } from './outils';

export function couverture(c: Campagne, parties: Partie[], version: 'mj' | 'joueurs'): string {
  const r = reference(c), t = tempsDe(c);
  const monde = c.univers.find((u) => u.id === c.campagne.univers?.id) ?? c.univers[0];
  return `<section class="couverture"><h1>${e(c.campagne.nom)}</h1>
    ${monde ? `<p>${e(monde.nom)}</p>` : ''}
    <p>${e(dateLisible(t.date, r.cal))}</p>
    <p class="discret">Livre de campagne · ${version === 'mj' ? 'version du maître du jeu (secrets compris)' : 'version des joueurs'} · ${new Date().toLocaleDateString('fr-FR')}</p></section>
    <section class="sommaire"><h2>Sommaire</h2><ol>${parties.map((p) => `<li><a href="#${p.id}">${e(p.titre)}</a></li>`).join('')}</ol></section>`;
}

const civs = (c: Campagne) => c.univers.flatMap((u) => (u.civilisations?.peuples ?? []).map((p) => ({ u, p, id: `peuple:${u.id}:${String(p.cle)}` })));

export function peuples(c: Campagne, ids: Set<string>): Partie | null {
  const l = civs(c).filter((x) => ids.has(x.id));
  if (!l.length) return null;
  const fiche = (p: Civilisation, an: number) => [
    champ('Gouvernement', [p.regime, p.regimeTexte].filter(Boolean).join(' — ')),
    champ('Souverain', p.souverain), champ('Fondateur', p.fondateur), champ('Capitale', p.capitale),
    champ('Population', p.population), champ('Langue', p.langue), champ('Croyance', p.croyance), champ('Ère', [p.ere, p.ereTexte].filter(Boolean).join(' — ')),
    champ('Année en cours', an),
    p.reputation !== undefined ? champ('Réputation du groupe', `${p.reputation > 0 ? '+' : ''}${p.reputation}`) : '',
    p.villes.length ? `<h3>Villes</h3>${liste(p.villes.map((v) => `${v.nom}${v.capitale ? ' (capitale)' : ''}${v.desc ? ` — ${v.desc}` : ''}`))}` : '',
    p.traits.length ? `<h3>Traits</h3>${liste(p.traits)}` : '',
    p.coutumes.length ? `<h3>Coutumes</h3>${liste(p.coutumes)}` : '',
    p.relations.length ? `<h3>Relations</h3>${liste(p.relations.map((r) => `${r.nom} : ${r.sorte}`))}` : '',
    p.histoire.length ? `<h3>Histoire</h3><table class="tab">${[...p.histoire].sort((a, b) => a.an - b.an).map((h) => `<tr><td style="width:14mm">${h.an}</td><td>${texte(h.texte)}</td></tr>`).join('')}</table>` : '',
    secret((p.mj as { notes?: string } | undefined)?.notes),
  ].join('');
  return partie('peuples', 'Peuples et pays', l.map(({ p }) => bloc(p.nom.replace(/^les /, ''), fiche(p, anneeActuelle(c, p)), { page: true })).join(''));
}

const arbreListe = (n: NoeudArbre): string =>
  `<li><b>${e(n.libelle)}</b>${n.sousTitre ? ` <small>${e(n.sousTitre)}</small>` : ''}${n.enfants?.length ? `<ul>${n.enfants.map(arbreListe).join('')}</ul>` : ''}</li>`;

export function institutions(c: Campagne, ids: Set<string>): Partie | null {
  const l = civs(c).filter((x) => ids.has(x.id));
  if (!l.length) return null;
  return partie('institutions', 'Institutions', l.map(({ u, p }) => bloc(p.nom.replace(/^les /, ''), `<div class="orga"><ul>${arbreListe(organigrammeInstitutions(c, u.id, p))}</ul></div>`)).join(''));
}

/** Événements et séances datés, pour les calendriers et la chronologie. */
function marques(c: Campagne): Marque[] {
  return [
    ...(c.evenements ?? []).map((x) => ({ date: x.date, titre: x.titre, texte: x.texte, sorte: 'evenement' as const })),
    ...c.seances.filter((s) => s.dateMonde).map((s) => ({ date: s.dateMonde as DateMonde, titre: `Séance ${s.numero}`, texte: s.resume, sorte: 'seance' as const })),
  ];
}

export function calendriers(c: Campagne, ids: Set<string>): Partie | null {
  const blocs: string[] = [];
  const r = reference(c), t = tempsDe(c);
  if (ids.has('calendrier:reference')) {
    const ms = marques(c).filter((m) => m.date.an === t.date.an);
    blocs.push(bloc(`Calendrier ${r.civ ? r.civ.nom.replace(/^les /, 'des ') : 'de la campagne'} — an ${t.date.an}`,
      anneeHtml(r.cal, t.date.an, ms, t.date) + (ms.length ? `<h3>Cette année</h3>${liste(ms.map((m) => `${dateLisible(m.date, r.cal)} : ${m.titre}`))}` : ''), { page: true }));
  }
  for (const { p, u } of civs(c)) {
    if (!ids.has(`calendrier:${u.id}:${String(p.cle)}`) || !p.calendrier?.mois.length) continue;
    const an = anneeActuelle(c, p);
    const fetes = p.calendrier.fetes.filter((f) => f.texte).map((f) => `${f.jour} ${p.calendrier!.mois[f.mois]?.nom ?? ''} — ${f.nom} : ${f.texte}`);
    blocs.push(bloc(`Calendrier ${p.nom.replace(/^les /, 'des ')} — an ${an}`,
      `<p class="discret">${p.calendrier.joursParAn} jours, ${p.calendrier.mois.length} mois${p.calendrier.semaine?.length ? `, semaine de ${p.calendrier.semaine.length} jours (${p.calendrier.semaine.join(', ')})` : ''}.</p>`
      + anneeHtml(p.calendrier, an) + (fetes.length ? `<h3>Fêtes</h3>${liste(fetes)}` : ''), { page: true }));
  }
  return blocs.length ? partie('calendriers', 'Calendriers', blocs.join('')) : null;
}

export function chronologie(c: Campagne): Partie | null {
  const r = reference(c);
  const ms = marques(c).sort((a, b) => absolu(a.date, r.cal) - absolu(b.date, r.cal));
  if (!ms.length) return null;
  const evts = new Map((c.evenements ?? []).map((x) => [x.titre, x]));
  return partie('chronologie', 'Chronologie', `<table class="tab">${ms.map((m) => `<tr><td style="width:42mm">${e(dateLisible(m.date, r.cal))}</td><td><b>${e(m.titre)}</b>${m.texte ? `<br>${texte(m.texte)}` : ''}${m.sorte === 'evenement' ? secret((evts.get(m.titre)?.mj as { notes?: string } | undefined)?.notes) : ''}</td></tr>`).join('')}</table>`);
}
