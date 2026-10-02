import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];P=json.loads((ROOT/'art/recipes/palette.json').read_text());colors={**P['valley'],**P['houses']['thatched']};models={};anchors={}
def start(id,anchor):
 global a;a=[];models[id]=a;anchors[id]=anchor
def box(n,p,d,m='timber',r=(0,0,0)):a.append(dict(type='cube',name=n,location=list(p),dimensions=list(d),material=m,rotationDegrees=list(r)))
def cyl(n,p,rad,h,m='timber',v=6,r=(0,0,0)):a.append(dict(type='cylinder',name=n,location=list(p),radius=rad,depth=h,vertices=v,material=m,rotationDegrees=list(r)))
def cone(n,p,rad,h,m='roof',v=6,r=(0,0,0)):a.append(dict(type='cone',name=n,location=list(p),radius=rad,depth=h,vertices=v,material=m,rotationDegrees=list(r)))
def ball(n,p,d,m='foliage',v=5):a.append(dict(type='sphere',name=n,location=list(p),radius=1,dimensions=list(d),segments=v,rings=3,material=m,rotationDegrees=[0,0,0]))
start('fiddle','hand_r')
ball('UpperBout',(0,0,-.23),(.25,.1,.23),'clothAccent',6);ball('LowerBout',(0,0,-.4),(.31,.11,.25),'clothAccent',6)
box('Neck',(0,0,.01),(.06,.065,.34),'timberDark');ball('Scroll',(0,0,.21),(.105,.085,.1),'timber',4)
box('Fingerboard',(0,-.059,-.08),(.04,.013,.39),'timberDark');box('Bridge',(0,-.075,-.32),(.12,.028,.034),'neighborLinen');box('Bow',(.23,0,-.12),(.025,.03,.8),'timberDark');box('BowHair',(.20,-.015,-.12),(.013,.012,.76),'saltWhite')
start('pilgrim-hat','head')
cyl('Brim',(0,0,.43),.40,.045,'roof',10);cone('Crown',(0,0,.605),.26,.32,'roof',8);cyl('Band',(0,0,.483),.25,.075,'timberDark',8);ball('Scallop',(0,-.259,.50),(.13,.035,.11),'saltWhite',5)
start('pilgrim-staff','hand_r')
cyl('Staff',(0,0,.45),.031,2.18,'trunk',6);cyl('Ferrule',(0,0,-.61),.034,.1,'elderGrey',6);ball('Gourd',(0.13,0,.88),(.23,.21,.29),'roof',6);cyl('GourdNeck',(.13,0,1.055),.045,.11,'roof',5);box('Cord',(.075,0,1.14),(.18,.025,.026),'neighborLinen');ball('Knob',(0,0,1.56),(.09,.08,.12),'trunk',4)
start('grindstone-pack','spine')
cyl('Stone',(0,.35,.33),.30,.14,'stone',8,(90,0,0));cyl('Axle',(0,.44,.33),.045,.11,'elderGrey',4,(90,0,0))
for i,x in enumerate([-.25,.25]):box('Frame'+str(i),(x,.28,.22),(.065,.09,.76),'timberDark')
box('Crossbar',(0,.29,-.1),(.6,.08,.07),'timberDark')
for i,x in enumerate([-.39,.39]):
 cyl('Pot'+str(i),(x,.31,-.085),.115,.23,'elderGrey',5);cone('PotMouth'+str(i),(x,.31,.032),.095,.003,'timberDark',5)
for i,x in enumerate([-.19,.19]):box('Strap'+str(i),(x,.145,.24),(.045,.025,.64),'neighborLinen')
def basket(id,herbs):
 start(id,'hand_r');cyl('Basket',(0,0,-.29),.20,.26,'timber',6);cyl('Rim',(0,0,-.16),.213,.042,'timberDark',6)
 for i,x in enumerate([-.18,.18]):box('HandleSide'+str(i),(x,0,-.08),(.025,.035,.16),'timberDark')
 box('HandleGrip',(0,0,0),(.38,.035,.025),'timberDark')
 if herbs:
  for i,(x,y) in enumerate([(-.10,.08),(.09,.09),(0,-.085)]):cone('Herb'+str(i),(x,y,-.09),.105,.31,'foliage' if i%2 else 'foliageLight',5)
 else:
  ball('Leaves',(0,0,-.14),(.3,.29,.13),'foliage',4)
  for i,x in enumerate([-.10,.105]):cyl('Stem'+str(i),(x,.065,-.1),.025,.13,'neighborLinen',3);cone('Mushroom'+str(i),(x,.065,-.035),.082,.08,'clothAccent',5)
basket('herb-basket',True);basket('forage-basket',False)
start('bundle-pack','spine')
ball('ClothBundle',(0,.35,.23),(.61,.43,.74),'clothAccent',7)
for i,x in enumerate([-.20,.20]):box('Strap'+str(i),(x,.125,.23),(.07,.03,.7),'neighborLinen')
box('CrossTie',(0,.579,.26),(.55,.03,.07),'neighborLinen');box('LongTie',(0,.579,.25),(.065,.03,.59),'neighborLinen');ball('Knot',(0,.61,.26),(.12,.085,.11),'neighborLinen',4)
start('rope-pick','spine')
for i in range(8):
 t=i*math.pi/4;box('Rope'+str(i),(.12+math.cos(t)*.18,.30,.42+math.sin(t)*.18),(.156,.065,.065),'neighborLinen',(0,-(i*45+90),0))
cyl('PickHandle',(-.19,.36,.16),.027,.99,'timber',4)
for i,x in enumerate([-.31,-.07]):box('PickArm'+str(i),(x,.36,.63),(.29,.065,.055),'elderGrey',(0,(-1 if i else 1)*20,0))
box('Lashing',(-.15,.395,.31),(.12,.025,.045),'trunk')
start('trade-pack','spine')
box('Bale',(0,.35,.24),(.60,.4,.70),'neighborLinen')
for i,x in enumerate([-.19,.19]):
 box('BackStrap'+str(i),(x,.561,.24),(.055,.025,.71),'trunk');box('ShoulderStrap'+str(i),(x,.137,.24),(.055,.025,.71),'trunk')
box('Belt',(0,.578,.16),(.61,.025,.055),'trunk');cyl('Bedroll',(0,.35,.69),.12,.66,'cloth',6,(0,90,0));box('Buckle',(.19,.593,.16),(.08,.019,.09),'elderGrey')
start('hide-bundle','spine')
for i,z in enumerate([.18,.31,.44]):ball('Fold'+str(i),(0,.35,z),(.62,.34,.16),'trunk' if i%2 else 'soil',6)
for i,x in enumerate([-.18,.18]):box('Tie'+str(i),(x,.53,.31),(.04,.025,.42),'neighborLinen')
box('ShoulderFlap',(.20,.16,.40),(.20,.23,.065),'soil');box('HangingFlap',(-.25,.34,.065),(.13,.27,.27),'trunk')
for id,prims in models.items():
 for p in prims:p.update(parent='Root',bevel=0,smooth=False)
 roles=sorted(set(p['material'] for p in prims));connector='grip' if anchors[id]=='hand_r' else 'mount'
 recipe=dict(schemaVersion=1,id=id,scale=1/3,palette='../palette.json',house='thatched',mergeByMaterial=True,materials=[dict(name=m.lower(),role=m,color=colors[m],roughness=.94) for m in roles],groups=[dict(name='Root',location=[0,0,0],parent=None),dict(name=connector,location=[0,0,0],parent='Root')],connectors=[connector],clips=[],metadata=dict(cellUnit=1,kind=id,footprint=[1,1],attachment=anchors[id],note='Bloque 5. Metros fuente a celdas; frente +Z glTF. Origen en enganche, NO en base. Ajuste de montaje medido contra el nodo publicado en attachment.json; escala inversa del padre para evitar escala doble. Recurso estático preview-only.'),referenceRender=dict(width=400,height=400,cameraLocation=[2,-3,2],cameraTarget=[0,0,0],orthoScale=1,worldColor=colors['sky'],worldRole='sky'),primitives=prims)
 for p in prims:p['material']=p['material'].lower()
 d=ROOT/'art/recipes'/f'{id}-candidate';d.mkdir(parents=True,exist_ok=True);(d/f'{id}.json').write_text(json.dumps(recipe,indent=2)+'\n',encoding='utf-8')
(ROOT/'art/recipes/fiddle-candidate/ids.json').write_text(json.dumps(list(models)),encoding='utf-8')
print('Recipes',len(models))
