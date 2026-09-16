# -*- coding: utf-8 -*-
"""Calca los adornos de la pagina de la cronica y escribe su modulo.

Desde la raiz del repositorio:

    python tools/ui/chronicle-ornaments.py

Escribe `src/ui/redesign/chronicle-ornaments.ts`. Las tres piezas son **linea**,
asi que van calcadas con `tools/ui/trace-glyph.py` y salen como `<path>` que
toma el color de quien las usa (el oro de `--skin-gold`) y escalan sin limite.
Lo que no va aqui es lo **pintado** —el capitular ilustrado y la vineta a
pluma—, que se recorta con `tools/ui/cut-art.py` a `public/ui/art/`: calcar un
dibujo con medios tonos da un borron.

Los recuadros salen del prototipo 02 y estan medidos una vez; si alguno se
cambia, se vuelve a ejecutar esto y se mira la captura.
"""
import importlib.util
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
PROTO = ROOT / 'docs/ui-redesign/ui-prototypes/02-chronicle-first.png'
TARGET = ROOT / 'src/ui/redesign/chronicle-ornaments.ts'

# nombre TS -> (recuadro en el prototipo 02, bias, area minima, comentario)
PIECES = {
    'YEAR_FLOURISH': (
        (536, 972, 592, 1022), 0, 0.01,
        'La palmeta con la que muere el filete del ano, a su derecha.'),
    'ENTRY_DIAMOND': (
        (430, 1194, 474, 1219), 0, 0.02,
        'El rombo del centro del filete que separa dos entradas.'),
    'PAGE_VINE': (
        (0, 745, 78, 1062), 0, 0.004,
        'La rama de hojas del borde izquierdo de la pagina. Se repite en '
        'vertical, asi que se calca un tramo y el CSS lo azuleja.'),
}

HEAD = '''// UI-V3b · Los adornos de la pagina de la cronica, **calcados del prototipo**.
//
// **Generado por `tools/ui/chronicle-ornaments.py`; no se edita a mano.** Ahi
// estan los recuadros del prototipo 02 de los que sale cada uno.
//
// Por que calcados y no dibujados: la ronda anterior entrego la estructura de
// la pagina —ANNO, capitular, linea de tiempo, entradas— y el dueno del diseno
// la resumio asi, «la estetica sigue siendo muy mala». Lo que faltaba era
// justo el adorno, y el adorno ya estaba dibujado en el prototipo. La leccion
// es la misma que costo nueve versiones en los iconos del chip y que esta
// escrita en la skill `calcar-iconos`: **si el dibujo ya existe, no se deduce,
// se calca.**
//
// Cada uno es el contenido de un `<svg>`: un `<path>` con `fill-rule="evenodd"`
// y `fill="currentColor"`, de modo que el color lo pone la hoja de estilo
// (`--skin-gold`) y nunca el adorno. `VIEWBOX` lleva la proporcion real de
// cada pieza: meter una rama vertical en un cuadrado la deformaria.
//
// Lo *pintado* no esta aqui y no puede estarlo: el capitular ilustrado y la
// vineta a pluma son medios tonos, y calcarlos da un borron. Esos se recortan
// con `tools/ui/cut-art.py` y viven en `public/ui/art/`.

/** El `viewBox` de cada adorno, `"0 0 ancho alto"`. */
export const ORNAMENT_VIEWBOX: Readonly<Record<OrnamentName, string>> = {
'''


def main():
    spec = importlib.util.spec_from_file_location(
        'trace_glyph', ROOT / 'tools/ui/trace-glyph.py')
    tracer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(tracer)

    traced = {}
    for name, (box, bias, keep, note) in PIECES.items():
        d, loops, (vw, vh) = tracer.trace(
            str(PROTO), box, bias=bias, keep=keep, aspect=True,
            viewbox=48.0, margin=0.5)
        traced[name] = (d, vw, vh, loops, box, bias, note)
        print('%-14s %d lazos  %5d car  viewBox %.2f x %.2f'
              % (name, loops, len(d), vw, vh))

    lines = [HEAD.rstrip('\n')]
    for name, (_, vw, vh, _, _, _, _) in traced.items():
        lines.append("  %s: '0 0 %.2f %.2f'," % (name, vw, vh))
    lines.append('};')
    lines.append('')
    for name, (d, _, _, loops, box, bias, note) in traced.items():
        lines.append('/**')
        lines.append(' * %s' % note)
        lines.append(' *')
        lines.append(' * Prototipo 02, recuadro (%d, %d, %d, %d), bias %d, %d lazos.'
                     % (box[0], box[1], box[2], box[3], bias, loops))
        lines.append(' */')
        lines.append("export const %s = '<path fill=\"currentColor\" "
                     "fill-rule=\"evenodd\" d=\"%s\"/>';" % (name, d))
        lines.append('')
    lines.append('/** Los nombres de los adornos calcados. */')
    lines.append("export type OrnamentName = %s;"
                 % ' | '.join("'%s'" % n for n in traced))
    lines.append('')
    TARGET.write_text('\n'.join(lines), encoding='utf-8')
    print('escrito', TARGET)


if __name__ == '__main__':
    main()
