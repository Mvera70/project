# Gran roble icónico · revisión B8

Mejora acotada del candidato existente: copa más voluminosa, alturas irregulares y raíces de longitudes distintas. Conserva el tronco, el trazado de las ramas, los trece grupos de hojas y la topología. La silueta mantiene los huecos que dejan leer la bifurcación.

| Medida | Antes | B8 |
|---|---:|---:|
| Triángulos (máximo 3500) | 2346 | 2346 |
| Mallas | 7 | 7 |
| Primitivas GLB | 11 | 11 |
| Materiales | 5 | 5 |
| Texturas / animaciones | 0 / 0 | 0 / 0 |
| Bytes GLB | 182112 | 182116 |

Las once primitivas incluyen los dos materiales de cada malla de madera. El recuento de mallas no equivale a llamadas de dibujo: el coste de envío no crece respecto al candidato anterior, pero las llamadas totales de la escena y las sombras se medirán al integrar.

## Medidas y contrato

Anchura × altura × fondo: **3,797504 × 3,400000 × 3,486532 celdas** (11,392512 × 10,200000 × 10,459597 m). Caja Three.js: mínimo `(-1.924711, 0, -1.766270)`, máximo `(1.872794, 3.400000, 1.720263)`.

Origen en el centro del pie; suelo Y=0, Y arriba. Nodos raíz con transformaciones identidad. Integración a escala **1**: no aplicar de nuevo el `SCALE=1.35` del roble procedural.

Madera: `great_oak_trunk`, `great_oak_roots`, `great_oak_branches`, `great_oak_twigs`. Materiales `great_oak_bark` (`trunk` #735338) y `great_oak_bark_dark` (`houses.tiled.timberDark` #3F2B22).

| Copa separada | Material | Paleta |
|---|---|---|
| `great_oak_canopy_shadow` | `great_oak_foliage_shadow` | `forestGreen` #344D35 |
| `great_oak_canopy_mid` | `great_oak_foliage` | `foliage` #62864F |
| `great_oak_canopy_light` | `great_oak_foliage_light` | `foliageLight` #7F9F64 |

Rugosidad 1 en todas las superficies. Cada copa tiene un solo material y puede tintarse u ocultarse por estación; quedan ramas completas debajo. El candidato no incorpora cambio estacional.

## Reproducción y evidencia

Receta parametrizada: `art/recipes/great-oak-candidate/great-oak.json`; generador: `build.py`. Desde la raíz del repositorio, PowerShell:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/great-oak-candidate/build.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/great-oak-candidate/compare.py
```

`build.py` reconstruye el GLB, métricas y hoja, reimportando el GLB antes de renderizar. `sheet.png`: arriba izquierda ángulo del juego, arriba derecha frente, abajo izquierda perfil y abajo derecha escala junto a `house.glb` y `villager.glb`, ambos publicados y sin cambiar su escala.

`comparison-rest.png`: **izquierda antes, derecha B8**, recortes sin ampliar de dos renders de 390 × 844 px. Usa la dirección `(1, 0.9, 1.15)` de `src/render3d/camera.ts` y 26 celdas de altura visible de reposo. La comparación usa Blender, luz idéntica y fondo de estudio: **no es una captura del juego ni mide rendimiento en el aparato**. Se aprecia la copa más llena y escalonada; a esta escala las raíces aportan una diferencia menor. `comparison.json` recoge los recuentos auditados desde los bytes de ambos GLB y el commit base `fcfb4cb27e520cb90e29630892918614eb73faf6`.

Verificados visualmente hoja y comparación; el auditor comprueba presupuesto, ausencia de texturas/animaciones y transformaciones de traslación/escala identidad. Revisión sólo de candidato: no modifica el GLB publicado, el motor ni la integración. La captura dentro del juego y la medición combinada quedan para el director al integrar. El historial anterior sigue en `docs/historico/graphics-rounds/G-42.md`.
