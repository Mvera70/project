# UI-R4 · Personas y fichas

**16 sep 2026.** Cuarta ronda de implementación del rediseño de interfaz
(`docs/ui-redesign/implementation-prompt.md`, sección «UI-R4 — personas y
fichas»). Rama `rework/parada-a-media`, worktree propio.

---

## 1. Ancla

**Commit de partida:** `a38dfcd` («Tablero: UI-R2 aterrizada, UI-R3 y UI-R4
en vuelo en paralelo»), el que figuraba en el `git status` inicial del
worktree. UI-R3 (crónica) corre en paralelo sobre `src/ui/screens/
chronicle.ts`, que esta ronda no ha tocado ni una vez — comprobado con
`git status --porcelain -- src/ui/screens/chronicle.ts` al cerrar: vacío.

---

## 2. Ficheros

**Creados:**
- `src/ui/redesign/people-panel.ts` — `peoplePanel: PanelFactory`, la lista
  de la gente migrada a `shell.content`. Exporta `namedPresent(state)` y
  `peopleScope(state)`, puras.
- `src/ui/redesign/inspect-panel.ts` — `createInspectPanel(actions, target,
  from): UiPanel` (firma de `docs/ui-redesign/implementation-plan.md` §4, con
  `from` añadido — ver §5). Exporta `trackedIdFor(target, state, wants)`,
  pura.
- `tests/fast/ui-redesign-people.test.ts` — 14 pruebas de las tres funciones
  puras de arriba, más `panelFor` extendido.

**Modificados:**
- `src/ui/inspect.ts` — `villagerPanel` distingue ahora fallecido/emigrado
  antes de construir el panel de un vivo (§3).
- `src/engine/chronicle/bank.en.ts` — seis claves nuevas: `inspect.died`,
  `inspect.left`, `inspect.follow`, `inspect.unfollow`,
  `inspect.track.note`, `people.scope`. Sólo UI_BANK, como pide el brief.
- `src/ui/app.ts` — `navigate()` monta `people`/la ficha en `shell.content`
  en vez de `openPeople`/`showPanel`; `paint()` actualiza el panel activo
  cada fotograma; nuevo `sheetContent` (querySelector) para forzar la
  bandeja visible en la ruta `people` (§4). Documentado en el propio fichero.

**Retirado:**
- `src/ui/screens/people.ts` (U-08). Su único consumidor era `app.ts`; nada
  más lo importaba (`grep -rn "screens/people"` antes de borrar). Sustituido
  íntegro por `redesign/people-panel.ts` + la ruta `inspect` compartida.

**No tocados, a propósito:** `src/ui/redesign/{hud,orders,shell,contracts}.ts`,
`tokens.css`, `shell.css`, `src/ui/screens/{chronicle,crossroad,epitaph,
title}.ts`, `index.html`, `tools/`, todo `src/render3d/`, `src/derive/`, el
resto de `src/engine/`.

---

## 3. Qué pedía el brief, y qué se hizo con cada punto

> Migra People y las fichas al contenedor común.

Las dos viven en `shell.content` desde esta ronda. `orders`/`people` se
construyen una vez en `boot()` (como ya hacía `orders` desde UI-R2); la ficha
se crea de nuevo en cada navegación porque lleva un `target` distinto cada
vez — `mountedInspect` es la referencia que `navigate()` avisa (`.dispose()`)
antes de sustituirla o de salir de la ruta `inspect`.

> La lista muestra personas nombradas y presentes, aclarando ese alcance.

`namedPresent` es el filtro exacto que ya tenía U-08 (nombrados && `isHere`);
`peopleScope` añade la cifra global (`population`, `@engine/people/
demography`) y la cabecera dice **«5 named, of 44 in the valley.»**
(`people.scope`, captura `01-people-list.png`) — la aldea de la captura tiene
44 habitantes y 5 nombrados, y la etiqueta dice las dos cifras en vez de
dejar que la lista corta parezca la aldea entera.

> Las fichas reutilizan `panelFor` y solo muestran datos reales.

`createInspectPanel` no reconstruye contenido: llama a `panelFor(target,
state)` en cada `render()` y pinta título + líneas literales, para persona,
edificio y terreno igual. Lo nuevo es que `panelFor`/`villagerPanel` (§3
abajo) dejaron de inventar un presente para quien ya no está.

> Debe funcionar para persona, edificio, terreno, muerte, emigración y
> referencia desaparecida.

- **Persona, edificio, terreno:** capturas `02`, `03`, `05`. `05` confirma
  además que una ficha de edificio nunca monta el control de seguimiento
  (`.valley-panel-follow` cuenta 0 tras abrirla).
- **Muerte y emigración:** antes de esta ronda, `villagerPanel` calculaba la
  edad con `state.tick` (el de ahora) para cualquier `Villager` encontrado
  por id, vivo o no — un fallecido hace veinte años se habría enseñado
  «envejeciendo» en su propia ficha, y sus opiniones/recuerdos como si
  siguiera opinando. Ahora `diedTick`/`leftTick` cortan antes: un fallecido
  enseña una sola línea, «Died in ANNO {año}, {edad-al-morir} winters old.»
  (la edad se cuenta hasta la muerte, no hasta hoy); un emigrado, «Left the
  valley in ANNO {año}.» — ninguna edad, ningún rasgo, ninguna opinión que ya
  no describe a nadie presente. Probado en `ui-redesign-people.test.ts` con
  un estado mirado **veinte años después** de la muerte, para que un cálculo
  con `state.tick` en vez de `diedTick` no pudiera colarse sin que la prueba
  lo viera.
- **Referencia desaparecida:** ya funcionaba (`panelFor` devuelve
  `{title: 'Gone', lines: []}` para un id que no existe en absoluto);
  confirmado con una prueba nueva que lo fija.

**No hay captura de muerte/emigración**, y es una limitación real que dejo
dicha en vez de forzar una: hoy no hay ningún camino de juego que abra la
ficha de alguien que ya no está — el valle no pinta cuerpos que se fueron, y
la lista de People los filtra a propósito. El único camino previsto es un
enlace desde la crónica (UI-R3/UI-R5, «un enlace persona/lugar sólo se
habilita si hay un identificador estable», `implementation-plan.md` §2.4),
que esta ronda no toca. Lo que se entrega es la garantía en `panelFor`
—probada directamente, sin DOM— de que el día que ese enlace exista, no
mentirá.

> El seguimiento usa `backend.live.track(id)` / `backend.live.track(null)`.
> No afirmes que la cámara centra a una persona si el backend sólo la marca.
> Cerrar una ficha cancela el seguimiento iniciado desde ella.

`trackedIdFor(target, state, wants)` es la única función que decide a quién
apuntar: `null` si no se pide, si el objetivo no es una persona, si la
persona murió o se fue, o si el id ya no existe (AC-11, AC-12 —
`docs/ui-redesign/acceptance-scenarios.md`). El botón «Follow»/«Stop
following» sólo aparece cuando `trackedIdFor(target, state, true) !== null`
—una persona presente—, y desaparece solo si deja de estarlo mientras la
ficha sigue abierta (comprobado en `paint()`: la ficha activa se actualiza
cada fotograma con el estado real, no sólo al navegar). La nota bajo el botón
dice exactamente lo que revisé en `src/render3d/renderer.ts` (`track` apunta
la cámara una vez y no la vuelve a mover sola) y en `src/render/renderer.ts`
(el 2D sólo dibuja un aro): **«Marks {name} on the map. It does not promise
to keep the view on them.»** — nunca «centra» ni «sigue».

`dispose()` de la ficha llama a `setTracking(null)` incondicionalmente, y
`app.ts` llama a `dispose()` en el único punto por el que se deja la ruta
`inspect` (top de `navigate()`), sea cual sea la salida: el «×» compartido,
el nuevo botón «Back to the list», o navegar a cualquier otra pestaña. No
hay una segunda vía de cierre que se lo pueda saltar.

---

## 4. Un fallo que este brief encontró y tuvo que arreglar de todos modos

**Actualizar el panel de gente en cada fotograma reconstruía la lista
entera sesenta veces por segundo**, y eso rompía un clic de verdad. Al cablear
`paint()` para refrescar el panel activo (necesario para que una ficha vea
morir a quien mira, §3 de arriba), copié el mismo patrón que `orders.update`
para `people.update` — pero `orders.ts` sólo cambia atributos en botones ya
construidos, y mi primera versión de `people-panel.ts` hacía
`list.replaceChildren(...)` en cada llamada. Un clic de Playwright real sobre
una fila fallaba con **«element was detached from the DOM, retrying»** hasta
agotar el tiempo: la fila se desmontaba y remontaba entre el `pointerdown` y
el `click`, y con un usuario real el mismo fotograma habría podido tragarse
el toque igual. Arreglado con una clave de memoria (`lastKey`, identidad +
nombre + oficio + rasgos + edad en años de cada nombrado): si no cambió desde
el fotograma anterior, las filas ya montadas se quedan donde están. No hay
prueba rápida para esto (exige DOM real, y el proyecto no trae jsdom); quedó
verificado con el mismo clic real que lo destapó, documentado aquí igual que
UI-R2 documentó sus tres hallazgos de gestos.

---

## 5. Decisiones tomadas, y por qué

### 5.1 · `people`/`inspect` fuerzan la bandeja visible sin tocar `shell.ts`

`contentRouteFor` (`shell.ts`) sólo sabe de las rutas `orders`/`inspect`
desde UI-R1/UI-R2; `people` no está en su lista, y `shell.ts` está congelado
esta ronda (UI-R3 trabaja en paralelo sobre el mismo contrato, y mi propio
brief lo prohíbe explícitamente). En vez de esperar a una ronda que lo
extienda, `navigate()` lee `.ui-shell-content` por su clase estable
(`shell.element.querySelector`) y fuerza `hidden = false` sólo para la ruta
`people`, **después** de que `shell.setRoute` haya hecho su trabajo normal —
mismo camino que UI-R1 ya usa para `.ui-shell-message` (`messageSlot`,
comentario propio en `app.ts`). Ninguna otra ruta toca ese atributo a mano:
en cuanto se navega a cualquier cosa que no sea `people`, `shell.setRoute`
vuelve a mandar sobre `hidden` sin que quede rastro de la excepción.

**Por qué no lo dejé para que lo resolviera `shell.ts` en otra ronda:** el
brief pide explícitamente «migra People… al contenedor común», y sin esto la
lista se habría quedado montada dentro de un `<section hidden>` — invisible,
exactamente el mismo defecto que UI-R2 encontró para la ficha en su §8 antes
de esta ronda.

### 5.2 · `.valley-panel`/`.people-scrim` conservan su nombre, no su piel

`tools/valley.shots.ts` localiza la ficha por `.valley-panel:not(.valley-
orders)` (líneas 201, 310, 325, 365) y la gente por `.people-scrim` (líneas
174, 179) — un fichero que este brief no puede tocar. Los dos nombres se
quedan; lo que cambia es la CSS. `index.html` define `.valley-panel` para
vivir sola (`position: absolute; bottom: 0`, su propio fondo y sombra), y
anidada dentro de `.ui-shell-content` eso habría dibujado una hoja dentro de
otra hoja. `inspect-panel.ts` inyecta su propia regla, más específica
(`.ui-shell-content-body .valley-panel { position: static; …}`), que gana
sin tocar `index.html` — el mismo patrón que `screens/crossroad.ts` y el
`screens/people.ts` retirado ya usaban para su propio `<style>`.
`people-panel.ts` hace lo mismo para `.people-scrim`, que antes era
`position: fixed; inset: 0` y ahora es un hijo normal de la bandeja.

### 5.3 · La ficha no crea su propio botón de cierre

`orders.ts` sí duplica un «×» propio (`.valley-panel-close`) porque
`shot.mjs` lo clica por esa clase exacta (`'.valley-orders .valley-panel-
close'`). Nada en `tools/` clica un cierre propio de la ficha —usan la
pestaña «Valley» de la barra—, así que aquí no hace falta la misma
duplicación: el «×» compartido de la carcasa (`.ui-shell-content-close`,
`shell.ts`) es el único, y las capturas `02`–`05` lo muestran funcionando
para los dos orígenes (`valley`/`people`).

### 5.4 · «Volver a la lista» es un botón nuevo, no el «×» compartido

`contracts.ts` deja escrito que `SheetRoute.inspect` lleva `from` «porque…
quien la cierra necesita saber a cuál de los dos volver», pero el «×»
compartido de `shell.ts` se creó una sola vez en `createShell()`, sin
contexto de ruta, y siempre llama a `actions.navigate({kind:'valley'})` —
no puedo cambiar eso sin tocar `shell.ts`. La solución: un botón adicional,
«Back to the list» (reutiliza `people.back`, ya en el banco desde U-08),
que sólo aparece cuando `from === 'people'` y llama a
`actions.navigate({kind:'people'})`. El «×» compartido se queda yendo
siempre a Valley, igual que hacía antes de esta ronda — un comportamiento
heredado, no una regresión de aquí.

### 5.5 · Nombres de las factories: `peoplePanel`, no `createPeoplePanel`

`docs/ui-redesign/implementation-plan.md` §4 (anterior a UI-R1) proponía
`createPeoplePanel`/`createOrdersPanel`. UI-R1/UI-R2 ya decidieron en el
código real `ordersPanel` (minúscula, sin `create`), y esta ronda sigue esa
convención viva en vez de la del documento de planificación previo a la
implementación — la misma clase de desvío documentado que ya hizo UI-R2 en
su §7.1 con las clases CSS. `createInspectPanel` sí conserva el nombre
literal del plan porque no colisiona con nada ya decidido y es el que cita
`implementation-plan.md` §4 explícitamente.

---

## 6. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
npx vitest run tests/fast/ui-redesign-shell.test.ts tests/fast/app.test.ts \
  tests/fast/notice.test.ts tests/fast/ui-doing.test.ts tests/fast/ui-title.test.ts \
  tests/fast/ui.test.ts tests/fast/ui-orders.test.ts tests/fast/ui-redesign-people.test.ts
```

Salida real (8 ficheros, 83 pruebas, 83 verdes):

```
✓ tests/fast/ui-orders.test.ts (23 tests)
✓ tests/fast/ui-redesign-shell.test.ts (10 tests)
✓ tests/fast/app.test.ts (8 tests)
✓ tests/fast/notice.test.ts (4 tests)
✓ tests/fast/ui-title.test.ts (8 tests)
✓ tests/fast/ui-redesign-people.test.ts (14 tests)
✓ tests/fast/ui-doing.test.ts (4 tests)
✓ tests/fast/ui.test.ts (12 tests)
Test Files  8 passed (8)
     Tests  83 passed (83)
```

`tests/fast/ui-redesign-people.test.ts` es el fichero nuevo (14 pruebas):
`namedPresent` contra el filtro literal (dos semillas, con y sin muertos);
`peopleScope`; identidad por id con dos nombrados forzados al mismo nombre
(AC-9: «no comparar sólo nombres, pueden repetirse»); `trackedIdFor` para
edificio/terreno/no-pedido/vivo/muerto/emigrado/id inexistente (AC-10, AC-11,
AC-12); y `panelFor` de un fallecido mirado veinte años después y de un
emigrado, más la referencia desaparecida.

**No se ejecutó `ui-milestones.test.ts`**: sigue roja de antes (heredada,
documentada desde UI-R1), ajena a esta ronda.

**La integración real** (clic sobre una fila, «Follow»/«Stop following» de
verdad, volver a la lista, la bandeja visible para `people`) se acreditó con
clics de Playwright reales contra el juego empaquetado — nunca llamando a
`peoplePanel`/`createInspectPanel` directamente desde un test, por la regla
de `CLAUDE.md`: «una prueba que llama a una función directamente no sabe si
el juego la llama». Es el mismo método de UI-R2 §5, y fue lo que destapó el
fallo de §4.

---

## 7. Capturas

Backend real: **`pilot3d`**, confirmado por `document.documentElement.
dataset.render` en cada disparo y por «errores de página: ninguno». Semilla
11, año 50 (44 personas), viewport 390×844, DPR 2.

| # | Qué | Fichero |
|---|---|---|
| 0 | Reposo, para referencia (`tools/graphics/shot.mjs --seed 11 --year 50 --settle 6 --answer 1`) | `artifacts/graphics/UI/R4/00-valley-baseline.png` |
| 1 | People: «5 named, of 44 in the valley.», cinco filas completas, pestaña encendida | `.../01-people-list.png` |
| 2 | Ficha abierta desde una fila de People (`from: 'people'`): «Back to the list» visible | `.../02-inspect-from-people.png` |
| 3 | La misma ficha tras pulsar «Follow»: «Stop following» pulsado y la nota de honestidad del seguimiento | `.../03-inspect-following.png` |
| 4 | Vuelta a la lista con «Back to the list»: misma lista, ninguna identidad nueva | `.../04-back-to-people.png` |
| 5 | Ficha de un edificio (Stone House): sin control de seguimiento (`.valley-panel-follow` cuenta 0) | `.../05-inspect-building-no-follow.png` |

Las capturas 1–5 se tomaron con un script de Playwright propio (fuera de
`tools/`, borrado al terminar la ronda) porque `tools/graphics/shot.mjs` no
tiene un `--open people`/`--open inspect` — su `--open` sólo abre
`orders`/`speed`/`title` (líneas 60, 243). No se le añadió esa opción por no
tocar `tools/`; el script temporal usó los mismos gestos que un dedo real
(clic por rol accesible, clic sobre el lienzo) y el mismo navegador/bundle
que `shot.mjs`.

---

## 8. Casos de aceptación cubiertos

De `docs/ui-redesign/acceptance-scenarios.md`:

- **AC-9** (People: sólo nombrados presentes, identidad por id, volver no
  selecciona otro): cubierto por captura + pruebas puras.
- **AC-10** (seguimiento desde el mundo): cubierto por `trackedIdFor` +
  capturas 2–3; **parcial** — no hay captura de seguir desde un toque en el
  valle (sólo desde People), aunque el código no distingue el origen:
  `createInspectPanel` recibe el mismo `target` sea cual sea `from`.
- **AC-11** (la persona deja de estar): cubierto en pruebas puras
  (`trackedIdFor`, `panelFor`), **sin** captura — ver §3, límite real y no
  ocultado.
- **AC-12** (edificio y terreno): cubierto, captura 5.

---

## 9. Fallos heredados y hallazgos ajenos a esta ronda

- **`ui-milestones` sigue roja** (semilla 999, 18 hitos contra ≥20). Ajena,
  documentada desde UI-R1, no tocada aquí.
- **Una opinión sin redondear se ve en pantalla**: la captura
  `03-inspect-following.png` enseña «Resents Hereburh: -99.77499999999995.»
  — `villagerPanel` (`src/ui/inspect.ts`, código que ya existía antes de
  esta ronda, en el bloque `strong` que esta ronda no tocó) interpola
  `value` en crudo desde `person.opinions`, sin redondear. No es un fallo
  introducido aquí —lo hereda todo lo que ya usaba `panelFor` para una
  persona con una opinión fuerte—, pero esta ronda lo hizo visible por
  primera vez en una captura porque es la primera que fotografía una ficha
  con memorias/opiniones reales. Dejado sin tocar: `inspect.ts` está dentro
  de mi alcance, pero arreglar el redondeo de `opinions` no es parte del
  brief de UI-R4 y no quería mezclar un cambio de formato de datos con la
  migración de contenedor. Queda anotado para quien integre (UI-R5) o para
  quien lo recoja explícitamente.

---

## 10. Qué observación refutaría lo hecho aquí

- Que la ruta `people` deje de mostrarse tras algún camino de navegación no
  cubierto por las capturas (por ejemplo, entrar en `people` justo después
  de una encrucijada o de un letargo) — indicaría que el forzado de
  `sheetContent.hidden = false` de §5.1 tiene una carrera con
  `shell.setRoute` que esta ronda no vio.
- Que un control montado dentro de la ficha o la lista deje de responder al
  primer toque en un dispositivo real (no swiftshader) — repetiría el mismo
  patrón que §4 destapó, en un sitio que esta ronda no ejercitó con un clic
  real.
- Que `trackedIdFor` diverja de lo que hace el botón de verdad — indicaría
  que `inspect-panel.ts` dejó de llamarla en algún camino y reconstruyó la
  lógica a mano.
- Que abrir/cerrar la lista de gente cambie algo del estado del motor o
  consuma RNG — indicaría que `peoplePanel`/`createInspectPanel` dejaron de
  ser consultas puras sobre `snapshot.state`.

---

## 11. Lo siguiente

UI-R5 (integrador): unir esta rama con UI-R3, conectar el enlace
persona/lugar de la crónica a la ruta `inspect` ya preparada para recibir
fallecidos y emigrados (§3), y decidir si `contentRouteFor` (`shell.ts`) se
extiende para que `people` deje de depender de la lectura de DOM de §5.1.
