# -*- coding: utf-8 -*-
u"""Genera el canto rasgado de la hoja. VZ-2, plan-voz.md; `piel-del-valle` SKILL.md.

**Por que existe.** Las tres secciones tenian tres cantos distintos —el liston
de madera curvo en la bandeja, un corte recto con franja de fusion en la
cronica, y una esquina redondeada con sombra en la hoja de gente— y dos tonos
de papel. El dueno del diseno lo corto mirando la tablet: «que cada seccion
tenga un borde diferente y ademas el fondo no sea de la misma tonalidad ni
textura, no me gusta nada; queda fatal cuando cambias entre pestanas». De las
tres alternativas que se le ensenaron eligio esta: **el papel se desgarra**.

**Se escribe, no se calcula**, igual que los `clip-path` de `deckle.py` y por
el mismo motivo: un borde que cambia entre fotogramas tiembla, y la
comparativa contra el prototipo tiene que dar siempre la misma imagen.

**Y es un azulejo que se repite, no una pieza que se estira.** Ahi esta la
leccion que costo dos rondas: el liston de madera se estiraba con
`background-size: 100% 100%` y a 750 px era «una recta con dos ganchos en las
puntas». Un desgarro de 130 px repetido con `repeat-x` tiene la misma forma en
cualquier pantalla, sin cortarlo en tres piezas y sin nada que ajustar.

  python tools/ui/torn-edge.py          -> el azulejo por consola
  python tools/ui/torn-edge.py --css    -> la regla lista para pegar en skin.css
"""
import sys

SEED = 0x7A17
# El azulejo: 130 px de ancho y 14 de alto. El ancho es primo con los 256 de la
# textura, asi que el desgarro y el grano no cuadran en un patron visible.
WIDTH = 130
HEIGHT = 14
# Cada cuantos pixeles hay un diente. Nueve es lo que da un rasgado de papel y
# no una sierra: por debajo parece dentado, por encima parece una ola.
STEP = 9
# Cuanto sube y baja el desgarro, en pixeles. El canto vive entre y 3 y y 7.
LOW = 3.2
HIGH = 7.0
# El borde del azulejo, fijo: los dos extremos tienen que casar al repetirse.
EDGE = 5.0


def rnd(i):
    h = (i * 2654435761 + SEED) & 0xFFFFFFFF
    h = (h ^ (h >> 15)) * 2246822519 & 0xFFFFFFFF
    h = h ^ (h >> 13)
    return (h & 0xFFFFFF) / 0x1000000


def teeth():
    u"""Las alturas del desgarro, de izquierda a derecha.

    El primer punto y el ultimo valen `EDGE` para que el azulejo case consigo
    mismo: sin eso, repetido con `repeat-x` aparece un escalon cada 130 px.
    """
    n = WIDTH // STEP
    out = [(0.0, EDGE)]
    for i in range(1, n):
        x = i * STEP
        y = LOW + rnd(i) * (HIGH - LOW)
        out.append((float(x), round(y, 2)))
    out.append((float(WIDTH), EDGE))
    return out


def path(points):
    u"""La linea del desgarro, en `d` de SVG."""
    d = 'M0 %s' % points[0][1]
    for x, y in points[1:]:
        d += ' L%g %s' % (x, y)
    return d


def main():
    points = teeth()
    linea = path(points)
    relleno = linea + ' L%d %d L0 %d Z' % (WIDTH, HEIGHT, HEIGHT)
    # La tinta del desgarro va **por dentro** del papel, 0,7 px por debajo de la
    # linea: la mascara recorta todo lo que quede por encima, asi que una linea
    # justo en el canto se quedaria a medias.
    tinta = path([(x, round(y + 0.7, 2)) for x, y in points])
    if '--css' not in sys.argv:
        print(u'%d dientes de %d px en un azulejo de %d x %d' % (len(points) - 2, STEP, WIDTH, HEIGHT))
        print(u'linea:   %s' % linea)
        print(u'relleno: %s' % relleno)
        print(u'tinta:   %s' % tinta)
        return
    # Van como `data:` URI, asi que el `#` se escapa y las comillas son simples.
    cab = ("<svg xmlns='http://www.w3.org/2000/svg' width='%d' height='%d' viewBox='0 0 %d %d'>"
           % (WIDTH, HEIGHT, WIDTH, HEIGHT))
    mascara = cab + ("<path d='%s' fill='%%23000'/></svg>" % relleno)
    ink = cab + ("<path d='%s' fill='none' stroke='%%231B1613' stroke-opacity='.3' "
                 "stroke-width='1.1'/></svg>" % tinta)
    print(u'  --skin-torn-mask: url("data:image/svg+xml,%s");' % mascara)
    print(u'  --skin-torn-ink: url("data:image/svg+xml,%s");' % ink)


if __name__ == '__main__':
    main()
