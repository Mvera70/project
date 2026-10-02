# beehive

Candidato del Bloque 0. Medidas XYZ glTF: [0.20333334803581238, 0.24166667461395264, 0.1899999976158142] celdas (1 celda = 3 m). 150 triángulos; una malla `beehive`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- beehive`. Receta: `art/recipes/beehive-candidate/beehive.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
