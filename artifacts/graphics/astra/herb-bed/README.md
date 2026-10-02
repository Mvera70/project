# herb-bed

Candidato del Bloque 0. Medidas XYZ glTF: [0.3283333480358124, 0.12999999523162842, 0.22333334386348724] celdas (1 celda = 3 m). 116 triángulos; una malla `herb_bed`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- herb-bed`. Receta: `art/recipes/herb-bed-candidate/herb-bed.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
