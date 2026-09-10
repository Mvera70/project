# G-04 · Los clips. design.md D.4, D.6.
#
# Separado del rig y de la geometría porque D.4 lo exige, y porque son tres
# cosas que cambian por motivos distintos: la forma del aldeano, cómo se
# articula y qué hace.
#
# **Locomoción in-place** (D.4): el clip mueve el cuerpo, nunca la raíz. Quien
# desplaza al aldeano por el valle es el controlador del juego, que ya sabe a
# qué velocidad va porque lo dice §5.2. Si el clip moviera también la raíz, las
# dos velocidades tendrían que coincidir para siempre y no coincidirían nunca:
# los pies patinarían en cuanto alguien cambiara una constante.

import bpy
import math


def _radians(values):
    return [math.radians(v) for v in values]


def _fcurves_of(action):
    """Las curvas de una acción, con Blender 4.4+ y con lo anterior.

    Desde 4.4 una acción guarda sus curvas dentro de capas y franjas, y
    `action.fcurves` dejó de existir. Se recorren las dos formas porque el
    proyecto no fija la versión de Blender más allá de la que hay instalada, y
    un fallo aquí aparece como "faltan los productos", que no dice nada.
    """
    direct = getattr(action, 'fcurves', None)
    if direct is not None:
        return list(direct)

    found = []
    for layer in getattr(action, 'layers', []):
        for strip in getattr(layer, 'strips', []):
            for bag in getattr(strip, 'channelbags', []):
                found.extend(bag.fcurves)
    return found


def build_clips(armature, clips):
    """Crea una acción por clip y devuelve lo que se ha creado, para el manifiesto.

    Cada clip declara `frames` y una lista de `tracks`. Un track es un hueso y
    sus fotogramas clave, cada uno con el fotograma y la rotación en grados.

    El último fotograma de un clip que cicla tiene que repetir el primero, o el
    bucle da un salto visible. No se comprueba aquí: lo comprueba la auditoría
    de `animation-audit.ts` sobre el GLB exportado, que es donde importa — D.4
    dice que no se asuma que un control de Blender existe en el navegador.
    """
    made = []

    for clip in clips:
        action = bpy.data.actions.new(clip['name'])
        action.use_fake_user = True
        armature.animation_data_create()
        armature.animation_data.action = action

        for track in clip['tracks']:
            bone = armature.pose.bones.get(track['bone'])
            if bone is None:
                raise RuntimeError("animate: no such bone '%s'" % track['bone'])
            bone.rotation_mode = 'XYZ'

            for key in track['keys']:
                bone.rotation_euler = _radians(key['rotation'])
                bone.keyframe_insert(
                    data_path='rotation_euler',
                    frame=key['frame'],
                    group=track['bone'],
                )
            if 'location' in track:
                for key in track['location']:
                    bone.location = key['offset']
                    bone.keyframe_insert(
                        data_path='location', frame=key['frame'], group=track['bone'],
                    )

        # Interpolación suave salvo que el clip pida otra cosa: un aldeano que
        # se mueve a saltos lineales parece un autómata, y el estilo ya es
        # bastante rígido de por sí.
        interpolation = clip.get('interpolation', 'BEZIER')
        for fcurve in _fcurves_of(action):
            for point in fcurve.keyframe_points:
                point.interpolation = interpolation

        action.frame_range  # fuerza el recálculo antes de leerlo
        made.append({
            'name': clip['name'],
            'frames': clip['frames'],
            'loop': clip.get('loop', True),
            'curves': len(_fcurves_of(action)),
        })

    # La acción activa al exportar decide poco, pero dejar la primera puesta
    # hace que el `.blend` de inspección abra en algo reconocible.
    if clips:
        armature.animation_data.action = bpy.data.actions[clips[0]['name']]
    return made
