# -*- coding: utf-8 -*-
u"""Genera el mosaico de pergamino de la interfaz. UI-V0, `plan-piel.md` §2.

**Por que un script y no un PNG pintado a mano:** tiene que ser reproducible.
Dos maquinas, dos ejecuciones, el mismo fichero byte a byte — asi una captura
comparada contra el prototipo no cambia porque alguien regenerase la textura.
De ahi la semilla fija y el generador propio (`random` de Python cambia entre
versiones; este no).

Va en `src/ui/redesign/` y no en `public/`, y el motivo es §13.4: el mismo
`dist/` tiene que servir desde la raiz de un dominio y desde el subdirectorio
de Pages sin reconstruirse. Un fichero de `public/` se pide por ruta absoluta
y ahi se rompe; uno que pasa por Vite sale del CSS con una ruta relativa que
resuelve en los dos sitios. El service worker lo guarda en la primera visita
(`cacheFirst`), asi que la segunda abre sin red con su textura.

Lo que produce es **gris muy claro, alrededor de 246**, para multiplicarse
encima del color del token (`background-blend-mode: multiply`): la textura da
el grano y las vetas, el color lo sigue mandando `tokens.css`. Si la textura
llevara su propio tono, cada superficie de pergamino tendria dos fuentes de
color y discutirian.

**Por que 246 y no 128, que es el fallo que costo una vuelta:** `multiply`
divide, no matiza. Con la textura centrada en 128, el pergamino claro
(#E5D3BB) salia a la mitad de luz —un gris barro— y el texto encima dejaba de
leerse; se vio en el muestrario de UI-V0 a la primera. Con 246 el papel se
oscurece como mucho un 8 %, que es lo que se nota como grano sin ensuciar.

  python tools/ui/parchment.py          -> src/ui/redesign/parchment.png
"""
import math
import os
import struct
import zlib

SIZE = 256
SEED = 0x5A17  # fija: ver la cabecera
OUT = os.path.join('src', 'ui', 'redesign', 'parchment.png')

# Amplitudes en niveles de gris sobre BASE. Suman ~20, asi que el papel se
# oscurece entre 0 y un 8 %: se tiene que notar y no ensuciar.
BASE = 246.0
GRAIN = 5.0        # ruido fino, el grano del papel
FIBRE = 6.0        # vetas largas, la fibra
BLOTCH = 8.0       # manchas suaves, el envejecido


def rnd(x, y, salt):
    u"""Ruido entero determinista en [0, 1). Igual en cualquier maquina."""
    h = (x * 374761393 + y * 668265263 + salt * 2246822519 + SEED) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF) / 0x1000000


def smooth(t):
    return t * t * (3.0 - 2.0 * t)


def value_noise(x, y, cells, salt):
    u"""Ruido de valor interpolado, **ciclico** en `SIZE`: el mosaico repite
    sin costura porque las esquinas de la rejilla se toman modulo `cells`."""
    step = SIZE / float(cells)
    gx, gy = x / step, y / step
    x0, y0 = int(math.floor(gx)), int(math.floor(gy))
    fx, fy = smooth(gx - x0), smooth(gy - y0)
    x0 %= cells
    y0 %= cells
    x1, y1 = (x0 + 1) % cells, (y0 + 1) % cells
    a = rnd(x0, y0, salt)
    b = rnd(x1, y0, salt)
    c = rnd(x0, y1, salt)
    d = rnd(x1, y1, salt)
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def pixel(x, y):
    grain = (value_noise(x, y, 128, 1) - 0.5) * 2 * GRAIN
    # La fibra se estira en horizontal: mucha resolucion en x, poca en y.
    fibre = (value_noise(x * 0.25, y * 3.0, 64, 2) - 0.5) * 2 * FIBRE
    blotch = (value_noise(x, y, 8, 3) - 0.5) * 2 * BLOTCH
    # Siempre por debajo de BASE: `multiply` solo puede oscurecer, asi que la
    # textura resta luz y nunca la anade (un valor por encima no haria nada).
    value = BASE - abs(grain) - abs(fibre) * 0.6 - abs(blotch) * 0.8
    return max(0, min(255, int(round(value))))


def png(rows):
    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    raw = b''.join(b'\x00' + bytes(row) for row in rows)
    head = struct.pack('>IIBBBBB', SIZE, SIZE, 8, 0, 0, 0, 0)  # 8 bits, gris
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', head)
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


def main():
    rows = [[pixel(x, y) for x in range(SIZE)] for y in range(SIZE)]
    data = png(rows)
    folder = os.path.dirname(OUT)
    if folder and not os.path.isdir(folder):
        os.makedirs(folder)
    with open(OUT, 'wb') as handle:
        handle.write(data)
    lo = min(min(r) for r in rows)
    hi = max(max(r) for r in rows)
    print('%s  %d x %d  %d bytes  gris %d..%d' % (OUT, SIZE, SIZE, len(data), lo, hi))
    print('huella zlib %08x  (tiene que ser igual en cualquier maquina)'
          % (zlib.crc32(data) & 0xFFFFFFFF))


if __name__ == '__main__':
    main()
