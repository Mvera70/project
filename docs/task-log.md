# Cuaderno de tareas — el rework

**Este fichero es lo primero que hay que leer, y lo último que hay que tocar
antes de cerrar una ronda.** Existe porque el dueño del diseño dijo, el 16 sep
2026: «te has perdido… necesitas un documento en el que te vaya guiando
siempre». Tenía razón: había un informe por ronda (`docs/life-rounds/`,
`docs/ui-redesign/rounds/`) pero **ningún sitio que dijera dónde estoy**, así
que cada vez que se retomaba la sesión había que reconstruirlo leyendo commits.

**La regla, y es una sola:** ninguna ronda se cierra sin actualizar aquí el
tablero (§2), las cifras (§3) y lo abierto (§4). Si sólo se puede hacer una
cosa, es ésta: un informe de ronda sin esta actualización es un informe que
nadie va a encontrar.

---

## 1. Dónde estamos ahora mismo

| Qué | Valor |
|---|---|
| Rama | `rework/parada-a-media` |
| HEAD | ver `git log -1`; la última ronda mía es el nivelado de las estancias y el plazo vencido |
| `main` | **al día** — se empuja al cerrar cada tramo — se empuja al cerrar cada tramo; la rama también está en el remoto |
| Fusionado aquí | `docs/visual-reference` (`f842a8d`), el cuaderno de referencia visual del dueño |
| Sin seguimiento, a propósito | `docs/life-ai-implementation-prompt.md` es del dueño; se deja para que lo commitee él |
| Puerta usada en cada ronda | `npm run typecheck`, `npm run lint`, y **sólo los ficheros tocados** |
| **En vuelo ahora** | **la tanda de piel** (`ui-redesign/piel/plan-piel.md`). **UI-V0 hecha** (`4da029c`: el kit — 17 colores muestreados, Cinzel y EB Garamond empaquetadas, 25 primitivas, muestrario, comparador y medidor de contraste). En vuelo, tres agentes Sonnet en worktrees: **UI-V1** (`hud.ts`), **UI-V2** (`shell.ts`/`shell.css`), **UI-V3** (`screens/chronicle.ts` + `chronicle-art.ts`). Después UI-V4 (ficha), UI-V5 (encrucijada) y UI-V6 (validación). **El dueño trabaja en paralelo en los modelos 3D: ningún agente mío entra en `src/render3d/` ni en `art/`** |
| Blender · qué viene y su encaje | El agente de Codex está haciendo **el aldeano base, el herrero, el cura y un granjero**, y el dueño confirmó el 16 sep que **se meterán en el juego sustituyendo a los actuales**. Los tres primeros encajan uno a uno. El granjero es **un tipo nuevo**, y el dueño lo aclaró: «esto futuro puede implementarse en nuevos aldeanos, no significa que el granjero vaya a ser el aldeano base». O sea que **el repertorio de aldeanos crece** y no hay que encajarlo en los siete oficios que ya existen. Y hay una vía que lo hace fácil: **el modelo no tiene que elegirse por el oficio**. Hoy `VILLAGER_BY_ROLE` (`renderer.ts`) mapea oficio → malla, pero el render ya sabe qué hace cada persona (`Actor.activity`, y la oferta que está consumiendo), así que un granjero puede ser **quien trabaja el campo** sin que el motor invente un oficio nuevo ni se toque `src/engine/`. Eso deja el base para lo que es y admite más tipos después. **Se decide cuando estén las mallas.** |
| Fuera de esta sesión | Un agente de Codex está **diseñando los aldeanos nuevos en Blender** (dicho por el dueño el 16 sep). Eso toca el aparejo del aldeano y `src/render3d/world/cast.ts`, que da talla y ropa por persona: **ningún agente mío entra ahí** hasta que él lo diga. Contexto en `docs/respuesta-sesion-blender.md`. |
| Lo que acabo de cerrar | **G-18 entregado y verificado** (`9cc97af`: los doce aldeanos de Blender, sin tocar `src/`; pendiente de aprobación estética del dueño). **IA-8**: el descarte de la plaza que falló, el plazo propio del viaje (`arriveBy`) y el labrador a su puesto (fuera del campo 6,5 %, parados 0,08 %, giros 0,39 %). Antes: **Demo v16** con los cuatro aldeanos de G-17 en el valle (`artifacts/graphics/G-18/demo/`, sin seguimiento por `.gitignore`; semilla 11, año 20, ocho fotogramas). **IA-7**: los labradores dentro de su campo (96,1 % fuera → 13,6 %) y el suelo de la convocatoria aplicado de verdad. El encargo G-18 de los doce aldeanos que faltan, en `main` |

## 1b. La fase en curso: C-1 · Cierre de la tanda de IA

**Por qué esta fase y no otra.** El dueño lo dijo el 16 sep: «nos estamos
dejando cosas atrás». Y era verdad: nueve commits sin empujar a `main`, una
fase anunciada como en vuelo que nunca se lanzó, una demo prometida dos veces y
no publicada, nueve jornadas rojas desde hace cuatro fases, y un fallo del
runner de pruebas sin diagnosticar. **Nada nuevo entra hasta que esto se
cierre.** Después, y sólo después, empieza el rediseño de interfaz con UI-R1.

Cada punto tiene dueño, puerta y criterio de hecho. El orden es el de las
dependencias, no el de lo que apetece.

| # | Qué | Dueño | Depende de | Hecho cuando |
|---|---|---|---|---|
| 1 | ~~Aterrizar IA-5~~ **HECHO**. Y reclamó bien: las cuatro rojas de `graphics-effects.test.ts` que le mandé **no eran suyas**, lo comprobó revirtiendo sus ficheros y lo verifiqué yo con `git stash`. Pasan a ser el punto 8 | yo | — | **hecho** |
| 2 | ~~V-15b · enganchar el renderer~~ **HECHO**. Y al hacerlo apareció un fallo que habría empeorado el juego: con un solo respaldo al base, **un jefe anciano perdía su malla de jefe**. Ahora es una **cadena** —anciano, luego jefe, luego base— y hay una prueba que exige que **con las mallas de hoy nadie cambie de figura**, barriendo las 294 combinaciones contra lo que daba la regla vieja | yo | — | **hecho** |
| 3 | ~~Las jornadas rojas~~ **HECHO**: eran once, quedan **128 de 130** en 284 s. Siete eran deriva del fixture (la pareja se rompe desde v3.78: `foundTwenty`, y en `life-scenes` seis semillas fijas de las que sólo una seguía siendo aldea). Dos eran decisiones mías con la prueba vieja: el vado sin hora punta queda como excepción declarada, y la escena persona-animal se mide como **existencia agregada** sobre 5 jornadas × 6 semillas, porque la consolidación de IA-4 la hizo rara de verdad (dos semillas en cero). Un `it.fails` nuevo: la pelota en la semilla 11, la misma causa de siempre (`worth()` no sabe que jugar es barato) en otra semilla. **Dos rojas a propósito**: la de los catorce avisos (decisión del dueño, punto 10) y la de la palanca del bosque, que es el punto 0 de abajo | Sonnet | — | **hecho** |
| 4 | ~~El trabajador de vitest que se cae~~ **HECHO, y era bueno**: no se reproduce. Dos pasadas completas de `tests/fast` en paralelo, sin flags, terminaron limpias. Se fue al mover las cuatro partidas largas a las jornadas. **Y de paso destapó la causa probable de las caídas pasadas:** no era ninguna prueba, era **contención por runs huérfanos** —encontró 29 procesos de una hora de antigüedad ocupando los 28 núcleos—. Si vuelve a aparecer, mirar los procesos antes de tocar un solo fichero de prueba | Sonnet | — | **hecho** |
| 5 | ~~La demo~~ **HECHA**: publicada como **versión 15** en el artefacto de siempre, y secuencia de ocho fotogramas de la semilla 11 en el año 19 enviada al dueño (`artifacts/graphics/C-1/demo/`). **Mismo valle y misma semana que la captura de antes del equilibrado**, así que es un antes/después: 9 personas y ánimo 9 entonces, **15 y ánimo 55** ahora. Se ve la riña con su burbuja propia, terminando y soltándose cinco segundos después. Lo que sigue mal y se ve: el aviso pisando la pista de las órdenes (punto 10). Un 404 único en cada captura, el mismo desde la primera del proyecto, sin identificar porque el servidor no registra rutas; no es de esta tanda | yo | — | **hecho** |
| 6 | **`main` al día** tras cada uno de los puntos anteriores, no al final | yo | cada punto | `git log -1 main` es el último tramo verde |
| 8 | ~~Las cuatro rojas de `graphics-effects.test.ts`~~ **HECHAS**, y con un solo cambio: el fixture fundaba con la pareja y esas pruebas miden lo que el valle **enseña** —humo de fragua, luz de capilla, nivel del granero, vacas y peces—, así que necesitan una aldea que los tenga. Misma causa que las 42 de IA-0. Incluso la de «una señal dentro de un edificio», que parecía un fallo de colocación, era deriva del fixture | yo | — | **hecho** |
| 7 | ~~El plazo vencido de las personas~~ **aplazado con motivo**: no cabe en C-1 porque necesita la pieza que no existe —descartar una plaza que ya falló— y sin ella el arreglo **empeora** la cifra (0,06 → 0,20 %, medido y retirado en `IA-6.md` §4.3). Sigue como punto 1 de la lista abierta | yo | — | aplazado |

**Lo que esta fase deja fuera a propósito**, para que no se cuele: R-3 (los diez
rasgos), R-5b y R-6 (los datos que le faltan al motor), G-18 (Blender, que el
dueño quiere para lo último), el nivelado fino de duraciones con el cuaderno,
y **cualquier fase nueva de IA**.

**La regla de esta fase, y es la que faltaba:** un punto no está hecho hasta
que su fila de arriba dice «hecho», su commit está en `main` y este cuaderno lo
refleja. Anunciar algo como hecho o en vuelo sin que lo esté es lo que nos ha
traído aquí.

## 2. El tablero

**G-23 · animales:** encargo de rehacer las seis especies y sus animaciones.
Vaca subida en `df0ac66`. Cerdo terminado y revisado en movimiento; preparado
para entrega individual. Siguen gallina, lobo, cuervo y pez.
Cerdo subido en `aec6c38`. Gallina terminada y revisada; 45 pruebas, typecheck
y lint verdes, entrega individual preparada. Siguen lobo, cuervo y pez.
Vaca terminada, articulada y conectada al render; 42 pruebas, typecheck y lint
verdes. Banco de marcha y reposo revisado. Entrega individual preparada para
subida; siguen cerdo, gallina, lobo, cuervo y pez. Informe [G-23](graphics-rounds/G-23.md).

**Siguiente encargo de Blender · aldea:** alcance preparado para viviendas,
molino, iglesia/capilla, herrería, pozo, granero, campos, carros y adornos.
Inventario y tandas en [encargo-blender-aldea](graphics-rounds/encargo-blender-aldea.md).
**G-21: casas de paja, piedra y molino terminados**, con entrega individual por modelo.
Paja subida en `dcb4cf1` y piedra en `4d2893e`; molino validado con 87 pruebas,
typecheck, lint y captura del juego. Informe en [G-21](graphics-rounds/G-21.md).
Molino subido en `1889d40`. Herrería subida en `8d03f5c`;
validación técnica verde. Su revisión frontal en juego se cierra con la captura
de la capilla (semilla 2, año 60); detalles y evidencias en el informe G-21.
Granero terminado y revisado dentro del juego; conserva el montón variable de
reservas. Typecheck, lint y 87 pruebas verdes; entrega individual G-21.
Granero subido en `a90c54e`. Capilla terminada, validada y revisada dentro del
juego; conserva las velas dinámicas. Entrega individual G-21.
Capilla subida en `0561f34`. Iglesia terminada y revisada en el juego, con
campanario abierto y puerta visible; validación técnica verde. Sigue el pozo.
Iglesia subida en `1dd19df`. Pozo terminado, validado y revisado en juego;
conserva su celda y añade brocal hueco, torno y cubo. Sigue el campo cultivado.
Pozo subido en `6f8876f`. Campo cultivado terminado, validado y revisado en
verano dentro del juego; conserva la alternancia estacional. Sigue `field-cut`.
**G-22 · cultivos:** el dueño rechaza las espigas de G-21 por parecer flechas.
Trigo rehecho con granos laterales y tallos verdes, validado y revisado en juego.
Siguen coles, cultivo de hojas y variedades visuales por parcela; informe [G-22](graphics-rounds/G-22.md).
Trigo G-22 subido en `1b834c7`. Coles terminadas y selección estable por parcela
conectada en el render; 88 pruebas verdes y captura real revisada. Siguen puerros.
Coles subidas en `0edca57`. Puerros terminados y conectados: trigo, coles y
puerros aparecen en parcelas distintas, con selección estable y cosecha intacta.
88 pruebas verdes y captura conjunta revisada; pendiente de valoración estética.
Puerros subidos en `d096f83`. Campo segado terminado y revisado después de la
cosecha; 88 pruebas verdes. Campo segado subido en `4aa61c5`.
Carro G-21 terminado: caja de tablas, ruedas abiertas con radios y varales;
94 pruebas verdes, typecheck y lint. Capturas reales revisadas, entrega
individual subida en `5e6b070`. Almiar G-21 terminado y revisado en juego:
capas de heno, haces y estaca central; 94 pruebas, typecheck y lint verdes.
Almiar subido en `f0e933f`. Pila de leña G-21 terminada y revisada en juego;
94 pruebas, typecheck y lint verdes. Entrega individual validada para commit
y subida. Leña subida en `15b7f5b`; ajuste posterior solicitado por el dueño:
10 % más pequeña, reconstruida y revisada en juego, subida en `5ccfe5b`.
Cobertizo (`shed`) G-21 terminado y validado en Blender y visor GLB; aún no
seleccionado por el juego. 94 pruebas y typecheck verdes; lint global falla
en `compare.mjs:55` ajeno (variable `row` sin uso). Entrega lista para subir.
Cobertizo subido en `f23ffa5`. Avisado el dueño antes de los muros;
autoriza resolver también las uniones en código. Defensas G-21 terminadas:
empalizada y piedra, conexiones cardinales, esquinas, T y cruces mixtos.
86 pruebas, typecheck y lint verdes; captura del juego y banco de uniones
revisados. Defensas subidas en `8a1011e`, `a2e9c8b` y `24b94b1`.
Encargo de completar los cuatro restantes sin parar: torre terminada y
validada, lista para subida individual; siguen cementerio y ambas ruinas.
Torre subida en `128f357`. Cementerio terminado, revisado en el renderer y
en partida (semilla 43, año 60), listo para subir; siguen las dos ruinas.
Cementerio subido en `fc22492`. Ruina de madera terminada y revisada en
partida y banco. El render ajusta ambas ruinas a la parcela perdida; 90
pruebas, typecheck y lint verdes. Lista para subir; queda la ruina de piedra.
Ruina de madera subida en `e61c977`. Ruina de piedra terminada y revisada
en Blender y renderer real con estado de prueba. Los cuatro encargados
están terminados; entrega final validada para commit y subida.

**G-18 · entrega de Blender (16 sep):** doce recetas y GLB terminados y
verificados; subida solicitada por el dueño. Véase [G-18](graphics-rounds/G-18.md).

**U-10b · el menú abre el valle en el año que se le pida (16 sep, `21b11e9`).**
Lo pidió el dueño porque probar le costaba demasiado: «no tengo manera de
elegir el año o solamente la semilla». Botón «Dev» discreto en el menú —la
preferencia se recuerda— y campo «Open at year»; el valle se juega con la
política de referencia (`openAtYear`, `debug.ts`), no con un bucle de `tick`.
El año es el que lee la cabecera: el 1 es fundar. Medido: 20 años 296 ms, 60
años 1,3 s; la semilla 11 da 27 personas al año 20 y 45 al 40. **Y el
capturador lo usa** (`shot.mjs --year N`): 19 años pasan de 20 s de reloj
falso a 300 ms, y por la trayectoria de referencia, así que las capturas de
aquí en adelante son comparables con las cifras del proyecto. **Demo v18.**

**Demo v17 (16 sep, tarde):** los dieciséis aldeanos de Blender (G-17 y
G-18) en el valle e IA-8, 50 recursos y ninguno pendiente; fotogramas en
`artifacts/graphics/G-18/demo-doce/` (sin seguimiento). Sobre `4145cfc`.

**Demo v16 (16 sep):** publicada en el artefacto de siempre con los cuatro
aldeanos de G-17. Empaquetada desde un **worktree limpio en HEAD** (`git
worktree add`, `node_modules` enlazado) porque el agente de UI-R1 tiene
`app.ts` a medias y no compila. `shot.mjs` gana `--answer N`: la primera
encrucijada planteada se queda abierta para siempre y tapaba el valle en toda
captura con `--advance`; ahora la contesta como el dedo. Ojo: el empaquetado
completo **vacía** el directorio y borra la forma partida; `--split` va al
final.

**G-17 · Blender, entrega terminada (16 sep):** `villager`, `villager-smith`,
`villager-priest` y `villager-farmer`, recetas canónicas, catálogo y cuatro GLB
publicados. Informe: [G-17](graphics-rounds/G-17.md); prompt de integración:
[G-17-handoff](graphics-rounds/G-17-handoff.md). No se ha tocado `src/`.

Orden fijado por el dueño: auditoría, movimiento, interacciones, hábitos,
animales, fauna, escenas históricas, **y después interfaz**.

### La IA de la vida (`docs/life-ai-implementation-prompt.md`)

| Fase | Estado | Commit | Informe |
|---|---|---|---|
| IA-0 · auditoría y contratos | **hecha** | `0a45e0c` | `life-rounds/IA-0.md` |
| IA-1 · movimiento y destinos | **hecha** | `1509121` | `life-rounds/IA-1.md` |
| IA-2 · compromisos e interacciones | **hecha** | `17e9022` | `life-rounds/IA-2.md` |
| IA-3 · aldeanos con hábitos | **hecha** | `37c7da6` | `life-rounds/IA-3.md` |
| IA-4 · animales con conducta propia | **hecha**, con dos rondas de arreglo encima | `d7cac67`, `528a764`, `7822454` | `life-rounds/IA-4.md` |
| IA-5 · fauna silvestre | **hecha** — el lobo migra y sólo sale la semana del suceso; el cuervo y el pez se quedan, con el motivo escrito | (este commit) | `life-rounds/IA-5.md` |
| IA-6 · historia visible | **hecha** — la riña con sus dos `id`; funeral e incendio quedan para R-5 por falta de dato | `e20eeb5` y anteriores | `life-rounds/IA-6.md` |
| IA-9 · rodar el valle, y el que va a un sitio sin ruta | **hecha** — la herramienta de película (`film.mjs` + el enganche `__valleyLife` + `film-sheet.py`) y el arreglo que destapó: `decide()` devolvía la intención muerta tal cual. Clavados 3 → 0; queda el 15 % de gente con ruta que no anda, que es dirección y va como **IA-10** | (este commit) | `life-rounds/IA-9.md` |
| IA-8 · la plaza que falló se descarta, el viaje tiene su plazo | **hecha** — cierra el punto 1 de lo abierto y el 0b de IA-7; el devoto queda frágil (§4) | (este commit) | `life-rounds/IA-8.md` |
| IA-7 · los labradores, dentro de su campo | **hecha** — lo vio el dueño en la demo v15; de rebote, el suelo de V-11 se multiplicaba después y no era un suelo | (este commit) | `life-rounds/IA-7.md` |

### El rediseño de interfaz (`docs/ui-redesign/implementation-prompt.md`)

| Ronda | Estado | Commit |
|---|---|---|
| UI-R0 · auditoría y cierre de especificación | **hecha** | `f9f2df4` |
| UI-R1 · carcasa, tokens y navegación | **hecha** — carcasa, tokens, un solo dueño de la navegación, aviso y pista comparten ranura y nunca se pisan (era el defecto visible de la demo v15); las pantallas **no** se dan por migradas, a propósito | (este commit) · `ui-redesign/rounds/UI-R1.md` |
| UI-R2 · cabecera, actividad, órdenes, velocidad | **hecha** — tres fallos de gestos reales arreglados (toques fantasma al valle, ranura de mensaje tapando el botón de velocidad, `pointer-events` sin recuperar) | `c278e12` |
| UI-R3 · crónica | **hecha** — migrada a `shell.content`, no roba el desplazamiento del lector | `ee2279d` |
| UI-R4 · personas y fichas | **hecha** — un fallecido/emigrado deja de envejecer en su propia ficha; seguimiento honesto ("marca, no promete centrar") | `00f8ed7` |
| UI-R5 · integración, decisiones y salida | **hecha** — `contentRouteFor` unificado, enlace crónica→ficha, la encrucijada gana a una bandeja abierta (fallo real encontrado) | `af8d7d0` |
| **UI-V0 · el kit de la piel** | **hecha** — `4da029c`, informe en `ui-redesign/piel/UI-V0.md`. El muestrario cazó dos fallos antes de costar seis rondas (la textura oscurecía a la mitad; el rasgado se comía el texto) | `4da029c` |
| **UI-V1 a UI-V6 · las pantallas** | **en vuelo** (V1, V2 y V3 en paralelo) — el diagnóstico y el plan están en `ui-redesign/piel/plan-piel.md` §1 (por qué salió la estructura y no el aspecto: el prompt prohibía copiar, los tokens se sembraron del juego viejo, no había criterio visual de hecho ni activos ni fuentes empaquetadas) | — |
| UI-R6 · validación | **hecha** — 1215/1216 en la suite rápida, 128/130 en jornadas (sin novedad), manifiesto de instalación verde; tres hallazgos documentados sin perseguir más (offline tras redespliegue, picking en aldea de 83 edificios, factura de opinión con el reequilibrado del caos) | `ui-redesign/rounds/UI-R6.md` |

### Las fases nuevas, salidas de la lista de aldeanos (16 sep 2026)

La lista completa, escrita para quien modela, está en
`docs/graphics-rounds/aldeanos-por-hacer.md`. De analizarla salen cuatro fases,
y **el orden importa**: la primera es de arte, la segunda es la que hace que el
arte sirva sin tocar el motor, y las dos últimas necesitan que el motor tenga un
dato que hoy no tiene.

| Fase | Qué | Depende de | Estado |
|---|---|---|---|
| **G-19 · la hoja de contactos** | Las dieciséis figuras a tamaño natural, a 20 px y a 6 px, con quién las lleva y qué las distingue, para que la aprobación estética cueste un minuto | De G-17 y G-18 | **hecha** (`artifacts/graphics/G-19/aldeanos.html`, `graphics-rounds/G-19.md`). **Su veredicto quedó en duda el mismo día, y con razón:** decía que ocho de dieciséis son la misma mancha marrón, pero lo midió sobre un render de **estudio, fondo beige, sin movimiento y a píxeles de CSS**. El dueño lo miró en el juego y dijo que los modelos le gustan y que «no se ve tan mal»; el recorte del juego real a 1:1 (`artifacts/graphics/G-19/real-1a1.png`) le da la razón. Lo que sí sobrevive del análisis: las parejas que compiten por familia de color (dos azules, dos sombreros, tres verdes) son difíciles de distinguir **entre sí**. Aviso escrito en el propio informe |
| **G-20 · la medida sobre el juego, no sobre el taller** | Redirigida el mismo día: en vez de un plan de repintado, **medir la legibilidad en el juego empaquetado** —cuántos píxeles reales mide una persona a la distancia de apertura y acercada, recortes a 1:1 sobre prado— y corregir o confirmar el veredicto de G-19. Sólo si alguna figura falla **ahí**, se propone su arreglo mínimo | De G-19 | **en vuelo** (Sonnet) |
| **G-18 · los aldeanos que faltan** | Las mallas: cinco oficios por rehacer en el estilo nuevo, y los tipos nuevos —niño, anciano, forastero, leñador, albañil, pastor, pescador— | De nada. Es la sesión de Blender | **entregado** (`9cc97af`, doce ids, verificado: huesos y clips del base al byte, 54 huellas, G-17 intacto). Falta la **aprobación estética del dueño** y la demo con los doce. Buhonero, novios, doliente y vigía: fuera hasta R-5b/R-6 |
| **V-15 · el modelo se elige por lo que se hace** | La regla está escrita y probada en `src/render3d/world/models.ts`: manda la edad, luego el oficio, luego lo que se está haciendo. `Actor` gana `occupation` y la capa de vida la calcula del sitio y la oferta. Nueve pruebas en `tests/fast/life-models.test.ts` | — | **hecha, menos el último enganche** |
| ~~V-15b~~ **hecha** | `renderer.ts` sigue teniendo su propio `VILLAGER_BY_ROLE` y elige por oficio. Hay que **borrarlo de ahí**, llamar a `modelFor(actor)` y **caer al aldeano base si el recurso no existe**, que es lo que permite que las mallas se enciendan una a una sin tocar código. No se hizo porque IA-5 tenía `renderer.ts` abierto | De que IA-5 suelte `renderer.ts` | **lo siguiente** |
| **R-5b · quién acude a un funeral y a un incendio** | El motor sabe quién murió y qué edificio se quemó, pero **no sabe quién asiste**, y por eso IA-6 se negó a inventar espectadores. Falta el dato en el estado: un puñado de `id` de acompañantes en el suceso, como la riña ya trae los suyos en `who` | Cambio del motor (§7.10) | pendiente |
| **R-6 · la vigilancia** | Existen la torre y la empalizada como edificios y una bandera de amenaza, pero **nadie vigila**: no hay ocupación que ponga a una persona ahí. Sin eso, un vigía modelado se quedaría sin usar | Cambio del motor y una oferta nueva en `life/offers.ts` | pendiente |

**Por qué V-15 antes que más mallas:** sin ella, cada tipo nuevo que no sea un
oficio del motor no tiene forma de entrar en el juego, y el arte se acumula sin
verse. Es una fase pequeña —cambiar de qué se lee la malla— y desbloquea de una
vez el niño, el anciano, el granjero, el leñador, el albañil y el pastor.

### El rework de fondo (`docs/rework.md`)

| Fase | Estado |
|---|---|
| R-1 · los sucesos del valle | **hecha** (v3.75), y el caos de §2.6 aplicado (v3.76) |
| R-2 · gente distinta | **cubierta en la práctica por IA-3**; la riña con `id` la cubre IA-6 |
| R-3 · diez rasgos de valle | pendiente. **El cuaderno del dueño ya trae las diez plantas** (`visual-reference` §4) |
| R-4 · encrucijadas | no es trabajo: se quedan y no se afinan |
| R-5 · más vida en pantalla | se cubre con IA-6 y con el nivelado de §4 |

## 3. Las cifras que mandan

G-23: vaca de 3476 triángulos, cuatro materiales; clips idle/walk y controlador
por distancia. 42 pruebas pertinentes verdes. Cuatro llamadas por vaca visible;
sin nueva medida de FPS móvil.
Cerdo: 2808 triángulos, cuatro materiales y 18 huesos; 43 pruebas pertinentes.
Gallina: 874 triángulos, cuatro materiales y 12 huesos; 45 pruebas. Banco de
40 cerdos: CPU/envío mediana 1,6 ms, p95 3,8 ms; no es una medida de FPS móvil.

**Inventario del nuevo encargo de aldea:** 21 ids existentes en cuatro tandas;
las variantes de vivienda y adornos nuevos se definirán con su integración.
Casa de paja: 656 triángulos y cinco materiales/mallas; piedra: 752 y cuatro.
Molino: 966 triángulos y cuatro materiales/mallas; herrería: 894 y cuatro.
Granero: 1 220 triángulos, cuatro materiales/mallas y GLB de 89 972 bytes.
Capilla: 776 triángulos, cuatro materiales/mallas y GLB de 57 672 bytes.
Iglesia: 1 230 triángulos, cuatro materiales/mallas y GLB de 89 412 bytes.
Pozo: 1 108 triángulos, cuatro materiales/mallas y GLB de 78 572 bytes.
Campo cultivado: 2 056 triángulos, dos materiales/mallas y GLB de 160 704 bytes.
G-22 sustituye ese campo por trigo de 4 732 triángulos y tres materiales/mallas.
Coles G-22: 2 292 triángulos y tres materiales/mallas.
Puerros G-22: 2 212 triángulos y tres materiales/mallas; 52 recursos empaquetados.
Campo segado G-22: 232 triángulos, un material/malla y GLB de 17 856 bytes.
Carro G-21: 888 triángulos, tres materiales/mallas y GLB de 64 556 bytes;
94 pruebas verdes, incluidas las seis de colocación de adornos.
Almiar G-21: 958 triángulos, tres materiales/mallas; altura 0,666667 celdas
conservada y 94 pruebas verdes.
Pila de leña G-21: 1 544 triángulos, dos materiales/mallas, 97 652 bytes;
94 pruebas verdes y captura real revisada.
Leña: geometría reducida un 10 %, conservando la escala de exportación 1/3.
Cobertizo G-21: 844 triángulos, tres materiales/mallas y 62 564 bytes;
parcela 1×1, altura máxima 0,912712 celdas.
Defensas G-21: empalizada 318 triángulos / 23 808 bytes; piedra 276 /
21 636 bytes; dos materiales cada recurso. 16 máscaras cardinales cubiertas
por pruebas. Las esquinas añaden geometría recortada propia del render.
Torre G-21: 1 638 triángulos, cuatro materiales, 119 384 bytes; 86 pruebas,
typecheck y lint verdes. Banco con renderer real y estado de prueba revisado.
Cementerio G-21: 936 triángulos, tres materiales, 68 260 bytes; 86 pruebas,
typecheck y lint verdes, captura natural bajo lluvia y banco de integración.
Ruina de madera G-21: 792 triángulos, tres materiales, 57 084 bytes;
90 pruebas, incluidas cuatro huellas de parcela sin deformar la altura.
Ruina de piedra G-21: 956 triángulos, cuatro materiales, 70 436 bytes.
Cierre de los cuatro: 90 pruebas, typecheck/lint verdes y huellas de todos
los artefactos y archivos publicados verificadas.
87 pruebas verdes para cada entrega; revisadas dentro del juego real.

**G-18:** doce modelos, 0,65 celdas, cuatro materiales/mallas, 948–1092
triángulos. 29 pruebas y doce auditorías verdes; las huellas de G-17 se conservan.

**G-17:** cuatro modelos de 0,65 celdas; 1056 / 1116 / 1012 / 960 triángulos
(base / herrero / cura / granjero), cuatro materiales y cuatro mallas cada uno.
Typecheck y lint verdes; 16/16 pruebas del rig; cuatro construcciones y cuatro
auditorías de animación verdes. Todos reproducen los clips del base.

**Movimiento** (`npx tsx tools/life-report.ts 7 23 97 --days 2`, 26 880
cuerpo-segundos). La primera columna es el estado antes de tocar nada.

| | línea de partida | ahora (`7822454`) |
|---|---|---|
| centro en celda cerrada | 0 | **0** |
| círculo en celda cerrada | 1,31 % | **0,09 %** |
| giros > π/2 estando parado | 4,75 % | **0,39 %** |
| parados con impulso ≥ 0,9 | 0,20 % | **0,00 %** |

Los giros subieron de 0,21 % a 0,39 % en `7822454` y es efecto conocido: un
animal que ahora se queda quieto en su sitio gira ahí. **Vigilar.**

**El día de cada especie** (`npx tsx tools/life-report-species.ts 7 23 --days 2`):

| | andando | quieta sin nada | lo suyo |
|---|---|---|---|
| gallina | 35,7 % | 51,3 % | **13,0 %** |
| cerdo | 28,5 % | 30,6 % | **40,9 %** |
| vaca | 82,5 % | 0,7 % | **16,9 %** |

De partida eran: gallina 88,7 % andando y 8,9 % lo suyo; cerdo 65 % y 34,6 %;
**vaca 95 % andando y 2,8 % pastando**. La vaca sigue siendo la que más anda —es
el cuerpo más lento y el de parches más anchos— y el siguiente nivel está en las
duraciones y distancias del cuaderno del dueño.

**Interacciones** (IA-2): 1 144 empiezan, 1 122 terminan, **0 colgadas**.
**Historia visible** (IA-6): 80–91 riñas reales por semilla en 40 años, de ellas
6–20 montadas, terminadas y liberadas el mismo día del suceso; **0 canceladas,
0 colgadas** en las ~514 revisadas.
**Sucesos del valle** (R-1): en una aldea hecha, unos 12 al año; en un caserío,
menos, porque la cadencia va con la población desde v3.78. **3 de 12 valles se
rompen a los cuarenta años** —antes eran 8— y los nueve que aguantan llegan con
entre 20 y 57 habitantes, antes 22, 9, 4 y 1.

## 4. Lo abierto, por orden de lo que más duele

G-23: completar lobo, cuervo y pez con entrega individual.
La articulación requiere esqueletos propios; medir coste conjunto al cerrar.

**G-22:** trigo, coles y puerros terminados, conectados y revisados en juego.
Campo segado también terminado y revisado tras la cosecha. Carro G-21 terminado
y revisado en juego y subido. Almiar (`haystack`) terminado y revisado;
almiar subido. Pila de leña (`log-pile`) terminada y revisada en juego;
cobertizo (`shed`) terminado como recurso de catálogo; falta selección runtime.
Defensas modeladas y conectadas por petición del dueño; subir la entrega
antes de seguir con la torre de vigilancia. El aviso previo ya se cumplió.
Torre terminada; continuar con cementerio, ruina de madera y ruina de piedra,
con commit y subida individual de cada modelo.
Cementerio terminado; tras subirlo quedan las ruinas de madera y piedra.
Ruina de madera terminada; publicar antes de continuar con la piedra.
Los cuatro modelos restantes están terminados; entrega final validada para
commit y subida. Sigue pendiente integrar `shed`; variantes de casas y adornos nuevos
son ampliaciones aún no realizadas, no parte de estos cuatro.
**Avisar al dueño al llegar a los muros, antes de empezar esa parte.**

**Rediseño de aldea:** paja, piedra y molino terminados; herrería modelada y
validada técnicamente y revisada de frente en juego. Granero y capilla terminados;
iglesia, pozo y campo cultivado terminados y revisados en juego; sigue el campo segado. Las variantes
adicionales, los adornos nuevos y la aparición de `shed` requieren conexión del
equipo del juego; reemplazar los ids ya seleccionados encaja directamente.

**G-18:** recursos entregados para revisión visual; diferencia de zancada
medida/declarada del niño dentro de tolerancia, documentada en el informe.

**G-17 queda cerrado técnicamente:** los cuatro recursos están publicados con
los ids del encargo. El cura lleva sotana negra. No necesita cambios de selección
en el juego; el seguimiento de esta entrega está en `graphics-rounds/G-17.md`.

0. **La palanca «apretar el bosque» hace lo contrario de lo que dice, y es el
   verbo del juego.** Lo destapó C-1.3 al medir la jornada `intent.test.ts`,
   que fallaba «al filo» (27 contra 28): **no es al filo, es sistemático**. Con
   30 semillas, la postura «obra» (`timber: 0.05`) da 174 edificios contra 225
   de la postura «leña» (`timber: 0.9`), y sólo 11 de 30 semillas cumplen la
   propiedad por separado. La causa, mirada en las peores: **con «obra» la
   aldea no libera manos para construir, se muere de hambre y de frío**
   —población a 3–5, madera a 0— mientras «leña» sostiene 7–25 habitantes y
   acumula miles de unidades. Una aldea que colapsa construye menos por
   definición, y eso invierte la palanca. Es balance del motor, no un fixture,
   y **es la más grave de esta lista** porque las tres órdenes permanentes son
   lo que `CLAUDE.md` llama «el verbo del juego». El agente no tocó nada, que
   es lo correcto. Queda roja en las jornadas hasta que se decida con el dueño:
   o `timber: 0.05` no es una postura de referencia válida, o la subsistencia
   no puede depender tanto de la leña. Ronda propia, medida, antes del rediseño
   de interfaz o en paralelo con él, pero **no dentro de C-1**.

0a. **El 15 % de la aldea está de pie con una ruta que no anda** (IA-9, y es
   lo que el dueño ve como «la IA sigue siendo torpe»). Medido **en el
   navegador** con `tools/graphics/film.mjs`: en la semilla 42, año 50, siete
   personas clavadas media película con rutas de 12 a 21 tramos, pegadas a un
   borde de celda junto a un edificio, y con el replanteo entrando (el `until`
   se renueva). No es la decisión: es `seek()` contra `avoid()`. **Es IA-10** y
   la película es cómo se comprueba. La primera mitad del problema —la
   intención muerta que se conservaba para siempre— ya está arreglada en IA-9:
   clavados 3 → 0 en la semilla 11.

0b. **~~El 13,6 % de labradores que cavan la linde~~ HECHO en IA-8**: 6,5 %
   con `PARCEL_REACH` 0,9 y temblor ±0,15.

0d. **`ui-milestones` está roja y no es de nadie de hoy**: «una partida de
   sesenta años da entre unos pocos y unas docenas de hitos», semilla 999 da
   18 contra 20. Falla igual en HEAD limpio (`4145cfc`). Es deriva de la
   trayectoria nueva, como las de `rework.md` §2.8, y va con la decisión del
   peso de los avisos (punto 10).

0c. **El devoto se mide con una muestra que no lo ve.** `el devoto reza al
   menos el doble` (IA-3) pasa por poco con dos semillas y su proporción va
   de 0,6× a 2,7× sobre seis al apagar cambios que no tocan el rezo
   (`life-rounds/IA-8.md` §3). Hace falta un sesgo del devoto visible con
   una muestra barata, o una muestra mayor en las jornadas. Mientras, si se
   pone roja al tocar otra cosa, no es del devoto.

1. **~~Falta poder descartar una plaza que ya falló~~ HECHO en IA-8**
   (`Dweller.failed`, `Chooser.shunned`), y con ello el plazo vencido de las
   personas, con plazo propio del viaje (`Intent.arriveBy`). Parados 0,08 %,
   giros 0,39 %.

## 5. Lo que ya se aprendió y no hay que volver a aprender

De método, y cada una costó tiempo:

- **Nada de suites largas.** Orden del dueño: «no podemos estar parando a hacer
  pruebas de 15, 30, 45, una hora». Typecheck, lint y los ficheros tocados.
- **Una sola cosa corriendo a la vez, y al matar un run se matan sus
  trabajadores.** Esta sesión llegó a tener **121 procesos de vitest huérfanos**
  comiéndose la máquina, y todo parecía lentísimo por eso.
- **Nunca `git stash` sobre el árbol entero si hay otro agente escribiendo.** La
  forma segura de comparar antes/después es `git show HEAD:<fichero> > tmp`.
- **Reparto de ficheros por escrito antes de lanzar dos agentes en paralelo**, y
  decirle a cada uno qué ficheros son del otro. Funcionó con IA-3 e IA-4.
- **Medir antes de afirmar.** **Cinco veces** esta sesión tuve una hipótesis
  convincente y falsa, y las cinco lo supe porque la medida no se movió. Lo que
  sí funciona, siempre: **seguir un solo cuerpo paso a paso** imprimiendo su
  intención, su destino y su distancia. Así salieron las cuatro causas del
  defecto de los animales y la de V-11. Y una vez estuve a punto de informar de
  que el mundo era incoherente por contar sólo las casas de madera: eran de
  piedra.
- **Un arreglo que empeora la cifra no se queda «porque es correcto en
  principio».** Se retira, se escribe el número en el sitio del código y se
  nombra la pieza que falta. Pasó con el plazo vencido de las personas.

De diseño, y son las que más valen:

- **Una cota absoluta calibrada con una persona no vale para un cuerpo que no es
  una persona.** Tres fallos distintos de la misma familia: el umbral de avance,
  el margen con las paredes y el radio de la pausa. Lo que se le pide a un
  cuerpo se mide **con ese cuerpo**.
- **Una probabilidad que se tira cada paso no es la probabilidad que parece.**
  `GREET_ODDS = 0.2` se leía como «uno de cada cinco cruces» y era «siempre»,
  porque la llave llevaba el paso: con p repetida n veces sale 1 − (1 − p)^n.
- **Un compromiso es una interacción de verdad, no una cercanía.** Reservarlo
  por proximidad dejaba a los animales esperando en `approach` hasta caducar.
- **Una convocatoria se obedece, no se sopesa.** La reunión de §11.8 daba
  compañía y quitaba aburrimiento, así que a quien no le faltaba ninguna de las
  dos no le ofrecía nada y se quedaba en su sitio, viéndola a cuatro celdas.
  Lo que el motor ordena no compite por utilidad con estar de brazos cruzados.
- **Tapar el síntoma mejora la cifra y empeora el juego.** Hacer que estar
  parado saciara la sed quitaba a los sedientos de la estadística y les quitaba
  las ganas de ir al agua. El hueco real era que **sólo se podía beber en un
  sitio y con dos plazas**.
- **A 6 píxeles no hay que confiarle el significado a un gesto fino**, dice el
  cuaderno del dueño: ni un giro de cabeza ni un picotazo. Lo que sobrevive a la
  reducción es la continuidad de la trayectoria y la alternancia de quietud y
  marcha. Eso cambia qué merece la pena implementar.
- **La capa de vida sólo corre en 3D.** Una captura Canvas no acredita nada de
  estas fases, y la ruta `?debug=1` monta Canvas. Para ver un valle crecido hay
  que adelantar el reloj: `shot.mjs --advance <semanas>`
  (`life-rounds/evidencia-capturas.md`).

## 6. Qué hacer cuando se retoma esto

1. Leer §1 y §2 de aquí. Si hay algo «en vuelo», **no tocar sus ficheros**.
2. Mirar `git status` y `git log --oneline -5`. Conservar lo ajeno; nada de
   `reset` ni `checkout` destructivo sin documentarlo.
3. Coger el punto 1 de §4, o la fase «siguiente» de §2 si el 1 está hecho.
4. Cerrar con: informe de ronda en `docs/life-rounds/` o
   `docs/ui-redesign/rounds/`, **actualizar este fichero**, y commit con las
   medidas dentro del mensaje.
