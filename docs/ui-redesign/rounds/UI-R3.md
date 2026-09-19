# UI-R3 · Crónica

**16 sep 2026.** Tercera ronda de implementación del rediseño de interfaz
(`docs/ui-redesign/implementation-prompt.md`), hecha por el agente de
crónica, en paralelo con UI-R4 (personas y fichas), sobre el contrato
congelado de UI-R2. Rama `rework/parada-a-media`, worktree propio.

---

## 1. Ancla

**Commit de partida:** `c278e12` («UI-R2 · Cabecera, órdenes y velocidad
sobre la carcasa, y tres fallos de gestos que ningún fotograma podía ver»),
el que se dio como base del encargo. El `HEAD` real del worktree al empezar
era `a38dfcd` («Tablero: UI-R2 aterrizada, UI-R3 y UI-R4 en vuelo en
paralelo»), un commit de bitácora encima que no toca ningún fichero de esta
ronda. `git status`/`git diff --stat` al cierre: sólo `src/ui/app.ts` y
`src/ui/screens/chronicle.ts` modificados, más `tests/fast/ui-chronicle.
test.ts` nuevo — nada de UI-R4 (`src/ui/screens/people.ts`, fichas) tocado.

---

## 2. Ficheros

**Modificados:**
- `src/ui/screens/chronicle.ts` — añadido `chroniclePanel: PanelFactory` y
  dos funciones puras (`chronicleIdentity`, `selectableArchive`). El camino
  viejo (`openChronicle`/`closeChronicle`, la piel `STYLE`, `yearBlock`,
  `ChronicleSource`, `archivedSource`) se conserva **sin cambios de
  comportamiento** — sólo una regla CSS nueva y compartida (`.chronicle-scrim
  { pointer-events: auto }`) — porque `screens/epitaph.ts` lo sigue llamando
  directamente y está fuera del alcance de esta ronda.
- `src/ui/app.ts` — el enganche mínimo: import cambiado (`chroniclePanel`
  en vez de `openChronicle`), `const chronicle = chroniclePanel(actions)`
  creado una vez junto a `orders`, la rama `route.kind === 'chronicle'` de
  `navigate()` sustituida (monta `chronicle.element` en `shell.content` y
  destapa la bandeja a mano — ver §3.2), y una línea en el bucle de pintado
  (`if (currentRoute.kind === 'chronicle') chronicle.update(snapshot())`).

**Creados:**
- `tests/fast/ui-chronicle.test.ts` — 10 pruebas de las dos funciones puras.

**No tocados, a propósito:** `src/ui/screens/{people,crossroad,epitaph,
title}.ts`, `src/ui/redesign/{contracts,shell,hud,orders}.ts`, `src/ui/
redesign/shell.css`, `src/ui/redesign/tokens.css`, `index.html`, `tools/`,
todo `src/engine/` salvo lectura (no se añadió ninguna clave a `bank.en.ts`:
las que hacían falta —`chronicle.source`, `chronicle.current`, `chronicle.
archived`, `app.close`— ya existían).

---

## 3. Decisiones tomadas

### 3.1 · Dos caminos, una sola piel — y por qué no se fusionan

`screens/epitaph.ts` (fuera de mi brief) llama a `openChronicle(app)`
directamente: ese camino no pasa por `actions.navigate` ni por `shell.
content`, y no puede pasar sin tocar un fichero ajeno. En vez de forzar los
dos caminos a compartir un único mecanismo de montaje (que habría exigido
tocar `epitaph.ts` o inventar una API nueva en `shell.ts`, ambos fuera de mi
alcance), esta ronda deja **dos puntos de entrada, una sola piel**: `ensure
Style`/`STYLE`, `yearBlock`, `ChronicleSource` y `archivedSource` son
compartidos y no se tocan; `openChronicle`/`closeChronicle` (el camino del
epitafio, estático — la partida ya terminó, no hay tick que la mueva) quedan
verbatim; `chroniclePanel` (el camino de la barra, vivo) es código nuevo que
reutiliza esas piezas. Documentado en la cabecera de `chroniclePanel`, en el
propio fichero.

### 3.2 · Por qué `shell.content` se destapa a mano, y no es un descuido

`contentRouteFor` (`redesign/shell.ts`, UI-R1) sólo conoce las rutas `orders`
e `inspect` — el propio comentario de esa función dice que crónica y gente
«siguen sirviéndose por los adaptadores de pantalla completa… que UI-R3/
UI-R4 migran». Migrarla de verdad exigiría añadir `'chronicle'` a esa
función, y `shell.ts`/`contracts.ts` están explícitamente fuera de los
ficheros que este brief permite tocar. La solución: `app.ts` (el único
enganche que el brief concede) hace, tras `shell.setRoute(route)`:

```ts
const sheet = shell.element.querySelector<HTMLElement>('.ui-shell-content');
if (sheet !== null) sheet.hidden = false;
shell.content.append(chronicle.element);
```

Es la misma técnica que UI-R1 ya usó para la ranura del mensaje
(`shell.element.querySelector('.ui-shell-message')`): leer el DOM de la
carcasa por una clase pública y estable de `shell.css`, nunca inventar una
API nueva en `shell.ts`. Al navegar a cualquier otra ruta, `shell.setRoute`
vuelve a ocultar `.ui-shell-content` por su cuenta (`contentRouteFor` sigue
sin conocer `chronicle`, así que calcula `hidden = true`), así que no hace
falta deshacer nada a la salida.

**Por qué esto no rompe la geometría de `.ui-shell-content` (pensada para una
bandeja de 60vh/360px, no para pantalla completa).** `.chronicle-scrim` sigue
siendo `position: fixed; inset: 0` con su mismo z-index de siempre (13):
al ser `fixed`, escapa por completo al tamaño y al recorte (`overflow: auto`,
`max-height: 60vh`) de `.ui-shell-content`, que no establece un nuevo
contenedor de bloque para hijos `fixed` (no tiene `transform`/`filter`/
`contain`). El resultado visual es **idéntico** al de antes de esta ronda,
cuando `.chronicle-scrim` colgaba directamente de `document.body`: cubre la
pantalla entera, y la barra de navegación (`.ui-shell-stack`, z-index 14,
hermana de `.ui-shell-content` bajo `.ui-shell`, que no crea contexto de
apilamiento propio) se sigue viendo encima, que es lo que exige U-14. El «×»
genérico de la bandeja (`.ui-shell-content-close`, z-index automático) queda
cubierto por completo por la crónica (z-index 13, contexto propio por ser
`fixed` con z-index explícito) sin que nadie tenga que esconderlo aposta —
comprobado con la captura §5 y con el recorrido ad hoc de §4.

### 3.3 · Por qué una entrada nueva no roba el desplazamiento

`chroniclePanel.update` se llama una vez por fotograma mientras la ruta esté
activa (igual que `orders.update`), así que no puede reconstruir la lista
entera cada vez — eso sí robaría el scroll, literalmente (`replaceChildren`
+ `scrollTop = 0` en cada llamada). La regla:

- **La fuente decide si hace falta reconstruir del todo.** `chronicleIdentity
  (selectedArchive, seed)` distingue no sólo «actual» de «archivada», sino
  **qué partida actual**: una sucesora tras el epitafio (`foundSuccessor`,
  §12.2) sigue siendo «la partida actual» pero con una crónica que empieza de
  cero, y tratarla como la misma fuente mezclaría dos aldeas en una sola
  lectura. Sólo cuando la identidad cambia se reconstruye entero y se sube el
  scroll a cero — es la única vez que se resetea a propósito.
- **Con la misma fuente, sólo se toca el año en curso.** Los años cerrados no
  cambian nunca (§9 del diseño: la crónica no reescribe el pasado), así que
  `refreshCurrentYear` sustituye únicamente el primer bloque (o antepone los
  años que hayan empezado desde el último pintado) y dejar el resto del DOM
  intacto.
- **Y si quien lee no está pegado arriba del todo** (`scrollTop > 2`), se
  compensa el alto que el contenido nuevo ganó por encima
  (`scrollTop += scrollHeight_después − scrollHeight_antes`), para que el
  texto que tenía bajo el dedo no se mueva. Quien sí está arriba (leyendo «lo
  que acaba de pasar») ve crecer el año en curso de primera mano, sin que
  nada le enganche el scroll hacia abajo.

Medido con un recorrido real (fast-forward del reloj, crónica abierta,
lector desplazado a media lista): ver §4.

### 3.4 · Ninguna identidad se infiere de una frase

El brief avisa expresamente: «no mezcles fuentes ni analices frases para
descubrir identidades; sólo enlaza persona o lugar si existe un
identificador estable real». `ChronicleEntry.params` es `Record<string,
string | number>` (`src/engine/state.ts:510`) — no lleva ningún `id` de
villager ni de edificio, sólo el nombre ya renderizado como texto. No existe
hoy un identificador estable al que enlazar una línea de crónica con una
persona o un lugar, así que **no se ha añadido ningún enlace**: es la
consecuencia directa del aviso, no una omisión. Si se quisiera en el futuro,
haría falta un cambio del motor (`ChronicleEntry` llevando un id real, como
ya hace `happenings[n].who` desde R-1/R-2 para la riña de la plaza) antes de
tocar esta capa.

---

## 4. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
npx vitest run tests/fast/ui-redesign-shell.test.ts tests/fast/app.test.ts \
  tests/fast/notice.test.ts tests/fast/ui-doing.test.ts tests/fast/ui-title.test.ts \
  tests/fast/ui.test.ts tests/fast/ui-orders.test.ts tests/fast/ui-chronicle.test.ts
```

Salida real (79 pruebas, 79 verdes):

```
✓ tests/fast/ui-orders.test.ts (23 tests)
✓ tests/fast/ui-redesign-shell.test.ts (10 tests)
✓ tests/fast/app.test.ts (8 tests)
✓ tests/fast/ui-chronicle.test.ts (10 tests)
✓ tests/fast/notice.test.ts (4 tests)
✓ tests/fast/ui-title.test.ts (8 tests)
✓ tests/fast/ui-doing.test.ts (4 tests)
✓ tests/fast/ui.test.ts (12 tests)
Test Files  8 passed (8)
     Tests  79 passed (79)
```

`ui-milestones.test.ts` no se ha ejecutado: roja de antes (semilla 999, 18
hitos contra ≥20), heredada y documentada en UI-R1/UI-R2, ajena a esta ronda.

`tests/fast/ui-chronicle.test.ts` prueba `chronicleIdentity`/
`selectableArchive` — las dos únicas funciones que `chroniclePanel` deja
fuera del DOM a propósito (este proyecto no trae `jsdom`, mismo motivo que
UI-R1/UI-R2 dieron para sus propios ficheros de prueba). Cubren exactamente
las dos propiedades del brief que una prueba pura puede examinar: que una
sucesora (otra semilla) nunca se confunde con la partida que reemplaza
aunque las dos sean «actual», y que el selector de archivo no repite la
partida que ya se ve como «This valley» y ordena de la más reciente a la más
antigua.

**Lo que no se puede probar sin DOM** (el montaje real en `shell.content», el
cierre por gesto, y sobre todo que una entrada nueva no roba el
desplazamiento) se verificó con un recorrido de Playwright hecho a propósito
para esta ronda — no forma parte del entregado, no toca `tools/graphics/
shot.mjs` (que no trae `--open chronicle`) ni `tools/shots/valley.shots.ts`. Reloj
falso instalado antes de navegar (misma técnica que `shot.mjs --advance`),
semilla 11, quince años adelantados, crónica abierta desde la barra,
desplazada a `scrollTop = 300` (leyendo el año XIV), y ocho años más
adelantados **con la crónica todavía abierta** (el motor no dejar de simular
por tener una pantalla encima):

```json
{
  "render": "pilot3d",
  "screenAttr1": "chronicle", "navVisible1": true, "chronicleStillOpen": true,
  "yearHeadings1": ["ANNO XV", "ANNO XIV", "…", "ANNO I"],
  "yearHeadings2": ["ANNO XXIV","ANNO XXIII","ANNO XXI","ANNO XX","ANNO XVII",
                     "ANNO XIV", "…", "ANNO I"],
  "grewBy": 3224,
  "scrollSet": 300, "scrollAfter": 2072
}
```

Cinco años nuevos con algo que contar se antepusieron (XVII, XX, XXI, XXIII,
XXIV — los que no aparecen no tuvieron sucesos, igual que hacía la pantalla
vieja) y el año XIV, que ya estaba en pantalla, se conserva en el mismo
puesto relativo. El scroll pasó de 300 a 2072 — la captura de después
(§5, segunda imagen) sigue mostrando el año XIV, exactamente lo que el
lector tenía delante, no la primera línea ni el año XXIV recién llegado.
`errores de página: ninguno` en las dos ejecuciones.

---

## 5. Capturas

Backend real: **`pilot3d`** (confirmado leyendo `document.documentElement.
dataset.render` en el propio guion, nunca asumido). Semilla 11, viewport
390×844, DPR 2, sobre `artifacts/graphics/G-10/game/valley.html`
(`npx tsx tools/graphics/bundle-game.ts`). El reloj se falseó con
`page.clock` (misma técnica que usa `tools/graphics/shot.mjs --advance`)
porque `--open chronicle` no existe en ese script y está fuera del alcance
de esta ronda añadirlo; el guion ad hoc que tomó las capturas no se ha
conservado en el árbol (no es parte del entregado).

| # | Qué | Fichero |
|---|---|---|
| 1 | Crónica abierta desde la barra tras quince años adelantados: años XV/XIV con sucesos reales, botón «Close» propio, barra Valley/Chronicle/People encima con «Chronicle» encendida | `artifacts/graphics/UI/R3/01-chronicle-open.png` |
| 2 | La misma lectura (año XIV) después de que ocho años más entraran **con la crónica abierta**: el lector sigue viendo el año XIV, no el XXIV recién llegado ni la fundación | `artifacts/graphics/UI/R3/02-chronicle-new-entry-keeps-scroll.png` |

---

## 6. Casos de aceptación (`docs/ui-redesign/acceptance-scenarios.md`)

| Caso | Resultado | Estado |
|---|---|---|
| Crónica: abrir desde la barra, años en orden, cerrar con «×» y con la barra visible encima | Pasa — capturado, y ya cubierto por `tools/shots/valley.shots.ts` (línea 185-190, no reejecutado, no tocado) | cubierto |
| Selector de archivos: no repite la partida actual, ordena de más reciente a más antigua | Las dos propiedades puras probadas en `ui-chronicle.test.ts`; el camino de DOM completo lo cubre `tools/shots/valley.shots.ts` (`archivePicker`, líneas 532-539) — ese test concreto está declarado `test.fail()` desde antes de esta ronda por una causa ajena (bounding box del canvas al refundar), no reejecutado por regla del dueño | cubierto por lógica pura; el DOM completo hereda una prueba ya roja por otra causa |
| Retorno desde el epitafio | `openChronicle`/`closeChronicle` sin cambios de comportamiento; `screens/epitaph.ts` no se ha tocado | pasa, sin cambios |
| Una entrada nueva no roba el desplazamiento | Medido con reloj falso: ver §4 | pasa |
| No enlazar identidades por texto | No se añadió ningún enlace: no hay identificador estable en `ChronicleEntry` (§3.4) | cumplido por abstención |

---

## 7. Fallos heredados y pendientes

- **`ui-milestones` sigue roja** (semilla 999, 18 hitos contra ≥20).
  Heredada de UI-R1/UI-R2, ajena a esta ronda.
- **`tools/shots/valley.shots.ts`: «una aldea terminada deja epitafio…» sigue
  declarada `test.fail()`** por una causa que no es de la crónica (el canvas
  no da `boundingBox()` al refundar tras el epitafio). Ese mismo test es el
  que ejercita de verdad el selector de archivo sobre DOM completo
  (combobox, opciones, cambio de fuente) contra mi código nuevo — no se ha
  podido correr esta ronda (`test:shots` no está en la lista de verificación
  que se dio, y relanzar suites completas está fuera de la regla del dueño)
  para confirmar si mi cambio lo arregla, lo deja igual o lo mueve. **Dicho
  aquí explícitamente para quien cierre UI-R6**, que sí ejecuta `test:shots`.
- **Sin evidencia de Playwright oficial** (`test:shots`) para el camino
  nuevo: la evidencia de §4/§5 es un recorrido ad hoc, no conservado en el
  árbol, hecho para no tocar `tools/`. UI-R6 debería, si hace falta una
  prueba permanente de este camino, decidir si entra en
  `tools/shots/valley.shots.ts` (fuera del alcance de esta ronda) o en un
  fichero de `test:shots` nuevo.
- **No se ha probado la sucesión real** (epitafio → «Begin again» → abrir
  crónica por la barra) con un juego de verdad; `chronicleIdentity` está
  unit-testada con semillas sintéticas, pero la propiedad «una sucesora no
  hereda la lectura de la anterior» no se ha visto en pantalla en esta
  ronda.

---

## 8. Qué observación refutaría lo hecho aquí

- Que `.ui-shell-content` deje de existir con esa clase, o que `shell.ts`
  cambie su mecanismo de `hidden` a otra cosa (un `class` en vez de un
  atributo, por ejemplo): el enganche de `app.ts` (§3.2) dejaría de destapar
  la bandeja y la crónica se quedaría invisible aunque montada.
- Que un dispositivo real (no swiftshader) recorte `position: fixed` dentro
  de un ancestro `overflow: auto` de forma distinta a lo que CSS2.1 exige —
  entonces la crónica se vería recortada a 60vh en vez de a pantalla
  completa. No se ha probado en un teléfono de verdad esta ronda.
- Que `tools/shots/valley.shots.ts` («una aldea terminada…»), al ejecutarse de
  verdad, encuentre un `combobox`/`option` que ya no coincide en texto o en
  cuenta — indicaría que reutilizar `archivedSource`/`yearBlock` sin
  cambios no bastó para preservar el contrato exacto que ese test fija.
- Que una partida con sucesos muy densos en una sola semana haga que
  `refreshCurrentYear` sustituya el bloque del año en curso con tanta
  frecuencia que la compensación de scroll (basada en `scrollHeight` antes/
  después) se note a saltos en vez de continua — no medido, porque las
  semillas usadas no producen más de un puñado de sucesos por año.

---

## 9. Lo siguiente

**UI-R5** (integración), del integrador: juntar esta rama con UI-R4, y
decidir si el hallazgo de §7 (`test.fail()` de `tools/shots/valley.shots.ts` sobre el
selector de archivo) se investiga entonces. **UI-R6** (validación): ejecutar
`test:shots` de verdad sobre este camino, algo que esta ronda no ha hecho
por regla del dueño («ninguna suite completa más de una vez»).
