"""Recetas de fauna en metros, +Y arriba y +Z delante."""
import json, math
from pathlib import Path
HERE=Path(__file__).resolve().parent
class Mesh:
 def __init__(self,name,origin=(0,0,0)): self.name=name;self.origin=origin;self.v=[];self.f=[];self.c=[]
 def add(self,v,f,c):
  n=len(self.v);self.v.extend([[p[i]-self.origin[i] for i in range(3)] for p in v]);self.f.extend([[n+i for i in t] for t in f]);self.c.extend([c]*len(f))
 def ell(self,p,s,c,n=6):
  v=[[p[0],p[1]-s[1],p[2]]];f=[]
  for y,r in [(-.45,.85),(.45,.85)]:
   v.extend([[p[0]+s[0]*r*math.cos(i*2*math.pi/n),p[1]+s[1]*y,p[2]+s[2]*r*math.sin(i*2*math.pi/n)] for i in range(n)])
  v.append([p[0],p[1]+s[1],p[2]])
  for i in range(n):
   j=(i+1)%n;f.extend([[0,1+j,1+i],[1+i,1+j,1+n+j],[1+i,1+n+j,1+n+i],[1+2*n,1+n+i,1+n+j]])
  self.add(v,f,c)
 def rod(self,a,b,r,c,n=4):
  import numpy as np
  a=np.array(a);b=np.array(b);d=b-a;d=d/np.linalg.norm(d);u=np.cross(d,[0,1,0] if abs(d[1])<.9 else [1,0,0]);u=u/np.linalg.norm(u);w=np.cross(d,u)
  v=[list(p+r*(u*math.cos(i*2*math.pi/n)+w*math.sin(i*2*math.pi/n))) for p in [a,b] for i in range(n)]
  f=[]
  for i in range(n):
   j=(i+1)%n;f.extend([[i,j,n+j],[i,n+j,n+i]])
  for i in range(1,n-1):f.extend([[0,i+1,i],[n,n+i,n+i+1]])
  self.add(v,f,c)
 def tip(self,a,b,w,c):
  x,y,z=a;self.add([[x-w,y-w,z],[x+w,y-w,z],[x,y+w,z],b],[[0,2,1],[0,1,3],[1,2,3],[2,0,3]],c)
 def data(self):return dict(name=self.name,origin=self.origin,vertices=self.v,faces=self.f,faceRoles=self.c)
def save(id,meshes,limit,description):
 path=HERE.parent/(id+'-candidate');path.mkdir(exist_ok=True)
 r=dict(schemaVersion=1,recipeType='explicit-mesh',id=id,units='metres',scale=1/3,palette='../palette.json',builder='../stork-candidate/build.py',description=description,triangleLimit=limit,meshes=[m.data() for m in meshes])
 (path/(id+'.json')).write_text(json.dumps(r,indent=2)+'\n',encoding='utf8')
 print(id,sum(len(m.f) for m in meshes))
m=Mesh('stork_body');m.ell((0,.67,-.04),(.17,.23,.29),'saltWhite',8)
for s in [-1,1]:
 m.ell((s*.125,.67,-.13),(.065,.18,.22),'clericalBlack',5)
 m.rod((s*.065,.03,.025),(s*.065,.53,-.04),.014,'clothAccent')
 m.rod((s*.065,.018,-.015),(s*.065,.018,.115),.012,'clothAccent',3)
body=m;m=Mesh('stork_neck',(0,.81,.08));m.rod((0,.81,.08),(0,1.12,.16),.045,'saltWhite',5);m.ell((0,1.16,.17),(.07,.09,.09),'saltWhite',6)
m.tip((0,1.16,.23),(0,1.14,.47),.029,'clothAccent')
for s in [-1,1]:m.add([[s*.063,1.18,.195],[s*.066,1.155,.21],[s*.067,1.18,.22]],[[0,1,2]] if s<0 else [[2,1,0]],'clericalBlack')
save('stork',[body,m],250,'Cigüeña erguida: cuello blanco largo, remeras negras y patas/pico rojizos.')
m=Mesh('nest');n=12
# Tres anillos y fondo cóncavo, hueco superior legible.
v=[]
for radius,y in [(.47,.03),(.55,.20),(.37,.19),(.30,.08)]:v.extend([[radius*math.cos(i*2*math.pi/n),y,radius*math.sin(i*2*math.pi/n)] for i in range(n)])
f=[]
for ring in range(3):
 for i in range(n):j=(i+1)%n;f.extend([[ring*n+i,ring*n+j,(ring+1)*n+j],[ring*n+i,(ring+1)*n+j,(ring+1)*n+i]])
m.add(v,f,'trunk');m.add([[0,.077,0]]+v[36:],[[0,1+i,1+(i+1)%n] for i in range(n)],'soil')
for i in range(12):
 a=i*2*math.pi/12;x=.49*math.cos(a);z=.49*math.sin(a);dx=-math.sin(a)*.22;dz=math.cos(a)*.22
 m.rod((x-dx,.18+(i%2)*.018,z-dz),(x+dx,.20+(i%2)*.018,z+dz),.022,'neighborOchre' if i%3==0 else 'trunk',3)
save('stork-nest',[m],200,'Nido abierto de ramas gruesas entrecruzadas, sin huevos ni aves incrustadas.')
m=Mesh('chick_body');m.ell((0,.10,0),(.083,.078,.087),'grain',6);m.ell((0,.158,.059),(.063,.059,.055),'grain',6)
m.tip((0,.154,.10),(0,.145,.155),.024,'neighborOchre')
for s in [-1,1]:
 m.rod((s*.034,.008,.017),(s*.034,.049,.017),.007,'neighborOchre',3)
 m.add([[s*(.05355-(z-.059)*.66+.0008),y,z] for y,z in [(.18,.082),(.162,.082),(.17,.099)]],[[0,1,2]] if s<0 else [[2,1,0]],'clericalBlack')
save('chick',[m],80,'Polluelo amarillo redondo, cabeza grande y pico corto; sin cresta de adulto.')
m=Mesh('bird_body');m.ell((0,.13,0),(.13,.10,.27),'elderGrey',6);m.rod((0,.15,.19),(0,.17,.70),.038,'elderGrey',4);m.ell((0,.18,.73),(.055,.055,.075),'saltWhite',4);m.tip((0,.18,.77),(0,.17,.96),.025,'neighborOchre')
for s in [-1,1]:m.rod((s*.045,.11,-.16),(s*.055,.08,-.61),.013,'clericalBlack',3)
meshes=[m]
for side,s in [('l',-1),('r',1)]:
 wing=Mesh('bird_wing_'+side,(s*.09,.17,.10))
 outline=[(.09,.18),(.38,.29),(.81,.16),(1.00,-.17),(.76,-.31),(.58,-.28),(.32,-.19),(.09,-.13)]
 v=[[s*x,.17,z] for x,z in outline]+[[s*.39,.19,-.01]];f=[[8,i,(i+1)%8] for i in range(8)]
 if s>0:f=[t[::-1] for t in f]
 wing.add(v,f,'elderGrey');wing.c[2:6]=['clericalBlack']*4;meshes.append(wing)
save('crane',meshes,150,'Grulla planeando: cuello extendido, patas hacia atrás, alas anchas y puntas negras. Alas de doble cara.')
meshes=[]
for side,s in [('l',-1),('r',1)]:
 m=Mesh('wing_'+side,(s*.003,.015,0));outline=[(.003,.031),(.047,.063),(.078,.040),(.063,.002),(.043,-.008),(.064,-.044),(.033,-.063),(.003,-.032)]
 v=[[s*x,.015,z] for x,z in outline]+[[s*.022,.015,.001]];f=[[8,i,(i+1)%8] for i in range(8)]
 if s>0:f=[t[::-1] for t in f]
 m.add(v,f,'grain');m.c[1]='clothAccent';m.c[5]='clothAccent';m.c[7]='clericalBlack';meshes.append(m)
save('butterfly',meshes,16,'Dos alas planas lobuladas, ocre con marcas terracota; doble cara, bisagra longitudinal.')
