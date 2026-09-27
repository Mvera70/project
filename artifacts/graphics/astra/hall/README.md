# hall · candidato Astra

- Medida real X × alto × fondo: 9.000 × 5.768 × 8.884 m. GLB en celdas (1 celda = 3 m).
- Triángulos: 1328 / 1500. Caras planas, sin texturas.
- Materiales: stone = #9B958A, plaster = #E2CC9B, wood = #6B4C32, roof = #C7984A, door = #9A744C, window = #6B4C32.
- `sheet.png`: arriba izquierda tres cuartos desde arriba; arriba derecha frente (+Z); abajo izquierda perfil; abajo derecha escala con villager y house publicados, sin reescalarlos.
- Receta: `art/recipes/hall-candidate/hall.json`.
- Reconstrucción desde la raíz: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python art/recipes/hall-candidate/build.py -- hall`.
- El adaptador reutiliza las primitivas de tools/art, aplica los giros de cubos, conserva la bisagra declarada y esculpe las variantes de peñasco declaradas. Reimporta el GLB para las capturas. No requiere Blender abierto.

Revisión medieval solicitada por Vera: paja de espesor visible e hiladas solapadas, cerchas y entramado de madera oscura, porche carpintero con capiteles/riostras/dintel, acceso escalonado y puerta de dos hojas. Mástil retirado según pieza opcional de §8.3. Paredes 2,8 m, cumbrera 5,63 m (remates sajones 5,78 m); parcela 9×9 m. Se usa timberDark de la paleta para contrastar la carpintería. Las dos hojas forman hall_door con pivote en la bisagra izquierda, como contrato actual. Presupuesto ampliado al máximo 1500 autorizado en el encargo reciente para la carpintería y las hiladas. Sin preguntas pendientes.

Candidato de revisión; integración y publicación pendientes en otra sesión. No se han ejecutado tests ni modificado catálogo/public.
