# sack-pile

Candidato del Bloque 0. Medidas XYZ glTF: [0.3213333338499069, 0.23016667366027832, 0.15333334356546402] celdas (1 celda = 3 m). 108 triángulos; una malla `sack_pile`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- sack-pile`. Receta: `art/recipes/sack-pile-candidate/sack-pile.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.

Variantes: `sack-pile-small.glb` (×0,8), `sack-pile-large.glb` (×1,2). Son la misma geometría escalada; se recomienda usar sólo el GLB base y escala por instancia.
