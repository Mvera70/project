# Las tomas de la ronda de animación — índice (29 sep 2026)

Este documento es el índice de toda la evidencia visual de la ronda de animación
AN-0 a AN-4 —las tomas del observatorio y las hojas de gestos—, con los
parámetros que hacen reproducible cada toma. La matriz con los veredictos está
en `docs/medidas/animacion-matriz-2026-09-29.md`; aquí sólo se indexa, y no se
describe ni se juzga lo que se ve en las tomas.

## Cómo se leen las tablas

- **Rutas.** Todas las rutas de este índice son relativas a
  `artifacts/graphics/`.

- **De dónde sale cada columna.** Semilla, año, `lead`, cadencia, fotogramas,
  errores de página y viewport salen de `trace.json` de cada toma (la cabecera y
  la lista `frames`); los segundos son (fotogramas − 1) / fps, y `lead` son los
  segundos de vida que corren antes del primer fotograma. La cámara y el
  escenario salen del comando con que se rodó la toma: en AN-1 a AN-4, de los
  guiones de tomas de la sesión de la ronda (no están en el repositorio); en
  AN-0, del bloque de comandos y de la tabla «2.3 Tomas de referencia» de la
  matriz.

- **«—»** quiere decir que el parámetro no aparece en el comando ni en la traza.
  Una toma sin `--follow`, `--look` ni `--zoom` sale con el encuadre de reposo.
  En «Cámara», `--follow` es el id de la persona seguida, `--look` las
  coordenadas X,Z del mapa y `--zoom` el zoom.

- **Viewport.** Es el de `--viewport` y el de `life.viewport` de la traza, que
  coinciden en todas las tomas. Cuando los PNG de `frames/` miden otra cosa, se
  dice entre paréntesis.

- **Página.** Sin `--page`, la toma corre sobre el empaquetado por omisión de la
  herramienta, `artifacts/graphics/G-10/game/valley.html`, que se reconstruye
  con `bundle-game.ts`: el índice no fija qué versión del código tenía en cada
  toma.

- **Ficheros de cada carpeta.** Además de `trace.json`, `summary.json`,
  `index.html` (el visor) y `frames/`, cada toma trae tres fotogramas sueltos:
  `before.png` (el primero), `middle.png` (el del medio) y `after.png` (el
  último). La columna «Ficheros derivados» lista `middle.png` y los
  `strip-*.png` y `zoom-*.png` que haya.

- **Cotejo con las trazas.** En las 12 tomas con `--follow`, la persona indicada
  está en x = 195 px (el centro del viewport) en todos los fotogramas; en
  `hens`, `ducks` y `deer`, el punto `--look` se proyecta a x = 195 px en el
  primer fotograma, en el del medio y en el último. Las trazas de todas las
  tomas indexadas declaran `advanceWeeks` 0, `speed` `null` y `mode`
  `production-renderer-fixed-state-30hz`.

## AN-0 · Inventario y línea de base

Carpeta: `AN-0/baseline/`.

| Toma (carpeta) | Semilla · año | lead · fps × s | Viewport | Cámara (follow / look / zoom) | Escenario (raid, assault, beast, hunt, página «antes») | Fotogramas | Errores de página | Ficheros derivados |
|---|---|---|---|---|---|---|---|---|
| `AN-0/baseline/wide-seed11-y21/` | 11 · 21 | 20 s · 2 fps × 20 s | 390×844 | — / — / — | — | 41 | ninguno | `middle.png` |
| `AN-0/baseline/walk-seed11-y21-follow13/` | 11 · 21 | 20 s · 15 fps × 6 s | 390×844 | 13 / — / 0.18 | — | 91 | ninguno | `middle.png`, `strip-30-45.png` |
| `AN-0/baseline/walk-seed11-y21-child54/` | 11 · 21 | 20 s · 15 fps × 6 s | 390×844 | 54 / — / 0.18 | — | 91 | ninguno | `middle.png`, `strip-30-45.png` |
| `AN-0/baseline/wide-seed7-y60/` | 7 · 60 | 20 s · 2 fps × 20 s | 390×844 (PNG 331×717) | — / — / — | — | 41 | ninguno | `middle.png` |
| `AN-0/baseline/hens-seed11-y21/` | 11 · 21 | 20 s · 15 fps × 6 s | 390×844 | — / 31.5,48.6 / 0.18 | — | 91 | ninguno | `middle.png`, `strip-0-16.png` |
| `AN-0/baseline/ducks-seed11-y21/` | 11 · 21 | 20 s · 15 fps × 6 s | 390×844 | — / 36.5,54 / 0.18 | — | 91 | ninguno | `middle.png`, `strip-0-16.png` |
| `AN-0/baseline/deer-seed11-y21/` | 11 · 21 | 20 s · 15 fps × 6 s | 390×844 | — / 21.4,37.7 / — | — | 91 | ninguno | `middle.png`, `strip-0-16.png` |

- **Origen de los parámetros.** Los comandos de `wide-seed11-y21` y de
  `walk-seed11-y21-follow13` están literales en el bloque de comandos de la
  matriz. De las otras cinco tomas no hay comando registrado: su semilla, año,
  `lead`, cadencia y cámara son los de la tabla «2.3» de la matriz, y su
  viewport el de la traza.

- **`deer-seed11-y21`.** La tabla «2.3» no da `--zoom` para esta toma; su traza
  proyecta el mundo a pantalla con la misma escala que las tomas rodadas con
  `--zoom 0.18` (`hens`, `ducks`, `child54` y `follow13`).

- **Fuera de las tablas.** `AN-0/perf/` guarda las dos sondas `gl-probe` de la
  línea de base (`gl-probe-aldea-11-21-before.txt` y
  `gl-probe-villa-7-60-before.txt`); no son tomas.

## AN-1 · Locomoción

Carpetas: `AN-1/before/` y `AN-1/after/`.

| Toma (carpeta) | Semilla · año | lead · fps × s | Viewport | Cámara (follow / look / zoom) | Escenario (raid, assault, beast, hunt, página «antes») | Fotogramas | Errores de página | Ficheros derivados |
|---|---|---|---|---|---|---|---|---|
| `AN-1/before/walk-seed7-y60-child242/` | 7 · 60 | 20 s · 15 fps × 6 s | 390×844 | 242 / — / 0.18 | página «antes»: `--page artifacts/graphics/AN-1/game-before/valley.html` | 91 | ninguno | `middle.png`, `strip-30-45.png` |
| `AN-1/after/walk-seed7-y60-child242/` | 7 · 60 | 20 s · 15 fps × 6 s | 390×844 | 242 / — / 0.18 | — | 91 | ninguno | `middle.png`, `strip-30-45.png` |
| `AN-1/before/walk-seed7-y60-follow114/` | 7 · 60 | 20 s · 15 fps × 6 s | 390×844 | 114 / — / 0.18 | página «antes»: `--page artifacts/graphics/AN-1/game-before/valley.html` | 91 | ninguno | `middle.png`, `strip-30-45.png` |
| `AN-1/after/walk-seed7-y60-follow114/` | 7 · 60 | 20 s · 15 fps × 6 s | 390×844 | 114 / — / 0.18 | — | 91 | ninguno | `middle.png`, `strip-30-45.png` |
| `AN-1/before/walk-seed7-y60-follow208/` | 7 · 60 | 20 s · 15 fps × 6 s | 390×844 | 208 / — / 0.18 | página «antes»: `--page artifacts/graphics/AN-1/game-before/valley.html` | 91 | ninguno | `middle.png`, `strip-30-45.png` |
| `AN-1/after/walk-seed7-y60-follow208/` | 7 · 60 | 20 s · 15 fps × 6 s | 390×844 | 208 / — / 0.18 | — | 91 | ninguno | `middle.png`, `strip-30-45.png` |
| `AN-1/after/walk-seed11-y21-follow13/` | 11 · 21 | 20 s · 15 fps × 6 s | 390×844 | 13 / — / 0.18 | — | 91 | ninguno | `middle.png`, `strip-30-45.png` |
| `AN-1/before/wide-seed7-y60/` | 7 · 60 | 20 s · 2 fps × 20 s | 390×844 (PNG 331×717) | — / — / — | página «antes»: `--page artifacts/graphics/AN-1/game-before/valley.html` | 41 | ninguno | `middle.png` |

- Las filas de `before/` se rodaron sobre `AN-1/game-before/valley.html`, el
  empaquetado con el GLB anterior; las de `after/`, sobre el empaquetado por
  omisión, que se reconstruyó entre tomas: `after/walk-seed7-y60-follow208` se
  rodó después de reconstruirlo para las tomas de AN-2.

- **`after/walk-seed11-y21-follow13`.** Su comando no está en los guiones de
  tomas de AN-1: sus parámetros son los de su gemela de AN-0
  (`AN-0/baseline/walk-seed11-y21-follow13`), con la que su traza coincide punto
  por punto (véase «Pares antes/después» en AN-4).

- La matriz (§2.3) explica por qué el adulto de la semilla 7 tiene dos pares,
  `follow114` y `follow208`.

- **`before/wide-seed7-y60`.** Es el «antes» de `AN-4/after/wide-seed7-y60` (par
  `plaza-seed7`). Sus PNG miden 331×717 aunque la traza declara 390×844, como
  los de `AN-0/baseline/wide-seed7-y60`; los de `AN-4/after/wide-seed7-y60`
  miden 390×844, y `build-compare.py` reescala el «antes» al tamaño del
  «después» en las parejas que no son estrictas.

- **Fuera de las tablas.** `AN-1/gait-report-after.txt`;
  `AN-1/approved/cbc336551f462700/villager.glb`; `AN-1/game-before/` (el
  empaquetado «antes»); y `AN-1/film/`, salida de `film.mjs` y no del
  observatorio: `seed11-y21` (con `trace.json`, `tira.png` e `informe.md`) y
  `seed7-y60`, incompleta (véase «Carpetas incompletas»).

## AN-2 · Vida y oficios

Carpeta: `AN-2/after/` (AN-2 no tiene `before/`).

| Toma (carpeta) | Semilla · año | lead · fps × s | Viewport | Cámara (follow / look / zoom) | Escenario (raid, assault, beast, hunt, página «antes») | Fotogramas | Errores de página | Ficheros derivados |
|---|---|---|---|---|---|---|---|---|
| `AN-2/after/wide-seed11-y21/` | 11 · 21 | 20 s · 2 fps × 20 s | 390×844 | — / — / — | — | 41 | ninguno | `middle.png` |
| `AN-2/after/hammer-seed11-y21-follow27/` | 11 · 21 | 20 s · 15 fps × 6 s | 390×844 | 27 / — / 0.18 | — | 91 | ninguno | `middle.png`, `strip-30-53.png` |
| `AN-2/after/sit-seed11-y21-follow60/` | 11 · 21 | 20 s · 15 fps × 6 s | 390×844 | 60 / — / 0.18 | — | 91 | ninguno | `middle.png`, `strip-30-45.png`, `zoom-sit.png` |
| `AN-2/after/play-seed7-y60-follow224/` | 7 · 60 | 20 s · 15 fps × 8 s | 390×844 (PNG 331×717) | 224 / — / 0.18 | — | 121 | ninguno | `middle.png` |

## AN-3 · Encuentros y combate

Carpetas: `AN-3/<toma>/`, sin subcarpeta `after/`. `AN-3/gestures/` no es una
toma: va en «Hojas de gestos».

| Toma (carpeta) | Semilla · año | lead · fps × s | Viewport | Cámara (follow / look / zoom) | Escenario (raid, assault, beast, hunt, página «antes») | Fotogramas | Errores de página | Ficheros derivados |
|---|---|---|---|---|---|---|---|---|
| `AN-3/assault-seed11-y21/` | 11 · 21 | 20 s · 10 fps × 12 s | 390×844 | — / — / — | `--raid 12 --assault` | 121 | ninguno | `middle.png`, `strip-flee.png` |
| `AN-3/bear-seed11-y21/` | 11 · 21 | 40 s · 10 fps × 16 s | 390×844 | — / — / — | `--happening bear_in_the_wood` | 161 | ninguno | `middle.png` |
| `AN-3/gate-seed11-y21/` | 11 · 21 | 8 s · 10 fps × 14 s | 390×844 | — / — / — | `--raid 12 --assault` | 141 | ninguno | `middle.png`, `strip-gate.png`, `zoom-gate-9005.png` |

- `hunt-seed11-y21`, `hunt-seed7-y30`, `hunt-seed5-y21` y `assault-seed7-y60` no
  llegaron a grabarse: véase «Carpetas incompletas».

## AN-4 · Aceptación conjunta

Carpeta: `AN-4/after/`.

| Toma (carpeta) | Semilla · año | lead · fps × s | Viewport | Cámara (follow / look / zoom) | Escenario (raid, assault, beast, hunt, página «antes») | Fotogramas | Errores de página | Ficheros derivados |
|---|---|---|---|---|---|---|---|---|
| `AN-4/after/wide-seed7-y60/` | 7 · 60 | 20 s · 2 fps × 20 s | 390×844 | — / — / — | — | 41 | ninguno | `middle.png`, `strip-play.png` |
| `AN-4/after/wide-seed11-y21-320/` | 11 · 21 | 20 s · 2 fps × 10 s | 320×568 | — / — / — | — | 21 | ninguno | `middle.png` |

### Pares antes/después y comparativas

`AN-4/compare/` guarda las comparativas antes/después que monta
`build-compare.py` (en esa misma carpeta) a partir de los `frames/` de las dos
carpetas de cada par; no son tomas nuevas. La tabla incluye también el par
`follow114`, que no tiene comparativa. En cada par se ha comprobado sobre
`trace.json` que la cabecera (`seed`, `year`, `advanceWeeks`, `fps`, `lead`,
`speed`, `mode`), el número de fotogramas, los identificadores y las posiciones
de mundo (`x`, `z`) y de pantalla (`screen`) de personas y animales en cada
fotograma son idénticos (una muestra es una persona o un animal en un
fotograma): la diferencia máxima es 0 en los seis pares. Se compara la traza,
no los píxeles: en `plaza-seed7` los PNG del «antes» miden 331×717 y los del
«después», 390×844.

| Par (nombre en `compare/`) | Antes | Después | Muestras (personas / animales) | Diferencia máxima (mundo y pantalla) | Comparativa (`AN-4/compare/`) |
|---|---|---|---|---|---|
| `walk-adulto-seed11` | `AN-0/baseline/walk-seed11-y21-follow13/` | `AN-1/after/walk-seed11-y21-follow13/` | 4 368 / 819 | 0 | `walk-adulto-seed11-native.gif`, `walk-adulto-seed11-native-x3.gif`, `walk-adulto-seed11-strip.png` |
| `walk-nino-seed7` | `AN-1/before/walk-seed7-y60-child242/` | `AN-1/after/walk-seed7-y60-child242/` | 5 460 / 2 184 | 0 | `walk-nino-seed7-native.gif`, `walk-nino-seed7-native-x3.gif`, `walk-nino-seed7-strip.png` |
| — | `AN-1/before/walk-seed7-y60-follow114/` | `AN-1/after/walk-seed7-y60-follow114/` | 5 460 / 2 184 | 0 | — |
| `walk-adulto-seed7` | `AN-1/before/walk-seed7-y60-follow208/` | `AN-1/after/walk-seed7-y60-follow208/` | 5 460 / 2 184 | 0 | `walk-adulto-seed7-native.gif`, `walk-adulto-seed7-native-x3.gif`, `walk-adulto-seed7-strip.png` |
| `plaza-seed11` | `AN-0/baseline/wide-seed11-y21/` | `AN-2/after/wide-seed11-y21/` | 1 968 / 369 | 0 | `plaza-seed11-native.gif`, `plaza-seed11-native-x3.gif`, `plaza-seed11-strip.png` |
| `plaza-seed7` | `AN-1/before/wide-seed7-y60/` | `AN-4/after/wide-seed7-y60/` | 2 460 / 984 | 0 | `plaza-seed7-native.gif`, `plaza-seed7-native-x3.gif`, `plaza-seed7-strip.png` |

- **Fuera de las tablas.** `AN-4/perf/` guarda sondas de rendimiento; no son
  tomas.

## Hojas de gestos

Hojas de gestos sin partida (`preview` en la matriz): una por clip y modelo
(`gesture-sheet.mjs`, 12 fotogramas por hoja) o por especie
(`animal-gestures-bench.mjs`). No son tomas del observatorio.

| Fase | Fichero | Clip o especie |
|---|---|---|
| AN-0 | `AN-0/gestures/bow_draw-villager-sheet.png` | `bow_draw` (modelo `villager`) |
| AN-0 | `AN-0/gestures/bow_loose-villager-sheet.png` | `bow_loose` (modelo `villager`) |
| AN-0 | `AN-0/gestures/carry_walk-villager-sheet.png` | `carry_walk` (modelo `villager`) |
| AN-0 | `AN-0/gestures/chop-villager-sheet.png` | `chop` (modelo `villager`) |
| AN-0 | `AN-0/gestures/douse-villager-sheet.png` | `douse` (modelo `villager`) |
| AN-0 | `AN-0/gestures/drink-villager-sheet.png` | `drink` (modelo `villager`) |
| AN-0 | `AN-0/gestures/fall-villager-sheet.png` | `fall` (modelo `villager`) |
| AN-0 | `AN-0/gestures/flee-villager-sheet.png` | `flee` (modelo `villager`) |
| AN-0 | `AN-0/gestures/gate_strike-villager-sheet.png` | `gate_strike` (modelo `villager`) |
| AN-0 | `AN-0/gestures/hammer-villager-sheet.png` | `hammer` (modelo `villager`) |
| AN-0 | `AN-0/gestures/hit_take-villager-sheet.png` | `hit_take` (modelo `villager`) |
| AN-0 | `AN-0/gestures/idle-villager-sheet.png` | `idle` (modelo `villager`) |
| AN-0 | `AN-0/gestures/mine-villager-sheet.png` | `mine` (modelo `villager`) |
| AN-0 | `AN-0/gestures/play-villager-sheet.png` | `play` (modelo `villager`) |
| AN-0 | `AN-0/gestures/pray-villager-sheet.png` | `pray` (modelo `villager`) |
| AN-0 | `AN-0/gestures/shelter-villager-sheet.png` | `shelter` (modelo `villager`) |
| AN-0 | `AN-0/gestures/sit-villager-sheet.png` | `sit` (modelo `villager`) |
| AN-0 | `AN-0/gestures/sort-villager-sheet.png` | `sort` (modelo `villager`) |
| AN-0 | `AN-0/gestures/sow-villager-sheet.png` | `sow` (modelo `villager`) |
| AN-0 | `AN-0/gestures/spear_thrust-villager-sheet.png` | `spear_thrust` (modelo `villager`) |
| AN-0 | `AN-0/gestures/spread-villager-sheet.png` | `spread` (modelo `villager`) |
| AN-0 | `AN-0/gestures/talk-villager-sheet.png` | `talk` (modelo `villager`) |
| AN-0 | `AN-0/gestures/walk-villager-sheet.png` | `walk` (modelo `villager`) |
| AN-0 | `AN-0/gestures/work_hoe-villager-sheet.png` | `work_hoe` (modelo `villager`) |
| AN-0 | `AN-0/animals/bear-gestures.png` | especie `bear` (filas: idle, walk, attack) |
| AN-0 | `AN-0/animals/boar-gestures.png` | especie `boar` (filas: idle, walk, charge, attack) |
| AN-0 | `AN-0/animals/cow-gestures.png` | especie `cow` (filas: idle, walk) |
| AN-0 | `AN-0/animals/crow-gestures.png` | especie `crow` (filas: idle, walk) |
| AN-0 | `AN-0/animals/deer-gestures.png` | especie `deer` (filas: idle, walk) |
| AN-0 | `AN-0/animals/dog-gestures.png` | especie `dog` (filas: idle, walk, run, bark, play) |
| AN-0 | `AN-0/animals/duck-gestures.png` | especie `duck` (filas: idle, walk) |
| AN-0 | `AN-0/animals/fish-gestures.png` | especie `fish` (filas: idle, walk) |
| AN-0 | `AN-0/animals/fox-gestures.png` | especie `fox` (filas: idle, walk) |
| AN-0 | `AN-0/animals/hen-gestures.png` | especie `hen` (filas: idle, walk) |
| AN-0 | `AN-0/animals/mule-gestures.png` | especie `mule` (filas: idle, walk) |
| AN-0 | `AN-0/animals/partridge-gestures.png` | especie `partridge` (filas: idle, walk, takeoff, flight) |
| AN-0 | `AN-0/animals/pig-gestures.png` | especie `pig` (filas: idle, walk) |
| AN-0 | `AN-0/animals/rabbit-gestures.png` | especie `rabbit` (filas: idle, walk, flee) |
| AN-0 | `AN-0/animals/wolf-gestures.png` | especie `wolf` (filas: idle, walk, attack) |
| AN-1 | `AN-1/gestures/carry_walk-villager-sheet.png` | `carry_walk` (modelo `villager`) |
| AN-1 | `AN-1/gestures/walk-villager-sheet.png` | `walk` (modelo `villager`) |
| AN-2 | `AN-2/gestures/drink-villager-sheet.png` | `drink` (modelo `villager`) |
| AN-2 | `AN-2/gestures/hammer-villager-sheet.png` | `hammer` (modelo `villager`) |
| AN-2 | `AN-2/gestures/play-villager-sheet.png` | `play` (modelo `villager`) |
| AN-2 | `AN-2/gestures/pray-villager-sheet.png` | `pray` (modelo `villager`) |
| AN-2 | `AN-2/gestures/sit-villager-sheet.png` | `sit` (modelo `villager`) |
| AN-2 | `AN-2/gestures/sort-villager-sheet.png` | `sort` (modelo `villager`) |
| AN-2 | `AN-2/gestures/talk-villager-sheet.png` | `talk` (modelo `villager`) |
| AN-3 | `AN-3/gestures/flee-villager-sheet.png` | `flee` (modelo `villager`) |
| AN-3 | `AN-3/gestures/gate_strike-villager-sheet.png` | `gate_strike` (modelo `villager`) |
| AN-3 | `AN-3/gestures/play-villager-sheet.png` | `play` (modelo `villager`) |
| AN-3 | `AN-3/gestures/throw-villager-sheet.png` | `throw` (modelo `villager`) |

- Cada hoja de clip va con su `<clip>-villager.json` (`clip`, `model`,
  `duration`, `errors`, `samples`) y su `<clip>-bench.html` en la misma carpeta.
  Las hojas de `AN-0/animals/` son copias byte a byte de las que
  `animal-gestures-bench.mjs` escribe en `artifacts/graphics/animal-gestures/`,
  y sus filas son las etiquetas de la propia hoja.

## Cómo se rueda una toma más

Se empaqueta el juego con `npx tsx tools/graphics/bundle-game.ts` y se lanza el
observatorio contra ese empaquetado, con Chromium explícito y con la forma de
comando que usan las tomas de arriba:

```
export VALLEY_CHROMIUM=/opt/pw-browsers/chromium
node tools/graphics/observe-life.mjs --seed N --year N --lead 20 --seconds S --fps F --viewport 390x844 [--follow ID | --look X,Z] [--zoom 0.18] --out <carpeta>
```

Los fotogramas son `S × F + 1`, y el observatorio exige `--fps` divisor de 30 y
`--lead` entre 0 y 120. Las cadencias usadas son 15 fps (seguimiento y cámara
fija cercana), 2 fps (planos generales) y 10 fps (asalto, oso y caza). Para el
«antes» se añade `--page artifacts/graphics/AN-1/game-before/valley.html`; el
asalto es `--raid 12 --assault`, el oso `--happening bear_in_the_wood` (con
`--lead 40`) y la caza `--hunt`; la lectura estrecha se rueda con
`--viewport 320x568`. La herramienta se niega a escribir sobre una carpeta que
ya tiene `trace.json` («La toma ya existe; usa otra carpeta --out.»), así que
para repetir una toma se borra antes su carpeta. Las hojas de gestos se hacen
con
`node tools/graphics/gesture-sheet.mjs <clip> --model villager --frames 12 --out artifacts/graphics/AN-<n>/gestures`,
y las de especie con
`node tools/graphics/animal-gestures-bench.mjs --kind <especie> --actions <clips> --frame <encuadre>`.

## Carpetas incompletas

Estado al generar este índice (29 sep 2026, 12:44 UTC). Una carpeta está
incompleta si no tiene `trace.json`.

- `AN-3/hunt-seed11-y21/`, `AN-3/hunt-seed7-y30/` y `AN-3/hunt-seed5-y21/` — a
  las tres les faltan `trace.json`, `summary.json`, `index.html`, `before.png`,
  `middle.png`, `after.png`, y sus `frames/` están vacías. Las tres tomas se
  detuvieron con
  «No hay señal de caza tocable ahora: cambia semilla, año o --lead.», el error
  que lanza `observe-life.mjs` cuando `--hunt` no encuentra la señal de caza
  tocable al acabar el `lead`. Comandos con los que se lanzaron:

  - `node tools/graphics/observe-life.mjs --seed 11 --year 21 --hunt --lead 20 --seconds 10 --fps 10 --viewport 390x844 --out artifacts/graphics/AN-3/hunt-seed11-y21`
  - `node tools/graphics/observe-life.mjs --seed 7 --year 30 --hunt --lead 20 --seconds 10 --fps 10 --viewport 390x844 --out artifacts/graphics/AN-3/hunt-seed7-y30`
  - `node tools/graphics/observe-life.mjs --seed 5 --year 21 --hunt --lead 20 --seconds 12 --fps 10 --viewport 390x844 --out artifacts/graphics/AN-3/hunt-seed5-y21`

- `AN-3/assault-seed7-y60/` — le faltan `trace.json`, `summary.json`,
  `index.html`, `before.png`, `middle.png`, `after.png`, y su `frames/` está
  vacía. La toma se detuvo con `page.goto: Timeout 30000ms exceeded`: la página
  del juego no terminó de cargar en 30 s al abrir la ruta de depuración de la
  villa 7/60 (`debug=1&live=1&seed=7&year=60&season=summer&raid=24&assault=1`).
  Comando:
  `node tools/graphics/observe-life.mjs --seed 7 --year 60 --raid 24 --assault --lead 8 --seconds 26 --fps 6 --viewport 390x844 --out artifacts/graphics/AN-3/assault-seed7-y60`.

- `AN-3/hunt-seed5-y21-live/` — le faltan `trace.json`, `summary.json`,
  `index.html`, `before.png`, `middle.png`, `after.png`; su `frames/` está
  vacía. No consta el comando con que se lanzó.

- `AN-1/film/seed7-y60/` (fuera de las tablas: es de `film.mjs`, no del
  observatorio) — sólo `frames/` con 25 fotogramas; le faltan `trace.json`,
  `tira.png` e `informe.md`, que sí tiene `AN-1/film/seed11-y21/`. La rodó
  `node tools/graphics/film.mjs --seed 7 --year 60 --seconds 10 --fps 6 --out artifacts/graphics/AN-1/film/seed7-y60`
  y se abortó.
