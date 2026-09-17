# UI-V5 · El menú de inicio

**La única pantalla de esta tanda sin prototipo.** Los tres PNG de
`ui-prototypes/` no la dibujan y `plan-piel.md` no le dedica sección: quedó
fuera porque no había nada que copiar. El dueño del diseño la pidió igualmente
—«aunque no tenemos diseño, pero habrá que hacerlo»—, así que esto no se calca:
**se diseña**. Lo único que no es invención es el vocabulario, que sale entero
del kit de UI-V0 y de lo que los tres prototipos ya hacen.

## La idea: la cubierta de la crónica

Este juego es la crónica de un valle. La pantalla con más peso de todas es una
página de pergamino con su capitular, y esta pantalla viene **antes** de que el
valle exista. Así que es lo que hay antes de la primera página: la cubierta
cerrada, sobre la mesa.

De ahí las tres decisiones, y ninguna es un gusto suelto:

1. **El fondo es madera** (`--skin-wood`), la de la barra de navegación, no la
   noche de U-01. En los prototipos 02 y 03 la madera ya significa «el mueble
   donde esto vive»; la noche no significaba nada.
2. **Encima, una hoja de pergamino con el canto deshilachado**
   (`--skin-deckle-sheet`), la misma textura que la página de la crónica y la
   misma inclinación mínima que las tarjetas. Una hoja, no un cuadro de
   diálogo.
3. **En el centro, el sello de lacre con el roble** (`.skin-seal`). Es la
   primitiva que el plan reservó para «documento por abrir» (§3.2) y aquí es
   literal: lo que se abre es la crónica de un valle que todavía no existe. Es
   el único adorno y hace de ancla del hueco que esta pantalla tiene en medio.

El filete con su palmeta bajo el título es el mismo que remata la cabecera de un
año en la crónica, calcado del prototipo 02. Un remate de la casa y no uno
nuevo: en una pantalla sin prototipo, todo lo que se dibuja sale de lo que las
otras ya dibujan.

Y el reparto de los botones dice cuál manda, como en el prototipo 03: **madera
el de fundar**, que es para lo que esta pantalla existe, y pergamino el de
continuar y el de sacar otro número.

## Lo que no cambia

Ni un texto, ni el orden de los controles, ni qué configura esta pantalla: el
número del valle y nada más (§11.10), con el año detrás del interruptor de
taller (U-10b). Es una ronda de piel.

## Dos arreglos que salieron al mirarla

**La gota de lacre.** `.skin-seal` usaba el recorte rasgado de un chip y salía
un cuadrado rojo con las esquinas mordidas. El sello del prototipo 02 es cera
derramada, o sea un círculo con el radio ondulado: `--skin-seal-blob` lo genera
por radio como los deckle, con 28 puntos y dos ondas encima. Arregla también el
documento sellado de la crónica, que usa la misma primitiva.

**La pista del taller se veía con el taller cerrado.** Al reordenar el DOM quedó
colgada del contenedor de acciones en vez de dentro de su fila, así que la
primera captura salía explicando el interruptor de taller a quien no lo ha
abierto.

## Y una regresión que el recorrido cazó, que es para lo que están

Bajé el ancho de los botones de la regleta de velocidad a 42 px para ganar dos
píxeles, y eso **rompe el mínimo táctil de 44** de `design.md` §11.3. Lo cazó
`valley.shots.ts`, que mide la caja de cada botón: ninguna captura lo habría
enseñado. Apilada encima del rincón la tira cabe de sobra —cinco de 44 más los
huecos son 236 de los 390 que hay—, así que los dos píxeles no hacían falta para
nada.

## Medido

Semilla 11, `bundle-game` + `shot.mjs --open title`, sin errores de página. Las
8 pruebas de `ui-title.test.ts` en verde —el número del valle, el techo del año,
el interruptor recordado— y el recorrido del menú y el de las cuatro velocidades
también.
