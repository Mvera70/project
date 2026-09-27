# Viviendas candidatas · GLB y mampostería

27 sep 2026. Cuatro variantes y mejora de muros para stone-house, sin cambiar parcela, capacidad, puerta ni las tres ventanas originales.

| Modelo | Silueta | Triángulos GLB | Límite |
|---|---|---:|---:|
| house-twin-gable | Dos crujías y cumbreras paralelas de paja | 708 | 900 |
| house-hip-roof | Cubierta piramidal de cuatro aguas | 664 | 900 |
| stone-house-cross-gable | Hastial transversal elevado | 1176 | 1200 |
| stone-house-tower-loft | Altillo lateral con cubierta propia | 1198 | 1200 |
| stone-house | Silueta original, nuevas juntas y relieve | 1048 | 1200 |

## Reproducción

1. `node art/recipes/house-variant-candidate/design.mjs`
2. `blender --background --python art/recipes/house-variant-candidate/build-candidates.py`

El generador produce los cinco JSON de esta carpeta a partir de las recetas originales. El adaptador Blender consume también `candidateBuild`: juntas, biseles, eliminación de caras enterradas y pivote. Es necesario usar este adaptador para reproducir los GLB: el constructor genérico no aplica esa extensión. Se puede construir uno pasando `-- <id>` después del script.

Salida por modelo: `artifacts/graphics/astra/<id>/`, con `<id>.glb`, `sheet.png`, cuatro capturas individuales, `metrics.json` y `README.md`. Las hojas muestran tres cuartos, frente, frente opuesto y comparación a escala con aldeano, house y stone-house publicados. Dimensiones precisas y materiales en cada README y metrics.json.

## Geometría y contrato

Parcela 6×6 m = 2×2 celdas. Receta en metros, Blender Z arriba, exportación a escala 1/3. Se conservan origen y orientación originales. El fondo del umbral heredado alcanza −0,0025 celdas; no se altera. Las pequeñas desviaciones del límite 2,0 en los GLB son precisión de coma flotante.

La puerta es la malla `<id>_door`, con origen en la bisagra izquierda: madera `[2.5, 0.28, 0]` m; piedra `[2.475, 0.25, 0]` m, en Blender. Las piezas de puerta y las tres ventanas conservan exactamente sus primitivas, dimensiones y posiciones respecto a los modelos base. No hay ventanas nuevas. El material `window` incluye también fondos oscuros heredados: la integración no debe convertir todo ese material en emisivo.

La piedra incorpora hiladas alternadas, juntas retranqueadas y biseles de 2,5–3,5 cm. Usa el mismo material `stone`, sin texturas ni nuevos colores. Se eliminan solo polígonos enteros estrictamente contenidos en otro sólido; puertas y huecos oscuros quedan excluidos. Los pequeños puntos oscuros en cumbreras y marcos son sombras de contacto: una reconstrucción frontal de house-twin-gable conservando todas sus caras originales produjo una captura idéntica píxel a píxel.

Recuento de triángulos, nombres de puerta, pivotes y ausencia de texturas comprobados directamente en los cinco GLB. Sin preguntas de diseño pendientes. La revisión cubre recetas, GLB y capturas; integración, emisión nocturna y estaciones corresponden a la sesión principal. No se han ejecutado tests ni modificado los modelos publicados.
