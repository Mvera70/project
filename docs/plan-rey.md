# Plan de fase · El rey (K-0 a K-7)

> **CERRADO · entregado el 18 sep 2026 (v3.89 a v3.92).** K-1 a K-8: la
> corona se da, ocho pasos del tick leen su voluntad, pasa por la sucesión,
> tiene su sala y **se ve en la lista**. Lo medido está en `rey-medida.md`;
> lo que no llegó —la firma del rey del campo y la malla de la sala— está
> anotado allí y en `encargos-3d.md`. **Lo que hay que hacer ahora está en
> `plan-meta.md`.**

**Para quien lo ejecute.** 18 sep 2026. Brief de fase con la forma de `docs/rework.md` §4b (M-0 a M-4): qué toca cada paso, el contrato literal, las pruebas como propiedades y el criterio de terminado. Se lee después de `CLAUDE.md`, `docs/design.md` §1–4, §6, §7.2–7.3, §7.12, §8, §12, §13 y `docs/task-log.md` §4.0.

**Diseñado por Claude Fable 5.1** el 18 sep 2026, a petición del dueño del diseño («el plan diséñalo con Fable 5.1, luego sigue aquí con Opus»). El documento se guarda tal cual lo entregó.

**Lo que pidió el dueño del diseño**, con sus palabras (18 sep 2026): «Implementa el rey al completo y toda su funcionalidad. El rey se podrá elegir en algún momento de la partida. **Sustituirá a lo que tenemos actualmente como líder.** Y dependiendo de quién elijamos —el puesto de trabajo, la personalidad, o cómo podamos diferenciarlo— ese rey hará unas cosas u otras. **Debe tener una casa que se diferencie**; eso queda anotado para hacerlo más adelante en 3D, en Blender.» Y la intención original (17 sep): «si eliges al herrero, pues haces más armas; o si tiras por un granjero; o si tiras por noble, pues haces lo típico».

**El principio que manda**, el mismo de los medios (§7.12): el jugador no ordena nada. **Da la corona a alguien**, y lo que la aldea haga con ese alguien lo deciden los sistemas que ya existen —la cola de obras de §7.3, el reparto de manos de §5.2, la tabla de sucesos de §7.10, las opiniones de §6.4—. `docs/plan-medios.md` §6.4 ya lo dejó escrito: «es el principio de §3.1 aplicado a una persona: no dices qué hacer; dices quién».

---

## 0. Las decisiones, cada una con su motivo

Las siete preguntas del encargo, contestadas antes de las fases. Lo que sólo puede decidir el dueño está en §9, con recomendación.

### 0.1 Cuándo se puede proclamar, y qué lo desbloquea

**La corona es una cosa que se da, como el arado.** Cabe en el verbo de M-2 sin inventar otro: el carro gana una fila, «A crown», con su precio en plata y —esto es lo nuevo— **con la lista de quién puede llevarla**, porque una corona se da *a alguien*. Dar la corona a una persona es un acto del jugador (`PlayerAct`, `kind: 'crown'`), entra por `tick` como los medios y queda en `state.acts`: la partida sigue siendo reproducible byte a byte (§13.1).

Se desbloquea por **dos cosas que ya están en el estado**, y nada más:

- **Gente:** `population >= CROWN.MIN_PEOPLE`. TUNE: 30, que es `BUILDING_RULES.CHAPEL_PEOPLE` — una aldea que puede tener capilla puede tener corte. Motivo: un rey de seis personas es una broma, y §7.3 ya tiene ese umbral medido como «aldea hecha».
- **Plata:** `CROWN.SILVER`. TUNE: 30, el precio de la reliquia (`MEANS_SPEC.relic`), el medio más caro. Motivo: §7.12 midió que con esos precios «un medio pasa a ser una decisión de década», y la corona tiene que ser la decisión de una generación, no una compra.

No se desbloquea por suceso ni por encrucijada, a propósito: un suceso lo daría el azar y una encrucijada ofrecería dos candidatos sorteados; el dueño quiere **elegir entre todos**. Lo que decide la medida (K-6): el año mediano en que la fila se enciende tiene que caer entre el 15 y el 30 (§7.12 tabla: la reliquia, al mismo precio, se compra en 21 de 24 valles antes del año 60, y adelanta la piedra al año 34).

### 0.2 Cómo se elige, y con qué delante

**Entre los nombrados presentes en la banda de edad de la sucesión** (`[20, 60]`, la misma de A.15 en `succession.ts`; pasa a `CROWN.CANDIDATE_AGES` y la plantilla la lee de ahí sin cambiar el número). Hasta ocho personas (§6.1), que es lo que cabe en la cabeza del jugador, y son exactamente las que la pantalla de la gente ya enseña.

Lo que se ve de cada candidato **ya existe en el estado y ya tiene clave en el banco**: nombre y edad (`inspect.age.short`), oficio (`role.<role>`), rasgos (`trait.<trait>`). Se añade **una línea por estilo** (`crown.style.<style>`, cuatro claves) que dice hacia dónde tiraría la aldea con ese rey — es la única información nueva y es lo que hace legible la elección. El puesto de trabajo es lo que decide el estilo (§0.3); la personalidad son sus rasgos, que se leen en los chips y actúan por §0.3.

### 0.3 Qué hace el rey: por oficio y por rasgo, con lo que el motor ya ejecuta

**La corona no añade ningún sistema.** El rey tiene una **voluntad** (`will(state)`), y la voluntad es un puñado de números que los pasos del tick ya leen hoy. Cada uno está en el código en un sitio concreto:

| Estilo | Oficio en el momento de coronar (`crown.trade`) | Lo bueno (qué constante o qué paso cambia) | Lo malo |
|---|---|---|---|
| **`forge`** (el herrero: «más armas») | `smith` | §7.3: la familia `defence` va **delante** de la cola (`PRIORITY_FAMILIES.defence`, ya existe; `nextProject` deja de leer `state.intent.priority` y lee `will(state).priority`). Y el punto 8 deja de exigir `threatened`: `has smithy && (threatened \|\| will.arms)` | El señor cuenta las armas: `select.ts` añade `CROWN.FORGE_LORD` (TUNE 1,5) como candidato `story` de la categoría `lord`. Y lo que ya está: la muralla no se levanta sola, cuesta madera y manos que no van al campo |
| **`plough`** (el granjero) | `reeve`, `woodward`, `midwife`, `herbalist`, o sin oficio (el par de manos) | §5.2: `allocateLabour` lee `will(state).fields` donde leía `state.intent.fields`. TUNE `CROWN.PLOUGH_FIELDS` 1,3: entre las paradas `enough` (1) y `heavy` (1,5) de `INTENT_STOPS`, que E1 midió. La familia `food` delante | Lo que M-1 ya cobra a un granero lleno: ratas (`rats_in_the_granary` pide > 80 %), ladrón (`granary_theft`), diezmo y señor. No hay que escribir nada: es la letalidad por acumulación de §1 |
| **`chapel`** (el cura) | `priest` | §5.6: `mood.ts` deriva la fe a `CROWN.CHAPEL_FAITH_TO` (TUNE 50; base 40, reliquia 62; la capilla pide 45). La familia `faith` delante | Un rey que mira mal la bebida: `fate.ts` multiplica el ánimo de `harvest_feast` y `ale_feast` por `CROWN.CHAPEL_FEAST` (TUNE 0,5). El barril vale la mitad |
| **`court`** (el noble: «lo típico») | `leader` (el que ya tenía el asiento) o `stranger` (el forastero con aires) | La sala del rey (§0.5) va **delante** de la cola (familia nueva `court: ['hall']`), y con ella en pie `mood.ts` suma `CROWN.COURT_MORALE` por semana (TUNE 0,1; la capilla da 0,15) | El camino se entera: la coronación pone `flags.watched` durante `CROWN.COURT_WATCHED_YEARS` (TUNE 20; el factor pone 15 y la reliquia 12), que es lo que leen las plantillas del señor (`lord.ts` 137, 175) |

**Por qué cuatro estilos y no siete.** El dueño nombró tres. Siete oficios en siete estilos es un árbol de habilidades con cara, y cada estilo hay que medirlo (K-6). Cuatro se miden en una tarde; la tabla oficio → estilo es un dato (`CROWN.STYLE_OF_TRADE`) y mover a la comadrona de sitio no toca código.

**Por rasgo.** §6.3 es tajante: los rasgos hacen exactamente tres cosas y sólo seis tienen número. Al auditar el código para este plan salió algo que hay que escribir: **de esas seis filas, tres no están implementadas en ninguna parte** —`ambitious` (líder: obra +5 %, opinión −0,02/semana), `generous` (hambruna: −3·sev en vez de −4) y `greedy` (reeve)—; `grep` de `ambitious|generous|greedy` en `src/engine/` sólo encuentra el sorteo, `passedOver` y los `traitWeight` del catálogo. La corona no inventa rasgos: **implementa las dos filas del rey que §6.3 ya prometía** y añade **dos** nuevas, con lo que la tabla pasa de seis a ocho filas (la mitad del rey se mide; el resto siguen siendo narrativos y de ponderación):

| Rasgo del rey | Efecto (dónde) | De dónde sale |
|---|---|---|
| `ambitious` | Puntos de obra × `CROWN.AMBITIOUS_WORKS` (1,05) en `produce()`, junto a `AXE_WORKS` | §6.3, «Obra +5 %», nunca escrito. La parte de opinión (−0,02/semana) **no** se añade: el rey ya cobra la culpa del hambre (`scars.ts`, `HUNGER_TO_LEADER`) y dos sangrías de opinión al mismo hombre es el rencor garantizado |
| `generous` | `MOOD.MORALE_HUNGER × CROWN.GENEROUS_HUNGER` (0,75) en `updateMood` | §6.3, «−3·severity en vez de −4», nunca escrito |
| `craven` | La probabilidad de llegada de §5.7 × `CROWN.CRAVEN_GATE` (TUNE 0,7) en `resolveMigration` | Nuevo. Un rey miedoso cierra la puerta a los de fuera; es la misma dimensión que `CHARACTER.CRAVEN_LEAVES` (v3.61) vista desde el trono |
| `hot_tempered` | Peso de `quarrel_in_the_square` × `CROWN.TEMPER_QUARREL` (TUNE 1,5) en `weightOf` | Nuevo. Es el empujón a las opiniones que R-1 dio con la riña, con un motivo con nombre |

Los otros once rasgos del rey siguen pesando en el reparto de encrucijadas como hoy (el rey es la letra `A` de siete plantillas: `traitWeight` ya lo lee). No se les pone número: §6.3.

**Y sin corona no hay voluntad.** El líder de la fundación **no** ejerce ninguno de estos números hasta que alguien lo corona (aunque sea a él). Motivo, y es el que manda sobre los demás: **una partida sin rey tiene que ser byte a byte la de hoy**, y la coronación tiene que ser el momento en que una persona empieza a importar.

### 0.4 Qué pasa con el líder actual

| | Qué |
|---|---|
| **Se conserva** | El **asiento**: `role: 'leader'` como identificador de contenido («estables para siempre: se guardan en las partidas», §2.2). La fundación («él manda», §12.2). La sucesión A.15 con sus tres opciones y la exención del techo (§6.6). La puerta de la migración (`leaderPresent`), la culpa del hambre (`scars.ts`), la dispersión por tres `no_one` (A.15 v2.22), y las siete plantillas que reparten `{as:'A', role:'leader'}` (`lord.ts`, `stranger.ts`, `faith.ts`, `succession.ts`, `reserve.ts`, y las retiradas de `trade.ts`). Quitar el líder de la fundación dejaría **siete plantillas mudas hasta la coronación** y cerraría la migración a la pareja: se descarta |
| **Se sustituye** | Dos cosas. **Quién decide quién manda entre muerte y muerte**: hoy nadie (el asiento sólo cambia al morir); con la corona, el jugador lo cambia una vez, cuando quiere, y desplaza al que estaba. Y **lo que hace el que manda**: hoy nada; con la corona, la voluntad de §0.3. Y la palabra: en pantalla, un `leader` coronado se lee **`king`** (`derive/crown.ts` da la clave; el motor no cambia el id) |
| **Se migra** | `GameState.crown: Crown \| null`, esquema **10**, entra a `null`. Con `crown === null`, `will(state)` es la voluntad de reposo —`priority: 'none'`, `fields: 1`, todo a 1— que es **literalmente** lo que `allocateLabour` y `nextProject` leen hoy de `restingIntent()`. La aldea sigue haciendo lo mismo (§13.1) |

**Cuando muere el rey, la corona pasa por la sucesión de siempre.** A.15 plantea A/B/nadie; el elegido toma el asiento con `{k:'role', role:'leader'}`, y `applyEffect` —si el valle está coronado— apunta en `state.crown` a quién y con qué oficio (su estilo cambia con él: un rey del arado muere y le sucede el herrero, y la aldea tira hacia las murallas). `no_one` deja el trono vacío como hoy: la corona existe pero nadie la lleva, `will()` vuelve al reposo, y el `interregnum` cuesta lo que costaba. **No hay plantilla nueva**: lo probé sobre el papel y añadir `crown_succession` obligaba a tocar el recuento del catálogo (`catalog.test.ts` 18), la alcanzabilidad (`crossroads-reachability.test.ts` mide con `prudent` y nadie corona) y la elegibilidad, para decir lo mismo con otro título. Lo que sí cambia es el texto: los tres textos de pantalla de `succession` se reescriben **neutros** (el banco se puede reescribir sin invalidar partidas, §3.7): «The seat is empty. Two people in this valley expect to be asked…» vale para un jefe y para un rey.

### 0.5 Qué se ve

- **Crónica** (`bank.en.ts`, claves nuevas en §6 de este plan): la coronación es `kind: 'succession'` —el tipo existe en `ChronicleKind` y **hoy no lo escribe nadie** (`grep "kind: 'succession'"` en `src/engine` da cero)— con peso 3, «titular de generación» (§9.2). El desplazado, peso 2. La corona que pasa por sucesión, peso 2 (la línea de peso 3 ya la escribe `crossroad.succession.choose_a`). La sala levantada, `built.hall`, peso 2 como los edificios singulares.
- **Interfaz:** la fila de la corona en el carro con los candidatos (K-5); `king` donde hoy se lee `leader` (lista de la gente, ficha, tarjeta); la ficha de la sala dice quién tiene la corte. La voz no necesita nada: una entrada de peso 3 ya la dice `noticeText`.
- **Valle:** la sala del rey (§0.5b) y el rey con la malla del jefe (`villager-leader`, la única con burdeos: `leaderBurgundy` en `palette.json`), que ya es la que le toca al titular de `leader`.

**0.5b · La sala del rey (`hall`).** Un edificio nuevo, `BuildingKind` `'hall'`: 3×3, madera 200, obra 160, tope 1, tier 0. TUNE: más que el molino (180/140) y menos que la iglesia en obra (200); es la construcción de madera más grande del valle. Entra en §7.3 como punto **2b** —después de las casas, antes del granero—: `hall` si el valle está coronado, no hay ninguna en pie y `people >= CROWN.HALL_PEOPLE` (= `MIN_PEOPLE`). Se coloca **lo más cerca posible de la plaza** (`placeBuilding`: la rama por omisión ya puntúa `distance(p, centre)` y el centro es la plaza desde P-1; la reserva de `inPlaza` la deja en el primer anillo). Es la **casa del rey**: al terminarse, `homeId` del rey pasa a ella y cuenta `CROWN.HALL_BEDS` camas (TUNE 5 = `HOUSE_CAPACITY`). **Y arde**: entra en `DISASTER.FIRE_KINDS` porque el caos es el juego; no es una casa, así que la regla «nunca la última casa» de M-1 no la protege ni la necesita. El encargo de arte está en §8; hasta que exista la malla, el render la dibuja como caja con el tejado burdeos (`BUILDING_LOOKS.hall`), que ya se diferencia.

### 0.6 Qué puede salir mal, y cómo se mide

Está en §7. En una frase: el rey **no puede** volver la partida una escalera («el rey del arado siempre gana») ni apagar el caos. Lo primero se mide como distancia **lateral** entre estilos (firmas distintas: murallas, grano, capilla, sala) y no vertical; lo segundo comparando muertas y sucesos por año contra el valle sin rey con `tools/agency-report.ts` y `tools/fate-report.ts`, y exigiendo que no bajen.

### 0.7 Determinismo

**Ningún flujo nuevo y ninguna tirada nueva.** Coronar no sortea nada: el jugador elige a quién, el estilo es una tabla y el precio es plata. Los efectos de §0.3 cambian **pesos y prioridades, nunca el número de tiradas**: `weighted` consume exactamente una tirada tenga los pesos que tenga (`rng.ts` 144), `nextProject` y `allocateLabour` no sortean, `resolveMigration` sigue tirando una vez contra una probabilidad distinta. La sucesión no gana ni pierde una plantilla, así que `fillCast` saca las mismas tiradas del flujo `cast`. **Propiedad exigida (K-1):** dos partidas con la misma semilla y la misma lista de actos —una coronación en el tick T incluida— son idénticas byte a byte; y una partida **sin** coronación es idéntica a la de antes de esta fase.

---

## 1. El contrato de estado

```ts
// state.ts
/** K-1 · La corona del valle: quién la lleva, desde cuándo y qué era antes. */
export interface Crown {
  id: VillagerId;          // el último coronado; puede estar muerto (trono vacante)
  since: number;           // tick de la coronación o de la sucesión
  trade: Role | null;      // el oficio que tenía al recibirla: decide el estilo
}
export type CrownStyle = 'forge' | 'plough' | 'chapel' | 'court';

export type PlayerAct =
  | { kind: 'offer'; accept: boolean }
  | { kind: 'means'; means: MeansId }
  | { kind: 'crown'; who: VillagerId };        // K-1

export type BuildingKind = /* los trece de hoy */ | 'hall';   // K-4
export type PriorityName = 'none' | 'food' | 'shelter' | 'faith' | 'craft' | 'defence' | 'court'; // K-4
// PRIORITY_FAMILIES gana `court: ['hall']`

export interface GameState {
  /* … */
  crown: Crown | null;     // esquema 10
}
export const SCHEMA_VERSION = 10;
```

```ts
// balance.ts
export const CROWN = {
  MIN_PEOPLE: 30,                 // TUNE = BUILDING_RULES.CHAPEL_PEOPLE
  SILVER: 30,                     // TUNE = MEANS_SPEC.relic.cost.silver
  CANDIDATE_AGES: [20, 60],       // A.15: la banda de la sucesión
  SET_ASIDE_OPINION: -45,         // A.15: lo que el desplazado piensa del elegido
  SET_ASIDE_MEMORY: 4,            // A.15: el peso de `was_passed_over`
  STYLE_OF_TRADE: {               // §0.3; `null` (sin oficio) → 'plough'
    smith: 'forge', reeve: 'plough', woodward: 'plough', midwife: 'plough',
    herbalist: 'plough', priest: 'chapel', leader: 'court', stranger: 'court',
  },
  PLOUGH_FIELDS: 1.3,             // TUNE: entre `enough` y `heavy` de INTENT_STOPS
  FORGE_LORD: 1.5,                // TUNE: candidato `story` de `lord`
  CHAPEL_FAITH_TO: 50,            // TUNE: base 40, reliquia 62, capilla pide 45
  CHAPEL_FEAST: 0.5,              // TUNE: el ánimo de las dos fiestas
  COURT_MORALE: 0.1,              // TUNE: la capilla da 0,15
  COURT_WATCHED_YEARS: 20,        // TUNE: factor 15, reliquia 12
  HALL_PEOPLE: 30,                // = MIN_PEOPLE
  HALL_BEDS: 5,                   // = LIFE.HOUSE_CAPACITY
  AMBITIOUS_WORKS: 1.05,          // §6.3, escrito por fin
  GENEROUS_HUNGER: 0.75,          // §6.3: −3 en vez de −4
  CRAVEN_GATE: 0.7,               // TUNE nuevo (§0.3)
  TEMPER_QUARREL: 1.5,            // TUNE nuevo (§0.3)
} as const;

// BUILDINGS gana:
hall: { w: 3, h: 3, wood: 200, stone: 0, bp: 160, cap: 1, tier: 0, upgradeOf: null, byCrossroad: false },
// DISASTER.FIRE_KINDS gana 'hall'
```

```ts
// people/crown.ts — HOJA: importa sólo balance, state, villagers (por `ageOf`).
// No importa demography: `resolveMigration` lo va a leer y sería un ciclo.
// `isHere` va copiado en local, como `flagSet` en demography.ts (misma razón).
export interface Will {
  readonly style: CrownStyle | null;   // null: sin rey o trono vacante
  readonly priority: PriorityName;     // 'none' sin rey
  readonly fields: number;             // 1 sin rey
  readonly arms: boolean;              // forge
  readonly faithTo: number | null;     // chapel
  readonly feast: number;              // chapel: CHAPEL_FEAST; si no, 1
  readonly gate: number;               // craven: CRAVEN_GATE; si no, 1
  readonly quarrel: number;            // hot_tempered
  readonly works: number;              // ambitious
  readonly hunger: number;             // generous
}
export const RESTING_WILL: Will;                                   // todo a reposo
export function kingOf(state: GameState): Villager | null;         // titular vivo de 'leader' si crown !== null
export function styleOf(trade: Role | null): CrownStyle;           // CROWN.STYLE_OF_TRADE
export function will(state: GameState): Will;                      // pura, sin azar
export function crownCandidates(state: GameState): Villager[];     // nombrados, presentes, en banda, por id
export type CrownRefusal = 'already' | 'small' | 'cost' | 'nobody' | 'who';
export function crownRefusal(state: GameState, who?: VillagerId): CrownRefusal | null;

// world/crown.ts — el acto. Importa people/crown, people/minds (passedOver),
// people/opinions, people/memories, balance, state, time.
export interface CrownOutcome {
  readonly who: VillagerId; readonly crowned: boolean;
  readonly refusal: CrownRefusal | null; readonly style: CrownStyle | null;
  readonly setAside: VillagerId | null;              // el líder desplazado, si lo hubo
  readonly entries: Omit<ChronicleEntry, 'tick'>[];  // 1 o 2
}
export function crownKing(state: GameState, who: VillagerId, season: string, year: number): CrownOutcome;

// derive/crown.ts — puro, sin render
export function roleKeyFor(state: GameState, v: Villager): string | null;   // 'role.king' | 'role.<role>' | null
export function crownLine(state: GameState): { key: string; params: Record<string, string | number> };
```

`sim.ts`, paso 1b: junto a `means`, `else if (act.kind === 'crown')` → `crownKing`, `state.acts.push({tick, act, done: outcome.crowned})`, `say` de sus entradas. `TickReport` gana `crown: CrownOutcome | null`.

---

## 2. Las fases

**Orden:** K-0 → K-1 → K-2 → K-3 → K-4 → K-5 → K-6 → K-7. K-3 y K-4 son independientes entre sí y podrían ir en paralelo; K-5 necesita K-1 y K-4. Como en §4b: rama desde `main`, la puerta del módulo, commit en español con las medidas, `main` empujado, y **una secuencia de capturas para el dueño** al cerrar K-5. Verificación durante la ronda: typecheck, lint y los ficheros tocados; la suite entera al cerrar (`CLAUDE.md`, regla del 16 sep).

### K-0 · La medida antes de tocar

**Qué.** El punto de partida, para que K-6 compare contra algo. Sin código de motor.

**Ficheros.** `tools/agency-report.ts` (sólo columnas nuevas), `docs/rey-medida.md` (nuevo, la tabla).

**Cómo.** Añadir a `Row` y a la tabla: `walls` (tramos de `palisade` + `wall` en pie), `faith` (fe al final), `chapelYear` (año de la primera capilla), `lordAsked` (decisiones de `history` cuya plantilla es de categoría `lord`), `events` (`state.happenings.length`). Correr `npx tsx tools/agency-report.ts --seeds 24 --years 60 --only nada,arado,reliquia,"peor encrucijada"` y `npx tsx tools/fate-report.ts` con las seis semillas de siempre. Guardar las filas en `docs/rey-medida.md` §1 tal cual salen.

**Terminado cuando** las cifras de `nada` de hoy están escritas (población mediana, muertas y año más temprano, primera piedra, obras, campo/bosque/obra, y las cinco columnas nuevas), más los sucesos al año y la distancia entre valles del `fate-report`.

### K-1 · La corona: estado, acto y migración

**Qué.** Coronar a alguien, pagarlo, contarlo y guardarlo. Todavía no hace nada (K-2).

**Ficheros.** `src/engine/state.ts`, `src/engine/balance.ts` (`CROWN`), `src/engine/people/crown.ts` (nuevo), `src/engine/world/crown.ts` (nuevo), `src/engine/sim.ts` (paso 1b, `TickReport`), `src/engine/save.ts` (migración 9 → 10 y validación), `src/engine/found.ts` (`crown: null`), `src/engine/crossroads/catalog/succession.ts` (lee `CROWN.CANDIDATE_AGES`, mismo número), `src/engine/chronicle/bank.en.ts` (claves de §6), `tests/fast/crown.test.ts` (nuevo), `tests/fast/save.test.ts`, `tests/fast/module-graph.test.ts` (listas de imports: `people/crown.ts` como hoja; `world/crown.ts`).

**Cómo.**

1. `crownKing(state, who)`: `crownRefusal` primero; si no, resta `CROWN.SILVER`, toma al desplazado (`holderOf('leader')` distinto de `who`, si lo hay) y le pone `role: null`, `adjustOpinion(old, who, SET_ASIDE_OPINION)`, `remember(old, was_passed_over, about who, SET_ASIDE_MEMORY)`; al coronado, `role: 'leader'` guardando antes su oficio en `crown.trade`; `state.crown = { id, since: tick, trade }`; `flags.crowned = 0` (permanente; no lo lee nadie todavía, y queda para R-4); si `styleOf(trade) === 'court'`, `flags.watched = tick + COURT_WATCHED_YEARS · 48`; después `passedOver(state, who)` (los ambiciosos sin oficio, como en `fillVacancies`). No consume azar.
2. Migración 9 → 10 en `deserialize`: `crown: null` si falta. Validación: `crown === null || (record && tickValue(id) && tickValue(since) && (trade === null || ROLES.has(trade)))`; `actRecord` acepta `kind === 'crown' && tickValue(who)`.
3. La entrada de crónica: `kind: 'succession'`, `templateKey: crown.given.<style>`, `params: { name, season, year }`, peso 3; y si hubo desplazado, `crown.set_aside` con `{ name: old, king: name }`, peso 2.

**Pruebas** (`tests/fast/crown.test.ts`, con el `rich()` de `means.test.ts`):

- Coronar cuesta exactamente `CROWN.SILVER` y nada más.
- No se corona sin plata, con menos de `MIN_PEOPLE`, a un anónimo, a un muerto ni a nadie fuera de banda; cada negativa tiene su motivo; queda en `acts` con `done: false` y el estado no cambia.
- Coronar **no mueve una sola tirada** (`a.rng` igual a `b.rng`, como en `means.test.ts`).
- El rey toma el asiento: `holderOf(state,'leader')` es él, `crown.trade` es su oficio de antes; el desplazado queda sin oficio, con memoria `was_passed_over` y opinión −45 hacia el rey.
- Coronar al que ya mandaba no crea enemigo ni entrada de desplazado, y `crown.trade === 'leader'`.
- La corona no se da dos veces (`'already'`).
- Dos partidas con la misma semilla y una coronación en el mismo tick son idénticas byte a byte tras 2 000 ticks (mismo hash que usa `sim.test.ts`).
- `save.test.ts`: un guardado de esquema 9 entra con `crown: null` y `will(state)` igual a `RESTING_WILL`.

**Terminado cuando** las ocho pasan, `npm run typecheck && npm run lint`, y `nada` en `agency-report` da exactamente la fila de K-0 (esta fase no puede mover ni un número).

### K-2 · La voluntad del rey

**Qué.** Los ocho puntos del tick que leen `will(state)`. Es la fase que hace que «dependiendo de quién elijamos, la aldea tire por un lado o por otro».

**Ficheros.** `src/engine/world/works.ts`, `src/engine/subsistence/labour.ts`, `src/engine/subsistence/mood.ts`, `src/engine/world/fate.ts`, `src/engine/people/demography.ts`, `src/engine/crossroads/select.ts`, `src/engine/balance.ts` (comentarios TUNE), `tests/fast/crown-will.test.ts` (nuevo), `tests/fast/module-graph.test.ts` (labour, mood, works, demography ganan `people/crown`; labour pierde `INTENT_RANGE`), `docs/design.md` §6.3 (dos filas escritas por fin, dos nuevas).

**Cómo.**

1. `works.ts nextProject`: `const family = will(state).priority === 'none' ? null : PRIORITY_FAMILIES[...]`; punto 8 con `will.arms`. **Trampa que hay que cerrar en el mismo commit:** `NO_PROJECT` es una caché que sólo se invalida si cambia su instantánea (`projectSnapshot`); si no lleva la corona, tras coronar la aldea sigue diciendo «nada que hacer» hasta que cambie otra cosa. `NoProjectSnapshot` gana `style: CrownStyle | null`.
2. `labour.ts allocateLabour`: `will(state).fields` en lugar de `state.intent.fields`, recortado a `[0.5, 2]` como hoy (los dos números de `INTENT_RANGE` pasan a `CROWN` o se quedan donde están hasta K-7; decidir en K-7). `produce`: `× will.works`.
3. `mood.ts`: `faithTarget` = el mayor de `MOOD.FAITH_DRIFT_TO`, `will.faithTo` y la reliquia (dos fuentes de fe no se suman: gana la más alta, como los `story` de §8.6); `MORALE_HUNGER · severity · will.hunger`; `+ COURT_MORALE` si `style === 'court'` y `has(state,'hall')`.
4. `fate.ts`: en `weightOf`, `quarrel_in_the_square` × `will.quarrel`; en `happen`, `harvest_feast` y `ale_feast` × `will.feast` sobre el ánimo (la fe no se toca).
5. `demography.ts resolveMigration`: `chance × will(state).gate` (una tirada, como hoy).
6. `select.ts eligible`: si `t.category === 'lord'` y `will.style === 'forge'`, `storyCandidates.push(CROWN.FORGE_LORD)`. Nota: la regla «gana el más lejos de 1» ya está; con `behind_the_wall` (0,4) el muro gana, y es correcto: un rey armado detrás de una muralla molesta menos que uno sin ella.

**Pruebas** (`crown-will.test.ts`, una tabla por estilo, «cada estilo abre algo y cierra algo»):

- `forge`: con fragua y sin `threatened`, `nextProject` quiere `palisade`; el `score` de una plantilla `lord` sube ×1,5 frente al mismo estado sin corona.
- `plough`: con campos de sobra, `allocateLabour().workedFields` es mayor que sin corona y `harvest().yielded` por campo no cambia (es el mismo aserto que el arado: manos, no cosecha).
- `chapel`: la fe deriva hacia 50 (dos años de `updateMood` sin capilla suben la fe; sin corona, baja hacia 40); el ánimo de `ale_feast` sube la mitad.
- `court`: `watched` puesto al coronar; con la sala en pie, `updateMood` da más ánimo que sin ella.
- Rasgos: `ambitious` → `produce().buildPoints` ×1,05; `generous` → la misma semana de hambre cuesta menos ánimo; `hot_tempered` → `weightNow(quarrel)` ×1,5; `craven` → en 12 semillas × 20 años llegan **menos** forasteros con el rey miedoso que con el mismo rey sin el rasgo (`traits` cambiado a mano; suma, nunca una semilla).
- **Sin corona, nada cambia:** `will(foundGame(7))` es `RESTING_WILL`, y `nada` en `agency-report` sigue dando la fila de K-0.
- `fate.test.ts` («sólo consume azar del flujo `fate`») se corre con un estado coronado además del de siempre.

**Terminado cuando** las tablas pasan y `agency-report --only nada` no ha movido una cifra.

### K-3 · La corona pasa por la sucesión

**Qué.** Que al morir el rey la pregunta de A.15 elija al siguiente rey, con su estilo, y que el texto no mienta.

**Ficheros.** `src/engine/crossroads/resolve.ts` (`applyEffect`, caso `role`; `applyOption`), `src/engine/chronicle/bank.en.ts` (tres textos de `succession` neutros; `crown.passed.<style>`), `tests/fast/crown.test.ts` (ampliar), `tests/fast/catalog.test.ts` (sólo si algún texto reescrito rompe §9.3: no debería).

**Cómo.** En `applyEffect`, caso `role`: si `e.role === 'leader'` y `state.crown !== null`, antes de sobrescribir `v.role`, `state.crown = { id: v.id, since: state.tick, trade: v.role }`. En `applyOption`, si `crown.id` cambió durante los efectos, empujar `crown.passed.<style>` (peso 2, `params: { name, season, year }`) detrás de la línea de la decisión. `no_one` no toca `crown`: el trono queda vacante y `kingOf` devuelve `null`. `sim.ts` no cambia: la dispersión sigue mirando `templateId === 'succession'` y `optionId === 'no_one'`.

**Pruebas.**

- Con el valle coronado, `choose_b` deja `crown.id === B` y `crown.trade` igual al oficio que B tenía; `will(state).style` es el de ese oficio.
- Tres `no_one` seguidos con corona dispersan igual que sin ella (`sim-endings.test.ts` ya lo mide; se repite coronado).
- Con el trono vacante, `will(state)` es `RESTING_WILL` y `crisisOf` es `'succession'`.
- Los textos de `crossroad.succession.*` no contienen `leader` ni `king` (propiedad: valen para los dos).

**Terminado cuando** pasan, y `docs/design.md` §6.6 lleva un párrafo: «desde K-3 la sucesión también pasa la corona».

### K-4 · La sala del rey

**Qué.** El edificio, su sitio en la cola, su fuego y su caja en el valle. Sin malla todavía (§8).

**Ficheros.** `src/engine/state.ts` (`'hall'`, `'court'`, `PRIORITY_FAMILIES`), `src/engine/balance.ts` (`BUILDINGS.hall`, `FIRE_KINDS`), `src/engine/world/works.ts` (punto 2b; `AUTOMATIC_KINDS`), `src/engine/world/placement.ts` (`WALLED` gana `hall`), `src/engine/world/buildings.ts` (`houseHomeless` cuenta la sala como techo; `complete` en `works.ts` muda al rey), `src/engine/people/demography.ts` (`housingCapacity` suma `count(hall) · CROWN.HALL_BEDS`), `src/engine/chronicle/events.ts` (`fireKey` gana `fire.hall`; `SINGULAR_BUILDINGS` gana `hall`), `src/engine/chronicle/bank.en.ts` (`built.hall`, `fire.hall`, `building.hall`, `inspect.hall.*`), `src/render3d/world/buildings.ts` (`BUILDING_ASSETS.hall: 'hall'`), `src/render3d/visual-config.ts` (`BUILDING_LOOKS.hall`, tejado `#773B42` = `leaderBurgundy`), `tools/graphics/bundle-game.ts` (la línea del recurso «aún sin modelo»), `src/ui/inspect.ts` (la ficha de la sala), `tests/fast/crown-hall.test.ts` (nuevo), `tests/fast/graphics-world.test.ts` o `art-manifest.test.ts` si enumeran `BuildingKind`.

**Cómo.** Punto 2b de `nextProject`: `if (kingOf(state) !== null && !has(state,'hall') && people >= CROWN.HALL_PEOPLE) wanted.push('hall')`. `familyOf('hall') === 'hall'`, tope 1. Al completarse (`complete`), si hay rey, `king.homeId = id`. `placeBuilding` no necesita rama: la de omisión puntúa por distancia a la plaza. `lightning_fire` y `rollFire` la ven por `FIRE_KINDS`.

**Pruebas.**

- Con un valle coronado, rico y con sitio, la sala se abre como proyecto en el primer tick sin obra y se termina; queda a ≤ `PLAZA.RADIUS + 3` celdas del centro de la plaza (medir en 6 semillas, ninguna a más).
- El rey vive en ella (`homeId`), `housingCapacity` sube en 5 y `houseHomeless` la usa.
- Sin rey no se pide nunca (`nextProject` en 12 semillas × 60 años con `nada`: cero `hall`).
- Con `lightning_fire` forzado en un valle con sala y varias casas, la sala puede arder y el rey queda sin techo hasta `houseHomeless`; con una sola casa y la sala, el rayo puede quemar la sala (no es «la última casa»).
- `planFor` da `asset: 'hall'` y, sin recurso en el manifiesto, `Village.add` cae a la caja con tejado burdeos (misma propiedad que `graphics-world.test.ts` ya guarda para los demás).

**Terminado cuando** pasan, `npm run shot -- --seed 11 --year 50` con una coronación forzada (ver K-5) enseña la caja burdeos junto a la plaza, y `docs/design.md` §7.2 tiene la fila de `hall` y §7.3 el punto 2b.

### K-5 · Lo que se ve y se toca

**Qué.** La fila de la corona en el carro, la palabra `king`, la ficha, y el camino para fotografiarlo.

**Ficheros.** `src/ui/redesign/contracts.ts` (`UiActions.crown(who)`; se reabre §11.2 con el coordinador como pide el fichero: **no es una ruta nueva**, sigue siendo el carro), `src/ui/redesign/cart.ts` (la fila con candidatos), `src/ui/app.ts` (`crown(who)` igual que `give`), `src/ui/redesign/hud.ts` (`canGiveSomething` incluye la corona), `src/derive/crown.ts` (nuevo), `src/ui/redesign/people-panel.ts`, `src/ui/person-card.ts`, `src/ui/inspect.ts` (`roleKeyFor`), `src/engine/chronicle/bank.en.ts` y `bank.es.ts` (claves de §6), `tools/graphics/shot.mjs` y `observe-life.mjs` (`--crown <trade>`: corona al primer candidato de ese oficio el primer tick que se pueda, por el mismo camino que `--means`), `tools/valley.shots.ts` (recorrido nuevo), `tests/fast/crown.test.ts` (`crownCandidates`, `roleKeyFor`).

**Cómo.** La fila: cabecera «A crown» con la ficha de plata; debajo, **una fila por candidato** con la misma tira de pergamino que `people-panel.ts` (medallón, «Nombre · N winters», oficio, rasgos) más la línea `crown.style.<style>` y un botón «Crown» → `actions.crown(v.id)`. Si no se puede, un solo motivo escrito (`cart.no.small`, `cart.no.cost`, `cart.no.nobody`) y las filas apagadas. Coronado: la fila dice `cart.crown.reigns` y no ofrece nada; vacante: `cart.crown.empty` (la corona pasa por la sucesión, §0.4). **Sin cifras sueltas** y sin `.valley-panel` (las dos trampas de M-2, `piel-del-valle`).

**Pruebas.**

- `crownCandidates` (pura): sólo nombrados presentes en banda, ordenados por id, nunca más de `MAX_NAMED`.
- `roleKeyFor`: `'role.king'` sólo para el titular de `leader` con `crown !== null`; `'role.leader'` antes de coronar; `null` sin oficio.
- Recorrido en `valley.shots.ts` contra el render 3D (dice contra cuál corre, regla de `CLAUDE.md`): abrir el carro en un valle que puede coronar (`?crown=ready` en la ruta de depuración), tocar «Crown» en el segundo candidato, la voz dice la coronación, la lista de la gente lo llama `king`, y la fila del carro pasa a «reigns». Captura en `artifacts/k5-crown.png`.

**Terminado cuando** el recorrido pasa y hay **secuencia de capturas para el dueño**: el carro con los candidatos, el toque, la voz, la ficha del rey, la sala (caja) junto a la plaza.

### K-6 · La medida, y es la que decide si el rey vale

**Qué.** Lo mismo que M-2: si cuatro reyes dan la misma aldea, el rey es decorado y se para aquí.

**Ficheros.** `tools/agency-report.ts` (cinco variantes: `rey herrero`, `rey del campo`, `rey cura`, `rey de corte`, `rey cualquiera`; cada una corona al primer candidato de ese estilo la primera semana que `crownRefusal` lo permite y no da nada más; y `arado y rey herrero` para ver si se complementan), `docs/rey-medida.md` §2, `docs/design.md` §12 (la tabla de `CROWN` con lo medido al lado), `docs/task-log.md`.

**Criterios, con 24 semillas × 60 años y política `prudent`:**

1. **Distancia lateral, no escalera.** Cada estilo tiene una firma que un tercero distinga y que la tabla enseña: `forge` con ≥ 2× tramos de muralla que `nada` en la mediana; `plough` con más grano mediano y más campos trabajados; `chapel` con la capilla ≥ 8 años antes en la mediana; `court` con la sala antes del año de coronación + 10 en ≥ 18 de 24, y más preguntas del señor. Y **ningún estilo gana a los otros tres a la vez en población, supervivencia y primera piedra** — si uno lo hace, es una escalera y se baja su número (el sospechoso es `PLOUGH_FIELDS`).
2. **El caos no baja.** Muertas con cada rey ≥ muertas de `nada` − 1 (sobre 24), sucesos por año dentro de ±10 % de `nada` (`fate-report`), y el año más temprano de muerte no más tarde que el de `nada` + 5.
3. **Llega a tiempo.** Año mediano de coronación entre 15 y 30; si pasa de 35, bajar `SILVER` o `MIN_PEOPLE` y remedir.
4. **Se complementan.** `arado y rey herrero` no sale peor que `arado` solo en población (la trampa de «el carro entero», §7.12).

**Listones de §12.9 que esto puede mover**, y hay que anotar en `docs/rey-medida.md` con el número: «Mediana del pico de población 65–85» (`plough` hacia arriba, `forge` hacia abajo por las manos en la muralla); «Partida terminada 2–12 %» (`FORGE_LORD` y `watched` traen más señor); «Encrucijadas por generación 1–5» (más `lord` con `forge`/`court`); «Fracción de ticks elegibles < 1 %» (las plantillas del señor con `watched` puesto veinte años: correr `npm run eligibility` con `--crown court`). La suite de balance está por remedir desde R-1 (decisión 5): estas cifras van al informe, no a los asertos.

**Terminado cuando** los cuatro criterios se cumplen o el informe dice cuál no y por qué, y el dueño juega una tarde con la demo y dice si se nota quién manda — la única medida que no cabe en un script.

### K-7 · Limpieza: retirar `state.intent` (decisión del dueño)

**Qué.** Con K-2, `state.intent` no lo lee nadie. `docs/task-log.md` §4.0 lo deja para «quien suba el esquema del guardado», y ésta es esa subida.

**Ficheros.** `src/engine/state.ts` (`Intent`, `INTENT_RANGE`, `INTENT_STOPS`, `PRIORITY_STOPS`, `stopOf`, `restingIntent`), `src/engine/found.ts`, `src/engine/save.ts` (deja de validar `intent`; la migración lo ignora), `src/engine/balance.ts` (`RESTING_FIELDS`, `RESTING_TIMBER`: se quedan comentados como historia o se van), `tests/journeys/intent.test.ts` (se retira: mide una palanca que no existe y está roja por ello), `docs/design.md` §5.2 y §13.1.

**Lo que hay que decir en el changelog, y es la única excepción a §13.1 de este plan:** una partida anterior a M-2 con una palanca puesta (`priority !== 'none'` o `fields !== 1`) cambia de postura al cargar, porque la palanca ya no existe. Desde M-4 la interfaz no puede escribirla, así que sólo afecta a guardados de la v2.0.

**Terminado cuando** `grep intent src/engine` no encuentra nada, la suite rápida pasa y el esquema sigue en 10 (quitar un campo no lo sube).

---

## 3. El orden del tick, literal (lo que cambia)

```
  1b. ACTS       + kind:'crown' → crownKing (paga, asiento, crown, flags, opiniones, crónica)
  2.  ANNUAL     resolveMigration: chance × will.gate                       [K-2]
  2b. FATE       weightOf: quarrel × will.quarrel; happen: fiestas × will.feast [K-2]
  3.  DECISION   applyEffect role:'leader' con corona → crown pasa           [K-3]
  5.  LABOUR     allocateLabour: will.fields; produce: × will.works          [K-2]
  6.  WORKS      nextProject: will.priority, will.arms, punto 2b hall        [K-2, K-4]
  12. MOOD       faithTo, hunger, COURT_MORALE                               [K-2]
  15. CROSSROAD  story lord × FORGE_LORD                                     [K-2]
```

Ningún paso cambia de sitio (§4.2 es normativo). Ninguno consume una tirada más.

---

## 4. Lo que el plan no toca, a propósito

- **`life/`** es de la otra sesión (`docs/dos-sesiones.md`): el rey sigue con la rutina del jefe (`day.ts` 111: la plaza y el chismorreo). Que tenga corte en la sala es un encargo aparte a esa sesión, con el `hall` ya en el estado y `homeId` apuntando a él.
- **Las encrucijadas no se afinan** (`CLAUDE.md`): ni pesos ni plantillas nuevas. La bandera `crowned` queda puesta para que R-4 pueda leerla.
- **El identificador `'leader'`** no se renombra a `'king'`: §2.2 (estables para siempre), siete plantillas lo reparten, `VILLAGER_BY_ROLE`, `TRAIT_WEIGHTS` y `save.ts` lo enumeran. La palabra la pone `derive/crown.ts`.
- **Hierro, armas, un quinto montón:** no. «Si el rey herrero hace armas, las armas son un rasgo de valle y no un quinto montón» (`plan-medios.md` §6.3): aquí son la muralla adelantada y el señor que la cuenta.

---

## 5. Determinismo, en una lista

- Sin flujo nuevo en `RNG_STREAMS`; el dorado de `rng.test.ts` no se toca.
- `crownKing` no llama a `next`, `int`, `pick` ni `weighted`. Prueba: `a.rng` igual a `b.rng`.
- Los pesos cambian, las tiradas no: `weighted` es una tirada por sorteo; `resolveMigration` una tirada por año.
- La sucesión no gana plantilla: `fillCast` saca las mismas tiradas de `cast`.
- Partida sin corona: `will === RESTING_WILL` en todos los pasos → trayectoria de hoy. Prueba: la fila `nada` de K-0 se repite exacta tras K-1, K-2 y K-4.

---

## 6. Las claves nuevas del banco (`bank.en.ts`)

Crónica, 3–5 variantes, §9.3 (sin exclamaciones, sin segunda persona, sin juicio):

| Clave | Parámetros | Peso | Tipo |
|---|---|---|---|
| `crown.given.forge` · `.plough` · `.chapel` · `.court` | `name, season, year` | 3 | `succession` |
| `crown.set_aside` | `name` (el desplazado), `king`, `season`, `year` | 2 | `succession` |
| `crown.passed.forge` · `.plough` · `.chapel` · `.court` | `name, season, year` | 2 | `succession` |
| `built.hall` | `year, season, count, building` | 2 (singular) | `built` |
| `fire.hall` | `year, season, building, grain` | 2 | `fire` |

Pantalla (una forma por clave):

`cart.crown` «A crown» · `cart.crown.what` · `cart.crown.who` «Who wears it» · `cart.crown.give` «Crown» · `cart.crown.reigns` «{name} has worn the crown since ANNO {year}.» · `cart.crown.empty` «The crown waits for the next to be asked.» · `cart.no.small` · `cart.no.nobody` · `crown.style.forge` «Would see to the walls» · `crown.style.plough` «Would see to the fields» · `crown.style.chapel` «Would see to the chapel» · `crown.style.court` «Would see to the hall» · `role.king` «king» · `building.hall` «king's hall» · `inspect.hall.king` «{name} holds court here.» · `inspect.hall.empty` «No one holds court here.»

Los tres textos de `crossroad.succession.*` de pantalla se reescriben neutros (K-3). `bank.es.ts` recibe las de pantalla; las que falten caen al inglés (`locale.test.ts` lo permite).

---

## 7. Qué puede salir mal, y cómo se mide

| Riesgo | Cómo se ve | Medida y remedio |
|---|---|---|
| **Escalera:** un estilo gana siempre | El jugador corona siempre al mismo oficio | K-6 criterio 1. Si `plough` domina, bajar `PLOUGH_FIELDS`; si `forge` hunde la población, es correcto (manos en la muralla) mientras la firma sea distinta |
| **El rey apaga el caos** | Menos muertas, menos sucesos | K-6 criterio 2 contra `nada`. Los pesos de `FATE` no se tocan; `CHAPEL_FEAST` y `CRAVEN_GATE` sólo quitan, `FORGE_LORD` y `TEMPER_QUARREL` sólo añaden |
| **Llega tarde** | Corona en el año 40 | Criterio 3. Precio o umbral |
| **La caché de obras se lo traga** | Coronas y la aldea no levanta nada | `NoProjectSnapshot` con `style` (K-2), y prueba: coronar en un tick sin obra abre proyecto al siguiente |
| **La sala no cabe** | `placeBuilding` devuelve `null` en un mapa lleno | Nada se rompe; el `court` pierde su mitad buena. Medir `hallYear` en K-6; si falla en > 6 de 24, la sala pasa a 2×2 |
| **La pantalla de sucesión miente** | «The leader is buried» con un rey | K-3: textos neutros, con prueba |
| **Un guardado v2.0 con palanca** | Cambia de postura al cargar | K-7, escrito en el changelog; sólo pre-M-2 |
| **Dos fuentes de fe** | Reliquia y rey cura se suman | K-2: gana la más alta, como los `story` |
| **La corona en el trono vacante** | El jugador quiere volver a coronar tras `no_one` | Decisión del dueño (§9.2). Recomendado no: el interregno es el precio de A.15 |

---

## 8. Encargo de arte · la sala del rey (`hall`)

**Para la sesión de Blender.** Mismo formato que `docs/encargo-arado.md` y `docs/encargo-fuente.md`. El dueño lo anotó el 18 sep 2026: «debe tener una casa que se diferencie; eso queda anotado para hacerlo más adelante en 3D». Hasta que exista, el juego la dibuja como una caja de 3×3 con el tejado burdeos (`BUILDING_LOOKS.hall`), que se distingue pero no se mira.

### 8.1 Qué es, en una frase

**Una casa larga de madera con un porche de dos postes, puerta de dos hojas y un mástil con pendón.** No es un castillo ni una iglesia: es la casa más grande de una aldea del siglo IX–XI inglés (§1), la del que manda. Lo que la silueta tiene que decir es *«aquí vive alguien distinto»*, no *«esto es una fortaleza»* — la muralla y la atalaya ya dicen lo segundo.

### 8.2 Medidas

Una celda son **3 m** (D.6.2) y un aldeano **1,95 m** (0,65 celdas).

| Qué | Metros | Celdas | De dónde sale |
|---|---|---|---|
| Huella | 9 × 9 | **3 × 3** (`footprint: [3, 3]`) | `BUILDINGS.hall`, como la iglesia |
| Cuerpo | 8,4 × 6,0 en planta, dejando el porche delante | — | La casa ocupa 5,16 de sus 6 |
| Alto de pared | 2,8 | 0,93 | La casa mide 2,3: un poco más, no el doble |
| Alto a la cumbrera | 5,6 | 1,87 | Por debajo de la iglesia (`walls` 1,3 + `roof` 0,9 en `visual-config`) y por encima del molino |
| Porche | 6,0 de ancho, 1,8 de fondo, dos postes | — | Es lo que la diferencia desde arriba: un vano oscuro con dos verticales |
| Mástil | 7,5 de alto en una esquina delantera, pendón de 1,2 × 0,7 | — | La única pieza de color de acento; se ve desde la cámara de reposo |

**Comprobación:** junto a `villager`, la puerta le saca una cabeza (2,4 m); junto a `house`, la cumbrera de la sala tiene que quedar más alta y **no** el doble.

### 8.3 Piezas, de atrás hacia delante

1. **El basamento** de piedra, 0,4 m, como la casa.
2. **Las paredes** de entramado y adobe, con las vigas vistas más juntas que en la casa (cada 1,2 m).
3. **El tejado** a dos aguas, cumbrera transversal a la puerta, con dos **remates cruzados** en los hastiales (0,6 m), que es el gesto sajón y lo que un tejado de paja corriente no tiene.
4. **El porche**: dos postes de 0,3 de lado y un dintel, techado con la prolongación del alero.
5. **La puerta** de dos hojas, 2,4 × 2,2 m, **con la malla llamada `hall_door`**: el render cuelga la bisagra de `<id>_door` (`buildFromAsset`) y sin ese nombre la puerta no abre.
6. **Tres ventanas** pequeñas por lado largo, contraventanas cerradas.
7. **El mástil con pendón**, en la esquina delantera derecha. Si el presupuesto no llega, es la pieza que se cae; el porche no.

**Lo que no lleva:** almenas, torre, cruz, chimenea de piedra, escudo. Nada de eso es de esta aldea.

### 8.4 Materiales, y sólo estos

De `art/recipes/palette.json`. Los nombres tienen que ser **exactamente** estos o el pipeline deja el material sin asignar:

| Nombre | `role` | Para qué |
|---|---|---|
| `stone` | `stone` | Basamento |
| `plaster` | `plaster` | Paredes |
| `wood` | `timber` | Vigas, postes, remates, mástil |
| `roof` | `roof` | Tejado; **`house: "thatched"`** como la casa, no teja: es de madera (`tier 0`) y arde |
| `door` | `timber` | Las dos hojas (independiente, por la bisagra; IA-10) |
| `window` | `timberDark` | Contraventanas |
| `banner` | `clothAccent` | El pendón. Es el único color que la sala añade a la escena, y ya está en la paleta |

El tejado se reconoce por el nombre `roof` para nevar sobre él (`roofsOf` en `render3d/world/buildings.ts`). **No se añaden colores a la paleta.**

### 8.5 Receta, eje y presupuesto

- `art/recipes/hall/hall.json`, `schemaVersion: 1`, `mergeByMaterial: true`, `palette: "../palette.json"`, `house: "thatched"`, `metadata.kind: "hall"`, `footprint: [3, 3]`, escrita en metros con `scale: 1/3` y su `scaleNote`, como `house.json` y `stone-house.json`.
- **Origen en la esquina**, huella hacia +X y +Z, como todos los edificios (D.4; `buildFromAsset` coloca el grupo en la esquina que dice el motor). Mirando a **+z**: la puerta y el porche hacia delante.
- **Presupuesto: ≤ 900 triángulos**, el de un edificio de 3×3 que se mira de cerca (está junto a la plaza, donde la cámara se para). Cilindros de 6 lados para postes y mástil. Sin suavizado: facetas planas.
- Sin animación salvo la puerta, que la anima el juego.
- `id: "hall"`, con una `note` que diga de qué ronda sale.

### 8.6 Cuándo se ve

La aldea la levanta sola después de coronar a alguien (§7.3, punto 2b), junto a la plaza, y el rey se muda a ella. Con el rey de corte es lo primero que se levanta. **Y puede arder**: el rayo y el incendio de §5.9 la tratan como a la capilla, así que la ruina es `ruin-wood` como la de cualquier casa de madera.

### 8.7 Cómo entra en el juego

1. `npm run art` construye la receta y deja la malla aprobada.
2. `npm run assets:publish` la mete en `public/assets/valley3d/manifest.json` con su `sha256`.
3. **Nada más:** `BUILDING_ASSETS.hall = 'hall'` (K-4) ya la pide en `WANTED` a través de `Object.values(BUILDING_ASSETS)`, y `Village.add` cambia la caja por la malla en cuanto `instance('hall')` la devuelve. La línea de `tools/graphics/bundle-game.ts` la pone K-4.

### 8.8 Cómo se comprueba

```
npm run bundle -- --out artifacts/graphics/K-4/game
node tools/graphics/observe-life.mjs --page artifacts/graphics/K-4/game/valley.html \
  --crown court --seed 11 --year 40 --live --speed 16 --seconds 20 --fps 2 \
  --out artifacts/graphics/K-4/sala
```

En la traza, `penetratingCircles` y `blockedCentres` a cero (nadie atraviesa la sala ni acaba dentro), la puerta abre cuando el rey entra, y en la imagen la sala se lee **más grande y más alta que las casas y más baja que la iglesia**, con el pendón visible desde la cámara de reposo.

---

## 9. Lo que sólo puede decidir el dueño del diseño

1. **El precio y el umbral** (30 plata, 30 personas). Recomendación: los de arriba, y que K-6 los mueva si la coronación no cae entre los años 15 y 30.
2. **Si la corona pasa sólo por la sucesión** o se puede volver a coronar desde el carro con el trono vacante. Recomendación: **sólo por la sucesión**; volver a coronar desde el carro es escapar del interregno que A.15 cobra.
3. **Si el líder de la fundación se queda hasta la coronación.** Recomendación: **sí**; sin él, siete plantillas quedan mudas y la pareja no recibe a nadie.
4. **La tabla oficio → estilo** (dónde caen la comadrona, el herbolario y el forastero). Recomendación: la de §0.3; es un dato y se cambia sin código.
5. **Si la sala es la casa del rey (con camas) o sólo su sede.** Recomendación: **su casa**; es lo que dijo («una casa que se diferencie»), y cuesta cuatro líneas.
6. **Si la sala arde.** Recomendación: **sí**; el caos es el juego y una casa de madera que no arde es una excepción que hay que explicar.
7. **Las dos filas de rasgo nuevas** (`craven`, `hot_tempered`), o sólo las dos de §6.3 que faltaban. Recomendación: las cuatro; §6.3 pasa de seis a ocho filas y se escribe por qué.
8. **Entre quién se elige:** todos los nombrados en banda (incluido el par de manos sin oficio) o sólo los que tienen oficio. Recomendación: **todos**; «el puesto de trabajo» decide el estilo y el que no lo tiene es rey del arado.
9. **El listón de K-6:** distancia lateral con firmas (recomendado) o ≥ 20 puntos de población como M-2. Recomendación: **firmas**; los estilos son elecciones de lado, no de altura, y pedir 20 puntos de población empuja a diseñar una escalera.
10. **Retirar `state.intent` en K-7.** Recomendación: **sí**, porque el esquema sube igualmente; con la excepción a §13.1 escrita en el changelog.
11. **La palabra del asiento antes de coronar:** `leader` (hoy) o cambiarla ya a algo más de aldea («headman»). Recomendación: dejar `leader`; es un cambio de banco que no bloquea nada.

---

## 10. Ficheros por fase, de un vistazo

| Fase | Motor | Fuera del motor | Pruebas |
|---|---|---|---|
| K-0 | — | `tools/agency-report.ts`, `docs/rey-medida.md` | — |
| K-1 | `state.ts`, `balance.ts`, `people/crown.ts`, `world/crown.ts`, `sim.ts`, `save.ts`, `found.ts`, `catalog/succession.ts`, `chronicle/bank.en.ts` | — | `crown.test.ts`, `save.test.ts`, `module-graph.test.ts` |
| K-2 | `world/works.ts`, `subsistence/labour.ts`, `subsistence/mood.ts`, `world/fate.ts`, `people/demography.ts`, `crossroads/select.ts`, `balance.ts` | `docs/design.md` §6.3 | `crown-will.test.ts`, `fate.test.ts`, `module-graph.test.ts` |
| K-3 | `crossroads/resolve.ts`, `chronicle/bank.en.ts` | `docs/design.md` §6.6 | `crown.test.ts`, `sim-endings.test.ts` |
| K-4 | `state.ts`, `balance.ts`, `world/works.ts`, `world/placement.ts`, `world/buildings.ts`, `people/demography.ts`, `chronicle/events.ts`, `chronicle/bank.en.ts` | `render3d/world/buildings.ts`, `render3d/visual-config.ts`, `tools/graphics/bundle-game.ts`, `ui/inspect.ts`, `docs/design.md` §7.2–7.3 | `crown-hall.test.ts`, `graphics-world.test.ts` |
| K-5 | `chronicle/bank.en.ts`, `bank.es.ts` | `derive/crown.ts`, `ui/redesign/contracts.ts`, `cart.ts`, `hud.ts`, `people-panel.ts`, `ui/person-card.ts`, `ui/inspect.ts`, `ui/app.ts`, `tools/graphics/shot.mjs`, `observe-life.mjs`, `tools/valley.shots.ts` | `crown.test.ts`, `valley.shots.ts` |
| K-6 | `balance.ts` (comentarios) | `tools/agency-report.ts`, `docs/rey-medida.md`, `docs/design.md` §12, `docs/task-log.md` | — |
| K-7 | `state.ts`, `found.ts`, `save.ts`, `balance.ts` | `docs/design.md` §5.2, §13.1, `docs/changelog.md` | `tests/journeys/intent.test.ts` (se retira) |

---

## 11. Ficheros que concentran la ejecución

- `src/engine/state.ts` — `Crown`, `PlayerAct 'crown'`, `'hall'`, `'court'`, `SCHEMA_VERSION = 10`.
- `src/engine/world/works.ts` — `nextProject` deja de leer `state.intent` y lee `will(state)`; punto 2b; la trampa de `NO_PROJECT`.
- `src/engine/sim.ts` — paso 1b con el acto de coronar; `TickReport.crown`.
- `src/engine/save.ts` — migración 9 → 10 y validación de `crown` y del acto.
- `src/engine/crossroads/resolve.ts` — la corona pasa con el efecto `role: 'leader'`.
- Y los dos ficheros nuevos que concentran el diseño: `src/engine/people/crown.ts` como hoja pura —`kingOf`, `will`, `crownCandidates`, `crownRefusal`— y `src/engine/world/crown.ts` con el acto `crownKing`.
