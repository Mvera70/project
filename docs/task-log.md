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

**IA-18 · cosecha visible:** la semana 35 recoge en parcelas realmente
trabajadas, carga sacos, recorre el camino, descarga en almacenamiento real y
vuelve sin producir grano dos veces. Ya no se ara en invierno ni se eligen
descargas vacías. Dos semillas observadas; 89 pruebas dirigidas, typecheck y
lint verdes. [Informe](life-rounds/IA-18.md).

**IA-17 · cantera visible:** una obra cuyo coste real incluye piedra reparte
jornadas entre parcela y roca alcanzable; se ve pico, carga, camino, descarga
y vuelta, sin inventario paralelo. Semilla 11/año44 completa la entrega antes
del regreso; 68 pruebas dirigidas, typecheck y lint verdes.
[Informe](life-rounds/IA-17.md).

**IA-16 · bosque visible:** las copas acusan cuatro tramos de existencias; el
último árbol cae sólo con la transición real a claro, deja tocón y los claros
aptos muestran un plantón creciente hasta la regeneración. Semilla 67 filmada
con motor vivo y semilla 1 con rebrote real; 97 pruebas dirigidas, typecheck y
lint verdes. [Informe](life-rounds/IA-16.md).

**Icono PWA renovado (17 sep):** el mosaico plano de M-27 se sustituye por el
emblema aprobado por el dueño —casa de paja, escudo y cinta sobre fondo cuero
naranja— en 192, 512 y 512 `maskable`. La fuente maestra queda en
`tools/icon-source.png` y `npm run icons` reproduce las tres salidas. Revisado a
48 px y bajo máscara circular; typecheck, lint del generador y la prueba del
manifiesto instalable, verdes. La caché del trabajador sube a `valley-v3`: los
iconos conservan sus nombres públicos y, sin invalidarla, una instalación
existente seguiría sirviendo los PNG anteriores después del despliegue.

**IA-15 · primera cadena visible de recursos:** reparto semanal estable, pareja
fundadora dedicada a subsistencia y ciclo `árbol → tala → carga → descarga → vuelta`.
El tajo coincide con la celda que tala el motor; almiares y pilas responden a reservas
reales y desaparecen de la fundación. Dos aldeas observadas sin errores, deriva ni
penetraciones; 72 pruebas, typecheck y lint verdes. [Informe](life-rounds/IA-15.md).

**G-25 · tamaños de roca corregidos (17 sep):** guijarros, piedras medianas y bloques grandes; el límite de celda ya no uniformiza las escalas. Ver G-25.


**G-25 · monte bajo entregado:** recurso nuevo scrub, repartido de forma estable
en bordes de bosque/roca con margen de accesos, cultivos, agua y objetos del corral.
53 pruebas, typecheck y lint verdes; dos capturas finales reales revisadas.

**G-25 · ribera entregada:** hojas abiertas y tres espigas por mata, tinte
estacional y contención en la celda. 51 pruebas, typecheck y lint verdes;
captura real sin errores. Pendientes monte bajo y más siluetas arbóreas.

**G-25 · roca entregada:** afloramiento facetado y colocación completa dentro de
su celda, sin ocupar caminos ni solares. 50 pruebas, typecheck y lint verdes.
Captura real revisada; pendiente continuar vegetación. [Informe](graphics-rounds/G-25.md).

**G-25 · paisaje, primer modelo entregado:** árbol tree rehecho con horquillas
y copa facetada asimétrica. GLB publicado selectivamente, captura real revisada,
48 pruebas, typecheck y lint verdes. [Informe](graphics-rounds/G-25.md).

**OBS-02 · piloto y comparación cerrados:** tres Luna, un Terra y un Sol revisaron
los casos archivados; ninguno localizó concretamente marcha lateral ni vado desplazado.
El método no supera calibración. Propuesta posterior: Luna recopila evidencia y el
coordinador diagnostica, previa comprobación de calidad del material. No lanzada.
[Comparación y límites](observations/OBS-02/pilot/model-comparison.md).

**IA-14 · contacto y marcha:** corregidos radio de contacto humano, giro continuo,
recorrido posterior a colisiones y zancada proporcional a talla. Comparación
cercana a 15 fps: desalineación rumbo/avance >60° baja del 45,6 % al 4,0 %.
68 pruebas, typecheck y lint verdes. Informe [IA-14](life-rounds/IA-14.md).

**OBS-01 · batería de observación con tres agentes Luna: ejecutada y auditada.**
Informes separados de día, noche y fauna, más revisión de geometría por el
coordinador. El bundle inicial coincidió con una edición incompleta de UI y
falló al arrancar; las tomas usan el control G-24 identificado por hash.
Nueve tomas, 627 PNG capturados, selección visual revisada y trazas contrastadas.
No se ha modificado el juego. Conclusiones y protocolo repetible en
[OBS-01](observations/OBS-01/conclusions.md).

**G-24 · vado 3D: hecho.** La hilera blanca junto al río no eran afloramientos
de roca: el renderer ignoraba `TERRAIN_CODE.ford` y volvía a adivinar el cruce
desde la orilla con una búsqueda de hasta catorce celdas. Ahora dibuja únicamente
las celdas de paso que guarda el mapa y conserva la conjetura sólo para partidas
anteriores a ese terreno. En semilla 7/año 1 quedan dos losas contiguas dentro
del cauce, separadas del campo. 60 pruebas, typecheck, lint y captura reales
verdes. Informe [G-24](graphics-rounds/G-24.md).

**IA-13 · puertas domésticas: hecha.** La IA sí entraba, pero a ×64 podía
recorrer `opening → entering → sleeping` dentro de un solo fotograma y el
renderer sólo miraba la etapa final. Ahora acumula el pulso de todos los pasos
internos y la hoja permanece visible 0,8 s reales, también al salir; se congela
en pausa. Validado con GLB publicado, 20/20 pruebas y toma viva a ×64 en
`life-rounds/IA-13.md`. La evidencia posterior se empaquetó desde una copia
aislada para no tocar la UI-V8 concurrente.

**Limpieza de código muerto (17 sep): hecha.** Auditoría contrastada con Knip,
búsqueda global, puntos de entrada y configuración. Eliminados `src/ui/icons.ts`,
`GREET_COOLDOWN_SPAN` y el tipo huérfano `BeastSighting`; 78 exportaciones de
valor y 34 de tipo pasan a ser internas. Se conservan los comandos manuales,
hooks, service worker y el generador reproducible de animales. Informe completo
en `docs/dead-code-audit-2026-09-17.md`.

**G-23 · animales:** encargo de rehacer las seis especies y sus animaciones.
Vaca subida en `df0ac66`. Cerdo terminado y revisado en movimiento; preparado
para entrega individual. Siguen gallina, lobo, cuervo y pez.
Cerdo subido en `aec6c38`. Gallina terminada y revisada; 45 pruebas, typecheck
y lint verdes, entrega individual preparada. Siguen lobo, cuervo y pez.
Gallina subida en `a48bb00`. Lobo terminado y revisado, con marcha sincronizada
y apoyos comprobados; 50 pruebas, typecheck y lint verdes. Siguen cuervo y pez.
Lobo subido en `b323c58`. Cuervo terminado y revisado, 52 pruebas, typecheck
y lint verdes. Queda el pez para cerrar las seis especies existentes.
Cuervo subido en `3b395c8`. **Las seis especies terminadas y validadas:** vaca,
cerdo, gallina, lobo, cuervo y pez, con rig y clips conectados al juego. Pez y
cierre preparados para subida individual. 75 pruebas, typecheck y lint verdes;
seis bancos visuales, visores con reproducción/pausa y captura del juego.
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
| IA-12 · jornada, oficios y gestos | Rutina básica: 15/15 y 21/21 puestos alcanzados; ocho acciones, ocio por edad y burbujas ligadas a encuentros | (este commit) | `life-rounds/IA-12.md` |
| IA-11 · circulación, portones y motor vivo | **hecha en los casos verificados** — 66/66 noches completas en tres aldeas; desvíos, pasillos y colisión fina | (este commit) | `life-rounds/IA-11.md` |
| IA-10 · observatorio, hogares y sólidos | **seguida por IA-11** — visor sincronizado, puertas y rutina doméstica; cifras iniciales conservadas en el informe | `a472eca` | `life-rounds/IA-10.md` |
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
| **UI-V1 a UI-V6 · las pantallas** | **V1, V1b, V2 y V3 en `main`; quedan V4, V5 y V6** — el diagnóstico y el plan están en `ui-redesign/piel/plan-piel.md` §1 (por qué salió la estructura y no el aspecto: el prompt prohibía copiar, los tokens se sembraron del juego viejo, no había criterio visual de hecho ni activos ni fuentes empaquetadas) | `197b143`, `e38c053`, `c1ddc72` |
| **UI-V2b · los iconos del chip** | **hecha** — la espiga y la pila **calcadas del prototipo** con `tools/ui/trace-glyph.py`, y la caja del icono del chip de 16 a 21 px (medido: el glifo del prototipo ocupa 18,3 px de 31,5; el nuestro se quedaba en 12,5). Nueve versiones dibujadas a mano no valieron; calcadas salieron a la primera. **El método está en la skill `calcar-iconos`** |  |
| **UI-V3 · la crónica** | **hecha**, en dos pasadas e informe en `ui-redesign/piel/UI-V3.md`. El agente entregó la estructura; el veredicto del dueño fue «la estética sigue siendo muy mala», y la segunda pasada la cerró **calcando los seis adornos del prototipo** (capitular ilustrado, viñeta a pluma, palmeta, rombo, orla de hojas; la cuenta anillada a mano). Medido en el juego: 21 años, 228 entradas, 216 viñetas y ninguna rota. **El documento sellado no se ha visto en captura** y el motivo está medido: no había encrucijada pendiente — queda para UI-V5 |  |
| **ABIERTO · una decisión pendiente bloquea la navegación** | **Fallo encontrado, sin arreglar** (17 sep 2026), y es de los que cancelan dos funciones a la vez. `app.ts:624`, dentro de `paint` y por tanto **en cada fotograma**: `if (state.crossroad !== null …) if (currentRoute.kind !== 'valley') navigate({kind:'valley'})`. Mientras hay decisión pendiente —incluso **aplazada**, con la píldora puesta y el velo retirado— la crónica y la lista de la gente **no se pueden abrir**: la pestaña se pulsa, la ruta cambia y el fotograma siguiente la devuelve al valle. Medido: semilla 11, año 37 (`forest_cut` queda pendiente al abrir), aplazada deslizando; `data-screen` se queda en `valley`, 0 bloques de crónica y 0 filas de gente. **Y de ahí sale que el documento sellado de UI-V3 sea inalcanzable por construcción**: sólo existe cuando hay una decisión pendiente, que es justo el estado en el que la crónica no abre. La intención original es de UI-R5 y es buena —una bandeja abierta tapaba las opciones—, pero la condición tiene que ser «el velo de la encrucijada está en pantalla», no «hay decisión pendiente»: aplazar existe precisamente para poder ir a mirar otra cosa. Evidencia en `artifacts/graphics/UI-V3c/` |  |
| **ABIERTO · seguir a un aldeano no le marca** | **Revisado, sin tocar** (17 sep 2026, a petición del dueño para no pisar la sesión 3D). Enfocar **sí** funciona: `renderer.track` llama a `view.look` y la cámara se recentra (medido con el reloj en pausa: cambia el 44 % de los píxeles del valle). **Iluminar la silueta no existe en el 3D**: `src/render3d/renderer.ts:995` no guarda a quién sigue, así que no hay nada que pintar — el aro sí existe, pero en el renderer 2D (`src/render/renderer.ts:78`), o sea en el camino muerto. Además apunta una vez y no sigue, `track(null)` sale en la primera línea, y el texto `inspect.track.note` promete «marks {name} on the map», que en el 3D es falso. Faltan también el aro de luz y el contorno de oro de su casa del prototipo 03. El arreglo cabe entero en `src/render3d/renderer.ts` |  |
| **VZ-5 · a quien se sigue se le ve** | **hecha**, y cierra el encargo que VZ-4 dejó a medias. El resalte estaba bloqueado por tener `renderer.ts` con cambios sin comprometer de la otra sesión; en cuanto lo subieron (`141652d`) se hizo. **Dos piezas, y la segunda porque la primera no bastaba.** (1) **Se le enciende su propia ropa**: `dress` clona el material de cada malla para cada aldeano, así que subirle la emisión a uno no puede tocar a nadie más —un contorno postizo habría que clonarlo y posarlo cada fotograma sobre un cuerpo con esqueleto; esto son dos colores, y se guarda el que había para devolverlo—. (2) **Un anillo de oro en el suelo**, porque medido en el juego la ropa encendida sola no se distingue: a la distancia a la que se juega el cuerpo mide unos pocos píxeles y el tono se confunde con su propia tela. El anillo va en `cast.mark` y **no** en `cast.group` —ahí dentro están los cuerpos y siete pruebas los leen por índice, que es lo que rompí al primer intento— y se coloca en cada pasada donde esté el cuerpo, así que sigue al que anda y se apaga si esa persona se va del valle. Tres pruebas nuevas en `graphics-world.test.ts` guardan las tres propiedades: que se enciende sólo el seguido, que cambiar de persona apaga a la anterior, y que el anillo va donde está el cuerpo. **Y el texto de la ficha, que había pasado a ser falso**: decía «no promete mantener la vista» y desde VZ-4 la mantiene, así que ahora dice «rings them and keeps the view on them». Typecheck y lint limpios, 49 pruebas rápidas de los ficheros tocados y los trece recorridos en verde | la fuerza del resalte está sin juzgar en dispositivo: el arnés no la aísla —el oro del anillo se confunde con la paja del valle al buscarlo por píxel— y la cámara no centra a quien sigue, así que el recorte del medio no sirve |
| **VZ-4 · la cámara sigue, y las seis pruebas de PWA** | **hecha**. Dos cosas que el dueño del diseño pidió al revisar lo pendiente. **(1) Seguir es seguir**: `renderer.track` mira a quien se le dice y vuelve, así que pulsar «Follow» centraba a la persona y ésta se iba andando del encuadre. Ahora `app.ts` guarda a quién sigue y lo repite en cada pintado. **Lo que falta —el resalte de la silueta— está bloqueado**: se dibuja en `src/render3d/renderer.ts` y la otra sesión lo tiene con cambios sin comprometer; se hace en cuanto quede libre. **(2) Las cinco pruebas de PWA que llevaban rotas, verdes, y la suite baja de 6,1 minutos a 11,5 segundos.** Dos causas, una del juego y otra de las pruebas. La del juego: **un valle recién fundado no se guardaba hasta el primer tick**, que a ×1 son catorce minutos, así que quien fundaba y cerraba la pestaña perdía la partida y al volver el menú ofrecía fundar otra en vez de continuar —el `pagehide` no lo tapaba, porque `persist` encola una escritura en IndexedDB y la página se desmonta antes—. Se arregla guardando al fundar. La de las pruebas: **el menú de inicio de U-10 sale también al recargar** y ninguna de las cinco lo pasaba, así que la espera de `data-app-ready` no se cumplía; `passTitle` ya sabía pulsar el botón que hubiera. Y tres medidas caducadas de paso: el avance del reloj usaba los **15 s por tick de antes de v3.72** (una cincuentava parte de lo que dice, así que el autoguardado no se cruzaba nunca) y ahora sale de `balance.ts`; ese avance se **salta** en vez de correrse, que es lo que los recorridos aprendieron (un millón de milisegundos fotograma a fotograma ahoga la página); y las cuatro velocidades viven recogidas detrás del botón desde UI-V2b, así que hay que desplegarlas antes de pedir una. **Y dos asimetrías que quedaron decididas, no arregladas**: `BACK TO THE LIST` no es una tercera forma de cerrar —sólo sale viniendo de la lista y vuelve a ella, cerrar lo hace la cruz— y la hoja de roble se queda sólo en el valle, que es el estándar aprobado en el lienzo de VZ-2. Typecheck y lint limpios, **los seis de PWA y los trece recorridos en verde** | la silueta resaltada y la línea «Today» de la ficha, las dos bloqueadas por la otra sesión; el nombre del caché del worker, que se sube a mano |
| **VZ-3 · la cabecera, exactamente igual en las tres** | **hecha**. El dueño del diseño puso las tres capturas en fila y lo señaló: «la parte de la UI de arriba no está alineada; que sea exactamente igual en las tres pantallas». Medido, lo era en todo **menos la placa de fecha**: 334 px en el valle y 272 en la crónica y la gente, con el arco del sol en 90 contra 62. La causa era una excepción de UI-V9 que estrechaba la placa para dejar sitio al botón de cerrar —una placa de 71 px arriba a la derecha— y **VZ-2 retiró ese botón**, así que la excepción se había quedado sin motivo y sólo dejaba el defecto. Retirada, y el arco vuelve a sus 90 fijos. Medido después a 390 y a 750: placa x 27 y 16 de 334 × 34, arco x 255 de 90 × 29 y fila de chips x 43 de 318 × 33, **idénticas en las tres rutas y a los dos anchos**, con la fecha entera. Y un daño colateral de VZ-2 corregido: el arreglo del barrido de la ruta viva se aplicó por error **a los dos** recorridos que tocan el lienzo, y el de U-14 funda un valle nuevo donde al año 1 hay **una casa** en un mapa de 72 × 112 —unos pocos píxeles en el centro—, así que un barrido de treinta en treinta la saltaba: 220 toques sin abrir nada, tres veces seguidas. Vuelve al barrido fino de cinco en cinco alrededor del centro, y el ancho se queda sólo donde hace falta, en el valle de ochenta años con la cámara siguiendo a alguien. Lint limpio y los trece recorridos en verde |  |
| **VZ-2 · un canto, un papel, una textura** | **hecha**. Sale de tres pestañas seguidas en la tablet del dueño del diseño: «que cada sección tenga un borde diferente y además el fondo no sea de la misma tonalidad ni textura, no me gusta nada; queda fatal cuando cambias entre pestañas. Quiero intentar llegar a algo más genérico». Se le dibujaron **tres alternativas en un lienzo** con los valores reales del proyecto —el listón de madera curvo, un canto recto y el papel rasgado— y eligió el tercero: «me gusta más el borde como de hoja rota». **Lo entregado:** una sola clase (`.skin-torn-top`) para las **seis** superficies de papel —la bandeja, la hoja de gente, la página de la crónica, la decisión, el epitafio y el parte— con el azulejo de `tools/ui/torn-edge.py` (semilla fija, escrito y no calculado, como los `deckle`). Se retiran la franja de fusión de 64 px, la esquina redondeada de 16, la sombra de la hoja, el filete recto de su canto y **el segundo tono de papel**: la bandeja deja de ser `--skin-parchment-deep`, que es la única desviación deliberada del prototipo 01 y va escrita. Y **el botón de cerrar**: «no lo puedes poner arriba a la derecha; tiene que ir como una cruz pequeñita o si no la opción de poder deslizar hacia abajo» → fuera la placa con la palabra `CLOSE`, y una cruz de 19 px en un toque de 44 sobre el papel, la misma en las dos secciones, con el deslizamiento donde estaba. **Tres trampas medidas, las tres cazadas con captura y no con número**: un azulejo que se repite en vez de estirarse (la lección del listón); una tira dibujada en `::after` **la recorta `overflow: auto`** —el epitafio y la hoja de gente salían con el canto recto mientras la bandeja y la crónica salían rasgadas—, así que es una máscara sobre la propia hoja; y **una máscara recorta a sus descendientes**, y la crónica vive anidada dentro de la hoja de la carcasa con un velo `position: fixed` desde UI-R3, así que su página quedaba recortada a los 33 px que esa hoja mide: de ahí la única excepción, con `:has(.chronicle-scrim)`. La cruz se repone con `replaceChildren(close)` porque la crónica se vacía en cada repintado. Typecheck y lint limpios, **los trece recorridos en verde**, las pruebas rápidas de interfaz al día (la de las superposiciones cambia de propiedad: ya no guarda el degradado, guarda el canto). Norma en `design.md` §11.2 y la skill `piel-del-valle` §2, §6 y §7 |  |
| **VZ · la voz del valle: un sitio, una cola, una piel** | **hecha**, informe en `ui-redesign/piel/VZ.md`; el plan que la ordenó es `ui-redesign/piel/plan-voz.md`. Sale de la corrección del dueño del diseño a UI-V10 («esta forma de arreglarlo me parece una chapuza… mira cómo son los circuitos»), y de que la estructura correcta llevaba escrita dos veces sin construirse (`visual-reference/README.md` §5, «no conservar una quinta cartela flotante»). **Lo entregado:** una cola pura (`src/ui/voice.ts`) decide qué frase lee el valle —hito > suceso > pista > estado— y la bandeja la enseña en un hueco de **altura fija de dos líneas**; se fueron tres `setTimeout`, un `MutationObserver` que espiaba el atributo `hidden`, `resolveMessageSlot`, la cartela de hito entera (`moment.ts`, borrado) y la píldora de la decisión, que pasa a ser el **sello de lacre en el ornamento**; el hito se marca poniendo **la hoja de roble en oro**, sólo con CSS; y el parte de bienvenida y el epitafio —las dos únicas pantallas que seguían con tokens de U-01 y cero clases de la piel— se visten con el lenguaje del documento sellado. Las tres decisiones del plan §3.4 las contestó el dueño, las tres con la recomendación. **Medido a 750 y 390, en los cinco momentos del arranque: pila 200 en todos, hueco 50, rincón de velocidad clavado, cero piezas flotando, cero errores de página.** Esa columna de constantes es el arreglo: nada de lo que hay encima se recoloca nunca. **Tres cosas destapadas por el camino**: una variable en la zona muerta temporal que dejaba el hueco vacío —y las cifras perfectas, porque nada hablaba: una medida no es una captura—, `intro.orders` con 129 caracteres que se iba a una tercera línea (medido: 97 caben, 129 no; acortada y vigilada desde el banco) y el `›` flotando porque en una caja `flex` un pseudo-elemento es otro ítem. **Y dos defectos anteriores que las capturas sacaron y se arreglan aquí**: el parte de bienvenida se leía **detrás de la bandeja** —la pila va en z-index 14 y cada superposición la aparta por su nombre; el parte no estaba en la lista desde que la pila existe— y el recorrido de la ruta viva pasaba por accidente, midiendo la caja del 2D y tocando esas coordenadas en el 3D (ahora espera a que el lienzo esté dimensionado: el 3D recién montado mide 300 × 150). Typecheck y lint limpios, **los trece recorridos en verde**, 76 pruebas rápidas de interfaz con 34 nuevas. Los tres fallos de la suite rápida (`graphics-clock`, `life-staging`, `ui-milestones`) **no son de esta ronda**: se comprobaron en un árbol limpio de `origin/main` con los mismos números |  |
| **UI-V10 · la secuencia del inicio** | **hecha**. Cuatro capturas seguidas del arranque, mandadas por el dueño del diseño, y tres defectos en ellas. **(1) El 2D asomaba antes del 3D** («no sé por qué se ve un momento la aldea en 2D»): el relevo de `backend.ts` dejaba pintar al lienzo 2D mientras se descargaba Three y lo apagaba al acabar, así que había un instante de **otro juego** —el mapa plano de casillas—. Ahora el 2D va oculto de entrada cuando el destino es el 3D y sólo vuelve si el 3D no llega (su `catch`), y el hueco espera en `--ui-ground`, muestreado del prado. **(2) El listón tapaba la cartela de hito** («el marco tapa el mensaje que sale por encima»): `.valley-moment` estaba a `bottom: 200px` fijos, de antes de la piel, y la bandeja mide ahora lo que mida su texto —crece a dos líneas— más los 46 del canto. Se ancla a `--ui-stack-height` + `--ui-batten-height` + 14, y el alto del canto pasa a ser un token para que no haya dos copias del número. Medido a 750: la cartela acaba en y 918 con la pila en 978, o sea 14 px de hierba sobre la madera. **(3) La pista del inicio guiado** seguía siendo la tarjeta de tinta de noche de U-11, de cuando flotaba sobre el prado desnudo, y encima del pergamino era un parche negro sobre el ornamento: pasa a tinta sobre el papel con su `›` de latón, el mismo arreglo que el aviso recibió en UI-V2. Y **baja detrás de la línea de órdenes**, porque su frase dice «the line above» y el orden del DOM en la bandeja sí es el orden de la pantalla; el texto no se toca. Las dos reglas nuevas quedan en la skill `piel-del-valle` (§7 y §8). Typecheck, lint y build limpios, 54 pruebas rápidas y 12 de los 13 recorridos en verde; el que falla es la tormenta, y falla porque el servidor de desarrollo no puede servir `src/render3d/renderer.ts` mientras la otra sesión lo está escribiendo (`data-render-failure` con un `?t=` distinto en cada intento), no por esta ronda |  |
| **UI-V9 · un estándar, no un catálogo de excepciones** | **hecha**, informe en `ui-redesign/piel/UI-V9.md` y la regla en `.claude/skills/piel-del-valle/`. Sale de tres frases del dueño del diseño en la tablet: «revisa el trabajo con una simple captura», «no usamos el mismo que tenemos en la otra pantalla funcionando» y «los fondos detrás de los textos, usa siempre el mismo; no estamos estandarizando las cosas». El diagnóstico: cada ronda vistió **una** pantalla desde su prototipo, y el conjunto salió con dos papeles, dos cabeceras y tres formas de cerrar. **(1) Una cabecera, la del valle**: la compacta de la crónica se retira entera —DOM, CSS e interruptor de ruta— y con ella el duplicado de UI-V1 por el que **cada cifra vivía dos veces en el DOM**; la crónica enseñaba tres cifras de cuatro por estar topada a 334, que es lo que UI-V8 intentó arreglar en la pieza equivocada. Con hoja abierta la placa cede 118 px al botón de cerrar (272 a 390 px, 334 desde 452) y lo que cede es el arco del sol, que tiene `viewBox`; la fecha no se toca. **(2) Un papel para leer**: la hoja de gente/ficha/órdenes se pintaba con `--ui-paper-bg`, token de U-01 anterior al rediseño y sin textura → ahora lleva la clase `skin-paper--page`, la misma de la crónica, y no una copia de sus valores. **(3) El canto en tres piezas**: hombros de 80 px fijos y franja llana estirada, porque estirar una sola tapa dejaba a 750 px una recta con dos ganchos — **una pieza cuya forma cambia con el ancho no es un estándar**. Y los círculos de velocidad suben 40 px para que el papel no los muerda (37 del canto + 13 de hierba medidos en el prototipo). **La lección de método**: en UI-V8 verifiqué midiendo cajas, todas correctas, y subí un canto malo; la captura a 390 **y a 750** entra en el bucle y está escrita en la skill. Typecheck y lint limpios, 54 pruebas rápidas de interfaz, cuatro recorridos de maquetación en verde, capturado y mirado en las cuatro pantallas a los dos anchos |  |
| **UI-V8 · una sola directriz, y la bandeja del prototipo** | **hecha**, informe en `ui-redesign/piel/UI-V8.md`. Cuatro correcciones del dueño del diseño probando la demo en la tablet. **(1)** La directriz, que UI-V7 dejó a medias: acoté las hojas a 390 y dejé cruzar las barras, o sea dos reglas para la misma cosa, y se vio en la crónica («deberíamos tener un estándar y que se viesen los tres iguales»). Ahora **la superficie cruza la pantalla y su contenido va en columna de 390**, para las cinco pantallas; medido a 1240: velo y página 1240, columna x 425 ancho 390, fila de gente y ficha igual. **(2)** La cabecera compacta recortaba el grano de tres dígitos (334 px de tope con 183 para cuatro cifras) → `width: auto` con mínimos en vez de topes. **(3)** Fuera el selector de crónicas de varios valles («esa barra ahí en medio es horrorosa»): `.chronicle-source` ya no existe en el DOM. **(4)** La bandeja, que no se parecía al prototipo: la hoja de roble **calcada** (caja 400,1490,454,1560, bias 0, 4 bucles), el filete acabado en punto de oro, y el canto rehecho. El canto es el trabajo de verdad: **no es un arco**, y un `border-radius` sólo sabe hacer elipses. Medido en el prototipo, la madera baja a y 1507 en la esquina y sube a 1452 en el centro —31 px de flecha— y a 27 px de la esquina sólo ha subido 6 mientras a 55 ya está arriba: hombros cortos y meseta larga. Lo pinta una tapa SVG colgada del hueco y estirada, con el papel bajo la curva y el valle por encima. Dos medidas que lo hicieron creíble: el listón es madera **clara** (tres tokens nuevos muestreados, `--skin-wood` salía casi negro) y el relleno lleva el color con el que la bandeja se pinta de verdad (`#CBB59A`) y no el del token (`#D9C2A5`), que dejaba un escalón. Typecheck y lint limpios, 54 pruebas rápidas de interfaz y los cuatro recorridos de maquetación en verde |  |
| **UI-V7 · el juego ocupa la pantalla** | **hecha**. Tres síntomas que el dueño del diseño encontró probando la demo en su tablet, y que eran **el mismo defecto**: la pantalla se movía y no se quedaba fija, el pellizco ampliaba la página en vez del valle, y no se podía girar el ángulo. `index.html` topaba `.valley-app` a `min(100vw, 390px)` por `min(100dvh, 844px)` desde U-01, y en un móvil eso es la pantalla entera y no se nota nunca; medido a 1240 × 1900, el juego se pintaba en una columna de 390 px en x 425 y la carcasa —que usa `position: fixed`, medido contra la **pantalla** y no contra esa caja— ocupaba los 1240. Arreglado con tres cambios: la caja a pantalla completa (el renderer se mide contra ella y `view.resize` reencuadra, así que **enseña más valle**), `touch-action: none` en el lienzo 3D —`#valley` lo tenía desde U-01 y `#valley3d` nació sin él— y `user-scalable=no` en el viewport. Y la mitad del trabajo es lo que quitar el tope destapó: **toda la piel está medida a 390 px**, así que la regla pasa a ser la imagen a sangre y el texto en su columna de 390, con la barra cruzando la pantalla y sus tres celdas centradas en un envoltorio nuevo. Se retira el raíl lateral de 360 px que `shell.css` guardaba para 900 px o más: con el tope **nunca se había activado**, y al quitarlo pintó una banda en el canto derecho a la vez que la página de la crónica. Medido: en móvil la geometría es idéntica pieza por pieza (placa de fecha x 27 ancho 334, rincón x 232, crónica 390) |  |
| **UI-V5c · la encrucijada, y la fuga de la cabecera** | **hecha**, informe en `ui-redesign/piel/UI-V5.md`. La decision se viste como documento sellado (3.5): fuera el velo oscuro -- el valle queda atenuado al 18 %, que es lo que 11.2 pide --, pagina que sube con franja de fusion, sello a la izquierda del titulo, tinta roja, y cada opcion una tarjeta rasgada con el precio al lado. Y **la cabecera dejaba de ocultarse**: la lista de `crossroad.ts` nombraba los elementos de U-01 y UI-V1 los metio dentro de placas nuevas, asi que se ocultaba el texto y quedaba la placa de fecha vacia encima de la decision, mas el circulo de pausa detras de las tarjetas. Medido: 3 de 3 precios en pantalla sin desplazar, cuatro piezas ocultas, cero solapes. **Falta el epitafio**, que 3.5 cubre en la misma frase |  |
| **UI-V5b · la lista de la gente** | **hecha**. El último trozo sin vestir, y el segundo sin prototipo (el 03 dibuja una ficha, no una lista): fila de pergamino rasgado con los cuatro cantos alternados, el medallón de la ficha en talla pequeña, y el nombre con la edad detrás como en la placa. **Los rasgos se quedan en texto y no como chips**: ochenta y un recuadros convierten una lista que se recorre con el pulgar en un muro |  |
| **UI-V5 · el menú de inicio** | **hecho**, informe en `ui-redesign/piel/UI-V5.md`. **La única pantalla sin prototipo**, así que se diseña en vez de calcarse: **la cubierta de la crónica** — madera de fondo, una hoja de pergamino con el canto deshilachado encima, el título con el filete y la palmeta de la crónica, y el sello de lacre en el centro como «documento por abrir». Ni un texto cambia. De paso, `--skin-seal-blob`: el sello usaba el recorte de un chip y era un cuadrado rojo, ahora es una gota de cera — arregla también el documento sellado de la crónica |  |
| **UI-V4 · la ficha de la persona** | **hecha**, informe en `ui-redesign/piel/UI-V4.md`. La ficha del prototipo 03: medallón con **monograma** (no hay retratos y no se inventan), nombre con edad, oficio, chips de rasgo, helecho calcado, tira de parentesco y los dos botones de madera y pergamino. **El parentesco sale sólo de lo que el motor guarda** —`parentIds` y `opinions`—: la «wife» del prototipo no existe porque la boda de R-1 es un suceso y no un vínculo. Falta la línea «Today», que necesita la capa de vida que el dueño está reescribiendo: derivarla del motor podría contradecir al cuerpo que se ve. 14 pruebas del modelo puro |  |
| **UI-V3b · los tres remates** | **hecha**. Salieron de la vuelta completa de capturas, ninguno visto antes: la **regleta de velocidad** seguía con la píldora de U-01 y **se salía de la pantalla** (sus cinco botones piden 220 px y el rincón ya gasta 150, en 390 no caben en fila) — ahora va vestida y **apilada encima** del rincón; el **botón de cerrar de la crónica** era `fixed` y al leer hacia abajo se comía el final de dos líneas — ahora es `absolute` dentro del velo, así que vive sobre el valle y se va con la página, y volver lo da la barra de abajo, que desde UI-V2 está siempre a la vista; y la **hoja de órdenes** («no parece que cumpla la estética del resto», dueño del diseño) pasa a chips de pergamino rasgado con la elegida en placa de tinta y letra de oro, igual que la pestaña activa y el multiplicador |  |
| **UI-V2b · la bandeja y el rincón** | **hecha**. La frase de actividad y la línea de órdenes bajan a la bandeja, centradas bajo la hoja de roble como el prototipo 01, y con ellas se retira el parche de altura de UI-V1. Y el rincón de velocidad deja de caer dentro de la bandeja: `shell.ts` mide la bandeja con un `ResizeObserver` y publica `--ui-stack-height`, porque su alto **no es fijo** — medido: la bandeja ocupaba 669–844 y los círculos 740–784, y ahora 615–659. De paso, con una hoja abierta el hueco del mensaje se **pliega** en vez de sólo ocultarse: la pila va en z-index 14 y la hoja en 13, así que el papel le tapaba los últimos 107 px y «Build first» volvía a quedar escondido |  |
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

IA-18: tick947/semana35. Semilla 11, 26 personas: id37 recoge, carga a 1,13 s,
camina a 1,20 s, descarga a 1,87 s y entrega a 3,87 s; dos entregas y dos sacos
al final. Semilla 7, 21 personas: cuatro porteadores, ruta del id3 de 19 a 6
tramos en 45 s, aún sin descarga. Cero descargas vacías, errores, deriva,
penetraciones o centros bloqueados. 89 pruebas dirigidas, typecheck y lint.

IA-17: semilla 11/año44, tick2064, 62 personas, obra `stone_house` 166,29/170
y cantera en celda4056. Id15: pico a 17,33 s, carga a 23,33 s, descarga a
24,17 s y entrega a 25,67 s. Cero errores, deriva, penetraciones o centros
bloqueados. 68 pruebas dirigidas, typecheck y lint verdes.

IA-16: semilla 67/año19, toma viva a ×64 y 6 fps: tick 864→865, celda 2986,
bosque 472→471; caída 1,17→2,67 s, tocón visible desde 2,17 s y tronco retirado
a 8,17 s. Semilla 1: 0 rebrotes en tick432 y 1 en tick480. Cero errores, deriva,
penetraciones y centros bloqueados. 97 pruebas dirigidas, typecheck y lint verdes.

IA-15: semilla 7/año20, 286 fotogramas a 15 fps siguiendo al id2: tala, carga,
transporte, descarga a 17,93 s y vuelta, 1 entrega, 0 charlas con carga. Semilla
11/año20: 27 personas, 17/17 puestos alcanzados, cinco ids en tala/transporte/
descarga. Dos tomas con 0 errores, deriva, penetraciones o centros bloqueados;
tick fijo 912→912. 72 pruebas dirigidas, typecheck y lint verdes.

**G-25 · tamaños:** ocupación horizontal 28–99 % de celda, variación vertical superior a 4×; 49 pruebas, typecheck y lint correctos.


**G-25 scrub:** 244 triángulos, 2 materiales/mallas, 22 524 bytes y altura
0,304 celdas. 53 recursos empaquetados; sin medición nueva de rendimiento móvil.

**G-25 reed:** 72→228 triángulos; 3 materiales/mallas, 21 572 bytes, altura
0,572 celdas. Verificación de todos los vértices tras giro/escala por instancia.

**G-25 rock:** 72→186 triángulos, dos materiales/mallas, 17 496 bytes.
Contención comprobada sobre vértices del GLB en todas las instancias del mapa de prueba.

**G-25 tree:** 188→352 triángulos; 3 materiales/mallas; 9 868→30 428 bytes.
Huella física del tronco idéntica al GLB anterior. Sin medición móvil nueva.

**OBS-02 piloto + comparación:** 5 revisores (3 Luna, Terra y Sol), 3 casos,
139 PNG archivados y 10 informes originales. 0/5 detecciones visuales concretas de
marcha lateral y vado; contacto no aislado suficientemente. 24 encargos sin ejecutar.
No valida el juego actual ni mide una tasa universal de acierto.

IA-14: 27 personas en comparación seed11/año20, 61 frames por toma a15fps.
485/1063→44/1089 muestras con desalineación >60°. Noche seed43/año60:
21/22 completas, pendiente132 en tick2834, cero penetraciones/deriva.

OBS-01: día 15/15 y 21/21 puestos alcanzados (11/20 y 43/60); noches vivas
22/22 y 21/22 completas (7/1 y 43/60), ticks 0→3 y 2832→2835. Residente 155
pendiente al amanecer del tick 2834. Nueve tomas sin errores ni penetraciones
muestreadas. Gallina y peces observados; cuatro especies y ancianos sin evaluar.
WLD-01 confirma mediante GLB transformado que una losa de G-24 sigue fuera de
su celda, aunque su raíz esté bien colocada: la conclusión visual previa era excesiva.

G-24: semilla 7/año 1, dos celdas de vado `(38,52)` y `(39,52)` frente al campo
en `x=34…36`; 17 fotogramas revisados, 2 personas y 3 animales. Cero errores,
penetraciones, centros bloqueados o deriva. 60/60 pruebas dirigidas, typecheck
y lint verdes. La toma mantiene `engineTick=0`: valida colocación, no evolución.

IA-13: semilla 7/año 1, toma viva a ×64, 6 s y 15 fps; dos residentes, tres
animales y tres noches completas. Apertura, paso y cierre visibles en los
fotogramas 10–20 aunque el residente ya conste `sleeping`; cero errores,
penetraciones, centros bloqueados o deriva. 20/20 pruebas dirigidas verdes.

Limpieza estática: 1 módulo, 1 alias ejecutable y 1 tipo huérfano eliminados;
112 exportaciones públicas innecesarias cerradas. Typecheck, lint, build y
comprobación de inalcanzables verdes. Knip final sólo deja puntos de entrada
manuales/configurados y tres falsos positivos con consumidores comprobados.
Suite: 1.327/1.330; las tres rojas no pasan por los símbolos retirados.

IA-12: dos tomas diurnas reales (semillas 11/43, años 20/60, 45 s a 2 fps),
15/15 y 21/21 trabajadores/religiosos asignados llegan a ejercer. Cero discrepancias
de burbuja de charla o clip aplicado. Mayor natural (7/37): descanso y conversación
observados; ocho clips nuevos comprobados sobre esqueletos publicados. Detalles,
regresión nocturna y límites en `life-rounds/IA-12.md`.

IA-11: 62 pruebas pertinentes en 11 archivos; typecheck, lint y bundle verdes.
Tres partidas vivas a ×64, 42 s y 2 fps: 22/22 noches completas cada una, 66/66
en total. Semillas 7/11/43: 2, 23→22 y 32 residentes con casa. Ticks 0→3,
912→915 y 2832→2835. Cero penetraciones de personas/animales, centros en sólidos,
desajustes cuerpo/modelo y errores JS muestreados. Evidencia en IA-11/delivery.

IA-10: 156 pruebas pertinentes verdes. Tres tomas del renderer real con estado fijo:
semillas 7/11/43, durmiendo 2/2, 14/23 y 26/32 con vivienda. Cero penetraciones
y desajustes cuerpo/modelo muestreados. No equivale a una partida completa.
Casas con puertas: paja 668 triángulos/6 materiales; piedra 764/5.


G-23: vaca de 3476 triángulos, cuatro materiales; clips idle/walk y controlador
por distancia. 42 pruebas pertinentes verdes. Cuatro llamadas por vaca visible;
sin nueva medida de FPS móvil.
Cerdo: 2808 triángulos, cuatro materiales y 18 huesos; 43 pruebas pertinentes.
Gallina: 874 triángulos, cuatro materiales y 12 huesos; 45 pruebas. Banco de
40 cerdos: CPU/envío mediana 1,6 ms, p95 3,8 ms; no es una medida de FPS móvil.
Lobo: 2828 triángulos, cuatro materiales, 18 huesos. 50 pruebas pertinentes.
Cuervo: 826 triángulos, cuatro materiales, 12 huesos. 52 pruebas pertinentes.
Pez: 700 triángulos, cuatro materiales, seis huesos. Cierre: 75 pruebas en seis
archivos; GLB de las seis especies 1 916 800 bytes. Todos los hashes verificados.

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

**Recursos visibles:** IA-15 e IA-16 cierran la madera, IA-17 hace visible la
cantera e IA-18 conecta cosecha, porte y almacenamiento con el tick real. Queda
arte específico de siega y decidir si el motor debe guardar crecimiento por
parcela. El agotamiento de roca también exige un contrato persistente nuevo.

**G-25:** corregida la uniformidad de las rocas señalada por el dueño. Sigue pendiente ampliar siluetas de árboles.


**G-25 paisaje:** rocas, ribera y monte bajo entregados; siguen pendientes otras siluetas
de árboles; requieren respetar accesos y campos. El vado desplazado sigue abierto.
La batería OBS-02 se aplaza por decisión del usuario; se retoma modelado 3D.

**OBS-02 detenido tras el piloto por petición del usuario:** decidir después cómo
mejorar encuadre y revisión temporal antes de repetir calibración. No lanzar la
batería completa con el método actual. La cobertura visual sigue sin certificarse.

**IA-14:** el contacto y la orientación mejoran; no equivale a apoyo perfecto
de pies. Regresión nocturna conserva 21/22 noches completas, ahora pendiente132.
El fallo de regreso y la geometría del vado siguen como tareas separadas.

**OBS-01:** corregir el pivote del vado y comprobar continuidad del agua; G-24
arregló la selección de celdas pero no toda la geometría. El regreso del 155
se reproduce (21/22 noches completas); no queda resuelto porque otra noche del
mismo tick sí termine. Completar cobertura de ancianos, vaca, cerdo, lobo,
cuervo, encuentros y gestos cercanos. Ver prioridades en OBS-01.

**IA-12:** regreso nocturno pendiente del residente 155, semilla 43/año 60,
tick 2834 (31/32 durmiendo; 21/22 noches completas). La semilla 11 completa 22/22.
Queda revisar encuentros y acciones propias de cada especie; anclajes de
uso del yunque/bancos y tareas específicas de partera, herbolario, caza y pesca.
El ocio, cultivo, tala, construcción, herrería, granero y rezo básicos están
conectados. Sentarse es en el suelo; un especialista sin edificio usa ocio.

**IA-11:** regreso/salida, desvíos, pasillos, portones y colisión fina de troncos/lápidas
verificados con 66 noches del motor vivo. Queda revisar encuentros completos y clips
de todas las especies, y ampliar la muestra a otros recintos y aldeas; los portones
permanecen abiertos. No hay interiores ni clip de acostarse, ni se asignan viviendas
ficticias a los residentes sin casa. Véase `docs/life-rounds/IA-11.md`; no dar por
cerrada toda la IA por esta muestra.


G-23: seis especies terminadas y comprobadas. No queda modelado pendiente del
catálogo animal actual. Coste del banco documentado en G-23; no hay medida
nueva de FPS en dispositivo móvil. Nuevas especies o conductas son otro encargo.

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

0e. **La limpieza no deja verde la suite completa por dos rojas ajenas más.**
   `graphics-clock` espera cuatro clips en el manifiesto del aldeano y encuentra
   doce; `life-staging` reúne 20 de 39 aldeanos en la capilla (51,3 % frente al
   60 % exigido). Ninguna depende de los símbolos retirados: la primera mide el
   catálogo de arte y la segunda la trayectoria de V-11 ya documentada en
   `rework.md` §2.8. Se dejan abiertas para sus rondas funcionales.

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
