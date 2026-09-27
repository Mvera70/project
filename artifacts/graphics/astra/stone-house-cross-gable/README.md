# stone-house-cross-gable · candidato de vivienda

27 sep 2026. 1176 triángulos / 1200; 5 materiales, sin texturas, facetas planas.

- Caja X × alto × fondo: 6.000 × 4.688 × 6.000 m. Parcela 6×6 m = 2×2 celdas, mismo origen y orientación que el publicado.
- Puerta `stone-house-cross-gable_door`, pivote de bisagra en [2.475, 0.25, 0] m (Blender). Las tres ventanas originales, carpinterías y piezas de puerta conservan sus medidas y posiciones.
- Paleta: stone #9B958A, roof #7A382B, wood #6B4932, window #3F2B22, door #6B4932.
- En los modelos de piedra, la mampostería usa juntas retranqueadas, hiladas alternadas y biseles de 2,5–3,5 cm; conserva el material stone. Se eliminan sólo caras enteras estrictamente enterradas en otro sólido. Puerta y huecos oscuros excluidos de esa simplificación.
- `sheet.png`: tres cuartos y frente arriba, frente opuesto abajo izquierda, comparación sin reescalar con aldeano, house y stone-house publicados abajo derecha (candidato a la izquierda).
- Fuente única de diseño: `art/recipes/house-variant-candidate/design.mjs`; receta generada `stone-house-cross-gable.json`. Ejecutar `node art/recipes/house-variant-candidate/design.mjs` y Blender con `--background --python art/recipes/house-variant-candidate/build-candidates.py`.

Sin preguntas pendientes. Evidencia de GLB y renders de revisión; integración, emisión nocturna y estaciones quedan para la sesión principal. No se ha publicado ni ejecutado tests.
