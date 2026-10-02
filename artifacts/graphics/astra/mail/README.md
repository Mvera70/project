# mail · candidato Bloque 3

- **184 / 250 triángulos**, 1 mallas, un material con COLOR_0, sin texturas.
- Dimensiones montadas X × Y × Z: **0.303 × 0.268 × 0.173 celdas**.
- Anclajes: `mail_spine` → `spine`.
- La malla cuelga directamente de su hueso, con origen local cero.
- Coordenadas locales de hueso en metros. **No aplicar otra escala 1/3**: ya la aporta el rig. La receta usa metros de Blender; `build.py` transforma con las matrices reales de `villager.glb`.
- Paleta canónica (`palette.json`), sombreado facetado; metalness y roughness declarados en la receta.
- Hoja: vistas tres cuartos desde arriba, frente y perfil sobre el aldeano publicado, en reposo; muestra adicional de silueta a unos 20 px. `metrics.json` incluye límites montados, hash del rig y error de reconstrucción del anclaje (7.5e-09 celdas).

## Reconstrucción

Desde la raíz, PowerShell:

```powershell
python art/recipes/jerkin-candidate/generate.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/jerkin-candidate/build.py
python art/recipes/jerkin-candidate/finish.py
```

Receta declarativa con primitivas y `polygonMeshes`, reconstruida por el constructor de este bloque (no por `npm run art`). Exporta, recarga el GLB y verifica sus límites sobre las matrices reales del rig; la hoja utiliza el GLB recargado. Blender 5.2.1 LTS; Pillow para la hoja.

Pendiente: integración del cuero; metales **sólo modelo**. No modifica catálogo, motor, reglas ni animación. Falta comprobar todas las poses de combate y otros cuerpos (niños/oficios): las piezas se han ajustado al aldeano adulto publicado. Las faldas rígidas de malla/placa pueden necesitar pesos o división si se aprueba su integración.
