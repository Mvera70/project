# stone-house · candidato de vivienda

2 oct 2026. 734 triángulos / 1200; 5 mallas y materiales, sin texturas, facetas planas.

- Caja X × alto × fondo: 5.980 × 3.898 × 4.280 m. Parcela 6×6 m = 2×2 celdas, mismo origen y orientación que el publicado.
- Puerta `stone-house_door`, pivote de bisagra en [2.475, 0.25, 0] m (Blender). Las piezas de puerta conservan medidas y posiciones. Tres superficies window asimétricas cambian de tamaño y posición según referencia; sus coordenadas viven en la receta.
- Paleta: stone #9B958A, roof #C7984A, wood #9A744C, window #6B4C32, door #9A744C.
- En los modelos de piedra, la mampostería usa juntas retranqueadas, hiladas alternadas y biseles de 2,5–3,5 cm; conserva el material stone. Se eliminan sólo caras enteras estrictamente enterradas en otro sólido. Puerta y huecos oscuros excluidos de esa simplificación.
- `sheet.png`: tres cuartos y frente arriba, perfil abajo izquierda, comparación sin reescalar con aldeano, house y stone-house publicados abajo derecha (candidato a la izquierda).
- Fuente única de diseño: `art/recipes/house-variant-candidate/design.mjs`; receta generada `stone-house.json`. Ejecutar `node art/recipes/house-variant-candidate/design.mjs` y Blender con `--background --python art/recipes/house-variant-candidate/build-candidates.py`.

Sin preguntas pendientes. Evidencia de GLB y renders de revisión; integración, emisión nocturna y estaciones quedan para la sesión principal. No se ha publicado ni ejecutado tests.

## Referencia arquitectónica

Hangleton flint cottage — https://www.wealddown.co.uk/buildings/medieval-building-hangleton/

Muros bajos de mampostería, planta rectangular humilde, huecos pequeños y paja de alero grueso. Piedra facetada sustituye el detalle del sílex. La fuente declara conjetural todo lo situado sobre aleros; la cubierta sigue la reconstrucción del museo, sin presentarla como certeza medieval.

Foto examinada: https://www.wealddown.co.uk/wp-content/uploads/2020/12/Hangleton-cottage.jpg

El ID histórico se conserva por compatibilidad. Modelo original del proyecto basado en rasgos documentados; no replica a escala el edificio completo.
