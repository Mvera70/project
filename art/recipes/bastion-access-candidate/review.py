"""Mide los bytes reimportados y fotografía el candidato sin publicar."""
import bpy
import hashlib
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'artifacts/graphics/E3-access-candidate'
CANDIDATE = OUT / 'bastion-access-candidate.glb'

def load(path, offset=(0, 0, 0)):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = list(set(bpy.data.objects) - before)
    for obj in objects:
        if obj.parent is None:
            obj.location += Vector(offset)
    bpy.context.view_layer.update()
    return objects

def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

def render(name, position, target, scale):
    camera.location = position
    camera.data.ortho_scale = scale
    aim(camera, target)
    scene.render.filepath = str(OUT / name)
    bpy.ops.render.render(write_still=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
objects = load(CANDIDATE)
meshes = [o for o in objects if o.type == 'MESH']
points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
points = [(p.x, p.z, -p.y) for p in points]
low = [min(p[i] for p in points) for i in range(3)]
high = [max(p[i] for p in points) for i in range(3)]
triangles = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
degenerate = sum(p.area < 1e-12 for o in meshes for p in o.data.polygons)
invalid = sum(not all(math.isfinite(v) for v in p.normal) or p.normal.length < .99
              for o in meshes for p in o.data.polygons)
assert degenerate == invalid == 0
assert all(abs(a-b) < 1e-5 for a, b in zip(low, [0, 0, 0]))
assert all(abs(a-b) < 1e-5 for a, b in zip(high, [1, 1.36, 2]))
assert triangles <= 1300
material_data = []
for mat in {m for o in meshes for m in o.data.materials}:
    node = mat.node_tree.nodes.get('Principled BSDF')
    material_data.append({'name': mat.name, 'roughness': node.inputs['Roughness'].default_value,
                          'metallic': node.inputs['Metallic'].default_value})
assert len(meshes) == len(material_data) == 2
receipt = {'status': 'candidate-not-approved', 'bytes': CANDIDATE.stat().st_size,
           'sha256': hashlib.sha256(CANDIDATE.read_bytes()).hexdigest(),
           'boundsYUp': {'min': low, 'max': high}, 'triangles': triangles,
           'meshes': len(meshes), 'materials': material_data,
           'degenerateFaces': degenerate, 'invalidNormals': invalid,
           'blender': bpy.app.version_string, 'validation': 'Blender GLB reimport; not game integration'}
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world = bpy.data.worlds.new('ReviewWorld')
scene.world.color = (.65, .67, .60)
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
for position, energy in [((-3, -4, 7), 600), ((4, 2, 5), 220)]:
    bpy.ops.object.light_add(type='AREA', location=position)
    bpy.context.object.data.energy = energy
    bpy.context.object.data.size = 5
    aim(bpy.context.object, (.5, -1, .6))
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
scene.camera = camera
render('candidate-iso.png', (3.4, -4.3, 3), (.5, -1, .6), 2.8)
render('candidate-side.png', (5, -1, .68), (.5, -1, .68), 2.6)
render('candidate-top.png', (.5, -1, 5), (.5, -1, 0), 2.5)
# Guías sólo para revisión: las celdas y la ruta nunca entran en el GLB.
guides = []
def guide(name, points, color):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = .008
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for vertex, point in zip(spline.points, points):
        vertex.co = (point[0], -point[1], point[2], 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (*color, 1)
    curve.materials.append(mat)
    guides.append(obj)
guide('TowerCell', [(0,0,1.40),(1,0,1.40),(1,1,1.40),(0,1,1.40),(0,0,1.40)], (.2,.65,.3))
guide('InteriorCell', [(0,1,1.40),(1,1,1.40),(1,2,1.40),(0,2,1.40),(0,1,1.40)], (.8,.35,.12))
guide('Route', [(.5,2.4,1.41),(.5,2,1.41),(.5,1,1.41),(.5,.58,1.41)], (.15,.45,.95))
render('footprint-route.png', (.5, -1.2, 5), (.5, -1.2, 0), 3.8)
for obj in guides:
    obj.hide_render = True
catalog = json.loads((ROOT / 'art/catalog.json').read_text())
refs = {a['id']: ROOT / a['approved']['directory'] / (a['id'] + '.glb')
        for a in catalog['assets'] if a['id'] in ('wall', 'bastion')}
load(refs['wall'], (-1, -1, 0))
load(refs['wall'], (1, -1, 0))
render('candidate-wall.png', (4, -6, 3.8), (.5, -.8, .6), 4.3)
load(refs['bastion'], (3, 0, 0))
render('comparison-g26.png', (5, -7, 4.4), (1.7, -.8, .6), 6.4)
receipt['references'] = {k: {'path': str(v), 'sha256': hashlib.sha256(v.read_bytes()).hexdigest()} for k, v in refs.items()}
receipt['artifacts'] = {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                        for p in OUT.iterdir() if p.suffix in ('.png', '.glb', '.blend', '.json') and p.name != 'validation.json'}
(OUT / 'validation.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf8')
print('VALLEY_ACCESS_REVIEW_OK ' + json.dumps(receipt))
