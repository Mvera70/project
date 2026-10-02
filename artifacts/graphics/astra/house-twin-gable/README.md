# house-twin-gable · candidato de vivienda

2 oct 2026. 884 triángulos / 900; 6 mallas y materiales, sin texturas, facetas planas.

- Caja X × alto × fondo: 6.000 × 5.308 × 5.045 m. Parcela 6×6 m = 2×2 celdas, mismo origen y orientación que el publicado.
- Puerta `house-twin-gable_door`, pivote de bisagra en [2.5, 0.28, 0] m (Blender). Las piezas de puerta conservan medidas y posiciones. Tres superficies window asimétricas cambian de tamaño y posición según referencia; sus coordenadas viven en la receta.
- Paleta: plaster #D2B98A, roof #7A382B, wood #6B4932, stone #9B958A, window #3F2B22, door #6B4932.
- En los modelos de piedra, la mampostería usa juntas retranqueadas, hiladas alternadas y biseles de 2,5–3,5 cm; conserva el material stone. Se eliminan sólo caras enteras estrictamente enterradas en otro sólido. Puerta y huecos oscuros excluidos de esa simplificación.
- `sheet.png`: tres cuartos y frente arriba, perfil abajo izquierda, comparación sin reescalar con aldeano, house y stone-house publicados abajo derecha (candidato a la izquierda).
- Fuente única de diseño: `art/recipes/house-variant-candidate/design.mjs`; receta generada `house-twin-gable.json`. Ejecutar `node art/recipes/house-variant-candidate/design.mjs` y Blender con `--background --python art/recipes/house-variant-candidate/build-candidates.py`.

Sin preguntas pendientes. Evidencia de GLB y renders de revisión; integración, emisión nocturna y estaciones quedan para la sesión principal. No se ha publicado ni ejecutado tests.

## Referencia arquitectónica

Bayleaf hall-house — https://www.wealddown.co.uk/buildings/bayleaf-farmstead-chiddingstone/

Extremos de entramado volados sobre planta baja, centro alto retraído, aleros continuos y cubierta de teja a cuatro aguas. Se comprimen seis habitaciones a tres masas en 6 m; no se reproducen planta ni arqueología interior. Los ID twin-gable se conservan por compatibilidad: ya no describen dos hastiales.

Foto examinada: https://www.wealddown.co.uk/wp-content/uploads/2020/12/Bayleaf-house-garden.jpg

El ID histórico se conserva por compatibilidad. Modelo original del proyecto basado en rasgos documentados; no replica a escala el edificio completo.
