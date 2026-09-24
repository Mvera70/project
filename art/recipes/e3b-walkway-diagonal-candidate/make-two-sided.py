"""Complete both parapets on the supported collinear diagonal pair."""
from pathlib import Path
import json

folder = Path(__file__).resolve().parent
for direction in ('se', 'nw'):
    name = f'e3b-walkway-diagonal-supported-{direction}-candidate'
    source = json.loads((folder / f'{name}.json').read_text(encoding='utf-8'))
    deck = next(p for p in source['primitives'] if p['name'] == 'Deck')
    outer = next(p for p in source['primitives'] if p['name'] == 'OuterParapet')
    inner = json.loads(json.dumps(outer))
    inner['name'] = 'InnerParapet'
    inner['location'][:2] = [2 * deck['location'][axis] - outer['location'][axis]
                             for axis in range(2)]
    source['primitives'].append(inner)
    source['id'] = f'e3b-walkway-diagonal-two-sided-{direction}-candidate'
    source['metadata']['version'] = 2
    source['metadata']['note'] = ('Supported collinear diagonal half with both parapets; '
                                  'trim parapets for changes of direction. Candidate only.')
    path = folder / f"{source['id']}.json"
    path.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8')
    print(path)
