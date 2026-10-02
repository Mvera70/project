# tailor

Candidato del Bloque 2. Medidas XYZ glTF: [2.0, 1.4583333730697632, 1.996666669845581] celdas (1 celda = 3 m). 960 triángulos; una malla `tailor`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/tailor-candidate/build-block2.py -- tailor`. Receta: `art/recipes/tailor-candidate/tailor.json`. Después: `python art/recipes/tailor-candidate/sheets-block2.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
