"""Comparación B8: cámara base del juego y escala de reposo, sin integrar."""
import bpy, json, struct, subprocess, tempfile
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'artifacts/graphics/astra/great-oak'
BASE = 'fcfb4cb27e520cb90e29630892918614eb73faf6'
REL = 'artifacts/graphics/astra/great-oak/great-oak.glb'
baseline = subprocess.check_output(['git', 'show', BASE + ':' + REL], cwd=ROOT)
candidate = (ROOT / REL).read_bytes()
def audit(data):
    length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20+length])
    primitives = [p for m in doc['meshes'] for p in m['primitives']]
    triangles = sum(doc['accessors'][p['indices']]['count']//3 for p in primitives)
    assert triangles <= 3500 and not doc.get('textures') and not doc.get('animations')
    assert all(n.get('translation', [0,0,0]) == [0,0,0] and n.get('scale',[1,1,1]) == [1,1,1] for n in doc['nodes'])
    return {'triangles':triangles, 'meshes':len(doc['meshes']), 'primitives':len(primitives), 'materials':len(doc['materials']), 'textures':len(doc.get('textures',[])), 'bytes':len(data)}
report = {'baselineCommit':BASE, 'baseline':audit(baseline), 'candidate':audit(candidate), 'cameraRuntimeDirection':[1,.9,1.15], 'restingVisibleHeightCells':26, 'viewport':[390,844], 'method':'Blender studio render at game camera direction and pixel scale; not an in-game capture.'}
assert report['baseline']['primitives'] == report['candidate']['primitives']
rows=[]
with tempfile.TemporaryDirectory() as tmp:
    for name,data in [('before',baseline),('after',candidate)]:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        file=Path(tmp)/'oak.glb';file.write_bytes(data)
        bpy.ops.import_scene.gltf(filepath=str(file))
        scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
        scene.render.resolution_x=390;scene.render.resolution_y=844;scene.render.resolution_percentage=100
        scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True
        scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.59,1)
        scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
        scene.view_settings.view_transform='Standard'
        bpy.ops.object.light_add(type='AREA',location=(-4,-6,10));bpy.context.object.data.energy=1500;bpy.context.object.data.size=7
        bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
        target=Vector((0,0,1.6));cam.location=target+Vector((1,-1.15,.9))*10
        cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.ortho_scale=26
        scene.render.filepath=str(OUT/(name+'-rest.png'));bpy.ops.render.render(write_still=True)
        img=bpy.data.images.load(scene.render.filepath,check_existing=False)
        pixels=np.empty(390*844*4,dtype=np.float32);img.pixels.foreach_get(pixels)
        # Recorte central a escala 1:1; conserva los píxeles del móvil de 390 × 844.
        rows.append(pixels.reshape((844,390,4))[322:522,75:315,:].copy())
        bpy.data.images.remove(img)
    joined=np.concatenate(rows,axis=1)
    image=bpy.data.images.new('GameCameraComparison',width=480,height=200)
    image.pixels.foreach_set(joined.flatten());image.filepath_raw=str(OUT/'comparison-rest.png');image.file_format='PNG';image.save()
(OUT/'comparison.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)
