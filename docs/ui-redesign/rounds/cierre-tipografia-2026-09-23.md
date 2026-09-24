# Cierre visual de interfaz · 23 septiembre 2026

## Cambios

- Los títulos funcionales de portada, bienvenida, decisión, anales, final, crónica, Personas, fichas y carro usan una sans de pantalla con peso 600. La prosa de la crónica conserva su serif. El reloj solar, los botones verdes y la paleta acordada permanecen.
- Los controles inferiores de portada tienen un área táctil mínima de 44 × 44 px. Se añadió foco visible a los controles de velocidad, órdenes y cierre de carro.
- La lápida oculta el grupo de controles de la escena mientras se lee el final. El final de escritorio ya no deja visible la acción de caza detrás.
- La prueba de la pista introductoria comprueba que remite al carro sin depender de una posición fija. La exigencia anterior de la palabra «below» correspondía a una disposición anterior.

## Revisión visual e interacción

Capturas actuales a 390 × 844 y 1280 × 800 CSS px:

- Móvil, portada, entrada, valle, pausa, velocidad, sonido, vista despejada, crónica, Personas, ficha, seguimiento y carro: `artifacts/graphics/ui-last-pass/mobile-after/`.
- Móvil, portada, anales y final tras los últimos ajustes: `artifacts/graphics/ui-last-pass/mobile-final/`.
- Móvil, decisión y decisión aplazada: `artifacts/graphics/ui-last-pass/mobile-crossroad-after/`.
- Escritorio, portada, crónica, Personas, ficha, seguimiento y carro: `artifacts/graphics/ui-last-pass/desktop-after/`.
- Escritorio, anales, bienvenida y valle con pausa, velocidad, sonido y vista despejada: `artifacts/graphics/ui-last-pass/desktop-extra/`.
- Escritorio, decisión: `artifacts/graphics/ui-last-pass/desktop-critical-after/`.
- Escritorio, final tras ocultar controles de escena: `artifacts/graphics/ui-last-pass/desktop-final/`.

La inspección de esas capturas no mostró texto cortado ni solapes nuevos en los estados revisados. El barrido DOM en móvil de portada, valle y Personas dio cero desbordamientos horizontales y cero controles activos menores de 44 px; el primer Tab enfoca el campo de semilla con contorno visible. Los 14 pares de color de `tools/ui/contrast.py` superan su umbral. Las capturas de las opciones, pausa, sonido, velocidad, vista despejada y acciones de ficha acreditan que los estados responden. Las transiciones existentes mantienen `prefers-reduced-motion`.

`npm run typecheck` y ESLint focal pasaron. Pasaron 98 casos de interfaz en 10 archivos; tras el último ajuste pasaron 20 casos de portada, anales, final y ajuste de texto. El primer pase de `ui-voice-fits` detectó la aserción antigua sobre «below»; se actualizó al acceso actual al carro y pasó.

## Límite

La página vacía de anales conserva el mínimo de 58 vh ya decidido: queda aire de papel en escritorio. La composición del mundo 3D no se revisó en esta ronda.
