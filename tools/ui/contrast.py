# -*- coding: utf-8 -*-
u"""Contraste de cada par texto/fondo de la piel. UI-V0, plan §6, punto 1.

Un pergamino bonito con tinta que no se lee no es una interfaz, es un adorno;
y el juego se mira a pleno sol en un movil. Asi que cada par que la piel usa
de verdad se mide aqui contra el 4,5:1 de WCAG AA para texto normal (3:1 para
el grande, de 24 px o mas, que es lo que permite la norma).

Los hex salen de `src/ui/redesign/tokens.css` — se **leen del fichero**, no se
copian aqui, para que no puedan separarse. La textura de pergamino oscurece
como mucho un 8 % (`parchment.py`), y eso **ayuda** al contraste sobre papel
claro, asi que medir el color plano es el caso peor y vale.

  python tools/ui/contrast.py          -> una linea por par, y el veredicto
"""
import os
import re
import sys

TOKENS = os.path.join('src', 'ui', 'redesign', 'tokens.css')

# (texto, fondo, tamano, donde se usa). `grande` = 24 px o mas, o 19 px en
# negrita: la norma permite 3:1 ahi.
PAIRS = [
    ('--skin-ink', '--skin-parchment', 'normal', u'texto sobre placa'),
    ('--skin-ink', '--skin-parchment-deep', 'normal', u'texto sobre chip y bandeja'),
    ('--skin-ink', '--skin-page', 'normal', u'entradas de la cronica'),
    ('--skin-ink-soft', '--skin-parchment', 'normal', u'etiquetas de navegacion'),
    ('--skin-ink-soft', '--skin-parchment-deep', 'normal', u'cifras en los chips'),
    ('--skin-ink-faded', '--skin-parchment', 'normal', u'versalitas de la fecha'),
    ('--skin-ink-faded', '--skin-parchment-deep', 'normal', u'linea de ordenes en la bandeja'),
    ('--skin-red-ink', '--skin-parchment-deep', 'grande', u'titulo de la decision'),
    ('--skin-gold-lit', '--skin-wood', 'normal', u'etiqueta activa sobre madera'),
    ('--skin-gold-lit', '--skin-wood-soft', 'normal', u'texto del boton FOLLOW'),
    ('--skin-gold-lit', '--skin-wood-plaque', 'normal', u'pestana activa en placa'),
    ('--skin-gold-lit', '--skin-red', 'grande', u'la capitular'),
    ('--skin-parchment-deep', '--skin-wood', 'normal', u'etiquetas inactivas sobre madera'),
    ('--skin-ink', '--skin-parchment-aged', 'normal', u'texto sobre papel curtido'),
]


def tokens():
    text = open(TOKENS, encoding='utf-8').read()
    found = {}
    for name, value in re.findall(r'(--skin-[a-z-]+):\s*(#[0-9A-Fa-f]{6})\s*;', text):
        found[name] = value
    return found


def rgb(value):
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def luminance(colour):
    def channel(c):
        c /= 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(c) for c in colour)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = luminance(rgb(a)), luminance(rgb(b))
    lo, hi = min(la, lb), max(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def main():
    found = tokens()
    missing = [n for pair in PAIRS for n in pair[:2] if n not in found]
    if missing:
        print(u'Faltan tokens en %s: %s' % (TOKENS, ', '.join(sorted(set(missing)))))
        return 1
    bad = []
    for ink, paper, size in ((p[0], p[1], p[2]) for p in PAIRS):
        pass
    for ink, paper, size, where in PAIRS:
        value = ratio(found[ink], found[paper])
        need = 3.0 if size == 'grande' else 4.5
        mark = 'ok ' if value >= need else 'NO '
        if value < need:
            bad.append((where, value, need))
        print(u'%s %5.2f:1  (pide %.1f)  %-34s %s sobre %s'
              % (mark, value, need, where, found[ink], found[paper]))
    print()
    if bad:
        print(u'NO PASA. Lo que hay que corregir, y en esta direccion: **oscurecer la')
        print(u'tinta, nunca aclarar el papel** — el papel es el color muestreado del')
        print(u'prototipo y es lo que hace que se parezca.')
        for where, value, need in bad:
            print(u'  · %s: %.2f:1, le faltan %.2f' % (where, value, need - value))
        return 1
    print(u'Los %d pares pasan.' % len(PAIRS))
    return 0


if __name__ == '__main__':
    sys.exit(main())
