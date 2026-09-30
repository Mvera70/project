# El bucle de la villa: un fotograma lento se toma por una ausencia (29 sep 2026)

**Qué es.** Abierta la villa de la semilla 7 en el año 60, el juego se queda
**para siempre** en fotogramas de casi cuatro segundos: la capa de vida se
rehace entera en cada `paint` y no llega a dar ni un paso. Es la **causa
probable de la tablet a 0 fps** que Vera vio ese mismo día («0 fps con
fotogramas de dos segundos, año 60»,
`docs/medidas/rendimiento-piel-v9-2026-09-29.md`).

**Estado: la primera mitad, arreglada el 30 sep 2026 (v5.26, GV-4a):** el hueco
que decide la ausencia es el ocioso, desde que acabó el pintado anterior
(`clock.painted`). Medido igual que abajo: de 4 595 ms por `paint` con la vida a
cero a 142 ms con la vida andando (mediana de 80 s, primer montaje incluido).
Queda la segunda (GV-4b): el primer montaje y cada relevo de jornada siguen
costando 4–5 s, y con GV-4a solo la villa a ×16 se congela 5–7 s en cada relevo.
El remedio no es guardar rutas por plan de escena sino las **regiones
cerradas** (el 93 % de las búsquedas A* finas fallan y son el 99 % del relevo;
prototipo en `claude/gv-4b-regiones-cerradas`, 7/60 de 3,2 s a 0,15–0,22 s):
`docs/medidas/revision-rendimiento-2026-09-30.md` §3, en la rama `claude/revision-rendimiento-2026-09-30` sin fusionar. Lo que sigue es el diagnóstico tal como se escribió. Salió midiendo la ronda GV
(`docs/encargos/profundidad-visual-movil-2026-09-29.md`), que no podía tocar
estos ficheros. La fila es **GV-4** en `docs/plan-meta.md`, propuesta como P1;
el orden es del dueño.

---

## 1 · Lo que se ve

Medido en el contenedor de los agentes (Chromium 141 con SwiftShader, cuatro
núcleos), por la portada y con el perfil de un teléfono. **Antes y después de
GV es lo mismo**: no lo trajo esa ronda.

| | Aldea 11/21 | Villa 7/60 |
|---|---|---|
| `paint` (mediana) | 20–22 ms | **3 600–3 950 ms** |
| Dibujo (`render`) | 7 ms | 10–13 ms |
| Vida (`lifeMs`, `lifeSteps`) | 3,6 ms, 3 pasos | **0 ms, 0 pasos** |
| Fotogramas en 40 s | 53–56 | 9–10 |

Y durante un minuto entero, la cabecera sigue en «Year 60 · Spring, day 1» y
`__valleyLife().steps` sigue en 0: la jornada no avanza ni un paso.

**No lo causan los ganchos de toma**: sin sujetar el cielo, la hora ni la
escala (`NOHOLD=1`), 3 794 ms por `paint` y el mismo reparto.

## 2 · Dónde se va el tiempo

Perfil de CPU con CDP sobre el juego sin minificar
(`bundle-game.ts --no-minify`), villa 7/60, 25 s:

| Inclusivo | Función |
|---|---|
| 83–87 % | `createVillage` |
| 81–85 % | `pathTo` → `finePathTo` (A*) |
| 75–78 % | `placesOf` |
| 46–48 % | `commons` → `shoreOf` |
| 50–53 % | `clearBetween` (y `penetration`, 34–35 % propio) |
| 18–20 % | `createBeasts` → `fordDrinkOf` |
| 0,3 % | `WebGLRenderer.render` |

Es la capa de vida construyéndose: las rutas del común, la orilla y el vado de
las bestias, con A* fino, **una vez por fotograma**.

## 3 · Por qué se repite

Tres piezas que, cada una por su lado, son correctas:

1. **`presentation-clock.ts`, línea 202**: `suspended = input.hidden || gapSeconds > SUSPEND_GAP_SECONDS`,
   con `SUSPEND_GAP_SECONDS = 1` (línea 75). Un hueco de más de un segundo
   entre fotogramas se toma por una ausencia —la pestaña escondida—, y el
   fotograma sale `discontinuity`. El comentario lo justifica así: «un segundo
   está muy por encima de cualquier fotograma que un aparato pueda dar».
2. **`renderer.ts`**: una discontinuidad llama a `scenic.reset()`; el estado de
   la jornada (`scenic-state.ts`) se congela de nuevo y es **otro objeto**, y la
   condición de la línea 2087 —`lifeState !== shown`— rehace la capa de vida
   con `createVillage`.
3. **En la villa, `createVillage` tarda más de un segundo.** Aquí, 3,8 s; en
   un portátil con GPU, por debajo del segundo (por eso la medida del portátil
   no lo vio); en la tablet, por encima.

Y el tercer punto dispara el primero: el fotograma que rehízo la vida deja un
hueco de más de un segundo, el siguiente es «ausencia», vuelve a rehacer la
vida… **y no sale nunca.** Mientras tanto `running` es falso (una ausencia
congela el paso), así que la vida no avanza aunque se rehaga.

**La aldea no entra** porque su `createVillage` cabe en el segundo. Cualquier
valle cuya vida tarde más de un segundo en montarse en ese aparato entra.

## 4 · Comprobado

El mismo `main` con **`SUSPEND_GAP_SECONDS = 30`**, sin otro cambio:

| Segundo | `paint` | Pasos de vida |
|---|---|---|
| 8 | 5 685 ms (el primer montaje) | 0 |
| 11 | 78 ms | 9 |
| 14 | 42 ms | 18 |
| 20 | 24 ms | 45 |
| 29 | 18 ms | 90 |
| 41 | 72 ms | 150 |

Se recupera en cuanto pasa el primer montaje: **de 3,8 s a 18–78 ms**, con la
vida dando tres pasos por fotograma. Subir el umbral no es el arreglo —una
tablet muy lenta volvería a cruzarlo—, pero confirma la causa.

## 5 · Cómo reproducirlo

```bash
npx tsx tools/graphics/bundle-game.ts --out artifacts/graphics/bucle
node tools/graphics/performance/gl-probe.mjs artifacts/graphics/bucle/valley.html \
  --seed 7 --year 60 --touch --scale 0.25 --seconds 40
# → "paintMs" ≈ 3 800, "lifeMs": 0 en la villa; con --seed 11 --year 21, ≈ 20 y ≈ 3,6
```

En el aparato, el panel de taller lo dice igual: `paint` enorme y la vida en
cero pasos.

## 6 · El arreglo que se propone (no hecho)

1. **Que el hueco que cuenta como ausencia descuente el trabajo del propio
   fotograma.** El bucle (`src/ui/backend.ts`, línea 427) le da al reloj
   `realMs: performance.now()` **antes** de pintar, así que el hueco incluye el
   `paint` anterior entero. Si le pasa también cuánto tardó ese `paint` (o si
   el reloj mide el hueco desde que terminó el fotograma anterior), un
   fotograma lento deja de parecer una pestaña escondida. `input.hidden` sigue
   cubriendo la ausencia de verdad.
2. **Abaratar `createVillage`**: las rutas del común, la orilla y el vado
   dependen del plan de escena, no de la jornada; guardarlas por plan quita la
   mayor parte del coste de cada amanecer, que es donde también se paga.
3. **La prueba**, de propiedad y no de implementación: en
   `tests/fast/graphics-clock.test.ts`, que una secuencia de fotogramas con uno
   de 1,5 s de trabajo no encadena discontinuidades (sólo la de verdad, con la
   pestaña oculta, lo es; ya hay una prueba para ese caso, «la pestaña oculta
   suspende, y volver es discontinuo»). Y una medida en la villa 7/60: tras el
   primer montaje, la vida da pasos.

Ficheros que tocaría: `src/render3d/presentation-clock.ts`,
`src/ui/backend.ts`, la capa de vida (`src/render3d/life/village.ts`, que es
`createVillage`, y `life/offers.ts`, que es `placesOf`) y sus pruebas. No
cambia el motor ni los guardados.
