# stall-salter · candidato Astra

- Medida real X × alto × fondo: 1.346 × 1.112 × 1.025 m. GLB en celdas (1 celda = 3 m).
- Triángulos: 280 / 600. Caras planas, sin texturas.
- Materiales: sack = #D3C1A0, wood = #9A744C, salt = #DDE3C4.
- `sheet.png`: arriba izquierda tres cuartos desde arriba; arriba derecha frente (+Z); abajo izquierda perfil; abajo derecha escala con villager y house publicados, sin reescalarlos.
- Receta: `art/recipes/stall-salter-candidate/stall-salter.json`.
- Reconstrucción desde la raíz: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/hall-candidate/build.py -- stall-salter`.
- El adaptador reutiliza las primitivas de tools/art, aplica los giros de cubos, conserva la bisagra declarada y esculpe las variantes de peñasco declaradas. Reimporta el GLB para las capturas. No requiere Blender abierto.

La paleta no contiene blanco puro: salt usa sky (#DDE3C4), el color más claro autorizado. Pregunta para Vera: ¿aprobar ese marfil verdoso para sal o autorizar un blanco nuevo en una ronda posterior?

Candidato de revisión; integración y publicación pendientes en otra sesión. No se han ejecutado tests ni modificado catálogo/public.
