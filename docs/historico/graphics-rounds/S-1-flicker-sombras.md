# S-1 · Parpadeo de sombras diurnas (22 sep 2026)

**Estado:** abierto. Vera confirma que el parpadeo sigue viéndose fatal en toda la escena. La corrección local de tejados y copas reduce artefactos concretos, pero no resuelve el defecto global y no se acepta como solución de S-1.

## Reproducción

- App real en Edge, modo de desarrollo, semilla 11/año 21, cielo despejado, cámara fija y ×1. Se tomaron 16 fotogramas separados aproximadamente 0,18 s con zoom hacia la cubierta y el bosque. Control con `preview-phase=0.35`: la sombra queda inmóvil. A ×16 la vuelta del sol sigue siendo mucho más rápida; es una cuestión distinta del parpadeo de contornos.
- En la cubierta cercana se ven bandas que aparecen y se desplazan entre listones, aun cuando la geometría no se mueve. En las copas ocurre el mismo fenómeno a menor escala. Ambas familias tenían `castShadow` y `receiveShadow` activos sobre muchas caras pequeñas.
- [Secuencias y comparación animada](../../../artifacts/graphics/shadow-diagnosis-2026-09-22/before-after.gif). Los manifiestos de cada toma conservan fases y errores de consola (cero en estas capturas).

## Pruebas discriminantes

Mediana del cambio rápido en escala de grises entre fotogramas consecutivos, tras sustraer un desenfoque de 3 px. Misma zona de pantalla y encuadre; es un indicador temporal local, **no** una puntuación perceptiva ni una medida de GPU.

| Variante | Cubierta | Copa |
|---|---:|---:|
| Original, 1024 px, sesgo −0,0002 | 2,757 | 0,905 |
| Sin recibir sombra en cubiertas y hojas | **0,478** | **0,345** |

La primera baja un 83 % y la segunda un 62 %, pero la aceptación en movimiento demuestra que esa medida local no representa el problema global. Se probaron también: VSM 1024 (peor), mapa 2048 (lo reduce, pero no lo arregla), mapa 4096 como diagnóstico (mejora adicional pequeña), sesgo global −0,0005 y −0,001, `normalBias=0,08`, y recepción sólo en suelo. El sesgo fuerte desplaza o elimina sombras legítimas; dejar sólo el suelo como receptor aplana demasiado árboles y edificios. Se conserva 2048 como mejora parcial solicitada por Vera; S-1 sigue abierta.

Comparación rápida 1024/2048, cielo diurno despejado, caché caliente, una toma de 5 s: ambas dieron p50 13,9 ms, p95 14 ms y p99 20,9 ms. Es una comprobación corta, suficiente para descartar una regresión grande en este equipo, no una nueva línea base de rendimiento ni una medición de GPU.

## Cambio conservado

- Los tejados de GLB identificados por el mismo nombre de material `roof` que usa la nieve, y el tejado provisional, siguen **proyectando** sombra, pero dejan de **recibirla** sobre sus listones.
- Las mallas de follaje `leaf` siguen proyectando sombra al suelo y los troncos, pero no reciben auto-sombra de las copas. Suelo, troncos, paredes y murallas mantienen la recepción actual. No se alteran sol, reloj, clima, calidad global ni resolución del mapa de sombras.

Typecheck, ESLint focal, `git diff --check` y 47 pruebas de `graphics-world.test.ts` pasan. Se revisó además la villa amurallada semilla 7/año 60 a fase 0,7. **Veredicto de Vera:** el flicker global continúa y se aprecia en el GIF; las capturas estáticas no sirven para juzgarlo. S-1 permanece abierta y la demo por edades sigue pausada.
