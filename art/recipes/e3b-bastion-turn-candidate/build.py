"""Construye una única receta de bastión E→S con escalera norte."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "art/recipes/e3b-walltop-finish-candidate/e3b-walltop-finish-bastion295-candidate.json"
DEST = Path(__file__).with_name("e3b-bastion-turn-candidate.json")


def cube(name, location, dimensions, material="stone"):
    return {"type": "cube", "name": name, "location": location,
            "dimensions": dimensions, "material": material, "parent": "Root"}


recipe = json.loads(SOURCE.read_text(encoding="utf-8"))
recipe["id"] = "e3b-bastion-turn-candidate"
recipe["palette"] = "../palette.json"
recipe["metadata"] = {
    "kind": "bastion", "status": "candidate_unexported", "cellUnit": 1,
    "building": 284, "cell": [45, 67], "seed": 23, "tick": 3846,
    "mask": 6, "incoming": [1, 0], "outgoing": [0, 1],
    "stairAccess": [0, -1], "floorY": 1.02, "clearWidth": 0.70,
    "footprint": [1, 2],
    "sourceRecipe": "art/recipes/e3b-walltop-finish-candidate/e3b-walltop-finish-bastion295-candidate.json",
    "note": "Single cardinal turn E to S; north stair. Platform and ashlar retained; three distinct openings. No diagonal connector.",
    "portals": [
        {"face": "north", "span": [0.15, 0.85]},
        {"face": "east", "span": [0.15, 0.85]},
        {"face": "south", "span": [0.15, 0.85]},
    ],
}

removed = {"Parapet_0", "CenterMerlon_0", "EastLanding", "LandingCorbel"}
primitives = []
for source in recipe["primitives"]:
    if source["name"] in removed:
        continue
    part = copy.deepcopy(source)
    if part["name"].startswith("InteriorStep_"):
        # La escalera original sale al sur: simetría sobre el centro de la celda.
        part["location"][1] = -1 - part["location"][1]
    primitives.append(part)

# El pretil oeste cierra la cuarta cara. Los cuatro remates de esquina de la
# fuente flanquean las tres bocas abiertas sin reducir sus 0,70 de ancho.
primitives.append(cube("WestParapet", [0.08, -0.5, 1.09], [0.14, 0.70, 0.14]))
primitives.append(cube("WestMerlon", [0.08, -0.5, 1.26], [0.14, 0.20, 0.20]))
primitives.append(cube("NorthStairSeam", [0.5, -0.005, 0.989], [0.72, 0.01, 0.062]))
primitives.append(cube("NorthStairSeamCorbel", [0.5, -0.04, 0.879], [0.72, 0.08, 0.158]))

# Ambos costados del desembarco norte apoyan fuera de la huella de los peldaños.
for suffix, x in (("W", 0.07), ("E", 0.93)):
    primitives.append(cube(f"NorthStairLanding_{suffix}", [x, 0.075, 0.989], [0.14, 0.15, 0.062]))
    primitives.append(cube(f"NorthStairCorbel_{suffix}", [x, 0.045, 0.879], [0.14, 0.21, 0.158]))

# Las ménsulas toman carga bajo las bocas E y S, unidas al núcleo del bastión.
primitives.extend((
    cube("EastMouthCorbel", [0.91, -0.5, 0.879], [0.18, 0.70, 0.158]),
    cube("SouthMouthCorbel", [0.5, -0.91, 0.879], [0.70, 0.18, 0.158]),
))
recipe["primitives"] = primitives
recipe["referenceRender"]["cameraLocation"] = [3, -3, 2.8]
recipe["referenceRender"]["cameraTarget"] = [0.5, -0.5, 0.64]
DEST.write_text(json.dumps(recipe, indent=2) + "\n", encoding="utf-8")
print(f"{DEST}: {len(primitives)} cubes, {len(primitives) * 12} unmerged triangles")
