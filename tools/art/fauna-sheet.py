"""La hoja de capturas de un animal: a la cámara de reposo, a escala de móvil y
junto a sus vecinos del valle, y el antes y después. 2 oct 2026 (v5.100).

Nació para los animales rehechos (cigüeña, nido, polluelo, grulla, mariposa y
caballo): Vera tenía que elegir entre los candidatos de Astra y los nuevos, y
cada candidato traía su hoja con su luz, su cámara y su escala, así que no se
podían poner uno al lado del otro. Aquí todos los GLB se fotografían igual:

  · **la cámara de reposo del juego** —el vector `VIEW` de `camera.ts`,
    (1; 0,9; 1,15) en three, que en Blender es (1; −1,15; 0,9)— en ortográfica;
  · **la escala de móvil**: a la altura de reposo (`RESTING_HEIGHT_MAX`, 26
    celdas en 844 px) una celda son 32 píxeles; el panel se dibuja grande y se
    reduce a esa escala, y se enseña a 1:1 y ampliado ×4 sin suavizar;
  · **la misma luz** para todos, y el GLB en su pose de reposo (sin clips).

Uso (con `pip install bpy==5.0.1 pillow`, sin Blender instalado):

  python3 tools/art/fauna-sheet.py -- <hoja.json>

La hoja es un JSON con `out` (el PNG), `title` y `rows`; cada fila, `label` y
`panels`; cada panel, `title`, `kind` (`detail`, `profile`, `front`, `mobile`) y
`models`: `[{ "glb": ruta, "x": celdas, "z": celdas, "turn": grados, "lift": celdas, "clip": nombre, "at": fracción }]`.
Un panel `detail` encuadra lo que haya; `scale` (celdas de alto) lo fija.
"""
import bpy, json, math, sys, os
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPEC = json.load(open(sys.argv[sys.argv.index('--') + 1]))
PANEL = 520
# La cámara de reposo del juego, en ejes de Blender.
VIEWS = {'detail': (1, -1.15, 0.9), 'mobile': (1, -1.15, 0.9), 'profile': (0, -1, 0.08), 'front': (-1, 0, 0.08)}
PX_PER_CELL = 32


def still(path):
    # El GLB sin clips: el importador de Blender deja los nodos en la pose del
    # primer clip aunque se le quite la acción, y la hoja tiene que enseñar el
    # reposo que trae el GLB.
    import struct, tempfile
    blob = open(path, 'rb').read()
    n = struct.unpack_from('<I', blob, 12)[0]
    gltf = json.loads(blob[20:20 + n])
    if 'animations' not in gltf:
        return path
    del gltf['animations']
    text = json.dumps(gltf).encode()
    text += b' ' * (-len(text) % 4)
    rest = blob[20 + n:]
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(text) + len(rest)) + struct.pack('<II', len(text), 0x4E4F534A) + text + rest
    f = tempfile.NamedTemporaryFile(suffix='.glb', delete=False)
    f.write(out)
    f.close()
    return f.name


def scene_for(models):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objects = []
    for m in models:
        before = set(bpy.context.scene.objects)
        path = os.path.join(ROOT, m['glb'])
        bpy.ops.import_scene.gltf(filepath=path if 'clip' in m else still(path))
        added = [o for o in bpy.context.scene.objects if o not in before]
        for o in added:
            if 'clip' in m:
                # `clip` y `at` (fracción del ciclo): el animal a media zancada,
                # que es donde una pieza mal unida abre su rendija.
                acts = [a for a in bpy.data.actions if a.name.split('_')[0] == m['clip'] or a.name.startswith(m['clip'] + '_')]
                if o.animation_data is not None and acts:
                    for t in o.animation_data.nla_tracks:
                        t.mute = True
                    act = next((a for a in acts if o.name in a.name), acts[0])
                    o.animation_data.action = act
                    lo, hi = act.frame_range
                    bpy.context.scene.frame_set(int(round(lo + (hi - lo) * m.get('at', 0.25))))
                continue
            # La pose de reposo: sin clips, los nodos como vienen en el GLB.
            if o.animation_data is not None:
                o.animation_data.action = None
            if o.type == 'ARMATURE':
                o.data.pose_position = 'REST'
        pivot = bpy.data.objects.new('Pivot', None)
        bpy.context.collection.objects.link(pivot)
        for o in added:
            if o.parent is None:
                o.parent = pivot
        pivot.rotation_euler = (0, 0, math.radians(m.get('turn', 0)))
        pivot.location = (m.get('x', 0), -m.get('z', 0), m.get('lift', 0))
        objects += added
    bpy.context.view_layer.update()
    # Sin la icosfera que el importador crea para dibujar los huesos: no se ve y mide dos metros.
    return [o for o in objects if o.type == 'MESH' and not o.hide_render and o.users_collection and not o.name.startswith('Icosphere')]


def bounds(meshes):
    deps = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in meshes:
        e = o.evaluated_get(deps)
        me = e.to_mesh()
        pts += [e.matrix_world @ v.co for v in me.vertices]
        e.to_mesh_clear()
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi, pts


def render(panel, path):
    meshes = scene_for(panel['models'])
    lo, hi, pts = bounds(meshes)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'Standard'
    mobile = panel['kind'] == 'mobile'
    size = PANEL * (2 if mobile else 1)
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('W')
    sc.world.use_nodes = True
    # El verde gris de la hierba del valle de lejos, para que el contraste se lea como en el juego.
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.42, 0.47, 0.33, 1) if mobile else (0.70, 0.72, 0.66, 1)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))
    sun = bpy.context.object
    sun.data.energy = 3.2
    sun.rotation_euler = (math.radians(40), 0, math.radians(-35))
    if mobile:
        # Un suelo, como en el juego: el animal se recorta contra la hierba.
        bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
        g = bpy.context.object
        mat = bpy.data.materials.new('Grass')
        mat.diffuse_color = (0.30, 0.36, 0.18, 1)
        mat.use_nodes = True
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.20, 0.27, 0.10, 1)
        mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
        g.data.materials.append(mat)
    direction = Vector(VIEWS[panel['kind']]).normalized()
    centre = (lo + hi) / 2
    if 'look' in panel:
        # `look`: [x, z, alto] en celdas del GLB (+Z delante): mirar de cerca una junta.
        centre = Vector((panel['look'][0], -panel['look'][1], panel['look'][2]))
    bpy.ops.object.camera_add()
    cam = bpy.context.object
    cam.data.type = 'ORTHO'
    cam.data.clip_start = 0.001
    cam.data.clip_end = 200
    sc.camera = cam
    cam.location = centre + direction * 20
    cam.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
    if 'scale' in panel:
        scale = panel['scale']
    elif mobile:
        # Se dibuja a `size` y se reduce ×8: quedan size/8 px, a 32 px por celda.
        scale = size / 8 / PX_PER_CELL
    else:
        right = direction.cross(Vector((0, 0, 1))).normalized()
        up = right.cross(direction).normalized()
        w = max(abs((p - centre).dot(right)) for p in pts) * 2
        h = max(abs((p - centre).dot(up)) for p in pts) * 2
        scale = max(w, h) * 1.18
    cam.data.ortho_scale = scale
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return scale


def font(n):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf']:
        if os.path.exists(f):
            return ImageFont.truetype(f, n)
    return ImageFont.load_default()


def main():
    tmp = os.path.join(os.path.dirname(os.path.join(ROOT, SPEC['out'])), '_panels')
    os.makedirs(tmp, exist_ok=True)
    rows = []
    for r, row in enumerate(SPEC['rows']):
        cells = []
        for c, panel in enumerate(row['panels']):
            path = os.path.join(tmp, f'{r}-{c}.png')
            scale = render(panel, path)
            im = Image.open(path).convert('RGB')
            if panel['kind'] == 'mobile':
                # A escala de móvil: 32 px por celda. Se reduce con buen filtro
                # (como el navegador) y se enseña ampliado sin suavizar al lado.
                small = im.resize((im.width // 8, im.height // 8), Image.LANCZOS)
                big = small.resize((PANEL, PANEL), Image.NEAREST)
                im = Image.new('RGB', (PANEL, PANEL), (40, 40, 40))
                im.paste(big, (0, 0))
                im.paste(small.crop((0, 0, small.width, small.height)), (PANEL - small.width - 6, 6))
            d = ImageDraw.Draw(im)
            d.rectangle((0, PANEL - 30, PANEL, PANEL), fill=(236, 231, 220))
            d.text((10, PANEL - 25), panel['title'], fill=(40, 36, 30), font=font(17))
            cells.append(im)
        rows.append((row['label'], cells))
    cols = max(len(c) for _, c in rows)
    head, label_w = 54, 0
    sheet = Image.new('RGB', (cols * PANEL, head + len(rows) * (PANEL + 34)), (236, 231, 220))
    d = ImageDraw.Draw(sheet)
    d.text((14, 12), SPEC['title'], fill=(30, 26, 22), font=font(26))
    for r, (label, cells) in enumerate(rows):
        y = head + r * (PANEL + 34)
        d.text((14, y + 4), label, fill=(70, 60, 50), font=font(20))
        for c, im in enumerate(cells):
            sheet.paste(im, (c * PANEL, y + 30))
    sheet.save(os.path.join(ROOT, SPEC['out']))
    print('SHEET', SPEC['out'], flush=True)


main()
