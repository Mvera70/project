"""Exportación mecánica: solo recorte alfa y escala de las cuatro piezas V8."""
import json, hashlib
from pathlib import Path
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
assets = json.loads((HERE / 'manifest.generated.json').read_text(encoding='utf-8'))
(HERE / 'assets').mkdir(exist_ok=True)
report = []
for asset in assets:
    source = Path(asset['source'])
    if not source.is_absolute():
        source = HERE / source
    im = Image.open(source).convert('RGBA')
    box = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    box = (max(0,box[0]-4), max(0,box[1]-4), min(im.width,box[2]+4), min(im.height,box[3]+4))
    size = tuple(asset['size'])
    cropped = im.crop(box)
    if asset.get('slice'):
        result = cropped.resize(size, Image.Resampling.LANCZOS)
    else:
        fitted = ImageOps.contain(cropped, (size[0]-2,size[1]-2), Image.Resampling.LANCZOS)
        result = Image.new('RGBA', size)
        result.alpha_composite(fitted, ((size[0]-fitted.width)//2,(size[1]-fitted.height)//2))
    target = HERE / 'assets' / (asset['id']+'.png')
    result.save(target, optimize=True)
    assert result.getchannel('A').getextrema()[0] == 0
    report.append(dict(id=asset['id'],size=list(result.size),alphaCrop=list(box),sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
(HERE / 'verification-assets.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('Exportadas cuatro piezas con transparencia.')
