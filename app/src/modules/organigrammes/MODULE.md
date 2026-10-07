# Module Organigrammes

État : **prêt**. Arbres repliables (SVG, panoramique / zoom, de haut en bas ou de gauche à droite).

| Fichier | Rôle |
|---|---|
| `institutions.json` | Modèle d'institutions par régime (Royaume, Empire, République marchande, Confédération de clans, Théocratie, Conseil des sages, Ligue de cités, défaut) : postes, rôles de PNJ qui conviennent (motif), branche par ville. |
| `logique.ts` | Pur, testé : `organigrammeMonde`, `organigrammeInstitutions` (postes occupés par les PNJ du peuple, sinon « à pourvoir » avec un nom proposé), `organigrammeDynastie` (ligne de succession), `organigrammeQuetes` (quêtes → étapes → rencontres, personnages), `organigrammeCartes` (emboîtement), `organigrammePersonnages`. |
| `Page.tsx` | Choix de l'organigramme, fiche du nœud (« Ouvrir », « Créer ce personnage » pour un poste vacant). Cible `naviguer` : `institutions:<univers>:<clé>`, `dynastie:<famille>`… |

Vue : `src/interface/graphe/VueArbre.tsx`. API publique : `definition`, `organigrammeInstitutions`, `organigrammeMonde`, `organigrammeQuetes`.
