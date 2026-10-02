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
 def round(self,p,s,c,n=8,rings=3):
  # Latitudes reales: evita los dos anillos de radio idéntico que parecían cilindros.
  v=[[p[0],p[1]-s[1],p[2]]];f=[]
  for j in range(rings):
   a=math.pi*(j+1)/(rings+1)
   v.extend([[p[0]+s[0]*math.sin(a)*math.cos(i*2*math.pi/n),p[1]-s[1]*math.cos(a),p[2]+s[2]*math.sin(a)*math.sin(i*2*math.pi/n)] for i in range(n)])
  v.append([p[0],p[1]+s[1],p[2]])
  for i in range(n):
   q=(i+1)%n;f.extend([[0,1+q,1+i],[len(v)-1,1+(rings-1)*n+i,1+(rings-1)*n+q]])
   for j in range(rings-1):
    a=1+j*n+i;b=1+j*n+q;f.extend([[a,b,b+n],[a,b+n,a+n]])
  self.add(v,f,c)
 def tube(self,rings,c,n=6):
  # Secciones en XZ para cuello erguido; cada centro dibuja su curva natural.
  v=[[x+r*math.cos(i*2*math.pi/n),y,z+r*math.sin(i*2*math.pi/n)] for x,y,z,r in rings for i in range(n)];f=[]
  for j in range(len(rings)-1):
   for i in range(n):q=(i+1)%n;a=j*n+i;b=j*n+q;f.extend([[a,b,b+n],[a,b+n,a+n]])
  for i in range(1,n-1):f.extend([[0,i+1,i],[(len(rings)-1)*n,(len(rings)-1)*n+i,(len(rings)-1)*n+i+1]])
  self.add(v,f,c)
 def data(self):return dict(name=self.name,origin=self.origin,vertices=self.v,faces=self.f,faceRoles=self.c)
def save(id,meshes,limit,description):
 path=HERE.parent/(id+'-candidate');path.mkdir(exist_ok=True)
 r=dict(schemaVersion=1,recipeType='explicit-mesh',id=id,units='metres',scale=1/3,palette='../palette.json',builder='../stork-candidate/build.py',description=description,triangleLimit=limit,meshes=[m.data() for m in meshes])
 (path/(id+'.json')).write_text(json.dumps(r,indent=2)+'\n',encoding='utf8')
 print(id,sum(len(m.f) for m in meshes))
m=Mesh('stork_body');m.round((0,.69,-.065),(.17,.205,.305),'saltWhite',12,3)
for s in [-1,1]:
 # Remeras pegadas al costado, perfil afinado; ya no son bloques negros añadidos.
 outline=[(.105,.80,.055),(.15,.765,-.075),(.163,.69,-.22),(.10,.54,-.325),(.16,.57,-.24),(.184,.62,-.135),(.176,.71,.005)]
 verts=[[s*.177,y,z] for x,y,z in outline]+[[s*.19,.685,-.115]]
 m.add(verts,[[7,i,(i+1)%7] for i in range(7)],'clericalBlack')
 m.rod((s*.065,.03,.025),(s*.065,.53,-.04),.014,'clothAccent')
 for spread in [-1,0,1]:m.add([[s*.065-.008,.018,.025],[s*.065+.008,.018,.025],[s*.065+spread*.035,.012,.115]],[[0,1,2]],'clothAccent')
m.tip((0,.66,-.28),(0,.55,-.40),.048,'saltWhite')
body=m;m=Mesh('stork_neck',(0,.81,.08));m.tube([(0,.80,.065,.054),(0,.89,.045,.051),(0,.965,.075,.043),(0,1.045,.14,.037),(0,1.115,.17,.038)],'saltWhite',6);m.round((0,1.16,.18),(.07,.082,.105),'saltWhite',8,3)
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
m=Mesh('chick_body')
# Un solo volumen continuo, con pecho y cabeza redonda; 48 triángulos de silueta.
n=8;v=[[0,.025,-.013]];f=[]
for y,rx,rz,z in [(.07,.081,.082,-.005),(.128,.062,.064,.028),(.18,.058,.056,.055)]:
 v.extend([[rx*math.cos(i*2*math.pi/n),y,z+rz*math.sin(i*2*math.pi/n)] for i in range(n)])
v.append([0,.213,.058])
for i in range(n):
 q=(i+1)%n;f.extend([[0,1+q,1+i],[25,17+i,17+q]])
 for j in range(2):a=1+j*n+i;b=1+j*n+q;f.extend([[a,b,b+n],[a,b+n,a+n]])
m.add(v,f,'grain');m.tip((0,.162,.102),(0,.154,.141),.015,'neighborOchre')
for s in [-1,1]:
 m.rod((s*.034,.008,.017),(s*.034,.049,.017),.007,'neighborOchre',3)
 m.add([[s*.047,.185,.080],[s*.049,.169,.08],[s*.047,.176,.092]],[[0,1,2]] if s<0 else [[2,1,0]],'clericalBlack')
 # Ala cerrada pequeña: cuatro caras, tono cálido sin añadir una bola al cuerpo.
 m.add([[s*.058,.114,.004],[s*.082,.081,-.008],[s*.042,.061,-.056],[s*.07,.083,-.029]],[[0,1,3],[1,2,3],[2,0,3],[0,2,1]],'neighborOchre')
save('chick',[m],80,'Polluelo amarillo redondo, cabeza grande y pico corto; sin cresta de adulto.')
m=Mesh('bird_body');m.round((0,.135,0),(.125,.105,.29),'elderGrey',8,3)
# Cuello de tres tramos con sección variable, sin varilla prismática larga.
v=[];f=[]
for z,y,r in [(.19,.15,.050),(.35,.16,.039),(.54,.165,.032),(.70,.18,.037)]:v.extend([[r*math.cos(i*math.pi/2),y+r*math.sin(i*math.pi/2),z] for i in range(4)])
for j in range(3):
 for i in range(4):q=(i+1)%4;a=j*4+i;b=j*4+q;f.extend([[a,b,b+4],[a,b+4,a+4]])
f.extend([[0,2,1],[0,3,2],[12,13,14],[12,14,15]]);m.add(v,f,'elderGrey')
m.round((0,.18,.73),(.057,.060,.079),'saltWhite',6,2);m.tip((0,.18,.79),(0,.17,.955),.020,'neighborOchre')
for s in [-1,1]:m.rod((s*.045,.11,-.16),(s*.055,.08,-.61),.013,'clericalBlack',3)
m.tip((0,.135,-.23),(0,.115,-.37),.045,'clericalBlack')
meshes=[m]
for side,s in [('l',-1),('r',1)]:
 wing=Mesh('bird_wing_'+side,(s*.09,.17,.10))
 outline=[(.09,.18),(.35,.29),(.67,.24),(.85,.10),(1.00,-.12),(.91,-.15),(.94,-.24),(.84,-.23),(.82,-.32),(.64,-.28),(.34,-.18),(.09,-.13)]
 v=[[s*x,.17-(max(x-.5,0))*.018,z] for x,z in outline]+[[s*.39,.222,-.01]];f=[[12,i,(i+1)%12] for i in range(12)]
 if s>0:f=[t[::-1] for t in f]
 wing.add(v,f,'elderGrey');wing.c[3:10]=['clericalBlack']*7;meshes.append(wing)
save('crane',meshes,150,'Grulla planeando: cuello extendido, patas hacia atrás, alas anchas y puntas negras. Alas de doble cara.')
meshes=[]
for side,s in [('l',-1),('r',1)]:
 m=Mesh('wing_'+side,(s*.003,.015,0));outline=[(.003,.031),(.047,.063),(.078,.040),(.063,.002),(.043,-.008),(.064,-.044),(.033,-.063),(.003,-.032)]
 v=[[s*x,.015,z] for x,z in outline]+[[s*.022,.015,.001]];f=[[8,i,(i+1)%8] for i in range(8)]
 if s>0:f=[t[::-1] for t in f]
 m.add(v,f,'grain');m.c[1]='clothAccent';m.c[5]='clothAccent';m.c[7]='clericalBlack';meshes.append(m)
save('butterfly',meshes,16,'Dos alas planas lobuladas, ocre con marcas terracota; doble cara, bisagra longitudinal.')
