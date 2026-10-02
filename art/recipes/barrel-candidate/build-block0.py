import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
# Reutiliza las primitivas canónicas sin ejecutar el corredor ni tocar catálogo.
source=(ROOT/'tools/art/blender-build.py').read_text();exec(source.split('# G-04:')[0])
ids=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if not ids:ids=[p.parent.name.replace('-candidate','') for p in (ROOT/'art/recipes').glob('*-candidate/*.json') if p.stem==p.parent.name.replace('-candidate','') and p.stem in json.loads((ROOT/'art/recipes/barrel-candidate/ids.json').read_text())]
for id in ids:
 path=ROOT/'art/recipes'/f'{id}-candidate'/f'{id}.json';recipe=json.loads(path.read_text());out=ROOT/'artifacts/graphics/astra'/id;out.mkdir(parents=True,exist_ok=True)
 bpy.ops.wm.read_factory_settings(use_empty=True)
 materials={s['name']:make_material(s) for s in recipe['materials']}
 pieces=[create_primitive(p,materials) for p in recipe['primitives']]
 for item,obj in zip(recipe['primitives'],pieces):
  if item['type']=='cube':
   obj.rotation_euler=tuple(math.radians(v) for v in item['rotationDegrees']);bpy.context.view_layer.objects.active=obj;bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
 # Un solo material y color por esquina: una llamada por instancia de tipo.
 for obj in pieces:
  color=obj.data.materials[0].diffuse_color
  attr=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
  for datum in attr.data:datum.color=color
 bpy.ops.object.select_all(action='DESELECT')
 for obj in pieces:obj.select_set(True)
 bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();obj=pieces[0];obj.name=id.replace('-','_');obj.data.materials.clear()
 material=bpy.data.materials.new('valley_vertex');material.use_nodes=True;shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.92
 vertex=material.node_tree.nodes.new('ShaderNodeVertexColor');vertex.layer_name='Color';material.node_tree.links.new(vertex.outputs['Color'],shader.inputs['Base Color']);obj.data.materials.append(material)
 bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');obj.scale=(recipe['scale'],)*3;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bottom=min(v.co.z for v in obj.data.vertices)
 for v in obj.data.vertices:v.co.z-=bottom
 obj.data.calc_loop_triangles();tris=len(obj.data.loop_triangles)
 if tris>150:raise RuntimeError(f'{id}: {tris} triangles >150')
 verts=[obj.matrix_world@v.co for v in obj.data.vertices];lo=[min(v[i] for v in verts) for i in range(3)];hi=[max(v[i] for v in verts) for i in range(3)]
 bpy.ops.export_scene.gltf(filepath=str(out/f'{id}.glb'),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
 if id in ['barrel','crate','sack-pile']:
  for label,factor in [('small',.8),('large',1.2)]:
   obj.scale=(factor,)*3
   bpy.ops.export_scene.gltf(filepath=str(out/f'{id}-{label}.glb'),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
  obj.scale=(1,1,1)
 report=dict(id=id,triangles=tris,meshes=1,materials=1,bounds=dict(min=[lo[0],lo[2],-hi[1]],max=[hi[0],hi[2],-lo[1]]),dimensions=[hi[0]-lo[0],hi[2]-lo[2],hi[1]-lo[1]],origin=[0,0,0],front='+Z',palette='art/recipes/palette.json')
 (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
 (out/'README.md').write_text(f"# {id}\n\nCandidato del Bloque 0. Medidas XYZ glTF: {report['dimensions']} celdas (1 celda = 3 m). {tris} triángulos; una malla `{obj.name}`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.\n\nReproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- {id}`. Receta: `art/recipes/{id}-candidate/{id}.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.\n\nPendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.\n",encoding='utf-8')
 if id in ['barrel','crate','sack-pile']:
  with (out/'README.md').open('a',encoding='utf-8') as f:f.write(f'\nVariantes: `{id}-small.glb` (×0,8) y `{id}-large.glb` (×1,2). Se recomienda GLB base y escala por instancia.\n')
 # Cuatro paneles de render real, último con referencias importadas a escala nativa.
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.render.resolution_x=360;scene.render.resolution_y=360;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
 scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.77,.68,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
 scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast' if 'Medium High Contrast' in [] else 'None'
 bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=500;bpy.context.object.data.size=5
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';h=hi[2];target=Vector((0,0,h*.48));span=max(hi[0]-lo[0],hi[1]-lo[1],h)*1.45
 for view,direction in [('quarter',(3,-4,3)),('front',(0,-5,.01)),('profile',(5,0,.01))]:
  cam.location=target+Vector(direction);point_at(cam,target);cam.data.ortho_scale=span;scene.render.filepath=str(out/f'{view}.png');bpy.ops.render.render(write_still=True)
 # Referencias de tamaño en el panel final.
 obj.location.x=-1.3
 for file,x,y in [('villager.glb',-.7,0),('house.glb',1.0,.45)]:
  previous=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d'/file));new=set(scene.objects)-previous
  for ref in new:
   if ref.parent not in new:ref.location+=Vector((x,y,0))
 bpy.context.view_layer.update()
 corners=[o.matrix_world@Vector(c) for o in scene.objects if o.type=='MESH' for c in o.bound_box]
 target=Vector(tuple((min(p[i] for p in corners)+max(p[i] for p in corners))/2 for i in range(3)));cam.location=target+Vector((3,-5,3));point_at(cam,target);bpy.context.view_layer.update()
 local=[cam.matrix_world.inverted()@p for p in corners];cam.data.ortho_scale=max(max(p[i] for p in local)-min(p[i] for p in local) for i in [0,1])*1.18;scene.render.filepath=str(out/'scale.png');bpy.ops.render.render(write_still=True)
 print('DONE',id,tris,flush=True)
