# stall-factor · candidato Astra

- Medida real X × alto × fondo: 2.061 × 1.458 × 0.873 m. GLB en celdas (1 celda = 3 m).
- Triángulos: 480 / 600. Caras planas, sin texturas.
- Materiales: wood = #9A744C, paper = #D3C1A0, dark = #6B4C32, metal = #9B958A, sack = #C4A16B.
- `sheet.png`: arriba izquierda tres cuartos desde arriba; arriba derecha frente (+Z); abajo izquierda perfil; abajo derecha escala con villager y house publicados, sin reescalarlos.
- Receta: `art/recipes/stall-factor-candidate/stall-factor.json`.
- Reconstrucción desde la raíz: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/hall-candidate/build.py -- stall-factor`.
- El adaptador reutiliza las primitivas de tools/art, aplica los giros de cubos, conserva la bisagra declarada y esculpe las variantes de peñasco declaradas. Reimporta el GLB para las capturas. No requiere Blender abierto.

Sin preguntas de diseño pendientes para este modelo.

Candidato de revisión; integración y publicación pendientes en otra sesión. No se han ejecutado tests ni modificado catálogo/public.
