# Barra inferior V8 · cuero y medallones

Encargo del 28 de septiembre; entrega terminada el **29 de septiembre de 2026**.
Base: V7 local. **Propuesta documental pendiente de revisión de Vera.**

## Abrir y comparar

- [Las cuatro láminas, en dos tamaños](laminas-v8-2026-09-28/index.html).
- [Cuero frente a hierro: comparación](laminas-v8-2026-09-28/comparison.html) · [PNG completo](laminas-v8-2026-09-28/comparativa-cuero-hierro.png).
- [Piezas a tamaño real](laminas-v8-2026-09-28/pieces.html) · [Hoja PNG](laminas-v8-2026-09-28/hoja-piezas-v8.png).

| Cuero | 390 × 844 | 320 × 568 |
|---|---|---|
| Valle de día | [Captura](laminas-v8-2026-09-28/valle-390x844.png) | [Captura](laminas-v8-2026-09-28/valle-320x568.png) |
| Tablón abierto | [Captura](laminas-v8-2026-09-28/tablon-390x844.png) | [Captura](laminas-v8-2026-09-28/tablon-320x568.png) |
| Carro | [Captura](laminas-v8-2026-09-28/carro-390x844.png) | [Captura](laminas-v8-2026-09-28/carro-320x568.png) |
| Crónica | [Captura](laminas-v8-2026-09-28/cronica-390x844.png) | [Captura](laminas-v8-2026-09-28/cronica-320x568.png) |

| Alternativa de hierro | 390 × 844 | 320 × 568 |
|---|---|---|
| Valle de día | [Captura](laminas-v8-2026-09-28/hierro-valle-390x844.png) | [Captura](laminas-v8-2026-09-28/hierro-valle-320x568.png) |
| Tablón abierto | [Captura](laminas-v8-2026-09-28/hierro-tablon-390x844.png) | [Captura](laminas-v8-2026-09-28/hierro-tablon-320x568.png) |

## Diseño entregado

La navegación usa una correa de cuero mate marrón rojizo, con costura clara
cerca de ambos bordes. El centro queda limpio. El material distingue la
navegación de las placas de actuar y del soporte de madera del tablón.

Tres medallones de latón viejo se colocan en el centro de cada tercio de la
pantalla. Bisel, pátina y puntadas están en los PNG; los símbolos `mountains`,
`book` y `people` son los del sprite del juego, superpuestos en crema a 25 px.
Los nombres permanecen debajo, en **Cinzel crema de 10 px / 12 px**.

La pestaña activa se identifica mediante relieve y brasa ámbar interior,
más **4 px de elevación del medallón**. Los nombres conservan una línea común.
Los medallones inactivos asoman 6 px sobre la correa; el activo, 10 px.
La correa mide 72 px de alto. Cada botón ocupa su tercio completo y 72 px de
alto, superando los 44 px mínimos de toque. A 320 px no se encogen ni medallón
ni letra.

Los paneles de carro y crónica reservan 72 px inferiores; el tablón conserva
14 px adicionales de separación. Se mantienen las medidas, ilustraciones,
colores, cabecera y contenidos de V7. El estado activo en crónica corresponde
al libro; en valle, carro y tablón, a las montañas.

### Alternativa: hierro forjado

Una banda oscura de hierro martillado con remaches de esquina sustituye
únicamente el soporte de cuero. Se conservan medallones, iconos, tamaños y
posición para comparar materiales bajo las mismas condiciones. La alternativa
se presenta aparte y no se da por elegida.

Mi recomendación es **cuero**: separa con claridad la navegación de la madera,
mantiene el tono cálido de las ilustraciones y permite leer bien el latón.
El hierro ofrece un contraste más frío y una presencia más severa.

## PNG nuevos y nueve partes

Generados mediante **ImageGen integrado**; exportación mecánica con Pillow
para recortar margen alfa y ajustar tamaño, sin dibujar materiales por código.
Los maestros también se incluyen en la carpeta `masters/`: Claude Code puede
repetir el proceso sin depender de una ruta local privada de Codex. Los PNG
definitivos están en `laminas-v8-2026-09-28/assets/`.

| Fichero | PNG a 2× | Medida CSS | Tratamiento |
|---|---:|---:|---|
| `nav-leather.png` | 780 × 144 | 390 × 72 | Nueve partes, corte 32 PNG / borde 16 CSS; costura diseñada a 6 px de los bordes |
| `nav-medal.png` | 112 × 112 | 56 × 56 | Proporción fija, sin icono pintado |
| `nav-medal-on.png` | 112 × 112 | 56 × 56 | Relieve y luz interior, sin icono pintado |
| `nav-iron.png` | 780 × 144 | 390 × 72 | Nueve partes, corte 32 PNG / borde 16 CSS |

CSS solo compone las piezas y los símbolos existentes; el foco de teclado
es un contorno funcional. `border-image: … 32 fill stretch` conserva las
esquinas a 320 y 390 px. Los prompts y las rutas de los maestros se guardan
en [manifest.generated.json](laminas-v8-2026-09-28/manifest.generated.json);
[verification-assets.json](laminas-v8-2026-09-28/verification-assets.json)
registra dimensiones, recortes y SHA-256. El exportador comprueba alfa.
La skill `piel-del-valle` conserva los pasos de generación, edición, exportación
y revisión visual para las siguientes piezas.

## Alcance y comprobaciones

Solo documentación, PNG de propuesta y skill compartida. **No se han tocado
componentes, motor ni banco de textos en esta pasada.** Los originales de
crónica permanecen como los dejó V7.

Las láminas son estáticas: Valley y Chronicle permiten navegar entre muestras.
People prueba su estado activo mediante ratón o teclado; no inventa una nueva
pantalla de personas. Los controles de juego conservan el comportamiento
demostrativo de V7.

Doce capturas sin errores de navegador, imágenes rotas ni desbordamientos de
texto. Comprobados el ancho total de la correa, sus 72 px, medallones de 56 px,
centrado por tercios, letra de 10 px y elevación exacta de 4 px. Navegación
a Chronicle y activación de People con Enter verificadas. Evidencia en
[verification-layout.json](laminas-v8-2026-09-28/verification-layout.json).
Inspección visual de las vistas y de la comparación; sin arrancar el juego
ni ejecutar pruebas del motor.

### Reproducir desde la raíz

```powershell
node docs/ui-redesign/laminas-v8-2026-09-28/build.mjs
node docs/ui-redesign/laminas-v8-2026-09-28/capture.mjs
```

El montaje parte del HTML local de V7; sus referencias se mantienen, incluidos
los PNG V6. La comparación usa las capturas producidas, para evitar vistas
incrustadas sin pintar en la captura larga del navegador. No requiere volver
a generar imágenes. El exportador necesita Pillow; los maestros se versionan
junto a la entrega y las rutas del manifiesto son relativas.

Entrega en la rama `art/astra-modelos`; pendiente de elección del material y
aprobación visual de Vera. Incluye V7, de la que depende, y los siete colores
V6 conservados en documentación.

## Dos decisiones pendientes · 29 sep 2026

Recomendación de Codex, todavía sin elección de Vera:

- **Placas de actuar:** mantener madera con brasa ámbar, como en V7/V8.
  El latón queda como material protagonista de los medallones de navegación.
- **Open the cart:** devolverlo a la bandeja junto a la frase de estado,
  para reunir acceso y contexto y despejar el valle.

La entrega conserva los diseños capturados: placas de madera y Open the cart
flotante. Estas recomendaciones no están implementadas.
