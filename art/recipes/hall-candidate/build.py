"""Adaptador candidato: primitivas tools/art, Blender 5, bisagra y hojas de revisión.
blender --background --python art/recipes/hall-candidate/build.py -- [id ...]
No escribe catálogo ni public/. Las extensiones candidateBuild viven en cada receta.
"""
import bpy
import json
import math
import mathutils
import sys
import ast
import numpy as np
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
# Reutilizar geometría del camino tools/art sin ejecutar su corredor/publicador.
source=ast.parse((ROOT/'tools/art/blender-build.py').read_text(encoding='utf8'))
for definition in source.body:
    if isinstance(definition,ast.FunctionDef) and definition.name in ['hex_rgba','make_material','create_primitive','point_at']:
        exec(compile(ast.Module(body=[definition],type_ignores=[]),'<tools/art primitives>','exec'))

def bounds(objects):
    deps=bpy.context.evaluated_depsgraph_get()
    coords=[o.matrix_world @ mathutils.Vector(v) for o in objects if o.type=='MESH' for v in o.evaluated_get(deps).bound_box]
    return [min(v[i] for v in coords) for i in range(3)],[max(v[i] for v in coords) for i in range(3)]

def build(id):
    recipe_path=ROOT/'art/recipes'/f'{id}-candidate'/f'{id}.json'
    r=json.loads(recipe_path.read_text()); cfg=r['candidateBuild']
    palette=json.loads((recipe_path.parent/r['palette']).read_text())
    colors={**palette['valley'],**palette['houses'][r['house']]}
    bpy.ops.wm.read_factory_settings(use_empty=True)
    materials={m['name']:make_material(dict(m,color=colors[m['role']])) for m in r['materials']}
    parts=[]
    for raw in r['primitives']:
        spec={'rotationDegrees':[0,0,0],'smooth':False,'bevel':0,**raw}
        obj=create_primitive(spec,materials)
        if spec.get('flattenBottom') and spec['type']=='sphere':
            # El saco apoya en una base ancha, no en el polo de la esfera.
            bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
            floor=-spec['dimensions'][2]*0.4
            for vertex in obj.data.vertices:
                vertex.co.z=max(floor,vertex.co.z)
        if spec['type']=='cube':
            obj.rotation_euler=[math.radians(v) for v in spec['rotationDegrees']]
            bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
            if id.startswith('quarry-face') and 'Block' in spec['name'] and spec['name']!='Cut_Block':
                k=int(spec['name'].split('_')[-1])
                for v in obj.data.vertices:
                    if v.co.z>0:
                        v.co.z-=.06+.12*(.5+.5*math.sin(k*1.8+v.co.x*3))
                        v.co.x+=.055*math.sin(k+v.co.y*2)
                edge=obj.modifiers.new('Cut_Edges','BEVEL');edge.width=.08;edge.segments=1
                bpy.context.view_layer.objects.active=obj
                bpy.ops.object.modifier_apply(modifier=edge.name)
        if cfg.get('cragVariant'):
            k=cfg['cragVariant']
            for v in obj.data.vertices:
                x,y,z=v.co; angle=math.atan2(y,x)
                factor=1+.13*math.sin(angle*3+k)+.07*math.cos(angle*5-k)
                v.co.x=x*factor+.11*z*math.sin(k)
                v.co.y=y*(1+.14*math.sin(angle*2+k))
                v.co.z=z+.10*math.sin(angle*2+k)*(1-abs(z)/max(.001,spec['dimensions'][2]/2))
            floor=min(v.co.z for v in obj.data.vertices)+spec['dimensions'][2]*.18
            for v in obj.data.vertices:v.co.z=max(floor,v.co.z)
            # Normalizar tras esculpir: anchura y altura conservan la medida escrita.
            for axis in range(3):
                vals=[v.co[axis] for v in obj.data.vertices]; lo=min(vals);hi=max(vals)
                for v in obj.data.vertices:v.co[axis]=(v.co[axis]-(lo+hi)/2)*spec['dimensions'][axis]/(hi-lo)
        parts.append(obj)
    by_material={mat:[o for o in parts if o.data.materials[0].name==mat] for mat in materials}
    for mat,group in by_material.items():
        if not group:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in group:o.select_set(True)
        bpy.context.view_layer.objects.active=group[0]
        if len(group)>1:bpy.ops.object.join()
        obj=group[0];obj.name=id+'_'+mat;obj.data.name=obj.name
        if mat=='door' and cfg.get('doorPivot'):
            bpy.context.scene.cursor.location=cfg['doorPivot'];bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in objects:o.location*=r['scale'];o.scale*=r['scale']
    bpy.context.view_layer.update()
    lo,hi=bounds(objects)
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
    assert triangles<=cfg['triangleLimit'],(id,triangles,cfg['triangleLimit'])
    out=ROOT/'artifacts/graphics/astra'/id;out.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out/(id+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
    # Capturas hechas importando los bytes exportados, no la escena previa.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(out/(id+'.glb')))
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    bpy.context.view_layer.update();lo,hi=bounds(objects)
    # El importador glTF marca smooth pero conserva las normales partidas exportadas.
    dimensions=[(hi[i]-lo[i])*3 for i in [0,2,1]]
    stats=dict(id=id,triangles=triangles,triangleLimit=cfg['triangleLimit'],dimensionsMetresXYZ=dimensions,materials={m['name']:colors[m['role']] for m in r['materials']},boundsBlenderCells=dict(min=lo,max=hi),doorPivotMetres=cfg.get('doorPivot'),source=str(recipe_path.relative_to(ROOT)))
    (out/'metrics.json').write_text(json.dumps(stats,indent=2)+'\n')
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12
    scene.cycles.use_denoising=True;scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('ReviewWorld');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.59,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
    scene.view_settings.view_transform='Standard'
    bpy.ops.object.light_add(type='AREA',location=(-4,-6,10));bpy.context.object.data.energy=1500;bpy.context.object.data.size=7
    bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
    ground=bpy.data.materials.new('ReviewGround');ground.diffuse_color=(.64,.68,.54,1)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.006));plane=bpy.context.object;plane.data.materials.append(ground)
    center=mathutils.Vector([(lo[i]+hi[i])/2 for i in range(3)])
    span=max(hi[i]-lo[i] for i in range(3));images=[]
    for idx,(title,direction) in enumerate([('three-quarter',(1,-1.5,1.25)),('front',(0,-1,.06)),('profile',(1,0,.06)),('scale',(1,-1.5,1.05))]):
        current=objects
        if idx==3:
            # Referencias publicadas: nunca se escalan; sus unidades ya son celdas.
            for file,x in [('villager',hi[0]+.6),('house',hi[0]+2.4)]:
                before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d'/(file+'.glb')))
                imported=list(set(bpy.context.scene.objects)-before);bpy.context.view_layer.update()
                # Congelar la pose evaluada sólo en la escena de revisión: las acciones
                # del GLB pueden restaurar la traslación de su raíz al renderizar.
                frozen=[];deps=bpy.context.evaluated_depsgraph_get()
                for original in imported:
                    if original.type=='MESH' and original.visible_get():
                        mesh=bpy.data.meshes.new_from_object(original.evaluated_get(deps))
                        copy=bpy.data.objects.new('Reference_'+file,mesh);bpy.context.collection.objects.link(copy)
                        copy.matrix_world=original.matrix_world.copy();frozen.append(copy)
                for original in imported:bpy.data.objects.remove(original,do_unlink=True)
                imported=frozen;bpy.context.view_layer.update()
                a,b=bounds(imported);delta=mathutils.Vector((x-a[0],-(a[1]+b[1])/2+center.y,-a[2]))
                for o in imported:
                    if o.parent not in imported:o.location+=delta
                current+= [o for o in imported if o.type=='MESH']
            bpy.context.view_layer.update();a,b=bounds(current)
            center=mathutils.Vector([(a[i]+b[i])/2 for i in range(3)]);span=max(b[i]-a[i] for i in range(3))
        camera.location=center+mathutils.Vector(direction)*max(10,span*2)
        point_at(camera,center);camera.data.ortho_scale=span*1.5
        scene.render.filepath=str(out/(title+'.png'));bpy.ops.render.render(write_still=True)
        rendered=bpy.data.images.load(str(out/(title+'.png')),check_existing=False)
        pixels=np.empty(640*640*4,dtype=np.float32);rendered.pixels.foreach_get(pixels);images.append(pixels.reshape((640,640,4)))
        bpy.data.images.remove(rendered)
    sheet=np.concatenate([np.concatenate(images[2:4],axis=1),np.concatenate(images[0:2],axis=1)],axis=0)
    img=bpy.data.images.new('Sheet',width=1280,height=1280);img.pixels.foreach_set(sheet.flatten());img.filepath_raw=str(out/'sheet.png');img.file_format='PNG';img.save()
    text=f'''# {id} · candidato Astra

- Medida real X × alto × fondo: {dimensions[0]:.3f} × {dimensions[1]:.3f} × {dimensions[2]:.3f} m. GLB en celdas (1 celda = 3 m).
- Triángulos: {triangles} / {cfg['triangleLimit']}. Caras planas, sin texturas.
- Materiales: {', '.join(m['name']+' = '+colors[m['role']] for m in r['materials'])}.
- `sheet.png`: arriba izquierda tres cuartos desde arriba; arriba derecha frente (+Z); abajo izquierda perfil; abajo derecha escala con villager y house publicados, sin reescalarlos.
- Receta: `art/recipes/{id}-candidate/{id}.json`.
- Reconstrucción desde la raíz: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/hall-candidate/build.py -- {id}`.
- El adaptador reutiliza las primitivas de tools/art, aplica los giros de cubos, conserva la bisagra declarada y esculpe las variantes de peñasco declaradas. Reimporta el GLB para las capturas. No requiere Blender abierto.

{cfg['notes'] or 'Sin preguntas de diseño pendientes para este modelo.'}

Candidato de revisión; integración y publicación pendientes en otra sesión. No se han ejecutado tests ni modificado catálogo/public.
'''
    (out/'README.md').write_text(text,encoding='utf8')
    print('ASTRA_COMPLETE '+id+' '+str(triangles),flush=True)

ids=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if not ids:ids=['hall','stall-pedlar','stall-factor','stall-salter','quarry-face-intact','quarry-face-mined','quarry-face-exhausted','crag-1','crag-2','crag-3','crag-4','crag-5','cairn']
for id in ids:build(id)
