# -*- coding: utf-8 -*-
"""Recorta piezas pintadas de un prototipo y las deja listas para la interfaz.

Hermana de `trace-glyph.py`, y la division del trabajo entre las dos es la que
importa:

- **`trace-glyph.py` para lo que es linea o silueta** —un icono, una palmeta, un
  rombo, una rama—: sale un `<path>` que toma el color de quien lo usa y escala
  sin limite.
- **`cut-art.py` para lo que es pintura** —un capitular ilustrado, una vineta a
  pluma—: calcarlo daria un borron negro, porque no es una silueta sino un
  dibujo con medios tonos. Aqui se recorta el pixel tal cual.

Dos modos:

    python tools/ui/cut-art.py plain  <png> <x0> <y0> <x1> <y1> <salida> [ancho]
    python tools/ui/cut-art.py wash   <png> <x0> <y0> <x1> <y1> <salida> [ancho]

`plain` recorta y reescala, y nada mas: para una pieza que trae su propio fondo
(el capitular, que es oro sobre un cuadrado rojo).

`wash` es el interesante: la pieza es **tinta sobre papel**, y el papel del
prototipo no es el papel del juego. Asi que se tira el fondo y se guarda **el
dibujo como alfa**: cada pixel se vuelve tinta con una opacidad que sale de lo
oscuro que era. El resultado se compone encima de cualquier papel sin que se
vea un recuadro de otro tono, que es lo que pasaria recortando a lo bruto, y
conserva los medios tonos del aguado en vez de convertirlos en un contorno.
"""
import sys

from PIL import Image

# La tinta del juego, `--skin-ink` de `src/ui/redesign/tokens.css`. El aguado se
# tine de este color y el medio tono lo pone el alfa.
INK = (27, 22, 19)


def cut(png, box, out, width=None, wash=False, floor=0.06):
    im = Image.open(png).convert('RGB').crop(box)
    if wash:
        gray = im.convert('L')
        px = list(gray.getdata())
        # El papel es el tono mas repetido de la pieza; la tinta, el 2 % mas
        # oscuro. Entre esos dos extremos se reparte el alfa.
        hist = gray.histogram()
        paper = max(range(256), key=lambda v: hist[v])
        order = sorted(px)
        ink = order[max(0, int(len(order) * 0.02))]
        span = max(1, paper - ink)
        alpha = []
        for value in px:
            a = (paper - value) / span
            a = 0.0 if a < floor else min(1.0, a)
            alpha.append(int(round(a * 255)))
        out_im = Image.new('RGBA', im.size, INK + (0,))
        out_im.putalpha(Image.frombytes('L', im.size, bytes(alpha)))
        print('papel %d, tinta %d' % (paper, ink))
    else:
        out_im = im.convert('RGBA')
    if width is not None and width != out_im.width:
        height = max(1, round(out_im.height * width / out_im.width))
        out_im = out_im.resize((width, height), Image.LANCZOS)
    out_im.save(out, optimize=True)
    import os
    print('%s  %dx%d  %d bytes' % (out, out_im.width, out_im.height,
                                   os.path.getsize(out)))


def main():
    mode = sys.argv[1]
    png = sys.argv[2]
    box = tuple(int(v) for v in sys.argv[3:7])
    out = sys.argv[7]
    width = int(sys.argv[8]) if len(sys.argv) > 8 else None
    cut(png, box, out, width=width, wash=(mode == 'wash'))


if __name__ == '__main__':
    main()
