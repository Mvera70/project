# crag-1 · candidato Astra

- Medida real X × alto × fondo: 3.000 × 0.650 × 2.050 m. GLB en celdas (1 celda = 3 m).
- Triángulos: 42 / 80. Caras planas, sin texturas.
- Materiales: stone = #9B958A.
- `sheet.png`: arriba izquierda tres cuartos desde arriba; arriba derecha frente (+Z); abajo izquierda perfil; abajo derecha escala con villager y house publicados, sin reescalarlos.
- Receta: `art/recipes/crag-1-candidate/crag-1.json`.
- Reconstrucción desde la raíz: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/hall-candidate/build.py -- crag-1`.
- El adaptador reutiliza las primitivas de tools/art, aplica los giros de cubos, conserva la bisagra declarada y esculpe las variantes de peñasco declaradas. Reimporta el GLB para las capturas. No requiere Blender abierto.

Ancho exacto 3 m. Variante facetada; escala de juego prevista 0,15–1,3. La deformación determinista de facetas está declarada en candidateBuild.cragVariant.

Candidato de revisión; integración y publicación pendientes en otra sesión. No se han ejecutado tests ni modificado catálogo/public.
