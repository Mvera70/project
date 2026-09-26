"""Lectura estática de los GLB candidatos: presupuesto, paleta y bisagra."""
import json
import struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
IDS=['hall','stall-pedlar','stall-factor','stall-salter','quarry-face-intact','quarry-face-mined','quarry-face-exhausted','crag-1','crag-2','crag-3','crag-4','crag-5','cairn']
for id in IDS:
    out=ROOT/'artifacts/graphics/astra'/id
    data=(out/(id+'.glb')).read_bytes()
    magic,version,size=struct.unpack_from('<III',data)
    assert magic==0x46546C67 and version==2 and size==len(data)
    length,kind=struct.unpack_from('<II',data,12)
    assert kind==0x4E4F534A
    gltf=json.loads(data[20:20+length])
    tri=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])
    metrics=json.loads((out/'metrics.json').read_text())
    assert tri==metrics['triangles'] and tri<=metrics['triangleLimit']
    assert not gltf.get('textures') and not gltf.get('images')
    for m in gltf['materials']:
        expected=metrics['materials'][m['name']]
        color=m['pbrMetallicRoughness']['baseColorFactor'][:3]
        assert all(abs(color[i]-int(expected[1+i*2:3+i*2],16)/255)<1e-6 for i in range(3))
    if id=='hall':
        door=next(n for n in gltf['nodes'] if n.get('name')=='hall_door')
        assert gltf['meshes'][door['mesh']]['name']=='hall_door'
        expected=[3.407/3,.4/3,6.57/3]
        assert all(abs(a-b)<1e-5 for a,b in zip(door['translation'],expected))
    if id.startswith('crag'):assert abs(metrics['dimensionsMetresXYZ'][0]-3)<1e-5
    if id=='cairn':assert abs(metrics['dimensionsMetresXYZ'][1]-2.1)<1e-5
    png=(out/'sheet.png').read_bytes();assert png[:8]==b'\x89PNG\r\n\x1a\n'
    assert struct.unpack_from('>II',png,16)==(1280,1280)
    assert (out/'README.md').is_file()
    print(id,tri,'OK')
