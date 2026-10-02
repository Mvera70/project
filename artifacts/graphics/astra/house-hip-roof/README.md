# house-hip-roof · candidato de vivienda

2 oct 2026. 506 triángulos / 900; 6 mallas y materiales, sin texturas, facetas planas.

- Caja X × alto × fondo: 6.000 × 4.398 × 4.440 m. Parcela 6×6 m = 2×2 celdas, mismo origen y orientación que el publicado.
- Puerta `house-hip-roof_door`, pivote de bisagra en [2.5, 0.28, 0] m (Blender). Las piezas de puerta conservan medidas y posiciones. Tres superficies window asimétricas cambian de tamaño y posición según referencia; sus coordenadas viven en la receta.
- Paleta: plaster #E2CC9B, roof #C7984A, wood #9A744C, stone #9B958A, window #6B4C32, door #9A744C.
- En los modelos de piedra, la mampostería usa juntas retranqueadas, hiladas alternadas y biseles de 2,5–3,5 cm; conserva el material stone. Se eliminan sólo caras enteras estrictamente enterradas en otro sólido. Puerta y huecos oscuros excluidos de esa simplificación.
- `sheet.png`: tres cuartos y frente arriba, perfil abajo izquierda, comparación sin reescalar con aldeano, house y stone-house publicados abajo derecha (candidato a la izquierda).
- Fuente única de diseño: `art/recipes/house-variant-candidate/design.mjs`; receta generada `house-hip-roof.json`. Ejecutar `node art/recipes/house-variant-candidate/design.mjs` y Blender con `--background --python art/recipes/house-variant-candidate/build-candidates.py`.

Sin preguntas pendientes. Evidencia de GLB y renders de revisión; integración, emisión nocturna y estaciones quedan para la sesión principal. No se ha publicado ni ejecutado tests.

## Referencia arquitectónica

Hall from Boarhunt — https://www.wealddown.co.uk/buildings/hall-house-boarhunt/

Hall bajo alargado, crujías de entramado, paja con espesor y cadera en un extremo. Se omiten las cerchas cruck interiores y se reduce la longitud. Museo: extremo perdido y parte de los huecos son reconstrucción conjetural; esta versión es una adaptación visual, no una restitución.

Foto examinada: https://www.wealddown.co.uk/wp-content/uploads/2020/12/52-Hall-from-Boarhunt-v2-scaled.jpg

El ID histórico se conserva por compatibilidad. Modelo original del proyecto basado en rasgos documentados; no replica a escala el edificio completo.
