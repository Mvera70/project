"""Gran roble icónico; fuente original en celdas, 1 celda = 3 metros."""
import bpy, math, json, numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'artifacts/graphics/astra/great-oak';OUT.mkdir(parents=True,exist_ok=True)
P=json.loads((ROOT/'art/recipes/palette.json').read_text())
colors={'bark':P['valley']['trunk'],'bark_dark':P['houses']['tiled']['timberDark'],'foliage_shadow':P['valley']['forestGreen'],'foliage':P['valley']['foliage'],'foliage_light':P['valley']['foliageLight']}
bpy.ops.wm.read_factory_settings(use_empty=True)
mats={};parts={}
for name,color in colors.items():
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)];rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new('great_oak_'+name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*rgb,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1
    mats[name]=m
def tube(name,points,radii,sides=7):
    # Anillos orientados según la tangente: permiten troncos curvos con conicidad continua.
    verts=[];faces=[]
    initial=(Vector(points[1])-Vector(points[0])).normalized()
    reference=Vector((0,1,0)) if abs(initial.y)<.9 else Vector((1,0,0))
    for k,(point,radius) in enumerate(zip(points,radii)):
        tangent=Vector(points[min(k+1,len(points)-1)])-Vector(points[max(0,k-1)])
        tangent.normalize();u=(reference-tangent*reference.dot(tangent)).normalized();vaxis=tangent.cross(u).normalized()
        for i in range(sides):
            a=2*math.pi*i/sides+.055*k;v=(u*math.cos(a)+vaxis*math.sin(a))*radius+Vector(point)
            v.z=max(0,v.z);verts.append(v)
    faces.append(tuple(reversed(range(sides))))
    for k in range(len(points)-1):
        for i in range(sides):faces.append((k*sides+i,k*sides+(i+1)%sides,(k+1)*sides+(i+1)%sides,(k+1)*sides+i))
    faces.append(tuple(range((len(points)-1)*sides,len(points)*sides)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    o.data.materials.append(mats['bark']);o.data.materials.append(mats['bark_dark'])
    for p in mesh.polygons:p.material_index=1 if p.index%sides in (1,5) else 0
    parts.setdefault(name,[]).append(o)
tube('great_oak_trunk',[(0,0,0),(.025,.015,.35),(-.04,.025,.9),(.06,0,1.35),(.02,.035,1.83),(.17,.02,2.3)],[.43,.32,.265,.26,.18,.07],9)
for i in range(7):
    a=2*math.pi*i/7+.15;dx,dy=math.cos(a),math.sin(a)
    tube('great_oak_roots',[(dx*.12,dy*.12,.24),(dx*.43,dy*.43,.12),(dx*.79,dy*.79,.025),(dx*.99,dy*.99,0)],[.22,.16,.065,.007],6)
# Ramas bajas anchas que vuelven a subir, como los brazos del emblema.
for i in range(7):
    a=2*math.pi*i/7+.2;dx,dy=math.cos(a),math.sin(a);reach=1.35+.13*math.sin(i*3)
    points=[(.01,0,1.03+.09*(i%3)),(dx*.48,dy*.48,1.50),(dx*.98,dy*.98,1.70),(dx*reach,dy*reach,2.10),(dx*(reach+.10),dy*(reach+.10),2.42)]
    tube('great_oak_branches',points,[.205,.16,.105,.065,.015],7)
    b=a+(.48 if i%2 else -.44);bx,by=math.cos(b),math.sin(b)
    tube('great_oak_twigs',[points[2],(bx*1.23,by*1.23,2.01),(bx*1.51,by*1.51,2.34)],[.085,.047,.008],5)
for i in range(3):
    a=2*math.pi*i/3+.5
    tube('great_oak_branches',[(.02,0,1.65),(math.cos(a)*.44,math.sin(a)*.44,2.25),(math.cos(a)*.66,math.sin(a)*.66,2.81)],[.17,.11,.025],7)
def clump(index,pos,size,mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=pos);o=bpy.context.object
    # Perturbación determinista de vértices para evitar una ristra de esferas iguales.
    for v in o.data.vertices:
        f=1+.075*math.sin(v.index*4.7+index*1.9);v.co.x*=size[0]*f;v.co.y*=size[1]*f;v.co.z*=size[2]*(1+.045*math.cos(v.index*3+index))
    o.rotation_euler.z=index*.73;o.data.materials.append(mats[mat]);parts.setdefault('great_oak_canopy_'+mat.removeprefix('foliage').strip('_'),[]).append(o)
# Revisión del emblema: grupos terminales separados y tres pisos con vacíos reales.
# No hay cogollo central inferior que tape la bifurcación del tronco.
lower=[(-1.36,-.53),(-1.30,.59),(1.36,-.52),(1.28,.61),(-.72,-1.20),(.72,-1.20),(-.74,1.20),(.73,1.20)]
for i,(x,y) in enumerate(lower):
    clump(i,(x,y,2.23+.025*(i%2)),(.55,.51,.24),'foliage_shadow' if i in (1,6) else 'foliage')
for i,(x,y) in enumerate([(-.77,-.39),(.77,-.39),(-.72,.46),(.72,.46)]):
    clump(i+8,(x,y,2.83+.025*(i%2)),(.48,.47,.25),'foliage_light' if i%2 else 'foliage')
clump(12,(.04,0,3.23),(.36,.38,.24),'foliage_light')
# El remate central y los dos pares altos necesitan ramillas que atraviesen los huecos.
tube('great_oak_twigs',[(.10,.02,2.18),(.06,.02,2.73),(.04,0,3.24)],[.09,.065,.016],6)
for x,y in [(-.77,-.39),(.77,-.39),(-.72,.46),(.72,.46)]:
    tube('great_oak_twigs',[(.03,.02,2.10),(x*.6,y*.6,2.53),(x,y,2.86)],[.09,.055,.012],5)
objects=[]
for name,items in parts.items():
    if name=='great_oak_canopy_':name='great_oak_canopy_mid'
    bpy.ops.object.select_all(action='DESELECT')
    for o in items:o.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    o=items[0];o.name=name;o.data.name=name;bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);objects.append(o)
def bounds(obs):
    vs=[o.matrix_world@Vector(v) for o in obs for v in o.bound_box]
    return [[min(v[i] for v in vs) for i in range(3)],[max(v[i] for v in vs) for i in range(3)]]
bpy.context.view_layer.update();lo,hi=bounds(objects)
# Altura exacta de integración: 3,4 celdas con identidad de escala.
for o in objects:
    for v in o.data.vertices:v.co.z*=3.4/hi[2]
bpy.context.view_layer.update();lo,hi=bounds(objects)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'great-oak.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
metrics={'id':'great-oak','triangles':triangles,'triangleLimit':3500,'boundsRuntimeCells':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]},'materials':colors,'pivotsRuntimeCells':{o.name:[0,0,0] for o in objects},'meshNames':[o.name for o in objects],'textures':0}
(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2))
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/'great-oak.glb'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.context.view_layer.update()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=720;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('ReviewWorld');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.59,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
scene.view_settings.view_transform='Standard'
bpy.ops.object.light_add(type='AREA',location=(-4,-6,10));bpy.context.object.data.energy=1500;bpy.context.object.data.size=7
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.008));ground=bpy.context.object
m=bpy.data.materials.new('ReviewGround');m.diffuse_color=(.64,.68,.54,1);ground.data.materials.append(m)
images=[]
for idx,(title,direction) in enumerate([('three-quarter',(1,-1.5,1.15)),('front',(0,-1,.015)),('side',(1,0,.015)),('scale',(0,-1.5,.8))]):
    current=objects[:]
    if idx==3:
        for file,offset in [('house',3.0),('villager',2.1)]:
            before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d'/(file+'.glb')))
            imported=list(set(bpy.context.scene.objects)-before);bpy.context.view_layer.update();frozen=[];deps=bpy.context.evaluated_depsgraph_get()
            for original in imported:
                if original.type=='MESH' and original.visible_get():
                    mesh=bpy.data.meshes.new_from_object(original.evaluated_get(deps));copy=bpy.data.objects.new('Reference_'+file,mesh);bpy.context.collection.objects.link(copy);copy.matrix_world=original.matrix_world.copy();frozen.append(copy)
            for original in imported:bpy.data.objects.remove(original,do_unlink=True)
            for o in frozen:o.location.x+=offset
            current+=frozen
    bpy.context.view_layer.update();a,b=bounds(current);center=Vector([(a[i]+b[i])/2 for i in range(3)]);span=max(b[i]-a[i] for i in range(3))
    camera.location=center+Vector(direction)*max(10,span*2);camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=span*(1.38 if idx==0 else 1.2)
    scene.render.filepath=str(OUT/(title+'.png'));bpy.ops.render.render(write_still=True)
    img=bpy.data.images.load(scene.render.filepath,check_existing=False);pixels=np.empty(720*640*4,dtype=np.float32);img.pixels.foreach_get(pixels);images.append(pixels.reshape((640,720,4)));bpy.data.images.remove(img)
sheet=np.concatenate([np.concatenate(images[2:4],axis=1),np.concatenate(images[0:2],axis=1)],axis=0)
img=bpy.data.images.new('Sheet',width=1440,height=1280);img.pixels.foreach_set(sheet.flatten());img.filepath_raw=str(OUT/'sheet.png');img.file_format='PNG';img.save()
print('GREAT_OAK_COMPLETE',json.dumps(metrics),flush=True)
