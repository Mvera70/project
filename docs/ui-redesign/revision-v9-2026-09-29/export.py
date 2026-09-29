"""Exporta el material ImageGen a 2×, sin redibujar ni fabricar texturas."""
from pathlib import Path
from PIL import Image
import json,hashlib
base=Path(__file__).resolve().parent
report=[]
for spec in json.loads((base/'prompts.json').read_text(encoding='utf-8')):
    source=base/'masters'/(spec['id']+'.png')
    im=Image.open(source).convert('RGBA')
    box=None
    if not spec.get('tile'):
        box=im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
        box=(max(0,box[0]-3),max(0,box[1]-3),min(im.width,box[2]+3),min(im.height,box[3]+3))
        im=im.crop(box)
    im=im.resize(tuple(n*2 for n in spec['css']),Image.Resampling.LANCZOS)
    target=base/'assets'/(spec['id']+'.png')
    im.save(target,optimize=True)
    report.append(dict(id=spec['id'],size=im.size,css=spec['css'],crop=box,alpha=im.getchannel('A').getextrema(),sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
(base/'verification-assets.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('4 recursos exportados.')
