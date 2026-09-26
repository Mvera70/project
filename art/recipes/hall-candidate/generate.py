"""Recetas candidatas de Astra, 26-09-2026. Ejecutar con Python desde el repositorio."""
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
P = []

def add(kind, name, pos, material, **kw):
    P.append(dict(type=kind, name=re.sub('[^A-Za-z0-9_]', '_', name), location=[pos[0], -pos[2], pos[1]], material=material, parent='Root', **kw))

def box(name, pos, size, mat='wood', rot=None):
    add('cube', name, pos, mat, dimensions=[size[0], size[2], size[1]], **({'rotationDegrees': rot} if rot else {}))

def beam(name, a, b, width=.12, mat='wood'):
    # Un cilindro de seis lados permite orientar vigas sin depender del giro de cubos del corredor antiguo.
    v=[b[i]-a[i] for i in range(3)]; length=math.sqrt(sum(x*x for x in v))
    az=math.degrees(math.atan2(v[0], v[2])); tilt=math.degrees(math.acos(v[1]/length))
    add('cylinder', name, [(a[i]+b[i])/2 for i in range(3)], mat, radius=width/2, depth=length, vertices=6, rotationDegrees=[tilt,0,az])

def sphere(name,pos,size,mat='stone',segments=7,rings=4):
    add('sphere',name,pos,mat,radius=1,dimensions=[size[0],size[2],size[1]],segments=segments,rings=rings)

def cyl(name,pos,r,d,mat='wood',n=8,rot=None):
    add('cylinder',name,pos,mat,radius=r,depth=d,vertices=n,rotationDegrees=rot or [0,0,0])

def save(id,roles,footprint,limit,notes='',pivot=None):
    folder=ROOT/'art/recipes'/f'{id}-candidate'; folder.mkdir(parents=True,exist_ok=True)
    recipe=dict(schemaVersion=1,id=id,scale=1/3,scaleNote='Metros de receta; una unidad GLB es una celda de 3 m.',mergeByMaterial=True,palette='../palette.json',house='thatched',note='Astra 26 sep 2026 · prioridades 1–4, candidato sin integrar.',metadata=dict(cellUnit=1,kind=id,footprint=footprint),materials=[dict(name=k,role=v,roughness=.95) for k,v in roles.items()],groups=[dict(name='Root',location=[0,0,0],parent=None)],primitives=list(P),connectors=[],clips=[],referenceRender=dict(width=640,height=640,cameraLocation=[5,-7,6],cameraTarget=[0,0,0],orthoScale=5,worldRole='sky'),candidateBuild=dict(adapter='../hall-candidate/build.py',triangleLimit=limit,notes=notes,doorPivot=pivot))
    (folder/f'{id}.json').write_text(json.dumps(recipe,indent=2)+'\n',encoding='utf8'); P.clear()

# Sala: volumen largo, porche delantero y cumbrera transversal a la entrada.
box('Foundation',(4.5,.2,3.5),(8.4,.4,6),'stone')
box('Wall_Back',(4.5,1.6,.65),(8.4,2.4,.3),'plaster')
for x in [.45,8.55]: box('Wall_Side_'+str(int(x*10)),(x,1.6,3.5),(.3,2.4,6),'plaster')
for x in [1.85,7.15]: box('Wall_Front_'+str(int(x*10)),(x,1.6,6.35),(3.1,2.4,.3),'plaster')
box('Wall_Lintel',(4.5,2.65,6.35),(2.2,.3,.3),'plaster')
# Gable local ridge Y; turn 90 degrees makes it run along world X.
add('gable','Thatched_Roof',(4.5,2.8,3.5),'roof',width=6.7,depth=9,height=2.8,rotationDegrees=[0,0,90])
for x in [.35,1.55,2.75,6.25,7.45,8.65]:
    box('Front_Post_'+str(int(x*100)),(x,1.6,6.54),(.15,2.4,.18))
for x in [.35,8.65]:
    for z in [1,2.2,3.4,4.6,5.8]: box('Side_Post_'+str(int(x*100))+'_'+str(int(z*10)),(x,1.6,z),(.16,2.4,.14))
for z in [.48,6.52]:
    box('Wall_Rail_'+str(int(z*100)),(4.5,.65,z),(8.4,.16,.15))
    box('Wall_Crown_'+str(int(z*100)),(4.5,2.7,z),(8.4,.16,.15))
for x in [.27,8.73]:
    for z in [1.6,3.5,5.4]:
        box('Shutter_'+str(int(x*100))+'_'+str(int(z*10)),(x,1.85,z),(.08,.62,.7),'window')
        box('Shutter_Bar_'+str(int(x*100))+'_'+str(int(z*10)),(x,1.85,z),(.12,.07,.74))
for x in [1.5,7.5]:
    box('Porch_Post_'+str(int(x*10)),(x,1.35,8.05),(.3,2.7,.3))
    beam('Porch_Brace_'+str(int(x*10)),(x,2.1,8.05),(x+(.65 if x<4 else -.65),2.62,8.05),.16)
box('Porch_Lintel',(4.5,2.65,8.05),(6.3,.22,.3))
box('Porch_Thatch',(4.5,2.8,7.35),(6.6,.2,2.15),'roof',[8,0,0])
box('Threshold',(4.5,.15,7),(2.65,.3,1.3),'stone')
for i in range(8): box('Door_Plank_'+str(i),(3.54+i*.275,1.6,6.57),(.266,2.4,.12),'door')
for x in [3.95,5.05]:
    for y in [.8,2.1]: box('Door_Rail_'+str(x)+'_'+str(y),(x,y,6.65),(1.03,.12,.07),'door')
for x in [.1,8.9]:
    for s in [-1,1]: beam('Gable_Cross_'+str(x)+'_'+str(s),(x,5.15,3.5-s*.28),(x,5.75,3.5+s*.28),.16)
cyl('Banner_Mast',(8.65,3.75,8.5),.075,7.5,n=6)
box('Banner',(8,6.85,8.5),(1.2,.7,.04),'banner')
save('hall',dict(stone='stone',plaster='plaster',wood='timber',roof='roof',door='timber',window='timberDark',banner='clothAccent'),[3,3],900,'Dos hojas sugeridas por junta central; hall_door es una malla única con pivote en la bisagra izquierda, según contrato actual. Cumbrera 5,6 m, remates 5,83 m y mástil 7,5 m. La puerta de 2,4 m comienza sobre el basamento de 0,4 m.',[3.407,-6.57,.4])

def table(w=2.1,d=.9,h=.84):
    for j in range(3):box('Table_Plank_'+str(j),(0,h,(j-1)*d/3),(w,.09,d/3-.014))
    for x in [-w*.38,w*.38]:
        for s in [-1,1]: beam('Trestle_'+str(x)+'_'+str(s),(x,.04,s*d*.45),(x,h-.05,s*d*.25),.12)
        beam('Trestle_Rail_'+str(x),(x,.32,-d*.43),(x,.32,d*.43),.1)
    beam('Table_Stretcher',(-w*.38,.3,0),(w*.38,.3,0),.1)

table()
for x in [-1.04,1.04]:
    beam('Canopy_Post_'+str(x),(x,0,-.6),(x,2.05,-.6),.1)
    beam('Canopy_Arm_'+str(x),(x,2.05,-.6),(x,1.55,.8),.06)
for i in range(7):box('Awning_Stripe_'+str(i),(-1.14+(i+.5)*2.28/7,1.82,.05),(2.28/7,.035,1.49),'awning-a' if i%2==0 else 'awning-b',[19,0,0])
for x in [-.67,-.34]:cyl('Cloth_Roll_'+str(x),(x,1,.03),.105,.52,'cloth',7,[90,0,0])
for x in [.24,.59]:
    cyl('Bowl_'+str(x),(x,.99,.05),.16,.13,'pot',8)
    cyl('Bowl_Inside_'+str(x),(x,1.057,.05),.123,.009,'dark',8)
for i in range(3):box('Ribbon_'+str(i),(.85+i*.065,.93,.24),(.045,.018,.33),'awning-a')
sphere('Bundle',(-.77,.22,-.92),(.62,.44,.48),'sack',6,4)
box('Bundle_Binding',(-.77,.43,-.92),(.07,.025,.42),'dark')
save('stall-pedlar',dict(wood='timber',**{'awning-a':'clothAccent','awning-b':'neighborLinen'},cloth='riverBlue',pot='soil',dark='timberDark',sack='neighborLinen'),[1,1],600)

table(1.5,.84,.78)
for s in [-1,1]:box('Ledger_Page_'+str(s),(-.33+s*.12,.885,.02),(.235,.035,.36),'paper',[0,s*7,0])
box('Ledger_Spine',(-.33,.875,.02),(.04,.06,.36),'dark')
for i in range(4): box('Ledger_Line_'+str(i),(-.45,.907,-.09+i*.06),(.12,.003,.011),'dark')
cyl('Scale_Base',(.4,.87,0),.14,.09,'metal',6)
beam('Scale_Stem',(.4,.9,0),(.4,1.46,0),.045,'metal')
beam('Scale_Crossbar',(.1,1.43,0),(.7,1.43,0),.035,'metal')
for x in [.1,.7]:
    for z in [-.095,.095]:beam('Scale_Cord_'+str(x)+'_'+str(z),(x,1.43,0),(x,1.14,z),.018,'dark')
    cyl('Scale_Pan_'+str(x),(x,1.12,0),.13,.025,'metal',8)
for i in range(2):box('Folded_Sack_'+str(i),(1.03,.04+i*.09,-.08),(.49,.075,.4),'sack',[0,0,i*12])
save('stall-factor',dict(wood='timber',paper='neighborLinen',dark='timberDark',metal='stone',sack='path'),[1,1],600)

for i,(x,y,z,w,h) in enumerate([(-.27,.27,0,.6,.54),(.18,.28,-.4,.59,.56),(-.09,.72,-.17,.55,.42)]):
    sphere('Sack_'+str(i),(x,y,z),(w,h,.53),'sack',7,4)
    if i<2:
        cyl('Sack_Neck_'+str(i),(x,y+h*.5-.025,z),.085,.13,'sack',6)
        cyl('Sack_Tie_'+str(i),(x,y+h*.5+.01,z),.09,.028,'wood',6)
    else:
        cyl('Open_Rim',(x,.92,z),.19,.075,'sack',8)
        add('cone','Salt_Heap',(x,.973,z),'salt',radius=.174,depth=.14,vertices=8)
beam('Paddle_Handle',(.65,.18,.2),(.75,1.1,-.25),.055)
box('Paddle_Blade',(.63,.16,.26),(.24,.31,.045),'wood',[-25,0,0])
save('stall-salter',dict(sack='neighborLinen',wood='timber',salt='sky'),[1,1],600,'La paleta no contiene blanco puro: salt usa sky (#DDE3C4), el color más claro autorizado. Pregunta para Vera: ¿aprobar ese marfil verdoso para sal o autorizar un blanco nuevo en una ronda posterior?')

for state in ['intact','mined','exhausted']:
    h=2.4 if state!='exhausted' else 1.2
    # Bancadas escalonadas, grietas reales entre bloques y caras de corte +Z.
    for i in range(5):
        x=-2.4+i*1.2
        cut=(state=='mined' and i in [2,3]) or state=='exhausted'
        height=h if not cut else (1.25 if state=='mined' else .55+.15*(i%3))
        box('Front_Block_'+str(i),(x,height/2,.38 if not cut else -.12),(1.18,height,1.9 if not cut else .9),'stone')
        sphere('Crown_'+str(i),(x,height-.12,-.18 if not cut else -.42),(1.2,.28,1.65 if not cut else .9),'rock',6,3)
        if state!='exhausted':box('Rear_Ledge_'+str(i),(x,1.05,-1.06),(1.19,2.1,.84),'rock')
    if state!='intact':
        for i in range(5):
            sphere('Rubble_'+str(i),(-2.35+i*1.12,.12+(i%2)*.03,1.15),(.48,.24+(i%2)*.06,.42),'rock',5,3)
        box('Cut_Block',(.4,.25,.62),(.75,.5,.67),'stone')
    save('quarry-face-'+state,dict(stone='stone',rock='stone'),[2,1],700,'Frente hacia +Z; cantera de 6×3 m de parcela. Los tres estados comparten origen y posición. rock usa el rol stone existente; no se añade color.')

for i,size in enumerate([(3,.65,2.05),(3,3.8,2.1),(3,2.15,2.6),(3,1.8,2.45),(3,2.65,1.8)],1):
    sphere('Crag',(0,size[1]/2,0),size,'stone',7,4)
    save('crag-'+str(i),dict(stone='stone'),[1,1],80,'Ancho exacto 3 m. Variante facetada; escala de juego prevista 0,15–1,3. La deformación determinista de facetas está declarada en candidateBuild.cragVariant.')
    p=ROOT/'art/recipes'/f'crag-{i}-candidate'/f'crag-{i}.json';r=json.loads(p.read_text());r['candidateBuild']['cragVariant']=i;p.write_text(json.dumps(r,indent=2)+'\n')
base=0
for i,(w,h,d) in enumerate([(1.5,.6,1.2),(1.13,.55,.91),(.77,.5,.68),(.43,.45,.4)]):
    sphere('Cairn_Stone_'+str(i),(.04*(i%2),base+h/2,0),(w,h,d),'stone',6,4);base+=h
save('cairn',dict(stone='stone'),[1,1],200,'Cuatro piedras, altura exacta 2,1 m (0,7 celdas).')
