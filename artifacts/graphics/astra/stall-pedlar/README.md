# stall-pedlar · candidato Astra

- Medida real X × alto × fondo: 2.280 × 2.079 × 1.970 m. GLB en celdas (1 celda = 3 m).
- Triángulos: 584 / 600. Caras planas, sin texturas.
- Materiales: wood = #9A744C, awning-a = #A96146, awning-b = #D3C1A0, cloth = #496E79, pot = #866044, dark = #6B4C32, sack = #D3C1A0.
- `sheet.png`: arriba izquierda tres cuartos desde arriba; arriba derecha frente (+Z); abajo izquierda perfil; abajo derecha escala con villager y house publicados, sin reescalarlos.
- Receta: `art/recipes/stall-pedlar-candidate/stall-pedlar.json`.
- Reconstrucción desde la raíz: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/hall-candidate/build.py -- stall-pedlar`.
- El adaptador reutiliza las primitivas de tools/art, aplica los giros de cubos, conserva la bisagra declarada y esculpe las variantes de peñasco declaradas. Reimporta el GLB para las capturas. No requiere Blender abierto.

Sin preguntas de diseño pendientes para este modelo.

Candidato de revisión; integración y publicación pendientes en otra sesión. No se han ejecutado tests ni modificado catálogo/public.
