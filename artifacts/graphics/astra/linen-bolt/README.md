# linen-bolt

Candidato del Bloque 2. Medidas XYZ glTF: [0.23116666823625565, 0.1066666767001152, 0.1666666716337204] celdas (1 celda = 3 m). 60 triángulos; una malla `linen_bolt`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/tailor-candidate/build-block2.py -- linen-bolt`. Receta: `art/recipes/linen-bolt-candidate/linen-bolt.json`. Después: `python art/recipes/tailor-candidate/sheets-block2.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
