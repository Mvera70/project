# La temática de la interfaz: grabado de tinta parda

**Subidas por el dueño del diseño el 18 sep 2026, 21:39**, con dos frases que
mandan sobre todo lo anterior:

> «Se han subido nuevos diseños para la interfaz. **Todo debe pasar por nuestra
> skill**.»
>
> «Esa captura en concreto que han mostrado son conceptos antiguos. **La nueva
> temática es menos colorida.**»

Esa captura es `docs/ui-redesign/ui-prototypes/01-living-valley.png`, y la
segunda frase es lo que hay que tener delante al muestrear: **los tres
prototipos de `ui-prototypes/` siguen valiendo para la maquetación** —dónde va
cada pieza, qué mide, el orden de la pantalla— y **dejan de valer para el
color**. Lo mismo le pasa a `../higgsfield/branding-sheet.png`, que es la
versión coloreada (vid con flores azules y naranjas, viñetas verdes) de tres de
estas cinco piezas.

Lo que define la temática nueva, leído de las cinco: **una sola tinta parda
oscura de trazo de grabado sobre papel crema. Ni un segundo color, ni relleno
plano, ni verde, ni oro.** El volumen lo dan las rayas del buril, no un tono.

## Las cinco piezas y dónde encaja cada una

| Pieza | Fichero | Dónde vive hoy en la piel |
|---|---|---|
| **Marco cuadrado con hojas de roble en las cuatro esquinas** | `frame-oak-corners.jpg` | El capitular de la crónica (`.chronicle-capital`, hoy `capital-anno.png`: recuadro **rojo** con la `A` en oro) y, en general, cualquier retrato o tarjeta enmarcada |
| **Esquina de vid de roble** | `vine-corner.jpg` | El canalón de la crónica (`paintVine`, `chronicle-ornaments.ts`) |
| **Sello de lacre con el roble** | `seal-oak.jpg` | El sello de la decisión aplazada (VZ-03: `seal-tree` en `public/ui/icons.svg`, el ornamento de la bandeja cuando hay algo que decidir) |
| **Banderola de pergamino** | `banderole.jpg` | **No tiene sitio todavía**, y es el hueco más claro: es una cinta para un título. La fase del valle (A5) se lee hoy en versalitas sueltas bajo el ornamento; en una banderola sería un rótulo |
| **Hoja de roble** | `oak-leaf.jpg` | El ornamento de la bandeja (`oak-leaf` en el sprite), que hoy va **en oro** (`--skin-gold`) |

## Lo que esto no es

No es un encargo cerrado ni una ronda: es la referencia. Integrar cada pieza
—calcarla a SVG con `calcar-iconos`, meterla en el sprite o en `public/ui/art/`,
y retirar el color que sustituye— es trabajo de una ronda de piel, con su
captura a 390 y a 750. Las tareas están en `docs/plan-arte-pendiente.md`.
