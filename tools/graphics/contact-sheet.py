# -*- coding: utf-8 -*-
"""Monta la hoja de contactos de una ronda grafica, para juzgarla de un vistazo.

El jugador no esta delante del equipo. Las capturas sueltas en `artifacts/` no
le sirven de nada, y la demo jugable pide paciencia y bateria: la hoja se mira
en un minuto y dice en que ha quedado la ronda.

Las capturas se toman antes con Playwright sobre `tools/graphics/valley.html`, a
340x480 y sin escala doble, y se incrustan en base64 para que la pagina se
publique sola. Todas salen de la misma partida: lo que cambia de una a otra es
la distancia, la hora o la estacion, y por eso valen para comparar.

  node <script de capturas>            -> artifacts/graphics/G-10/hoja/*.png
  python tools/graphics/contact-sheet.py  -> artifacts/graphics/G-10/hoja.html
"""
import io, json

import base64, os

SHOTS = 'artifacts/graphics/G-10/hoja'
shots = {}
for name in sorted(os.listdir(SHOTS)):
    if not name.endswith('.png'):
        continue
    with open(os.path.join(SHOTS, name), 'rb') as handle:
        shots[name[:-4]] = 'data:image/png;base64,' + base64.b64encode(handle.read()).decode('ascii')

PLATES = [
    ('escala', u'La escala', u'Lo que se pidió: que al entrar la gente se vea muy pequeñita y '
     u'que acercándose se les vea trabajar. Un aldeano mide 0,65 celdas y una celda son tres metros.',
     [('panorama', u'El valle entero', u'La aldea con su entorno. Las personas son motas que van y vienen.'),
      ('aldea', u'La aldea', u'A media distancia ya se distingue quién trabaja el campo y quién va de camino.'),
      ('cerca', u'El tope de cerca', u'Ocho celdas en pantalla. Cada uno con su talla según la edad, su ropa, '
       u'su mandil delante, y la azada en la mano mientras cava.')]),
    ('hora', u'La hora', u'El día escénico dura dos minutos y se acelera con la raíz de la velocidad. '
     u'La noche es de luna llena a propósito: el valle tiene que poder leerse a las tres de la madrugada.',
     [('amanecer', u'Amanecer', u'El sol sale por el este y entra bajo y cálido.'),
      ('atardecer', u'Atardecer', u'El cielo se enciende justo antes de que el sol se vaya, y sólo entonces.'),
      ('noche', u'Noche', u'Las casas habitadas se encienden. La luz sale por la fachada libre; '
       u'si el vecino está pegado, por el agujero del humo del caballete.')]),
    ('estacion', u'La estación', u'El suelo, el bosque, el río y los tejados salen todos de la misma paleta, '
     u'que es la que usa el juego en 2D. Ninguno decide su propio verde.',
     [('verano', u'Verano', u'La mies en pie. Entre la siembra y la siega el campo tiene surcos de grano.'),
      ('otono', u'Otoño', u'Segado. Los mismos surcos, rasos y del color de la tierra, y el bosque con ellos.'),
      ('invierno', u'Invierno', u'Nieva en el prado y cuaja en los tejados, al 72 %: del todo, un tejado '
       u'deja de leerse como tejado.')]),
    ('gente', u'La gente', u'Lo que decide el motor, visto desde arriba. Ninguna de estas dos '
     u'imágenes está montada: es la misma partida y el mismo instante, y lo único que cambia es que '
     u'en la segunda se acaba de tomar una decisión que convoca a la aldea.',
     [('jornada', u'Un día cualquiera', u'Cada uno en su campo. Los que se aprecian se paran a '
       u'hablar por el camino; los que se detestan, nunca.'),
      ('reunion', u'El día que se convoca', u'Nadie va al tajo: la aldea se junta donde dijo la '
       u'decisión, en la plaza, en la capilla o en el vado.')]),
    ('mundo', u'El mundo', u'Lo que no es catálogo y es la mitad del trabajo.',
     [('rio', u'El río', u'Va por un cauce hundido, con la orilla bajando hacia el agua y juncos donde el '
       u'prado la toca. La lámina brilla y se mueve: lo que distingue el agua de la hierba no es el color.')]),
]

OPEN = [
    (u'La reunión', u'Veinticinco opciones del catálogo convocan a la aldea. En 2D la gente se junta; '
     u'en 3D todavía no. Es lo más grande que queda y toca el principio 1 del juego.'),
    (u'El banco en un móvil', u'Todo lo medido sale de un equipo de escritorio. La especificación no '
     u'acepta emulación para cerrar esa puerta, así que sigue abierta.'),
    (u'Los hitos 0 y 6', u'Siguen sin validar, y no los cierra ninguna prueba: los cierras tú jugando.'),
]

MEASURED = [
    (u'Recursos en el catálogo', u'32'),
    (u'Llamadas de dibujo, peor escena', u'497 de 1 200'),
    (u'Triángulos, peor escena', u'291 440 de 450 000'),
    (u'CPU por fotograma', u'2,10 ms'),
    (u'Bytes por la red', u'906 KB de 1 MB'),
]


def plate(key, title, note):
    return (u'      <figure>\n'
            u'        <img src="%s" alt="%s" width="340" height="480">\n'
            u'        <figcaption><b>%s.</b> %s</figcaption>\n'
            u'      </figure>\n') % (shots[key], title, title, note)


sections = []
for _, title, intro, plates in PLATES:
    body = u''.join(plate(*p) for p in plates)
    sections.append(
        u'  <section>\n    <h2>%s</h2>\n    <p class="lede">%s</p>\n    <div class="plates">\n%s    </div>\n  </section>\n'
        % (title, intro, body))

rows = u''.join(u'      <tr><th>%s</th><td>%s</td></tr>\n' % (k, v) for k, v in MEASURED)
open_items = u''.join(
    u'      <li><b>%s.</b> %s</li>\n' % (k, v) for k, v in OPEN)

TEMPLATE = u"""<title>El valle de G-10</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Karla:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root {
    color-scheme: light;
    --ink: #232a1c;
    --ink-soft: #5c6650;
    --ground: #eef0e4;
    --panel: #e2e6d3;
    --edge: #c6cdb0;
    --meadow: #6f8c46;
    --clay: #a96146;
    --display: 'Archivo', 'Segoe UI', system-ui, sans-serif;
    --body: 'Karla', 'Segoe UI', system-ui, sans-serif;
    --mono: 'IBM Plex Mono', 'Consolas', ui-monospace, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      color-scheme: dark;
      --ink: #e6e9db; --ink-soft: #9aa389; --ground: #1b1f16;
      --panel: #262b1e; --edge: #3b422e; --meadow: #9dbb6c; --clay: #c97b5c;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --ink: #e6e9db; --ink-soft: #9aa389; --ground: #1b1f16;
    --panel: #262b1e; --edge: #3b422e; --meadow: #9dbb6c; --clay: #c97b5c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--ground); color: var(--ink);
    font-family: var(--body); font-size: 15px; line-height: 1.55;
    -webkit-text-size-adjust: 100%;
  }
  .wrap { max-width: 760px; margin: 0 auto; padding: 0 18px 56px; }
  header { padding: 28px 0 18px; }
  .eyebrow {
    font-family: var(--mono); font-size: 11px; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-soft); margin: 0 0 8px;
  }
  h1 {
    font-family: var(--display); font-weight: 700; margin: 0;
    font-size: clamp(28px, 8vw, 42px); line-height: 1.04; letter-spacing: -.02em;
    text-wrap: balance;
  }
  header p { margin: 12px 0 0; max-width: 58ch; color: var(--ink-soft); }
  h2 {
    font-family: var(--display); font-weight: 600; font-size: 13px;
    letter-spacing: .12em; text-transform: uppercase; color: var(--ink-soft);
    margin: 40px 0 10px; padding-bottom: 8px; border-bottom: 1px solid var(--edge);
  }
  .lede { margin: 0 0 18px; max-width: 60ch; color: var(--ink-soft); }
  .plates { display: grid; gap: 22px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
  figure { margin: 0; }
  figure img {
    display: block; width: 100%; height: auto; border: 1px solid var(--edge);
    background: var(--panel);
  }
  figcaption { margin-top: 8px; font-size: 14px; color: var(--ink-soft); }
  figcaption b { color: var(--ink); font-weight: 500; }
  table { border-collapse: collapse; width: 100%; margin-top: 4px; }
  th, td {
    text-align: left; padding: 9px 0; border-bottom: 1px solid var(--edge);
    font-size: 14px; font-weight: 400;
  }
  th { color: var(--ink-soft); }
  td { font-family: var(--mono); font-variant-numeric: tabular-nums; text-align: right; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 10px; color: var(--ink-soft); max-width: 60ch; }
  li b { color: var(--clay); font-weight: 600; }
  footer {
    margin-top: 44px; padding-top: 18px; border-top: 1px solid var(--edge);
    font-family: var(--mono); font-size: 11px; letter-spacing: .05em; color: var(--ink-soft);
  }
</style>

<div class="wrap">
  <header>
    <p class="eyebrow">The Valley &middot; piloto 3D &middot; ronda G-10</p>
    <h1>El valle, de cerca y de lejos</h1>
    <p>
      Todas las capturas salen de la misma partida &mdash;semilla 7, a&ntilde;o 22&mdash;
      corriendo con el motor de verdad. Nada est&aacute; montado ni retocado: lo
      que cambia de una a otra es la distancia, la hora o la estaci&oacute;n.
    </p>
  </header>
@@SECCIONES@@
  <section>
    <h2>Lo medido</h2>
    <table>
@@MEDIDO@@    </table>
  </section>

  <section>
    <h2>Lo que queda abierto</h2>
    <ul>
@@ABIERTO@@    </ul>
  </section>

  <footer>Motor determinista &middot; Blender &rarr; glTF &rarr; Three.js &middot; misma semilla, misma partida</footer>
</div>
"""

page = (TEMPLATE
        .replace(u'@@SECCIONES@@', u''.join(sections))
        .replace(u'@@MEDIDO@@', rows)
        .replace(u'@@ABIERTO@@', open_items))

io.open('artifacts/graphics/G-10/hoja.html', 'w', encoding='utf-8', newline='\n').write(page)
print('%.2f MB' % (len(page) / 1024 / 1024))
