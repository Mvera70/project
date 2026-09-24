"""Barrido analítico, muestra del disco y vistas técnicas del codo y muro real."""
import sys
sys.dont_write_bytecode = True
import json
import math
import hashlib
from generate import HERE, OUT, ROOT, contour, cube, polygon, rails, save_json

def point_segment(p,a,b):
    v=contour.sub(b,a); d=sum(x*x for x in v)
    t=max(0,min(1,sum(x*y for x,y in zip(contour.sub(p,a),v))/d)) if d else 0
    return math.dist(p,[a[k]+t*v[k] for k in (0,1)])

def segment_distance(a,b,c,d):
    u,v=contour.sub(b,a),contour.sub(d,c); den=contour.cross(u,v)
    if abs(den)>1e-10:
        t=contour.cross(contour.sub(c,a),v)/den; s=contour.cross(contour.sub(c,a),u)/den
        if 0<=t<=1 and 0<=s<=1: return 0
    return min(point_segment(a,c,d),point_segment(b,c,d),point_segment(c,a,b),point_segment(d,a,b))

def route_edges_distance(route,edges):
    return min(segment_distance(a,b,c,d) for a,b in zip(route,route[1:]) for c,d in edges)

def views(recipe, real):
    route=recipe['metadata']['routeXZ']
    bounds=[p for b in real['boxes'] for p in b['footprint']]
    minx,minz=min(p[0] for p in bounds)-.45,min(p[1] for p in bounds)-.45
    scale=240
    def project(v,view):
        x,y,z=v
        if view=='plan': return [100+(x-minx)*scale,80+(z-minz)*scale]
        if view=='section': return [100+(x-minx)*scale,590-y*350]
        return [430+(x-z)*170,390+(x+z-1)*85-y*210]
    def points(vertices,view): return ' '.join(','.join(f'{q:.3f}' for q in project(p,view)) for p in vertices)
    for view in ['plan','section','oblique']:
        items=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 800">',
            '<rect width="850" height="800" fill="#f5f0e6"/>',
            f'<text x="25" y="28" font-size="20">Codo {real["mask"]}: {view} CPU; sin exportacion</text>']
        # Planta y oblicua usan los triángulos de la malla publicada transformada.
        zcut=.5
        for tri in real['realWallTriangles']:
            if view=='section':
                intersections=[]
                for a,b in zip(tri,tri[1:]+tri[:1]):
                    if abs(b[2]-a[2])>1e-10:
                        t=(zcut-a[2])/(b[2]-a[2])
                        if 0<=t<=1: intersections.append([a[k]+t*(b[k]-a[k]) for k in range(3)])
                if len(intersections)>=2: items.append(f'<polyline points="{points(intersections,view)}" fill="none" stroke="#9d9a93" stroke-width="1"/>')
            else: items.append(f'<polygon points="{points(tri,view)}" fill="#c5c1b8" stroke="#a8a49c" stroke-width=".3"/>')
        boxes=sorted(real['boxes'],key=lambda b:(b['top'] if view=='plan' else
            sum(sum(p) for p in b['footprint'])/4+2*b['top']))
        for box in boxes:
            footprint=box['footprint']; low,high=box['bottom'],box['top']
            fill='#5b9080' if 'Deck' in box['name'] else '#aa8361' if 'Parapet' in box['name'] else '#788faf'
            if view=='plan':
                vertices=[[x,high,z] for x,z in footprint]
                items.append(f'<polygon points="{points(vertices,view)}" fill="{fill}" fill-opacity=".68" stroke="#434b4e"/>')
            elif view=='oblique':
                for i,j in [(0,1),(1,2),(2,3),(3,0)]:
                    a,b=footprint[i],footprint[j]
                    vertices=[[a[0],low,a[1]],[b[0],low,b[1]],[b[0],high,b[1]],[a[0],high,a[1]]]
                    items.append(f'<polygon points="{points(vertices,view)}" fill="{fill}" stroke="#434b4e" stroke-width=".7"/>')
                items.append(f'<polygon points="{points([[x,high,z] for x,z in footprint],view)}" fill="{fill}" stroke="#434b4e"/>')
            elif min(p[1] for p in footprint)-1e-8<=zcut<=max(p[1] for p in footprint)+1e-8:
                x0,x1=min(p[0] for p in footprint),max(p[0] for p in footprint)
                items.append(f'<polygon points="{points([[x0,low,zcut],[x1,low,zcut],[x1,high,zcut],[x0,high,zcut]],view)}" fill="{fill}" fill-opacity=".7" stroke="#434b4e"/>')
        if view!='section':
            items.append(f'<polyline points="{points([[x,1.022,z] for x,z in route],view)}" fill="none" stroke="#eec843" stroke-width="4"/>')
            if view=='plan':
                for x,z in route:
                    px,pz=project([x,1.02,z],view)
                    items.append(f'<circle cx="{px}" cy="{pz}" r="{.35*scale}" fill="none" stroke="#c59f2d" stroke-dasharray="4 4"/>')
            for portal in recipe['metadata']['portals']:
                x,z=portal['center']; nx,nz=portal['normal']; w=portal['width']/2
                vertices=[[x-nz*w,1.025,z+nx*w],[x+nz*w,1.025,z-nx*w]]
                items.append(f'<polyline points="{points(vertices,view)}" stroke="#3473df" stroke-width="5"/>')
        else: items.append(f'<text x="25" y="660" font-size="16">Seccion exacta Z={zcut:.2f}; suelo Y=1.02</text>')
        items += ['<text x="25" y="720" font-size="16">Gris: wall.glb real; verde: tablero; azul gris: apoyos</text>',
                  '<text x="25" y="746" font-size="16">Marron: pretiles; amarillo: eje/radio .35; azul vivo: portales</text>',
                  '<text x="25" y="772" font-size="14">Proyeccion tecnica CPU; no captura del juego ni revision visual Blender.</text></svg>']
        path=OUT/f'turn-{real["mask"]}-{view}.svg';text='\n'.join(items)
        if path.exists():
            assert path.read_text(encoding='utf-8')==text, f'No se sobrescribe evidencia diferente: {path}'
        else:
            with path.open('x',encoding='utf-8') as out: out.write(text)

def main():
    real=json.loads((OUT/'real-support.json').read_text(encoding='utf-8'))
    reports=[]
    for support in real['reports']:
        path=HERE/f'e3b-turn-contour-{support["mask"]}-candidate.json';raw=path.read_bytes();recipe=json.loads(raw)
        assert support['recipeSha256']==hashlib.sha256(raw).hexdigest()
        floors=[p for p in recipe['primitives'] if 'Deck' in p['name']]
        guards=[p for p in recipe['primitives'] if 'Parapet' in p['name']]
        _,cont=rails(floors,recipe['metadata']['portals'])
        for portal in recipe['metadata']['portals']:
            a=portal['center'];n=portal['normal'];b=[a[k]+n[k]*.5 for k in (0,1)]
            floors.append(cube('SyntheticNeighbourDeck',a,b,.94,.93,1.02))
            for side in (-1,1):
                offset=[-n[1]*side*.42,n[0]*side*.42]
                guards.append(cube('SyntheticNeighbourParapet',[a[k]+offset[k] for k in (0,1)],
                    [b[k]+offset[k] for k in (0,1)],.1,1.02,1.20))
        fp=[polygon(p) for p in floors];gp=[polygon(p) for p in guards];route=recipe['metadata']['routeXZ']
        floor_distance=route_edges_distance(route,contour.boundary(fp))
        guard_distance=route_edges_distance(route,[(a,b) for poly in gp for a,b in zip(poly,poly[1:]+poly[:1])])
        inside_floors=all(any(contour.inside(poly,p) for poly in fp) for p in route)
        outside_guards=not any(contour.inside(poly,p) for poly in gp for p in route)
        count=misses=0
        for a,b in zip(route,route[1:]):
            steps=math.ceil(math.dist(a,b)/.005)
            for step in range(steps+1):
                center=contour.lerp(a,b,step/steps)
                for radius in (0,.175,.35):
                    for j in range(120) if radius else [0]:
                        p=[center[0]+radius*math.cos(j*math.tau/120),center[1]+radius*math.sin(j*math.tau/120)]
                        count+=1; misses+=not any(contour.inside(poly,p) for poly in fp)
        rail_misses=0
        for a,b in cont['protectedEdges']:
            dx,dz=contour.sub(b,a);length=math.dist(a,b)
            for i in range(101):
                p=[a[0]+dx*i/100-dz/length*.001,a[1]+dz*i/100+dx/length*.001]
                rail_misses+=not any(contour.inside(poly,p) for poly in gp)
        height=max(abs(p['location'][2]+p['dimensions'][2]/2-1.02) for p in floors)
        passed=inside_floors and outside_guards and min(floor_distance,guard_distance)>=.35-1e-8 and misses==rail_misses==0 and len(cont['portalEdges'])==2 and height<1e-8 and not support['unanchoredComponents']
        reports.append(dict(mask=support['mask'],recipe=path.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(raw).hexdigest(),
            floorY=1.02,maximumFloorHeightError=height,analyticFloorBoundaryClearance=floor_distance,
            analyticParapetClearance=guard_distance,continuousClearDiameter=2*min(floor_distance,guard_distance),testedRadius=.35,
            diskSamples=count,floorMisses=misses,railCoverageFailures=rail_misses,
            openPortalBoundarySegments=len(cont['portalEdges']),protectedBoundarySegments=len(cont['protectedEdges']),
            unanchoredComponents=support['unanchoredComponents'],passCPU=passed))
        views(recipe,support)
    report=dict(reports=reports,limitations=['Suelo y pretiles vecinos sintéticos de sección 0,94; muro vecino real vía buildDefence.',
        'Distancias analíticas a contorno de unión y rectángulos. Muestreo adicional del disco cada 0,005 y 120 ángulos.',
        'No se mide bosque real ni anillo completo. No es aprobación de navegación, estructura, exportación o juego.'])
    save_json(OUT/'sweep.json',report)
    print(json.dumps(reports))
    if not all(r['passCPU'] for r in reports): raise SystemExit(1)

if __name__=='__main__':main()
