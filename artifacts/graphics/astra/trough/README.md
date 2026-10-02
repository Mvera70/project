# trough

Candidato del Bloque 0. Medidas XYZ glTF: [0.33500000834465027, 0.1133333295583725, 0.1550000011920929] celdas (1 celda = 3 m). 72 triángulos; una malla `trough`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- trough`. Receta: `art/recipes/trough-candidate/trough.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
