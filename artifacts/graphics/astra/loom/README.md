# loom

Candidato del Bloque 2. Medidas XYZ glTF: [0.5766666829586029, 0.534166693687439, 0.46666665375232697] celdas (1 celda = 3 m). 328 triángulos; una malla `loom`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/tailor-candidate/build-block2.py -- loom`. Receta: `art/recipes/loom-candidate/loom.json`. Después: `python art/recipes/tailor-candidate/sheets-block2.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
