# horse · candidato del Bloque 7

Caballo de tiro castaño, pecho ancho, cuello alto, orejas cortas, crin y cola oscuras; sin alforjas.

- Dimensiones (ancho × alto × fondo): **0.9949 × 0.8280 × 0.2780 celdas**; una celda = 3 m.
- **748/900 triángulos**, 1 mallas y primitivas. Un material con COLOR_0 de la paleta; sin texturas.
- Ejes: +Y arriba, frente +Z para objetos, **−X para horse** como la mula. Origen en suelo. Receta en metros; GLB en celdas.
- Mallas/pivotes o huesos (XYZ en metros): `body`: [0.0, 0.59, -0.0]; `neck`: [-0.7434, 1.46084, -0.0]; `head`: [-1.1091999999999997, 1.94228, -0.0]; `ear-1`: [-1.1327999999999998, 2.02488, 0.1593]; `ear1`: [-1.1327999999999998, 2.02488, -0.1593]; `foreL`: [-0.5841, 1.0148, 0.2006]; `foreLLower`: [-0.5841, 0.5074, 0.2006]; `foreLFoot`: [-0.5841, 0.07079999999999999, 0.2006]; `foreR`: [-0.5841, 1.0148, -0.2006]; `foreRLower`: [-0.5841, 0.5074, -0.2006]; `foreRFoot`: [-0.5841, 0.07079999999999999, -0.2006]; `hindL`: [0.6018, 1.0148, 0.2006]; `hindLLower`: [0.6018, 0.5074, 0.2006]; `hindLFoot`: [0.6018, 0.07079999999999999, 0.2006]; `hindR`: [0.6018, 1.0148, -0.2006]; `hindRLower`: [0.6018, 0.5074, -0.2006]; `hindRFoot`: [0.6018, 0.07079999999999999, -0.2006]; `tail`: [0.8318999999999999, 1.5104, -0.0].
- Contratos geométricos: `{"forward": "-X", "sourceSkeleton": "art/recipes/mule/mule.json", "boneHierarchy": "Idéntica a mule; proporciones del caballo, cabeza y orejas elevadas.", "fps": 24, "walkStrideCells": 0.28319999999999995, "hitchMetres": [-0.826, 1.1092, 0], "shaftClearanceMetres": 0.86, "mobileStatus": "preview-only"}`.
- `sheet.png`: tres cuartos desde arriba / frente / perfil, y las mismas vistas con villager.glb y house.glb publicados a escala real. `poses.png` en carro y portillo: 0°, 45°, 90°.
- Fuente: `art/recipes/horse-candidate/horse.json`. Reconstruir desde raíz: `blender --background --python art/recipes/cart-candidate/build.py -- horse`.
- Verificado desde GLB: triángulos, primitivas, COLOR_0, ausencia de texturas; pivotes de ruedas después de exportar/importar; caballo de una malla y una skin con jerarquía de mule, clips idle y walk.

Sólo modelo candidato. Pendientes integración, colisiones y rutas (observe-valley-life), ajuste de asiento/paso/enganche y coste en cámara de reposo/móvil. Las poses y clips son preview-only hasta comprobarlos en el Cast real; no se tocó motor ni código del juego.

## Comparación de estilo y locomoción

`comparison.png`: caballo candidato / mule.glb publicado / deer.glb publicado, columnas de izquierda a derecha; arriba tres cuartos y abajo perfil. Misma cámara ortográfica (1,45 celdas), luz y escala real. La mula publicada lleva su equipo de carga. `comparison-before.png` conserva el primer candidato de 536 triángulos.

La revisión sube a 748 triángulos: tronco continuo, cuello y hocico con transiciones, cañas hexagonales y cascos biselados. El facetado se acerca a la fauna publicada y la silueta distingue caballo de tiro de mula; se mantiene el límite de 900. El mayor tamaño es intencional: caballo de tiro frente a mula carguera. No había caballo publicado para comparar.

`walk-poses.png` muestra cuatro fases desde el GLB. `animation-metrics.json` prueba idle/walk mediante Three.AnimationMixer: cuatro pies móviles, elevación aproximada 0,061 celdas, zancada declarada 0,2832 celdas. Son clips heredados y adaptados de la receta mule; queda validar sincronización de avance y suelo en Cast real.

`assembly.png` y `assembly-metrics.json` muestran carro y caballo con sus escalas reales. Caballo girado −90° en Y y raíz Z=0,5 celdas; varas a 1,08 m, enganche a 1,1092 m. Quedan aproximadamente 11 cm de holgura lateral total. Las dos correas cortas entre collar y varas y su comportamiento dinámico corresponden a integración futura. Reconstruir comparativas con `blender --background --python art/recipes/horse-candidate/compare.py`; montaje y paso con `preview.py`; validar animación con `node art/recipes/horse-candidate/validate.mjs`.
