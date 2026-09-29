# Texturas V9 · propuesta de estándar y comparativas

**29 de septiembre de 2026 · revisión visual.** Se apoya en el plan de `texturas-v9-2026-09-29/manifest.plan.json`, el estándar consolidado en [UI-V9](piel/UI-V9.md), los antecedentes V6–V8 y las capturas históricas del 27 de septiembre. Vera eligió la portada 04 · Luces en la garganta. El modo día/noche y la animación quedan aplazados; no hay integración en el juego.

## Dirección

Las piezas se comparten por función: pergamino claro para lectura, cavidad de madera para cifras y placas pequeñas para controles. La portada elegida usa el fondo pintado 04, mantiene el logo y controles y no usa un fondo de madera. Los tres materiales de la primera portada de madera (`title-frame`, `title-bg`, `title-plate`) se conservan en el inventario como exploración descartada. Las otras cuatro imágenes quedan archivadas como alternativas.

La CSS solo coloca, recorta y estira las piezas. Las losetas repiten; los marcos usan nueve partes con esquinas fijas; el marco de portada conserva el arco superior y estira sus laterales y base. CSS no dibuja textura, bisel, clavos ni adornos. Todos los archivos se exportan a 2× del tamaño CSS declarado.

Las comparativas de valle, crónica, carro y tablón parten de la maqueta V8, adaptada para exhibir el material V9: el valle enseña la tira de estado y los cuatro controles, incluido caza, en ambas caras. No son capturas idénticas a las láminas V8 archivadas. Portada y encrucijada usan sus capturas históricas reales como referencia y proponen otra composición; esas dos parejas no comparan solo texturas. La bandeja y `Open the cart` conservan su lugar.

## Inventario de las 15 piezas

Las dimensiones CSS y cortes siguientes corresponden a los PNG exportados. PNG de salida = 2× ambas dimensiones CSS. En `slice`, el orden es el estándar CSS: arriba, derecha, abajo, izquierda, en píxeles CSS.

| ID | Tamaño CSS → PNG 2× | Clase / nueve partes | Uso y condiciones |
|---|---:|---|---|
| `wood-header` | 374×92 → 748×184 | `frame`, 24/24/24/24 | Cabecera de roble oscuro; centro de veta uniforme, borde de latón discreto y clavos contenidos en esquinas. |
| `wood-board` | 256×256 → 512×512 | `tile` | Loseta seamless de tablones verticales; tono nogal, tres tablas, juntas verticales continuas. |
| `parchment-sheet` | 512×512 → 1024×1024 | `tile` | Papel marfil claro compartido bajo hojas y lectura; fibra de contraste muy bajo, sin manchas ni borde. |
| `parchment-sheet-edge` | 390×24 → 780×48 | `frame`, 8/16/8/16 | Tira superior de papel rasgado; extremos y canto preservados, centro liso estirable. |
| `plate-date` | 358×34 → 716×68 | `frame`, 10/14/10/14 | Placa marfil encastrada dentro de la cabecera; sin panel exterior de madera. |
| `well-vital` | 68×34 → 136×68 | `frame`, 10/10/10/10 | Cavidad oscura tallada para cifra clara; sin contenido generado. |
| `btn-round` | 46×46 → 92×92 | `round` | Aro de madera y cara de latón viejo vacía, alfa real, proporción fija. |
| `btn-round-on` | 46×46 → 92×92 | `round`, edición de `btn-round` | Mismo botón y silueta; relieve y brasa ámbar dentro de la cara, sin halo exterior. |
| `strip-status` | 358×40 → 716×80 | `frame`, 10/16/10/16 | Tira de pergamino irregular, centro limpio para frase viva. |
| `button-parchment` | 200×40 → 400×80 | `frame`, 12/16/12/16 | Placa secundaria de pergamino con borde fino de roble; centro vacío. |
| `button-parchment-off` | 200×40 → 400×80 | `frame`, 12/16/12/16, edición | Misma silueta y material; baja contraste y luz sin volverse gris. |
| `title-frame` | 374×760 → 748×1520 | `outline`, 100/24/24/24 | Marco de madera de la primera exploración; archivado, no elegido. |
| `title-bg` | 256×256 → 512×512 | `tile` | Fondo de roble de la primera exploración; archivado, rechazado para portada. |
| `title-plate` | 300×82 → 600×164 | `frame`, 22/54/22/54 | Placa de la primera exploración; archivada, no elegida. |
| `paper-document` | 512×512 → 1024×1024 | `tile` | Loseta documental marfil cálida, fibra y desgaste difusos de contraste bajo; texto legible encima. |

Los prompts completos, incluida la dirección de luz y las exclusiones, siguen siendo el origen normativo en el plan. Las entradas `edit` derivan del maestro indicado: no se generan desde cero dos estados con contornos que puedan divergir.

## Seis comparativas a 390×844

Las cuatro vistas de juego se basan en la composición V8, adaptada para mostrar las piezas V9: el valle incluye la tira de estado y el control de caza en ambos lados. No afirmamos que sean capturas idénticas al archivo V8 original. Portada y encrucijada parten de capturas históricas del 27 de septiembre y proponen una composición nueva; no son comparaciones equivalentes de cambio de textura.

| Vista | Estado y piezas a mostrar | Base documental |
|---|---|---|
| Valle | Día; cabecera, cifras, bandeja y barra inferior; `wood-header`, `plate-date`, `well-vital`, `wood-board`, `strip-status`. | Captura vigente V8 del valle, con bandeja y `Open the cart` en sus posiciones originales. |
| Crónica | Hoja abierta; cabecera compartida y superficie de lectura; `parchment-sheet` y, donde corresponda, `parchment-sheet-edge`. | Captura V8; conserva los mismos textos y la misma entrada visible. |
| Carro | Carro abierto, con ilustración, cifras, botones y navegación tal como están en la base; placas habilitada/apagada. | Captura V8 del carro; mantener exactamente la posición vigente de `Open the cart`, acciones y navegación. |
| Tablón | Avisos de misión, botones y coste sobre la tabla oscura; `wood-board` y `parchment-sheet`. | Captura V8 del tablón; se mantienen textos, cantidades y acciones. |
| Portada | 04 · Luces en la garganta. Mantiene el logo, número y controles; el fondo de madera inicial queda descartado. | Antes: captura histórica `docs/interfaz/2026-09-27/ui/002-menu.jpg`. Las cinco demos se conservan en la galería; 04 es la elegida. |
| Encrucijada | Decisión del asalto. Conserva los textos y las tres acciones del jugador; no muestra Dev ni controles técnicos. | Antes: captura histórica `docs/interfaz/2026-09-27/ui/026-encrucijada.jpg`. La nueva composición y el tratamiento visual difieren de la captura de origen. |

Las seis vistas se presentan como pares “antes / propuesta”, no como pantallas nuevas. No se cambia ninguna frase ni estado para que la textura parezca funcionar mejor. Se comprueba también `btn-round-on` en el estado que ya use el botón, sin inventar una selección nueva.

## Generación, exportación y revisión

Se emplea ImageGen integrado con prompts y masters en el repositorio. Los 15 PNG iniciales viven bajo `assets/`; las cinco portadas, prompts y masters están en `demos-portada/`. La portada elegida es 04 · Luces en la garganta; las otras cuatro quedan archivadas. La textura de día se guarda en `portada-dia-noche/day-master.png` como fuente de una exploración aplazada. No se generó animación ni se integró el cambio día/noche.

La revisión visual de las seis capturas a tamaño de uso confirma la carga de los fondos, la legibilidad de la portada 04 y las tres acciones completas de la encrucijada.

## Entregables

- Esta propuesta: `docs/ui-redesign/propuesta-texturas-v9-2026-09-29.md`.
- Plan fuente de prompts/medidas: `docs/ui-redesign/texturas-v9-2026-09-29/manifest.plan.json`.
- Fuentes ImageGen: `docs/ui-redesign/texturas-v9-2026-09-29/masters/`.
- PNG normalizados: `docs/ui-redesign/texturas-v9-2026-09-29/assets/`.
- HTML de las seis comparativas: `docs/ui-redesign/texturas-v9-2026-09-29/index.html`.
- Comparativas a 390×844: [valle](texturas-v9-2026-09-29/capturas/valle-antes-despues-390x844.png), [crónica](texturas-v9-2026-09-29/capturas/cronica-antes-despues-390x844.png), [carro](texturas-v9-2026-09-29/capturas/carro-antes-despues-390x844.png), [tablón](texturas-v9-2026-09-29/capturas/tablon-antes-despues-390x844.png), [portada elegida 04](texturas-v9-2026-09-29/capturas/portada-after-390x844.png) y [encrucijada](texturas-v9-2026-09-29/capturas/encrucijada-antes-despues-390x844.png).
- Contacto legible de seis pantallas posteriores: [contacto V9](texturas-v9-2026-09-29/capturas/contacto-v9.jpg). La galería de cinco direcciones está en [demos-portada](texturas-v9-2026-09-29/demos-portada/index.html).
- Hojas de revisión: [piezas al tamaño CSS](texturas-v9-2026-09-29/hoja-piezas-v9.png) y [mosaico 2×2 de losetas](texturas-v9-2026-09-29/hoja-losetas-2x2.png).
- Prototipo navegable: [comparativas HTML](texturas-v9-2026-09-29/index.html); [plan de generación](texturas-v9-2026-09-29/manifest.plan.json); [registro generado](texturas-v9-2026-09-29/manifest.generated.json) y [verificación de exportación](texturas-v9-2026-09-29/verification-assets.json).

La revisión visual confirma que la portada 04 se ve completa y que la encrucijada muestra sus tres opciones sin duplicar el encabezado. Vera aplazó modo día/noche y animación; la fuente diurna se guarda sin integración.

## Antecedentes relevantes

- **V6:** 35 piezas a 2×; alfa, dimensión y comparación a 390×844 y 320×568. Ilustraciones de crónica conservaron composición, y no se continuó con las 44 restantes sin revisión.
- **V7:** se fijan tamaños CSS, se recuerda que CSS coloca/estira y no dibuja arte, y las capturas se preparan también en anchura estrecha.
- **V8:** los maestros y prompts se guardan dentro del repositorio y la revisión visual compara capturas. V9 conserva cuatro composiciones base y propone composiciones nuevas para portada y encrucijada, con la procedencia señalada.
- **UI-V9:** la cabecera es única; el papel de lectura es único; las superficies comparten estándar y el aspecto se acepta mirando capturas, no solo midiendo cajas.
