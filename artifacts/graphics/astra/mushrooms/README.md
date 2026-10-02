# mushrooms

Candidato del Bloque 0. Medidas XYZ glTF: [0.18106836825609207, 0.09666666388511658, 0.18333332985639572] celdas (1 celda = 3 m). 66 triángulos; una malla `mushrooms`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- mushrooms`. Receta: `art/recipes/mushrooms-candidate/mushrooms.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
