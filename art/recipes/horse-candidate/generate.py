"""Caballo de tiro: silueta propia y contrato óseo/locomotor heredado de mule."""
import json,runpy,copy,math
import numpy as np
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
api=runpy.run_path(str(HERE.parent/'cart-candidate/generate.py'));Mesh=api['Mesh'];meshes=[];scale=1.18
source=json.loads((HERE.parent/'mule/mule.json').read_text());rig=copy.deepcopy(source['rig']);rig['bind']={}
for bone in rig['bones']:
 for key in ['head','tail']:
  if bone['name'] in ['head','ear-1','ear1']:bone[key][2]+=.31
  bone[key]=[v*scale for v in bone[key]]
def part(name,bone):
 m=Mesh(name);meshes.append(m);rig['bind'][name]=bone;return m
def loft(m,rings,c,n=8,axis=(1,0,0)):
 d=np.array(axis,dtype=float);d/=np.linalg.norm(d);u=np.cross(d,[0,0,1]);u/=np.linalg.norm(u);w=np.cross(d,u)
 v=[list(np.array(p)+ry*math.cos(i*2*math.pi/n)*u+rz*math.sin(i*2*math.pi/n)*w) for p,ry,rz in rings for i in range(n)];f=[]
 for k in range(len(rings)-1):
  for i in range(n):
   a=k*n+i;b=k*n+(i+1)%n;f.extend([[a,b,b+n],[a,b+n,a+n]])
 for i in range(1,n-1):f.extend([[0,i+1,i],[(len(rings)-1)*n,(len(rings)-1)*n+i,(len(rings)-1)*n+i+1]])
 m.add(v,f,c)
m=part('horse_torso','body');loft(m,[((-.82,1.18,0),.19,.21),((-.52,1.18,0),.36,.37),((-.10,1.14,0),.34,.35),((.43,1.17,0),.34,.34),((.72,1.18,0),.27,.27),((.82,1.19,0),.13,.16)],'trunk',10)
m=part('horse_neck','neck');loft(m,[((-.59,1.15,0),.25,.27),((-.72,1.38,0),.25,.24),((-.84,1.62,0),.20,.20),((-.99,1.80,0),.15,.16)],'trunk',8,(-.5,1,0))
m=part('horse_head','head');loft(m,[((-1.02,1.87,0),.12,.13),((-1.14,1.77,0),.19,.17),((-1.28,1.58,0),.13,.13),((-1.42,1.42,0),.12,.14)],'trunk',8,(-.6,-1,0));loft(m,[((-1.40,1.45,0),.125,.145),((-1.48,1.35,0),.09,.13)],'neighborLinen',8,(-.6,-1,0))
for side,s in [('l',-1),('r',1)]:
 m=part('eye_'+side,'head');m.box((-1.205,1.78,s*.15),(.06,.048,.012),'clericalBlack')
 m=part('ear_'+side,'ear-1' if s<0 else 'ear1');m.octa((-1.03,1.98,s*.115),(.10,.25,.09),'trunk')
m=part('horse_mane','neck');m.rock((-.59,1.61,0),(.17,.67,.13),'clericalBlack',(0,0,28),5)
for name,x,z in [('foreL',-.495,.17),('foreR',-.495,-.17),('hindL',.51,.17),('hindR',.51,-.17)]:
 m=part(name+'_upper',name);m.rock((x,.665,z),(.24,.54,.24),'trunk',n=8)
 m=part(name+'_lower',name+'Lower');loft(m,[((x,.07,z),.07,.075),((x,.44,z),.06,.065)],'neighborLinen',6,(0,1,0))
 m=part(name+'_hoof',name+'Foot');loft(m,[((x-.025,0,z),.105,.10),((x-.025,.07,z),.105,.10),((x-.015,.11,z),.075,.075)],'clericalBlack',6,(0,1,0))
m=part('horse_tail','tail');m.rod((.76,1.30,0),(.90,.44,0),.075,'clericalBlack',6);m.rock((.89,.48,0),(.19,.34,.18),'clericalBlack',n=5)
# Collar de tiro sobrio integrado en cuerpo; el anclaje de las varas es dato del recurso.
m=part('draft_collar','body');m.rod((-.63,1.41,-.30),(-.70,.92,-.30),.055,'soil',5);m.rod((-.63,1.41,.30),(-.70,.92,.30),.055,'soil',5);m.rod((-.70,.94,-.30),(-.70,.94,.30),.055,'soil',5)
for m in meshes:m.v=[[v*scale for v in p] for p in m.v]
clips=copy.deepcopy(source['clips'])
for clip in clips:
 if 'strideLength' in clip:clip['strideLength']*=scale
 for track in clip['tracks']:
  for key in track.get('location',[]):key['offset']=[v*scale/3 for v in key['offset']]
r=dict(schemaVersion=1,recipeType='explicit-mesh-skinned',id='horse',units='metres',scale=1/3,palette='../palette.json',builder='../cart-candidate/build.py',description='Caballo de tiro castaño, pecho ancho, cuello alto, orejas cortas, crin y cola oscuras; sin alforjas.',triangleLimit=900,metadata=dict(forward='-X',sourceSkeleton='art/recipes/mule/mule.json',boneHierarchy='Idéntica a mule; proporciones del caballo, cabeza y orejas elevadas.',fps=24,walkStrideCells=.24*scale,hitchMetres=[-.70*scale,.94*scale,0],shaftClearanceMetres=.86,mobileStatus='preview-only'),rig=rig,clips=clips,meshes=[m.data() for m in meshes])
(HERE/'horse.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf8');print('horse',sum(len(m.f) for m in meshes))
