# hide-rack · candidato Bloque 1

- Dimensiones X × Y × Z glTF: **0.990 × 0.900 × 0.400 celdas** (3 m/celda).
- **384 / 400 triángulos**, 5 mallas, 1 material, 0 texturas; colores de `art/recipes/palette.json` horneados en `COLOR_0`.
- Mallas: `frame`, `hide_1`, `hide_2`, `hide_3`, `hide_4`. Origen: base; frente +Z.
- Cuatro pieles independientes `hide_1`…`hide_4`, más `frame`; todas en el origen base. Ocultar por estado o fusionar una variante por estado al integrar. La exportación separada cuesta hasta cinco llamadas; aún no cumple una llamada hasta esa fusión. La receta incluye `polygonMeshes`: contornos de piel extruidos y reconstruidos por el `build.py` de este bloque; el constructor genérico no interpreta ese campo.
- `sheet.png`: tres cuartos desde arriba, frente, perfil, contexto con `villager.glb` y `house.glb` publicados, a escala compartida.

## Reconstrucción

Desde la raíz del repositorio, en PowerShell:

```powershell
python art/recipes/notice-board-candidate/generate.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/notice-board-candidate/build.py -- hide-rack
python art/recipes/notice-board-candidate/finish.py
```

El primer comando regenera las siete recetas. El segundo usa la receta JSON, las primitivas del constructor canónico y la paleta; fusiona con colores de vértice para reducir llamadas. El tercero valida y compone las siete hojas después de construir el bloque entero. `metrics.json` mide el GLB exportado. Blender 5.2.1 LTS.

Pendiente: integración, observación en partida a 390 × 844 y medidas de rendimiento a cargo del director. No se ha cambiado el catálogo ni el motor. Hoja de estudio, no aprobación de cámara de reposo.
