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
import mathutils
from mathutils.bvhtree import BVHTree
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.clothesservice import ClothesService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.entities.objectproperties import HumanObjectProperties

RACINE = globals().get('RACINE_JDR') or r"D:\projet claude\projet JDR Global"
import importlib.util, sys
_spec = importlib.util.spec_from_file_location('textures_tenues', os.path.join(RACINE, 'blender', 'scripts', 'textures_tenues.py'))
textures_tenues = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(textures_tenues)
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
        k.value = 0.0  # Blender 5 crée les clés à 1 : le GLB doit avoir des poids par défaut nuls
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


def bvh_peau(h, corps0):
    """Arbre de recherche de la peau (faces du groupe 'body') au neutre."""
    gb = h.vertex_groups['body'].index
    dans = np.zeros(len(h.data.vertices), bool)
    for v in h.data.vertices:
        if any(g.group == gb for g in v.groups):
            dans[v.index] = True
    faces = [p.vertices[:] for p in h.data.polygons if dans[list(p.vertices)].all()]
    return BVHTree.FromPolygons([mathutils.Vector(c) for c in corps0], faces)


def os_dominant(h, noms_os):
    """Index -> nom de l'os de plus fort poids (ou None)."""
    par_index = {g.index: g.name for g in h.vertex_groups if g.name in noms_os}
    res = [None] * len(h.data.vertices)
    for v in h.data.vertices:
        meilleur = max((g for g in v.groups if g.group in par_index), key=lambda g: g.weight, default=None)
        if meilleur:
            res[v.index] = par_index[meilleur.group]
    return res


TEXTURE_PAR_SLOT = {'haut': 'tissu', 'bas': 'tissu', 'cape': 'tissu', 'tete': 'tissu', 'pieds': 'cuir', 'ceinture': 'cuir', 'mains': 'cuir',
                    'bras': 'cuir', 'armure': 'mailles', 'epaules': 'metal', 'barbe': 'poils'}
DENSITE = {'tissu': 5.0, 'cuir': 3.0, 'mailles': 8.0, 'metal': 2.0, 'poils': 9.0}  # répétitions de texture par mètre


def materiau_tenue(slot, metal, sorte):
    """Matériau Tenue.<slot>.<sorte> : texture grise (teintée par l'app) + normal map, métal ou non."""
    nom = f'Pilosite.{slot}' if sorte == 'poils' else f'Tenue.{slot}.{sorte}'
    m = bpy.data.materials.get(nom) or bpy.data.materials.new(nom)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    for n in [n for n in nt.nodes if n.type in ('TEX_IMAGE', 'NORMAL_MAP')]:
        nt.nodes.remove(n)
    couleur, normale = textures_tenues.textures(sorte)
    tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = couleur
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = normale
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
    if sorte == 'poils':
        nt.links.new(tc.outputs['Alpha'], bsdf.inputs['Alpha'])
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Metallic'].default_value = 0.85 if metal else 0.0
    bsdf.inputs['Roughness'].default_value = 0.4 if metal else (0.6 if sorte == 'cuir' else 0.88)
    return m


def uv_boite(o, densite):
    """UV en projection cubique à l'échelle réelle : la texture garde la même taille partout."""
    me = o.data
    uv = me.uv_layers.new(name='UVTenue')
    for uvl in [u for u in me.uv_layers if u.name != 'UVTenue']:
        me.uv_layers.remove(uvl)
    co = np.array([v.co for v in me.vertices])
    for p in me.polygons:
        n = np.abs(np.array(p.normal))
        axes = (0, 1) if n[2] >= max(n[0], n[1]) else ((1, 2) if n[0] >= n[1] else (0, 2))
        for li in p.loop_indices:
            c = co[me.loops[li].vertex_index]
            uv.data[li].uv = (c[axes[0]] * densite, c[axes[1]] * densite)


def construire_tenue(h, rig, t, corps0, deltas_corps, peau, dominant):
    """Découpe une tenue dans les aides du corps : mêmes sommets, donc mêmes morphs, même squelette."""
    me = h.data
    n = len(me.vertices)
    gardes_faces = set()
    for part in t['parties']:
        ga = h.vertex_groups[part['aide']].index
        exclus = {h.vertex_groups[g].index for g in part.get('exclure', [])}
        ok = np.zeros(n, bool)
        for v in me.vertices:
            if not any(g.group == ga and g.weight > 0.5 for g in v.groups):
                continue
            z = corps0[v.index][2]
            if z < part.get('zmin', -9) or z > part.get('zmax', 9):
                continue
            if 'os' in part and dominant[v.index] not in part['os']:
                continue
            x, y = corps0[v.index][0], corps0[v.index][1]
            if abs(x) > part.get('xmax', 9) or y > part.get('ymax', 9):
                continue
            if any(z > zl and abs(x) < xl for xl, zl in part.get('trous', [])):
                continue  # trous : (|x| max, z min) — narines au-dessus de la moustache…
            if exclus and any(g.group in exclus for g in v.groups if g.weight > 0.3):
                continue
            if any(abs(x) < xb and y < yb and zb0 < z < zb1 for xb, yb, zb0, zb1 in part.get('exclure_boites', [])):
                continue  # ouvertures (visage d'une capuche…)
            ok[v.index] = True
        if part.get('dos'):
            # moitié arrière : y au-delà du centre de la tranche horizontale (l'avant du corps est vers -Y)
            sel = np.flatnonzero(ok)
            for i in sel:
                tranche = sel[np.abs(corps0[sel, 2] - corps0[i, 2]) < 0.03]
                if corps0[i, 1] < corps0[tranche, 1].mean() - 0.01:
                    ok[i] = False
        for p in me.polygons:
            idx = list(p.vertices)
            if ok[idx].all():
                gardes_faces.add(p.index)
    bm = bmesh.new()
    bm.from_mesh(me)
    orig = bm.verts.layers.int.new('orig')
    for v in bm.verts:
        v[orig] = v.index
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in gardes_faces], context='FACES_ONLY')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    indices = np.array([v[orig] for v in bm.verts])
    nom = f"{t['slot']}-{t['id']}"
    data = bpy.data.meshes.new(nom)
    bm.to_mesh(data)
    bm.free()
    o = bpy.data.objects.new(nom, data)
    bpy.context.collection.objects.link(o)
    if data.shape_keys:
        o.shape_key_clear()
    for g in [g for g in h.vertex_groups]:
        o.vertex_groups.new(name=g.name)
    # poids : copie des groupes d'os du corps (les aides sont déjà pondérées)
    noms_os = {b.name for b in rig.data.bones}
    for i, src in enumerate(indices):
        for g in me.vertices[src].groups:
            nom_g = h.vertex_groups[g.group].name
            if nom_g in noms_os and g.weight > 0:
                o.vertex_groups[nom_g].add([i], g.weight, 'REPLACE')
    for g in [g for g in o.vertex_groups if g.name not in noms_os]:
        o.vertex_groups.remove(g)
    # écart à la peau : on pousse le long de la normale jusqu'à t['ecart']
    neutre = corps0[indices].copy()
    data.vertices.foreach_set('co', neutre.ravel())
    data.update()
    normales = np.array([v.normal for v in data.vertices])
    pousse = np.zeros(len(neutre))
    for i, p in enumerate(neutre):
        loc, nrm, _, dist = peau.find_nearest(mathutils.Vector(p))
        if loc is None:
            continue
        signe = 1 if (mathutils.Vector(p) - loc).dot(nrm) > 0 else -1
        pousse[i] = max(0.0, t['ecart'] - signe * dist)
    # 'couche' : décalage constant pour superposer les vêtements (bas < haut < armure < ceinture < cape)
    # 'volume' : [z, pente] l'écart augmente de pente × (z − hauteur) sous z (barbe fournie)
    if 'volume' in t:
        zv, pente = t['volume']
        pousse = pousse + np.clip(zv - neutre[:, 2], 0, None) * pente
    neutre = neutre + normales * (pousse + t.get('couche', 0.0))[:, None]
    if t.get('drape'):
        # tombé : de haut en bas, chaque colonne ne revient jamais vers le corps (pas de creux au bas du dos)
        colonnes = np.round(neutre[:, 0] / 0.025).astype(int)
        for c in np.unique(colonnes):
            idx = np.flatnonzero(colonnes == c)
            idx = idx[np.argsort(-neutre[idx, 2])]
            neutre[idx, 1] = np.maximum.accumulate(neutre[idx, 1])
    deltas = {m: d[indices] for m, d in deltas_corps.items()}
    cles = ajouter_cles(o, neutre, deltas)
    for p in data.polygons:
        p.use_smooth = True
    sorte = t.get('texture') or ('metal' if t['id'] == 'plastron' else TEXTURE_PAR_SLOT.get(t['slot'], 'tissu'))
    uv_boite(o, DENSITE[sorte])
    data.materials.clear()
    data.materials.append(materiau_tenue(t['slot'], t.get('metal'), sorte))
    o['jdr_materiau'] = data.materials[0].name
    o.parent = rig
    mod = o.modifiers.new('Armature', 'ARMATURE')
    mod.object = rig
    return o, cles


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

        # Tenues découpées dans les aides du corps
        peau = bvh_peau(h, corps0)
        dominant = os_dominant(h, {b.name for b in rig.data.bones})
        tenues = []
        for t in CONFIG.get('tenues', []):
            o, cles = construire_tenue(h, rig, t, corps0, deltas_corps, peau, dominant)
            tenues.append((t, o, cles))
        note('tenues', len(tenues), round(time.time() - t0, 1), 's')

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
        for t, o, cles in tenues:
            manifeste['assets'].append({'slot': t['slot'], 'id': t['id'], 'objet': o.name, 'label': t['label'],
                                        'materiau': o['jdr_materiau'], 'metal': bool(t.get('metal')), 'masque': t.get('masque', []),
                                        'fichier': f"{t['slot']}/{t['id']}.glb",
                                        'sommets': len(o.data.vertices), 'morphs': cles})
        # Export (le dossier est vidé : il reflète exactement la configuration)
        import shutil
        shutil.rmtree(SORTIE, ignore_errors=True)
        exporter([corps] + parties, rig, os.path.join(SORTIE, 'base.glb'))
        for a in manifeste['assets']:
            exporter([bpy.data.objects[a['objet']]], rig, os.path.join(SORTIE, a['fichier']))
        manifeste['duree_s'] = round(time.time() - t0, 1)
        with open(os.path.join(SORTIE, 'manifeste.json'), 'w', encoding='utf-8') as f:
            json.dump(manifeste, f, ensure_ascii=False, indent=1)
        note('export terminé', manifeste['duree_s'], 's')
        return manifeste


resultat = construire()
