"""Golondrina en vuelo: receta explícita de tres mallas, metros, paleta del valle."""
import json
import math
from pathlib import Path

HERE=Path(__file__).resolve().parent
meshes=[]
verts=[];faces=[];mats=[]
def face(v,material=0):faces.append(v);mats.append(material)
# Anillos hexagonales: abdomen, pecho, cuello/cabeza y frente. +Z es el vuelo.
for z,w,h,y in [(-.035,.0045,.004,0),(-.015,.009,.007,0),(.009,.0105,.008,.001),(.029,.0065,.006,.001)]:
    for i in range(6):
        a=2*math.pi*i/6;verts.append([math.cos(a)*w,y+math.sin(a)*h,z])
for ring in range(3):
    for i in range(6):
        n=(i+1)%6
        material=1 if i in [3,4,5] else 0
        face([ring*6+i,ring*6+n,(ring+1)*6+n],material)
        face([ring*6+i,(ring+1)*6+n,(ring+1)*6+i],material)
verts.extend([[0,0,-.04],[0,.001,.038]])
for i in range(6):
    n=(i+1)%6;face([24,n,i]);face([25,18+i,18+n],1 if i in [3,4,5] else 0)
# Cola ahorquillada: dos timoneras largas en cuña, integradas en bird_body.
for sign in [-1,1]:
    start=len(verts)
    shape=[[sign*.001,-.001,-.03],[sign*.006,.001,-.03],[sign*.013,0,-.065]]
    verts.extend([[x,y+.001,z] for x,y,z in shape]+[[x,y-.001,z] for x,y,z in shape])
    for tri in [[0,1,2],[5,4,3],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[2,5,3],[2,3,0]]:face([start+i for i in tri],2)
# Pico corto y dos ojos muy pequeños, todo en la malla del cuerpo.
start=len(verts);verts.extend([[-.002,.001,.035],[.002,.001,.035],[0,.003,.035],[0,.001,.044]])
for tri in [[0,2,1],[0,1,3],[1,2,3],[2,0,3]]:face([start+i for i in tri],2)
for sign in [-1,1]:
    start=len(verts);verts.extend([[sign*.0066,.003,.027],[sign*.0064,.005,.026],[sign*.0063,.003,.025]])
    face([start,start+1,start+2] if sign<0 else [start+2,start+1,start],2)
meshes.append(dict(name='bird_body',origin=[0,0,0],vertices=verts,faces=faces,faceMaterials=mats))
for side,sign in [('l',-1),('r',1)]:
    origin=[sign*.008,.002,.008]
    outline=[(.008,.016),(.049,.024),(.125,-.039),(.062,-.022),(.008,-.015)]
    v=[]
    for thickness in [.0012,-.0012]:
        for x,z in outline:v.append([sign*x-origin[0],thickness,z-origin[2]])
    v.extend([[sign*.042-origin[0],.0035,-.001-origin[2]],[sign*.042-origin[0],-.0012,-.001-origin[2]]])
    f=[];m=[]
    for i in range(5):
        j=(i+1)%5
        f.extend([[10,i,j],[11,5+j,5+i],[i,5+i,5+j],[i,5+j,j]])
        m.extend([0 if i in [0,4] else 2,0,2,2])
    # El polígono superior descrito XZ debe mirar hacia +Y; reflejar invierte la normal.
    if sign>0:f=[list(reversed(t)) for t in f]
    meshes.append(dict(name='bird_wing_'+side,origin=origin,vertices=v,faces=f,faceMaterials=m))
recipe=dict(schemaVersion=1,recipeType='explicit-mesh',id='bird',units='metres',scale=1/3,scaleNote='Una celda = 3 m. Envergadura de 0,25 m = 0,083333 celdas.',palette='../palette.json',materials=[dict(name='feathers',role='strangerSlate'),dict(name='breast',role='neighborLinen'),dict(name='tips',role='clericalBlack')],meshes=meshes,metadata=dict(kind='bird',style='facetado sin texturas',triangleLimit=120,forward='+Z',up='+Y',wingAxis='Z local',wingUpDegrees=dict(bird_wing_l=-55,bird_wing_r=55),wingDownDegrees=dict(bird_wing_l=35,bird_wing_r=-35)),builder='build.py',note='Receta de malla explícita: usar build.py de esta carpeta; el esquema de primitivas tools/art no representa estas alas barridas y pivotes con exactitud.')
(HERE/'bird.json').write_text(json.dumps(recipe,indent=2)+'\n',encoding='utf8')
