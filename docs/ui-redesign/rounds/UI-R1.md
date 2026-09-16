# UI-R1 · Carcasa, tokens y navegación

**16 sep 2026.** Primera ronda de implementación del rediseño de interfaz
(`docs/ui-redesign/implementation-prompt.md`), hecha por el integrador. Rama
`rework/parada-a-media`.

---

## 1. Ancla, y por qué no es un solo número

**Commit de partida del encargo:** `e20eeb5` («C-1.3 · Las jornadas, de 119 a
128 verdes, y la palanca del bosque está invertida»), el que figuraba en el
`git status` inicial de la sesión.

**Commit contra el que el diff de esta ronda aplica limpio, al cerrarla:**
`4145cfc` («IA-8 · La plaza que falló se descarta, el viaje tiene su plazo, y
el labrador pisa su campo»).

Entre uno y otro, **otra sesión empujó cuatro commits a esta misma rama
mientras yo trabajaba**: `9f33582` (G-17, aldeanos low-voxel), `617f671`
(IA-7), `fa3ca6b` (Demo v16), `9cc97af` (G-18) y el propio `4145cfc` (IA-8).
Es el escenario que `docs/dos-sesiones.md` describe. Comprobado que no hay
colisión: `git diff --stat` contra HEAD sólo mueve los tres ficheros que este
informe lista como modificados, ninguno tocado por esos commits. No usé
`git stash` para comparar (la regla de `docs/task-log.md` §5 lo prohíbe con
otra sesión escribiendo) — la única vez que lo hice fue al principio, antes de
notar la concurrencia, con el árbol de trabajo vacío de conflictos; el
`git stash pop` fue limpio y no perdió nada, pero no debí hacerlo y no lo
repetí.

---

## 2. Ficheros

**Creados:**
- `src/ui/redesign/contracts.ts` — los seis tipos literales del plan §4.
- `src/ui/redesign/tokens.css` — los tokens de plan §3 / visual-reference §5.
- `src/ui/redesign/shell.ts` — `createShell`, `navTabFor`, `contentRouteFor`,
  `resolveMessageSlot`.
- `src/ui/redesign/shell.css` — la piel de la carcasa y la pila del mensaje.
- `tests/fast/ui-redesign-shell.test.ts` — las propiedades puras de arriba.

**Modificados:**
- `src/ui/app.ts` — único propietario de navegación (`actions`/`navigate`),
  carcasa montada, ranura de mensaje con árbitro notice/hint, órdenes
  enrutadas por `setIntent`.
- `index.html` — retirado `.valley-tabbar`/`.valley-tab` (reemplazadas);
  `.valley-hint` pierde su posición absoluta (ahora la fija `shell.css`,
  conserva su piel).
- `src/engine/chronicle/bank.en.ts` — una clave nueva: `app.sheet`.

**No tocados, a propósito:** `src/ui/screens/{chronicle,people,crossroad,
epitaph}.ts`, `src/ui/vitals.ts`, `src/ui/doing.ts`, `src/ui/speed.ts`,
`src/ui/inspect.ts`, `src/ui/notice.ts`, `src/ui/moment.ts`, todo `src/engine/`
y todo `src/render3d/` salvo lectura.

---

## 3. Decisiones tomadas

### 3.1 Qué migra a la carcasa nueva y qué no, esta ronda

Migra **la navegación de las tres pestañas** (antes construida a mano en
`app.ts`, ahora `createShell`) y **el mensaje** (el aviso de §11.6 y la pista
del inicio guiado, que antes vivían sueltos). **No migra** el contenido de
Crónica, Gente, Órdenes ni la ficha a `ShellHandle.content`: siguen siendo los
adaptadores de siempre (`screens/chronicle.ts`, `screens/people.ts`, y la hoja
de órdenes / la ficha, que siguen construidas a mano en `app.ts`). El plan lo
autoriza expresamente para UI-R1 («los adaptadores existentes siguen
atendiendo las pantallas que aún no se han migrado») y lo exige como criterio
de hecho («no dar por migradas las pantallas»). `contentRouteFor` sí sabe
distinguir `orders`/`inspect` de `chronicle`/`people`/`valley` — la función
está lista para cuando UI-R2 (hud/orders) y UI-R3/UI-R4 (crónica/gente)
quieran usar `shell.content` de verdad.

### 3.2 Un único propietario de la navegación, con reenganche por closures

`actions.navigate(route)` es ahora el único camino: cierra crónica, gente,
ficha y órdenes, llama a `shell.setRoute(route)` (que enciende la pestaña que
toque vía `navTabFor` y pone `data-screen`) y abre lo que corresponda. Todos
los sitios que antes decidían la pestaña por su cuenta —`showing()`, cada
manejador de la barra, `showPanel` llamando a `showing('valley')` para
arreglar S-05, el resync de `chronicleOpen` en `paint()`— desaparecen.

El `actions`/`shell` que se necesitan mutuamente (`actions.navigate` llama a
`shell.setRoute`; `shell` se construye con `actions`) se resuelven con
`function navigate(...)` — elevada por ser `function`, no `const`— seguida de
`const shell = createShell(actions)`: así no hace falta un `let shell` que
sólo se asigna una vez (que ESLint marca, con razón, como debiera ser
`const`). `tests/fast/ui-redesign-shell.test.ts` cubre `navTabFor` para las
cinco variantes de `SheetRoute`.

### 3.3 La pila del mensaje: `resolveMessageSlot` y por qué no toca `notice.ts`

El fallo que esta ronda tenía que dejar imposible (`docs/life-rounds/
evidencia-capturas.md` §3): el aviso de la crónica y la pista del inicio
guiado se pintaban encima, cada uno con su `bottom` fijo e independiente
(82px y 118px). `mountNotices` acepta **cualquier** contenedor como `root`
—no hacía falta tocar `notice.ts`—, así que se le pasa la ranura de la
carcasa (`shell.element.querySelector('.ui-shell-message')`) y la pista
(`hint`, que ya vivía en `app.ts`) se traslada al mismo contenedor. Un
`MutationObserver` sobre el `hidden` de la banda del aviso, y
`resolveMessageSlot(noticeVisible, hintWantsToShow)` —pura, sin DOM— decide:
el aviso gana siempre que quiere el hueco; la pista cede **sin marcarse como
vista** (`hintWantsToShow` no cambia) y vuelve sola cuando el aviso se
retira. Es la primera fila de la tabla de coincidencias de
`docs/visual-reference/README.md` §5, escrita como función y probada con la
tabla de verdad completa (`tests/fast/ui-redesign-shell.test.ts`).

**Un error real, encontrado y corregido dentro de esta ronda (no en el
código que se entrega, arreglado antes de terminar):** la primera versión
observaba `messageSlot` entero con `subtree: true`, y como `hint` —a quien
`updateHintVisibility` escribe— es descendiente de `messageSlot`, esa misma
escritura volvía a encolar una mutación observada (`setAttribute` encola un
registro **aunque el valor no cambie**, que es lo que se pasó por alto). El
observador se disparaba a sí mismo en cascada de microtareas, sin lanzar
ningún error, y el hilo principal no volvía a quedar libre nunca: el juego de
verdad lo mostró como un clic en «Found a new valley» que no volvía en 20-60 s
y, minuto y medio después, la pestaña se caía («Target crashed»),
reproducido tres veces seguidas con `tools/graphics/shot.mjs`, la herramienta
del propio proyecto, no un arnés mío. La ruta de depuración (Canvas, sin
`boot()`) aguantaba 90 s sin problema, lo que apuntó a `boot()` y no al
entorno. El arreglo: observar sólo la banda del aviso
(`.valley-notice`, sin `subtree`), que `hint` no toca. Documentado en el
propio comentario de `app.ts` para que no se repita.

### 3.4 Un contexto de apilamiento que se tragó el z-index de la barra

Al envolver la navegación en `.ui-shell` con su propio `z-index: 2`, ese
contenedor abre un contexto de apilamiento nuevo y atrapa dentro a
`.ui-shell-stack` (z-index 14) — su «14» deja de compararse contra el resto de
`document.body` y pasa a valer «2» desde fuera. `.chronicle-scrim` (z-index
13, hijo de `document.body`) tapaba entonces la barra entera: un recorrido de
prueba lo encontró solo (`getByRole('button',{name:'Valley'})` no llegaba a
hacer clic, «intercepts pointer events»). Arreglado quitando el `z-index` de
`.ui-shell` — los hijos vuelven a competir donde competía `.valley-tabbar`.

### 3.5 El mensaje no tiene sitio fuera del valle

Al subir la pila entera a un solo contenedor por encima de los velos de
Crónica y Gente (necesario para U-14), la pista del inicio guiado se veía
flotando sobre esas dos pantallas, y sobre la hoja de órdenes le tapaba la
fila «Build first» (capturado y corregido dentro de esta misma ronda:
`html:not([data-screen="valley"]) .ui-shell-message` y
`html:has(.valley-panel:not([hidden])) .ui-shell-message` lo ocultan). Contra
la captura de referencia (`docs/ui-redesign/ui-captures/04-orders.png`), el
resultado final es **igual** que antes de esta ronda: el pie de la hoja de
órdenes sigue asomando bajo la barra, que es un defecto heredado
—`.valley-panel` no reserva la altura de la navegación— y **no lo cierra esta
ronda**: es del contenido de la hoja, que UI-R2 construye de verdad.

### 3.6 Las órdenes pasan por `setIntent`

Los tres `orderRow` (siembra, manos, prioridad) mutaban `state.intent`
directamente; ahora llaman a `actions.setIntent({...state.intent, ...})`, que
en `app.ts` hace `state.intent = intent` sin persistir dos veces (el `persist()`
que ya hacía el manejador de clic se queda donde estaba). El contenido de la
hoja sigue siendo de `app.ts` —no un `PanelFactory` en fichero propio, que es
UI-R2—, pero ya usa el contrato en el único punto de escritura que el plan
concede a un panel.

---

## 4. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
npx vitest run tests/fast/ui.test.ts tests/fast/ui-doing.test.ts \
  tests/fast/ui-milestones.test.ts tests/fast/notice.test.ts \
  tests/fast/lethargy.test.ts tests/fast/save.test.ts \
  tests/fast/ui-redesign-shell.test.ts
```

Salida real (56 pruebas, 55 verdes, 1 roja heredada):

```
✓ tests/fast/ui-redesign-shell.test.ts (10 tests)
✓ tests/fast/notice.test.ts (4 tests)
✓ tests/fast/lethargy.test.ts (5 tests)
✓ tests/fast/ui-doing.test.ts (4 tests)
✓ tests/fast/save.test.ts (15 tests)
✓ tests/fast/ui.test.ts (12 tests)
❯ tests/fast/ui-milestones.test.ts (6 tests | 1 failed)
  × milestonesAt · ni una aldea sin historia ni un teletipo
    → seed 999: 18 hitos: expected 18 to be greater than or equal to 20
Test Files  1 failed | 6 passed (7)
     Tests  1 failed | 55 passed (56)
```

**La roja es heredada, no una regresión.** Comprobado reproduciéndola contra
el HEAD de antes de tocar nada (`617f671`, vía `git stash`/`pop` — la única vez
que usé `stash` en esta ronda, con el árbol limpio en ese momento): el mismo
fallo, el mismo número (18 contra ≥20), sin ningún cambio mío en el árbol.
Nada de lo que esta ronda toca —navegación, mensaje, tokens— roza
`milestonesAt` ni el motor.

`tests/fast/ui-redesign-shell.test.ts` es nuevo (no estaba en la lista que se
me dio) y prueba `navTabFor`, `contentRouteFor` y `resolveMessageSlot` —las
tres funciones puras que `shell.ts` deja fuera del DOM a propósito, siguiendo
el patrón de `attemptDecision`/`boot` de M-20—: este proyecto no tiene jsdom
instalado (`app.test.ts` ya lo dice de `App.decide`), así que lo que usa
`document.createElement` no se puede probar aquí y se acredita con capturas.

---

## 5. Capturas

Backend real: **`pilot3d`** (3D, confirmado leyendo `document.documentElement
.dataset.render` en cada captura, nunca asumido). Viewport 390×844, DPR 2,
`tools/graphics/shot.mjs`/un arnés de Playwright equivalente sobre el juego
empaquetado (`npx tsx tools/graphics/bundle-game.ts` + `serve.mjs --port
8145`), nunca llamando a una función interna directamente.

| # | Qué | Semilla | Tick/semana | Velocidad | Backend | Fichero |
|---|---|---|---|---|---|---|
| 1 | Reposo, bandeja cerrada | 7 | 0 (año 1) | ×1 | pilot3d | `artifacts/graphics/UI/R1/01-valley-rest.png` |
| 2 | Chronicle abierta | 7 | 0 | ×1 | pilot3d | `.../02-chronicle-open.png` |
| 3 | People abierta | 7 | 0 | ×1 | pilot3d | `.../03-people-open.png` |
| 4 | Orders abiertas | 7 | 0 | ×1 | pilot3d | `.../04-orders-open.png` |
| 5.1–5.8 | El caso del aviso + la pista | 11 | 720 (~semana 892 simulada) | ×1 tras el salto | pilot3d | `.../05-notice-vs-hint-0N.png` |

**Lo que la secuencia 5 prueba, con estado del DOM leído en cada fotograma
(no sólo mirado a ojo):**

```
[fotograma 1] noticeVisible=true  ("Two were married that spring…")           hintVisible=false
[fotograma 2] noticeVisible=true  ("Grimbald and Osric came to words…")       hintVisible=false
[fotograma 3] noticeVisible=true  (misma riña, sigue en pantalla)             hintVisible=false
[fotograma 4] noticeVisible=false                                            hintVisible=true ("The line above is the standing orders…")
[fotograma 5–8] noticeVisible=false                                          hintVisible=true
```

**Nunca `noticeVisible && hintVisible` a la vez**, en ningún fotograma de las
dos pasadas que se hicieron (una con una encrucijada de por medio, apartada
deslizando sin contestarla como hace `shot.mjs`; otra sin ella). El fotograma
2 (`05-notice-vs-hint-02.png`) muestra la riña sola, legible, con la cartela
«A decision waits» en su sitio de siempre y sin nada más compitiendo abajo; el
4 (`05-notice-vs-hint-04.png`) muestra la pista sola, en el mismo hueco. Es la
prueba visual de que el fallo de `evidencia-capturas.md` §3 ya no ocurre.

La pista del inicio guiado se dejó **a propósito sin tocar** —no se le dio el
toque que la avanza— para que en la semana 892 siguiera pendiente, tal como
estaría en una partida real que nunca la ha descartado; es lo que hace que el
caso de coincidencia sea real y no fabricado.

---

## 6. Casos de aceptación

| Caso | Resultado | Estado |
|---|---|---|
| AC-01 | Reposo con hora, indicadores, velocidad, navegación; capturado a 390×844 | pasa |
| AC-05 | Valley → Chronicle → People → Valley por la barra; `data-screen` coincide en las tres; canvas conservado (mismo `<canvas>`/`<canvas id="valley3d">`, nunca recreado); estado del motor sin tocar (navegar no llama a `tick`) | pasa |
| — (el caso nuevo de esta ronda) | Aviso + pista nunca visibles a la vez; la que cede vuelve sola | pasa, con captura |
| AC-02, AC-03, AC-04, AC-19 | No corresponden a esta ronda: piden el contenido real de cabecera/órdenes/velocidad, que sigue en los adaptadores viejos (UI-R2) | pendientes |
| AC-06 a AC-20 | Piden crónica archivada, personas, decisiones, letargo, etc. — contenido de UI-R3/UI-R4/UI-R5 | pendientes |

No se ha ejecutado `test:shots` (Playwright) completo: el propio orden del
dueño del diseño limita esta ronda a typecheck, lint y los ficheros de prueba
listados, más las capturas. Un recorrido de `tools/valley.shots.ts` no
debería romperse —`getByRole('button', {name:...})` y `data-screen` no han
cambiado de valor, y `.valley-hint`/`.valley-notice`/`.valley-orders-now`/
`.valley-speed-badge` conservan su clase y su comportamiento observable—, pero
**no se ha comprobado ejecutándolo**, y queda dicho aquí y no dado por bueno.

---

## 7. Fallos heredados y pendientes

- **`milestonesAt` con la semilla 999 da 18 hitos, no ≥20.** Heredado,
  confirmado contra el HEAD de antes de esta ronda. No es de UI-R1.
- **El pie de la hoja de órdenes asoma bajo la barra de navegación**
  (§3.5). Heredado desde antes de esta ronda (comprobado contra
  `docs/ui-redesign/ui-captures/04-orders.png`); UI-R2 lo resuelve al
  construir el panel de verdad con su propio relleno inferior.
- **Nueve jornadas rojas de `rework.md` §2.8** siguen sin tocar, por decisión
  del dueño y porque esta ronda no toca el motor.
- **`test:shots` no se ha ejecutado entero** (§6): typecheck + lint + los
  ficheros listados + capturas es lo que pidió el dueño del diseño para esta
  ronda.
- **Crónica, Gente, Órdenes y Ficha no están en `ShellHandle.content`**
  todavía — es exactamente lo que el plan pide dejar así para UI-R2/UI-R3/
  UI-R4, no un olvido.

---

## 8. Qué observación refutaría lo hecho aquí

- Que un recorrido real de `tools/valley.shots.ts` (no ejecutado en esta
  ronda) encuentre un `getByRole`/`data-screen` que ya no coincide, o un
  listener que sobrevive a un `dispose()`.
- Que exista una tercera ruta hacia el aviso o la pista que no pase por
  `mountNotices`/`showStep` de `app.ts` — entonces `resolveMessageSlot` no
  cubre ese caso y el pisado podría reaparecer por otro lado.
- Que `:has()` no esté disponible en el motor de render que el dueño del
  diseño use de verdad en su móvil (Safari lo tiene desde 15.4, Chrome desde
  105; el swiftshader de las capturas lo soporta) — la regla de §3.5 depende
  de él y no tiene alternativa sin `:has()` escrita todavía.
- Que abrir/cerrar la bandeja cambie `state.intent`, la velocidad o el tick
  en algún camino no cubierto por `tests/fast/ui-redesign-shell.test.ts` (que
  sólo prueba la parte pura) ni por las capturas (que no comparan estado
  antes/después byte a byte, sólo `data-screen` y las cifras visibles).

---

## 9. Lo siguiente

**UI-R2** (cabecera, actividad, órdenes y velocidad), del integrador. Antes de
empezar: leer §3.1, §3.5 y §3.6 de aquí — dicen exactamente qué geometría y
qué punto de escritura ya están puestos y cuáles quedan por construir de
verdad (`hud.ts`, `orders.ts`, y el relleno inferior de la hoja de órdenes que
resuelve el defecto heredado de §3.5).
