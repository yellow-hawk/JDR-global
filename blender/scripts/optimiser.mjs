// Optimise les GLB bruts de blender/export/ et les copie dans l'application :
// morphs en accesseurs creux (sparse), géométrie quantifiée + meshopt, textures WebP (≤ 2048 px).
// Copie aussi manifeste.json (liste des morphs par fichier) à côté des assets.
//   cd blender && npm run optimiser
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, quantize, sparse } from '@gltf-transform/functions';
import { EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(ici, '..', 'export');
const CIBLE = join(ici, '..', '..', 'app', 'public', 'avatar', 'assets', 'species', 'human');

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const fichiers = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? fichiers(p) : p.endsWith('.glb') ? [p] : [];
});

// Textures en WebP (textureCompress de gltf-transform échoue avec la version de sharp installée).
const texturesWebp = () => async (doc) => {
  doc.createExtension(EXTTextureWebP).setRequired(true);
  for (const t of doc.getRoot().listTextures()) {
    const img = t.getImage();
    if (!img || t.getMimeType() === 'image/webp') continue;
    const sortie = await sharp(Buffer.from(img))
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    t.setImage(new Uint8Array(sortie)).setMimeType('image/webp').setURI(t.getURI().replace(/\.(png|jpe?g)$/i, '.webp'));
  }
};

let avant = 0, apres = 0;
for (const src of fichiers(SOURCE)) {
  const rel = relative(SOURCE, src);
  const dst = join(CIBLE, rel);
  const doc = await io.read(src);
  await doc.transform(
    dedup(),
    prune(),
    sparse({ ratio: 1 / 3 }),
    texturesWebp(),
    quantize(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  mkdirSync(dirname(dst), { recursive: true });
  await io.write(dst, doc);
  const a = statSync(src).size, b = statSync(dst).size;
  avant += a; apres += b;
  console.log(`${rel.padEnd(28)} ${(a / 1e6).toFixed(2).padStart(6)} Mo → ${(b / 1e6).toFixed(2).padStart(5)} Mo`);
}
copyFileSync(join(SOURCE, 'manifeste.json'), join(CIBLE, 'manifeste.json'));
console.log(`Total : ${(avant / 1e6).toFixed(1)} Mo → ${(apres / 1e6).toFixed(1)} Mo`);
