"""Construcción local de armaduras; no modifica catálogo ni motor."""
import bpy,json,math,struct,sys,hashlib
from pathlib import Path
from mathutils import Matrix,Vector,Quaternion
ROOT=Path(__file__).resolve().parents[3]
ids=['jerkin','mail','helm-nasal','plate','greaves','harness','helm-closed']
if '--' in sys.argv: ids=sys.argv[sys.argv.index('--')+1:]
rigbytes=(ROOT/'public/assets/valley3d/villager.glb').read_bytes()
rig=json.loads(rigbytes[20:20+struct.unpack_from('<I',rigbytes,12)[0]])
parents={child:i for i,n in enumerate(rig['nodes']) for child in n.get('children',[])}
def world(index):
    n=rig['nodes'][index]
    if 'matrix' in n: m=Matrix([n['matrix'][i:i+4] for i in range(0,16,4)]).transposed()
    else:
        q=n.get('rotation',[0,0,0,1]);m=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(n.get('scale',[1,1,1])))
    return world(parents[index])@m if index in parents else m
anchors={n['name']:world(i) for i,n in enumerate(rig['nodes']) if 'name' in n}
B=Matrix.Rotation(math.pi/2,4,'X')
palette=json.loads((ROOT/'art/recipes/palette.json').read_text());tones={**palette['valley'],**palette['houses']['thatched']}
def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def aim(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
for id in ids:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    recipe=json.loads((ROOT/'art/recipes'/f'{id}-candidate'/f'{id}.json').read_text())
    out=ROOT/'artifacts/graphics/astra'/id;out.mkdir(parents=True,exist_ok=True)
    material=bpy.data.materials.new(id+'_palette');material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Metallic'].default_value=recipe['material']['metalness'];shader.inputs['Roughness'].default_value=recipe['material']['roughness']
    vc=material.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';material.node_tree.links.new(vc.outputs['Color'],shader.inputs['Base Color'])
    groups={};sourcepoints=[]
    for spec in recipe['primitives']+recipe['polygonMeshes']:
        if 'faces' in spec:
            mesh=bpy.data.meshes.new(spec['name']);mesh.from_pydata(spec['vertices'],[],spec['faces']);mesh.update()
            ob=bpy.data.objects.new(spec['name'],mesh);bpy.context.collection.objects.link(ob)
        else:
            bpy.ops.mesh.primitive_cube_add(location=spec['location']);ob=bpy.context.object;ob.dimensions=spec['dimensions'];ob.rotation_euler=tuple(math.radians(v) for v in spec['rotationDegrees'])
        bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        ob.data.materials.append(material)
        color=tuple(linear(int(tones[spec['role']][i:i+2],16)/255) for i in [1,3,5])+(1,)
        attr=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        for item in attr.data:item.color=color
        anchor=spec['anchor'];assert anchor in anchors
        to_local=B@anchors[anchor].inverted()@B.inverted()
        for v in ob.data.vertices:
            sourcepoints.append(v.co.copy()/3)
            v.co=to_local@(v.co/3)
        groups.setdefault(anchor,[]).append(ob)
    mount={};triangles=0
    for anchor,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in objects:ob.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=bpy.context.object
        name=('leg_l' if anchor=='shin.L' else 'leg_r') if id=='greaves' else id+'_'+anchor.replace('.','_')
        ob.name=name;ob.data.name=name
        mount[name]=anchor
        triangles+=sum(len(p.vertices)-2 for p in ob.data.polygons)
    assert triangles<=recipe['triangleBudget'],(id,triangles)
    bpy.ops.export_scene.gltf(filepath=str(out/f'{id}.glb'),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/valley3d/villager.glb'))
    for ob in bpy.context.scene.objects:
        if ob.type=='ARMATURE':ob.data.pose_position='REST'
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(out/f'{id}.glb'))
    imported=set(bpy.context.scene.objects)-before
    # Comprobar el GLB exportado, montando cada malla con el marco exacto del rig.
    actualpoints=[]
    for ob in imported:
        if ob.type!='MESH':continue
        anchor=mount[ob.name];ob.matrix_world=B@anchors[anchor]@B.inverted()@ob.matrix_world
        actualpoints.extend(ob.matrix_world@v.co for v in ob.data.vertices)
    def bounds(points):return [[min(v[i] for v in points) for i in range(3)],[max(v[i] for v in points) for i in range(3)]]
    expected=bounds(sourcepoints);actual=bounds(actualpoints)
    error=max(abs(expected[j][i]-actual[j][i]) for j in range(2) for i in range(3));assert error<.00001,(id,error)
    stats=dict(id=id,triangles=triangles,budget=recipe['triangleBudget'],mount=mount,materials=1,textures=0,rigSha256=hashlib.sha256(rigbytes).hexdigest(),mountBoundsError=error,mountedBoundsBlender=actual,localUnits='metres: use the bone scale, no extra scale',status='candidate, metal model only')
    (out/'metrics.json').write_text(json.dumps(stats,indent=2)+'\n')
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.008));floor=bpy.context.object
    ground=bpy.data.materials.new('ground');ground.diffuse_color=(.34,.35,.30,1);floor.data.materials.append(ground)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=600;scene.render.resolution_y=720;scene.render.resolution_percentage=100
    scene.world.color=(.35,.35,.35);scene.view_settings.view_transform='Standard'
    bpy.ops.object.light_add(type='AREA',location=(-3,-4,7));bpy.context.object.data.energy=650;bpy.context.object.data.size=5
    bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=.90;scene.camera=camera
    for name,pos in [('quarter',(2,-4,2.8)),('front',(0,-5,.42)),('profile',(5,0,.42))]:
        camera.location=pos;aim(camera,(0,0,.34));scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
    print('ARMOR_OK',json.dumps(stats),flush=True)
