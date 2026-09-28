# Piel V7 · escala, lectura y madera encendida

28 septiembre 2026. Base: V6 de `art/astra-modelos`, `6fac8ec`.
**Maquetas para revisión de Vera. Sin cambios en componentes, motor ni banco.**

## Revisar

- [HTML con las dos medidas de cada pantalla](laminas-v7-2026-09-28/index.html).
- [Hoja de piezas a tamaño de uso](laminas-v7-2026-09-28/pieces.html) · [PNG](laminas-v7-2026-09-28/hoja-piezas-tamano-real.png).
- [Las siete entradas seguidas, a 390 px de ancho](laminas-v7-2026-09-28/cronica-siete-390.png).
- [Composiciones completas: original sepia y versión a color](laminas-v7-2026-09-28/chronicle.html).

| Lámina | 390 × 844 | 320 × 568 |
|---|---|---|
| Carro | [Captura](laminas-v7-2026-09-28/carro-390x844.png) | [Captura](laminas-v7-2026-09-28/carro-320x568.png) |
| Tablón | [Captura](laminas-v7-2026-09-28/tablon-390x844.png) | [Captura](laminas-v7-2026-09-28/tablon-320x568.png) |
| Crónica | [Captura](laminas-v7-2026-09-28/cronica-390x844.png) | [Captura](laminas-v7-2026-09-28/cronica-320x568.png) |
| Valle · Open the cart | [Captura](laminas-v7-2026-09-28/valle-390x844.png) | [Captura](laminas-v7-2026-09-28/valle-320x568.png) |

Capturas a escala 1. Abrir los HTML al 100 % para valorar tamaños físicos.
Las siete viñetas de 130 px ya suman 910 px antes del texto: la captura
normal conserva el viewport 390×844; la tira continua muestra todo el contenido
desplegado de esa misma composición, sin reducir las imágenes para encajarlas.

## Qué cambia

### Crónica

Viñeta del ancho disponible, 130 px de alto a 390 y 120 px a 320.
`object-fit: cover; object-position: center` sobre los mismos PNG 640×512.
Texto debajo, con interlineado de lectura y separador discreto. La fecha se
repite en cada entrada como **ANNO 50 · SPRING**, SUMMER o AUTUMN.
Las siete muestras se ordenan por estación: nacimiento, construcción,
buhonero, boda, incendio, cosecha y muerte. Nombres y cifras siguen siendo
parámetros de ejemplo del mismo banco.

El recorte centrado elimina parte de la zona superior e inferior de las escenas,
incluidas algunas cabezas: es el recorte solicitado, sin repintar ni cambiar el
encuadre por escena. La comparación enlazada conserva los originales completos
para juzgarlo durante la revisión.

### Carro y tablón

| Elemento | Medida CSS V7 | Aplicación |
|---|---:|---|
| Ilustración del carro | 64 × 54 | Asoma por encima de la cinta; no invade la descripción |
| Ilustración de misión | 56 × 48 | Junto al título del aviso |
| Ficha de coste | 34 px alto | Recursos a color y texto vivo |
| Placa GIVE / SEND / Open the cart | 40 px alto | Madera activa/apagada; misma imagen con nueve partes |
| − y + | 40 × 40 | Se conserva la ficha existente, reducida mediante nueve partes |
| Clavo recto y torcido | 20 × 20 | Centrado sobre el borde superior del papel |
| Cierre | 44 × 44 de toque | Dibujo de 32 × 32, centrado |
| Recursos | 20 × 20 | Se mantienen los cinco iconos a color |

Duración, ficha de coste y riesgo forman una sola fila. **Free** ocupa su
propia ficha en esa fila, igual que el coste en plata. También se comprueban
las cinco misiones fuera de la porción visible, para evitar que los textos
largos rompan el diseño estrecho.

### Acciones: fuera el verde

Solo se han generado **tres piezas nuevas**, con ImageGen integrado:

| PNG en `laminas-v7-2026-09-28/assets/` | Exportación | Uso |
|---|---:|---|
| `btn-close.png` | 64 × 64 con alfa | Aro de madera gastada, aspa crema tallada |
| `plaque-wood.png` | 400 × 92 con alfa | Madera oscura, canto de latón y luz de brasa ámbar interior |
| `plaque-wood-off.png` | 400 × 92 con alfa | Misma familia de placa sin luz, letra atenuada mediante CSS |

Las placas parten de 200×46 CSS, con cortes de **36 px en el PNG / 18 px CSS**.
En botones de 40 px se conserva `border-image-width:18px` y se separa el borde
de disposición (10 px) para que el texto tenga espacio sin alterar las esquinas.
El texto no está pintado en la imagen. El muestrario enseña GIVE, SEND,
Open the cart y el estado apagado a su tamaño real de uso.

Las otras 32 piezas del conjunto de 35 se reutilizan. Su resolución original
se conserva: las ilustraciones siguen en 192×160 aunque ahora se muestran
más pequeñas; el clavo recto de 32×32 se muestra a 20×20 por petición expresa,
sin generar otro. No todos los PNG reutilizados equivalen exactamente a 2×
de la nueva medida CSS.

### Cabecera

Arco del juego: ancho 90, flecha 11, margen 9, cinco cuentas de radio 2 y
sol de radio 5 con doce rayos entre 6,4 y 8,4. Geometría tomada de `hud.ts`;
solo se copia a la maqueta. La cuenta central queda bajo el sol al mediodía,
como en el juego. Se conserva el color de los iconos de recurso.

## Conservación del arte

Las siete imágenes a color se guardan en
`laminas-v6-2026-09-28/colour/{harvest,birth,death,built,pedlar,wedding,fire}.png`.
Se actualizan los HTML y el exportador V6 para apuntar a esa carpeta.

En `public/ui/art/` se restituyen los siete sepia desde las copias originales
de V6. [Verificación SHA-256](laminas-v7-2026-09-28/verification-restored.json):
los siete ficheros públicos coinciden byte por byte con esas copias y los
colores quedan separados. **No volver a sustituir originales hasta tener
las 51 imágenes a color y revisar las escenas con claves compartidas.**

La skill compartida `.claude/skills/piel-del-valle/SKILL.md` incorpora las
medidas V7, acciones de madera y esta regla de conservación. Las reglas V7
prevalecen sobre las recetas históricas de V6 para esta propuesta.

## Evidencia y reproducción

- [Prompts y fuentes de las tres generaciones](laminas-v7-2026-09-28/manifest.generated.json).
- [Inventario completo con nuevas medidas de uso](laminas-v7-2026-09-28/manifest.pieces.json).
- [Dimensiones, alfa y hashes de los tres PNG](laminas-v7-2026-09-28/verification-assets.json).
- [Medidas de todas las tarjetas y comprobación de las ocho capturas](laminas-v7-2026-09-28/verification-layout.json).

Desde la raíz del repositorio:

```powershell
node docs/ui-redesign/laminas-v7-2026-09-28/build.mjs
node docs/ui-redesign/laminas-v7-2026-09-28/capture.mjs
```

El exportador Python usa Pillow y los maestros locales registrados; los PNG
exportados ya están entregados, por lo que no hace falta regenerarlos para abrir
las láminas. `prepare-v6.mjs` conserva los colores y repone los originales de
forma repetible, con comprobaciones de hash.

Verificación acotada con Edge sin ventana, fuentes e imágenes decodificadas
antes de capturar. Ocho vistas sin imágenes rotas, errores de navegador,
desbordamiento horizontal, texto desbordado ni ilustraciones sobre descripciones.
Comprobados cierre 44, acciones y selectores 40, cinco cuentas, límites de
selección de misión, estado apagado y navegación cerrar → valle → carro.
Sin arrancar Three.js ni ejecutar suites del motor.

**Pendiente:** revisión visual de Vera. Esta entrega no integra los componentes
ni produce las otras 44 crónicas.
