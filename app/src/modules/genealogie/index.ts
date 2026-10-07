// API publique du module « Généalogie ». Voir MODULE.md.
export { definition } from './definition';
export { familleDepuisPersonnage, dynastieDepuisCivilisation, separerTitre } from './generateur';
export { ajouterFamille, familleDuPersonnage, civilisationDe } from './logique';
export { disposer as disposerFamille } from './disposition';
