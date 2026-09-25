# Las herramientas de The Valley — el catálogo

Se ordenó el 19 sep 2026, a petición del dueño del diseño: «que no haya
herramientas sueltas sin documentar». **Todo lo que hay en `tools/` está en una
de las seis carpetas de abajo y tiene su línea en esta tabla.** Una herramienta
nueva sin fila aquí no está terminada.

| Carpeta | Qué hay dentro |
|---|---|
| [`reports/`](#reports--medir-el-motor-sin-tocarlo) | Informes del motor. Miden y no cambian nada |
| [`shots/`](#shots--la-interfaz-fotografiada) | Recorridos de interfaz en Playwright y capturas |
| [`pwa/`](#pwa--instalable-y-sin-conexión) | Los recorridos de §13.4 y los servidores que imitan a GitHub Pages |
| [`graphics/`](#graphics--el-valle-en-3d) | Capturar, rodar, medir y mirar el valle en 3D |
| [`ui/`](#ui--la-piel-y-los-iconos) | La piel de la interfaz: pergamino, cantos, iconos, calcos |
| [`art/`](#art--de-la-receta-al-glb) | El camino de Blender al GLB publicado |

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
| `pace-report.ts` | **El ritmo del juego en horas de reloj a ×1**, que es la unidad en la que el dueño pone los objetivos. Se vuelve a pasar cada vez que se toca `REAL_MS_PER_TICK` o un umbral de §12 | `npx tsx tools/reports/pace-report.ts` |
| `agency-report.ts` | Cuánto importa lo que hace el jugador: varias maneras de jugar sobre las mismas semillas. **Es la medida que cierra cada fase de los medios** (M-0 a M-4) | `npx tsx tools/reports/agency-report.ts [--seeds 16] [--years 60]` |
| `eligibility-report.ts` | Por qué medio catálogo de encrucijadas no sale nunca, separando «nunca es elegible» de «pierde el sorteo» | `npm run eligibility` |
| `fate-report.ts` | Los sucesos del valle (R-1): cuántos al año, de qué clase y **cuánto se parecen dos valles** | `npx tsx tools/reports/fate-report.ts [semillas…] [--years 40]` |
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
| `life-report.ts` | Las cuatro cifras de la capa de vida sobre personas **y** animales: el «antes» que se escribe antes de tocar `body.ts` | `npx tsx tools/reports/life-report.ts [semillas…] [--days N]` |
| `life-report-species.ts` | Cuánto cuerpo-tiempo pasa cada especie en cada actividad y cuántos sitios usa en una jornada | `npx tsx tools/reports/life-report-species.ts` |
| `life-traits-report.ts` | Cuánto tiempo pasa cada rasgo en cada actividad, y si una persona se parece a sí misma de un día a otro | `npx tsx tools/reports/life-traits-report.ts` |
| `physics-report.ts` | Lo que cuesta la física del asedio: microsegundos por paso con N cuerpos, y lo que pesa Rapier | `npx tsx tools/reports/physics-report.ts [--bodies 200]` |
| `map-dump.ts` | El volcado ASCII del mapa: el valle con su río y sus edificios, por consola | `npm run map -- --seed 7 --years 0` |
| `reader-packet.ts` · `reader-packet-content.ts` | El paquete ciego del hito 0: tres crónicas y una pregunta para un lector de fuera. **El hito está descartado**; se conserva porque su contenido lo prueba `tests/fast/reader-packet.test.ts` | `npm run reader:packet` |

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

| Herramienta | Qué hace |
|---|---|
| `shot.mjs` | **Fotografiar el juego montado.** `--seed`, `--year`, `--run`, `--speed`, `--wait moment\|crossroad`, `--look X,Z` para centrar una celda real y `--scene-only` para guardar el PNG WebGL sin HUD/DOM. `--capture-zoom 0.1..1` amplía esa captura del hook y exige `--look` o `--scene-only`. Abre el valle en un año concreto sin falsear el reloj (U-10b) |
| `film.mjs` | **Rodar el valle**: fotogramas seguidos más la traza de cada cuerpo en cada uno (`window.__valleyLife`) |
| `film-sheet.py` | Convierte esa película en tira de contactos e informe de anomalías. **Es la única forma de medir la capa de vida como la ejecuta el navegador** |
| `observe-life.mjs` | Juego real con el reloj del navegador controlado, píxel y traza atómicos. Lo usa la skill `observe-valley-life`. Quien anda por su ruta elevada (escalera, adarve) se cuenta en `elevatedSamples`, no como choque |
| `day-report.mjs` | Resume la traza del renderer (IA-12) — la traza real, no una simulación paralela |
| `press-kit.mjs` | **El paquete de prensa**: todas las pantallas y todos sus estados en una pasada, con hoja de contactos, y el metraje del tráiler sin interfaz. `--only <grupos>`, `--offset N` |
| `bundle-game.ts` | Empaqueta el juego entero en una página, para abrirlo desde el móvil |
| `serve.mjs` | Sirve ese paquete cuando va partido (`--split`), que pide su JSON por la red |
| `capture.ts` | El motor de captura compartido |
| `capture-chronicle-sheet.mjs` | Fotografía la hoja de contactos de los grabados de la crónica. **Espera un `chronicle-contact-sheet.html` servido en la raíz**, que se monta a mano para la ronda y no vive en el árbol |
| `model-sheet.mjs` · `model-sheet.ts` | **La hoja de todos los modelos publicados**: cada GLB de `public/assets/valley3d` con la misma luz y la misma cámara, agrupados por familia y con su tamaño en celdas. `node tools/graphics/model-sheet.mjs [--out artifacts/graphics/models]`. Lo que se dibuja por código (roble, hoguera, tendederos, fuego) no sale: no es un GLB |
| `contact-sheet.py` | Monta la hoja de contactos de una ronda gráfica, para juzgarla de un vistazo |
| `villager-sheet.py` | La hoja de los dieciséis aldeanos (G-19), a la escala real de la cámara: veinte píxeles |
| `animals-preview.ts` · `animals-preview.mjs` | El banco de fauna (G-23): GLB publicado y controlador del juego con recorrido conocido |
| `skin-compare.py` | Pone el recorte del prototipo al lado de la captura real. **Es el criterio de hecho de cada ronda de piel** |
| `gesture-sheet.mjs` · `gesture-sheet.ts` | Hoja de contactos de un gesto fabricado sobre el GLB publicado, sin partida: `node tools/graphics/gesture-sheet.mjs chop [--model villager-mason] [--frames 12]`. Da también la posición de la mano y de la cabeza de la herramienta |
| `animation-audit.ts` | Audita los clips **en el navegador**, sobre el GLB exportado, no en Blender (D.4, D.6) |
| `bench.ts` · `bench.html` · `bench-scenes.ts` · `benchmark.ts` | El banco de rendimiento de G-09 (D.9) y P-1a. `npx tsx tools/graphics/benchmark.ts --suite p1 --repeats 3 --seconds 10 --width 390 --height 844` mide tres muestras de día/noche del preset real 11/año visible 21, con fase inyectada sólo en `GraphicsFrame` y vida activa a ×1; informa el cielo real derivado, sin falsearlo. Conserva cada JSON bajo `artifacts/graphics/P-1a/`. Sus dos cargas son de instancia dentro de la misma sesión, no caché fría/caliente de navegador. No mide INP/UI; la comparación lluvia controlada requiere una fase posterior sobre la app real. |
| `bench-app.ts` | P-1a sobre **la aplicación real**: abre el menú, Desarrollo y el preset village (semilla 11/año visible 21), y conserva carga, cadencia RAF, Long Tasks, Event Timing disponible y una latencia sintética wheel→RAF —nunca llamada INP— bajo `artifacts/graphics/P-1a-app/<marca>/run.json`, sin pisar corridas. Edge si está instalado; Chromium queda marcado como respaldo. `--condition all` compara día despejado, noche despejada y noche lluviosa mediante controles de presentación sólo locales; `--condition natural` conserva la ruta anterior. Corrida fría P-1a.1: `npx tsx tools/graphics/bench-app.ts --condition all --repeats 3 --cache cold --seconds 10 --settle-seconds 5`. P-1a.2: `--profile-load true` conserva un perfil CPU desde antes del clic del preset hasta 3D utilizable; después registra seis clics de vista despejada por `interactionId`. `--headed true` abre Edge visible. `--cpu-profile true` perfila la cadencia con sobrecoste y no debe combinarse con su comparación sin perfil. Caché caliente y fría se ejecutan por separado. El INP del navegador sigue sin medirse. |
| `doctor.ts` | Diagnóstico del entorno gráfico antes de culpar al código |
| `viewer.ts` · `viewer.html` | El visor suelto de un GLB |
| `publish-assets.ts` | Admite un lote explícito aprobado con `--ids bow,spear`; verifica hash, bytes y procedencia antes de copiar, conserva todos los recursos ya publicados y rechaza sobrescribir bytes distintos |
| `g20-check.mjs` | Comprueba la hoja de evidencia de G-20: cero imágenes rotas, cero errores de página |

P-1b.2: `bench-app.ts --stages true` activa sólo en Vite local las marcas
`valley3d:` de importación, creación y primer fotograma. Las guarda como
`stageMarks` en cada réplica del `run.json`. Son tiempos del hilo del navegador,
no tiempo GPU. Ejecutar caché fría y caliente por separado, con autorización
explícita para abrir la app y medir el equipo. `--capture true` guarda una
captura de la primera réplica de cada condición después del asentamiento.
La comparación de partición del primer fotograma está cerrada en el
[informe P-1b.2](../docs/historico/graphics-rounds/P-1b2-primer-fotograma.md);
la partición se retiró.

`npm run shot`, `npm run bundle`, `npm run serve:shots`, `npx tsx tools/graphics/publish-assets.ts --ids bow,spear`.

## `ui/` — la piel y los iconos

El estándar visual está en la skill `piel-del-valle`; el calco de dibujos, en
`calcar-iconos`. Éstas son sus herramientas.

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
`tools/ui/chronicle-ornaments.py` (desde la skill `calcar-iconos`).
