# El disparo único — brief para Astra

**Para ti, que escribiste `docs/plan-meta.md` el 18 sep 2026.** Han pasado dos
días y tu plan se ha cumplido casi entero. Este documento es (1) lo que ha
pasado, para que lo revises por encima, (2) lo que te pedimos criticar, y (3) la
tarea concreta, que es tuya y de nadie más.

**No hace falta que te metas a fondo en la parte 1.** Es un repaso: lee, y si
algo no te cuadra, dilo. El trabajo está en la parte 3.

---

## Parte 1 · Qué ha pasado desde que escribiste el plan

Ciento veinticinco commits en dos días. Lo que importa, por bloques de tu tabla.

### Tu plan, cumplido casi entero

**Cerradas**: A1, A2, A2c, A3, A4, A5 · B1, B2, B3, B4 · C1, C2, C3, C4 ·
D1, D2, D3, D4, D5 · F2, F3 (a–d) · G1, G2, G3, G4.

**Abiertas**: A3b (aclarada por el dueño, sin brief) · **D6, E0, E1, E2, E3,
E4** — o sea **el bloque de arte entero** · F1 y F4, que son continuos.

Es decir: **lo que queda de tu plan es lo que no se puede hacer sin ti o sin una
sesión de arte.** Por eso este documento.

### El asedio funciona de punta a punta

Un clan vecino crece con los años y baja cuando el valle tienta (B1). La crónica
avisa con ocho o catorce semanas (B2). La aldea sube de una a siete manos al
cerco la víspera (C2). Los que tienen arco disparan **flechas de Rapier con su
parábola y su impacto** (D2). Un asalto —el que cuadruplica lo que el valle pone
contra él— va a por la puerta, se apretuja y la golpea **sesenta veces** (D3b,
D5). Quien llega al alcance de un brazo pelea, y **defender cuesta vidas** (D4).
Y lo que salga de esa pelea entra al motor como dato por `PlayerAct`
(B4, `kind: 'battle'`), que es la frontera que §1b abrió.

Si el portón cede y alguien entra y sigue en pie: `ended.cause = 'stormed'` y la
partida se acaba.

**Medido**: sin dar defensa caen 3 de 12 valles en ochenta años; con la muralla
tumbando al 30 % de la partida, ninguno.

### El ritmo cambió, y es lo que más mueve tus cifras

El dueño dijo el 19 sep: «se tarda muchísimo en empezar a hacer cosas y es muy
lento y muy aburrido», **y que el ritmo va a seguir cambiando**. Se bajó el suelo
de §8.6 de 48 ticks a 16. Consecuencias que te tocan de cerca:

- La villa cerrada pasa de **425 h a 308 h** de reloj; la edad de piedra se queda
  en 60 h. El hueco que tu §0 señalaba baja de ~360 h a ~250 h **sin apretar la
  muralla**: estaba en que la aldea pasaba media partida sin que le preguntaran
  nada.
- **El último peldaño del juego entero —el bastión— cae a las 350 h de mediana**
  (`npx tsx tools/reports/pace-report.ts`).

### Lo que se midió, y tres cifras del proyecto que eran falsas

Esta es la parte que más te puede interesar criticar.

1. **El banco de balance (G2).** El cuaderno decía «19 rojas de 37» y «tarda más
   que sus 45 minutos». Corrido de verdad: **11 rojas de 37**, y la duración va de **31 a 46 minutos** según lo que la máquina tenga al lado (tres pasadas medidas).
   Nadie lo había corrido desde M-4. Las once son **cuatro causas**, y tres son
   el juego moviéndose adonde se le pidió: cadencia 12,6–16,8 preguntas por
   generación contra una banda de 1–5 (de antes del ritmo nuevo), extinción
   prudente 26,7 % contra 2–12 % (**es §1b funcionando**), y el bosque al 72,7 %
   de pie contra 40–70 % — falla **por arriba**: no se agota, se queda entero.
   No se movió ningún número: las cuatro quedan en `it.fails` con la propiedad
   intacta. Detalle: `docs/medidas/banco-de-balance-2026-09-19.md`.

2. **No hay contenido muerto en el catálogo.** La prueba que lo decía medía un
   banco sintético que funda con **veinte personas en el tick 0** — la aldea de
   antes de la pareja fundadora. Jugando de verdad se plantean **20 de 21
   plantillas**. Sustituida por `tests/journeys/catalogue-coverage.test.ts`.

3. **La banda de semillas cambia la tasa de caída nueve veces.** Con la misma
   política y los mismos años: `0..29` da 1 valle caído de 30, `100..129` da 6,
   `3+7i` da 9. No es la magnitud de la semilla. **Caer es un suceso raro y
   treinta semillas no bastan para medirlo.** Si vas a citar una tasa de caída,
   di de qué banda sale.

4. **G4, tu curva de dificultad, medida por contrafactual** (`npm run lethality`:
   juega el valle y lo vuelve a jugar cambiando **una sola** respuesta).
   Lo que acumula la caída es **no prepararse para el asedio**:
   `raiders_coming:wait` es la segunda opción más letal del catálogo (+19 pp
   sobre 26 pares). **Y es lo que elige la política prudente**, porque §12.9 la
   define sin lookahead y prepararse cuesta grano y ánimo *esta semana*: mira el
   precio y no ve el asalto. Detalle:
   `docs/medidas/letalidad-por-decision-2026-09-19.md`.

### Interfaz

- **F2**: el valle cuenta el asedio mientras pasa — la víspera con cuenta atrás,
  el clan encima («en la puerta» sólo si hay puerta) y los tres estados del
  portón, que salen de la escena y no del motor.
- **F3d**: el cronicón, los valles acabados uno debajo de otro.
- **Y la piel se estandarizó** (skill `piel-del-valle`): un papel, una cabecera,
  un canto, una forma de cerrar.

### Dos trampas nuevas que te ahorran tiempo

- **Una captura vale más que una prueba, y una sola captura no basta.** En F2 se
  fotografió la línea del asedio con una partida de 24 hombres y salió bien.
  Con seis salía «six of them are at the gate.» **en minúscula**, porque
  `{count}` se escribe con letra por debajo de trece. Lo cazó la captura de F3d,
  un día después. Hay guardia desde entonces en `ui-keys.test.ts`.
- **El banco de balance no se solapa con nada** y su fichero de salida **deja de
  crecer igual cuando va bien que cuando está muerto** (`Out-File` escribe al
  final). Se comprueba con el proceso, no con el fichero.

---

## Parte 2 · Lo que te pedimos revisar

**Por encima. No te metas a fondo.** El plan es tuyo y quien lo ha ejecutado ha
sido otro; lo que interesa es tu ojo, no una auditoría.

Cuatro preguntas concretas, y cualquier otra cosa que veas y no te guste:

1. **¿El orden sigue siendo el tuyo?** Con A–D cerradas y el bloque E entero
   abierto, ¿E1 sigue siendo P1 y D6 P3? ¿Hay algo que debería adelantarse?
2. **Las cuatro rojas del banco.** Se dejaron con la propiedad intacta y la cifra
   al lado, sin tocar ningún número, porque el nivelado es del dueño. ¿De
   acuerdo, o hay alguna que sea una regresión disfrazada de nivelado?
3. **La extinción prudente al 26,7 %.** Se ha escrito que «es §1b funcionando».
   ¿Lo es, o es que el asedio muerde demasiado pronto?
4. **Que la política de referencia elija lo que más mata** (`raiders_coming:wait`).
   ¿Es un hallazgo sobre el juego, o un defecto de `prudent` que invalida medio
   banco de medidas?

Si algo de la parte 1 te parece mal medido o mal contado, dilo **antes** de tocar
código. Vale más eso que la tarea.

---

## Parte 3 · La tarea: el disparo único

### El problema, en una frase

**Todo lo que el asedio hace está en el motor y nada de ello se ve, y el
obstáculo no son los clips: es que la pantalla no sabe tocar un clip que ocurra
en un instante.**

### Los tres hechos, verificados en el código

1. **Ocho de los doce clips del juego no se hicieron nunca en Blender.**
   `src/render3d/action-clips.ts` fabrica `sit`, `talk`, `pray`, `hammer`,
   `chop`, `play`, `drink` y `sort` doblando huesos sobre el `idle`, en 76
   líneas. El GLB del aldeano sólo trae cuatro (`idle`, `walk`, `work_hoe`,
   `carry_walk`). **Hay camino para animar sin sesión de arte, y ya se usó**
   (IA-12).

2. **Pero todo lo que ese camino produce son bucles.** `clipTime`
   (`src/render3d/clips.ts:69-78`) tiene exactamente dos modos y **los dos
   terminan en `%`**: o se cicla contra el reloj escénico, o contra la distancia
   andada. No hay un tercer modo. Los doce clips llevan `loop: true`.

3. **Y eso es deliberado, con una razón buena.**
   `src/render3d/world/cast.ts:316-340` empuja el mixer a un **tiempo absoluto**
   (`action.time = seconds; mixer.update(0)`) para que la pose sea *función pura
   del instante*: dos pintados del mismo instante dan la misma pose, y una
   pestaña que despierta no tiene que reproducir nada. **Esa propiedad no se
   toca.**

### La consecuencia

Si mañana llegara `bow_draw` desde Blender, **el juego no sabría tocarlo**: lo
ciclaría contra el reloj escénico y el momento en que la mano se abre no
coincidiría con el instante en que sale la flecha. Y el que cae no puede quedarse
caído, porque `%` lo devuelve al principio.

Por eso E1 no está bloqueada por el arte. Está bloqueada por esto.

### Lo que se pide

> **Un tercer modo: clips que ocurren en un instante y sostienen su última
> pose.** Fase medida desde un instante que la capa de vida ya conoce, sin
> bucle, con la pose final sostenida — y **sin perder** que la pose siga siendo
> función pura del instante.

Y con él, **los tres primeros que el asedio necesita**:

| clip | el instante que ya existe | qué tiene que verse |
|---|---|---|
| **tensar** (`bow_draw`) | `DRAW_STEPS` en `life/archery.ts` | bucle **sostenible** mientras apunta, 1,5 s |
| **soltar** (`bow_loose`) | el paso exacto en que nace la flecha | disparo único de 0,6 s: la mano se abre **en** ese fotograma |
| **golpear el portón** | `life/raiders.ts` lleva los sesenta golpes | el golpe, y que la puerta acuse |
| **caer** | `RaiderPhase.down`, y los nuestros en `life/melee.ts` | disparo único, y **la última pose se queda quieta y creíble** |

**Y de los dos del arco no hay que inventar la duración: ya está elegida.**
`life/archery.ts:88-96` la dejó escrita el 18 sep, y conviene leerla entera
porque te ahorra la mitad del diseño:

> *TUNE: 63 pasos, que a 1/30 son 2,1 segundos escénicos — **la suma exacta de
> los dos clips que el encargo E1 pide**: `bow_draw` (1,5 s, en bucle y
> sostenible) y `bow_loose` (0,6 s). Se elige así para que el día que los clips
> existan no haya que reajustar nada: la cadencia **es** la animación.*

O sea: la mecánica **ya está dimensionada contra clips que no existen**. Lo que
falta es que se puedan tocar.

### Por qué es tuya

Tu propia tabla (`plan-meta.md`, «Dificultad y agente»): dificultad alta es
«diseñar una arquitectura nueva… arte y animación, **decidir cómo se ve algo**».
Esto es las tres a la vez: tocar cómo se decide una pose sin romper la pureza que
ese módulo defiende, autorar movimiento sobre el aparejo que ya existe, y decidir
cuánto dura una caída y en qué pose se queda.

### Lo que se deja fuera, a propósito

- **Las mallas de armas** (E2): no existe ninguna. Es sesión de arte con el
  dueño. Los clips se diseñan sobre las manos vacías que hay.
- **La sangre y el fuego** (E4): **decisión del dueño, y está sin tomar**. Una
  caída sin gore no la necesita; el gore sí. No la tomes tú.
- **El ragdoll**: pide que los cuerpos de la gente sean cuerpos de Rapier, y eso
  es una tanda entera. El encargo lo dice
  (`docs/encargos/encargo-combate.md`).

### Ficheros que tocas

`src/render3d/clips.ts`, `src/render3d/action-clips.ts`,
`src/render3d/world/cast.ts`, y lo que haga falta de `src/render3d/life/` para
que el instante llegue hasta el pintado. Si necesitas tocar otro, dilo en el PR;
no lo hagas.

### Cómo se cierra

La skill `goal` §4, y aquí en concreto:

1. **La medida es una toma del observatorio**, no una captura fija: esto es capa
   de vida. `node tools/graphics/observe-life.mjs`, y con el asalto puesto —
   `?debug=1&live=1&seed=7&year=30&season=summer&raid=24&assault=1` abre un valle
   con la partida encima y la puerta cayendo. Varias semillas, nunca una.
2. **La prueba describe la propiedad**, no la implementación. La que importa:
   que la pose siga siendo función pura del instante —dos pintados del mismo
   instante, la misma pose— **también** para un clip de disparo único.
3. **La puerta**: `npm run typecheck`, `npm run lint` y los ficheros tocados. La
   suite entera sólo al cerrar la tanda.
4. **El papel**: la fila de `plan-meta.md` con lo medido, la entrada en
   `docs/changelog.md` con el porqué, `docs/task-log.md` al día, y **lo que quede
   sin verse se apunta en `docs/encargos-3d.md` en la misma ronda**.

### Dos reglas del dueño que mandan sobre todo lo anterior

- **«Hay que evitar a toda costa estar separado más de media hora haciendo
  pruebas; si las pruebas no son posibles, hay que cambiar cómo las hacemos.»**
- **El nivelado va al final y es suyo.** Si algo de esto pide mover un número de
  `balance.ts`, se pregunta.
