import bpy, mathutils, numpy as np, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'artifacts/graphics/astra/house-variants-v2';OUT.mkdir(exist_ok=True)
IDS=['house','house-twin-gable','house-hip-roof','stone-house','stone-house-cross-gable','stone-house-tower-loft']
imgs=[]
for id in IDS:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 path=ROOT/'public/assets/valley3d/house.glb' if id=='house' else ROOT/'artifacts/graphics/astra'/id/(id+'.glb')
 bpy.ops.import_scene.gltf(filepath=str(path));sc=bpy.context.scene
 sc.render.engine='CYCLES';sc.cycles.samples=16;sc.cycles.use_denoising=True
 sc.render.resolution_x=320;sc.render.resolution_y=320;sc.render.resolution_percentage=100
 sc.world=bpy.data.worlds.new('World');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.59,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.7;sc.view_settings.view_transform='Standard'
 bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=500;bpy.context.object.data.size=5
 bpy.ops.mesh.primitive_plane_add(size=100,location=(0,0,-.006));mat=bpy.data.materials.new('Ground');mat.diffuse_color=(.64,.68,.54,1);bpy.context.object.data.materials.append(mat)
 bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.8;sc.camera=cam
 center=mathutils.Vector((1,1,1));cam.location=center+mathutils.Vector((1,-1.15,.9))*15;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(OUT/(id+'.png'));bpy.ops.render.render(write_still=True)
 im=bpy.data.images.load(sc.render.filepath);a=np.empty(320*320*4,dtype=np.float32);im.pixels.foreach_get(a);imgs.append(a.reshape(320,320,4))
# Fila inferior a 42 px por casa aprox. (16 px/celda), ampliada 4x sin suavizado.
small=[a.reshape(80,4,80,4,4).mean(axis=(1,3)) for a in imgs]
smallrow=np.concatenate(small,axis=1)
large=np.concatenate(imgs,axis=1)
scaled=np.repeat(np.repeat(smallrow,4,axis=0),4,axis=1)
sheet=np.concatenate([scaled,large],axis=0)
im=bpy.data.images.new('Comparison',width=1920,height=640);im.pixels.foreach_set(sheet.flatten());im.filepath_raw=str(OUT/'comparison-rest.png');im.file_format='PNG';im.save()
im=bpy.data.images.new('Mobile',width=480,height=80);im.pixels.foreach_set(smallrow.flatten());im.filepath_raw=str(OUT/'comparison-small.png');im.file_format='PNG';im.save()
(OUT/'README.md').write_text('Comparativa V2, 2 oct 2026. Orden izquierda a derecha: '+', '.join(IDS)+'. Cámara ortográfica del juego: Blender (1, -1.15, 0.9), escala idéntica para todas. Fila inferior reducida a 21 px/celda y ampliada 4x sin suavizado; comparison-small.png conserva la tira 1:1. La básica se importa de public sin modificación. Renders sobre GLB exportado.',encoding='utf8')
