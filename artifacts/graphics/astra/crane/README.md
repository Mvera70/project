# crane · candidato del Bloque 6

Grulla planeando: cuello extendido, patas hacia atrás, alas anchas y puntas negras. Alas de doble cara.

- Dimensiones (ancho × alto × fondo): **0.6667 × 0.0683 × 0.5236 celdas**; una celda = 3 m.
- **88/150 triángulos**, 3 mallas, 3 primitivas de dibujo, un material con COLOR_0 de la paleta; sin texturas.
- GLB: +Y arriba, +Z delante; origen en el suelo para fauna posada y datum del cuerpo para fauna en vuelo. Receta en metros y vértices relativos al pivote. Grulla y mariposa: alas planas de doble cara.
- Mallas y orígenes (metros, XYZ): `bird_body`: [0, 0, 0]; `bird_wing_l`: [-0.09, 0.17, 0.1]; `bird_wing_r`: [0.09, 0.17, 0.1].
- Alas: giro sobre Z local del GLB (−Y de Blender). Ala izquierda en −X: subida −55°, derecha +55°. Pivotes verificados tras exportar e importar.
- `sheet.png`: fila superior, tres cuartos desde arriba / frente / perfil del candidato; fila inferior, mismas vistas junto al `villager.glb` y `house.glb` publicados, todos a la misma escala. Las seis capturas sueltas acompañan la hoja.
- Reconstrucción desde raíz: `blender --background --python art/recipes/stork-candidate/build.py -- crane`. Fuente: `art/recipes/crane-candidate/crane.json`. El adaptador explícito compartido vive en stork-candidate; el pipeline de primitivas no admite estas alas.
- `poses.png`: reposo / articulación intermedia / articulación extrema, sobre el GLB reimportado.
- Verificado: presupuesto desde índices del GLB, número de mallas y primitivas, COLOR_0, ausencia de texturas y pivotes exportados.



Pendiente: integración por Sol 6, captura real desde cámara de reposo y medida de coste en móvil. No se incluyen clips ni aprobación de integración. El nido necesita confirmar anclaje al tejado; candidato plausible: cumbrera trasera de capilla (receta Chapel_Ridge), posición local GLB aproximada (1, 1.62, -1.5), lejos de cruz/campana; aplicar transformaciones del grupo de world/buildings.ts. Es propuesta geométrica sin aprobación de integración; los otros candidatos usan sus emisores existentes.
