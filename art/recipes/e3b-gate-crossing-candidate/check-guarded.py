"""Sweep the published gate routes against candidate stone parapet boxes."""
from pathlib import Path
import hashlib
import json
import math

folder = Path(__file__).resolve().parent
root = folder.parents[2]
routes = {
    65: [(.79,-.25),(.79,.5),(.5,.5),(-.2,1.2)],
    24: [(-.25,.79),(.5,.79),(.5,.5),(1.2,-.2)],
}

def inside(p, x, z):
    cx, negz = p['location'][:2]
    a = math.radians(-p.get('rotationDegrees',[0,0,0])[2])
    u = (x-cx)*math.cos(a) + (z+negz)*math.sin(a)
    v = -(x-cx)*math.sin(a) + (z+negz)*math.cos(a)
    return abs(u) < p['dimensions'][0]/2-1e-7 and abs(v) < p['dimensions'][1]/2-1e-7

reports = []
for mask, route in routes.items():
    name = f'e3b-gate-crossing-{mask}-guarded-candidate'
    data = (folder / f'{name}.json').read_bytes()
    pieces = json.loads(data)['primitives']
    guards = [p for p in pieces if p['name'].endswith('Parapet')]
    collisions = []
    samples = 0
    for start, end in zip(route, route[1:]):
        steps = math.ceil(math.dist(start,end)/.005)
        for step in range(steps+1):
            t = step/steps
            cx = start[0]*(1-t)+end[0]*t
            cz = start[1]*(1-t)+end[1]*t
            for radius in (0,.175,.35):
                for angle in ((0,) if radius == 0 else range(72)):
                    theta = 2*math.pi*angle/72
                    x,z = cx+radius*math.cos(theta),cz+radius*math.sin(theta)
                    samples += 1
                    if any(inside(p,x,z) for p in guards):
                        collisions.append([x,z,radius,angle])
    reports.append({'mask':mask,'source':name,'sha256':hashlib.sha256(data).hexdigest(),
                    'route':route,'radius':.35,'samples':samples,
                    'collisions':len(collisions),'firstCollisions':collisions[:8]})
out = root/'artifacts/graphics/E3b2-candidates/round-4/gate-guarded-sweep.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({'reports':reports,'limit':'Samples new straight-side parapets only; existing floor sweep is separate. Diagonal-side parapets, support and game collision remain open.'},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'output':str(out),'cases':[{'mask':r['mask'],'samples':r['samples'],'collisions':r['collisions']} for r in reports]}))
if any(r['collisions'] for r in reports):
    raise SystemExit(1)
