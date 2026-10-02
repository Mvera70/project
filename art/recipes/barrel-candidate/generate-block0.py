import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
P=json.loads((ROOT/'art/recipes/palette.json').read_text()); colors={**P['valley'],**P['houses']['thatched']}
models={}
def start(id):
 global a; a=[]; models[id]=a

def box(n,p,d,m='timber',r=(0,0,0)):
 a.append(dict(type='cube',name=n,location=p,dimensions=d,material=m,rotationDegrees=r))
def cyl(n,p,rad,h,m='timber',v=6,r=(0,0,0)):
 a.append(dict(type='cylinder',name=n,location=p,radius=rad,depth=h,vertices=v,material=m,rotationDegrees=r))
def cone(n,p,rad,h,m='roof',v=6):
 a.append(dict(type='cone',name=n,location=p,radius=rad,depth=h,vertices=v,material=m,rotationDegrees=[0,0,0]))
def ball(n,p,d,m='foliage',v=5):
 a.append(dict(type='sphere',name=n,location=p,radius=1,dimensions=d,segments=v,rings=3,material=m,rotationDegrees=[0,0,0]))
def roof(n,p,w,d,h,m='roof'):
 a.append(dict(type='gable',name=n,location=p,width=w,depth=d,height=h,material=m,rotationDegrees=[0,0,0]))
start('barrel')
cyl('Belly',(0,0,.36),.31,.48,v=8); cyl('Foot',(0,0,.08),.255,.16,v=8); cyl('Top',(0,0,.64),.255,.16,v=8)
for z in [.15,.56]: cyl('Hoop'+str(int(z*100)),(0,0,z),.318,.065,'elderGrey',8)
start('crate')
box('Box',(0,0,.27),(.65,.52,.54))
for x in [-.26,.26]: box('Brace'+str(x).replace('-','L').replace('.',''),(x,-.271,.27),(.065,.025,.52),'timberDark')
box('Diagonal',(0,-.288,.27),(.065,.025,.68),'timberDark',(0,46,0)); box('Lid',(0,0,.55),(.67,.54,.045),'timberDark')
start('sack-pile')
for i,(x,y,z,s) in enumerate([(-.23,0,.21,1),(.24,.08,.19,.9),(0,0,.49,.8)]):
 ball('Sack'+str(i),(x,y,z),(.52*s,.4*s,.43*s),'neighborLinen',6); cyl('Tie'+str(i),(x,y,z+.21*s),.065,.055,'trunk',4)
start('tool-rack')
box('Rail',(0,.03,.56),(1.0,.08,.09),'timberDark')
for i,x in enumerate([-.38,0,.38]):
 box('Handle'+str(i),(x,0,.51),(.045,.045,1.02))
box('Spade',(-.38,-.01,.15),(.2,.045,.24),'elderGrey'); box('Rake',(0,0,.95),(.28,.04,.05),'elderGrey')
for i,x in enumerate([-.1,0,.1]): box('Tine'+str(i),(x,0,.88),(.025,.04,.12),'elderGrey')
box('Fork',(.38,0,.95),(.19,.04,.035),'elderGrey')
for i,x in enumerate([.31,.45]): box('Prong'+str(i),(x,0,1.04),(.025,.04,.2),'elderGrey')
start('washing-line')
for i,x in enumerate([-.85,.85]): box('Post'+str(i),(x,0,.68),(.065,.065,1.36),'trunk')
box('Line',(0,0,1.26),(1.72,.015,.015),'neighborLinen')
for i,(x,w,h,m) in enumerate([(-.48,.36,.5,'saltWhite'),(0,.32,.34,'clothAccent'),(.43,.38,.6,'neighborLinen')]): box('Cloth'+str(i),(x,0,1.25-h/2),(w,.025,h),m)
start('flower-pot')
cyl('Pot',(0,0,.16),.19,.32,'clothAccent'); cyl('Rim',(0,0,.32),.21,.07,'clothAccent'); ball('Leaves',(0,0,.4),(.42,.38,.22))
for i,(x,y) in enumerate([(-.13,0),(.1,.06),(0,-.12)]): ball('Flower'+str(i),(x,y,.54),(.12,.12,.09),'grain',4)
start('herb-bed')
box('Soil',(0,0,.045),(.95,.6,.09),'soil')
for i,x in enumerate([-.46,.46]): box('Edge'+str(i),(x,0,.085),(.065,.67,.17),'timberDark')
for i,(x,y) in enumerate([(-.26,-.14),(.03,-.14),(.29,-.14),(-.21,.17),(.17,.17)]): ball('Herb'+str(i),(x,y,.23),(.27,.26,.32),'foliage' if i%2 else 'foliageLight',4)
start('beehive')
box('Board',(0,0,.06),(.61,.57,.12)); cyl('Skep',(0,0,.31),.25,.4,'roof',8); cone('Dome',(0,0,.61),.25,.23,'roof',8)
for i,z in enumerate([.2,.32,.44]): cyl('Wicker'+str(i),(0,0,z),.256,.028,'grain',8)
box('Entrance',(0,-.25,.15),(.095,.02,.065),'timberDark')
start('scarecrow')
box('Stake',(0,0,.7),(.07,.07,1.4),'trunk'); box('Arms',(0,0,1.03),(.96,.065,.065),'trunk',(0,0,0)); box('Tunic',(0,0,.9),(.36,.19,.45),'clothAccent'); ball('Head',(0,0,1.28),(.23,.21,.25),'neighborLinen',5); cyl('Brim',(0,0,1.42),.23,.035,'roof',6); cone('Hat',(0,0,1.51),.15,.2,'roof',6)
start('trough')
box('Bottom',(0,0,.1),(.95,.4,.11),'timberDark')
for i,y in enumerate([-.2,.2]):box('Side'+str(i),(0,y,.24),(1,.065,.29))
for i,x in enumerate([-.47,.47]):box('End'+str(i),(x,0,.24),(.065,.4,.29))
box('Water',(0,0,.22),(.87,.33,.016),'riverBlue')
start('chicken-coop')
for i,(x,y) in enumerate([(-.32,-.24),(.32,-.24),(-.32,.24),(.32,.24)]):box('Leg'+str(i),(x,y,.19),(.075,.075,.38),'timberDark')
box('House',(0,0,.59),(.8,.61,.5));roof('Roof',(0,0,.84),.95,.76,.26);box('Door',(0,-.313,.53),(.23,.016,.32),'timberDark');box('Ramp',(0,-.55,.21),(.25,.61,.05),'timberDark',(30,0,0))
start('stump')
cyl('Trunk',(0,0,.19),.29,.38,'trunk',7);cyl('Cut',(0,0,.386),.265,.015,'neighborLinen',7)
for i,(x,y) in enumerate([(-.25,0),(.2,.16),(.07,-.25)]):box('Root'+str(i),(x,y,.07),(.25,.17,.14),'trunk',(0,0,i*110))
start('wood-chopping')
cyl('Stump',(0,0,.2),.29,.4,'trunk',7);cyl('Cut',(0,0,.406),.264,.015,'neighborLinen',7);box('AxeHandle',(.1,0,.71),(.04,.04,.69),'timber',(0,20,0));box('Blade',(-.04,0,.46),(.27,.04,.2),'elderGrey',(0,20,0))
for i,x in enumerate([-.36,.32]):box('Chip'+str(i),(x,-.15,.035),(.19,.08,.07),'neighborLinen',(0,0,i*42))
start('fallen-log')
cyl('Bark',(0,0,.23),.23,1.25,'trunk',7,(0,90,0))
for i,x in enumerate([-.63,.63]):cyl('End'+str(i),(x,0,.23),.2,.018,'neighborLinen',7,(0,90,0))
ball('Moss',(-.13,0,.4),(.69,.32,.17),'foliage',5)
start('bush')
for i,(x,y,z,d) in enumerate([(-.22,0,.25,.53),(.2,.08,.3,.62),(0,-.16,.37,.55)]):ball('Crown'+str(i),(x,y,z),(d,d*.83,d),'foliage' if i%2 else 'foliageLight',6)
start('wildflowers')
for i,(x,y,z) in enumerate([(-.24,-.11,.22),(0,.13,.32),(.23,-.07,.27),(-.17,.19,.2),(.15,.2,.18)]):
 box('Stem'+str(i),(x,y,z/2),(.022,.022,z),'foliage');ball('Blossom'+str(i),(x,y,z),(.16,.16,.09),'saltWhite' if i%2 else 'grain',4)
start('mushrooms')
for i,(x,y,h) in enumerate([(-.2,0,.18),(.13,.13,.24),(.17,-.18,.12)]):
 cyl('Stem'+str(i),(x,y,h/2),.035,h,'neighborLinen',4);cone('Cap'+str(i),(x,y,h),.14 if i==1 else .1,.1,'clothAccent',6)
start('stone-wall')
for row in range(2):
 for i in range(4):box('Stone'+str(row)+str(i),(-.375+i*.25,0,.095+row*.17),(.245,.22 if row else .29,.19),'stone',(0,0,(-1)**i*3))
start('wayside-shrine')
box('Foot',(0,0,.07),(.48,.38,.14),'stone');box('Pillar',(0,0,.34),(.25,.25,.5),'stone');box('Niche',(0,0,.76),(.49,.18,.47),'stone');box('Recess',(0,-.097,.77),(.32,.015,.35),'timberDark');roof('Coping',(0,0,1),.61,.35,.23,'stone');box('CrossUpright',(0,-.119,.78),(.045,.026,.26),'neighborLinen');box('CrossArms',(0,-.119,.83),(.19,.026,.04),'neighborLinen')
start('lantern-post')
box('Post',(0,0,.8),(.08,.08,1.6),'timberDark');box('Arm',(.14,0,1.55),(.36,.065,.065),'timberDark');box('Glass',(.28,0,1.32),(.19,.17,.28),'grain');roof('Hood',(.28,0,1.47),.27,.24,.12,'elderGrey');box('Base',(.28,0,1.17),(.23,.21,.045),'elderGrey')
for i,x in enumerate([.18,.38]):box('Frame'+str(i),(x,-.09,1.32),(.018,.018,.29),'elderGrey')
start('market-awning')
for i,(x,y) in enumerate([(-.65,-.37),(.65,-.37),(-.65,.37),(.65,.37)]):box('Post'+str(i),(x,y,.59),(.05,.05,1.18),'timberDark')
roof('Canvas',(0,0,1.16),1.5,.99,.21,'neighborLinen');box('Valance',(0,-.5,1.15),(1.5,.035,.16),'clothAccent')
for i,x in enumerate([-.36,.33]):
 cyl('Basket'+str(i),(x,-.03,.18),.23,.36,'timber',6);cyl('Produce'+str(i),(x,-.03,.365),.2,.015,'grain' if i else 'foliage',6)
for p in models['stone-wall']:
 p['location']=list(p['location']);p['dimensions']=list(p['dimensions']);p['location'][0]*=3;p['dimensions'][0]*=3
for id,prims in models.items():
 for p in prims:p.update(parent='Root',bevel=0,smooth=False)
 mats=sorted(set(p['material'] for p in prims))
 recipe=dict(schemaVersion=1,id=id,scale={'market-awning':1.7/3,'washing-line':1.45/3,'lantern-post':1.5/3}.get(id,1/3),palette='../palette.json',house='thatched',mergeByMaterial=True,materials=[dict(name=m.lower(),role=m,color=colors[m],roughness=.92) for m in mats],groups=[dict(name='Root',location=[0,0,0],parent=None)],connectors=[],clips=[],metadata=dict(cellUnit=1,kind=id,footprint=[1,1],note='Bloque 0: geometría estática facetada, +Z al frente en glTF. Fuente en celdas; paleta canónica art/recipes/palette.json.'),referenceRender=dict(width=400,height=400,cameraLocation=[2,-3,2.5],cameraTarget=[0,0,.5],orthoScale=2.2,worldColor=colors['sky'],worldRole='sky'),primitives=prims)
 for p in prims:p['material']=p['material'].lower()
 directory=ROOT/'art/recipes'/f'{id}-candidate';directory.mkdir(parents=True,exist_ok=True);(directory/f'{id}.json').write_text(json.dumps(recipe,indent=2)+'\n')
print('Recipes:',len(models))

