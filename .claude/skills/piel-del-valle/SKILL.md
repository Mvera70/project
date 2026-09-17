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

**Y no queda ninguna excepción.** La bandeja del valle era
`--skin-parchment-deep` —más oscura que la página, como la pinta el prototipo
01— y el dueño del diseño lo cortó viendo las tres pestañas seguidas: «que cada
sección tenga un borde diferente y además el fondo no sea de la misma tonalidad
ni textura, no me gusta nada; queda fatal cuando cambias entre pestañas». Es una
desviación deliberada del prototipo y la única: un solo papel pesa más que la
fidelidad de un tono. Cualquier excepción nueva se escribe aquí o no existe.

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

## 6. El canto: el papel se desgarra, y es el mismo en todas

**Toda superficie de papel que sube desde el borde de abajo lleva el mismo
canto rasgado** (`.skin-torn-top`): la bandeja del valle, la hoja de gente, la
página de la crónica, la decisión, el epitafio y el parte de bienvenida. Seis
superficies, una clase.

Antes había tres cantos para lo mismo —un listón de madera curvo en la bandeja,
un corte recto con franja de fusión de 64 px en la crónica, y una esquina
redondeada de 16 px con sombra en la hoja de gente— y el dueño del diseño
eligió éste de entre tres alternativas que se le enseñaron en un lienzo: «me
gusta más el borde como de hoja rota».

Lo que se retira con él: la franja de fusión, la esquina redondeada, la sombra
de la hoja, el filete recto de su canto y el segundo tono de papel. Cinco reglas
menos.

**Cómo está hecho, y las tres trampas que costó:**

- **Es un azulejo que se repite, no una pieza que se estira.** 130 × 14 px con
  `repeat-x`, de `tools/ui/torn-edge.py` con semilla fija —escrito, no
  calculado, como los `deckle`—. Un desgarro repetido tiene la misma forma a
  390 y a 1240; el listón de madera se estiraba con
  `background-size: 100% 100%` y a 750 px era «una recta con dos ganchos».
- **Es una máscara sobre la hoja, no una tira dibujada encima.** Una tira en
  `::after` colocada por encima del canto **la recorta `overflow: auto`**, y
  tres de las seis superficies lo llevan: medido, el epitafio y la hoja de
  gente salían con el canto recto mientras la bandeja y la crónica salían
  rasgadas. La máscara no la recorta el desplazamiento. Y recortando la propia
  hoja hay **una sola superficie**: el papel y su grano llegan hasta el canto y
  no hay ningún tono que igualar a mano, que es lo que el listón obligaba
  (`#CBB59A` contra el token `#D9C2A5`).
- **Pero una máscara recorta a sus descendientes**, y la crónica vive anidada
  dentro de la hoja de la carcasa con un velo `position: fixed` desde UI-R3:
  con la máscara puesta, su página quedaba recortada a los 33 px que esa hoja
  mide cuando su contenido está fuera de flujo. De ahí la única excepción, con
  `:has(.chronicle-scrim)`, escrita y medida en `skin.css`.

## 7. Cerrar: una cruz pequeña, o deslizar

Una sección se cierra con **una cruz de 19 px dentro de un toque de 44**, sobre
el papel y no flotando encima del valle, o **deslizando hacia abajo**. Las dos
cosas, en las dos secciones. Lo pidió así el dueño del diseño: «el botón de
close no lo puedes poner arriba a la derecha; tiene que ir como una cruz
pequeñita o si no la opción de poder deslizar hacia abajo».

Con esto desaparece la placa con la palabra `CLOSE` que la crónica tenía arriba
a la derecha, y las tres formas de cerrar que §11 listaba como pendientes se
quedan en una. La salida de U-14 no depende de la cruz: la da la pestaña del
valle, que está siempre a la vista.

Y un detalle que costó una captura: la página de la crónica se vacía con
`replaceChildren()` en cada repintado, así que la cruz se monta con
`replaceChildren(close)` y no con un `append` previo — montada antes, el primer
repintado se la llevaba por delante.

## 8. El valle habla desde un sitio, y nada flota

**Nada transitorio flota sobre el valle.** La bandeja enseña **una** frase bajo
la hoja de roble, con un hueco de **altura fija de dos líneas**, y quién habla lo
decide una cola pura (`src/ui/voice.ts`): hito, suceso, pista, estado, en ese
orden. Lo único que cubre el valle son las tres superposiciones —la encrucijada,
el epitafio y el parte de bienvenida—, y las tres apartan la bandeja con su
clase en la raíz (`html.crossroad-open`, `.epitaph-open`, `.welcome-open`).

Con la altura fija, **nada de lo que hay encima se recoloca nunca**. Eso es lo
que se compró: antes la bandeja crecía cuando la aldea tenía dos cosas que decir,
y cada ronda volvía a ajustar a mano la cartela del hito, la píldora de la
decisión y los círculos de velocidad. La versión anterior de esta sección decía
«lo que flota lee la altura de la bandeja»; el dueño del diseño la llamó una
chapuza y tenía razón: la respuesta no era anclar mejor, era no flotar.

Reglas que salen de ahí:

- **Una frase que no quepa en dos líneas rompe la promesa.** El tope medido es
  ~104 caracteres a 390 px (97 caben, 129 se van a una tercera línea), y lo
  vigila `tests/fast/ui-voice-fits.test.ts` desde el banco. Si hay que enseñar
  más, se parte en dos pasos, no se estira la bandeja.
- **No hay cola.** Un suceso nuevo sustituye al anterior; el anterior queda en la
  crónica. Guardar una lista es el teletipo que §11.6 prohíbe con dos cotas
  medidas.
- **Ni un `setTimeout` para retirar una frase.** La caducidad se mide contra el
  reloj de pared en cada pintado: tiene estado definido en cada instante, que es
  lo que §11.4 pide y lo que un temporizador no da.
- **Lo que pide un gesto se distingue por la tinta, no por un cartón.** La pista
  va en cursiva con su `›` de latón; el hito pone la hoja de roble en oro; la
  decisión aplazada cambia la hoja por el sello de lacre. Tres acentos sobre
  piezas que ya existen, ninguna pieza nueva.
- **El orden dentro de la bandeja es el orden en la pantalla**, así que una frase
  que dice «the line below» va encima de esa línea. Se coloca la pieza donde el
  texto ya dice que está; el texto sale del banco y no se retuerce.

Y un detalle que costó una captura: en una caja `flex` un pseudo-elemento es
**otro ítem**, no texto en línea. El `›` de la pista puesto en el párrafo salía
flotando a la derecha, a media altura; va dentro del `span` de la frase.

## 9. El primer fotograma no es de otro juego

El 2D (`?render=canvas`) es la puerta de vuelta desde G-12, no el primer
fotograma. Mientras Three se descarga, el lienzo 2D va oculto y el hueco espera
en `--ui-ground`; vuelve a la vista sólo si el 3D no llega. Sin eso el jugador ve
un instante el mapa plano de casillas —el dueño del diseño lo cazó en una
secuencia del inicio— y eso no es una transición, es otro juego asomando.

**Y lo que ese cambio destapó, que es la lección útil:** un recorrido que medía
`canvas:visible` estaba midiendo el lienzo 2D ya dimensionado (360 × 560) y
tocando esas coordenadas en el 3D. Con el 2D oculto, el primero visible es el 3D
**recién montado**, que mide `300 × 150` —el tamaño por defecto de un `<canvas>`
antes de que `size()` lo estire— y el «centro» pasó a ser la esquina de arriba.
Cuando una prueba mida un lienzo, **espera a que esté dimensionado**.

## 10. Qué no se inventa

- **Ni un color ni una medida sin muestrear el prototipo.** Los prototipos están
  en `docs/ui-redesign/ui-prototypes/`. Muestrear es abrir el PNG y leer el
  píxel, no mirarlo.
- **Ni una frase.** Todo lo que lee el jugador sale de
  `src/engine/chronicle/bank.en.ts`.
- **Ni un dibujo a mano si está dibujado en el prototipo.** Se calca; cómo, en
  la skill `calcar-iconos`.

## 11. El bucle de comprobación, y el error que más caro sale

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

## 12. Lo que aún no está estandarizado

Se escribe aquí para que no se pierda, no porque esté bien:

Las dos que había aquí quedaron **decididas** el 17 sep 2026, y se escriben
resueltas para que nadie las vuelva a abrir:

- **`BACK TO THE LIST` no es una tercera forma de cerrar.** Se monta sólo
  cuando la ficha se abrió desde la lista (`from === 'people'`), y lo que hace
  es volver a la lista, no cerrar: cerrar lo hace la misma cruz de §7, que la
  ficha ya lleva por vivir en la hoja de la carcasa. Dos verbos distintos, cada
  uno donde significa algo.
- **El ornamento de la hoja de roble se queda sólo en el valle**, donde el
  prototipo 01 lo puso. En la crónica y en la gente ese sitio lo ocupa su propio
  encabezado —la capitular del año, el título de la sección—, que es lo que
  distingue una sección de otra. Va en el estándar que el dueño del diseño
  aprobó en el lienzo de VZ-2.

Y lo que sí queda abierto, con su motivo:

- **El resalte del aldeano seguido está hecho** (VZ-5): se le enciende su
  propia ropa —`dress` clona los materiales por aldeano, así que encender a uno
  no toca a nadie— y lleva un anillo de oro en el suelo, porque la ropa
  encendida sola no se distingue a la distancia a la que se juega. Lo que queda
  es **juzgar la fuerza en el dispositivo**: el arnés no la aísla, porque el oro
  del anillo se confunde con la paja del valle si se busca por píxel.
- **La línea «Today» de la ficha está hecha** (VZ-6), y la cura no fue adivinar
  mejor: fue **preguntar a quien lo sabe**. El dato sale del actor que la capa
  de vida está pintando en ese fotograma (`ActorDoing`, por
  `backend.live.doing`), no del motor, así que la ficha no puede decir que
  alguien acarrea madera mientras se le ve parado en la plaza. **La regla que
  deja:** cuando una frase de la interfaz describa algo que se está viendo, su
  dato sale de lo que lo pinta. Nueve palabras y ninguna inventa un destino —la
  vida sabe qué se lleva y en qué tramo va, no a qué edificio—, y quien ya no
  está no tiene línea.
- **El nombre del caché del service worker se sube a mano.** Los modelos 3D ya
  llevan huella (VZ-6: `assets.ts` les cuelga el `sha256` y `sw.js` precachea
  esas mismas direcciones), así que el caso que costó una tarde —los animales
  rediseñados del 17 sep sin llegar a los dispositivos que ya habían visitado—
  no puede repetirse. Lo que sigue a mano es el casco y el documento.

Y una trampa nueva de VZ-6, que vale para cualquier adorno de la bandeja:

- **Un adorno que pasa a ser botón tiene que recuperar el toque.** La hoja de
  roble del ornamento lleva `pointer-events: none` desde UI-R2 por un motivo
  medido: decoración que se traga los toques del valle. VZ-03 convirtió ese
  mismo hueco en el **sello** de una decisión aplazada —el único camino de
  vuelta a esa decisión— y la regla no se revisó: tocarlo no hacía nada y el
  lienzo 3D se comía el toque. La excepción va atada a `:disabled`, que es lo
  que `shell.ts` pone con la hoja. Y **sólo lo caza un click de verdad**: el
  botón sale visible, habilitado y en su sitio en cualquier medida.
