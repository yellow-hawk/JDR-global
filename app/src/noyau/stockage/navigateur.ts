// Échanges de fichiers avec l'ordinateur (téléchargement, sélection).

export function telecharger(contenu: Blob | Uint8Array, nom: string, mime = 'application/octet-stream'): void {
  const blob = contenu instanceof Blob ? contenu : new Blob([contenu as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  // Retirer le lien trop tôt fait perdre le nom du fichier dans certains navigateurs.
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 10_000);
}

/** Ouvre le sélecteur de fichiers. Résout null si l'utilisateur annule. */
export function choisirFichier(accepte: string, multiple = false): Promise<File[] | null> {
  return new Promise((ok) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accepte;
    input.multiple = multiple;
    input.onchange = () => ok(input.files && input.files.length ? [...input.files] : null);
    input.addEventListener('cancel', () => ok(null));
    input.click();
  });
}
