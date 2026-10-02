# stone-wall

Candidato del Bloque 0. Medidas XYZ glTF: [0.9997233748435974, 0.11999999731779099, 0.10935650020837784] celdas (1 celda = 3 m). 96 triángulos; una malla `stone_wall`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- stone-wall`. Receta: `art/recipes/stone-wall-candidate/stone-wall.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
