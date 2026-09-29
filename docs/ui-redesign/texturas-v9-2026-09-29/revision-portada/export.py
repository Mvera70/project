"""Exportación mecánica de dos imágenes nuevas; no pinta ni cambia materiales."""
from pathlib import Path
import json, hashlib
from PIL import Image

base = Path(__file__).resolve().parent
report=[]
for name,size,crop in [('title-valley',(780,1688),False),('plaque-brass',(400,92),True)]:
    source=base/(name+'-master.png')
    im=Image.open(source).convert('RGBA')
    box=None
    if crop:
        box=im.getchannel('A').point(lambda a: 255 if a>24 else 0).getbbox()
        box=(max(0,box[0]-3),max(0,box[1]-3),min(im.width,box[2]+3),min(im.height,box[3]+3))
        im=im.crop(box)
    im=im.resize(size,Image.Resampling.LANCZOS)
    output=base/(name+'.png')
    im.save(output,optimize=True)
    report.append(dict(id=name,source=source.name,file=output.name,size=size,alpha=im.getchannel('A').getextrema(),crop=box,sha256=hashlib.sha256(output.read_bytes()).hexdigest()))
(base/'verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('2 imágenes exportadas a 2×.')
