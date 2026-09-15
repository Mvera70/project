import bpy, json, os, sys

PROJECT = r"D:\DESARROLLO\PROYECTOS\VALLEY\project"
RECIPE_PATH = PROJECT + r"\art\recipes\villager-priest\villager-priest.json"
PALETTE_PATH = PROJECT + r"\art\recipes\palette.json"
OUT_DIR = r"D:\DESARROLLO\_villager_test"
ASSET_ID = "villager-priest-test"

os.makedirs(OUT_DIR, exist_ok=True)

with open(RECIPE_PATH, encoding='utf-8') as f:
    raw = json.load(f)
with open(PALETTE_PATH, encoding='utf-8') as f:
    palette = json.load(f)

valley = palette['valley']
prims = raw['primitives']
by_name = {p['name']: p for p in prims}

def to_cube(name, dims):
    p = by_name[name]
    p['type'] = 'cube'
    for k in ('radius', 'depth', 'segments', 'rings', 'vertices', 'rotationDegrees'):
        p.pop(k, None)
    p['dimensions'] = dims

to_cube('Villager_Head', [0.5, 0.48, 0.48])
to_cube('Villager_UpperArm_L', [0.19, 0.19, 0.42])
to_cube('Villager_UpperArm_R', [0.19, 0.19, 0.42])
to_cube('Villager_Forearm_L', [0.17, 0.17, 0.35])
to_cube('Villager_Forearm_R', [0.17, 0.17, 0.35])
to_cube('Villager_Hand_L', [0.16, 0.16, 0.16])
to_cube('Villager_Hand_R', [0.16, 0.16, 0.16])
to_cube('Villager_Thigh_L', [0.23, 0.23, 0.46])
to_cube('Villager_Thigh_R', [0.23, 0.23, 0.46])
to_cube('Villager_Shin_L', [0.2, 0.2, 0.38])
to_cube('Villager_Shin_R', [0.2, 0.2, 0.38])
to_cube('Villager_Eye_L', [0.05, 0.02, 0.05])
to_cube('Villager_Eye_R', [0.05, 0.02, 0.05])

for name in ('Villager_Elbow_L', 'Villager_Elbow_R', 'Villager_Knee_L', 'Villager_Knee_R'):
    prims.remove(by_name[name])
    del raw['rig']['bind'][name]

hood = by_name['Priest_Hood']
hood['type'] = 'cube'
for k in ('radius', 'depth', 'vertices', 'rotationDegrees'):
    hood.pop(k, None)
hood['dimensions'] = [0.36, 0.36, 0.22]
hood['location'] = [0, 0, 1.92]

by_name['Priest_CrossUpright']['dimensions'] = [0.05, 0.035, 0.26]
by_name['Priest_CrossUpright']['location'] = [0, -0.23, 1.32]
by_name['Priest_CrossBar']['dimensions'] = [0.18, 0.035, 0.05]
by_name['Priest_CrossBar']['location'] = [0, -0.23, 1.38]

for p in prims:
    p.setdefault('smooth', False)
    p.setdefault('bevel', 0)

raw['id'] = ASSET_ID

for material in raw['materials']:
    role = material['role']
    if role not in valley:
        raise SystemExit("palette has no role '%s'" % role)
    material['color'] = valley[role]
for material in raw['materials']:
    if material['name'] == 'dark':
        material['color'] = '#2B2118'

render = raw['referenceRender']
render['worldColor'] = valley[render['worldRole']]

raw['clipDefinitions'] = raw['clips']

resolved_path = os.path.join(OUT_DIR, ASSET_ID + '.resolved.json')
with open(resolved_path, 'w', encoding='utf-8') as f:
    json.dump(raw, f)

build_script_path = PROJECT + r"\tools\art\blender-build.py"
sys.path.insert(0, PROJECT + r"\tools\art")
sys.argv = ['blender-build.py', '--', resolved_path, OUT_DIR, ASSET_ID, 'rigid']
g = {'__file__': build_script_path, '__name__': '__main__'}

# Running this pipeline from inside the Blender GUI (Text Editor "Run Script",
# or the interactive console) instead of `blender --background --python`
# means bpy.ops.* calls need a real VIEW_3D area/region in context to poll(),
# or they raise RuntimeError ("Context missing active object") even though
# view_layer.objects.active is set correctly. blender-build.py's own first
# line resets the scene (bpy.ops.wm.read_factory_settings(use_empty=True)),
# which also swaps out the window's screen — so any area/region captured
# BEFORE that call is stale by the time later operators run.
#
# Fix (test-only, does not touch the shared blender-build.py): do the reset
# here first, capture a fresh VIEW_3D area/region afterwards, strip the now-
# redundant reset line out of the text we exec, and wrap the whole build in
# one stable context override.
bpy.ops.wm.read_factory_settings(use_empty=True)

win = bpy.context.window_manager.windows[0] if bpy.context.window_manager.windows else None
view3d_area = None
view3d_region = None
if win is not None:
    for area in win.screen.areas:
        if area.type == 'VIEW_3D':
            view3d_area = area
            for region in area.regions:
                if region.type == 'WINDOW':
                    view3d_region = region
                    break
            break

source = open(build_script_path, encoding='utf-8').read()
source = source.replace(
    "bpy.ops.wm.read_factory_settings(use_empty=True)",
    "pass  # already reset by the test wrapper",
    1,
)
code = compile(source, build_script_path, 'exec')

if win is not None and view3d_area is not None:
    with bpy.context.temp_override(window=win, area=view3d_area, region=view3d_region):
        exec(code, g)
else:
    exec(code, g)

print('DONE:', sorted(os.listdir(OUT_DIR)))
