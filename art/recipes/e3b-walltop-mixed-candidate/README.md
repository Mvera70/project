# Adaptadores mixtos cardinal ↔ diagonal

Ocho modelos originales de piedra, fuentes explícitas sin exportar. Resuelven el giro de trayectoria de 45° mediante ingletes, conservan bocas completas y no superponen pretiles rectos sobre el paso. Son candidatos geométricos para sustituir muros completos. No se han integrado ni aprobado para el juego.

| Fuente | Máscara | Muros reales seed91/tick3846 |
|---|---:|---|
| mixed-n-se.mesh.json | 33 | 221, 226, 284, 292 |
| mixed-n-sw.mesh.json | 65 | 179, 188, 241 |
| mixed-e-sw.mesh.json | 66 | 194, 198, 251, 256 |
| mixed-e-nw.mesh.json | 130 | 210, 216, 264, 270 |
| mixed-s-ne.mesh.json | 20 | 178, 187, 237, 243 |
| mixed-s-nw.mesh.json | 132 | 222, 227, 281, 289 |
| mixed-w-ne.mesh.json | 24 | 193, 252, 257; portón 71 sólo como referencia de bocas |
| mixed-w-se.mesh.json | 40 | 208, 214, 265, 271 |

Las orientaciones son las ocho combinaciones posibles de una dirección cardinal y una diagonal opuesta. Si la diagonal apunta hacia la cardinal, la regla de diagonal efectiva del anillo la suprime por existir el vecino cardinal. Se emiten las ocho fuentes con winding propio: no necesitan escalas negativas en escena.

## Formato reproducible

`valley-candidate-explicit-mesh-v1` es un formato de esta carpeta. **No es el esquema de `tools/art/loadRecipe`**: éste sólo admite primitivas y no puede expresar las caras a inglete sin solapes. Cada `part` contiene vértices XYZ, índices de triángulos orientados hacia fuera, polígono XZ de origen, alturas, material y color. El índice es base cero. `review.ts` genera las ocho fuentes desde la misma construcción matemática y comprueba aristas, winding, volúmenes, anchura y apoyo.

Unidad: celda; una celda son tres metros físicos. Origen en esquina de celda, centro XZ=(0,5; 0,5), escala 1. Coordenadas de Blender=(X,−Z,Y), conversión rígida con determinante +1. Las recetas anteriores guardan posiciones Blender; aquí los vértices se guardan en coordenadas del juego y se convierten una vez al exportar.

Un material `stone`, roughness 0,95, colores de vértice próximos a `palette.json`. Cuatro hiladas de 0,235, tablero de 0,08 y pretiles de 0,10 × 0,18: 148 triángulos, nueve componentes cerrados. No hay texturas, suavizado ni proveedores externos. La fábrica es una aproximación de volumen con hiladas; no es todavía aparejo artístico final. Las caras coincidentes entre hiladas se conservan en el presupuesto; cada componente es manifold, el conjunto no es una única envolvente soldada.

## Reproducción ejecutada

Desde la raíz del proyecto, con PowerShell:

```powershell
node node_modules/tsx/dist/cli.mjs art/recipes/e3b-walltop-mixed-candidate/review.ts
node node_modules/tsx/dist/cli.mjs art/recipes/e3b-walltop-mixed-candidate/check-rapier.ts
node art/recipes/e3b-walltop-mixed-candidate/rasterize.mjs
```

`rasterize.mjs` usa Edge headless para convertir las láminas CPU SVG a PNG. No abre el juego. Evidencia: `artifacts/graphics/E3b2-candidates/walltop-mixed-review-01/`.

`check-rapier.ts` añade una sonda de colisión sobre la fuente: las ocho
orientaciones tienen cero contactos entre el disco de radio 0,32 y los
pretiles triangulados a lo largo de 602 posiciones por pieza. Conserva los
ingletes exactos; no convierte un pretil cóncavo en una envolvente convexa.
Esto no acredita la física de los GLB exportados ni la continuidad de sus
colliders entre piezas adyacentes.

## Exportador preparado, sin ejecutar

`prepare-blender-export.py` conserva coordenadas, normales planas, colores y un material. Rechaza fuentes fuera de esta carpeta, cualquier directorio de salida distinto de `artifacts/graphics/E3b2-candidates/walltop-mixed-review-01/future-export`, ficheros existentes y escenas guardadas del usuario. Requiere proceso nuevo de Blender con `--background --factory-startup` y el argumento explícito `--authorize-export`.

Comando futuro, **pendiente de autorización exacta y no ejecutado**:

```powershell
blender --background --factory-startup --python art/recipes/e3b-walltop-mixed-candidate/prepare-blender-export.py -- --source art/recipes/e3b-walltop-mixed-candidate/mixed-n-sw.mesh.json --output-dir artifacts/graphics/E3b2-candidates/walltop-mixed-review-01/future-export --authorize-export
```

El exportador está preparado como fuente, pero su ejecución y el GLB resultante no están validados. El CLI `game-dev` no está disponible en PATH; no se ha construido paquete canónico ni se afirma vendorización.
