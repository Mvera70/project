# -*- coding: utf-8 -*-
"""Calca los adornos de la piel y escribe sus modulos.

Desde la raiz del repositorio:

    python tools/ui/skin-ornaments.py

Escribe **un modulo por pantalla**: `src/ui/redesign/chronicle-ornaments.ts` y
`src/ui/redesign/person-ornaments.ts`. Uno por pantalla y no uno comun para que
cada pantalla importe solo lo suyo y el empaquetador no arrastre la orla de la
cronica a la ficha.

Las piezas de aqui son **linea**, asi que van calcadas con
`tools/ui/trace-glyph.py` y salen como `<path>` que toma el color de quien las
usa y escala sin limite. Lo **pintado** no puede estar aqui —el capitular
ilustrado, la vineta a pluma, un retrato—: calcar un dibujo con medios tonos da
un borron, y eso se recorta con `tools/ui/cut-art.py` a `public/ui/art/`.

Cada recuadro esta medido una vez sobre su prototipo y vive aqui con su motivo
escrito: un calco sin su receta no se puede repetir. Si alguno se cambia, se
vuelve a ejecutar esto y **se mira la captura**.
"""
import importlib.util
import pathlib
import textwrap

ROOT = pathlib.Path(__file__).resolve().parents[2]
PROTOS = ROOT / 'docs/ui-redesign/ui-prototypes'

# modulo -> (prototipo, {nombre TS: (recuadro, bias, area minima, comentario)})
MODULES = {
    'chronicle-ornaments.ts': ('02-chronicle-first.png', {
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
    }),
    'person-ornaments.ts': ('03-people-of-the-valley.png', {
        'HEAD_SPRIG': (
            (730, 126, 806, 254), 12, 0.006,
            'El helecho del canto derecho de la placa de cabecera. En el '
            'prototipo es una marca de agua, casi del tono del papel, asi que '
            'va con poca opacidad y no a tinta plena. El bias sube 12 porque '
            'con el corte de Otsu a secas se confundia con el pergamino y no '
            'salia nada. Y el recuadro se aprieta a 730-806 x 126-254 porque '
            'dos pixeles mas abajo entra la hierba de detras de la placa y el '
            'calco salia con una cola horizontal pegada al pie.'),
    }),
}

HEAD = """// UI-V3b/V4 · Los adornos de la piel, **calcados del prototipo**.
//
// **Generado por `tools/ui/skin-ornaments.py`; no se edita a mano.** Ahi estan
// los recuadros de los que sale cada uno, con su motivo.
//
// Por que calcados y no dibujados: la ronda de la cronica entrego la estructura
// de la pagina —ANNO, capitular, linea de tiempo, entradas— y el dueno del
// diseno la resumio asi, «la estetica sigue siendo muy mala». Lo que faltaba
// era justo el adorno, y el adorno ya estaba dibujado en el prototipo. La
// leccion es la misma que costo nueve versiones en los iconos del chip y que
// esta escrita en la skill `calcar-iconos`: **si el dibujo ya existe, no se
// deduce, se calca.**
//
// Cada uno es el contenido de un `<svg>`: un `<path>` con `fill-rule="evenodd"`
// y `fill="currentColor"`, de modo que el color lo pone la hoja de estilo y
// nunca el adorno. `ORNAMENT_VIEWBOX` lleva la proporcion real de cada pieza:
// meter una rama vertical en un cuadrado la deformaria.
//
// Lo *pintado* no esta aqui y no puede estarlo: un capitular ilustrado o una
// vineta a pluma son medios tonos, y calcarlos da un borron. Esos se recortan
// con `tools/ui/cut-art.py` y viven en `public/ui/art/`.

/** El `viewBox` de cada adorno, `"0 0 ancho alto"`. */
export const ORNAMENT_VIEWBOX: Readonly<Record<OrnamentName, string>> = {"""


def main():
    spec = importlib.util.spec_from_file_location(
        'trace_glyph', ROOT / 'tools/ui/trace-glyph.py')
    tracer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(tracer)

    for module, (proto_file, pieces) in MODULES.items():
        proto = PROTOS / proto_file
        traced = {}
        for name, (box, bias, keep, note) in pieces.items():
            d, loops, (vw, vh) = tracer.trace(
                str(proto), box, bias=bias, keep=keep, aspect=True,
                viewbox=48.0, margin=0.5)
            traced[name] = (d, vw, vh, loops, box, bias, note)
            print('%-14s %d lazos  %5d car  viewBox %.2f x %.2f'
                  % (name, loops, len(d), vw, vh))

        lines = [HEAD]
        for name, (_, vw, vh, _, _, _, _) in traced.items():
            lines.append("  %s: '0 0 %.2f %.2f'," % (name, vw, vh))
        lines.append('};')
        lines.append('')
        for name, (d, _, _, loops, box, bias, note) in traced.items():
            lines.append('/**')
            for chunk in textwrap.wrap(note, 72):
                lines.append(' * %s' % chunk)
            lines.append(' *')
            lines.append(' * Prototipo %s, recuadro (%d, %d, %d, %d), bias %d, %d lazos.'
                         % (proto_file[:2], box[0], box[1], box[2], box[3], bias, loops))
            lines.append(' */')
            lines.append('export const %s = \'<path fill="currentColor" '
                         'fill-rule="evenodd" d="%s"/>\';' % (name, d))
            lines.append('')
        lines.append('/** Los nombres de los adornos calcados de esta pantalla. */')
        lines.append('export type OrnamentName = %s;'
                     % ' | '.join("'%s'" % n for n in traced))
        lines.append('')
        target = ROOT / 'src/ui/redesign' / module
        target.write_text('\n'.join(lines), encoding='utf-8')
        print('escrito', target)


if __name__ == '__main__':
    main()
