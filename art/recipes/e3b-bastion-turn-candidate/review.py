"""Sonda CPU sin archivos de salida para la fuente cardinal E→S."""
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
source = json.loads((ROOT / "art/recipes/e3b-walltop-finish-candidate/e3b-walltop-finish-bastion295-candidate.json").read_text(encoding="utf-8"))
recipe = json.loads((HERE / "e3b-bastion-turn-candidate.json").read_text(encoding="utf-8"))
parts = {p["name"]: p for p in recipe["primitives"]}
assert len(parts) == len(recipe["primitives"])
assert recipe["metadata"]["floorY"] == 1.02
assert recipe["metadata"]["mask"] == 6


def bounds(p):
    x, by, h = p["location"]
    w, d, height = p["dimensions"]
    return (x-w/2, x+w/2, -by-d/2, -by+d/2, h-height/2, h+height/2)


def box_at(x, z, b, eps=1e-8):
    return b[0]-eps <= x <= b[1]+eps and b[2]-eps <= z <= b[3]+eps


floor = [bounds(p) for p in recipe["primitives"] if abs(bounds(p)[5] - 1.02) < 1e-7]
obstacles = [bounds(p) for p in recipe["primitives"] if bounds(p)[4] >= 1.02-1e-7 and bounds(p)[5] > 1.04]
radius = 0.35
routes = {
    "north_to_centre": ((0.5, 0.35), (0.5, 0.5)),
    "centre_to_east": ((0.5, 0.5), (0.65, 0.5)),
    "centre_to_south": ((0.5, 0.5), (0.5, 0.65)),
}
samples = 0
for start, end in routes.values():
    for i in range(31):
        t = i / 30
        cx, cz = (start[0]*(1-t)+end[0]*t, start[1]*(1-t)+end[1]*t)
        for j in range(-35, 36):
            dx = j/100
            for k in range(-35, 36):
                dz = k/100
                if dx*dx + dz*dz > radius*radius+1e-10:
                    continue
                x, z = cx+dx, cz+dz
                assert any(box_at(x, z, b) for b in floor), ("unsupported", x, z)
                assert not any(box_at(x, z, b, -1e-7) for b in obstacles), ("blocked", x, z)
                samples += 1

# Peldaños de la fuente: exactamente las mismas dimensiones y cotas de altura,
# y reflejados sólo en su coordenada horizontal norte/sur.
for old in source["primitives"]:
    if not old["name"].startswith("InteriorStep_"):
        continue
    new = parts[old["name"]]
    assert new["dimensions"] == old["dimensions"]
    assert new["location"][0] == old["location"][0]
    assert new["location"][2] == old["location"][2]
    assert abs(new["location"][1] + old["location"][1] + 1) < 1e-12

# Cada boca mide 0,70 entre las caras internas de sus dos remates.
assert abs(bounds(parts["CenteredCap_0_N"])[1] - 0.15) < 1e-9
assert abs(bounds(parts["CenteredCap_1_N"])[0] - 0.85) < 1e-9
assert abs(bounds(parts["CenteredCap_0_S"])[1] - 0.15) < 1e-9
assert abs(bounds(parts["CenteredCap_1_S"])[0] - 0.85) < 1e-9
assert bounds(parts["EastMouthCorbel"])[1] >= 1.0-1e-9
assert bounds(parts["SouthMouthCorbel"])[3] >= 1.0-1e-9
assert bounds(parts["WestParapet"])[1] <= 0.15+1e-9
assert len([n for n in parts if n.startswith("InteriorStep_")]) == 14
assert all(p["type"] == "cube" for p in recipe["primitives"])

print(json.dumps({"id": recipe["id"], "primitives": len(parts),
                  "unmergedTriangles": len(parts)*12, "materials": len(recipe["materials"]),
                  "stepCount": 14, "floorY": 1.02, "mouthWidth": 0.70,
                  "diskRadius": radius, "diskSamples": samples,
                  "routes": list(routes), "result": "source_geometry_pass"}, indent=2))
