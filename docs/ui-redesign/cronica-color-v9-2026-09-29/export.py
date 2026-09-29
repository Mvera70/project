"""Normaliza las 44 escenas aprobadas a 640×512 y conserva el sepia original."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import shutil
import re

root = Path(__file__).resolve().parents[3]
batch = Path(__file__).resolve().parent
art = root / 'public/ui/art'
approved = root / 'docs/ui-redesign/laminas-v6-2026-09-28/colour'
backup = batch / 'sepia-originals'
backup.mkdir(exist_ok=True)
index_text = (art / 'index.json').read_text(encoding='utf-8')
index = json.loads(index_text)
names = [entry['file'] for entry in index['art']]
assert len(names) == len(set(names)) == 44, 'El inventario de escenas cambió; revisar antes de sobrescribir.'

report = []
for name in names:
    master = batch / 'masters' / name
    source = master if master.exists() else approved / name
    if not source.exists():
        raise FileNotFoundError(f'Falta la escena a color: {name}')
    target = art / name
    original = backup / name
    if not original.exists():
        shutil.copy2(target, original)
    with Image.open(source) as raw:
        mode = 'RGBA' if raw.mode == 'RGBA' else 'RGB'
        colour = raw.convert(mode).resize((640, 512), Image.Resampling.LANCZOS)
        colour.save(target, optimize=True)
    report.append({
        'file': name,
        'source': str(source.relative_to(root)).replace('\\', '/'),
        'sepia_original': str(original.relative_to(root)).replace('\\', '/'),
        'size': [640, 512],
        'mode': mode,
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    })

note = '44 escenas de crónica a color, normalizadas a 640x512; los nombres sustituyen exactamente al sepia. Las siete piezas adicionales de la carpeta raíz no son escenas indexadas.'
index_text = re.sub(r'("note"\s*:\s*)"(?:\\.|[^"\\])*"',
                    lambda m: m.group(1) + json.dumps(note, ensure_ascii=False),
                    index_text, count=1)
(art / 'index.json').write_text(index_text, encoding='utf-8')
(batch / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(report)} escenas a color exportadas e indexadas.')
