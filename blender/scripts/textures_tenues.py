# Textures procédurales répétables des tenues (512 px) : couleur (grise, teintée par l'app) + normal map.
# Importé par construire_avatar.py ; aucune image externe, résultat déterministe.
import numpy as np
import bpy

TAILLE = 512


def _bruit(rng, n, echelles=(4, 8, 16, 32), poids=(0.5, 0.25, 0.15, 0.1)):
    """Bruit de valeur répétable (somme d'octaves interpolées), dans [0, 1]."""
    total = np.zeros((n, n))
    for e, p in zip(echelles, poids):
        g = rng.random((e, e))
        x = np.linspace(0, e, n, endpoint=False)
        i0 = np.floor(x).astype(int) % e
        i1 = (i0 + 1) % e
        f = x - np.floor(x)
        f = f * f * (3 - 2 * f)
        lig = g[i0][:, i0] * (1 - f)[None, :] + g[i0][:, i1] * f[None, :]
        lig2 = g[i1][:, i0] * (1 - f)[None, :] + g[i1][:, i1] * f[None, :]
        total += p * (lig * (1 - f)[:, None] + lig2 * f[:, None])
    return (total - total.min()) / (np.ptp(total) + 1e-9)


def _hauteur(sorte):
    rng = np.random.default_rng({'tissu': 1, 'cuir': 2, 'mailles': 3, 'metal': 4}[sorte])
    n = TAILLE
    y, x = np.mgrid[0:n, 0:n] / n
    if sorte == 'tissu':  # armure toile : fils alternés
        fils = 48
        a = np.sin(2 * np.pi * fils * x) ** 2
        b = np.sin(2 * np.pi * fils * y) ** 2
        damier = (np.floor(fils * 2 * x) + np.floor(fils * 2 * y)) % 2
        h = np.where(damier > 0, a, b) * 0.6 + 0.4 * _bruit(rng, n, (8, 32, 64), (0.4, 0.4, 0.2))
        couleur = 0.78 + 0.18 * h
    elif sorte == 'cuir':
        h = _bruit(rng, n, (16, 32, 64, 128), (0.3, 0.3, 0.25, 0.15))
        plis = np.abs(_bruit(rng, n, (6, 12), (0.6, 0.4)) - 0.5) < 0.03
        h = h - 0.35 * plis
        couleur = 0.72 + 0.25 * h
    elif sorte == 'mailles':  # anneaux en quinconce
        k = 24
        u, v = x * k, y * k
        dec = (np.floor(v) % 2) * 0.5
        cu, cv = (u + dec) % 1 - 0.5, v % 1 - 0.5
        r = np.sqrt(cu ** 2 + cv ** 2)
        anneau = np.clip(1 - np.abs(r - 0.33) / 0.12, 0, 1)
        h = anneau ** 0.7
        couleur = 0.25 + 0.75 * h * (0.85 + 0.15 * _bruit(rng, n, (8, 16), (0.5, 0.5)))
    else:  # metal brossé
        stries = _bruit(rng, n, (4, 64, 256), (0.2, 0.3, 0.5))
        stries = np.repeat(stries.mean(axis=1, keepdims=True), n, axis=1) * 0.6 + 0.4 * stries
        h = 0.5 + 0.1 * stries
        couleur = 0.82 + 0.16 * stries
    return h, couleur


def _normale(h, force):
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * force
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * force
    nz = np.ones_like(h)
    l = np.sqrt(gx ** 2 + gy ** 2 + nz ** 2)
    return np.stack([(-gx / l + 1) / 2, (-gy / l + 1) / 2, (nz / l + 1) / 2], -1)


FORCE = {'tissu': 3.0, 'cuir': 4.0, 'mailles': 10.0, 'metal': 1.5}


def image(nom, rgb, non_couleur=False):
    img = bpy.data.images.get(nom) or bpy.data.images.new(nom, TAILLE, TAILLE, alpha=False)
    # l'espace colorimétrique d'abord : le changer ensuite régénère l'image (pixels perdus)
    img.colorspace_settings.name = 'Non-Color' if non_couleur else 'sRGB'
    px = np.concatenate([rgb, np.ones(rgb.shape[:2] + (1,))], -1).astype(np.float32)
    img.pixels.foreach_set(px[::-1].ravel())  # Blender : origine en bas à gauche
    img.update()
    img.pack()
    return img


def textures(sorte):
    """(image couleur, image normale) de la sorte, créées une fois par session."""
    nc, nn = f'tenue-{sorte}', f'tenue-{sorte}-normale'
    if nc in bpy.data.images and nn in bpy.data.images:
        return bpy.data.images[nc], bpy.data.images[nn]
    h, c = _hauteur(sorte)
    return image(nc, np.repeat(c[..., None], 3, -1)), image(nn, _normale(h, FORCE[sorte]), True)
