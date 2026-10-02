# mine-mouth · candidato del Bloque 4

Boca rocosa derivada de bear-den a ×1,32, entibado de dos postes y dintel, riostras, galería oscura y raíles de salida.

- Dimensiones (ancho × alto × fondo): **3.3061 × 2.2616 × 2.8893 celdas**; una celda = 3 m.
- **544/1200 triángulos**, 1 mallas y primitivas de dibujo. Un material de paleta con COLOR_0; sin texturas.
- Ejes: +Y arriba, +Z hacia salida/frente. Receta en metros; GLB en celdas; vértices relativos al pivote.
- Mallas y pivotes XYZ en metros: `mine_mouth`: [0, 0, 0].
- Ruedas wheel_* (vagonetas): eje local X, radio 0,23 m (0,076667 celdas). Giro futuro por distancia/radio; ore_load desmontable. Los dos carros comparten exactamente geometría de cuerpo y ruedas. Las demás piezas son rígidas.
- Metadatos de contrato geométrico: `{"sourceRecipe": "art/recipes/bear-den/bear-den.json", "rockScale": 1.32, "sinkCells": 0.08, "connectors": {"entrance": [0, 0, 1.8], "hide_plane": [0, 0, -1.7], "rail_end": [0, 0.19, 4.3]}, "clearOpeningMetres": [2.68, 3.18], "gaugeMetres": 1.2}`.
- `sheet.png`: tres cuartos desde arriba, frente, perfil; debajo, las mismas vistas con villager.glb y house.glb a escala real. `poses.png` en carros: reposo, ruedas giradas 45°, 90° con carga retirada.
- Fuente: `art/recipes/mine-mouth-candidate/mine-mouth.json`. Reconstruir desde raíz: `blender --background --python art/recipes/mine-mouth-candidate/build.py -- mine-mouth`. El adaptador explícito compartido está en mine-mouth-candidate.
- QA conjunta: `blender --background --python art/recipes/mine-mouth-candidate/validate.py`. Produce `mine-mouth/assembly.png`, `assembly-metrics.json` y `ore-pile/states.png`; valida vía/ruedas, gálibo y que retirar ore_load recupera la vacía.
- Acopios: `ore-pile.glb` es el mayor; sus cuatro estados están en `ore-pile/state-1` a `state-4`, cada uno con GLB, hoja y métricas. `states.png` los compara de izquierda a derecha a la misma escala.
- Medido desde el GLB: triángulos, primitivas, ausencia de texturas, colores de vértice; reimportación y pivotes de ruedas con desplazamiento de periferia al girar.

Sólo modelo: la mecánica de mina todavía no existe. Pendientes integración, encaje en ladera, desaparición tras plano oscuro, descarga y medida en cámara de reposo/móvil; no se modificó motor ni código de juego.
