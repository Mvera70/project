# IA-anim · Reuniones que se acaban y gestos de talar y picar

**24 sep 2026.** Pedido por Vera: «reunirse fuera de la aldea, todos pegados
junto a un bosque sin hacer nada, todos los días durante dos, tres o cuatro
días repetidos», y que talar madera y picar piedra no tenían animación.

## El corro que no se deshacía

Reproducido con el observatorio en la semilla 7, año 30: a mediodía **45 de 63
aldeanos parados** en `pause`, seis en la reunión, nadie trabajando. Cuatro
causas, todas medidas:

1. **Duraba semanas.** §11.8 leía `days` como ticks cuando un tick era un día;
   desde v3.72 un tick son siete jornadas. Una reunión de tres días eran
   veintiuna jornadas. Ahora son jornadas, contadas desde la semana de la
   decisión (`staging.ts`, `ordersOf(state, day)`).
2. **El corro tenía seis plazas.** La espiral genérica de `seatsOn` (cuarenta
   intentos, cuatro puntos por vuelta) no rodea una plaza con edificios. En
   día de reunión la reunión es la única oferta, así que el resto se paraba
   donde estuviera. Ahora `crowdSeats` pone una malla hexagonal de paso 0,7
   hasta 4,5 celdas: 80 plazas en el vado de la semilla 7.
3. **La convocatoria no llegaba lejos.** `decide` sólo miraba hasta
   `LOOK × 4` = 20 celdas; los trece que no iban estaban a 20–25. La reunión
   del motor ya no se descarta por distancia.
4. **El deber bloqueaba la orden.** La excepción de «necesidad urgente» saltaba
   con el deber a 0,92–1,0 de quien venía de trabajar, y en una reunión no hay
   tajo que lo calme. El deber ya no cuenta; la sed sí, y el agua sigue
   ofrecida en día de reunión para que el sediento vaya a beber y vuelva.

Resultado: el vado de la semilla 7 junta **29 de 29** a media jornada (antes
14). Las tres propiedades de `life-staging.test.ts` declaradas en rojo desde
B-1 —el 60 % de la aldea en la reunión, y el corro a menos de 14 celdas en las
semillas 7 y 23— **pasan** y vuelven a ser `it`. Prueba nueva: una reunión de
`n` días ocupa `n` jornadas y ninguna más.

## Talar y picar

Antes: `chop` era el martillo con el otro brazo encima, un vaivén delante del
pecho, y la cantera usaba el martillo de la fragua. Además **el hacha no se
veía**: la herramienta de respaldo cuelga del conector de la mano, que lleva la
escala ⅓ de metros a celdas, y quedaba en un bulto de pocos píxeles.

- `action-clips.ts`: `chop` y `mine` nuevos con tres poses clave —preparado,
  carga, golpe— y curvas por tramo: subida suave, golpe acelerado hasta el
  impacto (`STRIKE_AT`), rebote corto y vuelta. El pico carga por encima de la
  cabeza y clava delante con el torso doblado y las rodillas flexionadas; el
  hacha carga sobre el hombro con el torso girado y barre a la cintura. Los
  giros de un hueso ahora se acumulan (torso que gira y se dobla a la vez).
- `hand-tools.ts`: hacha y pico de un metro, cabeza exagerada; su orientación
  se calculó en el banco a partir del marco real del conector (mango hacia
  delante y abajo en el golpe, cabeza en el plano del golpe).
- `effects/work-chips.ts`: astillas de madera o piedra que saltan desde la
  cabeza de la herramienta en el instante del golpe. Tinta: no cuentan nada.
- La cantera usa `mine`; quien tala o pica se gira hacia el árbol o la roca.
- **Herramienta nueva:** `tools/graphics/gesture-sheet.mjs` fotografía un
  ciclo de un gesto sobre el GLB publicado, sin partida.

Evidencia: `artifacts/graphics/IA-anim/gestures/` (hojas de `chop` y `mine`) y
`chop-close-seed11/sheet.png` (cuatro leñadores en la semilla 11, año 21, a
15 fps: carga, golpe y astillas visibles). Prueba nueva
`tests/fast/work-gestures.test.ts`: la carga sube por encima de la cabeza, el
golpe baja rápido y la herramienta mide como una.

## Límites

- El picado se ha visto en el banco y está cubierto por `life-resources`, pero
  **no se ha filmado en partida**: pide una obra de piedra en curso.
- El leñador golpea a algo más de un paso del tronco, y el árbol no acusa el
  golpe. Apuntado en `docs/encargos-3d.md`.
- Hacha y pico son respaldo por código; un GLB con `grip` los sustituye.

## Segunda tanda (24 sep 2026): contacto, árbol y cantera

Vera preguntó si el hacha estaba al revés y si el golpe tenía contacto físico.
Las dos cosas eran ciertas y se midieron antes de tocar nada:

- **El hacha pegaba con el lomo.** En el impacto el filo miraba hacia arriba
  (0,97 en vertical) mientras la cabeza bajaba. Se dio la vuelta a la cabeza;
  una prueba exige ahora que el filo vaya por delante del movimiento.
- **No había contacto.** La cabeza quedaba de 0,1 a 0,3 celdas del tronco, y el
  pico no llegaba a la roca: un cuerpo no pisa a menos de 0,32 de su borde.
  `STRIKE_HEAD` guarda dónde cae la cabeza en el golpe (vigilado contra el GLB);
  la vida planta al trabajador a esa distancia más el radio del tronco y lo
  gira compensando el desvío lateral. El pico gana alcance en el golpe.
- **El árbol del motor suele estar dentro del bosque**, sin un lado libre: en
  las semillas 7 y 23 los leñadores quedaban a 1,2–2,3 celdas. El gesto se
  hace en los árboles del borde más cercanos, uno por leñador; la madera la
  sigue contando el motor. Resultado: de −0,06 a 0,19.
- **El árbol acusa el golpe:** `Forest.sway` inclina sólo ese árbol y lo
  devuelve, con vaivén amortiguado de 0,8 s, y la copa suelta hojas.
- **La cantera no aparecía en valles cuya roca queda al otro lado del río o
  del muro** (semilla 7, semana 1418). Ahora se pica también en la ladera de la
  montaña alcanzable, con una plaza por cara a la distancia del pico.
- Picado filmado en partida: semilla 23, año 30, con obra de muralla
  (`artifacts/graphics/IA-anim/mine-close-seed23/sheet.png`).

Reaprovechar en combate: los gestos tienen instante de impacto (`STRIKE_AT`) y
punto de impacto (`STRIKE_HEAD`) con nombre; un hachazo de guerra sólo necesita
arrancar desde el golpe real, como la lanza, y otra herramienta en la mano.
