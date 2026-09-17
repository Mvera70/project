# -*- coding: utf-8 -*-
"""Monta la hoja de contactos de los dieciseis aldeanos (G-19), para que el
dueno del diseno apruebe su estetica sin abrir la demo jugable.

El dato que manda: una persona mide unos veinte pixeles en la camara del
juego, y a veces seis (docs/visual-reference/README.md #3). A esa escala lo
que se lee es la silueta y el bloque de color, no una hebilla ni una cara.
Por eso cada figura se muestra a tamano natural, a 20 px y a 6 px, y al final
hay una rejilla con las dieciseis a 20 px juntas: es la prueba de verdad.

Fuente de las imagenes: los renders ya aprobados en
`artifacts/graphics/G-17/approved/<hash>/` y
`artifacts/graphics/G-18/approved/<id>/`. Se usa `capture-1.png` (el render
del visor Three, con la camara y la pose de andar del juego) y no el render
de estudio de Blender, porque es el que mas se parece a lo que ve el jugador.

Las cuatro captura comparten encuadre de camara y pose exactas (comprobado a
ojo sobre las 16), asi que un unico recorte fijo (CROP_BOX) aisla a la
persona igual de bien en las 16 sin tener que detectar el fondo figura a
figura, y de paso conserva la escala relativa real entre una figura y otra
(el nino mas bajo, el anciano encorvado, etc. no se corrigen).

  python tools/graphics/villager-sheet.py  -> artifacts/graphics/G-19/aldeanos.html
"""
import base64
import io
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, 'artifacts', 'graphics', 'G-19')

# Recorte comun: aisla a la persona (y su sombra) del fondo del visor,
# evitando la cuna gris del fondo que aparece en la esquina superior derecha
# de las 16 capturas. Medido a ojo sobre varias figuras (ver informe G-19).
CROP_BOX = (90, 30, 545, 615)

# id -> (directorio de origen relativo a artifacts/graphics/<ronda>/approved/,
#        ronda, quien la lleva en el juego, sena a 20 px escrita en G-17/G-18)
FIGURES = [
    ('villager', 'G-17', 'e40fb6dd9b1d5ca4',
     'El aldeano base: respaldo de todo adulto sin oficio ni figura propia',
     'Camisa verde y delantal terracota, cabeza cuadrada descubierta'),
    ('villager-smith', 'G-17', '011dcf45e9e5fd63',
     'El herrero',
     'Camisa gris y bloque oscuro del delantal de cuero'),
    ('villager-priest', 'G-17', '894cb713be282e67',
     'El cura',
     'Sotana negra larga, silueta continua hasta los zapatos'),
    ('villager-farmer', 'G-17', '99d21ff52888e01d',
     'El adulto sin oficio que trabaja la tierra (entra solo, sin sustituir a nadie)',
     'Sombrero ancho de paja y ropa verde con delantal claro'),
    ('villager-child', 'G-18', 'villager-child',
     'Todo el que tiene menos de 16 anos: una parte grande de la aldea',
     'Cabeza mayor, extremidades cortas, tunica terracota'),
    ('villager-elder', 'G-18', 'villager-elder',
     'Todo el que pasa de 60 anos',
     'Postura inclinada en la malla, pelo y chal claros'),
    ('villager-stranger', 'G-18', 'villager-stranger',
     'El forastero: quien llega al valle y aun no tiene oficio',
     'Capucha y capa azul pizarra'),
    ('villager-leader', 'G-18', 'villager-leader',
     'El jefe: sale en las encrucijadas y se le mira',
     'Gorro burdeos y manto dorado'),
    ('villager-reeve', 'G-18', 'villager-reeve',
     'El alguacil: siempre junto al granero, en el centro del valle',
     'Cinturon ancho y cuaderno al cinto'),
    ('villager-woodcutter', 'G-18', 'villager-woodcutter',
     'Quien esta en el tajo del bosque talando',
     'Chaleco oscuro y mangas arremangadas'),
    ('villager-mason', 'G-18', 'villager-mason',
     'Quien esta en una obra',
     'Gorra, delantal claro y bloque al hombro'),
    ('villager-shepherd', 'G-18', 'villager-shepherd',
     'Quien esta con el rebano: dando de comer, acariciando, espantando',
     'Sombrero pequeno, zurron y vara guardada'),
    ('villager-fisher', 'G-18', 'villager-fisher',
     'Quien esta en el vado',
     'Camisa azul rio, botas altas y cesto'),
    ('villager-midwife', 'G-18', 'villager-midwife',
     'La comadrona',
     'Toca y delantal marfil'),
    ('villager-woodward', 'G-18', 'villager-woodward',
     'El guardabosques',
     'Capucha verde oscuro'),
    ('villager-herbalist', 'G-18', 'villager-herbalist',
     'El herbolario: el que menos se ve',
     'Tunica verde hierba y zurron ocre'),
]


def load_capture(round_name, dirname):
    path = os.path.join(ROOT, 'artifacts', 'graphics', round_name, 'approved', dirname, 'capture-1.png')
    return Image.open(path).convert('RGB')


def to_b64(im, fmt='PNG'):
    buf = io.BytesIO()
    im.save(buf, format=fmt)
    return 'data:image/%s;base64,%s' % (fmt.lower(), base64.b64encode(buf.getvalue()).decode('ascii'))


def shrink_to_height(im, height):
    w, h = im.size
    width = max(1, round(w * height / h))
    return im.resize((width, height), Image.LANCZOS)


def nearest_zoom(im, factor):
    w, h = im.size
    return im.resize((w * factor, h * factor), Image.NEAREST)


rows_html = []
grid_20_cells = []
grid_20_zoom_cells = []
missing = []

for id_, round_name, dirname, who, sign in FIGURES:
    approved_dir = os.path.join(ROOT, 'artifacts', 'graphics', round_name, 'approved', dirname)
    capture_path = os.path.join(approved_dir, 'capture-1.png')
    if not os.path.exists(capture_path):
        missing.append(id_)
        continue

    full = load_capture(round_name, dirname)
    crop = full.crop(CROP_BOX)

    natural = shrink_to_height(crop, 300)
    px20 = shrink_to_height(crop, 20)
    px6 = shrink_to_height(crop, 6)
    px20_zoom = nearest_zoom(px20, 6)
    px6_zoom = nearest_zoom(px6, 16)

    b_natural = to_b64(natural)
    b_20 = to_b64(px20)
    b_20z = to_b64(px20_zoom)
    b_6 = to_b64(px6)
    b_6z = to_b64(px6_zoom)

    rows_html.append(u'''
  <article class="card" id="fig-%(id)s">
    <header>
      <h2><code>%(id)s</code></h2>
      <p class="who">%(who)s</p>
      <p class="sign">&ldquo;%(sign)s&rdquo;</p>
    </header>
    <div class="shots">
      <figure class="natural">
        <img src="%(natural)s" alt="%(id)s a tamano natural">
        <figcaption>Tamano natural<br><span class="dim">%(nw)d&times;%(nh)d px</span></figcaption>
      </figure>
      <figure class="tiny">
        <div class="tiny-pair">
          <img class="real" src="%(px20)s" alt="%(id)s a 20 px" style="height:20px">
          <img class="zoom" src="%(px20z)s" alt="%(id)s a 20 px, ampliada">
        </div>
        <figcaption>20 px real (izq., tamano real)<br>ampliada &times;6 a la derecha para poder mirarla</figcaption>
      </figure>
      <figure class="tiny">
        <div class="tiny-pair">
          <img class="real" src="%(px6)s" alt="%(id)s a 6 px" style="height:6px">
          <img class="zoom" src="%(px6z)s" alt="%(id)s a 6 px, ampliada">
        </div>
        <figcaption>6 px real (izq., tamano real)<br>ampliada &times;16 a la derecha para poder mirarla</figcaption>
      </figure>
    </div>
  </article>
''' % dict(id=id_, who=who, sign=sign, natural=b_natural, nw=natural.size[0], nh=natural.size[1],
           px20=b_20, px20z=b_20z, px6=b_6, px6z=b_6z))

    grid_20_cells.append(
        u'<div class="grid-cell"><img src="%s" alt="%s" style="height:20px"><span>%s</span></div>'
        % (b_20, id_, id_))
    grid_20_zoom_cells.append(
        u'<div class="grid-cell"><img src="%s" alt="%s"><span>%s</span></div>'
        % (b_20z, id_, id_))

missing_html = u''
if missing:
    missing_html = (u'<section class="missing"><h2>Faltan renders</h2><p>No se encontro '
                     u'<code>capture-1.png</code> para: %s. No se han inventado ni sustituido.</p></section>'
                     % u', '.join(u'<code>%s</code>' % m for m in missing))

TEMPLATE = u"""<title>Hoja de contactos · aldeanos</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Karla:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root {
    color-scheme: light;
    --ink: #232a1c;
    --ink-soft: #5c6650;
    --ground: #eef0e4;
    --panel: #ffffff;
    --panel-2: #e2e6d3;
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
      --panel: #20241a; --panel-2: #262b1e; --edge: #3b422e; --meadow: #9dbb6c; --clay: #c97b5c;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --ink: #e6e9db; --ink-soft: #9aa389; --ground: #1b1f16;
    --panel: #20241a; --panel-2: #262b1e; --edge: #3b422e; --meadow: #9dbb6c; --clay: #c97b5c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--ground); color: var(--ink);
    font-family: var(--body); font-size: 15px; line-height: 1.55;
    -webkit-text-size-adjust: 100%%;
  }
  .wrap { max-width: 920px; margin: 0 auto; padding: 0 16px 64px; }
  header.page { padding: 26px 0 16px; }
  .eyebrow {
    font-family: var(--mono); font-size: 11px; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-soft); margin: 0 0 8px;
  }
  h1 {
    font-family: var(--display); font-weight: 700; margin: 0;
    font-size: clamp(26px, 7vw, 38px); line-height: 1.05; letter-spacing: -.02em;
    text-wrap: balance;
  }
  header.page p { margin: 12px 0 0; max-width: 62ch; color: var(--ink-soft); }
  header.page p b { color: var(--ink); }
  .criterion {
    margin-top: 16px; padding: 12px 14px; border: 1px solid var(--edge);
    background: var(--panel-2); border-radius: 6px; max-width: 62ch;
  }
  .criterion p { margin: 0; color: var(--ink); }

  h2.section {
    font-family: var(--display); font-weight: 600; font-size: 13px;
    letter-spacing: .12em; text-transform: uppercase; color: var(--ink-soft);
    margin: 40px 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--edge);
  }

  .card {
    background: var(--panel); border: 1px solid var(--edge); border-radius: 10px;
    padding: 16px; margin-bottom: 16px;
  }
  .card header h2 { margin: 0; font-family: var(--display); font-size: 18px; }
  .card header h2 code {
    font-family: var(--mono); background: var(--panel-2); padding: 2px 6px;
    border-radius: 4px; font-size: 16px;
  }
  .card .who { margin: 6px 0 2px; color: var(--ink-soft); font-size: 13px; }
  .card .sign { margin: 0 0 12px; font-style: italic; color: var(--clay); font-size: 14px; }

  .shots { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end; }
  .shots figure { margin: 0; }
  .shots .natural img {
    display: block; max-width: 150px; height: auto; border: 1px solid var(--edge);
    border-radius: 4px; background: var(--panel-2);
  }
  .tiny-pair {
    display: flex; align-items: flex-end; gap: 10px; background: var(--panel-2);
    border: 1px solid var(--edge); border-radius: 4px; padding: 8px;
    min-height: 40px;
  }
  .tiny-pair img.real {
    image-rendering: auto; display: block; background: #d9cba3;
    outline: 1px dashed var(--ink-soft);
  }
  .tiny-pair img.zoom {
    image-rendering: pixelated; display: block; height: 96px; width: auto;
    border: 1px solid var(--edge);
  }
  figcaption { margin-top: 6px; font-size: 12px; color: var(--ink-soft); line-height: 1.4; }
  .dim { font-family: var(--mono); }

  .megagrid {
    background: var(--panel-2); border: 1px solid var(--edge); border-radius: 10px;
    padding: 20px 16px;
  }
  .megagrid .note { margin: 0 0 16px; color: var(--ink-soft); max-width: 62ch; }
  .grid-row {
    display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end;
    padding: 10px; background: #d9cba3; border-radius: 6px;
  }
  .grid-row.real { gap: 10px; }
  .grid-cell {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .grid-cell img { display: block; }
  .grid-row.real .grid-cell img { image-rendering: auto; }
  .grid-row.zoom .grid-cell img { image-rendering: pixelated; height: 72px; width: auto; }
  .grid-cell span {
    font-family: var(--mono); font-size: 9px; color: var(--ink); text-align: center;
    max-width: 72px; word-break: break-all;
  }
  .grid-title {
    font-family: var(--mono); font-size: 11px; text-transform: uppercase;
    letter-spacing: .08em; color: var(--ink-soft); margin: 24px 0 8px;
  }
  .grid-title:first-of-type { margin-top: 0; }

  .missing {
    margin-top: 30px; padding: 14px; border: 1px solid var(--clay); border-radius: 8px;
  }
  .missing h2 { margin: 0 0 6px; font-size: 14px; color: var(--clay); }
  .missing p { margin: 0; color: var(--ink-soft); }

  footer {
    margin-top: 44px; padding-top: 18px; border-top: 1px solid var(--edge);
    font-family: var(--mono); font-size: 11px; letter-spacing: .05em; color: var(--ink-soft);
  }

  @media (max-width: 480px) {
    .shots { gap: 14px; }
    .shots .natural img { max-width: 110px; }
  }
</style>

<div class="wrap">
  <header class="page">
    <p class="eyebrow">The Valley &middot; ronda G-19 &middot; hoja de contactos</p>
    <h1>Los dieciseis aldeanos, a la distancia que importa</h1>
    <p>
      Dieciseis figuras de Blender &mdash;cuatro de G-17, doce de G-18&mdash; ya
      construidas y aprobadas tecnicamente. Falta su aprobacion est&eacute;tica,
      y para eso no hace falta abrir la demo: esta pagina se mira en un minuto.
    </p>
    <div class="criterion">
      <p>
        <b>El dato que manda:</b> una persona mide unos <b>veinte pixeles</b> en
        la camara del juego, y a veces seis (<code>docs/visual-reference</code>
        &sect;3). A esa escala se lee la silueta y el bloque de color: una
        hebilla o una cara no existen. La pregunta de esta hoja no es
        &laquo;&iquest;es bonito?&raquo;, es <b>&laquo;&iquest;se distingue de
        las otras quince cuando mide veinte pixeles?&raquo;</b>.
      </p>
    </div>
  </header>

  <h2 class="section">Figura por figura</h2>
%(rows)s
%(missing)s

  <h2 class="section">La prueba de verdad: las dieciseis a 20&nbsp;px, juntas</h2>
  <div class="megagrid">
    <p class="note">
      Fila de arriba: tamano real (20 px de alto cada una &mdash; usa el zoom
      del navegador al 100&nbsp;%% para juzgarla). Fila de abajo: la misma
      imagen, ampliada &times;6 con vecino mas cercano para poder mirarla sin
      perder pixeles nuevos &mdash;no anade detalle que no estuviera ya en la
      de 20&nbsp;px&mdash;.
    </p>
    <p class="grid-title">Tamano real (20 px)</p>
    <div class="grid-row real">
%(grid20)s
    </div>
    <p class="grid-title">Ampliada &times;6, para poder mirarla</p>
    <div class="grid-row zoom">
%(grid20zoom)s
    </div>
  </div>

  <footer>Renders aprobados de G-17 y G-18 &middot; recorte comun, sin retocar colores ni siluetas &middot; misma camara y misma pose de andar en las 16</footer>
</div>
"""

page = TEMPLATE % dict(
    rows=u''.join(rows_html),
    missing=missing_html,
    grid20=u'\n'.join(grid_20_cells),
    grid20zoom=u'\n'.join(grid_20_zoom_cells),
)

os.makedirs(OUT_DIR, exist_ok=True)
out_path = os.path.join(OUT_DIR, 'aldeanos.html')
io.open(out_path, 'w', encoding='utf-8', newline='\n').write(page)
print('%.2f MB -> %s' % (len(page.encode('utf-8')) / 1024 / 1024, out_path))
if missing:
    print('FALTAN RENDERS:', ', '.join(missing))
