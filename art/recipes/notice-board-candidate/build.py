"""Blender --background --python art/recipes/notice-board-candidate/build.py.
Exporta los siete candidatos sin publicar; colores de la paleta en COLOR_0.
"""
import bpy, json, math, ast, sys
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix
ROOT=Path(__file__).resolve().parents[3]
# Reutilizar exactamente las primitivas del constructor canónico, sin ejecutar su CLI.
source=ast.parse((ROOT/'tools/art/blender-build.py').read_text(encoding='utf8'))
defs=ast.Module(body=[n for n in source.body if isinstance(n,ast.FunctionDef) and n.name in ['create_primitive','hex_rgba']],type_ignores=[])
exec(compile(defs,'blender-build.py','exec'))
palette=json.loads((ROOT/'art/recipes/palette.json').read_text()); colors={**palette['valley'],**palette['houses']['thatched']}
ids=['notice-board','smithy-board','chapel-board','tailor-board','signpost','hide-rack','hammer']
if '--' in sys.argv: ids=sys.argv[sys.argv.index('--')+1:]
def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def aim(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def import_ref(id,offset):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d'/f'{id}.glb'))
    new=set(bpy.data.objects)-before
    for ob in new:
        if ob.parent is None: ob.location+=Vector(offset)
    return new
for id in ids:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    recipe=json.loads((ROOT/'art/recipes'/f'{id}-candidate'/f'{id}.json').read_text())
    out=ROOT/'artifacts/graphics/astra'/id;out.mkdir(parents=True,exist_ok=True)
    material=bpy.data.materials.new(id+'_palette');material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.92
    vc=material.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color'
    material.node_tree.links.new(vc.outputs['Color'],shader.inputs['Base Color'])
    mats={m['name']:material for m in recipe['materials']}; rgba={m['name']:tuple(linear(int(colors[m['role']][i:i+2],16)/255) for i in (1,3,5))+(1,) for m in recipe['materials']}
    groups={}
    for spec in recipe['primitives']+recipe.get('polygonMeshes',[]):
        if 'faces' in spec:
            mesh=bpy.data.meshes.new(spec['name']);mesh.from_pydata(spec['vertices'],[],spec['faces']);mesh.update()
            ob=bpy.data.objects.new(spec['name'],mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(material)
        else:
            ob=create_primitive(spec,mats)
            if spec['type']=='cube': ob.rotation_euler=tuple(math.radians(v) for v in spec['rotationDegrees'])
        attr=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        for item in attr.data: item.color=rgba[spec['material']]
        # Escala horneada; no raíz 1/3 que altere el agarre al colgar del hueso.
        ob.location*=recipe['scale']; ob.scale*=recipe['scale']
        groups.setdefault(spec['parent'] if spec['parent'].startswith(('hide_','note_')) else id,[]).append(ob)
    models=[]
    for name,obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in obs: ob.select_set(True)
        bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();ob=bpy.context.object
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');ob.name='frame' if id=='hide-rack' and name==id else name
        models.append(ob)
    if id=='hammer':
        grip=bpy.data.objects.new('grip',None);bpy.context.collection.objects.link(grip)
    triangles=sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in models)
    assert triangles<=recipe['triangleBudget'],(id,triangles,recipe['triangleBudget'])
    bounds=[ob.matrix_world@Vector(c) for ob in models for c in ob.bound_box]
    lo=[min(v[i] for v in bounds) for i in range(3)];hi=[max(v[i] for v in bounds) for i in range(3)]
    stats=dict(id=id,triangles=triangles,budget=recipe['triangleBudget'],meshes=[ob.name for ob in models],materials=1,textures=0,sizeGltf=[hi[0]-lo[0],hi[2]-lo[2],hi[1]-lo[1]],origin='hand_r grip' if id=='hammer' else 'base',front='+Z')
    (out/'metrics.json').write_text(json.dumps(stats,indent=2)+'\n')
    bpy.ops.export_scene.gltf(filepath=str(out/f'{id}.glb'),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
    # Hoja de contexto y tres vistas. Las referencias tienen la escala publicada.
    person=import_ref('villager',(-.72,0,0))
    if id=='hammer':
        arm=next(o for o in person if o.type=='ARMATURE')
        # Pose de trabajo para inspeccionar el anclaje del arma sobre la mano real.
        if arm.animation_data: arm.animation_data_clear()
        for bone in arm.pose.bones:
            if bone.name=='upperarm.R': bone.rotation_mode='XYZ';bone.rotation_euler.x=-.8
        bpy.context.view_layer.update()
        hand=next((o for o in person if o.name=='hand_r'),None)
        if hand is None: raise RuntimeError('Falta hand_r')
        position,rotation,scale=hand.matrix_world.decompose()
        for ob in models: ob.matrix_world=Matrix.LocRotScale(position,rotation,Vector((1,1,1)))
    house=import_ref('house',(1.65,.4,0))
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object
    ground=bpy.data.materials.new('preview_ground');ground.diffuse_color=(.22,.29,.17,1);floor.data.materials.append(ground)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
    scene.render.resolution_x=640;scene.render.resolution_y=600;scene.render.resolution_percentage=100
    scene.world.color=(.35,.35,.35);scene.view_settings.view_transform='Standard'
    bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=650;bpy.context.object.data.size=5
    bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
    for name,position in [('quarter',(3,-6,4)),('front',(0,-7,1.3)),('profile',(7,0,1.3))]:
        for ob in house: ob.hide_render=True
        cam.location=position;aim(cam,(-.20,0,.6));cam.data.ortho_scale=2.0 if id!='hammer' else 1.35
        scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
    for ob in house: ob.hide_render=False
    cam.location=(4,-7,4.5);aim(cam,(.75,.2,.65));cam.data.ortho_scale=4.5
    scene.render.filepath=str(out/'context.png');bpy.ops.render.render(write_still=True)
    print('BLOCK1_OK',json.dumps(stats),flush=True)
