# market-awning

Candidato del Bloque 0. Medidas XYZ glTF: [0.8500000238418579, 0.7763332724571228, 0.5737499892711639] celdas (1 celda = 3 m). 148 triángulos; una malla `market_awning`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- market-awning`. Receta: `art/recipes/market-awning-candidate/market-awning.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
