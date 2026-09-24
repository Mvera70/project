"""Exporta sólo la fábrica estática combinada a una revisión aislada.

La hoja articulada se conserva como recurso separado; esta malla sustituye los
volúmenes estáticos del bastión y del portón, nunca se superpone a ellos.
"""
import argparse
import json
import math
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--authorize-export", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if not args.authorize_export:
        raise SystemExit("Requiere autorización exacta y --authorize-export.")

    directory = Path(__file__).resolve().parent
    root = directory.parents[2]
    source = Path(args.source).resolve(strict=True)
    output_dir = Path(args.output_dir).resolve()
    expected_source = directory / "e3b-anchor66-gate24-combined-candidate.mesh.json"
    expected_output = root / "artifacts/graphics/E3b2-candidates/anchor66-gate24-static-review-01"
    if source != expected_source or output_dir != expected_output:
        raise SystemExit("Fuente o salida fuera de la revisión aislada autorizada.")
    recipe = json.loads(source.read_text(encoding="utf-8"))
    if recipe.get("format") != "valley-candidate-explicit-mesh-v1" or recipe.get("id") != "e3b-anchor66-gate24-combined-candidate":
        raise SystemExit("Formato o ID inesperado.")
    parts = recipe.get("parts")
    if not isinstance(parts, list) or not parts:
        raise SystemExit("No hay fábrica estática.")
    vertices, triangles = [], []
    for part in parts:
        local_vertices = part.get("vertices")
        local_faces = part.get("triangles")
        if not isinstance(local_vertices, list) or not isinstance(local_faces, list):
            raise SystemExit("Parte incompleta.")
        offset = len(vertices)
        for vertex in local_vertices:
            if len(vertex) != 3 or not all(isinstance(value, (int, float)) and math.isfinite(value) for value in vertex):
                raise SystemExit("Vértice inválido.")
            x, y, z = vertex
            vertices.append((x, -z, y))
        for face in local_faces:
            if len(face) != 3 or not all(isinstance(index, int) and 0 <= index < len(local_vertices) for index in face):
                raise SystemExit("Triángulo inválido.")
            triangles.append(tuple(offset + index for index in face))
    if len(triangles) > recipe["budget"]["maxStaticTriangles"]:
        raise SystemExit("Presupuesto de triángulos superado.")

    output = output_dir / (recipe["id"] + "-static.glb")
    if output.exists():
        raise SystemExit("No se sobrescribe una revisión previa.")
    import bpy
    if bpy.data.filepath:
        raise SystemExit("Ejecutar sólo en Blender de fondo con --factory-startup.")
    mesh = bpy.data.meshes.new("Anchor66Gate24Static")
    mesh.from_pydata(vertices, [], triangles)
    mesh.update()
    material = bpy.data.materials.new("stone")
    material.diffuse_color = (0.607843, 0.584314, 0.541176, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = material.diffuse_color
    shader.inputs["Roughness"].default_value = 0.95
    mesh.materials.append(material)
    obj = bpy.data.objects.new("Anchor66Gate24Static", mesh)
    bpy.context.collection.objects.link(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = False
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    output_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True,
                              export_yup=True, export_materials="EXPORT", export_animations=False)
    print(json.dumps({"source": str(source), "output": str(output), "triangles": len(triangles)}))


if __name__ == "__main__":
    main()
