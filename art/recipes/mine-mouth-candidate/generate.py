"""Modelos de minería; metros, Y arriba, Z hacia la salida. Sólo candidatos."""
import json,math
from pathlib import Path
import numpy as np
from mathutils import Euler,Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
class Mesh:
 def __init__(self,name,origin=(0,0,0)):self.name=name;self.origin=list(origin);self.v=[];self.f=[];self.c=[]
 def add(self,v,f,c):
  n=len(self.v);self.v.extend([[float(p[i]-self.origin[i]) for i in range(3)] for p in v]);self.f.extend([[n+i for i in t] for t in f]);self.c.extend([c]*len(f))
 def box(self,p,size,c):
  x,y,z=p;a,b,d=[k/2 for k in size];v=[[x+sx*a,y+sy*b,z+sz*d] for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]];f=[]
  for a,b,c1,d in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:f.extend([[a,b,c1],[a,c1,d]])
  self.add(v,f,c)
 def rod(self,a,b,r,c,n=6):
  a=np.array(a);b=np.array(b);d=b-a;d=d/np.linalg.norm(d);u=np.cross(d,[0,1,0] if abs(d[1])<.9 else [1,0,0]);u=u/np.linalg.norm(u);w=np.cross(d,u)
  v=[list(p+r*(u*math.cos(i*2*math.pi/n)+w*math.sin(i*2*math.pi/n))) for p in [a,b] for i in range(n)];f=[]
  for i in range(n):j=(i+1)%n;f.extend([[i,j,n+j],[i,n+j,n+i]])
  for i in range(1,n-1):f.extend([[0,i+1,i],[n,n+i,n+i+1]])
  self.add(v,f,c)
 def rock(self,p,size,c,rot=(0,0,0),n=7):
  # Misma topología de anillos que las rocas de bear-den, menos segmentos.
  matrix=Euler(tuple(math.radians(t) for t in rot),'XYZ').to_matrix();v=[[0,-1,0]];f=[]
  for y,r in [(-.5,.8660254),(.5,.8660254)]:v.extend([[r*math.cos(i*2*math.pi/n),y,r*math.sin(i*2*math.pi/n)] for i in range(n)])
  v.append([0,1,0]);v=[list(Vector(p)+matrix@Vector([point[i]*size[i]/2 for i in range(3)])) for point in v]
  for i in range(n):j=(i+1)%n;f.extend([[0,j+1,i+1],[1+i,1+j,1+n+j],[1+i,1+n+j,1+n+i],[1+2*n,1+n+i,1+n+j]])
  self.add(v,f,c)
 def octa(self,p,size,c):
  x,y,z=p;a,b,d=[k/2 for k in size];self.add([[x-a,y,z],[x+a,y,z],[x,y-b,z],[x,y+b,z],[x,y,z-d],[x,y,z+d]],[[3,0,4],[3,4,1],[3,1,5],[3,5,0],[2,4,0],[2,1,4],[2,5,1],[2,0,5]],c)
 def data(self):return dict(name=self.name,origin=self.origin,vertices=self.v,faces=self.f,faceRoles=self.c)
def save(id,meshes,limit,description,**metadata):
 folder='ore-pile' if id.startswith('ore-pile') else id;path=HERE.parent/(folder+'-candidate');path.mkdir(exist_ok=True)
 r=dict(schemaVersion=1,recipeType='explicit-mesh',id=id,units='metres',scale=1/3,palette='../palette.json',builder='../mine-mouth-candidate/build.py',description=description,triangleLimit=limit,metadata=metadata,meshes=[m.data() for m in meshes]);(path/(id+'.json')).write_text(json.dumps(r,indent=2)+'\n',encoding='utf8');print(id,sum(len(m.f) for m in meshes))
def rails(m,start=0,length=3):
 for x in [-.60,.60]:m.box((x,.13,start+length/2),(.10,.12,length),'trunk')
 for z in [.22,.86,1.5,2.14]:
  if z<length:m.box((0,.045,start+z),(1.55,.09,.18),'soil')
m=Mesh('rails');rails(m);save('rails',[m],80,'Tramo de dos raíles de madera de 3 m (1 celda), cuatro traviesas. Inicio Z=0; continuidad hasta Z=3 m.',gaugeMetres=1.2,railTopMetres=.19,repeatMetres=3)
# La boca parte literalmente de posiciones, proporciones y rotaciones de bear-den.
source=json.loads((ROOT/'art/recipes/bear-den/bear-den.json').read_text());m=Mesh('mine_mouth');factor=1.32
for spec in source['primitives']:
 if spec['name']=='ShadowOpening':continue
 p=spec['location'];d=spec['dimensions'];rot=spec['rotationDegrees'];p=[p[0]*3*factor,p[2]*3*factor,-p[1]*3*factor];size=[d[0]*3*factor,d[2]*3*factor,d[1]*3*factor]
 m.rock(p,size,'stone' if spec['name']!='RearMass' else 'elderGrey',(rot[0],rot[2],-rot[1]),8)
# Fondo y galería corta realmente transitables visualmente hasta el plano de ocultación.
m.box((0,1.70,-1.78),(3.65,3.5,.10),'clericalBlack');m.box((0,.005,-.10),(3.45,.08,3.3),'soil')
for side in [-1,1]:m.box((side*1.64,1.65,-.08),(.10,3.3,3.5),'clericalBlack')
m.box((0,3.50,-.08),(3.4,.10,3.5),'elderGrey')
for x in [-1.5,1.5]:m.box((x,1.69,1.53),(.32,3.38,.42),'trunk')
m.box((0,3.36,1.53),(3.50,.36,.45),'trunk')
# Riostras y extremos claros de la madera.
for x in [-1,1]:
 m.rod((x*1.43,2.76,1.56),(x*.93,3.27,1.56),.11,'soil',4)
 m.box((x*1.5,3.37,1.77),(.23,.25,.012),'neighborOchre')
rails(m,-1.70,3);rails(m,1.30,3)
save('mine-mouth',[m],1200,'Boca rocosa derivada de bear-den a ×1,32, entibado de dos postes y dintel, riostras, galería oscura y raíles de salida.',sourceRecipe='art/recipes/bear-den/bear-den.json',rockScale=1.32,sinkCells=.08,connectors={'entrance':[0,0,1.80],'hide_plane':[0,0,-1.70],'rail_end':[0,.19,4.3]},clearOpeningMetres=[2.68,3.18],gaugeMetres=1.2)
body=Mesh('cart_body');v=[]
for a,y,b in [(.48,.39,.62),(.62,1.08,.80),(.55,1.08,.73),(.41,.47,.55)]:v.extend([[-a,y,-b],[a,y,-b],[a,y,b],[-a,y,b]])
f=[]
for ring in range(3):
 for i in range(4):j=(i+1)%4;f.extend([[ring*4+i,ring*4+j,(ring+1)*4+j],[ring*4+i,(ring+1)*4+j,(ring+1)*4+i]])
f.extend([[0,2,1],[0,3,2],[12,13,14],[12,14,15]]);body.add(v,f,'trunk')
for x in [-.32,.32]:body.box((x,.33,0),(.13,.13,1.64),'soil')
for z in [-.50,.50]:body.rod((-.72,.23,z),(.72,.23,z),.05,'elderGrey',4)
# Flejes sobre cada lateral, planos para no gastar geometría invisible.
for side in [-1,1]:
 for z in [-.51,.51]:body.add([[side*.484,.40,z-.025],[side*.624,1.079,z-.025],[side*.624,1.079,z+.025],[side*.484,.40,z+.025]],[[0,1,2],[0,2,3]],'elderGrey')
body.box((0,.70,-.85),(.76,.08,.10),'soil')
for x in [-.32,.32]:body.box((x,.70,-.76),(.06,.07,.25),'soil')
meshes=[body]
for side,x in [('l',-.60),('r',.60)]:
 for end,z in [('front',.50),('rear',-.50)]:
  wheel=Mesh('wheel_'+side+'_'+end,(x,.23,z));wheel.rod((x-.07,.23,z),(x+.07,.23,z),.23,'elderGrey',8)
  # Dos caras de madera oscura alternadas permiten leer el giro del disco.
  for i in range(len(wheel.c)):
   if i>=16:wheel.c[i]='soil' if i%3 else 'neighborOchre'
  meshes.append(wheel)
save('minecart',meshes,300,'Vagoneta vacía de madera con cuba hueca, flejes, cuatro ruedas facetadas y travesaño de empuje.',wheelRadiusMetres=.23,wheelAxis='X',gaugeMetres=1.2)
ore=Mesh('ore_load',(0,.82,0))
for i,(x,z) in enumerate([(-.27,-.4),(.25,-.35),(-.26,.08),(.26,.12),(0,.42),(0,-.08)]):ore.octa((x,1.02+(i==5)*.25,z),(.65,.48,.60),'strangerSlate' if i%2 else 'elderGrey')
save('minecart-full',meshes+[ore],300,'La misma vagoneta con mineral en ore_load separable. Quitarlo recupera exactamente la vagoneta vacía.',wheelRadiusMetres=.23,wheelAxis='X',gaugeMetres=1.2,removableMesh='ore_load')
# Cuatro acopios sin escala artificial: aumenta el número y altura de piedras.
rocks=[(-.38,.19,-.18,.65,.38,.64),(.31,.22,-.18,.70,.44,.65),(0,.22,.35,.72,.44,.65),(-.15,.55,.04,.65,.52,.64),(.68,.19,.20,.65,.38,.60),(-.72,.20,.26,.66,.40,.67),(.48,.19,-.67,.67,.38,.63),(-.36,.19,-.65,.72,.38,.69),(.34,.53,-.30,.68,.51,.68),(-.32,.54,-.37,.66,.49,.63),(0,.83,-.15,.60,.48,.61),(-.08,.48,.54,.70,.46,.64)]
for stage,count in enumerate([2,4,8,12],1):
 m=Mesh('ore_pile')
 for i,(x,y,z,a,b,d) in enumerate(rocks[:count]):m.rock((x,y,z),(a,b,d),'elderGrey' if i%3 else 'strangerSlate',(i*11,i*17,i*7),6)
 save('ore-pile-'+str(stage),[m],300,'Acopio de mineral, estado '+str(stage)+' de 4: '+str(count)+' rocas facetadas.',stage=stage,rockCount=count)
 if stage==4:save('ore-pile',[m],300,'Acopio mayor; alias geométrico de ore-pile-4. Estados 1, 2, 3 y 4 en GLB independientes.',stage=stage,rockCount=count)
