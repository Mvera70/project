# Pasada completa de interfaz · 23 septiembre 2026

## Alcance y corrección

Revisadas en escritorio (1280 × 800) y móvil (390 × 844) las pantallas de inicio, archivo, Valle, Crónica, Personas, carro, decisión y final. La ficha de Personas se comprobó además en el año 35, con siete personas nombradas, parentescos e historia. Se probaron los controles de velocidad, pausa, sonido y vista despejada.

La ficha de seguimiento conserva su altura baja para dejar ver a la persona en el valle. En móvil, los parentescos y los recuerdos podían empujar **Stop following** y **Life story** fuera de la ventana. El pie de acciones queda adherido al borde inferior mientras se desplaza la ficha; la historia sigue siendo desplazable y sus recuerdos ganan margen lateral para no quedar difuminados por el borde.

La captura de decisiones ya usa la escena de depuración y espera a que el mundo 3D termine de aparecer. Antes, la imagen de escritorio mostraba una pantalla gris aunque la decisión estuviera correctamente montada. Las capturas de Crónica, Personas y carro aplazan una decisión abierta para poder revisar la sección solicitada.

## Evidencia

- Inicio y archivo: `artifacts/graphics/ui-full-pass/desktop-menu-annals/` y `artifacts/graphics/ui-full-pass/mobile/`.
- Valle y controles móviles: `artifacts/graphics/ui-full-pass/mobile-valley-complete/`.
- Crónica, Personas y carro de escritorio: `artifacts/graphics/ui-full-pass/desktop/`.
- Personas, partida avanzada: `artifacts/graphics/ui-full-pass/mobile-people-final/`.
- Decisión abierta y aplazada: `artifacts/graphics/ui-full-pass/mobile-crossroad-refined/` y `artifacts/graphics/ui-full-pass/desktop-crossroad-final/`.
- Final en ambas medidas: `artifacts/graphics/ui-full-pass/mobile-critical/` y `artifacts/graphics/ui-full-pass/desktop-critical/`.

`npm run typecheck` pasó. Los 48 casos de `ui-redesign-shell`, `ui-redesign-people`, `ui-overlay-skin`, `ui-v2-nav`, `ui-annals` y `ui-title` pasaron. `eslint` del capturador pasó sin errores. La comprobación visual de la ficha desplazada consta en la última captura de Personas.

## Límite visual conocido

La página vacía del archivo conserva su altura mínima de 58 vh, decidida previamente para que se lea como una página. El resultado tiene bastante papel libre en escritorio; requiere una decisión artística separada si se quiere cambiar esa composición.
