"""Revisión del GLB E3 exportado; no fabrica ni publica modelos.

Blender --background --factory-startup --python art/recipes/bastion/review.py
Lee latest-bastion.json y escribe sólo en su corrida, bajo review/.
"""
import bpy
import hashlib
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
latest = json.loads((ROOT / 'artifacts/graphics/G-26/latest-bastion.json').read_text())
run = ROOT / latest['directory']
out = run / 'review'
out.mkdir(exist_ok=True)
candidate = run / 'candidate/bastion.glb'
catalog = json.loads((ROOT / 'art/catalog.json').read_text())


def import_asset(path, offset=(0, 0, 0)):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = list(set(bpy.data.objects) - before)
    for obj in objects:
        if obj.parent is None:
            obj.location += Vector(offset)
    bpy.context.view_layer.update()
    return objects


def bounds(objects):
    points = [obj.matrix_world @ v.co for obj in objects if obj.type == 'MESH' for v in obj.data.vertices]
    # Conversión explícita Blender Z-up → glTF Y-up, sin aplicar otra rotación.
    points = [(p.x, p.z, -p.y) for p in points]
    low = [min(p[i] for p in points) for i in range(3)]
    high = [max(p[i] for p in points) for i in range(3)]
    return {'min': low, 'max': high, 'size': [high[i] - low[i] for i in range(3)]}


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def render(name, location, target, scale, width=1000, height=900):
    camera.location = location
    aim(camera, target)
    camera.data.ortho_scale = scale
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.filepath = str(out / name)
    bpy.ops.render.render(write_still=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
objects = import_asset(candidate)
mesh_objects = [o for o in objects if o.type == 'MESH']
box = bounds(objects)
degenerate = sum(p.area < 1e-12 for o in mesh_objects for p in o.data.polygons)
bad_normals = sum(not all(math.isfinite(v) for v in p.normal) or p.normal.length < .99
                  for o in mesh_objects for p in o.data.polygons)
bad_positions = sum(not all(math.isfinite(v) for v in vert.co)
                    for o in mesh_objects for vert in o.data.vertices)
materials = list({m for o in mesh_objects for m in o.data.materials})
material_report = []
for mat in materials:
    principled = mat.node_tree.nodes.get('Principled BSDF')
    material_report.append({'name': mat.name, 'roughness': principled.inputs['Roughness'].default_value,
                            'metallic': principled.inputs['Metallic'].default_value,
                            'color': list(principled.inputs['Base Color'].default_value)})
assert degenerate == bad_normals == bad_positions == 0
assert all(abs(a-b) < 1e-5 for a, b in zip(box['min'], (0, 0, 0)))
assert all(abs(a-b) < 1e-5 for a, b in zip(box['max'], (1, 1.36, 1)))
assert all(m['roughness'] >= .95 - 1e-6 and m['metallic'] == 0 for m in material_report)
receipt = {'asset': 'bastion', 'status': 'candidate', 'source': 'art/recipes/bastion/bastion.json',
           'glb_sha256': hashlib.sha256(candidate.read_bytes()).hexdigest(), 'boundsYUp': box,
           'degenerateFaces': degenerate, 'invalidNormals': bad_normals, 'nonFiniteVertices': bad_positions,
           'materials': material_report, 'meshCount': len(mesh_objects),
           'note': 'Importación Blender del GLB, no del blend. Cuatro caras simétricas; frente nominal +Z. Sin integración.'}

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world = bpy.data.worlds.new('ReviewWorld')
scene.world.color = (.65, .67, .60)
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
for position, energy, size in [((-3, -4, 7), 600, 5), ((4, 2, 5), 220, 4)]:
    bpy.ops.object.light_add(type='AREA', location=position)
    bpy.context.object.data.energy = energy
    bpy.context.object.data.size = size
    aim(bpy.context.object, (.5, -.5, .6))
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
scene.camera = camera
render('bastion-side.png', (3, -.5, .68), (.5, -.5, .68), 1.7)
render('bastion-top.png', (.5, -.5, 4), (.5, -.5, 0), 1.25)

# Comparación geométrica a escala real. Instancias de GLB aprobados, sin exportarlas.
refs = {a['id']: ROOT / a['approved']['directory'] / (a['id'] + '.glb')
        for a in catalog['assets'] if a['id'] in ('wall', 'watchtower')}
left_wall = import_asset(refs['wall'], (-1, -1, 0))
right_wall = import_asset(refs['wall'], (1, -1, 0))
watchtower = import_asset(refs['watchtower'], (2.5, -1.5, 0))
receipt['referenceSha256'] = {k: hashlib.sha256(v.read_bytes()).hexdigest() for k, v in refs.items()}
receipt['referencePlacement'] = {'leftWall': [-1, -1, 0], 'rightWall': [1, -1, 0], 'watchtower': [2.5, -1.5, 0]}
receipt['comparisonNote'] = 'Banco aislado: dos tramos a coordenadas cardinales ideales y atalaya a escala. No prueba el ensamblador del juego.'
render('comparison-iso.png', (6, -8, 5.2), (1.6, -.5, 1.25), 6.8, 1600, 1000)
render('comparison-side.png', (1.6, -8, 1.35), (1.6, -.5, 1.35), 5.8, 1600, 1000)
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    node = mat.node_tree.nodes.get('Principled BSDF')
    if node:
        color = node.inputs['Base Color'].default_value
        value = .2126 * color[0] + .7152 * color[1] + .0722 * color[2]
        node.inputs['Base Color'].default_value = (value, value, value, 1)
scene.world.color = (.65, .65, .65)
render('comparison-gray.png', (6, -8, 5.2), (1.6, -.5, 1.25), 6.8, 1600, 1000)
receipt['renders'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in out.glob('*.png')}
(out / 'review.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf8')
print('VALLEY_BASTION_REVIEW_OK')
