# G-34 · Oso pardo original

23 de septiembre de 2026. Encargo acotado al modelo 3D. Sin proveedores externos ni coste de generación.

## Entrega

- Receta: `art/recipes/bear/bear.json`; autoría reproducible con `art/recipes/bear/build-recipe.cjs`.
- Construcción: `npx tsx tools/art/index.ts all bear`, Blender 5.2.1 LTS.
- Publicación selectiva: `npx tsx tools/graphics/publish-assets.ts --ids bear`; conserva las otras 73 entradas.
- GLB: `public/assets/valley3d/bear.glb`, 465.624 bytes, SHA-256 `ECA8AA70E7A3D31BFC25DC0B826AA959C5D6E832B3F30075B8DA8B7652416445`.
- Fuente Blender, validación y captura: `artifacts/graphics/G-34/approved/eca8aa70e7a3d31b/`.

## Modelo y clips

Oso pardo de hombros altos, cuerpo ancho, orejas pequeñas redondas, hocico claro y patas plantígradas con garras. 2.712 triángulos, cuatro mallas/materiales y 17 huesos. Caja en reposo: 1,2495 × 0,7245 × 0,436632 celdas (X/Y/Z del GLB); suelo en Y=0. Orientación igual que la receta de ciervo y compatible con el giro de la fauna existente.

| Clip | Duración | Bucle | Zancada declarada |
|---|---:|---|---:|
| `idle` | 4,041667 s | sí | — |
| `walk` | 2,041667 s | sí | 0,22 celdas |
| `attack` | 1,541667 s | no | — |

`attack` es un zarpazo corto de la pata delantera izquierda con movimiento de cabeza y torso. No hay clip de levantarse sobre dos patas.

La auditoría carga el GLB en Three.js: los tres clips contienen movimiento; raíz inmóvil; los bucles cierran. Las hojas de contactos están en `artifacts/graphics/G-34/bear-animation-final/`, revisada visualmente la de zarpazo. La primera iteración tenía el reposo demasiado sutil; se corrigió el movimiento de cabeza/cuello sin tocar umbrales. `tests/fast/art-manifest.test.ts`: cuatro pruebas correctas.

La zancada es un parámetro inicial: el auditor no mide contacto de pies para cuadrúpedos. La calibración con la velocidad y la revisión en el valle corresponden a la integración del animal. Este encargo no cambia comportamiento, motor ni interfaz.
