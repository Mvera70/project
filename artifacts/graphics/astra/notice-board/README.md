# notice-board · candidato Bloque 1

- Dimensiones X × Y × Z glTF: **0.878 × 1.301 × 0.300 celdas** (3 m/celda).
- **260 / 400 triángulos**, 5 mallas, 1 material, 0 texturas; colores de `art/recipes/palette.json` horneados en `COLOR_0`.
- Mallas: `notice-board`, `note_1`, `note_2`, `note_3`, `note_4`. Origen: base; frente +Z.
- Estructura `notice-board` y cuatro documentos independientes `note_1`…`note_4` (cada uno con su clavo), todos con origen base. Permite ocultar avisos por estado. Cinco llamadas como máximo, material compartido.
- `sheet.png`: tres cuartos desde arriba, frente, perfil, contexto con `villager.glb` y `house.glb` publicados, a escala compartida.

## Reconstrucción

Desde la raíz del repositorio, en PowerShell:

```powershell
python art/recipes/notice-board-candidate/generate.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/notice-board-candidate/build.py -- notice-board
python art/recipes/notice-board-candidate/finish.py
```

El primer comando regenera las siete recetas. El segundo usa la receta JSON, las primitivas del constructor canónico y la paleta; fusiona con colores de vértice para reducir llamadas. El tercero valida y compone las siete hojas después de construir el bloque entero. `metrics.json` mide el GLB exportado. Blender 5.2.1 LTS.

Pendiente: integración, observación en partida a 390 × 844 y medidas de rendimiento a cargo del director. No se ha cambiado el catálogo ni el motor. Hoja de estudio, no aprobación de cámara de reposo.
