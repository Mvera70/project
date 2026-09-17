---
name: piel-del-valle
description: El estándar visual de la interfaz de The Valley: qué papel, qué cabecera, qué columna, qué tipografías y qué tokens usa cada superficie, y qué está prohibido inventar. Úsala antes de tocar cualquier pantalla, panel, hoja o encabezado de `src/ui/`, cuando haya que añadir una pantalla nueva, cuando algo «no se parece al resto» o cuando el dueño del diseño diga que no estamos estandarizando. Es la regla; el calco de dibujos está en `calcar-iconos`.
---

# La piel del valle: un estándar, no un catálogo de excepciones

Esta skill existe por una frase del dueño del diseño, el 17 sep 2026, probando la
demo en su tablet:

> «Los fondos que hay detrás de los textos y demás, usa siempre el mismo. El de
> la crónica es el bueno, es el que hemos hecho. **No estamos estandarizando las
> cosas, por favor.** Si lo necesitas, crea una skill con unas directrices de lo
> que estamos haciendo a nivel de diseño. Hay que tomar un estándar.»

Tenía razón, y el diagnóstico es concreto: cada ronda vestía **una** pantalla y
tomaba sus decisiones desde el prototipo de esa pantalla, así que al final había
dos papeles para lo mismo, dos cabeceras para lo mismo y tres formas de cerrar.
Ninguna estaba «mal» por sí sola. El conjunto sí.

**La regla de oro: antes de crear una pieza, busca la que ya hace ese trabajo y
úsala, no la copies.** Si una hoja necesita papel, no le pongas un
`background-color`: ponle la clase `skin-paper skin-paper--page`. Copiar valores
crea la segunda verdad que mañana se queda atrás.

## 1. La directriz de maquetación

**La superficie cruza la pantalla y su contenido va en una columna de 390 px.**

Toda esta piel se midió a 390 px de ancho, así que 390 es la columna: ni 480 ni
520, porque con 390 ni un valor medido deja de ser verdad al cambiar de pantalla.
Lo que distingue a una sección de otra es **cuánto alto ocupa**, no cuánto ancho.

| | Cruza la pantalla | Va en la columna de 390 |
|---|---|---|
| El velo y el papel de una sección | sí | — |
| La bandeja y la barra de navegación | sí | — |
| Texto, filas, fichas, botones, celdas de la barra | — | sí |

Lo que **nunca** se hace: acotar la superficie a 390 y dejar la barra cruzando,
que es dos reglas para la misma cosa y se ve como una tira de papel flotando con
valle a los lados.

## 2. Los papeles: cuatro tonos, un trabajo cada uno

Un token por papel, y el papel se pide por su clase:

| Clase | Token | Para qué | Dónde |
|---|---|---|---|
| `.skin-paper--page` | `--skin-page` `#EADBC2` | **Toda superficie de lectura** | crónica, decisión, portada, la hoja de gente/ficha/órdenes |
| `.skin-paper` | `--skin-parchment` `#E5D3BB` | Placas e instrumentos sobre el prado | placa de fecha, barra de navegación, botones de pergamino |
| `.skin-paper--deep` | `--skin-parchment-deep` `#D9C2A5` | **Un objeto encima** de una superficie | chips, filas, tarjetas de opción, medallón, la bandeja |
| `.skin-paper--aged` | `--skin-parchment-aged` `#BCA87D` | Sólo el estado pulsado | `:active` |

Los cuatro llevan la textura multiplicada (`--skin-parchment-texture`), y el tono
lo manda el token: la textura sólo aporta grano. Si una superficie lleva color
propio en un `background`, está mal; lleva una clase.

**La única excepción viva, y va con su motivo:** la bandeja del valle es
`--skin-parchment-deep` y no `--skin-page`, porque el prototipo 01 la pinta más
oscura que la página de la crónica y es mobiliario de la pantalla del valle, no
una superficie de lectura. Cualquier excepción nueva se escribe aquí o no existe.

## 3. La cabecera: una, la del valle

**Una sola cabecera en las cuatro pantallas**: la placa de fecha con el arco del
sol y la fila de cuatro chips. No hay versión compacta, no hay versión de dos
líneas y las cifras **viven una sola vez en el DOM**.

Hubo una compacta para la crónica, salida del prototipo 02, y duró hasta que el
dueño del diseño la vio en la tablet: «no usamos el mismo que tenemos en la otra
pantalla funcionando». Enseñaba tres cifras de cuatro porque estaba topada a
334 px, y arreglarla habría sido arreglar la pieza equivocada.

Con una hoja abierta hay un botón de cerrar arriba a la derecha, así que la placa
cede lo que ese botón necesita (`html:not([data-screen="valley"])`) **y sólo
entonces**: sigue siendo la misma placa, no otra.

## 4. Anchos y topes

**Mínimos, no topes, en cualquier cosa que contenga cifras o texto que crece.**
Un `width` fijo recorta el día que el grano llega a tres dígitos, y recorta en
silencio. `min-height` y `max-width: calc(100% - hueco)`, nunca `width: 334px`
para cuatro cifras.

## 5. Tipografías

| Familia | Token | Para qué |
|---|---|---|
| Cinzel | `--skin-font-display` | títulos, nombres, etiquetas en versalita |
| EB Garamond | `--skin-font-body` | la crónica, las frases del valle |
| la de voz | `--skin-font-voice` | cifras y controles |

Las cifras que se alinean llevan `font-variant-numeric: tabular-nums`.

## 6. El canto de la bandeja, y la lección que dejó

El canto es un **listón de madera clara** (`--skin-batten-lit` / `--skin-batten` /
`--skin-batten-deep`, muestreados del prototipo 01), no la madera casi negra de
la barra de navegación.

Y se dibuja **en tres piezas**: hombro izquierdo de 80 px, hombro derecho de
80 px y una franja llana estirada en el medio. La razón es la directriz: con una
sola tapa estirada al 100 % el arco se aplana con la pantalla, y a 750 px era una
recta con dos ganchos en las puntas. **Una pieza cuya forma cambia con el ancho
no es un estándar.** Cuando algo dibujado tenga que cruzar la pantalla, piensa en
nueve piezas: las esquinas en medida fija, el medio estirado.

Dos medidas que hay que respetar y que se descubrieron pintándolo:

- El relleno de la tapa lleva el color con el que la bandeja se pinta **de
  verdad** (`#CBB59A`), no el del token (`#D9C2A5`): la textura lo oscurece, y
  con el token plano se veía el escalón donde acaba la tapa.
- Los círculos de velocidad dejan de 12 a 19 px de hierba sobre la madera en el
  prototipo. Si se apoyan en el listón, el papel los muerde.

## 7. Lo que flota sobre la bandeja lee su altura

Nada que aparezca encima de la bandeja lleva un `bottom` fijo. La bandeja mide
**lo que mida su texto** —crece a dos líneas cuando la aldea tiene dos cosas que
decir— más el canto de madera, así que cualquier número fijo la tapa justo
cuando hay más que leer, que es el peor momento.

La carcasa publica `--ui-stack-height` con un `ResizeObserver`, y el canto vale
`--ui-batten-height`. Todo lo de arriba se ancla a esos dos:

```css
bottom: calc(var(--ui-stack-height, 173px) + var(--ui-batten-height, 46px) + 14px);
```

Lo llevan la cartela de hito y el rincón de velocidad. Y la regla hermana: **lo
que tenga sitio dentro de la bandeja va dentro**, en flujo, con tinta sobre su
papel y sin cartón propio —el papel de detrás ya lee—. Así están el aviso de
`notice.ts` y la pista del inicio guiado, que hasta UI-V10 era una tarjeta de
tinta de noche puesta encima del pergamino.

Y el orden dentro de la bandeja **es** el orden en la pantalla, así que una
frase que dice «the line above» tiene que ir después de esa línea. Se coloca la
pieza donde el texto ya dice que está; el texto no se toca, sale del banco.

## 8. El primer fotograma no es de otro juego

El 2D (`?render=canvas`) es la puerta de vuelta desde G-12, no el primer
fotograma. Mientras Three se descarga, el lienzo 2D va oculto y el hueco espera
en `--ui-ground`; vuelve a la vista sólo si el 3D no llega. Sin eso el jugador ve
un instante el mapa plano de casillas —el dueño del diseño lo cazó en una
secuencia del inicio— y eso no es una transición, es otro juego asomando.

## 9. Qué no se inventa

- **Ni un color ni una medida sin muestrear el prototipo.** Los prototipos están
  en `docs/ui-redesign/ui-prototypes/`. Muestrear es abrir el PNG y leer el
  píxel, no mirarlo.
- **Ni una frase.** Todo lo que lee el jugador sale de
  `src/engine/chronicle/bank.en.ts`.
- **Ni un dibujo a mano si está dibujado en el prototipo.** Se calca; cómo, en
  la skill `calcar-iconos`.

## 10. El bucle de comprobación, y el error que más caro sale

**Una medida no es una captura.** En UI-V8 verifiqué la maquetación midiendo
cajas en el navegador —todas correctas— y subí un canto que en la tablet era una
recta con dos ganchos. El dueño del diseño lo dijo en una línea: «no es tan
difícil, tienes que revisar el trabajo con una simple captura». Así que:

1. `npx tsc --noEmit` **antes de empaquetar**. Un backtick sin escapar dentro de
   una plantilla de CSS en un `.ts` rompe el build, y `bundle-game.ts` **imprime
   «52 recursos» y su tamaño aunque su vite interno haya fallado**: empaqueta el
   `dist/` anterior y las capturas salen idénticas mientras crees que no has
   cambiado nada.
2. Empaquetar con salida propia: `npx tsx tools/graphics/bundle-game.ts --out
   artifacts/graphics/<ronda>/game`, para no pisar el paquete de la otra sesión.
3. **Capturar y mirar, a dos anchos: 390 y 750.** 750 es la tablet del dueño del
   diseño (1242 px de pantalla, escala 1,66). Lo que se rompe, se rompe ahí.
4. Recortar la pieza y ponerla **al lado del prototipo** en la misma imagen. Dos
   cosas que se parecen en dos ventanas distintas dejan de parecerse cuando se
   pegan una encima de otra.
5. Cerrar con `npm run lint` y las pruebas rápidas de interfaz.

## 11. Lo que aún no está estandarizado

Se escribe aquí para que no se pierda, no porque esté bien:

- **Tres formas de cerrar**: un botón `CLOSE` con texto en la crónica, una `×` en
  la hoja de gente, y `BACK TO THE LIST` en la ficha. Son tres piezas para el
  mismo verbo y hay que quedarse con una.
- **La bandeja no tiene canto en las hojas** de gente y ficha, y sí en el valle.
  Puede estar bien —son superficies distintas— pero nadie lo ha decidido.
