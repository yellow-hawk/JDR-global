// Lecture des fichiers de carte dans le navigateur : images (taille) et PDF (première page en PNG).

export const ACCEPTE = 'image/png,image/jpeg,image/webp,application/pdf,.pdf';

/** Dimensions en pixels d'une image. */
export async function tailleImage(b: Blob): Promise<{ l: number; h: number }> {
  const bmp = await createImageBitmap(b);
  const t = { l: bmp.width, h: bmp.height };
  bmp.close();
  return t;
}

/** Première page d'un PDF rendue en PNG (largeur visée 4000 px). pdf.js n'est chargé qu'à ce moment. */
export async function pdfVersImage(b: Blob, largeurVisee = 4000): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await b.arrayBuffer()) }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const echelle = Math.min(8, largeurVisee / base.width);
  const vp = page.getViewport({ scale: echelle });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
  await doc.cleanup();
  return new Promise((ok, ko) => canvas.toBlob((x) => (x ? ok(x) : ko(new Error('Rendu PDF impossible'))), 'image/png'));
}

/** Prépare un fichier choisi : convertit un PDF en image, renvoie le contenu et le nom final. */
export async function preparer(f: File): Promise<{ contenu: Blob; nom: string }> {
  if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
    return { contenu: await pdfVersImage(f), nom: f.name.replace(/\.pdf$/i, '.png') };
  }
  return { contenu: f, nom: f.name };
}
