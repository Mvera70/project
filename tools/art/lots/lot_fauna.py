# -*- coding: utf-8 -*-
"""G-10 - Lote de la fauna. 7.7: la cabana y lo que ronda alrededor.

Todo en metros. Una vaca mide metro y medio de largo, que es una vaca y no un
caballo. Lo que importa a la escala del valle no es el detalle: es la silueta y
el tamano relativo, porque a esta distancia lo unico que separa a una gallina
de un cerdo es cual de los dos es mas grande.
"""
import io, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lot_village import cube, cyl, sphere, cone, recipe, mat, D  # noqa: E402

HIDE = mat('hide', 'timber', 0.95)                # pardo: vaca y cerdo
HIDE_DARK = mat('hide-dark', 'timberDark', 0.95)  # cuervo, lobo, pezunas
PALE = mat('pale', 'plaster', 0.9)                # gallina, vientre
COMB = mat('comb', 'clothAccent', 0.9)            # cresta y patas de la gallina
FIN = mat('fin', 'stone', 0.6)                    # pez

RECIPES = []


def legs(name, w, d, height, material, thickness=0.09):
    """Cuatro patas en las esquinas del cuerpo."""
    out = []
    for index, (sx, sy) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)]):
        out.append(cube('%s_Leg_%d' % (name, index), sx * w, sy * d, height / 2,
                        thickness, thickness, height, material))
    return out


# --- la cabana --------------------------------------------------------------
RECIPES.append(recipe(
    'cow', 'cow', [1, 1], [HIDE, PALE, HIDE_DARK],
    legs('Cow', 0.55, 0.28, 0.62, 'hide-dark', 0.11) + [
        cube('Cow_Body', 0.0, 0.0, 0.95, 1.55, 0.62, 0.66, 'hide'),
        cube('Cow_Patch', 0.18, 0.0, 0.97, 0.55, 0.64, 0.5, 'pale'),
        cube('Cow_Neck', -0.82, 0.0, 0.98, 0.35, 0.4, 0.42, 'hide'),
        cube('Cow_Head', -1.06, 0.0, 1.02, 0.36, 0.32, 0.34, 'pale'),
        cyl('Cow_Tail', 0.8, 0.0, 0.72, 0.05, 0.55, 'hide-dark', 5),
    ],
    'G-10, lote de fauna. Vaca: metro y medio de largo, cuerpo con mancha clara, '
    'cuello aparte y cola. La mancha es lo que la separa del cerdo cuando las dos '
    'son manchas pardas de cuatro pixeles.',
    ortho=2.6, target_z=0.7))

RECIPES.append(recipe(
    'pig', 'pig', [1, 1], [PALE, HIDE_DARK],
    legs('Pig', 0.3, 0.16, 0.26, 'hide-dark', 0.08) + [
        sphere('Pig_Body', 0.0, 0.0, 0.44, 0.32, 'pale', 8, 6),
        cube('Pig_Trunk', 0.0, 0.0, 0.44, 0.78, 0.42, 0.42, 'pale'),
        cone('Pig_Snout', -0.46, 0.0, 0.42, 0.15, 0.26, 'pale', 6),
        cyl('Pig_Tail', 0.42, 0.0, 0.52, 0.035, 0.18, 'pale', 4),
    ],
    'G-10, lote de fauna. Cerdo: ochenta centimetros, bajo y redondo. Redondo a '
    'proposito, porque lo bajo y lo ancho es lo unico que lo distingue de la vaca '
    'a esta distancia.',
    ortho=1.6, target_z=0.4))

RECIPES.append(recipe(
    'hen', 'hen', [1, 1], [PALE, COMB],
    [cube('Hen_Leg_A', -0.03, -0.05, 0.06, 0.035, 0.035, 0.12, 'comb'),
     cube('Hen_Leg_B', -0.03, 0.05, 0.06, 0.035, 0.035, 0.12, 'comb'),
     sphere('Hen_Body', 0.0, 0.0, 0.24, 0.15, 'pale', 7, 5),
     sphere('Hen_Head', -0.17, 0.0, 0.36, 0.075, 'pale', 6, 4),
     cube('Hen_Comb', -0.17, 0.0, 0.44, 0.06, 0.03, 0.06, 'comb'),
     cone('Hen_Tail', 0.17, 0.0, 0.32, 0.09, 0.18, 'pale', 5),
     cone('Hen_Beak', -0.24, 0.0, 0.35, 0.035, 0.08, 'comb', 4)],
    'G-10, lote de fauna. Gallina: cuarenta centimetros con la cola alta. La cola '
    'levantada y la cresta son la silueta; el cuerpo por si solo seria una piedra '
    'pequena.',
    ortho=0.9, target_z=0.25))

# --- lo que ronda -----------------------------------------------------------
RECIPES.append(recipe(
    'wolf', 'wolf', [1, 1], [HIDE_DARK, PALE],
    legs('Wolf', 0.4, 0.16, 0.44, 'hide-dark', 0.07) + [
        cube('Wolf_Body', 0.0, 0.0, 0.62, 1.05, 0.34, 0.34, 'hide-dark'),
        cube('Wolf_Head', -0.62, 0.0, 0.66, 0.34, 0.26, 0.26, 'hide-dark'),
        cone('Wolf_Snout', -0.84, 0.0, 0.62, 0.1, 0.2, 'pale', 5),
        cone('Wolf_Ear_A', -0.6, -0.09, 0.83, 0.06, 0.12, 'hide-dark', 4),
        cone('Wolf_Ear_B', -0.6, 0.09, 0.83, 0.06, 0.12, 'hide-dark', 4),
        cyl('Wolf_Tail', 0.62, 0.0, 0.5, 0.06, 0.42, 'hide-dark', 5, (0, 60, 0)),
    ],
    'G-10, lote de fauna. Lobo: mas largo y mas bajo que la vaca, oscuro, con las '
    'orejas de punta y la cola caida. Lo que tiene que leerse desde arriba es que '
    'no es del pueblo.',
    ortho=2.0, target_z=0.5))

RECIPES.append(recipe(
    'crow', 'crow', [1, 1], [HIDE_DARK],
    [cube('Crow_Leg_A', -0.02, -0.04, 0.05, 0.025, 0.025, 0.1, 'hide-dark'),
     cube('Crow_Leg_B', -0.02, 0.04, 0.05, 0.025, 0.025, 0.1, 'hide-dark'),
     sphere('Crow_Body', 0.0, 0.0, 0.19, 0.11, 'hide-dark', 6, 5),
     sphere('Crow_Head', -0.13, 0.0, 0.27, 0.06, 'hide-dark', 6, 4),
     cone('Crow_Beak', -0.21, 0.0, 0.27, 0.03, 0.09, 'hide-dark', 4),
     cone('Crow_Tail', 0.16, 0.0, 0.19, 0.07, 0.22, 'hide-dark', 4)],
    'G-10, lote de fauna. Cuervo: treinta centimetros, todo negro, con la cola '
    'larga. Solo aparece con la mies en pie, asi que su trabajo es leerse como '
    'bicho sobre el campo y no como piedra.',
    ortho=0.8, target_z=0.2))

RECIPES.append(recipe(
    'fish', 'fish', [1, 1], [FIN],
    [sphere('Fish_Body', 0.0, 0.0, 0.1, 0.09, 'fin', 7, 5),
     cube('Fish_Trunk', 0.0, 0.0, 0.1, 0.34, 0.1, 0.14, 'fin'),
     cone('Fish_Tail', 0.22, 0.0, 0.1, 0.11, 0.16, 'fin', 4),
     cube('Fish_Fin', 0.0, 0.0, 0.19, 0.14, 0.03, 0.1, 'fin')],
    'G-10, lote de fauna. Pez: cuarenta centimetros con la aleta fuera. La aleta '
    'es lo unico que se ve desde arriba, y por eso sobresale del lomo.',
    ortho=0.8, target_z=0.15))

catalog = json.load(io.open('art/catalog.json', encoding='utf-8'), object_pairs_hook=D)
have = {asset['id'] for asset in catalog['assets']}
for item in RECIPES:
    asset_id = item['id']
    os.makedirs('art/recipes/%s' % asset_id, exist_ok=True)
    io.open('art/recipes/%s/%s.json' % (asset_id, asset_id), 'w', encoding='utf-8', newline='\n').write(
        json.dumps(item, indent=2, ensure_ascii=False) + u'\n')
    if asset_id in have:
        continue
    catalog['assets'].append(D([
        ('id', asset_id), ('artifactRound', 'G-10'), ('status', 'study'),
        ('recipe', 'art/recipes/%s/%s.json' % (asset_id, asset_id)),
        ('generator', 'tools/art/blender-build.py'), ('blenderVersion', '5.2.1 LTS'),
        ('approved', None), ('bounds', None), ('recipeSha256', None),
        ('materials', []), ('clips', []), ('motion', []), ('connectors', []),
        ('statistics', None), ('hashes', None),
        ('provenance', D([('kind', 'original'),
                          ('source', 'Original %s authored for The Valley G-10' % asset_id),
                          ('license', 'Project original')])),
    ]))
io.open('art/catalog.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(catalog, indent=2, ensure_ascii=False) + u'\n')
print(' '.join(item['id'] for item in RECIPES))
