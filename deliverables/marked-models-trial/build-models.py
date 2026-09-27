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
        tube('Curved_Tusk_'+str(s),[(-.335,s*.042,.152),(-.357,s*.062,.166),(-.368,s*.064,.187),(-.368,s*.060,.214),(-.359,s*.052,.232)],[.013,.013,.011,.007,.0008],'ivory',head,8)
        for i in range(5): leaf('Coat_Ridge_'+str(s)+'_'+str(i),(-.13+i*.052,s*.029,.383-i*.009),(-.107+i*.052,s*.034,.416-i*.012),.019,.009,'coatTop',body)
    for pre,x in [('fore',-.124),('hind',.169)]:
        for s,l in [(-1,'L'),(1,'R')]:
            y=s*.072; hip=(x,y,.272); knee=(x+(.004 if pre=='fore' else -.035),y,.131); ankle=(x+(-.013 if pre=='fore' else .019),y,.038); toe=(ankle[0]-.013,y,.019)
            p,q,f=limb(pre+l,hip,knee,ankle,toe,.036,'coat',body)
            box(pre+l+'_Cloven_Seam',(toe[0]-.023,y,.017),(.010,.004,.025),'coatTop',f)
    tail=empty('tail',(.218,0,.287),body); tube('Tail',[(.218,0,.287),(.256,0,.261),(.27,0,.197),(.276,0,.170)],[.009,.008,.006,.004],'coatTop',tail,7)
    leaf('Tail_Tuft',(.271,0,.20),(.283,0,.152),.018,.012,'coatTop',tail)
    save('boar')

def bear():
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
    for pre,x in [('fore',-.146),('hind',.16)]:
        for s,l in [(-1,'L'),(1,'R')]:
            y=s*.055; hip=(x,y,.375); knee=(x+(.004 if pre=='fore' else -.037),y,.200); ankle=(x+(.003 if pre=='fore' else .028),y,.044); toe=(ankle[0]-.011,y,.021)
            p,q,f=limb(pre+l,hip,knee,ankle,toe,.030,'coat',body)
            ell(pre+l+'_Knee',knee,(.034,.034,.038),'coatTop',q,8,5)
            tube(pre+l+'_Pale_Shin',[(ankle[0],y,.048),(ankle[0]+.001,y,.14)],[.013,.012],'light',q,8)
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

for id in ['wolf','dog']:
    canine(id)
boar(); bear(); mule(); partridge(); bucket(); arrow(); shield(); pickaxe(); hoe()
