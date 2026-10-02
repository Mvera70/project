# Encargo · Las ilustraciones de la encrucijada

**Para:** Codex (ilustraciones), como las del carro (`public/ui/art/means-*.png`).
**Pide:** Vera, 2 oct 2026, viendo la decisión al lado del carro: «esta
pantalla se ve muy pobre, faltan logos como las otras; mandar pedido … no
copiar exactamente, darle su estilo».

## Qué falta

La hoja de la encrucijada (`screens/crossroad.ts`, `wood.css`, v5.54) es ya la
misma hoja que el carro —pergamino de loseta, esquinas de 14 px, tirador,
600 px como mucho— pero sólo lleva texto: título, cuerpo y las opciones en la
tira rasgada. El carro lleva una ilustración a color por cosa, asomando sobre
su cinta; la crónica, una viñeta 2:1 por línea. La decisión, que es el momento
de más peso del juego, es la única pantalla sin dibujo.

## La pieza

**Una viñeta por encrucijada**, a color, con el mismo trazo y la misma paleta
que las del carro y las 44 de la crónica (`cronica-color-v9-2026-09-29`).
**No es la tarjeta del carro copiada**: va arriba de la hoja, a lo ancho de la
columna de 390, encima del título, como la cabecera ilustrada de un
documento. Su estilo: la escena del momento de la decisión, sin texto, con el
papel del fondo transparente (alfa) para que se componga sobre el pergamino.

| | |
|---|---|
| Fichero | `public/ui/art/crossroad-<id>.png` |
| Tamaño | 780 × 300 (2×; se pinta a 390 × 150) |
| Recorte | sin marco, bordes que se funden al papel (el modo `wash` de `tools/ui/cut-art.py`) |
| Registro | una fila por fichero en `public/ui/art/index.json`, como las demás |

## Las quince del catálogo (RD-3)

| `id` | Título en el juego | Qué tiene que enseñar |
|---|---|---|
| `winter_grain_debt` | The Lord of Wealdmere Sends Carts | Carros del señor a la puerta del granero en invierno; el líder delante, los aldeanos mirando |
| `hungry_spring` | Seed or Bread | Un saco de grano abierto entre un campo arado vacío y una mesa con niños |
| `granary_theft` | The Broken Latch | La puerta del granero con el pestillo roto, grano por el suelo, dos que se miran |
| `plague_pit` | Where the Dead Go | Una fosa al borde del bosque, palas, humo de casas al fondo |
| `smith_feud` | A Hand on a Shoulder | Dos hombres frente a la herrería, uno con la mano en el hombro del otro |
| `feud_inherited` | The Old Quarrel | Dos jóvenes de familias distintas, la herrería entre ellos |
| `forest_cut` | The Old Wood | El bosque viejo, enorme, y la aldea pequeña al pie con hachas |
| `strangers_at_the_ford` | Nine at the Ford | Nueve con un carro sin bueyes cruzando el vado, mirando hacia la aldea |
| `one_at_the_ford` | One at the Ford | Uno solo con un fardo en el vado, al atardecer |
| `breaking_ground` | More Ground Than Hands | Un campo a medio roturar, pocas manos, mucha tierra |
| `raiders_coming` | Men Over the Ridge | Siluetas armadas en la cresta, la aldea abajo sin saberlo |
| `after_the_raid` | What They Left | Casas quemadas, un granero abierto, los que quedan |
| `succession` | Who Speaks Now | El bastón de mando sobre una mesa vacía, la gente alrededor |
| `first_stone` | The First Stone | Un bloque de piedra recién llegado en un carro, la aldea de madera detrás |
| `quiet_years` | A Full Granary | Un granero lleno, fiesta en la plaza, verano |

## La integración (cuando lleguen)

No toca los ficheros de las ilustraciones de Codex hasta que estén: la
pantalla pinta la viñeta si `index.json` la lista y, si no, se queda como
está (sin hueco vacío). Es una línea en `screens/crossroad.ts` y su regla en
`wood.css`, y se captura a 390, 750 y 1024 px antes de cerrar.
