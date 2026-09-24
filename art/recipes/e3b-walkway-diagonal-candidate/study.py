"""Segunda sonda E3b.2b: variantes de junta; sólo recetas y CPU."""
from pathlib import Path
import hashlib
import json
import math
import runpy

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
GATE = HERE.parent/'e3b-gate-crossing-candidate'
OUT = ROOT/'artifacts/graphics/E3b2-candidates/round-2'
helpers = runpy.run_path(str(HERE.parent/'e3b-walkway-turn-candidate/review.py'))
cube, recipe, source_boxes, svg = (helpers[k] for k in ('cube','recipe','source_boxes','svg'))


def save(identifier, folder, kind, pieces, note):
    path = folder/(identifier+'.json')
    path.write_text(json.dumps(recipe(identifier,kind,[2,2],pieces,note),indent=2)+'\n',encoding='utf-8')
    boxes = source_boxes(path)
    target = OUT/identifier
    target.mkdir(parents=True,exist_ok=True)
    for view in ('plan','section','oblique'):
        (target/(view+'.svg')).write_text(svg(identifier,boxes,view,note),encoding='utf-8')
    return {'path': path.relative_to(ROOT).as_posix(),
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'cubes':len(pieces),'materials':1,'estimatedTriangles':12*len(pieces)}


def rotated_strip(name, start, end, lo, hi, y0, y1, width, angle):
    # La X de Blender sigue el eje largo. El centro es el punto medio del tramo.
    length=math.dist(start,end)
    mx,mz=((start[0]+end[0])/2,(start[1]+end[1])/2)
    return cube(name,mx-length/2,mx+length/2,mz-width/2,mz+width/2,y0,y1,angle)


def strip(name,a,b,width,y0,y1,offset=0):
    # Primitiva orientada sobre la diagonal con centro geométrico exacto.
    dx,dz=b[0]-a[0],b[1]-a[1]
    length=math.hypot(dx,dz)
    theta=math.degrees(math.atan2(dz,dx))
    p=cube(name,0,length,-width/2,width/2,y0,y1,-theta)
    p['location'][0]=(a[0]+b[0])/2-dz/length*offset
    p['location'][1]=-((a[1]+b[1])/2+dx/length*offset)
    return p


def contains(piece,x,z):
    px,pby,_=piece['location']
    dx,dz,_=piece['dimensions']
    theta=math.radians(-piece.get('rotationDegrees',[0,0,0])[2])
    vx,vz=x-px,z+pby
    u=vx*math.cos(theta)+vz*math.sin(theta)
    v=-vx*math.sin(theta)+vz*math.cos(theta)
    return abs(u)<=dx/2+1e-9 and abs(v)<=dz/2+1e-9


def disk_path(floors,route,radius=.35):
    # Muestreo CPU denso, resultado conservador: no se aprueba un punto sin
    # apoyo. El margen analítico de la banda consta también en el informe.
    tested=0
    first_failure=None
    for a,b in zip(route,route[1:]):
        n=math.ceil(math.dist(a,b)/.005)
        for i in range(n+1):
            t=i/n
            x,z=a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t
            for fraction in (0,.5,1):
                for degree in range(0,360,3):
                    theta=math.radians(degree)
                    px,pz=x+radius*fraction*math.cos(theta),z+radius*fraction*math.sin(theta)
                    tested+=1
                    if not any(contains(p,px,pz) for p in floors):
                        first_failure=[round(x,5),round(z,5),round(px,5),round(pz,5)]
                        return {'passed':False,'testedPoints':tested,'firstFailure':first_failure}
    return {'passed':True,'testedPoints':tested,'radius':radius,
            'pathStepMax':.005,'diskAngleStepDegrees':3,
            'diskRadiusFractions':[0,.5,1]}


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    # Variante de marco completo: se copian todos los elementos móviles y el
    # gozne sin alterarlos; sólo se estrechan las jambas estáticas de piedra.
    approved_gate=json.loads((HERE.parent/'gate/gate.json').read_text(encoding='utf-8'))
    wide_gate=json.loads(json.dumps(approved_gate))
    wide_gate['id']='e3b-gate-wide-opening-candidate'
    wide_gate['metadata']['kind']='gate-wide-opening-candidate'
    wide_gate['metadata']['note']='Static stone jambs leave 0.84; original gate_door group and all its primitives are unchanged. Candidate only.'
    left_names={'Gate_Stone_Jamb_L',*[f'Gate_Jamb_Stone_0_{i}' for i in range(3)]}
    right_names={'Gate_Stone_Jamb_R',*[f'Gate_Jamb_Stone_1_{i}' for i in range(3)]}
    for p in wide_gate['primitives']:
        if p['name'] in left_names:
            p['location'][0]=.12
            p['dimensions'][0]=.24
        elif p['name'] in right_names:
            p['location'][0]=2.88
            p['dimensions'][0]=.24
    original_door=[p for p in approved_gate['primitives'] if p['parent']=='gate_door']
    candidate_door=[p for p in wide_gate['primitives'] if p['parent']=='gate_door']
    assert original_door==candidate_door
    assert approved_gate['groups']==wide_gate['groups']
    gate_frame_path=GATE/'e3b-gate-wide-opening-candidate.json'
    gate_frame_path.write_text(json.dumps(wide_gate,indent=2)+'\n',encoding='utf-8')
    frame_boxes=[b for b in source_boxes(gate_frame_path)
                 if b['name'] not in {p['name'] for p in candidate_door}]
    frame_out=OUT/'e3b-gate-wide-opening-candidate'
    frame_out.mkdir(parents=True,exist_ok=True)
    for view in ('plan','section','oblique'):
        (frame_out/(view+'.svg')).write_text(svg('e3b-gate-wide-opening-candidate',frame_boxes,view,
            'Static jambs moved; moving door and hinge copied unchanged.'),encoding='utf-8')
    frame_source={'path':gate_frame_path.relative_to(ROOT).as_posix(),
                  'sha256':hashlib.sha256(gate_frame_path.read_bytes()).hexdigest(),
                  'status':'candidate_unexported',
                  'cubes':sum(p['type']=='cube' for p in wide_gate['primitives']),
                  'cylinders':sum(p['type']=='cylinder' for p in wide_gate['primitives']),
                  'materials':len(wide_gate['materials']),
                  'estimatedCubeTriangles':sum(p['type']=='cube' for p in wide_gate['primitives'])*12,
                  'estimatedTriangles':sum(p['type']=='cube' for p in wide_gate['primitives'])*12
                       +sum(4*p['vertices']-4 for p in wide_gate['primitives'] if p['type']=='cylinder'),
                  'doorPrimitivesUnchanged':len(original_door),
                  'stoneOpeningWidth':.84}
    # Dos medias piezas idénticas forman la diagonal SE. El alma apoya
    # continuamente en la corona de pared Y=.755 y llega a la base del piso.
    diagonal=[strip('Deck',(.5,.5),(1,1),.94,.93,1.02),
              strip('OuterParapet',(.5,.5),(1,1),.10,1.02,1.20,-.42),
              strip('WallWeb',(.5,.5),(1,1),.34,.755,.93)]
    # Se omite por ahora el segundo pretil: en la junta con otra dirección
    # bloquearía el giro y requiere recorte propio según la máscara.
    d=save('e3b-walkway-diagonal-joined-candidate',HERE,
           'wall-walkway-diagonal-joined-candidate',diagonal,
           'Half span centre to SE vertex; matched neighbour required. Inner parapet pending.')
    diagonal_nw=[strip('Deck',(.5,.5),(0,0),.94,.93,1.02),
                 strip('OuterParapet',(.5,.5),(0,0),.10,1.02,1.20,-.42),
                 strip('WallWeb',(.5,.5),(0,0),.34,.755,.93)]
    d_nw=save('e3b-walkway-diagonal-nw-candidate',HERE,
              'wall-walkway-diagonal-nw-candidate',diagonal_nw,
              'Matching NW half span; explicit orientation, no negative scale.')
    # Gate x: jambas del GLB girado a los lados Z, paso público .08..92.
    # Pilares delgados tocan las jambas y acaban en la base del tablero.
    gate_base=[cube('GateDeck',0,1.27,-.27,1.27,.93,1.02),
               cube('JambPierNorth',.33,.67,0,.08,.72,.93),
               cube('JambPierSouth',.33,.67,.92,1,.72,.93)]
    gate65=gate_base+[
        strip('SouthWestDeck',(.5,.5),(-.5,1.5),.94,.93,1.02),
        strip('SouthWestWallWeb',(0,1),(-.5,1.5),.34,.755,.93)]
    g65=save('e3b-gate-crossing-65-candidate',GATE,'gate-crossing-65-candidate',gate65,
             'Gate x, N to SW; jamb piers outside public opening. No parapets on turning pad.')
    gate_z_base=[cube('GateDeck',-.27,1.27,0,1.27,.93,1.02),
                 cube('JambPierWest',0,.08,.33,.67,.72,.93),
                 cube('JambPierEast',.92,1,.33,.67,.72,.93)]
    gate128=gate_z_base+[
        strip('NorthWestDeck',(.5,.5),(-.5,-.5),.94,.93,1.02),
        strip('NorthWestWallWeb',(0,0),(-.5,-.5),.34,.755,.93)]
    g128=save('e3b-gate-crossing-128-candidate',GATE,'gate-crossing-128-candidate',gate128,
              'Gate z/NW endpoint study; second elevated neighbour absent from archived inventory.')
    gate24=gate_z_base+[
        strip('NorthEastDeck',(.5,.5),(1.5,-.5),.94,.93,1.02),
        strip('NorthEastWallWeb',(1,0),(1.5,-.5),.34,.755,.93)]
    g24=save('e3b-gate-crossing-24-candidate',GATE,'gate-crossing-24-candidate',gate24,
             'Current seed 91: gate z, W to NE; explicit variant with no mirrored scale.')
    # Pruebas geométricas independientes: banda diagonal de 0,94 ofrece radio
    # 0,47 en suelo, sin pretil interior. El apoyo .34 recorre ambos extremos.
    # Dos medias bandas colineales coinciden en el vértice, sin escalón.
    neighbour_nw=[]
    for p in diagonal_nw:
        q=json.loads(json.dumps(p))
        q['location'][0]+=1
        q['location'][1]-=1
        neighbour_nw.append(q)
    diagonal_sweep=disk_path([diagonal[0],neighbour_nw[0]],[(.75,.75),(1,1),(1.25,1.25)])
    diagonal_result={'source':d,'matchingSource':d_nw,
       'status':'conditional_join' if diagonal_sweep['passed'] else 'rejected_sweep',
       'floorY':1.02,'halfWidth':.47,'sweptDiskRadius':.35,
       'vertex': [1,1], 'neighbourTranslation':[1,1],
       'floorGapAtVertex':0,'stepAtVertex':0,
       'supportY':[.755,.93],'diskSweep':diagonal_sweep,
       'conditions':['verify clipped wall crown under the full web',
                     'design shortened parapets at bends',
                     'check forest/tree volume per cell']}
    # Sobre el portón, el disco del brazo cardinal cabe en X=.79±.35,
    # dentro del tablero 0..1,27; el diagonal cabe en una banda de radio .47.
    # El cambio de dirección ocurre dentro de la unión de ambos tableros.
    north_straight=cube('NeighbourStraight',.33,1.27,-1.27,0,.92,1.02)
    gate65_route=[(.79,-.25),(.79,.5),(.5,.5),(-.2,1.2)]
    gate65_sweep=disk_path([gate65[0],gate65[3],north_straight],gate65_route)
    gate_inspection_path=OUT/'gate-glb-inspection.json'
    gate_inspection=json.loads(gate_inspection_path.read_text(encoding='utf-8'))
    stone_gap=gate_inspection['stoneOpeningWidth']
    gate65_result={'source':g65,
       'status':'blocked_existing_gate_opening' if gate65_sweep['passed'] and stone_gap<.84 else 'rejected_sweep',
       'withWideFrameStatus':'candidate_pending_export_and_hinge_check' if gate65_sweep['passed'] else 'rejected_sweep',
       'gateAxis':'x','mask':65,'cardinalAxisX':.79,
       'cardinalClearRadius':min(.79,1.27-.79),
       'diagonalFloorHalfWidth':.47,'diskRadius':.35,
       'floorY':1.02,'deckUndersideY':.93,
       'routeXZ':gate65_route,'diskSweep':gate65_sweep,
       'publicOpeningZ':[.08,.92],'publicOpeningWidth':.84,
       'gateGlbStoneOpeningWidth':stone_gap,
       'existingOpeningShortfall':round(.84-stone_gap,9),
       'supportBoxes':[{'name':'JambPierNorth','x':[.33,.67],'y':[.72,.93],'z':[0,.08]},
                       {'name':'JambPierSouth','x':[.33,.67],'y':[.72,.93],'z':[.92,1]}],
       'wideFrameCandidate':frame_source,
       'conditions':['requires export and validation of the separate wide frame candidate',
                     'verify SW web against clipped wall and trees',
                     'discrete sweep does not replace exact collision geometry']}
    gate128_result={'source':g128,'status':'blocked_topology_sample',
       'mask':128,'archivedNeighbours':['NW diagonal'],
       'floorY':1.02,'deckUndersideY':.93,'publicOpeningWidth':.84,
       'gateGlbStoneOpeningWidth':stone_gap,
       'reason':'The archived mask has one elevated neighbour and the published stone opening is below 0.84. This candidate can terminate the NW approach but cannot certify through passage or a closed ring. Current simulation must be re-inventoried.'}
    west_straight=cube('NeighbourStraight',-1.27,0,.33,1.27,.92,1.02)
    gate24_route=[(-.25,.79),(.5,.79),(.5,.5),(1.2,-.2)]
    gate24_sweep=disk_path([gate24[0],gate24[3],west_straight],gate24_route)
    gate24_result={'source':g24,
       'status':'blocked_existing_gate_opening' if gate24_sweep['passed'] and stone_gap<.84 else 'rejected_sweep',
       'withWideFrameStatus':'candidate_pending_export_and_hinge_check' if gate24_sweep['passed'] else 'rejected_sweep',
       'gateAxis':'z','mask':24,'currentSample':{'seed':91,'year':80},
       'routeXZ':gate24_route,'diskSweep':gate24_sweep,
       'diskRadius':.35,'floorY':1.02,'deckUndersideY':.93,
       'publicOpeningX':[.08,.92],'logicalOpeningWidth':.84,
       'gateGlbStoneOpeningWidth':stone_gap,
       'existingOpeningShortfall':round(.84-stone_gap,9),
       'wideFrameCandidate':frame_source,
       'conditions':['requires export and validation of the separate wide frame candidate',
                     'verify NE web against clipped wall and trees',
                     'discrete sweep does not replace exact collision geometry']}
    report={'method':'CPU candidate geometry; GLB inspection is separate and read-only; no export, app or GPU',
            'gateInspection':{'path':gate_inspection_path.relative_to(ROOT).as_posix(),
                              'sha256':gate_inspection['sha256']},
            'variants':{'diagonalJoined':diagonal_result,'wideGateFrame':frame_source,
                        'gate65':gate65_result,
                        'gate24':gate24_result,'gate128':gate128_result}}
    (OUT/'measurements.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v['status'] for k,v in report['variants'].items()}))


if __name__=='__main__':
    main()
