"""Revisión geométrica CPU: misma receta, z-buffer, sin Blender ni GLB."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'artifacts/graphics/house-variant-review-01'
PALETTE=json.loads((ROOT/'art/recipes/palette.json').read_text())
def mesh(p):
    if p['type']=='cube':
        a,b,c=[d/2 for d in p['dimensions']]
        v=[(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),(-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]
        f=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    elif p['type']=='gable':
        a,b,c=p['width']/2,p['depth']/2,p['height']
        v=[(-a,-b,0),(a,-b,0),(0,-b,c),(-a,b,0),(a,b,0),(0,b,c)]
        f=[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)]
    elif p['type']=='cone':
        n=p['vertices'];r=p['radius'];h=p['depth']/2
        v=[(r*math.cos(i*2*math.pi/n),r*math.sin(i*2*math.pi/n),-h) for i in range(n)]+[(0,0,h)]
        f=[tuple(reversed(range(n)))]+[(i,(i+1)%n,n) for i in range(n)]
    else: raise ValueError(p['type'])
    angle=math.radians(p.get('rotationDegrees',[0,0,0])[2]); co,si=math.cos(angle),math.sin(angle)
    v=[(x*co-y*si+p['location'][0],x*si+y*co+p['location'][1],z+p['location'][2]) for x,y,z in v]
    return v, f

def render(recipe, side=1):
    size=360; im=Image.new('RGB',(size,size),'#e9e5da'); pix=im.load(); depth=[-1e8]*(size*size)
    colors={**PALETTE['valley'],**PALETTE['houses'][recipe['house']]}
    mats={m['name']:tuple(bytes.fromhex(colors[m['role']].lstrip('#'))) for m in recipe['materials']}
    def project(v):
        x,y,z=v; x-=3;y-=3
        return (180+(x*side*.82+y*.57)*35,236+(x*side*.30-y*.44-z*.85)*35,x*side*.48-y*.69+z*.54)
    for p in recipe['primitives']:
        vertices,faces=mesh(p)
        for face in faces:
            a,b,c=[vertices[i] for i in face[:3]]
            u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)]
            normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
            length=math.sqrt(sum(n*n for n in normal))
            light=.66+.34*max(0,sum(n*l for n,l in zip(normal,[-.3,-.5,.81]))/length)
            color=tuple(int(c*light) for c in mats[p['material']])
            for k in range(1,len(face)-1):
                a,b,c=[project(vertices[i]) for i in [face[0],face[k],face[k+1]]]
                den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
                if abs(den)<1e-9: continue
                for yy in range(max(0,int(min(a[1],b[1],c[1]))),min(size,int(max(a[1],b[1],c[1]))+1)):
                    for xx in range(max(0,int(min(a[0],b[0],c[0]))),min(size,int(max(a[0],b[0],c[0]))+1)):
                        w=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
                        t=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den
                        if min(w,t,1-w-t)<0: continue
                        z=w*a[2]+t*b[2]+(1-w-t)*c[2]; i=yy*size+xx
                        if z>depth[i]: depth[i]=z;pix[xx,yy]=color
    return im

paths=['house/house.json','house-variant-candidate/house-twin-gable.json','house-variant-candidate/house-hip-roof.json','stone-house/stone-house.json','house-variant-candidate/stone-house-cross-gable.json','house-variant-candidate/stone-house-tower-loft.json']
sheet=Image.new('RGB',(2160,770),'#e9e5da');draw=ImageDraw.Draw(sheet); reports=[]
for i,path in enumerate(paths):
    r=json.loads((ROOT/'art/recipes'/path).read_text());allv=[];tri=0
    for p in r['primitives']:
        vs,fs=mesh(p);allv+=vs;tri+=sum(len(f)-2 for f in fs)
    lo=[min(v[k] for v in allv)*r['scale'] for k in range(3)]
    hi=[max(v[k] for v in allv)*r['scale'] for k in range(3)]
    assert lo[0]>=-1e-8 and lo[1]>=-1e-8 and hi[0]<=2+1e-8 and hi[1]<=2+1e-8
    for row,side in enumerate([1,-1]):sheet.paste(render(r,side),(i*360,row*380))
    draw.text((i*360+12,344),r['id'],fill='#222222')
    draw.text((i*360+12,724),f'{tri} tris | {len(r["materials"])} materials',fill='#222222')
    source='house/house.json' if r['house']=='thatched' else 'stone-house/stone-house.json'
    original=json.loads((ROOT/'art/recipes'/source).read_text())
    windows=lambda recipe: [p for p in recipe['primitives'] if '_Window_' in p['name']]
    doors=lambda recipe: [p for p in recipe['primitives'] if p['material']=='door']
    assert len(windows(r))==3 and windows(r)==windows(original)
    assert doors(r)==doors(original) and r['materials']==original['materials']
    reports.append({'id':r['id'],'recipeTriangles':tri,'boundsRecipeScaled':{'min':lo,'max':hi},'materials':len(r['materials']),'originalWindowsUnchanged':True,'originalDoorUnchanged':True,'originalMaterialsUnchanged':True})
sheet.save(OUT/'comparison-cpu.png')
sheet.convert('L').save(OUT/'comparison-cpu-gray.png')
(OUT/'recipe-measurements.json').write_text(json.dumps({'scope':'CPU recipe geometry; no GLB import or game validation','models':reports},indent=2))
print(json.dumps(reports,indent=2))
