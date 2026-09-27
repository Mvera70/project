"""Casa quemada articulada; ejecutar en Blender --background --python este fichero."""
import bpy, json, math, numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'artifacts/graphics/astra/burnt-house'
OUT.mkdir(parents=True,exist_ok=True)
palette=json.loads((ROOT/'art/recipes/palette.json').read_text())
colors={'char':palette['houses']['tiled']['timberDark'],'soot':palette['valley']['clericalBlack'],'ash':palette['valley']['elderGrey'],'stone':palette['valley']['stone'],'wood':palette['houses']['tiled']['timber']}
bpy.ops.wm.read_factory_settings(use_empty=True)
materials={}
for name,color in colors.items():
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*rgb,1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1
    materials[name]=m
parts={}; current=None
def cube(pos,size,mat='char'):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(materials[mat]);parts[current].append(o);return o
def beam(a,b,width=.18,mat='char'):
    a,b=Vector(a),Vector(b);o=cube((a+b)/2,(width,width,(b-a).length),mat)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def prism(points,thickness,mat):
    # Polígono extruido verticalmente; normales exteriores y caras planas.
    n=len(points);verts=points+[(x,y,z-thickness) for x,y,z in points]
    faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new('Fragment');mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new('Fragment',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(materials[mat]);parts[current].append(o)
def group(name):
    global current
    current='burnt_house_'+name;parts[current]=[]
group('base');cube((3,3,.035),(6,6,.07),'char')
for y in (.55,5.45):cube((3,y,.16),(5.15,.30,.23),'stone')
for x in (.55,5.45):cube((x,3,.16),(.30,5.15,.23),'stone')
for x,y in [(1.2,1.5),(3.7,2.8),(2.2,4.2)]:cube((x,y,.08),(.8,.55,.025),'ash')
for side,y in [('front',.53),('back',5.47)]:
    group('wall_'+side)
    for x in (.55,2.35,3.65,5.45):cube((x,y,1.35),(.21,.23,2.3),'soot')
    cube((3,y,2.40),(5.1,.22,.22))
    for i,x in enumerate([.95,1.53,2.04,3.99,4.55,5.08]):
        h=[1.95,1.55,2.03,1.71,1.15,1.98][i]
        plank=cube((x,y,h/2+.24),(.46,.13,h),'char' if i%2 else 'wood')
        for v in plank.data.vertices:
            if v.co.z>0:v.co.z-=.17 if v.co.x>0 else .035
    # Testero roto: la cumbrera queda sostenida por dos tornapuntas.
    beam((.55,y,2.38),(3,y,4.28),.19);beam((3,y,4.28),(5.45,y,2.38),.19)
    beam((3,y,2.42),(3,y,4.28),.16,'soot')
    if side=='front':
        cube((3,y,1.95),(1.22,.25,.22),'soot')
        beam((.65,y-.04,.42),(2.16,y-.04,1.86),.12,'ash')
    else:cube((3,y,1.23),(1.10,.14,1.94),'char')
for side,x in [('left',.53),('right',5.47)]:
    group('wall_'+side)
    cube((x,3,2.4),(.23,5.1,.22))
    for y in (1.9,4.1):cube((x,y,1.30),(.23,.22,2.18),'soot')
    for i,y in enumerate([.98,1.53,2.11,3.88,4.46,5.02]):
        h=[1.8,1.4,1.95,1.6,2,1.73][i]
        plank=cube((x,y,h/2+.24),(.13,.46,h),'wood' if i%3==0 else 'char')
        for v in plank.data.vertices:
            if v.co.z>0:v.co.z-=.20 if v.co.y>0 else .04
    cube((x,3,.57),(.14,1.2,.65),'char')
    beam((x,.65,.3),(x,2.22,2.3),.13,'ash')
for side,edge in [('left',0),('right',6)]:
    group('roof_'+side)
    def roofz(x):return 4.4-abs(x-3)*.65
    for y in (.12,1.65,3.35,5.88):beam((edge,y,2.45),(3,y,4.4),.16,'soot')
    # Tres paños con borde abrasado irregular; grandes huecos entre ellos.
    for i,(ya,yb,reach) in enumerate([(0,1.3,.93),(2.05,3.15,.65),(4.35,6,.86)]):
        outer=3+(edge-3)*reach
        inset=outer+(.30 if edge==0 else -.30)
        pts=[(3,ya,4.4),(outer,ya+.09,roofz(outer)),(inset,yb-.22,roofz(inset)),(outer,yb,roofz(outer)),(3,yb,4.4)]
        if edge==6:pts.reverse()
        prism(pts,.12,'char' if i!=1 else 'ash')
    beam((3,0,4.4),(3,6,4.4),.12,'char')
group('chimney')
cube((4.48,4.74,1.57),(.70,.72,2.95),'stone')
cube((4.48,4.74,3.68),(.54,.58,1.28),'ash')
cube((4.48,4.74,4.34),(.68,.72,.16),'stone')
cube((4.48,4.74,4.43),(.43,.47,.03),'soot')
pivots={'base':(3,3,0),'wall_front':(3,.53,.23),'wall_back':(3,5.47,.23),'wall_left':(.53,3,.23),'wall_right':(5.47,3,.23),'roof_left':(3,3,4.4),'roof_right':(3,3,4.4),'chimney':(4.48,4.74,.20)}
objects=[]
for name,items in parts.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in items:o.select_set(True)
    bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();o=items[0];o.name=name;o.data.name=name
    bpy.context.scene.cursor.location=pivots[name.removeprefix('burnt_house_')];bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    # La geometría y el pivote viajan en celdas con escala identidad.
    for v in o.data.vertices:v.co/=3
    o.location/=3;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    for v in o.data.vertices:
        for axis in (0,1):v.co[axis]=min(2,max(0,v.co[axis]+o.location[axis]))-o.location[axis]
    objects.append(o)
bpy.context.view_layer.update()
def bounds(obs):
    vs=[o.matrix_world@Vector(v) for o in obs for v in o.bound_box]
    return [[min(v[i] for v in vs) for i in range(3)],[max(v[i] for v in vs) for i in range(3)]]
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
assert triangles<=1200,triangles
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'burnt-house.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
lo,hi=bounds(objects)
metrics={'id':'burnt-house','triangles':triangles,'triangleLimit':1200,'boundsRuntimeCells':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]},'materials':colors,'pivotsRuntimeCells':{k:[x/3,z/3,-y/3] for k,(x,y,z) in pivots.items()},'meshNames':[o.name for o in objects],'textures':0}
(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2))
# Toda captura vuelve a cargar el GLB exportado.
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/'burnt-house.glb'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.context.view_layer.update()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=720;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('ReviewWorld');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.59,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
scene.view_settings.view_transform='Standard'
bpy.ops.object.light_add(type='AREA',location=(-4,-6,10));bpy.context.object.data.energy=1500;bpy.context.object.data.size=7
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.008));ground=bpy.context.object
groundmat=bpy.data.materials.new('ReviewGround');groundmat.diffuse_color=(.64,.68,.54,1);ground.data.materials.append(groundmat)
images=[]
for idx,(title,direction) in enumerate([('three-quarter',(1,-1.5,1.15)),('front',(0,-1,.015)),('side',(1,0,.015)),('scale',(0,-1.5,1.1))]):
    currentobjects=objects[:]
    if idx==3:
        for file,offset in [('house',-2.6),('ruin-wood',2.6),('villager',2.1)]:
            before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d'/(file+'.glb')))
            imported=list(set(bpy.context.scene.objects)-before);bpy.context.view_layer.update();frozen=[];deps=bpy.context.evaluated_depsgraph_get()
            for original in imported:
                if original.type=='MESH' and original.visible_get():
                    mesh=bpy.data.meshes.new_from_object(original.evaluated_get(deps));copy=bpy.data.objects.new('Reference_'+file,mesh);bpy.context.collection.objects.link(copy);copy.matrix_world=original.matrix_world.copy();frozen.append(copy)
            for original in imported:bpy.data.objects.remove(original,do_unlink=True)
            for o in frozen:o.location.x+=offset
            currentobjects+=frozen
    bpy.context.view_layer.update();a,b=bounds(currentobjects);center=Vector([(a[i]+b[i])/2 for i in range(3)]);span=max(b[i]-a[i] for i in range(3))
    camera.location=center+Vector(direction)*max(10,span*2);camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=span*(1.68 if idx==0 else 1.28 if idx!=3 else 1.12)
    scene.render.filepath=str(OUT/(title+'.png'));bpy.ops.render.render(write_still=True)
    img=bpy.data.images.load(scene.render.filepath,check_existing=False);pixels=np.empty(720*640*4,dtype=np.float32);img.pixels.foreach_get(pixels);images.append(pixels.reshape((640,720,4)));bpy.data.images.remove(img)
sheet=np.concatenate([np.concatenate(images[2:4],axis=1),np.concatenate(images[0:2],axis=1)],axis=0)
img=bpy.data.images.new('Sheet',width=1440,height=1280);img.pixels.foreach_set(sheet.flatten());img.filepath_raw=str(OUT/'sheet.png');img.file_format='PNG';img.save()
print('BURNT_HOUSE_COMPLETE',json.dumps(metrics),flush=True)
