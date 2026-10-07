// Migrations entre versions du format. Une fonction par saut de version.
// Pour la version 2 : ajouter MIGRATIONS[1] = (o, alertes) => { …transforme v1 en v2… ; return o; }

type Objet = Record<string, unknown>;
type Migration = (o: Objet, alertes: string[]) => Objet;

/** MIGRATIONS[n] transforme un objet de version n en version n + 1. */
const MIGRATIONS: Record<number, Migration> = {};

export function migrer(o: Objet, depuis: number, alertes: string[]): Objet {
  let courant = o;
  for (let v = depuis; MIGRATIONS[v]; v++) {
    courant = MIGRATIONS[v](courant, alertes);
    alertes.push(`Campagne migrée de la version ${v} à ${v + 1}.`);
  }
  return courant;
}
