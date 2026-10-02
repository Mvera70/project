"""Verifica contratos entre candidatos y produce las dos hojas conjuntas."""
import bpy,json,math
from mathutils import Vector
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUT=ROOT/'artifacts/graphics/astra'
def recipe(id):return json.loads((HERE.parent/(('ore-pile' if id.startswith('ore-pile') else id)+'-candidate')/(id+'.json')).read_text())
a=recipe('minecart');b=recipe('minecart-full');track=recipe('rails');mouth=recipe('mine-mouth')
assert a['meshes']==[m for m in b['meshes'] if m['name']!='ore_load']
assert a['metadata']['gaugeMetres']==track['metadata']['gaugeMetres']==mouth['metadata']['gaugeMetres']
assert track['metadata']['repeatMetres']==3
assert mouth['metadata']['clearOpeningMetres'][0]>1.44 and mouth['metadata']['clearOpeningMetres'][1]>1.70
for m in a['meshes']:
 if m['name'].startswith('wheel_'):
  assert abs(abs(m['origin'][0])-.6)<1e-9
  assert abs(m['origin'][1]-.23)<1e-9
  assert abs(max(math.hypot(p[1],p[2]) for p in m['vertices'])-.23)<1e-9
# La carga y acopios se prueban por fichero; sólo el cuarto alias comparte malla.
assert recipe('ore-pile')['meshes']==recipe('ore-pile-4')['meshes']
counts=[sum(len(m['faces']) for m in recipe('ore-pile-'+str(n))['meshes']) for n in range(1,5)];assert counts==sorted(set(counts))
report=dict(sharedCartGeometry=True,wheelGaugeMetres=1.2,railTopCells=.19/3,cartRootOnRailsCells=.19/3,wheelRadiusCells=.23/3,clearOpeningMetres=mouth['metadata']['clearOpeningMetres'],oreStateTriangles=counts,fullWithoutOreMatchesEmpty=True)
(OUT/'mine-mouth/assembly-metrics.json').write_text(json.dumps(report,indent=2)+'\n')
def setup():
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.resolution_x=1440;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.72,.62,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
 bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=450;bpy.context.object.data.size=4
 bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.clip_start=.0001;scene.camera=cam;return scene,cam
# Coordenadas de Blender: el avance +Z del GLB es -Y.
def load(path,at=(0,0,0)):
 before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(path));added=set(bpy.context.scene.objects)-before
 for obj in added:
  if obj.parent not in added:obj.location+=Vector(at)
def render(scene,cam,path,target,scale):
 cam.location=Vector(target)+Vector((3,-5,3.5));cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
scene,cam=setup();load(OUT/'mine-mouth/mine-mouth.glb');load(OUT/'minecart-full/minecart-full.glb',(0,-.93,.19/3));load(ROOT/'public/assets/valley3d/villager.glb',(.68,-.65,0));render(scene,cam,OUT/'mine-mouth/assembly.png',(0,-.12,.63),4.8)
scene,cam=setup();scene.render.resolution_y=550
for i in range(4):load(OUT/('ore-pile/state-'+str(i+1))/('ore-pile-'+str(i+1)+'.glb'),(i*.95,0,0))
render(scene,cam,OUT/'ore-pile/states.png',(1.4,0,.18),3.8)
print('MINING_CONTRACTS_OK',json.dumps(report))
