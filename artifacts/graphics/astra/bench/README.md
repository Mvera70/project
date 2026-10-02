# bench · candidato del Bloque 7

Banco de dos tablas con respaldo, dos patas anchas y travesaño.

- Dimensiones (ancho × alto × fondo): **0.5500 × 0.3267 × 0.1542 celdas**; una celda = 3 m.
- **96/100 triángulos**, 1 mallas y primitivas. Un material con COLOR_0 de la paleta; sin texturas.
- Ejes: +Y arriba, frente +Z para objetos, **−X para horse** como la mula. Origen en suelo. Receta en metros; GLB en celdas.
- Mallas/pivotes o huesos (XYZ en metros): `bench`: [0, 0, 0].
- Contratos geométricos: `{"seatHeightMetres": 0.48, "seatWidthMetres": 1.65, "seatDepthMetres": 0.44, "seatConnector": [0, 0.48, 0.03]}`.
- `sheet.png`: tres cuartos desde arriba / frente / perfil, y las mismas vistas con villager.glb y house.glb publicados a escala real. `poses.png` en carro y portillo: 0°, 45°, 90°.
- Fuente: `art/recipes/bench-candidate/bench.json`. Reconstruir desde raíz: `blender --background --python art/recipes/cart-candidate/build.py -- bench`.
- Verificado desde GLB: triángulos, primitivas, COLOR_0, ausencia de texturas; pivotes de ruedas después de exportar/importar; caballo de una malla y una skin con jerarquía de mule, clips idle y walk.

Sólo modelo candidato. Pendientes integración, colisiones y rutas (observe-valley-life), ajuste de asiento/paso/enganche y coste en cámara de reposo/móvil. Las poses y clips son preview-only hasta comprobarlos en el Cast real; no se tocó motor ni código del juego.
