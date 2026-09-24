"""Create a separate turn candidate with a diagonal brace anchored in the wall hub."""
from pathlib import Path
import json
import math

folder = Path(__file__).resolve().parent
source = folder / 'e3b-walkway-turn-candidate.json'
destination = folder / 'e3b-walkway-turn-braced-candidate.json'
recipe = json.loads(source.read_text(encoding='utf-8'))
recipe['id'] = 'e3b-walkway-turn-braced-candidate'
recipe['metadata']['version'] = 2
recipe['metadata']['note'] = ('West to north elbow with diagonal brace embedded in the real '
                              'wall hub; candidate only.')
recipe['primitives'].append({
    'type': 'cube', 'name': 'CornerDiagonalBrace',
    'location': [.67, -.67, .725],
    'dimensions': [.54, .20, .39],
    'material': 'stone', 'parent': 'Root',
    'rotationDegrees': [0, 0, -45],
})
destination.write_text(json.dumps(recipe, indent=2) + '\n', encoding='utf-8')
print(destination)
