// Logique pure du module Monde : univers générés (Atlas) ou faits main, import des PNJ de l'Atlas.
import type { Campagne, Personnage, Univers } from '../../noyau/contrat';
import { nouvelUnivers, nouveauPersonnage } from '../../noyau/contrat';
import type { SystemeRegles } from '../../noyau/regles';
import type { EtatAtlas, PnjAtlas } from './pont';

/** Enregistre le ciel affiché dans l'Atlas : met à jour l'univers `id` s'il est donné, sinon en crée un. */
export function enregistrerUnivers(c: Campagne, etat: EtatAtlas, id?: string | null): { campagne: Campagne; id: string } {
  const nom = etat.monde.nom ? `${etat.monde.nom} (${etat.entry.name})` : etat.entry.name;
  const existant = id ? c.univers.find((u) => u.id === id) : undefined;
  if (existant) {
    const maj: Univers = { ...existant, sorte: 'genere', atlas: etat.entry };
    return { campagne: { ...c, univers: c.univers.map((u) => (u.id === id ? maj : u)) }, id: existant.id };
  }
  const u: Univers = { ...nouvelUnivers(nom, 'genere'), atlas: etat.entry };
  return { campagne: { ...c, univers: [...c.univers, u] }, id: u.id };
}

export function ajouterUniversFaitMain(c: Campagne, nom: string): { campagne: Campagne; id: string } {
  const u = nouvelUnivers(nom, 'fait-main');
  return { campagne: { ...c, univers: [...c.univers, u] }, id: u.id };
}

export function modifierUnivers(c: Campagne, id: string, f: (u: Univers) => Univers): Campagne {
  return { ...c, univers: c.univers.map((u) => (u.id === id ? f(u) : u)) };
}

export function supprimerUnivers(c: Campagne, id: string): Campagne {
  return { ...c, univers: c.univers.filter((u) => u.id !== id) };
}

/**
 * Ajoute les PNJ des quêtes de l'Atlas comme personnages (sans doublon de nom).
 * Les secrets et motivations vont dans le bloc MJ ; l'antagoniste principal est un ennemi caché aux joueurs.
 */
export function importerPnj(c: Campagne, pnj: PnjAtlas[], R: SystemeRegles): { campagne: Campagne; ajoutes: number } {
  const noms = new Set(c.personnages.map((p) => p.nom.toLowerCase()));
  const nouveaux: Personnage[] = [];
  for (const n of pnj) {
    if (noms.has(n.nom.toLowerCase())) continue;
    noms.add(n.nom.toLowerCase());
    const sorte = n.antagoniste ? 'ennemi' : 'pnj';
    const stats = R.statsPourProfil({ role: n.role, description: `${n.apparence}. ${n.humeur}.`, sorte, antagoniste: n.antagoniste, graine: `${n.nom}|${n.peuple}` });
    const p = nouveauPersonnage(n.nom, sorte, R.id, stats);
    nouveaux.push({
      ...p, role: n.role,
      peuple: { atlas: String(n.peuple) },
      notes: `${cap(n.role)}, ${n.peupleNom}. ${cap(n.apparence)}. ${cap(n.humeur)}.\n« ${n.citation.replace(/^«\s*|\s*»$/g, '')} »`,
      mj: { notes: `Veut : ${n.veut}.\nSecret : ${n.secret}`, ...(n.antagoniste ? { cache: true, antagoniste: true } : {}) },
    });
  }
  return { campagne: { ...c, personnages: [...c.personnages, ...nouveaux] }, ajoutes: nouveaux.length };
}

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
