# tool-rack

Candidato del Bloque 0. Medidas XYZ glTF: [0.3333333432674408, 0.3799999952316284, 0.0341666666790843] celdas (1 celda = 3 m). 144 triángulos; una malla `tool_rack`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/barrel-candidate/build-block0.py -- tool-rack`. Receta: `art/recipes/tool-rack-candidate/tool-rack.json`. Después: `python art/recipes/barrel-candidate/sheets-block0.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
