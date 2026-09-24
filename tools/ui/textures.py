# -*- coding: utf-8 -*-
u"""Genera las texturas de madera y de empedrado de la piel UI-W.

**Por qué texturas y no CSS:** la madera dibujada con degradados se queda en
chapa lisa con rayas —Vera lo dijo antes de verlo («sólo CSS va a quedar mal»)
y después de verlo («a la madera le falta calidad»)—. La veta, los nudos, las
juntas y el relieve de una piedra son dibujo, no geometría.

**Por qué un script y no un PNG pintado:** por lo mismo que `parchment.py`,
`deckle.py` y `torn-edge.py`: reproducible. Semilla fija y generador propio,
así que dos máquinas sacan el mismo fichero byte a byte y una captura no cambia
porque alguien regenerase la textura.

**Y sin costura:** todo el ruido es periódico en el tamaño del azulejo (la
rejilla de celdas da la vuelta), los tablones son un número entero de alturas y
las piedras se reparten sobre un toro. Repetido, no se ve dónde empieza.

Van a `src/ui/redesign/` por la razón de §13.4 que explica `parchment.py`: por
Vite resuelven igual desde la raíz y desde el subdirectorio de Pages.

  python tools/ui/textures.py   -> src/ui/redesign/wood-planks.png
                                   src/ui/redesign/cobble.png
                                   public/ui/art/title-valley-engraving.png

**Y el grabado de la portada**, que no es textura pero sale de la misma idea:
el paisaje del arco de `title-valley-higgsfield.png` pasado a **dos tintas**,
pardo oscuro sobre crema, como la referencia de Vera. Virarlo en CSS (primero
con `filter`, luego con una capa de color mezclada) teñía el papel de naranja
—«el color de fondo de la imagen no me gusta nada»—; aquí el papel sale crema
porque se decide píxel a píxel y no por mezcla.
"""
import math
import os

from PIL import Image, ImageFilter, ImageOps

SEED = 0x7A11  # fija: ver la cabecera
OUT_DIR = os.path.join('src', 'ui', 'redesign')


def rnd(x, y, salt):
    u"""Ruido entero determinista en [0, 1). Igual en cualquier máquina."""
    h = (x * 374761393 + y * 668265263 + salt * 2246822519 + SEED) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF) / 0x1000000


def smooth(t):
    return t * t * (3.0 - 2.0 * t)


def pnoise(u, v, cx, cy, salt):
    u"""Ruido de valor periódico: `u`, `v` en [0, 1), `cx` × `cy` celdas que dan la vuelta."""
    x = u * cx
    y = v * cy
    x0 = int(math.floor(x))
    y0 = int(math.floor(y))
    fx = smooth(x - x0)
    fy = smooth(y - y0)
    a = rnd(x0 % cx, y0 % cy, salt)
    b = rnd((x0 + 1) % cx, y0 % cy, salt)
    c = rnd(x0 % cx, (y0 + 1) % cy, salt)
    d = rnd((x0 + 1) % cx, (y0 + 1) % cy, salt)
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy


def clamp(value):
    return 0 if value < 0 else 255 if value > 255 else int(value)


# ------------------------------------------------------------------ la madera

WOOD_SIZE = 512
PLANK = 64                     # ocho tablones por azulejo
WOOD_BASE = (124, 80, 47)      # el castaño del mockup, antes de la veta


def wood():
    u"""Tablones horizontales: veta ondulada, anillos finos, un nudo y una junta por tablón."""
    size = WOOD_SIZE
    image = Image.new('RGB', (size, size))
    px = image.load()
    planks = size // PLANK
    # Lo que es de cada tablón: su tono, su fase de anillos, su nudo y su junta.
    tone = [0.86 + 0.24 * rnd(p, 0, 1) for p in range(planks)]
    phase = [rnd(p, 0, 2) * 40.0 for p in range(planks)]
    knot = [(rnd(p, 0, 3) * size, 16 + rnd(p, 0, 4) * 32, rnd(p, 0, 5) < 0.55) for p in range(planks)]
    joint = [int(rnd(p, 0, 6) * size) for p in range(planks)]
    for y in range(size):
        plank = y // PLANK
        v = y % PLANK
        kx, ky, has_knot = knot[plank]
        for x in range(size):
            u = x / size
            w = y / size
            # La veta: ondulación lenta a lo largo y rápida a lo ancho.
            bend = pnoise(u, w, 3, 16, 10 + plank) * 18.0 + pnoise(u, w, 9, 32, 20) * 5.0
            t = v + bend + phase[plank]
            # El nudo empuja los anillos a su alrededor (elipse tumbada).
            if has_knot:
                dx = min(abs(x - kx), size - abs(x - kx)) / 3.2
                dy = v - ky
                d = math.sqrt(dx * dx + dy * dy)
                t += 26.0 / (1.0 + d / 5.0)
                if d < 4.5:
                    t += 6.0
            ring = 0.5 + 0.5 * math.sin(t * 0.85)
            shade = 1.0 - 0.16 * ring ** 6 - 0.06 * ring
            # Vetas largas más claras y oscuras, y un grano fino.
            shade *= 0.9 + 0.2 * pnoise(u, w, 2, 48, 30)
            shade *= 0.96 + 0.08 * pnoise(u, w, 64, 128, 40)
            # El canto del tablón se oscurece: da el relieve de la tabla.
            edge = min(v, PLANK - 1 - v)
            shade *= 0.8 + 0.2 * smooth(min(edge, 7) / 7.0)
            # Las juntas: la ranura entre tablones y la de testa.
            if v < 2:
                shade *= 0.45
            elif v == 2:
                shade *= 1.12
            jx = (x - joint[plank]) % size
            if jx < 2:
                shade *= 0.5
            elif jx == 2:
                shade *= 1.1
            k = shade * tone[plank]
            px[x, y] = (clamp(WOOD_BASE[0] * k), clamp(WOOD_BASE[1] * k), clamp(WOOD_BASE[2] * k))
    image.save(os.path.join(OUT_DIR, 'wood-planks.png'), optimize=True)


# ---------------------------------------------------------------- el empedrado

COBBLE_SIZE = 384
GRID = 6                       # seis por seis piedras por azulejo
STONE_BASE = (132, 128, 120)
GAP = (48, 46, 41)
MOSS = (74, 92, 50)


def cobble():
    u"""Piedras de Voronoi sobre un toro: relieve por la distancia al borde, musgo en las juntas."""
    size = COBBLE_SIZE
    cell = size / GRID
    points = {}
    for gy in range(GRID):
        for gx in range(GRID):
            points[(gx, gy)] = ((gx + 0.2 + 0.6 * rnd(gx, gy, 50)) * cell,
                                (gy + 0.2 + 0.6 * rnd(gx, gy, 51)) * cell)
    edge = [[0.0] * size for _ in range(size)]
    owner = [[(0, 0)] * size for _ in range(size)]
    for y in range(size):
        cy = int(y // cell)
        for x in range(size):
            cx = int(x // cell)
            d1 = d2 = 1e9
            best = (0, 0)
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    gx = cx + ox
                    gy = cy + oy
                    sx, sy = points[(gx % GRID, gy % GRID)]
                    sx += math.floor(gx / GRID) * size
                    sy += math.floor(gy / GRID) * size
                    d = math.hypot(x - sx, y - sy)
                    if d < d1:
                        d2 = d1
                        d1 = d
                        best = (gx % GRID, gy % GRID)
                    elif d < d2:
                        d2 = d
            edge[y][x] = d2 - d1
            owner[y][x] = best
    image = Image.new('RGB', (size, size))
    px = image.load()
    for y in range(size):
        for x in range(size):
            e = edge[y][x]
            u = x / size
            w = y / size
            if e < 3.2:
                moss = pnoise(u, w, 24, 24, 60)
                col = MOSS if moss > 0.62 else GAP
                k = 0.85 + 0.3 * pnoise(u, w, 48, 48, 61)
                px[x, y] = (clamp(col[0] * k), clamp(col[1] * k), clamp(col[2] * k))
                continue
            gx, gy = owner[y][x]
            tone = 0.82 + 0.3 * rnd(gx, gy, 70)
            warm = rnd(gx, gy, 71) * 10.0
            # Luz de arriba a la izquierda: el borde que la mira se aclara y el
            # contrario se oscurece; el centro de la piedra queda plano.
            ex = edge[y][(x + 2) % size] - edge[y][(x - 2) % size]
            ey = edge[(y + 2) % size][x] - edge[(y - 2) % size][x]
            lit = -(ex + ey) * 0.06
            bevel = smooth(min(e - 3.2, 9.0) / 9.0)
            shade = tone * (0.78 + 0.22 * bevel) * (1.0 + lit * (1.0 - bevel))
            shade *= 0.9 + 0.2 * pnoise(u, w, 32, 32, 72)
            shade *= 0.95 + 0.1 * pnoise(u, w, 96, 96, 73)
            px[x, y] = (clamp((STONE_BASE[0] + warm) * shade), clamp((STONE_BASE[1] + warm * 0.6) * shade),
                        clamp(STONE_BASE[2] * shade))
    image.save(os.path.join(OUT_DIR, 'cobble.png'), optimize=True)


# ------------------------------------------------------ el grabado de la portada

ENGRAVING_SRC = os.path.join('public', 'ui', 'art', 'title-valley-higgsfield.png')
ENGRAVING_OUT = os.path.join('public', 'ui', 'art', 'title-valley-engraving.png')
# El paisaje dentro del arco, sin el marco pintado de la ilustración: medido
# sobre el PNG de 752 × 1344.
ENGRAVING_BOX = (252, 452, 510, 764)
INK = '#3A2412'
PAPER = '#F3E7CC'


def engraving():
    u"""El paisaje en dos tintas: escala de grises, contraste, y del pardo al crema."""
    art = Image.open(ENGRAVING_SRC).convert('RGB').crop(ENGRAVING_BOX)
    art = art.resize((art.width * 2, art.height * 2), Image.LANCZOS)
    gray = ImageOps.autocontrast(ImageOps.grayscale(art), cutoff=1)
    gray = gray.filter(ImageFilter.UnsharpMask(radius=2, percent=160, threshold=2))
    # Aclara los medios: el papel tiene que leerse crema y la tinta, línea.
    gray = gray.point(lambda v: int(255 * ((v / 255.0) ** 0.66)))
    ImageOps.colorize(gray, black=INK, white=PAPER, mid='#A0825A').save(ENGRAVING_OUT, optimize=True)


if __name__ == '__main__':
    wood()
    cobble()
    engraving()
    print('wood-planks.png, cobble.png y title-valley-engraving.png')
