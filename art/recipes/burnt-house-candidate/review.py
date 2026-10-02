"""Reimporta GLB y compara candidato anterior/nuevo/house con cámara del juego."""
import bpy,json,struct
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'artifacts/graphics/astra/house-burnt'
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.72,.62,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=450;bpy.context.object.data.size=5;bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.clip_start=.001;scene.camera=cam
sets={};roots={}
for name,path in [('before',ROOT/'artifacts/graphics/astra/burnt-house/burnt-house.glb'),('after',OUT/'house-burnt.glb'),('house',ROOT/'public/assets/valley3d/house.glb'),('villager',ROOT/'public/assets/valley3d/villager.glb')]:
 before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(path));sets[name]=list(set(scene.objects)-before);roots[name]=[(o,o.location.copy()) for o in sets[name] if o.parent not in sets[name]]
 for o in sets[name]:o.hide_render=True

def show(names):
 for name,objs in sets.items():
  for o in objs:o.hide_render=name not in names or o.name.startswith('Icosphere')

def render(name,target,direction,scale,width=600,height=600):
 scene.render.resolution_x=width;scene.render.resolution_y=height;scene.render.resolution_percentage=100;cam.location=Vector(target)+Vector(direction)*6;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);img=bpy.data.images.load(scene.render.filepath,check_existing=False);a=np.empty(width*height*4,dtype=np.float32);img.pixels.foreach_get(a);bpy.data.images.remove(img);return a.reshape(height,width,4)
def save(name,a):
 img=bpy.data.images.new(name,width=a.shape[1],height=a.shape[0]);img.pixels.foreach_set(a.flatten());img.filepath_raw=str(OUT/(name+'.png'));img.file_format='PNG';img.save()
views=[('rest',(1,-1.15,.9)),('front',(0,-1,.015)),('profile',(1,0,.015))];single=[];context=[];comparison=[];native=[]
for name in ['before','after','house']:
 show([name]);comparison.append(render('compare-'+name,(1,1,.70),views[0][1],3.5));pixels=render('rest-native-'+name,(1,1,.70),views[0][1],26,390,844);native.append(pixels[342:502,75:315])
save('comparison',np.concatenate(comparison,axis=1));save('rest-native-strip',np.concatenate(native,axis=1))
for name,direction in views:
 show(['after']);single.append(render(name,(1,1,.70),direction,3.5));show(['after','house','villager']);right=Vector((-direction[1],direction[0],0)).normalized()
 for key,offset in [('house',3.1),('villager',-1.8)]:
  for obj,initial in roots[key]:obj.location=initial+right*offset+(Vector((1,1,0)) if key=='villager' else Vector((0,0,0)))
 bpy.context.view_layer.update();context.append(render('context-'+name,Vector((1,1,.7))+right*1.1,direction,7.5))
 for key in ['house','villager']:
  for obj,initial in roots[key]:obj.location=initial
save('sheet',np.concatenate([np.concatenate(context,axis=1),np.concatenate(single,axis=1)],axis=0))
# Contrato de articulación y material después de serializar.
def gltf(path):
 data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];return json.loads(data[20:20+length])
a=gltf(ROOT/'artifacts/graphics/astra/burnt-house/burnt-house.glb');b=gltf(OUT/'house-burnt.glb');old={n['name']:n for n in a['nodes']};new={n['name']:n for n in b['nodes']}
for name,node in old.items():
 assert name in new;assert max(abs(x-y) for x,y in zip(node.get('translation',[0,0,0]),new[name].get('translation',[0,0,0])))<1e-6
for n in new.values():assert n.get('scale',[1,1,1])==[1,1,1] and n.get('rotation',[0,0,0,1])==[0,0,0,1]
assert len(b['meshes'])==8 and sum(len(m['primitives']) for m in b['meshes'])==8 and len(b['materials'])==1 and not b.get('textures');assert all('COLOR_0' in p['attributes'] for m in b['meshes'] for p in m['primitives'])
assert all(not any(m.get('emissiveFactor',[0,0,0])) for m in b['materials'])
tris=lambda g:sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
assert tris(b)<=1200
metrics=dict(beforeTriangles=tris(a),afterTriangles=tris(b),beforePrimitives=sum(len(m['primitives']) for m in a['meshes']),afterPrimitives=sum(len(m['primitives']) for m in b['meshes']),materialCount=len(b['materials']),pivotNamesAndTranslationsPreserved=True,identityRotationScale=True,vertexColors=True,emissive=False,restDirectionThree=[1,.9,1.15],restNativeViewport=[390,844],restNativeOrthographicHeight=26,comparisonColumns=['before','after','house'])
(OUT/'validation.json').write_text(json.dumps(metrics,indent=2)+'\n');print('VALIDATED',metrics)
