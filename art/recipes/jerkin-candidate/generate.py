"""Armaduras sobre las medidas publicadas de villager; metros Blender, Z arriba."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
P=[]; M=[]
def box(name,loc,size,role='stone',anchor='spine',rot=(0,0,0)):
    P.append(dict(type='cube',name=name,location=loc,dimensions=size,role=role,anchor=anchor,rotationDegrees=rot))
def section(rx,front,back):
    return [(-rx*.72,-front),(rx*.72,-front),(rx,-front*.64),(rx,back*.64),(rx*.72,back),(-rx*.72,back),(-rx,back*.64),(-rx,-front*.64)]
def shell(name,rings,role='stone',anchor='spine',cx=0,cy=0,cap=False):
    verts=[]
    for z,rx,front,back in rings: verts.extend([[x+cx,y+cy,z] for x,y in section(rx,front,back)])
    faces=[]
    for j in range(len(rings)-1):
        for i in range(8): faces.append([j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i])
    if cap: faces.append(list(range((len(rings)-1)*8,len(rings)*8)))
    M.append(dict(name=name,vertices=verts,faces=faces,role=role,anchor=anchor))
def panel(name,outline,thickness,role='stone',anchor='spine'):
    n=len(outline);v=[[x,y-thickness/2,z] for x,y,z in outline]+[[x,y+thickness/2,z] for x,y,z in outline]
    f=[list(range(n-1,-1,-1)),list(range(n,2*n))]+[[i,(i+1)%n,(i+1)%n+n,i+n] for i in range(n)]
    M.append(dict(name=name,vertices=v,faces=f,role=role,anchor=anchor))
def shoulder(s,role='timberDark',anchor='spine',wide=.42):
    # Hombrera facetada que cambia la silueta desde arriba.
    shell('shoulder_'+str(s),[(1.32,.135,.215,.205),(1.445,.12,.195,.19),(1.475,.07,.15,.15)],role,anchor,cx=s*.32,cap=True)
def belt(z,role='neighborLinen',width=.31):
    shell('belt',[(z-.033,width,.252,.213),(z+.033,width,.252,.213)],role)
    box('buckle',(0,-.275,z),(.095,.028,.09),'grain')
def chest(role,bulge=.265):
    shell('body',[(.90,.30,.235,.20),(1.18,.302,bulge,.207),(1.43,.29,.225,.20)],role)
    # Escote real: anillo superior hasta la abertura del cuello.
    shell('collar',[(1.43,.29,.225,.20),(1.45,.12,.11,.11)],role)
def save(id,budget,metalness=0,roughness=.92):
    d=dict(schemaVersion=1,id=id,sourceUnits='Blender metres, Z up, front -Y',palette='../palette.json',house='thatched',scaleNote='El constructor convierte cada vértice al marco LOCAL real del hueso glTF. El GLB conserva unidades del esqueleto (metros); al colgarlo el rig aporta escala 1/3. No aplicar otro 1/3.',primitives=P.copy(),polygonMeshes=M.copy(),triangleBudget=budget,material=dict(metalness=metalness,roughness=roughness),referenceRig='public/assets/valley3d/villager.glb')
    folder=ROOT/'art/recipes'/f'{id}-candidate';folder.mkdir(parents=True,exist_ok=True)
    (folder/f'{id}.json').write_text(json.dumps(d,indent=2)+'\n',encoding='utf8');P.clear();M.clear()

chest('soil',.255)
for s in [-1,1]: shoulder(s)
belt(.94)
box('front_sash',(0,-.275,1.18),(.085,.028,.62),'neighborLinen',rot=(0,35,0))
box('back_sash',(0,.223,1.18),(.085,.028,.62),'neighborLinen',rot=(0,-35,0))
save('jerkin',200)

chest('elderGrey',.26)
shell('mail_skirt',[(.67,.34,.26,.225),(.91,.30,.235,.20)],'elderGrey')
for s in [-1,1]: shoulder(s,'elderGrey')
belt(.96,'timberDark')
shell('mail_hem',[(.67,.343,.264,.229),(.72,.343,.264,.229)],'strangerSlate')
save('mail',250,.14,.88)

shell('helmet_band',[(1.835,.29,.28,.28),(1.95,.29,.28,.28)],'elderGrey','head')
shell('conical_crown',[(1.95,.29,.28,.28),(2.15,.018,.018,.018)],'stone','head',cap=True)
box('nasal',(0,-.289,1.77),(.065,.035,.25),'stone','head')
save('helm-nasal',120,.35,.65)

chest('stone',.29)
panel('breast_ridge',[(-.065,-.298,.98),(.065,-.298,.98),(.09,-.31,1.36),(0,-.34,1.42),(-.09,-.31,1.36)],.035,'saltWhite')
for s in [-1,1]: shoulder(s,'stone')
shell('fauld',[(.81,.333,.26,.23),(.92,.313,.255,.22)],'elderGrey')
shell('waist_rim',[(.92,.313,.263,.221),(.955,.313,.263,.221)],'saltWhite')
save('plate',250,.42,.55)

for s,side in [(-1,'L'),(1,'R')]:
    anchor='shin.'+side
    shell('leg_'+side.lower(),[(.12,.142,.175,.145),(.45,.145,.16,.15),(.56,.158,.16,.15)],'stone',anchor,cx=s*.15,cap=True)
    box('knee_rim_'+side,(s*.15,-.15,.51),(.22,.03,.045),'saltWhite',anchor)
save('greaves',150,.42,.55)

chest('stone',.30)
shell('gorget',[(1.445,.16,.15,.14),(1.515,.145,.135,.125)],'saltWhite')
panel('chest_keel',[(-.065,-.306,.99),(.065,-.306,.99),(.10,-.327,1.36),(0,-.345,1.43),(-.10,-.327,1.36)],.035,'saltWhite')
shell('armored_skirt',[(.77,.35,.28,.25),(.9,.32,.27,.235)],'elderGrey')
belt(.95,'grain')
for s,side in [(-1,'L'),(1,'R')]:
    shoulder(s,'saltWhite','upperarm.'+side)
    shell('rerebrace_'+side,[(1.10,.145,.17,.16),(1.37,.145,.17,.16)],'elderGrey','upperarm.'+side,cx=s*.335)
    # Manguitos y guardabrazos siguen sus huesos, sin arrastrar toda la armadura.
    shell('vambrace_'+side,[(.78,.125,.133,.115),(1.04,.135,.14,.125)],'stone','forearm.'+side,cx=s*.40,cap=True)
    shell('cuisse_'+side,[(.55,.145,.143,.13),(.81,.145,.143,.13)],'elderGrey','thigh.'+side,cx=s*.15)
    shell('greave_'+side,[(.12,.142,.175,.145),(.46,.145,.16,.15),(.56,.158,.16,.15)],'stone','shin.'+side,cx=s*.15,cap=True)
    box('knee_rim_'+side,(s*.15,-.15,.51),(.22,.03,.045),'saltWhite','shin.'+side)
    shell('sabatons_'+side,[(.015,.15,.32,.105),(.15,.14,.29,.10)],'stone','foot.'+side,cx=s*.15,cap=True)
save('harness',600,.48,.48)

shell('helm_shell',[(1.53,.27,.28,.27),(1.88,.295,.29,.285),(2.055,.278,.272,.267)],'stone','head',cap=True)
box('visor_slit',(0,-.293,1.815),(.41,.019,.038),'clericalBlack','head')
box('visor_bridge',(0,-.305,1.785),(.045,.025,.14),'saltWhite','head')
shell('brow_rim',[(1.845,.299,.297,.292),(1.88,.299,.297,.292)],'saltWhite','head')
for x in [-.1,.1]: box('breathing_slot_'+str(x),(x,-.29,1.65),(.035,.018,.07),'strangerSlate','head')
save('helm-closed',150,.5,.48)
