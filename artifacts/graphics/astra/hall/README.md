# hall · candidato Astra

- Medida real X × alto × fondo: 9.000 × 7.500 × 8.425 m. GLB en celdas (1 celda = 3 m).
- Triángulos: 832 / 900. Caras planas, sin texturas.
- Materiales: stone = #9B958A, plaster = #E2CC9B, wood = #9A744C, roof = #C7984A, door = #9A744C, window = #6B4C32, banner = #A96146.
- `sheet.png`: arriba izquierda tres cuartos desde arriba; arriba derecha frente (+Z); abajo izquierda perfil; abajo derecha escala con villager y house publicados, sin reescalarlos.
- Receta: `art/recipes/hall-candidate/hall.json`.
- Reconstrucción desde la raíz: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/hall-candidate/build.py -- hall`.
- El adaptador reutiliza las primitivas de tools/art, aplica los giros de cubos, conserva la bisagra declarada y esculpe las variantes de peñasco declaradas. Reimporta el GLB para las capturas. No requiere Blender abierto.

Dos hojas sugeridas por junta central; hall_door es una malla única con pivote en la bisagra izquierda, según contrato actual. Cumbrera 5,6 m, remates 5,83 m y mástil 7,5 m. La puerta de 2,4 m comienza sobre el basamento de 0,4 m.

Candidato de revisión; integración y publicación pendientes en otra sesión. No se han ejecutado tests ni modificado catálogo/public.
