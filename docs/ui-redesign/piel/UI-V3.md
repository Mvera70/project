# UI-V3 · La crónica

La página de pergamino del prototipo 02, en dos pasadas: un agente Sonnet
entregó la **estructura** y el coordinador la **estética**, porque la primera
sola no bastó.

## Lo que entregó la primera pasada (agente, worktree)

`plan-piel.md` §3.2 y §3.6, sobre el kit de UI-V0:

- **El velo deja de ser un telón oscuro**: es transparente, y la página sube
  desde el valle con un degradado de 60 px. El degradado va **dentro del
  contenido que se desplaza**, no como fondo del velo: puesto en el velo se
  quedaba fijo respecto a su marco y aparecía una franja fantasma a media
  lectura, oscureciendo texto que ya no tenía valle detrás.
- **Cabecera de año** con «ANNO …» y capitular, **línea de tiempo** de oro con
  una entrada por línea de crónica, **hueco de ilustración** por entrada,
  **tarjeta plana** para una decisión ya resuelta y **documento sellado** para
  la que está pendiente, que abre la encrucijada de siempre.
- `redesign/chronicle-art.ts`, puro y sin DOM: qué dibujo le toca a cada clase
  de entrada, incluidos los doce sucesos de R-1. `null` es «esta entrada lleva
  su propio documento», y el llamador decide por `entry.kind`, nunca por ese
  valor.
- 27 pruebas en `tests/fast/ui-chronicle-art.test.ts`.

Dos comprobaciones del coordinador antes de integrarlo, porque tocaba el
motor de refilón: `namesOf` es una búsqueda pura y `renderEntry` promete en su
propio comentario que no toca el estado ni el azar. Ninguna de las dos desplaza
la simulación.

## Lo que faltaba, dicho por el dueño del diseño

> «La estructura está más o menos conseguida pero la estética sigue siendo muy
> mala, volvemos a lo de antes, prueba con la técnica de la skill.»

«Lo de antes» son los nueve intentos de los iconos del chip, y la técnica es la
de la skill `calcar-iconos`: **si el dibujo ya existe, no se deduce, se calca.**
Lo que la página tenía era el esqueleto con los colores correctos; lo que no
tenía era ni un adorno, y todos los adornos estaban ya pintados en el
prototipo.

## La segunda pasada: seis piezas, ninguna dibujada

| Pieza | Cómo | De dónde |
|---|---|---|
| Capitular ilustrado | `cut-art.py plain` | 02, (78, 874, 201, 1001) |
| Viñeta a pluma | `cut-art.py wash` | 02, (140, 1040, 360, 1185) |
| Palmeta del filete del año | `trace-glyph.py` | 02, (536, 972, 592, 1022) |
| Rombo entre entradas | `trace-glyph.py` | 02, (430, 1194, 474, 1219) |
| Rama de la orla izquierda | `trace-glyph.py` | 02, (0, 745, 78, 1062) |
| Cuenta anillada | a mano | dos círculos: aquí dibujar gana |

Y de ahí salieron las tres cosas que esta ronda añade al método, ya escritas en
la skill:

1. **Hay dos herramientas, y elegir mal es el error siguiente.** La palmeta y
   el rombo salieron perfectos calcados; el capitular ilustrado salió como una
   mancha con jirones por mucho que moviera el corte, porque es pintura con
   medios tonos y no una silueta. De ahí `tools/ui/cut-art.py`.
2. **Una pieza de tinta sobre papel se recorta guardando el dibujo como alfa**
   (`wash`), no como rectángulo: el papel del prototipo no es el papel del
   juego, y a lo bruto queda un recuadro de otro tono encima de la página.
3. **Un adorno calcado que va como fondo de CSS no puede usar `currentColor`**
   —dentro de una `data:` URI no hay color que heredar—, así que la rama lleva
   un hex literal `#665F49`, muestreado del prototipo (media del 12 % más
   oscuro de su recuadro), y el SVG se codifica con `encodeURIComponent`.

El calcador creció con dos opciones para esto: `invert`, para una pieza clara
sobre fondo oscuro, y `aspect`, para devolver el `viewBox` con la proporción
real en vez de meter una rama vertical en un cuadrado.

**Y la rama va como pseudoelemento, no como hijo**, por el mismo motivo por el
que el degradado es hermano del cuerpo: `replaceChildren()` vacía el cuerpo en
cada cambio de fuente, y un `<div>` de adorno desaparecería con el resto. Un
pseudoelemento no es un nodo hijo.

## Medido en el juego empaquetado

Semilla 11, año 21, `bundle-game` + Playwright sobre `file://`:

| Qué | Cuánto |
|---|---|
| Años pintados | 21 |
| Entradas | 228 |
| Viñetas, y de ellas roturas | 216 · **0** |
| Capitulares ilustrados | 21 |
| Rombos · palmetas | 207 · 21 |
| Tarjetas planas de decisión resuelta | 12 |

Dos cosas que **no** se han comprobado en captura, dichas tal cual:

- **El documento sellado.** El código está y typechequea, pero en ninguna
  captura salió, y el motivo está medido: no había encrucijada pendiente
  (`.crossroad-marker` y `.crossroad-scrim` a cero), así que no había nada que
  sellar. Noventa segundos a ×64 no bastaron para que el motor plantease una:
  el jugador toma entre siete y doce decisiones en cuarenta años. Queda para
  UI-V5, que es de quien es el documento sellado.
- **El índice de arte por suceso** (`public/ui/art/index.json`) se lee por red
  y bajo `file://` lo bloquea CORS. Está previsto y capturado: el `catch` deja
  el índice vacío. Por eso **la viñeta repetida no pasa por ese índice** —
  si lo hiciera, no saldría nunca en las capturas con las que se verifica esta
  ronda.

## La viñeta es una, y repetida, por decisión del dueño

> «Lo de generar una imagen para cada suceso lo dejamos para más adelante, haz
> uno de momento y que se repita.»

`chronicle-art.ts` sigue diciendo qué dibujo le tocaría a cada entrada, y en
cuanto una ronda de arte llene `index.json` cada suceso tendrá el suyo sin
tocar una línea de TypeScript. Hasta entonces, todas llevan el aguado del
prototipo. El óvalo con la hoja de roble se queda como último recurso, sólo si
la imagen no llega.
