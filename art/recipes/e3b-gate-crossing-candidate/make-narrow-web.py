"""Derive gate crossing candidates with the wall-tested .20 diagonal web."""
from pathlib import Path
import json

folder = Path(__file__).resolve().parent
for mask in (65, 24):
    name = f'e3b-gate-crossing-{mask}-candidate'
    recipe = json.loads((folder / f'{name}.json').read_text(encoding='utf-8'))
    web = next(p for p in recipe['primitives'] if p['name'].endswith('WallWeb'))
    web['dimensions'][1] = .20
    recipe['id'] = f'e3b-gate-crossing-{mask}-narrow-web-candidate'
    recipe['metadata']['version'] = 2
    recipe['metadata']['note'] += ' Web narrowed to 0.20; candidate only.'
    path = folder / f"{recipe['id']}.json"
    path.write_text(json.dumps(recipe, indent=2) + '\n', encoding='utf-8')
    print(path)
