// Génère .ua/graphe-complet.html : tous les nœuds et toutes les couches du graphe Understand-Anything
// sur une seule vue (force-graph, regroupement par couche). Relancer après chaque /understand :
//   node .ua/vue-complete.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const g = JSON.parse(readFileSync(join(ici, 'knowledge-graph.json'), 'utf8'));

// Couche de chaque nœud : directe pour les fichiers, héritée du fichier pour les fonctions et classes.
const coucheDe = new Map();
g.layers.forEach((l, i) => l.nodeIds.forEach((id) => coucheDe.set(id, i)));
const fichierDe = new Map(g.nodes.filter((n) => n.filePath && coucheDe.has(n.id)).map((n) => [n.filePath, coucheDe.get(n.id)]));
for (const e of g.edges) if (e.type === 'contains' && coucheDe.has(e.source)) coucheDe.set(e.target, coucheDe.get(e.source));

const nodes = g.nodes.map((n) => ({
  id: n.id, nom: n.name, type: n.type, chemin: n.filePath ?? '', resume: n.summary ?? '',
  couche: coucheDe.get(n.id) ?? fichierDe.get(n.filePath) ?? -1,
}));
const ids = new Set(nodes.map((n) => n.id));
const links = g.edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({ source: e.source, target: e.target, type: e.type }));
const donnees = {
  projet: g.project.name,
  couches: g.layers.map((l) => ({ nom: l.name, description: l.description })),
  nodes, links,
};

const page = readFileSync(join(ici, 'vue-complete.gabarit.html'), 'utf8')
  .replace('/*DONNEES*/null', JSON.stringify(donnees).replace(/</g, '\\u003c'));
writeFileSync(join(ici, 'graphe-complet.html'), page);
console.log(`graphe-complet.html : ${nodes.length} nœuds, ${links.length} liens, ${g.layers.length} couches`);
