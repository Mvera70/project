# cart · candidato del Bloque 7

Carro de dos ruedas de ocho radios, caja de madera y varas de tiro; origen en el suelo.

- Dimensiones (ancho × alto × fondo): **0.5767 × 0.4300 × 1.1833 celdas**; una celda = 3 m.
- **416/500 triángulos**, 3 mallas y primitivas. Un material con COLOR_0 de la paleta; sin texturas.
- Ejes: +Y arriba, frente +Z para objetos, **−X para horse** como la mula. Origen en suelo. Receta en metros; GLB en celdas.
- Mallas/pivotes o huesos (XYZ en metros): `cart_body`: [0, 0, 0]; `wheel_l`: [-0.76, 0.6, -0.35]; `wheel_r`: [0.76, 0.6, -0.35].
- Contratos geométricos: `{"wheelAxis": "X", "wheelRadiusMetres": 0.6, "shaftInnerWidthMetres": 0.945, "shaftTipMetres": [0, 1.08, 2.32], "hitchMetres": [0, 1.08, 2.32], "bedHeightMetres": 0.825, "axleMetres": [0, 0.6, -0.35]}`.
- `sheet.png`: tres cuartos desde arriba / frente / perfil, y las mismas vistas con villager.glb y house.glb publicados a escala real. `poses.png` en carro y portillo: 0°, 45°, 90°.
- Fuente: `art/recipes/cart-candidate/cart.json`. Reconstruir desde raíz: `blender --background --python art/recipes/cart-candidate/build.py -- cart`.
- Verificado desde GLB: triángulos, primitivas, COLOR_0, ausencia de texturas; pivotes de ruedas después de exportar/importar; caballo de una malla y una skin con jerarquía de mule, clips idle y walk.

Sólo modelo candidato. Pendientes integración, colisiones y rutas (observe-valley-life), ajuste de asiento/paso/enganche y coste en cámara de reposo/móvil. Las poses y clips son preview-only hasta comprobarlos en el Cast real; no se tocó motor ni código del juego.
