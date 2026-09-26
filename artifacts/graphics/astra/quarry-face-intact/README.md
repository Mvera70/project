# quarry-face-intact · candidato Astra

- Medida real X × alto × fondo: 6.069 × 2.420 × 2.810 m. GLB en celdas (1 celda = 3 m).
- Triángulos: 400 / 700. Caras planas, sin texturas.
- Materiales: stone = #9B958A, rock = #9B958A.
- `sheet.png`: arriba izquierda tres cuartos desde arriba; arriba derecha frente (+Z); abajo izquierda perfil; abajo derecha escala con villager y house publicados, sin reescalarlos.
- Receta: `art/recipes/quarry-face-intact-candidate/quarry-face-intact.json`.
- Reconstrucción desde la raíz: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/hall-candidate/build.py -- quarry-face-intact`.
- El adaptador reutiliza las primitivas de tools/art, aplica los giros de cubos, conserva la bisagra declarada y esculpe las variantes de peñasco declaradas. Reimporta el GLB para las capturas. No requiere Blender abierto.

Frente hacia +Z; cantera de 6×3 m de parcela. Los tres estados comparten origen y posición. rock usa el rol stone existente; no se añade color.

Candidato de revisión; integración y publicación pendientes en otra sesión. No se han ejecutado tests ni modificado catálogo/public.
