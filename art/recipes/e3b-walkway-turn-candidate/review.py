"""Sonda CPU E3b.2b: genera recetas y vistas técnicas, sin Blender ni GPU."""
from pathlib import Path
import hashlib
import json
import math

ROOT = Path(__file__).resolve().parents[3]
RECIPES = ROOT / 'art/recipes'
OUT = ROOT / 'artifacts/graphics/E3b2-candidates'
STONE = [{'name': 'stone', 'role': 'stone', 'roughness': .95}]


def cube(name, x0, x1, z0, z1, y0, y1, angle=0):
    primitive = {'type': 'cube', 'name': name,
                 'location': [(x0+x1)/2, -(z0+z1)/2, (y0+y1)/2],
                 'dimensions': [x1-x0, z1-z0, y1-y0],
                 'material': 'stone', 'parent': 'Root'}
    if angle:
        primitive['rotationDegrees'] = [0, 0, angle]
    return primitive


def recipe(identifier, kind, footprint, pieces, note):
    return {'schemaVersion': 1, 'id': identifier, 'scale': 1,
            'mergeByMaterial': True, 'palette': '../palette.json',
            'metadata': {'cellUnit': 1, 'kind': kind, 'footprint': footprint,
                         'version': 1, 'note': note},
            'materials': STONE, 'groups': [{'name': 'Root', 'location': [0, 0, 0], 'parent': None}],
            'primitives': pieces, 'clips': [], 'connectors': [],
            'referenceRender': {'width': 1000, 'height': 800,
                                'cameraLocation': [2, -3, 2],
                                'cameraTarget': [.5, -.5, .85],
                                'orthoScale': 2.5, 'worldRole': 'sky'}}


def source_boxes(path):
    raw = json.loads(path.read_text(encoding='utf-8'))
    scale = raw['scale']
    result = []
    for p in raw['primitives']:
        if p['type'] != 'cube':
            continue
        x, bz, y = [v*scale for v in p['location']]
        dx, dz, dy = [v*scale for v in p['dimensions']]
        angle = math.radians(-p.get('rotationDegrees', [0, 0, 0])[2])
        co, si = math.cos(angle), math.sin(angle)
        corners = [(x+u*co-v*si, -bz+u*si+v*co)
                   for u in (-dx/2, dx/2) for v in (-dz/2, dz/2)]
        result.append({'name': p['name'], 'box': [min(q[0] for q in corners),
                        min(q[1] for q in corners), max(q[0] for q in corners),
                        max(q[1] for q in corners), y-dy/2, y+dy/2]})
    return result


def svg(title, pieces, path, status):
    # Vistas técnicas esquemáticas; cajas en planta y proyección oblicua.
    def poly(points, fill):
        pts = ' '.join(f'{x:.1f},{y:.1f}' for x, y in points)
        return f'<polygon points="{pts}" fill="{fill}" stroke="#47545c" stroke-width="1"/>'
    base = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 720">',
            '<rect width="1000" height="720" fill="#f7f4ec"/>',
            f'<text x="35" y="40" font-size="24">{title}</text>',
            f'<text x="35" y="70" font-size="16">{status}</text>']
    for p in pieces:
        x0,z0,x1,z1,y0,y1 = p['box']
        if path == 'plan':
            if y1 < .90: continue
            base.append(poly([(90+240*x0,140+240*z0),(90+240*x1,140+240*z0),
                              (90+240*x1,140+240*z1),(90+240*x0,140+240*z1)],
                             '#7da89d' if p['name'].startswith('Deck') else '#a89581'))
        elif path == 'section':
            base.append(poly([(90+240*z0,590-300*y0),(90+240*z1,590-300*y0),
                              (90+240*z1,590-300*y1),(90+240*z0,590-300*y1)], '#8eaaa2'))
        else:
            project = lambda x,z,y: (440+180*x-135*z,300+52*x+65*z-170*y)
            base.append(poly([project(x0,z0,y1),project(x1,z0,y1),
                              project(x1,z1,y1),project(x0,z1,y1)], '#8eaaa2'))
    base += ['<text x="35" y="675" font-size="15">Unidades de celda · Y vertical · esquema CPU de cajas; no captura del juego</text>',
             '</svg>']
    return '\n'.join(base) + '\n'


def point_segment(p, a, b):
    vx, vz = b[0]-a[0], b[1]-a[1]
    t = max(0, min(1, ((p[0]-a[0])*vx+(p[1]-a[1])*vz)/(vx*vx+vz*vz)))
    return math.hypot(p[0]-a[0]-t*vx, p[1]-a[1]-t*vz)


def segment_distance(a, b, c, d):
    # Los recorridos y límites del codo son ortogonales; detectar cruce y
    # medir las cuatro proyecciones basta para obtener el mínimo continuo.
    if (min(a[0],b[0]) <= max(c[0],d[0]) and
        min(c[0],d[0]) <= max(a[0],b[0]) and
        min(a[1],b[1]) <= max(c[1],d[1]) and
        min(c[1],d[1]) <= max(a[1],b[1])):
        if (a[0] == b[0] and c[1] == d[1]) or (a[1] == b[1] and c[0] == d[0]):
            return 0
    return min(point_segment(a,c,d), point_segment(b,c,d),
               point_segment(c,a,b), point_segment(d,a,b))


def rect_edges(x0,z0,x1,z1):
    return [((x0,z0),(x1,z0)), ((x1,z0),(x1,z1)),
            ((x1,z1),(x0,z1)), ((x0,z1),(x0,z0))]


def main():
    turn = [cube('Deck', 0, 1.27, 0, 1.27, .92, 1.02),
            cube('EastParapet', 1.15, 1.27, 0, 1.27, 1.02, 1.20),
            cube('SouthParapet', 0, 1.15, 1.15, 1.27, 1.02, 1.20),
            cube('NorthWallBearing', .33, .67, 0, .67, .885, .92),
            cube('WestWallBearing', 0, .67, .33, .67, .885, .92),
            cube('CornerCorbelUpper', .65, 1.0, .65, 1.0, .72, .92),
            cube('CornerCorbelMiddle', .65, .87, .65, .87, .53, .72)]
    # Las piezas diagonales permanecen candidatas: sus empalmes se falsan abajo.
    diagonal = [cube('DeckDiagonal', -.2071, 1.2071, .03, .97, .93, 1.02, -45),
                cube('OuterParapet', -.2071, 1.2071, .03, .13, 1.02, 1.20, -45),
                cube('InnerParapet', -.2071, 1.2071, .85, .97, 1.02, 1.20, -45),
                cube('WallBearing', -.2071, 1.2071, .33, .67, .885, .93, -45)]
    gate = [cube('DeckOverLintel', 0, 1, .33, 1.27, .93, 1.02),
            cube('OuterParapet', 0, 1, .33, .43, 1.02, 1.20),
            cube('InnerParapet', 0, 1, 1.15, 1.27, 1.02, 1.20)]
    forms = [
        ('e3b-walkway-turn-candidate', 'wall-walkway-turn-candidate', [1.27,1.27], turn,
         'West to north elbow; opening on both adjoining faces. Candidate only.'),
        ('e3b-walkway-diagonal-candidate', 'wall-walkway-diagonal-candidate', [2,2], diagonal,
         'Diagonal span; end transitions require a separate swept-disk solution. Candidate only.'),
        ('e3b-gate-crossing-candidate', 'gate-crossing-candidate', [1,1.27], gate,
         'Deck underside at lintel top Y=0.93; cardinal span only. Diagonal joins unresolved.'),
    ]
    OUT.mkdir(parents=True, exist_ok=True)
    checks = {}
    for identifier, kind, footprint, pieces, note in forms:
        directory = RECIPES / identifier
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / (identifier + '.json')
        raw = recipe(identifier, kind, footprint, pieces, note)
        path.write_text(json.dumps(raw, indent=2) + '\n', encoding='utf-8')
        boxes = source_boxes(path)
        assert len(boxes) == len(pieces)
        dest = OUT / identifier
        dest.mkdir(parents=True, exist_ok=True)
        for view in ('plan','section','oblique'):
            (dest / (view+'.svg')).write_text(svg(identifier, boxes, view, note), encoding='utf-8')
        checks[identifier] = {'recipe': path.relative_to(ROOT).as_posix(),
                              'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                              'cubes': len(pieces), 'materials': 1,
                              'estimatedTriangles': len(pieces)*12,
                              'bounds': [min(b['box'][0] for b in boxes),
                                         min(b['box'][1] for b in boxes),
                                         max(b['box'][2] for b in boxes),
                                         max(b['box'][3] for b in boxes)]}
    # La geometría del giro se mide sobre toda la trayectoria y los bordes.
    route = [(-.35,.79),(.79,.79),(.79,-.35)]
    local_route = [(.35,.79),(.79,.79),(.79,.35)]
    local_segments = list(zip(local_route,local_route[1:]))
    deck_edges = rect_edges(0,0,1.27,1.27)
    parapet_edges = [edge for p in turn if 'Parapet' in p['name']
                      for edge in rect_edges(*source_boxes(RECIPES/forms[0][0]/(forms[0][0]+'.json'))
                                             [[q['name'] for q in turn].index(p['name'])]['box'][:4])]
    floor_radius = min(segment_distance(a,b,c,d) for a,b in local_segments for c,d in deck_edges)
    obstacle_radius = min(segment_distance(a,b,c,d) for a,b in local_segments for c,d in parapet_edges)
    assert floor_radius >= .35-1e-9 and obstacle_radius >= .35-1e-9
    checks[forms[0][0]].update(status='conditional', floorY=1.02,
        localSweptRadius=round(min(floor_radius,obstacle_radius),9),
        localClearDiameter=round(2*min(floor_radius,obstacle_radius),9),
        bodyRadius=.32,
        routeXZ=route, condition='Requires matching straight decks at west and north faces, wall support and tree clearance.')
    # El ancho de la pieza girada se reduce por sus dos pretiles; un encuentro
    # centro a centro no garantiza giro para un disco alrededor del vértice.
    checks[forms[1][0]].update(status='rejected_joint', floorY=1.02,
        nominalClearWidth=.72, vertexJointClearWidth='uncertified',
        reason='Rotated strip alone has no measured swept-disk path or verified wall bearing across the clipped shared vertex; it cannot certify a joint.')
    gate_raw = json.loads((RECIPES/'gate/gate.json').read_text(encoding='utf-8'))
    gate_scale = gate_raw['scale']
    gate_height = max((p['location'][2]+p['dimensions'][2]/2)*gate_scale
                      for p in gate_raw['primitives'] if p['type']=='cube')
    # `gate.glb` es la ruta normal de `buildFromAsset`: su punto más alto es
    # una almena a 0,865. `OpenGate` sólo existe en el respaldo procedural de
    # `buildDefence`, así que su intersección se anota aparte, sin atribuirla
    # al portón publicado.
    dynamic_lintel_bottom = gate_height*1.18-.06
    checks[forms[2][0]].update(status='rejected_support_and_joins', floorY=1.02,
        undersideY=.93, portalOpening=.84, nominalClearWidth=.72,
        gateRecipeTop=round(gate_height,9), gateRecipeLintelTop=.72,
        unsupportedGapAbovePublishedGate=round(.93-gate_height,9),
        dynamicFallbackOnly=True, dynamicPortalLintelBottom=round(dynamic_lintel_bottom,9),
        dynamicPortalLintelTop=round(dynamic_lintel_bottom+.12,9),
        intersectsDynamicFallbackLintel=True, cardinalOnly=True,
        reason='Published gate leaves a 0.065 gap below this deck, with no verified support; the procedural fallback intersects it and must never receive the deck. Masks 65/128 additionally have no certified diagonal joint or corner support.')
    refs = {}
    for key, rel in [('wall','art/recipes/wall/wall.json'),('gate','art/recipes/gate/gate.json'),
                     ('straight','art/recipes/e3b-walkway-candidate/e3b-walkway-candidate.json')]:
        p = ROOT / rel
        refs[key] = {'path': rel, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
    inventory_path = ROOT/'artifacts/graphics/E3b2-study/inventory.json'
    inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
    refs['inventory'] = {'path': inventory_path.relative_to(ROOT).as_posix(),
                         'sha256': hashlib.sha256(inventory_path.read_bytes()).hexdigest()}
    forest_samples = [{'seed': row['seed'],
                       'standingAdjacent': row['interiorForestAdjacentToStone']['trunkRisk']['standingCandidates'],
                       'approximateIntersections': row['interiorForestAdjacentToStone']['trunkRisk']['approximateIntersections']}
                      for row in inventory['result']]
    report = {'method': 'CPU recipe boxes, analytic local clearances; no GLB/app/GPU',
              'coordinateOrder': 'X,Z in plan; Y vertical', 'references': refs,
              'forms': checks,
              'forest': {'trunkRadiusFormula': '.34 / 3 * scatterScale',
                         'scatterScaleRange': [.72,1.28],
                         'adultTrunkRadiusRange': [.0816,.1450666667],
                         'straightBoardIntrusion': .27,
                         'minimumPossibleTrunkEdgeFromAdjacentCellBoundary': .5-.34-.1450666667,
                         'inventoryHeuristic': forest_samples,
                         'condition': 'Exact cell/orientation overlap must be checked before placement; retain adult tree and defer deck until ordinary felling.'}}
    (OUT/'measurements.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({key: value['status'] for key,value in checks.items()}))


if __name__ == '__main__':
    main()
