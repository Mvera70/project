# Casa quemada · revisión del bloque 8

Mejora del candidato anterior de `../burnt-house/`: cubierta asimétrica con cabios rotos, restos de adobe en los paños bajos, madera ennegrecida y tres vigas caídas. Conserva la estructura y los ocho pivotes del candidato; sigue siendo una casa en pie antes del derrumbe. Sin fuego visible, brasas, humo, emisión ni sangre.

| Medida | Anterior | Revisión |
|---|---:|---:|
| Triángulos | 996 | **1152 / 1200** |
| Primitivas glTF | 27 | **8** |
| Materiales | 5 | **1** |
| Texturas | 0 | **0** |

GLB: **115140 bytes**. Huella **2 × 2 celdas (6 × 6 m)**, altura **1,489025 celdas (4,467076 m)**. Caja Three.js: mínimo `(0, 0, -2)`, máximo `(2, 1.489025, 0)`. Frente +Z, Y arriba. Nodos raíz independientes con rotación y escala identidad; sin esqueleto ni clips. Los colores de `art/recipes/palette.json` se conservan en `COLOR_0` con un único material mate `BurntHousePalette` (rugosidad 1, metal 0).

## Contrato de piezas

Cada nodo es una malla con una sola primitiva. Sus nombres y traslaciones coinciden con el candidato anterior, comprobado tras exportar. Coordenadas XYZ de Three.js en celdas:

| Nodo | Origen |
|---|---|
| `burnt_house_base` | `(1, 0, -1)` |
| `burnt_house_wall_front` | `(1, 0.076667, -0.176667)` |
| `burnt_house_wall_back` | `(1, 0.076667, -1.823333)` |
| `burnt_house_wall_left` | `(0.176667, 0.076667, -1)` |
| `burnt_house_wall_right` | `(1.823333, 0.076667, -1)` |
| `burnt_house_roof_left` | `(1, 1.466667, -1)` |
| `burnt_house_roof_right` | `(1, 1.466667, -1)` |
| `burnt_house_chimney` | `(1.493333, 0.066667, -1.58)` |

Los paños de adobe pertenecen a su pared, los cabios a su faldón y los restos caídos a la base. Las paredes frontal y trasera giran alrededor de X; las laterales y faldones, de Z. Para desplomar un faldón hay que bajar su pivote de cumbrera además de girarlo. No se ha integrado ni animado el derrumbe.

## Evidencia visual

`sheet.png`: columnas tres cuartos con dirección de reposo, frente y perfil; arriba la casa quemada sola, abajo aldeano, casa quemada y casa publicada a su escala real. `comparison.png`: candidato anterior, revisión y casa publicada. `rest-native-strip.png`: mismo orden, recortes **sin ampliar** de renderizados a 390 × 844 y altura ortográfica 26, con dirección Three.js `(1, 0.9, 1.15)` de `src/render3d/camera.ts`.

Revisión visual: los paños claros y las grandes discontinuidades de cubierta se leen en el recorte móvil; las vigas del suelo son detalle de proximidad. La casa dañada se distingue de la casa intacta por el contraste oscuro y el tejado abierto. Las capturas proceden del GLB reimportado en Blender: reproducen orientación y escala de cámara, pero la iluminación y la oclusión del valle real quedan para la integración. Ocho primitivas son el coste geométrico por ejemplar antes de sombras; no son una medición de rendimiento del juego.

## Reproducción

Receta: `art/recipes/burnt-house-candidate/house-burnt.json`, interpretada por `build.py`. La receta modifica el candidato existente; el generador conserva sus dimensiones estructurales y pivotes. Desde la raíz del checkout en PowerShell:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/burnt-house-candidate/build.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/recipes/burnt-house-candidate/review.py
```

Verificado con Blender 5.2.1 LTS. El segundo comando reimporta los recursos, produce las imágenes y comprueba triángulos, pivotes, ocho mallas, ocho primitivas, material único, colores de vértice, transformaciones identidad y ausencia de texturas/emisión; resultados en `validation.json`. El candidato anterior queda como referencia histórica: para reconstruir su versión se necesita su receta anterior al bloque 8.

Pendiente: aprobación e integración del director, y comprobación del derrumbe y coste de escena en el runtime. No hay cambios en motor, catálogo ni assets publicados.
