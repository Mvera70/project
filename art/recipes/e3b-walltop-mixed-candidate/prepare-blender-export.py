"""Exportador aislado de mallas mixtas; cada invocación requiere autorización exacta."""
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
        raise SystemExit("Requiere autorización explícita y --authorize-export.")
    source = Path(args.source).resolve(strict=True)
    recipe_dir = Path(__file__).resolve().parent
    finish_dir = recipe_dir.parent / "e3b-walltop-mixed-finish-candidate"
    if source.parent not in (recipe_dir, finish_dir) or not source.name.endswith(".mesh.json"):
        raise SystemExit("La fuente debe ser una receta mixta original o acabada.")
    root = recipe_dir.parents[2]
    output_name = "walltop-mixed-finish-export-01" if source.parent == finish_dir else "walltop-mixed-export-01"
    allowed = (root / "artifacts/graphics/E3b2-candidates" / output_name).resolve()
    output_dir = Path(args.output_dir).resolve()
    if output_dir != allowed:
        raise SystemExit(f"Salida aislada requerida: {allowed}")
    recipe = json.loads(source.read_text(encoding="utf-8"))
    if recipe["format"] != "valley-candidate-explicit-mesh-v1":
        raise SystemExit("Formato no admitido.")
    output = output_dir / f'{recipe["id"]}.glb'
    if output.exists():
        raise SystemExit(f"No se sobrescribe: {output}")
    import bpy
    # Se exige proceso Blender nuevo; no se borra una escena del usuario.
    if bpy.data.filepath:
        raise SystemExit("Ejecutar sólo en Blender de fondo con --factory-startup.")
    vertices, triangles, colors = [], [], []
    for part in recipe["parts"]:
        offset = len(vertices)
        vertices.extend((x, -z, y) for x, y, z in part["vertices"])
        triangles.extend(tuple(offset + i for i in face) for face in part["triangles"])
        if "colorsLinear" in part:
            vertex_colors = part["colorsLinear"]
        elif "colorLinear" in part:
            vertex_colors = [part["colorLinear"]] * len(part["vertices"])
        else:
            value = part["color"].lstrip("#")
            srgb = [int(value[i:i+2], 16) / 255 for i in (0, 2, 4)]
            linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in srgb]
            vertex_colors = [linear] * len(part["vertices"])
        if len(vertex_colors) != len(part["vertices"]):
            raise SystemExit(f"Color por vértice incompleto en {part.get('name', 'parte sin nombre')}.")
        for color in vertex_colors:
            if len(color) != 3 or any(not math.isfinite(c) or c < 0 or c > 1 for c in color):
                raise SystemExit("Cada color lineal debe ser RGB finito entre 0 y 1.")
            colors.append((*color, 1.0))
    mesh = bpy.data.meshes.new(recipe["id"])
    mesh.from_pydata(vertices, [], triangles)
    mesh.update()
    attribute = mesh.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="CORNER")
    for loop in mesh.loops:
        attribute.data[loop.index].color = colors[loop.vertex_index]
    material = bpy.data.materials.new("stone")
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = .95
    color_node = material.node_tree.nodes.new("ShaderNodeVertexColor")
    color_node.layer_name = "Color"
    material.node_tree.links.new(color_node.outputs["Color"], shader.inputs["Base Color"])
    mesh.materials.append(material)
    obj = bpy.data.objects.new(recipe["id"], mesh)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    for polygon in mesh.polygons:
        polygon.use_smooth = False
    # No unir vértices ni recalcular normales: preserva winding y colores comprobados.
    output_dir.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise SystemExit("La salida apareció durante la preparación; no se sobrescribe.")
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True,
                              export_yup=True, export_materials="EXPORT", export_animations=False)
    print(json.dumps({"source": str(source), "output": str(output), "triangles": len(triangles)}))


if __name__ == "__main__":
    main()
