"""Revisión señorial del 27 sep: genera sólo hall.json, nunca el resto del lote."""
import json
import math
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
P=[]
def box(name,x,y,z,w,h,d,mat='wood',rot=None):
    P.append(dict(type='cube',name=re.sub('[^A-Za-z0-9_]', '_', name),location=[x,-z,y],dimensions=[w,d,h],material=mat,parent='Root',rotationDegrees=rot or [0,0,0]))
def beam(name,a,b,width=.2,mat='wood'):
    v=[b[i]-a[i] for i in range(3)];length=math.sqrt(sum(t*t for t in v))
    az=math.degrees(math.atan2(v[0],v[2]));tilt=math.degrees(math.acos(v[1]/length))
    box(name,*[(a[i]+b[i])/2 for i in range(3)],width,length,width,mat,[tilt,0,az])
def gable(name,x,y,z,width,depth,height,mat='plaster'):
    P.append(dict(type='gable',name=name,location=[x,-z,y],width=width,depth=depth,height=height,rotationDegrees=[0,0,90],material=mat,parent='Root'))

box('Stone_Plinth',4.5,.2,3.5,8.4,.4,6,'stone')
box('Rear_Wall',4.5,1.6,.65,8.4,2.4,.3,'plaster')
for side,x in [('L',.45),('R',8.55)]:
    box('Side_Wall_'+side,x,1.6,3.5,.3,2.4,6,'plaster')
for side,x in [('L',1.85),('R',7.15)]:box('Front_Wall_'+side,x,1.6,6.35,3.1,2.4,.3,'plaster')
box('Door_Header_Infill',4.5,2.65,6.35,2.2,.3,.3,'plaster')
gable('Upper_Hall',4.5,2.8,3.5,6,8.4,2.62)
# Faldones gruesos por hiladas de paja, solapadas y con cantos legibles.
pitch=math.atan2(2.66,3.4)
for side,s in [('Front',1),('Back',-1)]:
    for row in range(5):
        t=(row+.5)/5; z=3.5+s*3.4*(1-t);y=2.67+2.66*t
        box('Thatch_'+side+'_'+str(row),4.5,y,z,9,.25,math.hypot(3.4,2.66)/5+.08,'roof',[s*math.degrees(pitch),0,0])
beam('Ridge_Cap',(.05,5.56,3.5),(8.95,5.56,3.5),.14)
# Entramado continuo y riostras; el contraste usa timberDark ya existente.
for z in [.47,6.54]:
    label='Front' if z>3 else 'Rear'
    for y in [.58,2.68]:box(label+'_Rail_'+str(int(y*100)),4.5,y,z,8.4,.24,.2)
    for i,x in enumerate([.43,1.63,2.83,6.17,7.37,8.57]):box(label+'_Post_'+str(i),x,1.6,z,.23,2.4,.22)
for side,x in [('L',.27),('R',8.73)]:
    box('Side_Sill_'+side,x,.58,3.5,.21,.24,6)
    box('Side_Plate_'+side,x,2.68,3.5,.22,.24,6)
    for i,z in enumerate([.6,2.4,4.3,6.4]):box('Side_Post_'+side+str(i),x,1.6,z,.23,2.4,.23)
    for i,z in enumerate([1.35,3.35,5.3]):
        box('Shutter_'+side+str(i),x,1.77,z,.245,.65,.66,'window')
        box('Shutter_Batten_'+side+str(i),x+(-.035 if x<4 else .035),1.77,z,.25,.09,.73,'door')
    for i,(z0,z1) in enumerate([(.8,2.2),(4.5,6.15)]):beam('Side_Brace_'+side+str(i),(x,.78,z0),(x,2.5,z1),.18)
    # Hastial con cercha vista, cumbrera transversal a la entrada.
    beam('Gable_Edge_A_'+side,(x,2.8,.5),(x,5.39,3.5),.18)
    beam('Gable_Edge_B_'+side,(x,5.39,3.5),(x,2.8,6.5),.18)
    beam('Gable_Kingpost_'+side,(x,2.8,3.5),(x,5.35,3.5),.18)
    for s in [-1,1]:beam('Saxon_Cross_'+side+str(s),(x,5.15,3.5-s*.24),(x,5.72,3.5+s*.24),.15)
for side,x,sign in [('L',.62,1),('R',8.38,-1)]:beam('Front_Raking_'+side,(x,.8,6.57),(x+1.85*sign,2.5,6.57),.2)
# Porche de carpintería pesada, dos postes, techo grueso unido al alero.
for side,x in [('L',1.5),('R',7.5)]:
    box('Porch_Foot_'+side,x,.2,8.03,.5,.4,.5,'stone')
    box('Porch_Post_'+side,x,1.6,8.03,.34,2.4,.34)
    box('Porch_Capital_'+side,x,2.69,8.03,.53,.2,.49)
    beam('Porch_Knee_'+side,(x,2.05,8.03),(x+(.72 if x<4 else -.72),2.65,8.03),.21)
    beam('Porch_Return_'+side,(x,2.04,8.03),(x,2.72,7.2),.2)
box('Porch_Ceremonial_Lintel',4.5,2.78,8.03,6.45,.34,.38)
box('Porch_Lintel_Inlay',4.5,2.8,8.238,5.5,.075,.035,'door')
for i in range(3):
    z=6.5+(i+.5)*1.8/3;y=3.23-(z-6.5)*.25
    box('Porch_Thatch_Layer_'+str(i),4.5,y,z,6.6,.27,.69,'roof',[math.degrees(math.atan(.25)),0,0])
for side,x in [('L',1.2),('R',7.8)]:beam('Porch_Fascia_'+side,(x,3.1,6.4),(x,2.6,8.4),.17)
box('Porch_Dark_Ceiling',4.5,2.87,7.15,6,.11,1.4)
# Puerta con dos hojas, tablas y travesaños en una malla móvil única.
for i in range(8):box('Door_Plank_'+str(i),3.54+i*.275,1.6,6.48,.26,2.4,.16,'door')
for i,x in enumerate([3.95,5.05]):
    for j,y in enumerate([.82,2.15]):box('Door_Rail_'+str(i)+str(j),x,y,6.59,1.02,.13,.07,'door')
for i,x in enumerate([3.28,5.72]):box('Entry_Jamb_'+str(i),x,1.7,6.7,.28,2.6,.33)
box('Entry_Lintel',4.5,2.85,6.69,2.76,.28,.38)
for i,(z,y,w,d) in enumerate([(8.55,.09,3.3,.65),(8.13,.19,3.05,.72),(7.66,.3,2.8,.85)]):box('Entry_Step_'+str(i),4.5,y,z,w,y*2,d,'stone')

path=ROOT/'art/recipes/hall-candidate/hall.json';r=json.loads(path.read_text())
for primitive in P:primitive['location'][1]-=.02
r['primitives']=P;r['materials']=[dict(name=k,role=v,roughness=.96) for k,v in dict(stone='stone',plaster='plaster',wood='timberDark',roof='roof',door='timber',window='timberDark').items()]
r['note']='Astra 27 sep 2026 · revisión pedida por Vera: sala señorial con carpintería pesada y paja estratificada; se retira el mástil.'
r['candidateBuild']['triangleLimit']=1500;r['candidateBuild']['doorPivot']=[3.41,-6.50,.4]
r['candidateBuild']['notes']='Revisión medieval solicitada por Vera: paja de espesor visible e hiladas solapadas, cerchas y entramado de madera oscura, porche carpintero con capiteles/riostras/dintel, acceso escalonado y puerta de dos hojas. Mástil retirado según pieza opcional de §8.3. Paredes 2,8 m, cumbrera 5,63 m (remates sajones 5,78 m); parcela 9×9 m. Se usa timberDark de la paleta para contrastar la carpintería. Las dos hojas forman hall_door con pivote en la bisagra izquierda, como contrato actual. Presupuesto ampliado al máximo 1500 autorizado en el encargo reciente para la carpintería y las hiladas. Sin preguntas pendientes.'
path.write_text(json.dumps(r,indent=2)+'\n',encoding='utf8')
print('hall primitives',len(P),'triangles estimated',sum(8 if p['type']=='gable' else 12 for p in P))
