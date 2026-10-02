# minecart-full · candidato del Bloque 4

La misma vagoneta con mineral en ore_load separable. Quitarlo recupera exactamente la vagoneta vacía.

- Dimensiones (ancho × alto × fondo): **0.4800 × 0.5033 × 0.5733 celdas**; una celda = 3 m.
- **280/300 triángulos**, 6 mallas y primitivas de dibujo. Un material de paleta con COLOR_0; sin texturas.
- Ejes: +Y arriba, +Z hacia salida/frente. Receta en metros; GLB en celdas; vértices relativos al pivote.
- Mallas y pivotes XYZ en metros: `cart_body`: [0, 0, 0]; `wheel_l_front`: [-0.6, 0.23, 0.5]; `wheel_l_rear`: [-0.6, 0.23, -0.5]; `wheel_r_front`: [0.6, 0.23, 0.5]; `wheel_r_rear`: [0.6, 0.23, -0.5]; `ore_load`: [0, 0.82, 0].
- Ruedas wheel_* (vagonetas): eje local X, radio 0,23 m (0,076667 celdas). Giro futuro por distancia/radio; ore_load desmontable. Los dos carros comparten exactamente geometría de cuerpo y ruedas. Las demás piezas son rígidas.
- Metadatos de contrato geométrico: `{"wheelRadiusMetres": 0.23, "wheelAxis": "X", "gaugeMetres": 1.2, "removableMesh": "ore_load"}`.
- `sheet.png`: tres cuartos desde arriba, frente, perfil; debajo, las mismas vistas con villager.glb y house.glb a escala real. `poses.png` en carros: reposo, ruedas giradas 45°, 90° con carga retirada.
- Fuente: `art/recipes/minecart-full-candidate/minecart-full.json`. Reconstruir desde raíz: `blender --background --python art/recipes/mine-mouth-candidate/build.py -- minecart-full`. El adaptador explícito compartido está en mine-mouth-candidate.
- QA conjunta: `blender --background --python art/recipes/mine-mouth-candidate/validate.py`. Produce `mine-mouth/assembly.png`, `assembly-metrics.json` y `ore-pile/states.png`; valida vía/ruedas, gálibo y que retirar ore_load recupera la vacía.
- Acopios: `ore-pile.glb` es el mayor; sus cuatro estados están en `ore-pile/state-1` a `state-4`, cada uno con GLB, hoja y métricas. `states.png` los compara de izquierda a derecha a la misma escala.
- Medido desde el GLB: triángulos, primitivas, ausencia de texturas, colores de vértice; reimportación y pivotes de ruedas con desplazamiento de periferia al girar.

Sólo modelo: la mecánica de mina todavía no existe. Pendientes integración, encaje en ladera, desaparición tras plano oscuro, descarga y medida en cámara de reposo/móvil; no se modificó motor ni código de juego.
