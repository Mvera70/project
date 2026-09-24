# -*- coding: utf-8 -*-
u"""Recorta el logotipo del título de su fondo de cuadros pintado.

El logotipo lo generó Vera (24 sep 2026) con un generador de imágenes, y esos
generadores no dan transparencia: pintan **el tablero de cuadros gris y blanco
dentro de la imagen** y la entregan en JPG. Este script lo quita.

**Cómo:** todo píxel casi neutro y claro (los cuadros son 204 y 255) que se
alcanza desde el borde de la imagen es fondo. El contorno marrón oscuro que
rodea el logotipo entero hace de muro, así que el relleno no entra en las
letras, ni siquiera en la plata de «THE», que también es clara y neutra pero
está encerrada. Después se suaviza el canto un píxel para que el JPG no deje
un halo blanco sobre la madera.

  python tools/ui/cut-logo.py <entrada.jpg> <salida.png>

  python tools/ui/cut-logo.py docs/visual-reference/ui-wood/title-logo-en-2026-09-24.jpg \\
      public/ui/art/title-logo-en.png
"""
import sys
from collections import deque

from PIL import Image, ImageFilter

NEUTRAL = 16      # diferencia máxima entre canales para contar como gris
LIGHT = 180       # canal mínimo para contar como cuadro del tablero


def is_board(rgb):
    r, g, b = rgb
    return max(r, g, b) - min(r, g, b) <= NEUTRAL and min(r, g, b) >= LIGHT


def cut(src, out):
    image = Image.open(src).convert('RGB')
    w, h = image.size
    px = image.load()
    board = bytearray(w * h)
    queue = deque()
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))
    while queue:
        x, y = queue.popleft()
        i = y * w + x
        if board[i] or not is_board(px[x, y]):
            continue
        board[i] = 1
        if x > 0: queue.append((x - 1, y))
        if x < w - 1: queue.append((x + 1, y))
        if y > 0: queue.append((x, y - 1))
        if y < h - 1: queue.append((x, y + 1))
    # Y los bolsillos de tablero **encerrados** entre letras (entre la T, la H y
    # la V del primer logotipo): no se alcanzan desde el borde. Se reconocen
    # por la firma del tablero, mitad casillas de 204 y mitad de 255; los
    # brillos de la plata son claros y neutros pero no tienen esa mezcla.
    seen = bytearray(w * h)
    for sy in range(h):
        for sx in range(w):
            i0 = sy * w + sx
            if board[i0] or seen[i0] or not is_board(px[sx, sy]):
                continue
            region = []
            stack = [(sx, sy)]
            seen[i0] = 1
            while stack:
                x, y = stack.pop()
                region.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and not board[j] and is_board(px[nx, ny]):
                            seen[j] = 1
                            stack.append((nx, ny))
            if len(region) < 40:
                continue
            white = sum(1 for x, y in region if min(px[x, y]) >= 245)
            grey = sum(1 for x, y in region if 194 <= min(px[x, y]) <= 214)
            if white > 0.25 * len(region) and grey > 0.25 * len(region):
                for x, y in region:
                    board[y * w + x] = 1
    alpha = Image.new('L', (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            if board[y * w + x]:
                ap[x, y] = 0
    # Un píxel de canto comido y suavizado: el JPG mezcla el contorno con el
    # blanco del tablero y sin esto queda un halo claro sobre la madera.
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    result = image.convert('RGBA')
    result.putalpha(alpha)
    result = result.crop(alpha.getbbox())
    result.save(out, optimize=True)
    print(out, result.size)


if __name__ == '__main__':
    cut(sys.argv[1], sys.argv[2])
