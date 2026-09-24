"""Barrido CPU independiente del recorrido, sus dos conectores y pretiles."""
import hashlib
import json
import math
from generate import HERE, OUT, polygon, inside, cube, sub, cross, boundary, rails


def point_segment(p,a,b):
    v=sub(b,a); t=max(0,min(1,sum(x*y for x,y in zip(sub(p,a),v))/sum(x*x for x in v)))
    return math.dist(p,[a[k]+t*v[k] for k in (0,1)])


def intersect(a,b,c,d):
    u,v=sub(b,a),sub(d,c); den=cross(u,v)
    if abs(den)<1e-10: return False
    t=cross(sub(c,a),v)/den; s=cross(sub(c,a),u)/den
    return 0<=t<=1 and 0<=s<=1


def clearance(route,polys):
    result=math.inf
    for a,b in zip(route,route[1:]):
        for poly in polys:
            if inside(poly,a) or inside(poly,b): return 0
            for c,d in zip(poly,poly[1:]+poly[:1]):
                if intersect(a,b,c,d): return 0
                result=min(result,point_segment(a,c,d),point_segment(b,c,d),point_segment(c,a,b),point_segment(d,a,b))
    return result


reports=[]
for path in sorted(HERE.glob('e3b-contour-*-candidate.json')):
    raw=path.read_bytes(); recipe=json.loads(raw)
    floors=[p for p in recipe['primitives'] if 'Deck' in p['name']]
    guards=[p for p in recipe['primitives'] if 'Parapet' in p['name']]
    route=recipe['metadata']['routeXZ']
    # Vecinos sintéticos explícitos; acreditan contrato de puerto, no una celda real.
    for portal in recipe['metadata']['portals']:
        a=portal['center']; n=portal['normal']; b=[a[k]+n[k]*.5 for k in (0,1)]
        floors.append(cube('SyntheticNeighbourDeck',a,b,.94,.93,1.02))
        for side in (-1,1):
            offset=[-n[1]*side*.42,n[0]*side*.42]
            guards.append(cube('SyntheticNeighbourParapet',[a[k]+offset[k] for k in (0,1)],
                               [b[k]+offset[k] for k in (0,1)],.1,1.02,1.20))
    fp=[polygon(p) for p in floors]; gp=[polygon(p) for p in guards]
    count=0; holes=[]
    for a,b in zip(route,route[1:]):
        steps=math.ceil(math.dist(a,b)/.005)
        for step in range(steps+1):
            center=[a[k]+(b[k]-a[k])*step/steps for k in (0,1)]
            for radius in (0,.175,.35):
                for j in (range(120) if radius else [0]):
                    angle=j*math.tau/120
                    p=[center[0]+radius*math.cos(angle),center[1]+radius*math.sin(angle)]
                    count+=1
                    if not any(inside(poly,p) for poly in fp):
                        if len(holes)<10: holes.append(p)
    distance=clearance(route,gp)
    original_floors=[p for p in recipe['primitives'] if 'Deck' in p['name']]
    regenerated, contour=rails(original_floors,recipe['metadata']['portals'])
    # Cada arista no abierta se compara con las cajas publicadas en esta receta.
    rail_coverage_failures=0
    for a,b in contour['protectedEdges']:
        dx,dz=sub(b,a); length=math.dist(a,b)
        for i in range(101):
            p=[a[0]+dx*i/100-dz/length*.001,a[1]+dz*i/100+dx/length*.001]
            if not any(inside(poly,p) for poly in gp): rail_coverage_failures+=1
    reports.append(dict(recipe=path.name,sha256=hashlib.sha256(raw).hexdigest(),
                        samples=count,floorMissesFirst10=holes,
                        exactRouteToParapetClearance=distance,designBodyRadius=.32,
                        testedFloorRadius=.35,minimumDiameter=2*distance,
                        railCoverageFailures=rail_coverage_failures,
                        protectedBoundarySegments=len(contour['protectedEdges']),
                        portalBoundarySegments=len(contour['portalEdges']),
                        passCPU=not holes and distance>=.35-1e-8 and rail_coverage_failures==0))
report=dict(reports=reports,limitations=['Floor support sampled; segment-to-rectangle parapet clearance analytic',
  'Synthetic neighbours test matching connectors only; no complete ring assembled',
  'No load, physics, arrow, tree or game traversal approval'])
(OUT/'contour-sweep.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps([{'recipe':r['recipe'],'pass':r['passCPU'],'clearance':r['exactRouteToParapetClearance'],
                   'floorMisses':len(r['floorMissesFirst10']),'railFailures':r['railCoverageFailures']} for r in reports]))
if not all(r['passCPU'] for r in reports): raise SystemExit(1)
