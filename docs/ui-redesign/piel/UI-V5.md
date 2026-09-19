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
`tools/shots/valley.shots.ts`, que mide la caja de cada botón: ninguna captura lo habría
enseñado. Apilada encima del rincón la tira cabe de sobra —cinco de 44 más los
huecos son 236 de los 390 que hay—, así que los dos píxeles no hacían falta para
nada.

## Medido

Semilla 11, `bundle-game` + `shot.mjs --open title`, sin errores de página. Las
8 pruebas de `ui-title.test.ts` en verde —el número del valle, el techo del año,
el interruptor recordado— y el recorrido del menú y el de las cuatro velocidades
también.

---

# UI-V5b · La lista de la gente

El último trozo sin vestir, y el segundo sin prototipo: el 03 dibuja **una
ficha**, no una lista. Así que, como el menú, se diseña — con el vocabulario que
la ficha acababa de dejar puesto:

- la fila es una **tira de pergamino con el canto rasgado**, con los cuatro
  recortes alternados (el mismo truco que los chips de la cabecera: con uno
  solo, veintisiete filas se leen como veintisiete copias y el borde deja de
  parecer papel);
- a la izquierda, **el medallón con la inicial**, el mismo de la ficha en su
  talla pequeña — tocar la fila abre esa ficha, y la inicial es lo que dice que
  es la misma persona;
- el nombre con la edad detrás en la misma línea, exactamente como la placa de
  la ficha: son la misma persona vista dos veces, y leerla igual en las dos
  ahorra volver a situarse;
- el oficio en cursiva y los rasgos debajo.

**Lo que se decidió no traer de la ficha, y es la única decisión de la ronda:**
los rasgos se quedan en **texto** y no como chips. En la ficha hay tres chips y
son medio dibujo; aquí puede haber veintisiete filas con tres chips cada una, y
ochenta y un recuadros convierten una lista que se recorre con el pulgar en un
muro. Una lista tiene que seguir siendo una lista.

Nada del comportamiento cambia: el filtro sigue siendo nombrados y presentes en
el orden del motor, la cabecera sigue aclarando que la cifra global es mayor, y
la identidad sigue viajando por `id` y nunca por el nombre (AC-9: dos aldeanos
pueden compartir nombre). 52 pruebas de la lista y el recorrido de U-14, en
verde.

---

# UI-V5c · La encrucijada, y la fuga de la cabecera

Las dos cosas que salieron de la captura del año 37 al ir a verificar el
documento sellado de la crónica.

## La placa de fecha vacía sobre la decisión

No era el velo comiéndose una tinta floja. `crossroad.ts` oculta la cabecera
mientras se decide —bien, la pantalla entera es de la decisión, §11.2— pero su
lista nombraba **los elementos de U-01**: `.valley-date`, `.valley-time`,
`.valley-vitals`. Y UI-V1 metió cada uno **dentro de una placa nueva**. Se
ocultaba el texto y la placa se quedaba: en la captura salía la placa de fecha
vacía, con su arco del sol, flotando encima de la decisión. Los dos círculos de
velocidad, igual: la lista tenía `.valley-speed-badge` —el de la derecha— pero
no el grupo, así que el de pausa asomaba detrás de las tarjetas.

Ahora se ocultan los contenedores de la piel (`.hud-plate-date`,
`.hud-speed-cluster`, `.hud-compact-header`) y no sólo sus textos.

**La lección, que vale para cualquier ronda que envuelva algo:** una lista de
«qué esconder» escrita con nombres de elementos caduca en cuanto alguien mete
esos elementos dentro de otra cosa, y caduca **en silencio**. Nada falla; sólo
aparece una placa vacía que nadie mira hasta que sale en una captura.

## La decisión, como documento sellado

`plan-piel.md` §3.5, que no tiene prototipo propio y se viste con el lenguaje
del documento sellado del prototipo 02:

- **El velo oscuro se va.** Estaba por una razón medida y buena —el suelo del
  valle es claro y el precio perdía contraste contra el prado— pero era la
  solución del juego de antes del rediseño. Con una página de pergamino debajo,
  el problema desaparece de raíz, y el valle se queda a la vista con un velo del
  18 %: atenuado y no tapado, que es lo que §11.2 pide.
- La página sube desde abajo con una franja de fusión de 64 px, **hermana de la
  página y no un fondo suyo**. El primer intento puso el degradado y el color
  opaco en el mismo elemento: el color rellena la caja entera, el degradado deja
  de tener nada que fundir, y salió una banda de pergamino vacía de 300 px
  encima del título. Es el mismo reparto que la crónica ya tenía, por un motivo
  hermano.
- Sello de lacre a la izquierda del título, título en `--skin-red-ink`, cuerpo
  en EB Garamond 17, y cada opción una tarjeta de pergamino con el canto rasgado
  —los cuatro recortes alternados— con el verbo en Cinzel y el precio en cursiva
  al lado.
- La píldora de la decisión aplazada pasa a chip de pergamino con el sello, y
  **baja debajo de la fila de cifras**: con el sello mide 199 px y arriba a la
  derecha choca con la placa de fecha, que ocupa de x 27 a x 361.

### Una salvedad del plan, medida

§3.5 pide el precio «al lado» del verbo. Hay precios de cuarenta caracteres
—«the wood does not come back in a lifetime»— y a 390 px no caben en la misma
línea. La fila envuelve: el corto se queda al lado y el largo baja solo. Lo que
UI-R5 exige —mismo bloque, mismo toque, siempre visible— se cumple en los dos
casos.

## Medido

Semilla 11, año 37, con bundle propio en `artifacts/graphics/UI-V3c/game` para
no pisar el de la otra sesión:

| Qué | Medida |
|---|---|
| Precios en pantalla | 3 de 3, en y 633, 717 y 793 de 844 |
| ¿Hace falta desplazar? | No: `scrollHeight` 413 = `clientHeight` 413 |
| Piezas de cabecera ocultas | placa de fecha, círculos, regleta y cifras |
| Solape de la píldora | ninguno, ni con la fecha ni con las cifras |

**Lo que no cubre ninguna prueba automática:** la jornada de la encrucijada de
`tools/shots/valley.shots.ts` es un fallo declarado desde antes de esta ronda —«ya no se
planta a los 58 s de reloj virtual en esa semilla»— así que no valida esta
maquetación. Ahora hay con qué arreglarla, y queda anotado: `openAtYear` es
`foundGame` más `run(…, 'prudent')`, y con eso se predice fuera del navegador en
qué año queda una pendiente, en vez de fijar un número de segundos a ojo.
Semilla 11 año 37, semilla 7 año 25 y semilla 43 años 13, 39 y 45 sirven.

## Y el epitafio sigue pendiente

§3.5 lo cubre en la misma frase —la misma página, con la capitular en
`--skin-wood-plaque` en vez de rojo— y no se ha tocado: no ha salido en ninguna
captura, y esta ronda era para lo que sí.
