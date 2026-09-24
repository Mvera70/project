"""Exporta el cruce W+NE a una revisión aislada, sin publicarlo en el juego."""
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
        raise SystemExit("Requiere autorización de la invocación exacta y --authorize-export.")

    directory = Path(__file__).resolve().parent
    root = directory.parents[2]
    source = Path(args.source).resolve(strict=True)
    output_dir = Path(args.output_dir).resolve()
    expected_source = directory / "e3b-bastion-crossing-24-candidate.mesh.json"
    expected_output = root / "artifacts/graphics/E3b2-candidates/bastion-crossing-24-review-01"
    if source != expected_source or output_dir != expected_output:
        raise SystemExit("Fuente o salida fuera de la revisión aislada.")
    recipe = json.loads(source.read_text(encoding="utf-8"))
    if recipe.get("format") != "valley-candidate-explicit-mesh-v1" or recipe.get("id") != "e3b-bastion-crossing-24-candidate":
        raise SystemExit("Formato o ID inesperado.")
    parts = recipe.get("parts")
    if not isinstance(parts, list) or not parts:
        raise SystemExit("No hay fábrica estática.")
    if len(recipe.get("materials", [])) > recipe["budget"]["maxMaterials"]:
        raise SystemExit("Presupuesto de materiales superado.")
    total_faces = sum(len(part.get("triangles", [])) for part in parts)
    if total_faces > recipe["budget"]["maxTriangles"]:
        raise SystemExit("Presupuesto de triángulos superado.")
    output = output_dir / "e3b-bastion-crossing-24-candidate.glb"
    if output.exists():
        raise SystemExit("No se sobrescribe una revisión previa.")

    import bpy
    if bpy.data.filepath:
        raise SystemExit("Ejecutar sólo en Blender de fondo con --factory-startup.")
    materials = {}
    for definition in recipe["materials"]:
        name = definition["name"]
        color = definition["colorLinear"]
        if len(color) != 3 or not all(isinstance(value, (int, float)) and math.isfinite(value) for value in color):
            raise SystemExit("Color inválido.")
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        material.diffuse_color = (*color, 1)
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = material.diffuse_color
        shader.inputs["Roughness"].default_value = definition["roughness"]
        materials[name] = material
    for part in parts:
        local_vertices = part.get("vertices")
        local_faces = part.get("triangles")
        if not isinstance(local_vertices, list) or not isinstance(local_faces, list):
            raise SystemExit("Parte incompleta.")
        vertices = []
        for vertex in local_vertices:
            if len(vertex) != 3 or not all(isinstance(value, (int, float)) and math.isfinite(value) for value in vertex):
                raise SystemExit("Vértice inválido.")
            x, y, z = vertex
            vertices.append((x, -z, y))
        faces = []
        for face in local_faces:
            if len(face) != 3 or not all(isinstance(index, int) and 0 <= index < len(vertices) for index in face):
                raise SystemExit("Triángulo inválido.")
            faces.append(tuple(face))
        mesh = bpy.data.meshes.new(part["name"])
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        mesh.materials.append(materials[part["material"]])
        obj = bpy.data.objects.new(part["name"], mesh)
        bpy.context.collection.objects.link(obj)
        for polygon in mesh.polygons:
            polygon.use_smooth = False
    bpy.ops.object.select_all(action="SELECT")
    output_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True,
                              export_yup=True, export_materials="EXPORT", export_animations=False)
    print(json.dumps({"source": str(source), "output": str(output), "triangles": total_faces}))


if __name__ == "__main__":
    main()
