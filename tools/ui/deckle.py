# -*- coding: utf-8 -*-
u"""Genera los bordes rasgados (`clip-path`) de las placas. UI-V0, §2.

El prototipo no tiene una sola placa con el borde recto: todas parecen papel
cortado a mano. Eso en CSS es un `clip-path: polygon(...)`, y lo que este
script hace es **escribir esos poligonos una vez** para pegarlos en
`skin.css`. No se calculan en el navegador: un borde que cambia entre
fotogramas es un borde que tiembla, y ademas la comparativa contra el
prototipo tiene que dar la misma imagen siempre.

Una amplitud por primitiva, en porcentaje del lado, porque una placa de 34 px
de alto y una tarjeta de 300 no pueden rasgarse igual: la misma amplitud
relativa se ve bien en las dos.

  python tools/ui/deckle.py            -> los poligonos por consola
  python tools/ui/deckle.py --css      -> listos para pegar en skin.css
"""
import math
import sys

SEED = 0x0DEC


def rnd(i, salt):
    h = (i * 2654435761 + salt * 40503 + SEED) & 0xFFFFFFFF
    h = (h ^ (h >> 15)) * 2246822519 & 0xFFFFFFFF
    h = h ^ (h >> 13)
    return (h & 0xFFFFFF) / 0x1000000


def deckle(per_side, amp, salt):
    u"""Un poligono cerrado alrededor de un rectangulo 0..100 en los dos ejes.

    `amp` es cuanto se mete el papel hacia dentro, en porcentaje: el borde
    nunca sale del rectangulo (asi la placa no pisa a su vecina), solo se
    come un poco de si misma, que es como se ve un papel cortado.
    """
    points = []
    n = per_side
    i = 0

    def wobble():
        nonlocal i
        value = rnd(i, salt) * amp
        i += 1
        return round(value, 2)

    for k in range(n):                      # arriba, izquierda a derecha
        points.append((round(k * 100.0 / n, 2), wobble()))
    for k in range(n):                      # derecha, arriba a abajo
        points.append((round(100 - wobble(), 2), round(k * 100.0 / n, 2)))
    for k in range(n):                      # abajo, derecha a izquierda
        points.append((round(100 - k * 100.0 / n, 2), round(100 - wobble(), 2)))
    for k in range(n):                      # izquierda, abajo a arriba
        points.append((wobble(), round(100 - k * 100.0 / n, 2)))
    return points


def css(points):
    return 'polygon(' + ', '.join('%g%% %g%%' % p for p in points) + ')'


# Una entrada por primitiva de `skin.css`. `per_side` sube con el tamano de la
# pieza: una tarjeta grande necesita mas vertices para que el rasgado no se
# lea como un zigzag.
# **Las amplitudes son en porcentaje, y eso engana en una pieza ancha**: el 3 %
# de una placa de 334 px son diez pixeles comidos por el lado, y en el
# muestrario de UI-V0 eso corto el texto de la fecha. Asi que cuanto mas ancha
# la pieza, menos amplitud — y quien la use deja al menos 12 px de relleno.
PIECES = [
    ('--skin-deckle-plate', 12, 1.2, 11),    # placa de cabecera, ancha y baja
    ('--skin-deckle-chip', 6, 4.0, 22),      # los cuatro chips de cifra
    ('--skin-deckle-chip-b', 6, 4.0, 23),    # el segundo, para que no se repitan
    ('--skin-deckle-chip-c', 6, 4.0, 24),
    ('--skin-deckle-chip-d', 6, 4.0, 25),
    ('--skin-deckle-card', 14, 1.0, 33),     # tarjeta de ficha y documento sellado
    ('--skin-deckle-sheet', 16, 0.6, 44),    # la bandeja y la pagina, casi rectas
]


def main():
    as_css = '--css' in sys.argv
    for name, per_side, amp, salt in PIECES:
        shape = css(deckle(per_side, amp, salt))
        if as_css:
            print('  %s: %s;' % (name, shape))
        else:
            print('%-24s %d vertices, amplitud %.1f%%' % (name, per_side * 4, amp))
            print('  %s' % shape)


if __name__ == '__main__':
    main()
