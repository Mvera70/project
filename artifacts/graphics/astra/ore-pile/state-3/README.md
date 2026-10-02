# ore-pile-3 · candidato del Bloque 4

Acopio de mineral, estado 3 de 4: 8 rocas facetadas.

- Dimensiones (ancho × alto × fondo): **0.6514 × 0.2874 × 0.5435 celdas**; una celda = 3 m.
- **192/300 triángulos**, 1 mallas y primitivas de dibujo. Un material de paleta con COLOR_0; sin texturas.
- Ejes: +Y arriba, +Z hacia salida/frente. Receta en metros; GLB en celdas; vértices relativos al pivote.
- Mallas y pivotes XYZ en metros: `ore_pile`: [0, 0, 0].
- Ruedas wheel_* (vagonetas): eje local X, radio 0,23 m (0,076667 celdas). Giro futuro por distancia/radio; ore_load desmontable. Los dos carros comparten exactamente geometría de cuerpo y ruedas. Las demás piezas son rígidas.
- Metadatos de contrato geométrico: `{"stage": 3, "rockCount": 8}`.
- `sheet.png`: tres cuartos desde arriba, frente, perfil; debajo, las mismas vistas con villager.glb y house.glb a escala real. `poses.png` en carros: reposo, ruedas giradas 45°, 90° con carga retirada.
- Fuente: `art/recipes/ore-pile-candidate/ore-pile-3.json`. Reconstruir desde raíz: `blender --background --python art/recipes/mine-mouth-candidate/build.py -- ore-pile-3`. El adaptador explícito compartido está en mine-mouth-candidate.
- QA conjunta: `blender --background --python art/recipes/mine-mouth-candidate/validate.py`. Produce `mine-mouth/assembly.png`, `assembly-metrics.json` y `ore-pile/states.png`; valida vía/ruedas, gálibo y que retirar ore_load recupera la vacía.
- Acopios: `ore-pile.glb` es el mayor; sus cuatro estados están en `ore-pile/state-1` a `state-4`, cada uno con GLB, hoja y métricas. `states.png` los compara de izquierda a derecha a la misma escala.
- Medido desde el GLB: triángulos, primitivas, ausencia de texturas, colores de vértice; reimportación y pivotes de ruedas con desplazamiento de periferia al girar.

Sólo modelo: la mecánica de mina todavía no existe. Pendientes integración, encaje en ladera, desaparición tras plano oscuro, descarga y medida en cámara de reposo/móvil; no se modificó motor ni código de juego.
