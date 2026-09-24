"""Add measured straight-side parapets to the gate turning pads."""
from pathlib import Path
import json

folder = Path(__file__).resolve().parent

def cube(name, x0, x1, z0, z1):
    return {'type': 'cube', 'name': name,
            'location': [(x0+x1)/2, -(z0+z1)/2, 1.11],
            'dimensions': [x1-x0, z1-z0, .18],
            'material': 'stone', 'parent': 'Root'}

for mask in (65, 24):
    source = folder / f'e3b-gate-crossing-{mask}-narrow-web-candidate.json'
    recipe = json.loads(source.read_text(encoding='utf-8'))
    if mask == 65:
        pieces = [cube('EastTurnParapet', 1.15, 1.27, -.27, 1.27),
                  cube('WestEntranceParapet', .33, .43, -.27, 0)]
    else:
        pieces = [cube('SouthTurnParapet', -.27, 1.27, 1.15, 1.27),
                  cube('NorthEntranceParapet', -.27, 0, .33, .43)]
    recipe['primitives'].extend(pieces)
    recipe['id'] = f'e3b-gate-crossing-{mask}-guarded-candidate'
    recipe['metadata']['version'] = 3
    recipe['metadata']['note'] += (' Straight-side parapets stop before the '
                                  'diagonal turn; diagonal-side guards remain unresolved.')
    path = folder / f"{recipe['id']}.json"
    path.write_text(json.dumps(recipe, indent=2) + '\n', encoding='utf-8')
    print(path)
