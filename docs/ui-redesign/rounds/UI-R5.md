# UI-R5 · Integración, decisiones y salida

**16 sep 2026.** Quinta ronda del rediseño de interfaz
(`docs/ui-redesign/implementation-prompt.md`, sección «UI-R5 — integración,
decisiones y salida»), hecha por el integrador. Rama `rework/parada-a-media`,
worktree propio.

---

## 1. Ancla

**Commit de partida:** `ad46791` («Tablero: UI-R4 aterrizada, UI-R2/R3/R4
completas»), el que figuraba en el `git status` inicial del worktree — el
`HEAD` de `main`/la rama en ese momento.

---

## 2. Ficheros

**Modificados:**
- `src/ui/redesign/shell.ts` — `contentRouteFor` extendida a las cuatro rutas
  que montan algo en `shell.content` (`orders`, `inspect`, `chronicle`,
  `people`); sólo `valley` no monta nada (§3.1).
- `src/ui/app.ts` — los dos rodeos manuales de UI-R3/UI-R4 (leer
  `.ui-shell-content` por `querySelector` y forzar `hidden = false`) se
  retiran de `navigate()`; y la encrucijada fuerza `navigate({kind:'valley'})`
  antes de abrirse si una bandeja ya estaba abierta (§3.3, hallazgo nuevo).
- `src/ui/screens/chronicle.ts` — enlace persona → ficha desde una entrada de
  la crónica (§3.2): `ChronicleSource` lleva ahora `happenings?` opcional;
  `personLinksFor` (pura, exportada) y `linkNamesInParagraph`/
  `linkChronicleNames` (DOM) sólo tocan `chroniclePanel` (el camino vivo de
  la barra), nunca `openChronicle`/`yearBlock` (el camino del epitafio, sin
  cambios). CSS nueva: `.chronicle-name-link`.
- `src/engine/chronicle/bank.en.ts` — una clave nueva, `chronicle.person.link`
  (la etiqueta accesible del enlace en línea).
- `tests/fast/ui-redesign-shell.test.ts` — las dos pruebas de
  `contentRouteFor` que fijaban el contrato viejo («crónica, gente y valle no
  montan nada») se sustituyen por el nuevo (cuatro rutas sí, sólo `valley`
  no). No está en la lista de «tests/fast/ui*.test.ts nuevos» del brief, pero
  tocarla es consecuencia directa e inevitable de extender una función que
  ese fichero fija — dejarla como estaba habría dejado una prueba roja
  describiendo un contrato que este mismo brief pide romper.

**Creados:**
- `tests/fast/ui-chronicle-links.test.ts` — 5 pruebas de `personLinksFor`.

**No tocados, a propósito:** `src/ui/redesign/{contracts,hud,orders,
inspect-panel,people-panel}.ts`, `src/ui/screens/{crossroad,epitaph,
title}.ts`, `index.html`, `tools/`, todo `src/render3d/`, `src/derive/`, el
resto de `src/engine/`.

---

## 3. Los tres deberes de UI-R4, uno por uno

### 3.1 · `contentRouteFor` extendida, los dos rodeos retirados

Hecho tal cual lo pedía el brief. `contentRouteFor` (`shell.ts`) pasa de
`'orders' | 'inspect' | null` a `'orders' | 'inspect' | 'chronicle' | 'people'
| null`, con una regla más simple que la lista explícita que tenía: «todo
menos `valley` monta algo» (`route.kind === 'valley' ? null : route.kind`).
Los dos rodeos de `app.ts` —el de UI-R3 (§3.2 de su informe) y el de UI-R4
(§5.1 del suyo)— se retiran: `shell.setRoute(route)` ya deja `.ui-shell-
content` visible por sí sola para las cuatro rutas, y `navigate()` sólo monta
el elemento correspondiente en `shell.content`.

Verificado con clics reales (Playwright, script ad hoc borrado al terminar,
ver §6): abrir People, abrir una fila, «Back to the list», abrir Chronicle —
las tres rutas se ven y funcionan exactamente igual que antes de quitar los
rodeos. `contentHidden`/`scrimVisible` comprobados desde fuera del DOM, no
supuestos.

### 3.2 · El enlace persona/lugar de la crónica a `inspect`

**Sí se pudo, y con un identificador real** — la investigación de UI-R3
(«`ChronicleEntry.params` es texto, no hay id, no se enlaza nada») seguía
siendo cierta para `ChronicleEntry` en sí, pero no agotaba lo que el motor
guarda: R-1 (`docs/historico/rework.md`, ya en `main`) añadió `state.happenings`, y
`world/fate.ts` deja un `VillagerId` real —nunca un nombre— en
`record.who` para dos de los doce sucesos del valle:
`quarrel_in_the_square` (los dos implicados) y `child_lost` cuando el niño
está nombrado. El mismo paso del tick (`sim.ts`, 2b) empuja el registro y la
línea de crónica **en el mismo tick**, así que el tick identifica sin
ambigüedad qué registro corresponde a qué entrada — es el mismo atajo que
`CLAUDE.md` ya documenta para `life/staging.ts` y la riña de §7.9, aplicado
aquí a la interfaz en vez de a la capa de vida.

**Cómo se enlaza sin analizar frases.** `personLinksFor(entry, record)`
empareja `entry.params.A`/`.B` (el nombre ya escrito) con `record.who[0]`/
`[1]` por **posición**, nunca por comparar texto — la garantía que pide el
brief (AC-9: dos aldeanos pueden llamarse igual). Para *localizar* qué
párrafo del DOM corresponde a esa entrada exacta (necesario porque
`renderChronicleYear`, en `src/engine/chronicle/render.ts`, devuelve
`string[]` sin conservar de qué entrada salió cada línea, y ese fichero está
fuera del alcance de esta ronda), `linkChronicleNames` calcula el texto
exacto que esa entrada produce —`renderEntry(entry, source.rng,
chronicle.indexOf(entry))`, la misma función pura que usa internamente
`renderChronicleYear`— y busca el único párrafo que dice exactamente eso.
Es seguro porque los dos sucesos enlazables nunca se agregan
(`yearKey('fate.*')` no reconoce ninguna plantilla `fate.*` en
`chronicle/events.ts`, así que siempre salen en su propia línea): si algún
día eso cambiara, la búsqueda simplemente no encontraría párrafo y no se
enlazaría nada — el fallo seguro es no enlazar, nunca enlazar mal. Dentro
del párrafo ya emparejado uno a uno con su entrada, cualquier aparición
literal del nombre es, con certeza, esa persona (ni siquiera hace falta mirar
si el nombre se repite dentro de la misma frase, como en `fate.
child_lost.named`: las dos apariciones son la misma persona).

**Alcance real, dicho explícito:** sólo la partida en curso lo lleva.
`ArchivedGame` no guarda `happenings` (sólo `chronicle`), así que una crónica
archivada se lee exactamente igual que antes — sin enlaces —, y
`ChronicleSource.happenings` es opcional para eso. El camino del epitafio
(`openChronicle`/`yearBlock`, que llama `screens/epitaph.ts` directamente) no
se toca ni se enlaza: sigue siendo el mismo camino estático que UI-R3 dejó,
consistente con su decisión de «dos caminos, una piel» (§3.1 de su informe).

**Verificado con un clic real** (script Playwright ad hoc, borrado al
terminar — ver §6 y las capturas de §7): con la política de referencia
(`--year 60 --answer 1`, semilla 11) la crónica trae docenas de riñas
enlazadas (`docs/historico/rework.md` cuenta trece sucesos al año; en sesenta años eso
es mucho volumen y una parte cae en `quarrel_in_the_square`/`child_lost`).
Se clicó el nombre subrayado «Siward» dentro de «A quarrel between Siward and
Offa in year 59…» y la ficha que se abrió es la de Siward de verdad —mismo
nombre, datos reales de `panelFor`—, con la pestaña «Valley» encendida
(`from: 'valley'`, sin «Back to the list», que sólo aparece si `from ===
'people'`) y sin errores de página.

### 3.3 · El botón de cierre: no se unifican, y un hallazgo nuevo en su lugar

**Decisión: no se tocan los tres cierres** (el «×» compartido de la carcasa,
el propio de `orders.ts`, el «Back to the list» de la ficha). Extender
`contentRouteFor` sólo decide si `.ui-shell-content` está *visible*; no toca
el manejador de clic del «×» compartido (`shell.ts`, `contentClose`), que
sigue llamando siempre a `actions.navigate({kind:'valley'})` sin conocer
`route.from`. Hacerlo de verdad exigiría o (a) que ese botón leyera la ruta
activa y calculara un destino distinto según `from` —posible dentro de
`shell.ts`, que sí es mío esta ronda, pero entonces el «Back to the list» de
`inspect-panel.ts` (fuera de mi lista de ficheros) quedaría duplicando la
misma acción en vez de sobrar—, o (b) retirar el «×» propio de
`orders.ts`/el «Back to the list» de `inspect-panel.ts`, los dos fuera de los
ficheros que este brief me deja tocar. Unificar de verdad pide coordinarse
con quien sí puede tocar esos dos ficheros; aquí sólo se habría podido dejar
un cuarto botón a medias. Se deja como UI-R4 lo dejó, con el motivo escrito.

**Lo que sí apareció al comprobar esta zona: la encrucijada NO tenía
prioridad sobre una bandeja que ya estuviera abierta antes de plantearse.**
El brief pedía comprobar «la encrucijada tiene prioridad… ya debería ser así
por z-index» — y no lo era. `.crossroad-scrim` (`screens/crossroad.ts`,
z-index 10) y `.ui-shell-content` (`redesign/shell.css`, z-index 13) compiten
en el mismo contexto de apilamiento a propósito (`.ui-shell` no lleva
`z-index` propio, comentario de `shell.css`), así que **cualquier** bandeja
—People, Chronicle, una ficha, incluso las órdenes— que ya estuviera abierta
cuando el motor plantea una decisión se queda por encima, tapándola casi
entera: `.crossroad-open .valley-orders { visibility: hidden }` (en
`crossroad.ts` desde UI-R2) sólo vacía el contenido de las órdenes, nunca la
caja de `.ui-shell-content` en sí, y no dice nada de las otras tres rutas.
Medido con un recorrido real (§6): con People abierta *antes* de que
madurase la primera encrucijada, sólo un borde del texto asomaba por debajo
del panel — título, opciones y precio, tapados del todo. Es justo lo que
`CLAUDE.md` pide que nunca pase («toda opción de encrucijada cambia algo en
pantalla, `visible.length >= 1`, siempre»): una decisión planteada pero
invisible detrás de una lista de gente es, para quien juega, una decisión
que no existe.

**Arreglado dentro de mi propio fichero** (`app.ts`, `paint()`): antes de
`openCrossroad`, si la ruta activa no es `valley` se navega a `valley`
primero — el mismo destino al que ya lleva deslizar hacia abajo para aplazar
una decisión (S-05, U-14), así que la decisión se queda pendiente, nunca se
pierde. Confirmado con el mismo recorrido, antes y después del cambio: antes,
`elementFromPoint` en la zona de solape devolvía `.ui-shell-content`; después,
`.crossroad-scrim`, y la captura muestra «The Drover» completo, con las dos
opciones y sus precios (§7, captura 4).

---

## 4. El resto del brief — verificado, no reconstruido

- **Epitafio, crónica archivada, parte de bienvenida:** `screens/epitaph.ts`
  no se ha tocado; `openChronicle`/`closeChronicle` siguen verbatim (UI-R3
  §3.1); `welcome.ts` no está en los ficheros de esta ronda y no se ha
  tocado.
- **`dispose()` sin listeners sueltos, sin elementos invisibles atrapando
  toques:** con `contentRouteFor` unificado, las cuatro rutas comparten el
  mismo mecanismo de visibilidad (`content.hidden`), así que ya no hay una
  ruta (`people`, antes) que dependiera de un rodeo aparte para no quedarse
  con `hidden` a medias. Comprobado con clics reales, no sólo lectura de
  CSS: abrir/cerrar People y Chronicle repetidamente, sin doble navegación
  observable.
- **Doble aceptación / doble navegación:** no se ha tocado `App.decide` ni
  `attemptDecision` (`tests/fast/app.test.ts` sigue verde, 8 pruebas, sin
  cambios de comportamiento).

---

## 5. Un archivo tocado fuera de la lista, y por qué

`tests/fast/ui-redesign-shell.test.ts` no está en «tests/fast/ui*.test.ts
nuevos», pero extender `contentRouteFor` (que sí es mío, según el propio
brief: «si `contentRouteFor` es tuyo por definición del brief, tócalo y
dilo») deja sin sentido dos de sus aserciones, que fijaban literalmente el
contrato viejo («crónica, gente y valle no montan nada»). Dejarlo así habría
cerrado la ronda con una prueba roja describiendo un comportamiento que este
mismo brief pide cambiar. Se sustituyen esas dos pruebas por las que
describen el contrato nuevo, sin tocar nada del resto del fichero
(`navTabFor`, `resolveMessageSlot`, intactas).

---

## 6. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
npx vitest run tests/fast/ui-redesign-shell.test.ts tests/fast/app.test.ts \
  tests/fast/notice.test.ts tests/fast/ui-doing.test.ts tests/fast/ui-title.test.ts \
  tests/fast/ui.test.ts tests/fast/ui-orders.test.ts tests/fast/ui-chronicle.test.ts \
  tests/fast/ui-redesign-people.test.ts tests/fast/ui-chronicle-links.test.ts
```

Salida real (10 ficheros, 98 pruebas, 98 verdes):

```
✓ tests/fast/ui-orders.test.ts (23 tests)
✓ tests/fast/ui-redesign-shell.test.ts (10 tests)
✓ tests/fast/app.test.ts (8 tests)
✓ tests/fast/ui-chronicle-links.test.ts (5 tests)
✓ tests/fast/ui-chronicle.test.ts (10 tests)
✓ tests/fast/notice.test.ts (4 tests)
✓ tests/fast/ui-redesign-people.test.ts (14 tests)
✓ tests/fast/ui-title.test.ts (8 tests)
✓ tests/fast/ui-doing.test.ts (4 tests)
✓ tests/fast/ui.test.ts (12 tests)
Test Files  10 passed (10)
     Tests  98 passed (98)
```

`ui-milestones.test.ts` no se ha ejecutado: roja de antes (semilla 999, 18
hitos contra ≥20), heredada, documentada desde UI-R1, ajena a esta ronda.
`test:shots`/`test:journeys`/`test:all` no se han lanzado — la regla del
dueño («ninguna suite completa más de una vez fuera del cierre de tanda») y
el propio brief los deja para UI-R6.

**Integración real** (los tres deberes, y el hallazgo de la encrucijada):
acreditada con tres scripts de Playwright ad hoc contra el juego empaquetado
de verdad (`tools/graphics/bundle-game.ts` + Chromium con swiftshader),
nunca llamando a `personLinksFor`/`contentRouteFor` desde un test unitario
para simular el camino vivo — la regla de `CLAUDE.md» («una prueba que llama
a una función directamente no sabe si el juego la llama»). Los tres scripts
se borraron al terminar, como hicieron UI-R2/UI-R4; no viven en `tools/`.

---

## 7. Capturas

Backend real: **`pilot3d`**, confirmado leyendo `document.documentElement.
dataset.render` en cada script — nunca asumido. Viewport 390×844, DPR 2,
sobre `artifacts/graphics/G-10/game/valley.html`.

| # | Qué | Semilla/año | Fichero |
|---|---|---|---|
| 1 | Crónica del año 59/60: dos nombres subrayados y enlazables (Siward, Offa) en tres frases distintas de la misma riña, uno de ellos repetido dos veces dentro de una sola frase | 11 / 60, política de referencia | `artifacts/graphics/UI/R5/00-chronicle-link.png` |
| 2 | Tras clicar «Siward»: la ficha real de Siward (23 inviernos, rasgos, «Resents Offa»), pestaña «Valley» encendida, sin «Back to the list» (`from: 'valley'`) | 11 / 60 | `.../01-chronicle-link-opened.png` |
| 3 | People sigue viéndose igual sin los rodeos manuales de `app.ts` | 11 / 50, política de referencia | `.../02-people-still-visible.png` |
| 4 | (no numerada, sustituye el nombre por bundle) reposo de referencia | 11 / 50 | `.../03-baseline.png` |
| 5 | La encrucijada («The Drover», título + contexto + dos opciones con precio) por encima de una bandeja (People) que ya estaba abierta antes de plantearse — el hallazgo de §3.3, ya arreglado | 11, primera encrucijada tras fundar | `.../04-crossroad-vs-people.png` |

No hay captura del estado *roto* de §3.3 (se sobrescribió al repetir el
mismo recorrido tras el arreglo): la evidencia de «antes» es la comprobación
de programa (`document.elementFromPoint` en el punto de solape devolviendo
`.ui-shell-content`, no `.crossroad-scrim`), citada literalmente en §3.3, más
que una imagen. Si hiciera falta la imagen del defecto para el cierre de
tanda, se reproduce en un minuto con el mismo script (revertir el `if
(currentRoute.kind !== 'valley') navigate(...)` de `app.ts` y repetir el
recorrido de §3.3).

---

## 8. Casos de aceptación (`docs/ui-redesign/acceptance-scenarios.md`)

Cubiertos por esta ronda, con evidencia de clic real:

- **AC-05** (navegación y salida): Valley↔Chronicle↔People con el cierre
  visible, canvas conservado, una sola bandeja a la vez — confirmado tras
  quitar los dos rodeos.
- **AC-08** (retorno al epitafio): sin cambios de comportamiento, no
  tocado, coherente con la decisión de UI-R3.
- **AC-09/AC-10/AC-11/AC-12** (persona/edificio/terreno, seguimiento):
  comprobación de humo, no reconstrucción — People, una fila, «Follow»/
  «Back to the list» siguen funcionando exactamente igual que en UI-R4;
  la cobertura completa (edificio, muerte, emigración) sigue siendo la de
  `docs/ui-redesign/rounds/UI-R4.md` §8, sin repetirla aquí.

**No cubiertos a fondo, y por qué se dejan para UI-R6:** AC-06 (gesto de
lectura frente a cámara), AC-13 a AC-17 (aplazar/recuperar decisión, pausa,
precio largo, extinción durante consulta, regreso desde segundo plano),
AC-18 a AC-20 (tamaño/foco, persistencia, desmontaje). La tabla de reparto de
`acceptance-scenarios.md` §3 los asigna al «Integrador UI-R5», pero el
encargo real de esta ronda —los tres deberes de UI-R4 más «verifica, no
reconstruyas» el resto— y la instrucción explícita de no gastar más de lo
necesario apuntan a dejarlos para la validación completa de UI-R6
(`test:shots` de verdad, no un recorrido ad hoc). Ninguno de ellos depende de
código que esta ronda haya tocado salvo el propio `paint()` de §3.3, que si
acaso los hace más seguros (una encrucijada ya no puede quedar tapada
durante un aplazamiento con una bandeja abierta) y no menos.

---

## 9. Qué observación refutaría lo hecho aquí

- Que `contentRouteFor({kind:'valley'})` deje de ser el único caso `null` —
  por ejemplo, una quinta ruta futura que tampoco monte nada— sin que se
  actualice esta función: la regla «todo menos valley monta algo» dejaría de
  ser cierta en silencio.
- Que una entrada de crónica con dos personas del mismo nombre real (dos
  Hereburh distintas) apareciera en la MISMA frase de una riña simultánea:
  `personLinksFor` seguiría enlazando por posición (A↔who[0], B↔who[1]) y
  sería correcto, pero si algún día `fate.ts` cambiase el orden en que
  escribe `params`/`who` sin mantenerlos sincronizados, el enlace apuntaría a
  la persona equivocada sin que ninguna prueba rápida lo viera (la prueba
  nueva fija la convención de hoy, no impide que el motor la rompa mañana).
- Que `renderChronicleYear` empiece a agregar (`yearKey`) alguna plantilla
  `fate.*` en el futuro: `linkChronicleNames` dejaría de encontrar párrafo
  para esa entrada y, silenciosamente, dejaría de enlazarla — correcto por
  diseño, pero alguien podría leerlo como que el enlace «se rompió» cuando en
  realidad nunca prometió sobrevivir a ese cambio.
- Que en un dispositivo real (no swiftshader) `.ui-shell-content` y
  `.crossroad-scrim` no compartan de verdad el mismo contexto de
  apilamiento que en Chromium/swiftshader — no probado en un teléfono.

---

## 10. Informe breve

**Implementado:** los dos rodeos manuales retirados (`contentRouteFor`
extendida a las cuatro rutas); el enlace persona→ficha desde la crónica para
los dos sucesos del valle que llevan un id real (`quarrel_in_the_square`,
`child_lost` nombrado), con `personLinksFor` puro y probado, y localización
del párrafo por texto exacto (no por adivinar identidad); y un arreglo no
pedido explícitamente pero descubierto al comprobar el tercer deber: la
encrucijada ahora gana siempre a cualquier bandeja que ya estuviera abierta.

**Verificado:** typecheck y lint limpios; 98 pruebas rápidas verdes (una
suite nueva, una migrada); tres recorridos de Playwright reales contra el
juego empaquetado (enlace de crónica, People sin los rodeos, encrucijada
sobre una bandeja abierta, antes y después del arreglo) — sin errores de
página en ninguno.

**Pendiente, explícitamente para UI-R6:** `test:shots` de verdad sobre los
caminos de esta ronda (nunca lanzado aquí, por la regla del dueño de una sola
tanda de suite completa); AC-06 y AC-13 a AC-20 de `acceptance-scenarios.md`,
sin tocar por esta ronda más allá de la comprobación de humo de §4.

**Decisiones que piden arbitraje, si alguien no está de acuerdo:** no
unificar los tres cierres (§3.3) — es reversible y está documentado con el
motivo exacto de por qué tocarlo de verdad pide ficheros fuera de esta
ronda.

**Commit:** sin commitear — se deja al dueño de la sesión decidir el mensaje
y el momento, como pide la regla general de no comitear sin que se pida.
