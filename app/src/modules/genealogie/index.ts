// API publique du module « Généalogie ». Voir MODULE.md.
export { definition } from './definition';
export { familleDepuisPersonnage, dynastieDepuisCivilisation, separerTitre } from './generateur';
export { ajouterFamille, familleDuPersonnage, civilisationDe, modifierFamille, modifierMembre } from './logique';
export { ageDeLaFiche } from './generateur';
export { disposer as disposerFamille } from './disposition';
