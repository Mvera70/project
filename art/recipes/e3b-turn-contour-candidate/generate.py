"""Cuatro codos cardinales: recetas CPU, sin ejecutar Blender ni publicar recursos."""
from pathlib import Path
import sys
sys.dont_write_bytecode = True
import importlib.util
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'artifacts/graphics/E3b2-candidates/turn-review-01'
SOURCE = HERE.parent / 'e3b-contour-joint-candidate/generate.py'
spec = importlib.util.spec_from_file_location('contour_source', SOURCE)
contour = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contour)
cube, polygon, rails, transform = contour.cube, contour.polygon, contour.rails, contour.transform

def save_json(path, data):
    if path.exists():
        if json.loads(path.read_text(encoding='utf-8')) != data:
            raise ValueError(f'No se sobrescribe evidencia diferente: {path}')
        return
    with path.open('x', encoding='utf-8') as out:
        json.dump(data, out, indent=2); out.write('\n')

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    template = HERE.parent / 'e3b-walkway-turn-candidate/e3b-walkway-turn-braced-candidate.json'
    base = json.loads(template.read_text(encoding='utf-8'))
    base['primitives'] = [
        cube('CornerDeck', (.33,.8), (1.27,.8), .94, .93, 1.02),
        cube('NorthDeck', (.8,-.5), (.8,.33), .94, .93, 1.02),
        cube('WestDeck', (-.5,.8), (.33,.8), .94, .93, 1.02),
        cube('NorthBearing', (.5,-.5), (.5,.6), .20, .70, .93),
        cube('WestBearing', (-.5,.5), (.6,.5), .20, .70, .93),
        cube('NorthCorbel', (.65,-.5), (.65,.9), .70, .80, .93),
        cube('WestCorbel', (-.5,.65), (.9,.65), .70, .80, .93),
        cube('CornerCap', (.4,.85), (1.2,.85), .70, .85, .93),
    ]
    portals = [dict(center=[-.5,.8], normal=[-1,0], width=.94),
               dict(center=[.8,-.5], normal=[0,-1], width=.94)]
    guards, _ = rails(base['primitives'][:3], portals)
    base['primitives'] += guards
    base['metadata'] = dict(kind='e3b-turn-contour-candidate', version=1, cellUnit=1, footprint=[1.77,1.77],
        floorY=1.02, routeXZ=[[-.5,.8],[.8,.8],[.8,-.5]], portals=portals,
        status='candidate_unexported', testedBodyRadius=.35,
        note='CPU geometry only; cardinal elbows with explicit exterior contour and two open connectors.',
        treeCondition='Placement requires actual dispersed mature-trunk clearance; wait for ordinary felling if overlapping.')
    sources = []
    for quarter, mask in enumerate([9,3,6,12]):
        recipe = transform(base, quarter, False)
        recipe['id'] = f'e3b-turn-contour-{mask}-candidate'
        recipe['metadata']['wallMask'] = mask
        path = HERE / (recipe['id']+'.json')
        # Repetir verifica igualdad semántica y no reemplaza archivos existentes.
        save_json(path, recipe)
        sources.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                            cubes=len(recipe['primitives']),materials=1,estimatedTriangles=12*len(recipe['primitives'])))
    report=dict(recipes=sources, references=[dict(path=p.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in [SOURCE,template]],
                exported=False,published=False)
    save_json(OUT/'sources.json', report)
    print(json.dumps(sources))

if __name__ == '__main__': main()
