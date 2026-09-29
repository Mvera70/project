# V9 desplegada · comparación con las maquetas

Capturas de `https://mvera70.github.io/project/` el 29 sep 2026, a **390×844**
y **320×568**, en Edge. Valle, tablón, carro y crónica usan
`?debug=1&live=1&seed=11&year=20&season=summer`; la encrucijada añade
`&crossroad=1`. La referencia V9 es de 390 px en ambas comparaciones y nunca
se deforma para simular una maqueta de 320. Año, seed, cifras y texto cambian
entre maqueta y juego: se comparan material, jerarquía y geometría.

| Pantalla | Comparación 390 / 320 | Diferencia visible |
|---|---|---|
| Portada | [390](comparativas/portada-390.jpg) · [320](comparativas/portada-320.jpg) | Fondo y logo coinciden. «Fundar» usa `plaque-wood`, más gruesa y con relieve, frente a la [placa fina](../texturas-v9-2026-09-29/revision-portada/plaque-brass.png) de la maqueta. También aparece `DEV` bajo el idioma. |
| Valle | [390](comparativas/valle-390.jpg) · [320](comparativas/valle-320.jpg) | Cabecera, marfil y brújula están presentes; el juego deja una bandeja de órdenes más alta y cambia la composición del valle según el estado. A 320 px el mando de vista ocupa el punto de toque del tablón. |
| Tablón | [390](comparativas/tablon-390.jpg) · [320](comparativas/tablon-320.jpg) | **Bloqueante visual:** los papeles y las tablas desaparecen. Seis recursos del panel devuelven 404; el texto queda oscuro sobre marrón. Los PNG existen en `/project/assets/` (comprobado con respuesta 200). |
| Carro | [390](comparativas/carro-390.jpg) · [320](comparativas/carro-320.jpg) | En el juego es una hoja que sube desde abajo; la maqueta era una página completa. Se conserva la tarjeta, cinta, coste y placa. A 320 px la primera tarjeta necesita desplazamiento para ver GIVE. |
| Crónica | [390](comparativas/cronica-390.jpg) · [320](comparativas/cronica-320.jpg) | La hoja real usa cabecera «ANNO 21» y empieza más abajo. Las viñetas siguen sepia, como estaba previsto hasta completar el lote de color. Las capturas esperan a que carguen las imágenes, sin confundir el respaldo inicial con el grabado definitivo. |
| Encrucijada | [390](comparativas/encrucijada-390.jpg) · [320](comparativas/encrucijada-320.jpg) | Papel y opciones coinciden en intención. Falta el canto rasgado superior ya existente, [`parchment-sheet-edge.png`](../../../src/ui/redesign/parchment-sheet-edge.png). |

**Diagnóstico del tablón.** El CSS inyectado utiliza variables con URL relativas
como `url(./frame-parchment-zisyWGyF.png)`. En esa hoja, el navegador pide
`/project/frame-parchment-zisyWGyF.png` (404); la textura publicada está en
`/project/assets/frame-parchment-zisyWGyF.png` (200). También fallan
`wood-board`, `chip-cost`, `res-silver`, `nail-bent` y `btn-close`. Registro
exacto en [`capture-report.json`](capture-report.json). Corregir la resolución
de URL en el panel; **no hace falta una imagen nueva**.

**Toque a 320 px.** `__valleyBoardScreen()` devuelve (163, 248), dentro del
mando «Just the valley». El toque activa ese mando y no abre el tablón. Para
fotografiar su ventana a ese ancho, el recorrido oculta primero la interfaz
y luego toca el objeto. La captura conserva esa intervención visible; no se
presenta como apertura normal.

`capture-live.mjs` reproduce las doce capturas y `compare.py` monta los pares.
Esta auditoría no cambia los componentes del juego. La crónica a color se
entrega en [`cronica-color-v9-2026-09-29`](../cronica-color-v9-2026-09-29/README.md).
