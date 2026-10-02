import bpy, math, os, json, sys
from mathutils import Vector
from math import sin, cos, pi
OUT=os.path.dirname(os.path.abspath(__file__))
TMP=os.path.dirname(__file__)
os.makedirs(OUT,exist_ok=True)
M={}
ROOT=None

def mat(n,h,rough=.85,metal=0):
    m=bpy.data.materials.new(n); m.diffuse_color=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=m.diffuse_color; bs.inputs['Roughness'].default_value=rough; bs.inputs['Metallic'].default_value=metal
    M[n]=m; return m

def par(o,p):
    bpy.context.view_layer.update(); w=o.matrix_world.copy(); o.parent=p or ROOT; o.matrix_world=w; return o

def empty(n,pos=(0,0,0),parent=None):
    o=bpy.data.objects.new(n,None); bpy.context.collection.objects.link(o); o.location=pos
    if parent: par(o,parent)
    return o

def reset():
    global ROOT,M
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    M={}; ROOT=empty('Root')
    mat('eye','191A17',.35); mat('nose','252722',.65); mat('ivory','DBCCA5'); mat('iron','505654',.58,.45); mat('ironEdge','7B8078',.5,.5); mat('wood','967146'); mat('woodLight','AE8858'); mat('woodDark','705136'); mat('rope','B89F6E'); mat('leather','624833')

def mesh(n,verts,faces,material,parent=None):
    me=bpy.data.meshes.new(n+'_Mesh'); me.from_pydata(verts,[],faces); me.update()
    o=bpy.data.objects.new(n,me); bpy.context.collection.objects.link(o); me.materials.append(M[material]); par(o,parent); return o

def ell(n,p,d,m,parent=None,seg=12,rings=7):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,radius=1,location=p)
    o=bpy.context.object; o.name=n; o.dimensions=d; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(M[m]); return par(o,parent)

def box(n,p,d,m,parent=None,bev=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p); o=bpy.context.object; o.name=n; o.dimensions=d; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(M[m])
    if bev:
        mo=o.modifiers.new('Forged_Edges','BEVEL'); mo.width=bev; mo.segments=1; bpy.ops.object.modifier_apply(modifier=mo.name)
    return par(o,parent)

def tube(n,pts,radii,m,parent=None,sides=8):
    pts=[Vector(p) for p in pts]; vs=[]; fs=[]
    for i,p in enumerate(pts):
        t=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized(); ref=Vector((0,1,0)) if abs(t.y)<.92 else Vector((1,0,0)); u=t.cross(ref).normalized(); v=t.cross(u).normalized(); r=radii[i]; a,b=(r,r) if isinstance(r,(int,float)) else r
        for j in range(sides): vs.append(tuple(p+u*(cos(j*2*pi/sides)*a)+v*(sin(j*2*pi/sides)*b)))
    fs.append(tuple(range(sides-1,-1,-1)))
    for i in range(len(pts)-1):
        for j in range(sides): fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    fs.append(tuple((len(pts)-1)*sides+j for j in range(sides)))
    return mesh(n,vs,fs,m,parent)

def loft(n,sections,m,parent=None,sides=12):
    # Secciones transversales: X, Z, semiancho, semialto.
    vs=[]; fs=[]
    for x,z,ry,rz in sections:
        for j in range(sides):
            t=j*2*pi/sides; vs.append((x,cos(t)*ry,z+sin(t)*rz))
    fs.append(tuple(range(sides-1,-1,-1)))
    for i in range(len(sections)-1):
        for j in range(sides): fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    fs.append(tuple((len(sections)-1)*sides+j for j in range(sides)))
    return mesh(n,vs,fs,m,parent)

def leaf(n,base,tip,width,thick,m,parent=None):
    b=Vector(base); t=Vector(tip); mid=b.lerp(t,.40); d=(t-b).normalized(); u=Vector((0,1,0)); v=d.cross(u).normalized()
    vs=[tuple(b-u*width*.36),tuple(mid-u*width*.5),tuple(t),tuple(mid+u*width*.5),tuple(b+u*width*.36),tuple(mid+v*thick),tuple(mid-v*thick)]
    return mesh(n,vs,[(i,(i+1)%5,5) for i in range(5)]+[((i+1)%5,i,6) for i in range(5)],m,parent)

def ring(n,center,outer,inner,height,m,parent=None,N=20,axis='Z'):
    vs=[]; fs=[]
    for z,r in [(-height/2,outer),(height/2,outer),(-height/2,inner),(height/2,inner)]:
        for i in range(N):
            a=i*2*pi/N; p=Vector((cos(a)*r,sin(a)*r,z))
            if axis=='Y': p=Vector((p.x,p.z,p.y))
            vs.append(tuple(p+Vector(center)))
    for i in range(N):
        j=(i+1)%N; fs.extend([(i,j,N+j,N+i),(2*N+i,3*N+i,3*N+j,2*N+j),(N+i,N+j,3*N+j,3*N+i),(i,2*N+i,2*N+j,j)])
    return mesh(n,vs,fs,m,parent)

def eye(n,x,y,z,s,parent):
    ell(n,(x,y,z),(s,s*.38,s*.9),'eye',parent,8,5)
    ell(n+'_Glint',(x-s*.17,y*1.006,z+s*.13),(s*.19,s*.4,s*.19),'ivory',parent,6,4)

def ear(n,base,tip,w,m,parent,inner='earInner'):
    p=empty(n,base,parent); leaf(n+'_Outer',base,tip,w,w*.22,m,p)
    b=Vector(base); t=Vector(tip); b.x-=w*.15; t.x-=w*.09
    leaf(n+'_Inset',tuple(b.lerp(t,.18)),tuple(b.lerp(t,.82)),w*.56,w*.09,inner,p)
    return p

def limb(n,hip,knee,ankle,toe,width,m,parent,foot='nose',paw=False):
    p=empty(n,hip,parent); tube(n+'_Upper',[hip,knee],[width,width*.63],m,p)
    q=empty(n+'Lower',knee,p); tube(n+'_Shin',[knee,ankle],[width*.57,width*.36],m,q)
    f=empty(n+'Foot',ankle,q)
    if paw: ell(n+'_Paw',toe,(width*1.7,width*1.55,toe[2]*2),foot,f,10,5)
    else: box(n+'_Hoof',toe,(width*1.35,width*1.17,toe[2]*2),foot,f,width*.13)
    return p,q,f

def save(id):
    bpy.context.scene.frame_set(1); bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,id+'.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_yup=True,export_extras=True)
    print('PRODUCED',id,flush=True)

def clip(name,tracks,frames):
    # Cada nodo conserva su acción en la misma pista NLA para un único clip GLB.
    sc=bpy.context.scene; sc.render.fps=24
    for o,prop,values in tracks:
        o.animation_data_create()
        if o.animation_data.action is None: o.animation_data.action=bpy.data.actions.new(name+'_'+o.name)
        for f,v in zip(frames,values): setattr(o,prop,v); o.keyframe_insert(data_path=prop,frame=f)
    seen=set()
    for o,_,_ in tracks:
        if o.name in seen: continue
        seen.add(o.name); a=o.animation_data.action; tr=o.animation_data.nla_tracks.new(); tr.name=name; st=tr.strips.new(name,frames[0],a); o.animation_data.action=None
    sc.frame_start=frames[0]; sc.frame_end=frames[-1]; sc.frame_set(frames[0])

def canine(id):
    reset(); dog=id=='dog'
    if dog:
        mat('coat','333A36'); mat('coatTop','292E2C'); mat('light','DBD7BB'); mat('earInner','6B6255'); mat('warm','8E8570')
        # Border collie: cuerpo deportivo, pecho amplio y blanco, abdomen recogido.
        body=empty('body',(0,0,.155),ROOT)
        loft('Torso',[(-.16,.214,.047,.061),(-.10,.219,.071,.080),(.015,.209,.065,.068),(.11,.209,.055,.060),(.165,.216,.029,.044)],'coat',body)
        ell('White_Ruff',(-.148,0,.224),(.113,.142,.170),'light',body)
        neck=empty('neck',(-.16,0,.24),body); ell('Neck',(-.18,0,.269),(.103,.091,.12),'coat',neck)
        head=empty('head',(-.203,0,.300),neck); ell('Skull',(-.225,0,.306),(.107,.095,.084),'coat',head)
        loft('Muzzle',[(-.233,.291,.037,.026),(-.270,.285,.029,.022),(-.302,.283,.020,.019)],'light',head)
        ell('Nose',(-.307,0,.287),(.026,.044,.026),'nose',head,10,5)
        # Franja blanca que recorre frente y puente del hocico.
        mesh('White_Blaze',[(-.19,-.011,.342),(-.19,.011,.342),(-.244,.014,.337),(-.264,.008,.305),(-.264,-.008,.305),(-.244,-.014,.337)],[(0,1,2,3,4,5)],'light',head)
        for s in (-1,1):
            eye('Eye_'+str(s),-.250,s*.042,.318,.014,head)
            e=ear('ear'+str(s),(-.201,s*.033,.337),(-.186,s*.047,.387),.042,'coat',head)
            leaf('Ear_Fold_'+str(s),(-.186,s*.047,.384),(-.204,s*.048,.369),.028,.005,'coat',e)
            for i in range(3): leaf('Ruff_Tuft_'+str(s)+'_'+str(i),(-.139+i*.021,s*.043,.222),(-.143+i*.024,s*.052,.151+i*.008),.026,.012,'light',body)
        for pre,x in [('fore',-.12),('hind',.118)]:
            for s,l in [(-1,'L'),(1,'R')]:
                y=s*.046; hip=(x,y,.223 if pre=='fore' else .22); knee=(x+(.013 if pre=='fore' else -.035),y,.115); ankle=(x+(.005 if pre=='fore' else .028),y,.033); toe=(ankle[0]-.014,y,.016)
                p,q,f=limb(pre+l,hip,knee,ankle,toe,.030,'coat',body,'light',True)
                tube(pre+l+'_Sock',[(ankle[0],y,.024),(ankle[0],y,.068)],[.014,.014],'light',q)
        tail=empty('tail',(.155,0,.226),body)
        tube('Tail',[(.155,0,.226),(.190,0,.194),(.218,0,.146),(.241,0,.093),(.248,0,.053)],[.029,.030,.027,.021,.009],'coat',tail)
        tube('Tail_White_Tuft',[(.238,0,.099),(.257,0,.071),(.264,0,.048),(.267,0,.044)],[.022,.022,.012,.001],'light',tail)
    else:
        mat('coat','777D73'); mat('coatTop','535B57'); mat('light','C4C4AC'); mat('earInner','857C69'); mat('warm','A89C7F')
        body=empty('body',(0,0,.17),ROOT)
        loft('Torso',[(-.197,.254,.044,.080),(-.135,.259,.076,.092),(-.025,.251,.074,.076),(.085,.260,.059,.064),(.167,.270,.052,.066),(.195,.277,.025,.042)],'coat',body)
        loft('Dark_Saddle',[(-.17,.316,.052,.027),(-.07,.316,.061,.028),(.075,.317,.050,.016),(.165,.326,.030,.011)],'coatTop',body)
        ell('Deep_Chest',(-.169,0,.245),(.119,.127,.181),'light',body)
        neck=empty('neck',(-.181,0,.282),body); ell('Neck_Ruff',(-.20,0,.292),(.129,.130,.145),'coat',neck)
        for s in (-1,1):
            leaf('Cheek_Ruff_'+str(s),(-.233,s*.040,.321),(-.16,s*.082,.239),.047,.024,'light',neck)
            leaf('Chest_Fur_'+str(s),(-.207,s*.027,.268),(-.172,s*.028,.171),.030,.020,'light',neck)
        head=empty('head',(-.242,0,.318),neck); ell('Head',(-.265,0,.328),(.132,.110,.106),'coat',head)
        loft('Muzzle',[(-.282,.312,.043,.035),(-.322,.303,.037,.027),(-.369,.300,.025,.023)],'light',head)
        ell('Lower_Jaw',(-.328,0,.279),(.090,.052,.023),'light',head)
        tube('Mouth_Seam',[(-.302,-.030,.287),(-.342,-.029,.281),(-.370,-.018,.286)],[.003,.003,.002],'nose',head,6)
        tube('Mouth_Seam_R',[(-.302,.030,.287),(-.342,.029,.281),(-.370,.018,.286)],[.003,.003,.002],'nose',head,6)
        ell('Nose',(-.375,0,.305),(.028,.050,.031),'nose',head,10,5)
        ears=[]
        for s in (-1,1):
            ell('Eye_Mask_'+str(s),(-.292,s*.044,.341),(.045,.018,.025),'light',head,8,5)
            eye('Eye_'+str(s),-.294,s*.052,.342,.013,head)
            leaf('Brow_'+str(s),(-.312,s*.043,.348),(-.268,s*.047,.360),.021,.008,'coatTop',head)
            ears.append(ear('ear'+str(s),(-.24,s*.038,.368),(-.221,s*.048,.431),.047,'coat',head))
        for pre,x in [('fore',-.168),('hind',.139)]:
            for s,l in [(-1,'L'),(1,'R')]:
                y=s*.050; hip=(x,y,.255); knee=(x+(.025 if pre=='fore' else -.053),y,.144); ankle=(x+(-.025 if pre=='fore' else .037),y,.038); toe=(ankle[0]-.018,y,.017)
                limb(pre+l,hip,knee,ankle,toe,.034,'coat',body,'light',True)
        tail=empty('tail',(.181,0,.282),body); tube('Long_Brush',[(.181,0,.282),(.226,0,.26),(.264,0,.217),(.307,0,.167),(.352,0,.13),(.378,0,.125)],[.033,.036,.038,.034,.026,.001],'coat',tail)
        tube('Brush_Dark_Tip',[(.33,0,.147),(.361,0,.126),(.379,0,.125)],[.028,.019,.001],'coatTop',tail)
        tracks=[(ears[0],'rotation_euler',[(0,0,0),(0,-.28,0),(0,-.28,0),(0,0,0)]),(ears[1],'rotation_euler',[(0,0,0),(0,-.28,0),(0,-.28,0),(0,0,0)]),(head,'rotation_euler',[(0,0,0),(0,-.13,0),(0,-.13,0),(0,0,0)])]
        clip('attack',tracks,[1,10,24,34])
    save(id)

BOAR_DROP=.08   # patas más cortas (Vera eligió ésta); 0 es el jabalí de Vera
BOAR_TUSK=1.5   # colmillos más grandes (Vera: «destacarlos»); 1 es el suyo

def boar():
    reset(); mat('coat','625B4D'); mat('coatTop','49483E'); mat('light','8B7B62'); mat('earInner','8C7962')
    body=empty('body',(.015,0,.18),ROOT)
    loft('Barrel',[(-.16,.278,.064,.102),(-.10,.292,.112,.121),(.04,.281,.120,.112),(.166,.259,.096,.096),(.227,.254,.041,.065)],'coat',body)
    ell('Withers',(-.09,0,.350),(.22,.165,.14),'coatTop',body)
    neck=empty('neck',(-.17,0,.289),body); head=empty('head',(-.229,0,.263),neck)
    loft('Sloping_Wedge_Head',[(-.166,.285,.089,.097),(-.216,.258,.080,.085),(-.276,.220,.060,.064),(-.348,.181,.045,.038),(-.399,.162,.038,.027)],'coat',head)
    ell('Broad_Snout',(-.405,0,.163),(.034,.095,.065),'light',head,10,6)
    for s in (-1,1):
        ell('Nostril_'+str(s),(-.421,s*.020,.168),(.009,.017,.014),'nose',head,8,4)
        eye('Eye_'+str(s),-.246,s*.071,.274,.015,head)
        ear('ear'+str(s),(-.184,s*.061,.339),(-.197,s*.111,.410),.060,'coat',head)
        # Colmillos: BOAR_TUSK los agranda desde su raíz (Vera: «destacarlos»).
        root=Vector((-.335,s*.042,.152))
        tusk=[tuple(root+(Vector(p)-root)*BOAR_TUSK) for p in [(-.335,s*.042,.152),(-.357,s*.062,.166),(-.368,s*.064,.187),(-.368,s*.060,.214),(-.359,s*.052,.232)]]
        tube('Curved_Tusk_'+str(s),tusk,[r*(1+(BOAR_TUSK-1)*.6) for r in [.013,.013,.011,.007,.0008]],'ivory',head,8)
        for i in range(5): leaf('Coat_Ridge_'+str(s)+'_'+str(i),(-.13+i*.052,s*.029,.383-i*.009),(-.107+i*.052,s*.034,.416-i*.012),.019,.009,'coatTop',body)
    tail=empty('tail',(.218,0,.287),body); tube('Tail',[(.218,0,.287),(.256,0,.261),(.27,0,.197),(.276,0,.170)],[.009,.008,.006,.004],'coatTop',tail,7)
    leaf('Tail_Tuft',(.271,0,.20),(.283,0,.152),.018,.012,'coatTop',tail)
    # Como la mula: baja el cuerpo con todo lo de encima y después se hacen las
    # patas en su sitio, la pezuña en el suelo. Con BOAR_DROP=0, el de Vera.
    body.location.z-=BOAR_DROP
    k=(.272-BOAR_DROP-.038)/(.272-.038)
    for pre,x in [('fore',-.124),('hind',.169)]:
        for s,l in [(-1,'L'),(1,'R')]:
            y=s*.072; hip=(x,y,.272-BOAR_DROP); knee=(x+(.004 if pre=='fore' else -.035),y,.038+(.131-.038)*k); ankle=(x+(-.013 if pre=='fore' else .019),y,.038); toe=(ankle[0]-.013,y,.019)
            p,q,f=limb(pre+l,hip,knee,ankle,toe,.036,'coat',body)
            box(pre+l+'_Cloven_Seam',(toe[0]-.023,y,.017),(.010,.004,.025),'coatTop',f)
    save('boar')

def bear_v3():
    reset(); mat('coat','775A3E'); mat('coatTop','5C4834'); mat('light','A28559'); mat('earInner','483B2E'); mat('claw','B2A07E')
    body=empty('body',(.235,0,.385),ROOT)
    # Perfil dorsal y ventral independientes: cruz amplia, costillas profundas,
    # vientre recogido hacia el flanco y grupa redondeada. Una sola superficie.
    sections=[
        (-.465,.604,.340,.105,.470),
        (-.405,.646,.265,.160,.456),
        (-.340,.710,.211,.205,.439),
        (-.260,.750,.192,.242,.443),
        (-.165,.728,.197,.237,.448),
        (-.060,.684,.215,.218,.436),
        (.055,.650,.249,.192,.435),
        (.145,.642,.291,.166,.449),
        (.235,.663,.271,.188,.450),
        (.310,.646,.283,.188,.460),
        (.383,.588,.327,.129,.458),
        (.416,.506,.396,.035,.450),
    ]
    vertices=[]; faces=[]; sides=16
    for x,top,bottom,width,waist in sections:
        for j in range(sides):
            angle=2*pi*j/sides; vertical=sin(angle)
            z=waist+vertical*((top-waist) if vertical>=0 else (waist-bottom))
            y=cos(angle)*width*(1-.11*abs(vertical))
            vertices.append((x,y,z))
    faces.append(tuple(range(sides-1,-1,-1)))
    for i in range(len(sections)-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            c=(i+1)*sides+(j+1)%sides; d=(i+1)*sides+j
            # Facetas cortas que siguen las masas, sin bandas longitudinales largas.
            faces.extend([(a,b,c),(a,c,d)] if (i+j)%2 else [(a,b,d),(b,c,d)])
    faces.append(tuple((len(sections)-1)*sides+j for j in range(sides)))
    mesh('Massive_Torso',vertices,faces,'coat',body)
    def flank_surface(x,z):
        for left,right in zip(sections,sections[1:]):
            if left[0]<=x<=right[0]:
                t=(x-left[0])/(right[0]-left[0])
                _,top,bottom,width,waist=[a+(b-a)*t for a,b in zip(left,right)]
                v=(z-waist)/((top-waist) if z>=waist else (waist-bottom))
                return width*math.sqrt(max(0,1-v*v))*(1-.11*abs(v))
        return .12
    neck=empty('neck',(-.34,0,.49),body); ell('Neck',(-.391,0,.469),(.302,.341,.323),'coat',neck)
    head=empty('head',(-.459,0,.499),neck); ell('Head',(-.481,0,.507),(.304,.285,.279),'coat',head)
    loft('Muzzle',[(-.504,.475,.105,.085),(-.593,.452,.082,.062),(-.666,.448,.064,.049)],'light',head)
    ell('Nose',(-.675,0,.468),(.052,.117,.068),'nose',head,10,6)
    ell('Lower_Jaw',(-.582,0,.408),(.171,.124,.057),'coatTop',head)
    for s in (-1,1):
        earP=empty('ear'+str(s),(-.443,s*.095,.611),head)
        ell('Round_Ear_'+str(s),(-.442,s*.108,.638),(.079,.073,.101),'coat',earP,10,6)
        ell('Ear_Inner_'+str(s),(-.463,s*.115,.642),(.040,.051,.059),'earInner',earP,8,5)
        ell('Eye_Brow_'+str(s),(-.555,s*.108,.553),(.086,.040,.047),'coatTop',head)
        eye('Eye_'+str(s),-.563,s*.123,.534,.022,head)
        tube('Mouth_'+str(s),[(-.542,s*.075,.421),(-.611,s*.065,.418),(-.65,s*.045,.430)],[.006,.005,.003],'nose',head,6)
        for j in range(5):
            x=-.31+j*.103; z=.52 if j<2 else .435
            leaf('Flank_Fur_'+str(s)+'_'+str(j),(x,s*(flank_surface(x,z)+.006),z),(x+.035,s*(flank_surface(x+.035,z-.091)+.011),z-.091),.063,.026,'coatTop' if j%3==0 else 'coat',body)
        for j in range(3): leaf('Cheek_Fur_'+str(s)+'_'+str(j),(-.408+j*.034,s*.136,.475),(-.386+j*.033,s*.172,.373),.049,.023,'coat',neck)
    fronts=[]; hinds=[]
    for pre,x in [('fore',-.283),('hind',.264)]:
        for s,l in [(-1,'L'),(1,'R')]:
            y=s*.15; hip=(x,y,.466); knee=(x+(.025 if pre=='fore' else -.035),y,.241); ankle=(x-.028,y,.080); toe=(x-.062,y,.041)
            p,q,f=limb(pre+l,hip,knee,ankle,toe,.086,'coat',body,'coatTop',True)
            if pre=='hind':
                # Muslo ligado al pivote existente; sostiene también la pose erguida.
                ell('Haunch_'+l,(x+.008,y*.90,.357),(.222,.192,.304),'coat',p,12,7)
            (fronts if pre=='fore' else hinds).append(p)
            for j in range(4):
                yy=y+(j-1.5)*.026
                tube(pre+l+'_Claw_'+str(j),[(x-.117,yy,.048),(x-.147,yy,.029),(x-.157,yy,.016)],[.011,.007,.0015],'claw',f,7)
    tail=empty('tail',(.385,0,.416),body); ell('Tail',(.407,0,.420),(.104,.084,.101),'coat',tail,10,6)
    # Cuerpo alrededor de la cadera; patas traseras contrarrotan para seguir apoyadas.
    tracks=[(body,'rotation_euler',[(0,0,0),(0,1.16,0),(0,1.16,0),(0,0,0)]),(body,'location',[(.235,0,.385),(.235,0,.454),(.235,0,.454),(.235,0,.385)]),(head,'rotation_euler',[(0,0,0),(0,-.64,0),(0,-.56,0),(0,0,0)])]
    for p in hinds: tracks.append((p,'rotation_euler',[(0,0,0),(0,-1.16,0),(0,-1.16,0),(0,0,0)]))
    for i,p in enumerate(fronts): tracks.append((p,'rotation_euler',[(0,0,0),((-.18 if i==0 else .18),-.40,0),((-.23 if i==0 else .23),-.65,0),(0,0,0)]))
    clip('rear',tracks,[1,25,48,72]); save('bear-v3')

BEAR_HUMP=.35
# Las patas de delante, que a Vera le parecían largas: `BEAR_FORE_DROP` baja el
# pecho y las acorta (en celdas; 0 las deja como estaban), y `BEAR_FORE_FUR`
# cuelga pelo del pecho y del antebrazo para que se lean más cortas sin
# cambiar la postura.
BEAR_FORE_DROP=0
BEAR_FORE_FUR=False

def bear():
    # v4 · 29 sep 2026. Lo que el v3 no tenía: la joroba de la cruz como punto
    # más alto, la cabeza baja por delante de ella, patas en columna que no se
    # afinan y zarpas que salen de la pata, y un marrón que con la luz del juego
    # siga siendo marrón (el 775A3E del v3 se leía arena). Mismo tamaño que el
    # v3 —la escena de caza y el radio del cuerpo cuentan con él—, los mismos
    # nodos y la misma pose erguida (`rear`, que el juego llama `attack`).
    reset(); mat('coat','35261B'); mat('coatTop','2A1E15'); mat('legs','261B14'); mat('light','6E5540')
    mat('earInner','1E1712'); mat('claw','CFC2A6')
    body=empty('body',(.24,0,.42),ROOT)
    # (x, lomo, vientre, semiancho, cintura): la cruz sube sobre las patas de
    # delante, el lomo baja hasta la grupa y el pecho cuelga hondo.
    sections=[
        (-.360,.540,.370,.090,.460),
        (-.310,.660,.300,.160,.470),
        (-.240,.765,.260,.215,.500),
        (-.160,.805,.240,.245,.510),
        (-.070,.780,.235,.255,.500),
        (.030,.725,.238,.255,.480),
        (.120,.685,.246,.250,.465),
        (.210,.664,.262,.240,.460),
        (.290,.648,.282,.224,.460),
        (.350,.610,.312,.190,.460),
        (.400,.550,.352,.130,.450),
        (.425,.490,.400,.050,.445),
    ]
    # La joroba, rebajada: el lomo es casi una recta que sube un poco hacia la
    # cruz, y `BEAR_HUMP` dice cuánto de la cruz del primer v4 queda por encima
    # (1 era la joroba entera, que a Vera le pareció horrible).
    line=lambda x: .668+(.21-x)*.05
    sections=[(x,(line(x)+BEAR_HUMP*(top-line(x)) if top>line(x) and x<.21 else top),bottom,width,waist)
              for x,top,bottom,width,waist in sections]
    # El pecho baja con las patas de delante y la grupa se queda donde estaba.
    drop=lambda x: BEAR_FORE_DROP*min(1,max(0,(.21-x)/.45))
    sections=[(x,top-drop(x),bottom-drop(x),width,waist-drop(x)) for x,top,bottom,width,waist in sections]
    vertices=[]; faces=[]; sides=16
    for x,top,bottom,width,waist in sections:
        for j in range(sides):
            angle=2*pi*j/sides; vertical=sin(angle)
            z=waist+vertical*((top-waist) if vertical>=0 else (waist-bottom))
            y=cos(angle)*width*(1-.11*abs(vertical))
            vertices.append((x,y,z))
    faces.append(tuple(range(sides-1,-1,-1)))
    for i in range(len(sections)-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            c=(i+1)*sides+(j+1)%sides; d=(i+1)*sides+j
            faces.extend([(a,b,c),(a,c,d)] if (i+j)%2 else [(a,b,d),(b,c,d)])
    faces.append(tuple((len(sections)-1)*sides+j for j in range(sides)))
    mesh('Massive_Torso',vertices,faces,'coat',body)
    # Cuello grueso que baja hacia delante: la cabeza va por debajo del lomo.
    neck=empty('neck',(-.33,0,.51),body); ell('Neck',(-.400,0,.470),(.22,.27,.25),'coat',neck)
    head=empty('head',(-.46,0,.46),neck); ell('Head',(-.500,0,.455),(.22,.24,.21),'coat',head)
    ell('Brow',(-.540,0,.505),(.11,.17,.07),'coat',head,10,5)
    loft('Muzzle',[(-.570,.440,.076,.066),(-.630,.425,.062,.054),(-.680,.415,.046,.043)],'light',head)
    ell('Nose',(-.690,0,.418),(.032,.072,.046),'nose',head,10,6)
    ell('Lower_Jaw',(-.600,0,.385),(.13,.105,.05),'coatTop',head)
    for s in (-1,1):
        earP=empty('ear'+str(s),(-.470,s*.090,.555),head)
        ell('Round_Ear_'+str(s),(-.468,s*.098,.572),(.052,.040,.062),'coat',earP,10,6)
        ell('Ear_Inner_'+str(s),(-.478,s*.100,.572),(.024,.030,.036),'earInner',earP,8,5)
        eye('Eye_'+str(s),-.585,s*.078,.482,.016,head)
        tube('Mouth_'+str(s),[(-.575,s*.060,.398),(-.630,s*.050,.394),(-.665,s*.034,.402)],[.005,.004,.003],'nose',head,6)
    neck.location.z-=BEAR_FORE_DROP
    if BEAR_FORE_FUR:
        ell('Chest_Fur',(-.225,0,.285-drop(-.225)),(.180,.250,.140),'coat',body,12,6)
    fronts=[]; hinds=[]
    for pre,x in [('fore',-.195),('hind',.265)]:
        for s,l in [(-1,'L'),(1,'R')]:
            y=s*.140
            if pre=='fore':
                k=(.500-drop(x))/.500
                hip=(x,y,.500-drop(x)); knee=(x+.010,y,.255*k); ankle=(x-.010,y,.070*k); paw=(x-.030,y,.034); pawSize=(.150,.120,.068)
            else:
                # Plantígrado: el corvejón atrás y un pie largo apoyado entero.
                hip=(x,y,.480); knee=(x-.030,y,.265); ankle=(x+.012,y,.075); paw=(x-.018,y,.034); pawSize=(.175,.118,.068)
            p=empty(pre+l,hip,body)
            # Columnas: el ancho se queda casi entero hasta el pie.
            tube(pre+l+'_Upper',[hip,knee],[(.092,.080),(.074,.066)],'legs',p,10)
            q=empty(pre+l+'Lower',knee,p); tube(pre+l+'_Shin',[knee,ankle],[(.072,.064),(.064,.058)],'legs',q,10)
            f=empty(pre+l+'Foot',ankle,q); ell(pre+l+'_Paw',paw,pawSize,'legs',f,10,5)
            if pre=='fore':
                ell('Shoulder_'+l,(x+.010,y*.93,.450-drop(x)),(.215,.165,.300),'coat',p,12,7)
                if BEAR_FORE_FUR:
                    ell('Forearm_Fur_'+l,(x+.030,y*.97,.255-drop(x)),(.170,.145,.240),'coat',p,10,6)
            else:
                # Muslo ligado al pivote existente; sostiene también la pose erguida.
                ell('Haunch_'+l,(x+.010,y*.90,.395),(.255,.190,.320),'coat',p,12,7)
            (fronts if pre=='fore' else hinds).append(p)
            tip=paw[0]-pawSize[0]/2
            for j in range(4):
                yy=y+(j-1.5)*.027
                tube(pre+l+'_Claw_'+str(j),[(tip+.022,yy,.040),(tip-.006,yy,.030),(tip-.018,yy,.012)],[.009,.006,.0015],'claw',f,7)
    tail=empty('tail',(.410,0,.500),body); ell('Tail',(.430,0,.500),(.060,.060,.060),'coat',tail,8,5)
    # La pose erguida del v3, sobre el pivote de la cadera.
    tracks=[(body,'rotation_euler',[(0,0,0),(0,1.16,0),(0,1.16,0),(0,0,0)]),(body,'location',[(.24,0,.42),(.24,0,.49),(.24,0,.49),(.24,0,.42)]),(head,'rotation_euler',[(0,0,0),(0,-.64,0),(0,-.56,0),(0,0,0)])]
    for p in hinds: tracks.append((p,'rotation_euler',[(0,0,0),(0,-1.16,0),(0,-1.16,0),(0,0,0)]))
    for i,p in enumerate(fronts): tracks.append((p,'rotation_euler',[(0,0,0),((-.18 if i==0 else .18),-.40,0),((-.23 if i==0 else .23),-.65,0),(0,0,0)]))
    clip('rear',tracks,[1,25,48,72]); save('bear-v4')

def slab(n,pts,off,m,parent=None):
    # Una aleta: el contorno y su grosor, como un prisma fino.
    off=Vector(off); vs=[tuple(Vector(p)+off) for p in pts]+[tuple(Vector(p)-off) for p in pts]; k=len(pts)
    fs=[tuple(range(k-1,-1,-1)),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
    return mesh(n,vs,fs,m,parent)

def merge_parts():
    # Junta en una malla las piezas que comparten articulación y material: se
    # ven igual y cada pieza suelta es una llamada de dibujo más por animal.
    groups={}
    for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
        groups.setdefault((o.parent.name if o.parent else '',o.data.materials[0].name),[]).append(o)
    for (parent,material),parts in groups.items():
        if len(parts)<2: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts: o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0]
        bpy.ops.object.join()
        parts[0].name=(parent or 'Root')+'_'+material

def fish():
    # 29 sep 2026. El pez de G-23 era una cápsula con rombos pegados: se leía
    # como un submarino. Una trucha facetada, como los animales de Vera: huso
    # que se afina hacia la cola, aleta caudal ahorquillada, dorsal que asoma
    # del agua (el juego lo pone a −0,14 y la lámina está a −0,10), lomo oscuro
    # —es lo que se ve desde arriba—, costado dorado con pintas y vientre claro.
    # Mismo tamaño que el de G-23 y los nodos que `rigid-clips.mjs` hace nadar.
    reset(); mat('back','3B412E'); mat('flank','8C8158'); mat('belly','D3C9A6'); mat('fin','5B563C')
    mat('spot','2A2620'); mat('red','9A4430')
    body=empty('body',(0,0,0),ROOT)
    head=empty('head',(-.035,0,0),body)
    tail=empty('tail',(.040,0,0),body)
    tip=empty('tailTip',(.080,0,0),tail)
    # (x, centro, semiancho, semialto): el huso, en tres tramos que se solapan
    # para que la cola se doble sin abrir costura.
    front=[(-.075,-.002,.004,.005),(-.069,0,.010,.013),(-.057,.001,.015,.020),(-.037,.002,.018,.025),(-.012,.002,.019,.027),(.014,.001,.018,.025),(.038,0,.015,.021),(.046,0,.014,.019)]
    mid=[(.034,0,.0155,.0215),(.050,0,.0125,.017),(.066,0,.0090,.012),(.086,0,.0060,.0080)]
    end=[(.078,0,.0068,.0090),(.092,0,.0048,.0062),(.100,0,.0040,.0055)]
    for name,sections,node in [('Front',front,body),('Mid',mid,tail),('End',end,tip)]:
        loft(name+'_Flank',sections,'flank',node,10)
        # El lomo y el vientre asoman un diez por ciento del costado: a ras se
        # pelean con él y salen a rayas.
        loft(name+'_Back',[(x,z+rz*.30,ry*.87,rz*.80) for x,z,ry,rz in sections],'back',node,10)
        loft(name+'_Belly',[(x,z-rz*.34,ry*.88,rz*.72) for x,z,ry,rz in sections],'belly',node,10)
    # Caudal ahorquillada, en el plano vertical.
    slab('Caudal_Fin',[(.095,0,.005),(.118,0,.031),(.110,0,.001),(.118,0,-.029),(.095,0,-.005)],(0,.0012,0),'fin',tip)
    # Dorsal alta y redondeada: es lo que asoma del agua.
    slab('Dorsal_Fin',[(-.016,0,.022),(-.006,0,.056),(.006,0,.064),(.016,0,.050),(.022,0,.024)],(0,.0012,0),'fin',body)
    slab('Adipose_Fin',[(.050,0,.015),(.057,0,.023),(.063,0,.012)],(0,.0010,0),'fin',tail)
    slab('Anal_Fin',[(.040,0,-.016),(.049,0,-.030),(.058,0,-.028),(.060,0,-.011)],(0,.0010,0),'fin',tail)
    for s in (-1,1):
        f=empty('fin'+str(s),(-.035,s*.016,-.012),body)
        slab('Pectoral_'+str(s),[(-.037,s*.015,-.012),(-.020,s*.036,-.016),(-.013,s*.032,-.016),(-.022,s*.014,-.012)],(0,0,.0010),'fin',f)
        slab('Pelvic_'+str(s),[(.004,s*.009,-.021),(.020,s*.022,-.026),(.024,s*.018,-.025),(.014,s*.007,-.021)],(0,0,.0010),'fin',body)
        eye('Eye_'+str(s),-.060,s*.0138,.006,.0065,head)
        tube('Mouth_'+str(s),[(-.074,s*.003,-.004),(-.066,s*.009,-.007),(-.058,s*.012,-.006)],[.0012,.0010,.0008],'spot',head,6)
        # Pintas en el costado: casi no se ven a la distancia de juego, pero
        # de cerca dicen trucha y no cualquier pez.
        for j,(x,z,m) in enumerate([(-.030,.010,'spot'),(-.014,.014,'spot'),(.000,.006,'red'),(.012,.013,'spot'),(.024,.004,'spot'),(-.004,-.002,'spot'),(.030,.011,'red')]):
            ry=next(a[2]+(b[2]-a[2])*(x-a[0])/(b[0]-a[0]) for a,b in zip(front,front[1:]) if a[0]<=x<=b[0])
            ell('Spot_'+str(s)+'_'+str(j),(x,s*ry*.93,z),(.0045,.0015,.0040),m,body,6,4)
    merge_parts(); save('fish')

def pig():
    # 29 sep 2026. El cerdo de G-23 era una caja con dos losas por orejas que
    # salían de lado como alas. Facetado como el jabalí de Vera, que es su
    # pariente: barril redondo, patas cortas, hocico de disco, orejas caídas
    # hacia delante y rabo rizado. Mismo tamaño que el de G-23.
    reset(); mat('skin','B8766A'); mat('skinDark','8F5048'); mat('hoof','4A3A33')
    body=empty('body',(0,0,.14),ROOT)
    loft('Barrel',[(-.200,.165,.055,.060),(-.160,.170,.095,.090),(-.080,.172,.115,.105),(.020,.172,.118,.108),
                   (.110,.170,.110,.102),(.170,.168,.085,.085),(.205,.165,.045,.055)],'skin',body,12)
    neck=empty('neck',(-.17,0,.18),body); head=empty('head',(-.21,0,.18),neck)
    loft('Head',[(-.170,.180,.086,.086),(-.215,.172,.081,.077),(-.258,.160,.065,.061),(-.290,.152,.053,.051)],'skin',head,12)
    ell('Jowl',(-.220,0,.140),(.090,.140,.062),'skin',head,10,5)
    ell('Snout_Disc',(-.298,0,.152),(.022,.100,.086),'skinDark',head,10,6)
    for s in (-1,1):
        ell('Nostril_'+str(s),(-.309,s*.017,.152),(.007,.013,.018),'nose',head,6,4)
        eye('Eye_'+str(s),-.248,s*.058,.198,.013,head)
        # Orejas grandes y caídas hacia delante, sobre los ojos: son lo que
        # dice cerdo desde arriba.
        earP=empty('ear'+str(s),(-.195,s*.050,.245),head)
        leaf('Ear_'+str(s),(-.195,s*.050,.245),(-.272,s*.092,.212),.086,.014,'skin',earP)
        leaf('Ear_Inner_'+str(s),(-.202,s*.052,.238),(-.258,s*.082,.214),.046,.005,'skinDark',earP)
    for pre,x in [('fore',-.115),('hind',.130)]:
        for s,l in [(-1,'L'),(1,'R')]:
            y=s*.060; hip=(x,y,.130); knee=(x+(.004 if pre=='fore' else -.012),y,.070); ankle=(x+(-.004 if pre=='fore' else .006),y,.022); toe=(ankle[0]-.008,y,.011)
            limb(pre+l,hip,knee,ankle,toe,.042,'skin',body,'hoof')
    tail=empty('tail',(.205,0,.200),body)
    tube('Curly_Tail',[(.203,0,.200),(.222,0,.212),(.234,.008,.230),(.228,.018,.244),(.216,.014,.240),(.214,.004,.228)],[.008,.007,.006,.005,.004,.002],'skin',tail,7)
    merge_parts(); save('pig')

COW_GIRTH=(1.22,1.14)   # ancho y hondo del tronco sobre la primera versión

def cow():
    # 29 sep 2026. La vaca de G-23 era de cajas, como la gallina; con el cerdo
    # facetado el corral quedaba en dos estilos. Facetada, sobre la estructura
    # de la mula de Vera: barril hondo, cuello corto con papada, cuernos,
    # pelo rojizo con la cara y el vientre blancos (se lee de lejos) y ubre.
    # Mismo tamaño que la de G-23.
    reset(); mat('coat','58301B'); mat('white','E6DCC6'); mat('muzzle','C9A99A'); mat('hoof','3C3029'); mat('udder','D8A89A')
    body=empty('body',(0,0,.26),ROOT)
    barrel=[(-.270,.370,.050,.070),(-.230,.370,.100,.110),(-.140,.365,.120,.120),(.000,.360,.125,.125),(.120,.365,.120,.120),(.200,.370,.100,.110),(.245,.372,.060,.080)]
    # Más gorda (Vera): más ancha y más honda por abajo, con el lomo donde estaba.
    barrel=[(x,z+rz-rz*COW_GIRTH[1],ry*COW_GIRTH[0],rz*COW_GIRTH[1]) for x,z,ry,rz in barrel]
    loft('Barrel',barrel,'coat',body,12)
    loft('Belly',[(x,z-rz*.38,ry*.86,rz*.66) for x,z,ry,rz in barrel[1:-1]],'white',body,12)
    ell('Udder',(.120,0,.245),(.090,.080,.055),'udder',body,10,5)
    for i,(dx,dy) in enumerate([(-.02,-.02),(-.02,.02),(.02,-.02),(.02,.02)]):
        tube('Teat_'+str(i),[(.12+dx,dy,.225),(.12+dx,dy,.205)],[.007,.005],'udder',body,6)
    neck=empty('neck',(-.25,0,.40),body)
    loft('Neck',[(-.235,.395,.085*COW_GIRTH[0],.100*COW_GIRTH[1]),(-.285,.405,.072*COW_GIRTH[0],.085),(-.325,.415,.062,.072)],'coat',neck,12)
    leaf('Dewlap',(-.255,0,.335),(-.315,0,.330),.070,.030,'white',neck)
    head=empty('head',(-.33,0,.42),neck)
    loft('Head',[(-.310,.432,.074,.080),(-.360,.414,.068,.070),(-.412,.388,.061,.056),(-.444,.375,.054,.049)],'white',head,12)
    ell('Muzzle',(-.452,0,.368),(.046,.112,.088),'muzzle',head,10,6)
    for s in (-1,1):
        ell('Nostril_'+str(s),(-.468,s*.018,.372),(.008,.012,.014),'nose',head,6,4)
        eye('Eye_'+str(s),-.372,s*.060,.438,.012,head)
        earP=empty('ear'+str(s),(-.335,s*.062,.462),head)
        leaf('Ear_'+str(s),(-.335,s*.062,.462),(-.330,s*.125,.448),.052,.012,'coat',earP)
        tube('Horn_'+str(s),[(-.330,s*.048,.486),(-.332,s*.088,.505),(-.318,s*.118,.518)],[.014,.010,.003],'ivory',head,7)
    for pre,x in [('fore',-.170),('hind',.180)]:
        for sd,l in [(-1,'L'),(1,'R')]:
            y=sd*.064; hip=(x,y,.400); knee=(x+(.010 if pre=='fore' else -.030),y,.200); ankle=(x+(-.005 if pre=='fore' else .015),y,.050); toe=(ankle[0]-.010,y,.018)
            limb(pre+l,hip,knee,ankle,toe,.052,'coat',body,'hoof')
    tail=empty('tail',(.250,0,.450),body)
    tube('Tail',[(.250,0,.450),(.268,0,.400),(.276,0,.320),(.280,0,.250)],[.012,.009,.007,.006],'coat',tail,7)
    ell('Tail_Tuft',(.281,0,.225),(.030,.030,.060),'hoof',tail,8,5)
    merge_parts(); save('cow')

DEER_DROP=.11

def deer():
    # 29 sep 2026. El ciervo de G-23 era de cajas, el último. Facetado sobre la
    # estructura de la mula de Vera: tronco esbelto sobre patas largas, cuello
    # alto con crin oscura, pardo rojizo con vientre claro y espejo blanco en la
    # grupa, y cuerna ramificada. Mismo tamaño que el de G-23 con su cuerna.
    reset(); mat('coat','5E361D'); mat('belly','D6C3A0'); mat('rump','E3D6BC'); mat('mane','3A2618')
    mat('antler','CDB99A'); mat('hoof','33291F'); mat('earInner','5A3E2C')
    body=empty('body',(0,0,.34),ROOT)
    torso=[(-.220,.460,.050,.070),(-.180,.470,.085,.100),(-.080,.465,.095,.100),(.050,.465,.090,.095),(.150,.470,.085,.095),(.210,.475,.050,.070)]
    loft('Torso',torso,'coat',body,12)
    loft('Belly',[(x,z-rz*.40,ry*.86,rz*.62) for x,z,ry,rz in torso[1:-1]],'belly',body,12)
    ell('Rump_Patch',(.212,0,.490),(.050,.120,.120),'rump',body,10,6)
    tail=empty('tail',(.225,0,.525),body); ell('Tail',(.232,0,.515),(.030,.030,.050),'mane',tail,8,5)
    neck=empty('neck',(-.200,0,.520),body)
    tube('Neck',[(-.190,0,.515),(-.245,0,.600),(-.285,0,.660)],[(.062,.056),(.050,.045),(.042,.040)],'coat',neck,10)
    tube('Mane',[(-.200,0,.470),(-.250,0,.560),(-.280,0,.630)],[(.052,.050),(.044,.042),(.030,.030)],'mane',neck,10)
    head=empty('head',(-.290,0,.660),neck)
    loft('Head',[(-.275,.676,.043,.046),(-.315,.666,.039,.041),(-.355,.648,.030,.031),(-.388,.636,.022,.022)],'coat',head,10)
    ell('Nose',(-.397,0,.634),(.020,.034,.028),'nose',head,8,5)
    for s in (-1,1):
        eye('Eye_'+str(s),-.318,s*.039,.683,.010,head)
        earP=empty('ear'+str(s),(-.280,s*.030,.700),head)
        leaf('Ear_'+str(s),(-.280,s*.030,.700),(-.262,s*.088,.735),.042,.010,'coat',earP)
        leaf('Ear_Inner_'+str(s),(-.283,s*.034,.703),(-.268,s*.078,.728),.022,.004,'earInner',earP)
        # La cuerna: la vara sube hacia atrás y afuera, con luchadera, candil
        # y la corona arriba.
        beam=[(-.285,s*.026,.705),(-.262,s*.070,.765),(-.235,s*.110,.815),(-.205,s*.140,.850)]
        tube('Antler_Beam_'+str(s),beam,[.010,.009,.007,.005],'antler',head,7)
        tube('Brow_Tine_'+str(s),[(-.280,s*.040,.725),(-.305,s*.060,.748),(-.325,s*.070,.770)],[.007,.005,.002],'antler',head,6)
        tube('Trez_Tine_'+str(s),[(-.258,s*.078,.772),(-.280,s*.100,.800),(-.292,s*.112,.825)],[.006,.004,.002],'antler',head,6)
        tube('Crown_A_'+str(s),[(-.205,s*.140,.850),(-.215,s*.162,.872)],[.005,.002],'antler',head,6)
        tube('Crown_B_'+str(s),[(-.212,s*.132,.842),(-.196,s*.124,.874)],[.005,.002],'antler',head,6)
    # Patas más cortas (Vera: «demasiado largas»): el cuerpo entero baja
    # DEER_DROP y las patas se acortan lo mismo, con las pezuñas en el suelo.
    body.location.z-=DEER_DROP
    for pre,x in [('fore',-.140),('hind',.150)]:
        for sd,l in [(-1,'L'),(1,'R')]:
            y=sd*.055
            if pre=='fore':
                k=(.450-DEER_DROP)/.450
                hip=(x,y,.450-DEER_DROP); knee=(x+.010,y,.034+(.250-.034)*k); ankle=(x-.004,y,.034); toe=(ankle[0]-.010,y,.016)
            else:
                # El corvejón atrás, como en el ciervo de verdad.
                k=(.460-DEER_DROP)/.460
                hip=(x,y,.460-DEER_DROP); knee=(x-.035,y,.034+(.280-.034)*k); ankle=(x+.020,y,.034); toe=(ankle[0]-.010,y,.016)
            limb(pre+l,hip,knee,ankle,toe,.040,'coat',body,'hoof')
    merge_parts(); save('deer')

MULE_DROP=.10   # patas más cortas (Vera: «muy largas»; eligió ésta); 0 es la suya

def mule():
    reset(); mat('coat','978772'); mat('coatTop','514B40'); mat('light','C9C1A5'); mat('earInner','706658'); mat('pack','B19A6C'); mat('cloth','A28F63')
    body=empty('body',(0,0,.24),ROOT)
    loft('Equine_Barrel',[(-.19,.372,.055,.088),(-.11,.376,.091,.101),(.028,.368,.094,.108),(.162,.37,.080,.097),(.217,.377,.045,.065)],'coat',body)
    neck=empty('neck',(-.177,0,.395),body); tube('Upright_Neck',[(-.158,0,.356),(-.21,0,.426),(-.231,0,.503),(-.253,0,.535)],[(.073,.063),(.069,.056),(.044,.044),(.032,.038)],'coat',neck,10)
    head=empty('head',(-.27,0,.505),neck)
    loft('Long_Equine_Head',[(-.235,.514,.042,.059),(-.28,.508,.050,.061),(-.327,.466,.036,.039),(-.365,.436,.032,.030)],'coat',head)
    ell('Pale_Muzzle',(-.364,0,.428),(.076,.088,.063),'light',head,10,6)
    ell('Lip',(-.383,0,.416),(.052,.068,.030),'coatTop',head,10,5)
    for s in (-1,1):
        eye('Eye_'+str(s),-.288,s*.046,.514,.017,head)
        ell('Nostril_'+str(s),(-.384,s*.029,.442),(.014,.016,.020),'nose',head,8,5)
        ear('ear'+str(s),(-.25,s*.029,.556),(-.224,s*.052,.695),.040,'coat',head)
        tube('Halter_Cheek_'+str(s),[(-.246,s*.045,.521),(-.347,s*.043,.431)],[.004,.004],'leather',head,6)
    ring('Halter_Nose',(-.35,0,.441),.035,.031,.008,'leather',head,12,axis='Y').hide_render=True
    # Crin vertical corta, siguiendo la nuca.
    for j in range(7): leaf('Mane_'+str(j),(-.239+j*.015,0,.515-j*.018),(-.218+j*.015,0,.555-j*.018),.017,.013,'coatTop',neck)
    tail=empty('tail',(.213,0,.39),body)
    tube('Fine_Tail',[(.213,0,.390),(.242,0,.333),(.254,0,.237),(.264,0,.151)],[.010,.009,.007,.005],'coatTop',tail,8)
    tube('Tail_Brush',[(.259,0,.197),(.273,0,.151),(.272,0,.101)],[.017,.022,.003],'coatTop',tail,8)
    box('Saddle_Blanket',(0,0,.477),(.219,.200,.026),'cloth',body,.009)
    box('Pack_Saddle',(0,0,.496),(.165,.114,.032),'leather',body,.008)
    for s in (-1,1):
        box('Pannier_'+str(s),(.035,s*.114,.376),(.164,.069,.124),'pack',body,.014)
        for j in range(4): tube('Pannier_Weave_'+str(s)+'_'+str(j),[(-.035,s*.151,.332+j*.026),(.102,s*.151,.332+j*.026)],[.003,.003],'rope',body,5)
        for xx in (-.030,.097): tube('Pack_Strap_'+str(s)+'_'+str(xx),[(xx,s*.135,.322),(xx,s*.151,.411),(xx,s*.077,.49)],[.006,.006,.006],'leather',body,6)
    box('Bundle',(.021,0,.532),(.152,.100,.067),'light',body,.018)
    for xx in (-.027,.069): tube('Bundle_Lashing_'+str(xx),[(xx,-.055,.514),(xx,-.049,.563),(xx,.048,.563),(xx,.055,.514)],[.003]*4,'rope',body,6)
    # Primero baja el cuerpo con todo lo que lleva encima y después se hacen
    # las patas ya en su sitio: la cadera MULE_DROP más abajo, la pezuña en el
    # suelo y a su altura de siempre. Con MULE_DROP=0 es la mula de Vera tal cual.
    body.location.z-=MULE_DROP
    k=(.375-MULE_DROP-.044)/(.375-.044)
    lz=lambda z: .044+(z-.044)*k
    for pre,x in [('fore',-.146),('hind',.16)]:
        for s,l in [(-1,'L'),(1,'R')]:
            y=s*.055; hip=(x,y,.375-MULE_DROP); knee=(x+(.004 if pre=='fore' else -.037),y,lz(.200)); ankle=(x+(.003 if pre=='fore' else .028),y,.044); toe=(ankle[0]-.011,y,.021)
            p,q,f=limb(pre+l,hip,knee,ankle,toe,.030,'coat',body)
            ell(pre+l+'_Knee',knee,(.034,.034,.038),'coatTop',q,8,5)
            tube(pre+l+'_Pale_Shin',[(ankle[0],y,.048),(ankle[0]+.001,y,lz(.14))],[.013,.012],'light',q,8)
    save('mule')

def partridge():
    reset(); mat('coat','967B54'); mat('coatTop','7A684D'); mat('light','D1C5A2'); mat('flank','BF965C'); mat('red','B64D31'); mat('mark','3C3C32'); mat('feather','AD8B60')
    body=empty('body',(0,0,.086),ROOT)
    ell('Plump_Body',(.005,0,.099),(.208,.137,.158),'coat',body,12,8)
    ell('Breast',(-.055,0,.100),(.100,.118,.128),'light',body,12,7)
    neck=empty('neck',(-.073,0,.135),body); ell('Neck',(-.079,0,.140),(.074,.077,.093),'light',neck)
    head=empty('head',(-.094,0,.167),neck); ell('Head',(-.096,0,.170),(.079,.074,.075),'coat',head,12,7)
    # Máscara y babero claros delimitados por collar oscuro.
    ell('Black_Bib',(-.107,0,.146),(.059,.079,.050),'mark',head,12,6)
    ell('White_Throat',(-.117,0,.154),(.041,.067,.051),'light',head,12,6)
    for s in (-1,1):
        ell('Face_Cream_'+str(s),(-.109,s*.027,.179),(.059,.026,.044),'light',head,10,6)
        tube('Eye_Stripe_'+str(s),[(-.128,s*.026,.184),(-.107,s*.037,.181),(-.087,s*.032,.169),(-.081,s*.030,.149)],[.004,.006,.006,.004],'mark',head,6)
        ell('Red_Eye_Ring_'+str(s),(-.109,s*.038,.184),(.022,.009,.022),'red',head,10,5)
        eye('Eye_'+str(s),-.110,s*.042,.185,.012,head)
    leaf('Red_Beak',(-.128,0,.173),(-.16,0,.164),.027,.012,'red',head)
    # Alas cerradas: remiges finas escalonadas apoyadas en el costado.
    wings=[]
    for s,l in [(-1,'L'),(1,'R')]:
        w=empty('wing'+l,(-.023,s*.048,.143),body); wings.append(w)
        ell('Folded_Wing_'+l,(.030,s*.056,.127),(.133,.029,.090),'coatTop',w,12,6)
        for j in range(6):
            leaf('Wing_Feather_'+l+str(j),(-.025+j*.014,s*(.068-j*.001),.150-j*.004),(.063+j*.007,s*(.068-j*.001),.094-j*.002),.020,.004,'feather' if j%2 else 'coat',w)
        for j in range(5):
            x=-.030+j*.025; z=.090-abs(j-2)*.004
            box('Flank_Bar_'+l+str(j),(x,s*.065,z),(.009,.006,.035),'mark',body,.002)
            box('Flank_Light_'+l+str(j),(x+.008,s*.064,z+.003),(.010,.006,.032),'light',body,.002)
    tail=empty('tail',(.091,0,.096),body)
    for j in range(7):
        y=(j-3)*.009; leaf('Tail_Feather_'+str(j),(.065,y*.45,.107),(.153-abs(j-3)*.005,y*1.1,.077+abs(j-3)*.001),.018,.004,'feather' if j%2 else 'coatTop',tail)
    for s,l in [(-1,'L'),(1,'R')]:
        hip=(.0,s*.029,.061); knee=(.008,s*.029,.031); ankle=(-.004,s*.029,.010)
        p=empty('leg'+l,hip,body); tube('Leg_'+l,[hip,knee,ankle],[.006,.0045,.0035],'red',p,7); f=empty('foot'+l,ankle,p)
        for j in (-1,0,1): tube('Toe_'+l+str(j),[ankle,(-.026,s*.029+j*.012,.005)],[.003,.0015],'red',f,6)
        tube('Rear_Toe_'+l,[ankle,(.014,s*.029,.005)],[.0025,.001],'red',f,6)
    bl=body.location.copy()
    tracks=[(wings[0],'rotation_euler',[(0,0,0),(-1.3,0,-.18),(-.28,0,0),(-1.1,0,-.12),(0,0,0)]),(wings[1],'rotation_euler',[(0,0,0),(1.3,0,.18),(.28,0,0),(1.1,0,.12),(0,0,0)]),(body,'location',[tuple(bl),tuple(bl+Vector((0,0,.012))),tuple(bl+Vector((0,0,.035))),tuple(bl+Vector((0,0,.02))),tuple(bl)])]
    clip('takeoff',tracks,[1,8,14,20,28]); save('partridge')

def hen():
    # 29 sep 2026. La gallina de G-23 era de cajas, la última del corral. Sobre
    # la estructura de la perdiz de Vera: cuerpo lleno, cola alzada hacia atrás,
    # cresta y barbillas rojas, pico y patas amarillos. Blanca, que es lo que
    # se lee sobre la hierba y no se confunde con la perdiz ni con el zorro.
    # Mismo tamaño que la de G-23.
    reset(); mat('coat','E9E2D0'); mat('wing','D6CBB2'); mat('shade','BFB29A'); mat('red','C23A2A'); mat('yellow','D9A441')
    body=empty('body',(0,0,.085),ROOT)
    ell('Plump_Body',(.012,0,.110),(.200,.118,.135),'coat',body,12,8)
    ell('Breast',(-.045,0,.105),(.110,.108,.120),'coat',body,12,7)
    neck=empty('neck',(-.058,0,.150),body); ell('Neck',(-.066,0,.160),(.068,.066,.100),'coat',neck)
    head=empty('head',(-.078,0,.192),neck); ell('Head',(-.082,0,.196),(.062,.056,.060),'coat',head,12,7)
    for j,(x,h) in enumerate([(-.100,.020),(-.086,.026),(-.072,.022),(-.060,.016)]):
        ell('Comb_'+str(j),(x,0,.222+h*.4),(.016,.008,h),'red',head,8,5)
    # Pico corto que nace ancho de la cara y se afina: el rombo de las plumas lo
    # dejaba de perfil en punta de flecha, como el primer cuervo.
    loft('Beak',[(-.103,.198,.011,.010),(-.115,.195,.008,.007),(-.126,.191,.004,.004),(-.133,.188,.001,.001)],'yellow',head,8)
    for s in (-1,1):
        ell('Wattle_'+str(s),(-.104,s*.006,.174),(.012,.008,.022),'red',head,8,5)
        ell('Face_'+str(s),(-.096,s*.022,.198),(.022,.008,.020),'red',head,8,5)
        eye('Eye_'+str(s),-.098,s*.026,.203,.010,head)
    wings=[]
    for s,l in [(-1,'L'),(1,'R')]:
        w=empty('wing'+l,(-.020,s*.050,.140),body); wings.append(w)
        ell('Folded_Wing_'+l,(.025,s*.056,.122),(.125,.030,.080),'wing',w,12,6)
        for j in range(4):
            leaf('Wing_Feather_'+l+str(j),(.010+j*.014,s*.068,.130-j*.004),(.080+j*.006,s*.066,.095-j*.002),.020,.004,'shade' if j%2 else 'wing',w)
    tail=empty('tail',(.085,0,.130),body)
    for j in range(5):
        y=(j-2)*.010
        leaf('Tail_Feather_'+str(j),(.078,y*.5,.128),(.128-abs(j-2)*.006,y*1.3,.205-abs(j-2)*.010),.046,.010,'shade' if j%2 else 'coat',tail)
    for s,l in [(-1,'L'),(1,'R')]:
        hip=(.004,s*.028,.060); knee=(.012,s*.028,.032); ankle=(-.002,s*.028,.010)
        p=empty('leg'+l,hip,body); tube('Leg_'+l,[hip,knee,ankle],[.008,.006,.005],'yellow',p,7); f=empty('foot'+l,ankle,p)
        for j in (-1,0,1): tube('Toe_'+l+str(j),[ankle,(-.026,s*.028+j*.012,.004)],[.0035,.0018],'yellow',f,6)
        tube('Rear_Toe_'+l,[ankle,(.014,s*.028,.004)],[.003,.0012],'yellow',f,6)
    merge_parts(); save('hen')

def crow():
    # 29 sep 2026. El cuervo de G-23 era de cajas. Sobre la estructura de la
    # gallina, pero esbelto: negro con brillo azulado en las alas, pico grueso
    # y oscuro, alas largas plegadas hasta la cola y cola en cuña. Mismo tamaño
    # que el de G-23.
    reset(); mat('coat','1C1E22'); mat('sheen','252A36'); mat('beak','26272B'); mat('legs','2E2C2A')
    body=empty('body',(0,0,.080),ROOT)
    ell('Sleek_Body',(.012,0,.112),(.170,.086,.092),'coat',body,12,8)
    ell('Breast',(-.038,0,.106),(.090,.080,.088),'coat',body,12,7)
    neck=empty('neck',(-.058,0,.130),body); ell('Neck',(-.066,0,.140),(.056,.056,.072),'coat',neck)
    head=empty('head',(-.082,0,.162),neck); ell('Head',(-.088,0,.166),(.062,.054,.056),'coat',head,12,7)
    # Pico macizo que nace ancho de la cara y se afina con una curva hacia
    # abajo; el rombo de las plumas lo dejaba de perfil en punta de flecha.
    loft('Beak',[(-.104,.168,.016,.015),(-.122,.165,.013,.012),(-.140,.160,.008,.008),(-.156,.153,.004,.004),(-.164,.148,.001,.001)],'beak',head,8)
    for s in (-1,1):
        eye('Eye_'+str(s),-.102,s*.023,.175,.008,head)
    wings=[]
    for s,l in [(-1,'L'),(1,'R')]:
        # Pegadas al cuerpo: abiertas, de frente parecían orejas.
        w=empty('wing'+l,(-.020,s*.032,.130),body); wings.append(w)
        ell('Folded_Wing_'+l,(.035,s*.033,.122),(.160,.020,.060),'sheen',w,12,6)
        for j in range(2):
            leaf('Primary_'+l+str(j),(.070+j*.014,s*.034,.126-j*.004),(.152+j*.008,s*(.028-j*.002),.118-j*.003),.034,.007,'coat',w)
    tail=empty('tail',(.090,0,.118),body)
    # Cola en cuña maciza: plumas anchas que se solapan, no una escoba.
    for j in range(3):
        y=(j-1)*.012
        leaf('Tail_Feather_'+str(j),(.088,y*.5,.120),(.190-abs(j-1)*.010,y*1.6,.112),.056,.009,'coat' if j%2 else 'sheen',tail)
    for s,l in [(-1,'L'),(1,'R')]:
        hip=(.002,s*.022,.070); knee=(.010,s*.022,.040); ankle=(-.004,s*.022,.012)
        p=empty('leg'+l,hip,body); tube('Leg_'+l,[hip,knee,ankle],[.006,.0048,.004],'legs',p,7); f=empty('foot'+l,ankle,p)
        for j in (-1,0,1): tube('Toe_'+l+str(j),[ankle,(-.028,s*.022+j*.011,.004)],[.003,.0015],'legs',f,6)
        tube('Rear_Toe_'+l,[ankle,(.016,s*.022,.004)],[.0028,.0012],'legs',f,6)
    merge_parts(); save('crow')

def duck():
    # 29 sep 2026. El pato de G-23 era de cajas. Un ánade real macho facetado,
    # sobre la estructura de la gallina: casco de barca que flota —el juego lo
    # pone con la línea de agua a 0,06 del suelo del modelo—, cabeza verde con
    # collar blanco, pecho castaño, lomo gris, espejuelo azul en el ala, cola
    # negra rizada y pico plano y ancho. Mismo tamaño que el de G-23.
    reset(); mat('grey','B8B4A6'); mat('green','2F5A3A'); mat('white','E8E4D8'); mat('chestnut','6B3A26')
    mat('wing','8C8272'); mat('blue','3A4F8C'); mat('black','232322'); mat('bill','D8B04A'); mat('orange','D9822E')
    body=empty('body',(0,0,.080),ROOT)
    ell('Hull',(.010,0,.092),(.215,.112,.092),'grey',body,12,8)
    ell('Breast',(-.058,0,.098),(.100,.100,.092),'chestnut',body,12,7)
    ell('Rump',(.090,0,.104),(.060,.070,.060),'black',body,10,6)
    neck=empty('neck',(-.068,0,.128),body)
    ell('Collar',(-.070,0,.128),(.062,.062,.016),'white',neck,10,4)
    ell('Neck',(-.072,0,.148),(.050,.050,.070),'green',neck,10,6)
    head=empty('head',(-.086,0,.172),neck); ell('Head',(-.090,0,.176),(.068,.056,.056),'green',head,12,7)
    # Pico de pato: plano y ancho, no en punta.
    loft('Bill',[(-.114,.172,.016,.013),(-.134,.167,.016,.008),(-.151,.164,.014,.006),(-.158,.163,.010,.004)],'bill',head,8)
    for s in (-1,1):
        eye('Eye_'+str(s),-.104,s*.024,.184,.008,head)
    wings=[]
    for s,l in [(-1,'L'),(1,'R')]:
        w=empty('wing'+l,(-.010,s*.038,.118),body); wings.append(w)
        ell('Folded_Wing_'+l,(.025,s*.040,.114),(.130,.024,.050),'wing',w,12,6)
        ell('Speculum_'+l,(.030,s*.052,.108),(.034,.006,.016),'blue',w,8,4)
    tail=empty('tail',(.110,0,.110),body)
    tube('Tail_Curl',[(.110,0,.118),(.124,0,.132),(.122,0,.144),(.114,0,.142)],[.006,.005,.004,.002],'black',tail,6)
    leaf('Tail_Fan',(.100,0,.105),(.140,0,.112),.050,.008,'wing',tail)
    for s,l in [(-1,'L'),(1,'R')]:
        hip=(.004,s*.028,.062); knee=(.010,s*.028,.036); ankle=(.000,s*.028,.012)
        p=empty('leg'+l,hip,body); tube('Leg_'+l,[hip,knee,ankle],[.007,.0055,.0045],'orange',p,7); f=empty('foot'+l,ankle,p)
        leaf('Web_'+l,(ankle[0],s*.028,.006),(-.030,s*.028,.004),.030,.004,'orange',f)
    merge_parts(); save('duck')

def bucket():
    reset(); mat('staveA','A07C50'); mat('staveB','927044'); mat('staveC','B18B59'); mat('inside','71573A')
    # Duela individual, hueco real y espesor visible en el canto.
    N=14
    for i in range(N):
        a0=2*pi*(i+.025)/N; a1=2*pi*(i+.975)/N; vs=[]
        for z,r in [(0,.034),(.094,.041),(0,.029),(.094,.0355)]:
            for a in (a0,a1): vs.append((r*cos(a),r*sin(a),z))
        o=mesh('Stave_%02d'%i,vs,[(0,1,3,2),(4,6,7,5),(2,3,7,6),(0,4,5,1),(0,2,6,4),(1,5,7,3)],['staveA','staveB','staveC'][i%3])
    ring('Lower_Iron_Hoop',(0,0,.015),.0365,.032,.008,'iron',N=28)
    ring('Upper_Iron_Hoop',(0,0,.078),.0415,.037,.008,'iron',N=28)
    tube('Bucket_Base',[(0,0,.004),(0,0,.009)],[.032,.032],'inside',sides=14)
    for s in (-1,1):
        ell('Hoop_Rivet_'+str(s),(s*.041,0,.078),(.004,.005,.005),'ironEdge',seg=6,rings=4)
    # Asa abatida contra el cubo para conservar altura de catálogo.
    pts=[(.042*cos(pi*i/12),-.010-.020*sin(pi*i/12),.080-.039*sin(pi*i/12)) for i in range(13)]
    tube('Folded_Iron_Handle',pts,[.0018]*len(pts),'iron',sides=6)
    save('bucket')

def arrow():
    reset(); mat('feather','C8BD96')
    empty('grip',(0,0,0),ROOT)
    tube('Arrow_Shaft',[(0,0,0),(0,-.235,0)],[.0026,.0023],'wood',sides=8)
    # Punta lanceolada de hierro mirando -Y Blender, +Z glTF.
    mesh('Iron_Arrowhead',[(0,-.26667,0),(-.010,-.237,0),(0,-.230,0),(.010,-.237,0),(0,-.241,.003),(0,-.241,-.003)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(1,0,5),(2,1,5),(3,2,5),(0,3,5)],'iron')
    for k in range(3):
        a=2*pi*k/3; v=Vector((cos(a),0,sin(a))); vs=[(0,-.007,0),(0,-.060,0),tuple(v*.012+Vector((0,-.046,0))),tuple(v*.013+Vector((0,-.020,0)))]
        o=mesh('Tail_Fletching_'+str(k),vs,[(0,1,2,3),(3,2,1,0)],'feather'); mo=o.modifiers.new('Feather_Thickness','SOLIDIFY'); mo.thickness=.0008; bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mo.name)
    for y in (-.009,-.056): tube('Fletching_Binding_'+str(y),[(0,y-.002,0),(0,y+.002,0)],[.0032,.0032],'rope',sides=8)
    save('arrow')

def shield():
    reset(); empty('grip',(0,.028333,.15),ROOT)
    ring('Continuous_Iron_Rim',(0,0,.15),.150,.137,.022,'iron',N=32,axis='Y')
    # Cinco tablas perfiladas por la circunferencia, sin emblema.
    R=.137
    for i in range(7):
        x0=-R+i*(2*R/7)+.0007; x1=-R+(i+1)*(2*R/7)-.0007
        xs=[x0+(x1-x0)*j/4 for j in range(5)]; poly=[(x,math.sqrt(max(0,R*R-x*x))+.15) for x in xs]+[(x,-math.sqrt(max(0,R*R-x*x))+.15) for x in reversed(xs)]
        vs=[(x,y,z) for y in (-.007,.007) for x,z in poly]; n=len(poly); fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
        mesh('Board_'+str(i),vs,fs,'wood' if i%2 else 'woodLight')
    ring('Boss_Flange',(0,-.013,.15),.037,.029,.004,'iron',N=20,axis='Y')
    ell('Low_Iron_Umbo',(0,-.017,.15),(.064,.021,.064),'iron',seg=16,rings=7)
    for i in range(12):
        a=2*pi*i/12; ell('Rim_Rivet_'+str(i),(.143*cos(a),-.012,.15+.143*sin(a)),(.006,.0035,.006),'ironEdge',seg=6,rings=4)
    for z in (.103,.197): box('Rear_Brace_'+str(z),(0,.012,z),(.197,.010,.011),'woodDark',bev=.002)
    tube('Hand_Grip',[(-.032,.031,.15),(.032,.031,.15)],[.009,.009],'leather',sides=8)
    save('shield')

def pickaxe():
    reset(); empty('grip',(0,0,0),ROOT)
    tube('Wood_Handle',[(0,0,-.033333),(.002,0,.045),(.001,0,.16),(0,0,.273)],[.007,.008,.0065,.007],'wood',sides=8)
    # Una sola malla cerrada, forjada y curvada, con extremos romos.
    tube('One_Piece_Forged_Head',[(-.126,0,.235),(-.107,0,.253),(-.074,0,.270),(-.033,0,.282),(0,0,.287),(.034,0,.282),(.074,0,.27),(.108,0,.249),(.126,0,.230)],[(.003,.003),(.007,.006),(.010,.008),(.014,.010),(.015,.012),(.014,.010),(.010,.008),(.007,.006),(.003,.003)],'iron',sides=8)
    box('Head_Wedge',(0,0,.297),(.012,.012,.008),'woodDark',bev=.002)
    for z in (.015,.035,.055): tube('Grip_Wrap_'+str(z),[(.002,0,z-.003),(.002,0,z+.003)],[.0085,.0085],'leather',sides=8)
    save('pickaxe')

def hoe():
    reset()
    tube('Curved_Ash_Handle',[(0,0,0),(0,-.20,-.275),(.007,-.44,-.565),(.009,-.660,-.827),(0,-.833,-1.067),(0,-.865,-1.12)],[.023,.025,.027,.028,.032,.032],'wood',sides=10)
    # Fibra estilizada por dos trazos discretos y bandas del mango.
    tube('Wood_Grain',[(-.013,-.18,-.25),(-.017,-.38,-.49),(-.011,-.57,-.727)],[.0018,.002,.0015],'woodDark',sides=5)
    for i in range(4):
        t=.10+i*.018; a=Vector((0,-t,-t*1.36)); b=a+Vector((0,-.006,-.008)); tube('Grip_Binding_'+str(i),[tuple(a),tuple(b)],[.026,.026],'rope',sides=10)
    tube('Iron_Socket',[(0,-.803,-1.025),(0,-.87,-1.122)],[.039,.040],'iron',sides=10)
    # Hoja ancha, hombros redondeados en polígonos y filo más fino.
    outline=[(-.033,-1.086),(.033,-1.086),(.048,-1.17),(.112,-1.216),(.123,-1.343),(.090,-1.371),(-.090,-1.371),(-.123,-1.343),(-.112,-1.216),(-.048,-1.17)]
    vs=[]
    for y in (-.924,-.948):
        for x,z in outline: vs.append((x,y+(z+1.086)*.22,z))
    n=len(outline); fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh('Broad_Forged_Blade',vs,fs,'iron')
    mesh('Sharpened_Edge',[(-.09,-1.011,-1.371),(.09,-1.011,-1.371),(.112,-1.007,-1.35),(-.112,-1.007,-1.35)],[(0,1,2,3)],'ironEdge')
    ell('Socket_Rivet',(0,-.910,-1.102),(.018,.010,.018),'ironEdge',seg=8,rings=4)
    save('hoe')


# ---------------------------------------------------------------------------
# Los animales rehechos (2 oct 2026, v5.100). Vera: «los modelos de Astra de
# los animales no me gustan, los corregirás tú con el estilo que has ido usando
# con los últimos». Los seis se hacen aquí, con las mismas piezas que la mula,
# la vaca y la gallina —tronco en `loft`, cuello en `tube`, cabeza en `ell`,
# orejas y plumas en `leaf`— y con los nodos de su esqueleto: el caballo, los de
# la mula (`body`, `neck`, `head`, `ear±1`, `foreL`/`foreLLower`/`foreLFoot`…,
# `tail`); la cigüeña y el polluelo, los de la gallina (`legL`, `footL`…), para
# que `rigid-clips.mjs` los haga andar igual. La grulla y la mariposa vuelan:
# llevan las alas en mallas aparte con el origen en el hombro, como la
# golondrina (`bird_wing_l`/`bird_wing_r`, `wing_l`/`wing_r`), y miran a −Y de
# Blender (+Z del GLB). Los presupuestos son los del encargo de la tanda
# (`docs/encargos/encargo-astra-tanda-larga-2026-10-02.md`, bloques 6 y 7), y
# por eso las esferas y los tubos llevan menos caras que los de la gallina.

def reorigin(o,point):
    # El origen de una malla en `point`: el ala gira sobre su hombro, no sobre
    # el centro del cuerpo.
    from mathutils import Matrix
    p=Vector(point); bpy.context.view_layer.update(); w=o.matrix_world.copy()
    o.data.transform(Matrix.Translation(-(w.inverted()@p))); o.matrix_world=w@Matrix.Translation(w.inverted()@p)
    return o

def flat(n,pts,m,parent=None):
    # Una lámina sin canto (alas, pies): una sola cara; el material es de dos
    # caras, así que se ve por los dos lados sin pagar el revés.
    return mesh(n,list(pts),[tuple(range(len(pts)))],m,parent)

def tetra(n,pts,m,parent=None):
    # Cuatro caras: el ojo de un ave pequeña o el cuerpo de una mariposa.
    return mesh(n,list(pts),[(0,1,2),(0,2,3),(0,3,1),(1,3,2)],m,parent)

def join(name,parts):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); parts[0].name=name; return parts[0]

def turn_to_minus_y(objects):
    # De «mira a −X» (los cuadrúpedos) a «mira a −Y» (+Z del GLB, la golondrina).
    from mathutils import Matrix
    r=Matrix.Rotation(pi/2,4,'Z')
    for o in objects:
        if o.type=='MESH': o.data.transform(r)

# El caballo se escala al rigging: `rig-single-mesh.py … horse.glb 0.96` lo deja
# de hocico a cola en 0,96 celdas, y la cruz le saca un 30 % a la de la mula.
HORSE_LENGTH=.96
HORSE_LEG_TOP=.27   # dónde acaban las patas, en fracción del alto (la barriga)

def horse():
    # El caballo de tiro es **la mula de Vera hecha caballo** (Vera: «la mula
    # es mucho mejor»), con sus piezas —tronco en `loft`, cuello en `tube`,
    # cabeza larga con el morro oscuro, ojos con brillo, orejas en `ear`, cola
    # con borla— y lo que dice «tiro»: más alto en la cruz, cuello largo y
    # grueso, orejas cortas, crin y cola llenas, calzas blancas y lucero.
    #
    # **Una sola malla, como el zorro** (Vera: «el caballo tiene piezas con
    # huecos»). De piezas rígidas, cada una gira con su nodo y al andar se
    # abren rendijas en la rodilla, en el casco y entre los dientes de la crin.
    # Aquí todo se une en una malla, cada pieza entra en la de al lado, y el
    # esqueleto y los pesos los pone `tools/art/rig-single-mesh.py` por
    # regiones: lo que se dobla se estira, no se abre. Se exporta sin huesos
    # como `horse-mesh.glb`; el esqueleto viene después.
    reset(); mat('coat','4A2A18'); mat('coatTop','16120F'); mat('light','D9CDB4'); mat('earInner','5A4030'); mat('blaze','E6E0D0')
    parts=[]
    P=lambda o: parts.append(o) or o
    P(loft('Equine_Barrel',[(-.20,.272,.062,.092),(-.12,.278,.100,.108),(.028,.270,.104,.114),(.165,.272,.090,.104),(.222,.280,.050,.070)],'coat',None,10))
    # El cuello nace dentro del pecho y la cabeza dentro del cuello: sin junta.
    P(tube('Upright_Neck',[(-.120,0,.250),(-.190,0,.340),(-.232,0,.440),(-.262,0,.488)],[(.090,.074),(.080,.066),(.058,.052),(.044,.044)],'coat',None,8))
    P(loft('Long_Equine_Head',[(-.236,.478,.044,.060),(-.290,.470,.052,.062),(-.344,.420,.038,.042),(-.388,.384,.034,.032)],'coat',None,8))
    P(ell('Dark_Muzzle',(-.386,0,.376),(.080,.088,.064),'coatTop',None,8,4))
    P(leaf('Blaze',(-.264,0,.518),(-.384,0,.404),.030,.010,'blaze'))
    # La crin, una cresta llena hundida a medias en el cuello, de la nuca a la cruz.
    P(tube('Crest_Mane',[(-.244,.010,.536),(-.208,.010,.488),(-.166,.010,.420),(-.112,.010,.350)],[(.022,.028),(.028,.032),(.028,.032),(.014,.018)],'coatTop',None,5))
    P(leaf('Forelock',(-.262,0,.526),(-.292,0,.490),.034,.010,'coatTop'))
    for s in (-1,1):
        P(ell('Eye_'+str(s),(-.298,s*.048,.478),(.018,.008,.016),'eye',None,5,3))
        P(ell('Eye_Glint_'+str(s),(-.301,s*.051,.482),(.005,.004,.005),'ivory',None,4,3))
        # Orejas cortas, la mitad que las de la mula, saliendo de dentro de la cabeza.
        P(leaf('Ear_'+str(s),(-.258,s*.028,.500),(-.246,s*.046,.584),.034,.008,'coat'))
    P(tube('Full_Tail',[(.190,0,.300),(.236,0,.256),(.252,0,.170),(.258,0,.080)],[.020,.022,.026,.022],'coatTop',None,6))
    P(tube('Tail_Brush',[(.256,0,.130),(.266,0,.070),(.262,0,.020)],[.028,.030,.004],'coatTop',None,6))
    for pre,x in [('fore',-.148),('hind',.162)]:
        for s in (-1,1):
            y=s*.062; hip=(x,y,.250); knee=(x+(.010 if pre=='fore' else -.034),y,.140); fet=(x+(-.002 if pre=='fore' else .024),y,.050)
            # La pata entera en un tubo de la cadera (dentro del tronco) al menudillo.
            P(tube('Leg_'+pre+str(s),[hip,knee,fet],[.040,.026,.020],'coat',None,6))
            P(tube('Cannon_'+pre+str(s),[(knee[0],y,knee[2]+.012),fet],[.024,.020],'coatTop',None,6))
            P(tube('Feather_'+pre+str(s),[(fet[0],y,.090),(fet[0]-.003,y,.024)],[.018,.030],'light',None,6))
            P(box('Hoof_'+pre+str(s),(fet[0]-.006,y,.016),(.048,.042,.034),'coatTop'))
    one=join('Horse',parts)
    bpy.ops.object.select_all(action='DESELECT'); one.select_set(True); bpy.context.view_layer.objects.active=one
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM'); bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    for o in [o for o in bpy.context.scene.objects if o is not one]: bpy.data.objects.remove(o)
    save('horse-mesh')

def stork():
    # La cigüeña blanca, de pie en el prado: la gallina de Vera estirada. Cuerpo
    # blanco con las remeras negras plegadas sobre la cola, cuello largo en S
    # suave, pico y patas rojos. Nodos de la gallina: `body`, `neck`, `head`,
    # `legL`/`footL`, para que ande y pique como ella.
    reset(); mat('white','EEEBE2'); mat('black','0B0A09'); mat('red','C4472F'); mat('shade','D4CFC2')
    body=empty('body',(0,0,.235),ROOT)
    ell('Body',(.010,0,.262),(.205,.108,.104),'white',body,8,4)
    for s,l in [(-1,'L'),(1,'R')]:
        # El ala plegada, como la de la gallina, y negra: las remeras cruzan sobre la cola.
        tube('Black_Wing_'+l,[(-.020,s*.047,.270),(.060,s*.052,.268),(.130,s*.040,.254),(.178,s*.022,.244)],[(.020,.008),(.036,.014),(.022,.010),(.004,.003)],'black',body,4)
    flat('White_Tail',[(.090,-.022,.288),(.150,-.010,.276),(.150,.010,.276),(.090,.022,.288)],'shade',body)
    neck=empty('neck',(-.075,0,.292),body)
    tube('Long_Neck',[(-.070,0,.290),(-.106,0,.334),(-.110,0,.382),(-.126,0,.418)],[.034,.026,.022,.020],'white',neck,5)
    head=empty('head',(-.130,0,.422),neck)
    ell('Head',(-.142,0,.430),(.052,.040,.040),'white',head,6,3)
    loft('Red_Bill',[(-.162,.428,.010,.012),(-.205,.416,.007,.008),(-.252,.402,.002,.002)],'red',head,4)
    for s in (-1,1): tetra('Eye_'+str(s),[(-.156,s*.0205,.446),(-.150,s*.0205,.434),(-.144,s*.0205,.446),(-.150,s*.017,.442)],'eye',head)
    for s,l in [(-1,'L'),(1,'R')]:
        hip=(.018,s*.030,.222); knee=(.034,s*.030,.118); ankle=(.018,s*.030,.012)
        p=empty('leg'+l,hip,body); tube('Leg_'+l,[hip,knee,ankle],[.0085,.0065,.0055],'red',p,4)
        f=empty('foot'+l,ankle,p); flat('Foot_'+l,[(ankle[0]+.012,s*.030,.003),(-.036,s*.030-.016,.003),(-.040,s*.030,.003),(-.036,s*.030+.016,.003)],'red',f)
    merge_parts(); save('stork')

def stork_nest():
    # El nido de la cigüeña, para una cumbrera o el campanario: una plataforma
    # ancha y baja de ramas de la madera del valle, con un rodete de ramas
    # encima y las puntas saliendo por el borde. La cigüeña se pone de pie
    # sobre la plataforma (`NEST_FLOOR`), no hundida en un cesto.
    reset(); mat('twig','4A3220'); mat('twigLight','6A4A2C')
    tube('Platform',[(0,0,0),(0,0,NEST_FLOOR)],[.150,.168],'twig',None,10)
    rim=[(.150*cos(i*2*pi/9+.1*sin(i*2.3)),.150*sin(i*2*pi/9+.1*sin(i*2.3)),NEST_FLOOR+.010+.005*sin(i*1.9)) for i in range(10)]; rim[-1]=rim[0]
    tube('Twig_Rim',rim,[(.026,.034)]*10,'twigLight',None,4)
    for i in range(10):
        a=i*2*pi/10+.2*sin(i*1.7); r0,r1=.080+.02*(i%3==0),.205+.025*((i*7)%3)
        z0,z1=NEST_FLOOR-.006+.012*(i%2),NEST_FLOOR+.004+.014*((i*5)%3)
        tube('Twig_'+str(i),[(r0*cos(a),r0*sin(a),z0),(r1*cos(a+.35),r1*sin(a+.35),z1)],[.0105,.0075],'twigLight' if i%2 else 'twig',None,3)
    merge_parts(); save('stork-nest')

NEST_FLOOR=.046  # donde pisa la cigüeña, en celdas

def chick():
    # El polluelo de la gallina, en el lenguaje de la gallina (`hen()`): un
    # cuerpo redondo y liso con la cabeza redonda hundida en el pecho, pico
    # naranja corto, dos ojos negros, dos patas naranjas abiertas y las alitas
    # pegadas a los costados. Vera: «el pollo sigue sin convencerme, muchos
    # vértices»: con esferas de cinco y seis husos salía lleno de picos y
    # aristas; aquí son de diez husos, como las de la gallina, y sin piezas
    # que sobresalgan. Pasa del presupuesto del encargo (80): es el precio de
    # que se lea redondo, una llamada de dibujo igual.
    reset(); mat('down','E3B32C'); mat('downShade','CFA024'); mat('beak','D2691E'); mat('eye','0E0D0C',.35)
    body=empty('body',(0,0,.052),ROOT)
    ell('Fluff',(.006,0,.066),(.084,.070,.068),'down',body,10,6)
    neck=empty('neck',(-.018,0,.082),body)
    head=empty('head',(-.026,0,.090),neck)
    ell('Head',(-.030,0,.097),(.052,.048,.050),'down',head,10,6)
    loft('Beak',[(-.054,.094,.008,.006),(-.068,.092,.001,.001)],'beak',head,4)
    for s,l in [(-1,'L'),(1,'R')]:
        ell('Eye_'+l,(-.046,s*.017,.104),(.008,.004,.009),'eye',head,6,4)
        ell('Wing_'+l,(.012,s*.031,.066),(.040,.012,.028),'downShade',body,6,4)
    for s,l in [(-1,'L'),(1,'R')]:
        # Abiertas, una adelante y otra atrás: de perfil se ven las dos.
        hip=(.004,s*.018,.040); ankle=(.000+s*.008,s*.021,.006)
        p=empty('leg'+l,hip,body); tube('Leg_'+l,[hip,ankle],[.0045,.004],'beak',p,5)
        f=empty('foot'+l,ankle,p)
        for j in (-1,0,1): tube('Toe_'+l+str(j),[ankle,(ankle[0]-.014,ankle[1]+j*.008,.002)],[.003,.0015],'beak',f,4)
    merge_parts(); save('chick')

def crane():
    # La grulla común en vuelo, para la uve de otoño: cuello y patas estirados,
    # alas largas y anchas, gris con las remeras negras y el cuello negro.
    # Cuerpo y alas en mallas aparte, como la golondrina (`bird.glb`): el ala
    # gira sobre su hombro. Se construye mirando a −X como los demás y al final
    # se gira para mirar a −Y de Blender (+Z del GLB).
    reset(); mat('grey','5A6064'); mat('greyDark','3C4144'); mat('black','0B0B0A'); mat('bill','B8AE86')
    parts=[]
    parts.append(loft('Body',[(-.070,0,.020,.022),(-.020,0,.044,.040),(.050,0,.046,.040),(.110,0,.030,.026),(.150,0,.010,.010)],'grey',None,6))
    parts.append(tube('Neck',[(-.060,0,.006),(-.150,0,.012),(-.215,0,.016)],[.016,.012,.019],'black',None,5))
    parts.append(loft('Bill',[(-.230,.016,.007,.006),(-.280,.012,.001,.001)],'bill',None,3))
    parts.append(leaf('Bustle',(.080,0,.030),(.170,0,.024),.060,.010,'black'))
    for s in (-1,1):
        parts.append(tube('Trailing_Leg_'+str(s),[(.110,s*.010,-.012),(.270,s*.012,-.008)],[.0055,.0035],'black',None,3))
    body=join('bird_body',parts)
    wings=[]
    for s,name in [(1,'bird_wing_l'),(-1,'bird_wing_r')]:
        # La envergadura de la grulla, 2,2 m: 0,73 celdas de punta a punta.
        y=lambda v: s*v
        # Las cobertoras grises delante; detrás, el borde negro de las remeras,
        # que en la grulla es negro de la punta a la raíz, y los «dedos» de la punta.
        w=flat('Wing',[(-.042,y(.030),.012),(-.036,y(.150),.016),(-.014,y(.250),.014),(.026,y(.312),.010),(.052,y(.250),.012),(.048,y(.150),.013),(.040,y(.032),.012)],'grey')
        b=flat('Flight_Feathers',[(.040,y(.032),.0115),(.048,y(.150),.0125),(.052,y(.250),.0115),(.094,y(.290),.010),(.108,y(.150),.012),(.090,y(.032),.012)],'black')
        t=flat('Primaries',[(.026,y(.312),.0105),(.004,y(.368),.010),(.040,y(.374),.010),(.070,y(.352),.010),(.094,y(.290),.0105),(.052,y(.250),.011)],'black')
        k=join(name,[w,b,t]); wings.append((k,(-.020,y(.030),.012)))
    turn_to_minus_y([body]+[k for k,_ in wings])
    for k,(x,yy,z) in wings: reorigin(k,(-yy,x,z))
    save('crane')

def butterfly():
    # Una mariposa con los colores que Vera eligió de la de Astra —ocre con el
    # borde terracota y el cuerpo oscuro— y forma de mariposa: dos pares de
    # alas redondeadas, las de delante mayores, el cuerpo fino entre ellas y
    # dos antenas. Dieciséis triángulos de una cara (el material es de dos).
    reset(); mat('wing','B87418'); mat('edge','8A2E14'); mat('mark','120F0C')
    body=flat('Body',[(0,-.017,.003),(.0022,-.002,.003),(0,.014,.003),(-.0022,-.002,.003)],'mark')
    ant=[flat('Antenna_'+str(s),[(s*.0008,-.016,.003),(s*.010,-.030,.004),(s*.0020,-.015,.003)],'mark') for s in (-1,1)]
    join('body',[body]+ant)
    for s,name in [(1,'wing_l'),(-1,'wing_r')]:
        x=lambda v: -s*v
        fore=flat('Forewing',[(x(.002),-.010,.0015),(x(.013),-.020,.002),(x(.027),-.016,.002),(x(.030),-.004,.002),(x(.003),.000,.0015)],'wing')
        hind=flat('Hindwing',[(x(.003),.001,.0014),(x(.022),.000,.0018),(x(.025),.012,.0018),(x(.015),.020,.0018),(x(.004),.012,.0014)],'edge')
        k=join(name,[fore,hind]); reorigin(k,(x(.002),-.002,.001))
    save('butterfly')

# `-- bear` construye sólo esos; sin nombres, todos (el oso, en su v4).
ONLY=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
BUILDS=[('wolf',lambda: canine('wolf')),('dog',lambda: canine('dog')),('boar',boar),('bear',bear),('bear_v3',bear_v3),('mule',mule),
        ('partridge',partridge),('fish',fish),('pig',pig),('cow',cow),('hen',hen),('crow',crow),('duck',duck),('deer',deer),('bucket',bucket),('arrow',arrow),('shield',shield),('pickaxe',pickaxe),('hoe',hoe),
        ('horse-mesh',horse),('stork',stork),('stork-nest',stork_nest),('chick',chick),('crane',crane),('butterfly',butterfly)]
for name,build in BUILDS:
    if (not ONLY and name!='bear_v3') or name in ONLY: build()
