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
                                   src/ui/redesign/metal.png
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

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

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


# ------------------------------------------------------------------ el metal

METAL_SIZE = 256
IRON = (78, 80, 84)            # hierro forjado, gris azulado oscuro
RUST = (128, 66, 32)           # el óxido que se come los bordes
RUST_DEEP = (84, 40, 20)


def metal():
    iron_image().save(os.path.join(OUT_DIR, 'metal.png'), optimize=True)


def iron_image():
    u"""Hierro viejo: forjado, picado, con óxido y marcas de martillo.

    Para las letras del título. La primera versión era plata cepillada y
    quedaba limpia y brillante, «para un título de PowerPoint» (Vera, 24 sep);
    lo que se pidió es «más efecto de hierro antiguo», con textura. El
    volumen lo ponen las sombras del CSS; esto es la superficie.
    """
    size = METAL_SIZE
    image = Image.new('RGB', (size, size))
    px = image.load()
    for y in range(size):
        for x in range(size):
            u = x / size
            w = y / size
            # Martillazos: manchas medias más claras y más oscuras.
            hammer = 0.82 + 0.3 * pnoise(u, w, 10, 10, 80) + 0.1 * pnoise(u, w, 24, 24, 81)
            grain = 0.9 + 0.2 * pnoise(u, w, 96, 96, 82)
            k = hammer * grain
            col = [IRON[0] * k, IRON[1] * k, IRON[2] * k]
            # Óxido: manchas grandes donde el ruido lento sube, más hondas en
            # su centro.
            rust = pnoise(u, w, 5, 5, 83) * 0.7 + pnoise(u, w, 17, 17, 84) * 0.3
            if rust > 0.58:
                t = min(1.0, (rust - 0.58) / 0.22)
                deep = RUST_DEEP if pnoise(u, w, 40, 40, 85) > 0.55 else RUST
                col = [col[c] * (1 - t * 0.85) + deep[c] * t * 0.85 * grain for c in range(3)]
            # Picaduras: puntos sueltos oscuros, algunos con su halo de óxido.
            pit = rnd(x, y, 86)
            if pit < 0.018:
                col = [c * 0.45 for c in col]
            elif pit < 0.03:
                col = [col[0] * 0.8 + 18, col[1] * 0.8 + 6, col[2] * 0.8]
            px[x, y] = (clamp(col[0]), clamp(col[1]), clamp(col[2]))
    return image


# ------------------------------------------------------------------ el logotipo

FONT = os.path.join('src', 'ui', 'redesign', 'fonts', 'cinzel.woff2')
# El nombre del juego en cada lengua del banco (`title.name`): un logotipo en
# imagen no se traduce solo, así que hay uno por lengua.
LOGOS = {'en': 'THE VALLEY', 'es': 'EL VALLE'}
LOGO_W, LOGO_H = 1500, 480     # se pinta a triple tamaño y se lee a ~340 px
EXTRUDE = 28                   # el lateral de la letra, en píxeles del lienzo
SIDE_NEAR = (92, 74, 58)       # el lateral junto a la cara, hierro en sombra
SIDE_FAR = (30, 22, 16)        # y el fondo del lateral
OUTLINE = (22, 15, 10)


def logo(lang, text):
    u"""El título como logotipo: hierro viejo con bisel, extrusión y contorno.

    Vera, 24 sep, con la portada de un juego como ejemplo de «profundidad y
    3D»: las letras tienen cara, lateral y contorno, no efectos sobre texto.
    Con CSS sobre texto no se llega; pintado aquí, sí, y sale igual siempre.
    """
    font = ImageFont.truetype(FONT, 200)
    font.set_variation_by_axes([900])
    box = font.getbbox(text)
    scale = min(1.0, 1320 / (box[2] - box[0]))
    if scale < 1.0:
        font = ImageFont.truetype(FONT, int(200 * scale))
        font.set_variation_by_axes([900])
        box = font.getbbox(text)
    mask = Image.new('L', (LOGO_W, LOGO_H), 0)
    x = (LOGO_W - (box[2] - box[0])) // 2 - box[0]
    y = 90 - box[1]
    ImageDraw.Draw(mask).text((x, y), text, font=font, fill=255)
    outline = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MaxFilter(5))

    canvas = Image.new('RGBA', (LOGO_W, LOGO_H), (0, 0, 0, 0))
    # La sombra en la tabla, larga y blanda.
    shadow = ImageChops.offset(outline.filter(ImageFilter.MaxFilter(7)), 0, EXTRUDE + 10)
    shadow = shadow.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.7))
    canvas.paste((0, 0, 0, 255), (0, 0), shadow)
    # El lateral: la silueta con contorno repetida hacia abajo, de lejos a cerca.
    for d in range(EXTRUDE, 0, -1):
        t = d / EXTRUDE
        col = tuple(int(SIDE_NEAR[c] * (1 - t) + SIDE_FAR[c] * t) for c in range(3)) + (255,)
        canvas.paste(col, (0, 0), ImageChops.offset(outline, 0, d))
    # El contorno oscuro que separa la cara del lateral y de la madera.
    canvas.paste(OUTLINE + (255,), (0, 0), outline)
    # La cara: hierro con la luz de arriba y el bisel de los cantos.
    # El azulejo de 256 se repetía a la vista en columnas de óxido iguales:
    # aquí va a triple tamaño, que a lo ancho del título no llega a repetirse.
    iron = iron_image().resize((768, 768), Image.BICUBIC)
    face = Image.new('RGB', (LOGO_W, LOGO_H))
    for ty in range(0, LOGO_H, iron.height):
        for tx in range(0, LOGO_W, iron.width):
            face.paste(iron, (tx, ty))
    top, bottom = y + box[1], y + box[3]
    light = Image.new('L', (LOGO_W, LOGO_H))
    lp = light.load()
    for yy in range(LOGO_H):
        t = min(1.0, max(0.0, (yy - top) / max(1, bottom - top)))
        v = int(255 * (1.35 - 0.6 * t) / 1.35)
        for xx in range(LOGO_W):
            lp[xx, yy] = v
    face = ImageChops.multiply(face, Image.merge('RGB', (light, light, light)))
    face = face.point(lambda v: min(255, int(v * 1.8)))
    soft = mask.filter(ImageFilter.GaussianBlur(5))
    lit = ImageChops.subtract(soft, ImageChops.offset(soft, 0, 6)).point(lambda v: min(255, v * 3))
    shade = ImageChops.subtract(ImageChops.offset(soft, 0, 6), soft).point(lambda v: min(255, v * 2))
    face = Image.composite(Image.new('RGB', face.size, (238, 226, 206)), face, lit.point(lambda v: int(v * 0.75)))
    face = Image.composite(Image.new('RGB', face.size, (20, 16, 12)), face, shade.point(lambda v: int(v * 0.6)))
    canvas.paste(face, (0, 0), mask)
    canvas = canvas.crop(canvas.getbbox())
    canvas.save(os.path.join('public', 'ui', 'art', f'title-logo-{lang}.png'), optimize=True)


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
    metal()
    engraving()
    for lang, text in LOGOS.items():
        logo(lang, text)
    print('wood-planks.png, cobble.png, metal.png y title-valley-engraving.png')
