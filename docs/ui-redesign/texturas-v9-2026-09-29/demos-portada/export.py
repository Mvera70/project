"""Cinco demos ImageGen: resize al mismo aspecto, sin pintar o retocar."""
from pathlib import Path
import json,hashlib
from PIL import Image
base=Path(__file__).resolve().parent
specs=json.loads((base/'prompts.json').read_text(encoding='utf-8'))
report=[]
for spec in specs:
    source=base/'masters'/(spec['id']+'.png')
    im=Image.open(source).convert('RGBA').resize((780,1688),Image.Resampling.LANCZOS)
    output=base/(spec['id']+'.png')
    im.save(output,optimize=True)
    report.append(dict(id=spec['id'],source='masters/'+source.name,file=output.name,css=[390,844],size=[780,1688],alpha=im.getchannel('A').getextrema(),generator='ImageGen integrado',sha256=hashlib.sha256(output.read_bytes()).hexdigest()))
(base/'verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('5 demos exportadas a 780×1688.')
