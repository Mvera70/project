# cairn · candidato Astra

- Medida real X × alto × fondo: 1.500 × 2.100 × 1.200 m. GLB en celdas (1 celda = 3 m).
- Triángulos: 144 / 200. Caras planas, sin texturas.
- Materiales: stone = #9B958A.
- `sheet.png`: arriba izquierda tres cuartos desde arriba; arriba derecha frente (+Z); abajo izquierda perfil; abajo derecha escala con villager y house publicados, sin reescalarlos.
- Receta: `art/recipes/cairn-candidate/cairn.json`.
- Reconstrucción desde la raíz: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/hall-candidate/build.py -- cairn`.
- El adaptador reutiliza las primitivas de tools/art, aplica los giros de cubos, conserva la bisagra declarada y esculpe las variantes de peñasco declaradas. Reimporta el GLB para las capturas. No requiere Blender abierto.

Cuatro piedras, altura exacta 2,1 m (0,7 celdas).

Candidato de revisión; integración y publicación pendientes en otra sesión. No se han ejecutado tests ni modificado catálogo/public.
