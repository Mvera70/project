# El final de una partida — la lápida y la hoja de cuentas

**Lo pidió el dueño del diseño el 18 sep 2026**, con las palabras que mandan
sobre este plan:

> «Cuando la partida finalice, es algo bastante importante que haya una animación
> de game over o algo así que se superponga encima de la pantalla con una letra
> así, estilo medieval, siguiendo el estilo que tenemos. Y estaría muy, muy, muy
> interesante poder ver una serie de estadísticas, rollo casas construidas,
> población máxima alcanzada, nacimiento, muerte. Una serie de estadísticas que
> estén guay de ver y que cada partida al final tenga ese resumen, que sea muy
> llamativo y sea muy fácil de comparar.»

Es la fila **F3** de `plan-meta.md`, que hasta hoy decía sólo «la pantalla del
final». Aquí está el detalle. Tres cosas distintas, y conviene separarlas
porque las hace gente distinta: **el momento** (la superposición con su letra),
**la hoja de cuentas** (las estadísticas de esa partida) y **el cronicón** (las
hojas de todas las partidas, una al lado de otra).

---

## 0 · Lo que ya hay, para no rehacerlo

- **La pantalla existe**: `src/ui/screens/epitaph.ts` (M-25, vestida en VZ-04b).
  Es una hoja de pergamino que sube desde abajo con el valle atenuado detrás,
  el sello de lacre, un título en tinta roja («The valley is empty» / «The
  valley was taken»), la causa con su año, una línea de resumen —«43 years. 61
  people at its height»— y dos botones: leer la crónica y empezar otra vez.
  **Es la base de todo lo de abajo, y no se sustituye: se le añade.**
- **El estilo está decidido y escrito** (`src/ui/redesign/tokens.css`,
  `skin.css`): la inscripción va en **Cinzel** (`--skin-font-voice`, el ANNO,
  las cifras, los nombres) y lo que se lee seguido en **EB Garamond**; la tinta
  roja de los títulos, el oro de los filetes, la **capitular** roja con letra de
  oro (`.skin-capital`, la del ANNO de la crónica) y el sello. «Letra medieval
  siguiendo el estilo que tenemos» **es Cinzel en tinta roja con la capitular**,
  y no hace falta una fuente nueva.
- **Los datos están casi todos**, y es la buena noticia de este plan:
  - `state.peakPeople` se lleva desde siempre (`sim.ts`).
  - La crónica guarda cada nacimiento, muerte, llegada, marcha, obra levantada
    y obra perdida con sus cabezas, y `welcomeDigest` (`chronicle/digest.ts`)
    ya sabe contarlos sobre una ventana de ticks: **contarlos sobre la partida
    entera es la misma función con la ventana abierta.**
  - `state.acts` guarda lo que el jugador dio (medios, la corona) y, desde B4,
    **el parte de cada batalla** (`kind: 'battle'`: cuántos del clan cayeron,
    cuántos de los nuestros, si entraron). `state.threat.raids` cuenta los
    asaltos. `state.history` cuenta las decisiones tomadas.
  - Al acabar, `archiveGame` (`engine/save.ts`) guarda en `save.archive` cada
    partida pasada: semilla, tick del final, causa, pico de población, la
    crónica entera y las ruinas. **Comparar partidas es leer esa lista**, y ya
    está en el guardado del jugador, en su dispositivo. Pesa **387 a 400 kB por
    partida**, medido en tres semillas de ochenta años, y de ahí sale la
    decisión 3 de §5.

Lo que **no** hay: ninguna animación del final (la hoja sube y ya), ninguna
estadística más allá de la línea de resumen, y ninguna pantalla que ponga dos
partidas una al lado de la otra.

---

## 1 · El momento — la lápida

**Qué se ve.** La partida acaba a mitad de una semana y el juego sigue pintando
el valle. Lo que sube no es una hoja: primero es **la inscripción**.

1. El valle se queda quieto y se atenúa —no se tapa: se ve la aldea tal como
   quedó, que es parte de lo que se cuenta— y los mandos de velocidad se van.
2. En el centro, sobre el valle, **la capitular** roja con el oro (la misma
   `.skin-capital`, a tamaño de pantalla, 96–128 px) con la letra de la causa:
   **T** de *taken*, **E** de *empty*. Entra con un solo movimiento —se asienta
   como un sello sobre lacre, un poco más grande y luego a su tamaño— y no da
   vueltas ni brilla: la piel de este juego es papel y madera.
3. Debajo, **la inscripción en Cinzel**, versales con el espaciado de
   inscripción (`--skin-track-inscription`), en tinta roja, que se escribe
   **letra a letra** como se graba: «THE VALLEY WAS TAKEN» · «ANNO 43». Es lo
   más cerca de «game over» que este juego puede decir sin salirse de su
   registro, y es lo que dice: la decisión 1 de §5 está cerrada.
4. Un segundo de silencio, y **entonces** sube la hoja de pergamino de siempre
   (`epitaph.ts`), con la inscripción bajando hasta convertirse en su título.
   Lo que ya está hecho no cambia de sitio: cambia lo que pasa antes.

**Y con `prefers-reduced-motion`** no hay letra a letra ni sello: aparece
todo, como hasta ahora. La animación es un adorno del momento, no el momento.

**Cómo se hace.** Todo en `epitaph.ts` y una clase en `skin.css`; nada del
motor. Dos piezas: la inscripción (`.epitaph-inscription`, posicionada sobre el
valle, con `@keyframes` para el sello y un `clip` o `--letters` para el
grabado) y un retardo antes de montar la hoja. La causa ya viene en
`ArchivedGame.cause`, así que la letra y la frase salen del banco:
`epitaph.inscription.<cause>` y `epitaph.initial.<cause>` en `UI_BANK`.

**Medida:** captura de las cuatro causas (`npm run shot` con `&ended=1`, que
ya existe) y una toma de la animación con `film.mjs`. **Dificultad: media
(Sol)**, con el diseño del movimiento revisado por Astra si hace falta.

---

## 2 · La hoja de cuentas — las estadísticas de esa partida

**Qué se ve.** Sobre la hoja de pergamino, entre la causa y los botones, **una
página de libro de cuentas**: tres cifras grandes arriba, en Cinzel, que son
las que un jugador va a comparar de un vistazo, y debajo dos columnas en
Garamond con la cuenta larga, como una relación de un mayordomo. Cifras
tabulares, filetes finos de oro entre filas, y un ornamento de los que ya
dibuja `chronicle-ornaments.ts` a cada lado del título.

**Las tres grandes** (una fila, tres cajas):

| Cifra | De dónde sale |
|---|---|
| **Los años** que duró el valle | `yearOf(endedTick)` |
| **La gente en su mejor momento** | `peakPeople` |
| **Los asaltos que aguantó** | los partes con `held`, o `threat.raids` menos el que lo tumbó |

La causa **no** está entre las tres, y es deliberado: ya es el título de la
lápida y una etiqueta no se compara (decisión 2 de §5).

**La cuenta larga** (dos columnas, ocho a doce filas; las marcadas con ★ salen
de la crónica con `welcomeDigest` sobre la partida entera, las marcadas con ◆
del estado en el momento de acabar, y las marcadas con ● de `state.acts`):

| Fila | Fuente |
|---|---|
| Nacieron ★ | `kind: 'birth'`, cabezas |
| Murieron ★ | `kind: 'death'` + `'extinction'` |
| Llegaron por el camino ★ | `kind: 'arrival'` |
| Se marcharon ★ | `kind: 'departure'` |
| Obras levantadas ★ · y **casas** en pie al final ◆ | `kind: 'built'` · `buildings` con `lostTick === null` |
| Obras perdidas ★ | `kind: 'lost'` |
| Tramos de muralla ◆ | `palisade` + `wall` en pie |
| Decisiones tomadas ◆ | `history.length` |
| Lo que se dio ● | `acts` con `kind: 'means'` y `done` |
| Asaltos sufridos ◆ · aguantados ● | `threat.raids` · partes con `held` (`raid.held` en la crónica) |
| Saqueadores abatidos ● · caídos defendiendo ● | suma de `slain` · suma de `lost` de los partes de batalla |
| Reyes ◆ | quién llevó la corona, si alguien |
| La primera piedra, en qué año ★ | primer `built` de un tipo de piedra |

**Y esto pide un campo nuevo, y es el único cambio del motor de este plan.**
La crónica sobrevive en el archivo, pero el estado no: al acabar, `buildings`,
`threat.raids`, `history` y `acts` se quedan en la partida que se cierra y el
archivo sólo guarda la crónica. Así que las filas ◆ y ● **hay que calcularlas
en el momento de archivar y guardarlas**: `ArchivedGame` gana un `ledger` (una
docena de números y nada más), `archiveGame` lo rellena, y `SCHEMA_VERSION`
sube con su migración —las partidas archivadas de antes se quedan con un
`ledger` calculado sólo de la crónica, que es lo que se puede saber de ellas—.
La función que lo calcula es pura y vive en `derive/ledger.ts`:
`ledgerOf(state): Ledger` para la partida que acaba y `ledgerOfArchive(game)`
para las de antes. **Una prueba por fila**: que cada número cuadre con lo que
la crónica y el estado dicen, en tres semillas.

**Dificultad:** los datos, **baja-media (Luna o Terra)**, con el contrato de
`Ledger` escrito arriba y la prueba fila a fila; la página, **baja (Luna)**
sobre la piel que ya hay. La migración del esquema la revisa Sol.

---

## 3 · El cronicón — comparar partidas

**Qué se ve.** Desde la hoja del final —y desde el menú de inicio, que ya
existe (U-10)— se abre **el cronicón**: una página por partida pasada, la más
reciente arriba, cada una con sus tres cifras grandes y su causa, y un filete
de oro en la cifra que **es la mejor de todas** (más años, más gente, más
asaltos aguantados). Tocar una abre su hoja de cuentas entera, con su crónica,
que ya se guarda. Es la manera de que «fácil de comparar» sea una pantalla y no
una memoria.

**De dónde sale:** `save.archive` tal cual. No hay nada que guardar que no se
guarde ya; lo único es que las partidas archivadas antes de este plan tendrán
sólo las cifras de crónica (§2).

**Cuántas se guardan.** Hoy el archivo crece sin tope y eso no aguanta: medido,
una partida archivada pesa **387 a 400 kB** y el guardado vive en
`localStorage`. La decisión 3 de §5 lo cierra en tres tamaños —hoja de cuentas
de todas, crónica entera de las tres últimas, titulares de las demás— y la poda
va en esta fase.

**Dificultad: media (Sol)** — una pantalla nueva con la piel, y la poda del
archivo.

---

## 4 · El orden, y qué depende de qué

```
F3a · el libro de cuentas + ArchivedGame.ledger    HECHO 18 sep 2026
F3b · la hoja de cuentas sobre epitaph.ts          HECHO 18 sep 2026
F3c · la lápida: capitular e inscripción grabada   HECHO 18 sep 2026
F3e · captura de las cuatro causas                 HECHO 18 sep 2026
F3d · el cronicón, desde la hoja y desde el menú   (Sol)            ← F3a
F3f · la hoja como imagen para compartir           (Sol)            ← F3b · sin prioridad
```

**Lo hecho el 18 sep 2026, y lo que costó.** F3a no subió el esquema: el
`ledger` es opcional y lo que falta se recuenta de la crónica, así que una
partida guardada antes carga sin migración. Y **casi todo sale de la crónica**
—sólo «qué quedó en pie» necesita el estado del último día—, que es lo que hizo
este plan barato.

Tres cosas las encontró una captura, y ninguna prueba las habría visto:

- **La inscripción no se leía.** Tinta roja sobre tejados claros con el velo al
  34 %: ilegible. Se arregla con el material que ya está —una banda de
  pergamino, que es lo que este juego hace con el texto que va sobre el valle,
  igual que la cinta de la fecha— y el velo al 52 %.
- **El HUD seguía puesto.** Un final con la cinta de la fecha y la fila de
  cifras encima no es un final: es una pantalla más. Se esconde mientras dura
  la lápida.
- **La línea de resumen repetía la hoja.** Decía «39 years. 71 people at its
  height» justo encima de una hoja cuyas dos primeras cifras grandes son 39 y
  71. Se quita del documento y la clave se queda en el banco.

Y una que encontró la prueba: **la capitular no puede ser la inicial de la
inscripción**, porque las cuatro empiezan por «THE» y las cuatro capitulares
serían una T. Es la letra de la palabra que nombra el final —**T**AKEN,
**E**MPTY, **L**AST, **B**ROKE—, que es lo que hace un manuscrito iluminado.

F3a y F3c no dependen una de otra y pueden ir a la vez. Lo que más se ve por
menos es **F3c + F3b**: el momento y los números de esa partida. El cronicón va
detrás porque necesita partidas que comparar, y hasta que un jugador no lleve
tres o cuatro no se nota.

---

## 5 · Las cuatro decisiones, cerradas

El dueño del diseño dio el plan por bueno y pidió cerrarlo sin preguntar más
(18 sep 2026: «si necesitas hacerme alguna pregunta para cerrar el plan,
simplemente cierra el plan»). Quedan cerradas así, cada una con su motivo, y
cualquiera de las cuatro se puede revocar con una frase suya.

**1 · La inscripción no dice «GAME OVER». Dice la causa y el año.**

«THE VALLEY WAS TAKEN · ANNO 43», en versales de Cinzel y tinta roja, con la
capitular de su letra. El motivo es una regla del proyecto y no un gusto: nada
de lo que lee el jugador se sale de la ficción —la crónica, la interfaz y los
nombres están todos dentro de ella— y «game over» es la única frase de todo el
juego que hablaría del juego y no del valle. La lápida **es** el game over: la
pantalla se para, el valle se atenúa y una inscripción se graba encima. Si algún
día se quiere el letrero literal, cabe en pequeño bajo la inscripción sin tocar
nada de lo demás.

**2 · Las tres cifras grandes son años, gente en su mejor momento y asaltos
aguantados.**

La causa **no** ocupa una de las tres, y es por lo que se pidió: «muy fácil de
comparar». La causa es una etiqueta y no se compara —ya es el título de la
lápida, tres centímetros más arriba— así que gastar un tercio de la fila en
repetirla sería gastarlo en nada. Con tres números se comparan dos partidas de
un vistazo, y el tercero es el de la fase 4: **cuántas veces aguantó el cerco**
es de lo que un jugador presume.

**3 · El archivo guarda la hoja de cuentas de todas las partidas, la crónica
entera de las tres últimas, y sólo los titulares de las demás.**

Medido en tres semillas de ochenta años: una partida archivada pesa **387 a
400 kB**, de los que la crónica son 317 a 330 (2 500 a 2 700 entradas). El
guardado vive en `localStorage`, que da unos cinco megas para todo **y tiene que
caber además la partida viva**, que pesa lo mismo. Diez partidas enteras son
cuatro megas y se estrella contra la pared.

Así que tres tamaños y no dos:

| Qué se guarda | Pesa | De cuántas partidas |
|---|---|---|
| La hoja de cuentas (`ledger`) | menos de 1 kB | **de todas**, sin tope |
| La crónica entera | 320 kB | de las **tres últimas** |
| Sólo los titulares (peso 3) | **47 a 64 kB** (338 a 459 entradas) | de las demás |

Los titulares son exactamente lo que §9.2 reserva para «el momento del siglo»
—la fundación, la peste, la sucesión, el cerco cerrado, el asalto, el final— o
sea que una partida vieja conserva **su historia** y pierde el día a día. Con
veinte partidas eso es un mega largo y no se toca el tope del navegador.

**4 · La hoja como imagen para compartir: sí, y va última.**

Entra como **F3f**, después de todo lo demás y sin prioridad: la página tiene
que existir antes de poder fotografiarla, y el juego ya sabe hacerlo
(`npm run shot` fotografía el juego empaquetado, así que el mecanismo está).
No se diseña ahora.

## 6 · Lo que no es de este plan

- La crónica ilustrada del final ya existe (botón «Read the chronicle»).
- Las estadísticas **durante** la partida (una pantalla de cifras en vivo) son
  otra cosa y otra fila; esto es el final.
- El nivelado de cuánto dura un valle o cuánta gente llega es G4 y no cambia
  por enseñar los números.
