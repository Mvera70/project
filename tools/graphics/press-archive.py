# Guarda una tanda del paquete de prensa en `docs/interfaz/<fecha>/`, como la
# versión de la interfaz de ese día. Lo pidió Vera el 27 sep 2026: «guárdalas
# en una carpeta en docs como versión actual de la interfaz, y cada vez que
# tengamos que hacer una nueva, podamos ir haciendo esta tanda de fotos».
#
# Los PNG del paquete pesan uno o dos megas cada uno (390 × 844 a densidad ×3):
# un centenar serían cien megas en el repositorio por versión. Aquí se guardan
# en JPG a densidad ×2 (780 de ancho), que se lee igual en una pantalla y pesa
# diez veces menos. Los originales siguen en `artifacts/graphics/press/`.
#
# Se renumera de corrido: el paquete se hace en varias pasadas y deja huecos y
# números repetidos. El pie de cada captura sale del `manifest.json` del paquete.
#
#   python tools/graphics/press-archive.py --date 2026-09-27
#   python tools/graphics/press-archive.py --date 2026-09-27 --skip letargo,render-canvas
import argparse
import shutil
import json
import re
from pathlib import Path

from PIL import Image

# **La división de interfaz** (Vera, 27 sep 2026: «haz una división duplicando
# las que sean exclusivas de UI, donde se vean elementos nuevos»). Las capturas
# que enseñan una pieza de pantalla —un panel, un botón, una hoja— se copian
# además a `ui/`, para revisar la interfaz sin el metraje del valle. Se nombran
# por su nombre de captura, que no cambia entre versiones; una captura nueva
# con interfaz propia se añade aquí.
UI_SHOTS = {
    # menú y anales
    'carga', 'menu', 'menu-taller', 'annals-archivo', 'annals-vacio',
    # el valle y sus mandos
    'valle', 'valle-regleta', 'valle-pausa', 'valle-despejado', 'amenaza-aviso',
    # crónica
    'cronica', 'cronica-leyendo', 'sello-cronica',
    # gente
    'gente', 'ficha-desde-lista', 'ficha-siguiendo', 'ficha-vida', 'ficha-vida-final',
    # carro, decisiones, líder
    'carro', 'carro-dado', 'encrucijada', 'decision-aplazada', 'sello', 'oferta',
    'amenaza-pendiente', 'corona-lista', 'corona-puesta',
    # caza y paneles
    'caza-ocasion', 'caza-aros', 'caza-veredicto', 'tocar-1', 'tocar-3',
    'bienvenida',
    # finales
    'final-stormed-transicion', 'lapida-stormed', 'lapida-extinction', 'lapida-abandoned',
    'lapida-dispersed', 'final-stormed-cuentas-abajo',
    # taller: el banco de batallas no es del producto final
    'banco-cargando', 'banco', 'banco-panel-otro',
}

parser = argparse.ArgumentParser()
parser.add_argument('--src', default='artifacts/graphics/press')
parser.add_argument('--date', required=True, help='fecha de la versión, AAAA-MM-DD')
parser.add_argument('--skip', default='', help='nombres de captura que no se guardan, separados por comas')
parser.add_argument('--width', type=int, default=780)
parser.add_argument('--quality', type=int, default=82)
args = parser.parse_args()

src = Path(args.src)
dest = Path('docs/interfaz') / args.date
if dest.exists() and any(dest.iterdir()):
    raise SystemExit(f'{dest} ya existe: una versión no se pisa. Usa otra fecha o bórrala a mano.')
dest.mkdir(parents=True, exist_ok=True)
skip = {name for name in args.skip.split(',') if name}

manifest = json.loads((src / 'manifest.json').read_text(encoding='utf-8'))
notes = {shot['id']: shot.get('note', '') for shot in manifest.get('shots', [])}

def order(path: Path):
    match = re.match(r'(\d+)-', path.name)
    return (int(match.group(1)) if match else 9999, path.name)

rows = []
for png in sorted(src.glob('[0-9]*-*.png'), key=order):
    stem = png.stem
    name = re.sub(r'^\d+-', '', stem)
    if name in skip:
        continue
    number = len(rows) + 1
    out = f'{number:03d}-{name}.jpg'
    image = Image.open(png).convert('RGB')
    height = round(image.height * args.width / image.width)
    image.resize((args.width, height), Image.LANCZOS).save(dest / out, 'JPEG', quality=args.quality, optimize=True)
    rows.append((number, out, name, notes.get(stem, '')))
    if name in UI_SHOTS:
        (dest / 'ui').mkdir(exist_ok=True)
        shutil.copyfile(dest / out, dest / 'ui' / out)

lines = [
    f'# La interfaz el {args.date}',
    '',
    f'{len(rows)} capturas del paquete de prensa (`tools/graphics/press-kit.mjs`), '
    f'móvil de {manifest.get("width")} × {manifest.get("height")} puntos, valle '
    f'{manifest.get("seed")} en el año {manifest.get("year")} salvo donde el pie diga otra cosa. '
    'Guardadas con `tools/graphics/press-archive.py`; cómo se hace una versión nueva, en '
    '[`../README.md`](../README.md).',
    '',
]
ui_rows = [row for row in rows if row[2] in UI_SHOTS]
if ui_rows:
    lines += [
        f'## Sólo interfaz ({len(ui_rows)})',
        '',
        'Copia en [`ui/`](ui/) de las que enseñan una pieza de pantalla: menús, paneles, '
        'hojas, botones. Las del banco de batallas son de taller, no del producto final.',
        '',
        '| # | Captura | Qué enseña |',
        '|---|---|---|',
    ]
    for number, out, name, note in ui_rows:
        lines.append(f'| {number} | <a href="ui/{out}"><img src="ui/{out}" width="160" alt="{name}"></a> | **{name}** · {note} |')
    lines.append('')
lines += [
    f'## Todas ({len(rows)})',
    '',
    '| # | Captura | Qué enseña |',
    '|---|---|---|',
]
for number, out, name, note in rows:
    lines.append(f'| {number} | <a href="{out}"><img src="{out}" width="160" alt="{name}"></a> | **{name}** · {note} |')
(dest / 'README.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
size = sum(p.stat().st_size for p in dest.glob('*.jpg')) / 1e6
print(f'{len(rows)} capturas en {dest} ({size:.1f} MB)')
