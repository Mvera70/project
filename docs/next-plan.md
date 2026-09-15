# El plan siguiente: qué falta, en qué orden, y quién lo hace

**15 sep 2026, al cerrar la auditoría del proyecto.** Este documento es para
**delegar**: cada ronda lleva su brief listo para pegar en un agente, con el
carril del router (`docs/agents.md`) y el criterio de terminado.

**Lo que manda por encima de esto:** `CLAUDE.md`, `docs/design.md` (Anexo D para
el render, Anexo E para la vida, §11 para la interfaz), `docs/agents.md` para
cómo se delega y se audita. Y la regla que más veces ha ahorrado una tarde:
**medir antes de tocar, y nunca con una sola semilla.**

## Para quien siga · 15 sep 2026, tarde — léelo entero antes de tocar nada

Esta sección la escribió el agente que cerró los tres primeros pasos del dueño
del diseño, a petición suya: *«deja anotado todo lo que tengas en mente seguir
haciendo, detallado para el siguiente agente»*. Está escrita para un agente que
no ha visto nada de esto. Si sólo lees una sección del proyecto, que sea ésta,
y después `CLAUDE.md` y `docs/handover.md` §2.1 y §4.

> **Actualizado el 15 sep por la noche, al cerrar R-1 (v3.75).** El plan que
> manda desde entonces es **`docs/rework.md`**: lo que el dueño ha decidido en
> orden (§0), R-1 tal como está (§2, con las nueve jornadas rojas de §2.8 y la
> contradicción de §2.6), **la IA de animales y personas como tarea siguiente**
> (§3, con diagnóstico, medida y orden de arreglo), y los briefs de R-2, R-5 y
> R-3 (§4). Lo de abajo sigue siendo verdad para los cinco pasos y para la
> operativa (§4 de esta sección), pero el orden de trabajo es el de allí. El
> estado exacto al cerrar: suite rápida 69 ficheros y 1 086 verdes; jornadas
> 107 verdes y 9 rojas (listadas); Playwright sin pasar tras R-1; demo
> publicada en la versión 14, de antes de R-1; todo en `main`.

### 0. Qué quiere el dueño, con sus palabras

- **La premisa.** «Un idle donde la aldea sea bonita de ver de fondo … la gracia
  es que la gente pueda comparar entre ellos y ver diferentes aldeas porque sean
  tan aleatorias. Es la esencia en sí.» Ante dos opciones, elige la que aumenta
  la variedad entre valles y la que se ve bien mirando sin tocar.
- **Cinco pasos, en este orden, y «no dejes de hacer todo lo que te he pedido
  en orden»:**
  1. La aldea empieza con **una pareja, un hombre y una mujer** — **hecho**
     (v3.69, commit `e6abd4e`).
  2. **Menú de inicio** con alguna configuración — **hecho** (v3.70, `403a1c5`).
  3. **Inicio guiado** al fundar: la aldea se ve desde lo alto y se baja —
     **hecho** (v3.71, el commit que sigue a éste en `git log`).
  4. **El tiempo como contador con horas** en vez del título «ANNO», con paso
     de tiempo «real, como si fuese la vida real» — **hecho** (v3.72).
  5. **Efectos meteorológicos: tormentas con rayos** — **hecho** (v3.73, §10.8).

  **Los cinco están entregados.** Y uno más que el dueño pidió al verlo, U-14:
  la crónica y la pantalla de la gente se podían abrir y no cerrar («no hay
  forma de volver atrás»).
- **Cómo juzga.** Mira el juego **como un vídeo**: secuencias de capturas, no
  una captura suelta (`node tools/graphics/shot.mjs --sequence 12 --every 0.8`).
  «Hay muchos problemas que se ven a primera vista.» Cada paso se cierra con
  una captura enviada a él y **nunca se declara nada «sólido»**: la última vez
  que un agente lo hizo, él encontró trastos de prueba atravesando el suelo y
  tres filas de botones. Ve él, no tú.

### 1. El estado exacto al cerrar

| Qué | Estado | Cómo se comprueba |
|---|---|---|
| Suite rápida | 67 ficheros, 1 073 verdes, ~25 s | `npm test` |
| Jornadas | 116 verdes (~5 min) | `npm run test:journeys` |
| Playwright | 12 verdes + 3 declaradas (`test.fail`) | `npm run test:shots` |
| Balance | **16 rojas de 37** — antes de la pareja eran 11 | `npm run test:balance`, 25 min; `docs/handover.md` §5.5 dice cuáles y por qué |

**Nada de v3.70 a v3.73 vuelve a medir el balance, y es a propósito:** el menú,
el inicio guiado, el reloj y el cielo no tocan el motor salvo la tabla de
tiempos de §12.1, y la suite de balance cuenta **ticks**, no segundos. Las 16
rojas son las de la pareja. Quien cambie una regla del motor, remídelas.
| Demo publicada | https://claude.ai/artifact/CbbvpwDfa5NUoog9E7XiMK (versión 13, con los cinco pasos) | ver §4 abajo |
| Rama | `graphics/g-04-villager-rig`, 32 commits sin subir | `git log --oneline main..HEAD` |

**Y lo que el reloj de v3.72 cambió para cualquiera que mida algo:** una semana
del motor dura **catorce minutos a ×1** y no quince segundos, así que **lo que
antes pasaba a ×1 pasa ahora a ×64**. Un informe o una prueba que hable de «una
sesión de cinco minutos» tiene que decir a qué velocidad (la densidad de §11.6
se mide a ×64), y las cifras en minutos que quedaran escritas por ahí son de
antes. Las suites del motor no se enteran: cuentan ticks, no segundos.

**Lo que no está hecho de los tres pasos cerrados, y sabemos:**

- El vuelo de entrada se midió con `data-view-height` en Chromium por software
  (92 → 26 celdas en nueve segundos, suave). **No se ha visto en un móvil.**
- Las dos pistas del inicio guiado (`valley.guided` en `localStorage`) salen
  sólo la primera vez por navegador; si el dueño quiere verlas otra vez, hay
  que borrar esa clave. No hay botón para ello: decide si lo añades al menú.
- Durante el vuelo salen a la vez la cartela de fundación y el aviso del rasgo
  del valle («Bare slopes…»). Es mucho texto para nueve segundos bonitos. No
  se tocó porque el dueño no lo ha visto aún; míralo con él.
- El menú es sobrio (noche, latón, un número). No tiene el valle detrás
  porque el juego no existe antes de `boot`. Si se quiere algo más vistoso,
  la vía es fundar en silencio y enseñar el valle desde arriba **detrás** del
  menú — es exactamente el vuelo de U-11, sin bajar hasta que se pulse.

### 2. Paso 4 · El reloj con horas — **hecho** (v3.72)

**Lo que pidió:** «El tiempo me gustaría que se visualizase en lugar del
título de los años. Un contador con horas incluso; debe ser real el paso del
tiempo, como si fuese la vida real.»

**Lo que se hizo, y lo que hay que saber de ello.** La cabecera es un reloj de
dos líneas —`HH:00` y «Year 1 · Spring, day 12»— y la hora **es la del sol que
se ve**. Para que eso fuera posible la semana pasó a durar siete jornadas de
sol (`REAL_MS_PER_TICK` 15 s → 840 s, §12.1): antes pasaban ocho amaneceres por
semana y no había hora que decir sin mentir. El día y la fecha salen del motor
(`src/derive/clock.ts`) y la hora de `hourAt` (`src/render3d/effects/day-phases.ts`),
que interpola entre los momentos del cielo —alba 05:00, mediodía 12:00,
anochecer 19:00, noche 22:00— porque la jornada comprime la noche; la primera
versión multiplicaba la fase por veinticuatro y sacó **la 01:00 sobre un valle a
pleno sol** en la primera captura. `data-sun-phase` en la raíz permite
comprobarlo desde fuera, y hay un recorrido de Playwright que lo hace.

Lo que se movió con ello, todo anotado en su sitio: la densidad de §11.6 se mide
a ×64, el techo de §8.6 se dice en semanas, el tope del letargo sigue siendo una
generación (960 ticks, nueve días de pared) y una pestaña oculta recupera a la
velocidad que estaba puesta. Tres duplicados menos.

**Lo que quedó sin hacer, y el dueño no lo ha visto aún:**

- **La noche se ve clara.** El modelo apaga el sol a las 22:00 —está medido— pero
  `NIGHT_FLOOR` (0,38) y `NIGHT_SKY_GAIN` (1,9) sostienen la noche al 72 % de la
  luz del día a propósito (v3.62: «nadie quiere mirar un valle a oscuras»). Con
  un reloj en pantalla el desajuste se lee: dice 22:00 y parece media tarde.
  Bajar esos dos números es una decisión visual del dueño, y el paso 5 va a
  tocar la luz de todas formas.
- **El arranque en frío recupera a ×1**, porque el guardado no lleva la
  velocidad. Meterla es un `SCHEMA_VERSION` nuevo.
- **Las horas no duran todas lo mismo** de tiempo real, porque la noche está
  comprimida. Es la consecuencia honesta de lo anterior.

<details>
<summary>El brief con el que se hizo, por si hay que rehacerlo</summary>

**Lo que hay hoy (no lo cambies sin leer esto):**

- El motor no tiene horas ni días: **1 tick = 1 semana** (`TIME.WEEKS_PER_YEAR
  = 48`, cuatro estaciones de doce). El estado guardado sólo conoce `tick`.
  **No metas horas en el motor**: rompería la determinación y los guardados
  por nada, porque las horas son presentación.
- A ×1 un tick dura `TIME.REAL_MS_PER_TICK` = 15 000 ms (`balance.ts`). Las
  velocidades son 0/1/4/16/64.
- Hay un **reloj escénico** aparte (`src/render3d/presentation-clock.ts`): un
  «día» de sol dura 120 s reales y corre a `scenicRate(speed) = speed`, así
  que **caben ocho semanas por día de sol a cualquier velocidad**
  (`life/staging.ts`, `WEEKS_PER_DAY = 8`; decisión v3.67, D.6.1). La luz sale
  de `daylight.ts` (`dayPhase`), y a ×16/×64 se aplana (`LIGHT_STEADY`).
- La cabecera pinta `app.year` = «ANNO {year}» en romanos y la estación
  (`.valley-year`, `.valley-season`, `src/ui/app.ts` ~línea 150 y `paint`).

**La decisión tomada y no implementada** (la tomó el agente anterior porque el
dueño no contestó a la pregunta; puedes preguntarle antes de hacerla, él
prefiere que se le pregunte poco y se decida):

> **Una semana = siete días de sol.** El día de sol sigue durando 120 s a ×1,
> así que un tick pasa a durar 7 × 120 s = **840 s a ×1** (`REAL_MS_PER_TICK:
> 840_000`) y el reloj escénico y el del motor cuentan la misma historia. El
> juego se hace lento a ×1 —un año son once horas— y eso es a propósito: es
> un idle «de fondo». A ×64 un año son diez minutos.

Qué toca, en orden, con la prueba de cada cosa:

1. `src/engine/balance.ts` · `TIME.REAL_MS_PER_TICK` 15 000 → 840 000, con su
   `// TUNE:` y el porqué. Busca **todo** lo que dependa de él: `ticksOwed` y
   el letargo (`src/engine/save.ts`, `LETHARGY_CAP_MS` en `balance.ts`, hoy cuatro horas — el tope de tiempo
   que se recupera al volver: con ticks de 14 minutos, cuatro horas fuera son
   17 ticks, ya no 960; decide si el tope sigue teniendo sentido),
   `src/ui/loop.ts` (`advanceAccumulator`), y las pruebas: `tests/fast/time.test.ts`,
   `tests/fast/graphics-clock.test.ts`, `tests/fast/life-clock.test.ts`,
   `tests/journeys/…` que cuenten ticks por segundo, y en `tools/valley.shots.ts`
   la prueba «volver de segundo plano» que escribe «30 min / 15 s = 120 ticks»
   **a mano** — reescríbela para que derive el número de la constante.
2. `src/render3d/life/staging.ts` · `WEEKS_PER_DAY` 8 → **1/7** o, mejor,
   invierte el nombre: `DAYS_PER_WEEK = 7`. Lee `ordersOf` y `meetingPlace`:
   reparten las ofertas del día según cuántas semanas caben en un día; con un
   séptimo de semana por día, la reunión de una decisión (§11.8) tiene que
   durar **los siete días** de esa semana, no repetirse siete veces. Prueba:
   `tests/fast/life-orders.test.ts` y `tests/journeys/life-decide.test.ts`.
3. `src/render3d/presentation-clock.ts` · nada cambia en el día de 120 s. Lo
   que hace falta es **exponer** el día y la hora: `dayNumber` y `dayPhase`
   ya existen en `daylight.ts`; añade a `GraphicsFrame` o a un getter del
   renderer `clock(): { dayOfWeek: 0..6; hour: 0..23 }` derivado de
   `presentationSeconds` **y** de `tickFraction` (ojo: son dos relojes; con
   840 s por tick y 120 s por día cuadran, pero al cambiar de velocidad o al
   volver del letargo se descuadran — `discontinuity` en el reloj escénico
   dice cuándo reengancharlos; la regla sencilla es que el día de la semana lo
   diga `tickFraction` (`floor(tickFraction · 7)`) y la hora la diga el reloj
   escénico dentro de ese día, y que en cada `discontinuity` el escénico se
   ponga a la hora que `tickFraction` diga).
4. `src/ui/backend.ts` · añade `clock()` a `ValleyBackend` (el 2D devuelve
   `null`: no tiene sol) y pásalo en `pilot3d`.
5. `src/ui/app.ts` · sustituye `year` + `season` por un `clock` con cuatro
   piezas: **Year 3 · Spring · Day 12 · 14:00** (el día es el de la estación,
   1–84 = 12 semanas × 7; o el de la semana, 1–7, si queda más claro; pregunta
   al dueño con una captura de cada). Claves nuevas en
   `src/engine/chronicle/bank.en.ts`: `app.clock.year`, `app.clock.day`,
   `app.clock.hour` — con `{year}`, `{day}`, `{hour}` y **sin** placeholder
   abriendo segunda frase. Cifras con `font-variant-numeric: tabular-nums`
   para que no bailen. CSS en `index.html` (`.valley-year` → `.valley-clock`).
   `tools/graphics/shot.mjs` imprime `.valley-year`: cámbialo. Y **todas** las
   pruebas de Playwright que esperan `ANNO I` / `ANNO LXXXI`
   (`grep -n "ANNO" tools/valley.shots.ts`).
6. Captura en secuencia a ×1 y a ×16 (`--sequence 12 --every 1`): las horas
   tienen que avanzar de una en una a ×1 sin saltos y el cambio de día tiene
   que coincidir con la noche del sol. Envíasela al dueño con `SendUserFile`.

**Trampa conocida:** la prueba «volver de segundo plano recupera el tiempo» y
la del parte de bienvenida (§13.2) usan `page.clock` de Playwright con
minutos falsos y **contarán ticks distintos** con el tick de 840 s. Están en
`tools/valley.shots.ts`; una es `test.fail()` declarada (ver su cabecera).

**Si el dueño prefiere que a ×1 pase más rápido**, la alternativa honesta no es
acortar el día de sol (a menos de 60 s parpadea, medido en D.6.1) sino que la
semana tenga menos días de sol (p. ej. 3): documenta lo que elijas en §12.1 y
en D.6.1 y **remide** el letargo.

</details>

### 3. Paso 5 · Tormentas con rayos — **hecho** (v3.73)

**Lo que pidió:** «El siguiente paso es crear efectos meteorológicos, como
tormentas con rayos.»

**Lo que se hizo** está contado entero en `docs/design.md` §10.8, con sus
medidas. En corto: el cielo se **deriva** (`src/derive/weather.ts`) de la fila
del clima del año, la estación y un `hash32` de la jornada, sin consumir una
tirada del motor; `SKY` en `balance.ts` lleva los números y
`tools/sky-report.ts` los midió (79 % de jornadas claras, una tormenta cada tres
semanas, y el cielo cerrado va del 34 % en un valle ruinoso al 9 % en uno
abundante). Se pinta con tres mallas (`effects/weather.ts`), la luz la aplica
`daylightAt(phase, speed, overcast)`, el trueno es ruido rosa filtrado en
`sound.ts` y lo dispara `app.ts` contando los rayos que cuenta el renderer.
`?debug=1&live=1&weather=storm` adelanta el valle hasta una tormenta y hay
recorrido de Playwright.

**Tres cosas que se arreglaron mirando capturas, y que valen como aviso:**

- **El rayo caía fuera de cámara** nueve de cada diez veces (mapa 72 × 112,
  vista de reposo 26 celdas). Ahora cae en el corazón del valle.
- **Medía cuarenta celdas de alto** y la cámara isométrica lo proyectaba como
  una raya de esquina a esquina. Veinte, y tres hebras en vez de una.
- **Un rayo caía en el primer fotograma** de cualquier jornada de tormenta,
  porque la jornada abre en 0,28 y la búsqueda de rayos cruzados empezaba en
  cero.

**Lo que quedó sin hacer, y el dueño no lo ha visto aún:**

- **La nieve no se ha mirado en captura.** Es el mismo camino que la lluvia
  (`set('snow')`), pero nadie ha abierto un invierno a mirarla: el valle de las
  capturas era de verano. Son dos minutos con
  `?debug=1&live=1&weather=storm&season=winter`.
- **El trueno no se ha oído.** `tools/graphics/sound-check.mjs` abre la página y
  mira el `AudioContext` de verdad, y no se ha usado con esto.
- **Nadie ha medido los fotogramas con lluvia** en un móvil. Son mil doscientos
  segmentos en una malla: en el portátil no se nota, y eso es lo único que se
  sabe (G-09 sigue pendiente de dispositivo).

<details>
<summary>El brief con el que se hizo, por si hay que rehacerlo</summary>

**Lo que hay hoy:**

- El motor tira el clima **una vez al año**, en la semana 0: `state.weather =
  { year, index, factor }` con la tabla `WEATHER` de `balance.ts` (§12.3; `index`
  es la fila, `factor` el multiplicador de cosecha). `rollWeather` en
  `src/engine/subsistence/seasons.ts`, flujo `weather`. **No hay clima por
  semana** y no lo va a haber en el motor: cambiaría el balance y los guardados.
- El render no puede tirar azar que mueva la simulación (innegociable). Puede
  usar `hash32` (`src/engine/rng.ts`) sobre `(seed, tick, …)`: determinista y
  sin tocar ningún flujo.
- Luz: `src/render3d/effects/daylight.ts` (`daylightAt(phase, speed)`,
  `LIGHT_STEADY`, `NIGHT_FLOOR`); los momentos de la jornada y la hora que son,
  en `src/render3d/effects/day-phases.ts` (sin Three); la niebla y el sol están
  en `renderer.ts` (`fogAround`, `sun`). **Y desde v3.72 hay un reloj en
  pantalla**: si la tormenta oscurece el valle, el jugador va a comparar la
  penumbra con la hora que marca la cabecera, así que la tormenta tiene que
  leerse como tormenta —nubes, lluvia, un cielo bajo— y no como anochecer.
- Sonido: `src/ui/sound.ts`, sintetizado con Web Audio, con **fusible** de
  acentos (`accentAllowed`, §11.4) y `AccentKind = 'milestone' | 'crossroad'`.
- Presupuestos de escena: D.9 y `tests/fast/graphics-budget.test.ts` (llamadas
  de dibujo, triángulos). Una tormenta no puede costar más de **una** malla
  de partículas y **una** de rayo.

Qué toca, en orden:

1. **Derivar, no simular.** `src/derive/weather.ts` (nuevo, puro, sin Three):
   `weatherAt(state, tick): { kind: 'clear' | 'overcast' | 'rain' | 'storm' |
   'snow'; intensity: 0..1 }`. Entradas: `state.weather.index` (el año malo
   trae más tormentas), `seasonOf(tick)` (`src/engine/time.ts`; nieve sólo en
   invierno, tormentas sobre todo en verano y otoño), y `hash32(state.seed,
   tick)` para que cada semana sea distinta **y siempre la misma** para esa
   semilla. Las probabilidades van a `balance.ts` como `SKY = { … } // TUNE`
   con su tabla en §12 de `docs/design.md`, medida antes de fijarla (un
   informe en `tools/` que cuente semanas de cada clase en 60 semillas × 100
   años; que una aldea tenga tormenta **una o dos veces al mes de verano**, no
   cada semana: si llueve siempre, no es tiempo, es decorado).
   Prueba: `tests/fast/weather-derive.test.ts` — misma semilla y tick, mismo
   cielo; nieve nunca fuera de invierno; en 60 semillas la fracción de
   tormentas está en la banda de `SKY`; **no consume ninguna tirada** (compara
   `state.rng` antes y después, como hace `graphics-world.test.ts` con
   «planificar no consume una tirada»).
2. **La luz del cielo.** En `renderer.ts`, `paint` ya calcula `phase` y `shown`
   (el estado de la jornada); calcula `sky = weatherAt(shown, shown.tick)` una
   vez por jornada (cambia con `today`) y pásaselo a `light(...)` de
   `daylight.ts` como un factor de nublado (0,55–0,7 de luz en tormenta, menos
   contraste en las sombras; `LIGHT_STEADY` sigue mandando a ×16/×64). Prueba
   en `tests/fast/graphics-effects.test.ts`: con tormenta la luz es menor que
   con cielo claro **a la misma hora**, y mirar el valle no cambia nada.
3. **Lluvia y nieve.** `src/render3d/weather.ts` (nuevo): una sola `Points`
   con `BufferGeometry` de N partículas (N por intensidad, tope 1 500; ver
   D.9) dentro de una caja que sigue al centro de la vista
   (`view.view.centre`), cayendo con `frame.deltaSeconds` (reloj escénico: en
   pausa se para, a ×64 cae deprisa y se ve como cortina, que está bien) y
   reapareciendo arriba por módulo. Nieve: más lenta, con vaivén por seno.
   Materiales: uno por clase, `sizeAttenuation`, sin texturas de red. Se
   descarta entera con `dispose()` del renderer.
4. **Rayos.** En `storm`, un destello cada `hash32(seed, tick, n)` segundos
   escénicos (entre 6 y 25): dos fotogramas con la luz hemisférica ×3 y el sol
   ×0 (el flash), y una malla de rayo —`Line` con 6–9 vértices en zigzag desde
   `y = 40` hasta un punto del suelo elegido con el mismo hash, dentro del
   mapa— visible 80–120 ms. Nunca `Math.random`. Prueba: con la misma semilla
   y los mismos segundos escénicos, los destellos caen en los mismos instantes
   (`tests/fast/weather-render.test.ts` sin GPU, si lo escribes como función
   pura `flashesBetween(seed, tick, fromS, toS)` en `derive/` y el renderer
   sólo la consulta — hazlo así).
5. **Trueno.** `sound.ts`: `AccentKind` gana `'thunder'`; ruido blanco
   filtrado por paso bajo con caída de 1,5–3 s, con retardo de 0,4–2 s tras
   el destello (más retardo, más lejos). Pasa por `accentAllowed`. Prueba en
   `tests/fast/sound.test.ts` como las de ahora: el fusible lo respeta, y sin
   tormenta no suena.
6. **Ruta de depuración y captura.** `src/ui/debug.ts` (`stateAt`,
   `parseDebugRequest`): admite `&weather=storm` que pone `state.weather.index`
   en la fila peor y avanza `tick` hasta la primera semana en que
   `weatherAt` diga tormenta. Añade a `tools/valley.shots.ts` un recorrido que
   abra `?debug=1&live=1&seed=7&year=3&weather=storm`, corra 20 s y compruebe
   que el brillo de dos capturas seguidas difiere (un destello) — el brillo
   ya lo mide `shot.mjs`; en Playwright copia la función. Captura de noche
   con rayo para el dueño: `node tools/graphics/shot.mjs --page
   http://127.0.0.1:8127/valley.html --seed 7 --run 40 --speed 16 --sequence
   16 --every 0.5` y busca el fotograma blanco.
7. **Documenta**: §10 (luz) y un §10.7 nuevo «El cielo» en `docs/design.md`,
   fila 3.72 en `docs/changelog.md`, `CLAUDE.md` (estado), y este fichero.

**Lo que no hagas:** clima por semana en el motor; tirar del flujo `weather`
desde el render; partículas por celda (son 8 064 celdas); sonido con ficheros
de audio (U-09: todo sintetizado, +0,41 % de peso fue el trato).

</details>

### 3b. Lo corto que queda pendiente, una tarea por entrada

> **En marcha el 15 sep por la tarde:** S-01 y S-02 (la nieve y el trueno) y
> S-03 y S-08 (el coste de la lluvia y la tabla de `data-*`), en dos agentes
> aparte. Si al retomar esto sus cambios están en el árbol sin commit, son de
> ellos: revísalos antes de tocar los mismos ficheros.

Cada una está acotada a propósito: los ficheros que toca, cómo se comprueba y
cuándo está hecha. **Si en una aparece una decisión** —un número de
`balance.ts`, un color, un «¿esto se ve bien?»— es que estaba mal cortada:
apúntalo y déjala, porque eso lo decide el dueño del diseño.

#### S-01 · La nieve, fotografiada

**Por qué.** El cielo de v3.73 pinta nieve en invierno y **nadie la ha mirado**:
las capturas de la ronda eran de verano. El código es el mismo camino que la
lluvia, así que esto es mirar, no programar.

**Qué hacer.**

1. Levanta el servidor de capturas: `npx tsx tools/graphics/bundle-game.ts --split`
   y, desde `artifacts/graphics/G-10/game`, `python -m http.server 8127 --bind 127.0.0.1`.
2. Captura un invierno con cielo cerrado:
   ```
   node tools/graphics/shot.mjs --page "http://127.0.0.1:8127/valley.html?debug=1&live=1&weather=storm&seed=7&year=20&season=winter" --settle 6 --sequence 8 --every 4 --out artifacts/graphics/G-10/storm/snow.png
   ```
   (`weather=storm` adelanta el valle hasta una jornada de cielo cerrado; en
   invierno eso es nieve, porque §10.8 no deja tronar en invierno.)
3. Mira las ocho capturas. Lo que hay que ver: copos, lentos, con vaivén, y la
   luz más baja que en un día claro. Si la nieve **no se ve**, apunta en el PR
   qué dice `data-sky` en la raíz —debería decir `snow`— y **no toques
   `SKY`**: eso es un número de balance.
4. Manda al dueño la mejor captura con `SendUserFile` y una frase.

**Hecho cuando** hay capturas en `artifacts/graphics/G-10/storm/` y el dueño las
tiene. Si algo no se ve, la tarea acaba igual: con lo medido escrito.

---

#### S-02 · El trueno, oído

**Por qué.** El trueno de v3.73 está escrito y probado como acento, pero nadie
lo ha oído sonar en la página.

**Qué hacer.** `tools/graphics/sound-check.mjs` abre el juego y mira el
`AudioContext` de verdad. Léelo, y añádele —o escribe al lado— una comprobación
que abra `?debug=1&live=1&weather=storm&seed=7&year=20&season=summer`, arme el
sonido con un toque en la pantalla, espere a que `data-bolts` suba y compruebe
que algo suena (el número de nodos, la ganancia del máster, lo que la
herramienta ya sepa mirar). Apunta en el PR **qué** comprobaste, no que «suena».

**No hagas**: cambiar `SOUND.THUNDER_*`. Son números de balance.

**Hecho cuando** la herramienta dice sí o dice no, y queda escrito.

---

#### S-03 · Los fotogramas con lluvia

**Por qué.** La lluvia son mil doscientos segmentos en una malla. En el portátil
no se nota; nadie ha medido cuánto cuesta.

**Qué hacer.** `tests/fast/graphics-budget.test.ts` ya cuenta llamadas de dibujo
y triángulos con la escena montada. Añade **un** caso: una escena con lluvia a
intensidad plena no pasa de una llamada de dibujo más que la misma escena con
cielo claro (es una malla), y apunta los triángulos de las dos. El patrón está
en el propio fichero; `createWeather` se usa igual que en
`tests/fast/weather.test.ts`.

**Hecho cuando** la prueba pasa y el PR dice los dos números.

---

#### S-04 · Las horas, en la pantalla de la gente y en la crónica

**Por qué.** El reloj de v3.72 puso horas en la cabecera, pero la crónica sigue
fechando por años («ANNO III») y la ficha de un aldeano dice su edad en años.
Eso está **bien** y no se toca. Lo que falta es más pequeño: la cartela de hito
(`src/ui/moment.ts`) y el aviso (`src/ui/notice.ts`) no dicen cuándo pasó lo que
cuentan, y ahora que hay reloj se puede.

**Qué hacer.** Mira si merece la pena: abre el juego, deja correr a ×16 y mira
un aviso. Si añadirle la hora lo mejora, añádela con una clave nueva en el banco
(`app.notice.at` o similar, con `{time}`) y `valleyClock` +`hourAt` como hace
`src/ui/app.ts`. **Si no lo mejora, no lo hagas** y escribe por qué en el PR:
media pantalla de texto para decir «a las 14:00» es peor que no decirlo.

**Hecho cuando** hay decisión escrita, con captura si se cambió algo.

---

#### S-05 · Cerrar la ficha de un edificio con la barra

**Por qué.** U-14 arregló la crónica y la pantalla de la gente. La **ficha** que
se abre al tocar un edificio (`.valley-panel`, en `src/ui/app.ts`) se cierra con
su botón, que está bien, pero no avisa a la barra de destinos ni se cierra al
tocar «Valley». Es el mismo fallo, más pequeño.

**Qué hacer.** En `src/ui/app.ts`, que `toValley()` cierre también la ficha
(`closePanel()`, que ya existe) y que abrir la ficha no deje la pestaña
encendida en otra pantalla. Añade el caso al recorrido
«la crónica y la gente se abren y se cierran» de `tools/valley.shots.ts`.

**Hecho cuando** `npm run test:shots` pasa con el caso nuevo.

---

#### S-06 · El servidor huérfano del puerto 8127

**Por qué.** Las capturas necesitan un servidor estático en
`artifacts/graphics/G-10/game`, y las sesiones lo dejan corriendo. No es un
fallo del juego, es higiene.

**Qué hacer.** Escribe `tools/graphics/serve.mjs`: sirve ese directorio en el
8127, **avisa si el puerto ya está ocupado en vez de fallar** y se cierra con
Ctrl+C. Añádelo a `package.json` como `npm run serve:shots` y menciónalo en
`docs/handover.md` §6, donde están los comandos de mirar el juego.

**Hecho cuando** `npm run serve:shots` sirve la página y `shot.mjs` la
fotografía.

---

#### S-07 · Las pruebas que cuentan tiempo, revisadas

**Por qué.** v3.72 cambió cuánto dura una semana (15 s → 840 s) y **tres
recorridos** se cayeron porque escribían sus milisegundos a mano. Se arreglaron
derivándolos de la constante (`msFor`, `advanceWeeks` en `tools/valley.shots.ts`),
pero puede quedar alguno.

**Qué hacer.** `grep -rn "60_000\|15_000\|_000)" tests tools --include=*.ts` y
revisa cada número que sea *tiempo real*: si viene de `TIME.REAL_MS_PER_TICK`,
que lo derive; si es tiempo de pared de una animación (`NOTICE_MS`,
`MOMENT_MS`), déjalo y escribe al lado por qué es de pared. No cambies el
significado de ninguna prueba.

**Hecho cuando** `npm test && npm run test:shots` pasan y el PR lista qué
números eran de tick y cuáles de pared.

---

#### S-08 · `data-*` de la raíz, documentados en un sitio

**Por qué.** La raíz lleva ya `data-app-ready`, `data-tick`, `data-render`,
`data-render-failure`, `data-intro`, `data-view-height`, `data-sun-phase`,
`data-sky`, `data-bolts` y `data-screen`. Es el mecanismo con el que se
comprueba el juego desde fuera, y no hay una lista.

**Qué hacer.** Una tabla en `docs/handover.md` §6 con cada atributo, qué dice,
quién lo escribe y para qué prueba existe. Sácalos con
`grep -rn "dataset\." src/ui src/render3d`.

**Hecho cuando** la tabla está y no falta ninguno.

---

---

### 4. Operativa que cuesta tiempo si no se sabe

- **La puerta de un paso:** `npm run typecheck && npm test && npm run lint`,
  después `npm run test:journeys` (6 min) y `npm run test:shots` (2 min;
  Playwright falla por carga de máquina si `test:balance` corre a la vez —
  pasó dos veces hoy: repite el que falle **aislado** con `-g "nombre"` antes
  de tocarlo).
- **`test:balance` tarda 25–45 min y el `Bash` de la herramienta se corta a
  10.** Lánzalo desapegado:
  `Start-Process cmd -ArgumentList '/c npm run test:balance > log 2>&1' -WindowStyle Hidden`
  y lee el log. Las 16 rojas actuales están explicadas en `docs/handover.md`
  §5.5; no las «arregles» tocando números sin el dueño.
- **Publicar la demo:** `npx tsx tools/graphics/bundle-game.ts --split` escribe
  `artifacts/graphics/G-10/game/artifact.html` (0,97 MB) y
  `valley-assets.json` (3 MB). Publica con la herramienta `Artifact` pasando
  `url: https://claude.ai/artifact/CbbvpwDfa5NUoog9E7XiMK` y
  `files: { "valley-assets.json": "<ruta absoluta>" }`. Sin `--split` la
  página pesa 4 MB y la publicación la rechaza. Los `.glb` no se pueden servir
  como ficheros de apoyo.
- **Capturas:** `node tools/graphics/shot.mjs --page http://127.0.0.1:8127/valley.html …`
  necesita un servidor estático en el directorio del juego:
  `python -m http.server 8127 --bind 127.0.0.1` desde
  `artifacts/graphics/G-10/game` (hoy hay uno huérfano corriendo; si el
  puerto está ocupado, es ése; mátalo o úsalo). Opciones útiles: `--seed 7`
  (escribe el número en el menú), `--open title` (fotografía el menú),
  `--settle 0.3` (no esperar ocho segundos tras fundar), `--sequence N
  --every S`, `--speed 16 --run 60`, `--open orders|speed`. Imprime la
  cabecera, la línea de estado y el brillo medio. En Chromium por software
  cada captura tarda ~1 s: **el tiempo entre fotogramas es `every` + 1 s**.
- **`data-*` en la raíz para mirar sin abrir nada:** `data-app-ready`,
  `data-tick`, `data-render` (`canvas`/`pilot3d`), `data-intro`
  (`flight`/`hints`/`done`), `data-view-height` (altura de la cámara en
  celdas). Añade los que necesites por el mismo patrón; es lo que salvó el
  vuelo de U-11.
- **El menú de inicio está delante de la ruta real** (`/` y `/?render=canvas`).
  En Playwright, `passTitle(page)` tras cada `goto` y cada `reload`; en
  `shot.mjs` se pasa solo. Las rutas `?debug=1…` no lo ven.
- **`tools/art/_test_build_priest.py` es de otra sesión: no lo añadas nunca a
  un commit.** `git add` por rutas (`CLAUDE.md docs src tests tools/x`), no `-A`.
- **Mensajes de commit** en español, con lo medido, y al final la línea
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (o la que te
  indique tu sesión). El dueño no ha pedido subir la rama: no hagas `push`.
- **Fundación de veinte en las pruebas:** `foundTwenty` /
  `foundPeopleTwenty` (`tests/helpers/founding.ts`) para pruebas de mecánica
  de una aldea hecha; `foundGame` (la pareja) para lo que mide el juego que se
  juega. Si una prueba nueva necesita gente, elige a conciencia y dilo en el
  comentario.
- **Nunca midas el juego con `tick()` en bucle**: `run(state, n, 'prudent',
  CATALOG)`. Está en `CLAUDE.md`, y costó media página de conclusiones falsas.
- La memoria del agente vive en
  `C:\Users\mvera\.claude\projects\d--DESARROLLO-PROYECTOS-VALLEY-project\memory\`
  (`esencia-del-juego.md`, `valley-debe-sentirse-viva.md`): léela.

---

## El estado, en cinco frases

- **El juego es el 3D y la aldea se mueve por la capa de vida.** Sin banderas.
  V-12 retiró el camino viejo, el descarte y 6 011 líneas.
- **La interfaz está cerrada de U-01 a U-09** y el diagnóstico de «se ve muy
  pobre» está atendido: se ve qué se puede hacer, la cabecera reacciona, la
  decisión pendiente es una píldora, hay pantalla de gente y el valle suena.
- **La auditoría encontró cuatro regresiones invisibles del día de G-12** y
  arregló tres. La cuarta —las reuniones de §11.8— es V-11 y está medida.
- **Lo que decide si hay juego no es gráfico.** Siete a doce decisiones en
  cuarenta años, medio catálogo muerto. La decisión de diseño está tomada; la
  ronda no.
- **Y lo que decide si esto corre no está medido:** todo lo de rendimiento es de
  un portátil. Hay demo de una sola página; falta un teléfono.

## Lo que dijo el dueño del diseño al probar la demo · 15 sep 2026

**Esto manda sobre el orden de abajo.** Es la primera vez que alguien juega la
demo del 3D con la interfaz nueva puesta, y es la clase de veredicto que
`docs/handover.md` §1 dice que no se puede sustituir por una medición. Transcrito
por áreas, sin suavizarlo:

### El mapa es pequeño, y tiene que ser el centro de algo más ancho

> «el mapa sigue siendo muy pequeño, dijimos que iba a ser mucho más grande.
> Vamos a expandir, vamos a meter más generación de diferentes cosas: bosques,
> montañas, lago, etc. El valle es el centro del mapa pero debe ser más amplio,
> para que podamos extender y hacer más cosas.»

Es **V-15 y V-16**, que estaban aparcadas con el coste medido (`design.md` E.8).
Dejan de estar aparcadas. Y llega con algo que los briefs no pedían: **más
clases de terreno generado** —lago, montaña dentro del mapa, bosques
distinguibles— no sólo más celdas del mismo prado. Sube `SCHEMA_VERSION` a 4 y
rompe partidas guardadas, que es la razón por la que estaba aparcada y ya no
basta.

### La cámara sólo mira desde un sitio

> «aunque tengamos 3D ahora mismo, solamente tenemos una visión de un plano.
> Deberíamos poder mirar desde diferentes ángulos, ahora que tenemos 3D
> implementado. Y el mapa en sí debe poder funcionar: cuando ya lo tengamos más
> grande, poder moverlo, hacer zoom y esas cosas.»
>
> «no se puede bien mover el mapa.»
>
> «si seleccionas algo del mapa, nunca se puede deseleccionar lo que aparece
> seleccionado.»

**Va antes que el mapa grande**, por orden de dependencia: un mapa nueve veces
mayor con una cámara que no gira ni se mueve bien es peor que el de ahora. `VIEW`
es hoy una dirección fija (`camera.ts`, la misma de todas las capturas desde
G-01) y D.7 nunca contempló girar.

### El reloj no cuadra al acelerar

> «cuando hacemos por 4 o por 64, hay muchas cosas que no se cuadran: aparece
> que es invierno y no se ve que sea invierno, los personajes no van al ritmo que
> deberían ir. Hay muchas cosas del reloj que están mal.»

Dos síntomas distintos y hay que separarlos: **lo que se pinta no corresponde a
la estación que dice la cabecera** (sospecha: el estado escénico de D.6.7 congela
la jornada de anoche y a ×64 pasan ocho semanas dentro de una jornada, así que la
cabecera va por delante de lo pintado), y **el ritmo de la gente**, que D.6.1
acelera con la raíz de la velocidad a propósito. Lo segundo puede ser la decisión
funcionando y viéndose mal; lo primero es un fallo.

### La interfaz, y sobre todo los textos

> «la interfaz sigue siendo bastante mala, aunque ya hemos avanzado un poco más.
> Los mensajes que aparecen ahí son horrorosos, tanto los mensajes rápidos como
> los mensajes entre eras.»
>
> «los botones de tiempo son provisionales, evidentemente. El líder no va a ser
> así. Y los iconos de estadísticas también son muy pobres.»

«Los mensajes entre eras» son las cartelas de hito de U-02. **Y aquí hay que
recordar una regla antes de tocar nada: las edades tecnológicas no existen en
este motor y no se inventan** (`design.md` §11, U-02); lo que se celebra son
hitos con fecha real. Si lo que falla es que suenan a hito de otro juego, se
arregla la voz, no se inventa una progresión.

### Más modelos

> «debemos seguir implementando también modelos en 3D. Son muy escasos: las
> construcciones, los aldeanos, objetos que pueda haber por el mapa, como
> herramientas.»

Hay 39 recursos publicados. Lo que falta por D.8: el campo y el camino como
terreno con geometría, la familia de defensa completa, y **objetos sueltos por
el mapa**, que no estaban en ningún brief y son nuevos.

### Lo que se ha hecho de esta lista, y lo que destapó

| Ronda | Qué cerró |
|---|---|
| **G-13** | La cámara gira, se levanta, dos toques vuelven, tocar el suelo deselecciona, y arrastrar el mapa ya no abre la crónica encima |
| **G-13b** | Al alejarse el valle **llena la pantalla** (del 25 % al 85 % de alto): el tope encajaba la caja entera y en vertical eso deja el mundo como un sello. Y la sierra tenía un agujero por el que se veía el fondo |
| **G-14** | A ×64 el valle **pintaba otro año** que la cabecera. El color de la estación pasa a salir del reloj vivo |
| **G-15** | Almiares, leña y carretas por el valle: los trece edificios ya tenían recurso, lo que no había era nada entre una casa y la siguiente |
| **G-16** | Los mensajes: la pancarta a sangre pasa a tarjeta, «in year 0» y «No of them left the fields» |

**Y cuatro cosas que salieron de mirar capturas, y son de quien siga:**

1. **La noche es casi negra y a ×64 parpadea cada quince segundos.** Medido con
   la herramienta nueva: brillo medio del día 0,458, atardecer 0,392, noche
   0,208. No es un fallo —la noche es de noche— pero un ciclo día/noche cada
   quince segundos de reloj de pared es un estrobo, y a esa velocidad el jugador
   no está mirando a nadie en particular. Es la misma decisión que la de abajo.

2. **A ×64 la gente y las casas siguen siendo de hasta 64 semanas atrás**, y
   arreglarlo es un fork de diseño con tres salidas, ninguna gratis:
   - la jornada escénica sigue a la velocidad **entera** (D.6.1 la puso a la
     raíz a propósito, porque si no la gente corre a saltos);
   - a velocidad alta **no se dibujan los individuos** — y entonces no hay salto
     que ver, que es el principio del anochecer llevado al final;
   - o se engancha el rebaño a la capa de vida, donde un cuerpo no se
     teletransporta porque no evalúa una fórmula.

   Lo que **no** vale es relevar el estado más a menudo: medido, el rebaño salta
   5,096 celdas contra un techo de 0,4, porque un relevo sólo es invisible
   cuando el bicho no está en pantalla.

3. **Un hueco de reparto llega a la pantalla:** «{B} was given the forge in year
   26», semilla 23. El arreglo cabe en tres líneas y mueve la trayectoria de
   todas las semillas, así que va con el carril del ritmo de decisión. Declarado
   con `it.fails`.

4. **La cartela de hito habla en pasado y con fecha** —«The first house went up
   in the spring of year 3»— mientras el jugador está viendo el año 3. Se lee
   como una página de libro de historia sobre algo que está pasando ahora. **Y
   es deliberado**: U-02 decidió que un hito es «una etiqueta en una página de
   la crónica, no un título ni una celebración», y §9.3 gobierna la voz. Si lo
   que chirría es eso, es una **decisión de voz y no un arreglo**, y hay que
   tomarla antes de reescribir cincuenta plantillas.

### El orden que sale de esto

1. ~~**La cámara**~~ — **hecha, G-13.** Gira con dos dedos o con mayúsculas, se
   levanta la vista, dos toques vuelven al principio, tocar el suelo
   deselecciona, y arrastrar el mapa ya no abre la crónica encima. Informe en
   `docs/graphics-rounds/G-13.md`, con tres capturas desde tres ángulos.

   **Y mirarlas destapó tres cosas que nadie había apuntado:**
   - **Una cuña marrón enorme sobre el río** en la vista de reposo, con el color
     del suelo pisado, tapando el agua. Geometría del suelo o del cuenco de V-14
     saliendo donde no debe. **Va con el mapa grande**, que rehace el terreno.
   - **Doce de veinte aldeanos llevan nube de diálogo a la vez.** §11.1.1 la puso
     para «quien está viviendo algo»; con el 60 % de la aldea marcada no señala
     nada. Es parte de «los mensajes son horrorosos» y es barato.
   - **El mapa se ve entero desde el reposo**, con borde de prado vacío
     alrededor. Confirma la queja: no hay nada que descubrir moviéndose.
2. **El reloj a ×4 y ×64.** Separar los dos síntomas y medir.
3. **El mapa grande, con más generación.** V-15 + V-16, ampliadas. **Brief
   medido al final de este documento**, porque no es una constante.
4. **Los textos y los iconos.** Es voz y dibujo, no arquitectura.
5. **Más modelos**, que va en paralelo si hay Blender.

Y lo que ya estaba y no se cae de la lista: **V-11** (las reuniones no ocurren) y
**el ritmo de decisión** (siete a doce decisiones en cuarenta años).

---

## Los carriles

| Carril | Rondas | Modelo | Por qué ese modelo |
|---|---|---|---|
| **A · La vida** | **V-11** → el enganche del rebaño | Sonnet (`Tier: construir`) | Brief con contrato literal en E.8; la causa está medida |
| **B · El ritmo** | `wolf_winter` → relajar → plantillas nuevas | **La sesión, sin delegar** | Es balance y cada paso cambia la partida entera |
| **C · La reja visual** | Los siete recorridos declarados | Sonnet, **con capturas a la vista** | Pide juicio sobre lo que se ve, no ajustar números |
| **D · Medida** | Tras cada entrega de A | Haiku (`Tier: medir`) | No escribe código: corre la sonda y escribe la tabla |
| **E · Auditoría** | Tras cada entrega de A o C | Sonnet, con `docs/agents.md` §«Cómo se audita» | Primera pasada barata; la sesión cara sólo revisa lo que marque |

A y C no se pisan: A vive en `src/render3d/life/`, C en `tools/*.shots.ts`.
B toca `src/engine/` y **no corre a la vez que nada**, porque mueve la
trayectoria de todas las semillas y deja sin sentido cualquier medición
simultánea.

**Antes de lanzar cualquiera, dos cosas que ya han costado tiempo:**

1. **El worktree ancla mal a menudo** (cuatro veces de seis). El brief tiene que
   exigir comprobar que existe un fichero **reciente** — hoy sirven
   `src/derive/README.md`, `tests/fast/life-staging.test.ts` o
   `vitest.journeys.config.ts`. Y tiene que decir **cómo** corregirlo:
   `git merge --ff-only <hash de la punta>` sobre un árbol limpio. `git reset
   --hard` está denegado por el candado a propósito.
2. **Una jornada sola es ruido**, igual que una semilla sola. Cada jornada de la
   capa de vida tiene su propia semilla (`seedOfDay`), así que medir el día 0 de
   seis semillas son seis muestras y no seis aldeas. Todo brief de la capa de
   vida tiene que pedir varias jornadas.

---

## Carril A · La vida

### V-11 · Lo que el motor manda — **y una regresión que saldar**

**Esto no es una fase pendiente cualquiera: es una regresión del juego.** Las
reuniones de §11.8 —veinticinco de las cincuenta y seis opciones del catálogo
convocan a la aldea— dejaron de ocurrir el 14 sep, cuando G-12 puso la capa de
vida por defecto. Sólo existían en `actorsFor`. Nadie lo vio porque la prueba que
las vigilaba llamaba a `actorsFor` directamente y siguió verde sobre un camino
que el juego ya no recorría; V-12 borró ese camino y lo dejó a la vista.

**Medido** (`tests/fast/life-staging.test.ts`): con una reunión convocada, a
media jornada el más lejano está a **12,4 celdas** del sitio. `life/` no conoce
la palabra `gather`. El `?render=canvas` sí las sigue enseñando, lo que confirma
que el motor hace su parte.

**Lectura obligatoria.** E.2 (la consecuencia aceptada: la vida no escribe en el
motor), E.4 (el mundo ofrece, el agente elige), §7.9, §11.8, y el brief de V-11
en E.8, que trae el contrato literal.

**El contrato, de E.8, y es literal:**

```ts
export type Order =
  | { kind: 'quarrel'; a: VillagerId; b: VillagerId; blows: boolean }
  | { kind: 'gather'; at: Point; days: number }
  | { kind: 'mourn'; who: VillagerId };
export function ordersOf(state: GameState, since: number): Order[];
export function stage(order: Order, life: Village, seed: number): void;
```

**Ficheros.** Nuevo `src/render3d/life/staging.ts`; toca `life/village.ts`.
`gatheringsAt` y `encountersAmong` viven ahora en `src/derive/`, y de ahí se
leen: son funciones puras del estado y las lee también el Canvas.

**Reglas.** Las órdenes **bajan**, nunca suben. Una riña que el motor decidió se
convierte en escena `brawl` con sus papeles y su sitio, a la hora que la vida
decida dentro de la jornada. Una reunión es un `Place` temporal con aforo alto y
hora fija. Nadie de `life/` importa de `engine/` salvo tipos y funciones de
lectura, y `module-graph.test.ts` lo vigila.

**Terminado cuando.** Se quita el `.fails` de «la aldea se junta donde la
decisión dijo» y pasa; se borra la tercera prueba, la que mide la dispersión de
hoy, porque su única razón de existir era tener contra qué comparar; toda riña de
la crónica de la jornada se ve como escena; y **hay captura de una reunión**
(`npm run shot`). Medido en varias jornadas y varias semillas, no en el día 0.

### El enganche del rebaño

**Después de V-11, y es pequeño.** Los animales que se ven se calculan del estado
(`effects/fauna.ts`, función de la hora) mientras la gente a su lado son cuerpos
que andan. V-08 ya partió la clase en dos para esto y dejó
`life/beasts.ts` dando animales con cuerpo; el enganche no se hizo porque no
estaba en su alcance.

**Lo que resuelve, además de la coherencia:** con animales-`Dweller` desaparece
`ashore` —la corrección que devuelve al rebaño a tierra cuando la geometría lo
deja en el agua—, porque un cuerpo colisiona con el río y no llega a pisarlo.
Esa función tiene una deuda declarada de 0,326 celdas y arreglarla por geometría
pediría un A* por tierra, desproporcionado para una vía que esto borra.

**Ficheros.** `src/render3d/renderer.ts` (quién alimenta a `Fauna`),
`src/render3d/effects/fauna.ts` (la mitad de `paint`, que ya existe).
**Terminado cuando.** Los animales del valle son los de `life/beasts.ts`, la
prueba de `ashore` con techo 0,4 se borra por innecesaria, y hay captura.

---

## Carril B · El ritmo de decisión — lo que decide si hay juego

**No lo hace un agente.** Es la pregunta de diseño central: *¿cada cuánto quiere
el juego que decidas?* La decisión está tomada (`docs/roadmap.md`, 14 sep): las
tres cosas —arreglar los fallos, relajar condiciones y escribir plantillas de
menor peso—, en ese orden y **remidiendo cada paso**, porque relajar y añadir a
la vez hace imposible saber cuál de los dos movió qué.

Un tope que hay que vigilar: **un idle que interrumpe cada dos minutos deja de
ser un idle.** Se apunta a seis u ocho decisiones por década, no a treinta.

### Paso 1 · `wolf_winter`, que está hecho y sin fusionar

**En la rama `worktree-agent-afdfba3b92d4bb7ee`** (commit `40708c7`). Baja el
umbral de `forestLeft` de 0,25 a 0,15 en `crossroads/catalog/forest.ts`, que es
lo correcto: la condición era imposible por construcción, la misma errata que
`forest_cut` tuvo con su 0,3 y se corrigió así en v2.47. Trae además
`tests/fast/crossroads-reachability.test.ts`, que vigila que ninguna plantilla
tenga una condición inalcanzable — la prueba que habría cazado esto el día que se
escribió.

**Por qué no se fusionó:** hacerlo elegible mete veintiuna encrucijadas nuevas en
la ventana medida, y eso cambia la trayectoria de cada partida. **Trece pruebas
calibradas sobre semillas concretas pasan a fallar**, comprobado con y sin el
cambio en los mismos ficheros (5 fallos con, 24 de 24 sin). No es ruido de carga,
aunque lo parezca: el informe del agente lo dio por flakiness y no lo es.

**Lo que cuesta retomarlo es una ronda entera, no un commit:**

1. Fusionar y correr `npm run test:all` para tener la lista exacta de las trece.
   **Ojo:** varias de ellas viven ahora en `tests/journeys/`, así que sin
   `test:all` no salen.
2. Para cada una, **remedir y recalibrar, no subir el número hasta que pase**.
   Varias son de la capa de vida y miden propiedades sobre semillas concretas
   (`life-props`, `marks`, `daylife`, `life-scenes`, `trade`); dos están en el
   borde de su umbral por coma flotante y se arreglan solas con la aldea nueva,
   pero hay que mirarlas una a una.
3. Volver a pasar `npm run eligibility` y anotar el ritmo nuevo: antes 3,2
   encrucijadas por década.

### Pasos 2 y 3 · relajar, y luego escribir

Con el ritmo remedido, y no antes. `npm run eligibility` dice **plantilla a
plantilla cuántos ticks es elegible y qué regla falla cuando no lo es**, que es
lo que convierte «medio catálogo no sale» en una lista de causas.

Y una señal de haberse pasado: **si la suite de balance de §12.9 empeora.** Hoy
falla doce pruebas y ya fallaba antes; el número a vigilar es la distancia entre
jugar bien y jugar mal, que el diseño pide en veinte puntos y está en cinco.

---

## Carril C · La reja visual, que estaba roja

**Siete recorridos de `npm run test:shots` están declarados** —cuatro con
`test.fail()` y tres con `fixme`— y la cabecera de cada fichero dice por qué.
Ocho de trece fallaban en el commit `1f8abd8`, medido, y llevaban así todo el
programa de interfaz.

**Esta ronda pide capturas a la vista y no se cierra sin ellas.** Cada uno de los
cuatro de interfaz fija una constante de diseño o un tick exacto que las rondas
movieron:

| Recorrido | Qué falla | La vía |
|---|---|---|
| el parte de letargo | fija `rgb(18,17,14)` y U-01 lo pasó a `rgb(26,21,17)` | Comprobar la propiedad: que el velo tapa y sale de la paleta, no un rgb |
| la encrucijada | la semilla 7 ya no planta a los 58 s; v3.60 y v3.61 movieron la trayectoria | **Esperar a que el motor plante una**, en vez de fijar un número |
| el epitafio | `#valley` no da caja al refundar | Hace falta mirar la página para saber por qué |
| el aviso de §11.6 | convive ahora con la cartela de U-02 y la píldora de U-07 | Decidir qué voz manda cuando hay dos, y comprobar eso |

**Y los tres de animales no se recalibran: se sustituyen.** Fotografían el
Canvas, y la cabaña la pinta hoy `render3d/effects/fauna.ts`. Lo que se debe es
una captura de los animales **en 3D**, que además es lo que valida el enganche
del carril A.

**Terminado cuando.** Ni un `test.fail()` ni un `fixme` en `tools/*.shots.ts`, o
los que queden con su medición nueva escrita y el motivo. Y una captura por cada
recorrido tocado, mirada.

### Y lo que la reja visual no cubre: el 3D

No hay ni un recorrido automático que fotografíe el valle en 3D. Hoy se mira a
mano con `npm run shot`, que funciona sin red y pide WebGL por software.
Automatizarlo es una ronda propia, y el criterio de qué se compara —¿píxeles?,
¿una hoja de contactos que alguien mira?— es una decisión de diseño, porque una
comparación de píxeles sobre WebGL por software es una fuente de falsos rojos.

---

## Carril D · Medir (Haiku)

Tras cada entrega de A. **La sonda que comparaba producción y descarte se fue con
V-12** (`probe-models.ts` importaba el descarte), así que lo que queda es la
suite de recorridos y las tablas de `docs/life-rounds/`. Si hace falta una sonda
nueva, se escribe contra `life/` sola y se dice qué compara.

## Carril E · Auditar (Sonnet)

Tras cada entrega de A o C, un agente con `docs/agents.md` §«Cómo se audita lo
que entrega un agente» delante: ancla del worktree, diff entero, pruebas con
desconfianza, remedir. Escribe su informe en `docs/life-rounds/<ronda>-audit.md`
y **no fusiona**: marca lo que hay que mirar.

---

## Lo que no puede hacer ningún agente, y bloquea más que todo lo de arriba

1. **Un teléfono.** Todo lo medido de rendimiento es de un portátil. Desde la
   migración esto no es una deuda, es lo que decide si el 3D se sostiene, y va
   **antes** de borrar `src/render/`. La demo se arma con `npm run shot` y cabe
   en una sola página sin servidor.
2. **La lectura del hito 0 por un tercero.** `npm run reader:packet`, tres
   crónicas, y una pregunta: *«¿en qué se diferencian estas tres aldeas?»*. Ni
   quien diseñó ni quien programó sirven. **El hito 6 está igual.**
3. **Decidir la escala.** En el encuadre de reposo una persona mide **seis
   píxeles**, medido. A esa escala no se ve una charla, ni un encaro, ni a quién
   mira nadie: toda la capa de vida es invisible por defecto. Es D.6.2 y no
   interfaz, y es una sesión de diez minutos mirando la demo.

---

## El mapa grande · brief, con la trampa medida

**Lo que se pidió:** *«el mapa sigue siendo muy pequeño, dijimos que iba a ser
mucho más grande. Vamos a meter más generación: bosques, montañas, lago. El
valle es el centro del mapa pero debe ser más amplio, para que podamos extender
y hacer más cosas.»*

**Lo primero, porque cambia el plan: crecer el mapa NO es cambiar dos
constantes.** El Anexo E lo daba por «dos constantes y un tipo literal», y eso
es verdad de la geometría y falso de la economía. Medido al auditar:

```
mapgen.ts:  const forestCount = Math.round(CELLS * fraction);
```

**El bosque es una fracción del mapa entero.** Con un mapa cuatro veces mayor
hay cuatro veces más bosque, o sea cuatro veces más madera en pie
(`WOOD_PER_FOREST_TILE`), y la madera deja de ser escasa para siempre: se cae
`forest_cut`, se cae `wolf_winter`, y §5.4 —media economía del valle— deja de
apretar. Ésa es la recalibración que tenía la fase aparcada, dicha con el número.

**La vía que no rompe la economía**, y es además lo que el encargo pide:

1. **El bosque, la roca y la marisma pasan a ser cantidades absolutas**, no
   fracciones. Mismo número de celdas productivas que hoy —entre 363 y 605 de
   bosque, que es 0,18–0,30 × 2 016— concentradas alrededor de la fundación. La
   economía no se entera: mismos árboles, misma madera, mismas condiciones.
2. **Lo que llena el resto es terreno nuevo y no productivo.** Dos códigos de
   `TERRAIN_CODE` nuevos —`mountain` y `lake`— que no dan madera, ni forraje, ni
   solar, y que A* no cruza. Eso responde a «bosques, montañas, lago» sin tocar
   una sola constante de balance, y de paso mete la sierra **dentro** del mapa,
   donde hoy es decorado fuera de él (V-14).
3. **`MAX_FIELDS` y `MAX_HOUSES` son topes absolutos y no escalan**, así que la
   aldea no se desparrama: sigue siendo el centro de algo más ancho, que es
   literalmente lo que se pidió.

**El radio de explosión, contado:** 20 ficheros de `src/` miran `TERRAIN_CODE` y
26 sitios usan `WORLD.WIDTH/HEIGHT`. Sube `SCHEMA_VERSION` a 4 y **rompe las
partidas guardadas** — aceptable ahora y no cuando haya un móvil con una partida
de varios días encima, así que si se hace, se hace **antes** del hito 6.

**Orden, y cada paso con su medida:**

1. Los dos códigos de terreno nuevos, con el mapa **al tamaño de hoy**: nada de
   ellos generado todavía, sólo el tipo, el coste de A*, la prohibición de
   construir, el color en las dos paletas y la altura en `RELIEF`. La suite
   entera tiene que quedar idéntica: si algo se mueve, es que un módulo daba por
   hecho que los códigos eran seis.
2. El bosque, la roca y la marisma a cantidades absolutas, **también al tamaño
   de hoy**. Aquí la suite de balance tiene que dar lo mismo que ahora: es una
   reescritura sin cambio de comportamiento y se comprueba así.
3. Y entonces el tamaño, con la montaña y el lago llenando lo nuevo. Pasada
   completa de balance (18 min) y los números de §12.9 comparados contra los de
   antes, uno a uno.

**Lo que falsaría el paso 3:** que la madera en pie por habitante cambie, que la
cadencia de encrucijadas se mueva, o que el coste de un tick a ×64 pase de los
234 ms medidos — una ruta que cruza el valle cuesta 0,09 ms y con un mapa cuatro
veces mayor son unos 0,4; con cincuenta rutas por tick, 20 ms.
