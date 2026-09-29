"""Pone cada captura publicada junto a la maqueta V9 correspondiente."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
here = Path(__file__).resolve().parent
out = here / 'comparativas'
out.mkdir(exist_ok=True)
v9 = root / 'texturas-v9-2026-09-29/capturas'
revision = root / 'revision-v9-2026-09-29/capturas'
refs = {
    'portada': v9 / 'portada-04-anochecer-390x844.png',
    'valle': revision / 'valle-390x844.png',
    'tablon': v9 / 'tablon-after-390x844.png',
    'carro': revision / 'carro-390x844.png',
    'cronica': revision / 'cronica-390x844.png',
    'encrucijada': v9 / 'encrucijada-after-390x844.png',
}
for width, height in ((390, 844), (320, 568)):
    for scene, reference in refs.items():
        before = Image.open(reference).convert('RGB')
        live = Image.open(here / 'capturas' / f'{scene}-{width}x{height}.png').convert('RGB')
        gap, margin, header = 16, 16, 46
        pair = Image.new('RGB', (before.width + live.width + gap + 2*margin,
                                 max(before.height, live.height) + header + margin), '#e8ddca')
        pair.paste(before, (margin, header))
        pair.paste(live, (margin + before.width + gap, header))
        label = ImageDraw.Draw(pair)
        label.text((margin, 14), 'MAQUETA V9 · 390×844', fill='#34291b')
        label.text((margin + before.width + gap, 14),
                   f'JUEGO DESPLEGADO · {width}×{height}', fill='#34291b')
        pair.save(out / f'{scene}-{width}.jpg', quality=88)
print('12 comparativas; la referencia de 390 px se conserva sin deformar junto a la captura de 320 px.')
