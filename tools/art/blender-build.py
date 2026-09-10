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
    elif spec['type'] == 'cylinder':
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=spec['vertices'], radius=spec['radius'], depth=spec['depth'],
            location=location, rotation=tuple(math.radians(value) for value in spec['rotationDegrees']),
        )
    elif spec['type'] == 'gable':
        width = spec['width']
        depth = spec['depth']
        height = spec['height']
        vertices = [
            (-width / 2, -depth / 2, 0), (width / 2, -depth / 2, 0),
            (0, -depth / 2, height), (-width / 2, depth / 2, 0),
            (width / 2, depth / 2, 0), (0, depth / 2, height),
        ]
        faces = [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
        mesh = bpy.data.meshes.new(spec['name'] + '_Mesh')
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(spec['name'], mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = tuple(math.radians(value) for value in spec['rotationDegrees'])
    else:
        raise ValueError('Unsupported primitive: ' + spec['type'])
    obj = bpy.context.object if spec['type'] != 'gable' else obj
    obj.name = spec['name']
    obj.data.materials.append(materials[spec['material']])
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if spec['smooth']:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    if spec['bevel'] > 0:
        bevel = obj.modifiers.new(name='Soft_Edges', type='BEVEL')
        bevel.width = spec['bevel']
        bevel.segments = 2
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


def point_at(obj, target):
    direction = mathutils.Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


# G-04: los módulos hermanos viven junto a este script, y Blender no los tiene
# en su ruta de importación por estar arrancado desde otro sitio.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rig as rig_module          # noqa: E402
import animate as animate_module  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
recipe_path = os.path.abspath(args[0])
output_dir = os.path.abspath(args[1])
asset_id = args[2]
# G-04 · 'rigid' o 'smooth'. Lo normal es rígida; `skin-bench.ts` pide la otra
# para poder comparar las dos con la misma receta, que es lo que D.4 exige.
skin_mode = args[3] if len(args) > 3 else 'rigid'
if skin_mode not in ('rigid', 'smooth'):
    raise SystemExit("Unknown skin mode '%s'." % skin_mode)
os.makedirs(output_dir, exist_ok=True)

with open(recipe_path, 'r', encoding='utf-8') as source:
    recipe = json.load(source)

bpy.ops.wm.read_factory_settings(use_empty=True)
materials = {spec['name']: make_material(spec) for spec in recipe['materials']}
groups = {}
for spec in recipe['groups']:
    group = bpy.data.objects.new(spec['name'], None)
    group.empty_display_type = 'PLAIN_AXES'
    group.location = tuple(spec['location'])
    bpy.context.collection.objects.link(group)
    groups[spec['name']] = group
for spec in recipe['groups']:
    if spec['parent'] is not None:
        groups[spec['name']].parent = groups[spec['parent']]
pieces = {}
for primitive in recipe['primitives']:
    obj = create_primitive(primitive, materials)
    if primitive['parent'] is not None:
        obj.parent = groups[primitive['parent']]
    pieces[primitive['name']] = obj

# G-04 · rig y clips, sólo si la receta los declara. Un recurso sin `rig` se
# construye exactamente igual que antes: G-03 tiene que seguir reproduciéndose.
built_clips = []
if recipe.get('rig') is not None:
    armature = rig_module.build_armature(recipe['rig'], recipe['rig'].get('name', asset_id + '_Rig'))
    if recipe['rig'].get('parent') is not None:
        armature.parent = groups[recipe['rig']['parent']]
    # Los conectores de D.4 son puntos de la escena, y tienen que seguir a su
    # hueso: una herramienta en la mano se mueve con la mano.
    bindable = dict(pieces)
    bindable.update(groups)
    rig_module.bind_rigid(armature, bindable, recipe['rig']['bind'], smooth=skin_mode == 'smooth')
    # `clips` son los nombres —el índice que va al catálogo— y
    # `clipDefinitions` son los clips de verdad, con sus huesos y fotogramas.
    definitions = recipe.get('clipDefinitions') or []
    if definitions:
        built_clips = animate_module.build_clips(armature, definitions)

# G-06 · de metros a celdas. Se aplica al final y sobre las raices, que arrastran
# a todo lo que cuelga de ellas: piezas, esqueleto y las traslaciones de hueso de
# los clips. Antes de esto el aldeano medi'a dos celdas, tanto como el ancho de
# la casa en la que vivia.
scale = recipe.get('scale', 1)
if scale != 1:
    for obj in list(bpy.context.scene.objects):
        if obj.parent is None:
            obj.scale = (obj.scale[0] * scale, obj.scale[1] * scale, obj.scale[2] * scale)
            obj.location = tuple(component * scale for component in obj.location)

# G-09 - unir las mallas por material, despues de atar y de animar.
#
# Un aldeano son dieciocho mallas y tres materiales, y medido en el banco los
# aldeanos eran el 87 % de las llamadas de dibujo. Unir no cambia un triangulo
# ni un peso: los grupos de vertices y el modificador de armadura viajan con
# cada malla al unirse, asi que el esqueleto sigue moviendo lo mismo.
#
# Va DESPUES del atado a proposito. Unir antes dejaria una sola malla a la que
# atar entera a un solo hueso, que es la figura rigida de una pieza.
# Vale con esqueleto y sin el. La condicion de que hubiera rig sobraba: lo que
# importa es que la union ocurra despues de atar, y un recurso sin rig no tiene
# nada que atar. Con ella puesta, un arbol pedia unirse y no se unia.
if recipe.get('mergeByMaterial'):
    by_material = {}
    for name, obj in pieces.items():
        if obj.type != 'MESH' or not obj.data.materials:
            continue
        by_material.setdefault(obj.data.materials[0].name, []).append(obj)

    bpy.ops.object.mode_set(mode='OBJECT')
    for material_name, group in sorted(by_material.items()):
        bpy.ops.object.select_all(action='DESELECT')
        for obj in group:
            obj.select_set(True)
        head = group[0]
        bpy.context.view_layer.objects.active = head
        if len(group) > 1:
            bpy.ops.object.join()
        head.name = asset_id + '_' + material_name
        head.data.name = head.name + '_Mesh'
    bpy.ops.object.select_all(action='DESELECT')

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
# `export_animations` con acciones sueltas necesita el modo por NLA/acciones:
# sin él sólo viaja la acción activa y los otros tres clips se quedan en el
# `.blend`, que es justo el fallo que D.4 avisa de no dar por bueno.
export_kwargs = dict(
    filepath=os.path.join(output_dir, asset_id + '.glb'),
    export_format='GLB', export_yup=True, export_cameras=False, export_lights=False,
)
if built_clips:
    export_kwargs.update(
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_force_sampling=True,
        export_frame_range=False,
        export_optimize_animation_size=False,
    )
bpy.ops.export_scene.gltf(**export_kwargs)
bpy.ops.render.render(write_still=True)
if built_clips:
    print('VALLEY_ART_CLIPS:' + json.dumps(built_clips))
print('VALLEY_ART_BUILD_OK:' + asset_id)
