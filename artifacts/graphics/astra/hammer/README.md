# hammer · candidato Bloque 1

- Dimensiones X × Y × Z glTF: **0.102 × 0.217 × 0.054 celdas** (3 m/celda).
- **56 / 120 triángulos**, 1 mallas, 1 material, 0 texturas; colores de `art/recipes/palette.json` horneados en `COLOR_0`.
- Mallas: `hammer`. Origen: hand_r grip; frente +Z.
- Una malla y un material: una llamada de dibujo por instancia. Conector `grip` y origen en la empuñadura; mango en +Y glTF. Colgar de `hand_r` con el contrato de escala de `Cast`; la hoja muestra ese conector sobre el aldeano, sin sustituir la prueba del gesto real.
- `sheet.png`: tres cuartos desde arriba, frente, perfil, contexto con `villager.glb` y `house.glb` publicados, a escala compartida.

## Reconstrucción

Desde la raíz del repositorio, en PowerShell:

```powershell
python art/recipes/notice-board-candidate/generate.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/notice-board-candidate/build.py -- hammer
python art/recipes/notice-board-candidate/finish.py
```

El primer comando regenera las siete recetas. El segundo usa la receta JSON, las primitivas del constructor canónico y la paleta; fusiona con colores de vértice para reducir llamadas. El tercero valida y compone las siete hojas después de construir el bloque entero. `metrics.json` mide el GLB exportado. Blender 5.2.1 LTS.

Pendiente: integración, observación en partida a 390 × 844 y medidas de rendimiento a cargo del director. No se ha cambiado el catálogo ni el motor. Hoja de estudio, no aprobación de cámara de reposo.
