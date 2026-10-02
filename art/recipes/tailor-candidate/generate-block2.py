import json,math,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
P=json.loads((ROOT/'art/recipes/palette.json').read_text());colors={**P['valley'],**P['houses']['thatched']};models={}
def start(id):
 global a;a=[];models[id]=a
def box(n,p,d,m='timber',r=(0,0,0)):a.append(dict(type='cube',name=n,location=list(p),dimensions=list(d),material=m,rotationDegrees=list(r)))
def cyl(n,p,rad,h,m='timber',v=6,r=(0,0,0)):a.append(dict(type='cylinder',name=n,location=list(p),radius=rad,depth=h,vertices=v,material=m,rotationDegrees=list(r)))
def cone(n,p,rad,h,m='roof',v=6,r=(0,0,0)):a.append(dict(type='cone',name=n,location=list(p),radius=rad,depth=h,vertices=v,material=m,rotationDegrees=list(r)))
def ball(n,p,d,m='foliage',v=5):a.append(dict(type='sphere',name=n,location=list(p),radius=1,dimensions=list(d),segments=v,rings=3,material=m,rotationDegrees=[0,0,0]))
def roof(n,p,w,d,h,m='roof'):a.append(dict(type='gable',name=n,location=list(p),width=w,depth=d,height=h,material=m,rotationDegrees=[0,0,0]))
start('loom')
for i,(x,y) in enumerate([(-.78,-.48),(.78,-.48),(-.78,.52),(.78,.52)]):box('Upright'+str(i),(x,y,.69),(.11,.11,1.38),'timberDark')
for i,x in enumerate([-.78,.78]):
 box('Foot'+str(i),(x,0,.065),(.17,1.4,.13));box('SideRail'+str(i),(x,0,.92),(.09,1.15,.09))
for i,y in enumerate([-.5,.53]):
 cyl('Roller'+str(i),(0,y,1.07),.095,1.65,'timber',6,(0,90,0));box('BaseBeam'+str(i),(0,y,.28),(1.65,.09,.09),'timberDark')
box('WovenLinen',(0,-.32,1.075),(1.3,.43,.026),'neighborLinen')
for i,x in enumerate([-.6,-.4,-.2,0,.2,.4,.6]):box('Warp'+str(i),(x,.19,1.075),(.024,.62,.013),'saltWhite')
for i,x in enumerate([-.7,.7]):box('ReedPost'+str(i),(x,-.065,1.32),(.05,.045,.56))
box('ReedBeam',(0,-.065,1.57),(1.48,.06,.065))
for i,x in enumerate([-.28,.28]):box('Treadle'+str(i),(x,-.22,.18),(.13,.72,.05),'timber',(9,0,0))
box('Shuttle',(.21,-.26,1.13),(.34,.07,.06),'timberDark')
start('linen-bolt')
cyl('Linen',(0,0,.16),.16,.68,'neighborLinen',8,(0,90,0));box('Tail',(0,-.19,.05),(.68,.3,.045),'saltWhite');cyl('Core',(.346,0,.16),.05,.015,'timber',6,(0,90,0))
start('tailor')
box('Foundation',(3,3,.075),(5.35,5.4,.15),'stone');box('PorchFloor',(3,.75,.13),(5.1,1.35,.12),'timberDark')
box('BackWall',(3,5.36,1.4),(4.96,.22,2.6),'plaster')
for i,x in enumerate([.61,5.39]):box('SideWall'+str(i),(x,3.62,1.4),(.23,3.48,2.6),'plaster')
for i,x in enumerate([1.1,4.9]):box('FrontPanel'+str(i),(x,1.86,1.4),(1.2,.23,2.6),'plaster')
box('Lintel',(3,1.82,2.58),(4.94,.22,.25),'timberDark')
for i,x in enumerate([.5,1.78,4.23,5.5]):box('FrontPost'+str(i),(x,1.72,1.35),(.13,.16,2.55),'timberDark')
for i,x in enumerate([.51,5.49]):
 for j,y in enumerate([3.65,5.45]):box('SidePost'+str(i)+str(j),(x,y,1.4),(.14,.15,2.7),'timberDark')
for i,x in enumerate([.49,5.51]):box('SideBeam'+str(i),(x,3.6,1.55),(.12,3.65,.13),'timberDark')
roof('MainRoof',(3,3.75,2.67),6,4.5,1.68)
# Dos capas de alero y remate de cumbrera conservan el lenguaje de la casa.
for i,x in enumerate([.17,5.83]):box('Eave'+str(i),(x,3.75,2.7),(.26,4.5,.14),'roof')
box('Ridge',(3,3.75,4.31),(.22,4.5,.13),'grain')
roof('GablePlaster',(3,1.79,2.66),4.9,.08,1.4,'plaster');box('KingPost',(3,1.715,3.23),(.14,.1,1.23),'timberDark')
for i,x in enumerate([1.64,4.36]):box('GableBrace'+str(i),(x,1.71,3.18),(.13,.1,1.85),'timberDark',(0,(-1 if i else 1)*52,0))
# Lona corta en la mitad izquierda: el telar de la derecha queda visible desde arriba.
box('LinenAwning',(1.28,.86,2.35),(2.25,1.72,.065),'neighborLinen',(-12,0,0));box('AwningEdge',(1.28,.04,2.17),(2.25,.045,.22),'clothAccent')
for i,x in enumerate([.25,2.31]):box('AwningPost'+str(i),(x,.05,1.11),(.08,.08,2.22),'timberDark')
# Mesa de corte con rollos claros bajo la lona.
box('CuttingTable',(1.24,.7,.85),(1.65,.84,.11),'timber')
for i,x in enumerate([.59,1.88]):box('TableLeg'+str(i),(x,.7,.44),(.1,.62,.78),'timberDark')
for i,y in enumerate([.45,.77]):cyl('LinenRoll'+str(i),(1.24,y,1.02),.13,1.2,'saltWhite' if i else 'neighborLinen',6,(0,90,0))
# El mismo telar del recurso suelto, colocado en la zona abierta del porche.
for p in models['loom']:
 q=copy.deepcopy(p);q['name']='Porch_'+q['name'];q['location']=[q['location'][0]+3.65,q['location'][1]+.8,q['location'][2]+.19];a.append(q)
# Tres madejas huecas colgadas del lateral: siluetas de lazo que se leen de perfil.
box('YarnRail',(5.62,3.4,1.94),(.13,2.05,.09),'timberDark')
for i,y in enumerate([2.68,3.4,4.12]):
 for j,yy in enumerate([y-.12,y+.12]):box('SkeinSide'+str(i)+str(j),(5.73,yy,1.49),(.1,.08,.78),'neighborLinen' if i%2 else 'saltWhite')
 for j,z in enumerate([1.12,1.87]):box('SkeinEnd'+str(i)+str(j),(5.73,y,z),(.1,.31,.1),'neighborLinen' if i%2 else 'saltWhite')
# Ventana trasera amplia: la fachada del oficio no se confunde con la casa.
box('BackWindow',(3,5.49,1.62),(1.75,.03,.83),'timberDark')
for i,x in enumerate([2.45,3,3.55]):box('WindowBar'+str(i),(x,5.52,1.62),(.05,.045,.79),'timber')
start('field-flax')
box('Soil',(4.5,3,.04),(9,6,.08),'soil')
for row in range(7):
 y=.46+row*.84
 a.append(dict(type='gable',name='Furrow'+str(row),location=[4.5,y,.08],width=.6,depth=8.45,height=.075,material='soil',rotationDegrees=[0,0,90]))
 for col in range(16):
  x=.45+col*.54;h=.67+((row*7+col*3)%5)*.035
  cyl(f'Stem_{row}_{col}',(x,y,.08+h/2),.014,h,'foliageLight',3)
  # Brote de dos ramas, flor pentagonal azul con pequeño centro claro.
  cone(f'Leaf_{row}_{col}',(x+.065,y,.08+h*.54),.035,.28,'foliageLight',3,(0,35,0))
  cyl(f'Flower_{row}_{col}',(x,y,.1+h),.155,.025,'riverBlue',5)
  cyl(f'Pollen_{row}_{col}',(x,y,.115+h),.027,.028,'saltWhite',3)
start('field-flax-cut')
box('Soil',(4.5,3,.04),(9,6,.08),'soil')
for row in range(5):
 a.append(dict(type='gable',name='CutRow'+str(row),location=[4.5,.55+row*1.18,.08],width=.26,depth=8.45,height=.075,material='roof',rotationDegrees=[0,0,90]))
for i,(x,y) in enumerate([(1.4,1.1),(4.5,1.1),(7.6,1.1),(2.95,3.8),(6.1,3.8)]):
 cone('SheafBase'+str(i),(x,y,.32),.29,.49,'neighborLinen',6);cone('SheafTop'+str(i),(x,y,.75),.26,.4,'grain',6,(180,0,0));cyl('Tie'+str(i),(x,y,.55),.085,.07,'trunk',4)
for id,prims in models.items():
 for p in prims:p.update(parent='Root',bevel=0,smooth=False)
 roles=sorted(set(p['material'] for p in prims));foot=[2,2] if id=='tailor' else [3,2] if id.startswith('field') else [1,1]
 recipe=dict(schemaVersion=1,id=id,scale=1/3,palette='../palette.json',house='thatched',mergeByMaterial=True,materials=[dict(name=m.lower(),role=m,color=colors[m],roughness=.94) for m in roles],groups=[dict(name='Root',location=[0,0,0],parent=None)],connectors=[],clips=[],metadata=dict(cellUnit=1,kind=id,footprint=foot,note='Bloque 2: sastrería y lino; modelo estático pendiente de K5. Unidades fuente en metros; celda=3m. Frente glTF +Z. Edificio/campos conservan esquina frontal izquierda como la casa/campo canónicos; accesorios centrados.'),referenceRender=dict(width=400,height=400,cameraLocation=[4,-5,4],cameraTarget=[0,0,.5],orthoScale=4,worldColor=colors['sky'],worldRole='sky'),primitives=prims)
 for p in prims:p['material']=p['material'].lower()
 d=ROOT/'art/recipes'/f'{id}-candidate';d.mkdir(parents=True,exist_ok=True);(d/f'{id}.json').write_text(json.dumps(recipe,indent=2)+'\n')
(ROOT/'art/recipes/tailor-candidate/ids.json').write_text(json.dumps(list(models)))
print('Generated',list(models))

