# fence-gate · candidato del Bloque 7

Portillo de madera con riostra diagonal, cierre y hoja articulada; un tramo de cerca.

- Dimensiones (ancho × alto × fondo): **1.0000 × 0.3667 × 0.0508 celdas**; una celda = 3 m.
- **96/100 triángulos**, 2 mallas y primitivas. Un material con COLOR_0 de la paleta; sin texturas.
- Ejes: +Y arriba, frente +Z para objetos, **−X para horse** como la mula. Origen en suelo. Receta en metros; GLB en celdas.
- Mallas/pivotes o huesos (XYZ en metros): `gate_posts`: [0, 0, 0]; `gate_leaf`: [-1.28, 0, 0].
- Contratos geométricos: `{"hingeMesh": "gate_leaf", "hingeAxis": "Y", "openDegrees": 90, "clearOpeningMetres": 2.72, "repeatMetres": 3}`.
- `sheet.png`: tres cuartos desde arriba / frente / perfil, y las mismas vistas con villager.glb y house.glb publicados a escala real. `poses.png` en carro y portillo: 0°, 45°, 90°.
- Fuente: `art/recipes/fence-gate-candidate/fence-gate.json`. Reconstruir desde raíz: `blender --background --python art/recipes/cart-candidate/build.py -- fence-gate`.
- Verificado desde GLB: triángulos, primitivas, COLOR_0, ausencia de texturas; pivotes de ruedas después de exportar/importar; caballo de una malla y una skin con jerarquía de mule, clips idle y walk.

Sólo modelo candidato. Pendientes integración, colisiones y rutas (observe-valley-life), ajuste de asiento/paso/enganche y coste en cámara de reposo/móvil. Las poses y clips son preview-only hasta comprobarlos en el Cast real; no se tocó motor ni código del juego.
