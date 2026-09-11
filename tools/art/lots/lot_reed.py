# -*- coding: utf-8 -*-
"""G-10 · Lote de la orilla: juncos."""
import io, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lot_village import cube, cyl, recipe, mat, D  # noqa: E402

# Los juncos son follaje, no hierba de prado: el papel oscuro los separa del
# verde de la celda para que la orilla se lea como una linea y no como mas prado.
REED = mat('reed', 'foliage', 1.0)
REED_LIGHT = mat('reed-light', 'foliageLight', 1.0)

# Una mata es un manojo de tallos inclinados. Inclinados y no rectos porque un
# junco vertical a esta escala es un palo, y lo que hace que se lea como junco
# es que el manojo se abra.
STEMS = []
LAYOUT = [
    (0.00, 0.00, 1.30, 6, -4, 'reed'),
    (0.22, 0.10, 1.05, -9, 5, 'reed-light'),
    (-0.20, 0.14, 1.15, 7, 8, 'reed'),
    (0.08, -0.22, 0.85, -5, -9, 'reed-light'),
    (-0.14, -0.16, 1.00, 11, 3, 'reed'),
    (0.30, -0.06, 0.72, -12, -6, 'reed-light'),
]
for index, (x, y, height, tilt_x, tilt_y) in enumerate(
        [(a, b, c, d, e) for a, b, c, d, e, _ in LAYOUT]):
    material = LAYOUT[index][5]
    STEMS.append(cyl('Reed_%d' % index, x, y, height / 2, 0.05, height, material, 4,
                     (tilt_x, tilt_y, 0)))

RECIPES = [recipe(
    'reed', 'reed', [1, 1], [REED, REED_LIGHT], STEMS,
    'G-10, lote de la orilla. Un manojo de seis tallos inclinados en dos verdes. '
    'Se planta donde el prado toca el agua: sin nada en el borde, el rio parece '
    'pegado encima del valle en vez de correr por el.',
    ortho=2.2, target_z=0.7)]

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
                          ('source', 'Original reed authored for The Valley G-10'),
                          ('license', 'Project original')])),
    ]))
io.open('art/catalog.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(catalog, indent=2, ensure_ascii=False) + u'\n')
print(' '.join(item['id'] for item in RECIPES))
