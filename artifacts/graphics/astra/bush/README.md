# bush

Candidato del Bloque 0. Medidas XYZ glTF: [0.3316666781902313, 0.2199999988079071, 0.24185001105070114] celdas (1 celda = 3 m). 72 triángulos; una malla `bush`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- bush`. Receta: `art/recipes/bush-candidate/bush.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
