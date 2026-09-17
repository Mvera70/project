# -*- coding: utf-8 -*-
"""Vuelve a calcar los glifos del prototipo y reescribe `calcadas.py`.

Desde la raiz del repositorio:

    python tools/ui/icons/regenerar-calcos.py

Aqui viven los dos unicos numeros que hay que recordar de cada calco —el
recuadro del glifo dentro del PNG y el corte del umbral—, y estan aqui y no en
la cabeza de nadie porque un calco sin su receta no se puede repetir.

**El `bias`.** Corre el umbral de Otsu; hacia abajo la tinta adelgaza y las
juntas claras entre piezas pegadas se abren.

- **La lena pide -40**, y no es gusto: con el corte a secas sale como un solo
  bulto con tres agujeros, porque las juntas entre troncos son gris medio. A -40
  aparecen y se leen los tres.
- **La espiga se queda en -10**, elegido por el dueno del diseno el 17 sep 2026
  sobre -20, -30 y -40. Mas abajo los granos se separan mas, pero adelgazan; a
  -10 quedan gordos, que es como se lee antes como trigo en un chip de 21 px.
  Es una decision de gusto sobre cuatro opciones vistas juntas, no un ajuste.
"""
import importlib.util
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3]
PROTO = ROOT / 'docs/ui-redesign/ui-prototypes/01-living-valley.png'
HERE = pathlib.Path(__file__).resolve().parent

# nombre -> (recuadro en el PNG, bias, area minima que se conserva)
GLYPHS = {
    'WHEAT': ((283, 136, 337, 186), -10, 0.002),
    'LOGS': ((462, 139, 517, 180), -40, 0.0015),
}


def load_tracer():
    spec = importlib.util.spec_from_file_location(
        'trace_glyph', ROOT / 'tools/ui/trace-glyph.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    tracer = load_tracer()
    lines = ['# -*- coding: utf-8 -*-',
             '"""Siluetas calcadas del prototipo 01.',
             '',
             '**Generado por `tools/ui/icons/regenerar-calcos.py`; no se edita a'
             ' mano.**',
             'Ahi estan los recuadros y los cortes, y el motivo de cada uno.',
             '"""']
    for name, (box, bias, keep) in GLYPHS.items():
        d, loops = tracer.trace(str(PROTO), box, keep=keep, bias=bias)
        print('%-6s recuadro %s bias %d -> %d lazos, %d caracteres'
              % (name, box, bias, loops, len(d)))
        lines += ['', '# recuadro %s, bias %d, %d lazos' % (box, bias, loops),
                  '%s = %r' % (name, d)]
    (HERE / 'calcadas.py').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('escrito', HERE / 'calcadas.py')


if __name__ == '__main__':
    main()
