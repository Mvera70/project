# E3b.3 · El adarve generado desde el anillo

**24 sep 2026.** Cierra E3b: el guardia de una torre sube, recorre el anillo de
piedra —rectas, codos, diagonales y el portón— y vuelve, en cualquier villa que
construya el motor. Pedido por Vera: «cierra E3b».

## Por qué se cambió de camino

E3b.2 intentaba cerrar el adarve con **una malla aprobada por cada combinación
de vecinos**. Cada villa nueva traía una máscara que no existía todavía —el
retorno 66 y el cruce 24 de la semilla 91, el codo 6, las ocho mixtas—, y en
tres días se juntaron dieciséis carpetas de candidatos en `art/recipes/e3b-*`
sin que ninguna villa aleatoria quedara cubierta. Con la exportación a Blender
pendiente de autorización en cada paso, el catálogo no iba a cerrar nunca.

Los muros ya se componen por código (`world/defences.ts`). El adarve hace lo
mismo encima de ellos: sale del trazado real del anillo y no de un catálogo de
esquinas. Las medidas de la familia walltop de E3b.2 se conservan: suelo a
1,02, tablero de 0,90, pretiles en la banda 0,35–0,45 y paso libre de 0,70.

## Qué se hizo

- **`src/render3d/world/rampart.ts`** (puro): de la topología a prismas. El
  tablero se construye con ingletes a lo largo del eje; **el pretil se pone
  sobre el borde de la unión de todos los suelos** —tableros, planta de la
  torre y su descansillo—, así una boca diagonal abre la esquina justa, el
  descansillo no queda cruzado y un tramo parcial se cierra solo. La cara de
  la escalera no lleva pretil, igual que G-27. Almenas sólo hacia fuera de la
  aldea; ménsulas bajo el tablero salvo sobre el portón.
- **`src/render3d/world/rampart-mesh.ts`**: dos mallas para todo el anillo
  (tablero y resto de piedra), con la piedra del muro publicado. La torre bajo
  el adarve se recorta a 1,02 (pierde sus almenas propias) y, si una diagonal
  sale por el lado de la escalera, los catorce peldaños se apartan 0,65 con
  descansillo, como en la fuente ancla66.
- **`plan.ts`**: `sceneRampartOf(state)` deriva el adarve sin guardarlo. Si el
  anillo entero es transitable, vuelta cerrada; si no, **los dos tramos que
  salen de la torre hasta el primer corte**, ida y vuelta. Un tronco, una obra,
  una casa pegada al eje o una ruina cortan. La misma descripción sirve a la
  malla, a las cajas de Rapier y a la ruta del guardia.
- **Vida**: el guardia **sube directo a su puesto** (desde donde se tira) y la
  ronda por el adarve es lo que hace de guardia sin enemigos a la vista. Si
  aparece la partida o acaba el turno a media ronda, vuelve al puesto por el
  lado más corto. El relevo del anochecer conserva a quien está arriba. De
  noche no se empieza a subir.
- La junta GLB de E3b.1 queda superada: una torre con un muro de piedra ya abre
  adarve. Sus pruebas se mudaron al camino vivo el mismo día.

## Medidas

Sonda geométrica (`tests/helpers/rampart-probe.ts`) sobre los mismos prismas
que se dibujan, muestreando la ronda cada centímetro de celda, en cuatro villas
jugadas con `run(…, 'prudent')` hasta el tick 3846:

| Villa | Tramos | Ronda | Sin suelo | Holgura mínima | Borde abierto |
|---|---|---|---|---|---|
| 91 | 88 | vuelta cerrada, dos torres | 0 | 0,325 | 0 |
| 23 | 101 | ida y vuelta, 76 + 26 tramos | 0 | 0,325 | 0 |
| 7 | 69 | ida y vuelta | 0 | 0,350 | 0 |
| 42 | 72 | ida y vuelta | 0 | 0,325 | 0 |

La holgura es contra un cuerpo de radio 0,32. La primera versión dio 0,309:
el guardia salía del puesto (0,08 hacia la escalera) directo al muro vecino y
rozaba el pretil interior. Ahora pasa por el centro de la torre.

Observatorio en la app (`observe-life.mjs`, semilla 91, año 70, `--means
arms,bows`):

- **Víspera** (`--coming 1`, 130 s a 1 fps, `patrol-seed91-v3`): los dos
  guardias de torre suben a los 11–15 s y hacen la ronda a 1,02; al anochecer
  vuelven por el lado corto, bajan y no suben hasta el día. Paso máximo entre
  muestras de 1 s: 1,35 (su marcha), sin saltos en el relevo. Cero errores,
  cero penetraciones y cero deriva de mallas.
- **Asalto** (`--raid 20 --assault`, 50 s, `assault-seed91-v2`): los dos se
  quedan en su puesto; las flechas salen al entrar la partida en alcance
  (segundo 40) y cae el primer atacante antes del 50. **La versión anterior
  ponía la ronda antes de ocupar el puesto y las torres pasaban el asalto
  andando sin tirar: cero flechas en 50 s.** Por eso la ronda va después.
- Capturas de día (`seed7-*`, `seed91-river-day.png`) y de noche con el
  guardia sobre el río (`guard-seed91-nightfall/crop-70.png`).

Todo en `artifacts/graphics/E3b3/`.

## Pruebas

- `tests/fast/rampart.test.ts` (10): vuelta cerrada con suelo, paso y borde en
  cuatro orientaciones y dos posiciones de torre; escalera apartada sólo con
  diagonal hacia su lado; un tramo perdido corta y se vuelve; la empalizada no
  recibe adarve; las cajas de Rapier no invaden el paso; el guardia sube por
  la escalera dibujada y los pretiles paran una flecha rasante pero no la que
  sale a 1,45; la escena rehace el adarve sólo cuando cambia su forma.
- `tests/journeys/e3b-rampart.test.ts` (3, 36 s): villa 91 cerrada con portón
  y diagonales, villa 23 parcial, y un tramo perdido que corta la vuelta.
- `bastion-access.test.ts` y `scene-ring.test.ts` mudadas al camino vivo.

## Instrumento

`observe-life.mjs` contaba como choque a quien andaba por su ruta elevada:
un cuerpo en el adarve está, por definición, encima de celdas de muro. Ahora
se cuenta aparte (`elevatedSamples`) y no suma a `penetratingCircles` ni a
`blockedCentres`.

## Límites

- **No hay prueba en un móvil real** de lo que cuesta la malla: unos 800
  prismas por villa, en dos mallas. Es geometría estática y fusionada, pero no
  está medida en dispositivo.
- La ronda es tinta de la vida: el motor no sabe que existe y no decide nada.
- La escalera apartada ocupa 0,65 de la segunda celda interior, que la máscara
  pública no cierra: alguien que pase por ahí puede rozar los peldaños bajos.
- Las dieciséis carpetas `art/recipes/e3b-*` quedan como historia: no se
  borran, pero ya no son el camino.
- La noche con yoyó de escalera ya pasaba en E3a; se corta sin subir de noche,
  y eso vale para las dos rutas.
