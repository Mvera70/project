# log-seat · candidato del Bloque 7

Tronco horizontal de corte claro y corteza oscura, para sentarse junto a la hoguera.

- Dimensiones (ancho × alto × fondo): **0.4333 × 0.1500 × 0.1500 celdas**; una celda = 3 m.
- **28/100 triángulos**, 1 mallas y primitivas. Un material con COLOR_0 de la paleta; sin texturas.
- Ejes: +Y arriba, frente +Z para objetos, **−X para horse** como la mula. Origen en suelo. Receta en metros; GLB en celdas.
- Mallas/pivotes o huesos (XYZ en metros): `log_seat`: [0, 0, 0].
- Contratos geométricos: `{"seatHeightMetres": 0.45, "seatConnector": [0, 0.45, 0]}`.
- `sheet.png`: tres cuartos desde arriba / frente / perfil, y las mismas vistas con villager.glb y house.glb publicados a escala real. `poses.png` en carro y portillo: 0°, 45°, 90°.
- Fuente: `art/recipes/log-seat-candidate/log-seat.json`. Reconstruir desde raíz: `blender --background --python art/recipes/cart-candidate/build.py -- log-seat`.
- Verificado desde GLB: triángulos, primitivas, COLOR_0, ausencia de texturas; pivotes de ruedas después de exportar/importar; caballo de una malla y una skin con jerarquía de mule, clips idle y walk.

Sólo modelo candidato. Pendientes integración, colisiones y rutas (observe-valley-life), ajuste de asiento/paso/enganche y coste en cámara de reposo/móvil. Las poses y clips son preview-only hasta comprobarlos en el Cast real; no se tocó motor ni código del juego.
