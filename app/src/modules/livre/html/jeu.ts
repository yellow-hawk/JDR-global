// Parties « jeu » du livre (pur) : cartes, quêtes, séances, personnages, généalogies, talents, documents,
// rencontres, grimoire. Les images arrivent déjà prêtes (adresses data:) dans `images`, rangées par id de fichier.
import type { Campagne, Personnage } from '../../../noyau/contrat';
import type { SystemeRegles } from '../../../noyau/regles';
import { aUneFiche, lireStat } from '../../../noyau/regles';
import { tousLesArbres } from '../../../noyau/talents';
import { anneeActuelle, dateLisible, reference } from '../../chronologie';
import { arbreSvg, civilisationDe } from '../../genealogie';
import { arbreTalentsSvg, ficheCorpsHtml, libelleSorte } from '../../personnages';
import { bloc, champ, e, liste, partie, secret, texte, type Partie } from './outils';

export type Images = Map<string, { url: string; large: boolean }>;
const notesMj = (x: { mj?: unknown }) => (x.mj as { notes?: string } | undefined)?.notes;
const nomPerso = (c: Campagne, id: string) => c.personnages.find((p) => p.id === id)?.nom;

export function cartes(c: Campagne, ids: Set<string>, images: Images, versionMj: boolean): Partie | null {
  const l = c.cartes.filter((k) => ids.has(k.id));
  if (!l.length) return null;
  return partie('cartes', 'Cartes', l.map((k) => {
    const id = (versionMj && k.images.mj?.image) || k.images.joueurs || '';
    const img = images.get(id);
    const reperes = k.reperes.map((r) => `${r.nom}${r.desc ? ` — ${r.desc}` : ''}${versionMj && notesMj(r) ? ` (MJ : ${notesMj(r)})` : ''}`);
    return bloc(k.nom, `<p class="discret">${e(k.type)}${k.echelle ? ` · 1 px = ${k.echelle.metresParPixel.toFixed(2)} m` : ''}</p>`
      + (img ? `<img class="carte" src="${img.url}" alt="">` : '<p class="discret">(image indisponible)</p>')
      + (reperes.length ? `<h3>Repères</h3><div class="colonnes">${liste(reperes)}</div>` : '') + secret(notesMj(k)), { paysage: !!img?.large, page: !img?.large });
  }).join(''));
}

const STATUT: Record<string, string> = { 'a-venir': 'à venir', 'en-cours': 'en cours', terminee: 'terminée', abandonnee: 'abandonnée' };

export function quetes(c: Campagne, ids: Set<string>): Partie | null {
  const l = c.quetes.filter((q) => ids.has(q.id));
  if (!l.length) return null;
  return partie('quetes', 'Quêtes', l.map((q) => bloc(q.titre, [
    `<p class="discret">${e([q.sorte, STATUT[q.statut ?? 'a-venir']].filter(Boolean).join(' · '))}</p>`,
    q.resume ? `<p>${texte(q.resume)}</p>` : '',
    q.etapes?.length ? `<h3>Étapes</h3><ol>${q.etapes.map((x) => `<li><b>${e(x.titre)}</b>${x.lieu ? ` <span class="discret">(${e(x.lieu)})</span>` : ''}<br>${texte(x.joueurs)}${secret(notesMj(x))}</li>`).join('')}</ol>` : '',
    champ('Lieux', [...(q.lieuxTexte ?? []), ...q.lieux.map((r) => c.cartes.find((k) => k.id === r.id)?.nom).filter(Boolean)].join(', ')),
    champ('Personnages', q.personnages.map((r) => nomPerso(c, r.id)).filter(Boolean).join(', ')),
    q.recompenses?.length ? `<h3>Récompenses</h3>${liste(q.recompenses)}` : '',
    secret(notesMj(q)),
  ].join(''))).join(''));
}

export function seances(c: Campagne, ids: Set<string>): Partie | null {
  const r = reference(c);
  const l = c.seances.filter((s) => ids.has(s.id)).sort((a, b) => a.numero - b.numero);
  if (!l.length) return null;
  return partie('seances', 'Journal des séances', l.map((s) => bloc(`Séance ${s.numero}`,
    `<p class="discret">Jouée le ${e(new Date(s.date).toLocaleDateString('fr-FR'))}${s.dateMonde ? ` · dans le monde : ${e(dateLisible(s.dateMonde, r.cal))}` : ''}</p>${s.resume ? `<p>${texte(s.resume)}</p>` : ''}${secret(notesMj(s))}`)).join(''));
}

/** Fiche simple (système sans fiche détaillée) : identité, description, stats affichées par le système. */
function ficheSimple(p: Personnage, R: SystemeRegles, portrait: string | null): string {
  const stats = R.champs.map((ch) => { const v = lireStat(p.combat.stats, ch.cle); return v === undefined || v === '' ? null : `${ch.libelle} : ${String(v)}`; }).filter(Boolean);
  return `${portrait ? `<img class="illustration" style="max-height:60mm" src="${portrait}" alt="">` : ''}${champ('Rôle', p.role)}${champ('Joueur', p.joueur)}${p.notes ? `<p>${texte(p.notes)}</p>` : ''}${stats.length ? `<div class="colonnes">${liste(stats)}</div>` : ''}`;
}

export function personnages(c: Campagne, ids: Set<string>, R: SystemeRegles, images: Images): Partie | null {
  const l = c.personnages.filter((p) => ids.has(p.id)).sort((a, b) => ['pj', 'allie', 'pnj', 'neutre', 'ennemi'].indexOf(a.sorte) - ['pj', 'allie', 'pnj', 'neutre', 'ennemi'].indexOf(b.sorte) || a.nom.localeCompare(b.nom, 'fr'));
  if (!l.length) return null;
  return partie('personnages', 'Fiches de personnages', l.map((p) => {
    const portrait = p.portrait ? images.get(p.portrait)?.url ?? null : null;
    const corps = aUneFiche(R) && p.fiche ? ficheCorpsHtml(p, R, R.calculer(p), portrait) : ficheSimple(p, R, portrait);
    const mj = [notesMj(p), (p.relations ?? []).map((x) => `${x.sorte} : ${nomPerso(c, x.vers.id) ?? '?'}${x.texte ? ` (${x.texte})` : ''}`).join(' ; ')].filter(Boolean).join('\n');
    return bloc(aUneFiche(R) && p.fiche ? '' : `${p.nom} (${libelleSorte(p.sorte)})`, corps + secret(mj), { page: true });
  }).join(''));
}

export function genealogies(c: Campagne, ids: Set<string>): Partie | null {
  const l = (c.familles ?? []).filter((f) => ids.has(f.id));
  if (!l.length) return null;
  return partie('genealogie', 'Arbres généalogiques', l.map((f) => {
    const an = anneeActuelle(c, civilisationDe(c, f.peuple ?? null));
    return bloc(f.nom, `<p class="discret">${f.membres.length} personnes · année en cours : ${an} · ♛ années de règne, pointillés : succession sans lien de sang</p><div class="dessin">${arbreSvg(f, an)}</div>`, { paysage: true });
  }).join(''));
}

export function talents(c: Campagne, ids: Set<string>): Partie | null {
  const l = tousLesArbres().filter((a) => ids.has(`arbre:${a.id}`));
  if (!l.length) return null;
  return partie('talents', 'Arbres de talents', l.map((a) => {
    const qui = c.personnages.filter((p) => (p.fiche?.progression?.talents ?? []).some((t) => t.startsWith(`${a.id}.`)));
    const dessin = bloc(a.nom, `${a.texte ? `<p class="discret">${e(a.texte)}</p>` : ''}<div class="dessin">${arbreTalentsSvg(a)}</div>`, { paysage: true });
    const desc = a.branches.map((b) => `<h3 style="color:${e(b.couleur ?? '#4a3218')}">${e(b.nom)}</h3>${[...b.noeuds].sort((x, y) => x.rang - y.rang).map((n) =>
      `<p><b>${e(n.icone ?? '')} ${e(n.nom)}</b> <span class="discret">(rang ${n.rang}, niveau ${n.niveau}, ${n.cout} pt${n.sorte ? `, ${n.sorte}` : ''})</span> — ${e(n.texte)}</p>`).join('')}`).join('');
    const acquis = qui.map((p) => `${p.nom} : ${(p.fiche?.progression?.talents ?? []).filter((t) => t.startsWith(`${a.id}.`)).map((t) => a.branches.flatMap((b) => b.noeuds).find((n) => n.id === t)?.nom ?? t).join(', ')}`);
    return dessin + bloc(`${a.nom} : les talents`, `<div class="colonnes talents-liste">${desc}</div>${acquis.length ? `<h3>Talents acquis</h3>${liste(acquis)}` : ''}`, { page: true });
  }).join(''));
}

export function documents(c: Campagne, ids: Set<string>, images: Images): Partie | null {
  const l = (c.documents ?? []).filter((d) => ids.has(d.id));
  if (!l.length) return null;
  return partie('documents', 'Documents', l.map((d) => {
    const img = d.image ? images.get(d.image) : undefined;
    return bloc(d.titre, `${img ? `<img class="illustration" src="${img.url}" alt="">` : ''}${d.texte ? `<p>${texte(d.texte)}</p>` : ''}${secret(notesMj(d))}`);
  }).join(''));
}

export function rencontres(c: Campagne, ids: Set<string>): Partie | null {
  const l = c.rencontres.filter((r) => ids.has(r.id));
  if (!l.length) return null;
  return partie('rencontres', 'Rencontres', l.map((r) => {
    const jetons = ((r.table as { jetons?: { nom: string; camp: string; pvMax: number; ca: number }[] } | null)?.jetons ?? []);
    const adv = jetons.filter((j) => j.camp !== 'pj').map((j) => `<tr><td>${e(j.nom)}</td><td>${e(j.camp)}</td><td>CA ${j.ca}</td><td>${j.pvMax} PV</td></tr>`).join('');
    return bloc(r.nom, [
      champ('Carte', r.carte ? c.cartes.find((k) => k.id === r.carte!.id)?.nom : ''),
      champ('Quête', r.quete ? c.quetes.find((q) => q.id === r.quete!.id)?.titre : ''),
      adv ? `<table class="tab"><tr><th>Adversaire</th><th>Camp</th><th>CA</th><th>PV</th></tr>${adv}</table>` : '',
      secret(notesMj(r)),
    ].join(''));
  }).join(''));
}

export function sorts(c: Campagne, ids: Set<string>): Partie | null {
  const l = c.sorts.filter((s) => ids.has(s.id)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  if (!l.length) return null;
  return partie('sorts', 'Grimoire', `<div class="colonnes">${l.map((s) => `<p><b>${e(s.nom)}</b>${s.categorie ? ` <span class="discret">${e(s.categorie)}</span>` : ''}${s.proprietaire ? ` — ${e(nomPerso(c, s.proprietaire.id) ?? '')}` : ''}${s.notes ? `<br>${texte(s.notes)}` : ''}</p>`).join('')}</div>`);
}
