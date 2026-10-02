# fence · candidato del Bloque 7

Cerca de dos varas y riostra; tramo exacto de una celda en X.

- Dimensiones (ancho × alto × fondo): **1.0000 × 0.3667 × 0.0517 celdas**; una celda = 3 m.
- **60/60 triángulos**, 1 mallas y primitivas. Un material con COLOR_0 de la paleta; sin texturas.
- Ejes: +Y arriba, frente +Z para objetos, **−X para horse** como la mula. Origen en suelo. Receta en metros; GLB en celdas.
- Mallas/pivotes o huesos (XYZ en metros): `fence`: [0, 0, 0].
- Contratos geométricos: `{"repeatMetres": 3, "blocking": "Sólo candidato; la colisión corresponde a la futura integración."}`.
- `sheet.png`: tres cuartos desde arriba / frente / perfil, y las mismas vistas con villager.glb y house.glb publicados a escala real. `poses.png` en carro y portillo: 0°, 45°, 90°.
- Fuente: `art/recipes/fence-candidate/fence.json`. Reconstruir desde raíz: `blender --background --python art/recipes/cart-candidate/build.py -- fence`.
- Verificado desde GLB: triángulos, primitivas, COLOR_0, ausencia de texturas; pivotes de ruedas después de exportar/importar; caballo de una malla y una skin con jerarquía de mule, clips idle y walk.

Sólo modelo candidato. Pendientes integración, colisiones y rutas (observe-valley-life), ajuste de asiento/paso/enganche y coste en cámara de reposo/móvil. Las poses y clips son preview-only hasta comprobarlos en el Cast real; no se tocó motor ni código del juego.
