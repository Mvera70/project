"""Construye cualquiera de las recetas de minería y fotografía el GLB reimportado.
blender --background --python art/recipes/mine-mouth-candidate/build.py -- mine-mouth
"""
import bpy,bmesh,json,sys,math,struct
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
asset=sys.argv[sys.argv.index('--')+1];folder='ore-pile' if asset.startswith('ore-pile') else asset;r=json.loads((HERE.parent/(folder+'-candidate')/(asset+'.json')).read_text(encoding='utf-8-sig'))
palette=json.loads((HERE.parent/'palette.json').read_text())['valley'];out=ROOT/'artifacts/graphics/astra'/folder
if asset.startswith('ore-pile-'):out=out/('state-'+asset[-1])
out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def lin(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def color(role):return tuple(lin(int(palette[role][i:i+2],16)/255) for i in (1,3,5))+(1,)
def coord(p):return (p[0]/3,-p[2]/3,p[1]/3)
mat=bpy.data.materials.new('mining_palette');mat.use_nodes=True;mat.use_backface_culling=False
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
for filename,x in [('villager',span*.58+.40),('house',span*.58+1.90)]:
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
# Pivotes de ruedas, radio y carga desmontable sobre el recurso reimportado.
pivots={}
for spec in r['meshes']:
 obj=next(o for o in objects if o.name==spec['name']);assert (obj.location-Vector(coord(spec['origin']))).length<1e-7;pivots[obj.name]=spec['origin']
 if obj.name.startswith('wheel_'):
  before=obj.location.copy();bpy.context.view_layer.update();tip=max(obj.data.vertices,key=lambda v:abs(v.co.z));a=obj.matrix_world@tip.co;obj.rotation_euler.x=math.radians(45);bpy.context.view_layer.update();assert (obj.location-before).length<1e-10;assert ((obj.matrix_world@tip.co)-a).length>.03;obj.rotation_euler.x=0
if asset in ['minecart','minecart-full']:
 for obj in refs:obj.hide_render=True
 poses=[]
 for title,angle in [('rest',0),('rolled',45),('unloaded',90)]:
  for obj in objects:
   if obj.name.startswith('wheel_'):obj.rotation_euler.x=math.radians(angle)
   if obj.name=='ore_load':obj.hide_render=title=='unloaded'
  render('pose-'+title,center,views[0][1],span*1.55);poses.append(images[-1])
 img=bpy.data.images.new('Poses',width=1440,height=480);img.pixels.foreach_set(np.concatenate(poses,axis=1).flatten());img.filepath_raw=str(out/'poses.png');img.file_format='PNG';img.save()
 for obj in objects:obj.rotation_euler=(0,0,0);obj.hide_render=False
metrics=dict(triangles=tris,limit=r['triangleLimit'],meshCount=len(g['meshes']),primitives=sum(len(m['primitives']) for m in g['meshes']),dimensionsCells=[hi.x-lo.x,hi.z-lo.z,hi.y-lo.y],pivotsMetres=pivots,vertexColors=True,textures=0)
(out/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
dims=' × '.join(f'{x:.4f}' for x in metrics['dimensionsCells']);pivottext='; '.join(f'`{name}`: {p}' for name,p in pivots.items())
(out/'README.md').write_text(f'''# {asset} · candidato del Bloque 4

{r['description']}

- Dimensiones (ancho × alto × fondo): **{dims} celdas**; una celda = 3 m.
- **{tris}/{r['triangleLimit']} triángulos**, {metrics['meshCount']} mallas y primitivas de dibujo. Un material de paleta con COLOR_0; sin texturas.
- Ejes: +Y arriba, +Z hacia salida/frente. Receta en metros; GLB en celdas; vértices relativos al pivote.
- Mallas y pivotes XYZ en metros: {pivottext}.
- Ruedas wheel_* (vagonetas): eje local X, radio 0,23 m (0,076667 celdas). Giro futuro por distancia/radio; ore_load desmontable. Los dos carros comparten exactamente geometría de cuerpo y ruedas. Las demás piezas son rígidas.
- Metadatos de contrato geométrico: `{json.dumps(r['metadata'],ensure_ascii=False)}`.
- `sheet.png`: tres cuartos desde arriba, frente, perfil; debajo, las mismas vistas con villager.glb y house.glb a escala real. `poses.png` en carros: reposo, ruedas giradas 45°, 90° con carga retirada.
- Fuente: `art/recipes/{folder}-candidate/{asset}.json`. Reconstruir desde raíz: `blender --background --python art/recipes/mine-mouth-candidate/build.py -- {asset}`. El adaptador explícito compartido está en mine-mouth-candidate.
- QA conjunta: `blender --background --python art/recipes/mine-mouth-candidate/validate.py`. Produce `mine-mouth/assembly.png`, `assembly-metrics.json` y `ore-pile/states.png`; valida vía/ruedas, gálibo y que retirar ore_load recupera la vacía.
- Acopios: `ore-pile.glb` es el mayor; sus cuatro estados están en `ore-pile/state-1` a `state-4`, cada uno con GLB, hoja y métricas. `states.png` los compara de izquierda a derecha a la misma escala.
- Medido desde el GLB: triángulos, primitivas, ausencia de texturas, colores de vértice; reimportación y pivotes de ruedas con desplazamiento de periferia al girar.

Sólo modelo: la mecánica de mina todavía no existe. Pendientes integración, encaje en ladera, desaparición tras plano oscuro, descarga y medida en cámara de reposo/móvil; no se modificó motor ni código de juego.
''',encoding='utf8')
print('MINING_COMPLETE',asset,json.dumps(metrics),flush=True)
