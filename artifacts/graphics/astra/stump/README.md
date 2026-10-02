# stump

Candidato del Bloque 0. Medidas XYZ glTF: [0.23254214227199554, 0.13116666674613953, 0.23399849981069565] celdas (1 celda = 3 m). 84 triángulos; una malla `stump`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- stump`. Receta: `art/recipes/stump-candidate/stump.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
