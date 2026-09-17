# UI-V9 · Un estándar, y no un catálogo de excepciones

Ronda corta y de fondo. Sale de tres frases del dueño del diseño probando la
demo en su tablet, y las tres dicen lo mismo desde ángulos distintos:

> «No es tan difícil. **Tienes que revisar el trabajo con una simple captura.**»

> «No entiendo por qué sigue cortado, y además **no usamos el mismo que tenemos
> en la otra pantalla funcionando**.»

> «Los fondos que hay detrás de los textos, **usa siempre el mismo**; el de la
> crónica es el bueno. **No estamos estandarizando las cosas, por favor.** Si lo
> necesitas, crea una skill con unas directrices. Hay que tomar un estándar.»

El diagnóstico es concreto y es mío: cada ronda vistió **una** pantalla, tomando
sus decisiones del prototipo de esa pantalla. Ninguna decisión estaba mal por sí
sola. El conjunto sí: dos papeles para lo mismo, dos cabeceras para lo mismo y
tres formas de cerrar.

## 1. Una cabecera, la del valle

Había dos piezas para el mismo trabajo: la cabecera del valle (placa de fecha con
el arco del sol y cuatro chips) y una **compacta** que sólo salía en la crónica,
con la fecha partida en dos líneas y las cifras entre filetes. Venía del
prototipo 02 y estaba topada a 334 px con 183 para cuatro cifras, así que la
crónica enseñaba **tres cifras de cuatro** mientras el valle enseñaba las cuatro.

En UI-V8 traté de arreglar el tope. Era arreglar la pieza equivocada: la compacta
se retira entera —DOM, CSS y el interruptor de ruta— y las cuatro pantallas
llevan la misma cabecera. Con ella se va también un duplicado que llevaba desde
UI-V1: **cada cifra vivía dos veces en el DOM** y `paintVital` escribía el mismo
número en sus dos casas. Ahora vive una vez.

Lo único que la placa hace distinto con una hoja abierta es **ceder sitio al
botón de cerrar**, y sigue siendo la misma placa: 118 px de reserva —27 de
margen, 71 del botón, 8 de aire, 12 de margen— la dejan en 272 a 390 px y en sus
334 a partir de 452. Lo que cede es el arco del sol, que tiene `viewBox` y
reescala limpio hasta 56 px; la fecha es información y no se toca. Medido: a 390
la placa acaba en x 299 y el botón empieza en 307, y el texto entra entero en las
dos pantallas.

## 2. Un papel para leer

La hoja de la gente, la ficha y las órdenes se pintaba con `--ui-paper-bg`, un
token de U-01 **anterior al rediseño** y sin textura, mientras la crónica, la
decisión y la portada usaban `--skin-page` con su grano. Eso es lo que el dueño
del diseño estaba viendo.

Arreglado dándole la clase, no el color: `ui-shell-content skin-paper
skin-paper--page`. Es la diferencia entre usar la pieza y copiar sus valores; lo
segundo crea la segunda verdad que mañana se queda atrás.

Los cuatro papeles quedan con un trabajo cada uno, y está escrito en la skill:
`--page` toda superficie de lectura, `--parchment` las placas e instrumentos
sobre el prado, `--parchment-deep` un objeto encima de una superficie (chips,
filas, tarjetas, la bandeja), `--parchment-aged` sólo el pulsado.

## 3. El canto, en tres piezas

Y aquí está la lección de la ronda, porque la corrección del dueño del diseño era
sobre el método y no sobre el canto.

En UI-V8 verifiqué la maquetación **midiendo cajas** —placa x 27 ancho 334,
columna x 425 ancho 390, todas correctas— y subí un canto que en su tablet era
una recta con dos ganchos en las puntas. Las medidas eran verdad y el resultado
era malo: la tapa se estiraba con `background-size: 100% 100%`, así que los 31 px
de flecha repartidos en 750 px de ancho dejaban de ser una curva. **Una pieza
cuya forma cambia con el ancho no es un estándar.**

Se corta en tres, como un borde de nueve piezas: hombro izquierdo de 80 px,
hombro derecho de 80 px —los mismos 80 en los que el prototipo resuelve la
subida— y en el medio una franja llana, que es lo único que se estira y que al
ser horizontal no se deforma. La curva es ahora idéntica a 390 y a 1240, y lo que
crece es la meseta, que es lo que le pasa a un palo más largo.

De paso, los círculos de velocidad dejaban de estar mordidos por el papel: el
canto sube 37 px sobre la bandeja y el grupo mide 148 px pegado al borde
derecho, así que caía justo encima. Suben a 50 px, que son esos 37 más los 13 de
hierba que el prototipo deja entre los círculos y la madera (medido: de 12 a 19
según el círculo).

## 4. La skill

`.claude/skills/piel-del-valle/SKILL.md`, que es lo que pidió. Lleva la directriz
de maquetación, la tabla de los cuatro papeles con su trabajo, la cabecera única,
la regla de mínimos en vez de topes, las tipografías, el canto en tres piezas, lo
que no se inventa nunca, y **el bucle de comprobación con la captura dentro**:

1. `tsc --noEmit` antes de empaquetar, porque `bundle-game.ts` imprime éxito
   aunque su vite interno haya fallado y empaqueta el `dist/` anterior.
2. Empaquetar con salida propia, para no pisar a la otra sesión.
3. **Capturar y mirar, a 390 y a 750.** 750 es su tablet.
4. Recortar la pieza y ponerla al lado del prototipo en la misma imagen.
5. Lint y las pruebas rápidas de interfaz.

Y una sección final con lo que **aún no** está estandarizado, escrito para que no
se pierda: tres formas de cerrar (un `CLOSE` con texto en la crónica, una `×` en
la hoja de gente, `BACK TO THE LIST` en la ficha) y el canto, que existe en la
bandeja del valle y no en las hojas.

## Verificación

Typecheck y lint limpios, 54 pruebas rápidas de interfaz en verde, y los cuatro
recorridos de maquetación más el de la encrucijada (fallo declarado de antes de
esta ronda) sin cambio. Capturado y **mirado** a 390 × 844 y 750 × 1200 en las
cuatro pantallas: la misma cabecera con las cuatro cifras en todas, el mismo
papel bajo el texto, sin solape entre placa y botón, y sin errores de página.
