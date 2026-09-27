"""Construye cinco candidatos y reimporta sus GLB para revisión; no publica.
blender --background --python art/recipes/house-variant-candidate/build-candidates.py
"""
import bpy
import json
import math
import mathutils
import ast
import sys
import numpy as np
from pathlib import Path

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
source=ast.parse((ROOT/'tools/art/blender-build.py').read_text(encoding='utf8'))
for d in source.body:
    if isinstance(d,ast.FunctionDef) and d.name in ['hex_rgba','make_material','create_primitive','point_at']:
        exec(compile(ast.Module(body=[d],type_ignores=[]),'<tools/art geometry>','exec'))
IDS=['house-twin-gable','house-hip-roof','stone-house-cross-gable','stone-house-tower-loft','stone-house']

def bounds(objects):
    deps=bpy.context.evaluated_depsgraph_get()
    p=[o.matrix_world@mathutils.Vector(v) for o in objects if o.type=='MESH' for v in o.evaluated_get(deps).bound_box]
    return [min(v[i] for v in p) for i in range(3)],[max(v[i] for v in p) for i in range(3)]

def clean_buried(parts):
    # Sólo se eliminan polígonos enteros dentro de sólidos convexos; puerta y
    # huecos oscuros se excluyen para conservar su estado cuando abre la hoja.
    hulls=[]
    for obj in parts:
        if obj.data.materials[0].name in ['door','window']:continue
        points=[obj.matrix_world@v.co for v in obj.data.vertices]
        center=sum(points,mathutils.Vector())/len(points)
        planes=[]
        for poly in obj.data.polygons:
            n=(obj.matrix_world.to_3x3()@poly.normal).normalized();point=obj.matrix_world@poly.center
            if n.dot(point-center)<0:n=-n
            planes.append((n,n.dot(point)))
        hulls.append((obj,planes))
    for obj in parts:
        if obj.data.materials[0].name in ['door','window']:continue
        keep=[]
        for poly in obj.data.polygons:
            points=[obj.matrix_world@obj.data.vertices[i].co for i in poly.vertices]
            covered=any(other!=obj and all(all(n.dot(p)<d-1e-6 for n,d in planes) for p in points) for other,planes in hulls)
            if not covered:keep.append(list(poly.vertices))
        if len(keep)!=len(obj.data.polygons):
            vertices=[tuple(v.co) for v in obj.data.vertices];material=obj.data.materials[0]
            mesh=bpy.data.meshes.new(obj.name+'_visible');mesh.from_pydata(vertices,[],keep);mesh.materials.append(material);mesh.update();obj.data=mesh

def masonry(spec,raw,material):
    # Cada piedra es una placa de seis triángulos: frente facetado y biseles
    # superior/inferior. Las juntas laterales dejan visible el núcleo del muro.
    x,y,z=raw['location'];w,d,h=raw['dimensions'];verts=[];faces=[]
    for axis,side,width in [('x',-1,w),('x',1,w),('y',-1,d),('y',1,d)]:
        for row in range(spec['rows']):
            # Alternar las longitudes conserva continuidad sin cuadricular el muro.
            columns=spec['columns'];cuts=[-width/2]+[-width/2+width*(i+(.18 if row%2 else -.08))/columns for i in range(1,columns)]+[width/2]
            for col in range(columns):
                a=cuts[col]+spec['joint']/2;b=cuts[col+1]-spec['joint']/2
                low=-h/2+h*row/spec['rows']+spec['joint']/2;high=-h/2+h*(row+1)/spec['rows']-spec['joint']/2
                raised=spec['relief']*(.75+.25*((row*5+col*3)%4)/3)
                # Winding normal se corrige luego por orientación de cara.
                def point(u,v,depth):
                    return (x+u,y+side*(d/2+depth),z+v) if axis=='x' else (x+side*(w/2+depth),y+u,z+v)
                at=len(verts);bevel=min(.055,(high-low)*.16)
                verts.extend([point(a,low,0),point(b,low,0),point(a,low+bevel,raised),point(b,low+bevel,raised),point(a,high-bevel,raised*.85),point(b,high-bevel,raised*.85),point(a,high,0),point(b,high,0)])
                fs=[[0,1,3,2],[2,3,5,4],[4,5,7,6]]
                if (axis=='x' and side==1) or (axis=='y' and side==-1):fs=[f[::-1] for f in fs]
                faces.extend([[at+i for i in f] for f in fs])
    mesh=bpy.data.meshes.new(raw['name']+'_Masonry');mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
    obj=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(obj);return obj

def reference(id,position):
    before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d'/(id+'.glb')))
    added=list(set(bpy.context.scene.objects)-before);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();copies=[]
    for obj in added:
        if obj.type=='MESH' and obj.visible_get():
            mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(deps));copy=bpy.data.objects.new('Reference_'+id,mesh);bpy.context.collection.objects.link(copy);copy.matrix_world=obj.matrix_world.copy();copies.append(copy)
    for obj in added:bpy.data.objects.remove(obj,do_unlink=True)
    bpy.context.view_layer.update();a,b=bounds(copies);delta=mathutils.Vector((position[0]-a[0],position[1]-(a[1]+b[1])/2,-a[2]))
    for obj in copies:obj.location+=delta
    return copies

def build(id):
    r=json.loads((HERE/(id+'.json')).read_text());cfg=r['candidateBuild']
    palette=json.loads((HERE/r['palette']).read_text());colors={**palette['valley'],**palette['houses'][r['house']]}
    bpy.ops.wm.read_factory_settings(use_empty=True)
    materials={m['name']:make_material(dict(m,color=colors[m['role']])) for m in r['materials']}
    parts=[]
    for raw in r['primitives']:
        spec={'rotationDegrees':[0,0,0],'bevel':0,'smooth':False,**raw};obj=create_primitive(spec,materials)
        if spec['type']=='cube':obj.rotation_euler=[math.radians(v) for v in spec['rotationDegrees']]
        parts.append(obj)
    bpy.context.view_layer.update();before=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in parts)
    clean_buried(parts)
    for spec in cfg['masonry']:
        raw=next(p for p in r['primitives'] if p['name']==spec['primitive']);parts.append(masonry(spec,raw,materials['stone']))
    for name in materials:
        group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0].name==name]
        bpy.ops.object.select_all(action='DESELECT')
        for o in group:o.select_set(True)
        bpy.context.view_layer.objects.active=group[0]
        if len(group)>1:bpy.ops.object.join()
        obj=group[0];obj.name=id+'_'+name;obj.data.name=obj.name
        if name=='door':bpy.context.scene.cursor.location=cfg['doorPivot'];bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in objects:o.location*=r['scale'];o.scale*=r['scale']
    bpy.context.view_layer.update();a,b=bounds(objects)
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
    print('CANDIDATE_GEOMETRY',id,triangles,'LIMIT',cfg['triangleLimit'],flush=True)
    assert triangles<=cfg['triangleLimit'],(id,triangles)
    assert b[0]-a[0]<=2.00001 and b[1]-a[1]<=2.00001
    out=ROOT/'artifacts/graphics/astra'/id;out.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(out/(id+'.glb')),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
    metrics=dict(id=id,triangles=triangles,triangleLimit=cfg['triangleLimit'],recipePrimitiveTriangles=before,dimensionsMetres=[(b[i]-a[i])*3 for i in [0,2,1]],boundsBlenderCells=dict(min=a,max=b),doorPivotMetres=cfg['doorPivot'],materials={m['name']:colors[m['role']] for m in r['materials']})
    (out/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(out/(id+'.glb')))
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.context.view_layer.update();a,b=bounds(objects)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
    scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('ReviewWorld');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.59,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7;scene.view_settings.view_transform='Standard'
    bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=750;bpy.context.object.data.size=5
    bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
    bpy.ops.mesh.primitive_plane_add(size=100,location=(0,0,-.006));ground=bpy.context.object
    mat=bpy.data.materials.new('ReviewGround');mat.diffuse_color=(.64,.68,.54,1);ground.data.materials.append(mat)
    center=mathutils.Vector([(a[i]+b[i])/2 for i in range(3)]);span=max(b[i]-a[i] for i in range(3));images=[]
    for idx,(name,direction) in enumerate([('three-quarter',(1,-1.5,1.1)),('front',(0,-1,.05)),('opposite',(-1,-1.5,1.1)),('scale',(1,-1.5,1.1))]):
        if idx==3:
            objects+=reference('villager',(2.35,1));objects+=reference('house',(3.2,1));objects+=reference('stone-house',(5.5,1))
            bpy.context.view_layer.update();a,b=bounds(objects);center=mathutils.Vector([(a[i]+b[i])/2 for i in range(3)]);span=max(b[i]-a[i] for i in range(3))
        cam.location=center+mathutils.Vector(direction)*15;cam.data.ortho_scale=span*1.55;point_at(cam,center)
        scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
        img=bpy.data.images.load(scene.render.filepath,check_existing=False);arr=np.empty(640*640*4,dtype=np.float32);img.pixels.foreach_get(arr);images.append(arr.reshape(640,640,4));bpy.data.images.remove(img)
    sheet=np.concatenate([np.concatenate(images[2:],axis=1),np.concatenate(images[:2],axis=1)],axis=0)
    img=bpy.data.images.new('Sheet',width=1280,height=1280);img.pixels.foreach_set(sheet.flatten());img.filepath_raw=str(out/'sheet.png');img.file_format='PNG';img.save()
    dims=metrics['dimensionsMetres']
    (out/'README.md').write_text(f'''# {id} · candidato de vivienda

27 sep 2026. {triangles} triángulos / {cfg['triangleLimit']}; {len(materials)} materiales, sin texturas, facetas planas.

- Caja X × alto × fondo: {dims[0]:.3f} × {dims[1]:.3f} × {dims[2]:.3f} m. Parcela 6×6 m = 2×2 celdas, mismo origen y orientación que el publicado.
- Puerta `{id}_door`, pivote de bisagra en {cfg['doorPivot']} m (Blender). Las tres ventanas originales, carpinterías y piezas de puerta conservan sus medidas y posiciones.
- Paleta: {', '.join(k+' '+v for k,v in metrics['materials'].items())}.
- En los modelos de piedra, la mampostería usa juntas retranqueadas, hiladas alternadas y biseles de 2,5–3,5 cm; conserva el material stone. Se eliminan sólo caras enteras estrictamente enterradas en otro sólido. Puerta y huecos oscuros excluidos de esa simplificación.
- `sheet.png`: tres cuartos y frente arriba, frente opuesto abajo izquierda, comparación sin reescalar con aldeano, house y stone-house publicados abajo derecha (candidato a la izquierda).
- Fuente única de diseño: `art/recipes/house-variant-candidate/design.mjs`; receta generada `{id}.json`. Ejecutar `node art/recipes/house-variant-candidate/design.mjs` y Blender con `--background --python art/recipes/house-variant-candidate/build-candidates.py`.

Sin preguntas pendientes. Evidencia de GLB y renders de revisión; integración, emisión nocturna y estaciones quedan para la sesión principal. No se ha publicado ni ejecutado tests.
''',encoding='utf8')
    print('CANDIDATE_COMPLETE',id,triangles,flush=True)

for id in (sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else IDS):build(id)
