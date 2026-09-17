# UI-V4 · La ficha de una persona

El prototipo 03, con dos reglas que lo recortan: **el retrato no existe** y **la
mitad del parentesco que dibuja tampoco**.

## Lo que se entrega

| Pieza del prototipo | Cómo |
|---|---|
| Medallón con retrato | medallón con **monograma** (`.skin-medallion`, del kit) |
| Nombre · edad en versalitas | `.skin-inscription` a 17 px, en una línea |
| Oficio en cursiva | `--skin-font-read` en cursiva, del banco (`role.*`) |
| Tres chips de rasgo | `.skin-chip`, del kit |
| Helecho del canto derecho | **calcado** (`skin-ornaments.py`, prototipo 03) |
| Tira de parentesco con dos medallones | igual, con el lazo cálido a la izquierda y el frío a la derecha |
| Corazón entre los dos | dibujado a mano: es geometría de una línea |
| FOLLOW en madera, LIFE STORY en pergamino | `.skin-button--wood` / `--parchment`, que se llamaron así por este prototipo |

## Las dos cosas que el prototipo pide y no hay

**El retrato.** El prototipo pinta caras dibujadas y en el proyecto no existe
ni una. Inventarlas sería o un dibujo que no es de nadie repetido veintisiete
veces, o veintisiete dibujos que nadie ha hecho. El medallón lleva la inicial,
que distingue, es honesta y aguanta el día que haya retratos: entonces cambia lo
que va dentro del aro y no se mueve una línea de `person-card.ts`.

**La mujer.** «Ymma · wife» no se puede enseñar porque **el motor no guarda
matrimonios**: la boda de R-1 es un suceso, no un vínculo. Lo que sí guarda es
`parentIds` —y de ahí los hijos— y `opinions` entre los que tienen nombre. Con
eso se sirve la misma idea, un lazo cálido y uno frío con su palabra, sin
escribir un dato que nadie ha medido. Las seis palabras nuevas del banco son
exactamente los seis vínculos que existen: madre, padre, hijo, hija, amigo,
rival.

**Y la sangre manda sobre la opinión**, que es la decisión de diseño de la
ronda: el prototipo pone en el lazo cálido a la mujer, o sea a lo que no cambia
de semana en semana, y una opinión sí cambia —`driftOpinions` la mueve cada
tick—. De los dos vínculos que hay, el parentesco es el que se parece a lo que
el prototipo enseña, así que un hijo desplaza a un amigo.

## Lo que falta del prototipo, y por qué no se ha hecho

**La línea «Today: carrying timber to the mill».** Necesita saber qué está
haciendo **esa** persona ahora mismo, y eso sólo lo sabe la capa de vida
(`src/render3d/life/`), que el dueño del diseño está reescribiendo ahora mismo
—«estamos cambiando la IA de los aldeanos»—. Derivarla del motor (oficio +
estación + órdenes) daría una frase que **puede contradecir al cuerpo** que se
ve en el valle: la ficha diría que acarrea madera mientras el aldeano está
parado en la plaza. Se deja fuera a propósito hasta que esa capa tenga una
respuesta que dar; lo que el prototipo pone debajo del nombre y la ficha sí
puede afirmar —el oficio— está.

**El aro de luz bajo la persona y el contorno de oro en su casa.** Son del
renderer, no de la interfaz, y `src/render3d/` no se toca.

## El fallo de esta ronda que merece estar escrito

`display: flex` en el propio elemento **le gana al `[hidden] { display: none }`
del navegador**. Los tres bloques que la ficha enciende y apaga por atributo
—la ficha entera, la tira de parentesco y la fila de chips— se quedaban
visibles con `hidden` puesto, y se vio en una captura: la tira de alguien sin
ningún lazo salía como una banda de papel vacía de 12 px, diciendo «no tiene a
nadie» cuando lo que pasa es que nadie le tiene todavía una opinión fuerte. Un
`[hidden]` explícito por cada uno lo cierra.

Y dos de especificidad, de la misma familia: `index.html` (U-01) viste
`.valley-panel-follow button` —una clase y un elemento— y eso le gana a
`.skin-button--wood`, que es una clase sola, sin que importe el orden de carga.
El botón de seguir salía de pergamino claro, o sea los dos botones iguales, y en
el prototipo el contraste entre los dos es lo que dice cuál es la acción
principal.

## Medido

Semilla 11, año 30, `bundle-game` + Playwright sobre `file://`, sin errores de
página. La ficha de Hereward (55 inviernos, woodward, hardy/proud/cunning) trae
su tira con Beornwynn como rival, y la vida abre nueve recuerdos. 14 pruebas
nuevas en `tests/fast/ui-person-card.test.ts` sobre el modelo puro: el umbral de
la opinión, la sangre por delante, nadie dos veces, y qué se calla de quien ya
no está.
