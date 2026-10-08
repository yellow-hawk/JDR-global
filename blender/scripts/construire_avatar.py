# Construit l'avatar humain de JDR Global de bout en bout, sans manipulation à la main :
# humain MPFB neutre + squelette + yeux/dents/langue, morphs calculés (macros et cibles MakeHuman),
# assets (coiffures, sourcils, cils, vêtements) ajustés au corps et dotés des MÊMES morphs,
# puis export GLB brut dans blender/export/ (optimisé ensuite par blender/scripts/optimiser.mjs).
#
# Lancer dans Blender (extension MPFB installée) :
#   exec(open(r"<racine>/blender/scripts/construire_avatar.py", encoding="utf-8").read())
# La scène courante est remplacée (rien n'est enregistré dans le .blend maître).
import bpy, bmesh, json, os, time
import numpy as np
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.clothesservice import ClothesService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.entities.objectproperties import HumanObjectProperties

RACINE = globals().get('RACINE_JDR') or r"D:\projet claude\projet JDR Global"
CONFIG = json.load(open(os.path.join(RACINE, 'blender', 'avatar.json'), encoding='utf-8'))
SORTIE = os.path.join(RACINE, 'blender', 'export')
SEUIL = 1e-5  # en dessous (en m), un morph ne déplace pas l'objet : il n'est pas exporté pour lui
DONNEES_UTILISATEUR = LocationService.get_user_data()
CIBLES = os.path.join(LocationService.get_mpfb_data(), 'targets')
TYPES_MHCLO = {'eyes': 'Eyes', 'teeth': 'Teeth', 'tongue': 'Tongue', 'eyebrows': 'Eyebrows',
               'eyelashes': 'Eyelashes', 'hair': 'Hair', 'clothes': 'Clothes'}
journal = []


def note(*a):
    s = ' '.join(str(x) for x in a)
    journal.append(s)
    print('[avatar]', s)


def contexte():
    w = bpy.context.window_manager.windows[0]
    a = next(x for x in w.screen.areas if x.type == 'VIEW_3D')
    r = next(x for x in a.regions if x.type == 'WINDOW')
    return bpy.context.temp_override(window=w, area=a, region=r, scene=w.scene, view_layer=w.view_layer)


def chemin_cible(cible):
    p = os.path.join(CIBLES, cible + '.target.gz')
    if os.path.exists(p):
        return p
    nom = os.path.basename(cible) + '.target.gz'  # catégorie inconnue : on cherche partout
    for dossier, _, fichiers in os.walk(CIBLES):
        if nom in fichiers:
            return os.path.join(dossier, nom)
    raise FileNotFoundError(cible)


def chemin_mhclo(typ, source):
    if source.endswith('.mhclo'):
        return os.path.join(DONNEES_UTILISATEUR, typ, source)
    return os.path.join(DONNEES_UTILISATEUR, typ, source, source + '.mhclo')


def coords_corps(h):
    k = h.shape_key_add(name='__mix', from_mix=True)
    a = np.empty(len(k.data) * 3, dtype=np.float32)
    k.data.foreach_get('co', a)
    h.shape_key_remove(k)
    return a.reshape(-1, 3)


def coords_objet(o):
    a = np.empty(len(o.data.vertices) * 3, dtype=np.float32)
    o.data.vertices.foreach_get('co', a)
    return a.reshape(-1, 3)


def reajuster(h, objets):
    for o in objets:
        ClothesService.fit_clothes_to_human(o, h)


def etat(h, objets):
    """Coordonnées du corps et de chaque asset dans l'état courant du corps."""
    reajuster(h, objets)
    return coords_corps(h), {o.name: coords_objet(o) for o in objets}


def appliquer_morph(h, m):
    """Met le corps dans l'état du morph m ; renvoie une fonction qui annule."""
    if 'macro' in m:
        avant = {k: HumanObjectProperties.get_value(k, entity_reference=h) for k in m['macro']}
        for k, v in m['macro'].items():
            HumanObjectProperties.set_value(k, v, entity_reference=h)
        TargetService.reapply_macro_details(h)

        def annuler():
            for k, v in avant.items():
                HumanObjectProperties.set_value(k, v, entity_reference=h)
            TargetService.reapply_macro_details(h)
        return annuler
    TargetService.load_target(h, chemin_cible(m['cible']), weight=1.0, name='__morph')
    return lambda: h.shape_key_remove(h.data.shape_keys.key_blocks['__morph'])


def ajouter_cles(o, neutre, deltas):
    """Remplace les shape keys de o : Basis = neutre, puis une clé par delta non nul."""
    if o.data.shape_keys:
        o.shape_key_clear()
    o.data.vertices.foreach_set('co', neutre.ravel())
    o.shape_key_add(name='Basis', from_mix=False)
    gardes = []
    for nom, d in deltas.items():
        if np.abs(d).max() < SEUIL:
            continue
        k = o.shape_key_add(name=nom, from_mix=False)
        k.data.foreach_set('co', (neutre + d).ravel())
        k.slider_min, k.slider_max = -2.0, 2.0
        gardes.append(nom)
    o.data.update()
    return gardes


def retirer_aides(corps):
    """Supprime les sommets d'aide MakeHuman (hors groupe 'body') ; bmesh conserve les shape keys."""
    g = corps.vertex_groups['body'].index
    bm = bmesh.new()
    bm.from_mesh(corps.data)
    dv = bm.verts.layers.deform.active
    a_jeter = [v for v in bm.verts if g not in v[dv]]
    bmesh.ops.delete(bm, geom=a_jeter, context='VERTS')
    bm.to_mesh(corps.data)
    bm.free()
    for mod in list(corps.modifiers):
        if mod.type == 'MASK':
            corps.modifiers.remove(mod)


def nettoyer_modificateurs(o):
    for mod in list(o.modifiers):
        if mod.type != 'ARMATURE':
            o.modifiers.remove(mod)


def exporter(objets, rig, fichier):
    os.makedirs(os.path.dirname(fichier), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objets + [rig]:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=fichier, export_format='GLB', use_selection=True,
        export_apply=False, export_skins=True, export_morph=True, export_morph_normal=True,
        export_animations=False, export_yup=True, export_extras=False)


def construire():
    t0 = time.time()
    hum = CONFIG['humain']
    bpy.ops.wm.read_homefile(use_empty=False)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    with contexte():
        h = HumanService.create_human(mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True,
                                      feet_on_ground=True, scale=0.1)
        rig = HumanService.add_builtin_rig(h, hum['rig'], import_weights=True)
        HumanService.set_character_skin(os.path.join(DONNEES_UTILISATEUR, 'skins', hum['peau']), h,
                                        skin_type='GAMEENGINE', material_instances=False)
        parties = []
        for typ, cle in [('eyes', 'yeux'), ('teeth', 'dents'), ('tongue', 'langue')]:
            o = HumanService.add_mhclo_asset(chemin_mhclo(typ, hum[cle]), h, asset_type=TYPES_MHCLO[typ],
                                             subdiv_levels=0, material_type='MAKESKIN')
            parties.append(o)
        assets = []
        for a in CONFIG['assets']:
            o = HumanService.add_mhclo_asset(chemin_mhclo(a['type'], a['source']), h,
                                             asset_type=TYPES_MHCLO[a['type']], subdiv_levels=0,
                                             material_type='MAKESKIN')
            o.name = f"{a['slot']}-{a['id']}"
            o['jdr_slot'], o['jdr_id'] = a['slot'], a['id']
            assets.append(o)
        tous = parties + assets
        for o in tous + [h]:
            nettoyer_modificateurs(o) if o is not h else None
        note('humain prêt', len(tous), 'objets', round(time.time() - t0, 1), 's')

        # États : neutre, puis un par morph
        corps0, objets0 = etat(h, tous)
        deltas_corps, deltas_objets = {}, {o.name: {} for o in tous}
        for m in CONFIG['morphs']:
            annuler = appliquer_morph(h, m)
            c, objs = etat(h, tous)
            annuler()
            deltas_corps[m['nom']] = c - corps0
            for nom, co in objs.items():
                deltas_objets[nom][m['nom']] = co - objets0[nom]
        reajuster(h, tous)
        note('morphs calculés', len(CONFIG['morphs']), round(time.time() - t0, 1), 's')

        # Corps exporté : copie du basemesh sans macros ni aides, avec nos clés.
        corps = h.copy()
        corps.data = h.data.copy()
        corps.name = corps.data.name = 'Corps'
        bpy.context.collection.objects.link(corps)
        for vg in [g for g in corps.vertex_groups if g.name.startswith(('helper-', 'joint-'))]:
            pass  # les groupes restent (inoffensifs), seuls les sommets d'aide partent
        cles_corps = ajouter_cles(corps, corps0, deltas_corps)
        retirer_aides(corps)
        h.hide_set(True)
        manifeste = {'corps': {'fichier': 'base.glb', 'sommets': len(corps.data.vertices), 'morphs': cles_corps},
                     'assets': []}
        for o in tous:
            manifeste_o = ajouter_cles(o, objets0[o.name], deltas_objets[o.name])
            if o in assets:
                manifeste['assets'].append({'slot': o['jdr_slot'], 'id': o['jdr_id'], 'objet': o.name,
                                            'fichier': f"{o['jdr_slot']}/{o['jdr_id']}.glb",
                                            'sommets': len(o.data.vertices), 'morphs': manifeste_o})
        # Export
        exporter([corps] + parties, rig, os.path.join(SORTIE, 'base.glb'))
        for a in manifeste['assets']:
            exporter([bpy.data.objects[a['objet']]], rig, os.path.join(SORTIE, a['fichier']))
        manifeste['duree_s'] = round(time.time() - t0, 1)
        with open(os.path.join(SORTIE, 'manifeste.json'), 'w', encoding='utf-8') as f:
            json.dump(manifeste, f, ensure_ascii=False, indent=1)
        note('export terminé', manifeste['duree_s'], 's')
        return manifeste


resultat = construire()
