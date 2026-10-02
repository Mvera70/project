# flower-pot

Candidato del Bloque 0. Medidas XYZ glTF: [0.13999998569488525, 0.19500002264976501, 0.14001961797475815] celdas (1 celda = 3 m). 108 triángulos; una malla `flower_pot`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- flower-pot`. Receta: `art/recipes/flower-pot-candidate/flower-pot.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
