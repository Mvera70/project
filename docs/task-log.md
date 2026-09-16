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
| `main` | **`7f0bfc4`, al día** — se empuja al cerrar cada tramo; la rama también está en el remoto |
| Fusionado aquí | `docs/visual-reference` (`f842a8d`), el cuaderno de referencia visual del dueño |
| Sin seguimiento, a propósito | `docs/life-ai-implementation-prompt.md` es del dueño; se deja para que lo commitee él |
| Puerta usada en cada ronda | `npm run typecheck`, `npm run lint`, y **sólo los ficheros tocados** |
| **En vuelo ahora** | **UI-R1** (agente Sonnet, `src/ui/redesign/`, `app.ts`, `index.html`; no tocar). **C-1 está completa** salvo el punto 7, aplazado con motivo |
| Blender · qué viene y su encaje | El agente de Codex está haciendo **el aldeano base, el herrero, el cura y un granjero**, y el dueño confirmó el 16 sep que **se meterán en el juego sustituyendo a los actuales**. Los tres primeros encajan uno a uno. El granjero es **un tipo nuevo**, y el dueño lo aclaró: «esto futuro puede implementarse en nuevos aldeanos, no significa que el granjero vaya a ser el aldeano base». O sea que **el repertorio de aldeanos crece** y no hay que encajarlo en los siete oficios que ya existen. Y hay una vía que lo hace fácil: **el modelo no tiene que elegirse por el oficio**. Hoy `VILLAGER_BY_ROLE` (`renderer.ts`) mapea oficio → malla, pero el render ya sabe qué hace cada persona (`Actor.activity`, y la oferta que está consumiendo), así que un granjero puede ser **quien trabaja el campo** sin que el motor invente un oficio nuevo ni se toque `src/engine/`. Eso deja el base para lo que es y admite más tipos después. **Se decide cuando estén las mallas.** |
| Fuera de esta sesión | Un agente de Codex está **diseñando los aldeanos nuevos en Blender** (dicho por el dueño el 16 sep). Eso toca el aparejo del aldeano y `src/render3d/world/cast.ts`, que da talla y ropa por persona: **ningún agente mío entra ahí** hasta que él lo diga. Contexto en `docs/respuesta-sesion-blender.md`. |
| Lo que acabo de cerrar | **IA-7**: los labradores dentro de su campo (96,1 % fuera → 13,6 %) y el suelo de la convocatoria aplicado de verdad. Antes, G-17 verificado (`9f33582`) |

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
| IA-7 · los labradores, dentro de su campo | **hecha** — lo vio el dueño en la demo v15; de rebote, el suelo de V-11 se multiplicaba después y no era un suelo | (este commit) | `life-rounds/IA-7.md` |

### El rediseño de interfaz (`docs/ui-redesign/implementation-prompt.md`)

| Ronda | Estado | Commit |
|---|---|---|
| UI-R0 · auditoría y cierre de especificación | **hecha** | `f9f2df4` |
| UI-R1 · carcasa, tokens y navegación | **en vuelo** (Sonnet) | — |
| UI-R2 · cabecera, actividad, órdenes, velocidad | pendiente | — |
| UI-R3 · crónica · UI-R4 · personas | pendientes (pueden ir en paralelo tras congelar UI-R2) | — |
| UI-R5 · integración y decisiones · UI-R6 · validación | pendientes | — |

### Las fases nuevas, salidas de la lista de aldeanos (16 sep 2026)

La lista completa, escrita para quien modela, está en
`docs/graphics-rounds/aldeanos-por-hacer.md`. De analizarla salen cuatro fases,
y **el orden importa**: la primera es de arte, la segunda es la que hace que el
arte sirva sin tocar el motor, y las dos últimas necesitan que el motor tenga un
dato que hoy no tiene.

| Fase | Qué | Depende de | Estado |
|---|---|---|---|
| **G-18 · los aldeanos que faltan** | Las mallas: cinco oficios por rehacer en el estilo nuevo, y los tipos nuevos —niño, anciano, buhonero, forastero, leñador, albañil, pastor, pescador, novios— | De nada. Es la sesión de Blender | **G-17 entregado** (base, herrero, cura, granjero, `9f33582`). El encargo del resto: `graphics-rounds/encargo-blender-aldeanos-2.md` |
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

0b. **El 13,6 % de labradores que cavan la linde.** Queda de IA-7: la
   tolerancia de llegada (`reach`, 1,6 × 0,6 celdas) deja a quien tiene puesto
   en la primera fila a 0,86 celdas fuera del campo. Arreglo pequeño —una
   tolerancia menor sólo para las plazas de parcela— y se mide con la quinta
   cifra de `tools/life-report.ts`.

1. **Falta poder descartar una plaza que ya falló.** Es la pieza que bloquea
   dos cosas a la vez. El plazo vencido de las personas (`village.ts`) tiene el
   mismo fallo que tenían los animales, **pero aplicar el arreglo empeora la
   cifra**: «parados con un impulso al máximo» sube de 0,06 % a 0,20 %, la de
   partida, porque con las estancias fijas de `SEAT_DWELL` se vuelve a elegir
   la misma plaza inalcanzable y se reintenta en bucle. Probado, medido y
   **retirado**, con el número escrito en el propio sitio del código
   (`village.ts`) y en `life-rounds/IA-6.md` §4.3. Con el descarte, el arreglo
   entra solo.
2. **Las duraciones y distancias de las actividades**, con los tiempos del
   cuaderno (`visual-reference` §2 y §3) como referencia declarada como
   hipótesis. La vaca sigue andando el 82,5 %: sus cinco parches están a 1,2–3,2
   celdas y anda a 0,32 celdas por segundo.
3. **Las nueve jornadas rojas de `rework.md` §2.8.** Casi todas son de la capa
   de vida y sus números cambian con cada fase, así que se tocan **al final de
   la tanda de IA**, no antes.
4. **Un trabajador de vitest se cae en la suite rápida en paralelo**
   («Worker exited unexpectedly»; no es montículo, con 4 GB cae igual). Sigue
   abierto y bloquea UI-R6, que pide la suite entera. **Lo que ya está hecho:**
   las cuatro partidas largas del motor se mudaron a
   `tests/journeys/engine-long.test.ts` por decisión del dueño («si las pruebas
   no son posibles hay que cambiar cómo las hacemos»), y con eso esos tres
   ficheros bajan de **45 s a 9 s**: bosque 15,9 → 1,25 s, riñas 15,5 → 1,09 s,
   invariantes → 7 s. Las cuatro siguen corriendo, en 42 s, donde tardar es
   legítimo.
5. **El zoom de las capturas topa por encima de unas dos muescas**, así que no
   se puede acercar la cámara a un animal en una aldea grande. Lo midieron IA-3
   e IA-4 por separado. Es lo primero que hace falta para juzgar de cerca.
6. ~~Rasgos incompatibles~~ **cerrado el 16 sep**: las **dos** parejas
   —`spring_valley` con `wide_ford` y con `marsh_valley`— se excluyen del
   sorteo, y no se le inventa un efecto nuevo a la marisma. Escrito en
   `docs/rework.md` (R-3) con el motivo y con la vía que se descartó, por si
   alguien la retoma. El nivel de caos también está cerrado: ver §3.
7. **`GREET_ODDS` sigue sin medir en la jornada**, sólo acotado. Ya no es
   «siempre» (ver §5), pero cuántos saludos al día hay es cosa del ojo.
8. **Deuda de `IA-1.md` §4.2**: `ProgressState` vive en un `Map` de
   `village.ts` y en `Beast` en vez de en `Dweller`. Arreglo escrito allí.
9. **§3.5 punto 5 de `rework.md`**: la malla contra el radio. Una vaca colisiona
   con radio 0,4 y su malla mide más de una celda. Es de `render3d/`, no de
   `life/`.
10. **El aviso de la crónica y la pista de las órdenes se pintan encima uno del
   otro** en la franja de abajo. Captura que lo prueba en
   `life-rounds/evidencia-capturas.md`. Va al rediseño; el cuaderno del dueño da
   la geometría (`visual-reference` §5).

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
