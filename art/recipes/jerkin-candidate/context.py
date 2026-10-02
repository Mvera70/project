"""Añade referencia de casa a las hojas sin reconstruir ni modificar los GLB."""
from pathlib import Path
# Reutilizar únicamente las definiciones de coordenadas del constructor.
source=Path(__file__).with_name('build.py').read_text(encoding='utf8')
exec(compile(source.split('for id in ids:')[0],str(Path(__file__).with_name('build.py')),'exec'))
for id in ids:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    out=ROOT/'artifacts/graphics/astra'/id
    mount=json.loads((out/'metrics.json').read_text())['mount']
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d/villager.glb'))
    for ob in bpy.context.scene.objects:
        if ob.type=='ARMATURE':ob.data.pose_position='REST'
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(out/f'{id}.glb'))
    for ob in set(bpy.context.scene.objects)-before:
        if ob.type=='MESH':ob.matrix_world=B@anchors[mount[ob.name]]@B.inverted()@ob.matrix_world
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d/house.glb'))
    for ob in set(bpy.context.scene.objects)-before:
        if ob.parent is None:ob.location+=Vector((1.45,.65,0))
    bpy.context.view_layer.update()
    points=[ob.matrix_world@Vector(corner) for ob in bpy.context.scene.objects if ob.type=='MESH' for corner in ob.bound_box]
    lower=Vector([min(v[i] for v in points) for i in range(3)]);upper=Vector([max(v[i] for v in points) for i in range(3)])
    target=(lower+upper)/2
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.008))
    ground=bpy.data.materials.new('ground');ground.diffuse_color=(.34,.35,.30,1);bpy.context.object.data.materials.append(ground)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=600;scene.render.resolution_y=720;scene.render.resolution_percentage=100
    scene.world.color=(.35,.35,.35);scene.view_settings.view_transform='Standard'
    bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=650;bpy.context.object.data.size=5
    bpy.ops.object.camera_add(location=(3,-6,3.7));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=4.6;scene.camera=camera
    camera.location=target+Vector((2,-6,3.2));aim(camera,target);bpy.context.view_layer.update()
    projected=[camera.matrix_world.inverted()@v for v in points]
    width=max(v.x for v in projected)-min(v.x for v in projected);height=max(v.y for v in projected)-min(v.y for v in projected)
    camera.data.ortho_scale=max(width*720/600,height)*1.18
    scene.render.filepath=str(out/'context.png');bpy.ops.render.render(write_still=True)
    print('CONTEXT_OK',id,flush=True)
