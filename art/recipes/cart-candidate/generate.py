"""Modelos de aldea; metros, Y arriba, Z hacia la salida. Sólo candidatos."""
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
 path=HERE.parent/(id+'-candidate');path.mkdir(exist_ok=True);r=dict(schemaVersion=1,recipeType='explicit-mesh',id=id,units='metres',scale=1/3,palette='../palette.json',builder='../cart-candidate/build.py',description=description,triangleLimit=limit,metadata=metadata,meshes=[m.data() for m in meshes]);(path/(id+'.json')).write_text(json.dumps(r,indent=2)+'\n',encoding='utf8');print(id,sum(len(m.f) for m in meshes));return r
m=Mesh('bench')
for z in [-.115,.115]:m.box((0,.44,z),(1.65,.08,.21),'trunk')
for x in [-.58,.58]:m.box((x,.205,0),(.14,.41,.40),'soil');m.box((x,.68,-.20),(.085,.60,.085),'soil')
m.box((0,.18,0),(1.23,.09,.12),'trunk');m.box((0,.88,-.20),(1.65,.18,.075),'trunk')
save('bench',[m],100,'Banco de dos tablas con respaldo, dos patas anchas y travesaño.',seatHeightMetres=.48,seatWidthMetres=1.65,seatDepthMetres=.44,seatConnector=[0,.48,.03])
m=Mesh('log_seat');m.rod((-.65,.225,0),(.65,.225,0),.225,'trunk',8)
for i in range(16,len(m.c)):m.c[i]='neighborOchre'
save('log-seat',[m],100,'Tronco horizontal de corte claro y corteza oscura, para sentarse junto a la hoguera.',seatHeightMetres=.45,seatConnector=[0,.45,0])
m=Mesh('fence')
for x in [-1.43,1.43]:m.box((x,.55,0),(.14,1.10,.14),'trunk')
for y in [.38,.83]:m.box((0,y,0),(2.86,.11,.09),'soil')
m.rod((-1.32,.30,-.03),(1.32,.90,-.03),.055,'trunk',4)
save('fence',[m],60,'Cerca de dos varas y riostra; tramo exacto de una celda en X.',repeatMetres=3,blocking='Sólo candidato; la colisión corresponde a la futura integración.')
posts=Mesh('gate_posts')
for x in [-1.43,1.43]:posts.box((x,.55,0),(.14,1.10,.14),'trunk')
leaf=Mesh('gate_leaf',(-1.28,0,0))
for x in [-1.23,1.23]:leaf.box((x,.565,0),(.10,.71,.10),'soil')
for y in [.25,.88]:leaf.box((0,y,0),(2.56,.10,.10),'trunk')
leaf.rod((-1.20,.28,.015),(1.20,.85,.015),.05,'soil',4);leaf.box((1.24,.70,.065),(.17,.07,.035),'elderGrey')
save('fence-gate',[posts,leaf],100,'Portillo de madera con riostra diagonal, cierre y hoja articulada; un tramo de cerca.',hingeMesh='gate_leaf',hingeAxis='Y',openDegrees=90,clearOpeningMetres=2.72,repeatMetres=3)
body=Mesh('cart_body')
# Tabla inferior y cuatro paredes bajas, dejando la caja vacía.
for x in [-.40,-.20,0,.20,.40]:body.box((x,.78,-.35),(.19,.09,1.65),'trunk')
for x in [-.57,.57]:body.box((x,1.05,-.35),(.10,.48,1.72),'soil')
for z in [-1.19,.49]:body.box((0,1.05,z),(1.24,.48,.08),'soil')
# Dos varas largas dejan un gálibo de 0,96 m para el caballo.
for x in [-.52,.52]:body.box((x,1.08,1.22),(.095,.095,2.20),'trunk')
body.rod((-.86,.60,-.35),(.86,.60,-.35),.075,'elderGrey',6)
meshes=[body]
for side,x in [('l',-.76),('r',.76)]:
 wheel=Mesh('wheel_'+side,(x,.60,-.35));v=[];n=8
 for xx,rad in [(x-.07,.60),(x+.07,.60),(x-.07,.47),(x+.07,.47)]:
  v.extend([[xx,.60+rad*math.cos(i*2*math.pi/n),-.35+rad*math.sin(i*2*math.pi/n)] for i in range(n)])
 f=[]
 for i in range(n):
  j=(i+1)%n
  for a,b,c,d in [(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)]:f.extend([[a,b,c],[a,c,d]])
 wheel.add(v,f,'soil');wheel.rod((x-.105,.60,-.35),(x+.105,.60,-.35),.11,'neighborOchre',6)
 for angle in [0,45,90,135]:
  t=math.radians(angle);dy=.48*math.cos(t);dz=.48*math.sin(t);wheel.rod((x,.60-dy,-.35-dz),(x,.60+dy,-.35+dz),.035,'trunk',4)
 meshes.append(wheel)
save('cart',meshes,500,'Carro de dos ruedas de ocho radios, caja de madera y varas de tiro; origen en el suelo.',wheelAxis='X',wheelRadiusMetres=.60,shaftInnerWidthMetres=.945,shaftTipMetres=[0,1.08,2.32],hitchMetres=[0,1.08,2.32],bedHeightMetres=.825,axleMetres=[0,.60,-.35])
