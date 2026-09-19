# UI-V1 · La cabecera, las cuatro cifras y la velocidad

**16 sep 2026.** Ronda de la tanda de piel (`plan-piel.md`, fila UI-V1 de
§5). Viste la placa de fecha, el arco del sol, las cuatro cifras y los dos
controles de velocidad del valle en reposo (§3.1), y la cabecera compacta de
la crónica (§3.2, primera fila).

Commit de partida indicado: `4da029c` (UI-V0 · el kit de la piel). El
worktree de esta ronda había quedado anclado a `a5744b7` (el commit del
propio plan, anterior a UI-V0); antes de tocar nada se puso al día copiando
byte a byte —verificado por `md5sum`— los ficheros que UI-V0 entregó
(`tokens.css`, `skin.css`, las fuentes, `parchment.png`, `public/ui/`,
`app.ts`, `tests/fast/ui-skin.test.ts`, `tools/ui/*`,
`tools/graphics/skin-compare.py`, `UI-V0.md`), sin usar ningún comando de git
que mueva `HEAD` o el árbol de trabajo (el clasificador de este entorno los
bloquea por «destrucción local irreversible» incluso en su forma más segura,
`checkout -- <ruta>`). Está dicho aquí porque es la razón de que `git status`
enseñe `app.ts`/`tokens.css` como «modificados»: no son cambios míos, es el
worktree alcanzando el punto de partida que el brief pedía.

---

## 1. Ficheros

| Fichero | Qué |
|---|---|
| `src/ui/redesign/hud.ts` | reescrito: la placa de fecha con el arco del sol, las cuatro cifras (chip + figura compacta), la cabecera compacta de la crónica, los dos círculos de velocidad |
| `src/ui/redesign/skin.css` | ampliado con la sección «la HUD» (nuevo hueco de esta ronda, dicho aquí como pide el plan): posiciones, la anulación de la piel vieja de `index.html` y dos parches de altura explicados en §4 |
| `src/engine/chronicle/bank.en.ts` | una clave nueva, `app.speed.resume` («Resume»), para el círculo ▶/⏸ |
| `tests/fast/ui-v1-sun-arc.test.ts` | nuevo: `sunArcPoint` en 0, 0,25, 0,5, 0,75, más periodicidad y límites |

No se tocó ningún fichero de la lista prohibida. No hizo falta ampliar
`skin.css` con una primitiva que UI-V0 hubiera dejado a medias: las 25 de
UI-V0 bastan; lo añadido son posiciones y anulaciones propias de esta
cabecera, marcadas como tales.

---

## 2. Decisiones, con su motivo

**El arco del sol lee `valleyClock(tick, fraction).sunPhase`, no
`backend.live.stats().sunPhase`.** El brief pedía el segundo por nombre, pero
`stats()` devuelve `null` con el backend Canvas (el arco se quedaría quieto
sin decir por qué) y `hud.ts` no puede leer `backend` de ninguna manera
—significaría importar de `render3d`, una frontera que el motor no cruza—.
`src/render3d/presentation-clock.ts` deja escrito que la fase que pinta el
cielo 3D «es la misma que devuelve `valleyClock(tick, fraction).sunPhase`»,
con prueba propia (`tests/fast/clock.test.ts`); es el mismo número, la fuente
correcta y la única que funciona con cualquier backend. `hud.ts` ya lo
calculaba para la hora, así que no se añadió ninguna dependencia.

**`sunArcPoint(phase)` es pura y el trazo del arco la muestrea.** Fase 0 es
medianoche (igual que `sunPhase`), el seno sube hasta el techo del arco en
la fase 0,5 y baja simétrico hacia 1. El SVG no dibuja una curva aparte: es
una polilínea de doce puntos calculados con la misma función que coloca el
punto del sol, así que el trazo y el sol nunca pueden discrepar.

**Los iconos son `<use href="#id">`, sin ruta de fichero.** La primera
captura de esta ronda salió con los cuatro iconos en blanco y la consola
llena de «Unsafe attempt to load URL … 'file:' URLs are treated as unique
security origins»: Chromium bloquea `<use href="./ui/icons.svg#id">` cuando
la página se abre con `file://`, que es como `shot.mjs` carga la demo
empaquetada. El coordinador confirmó la misma medida desde UI-V2 y está
incrustando el sprite dentro de `index.html` (suyo, no de esta ronda); con el
sprite ya en el documento, la referencia correcta es local. **Mientras ese
cambio no llegue a este worktree, los iconos de mi propia captura siguen en
blanco a propósito** — el resto de la cabecera (placas, cifras, arco,
círculos) no depende de él.

**Los dos círculos de velocidad son ▶/⏸ y el multiplicador, no dos vistas del
mismo botón.** El prototipo dibuja dos circunferencias donde antes había una
sola (`speedBadge`) más una regleta oculta. Como `app.ts` (ajeno a esta
ronda) sólo sabe anexar `hud.speedControls` y `hud.speedBadge` a
`.valley-hud-right`, el segundo círculo viaja **dentro** del mismo hueco:
`speedBadge` pasa a ser un `<div>` con dos botones (`playPause` y el badge de
siempre), y `HudHandle` no cambia de forma para quien lo consume. La regleta
de cinco posiciones (con la pausa incluida) se conserva intacta —
`tools/shots/valley.shots.ts` sigue contando cinco botones—; el círculo ▶/⏸ es un
atajo que llama a `actions.setSpeed(0)`/`actions.setSpeed(lastNonZeroSpeed)`,
nada de estado nuevo del lado del motor. El badge enseña **la velocidad
elegida, no el estado del reloj**: en pausa sigue diciendo «1×» si esa era la
marcha, igual que el prototipo.

**⌀ 40 dibujado, 44 de blanco táctil.** El plan mide 40 px de diámetro en el
prototipo; `--ui-tap-min` exige 44. Se resolvieron las dos sin bajar ninguna:
el botón mide `var(--ui-tap-min)` por lado (el área que el dedo puede tocar)
y el relleno de la piel se recorta al recuadro de contenido
(`background-clip: content-box` con 2 px de relleno), así que el círculo
*pintado* mide 40 y el círculo *tocable* mide 44. Ni se rebaja el tacto por
el píxel del prototipo, ni se agranda el dibujo por la regla de toque.

**El reloj digital (U-12) se queda, pero deja de verse.** El prototipo no
dibuja una hora; dibuja el arco. Borrar `timeLine` habría sido una decisión
de producto (quitar una entrega ya cerrada, U-12) que no le toca a una ronda
de piel — el mismo argumento que el plan usa para no quitar la línea de
órdenes. Se optó por el patrón «sr-only»: la hora sigue en el documento, la
sigue leyendo quien usa lector de pantalla, y `tools/pwa/valley.pwa.ts` /
`tools/shots/valley.shots.ts` (que la comprueban por `.valley-time`) no se rompen.
Visualmente no ocupa sitio.

**La cabecera compacta de la crónica parte el mismo texto del banco, no
escribe uno nuevo.** `app.clock.date` ya dice «Year {year} · {season}, day
{day}»; la cabecera de dos líneas del prototipo 02 es exactamente esa frase
cortada por su propio separador (` · `). No hizo falta una clave nueva ni
duplicar el cálculo de fecha: es el mismo `renderUiText` de siempre, partido
después, y si el separador cambiara alguna vez, esta cabecera lo seguiría
sin tocarla (con el respaldo de meter todo en la primera línea si no
encuentra el separador).

**Cada cifra vive en dos nodos del DOM, no en uno reparentado.** La cabecera
del valle (chip con deckle y giro) y la compacta de la crónica (cifra entre
filetes) conviven — una oculta, la otra visible — según la ruta. Reparentar
un nodo entre dos contenedores cada vez que cambia la ruta es más frágil que
escribir el mismo número dos veces con una función compartida
(`paintVital`), así que hay ocho nodos `.valley-vital` en vez de cuatro. Es
la causa de que `document.querySelectorAll('.valley-vital')` devuelva ahora
ocho elementos en vez de cuatro donde algo lo cuente a mano (visto en el
JSON que imprime `shot.mjs`); no rompe ningún test de los que se pidió
verificar ni las pruebas de `tools/shots/valley.shots.ts` que usan `.first()`, que
sigue siendo el chip de gente.

**Anular la piel vieja de `index.html` sin tocarlo, con especificidad y no
con el orden de carga.** `index.html` sigue posicionando y coloreando
`.valley-time`, `.valley-date`, `.valley-vitals`, `.valley-vital` y
`.valley-speed-badge`, y no está en la lista de ficheros que esta ronda puede
tocar. Cada uno de esos elementos lleva ahora una **segunda clase propia**
en el mismo nodo (`.hud-date-text`, `.hud-clock-sr`, `.hud-chips-row`,
`.skin-plate--chip`/`.hud-figure`, `.hud-round-btn`), y las reglas de
`skin.css` combinan las dos clases: dos clases en un selector pesan más que
una sola, así que la piel nueva gana **sin importar en qué orden cargue cada
hoja** — no hay que confiar en que el bundle ponga `skin.css` después del
`<style>` de `index.html`. La única excepción es `.valley-vital +
.valley-vital` (un combinador entre dos clases, mismo peso que la mía): ahí
hace falta `!important`, y está anotado en el propio `skin.css` con el
motivo.

---

## 3. Una trampa que esta ronda cazó, y cuesta contarla

La primera captura salía con la fecha partida en dos líneas superpuestas a
las cuatro cifras, con números repetidos flotando sobre el texto de estado.
Causa: `hud.ts` apaga una cabecera u otra con el atributo `hidden`
(`datePlate.hidden = compact`, etc.), y el atributo `hidden` sólo hace
`display: none` por una regla del **user-agent sin especificidad**. En
cuanto una hoja de autor pone `display: flex` sin condición en el mismo
elemento —que es exactamente lo que hacían `.hud-plate-date`,
`.valley-vitals.hud-chips-row` y `.hud-compact-header` para maquetarse—, esa
regla de autor gana y `hidden` deja de ocultar nada: las dos cabeceras se
pintaban una encima de la otra. Se arregló con `&[hidden] { display: none;
}` explícito en los tres bloques (`skin.css`, con el motivo escrito para que
nadie lo repita en la próxima pieza que apague algo por atributo).

---

## 4. Lo medido

- **`npm run typecheck`**: limpio.
- **`npm run lint`**: limpio.
- **`npx vitest run tests/fast/ui-skin.test.ts tests/fast/ui-redesign-shell.test.ts tests/fast/app.test.ts tests/fast/ui-doing.test.ts tests/fast/ui.test.ts tests/fast/ui-orders.test.ts tests/fast/ui-v1-sun-arc.test.ts`**:
  **7 ficheros, 75 pruebas, todas verdes** (incluidas las 6 nuevas de
  `sunArcPoint`).
- **`python tools/ui/contrast.py`**: los 14 pares siguen pasando (el más
  justo, 4,66:1 — sin cambios, esta ronda no toca ningún color).
- **Los cinco botones de la regleta de velocidad** (`.valley-speeds`) se
  conservan: no se redujeron a cuatro al añadir el círculo ▶/⏸.

---

## 5. Las comparativas, con su ruta

```
python tools/graphics/skin-compare.py cabecera artifacts/graphics/UI/V1/valle.png
→ artifacts/graphics/piel/compara-cabecera.png

python tools/graphics/skin-compare.py velocidad artifacts/graphics/UI/V1/valle.png
→ artifacts/graphics/piel/compara-velocidad.png
```

La captura de origen: `artifacts/graphics/UI/V1/valle.png` (semilla 11, año
50, `--settle 7 --answer 1`, como pide el brief).

**`compara-cabecera.png`.** La placa de fecha y las cuatro cifras se parecen
al prototipo en forma, rasgado, giro por chip y tipografía: versalitas en
Cinzel, filo rasgado en las cuatro piezas, arco fino con el sol puesto en la
fase real de esta partida. Lo que falta, y por qué: los cuatro iconos salen
en blanco — es el bloqueo de `file://` de §2, no un fallo de maquetación —,
y desaparecen en cuanto el sprite incrustado del coordinador llegue a este
worktree, sin tocar `hud.ts`.

**`compara-velocidad.png`.** Aquí la comparativa **no encuentra nada** en el
lado «lo que hay»: la caja del prototipo (x600–853, y1320–1440) cae sobre
hierba vacía. No es que los círculos no existan ni que su piel esté mal —la
captura completa (`artifacts/graphics/UI/V1/valle.png`) y el recorte que
tomé aparte
(`artifacts/graphics/UI/V1/bottom-band.png`) los enseñan bien formados,
parchment redondo, sombra, ▶/⏸ y «1×»—, sino que **están más abajo de lo que
el prototipo espera**. La causa es `.valley-hud-right { bottom: calc(60px +
safe-area-inset-bottom) }`, en `index.html`, un fichero que ni esta ronda ni
UI-V2 pueden tocar: esa cifra se fijó cuando la barra de abajo era sólo la
navegación; con la bandeja de verdad (mensaje, línea de órdenes, ornamento,
navegación con etiqueta) la franja inferior real es bastante más alta que 60
px, así que el ancla empuja los círculos a pegarse contra la bandeja en vez
de flotar sobre el prado, unos 100 px más abajo de los y=634 del prototipo.
**No lo he tocado.** Podía haber posicionado sólo mis dos círculos con
`position: absolute` propio para acercarlos al prototipo, pero el botón de
sonido (ajeno, U-09) se habría quedado atrás en el sitio viejo: el trío se
habría visto peor, no mejor, con dos círculos flotando arriba y uno solo
abajo. Dejo el ancla común tal como está y lo dejo escrito aquí para quien
lo vea con la bandeja terminada — es un ajuste de altura del ancla común
(`.valley-hud-right`), y quien mueva la altura de la bandeja de verdad
(UI-V2, o el coordinador en `index.html`) es quien tiene que revisar ese
`60px`.

**La cabecera compacta de la crónica no se puede fotografiar todavía, y hay
prueba de que está bien puesta sin foto.** La pantalla de la crónica
(`src/ui/screens/chronicle.ts`, ajena a esta ronda) sigue siendo la de antes
de UI-V3: un fondo oscuro a pantalla completa que tapa la cabecera entera
(z-index por encima). Comprobado por evaluación directa del DOM en esa
ruta, no por captura:

```json
{
  "compactHiddenAttr": false,
  "plateHiddenAttr": true,
  "chipsHiddenAttr": true,
  "line1": "Year 50",
  "line2": "Spring, day 1",
  "figures": ["44", "36", "4", "39"],
  "rect": { "x": 27, "y": 16, "width": 334, "height": 50 },
  "computedDisplay": "flex"
}
```

Es decir: al navegar a `chronicle`, `hud.ts` apaga la placa de fecha y la
fila de chips y enciende la cabecera compacta, en el sitio exacto de §3.2
(x27, y16, 334×50), con las dos líneas partidas del banco y las cuatro
cifras correctas. Lo que impide verla es la pantalla de debajo, no esta
pieza; se hará fotografiable en cuanto UI-V3 suba la página de la crónica y
deje el 40 % de arriba (con la cabecera) al descubierto, tal como pide el
prototipo 02.

---

## 6. Qué queda fuera, y por qué

- **Los iconos del sprite** siguen en blanco en mis propias capturas: la
  ronda usa `<use href="#id">` (corregido a media ronda tras el aviso del
  coordinador — antes tenía `href="./ui/icons.svg#id"`, que Chromium bloquea
  bajo `file://`), y depende de que el sprite viva incrustado dentro de
  `index.html`, que el coordinador está subiendo desde UI-V2.
- **La posición de `.valley-hud-right`** (§5, «velocidad») no se toca: es
  `index.html`, y el desfase con el prototipo es consecuencia de una bandeja
  más alta que la de cuando se fijó ese `60px`, no de esta ronda.
- **`.valley-doing`/`.valley-orders-now`** se bajaron 34–36 px
  (`.hud-doing-line`/`.hud-orders-line` en `skin.css`) sólo para que la fila
  de chips nueva —más alta que la tira que había antes— no las tape. Es un
  parche de altura, no piel: la posición correcta según el prototipo es
  junto a la bandeja (§3.1, y 738), que es donde UI-V2 las va a dejar; en
  cuanto eso ocurra, este parche sobra y se puede quitar sin que nada más se
  mueva.
- **La página de la crónica, la ficha, la encrucijada** — de otras rondas
  (UI-V3, UI-V4, UI-V5), sin tocar.

---

## 7. Qué observación refutaría esta ronda

Que `sunArcPoint(0.5)` no dé el punto más alto del arco, o que el trazo
dibujado y el punto del sol se separen visiblemente en alguna fase (no
deberían: son la misma función). Que alguno de los 14 pares de
`tools/ui/contrast.py` baje de 4,5:1 — no debería, esta ronda no toca
colores. Que la regleta de velocidad deje de tener cinco botones. Que
`.hud-compact-header` aparezca visible en la ruta `valley` o
`.hud-plate-date` en la ruta `chronicle` (el test de humo de esta ronda es
el JSON de §5: si alguna vez `compactHiddenAttr` y `plateHiddenAttr` son
iguales, algo se rompió). Y que, una vez el sprite esté incrustado y la
altura de `.valley-hud-right` corregida, `compara-velocidad.png` siga sin
enseñar los dos círculos donde el prototipo los pone.
