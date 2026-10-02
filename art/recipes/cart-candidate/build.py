"""Construye cualquiera de las recetas de minería y fotografía el GLB reimportado.
blender --background --python art/recipes/cart-candidate/build.py -- cart
"""
import bpy,bmesh,json,sys,math,struct
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
asset=sys.argv[sys.argv.index('--')+1];folder=asset;r=json.loads((HERE.parent/(folder+'-candidate')/(asset+'.json')).read_text(encoding='utf-8-sig'))
palette=json.loads((HERE.parent/'palette.json').read_text())['valley'];out=ROOT/'artifacts/graphics/astra'/folder

out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def lin(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def color(role):return tuple(lin(int(palette[role][i:i+2],16)/255) for i in (1,3,5))+(1,)
def coord(p):return (p[0]/3,-p[2]/3,p[1]/3)
mat=bpy.data.materials.new('village_palette');mat.use_nodes=True;mat.use_backface_culling=False
nodes=mat.node_tree.nodes;bsdf=nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.95
vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';mat.node_tree.links.new(vc.outputs['Color'],bsdf.inputs['Base Color'])
pieces={}
for spec in r['meshes']:
 mesh=bpy.data.meshes.new(spec['name']);mesh.from_pydata([coord(v) for v in spec['vertices']],[],spec['faces']);mesh.materials.append(mat)
 layer=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
 for poly,role in zip(mesh.polygons,spec['faceRoles']):
  for index in poly.loop_indices:layer.data[index].color=color(role)
 obj=bpy.data.objects.new(spec['name'],mesh);bpy.context.collection.objects.link(obj);obj.location=coord(spec['origin'])
 pieces[obj.name]=obj
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
export_options=dict(export_animations=False)
if asset=='horse':
 import copy
 sys.path.insert(0,str(ROOT/'tools/art'));import rig as rig_module;import animate as animate_module
 skeleton=copy.deepcopy(r['rig'])
 for bone in skeleton['bones']:
  for key in ['head','tail']:bone[key]=[v/3 for v in bone[key]]
 arm=rig_module.build_armature(skeleton,'Horse_Rig');bpy.context.view_layer.update();rig_module.bind_rigid(arm,pieces,skeleton['bind'])
 bpy.ops.object.select_all(action='DESELECT')
 for obj in pieces.values():obj.select_set(True)
 bpy.context.view_layer.objects.active=next(iter(pieces.values()));bpy.ops.object.join();bpy.context.object.name='horse_mesh'
 bpy.context.scene.render.fps=24;bpy.context.scene.frame_end=193
 animate_module.build_clips(arm,r['clips']);bpy.context.scene.frame_set(1)
 export_options=dict(export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_optimize_animation_size=False)
bpy.ops.export_scene.gltf(filepath=str(out/(asset+'.glb')),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,**export_options)
blob=(out/(asset+'.glb')).read_bytes();length=struct.unpack_from('<I',blob,12)[0];g=json.loads(blob[20:20+length]);tris=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives']);assert tris<=r['triangleLimit'];assert len(g['meshes'])==(1 if asset=='horse' else len(r['meshes']));assert not g.get('textures');assert all('COLOR_0' in p['attributes'] for m in g['meshes'] for p in m['primitives'])
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(out/(asset+'.glb')))
objects=[o for o in bpy.context.scene.objects if not o.name.startswith('Icosphere')]
if asset=='horse':
 for obj in objects:
  if obj.type=='ARMATURE':obj.data.pose_position='REST'
for obj in objects:obj.rotation_mode='XYZ'
bpy.context.view_layer.update();points=[o.matrix_world@v.co for o in objects if o.type=='MESH' and not o.name.startswith('Icosphere') for v in o.data.vertices]
lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)]);center=(lo+hi)/2;span=max(hi-lo)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=480;scene.render.resolution_y=480;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.72,.62,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
bpy.ops.object.light_add(type='AREA',location=(-3,-4,6));bpy.context.object.data.energy=450;bpy.context.object.data.size=4
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.clip_start=.0001;cam.data.clip_end=100;scene.camera=cam
images=[]
def render(name,target,direction,scale):
 cam.location=target+Vector(direction)*3;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
 img=bpy.data.images.load(scene.render.filepath,check_existing=False);a=np.empty(480*480*4,dtype=np.float32);img.pixels.foreach_get(a);images.append(a.reshape(480,480,4));bpy.data.images.remove(img)
views=[('three-quarter',(1.2,-1.8,1.5)),('front',(0,-3,.08)),('profile',(3,0,.08))]
if asset=='horse':views=[('three-quarter',(-1.8,-1.2,1.5)),('front',(-3,0,.08)),('profile',(0,-3,.08))]
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
 pts=[o.matrix_world@v.co for o in objects+refs if o.type=='MESH' and not o.name.startswith('Icosphere') for v in o.data.vertices]
 low=Vector([min(p[i] for p in pts) for i in range(3)]);high=Vector([max(p[i] for p in pts) for i in range(3)]);target=(low+high)/2
 look=Vector(direction).normalized();up=look.cross(right).normalized()
 width=max(abs((p-target).dot(right)) for p in pts)*2; height=max(abs((p-target).dot(up)) for p in pts)*2
 render('context-'+name,target,direction,max(width,height)*1.15)
sheet=np.concatenate([np.concatenate(images[3:],axis=1),np.concatenate(images[:3],axis=1)],axis=0);img=bpy.data.images.new('Sheet',width=1440,height=960);img.pixels.foreach_set(sheet.flatten());img.filepath_raw=str(out/'sheet.png');img.file_format='PNG';img.save()
# Medir los pivotes de piezas móviles, sin mover el recurso publicado.
pivots={}
if asset!='horse':
 for spec in r['meshes']:
  obj=next(o for o in objects if o.name==spec['name']);assert (obj.location-Vector(coord(spec['origin']))).length<1e-7;pivots[obj.name]=spec['origin']
  if obj.name.startswith('wheel_'):
   before=obj.location.copy();bpy.context.view_layer.update();tip=max(obj.data.vertices,key=lambda v:abs(v.co.z));a=obj.matrix_world@tip.co;obj.rotation_euler.x=math.radians(45);bpy.context.view_layer.update();assert (obj.location-before).length<1e-10;assert ((obj.matrix_world@tip.co)-a).length>.03;obj.rotation_euler.x=0
if asset in ['cart','fence-gate']:
 for obj in refs:obj.hide_render=True
 poses=[]
 for title,angle in [('rest',0),('middle',45),('open',90)]:
  for obj in objects:
   if obj.name.startswith('wheel_'):obj.rotation_euler.x=math.radians(angle)
   if obj.name=='gate_leaf':obj.rotation_euler.z=math.radians(angle)
  render('pose-'+title,center,views[0][1],span*1.7);poses.append(images[-1])
 img=bpy.data.images.new('Poses',width=1440,height=480);img.pixels.foreach_set(np.concatenate(poses,axis=1).flatten());img.filepath_raw=str(out/'poses.png');img.file_format='PNG';img.save()
 for obj in objects:obj.rotation_euler=(0,0,0)
if asset=='horse':
 skeleton={bone['name']:bone['parent'] for bone in r['rig']['bones']};mule=json.loads((ROOT/'art/recipes/mule/mule.json').read_text());assert skeleton=={bone['name']:bone['parent'] for bone in mule['rig']['bones']}
 assert len(g.get('skins',[]))==1;assert {'idle','walk'}.issubset({a['name'] for a in g['animations']});assert all('JOINTS_0' in p['attributes'] and 'WEIGHTS_0' in p['attributes'] for m in g['meshes'] for p in m['primitives'])
 pivots={b['name']:[b['head'][0],b['head'][2],-b['head'][1]] for b in r['rig']['bones']}
metrics=dict(triangles=tris,limit=r['triangleLimit'],meshCount=len(g['meshes']),primitives=sum(len(m['primitives']) for m in g['meshes']),dimensionsCells=[hi.x-lo.x,hi.z-lo.z,hi.y-lo.y],pivotsMetres=pivots,vertexColors=True,textures=0)
(out/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
dims=' × '.join(f'{x:.4f}' for x in metrics['dimensionsCells']);pivottext='; '.join(f'`{name}`: {p}' for name,p in pivots.items())
(out/'README.md').write_text(f'''# {asset} · candidato del Bloque 7

{r['description']}

- Dimensiones (ancho × alto × fondo): **{dims} celdas**; una celda = 3 m.
- **{tris}/{r['triangleLimit']} triángulos**, {metrics['meshCount']} mallas y primitivas. Un material con COLOR_0 de la paleta; sin texturas.
- Ejes: +Y arriba, frente +Z para objetos, **−X para horse** como la mula. Origen en suelo. Receta en metros; GLB en celdas.
- Mallas/pivotes o huesos (XYZ en metros): {pivottext}.
- Contratos geométricos: `{json.dumps(r['metadata'],ensure_ascii=False)}`.
- `sheet.png`: tres cuartos desde arriba / frente / perfil, y las mismas vistas con villager.glb y house.glb publicados a escala real. `poses.png` en carro y portillo: 0°, 45°, 90°.
- Fuente: `art/recipes/{asset}-candidate/{asset}.json`. Reconstruir desde raíz: `blender --background --python art/recipes/cart-candidate/build.py -- {asset}`.
- Verificado desde GLB: triángulos, primitivas, COLOR_0, ausencia de texturas; pivotes de ruedas después de exportar/importar; caballo de una malla y una skin con jerarquía de mule, clips idle y walk.

Sólo modelo candidato. Pendientes integración, colisiones y rutas (observe-valley-life), ajuste de asiento/paso/enganche y coste en cámara de reposo/móvil. Las poses y clips son preview-only hasta comprobarlos en el Cast real; no se tocó motor ni código del juego.
''',encoding='utf8')
print('VILLAGE_COMPLETE',asset,json.dumps(metrics),flush=True)


if asset=='horse':
 with (out/'README.md').open('a',encoding='utf8') as f:
  f.write('\n## Comparación de estilo y locomoción\n\n`comparison.png`: caballo candidato / mule.glb publicado / deer.glb publicado, columnas de izquierda a derecha; arriba tres cuartos y abajo perfil. Misma cámara ortográfica (1,45 celdas), luz y escala real. La mula publicada lleva su equipo de carga. `comparison-before.png` conserva el primer candidato de 536 triángulos.\n\nLa revisión sube a 748 triángulos: tronco continuo, cuello y hocico con transiciones, cañas hexagonales y cascos biselados. El facetado se acerca a la fauna publicada y la silueta distingue caballo de tiro de mula; se mantiene el límite de 900. El mayor tamaño es intencional: caballo de tiro frente a mula carguera. No había caballo publicado para comparar.\n\n`walk-poses.png` muestra cuatro fases desde el GLB. `animation-metrics.json` prueba idle/walk mediante Three.AnimationMixer: cuatro pies móviles, elevación aproximada 0,061 celdas, zancada declarada 0,2832 celdas. Son clips heredados y adaptados de la receta mule; queda validar sincronización de avance y suelo en Cast real.\n\n`assembly.png` y `assembly-metrics.json` muestran carro y caballo con sus escalas reales. Caballo girado −90° en Y y raíz Z=0,5 celdas; varas a 1,08 m, enganche a 1,1092 m. Quedan aproximadamente 11 cm de holgura lateral total. Las dos correas cortas entre collar y varas y su comportamiento dinámico corresponden a integración futura. Reconstruir comparativas con `blender --background --python art/recipes/horse-candidate/compare.py`; montaje y paso con `preview.py`; validar animación con `node art/recipes/horse-candidate/validate.mjs`.\n')
