# -*- coding: utf-8 -*-
"""Lleva una variante de cada icono al sprite del juego y a la copia incrustada.

Uso, desde la raiz del repositorio:

    python tools/ui/icons/aplicar.py B D     # trigo, madera

Las variantes vivas estan en `variantes.py`; las siluetas calcadas del
prototipo, en `calcadas.py`, generado por `tools/ui/trace-glyph.py`. La que el
dueno del diseno eligio el 17 sep 2026 es **D y D: las dos calcadas**, y es lo
que hay en el sprite ahora mismo.

Los `<use href="#id">` del lienzo se **expanden a `<path transform>`** antes de
escribirlos: un `<use>` dentro de un `<symbol>` que a su vez se instancia con
otro `<use>` es una referencia en arbol de sombra, y no quiero apostar el icono
del movil del dueno a que Safari la resuelva. La geometria sigue viniendo de un
solo sitio (`variantes.py`), que es lo que importa.
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import variantes as V  # noqa: E402  al lado de este fichero

# La raiz del repositorio: tres niveles por encima de este fichero.
ROOT = pathlib.Path(__file__).resolve().parents[3]

USE = re.compile(r'<use href="#(?P<id>[\w-]+)" transform="(?P<t>[^"]+)"\s*/>')
DEF = re.compile(r'<path id="(?P<id>[\w-]+)" d="(?P<d>[^"]+)"\s*/>')


def expand(markup):
    """Sustituye los `<use>` por `<path>` con el mismo `transform`."""
    shapes = {m.group('id'): m.group('d') for m in DEF.finditer(markup)}
    out = markup
    if shapes:
        out = USE.sub(lambda m: '<path d="%s" transform="%s"/>'
                      % (shapes[m.group('id')], m.group('t')), out)
        # El `<defs>` ya no hace falta: nadie apunta a el.
        out = re.sub(r'<defs>.*?</defs>\s*', '', out, flags=re.S)
    # En el lienzo el papel de la testa es `--paper`; en el juego, el token.
    return out.replace('var(--paper, #D9C2A5)',
                       'var(--skin-parchment-deep, #D9C2A5)')


def reflow(markup, indent):
    """Reindenta el bloque a la sangria del fichero destino.

    `strip('\\n')` y no `strip()`: con `strip()` la primera linea perdia su
    sangria y el `<symbol>` quedaba dos espacios por delante de sus hermanos.
    """
    lines = [ln.rstrip() for ln in markup.strip('\n').split('\n')]
    return '\n'.join(indent + ln if ln else '' for ln in lines)


WHEAT_NOTE_D = """<!-- El grano: la espiga del prototipo 01, **calcada**.

       Cuatro versiones dibujadas a mano no valieron —una pluma, un romero, una
       aguja y un helecho— y la leccion de las cuatro es que aproximar a ojo un
       dibujo que ya existe es el camino largo. Esta no aproxima:
       `tools/ui/trace-glyph.py` lee el pixel del PNG del prototipo y saca su
       silueta. **No se parece al prototipo: es el prototipo.**

       Receta en `tools/ui/icons/regenerar-calcos.py`, que es quien la genera:
       recuadro (283, 136, 337, 186) y umbral de Otsu corrido **-10**. El -10 lo
       eligio el dueno del diseno sobre -20, -30 y -40 vistos juntos: mas abajo
       los granos se separan mas, pero adelgazan, y a -10 quedan gordos, que es
       lo que hace que se lea como trigo en un chip de 21 px.

       `fill-rule="evenodd"` para que los claros encerrados sean agujeros de
       verdad y no parches del color del chip, y `stroke="none"` explicito
       porque `.skin-icon` hereda `stroke: currentColor` de 1,5 y engordaria la
       silueta 0,75 por lado.

       El original dibujado a mano sigue en `tools/ui/icons/variantes.py` como
       variante B, por si algun dia se quiere volver. -->"""

WHEAT_NOTE_B = """<!-- El grano: una espiga de granos gordos en pares.

       **Elegida por el dueno del diseno** entre cuatro (17 sep 2026), sobre la
       version calcada del prototipo y sobre dos mas: sus granos en par se leen
       como trigo antes que la ramita alterna que dibuja el prototipo, y a 21 px
       eso pesa mas que la fidelidad.

       **Como esta hecha, y por que asi.** Cuatro intentos de generar el `d=`
       con trigonometria dieron una pluma, un romero y un borron: los granos se
       fundian. La forma que funciona se dibuja al reves: **un grano, dibujado
       una sola vez, repetido con `transform`**. Cambiar el grano es cambiar un
       `d=`; mover uno es mover dos numeros. Aqui van tres pares abiertos 40
       grados a cada lado del tallo mas uno en la punta, y dos barbas en el pie.

       Los `<use>` del original se expanden a `<path transform>` al escribirlos
       aqui: un `<use>` dentro de un `<symbol>` que a su vez se instancia con
       otro `<use>` es una referencia en arbol de sombra, y no se apuesta el
       icono del movil a que Safari la resuelva.

       Relleno y `stroke="none"` explicitos porque `.skin-icon` hereda
       `fill: none` y `stroke: currentColor` de 1,5: sin ellos cada grano sale
       con contorno y la espiga se funde otra vez. -->"""

WHEAT_NOTE = """<!-- El grano: la ramita del prototipo 01.

       **Como esta hecha, y por que asi.** Cuatro intentos de generar el `d=`
       con trigonometria dieron una pluma, un romero y un borron: los granos se
       fundian. La forma que funciona se dibuja al reves: **una hoja, dibujada
       una sola vez, repetida con `transform`**. Cambiar la hoja es cambiar un
       `d=`; mover un grano es mover dos numeros.

       Y las medidas salen del prototipo ampliado x10, no de la intuicion: la
       hoja mide 5,1 de largo por 2,1 de ancho, van **cuatro por lado**
       alternadas, y las del mismo lado se separan 5,9 a lo largo del tallo
       —mas de lo que cada una proyecta sobre el (5,1 x cos 17 = 4,9)—, que es
       la condicion de que se cuenten una a una. Las versiones descartadas eran
       un 45 % mas largas, un 80 % mas gordas y solo tres por lado.

       El abanico es asimetrico a proposito, como el del prototipo: 17 grados
       del tallo las de la izquierda y 28 las de la derecha, de modo que todas
       barren hacia la punta. Y no lleva barbas: el prototipo no las tiene.

       Relleno explicito porque `.skin-icon` hereda `fill: none`. -->"""

LOGS_NOTE = """<!-- La madera: la pila del prototipo 01.

       **Lo que le faltaba a las tres versiones anteriores era la testa.** De
       trazo eran tres aros («una molecula»), con barras un «≡», y con circulos
       oscuros un manojo de llaves. Lo que hace que un rectangulo redondeado se
       lea como un tronco es la **cara del corte: clara, con su anillo oscuro y
       su medula**, y eso es lo que el prototipo dibuja.

       Dos troncos tumbados —el de arriba mas largo— y uno de punta abajo a la
       izquierda, todo girado 8 grados para que la pila no quede formada. La
       testa se rellena con el papel del chip (`--skin-parchment-deep`), que es
       el fondo real sobre el que vive este icono. -->"""

LOGS_NOTE_D = """<!-- La madera: la pila del prototipo 01, **calcada**.

       **Cuatro versiones dibujadas a mano no valieron** —de trazo eran tres
       aros («una molecula»), con barras un «≡», con circulos oscuros un manojo
       de llaves, y con troncos rellenos «horribles», dicho por el dueno— y la
       leccion de las cuatro es que aproximar a ojo un dibujo que ya existe es
       el camino largo. Esta no aproxima: `tools/ui/trace-glyph.py` lee el pixel
       del PNG del prototipo y saca su silueta. **No se parece al prototipo: es
       el prototipo.**

       Receta exacta, para poder repetirla: recuadro (462, 139, 517, 180) de
       `docs/ui-redesign/ui-prototypes/01-living-valley.png`, umbral de Otsu
       corrido **-40**. El -40 es lo que hace falta para que **las juntas claras
       entre troncos se abran**: con el corte a secas la pila sale como un solo
       bulto con tres agujeros, que es exactamente el defecto de las cuatro
       versiones a mano.

       Las tres testas y la medula son **agujeros de verdad** (`fill-rule
       ="evenodd"`), no parches del color del chip: asi el icono vale sobre
       cualquier papel, y no como la version anterior, que fijaba
       `--skin-parchment-deep` y solo cuadraba encima de un chip.

       `stroke="none"` explicito porque `.skin-icon` hereda `stroke:
       currentColor` de 1,5 y engordaria la silueta 0,75 por lado. -->"""


def build(sid, markup, note):
    # Las lineas de continuacion del comentario se alinean bajo el texto de
    # `<!-- `, que son cinco caracteres: en el literal van a siete, asi que se
    # quitan dos antes de sangrar.
    note = note.replace('\n       ', '\n     ')
    return '  <symbol id="%s" viewBox="0 0 24 24">\n%s\n%s\n  </symbol>' % (
        sid, reflow(note, '    '), reflow(expand(markup), '    '))


def replace_symbol(text, sid, block, indent):
    pattern = re.compile(r'[ ]*<!--[^>]*?-->\s*\n[ ]*<symbol id="' + sid + r'".*?</symbol>'
                         r'|[ ]*<symbol id="' + sid + r'".*?</symbol>', re.S)
    body = block if indent == '  ' else reflow(block, '  ')
    new, n = pattern.subn(lambda _: body, text, count=1)
    assert n == 1, (sid, indent)
    return new


def main():
    wheat_key = sys.argv[1] if len(sys.argv) > 1 else 'A'
    logs_key = sys.argv[2] if len(sys.argv) > 2 else 'A'
    # Cada variante lleva su propio comentario: un icono con la nota de otra
    # version es peor que sin nota.
    notes = {('wheat', 'B'): WHEAT_NOTE_B, ('wheat', 'D'): WHEAT_NOTE_D,
             ('logs', 'D'): LOGS_NOTE_D}
    blocks = {
        'wheat': build('wheat', V.WHEAT[wheat_key],
                       notes.get(('wheat', wheat_key), WHEAT_NOTE)),
        'logs': build('logs', V.LOGS[logs_key],
                      notes.get(('logs', logs_key), LOGS_NOTE)),
    }
    for rel, indent in (('public/ui/icons.svg', '  '), ('index.html', '    ')):
        path = ROOT / rel
        text = path.read_text(encoding='utf-8')
        for sid, block in blocks.items():
            text = replace_symbol(text, sid, block, indent)
        path.write_text(text, encoding='utf-8')
    print('trigo %s y madera %s aplicados al sprite y a index.html'
          % (wheat_key, logs_key))


if __name__ == '__main__':
    main()
