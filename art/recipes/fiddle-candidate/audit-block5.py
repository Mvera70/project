import json,struct
from pathlib import Path
ids=json.loads(Path('art/recipes/fiddle-candidate/ids.json').read_text())
for id in ids:
 d=Path('artifacts/graphics/astra')/id;b=(d/f'{id}.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);assert len(g['meshes'])==len(g['materials'])==1;assert not g.get('images') and not g.get('textures');p=g['meshes'][0]['primitives'];assert len(p)==1 and 'COLOR_0' in p[0]['attributes'];t=g['accessors'][p[0]['indices']]['count']//3;assert t<=150;attach=json.loads((d/'attachment.json').read_text());mount=next(n for n in g['nodes'] if n.get('name')==attach['connector']);assert mount.get('translation',[0,0,0])==[0,0,0];assert attach['pivotErrorCells']<1e-6;print(id,t,attach['node'])
