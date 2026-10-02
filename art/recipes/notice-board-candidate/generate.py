"""Recetas del Bloque 1, en metros; formas legibles y presupuesto acotado."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
P=[]
M=[]
def cube(name,loc,size,mat='wood',rot=(0,0,0),parent='Root'):
    P.append(dict(type='cube',name=name,location=[v*3 for v in loc],dimensions=[v*3 for v in size],material=mat,parent=parent,rotationDegrees=list(rot),bevel=0,smooth=False))
def cyl(name,loc,r,depth,mat='wood',vertices=6,rot=(0,0,0),parent='Root'):
    P.append(dict(type='cylinder',name=name,location=[v*3 for v in loc],radius=r*3,depth=depth*3,vertices=vertices,material=mat,parent=parent,rotationDegrees=list(rot),bevel=0,smooth=False))
def bar(name,a,b,r=.009,mat='iron',parent='Root'):
    d=[b[i]-a[i] for i in range(3)]; n=math.sqrt(sum(v*v for v in d))
    # Barras en el plano XZ, con cilindros apuntando a Z.
    cyl(name,[(a[i]+b[i])/2 for i in range(3)],r,n,mat,3,(0,math.degrees(math.atan2(d[0],d[2])),0),parent)
def ring(name,x,y,z,r,mat='iron',segments=8,span=360):
    for i in range(segments):
        a=math.radians(90+(360-span)/2+i*span/segments); b=math.radians(90+(360-span)/2+(i+1)*span/segments)
        bar(name+str(i),(x+r*math.cos(a),y,z+r*math.sin(a)),(x+r*math.cos(b),y,z+r*math.sin(b)),.008,mat)
def roof(width,z,depth):
    angle=22; panel=width/2/math.cos(math.radians(angle)); rise=width/2*math.tan(math.radians(angle))
    for s in [-1,1]: cube('roof_'+str(s),(s*width/4,0,z+rise/2),(panel,depth,.035),'dark',(0,s*angle,0))
def paper(name,x,z,w,h):
    cube(name,(x,-.053,z),(w,.008,h),'paper',(0,0,(-3 if x<0 else 3)))
    cyl(name+'_pin',(x,-.061,z+h*.37),.009,.013,'iron',6,(90,0,0))
def save(id,limit,groups=None):
    roles={'wood':'timber','dark':'timberDark','paper':'saltWhite','linen':'neighborLinen','iron':'elderGrey','hide':'soil','hideLight':'trunk','accent':'clothAccent'}
    recipe=dict(schemaVersion=1,id=id,scale=1/3,scaleNote='Metros Blender; Z arriba, frente -Y; glTF Y arriba, frente +Z. Una celda = 3 m.',palette='../palette.json',house='thatched',mergeByMaterial=False,materials=[dict(name=k,role=v,roughness=.92) for k,v in roles.items()],groups=[dict(name='Root',location=[0,0,0],parent=None)]+(groups or []),primitives=P.copy(),clips=[],connectors=['grip'] if id=='hammer' else [],metadata=dict(cellUnit=1,kind=id,footprint=[1,1],note='Candidato Bloque 1. Exportación por build.py: color de vértice, material único; máximo '+str(limit)+' triángulos.'),referenceRender=dict(width=600,height=600,cameraLocation=[2,-3,2],cameraTarget=[0,0,.6],orthoScale=2,worldRole='sky'),triangleBudget=limit)
    folder=ROOT/'art/recipes'/f'{id}-candidate';folder.mkdir(parents=True,exist_ok=True)
    if M: recipe['polygonMeshes']=M.copy()
    (folder/f'{id}.json').write_text(json.dumps(recipe,indent=2)+'\n',encoding='utf8');P.clear()
    M.clear()

# Tablón de plaza: cuatro documentos luminosos bajo un tejado abierto.
for s in [-1,1]:
    cube('post_'+str(s),(s*.34,0,.59),(.065,.075,1.18),'dark')
    cube('foot_'+str(s),(s*.34,0,.035),(.13,.21,.07),'dark')
for i in range(4): cube('plank_'+str(i),(-.285+i*.19,0,.80),(.184,.07,.61),'wood' if i%2 else 'dark')
cube('lower_rail',(0,.052,.53),(.83,.04,.05))
roof(.865,1.11,.3)
for name,x,z,w,h in [('paper_1',-.20,.88,.16,.29),('paper_2',.025,.9,.2,.25),('paper_3',.24,.86,.13,.32),('paper_4',.025,.63,.14,.17)]: paper(name,x,z,w,h)
for primitive in P:
    if primitive['name'].startswith('paper_'): primitive['parent']='note_'+primitive['name'].split('_')[1]
save('notice-board',400,[dict(name='note_'+str(i),location=[0,0,0],parent='Root') for i in range(1,5)])

for id in ['smithy-board','chapel-board','tailor-board']:
    for s in [-1,1]: cube('leg_'+str(s),(s*.19,.015,.24),(.04,.04,.48),'dark')
    for i in range(3): cube('panel_'+str(i),(-.15+i*.15,0,.42),(.145,.065,.4),'dark' if id=='smithy-board' else 'wood')
    cube('rim',(0,-.035,.225),(.5,.035,.035),'wood')
    paper('notice',-.09,.4,.14,.24)
    paper('small_notice',.095,.37,.13,.18)
    if id=='smithy-board':
        ring('horseshoe',0,-.055,.626,.064,'iron',7,270)
        cube('soot',(0.15,-.035,.53),(.075,.003,.11),'dark')
    if id=='chapel-board':
        roof(.5,.60,.18)
        cube('cross_stem',(0,-.108,.653),(.018,.025,.094),'linen')
        cube('cross_arm',(0,-.108,.665),(.065,.025,.018),'linen')
    if id=='tailor-board':
        cyl('flax_skein',(-.07,-.063,.60),.036,.15,'linen',6,(0,12,0))
        cube('flax_tie',(-.065,-.09,.60),(.1,.017,.018),'accent')
        # Dos hojas y dos anillas: tijeras grandes, legibles por silueta.
        for s in [-1,1]:
            bar('scissor_blade_'+str(s),(.09,-.068,.6),(.09+s*.055,-.068,.7),.012)
            ring('scissor_loop_'+str(s),.09+s*.024,-.068,.564,.022,'iron',4)
    save(id,250)

cyl('post',(0,0,.55),.04,1.1,'dark',5)
cube('sign',(0,-.045,.9),(.56,.065,.2),'wood',(0,4,0))
for x in [-.21,.21]: cyl('nail_'+str(x),(x,-.085,.91),.012,.018,'iron',6,(90,0,0))
cube('arrow_shaft',(-.03,-.084,.9),(.23,.008,.022),'dark')
for s in [-1,1]: bar('arrow_'+str(s),(.07,-.088,.9),(.015,-.088,.9+s*.046),.014,'dark')
save('signpost',150)

# Bastidor: cada piel incluye sus ataduras, sin perder los nombres al fusionar.
for s in [-1,1]:
    cyl('upright_'+str(s),(s*.45,0,.45),.025,.9,'dark',6)
    cube('foot_'+str(s),(s*.45,0,.025),(.09,.4,.05),'dark')
for z in [.20,.86]: bar('rail_'+str(z),(-.48,0,z),(.48,0,z),.025,'wood')
for j in range(4):
    x=-.33+j*.22; parent='hide_'+str(j+1)
    # Silueta de piel: cuerpo octogonal y cuatro puntas tensadas.
    contour=[(-.085,.21),(-.11,.19),(-.055,.09),(-.095,.01),(-.055,-.09),(-.095,-.21),(-.065,-.22),(-.02,-.14),(.02,-.14),(.065,-.22),(.095,-.21),(.055,-.09),(.095,.01),(.055,.09),(.11,.19),(.085,.21)]
    verts=[[3*(x+px),3*y,3*(.52+pz)] for y in [-.029,-.021] for px,pz in contour]
    n=len(contour);faces=[list(range(n-1,-1,-1)),list(range(n,2*n))]+[[i,(i+1)%n,(i+1)%n+n,i+n] for i in range(n)]
    M.append(dict(name='skin_'+str(j),parent=parent,vertices=verts,faces=faces,material='hide' if j%2 else 'hideLight'))
    for s in [-1,1]:
        for t in [-1,1]:
            if t==1: bar('cord_'+str(j)+str(s)+str(t),(x+s*.075,-.025,.52+t*.20),(x+s*.085,0,.52+t*.33),.004,'linen',parent)
save('hide-rack',400,[dict(name='hide_'+str(i),location=[0,0,0],parent='Root') for i in range(1,5)])

# Martillo corto de forja; empuñadura en cero, misma orientación que axe.
cyl('handle',(0,0,.055),.012,.19,'wood',6)
cube('head',(0,0,.146),(.094,.046,.05),'iron')
cube('striking_face',(-.048,0,.146),(.015,.054,.058),'dark')
cube('wedge',(0,0,.174),(.014,.02,.006),'linen')
save('hammer',120,[dict(name='grip',location=[0,0,0],parent='Root')])
