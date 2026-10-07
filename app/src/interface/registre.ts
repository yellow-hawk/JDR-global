// Liste des modules affichés par la coquille, dans l'ordre du menu.
// Ajouter un module = créer src/modules/<nom>/ (avec definition + MODULE.md) et l'ajouter ici.
import type { DefinitionModule } from './types';
import { definition as campagne } from '../modules/campagne';
import { definition as monde } from '../modules/monde';
import { definition as cartes } from '../modules/cartes';
import { definition as personnages } from '../modules/personnages';
import { definition as avatar } from '../modules/avatar';
import { definition as magie } from '../modules/magie';
import { definition as combat } from '../modules/combat';
import { definition as journal } from '../modules/journal';
import { definition as pays } from '../modules/pays';
import { definition as genealogie } from '../modules/genealogie';
import { definition as organigrammes } from '../modules/organigrammes';
import { definition as reseau } from '../modules/reseau';
import { definition as documents } from '../modules/documents';
import { definition as chronologie } from '../modules/chronologie';
import { definition as generateurs } from '../modules/generateurs';

export const MODULES: DefinitionModule[] = [campagne, journal, chronologie, documents, monde, pays, cartes, personnages, genealogie, avatar, magie, combat, generateurs, reseau, organigrammes];

export const moduleParId = (id: string): DefinitionModule | undefined => MODULES.find((m) => m.id === id);
