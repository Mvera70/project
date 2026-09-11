# -*- coding: utf-8 -*-
"""G-10 - La piedra del vado."""
import io, json, os, sys
sys.path.insert(0, 'tools/art/lots')
from lot_village import cube, cyl, recipe, mat, D  # noqa: E402

STONE = mat('stone', 'stone', 1.0)

RECIPES = [recipe(
    'ford-stone', 'ford-stone', [1, 1], [STONE],
    # Una losa ancha y baja, con una lasca al lado. Baja porque el agua la tapa
    # casi entera: lo que se ve es el lomo, no la piedra.
    [cube('Ford_Slab', 1.5, 1.5, 0.16, 1.9, 1.5, 0.32, 'stone'),
     cube('Ford_Chip', 2.5, 1.05, 0.1, 0.8, 0.7, 0.2, 'stone'),
     cyl('Ford_Round', 0.7, 2.1, 0.11, 0.42, 0.22, 'stone', 6)],
    'G-10. Losa de paso del vado. El motor sabe donde esta el vado desde M-10 '
    '-es donde llegan los forasteros y de donde sale la caceria del lobo- y en '
    'la escena no habia nada ahi: el rio se cruzaba por el aire.',
    ortho=2.4, target_z=0.2)]

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
                          ('source', 'Original ford-stone authored for The Valley G-10'),
                          ('license', 'Project original')])),
    ]))
io.open('art/catalog.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(catalog, indent=2, ensure_ascii=False) + u'\n')
print(' '.join(item['id'] for item in RECIPES))
