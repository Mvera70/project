"""Revisión geométrica CPU: cajas, giro continuo y proyecciones SVG."""
from pathlib import Path
import hashlib
import json
import math
import runpy

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = ROOT/'artifacts/graphics/E3b-bastion-joint-candidate'
helpers = runpy.run_path(str(HERE.parent/'e3b-walkway-candidate/review.py'))
load, shift, bounds = (helpers[k] for k in ('load', 'shift', 'bounds'))
svg_start, label, line, polygon = (helpers[k] for k in ('svg_start', 'label', 'line', 'polygon'))
EPS = 1e-9


def point_segment(p, a, b):
    vx, vz = b[0]-a[0], b[1]-a[1]
    t = max(0, min(1, ((p[0]-a[0])*vx+(p[1]-a[1])*vz)/(vx*vx+vz*vz)))
    return math.hypot(p[0]-a[0]-t*vx, p[1]-a[1]-t*vz)


def segment_distance(a, b, c, d):
    def cross(p, q, r):
        return (q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
    if cross(a,b,c)*cross(a,b,d) < 0 and cross(c,d,a)*cross(c,d,b) < 0:
        return 0
    return min(point_segment(a,c,d),point_segment(b,c,d),point_segment(c,a,b),point_segment(d,a,b))


def rect_edges(rect):
    x0,z0,x1,z1=rect
    return [((x0,z0),(x1,z0)),((x1,z0),(x1,z1)),((x1,z1),(x0,z1)),((x0,z1),(x0,z0))]


def floor_boundary(rects):
    xs=sorted(set(round(r[i],12) for r in rects for i in (0,2)))
    zs=sorted(set(round(r[i],12) for r in rects for i in (1,3)))
    occupied=set()
    for i in range(len(xs)-1):
        for j in range(len(zs)-1):
            x,z=(xs[i]+xs[i+1])/2,(zs[j]+zs[j+1])/2
            if any(a-EPS<=x<=c+EPS and b-EPS<=z<=d+EPS for a,b,c,d in rects):
                occupied.add((i,j))
    edges=[]
    for i,j in occupied:
        a,b,c,d=xs[i],zs[j],xs[i+1],zs[j+1]
        for adjacent,edge in [((i,j-1),((a,b),(c,b))),((i+1,j),((c,b),(c,d))),
                              ((i,j+1),((c,d),(a,d))),((i-1,j),((a,d),(a,b)))]:
            if adjacent not in occupied:
                edges.append(edge)
    return edges


def projection(b):
    return [b['lo'][0],b['lo'][2],b['hi'][0],b['hi'][2]]


def save(name, svg):
    (OUT/name).write_text('\n'.join([*svg,'</svg>']),encoding='utf-8')


def main():
    paths={
        'bastion':HERE/'e3b-bastion-joint-candidate.json',
        'entry':HERE/'e3b-walkway-entry-candidate.json',
        'straight':HERE.parent/'e3b-walkway-candidate/e3b-walkway-candidate.json',
        'approved':HERE.parent/'bastion-access-candidate/bastion-access-candidate.json',
        'wall':HERE.parent/'wall/wall.json',
    }
    bastion=load(paths['bastion'],'bastion')
    entry=shift(load(paths['entry'],'candidate'),1)
    straight=shift(load(paths['straight'],'candidate'),2)
    wall=load(paths['wall'],'wall')
    wb=bounds(wall)
    for b in wall:
        for k in ('lo','hi'):
            b[k][0]=(b[k][0]-wb[0][0])/(wb[1][0]-wb[0][0])
            b[k][1]-=wb[0][1]
            b[k][2]=.33+(b[k][2]-wb[0][2])/(wb[1][2]-wb[0][2])*.34
    scene=bastion+entry+straight+shift(wall,1)+shift(wall,2)
    raw=json.loads(paths['bastion'].read_text())
    old=json.loads(paths['approved'].read_text())
    old_steps=[p for p in old['primitives'] if p['name'].startswith('InteriorStep_')]
    new_steps=[p for p in raw['primitives'] if p['name'].startswith('InteriorStep_')]
    assert len(new_steps)==14 and old_steps==new_steps
    added=[b for b in bastion if b['name'] in ('EastLanding','LandingCorbel')]
    steps=[b for b in bastion if b['name'].startswith('InteriorStep_')]
    for a in added:
        for b in steps:
            assert any(min(a['hi'][i],b['hi'][i])-max(a['lo'][i],b['lo'][i])<=EPS for i in range(3))
    floors=[projection(b) for b in scene if abs(b['hi'][1]-1.02)<EPS]
    boundary=floor_boundary(floors)
    obstacles=[b for b in scene if b['hi'][1]>1.02+EPS]
    obstacle_edges=[e for b in obstacles for e in rect_edges(projection(b))]
    # Primero acabar la subida recto; después girar con todo el disco apoyado.
    route=[(.5,.72),(.95,.72),(1.20,.79),(2.50,.79)]
    minimum_floor=min(segment_distance(a,b,c,d) for a,b in zip(route,route[1:]) for c,d in boundary)
    minimum_obstacle=min(segment_distance(a,b,c,d) for a,b in zip(route,route[1:]) for c,d in obstacle_edges)
    for a,b in zip(route,route[1:]):
        for x,z in (a,b):
            assert any(x0-EPS<=x<=x1+EPS and z0-EPS<=z<=z1+EPS for x0,z0,x1,z1 in floors)
            assert not any(x0+EPS<x<x1-EPS and z0+EPS<z<z1-EPS for x0,z0,x1,z1 in map(projection,obstacles))
    assert minimum_floor>=.35-EPS,minimum_floor
    assert minimum_obstacle>=.35-EPS,minimum_obstacle
    # Salida del último peldaño: centro apoyado, cuerpo despejado; no se exige
    # que el diámetro corporal entero sea una suela horizontal en la escalera.
    stair_exit=[(.5,29/28),(.5,.72)]
    exit_clearance=min(segment_distance(*stair_exit,c,d) for c,d in obstacle_edges)
    assert exit_clearance>=.35-EPS
    # Entrada anterior sin recorte: cuello diagonal inferior al mínimo solicitado.
    old_pinch=math.hypot(1-.86,(1+1/14)-.43)
    assert old_pinch<.70
    OUT.mkdir(parents=True,exist_ok=True)
    report=dict(status='candidate_geometry_passed_not_integrated',coordinateOrder='x,y,z',units='cells',
        sourceCubeCount=len(bastion),estimatedTriangles=len(bastion)*12,bounds=bounds(bastion),
        stepsIdenticalToG27=True,stepsCount=14,addedLandingIntersectsSteps=False,
        floorY=1.02,jointGapX=0,straightClearWidth=.72,
        continuousTurnRoute=[[x,1.02,z] for x,z in route],
        minimumFloorRadius=minimum_floor,minimumObstacleRadius=minimum_obstacle,
        certifiedCorridorWidth=2*min(minimum_floor,minimum_obstacle),
        bodyRadius=.32,requiredCorridorRadius=.35,
        stairExitObstacleRadius=exit_clearance,
        oldUnmodifiedEntryPinchWidth=old_pinch,entryOuterParapetStartX=1.25,
        limits=['one east outlet', 'quarter-cell outer rail relief at entry', 'no app or physics validation',
                'full disk floor support starts after leaving stairs', 'no Blender or GLB'],
        sources={k:dict(path=p.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for k,p in paths.items()})
    (OUT/'measurements.json').write_text(json.dumps(report,indent=2)+'\n')

    svg=svg_start('CANDIDATO · Salida lateral abierta y giro comprobado',
                  'G-27 derivado + primer tramo de entrada + tramo recto. Unidades: celdas. Suelo Y=1,02.')
    proj=lambda x,z:(80+310*x,125+235*z)
    for b in sorted(scene,key=lambda b:b['hi'][1]):
        x0,_,z0=b['lo'];x1,_,z1=b['hi']
        color='#b6c6bd' if b['kind']=='candidate' else '#c8b59d'
        if b['name'] in ('EastLanding','LandingCorbel'):
            color='#e0ae5f'
        polygon(svg,[proj(x0,z0),proj(x1,z0),proj(x1,z1),proj(x0,z1)],color)
    for a,b in zip(route,route[1:]):
        line(svg,proj(*a),proj(*b),'#16795e',True)
    for p in (route[0],route[1],route[2]):
        cx,cy=proj(*p)
        svg.append(f'<ellipse cx="{cx}" cy="{cy}" rx="108.5" ry="82.25" fill="none" stroke="#16795e" stroke-width="1.8"/>')
    line(svg,proj(.5,1.50),proj(.5,.72),'#407ca8',True)
    label(svg,590,470,'Verde: corredor Ø0,70; cuerpo Ø0,64')
    label(svg,590,500,'Ocre: descansillo lateral X=0,86…1')
    label(svg,590,530,'Peldaños originales: sin recorte ni cubierta')
    label(svg,70,650,'Abertura real: desaparecen la almena central y la esquina interior de la cara este.')
    label(svg,70,680,'Alivio de pretil exterior en la entrada: X=1…1,25. Se conserva el borde del tablero Z=0,33.')
    label(svg,70,710,'Antes de girar, terminar la subida hasta Z=0,72; el eje pasa a Z=0,79 dentro del adarve.')
    save('candidate-top.svg',svg)

    svg=svg_start('CANDIDATO · Sección de la junta y relación con la escalera',
                  'Izquierda: corte longitudinal a Z=0,79. Derecha: escalera en X=0,50 y descansillo lateral en X=0,93.')
    p1=lambda x,y:(65+280*x,600-350*y)
    for b in scene:
        if b['lo'][2]-.0001<=.79<=b['hi'][2]+.0001 and b['lo'][0]<1.8:
            x0,y0,_=b['lo'];x1,y1,_=b['hi'];x1=min(x1,1.8)
            polygon(svg,[p1(x0,y0),p1(x1,y0),p1(x1,y1),p1(x0,y1)],'#b6c6bd' if b['kind']=='candidate' else '#c8b59d')
    line(svg,p1(.3,1.02),p1(1.8,1.02),'#16795e')
    label(svg,90,180,'Suelo continuo Y=1,02')
    label(svg,90,210,'Sin pretil ni almena en el corredor')
    label(svg,90,650,'Plataforma prolongada hasta X=1,00: hueco 0')
    p2=lambda z,y:(680+260*(z-.8),600-350*y)
    for b in bastion:
        if not b['name'].startswith('InteriorStep_') and b['name'] not in ('Platform','EastLanding','LandingCorbel'):
            continue
        _,y0,z0=b['lo'];_,y1,z1=b['hi'];z0=max(.8,z0)
        if z1<=.8:
            continue
        candidate=b['name'] in ('EastLanding','LandingCorbel')
        polygon(svg,[p2(z0,y0),p2(z1,y0),p2(z1,y1),p2(z0,y1)],'#e0ae5f' if candidate else '#c8b59d',.6 if candidate else 1)
    label(svg,660,180,'Ocre: adición en X=0,86…1,00')
    label(svg,660,210,'Proyección superpuesta, NO ocupa X=0,50')
    label(svg,660,650,'Peldaño 14: Z=1…1,071428571; Y=1,02')
    label(svg,80,705,'El descansillo llega a Z=1,15 por el lado de la escalera. Los 14 peldaños mantienen sus cajas originales.')
    save('candidate-section.svg',svg)

    svg=svg_start('CANDIDATO · Junta abierta desde el interior',
                  'Proyección de las cajas de receta; no es una captura del juego. Un bastión derivado y dos tramos.')
    iso=lambda x,y,z:(380+185*x-140*z,340+52*x+65*z-172*y)
    faces=[]
    for b in scene:
        x0,y0,z0=b['lo'];x1,y1,z1=b['hi']
        shades=('#88aaa0','#71958d','#b6d1c5') if b['kind']=='candidate' else ('#b9ad99','#9d9485','#d7cdbb')
        if b['name'] in ('EastLanding','LandingCorbel'):
            shades=('#d3ad76','#be9359','#edc98d')
        for vs,color in [([(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],shades[0]),
                         ([(x1,y0,z0),(x1,y0,z1),(x1,y1,z1),(x1,y1,z0)],shades[1]),
                         ([(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)],shades[2])]:
            faces.append((sum(x+z+y*.35 for x,y,z in vs)/4,[iso(*v) for v in vs],color))
    for _,pts,color in sorted(faces,key=lambda f:f[0]):
        polygon(svg,pts,color)
    for a,b in zip(route,route[1:]):
        line(svg,iso(a[0],1.025,a[1]),iso(b[0],1.025,b[1]),'#147758',True)
    label(svg,65,630,'La salida este queda abierta; las otras caras y los 14 peldaños se conservan.')
    label(svg,65,660,'Descansillo lateral: ocre. Primer pretil exterior acortado 0,25 para evitar un cuello diagonal.')
    label(svg,65,690,'Verificación estática: corredor continuo ≥0,70; suelo a 1,02. Pendientes revisión visual e integración.')
    save('candidate-oblique.svg',svg)
    print(json.dumps({k:report[k] for k in ('status','certifiedCorridorWidth','minimumFloorRadius','minimumObstacleRadius','estimatedTriangles')}))


if __name__=='__main__':
    main()
