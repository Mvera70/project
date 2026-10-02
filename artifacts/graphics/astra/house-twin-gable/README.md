# house-twin-gable · candidato de vivienda

2 oct 2026. 694 triángulos / 900; 6 materiales, sin texturas, facetas planas.

- Caja X × alto × fondo: 6.000 × 5.328 × 6.000 m. Parcela 6×6 m = 2×2 celdas, mismo origen y orientación que el publicado.
- Puerta `house-twin-gable_door`, pivote de bisagra en [2.5, 0.28, 0] m (Blender). Las tres ventanas originales, carpinterías y piezas de puerta conservan sus medidas y posiciones.
- Paleta: plaster #E2CC9B, roof #C7984A, wood #9A744C, stone #9B958A, window #6B4C32, door #9A744C.
- En los modelos de piedra, la mampostería usa juntas retranqueadas, hiladas alternadas y biseles de 2,5–3,5 cm; conserva el material stone. Se eliminan sólo caras enteras estrictamente enterradas en otro sólido. Puerta y huecos oscuros excluidos de esa simplificación.
- `sheet.png`: tres cuartos y frente arriba, perfil abajo izquierda, comparación sin reescalar con aldeano, house y stone-house publicados abajo derecha (candidato a la izquierda).
- Fuente única de diseño: `art/recipes/house-variant-candidate/design.mjs`; receta generada `house-twin-gable.json`. Ejecutar `node art/recipes/house-variant-candidate/design.mjs` y Blender con `--background --python art/recipes/house-variant-candidate/build-candidates.py`.

Sin preguntas pendientes. Evidencia de GLB y renders de revisión; integración, emisión nocturna y estaciones quedan para la sesión principal. No se ha publicado ni ejecutado tests.
