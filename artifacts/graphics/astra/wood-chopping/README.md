# wood-chopping

Candidato del Bloque 0. Medidas XYZ glTF: [0.2907879948616028, 0.3470114469528198, 0.18376031517982483] celdas (1 celda = 3 m). 96 triángulos; una malla `wood_chopping`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- wood-chopping`. Receta: `art/recipes/wood-chopping-candidate/wood-chopping.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
