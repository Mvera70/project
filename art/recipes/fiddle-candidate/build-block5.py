import bpy,json,math,struct,sys
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path(__file__).resolve().parents[3]
source=(ROOT/'tools/art/blender-build.py').read_text(encoding='utf-8');exec(source.split('# G-04:')[0])
b=(ROOT/'public/assets/valley3d/villager.glb').read_bytes();g=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]]);parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])}
def node_world(i):
 n=g['nodes'][i]
 if 'matrix' in n:m=Matrix([n['matrix'][k:k+4] for k in range(0,16,4)]).transposed()
 else:
  q=n.get('rotation',[0,0,0,1]);m=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(n.get('scale',[1,1,1])))
 return node_world(parents[i])@m if i in parents else m
ids=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else json.loads((ROOT/'art/recipes/fiddle-candidate/ids.json').read_text())
for id in ids:
 recipe=json.loads((ROOT/'art/recipes'/f'{id}-candidate'/f'{id}.json').read_text());out=ROOT/'artifacts/graphics/astra'/id;out.mkdir(parents=True,exist_ok=True);bpy.ops.wm.read_factory_settings(use_empty=True)
 materials={s['name']:make_material(s) for s in recipe['materials']};pieces=[]
 for p in recipe['primitives']:
  obj=create_primitive(p,materials)
  if p['type']=='cube':obj.rotation_euler=tuple(math.radians(v) for v in p['rotationDegrees']);bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
  attr=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER');color=obj.data.materials[0].diffuse_color
  for datum in attr.data:datum.color=color
  pieces.append(obj)
 bpy.ops.object.select_all(action='DESELECT')
 for obj in pieces:obj.select_set(True)
 bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();obj=pieces[0];obj.name=id.replace('-','_');obj.data.materials.clear();mat=bpy.data.materials.new('valley_vertex');mat.use_nodes=True;shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.94;vertex=mat.node_tree.nodes.new('ShaderNodeVertexColor');vertex.layer_name='Color';mat.node_tree.links.new(vertex.outputs['Color'],shader.inputs['Base Color']);obj.data.materials.append(mat)
 bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');obj.scale=(recipe['scale'],)*3;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.data.calc_loop_triangles();tri=len(obj.data.loop_triangles)
 if tri>150:raise RuntimeError(f'{id}: {tri} >150')
 connector=bpy.data.objects.new(recipe['connectors'][0],None);bpy.context.collection.objects.link(connector);connector.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(out/f'{id}.glb'),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
 bpy.data.objects.remove(connector,do_unlink=True)
 verts=[v.co for v in obj.data.vertices];lo=[min(v[i] for v in verts) for i in range(3)];hi=[max(v[i] for v in verts) for i in range(3)]
 anchor=recipe['metadata']['attachment'];index=next(i for i,n in enumerate(g['nodes']) if n.get('name')==anchor);parent=node_world(index);desired=Matrix.Translation(parent.to_translation());local=parent.inverted()@desired;real=parent@local;error=max(abs(real[r][c]-desired[r][c]) for r in range(4) for c in range(4));assert error<1e-6
 attachment=dict(node=anchor,connector=recipe['connectors'][0],space='glTF Y-up, cells',matrixColumnMajor=[local[r][c] for c in range(4) for r in range(4)],restAnchorWorld=list(parent.to_translation()),pivotErrorCells=error,note='Aplicar matrixColumnMajor al grupo del GLB como hijo del nodo; compensación de escala y rotación de reposo incluidas. No aplicar además el grip del hacha. Sigue el hueso al animarse. Validado en reposo, no en los gestos vivos.')
 (out/'attachment.json').write_text(json.dumps(attachment,indent=2)+'\n',encoding='utf-8');report=dict(id=id,triangles=tri,meshes=1,materials=1,bounds=dict(min=[lo[0],lo[2],-hi[1]],max=[hi[0],hi[2],-lo[1]]),dimensions=[hi[0]-lo[0],hi[2]-lo[2],hi[1]-lo[1]],origin=[0,0,0],attachment=anchor,pivotErrorCells=error,textures=0);(out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
 (out/'README.md').write_text(f"# {id}\n\nBloque 5. {tri} triángulos, una malla `{obj.name}`, un material `valley_vertex`, COLOR_0 de la paleta canónica y cero texturas. Tamaño XYZ glTF: {report['dimensions']} celdas (3 m/celda).\n\nOrigen (0,0,0) en `{anchor}`; conector `{recipe['connectors'][0]}`. **No recentrar ni apoyar este GLB en el suelo.** `attachment.json` contiene la matriz local exacta que se aplica al grupo del accesorio como hijo de `{anchor}`, compensando el giro y escala del padre. Error de coincidencia del pivote: {error:.2g} celdas en reposo. Base medida: `public/assets/valley3d/villager.glb`.\n\nReproducir: `blender --background --python art/recipes/fiddle-candidate/build-block5.py -- {id}`; hojas: `python art/recipes/fiddle-candidate/sheets-block5.py`.\n\nEstado: **preview-only**, como exige la skill animacion. Hoja sobre el aldeano en reposo, detalle y comparación con casa. Sin clips nuevos. Pendiente: integrar en la vida, probar marcha/gestos reales y medir coste; no se certifica aquí la animación en partida.\n",encoding='utf-8')
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=360;scene.render.resolution_y=360;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.77,.68,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7;scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
 bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=500;bpy.context.object.data.size=5;bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'
 target=Vector(tuple((lo[i]+hi[i])/2 for i in range(3)));cam.location=target+Vector((3,-4,3));point_at(cam,target);cam.data.ortho_scale=max(hi[i]-lo[i] for i in range(3))*1.45;scene.render.filepath=str(out/'detail.png');bpy.ops.render.render(write_still=True)
 previous=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d/villager.glb'));actor=set(scene.objects)-previous
 for ref in actor:
  if ref.type=='ARMATURE':ref.data.pose_position='REST'
 world=parent.to_translation();obj.location=(world.x,-world.z,world.y);target=Vector((0,0,.36));cam.data.ortho_scale=1.0
 for view,direction in [('quarter',(3,4 if anchor=='spine' else -4,3)),('front',(0,-5,.01)),('profile',(5,0,.01))]:
  cam.location=target+Vector(direction);point_at(cam,target);scene.render.filepath=str(out/f'{view}.png');bpy.ops.render.render(write_still=True)
 # Escala nativa: accesorio equipado y casa completa.
 obj.location.x-=.7
 for ref in actor:
  if ref.parent not in actor:ref.location.x-=.7
 previous=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d/house.glb'));house=set(scene.objects)-previous
 for ref in house:
  if ref.parent not in house:ref.location+=Vector((.3,.45,0))
 bpy.context.view_layer.update();corners=[o.matrix_world@Vector(c) for o in scene.objects if o.type=='MESH' for c in o.bound_box];target=Vector(tuple((min(p[i] for p in corners)+max(p[i] for p in corners))/2 for i in range(3)));cam.location=target+Vector((3,-5,3));point_at(cam,target);bpy.context.view_layer.update();localcorners=[cam.matrix_world.inverted()@p for p in corners];cam.data.ortho_scale=max(max(p[i] for p in localcorners)-min(p[i] for p in localcorners) for i in [0,1])*1.18;scene.render.filepath=str(out/'scale.png');bpy.ops.render.render(write_still=True)
 print('DONE',id,tri,anchor,error,flush=True)
