"""Exportación mecánica de PNG generados: recorte alfa y tamaño; nunca dibuja arte."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
manifest = json.loads((HERE / 'manifest.generated.json').read_text(encoding='utf-8'))
prior_path = HERE / 'verification-assets.json'
prior_ids = {a['id'] for a in json.loads(prior_path.read_text())} if prior_path.exists() else set()
report = []
for asset in manifest:
    source = Path(asset['source'])
    target_dir = ROOT / ({'ui':'src/ui/redesign', 'art':'public/ui/art/cards', 'chronicle':'docs/ui-redesign/laminas-v6-2026-09-28/colour'}[asset['group']])
    target = target_dir / (asset['id'] + '.png')
    backup = HERE / 'originals' / target.relative_to(ROOT)
    if target.exists() and not backup.exists() and asset['id'] not in prior_ids:
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, backup)
    im = Image.open(source).convert('RGBA')
    # El ruido de alfa casi invisible no debe empequeñecer el objeto exportado.
    # Se mide la silueta; el alfa conservado no se altera.
    box = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if box is None:
        raise ValueError(f"PNG vacío: {source}")
    box = (max(0, box[0]-4), max(0, box[1]-4), min(im.width, box[2]+4), min(im.height, box[3]+4))
    size = tuple(asset['size'])
    if asset['group'] == 'chronicle':
        exported = im.resize(size, Image.Resampling.LANCZOS)
    elif asset.get('slice'):
        exported = im.crop(box).resize(size, Image.Resampling.LANCZOS)
    else:
        fitted = ImageOps.contain(im.crop(box), (size[0] - 2, size[1] - 2), Image.Resampling.LANCZOS)
        exported = Image.new('RGBA', size)
        exported.alpha_composite(fitted, ((size[0]-fitted.width)//2, (size[1]-fitted.height)//2))
    target_dir.mkdir(parents=True, exist_ok=True)
    exported.save(target, optimize=True)
    extrema = exported.getchannel('A').getextrema()
    if extrema[0] == 255:
        raise ValueError(f"Falta transparencia: {target}")
    report.append({
        'id':asset['id'], 'path':target.relative_to(ROOT).as_posix(),
        'sourceSize':list(im.size), 'alphaCrop':list(box), 'size':list(exported.size),
        'alphaRange':list(extrema), 'bytes':target.stat().st_size,
        'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
        'original':backup.relative_to(ROOT).as_posix() if backup.exists() else None,
    })
(HERE / 'verification-assets.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(f"{len(report)} PNG exportados; alfa y dimensiones comprobados.")
