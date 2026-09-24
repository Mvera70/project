# Acabado de ocho adaptadores mixtos

Ocho fuentes originales candidatas, derivadas sin modificar `../e3b-walltop-mixed-candidate/`. Aplican la especificación `../e3b-walltop-finish-candidate/mixed-finish-spec.md`. No son GLB ni recursos integrados.

Cada variante tiene **356 triángulos, un material, 15 componentes cerrados y tres almenas**. Conserva paso 0,70, piso Y1,02, puertos, trayectoria, tablero, pretiles y huella de apoyo. Las unidades son celdas; una celda equivale a tres metros físicos.

## Acabado y presupuesto

- Tres juntas horizontales rellenas, ancho 0,006, centradas en Y0,235 / 0,470 / 0,705. No son ranuras ni huecos.
- Cuatro hiladas con dos juntas verticales en las fachadas largas; las dos fachadas cortas reciben junta en hiladas alternas. Las posiciones se alternan al 50 % y 34 %. Las bocas no reciben juntas verticales decorativas.
- Tres almenas de alto 0,06, longitud hasta 0,16 y grosor 0,10, contenidas dentro del pretil. Se omite la cuarta porque la rama más corta no ofrece separación de 0,12 respecto a sus remates. El inglete permanece libre.
- Coronación decorativa Y1,26. La continuidad del pretil base Y1,02–1,20 no cambia.
- Presupuesto: 192 triángulos de hiladas con juntas verticales, 60 de juntas horizontales, 20 de tablero, 48 de pretiles, 36 de almenas = **356**. Quedan cuatro hasta el límite objetivo de 360.

## Formato y color

Las fuentes conservan `valley-candidate-explicit-mesh-v1`, con los campos adicionales `colorLinear` y `colorsLinear`. `colorsLinear[i]` es el color RGB **lineal** del vértice `vertices[i]`. Los vértices se duplican en fronteras de color para evitar que la junta se difumine. Un único material blanco con vertex colors y roughness 0,95 basta. Sin texturas.

Piedra: `[155/255,149/255,138/255]`; mortero: `[134/255,96/255,68/255]`. Son las componentes de la paleta escrita en lineal por el pipeline del muro publicado, con diferencias Float32 inferiores a 4e-8 frente a sus materiales GLB. **No aplicar conversión sRGB→lineal otra vez.**

Este formato explícito no pasa por `loadRecipe`, que sólo admite primitivas. El exportador `../e3b-walltop-mixed-candidate/prepare-blender-export.py` ya admite `colorsLinear` directamente como `FLOAT_COLOR`, conserva normales planas y convierte coordenadas una vez mediante Blender=(X,−Z,Y). `build.ts` prepara la salida aislada de las ocho variantes. **No se ha ejecutado Blender ni se han creado GLB**: Game Asset Production exige autorizar el comando exacto de exportación.

## Reproducción

Desde la raíz, PowerShell:

```powershell
node node_modules/tsx/dist/cli.mjs art/recipes/e3b-walltop-mixed-finish-candidate/review.ts
node art/recipes/e3b-walltop-mixed-finish-candidate/rasterize.mjs
```

El primer comando genera las ocho fuentes y valida CPU; el segundo usa Edge headless para componer PNG de las láminas CPU, sin abrir el juego. El rasterizador con z-buffer se reutiliza de `../e3b-walltop-finish-candidate/raster.ts`.

Evidencia: `artifacts/graphics/E3b2-candidates/walltop-mixed-finish-review-01/`, con `measurements.json`, SHA-256 de fuentes originales y acabadas, `contact-sheet.png`, ocho láminas individuales e `index.html`.

## Límites

Cada componente es cerrado y orientado tras soldar posiciones coincidentes sólo para la comprobación topológica. Se conservan caras internas entre hiladas y bases de almenas: el conjunto no es una sola envolvente soldada. Es geometría original candidata, no paquete canónico validado.

El apoyo y el paso se heredan por identidad de polígonos/tablero/pretiles y se vuelve a medir la distancia exacta de la ruta a pretiles y almenas. No se repite la simulación seed91 ni la auditoría de edificios/árboles: no aumenta la envolvente XZ y las únicas adiciones son sobre pretiles. Los huecos a otras piezas conservan sus secciones. No sustituir el cuerpo completo de un portón con estos módulos macizos; `mixed-w-ne` en portón71 continúa siendo sólo referencia de puertos.

No hay prueba de GLB importado, GPU, Rapier, balística ni rendimiento móvil. Las almenas dejan 0,108627 de margen nominal respecto al tiro horizontal previamente medido; los tiros descendentes siguen pendientes. No se da por acabado ni aprobado el anillo.
