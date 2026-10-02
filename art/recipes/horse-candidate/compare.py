"""Comparación de estilo a igual escala y cámara, caballo/mula/ciervo publicados."""
import bpy,math,sys
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'artifacts/graphics/astra/horse'
def setup():
 bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True;s.render.resolution_x=600;s.render.resolution_y=600;s.render.resolution_percentage=100;s.view_settings.view_transform='Standard';s.world=bpy.data.worlds.new('World');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.72,.62,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.8;bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=450;bpy.context.object.data.size=4;bpy.ops.object.camera_add();c=bpy.context.object;c.data.type='ORTHO';c.data.ortho_scale=1.45;c.data.clip_start=.001;s.camera=c;return s,c
images=[]
for id,path in [('horse',OUT/'horse.glb'),('mule',ROOT/'public/assets/valley3d/mule.glb'),('deer',ROOT/'public/assets/valley3d/deer.glb')]:
 s,c=setup();bpy.ops.import_scene.gltf(filepath=str(path))
 for obj in list(s.objects):
  if obj.type=='ARMATURE':obj.data.pose_position='REST'
 for view,direction in [('three-quarter',(-1.8,-1.2,1.2)),('profile',(0,-3,.08))]:
  target=Vector((-.05,0,.4));c.location=target+Vector(direction)*3;c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/('compare-'+id+'-'+view+'.png'));bpy.ops.render.render(write_still=True);img=bpy.data.images.load(s.render.filepath,check_existing=False);a=np.empty(600*600*4,dtype=np.float32);img.pixels.foreach_get(a);images.append(a.reshape(600,600,4));bpy.data.images.remove(img)
sheet=np.concatenate([np.concatenate([images[i] for i in [1,3,5]],axis=1),np.concatenate([images[i] for i in [0,2,4]],axis=1)],axis=0);img=bpy.data.images.new('Comparison',width=1800,height=1200);img.pixels.foreach_set(sheet.flatten());img.filepath_raw=str(OUT/('comparison-before.png' if '--before' in sys.argv else 'comparison.png'));img.file_format='PNG';img.save()
