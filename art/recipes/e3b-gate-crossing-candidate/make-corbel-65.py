"""Bridge the 65 diagonal seam from the wide gate's south stone jamb."""
from pathlib import Path
import json

folder = Path(__file__).resolve().parent
source = folder/'e3b-gate-crossing-65-guarded-candidate.json'
recipe = json.loads(source.read_text(encoding='utf-8'))
recipe['id'] = 'e3b-gate-crossing-65-corbel-candidate'
recipe['metadata']['version'] = 4
recipe['metadata']['note'] += (' Corner corbel bears on the wide gate south jamb '
                               'and overlaps the diagonal web at the vertex.')
recipe['primitives'].append({
    'type':'cube','name':'GateSouthCornerCorbel',
    'location':[.21,-1.0,.825],
    'dimensions':[.58,.16,.21],
    'material':'stone','parent':'Root',
})
destination = folder/f"{recipe['id']}.json"
destination.write_text(json.dumps(recipe,indent=2)+'\n',encoding='utf-8')
print(destination)
