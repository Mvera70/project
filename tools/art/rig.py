# G-04 · El esqueleto. design.md D.4.
#
# D.4 exige que construir geometría, crear rig y animar sean pasos separados y
# no un script monolítico. Éste es el rig, y no sabe nada de qué recurso está
# montando: recibe huesos declarados en la receta y ata cada pieza al suyo.
#
# El aldeano de G-03 son catorce piezas sueltas, así que el rig natural es
# **rígido**: cada pieza cuelga de un hueso y gira con él, sin deformarse. Es lo
# que pide una maqueta tallada, y D.4 obliga a compararlo con piel antes de
# fijarlo — esa comparación es de G-04 y vive en el informe, no aquí.

import bpy
import mathutils


def build_armature(spec, name='Villager_Rig'):
    """Crea el armature de la receta y devuelve el objeto.

    Cada hueso declara `head`, `tail` y `parent`. Las coordenadas son las de la
    receta, es decir las de Blender, y la exportación las convierte igual que
    hace con la geometría (§D.4, convención espacial).
    """
    armature_data = bpy.data.armatures.new(name + '_Data')
    armature = bpy.data.objects.new(name, armature_data)
    bpy.context.collection.objects.link(armature)

    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='EDIT')

    made = {}
    for bone_spec in spec['bones']:
        bone = armature_data.edit_bones.new(bone_spec['name'])
        bone.head = mathutils.Vector(bone_spec['head'])
        bone.tail = mathutils.Vector(bone_spec['tail'])
        # Sin `connect`: un hueso conectado arrastra la cabeza de su hijo, y
        # aquí las piezas no se tocan necesariamente.
        bone.use_connect = False
        made[bone_spec['name']] = bone

    for bone_spec in spec['bones']:
        parent = bone_spec.get('parent')
        if parent is not None:
            made[bone_spec['name']].parent = made[parent]

    bpy.ops.object.mode_set(mode='OBJECT')
    return armature


def bind_rigid(armature, objects, bindings, smooth=False):
    """Ata cada pieza a su hueso sin deformar nada.

    `bindings` va de nombre de objeto a nombre de hueso. Una pieza sin binding
    declarado queda fuera del rig a propósito: si algo tiene que moverse y no se
    mueve, es mejor verlo en la captura que descubrirlo dentro de un año.

    **Cada malla se ata con un grupo de vértices de peso 1 y un modificador de
    armadura**, no emparentándola al hueso. Emparentar a un hueso lo hace desde
    su COLA, así que al girar, la pieza pivota por el extremo equivocado: la
    primera versión de esto dejaba la cabeza flotando separada del torso y los
    brazos saliendo del centro del pecho. Se vio en la primera captura del ciclo
    de andar, no en la validación, que pasaba en verde.

    Con peso 1 a un solo hueso no hay deformación —cada vértice sigue a su hueso
    entero— así que sigue siendo rígido. Es lo que D.4 pide para una maqueta
    tallada, obtenido por el camino que respeta los pivotes.

    Los conectores son `empty` y no tienen vértices, así que ésos sí se
    emparentan al hueso: no se deforman y su origen es su propia posición.

    Con `smooth=True` los pesos los reparte Blender por proximidad al hueso, y
    una pieza puede seguir a dos a la vez: la piel se dobla en los codos en vez
    de articularse a bloques. D.4 pide comparar las dos antes de fijar una, y
    D.4.1 las comparó en un banco común con esta misma receta y coste idéntico.
    """
    if smooth:
        return _bind_smooth(armature, objects, bindings)
    bound = []
    for object_name, bone_name in bindings.items():
        obj = objects.get(object_name)
        if obj is None:
            raise RuntimeError("rig.bind: no such object '%s'" % object_name)
        if bone_name not in armature.data.bones:
            raise RuntimeError("rig.bind: no such bone '%s'" % bone_name)

        if obj.type == 'MESH':
            group = obj.vertex_groups.new(name=bone_name)
            group.add(range(len(obj.data.vertices)), 1.0, 'REPLACE')
            matrix = obj.matrix_world.copy()
            obj.parent = armature
            obj.matrix_world = matrix
            modifier = obj.modifiers.new(name='Rig', type='ARMATURE')
            modifier.object = armature
            modifier.use_vertex_groups = True
        else:
            matrix = obj.matrix_world.copy()
            obj.parent = armature
            obj.parent_type = 'BONE'
            obj.parent_bone = bone_name
            obj.matrix_world = matrix

        bound.append(object_name)

    return bound


def _bind_smooth(armature, objects, bindings):
    """Piel deformable: los pesos los reparte Blender por proximidad.

    Los conectores siguen atados a su hueso, igual que en la rígida: un punto
    donde colgar una herramienta no se deforma, se sigue.
    """
    meshes = []
    for object_name, bone_name in bindings.items():
        obj = objects.get(object_name)
        if obj is None:
            raise RuntimeError("rig.bind: no such object '%s'" % object_name)
        if bone_name not in armature.data.bones:
            raise RuntimeError("rig.bind: no such bone '%s'" % bone_name)
        if obj.type == 'MESH':
            meshes.append(obj)
        else:
            matrix = obj.matrix_world.copy()
            obj.parent = armature
            obj.parent_type = 'BONE'
            obj.parent_bone = bone_name
            obj.matrix_world = matrix

    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    bpy.ops.object.select_all(action='DESELECT')
    return sorted(bindings.keys())
