// Parties « monde » du livre (pur) : couverture, sommaire, peuples (2 feuilles : carte et fiche ; histoire,
// calendrier et lieux), dynasties et institutions, feuilles de ville (une chacune), calendrier, chronologie.
import type { Campagne, Carte, Civilisation, DateMonde, Univers } from '../../../noyau/contrat';
import { anneeHtml, type Marque } from '../../../interface/calendrier';
import { svgArbre } from '../../../interface/graphe';
import { absolu, anneeActuelle, dateLisible, reference, tempsDe } from '../../chronologie';
import { arbreSvg } from '../../genealogie';
import { organigrammeInstitutions } from '../../organigrammes';
import { categoriesDe, lieuxHtml } from './lieux';
import { bloc, champ, dessin, e, flux, page, partie, secret, texte, visuel, type Entree, type Partie } from './outils';

export type Images = Map<string, { url: string; large: boolean }>;
const notesMj = (x: { mj?: unknown }) => (x.mj as { notes?: string } | undefined)?.notes;
const sansLes = (nom: string) => nom.replace(/^les /, '');

export function couverture(c: Campagne, version: 'mj' | 'joueurs'): string {
  const r = reference(c), t = tempsDe(c);
  const monde = c.univers.find((u) => u.id === c.campagne.univers?.id) ?? c.univers[0];
  return page(`<h1>${e(c.campagne.nom)}</h1>${monde ? `<p>${e(monde.nom)}</p>` : ''}<p>${e(dateLisible(t.date, r.cal))}</p>
    <p class="discret">Livre de campagne · ${version === 'mj' ? 'version du maître du jeu (secrets compris)' : 'version des joueurs'} · ${new Date().toLocaleDateString('fr-FR')}</p>`).replace('class="page"', 'class="page couverture"');
}

/** Sommaire cliquable : les parties, et sous chacune ses éléments (peuples, villes, personnages…). */
export function sommaire(parties: Partie[]): string {
  return flux(`<div id="sommaire"><h2>Sommaire</h2><ol class="sommaire">${parties.map((p) => `<li><a href="#${p.id}">${e(p.titre)}</a>${p.entrees.length > 1
    ? `<ol>${p.entrees.map((x) => `<li><a href="#${x.id}">${e(x.titre)}</a></li>`).join('')}</ol>` : ''}</li>`).join('')}</ol></div>`);
}

export interface PeupleLivre { u: Univers; p: Civilisation; id: string }
export const peuplesDe = (c: Campagne): PeupleLivre[] => c.univers.flatMap((u) => (u.civilisations?.peuples ?? []).map((p) => ({ u, p, id: `peuple:${u.id}:${String(p.cle)}` })));
const carteAtlas = (c: Campagne, u: Univers, cle: string): Carte | undefined =>
  c.cartes.find((k) => k.source.sorte === 'atlas' && k.source.cle === cle && k.univers?.id === u.id);
export const carteDuPays = (c: Campagne, x: PeupleLivre) => carteAtlas(c, x.u, `pays|${String(x.p.cle)}`);
export const cartesDesVilles = (c: Campagne, x: PeupleLivre): Carte[] =>
  c.cartes.filter((k) => k.source.sorte === 'atlas' && k.univers?.id === x.u.id && k.source.cle?.startsWith(`ville|${String(x.p.cle)}|`));
const imageDe = (images: Images, k: Carte | undefined, mj: boolean) => (k ? images.get((mj && k.images.mj?.image) || k.images.joueurs || '')?.url : undefined);

/** Événements et séances datés. */
function marques(c: Campagne): Marque[] {
  return [
    ...(c.evenements ?? []).map((x) => ({ date: x.date, titre: x.titre, texte: x.texte, sorte: 'evenement' as const })),
    ...c.seances.filter((s) => s.dateMonde).map((s) => ({ date: s.dateMonde as DateMonde, titre: `Séance ${s.numero}`, texte: s.resume, sorte: 'seance' as const })),
  ];
}

export interface OptionsPeuples { ids: Set<string>; dynasties: boolean; villes: Set<string>; images: Images; mj: boolean }

/** Peuples : par peuple, la feuille « carte et fiche », la feuille « histoire, calendrier, lieux », puis dynastie, institutions et villes. */
export function peuples(c: Campagne, o: OptionsPeuples): Partie | null {
  const l = peuplesDe(c).filter((x) => o.ids.has(x.id));
  if (!l.length) return null;
  const morceaux: string[] = [], entrees: Entree[] = [];
  for (const x of l) {
    const { p } = x, nom = sansLes(p.nom);
    const an = anneeActuelle(c, p);
    const carte = carteDuPays(c, x);
    entrees.push({ id: x.id, titre: nom });
    // Feuille 1 : carte du pays et l'essentiel.
    morceaux.push(page(`<h2>${e(p.nom.replace(/^les /, 'Les '))}</h2>
      <p class="sous">${e([p.regimeTexte ?? p.regime, p.capitale && `capitale ${p.capitale}`, p.population, `an ${an}`].filter(Boolean).join(' · '))}</p>
      ${visuel(imageDe(o.images, carte, o.mj), carte ? '125mm' : undefined)}
      <div class="cols2">
        ${champ('Souverain', [p.souverain, p.fondateur && `lignée de ${p.fondateur}`].filter(Boolean).join(', '))}${champ('Langue', p.langue)}${champ('Croyance', p.croyance)}
        ${champ('Époque', [p.ere, p.ereTexte].filter(Boolean).join(' — '))}
        ${p.reputation !== undefined ? champ('Réputation du groupe', `${p.reputation > 0 ? '+' : ''}${p.reputation} / 100`) : ''}
        ${p.villes.length ? `<div><h3>Villes</h3><p>${p.villes.map((v) => `<b>${e(v.nom)}</b>${v.capitale ? ' (capitale)' : ''}`).join(' · ')}</p></div>` : ''}
        ${p.traits.length ? `<div><h3>Le peuple</h3><p>${p.traits.map(e).join(' ')}</p></div>` : ''}
        ${p.coutumes.length ? `<div><h3>Coutumes</h3><p>${p.coutumes.map(e).join(' ')}</p></div>` : ''}
        ${p.relations.length ? `<div><h3>Relations</h3><p>${p.relations.map((r) => `${e(sansLes(r.nom))} : <i>${e(r.sorte)}</i>`).join(' · ')}</p></div>` : ''}
      </div>${o.mj ? secret(notesMj(p)) : ''}`, { ajuster: true, id: x.id }));
    // Feuille 2 : lieux du pays, histoire, calendrier.
    const cats = carte ? categoriesDe(c, carte, o.mj) : [];
    const fetes = p.calendrier?.fetes.filter((f) => f.texte).map((f) => `<b>${f.jour} ${e(p.calendrier!.mois[f.mois]?.nom ?? '')}</b> ${e(f.nom)} : ${e(f.texte)}`) ?? [];
    morceaux.push(page(`<h2>${e(nom)} : lieux, histoire, calendrier</h2>
      ${cats.length ? `<h3>Lieux du pays</h3>${lieuxHtml(cats, 3)}` : ''}
      ${p.histoire.length ? `<h3>Histoire</h3><div class="cols2">${[...p.histoire].sort((a, b) => a.an - b.an).map((h) => `<p><b>An ${h.an}</b> — ${texte(h.texte)}</p>`).join('')}</div>` : ''}
      ${p.calendrier?.mois.length ? `<h3>Calendrier — an ${an}</h3>${anneeHtml(p.calendrier, an)}${fetes.length ? `<p class="discret">${fetes.join(' · ')}</p>` : ''}` : ''}`, { ajuster: true }));
    // Dynastie et institutions (générées avant le livre si besoin).
    if (o.dynasties) {
      const dyn = (c.familles ?? []).find((f) => f.sorte === 'dynastie' && String(f.peuple) === String(p.cle) && (!f.univers || f.univers.id === x.u.id));
      if (dyn) morceaux.push(page(`<h2>${e(dyn.nom)}</h2><p class="sous">♛ années de règne sous les dates de vie · pointillés : succession sans lien de sang</p>${dessin(arbreSvg(dyn, an))}`, { paysage: true }));
      morceaux.push(page(`<h2>Institutions : ${e(nom)}</h2><p class="sous">${e(p.regimeTexte ?? p.regime ?? '')}</p>${dessin(svgArbre(organigrammeInstitutions(c, x.u.id, p), true))}`, { paysage: true }));
    }
    // Villes : une feuille chacune.
    for (const k of cartesDesVilles(c, x).filter((v) => o.villes.has(v.id))) {
      const v = p.villes.find((y) => y.nom === k.nom) ?? p.villes[Number(k.source.cle?.split('|')[2])];
      entrees.push({ id: k.id, titre: `${k.nom} (${nom})` });
      morceaux.push(page(`<h2>${e(k.nom)}</h2><p class="sous">${e([v?.capitale ? `capitale ${p.nom.replace(/^les /, 'des ')}` : `cité ${p.nom.replace(/^les /, 'des ')}`, v?.desc].filter(Boolean).join(' — '))}</p>
        ${visuel(imageDe(o.images, k, o.mj), '150mm')}${lieuxHtml(categoriesDe(c, k, o.mj), 2)}${o.mj ? secret(notesMj(k)) : ''}`, { ajuster: true, id: k.id }));
    }
  }
  return partie('peuples', 'Peuples, pays et villes', morceaux, entrees);
}

export function calendrierCampagne(c: Campagne): Partie | null {
  const r = reference(c), t = tempsDe(c);
  const ms = marques(c).filter((m) => m.date.an === t.date.an);
  return partie('calendrier', `Calendrier — an ${t.date.an}`, [page(`<p class="sous">Calendrier ${r.civ ? sansLes(r.civ.nom).replace(/^/, 'des ') : 'de la campagne'} · aujourd’hui : ${e(dateLisible(t.date, r.cal))}</p>
    ${anneeHtml(r.cal, t.date.an, ms, t.date).replace('class="cal-annee"', 'class="cal-annee" style="grid-template-columns:repeat(3,1fr)"')}
    ${ms.length ? `<h3>Cette année</h3><div class="cols2">${ms.map((m) => `<p><b>${e(dateLisible(m.date, r.cal))}</b> — ${e(m.titre)}</p>`).join('')}</div>` : ''}`, { ajuster: true })]);
}

export function chronologie(c: Campagne): Partie | null {
  const r = reference(c);
  const ms = marques(c).sort((a, b) => absolu(a.date, r.cal) - absolu(b.date, r.cal));
  if (!ms.length) return null;
  const evts = new Map((c.evenements ?? []).map((x) => [x.titre, x]));
  return partie('chronologie', 'Chronologie', [flux(ms.map((m) => bloc('', `<p><b>${e(dateLisible(m.date, r.cal))}</b> — <b>${e(m.titre)}</b></p>${m.texte ? `<p>${texte(m.texte)}</p>` : ''}${m.sorte === 'evenement' ? secret(notesMj(evts.get(m.titre) ?? {})) : ''}`)).join(''))]);
}
