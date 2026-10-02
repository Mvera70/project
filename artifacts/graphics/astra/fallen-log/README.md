# fallen-log

Candidato del Bloque 0. Medidas XYZ glTF: [0.4259999990463257, 0.1597444862127304, 0.14574094861745834] celdas (1 celda = 3 m). 92 triángulos; una malla `fallen_log`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- fallen-log`. Receta: `art/recipes/fallen-log-candidate/fallen-log.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
