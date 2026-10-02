# Viviendas V2 · cinco siluetas para móvil

2 oct 2026. Rehechas las cinco variantes; `house.glb` básico se conserva como referencia.

| Modelo | Forma dominante | Triángulos | Mallas/materiales |
|---|---|---:|---:|
| house-twin-gable | Dos hastiales altos desiguales | 694 | 6 |
| house-hip-roof | Gran pirámide de paja | 672 | 6 |
| stone-house | Cumbrera transversal baja y porche | 958 | 5 |
| stone-house-cross-gable | Cruz con hastial frontal alto | 950 | 5 |
| stone-house-tower-loft | Altillo de 7,46 m sobre ala baja | 1140 | 5 |

## Reproducción

1. `node art/recipes/house-variant-candidate/design.mjs`
2. `blender --background --python art/recipes/house-variant-candidate/build-candidates.py`
3. `blender --background --python art/recipes/house-variant-candidate/comparison-v2.py`
4. `npx tsx art/recipes/house-variant-candidate/validate-v2.ts`

Cada receta JSON incluye `candidateBuild`: juntas de piedra, eliminación de caras enterradas y pivote de puerta. El adaptador de esta carpeta es necesario. Las hojas muestran tres cuartos con el vector de reposo, frente, perfil y escala junto a aldeano/casas publicados. `artifacts/graphics/astra/house-variants-v2/comparison-rest.png` compara las seis casas a escala común, también reducidas a unos 55 px de ancho.

## Contrato

Recetas en metros y exportación a 1/3: parcela 6×6 m = 2×2 celdas. Se conservan literalmente las tres ventanas y las primitivas de puerta de los originales. Bisagra madera `[2.5, .28, 0]` m y piedra `[2.475, .25, 0]` m en Blender; glTF convierte a Y arriba. El umbral heredado baja 0,0025 celdas. Los materiales y colores no cambian; `window` incluye también fondos oscuros no emisivos. Ninguna textura. Una malla por material, puerta independiente, compatible con mergeStatic.

Validación: esquema de las cinco recetas, validador GLB del proyecto, identidad de aberturas/puertas/materiales, bisagras exportadas y presupuestos 900/1200; importación Blender y revisión visual de GLB. Integración, estaciones, iluminación nocturna y prueba en el juego corresponden al carril principal.
