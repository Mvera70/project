# Viviendas V3 · referencias vernáculas

2 oct 2026. Esta revisión sustituye la propuesta V2 rechazada. Los cinco ID antiguos se conservan por compatibilidad; sus nombres no describen necesariamente la forma nueva. La básica `house.glb` permanece intacta.

| ID | Referencia y rasgo traducido | Triángulos | Mallas |
|---|---|---:|---:|
| house-twin-gable | Bayleaf: extremos volados, salón retraído y teja | 884 | 6 |
| house-hip-roof | Boarhunt: hall bajo, paja y cadera lateral | 506 | 6 |
| stone-house | Hangleton: mampostería humilde, paja, huecos pequeños | 734 | 5 |
| stone-house-cross-gable | Church Farmhouse: hall y ala transversal desde suelo | 1090 | 5 |
| stone-house-tower-loft | Sea Hill: cuarto bajo sobre porche con dos apoyos | 842 | 5 |

Las referencias, fotos efectivamente examinadas y simplificaciones están en cada `artifacts/graphics/astra/<id>/README.md` y en `reference` dentro de cada JSON. Son adaptaciones comprimidas dentro de parcela 6×6 m, no reproducciones a escala de los edificios. Hangleton tiene cubierta conjetural; Church Farmhouse y Sea Hill tienen reformas posteriores a su origen medieval. Para estos dos últimos se empleó únicamente la descripción de Historic England, sin atribuir detalles a una foto no verificada.

## Reproducción

1. `node art/recipes/house-variant-candidate/design.mjs`
2. `blender --background --python art/recipes/house-variant-candidate/build-candidates.py`
3. `blender --background --python art/recipes/house-variant-candidate/comparison-v3.py`
4. `npx tsx art/recipes/house-variant-candidate/validate-v3.ts`

El adaptador usa `customMesh` para cascarones facetados de cubierta con alero de espesor, cumbrera horizontal y extremos de cadera. También aplica `candidateBuild`: juntas pétreas, retirada de caras enterradas y bisagra. No basta el constructor genérico para reproducir estas extensiones. La entrada antigua validate-v2.ts redirige a V3.

## Contrato y evidencia

Recetas en metros, exportación a 1/3: 1 celda = 3 m. Parcela 2×2, origen original, frente Blender −Y. Piezas de puerta y bisagra originales verificadas; madera `[2.5, .28, 0]` m, piedra `[2.475, .25, 0]` m. El umbral heredado baja 0,0025 celdas. Las ventanas ya NO conservan sus medidas/posiciones originales: hay exactamente tres primitivas `House_Window_A/B/C` o `Stone_Window_A/B/C`, con tamaños y alturas asimétricos. Material `window` conserva también fondo de puerta; no todo ese material debe emitir luz.

Los nombres de materiales se mantienen, sin texturas. Bayleaf usa la paleta tiled por su teja; las demás la thatched por su cubierta documentada. Una malla por material y puerta independiente. Los presupuestos son 900 para madera y 1200 para piedra.

`house-variants-v3/comparison-rest.png` compara los seis GLB con cámara del juego y escala común. Fila inferior reducida a unos 55 px de ancho por casa y ampliada ×4; `comparison-small.png` es 1:1. Cada sheet.png tiene tres cuartos, frente, perfil y escala con aldeano y casas publicadas.

Validadas recetas y GLB con herramientas del proyecto, tres huecos, piezas originales de puerta, pivote exportado, presupuesto y ausencia de texturas. Reimportación Blender y revisión visual completadas. Integración, prueba nocturna y estaciones pertenecen al director; este carril no publica.
