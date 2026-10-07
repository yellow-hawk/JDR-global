// Lecture d'un bloc de statistiques collé (SRD, anglais ou français) → modèle de créature.
import type { Modele } from './types';

export function lireBlocStats(texte: string): Modele {
  const t = texte.trim();
  const premiere = t.split('\n')[0]?.trim() || '?';
  const m: Modele = {
    nom: premiere, camp: 'ennemi', pvMax: 20, ca: 10, vitesse: 6,
    carac: { for: 10, dex: 10, con: 10, int: 10, sag: 10, cha: 10 },
    taille: 1, notes: t.slice(0, 300), auras: [], vision: 12, degats: '1d8', couleur: null, bonusAttaque: null, persoId: null, portrait: null,
  };
  const pv = t.match(/(?:HP|PV|Hit Points|Points de vie)[:\s]*(\d+)/i);
  if (pv) m.pvMax = +pv[1];
  const ca = t.match(/(?:AC|CA|Armor Class|Classe d'armure)[:\s]*(\d+)/i);
  if (ca) m.ca = +ca[1];
  const vit = t.match(/(?:Speed|Vitesse)[:\s]*(\d+)\s*(ft|m|pieds)?/i);
  if (vit) m.vitesse = Math.max(1, Math.round(vit[2] && /ft|pieds/i.test(vit[2]) ? +vit[1] / 5 : vit[2] === 'm' ? +vit[1] / 1.5 : +vit[1] > 15 ? +vit[1] / 5 : +vit[1]));
  const st = t.match(/(?:STR|FOR)\s*(\d+)[\s\S]*?DEX\s*(\d+)[\s\S]*?CON\s*(\d+)[\s\S]*?INT\s*(\d+)[\s\S]*?(?:WIS|SAG)\s*(\d+)[\s\S]*?CHA\s*(\d+)/i);
  if (st) m.carac = { for: +st[1], dex: +st[2], con: +st[3], int: +st[4], sag: +st[5], cha: +st[6] };
  const dg = t.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
  if (dg) m.degats = dg[1].replace(/\s+/g, '');
  const taille = t.match(/\b(Tiny|Small|Medium|Large|Huge|Gargantuan|TP|P|M|G|TG|Gig)\b/);
  if (taille) m.taille = ({ Large: 2, G: 2, Huge: 3, TG: 3, Gargantuan: 4, Gig: 4 } as Record<string, 1 | 2 | 3 | 4>)[taille[1]] ?? 1;
  return m;
}
