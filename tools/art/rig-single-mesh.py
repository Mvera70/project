# Un esqueleto para un animal de una sola malla. 26 sep 2026.
#
# El zorro de Vera (`deliverables/fox-model-trial/fox-astra-softened-muzzle.glb`)
# es una malla entera, sin piezas ni huesos. Ella eligió ponerle esqueleto por
# script («esqueleto en Blender»): este fichero lo hace sin tocar su forma.
#
#   blender --background --python tools/art/rig-single-mesh.py -- \
#       <entrada.glb> <salida.glb> <largo-en-celdas>
#
# 1. Escala la malla al largo pedido (en celdas; una celda son tres metros).
# 2. Lee de la malla dónde están las patas, el cuello, la cabeza y la cola.
# 3. Pone los huesos con los nombres del generador de G-23 (`body`, `neck`,
#    `head`, `foreL`/`foreLLower`/`foreLFoot`…, `tail`, `tailTip`), que son los
#    que el juego y los gestos fabricados buscan.
# 4. **Pesa por regiones**, no con pesos automáticos: cada vértice va entero a
#    un hueso, y una pata sólo a su cuarto del cuerpo, para que al andar no
#    arrastre a la de al lado. Es el mismo aspecto articulado que los animales
#    de piezas rígidas.
# 5. Hace `idle`, `walk` (apoyo en línea recta el 62 % del ciclo, como
#    `animals-g23.mjs`) y `flee` (galope), y lo exporta con los clips.
#
# Escribe al lado `<salida>.json` con la marcha que el catálogo tiene que
# declarar (`tools/art/adopt-models.mjs`).

import bpy, bmesh, json, math, sys
from mathutils import Vector, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:]
SOURCE, OUTPUT, LENGTH = argv[0], argv[1], float(argv[2])
FPS = 30
STANCE = 0.62

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS
bpy.ops.import_scene.gltf(filepath=SOURCE)
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
for other in [o for o in bpy.context.scene.objects if o is not mesh]:
    if other.type != 'MESH':
        mesh.parent = None
mesh.matrix_world = mesh.matrix_world.copy()
bpy.ops.object.select_all(action='DESELECT')
mesh.select_set(True)
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# --- 1 · escala: el largo total (hocico a punta de cola) en celdas ---------
xs = [v.co.x for v in mesh.data.vertices]
scale = LENGTH / (max(xs) - min(xs))
for v in mesh.data.vertices:
    v.co *= scale
verts = [v.co.copy() for v in mesh.data.vertices]
minX = min(v.x for v in verts); maxX = max(v.x for v in verts)
H = max(v.z for v in verts)
L = maxX - minX

# --- 2 · las regiones -------------------------------------------------------
# El morro mira a −X (convenio del juego). Las patas son lo que queda por
# debajo del vientre; se reparten en cuatro por delante/detrás y a cada lado.
legTop = 0.34 * H
low = [v for v in verts if v.z < legTop * 0.8]
midLegX = (min(v.x for v in low) + max(v.x for v in low)) / 2
legs = {}
for name, front, side in [('foreL', True, 1), ('foreR', True, -1), ('hindL', False, 1), ('hindR', False, -1)]:
    group = [v for v in low if (v.x < midLegX) == front and (v.y > 0) == (side > 0)]
    cx = sum(v.x for v in group) / len(group)
    cy = sum(v.y for v in group) / len(group)
    legs[name] = (cx, cy)
foreX = (legs['foreL'][0] + legs['foreR'][0]) / 2
hindX = (legs['hindL'][0] + legs['hindR'][0]) / 2
# La cola empieza un poco detrás de las patas de atrás; la cabeza, delante de
# las de delante, donde el cuello sube hacia las orejas (el punto más alto).
ear = max(verts, key=lambda v: v.z)
tailBase = hindX + 0.09 * L
neckBase = foreX - 0.04 * L
headBase = ear.x + 0.04 * L
bodyZ = legTop + 0.2 * (H - legTop)

# --- 3 · los huesos ---------------------------------------------------------
arm_data = bpy.data.armatures.new('Rig')
rig = bpy.data.objects.new('Rig', arm_data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
bones = {}

def bone(name, head, tail, parent=None):
    b = arm_data.edit_bones.new(name)
    b.head = Vector(head); b.tail = Vector(tail); b.roll = 0
    if parent: b.parent = bones[parent]
    bones[name] = b
    return b

centreX = (foreX + hindX) / 2
bone('body', (centreX, 0, bodyZ), (centreX, 0, bodyZ + 0.05 * H))
neckTop = (headBase, 0, ear.z - 0.12 * H)
bone('neck', (neckBase, 0, bodyZ + 0.1 * H), neckTop, 'body')
bone('head', neckTop, (minX, 0, neckTop[2] - 0.1 * H), 'neck')
for name, (cx, cy) in legs.items():
    knee = legTop * 0.5
    ankle = legTop * 0.12
    bone(name, (cx, cy, legTop), (cx, cy, knee), 'body')
    bone(name + 'Lower', (cx, cy, knee), (cx, cy, ankle), name)
    bone(name + 'Foot', (cx, cy, ankle), (cx - 0.03 * L, cy, 0.0), name + 'Lower')
tailMid = tailBase + 0.5 * (maxX - tailBase)
bone('tail', (tailBase, 0, bodyZ + 0.1 * H), (tailMid, 0, bodyZ), 'body')
bone('tailTip', (tailMid, 0, bodyZ), (maxX, 0, bodyZ - 0.05 * H), 'tail')
bpy.ops.object.mode_set(mode='OBJECT')

# --- 4 · pesos por regiones -------------------------------------------------
for name in arm_data.bones.keys():
    mesh.vertex_groups.new(name=name)

def region(v):
    if v.z < legTop * 1.02 and v.x > minX + 0.12 * L and v.x < tailBase:
        # La pata más cercana de su lado, y dentro de ella por altura.
        name = min(legs, key=lambda n: (v.x - legs[n][0]) ** 2 + 4 * (v.y - legs[n][1]) ** 2)
        if v.z > legTop * 0.5: return name
        if v.z > legTop * 0.12: return name + 'Lower'
        return name + 'Foot'
    if v.x > tailMid: return 'tailTip'
    if v.x > tailBase: return 'tail'
    if v.x < headBase: return 'head'
    if v.x < neckBase: return 'neck'
    return 'body'

for v in mesh.data.vertices:
    mesh.vertex_groups[region(v.co)].add([v.index], 1.0, 'REPLACE')
mesh.parent = rig
modifier = mesh.modifiers.new('Rig', 'ARMATURE')
modifier.object = rig

# --- 5 · los clips ----------------------------------------------------------
LATERAL = Vector((0, 1, 0))   # girar +θ en torno a él lleva un pie hacia −X (adelante)
VERTICAL = Vector((0, 0, 1))

def local(name, axis, angle):
    rest = arm_data.bones[name].matrix_local.to_3x3()
    return Quaternion(rest.inverted() @ axis, angle)

def leg_angle(p, travel, length):
    swing = p > STANCE
    u = (p - STANCE) / (1 - STANCE) if swing else p / STANCE
    # Adelante es +: en el apoyo el pie va de adelante a atrás en línea recta.
    ahead = -travel / 2 + travel * (0.5 - 0.5 * math.cos(math.pi * u)) if swing else travel / 2 - travel * u
    return math.asin(max(-0.95, min(0.95, ahead / length)))

def action(name, seconds, pose):
    rig.animation_data_create()
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    rig.animation_data.action = act
    frames = max(2, round(seconds * FPS))
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    for f in range(frames + 1):
        t = f / frames
        for pb in rig.pose.bones:
            q = Quaternion()
            for axis, angle in pose.get(pb.name, []):
                q = q @ local(pb.name, axis, angle(t))
            pb.rotation_quaternion = q
            pb.keyframe_insert('rotation_quaternion', frame=1 + f)
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, act)
    rig.animation_data.action = None
    return seconds

wave = lambda t, cycles=1, offset=0: math.sin((t * cycles + offset) * math.pi * 2)
PHASE = {'foreL': 0, 'hindR': 0, 'foreR': 0.5, 'hindL': 0.5}
travel = 2 * legTop * math.sin(0.4)
stride = travel / STANCE

def gait(gain, bend):
    pose = {}
    for leg, phase in PHASE.items():
        pose[leg] = [(LATERAL, (lambda ph: lambda t: leg_angle((t + ph) % 1, travel * gain, legTop))(phase))]
        hind = 1 if leg.startswith('hind') else -1
        pose[leg + 'Lower'] = [(LATERAL, (lambda ph, h: lambda t: h * bend * math.sin(math.pi * ((t + ph) % 1 - STANCE) / (1 - STANCE)) if (t + ph) % 1 > STANCE else 0)(phase, hind))]
    pose['neck'] = [(LATERAL, lambda t: 0.04 * wave(t, 2))]
    pose['tail'] = [(VERTICAL, lambda t: 0.15 * wave(t))]
    pose['tailTip'] = [(VERTICAL, lambda t: 0.12 * wave(t, 1, 0.15))]
    return pose

motion = []
action('walk', 1.0, gait(1, 0.7))
motion.append({'name': 'walk', 'seconds': 1.0, 'loop': True, 'strideLength': round(stride, 3)})
action('idle', 4.0, {
    # Olisquea el suelo y levanta la cabeza; la cola va y viene despacio.
    'neck': [(LATERAL, lambda t: -0.25 * max(0.0, wave(t, 1, 0.75)) ** 2)],
    'tail': [(VERTICAL, lambda t: 0.1 * wave(t))],
})
motion.append({'name': 'idle', 'seconds': 4.0, 'loop': True, 'strideLength': None})
flee = gait(1.5, 1.0)
flee['neck'] = [(LATERAL, lambda t: -0.15)]
flee['tail'] = [(LATERAL, lambda t: -0.2)]
action('flee', 0.6, flee)
motion.append({'name': 'flee', 'seconds': 0.6, 'loop': True, 'strideLength': round(stride * 1.5, 3)})

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUTPUT, export_format='GLB', use_selection=True,
                          export_animations=True, export_animation_mode='NLA_TRACKS',
                          export_force_sampling=True, export_skins=True)
with open(OUTPUT + '.json', 'w', encoding='utf-8') as out:
    json.dump({'motion': motion, 'legs': legs, 'scale': scale}, out)
print('RIG-DONE', OUTPUT, json.dumps(motion))
