"""Normaliza los maestros ImageGen: tamaño y alfa, sin pintar texturas."""
import json, hashlib
from pathlib import Path
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
specs = json.loads((HERE/'manifest.plan.json').read_text(encoding='utf-8'))
(HERE/'assets').mkdir(exist_ok=True)
report=[]
for spec in specs:
    source=HERE/'masters'/(spec['id']+'.png')
    if not source.exists():
        continue
    im=Image.open(source).convert('RGBA')
    size=tuple(n*2 for n in spec['css'])
    box=None
    if spec['kind']=='tile':
        out=im.resize(size,Image.Resampling.LANCZOS)
        assert out.getchannel('A').getextrema()==(255,255),spec['id']+' loseta no opaca'
    else:
        box=im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
        assert box,spec['id']+' vacía'
        box=(max(0,box[0]-3),max(0,box[1]-3),min(im.width,box[2]+3),min(im.height,box[3]+3))
        cropped=im.crop(box)
        if spec['kind']=='round':
            fit=ImageOps.contain(cropped,(size[0]-2,size[1]-2),Image.Resampling.LANCZOS)
            out=Image.new('RGBA',size)
            out.alpha_composite(fit,((size[0]-fit.width)//2,(size[1]-fit.height)//2))
        else:
            out=cropped.resize(size,Image.Resampling.LANCZOS)
        assert out.getchannel('A').getextrema()[0]==0,spec['id']+' falta alfa'
    target=HERE/'assets'/(spec['id']+'.png')
    out.save(target,optimize=True)
    entry=dict(id=spec['id'],source='masters/'+source.name,path='assets/'+target.name,size=list(out.size),css=spec['css'],crop=box,alpha=list(out.getchannel('A').getextrema()),sha256=hashlib.sha256(target.read_bytes()).hexdigest())
    if spec.get('slice'):entry['slicePNG']=[n*2 for n in spec['slice']]
    report.append(entry)
(HERE/'verification-assets.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(f'{len(report)}/{len(specs)} piezas exportadas.')
