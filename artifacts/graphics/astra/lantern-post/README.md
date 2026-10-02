# lantern-post

Candidato del Bloque 0. Medidas XYZ glTF: [0.22750001400709152, 0.800000011920929, 0.11999999731779099] celdas (1 celda = 3 m). 80 triángulos; una malla `lantern_post`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- lantern-post`. Receta: `art/recipes/lantern-post-candidate/lantern-post.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
