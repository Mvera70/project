import bpy
import json
import math
import mathutils
import os
import sys


def hex_rgba(value):
    return tuple(int(value[index:index + 2], 16) / 255 for index in (1, 3, 5)) + (1.0,)


def make_material(spec):
    material = bpy.data.materials.new(spec['name'])
    color = hex_rgba(spec['color'])
    material.diffuse_color = color
    material.use_nodes = True
    principled = material.node_tree.nodes.get('Principled BSDF')
    principled.inputs['Base Color'].default_value = color
    principled.inputs['Roughness'].default_value = spec['roughness']
    return material


def create_primitive(spec, materials):
    location = tuple(spec['location'])
    if spec['type'] == 'cube':
        bpy.ops.mesh.primitive_cube_add(location=location)
        bpy.context.object.dimensions = tuple(spec['dimensions'])
    elif spec['type'] == 'cone':
        rotation = tuple(math.radians(value) for value in spec['rotationDegrees'])
        bpy.ops.mesh.primitive_cone_add(
            vertices=spec['vertices'], radius1=spec['radius'], radius2=0.0,
            depth=spec['depth'], location=location, rotation=rotation,
        )
    elif spec['type'] == 'sphere':
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=spec['segments'], ring_count=spec['rings'],
            radius=spec['radius'], location=location,
        )
    else:
        raise ValueError('Unsupported primitive: ' + spec['type'])
    obj = bpy.context.object
    obj.name = spec['name']
    obj.data.materials.append(materials[spec['material']])
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return obj


def point_at(obj, target):
    direction = mathutils.Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


args = sys.argv[sys.argv.index('--') + 1:]
recipe_path = os.path.abspath(args[0])
output_dir = os.path.abspath(args[1])
asset_id = args[2]
os.makedirs(output_dir, exist_ok=True)

with open(recipe_path, 'r', encoding='utf-8') as source:
    recipe = json.load(source)

bpy.ops.wm.read_factory_settings(use_empty=True)
materials = {spec['name']: make_material(spec) for spec in recipe['materials']}
for primitive in recipe['primitives']:
    create_primitive(primitive, materials)

render = recipe['referenceRender']
bpy.ops.object.light_add(type='AREA', location=(-3.5, -4.0, 7.0))
bpy.context.object.data.energy = 900
bpy.context.object.data.shape = 'DISK'
bpy.context.object.data.size = 5.0
bpy.ops.object.light_add(type='AREA', location=(4.0, 1.0, 4.0))
bpy.context.object.data.energy = 350
bpy.context.object.data.size = 3.0
bpy.ops.object.camera_add(location=tuple(render['cameraLocation']))
camera = bpy.context.object
bpy.context.scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = render['orthoScale']
point_at(camera, render['cameraTarget'])

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = render['width']
scene.render.resolution_y = render['height']
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = os.path.join(output_dir, asset_id + '-blender.png')
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('ValleyWorld')
scene.world.color = hex_rgba(render['worldColor'])[:3]

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(output_dir, asset_id + '.blend'))
bpy.ops.export_scene.gltf(
    filepath=os.path.join(output_dir, asset_id + '.glb'),
    export_format='GLB', export_yup=True, export_cameras=False, export_lights=False,
)
bpy.ops.render.render(write_still=True)
print('VALLEY_ART_BUILD_OK:' + asset_id)
