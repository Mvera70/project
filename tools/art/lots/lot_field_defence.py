# -*- coding: utf-8 -*-
"""G-10 · Lotes de sustento (campo), defensa y muerte."""
import io, json, collections, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lot_village import cube, gable, cyl, cone, sphere, recipe, mat, D  # noqa: E402

STONE = mat('stone', 'stone', 0.95)
WOOD = mat('wood', 'timber', 0.95)
GRAIN = mat('grain', 'grain', 0.9)
SOIL = mat('soil', 'soil', 1.0)
TILE = mat('roof', 'roof', 0.85)

RECIPES = []

# --- sustento: el campo -----------------------------------------------------
# Tres por dos celdas, o sea nueve por seis metros. Los surcos van a lo largo.
def furrows(material, height, count=5):
    pieces = []
    for index in range(count):
        y = 0.6 + index * 1.2
        pieces.append(cube('Field_Row_%d' % index, 4.5, y, height / 2, 8.4, 0.55, height, material))
    return pieces


RECIPES.append(recipe(
    'field', 'field', [3, 2], [SOIL, GRAIN],
    [cube('Field_Soil', 4.5, 3.0, 0.04, 9.0, 6.0, 0.08, 'soil')] + furrows('grain', 0.5),
    'G-10, lote de sustento. Cinco surcos de mies a lo largo de la parcela. Los '
    'surcos son lo que separa un campo sembrado de un rectangulo de tierra a la '
    'escala del valle, donde nadie va a distinguir una espiga.',
    ortho=11.0, target_z=0.6))

RECIPES.append(recipe(
    'field-cut', 'field-cut', [3, 2], [SOIL],
    [cube('Field_Soil', 4.5, 3.0, 0.04, 9.0, 6.0, 0.08, 'soil')] + furrows('soil', 0.22),
    'G-10, lote de sustento. El mismo campo despues de la siega: los surcos '
    'siguen ahi, mucho mas bajos y del color de la tierra. Que el valle cambie '
    'con la cosecha es lo que G-08 pide de una consecuencia visible.',
    ortho=11.0, target_z=0.4))

# --- defensa ----------------------------------------------------------------
RECIPES.append(recipe(
    'palisade', 'palisade', [1, 1], [WOOD],
    [cyl('Pale_A', 0.55, 1.5, 1.1, 0.22, 2.2, 'wood', 6),
     cyl('Pale_B', 1.5, 1.5, 1.2, 0.22, 2.4, 'wood', 6),
     cyl('Pale_C', 2.45, 1.5, 1.05, 0.22, 2.1, 'wood', 6),
     cube('Pale_Rail', 1.5, 1.5, 1.7, 3.0, 0.16, 0.18, 'wood')],
    'G-10, lote de defensa. Tres estacas de alturas distintas y un travesano. '
    'Desiguales a proposito: una empalizada pareja se lee como una valla de '
    'jardin, y esto es madera clavada deprisa.',
    ortho=4.0, target_z=1.2))

RECIPES.append(recipe(
    'wall', 'wall', [1, 1], [STONE],
    [cube('Wall_Body', 1.5, 1.5, 1.15, 3.0, 1.1, 2.3, 'stone'),
     cube('Wall_Merlon_A', 0.7, 1.5, 2.45, 0.7, 1.1, 0.35, 'stone'),
     cube('Wall_Merlon_B', 2.3, 1.5, 2.45, 0.7, 1.1, 0.35, 'stone')],
    'G-10, lote de defensa. Muro de piedra con dos almenas. Las almenas son la '
    'senal: sin ellas, a la escala del valle un muro y un cobertizo largo son '
    'la misma barra gris.',
    ortho=4.0, target_z=1.3))

RECIPES.append(recipe(
    'watchtower', 'watchtower', [1, 1], [STONE, WOOD, TILE],
    [cube('Tower_Shaft', 1.5, 1.5, 3.0, 2.2, 2.2, 6.0, 'stone'),
     cube('Tower_Gallery', 1.5, 1.5, 6.3, 2.9, 2.9, 0.6, 'wood'),
     cone('Tower_Cap', 1.5, 1.5, 7.4, 1.9, 1.7, 'roof', 4)],
    'G-10, lote de defensa. Seis metros de fuste, una galeria que vuela por '
    'encima y un chapitel. Lo mas alto del valle despues del campanario, que es '
    'de lo que sirve una atalaya.',
    ortho=9.0, target_z=4.0))

# --- muerte -----------------------------------------------------------------
RECIPES.append(recipe(
    'grave-yard', 'grave-yard', [2, 2], [STONE, SOIL],
    [cube('Yard_Ground', 3.0, 3.0, 0.05, 5.8, 5.8, 0.1, 'soil'),
     cube('Yard_Stone_A', 1.7, 1.9, 0.45, 0.5, 0.16, 0.9, 'stone'),
     cube('Yard_Stone_B', 3.1, 1.6, 0.4, 0.5, 0.16, 0.8, 'stone'),
     cube('Yard_Stone_C', 4.4, 2.1, 0.5, 0.5, 0.16, 1.0, 'stone'),
     cube('Yard_Stone_D', 2.2, 3.9, 0.42, 0.5, 0.16, 0.85, 'stone'),
     cube('Yard_Stone_E', 3.8, 4.2, 0.46, 0.5, 0.16, 0.92, 'stone'),
     cube('Yard_Cross_V', 3.0, 5.1, 0.75, 0.18, 0.18, 1.5, 'stone'),
     cube('Yard_Cross_H', 3.0, 5.1, 1.2, 0.85, 0.18, 0.18, 'stone')],
    'G-10. Cinco lapidas a alturas y sitios distintos, y una cruz al fondo. '
    'Alineadas y todas iguales pareceria un almacen de bloques; torcidas y '
    'desiguales se lee lo que es.',
    ortho=8.0, target_z=0.8))

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
