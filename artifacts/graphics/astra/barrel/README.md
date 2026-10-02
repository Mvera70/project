# barrel

Candidato del Bloque 0. Medidas XYZ glTF: [0.21199999749660492, 0.23999999463558197, 0.21199999749660492] celdas (1 celda = 3 m). 140 triángulos; una malla `barrel`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- barrel`. Receta: `art/recipes/barrel-candidate/barrel.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.

Variantes: `barrel-small.glb` (×0,8), `barrel-large.glb` (×1,2). Son la misma geometría escalada; se recomienda usar sólo el GLB base y escala por instancia.
