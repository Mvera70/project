# UI-V2 · La bandeja y la navegación

**16 sep 2026.** Ronda de la tanda de piel (`docs/ui-redesign/piel/plan-piel.md`
§5, fila UI-V2), sobre el worktree del agente. Rama `rework/parada-a-media`.

Commit de partida del encargo: `4da029c` («UI-V0 · El kit de la piel: 17
colores muestreados del prototipo, dos fuentes empaquetadas y 25
primitivas»). El worktree en el que arrancó esta sesión estaba en realidad en
`a5744b7` —el commit del *plan*, un paso por detrás del kit—, así que lo
primero fue `git merge --ff-only 4da029c` para tener de verdad `tokens.css`/
`skin.css`/`public/ui/icons.svg` antes de tocar nada. Sin ese adelanto no
existían ni `.skin-nav`, ni `.skin-scroll-edge`, ni el sprite.

---

## 1. Ficheros

**Modificados:**
- `src/ui/redesign/shell.ts` — el borde de la bandeja, el ornamento, la piel
  de la navegación según la ruta (`navSkinFor`, nueva función pura) y los
  filetes verticales entre pestañas. Los iconos de la barra pasan del trazo
  de `../icons` (`NAV_ICONS`, U-05) a los cuatro dibujos del sprite de UI-V0,
  pero **en línea** y no por `<use>` (§3, más abajo dice por qué).
- `src/ui/redesign/shell.css` — la bandeja (`.ui-shell-message`) pasa de hueco
  transparente a la piel del prototipo 01 (pergamino profundo + textura,
  columna, borde y ornamento siempre presentes); `.valley-notice` se repinta
  como la «frase de la bandeja»; `.ui-shell-nav`/`.ui-shell-tab` se reducen a
  lo que el kit no cubre (el área segura), retirando toda la piel duplicada
  que ahora pone `.skin-nav`/`.skin-nav-tab`.
- `src/ui/redesign/skin.css` — **la única pieza que el kit no traía**:
  `stroke-width`/`stroke-linecap`/`stroke-linejoin` en `.skin-icon`, que
  antes ponía el grupo `skin-icon-defaults` del propio sprite y que un icono
  en línea necesita que alguien más le dé (§3).

**Nuevo:**
- `tests/fast/ui-v2-nav.test.ts` — `navSkinFor` probada para las cinco
  variantes de `SheetRoute`, sin DOM, con el mismo patrón que
  `ui-redesign-shell.test.ts` (que no se toca).

**No tocados:** `tokens.css`, `hud.ts`, `orders.ts`, `contracts.ts`,
`people-panel.ts`, `inspect-panel.ts`, `src/ui/screens/`, `app.ts`,
`index.html`, `src/render3d/`, `src/derive/`, el resto de `src/engine/`,
`art/`, `public/assets/`, `tools/`.

---

## 2. Lo entregado, contra el brief

- **Borde superior de la bandeja**: `.skin-scroll-edge` (el respaldo plano de
  6 px, que es lo que toca hoy — el SVG curvado sigue sin activo). Antes vivía
  sin usar en `skin.css`; ahora es el primer hijo de `.ui-shell-message`,
  estirado a los dos lados con un margen negativo que cancela el `padding`
  horizontal del hueco (`shell.css`).
- **El ornamento**: la hoja de roble a 22 px con los dos filetes de 40 px,
  14 px sobre la frase (8 px bajo el borde) — `.skin-ornament` ya lo hacía
  todo; sólo hacía falta montarlo.
- **La frase de la bandeja**: `.skin-read` a 17 px, centrada, máx. 32 ch.
- **La línea de órdenes**: **no se ha movido, y no se ha quitado** — sigue en
  la cabecera, donde UI-R2 la dejó a propósito (§7.3 de su informe: el banco
  dice «the line **above**»/«the button at the **right**», y moverla sin
  revisar el texto lo volvería falso). Moverla de verdad exige tocar
  `hud.ts`, fuera de mi alcance esta ronda. Ver §5.
- **La navegación**: 68 px, tres celdas, icono 22 px + `.skin-label`
  versalitas, filetes verticales de 1 px entre celdas, área táctil ≥ 44 px
  (heredada de `.skin-nav-tab`), y las **tres variantes según la ruta**:
  pergamino + subrayado ocre por defecto, placa de madera en la pestaña
  activa cuando la ruta es `chronicle`, madera entera cuando es `people`/
  `inspect`. `navSkinFor` es la regla, pura:

  ```ts
  export type NavSkin = 'default' | 'plaque' | 'wood';
  export function navSkinFor(route: SheetRoute): NavSkin {
    switch (route.kind) {
      case 'chronicle': return 'plaque';
      case 'people':
      case 'inspect': return 'wood';
      default: return 'default';
    }
  }
  ```

---

## 3. El hallazgo que no estaba en el brief: `<use>` contra otro fichero no carga bajo `file://`

El brief pide, literal (plan §13.4):

```html
<svg class="skin-icon" aria-hidden="true"><use href="./ui/icons.svg#mountains"/></svg>
```

Con eso puesto, el primer `node tools/graphics/shot.mjs` salió con la barra
**sin ningún icono** y la consola llena de:

```
Unsafe attempt to load URL file:///…/game/ui/icons.svg#oak-leaf from frame
with URL file:///…/game/valley.html. 'file:' URLs are treated as unique
security origins.
```

Chromium trata cada URL `file://` como un origen opaco distinto, así que una
referencia `<use>` a **otro documento** —aunque esté al lado, aunque venga del
mismo `bundle-game.ts`— se bloquea. Antes de aceptar eso, probé la salida
obvia (pedir el sprite con `fetch()` en su lugar, e inyectarlo a mano en el
documento): falla igual, por CORS —«Cross origin requests are only supported
for protocol schemes: chrome, chrome-extension, …, http, https»—, comprobado
con un arnés mínimo de Playwright antes de tocar el código de verdad, no
asumido. `bundle-game.ts` no inlinea el sprite (lo copia como fichero aparte,
que es justo lo que el mensaje de error nombra), y no puede: la referencia la
genera `shell.ts` en tiempo de ejecución (`button.innerHTML = ...`), no hay
`<use>` estático en el HTML que un empaquetador pueda reescribir.

**Arreglo, dentro de mi alcance:** los cuatro trazos que necesito (los tres
iconos de pestaña y la hoja de roble) están copiados en línea en `shell.ts`
(`NAV_TAB_ICON`, `OAK_LEAF`) — el mismo `d` que sus `<symbol>` en
`public/ui/icons.svg`, así que el sprite sigue siendo la fuente de verdad
visual, sólo que un cambio de trazo ahí tiene que repetirse aquí a mano hasta
que algo incruste el sprite en el propio documento. Y como el trazo (1,5,
puntas redondeadas) antes lo ponía el grupo `skin-icon-defaults` del sprite
—que un icono en línea no hereda—, lo subí a `.skin-icon` en `skin.css`
(único cambio que hago ahí, documentado con su motivo en el propio fichero).

**Esto no es sólo mío.** El plan pide el mismo patrón `<use href="./ui/
icons.svg#…">` para UI-V1 (el sol del arco, U-13), UI-V3 (el respaldo de
`illustrationFor`, la hoja de roble de nuevo), UI-V4 (los iconos de la ficha)
y UI-V5. Cualquiera de esas rondas que se verifique con `shot.mjs` —que es la
única manera de comparar contra el prototipo que el plan reconoce— va a
tropezar con el mismo bloqueo. El arreglo de raíz es que `bundle-game.ts` o
`index.html` incrusten el `<symbol>` del sprite en el propio documento (un
`<svg style="display:none">` con los símbolos, una vez, en vez de un fichero
aparte); los dos están fuera de mi alcance esta ronda y quedan para el
coordinador.

---

## 4. El otro hallazgo: los filetes verticales de la navegación no existían

El plan (§3.4) pide «filetes verticales de 1 px `--skin-gold` al 30% entre
celdas», y `.skin-rule-v`/`.skin-rule-v--on-wood` ya estaban en `skin.css`
desde UI-V0 —pero nadie los usaba en ningún sitio: no era una pieza que
faltara en el kit, era una que el kit traía sin conectar. `shell.ts` los monta
ahora entre cada dos botones de la barra (dos filetes para tres pestañas) y
`paintRoute` les cambia la variante (`--on-wood`) a la vez que cambia la piel
de la propia barra.

---

## 5. La frase de la bandeja: qué dato la alimenta, y por qué

El prototipo 01 muestra una frase permanente bajo el ornamento («The mill is
waiting for oak.»). El motor no tiene una «frase de estado permanente para la
bandeja»: lo único que hoy vive en `.ui-shell-message` es el aviso transitorio
de `notice.ts` (`answerFor`, o la última entrada de peso ≥ 2 de la crónica) y
la pista del inicio guiado — los dos aparecen y desaparecen, nunca están fijos.
La línea que en la práctica **parece** la frase del prototipo cuando se mira
una captura de reposo (`doingNow`, «The woodpile will not last the winter.»)
vive en la cabecera (`hud.ts`), no en la bandeja, y UI-R2 ya explicó por qué
se queda ahí (§7.3 de su informe): moverla haría falso el texto del banco
(«the line above»).

**Respaldo tomado, y por qué:** re-vestir `.valley-notice` (que sí vive en la
bandeja) como la frase del prototipo — tinta sobre el papel de la bandeja,
`.skin-read`, centrada — en vez de su tarjeta oscura de antes. Es la única
fuente real de una frase de una línea que la bandeja ya recibe, y es
exactamente el mecanismo que `CLAUDE.md` describe como el verbo del juego:
«la aldea contesta cuando no puede obedecer». **Consecuencia medible:** en el
reposo exacto de la captura de la comparativa (semilla 11, año 50, sin una
encrucijada resuelta hace menos de `TIME.NOTICE_MS`) la bandeja se ve vacía
bajo el ornamento —border y hoja sí, frase no—, porque no hay ningún aviso
activo en ese instante exacto. Forzando unas semanas más de reloj (`--run 25
--speed 64` tras el mismo arranque) sí sale un aviso real y la bandeja se ve
completa: `artifacts/graphics/UI/V2/valle-notice-try.png` («One of them left
the fields for the trees and the water.», centrada, tinta sobre pergamino
profundo, exactamente la composición del prototipo). No es una foto trucada:
es el mismo notice.ts de siempre, sólo que la ventana de "seed 11/year 50/
settle 7" que pide el criterio de hecho no garantiza que haya uno vivo en ese
instante — igual que en el juego real, la bandeja está vacía la mayor parte
del tiempo y se llena cuando algo pasa.

No se duplicó la línea de órdenes dentro de la bandeja (aunque el brief hable
de «debajo, pequeña»): eso exigiría tocar `hud.ts` para moverla o repetir su
texto en dos sitios a la vez, que es peor que dejarla donde está. Se queda
donde UI-R2 la puso; **no se ha quitado**, que es lo único que el brief exige
de verdad en este punto.

---

## 6. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
npx vitest run tests/fast/ui-skin.test.ts tests/fast/ui-redesign-shell.test.ts \
  tests/fast/app.test.ts tests/fast/notice.test.ts tests/fast/ui.test.ts \
  tests/fast/ui-orders.test.ts tests/fast/ui-chronicle.test.ts \
  tests/fast/ui-redesign-people.test.ts tests/fast/ui-v2-nav.test.ts
```

```
✓ tests/fast/ui-skin.test.ts (12 tests)
✓ tests/fast/ui-v2-nav.test.ts (6 tests)
✓ tests/fast/ui-orders.test.ts (23 tests)
✓ tests/fast/ui-redesign-shell.test.ts (10 tests)
✓ tests/fast/ui-chronicle.test.ts (10 tests)
✓ tests/fast/app.test.ts (8 tests)
✓ tests/fast/notice.test.ts (4 tests)
✓ tests/fast/ui-redesign-people.test.ts (14 tests)
✓ tests/fast/ui.test.ts (12 tests)
Test Files  9 passed (9)
     Tests  99 passed (99)
```

`tests/fast/ui-redesign-shell.test.ts` (`navTabFor`/`contentRouteFor`/
`resolveMessageSlot`, la lógica de rutas que fijó UI-R5) sigue verde sin
tocarla, como exige el brief.

`python tools/ui/contrast.py` → **los 14 pares pasan** (el más justo, 4,66:1,
sin cambios respecto a UI-V0 — no toqué ningún color).

---

## 7. Las comparativas

```
npx tsx tools/graphics/bundle-game.ts
node tools/graphics/shot.mjs --seed 11 --year 50 --settle 7 --answer 1 --out artifacts/graphics/UI/V2/valle.png
python tools/graphics/skin-compare.py franja artifacts/graphics/UI/V2/valle.png
```

- **Franja** (bandeja + navegación, valle): `artifacts/graphics/piel/compara-franja.png`.
  Borde de madera, ornamento, subrayado ocre bajo VALLEY, iconos y filetes —
  la bandeja está vacía de frase en este instante exacto (§5).
- **Nav-crónica** (placa de madera): `artifacts/graphics/piel/compara-nav-cronica.png`,
  capturada abriendo la pestaña Chronicle con un script temporal de Playwright
  (`tools/graphics/shot.mjs` no tiene `--open chronicle`) que pulsa la pestaña
  por su rol accesible — **borrado al terminar**, como pide el brief; no se
  dejó en `tools/`.
- **Nav-gente** (madera entera): `artifacts/graphics/piel/compara-nav-gente.png`,
  mismo método, pestaña People.
- Y la prueba de que la frase funciona cuando hay algo que decir:
  `artifacts/graphics/UI/V2/valle-notice-try.png` (§5).

Las tres comparativas están miradas, no sólo adjuntas: los tres prototipos
casan en color, tipografía, tamaño de icono y variante de navegación; la
única diferencia visible en `nav-cronica`/`nav-gente` es el arte de las
esquinas del prototipo (hojas dibujadas) que no existe todavía — respaldo de
§4 del plan, «se omiten sin activo».

---

## 8. Qué queda fuera, y por qué

- **El SVG curvado del borde de la bandeja** (`public/ui/scroll-edge.svg`):
  no hay activo (`encargo-arte-piel.md` §3); se usa el respaldo plano que el
  propio plan autoriza, con la misma clase para que el día que llegue no haga
  falta tocar marcado.
- **La línea de órdenes no se movió a la bandeja**: exige tocar `hud.ts`,
  fuera de mi alcance; se queda donde UI-R2 la dejó, sin quitarla (§5).
- **`.valley-hint`** (la pista del inicio guiado) no se revistió: el plan no
  la menciona en §3.4, y darle la piel de pergamino sin que nadie lo pida es
  inventar alcance.
- **El sprite `<use>` sigue sin funcionar bajo `file://`** para cualquier
  ronda futura que lo use igual que el plan escribe (§3). Mi propio uso está
  arreglado (icono en línea); el arreglo de raíz —incrustar el sprite en el
  documento— es de `bundle-game.ts`/`index.html`, ninguno mío esta ronda.

---

## 9. Qué observación refutaría esta ronda

- Que la barra de navegación se vea distinta (icono, filete, piel) en otra
  máquina o con otra versión de Chromium — indicaría que algo de lo que doy
  por determinista (los `d` copiados a mano, la textura, el `stroke-width` de
  `skin.css`) no lo es.
- Que abrir/cerrar la bandeja o cambiar de pestaña cambie `state.intent`, la
  velocidad o el tick — no debería: no toqué `actions`, `navigate` ni
  ninguna escritura de estado, sólo la piel alrededor.
- Que un `<use href="./ui/icons.svg#…">` sí cargue bajo `file://` en la
  máquina de otra persona — refutaría el hallazgo de §3 y significaría que mi
  arreglo (iconos en línea) fue innecesario; lo dejaría igualmente porque no
  depende de la causa exacta del fallo, sólo de que el `<use>` no cargaba
  aquí, medido tres veces.
- Que la captura de `--seed 11 --year 50 --settle 7 --answer 1` muestre
  siempre una frase en la bandeja en otra sesión — indicaría que hay una
  fuente de aviso más fiable que no consideré, y que el respaldo de §5 podría
  ser más ambicioso.
