// Parties « jeu » du livre (pur) : autres cartes, quêtes, séances, personnages (PJ : une feuille ; autres : quatre
// par feuille), familles, arbres de talents, documents, rencontres, grimoire. Images déjà prêtes dans `images`.
import type { Campagne, Personnage } from '../../../noyau/contrat';
import type { SystemeRegles } from '../../../noyau/regles';
import { aUneFiche, lireStat } from '../../../noyau/regles';
import { tousLesArbres } from '../../../noyau/talents';
import { anneeActuelle, dateLisible, reference } from '../../chronologie';
import { arbreSvg, civilisationDe } from '../../genealogie';
import { arbreTalentsSvg, ficheCorpsHtml, libelleSorte } from '../../personnages';
import { categoriesDe, lieuxHtml } from './lieux';
import type { Images } from './monde';
import { bloc, champ, dessin, e, flux, liste, page, partie, secret, texte, visuel, type Partie } from './outils';

const notesMj = (x: { mj?: unknown }) => (x.mj as { notes?: string } | undefined)?.notes;
const nomPerso = (c: Campagne, id: string) => c.personnages.find((p) => p.id === id)?.nom;

/** Cartes (hors pays et villes, déjà dans leurs feuilles) : la carte sur sa feuille, sa légende par catégories. */
export function cartes(c: Campagne, ids: Set<string>, images: Images, mj: boolean): Partie | null {
  const l = c.cartes.filter((k) => ids.has(k.id));
  if (!l.length) return null;
  const morceaux = l.flatMap((k) => {
    const img = images.get((mj && k.images.mj?.image) || k.images.joueurs || '');
    const cats = categoriesDe(c, k, mj);
    const peu = k.reperes.length <= 10;
    const carte = page(`<h2>${e(k.nom)}</h2><p class="sous">${e(k.type)}${k.echelle ? ` · 1 px = ${k.echelle.metresParPixel.toFixed(2)} m` : ''}</p>${visuel(img?.url)}${!img ? '<p class="discret">(image indisponible)</p>' : ''}${peu ? lieuxHtml(cats, img?.large ? 4 : 3) : ''}`, { paysage: !!img?.large, id: k.id });
    return peu || !cats.length ? [carte] : [carte, page(`<h2>${e(k.nom)} : légende</h2>${lieuxHtml(cats, 3)}${mj ? secret(notesMj(k)) : ''}`, { ajuster: true })];
  });
  return partie('cartes', 'Cartes', morceaux, l.map((k) => ({ id: k.id, titre: k.nom })));
}

const STATUT: Record<string, string> = { 'a-venir': 'à venir', 'en-cours': 'en cours', terminee: 'terminée', abandonnee: 'abandonnée' };

export function quetes(c: Campagne, ids: Set<string>): Partie | null {
  const l = c.quetes.filter((q) => ids.has(q.id));
  if (!l.length) return null;
  return partie('quetes', 'Quêtes', [flux(l.map((q) => bloc(q.titre, [
    `<p class="discret">${e([q.sorte, STATUT[q.statut ?? 'a-venir']].filter(Boolean).join(' · '))}</p>`,
    q.resume ? `<p>${texte(q.resume)}</p>` : '',
    q.etapes?.length ? `<ol>${q.etapes.map((x) => `<li><b>${e(x.titre)}</b>${x.lieu ? ` <span class="discret">(${e(x.lieu)})</span>` : ''} — ${texte(x.joueurs)}${secret(notesMj(x))}</li>`).join('')}</ol>` : '',
    champ('Lieux', [...(q.lieuxTexte ?? []), ...q.lieux.map((r) => c.cartes.find((k) => k.id === r.id)?.nom).filter(Boolean)].join(', ')),
    champ('Personnages', q.personnages.map((r) => nomPerso(c, r.id)).filter(Boolean).join(', ')),
    q.recompenses?.length ? champ('Récompenses', q.recompenses.join(' ; ')) : '',
    secret(notesMj(q)),
  ].join(''), q.id)).join(''))], l.map((q) => ({ id: q.id, titre: q.titre })));
}

export function seances(c: Campagne, ids: Set<string>): Partie | null {
  const r = reference(c);
  const l = c.seances.filter((s) => ids.has(s.id)).sort((a, b) => a.numero - b.numero);
  if (!l.length) return null;
  return partie('seances', 'Journal des séances', [flux(l.map((s) => bloc(`Séance ${s.numero}`,
    `<p class="discret">Jouée le ${e(new Date(s.date).toLocaleDateString('fr-FR'))}${s.dateMonde ? ` · dans le monde : ${e(dateLisible(s.dateMonde, r.cal))}` : ''}</p>${s.resume ? `<p>${texte(s.resume)}</p>` : ''}${secret(notesMj(s))}`)).join(''))]);
}

/** Carte d'un personnage (quart de feuille) : portrait, identité, chiffres utiles, description, secrets. */
function cartePnj(c: Campagne, p: Personnage, R: SystemeRegles, portrait: string | null): string {
  const calc = aUneFiche(R) && p.fiche ? R.calculer(p) : null;
  const d = (cle: string) => calc?.derives.find((x) => x.cle === cle)?.texte;
  const espece = aUneFiche(R) ? R.catalogue.peuples.find((x) => x.id === p.fiche?.identite?.espece)?.nom : undefined;
  const classes = aUneFiche(R) ? (p.fiche?.progression?.classes ?? []).map((x) => `${R.catalogue.classes.find((y) => y.id === x.id)?.nom ?? x.id} ${x.niveau}`).join(' / ') : '';
  const stats = calc
    ? [`CA ${d('ca')}`, `PV ${String(p.combat.stats.pvMax ?? '?')}`, `Init. ${d('initiative')}`, `Niv. ${calc.niveau}`, ...calc.attaques.slice(0, 2).map((a) => `${a.nom} ${a.bonus >= 0 ? '+' : ''}${a.bonus} (${a.degats})`)]
    : R.champs.slice(0, 6).map((ch) => { const v = lireStat(p.combat.stats, ch.cle); return v === undefined || v === '' ? '' : `${ch.libelle} ${String(v)}`; }).filter(Boolean);
  const perso = p.fiche?.personnalite ?? {};
  const mj = [notesMj(p), (p.relations ?? []).map((x) => `${x.sorte} : ${nomPerso(c, x.vers.id) ?? '?'}`).join(' ; ')].filter(Boolean).join('\n');
  return `<div class="carte-pnj ajuster" id="${p.id.replace(/[^a-zA-Z0-9_-]/g, '_')}"><div class="tete">${portrait ? `<img src="${portrait}" alt="">` : ''}<div><h3>${e(p.nom)}</h3>
    <p class="discret">${e([libelleSorte(p.sorte), p.role, espece, classes, p.fiche?.identite?.age && `${p.fiche.identite.age} ans`].filter(Boolean).join(' · '))}</p></div></div>
    ${stats.length ? `<div class="stats">${stats.map((s) => `<span>${e(s)}</span>`).join('')}</div>` : ''}
    ${p.notes ? `<p>${texte(p.notes)}</p>` : ''}
    ${[perso.traits, perso.ideaux, perso.liens, perso.defauts].filter(Boolean).length ? `<p class="discret">${e([perso.traits, perso.ideaux, perso.liens, perso.defauts].filter(Boolean).join(' · '))}</p>` : ''}
    ${secret(mj)}</div>`;
}

export function personnages(c: Campagne, ids: Set<string>, R: SystemeRegles, images: Images): Partie | null {
  const ordre = ['pj', 'allie', 'pnj', 'neutre', 'ennemi'];
  const l = c.personnages.filter((p) => ids.has(p.id)).sort((a, b) => ordre.indexOf(a.sorte) - ordre.indexOf(b.sorte) || a.nom.localeCompare(b.nom, 'fr'));
  if (!l.length) return null;
  const portrait = (p: Personnage) => (p.portrait ? images.get(p.portrait)?.url ?? null : null);
  const pj = l.filter((p) => p.sorte === 'pj'), autres = l.filter((p) => p.sorte !== 'pj');
  const morceaux = pj.map((p) => page(aUneFiche(R) && p.fiche ? ficheCorpsHtml(p, R, R.calculer(p), portrait(p)) + secret(notesMj(p)) : `<div class="grille-pnj">${cartePnj(c, p, R, portrait(p))}</div>`, { ajuster: true, id: p.id }));
  for (let i = 0; i < autres.length; i += 4) morceaux.push(page(`<div class="grille-pnj">${autres.slice(i, i + 4).map((p) => cartePnj(c, p, R, portrait(p))).join('')}</div>`));
  return partie('personnages', 'Personnages', morceaux, l.map((p) => ({ id: p.id, titre: `${p.nom} (${libelleSorte(p.sorte)})` })));
}

export function familles(c: Campagne, ids: Set<string>): Partie | null {
  const l = (c.familles ?? []).filter((f) => ids.has(f.id));
  if (!l.length) return null;
  return partie('familles', 'Arbres généalogiques', l.map((f) => {
    const an = anneeActuelle(c, civilisationDe(c, f.peuple ?? null));
    return page(`<h2>${e(f.nom)}</h2><p class="sous">${f.membres.length} personnes · année en cours : ${an}${f.sorte === 'dynastie' ? ' · ♛ années de règne' : ''}</p>${dessin(arbreSvg(f, an))}`, { paysage: true, id: f.id });
  }), l.map((f) => ({ id: f.id, titre: f.nom })));
}

export function talents(c: Campagne, ids: Set<string>): Partie | null {
  const l = tousLesArbres().filter((a) => ids.has(`arbre:${a.id}`));
  if (!l.length) return null;
  const morceaux = l.flatMap((a) => {
    const acquis = c.personnages.filter((p) => (p.fiche?.progression?.talents ?? []).some((t) => t.startsWith(`${a.id}.`)))
      .map((p) => `${p.nom} : ${(p.fiche?.progression?.talents ?? []).filter((t) => t.startsWith(`${a.id}.`)).map((t) => a.branches.flatMap((b) => b.noeuds).find((n) => n.id === t)?.nom ?? t).join(', ')}`);
    const desc = a.branches.map((b) => `<div><h3 style="color:${e(b.couleur ?? '#4a3218')}">${e(b.nom)}</h3>${[...b.noeuds].sort((x, y) => x.rang - y.rang).map((n) =>
      `<p><b>${e(n.icone ?? '')} ${e(n.nom)}</b> <span class="discret">(niv. ${n.niveau}, ${n.cout} pt${n.sorte ? `, ${n.sorte}` : ''})</span> — ${e(n.texte)}</p>`).join('')}</div>`).join('');
    return [
      page(`<h2>${e(a.nom)}</h2>${a.texte ? `<p class="sous">${e(a.texte)}</p>` : ''}${dessin(arbreTalentsSvg(a))}`, { paysage: true, id: `arbre:${a.id}` }),
      page(`<h2>${e(a.nom)} : les talents</h2><div class="cols3 talents-liste">${desc}</div>${acquis.length ? `<h3>Talents acquis</h3>${liste(acquis)}` : ''}`, { ajuster: true }),
    ];
  });
  return partie('talents', 'Arbres de talents', morceaux, l.map((a) => ({ id: `arbre:${a.id}`, titre: a.nom })));
}

export function documents(c: Campagne, ids: Set<string>, images: Images): Partie | null {
  const l = (c.documents ?? []).filter((d) => ids.has(d.id));
  if (!l.length) return null;
  return partie('documents', 'Documents', l.map((d) => {
    const img = d.image ? images.get(d.image) : undefined;
    return page(`<h2>${e(d.titre)}</h2>${d.texte ? `<div style="flex:none">${texte(d.texte)}</div>` : ''}${visuel(img?.url)}${secret(notesMj(d))}`, { ajuster: !img, id: d.id });
  }), l.map((d) => ({ id: d.id, titre: d.titre })));
}

export function rencontres(c: Campagne, ids: Set<string>): Partie | null {
  const l = c.rencontres.filter((r) => ids.has(r.id));
  if (!l.length) return null;
  return partie('rencontres', 'Rencontres', [flux(l.map((r) => {
    const jetons = ((r.table as { jetons?: { nom: string; camp: string; pvMax: number; ca: number }[] } | null)?.jetons ?? []).filter((j) => j.camp !== 'pj');
    return bloc(r.nom, [
      champ('Carte', r.carte ? c.cartes.find((k) => k.id === r.carte!.id)?.nom : ''),
      champ('Quête', r.quete ? c.quetes.find((q) => q.id === r.quete!.id)?.titre : ''),
      jetons.length ? `<p>${jetons.map((j) => `<b>${e(j.nom)}</b> (CA ${j.ca}, ${j.pvMax} PV)`).join(' · ')}</p>` : '',
      secret(notesMj(r)),
    ].join(''), r.id);
  }).join(''))]);
}

export function sorts(c: Campagne, ids: Set<string>): Partie | null {
  const l = c.sorts.filter((s) => ids.has(s.id)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  if (!l.length) return null;
  return partie('sorts', 'Grimoire', [flux(`<div class="cols2">${l.map((s) => `<p><b>${e(s.nom)}</b>${s.categorie ? ` <span class="discret">${e(s.categorie)}</span>` : ''}${s.proprietaire ? ` — ${e(nomPerso(c, s.proprietaire.id) ?? '')}` : ''}${s.notes ? `<br>${texte(s.notes)}` : ''}</p>`).join('')}</div>`)]);
}
