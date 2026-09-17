# -*- coding: utf-8 -*-
"""Las variantes de los dos iconos, escritas a mano.

La forma sencilla, en vez de generar el `d=` con trigonometria: **una hoja y un
tronco se definen una sola vez** en `<defs>` y se colocan con
`translate(x y) rotate(a)`. Asi cada grano se empuja de uno en uno cambiando dos
numeros, y la forma del grano se cambia en un solo sitio.

**Y toda pieza rellena lleva `stroke="none"` explicito**, porque `.skin-icon`
del juego pone `stroke: currentColor` de 1,5 a todo icono: sin el, cada grano
sale con un contorno de 0,75 por lado y la espiga vuelve a fundirse.
"""

import calcadas as _C

PAPER = 'var(--paper, #D9C2A5)'

# --------------------------------------------------------------- las espigas
# A - la ramita del prototipo: hojas de lente alternas, con hueco al tallo y
#     sin barbas. Medido en el prototipo ampliado x10: la hoja mide 0,26 del
#     largo del glifo y las del mismo lado van a 0,35 - por eso no se funden.
WHEAT_A = f'''<defs>
  <path id="wa" d="M0.9 0Q3.4 -1.75 6.4 0Q3.4 1.75 0.9 0Z"/>
</defs>
<g fill="currentColor" stroke="none">
  <use href="#wa" transform="translate(5.2 20.8) rotate(-70)"/>
  <use href="#wa" transform="translate(7.0 18.4) rotate(-25)"/>
  <use href="#wa" transform="translate(8.7 16.1) rotate(-70)"/>
  <use href="#wa" transform="translate(10.5 13.7) rotate(-25)"/>
  <use href="#wa" transform="translate(12.3 11.3) rotate(-70)"/>
  <use href="#wa" transform="translate(14.0 9.0) rotate(-25)"/>
  <use href="#wa" transform="translate(15.8 6.6) rotate(-70)"/>
  <use href="#wa" transform="translate(16.4 5.8) rotate(-53) scale(0.8)"/>
</g>
<path d="M4.6 21.6L16.4 5.8" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round"/>'''

# B - la espiga clasica: granos gordos en pares, mas cerrados, y con barbas.
WHEAT_B = f'''<defs>
  <path id="wb" d="M1 0Q3.4 -2 5.9 0Q3.4 2 1 0Z"/>
</defs>
<g fill="currentColor" stroke="none">
  <use href="#wb" transform="translate(7.5 18.0) rotate(-97)"/>
  <use href="#wb" transform="translate(7.5 18.0) rotate(-17)"/>
  <use href="#wb" transform="translate(10.0 14.2) rotate(-97)"/>
  <use href="#wb" transform="translate(10.0 14.2) rotate(-17)"/>
  <use href="#wb" transform="translate(12.5 10.4) rotate(-97)"/>
  <use href="#wb" transform="translate(12.5 10.4) rotate(-17)"/>
  <use href="#wb" transform="translate(15.0 6.6) rotate(-57) scale(0.78)"/>
</g>
<path d="M5.4 21.2L15.0 6.6" fill="none" stroke="currentColor" stroke-width="1.9"
      stroke-linecap="round"/>
<path d="M5.4 21.2L2.6 22.4M5.4 21.2L2.5 20.2" fill="none" stroke="currentColor"
      stroke-width="1.2" stroke-linecap="round"/>'''

# C - cinco hojas gruesas: menos piezas, mas tinta, para que aguante 21 px.
WHEAT_C = f'''<defs>
  <path id="wc" d="M1.2 0Q4.3 -2.4 7.4 0Q4.3 2.4 1.2 0Z"/>
</defs>
<g fill="currentColor" stroke="none">
  <use href="#wc" transform="translate(8.3 16.8) rotate(-84)"/>
  <use href="#wc" transform="translate(8.3 16.8) rotate(-24)"/>
  <use href="#wc" transform="translate(12.3 11.2) rotate(-84)"/>
  <use href="#wc" transform="translate(12.3 11.2) rotate(-24)"/>
  <use href="#wc" transform="translate(15.4 7.0) rotate(-54) scale(0.8)"/>
</g>
<path d="M5.2 21.0L15.4 7.0" fill="none" stroke="currentColor" stroke-width="2.4"
      stroke-linecap="round"/>'''

# ---------------------------------------------------------------- la madera
# A - la pila del prototipo: dos troncos tumbados y uno de punta, y **la testa
#     clara con su anillo**, que es lo que los hace cilindros. Los circulos
#     oscuros de la version anterior se leian como una molecula.
LOGS_A = f'''<g transform="rotate(-8 12 12)">
  <rect x="5.2" y="4.2" width="15.4" height="6.0" rx="3.0" fill="currentColor" stroke="none"/>
  <rect x="8.8" y="12.6" width="11.8" height="6.0" rx="3.0" fill="currentColor" stroke="none"/>
  <circle cx="5.2" cy="15.6" r="3.0" fill="currentColor" stroke="none"/>
  <ellipse cx="7.8" cy="7.2" rx="1.4" ry="2.4" fill="{PAPER}"
           stroke="currentColor" stroke-width="1.1"/>
  <circle cx="7.5" cy="6.7" r="0.5" fill="currentColor" stroke="none"/>
  <ellipse cx="11.4" cy="15.6" rx="1.4" ry="2.4" fill="{PAPER}"
           stroke="currentColor" stroke-width="1.1"/>
  <circle cx="5.2" cy="15.6" r="1.8" fill="{PAPER}"
          stroke="currentColor" stroke-width="1.1"/>
</g>'''

# B - los tres de punta, en piramide: es la lectura mas rotunda a 21 px.
LOGS_B = f'''<g fill="currentColor" stroke="none">
  <circle cx="6.8" cy="15.8" r="5.2"/>
  <circle cx="17.2" cy="15.8" r="5.2"/>
  <circle cx="12.0" cy="7.0" r="5.2"/>
</g>
<g fill="{PAPER}" stroke="currentColor" stroke-width="1.2">
  <circle cx="6.8" cy="15.8" r="3.2"/>
  <circle cx="17.2" cy="15.8" r="3.2"/>
  <circle cx="12.0" cy="7.0" r="3.2"/>
</g>
<g fill="none" stroke="currentColor" stroke-width="1">
  <circle cx="12.0" cy="7.0" r="1.4"/>
</g>'''

# C - dos troncos gordos y nada mas: la silueta mas simple de las tres.
LOGS_C = f'''<g transform="rotate(-6 12 12)">
  <rect x="4.6" y="4.0" width="15.8" height="8.2" rx="4.1" fill="currentColor" stroke="none"/>
  <rect x="7.4" y="13.4" width="13.0" height="8.2" rx="4.1" fill="currentColor" stroke="none"/>
  <ellipse cx="8.0" cy="8.1" rx="1.9" ry="3.3" fill="{PAPER}"
           stroke="currentColor" stroke-width="1.3"/>
  <circle cx="7.6" cy="7.4" r="0.7" fill="currentColor" stroke="none"/>
  <ellipse cx="10.8" cy="17.5" rx="1.9" ry="3.3" fill="{PAPER}"
           stroke="currentColor" stroke-width="1.3"/>
</g>'''

WHEAT = {'A': WHEAT_A, 'B': WHEAT_B, 'C': WHEAT_C}
LOGS = {'A': LOGS_A, 'B': LOGS_B, 'C': LOGS_C}

WHEAT_WHY = {
    'A': ('La ramita del prototipo', 'Hojas de lente alternas, con hueco al tallo '
          'y sin barbas. Es la que copia el prototipo. Cuesta tinta a 21 px.'),
    'B': ('La espiga clasica', 'Granos gordos en pares y dos barbas. Se lee '
          'antes como trigo, pero no es lo que dibuja el prototipo.'),
    'C': ('Cinco hojas gruesas', 'Menos piezas y mas tinta: la que mejor '
          'aguanta el chip, a cambio de parecer mas laurel que espiga.'),
}
LOGS_WHY = {
    'A': ('La pila del prototipo', 'Dos troncos tumbados y uno de punta, con la '
          'testa clara anillada. Es la que copia el prototipo.'),
    'B': ('Los tres de punta', 'Tres testas en piramide: la lectura mas rotunda '
          'en pequeno, pero se aleja del prototipo.'),
    'C': ('Dos troncos gordos', 'La silueta mas simple y la mas gruesa. Pierde '
          'el tercer tronco.'),
}

# --------------------------------------------------- D, las dos calcadas
# La quinta version de la pila, y la que vale: en vez de deducir la forma, se
# **calca la del prototipo** (`calcar.py`, umbral de Otsu corrido -40 para que
# las juntas se abran). Las testas salen como agujeros de verdad con
# `fill-rule="evenodd"`, asi que el icono no supone el color del fondo -- a
# diferencia de la A, que rellenaba la testa con el papel del chip.
_TRACED = ('<path fill="currentColor" fill-rule="evenodd" stroke="none"\n'
           '      d="%s"/>')
WHEAT_D = _TRACED % _C.WHEAT
LOGS_D = _TRACED % _C.LOGS

WHEAT['D'] = WHEAT_D
LOGS['D'] = LOGS_D
WHEAT_WHY['D'] = ('Calcada del prototipo',
                  'No se parece al prototipo: es el prototipo. La silueta sale '
                  'del pixel del PNG, no de una aproximacion a ojo.')
LOGS_WHY['D'] = ('Calcada del prototipo',
                 'Igual que la espiga D: la silueta del propio prototipo. Las '
                 'testas son agujeros, no parches del color del chip.')
# --------------------------------------------------- la hoja de roble, calcada
# La de UI-V0 estaba dibujada a mano y se leia como una piruleta: un circulo
# con un palo. Esta es la del prototipo 01 (`calcar-iconos`: si el dibujo ya
# existe, no se deduce, se calca), con sus lobulos y su nervio.
OAK_LEAF_D = _TRACED % _C.OAK_LEAF
