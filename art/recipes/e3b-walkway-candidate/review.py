"""Vistas vectoriales y medidas de las recetas; no usa Blender, GPU ni exportador."""
from pathlib import Path
import hashlib
import html
import json
import math

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = ROOT / 'artifacts/graphics/E3b-walkway-candidate'


def load(path, kind):
    raw = json.loads(path.read_text(encoding='utf-8'))
    result = []
    scale = raw['scale']
    for p in raw['primitives']:
        assert p['type'] == 'cube' and not any(p.get('rotationDegrees', [0, 0, 0]))
        assert p.get('bevel', 0) == 0
        x, by, y = (v * scale for v in p['location'])
        dx, dz, dy = (v * scale for v in p['dimensions'])
        result.append(dict(name=p['name'], kind=kind,
                           lo=[x-dx/2, y-dy/2, -by-dz/2],
                           hi=[x+dx/2, y+dy/2, -by+dz/2]))
    return result


def shift(boxes, dx):
    return [dict(b, lo=[b['lo'][0]+dx, *b['lo'][1:]],
                 hi=[b['hi'][0]+dx, *b['hi'][1:]]) for b in boxes]


def close(a, b):
    assert abs(a-b) < 1e-9, (a, b)


def bounds(boxes):
    return [[min(b['lo'][i] for b in boxes) for i in range(3)],
            [max(b['hi'][i] for b in boxes) for i in range(3)]]


def svg_start(title, subtitle, width=1150, height=760):
    return [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">',
            '<rect width="100%" height="100%" fill="#f7f4ec"/>',
            '<style>text{font:16px sans-serif;fill:#26323a}.heading{font-size:26px;font-weight:bold}.small{font-size:14px}.red{fill:#ae3530}path,line{stroke-linejoin:round}</style>',
            f'<text x="35" y="42" class="heading">{html.escape(title)}</text>',
            f'<text x="35" y="72">{html.escape(subtitle)}</text>']


def label(svg, x, y, text, cls=''):
    svg.append(f'<text x="{x}" y="{y}" class="{cls}">{html.escape(text)}</text>')


def line(svg, a, b, color='#315464', dashed=False):
    dash = ' stroke-dasharray="7 5"' if dashed else ''
    svg.append(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{color}" stroke-width="2"{dash}/>')


def polygon(svg, points, color, opacity=1):
    points = ' '.join(f'{x:.3f},{y:.3f}' for x, y in points)
    svg.append(f'<polygon points="{points}" fill="{color}" fill-opacity="{opacity}" stroke="#5d605a" stroke-width="0.7"/>')


def save(name, svg):
    (OUT / name).write_text('\n'.join([*svg, '</svg>']), encoding='utf-8')


def main():
    sources = {
        'candidate': HERE / 'e3b-walkway-candidate.json',
        'bastion': ROOT / 'art/recipes/bastion-access-candidate/bastion-access-candidate.json',
        'wall': ROOT / 'art/recipes/wall/wall.json',
    }
    candidate, bastion, wall = [load(sources[k], k) for k in sources]
    wb = bounds(wall)
    for b in wall:
        for corner in ('lo', 'hi'):
            b[corner][0] = (b[corner][0]-wb[0][0])/(wb[1][0]-wb[0][0])
            b[corner][1] -= wb[0][1]
            b[corner][2] = .33+(b[corner][2]-wb[0][2])/(wb[1][2]-wb[0][2])*.34
    named = {b['name']: b for b in candidate}
    clear_min = named['OuterParapet']['hi'][2]
    clear_max = named['InnerParapet']['lo'][2]
    clear_width = clear_max-clear_min
    center = (clear_min+clear_max)/2
    assert clear_width >= .70
    close(named['Deck']['hi'][1], 1.02)
    close(min(b['lo'][2] for b in candidate), .33)
    close(max(b['hi'][1] for b in wall), .885)
    close(next(b for b in wall if b['name']=='Coping')['hi'][1], .755)
    for b in candidate:
        if b['name'].startswith('Corbel'):
            assert b['hi'][1] <= .92+1e-9
    # Muestreo del disco en cuatro giros: verifica margen del tramo, no navegación.
    for turn in range(4):
        theta = turn*math.pi/2
        co, si = math.cos(theta), math.sin(theta)
        normal = (si, co)
        for i in range(361):
            angle = i*math.pi/180
            dx, dz = .32*math.cos(angle), .32*math.sin(angle)
            rx, rz = dx*co+dz*si, -dx*si+dz*co
            assert abs(rx*normal[0]+rz*normal[1]) <= clear_width/2+1e-9
    obstacles = [b for b in bastion if b['name'] in ('Parapet_0', 'Parapet_1', 'Parapet_3')]
    east = next(b for b in obstacles if b['name']=='Parapet_3')
    assert east['lo'][2] < center < east['hi'][2]
    close(east['lo'][1], 1.02)
    scene = bastion + shift(wall, 1) + shift(wall, 2) + shift(candidate, 1) + shift(candidate, 2)
    OUT.mkdir(parents=True, exist_ok=True)
    report = dict(status='candidate_only_joint_blocked', units='cells', coordinateOrder='x,y,z',
        bounds=bounds(candidate), floorY=1.02, clearWidth=round(clear_width, 9),
        centerZ=round(center, 9), radius=.32, lateralMarginEach=round(clear_width/2-.32, 9),
        sourceCubeCount=len(candidate), estimatedTriangles=len(candidate)*12,
        wallCrownY=.755, wallMerlonY=.885, actualCrownToFloor=.265,
        blockers=obstacles, jointGapX=.01,
        checked=['native cube dimensions', 'floor height', 'straight corridor width',
                 'rotated disk clearance at four cardinal orientations', 'G-27 side blockage'],
        notChecked=['GLB', 'Blender', 'GPU', 'game navigation', 'physics', 'arrows', 'shadows'],
        sources={k: dict(path=p.relative_to(ROOT).as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())
                 for k, p in sources.items()})
    (OUT/'measurements.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')

    svg = svg_start('CANDIDATO · Planta y junta bloqueada', 'Geometría de recetas; G-27 intacto. Dos tramos rectos propuestos al este. Unidades: celdas.')
    project = lambda x, z: (85+300*x, 135+230*z)
    for b in sorted(scene, key=lambda b: b['hi'][1]):
        x0, _, z0 = b['lo']; x1, _, z1 = b['hi']
        color = '#c6b39c' if b['kind']=='bastion' else '#afb6af' if b['kind']=='wall' else '#8cbab2'
        if b['kind']=='bastion' and b['lo'][1]>=1.02-1e-8:
            color='#cc7870'
        polygon(svg, [project(x0,z0),project(x1,z0),project(x1,z1),project(x0,z1)],color)
    line(svg, project(1.01, center), project(3,center), '#207566', True)
    cx, cy = project(2, center)
    svg.append(f'<ellipse cx="{cx}" cy="{cy}" rx="96" ry="73.6" fill="none" stroke="#207566" stroke-width="2"/>')
    line(svg, project(2.55,clear_min),project(2.55,clear_max),'#174f47')
    label(svg, 860, 285, '0,72 libre')
    label(svg, 680, 405, 'Disco Ø0,64 / eje Z=0,79')
    label(svg, 90, 650, 'Rojo: pretiles y almenas existentes. El recorrido NO cruza G-27.', 'red')
    label(svg, 90, 680, 'Paso recto: Z=0,43…1,15. Plataforma G-27 acaba en Z=1,00: sólo 0,57 de solape lateral.')
    label(svg, 90, 710, 'Escalera intacta: X=0,14…0,86; Z=1…2. Interior local: +Z (hacia abajo en esta planta).')
    save('candidate-plan.svg',svg)

    svg=svg_start('CANDIDATO · Sección transversal y obstáculo lateral', 'Apoyo real de piedra bajo el tablero. Las cotas proceden de las primitivas, sin render GPU.')
    section=lambda z,y: (80+380*z,600-360*y)
    for b in wall+candidate:
        if not b['lo'][0]-1e-9 <= .18 <= b['hi'][0]+1e-9:
            continue
        _,y0,z0=b['lo']; _,y1,z1=b['hi']
        polygon(svg,[section(z0,y0),section(z1,y0),section(z1,y1),section(z0,y1)],
                '#8cbab2' if b['kind']=='candidate' else '#afb6af')
    line(svg,section(.33,0),section(.33,1.42),'#ae3530',True)
    label(svg,80,650,'Exterior Z=0,33: sin engrosar hacia fuera')
    label(svg,280,115,'0,72 libre entre pretiles')
    line(svg,section(.43,1.32),section(1.15,1.32))
    label(svg,315,200,'Y=1,02 · suelo')
    label(svg,355,250,'Tablero: 0,10')
    label(svg,375,415,'Ménsula escalonada')
    label(svg,75,685,'Corona exacta 0,755 → suelo 1,02: 0,265. Almenas: 0,885.')
    # Corte longitudinal en el eje: expone la barrera lateral sin inventar una junta.
    cross=lambda x,y:(650+340*(x-.7),600-360*y)
    for b in bastion+shift(candidate,1):
        if not b['lo'][2] <= center <= b['hi'][2] or b['hi'][0]<.7 or b['lo'][0]>1.7:
            continue
        x0,y0,_=b['lo'];x1,y1,_=b['hi']
        x0=max(x0,.7);x1=min(x1,1.7)
        polygon(svg,[cross(x0,y0),cross(x1,y0),cross(x1,y1),cross(x0,y1)],
                '#cc7870' if b['kind']=='bastion' and y0>=1.02-1e-8 else '#8cbab2' if b['kind']=='candidate' else '#c6b39c')
    label(svg,650,130,'Corte junta a Z=0,79', 'red')
    label(svg,650,160,'Pretil G-27: Y=1,02…1,16', 'red')
    label(svg,650,190,'X=0,85…0,99; Z=0,16…0,84', 'red')
    label(svg,650,650,'Además: hueco X=0,99…1,00 (0,01)', 'red')
    label(svg,650,685,'Junta rechazada; no se añade puente oculto.', 'red')
    save('candidate-section.svg',svg)

    svg=svg_start('CANDIDATO · Vista oblicua desde el interior', 'G-27 y dos muros existentes + pasarela candidata. Proyección vectorial de cubos; no es una captura del juego.')
    iso=lambda x,y,z:(390+180*x-135*z,300+52*x+65*z-170*y)
    faces=[]
    for b in scene:
        x0,y0,z0=b['lo'];x1,y1,z1=b['hi']
        shades=('#88aaa0','#71958d','#b6d1c5') if b['kind']=='candidate' else ('#b9ad99','#9d9485','#d7cdbb')
        if b['kind']=='bastion' and y0>=1.02-1e-8:
            shades=('#bf7c72','#a9635d','#dba093')
        for vertices,color in [([(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],shades[0]),
                               ([(x1,y0,z0),(x1,y0,z1),(x1,y1,z1),(x1,y1,z0)],shades[1]),
                               ([(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)],shades[2])]:
            depth=sum(x+z+y*.35 for x,y,z in vertices)/4
            faces.append((depth,[iso(*v) for v in vertices],color))
    for _,points,color in sorted(faces,key=lambda f:f[0]):
        polygon(svg,points,color)
    label(svg,50,630,'Verde: módulo propuesto. Piedra: recetas existentes. Rojo: barreras sobre la plataforma.', 'small')
    label(svg,50,660,'Cada tramo: longitud 1 · suelo Y=1,02 · paso neto 0,72 · 144 triángulos estimados.')
    label(svg,50,690,'BLOQUEO: la altura coincide; el pretil lateral impide el paso. No hay conexión navegable.', 'red')
    save('candidate-oblique.svg',svg)
    print(json.dumps(dict(output=str(OUT), status=report['status'], clearWidth=report['clearWidth'], cubes=len(candidate))))


if __name__ == '__main__':
    main()
