# Gráficos · elige por tarea

Esta carpeta reúne herramientas de distinto alcance. La [tabla completa](../README.md#graphics--el-valle-en-3d)
explica cada una; este índice sirve para escoger la entrada correcta.

## Captura del juego

| Quiero… | Entrada | Apoyo |
|---|---|---|
| Una imagen de una partida real | `shot.mjs` | `bundle-game.ts`, `serve.mjs`, `capture.ts` |
| Una secuencia con trazas de vida | `film.mjs` | `film-sheet.py`, `day-report.mjs` |
| Seguir a un aldeano igual en dos versiones (oclusión) | `follow-sequence.mjs` | `shot.mjs` para la toma suelta |
| Observar cuerpos y rutas en el navegador | `observe-life.mjs` | `evidence-index.mjs` |
| Todas las pantallas y metraje de prensa | `press-kit.mjs` | — |
| Revisar la entrada de caza | `hunt-smoke.mjs` | — |

## Modelos, animación y arte

| Quiero… | Entrada | Apoyo |
|---|---|---|
| Ver un GLB suelto | `viewer.html` | `viewer.ts` |
| Comparar todos los GLB publicados | `model-sheet.mjs` | `model-sheet.ts` |
| Publicar un recurso aprobado | `publish-assets.ts` | Receta y catálogo en `../art/` |
| Revisar fauna y gestos | `animals-preview.mjs`, `animal-gestures-bench.mjs`, `animal-gait-compare.mjs` | Sus módulos `.ts` y `animal-gait-compare-README.md` |
| Auditar clips o un gesto | `animation-audit.ts`, `gesture-sheet.mjs` | `gesture-sheet.ts` |
| Montar hojas de revisión | `contact-sheet.py`, `skin-compare.py` | — |
| Reproducir la transición de fuego G-42 | `capture-fire-transition.mjs` | `fire-transition.html`, `fire-transition.ts` |

## Rendimiento y diagnóstico

| Quiero… | Entrada | Apoyo |
|---|---|---|
| Medir la app que usa el jugador | `bench-app.ts` | — |
| Comparar escenas controladas | `benchmark.ts` | `bench.html`, `bench.ts`, `bench-scenes.ts` |
| Contar llamadas WebGL | `performance/gl-probe.mjs` | `performance/scene-report.mjs` para localizar su origen |
| Localizar recompilación de shaders | `performance/shader-churn.mjs` | — |
| Ver en qué función se va la CPU | `performance/cpu-profile.mjs` | — |
| Ver los relevos de jornada y el bucle de la villa a una velocidad | `performance/relay-probe.mjs` | `../reports/model-draws.ts` para lo que cuesta cada modelo |
| Comprobar el entorno gráfico | `doctor.ts` | — |

Los scripts de rondas cerradas G-19 y G-20 están en
[`../history/graphics/`](../history/README.md). Esta separación no cambia las
rutas de captura ni de publicación que usa el juego.
