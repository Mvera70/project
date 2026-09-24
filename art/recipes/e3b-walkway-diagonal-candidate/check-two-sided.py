"""Sweep a radius-.35 body through the two-sided diagonal vertex."""
from pathlib import Path
import hashlib
import json
import math

folder = Path(__file__).resolve().parent
root = folder.parents[2]
parts = []
hashes = {}
for direction, cell in (('se', 0), ('nw', 1)):
    name = f'e3b-walkway-diagonal-two-sided-{direction}-candidate'
    data = (folder / f'{name}.json').read_bytes()
    hashes[name] = hashlib.sha256(data).hexdigest()
    recipe = json.loads(data)
    for p in recipe['primitives']:
        if p['name'] not in ('Deck', 'OuterParapet', 'InnerParapet'):
            continue
        parts.append((p, cell))

def contains(part, cell, x, z, epsilon=1e-8):
    cx, negative_z = part['location'][:2]
    cx += cell
    cz = -negative_z + cell
    angle = math.radians(-part['rotationDegrees'][2])
    dx, dz = x-cx, z-cz
    u = dx*math.cos(angle) + dz*math.sin(angle)
    v = -dx*math.sin(angle) + dz*math.cos(angle)
    return abs(u) <= part['dimensions'][0]/2 + epsilon and abs(v) <= part['dimensions'][1]/2 + epsilon

misses = []
collisions = []
count = 0
for step in range(121):
    t = .85 + .30*step/120
    for radius in (0, .175, .35):
        angles = (0,) if radius == 0 else range(72)
        for angle in angles:
            theta = 2*math.pi*angle/72
            x = t + radius*math.cos(theta)
            z = t + radius*math.sin(theta)
            count += 1
            if not any(p['name'] == 'Deck' and contains(p,c,x,z) for p,c in parts):
                misses.append([t, radius, angle, x, z])
            if any(p['name'].endswith('Parapet') and contains(p,c,x,z,epsilon=-1e-7)
                   for p,c in parts):
                collisions.append([t, radius, angle, x, z])

report = {'sources': hashes, 'worldCells': [[0,0],[1,1]], 'floorY': 1.02,
          'sweep': {'centersXEqualsZ': [.85, 1.15], 'centers': 121,
                    'radii': [0,.175,.35], 'directions': 72, 'samples': count},
          'unsupportedSamples': len(misses), 'parapetCollisions': len(collisions),
          'firstUnsupported': misses[:8], 'firstCollisions': collisions[:8],
          'limit': 'CPU primitive footprint only; does not prove support load, mesh export, turning transitions, or gameplay collision.'}
out = root / 'artifacts/graphics/E3b2-candidates/round-4/diagonal-two-sided-sweep.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'output': str(out), 'samples': count,
                  'unsupportedSamples': len(misses), 'parapetCollisions': len(collisions)}))
if misses or collisions:
    raise SystemExit(1)
