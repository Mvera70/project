# The Valley — Documento de diseño detallado

**v2 · Septiembre 2026 · Sucede a `valle.md` (v1)**

Simulación idle de una aldea medieval para móvil.

> **Qué es este documento.** `valle.md` decide *qué* juego es. Este decide *cómo*
> se construye, con el detalle necesario para que varios agentes trabajen en
> paralelo sin consultarse entre ellos. Todo lo que aquí se afirma es
> vinculante; lo que no aparece, se decide en el módulo correspondiente y se
> documenta ahí.

---

## 0. Cómo usar este documento

Está pensado para dos lectores distintos.

**Si vas a coordinar:** lee las secciones 1 a 4 y el capítulo 17 (briefs). Ahí
está el reparto y las dependencias.

**Si eres un agente asignado a un módulo:** lee, en este orden,

1. Sección 1 (decisiones cerradas) y sección 2 (convenciones) — obligatorio,
   son cortas.
2. Sección 3 (modelo de dominio) y sección 4 (el tick) — obligatorio, es el
   contrato común.
3. Las secciones de sistema que tu brief cite.
4. **Tu brief** en el capítulo 17. Es la fuente de verdad de tu tarea: define
   qué ficheros tocas, qué API expones, qué tests debes entregar y cuándo has
   terminado.

**Reglas de convivencia entre agentes:**

- No toques ficheros fuera de los que tu brief lista. Si necesitas un cambio en
  un fichero ajeno, escríbelo como nota en el PR, no lo hagas.
- No inventes números. Todos los valores de balance están en la sección 12 y
  viven en `src/engine/balance.ts`. Si necesitas uno que no existe, añádelo a
  ese fichero con un comentario `// TUNE:` y menciónalo en el PR.
- Los nombres de tipos, campos y funciones de la sección 3 y de los contratos de
  cada brief son **literales**. Otro agente está escribiendo código contra
  ellos ahora mismo.
- Todo texto que vea el jugador está en inglés y sale de un banco de plantillas,
  nunca escrito en línea en el código.

---

## 1. Decisiones cerradas

Las de `valle.md` siguen todas en pie. Estas son las que se cierran aquí.

| Decisión | Elegido | Motivo |
|---|---|---|
| Título | **The Valley** | El contenido va en inglés; el título acompaña |
| Idioma del contenido | Inglés (crónica, UI, nombres, topónimos) | Decisión de producto |
| Idioma del código | Inglés (identificadores, ficheros, comentarios) | Convención estándar; evita mezclas |
| Idioma de la documentación | Español | Es donde se piensa el juego |
| Ambientación | Medieval inglés | Nombres anglosajones, señor de Wealdmere |
| Derrota | **Solo población cero** | Nunca se pierde por no abrir la app |
| Presentación de datos | **Diegética primero** | El valle es el HUD; cifras solo al tocar |
| Unidad de simulación | **La semana** | 48 semanas/año; barato de simular siglos |
| Persistencia | IndexedDB, snapshot + registro de decisiones | Determinismo verificable |
| Escala del mapa | **36 × 56**, transpuesto | 56 × 36 no cabe en vertical; mismas 2 016 celdas (§7) |
| Catálogo inicial | 16 plantillas de encrucijada | Suficiente para validar el hito 0 |
| Fuente de letalidad | Las encrucijadas, no el mundo | Principio 2: el jugador es el cuello de botella |

**La última merece explicación.** La simulación base, jugada sin decisiones, es
poco mortal: 3 % de extinción en 200 años. Es deliberado. Si el mundo matara
solo, el jugador sería un espectador y el principio 2 se rompería. Lo que puede
destruir la aldea son las consecuencias de lo que el jugador elige: matanzas,
graneros perdidos antes del invierno, la reputación que corta la llegada de
forasteros. La sección 12.9 fija los objetivos de mortalidad que la suite de
balance verifica.

---

## 2. Convenciones del proyecto

### 2.1 Repositorio

```
the-valley/
├── src/
│   ├── engine/                 # simulación pura. No conoce el DOM.
│   │   ├── rng.ts
│   │   ├── time.ts
│   │   ├── balance.ts          # TODOS los números
│   │   ├── state.ts            # tipos del estado
│   │   ├── sim.ts              # orquestación del tick
│   │   ├── save.ts
│   │   ├── world/              # mapa, edificios, caminos, bosque
│   │   ├── people/             # aldeanos, rasgos, opiniones, demografía
│   │   ├── subsistence/        # trabajo, cosecha, consumo, ánimo, fe
│   │   ├── crossroads/         # esquema, condiciones, catálogo, resolución
│   │   └── chronicle/          # eventos y plantillas de texto
│   ├── render/                 # Canvas 2D. No modifica el estado.
│   ├── ui/                     # DOM, pantallas, controles
│   └── cli/                    # runner de consola (hito 0)
├── tests/
│   ├── fast/                   # segundos
│   └── balance/                # minutos, se lanza aparte
├── tools/                      # capturas Playwright, hojas de contacto
└── public/
```

### 2.2 Nomenclatura

- Ficheros y carpetas: `kebab-case.ts`.
- Tipos e interfaces: `PascalCase`. Funciones y variables: `camelCase`.
- Constantes de balance: `SCREAMING_SNAKE_CASE`, agrupadas en objetos `as const`.
- Identificadores de contenido (plantillas, rasgos, edificios): `snake_case`
  en minúsculas, estables para siempre — se guardan en las partidas.

### 2.3 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Prohibido `any`. `unknown` + validación en las fronteras (carga de partida).
- El estado del motor es **plano y serializable**: sin clases, sin `Map`, sin
  `Set`, sin referencias circulares. Objetos y arrays, y referencias por `id`.
  Esto no es preferencia estética: es lo que hace que guardar sea `structuredClone`
  y que comparar dos partidas sea un `diff`.

### 2.4 Prohibiciones en `src/engine/`

Un test de arquitectura las verifica leyendo los ficheros:

- `Math.random` — solo `Rng`.
- `Date`, `performance.now` — el tiempo entra como parámetro.
- `document`, `window`, `console` (salvo en `src/cli/`).
- `import` desde `src/render/` o `src/ui/`.

### 2.5 Git

Una rama por módulo: `mod/M-07-crossroad-engine`. El PR cita el identificador
del brief y lista qué criterios de terminado cumple.

---

## 3. Modelo de dominio

Este es el contrato común. Vive en `src/engine/state.ts`.

### 3.1 Estado raíz

```ts
export interface GameState {
  readonly version: number;        // versión del esquema de guardado
  readonly seed: number;           // semilla maestra
  tick: number;                    // semanas desde la fundación
  rng: RngBundle;                  // estados de los flujos aleatorios
  map: ValleyMap;
  village: VillageStats;
  people: PeopleState;
  buildings: Building[];
  works: ConstructionWork[];       // obras en curso
  crossroad: PendingCrossroad | null;
  seeds: PlantedSeed[];            // consecuencias diferidas
  flags: Record<string, number>;   // banderas de estado, valor = tick de expiración (0 = permanente)
  chronicle: ChronicleEntry[];
  history: DecisionRecord[];       // registro de decisiones del jugador
  weather: YearWeather;
  outbreak: Outbreak | null;
  ended: EndState | null;
}
```

### 3.2 Tiempo

```ts
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Clock {
  tick: number;      // semana absoluta
  week: number;      // 0..47 dentro del año
  year: number;      // 0..N
  season: Season;
  seasonWeek: number; // 0..11
}
```

`weekOf(tick)`, `yearOf(tick)`, `seasonOf(tick)` son funciones puras en
`time.ts`. Nadie recalcula esto a mano.

### 3.3 Estadísticas de aldea

Exactamente cinco. Añadir una sexta requiere modificar este documento.

```ts
export interface VillageStats {
  grain: number;    // unidades. 1 unidad = 1 persona · 1 semana
  wood: number;     // unidades
  morale: number;   // 0..100
  faith: number;    // 0..100
  // 'people' NO se guarda: es people.villagers.filter(alive).length
}
```

### 3.4 Personas

```ts
export type VillagerId = number;

export type Role =
  | 'leader' | 'smith' | 'midwife' | 'priest'
  | 'woodward' | 'reeve' | 'herbalist' | 'stranger';

export type Trait =
  | 'ambitious' | 'devout' | 'spiteful' | 'craven' | 'generous'
  | 'stubborn' | 'cunning' | 'kind' | 'hot_tempered' | 'frail'
  | 'hardy' | 'greedy' | 'loyal' | 'proud' | 'secretive';

export interface Villager {
  id: VillagerId;
  name: string;             // 'Aelric' — solo los nombrados lo tienen no vacío
  named: boolean;
  role: Role | null;
  female: boolean;
  bornTick: number;
  diedTick: number | null;
  causeOfDeath: DeathCause | null;
  traits: Trait[];          // 3..4, solo en los nombrados
  homeId: BuildingId | null;
  parentIds: [VillagerId | null, VillagerId | null];
  memories: Memory[];       // solo en los nombrados, máx. 12
  opinions: Record<VillagerId, number>; // -100..100, solo entre nombrados
}

export interface Memory {
  tick: number;
  kind: MemoryKind;         // 'lost_child' | 'was_blamed' | 'was_saved' | ...
  aboutId: VillagerId | null;
  weight: number;           // 1..5, decae con los años
}

export interface Grudge {
  fromId: VillagerId;
  toId: VillagerId;
  cause: MemoryKind;
  causeTick: number;
  formedTick: number;
  healedTick: number | null;
}

export interface PeopleState {
  villagers: Villager[];    // incluye a los muertos; nunca se borra a nadie
  nextId: VillagerId;
  namedIds: VillagerId[];   // vivos y nombrados, máx. 8
  grudges: Grudge[];        // append-only, igual que villagers
}
```

**Por qué no se borra a los muertos.** La crónica los cita cuarenta años
después, y las ruinas de una casa recuerdan quién la levantó. Un array de 400
aldeanos muertos ocupa nada.

**Por qué el rencor se almacena y no se deriva.** Un rencor podría leerse de
`opinions` mirando quién está por debajo de −50, pero eso pierde las dos cosas
que lo hacen contable: la causa y el tick en que se formó, que son justo lo que
citan las plantillas de disputa (§8.2 `{k:'grudge'}`, §8.3 `grudgeAgainst`).
`grudges` es **append-only**, con la misma disciplina que `villagers`: un rencor
nunca se borra. Cuando la opinión sube por encima de −20 se le pone
`healedTick`, y ahí queda — la aldea recuerda que un día se odiaron.

### 3.5 El valle

```ts
export type Terrain = 'meadow' | 'forest' | 'water' | 'rock' | 'marsh' | 'cleared';

export interface ValleyMap {
  width: 36;
  height: 56;
  terrain: Uint8Array;      // 36*56, índice = y*36 + x
  traffic: Uint16Array;     // desgaste acumulado por celda
  path: Uint8Array;         // 0 nada, 1 trillado, 2 sendero, 3 calzada
  ruins: Uint8Array;        // 0 nada, 1 ruina; permanente
  forestAge: Uint8Array;    // años desde la tala, para el rebrote
}

export type BuildingId = number;

export type BuildingKind =
  | 'house' | 'field' | 'granary' | 'chapel' | 'smithy'
  | 'well' | 'mill' | 'palisade' | 'wall' | 'church'
  | 'stone_house' | 'watchtower' | 'grave_yard';

export interface Building {
  id: BuildingId;
  kind: BuildingKind;
  x: number; y: number;     // esquina superior izquierda
  w: number; h: number;
  builtTick: number;
  lostTick: number | null;  // si !== null, es una ruina
  tier: 0 | 1;              // 0 madera, 1 piedra
  lit: boolean;             // el taller del herrero se apaga si se enfada
}
```

### 3.6 Encrucijadas y semillas

```ts
export interface PendingCrossroad {
  templateId: string;
  posedTick: number;
  cast: Record<string, VillagerId>;   // 'A' -> 17
  optionIds: string[];
}

export interface PlantedSeed {
  id: string;
  fromTemplateId: string;
  fromOptionId: string;
  plantedTick: number;
  firesAtTick: number;
  cast: Record<string, VillagerId>;
  condition: Condition | null;        // si falla al vencer, la semilla se marchita
}

export interface DecisionRecord {
  tick: number;
  templateId: string;
  optionId: string;
  cast: Record<string, VillagerId>;
}
```

### 3.7 Crónica

```ts
export type ChronicleKind =
  | 'founding' | 'season' | 'birth' | 'death' | 'harvest' | 'famine'
  | 'plague' | 'fire' | 'built' | 'lost' | 'arrival' | 'departure'
  | 'grudge' | 'succession' | 'crossroad_posed' | 'crossroad_taken'
  | 'consequence' | 'extinction';

export interface ChronicleEntry {
  tick: number;
  kind: ChronicleKind;
  templateKey: string;               // clave del banco de textos
  params: Record<string, string | number>;
  weight: 1 | 2 | 3;                 // 3 = titular de generación
}
```

La crónica guarda **claves y parámetros, no prosa**. El texto se compone al
mostrarlo. Así se puede reescribir el banco de textos sin invalidar partidas
guardadas, y traducirlo sin tocar el motor.

---

## 4. El reloj y el tick

### 4.1 Unidades

| Unidad | Equivale a | Tiempo real a ×1 |
|---|---|---|
| Tick | 1 semana | 15 s |
| Estación | 12 ticks | 3 min |
| Año | 48 ticks | 12 min |
| Generación | 20 años = 960 ticks | 4 h |
| Ventana de letargo | — | 4 h |

Velocidades disponibles: **pausa, ×1, ×4, ×16**. A ×16 un año son 45 segundos,
que es lo que hace tolerable revisar una partida larga.

El render tiene su propio reloj cosmético: **cada tick se representa como un día
completo** — amanecer, marcha al campo, regreso, noche. Un tick a ×1 dura 15 s y
ese es el ciclo de la multitud ambiental. No hay ninguna relación entre ese
reloj y la simulación más allá de la duración; el motor no sabe que existe.

### 4.2 Orden de resolución del tick

**Este orden es normativo.** Cambiarlo cambia el balance y rompe el determinismo
de las partidas guardadas.

```
tick(state, decision?) :
   1.  ADVANCE      tick += 1; recalcular reloj
   2.  ANNUAL       si week == 0:  tirar clima del año, comprobar peste,
                    comprobar incendio, migración de primavera, envejecer a todos
   3.  DECISION     si hay decision del jugador, aplicar la opción elegida
                    (efectos inmediatos + plantar semillas)
   4.  SEEDS        disparar las semillas cuyo firesAtTick <= tick
   5.  LABOUR       repartir la mano de obra; producir madera y puntos de obra
   6.  WORKS        avanzar obras; completar las que llegan a su coste
   7.  CONSUME      restar grano; calcular severidad de hambre; muertes por hambre
   8.  WINTER       si es invierno, restar leña; marcar frío si falta
   9.  HARVEST      si week == 35, resolver la cosecha
  10.  STORAGE      aplicar merma sobre el excedente
  11.  MOOD         actualizar ánimo y fe
  12.  DEATHS       mortalidad por edad, con multiplicadores
  13.  BIRTHS       nacimientos
  14.  WORLD        tráfico y caminos; rebrote del bosque; iluminación
  15.  CROSSROAD    si no hay una pendiente, evaluar el catálogo
  16.  CHRONICLE    volcar los eventos acumulados del tick
  17.  END          si no queda nadie vivo, marcar fin de partida
```

Notas obligatorias:

- El paso 7 va **antes** que el 9 a propósito: la semana de la cosecha se come
  primero y se cosecha después. Es lo que hace que un otoño malo se note ya en
  el granero antes del invierno.
- Los pasos 12 y 13 se ejecutan sobre listas fotografiadas al empezar el paso.
  Un recién nacido no puede morir en el mismo tick en el que nace.
- El paso 16 no calcula nada. Los pasos anteriores empujan eventos a un búfer y
  este los vuelca. Ningún sistema escribe texto.

### 4.3 Determinismo y flujos aleatorios

Un único `Math.random` compartido rompería el determinismo en cuanto un sistema
consumiera un número de más. Se usan **flujos independientes**, cada uno con su
propio estado, derivados de la semilla maestra:

```ts
export type RngStream =
  | 'map' | 'weather' | 'births' | 'deaths' | 'plague'
  | 'crossroads' | 'cast' | 'names' | 'chronicle' | 'world';

export type RngBundle = Record<RngStream, number>;  // estado de 32 bits por flujo
```

Algoritmo: **mulberry32**, sembrado con `hash32(masterSeed, streamName)`.
Rápido, sin dependencias, reproducible entre navegadores y Node.

Regla: **un sistema solo consume de su flujo.** Añadir una tirada en el render
o en un log jamás puede desplazar la simulación.

**Test de determinismo (obligatorio, suite rápida):** dos partidas con la misma
semilla y la misma lista de decisiones producen estados idénticos byte a byte
tras 5 000 ticks.

---

## 5. Sistema A — Estaciones y subsistencia

Es el reloj lento y la fuente de presión. Todo lo demás cuelga de aquí.

### 5.1 El año

| Estación | Semanas | Qué pasa |
|---|---|---|
| Spring | 0–11 | Migración; siembra; el bosque rebrota |
| Summer | 12–23 | Riesgo de peste; máxima construcción |
| Autumn | 24–35 | **Cosecha en la semana 35** |
| Winter | 36–47 | Consumo de leña; mortalidad agravada si falta |

### 5.2 Mano de obra

La fuerza de trabajo de la semana:

```
W = (adultos 15–59) · 1.0  +  (12–14 y 60–69) · 0.5
```

Reparto, en este orden:

```
neededFields  = ceil(people · 48 · 1.3 / FIELD_YIELD)
workedFields  = min(fields, neededFields)
farmDemand    = workedFields · FIELD_CREW
farmers       = min(W, farmDemand)
spare         = W − farmers

// reserva de obras: la aldea nunca deja de construir
if spare < W · WORKS_RESERVE:
    borrowed = min(farmers, W · WORKS_RESERVE − spare)
    farmers −= borrowed;  spare += borrowed

cutters  = spare · CUTTER_SHARE
builders = spare − cutters

labourFactor = farmers / (workedFields · FIELD_CREW)     // 0..1
wood        += cutters · WOOD_PER_CUTTER
buildPoints  = builders · BP_PER_BUILDER · (smithy ? 1.20 : 1.00)
```

Tres decisiones dentro de esa fórmula merecen defensa:

**`workedFields` en vez de `fields`.** Una aldea no trabaja más tierra de la que
necesita. Sin este tope, un valle con ocho campos y poca gente diluye su mano de
obra y cosecha peor que con cuatro. Contraintuitivo y frustrante.

**La reserva de obras (15 %).** Sin ella, una aldea justa de gente destina todo
al campo, nunca construye y se queda congelada — y el jugador no ve cambiar
nada, que es el pecado capital de este juego. Con ella, siempre hay obra en
marcha, al precio de una cosecha algo peor.

**El herrero acelera la obra un 20 %.** Es lo que hace que su enfado, que apaga
la fragua, se note en el valle sin necesidad de explicarlo.

### 5.3 Grano

```
demand   = people · GRAIN_PER_PERSON            // 1 por persona y semana
severity = max(0, demand − grain) / demand      // 0..1
grain    = max(0, grain − demand)
```

Si `severity > 0`:

```
starving = people · STARVATION_RATE · severity   // parte fraccionaria por sorteo
```
Mueren los más débiles primero: mayores de 60, luego menores de 5, luego el
resto por sorteo. Además `morale −= 4 · severity` y la mortalidad general se
multiplica por `1 + 2 · severity` en el paso 12.

**Cosecha** (semana 35):

```
yield = workedFields · FIELD_YIELD
      · weatherFactor            // 0.60 .. 1.45, tirado al empezar el año
      · (0.8 + 0.4 · morale/100) // 0.80 .. 1.20
      · labourFactor
      · (mill ? 1.15 : 1.00)
morale += (weatherFactor − 1) · 25
```

**Almacenamiento:**

```
capacity = BASE_STORAGE + granaries · GRANARY_CAPACITY
if grain > capacity: grain −= (grain − capacity) · SPOILAGE
```

La merma es el freno que impide que una aldea próspera acumule grano infinito y
deje de tener problemas. El granero es la manera de comprarse tranquilidad, y
cuesta madera y obra.

### 5.4 Madera

Producción: `cutters · WOOD_PER_CUTTER`, limitada por el bosque disponible (§7.5).
Consumo: construcción, y calefacción en invierno a `WINTER_WOOD` por persona y
semana. Si la leña se agota en invierno, se marca `cold` y la mortalidad se
multiplica por 1.4 esa semana.

### 5.5 Ánimo (0–100)

```
morale += (50 − morale) · 0.02                    // deriva al centro
morale −= 4 · severity                            // hambre
morale −= deathsThisTick · 1.5
morale −= max(0, people − housing) · 0.4          // hacinamiento
morale += chapel ? 0.15 : 0
morale += church ? 0.30 : 0
morale += mill   ? 0.05 : 0
morale −= outbreak ? 0.8 : 0
morale += (weatherFactor − 1) · 25                // solo en la semana 35
```

### 5.6 Fe (0–100)

```
faith += (40 − faith) · 0.01
faith += chapel ? 0.20 : 0
faith += church ? 0.35 : 0
faith += priestAlive && priest.traits.includes('devout') ? 0.10 : 0
faith −= priestAlive ? 0 : 0.15
faith −= outbreak ? 0.60 : 0
faith −= unexplainedDeathsThisTick · 0.30
```

La fe no da recursos. Hace dos cosas: abre y cierra plantillas de encrucijada, y
pone un suelo al ánimo (`morale` no baja de `faith · 0.25`). Una aldea muy
devota aguanta desgracias que hundirían a una descreída — y por eso el cura es
peligroso.

### 5.7 Migración

Se comprueba una vez al año, en la semana 0.

**Llegada.** Requiere `people ≥ 8`, `morale ≥ 50`, reservas de grano `≥ 0.5`
años, `hostile` sin activar y al menos 2 huecos de vivienda. Probabilidad 0.30;
llegan 2–4 personas, mezcla de adultos jóvenes y niños.

**Marcha.** Si `morale < 30`, con probabilidad `(30 − morale)/60` se van 1–3
personas.

Los forasteros son el motor principal del crecimiento temprano: la biología sola
hace crecer la aldea demasiado despacio para que la primera generación sea
interesante de ver. Y son un buen castigo: una aldea con mala reputación —
bandera `hostile`, que ponen ciertas encrucijadas — deja de crecer sin que muera
nadie.

### 5.8 Peste

Comprobación anual: `p = PLAGUE_BASE + people/2500`, multiplicada por 0.6 si hay
pozo. Duración 6–10 semanas. Durante el brote, cada persona tiene un riesgo
semanal adicional de `PLAGUE_HAZARD_ADULT`, o `PLAGUE_HAZARD_WEAK` si tiene 4
años o menos, o 60 o más.

Un brote típico se lleva entre un cuarto y la mitad de la aldea. Debe sentirse
como una catástrofe, no como un impuesto.

### 5.9 Incendio

Comprobación anual, `p = FIRE_CHANCE`. Destruye un edificio de madera al azar
(`tier === 0`), con preferencia por las casas. Si toca un granero, se pierde
además el 45 % del grano almacenado. `morale −= 6`. El edificio pasa a ruina y
**se ve** — es el suceso más barato del juego en código y de los más visibles.

Los edificios de piedra (`tier === 1`) no arden. Es la recompensa mecánica de la
progresión tardía descrita en `valle.md` §7.

---

## 6. Sistema B — Las personas

### 6.1 Dos poblaciones

**Los anónimos.** Existen como registros con edad, sexo y casa. No tienen
rasgos, ni memoria, ni opiniones. Nacen, envejecen, trabajan de forma agregada y
mueren. Son el 90 % de la aldea y cuestan cuatro campos por cabeza.

**Los nombrados.** Seis al fundarse, hasta ocho. Tienen nombre, rasgos, memoria
y opiniones. Son los únicos que la crónica cita y los únicos que aparecen en las
encrucijadas.

### 6.2 Roles

| Rol | Al fundarse | Cómo aparece después |
|---|---|---|
| `leader` | Sí | Sucesión al morir (§6.6) |
| `smith` | Sí | Un adulto lo hereda si hay fragua |
| `midwife` | Sí | Una adulta lo hereda |
| `priest` | Sí | Solo si hay capilla; si no, el puesto queda vacante |
| `woodward` | Sí | Un adulto lo hereda |
| `reeve` | Sí | Un adulto lo hereda |
| `herbalist` | No | Surge si hay peste y `faith < 60` |
| `stranger` | No | Llega por encrucijada; puede quedarse |

Cuando un rol queda vacante y hay candidato (adulto vivo, sin rol), se cubre en
el paso ANNUAL del año siguiente. El candidato se elige por edad y por opinión
media del resto. Ascender a un anónimo le genera nombre, rasgos y opiniones
neutras: **nace un personaje**, y la crónica lo anuncia.

### 6.3 Rasgos

Cada nombrado tiene 3 o 4 rasgos, sorteados con pesos por rol (un `priest`
tiene alta probabilidad de `devout`, un `leader` de `ambitious` o `proud`). Los
rasgos hacen exactamente tres cosas, ni una más:

1. **Ponderan opciones de encrucijada.** Un `craven` hace que aparezca la opción
   de huir; un `spiteful` hace que la plantilla de venganza tenga más peso.
2. **Modulan la deriva de opiniones.** Un `loyal` perdona; un `spiteful` no.
3. **Modifican un número concreto y documentado.** Sólo estos:

| Rasgo | Efecto mecánico |
|---|---|
| `hardy` | Su mortalidad base ×0.7 |
| `frail` | Su mortalidad base ×1.6 |
| `devout` (cura) | `faith` +0.10/semana |
| `ambitious` (líder) | Obra +5 %; opinión de los demás −0.02/semana |
| `generous` | En hambruna, `morale` −3·severity en vez de −4 |
| `greedy` (reeve) | Merma −2 puntos porcentuales; `morale` −0.03/semana |

Los nueve rasgos restantes son puramente narrativos y de ponderación. **Esto es
intencionado.** Que cada rasgo tenga un número asociado convierte a los
personajes en un árbol de habilidades, que es justo lo que `valle.md` §9
descarta.

### 6.4 Memoria y opiniones

Los nombrados guardan hasta 12 memorias. Cada una tiene peso 1–5 y decae
`−0.02` por año. Al llenarse, se descarta la de menor peso efectivo.

Las opiniones van de −100 a +100 y solo existen entre nombrados. Se mueven por
sucesos:

| Suceso | Cambio |
|---|---|
| Muere un hijo suyo por hambre y el líder eligió esa opción | −35 hacia el líder |
| Fue acusado en público por otro | −30 hacia el acusador |
| Otro le salvó (opción que le favorece) | +25 |
| Convivencia sin incidentes | +0.05/semana, hacia 0 desde los extremos |
| Rasgo `spiteful` | La recuperación hacia 0 se reduce a la mitad |
| Rasgo `loyal` | La recuperación hacia 0 se duplica |

**Rencor (`grudge`).** Cuando una opinión cruza −50 se crea un rencor con causa
registrada. Los rencores son lo que alimenta las plantillas de disputa, y son la
razón por la que dos partidas con los mismos sucesos cuentan historias distintas.

### 6.5 Demografía

**Nacimientos.** Cada mujer viva de 16 a 40 años, por semana:

```
p = BIRTH_BASE · foodFactor · moraleFactor · housingFactor
foodFactor    = clamp(grain / (people · 24), 0, 1.2)
moraleFactor  = 0.6 + 0.8 · morale/100
housingFactor = freeBeds ≥ 3 ? 1.3 : (freeBeds ≥ 1 ? 1.0 : 0.15)
```

El padre se asigna entre los adultos vivos, con preferencia por el que comparte
casa. Si la madre es nombrada, el hijo puede llegar a serlo.

**Muertes.** Probabilidad semanal `= annualRate(age)/48`, multiplicada por:

- `1 + 2 · severity` (hambre)
- `1.4` si `cold` (invierno sin leña)
- riesgo de peste, combinado como `1 − (1−p)(1−hazard)`
- el modificador de rasgo (`hardy`, `frail`)

Tabla de mortalidad anual base en §12.4.

**Envejecimiento.** Todos cumplen años a la vez, en la semana 0. Una simplificación
que ahorra un campo por aldeano y no se nota.

### 6.6 Sucesión

Al morir el `leader` se dispara **siempre** la encrucijada `succession`
(§Anexo A.6), saltándose el intervalo mínimo. Es la única plantilla con esa
excepción, y es lo que convierte la muerte del líder en el latido del bucle
largo: cada generación, el jugador elige quién manda, y arrastra los rencores de
quien no fue elegido.

---

## 7. Sistema C — El valle

**36 × 56 celdas = 2 016 celdas.** El valle corre norte-sur y el río baja por él.
Cabe entero en un móvil vertical, sin desplazamiento de cámara.

> **Cambio respecto a `valle.md` §7.** El documento original decía 56 × 36. Con
> 390 px de ancho eso da celdas de 6,9 px, una franja apaisada en mitad de una
> pantalla de 844 px y aldeanos de 10 px: ilegible. Transpuesto son las mismas
> 2 016 celdas —mismo presupuesto de simulación y de figuras— con celda de
> 10–11 px. Todo el arte del capítulo 10 está diseñado para esa cifra.

### 7.1 Generación del mapa

Determinista a partir del flujo `map`. Cinco pasos, en orden:

1. **Base.** Todo `meadow`.
2. **Río.** Entra por el borde norte en `x ∈ [10, 26]` y baja hasta el borde sur
   mediante un paseo aleatorio con sesgo (65 % avanzar, 35 % desviarse), de 2
   celdas de ancho, ensanchando a 3 en el último tercio. Nunca se bifurca. El
   recorrido largo es el eje visual del valle.
3. **Bosque.** Ruido de valor de dos octavas (celdas de 8 y de 4), umbral tal que
   cubra el 20–26 % del mapa. Se sesga hacia las laderas este y oeste y hacia el
   extremo norte: la aldea nace en claro, en el tercio central, y el bosque es lo
   que la encierra.
4. **Roca.** 3–6 afloramientos de 6–14 celdas, preferentemente lejos del río.
5. **Marisma.** Franja de 1–2 celdas junto al río en los tramos de menor
   pendiente. Terreno inservible, valor puramente visual.

**Sitio de fundación.** Se puntúa cada celda candidata por: distancia al río
(óptimo 3–6 celdas), pradera contigua libre en 12×12, distancia al centro del
mapa, y no adyacente a marisma. Gana la de mayor puntuación; empate por índice
menor.

**Test obligatorio:** para 200 semillas, el mapa generado tiene río continuo de
borde a borde, entre el 18 % y el 30 % de bosque, y un sitio de fundación válido.

### 7.2 Edificios

| Edificio | Celdas | Madera | Obra | Efecto | Tope |
|---|---|---|---|---|---|
| `house` | 2×2 | 60 | 40 | +5 de aforo | 16 |
| `field` | 3×2 | 0 | 60 | +600 de cosecha base | 8 |
| `granary` | 2×2 | 120 | 80 | +650 de capacidad | 3 |
| `well` | 1×1 | 40 | 30 | Peste ×0.6 | 1 |
| `chapel` | 2×2 | 150 | 120 | Fe y ánimo; habilita `priest` | 1 |
| `smithy` | 2×2 | 140 | 100 | Obra +20 %; habilita piedra | 1 |
| `mill` | 2×2 | 180 | 140 | Cosecha +15 % | 1 |
| `palisade` | 1×1 | 30 | 20 | Segmento de empalizada | — |
| `grave_yard` | 3×2 | 0 | 25 | Ánimo +0.05; lo abre una encrucijada | 1 |
| `wall` | 1×1 | 0 + 40 piedra | 60 | Mejora de `palisade` | — |
| `stone_house` | 2×2 | 0 + 50 piedra | 70 | Mejora de `house`; no arde | — |
| `church` | 3×3 | 0 + 120 piedra | 200 | Mejora de `chapel` | 1 |
| `watchtower` | 2×2 | 0 + 60 piedra | 90 | Solo por encrucijada | 2 |

La piedra no es un sexto recurso: aparece cuando hay `smithy`, y se produce
consumiendo puntos de obra contra los afloramientos de roca del mapa. Se
contabiliza dentro de `wood` con un factor de conversión, y la interfaz nunca la
nombra por separado.

### 7.3 Prioridad de construcción

La aldea decide sola, siempre en este orden:

1. `field`, si `fields < min(MAX_FIELDS, neededFields)`
2. `house`, si `people > aforo − 2` y `houses < MAX_HOUSES`
3. `granary`, si `granaries < 3` y hay grano por encima del 80 % de la capacidad
4. `well`, si no existe y `people ≥ 25`
5. `chapel`, si no existe, `people ≥ 30` y `faith ≥ 45`
6. `smithy`, si no existe y `people ≥ 35`
7. `mill`, si no existe y `people ≥ 45`
8. `palisade`, si existe `smithy` y la bandera `threatened` está puesta
9. **Mejoras a piedra**, cuando no queda sitio: casas primero, luego empalizada,
   luego capilla

El punto 9 es lo que resuelve el problema de ritmo a largo plazo de `valle.md`
§7. Cuando el mapa se llena, el mismo motor de obras sigue funcionando pero
produce transformación en vez de superficie.

### 7.4 Colocación

Determinista y sin intervención del jugador. Para cada tipo se puntúa cada
posición válida y se elige la mejor; empate por índice menor.

| Tipo | Puntuación |
|---|---|
| `house` | Cerca del centro de masas de las casas; adyacente a camino; no sobre pradera cultivable de primera |
| `field` | Adyacente a otro campo o al río; llano; lejos del bosque |
| `granary` | Junto a los campos y a menos de 6 celdas de una casa |
| `chapel` | Celda alta y visible, algo apartada |
| `smithy` | En el borde del núcleo — el fuego lejos de las casas |
| `well` | Lo más cerca posible del centroide de las casas |
| `palisade` | Envolvente convexa del núcleo, dilatada 2 celdas |

Ninguna colocación puede pisar `water`, `marsh` ni `ruins` de piedra. Las ruinas
de madera **sí** se pueden edificar encima; la ruina desaparece del mapa pero
queda en la crónica.

### 7.5 El bosque

Cada celda de bosque contiene `WOOD_PER_FOREST_TILE` unidades. Los leñadores
consumen de la celda de bosque más cercana al núcleo; al agotarla pasa a
`cleared` y `forestAge` se pone a 0.

Una celda `cleared` con 3 o más vecinas `forest` y sin edificio vuelve a
`forest` a los `FOREST_REGROWTH_YEARS`. El bosque retrocede desde la aldea hacia
fuera, deja un borde irregular y rebrota por detrás si se deja de talar. Con los
números de §12, un valle pierde la mitad de su bosque en unos cien años: visible
sin ser brusco.

### 7.6 Caminos emergentes

Cada tick, para cada aldeano vivo con casa y destino de trabajo, se suma 1 al
`traffic` de las celdas de su trayecto. El trayecto se calcula una vez, con A\*
sobre un coste que penaliza bosque y roca y premia `path`, y se cachea hasta que
cambie el mapa.

```
traffic ≥ PATH_T1  → path = 1 (trillado)
traffic ≥ PATH_T2  → path = 2 (sendero)
traffic ≥ PATH_T3 y hay smithy → path = 3 (calzada)
```

Todo `traffic` decae un 0.5 % por tick. Un camino que deja de usarse se borra
solo, que es exactamente lo que pasa cuando se abandona un campo.

Los caminos no son decoración: reducen el coste de A\*, así que se
autorrefuerzan, y esa realimentación es la que produce la forma orgánica de la
aldea sin que nadie la diseñe.

---

## 8. Sistema D — Encrucijadas

El verbo del jugador y el motor de la variedad. No se escriben una a una: se
generan cruzando los otros tres sistemas.

### 8.1 Esquema de plantilla

```ts
export interface CrossroadTemplate {
  id: string;                  // 'winter_grain_debt'
  category: CrossroadCategory;
  weight: number;              // peso base de selección
  cooldownYears: number;       // no puede repetirse antes
  maxPerGame?: number;
  minYear?: number;
  requires: Condition[];       // TODAS deben cumplirse
  cast: CastSpec[];
  title: string;               // clave del banco de textos
  body: string;                // clave del banco de textos
  options: CrossroadOption[];  // 2 o 3
}

export type CrossroadCategory =
  | 'famine' | 'plague' | 'lord' | 'feud'
  | 'faith' | 'forest' | 'stranger' | 'succession';

export interface CrossroadOption {
  id: string;
  label: string;               // clave: el verbo, 1–3 palabras
  cost: string;                // clave: el precio, visible antes de elegir
  effects: Effect[];
  visible: VisualEffect[];     // OBLIGATORIO, longitud ≥ 1
  seeds: SeedSpec[];
  requires?: Condition[];      // la opción puede no estar disponible
  traitWeight?: Partial<Record<Trait, number>>; // el reparto pondera, no decide
}
```

**`visible` es obligatorio y con al menos un elemento.** Un test recorre el
catálogo y falla si alguna opción no cambia nada en pantalla. Es el principio 1
de `valle.md` convertido en un test que se ejecuta en cada commit.

### 8.2 DSL de condiciones

Datos, no funciones. Deben ser serializables para poder inspeccionar por qué se
disparó una encrucijada.

```ts
export type Condition =
  | { k: 'stat';    stat: 'grain'|'wood'|'morale'|'faith'|'people'; op: Op; v: number }
  | { k: 'ratio';   ratio: 'grainYears'|'housingFree'|'forestLeft'; op: Op; v: number }
  | { k: 'season';  season: Season }
  | { k: 'year';    op: Op; v: number }
  | { k: 'has';     building: BuildingKind }
  | { k: 'flag';    flag: string; set: boolean }
  | { k: 'outbreak'; active: boolean }
  | { k: 'role';    role: Role; alive: boolean }
  | { k: 'grudge';  min: number }            // existe un rencor de al menos N
  | { k: 'trait';   role: Role; trait: Trait }
  | { k: 'not';     c: Condition }
  | { k: 'any';     cs: Condition[] };

export type Op = '<' | '<=' | '>' | '>=' | '==' ;
```

### 8.3 Reparto (`cast`)

Vincula letras a aldeanos concretos. Si un papel no se puede cubrir, la
plantilla no es elegible.

```ts
export type CastSpec =
  | { as: string; role: Role }
  | { as: string; anyNamed: true; excluding?: string[] }
  | { as: string; grudgeAgainst: string }        // el que más le odia
  | { as: string; childOf: string }
  | { as: string; youngestNamed: true; female?: boolean };
```

### 8.4 Efectos

```ts
export type Effect =
  | { k: 'stat';   stat: StatName; delta: number }
  | { k: 'stat';   stat: StatName; mul: number }
  | { k: 'kill';   who: 'random'|'weakest'|string; count: number | 'fraction'; fraction?: number }
  | { k: 'arrive'; count: number }
  | { k: 'flag';   flag: string; years: number }   // 0 = permanente
  | { k: 'build';  kind: BuildingKind; free: true }
  | { k: 'destroy'; kind: BuildingKind; count: number }
  | { k: 'opinion'; from: string; to: string; delta: number }
  | { k: 'memory'; who: string; kind: MemoryKind; about?: string; weight: number }
  | { k: 'role';   who: string; role: Role | null }
  | { k: 'lit';    kind: BuildingKind; on: boolean };

export type VisualEffect =
  | { k: 'raise';   kind: BuildingKind }
  | { k: 'ruin';    kind: BuildingKind }
  | { k: 'banner';  colour: string; years: number }  // estandarte sobre el núcleo
  | { k: 'douse';   kind: BuildingKind }             // apagar un edificio
  | { k: 'gather';  where: 'square'|'chapel'|'ford'; days: number }
  | { k: 'scar';    what: 'burnt_field'|'grave_row'|'felled_wood' };
```

### 8.5 Semillas — la consecuencia diferida

Es la mitad del diseño. Sin ella una encrucijada es un menú de modificadores;
con ella, es una decisión.

```ts
export interface SeedSpec {
  id: string;
  delayYears: [number, number];   // se sortea dentro del rango
  condition?: Condition;          // si falla al vencer, la semilla se marchita
  effects: Effect[];
  visible: VisualEffect[];
  chronicleKey: string;           // el texto que enlaza con la decisión original
}
```

Al vencer, la entrada de crónica **cita explícitamente la decisión que la
plantó**, con el año. «Thirty-one years after Osric swore to Wealdmere, the
lord's men came for his grandson.» Esa frase es el producto del juego.

Regla: toda plantilla con una opción de beneficio inmediato claro debe plantar
al menos una semilla. La suite de balance lo verifica.

### 8.6 Selección

En el paso 15 del tick, si no hay encrucijada pendiente:

```
if tick − lastCrossroadTick < MIN_TICKS_BETWEEN and not crisis: return
eligible = catalog.filter(t =>
     all(t.requires) and
     cooldown ok and
     maxPerGame ok and
     cast completable)
if eligible is empty: return
score(t) = t.weight
         · crisisMultiplier(t)          // ×4 si su categoría es la crisis activa
         · traitMultiplier(t)           // rasgos del reparto
         · noveltyMultiplier(t)         // ×0.4 si ya salió en esta partida
pick weighted by score, from the 'crossroads' stream
```

**Crisis** = hambruna proyectada (`grain` no llega a la cosecha), brote activo,
bandera `threatened`, o muerte del líder. Una crisis salta el intervalo mínimo.

**Garantía por generación:** si han pasado 960 ticks sin ninguna encrucijada, se
fuerza la de mayor puntuación aunque no sea crisis. Si no hay ninguna elegible
—cosa rara— se usa la plantilla de reserva `quiet_years`, que ofrece al jugador
qué hacer con un excedente.

**Techo:** una cada 120 ticks (30 minutos reales a ×1). Las encrucijadas tienen
que seguir siendo raras o dejan de pesar.

### 8.7 Resolución

Mientras hay una encrucijada pendiente **la simulación no se detiene**. La aldea
sigue comiendo y muriendo. Esto es importante: dudar tiene un precio, y volver
tras cuatro horas para encontrarse la decisión aún abierta y el granero vacío es
una historia, no un error.

La encrucijada no caduca nunca. No se pierde por ausencia (§1).

---

## 9. La crónica

### 9.1 Cómo se compone

Los sistemas empujan `ChronicleEntry` con `templateKey` y `params`. Al mostrar,
`renderEntry(entry, bank, rng)` elige una de las 3–5 variantes de esa clave con
el flujo `chronicle` y sustituye los parámetros.

```ts
// Banco de textos: src/engine/chronicle/bank.en.ts
export const BANK: Record<string, string[]> = {
  'death.old': [
    '{name} died in the {season} of year {year}, {age} winters old.',
    'Age took {name} that {season}. {age} winters.',
    '{name} did not see another {season}. {age} winters, and no debts.',
  ],
  'harvest.poor': [
    'The harvest came in thin. {grain} bushels for {people} mouths.',
    'A poor autumn. The granary took {grain} bushels; the village is {people}.',
  ],
  // ...
};
```

### 9.2 Pesos y filtrado

Cada entrada tiene peso 1–3. La pantalla de crónica muestra por defecto los
pesos 2 y 3; el peso 1 (nacimientos y muertes corrientes, cambio de estación)
aparece al desplegar un año.

El **parte de bienvenida** al volver de una ausencia muestra, como máximo: el
titular de peso 3 más reciente, hasta 4 entradas de peso 2, y un resumen
numérico de lo que cambió (gente, edificios levantados o perdidos).

### 9.3 Regla de escritura

Los textos son cortos, concretos y sin adjetivar. Nombran a la gente, el año y
la cifra. El drama sale del suceso, no de la prosa — si hay que adornar la
frase para que sea interesante, el suceso no lo era y el problema está en el
cruce de sistemas, no aquí (`valle.md` §8).

Prohibido en el banco de textos: signos de exclamación, segunda persona,
metáforas, y cualquier frase que valore la decisión del jugador. La crónica
narra, no juzga.

### 9.4 Criterio del hito 0

Tres crónicas de tres partidas distintas, leídas por alguien ajeno al proyecto,
que sepa contar en qué se diferencian. **Esto es lo que decide si el proyecto
sigue.**

---

## 10. Render

Canvas 2D. El render **lee** el estado y no lo modifica nunca. Es un test de
arquitectura: `src/render/` no importa nada que mute `GameState`.

### 10.1 Geometría

```
cell = floor(min(viewportW / 36, viewportH / 56))
canvas = 36·cell × 56·cell, centrado, con devicePixelRatio aplicado
```

En un móvil de 390 × 844 CSS px con la interfaz ocupando 180 px de alto:
`min(390/36, 664/56) = min(10.8, 11.9) = 10`. El valle mide 360 × 560 px y deja
284 px para interfaz y áreas seguras. **Todo el arte se diseña para 10 px de
celda** y debe seguir leyéndose a 9. Si algo no se lee
a ese tamaño, no se dibuja.

### 10.2 Capas

Orden de dibujo, sin excepciones:

| # | Capa | Cuándo se redibuja |
|---|---|---|
| 1 | Terreno base | Al cambiar de estación o mutar el mapa. **Cacheada en un canvas aparte.** |
| 2 | Agua animada | Cada fotograma (2 fotogramas de desfase, muy barato) |
| 3 | Caminos | Con la capa 1 |
| 4 | Ruinas | Con la capa 1 |
| 5 | Sombras de edificio | Con la capa 1 |
| 6 | Edificios | Con la capa 1 |
| 7 | Sombras de figura | Cada fotograma |
| 8 | Figuras | Cada fotograma |
| 9 | Meteorología (nieve, lluvia) | Cada fotograma |
| 10 | Tinte de hora | Cada fotograma |
| 11 | Marcadores de interfaz | Al tocar |

Las capas 1 y 3–6 se componen en un **canvas de fondo cacheado** que solo se
regenera cuando cambia la estación o se levanta o se pierde un edificio. El
bucle por fotograma dibuja el fondo cacheado y encima las capas 2, 7–11. Es lo
que permite 80 figuras a 60 fps en un móvil de gama media.

### 10.3 Paletas

Doce colores por estación. La estación se reconoce por el color antes que por
ningún indicador.

| Ranura | Spring | Summer | Autumn | Winter |
|---|---|---|---|---|
| `void` | `#b9c9cf` | `#c9cfc2` | `#cfc4b2` | `#c6ccd2` |
| `meadow` | `#8fae5b` | `#9fb058` | `#a89a55` | `#d9dde0` |
| `meadowAlt` | `#7fa050` | `#8fa14c` | `#98884a` | `#c9ced3` |
| `field` | `#9d9a52` | `#c9a94f` | `#d0b05a` | `#cfd4d6` |
| `forest` | `#4f7a3c` | `#46703a` | `#8a6f33` | `#3d5544` |
| `forestDark` | `#3c6030` | `#35562c` | `#6a5326` | `#2e4235` |
| `water` | `#6fa3bd` | `#6fa8b8` | `#6d97a8` | `#aebfc6` |
| `rock` | `#9a968f` | `#a39e94` | `#a09a90` | `#8e939a` |
| `path` | `#b09a72` | `#bda57b` | `#b79d74` | `#b4b0a6` |
| `wood` | `#8a6a45` | `#8a6a45` | `#83643f` | `#6f563a` |
| `roof` | `#6d5236` | `#6d5236` | `#654c32` | `#55402a` |
| `accent` | `#d9d2c2` | `#efe6cf` | `#e8d9b8` | `#f2f4f6` |

Derivados, calculados y no escritos a mano:

```
outline(c)  = mezcla de c con negro al 45 %
shadow      = rgba(0, 0, 0, 0.22)
```

La transición entre estaciones interpola las doce ranuras a lo largo de las dos
primeras semanas de la estación nueva. Un corte seco de color se lee como un
fallo.

**Test obligatorio:** cada paleta pasa la comprobación de silueta — convertida a
escala de grises, `forest`, `meadow`, `field`, `water` y `path` mantienen entre
sí al menos 8 puntos de luminancia de diferencia. Es la regla «silueta antes que
color» de `valle.md` §6, verificable.

### 10.4 Reglas de estilo, implementadas

- **Sombra.** Todo lo que está de pie proyecta sombra: desplazamiento
  `(+0.30, +0.18)` celdas, color `shadow`. Edificios: el mismo polígono
  desplazado. Figuras: elipse de `0.7 × 0.25` celdas.
- **Contorno.** `lineWidth = max(1, cell · 0.12)`, color `outline(relleno)`.
  Edificios y figuras siempre; terreno nunca.
- **Manchas grandes.** El terreno se compone de regiones, no de celdas: se
  agrupan celdas contiguas del mismo tipo y se dibuja el contorno del grupo con
  una perturbación determinista de ±0.15 celdas en los vértices. Prohibido el
  ruido por celda.
- **Nada de texturas.** Un campo son cinco surcos rectos, no una trama.

### 10.5 Sprites, dibujados por código

Cada uno es una función pura `(ctx, x, y, cell, palette, tier) => void`.

| Sprite | Composición |
|---|---|
| `house` | Cuerpo trapezoidal `1.6×1.1` celdas + techo a dos aguas `1.9×0.9` + puerta oscura de `0.3` |
| `stone_house` | Igual, con `wood` sustituido por gris y una chimenea de `0.25` |
| `field` | Rectángulo con 5 surcos; el color depende de la estación y de si ya se cosechó |
| `granary` | Cuerpo alto y estrecho, sobre 4 pilotes visibles |
| `chapel` | Nave baja + espadaña de `0.5×1.2` con una cruz de dos trazos |
| `church` | Nave larga + torre de `1.0×2.2` |
| `smithy` | Cobertizo abierto + yunque + **resplandor naranja si `lit`** |
| `mill` | Torre + aspas de 4 trazos, girando lentamente si hay viento |
| `well` | Círculo + arco de dos postes |
| `palisade` | Serie de trazos verticales de `0.9` de alto con puntas |
| `wall` | Bloque de `1.0` con almenas cada 2 celdas |
| `villager` | Elipse-cuerpo `0.45×0.8` + círculo-cabeza `0.32`, altura total `1.5` celdas |
| `named` | Igual, altura `1.8`, color propio de la lista de tonos, y un punto de `0.2` sobre la cabeza |
| `ruin` | 2–3 trazos bajos e irregulares en `outline(wood)`, sin sombra |

Los ocho tonos de los nombrados son fijos y se asignan por orden de aparición,
para que un personaje conserve su color toda la partida.

### 10.6 La multitud

Hasta 80 figuras. **No se simulan**: se programan.

Cada aldeano vivo tiene un `anchorHome` y un `anchorWork` (su casa y su campo,
taller o el bosque). El ciclo cosmético del día tiene cuatro tramos:

| Tramo | Fracción del tick | Dónde |
|---|---|---|
| Amanecer | 0.00–0.15 | Saliendo de casa |
| Jornada | 0.15–0.60 | En el destino, con deriva local de ±0.5 celdas |
| Regreso | 0.60–0.80 | Camino de vuelta |
| Noche | 0.80–1.00 | Dentro; no se dibujan, pero la ventana se ilumina |

La posición se interpola sobre el trayecto cacheado de A\* (§7.6) con una
desviación de fase por figura derivada de su `id`, de modo que no salen todas a
la vez. Un domingo de cada cuatro ticks, el destino de todos es la plaza.

Coste: una interpolación y dos primitivas por figura y fotograma. Es
indistinguible de una simulación completa porque nadie mira a un aldeano
concreto durante veinte minutos.

### 10.7 Presupuesto de rendimiento

- 60 fps con 80 figuras y 45 edificios en un móvil de gama media de 2022.
- El fondo cacheado se regenera en menos de 30 ms.
- Un tick del motor, menos de 2 ms con 80 aldeanos. Un siglo, menos de 10 s.

---

## 11. Interfaz

### 11.1 Principio

El valle es el HUD. Por defecto no hay ni una cifra en pantalla. Lo que el
jugador necesita saber lo dice el propio valle:

| Lo que quiere saber | Cómo lo ve |
|---|---|
| Cuánta gente hay | Cuenta figuras, o mira cuántas casas tienen luz |
| Cómo va el grano | El granero se dibuja lleno, a medias o vacío |
| Si hay hambre | Las figuras se mueven más despacio y hay menos en el campo |
| El ánimo | Humo en las chimeneas, y la plaza llena o vacía el domingo |
| La fe | Velas en la capilla |
| Si hay peste | Cruces junto a las puertas; el cementerio crece |
| La estación | El color de todo |

Al tocar cualquier elemento aparece una ficha con **la cifra exacta**. El juego
no esconde datos: los pone a un toque de distancia en vez de a cero.

### 11.2 Pantallas

Cuatro, y solo cuatro.

**1. El valle.** Por defecto. Arriba a la izquierda, el año en números romanos
pequeños. Abajo a la derecha, los controles de velocidad. Nada más.

**2. Ficha.** Se despliega desde abajo al tocar. Para un edificio: qué es, cuándo
se levantó, quién lo usa, la cifra relevante. Para un nombrado: nombre, edad,
rasgos, dos líneas de memoria y sus opiniones fuertes.

**3. Encrucijada.** Ocupa la pantalla entera, se abre con el valle atenuado
detrás. Título, tres o cuatro frases de contexto, y las opciones como bloques
grandes con **el verbo y el precio**, siempre visible el precio. Sin botón de
cerrar: se decide o se vuelve al valle con gesto, y la encrucijada sigue
pendiente con una marca discreta.

**4. Crónica.** Lista desplazable por años. Al abrir tras una ausencia, encabeza
el parte de bienvenida (§9.2).

### 11.3 Gestos

| Gesto | Acción |
|---|---|
| Toque | Abrir ficha |
| Toque fuera | Cerrar ficha |
| Deslizar arriba | Crónica |
| Deslizar abajo | Volver al valle |
| Pellizcar | Zoom de 1× a 2,5×, solo para mirar de cerca. **No hay desplazamiento de cámara a 1×: el mapa cabe entero.** |
| Mantener pulsado | Marcar a un nombrado para seguirlo con un halo |

La lógica de gestos vive en `src/ui/gestures.ts`, sin DOM y con tests, como
exige `valle.md` §11.

### 11.4 Accesibilidad

- Ningún dato depende solo del color: la estación se refuerza con el marco del
  canvas y con el texto de la ficha.
- Objetivos táctiles mínimos de 44 px; las figuras se agrandan al tocar cerca.
- Respeta `prefers-reduced-motion`: sin nieve animada, sin aspas girando, la
  multitud se dibuja quieta en su tramo.

---

## 12. Balance

**Todos los números del juego están aquí, con una excepción declarada.** Este
capítulo se traduce literalmente a `src/engine/balance.ts`. La excepción es la
**tabla de edificios de §7.2** —celdas, madera, obra, efecto y tope—, que
también es balance y vive allí porque se lee junto al resto del sistema del
valle; se transcribe a `balance.ts` como `BUILDINGS` y esa transcripción es la
que consume el motor. Fuera de §12 y de esa tabla no hay ningún número del
juego. Cualquier constante que un módulo necesite y no esté en ninguna de las
dos se añade a `balance.ts` con `// TUNE:` y se menciona en el PR.

Estos valores no son una hipótesis en bruto: salen de simular 60 semillas
durante 200 años cada una y ajustar hasta cumplir los objetivos de §12.9. Siguen
siendo provisionales en el sentido de que la primera partida larga real
(hito 5) manda, pero son un punto de partida jugable, no un relleno.

### 12.1 Tiempo

```ts
export const TIME = {
  WEEKS_PER_SEASON: 12,
  WEEKS_PER_YEAR: 48,
  HARVEST_WEEK: 35,
  GENERATION_YEARS: 20,
  REAL_MS_PER_TICK: 15_000,
  SPEEDS: [0, 1, 4, 16],
  LETHARGY_CAP_MS: 4 * 60 * 60 * 1000,
} as const;
```

### 12.2 Fundación

```ts
export const FOUNDING = {
  POPULATION: 20,          // 6 nombrados + 14 anónimos
  ADULTS: 13, CHILDREN: 5, ELDERS: 2,
  GRAIN: 900,
  WOOD: 200,
  MORALE: 55,
  FAITH: 50,
  HOUSES: 4,
  FIELDS: 2,
} as const;
```

Comprobación, con el cálculo explícito para que nadie lo «arregle» en ninguna
de las dos direcciones:

```
consumo = 20 personas · 48 semanas · 1.0            =   960
cosecha = 2 campos · 600 · 1.00 clima · 1.02 ánimo  = 1 224
margen  = 1 224 / 960                               = 1.275
```

El 1.02 es el factor de ánimo de la fundación: `0.8 + 0.4 · 0.55`, con
`MORALE = 55`. El cociente desnudo, sin ánimo, es `1 200 / 960 = 1.25`, y
**también es correcto**: es el mismo margen visto sin el multiplicador. Los dos
números aparecen en sitios distintos del proyecto y ninguno es una errata.

El margen es, pues, del 27 %, y el arranque de 900 de grano cubre un solo año
malo. La primera hambruna es cuestión de cuándo, no de si.

### 12.3 Subsistencia

```ts
export const FOOD = {
  GRAIN_PER_PERSON: 1.0,        // por semana
  FIELD_YIELD: 600,             // por campo, cosecha completa
  FIELD_CREW: 4,                // adultos para trabajar un campo entero
  MAX_FIELDS: 8,
  BASE_STORAGE: 800,
  GRANARY_CAPACITY: 650,
  MAX_GRANARIES: 3,
  SPOILAGE: 0.08,               // semanal, sobre el excedente
  STARVATION_RATE: 0.025,       // muertos/semana como fracción, por severidad
  MILL_BONUS: 1.15,
} as const;

export const LABOUR = {
  WOOD_PER_CUTTER: 3.0,         // por semana
  BP_PER_BUILDER: 2.0,          // puntos de obra por semana
  WORKS_RESERVE: 0.15,          // fracción mínima de W dedicada a obras
  CUTTER_SHARE: 0.40,           // del sobrante tras el campo
  SMITHY_BONUS: 1.20,
  WINTER_WOOD: 0.4,             // por persona y semana
  COLD_MORTALITY: 1.4,
} as const;

export const WEATHER = [        // factor, probabilidad
  { f: 0.60, p: 0.15 },   // ruinous
  { f: 0.80, p: 0.20 },   // lean
  { f: 1.00, p: 0.40 },   // fair
  { f: 1.20, p: 0.15 },   // good
  { f: 1.45, p: 0.10 },   // abundant
] as const;
```

### 12.4 Demografía

```ts
export const LIFE = {
  BIRTH_BASE: 0.0038,           // por mujer fértil y semana
  FERTILE: [16, 40],
  ADULT: [15, 59],
  MORTALITY: [                  // anual, por tramo de edad
    { to: 4,   rate: 0.060 },
    { to: 14,  rate: 0.012 },
    { to: 39,  rate: 0.015 },
    { to: 59,  rate: 0.035 },
    { to: 74,  rate: 0.120 },
    { to: 200, rate: 0.300 },
  ],
  HOUSE_CAPACITY: 5,
  MAX_HOUSES: 16,
  HARDY: 0.7, FRAIL: 1.6,
} as const;

export const MIGRATION = {
  ARRIVE_CHANCE: 0.30,
  ARRIVE_MIN_PEOPLE: 8,
  ARRIVE_MIN_MORALE: 50,
  ARRIVE_MIN_GRAIN_YEARS: 0.5,
  ARRIVE_MIN_FREE_BEDS: 2,
  ARRIVE_COUNT: [2, 4],
  LEAVE_BELOW_MORALE: 30,
  LEAVE_COUNT: [1, 3],
} as const;
```

**Aforo máximo: 80.** 16 casas × 5. Coincide con el tope de figuras del render y
con la escala de `valle.md` §7: no es casualidad, es la misma cifra vista desde
tres sitios.

### 12.5 Desastres

```ts
export const DISASTER = {
  PLAGUE_BASE: 0.014,           // anual; se suma people/2500
  PLAGUE_WELL: 0.6,
  PLAGUE_WEEKS: [6, 10],
  PLAGUE_HAZARD_ADULT: 0.050,   // semanal, durante el brote
  PLAGUE_HAZARD_WEAK: 0.090,    // 0–4 y 60+
  FIRE_CHANCE: 0.035,           // anual
  FIRE_GRAIN_LOSS: 0.45,        // si arde un granero
  FIRE_MORALE: -6,
} as const;
```

### 12.6 Ánimo y fe

```ts
export const MOOD = {
  MORALE_DRIFT_TO: 50,   MORALE_DRIFT: 0.02,
  MORALE_PER_DEATH: -1.5,
  MORALE_HUNGER: -4.0,          // × severidad
  MORALE_CROWDING: -0.4,        // por persona sin cama
  MORALE_CHAPEL: 0.15, MORALE_CHURCH: 0.30, MORALE_MILL: 0.05,
  MORALE_GRAVEYARD: 0.05,       // el efecto que §7.2 da a `grave_yard`
  MORALE_OUTBREAK: -0.8,
  MORALE_HARVEST: 25,           // × (factor de clima − 1)
  FAITH_DRIFT_TO: 40,    FAITH_DRIFT: 0.01,
  FAITH_CHAPEL: 0.20, FAITH_CHURCH: 0.35,
  FAITH_DEVOUT_PRIEST: 0.10,
  FAITH_NO_PRIEST: -0.15,
  FAITH_OUTBREAK: -0.60,
  MORALE_FLOOR_FROM_FAITH: 0.25,
} as const;
```

### 12.7 El valle

```ts
export const WORLD = {
  WIDTH: 36, HEIGHT: 56,
  FOREST_TARGET: [0.18, 0.30],
  WOOD_PER_FOREST_TILE: 300,
  FOREST_REGROWTH_YEARS: 8,
  FOREST_REGROWTH_NEIGHBOURS: 3,
  PATH_T1: 400, PATH_T2: 1600, PATH_T3: 6000,
  TRAFFIC_DECAY: 0.005,         // por tick
  STONE_PER_BP: 0.5,            // conversión de obra a piedra con fragua
} as const;
```

### 12.8 Encrucijadas

```ts
export const CROSSROADS = {
  MIN_TICKS_BETWEEN: 120,       // 30 min reales a ×1
  GUARANTEE_TICKS: 960,         // una por generación como mínimo
  CRISIS_MULTIPLIER: 4.0,
  NOVELTY_MULTIPLIER: 0.4,      // si ya salió en esta partida
  DEFAULT_COOLDOWN_YEARS: 25,
} as const;
```

### 12.9 Objetivos que verifica la suite de balance

Estos son los asertos, no los resultados. Se comprueban sobre 60 semillas × 200
años, con una política de decisión neutra (siempre la primera opción):

| Propiedad | Umbral |
|---|---|
| Extinción con política neutra | 2 % – 12 % |
| Extinción con política adversa (siempre la peor opción) | ≥ 25 % |
| Mediana del pico de población | 65 – 82 |
| Mapa lleno (8 campos, 16 casas) antes del año 120 | ≥ 60 % de las semillas |
| Población visible al final de la primera generación | ≥ 26 en la mediana |
| Encrucijadas por generación | 1 – 4 |
| Bosque restante en el año 100 | 40 % – 70 % del inicial |
| Choque del 90 % de bajas en el año 40 → extinción | ≥ 25 % |
| Cualquier estadística fuera de rango o `NaN` | 0 casos |

La segunda fila es la que hace cumplir el principio 4 de `valle.md`: **la aldea
solo muere si el jugador la mata.** Si esa cifra baja del 25 %, las encrucijadas
no tienen dientes suficientes y hay que endurecer sus efectos, no el mundo.

---

## 13. Persistencia y letargo

### 13.1 Formato de guardado

IndexedDB, base `the-valley`, almacén `saves`, clave `current`.

```ts
export interface SaveFile {
  schema: number;              // versión del esquema
  savedAtMs: number;           // reloj de pared, para calcular la ausencia
  state: GameState;            // instantánea completa, autoritativa
  decisions: DecisionRecord[]; // registro paralelo, para depurar y migrar
  archive: ArchivedGame[];     // crónicas de partidas anteriores + sus ruinas
}
```

**Por qué las dos cosas.** La instantánea es la verdad: se carga al instante y
sobrevive a un cambio de balance. El registro de decisiones permite reproducir
la partida desde la semilla para depurar un fallo, comparar dos configuraciones
y migrar una partida si algún día cambia el esquema. Guardar solo el registro
sería elegante y frágil: en cuanto se toque un número de §12, todas las partidas
guardadas divergen.

Se guarda cada 20 ticks y siempre al ocultarse la pestaña
(`visibilitychange`).

### 13.2 Letargo

Al cargar:

```
elapsed = min(now − savedAtMs, LETHARGY_CAP_MS)
ticks   = floor(elapsed / REAL_MS_PER_TICK)      // máx. 960
```

Se ejecutan esos ticks en lotes de 64 dentro de `requestAnimationFrame`, con una
pantalla de progreso que ya muestra el valle dibujándose. 960 ticks tardan menos
de 2 s.

Si había una encrucijada pendiente, **sigue pendiente**: la aldea ha vivido esas
semanas sin decisión, con las consecuencias que eso tenga. No se resuelve sola,
no caduca y no mata (§1).

Al terminar, se abre el **parte de bienvenida** (§9.2).

### 13.3 Herencia entre partidas

Al extinguirse una aldea, la partida se cierra y su crónica completa se archiva
junto con la máscara de sus edificios. La siguiente partida genera un mapa nuevo
con la misma semilla de terreno y **siembra las ruinas de la anterior** en
`map.ruins`.

Las ruinas heredadas no tienen efecto mecánico: no dan recursos, no bloquean la
construcción de madera, no modifican ningún número. Están ahí para verse. Darles
efecto convertiría la derrota en una moneda y la ruina en un recurso, que es
justo lo contrario de lo que buscan los principios 4 y 3.

---

## 14. Pruebas

### 14.1 Suite rápida (`tests/fast/`, segundos)

Se ejecuta en cada commit. Prohibido que tarde más de 20 s.

- **Determinismo.** Misma semilla + mismas decisiones → estado idéntico a los
  5 000 ticks. Se compara un hash del estado serializado.
- **Aislamiento de flujos.** Consumir 1 000 números del flujo `chronicle` no
  cambia el estado de la simulación.
- **Arquitectura.** `src/engine/` no contiene `Math.random`, `Date`, `document`,
  `window`, ni importa de `render/` ni de `ui/`.
- **Invariantes por tick.** Sobre 200 ticks de 5 semillas: `grain ≥ 0`,
  `morale ∈ [0,100]`, `faith ∈ [0,100]`, ningún aldeano con `bornTick > tick`,
  ningún edificio solapado, ningún edificio sobre agua.
- **Catálogo.** Toda opción tiene `visible.length ≥ 1`; toda plantilla tiene 2 o
  3 opciones; todo `templateKey` y toda `cost`/`label` existe en el banco de
  textos; todo `cast` referenciado por efectos y semillas está declarado.
- **Condiciones.** Tabla de casos para cada variante del DSL.
- **Mapa.** 200 semillas: río continuo, bosque en rango, sitio de fundación válido.
- **Gestos y cámara.** Lógica pura, sin DOM.
- **Guardado.** Ida y vuelta: `load(save(state))` es idéntico a `state`.

### 14.2 Suite de balance (`tests/balance/`, minutos)

Se lanza aparte (`npm run test:balance`), en CI nocturna y antes de tocar §12.
Comprueba los umbrales de §12.9. **Nunca se fija un umbral con una sola
semilla**: dos partidas divergen desde el primer tick y una sola es ruido.

Salida: una tabla por consola y un CSV con las series de población, grano, ánimo
y edificios, para poder mirar la forma de las curvas y no solo el aserto.

### 14.3 Capturas (`tools/screenshots.ts`, Playwright)

**Obligatorio desde el primer día que se dibuje algo** (`valle.md` §12).

Genera una hoja de contacto en `artifacts/`: el mismo valle en las cuatro
estaciones, en los años 1, 20, 60 y 120, a resolución de móvil real; más una
versión en escala de grises de cada una para verificar la regla de silueta.

Regla de trabajo: **ningún cambio visual se da por terminado sin mirar la hoja de
contacto.** Los fallos que este juego no puede permitirse —una estación con el
color equivocado, figuras ilegibles a tamaño real— no los detecta ningún aserto.

---

## 15. Hitos

| | Hito | Criterio de salida | Módulos |
|---|---|---|---|
| **0** | Crónica sin gráficos | Tres crónicas distinguibles por un tercero | M-00 … M-12 |
| **1** | Valle visible | Se ve la aldea y las estaciones; sin jugador | M-13 … M-19 |
| **2** | Encrucijadas | Una decisión que cambia el valle de forma visible | M-20 … M-22 |
| **3** | Generaciones | Envejecen, mueren, heredan; la aldea recuerda | M-04, M-05, M-06 ampliados |
| **4** | Fracaso y herencia | Una aldea puede extinguirse; quedan ruinas | Esbozado, §16.1 |
| **5** | Idle | Tiempo real, letargo, parte de bienvenida | Esbozado, §16.2 |
| **6** | Guardado | Persistencia; primera partida real de varios días | M-23 |

### 15.1 El hito 0 en detalle

Es el que puede matar el proyecto, y ese es su propósito.

**Entregable:** `npm run chronicle -- --seed 7 --years 60 --policy first`
escribe por consola la crónica de sesenta años de una aldea. Sin valle, sin
dibujo, sin interfaz.

**Qué debe incluir ya:** personas con nombre y rasgos, opiniones y rencores,
demografía completa, subsistencia con estaciones, las 16 plantillas de
encrucijada con su reparto y sus semillas, y el banco de textos.

**Qué no debe incluir:** nada del capítulo 7 salvo el conteo de edificios como
números, nada del 10, nada del 11.

**Criterio de aceptación:** tres crónicas de tres semillas distintas, leídas por
alguien ajeno al proyecto, que sepa contar en qué se diferencian. Si la
respuesta es «se parecen mucho», el problema está en el cruce de sistemas y hay
que arreglarlo antes de dibujar un solo píxel.

---

## 16. Hitos 4 a 6 — esbozo

No se detallan por decisión consciente: dependen de cómo se sienta el juego, y
especificarlos ahora sería inventar. Se fija solo lo que otros módulos necesitan
saber para no cerrarles la puerta.

### 16.1 Hito 4 — Fracaso y herencia

Contrato que el resto del código debe respetar desde ya:

- `GameState.ended: EndState | null` existe desde el principio y el bucle lo
  comprueba en el paso 17.
- `SaveFile.archive` existe desde el principio, aunque esté vacío.
- `ValleyMap.ruins` se rellena y se dibuja desde el hito 1, aunque solo lo use
  el incendio.

Queda por decidir: la pantalla de epitafio, si la crónica archivada se puede
releer entera, y cuántas partidas se conservan.

### 16.2 Hito 5 — Idle

El contrato de §13.2 es firme. Queda por decidir, y **solo se puede resolver
jugando**: los tiempos de §12.1. La estación de 3 minutos y la generación de 4
horas son una hipótesis razonada, no un dato. El ajuste se hace con la primera
partida larga en la mano y consiste en cambiar `REAL_MS_PER_TICK` y nada más —
por eso el motor cuenta en ticks y no en minutos.

### 16.3 Hito 6 — Guardado

Especificado en §13.1. Queda por decidir la política de migración cuando cambie
`schema`, que depende de si para entonces hay partidas de gente real.

---

## 17. Briefs por módulo

Cada brief es autocontenido. Un agente que lea las secciones 1–4 y su brief
tiene todo lo necesario. Las dependencias indican qué debe estar fusionado
antes de empezar.

**Formato de cada brief:** Objetivo · Depende de · Ficheros · Contrato · Reglas ·
Tests · Terminado cuando.

---

### M-00 · Andamiaje

**Objetivo.** Repositorio que compila, prueba y arranca.
**Depende de.** Nada.
**Ficheros.** `package.json`, `tsconfig.json`, `vite.config.ts`,
`vitest.config.ts`, `playwright.config.ts`, `.editorconfig`, `eslint.config.js`,
`index.html`, `src/main.ts`, la estructura de carpetas de §2.1 con un
`.gitkeep` en cada una.
**Contrato.** Scripts: `dev`, `build`, `test` (suite rápida), `test:balance`,
`chronicle`, `shots`, `lint`, `typecheck`.
**Reglas.** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
ESLint prohíbe `any` y los identificadores prohibidos de §2.4 dentro de
`src/engine/`.
**Tests.** Un test trivial que pase, para verificar la tubería.
**Terminado cuando.** `npm ci && npm run typecheck && npm test && npm run build`
pasa en limpio.

---

### M-01 · Aleatoriedad y tiempo

**Objetivo.** Los cimientos deterministas.
**Depende de.** M-00.
**Ficheros.** `src/engine/rng.ts`, `src/engine/time.ts`.
**Contrato.**
```ts
export function hash32(seed: number, stream: string): number;
export function makeBundle(seed: number): RngBundle;
export function next(b: RngBundle, s: RngStream): number;        // [0,1)
export function int(b: RngBundle, s: RngStream, a: number, z: number): number; // [a,z]
export function pick<T>(b: RngBundle, s: RngStream, xs: readonly T[]): T;
export function weighted<T>(b, s, xs: readonly T[], w: (x: T) => number): T;
export function clockOf(tick: number): Clock;
export function seasonOf(tick: number): Season;
export function yearOf(tick: number): number;
```
**Reglas.** mulberry32. `next` muta el estado del flujo dentro del bundle. Ningún
otro módulo implementa aleatoriedad.
**Tests.** Reproducibilidad entre ejecuciones; distribución uniforme razonable a
100 000 muestras; independencia de flujos; `clockOf` en los bordes de estación y
de año.
**Terminado cuando.** Los tests pasan y `weighted` maneja pesos cero sin dividir
por cero.

---

### M-02 · Tipos de estado y balance

**Objetivo.** El contrato común, escrito una vez.
**Depende de.** M-01.
**Ficheros.** `src/engine/state.ts`, `src/engine/balance.ts`,
`src/engine/crossroads/schema.ts`.
**Contrato.** Todos los tipos de §3, literalmente. Todas las constantes de §12,
literalmente, como objetos `as const`, más la tabla de edificios de §7.2 como
`BUILDINGS`. Los tipos de §8.1, §8.3, §8.4 y §8.5 van en `schema.ts`: son
declaraciones puras y `state.ts` necesita el DSL para `PlantedSeed`. M-07
escribe sólo la lógica en el resto de esa carpeta.
**Reglas.** Sin lógica: solo tipos y datos. Ni una función.

**Grafo de dependencias, obligatorio y acíclico:**

```
rng.ts, balance.ts        hojas, no importan nada
state.ts                  -> rng.ts
crossroads/schema.ts      -> state.ts
time.ts                   -> state.ts, balance.ts
```

`Op` y `Condition` (§8.2) viven en `state.ts`, no en `schema.ts`, y la flecha va
de `schema` a `state` y no al revés. La razón es de conteo: §8 necesita seis
tipos de §3 —`Season`, `Role`, `Trait`, `BuildingKind`, `StatName`,
`MemoryKind`— y §3 necesita uno solo de §8, `Condition`, para `PlantedSeed`. Con
`Condition` en `state.ts` el grafo queda acíclico; en la dirección contraria los
dos ficheros se importarían entre sí. Con `verbatimModuleSyntax` un ciclo de
`import type` compila sin quejarse, así que no se notaría hasta que lo hubieran
heredado cinco módulos: hay un test que guarda el grafo.

**Tests.** Un test que compruebe la coherencia interna de §12: aforo máximo
(`MAX_HOUSES · HOUSE_CAPACITY`) igual a 80; probabilidades de `WEATHER` sumando
1; y sobre `MORTALITY`, tramos de edad estrictamente crecientes que cubren de 0
a 200 sin hueco ni solape, con tasas crecientes **a partir del segundo tramo**.
La curva es de bañera, no una rampa: el `0.060` infantil es deliberado y está
por encima del `0.012` que le sigue. Exigir monotonía desde el primer tramo era
una errata de este brief, no de §12.4.
**Terminado cuando.** El resto de módulos puede importar de aquí sin
dependencias circulares.

---

### M-03 · Nombres, aldeanos y rasgos

**Objetivo.** Crear gente.
**Depende de.** M-02.
**Ficheros.** `src/engine/people/names.ts`, `traits.ts`, `villagers.ts`.
**Contrato.**
```ts
export function makeName(b: RngBundle, female: boolean, used: Set<string>): string;
export function rollTraits(b: RngBundle, role: Role | null): Trait[];
export function makeVillager(...): Villager;
export function foundPeople(b: RngBundle, tick: number): PeopleState;
export function promoteToNamed(state: GameState, id: VillagerId, role: Role): void;
```
**Reglas.** Bancos de nombres del Anexo B, anglosajones. Ningún nombre se repite
entre vivos. Pesos de rasgo por rol según §6.3. Los anónimos tienen `traits: []`,
`memories: []`, `opinions: {}`.
**Tests.** `foundPeople` produce exactamente `FOUNDING.POPULATION` con el
reparto de edades de §12.2 y los 6 roles fundacionales; sin nombres repetidos en
1 000 semillas; los rasgos siempre son 3 o 4 y sin duplicados.
**Terminado cuando.** Dos semillas distintas dan reparto claramente distinto.

---

### M-04 · Demografía

**Objetivo.** Nacer, envejecer, morir.
**Depende de.** M-03.
**Ficheros.** `src/engine/people/demography.ts`.
**Contrato.**
```ts
export function ageEveryone(state: GameState): void;
export function resolveDeaths(state: GameState, ctx: TickContext): DeathEvent[];
export function resolveBirths(state: GameState, ctx: TickContext): BirthEvent[];
export function resolveMigration(state: GameState): MigrationEvent[];
export function workforce(state: GameState): number;
export function population(state: GameState): number;
```
**Reglas.** Fórmulas de §6.5 y §5.7 exactas. `TickContext` transporta `severity`,
`cold` y el brote activo; la demografía no los calcula. Las listas se fotografían
al empezar: un recién nacido no muere en su mismo tick.
**Tests.** Una aldea de 20 personas sin hambre ni peste crece; con `severity = 1`
sostenido, muere en menos de 5 años; la esperanza de vida al nacer cae entre 28 y
38 años sobre 20 000 aldeanos simulados; la migración respeta todas sus puertas.
**Terminado cuando.** Los tests pasan sobre al menos 10 semillas.

---

### M-05 · Memoria, opiniones y rencores

**Objetivo.** Que los nombrados tengan pasado.
**Depende de.** M-03.
**Ficheros.** `src/engine/people/opinions.ts`, `memories.ts`.
**Contrato.**
```ts
export function remember(v: Villager, m: Memory): void;
export function decayMemories(state: GameState): void;
export function adjustOpinion(state, from: VillagerId, to: VillagerId, d: number): void;
export function driftOpinions(state: GameState): void;
export function grudges(state: GameState, min?: number): Grudge[];
export function worstEnemyOf(state: GameState, id: VillagerId): VillagerId | null;
```
**Reglas.** Tabla de §6.4 exacta. Máximo 12 memorias, se descarta la de menor
peso efectivo. `spiteful` y `loyal` modulan la recuperación. Las opiniones solo
existen entre nombrados vivos; al morir alguien, se limpian sus entradas.
**Tests.** Una opinión llevada a −60 crea rencor con causa; sin sucesos nuevos,
un `loyal` vuelve a 0 en la mitad de tiempo que un `spiteful`; la memoria nunca
supera 12 entradas.
**Terminado cuando.** `grudges()` devuelve resultados estables y deterministas.

---

### M-06 · Subsistencia

**Objetivo.** El reloj lento: trabajo, grano, madera, ánimo, fe.
**Depende de.** M-02, M-04.
**Ficheros.** `src/engine/subsistence/labour.ts`, `harvest.ts`, `consumption.ts`,
`mood.ts`, `seasons.ts`.
**Contrato.**
```ts
export function allocateLabour(state: GameState): Allocation;
export function produce(state: GameState, a: Allocation): void;    // madera + puntos de obra
export function consume(state: GameState): { severity: number; starved: VillagerId[] };
export function overwinter(state: GameState): { cold: boolean };
export function harvest(state: GameState, a: Allocation): HarvestResult;
export function updateMood(state: GameState, ctx: TickContext): void;
export function rollWeather(state: GameState): YearWeather;
```
**Reglas.** Fórmulas de §5 exactas, incluida la reserva de obras del 15 % y el
tope de `workedFields`. `consume` va antes que `harvest` en el tick.
**Tests.** La aldea fundacional con clima 1.0 termina el año 1 con grano
positivo; con clima 0.60 dos años seguidos, entra en hambruna; la reserva de
obras nunca baja de `W · 0.15`; el ánimo y la fe se mantienen en `[0,100]` en
50 000 ticks; el suelo de ánimo por fe se respeta.
**Terminado cuando.** Se reproduce la curva de referencia de §12.9 en
combinación con M-04.

---

### M-07 · Motor de encrucijadas

**Objetivo.** Evaluar, elegir, repartir, resolver, plantar.
**Depende de.** M-05, M-06.
**Ficheros.** `src/engine/crossroads/schema.ts`, `conditions.ts`, `cast.ts`,
`select.ts`, `resolve.ts`, `seeds.ts`.
**Contrato.**
```ts
export function evaluate(c: Condition, state: GameState): boolean;
export function fillCast(t: CrossroadTemplate, state): Record<string, VillagerId> | null;
export function eligible(state: GameState): ScoredTemplate[];
export function selectCrossroad(state: GameState): PendingCrossroad | null;
export function applyOption(state: GameState, optionId: string): AppliedEffects;
export function fireSeeds(state: GameState): FiredSeed[];
```
**Reglas.** Todo el DSL de §8.2. La selección usa el flujo `crossroads`, el
reparto el flujo `cast`. Multiplicadores de crisis, novedad y rasgo según §8.6.
Garantía por generación y techo de 120 ticks. `applyOption` planta las semillas
y registra en `history`.
**Tests.** Tabla de casos por cada variante de `Condition`; una plantilla con
reparto imposible nunca es elegible; el techo se respeta salvo en crisis; la
garantía dispara a los 960 ticks exactos; una semilla plantada con retraso
[3,5] vence dentro de esa ventana; una semilla cuya condición falla se marchita
sin efectos y deja constancia.
**Terminado cuando.** Con el catálogo de M-08, 20 semillas × 100 años producen
entre 5 y 20 encrucijadas cada una, sin repeticiones adyacentes.

---

### M-08 · Catálogo de encrucijadas

**Objetivo.** Las 16 plantillas del Anexo A, como datos.
**Depende de.** M-07.
**Ficheros.** `src/engine/crossroads/catalog/*.ts` (una por categoría),
`catalog/index.ts`.
**Contrato.** `export const CATALOG: readonly CrossroadTemplate[]`.
**Reglas.** Transcripción literal del Anexo A. Sin lógica, sin funciones: datos
puros. Toda clave de texto debe existir en el banco de M-09.
**Tests.** Los del catálogo listados en §14.1; además, cada categoría tiene al
menos una plantilla elegible en algún estado alcanzable — se verifica ejecutando
30 semillas × 150 años y comprobando que ninguna plantilla queda a cero apariciones.
**Terminado cuando.** El test de cobertura del catálogo pasa.

---

### M-09 · Crónica

**Objetivo.** Registrar y componer el texto.
**Depende de.** M-02.
**Ficheros.** `src/engine/chronicle/events.ts`, `bank.en.ts`, `render.ts`,
`digest.ts`.
**Contrato.**
```ts
export function record(state: GameState, e: Omit<ChronicleEntry,'tick'>): void;
export function renderEntry(e: ChronicleEntry, b: RngBundle): string;
export function renderYear(state: GameState, year: number, minWeight?: 1|2|3): string[];
export function welcomeDigest(state: GameState, sinceTick: number): Digest;
```
**Reglas.** El banco del Anexo B, 3–5 variantes por clave. Prohibiciones de
§9.3. Ningún otro módulo escribe texto: empujan claves y parámetros.
**Tests.** Toda clave usada por el catálogo existe en el banco; toda clave del
banco tiene al menos 3 variantes; ningún texto contiene `!`, ` you `, ` your `;
todos los parámetros de una plantilla se sustituyen (no quedan `{}` sin
resolver) sobre 5 000 entradas generadas.
**Terminado cuando.** `renderYear` de una partida de 60 años se lee de corrido.

---

### M-10 · Orquestación y runner de consola

**Objetivo.** El tick completo y el entregable del hito 0.
**Depende de.** M-04, M-06, M-07, M-08, M-09.
**Ficheros.** `src/engine/sim.ts`, `src/engine/found.ts`, `src/cli/chronicle.ts`.
**Contrato.**
```ts
export function foundGame(seed: number): GameState;
export function tick(state: GameState, decision?: Decision): TickReport;
export function run(state: GameState, ticks: number, policy: Policy): void;
export type Policy = 'first' | 'last' | 'random' | 'worst' | ((s, c) => string);
```
**Reglas.** El orden de §4.2 es normativo y el código lo refleja con 17 llamadas
numeradas y comentadas. `tick` no dibuja ni escribe por consola.
**Tests.** El test de determinismo de §4.3; el orden del tick verificado con
espías; 1 000 ticks sin excepciones en 20 semillas.
**Terminado cuando.** `npm run chronicle -- --seed 7 --years 60` imprime una
crónica legible. **Este es el hito 0.**

---

### M-11 · Suite rápida

**Objetivo.** Que romper algo se note en segundos.
**Depende de.** M-10.
**Ficheros.** `tests/fast/**`.
**Contrato.** Los diez grupos de §14.1.
**Reglas.** Los tests describen propiedades del diseño, no detalles de
implementación. Nada de comprobar que una función llama a otra.
**Tests.** Son el entregable.
**Terminado cuando.** `npm test` tarda menos de 20 s y cubre los diez grupos.

---

### M-12 · Banco de pruebas de balance

**Objetivo.** Poder tocar §12 sin volar el juego.
**Depende de.** M-10.
**Ficheros.** `tests/balance/**`, `tools/balance-report.ts`.
**Contrato.** `npm run test:balance` ejecuta 60 semillas × 200 años con las
políticas `first` y `worst`, comprueba los umbrales de §12.9, imprime una tabla
y escribe `artifacts/balance.csv`.
**Reglas.** Ningún umbral se fija con una sola semilla. Las series se guardan
para poder mirar la forma de las curvas.
**Tests.** Son el entregable.
**Terminado cuando.** Los nueve umbrales de §12.9 pasan y la ejecución completa
tarda menos de 5 minutos.

---

### M-13 · Generación del mapa

**Objetivo.** Un valle creíble y siempre igual para la misma semilla.
**Depende de.** M-02.
**Ficheros.** `src/engine/world/mapgen.ts`, `tiles.ts`.
**Contrato.**
```ts
export function generateMap(b: RngBundle): ValleyMap;
export function foundingSite(map: ValleyMap): { x: number; y: number };
export function idx(x: number, y: number): number;
export function neighbours4(i: number): number[];
```
**Reglas.** Los cinco pasos de §7.1 en ese orden, con el flujo `map`.
**Tests.** Los de §7.1 sobre 200 semillas; `generateMap` es puro; dos semillas
distintas dan mapas visiblemente distintos (más del 15 % de celdas diferentes).
**Terminado cuando.** Un volcado ASCII del mapa por consola se reconoce como un
valle con río.

---

### M-14 · Edificios, colocación y obras

**Objetivo.** Que la aldea se construya sola y con criterio.
**Depende de.** M-13, M-06.
**Ficheros.** `src/engine/world/buildings.ts`, `placement.ts`, `works.ts`,
`upgrade.ts`.
**Contrato.**
```ts
export function nextProject(state: GameState): BuildingKind | Upgrade | null;
export function placeBuilding(state, kind: BuildingKind): {x,y} | null;
export function advanceWorks(state: GameState, buildPoints: number): BuiltEvent[];
export function destroyBuilding(state: GameState, id: BuildingId): void;
export function capacityOf(state: GameState): { housing: number; storage: number };
```
**Reglas.** Tabla de §7.2, prioridad de §7.3 y puntuación de §7.4, exactas. Nunca
sobre agua, marisma ni ruina de piedra. Al destruir, el edificio queda con
`lostTick` y sus celdas se marcan en `map.ruins`.
**Tests.** Ningún solapamiento en 30 semillas × 150 años; la prioridad se
respeta en una batería de estados construidos a mano; al llenarse el mapa,
`nextProject` devuelve mejoras y no nuevos edificios; los topes de §7.2 nunca se
superan.
**Terminado cuando.** Una partida de 120 años llega a los ~45 edificios de
`valle.md` §7.

---

### M-15 · Caminos y bosque

**Objetivo.** Que el mapa cuente la historia de dónde se pisa y qué se tala.
**Depende de.** M-14.
**Ficheros.** `src/engine/world/paths.ts`, `forest.ts`, `astar.ts`.
**Contrato.**
```ts
export function routeFor(state: GameState, id: VillagerId): number[]; // cacheada
export function accrueTraffic(state: GameState): void;
export function upgradePaths(state: GameState): PathEvent[];
export function fellForest(state: GameState, wood: number): number;   // devuelve la madera obtenida
export function regrowForest(state: GameState): void;
```
**Reglas.** Umbrales y decaimiento de §12.7. La tala consume la celda de bosque
más cercana al núcleo. El rebrote necesita 3 vecinas y 8 años.
**Tests.** Con tráfico constante, una celda alcanza `path = 2` en el número de
ticks esperado ±5 %; sin tráfico, un camino desaparece; el bosque nunca baja de
0 ni sube del total inicial; el rebrote no ocurre bajo un edificio.
**Terminado cuando.** A los 100 años, el bosque restante cae en el rango de
§12.9 en al menos 20 de 30 semillas.

---

### M-16 · Terreno y paletas

**Objetivo.** Que el valle se vea, y que la estación se reconozca por el color.
**Depende de.** M-13, M-00.
**Ficheros.** `src/render/palette.ts`, `src/render/layers/terrain.ts`,
`src/render/canvas.ts`.
**Contrato.**
```ts
export function paletteFor(season: Season, seasonWeek: number): Palette; // interpola 2 semanas
export function outline(c: string): string;
export function paintTerrain(ctx, map: ValleyMap, p: Palette, cell: number): void;
export function makeBackground(map, p, cell): OffscreenCanvas;
```
**Reglas.** Tabla de §10.3 literal. Manchas por región, jamás ruido por celda.
Sin contorno en el terreno.
**Tests.** La comprobación de silueta de §10.3 para las cuatro paletas;
`paletteFor` interpola de forma continua en los bordes de estación.
**Terminado cuando.** La hoja de contacto de M-19 muestra cuatro estaciones
inconfundibles.

---

### M-17 · Edificios y figuras

**Objetivo.** El resto del arte.
**Depende de.** M-16, M-14.
**Ficheros.** `src/render/sprites/*.ts`, `src/render/layers/buildings.ts`,
`figures.ts`, `shadows.ts`.
**Contrato.** Una función pura por sprite, con la firma de §10.5.
**Reglas.** Todo lo que está de pie proyecta sombra. Contorno en edificios y
figuras. Proporciones de §10.5. Nada se dibuja fuera de su caja.
**Tests.** Cada sprite se renderiza a 10 px y a 9 px de celda sobre fondo blanco y sobre
negro y produce píxeles no vacíos en ambos; ningún sprite pinta fuera de su caja
(comprobado sobre el buffer); test de silueta: en blanco y negro, `house`,
`chapel`, `granary` y `mill` tienen mapas de ocupación distintos entre sí.
**Terminado cuando.** A tamaño de móvil real se distinguen los siete edificios
principales sin leer una etiqueta.

---

### M-18 · La multitud

**Objetivo.** Ochenta figuras que van y vienen.
**Depende de.** M-17, M-15.
**Ficheros.** `src/render/crowd.ts`.
**Contrato.**
```ts
export function crowdPositions(state: GameState, tickFraction: number): Figure[];
```
**Reglas.** El horario de §10.6. Desfase de fase derivado del `id`. Interpolación
sobre el trayecto cacheado. **No muta el estado.** De noche no se dibujan
figuras: se ilumina la ventana.
**Tests.** Función pura: misma entrada, misma salida; ninguna figura fuera del
mapa; a `tickFraction = 0.9` no hay figuras a la intemperie; con 80 aldeanos,
1 000 llamadas en menos de 100 ms.
**Terminado cuando.** En un GIF de 20 s se ve salir al campo y volver.

---

### M-19 · Capturas automáticas

**Objetivo.** Que quien programa pueda ver el juego. Es el riesgo número uno de
`valle.md` §12 y esto es su mitigación.
**Depende de.** M-16.
**Ficheros.** `tools/screenshots.ts`, `playwright.config.ts`, `src/ui/debug.ts`.
**Contrato.** `npm run shots -- --seed 7 --years 1,20,60,120` genera en
`artifacts/` una PNG por combinación de año y estación, a 390×844 (mapa 360×560), más su
versión en escala de grises, más una hoja de contacto que las junta.
**Reglas.** Debe funcionar sin interacción y en CI. Una ruta de depuración
permite saltar la simulación a un tick dado sin jugar.
**Tests.** El comando termina con código 0 y produce el número esperado de
ficheros.
**Terminado cuando.** Está fusionado **antes** que M-17. Ningún trabajo visual
empieza sin esto.

---

### M-20 · Armazón de aplicación

**Objetivo.** Que el juego corra en una pantalla.
**Depende de.** M-10, M-16, M-17.
**Ficheros.** `src/ui/app.ts`, `loop.ts`, `speed.ts`, `src/main.ts`.
**Contrato.**
```ts
export function boot(root: HTMLElement, save?: SaveFile): App;
export interface App { setSpeed(s: 0|1|4|16): void; state(): Readonly<GameState>; }
```
**Reglas.** El bucle acumula tiempo real y ejecuta ticks enteros; el render
interpola con la fracción sobrante. Si la pestaña estuvo oculta, no se acumulan
ticks: eso lo resuelve el letargo (M-23). Nunca más de 8 ticks por fotograma.
**Tests.** Lógica de acumulación de tiempo probada sin DOM: a ×4 y 60 fps, 12
minutos reales dan exactamente 192 ticks.
**Terminado cuando.** Se abre en un móvil, se ve el valle y las estaciones pasan.

---

### M-21 · HUD diegético y fichas

**Objetivo.** Informar sin números en pantalla.
**Depende de.** M-20.
**Ficheros.** `src/ui/inspect.ts`, `gestures.ts`, `src/render/layers/tells.ts`.
**Contrato.**
```ts
export function tellsFor(state: GameState): Tell[];         // humo, velas, cruces, granero
export function inspectAt(state, x: number, y: number): InspectTarget | null;
export function panelFor(t: InspectTarget, state): PanelModel;
```
**Reglas.** La tabla de §11.1 completa. La ficha muestra la cifra exacta: el
juego no esconde datos. Gestos de §11.3, en un módulo sin DOM y con tests.
**Tests.** `inspectAt` acierta el objetivo en los bordes de las cajas; `tellsFor`
es pura; el reconocimiento de gestos se prueba con secuencias de eventos
sintéticas.
**Terminado cuando.** Alguien que no conoce el juego sabe decir si hay hambre
mirando la pantalla.

---

### M-22 · Encrucijada y crónica en pantalla

**Objetivo.** Cerrar el bucle corto.
**Depende de.** M-21, M-09.
**Ficheros.** `src/ui/screens/crossroad.ts`, `screens/chronicle.ts`.
**Contrato.**
```ts
export function openCrossroad(app: App, p: PendingCrossroad): void;
export function openChronicle(app: App, sinceTick?: number): void;
```
**Reglas.** El precio de cada opción siempre visible antes de elegir. Sin botón
de cerrar. La simulación **no se pausa** mientras la encrucijada está abierta.
Al decidir, la cámara enfoca durante 2 s el efecto visible.
**Tests.** Todas las opciones de las 16 plantillas se renderizan sin
desbordamiento a 390 px de ancho; el enfoque posterior apunta a una celda
válida.
**Terminado cuando.** Una decisión cambia el valle de forma visible. **Este es
el hito 2.**

---

### M-23 · Guardado y letargo

**Objetivo.** Que la aldea siga sin ti.
**Depende de.** M-20, M-10.
**Ficheros.** `src/engine/save.ts`, `src/ui/lethargy.ts`, `src/ui/welcome.ts`.
**Contrato.**
```ts
export function serialize(state: GameState, decisions: DecisionRecord[]): SaveFile;
export function deserialize(raw: unknown): SaveFile;          // valida y migra
export function catchUp(state: GameState, elapsedMs: number): CatchUpReport;
```
**Reglas.** §13 completa. Guardado cada 20 ticks y en `visibilitychange`. Tope
de letargo de 4 h. Una encrucijada pendiente sigue pendiente. Lotes de 64 ticks
dentro de `requestAnimationFrame`.
**Tests.** Ida y vuelta idéntica; un guardado corrupto se rechaza sin romper la
aplicación; `catchUp` de 4 h ejecuta exactamente 960 ticks y tarda menos de 2 s;
reproducir el registro de decisiones desde la semilla da el mismo estado que la
instantánea.
**Terminado cuando.** Cerrar y abrir a las cuatro horas presenta un parte de
bienvenida coherente. **Este es el hito 6.**

---

### 17.1 Orden de trabajo

```
M-00
 └─ M-01 ─ M-02 ─┬─ M-03 ─┬─ M-04 ─┐
                 │        └─ M-05 ─┤
                 ├─ M-06 ──────────┤
                 ├─ M-09 ──────────┤
                 └─ M-13 ─ M-14 ─ M-15
                                   │
                          M-07 ─ M-08
                                   │
                                 M-10  ← HITO 0
                                   ├─ M-11, M-12
                                   │
                          M-19 ─ M-16 ─ M-17 ─ M-18  ← HITO 1
                                   │
                                 M-20 ─ M-21 ─ M-22  ← HITO 2
                                   │
                                 M-23  ← HITO 6
```

Se pueden trabajar en paralelo, sin pisarse: (M-03, M-06, M-09, M-13),
(M-04, M-05), (M-11, M-12), (M-16, M-19), (M-17, M-18).

**M-19 va antes que M-17.** No es una preferencia de orden: es la mitigación del
riesgo principal del proyecto.

---

## Anexo A · Catálogo de encrucijadas

Dieciséis plantillas, dos por categoría. Los textos van en inglés porque son
contenido; los comentarios en español porque son diseño.

Formato: identificador, condiciones, reparto, texto, y de cada opción el verbo,
el precio visible, los efectos, el cambio en pantalla y las semillas.

---

### A.1 `winter_grain_debt` · lord

**Peso** 10 · **Reposo** 30 años · **Máx.** 2
**Requiere** `season = winter`, `grainYears < 0.25`, `flag vassal` sin poner
**Reparto** `A = leader`

> **The Lord's Grain**
> Year {year}. The granary is bare and the frost has not broken. Riders from
> Wealdmere wait at the ford with three carts of rye. Their captain will not
> unload them until {A} kneels.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Kneel** | The valley is no longer its own | `grain +900`, `flag vassal 0`, `morale −12` | `banner` gris sobre el núcleo, permanente | `tithe_due`, 8–14 años: `grain −450`, `morale −6` |
| **Refuse** | People will die this winter | `morale +10`, `flag proud 20` | `gather square 3` | `wealdmere_remembers`, 12–25 años: si `flag proud`, `threatened` durante 5 años |
| **Take it at night** | If you are caught, they come armed | `grain +600`, `faith −15`, `memory A stole 4` | `scar felled_wood` | `the_reckoning`, 3–9 años, 55 % de que dispare: `kill random fraction 0.15`, `destroy palisade 3` |

*Nota de diseño: es la plantilla insignia, la que aparece en `valle.md` §3. Las
tres opciones son malas de formas distintas y ninguna resuelve el invierno del
todo.*

---

### A.2 `tithe_demand` · lord

**Peso** 6 · **Reposo** 20 años
**Requiere** `flag vassal` puesto, `season = autumn`, `year > 5`
**Reparto** `A = reeve`, `B = leader`

> **The Reeve's Ledger**
> The lord's man has counted the sheaves twice and written down a number
> {A} says is wrong.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Pay in full** | A quarter of the harvest | `grain −25 %`, `morale −5` | `gather square 2` | — |
| **Pay short** | They will count again next year | `grain −12 %`, `flag watched 10` | `banner` gris parpadeante 2 años | `double_tithe`, 1–3 años: `grain −30 %` si `flag watched` |
| **Send him away** | Wealdmere does not forget | `morale +12`, `flag threatened 6` | `douse` de la fragua 1 año | `punitive_raid`, 2–5 años: `kill random fraction 0.12`, `destroy house 2` |

---

### A.3 `hungry_spring` · famine

**Peso** 12 · **Reposo** 12 años
**Requiere** `season = spring`, `grainYears < 0.35`
**Reparto** `A = reeve`, `B = midwife`

> **Seed or Bread**
> There is grain enough to sow the fields, or grain enough to eat until
> midsummer. {A} has counted it, and {B} has counted the children.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Sow it** | A hungry summer | `severity` forzada a 0.5 durante 8 semanas, `morale −8` | `scar burnt_field` invertido: los campos aparecen sembrados de inmediato | — |
| **Eat it** | A thin harvest | `grain +300`, cosecha del año ×0.55 | `douse` del molino 1 año | `lean_autumn`, 1 año: entrada de crónica que enlaza la decisión |
| **Half and half** | Both, and neither enough | `grain +140`, cosecha ×0.78, `morale −4` | `gather square 1` | — |

---

### A.4 `granary_theft` · famine

**Peso** 7 · **Reposo** 18 años
**Requiere** `grainYears < 0.5`, `has granary`, `grudge min 40`
**Reparto** `A = anyNamed`, `B = grudgeAgainst A`

> **The Broken Latch**
> Someone has been at the granary in the night. {B} says it was {A}.
> {A} says nothing at all.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Believe {B}** | {A} is cast out | `role A null`, `people −1`, `morale −6`, `opinion` del resto hacia B −10 | `gather square 2` | `exile_returns`, 10–20 años, 40 %: `arrive 3`, `flag threatened 4` |
| **Believe {A}** | {B} will not forget | `opinion B→A −45`, `memory B was_blamed 5` | `douse` del taller de B 2 años | `the_feud`, 2–8 años: dispara `smith_feud` con prioridad |
| **Hang a new latch and say nothing** | Everyone stays, and everyone knows | `morale −10`, `faith −5` | `raise` de un `palisade` junto al granero | `rot_within`, 5–15 años: `morale −15`, `flag hostile 6` |

---

### A.5 `plague_pit` · plague

**Peso** 14 · **Reposo** 25 años
**Requiere** `outbreak active`, `people > 12`
**Reparto** `A = priest`, `B = herbalist` (si no hay, `anyNamed`)

> **Where the Dead Go**
> Nine dead in eleven days. The churchyard is small and the ground is hard.
> {A} wants them blessed one by one. {B} wants a pit and lime, dug today.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Bless them** | The sickness has more days to work | `faith +18`, `morale +6`, brote +3 semanas | `build grave_yard free` | — |
| **The pit** | No one will forget who chose it | `faith −20`, brote −3 semanas, `opinion A→leader −40` | `scar grave_row` | `unquiet_ground`, 6–18 años: `faith −10`, `morale −8`, plantilla `unconsecrated` habilitada |
| **Burn the houses of the dead** | Roofs for ash | `destroy house 2`, brote −4 semanas, `morale −14` | `ruin house` ×2 | `the_burnt_row`, 3–10 años: las ruinas no se reconstruyen; entrada de crónica |

---

### A.6 `plague_blame` · plague

**Peso** 8 · **Reposo** 30 años
**Requiere** `outbreak active`, `faith > 55`, `trait priest devout`
**Reparto** `A = priest`, `B = anyNamed excluding [A]`

> **A Reason for It**
> {A} has preached three days that the sickness is a judgement, and by the
> third day the village had decided whose.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Give them {B}** | You will not get {B} back | `kill B 1`, `faith +25`, `morale +8`, `opinion` de los parientes de B hacia A −60 | `gather chapel 3` | `blood_debt`, 8–20 años: un hijo de B, si vive, `memory was_blamed 5` y dispara `feud_inherited` |
| **Silence {A}** | The village keeps its priest and loses its faith | `faith −30`, `role A null`, `morale −5` | `douse` de la capilla 3 años | `no_shepherd`, 4–10 años: `faith −15` si sigue sin cura |
| **Say nothing** | It will find its own end | `morale −12`, `faith −8`, brote +2 semanas | `gather square 4` | `whispers`, 5–12 años: `grudge` nuevo entre dos nombrados al azar |

---

### A.7 `smith_feud` · feud

**Peso** 9 · **Reposo** 15 años
**Requiere** `grudge min 55`, `people > 20`
**Reparto** `A = anyNamed`, `B = grudgeAgainst A`

> **The Anvil and the Altar**
> It has been building for years. This morning {A} put a hand on {B} in front
> of the whole village, and now both are waiting to see what you do.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Side with {A}** | {B} withdraws | `opinion B→A −30`, `lit` del edificio de B apagado 4 años, obra −15 % 4 años | `douse` del edificio de B | `the_withdrawn`, 6–14 años: B se marcha con 2 personas, o muere amargado |
| **Side with {B}** | {A} withdraws | Simétrico | `douse` del edificio de A | Simétrico |
| **Make them build something together** | Neither forgives you, but the wall goes up | `build palisade free` ×4, `morale +8`, ambas opiniones +15 | `raise palisade` | `uneasy_truce`, 10–25 años, 50 %: el rencor vuelve peor, `opinion −70` |

---

### A.8 `feud_inherited` · feud

**Peso** 5 · **Reposo** 20 años · **Año mínimo** 25
**Requiere** existe un nombrado con `memory kind = was_blamed` heredada
**Reparto** `A = anyNamed`, `B = childOf A`

> **What the Father Left**
> {B} was four years old when it happened and has never spoken of it.
> {B} is not four years old now.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Let it be settled** | One of them will not see the winter | `kill B 1` con 50 % / `kill A 1` con 50 %, `morale −10`, `faith −6` | `scar grave_row` | — |
| **Send {B} away** | The valley loses a pair of hands and a name | `people −1`, `role B null`, `morale −4` | `gather ford 2` | `the_returned`, 15–30 años, 35 %: vuelve con gente y con una demanda |
| **Give {B} the smithy** | {A} watches it happen | `role B smith`, `opinion A→B −50`, `morale +6` | `lit` de la fragua encendido | `two_smiths`, 5–12 años: dispara `smith_feud` con peso ×3 |

---

### A.9 `chapel_or_granary` · faith

**Peso** 8 · **Reposo** 40 años · **Máx.** 1
**Requiere** `people ≥ 30`, `not has chapel`, `wood > 200`, `faith > 45`
**Reparto** `A = priest` (o `anyNamed` si no hay)

> **Timber Enough for One**
> There is standing timber for one great work and the season for it. {A} has
> been drawing a chapel in the dirt for two years. The reeve has been drawing
> a granary.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **The chapel** | The next lean year will be leaner | `build chapel free`, `faith +20`, `morale +10` | `raise chapel` | `the_faithful_valley`, 15–30 años: si `faith > 70`, `arrive 4` peregrinos |
| **The granary** | {A} will remember which you chose | `build granary free`, `opinion A→leader −35`, `faith −10` | `raise granary` | `a_priest_without_a_roof`, 8–16 años: `role priest null`, `faith −15` |

---

### A.10 `relic_pedlar` · faith

**Peso** 6 · **Reposo** 25 años
**Requiere** `has chapel`, `faith` entre 30 y 70, `grainYears > 0.6`
**Reparto** `A = priest`, `B = leader`

> **A Bone in a Box**
> A man came up the ford road with a box and a story. He says it is the
> finger of a saint. {A} believes him. {B} has counted the price in grain.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Buy it** | Six weeks of bread | `grain −6 × people`, `faith +25`, `morale +8` | `raise` de un `palisade` decorativo junto a la capilla + `gather chapel 4` | `the_relic_works`, 10–25 años, 50 %: `faith +15`, `arrive 3`; si no, `faith −25` y la crónica lo llama fraude |
| **Send him on** | {A} will preach about it for a year | `faith −8`, `opinion A→B −20` | `gather ford 1` | — |
| **Take the box and pay nothing** | He will tell the road what happened here | `faith +10`, `flag hostile 8`, `morale −6` | `banner` rojo 2 años | `no_one_comes`, 3–8 años: sin llegadas mientras dure `hostile` |

---

### A.11 `forest_cut` · forest

**Peso** 9 · **Reposo** 15 años
**Requiere** `forestLeft > 0.3`, `neededFields > fields`, `people > 25`
**Reparto** `A = woodward`

> **The Old Wood**
> The fields will not feed another winter's worth of children. The nearest
> flat ground is under three hundred years of oak. {A} has walked it twice
> and come back with nothing to say.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Fell it** | The wood does not come back in your lifetime | `build field free` ×2, `wood +900`, `faith −10` | `scar felled_wood` + `raise field` | `bare_slopes`, 20–40 años: `flag flood_prone 0`; el clima ruinoso pasa a ser un 5 % más probable |
| **Take only the edge** | Slower, and the children are hungry now | `build field free` ×1, `wood +300` | `raise field` | — |
| **Leave it standing** | {A} sleeps well; nobody else does | `morale −8`, `faith +12`, `opinion A→leader +40` | `gather ford 2` | `the_wood_holds`, 15–35 años: si `forestLeft > 0.5`, `arrive 3` y `morale +10` |

---

### A.12 `wolf_winter` · forest

**Peso** 7 · **Reposo** 12 años
**Requiere** `season = winter`, `forestLeft > 0.25`, `people > 15`
**Reparto** `A = woodward`, `B = youngestNamed`

> **Tracks at the Palisade**
> Three nights running. On the third, they took something. {A} says it will
> be a child next.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Hunt them** | Men in the wood in February | `kill random 1` con 35 %, `morale +12`, `wood +120` | `gather ford 3` | — |
| **Build up the palisade** | Timber that was meant for a house | `build palisade free` ×6, `wood −180`, `morale +5` | `raise palisade` | — |
| **Keep everyone inside** | Nothing gets done for a month | Obra ×0.4 durante 6 semanas, `wood −60`, `morale −8` | `douse` general: ninguna figura sale de casa 6 ticks | `the_long_indoors`, 1 año: `morale −6` |

---

### A.13 `strangers_at_the_ford` · stranger

**Peso** 10 · **Reposo** 10 años
**Requiere** `people ≥ 12`, `housingFree ≥ 2`, `not flag hostile`
**Reparto** `A = leader`, `B = reeve`

> **Nine at the Ford**
> Nine of them, with a cart and no oxen. They say their village is ash and
> will not say who burned it. {B} has counted the grain twice.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Take them in** | Nine more mouths before the harvest | `arrive 9`, `grain −40`, `morale +6` | `gather ford 4` | `whoever_burned_it`, 3–10 años, 40 %: `flag threatened 3`, `kill random fraction 0.10` |
| **Feed them and send them on** | It costs less and it costs something | `grain −60`, `faith +10`, `morale −3` | `gather ford 2` | — |
| **Turn them away** | The road will hear of it | `flag hostile 10`, `faith −18`, `morale −8` | `banner` rojo 3 años | `no_one_comes`, 1 año: sin llegadas mientras dure `hostile` |

---

### A.14 `bandits` · stranger

**Peso** 8 · **Reposo** 18 años
**Requiere** `people > 30`, `not has palisade`, `year > 15`
**Reparto** `A = leader`, `B = smith`

> **Six Men and a Horse**
> They came out of the north wood at noon so that everyone would see them.
> They want a third of the granary and they will be back in the spring.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Pay them** | And every spring after | `grain −33 %`, `morale −10` | `gather square 2` | `the_spring_visit`, 1–2 años, se repite: `grain −25 %` hasta que haya empalizada |
| **Fight them** | {B} leads it | `kill random fraction 0.10`, `morale +18`, `wood +80`, 25 % de `kill B 1` | `scar grave_row` | `a_name_in_the_valley`, 5–15 años: `morale +10`, plantillas de `lord` con peso ×0.5 |
| **Wall the village first** | They take the harvest while you dig | `build palisade free` ×10, `grain −20 %` | `raise palisade` | — |

---

### A.15 `succession` · succession

**Peso** 100 · **Reposo** 0 · **Salta el intervalo mínimo**
**Requiere** `not role leader alive`
**Reparto** `A = anyNamed`, `B = anyNamed excluding [A]`

> **Who Speaks Now**
> {leaderName} is buried. Two people in this valley expect to be asked, and
> only one of them is going to be.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **{A}** | {B} will remember it | `role A leader`, `opinion B→A −45`, `memory B was_passed_over 4` | `gather square 3` | `the_passed_over`, 5–20 años: si `opinion B→A < −60`, dispara `smith_feud` |
| **{B}** | {A} will remember it | Simétrico | `gather square 3` | Simétrico |
| **No one** | The valley decides things by shouting for a while | `morale −12`, `faith −6`, obra ×0.8 durante 2 años | `douse` general 1 año | `the_leaderless_years`, 2–4 años: se vuelve a disparar `succession` |

*Nota de diseño: es la única plantilla que ignora el intervalo mínimo, y el
latido del bucle largo. Cada generación el jugador reparte una herencia y crea
un rencor.*

---

### A.16 `first_stone` · succession

**Peso** 6 · **Reposo** 50 años · **Máx.** 1
**Requiere** `people ≥ 45`, `has smithy`, `year > 40`, sin sitio libre en el mapa
**Reparto** `A = leader`, `B = smith`

> **The First Stone**
> There is nowhere left to build outward. {B} says the quarry on the east
> slope will give stone for a wall, or for houses, and that {A} will not live
> to see both finished.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **The wall** | Cold houses for a generation | Habilita `wall`, obra de mejora ×1.5 en muro, `morale +6` | `raise wall` | `behind_the_wall`, 20–40 años: plantillas de `lord` y `stranger` con peso ×0.4 |
| **The houses** | The valley is rich and open | Habilita `stone_house`, incendios ×0.3, `morale +12` | `raise stone_house` | `worth_taking`, 15–30 años: `flag threatened 8` |

---

### A.17 `quiet_years` · reserva

Plantilla de reserva para la garantía por generación cuando no hay ninguna otra
elegible. Requiere solo `grainYears > 1.0`. Ofrece dos usos de un excedente
(una obra libre o una temporada de fiesta con `morale +20`), y **no planta
semillas**. Existe para que la garantía nunca falle, no para ser interesante.

---

## Anexo B · Bancos de contenido

### B.1 Nombres

Anglosajones, tomados de registros medievales ingleses. Cada banco tiene 60
entradas; aquí se listan las 24 primeras de cada uno y el módulo M-03 completa
el resto siguiendo el mismo criterio.

**Masculinos.** Aelric, Osric, Cuthbert, Godwin, Leofric, Wulfstan, Eadric,
Beorn, Alfwine, Tostig, Hereward, Sigeric, Baldwin, Oswy, Athelstan, Ceolwulf,
Dunstan, Edmund, Frithuric, Gyrth, Hakon, Ingeld, Merewald, Penda.

**Femeninos.** Mildreth, Aelfgifu, Edith, Godgifu, Hild, Leofwynn, Osgyth,
Sunngifu, Wulfrun, Cwenburh, Eadgyth, Frideswide, Aethelflaed, Beorhtgifu,
Cynethryth, Ealdgyth, Hereswith, Ingrith, Merewenna, Osburh, Saethryth,
Tathwyn, Wilburh, Ymma.

**Topónimos.** El señor feudal es **Wealdmere**. Otros: Ashford, Netherby,
Longmoor, Crowhurst, Stanbeck, Thornleigh, Fenwick, Ravensden. La aldea del
jugador no tiene nombre: es «the valley», y eso está buscado.

### B.2 Banco de textos — muestra

Estructura de `bank.en.ts`. El módulo M-09 lo completa: **toda clave usada por
el catálogo o por los eventos debe tener entre 3 y 5 variantes.**

```ts
export const BANK: Record<string, string[]> = {
  'founding': [
    'Twenty came over the ridge and stopped where the river bends. Year one.',
    'They stopped here because the water was clean and no one owned it. Year one.',
    'Nobody wrote down why they stopped. Year one.',
  ],
  'death.old': [
    '{name} died in the {season} of year {year}, {age} winters old.',
    'Age took {name} that {season}. {age} winters.',
    '{name} did not see another {season}. {age} winters, and no debts.',
  ],
  'death.hunger': [
    '{name} went in the {season}. There had been no bread for eleven days.',
    'Hunger took {name}, {age} winters old.',
    '{name} gave their share to the children twice, and then did not need it.',
  ],
  'death.plague': [
    'The sickness took {name} on the fourth day.',
    '{name} was well on the Sunday and buried on the Thursday.',
    '{name}, {age} winters. The pit took eleven that week.',
  ],
  'harvest.poor': [
    'The harvest came in thin. {grain} bushels for {people} mouths.',
    'A poor autumn. {grain} bushels; the village is {people}.',
    'They got {grain} bushels out of the ground and counted them twice.',
  ],
  'harvest.abundant': [
    'The best harvest anyone could remember. {grain} bushels.',
    '{grain} bushels, and the granary would not hold it all.',
    'A fat autumn. {grain} bushels, and bread every day until Christmas.',
  ],
  'built.house': [
    'A house went up on the north side. {people} now live in the valley.',
    'They raised a roof this summer. The village is {people}.',
    'One more house, one more chimney.',
  ],
  'grudge.formed': [
    '{a} and {b} have not spoken since the {season}.',
    'Whatever was between {a} and {b}, it is not going to mend.',
    '{a} stopped going to {b}\'s door in year {year}.',
  ],
  'crossroad.taken': [
    'In year {year}, {leader} chose: {choice}.',
    'Year {year}. It was decided. {choice}.',
    '{leader} gave the word in year {year}. {choice}.',
  ],
  'consequence': [
    '{delay} years after {origin}, {what}',
    'It took {delay} years. {what}',
    'Nobody had thought about {origin} in {delay} years. {what}',
  ],
  'extinction': [
    'The last of them was {name}, {age} winters old, in year {year}.',
    '{name} was the last. Year {year}. Nobody came up the ford road after that.',
    'Year {year}. The valley kept the walls for a while and then it did not.',
  ],
};
```

### B.3 Prohibiciones en el banco

Verificadas por test (§14.1):

- Ningún signo de exclamación.
- Ninguna segunda persona (` you `, ` your `).
- Ninguna valoración de la decisión del jugador: nada de *wisely*, *foolishly*,
  *at last*, *thankfully*.
- Ninguna metáfora. La crónica cuenta lo que pasó, con nombres y cifras.

---

## Anexo C · Glosario

| Término | Significado |
|---|---|
| **Tick** | Una semana de simulación. La unidad atómica del motor. |
| **Nombrado** | Aldeano con nombre, rasgos, memoria y opiniones. Máximo 8. |
| **Encrucijada** | Decisión del jugador, generada por plantilla. Su único verbo. |
| **Semilla (consecuencia)** | Efecto diferido plantado por una opción. No confundir con la semilla del generador. |
| **Bandera (`flag`)** | Estado con caducidad que condiciona plantillas. No se muestra al jugador. |
| **Reparto (`cast`)** | Vinculación de letras (`A`, `B`) a aldeanos concretos. |
| **Reserva de obras** | 15 % de la mano de obra siempre dedicada a construir. |
| **Letargo** | Estado de la aldea mientras el jugador no está. Máximo 4 h de tiempo simulado. |
| **Severidad** | Fracción de la demanda de grano no cubierta esta semana. 0–1. |
| **Hoja de contacto** | PNG que junta las capturas automáticas de todas las estaciones y años. |

---

*Fin del documento. Toda modificación a este fichero exige actualizar la tabla
de decisiones de §1 y avisar a los módulos afectados.*
