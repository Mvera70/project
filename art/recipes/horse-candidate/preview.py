"""Poses de paso y montaje del caballo con carro, desde GLB exportados."""
import bpy, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'artifacts/graphics/astra/horse'
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=True;s.render.resolution_x=600;s.render.resolution_y=600;s.render.resolution_percentage=100;s.view_settings.view_transform='Standard';s.world=bpy.data.worlds.new('World');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.72,.62,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.8
bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=450;bpy.context.object.data.size=4;bpy.ops.object.camera_add();c=bpy.context.object;c.data.type='ORTHO';c.data.clip_start=.001;s.camera=c
before=set(s.objects);bpy.ops.import_scene.gltf(filepath=str(OUT/'horse.glb'));horse=set(s.objects)-before;arm=next(o for o in horse if o.type=='ARMATURE')
for track in arm.animation_data.nla_tracks:track.mute=True
arm.animation_data.action=next(a for a in bpy.data.actions if a.name=='walk');arm.animation_data.action_slot=arm.animation_data.action.slots[0];arm.data.pose_position='POSE'
images=[]
def render(name,target,direction,scale):
 c.location=Vector(target)+Vector(direction)*3;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=scale;s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);img=bpy.data.images.load(s.render.filepath,check_existing=False);a=np.empty(600*600*4,dtype=np.float32);img.pixels.foreach_get(a);images.append(a.reshape(600,600,4));bpy.data.images.remove(img)
for frame in [1,17,33,49]:
 s.frame_set(frame);render('walk-'+str(frame),(-.05,0,.4),(0,-3,.08),1.35)
img=bpy.data.images.new('Walk',width=2400,height=600);img.pixels.foreach_set(np.concatenate(images,axis=1).flatten());img.filepath_raw=str(OUT/'walk-poses.png');img.file_format='PNG';img.save()
arm.data.pose_position='REST'
for obj in horse:
 if obj.parent not in horse:obj.rotation_euler.z=math.pi/2;obj.location.y-=.50
bpy.ops.import_scene.gltf(filepath=str(ROOT/'artifacts/graphics/astra/cart/cart.glb'));s.frame_set(1);render('assembly',(0,-.24,.28),(1.2,-1.8,1.5),1.85)
horsewidth=json.loads((OUT/'metrics.json').read_text())['dimensionsCells'][2]*3
metrics=dict(shaftInnerWidthMetres=.945,horseMaximumWidthMetres=horsewidth,totalLateralClearanceMetres=.945-horsewidth,wheelRadiusMetres=.60,wheelAxis='X',cartShaftTipZCells=2.32/3,horseRotationYDegrees=-90,horseRootZCells=.5,hitchZCells=.5+.7*1.18/3,shaftHeightMetres=1.08,hitchHeightMetres=.94*1.18,pending='Hitch requires two short traces/straps or future runtime attachment; shafts clear flank, no rigid direct join. Preview only.')
assert metrics['totalLateralClearanceMetres']>.07
(OUT/'assembly-metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
