# chicken-coop

Candidato del Bloque 0. Medidas XYZ glTF: [0.3166666626930237, 0.36666664481163025, 0.40221258997917175] celdas (1 celda = 3 m). 92 triángulos; una malla `chicken_coop`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- chicken-coop`. Receta: `art/recipes/chicken-coop-candidate/chicken-coop.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
