# Texturas V9 — cierre de diseño y capturas

Esta carpeta reúne los maestros y las 15 texturas iniciales de V9, las comparativas del prototipo y las capturas de revisión. No es una aprobación de arte ni una integración en el juego.

## Estado de decisiones

- Los cuatro pares de valle, crónica, carro y tablón comparan la base V8 con la propuesta V9.
- Portada y encrucijada parten de las capturas históricas del 27 de septiembre y muestran composiciones nuevas. Sus pares no representan solo un cambio de material.
- Vera ha rechazado el fondo de portada de la prueba `revision-portada/`. Los tres recursos de portada de madera (`title-frame`, `title-bg`, `title-plate`) permanecen en `assets/` como inventario de la primera exploración y no están elegidos.
- Cinco direcciones entregadas en `demos-portada/`. Vera eligió **04 · Luces en la garganta**; conserva el logo y sustituye la cubierta de madera por el paisaje nocturno. Las otras cuatro son alternativas archivadas.
- Día/noche y animación aplazados expresamente. La fuente diurna generada está en `portada-dia-noche/`; no se integra ni se anima.
- La encrucijada muestra sus tres acciones completas, conserva sus textos de juego y no añade controles de desarrollo.

## Revisión actual

- [Portada elegida, 390 × 844](capturas/portada-after-390x844.png)
- [Contacto con las seis pantallas propuestas, 390 × 844 cada una](capturas/contacto-v9.jpg)
- [Comparativas HTML](index.html)
- [Hoja de piezas a tamaño CSS](hoja-piezas-v9.png)
- [Mosaico 2 × 2 de las losetas](hoja-losetas-2x2.png)
- [Propuesta y decisiones](../propuesta-texturas-v9-2026-09-29.md)

Las comparativas individuales y sus PNG están en `capturas/`. La primera tanda de imágenes de portada, con sus prompts, maestros, exportador y verificación, está en `revision-portada/`; su fondo se conserva como referencia de una opción rechazada.

## Repetir las capturas

Desde la raíz del repositorio:

```powershell
python docs/ui-redesign/texturas-v9-2026-09-29/export-assets.py
node docs/ui-redesign/texturas-v9-2026-09-29/build.mjs
node docs/ui-redesign/texturas-v9-2026-09-29/build-demos.mjs
node docs/ui-redesign/texturas-v9-2026-09-29/capture.mjs
```

`revision-portada/export.py` y `demos-portada/export.py` reproducen las exportaciones adicionales. Las fuentes originales y prompts están junto a cada lote. El capturador usa Edge sin interfaz, espera imágenes y fondos CSS y guarda doce pantallas, seis pares, contacto y hojas. No ejecuta el juego ni modifica sus componentes. Las capturas de las alternativas 01–05 son archivo de exploración; la portada vigente se verifica en `portada-after-390x844.png`.
