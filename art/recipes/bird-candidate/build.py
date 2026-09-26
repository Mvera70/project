"""blender --background --python art/recipes/bird-candidate/build.py
Construcción local de la receta de mallas explícitas. Sólo escribe el candidato bird.
"""
import bpy
import json
import math
import numpy as np
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
r=json.loads((HERE/'bird.json').read_text());palette=json.loads((HERE/r['palette']).read_text())['valley']
out=ROOT/'artifacts/graphics/astra/bird';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
materials=[]
for spec in r['materials']:
    color=palette[spec['role']];rgba=tuple(int(color[i:i+2],16)/255 for i in (1,3,5))+(1,)
    mat=bpy.data.materials.new(spec['name']);mat.diffuse_color=rgba;mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=rgba;bsdf.inputs['Roughness'].default_value=.92
    materials.append(mat)
objects={}
# Receta Y arriba -> Blender Z arriba. Al exportar glTF recupera sus ejes originales.
def blender(v):return (v[0]*r['scale'],-v[2]*r['scale'],v[1]*r['scale'])
for spec in r['meshes']:
    mesh=bpy.data.meshes.new(spec['name']);mesh.from_pydata([blender(v) for v in spec['vertices']],[],spec['faces']);mesh.update()
    for mat in materials:mesh.materials.append(mat)
    for p,mat in zip(mesh.polygons,spec['faceMaterials']):p.material_index=mat;p.use_smooth=False
    obj=bpy.data.objects.new(spec['name'],mesh);bpy.context.collection.objects.link(obj);obj.location=blender(spec['origin']);objects[obj.name]=obj
tri=sum(len(o.data.polygons) for o in objects.values());assert tri<=120
bpy.context.view_layer.update()
points=[o.matrix_world@v.co for o in objects.values() for v in o.data.vertices]
lo=[min(v[i] for v in points) for i in range(3)];hi=[max(v[i] for v in points) for i in range(3)]
assert abs((hi[0]-lo[0])*3-.25)<1e-6
bpy.ops.export_scene.gltf(filepath=str(out/'bird.glb'),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
# Capturar el GLB reimportado, incluidos sus pivotes reales.
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(out/'bird.glb'))
objects={o.name:o for o in bpy.context.scene.objects if o.type=='MESH'}
assert set(objects)=={'bird_body','bird_wing_l','bird_wing_r'}
for obj in objects.values():obj.rotation_mode='XYZ'
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('ReviewWorld');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.59,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
scene.view_settings.view_transform='Standard'
bpy.ops.object.light_add(type='AREA',location=(-.1,-.2,.3));bpy.context.object.data.energy=.4;bpy.context.object.data.size=.18
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=.102;cam.data.clip_start=.001;scene.camera=cam
images=[]
for name,location,angles in [('top',(0,0,.3),(0,0)),('side',(.3,0,.015),(0,0)),('wings-up',(.08,-.17,.10),(-55,55)),('wings-down',(.08,-.17,.10),(35,-35))]:
    # Z de glTF corresponde a -Y de Blender.
    objects['bird_wing_l'].rotation_euler.y=math.radians(-angles[0]);objects['bird_wing_r'].rotation_euler.y=math.radians(-angles[1])
    cam.location=location;target=Vector((0,.003,0));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
    image=bpy.data.images.load(scene.render.filepath,check_existing=False);a=np.empty(640*640*4,dtype=np.float32);image.pixels.foreach_get(a);images.append(a.reshape(640,640,4));bpy.data.images.remove(image)
sheet=np.concatenate([np.concatenate(images[2:],axis=1),np.concatenate(images[:2],axis=1)],axis=0)
img=bpy.data.images.new('Sheet',width=1280,height=1280);img.pixels.foreach_set(sheet.flatten());img.filepath_raw=str(out/'sheet.png');img.file_format='PNG';img.save()
metrics=dict(triangles=tri,spanMetres=(hi[0]-lo[0])*3,lengthMetres=(hi[1]-lo[1])*3,heightMetres=(hi[2]-lo[2])*3,meshes={s['name']:dict(triangles=len(s['faces']),pivotMetres=s['origin']) for s in r['meshes']})
(out/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
(out/'README.md').write_text(f'''# Bird · golondrina en vuelo

- Envergadura: **0,25 m = 0,083333 celdas**. Largo: {metrics['lengthMetres']:.3f} m. Grosor corporal: {metrics['heightMetres']:.3f} m.
- **{tri} triángulos / 120**. Exactamente tres mallas y nodos: `bird_body`, `bird_wing_l`, `bird_wing_r`.
- Alas barridas, puntas largas, cola ahorquillada, vientre claro. Sin texturas ni suavizado.
- Paleta: feathers/strangerSlate `{palette['strangerSlate']}`, breast/neighborLinen `{palette['neighborLinen']}`, tips/clericalBlack `{palette['clericalBlack']}`.
- Ejes GLB: +Y arriba, +Z hacia el pico, ala l en −X. Orígenes de alas en hombros (±0,008; 0,002; 0,008 m), convertidos a celdas en GLB. Para batir: girar alrededor de Z local. Pose superior l −55°, r +55°; inferior l +35°, r −35°.
- `sheet.png`: superior y lateral arriba; alas levantadas y bajadas abajo. Capturas del GLB reimportado. Las poses de revisión no se guardan en el GLB: se entrega extendido, listo para giro procedural.
- Receta explícita: `art/recipes/bird-candidate/bird.json`. Sus vértices están en metros, relativos al pivote de cada malla. Usa el adaptador local porque el esquema de primitivas común no expresa alas barridas con precisión.
- Reconstruir: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/bird-candidate/build.py`.

Sin preguntas pendientes. Modelo candidato; integración fuera del encargo.
''',encoding='utf8')
print('BIRD_COMPLETE',metrics,flush=True)
