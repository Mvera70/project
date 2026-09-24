"""Juntas E3b: contorno exacto de cajas, pretiles y fuentes CPU reproducibles."""
from pathlib import Path
import copy
import hashlib
import json
import math

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'artifacts/graphics/E3b2-candidates/round-5'
EPS = 1e-8


def cube(name, a, b, width, low, high):
    dx, dz = b[0]-a[0], b[1]-a[1]
    return dict(type='cube', name=name,
                location=[(a[0]+b[0])/2, -(a[1]+b[1])/2, (low+high)/2],
                dimensions=[math.hypot(dx,dz), width, high-low],
                rotationDegrees=[0,0,-math.degrees(math.atan2(dz,dx))],
                material='stone', parent='Root')


def polygon(p):
    angle = math.radians(-p.get('rotationDegrees',[0,0,0])[2])
    co, si = math.cos(angle), math.sin(angle)
    x, nz = p['location'][:2]
    w, d = [n/2 for n in p['dimensions'][:2]]
    return [(x+u*co-v*si,-nz+u*si+v*co) for u,v in [(-w,-d),(w,-d),(w,d),(-w,d)]]


def cross(a,b):
    return a[0]*b[1]-a[1]*b[0]


def sub(a,b):
    return (a[0]-b[0],a[1]-b[1])


def lerp(a,b,t):
    return (a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)


def inside(poly,p,tol=EPS):
    return all(cross(sub(b,a),sub(p,a)) >= -tol for a,b in zip(poly,poly[1:]+poly[:1]))


def boundary(polys):
    """Divide aristas en cruces y retiene sólo las que separan unión y exterior."""
    result=[]
    for poly in polys:
        for a,b in zip(poly,poly[1:]+poly[:1]):
            v=sub(b,a); cuts=[0.,1.]
            for other in polys:
                for c,d in zip(other,other[1:]+other[:1]):
                    w=sub(d,c); determinant=cross(v,w)
                    if abs(determinant)>EPS:
                        t=cross(sub(c,a),w)/determinant
                        u=cross(sub(c,a),v)/determinant
                        if -EPS<=t<=1+EPS and -EPS<=u<=1+EPS:
                            cuts.append(max(0,min(1,t)))
            cuts=sorted(set(round(t,12) for t in cuts))
            length=math.dist(a,b)
            for t0,t1 in zip(cuts,cuts[1:]):
                if (t1-t0)*length<EPS: continue
                p=lerp(a,b,(t0+t1)/2)
                outside=(p[0]+v[1]/length*1e-6,p[1]-v[0]/length*1e-6)
                if not any(inside(other,outside) for other in polys):
                    edge=(lerp(a,b,t0),lerp(a,b,t1))
                    if not any(math.dist(edge[0],e[0])+math.dist(edge[1],e[1])<EPS for e in result):
                        result.append(edge)
    return result


def rails(floors, portals):
    """Cada borde exterior lleva pretil salvo las dos secciones de conexión."""
    edges=boundary([polygon(p) for p in floors]); guards=[]; ports=[]; covered=[]
    for a,b in edges:
        mid=lerp(a,b,.5)
        portal=next((q for q in portals if abs(sum((mid[k]-q['center'][k])*q['normal'][k] for k in (0,1)))<EPS),None)
        if portal:
            ports.append([a,b]); continue
        dx,dz=sub(b,a); length=math.dist(a,b); ux,uz=dx/length,dz/length
        # Cara exterior en el borde, 0,10 hacia dentro. Solape de 0,055 en esquinas.
        start=(a[0]-.05*uz-.055*ux,a[1]+.05*ux-.055*uz)
        end=(b[0]-.05*uz+.055*ux,b[1]+.05*ux+.055*uz)
        guards.append(cube(f'ContourParapet{len(guards):02}',start,end,.10,1.02,1.20))
        covered.append([a,b])
    return guards, dict(edges=edges,protectedEdges=covered,portalEdges=ports)


def transform(recipe, quarter, mirror):
    def point(p):
        x,z=p[0]-.5,p[1]-.5
        if mirror: x=-x
        for _ in range(quarter): x,z=-z,x
        return [x+.5,z+.5]
    def vector(v):
        x,z=v
        if mirror: x=-x
        for _ in range(quarter): x,z=-z,x
        return [x,z]
    result=copy.deepcopy(recipe)
    for p in result['primitives']:
        x,z=point([p['location'][0],-p['location'][1]])
        p['location'][:2]=[x,-z]
        theta=math.radians(-p.get('rotationDegrees',[0,0,0])[2])
        v=vector([math.cos(theta),math.sin(theta)])
        p['rotationDegrees']=[0,0,-math.degrees(math.atan2(v[1],v[0]))]
    meta=result['metadata']
    meta['routeXZ']=[point(p) for p in meta['routeXZ']]
    for p in meta['portals']:
        p['center']=point(p['center']); p['normal']=vector(p['normal'])
    meta['orientation']={'quarterTurns':quarter,'mirrorSourceGeometry':mirror,'negativeScale':False}
    return result


def save(recipe):
    path=HERE/(recipe['id']+'.json')
    path.write_text(json.dumps(recipe,indent=2)+'\n',encoding='utf-8')
    return {'path':path.relative_to(ROOT).as_posix(), 'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'primitives':len(recipe['primitives']),'estimatedTriangles':12*len(recipe['primitives'])}


def svg(recipe, contour):
    items=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">',
           '<rect width="800" height="800" fill="#f5f0e6"/>',
           '<text x="25" y="35" font-size="18">E3b: planta exacta CPU; no malla ni juego</text>']
    def points(poly): return ' '.join(f'{290+x*230:.3f},{150+z*230:.3f}' for x,z in poly)
    for p in recipe['primitives']:
        fill='#577d73' if 'Deck' in p['name'] else '#9b8871'
        if p['location'][2]+p['dimensions'][2]/2<1.019: continue
        items.append(f'<polygon points="{points(polygon(p))}" fill="{fill}" stroke="#3b4142" stroke-width="1"/>')
    route=recipe['metadata']['routeXZ']
    items.append(f'<polyline points="{points(route)}" fill="none" stroke="#e0b94e" stroke-width="3"/>')
    for a,b in contour['portalEdges']:
        items.append(f'<polyline points="{points([a,b])}" stroke="#407ded" stroke-width="5"/>')
    items.append('<text x="25" y="765" font-size="16">Verde: suelo Y=1,02; piedra: pretil; azul: conector abierto</text></svg>')
    return '\n'.join(items)


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    base_path=HERE.parent/'e3b-gate-crossing-candidate/e3b-gate-crossing-65-corbel-candidate.json'
    base=json.loads(base_path.read_text(encoding='utf-8'))
    base['primitives']=[p for p in base['primitives'] if 'Parapet' not in p['name']]
    base['primitives'].append(cube('GateSouthWing',(-.08,1),(.45,1),.16,0,.72))
    # El portal cardinal conserva la sección 0,94 de la recta en X=0,33…1,27.
    deck=next(p for p in base['primitives'] if p['name']=='GateDeck')
    deck['location'][1]=-.635; deck['dimensions'][1]=1.27
    base['primitives'].append(cube('NorthDeckConnector',(.8,-.5),(.8,0),.94,.93,1.02))
    portals=[dict(center=[.8,-.5],normal=[0,-1],width=.94),
             dict(center=[-.5,1.5],normal=[-math.sqrt(.5),math.sqrt(.5)],width=.94)]
    floors=[p for p in base['primitives'] if 'Deck' in p['name']]
    guards,contour=rails(floors,portals)
    base['primitives']+=guards
    base['metadata']={'cellUnit':1,'kind':'e3b-contour-joint-candidate','version':5,
                      'note':'Unexported geometry study; exact rectangle-union boundary with two open connectors. Static tests do not approve gameplay.',
                      'floorY':1.02,'routeXZ':[[.8,-.5],[.8,.5],[.5,.5],[-.5,1.5]],
                      'portals':portals,'status':'candidate_unexported',
                      'sourceRecipe':base_path.relative_to(ROOT).as_posix(),
                      'sourceSha256':hashlib.sha256(base_path.read_bytes()).hexdigest()}
    reports=[]
    base['id']='e3b-contour-gate-65-candidate'
    reports.append(save(base))
    (OUT/'gate-65-plan.svg').write_text(svg(base,contour),encoding='utf-8')
    # Reflexión en la diagonal X=Z: caso W→NE, abertura pública en X.
    gate24=transform(base,3,True)
    gate24['id']='e3b-contour-gate-24-candidate'
    reports.append(save(gate24))
    mixed=copy.deepcopy(base)
    mixed['primitives']=[p for p in mixed['primitives'] if not (p['name'].startswith('Jamb') or 'Corbel' in p['name'] or 'WallWeb' in p['name'] or 'Wing' in p['name'])]
    # Capitel conectado al núcleo real y ménsulas escalonadas bajo ambos brazos.
    mixed['primitives'] += [cube('CoreBearing',(.4,.5),(.6,.5),.20,.70,.93),
                            cube('NorthBearing',(.5,-.5),(.5,.5),.20,.70,.93),
                            cube('DiagonalBearing',(.5,.5),(-.5,1.5),.20,.70,.93),
                            cube('NorthCorbelMiddle',(.6,-.5),(.6,.5),.40,.80,.875),
                            cube('NorthCorbelUpper',(.68,-.5),(.68,.8),.72,.875,.93),
                            cube('DiagonalCorbelMiddle',(.5,.5),(-.5,1.5),.46,.80,.875),
                            cube('DiagonalCorbelUpper',(.5,.5),(-.5,1.5),.74,.875,.93),
                            cube('TurnCrossCorbel',(.40,.6),(1.20,.6),.72,.875,.93)]
    for mirror in (False,True):
        for quarter in range(4):
            candidate=transform(mixed,quarter,mirror)
            candidate['id']=f'e3b-contour-mixed-r{quarter}-m{int(mirror)}-candidate'
            reports.append(save(candidate))
    # Ensamblaje focal real: portón24 y siguiente pared66. El contorno se calcula
    # sobre la unión completa, evitando los pretiles interiores superpuestos.
    next_wall=transform(mixed,1,True)
    pair=copy.deepcopy(gate24)
    pair['id']='e3b-contour-pair-24-66-candidate'
    pair['primitives']=[p for p in pair['primitives'] if 'Parapet' not in p['name']]
    for p in next_wall['primitives']:
        if 'Parapet' in p['name']: continue
        p['name']='NextWall'+p['name'];p['location'][0]+=1;p['location'][1]+=1
        pair['primitives'].append(p)
    end=copy.deepcopy(next_wall['metadata']['portals'][0])
    end['center']=[end['center'][0]+1,end['center'][1]-1]
    pair['metadata']['portals']=[copy.deepcopy(gate24['metadata']['portals'][0]),end]
    pair['metadata']['routeXZ']=[[-.5,.8],[.5,.8],[.5,.5],[1.5,-.5],[1.5,-.8],[2.5,-.8]]
    pair['metadata']['assemblyCells']=[{'kind':'gate','mask':24,'x':0,'z':0},{'kind':'wall','mask':66,'x':1,'z':-1}]
    pair['metadata']['note']='Unexported compound geometry for the actual gate24 to wall66 adjacency. Boundary rails rebuilt from the union; do not stack standalone parapets.'
    guards,pair_contour=rails([p for p in pair['primitives'] if 'Deck' in p['name']],pair['metadata']['portals'])
    pair['primitives']+=guards
    reports.append(save(pair))
    (OUT/'pair-24-66-plan.svg').write_text(svg(pair,pair_contour),encoding='utf-8')
    (OUT/'sources.json').write_text(json.dumps({'recipes':reports,'gate65Contour':contour,
      'limits':['No export or normalization performed','No load capacity or game collision approval','Mixed recipes require actual-wall contact audit','Connector ownership must prevent overlapping parapets when assembling neighbouring recipes']},indent=2)+'\n',encoding='utf-8')
    print(json.dumps(reports))


if __name__=='__main__': main()
