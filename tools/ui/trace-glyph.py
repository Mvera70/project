# -*- coding: utf-8 -*-
"""Calca un glifo de un prototipo y lo devuelve como `<path>` de 24 x 24.

**Por que existe.** Cuatro intentos de *deducir* la forma de la pila de lena
con geometria salieron mal, y el quinto tambien: aproximar a ojo un dibujo que
ya existe es el camino largo. Esto hace lo contrario —lee el pixel del
prototipo y saca su silueta—, asi que el icono no se parece al prototipo: **es**
el prototipo.

Como: umbral de Otsu para separar tinta de papel, seguimiento del borde de
pixel (cada lado de pixel cuya vecina no es tinta es una arista; las aristas se
cosen en lazos cerrados), Ramer-Douglas-Peucker para quitar la escalera, y dos
pasadas de Chaikin para redondear. Los claros encerrados —las testas de los
troncos— salen como lazos propios y con `fill-rule="evenodd"` quedan **agujeros
de verdad**, no parches del color del fondo: asi el icono vale sobre cualquier
papel.

Uso:
    python tools/ui/trace-glyph.py <png> <x0> <y0> <x1> <y1> [bias]

Y lo que ya esta calcado con el, con su recuadro y su corte escritos en el
comentario del propio `<symbol>`, en `public/ui/icons.svg`:

    madera: (462, 139, 517, 180) del prototipo 01, bias -40

El `bias` corre el umbral. Hacia abajo la tinta adelgaza, que es lo que abre
las juntas claras entre piezas pegadas; en la pila de lena hacen falta -40 o
sale un solo bulto con agujeros.
"""
import sys

from PIL import Image

# ----------------------------------------------------------------- el umbral


def otsu(hist):
    """El corte que mejor separa las dos poblaciones de gris."""
    total = sum(hist)
    sum_all = sum(i * h for i, h in enumerate(hist))
    best, cut = -1.0, 128
    w_b = 0
    sum_b = 0
    for level in range(256):
        w_b += hist[level]
        if w_b == 0:
            continue
        w_f = total - w_b
        if w_f == 0:
            break
        sum_b += level * hist[level]
        between = w_b * w_f * ((sum_b / w_b) - ((sum_all - sum_b) / w_f)) ** 2
        if between > best:
            best, cut = between, level
    return cut


# ------------------------------------------------------------- los contornos

def loops_of(ink, w, h):
    """Cose en lazos cerrados los lados de pixel que separan tinta de papel."""
    edges = {}

    def add(a, b):
        edges.setdefault(a, []).append(b)

    for y in range(h):
        for x in range(w):
            if not ink[y * w + x]:
                continue
            if y == 0 or not ink[(y - 1) * w + x]:
                add((x + 1, y), (x, y))
            if y == h - 1 or not ink[(y + 1) * w + x]:
                add((x, y + 1), (x + 1, y + 1))
            if x == 0 or not ink[y * w + x - 1]:
                add((x, y), (x, y + 1))
            if x == w - 1 or not ink[y * w + x + 1]:
                add((x + 1, y + 1), (x + 1, y))

    out = []
    while edges:
        start = next(iter(edges))
        loop = [start]
        node = start
        while True:
            nxt = edges[node].pop()
            if not edges[node]:
                del edges[node]
            if nxt == start:
                break
            loop.append(nxt)
            node = nxt
            if node not in edges:      # lazo roto: no deberia pasar
                break
        if len(loop) > 7:
            out.append(loop)
    return out


def area(loop):
    """El area con signo, para tirar el ruido y ordenar por tamano."""
    total = 0.0
    for i, (x, y) in enumerate(loop):
        x2, y2 = loop[(i + 1) % len(loop)]
        total += x * y2 - x2 * y
    return abs(total) / 2


# ---------------------------------------------------------- simplificar

def rdp(points, eps):
    """Ramer-Douglas-Peucker sobre un lazo cerrado."""
    if len(points) < 4:
        return points

    def walk(lo, hi):
        ax, ay = points[lo]
        bx, by = points[hi]
        dx, dy = bx - ax, by - ay
        norm = (dx * dx + dy * dy) ** 0.5 or 1.0
        worst, which = 0.0, None
        for i in range(lo + 1, hi):
            px, py = points[i]
            dist = abs(dy * (px - ax) - dx * (py - ay)) / norm
            if dist > worst:
                worst, which = dist, i
        if worst <= eps or which is None:
            return [points[lo]]
        return walk(lo, which) + walk(which, hi)

    # Se parte el lazo por los dos puntos mas alejados para no anclar mal.
    far = max(range(len(points)),
              key=lambda i: (points[i][0] - points[0][0]) ** 2
              + (points[i][1] - points[0][1]) ** 2)
    a, b = min(0, far), max(0, far)
    first = walk(a, b)
    rolled = points[b:] + points[:a + 1]

    def walk2(pts, lo, hi):
        ax, ay = pts[lo]
        bx, by = pts[hi]
        dx, dy = bx - ax, by - ay
        norm = (dx * dx + dy * dy) ** 0.5 or 1.0
        worst, which = 0.0, None
        for i in range(lo + 1, hi):
            px, py = pts[i]
            dist = abs(dy * (px - ax) - dx * (py - ay)) / norm
            if dist > worst:
                worst, which = dist, i
        if worst <= eps or which is None:
            return [pts[lo]]
        return walk2(pts, lo, which) + walk2(pts, which, hi)

    second = walk2(rolled, 0, len(rolled) - 1)
    return first + second[1:]


def chaikin(points, rounds=2):
    """Redondea las esquinas de la escalera sin mover el bulto."""
    for _ in range(rounds):
        out = []
        n = len(points)
        for i in range(n):
            x0, y0 = points[i]
            x1, y1 = points[(i + 1) % n]
            out.append((0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1))
            out.append((0.25 * x0 + 0.75 * x1, 0.75 * y1 + 0.25 * y0))
        points = out
    return points


# ------------------------------------------------------------------- el path

def trace(png, box, upscale=3, viewbox=24.0, margin=1.0, eps=1.6, keep=0.004,
          bias=0, invert=False, aspect=False):
    im = Image.open(png).convert('L').crop(box)
    im = im.resize((im.width * upscale, im.height * upscale), Image.LANCZOS)
    w, h = im.size
    px = list(im.getdata())   # noqa: la API nueva no esta en Pillow 10
    # `bias` corre el corte de Otsu. Hacia abajo la tinta se adelgaza y **las
    # juntas claras entre troncos se abren**: con el corte de Otsu a secas la
    # pila calcada salia como un solo bulto con agujeros.
    cut = otsu(im.histogram()) + bias
    # `invert`: la pieza es **clara sobre oscuro**, no tinta sobre papel. Hace
    # falta para el oro del capitular de la cronica, que es lo claro dentro de
    # un cuadrado rojo; sin esto se calca el rojo y sale un cuadrado.
    ink = [v > cut for v in px] if invert else [v < cut for v in px]

    loops = loops_of(ink, w, h)
    if not loops:
        raise SystemExit('no se ha encontrado tinta: prueba otro recuadro')
    biggest = max(area(loop) for loop in loops)
    loops = [loop for loop in loops if area(loop) >= biggest * keep]
    loops.sort(key=area, reverse=True)

    smoothed = [chaikin(rdp(loop, eps * upscale / 3)) for loop in loops]

    xs = [p[0] for loop in smoothed for p in loop]
    ys = [p[1] for loop in smoothed for p in loop]
    # `aspect`: en vez de meter la pieza en un cuadrado, se devuelve un
    # `viewBox` con la proporcion real. Un icono quiere el cuadrado; una rama
    # de borde o una palmeta, no -- deformarlas es peor que no ponerlas.
    wide, tall = max(xs) - min(xs), max(ys) - min(ys)
    span = max(wide, tall) or 1.0
    scale = (viewbox - 2 * margin) / span
    if aspect:
        off_x = off_y = margin
        view = (wide * scale + 2 * margin, tall * scale + 2 * margin)
    else:
        off_x = margin + (viewbox - 2 * margin - wide * scale) / 2
        off_y = margin + (viewbox - 2 * margin - tall * scale) / 2
        view = (viewbox, viewbox)

    def place(p):
        return ((p[0] - min(xs)) * scale + off_x, (p[1] - min(ys)) * scale + off_y)

    parts = []
    for loop in smoothed:
        pts = [place(p) for p in loop]
        # Un lazo suavizado por Chaikin es ya casi una curva: se vuelve a
        # simplificar en el espacio final para que el `d=` no sea kilometrico.
        pts = rdp(pts, 0.06)
        head = 'M%.2f %.2f' % pts[0]
        body = ''.join('L%.2f %.2f' % p for p in pts[1:])
        parts.append(head + body + 'Z')
    if aspect:
        return ''.join(parts), len(smoothed), view
    return ''.join(parts), len(smoothed)


def main():
    png = sys.argv[1]
    box = tuple(int(v) for v in sys.argv[2:6])
    bias = int(sys.argv[6]) if len(sys.argv) > 6 else 0
    d, n = trace(png, box, bias=bias)
    print('lazos: %d · caracteres: %d' % (n, len(d)))
    print(d)


if __name__ == '__main__':
    main()
