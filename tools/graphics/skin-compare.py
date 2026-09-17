# -*- coding: utf-8 -*-
u"""Pone un recorte del prototipo al lado de la captura real. UI-V0, plan §6.

**Por que existe:** la tanda UI-R1 a UI-R6 entrego la estructura de los
prototipos y no su aspecto, y nadie lo vio hasta que se pusieron las imagenes
una al lado de la otra. Asi que el criterio de hecho de cada ronda de piel
deja de ser «se parece» y pasa a ser **esta imagen**: el agente la adjunta y
el coordinador decide. Las regiones estan escritas aqui, no las elige quien
implementa — si cada ronda recortara por donde le conviene, la comparativa no
compara nada.

Los prototipos miden 853 x 1844 y el juego 390 x 844 de CSS (780 x 1688 a
escala doble). El factor es 390/853 = 0,457: las cajas de abajo van en
coordenadas del **prototipo**, y el script escala la captura para que las dos
columnas midan lo mismo.

  python tools/graphics/skin-compare.py cabecera artifacts/graphics/UI/V1/valle.png
  python tools/graphics/skin-compare.py --list
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

PROTO = os.path.join('docs', 'ui-redesign', 'ui-prototypes')
OUT_DIR = os.path.join('artifacts', 'graphics', 'piel')

# Cada region: el prototipo del que sale, la caja en coordenadas del
# prototipo (izquierda, arriba, derecha, abajo) y para que ronda es.
REGIONS = {
    'cabecera': ('01-living-valley.png', (0, 0, 853, 230), u'UI-V1 · placa de fecha y las cuatro cifras'),
    'franja': ('01-living-valley.png', (0, 1420, 853, 1844), u'UI-V2 · bandeja, frase y navegacion'),
    'velocidad': ('01-living-valley.png', (600, 1320, 853, 1440), u'UI-V1 · los dos controles redondos'),
    'cabecera-cronica': ('02-chronicle-first.png', (0, 0, 853, 240), u'UI-V1 · la cabecera compacta de dos placas'),
    'pagina': ('02-chronicle-first.png', (0, 820, 853, 1400), u'UI-V3 · ANNO, capitular, linea de tiempo, entradas'),
    'sellado': ('02-chronicle-first.png', (0, 1360, 853, 1700), u'UI-V3/V5 · el documento sellado de una decision'),
    'nav-cronica': ('02-chronicle-first.png', (0, 1700, 853, 1844), u'UI-V2 · la navegacion con placa de madera'),
    'ficha-cabeza': ('03-people-of-the-valley.png', (0, 0, 853, 280), u'UI-V4 · medallon, nombre, oficio y rasgos'),
    'ficha-pie': ('03-people-of-the-valley.png', (0, 1180, 853, 1700), u'UI-V4 · relaciones, hoy, y los dos botones'),
    'nav-gente': ('03-people-of-the-valley.png', (0, 1690, 853, 1844), u'UI-V2 · la navegacion sobre madera'),
}

LABEL_H = 44
GAP = 8
BG = (20, 18, 15)
FG = (230, 220, 200)


def font(size):
    for path in [r'C:\Windows\Fonts\segoeuib.ttf', r'C:\Windows\Fonts\arialbd.ttf']:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def scaled(image, width):
    if image.width == width:
        return image
    height = int(image.height * width / image.width)
    return image.resize((width, height), Image.LANCZOS)


def main():
    if '--list' in sys.argv or len(sys.argv) < 3:
        print(__doc__)
        print(u'Regiones:')
        for name, (proto, box, who) in REGIONS.items():
            print(u'  %-18s %-26s %s' % (name, proto, who))
        return 0 if '--list' in sys.argv else 1

    name, shot_path = sys.argv[1], sys.argv[2]
    if name not in REGIONS:
        print(u'Region desconocida: %s. Prueba --list.' % name)
        return 1
    proto_name, box, who = REGIONS[name]

    proto = Image.open(os.path.join(PROTO, proto_name)).convert('RGB').crop(box)
    shot = Image.open(shot_path).convert('RGB')

    # La captura se escala al ancho del prototipo y se recorta por la **misma
    # fraccion** de alto: asi las dos columnas ensenan la misma parte de la
    # pantalla aunque la captura venga a 390 o a 780 de ancho.
    shot = scaled(shot, proto.width if False else 853)
    top = int(box[1] * shot.height / 1844.0)
    bottom = int(box[3] * shot.height / 1844.0)
    shot = shot.crop((0, top, shot.width, bottom))

    width = 500
    left = scaled(proto, width)
    right = scaled(shot, width)
    height = max(left.height, right.height)
    sheet = Image.new('RGB', (width * 2 + GAP, height + LABEL_H), BG)
    draw = ImageDraw.Draw(sheet)
    sheet.paste(left, (0, LABEL_H))
    sheet.paste(right, (width + GAP, LABEL_H))
    small = font(19)
    draw.rectangle([0, 0, width, LABEL_H], fill=(35, 30, 24))
    draw.rectangle([width + GAP, 0, width * 2 + GAP, LABEL_H], fill=(35, 30, 24))
    draw.text((10, 12), u'PROTOTIPO', font=small, fill=FG)
    draw.text((width + GAP + 10, 12), u'LO QUE HAY', font=small, fill=FG)

    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR)
    out = os.path.join(OUT_DIR, 'compara-%s.png' % name)
    sheet.save(out)
    print(u'%s  (%s)' % (out, who))
    return 0


if __name__ == '__main__':
    sys.exit(main())
