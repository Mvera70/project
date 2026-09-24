# G-33 · Ciervo original

23 de septiembre de 2026. Recurso original, sin proveedores externos ni coste.

## Entrega

- Fuente reproducible: `art/recipes/deer/deer.json` (SHA-256 `232D25AABE31E94191C0499D915A1DFF5BF55DCE5008FBA8E3C895AA92523532`). Se reconstruye con `npx tsx tools/art/index.ts all deer` y Blender 5.2.1 LTS.
- GLB aprobado por el pipeline y publicado: `public/assets/valley3d/deer.glb` (SHA-256 `E17C6853030F962CA93A66B55B8032B17CB2215EDA98CA57EB29993E01ACD0F4`, 431 248 bytes).
- Fuente Blender y capturas: `artifacts/graphics/G-33/approved/e17c6853030f962c/`; el `.blend` tiene SHA-256 `DFAB7016CE246CF100DA122D4BE6C423C8EACD7B47B1B5E92D2673654F874ED8`.
- Evidencia de movimiento: `artifacts/graphics/G-33/deer-animation/animation-audit.json` y las hojas `idle-contact.png` y `walk-contact.png`.

## Inspección

El GLB tiene 2 972 triángulos, cinco mallas/materiales (`coat`, `warm`, `cream`, `antler`, `dark`), 39 piezas de origen y 17 huesos. La caja de reposo mide 0,776 × 0,853 × 0,280 celdas. La vista de Three.js permite leer el cuerpo esbelto, patas largas, cuello alto y astas con ramas. El origen está en el suelo y el frente sigue la orientación de la fauna existente.

`idle` dura 4,042 s y `walk` 2,042 s. La auditoría cargó ambos clips en Three.js, encontró movimiento, bucles cerrados y deriva de raíz 0. `art-manifest.test.ts` pasó (4 pruebas). La validación del pipeline pasó, incluida la captura repetible. La publicación selectiva añadió `deer` y conservó las otras 72 entradas del manifiesto.

## Límite

La zancada publicada de `walk` es 0,20 celdas por ciclo como parámetro inicial. El auditor actual no calcula apoyo ni zancada para cuadrúpedos (`measuredStride: null`), por lo que hay que calibrarla al integrar el movimiento en la escena real. La revisión visual se hizo en la cámara aislada de Three.js, pendiente de juicio en el valle.
