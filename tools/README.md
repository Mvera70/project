# Las herramientas de The Valley — el catálogo

Se ordenó el 19 sep 2026, a petición del dueño del diseño: «que no haya
herramientas sueltas sin documentar». Cada herramienta activa tiene una entrada
aquí o en el README de su lote. Las utilidades de rondas cerradas viven en
[`history/`](history/README.md). Una herramienta nueva sin entrada no está
terminada.

**Para encontrar la correcta sin recorrer el catálogo:**

| Necesidad | Entrada recomendada |
|---|---|
| Ver el juego o grabar una escena | [`graphics/README.md`](graphics/README.md) → Captura |
| Medir rendimiento de Three.js | [`graphics/README.md`](graphics/README.md) → Rendimiento |
| Construir o publicar GLB | [`art/`](#art--de-la-receta-al-glb) y `graphics/publish-assets.ts` |
| Medir motor y balance | [`reports/`](#reports--medir-el-motor-sin-tocarlo) |
| Revisar interfaz o PWA | [`shots/`](#shots--la-interfaz-fotografiada), [`pwa/`](#pwa--instalable-y-sin-conexión) y [`ui/`](#ui--la-piel-y-los-iconos) |
| Reproducir una ronda cerrada | [`history/`](history/README.md) |

| Carpeta | Qué hay dentro |
|---|---|
| [`reports/`](#reports--medir-el-motor-sin-tocarlo) | Informes del motor. Miden y no cambian nada |
| [`shots/`](#shots--la-interfaz-fotografiada) | Recorridos de interfaz en Playwright y capturas |
| [`pwa/`](#pwa--instalable-y-sin-conexión) | Los recorridos de §13.4 y los servidores que imitan a GitHub Pages |
| [`graphics/`](#graphics--el-valle-en-3d) | Capturar, rodar, medir y mirar el valle en 3D; [índice por tarea](graphics/README.md) |
| [`ui/`](#ui--la-piel-y-los-iconos) | La piel de la interfaz: pergamino, cantos, iconos, calcos |
| [`art/`](#art--de-la-receta-al-glb) | El camino de Blender al GLB publicado |
| [`history/`](history/README.md) | Scripts de rondas cerradas, fuera del flujo habitual |

**Cómo se lee una fila.** Si la herramienta tiene un `npm run`, se usa así; si
no, se lanza con `npx tsx` o `node` y la ruta entera. Casi todas llevan su
porqué en la cabecera del fichero — eso es lo que hay que leer antes de
cambiarlas; esta tabla sólo dice cuál abrir.

---

## `reports/` — medir el motor sin tocarlo

Todos son **observacionales**: juegan la partida de verdad, cuentan y escriben.
Ninguno afirma un umbral ni modifica el estado.

**La trampa que costó media página de conclusiones falsas:** un informe que
avanza el mundo con `tick` en un bucle **no mide este juego** — nadie contesta
las encrucijadas y con ellas se van sus consecuencias y sus obras. Se juega con
`run(state, ticks, 'prudent', CATALOG)`. Está contado en la cabecera de
`works-report.ts` y en `CLAUDE.md`.

| Herramienta | Qué mide | Cómo se lanza |
|---|---|---|
| `valley-report.ts` · `valley-report-page.ts` · `ladder.ts` | **El informe del valle**: juega una o varias semillas y escribe un HTML autocontenido con gráficos semana a semana (gente, existencias, ánimo, ganado, obras, bosque, clan), la escalera del ritmo en horas de reloj, los sucesos, muertes y obras contados, la crónica entera con filtros y las decisiones; y un índice de todas las ejecuciones en `artifacts/reports/valley/index.html`. **El sitio donde medir y comparar para el balance**. Cuesta ~0,26 s por valle y año en un núcleo (6 valles × 60 años: 92 s y 348 MB; unos 3 MB por fichero). Escribe también `report-publish.html`, el mismo informe como fragmento para publicarlo y verlo en el móvil. `ladder.ts` es la escalera, compartida con `pace-report.ts` | `npm run report:valley -- [--count 6 \| --seeds 7,23] [--years 60] [--policy prudent] [--label nombre]` |
| `battle-report.ts` | **La batalla del banco, sin navegador**: la misma que `?sandbox=battle` (villa, armas, asalto de hoy, manos y asaltantes a medida) paso a paso con Rapier, imprimiendo fases, flechas, bajas, portón y física. Para comprobar un cambio del combate en segundos; ver la skill `battle-sandbox`. **Con `--shadow`, el experimento F-0**: cada batalla sin sombra y con una cápsula de Rapier por asaltante de cada radio pedido, la comprobación de que la sombra no cambia nada, la tabla de acuerdo con el cilindro que decide y el coste de las sondas (`docs/diagnostico-fisica-combate-2026-09-29.md` §3) | `npx tsx tools/reports/battle-report.ts [--defenders 10] [--arm bow\|spear] [--raiders 24] [--steps 3000]`; `… --seeds 7,11,21,42 --shadow 0.12,0.17,0.37 [--relief]` |
| `hunt-report.ts` | **Cómo acaba la caza sola**, especie por especie y arma por arma: cobrada, malherida o ilesa, golpes, tiros, segundos y qué tocó cada tiro (pecho, cuarto trasero, roce, algo de pie, suelo, aire). En un llano con el cazador a doce celdas y en valles de verdad con el suelo del juego (troncos medidos sobre el GLB, relieve) y el cazador saliendo de la aldea. Es la cifra de balance de la caza física (AN-5b, `artifacts/physics/AN-5/`). **Dice los valles que se salta** («sin presa en …», revisión del 30 sep 2026): antes las filas del ciervo y del jabalí eran de dos valles de cinco sin decirlo | `npx tsx tools/reports/hunt-report.ts [--seeds 60] [--valleys 7,11,23,3,5] [--year 30] [--only campo\|valle]` |
| `bear-visit-report.ts` | **Cuánto se deja ver el oso** en su visita (AN-5d): el día entero de la aldea con su gente en valles de verdad, segundos fuera de la cueva, cuándo se alza por primera vez, cuántas veces y por qué se mete; y lo que cuesta montar la visita (`createBear`) en cada valle, en tiempo de esta máquina | `npx tsx tools/reports/bear-visit-report.ts [--seeds 7,11,23,3,5] [--year 30]` |
| `pace-report.ts` | **El ritmo del juego en horas de reloj a ×1**, que es la unidad en la que el dueño pone los objetivos. Se vuelve a pasar cada vez que se toca `REAL_MS_PER_TICK` o un umbral de §12 | `npx tsx tools/reports/pace-report.ts` |
| `wood-report.ts` | **La madera: si aprieta, cuándo y por qué** (K1–K3, 1 oct 2026): juega con `run` y la política prudente y cuenta, por valle, cuándo se traza y se cierra el cerco, el bosque de dentro en cada momento, la distancia de tala por tramo de horas, las semanas de leñera corta, de frío y de obra esperando madera, y las rachas de escasez con su causa (la abrió el pago de una obra, o el bosque estaba lejos). La definición de escasez está en su cabecera y en `docs/medidas/k1-k3-madera-2026-10-01.md` | `npx tsx tools/reports/wood-report.ts [--seeds 12] [--years 60] [--from 1] [--short 4] [--serious 4]` |
| `k8-report.ts` | **Cuándo llegan la capilla, la herrería y la iglesia, y qué aprieta entonces** (K8+K9, 2 oct 2026): juega con `run` y la política prudente y da, en horas a ×1, la llegada de cada edificio y de su oficio con la gente que hay, y por tramo de partida (sin capilla, capilla, herrería, villa cerrada) las semanas de hambre, de obra esperando madera y de ánimo bajo, y la piedra, la plata y la fe en mediana. Medida en `docs/medidas/k8-k9-edificios-2026-10-02.md` | `npx tsx tools/reports/k8-report.ts [--seeds 12] [--years 60]` |
| `fall-report.ts` | **K7: de qué muere una aldea y cuándo empezó a torcerse** (2 oct 2026): para cada valle que acaba, la causa, el **punto de no retorno** en horas a ×1 y cuántas antes del final (asalto: desde que la partida que bajaría ya cuadruplica la resistencia, `STORM_ODDS`; abandono y extinción: desde que la gente queda por debajo de `VIABLE_POPULATION`; dispersión: la primera de las negativas al líder), lo que se veía entonces y un año antes, las decisiones cercanas y los titulares de la crónica entre el punto y el final. Estrategias: prudente, herrajes de K9 y la adversa `worst` | `npx tsx tools/reports/fall-report.ts [--seeds 30] [--years 100] [--from 3 --step 7] [--only prudent,herrajes,worst]` |
| `tilt-report.ts` | **K9: ¿alguna inclinación dominada o que mate aldeas?** (2 oct 2026): juega las mismas semillas con cada opción de los tablones de K8 pedida siempre que se pueda (hachas, rejas, herrajes, misa, rogativa, y nada) y da por estrategia las partidas acabadas y su causa, la gente, los edificios, la villa cerrada (cuántos valles y a qué hora), la obra esperando madera, el hambre, el ánimo bajo, y la plata, el grano y el ánimo medios; al pie, la mejor en cada cosa. Es la prueba contra la trampa de v2.0 | `npx tsx tools/reports/tilt-report.ts [--seeds 8] [--years 40] [--only nada,hachas]` |
| `agency-report.ts` | Cuánto importa lo que hace el jugador: varias maneras de jugar sobre las mismas semillas. **Es la medida que cierra cada fase de los medios** (M-0 a M-4) | `npx tsx tools/reports/agency-report.ts [--seeds 16] [--years 60]` |
| `eligibility-report.ts` | Por qué medio catálogo de encrucijadas no sale nunca, separando «nunca es elegible» de «pierde el sorteo» | `npm run eligibility` |
| `fate-report.ts` | Los sucesos del valle (R-1): cuántos al año, de qué clase y **cuánto se parecen dos valles** | `npx tsx tools/reports/fate-report.ts [semillas…] [--years 40]` |
| `rest-report.ts` | **Qué le pasa a un valle mientras nadie lo mira** (RD-2, 30 sep 2026): juega hasta la hora de salida con la política prudente y compara tres reglas de ausencia —el letargo de §13.2 tal cual, **A** (para ante encrucijada, aviso de asalto, crisis nueva o final) y **A′** (la decisión espera; paran el aviso de asalto y la semana que acabaría la partida)—: semanas avanzadas, por qué para, partidas acabadas, asaltos resueltos, encrucijadas y muertes | `npx tsx tools/reports/rest-report.ts [--seeds 24] [--from 0.2,1,8,40] [--away 34,548,960]` |
| `works-report.ts` | Por qué una aldea deja de construir: cuánta cola de obra hay por décadas y por qué está vacía cuando lo está | `npx tsx tools/reports/works-report.ts` |
| `founding-report.ts` | Cómo crece una aldea fundada por dos: población por década, llegados contra nacidos, aldeas apagadas | `npx tsx tools/reports/founding-report.ts [semillas…]` |
| `threat-report.ts` | El clan del valle vecino (B1): qué vale el valle visto desde fuera, cuándo baja, con cuántos y qué se lleva | `npx tsx tools/reports/threat-report.ts [--seeds 16] [--years 80]` |
| `sky-report.ts` | Qué cielo hace: jornadas de cada clase por año y rayos caídos. Fijó las probabilidades de `SKY` | `npx tsx tools/reports/sky-report.ts [semillas…]` |
| `notice-report.ts` | Qué frases lee **de verdad** el jugador, ordenadas por cuántas veces salen. Lo que sale arriba es lo que hay que escribir bien | `npx tsx tools/reports/notice-report.ts [--years 60] [--all]` |
| `attribution-report.ts` | Dónde mueren las aldeas (§12.9) | `npm run attribution` |
| `policy-attribution-report.ts` | Qué decisiones separan el juego prudente del adverso | `npm run policy:attribution` |
| `lethality-report.ts` | **Qué decisiones acumulan la caída** (G4), por contrafactual: juega el valle y lo vuelve a jugar cambiando **una sola** respuesta | `npm run lethality` |
| `balance-report.ts` | Las medidas del banco de §12.9. Lo importa `tests/balance/balance.test.ts` | `npm run balance:report` |
| `balance-verdict.ts` | Lee `artifacts/balance-summary.json` y dice, aserto por aserto, qué pide §12.9 y qué salió. **No simula**: evita triar a ojo un banco de treinta y dos minutos | `npx tsx tools/reports/balance-verdict.ts` |
| `migration-ab-report.ts` | El experimento A/B de la puerta de migración, restaurando la constante al salir | `npm run migration:ab` |
| `gait-report.ts` | **La zancada de cada clip de desplazamiento, sobre el GLB publicado y sin navegador** (AN-0, 29 sep 2026): cadencia de las patas al paso que da la vida (`paso / zancada`), fracción de apoyo y cuánto retrocede el pie apoyado respecto al cuerpo (1,00× es plantado). Es la medida del antes y el después de la locomoción; los pasos de la vida van copiados en la cabecera porque los módulos no los exportan | `npx tsx tools/reports/gait-report.ts` |
| `model-draws.ts` | **Cuántas llamadas de dibujo deja cada modelo publicado al cargar** (revisión del 30 sep, RV-1): carga cada GLB por el mismo paso que el juego (`prepareModel`: piel para los cuerpos rígidos animados, fusión para el resto) y cuenta mallas, pieles, materiales y triángulos. Un modelo nuevo se mide aquí antes de darlo por bueno; `--dir` mide los GLB de otro commit | `npx tsx tools/reports/model-draws.ts [--ids cow,hen] [--dir <carpeta>] [--over 4]` |
| `animation-cost.ts` | **Cuánto cuesta animar por fotograma, sin navegador (AN-4):** monta `Cast` y `Fauna` como el renderer con una escena fija (100 personas, 40 animales por omisión) y mide `cast.show` y `fauna.paint` con `performance.now()`: mediana y p90 en ms, µs por cuerpo. No dibuja ni da FPS de ningún aparato; compara dos commits en la misma máquina, a solas. `npx tsx tools/reports/animation-cost.ts [--people N] [--animals N] [--frames N]` |
| `life-report.ts` | Las cuatro cifras de la capa de vida sobre personas **y** animales: el «antes» que se escribe antes de tocar `body.ts` | `npx tsx tools/reports/life-report.ts [semillas…] [--days N]` |
| `life-report-species.ts` | Cuánto cuerpo-tiempo pasa cada especie en cada actividad y cuántos sitios usa en una jornada | `npx tsx tools/reports/life-report-species.ts` |
| `life-traits-report.ts` | Cuánto tiempo pasa cada rasgo en cada actividad, y si una persona se parece a sí misma de un día a otro | `npx tsx tools/reports/life-traits-report.ts` |
| `physics-report.ts` | Lo que cuesta la física del asedio: microsegundos por paso con N cuerpos, y lo que pesa Rapier | `npx tsx tools/reports/physics-report.ts [--bodies 200]` |
| `map-dump.ts` | El volcado ASCII del mapa: el valle con su río y sus edificios, por consola | `npm run map -- --seed 7 --years 0` |
| `reader-packet.ts` · `reader-packet-content.ts` | El paquete ciego del hito 0: tres crónicas y una pregunta para un lector de fuera. **El hito está descartado**; se conserva porque su contenido lo prueba `tests/journeys/reader-packet.test.ts` | `npm run reader:packet` |

**Lo que un informe de fuera no ve.** Ninguno de éstos abre el navegador, así
que ninguno mide la capa de vida **como la corre el juego**: `life-report.ts`
no vio nunca que una de cada cinco muestras era alguien de pie creyendo que iba
a algún sitio (IA-9). Eso se mide con `graphics/film.mjs` y
`graphics/observe-life.mjs`.

## `shots/` — la interfaz fotografiada

`playwright.config.ts` recoge `tools/**/*.shots.ts` y los corre contra el
servidor de desarrollo.

| Herramienta | Qué hace |
|---|---|
| `valley.shots.ts` | **La reja principal de interfaz** (§14.3, M-19): la tira, las encrucijadas, la crónica, el epitafio y la herencia. Va escrita a `?render=canvas` a propósito, no por descarte |
| `animals.shots.ts` | Los animales del valle en Canvas 2D (§7.7) |
| `pass-title.ts` | Pasar el menú de inicio como lo pasa el dedo. **Vive suelto y sin `test()` dentro a propósito**: importar un fichero de pruebas de Playwright registra sus pruebas |
| `screenshots.ts` | Capturas de móvil, comprobación en gris y hoja de contactos (M-19) |
| `dev-presets.shots.ts` | **Los accesos de taller del menú**: con Dev pulsado, las tres partidas preparadas (años 1, 21 y 60) se ven y abren la villa con un toque, desde el menú real y no desde una prueba de motor |

`npm run test:shots` corre la reja; `npm run shots` toma las capturas.

## `pwa/` — instalable y sin conexión

`playwright.pwa.config.ts` recoge `tools/**/*.pwa.ts` y los corre **contra
`dist/`**, porque el trabajador de servicio no existe en el servidor de
desarrollo. Los tres llevan WebGL encendido: sin él el relevo a 3D falla en
silencio y la prueba pasa sin probar nada.

| Herramienta | Qué hace |
|---|---|
| `valley.pwa.ts` | Instalable y sin conexión (M-27, §13.4) |
| `subpath.pwa.ts` | El mismo build servido desde `/project/`, como lo sirve GitHub Pages (M-27.1) |
| `subpath-server.mjs` | El servidor que imita ese subdirectorio, porque `vite preview` sólo sirve la raíz |
| `stale.pwa.ts` | Un despliegue nuevo alcanza a un aparato que ya visitó (M-27.2) |
| `stale-server.mjs` | Sirve `dist/` con las cabeceras de caché que manda Pages; `GET /__bump` hace de despliegue |

`npm run test:pwa`.

## `graphics/` — el valle en 3D

El [índice corto por tarea](graphics/README.md) separa captura, modelos,
rendimiento y revisión. La tabla siguiente conserva el detalle de cada script.

| Herramienta | Qué hace |
|---|---|
| `shot.mjs` | **Fotografiar el juego montado.** `--seed`, `--year`, `--run`, `--speed`, `--wait moment\|crossroad`, `--look X,Z` para centrar una celda real y `--scene-only` para guardar el PNG WebGL sin HUD/DOM. `--capture-zoom 0.1..1` amplía esa captura del hook y exige `--look`, `--look-animal` o `--scene-only`. `--look-animal bear` encuadra el primer animal de esa especie en el momento de disparar (con `?happening=` en `--page` para los de un suceso). Abre el valle en un año concreto sin falsear el reloj (U-10b). **Tomas comparables (GV-0, 29 sep 2026):** `--touch` abre un contexto táctil y móvil (a 3×) para que `auto` resuelva como en un teléfono —sin él se fotografía el perfil alto—, `--quality auto\|high\|medium\|low`, `--dpr`, `--sky clear\|overcast\|rain\|storm\|snow`, `--phase 0..1` (0,45 es mediodía), `--scale 1` fija la adaptativa (en un dibujo por software baja sola y cambia la resolución de cada toma), `--pause` para el juego en cuanto el valle está puesto y `--eval "<js>"` corre un gancho de taller antes de disparar. Con todo fijo, dos tomas salen **idénticas al píxel**. `VALLEY_CHROMIUM=<ruta>` elige el navegador (`browser.mjs`) |
| `film.mjs` | **Rodar el valle**: fotogramas seguidos más la traza de cada cuerpo en cada uno (`window.__valleyLife`) |
| `follow-sequence.mjs` | **Seguir a un aldeano fotograma a fotograma, igual en dos versiones** (GV-2): con el juego en pausa reinicia la jornada y avanza a pasos fijos (`__valleyAdvance`), sigue a alguien como la ficha (`__valleyTrack`) y guarda cada escena y si una copa lo tapa (`trackedHidden`, `revealed`) en `sequence.json`. `--follow <id>\|axe\|hidden\|none`: `hidden` busca a quien más rato pasa bajo el bosque (`__valleyCanopyHidden`) y dice su id y arranque para repetir la toma en otra versión con `--follow <id> --lead <s>`. `--lead`, `--frames`, `--every` (pasos de 1/30 s), `--zoom`, `--query "aa=fxaa"` y las opciones de perfil de `shot.mjs` |
| `film-sheet.py` | Convierte esa película en tira de contactos e informe de anomalías. **Es la única forma de medir la capa de vida como la ejecuta el navegador** |
| `observe-life.mjs` | Juego real con el reloj del navegador controlado, píxel y traza atómicos. Lo usa la skill `observe-valley-life`. Quien anda por su ruta elevada (escalera, adarve) se cuenta en `elevatedSamples`, no como choque. **AN-0 (29 sep 2026):** `--viewport 390x844` mira el valle al tamaño de un móvil (por omisión sigue el encuadre ancho de 1100×850) y `--look X,Z` encuadra una coordenada sin seguir a nadie (un ciervo, un puesto). **AN-3:** `--hunt` toca la señal de caza al acabar el lead y rueda la escena (el juego sigue al cazador solo); si no hay señal tocable, lo dice y para. **Y una trampa medida en AN-1:** para contar saltos y giros en la traza vale `trace.json` de esta herramienta (pasos exactos entre fotogramas), no `film.mjs`, que rueda en tiempo real y bajo SwiftShader tarda 8 s por fotograma: su informe cuenta el reloj como saltos |
| `artifacts/graphics/AN-4b/trace-strip.py` | **Tiras de un actor siguiendo la traza del observatorio** (AN-4b): `--find` lista fotograma a fotograma los clips de combate y de caza (con id), la caza (fase, especie, acción de la presa, clip del cazador), los animales salvajes con acción y los asaltantes; `--id N [--animal]` hace la tira de contactos centrada en ese actor en cada fotograma. Sólo lee `trace.json` y `frames/`: el fotograma sin el actor se salta y se dice. `python3 artifacts/graphics/AN-4b/trace-strip.py <toma> --find` · `… --id N [--animal] [--from A] [--to B] [--every K] [--cols C] --out tira.png` |
| `artifacts/graphics/AN-4/compare/build-compare.py` | **Los pares «antes / después» a escala nativa** (AN-4): de fotogramas ya rodados, un GIF de dos paneles 1:1, otro ×3 y una tira de contactos por par, con diagnóstico (negros, duplicados, saltos, alineación de las trazas). No captura nada. `python3 artifacts/graphics/AN-4/compare/build-compare.py [par …]` |
| `artifacts/graphics/AN-5/take.sh` | **Rodar una toma del observatorio aislada y con su log** (AN-5): borra la carpeta de la toma, apunta la orden y la hora en `logs/<nombre>.log` y corta a los 40 minutos. `bash artifacts/graphics/AN-5/take.sh <nombre> <argumentos de observe-life.mjs sin --out>` |
| `evidence-index.mjs` | **El índice verificable de una toma del observatorio**: comprueba que la traza, los fotogramas y el informe de una carpeta de `observe-life.mjs` casan, con su huella, y escribe `evidence-index.json` en la carpeta sin tocar lo demás. `node tools/graphics/evidence-index.mjs <carpeta-toma>` (Codex, ronda de agentes del 17 sep; integrado el 27 sep) |
| `day-report.mjs` | Resume la traza del renderer (IA-12) — la traza real, no una simulación paralela |
| `press-kit.mjs` | **El paquete de prensa**: todas las pantallas y todos sus estados en una pasada, con hoja de contactos, y el metraje del tráiler sin interfaz. El grupo `raros` trae lo que casi no se ve: la carga, el valle fundándose, el parte de bienvenida, el panel al tocar, la caza, avisos de amenaza, obras y el banco de batallas. `--only <grupos>`, `--offset N` |
| `press-archive.py` | **Guarda una tanda del paquete como versión de la interfaz** en `docs/interfaz/<fecha>/`: JPG a 780 de ancho, renumerados de corrido, con índice y el pie de cada una, y copia en `ui/` las que enseñan interfaz (lista `UI_SHOTS`). No pisa una versión existente. `python tools/graphics/press-archive.py --date AAAA-MM-DD [--skip a,b]` |
| `bundle-game.ts` | Empaqueta el juego entero en una página, para abrirlo desde el móvil |
| `serve.mjs` | Sirve ese paquete cuando va partido (`--split`), que pide su JSON por la red |
| `capture.ts` | El motor de captura compartido |
| `capture-fire-transition.mjs` · `fire-transition.html` · `fire-transition.ts` | Vista reproducible de la casa que arde, cae y deja la ruina. Con Vite local en marcha, captura días 1, 2,45 y 3,3 en `artifacts/graphics/G-42/fire-transition/`. `VITE_PORT` permite usar otro puerto |
| `animal-gestures-bench.mjs` · `animal-gestures-bench.ts` | **Los gestos fabricados del perro** (`effects/animal-gestures.ts`: correr, ladrar, jugar) sobre el GLB publicado y el `Fauna` del juego, una fila por gesto: `node tools/graphics/animal-gestures-bench.mjs`. Para comprobar que un perro nuevo sigue sirviendo |
| `hunt-smoke.mjs` | **La entrada de caza, de humo**: abre el juego (`--seed=N`, `--mobile`), entra en la caza y fotografía su escena 3D en `artifacts/graphics/hunt-smoke/`. Prueba manual reproducible, no una reja |
| `animal-gait-compare.mjs` | **La marcha de dos GLB candidatos contra la publicada**: doce fases de `walk` del ciervo y del oso, con rodillas y tobillos marcados. `npx tsx tools/graphics/animal-gait-compare.mjs --candidate-dir <carpeta>`; su README es `animal-gait-compare-README.md` |
| `performance/gl-probe.mjs` | **Lo que cuesta cada fotograma, desde fuera**: intercepta WebGL y cuenta llamadas de dibujo, triángulos, programas enlazados, tiempo enlazando y JS por fotograma (mediana y p90). Vale para cualquier versión, también una vieja. `node tools/graphics/performance/gl-probe.mjs <valley.html> "<query>" [segundos]`. Ver la skill `performance`. **Y por la portada** (GV-0): `gl-probe.mjs <valley.html> --seed 7 --year 60 --touch --sky clear --phase 0.45 --scale 1 [--seconds 40] [--query "aa=fxaa"] [--follow <id>] [--report]`, porque `?debug=1` pinta además el Canvas 2D y **no vale para el JS por fotograma** (sí para llamadas, triángulos y programas). Por esa entrada da también **el reparto del fotograma que mide el renderer** (medianas de `paintMs`, `renderMs`, `lifeMs` y `restMs`, el JS fuera del dibujo y de la vida), que es la cifra de JS por fotograma que vale; `--follow` sigue a alguien como su ficha y `--report` añade el reparto de `scene-report`. Las cuatro sondas de `performance/` aceptan `VALLEY_CHROMIUM` y ya no exigen el Chromium de Windows |
| `performance/scene-report.mjs` | **De dónde salen las llamadas**: mallas visibles, con sombra e instanciadas y triángulos por grupo (los edificios, por tipo), con `window.__valleySceneReport()`. `node tools/graphics/performance/scene-report.mjs "<query>" [valley.html]` |
| `performance/shadow-flicker.mjs` | **El parpadeo de las sombras, medido**: fotografía el valle N veces seguidas a ×1 sobre una zona quieta y cuenta qué fracción de píxeles cambia entre fotogramas consecutivos (mediana y máximo). Comparativo, antes y después de un cambio; el viento en las copas y la hierba también cambia píxeles, así que la cifra que aísla el mecanismo es `window.__valleyShadowStats()` (reorientaciones de la cámara de sombra y redibujados del mapa). `node tools/graphics/performance/shadow-flicker.mjs [url] [fotogramas] [ms] [salida]` |
| `performance/shader-churn.mjs` | **Cuántos sombreadores se recompilan al pasar cosas**: programas enlazados tras cargar, tras un rayo y al encender y apagar la fiesta. Cada uno de más es un tirón en una tablet. `node tools/graphics/performance/shader-churn.mjs <valley.html> "<query>"` |
| `performance/cpu-profile.mjs` | **En qué se va la CPU**, con CDP: tiempo inclusivo por función y las cadenas que llevan a una dada. Sobre el juego sin minificar (`bundle-game.ts --no-minify`). `node tools/graphics/performance/cpu-profile.mjs <valley.html> "<query>" <espera> <perfil> <función>` |
| `performance/relay-probe.mjs` | **La línea de tiempo del valle a una velocidad** (revisión del 30 sep 2026): abre el valle por la portada con perfil de teléfono, pone el reloj a ×1…×64 y apunta cada `paint`, los pasos de vida y los fotogramas de más de 500 ms. Es la que ve **el relevo de jornada** (`createVillage` en cada día escénico: cada 7,5 s a ×16) y **el bucle de la villa** (GV-4); con ella se midió que GV-4a solo deja la villa congelada 5–7 s en cada relevo. `--scale` es 0,25 por omisión porque, con dibujo por software, a escala 1 los fotogramas ya se separan más de un segundo y el reloj los toma por ausencias. `node tools/graphics/performance/relay-probe.mjs <valley.html> --seed 7 --year 60 [--speed 16] [--seconds 60] [--scale 0.25]` |
| `model-sheet.mjs` · `model-sheet.ts` | **La hoja de todos los modelos publicados**: cada GLB de `public/assets/valley3d` con la misma luz y la misma cámara, agrupados por familia y con su tamaño en celdas. `node tools/graphics/model-sheet.mjs [--out artifacts/graphics/models]`. `--ids bear,fox` limita a esos modelos y `--sides` los fotografía por cuatro lados —perfil, la vista del juego, desde atrás y de frente— en `sides-sheet.png`, que es donde se ve si una silueta aguanta. `--candidate bear-v4=<ruta.glb>` pone al lado un GLB sin publicar, para comparar antes de admitirlo. Los efectos dibujados por código (hoguera, tendederos, fuego) no salen; el roble ya es un GLB |
| `contact-sheet.py` | Monta la hoja de contactos de una ronda gráfica, para juzgarla de un vistazo |
| `animals-preview.ts` · `animals-preview.mjs` | El banco de fauna (G-23): GLB publicado y controlador del juego con recorrido conocido. Vale para cualquier especie con GLB: `node tools/graphics/animals-preview.mjs bear --out <carpeta>` (sin `--out` escribe en la entrega de G-23, que está en el repositorio). `--glb <candidato> --motion '<json>'` prueba un GLB sin publicar; es el banco que enseña el pez bajo el agua y el pato flotando. Encuadra cada especie por su caja |
| `skin-compare.py` | Pone el recorte del prototipo al lado de la captura real. **Es el criterio de hecho de cada ronda de piel** |
| `gesture-sheet.mjs` · `gesture-sheet.ts` | Hoja de contactos de un gesto fabricado sobre el GLB publicado, sin partida: `node tools/graphics/gesture-sheet.mjs chop [--model villager-mason] [--frames 12]`. Da también la posición de la mano y de la cabeza de la herramienta |
| `animation-audit.ts` | Audita los clips **en el navegador**, sobre el GLB exportado, no en Blender (D.4, D.6) |
| `bench.ts` · `bench.html` · `bench-scenes.ts` · `benchmark.ts` | El banco de rendimiento de G-09 (D.9) y P-1a. `npx tsx tools/graphics/benchmark.ts --suite p1 --repeats 3 --seconds 10 --width 390 --height 844` mide tres muestras de día/noche del preset real 11/año visible 21, con fase inyectada sólo en `GraphicsFrame` y vida activa a ×1; informa el cielo real derivado, sin falsearlo. Conserva cada JSON bajo `artifacts/graphics/P-1a/`. Sus dos cargas son de instancia dentro de la misma sesión, no caché fría/caliente de navegador. No mide INP/UI; la comparación lluvia controlada requiere una fase posterior sobre la app real. |
| `bench-app.ts` | P-1a sobre **la aplicación real**: abre el menú, Desarrollo y el preset village (semilla 11/año visible 21), y conserva carga, cadencia RAF, Long Tasks, Event Timing disponible y una latencia sintética wheel→RAF —nunca llamada INP— bajo `artifacts/graphics/P-1a-app/<marca>/run.json`, sin pisar corridas. Edge si está instalado; Chromium queda marcado como respaldo. `--condition all` compara día despejado, noche despejada y noche lluviosa mediante controles de presentación sólo locales; `--condition natural` conserva la ruta anterior. Corrida fría P-1a.1: `npx tsx tools/graphics/bench-app.ts --condition all --repeats 3 --cache cold --seconds 10 --settle-seconds 5`. P-1a.2: `--profile-load true` conserva un perfil CPU desde antes del clic del preset hasta 3D utilizable; después registra seis clics de vista despejada por `interactionId`. `--headed true` abre Edge visible. `--cpu-profile true` perfila la cadencia con sobrecoste y no debe combinarse con su comparación sin perfil. Caché caliente y fría se ejecutan por separado. El INP del navegador sigue sin medirse. |
| `doctor.ts` | Diagnóstico del entorno gráfico antes de culpar al código |
| `viewer.ts` · `viewer.html` | El visor suelto de un GLB |
| `browser.mjs` | **El Chromium de todas las herramientas de captura**, en cualquier máquina: el Playwright de Windows, Chrome o Edge, el que pide Playwright o cualquiera de `PLAYWRIGHT_BROWSERS_PATH`. Antes cada herramienta lo buscaba sólo en `AppData` y fuera de Windows no arrancaba |
| `publish-assets.ts` | Admite un lote explícito aprobado con `--ids bow,spear`; verifica hash, bytes y procedencia antes de copiar, conserva todos los recursos ya publicados y rechaza sobrescribir bytes distintos |

P-1b.2: `bench-app.ts --stages true` activa sólo en Vite local las marcas
`valley3d:` de importación, creación y primer fotograma. Las guarda como
`stageMarks` en cada réplica del `run.json`. Son tiempos del hilo del navegador,
no tiempo GPU. Ejecutar caché fría y caliente por separado, con autorización
explícita para abrir la app y medir el equipo. `--capture true` guarda una
captura de la primera réplica de cada condición después del asentamiento.
La comparación de partición del primer fotograma está cerrada en el
[informe P-1b.2](../docs/historico/graphics-rounds/P-1b2-primer-fotograma.md);
la partición se retiró.

**El navegador de las capturas, fuera de Windows (AN-0, 29 sep 2026).** Todas
las herramientas de esta carpeta que abren Chromium buscan el `chrome.exe` de
`~/AppData/Local/ms-playwright` y, si no está, dejan que Playwright use el suyo.
Cuando la revisión instalada no es la que pide `@playwright/test` —el caso de
la máquina de la ronda AN, con `/opt/pw-browsers/chromium`—, se señala el
ejecutable con `VALLEY_CHROMIUM=/ruta/a/chrome`, que manda sobre las dos
búsquedas en `shot.mjs`, `film.mjs`, `observe-life.mjs`, `gesture-sheet.mjs`,
`animals-preview.mjs`, `animal-gestures-bench.mjs`, `press-kit.mjs`,
`performance/gl-probe.mjs` y `performance/scene-report.mjs`.

`npm run shot`, `npm run bundle`, `npm run serve:shots`, `npx tsx tools/graphics/publish-assets.ts --ids bow,spear`.

## `ui/` — la piel, los iconos y el sonido

El estándar visual está en la skill `piel-del-valle`; el calco de dibujos, en
`calcar-iconos`; el sonido, en `docs/design.md` §11.10. Éstas son sus
herramientas.

| Herramienta | Qué hace |
|---|---|
| `parchment.py` | Genera el mosaico de pergamino. **Es un script y no un PNG pintado para que sea reproducible byte a byte** |
| `deckle.py` | Escribe los `clip-path` de los bordes rasgados de las placas |
| `torn-edge.py` | El canto rasgado de la hoja (VZ-2), uno solo para las tres secciones |
| `cut-logo.py` | **Recorta una imagen generada de su fondo de cuadros pintado** (los generadores no dan transparencia). Hecho para el logotipo del título. `python tools/ui/cut-logo.py <entrada.jpg> <salida.png>` |
| `textures.py` | **Las texturas de madera y empedrado de la piel UI-W** (`wood-planks.png`, `cobble.png`, `metal.png`, y el grabado de la portada en dos tintas): semilla fija, ruido periódico, sin costura. Existe porque la madera en CSS se queda corta («úsalo para texturas en general, CSS se queda corto»). `python tools/ui/textures.py` |
| `contrast.py` | Mide cada par texto/fondo que la piel usa de verdad contra el 4,5:1 de WCAG AA. El juego se mira a pleno sol |
| `trace-glyph.py` | **Calca** un glifo del prototipo y lo devuelve como `<path>` de 24 × 24. Existe porque deducir la forma a ojo falló cinco veces |
| `cut-art.py` | Recorta piezas pintadas del prototipo y las deja listas para la interfaz |
| `skin-ornaments.py` | Calca los adornos de la piel y escribe sus módulos |
| `sampler.mjs` · `sampler.html` | El muestrario de las primitivas de la piel, fotografiado. Es la prueba de hecho de UI-V0 |
| `icons.ts` · `icon-source.png` | Los iconos de la aplicación (§13.4) desde la fuente maestra de 1254 px |
| `icons/regenerar-calcos.py` | Vuelve a calcar los glifos del prototipo y reescribe `calcadas.py` |
| `icons/calcadas.py` | Las siluetas calcadas. **Generado; no se edita a mano** |
| `icons/variantes.py` | Las variantes escritas a mano de los dos iconos que no salen del calco |
| `icons/aplicar.py` | Lleva una variante al sprite del juego y a la copia incrustada |
| `import-chronicle-art.ps1` | Baja los grabados de la crónica y los normaliza a 640 × 512 en `public/ui/art/` |
| `sounds.py` | **Los sonidos de la interfaz, fabricados y no grabados** (29 sep 2026, 22; y siete de caza y asedio, 30 sep, `combat_*`, de ruido y sin resonancia): foley de materiales —piedra sobre madera, cofre, cuero y hebilla, cera, madera hueca, campana grave— **sin notas afinadas**, modelado con numpy, nivelado en la banda que oye un teléfono y escrito en `public/audio/*.mp3`; sella la huella de cada uno en `src/ui/sound.ts`. Determinista byte a byte. Existe porque la síntesis en vivo de U-09 sonaba «malísima» y así cada sonido se escucha y se elige antes de entrar; la dirección salió de probar un botón cuatro veces. `CHOSEN` dice qué variante suena. `pip install numpy scipy soundfile`, `python tools/ui/sounds.py [--audition] [--stamp]` |
| `tonality.py` | **Cuánto suena a nota** un fichero (30 sep 2026): cuánto tiempo aguanta un componente estrecho por encima de su entorno entre 300 Hz y 4 kHz. Un timbal de referencia da 336 ms; un golpe de ruido, 0–6. Existe porque los siete sonidos de caza salieron con 200–260 ms y Vera los oyó como «juguetes de niño pequeño». `python tools/ui/tonality.py a.wav b.wav` |
| `sound-check.mjs` | **¿Suena lo que tiene que sonar?** Recorre la interfaz con clics de verdad en Chromium —portada, hojas, ficha, reloj, silencio, oferta, encrucijada— y lee lo que el reproductor apuntó (`window.__valleySound`). Cada paso dice qué debe sonar y, si hace falta, **qué no puede sonar además** (así se comprueba que el sello genérico no se pone sobre un botón con voz propia). Mide el *cuándo*; el *cómo* se escucha. Informe y capturas en `artifacts/audio/check/`. `node tools/ui/sound-check.mjs [--headed] [--chrome <ruta>]` |

`npm run icons`.

## `art/` — de la receta al GLB

| Herramienta | Qué hace |
|---|---|
| `index.ts` | **El corredor del camino**: construir, validar y promover un recurso. `npm run art` |
| `schema.ts` | La receta: qué se puede declarar y cómo se valida |
| `recipe.ts` | Lee y resuelve una receta |
| `glb.ts` | Valida el GLB producido contra lo que la receta prometía |
| `files.ts` | Escritura atómica y la reja que impide salir del directorio |
| `blender-build.py` | La geometría, dentro de Blender |
| `rig.py` | El esqueleto, **separado** de la geometría porque D.4 lo exige |
| `animate.py` | Los clips, separados del rig por el mismo motivo |
| `rigid-clips.mjs` | **Los clips de un animal de nodos rígidos** (los de Vera, `deliverables/marked-models-trial/`): añade `idle` y `walk` —con apoyo en línea recta, sin patinar; el ciervo, con el casco plantado por cinemática inversa— y los que falten (`charge`, `attack`, `flight`) sobre sus nodos, sin tocar la geometría, e imprime la marcha que el catálogo tiene que declarar. `node tools/art/rigid-clips.mjs <entrada.glb> <salida.glb> <especie>` |
| `bake-clips.mjs` | **Hornea los clips de una receta en un GLB ya exportado, sin Blender** (AN-1): para cuando la receta cambia sólo en sus clips. Muestrea las pistas a 24 fps como el exportador y reescribe sólo las animaciones; geometría, materiales y esqueleto quedan intactos. `--check` no escribe: compara lo horneado con lo que trae el GLB. `node tools/art/bake-clips.mjs <receta.json> <entrada.glb> <salida.glb> [--clips walk,carry_walk]` |
| `adopt-models.mjs` | **Admite en el catálogo un modelo hecho fuera de las recetas**: carpeta de aprobados, hash, estadísticas, caja, clips y marcha, para publicarlo con `publish-assets.ts` por el camino de siempre. `node tools/art/adopt-models.mjs <lista.json>` |
| `adopt-house-candidates.mjs` · `register-house-variants.mjs` | Admisión reproducible de la ronda G-41: cinco formas de vivienda y selector estable por parcela. Son scripts de esa ronda, no el comando general para otro GLB |
| `adopt-scenic-model.mjs` | Admite y verifica los GLB de `burnt-house` y `great-oak` de G-42: nombres de malla, triángulos, ausencia de texturas, hash y catálogo. `node tools/art/adopt-scenic-model.mjs burnt-house great-oak` |
| `rig-single-mesh.py` | **Esqueleto para un animal de una sola malla** (el zorro de Vera): escala, pone los huesos del generador de G-23 leyendo dónde están patas, cuello, cabeza y cola, pesa por regiones —lo alto del muslo y del hombro, a medias con el cuerpo, para que el costado no se rasgue al galopar— y hace `idle`, `walk` y `flee`. Sin Blender instalado vale el módulo: `pip install bpy==5.0.1` y `python3 tools/art/rig-single-mesh.py -- …`. `blender --background --python tools/art/rig-single-mesh.py -- <entrada.glb> <salida.glb> <largo-en-celdas>`; escribe al lado `<salida>.json` con la marcha |
| `bake-clips.mjs` | **Hornear los clips de una receta en un GLB ya exportado, sin Blender** (AN-1, 29 sep 2026): muestrea las pistas de la receta como el exportador (24 fps) y reescribe sólo las animaciones pedidas, con la geometría, el esqueleto y los demás clips intactos; determinista. `--check` hornea la receta publicada y la compara con el GLB para comprobar las convenciones. Es el atajo cuando sólo cambian los clips y no hay Blender; el camino canónico sigue siendo `index.ts`. `node tools/art/bake-clips.mjs <receta.json> <entrada.glb> <salida.glb> [--clips walk,carry_walk] [--check]` |
| `art/recipes/villager/plant-gait.mjs` | **El paso del aldeano con el pie plantado y la zancada larga** (AN-1a): reescribe `walk` y `carry_walk` en `villager.json` fijando dónde va el tobillo en cada fotograma, con cadera y rodilla por cinemática inversa, claves cada dos fotogramas e interpolación lineal para que Blender y `bake-clips.mjs` den lo mismo. Después: hornear, medir con `gait-report.ts --only villager --glb <candidato>`, catálogo y publicar. `node art/recipes/villager/plant-gait.mjs [--nominal]` |
| `art/recipes/deer/plant-gait.cjs` | **El paso del ciervo con el casco plantado**: reescribe el clip `walk` de su receta con cinemática inversa de dos huesos —apoyado, el casco retrocede a la velocidad del cuerpo; en el aire vuelve levantado— y declara la zancada real. Después, `npm run art -- all deer` y `publish-assets.ts --ids deer` |
| `lots/` | Cada fichero **escribe** las recetas de un lote en `art/recipes/`. Tiene su propio [README](art/lots/README.md) |
| `art/recipes/e3b-bastion-anchor-66-candidate/{generate,probe,state,gate-clearance,combined-source,combined-probe}.ts` | Fuentes y sondas CPU del bastión de acceso con retorno diagonal SO (máscara 66). `combined-source.ts --write-combined` genera la unión exclusiva bastión-portón; `combined-probe.ts` comprueba suelo, pretiles, vano, hoja y apoyo geométrico, y escribe medidas en la misma carpeta. La fuente combinada aún no está publicada. |
| `art/recipes/e3b-bastion-anchor-66-candidate/export-combined-static.py` | Exportador Blender de la fábrica estática combinada a `artifacts/graphics/E3b2-candidates/anchor66-gate24-static-review-01/`. Exige autorización de invocación exacta y `--authorize-export`; no incluye la hoja articulada, no toca `public/` ni el catálogo. |
| `art/recipes/e3b-bastion-anchor-66-candidate/{check-door-only,check-combined-scene}.ts` | Sondas CPU del GLB ancho real: separan hoja y bisagra sin moverlas y montan la fuente combinada en las coordenadas de seed91 para barrer la ruta sobre el suelo. No exportan ni publican assets y no abren GPU. |
| `art/recipes/e3b-bastion-anchor-66-candidate/check-source-coverage.ts` | Inventaría las fuentes de los 104 y 88 segmentos de las villas 23/91. Comprueba archivo, máscara mixta, dirección de bocas, cota declarada 1,02 y paso declarado ≥0,70, con cuartos de vuelta en recta/codo/diagonal. Sólo lee; no prueba GLB ni costura en escena. |
| `art/recipes/e3b-bastion-crossing-24-candidate/check-scene.ts` | Comprueba la huella XY de la candidata bastión296 en la escena reproducible de semilla91 frente a edificios, obras y troncos, excluyendo los dos muros de interfaz. No prueba altura, colisiones ni render. |
| `art/recipes/e3b-bastion-crossing-24-candidate/export-static.py` | Exportador Blender preparado para revisar sólo la fuente W+NE en `artifacts/graphics/E3b2-candidates/bastion-crossing-24-review-01/`. Exige autorización de la invocación exacta y `--authorize-export`; no toca catálogo ni demo. |

**Una receta no es documentación: es una entrada de compilación con su hash
anotado.** `index.ts` guarda el sha256 de `art/recipes/<id>/<id>.json` en
`art/catalog.json` y sólo compara la construcción nueva con la aprobada **si la
receta es la misma**; cambiarle una coma al campo `note` mueve el hash y la
comprobación de equivalencia se salta sin decir nada. Por eso la reorganización
del 19 sep 2026 **no** reescribió las rutas citadas dentro de las recetas,
aunque sí las del campo `source` de `art/catalog.json`, que no lo cubre ningún
hash. Si de verdad hay que tocar una receta, se vuelve a promover el recurso.

---

## Citadas desde el código pero ya no existen

Se borraron sin borrar sus menciones. Se dejan apuntadas para que nadie las
busque: `tools/diag-ia4-temp.ts` (desde `src/render3d/life/beasts.ts`),
`tools/graphics-parity.shots.ts` y `tools/ui-redesign.shots.ts` (desde
`docs/design.md` y `docs/ui-redesign/`), `tools/graphics/bench-life.ts`,
`tools/graphics/bundle-pilot.ts`, `tools/graphics/consequence-scenarios.ts`,
`tools/graphics/probe-models.ts`, `tools/graphics/skin-bench.ts` y
`tools/ui/chronicle-ornaments.py` (desde la skill `calcar-iconos`). Y
`tools/art/_test_build_priest.py` (desde `docs/dos-sesiones.md` y los encargos
de Blender de `historico/graphics-rounds/`): el script de prueba de la sesión de
Blender del 15 sep, con rutas fijas a otra carpeta, que aquellos encargos
pedían no subir nunca y acabó versionado; se retiró el 27 sep.
