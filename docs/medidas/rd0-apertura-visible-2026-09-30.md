# RD-0 · la apertura visible (30 sep 2026)

Parte visible de RD-0 (`docs/plan-ritmo-descanso-y-progresion-2026-09-29.md`, rama
`claude/ritmo-rd0` / `origin/docs/ritmo-integraciones`): trazar la apertura **como la ve un
jugador** en móvil. **No se ha arreglado nada** ni se ha tocado `src/`. Base: `main` en `debf7f8`
(post PR #17). Lo que sigue es evidencia y huecos, no recomendaciones de balance.

## 0. Límite de todo lo medido: un contenedor, no un móvil

Chromium con WebGL por software (swiftshader), 4 núcleos compartidos, viewport móvil emulado con
tacto. **Fotogramas medidos: de 0,5 a 2,4 fps** (solo, dpr 1: 2,4 / 1,8 / 1,45 fps a ×1 / ×16 / ×64;
con tres navegadores a la vez y dpr 2: 0,5–0,9 fps; huecos de fotograma de 1–13 s al montar la
escena). El reloj del juego va por pared, así que **los ticks, la cronología y las ventanas de
oferta son reales; la latencia de entrada y la duración de las escenas están inflados** por el
contenedor. Toda cifra de «segundos hasta…» se lee con esa salvedad. El rendimiento de móvil real
sigue **sin medirse** (RD-0 no puede sustituir a la tablet de Vera).

Otros huecos declarados:
- **Diez minutos completos** sólo en ×1, ×16 y ×64 a 390×844; a 320×568 sólo ×64 (8 min, semilla 7)
  más un recorrido de caza. No hay 320×568 a ×1/×16 ni las tres semillas a 320.
- **dpr 2, no 3**, y `quality` automática (perfil móvil por `hasTouch`); se probó 3 sólo en
  intención, no se midió.
- **No se oye nada**: se registra lo que se pide reproducir (`window.__valleySound`).
- **No se comprobó si girar la cámara destapa una señal tapada** (§3, D1): el guion
  `artifacts/rd0/coverdiag.mjs` se cortó por tiempo sin resultado.
- Tira de contactos a ×16: sólo 11 fotogramas bajo carga; la buena es la de ×64 (§6).

## 1. Método exacto

```bash
npm ci
npx tsx tools/graphics/bundle-game.ts                  # artifacts/graphics/G-10/game/valley.html
node tools/graphics/serve.mjs --port 8127 &            # http, para que el audio cargue (file:// lo bloquea por CORS)
npx tsx artifacts/rd0/scan-openings.ts 1 2 3 7 11 23   # motor: oferta de caza por tick, 1.ª encrucijada, 1.ª misión, crónica
# recorrido completo de N minutos, toque real (touchscreen.tap) en la 1.ª señal tocable:
node artifacts/rd0/probe.mjs --seed 7 --speed 64 --minutes 10 --vw 390 --vh 844 --dpr 2 --out artifacts/rd0/run-7-64-390
# diagnóstico sin arnés durante la escena (registrador DENTRO de la página, Node sólo espera):
node artifacts/rd0/huntdiag.mjs --seed 11 --speed 16 --wait 45 --out artifacts/rd0/hd-11-16b
node artifacts/rd0/boarddiag.mjs --seed 7              # tablón: posición, toque, texto
node artifacts/rd0/sundiag.mjs --seed 7 --speed 16     # hora de cabecera vs data-sun-phase, 200 ms
node artifacts/rd0/sunstrip.mjs --seed 7 --speed 64 --seconds 100 --out artifacts/rd0/sun-64 && python3 artifacts/rd0/sunsheet.py artifacts/rd0/sun-64 artifacts/rd0/sheet-64.jpg
npx tsx artifacts/rd0/hourcheck.ts sd-7-16 sd-7-64     # compara hora de cabecera y fase pintada
```

Los guiones viven en `artifacts/rd0/` (se añaden a git con `-f`: `artifacts/` está ignorado); los
datos crudos (`samples.json`, `log.json`, `hd.json`) quedan en `artifacts/rd0/`, sin versionar
(119 MB con capturas). Ganchos leídos: `data-tick`, `data-sun-phase`, `data-sky`, `data-intro`,
`.valley-time` (hora, sólo lector de pantalla), `.valley-speed-badge`, `.hunt-sign` (+ clase
`hunt-sign--covered`, `elementFromPoint`), `window.__valleyLife().hunt`, `__valleyBoardScreen`,
`__valleySound`. La velocidad se cambia pulsando el botón de la interfaz (`.valley-speed-badge` →
«16×»), con `click()` de DOM y no con el actionability de Playwright (a 1 fps esperaba 30 s).

**Semillas.** Barrido del motor (`scan-openings.ts`, sin actos del jugador, 60 semanas):

| semilla | caza en el tick 0 | ofertas de perdiz en las primeras 24 semanas | 1.ª misión abierta | 1.ª encrucijada | rasgos |
|---|---|---|---|---|---|
| 1 | **no** (1.ª en el tick 1) | 16 | tick 4 | tick 15 | good_clay, old_forest |
| 7 | sí | 14 | tick 4 | tick 15 | bare_hills, old_forest |
| 11 | sí | 13 | tick 8 | tick 15 | thin_soil, old_forest |

(2, 3 y 23 se barrieron sólo en el motor: 1.ª misión en 12, 12 y 4; **todas** plantean la misma
primera encrucijada, «One at the Ford», en el tick 15.) Sólo la **perdiz con honda** está
disponible al fundar (`huntOpportunity`: conejo, ciervo, jabalí y oso exigen haber cobrado la
anterior; arco y lanza exigen rasgos que la pareja no tiene). Es decir: la «apertura distinta» de
la caza es *cuándo* sale la perdiz y *dónde nace*, no qué especie.

Relojes reales por semana del motor: **×1 = 14 min, ×16 = 52,5 s, ×64 = 13,1 s**. En 10 minutos:
×1 no llega a un tick, ×16 ≈ 11 semanas, ×64 ≈ 45 semanas (medido: tick 11–12 a ×16, tick 45 a
×64 a 390; tick 36 a ×64 en 8 min a 320).

## 2. Tabla por semilla × velocidad × viewport (primera oportunidad de caza)

Cinco columnas pedidas. «Ofrecido» = el motor la planteó (tick). «Visible» = la señal existe en el
DOM, no está tapada por el bosque (`hunt-sign--covered`) y está dentro de pantalla. «Tocable» =
además es el elemento superior en su centro (`elementFromPoint`) y mide 36×36 px (se midió 36×36 en
**todas** las muestras). «Escena completa» = toque → el aldeano sale → golpe → desenlace entregado.
«Consecuencia comprensible» = lo que el jugador puede leer de ello.

Viewport 390×844, dpr 2, táctil.

| semilla | vel. | ofrecido | visible | tocable | escena completa | consecuencia comprensible |
|---|---|---|---|---|---|---|
| 7 | ×1 (10 min) | tick 0, una sola semana en los 10 min (14 min de oferta) | **no**: 368/368 muestras tapada | no | no | no hay nada que comprender |
| 7 | ×16 | ticks 0,3,4,7,8 (+12,13 a ×64) | **no**: 0 de 5 ofertas destapada (11+33+26+31+… muestras, todas tapadas) | no | no | no |
| 7 | ×64 | ticks 3,4,7,8,12,13 (el 0 se perdió: la señal tardó en montarse, §3.D2) | **no**: 0 de 6 | no | no | no |
| 11 | ×1 | tick 0 (14 min de oferta) | sí | sí | **sí**, en el diagnóstico limpio (`hd-11-1b`): tras el toque, el aldeano sale, tarda ~24 s de reloj de pared (contenedor) en llegar y la perdiz cae | ver D5: la única huella es una línea de crónica |
| 11 | ×16 | ticks 0,3,9,11,12 | sí (0 tapadas en 5) | sí | **sí** (`hd-11-16`, `hd-11-16b`): oferta → toque a los 0,7 s de aparecer la señal → cámara sobre el cazador → perdiz abatida a ~10 s | línea de crónica + forzado del tick (D4) |
| 11 | ×64 | ticks 0,3,8,11 | sí | sí | **no completada en la prueba**: el toque del tick 0 **no produjo evento `click`** (latencia de entrada del contenedor > ventana de 13 s); los demás ticks se vieron tocables pero el arnés llegó tarde | — |
| 1 | ×1 | **ninguna** en 10 min (la 1.ª es el tick 1, a los 14 min) | — | — | — | el jugador no ve una sola señal de caza en sus 10 primeros minutos |
| 1 | ×16 | ticks 1,2 | **no** (36/36 y 1/1 tapadas) | no | no | no |
| 1 | ×64 | ticks 1–7,… | **no**: tapada en todas (la del tick 1 empezó con opacidad 0,62 y se apagó) | no | no | no |

Viewport 320×568, dpr 2, táctil (semilla 7, ×64, 8 min, sin toque): ofrecida en los ticks
3,4,7,8,12,13, **tapada en 15 de 15 muestras**, 0 tocables. Es el mismo resultado que a 390: a
320 el encuadre por omisión no cambia qué tapa el bosque. Falta 320 con la semilla 11 (donde sí
habría señal tocable) y 320 a ×1/×16: hueco.

**Resumen de la tabla:** en 2 de 3 semillas (7 y 1) la primera oportunidad **no se puede
completar** con la cámara de apertura a ninguna velocidad; en la 11 sí. Es un defecto
reproducible (D1), no azar de muestreo: se repite por oferta y por velocidad con la misma
semilla.

### Cronología de la caza completada (semilla 11, ×16, diagnóstico limpio `hd-11-16b`)

| t (s, pared) | qué pasa | velocidad | notas |
|---|---|---|---|
| 0 | fundar | ×1 | |
| 7,9 | señal tocable (tick 0, perdiz en 28,5/47,5) | ×1 → ×16 a mano | presa presente en escena: `hunt.stage='offered'` con `prey` |
| 8,6–9,0 | toque (`touchscreen.tap`) | ×16 | |
| ~11,9 | el manejador de clic atiende (3 s de bloqueo del hilo) | **baja a ×1** | la señal se oculta |
| 13,0 | `stage: running`, aldeano caminando (`walk`) | ×1 | cámara sobre el cazador (`02-…`) |
| 16,2 | `bow_loose` | ×1 | |
| 18,9 | `stage: done`, presa `down` | ×1 | el parte espera a que la escena acabe de verse |
| ~27,7 | **tick forzado** (tick 0→1) | **vuelve a ×16** | `app.ts:1074-1077` |
| 27,7 | la señal del tick 1 ofrece un conejo (ya se ha cobrado la perdiz) | ×16 | |

A ×1 (`hd-11-1b`): toque 8,0 s → escena 12,9–37,7 s (el cazador anda ~4,5 celdas a ritmo de
contenedor) → tick forzado a los 57,8 s: **el «resto de la semana» de 14 min se cierra ~20 s
después de la pieza**. A ×64 (`hd-11-64`): ver D2.

## 3. Defectos reproducibles

**D1 · La señal de la perdiz nace tapada por el bosque en 2 de 3 semillas, a cualquier velocidad y
viewport (crítico para la primera oportunidad).**
- *Pasos:* `node artifacts/rd0/probe.mjs --seed 7 --speed 1 --minutes 10 --no-tap` (o seed 1, o
  cualquiera de los `run-7-*`/`run-1-*`). Abrir el valle con la cámara de apertura. Leer
  `.hunt-sign` cada 350 ms.
- *Resultado:* `hunt-sign--covered` (opacidad 0, `pointer-events:none`) en **368/368** muestras del
  tick 0 (semilla 7, ×1); semilla 7: todos los ticks ofrecidos (0,3,4,7,8,12,13) tapados; semilla 1:
  ticks 1–7 tapados (36/36, etc.); 320×568 igual. Semilla 11: 0 tapadas.
- *Dónde:* `src/render3d/renderer.ts:2752-2766` (`huntSign()`: `hidden = forest.hides(camera, {…,
  radius: HUNT_SIGN_COVER})`); la presa la coloca `src/render3d/life/wild-prey.ts:70-112`
  (`createWildPrey`): la celda de pradera **más cercana al árbol que se va a talar**
  (`score = d2·1000 + hash`, `d2 < 4` descartado) y a ≥ 8 celdas del corazón, esto es, **pegada a la
  linde por construcción**; `sightingFor` en `renderer.ts:1927-1936`. La cámara por omisión mira
  desde el sur, así que el bosque de delante la tapa. La regla «entre los árboles no se ofrece»
  (`senales-en-el-mapa`, `hunt-sign.css`) está bien; lo que falla es que la presa se sitúa donde esa
  regla la apaga casi siempre.
- *No medido:* si girar/acercar la cámara la destapa (el jugador tendría que adivinar que hay que
  hacerlo: no hay ningún aviso de que la señal existe). Ver §0.

**D2 · La ventana de la oferta es una semana del motor: 13 s a ×64, y el tick 0 se pierde.**
`renderer.ts:2372-2377` abre el avistamiento con el tick y lo cierra con el siguiente; `app.ts:603`
ignora el toque si `state.tick !== offer.tick`. A ×64 son 13,1 s reales; **a ×64 el primer tick
ofrecido (0) se perdió en las 3 semillas** porque la vista de vuelo inicial y el montaje de la
escena consumen esos segundos (semilla 7: primera señal visible en el tick 3). En el contenedor el
toque del tick 0 a ×64 (`hd-11-64`) no llegó a generar `click` antes de caducar (latencia de
entrada de hasta 5 s). *Sin móvil real no se sabe* si 13 s bastan; con 60 fps y un dedo probablemente
sí, pero la señal es «pequeña y difusa» por diseño (16 px, 62 % de opacidad): ver `02-…`/`04-…`.
Tampoco suena nada cuando se ofrece (audio: §5).

**D3 · (riesgo, no reproducido limpio) Un hueco > 1 s entre fotogramas aborta la caza en curso y
cierra la semana sin pieza.** En dos recorridos del arnés (`run-11-1-390`: toque a los 38,7 s;
`run-11-16-390`: toque a los 44,3 s, `tickAfter: 1`) el toque ocultó la señal, pero `hunt.stage`
no llegó a `running`, la señal reapareció en la misma semana y el tick avanzó. Mecanismo probable
(no probado con un punto de ruptura): `renderer.ts:2115-2125` descarta `huntScene` si
`frame.discontinuity`, que `presentation-clock.ts:84,232` activa cuando el hueco ocioso supera
`SUSPEND_GAP_SECONDS = 1`; un manejador de toque pesado o una captura de pantalla del arnés lo
provocan. **En los tres diagnósticos limpios (sin capturas durante la escena) la caza sí completó**
(`hd-11-1b`, `hd-11-16`, `hd-11-16b`), de modo que se clasifica como riesgo para dispositivos
lentos (el mismo tropiezo que GV-4a cerró para la villa) y **no** como defecto reproducible. Para
refutarlo o confirmarlo hace falta instrumentar `discontinuity` en el navegador.

**D4 · Completar una caza fuerza el tick ahora: el calendario y el sol saltan.**
`app.ts:1074-1077` (y `1618-1623`): al recibir el parte, `endHunt(); queueMicrotask(runTick…)`. Es
intencionado («no al cabo de otra semana de reloj»), pero significa que **cada caza cobrada
adelanta la semana**: a ×1, una perdiz a los 10 s cierra una semana de 14 min; en `hd-11-1b` la
cabecera pasó del día 1 al día 8 a los 20 s de la pieza, y la velocidad restaurada (×16/×64) corre
desde ahí. RD-1 no debe contar el tick que ofreció la caza como «intervención completada» (ya
anotado en el plan); además hay que decidir si el salto de semana es deseable para un idle cuyo
tempo es el reloj (§12.1).

**D5 · La consecuencia de cobrar la pieza se lee sólo en la crónica, y la voz de abajo habla de otra
cosa.** Tras la perdiz (seed 11) la voz mostró «The river ran thick with fish…» (otro suceso) y luego
volvió al consejo fijo «Open the cart…»; la única línea propia es de crónica: «A partridge came back
with the hunters for the first time.» (`07-cronica-primeras-lineas.jpg`). La perdiz vale 1 de grano
(`HUNT.meat.partridge`); el indicador «semanas de comida» sube de 75 a 91 pero **mezcla** el tick
forzado y un suceso de pesca (34 fanegas), así que el jugador no puede atribuirlo a su toque.

**D6 · (menor) Señal sin fundido al reaparecer y sin pista.** La oferta se repite semana a semana tras
cobrar (seed 11: conejo en los ticks siguientes); no hay aviso de que «hay algo que tocar» ni sonido.

**D7 · El tablón se sale de pantalla en el encuadre de apertura.** La posición en pantalla del
tablón (`__valleyBoardScreen`, 390 px de ancho): semilla 7, tick 0: x=124 (en vista, el toque abre la
ventana); tick 6: x=−21, tick 13: x=−23 (**fuera de pantalla**); semilla 11: x=144 → 26 (al borde,
tick 45); semilla 1: x=232 → 139 → 304 (en vista). La cámara deriva hacia el este en todas las
semillas; la ventana del tablón llega a abrirse desde el toque real (seed 7 tick 0 y seed 1 tick
11, `09-tablon-pareja-fundadora.jpg`), pero **la 1.ª misión se abre en el tick 4 (semillas 1, 7) y
en ese momento el tablón está fuera de cuadro en la semilla 7**. Dónde: `derive/notice-board.ts`
(`ANGLE: Math.PI`, `REACH: 2.6`: borde oeste de la plaza) frente al encuadre; no se ha localizado
qué mueve la cámara (no se midió el centro `data-view-centre` por tick). Nota metodológica: en
varios recorridos el toque del tablón «no abrió» porque **la primera encrucijada sin contestar
cubre el valle** (veto de `crossroad-open`): no es defecto del tablón.

## 4. Tablón, expediciones y crónica

**Tablón con la pareja fundadora.** Tocado en el tick 0 (seed 7): cabecera «NOTICES», texto único
**«Nothing is asked of the valley yet.»** (`09-…`). Aparece un aviso cuando el motor abre una misión
(1.ª: tick 4 en semillas 1/7/23, 8 en la 11, 12 en la 2/3) y entonces, semilla 1 tick 11:
«Mushrooms in the wood … One week away · Free · Safe — *Not in this season.*», «Herbs on the
slopes …». Nada en la voz ni en sonido avisa de que el tablón tiene algo nuevo; el modelo se ve
siempre en la plaza (visible desde el tick 0, incluso vacío).

**Crónica (primeras líneas, `hd-11-16b`).** Cuatro líneas de golpe en «ANNO 1 · SPRING», sin tiempo
entre ellas: «A man and a woman, and a valley nobody had claimed. Year one.» / «The soil is thin
over stone…» / «The trees here are old, and thick through…» / (tras cobrar) «A partridge came back…»
/ «The river ran thick with fish that spring: 34 bushels worth, salted and stored.» Escenas nuevas
vs repeticiones en las primeras 24 semanas (barrido del motor): el mismo suceso se repite **2–3
veces** en 5 de 6 semillas (`good_catch` ×3 en la 7 [ticks 16, 18, 21], `child_lost` ×3 en la 3,
`river_flood` ×2 y `stranger_passes` ×3 en la 23, `quarrel_in_the_square` ×2 en la 3, 7, 11). La
cuenta de una hora y de 8–10 h **no se midió** aquí (hueco; el plan la pide y necesita más tiempo
de reloj o el `run` del motor).

## 5. Audio (qué se pide reproducir, sin oírlo)

`window.__valleySound.played` (los últimos 64 cues) y `.mix` (las capas de ambiente):
- **×1 (10 min):** semilla 7: 0 cues puntuales; semilla 11: sólo los de botón
  (`ui_button_press/release`, del arnés); semilla 1: **`weather_lightning_crack`,
  `weather_thunder_near`, `weather_thunder_mid`** (×6 en 10 min: una tormenta, audible a ×1).
  Ambiente: `amb_wind_calm` 0,3 + `amb_river` ~0,7 + `amb_birds_day` 1.
- **×64 (10 min = 45 semanas):** 3 cues: `ui_speed_change`, `ui_crossroad_opens` (al abrirse la
  encrucijada), `stinger_milestone_minor` (en 2 de 3 semillas). Ambiente a ×64: sigue mezclando
  (`amb_wind_winter`, `amb_snow_hush`, `amb_birds_day`, `amb_night_cold`, `amb_river`).
- **×16:** `ui_speed_change` y, si sale, el ulterior. **Ninguna caza publicó un cue en la apertura**:
  ni al ofrecerse, ni al tocar, ni la perdiz abatida (los sonidos de honda/flecha de PR #10 no se
  pidieron en estas escenas: a ×16/×64 `momentsAudible` los calla y a ×1 la perdiz de honda no
  produjo cue en el registro; no se comprobó con sonido real). La oferta es **muda**: la señal
  depende sólo de que el jugador mire el mapa.

## 6. Sol y reloj

A ×1 la hora de cabecera (`.valley-time`) y la fase pintada (`data-sun-phase`, pasada por
`hourAt`) coinciden: 368 + 464 muestras, **ninguna** a más de 2 h (114 y 104 a ±1 h por
redondeo). A ×16/×64 la comparación **instante a instante** no es fiable a 1–2 fps (un fotograma
de 0,5–6 s cruza varias horas de juego): con registrador interno (`sundiag.mjs`, 200 ms) a ×16
difieren 53 de 55 muestras pero sólo 9 en más de 2 h; a ×64, 32 de 35 en más de 2 h. No se atribuye
a `LIGHT_STEADY`, que sólo aplana colores/intensidad, no la fase (`daylight.ts:225-230`).

**La tira que muestra el desacople** (`01-tira-sol-x64.jpg`, semilla 7, ×64, 24 fotogramas, 390×844):
ordenada por la hora de la cabecera. Los fotogramas con cabecera **02:00, 05:00, 22:00 y 23:00**
(las cuatro noches) salen **de día**, con la misma luz cálida de mediodía que las de 09:00–14:00.
Luminancia media de la franja del valle: noche de cabecera (21–05 h) **92,9** (87–100, n=5) contra
día **87,9** (68–97, n=19): ninguna diferencia perceptible, y la «noche» incluso más luminosa. Es
exactamente `LIGHT_STEADY[64] = 0,95` (`daylight.ts:225-227`) → luz casi fija de las 7:12
(`STEADY_PHASE 0,3`). A ×16 (factor 0,55) sólo hay 11 fotogramas bajo carga, sin conclusión visual
propia; el factor implica que a ×16 una noche de cabecera se ve a media luz de día.
Comprobado también: la cabecera visible sólo es el arco del sol (`hud.ts`); la hora en cifras
(`.valley-time`) es `hud-clock-sr`, solo para lector de pantalla, de modo que «la cabecera dice
noche» se lee en la posición del sol del arco, que a ×64 recorre el día 1,9 s.

## 7. Rendimiento (contenedor, no móvil)

| config | fps medido | notas |
|---|---|---|
| 390×844 dpr 1, solo, ×1 / ×16 / ×64 | 2,4 / 1,8 / 1,45 | `sundiag`, in-page, apertura (año 1, 2–6 personas) |
| 390×844 dpr 2, 3 navegadores a la vez | 0,5–0,9 | `probe`; >95 % de fotogramas > 50 ms |
| 320×568 dpr 2, 2 a la vez, ×64 | 0,9 | `run-7-64-320` |
| hueco máximo | 13 s (primer fotograma: compilación), 1–6 s en régimen | |

No se midió año 10–20 ni la villa (no hubo tiempo). Nada de esto predice un móvil: sólo dice que el
juego **es jugable a ritmo de fotograma por segundo en el contenedor** y que los toques tardan hasta
5 s en atenderse, lo que contamina D2/D3.

## 8. Primera encrucijada

Plantea en el **tick 15 en todas las semillas** barridas (6 de 6) y siempre es «One at the Ford»
(«A man has come up the river road with a bundle and no cart…»: acoger, dar un día de grano,
rechazar). Tiempo real hasta que sale: **×64: 200–225 s (3,3–3,75 min; `crossroad-open` a los
200 s en 320×568, 204 s / 225 s en 390)**; **×16: ~13 min (no llega en 10 min: tick 11–12)**;
**×1: ~3,5 h**. Se ve: velo de pergamino a pantalla completa con tres opciones y suena
`ui_crossroad_opens` (`08-primera-encrucijada-x64.jpg`). Sin contestar, tapa el tablón y el valle
(ver D7). Es la primera y única decisión de los 10 primeros minutos a ×64; a ×16 y ×1 no hay
ninguna. Coincide con el plan: «demasiado tardía para la apertura» en ×1/×16.

## 9. Qué refutaría esto

- **D1** quedaría refutado si, con la cámara de apertura, `hunt-sign--covered` fuera falso en ≥ la
  mitad de las ofertas de las semillas 1 y 7 (se midió 0 de ~20 ofertas); o si un gesto de cámara
  natural en móvil destapara la señal sin aviso (no se midió).
- **D2/D3** quedarían refutados por una medida en un móvil real: toque atendido en < 1 s y ninguna
  `discontinuity` durante la escena.
- **D4** deja de serlo si el salto de semana es una decisión de diseño aceptada (parece
  intencionado; se anota por su efecto sobre el reloj de ×1).
- «Sol/reloj desacoplados» se refutaría si la tira a ×64 mostrara noche a las 22:00 (no la
  muestra); no se ha refutado, y es el bloqueo ya anotado en el plan.
- La tabla de §2 tiene **n = 3 semillas**: «2 de 3 tapadas» es un patrón, no una tasa. Un barrido de
  30 semillas con el mismo guion (sólo la oferta del tick 0 y 10 s de mira) lo acotaría en minutos.
- Todo lo de tiempos de escena (24 s a ×1, ~10 s a ×16) es del contenedor: en un móvil la caza
  dura probablemente una fracción.

## 10. Para RD-1 (una primera intervención y una primera elección identificadas)

- **Primera intervención:** la perdiz. Única ocasión del mapa en la apertura, ofrecida en el tick 0–1
  en ~2/3 de las semillas, completable en al menos una. Antes de tocar contenido hay que resolver
  D1 (presa visible) y decidir D2 (ventana) y D4 (tick forzado).
- **Primera elección:** «One at the Ford» (tick 15, igual en todas las semillas). A ×64 llega a los
  ~3,5 min; a ×16 no llega en 10 min.
- El tablón con la pareja está vacío hasta el tick 4–12 y está a veces fuera de cuadro (D7).

## Capturas (`docs/medidas/rd0-img/`, copias reducidas de `artifacts/rd0/`)

- `01-tira-sol-x64.jpg` · tira de contactos sol/reloj a ×64, ordenada por hora de cabecera.
- `02-seed11-camara-sobre-el-cazador-x16.jpg` · la cámara se acerca al aldeano tras el toque.
- `04-…`, `05-seed7-senal-tapada-*.jpg` · la semilla 7 en el tick 0 y 3: no hay señal visible.
- `06-seed11-tras-caza-x16.jpg`, `07-cronica-primeras-lineas.jpg` · tras la caza y la crónica.
- `08-primera-encrucijada-x64.jpg`, `09-tablon-pareja-fundadora.jpg`.
- `10-`, `11-320x568-*.jpg` · 320×568, apertura y señal tapada.
