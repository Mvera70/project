# greaves · candidato Bloque 3

- **100 / 150 triángulos**, 2 mallas, un material con COLOR_0, sin texturas.
- Dimensiones montadas X × Y × Z: **0.205 × 0.147 × 0.108 celdas**.
- Anclajes: `leg_l` → `shin.L`; `leg_r` → `shin.R`.
- Cada malla debe colgar individualmente de su hueso; todas tienen origen local cero. No colgar la raíz completa del GLB en un solo hueso. Los alias del brief `leg_l/r` corresponden al rig real `shin.L/R`, pivote en la rodilla.
- Coordenadas locales de hueso en metros. **No aplicar otra escala 1/3**: ya la aporta el rig. La receta usa metros de Blender; `build.py` transforma con las matrices reales de `villager.glb`.
- Paleta canónica (`palette.json`), sombreado facetado; metalness y roughness declarados en la receta.
- Hoja: vistas tres cuartos desde arriba, frente y perfil sobre el aldeano publicado, en reposo; cuarta vista con `house.glb` junto al aldeano equipado a la misma escala física, y muestra adicional de silueta a unos 20 px. La casa conserva su escala publicada. `metrics.json` incluye límites montados, hash del rig y error de reconstrucción del anclaje (1.5e-08 celdas).

## Reconstrucción

Desde la raíz, PowerShell:

```powershell
python art/recipes/jerkin-candidate/generate.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/jerkin-candidate/build.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/jerkin-candidate/context.py
python art/recipes/jerkin-candidate/finish.py
```

Receta declarativa con primitivas y `polygonMeshes`, reconstruida por el constructor de este bloque (no por `npm run art`). Exporta, recarga el GLB y verifica sus límites sobre las matrices reales del rig; la hoja utiliza el GLB recargado. Blender 5.2.1 LTS; Pillow para la hoja.

Pendiente: integración del cuero; metales **sólo modelo**. No modifica catálogo, motor, reglas ni animación. Falta comprobar todas las poses de combate y otros cuerpos (niños/oficios): las piezas se han ajustado al aldeano adulto publicado. Las faldas rígidas de malla/placa pueden necesitar pesos o división si se aprueba su integración.
