"""Fauna candidata y publicada: misma cámara y escala, más diagnóstico cercano."""
import bpy,sys,json,struct,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
tag=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'before'
out=ROOT/'artifacts/graphics/astra/stork'/('comparison-'+tag);out.mkdir(parents=True,exist_ok=True)
for id in ['stork','chick','crane','butterfly','hen','swallow','fox','mule']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path=ROOT/('artifacts/graphics/astra/'+id+'/'+id+'.glb' if id in ['stork','chick','crane','butterfly'] else 'public/assets/valley3d/'+('bird' if id=='swallow' else id)+'.glb')
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in bpy.context.scene.objects:
        if o.type=='ARMATURE':o.data.pose_position='REST'
    bpy.context.view_layer.update()
    points=[];depsgraph=bpy.context.evaluated_depsgraph_get()
    for o in meshes:
        evaluated=o.evaluated_get(depsgraph);mesh=evaluated.to_mesh();points.extend(evaluated.matrix_world@v.co for v in mesh.vertices);evaluated.to_mesh_clear()
    low=Vector([min(v[i] for v in points) for i in range(3)]);high=Vector([max(v[i] for v in points) for i in range(3)]);center=(low+high)/2
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=480;scene.render.resolution_y=480;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard'
    scene.world=bpy.data.worlds.new('World');scene.world.color=(.35,.35,.35)
    bpy.ops.object.light_add(type='AREA',location=(-3,-4,6));bpy.context.object.data.energy=450;bpy.context.object.data.size=4
    bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
    cam.location=center+Vector((1.2,-1.8,1.5))*3;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    for mode,scale in [('scale',1.4),('detail',max(high-low)*1.4)]:
        cam.data.ortho_scale=scale;scene.render.filepath=str(out/(id+'-'+mode+'.png'));bpy.ops.render.render(write_still=True)
