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
    está en el guardado del jugador, en su dispositivo.

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
   registro, y **qué dice exactamente es decisión del dueño** (ver §5).
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
| **Cómo acabó** | `cause`, con su palabra: *taken · empty · left · scattered* |

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

**Cuántas se guardan.** Hoy el archivo crece sin tope: cada partida lleva su
crónica entera (miles de entradas) y el guardado vive en `localStorage`. Con
diez partidas de sesenta años son varios megas. **Hay que decidir un tope** (ver
§5) y a partir de él guardar sólo el `ledger` y las cien últimas líneas de las
más antiguas.

**Dificultad: media (Sol)** — una pantalla nueva con la piel, y la poda del
archivo.

---

## 4 · El orden, y qué depende de qué

```
F3a · derive/ledger.ts + ArchivedGame.ledger + migración     (Luna/Terra → Sol revisa)
F3b · la hoja de cuentas sobre epitaph.ts                     (Luna)            ← F3a
F3c · la lápida: capitular, inscripción letra a letra, retardo (Sol)             ← nada
F3d · el cronicón, desde la hoja y desde el menú              (Sol)             ← F3a
F3e · captura de las cuatro causas y una toma de la animación (Luna/Terra)      ← F3b, F3c
```

F3a y F3c no dependen una de otra y pueden ir a la vez. Lo que más se ve por
menos es **F3c + F3b**: el momento y los números de esa partida. El cronicón va
detrás porque necesita partidas que comparar, y hasta que un jugador no lleve
tres o cuatro no se nota.

---

## 5 · Lo que decide el dueño

1. **Qué dice la inscripción.** «GAME OVER» no está en el registro de este
   juego —nada de lo que lee el jugador rompe la ficción— y lo que hay hoy es
   *The valley is empty* / *was taken*. Propuesta: la inscripción es **la causa
   en versales y el año** («THE VALLEY WAS TAKEN · ANNO 43»), y la capitular es
   su letra. Si quieres un «Game Over» literal, cabe como segunda línea pequeña
   bajo la inscripción, pero es una decisión de registro y es tuya.
2. **Las tres cifras grandes.** Propuestas: años, gente en su mejor momento,
   causa. Alternativa igual de defendible: años, gente, **asaltos aguantados**,
   que es la de la fase 4. Depende de qué quieres que un jugador presuma.
3. **El tope del archivo**: cuántas partidas pasadas se guardan enteras.
   Propuesta: las diez últimas enteras y sólo la hoja de cuentas de las demás.
4. **Compartir.** «Fácil de comparar» puede querer decir también *enseñarla a
   otro*: la hoja de cuentas como imagen (un PNG de la página, con el
   ornamento) para mandarla. Es una ronda aparte y pequeña, si la quieres.

---

## 6 · Lo que no es de este plan

- La crónica ilustrada del final ya existe (botón «Read the chronicle»).
- Las estadísticas **durante** la partida (una pantalla de cifras en vivo) son
  otra cosa y otra fila; esto es el final.
- El nivelado de cuánto dura un valle o cuánta gente llega es G4 y no cambia
  por enseñar los números.
