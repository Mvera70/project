# -*- coding: utf-8 -*-
"""G-10 · Lote de la ruina. §7.4: una casa perdida se queda en el mapa."""
import io, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lot_village import cube, cyl, recipe, mat, D  # noqa: E402

STONE = mat('stone', 'stone', 1.0)
SOIL = mat('soil', 'soil', 1.0)
# La madera quemada es el papel oscuro de la paleta, pero el de la casa de
# teja y no el de la de paja: el de paja es un marron claro y una viga
# carbonizada de color madera no dice que aqui hubo un incendio.
CHAR = mat('char', 'timberDark', 1.0)

RECIPES = []

RECIPES.append(recipe(
    'ruin-wood', 'ruin-wood', [2, 2], [CHAR],
    [cube('Ruin_Scorch', 3.0, 3.0, 0.03, 6.2, 6.2, 0.06, 'char'),
     # Cuatro postes de lo que fue la casa, rotos a alturas distintas. Que
     # ninguno llegue arriba es lo que dice que el tejado ya no esta.
     cyl('Ruin_Post_A', 0.8, 0.8, 0.85, 0.2, 1.7, 'char', 6),
     cyl('Ruin_Post_B', 5.2, 0.9, 0.55, 0.2, 1.1, 'char', 6),
     cyl('Ruin_Post_C', 0.9, 5.1, 0.4, 0.2, 0.8, 'char', 6),
     cyl('Ruin_Post_D', 5.1, 5.2, 1.0, 0.2, 2.0, 'char', 6),
     # Una viga caida entre dos de ellos: la casa no se borro, se vino abajo.
     cube('Ruin_Beam_A', 3.0, 2.2, 0.28, 4.6, 0.28, 0.28, 'char'),
     cube('Ruin_Beam_B', 2.4, 3.6, 0.2, 0.26, 3.4, 0.26, 'char'),
     cube('Ruin_Sill', 3.0, 0.85, 0.22, 4.2, 0.3, 0.35, 'char')],
    'G-10, lote de la ruina. Una casa de madera despues del fuego: la tierra '
    'quemada, cuatro postes rotos a alturas distintas y dos vigas caidas. §7.4 '
    'deja la ruina en el mapa, asi que tiene que leerse que ahi hubo una casa '
    'y que ya no la hay.',
    ortho=8.0, target_z=0.8, house='tiled'))

RECIPES.append(recipe(
    'ruin-stone', 'ruin-stone', [2, 2], [STONE, SOIL],
    [cube('Ruin_Floor', 3.0, 3.0, 0.05, 6.2, 6.2, 0.1, 'soil'),
     # Lienzos de muro desiguales. La piedra no arde: lo que queda no son
     # postes, son paredes a medio caer, y §7.4 dice que sobre esta nadie
     # vuelve a construir.
     cube('Ruin_Wall_N', 3.0, 0.5, 0.95, 6.0, 0.6, 1.9, 'stone'),
     cube('Ruin_Wall_W', 0.5, 2.2, 0.65, 0.6, 3.0, 1.3, 'stone'),
     cube('Ruin_Wall_E', 5.5, 3.8, 0.4, 0.6, 2.4, 0.8, 'stone'),
     cube('Ruin_Stub', 4.6, 5.5, 0.3, 1.6, 0.6, 0.6, 'stone'),
     cube('Ruin_Rubble_A', 2.4, 4.4, 0.18, 1.1, 0.9, 0.36, 'stone'),
     cube('Ruin_Rubble_B', 4.0, 2.0, 0.14, 0.8, 0.8, 0.28, 'stone')],
    'G-10, lote de la ruina. Una casa de piedra caida: tres lienzos de muro de '
    'alturas muy distintas y dos monton de cascote. Desiguales a proposito, '
    'porque cuatro muros parejos serian un edificio en obras.',
    ortho=8.0, target_z=0.9))

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
