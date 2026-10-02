# field-flax-cut

Candidato del Bloque 2. Medidas XYZ glTF: [3.0, 0.31666669249534607, 2.0] celdas (1 celda = 3 m). 212 triángulos; una malla `field_flax_cut`, un material `valley_vertex`, colores por vértice de la paleta canónica, sin texturas. Origen (0,0,0) en la base; frente +Z.

Reproducción desde la raíz: `blender --background --python art/recipes/tailor-candidate/build-block2.py -- field-flax-cut`. Receta: `art/recipes/field-flax-cut-candidate/field-flax-cut.json`. Después: `python art/recipes/tailor-candidate/sheets-block2.py` para las hojas. La hoja muestra tres vistas de detalle y escala junto a `villager.glb` y `house.glb`.

Pendiente: integración y medida en el valle por dirección. El farol usa color de paleta; no emite una luz real.
