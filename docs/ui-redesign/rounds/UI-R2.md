# UI-R2 · Cabecera, actividad, órdenes y velocidad

**16 sep 2026.** Segunda ronda de implementación del rediseño de interfaz
(`docs/ui-redesign/implementation-prompt.md`), hecha por el integrador. Rama
`rework/parada-a-media`.

---

## 1. Ancla

**Commit de partida:** `21b11e9` («U-10b · El menú abre el valle en el año
que se le pida, detrás de un interruptor de taller»), el que figuraba en el
`git status` inicial de la sesión.

**Otra sesión avanzó la rama mientras se trabajaba** (el mismo patrón que
`docs/dos-sesiones.md` describe, ya vivido en UI-R1): `d2a1e73`, `7e4705f`,
`8da4064` (U-10b, «el campo del año va vacío, se selecciona al tocarlo» — un
aviso del coordinador a media ronda pidió no tocar `title.ts` y comprobar
`git log` antes de cerrar, hecho: `title.ts` no aparece en mi diff), `0637a32`
y `18c047c` (G-19, aldeanos), y `1c6867b` (IA-9, un arreglo de la IA de
movimiento — «la intención muerta que nadie soltaba» — que no es la misma
«intención» que las tres palancas de esta ronda: es la del motor de vida en
`src/render3d/life/`, y su diff no toca ni un fichero de los míos). **Comprobado
sin colisión:** `git diff --stat` contra HEAD (`1c6867b`) sólo mueve
`src/ui/app.ts` y `src/ui/redesign/shell.css`, ninguno tocado por esos seis
commits.

---

## 2. Ficheros

**Creados:**
- `src/ui/redesign/hud.ts` — `createHud`: hora, fecha, la tira de cuatro
  cifras con tendencia, la frase de actividad y la línea-resumen de las
  órdenes; y el control de velocidad (`speedControls`/`speedBadge`).
  `seasonLabel` se mudó aquí desde `app.ts` (reexportada).
- `src/ui/redesign/orders.ts` — `ordersPanel`: la hoja de las tres palancas,
  ahora un `PanelFactory` de verdad, migrada a `shell.content`. Exporta
  `nextIntentForLever`/`nextIntentForPriority`, puras, para poder probarlas
  sin DOM.
- `tests/fast/ui-orders.test.ts` — 23 pruebas de esas dos funciones puras.

**Modificados:**
- `src/ui/app.ts` — sustituida toda la construcción manual de cabecera,
  tira, órdenes y velocidad por `createHud`/`ordersPanel`; `navigate()` monta
  y desmonta `orders.element` en `shell.content`; `setIntent` centraliza la
  respuesta de `answerFor` y el guardado (antes vivía repetida en cada botón
  de palanca); **un arreglo de una condición de carrera de gestos en el
  manejador global de `pointerup`** (§4.2 más abajo, encontrado y corregido
  dentro de esta ronda, imprescindible para que las órdenes funcionaran de
  verdad).
- `src/ui/redesign/shell.css` — dos arreglos, los dos encontrados con un
  clic de verdad y no a ojo (§4.1, §4.3): `.ui-shell-content` gana
  `pointer-events: auto` explícito (heredaba `none` de `.ui-shell` sin que
  nada lo devolviera); `.ui-shell-message` gana `pointer-events: none` con
  `auto` sólo en sus hijos, para dejar de tragarse los toques de lo que hay
  debajo cuando no muestra nada.

**No tocados, a propósito:** `src/ui/redesign/contracts.ts`,
`src/ui/redesign/shell.ts` (sólo se leyó), `src/ui/vitals.ts`,
`src/ui/doing.ts`, `src/ui/answer.ts`, `src/ui/speed.ts`,
`src/ui/screens/{chronicle,people,crossroad,epitaph,title}.ts`, todo
`src/engine/` salvo lectura, todo `src/render3d/`, `tools/`.

---

## 3. Qué pedía el brief, y qué se hizo con cada punto

> Implementa sobre datos reales: hora y fecha; cuatro indicadores de
> `vitalsOf`; tendencia de `trendsOf`; actividad de `doingNow`; respuesta de
> `answerFor`; órdenes `fields`, `timber` y `priority`; velocidad y pausa
> mediante `TIME.SPEEDS` y `speedLabel`.

Los siete están servidos, todos desde las mismas funciones puras que ya
existían (ninguna se tocó): `hud.ts` llama a `vitalsOf`/`trendsOf`/`doingNow`/
`stopOf` en cada `paint`, y `orders.ts` construye sus tres filas literalmente
de `INTENT_STOPS`/`PRIORITY_STOPS` — ninguna opción ni etiqueta se
reconstruye a mano. `speedLabel`/`TIME.SPEEDS` alimentan la regleta y el
badge. `answerFor` se dispara una vez por orden dada, desde `actions.setIntent`
en `app.ts` (el único punto de escritura que `contracts.ts` concede a un
panel), y no en `orders.ts`.

> Abrir o cerrar la bandeja no puede cambiar intención, velocidad, tick ni
> estado.

Comprobado con clics reales de Playwright contra el juego empaquetado (no una
llamada directa a una función): abrir la hoja, no tocar ninguna palanca,
cerrarla — la línea-resumen de las órdenes es literalmente la misma cadena
antes y después. Ver §5.

> Mientras el juego está pausado, navegar no avanza el tick.

Comprobado igual: en pausa, `data-tick` se lee antes de navegar
Valley→Chronicle→People→Valley y después de cambiar una orden — el mismo
número las tres veces.

---

## 4. Lo que no pedía el brief y hizo falta arreglar de todos modos

Esta es la parte que más ha costado, y por lo que costó: **una captura que
sólo mira** no basta para acreditar una orden. UI-R1 dejó `shell.content`
construido pero vacío; en cuanto esta ronda metió contenido de verdad ahí, un
clic real (no una captura, no una llamada directa) destapó tres fallos
encadenados que ninguna de las 56 pruebas ni las 12 capturas de UI-R1 podían
ver, porque ninguna probaba tocar algo *dentro* de la bandeja.

### 4.1 · `.ui-shell-message` se tragaba los toques del control de velocidad

Antes de tocar nada: un clic de Playwright de verdad sobre
`.valley-speed-badge` (bottom-right, siempre visible) fallaba con
`<div class="ui-shell-message"> … intercepts pointer events`. La regla
`.ui-shell-message:empty { min-height: 0; padding: 0 }` de UI-R1 nunca llega
a aplicar: el contenedor **nunca está `:empty`** en el sentido de CSS —
`notice.ts` monta su banda (oculta con `hidden`) y `app.ts` mete ahí la pista
del inicio guiado (también oculta) desde el primer pintado—, así que hereda
`pointer-events: auto` de `.ui-shell-stack > *` y reserva una franja
invisible de 56 px justo encima de la navegación, tapando al botón de
velocidad y al de sonido, que viven ahí debajo en `.valley-hud-right`.

**Arreglo:** `.ui-shell-message { pointer-events: none }` y
`.ui-shell-message > * { pointer-events: auto }` — el hueco vacío deja pasar
el toque; el aviso o la pista, cuando de verdad se ven, lo siguen recibiendo.

### 4.2 · El manejador global de gestos convertía cualquier clic en un toque al valle

Este es el hallazgo más serio, y no es de esta ronda ni de UI-R1: es un
defecto general del manejo de gestos de `boot()`, vivo desde antes de que
existiera un solo «UI-R». `root.addEventListener('pointerup', …)` hacía
`const points = trace.get(event.pointerId) ?? []` y a continuación
**empujaba el punto actual a ese array recién creado**. Con un único punto,
`first === last` siempre, así que `recogniseGesture` daba distancia y
duración cero → **siempre `'tap'`**, para *cualquier* `pointerup` que
burbujeara hasta `root` — incluido el de un botón cualquiera, cuyo
`pointerdown` nunca pasó por `onValley` (que exige `event.target instanceof
HTMLCanvasElement`) y por tanto nunca dejó nada en `trace`.

El resultado: **todo clic en cualquier control de la interfaz disparaba
también `backend.live.pick()` sobre ese punto de la pantalla** y navegaba a
lo que hubiera debajo. Para un botón que además llama a `actions.navigate`
(las pestañas de abajo, el botón de sonido) el `click` real llegaba
milisegundos después y corregía el resultado sin que se notara nunca — por
eso 56 pruebas y 12 capturas de UI-R1 no lo vieron. Para los botones de
`orders.ts`, montados dentro de `shell.content`, el pick espurio disparaba
`navigate({kind:'inspect', target, from:'valley'})`, que hace
`shell.content.replaceChildren()` — **retirando el propio botón del árbol
antes de que le llegara su `click`**. Medido con Playwright: tocar «Sowing:
Heavy» hacía desaparecer la hoja entera y abría la ficha de un edificio
cualquiera bajo el dedo, sin cambiar una sola orden. El botón «×» de la hoja
sufría lo mismo.

**Arreglo:** en el mismo manejador, si `trace` no tenía una entrada real
para ese `pointerId` (es decir, si su `pointerdown` no empezó sobre el
lienzo), se sale sin tocar nada — nunca se fabrica un punto de la nada. Los
gestos reales del valle (arrastrar, pellizcar, doble toque, tocar un
aldeano) no cambian: siguen teniendo su entrada legítima en `trace` desde
`pointerdown`.

### 4.3 · `.ui-shell-content` heredaba `pointer-events: none` de `.ui-shell`

Encontrado al perseguir 4.2: con el manejador de gestos ya arreglado, un
clic sobre el «×» propio de la hoja de órdenes seguía sin llegar —
`elementsFromPoint` en ese punto ni siquiera *incluía* `.ui-shell-content`
en la pila de aciertos. `.ui-shell` (el contenedor común) pone
`pointer-events: none` para que el hueco entre navegación y bandeja no tape
el valle; `.ui-shell-stack > *` lo devuelve a `auto` para sus hijos
(mensaje, navegación), pero **nadie hacía lo mismo por `.ui-shell-content`**,
el otro hijo directo de `.ui-shell`. Al ser una propiedad heredada, toda la
hoja de órdenes —cierre y las tres palancas— quedaba fuera de la
comprobación de impacto del navegador.

**Arreglo:** `.ui-shell-content { pointer-events: auto }` explícito.

Los tres arreglos se verificaron cada uno por separado, deshaciendo el
anterior para comprobar que realmente hacía falta (documentado en el propio
proceso de esta ronda: sin 4.3 el clic real seguía fallando aunque 4.2 ya
estuviera puesto, contra `<div id="root">`; con los tres puestos, la pila de
aciertos en el «×» es exactamente `valley-panel-close →
ui-shell-content-close → … → ui-shell-content → canvas → valley-app → body →
html`, en ese orden).

---

## 5. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
npx vitest run tests/fast/ui-redesign-shell.test.ts tests/fast/app.test.ts \
  tests/fast/notice.test.ts tests/fast/ui-doing.test.ts tests/fast/ui-title.test.ts \
  tests/fast/ui.test.ts tests/fast/ui-orders.test.ts
```

Salida real (69 pruebas, 69 verdes):

```
✓ tests/fast/ui-orders.test.ts (23 tests)
✓ tests/fast/ui-redesign-shell.test.ts (10 tests)
✓ tests/fast/app.test.ts (8 tests)
✓ tests/fast/notice.test.ts (4 tests)
✓ tests/fast/ui-title.test.ts (8 tests)
✓ tests/fast/ui-doing.test.ts (4 tests)
✓ tests/fast/ui.test.ts (12 tests)
Test Files  7 passed (7)
     Tests  69 passed (69)
```

**No se ejecutó `ui-milestones.test.ts`**: sigue roja de antes (semilla 999,
18 hitos contra ≥20), heredada y documentada en UI-R1, ajena a esta ronda —
no se ha tocado ni se cuenta aquí.

`tests/fast/ui-orders.test.ts` es el fichero nuevo de esta ronda: 23 pruebas
de `nextIntentForLever`/`nextIntentForPriority` (`src/ui/redesign/orders.ts`),
las dos funciones puras que el panel deja fuera del DOM a propósito —este
proyecto no tiene jsdom, misma razón que dio UI-R1 para `ui-redesign-shell.
test.ts`—. Cubren, para cada posición de `INTENT_STOPS`/`PRIORITY_STOPS`: que
aplica el valor correcto, que **no** mueve las otras dos palancas, que
`stopOf` recupera exactamente la misma clave que se aplicó (ida y vuelta), y
que una clave desconocida no toca nada.

**La integración real (los tres hallazgos de §4) se acreditó con clics de
Playwright de verdad sobre el juego empaquetado, nunca llamando a una
función interna directamente** — es la regla de `CLAUDE.md`: «una prueba que
llama a una función directamente no sabe si el juego la llama». No hay
prueba rápida para esto (no hay jsdom, y una prueba de Playwright cae en
`test:shots`, que esta ronda no ejecuta por regla del dueño); queda como
hallazgo documentado y verificado a mano, con el método repetible descrito
en §4.

---

## 6. Capturas

Backend real: **`pilot3d`**, confirmado en cada disparo por la salida
`errores de página: ninguno` y por `document.documentElement.dataset.render`
que ya comprueba el propio capturador. Semilla 11, año 50 (44 personas,
`--year 50 --settle 6`, la muestra que el coordinador recomendó a media
ronda: más cifras que mirar que la pareja fundadora del año 1), viewport
390×844, DPR 2, `tools/graphics/bundle-game.ts` + `tools/graphics/shot.mjs`
sobre el juego empaquetado real.

| # | Qué | Fichero |
|---|---|---|
| 1 | Reposo: hora, fecha, tira con tendencias, actividad, resumen de órdenes, velocidad | `artifacts/graphics/UI/R2/01-valley-rest.png` |
| 2 | Hoja de órdenes abierta, migrada a `shell.content`: las seis filas completas (incluida «Walls», antes cortada por el defecto §3.5 de UI-R1) | `.../02-orders-open.png` |
| 3 | Regleta de velocidad desplegada: Pause/1×/4×/16×/64×, literal de `TIME.SPEEDS` | `.../03-speed-open.png` |
| 4 | **Las tres órdenes aplicadas con clics reales y la hoja cerrada de verdad** (`--orders "Heavy,Wood"`, que abre, toca «Spare hands: Wood» y «Sowing: Heavy», y cierra con el «×» propio) | `.../04-orders-applied-and-closed.png` |

La 4 es la prueba visual de que §4.2/§4.3 quedan resueltos: el resumen dice
«Sowing heavy · hands to wood · building as needed» (las dos órdenes
cambiaron), el valle está completo detrás (la hoja cerró de verdad) y el
aviso de §11.6 lee «Not everyone goes to the trees. Something always needs
raising.» — `answer.someone_must_build`, disparado por `answerFor` desde el
único punto de escritura (`actions.setIntent`), con el botón de sonido y la
velocidad visibles y sin tapar debajo (arreglo §4.1).

---

## 7. Decisiones tomadas, y una que se dejó fuera a propósito

### 7.1 · `orders.ts` conserva las clases viejas, no las reinventa

`valley-orders`/`valley-panel-close` en vez de nombres nuevos: son las que
`tools/graphics/shot.mjs` (líneas 190, 197, 243) y `tools/valley.shots.ts`
(`.valley-panel:not(.valley-orders)`) ya usan, y este brief no puede tocar
`tools/`. El resultado es un close button propio de `orders.ts`
(`.valley-panel-close`) apilado exactamente en el mismo sitio que el close
genérico de la carcasa (`.ui-shell-content-close`, de `shell.ts`) — los dos
hacen lo mismo (`navigate({kind:'valley'})`), y un usuario ve un solo «×»
porque el de `orders.ts` pinta encima. No es elegante, pero es lo que deja
vivos los tres recorridos de `tools/` sin tocarlos.

### 7.2 · `ordersPanel`/`hud` se crean una vez, no por navegación

`contracts.ts` tipa `PanelFactory` como `(actions) => UiPanel` sin exigir
cuándo se llama. `orders.ts` se construye una sola vez en `boot()` y su
`element` se monta/desmonta de `shell.content` en cada `navigate()`, en vez
de crear una instancia nueva cada vez que se entra en la ruta `orders`. Es
más barato (nada que reconstruir: tres filas de botones, sin datos externos
que puedan caducar) y evita perder el trabajo de un `dispose()` con más
lógica de la que hace falta. Si un panel futuro necesita datos que sí
caducan (una lista que se puede quedar desactualizada), el patrón correcto
es el contrario, y debería documentarse aparte.

### 7.3 · No se movió el acceso a órdenes/velocidad a la pila de abajo

`docs/visual-reference/README.md` §5 y el propio comentario que UI-R1 dejó
en `shell.css` («el acceso a órdenes/tiempo… lo añade UI-R2 dentro de este
mismo `.ui-shell-stack`») apuntan a bajar `ordersNow`/la velocidad a una
fila de controles entre el mensaje y la navegación. **Se decidió no
hacerlo, y es un desvío deliberado del brief que se documenta aquí en vez de
hacerlo en silencio:** `intro.orders` dice «the line **above** is the
standing orders» e `intro.time` dice «the button at the **right** sets the
pace» — las dos son referencias de posición en pantalla, y moverlas a la
franja de abajo (donde queda *bajo* el aviso/pista, no encima) las habría
vuelto falsas sin que nadie lo pidiera arreglar. Cambiar el texto a la vez
que el sitio es un cambio mayor del alcance de esta ronda («cabecera,
actividad, órdenes y velocidad» sobre datos reales, no un rediseño de
layout), así que queda para una ronda que toque las dos cosas juntas, con el
coordinador de por medio.

### 7.4 · La respuesta de `answerFor` se centraliza en `actions.setIntent`

Antes vivía repetida en el manejador de clic de cada una de las tres
palancas (`orderRow`, en `app.ts`). Ahora está una vez, en el único sitio
que de verdad escribe `state.intent` — `orders.ts` sólo emite la intención
nueva y no sabe nada de `answerFor` ni de `notices`. Es lo que
`contracts.ts` ya pedía («un panel no toca el estado directamente») llevado
a su conclusión: si mañana otro panel (la ficha, digamos) necesitara cambiar
una orden, heredaría la respuesta gratis.

---

## 8. Fallos heredados y pendientes

- **`ui-milestones` sigue roja** (semilla 999, 18 hitos contra ≥20). Ajena,
  documentada por UI-R1, no tocada aquí.
- **La ficha (`inspect`) todavía no está en `shell.content`** — es UI-R4.
  Con `contentRouteFor('inspect')` ya devolviendo no-null desde UI-R1, la
  bandeja se hace visible (`content.hidden = false`) sin que nadie monte
  nada dentro mientras se inspecciona algo: se ve un rectángulo de papel
  vacío con un «×» flotando, encima de la ficha real (que sigue viviendo en
  el `<section class="valley-panel">` suelto de siempre). **No es un
  hallazgo nuevo de esta ronda pero se hace más visible ahora que
  `.ui-shell-content` por fin recibe toques** (§4.3): antes, con
  `pointer-events: none` heredado, ese rectángulo vacío no interceptaba
  nada; ahora si acepta toques, que caen sobre él en vez de llegar a la
  ficha de debajo si por casualidad coinciden en el mismo punto de la
  pantalla. **Dicho aquí explícitamente porque UI-R4 lo va a heredar** y
  conviene que lo sepa antes de mirar sus propias capturas: migrar la ficha
  a `shell.content` (que es exactamente su brief) lo resuelve solo.
- **El defecto de gestos de §4.2 era general, no sólo de `orders.ts`.** Se
  arregló en la raíz (`root`'s `pointerup`), así que beneficia a cualquier
  control futuro que se monte dentro de `shell.content` — incluida la ficha
  de UI-R4 —, pero no se ha hecho una auditoría exhaustiva de qué otros
  caminos dependían del comportamiento viejo (ninguno debería, porque el
  comportamiento viejo era «pick espurio que un `click` posterior siempre
  corregía», nunca una función deseada). No se ha encontrado ningún caso en
  el que el comportamiento nuevo cambie algo que antes funcionara a
  propósito.

---

## 9. Qué observación refutaría lo hecho aquí

- Que un control **fuera** de `shell.content` (nav, hud-right, hint) deje de
  responder tras el arreglo de §4.2 — indicaría que algún camino sí
  dependía del pick espurio para corregirse a sí mismo, y que mi lectura de
  «el `click` real siempre gana» era incompleta.
- Que abrir/cerrar la hoja de órdenes cambie el resumen (`ordersNow`) sin
  haber tocado una palanca, en un caso no cubierto por §5 (por ejemplo, tras
  un letargo largo o una sucesión de aldea).
- Que exista un dispositivo real (no swiftshader) donde `.ui-shell-content`
  siga sin recibir toques pese al arreglo de §4.3 — indicaría que la
  herencia de `pointer-events` no era la única causa, y que swiftshader sólo
  reproducía una de varias.
- Que `nextIntentForLever`/`nextIntentForPriority` diverjan de lo que hace
  el botón de verdad — indicaría que `orders.ts` dejó de llamar a las
  funciones puras en algún camino y volvió a reconstruir la lógica a mano.

---

## 10. Lo siguiente

**UI-R3 (crónica)** y **UI-R4 (personas y fichas)**, en paralelo, ahora que
el contrato de UI-R2 está congelado. Antes de empezar UI-R4: leer §8 de
aquí — el rectángulo vacío de `shell.content` en la ruta `inspect` ya se
puede ver (y ya acepta toques) con las herramientas de este mismo informe.
