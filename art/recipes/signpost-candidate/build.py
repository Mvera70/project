"""Cartel del camino: fuente original reproducible, coordenadas de juego en celdas.

Blender 5.2, en segundo plano. Sólo escribe su carpeta de candidato.
"""
import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'artifacts/graphics/astra/signpost'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
COLORS = {'post': '#6b4a2e', 'board': '#a8845a', 'cut': '#795636', 'iron': '#49423a'}
materials = {}
for name, color in COLORS.items():
    rgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
    mat = bpy.data.materials.new('signpost_' + name)
    mat.diffuse_color = (*linear, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = .86
    shader.inputs['Metallic'].default_value = .65 if name == 'iron' else 0
    materials[name] = mat


def coord(point):
    # Juego Y arriba / frente +Z -> Blender Z arriba / frente -Y.
    x, y, z = point
    return (x, -z, y)


def mesh(name, vertices, faces, material):
    data = bpy.data.meshes.new(name)
    data.from_pydata([coord(p) for p in vertices], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(materials[material])
    return obj


def prism(name, outline, back, front, material):
    n = len(outline)
    vertices = [(x, y, z) for z in (back, front) for x, y in outline]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return mesh(name, vertices, faces, material)


def active(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


# Poste escuadrado a hacha: caras anchas, chaflanes estrechos y ligera curvatura.
section = [(-.028, -.04), (.027, -.04), (.04, -.028), (.04, .027),
           (.027, .04), (-.028, .04), (-.04, .027), (-.04, -.027)]
vertices = []
for height, dx, dz, scale in [(0, 0, 0, 1), (.36, -.007, .002, .98),
                              (.76, .004, -.002, .95), (1.078, .009, 0, .91),
                              (1.10, .008, 0, .72)]:
    vertices.extend((x * scale + dx, height, z * scale + dz) for x, z in section)
faces = [tuple(range(8)), tuple(reversed(range(32, 40)))]
for ring in range(4):
    for i in range(8):
        a, b = ring * 8 + i, ring * 8 + (i + 1) % 8
        faces.append((a, a + 8, b + 8, b))
post = mesh('signpost_post', vertices, faces, 'post')

# Una sola tabla, ancho 0,56 y alto 0,20 antes del giro de dos grados.
# La muesca derecha y la esquina astillada pertenecen a su silueta.
outline = [(-.28, -.075), (-.259, -.10), (.237, -.10), (.278, -.083),
           (.28, -.026), (.265, -.017), (.28, -.01), (.28, .070),
           (.252, .096), (-.246, .10), (-.28, .079)]
board = prism('signpost_board', outline, .039, .084, 'board')
active(board)
bevel = board.modifiers.new('Hand_worn_edges', 'BEVEL')
bevel.width = .005
bevel.segments = 1
bpy.ops.object.modifier_apply(modifier=bevel.name)

# Flecha excavada 3 milésimas de celda. El fondo oscuro tiene relieve real.
arrow = [(-.205, -.017), (.092, -.017), (.092, -.050), (.195, 0),
         (.092, .050), (.092, .017), (-.205, .017)]
cutter = prism('CarvingTool', arrow, .080, .11, 'cut')
active(board)
carve = board.modifiers.new('Carved_arrow', 'BOOLEAN')
carve.operation = 'DIFFERENCE'
carve.solver = 'EXACT'
carve.object = cutter
bpy.ops.object.modifier_apply(modifier=carve.name)
bpy.data.objects.remove(cutter, do_unlink=True)
arrow_floor = prism('signpost_arrow_recess', arrow, .08005, .0801, 'cut')

# Dos clavos sujetan la tabla al poste; quedan fuera de la flecha.
nails = []
for index, y in enumerate((-.060, .060)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=3, radius=1,
                                       location=coord((.006, y, .085)))
    nail = bpy.context.object
    nail.name = 'signpost_nail_' + str(index + 1)
    nail.scale = (.008, .004, .008)
    nail.data.materials.append(materials['iron'])
    active(nail)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    nails.append(nail)

# Inclinación solidaria: la flecha y los clavos acompañan a la tablilla.
angle = math.radians(2)
for obj in [board, arrow_floor, *nails]:
    for vertex in obj.data.vertices:
        p = obj.matrix_world @ vertex.co
        x, y = p.x, p.z
        vertex.co = (x * math.cos(angle) - y * math.sin(angle), p.y,
                     .9 + x * math.sin(angle) + y * math.cos(angle))
    obj.location = (0, 0, 0)

# Una malla estática, cuatro materiales, pivote exactamente en el suelo.
objects = [post, board, arrow_floor, *nails]
active(post)
for obj in objects:
    obj.select_set(True)
bpy.ops.object.join()
asset = bpy.context.object
asset.name = 'signpost'
bpy.context.scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.context.view_layer.update()
triangulate = asset.modifiers.new('Export_triangles', 'TRIANGULATE')
bpy.ops.object.modifier_apply(modifier=triangulate.name)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'signpost.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT / 'signpost.glb'), export_format='GLB',
                          use_selection=True, export_yup=True,
                          export_animations=False, export_cameras=False, export_lights=False)
points = [asset.matrix_world @ v.co for v in asset.data.vertices]
runtime = [(p.x, p.z, -p.y) for p in points]
lo = [min(p[i] for p in runtime) for i in range(3)]
hi = [max(p[i] for p in runtime) for i in range(3)]
metrics = {'id': 'signpost', 'triangles': len(asset.data.polygons),
           'boundsRuntimeCells': {'min': lo, 'max': hi, 'size': [hi[i] - lo[i] for i in range(3)]},
           'materials': COLORS, 'textures': 0, 'frontRuntime': '+Z', 'originRuntime': [0, 0, 0],
           'blenderVersion': bpy.app.version_string,
           'glbSha256': hashlib.sha256((OUT / 'signpost.glb').read_bytes()).hexdigest(),
           'sourceSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(OUT / 'metrics.json').write_text(json.dumps(metrics, indent=2) + '\n', encoding='utf-8')

# Las capturas revisan el GLB exportado, vuelto a importar.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT / 'signpost.glb'))
bpy.context.view_layer.update()
imported = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [o.matrix_world @ v.co for o in imported for v in o.data.vertices]
runtime = [(p.x, p.z, -p.y) for p in points]
lo = [min(p[i] for p in runtime) for i in range(3)]
hi = [max(p[i] for p in runtime) for i in range(3)]
cut_faces = [(o, p) for o in imported for p in o.data.polygons
             if o.data.materials[p.material_index].name == 'signpost_cut'
             and (o.matrix_world.to_3x3() @ p.normal).y < -.9]
front_face = max(cut_faces, key=lambda item: item[1].area)
normal = front_face[0].matrix_world.to_3x3() @ front_face[1].normal
metrics['reimportedGlb'] = {
    'triangles': sum(len(p.vertices) - 2 for o in imported for p in o.data.polygons),
    'boundsRuntimeCells': {'min': lo, 'max': hi, 'size': [hi[i] - lo[i] for i in range(3)]},
    'carvingNormalRuntime': [normal.x, normal.z, -normal.y],
    'meshOriginsRuntime': [[o.matrix_world.translation.x, o.matrix_world.translation.z,
                            -o.matrix_world.translation.y] for o in imported],
}
(OUT / 'metrics.json').write_text(json.dumps(metrics, indent=2) + '\n', encoding='utf-8')
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 800
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('ReviewWorld')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.72, .75, .80, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .6
scene.view_settings.view_transform = 'Standard'
bpy.ops.object.light_add(type='AREA', location=(-2, -3, 5))
bpy.context.object.data.energy = 350
bpy.context.object.data.size = 3
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.001))
ground = bpy.context.object
mat = bpy.data.materials.new('Review_ground')
mat.diffuse_color = (.20, .24, .18, 1)
ground.data.materials.append(mat)
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
scene.camera = camera
for name, position, scale in [('three-quarter', (1.6, -3, 1.5), 1.40),
                               ('front', (0, -4, .55), 1.32),
                               ('rear', (-1.8, 3, 1.4), 1.40),
                               ('detail', (.35, -3, 1.4), .78)]:
    target = Vector((0, 0, .90 if name == 'detail' else .55))
    camera.location = position
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = scale
    scene.render.filepath = str(OUT / (name + '.png'))
    bpy.ops.render.render(write_still=True)

# Referencia del aldeano existente, sólo en la captura de escala.
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public/assets/valley3d/villager.glb'))
references = list(set(bpy.context.scene.objects) - before)
for obj in references:
    if obj.parent is None:
        obj.location.x -= .48
bpy.context.view_layer.update()
camera.location = (1.0, -4, 1.6)
target = Vector((-.13, 0, .54))
camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.ortho_scale = 1.45
scene.render.filepath = str(OUT / 'scale.png')
bpy.ops.render.render(write_still=True)

print('SIGNPOST_COMPLETE ' + json.dumps(metrics), flush=True)
