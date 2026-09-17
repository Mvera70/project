# El rework: más azar y más vida — y el plan para quien siga

**15 sep 2026 · lo pidió el dueño del diseño, con estas palabras:** «esto tiene
que ser mucho más aleatorio y con mucha más vida … el ritmo de decisiones
tampoco es algo que afecte mucho, no tiene mucha gracia … probablemente hay que
hacer un rework, pero cargárselo casi entero». Y la premisa de fondo, dicha el
mismo día: un idle **bonito de ver de fondo**, cuya esencia es que **cada valle
salga muy distinto** para que la gente los compare.

**Este documento es el plan de continuación del proyecto.** Lo escribió el
agente con Fable 5.1 la noche del 15 sep 2026, a petición del dueño, para que
**agentes con Opus o Sonnet** sigan sin él: «documenta absolutamente todo lo que
veas … documentación muy muy detallada, pero deja de hacer y dar vueltas». Está
escrito para alguien que no ha visto nada de esto. Léelo entero, después
`CLAUDE.md`, y después las secciones de `docs/design.md` que cada brief cita.

---

## 0. Lo que el dueño ha decidido, en orden, y lo que manda sobre todo

Estas frases son suyas y **ordenan el trabajo**. Cuando dos cosas choquen, gana
la de arriba.

1. **La premisa.** «Un idle donde la aldea sea bonita de ver de fondo … la
   gracia es que la gente pueda comparar entre ellos y ver diferentes aldeas
   porque sean tan aleatorias. Es la esencia en sí.»
2. **El rework.** «Mucho más aleatorio y con mucha más vida … cargárselo casi
   entero.» Las encrucijadas se quedan pero dejan de ser el centro (§2, R-4).
3. **La IA de animales y de personas hay que mejorarla.** «Sobre todo los
   humanos, pero los animales ahora mismo es que están fatal, atraviesan
   paredes, dan vueltas sobre sí mismos.» Es **la tarea siguiente** (§3).
4. **El caos es el juego.** «Que haya caos y que haya partidas que se rompan y
   no se pueda seguir jugando es la idea del juego.» Esto **contradice dos
   puertas que puso R-1** y una prueba; está anotado en §2.6 con el cambio
   exacto, y es lo primero que un agente debe deshacer cuando toque el motor.
5. **Los planes de prueba y el nivelado van después.** «Puedes crear planes de
   testeo más adelante con regulaciones y cambios que mejoren la partida … pero
   eso no es lo prioritario.» Así que **no** se remide la suite de balance, no
   se afinan pesos y no se escriben planes de QA hasta que las fases de §2 y
   §3 estén en pantalla. La puerta de cada cambio sigue siendo la suite rápida
   y las jornadas (`npm run typecheck && npm run test:all && npm run lint`),
   porque son las que impiden romper el motor; nada más.
6. **Cómo juzga.** Mira el juego como un vídeo: **secuencias de capturas**, no
   una suelta. Cada fase se cierra enviándole una secuencia, y **nunca se
   declara nada «sólido»**. Ve él, no tú.
7. **Lo que ya no cuenta:** los hitos humanos 0 y 6 están descartados; el juego
   ya se abrió en su iPad y su iPhone y funciona; el ritmo de decisión no
   importa.
8. **La parada del 17 sep: el juego de los medios.** «Ahora mismo no es nada
   divertido; lo único bonito es mirar cómo avanza el pueblo.» Medido en
   `docs/plan-medios.md`: las palancas de órdenes son una trampa, las
   encrucijadas pesan pero no se sienten, la aldea prospera sola por diseño.
   Lo que manda desde entonces: **el jugador mete cosas en el valle y la aldea
   decide qué hace con ellas** (§4b), con piedra y plata en la mesa, las
   palancas fuera, nada colocado con el dedo, y un mundo que sólo rompe lo que
   el jugador cargó. **Las fases M-0 a M-4 de §4b van antes que R-2, R-5 y
   R-3**, y §3 (la IA) sigue en la otra sesión en paralelo.

---

## 1. El diagnóstico, en tres frases

1. **Todo lo dramático del motor colgaba de las encrucijadas.** Las opiniones
   sólo se movían con efectos de encrucijada; los rencores nacen de opiniones;
   las riñas de rencores; media docena de plantillas exigen rencor. Si las
   encrucijadas salen diez veces en cuarenta años, el valle no tiene historia
   (`docs/findings-drama.md`, medido tres veces).
2. **El azar del valle estaba casi todo en la fundación.** Terreno, dos rasgos
   de cuatro, una fila de clima al año, una peste y un incendio posibles en la
   semana 0. Después, cuarenta años de aritmética.
3. **La vida que se ve es la del trabajo.** La capa de vida (Anexo E) hace que
   la gente ande, trabaje, hable y juegue, y está bien hecha. Lo que no había
   era **cosas que pasen**.

Lo que se conserva porque funciona y está medido: el tick de una semana, la
demografía, la subsistencia, la crónica como claves, la capa de vida, el mapa
grande, el reloj y el cielo de v3.72–3.73, y la determinación por flujos con
nombre. **Lo que se rehace es de dónde sale el drama y cómo se mueve lo que se
ve.**

---

## 2. R-1 · El mundo pasa cosas por su cuenta — **hecho** (v3.75)

Es la primera fase del rework y está en `main`. Lo que sigue es todo lo que hay
que saber de ella para tocarla o para construir encima.

### 2.1 Qué es

Un sistema nuevo del motor, `src/engine/world/fate.ts`, con su flujo de azar
propio (`fate`): **cada semana tira** contra una tabla de doce sucesos, y el que
sale cambia el estado, escribe en la crónica y **se ve**, reutilizando los
efectos visibles de §11.5 (los mismos que las opciones de encrucijada). No hay
decisión que tomar: pasan, como pasa un incendio.

### 2.2 Los ficheros, y qué hace cada uno

| Fichero | Qué | Estado |
|---|---|---|
| `src/engine/world/fate.ts` | `rollFate(state)`: la tirada semanal, los pesos (`weightOf`), y `happen()` que aplica cada suceso | nuevo |
| `src/engine/world/sky.ts` | El cielo decidido en el motor: `skyOfDay`, `skiesOfWeek`, `weekWeather(seed, weatherIndex, tick) → {wet, storms, snow}`. Mismo `hash32`, **no consume tirada** | nuevo |
| `src/derive/weather.ts` | Ahora envuelve a `sky.ts` (`skyAt`); conserva `overcastOf`, `boltsInDay`, `boltPlace` | cambiado |
| `src/engine/balance.ts` | El bloque `FATE` (§12.10) | cambiado |
| `src/engine/state.ts` | `HAPPENINGS`, `HappeningId`, `HappeningRecord {tick, id, visible, who}`, `state.happenings`, `ChronicleKind` gana `'happening'`, `VisualEffect` vive aquí (reexportado desde `crossroads/schema.ts`), `SCHEMA_VERSION = 6` | cambiado |
| `src/engine/rng.ts` | Flujo `'fate'` al final de `RNG_STREAMS` (dorado tras mil tiradas: `1432707347`) | cambiado |
| `src/engine/sim.ts` | Paso **2b** del tick; `TickReport.happening`; los efectos visibles del suceso entran por `locate()` como los de una decisión | cambiado |
| `src/engine/found.ts`, `save.ts` | `happenings: []` al fundar; validador `happeningRecord` al cargar | cambiado |
| `src/derive/gatherings.ts` | Después de las reuniones de decisión, si no hay ninguna, mira los `gather` de `state.happenings` | cambiado |
| `src/engine/chronicle/bank.en.ts` | Claves `fate.<id>` (tres variantes cada una) y `fate.child_lost.named` | cambiado |
| `tools/fate-report.ts` | El informe que fijó los pesos: `npx tsx tools/fate-report.ts [semillas] [--years 40]` | nuevo |
| `tests/fast/fate.test.ts` | Diez propiedades (§2.5) | nuevo |

### 2.3 El paso del tick, literal

§4.2 gana el paso **2b**, entre el bloque anual y la decisión:

```
   2.  ANNUAL       si week == 0: clima del año, peste, incendio, migración, envejecer
   2b. FATE         rollFate(state): si sale un suceso, ya está aplicado; se
                    guarda en state.happenings y su línea va al búfer de crónica
   3.  DECISION     ...
```

En `sim.ts`:

```ts
const fated = rollFate(state);
if (fated !== null) { state.happenings.push(fated.record); say(fated.entry); }
```

y en el `TickReport`, `happening: fated?.record.id ?? null`, con
`visualEffects` = los de la decisión **más** `fated.record.visible.map(effect => ({ effect, ...locate(state, effect, undefined, null) }))`.

### 2.4 La tabla de sucesos, tal como está en el código

`rollFate` primero mira el **rito**: si `FATE.FEAST_IS_A_RITE` y es la semana
`HARVEST_WEEK + 1` con grano y `FEAST_MIN_PEOPLE` personas, la fiesta se celebra
sin tirar y sin respetar el hueco mínimo. Si no: si el último suceso está a
menos de `MIN_GAP_WEEKS`, nada; una tirada de `fate` contra `WEEKLY_CHANCE`; y
un sorteo ponderado entre los sucesos cuyo `weightOf` no es cero.

| `id` | Cuándo puede pasar (`weightOf`) | Peso | Qué hace (`happen`) | Visible |
|---|---|---|---|---|
| `lightning_fire` | semana con `storms > 0`, hay madera en pie (`DISASTER.FIRE_KINDS`, tier 0), **≥ `LIGHTNING_MIN_HOUSES` casas y ≥ `LIGHTNING_MIN_PEOPLE` personas** (ver §2.6) | 3 × jornadas de tormenta | `scarFire` + `destroyBuilding` de un edificio de madera (casas ×3), ánimo −4 | `ruin` |
| `river_flood` | primavera y `wet ≥ FLOOD_WET_DAYS` (3); ×0,5 en `bare_hills` | 3 | −8 % del grano, ánimo −3 | `gather ford` 1 día |
| `wolves_at_the_coop` | invierno y gallinas > 0; ×1,6 `old_forest`, ×0,5 `bare_hills` | 3 | −1 o −2 gallinas, ánimo −1 | ninguno (el corral se vacía) |
| `wedding` | ≥ `WEDDING_MIN_ADULTS` (6) adultos | 0,6 | ánimo +5, fe +2 | `gather chapel` (o `square`) 2 días |
| `pedlar` | verano y leña ≥ 2 × `PEDLAR_WOOD` | 2 | −15 leña, +30 grano | `gather square` 1 día |
| `good_catch` | primavera o verano con `wet ≤ 3` | 2 | +15..35 grano, ánimo +2 | `gather ford` 1 día |
| `roof_under_snow` | invierno, `snow ≥ ROOF_SNOW_DAYS` (2), hay casas | 3 | una casa `blockedUntil = tick + 2`, −15 leña, ánimo −2 | ninguno |
| `harvest_feast` | **rito**, no se sortea | — | ánimo +6, fe +3 | `gather chapel`/`square` 2 días |
| `quarrel_in_the_square` | ≥ 2 nombrados vivos | 1 | los dos nombrados que peor se llevan: opinión mutua −12, ánimo −1; **`who` guarda sus `id`** | `gather square` 1 día |
| `bear_in_the_wood` | verano u otoño, y (`old_forest` o `forestLeft ≥ 0.2`); ×2 `old_forest` | 0,6 | `flags.bear = tick + 2`, ánimo −3 | ninguno |
| `child_lost` | hay niños | 0,5 | ánimo −3; si el niño es nombrado, clave `.named` y `who` | `gather ford` 1 día |
| `stranger_passes` | salvo `flags.hostile` | 1 | ánimo +1 | `gather square` 1 día |

Cada suceso consume azar **sólo** del flujo `fate` (hay prueba). El cielo de la
semana lo da `weekWeather`, que no consume nada.

### 2.5 Lo medido, con las puertas del rayo fuera (v3.76)

`npx tsx tools/fate-report.ts 3 7 11 23 31 41 53 67 79 83 89 97` con doce
semillas × cuarenta años, jugadas con `run` y la política prudente (nunca con
`tick` a secas, ver `CLAUDE.md`). Doce semillas y no seis, porque a partir de
aquí la varianza —cuántas se rompen, cuántas siguen— es el objetivo del
diseño, no ruido a promediar:

| Semilla | Sucesos | Años jugados | Al año | Mediana entre dos | Rencores | Fin |
|---|---|---|---|---|---|---|
| 3 | 138 | 11 | 12,5 | 3 semanas | 2 | abandoned |
| 7 | 101 | 9 | 11,2 | 3 | 2 | extinction |
| 11 | 522 | 40 | 13,1 | 3 | 2 | sigue |
| 23 | 244 | 19 | 12,8 | 3 | 2 | abandoned |
| 31 | 71 | 7 | 10,1 | 3 | 0 | abandoned |
| 41 | 462 | 40 | 11,6 | 3 | 2 | abandoned |
| 53 | 493 | 40 | 12,3 | 3 | 2 | sigue |
| 67 | 502 | 40 | 12,6 | 3 | 4 | sigue |
| 79 | 513 | 40 | 12,8 | 3 | 2 | sigue |
| 83 | 134 | 10 | 13,4 | 3 | 2 | abandoned |
| 89 | 20 | 3 | 6,7 | 4 semanas | 0 | extinction |
| 97 | 329 | 27 | 12,2 | 3 | 2 | abandoned |

**8 de las 12 acaban antes de los cuarenta años** (6 `abandoned`, 2
`extinction`); las otras 4 (11, 53, 67, 79) siguen. Es la medida de §2.6: el
rayo sin puertas puede quemar la única casa de la pareja en la primera semana,
y una aldea de dos no siempre se recupera. 3 529 sucesos en 286 años de aldea:
**12,3 al año**, mediana de tres semanas entre dos —el ritmo apenas cambia
respecto a la segunda vuelta—, rencores casi siempre en 2 por partida (0 en las
dos que no llegan a los ocho años, 4 en la 67).

Reparto por suceso (mismo orden de semillas que la tabla de arriba):

| Suceso | Al año | Por semilla (3, 7, 11, 23, 31, 41, 53, 67, 79, 83, 89, 97) |
|---|---|---|
| stranger_passes | 3,57 | 47 25 100 84 34 138 153 145 139 42 7 107 |
| quarrel_in_the_square | 2,96 | 22 29 75 53 3 151 121 171 123 14 4 80 |
| good_catch | 2,26 | 31 19 72 51 13 91 91 99 83 31 1 63 |
| bear_in_the_wood | 1,55 | 20 19 54 33 5 47 78 44 67 23 1 51 |
| pedlar | 0,43 | 7 4 16 8 5 18 13 20 16 5 1 9 |
| **lightning_fire** | **0,32** | **4 2 37 3 4 4 5 7 15 6 1 3** |
| wolves_at_the_coop | 0,28 | 2 0 44 3 2 3 5 3 10 2 1 4 |
| harvest_feast | 0,29 | 0 0 39 0 0 0 3 1 39 0 1 0 |
| river_flood | 0,27 | 3 3 7 3 3 8 17 7 15 3 0 9 |
| child_lost | 0,23 | 0 0 39 3 0 0 3 3 6 8 3 0 |
| wedding | 0,10 | 0 0 27 0 0 0 2 0 0 0 0 0 |
| roof_under_snow | 0,10 | 2 0 12 3 2 2 2 2 0 0 0 3 |

Distancia media entre valles (0 iguales, 1 nada en común): **0,22** (antes,
con las puertas, 0,16): más alta porque ahora ocho historias se cortan en seco
en años distintos, no sólo por el reparto de sucesos que sí llegan a jugarse.

Lo que se ve en la tabla y **no se ha tocado** (decisión 5): el rayo ya sale en
**las doce** semillas, incluida la 97 que antes no tenía ninguno —sin puertas
no necesita dos casas ni cuatro personas, y por eso ahora es el suceso que
decide si una aldea llega a los cuarenta años o no—; la boda, en cambio, sigue
siendo rara (sólo 11 y 53 llegan a los seis adultos que pide), que es la otra
cara de la misma clase de diferencia que la premisa pide: un valle que crece
tiene bodas, uno que no las pasa mal, no las tiene nunca. Si alguien quiere
mover pesos: `FATE.WEIGHT` en `balance.ts`, el informe de arriba antes y
después, y las diez propiedades de `tests/fast/fate.test.ts` son la red.

Las tres vueltas de pesos, para no repetirlas: (1) forastero 3 y oso siempre
posible → la mitad del libro eran los dos, y la fiesta salía una vez cada
veinte años porque una semana al año casi nunca coincidía con el sorteo → la
fiesta pasa a rito; (2) riña 2 y boda 1 → una entrada de cada cuatro era riña y
había boda cada nueve meses → riña 1, boda 0,6 con seis adultos; (3) la de
arriba. Ninguna de las tres tocó `LIGHTNING_MIN_HOUSES`/`LIGHTNING_MIN_PEOPLE`:
esas dos puertas se quitaron aparte, en v3.76, por la decisión de §2.6.

### 2.6 Las dos puertas que contradecían al dueño — **hecho** (v3.76)

En la primera medida el rayo quemó la única casa de la pareja y **tres aldeas
de seis murieron antes del año treinta**. El agente puso dos puertas —
`FATE.LIGHTNING_MIN_HOUSES = 2` y `FATE.LIGHTNING_MIN_PEOPLE = 4` en
`balance.ts`, leídas en `weightOf` para `lightning_fire`— y una prueba, «el
mundo sigue en pie con los sucesos dentro» en `tests/fast/fate.test.ts`, que
exige que las seis semillas lleguen al año treinta.

**El dueño dijo después que eso es al revés:** «que haya caos y que haya
partidas que se rompan y no se pueda seguir jugando es la idea del juego». Las
dos puertas se quitaron en v3.76, en los cuatro pasos que esta sección
describía como pendientes:

1. **Quitadas.** `weightOf` para `lightning_fire` se quedó en
   `ctx.sky.storms > 0 && wooden(state).length > 0`, sin mirar cuántas casas ni
   cuánta gente hay; las dos constantes salieron de `FATE` en `balance.ts`, con
   sus comentarios.
2. **La prueba, dada la vuelta.** «El mundo sigue en pie con los sucesos
   dentro» pasó a llamarse «el caos es el juego: unos valles se rompen y otros
   no», en `tests/fast/fate.test.ts`. Mide, en doce semillas a cuarenta años,
   que entre 3 y 11 acaben (medido: **8**) y que al menos una siga; que la
   partida que acaba tenga su causa en la crónica (`kind: 'extinction'` o
   `'abandonment'`); y que lo que no es protección —grano nunca negativo, ánimo
   entre 0 y 100, gallinas nunca negativas— se mantenga.
3. **`tests/journeys/founding.test.ts` remedido en doce semillas.** Su cota de
   «ninguna pareja se extingue» y las otras tres que colgaban de que las seis
   semillas viejas llegaran siempre a los cuarenta años se movieron; los
   números y el motivo de cada una están en el propio fichero y en el informe
   de este trabajo. Ninguna se borró y el motor no se tocó para hacerlas pasar.
4. **Remedido y documentado.** La tabla de §2.5 es la de doce semillas con las
   puertas fuera; `docs/changelog.md` tiene la fila 3.76; `docs/design.md`
   §7.10 y §12.10 ya no dicen que las puertas están pendientes de quitar.

**Lo medido, la pregunta que abrió esto:** de doce semillas a cuarenta años,
**8 acaban** (6 `abandoned`, 2 `extinction`) y **4 siguen** (11, 53, 67, 79);
una de las que siguen, la 67, llega con una sola persona. El rayo ya sale en
las doce semillas —antes, con las puertas, sólo en las que ya tenían dos casas
y cuatro personas—, y es él quien decide casi siempre si una aldea llega a los
cuarenta años: quien pierde su única casa pronto rara vez tiene tiempo de
levantar otra antes de que la siguiente tormenta encuentre algo que quemar.
Es la propiedad que el dueño pidió, medida: el caos rompe partidas, y las que
no rompe, las hace suyas.

### 2.7 Lo que R-1 movió en las pruebas, y por qué (las trampas nuevas)

R-1 cambia la trayectoria de toda partida —una riña, un rayo, un buhonero
mueven grano, ánimo y opiniones— así que **la aldea de veinte años de la
semilla 7 ya no es la de antes**: tiene 16 personas en vez de unas 40, y sus
cinco nombrados tienen todos oficio. Doce pruebas se movieron. Ninguna bajó el
listón sin escribir el motivo; están aquí para que nadie las «arregle» de
vuelta:

- **`tests/fast/animals.test.ts` y `life-staging.test.ts`:** su `village()`
  fundaba con `foundGame` (la pareja) y esperaba granero a los veinte años.
  Ahora usan `foundTwenty` (`tests/helpers/founding.ts`): son pruebas de
  mecánica sobre una aldea hecha, no de fundación.
- **`tests/fast/daylife.test.ts`, «ni todos salen de casa en el mismo
  instante»:** comparaba las 0,08 con las 0,2 de la jornada, y a las 0,2 **ya
  ha salido todo el mundo por construcción** (`DAY.LEAVE_SPAN = 0.13`); pasaba
  sólo cuando alguien con el campo pegado a casa ya había llegado. Ahora
  compara las 0 con las 0,08 en tres semanas: alguien fuera y alguien dentro.
- **`daylife.test.ts`, «dos que se detestan trabajan más lejos»:** tres causas
  encadenadas. (a) Dos que trabajan **en la misma celda** se apartan del mismo
  punto en el que están anclados y la correa de v3.13 (`DAY.MAX_DRIFT = 2.4`)
  los devuelve al mismo sitio: distancias idénticas. (b) Los nombrados con
  oficio van a su **taller** (`workdayPaths` en `render/crowd.ts`, privado), no
  a donde `routesFor` los manda; el herrero y el cura de la semilla 7 estaban a
  8,6 celdas y el rechazo sólo actúa dentro de `ENCOUNTER.RANGE` (4,5). (c) A
  las 0,35 los dos elegidos estaban **parados hablando con un tercero** (uno
  hasta las 0,416, otro hasta las 0,38) y hablando se está donde está la charla.
  Ahora la pareja se elige entre adultos **sin oficio** por puesto de trabajo a
  entre 1 y `ENCOUNTER.RANGE` celdas, y se compara la **media** de las 0,30 a
  las 0,65.
- **`daylife.test.ts`, `workweek()`:** pone `state.happenings = []`, porque una
  boda esa semana junta a todo el mundo en la plaza y estas pruebas miden la
  jornada de trabajo.
- **`tests/fast/trade.test.ts`, la sal:** la sal salva una cabeza cuando el
  déficit cae donde `ceil(d/25)` y `ceil(d/33.75)` difieren, o sea entre 25 y
  33,75 de déficit con cerdos; con 16 personas el déficit semanal nunca pasa de
  16. Con gallinas (2 de carne, 2,7 saladas) el hueco se repite cada pocos
  celemines. El barrido va de 0 a la demanda, de uno en uno.
- **`life-staging.test.ts`, V-11 «la aldea se junta donde la decisión dijo»:**
  medía cada jornada por separado contra 0,75, y una jornada no fija un umbral
  (`CLAUDE.md`). Ahora: por sitio, las cuatro semillas juntas ≥ 0,75 (medido
  0,89–0,90) y cada muestra ≥ 0,6 (la peor: la plaza en la semilla 23, 25 de
  35).
- **`notice.test.ts`:** la cota de avisos sube de 0,25 a 0,5 por semana, porque
  los sucesos también avisan. **`quarrels.test.ts`:** riñas de §7.9 por año, de
  0,01 a 0,015 (medido 0,42–0,58). **`reactions.test.ts`:** limpia
  `happenings` en sus dos aldeas. **`chronicle.test.ts`:** la prueba de render
  de 5 000 claves pasa `wood: 15`. **`rng.test.ts`:** dorado de `fate`.
- **Fixtures** de chronicle/crossroads/opinions/subsistence/demography/people y
  `tests/helpers/catalogue-bench.ts`: `happenings: []`.

### 2.8 Lo que R-1 deja sin hacer

- **Nueve jornadas rojas, y son de R-1.** La suite rápida está verde (69
  ficheros, 1 086 pruebas). `npm run test:journeys` da **107 verdes y 9 rojas**
  (231 s), todas por la trayectoria nueva —la pareja crece menos con sucesos
  encima, y las reuniones de los sucesos cambian lo que la capa de vida hace
  ese día—. No se tocaron porque el dueño pidió parar y documentar. Son, con
  la causa que se lee en el mensaje:
  1. `founding.test.ts` «a los diez años es una aldea en la mayoría de los
     valles»: población a los diez años por semilla 7: 9, 11: 12, 23: 4, 31: 4,
     41: 13, 97: 8; pide ≥ 4 valles con aldea y hay 2. **La pareja con sucesos
     encima crece menos** (niño perdido, riña, rayo cuando llega a dos casas).
     Es también lo que la decisión 4 del dueño quiere (caos): la cota es lo
     que hay que remedir en doce semillas, no el motor.
  2. `notice` «el valle no habla catorce veces al año»: 14,1 avisos al año en
     la semilla 7, cota 6. Los sucesos avisan; o los avisos de suceso se
     agrupan (uno por semana como mucho, `src/derive/notice.ts` o donde esté
     `noticesAt`), o la cota sube con el motivo escrito.
  3. V-06 «la aldea hace cosas, y no todos la misma», semilla 11: ese día sólo
     se hace `gather`. Una reunión de suceso ocupa la jornada; la prueba debe
     fundar con `happenings = []` o elegir un día sin reunión.
  4. V-06 «nadie acaba dentro de una pared, con la aldea entera suelta»,
     semilla 23: «no hay aldea», 11 personas y pide > 20. Aldea más pequeña;
     la prueba debe usar `foundTwenty` o más años.
  5. V-08 «existe al menos una escena persona-animal», semilla 3: nadie se
     acercó a ninguno de 20 animales. Reunión de suceso ese día, o §3.
  6. V-09 `drop()` «el punto de partida no estaba en un bloqueo»: el edificio
     que la prueba usa como bloqueo ya no está donde estaba.
  7. V-09 «se juega de verdad en todas las semillas»: 4 de 6, pide 5.
  8. V-09 «sin una sola aldea muda», semilla 11: nadie jugó en 10 jornadas.
  9. V-09 «tres veces seguidas»: 2, pide 3.
  Las cuatro de V-09 son la pelota de los niños en aldeas más pequeñas y con
  días de reunión; se atacan juntas con 3 y 4: el helper de esas pruebas funda
  con `foundTwenty` y limpia `happenings`.
- **Playwright y la demo.** `npm run test:shots` no se volvió a pasar tras R-1 y la demo
  publicada (https://claude.ai/artifact/CbbvpwDfa5NUoog9E7XiMK, versión 14) es
  de antes. Para publicar: `npx tsx tools/graphics/bundle-game.ts --split` y el
  Artifact con esa URL (`docs/next-plan.md` §4). Y la **secuencia de capturas
  con un suceso** que el dueño espera: `npm run serve:shots` y
  `node tools/graphics/shot.mjs --page http://127.0.0.1:8127/valley.html --seed 7 --settle 20 --sequence 12 --every 0.8`
  en una semana de boda o de rayo (busca el tick en `state.happenings` con
  `tools/fate-report.ts` o un guion de tres líneas, y llega hasta él con
  `runToSky`/`fastForward` de `src/ui/debug.ts`).
- **Las escenas de los sucesos** (R-5): hoy un suceso «se ve» porque junta a la
  aldea o arruina un edificio; el corro del incendio, la boda con los dos en
  medio, el mercado del buhonero, no existen todavía.
- **La suite de balance** (37 aserciones de §12.9) mide un juego sin sucesos y
  **no se remide** hasta que el dueño lo pida (decisión 5). `npm run
  test:balance`, aparte, 25 minutos.
- **§2.6.**

---

## 3. La IA de animales y de personas — **lo siguiente**, brief para Sonnet u Opus

El dueño: «los animales ahora mismo es que están fatal, atraviesan paredes, dan
vueltas sobre sí mismos». Lo de abajo es el diagnóstico leído en el código, no
medido en pantalla: **lo primero es medirlo** (§3.4), y después arreglar en el
orden de §3.5.

### 3.1 Dónde vive todo

`src/render3d/life/` (4 549 líneas). Antes de tocar nada, **lee E.1, E.3, E.6 y
E.7 del Anexo E** de `docs/design.md` (el diagnóstico, los seis innegociables,
por qué la demo era peor que el descarte, las trampas). Los ficheros que
importan aquí:

| Fichero | Qué |
|---|---|
| `body.ts` | `Body {x, z, vx, vz, facing, radius, pace}`, `Terrain {width, height, blocked: Uint8Array}`, `blockedAt(land, x, z)`, **`integrate(body, land, seconds)`** (línea 68), `turnTo(body, heading, seconds)` (91, `TURN_RATE = 6` rad/s) |
| `terrain.ts` | `terrainOf(state)`: la máscara de celdas cerradas —agua, roca, montaña, lago— y los edificios de `WALLED` (`house, stone_house, granary, chapel, church, smithy, mill, watchtower, palisade, wall`; **los campos no**). Se rehace una vez por jornada escénica |
| `steering.ts` | `seek(body, to)`, `separate(body, around)` (`ELBOW = 0.25`), **`avoid(body, land)`** (87: empuje suave desde las celdas cerradas a menos de `radius + WALL_CLEAR`), `resolve(...)` (137: colisión cuerpo a cuerpo), `drive(body, want)` (239: `EASE = 0.22`, tope `pace × 1.6`) |
| `navigate.ts` | `pathTo(land, from, to)` A* por celdas (126), `clearBetween` (108: línea recta sin celdas cerradas), `Router` con caché (215), **`follow(body, route)`** (253, `REACHED = 0.45`) |
| `decide.ts` | **`decide(who, places, taken, land, router, seed, step)`** (209): puntúa ofertas a menos de `LOOK = 5` celdas (×2, ×4 si la oferta tiene hora), prueba las `TRY = 4` mejores, y **si ninguna tiene ruta devuelve `who.doing` tal cual** (la intención vieja, aunque sea inalcanzable). `RETHINK = 45` pasos. `satisfy` (293) |
| `offers.ts` | `OFFERS` (el catálogo: id, `gives`, `seconds`, `seats`, `reach`, `hours`, `spots`), `doorOf(land, x, z, w, h)` (164: el punto de pie delante de un edificio, probando abajo/izquierda/derecha/arriba a `0.32 + WALL_CLEAR + 0.25` del muro), `seatAt(offer, seat)` (413) |
| `needs.ts` | Los seis impulsos `rest, thirst, company, boredom, irritation, duty`, `RISE` por segundo (sed `1/110`), `TEMPER` por rasgo |
| `beasts.ts` | **Los animales**: `RADIUS {hen 0.14, pig 0.24, cow 0.4}`, `PACE {0.55, 0.4, 0.32}`, `BEAST_RISE`, `SELF_OFFER` (una sola oferta propia con un asiento en el ancla: `peck`/`root`/`graze`, `reach` 1,0–1,3), `createBeasts` (el ancla: `doorOf` de su casa o campo más un empujón de 1,4 celdas en un ángulo al azar, o la puerta si cae en celda cerrada), **`stepBeasts`** (el bucle por paso) |
| `village.ts` | `createVillage(state, day)`, el `Dweller` (`doing: Intent | null`, `needs`, `scene`, `holding`, `rethinkAt`), el bucle de las personas, `GIVE_UP = 600` pasos, y un **tally por jornada** (línea ~350: `'nada' | 'andando' | offer.id`) que ya existe para medir |
| `scenes.ts`, `staging.ts`, `places.ts`, `props.ts`, `cast.ts` | Escenas a dos (charla…), las órdenes del motor bajadas a la jornada (V-11), los sitios, los trastos, el reparto |
| `clock.ts` | `LIFE_STEP` (paso fijo), 3 600 pasos por jornada de 120 s |

### 3.2 Por qué atraviesan paredes (diagnóstico de lectura)

1. **`integrate` mueve un punto, no un círculo.** Comprueba `blockedAt` sólo en
   el **centro** del cuerpo, eje a eje (`body.ts:72-73`). Un cuerpo de radio
   0,4 (vaca) o 0,32 (persona) puede tener el centro en una celda libre y **la
   mitad del cuerpo dentro del muro**. `avoid` intenta impedirlo, pero es un
   empuje suave sumado a `seek` y filtrado por `drive` con `EASE = 0.22`: cuando
   el punto de ruta está pegado a una pared (los waypoints de `pathTo` son
   centros de celda, a 0,5 del muro), `seek` gana y el centro se desliza por el
   borde de la celda cerrada con el cuerpo metido en la pared.
2. **La malla es más grande que el radio.** El radio de colisión de una vaca es
   0,4 celdas; su malla (`render3d/`, los animales de G-10/V-08) mide más de una
   celda de largo. Aunque el círculo no toque el muro, la malla lo atraviesa.
   Lo mismo con las personas (0,65 celdas de alto, 0,32 de radio: el hombro
   entra en la pared).
3. **Las esquinas se cortan.** `clearBetween` (`navigate.ts:108`) traza una
   línea entre centros sin tener en cuenta el radio; entre dos celdas cerradas
   en diagonal la línea pasa por la esquina y el cuerpo también.
4. **Lo que no está en `WALLED` no es pared.** Compara la lista con los
   `kind` de `Building` en `src/engine/state.ts`: si `well`, `grave_yard`,
   `sawmill` o cualquier edificio nuevo no está, se cruza. Es probable que no
   sea la causa principal, pero es de un minuto comprobarlo.
5. **El ancla del animal puede caer pegada a un muro** (`anchorOf` en
   `createBeasts`: la puerta más 1,4 celdas en un ángulo al azar; si cae en
   celda cerrada, **la puerta misma**, que está a 0,82 del muro). Un cerdo de
   radio 0,24 con el ancla a 0,82 y `reach × 0.6 = 0.66` de llegada pasa el día
   apretado contra la pared, con `avoid` y `seek` tirando en sentidos opuestos.

### 3.3 Por qué dan vueltas sobre sí mismos

1. **`turnTo` sigue la velocidad en cuanto pasa de 0,05** (`stepBeasts`:
   `if (speed > 0.05) turnTo(body, atan2(vx, vz))`). Cuando un animal está
   apretado —contra un muro (3.2.5), o contra otros animales del mismo ancla
   (`separate` con `ELBOW = 0.25` y `HENS_PER_HOUSE` gallinas en la misma
   puerta)— su velocidad oscila alrededor de cero cambiando de sentido cada
   paso, siempre por encima de 0,05, y el `facing` gira a 6 rad/s detrás de
   ella: **eso es la vuelta sobre sí mismo**.
2. **Una intención inalcanzable no se suelta.** `decide` devuelve `who.doing`
   cuando ninguna de las `TRY` opciones tiene ruta; el animal sólo tiene una
   oferta (`self`, un asiento, en el ancla), así que si el asiento está en
   celda cerrada o `router.to` falla, conserva la misma intención hasta
   `GIVE_UP = 600` pasos (20 s), replantea, y vuelve a la misma.
3. **Llegar y quedarse no para el motor.** Al llegar (`there = true`) `want` es
   cero pero `separate` y `avoid` siguen empujando; con varios animales en un
   ancla de un solo asiento (todos tienen `seats: 1` pero `noSeats` está
   siempre vacío en `stepBeasts`, así que **todos comparten el mismo asiento**)
   se empujan entre sí sin fin.

### 3.4 Cómo medirlo antes de tocar nada (una tarde, Sonnet)

Escribe `tools/life-report.ts` (o una prueba en `tests/fast/life-motion.test.ts`
con `it.fails` si no llega) con este esqueleto, jugado sobre **varias
semillas y varias jornadas** (una jornada no fija un umbral):

```ts
const state = foundTwenty(seed); run(state, 12 * 48, 'prudent', CATALOG);
const life = createVillage(state, day);           // src/render3d/life/village.ts
const land = terrainOf(state);                    // src/render3d/life/terrain.ts
while (life.steps < 3600) {
  life.step();
  if (life.steps % 30 === 0) for (const d of [...life.dwellers, ...life.beasts.map(b => b.dweller)]) {
    const b = d.body;
    // 1 · dentro de un muro: el centro, y el círculo (cuatro puntos a radio)
    // 2 · vueltas: cambio de `facing` por segundo mientras speed < 0.1
    // 3 · parados con hambre de algo: doing === null && max(needs) >= 0.9
  }
}
```

Cuenta, por jornada: cuerpos con el centro en celda cerrada (tiene que ser
**0**), cuerpo-pasos con algún punto del círculo en celda cerrada, giros de
más de π/2 en un segundo con velocidad casi nula, y segundos-de-dweller con
`doing === null` y un impulso ≥ 0,9. Escribe los números en este documento
(§3.6) antes de cambiar nada, y otra vez después.

**Lo ya visto una vez**, sin haberlo buscado: en la semilla 23, jornada 0,
paso 2 400, con la aldea convocada a la plaza, **6 de 35 personas tenían
`doing === null` sin escena, con sed 1,0 e irritación 1,0**. No encontraron
ninguna oferta que valiera la pena a `LOOK` celdas, o ninguna con asiento
libre, o ninguna con ruta. Es el síntoma humano que el dueño llama «IA».

### 3.5 Qué arreglar, en orden, y con qué criterio

> **Estado (v3.76): los puntos 1, 3 y 6 están hechos y medidos** (§3.6).
> Quedan el **2** (un ancla que no se alcanza se cambia, y `SELF_OFFER` con
> varios sitios y asientos de verdad), el **4** (que nadie se quede parado con
> un impulso al máximo: oferta de reserva siempre alcanzable, y el pozo y la
> orilla con muchos asientos) y el **5** (la malla y el radio se corresponden,
> que es trabajo de `render3d/` y no de `life/`). Son la ronda siguiente.

1. **El círculo colisiona, no el punto** (`body.ts`, `integrate`). Al mover en
   X, comprueba `blockedAt(nextX ± radius, z)`; al mover en Z, lo mismo. Y en
   `navigate.ts`, `clearBetween` con el radio (dos líneas paralelas a ±radio, o
   rechazar el atajo si alguna celda diagonal adyacente está cerrada). Criterio:
   cuerpo-pasos con el círculo en muro → 0, y ningún cuerpo con el centro en
   celda cerrada. Cuidado con la trampa de E.7: los cuerpos que **nacen** en
   celda cerrada (el ancla, la puerta de V-11 que caía dentro de la capilla)
   tienen que poder salir; resuélvelo al crear (`createBeasts`, `anchorOf`:
   busca la celda libre más cercana con `reachableFrom`), no en `integrate`.
2. **Un ancla que no se alcanza se cambia** (`beasts.ts`, `stepBeasts` +
   `decide.ts`). Si `decide` no encuentra ruta a `self`, en vez de conservar la
   intención: nuevo ancla = celda libre más cercana a la casa (`reachableFrom`),
   y que `SELF_OFFER` tenga **`spots`**: tres o cuatro puntos alrededor del
   ancla (a 0,8–1,5 celdas, todos en celda libre), para que un cerdo hoce por
   el corral y no vuelva siempre al mismo punto. `seats` = número de spots, y
   **pasa `noSeats` de verdad** (cuenta los asientos ocupados, como hace
   `village.ts` para las personas) para que dos vacas no compartan sitio.
3. **La cara sólo sigue al cuerpo cuando el cuerpo anda** (`stepBeasts`, y el
   equivalente de las personas en `village.ts`): `turnTo` sólo si
   `speed > 0.25 × pace` **y** `travelled > 0.3` celdas en la misma dirección;
   y cuando `there === true`, poner `vx = vz = 0` antes de `drive` salvo el
   `separate` mínimo. Criterio: giros de más de π/2 por segundo con velocidad
   casi nula → menos del 2 % de los cuerpo-segundos.
4. **Que nadie se quede parado con un impulso al máximo** (`decide.ts`,
   `village.ts`). Cuando `decide` devuelve `null`, dale al dweller una oferta
   de reserva **siempre alcanzable**: pasear alrededor de donde está (un
   `Place` efímero con `spots` a 1–2 celdas) o sentarse. Y para la sed: que el
   pozo y la orilla del río sean sitios con **muchos asientos** (`seats` alto o
   `spots` a lo largo de la orilla), porque una reunión de treinta y cinco los
   deja sin asiento a la vez. Criterio: `doing === null` con impulso ≥ 0,9 →
   menos del 5 % de los dweller-segundos.
5. **La malla y el radio se corresponden** (`render3d/`, los animales y el
   aldeano): o el radio de colisión sube al tamaño de la malla (vaca ~0,5,
   persona 0,35) o la malla se escala al radio. Mira `D.6.2` (un aldeano mide
   0,65 celdas) antes de decidir; el dueño ve la escala en las capturas.
6. **`WALLED` completo** (`terrain.ts`): un minuto, y una prueba que compare la
   lista con los `kind` de `state.ts` que tienen paredes.

Cada punto es un commit con su medida de §3.4 antes y después, y **al final una
secuencia de capturas para el dueño** con animales delante de una casa
(`--seed 7 --settle 20 --sequence 12 --every 0.8`). Lo que no llegue, se deja
como `it.fails` con la medida, no se baja el listón.

### 3.6 Medidas · hecho (v3.76)

`npx tsx tools/life-report.ts 3 7 11 23 41 97 --days 4`, sobre personas **y**
animales a la vez: seis semillas × cuatro jornadas = **92 160 cuerpo-segundos**
por columna. El «antes» es la capa de vida de `main` medida con el mismo
informe (los seis ficheros revertidos y restaurados después), así que las dos
filas son la misma medida sobre el mismo mundo y se pueden comparar.

| | Centro en muro | Círculo en muro | Giros > π/2 parado | Parados con impulso ≥ 0,9 |
|---|---|---|---|---|
| **antes** | 0 | 1 211 · **1,31 %** | 4 377 · **4,75 %** | 182 · 0,20 % |
| **después** | 0 | 91 · **0,10 %** | 313 · **0,34 %** | 174 · 0,19 % |

**Las dos cosas que el dueño ve bajan un orden de magnitud**: atravesar paredes
de 1,31 % a 0,10 % de los cuerpo-segundos (trece veces menos), y dar vueltas
sobre sí mismo de 4,75 % a 0,34 % (catorce veces menos). Por semilla, la peor
era la 23 con el 3,87 % de los cuerpo-segundos dentro de un muro; ahora es la
misma con el 0,24 %.

**Los parados con un impulso al máximo no se mueven, y es lo correcto:** de
0,20 % a 0,19 %. Ése es el punto 4 de §3.5, que no entraba en esta ronda —lo
que falla ahí no es la colisión ni el giro, sino que `decide` conserva una
intención inalcanzable y no hay oferta de reserva—. Queda para la siguiente,
con la medida ya escrita y el informe listo para volver a pasarlo.

**Lo que queda por debajo de cero no está a cero, y no se ha bajado el listón
para disimularlo:** el 0,10 % que sigue metiéndose en un muro es, casi todo, de
cuerpos que **nacen** dentro de uno (el ancla de un animal, el punto de
reunión que cae dentro de un edificio) y tardan unos pasos en salir. Es la
trampa de E.7, y arreglarla de verdad es el punto 2 de §3.5: el ancla se busca
en celda libre al crear, no se corrige al andar.

---

## 4. Las fases que quedan del rework, con brief

Orden: **§3 primero** (el dueño), después R-2 y R-5 juntas (son la misma
capa), después R-3. R-4 no es trabajo. Cada fase: rama desde `main`, la puerta
del módulo, commit en español con las medidas, `git branch -f main <rama>` y
`git push origin main` (el dueño quiere todo en `main`, ya), rebundle y
publicación de la demo, secuencia de capturas para él.

### R-2 · Gente distinta, visiblemente

**Qué.** Los ocho rasgos existen (`TEMPER` en `needs.ts` multiplica cómo sube
cada impulso) y deciden poco que se vea. Que decidan.

**Dónde y cómo.**

1. **La riña de §7.9 llega a la capa de vida.** Dos caminos, y los dos son
   pequeños:
   - La riña de R-1 (`quarrel_in_the_square`) **ya guarda los `id`** de los dos
     en `state.happenings[n].who`. `life/staging.ts` puede leer, para la
     semana en curso, un `happening` con `id === 'quarrel_in_the_square'` y
     `who.length === 2`, y montar una escena a dos (`scenes.ts`, como `chat`
     pero con `beat` de gritos y los dos frente a frente en la plaza) para esos
     dos `villager` durante la reunión de `gather square`. No hace falta tocar
     el motor.
   - La riña del motor (`quarrelOf` en `src/engine/people/quarrels.ts` o donde
     esté; búscala por `templateKey.startsWith('quarrel.')`) guarda **nombres**
     en `params`. Añade a sus `params` `aId` y `bId` (números; el banco los
     ignora) y `render/reactions.ts` y `staging.ts` pueden leerlos. Es un cambio
     del motor **sin tirada nueva**, así que no mueve el determinismo. Decisión
     3 del dueño en `docs/roadmap.md`.
2. **Un rasgo, una ocupación que se ve.** Para cada rasgo de `TEMPER`, una
   preferencia de oferta en `decide.ts` (`worth`, que ya recibe `traits`): el
   perezoso puntúa ×1,5 el banco (`rest`), el devoto ×1,5 la capilla, el
   pendenciero ×1,3 las charlas y ×0,7 el trabajo, el curioso ×1,5 el vado…
   Mide con el tally de `village.ts` (línea ~350) cuántos segundos pasa cada
   rasgo en cada oferta, en seis jornadas de tres semillas, y guárdalo en
   `tests/fast/life-traits.test.ts`: la propiedad es «el perezoso descansa al
   menos el doble que el resto», no «la constante vale 1,5».
3. **Los niños juegan y los viejos se sientan a la puerta.** Las ofertas
   existen a medias (`playedUntil` en el `Dweller`, `DAY.CHILD_ENERGY` en el
   camino viejo); en la capa de vida, una oferta `play` con `spots` delante de
   la casa y `hours` de día, y `sit` a la puerta para los mayores de
   `DAY.ELDER_OVER`.

**Criterio de terminado.** Una secuencia de capturas en la que se distinguen
tres personas por lo que hacen sin leer nada; la prueba de tally; la riña
vista en la plaza en una captura.

### R-5 · Más vida en la pantalla (con R-2)

**Qué.** Escenas para los sucesos de R-1 y ocupaciones sin suceso.

**Dónde.** `scenes.ts` (escenas a dos o más), `staging.ts` (lo que el motor
manda, ahora también `state.happenings`), `props.ts` (trastos: ya hay cubos,
leña…), `offers.ts` (el catálogo), `effects/` en `render3d/` para lo que no es
un cuerpo (humo, banderines).

1. **El corro del incendio.** Con `lightning_fire` esa semana (o el incendio de
   §5.9: un edificio con `lostTick === state.tick`): reunión en el solar
   (`reactionsAt` ya la da como `loss`), cubos de `props.ts` en la mano, humo
   en el solar (`effects/`), dos días.
2. **La boda.** `wedding` → dos adultos elegidos **sin tirada** (los dos de más
   edad sin cónyuge, o los dos primeros nombrados; determinista desde el
   estado) en medio de la reunión de la capilla, el resto en corro, y el
   `banner` de §11.5.
3. **El mercado del buhonero.** `pedlar` → una figura extra (un `Dweller` sin
   `villager`, como los animales usan `-1 - id`) con un fardo en la plaza un
   día, la gente pasa por delante (`offer` con `seats` alto y `seconds`
   cortos).
4. **El entierro.** Ya existe la reacción `death` con el cementerio; falta el
   corro quieto con las cabezas bajas (una escena `mourn` en `scenes.ts`).
5. **Sin suceso:** pescar en el vado (un `offer` `fish` con caña de `props.ts`,
   `hours` de mañana), lavar en el río, partir leña delante de casa (el hacha
   existe), y **el rebaño con R-2 §3**.

**Criterio.** Cada escena tiene una captura en secuencia enviada al dueño; la
propiedad medible es «en una jornada con suceso X, al menos N personas están
en la escena X durante M segundos», con N y M medidos en tres semillas.

### R-3 · Cada valle es otro valle

**Qué.** De cuatro rasgos de valle a diez, y con consecuencias que se ven.

**Dónde.** Los rasgos se eligen en `src/engine/found.ts` (dos de la lista de
`balance.ts`, busca `TRAITS`), viven en `state.traits`, pesan en
`fate.ts` (`trait(state, name, factor)`), en las condiciones del catálogo
(`crossroads/conditions.ts`) y en el mapa (`world/map.ts` o donde `bare_hills`
y `old_forest` cambien el terreno: búscalos por nombre). La cartela del rasgo
sale en el banco (`bank.en.ts`, claves `trait.*`).

Seis propuestos, cada uno con **un efecto de suceso** (pesos en `weightOf`),
**un efecto de mapa o de fundación** y **una línea de banco**:

| Rasgo | Suceso | Mapa / fundación |
|---|---|---|
| `marsh_valley` | `river_flood` ×2, `good_catch` ×1,5 | marisma junto al río, la fundación se aleja del agua |
| `stone_valley` | `roof_under_snow` ×0,5 (tejados de piedra) | roca cerca: piedra más barata (§7.2) |
| `old_ruins` | `stranger_passes` ×2 | unas ruinas de piedra en el mapa (decorado en `render3d/`) |
| `wolf_country` | `wolves_at_the_coop` ×2,5, `bear_in_the_wood` ×1,5 | bosque denso al norte |
| `spring_valley` | `river_flood` 0, `good_catch` 0 | manantial en vez de río: sin vado |
| `wide_ford` | `pedlar` ×2, `stranger_passes` ×1,5 | el vado ancho: el camino de fuera llega |

**Dos parejas que no se sortean juntas, decidido el 16 sep 2026 por el dueño del
diseño.** El cuaderno de referencia visual (`docs/visual-reference` §4) destapó
que algunos rasgos se contradicen entre sí, y como cada valle saca dos, pueden
salir juntos:

- **`spring_valley` + `wide_ford`**: uno es un valle **sin río** que cruce el
  mapa y el otro es un vado ancho con camino de cruce. Contradicción literal.
- **`spring_valley` + `marsh_valley`**: la marisma está definida «junto al río»,
  y ahí no hay río. Pero el problema gordo no es ése —una turbera de manantial
  existe— sino que **los dos rasgos tocan los mismos dos sucesos en sentidos
  opuestos**: el manantial pone la riada y la buena pesca a cero, y la marisma
  dobla la riada y sube la pesca. Cero por dos sigue siendo cero, o sea que el
  jugador saca **un rasgo que no hace nada**, y eso es peor que una
  contradicción que se ve.

**Las dos se excluyen en el sorteo**, y no se inventa un efecto nuevo para la
marisma. Se consideró darle uno que no dependiera del río —agua estancada que
enferma al rebaño, o caminos más lentos— y sería el valle más reconocible de los
diez, pero es abrir diseño para un problema que no existe hasta que R-3 se
construya. Si alguien lo retoma, ésa es la vía; mientras, la exclusión es la
regla y está aquí para que nadie la reintroduzca sin saberlo.

**Criterio.** `tools/fate-report.ts` con seis semillas: la distancia media
entre valles sube de **0,16** a más de 0,25; dos capturas de dos valles con
rasgos distintos que se distinguen a primera vista; cada rasgo tiene prueba de
que su efecto de suceso pesa (una tabla, no seis pruebas).

### R-4 · Las encrucijadas, en su sitio

Se quedan, no se afinan (decisión del dueño). Con R-1 y R-2 el drama ya no
depende de ellas. Las diez plantillas que no salen nunca son una lista que
podar cuando toque, no un problema que resolver.

---

## 4b. El juego de los medios — M-0 a M-4, con brief (17 sep 2026)

**De dónde sale.** De la parada del 17 sep: `docs/plan-medios.md` es el
diagnóstico con sus medidas y **se lee entero antes que esto**. En una frase: las
tres palancas de órdenes de v2.0 son una trampa (sólo vive la postura de
fábrica; a dos muescas muere media aldea), las encrucijadas pesan (42 personas
contra 6) pero no se sienten, y la aldea prospera sola porque §1 lo manda. El
dueño: «ahora mismo no es nada divertido; lo único bonito es mirar cómo avanza
el pueblo».

**El principio que manda en las cinco fases**, con sus palabras: *«es como si
cogieras a un grupo de personas y le dieses una pala, o un martillo. Depende de
lo que le des van a hacer diferentes cosas. Tú no le estás diciendo qué tienen
que hacer, sino que ciertas cosas dan lugar a otras.»* **El jugador nunca fija
un número ni da una orden: mete cosas en el valle**, y la aldea decide qué hace
con ellas por sus propios sistemas.

**Sus decisiones, que ordenan el trabajo** (todas del 17 sep):

1. Un medio **cuesta lo del valle** (grano, leña, piedra, plata). Nada gratis y
   nada de esperar: «cada semana, cada mes, cada tres meses que pasen cosas».
2. **Nada se coloca con el dedo.** Todo se da; la aldea decide dónde va.
3. **Las tres palancas de órdenes se retiran.** «No me gustan para nada.»
4. **El mundo no mata sin motivo.** «Que caiga un rayo en una casa y eso ya se
   muera no tiene gracia. Se puede morir, pero más adelante, porque hemos
   tomado varias decisiones que hacen que se tumbe.» La letalidad **escala con
   lo que el jugador metió**; una aldea intocada muere como hoy; la pareja
   fundadora no se queda a cero por el mundo.
5. **Piedra y plata** entran como existencias. **El ánimo se enseña como cara**,
   no como cifra. **Las visitas de comercio son ofertas** que se aceptan o se
   dejan pasar desde la voz de la bandeja, sin pantalla entera. **El señor cobra
   diezmo regular en plata** cada otoño.
6. El **rey** —elegir qué aldeano manda y que la aldea tire por donde él tire—
   va después de M-4 y no se detalla aquí; nada de lo de abajo debe impedirlo.

**Orden:** M-0 → M-1 → M-2 → M-3 → M-4. Cada una se juega y se juzga sola; la
medida de M-2 es la que decide si el patrón vale. Como en §4: rama desde
`main`, la puerta del módulo, commit en español con las medidas, `main`
empujado, rebundle y publicación (`https://mvera70.github.io/project/`), y
**una secuencia de capturas para el dueño**. Verificación durante la ronda:
typecheck, lint y los ficheros tocados; la suite entera al cerrar.

**Tres reglas de motor que valen para las cinco fases:**

- **Toda entrada del jugador pasa por `tick`** y queda en `state.history`. Hoy
  `Decision` es `{templateId, optionId}` y `DecisionRecord` lo guarda con `cast`.
  Las ofertas y los medios son **entradas nuevas del mismo canal**: `Decision`
  pasa a ser una unión discriminada (`kind: 'crossroad' | 'offer' | 'means'`),
  `DecisionRecord` gana `kind`, y `sim.ts:352` (que filtra repeticiones por
  `templateId`) filtra por `kind === 'crossroad'`. Así el guardado sigue siendo
  «instantánea + registro de decisiones» (§13.1) y la partida se puede
  reproducir byte a byte.
- **Ninguna tirada nueva fuera de un flujo con nombre.** Las visitas y los
  medios consumen `fate`; nada más. `tests/fast/fate.test.ts` ya guarda que
  `rollFate` sólo consume `fate`: se extiende, no se duplica.
- **Ningún número fuera de `balance.ts`**, con `// TUNE:` y su motivo. Los de
  abajo son propuestas para arrancar, no cifras medidas: la medida es lo que
  cierra cada fase.

### M-0 · La mesa: piedra y plata

**Qué.** Dos existencias nuevas en `VillageStats`, las visitas de comercio como
ofertas, el diezmo, y la cabecera con cinco cosas y una cara.

**Dónde y cómo.**

1. **`state.ts`.** `VillageStats` gana `stone: number` y `silver: number`;
   `StatName` los incluye (el DSL de efectos de encrucijada, `k: 'stat'`, los
   admite gratis). `SCHEMA_VERSION` a 7 y la migración en `save.ts` (busca
   `candidate.schema`): una partida vieja entra con `stone: 0, silver: 0`.
   `tests/fast/save.test.ts` tiene el patrón.
2. **La piedra se cantea y se gasta.** Hoy `works.ts` la cobra como trabajo
   (`bpCostOf`: `bp + stone / WORLD.STONE_PER_BP`) si `canQuarry` (fragua y
   roca). Cambia a: `bpCostOf` devuelve sólo `bp`; **una parte de los
   constructores cantea** cuando hay proyecto de piedra en cola y
   `state.village.stone < lo que pide` (en `allocateLabour`, `labour.ts`: un
   reparto `quarriers` sacado de `builders`, con `LABOUR.QUARRY_SHARE` — TUNE,
   arranca en 0,5, que es lo que la vida ya hace: `life/day.ts` da a la
   cantera `buildingDays / 2`); cada cantero produce `WORLD.STONE_PER_WEEK`
   (TUNE: 2, calibrar para que la primera piedra siga cayendo en los años 42 a
   45, `handover.md` §2.1); el proyecto de piedra **no arranca** hasta tener su
   `stone` en el montón, y al arrancar lo descuenta (donde hoy descuenta la
   madera: búscalo por `woodCostOf`). `canQuarry` se queda. `TRAITS` de
   `bare_hills` sigue actuando por el mapa, sin tocar.
3. **La plata entra y sale.** Tres sitios:
   - **Las visitas.** Las tres encrucijadas de comercio (`catalog/trade.ts`:
     `cattle_drover`, `salt_carrier`, `grain_factor`) y el suceso `pedlar` de
     R-1 pasan a ser **ofertas**: sucesos de `fate.ts` (`HAPPENINGS` gana
     `drover_visit`, `salt_visit`, `factor_visit`; `pedlar` cambia de efecto
     inmediato a oferta) que **no cambian el estado al salir**: dejan en
     `state.offer: Offer | null` un cambio concreto —`{ id, gives: {stat,
     amount}, takes: {stat, amount}, expiresTick }`— con cantidades sacadas de
     `balance.ts` (`TRADE.*`, TUNE) y del estado (el factor ofrece por el
     excedente sobre `FOOD_WEEKS`; el tratante vende un cerdo si hay corral).
     La oferta caduca en `TRADE.OFFER_WEEKS` (TUNE: 2). Aceptarla es una
     `Decision` de `kind: 'offer'` que `tick` aplica al empezar (mismo sitio
     que la de encrucijada). Las tres plantillas de `trade.ts` **se quitan del
     catálogo** (no se borran: se sacan de `CATALOG` y sus pruebas cambian a
     las ofertas), y `grain_factor.sell_the_surplus` conserva su precio de
     verdad: la bandera `watched` a 15 años, que leen las plantillas del señor.
   - **El diezmo.** Cada otoño (`TIME.HARVEST_WEEK + TITHE_WEEKS`, TUNE: 4)
     el señor cobra `LORD.TITHE_SHARE` (TUNE: 0,1) de la plata; si no hay plata
     cobra grano al cambio (`TRADE.SILVER_PER_GRAIN`, TUNE: 0,1); si no hay
     ninguna de las dos, pone `flags.lord_owed` y la plantilla
     `winter_grain_debt` gana peso (ya existe en el catálogo). Es un paso del
     tick nuevo, **después** de la cosecha y antes de la crónica; entrada de
     crónica `tithe.paid` / `tithe.owed` en `bank.en.ts`.
   - **El forastero.** `stranger_passes` deja `+TRADE.STRANGER_SILVER` (TUNE: 2)
     cuando hay plaza y ánimo, para que la plata exista antes de la primera
     venta.
4. **La interfaz.** `hud.ts`: cinco vitales —gente, grano, leña, piedra,
   plata—, con los iconos calcados por el método de la skill `calcar-iconos`
   (no dibujados a mano: la ronda UI-V2b enseñó que nueve versiones a mano no
   valieron). **El ánimo deja de ser cifra**: el chip enseña una cara con
   cuatro estados (`MOOD_FACE` en `balance.ts`, TUNE: < 20 hundida, < 40
   seria, < 70 tranquila, ≥ 70 contenta) y la cifra sólo al tocarlo (ficha de
   la aldea, `inspect.terrain.*`). La oferta se dice **por la voz** (`voice.ts`
   gana el rol `'offer'`, prioridad entre `event` e `hint`, TTL el de la
   oferta) con dos toques dentro de la línea —«Take it» / «Let him go»— que
   emiten `app.decide({kind:'offer', accept})`; `contracts.ts` de la piel:
   sigue siendo la misma hoja de papel y la misma voz (`piel-del-valle` §8).
   Las tres palancas de órdenes **no se tocan aún** (se retiran en M-2).

**Pruebas.** `tests/fast/works.test.ts` (o donde viva `bpCostOf`): la primera
piedra sigue cayendo en la ventana de hoy en cuatro semillas; `fate.test.ts`:
una oferta no cambia el estado hasta aceptarse y caduca sola; `save.test.ts`:
la migración 6 → 7; `sim` : el diezmo cobra en otoño y no dos veces;
`ui-voice.test.ts`: el rol `offer` no pisa un hito ni es pisado por un aviso.
Recorrido nuevo en `valley.shots.ts`: una oferta se lee en la voz, se acepta
con un toque y la plata sube en la cabecera.

**Medida y terminado.** Con reposo, sesenta años, dieciséis semillas (el
script de `plan-medios.md` §1, que hay que meter en `tools/` como
`agency-report.ts` porque las cinco fases lo usan): la piedra llega en los
años 42 a 45 como hoy; la plata **entra y sale al menos una vez por década**
en todas las semillas vivas; las mismas 2 muertas de 16. Secuencia de capturas
al dueño: la cabecera nueva, una oferta en la voz, la cara del ánimo en dos
estados.

### M-1 · El mundo contesta a lo que hay

**Qué.** Tres sucesos de R-1 escalan con lo que la aldea tiene, se quitan las
dos puertas del rayo de §2.6 sin que un rayo pueda acabar con una aldea, y la
regla de §1 se reescribe. **No es «el mundo mata solo».**

**Dónde y cómo.** Todo en `fate.ts` (`weightOf`, `happen`) y `balance.ts`
(`FATE`):

1. `wolves_at_the_coop`: peso × `(1 + FATE.WOLVES_PER_HEAD · (cerdos + vacas))`
   (TUNE: 0,15) y, con `herdDensity` alta, se lleva un cerdo y no sólo
   gallinas. Empalizada o atalaya en pie: ×0,4 (`FATE.WOLVES_WALLED`).
2. `river_flood`: peso × `(1 + FATE.FLOOD_PER_FELLED · fracción de bosque
   talado)` (TUNE: 2); el bosque talado ya se mide (`forestLeft`).
3. `granary_theft` (plantilla del catálogo) y `tithe_demand`: sus condiciones
   (`crossroads/conditions.ts`) pasan a mirar `grain > GRANARY_FULL · capacidad`
   **o** `silver > FATE.RICH_SILVER` (TUNE: 40), y `watched` sigue contando.
4. `lightning_fire`: fuera `LIGHTNING_MIN_HOUSES` y `LIGHTNING_MIN_PEOPLE`
   (§2.6), **y** un rayo destruye **una** casa y nunca la última: si
   `count(house) + count(stone_house) === 1`, quema el granero o un campo, o
   nada. Lo mismo para cualquier `destroyBuilding` que salga de `fate.ts`.
5. **La gracia de la pareja:** mientras `population < FATE.GRACE_PEOPLE`
   (TUNE: 6) o `tick < FATE.GRACE_YEARS · 48` (TUNE: 5), los sucesos con
   `happen` destructivo (rayo, riada, lobos) pesan ×0,25. No es una puerta que
   impida: es que de primeras «la aldea no tiene por qué morirse».
6. `design.md` §1: la fila «Fuente de letalidad: las encrucijadas, no el
   mundo» pasa a «**la acumulación de lo que el jugador metió**», con el
   párrafo de abajo reescrito y la fecha. `docs/changelog.md` lo cuenta.

**Pruebas.** `fate.test.ts`: cada escalado tiene una fila en una tabla (una
prueba, no seis): con N cerdos el peso de los lobos es ≥ k veces el de sin
cerdos; el rayo nunca deja una aldea sin casa (cuatro semillas, sesenta años,
con `lightning_fire` forzado cada tormenta); en gracia los tres pesan ×0,25.

**Medida y terminado.** `agency-report.ts`: con reposo y sin medios, **las
mismas 2 muertas de 16** (no más: si suben, el mundo mata solo y está mal).
Con una combinación deliberadamente mala fijada a mano en el informe —el
corral lleno por `state.herd` y el bosque talado por `fellForest`, sin
empalizada— **entre 6 y 10 muertas de 16, ninguna antes del año 10**. Si con
la peor no muere ninguna, no hay riesgo y está igual de mal.

### M-2 · Tres medios, de punta a punta — **la fase que decide**

**Qué.** El arado, la pareja de cerdos y el barril: uno de economía, uno de
animales, uno de gente. Cada uno: un rasgo de valle que el jugador añade con
coste, un objeto en la escena, dos filas nuevas en la tabla de sucesos (una
buena, una mala), una plantilla del catálogo que pasa a salir, y una entrada
de crónica. Con ellos entra **el carro** (la pantalla de los medios) y salen
las tres palancas.

**Dónde y cómo.**

1. **Un medio es un rasgo de valle que se añade a mitad de partida.** `state.ts`:
   `ValleyTrait` gana `'plough' | 'pigs' | 'ale'` (los de fundación siguen
   siendo dos de cuatro; `valleyTraits` no los sortea). `balance.ts` gana
   `MEANS`: por medio, `cost: Partial<VillageStats>` (TUNE: arado 40 leña y
   12 plata; cerdos 30 grano y 8 plata; barril 25 grano y 4 plata) y sus
   multiplicadores. Darlo es una `Decision` de `kind: 'means'` que `tick`
   aplica al empezar: descuenta el coste (si no alcanza, se rechaza y la voz
   lo dice: `means.cannot` en el banco), añade el rasgo o el ganado, y deja la
   crónica (`means.plough.given`…). Un medio con rasgo **no se da dos veces**;
   los cerdos y el barril sí (son ganado y una fiesta).
2. **Lo que cada uno hace en el motor**, y sus dos sucesos:
   - **El arado.** `FOOD.FIELD_CREW` × `MEANS.PLOUGH_CREW` (TUNE: 0,6) con el
     rasgo: el mismo campo con menos manos → sobran manos y `allocateLabour`
     las reparte como siempre. Bueno: `good_harvest` no existe como suceso,
     así que el suceso bueno es que **`harvest_feast` pesa más** y el granero
     se llena; malo: `granary_theft` y `tithe_demand` salen (M-1 §3) y una
     fila nueva `rats_in_the_granary` (−10 % grano, invierno, sólo con
     granero > 80 %).
   - **Los cerdos.** `state.herd.pigs += 2` (el corral ya existe:
     `herd.ts`, `herdCapacity`). Bueno: `pig_slaughter` en la fiesta de la
     cosecha (+grano, ánimo +3, sólo con cerdos ≥ 3); malo: lobos escalados
     (M-1 §1) y `murrainChance` ya existe (v2.94).
   - **El barril.** Una fiesta **esa semana**: `happen('ale_feast')` directo
     (ánimo +8, fe −1, `gather square` 2 días); bueno: `wedding` pesa ×3 las
     cuatro semanas siguientes; malo: `quarrel_in_the_square` pesa ×3 las
     mismas cuatro, y la riña de R-2 (si está) se ve en la plaza. Es el medio
     que da al ánimo el reloj del jugador (`plan-medios.md` §6.2).
3. **El carro.** Una ruta nueva en `SheetRoute` (`kind: 'cart'`), en la barra
   de abajo en el sitio de las órdenes; misma hoja de papel, mismo canto, misma
   cruz (`piel-del-valle` §2, §6, §7). Lista de medios con su coste en los
   iconos de la cabecera y un botón «Give» por fila; gris si no alcanza, con
   la razón en una línea. **Sin números sueltos**: el coste se enseña como
   fichas de recurso. Las tres palancas y `redesign/orders.ts` **se retiran de
   la interfaz** (el fichero se queda hasta M-4 por si el dueño quiere volver a
   verlas; `state.intent` se queda en reposo y `answerFor` deja de llamarse).
   `data-screen="cart"` para las pruebas.
4. **Se ve.** Cada medio tiene un objeto que `render3d/world` posa sin tocar
   `life/` (que es de la otra sesión): el arado junto al campo más viejo, el
   barril en la plaza los dos días de fiesta, los cerdos ya los pinta el
   corral. Un GLB por objeto por el pipeline de `tools/art` (o un primitivo
   con los materiales de `visual-config.ts` si el arte no llega: se anota).

**Pruebas.** `tests/fast/means.test.ts`: dar sin fondos no cambia nada y no
consume azar; dar descuenta exactamente el coste; el arado no se da dos veces;
el barril sube el ánimo esa misma semana; cada medio hace elegible su
plantilla (una tabla). `ui-v2-nav.test.ts`: cinco rutas siguen siendo cinco
(el carro sustituye a las órdenes, no se suma). Recorrido en `valley.shots.ts`:
abrir el carro, dar el barril, ver la fiesta en la voz y el ánimo cambiar de
cara.

**Medida y terminado — y es la que decide si el patrón vale.**
`agency-report.ts` con **tres combinaciones fijas** (sólo arado en el año 3;
cerdos y barril cada vez que alcanza; nada) en dieciséis semillas y sesenta
años: las tres tienen que dar aldeas que un tercero distinga en población,
obras y crónica, y **la distancia entre la mejor y la peor ≥ 20 puntos de
población mediana** (el umbral de §12.9 que hoy está en 5). Si las tres dan la
misma aldea, los medios son decorado y **se para aquí** y se vuelve a
`plan-medios.md`. Secuencia de capturas: el carro, el barril dado, la fiesta,
la riña o la boda que sigue.

### M-3 · Se ve lo que provoca

**Qué.** Que «lo que metí» y «lo que pasó» se liguen por los ojos y no por la
crónica. Es la fase de la capa de vida y el render, y **se coordina con la
sesión de `life/`** (`docs/dos-sesiones.md`): aquí sólo se escribe qué tiene
que verse, y quien tenga `life/` lo hace.

1. Los lobos que vienen a por los cerdos **se ven venir**: `beasts.ts` ya tiene
   lobos de invierno; con `wolves_at_the_coop` esa semana, van al corral y no
   al bosque.
2. La fiesta del barril es la escena de `harvest_feast` de R-5 con el barril
   de `props.ts` en medio.
3. El arado se acarrea al campo el día que se da (`deliver-*` de `offers.ts`,
   como la piedra).
4. Las ratas del granero: humo no, pero sí el granero abierto y dos personas
   dentro (`gather granary` en `visible`, y una oferta `sweep`).

**Criterio.** Una secuencia de capturas por medio en tres momentos —se da, se
ve la cosa, se ve lo que provoca— enviada al dueño, que dice si se lee. La
propiedad medible, como en R-5: «en la semana del suceso X, al menos N
cuerpos están en la escena X durante M segundos», con N y M medidos en tres
semillas.

### M-4 · El resto del carro

**Qué.** Los medios que quedan de `plan-medios.md` §3.3 —el hacha, el forastero
con oficio, la reliquia— y los que salgan de ver jugar M-2, cada uno con el
mismo contrato (coste, rasgo u objeto, dos sucesos, una plantilla que sale,
crónica, objeto en escena). `redesign/orders.ts` y `answerFor` se borran.
`docs/design.md` §11.2 describe el carro y retira las órdenes; §12 recibe los
números de `MEANS`, `TRADE`, `LORD` y `FATE` con su medida; **se remide la
suite de balance** (§5 lo tenía para después: aquí ya toca, porque el motor ha
cambiado tres veces desde R-1) y se reescriben §12.9 y `handover.md` §5.5.

**Criterio.** Seis medios en el carro, cada uno con su fila en
`agency-report.ts`; el informe entero en `docs/` con la tabla de distancias
entre combinaciones; el dueño juega una tarde con la demo y dice si es
divertido, que es la única medida que no cabe en un script.

### Lo que va después y **no** está en estas fases

- **El rey** (decisión del dueño, «más adelante»): elegir qué aldeano manda;
  su oficio y sus rasgos deciden la familia de obra que se adelanta, los pesos
  de los sucesos y a quién se vende. Sus piezas quedan puestas: la tesorería
  (plata), los rasgos de valle que un medio añade, y el `who` de los sucesos.
- Podar las plantillas que sigan sin salir después de M-2 (R-4).
- Afinar los pesos con el informe (§5).

---

## 5. Lo que va después, y **no ahora** (decisión 5)

- Remedir la suite de balance (`npm run test:balance`, 37 aserciones de §12.9)
  con R-1 dentro y reescribir los números de §12.9 y `docs/handover.md` §5.5.
- Afinar `FATE.WEIGHT` con el informe.
- Planes de prueba de la jugabilidad (una sesión de cinco minutos a ×64 con
  un suceso visible; la comparación de dos valles).
- S-04 (horas en los avisos), y las notas de `data-render-failure` /
  `data-view-height` sin usar.

---

## 6. Cómo se trabaja aquí, para un agente que no ha visto el proyecto

- **Puerta de cada cambio:** `npm run typecheck && npm test && npm run lint`,
  y `npm run test:journeys` (~4 min) antes de subir. La suite de balance no.
- **Pruebas:** propiedades del diseño, umbrales con varias semillas y varias
  jornadas, `it.fails` con la medida cuando no llega. Las pruebas de mecánica
  fundan con `foundTwenty`; las de fundación con `foundGame` (la pareja). Jugar
  es `run(state, n, 'prudent', CATALOG)`, **nunca** un bucle de `tick()`
  (`CLAUDE.md` cuenta la conclusión falsa que costó).
- **Motor:** sin `Math.random`, sin `Date`, sin importar de `derive/`,
  `render3d/` o `ui/`; cada sistema consume de su flujo; toda constante en
  `balance.ts` con `// TUNE:`; todo texto por el banco.
- **Git:** `git add` por rutas explícitas (nunca `git add .`); **nunca** añadir
  `tools/art/_test_build_priest.py`; mensajes en español con las medidas y
  `Co-Authored-By: Claude <modelo> <noreply@anthropic.com>`; todo a `main`
  (`git branch -f main <rama> && git push origin main`).
- **Demo:** `npx tsx tools/graphics/bundle-game.ts --split` →
  `artifacts/graphics/G-10/game/artifact.html` + `valley-assets.json`;
  publicar con el Artifact en https://claude.ai/artifact/CbbvpwDfa5NUoog9E7XiMK.
- **Capturas:** `npm run serve:shots` y
  `node tools/graphics/shot.mjs --page http://127.0.0.1:8127/valley.html --seed N --settle S --sequence 12 --every 0.8`.
  Enviárselas al dueño; él juzga. No declarar nada «sólido».
- **Documentar mientras se hace:** `docs/changelog.md` (una fila por versión,
  con el motivo), `docs/handover.md` §2.1 y §4 (lo medido y las trampas),
  `docs/design.md` (la regla vigente), `CLAUDE.md` (sólo lo que hay que tener
  siempre en la cabeza), y este documento (§3.6 y la tabla de §7).

---

## 7. El orden de trabajo y dónde está cada cosa

| Fase | Estado | Dónde |
|---|---|---|
| R-1 | **hecho, v3.75, en `main`** (queda §2.6 y la captura de §2.8) | `src/engine/world/fate.ts`, `sky.ts`; `tools/fate-report.ts`; §4.2 2b, §7.10, §12.10 |
| §3 IA · puntos 1, 3, 6 | **hecho, v3.76** — paredes 1,31 % → 0,10 %, vueltas 4,75 % → 0,34 % (§3.6) | `life/body.ts`, `steering.ts`, `navigate.ts`, `beasts.ts`, `terrain.ts`, `village.ts`, `tools/life-report.ts` |
| §3 IA · puntos 2, 4, 5 | **siguiente** — anclas, oferta de reserva, malla contra radio | `src/render3d/life/`, `src/render3d/` |
| R-2 + R-5 | después de §3 | Anexo E, `scenes.ts`, `staging.ts`, `offers.ts`, §7.9 |
| R-3 | después | `found.ts`, `TRAITS`, `fate.ts`, mapa |
| R-4 | no es trabajo | §8 |
| §5 | cuando el dueño lo pida | `tests/balance`, §12.9 |
