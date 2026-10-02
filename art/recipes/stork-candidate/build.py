"""Construye cualquiera de las cinco recetas y fotografía el GLB reimportado.
blender --background --python art/recipes/stork-candidate/build.py -- stork
"""
import bpy,bmesh,json,sys,math,struct
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
asset=sys.argv[sys.argv.index('--')+1];r=json.loads((HERE.parent/(asset+'-candidate')/(asset+'.json')).read_text(encoding='utf-8-sig'))
palette=json.loads((HERE.parent/'palette.json').read_text())['valley'];out=ROOT/'artifacts/graphics/astra'/asset;out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def lin(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def color(role):return tuple(lin(int(palette[role][i:i+2],16)/255) for i in (1,3,5))+(1,)
def coord(p):return (p[0]/3,-p[2]/3,p[1]/3)
mat=bpy.data.materials.new('fauna_palette');mat.use_nodes=True;mat.use_backface_culling=False
nodes=mat.node_tree.nodes;bsdf=nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.95
vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';mat.node_tree.links.new(vc.outputs['Color'],bsdf.inputs['Base Color'])
for spec in r['meshes']:
 mesh=bpy.data.meshes.new(spec['name']);mesh.from_pydata([coord(v) for v in spec['vertices']],[],spec['faces']);mesh.materials.append(mat)
 layer=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
 for poly,role in zip(mesh.polygons,spec['faceRoles']):
  for index in poly.loop_indices:layer.data[index].color=color(role)
 obj=bpy.data.objects.new(spec['name'],mesh);bpy.context.collection.objects.link(obj);obj.location=coord(spec['origin'])
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
bpy.ops.export_scene.gltf(filepath=str(out/(asset+'.glb')),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
blob=(out/(asset+'.glb')).read_bytes();length=struct.unpack_from('<I',blob,12)[0];g=json.loads(blob[20:20+length]);tris=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives']);assert tris<=r['triangleLimit'];assert len(g['meshes'])==len(r['meshes']);assert not g.get('textures');assert all('COLOR_0' in p['attributes'] for m in g['meshes'] for p in m['primitives'])
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(out/(asset+'.glb')))
objects=list(bpy.context.scene.objects)
for obj in objects:obj.rotation_mode='XYZ'
bpy.context.view_layer.update();points=[o.matrix_world@v.co for o in objects if o.type=='MESH' for v in o.data.vertices]
lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)]);center=(lo+hi)/2;span=max(hi-lo)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=480;scene.render.resolution_y=480;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.72,.62,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
bpy.ops.object.light_add(type='AREA',location=(-3,-4,6));bpy.context.object.data.energy=450;bpy.context.object.data.size=4
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.clip_start=.0001;cam.data.clip_end=100;scene.camera=cam
images=[]
def render(name,target,direction,scale):
 cam.location=target+Vector(direction)*3;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
 img=bpy.data.images.load(scene.render.filepath,check_existing=False);a=np.empty(480*480*4,dtype=np.float32);img.pixels.foreach_get(a);images.append(a.reshape(480,480,4));bpy.data.images.remove(img)
views=[('three-quarter',(1.2,-1.8,1.5)),('front',(0,-3,.08)),('profile',(3,0,.08))]
for name,direction in views:render(name,center,direction,span*1.4)
# El candidato y las referencias comparten celda y suelo; no se escalan para la hoja.
refs=[];ref_roots=[]
for filename,x in [('villager',.64),('house',2.10)]:
 before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d'/(filename+'.glb')));added=set(bpy.context.scene.objects)-before
 for obj in added:
  if obj.parent not in added:ref_roots.append((obj,obj.location.copy(),x))
 refs.extend(added)
for name,direction in views:
 right=Vector((-direction[1],direction[0],0)).normalized()
 for obj,original,x in ref_roots:obj.location=original+right*x
 bpy.context.view_layer.update()
 pts=[o.matrix_world@v.co for o in objects+refs if o.type=='MESH' for v in o.data.vertices]
 low=Vector([min(p[i] for p in pts) for i in range(3)]);high=Vector([max(p[i] for p in pts) for i in range(3)]);target=(low+high)/2
 look=Vector(direction).normalized();up=look.cross(right).normalized()
 width=max(abs((p-target).dot(right)) for p in pts)*2; height=max(abs((p-target).dot(up)) for p in pts)*2
 render('context-'+name,target,direction,max(width,height)*1.15)
sheet=np.concatenate([np.concatenate(images[3:],axis=1),np.concatenate(images[:3],axis=1)],axis=0);img=bpy.data.images.new('Sheet',width=1440,height=960);img.pixels.foreach_set(sheet.flatten());img.filepath_raw=str(out/'sheet.png');img.file_format='PNG';img.save()
# Evidencia adicional de articulaciones reales del GLB, sin las referencias.
if asset in ['stork','crane','butterfly']:
 for obj in refs:obj.hide_render=True
 poses=[]
 for title,angle in [('rest',0),('raised',55),('lowered',-35)]:
  for obj in objects:
   if 'wing' in obj.name:obj.rotation_euler.y=math.radians(angle if obj.name.endswith('_l') else -angle)
   if obj.name=='stork_neck':obj.rotation_euler.x=math.radians(90 if title=='lowered' else 40 if title=='raised' else 0)
  render('pose-'+title,center,views[0][1],span*1.55);poses.append(images[-1])
 img=bpy.data.images.new('Poses',width=1440,height=480);img.pixels.foreach_set(np.concatenate(poses,axis=1).flatten());img.filepath_raw=str(out/'poses.png');img.file_format='PNG';img.save()
 for obj in objects:obj.rotation_euler=(0,0,0)
# Pivotes tras el viaje por GLB; el batido no debe trasladar la raíz del ala.
pivots={}
for spec in r['meshes']:
 obj=next(o for o in objects if o.name==spec['name']);assert (obj.location-Vector(coord(spec['origin']))).length<1e-7;pivots[obj.name]=spec['origin']
 if 'wing' in obj.name:
  before=obj.location.copy();bpy.context.view_layer.update();tip=max(obj.data.vertices,key=lambda v:abs(v.co.x));tip_before=obj.matrix_world@tip.co;obj.rotation_euler.y=math.radians(55);bpy.context.view_layer.update();assert (obj.location-before).length<1e-10;assert ((obj.matrix_world@tip.co)-tip_before).length>.003;obj.rotation_euler.y=0
metrics=dict(triangles=tris,limit=r['triangleLimit'],meshCount=len(g['meshes']),primitives=sum(len(m['primitives']) for m in g['meshes']),dimensionsCells=[hi.x-lo.x,hi.z-lo.z,hi.y-lo.y],pivotsMetres=pivots,vertexColors=True,textures=0)
(out/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
dims=' × '.join(f'{x:.4f}' for x in metrics['dimensionsCells']);pivottext='; '.join(f'`{name}`: {p}' for name,p in pivots.items())
(out/'README.md').write_text(f'''# {asset} · candidato del Bloque 6

{r['description']}

- Dimensiones (ancho × alto × fondo): **{dims} celdas**; una celda = 3 m.
- **{tris}/{r['triangleLimit']} triángulos**, {metrics['meshCount']} mallas, {metrics['primitives']} primitivas de dibujo, un material con COLOR_0 de la paleta; sin texturas.
- GLB: +Y arriba, +Z delante; origen en el suelo para fauna posada y datum del cuerpo para fauna en vuelo. Receta en metros y vértices relativos al pivote. Grulla y mariposa: alas planas de doble cara.
- Mallas y orígenes (metros, XYZ): {pivottext}.
{'- Alas: giro sobre Z local del GLB (−Y de Blender). Ala izquierda en −X: subida −55°, derecha +55°. Pivotes verificados tras exportar e importar.' if asset in ['crane','butterfly'] else '- Pieza rígida; la cigüeña conserva cuello articulado para picoteo.'}
- `sheet.png`: fila superior, tres cuartos desde arriba / frente / perfil del candidato; fila inferior, mismas vistas junto al `villager.glb` y `house.glb` publicados, todos a la misma escala. Las seis capturas sueltas acompañan la hoja.
- Reconstrucción desde raíz: `blender --background --python art/recipes/stork-candidate/build.py -- {asset}`. Fuente: `art/recipes/{asset}-candidate/{asset}.json`. El adaptador explícito compartido vive en stork-candidate; el pipeline de primitivas no admite estas alas.
{'- `poses.png`: reposo / articulación intermedia / articulación extrema, sobre el GLB reimportado.' if asset in ['stork','crane','butterfly'] else ''}
- Verificado: presupuesto desde índices del GLB, número de mallas y primitivas, COLOR_0, ausencia de texturas y pivotes exportados.

{'Cuello de cigüeña: `stork_neck` pivota en (0, 0.27, 0.026667) celdas; girar X local para picoteo, como el emisor existente. Conserva dos llamadas instanciadas.' if asset=='stork' else ''}

Pendiente: integración por Sol 6, captura real desde cámara de reposo y medida de coste en móvil. No se incluyen clips ni aprobación de integración. El nido necesita confirmar anclaje al tejado; candidato plausible: cumbrera trasera de capilla (receta Chapel_Ridge), posición local GLB aproximada (1, 1.62, -1.5), lejos de cruz/campana; aplicar transformaciones del grupo de world/buildings.ts. Es propuesta geométrica sin aprobación de integración; los otros candidatos usan sus emisores existentes.
''',encoding='utf8')
print('FAUNA_COMPLETE',asset,json.dumps(metrics),flush=True)
