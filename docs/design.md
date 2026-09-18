# The Valley — Documento de diseño detallado

**v3.66 · 15 de septiembre de 2026 (Europe/Madrid) · Sucede a `valle.md` (v1)**

Simulación idle de una aldea medieval para móvil.

**Fuente única.** El diseño vigente vive únicamente en `docs/design.md`, y su
historial en `docs/changelog.md`. No hay una segunda copia: hubo una
(`docs/the-valley-design.md`, para recibir propuestas de un agente externo) y
llevaba meses sin existir mientras este párrafo seguía mandando trabajar contra
ella. **Dos copias de una especificación divergen**, y esa trampa ya está
pagada; si alguna vez vuelve a hacer falta una, se sincroniza reemplazando y
nunca parcheando, y siempre construyendo sobre la copia del repositorio.

> **Qué es este documento.** `valle.md` decide *qué* juego es. Este decide *cómo*
> se construye, con el detalle necesario para que varios agentes trabajen en
> paralelo sin consultarse entre ellos. Todo lo que aquí se afirma es
> vinculante; lo que no aparece, se decide en el módulo correspondiente y se
> documenta ahí.

---

## Registro de cambios

**Vive en `docs/changelog.md`.** Ochenta y cuatro revisiones, cada una con qué
cambió y por qué. Estaba aquí, por delante del §0, y eran tres mil líneas entre
quien abría el documento y la primera regla vigente.

Toda revisión nueva se apunta allí, y la regla no cambia: **el motivo es la
mitad de la entrada**, porque es lo que impide que alguien revierta una decisión
dentro de seis meses creyendo que arregla algo.

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
| Evolución gráfica | **3D estilizado con cámara ortográfica, y es el juego** desde G-12 (14 sep 2026); Anexo D | Se validó por rondas —belleza, animación, legibilidad— conservando motor y guardados. El coste móvil sigue **sin medir en un dispositivo real**, y el riesgo se aceptó por escrito al migrar (`docs/roadmap.md`) |
| Render 2D | **Se queda como puerta de vuelta**, en `?render=canvas` | **La condición que justificaba esta fila ya se cumplió** (UI-R0, 16 sep 2026): el dueño del diseño abrió el juego en su iPad y su iPhone el 15 sep y funciona. Lo que sigue sin existir es una medida de fotogramas en dispositivo, así que la puerta se queda **por si acaso y no porque haga falta**, y borrarla dejó de ser un paso bloqueado: es una decisión suya cuando quiera tomarla |
| Vida del valle | Una capa de agentes deterministas y efímera entre motor y render; Anexo E | El render dibujaba una fórmula del tiempo y por eso nadie podía chocar, perseguir ni encontrarse; una capa que simula cuerpos con paso fijo lo da, sin escribir en el motor ni romper partidas |
| Producción de arte | Fuentes reproducibles, Blender por scripts y revisión en el navegador | Permitir iteración y revisión remotas sin depender de operaciones manuales en el escritorio |
| Idioma del contenido | Inglés (crónica, UI, nombres, topónimos) | Decisión de producto |
| Idioma del código | Inglés en los identificadores y los ficheros; **español en los comentarios** (§2.2, ratificado en v3.66) | Los identificadores son convención estándar. Los comentarios de este código explican *por qué* —qué se midió, qué salió peor— y eso se piensa en el idioma en que se piensa el juego |
| Idioma de la documentación | Español | Es donde se piensa el juego |
| Ambientación | Medieval inglés | Nombres anglosajones, señor de Wealdmere |
| Derrota | **Solo población cero** | Nunca se pierde por no abrir la app |
| Presentación de datos | **Diegética primero** | El valle es el HUD; cifras solo al tocar |
| Unidad de simulación | **La semana** | 48 semanas/año; barato de simular siglos |
| Persistencia | IndexedDB, snapshot + registro de decisiones | Determinismo verificable |
| Escala del mapa | **72 × 112**, con corazón productivo de 36 × 56 | v3.68: el valle es el centro de algo más amplio, y la economía sólo mide el corazón (§7) |
| Catálogo inicial | 16 plantillas de encrucijada | Suficiente para validar el hito 0 |
| Fuente de letalidad | **La acumulación de lo que el jugador metió** (M-1, 17 sep 2026); antes: «las encrucijadas, no el mundo» | El jugador sigue siendo el cuello de botella, y ahora también por lo que **tiene**: más ganado, más lobos; más bosque talado, más riada; más grano y más plata, más ladrones y más señor |

**La última merece explicación, y cambió el 17 sep 2026.**

Decía «las encrucijadas, no el mundo», y el razonamiento era correcto: si el
mundo matara solo, el jugador sería un espectador. La simulación base, jugada
sin decisiones, era poco mortal a propósito —3 % de extinción en 200 años—, y lo
que podía destruir la aldea eran las consecuencias de lo que el jugador elegía:
matanzas, graneros perdidos antes del invierno, la reputación que corta la
llegada de forasteros.

**Lo que M-1 cambia es de dónde sale esa consecuencia, no que tenga que
haberla.** Con el juego de los medios el jugador mete cosas en el valle
(`docs/plan-medios.md`), y lo que mete **es** lo que el mundo puede romper:
lobos contra el corral que compró, riada contra el bosque que taló, ladrones y
señor contra el grano y la plata que juntó. El mundo sigue sin matar por su
cuenta —una aldea intocada muere lo que moría, medido— y el jugador sigue siendo
el cuello de botella; lo que se acaba es que prosperar fuera gratis.

**Y dos cosas que no se negocian**, las dos por decisión del dueño del diseño
del 17 sep 2026 («que caiga un rayo en una casa y eso ya se muera no tiene
gracia; se puede morir, pero más adelante, porque ya hemos tomado varias
decisiones que hacen que se tumbe»):

- **Un rayo destruye una casa, nunca la última.** Con un solo techo en pie cae
  en otra cosa, y si no hay otra cosa cae y no se lleva nada: se ve, se cuenta y
  no acaba la partida.
- **La gracia de la pareja.** Mientras la aldea tenga menos de `FATE.GRACE_PEOPLE`
  o menos de `FATE.GRACE_YEARS` años, lo que destruye pesa una cuarta parte. No
  es una puerta —el rayo puede caer, que es lo que §2.6 del rework decidió— es
  que una aldea que no ha tomado ninguna decisión todavía no tiene nada que se
  le pueda volver en contra.

La sección 12.9 fija los objetivos de mortalidad que la suite de balance
verifica, y está **por remedir** desde R-1 (`docs/rework.md` §5).

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
│   ├── derive/                 # lo que el estado dice, antes de pintarlo.
│   │                           #   Funciones puras de GameState que leen los
│   │                           #   DOS renders: paleta, animales, ánimos,
│   │                           #   señales, encuentros, reuniones. Ni una
│   │                           #   línea dibuja. Ver src/derive/README.md.
│   ├── render3d/               # WebGL con Three.js. **Es el juego** (G-12).
│   │   ├── life/               #   Anexo E: la capa de vida, agentes a paso
│   │   │                       #   fijo. Ni escribe en GameState ni se guarda.
│   │   ├── world/              #   suelo, edificios, reparto, relieve
│   │   ├── effects/            #   luz del día, fauna, señales, nubes
│   │   └── clips.ts            #   los cuatro clips del aldeano (G-04)
│   ├── render/                 # Canvas 2D. La puerta de vuelta, `?render=canvas`.
│   ├── ui/                     # DOM, pantallas, controles
│   └── cli/                    # runner de consola (hito 0)
├── tests/
│   ├── fast/                   # segundos — menos de 20 s, es la puerta
│   ├── journeys/               # jornadas y siglos en varias semillas, minutos
│   └── balance/                # siglos en sesenta semillas, se lanza aparte
├── tools/                      # capturas Playwright, arte, bancos, sondas
└── public/
```

### 2.2 Nomenclatura

**El idioma del código, ratificado** (v3.66). §1 dice «idioma del código:
inglés» y siempre se leyó como que también los comentarios. Medido al auditar:
**137 de 139 ficheros de `src/` tienen los comentarios en español.** No es
descuido, es lo que el proyecto ha hecho durante cuarenta y siete revisiones, y
por una razón que se sostiene: los comentarios de este código no explican qué
hace una línea, explican **por qué** —qué se midió, qué se probó y salió peor,
qué trampa costó una tarde— y eso se piensa en el idioma en que se piensa el
juego. Reescribir 137 ficheros para cumplir la letra de una regla que nadie ha
seguido nunca sería el peor cambio posible: mucho ruido y ni una idea mejor
explicada. Así que la regla se corrige para decir la verdad:

| Qué | Idioma |
|---|---|
| Identificadores, tipos, nombres de fichero | **Inglés** |
| Comentarios y documentación en el código | **Español** |
| Todo lo que lee el jugador | **Inglés**, y sale del banco |

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
- `import` desde `src/render/`, `src/render3d/`, `src/derive/` o `src/ui/`.
  La flecha va en un solo sentido, y ESLint lo verifica además del test.

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
  readonly terrainSeed: number;    // persiste entre partidas del mismo valle
  tick: number;                    // semanas desde la fundación
  peakPeople: number;              // máximo al cierre de un tick
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
  diedTick: number | null;   // causeOfDeath ∈ natural | old_age | hunger |
                             //   cold | plague | fire | violence
  causeOfDeath: DeathCause | null;
  leftTick: number | null;  // se marchó del valle (§5.7); no está muerto
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

**Por qué `leftTick` y no una causa de muerte.** Los que se marchan por §5.7 no
están muertos, y tampoco se pueden borrar del array. Un `diedTick` con una causa
«se fue» haría que la crónica mintiera al citarlos cuarenta años después. Están
vivos, en otra parte; la aldea simplemente ya no los cuenta. Vivo y presente es
`diedTick === null && leftTick === null`.

**Por qué el rencor se almacena y no se deriva.** Un rencor podría leerse de
`opinions` mirando quién está por debajo de −50, pero eso pierde las dos cosas
que lo hacen contable: la causa y el tick en que se formó, que son justo lo que
citan las plantillas de disputa (§8.2 `{k:'grudge'}`, §8.3 `grudgeAgainst`).
`grudges` es **append-only**, con la misma disciplina que `villagers`: un rencor
nunca se borra. Cuando la opinión sube por encima de −20 se le pone
`healedTick`, y ahí queda — la aldea recuerda que un día se odiaron.

### 3.5 El valle

```ts
export type Terrain = 'meadow' | 'forest' | 'water' | 'rock' | 'marsh' | 'cleared'
  | 'mountain' | 'lake' | 'ford';

/** Contrato de serialización. Vive en `state.ts`, NO en `balance.ts`: no es una
 *  perilla. Los bytes de toda partida guardada dependen de estos valores y el
 *  orden no se puede cambiar nunca. */
export const TERRAIN_CODE = {
  meadow: 0, forest: 1, water: 2, rock: 3, marsh: 4, cleared: 5,
  // v3.68, el mapa grande: el cinturón que cierra el valle, el lago de la falda
  // y el paso por donde se cruza el río. Un terreno nuevo coge el siguiente
  // número libre; ninguno de los anteriores se mueve nunca.
  mountain: 6, lake: 7, ford: 8,
} as const;

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
  condition: Condition | null;   // si falla al vencer, la semilla se marchita
  firedTick: number | null;      // append-only: las semillas no se borran
  witheredTick: number | null;   //   nunca, igual que villagers y grudges
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

**Esta tabla decía 15 s por semana hasta el 16 sep 2026 y llevaba desde v3.72
sin ser verdad.** Lo destapó el cuaderno de referencia visual
(`docs/visual-reference` §1) al cotejarla con `balance.ts`. Los números de
abajo son los de `TIME` (§12.1), que es la fuente:

| Unidad | Equivale a | Tiempo real a ×1 |
|---|---|---|
| Tick | 1 semana | **14 min** (840 000 ms) |
| Estación | 12 ticks | 2 h 48 min |
| Año | 48 ticks | 11 h 12 min |
| Generación | 20 años = 960 ticks | 9 días y pico |
| Ventana de letargo | 960 ticks | la misma generación |

Velocidades disponibles: **pausa, ×1, ×4, ×16, ×64** (`TIME.SPEEDS`). A ×64 una
semana son trece segundos y un año diez minutos y medio, y **lo que antes pasaba
a ×1 pasa ahora a ×64**: cualquier medida en minutos escrita antes de v3.72 está
en la escala vieja.

El render tiene su propio reloj cosmético, y desde v3.72 **está atado a éste y
no suelto**: una semana son **siete jornadas de sol** de ciento veinte segundos
escénicos cada una (`SCENIC_DAY_SECONDS`), y la identidad
`REAL_MS_PER_TICK = DAYS_PER_WEEK · SCENIC_DAY_SECONDS` la vigila
`tests/fast/clock.test.ts`. Romperla devuelve el juego a ocho amaneceres por
semana, que es lo que había antes del reloj con horas. El motor sigue sin saber
que ese reloj existe: lo lee la presentación, no al contrario.

### 4.2 Orden de resolución del tick

**Este orden es normativo.** Cambiarlo cambia el balance y rompe el determinismo
de las partidas guardadas.

```
tick(state, decision?) :
   1.  ADVANCE      tick += 1; recalcular reloj
   2.  ANNUAL       si week == 0:  tirar clima del año, comprobar peste,
                    comprobar incendio, migración de primavera, envejecer a todos
  2b.  FATE         rollFate(state): una tirada del flujo `fate` contra la tabla
                    de sucesos de §7.10; si sale uno, ya está aplicado, se guarda
                    en state.happenings y su línea va al búfer de crónica
   3.  DECISION     si hay decision del jugador, aplicar la opción elegida
                    (efectos inmediatos + plantar semillas)
   4.  SEEDS        disparar las semillas cuyo firesAtTick <= tick
   5.  LABOUR       repartir la mano de obra; producir madera y puntos de obra
   6.  WORKS        avanzar obras; completar las que llegan a su coste
   7.  CONSUME      restar grano; calcular severidad de hambre; muertes por hambre
   8.  WINTER       si es invierno, restar leña; marcar frío si falta
   9.  HARVEST      si week == 35, resolver la cosecha
  10.  STORAGE      aplicar merma sobre el excedente
  11.  DEATHS       mortalidad por edad, con multiplicadores
  12.  MOOD         actualizar ánimo y fe
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
- El paso **2b** (R-1, v3.75) va después del bloque anual y antes de la
  decisión a propósito: un suceso es del mundo, no del jugador, y lo que el
  jugador decide esa semana se decide **con el suceso ya encima** (una casa
  quemada por el rayo cuenta para las condiciones del catálogo del paso 15).
  Va después del anual para que el incendio de §5.9 y el rayo no se pisen: si
  la semana 0 ya hubo incendio, el rayo sólo tiene lo que quede en pie.
- El paso 16 no calcula nada. Los pasos anteriores empujan eventos a un búfer y
  este los vuelca. Ningún sistema escribe texto.
- El búfer incluye las entradas que generan las APIs de resolución de M-07:
  M-10 captura esas entradas antes del volcado. El informe semanal incluye las
  muertes de decisiones, semillas, hambre y mortalidad demográfica; MOOD cuenta
  todas una sola vez, y §9.4 se aplica a los nombrados cualquiera que sea la causa.

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

La lista de arriba es la de M-01; desde entonces han entrado `minds` (el
carácter, v3.61) y **`fate`** (los sucesos del valle, R-1, v3.75), siempre **al
final** de `RNG_STREAMS`, que es lo que hace que un flujo nuevo no mueva ni una
tirada de los anteriores (lo guarda el dorado de `tests/fast/rng.test.ts`).

**Test de determinismo (obligatorio, suite rápida):** dos partidas con la misma
semilla y la misma lista de decisiones producen estados idénticos byte a byte
tras 5 000 ticks.

Ambas ejecuciones deben **alcanzar** el tick 5 000: una extinción anterior no
verifica ese horizonte. Se reproduce el registro de decisiones y se compara el
hash de todo el estado serializado, no una selección de campos. En la prueba de
aislamiento se excluye únicamente el flujo `chronicle` intervenido; se compara
el resto del estado completo tras continuar la simulación.

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

**Tripulación mínima.** Un campo con menos de `MIN_FIELD_CREW` adultos **no
rinde nada**: no se puede arar, sembrar y segar entre dos personas. Un campo por
debajo del mínimo no cuenta en `workedFields`.

Sin esta regla, una aldea diminuta es **más** segura en comida que una grande:
dos supervivientes cosechan trescientas fanegas y consumen noventa y seis al
año, y el valle sobrevive con dos habitantes durante cuarenta años sin morirse ni
recuperarse. Eso ya se vio en la primera lectura del hito 0 —treinta y ocho años
de *«The harvest came in heavy. 195 bushels»* para dos bocas— y no es un final:
es una línea plana. Con el mínimo, una aldea que baja de tres o cuatro adultos
deja de comer y muere en un año, que es lo que `valle.md` §4 llama extinguirse.

Cuatro decisiones dentro de esa fórmula merecen defensa:

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
// el bono de ánimo por la cosecha lo aplica el paso MOOD (§5.5), no este.
// Un solo escritor del ánimo, o el ánimo se bifurca.
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

**Cuestión abierta — el tope de la madera.** El grano tiene capacidad y merma;
la madera no tiene ni una cosa ni la otra, así que una aldea sin obras acumula
sin límite. Con los edificios congelados se llega a 5 000 en veinte años. **No se
decide aquí**: hasta M-14 no hay en qué gastarla y hasta M-15 el bosque no
limita la producción. El criterio para decidirlo, después de M-14: si la reserva
acumulada permite levantar más de tres edificios seguidos sin esperar a los
leñadores, la madera necesita tope y merma como el grano; si no, se queda como
está. Ponerle tope antes de saberlo es arriesgarse a asfixiar la construcción.

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

**Qué cuenta como muerte inexplicada.** Un fallecimiento de alguien entre 5 y 59
años por causa `natural` — ni hambre, ni peste, ni incendio, ni violencia. Son
las muertes que una aldea medieval lee como señal, y son la principal fuente de
movimiento de la fe en años tranquilos.

**El punto fijo.** La fe es un atractor: sin sucesos se queda quieta en su
equilibrio (25 sin cura, 40 con cura tibio, 53 con cura devoto). Eso es correcto
—la fe se mueve cuando pasan cosas, no porque sí— y por eso **no lleva término
estocástico**: en este juego, algo que cambia en pantalla siempre significa algo.
`FAITH_DEVOUT_PRIEST` vale 0.13 y no 0.10 por un motivo concreto: con 0.10 la
deriva `(40 − 50)·0.01` lo cancelaba exactamente y la fe se congelaba en 50.0
clavado durante décadas, que parece un número escrito a mano.

La fe no da recursos. Hace dos cosas: abre y cierra plantillas de encrucijada, y
pone un suelo al ánimo (`morale` no baja de `faith · 0.25`). Una aldea muy
devota aguanta desgracias que hundirían a una descreída — y por eso el cura es
peligroso.

### 5.7 Migración

Se comprueba una vez al año, en la semana 0.

**Llegada.** Requiere `people ≥ 2`, `morale ≥ 50`, reservas de grano `≥ 0.5`
años, `hostile` sin activar, **un líder en el puesto (Anexo A.15, v2.22)** y al
menos 2 huecos de vivienda. Probabilidad 0.30; llegan 2–4 personas, mezcla de
adultos jóvenes y niños.

**La aldea pequeña atrae más** (v3.69, con la fundación en pareja). Mientras
hay menos de `ARRIVE_SMALL_BELOW` (20) personas, la probabilidad es 0,70, el
ánimo que se pide es 35 y no hace falta cama libre: quien llega a un valle de
cuatro acampa junto al río hasta que la casa esté, y el apretón lo cobra el
ánimo (`MORALE_CROWDING`). Las tres se midieron antes de fijarse: con el umbral
normal de ánimo la semilla 23 se quedó cinco años en dos personas con el ánimo
en 49, y con la cama exigida la única casa se llenaba con la primera familia y
nadie más llegaba en diez años. El hambre y la hostilidad siguen cerrando la
puerta igual que a la aldea grande.

**Marcha.** Si `morale < 30`, con probabilidad `(30 − morale)/60` se van 1–3
personas, **el doble mientras el puesto de líder esté vacante** (Anexo A.15,
v2.22). **Sólo se van anónimos.** Que un nombrado desaparezca sin una línea
que lo cuente es sacar un personaje de la historia a espaldas del jugador, y ese
momento le pertenece a él: la plantilla A.7 ya lo tiene como resultado de una
decisión, no como una gota de la simulación.

Los forasteros son el motor principal del crecimiento temprano: la biología sola
hace crecer la aldea demasiado despacio para que la primera generación sea
interesante de ver. Y son un buen castigo: una aldea con mala reputación —
bandera `hostile`, que ponen ciertas encrucijadas — deja de crecer sin que muera
nadie.

> **Medido (v2.16, reconfirmado en v2.23): ese castigo sigue sin ocurrirle a
> quien juega bien.** Las tres opciones que ponen `hostile` no las toma ni
> `prudent` ni `first` en 60 partidas de 200 años, ni siquiera después de que
> M-17 bajara el peso del ánimo de 15 a 3 en la puntuación de `prudent`.
> Acoger a los del vado sigue ganando por dos puntos (−22 contra −24). Ver
> §2.23. Pendiente de decisión de diseño.

**Abandono.** Si la aldea pasa `ABANDON_YEARS` años seguidos por debajo de
`VIABLE_POPULATION` habitantes, los que quedan se marchan: `leftTick` para
todos, el valle a cero y la partida terminada con `cause: 'abandoned'`.

El contador vive en `state.dwindlingSince` y se reinicia en cuanto la población
vuelve a alcanzar el mínimo, así que «cinco años seguidos» quiere decir seguidos.

**Por qué hace falta, y por qué `MIN_FIELD_CREW` no bastaba.** Una aldea de dos
adultos cubre la tripulación mínima de un campo, así que sigue cosechando
trescientas fanegas contra noventa y seis de consumo, y con un granero lleno
—que no se estropea por debajo de su capacidad— aguanta veintiocho años más. Eso
no es un final: es una línea plana de la que la crónica no tiene nada que decir.
Medido antes de esta regla, la mediana de las partidas que morían era de 28 años
por debajo de seis habitantes, y la peor llegó a 55.

Un asentamiento fallido no se muere de hambre. Se abandona, y es lo que la
crónica escribe: peso 3, y no es la línea de la extinción.

### 5.8 Peste

Comprobación anual: `p = PLAGUE_BASE + people/2500`, multiplicada por 0.6 si hay
pozo. Duración 6–10 semanas. Durante el brote, cada persona tiene un riesgo
semanal adicional de `PLAGUE_HAZARD_ADULT`, o `PLAGUE_HAZARD_WEAK` si tiene 4
años o menos, o 60 o más.

Un brote típico se lleva entre un cuarto y la mitad de la aldea. Debe sentirse
como una catástrofe, no como un impuesto.

### 5.9 Incendio

Comprobación anual, `p = FIRE_CHANCE`. Destruye un edificio de madera al azar
(`tier === 0`) **con techo** —casas, granero, capilla, fragua, molino—, con
preferencia por las casas. **Los campos no arden**: son `tier: 0` por accidente
de la tabla de §7.2, no porque el fuego deba llevárselos. Perder un campo cuesta
600 de cosecha para siempre y en la crónica se lee raro. Si toca un granero, se pierde
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
el paso ANNUAL del año siguiente. **La cobertura de vacantes la ejecuta M-10**
en el paso 2 del tick, llamando a `promoteToNamed` de M-03: ningún otro brief la
tenía asignada, y sin ella una aldea que pierde al cura fundador no vuelve a
tener cura nunca.

**Cómo se elige al candidato — y no es «el mayor».** Se filtran los adultos
entre `ROLE_MIN_AGE` y `ROLE_MAX_PREFERRED` (55); gana el de mejor opinión media
del resto y desempata el más joven. Solo si la banda queda vacía se ensancha
hacia arriba.

Leer «por edad» como «el de más edad» envejece el reparto entero en pocas
décadas: los oficios recaen siempre en ancianos, los ancianos mueren pronto, y
la sucesión —que debería ser el latido de una generación— se dispara al doble de
su ritmo natural. Medido: 9,55 sucesiones por siglo contra las 3,6 que
corresponden a un líder de cuarenta años con la tabla de §12.4. Y un reparto que
no se renueva tampoco deja ver a nadie envejecer, que es la mitad del bucle
largo. Ascender a un anónimo le genera nombre, rasgos y opiniones
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

**Rasgos mutuamente excluyentes.** `hardy` y `frail` son ×0.7 y ×1.6 sobre la
misma tasa de mortalidad: tenerlos los dos no es un personaje contradictorio,
es un personaje cuyo multiplicador queda en 1.12 sin que nada lo explique.
Ningún nombrado sale con ambos. El sorteo lo garantiza por construcción, no por
un reintento: al elegir uno se retira el otro de la bolsa. La lista de pares
opuestos vive en `traits.ts` como `OPPOSED`; hoy tiene una sola entrada.

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

Literalmente ahorra el campo: la edad **se deriva** de `bornTick` en años de
calendario, `yearOf(tick) − yearOf(bornTick)`, y por eso el cumpleaños de todos
cae en la semana 0 y en ninguna otra. **En el borde del año no hay nada que
incrementar**, así que no existe ninguna función de envejecer. Lo que sí ocurre
en la semana 0 —clima, peste, incendio, migración, cobertura de vacantes— es el
paso 2 del tick y vive en `sim.ts`.

### 6.6 Sucesión

Al morir el `leader` se dispara **siempre** la encrucijada `succession`
(§Anexo A.6), saltándose el intervalo mínimo. Es la única plantilla con esa
excepción, y es lo que convierte la muerte del líder en el latido del bucle
largo: cada generación, el jugador elige quién manda, y arrastra los rencores de
quien no fue elegido.

---

## 7. Sistema C — El valle

**72 × 112 celdas = 8 064 celdas, con un corazón productivo de 36 × 56 en el
centro.** El valle corre norte-sur y el río baja por él.

> **Revisión v3.68, 15 sep 2026 — el mapa grande.** Lo pidió el dueño del
> diseño: «el mapa sigue siendo muy pequeño, dijimos que iba a ser mucho más
> grande; el valle es el centro del mapa pero debe ser más amplio». Cuatro veces
> el área del mapa de 36 × 56 que el juego tuvo desde M-13.
>
> **Y lo que hace que crecer no toque la economía es el corazón.** El bosque, la
> roca, la marisma y la fundación siguen viviendo en un rectángulo de 36 × 56
> centrado en el mapa —exactamente el mapa entero de antes— y en las mismas
> cantidades. Lo que llena el resto es `mountain` y `lake`: terreno que no da
> madera, ni forraje, ni solar, y que A* no cruza.
>
> Las dos cuentas que había que mover, y las dos dan hoy lo de ayer: el bosque
> era una fracción **del mapa** (`CELLS × fraction`), lo que habría cuadruplicado
> la madera en pie; y `forestLeft` —lo que abre `forest_cut` y `wolf_winter` y lo
> que gobierna la caza— dividía **por el mapa**, y con el bosque quieto se habría
> hundido de 0,24 a 0,06, por debajo de los tres umbrales del catálogo. Las dos
> se miden contra el corazón (`WORLD.HEART_WIDTH`).
>
> **Ya no cabe entero en un móvil vertical**, y por eso la cámara del Anexo D
> encuadra la aldea y deja alejarse hasta ver el valle de borde a borde. El
> Canvas de `src/render/`, que no tiene cámara, pinta el valle entero a cinco
> píxeles por celda en vez de diez: es una consecuencia declarada de esta
> revisión, y la puerta de `?render=canvas` se queda por lo que dice §D.5.

> **Cambio respecto a `valle.md` §7.** El documento original decía 56 × 36, y
> hasta v3.68 esto fueron 36 × 56 por la razón que sigue valiendo para el
> corazón: con 390 px de ancho, 56 celdas de ancho dan celdas de 6,9 px, una
> franja apaisada y aldeanos de 10 px. El valle corre a lo largo, no a lo ancho.

### 7.1 Generación del mapa

Determinista a partir del flujo `map`. **Ocho pasos** desde v3.68, en orden —los
cinco de siempre dentro del corazón, y tres que llenan y abren el valle grande:

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
   pendiente. Terreno inservible, valor puramente visual. Va a lo largo del río
   entero, dentro y fuera del corazón: depende de lo que el río corre y no de lo
   que el mapa mide.
6. **Vado.** El paso de piedras, tallado recto desde la orilla firme más cercana
   al claro de fundación hasta la otra orilla, hasta 14 celdas. Es **terreno**
   (`ford`) y no un dibujo: es la única celda de agua que se pisa, pagando
   `PATHING.FORD`. Antes de v3.68 el río era intransitable para A* y **nadie
   cruzaba el río nunca**: una aldea con campos en las dos orillas dejaba a media
   aldea sin ruta —medido, cuatro rutas para treinta y nueve personas—, mientras
   la ficción hablaba del vado en veinte líneas del banco.
7. **Lago.** Una mancha de 40–80 celdas de agua quieta en la falda, fuera del
   corazón y lejos del río. Antes que la montaña, para que la roca crezca
   alrededor del agua y no al revés.
8. **Montaña.** El cinturón que cierra el valle, fuera del corazón: probabilidad
   creciente con la distancia al corazón —pie a 4 celdas, roca maciza a 14— con
   ruido encima para que el borde no sea un rectángulo. Nunca dentro del corazón
   ni sobre el claro reservado, y nunca sobre el cauce.

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

**La piedra es una existencia desde M-0** (17 sep 2026). Hasta entonces «no se
almacenaba nunca»: canteala era trabajo, así que el coste de obra de una pieza
de piedra era `bp + piedra / STONE_PER_BP` y la piedra no estaba en ningún
sitio —mientras la capa de vida ya animaba la cantera y el acarreo—. Ahora la
obra **cantea con sus propios puntos** hasta tener la piedra que su proyecto
pide, al mismo cambio, y la gasta al abrirlo; con la obra parada y fragua en
pie, cantea hasta `WORLD.STONE_IDLE_CAP` en vez de perder la semana. El trabajo
total de una casa de piedra **no se mueve** —hay prueba de equivalencia en
`tests/journeys/works.test.ts`— y por eso la primera piedra sigue llegando
cuando llegaba. La columna «Madera» de la tabla dice «0 + 50 piedra» por lo
mismo que antes: son dos materiales, y ahora los dos salen de un montón.

**Una celda de calle entre lo que tiene paredes (v3.57).** Dos edificios con
dentro —casa, casa de piedra, granero, capilla, iglesia, fragua, molino,
atalaya— no pueden compartir borde: queda entre ellos una celda libre,
`BUILDING_RULES.STREET_GAP`. El resto de la tabla está exento porque se pisa: un
campo, la empalizada, el pozo y el camposanto son suelo, no interior.

El motivo no es el gusto. Sin la calle la aldea crecía como un bloque macizo
—seis casas seguidas sin un hueco en la partida medida—, y entonces la puerta de
la casa de en medio da a la pared de la de al lado: nadie puede entrar en su
casa sin cruzar la del vecino. Lo que cuesta: la aldea ocupa más suelo, así que
en un valle apretado se llena antes y el punto 9 de §7.3 —las mejoras a piedra—
llega unos años antes.

La piedra no es un sexto recurso. Con `smithy` y roca en el mapa, su extracción
añade `stone / WORLD.STONE_PER_BP` a los puntos de obra del proyecto; se paga la
madera de la tabla al comenzar. No se almacena piedra dentro de `wood`: no había
un factor de conversión definido y mezclar ambos materiales ocultaría su coste.
Esta ronda no agota los afloramientos ni introduce un stock nuevo.

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
9. **Mejoras a piedra**, cuando no queda sitio: casas si A.16 las desbloqueó,
   luego empalizada si A.16 desbloqueó el muro, luego capilla

El punto 9 es lo que resuelve el problema de ritmo a largo plazo de `valle.md`
§7. Cuando el mapa se llena, el mismo motor de obras sigue funcionando pero
produce transformación en vez de superficie.

**Ámbito del punto 9 (v2.12).** «Cuando no queda sitio» se implementa como
«cuando no se puede empezar ninguno de los puntos 1 a 8»: sin parcela, sin
madera o sin necesidad. Es lo que cumple el motivo escrito arriba —que el motor
de obras no se pare— y evita que una aldea que ya lo tiene todo se quede sin
nada que hacer durante un siglo. Las mejoras exigen fragua y roca en el mapa
(§7.2), así que una aldea sin fragua sí se queda parada, que es el incentivo.

La aldea abre **un proyecto cada vez**. §7.3 es una lista ordenada de qué
empezar a continuación, no un conjunto de obras simultáneas: veinte personas
que abren ocho cimientos no terminan ninguno. Un `build` de encrucijada (§8.4)
entra en la misma cola en vez de saltársela, y los puntos que sobran al
terminar una obra pasan a la siguiente de la cola.

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

**Cómo se ordenan estas preferencias (v2.12).** No hay elevación ni fertilidad
en el estado, así que no se inventa una suma de coeficientes: las preferencias
de cada fila se ordenan lexicográficamente, en el orden en que están escritas,
y empata el índice menor. Dos de ellas hay que leerlas con cuidado, porque la
lectura literal desperdiga la aldea por el valle entero:

- **`field` · «lejos del bosque» es *no adyacente* al bosque.** Maximizar la
  distancia al bosque manda los campos al borde del mapa, a veinticinco celdas
  de las casas, y arrastra los graneros con ellos.
- **`chapel` · «algo apartada» es al otro lado del borde del núcleo**, a
  `BUILDING_RULES.CHAPEL_SET_BACK` celdas de él, y «celda alta y visible» —la
  roca es el único sustituto disponible— desempata *dentro* de ese anillo. Con
  la roca como primera clave, un afloramiento lejano gana a cualquier sitio
  sensato y la capilla acaba contra el borde del mapa.

**La iglesia crece desde cualquiera de sus cuatro esquinas.** Es 3×3 sobre una
capilla de 2×2, así que tiene que ganar una celda en cada eje. Se prueban las
cuatro posiciones que siguen conteniendo a la capilla, en orden de fila, y vale
la primera que quepa. Probando solo la esquina superior izquierda, una capilla
con un vecino al sur o al este nunca llegaría a iglesia.

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

### 7.7 Los animales del valle

Una aldea medieval sin un animal a la vista está vacía, y el valle lo estaba.
Esta sección es el plan completo; **se construye por partes y cada parte dice
si existe o solo está declarada**, para que nadie la lea como si estuviera toda
hecha.

**Por qué antes que otro contenido.** La primera sesión humana (§16.3) no dijo
que faltaran sucesos: dijo que no se veía ninguno. Un rencor, una opinión o una
semilla diferida son contenido invisible por naturaleza y necesitan que alguien
los anuncie. **Un animal no**: una gallina picoteando entre dos casas se ve sin
que nadie la nombre. Es el tipo de contenido que resuelve el problema de
presencia por existir, y por eso va primero.

#### El ganado (v2.87 · construido, sin efecto mecánico)

Deriva de lo que la aldea ya tiene, exactamente como la multitud de §10.6
deriva de la gente: **no es estado, no se guarda, no toca ningún número**. Es el
mismo trato que §13.3 da a las ruinas heredadas — *están ahí para verse* — y por
la misma razón: el balance está fuera de banda y cerrado como red de regresión
(§2.47), así que una fuente de comida nueva no entra sin volver a medirlo.

| Animal | De dónde sale | Dónde está |
|---|---|---|
| Gallinas | Por cada casa en pie | Picotean junto a su casa de día; dentro de noche |
| Cerdos | Cuando hay granero: hay excedente con que cebarlos | Junto a las casas |
| Vacas | Cuando hay dos campos o más | Pastan en la pradera junto a los campos |

El día es la fracción del tick (§10.6): a partir de 0,8 el ganado se recoge,
igual que la gente. Que a esa hora el corral quede vacío no es un detalle
estético — es la ventana por la que entrarán los lobos.

#### El rebaño de verdad (v2.91 · construido, con mecánica)

El ganado deja de derivarse y pasa a ser estado: `GameState.herd`, tres
recuentos. Lo que se ve en el valle es lo que la aldea tiene de verdad, así que
si un lobo se lleva una vaca, hay una vaca menos en pantalla.

**El rebaño es comida almacenada que anda, come y puede perderse.** Esa es la
frase que gobierna las tres reglas:

| Regla | Cuándo | Qué hace |
|---|---|---|
| **Manutención** | Cada semana | Cada cabeza come grano. Una gallina casi nada, una vaca lo que un tercio de persona |
| **Matanza** | Cuando falta comida (§5.3) | Antes de que muera nadie, la aldea sacrifica: primero gallinas, luego cerdos, la vaca la última. Cada cabeza vale su carne en semanas de comida |
| **Cría** | Con excedente y sitio | Crece de una cabeza en una cabeza, nunca por encima de lo que las casas y los campos sostienen |

**El techo es el mismo que dibujaba la versión cosmética**: gallinas por casa,
cerdos si hay granero, vacas por cada dos campos. Un rebaño no puede ser mayor
que la aldea que lo alimenta.

**Por qué esto no es simplemente hacer el juego más fácil.** Un amortiguador
contra el hambre lo sería, y el desenlace ya está fuera de banda por abajo
(§2.47). Pero la manutención es un coste que **compite con las personas**: en un
año malo, un rebaño grande es una carga que hay que sacrificar. Esa es la
tensión, y es históricamente cierta. Qué gana la partida —el colchón o el
coste— **no se decide aquí: se mide con el banco**.

**Y lo medido (v2.91) dice que gana el coste.** El mismo banco de §12.9, 30
semillas × 150 años × 5 políticas, corrido sobre el árbol con rebaño y sobre el
commit inmediatamente anterior sin él:

| Medida | Sin rebaño | Con rebaño | Banda de §12.9 |
|---|---|---|---|
| Extinción con `worst` | 11,7 % | **13,3 %** | ≥ 25 % |
| Separación `prudent`–`worst` | 10,0 pts | **11,7 pts** | ≥ 20 pts |
| Extinción con `prudent` | 1,67 % | 1,67 % | 2 %–12 % |
| `forest_cut` elegible, `worst` | 4,47 % | 4,39 % | < 1 % |
| `forest_cut` elegible, `last` | 3,85 % | 3,80 % | < 1 % |
| `forest_cut` elegible, `first` | 2,56 % | 2,63 % | < 1 % |
| `smith_feud` elegible, `prudent` | 1,69 % | 2,05 % | < 1 % |

**Fallan exactamente las mismas siete pruebas antes y después**, que son las que
v2.47 dejó fuera de banda y cerradas como red de regresión. El rebaño no rompe
ninguna que estuviera verde. Y las dos que miden el desenlace se mueven en la
dirección que §12.9 pide, aunque sigan lejos: **una aldea que mantiene animales
paga por ellos más de lo que le devuelven en el año malo**, que es la tensión
que la sección buscaba y no la comodidad que temía.

La extinción con `prudent` no se mueve ni una centésima: la aldea bien llevada
tiene grano de sobra para el rebaño, así que el coste solo se nota donde tenía
que notarse. **Qué falsaría esta lectura:** que el rebaño bajara la extinción
adversa, o que ablandara `prudent` por encima de su banda.

#### La peste del ganado (v2.94 · construida)

Lo que al rebaño le faltaba. Hasta v2.91 tener muchos animales solo costaba
grano, y debería además **dar miedo**: eso es lo que convierte un rebaño grande
en una apuesta en vez de en un colchón gratis.

Está construida a imagen de la plaga de §5.8, porque es la misma clase de cosa:

| | Personas (§5.8) | Ganado (§7.7) |
|---|---|---|
| Riesgo base | `PLAGUE_BASE` anual | `MURRAIN.BASE` anual |
| Término de tamaño | Habitantes / `PLAGUE_PER_PEOPLE` | Densidad del corral × `PER_DENSITY` |
| El pozo | ×`PLAGUE_WELL` | ×`MURRAIN.WELL` |

**La densidad es la única parte sobre la que el jugador manda**, y manda de la
única forma en que puede: el techo del rebaño lo ponen las casas y los campos
(v2.91), así que una aldea que crece diluye su ganado contra un techo más alto.
Y el pozo, que hasta ahora solo servía contra la plaga humana, gana su segunda
razón de existir.

**Nunca se lleva una especie entera.** Se ceba en la más numerosa y se lleva
`TOLL` de ella. Un valle que pierde todas las vacas en una semana no tiene nada
que decidir después, y §7.7 va justo de que el rebaño es algo que se administra.

**Flujo `murrain` propio, no `animals`.** Añadir la enfermedad no mueve ni una
tirada de lobos en una partida ya guardada (§4.3). Once flujos, y ninguno de los
diez primeros se ha desplazado nunca al añadir los dos últimos: está fijado en
el estado dorado de `rng.test.ts`.

**Lobos** (v2.91). En invierno, cuando la aldea no tiene empalizada, se llevan
una cabeza y empiezan por la mayor. Convierte una obra que el jugador ya podía
levantar en una defensa con motivo. Consumen del flujo `animals`, nuevo y
propio (§4.3): ninguna tirada de lobos puede desplazar la demografía.

#### Caza y pesca (v2.92 · construido, y con un problema medido)

La primera cosa que los aldeanos **hacen** en vez de que les pase. El reparto de
§5.2 gana un destino más, y solo se abre cuando la despensa baja de
`FORAGE.THRESHOLD_YEARS` (tres cuartos de año de grano). Por encima de eso no
sale nadie: labrar alimenta a más gente por brazo de lo que la caza alimentó
jamás, y una aldea harta que se fuera al bosque sería una aldea tonta.

| | De qué depende | Qué lo limita |
|---|---|---|
| **Caza** | Del bosque en pie, normalizado contra un valle entero | Bajo `MIN_FOREST` no hay nada que cazar |
| **Pesca** | De nada. El río no se agota | Que haya agua en el mapa, y nada más |

Cuantos más brazos salen cuanta menos comida hay, hasta la mitad de los que
sobran tras el campo. **Nunca más de la mitad**, para que la reserva de obras de
§5.2 sobreviva al hambre: un valle que deja de construir porque pasa hambre es
otra vez el valle que no cambia, y eso no se arregla con comida.

**El problema, y está medido.** El mismo banco de §12.9 dice que el forrajeo
devuelve el desenlace exactamente a donde estaba antes del rebaño:

| Medida | Sin nada | Solo rebaño | Rebaño + forrajeo | Banda |
|---|---|---|---|---|
| Extinción con `worst` | 11,7 % | 13,3 % | **11,7 %** | ≥ 25 % |
| Separación `prudent`–`worst` | 10,0 pts | 11,7 pts | **10,0 pts** | ≥ 20 pts |
| Extinción con `prudent` | 1,67 % | 1,67 % | 1,67 % | 2 %–12 % |

Siguen fallando las mismas siete pruebas de siempre y ninguna verde se ha
puesto roja, pero **lo que el rebaño había ganado, la pesca lo devuelve**. Era
literalmente lo que §2.47 anticipó al dejarla apuntada como *la palanca sin
explorar*: comida que no depende de la cosecha es un amortiguador contra la
hambruna, y el desenlace ya estaba blando por abajo.

**Lo que NO se hace aquí.** No se toca una sola constante para tapar esto. La
fase de balance está cerrada como red de regresión (§2.47) y bajar el
rendimiento del pescador hasta que el número vuelva a su sitio sería ajustar el
instrumento a la medida, que es la trampa que esa sección se escribió para
evitar. Queda como **decisión de diseño abierta**, y son tres y excluyentes:

1. **Aceptarlo.** El desenlace duro no se consigue con hambre sino con otra
   cosa, y la hambruna deja de ser la palanca principal del juego.
2. **Poner precio a la pesca.** Que exija un embarcadero construido, o que el
   río rinda por estaciones. Deja de ser comida gratis sin dejar de existir.
3. **Endurecer por otro lado.** Si el amortiguador se queda, la dificultad
   tiene que venir de §8 y no de §5, que es un cambio mucho mayor.

**Qué falsaría lo escrito aquí:** que quitando la pesca y dejando la caza el
desenlace volviera a 13,3 %. Eso diría que la culpable es la comida que no se
agota y no el forrajeo entero, y la opción 2 pasaría a ser la respuesta obvia.
No está medido todavía: es la siguiente pregunta, no otra hipótesis encadenada
a esta.

#### Los cuervos (v2.93 · construido, con mecánica)

Estaban sobre los campos desde v2.88 y no se llevaban nada. Ahora se llevan lo
único que podían llevarse: parte de la cosecha que todavía no se ha segado.

Lo que los hace valer no es la pérdida, es **la respuesta**. Y la respuesta no
es una obra: es gente. Alguien tiene que estar en el campo espantando pájaros
durante las seis semanas que el grano está en pie, y esos son exactamente los
mismos brazos que querrían estar cortando leña, levantando obra o —en un año
malo— cazando en el bosque. **Es el primer animal que le pide algo al jugador
en vez de limitarse a pasarle algo.**

| | |
|---|---|
| **Cuándo** | Las `CROW_WEEKS_BEFORE_HARVEST` semanas anteriores a la siega |
| **Cuánto** | `BITE_PER_WEEK` de la cosecha por semana sin vigilar, con tope en `MAX_BITE` |
| **La respuesta** | `WARDEN_PER_FIELD` brazos por campo trabajado, tomados de lo que sobra |
| **Se paga** | En la siega, que gasta el mordisco y lo pone a cero |

**Sin tirada de azar, a propósito.** Una cosecha que perdió un décimo por
pájaros es consecuencia del reparto de esa semana y el jugador tiene que poder
leerla en él. Un dado aquí convertiría una decisión en una queja.

**Por qué brazos y no espantapájaros.** Un edificio nuevo exige dibujarlo, y el
apartado gráfico está congelado mientras se rehace por separado. Pero la razón
de fondo es mejor que la circunstancial: un espantapájaros se construye una vez
y deja de ser una decisión para siempre, mientras que los guardas se pagan cada
año y compiten con todo lo demás justo en la semana que más aprieta.

Los guardas salen **antes** que los cazadores en el reparto de §5.2: el grano
que ya está en el campo vale más que el que nadie ha cazado todavía. Y salen
solo de lo que sobra tras la siembra, porque una aldea no quita gente de la
cosecha para vigilarla.

**Qué falsaría todo lo anterior:** que el rebaño crezca por encima de lo que la
aldea sostiene, que se coma grano que no tiene, que la aldea deje morir gente
teniendo cabezas que sacrificar, que un lobo entre con la empalizada en pie, o
que dos partidas con la misma semilla acaben con rebaños distintos.

Y para los cuervos: que muerdan fuera de las semanas del grano en pie, que
vigilar no sirva de nada, que una siega arrastre los pájaros del año anterior,
o que los guardas salgan de los brazos de la propia cosecha en vez de los que
sobran. Cada una de esas cinco tiene su prueba, y tres de ellas están
verificadas por mutación.

Y para la peste: que un corral apretado no corriera más riesgo que uno holgado,
que el pozo no cambiara nada, que un brote se llevara una especie entera, o que
tirara del flujo de los animales en vez del suyo. Las cuatro tienen prueba y
las cuatro están verificadas por mutación — la del flujo hacía falta porque
perturbar un flujo que nadie usa no cambia nada, y hay que mirar el contador de
frente.

### 7.14 Lo que el jugador da se ve en el valle (M-3, 18 sep 2026)

**Dos de los seis medios tienen cuerpo en la aldea**, y los cuatro restantes no
lo tienen a propósito:

| Medio | Qué se ve | Dónde, y desde cuándo |
|---|---|---|
| El barril de cerveza | Un barril en la plaza, del que se bebe | En el corro de la reunión (§11.8), **sólo mientras dura la fiesta** que se pagó (`aleWindow`) |
| El arado | Un arado apoyado en un campo | Dentro de su campo, en el rincón más despejado, **desde el día que se dio y para siempre** (el rasgo no caduca) |
| La pocilga | Cerdos | Ya los pinta `life/beasts.ts`: el medio sube el techo del corral (§7.12) |
| El hacha, la reliquia, unas manos | Nada propio | Cambian lo que la aldea consigue o cuánta gente hay. Ponerles un trasto «para que se notara» sería decorado |

**Van por `given()` y no por `scatter()`**, y esa separación es una decisión del
dueño del diseño del 15 sep 2026 cumplida al pie de la letra: los trastos
repartidos por el prado están **apagados** en el juego —«esas pelotas eran de
prueba, ahora mismo no tiene ningún sentido que haya pelotas por ahí»— y lo que
quedó dicho es que la maquinaria se guardaba «por si algún día un trasto tiene
sentido **en su sitio**: un cubo junto al pozo, un haz junto a la leñera.
Repartidos por el prado, no». El barril y el arado son cosas con sitio.

**El sitio costó tres intentos y cada uno se midió**, porque el dueño avisó de
que «eso de los trastos y las pelotas no estaba bien hecho, el posicionamiento»:

1. Anclado a la puerta del corazón de la aldea: el corazón es casi siempre un
   campo, así que el barril salía **entre los sembrados**.
2. Buscando en anillos el punto más despejado: penalizar el sembrado lo echaba
   de la plaza, **de 4 a 6,6 celdas del punto de reunión en once de doce
   semillas**, o sea a las afueras.
3. El que quedó: **una de las plazas que la propia reunión reparte**, la más
   cercana al corro entre las que tienen 0,8 celdas de aire al tejado más
   próximo. Medido en doce semillas: nunca bloqueado, nunca en un sembrado, de
   0,80 a 2,24 celdas de aire.

Y **no se cogen** (`Prop.fixed`): el barril daba de beber a seis, y quien llegaba
primero se lo llevaba en la mano porque `village.ts` cogía cualquier trasto a
cuya plaza hubiera llegado —el comentario decía «sólo `play`/`carry`» y el código
no lo comprobaba—. La fiesta se iba andando detrás de él.

---

### 6.7 El rey (K-1 a K-5, 18 sep 2026)

**El jugador no manda; dice quién manda.** Es el principio de los medios (§7.12)
aplicado a una persona: la corona es una cosa que se da, se paga con lo del valle
y lo que la aldea haga con ella lo deciden los sistemas que ya existen. El plan
completo está en `docs/plan-rey.md`; la medida, en `docs/rey-medida.md`.

**Qué es.** `state.crown` (esquema 10) guarda quién la lleva, desde cuándo y **qué
oficio tenía el día que la recibió** —eso último es lo que decide su estilo, y al
coronar se pierde porque el rey ocupa el asiento de `leader`—. Se da con un acto
del jugador (`{kind:'crown', who}`) en el paso 1b, cuesta 30 de plata y pide 30
personas, y **no consume azar**.

**El asiento no se renombra.** El rey ocupa el mismo puesto que el jefe de la
fundación: siete plantillas de encrucijada reparten `{as:'A', role:'leader'}` y la
puerta de la migración depende de que exista. Lo que cambia es quién lo ocupa —el
jugador, una vez— y qué hace el que lo ocupa. La palabra «king» la pone
`derive/crown.ts`; el identificador se queda para siempre (§2.2).

**Los cuatro estilos**, por el oficio de antes:

| Estilo | Oficio | Lo que abre | Lo que cierra |
|---|---|---|---|
| `forge` | herrero | La defensa va delante y la muralla no espera amenaza | El señor cuenta las armas (×1,5 en sus plantillas), y la muralla cuesta manos |
| `plough` | campo, o sin oficio | La comida va delante; dos campos y un granero más de los que §12 permite | Más manos en el campo son menos en la obra |
| `chapel` | cura | La fe deriva a 50, con lo que la capilla llega sola | La obra rinde un 10 % menos, y el barril vale la mitad |
| `court` | jefe o forastero | Su sala, y ánimo mientras está en pie | El valle queda vigilado veinte años, y la sala cuesta dos casas |

**Y cuatro rasgos con número**, de los que **dos eran deuda de §6.3 que nadie
había escrito**: el ambicioso levanta un 5 % más de obra y el generoso hace que el
hambre cueste tres cuartos de ánimo. Los nuevos: el miedoso cierra la puerta a los
de fuera (×0,7) y el de mal genio hace la riña de la plaza ×1,5.

**Sin corona, nada de esto pasa.** `will()` devuelve la voluntad de reposo, que es
literalmente lo que el reparto de manos y la cola de obras leían de la postura
retirada de v2.0, así que **una partida sin coronar es byte a byte la de antes**.
La migración 9 → 10 entra a `null` por eso.

**Cuando el rey muere, la corona pasa por la sucesión de siempre** (A.15, §6.6):
el elegido toma el asiento y con él su estilo, así que un rey del arado muere, le
sucede el herrero y la aldea empieza a mirar a las murallas. Si el trono queda
vacío, la voluntad vuelve al reposo y el interregno cuesta lo que costaba. El
cartel de esa pregunta se reescribió **neutro** —«the seat is empty»— porque ahora
vale para un jefe y para un rey.

**La sala del rey** (`hall`, 3×3, 200 de madera, 160 de obra, tope 1) la levanta
**sólo el estilo de corte**, y eso se midió: con cualquier rey costaba dos o tres
casas, y como las casas son el techo de la población, coronar bajaba la población
de 42 a 31–39 en las cuatro variantes. Un impuesto por coronar no es una elección.
Es la casa del rey —se muda a ella y cuenta cinco camas— y arde como cualquier
casa de madera. Su malla está encargada (`docs/plan-rey.md` §8); hasta que llegue,
el render la dibuja más alta que una casa y con el tejado burdeos del jefe.

---

### 7.4b La plaza (P-1 y P-2, 18 sep 2026)

**El valle tiene una plaza, y es un sitio, no un punto.** La pidió el dueño del
diseño: «me gustaría que la plaza fuese un espacio que tuviese un círculo
grande, con separación. Creo que las cosas se deberían mover para que esa plaza
parezca una plaza de verdad. Y en el centro quizás puedo poner una fuente».

**Qué había antes y por qué no servía.** La plaza era `valleyCore` —la media de
los centros de los edificios en pie (`derive/anchors.ts`)— y se recalculaba cada
vez que alguien preguntaba. Medido en ocho semillas, de la fundación al año 60:
**se desplazaba de 4,2 a 10,8 celdas**. Empedrar eso es empedrar un sitio que se
muda, y una fuente en un sitio que se muda es una fuente que persigue a la aldea.

Cuatro reglas, y las cuatro son del motor:

1. **Se elige el día de la fundación y se guarda** (`state.plaza`, esquema 8).
   `choosePlaza` la busca **al lado de la casa fundadora** —de las ocho
   direcciones, la que menos pisa lo ya construido y más suelo abierto tiene—, y
   no consume azar: el mismo valle da la misma plaza (§4.3).
2. **Nadie construye dentro.** `inPlaza` la reserva con radio `PLAZA.RADIUS` = 3
   celdas, o sea **dieciocho metros de lado a lado**, y la prohibición incluye
   los campos: un trigal en medio de la plaza es lo contrario de una plaza.
3. **El pueblo crece a su alrededor.** §7.4 mide todo contra un centro, y ese
   centro era la media de las casas: la aldea crecía alrededor de sí misma y
   dejaba la plaza en el borde. Ahora el centro **es la plaza**.
4. **Y la reunión de §11.8 se convoca ahí.** «In the square» era `valleyCore`, o
   sea un sitio distinto cada década; ahora es la plaza.

**Lo que cuesta, medido en ocho partidas de sesenta años:** reservar el círculo
no cuesta nada (352 personas contra 354, 446 edificios contra 454). Centrar el
trazado en la plaza cuesta **un 6 % de población** —354 a 334, y casi todo en
una semilla: la 11 pasa de 46 a 28— porque un anillo reparte las casas más lejos
unas de otras. Se acepta a cambio de lo que se pidió: un pueblo con plaza.

**Lo que se ve** (P-2, `src/render3d/`): el empedrado es el suelo de las celdas
del círculo, con el borde un tono más oscuro (`world/ground.ts`, `cellColour`), y
en el centro hay una fuente. La malla de la fuente está encargada
(`docs/encargo-fuente.md`); mientras no exista, `PlazaFountain` dibuja un pilón,
el agua y una columna con tres primitivas, por la misma razón que el barril y el
arado (§7.14). **Su celda está cerrada al paso**: la gente rodea la fuente, no la
atraviesa.

---

### 7.4c La muralla, por anillos (P-4, 18 sep 2026)

**La empalizada se levanta sobre un anillo, y el anillo se escribe.** Lo pidió el
dueño del diseño mirando una captura: «¿podemos también evitar esos cachos
sueltos? Sé que es complicado porque la aldea tiene que ir creciendo, pero la
muralla también tendrá que quedarse por secciones. Es decir, si la aldea crece a
un cierto punto, se construye la muralla alrededor y después la siguiente sección
de construcción va fuera de la muralla».

**Qué había.** §7.4 ponía cada pieza sobre la **envolvente convexa del núcleo
dilatada dos celdas**, y esa envolvente crece con la aldea: cada pieza caía sobre
la envolvente del año en que le tocó, así que las piezas de años distintos
quedaban en líneas distintas. Medido en cuatro semillas al año 60: **de 7 a 19
tramos desconectados por valle**, y el más largo con la cuarta parte de las
piezas. Ninguno cerraba nada.

Las reglas:

1. **El anillo es un radio desde la plaza** (§7.4b), guardado en `state.ring`
   (esquema 9). Se decide una vez —`coreRadius` + `PALISADE_DILATION`— y no se
   mueve mientras quepa una pieza más.
2. **La muralla crece pegada a la muralla**: de las celdas del anillo se elige
   primero una que toque una pieza ya puesta, y entre ésas la siguiente en
   ángulo, así que el tramo avanza por un lado en vez de saltar.
3. **La línea del anillo es de la muralla**: ningún otro edificio puede pisarla.
   Es lo que hace que «la siguiente sección de construcción vaya fuera» sin que
   nadie lo mande: cuando dentro no cabe nada, lo nuevo sale.
4. **Un anillo por valle, y uno solo.** Cuando se cierra no hay más muralla que
   pedir, y la obra pasa a lo siguiente de §7.3 —las mejoras a piedra—. El
   primer anillo se busca de tres en tres celdas hacia fuera hasta encontrar
   sitio, así que en un valle estrecho la muralla se separa lo que haga falta,
   pero **no se levanta un segundo anillo alrededor del primero**.

   Esto último se midió y es la corrección del 18 sep 2026. Lo que el dueño del
   diseño pidió es «se construye la muralla alrededor y después la siguiente
   sección de construcción **va fuera** de la muralla»: lo nuevo va fuera, no
   otra muralla. Y permitir el segundo anillo tenía un coste que no se veía
   venir: **§7.3 sólo pide casa cuando falta sitio para dormir**, así que en
   cuanto la aldea tiene camas de sobra la empalizada es lo único que queda en
   la lista de obras y el valle se pasa el siglo levantando anillos. Medido a
   120 años en doce semillas: **1 824 tramos de muralla contra 131 casas**, con
   la semilla 51 en anillos de 8, 11, 14 y 17 y **336 tramos para catorce
   casas**. Con un anillo por valle son de 37 a 59 tramos, uno por aldea, y las
   casas y los campos no se mueven: 131 y 89, los mismos.

**Lo medido, en cuatro semillas:** al año 20 hay de cero a cuatro piezas y un
solo tramo; **al año 40, un solo tramo en las cuatro** (8, 28, 4 y 8 piezas); al
año 60 los valles grandes han cerrado su anillo y empezado otro, y el tramo mayor
tiene del 45 % al 100 % de las piezas —contra el 25 % de antes—.

**Y dos números que costaron tres medidas cada uno**, porque el diseño era
correcto y la geometría no:

- **La banda del anillo es de 0,75 celdas y no de media.** Un círculo dibujado
  con celdas enteras no pasa por el centro de las celdas: al avanzar en diagonal
  el centro se separa del radio hasta 0,7. Con media celda se rechazaban celdas
  que estaban en el anillo, el anillo parecía lleno, y la muralla salía a
  buscarse otro radio cada pocas piezas: **de 25 a 47 tramos por valle**.
- **El radio se guarda, no se deriva.** Derivarlo de la mediana del tramo más
  largo parecía elegante y no es estable: la mediana se mueve al añadir cada
  pieza, y con el radio moviéndose medio paso la siguiente pieza ya no cae en el
  mismo círculo —48 tramos, 17 de ellos de una sola pieza—. Un anillo es una
  decisión, no una media.

**Lo que cuesta.** La muralla ahora se cierra, así que la aldea gasta mucha más
madera en ella: en la semilla 41 al año 60 hay 128 piezas donde antes había 40.
Medido en ocho partidas de sesenta años, la población baja de 334 a 322 —un 3 %—
y en los dos valles grandes algo más. Es el precio de tener muralla.

---

### 7.13 La leña se corta por necesidad (balanceo del 17 sep 2026)

**La aldea manda al bosque las manos que hacen falta, no una cuota.** Lo pidió el
dueño del diseño al cerrar el juego de los medios —«lo primero es balancearlo un
poco … sobre todo de los recursos básicos, las decisiones deben
complementarse»— y lo que había era una cuota fija (`LABOUR.CUTTER_SHARE`, y
antes la palanca `timber` de la v2.0): una parte de lo que sobraba tras el campo
iba al bosque, hubiera leña o no.

**Medido, eso hacía dos cosas mal a la vez** (24 semillas × 60 años,
`tools/agency-report.ts`):

| | Cuota fija | Por necesidad |
|---|---|---|
| Semanas de invierno con la leñera vacía (§5.4) | **1 982** en 24 partidas | **0** |
| Leña en el almacén al final, valle con arado | 20 415 | 447 |
| Leña en el peor momento tras el año 10 | 0 | 168 a 186 |
| Población mediana sin ayuda del jugador | 38 | **44** |
| Valles que llegan a la piedra sin ayuda | 7 de 24 | **12 de 24** |

Un valle que no recibía nada del jugador **se congelaba ochenta y dos semanas
por partida** mientras otro apilaba veinte mil unidades de leña que nadie iba a
gastar, y las dos cosas salían de la misma regla. La necesidad es el invierno que
viene (`WOOD_TARGET_WEEKS` semanas de quema) más el fondo de obra
(`WOOD_WORKS_STOCK`), menos lo que hay en la leñera; se cubre en
`WOOD_CATCH_UP_WEEKS` semanas y con un suelo de leñadores
(`CUTTER_FLOOR_SHARE`) para que el bosque nunca se quede sin nadie —que es §11.1:
el valle es el HUD y un bosque vacío de gente dice algo falso—.

**Y con esto las decisiones se complementan**, que es lo que se pedía: el arado
libera manos del campo, el hacha hace que las manos rindan más —en la obra
(`MEANS.AXE_WORKS`) y en el bosque—, y la reliquia abre la capilla que ninguna
de las dos abre. Antes de esto el hacha no cambiaba nada: la leña ocupa la
décima parte de las manos, así que multiplicarla sólo podía liberar un 3 % de la
aldea.

---

### 7.12 Los medios: lo que el jugador mete en el valle (M-2, 17 sep 2026)

**El verbo del juego.** Lo dijo el dueño del diseño con una imagen y es el
diseño entero: *«es como si cogieras a un grupo de personas y le dieses una
pala, o un martillo, o un no sé qué. Depende de lo que le des van a hacer
diferentes cosas. Tú realmente no le estás diciendo qué tienen que hacer, sino
que ciertas cosas dan lugar a otras. Y eso crea situaciones random, que es lo
que deseamos.»*

Así que **el jugador no fija ningún número y no da ninguna orden: mete cosas en
el valle**, y lo que la aldea haga con ellas lo deciden sus propios sistemas —el
reparto de manos de §5.2, la tabla de sucesos de §7.10, las opiniones de §6.4—.

**Qué es un medio.** Una cosa que se da, que **cuesta lo del valle** y que abre
algo bueno **y** algo malo. Ninguna de las dos mitades es opcional: la mala es
la que convierte darlo en una decisión en vez de una compra.

| Medio | Qué cambia | Lo bueno | Lo malo |
|---|---|---|---|
| **Un arado** | Un campo se trabaja con `MEANS.PLOUGH_CREW` de las manos que pedía | Sobran brazos, y la aldea los manda donde ella quiera: bosque, obra, cantera | El granero se llena, y un granero lleno trae ratas, ladrones y al señor (§7.10, M-1) |
| **Una pocilga y dos cerdos** | Sube el techo del corral (`ANIMALS.STY_PIGS`) y mete dos | Carne en invierno y matanza en la fiesta de la cosecha | Los lobos van a donde hay ganado, y el corral apretado cría peste (§7.7) |
| **Un barril** | Una fiesta esta misma semana | Ánimo de golpe, y bodas las semanas siguientes | Riñas las mismas semanas, y la fe lo mira mal |
| **Un hacha buena** | Cada leñador trae `MEANS.AXE_WOOD` de leña | Leña, y con ella obra y piedra | El bosque del corazón retrocede, y la riada pesa con el bosque que ya no está |
| **Una reliquia** | La fe deriva a `MEANS.RELIC_FAITH` | Capilla y cura sin esperar una generación (§7.3 pide 45 de fe) | El camino se entera: `watched`, y de eso vive el señor |
| **Un par de manos** | Un forastero adulto se queda | Manos, que es de donde sale todo lo demás | Una boca más, y sin cama libre no se queda |

**Y por qué la pocilga y no dos cerdos sueltos** (M-3): el corral se llena solo
—`tendHerd` cría hasta la capacidad que dan las casas— así que dar animales a
una aldea hecha era una negativa por falta de sitio casi siempre. Lo que un
medio da es **lo que la aldea no puede darse a sí misma**.

**Y el forastero no cuesta una tirada.** Su nombre y sus rasgos salen de un
`hash32` del tick, no del flujo `names`: la invariante de todos los actos del
jugador es que dar algo **no mueve una sola tirada del mundo** (§4.3), y un
forastero con nombre sorteado habría desplazado la partida entera.

**Y no se coloca nada.** «En este juego no se coloca nada; todo se decide y el
mapa interactúa solo» (dueño del diseño): el arado va al campo que se trabaje,
los cerdos al corral que haya y el barril a la plaza. Quien sabe dónde está cada
cosa es §7.4, no el jugador.

**Un medio con rasgo es un rasgo de valle que pone el jugador.** El arado entra
en `state.traits` como los cuatro de la fundación (§7.11): cambia un número de
la economía para siempre y se cuenta en la crónica. Por eso no se da dos veces.

**El precio está medido, no elegido.** La leña no es escasa en este juego y el
grano sobrante es corriente; lo que de verdad limita es **la plata**, que no se
produce dentro y entra a cuentagotas por el camino (§7.8). Con los primeros
precios —doce, ocho y cuatro— un valle compraba **cincuenta y un barriles en
sesenta años**, o sea fiesta permanente. Con veinte, catorce y diez, y sin poder
encadenar barriles, toda la plata de una partida da para una docena de medios:
un medio pasa a ser una decisión de década.

**Lo que esto entrega, medido** (`tools/agency-report.ts`, 24 semillas × 60
años, dando cada medio en cuanto el valle puede pagarlo):

| Se da | Población mediana | Primera piedra |
|---|---|---|
| nada | 38 | año 44, en 7 valles de 24 |
| el arado | **61** | año 43, en **24 de 24** |
| la reliquia | 47 | **año 34**, en 21 de 24 |
| las manos | 49 | año 46, en 17 de 24 |
| el barril | 45 | año 43, en 15 de 24 |
| la pocilga | 40 | año 46, en 12 de 24 |
| el hacha | 39 | año 48, en 8 de 24 |
| el carro entero | 45 | año 43, en 15 de 24 |

**Veintitrés puntos entre la mejor y la peor manera de jugar**, y la diferencia
se lee sin números: un valle con arado tiene piedra y el que no, no la ve; uno
con reliquia la tiene diez años antes. Y con la misma plata, **el carro entero
sale peor que sólo el arado** (45 contra 61), porque comprar de todo deja sin
plata para lo que de verdad cambia la partida. Elegir no es una preferencia.

**Y una medida que dice algo del juego y no de los medios: el hacha no cambia
casi nada** (39 contra 38). No es un defecto del medio: es que **la leña no es
un cuello de botella en este valle** —de 507 a 43 000 unidades en cien años,
medido desde v2.9 y anotado en `crossroads/catalog/trade.ts`—, así que dar más
leña es dar más de lo que ya sobra. Lo que el hacha sí cobra es su precio: el
bosque retrocede y la riada pesa con él. Queda escrito para quien decida algún
día si la leña debe escasear; **es balance y no es de esta fase**.

---

### 7.8 Los comerciantes del camino

**No hay pueblos vecinos en el mapa y no los va a haber.** Lo que la aldea sabe
del mundo exterior es quién entra en ella, y eso no es una limitación sino la
idea: un comerciante es una persona con un camino a la espalda y una historia
que cuenta sobre él. Los sitios de donde vienen existen sólo en lo que dicen.

> **M-0 (17 sep 2026) · dejan de ser encrucijadas y pasan a ser ofertas.** Lo
> de abajo describe cómo estaban montados hasta entonces —plantillas del
> catálogo con categoría `trade`, y un canal propio (`selectTrader`) con su
> reloj y su flujo de azar— y **las tres plantillas están retiradas**
> (`RETIRED_TEMPLATES`: una partida guardada que ya las contestó sigue
> cargando). Quién sube por el camino lo sortea ahora la tabla de sucesos de
> §7.10, y lo que deja es una **oferta**: una frase en la voz de la bandeja y
> dos toques, «aceptar» o «dejarlo ir» (`world/road.ts`, §11.2). El dueño del
> diseño eligió ese formato: una decisión corta y frecuente, sin pantalla
> entera, que es lo que da el ritmo que pidió («cada semana, cada mes, cada
> tres meses que pasen cosas»).
>
> **Y lo que se compra y se vende se paga en plata**, que es la existencia que
> M-0 añade y lo único que viene de fuera del valle. Cuatro visitas: el
> buhonero compra leña, el factor compra el grano que sobra —dejando siempre
> dos años de comida, medido: con uno, un valle joven vendía lo que lo
> separaba del hambre y se extinguía—, el tratante vende una vaca y el salinero
> sal. Ninguna sube a un caserío de menos de `OFFER.MIN_PEOPLE`, ninguna repite
> antes de su plazo (`OFFER.AGAIN_WEEKS`; sin él el factor subía más de una vez
> al año y tapaba al resto de los sucesos) y ninguna sube mientras hay una
> decisión sin contestar o otra oferta esperando. **Una oferta no cambia nada
> hasta que el jugador contesta**, aceptar sin poder pagar no la gasta, y
> dejarla pasar no escribe en la crónica: quien no compra no hace historia.
>
> **El señor cobra diezmo cada otoño** (`TITHE`), en plata, o en grano del que
> sobra si no hay plata, y nunca a un caserío: el mundo no mata sin motivo.

Se apoyan enteros en §8, sin subsistema nuevo: son plantillas del catálogo con
categoría propia `trade`. El catálogo ya sabía plantear una decisión con
opciones y precios visibles, así que un trato no necesitaba interfaz nueva.

| Comerciante | Cuándo | Qué mueve | Qué cuesta de verdad |
|---|---|---|---|
| **El tratante** | Primavera | Compra y vende cabezas del rebaño (§7.7) | Grano, o dos cerdos que no verás crecer |
| **El salinero** | Verano | Deja la bandera `salted` | Grano por algo que no se come |
| **El factor** | Otoño | Compra excedente, paga en madera | Que el camino sepa lo que guardas |

**Cada uno toca un sistema que los otros no tocan**, y hay una prueba que lo
exige. Tres comerciantes que movieran los mismos números serían el mismo
comerciante con tres nombres, y llegan en estaciones distintas por lo mismo.

**La sal es la forma que al catálogo le faltaba.** Todas las demás opciones
gastan para arreglar algo ahora; la sal es una inversión — no se come, y hace
que cada cabeza sacrificada rinda `ANIMALS.SALTED_MEAT` mientras dure. Su
bandera tiene lector en la matanza de §7.7, que es lo que la separa de un
adorno.

**Y vender el excedente no es gratis aunque lo parezca.** El grano por encima de
la capacidad se pudre solo (§5.3), así que venderlo parece dinero encontrado. El
precio no está en el grano: está en `watched`, que leen las plantillas del
señor. Una aldea de la que se habla en el camino como aldea con grano de sobra
es una aldea a la que alguien acaba viniendo a cobrar.

#### Dos versiones medidas y tiradas

El factor exigió primero un bosque talado. **No sale nunca**: el banco de
cobertura no baja del 45 % de bosque en ninguna semilla, que es exactamente por
lo que `forest_cut` vive en la lista de plantillas lentas de esa prueba. Se
cambió entonces a exigir poca madera en el almacén, y tampoco: medido en doce
semillas y cien años, **la reserva de madera nunca bajó de 507 y llegó a
43 000**. La madera no es un bien escaso en este juego, y una plantilla atada a
que lo fuera nace muda.

Lo que sí es corriente es tener grano de sobra, así que ésa es la puerta. Vale
la pena anotarlo porque no es sólo sobre este comerciante: **cualquier diseño
futuro que dé por hecho que la madera aprieta está construyendo sobre algo que
la medición dice que no ocurre.**

#### El catálogo estaba lleno (v2.96 · medido, sin resolver)

Los tres comerciantes pasan la suite rápida entera, cobertura incluida. El banco
de §12.9 dice algo que la suite rápida no puede ver:

| Medida | Antes de los comerciantes | Con ellos | Banda |
|---|---|---|---|
| Cadencia, `prudent` | pasaba | **5,51** | 1–5 |
| Cadencia, `first` | pasaba | **5,70** | 1–5 |
| Cadencia, `last` | pasaba | **5,46** | 1–5 |
| Cadencia, `worst` | pasaba | **5,92** | 1–5 |
| `forest_cut` elegible, `worst` | 4,39 % | 6,29 % | < 1 % |
| `forest_cut` elegible, `last` | 3,80 % | 5,45 % | < 1 % |

**La cadencia son decisiones por generación**, y su techo existe para que la
partida no se convierta en un menú. Añadir contenido la sube: con más plantillas
elegibles hay menos ticks en los que no hay ninguna, así que se pregunta más a
menudo. Y `forest_cut` empeora por el mismo motivo del revés — sale menos porque
compite con más, y al no salir pasa más semanas elegible.

**No hay hueco libre.** Subir los reposos de los comerciantes para devolver la
cadencia a su sitio silencia la categoría `feud` en el barrido de cobertura, y
se probó con tres pares de valores distintos (25/30/20, 28/32/22, 30/35/25) con
el mismo resultado en los tres. El catálogo estaba en un equilibrio más ajustado
de lo que nadie había escrito.

**Se tomó la primera, y el resultado está más abajo.** Lo que sigue se conserva
porque las tres opciones se midieron contra ella.

**Tres salidas, y son excluyentes:**

1. **Los comerciantes dejan de competir.** Canal propio con su ritmo, fuera del
   presupuesto de decisiones de §8.6. Es lo más defendible: un buhonero que
   llama a la puerta no es lo mismo que una sucesión disputada y no debería
   quitarle el turno. Es también la más cara.
2. **El techo sube de 5 a 6.** Se puso cuando el catálogo tenía diecisiete
   plantillas y ahora tiene veinte; seis por generación sigue siendo una
   decisión cada ocho años. Barato, y hay que decir en voz alta que es mover la
   raya después de ver dónde cayó el tiro.
3. **Menos comerciantes.** Dejar uno y guardar los otros dos hasta que haya
   sitio. Conserva el balance y desperdicia contenido ya escrito y probado.

**Lo que NO se hace:** ajustar reposos y pesos a ojo hasta que las once pruebas
del banco se pongan verdes. Eso es buscar la combinación que pasa el examen en
vez de decidir qué ritmo debe tener el juego.

#### El canal propio (v2.97 · construido y medido)

Los comerciantes **salen del sorteo de §8.6 y no gastan su reposo**. Siguen en
el catálogo para que la resolución, los textos y el guardado funcionen igual,
pero `eligible()` no los mira y `lastCrossroadTick()` no los cuenta. Tienen
reloj propio (`lastTradeTick`), flujo de azar propio (`traders`) y un
seleccionador aparte, `selectTrader`, deliberadamente mucho más simple: sin
exención de crisis, sin garantía por generación, sin novedad. **Un comerciante
es una oferta, no un dilema que la aldea tenga derecho a que le planteen.**

Dos reglas lo hacen un canal y no un segundo catálogo:

- **Nunca llega con una pregunta sin responder.** Una aldea que está decidiendo
  algo es una aldea por la que el buhonero pasa de largo.
- **Nunca llega en crisis.** Hay hambruna; no se compra sal.

| Medida | Sin comerciantes | En el catálogo | Con canal propio | Banda |
|---|---|---|---|---|
| Cadencia media, `prudent` | pasaba | 5,51 | **pasa** | 1–5 |
| Cadencia media, `first` | pasaba | 5,70 | **pasa** | 1–5 |
| Cadencia media, `worst` | pasaba | 5,92 | 5,07 | 1–5 |
| Cadencia máxima, `last` | pasaba | — | 7,59 | ≤ 7 |
| Extinción con `worst` | 11,7 % | 11,7 % | **15,0 %** | ≥ 25 % |
| Separación `prudent`–`worst` | 10,0 pts | 10,0 pts | **13,3 pts** | ≥ 20 pts |
| `forest_cut` elegible, `worst` | 4,39 % | 6,29 % | 4,52 % | < 1 % |

Once fallos del banco pasan a nueve, y los siete de siempre —los que v2.47 dejó
fuera de banda— siguen siendo los mismos. **Lo que no se esperaba es que el
comercio empujara el desenlace en la dirección correcta**: la extinción adversa
y la separación quedan mejor que antes de que los comerciantes existieran. La
explicación más probable es que vender el excedente cuesta `watched`, y una
aldea vigilada recibe más presión del señor; pero eso es una hipótesis y no está
medida por separado.

**Quedan dos al borde y se dicen en voz alta:** la cadencia media con `worst` en
5,07 contra un techo de 5, y una semilla suelta de `last` en 7,59 contra 7.

#### Cuánto comercio quiere la partida (v2.98 · medido)

La palanca obvia era alargar el reposo entre comerciantes, que es un parámetro
del contenido nuevo y no del balance cerrado. Se midió, y tiene precio:

| Medida | Reposo 18 años | Reposo 26 años | Banda |
|---|---|---|---|
| Fallos del banco | 9 | 8 | 0 |
| Cadencia media, `worst` | 5,07 | **pasa** | 1–5 |
| Extinción con `worst` | **15,0 %** | 11,7 % | ≥ 25 % |
| Separación `prudent`–`worst` | **13,3 pts** | 10,0 pts | ≥ 20 pts |
| `forest_cut` elegible, `worst` | 4,52 % | 4,06 % | < 1 % |

**Menos comercio es menos presión.** Alargar el reposo arregla la cadencia y
devuelve la extinción y la separación exactamente a la línea base anterior a los
comerciantes, deshaciendo lo único que se había ganado.

**Se conservan los 18 años.** El desenlace blando es el problema de fondo desde
§2.47 y tres puntos largos de extinción adversa y de separación valen más que
siete centésimas de cadencia. Es una decisión de diseño, no una medición: la
medición dice qué cuesta cada opción, y ésta es la que se elige.

**Y un dato que descarta una atribución:** la cadencia máxima de `last` da
**7,58893280632411 con los dos reposos**, hasta el último decimal. Ese pico no
lo causan los comerciantes y ya estaba ahí; buscarle culpa en el comercio habría
sido perseguir la pista equivocada.

**Efecto secundario que conviene recordar:** el banco de cobertura de
`tests/fast/catalog.test.ts` **reimplementa el tick por su cuenta** y no vio el
canal nuevo hasta que se le añadió a mano. Cualquier paso futuro del tick tiene
que tocar los dos sitios, y esa duplicación es deuda.

**Qué falsaría esto:** que un trato dejara a la aldea con más cabezas de las que
alimenta o con menos de cero, que la sal no cambiara nada en la matanza, que la
sal caducada siguiera valiendo, o que los tres comerciantes acabaran moviendo
los mismos números. Las cuatro tienen prueba y tres están verificadas por
mutación.

### 7.9 Lo que el mundo escribe en la gente

Hasta v2.99 **sólo las decisiones del jugador dejaban recuerdo**. Todo lo que el
valle hacía por su cuenta — un invierno con el granero vacío, una casa ardiendo —
le pasaba a una población, no a una persona.

Y había una prueba a la vista de que faltaba algo. Los tipos de recuerdo
`went_hungry` y `lost_home` **tenían su epitafio escrito en el banco desde
M-09** y ningún sistema los escribía nunca. Estaban esperando escritor desde el
principio.

| Suceso | A quién marca | Con qué peso |
|---|---|---|
| **Hambre** (§5.3) | A todos los que la viven y sobreviven | Según la gravedad, de `WEIGHT_MIN` al máximo |
| **Incendio** (§5.9) | Sólo a quien tenía ahí su casa | `LOST_HOME_WEIGHT`, fijo |

**La regla que gobierna esto: un recuerdo es de algo que le pasó A ALGUIEN**,
nunca de algo que le pasó a la aldea. Si un incendio marcara a los cuarenta
vecinos, todos acabarían cargando la misma lista de doce recuerdos idénticos y
el sistema entero dejaría de decir nada. Por eso el fuego mira `homeId` y un
granero ardiendo no deja a nadie sin casa.

**Un recuerdo por año, no uno por semana.** El hambre se calcula cada semana y
un mal invierno dura meses. Sin ese tope, una sola hambruna escribiría veinte
recuerdos y expulsaría todo lo demás que esa persona hubiera vivido: §6.4 da
doce huecos para una vida entera, no para una estación. Además es lo que una
persona llevaría de verdad — el recuerdo es «el año que pasamos hambre», no «la
novena semana».

**Se escribe antes de que muera nadie.** Un aldeano que se muere de hambre esa
misma semana no queda marcado y luego enterrado: los muertos tienen epitafio,
que es otra cosa distinta.

**Por qué esto importa más de lo que parece.** El valle ya tenía opiniones,
rencores y rasgos, pero se alimentaban casi sólo del catálogo. Con esto, un
suceso material se convierte en biografía, y la biografía es lo que §6 ya sabe
convertir en conflicto. **Es el primer puente entre lo que le pasa a la aldea y
lo que le pasa a la gente**, y es la dirección en la que crece todo lo demás.

**Qué falsaría esto:** que una hambruna larga escribiera un recuerdo por semana,
que un mal rato pequeño marcara igual que una hambruna, que el fuego marcara a
quien no vivía allí, que el peso no dependiera de la gravedad, o que escribir
recuerdos consumiera una tirada de azar. Las cinco tienen prueba y cuatro están
verificadas por mutación.

### 7.10 Los sucesos del valle (R-1, v3.75)

**El mundo pasa cosas por su cuenta.** Es la primera fase del rework que el
dueño del diseño pidió el 15 sep 2026 («mucho más aleatorio y con mucha más
vida»), y responde al diagnóstico de `docs/findings-drama.md`: todo lo
dramático colgaba de las encrucijadas, y las encrucijadas salen diez veces en
cuarenta años. Desde aquí, **cada semana el valle tira** (paso 2b de §4.2)
contra una tabla de doce sucesos; el que sale cambia el estado, escribe en la
crónica (`kind: 'happening'`, claves `fate.<id>`) y **se ve**, con los mismos
efectos visibles de §11.5 que las opciones de encrucijada. No hay nada que
decidir: pasan, como pasa un incendio.

**El azar.** Un flujo propio, `fate`, y ningún suceso toca otro (hay prueba).
El cielo de la semana —cuántas jornadas cerradas, de tormenta, de nieve— lo
decide el motor en `src/engine/world/sky.ts` con `hash32` y **sin consumir
tirada**, y la capa `derive` lo lee de ahí; así un rayo de §10.8 puede tener
consecuencias sin que el decorado mueva la simulación.

**La cadencia va con el tamaño de la aldea.** Una tirada por semana contra
`FATE.WEEKLY_CHANCE`, **repartida en proporción a la gente que hay**
(`FATED_FULL_PEOPLE`, `FATED_LEAST_SHARE`): un caserío de tres tiene una vida
callada y una aldea de cuarenta un noticiario. **No es un techo y no prohíbe
ningún suceso** —el rayo puede caer sobre la única casa de la pareja—, es una
proporción, y además es más variedad entre valles y no menos: una aldea que no
crece tiene otra historia que una que crece, y eso se compara.

Se escribió el 16 sep 2026 después de medir lo que pasaba sin ella, y por una
decisión del dueño del diseño: con la tirada plana, una pareja recibía los mismos
doce sucesos al año que una aldea de cuarenta —una catástrofe por trimestre— y
**ocho valles de doce se rompían antes de los cuarenta años**, con el ánimo por
debajo de 25 entre dieciocho y treinta y siete años de cada cuarenta. Sus
palabras: «que una partida salga mal por casualidad está bien, es parte del
juego, pero que casi todas se vayan a romper no es la idea; no hay que poner
límites, pero que tampoco sea una locura, hay que equilibrar». Con la proporción
puesta: **tres de doce se rompen** y los que aguantan llegan con entre 20 y 57
habitantes, en vez de 22, 9, 4 y 1.

Y nunca dos sucesos a menos de `FATE.MIN_GAP_WEEKS` (un suceso pegado a otro no se lee, se
apila). La fiesta de la cosecha es la excepción: **es un rito**, se celebra la
semana después de la siega si hay grano y gente, sin tirar y sin respetar el
hueco. Medido con seis semillas × cuarenta años (`tools/fate-report.ts`):
**13,0 sucesos al año, mediana de tres semanas entre dos**, y una distancia
media entre los repartos de dos valles de 0,16 (0 iguales, 1 nada en común).

**Los doce sucesos.** Cada uno tiene condición (estación, cielo, lo que hay en
pie), peso (multiplicado por los rasgos del valle: `old_forest` trae lobos y
osos, `bare_hills` aleja la riada), efecto y efecto visible. La tabla completa,
con los números, es §12.10; y el código que la lee es `weightOf` en
`src/engine/world/fate.ts`, una rama por suceso.

| Suceso | Cuándo | Qué hace | Se ve |
|---|---|---|---|
| El rayo | semana de tormenta, madera en pie | quema un edificio (casas antes) | la ruina |
| La riada | primavera tras tres jornadas de lluvia | se lleva grano | la aldea en el vado |
| Los lobos en el corral | invierno, con gallinas | una o dos gallinas menos | el corral vacío |
| La boda | seis adultos | ánimo y fe | la aldea en la capilla, dos días |
| El buhonero | verano, leña de sobra | leña por grano | la plaza |
| La buena pesca | primavera o verano con cielo abierto | grano | el vado |
| El tejado bajo la nieve | invierno, dos jornadas de nieve | una casa cerrada dos semanas, leña | — |
| La fiesta de la cosecha | rito: la semana después de la siega | ánimo y fe | la capilla, dos días |
| La riña en la plaza | dos nombrados | los dos que peor se llevan, peor todavía | la plaza |
| El oso en el bosque | verano u otoño, bosque | una bandera dos semanas, ánimo | — |
| El niño perdido | hay niños | ánimo; si es nombrado, con su nombre | el vado |
| El forastero | salvo valle hostil | ánimo | la plaza |

**Lo que esto cambia en el resto del sistema.** La riña de la plaza es **el
empujón que las opiniones nunca recibían**: baja la opinión mutua de los dos
nombrados que peor se llevan, y de ahí salen los rencores de §6.4 (de cero en
tres partidas de cuarenta años a entre 4 y 11) y con ellos las plantillas del
catálogo que los exigen. Las reuniones de suceso (`gather`) las sirve
`derive/gatherings.ts` **después** de las de decisión: si el jugador convocó,
manda el jugador. El estado guarda `happenings: HappeningRecord[]` (`tick`,
`id`, lo visible, y `who`: los `id` de los nombrados implicados, que es lo que
la capa de vida necesita para la riña de §7.9). `SCHEMA_VERSION` es 6.

**Lo que el dueño decidió después, y ya está hecho** (v3.76, `docs/rework.md`
§2.6): «que haya caos y que haya partidas que se rompan es la idea del juego».
Las dos puertas del rayo (`LIGHTNING_MIN_HOUSES`, `LIGHTNING_MIN_PEOPLE`),
puestas porque el rayo quemaba la única casa de la pareja y tres aldeas de seis
morían, **se quitaron**: `lightning_fire` sólo pide tormenta y madera en pie.
Medido en doce semillas a cuarenta años: 8 de 12 acaban (6 `abandoned`, 2
`extinction`) y 4 siguen. La prueba «el mundo sigue en pie» pasó a llamarse
«el caos es el juego: unos valles se rompen y otros no» y mide exactamente
eso.

**Qué falsaría esto:** un suceso fuera de su estación o de su cielo; dos
sucesos a menos del hueco (salvo la fiesta); un suceso que consumiera un
flujo que no sea `fate`; una clave sin sus tres variantes en el banco; dos
semillas con el mismo reparto; o una partida de treinta años sin un solo
rencor. Las siete tienen prueba en `tests/fast/fate.test.ts`.

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
  cost: string;                // clave: el precio, visible antes de elegir — CONTRATO (v2.25)
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

**Regla de la aldea madura (v2.45).** Una plantilla cuyas condiciones describen
una aldea **en crecimiento** queda muda en cuanto la aldea **ha crecido**, y el
juego se queda sin presión justo donde más la necesita. Medido en la v2.44:
`forest_cut` aparece **cero veces en 240 partidas** —pide `neededFields > fields`
y con ocho campos eso ya no ocurre nunca— y la categoría `faith` se desploma
entre un 72 % y un 100 % en la segunda mitad, hasta desaparecer con dos
políticas, porque `chapel_or_granary` tiene `maxPerGame: 1` y `relic_pedlar`
exige `faith` entre 30 y 70, franja de la que una aldea con iglesia sale para no
volver.

El patrón es el mismo en los dos casos: **una condición formulada sobre una
carencia o sobre un rango muere cuando la carencia se cubre o el estado se
estabiliza fuera del rango.** Es la cara opuesta de la regla episódica de más
abajo: allí el problema era una condición siempre cierta; aquí, una que deja de
serlo para siempre.

**Toda plantilla debe declarar qué la mantiene viva en una aldea de ochenta
habitantes con el mapa lleno**, o aceptar explícitamente que es contenido de la
primera mitad. El diagnóstico obligatorio del catálogo gana una tercera columna:
apariciones en los años 100–200 frente a los años 0–100.

**Regla de elegibilidad episódica.** Toda plantilla necesita al menos una
condición **episódica**: falsa la mayor parte del tiempo, que se vuelve cierta
por un suceso o al cruzarse un umbral. Las condiciones **ambientales**
—`people ≥ 12`, `has chapel`, `forestLeft > 0.3`— dicen **quién** puede recibir
la pregunta, nunca **cuándo** se hace.

Una plantilla solo con condiciones ambientales dispara siempre que el techo se
lo permite, y con dieciséis plantillas así el jugador percibe un metrónomo.
La aritmética es implacable: para que el intervalo medio ronde los 480 ticks con
un techo de 120, en la inmensa mayoría de los ticks **no puede haber nada
elegible**. Eso solo ocurre si cada plantilla es elegible unas pocas semanas por
siglo.

**Diagnóstico obligatorio del catálogo — dos columnas, no una.**

| Métrica | Qué revela | Remedio |
|---|---|---|
| **% de ticks elegible** | Si la plantilla es ambiental. Por encima del 1 %, lo es. | Darle un disparador episódico |
| **Disparos ÷ máximo que permite su reposo** | Quién marca de verdad el paso. Por encima del 70 %, **manda el reposo, no las condiciones**. | Alargar el reposo |

Las dos columnas hacen falta porque miden cosas distintas y se confunden con
facilidad: una plantilla puede bajar del 70 % de elegibilidad al 4 % y **seguir
disparando lo mismo**, porque a partir de cierto punto el que fija el ritmo es
su reposo. Endurecer condiciones deja de servir en cuanto la elegibilidad cae
por debajo de la tasa que impone el reposo; de ahí en adelante, el reposo es lo
único que queda antes del techo.

**El precio escrito es un contrato (v2.25).** El texto de `cost` es lo único que
el jugador ve antes de elegir, y es una promesa. **Si los efectos no la
entregan, la plantilla miente**, y lo que el jugador aprende no es a temer las
opciones duras: aprende que son palabrería, y a partir de ahí las escoge sin
mirar. Una opción cuyo precio dice «People will die this winter» y da `morale
+10` sin una sola muerte no es una decisión difícil mal calibrada — es una
decisión falsa.

La regla, entonces: **para cada opción, lo que promete la columna «Precio» tiene
que estar en sus efectos o en su semilla**, y una semilla solo cuenta si lo que
lleva dentro lo lee alguien. Una bandera que nadie lee no es un coste; es un
comentario.

Es una regla de revisión, no de código: no hay aserto que sepa leer inglés. Se
comprueba a mano cada vez que se toca una plantilla, y la auditoría completa de
las 48 opciones está en §2.25 — 13 mentían y 9 cumplían a medias, casi todas por
la misma causa: **catorce banderas que se ponen y nadie lee.**

### 8.2 DSL de condiciones

Datos, no funciones. Deben ser serializables para poder inspeccionar por qué se
disparó una encrucijada.

```ts
export type Condition =
  | { k: 'stat';    stat: 'grain'|'wood'|'morale'|'faith'|'people'; op: Op; v: number }
  | { k: 'ratio';   ratio: 'grainYears'|'grainToHarvest'|'housingFree'|'forestLeft'; op: Op; v: number }
  | { k: 'season';  season: Season }
  | { k: 'year';    op: Op; v: number }
  | { k: 'has';     building: BuildingKind }
  | { k: 'flag';    flag: string; set: boolean }
  | { k: 'outbreak'; active: boolean }
  | { k: 'role';    role: Role; alive: boolean }
  | { k: 'grudge';  min: number }            // existe una opinión ≤ −N (no el registro)
  | { k: 'trait';   role: Role; trait: Trait }
  | { k: 'not';     c: Condition }
  | { k: 'any';     cs: Condition[] };

export type Op = '<' | '<=' | '>' | '>=' | '==' ;
```

**Trampa de estación: el invierno es el momento MÁS lleno del granero.** La
cosecha cae en la semana 35 y el invierno empieza en la 36, así que `season =
winter` y «granero vacío» están **anticorrelacionados**. Ninguna plantilla de
escasez debe apoyarse en la estación: se apoya en `grainToHarvest`, que es la
magnitud que pregunta si se llega. Este fallo ya se cometió dos veces, en A.1 y
en A.4.

```ts
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

**Un hueco de reparto puede llegar a la pantalla, y está medido** (v3.67). El
banco no inventa nombres (§9.3) y `namesOf` deja el hueco tal cual, así que una
plantilla cuyo texto escribe una letra repartida a un **anónimo** se lee con la
llave puesta: el jugador leía «**{B}** was given the forge in year 26» en la
crónica de la semilla 23, año 26, con `feud_inherited`. La mayoría de los hijos
son anónimos —§6.1 deja ocho nombrados como mucho— y `childOf` reparte a
cualquiera **a propósito**: un papel que sólo acepta nombrados casi nunca se
cubre, y hay prueba de §8.3 que lo exige.

**El arreglo está escrito y no fusionado, y el motivo es de método.** Añadir
`named?: true` al `childOf` de esa plantilla lo cierra en tres líneas, pero
`fillCast` se evalúa en la elegibilidad de **cada tick**, así que cambiar su
lista de candidatos cambia el flujo `crossroads` y con él **la trayectoria de
todas las semillas**: medido, la prueba de la cadena de pases de V-09 pasó de
encontrar una cadena de cinco a no encontrar ninguna de tres en treinta
muestras. Es la trampa que `docs/handover.md` §4 ya tenía escrita —*tocar la
elegibilidad de una sola plantilla mueve el balance entero*— y por eso va con
el carril del ritmo de decisión, donde el recalibrado está presupuestado, y no
de propina en una ronda de texto. Queda declarado en `tests/fast/chronicle.test.ts`.

El reparto se resuelve **en orden de dependencia, no de declaración**: una
plantilla puede escribir `{as:'B', grudgeAgainst:'A'}` antes que `A` sin fallar
en silencio. Un ciclo entre dos letras devuelve `null` — la plantilla no es
elegible— en vez de colgarse.

**Y con vuelta atrás.** Elegir `A` a ciegas y preguntar después quién lo odia
acierta una vez de cada ocho, así que una plantilla puede cumplir sus `requires`
siempre y no repartir jamás: contenido muerto que **ninguna medición de
elegibilidad detecta**, porque las condiciones se cumplen perfectamente.
`fillCast` no puede elegir un vínculo que deje sin cubrir una letra dependiente:
si lo hace, deshace y prueba otro.

### 8.4 Efectos

```ts
export type Effect =
  | { k: 'stat';   stat: StatName; delta: number }
  | { k: 'stat';   stat: StatName; mul: number }
  | { k: 'kill';   who: 'random'|'weakest'|string; count: number | 'fraction'; fraction?: number }
  | { k: 'leave';  who: string; count?: number }
  | { k: 'arrive'; count: number }
  | { k: 'flag';   flag: string; years: number }   // 0 = permanente
  | { k: 'build';  kind: BuildingKind; free: true }
  | { k: 'destroy'; kind: BuildingKind; count: number; blockYears?: number }
  | { k: 'fell'; wood: number; permanent: boolean }
  | { k: 'harvest'; factor: number; harvests: number }
  | { k: 'outbreak'; weeks: number }
  | { k: 'opinion'; from: string; to: string; delta: number }
  | { k: 'memory'; who: string; kind: MemoryKind; about?: string; weight: number }
  | { k: 'role';   who: string; role: Role | null }
  | { k: 'lit';    kind: BuildingKind; on: boolean };

export type VisualEffect =
  | { k: 'raise';   kind: BuildingKind }
  | { k: 'ruin';    kind: BuildingKind }
  | { k: 'banner';  colour: string; years: number }  // estandarte sobre el núcleo
  | { k: 'douse';   kind: BuildingKind; who?: string }  // apagar un edificio;
                                                      // `who` = letra del reparto
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

**Los dientes salen de componer, no de subir números (v2.25).** Cuando el
catálogo resulte blando —y §2.25 lo mide: `worst` termina el 8,3 % de las
partidas— la respuesta **no** es multiplicar los efectos. Una decisión mala debe
ser **sobrevivible**; tres seguidas, no. Efectos más grandes hacen que una sola
tirada liquide la partida, y eso choca de frente con el principio de
«decisiones raras y pesadas» de §8.6: si la primera te mata, no hay segunda, y
la aldea deja de ser una historia para ser una moneda al aire.

Lo que sí compone es esto: que el coste **caiga sobre lo que la aldea necesita
para absorber el siguiente golpe**. Vaciar el granero no mata a nadie esa
semana; deja a la aldea sin colchón para el invierno que viene. Quemar un campo
no mata a nadie; baja el techo de la cosecha durante años. Esa es la diferencia
entre un juego donde equivocarse duele y uno donde equivocarse mata.

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
         · storyMultiplier(t)           // reputación y protección; ver abajo
         · traitMultiplier(t)           // rasgos del reparto
         · noveltyMultiplier(t)         // ×0.4 si ya salió en esta partida
pick weighted by score, from the 'crossroads' stream
```

**El componente `story`, y cómo se compone (v2.43).** Las semillas pueden
modificar el peso de una categoría: es lo que el Anexo A prometía desde la v2.0
para `a_name_in_the_valley` (×0,5 sobre `lord`) y `behind_the_wall` (×0,4 sobre
`lord` y `stranger`), y lo que `feud_ripe` hace al revés (×4 sobre `feud`).

**Varios modificadores sobre la misma categoría NO se multiplican: gana el más
fuerte.** El muro y la reputación dicen lo mismo —«a esta aldea se la molesta
menos»— así que son la misma dimensión, no dos dados independientes.
Multiplicándolos, 0,4 × 0,5 = 0,2, y una tercera semilla dejaría la categoría
muda; con el máximo, quedan en 0,4 y el efecto sigue leyéndose. Los otros
multiplicadores —crisis, novedad, rasgo— sí se multiplican entre sí, porque cada
uno mide algo distinto. Como red de seguridad, el componente `story` nunca baja
de **0,25**.

Esto importa más de lo que parece: `behind_the_wall` dura 20–40 años y
`a_name_in_the_valley` 5–15, así que caen justo en la fase tardía, cuando la
aldea es más fuerte y el juego más necesita presión exterior. Silenciar ahí
`lord` y `stranger` es quitarle dientes al catálogo precisamente donde ya se ha
medido que no los tiene.

**Crisis** = hambruna proyectada —`grain < people · (semanas que faltan hasta la
semana 35)`, es decir, la despensa no llega a la próxima cosecha—, brote activo,
bandera `threatened`, o muerte del líder.

**La exención se gasta en la primera pregunta.** Una crisis y la sucesión se
saltan el techo de 120 ticks, pero **una sola vez por episodio**, no mientras
dure la condición. Una hambruna dura meses y un puesto vacante dura hasta que
alguien lo toma: una exención que valiera todo ese tiempo dispararía la misma
encrucijada cada dos ticks y convertiría la decisión en un menú. §6.6 dice que
la sucesión se dispara «siempre» al morir el líder: **una vez por muerte, no una
vez por tick.**

**Garantía por generación:** si han pasado 960 ticks sin ninguna encrucijada, se
fuerza la de mayor puntuación aunque no sea crisis. Si no hay ninguna elegible
—cosa rara— se usa la plantilla de reserva `quiet_years`, que ofrece al jugador
qué hacer con un excedente.

**Techo:** una cada 120 ticks (30 minutos reales a ×1). Las encrucijadas tienen
que seguir siendo raras o dejan de pesar.

**Cómo se comprueba que el ritmo es sano.** No basta con contar encrucijadas por
partida: hay que mirar **qué fracción de los intervalos queda pegada al techo**.
Si el techo manda casi siempre, el jugador percibe un metrónomo en vez de un
mundo, aunque el total parezca razonable.

| Señal | Diagnóstico | Remedio, en este orden |
|---|---|---|
| La garantía se dispara a menudo | Casi nada resulta elegible | Aflojar condiciones del catálogo |
| **> 40 % de intervalos al ras del techo** | Manda el reloj, no el contenido | Endurecer condiciones; luego subir cooldowns; **subir el techo es el último recurso** |
| < 40 %, y la garantía a cero | Sano | — |

Se mide con el catálogo real de 16 plantillas, sobre 20 semillas × 100 años.

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
`renderEntry` elige una de las 3–5 variantes de esa clave y sustituye los
parámetros.

**Componer no consume aleatoriedad.** La variante es una **función pura** de la
semilla maestra, la clave, el tick y un discriminante que distingue dos entradas
de la misma clave en el mismo tick (su posición en `chronicle` sirve). El flujo
`chronicle` es la fuente de la semilla, no un flujo que se avance: nadie lo
consume nunca. Si cada render gastara una tirada, desplazar la crónica en
pantalla y volver reescribiría la historia de la aldea — y el aislamiento de
§4.3 dejaría de significar nada.

**La capitalización se resuelve al componer**, no escribiendo mejor las
plantillas: el mismo hueco `{count}` va al principio en unas líneas y a mitad de
frase en otras. Si la sustitución cae en la primera posición, se capitaliza.

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
aparece al desplegar un año. **Cualquier volcado de crónica —pantalla, runner de
consola, parte de bienvenida— aplica el filtro.** Volcar los tres pesos produce
un registro de obra, no una crónica.

**Tabla de pesos, normativa:**

| Peso | Qué |
|---|---|
| **3** | Fundación, extinción, muerte de un nombrado, sucesión, encrucijada y su consecuencia diferida, brote de peste, hambruna con muertos |
| **2** | Cosecha excepcional (ruinosa o abundante), llegada o marcha de gente, incendio, edificio **singular** terminado (capilla, iglesia, fragua, molino, pozo, primer granero), rencor formado |
| **1** | Todo lo demás: casas, campos, graneros posteriores, **cada tramo de empalizada o muro**, cosecha normal, nacimientos y muertes corrientes, cambio de estación |

**Y se agregan por año.** Varias entradas de la misma clave en el mismo año se
componen en una sola línea con su recuento: veintiún tramos de empalizada son
*«The palisade closed around the village that year»*, no veintiuna líneas. Sin
esto, un año de obra sepulta la peste, la decisión y los muertos que lo rodean —
que es exactamente lo que pasó en la primera lectura del hito 0.

El **parte de bienvenida** al volver de una ausencia muestra, como máximo: el
titular de peso 3 más reciente, hasta 4 entradas de peso 2, y un resumen
numérico de lo que cambió (gente, edificios levantados o perdidos). Las cuatro
plazas toman primero el suceso más reciente de cada `ChronicleKind`; si quedan
plazas, se completan con una segunda aparición reciente de cada tipo, nunca una
tercera. El resultado se lee en orden cronológico.

### 9.3 Regla de escritura

Los textos son cortos, concretos y sin adjetivar. Nombran a la gente, el año y
la cifra. El drama sale del suceso, no de la prosa — si hay que adornar la
frase para que sea interesante, el suceso no lo era y el problema está en el
cruce de sistemas, no aquí (`valle.md` §8).

Prohibido en el banco de textos: signos de exclamación, segunda persona,
metáforas, y cualquier frase que valore la decisión del jugador. La crónica
narra, no juzga.

### 9.4 La muerte de un nombrado

Una muerte corriente es una línea de peso 1. **La de un nombrado es de peso 3**,
y no puede limitarse a decir el nombre y la edad: tiene que cargar con quién fue
esa persona. Al componerla se le añade una subordinada, eligiendo en este orden:

1. Su **rencor abierto más antiguo**. Antiguo, no hondo: una enemistad de treinta
   años dice más de quién fue alguien que una del invierno pasado.
2. Si no tiene ninguno abierto, su **rencor sanado más largo**. Un arco cerrado
   es tan buen epitafio como uno abierto, y da una de las mejores líneas que
   puede escribir este juego: *«They had not spoken for seven years, and then
   they had.»*
3. Si tampoco, su **memoria de mayor peso**.
4. Si no hay nada, la variante desnuda: nombre, estación y edad.

> *Aethelred died in the winter of year 14, sixty-eight winters old. He had not
> spoken to Wulfnoth since the year 5.*

Sin esa segunda frase, los tres momentos que definieron a Aethelred —la disputa
del año 5, la reconciliación del 12 y su muerte en el 14— quedan en la crónica
como tres líneas sueltas que ningún lector enlaza, y el personaje se muere sin
haber existido. Es el mismo mecanismo que las semillas de §8.5 aplicado a las
personas en vez de a las decisiones: **el material narrativo del juego no está
en los sucesos, está en los enlaces entre sucesos separados por años.**

La sucesión que sigue a la muerte de un líder cita también a quién sucede.

### 9.5 Criterio del hito 0

Tres crónicas de tres partidas distintas, leídas por alguien ajeno al proyecto,
que sepa contar en qué se diferencian. **Esto es lo que decide si el proyecto
sigue.**

---

## 10. Render

**Lo que el jugador ve es el 3D del Anexo D, y este capítulo describe el Canvas
2D que sigue debajo como puerta de vuelta.** Hasta G-12 (14 sep 2026) era al
contrario: §10 era el juego y el Anexo D un piloto. La migración estaba escrita
en el brief de G-12 —«§10 y §11 describen ahora el comportamiento aprobado»— y
**no se hizo**: el commit de G-12 tocó cinco ficheros de código y ninguno de
documentación, así que durante un día este capítulo describió un juego que ya no
se jugaba. Corregido al auditar (v3.66).

Qué manda sobre qué, para que no haya que deducirlo:

| Qué se pinta | Dónde manda | Dónde vive |
|---|---|---|
| El valle, la gente, los animales, el relieve | **Anexo D** (geometría, cámara, luz) y **Anexo E** (quién se mueve y por qué) | `src/render3d/` |
| Las pantallas, la tira, las encrucijadas, la crónica | **§11**, para los dos renders | `src/ui/` |
| Lo que el estado dice antes de pintarlo | Este capítulo y §11.6 | `src/derive/` |
| El valle en Canvas, con `?render=canvas` | Este capítulo, §10.1 a §10.7 | `src/render/` |

**Lo que no cambia con la migración, y es lo que hace que §10 siga valiendo:**
el render **lee** el estado y no lo modifica nunca, ni en 2D ni en 3D. Es un
test de arquitectura, y desde v3.66 hay dos: `src/render/` no importa nada que
mute `GameState`, y `src/derive/` —la mitad de §10 que los dos renders
comparten— no importa nada que dibuje.

**Cuándo se borra §10.** Cuando alguien haya abierto el juego en un teléfono de
verdad y funcione. Todo lo medido de rendimiento es de un portátil (G-09 quedó
parcial por no haber dispositivo), así que hasta entonces hace falta algo a lo
que volver esa misma tarde. Está escrito en §1 y en `docs/roadmap.md`.

### 10.0 El Canvas, de aquí abajo

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
| `meadow` | `#96b562` | `#99aa52` | `#a89a55` | `#d9dde0` |
| `meadowAlt` | `#7fa050` | `#8fa14c` | `#98884a` | `#c9ced3` |
| `field` | `#95924a` | `#d2b258` | `#d0b05a` | `#cfd4d6` |
| `forest` | `#4f7a3c` | `#46703a` | `#8a6f33` | `#3d5544` |
| `forestDark` | `#3c6030` | `#35562c` | `#6a5326` | `#2e4235` |
| `water` | `#6ca0ba` | `#69a2b2` | `#6c96a7` | `#aebfc6` |
| `rock` | `#9a968f` | `#a39e94` | `#a09a90` | `#8e939a` |
| `path` | `#b49e76` | `#bfa77d` | `#b89e75` | `#b4b0a6` |
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
- **Ruina heredada.** La máscara de una aldea anterior se lee como una sola
  cimentación baja: `palette.rock` a alfa `0.58`, con trazo únicamente en los
  bordes cardinales expuestos, color `outline(palette.wood)` y ancho
  `max(1 px, cell · 0.10)`. No se repite el sprite `ruin` por celda: a 10 px se
  convierte en textura y deja de leerse como la huella de un poblado.

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
| `mill` | Torre + aspas de 4 trazos en orientación fija. Una animación futura exige capa dinámica, estado de viento y presupuesto propios (§2.51) |
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

Cada aldeano vivo tiene un `anchorHome` y un `anchorWork` **derivados y
cacheados, nunca guardados en `GameState`** (su casa y su campo, taller o el
bosque; ver §2.52). El ciclo cosmético del día tiene cuatro tramos:

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

### 10.8 El cielo (U-13, v3.73)

Lo pidió el dueño del diseño el 15 sep 2026, y es el último de sus cinco pasos:
«el siguiente paso es crear efectos meteorológicos, como tormentas con rayos».

**Es presentación, y el motor no se entera.** El clima del motor se tira una vez
al año (§5.1, `rollWeather`, flujo `weather`) y de ahí sale el factor de
cosecha; meter clima semanal en el motor movería el balance de sesenta semillas
y rompería los guardados para pintar nubes. Así que el cielo se **deriva**
(`src/derive/weather.ts`): la fila del año dice cuánto llueve en este valle, la
estación dice si cae agua o nieve, y un `hash32` de la jornada dice qué toca
hoy. No consume ni una tirada —hay prueba— así que añadir esto no desplaza una
sola cosecha, y dos partidas con la misma semilla llueven igual.

| Cielo | Cuándo | Qué se ve |
|---|---|---|
| `clear` | el 79 % de las jornadas | nada |
| `overcast` | 7 % | la luz baja y el cielo se va al plomo |
| `rain` | 6 % | mil doscientas rayas cayendo torcidas |
| `storm` | 4 %, nunca en invierno | lluvia, la luz al 40 %, de dos a siete rayos |
| `snow` | 3,5 %, sólo en invierno | ochocientos copos, lentos y con vaivén |

Medido con `tools/sky-report.ts` (seis semillas, sesenta años): unas dieciséis
tormentas al año, o una cada tres semanas. Y **el año manda**: un valle ruinoso
tiene el cielo cerrado el 33,9 % de las jornadas y uno abundante el 9,2 %, así
que el cielo cuenta lo mismo que la cosecha y dos valles del mismo año se ven
distintos — que es la esencia del juego según su dueño.

**La luz.** `daylightAt(phase, speed, overcast)` aplica el cielo **antes** del
aplanado por velocidad, para que una tormenta a ×64 siga siendo una tormenta: lo
que `LIGHT_STEADY` aplana es la hora, no el tiempo que hace. El sol pierde toda
su intensidad a tope de tormenta —es lo que quita las sombras duras—, el
ambiente pierde mucho menos (un valle bajo la lluvia se sigue viendo) y el cielo
se va al plomo un 25 % más deprisa que el resto, porque es lo primero que se ve
de una tormenta. `daylight` baja con ella, así que **las ventanas se encienden
de día**, que es lo que hace una casa cuando se pone oscuro a mediodía.

**Lo que se dibuja.** Tres mallas y ni una más (`effects/weather.ts`, D.9): una
tira de segmentos para la lluvia, un puñado de puntos para la nieve y una malla
de tres hebras para el rayo. Se construyen al abrir y se reutilizan; lo que
cambia con el cielo es cuántas se dibujan (`setDrawRange`), no cuántas existen.
Con cielo claro están invisibles y no cuestan nada.

**El rayo, con dos decisiones medidas en captura:**

- **Cae en el corazón del valle** (§7.1, `HEART`) y no en cualquier punto del
  mapa. El mapa son 72 × 112 celdas y la vista de reposo enseña unas 26: un rayo
  repartido por todo el mapa caía fuera de cámara nueve de cada diez veces.
- **Mide veinte celdas y son tres hebras.** Con cuarenta, la cámara isométrica
  lo proyectaba como una raya que cruzaba la pantalla de esquina a esquina y
  dejaba de leerse como un rayo; con una sola hebra de un píxel, a la distancia
  de reposo era un pelo indistinguible del borde de un árbol.

El destello dura `SKY.FLASH_SECONDS` de reloj **real** —un destello es un
destello a cualquier velocidad— y **en pausa no se apaga**, como todo lo que se
mueve (§11.4); eso es además lo que permite fotografiarlo, porque 0,12 s no los
alcanza ninguna captura corriendo. El trueno llega entre 0,4 y 2,2 s después,
porque el sonido va más despacio que la luz: el renderer **cuenta** los rayos
(`GraphicsStats.bolts`) y `app.ts` truena, así que el render sigue sin saber que
existe el sonido.

**Y se puede mirar desde fuera:** la raíz lleva `data-sky` y `data-bolts`, la
ruta de depuración acepta `&weather=storm`, `&weather=snow` y `&weather=wet`
—adelantan el valle hasta una jornada con ese cielo, porque esperarla no es una
forma de probarla— y hay un recorrido en `valley.shots.ts` que cuenta el rayo y
deja la captura. **En invierno hay que pedir `snow`**: aquí no truena, así que
pedir tormenta en invierno se salta la estación entera buscando una que no puede
haber, y eso costó tres años de valle en la primera medida de la nieve. El
trueno se comprueba con `tools/graphics/thunder-check.mjs`, que engancha el
`AudioContext` de verdad y cuenta los filtros que aparecen tras cada rayo.

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

**Esta tabla es de estados, y por sí sola no basta** (§11.6, v2.84): ninguna de
sus filas dice que algo *acabe de ocurrir*, y una aldea donde solo se ven
condiciones es una aldea donde el jugador no se entera de nada.

#### 11.1.1 · Dos excepciones a «ni una cifra» (v3.53)

**La regla se relaja, y se relaja por lo que se vio jugando.** Con el catálogo
de G-10 puesto, el valle está lleno y aun así el jugador mira la pantalla y no
sabe qué está pasando: sabe que hay gente andando. Las señales diegéticas de la
tabla de arriba son **lentas** —el granero tarda una estación en vaciarse— y
**mudas sobre las personas**: dos vecinos que se odian desde hace diez años se
cruzan en el campo y no se nota nada.

Se añaden dos elementos, y **sólo dos**:

**1. La tira de la aldea.** **Cinco cifras desde M-0** (17 sep 2026), arriba,
pequeñas y siempre visibles: **gente**, **comida** en semanas, **leña**,
**piedra** y **plata**. Son las que deciden si la aldea vive y lo que el
jugador puede gastar: la gente es el juego, la comida es la muerte por hambre
de §5.3, la leña es el invierno de §5.5 y las obras de §7.3, y la piedra y la
plata son la mesa sobre la que se juega (§7.2, §7.8).

**Y el ánimo dejó de ser una cifra: es la cara del chip de la gente.** Lo pidió
el dueño del diseño —«la felicidad creo que no varía nada, siempre está en 55,
50, 60»— y medido tenía media razón: el número **sí** se mueve (de 6 a 79 en
sesenta años, y el 17 % de las semanas por debajo de 10) pero **vive a escala de
años** —lo mueve la cosecha, una vez— y se mira a escala de semanas, así que en
una sesión no se mueve y se lee como un número muerto. Una cara con cuatro
gestos (`MOOD_FACE`) dice lo mismo sin prometer una precisión que no tiene, y el
número exacto sigue a un toque, como todo lo demás en esta sección. La fe
tampoco entra: sigue siendo las velas de la capilla.

El grano se enseña **en semanas de comida y no en unidades**, porque la unidad
es «una persona una semana» y lo que el jugador decide con ella es cuántas
semanas aguanta: la división ya la hace el juego en vez de pedírsela a él.

> **Lo que decía esta sección hasta M-0, y por qué cambió.** Decía: *«Oro y
> piedra no existen en la simulación … un contador de monedas sería un número
> inventado … si algún día hay moneda, **se decide en el motor y llega aquí
> después**»*. Era correcto y esa última frase es exactamente lo que ha pasado:
> el dueño del diseño pidió las dos el 17 sep 2026 —«no tenemos la piedra … y
> sería clave alguna moneda»— porque desde el juego de los medios
> (`docs/plan-medios.md`) el jugador **paga con lo del valle**, y una economía
> con la que se paga tiene que estar en pantalla.
>
> Las dos se decidieron en el motor primero: la piedra era ya trabajo (§7.2) y
> pasa a ser existencia con el mismo coste, y la plata entra por §7.8 y sale por
> el diezmo. Ninguna es un número inventado: las dos tienen de dónde vienen y a
> dónde van.

**2. La burbuja de estado.** Una nube pequeña sobre la cabeza de quien está
viviendo algo, con un icono. **Sólo sale de estado con fecha**, nunca de una
tirada del render (§4.3):

| Burbuja | De dónde sale |
|---|---|
| Duelo | Una muerte reciente de padre, madre o hijo (`diedTick` y `parentIds`) |
| Nacimiento | Un hijo nacido hace pocas semanas (`bornTick`) |
| Riña | Un rencor de §6.4 formado hace pocas semanas (`formedTick`) |
| Charla | Los encuentros de §11.9, que ya se derivan para mover a la gente |

**El orden importa y es el de arriba**: quien acaba de enterrar a un hijo no
enseña que acaba de ser padre. Una persona lleva una burbuja o ninguna.

**Nada de lo que le pasa a la aldea entera va en la burbuja**, y se probó al
revés: con un brote puesto, los cuarenta llevaban una cruz sobre la cabeza y la
pantalla dejaba de decir nada. El hambre y la peste son de la aldea, y la tabla
de §11.1 ya las cuenta donde se leen — la peste vuelve a ser **una cruz pintada
en la pared junto a la puerta**, que es lo que esa tabla dice con esas palabras
y lo que dejó de ser cuando hubo que sacarla del muro en v3.42.

**Lo que esto no es.** No es un panel de estadísticas ni un árbol de menús. Las
cifras exactas siguen estando a un toque, la ficha sigue siendo la de §11.2, y
la pantalla del valle sigue sin tener más controles que la velocidad.

### 11.2 Pantallas

Cinco en la partida, y una antes de ella. **Y dos de esas cinco no son rutas,
son superposiciones**, que es la distinción que el rediseño de interfaz obligó a
escribir (UI-R0, 16 sep 2026): hasta entonces la lista de abajo mezclaba las dos
cosas y una carcasa de navegación no se puede construir sobre una lista así.

- **Rutas**, lo que la bandeja enseña y entre lo que se navega: **el valle**, la
  **crónica**, la **gente** (U-08, que esta lista no contaba y existe desde
  entonces), la **ficha** y **el carro** (M-2, 17 sep 2026). Son las cinco de
  `SheetRoute` en `src/ui/redesign/contracts.ts`.

  > **El carro sustituye a las órdenes.** Hasta M-2 la quinta ruta era la hoja
  > de las **tres palancas permanentes** de la versión 2.0 —cuánto se siembra,
  > dónde van las manos que sobran, qué se levanta antes—, y se retiran por
  > decisión del dueño del diseño («no me gustan para nada», 17 sep 2026) con la
  > medida detrás: sólo vivía la postura de fábrica, y a dos muescas del reposo
  > se moría media aldea, tarde y sin aviso (`docs/plan-medios.md` §1). Lo que
  > ocupa su sitio es **lo que el jugador puede dar al valle** (§7.12): tres
  > cosas, lo que cuesta cada una en fichas de recurso, y el motivo escrito
  > cuando no se puede dar. Se abre desde la línea de la bandeja donde vivía el
  > resumen de las órdenes, y la pestaña encendida sigue siendo el valle: es una
  > hoja del valle, no un destino.
- **Superposiciones**, que no son rutas porque no se navega a ellas ni se sale
  de ellas al valle por la barra: la **encrucijada**, que ocupa la pantalla
  entera y manda sobre cualquier ruta (punto 3 de abajo), y el **epitafio**, que
  sólo existe cuando la aldea ha terminado (punto 5).

**Y de toda ruta se sale, siempre** (U-14, v3.73, pedido por el dueño del
diseño: «no hay forma de volver atrás»). No es una anécdota de una ronda: es la
regla, y cualquier panel nuevo la cumple o está roto.

**Y las tres rutas que se ven son la misma hoja de papel** (VZ-2, 17 sep 2026,
pedido por el dueño del diseño: «queda fatal cuando cambias entre pestañas;
quiero llegar a algo más genérico»). El valle, la crónica y la gente comparten
**un canto, un papel y una textura**: el canto es el desgarro de
`.skin-torn-top`, el papel es `--skin-page` con su grano, y lo único que
distingue a una sección de otra es **cuánto alto ocupa**. Las tres
superposiciones —la decisión, el epitafio y el parte de §9.2— son la misma hoja,
sólo más alta. Y se cierran con una cruz pequeña sobre el papel o deslizando
hacia abajo, nunca con una placa flotando sobre el valle.

**0. El menú de inicio** (U-10, v3.70). Lo pidió el dueño del diseño el 15 sep
2026 con la premisa del juego: la gracia es **comparar valles**, así que lo
único que se configura es **el número del valle**, un entero de 32 bits que
`makeBundle` toma tal cual. Dos personas con el mismo número fundan el mismo
valle —misma pareja, mismo río, mismo bosque— y cada una lo lleva a su manera.
Sobre la noche (`--night`), no sobre el valle, porque el juego no existe
todavía: el filete y el nombre en latón arriba, y abajo el número (editable,
con «Another» para echar otro que no repita ninguno jugado), «Found a new
valley» en el mismo oro que «Begin again», y la preferencia de sonido. «Continue»
sólo cuando hay una partida guardada **y no ha terminado**: si terminó, lo que
toca es fundar de nuevo sobre sus ruinas (§13.3), y eso lo hace el menú por su
cuenta. Vive en `screens/title.ts`, se abre desde `main.ts` antes de `boot` y
sólo en la ruta normal: las rutas de depuración no la ven. Playwright la pasa
como el dedo (`passTitle`) y `shot.mjs` acepta `--seed N` para escribir el
número y `--open title` para fotografiar el menú.

**0b. El inicio guiado** (U-11, v3.71). Al fundar un valle **la vista baja
desde la sierra hasta la aldea** en `TIME.INTRO_FLIGHT_MS`: «la aldea al
principio debe verse desde lo alto, así impresiona más ver lo grande que es el
mapa» (dueño del diseño, 15 sep 2026). Es cámara y no juego —`flyIn` en el
contrato del renderer, `lift` en la cámara para bajar la altura sin el recorte
ni el desplazamiento de centro de `zoom`, y con el reloj **real**
(`realDeltaSeconds`), no el escénico, que lleva la velocidad y se para en
pausa—: arranca en `furthest` (la sierra, D.6.8), no toca el estado, no gasta
tiempo, y cualquier gesto
lo interrumpe donde esté porque la vista es del jugador. Aterriza exactamente
en el reposo de D.6.3. Quien pide menos movimiento no vuela. Después, **dos
pistas** la primera vez que se funda en ese navegador (`valley.guided`): dónde
están las órdenes y dónde el tiempo, en la voz del juego, y se tocan para
pasar. No es un tutorial (U-04 sigue): son dos frases. La raíz lleva
`data-intro` (`flight` → `hints` → `done`) para poder mirarlo desde fuera.

**1. El valle.** Por defecto. Arriba a la izquierda, **el reloj** (U-12, v3.72);
abajo a la derecha, los controles de velocidad. Nada más.

El reloj son dos líneas y reemplaza al título «ANNO I», que se queda donde
sigue teniendo sentido: las cabeceras de año de la crónica. Arriba **la hora**
—`HH:00`, en la voz del juego y con cifras de ancho fijo, porque un reloj que
baila al pasar de las 09:00 a las 10:00 se lee como un error—; debajo **la
fecha**: año, estación y día de la estación, de 1 a 84 (doce semanas de siete).

**La hora es la del sol que se ve, y eso es la mitad del trabajo.** El día y la
fecha salen del motor (`derive/clock.ts`, del tick y su fracción); la hora sale
de la fase de la jornada a través de `hourAt` (`render3d/effects/day-phases.ts`),
que **interpola entre los momentos que el cielo ya tiene marcados** —alba 05:00,
mediodía 12:00, anochecer 19:00, noche cerrada 22:00—. No es una regla de tres,
y la razón está medida: la jornada escénica comprime la noche (le da el 86 % de
sí misma a la luz), así que multiplicar la fase por veinticuatro pone el alba a
la 01:26. La primera captura de U-12 salió con **la 01:00 sobre un valle a pleno
sol**, y de ahí sale la interpolación.

El precio de una noche corta: las horas no duran todas lo mismo de tiempo real
—las de la madrugada pasan en un segundo y medio a ×1, las de la mañana tardan
casi siete—. La alternativa era un reloj que no cuadra con lo que se ve.

Y se puede comprobar desde fuera, que es lo que impide que esto se rompa en
silencio: la raíz lleva `data-sun-phase` con la fase de la última jornada
pintada, y un recorrido de `valley.shots.ts` compara `hourAt` de esa fase con lo
que dice la cabecera.

**2. Ficha.** Se despliega desde abajo al tocar. Para un edificio: qué es, cuándo
se levantó, quién lo usa, la cifra relevante. Para un nombrado: nombre, edad,
rasgos, dos líneas de memoria y sus opiniones fuertes.

> **VZ-6 — y qué está haciendo ahora mismo.** «Today: carrying timber» va bajo
> la placa del nombre, y **su dato no sale del motor**: sale del actor que la
> capa de vida está pintando en ese fotograma (`ActorDoing` en
> `render3d/contracts.ts`, por `backend.live.doing`). UI-V4 la dejó fuera por
> eso mismo y con razón — derivarla del oficio, la estación y las órdenes daba
> una frase que podía decir que alguien acarrea madera mientras se le ve parado
> en la plaza. Nueve palabras, ninguna inventa un destino (la vida sabe qué
> lleva y en qué tramo va, no a qué edificio), la carga manda sobre el tramo, y
> **quien ya no está no tiene línea**: una ficha no le inventa un presente a un
> muerto. Con el lienzo 2D no hay línea, porque no simula cuerpos.

**3. Encrucijada.** Ocupa la pantalla entera, se abre con el valle atenuado
detrás. Título, tres o cuatro frases de contexto, y las opciones como bloques
grandes con **el verbo y el precio**, siempre visible el precio. Sin botón de
cerrar: se decide o se vuelve al valle con gesto, y la encrucijada sigue
pendiente con una marca discreta.

> **VZ-6, 17 sep 2026 — y aplazada deja ir a mirar otra cosa.** §8.6 dice que
> una decisión aplazada **espera, no caduca**, y eso sólo sirve si se puede ir a
> ver la crónica antes de contestar. No se podía: el pintado devolvía la ruta al
> valle en cada fotograma mientras hubiera decisión pendiente, aplazada
> incluida. VZ-03 lo cerró al separar la decisión aplazada de la planteada, y de
> ahí se desbloquea además **el documento sellado** de la crónica, que sólo
> existe habiendo decisión pendiente y por tanto era inalcanzable por
> construcción — se ha visto en captura por primera vez hoy
> (`artifacts/vz6-sealed.png`).
>
> La marca discreta es **el sello de lacre en el ornamento de la bandeja**
> (VZ-03) y hay tres puertas de vuelta: el sello, el documento sellado de la
> crónica —que lleva al valle, donde el sello espera— y el paso del tiempo, que
> no la quita. Con una trampa que costó una prueba: el ornamento llevaba
> `pointer-events: none` de cuando era sólo una hoja de roble decorativa, así
> que **el sello no se podía pulsar** y el lienzo 3D se comía el toque. La
> excepción va atada a `:disabled`: decoración no recibe toques, control sí.
> `?crossroad=1` en las rutas de depuración abre un valle con una decisión sin
> contestar, que es lo que hace fotografiable todo esto.

> **U-14, v3.73 — y hay forma de volver atrás.** Lo dijo el dueño del diseño
> mirando el juego: «cuando entras a ver a los aldeanos o el historial, no hay
> forma de volver atrás». Era cierto: las dos pantallas se cerraban **sólo**
> deslizando hacia abajo, y su velo (z-index 13) tapaba la barra de destinos, de
> modo que quien entraba se quedaba dentro. Tres cosas lo arreglan, y las tres
> son lo que un dedo espera: **la barra de destinos se queda encima** de las dos
> pantallas (z-index 14; la encrucijada y el epitafio la siguen escondiendo por
> clase), **es una barra de pestañas de verdad** —la encendida dice dónde estás,
> tocar «Valley» vuelve, tocar la otra cambia— y **cada pantalla lleva su botón
> de cerrar**, porque a la crónica se llega también con un gesto y un gesto no
> explica cómo se sale. El deslizamiento se queda: era correcto, estaba solo. Las
> dos pantallas dejan un hueco abajo para la barra, y avisan al cerrarse
> (`onClose`) para que la pestaña encendida no se quede encendida sin pantalla.
> La raíz lleva `data-screen`, que es con lo que se comprueba desde fuera.

**4. Crónica.** Lista desplazable por años. Al abrir tras una ausencia, encabeza
el parte de bienvenida (§9.2). Si el archivo contiene aldeas anteriores, una
banda fija permite alternar entre «This valley» y cada antepasada, de más
reciente a más antigua. La banda queda dentro de esta pantalla: no abre otra.
Usa fondo `#14130f`, etiqueta dorada `#c9b46b` a `12 px/1.2`, hueco de `6 px` y
margen inferior de `18 px`. El selector mide al menos `44 px`, con relleno
`9 px 34 px 9 px 11 px`, borde `#756c55` de `1 px`, radio `8 px`, fondo
`#24221b` y texto `#f2f4f6` a `14 px/1.2`. Se fija `20 px` por encima del borde
de desplazamiento para compartir el área segura y no tapar el primer año.
Cuando se abre desde el epitafio ocupa una capa superior; al cerrarse devuelve
el mismo epitafio, sin resolver ni reiniciar la aldea.

**5. Epitafio.** Solo aparece al terminar una aldea. El valle permanece detrás
con un velo `rgba(18,17,14,0.78)` y los controles desaparecen. La tarjeta ocupa
el ancho inferior: relleno superior `max(24 px, safe-area)`, horizontal `20 px`
y fondo `max(28 px, safe-area)`. Título Georgia `23 px/1.2`; texto de cuerpo
`14 px/1.4`, `#d7dadd`. Las acciones se separan `10 px`, empiezan `22 px` bajo
el resumen y miden al menos `48 px` de alto, con relleno `12 × 14 px`, radio
`10 px` y Georgia `15 px/1.2`. La secundaria usa fondo blanco al 10 % y borde al
40 %; «Begin again» usa fondo y borde `#d8c574`, texto `#242016`. El año de la
causa es civil (`yearOf(endedTick) + 1`); la duración son años completos
(`yearOf(endedTick)`). Contiene causa, duración, pico, «Read the chronicle» y
«Begin again»; no se cierra con un toque accidental.

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

### 11.4 La interfaz no anima sobre el reloj del navegador

**Ninguna animación de interfaz puede depender del reloj del compositor.** El
juego tiene su propio reloj y el jugador lo controla: pausa, ×1, ×4, ×16, y el
letargo de §13.2 que ejecuta **960 ticks en menos de dos segundos**. Una
transición CSS corre sobre un reloj que no tiene ningún motivo para coincidir con
ninguno de esos, y en cuanto los dos discrepan la interfaz se queda a medias.

Se descubrió en M-22 y no lo cazó una revisión visual: lo cazó una prueba de
reloj falso que encontró el zoom **atascado a mitad de recorrido**. El arreglo
fue sustituir la transición por un corte seco.

La regla, generalizada:

- Lo que representa el estado del juego se anima con **la fracción del tick**,
  nunca con tiempo de pared. La multitud de §10.6 ya lo hace bien.
- Lo que es afordancia para el humano —el enfoque de dos segundos de §11.2— sí
  puede usar tiempo real, pero **debe tener un estado bien definido en todo
  instante y sobrevivir a un salto de reloj**. Si no se puede garantizar, corte
  seco.
- **El caso de prueba es el letargo.** Cualquier animación que no aguante 960
  ticks en dos segundos está mal, y ahí es donde se comprueba.

### 11.5 Cuando el efecto visible no tiene sitio

Los `VisualEffect` no traen coordenada. El motor la deriva al aplicarlos y solo
usa el centro del núcleo (`valleyCore`) cuando la identidad concreta no existe:

| Efecto | Por qué no tiene celda | Deuda |
|---|---|---|
| `banner` | Es sobre el núcleo por definición | Ninguna: correcto |
| `gather where:'ford'` | Los caminos no pueden pisar agua: el cruce literal no existe | Resuelta en v2.66: orilla transitable contigua al río más cercana al núcleo |
| `scar:'felled_wood'` | `fellForest` **sí** elige celda | Resuelta en v2.66: devuelve también la primera celda tocada |
| `douse` con varias instancias | El esquema nombra el **tipo**, y la plantilla quiere **una** | Contrato: ver abajo |

**`douse` gana `who`.** A.7 promete apagar «el edificio de B» y el esquema solo
sabía decir «un edificio de este tipo»: apagaba una casa cualquiera. Es la misma
mentira que §8.1 persigue en la columna del precio, en la columna del efecto
visible. Con `who` —una letra del reparto— se resuelve al edificio de esa
persona. Si no se puede resolver y hay varias instancias, conserva el respaldo
del núcleo; escoger la primera por orden convertiría una falta de identidad en
una identidad falsa.

**Y enfocar es mover la cámara, no escalar un lienzo** (VZ-6, 17 sep 2026).
Contestar una encrucijada mira a la celda del primer efecto visible del tick:
`screens/crossroad.ts` lo pide por `app.look`, que baja por `backend.live.look`
hasta `view.look` del renderer. Antes escalaba `#valley` con un `transform` y un
`transform-origin` en tanto por ciento, que funcionaba porque el lienzo 2D
dibuja el mapa entero — y **dejó de hacer nada el día que el 3D relevó**
(UI-V10 lo esconde en cuanto el piloto carga), sin que nada lo dijera: el
recorrido que lo vigilaba leía ese mismo `transform`, así que se quedó verde
midiendo un lienzo oculto y luego declarado como fallo. Es el caso de libro de
la regla de `CLAUDE.md`: una prueba que llama al camino muerto no sabe si el
juego llama al vivo.

Mueve el **centro** y no la altura —acercarse es del jugador (§11.2)— y cuenta
como mover la cámara: apaga el vuelo de entrada y pone `disturbed`, o el
encuadre automático del pintado siguiente se comería el enfoque.

### 11.6 Los sucesos se ven, no solo los estados

**Las siete filas de §11.1 son estados y ninguna es un suceso.** Cuánta gente,
cuánto grano, si hay hambre, el ánimo, la fe, la peste, la estación: todas
describen una condición, ninguna dice que *acaba de pasar* algo. Escrito así,
el valle es una pantalla donde nada ocurre nunca, y eso es exactamente lo que
midió la primera sesión humana real (§2.84): veinte años en los que la aldea
repelió un asalto a su granero, enterró a alguien muerto a manos de otro,
perdió una casa en un incendio, encendió su fragua y eligió líder — y el
jugador vio gente andando.

**Cuando ocurre algo de peso 2 o 3, su propia línea de la crónica aparece sobre
el valle unos segundos.** No es un HUD: §11.1 prohíbe cifras y aquí no hay
ninguna, es la voz de §9 puesta donde el jugador ya está mirando en vez de
detrás de un gesto que puede no hacer nunca. El filtro es el de §9.2 y no otro,
para que «ha pasado algo» signifique lo mismo en la crónica y en el valle.

**Y de ahí sale la regla que v3.68 tuvo que escribir después de romperla: un
estado no se convierte en aviso repitiéndolo.** El dueño del diseño dijo dos
veces que los mensajes eran «horrorosos» y las dos veces se buscó el fallo en la
redacción. `tools/notice-report.ts` lo midió: **2 831 de los 3 309 avisos de
cinco partidas de cuarenta años eran la misma clave** —la temporada de caza,
quinientos sesenta y seis por partida, catorce al año—. La frase daba igual; a
la décima vez cualquier frase es ruido.

Cazar y pescar es un estado —el granero está bajo y hay gente en el monte—, y
los estados van a la tira de §11.1. El **suceso** es que la temporada empiece.
Escrito como regla, con sus dos cotas medidas en
`tests/journeys/notices.test.ts`:

- **Ninguna voz se queda con el valle:** ninguna clave puede pasar de un tercio
  de los avisos de una partida. La más repetida se queda hoy en el 29 %.
- **El valle no habla más de seis veces al año** en ninguna semilla. Medido:
  entre 2,7 y 4,3.

**Los hitos hablan en presente y sin fecha.** La cartela sale en el instante en
que pasa la cosa, así que «the first house went up in the spring of year 4»
—pasado, y con la fecha que la cabecera está mostrando— era un libro de
historia interrumpiendo a quien lo está viendo ocurrir. La crónica sigue en
pasado, que es donde el pasado es lo correcto.

Reglas:

- **Se retira sola.** Es un aviso, no un panel: nada que cerrar.
- **Corte seco, nunca desvanecido**, y por el motivo de §11.4: una animación
  sobre el reloj de pared es lo que un salto del reloj del juego pilla a medias.
- **Durante un letargo no habla.** Novecientos ticks de avisos son un teletipo;
  esa ausencia la cuenta el parte de bienvenida de §9.2.
- **Cede la pantalla.** La encrucijada y el epitafio la ocupan entera y el aviso
  se retira.

**El valle habla desde un sitio** (VZ, 17 sep 2026, pedido por el dueño del
diseño: «estos mensajes que salen por encima no cuadran con la interfaz; haz un
plan para reestructurarlo»). Lo que acaba de pasar, lo que la aldea está
haciendo, la pista del inicio y el hito se leen en **la bandeja**, bajo la hoja
de roble, **una frase cada vez y por prioridad**: hito, suceso, pista, estado.
Nada transitorio flota sobre el valle; sólo las superposiciones de §11.2 —la
encrucijada y el epitafio— y el parte de §9.2 lo cubren, y las tres apartan la
bandeja mientras están abiertas.

Tres consecuencias que son norma y no implementación:

- **El hueco de la voz mide siempre lo mismo** —dos líneas—, así que la bandeja
  no cambia de alto y nada de lo que hay encima se recoloca nunca. Antes de esto
  la bandeja crecía cuando la aldea tenía dos cosas que decir, y cada ronda de
  interfaz volvía a ajustar a mano lo que se le montaba arriba: la cartela del
  hito, la píldora de la decisión y los círculos de velocidad, tres piezas con
  tres geometrías.
- **No hay cola.** Un suceso nuevo sustituye al anterior y el anterior queda en
  la crónica. Es la regla de `docs/visual-reference/README.md` §5 —«más de un
  aviso: uno según prioridad, sin una cola interminable de cartelas»— y la que
  hace imposible el teletipo que esta sección midió.
- **La caducidad se mide contra el reloj de pared en cada pintado**, no con
  temporizadores. Cumple §11.4 mejor que un `setTimeout`, que un salto del reloj
  del juego deja a medias: una resta tiene estado definido en cada instante.

Y un hito se distingue de un suceso corriente porque **la hoja de roble del
ornamento se pone en oro** mientras habla, no porque interrumpa con una cartela
propia. Una decisión aplazada se coge por el **sello de lacre**, que ocupa el
sitio de la hoja mientras espera (§8.6: no caduca).

Esto es lo mínimo honesto y **no es el vocabulario visual definitivo**: qué
dibujo merece una muerte, una cosecha perdida o un asalto pertenece al trabajo
de arte, y llegará con él. Lo que esta sección fija es que el valle tiene que
contar lo que pasa, no solo cómo está.

### 11.8 Que la decisión se vea, no solo se enfoque

**El diagnóstico, medido.** El catálogo tiene 56 opciones. En 42 de ellas el
efecto visible declarado no cambiaba absolutamente nada en el valle.

| | |
|---|---|
| Opciones del catálogo | 56 |
| Opciones cuyo efecto visible no cambiaba nada | **42** |
| Opciones con más de un efecto visible | 0 |
| Por tipo | `gather` 25, `raise` 13, `douse` 8, `scar` 5, `banner` 4, `ruin` 1 |

**Lo que NO estaba roto**, y conviene decirlo porque la primera lectura de esta
auditoría fue equivocada: la interfaz sí consume `TickReport.visualEffects` y sí
enfoca la cámara dos segundos sobre la celda, que es exactamente lo que el
contrato de M-22 y §11.2 prometen. El hito 2 está donde dice que está.

**Lo que faltaba** es que el *tipo* de efecto no llegaba a la imagen. Un
estandarte sobre el núcleo, una reunión en la capilla y una cicatriz de tala
producían los tres el mismo resultado: un acercamiento. Y como sólo `raise` y
`ruin` van acompañados de un cambio de estado real —una obra abierta, un
edificio perdido—, las otras 42 opciones enfocaban un sitio donde no había nada
que ver. **Es la explicación más probable del veredicto humano de §16.3**, que
dijo literalmente que las decisiones no parecían tener efecto.

#### `gather`, el primero (v3.00)

25 de las 42, y el más fácil de creer: la aldea se junta en la plaza, en la
capilla o en el vado, y se ve porque la gente está en otro sitio.

**Derivado, sin estado nuevo.** No se guarda nada. El historial ya dice qué se
decidió y en qué semana, y el catálogo dice qué efecto visible tenía esa opción;
con eso se sabe si hoy hay reunión y dónde. Es el mismo trato que §10.6 da a la
multitud y §7.7 al ganado, y cumple §11.4 por construcción: no hay animación en
marcha que un salto de reloj pueda dejar a medias.

**El sitio se recalcula con el valle de hoy**, no con el de la semana en que se
decidió: si la capilla ardió entretanto, la gente se junta donde puede juntarse
ahora.

**`days` se lee como ticks, no como séptimos de semana.** A ×1 un tick es un día
en pantalla (§10.6), así que una reunión de cuatro días que durase medio tick no
se vería nunca. Es una decisión y queda anotada para la revisión artística.

#### `banner` y `douse` (v3.01)

Mismo trato y mismo módulo hermano: derivados del historial, sin estado nuevo.

| Efecto | Qué se ve | Cuánto dura |
|---|---|---|
| `banner` | Un paño de color sobre un asta, en el núcleo | Los `years` que diga, **y `0` es para siempre** |
| `douse` | Ese edificio se queda sin humo, sin luz y sin velas | `MARKS.DOUSE_TICKS` |

**`years: 0` es para siempre**, la misma convención que las banderas de §3.1.
Leerlo como «dura cero» dejaba muerto justo el estandarte que más significa: el
gris de `winter_grain_debt.kneel`, el de haberse arrodillado ante el señor, que
debía quedarse izado el resto de la partida. Es un ejemplo exacto de lo que
persigue esta sección — el efecto estaba escrito, y no se veía.

**`douse` no trae duración en el esquema**: dice qué se apaga, no cuánto. La
pone `MARKS.DOUSE_TICKS`, porque un apagón eterno es un edificio roto y uno de
un solo tick no se ve por encima de ×4.

**Con `who`, se apaga la casa de esa persona.** El reparto va guardado en la
decisión, así que aquí se resuelve igual que lo resolvió el motor en v2.66.

#### Una discrepancia encontrada al hacerlo

De las ocho opciones que declaran `douse`, **seis no cambian ningún estado** y
las otras dos apagan un edificio **distinto del que prometen**: el efecto
visible dice `house` y el efecto de motor apaga `smithy`.

No es un error. `douse` es representacional por definición —§8.1 dice que
`visible` es «lo que la opción cambia en pantalla»— y en `smith_feud` la
lectura es buena: te pones del lado de uno, la casa del otro se queda a oscuras
esa temporada, y la fragua se apaga de verdad porque el herrero enfadado no
trabaja. Queda anotado porque un lector futuro puede tomarlo por un descuido.

#### Deuda declarada

- **`scar` sigue sin representarse.** De sus tres variantes sólo `grave_row` es
  reconstruible; `burnt_field` y `felled_wood` dependen de qué ardió o se taló
  aquella semana concreta y no se pueden derivar del historial sin guardarlas.
- ~~**El vado se aproxima por el núcleo.**~~ **Saldado en v3.48.** El motor
  exporta su `ford` desde G-10, porque el render 3D necesitaba poner las piedras
  de paso donde el vado está de verdad, y el 2D lo usa de camino. Las reuniones
  en el vado se dibujaban en el centro de la aldea, que es donde no está.
- **Arte de prueba.** Todo lo de esta sección es geometría y posiciones, sin
  sprites nuevos. El aspecto definitivo lo gobierna el Anexo D.

**Qué falsaría esto:** que tras una decisión con `gather` la gente estuviera
donde mismo, que la reunión no se acabara nunca, que contaran decisiones
futuras, o que dibujarla escribiera en el estado o consumiera una tirada.

**Una nota sobre las pruebas de esto**, porque costó verla: el estado de partida
de una aldea de veinte años cae en un tick múltiplo de cuatro, que es **domingo**
y en domingo la gente ya se junta en la plaza por su cuenta. Una prueba que
compare «aldea con reunión» contra «aldea sin reunión» sin mover el reloj está
comparando domingo contra reunión, y pasa aunque la reunión no mueva a nadie. Lo
destapó una mutación. Cualquier prueba futura sobre la multitud tiene que elegir
un día laborable a propósito.

### 11.9 La vida del día

**El diagnóstico vino de jugar, no de leer.** El segundo veredicto humano
(§16.4) dijo que la aldea era «aburrida, repetitiva y que no cambia nada; los
aldeanos se mueven todos los días igual». Era literalmente cierto, y en cuatro
sentidos que se pueden medir por separado.

| Lo que pasaba | Por qué | Medido |
|---|---|---|
| Todos salían y volvían a la vez | El desfase por persona era del 4 % del día | Dos picos de movimiento y un valle muerto en medio |
| Todos iban al mismo sitio | Cada uno elegía el destino más cercano **a su casa**, y las casas están juntas | 4–5 destinos distintos para toda la aldea |
| Amontonados en una celda | El destino era un punto, no un área | 145 parejas superpuestas con 32 figuras |
| Nadie hablaba con nadie | No existía el concepto | — |
| El año no se notaba | En enero se salía al campo igual que en julio | 92 % en los campos las cuatro estaciones |

#### Lo que se hizo

**Cada uno tiene su jornada, y cambia cada semana.** Cuándo sale, cuánto se
queda y cuándo vuelve salen de la persona y del tick. Los críos y los viejos la
dan por terminada antes. El resultado es que en cualquier instante del día hay
alguien saliendo, alguien trabajando y alguien volviendo, en vez de cuarenta
personas haciendo lo mismo.

**La tierra se reparte.** Los labradores se distribuyen entre los campos por su
rango en la cuadrilla, y entre los que les tocan van al más cercano. La
distancia deja de decidir **a qué campo** se va y pasa a decidir **a cuál de los
suyos**. De 4–5 destinos a 6–9.

**Trabajar es moverse.** Cada uno recorre su parcela un par de veces por
jornada, con rumbo y ritmo propios para que dos vecinos no vayan acompasados.

**Y la gente se para a hablar.** Dos que coinciden cerca pueden pararse un rato
a media jornada. **Lo decide la opinión** (§6.4): por debajo de `COLD_BELOW` no
se paran jamás, y cuanto mejor se llevan más a menudo lo hacen. Una aldea unida
tiene corrillos y una rota por las rencillas se queda en silencio, y eso se ve
desde fuera sin leer una línea de crónica. **Es la primera vez que el sistema de
opiniones se lee fuera del catálogo.**

**El invierno vacía los campos.** No se ara la tierra helada: se va al bosque a
por la leña que §5.4 quema, y si no queda bosque, a la obra. Medido: 0 % en los
campos en invierno contra 92–96 % el resto del año.

#### La aldea se entera de lo que le pasa (v3.05)

Ardía una casa y la gente seguía camino del campo. Se moría alguien y nadie
levantaba la cabeza.

No hace falta inventar ningún suceso: el estado ya guarda los que ocurrieron
**esta misma semana**. Un edificio con `lostTick` igual al tick de hoy se acaba
de perder; un nombrado con `diedTick` de hoy es alguien a quien están
enterrando ahora.

**El orden es el de la urgencia.** Lo que acaba de pasarle a la aldea manda
sobre lo que el jugador decidió, y las dos cosas mandan sobre el domingo y sobre
el trabajo: se te quema una casa y no te vas al campo.

**Una muerte anónima no para el valle.** Sólo los nombrados tienen entierro con
gente (§6.1). Si cada muerte anónima detuviera la aldea, no se trabajaría nunca.

#### Los oficios se ven (v3.05)

§5.2 cuenta brazos, no personas: dice cuántos labran, nunca quiénes. Así que el
herrero labraba, el cura labraba y la comadrona labraba, y **los ocho con
nombre —los únicos que el jugador sigue— eran ocho figuras más andando hacia el
mismo campo**.

| Oficio | Dónde pasa el día |
|---|---|
| Herrero | La fragua |
| Cura | La iglesia, o la capilla |
| Alguacil | El granero |
| Líder | El pozo |
| Comadrona y guardabosque | Sin taller fijo, que es cierto en los dos casos |

Es **sólo presentación**: no toca el reparto ni la economía. Cambia dónde se
dibuja a esa persona, no lo que la aldea produce. Por eso vive en `crowd.ts` y
no en `world/paths.ts`, que sí alimenta el desgaste de caminos. Y si la fragua
se pierde, el herrero vuelve al campo en vez de quedarse plantado en un solar.

#### Y los que no trabajan (v3.05)

Quien no tenía trabajo esa semana recibía una ruta de una sola celda —su propia
puerta— y se quedaba ahí de sol a sol. Eran media docena de figuras inmóviles
en cada partida. Ahora hacen un recado por el pueblo, y uno distinto cada
semana: el pozo, el granero, la capilla, la fragua, el molino.

**Los críos no.** A un niño de cinco años no se le manda a por agua al otro lado
del valle: se quedan delante de su casa, sólo que moviéndose el doble que un
adulto. Es el movimiento que más se ve, porque ocurre donde el jugador mira.

#### El paso y el carril (v3.06)

Dos vecinos con la misma ruta iban **por la misma línea exacta y a la misma
velocidad**, uno tapando al otro: en pantalla eran una figura, no dos. Ahora
cada uno se aparta un poco del eje del camino y anda a su propio paso, así que
el viejo llega más tarde que el mozo aunque salgan juntos.

#### Los rencores se ven (v3.08)

Que dos enemigos no se paren a hablar era sólo la mitad de la historia. La otra
es que tampoco pasan la jornada uno al lado del otro como si nada: se apartan.
Cada uno se aleja de aquel con quien peor se lleva **de los que tiene cerca**,
porque apartarse de alguien que está al otro lado del valle no significa nada.

Con esto, un rencor de §6.4 deja de ser una fila en un registro que el catálogo
consultará dentro de veinte años, y pasa a ser dos personas trabajando de
espaldas en el mismo campo.

#### La convivencia (v3.09)

Hasta aquí **todas las fuerzas sobre las opiniones empujaban hacia abajo**: el
hambre le pasaba factura al líder y las riñas hundían a los que ya se detestaban.
Lo único que subía era el olvido de §6.4, que lleva todo hacia cero y nunca por
encima. Un mundo así acaba siempre en un valle de gente que no se aprecia.

Segar el mismo campo un año tras otro con la misma persona acerca. Es lento a
propósito: hacen falta años para igualar una sola discusión, que es como
funciona de verdad.

**Tiene que ganarle al olvido, o no sirve de nada.** El primer valor probado
—0,04— estaba por debajo de `OPINION.DRIFT_PER_WEEK`, que es 0,05, así que la
convivencia no llegaba nunca a superarlo: la mejor opinión de cinco partidas de
120 años era **0,6**. Con 0,12 sube a 11,5.

**Y no sube sin techo.** Por encima de `CEILING` la convivencia deja de dar: se
puede llegar a apreciar a alguien de tanto trabajar con él, no a quererlo como a
un hermano. Para eso hacen falta las cosas que cuenta el catálogo.

#### El bucle que esto destapó

Al añadir la convivencia, las riñas se dispararon de 21 a **224** en cinco
partidas de 120 años. No era la convivencia: era un bucle que ya estaba y que
hasta entonces el olvido tapaba.

> Una riña hunde la opinión → una opinión más baja hace más probable la
> siguiente → y los que se detestan **no trabajan juntos**, porque se apartan
> (v3.08), así que la convivencia no les llega nunca.

Dos que se pelean cada tres semanas durante treinta años no son dos enemigos:
son un mecanismo atascado. El freno es `QUARREL.REPEAT_TICKS`, y no necesita
estado nuevo — el recuerdo que dejó la última riña hace de marca de tiempo.

| Freno | Riñas en 5 partidas de 120 años |
|---|---|
| Ninguno | 224 |
| Cinco años | 6 |
| **Dos años** | **18** |

Dieciocho es lo que había antes de que la convivencia existiera (21), así que el
equilibrio se conserva: la aldea tiene ahora afectos **y** enemistades, y ni una
cosa ni la otra se desbocan.

#### Las dos deudas de rendimiento (v3.14)

**Perfilado de verdad**, con `--cpu-prof`, en vez de a ojo. Tres partidas de 150
años:

| Qué | Cuánto |
|---|---|
| `route` + su montículo (Aê) | **29 %** |
| `tick` | 4,9 % |
| `banksOf` | 2,1 % |
| El resto | repartido en trozos de menos del 2 % |

**El Aê se llama 20.474 veces por partida de 150 años**, 2,84 por tick. No es
que se llame de más: es que la caché por par de celdas se vacía entera cada vez
que cambia el coste del suelo, y **el suelo cambia 631 veces por partida** —una
cada once ticks— porque los caminos se refuerzan solos (§7.6). 631 × 30 rutas
≈ las 20.000 medidas.

**Bajar eso exige tocar el tráfico, que es balance.** No invalidar, invalidar
menos a menudo, o invalidar sólo las rutas afectadas: las tres cambian qué
celdas se pisan, y después de un siglo eso es otra aldea. Queda como decisión
abierta y no se toca sin decidirlo.

**Tres optimizaciones probadas, dos revertidas por medirlas:**

1. **Reutilizar los tableros del Aê** entre llamadas, con un sello de
   generación, para no reservar tres `Int32Array` por ruta. **Peor**: 5,7 s
   pasaron a 7,6. Reservar un array en V8 sale más barato que comprobar un
   sello en cada acceso. Revertida.
2. **Escribir ese acceso en línea** para quitar las closures. Mejor que el
   punto 1 pero peor que no hacer nada. Revertida también.
3. **El intercambio del montículo sin desestructurar.** `[x, y] = [y, x]`
   reserva un array por intercambio y eso corre una vez por nivel en cada
   empuje. **Un 6 %**, y se conserva.

**Y una lección sobre medir:** la línea base se movió de 5,7 s a 7,7 s entre dos
tandas sin cambiar nada, por carga de la máquina. Cualquier comparación de
rendimiento aquí necesita medirse **en la misma tanda** y por mínimos, no por
una sola lectura.

#### La suite rápida (v3.14)

De 34 s a **30,6 s**, partiendo `sim.test.ts` en tres. Vitest reparte por
fichero y no por prueba, así que un fichero de 35 s era un suelo que no bajaba
por muchos núcleos que hubiera — y el primer reparto dejó 33 s de 35 en un solo
lado, que es no repartir.

**No se ha tocado ni una aserción, y las 840 pruebas siguen siendo 840.** Mover
una prueba para que corra en paralelo es legítimo; recortarla para que tarde
menos sería esconder el problema.

**Lo que queda es carga, no ejecución:** 20,9 s de los 30,6 son `collect`, es
decir transformar y cargar los módulos. Compartir el módulo entre ficheros
(`isolate: false`) se probó y **no mejoró** — 31,2 s —, así que se descartó.
Sigue por encima de los 20 s de `CLAUDE.md`.

#### Los guardas se ven (v3.12)

§7.7 descuenta la vigilancia del mordisco de los cuervos desde v2.93, y en la
imagen no se notaba: mandabas gente a espantar pájaros y veías exactamente los
mismos pájaros. Ahora la bandada mengua con la cobertura.

**Vigilar espanta, no borra.** Con vigilancia completa queda el 40 % de la
bandada: un guarda ahuyenta cuervos, no los saca del valle, y un campo sin un
solo pájaro en agosto se lee como un campo muerto.

**Hallazgo anotado, y descoloca un poco:** en una partida corriente **la
cobertura está casi siempre al máximo**. Los guardas se sirven de los brazos
que sobran antes que el bosque y las obras, así que rara vez faltan. Dos intentos
de prueba lo destaparon — uno variaba la despensa, que no toca la vigilancia, y
otro vaciaba la aldea, que baja los campos trabajados y la vigilancia necesaria
a la vez. La regla está bien puesta; lo que casi no ocurre es el escenario en
que se nota. Si alguna vez se quiere que se note, hay que hacer que los guardas
compitan de verdad con algo.

#### La densidad, contra el veredicto que la motivó (v3.11)

§11.6 nació de una cuenta: en la primera sesión humana (§16.3) pasaban entre
**0,0 y 0,6** sucesos notables cada cinco minutos, y el jugador dijo que no
pasaba nada. Es la misma cuenta, con todo lo que §7.7, §7.8 y §7.9 han añadido:

| Velocidad | Semanas en 5 min | Sucesos de peso ≥2 |
|---|---|---|
| ×1 | 20 | **2,8** |
| ×4 | 80 | 21,2 |
| ×16 | 320 | 99,0 |
| ×64 | 1280 | 397,4 |

A velocidad normal sale algo digno de contarse **cada dos minutos**. A ×16 casi
uno cada tres segundos, que ya es más de lo que nadie lee — pero a esa velocidad
no se juega para leer, se juega para ver pasar los años.

**Qué falsaría esto:** que una sesión de cinco minutos a ×1 sobre una aldea
asentada volviera a caer por debajo de uno.

#### El banco después de la vida nueva (v3.10)

| Medida | Antes de §11.9 | Con la vida nueva | Banda |
|---|---|---|---|
| Tiempo del banco | ~11 min | **18,1 min** | ≤ 15 min |
| `forest_cut` elegible | 2,6–4,5 % | **en banda** | < 1 % |
| `smith_feud` elegible | falla en 1 política | **falla en 4** (1,3–4,0 %) | < 1 % |
| Extinción con `worst` | 15,0 % | 11,7 % | ≥ 25 % |
| Separación `prudent`–`worst` | 13,3 pts | 10,0 pts | ≥ 20 pts |
| Cadencia media, `worst` | 5,07 | 5,02 | 1–5 |
| Fallos totales | 9 | 10 | 0 |

**Lo mejor no se buscaba.** `forest_cut` llevaba fuera de banda desde v2.47, y
ninguno de los ajustes de aquella fase lo movió. Lo ha arreglado el invierno:
mandar a la aldea al bosque cuatro meses al año tala más, el bosque baja antes,
y la plantilla sale en vez de quedarse esperando elegible.

**Lo peor tampoco.** `smith_feud` pasa de fallar en una política a fallar en las
cuatro. La explicación más probable es que ahora hay más rencores vivos (§7.9)
y esa plantilla los mira, pero **es una hipótesis y no está medida por separado**.

**Y el desenlace vuelve a la línea base.** La extinción adversa y la separación
pierden lo que habían ganado con el canal de comerciantes. No se toca nada para
recuperarlo: sigue siendo la decisión de diseño abierta de §7.8.

**El tiempo es deuda declarada.** 18,1 minutos contra 15. Tres optimizaciones lo
bajaron desde 43, y la siguiente exigiría medir con perfilador en vez de a ojo.

#### Lo que dio el bloque entero, medido

| Medida | Al empezar | Al terminar |
|---|---|---|
| Figuras tapadas por otra, por instante | 145 | **9,6** |
| Aldea en movimiento en un instante cualquiera | dos picos y un valle muerto | **75 %** |
| Repiten sitio de una semana a otra | casi todos | **6 de 32** |
| Destinos distintos | 4–5 | **6–9** |
| Gente clavada el día entero | media docena | **0** |
| Presencia en los campos en invierno | 92 % | **0 %** |

#### Las riñas (v3.07)

§6.4 sabía escribir rencores desde M-05, con su causa, su curación y una
velocidad de perdón que cambia con los rasgos. **Y no hacía nada con ellos.** Un
rencor abierto era una fila en un registro: nadie discutía, nadie se gritaba,
nadie dejaba de hablarse en la plaza. Sólo servía para que el catálogo pesara
más una plantilla de rencilla veinte años después.

| | |
|---|---|
| **Cuándo** | Un rencor vivo, ya cocido, y la opinión todavía por debajo del umbral de curación |
| **Qué pasa** | Casi siempre voces delante de todo el mundo; de vez en cuando, manos |
| **Qué deja** | Se llevan peor que antes, y cada uno recuerda de quién fue la culpa |
| **Quién estalla** | El de genio vivo mucho antes que el manso |

**Los rasgos por fin deciden algo.** De los quince de §6.3, sólo dos cambiaban
comportamiento —`hardy` y `frail`, sobre la mortalidad—; los otros trece
inclinaban qué encrucijada sale y ahí se acababan. `hot_tempered`, `spiteful` y
`kind` deciden ahora si el asunto estalla o se aguanta un año más. Medido: con
el rasgo del genio vivo, la proporción frente al manso es de 1226 a 1; sin él,
de 20 a 1.

**Frecuencia medida:** unas seis por siglo y partida, con un rencor de cada
cinco llegando a las manos. Ni cero —el sistema estaría muerto otra vez— ni una
taberna. Y no se realimenta: los rencores totales pasan de 20 a 22 en cinco
partidas de 120 años.

#### Lo que costó la vida nueva (v3.07)

La vida del día de §11.9 no salió gratis, y el banco lo dijo antes que nadie.

| | Antes de v3.03 | Con la vida nueva | Tras optimizar |
|---|---|---|---|
| Tres partidas de 150 años | 3,3 s | 11,0 s | **5,7 s** |
| Banco de §12.9 | ~11 min | **43 min** | por medir |

**La causa fue el invierno.** Mandar a la aldea entera al bosque significaba
buscar, para cada persona y cada semana, la celda más cercana entre las
**quinientas** arboladas del valle. Antes sólo lo hacían los pocos leñadores.

Tres arreglos, y el orden en que se probaron importa porque el segundo salió al
revés:

1. **Rutas cacheadas por par de celdas**, no por persona. Dos que van del mismo
   sitio al mismo sitio comparten, y al volver el verano la ruta al campo sigue
   guardada. De 11,0 s a 6,2 s.
2. **Recortar el bosque a lo cercano al pueblo** (`LABOUR.WOOD_CHOICES`), que
   además de barato es más cierto: se tala cerca. Sin cachear el recorte
   **empeoró** —de 6,2 s a 7,0—, porque ordenar quinientas celdas cada tick
   costaba más que el problema. Cacheado, 5,8 s.
3. **La clave de la caché de destinos, un número en vez de una cadena.** Seis
   centenares de caracteres por tick, en cada semilla de cada política. Efecto
   marginal, 5,7 s, y se conserva porque no cuesta nada.

**Deuda declarada:** la suite rápida está en 34 s contra los 20 de `CLAUDE.md`.
Parte es contenido nuevo con sus pruebas y parte es que la simulación hace más
cosas por tick. Sigue sin resolverse y no se resuelve escondiendo pruebas.

#### Las reglas que esto NO rompe

Todo es **derivado**: ni un byte de estado nuevo, ni una tirada de ningún flujo
(§4.3). Quién se para con quién sale de un hash de la semana y de los dos
identificadores. El mismo instante siempre da la misma imagen, así que un salto
de reloj o una partida cargada se recalculan enteros (§11.4).

**Con una excepción que sí toca el motor**: el reparto entre campos y el
invierno viven en `world/paths.ts`, que alimenta el desgaste de caminos de §7.6
y por tanto el estado. No es cosmético y se mide con el banco.

**Qué falsaría esto:** que hubiera ratos del día sin nadie moviéndose, que todos
salieran a la vez, que la mayoría repitiera sitio semana tras semana, que se
apilaran en una celda, que en invierno siguiera habiendo gente en los campos, o
que dibujar escribiera en el estado o gastara una tirada.

### 11.7 Accesibilidad

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
  REAL_MS_PER_TICK: 840_000,      // v3.72: 7 jornadas de sol de 120 s
  DAYS_PER_WEEK: 7,               // v3.72
  DAY_START_PHASE: 0.28,          // v3.72: media mañana, donde abre el valle
  SPEEDS: [0, 1, 4, 16, 64],      // v2.85: 64x para poder probar el ritmo
  LETHARGY_CAP_MS: 20 * 48 * 840_000,  // una generación (§4.1)
} as const;
```

> **Revisión v3.72, 15 sep 2026 — el reloj que se puede leer.** Lo pidió el
> dueño del diseño: «el tiempo me gustaría que se visualizase en lugar del
> título de los años; me gustaría un contador con horas incluso, por eso quería
> arreglar el reloj: **debe ser real el paso del tiempo, como si fuese la vida
> real**». Lo que lo hacía imposible era esta tabla: con la semana en quince
> segundos y la jornada de sol en 120, **pasaban ocho amaneceres por semana** y
> no había hora que decir sin mentir.
>
> La identidad que lo cierra, y que vigila `tests/fast/clock.test.ts`:
>
> ```
> REAL_MS_PER_TICK = DAYS_PER_WEEK · SCENIC_DAY_SECONDS · 1000 = 7 · 120 s
> ```
>
> **Lo que cuesta, dicho entero.** A ×1 una semana son catorce minutos, una
> estación siete horas y un año once; a ×64, una semana trece segundos y un año
> diez minutos y medio. Es decir: **lo que antes pasaba a ×1 pasa ahora a ×64**,
> y ×1 es la velocidad de mirar una jornada de la aldea. Tres cosas se mueven
> con ello y están anotadas donde viven: la densidad de §11.6 se mide a ×64
> (`tests/fast/density.test.ts`), el techo entre encrucijadas de §8.6 son ciento
> veinte semanas y ya no «media hora real», y el tope del letargo sigue siendo
> una generación —960 ticks, el caso de esfuerzo de §11.4— pero en la pared son
> nueve días y medio en vez de cuatro horas. La pestaña oculta, además, recupera
> **a la velocidad que el jugador dejó puesta** (`resumeAfterHidden`): a ×16,
> catorce minutos fuera son dieciséis semanas y no una.
>
> **Los dos diales, si algún día hay que acelerar:** `SCENIC_DAY_SECONDS`
> (120 → 60 es el suelo medido en D.6.1, por debajo la luz parpadea y la gente
> esprinta) y `DAYS_PER_WEEK` (7 → 3 deja de parecerse a una semana). Cualquiera
> de los dos arrastra `REAL_MS_PER_TICK` con él, o la identidad se rompe.

### 12.2 Fundación

> **Revisión v3.69, 15 sep 2026 — la pareja.** Lo decidió el dueño del diseño:
> «la aldea debe comenzar con una sola pareja, un hombre y una mujer». Hasta
> aquí el valle lo fundaban veinte; ahora lo fundan dos y **la aldea crece con
> los que llegan** (§5.7, `ARRIVE_SMALL_BELOW`). El perfil de veinte sigue
> existiendo como `TWENTY` en `tests/helpers/founding.ts`, porque las pruebas
> que reparten oficios o miden la subsistencia de una aldea hecha miden eso y
> no la fundación; `foundGame` y `foundPeople` aceptan un `FoundingProfile`.

```ts
export const FOUNDING = {
  POPULATION: 2,           // los dos nombrados: él manda, ella es la comadrona
  ADULTS: 2, CHILDREN: 0, ELDERS: 0,
  GRAIN: 150,
  WOOD: 100,
  MORALE: 55,
  FAITH: 50,
  HOUSES: 1,
  FIELDS: 1,
  HERD: { hens: 3, pigs: 0, cows: 0 },
  AGE_RANGES: { adults: [18, 30], children: [1, 13], elders: [60, 70] },
  MIN_FERTILE_WOMEN: 1,    // la corrección de §6.1 garantiza la mujer…
  MIN_MEN: 1,              // …y, desde v3.69, también el hombre
} as const;
```

Comprobación, con el cálculo explícito para que nadie lo «arregle» en ninguna
de las dos direcciones:

```
consumo   = 2 personas · 48 semanas · 1.0            =    96
cosecha   = 1 campo · 600 · 1.00 clima · 1.02 ánimo  =   612
margen    = 612 / 96                                 =  6.4
y a veinte = 612 / (20 · 48)                         =  0.64
```

A dos les sobra el campo —es lo que deja llegar a los primeros sin que nadie
pase hambre— y **no alimenta a la aldea pequeña entera**: en cuanto llegan diez
hay que roturar, y por eso el valle cambia. Los 150 de grano cubren año y medio
de la pareja: una mala primera cosecha no la mata, y no tiene para dos años sin
sembrar. `GRAIN` queda por debajo de `BASE_STORAGE` y el primer tick no merma.

**Dos manos siempre pueden con un campo** (`labour.ts`, v3.69). La regla de
v2.14 —`MIN_FIELD_CREW` sobre la mano de obra menos la reserva de obra— dejaba
a la pareja en 1,7 brazos, y 1,7 entre 2 es cero campos: medido con
`tools/founding-report.ts`, la pareja no cosechaba nada y moría de hambre en el
año cuatro en cuatro semillas de seis. Lo que la regla quería impedir —dos
supervivientes cosechando cuatro campos— sigue impedido.

**Medido antes de fijarlo** (`tools/founding-report.ts`, seis semillas,
cuarenta años, política prudente): ninguna pareja se extingue; población a los
10 / 20 / 30 / 40 años: 14/28/34/56, 20/30/56/70, 11/25/37/53, 11/12/21/25,
20/48/61/56 y 5/13/18/28. La semilla lenta (97) lo es por el ánimo, no por el
grano. `tests/journeys/founding.test.ts` guarda estas propiedades.

<details>
<summary>Lo que había hasta v3.68: la fundación de veinte</summary>

```ts
POPULATION: 20, ADULTS: 13, CHILDREN: 5, ELDERS: 2, GRAIN: 800, WOOD: 200,
HOUSES: 4, FIELDS: 2, HERD: { hens: 4, pigs: 0, cows: 1 }
consumo = 960 · cosecha = 1 224 · margen = 1.275
```

El margen era del 27 % y los 800 de grano —exactamente `BASE_STORAGE`, para no
nacer mermando— cubrían casi un año. Es el perfil `TWENTY` de las pruebas.

</details>

### 12.3 Subsistencia

```ts
export const FOOD = {
  GRAIN_PER_PERSON: 1.0,        // por semana
  FIELD_YIELD: 600,             // por campo, cosecha completa
  FIELD_CREW: 4,                // adultos para trabajar un campo entero
  MIN_FIELD_CREW: 2,            // por debajo, el campo NO rinde nada (§5.2)
                                // INERTE por medición (v2.24): ninguna partida
                                // bajó nunca de 2,13 adultos por campo. Se
                                // conserva como invariante, no como mecánica.
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
  COLD_HOUSES_WOOD_MULTIPLIER: 1.5,
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

export const PEOPLE = {
  MAX_NAMED: 8,                 // §6.1; cuánta gente cabe en la cabeza del jugador
  ROLE_MIN_AGE: {               // edad mínima para tomar el oficio
    leader: 25, midwife: 28, priest: 25,
    smith: 20, woodward: 18, reeve: 22,
  },
  ROLE_MAX_PREFERRED: 55,       // §6.2: por encima, solo si no hay nadie en banda
} as const;

export const MIGRATION = {
  ARRIVE_CHANCE: 0.30,
  ARRIVE_MIN_PEOPLE: 2,         // v3.69: dos desde la fundación en pareja
  ARRIVE_SMALL_BELOW: 20,       // v3.69: por debajo, la aldea es «pequeña» y…
  ARRIVE_CHANCE_SMALL: 0.70,    // …atrae más,
  ARRIVE_MIN_MORALE_SMALL: 35,  // pide menos ánimo,
  ARRIVE_MIN_MORALE: 50,
  ARRIVE_MIN_GRAIN_YEARS: 0.5,
  ARRIVE_MIN_FREE_BEDS: 2,      // y no exige cama libre (acampan junto al río)
  ARRIVE_COUNT: [2, 4],
  VIABLE_POPULATION: 2,         // §5.7: por debajo, esto ya no es una aldea
  ABANDON_YEARS: 5,             // §5.7: años seguidos así antes de marcharse
  LEAVE_BELOW_MORALE: 30,
  LEAVE_COUNT: [1, 3],
} as const;
```

**Aforo máximo: 80.** 16 casas × 5. Coincide con el tope de figuras del render y
con la escala de `valle.md` §7: no es casualidad, es la misma cifra vista desde
tres sitios.

**`MAX_NAMED` no es una perilla.** Ocho es la decisión de §6.1 sobre cuánta
gente puede el jugador tener en la cabeza a la vez, no un número que se ajuste
buscando una curva. Estaba solo en prosa, que era un fallo del documento.

**`ROLE_MIN_AGE` y la fundación.** §6.2 pondera por edad al cubrir una vacante,
pero no decía nada del reparto fundacional, y sin un suelo salían comadronas de
diecisiete años. Cada oficio va al adulto **de mayor edad** que cumpla su
mínimo; si ninguno lo cumple —raro con trece adultos de 16 a 45, pero no
imposible— va al de más edad disponible antes que quedar vacante. Los oficios se
reparten en orden decreciente de exigencia, de modo que el más difícil de cubrir
elige primero. `herbalist` y `stranger` no tienen suelo: el primero surge de la
necesidad y el segundo llega de fuera.

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
  FAITH_DEVOUT_PRIEST: 0.13,   // 0.10 congelaba la fe en 50.0 exacto (§5.6)
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
  BARREN_CLEARING: 254,         // una tala de encrucijada no rebrota
  FLOOD_PRONE_SHIFT: 0.05,      // de clima justo a ruinoso
  PATH_T1: 400, PATH_T2: 1600, PATH_T3: 6000,
  TRAFFIC_DECAY: 0.005,         // por tick
  STONE_PER_BP: 0.5,
  VIRGIN_FOREST: 255,           // §9: marca de `forestAge` en el bosque viejo
} as const;
```

### 12.8 Encrucijadas

```ts
export const CROSSROADS = {
  MIN_TICKS_BETWEEN: 120,       // 30 min reales a ×1
  GUARANTEE_TICKS: 960,         // una por generación como mínimo
  CRISIS_MULTIPLIER: 4.0,
  FEUD_RIPE_MULTIPLIER: 4.0,
  BEHIND_WALL_MULTIPLIER: 0.4,
  VALLEY_NAME_LORD_MULTIPLIER: 0.5,
  NOVELTY_MULTIPLIER: 0.4,      // si ya salió en esta partida
  DEFAULT_COOLDOWN_YEARS: 25,
} as const;
```

### 12.9 Objetivos que verifica la suite de balance

Estos son los asertos, no los resultados. Se comprueban sobre 60 semillas × 200
años, con **cuatro políticas**.

**Ninguna de las tres primeras representa a alguien jugando con cabeza, y por eso
no sirven para fijar una banda.** `first` toma siempre la primera opción, que en
casi todas las plantillas es la acomodaticia — y en un juego de subsistencia la
acomodaticia es **la manirrota**: comprar la reliquia son seis semanas de pan,
acoger a los nueve del vado son nueve bocas más, pagar a los bandidos es un
tercio del granero. Además nunca paga un coste presente, así que jamás levanta la
empalizada y toda plantilla cuyo interruptor sea una obra del jugador se queda
encendida para siempre. `last` toma la desafiante y `worst` la peor. Las tres son
cotas, no medidas.

**Regla de no degeneración, obligatoria en las CUATRO políticas.** Si la misma
opción se ha elegido en las **dos** apariciones anteriores de esa plantilla, la
política debe elegir otra distinta si existe. Sin esta regla, `last` y `worst`
son discos rayados y no miden el catálogo: medido en v2.23, contestan
`succession:no_one` **178 de 178 veces** —`last` porque es la última de la lista,
`worst` porque su coste inmediato es mayor— y el 68,2 % de todas sus decisiones
va a esa sola opción.

Ese es el motivo de que sus cifras de la v2.23 no valgan: terminan el 100 % y la
horquilla sale de 98,3 puntos, así que **los dos umbrales de esta tabla “pasan”
midiendo una única opción en vez del juego.** Un aserto que pasa por el motivo
equivocado es peor que uno que falla, porque deja de avisar.

La raíz es que ninguna de las dos mira más allá de la semana en curso, así que
jamás ven el coste diferido de repetir. **Un jugador que elige mal no elige lo
mismo ciento setenta y ocho veces**, y una política que sí lo hace no representa
a nadie. La regla no cambia el juego: corrige el instrumento.

**`prudent` es la política de referencia.** Sin lookahead y determinista: puntúa
cada opción disponible como

```
score = −(grano que cuesta) − 3·(ánimo perdido)
        + 10·(si no planta semilla)
```

y toma la mayor, **pero las muertes no se compran**: si alguna opción no mata a
nadie de inmediato, `prudent` elige solo entre esas; si todas matan, minimiza los
muertos. La primera versión ponía las muertes en la misma suma que el grano, con
lo que una vida quedaba tasada en cuarenta fanegas y había opciones donde salía a
cuenta — medido, `prudent` moría de violencia tres veces más que `first`. Un
aldeano cauto no cambia vidas por grano a ningún precio.

**`hostile` fuera del alcance de `prudent` no es contenido muerto (v2.24).**
Medido dos veces: `prudent` y `first` nunca la activan; `last` y `worst` la
activan en 36 y 34 partidas de 60. Eso es exactamente lo que debe pasar. La mala
reputación es el castigo de echar a la gente del vado, y **un castigo que el
juego prudente no alcanza es un castigo que funciona**, no uno que sobra. Lo
traté como defecto durante dos revisiones y no lo era. El peso del ánimo en 3 se
mantiene, pero por su propio motivo —un aldeano cauto valora el granero lleno por
encima del buen humor—, no por esto.

No pretende ser juego óptimo —no lo es— sino **un aldeano cauto**: el suelo por debajo del cual ningún jugador razonable debería caer. Las
bandas de esta tabla se miden con ella; las otras tres se informan al lado para
ver la horquilla.

**Por qué hacía falta.** Medido con M-14 en pie, `first` extingue el 61,7 % de
las aldeas y `worst` el 75 %: catorce puntos de diferencia entre la política
manirrota y la peor posible. Si el desenlace apenas depende de lo que se elige,
el jugador no es un cuello de botella sino un espectador con botones, y eso rompe
el principio 2 de `valle.md`. Antes de tocar la letalidad de las encrucijadas hay
que medir con una política que no se arruine sola.

| Propiedad | Umbral | Política |
|---|---|---|
| **Partida terminada** (abandono o extinción) | 2 % – 12 % | `prudent` · **medido (v2.44): 1,7 %, al filo por abajo** |
| **Partida terminada** | ≥ 25 % | `worst` — **secundario a la horquilla (v2.25)**, ver abajo. **Medido (v2.44): 10,0 %**, con trece contratos reparados y `story` compuesto por fuerza |
| **Horquilla entre `prudent` y `worst`** | **≥ 20 puntos** | — · **el aserto que manda (v2.25)**. **Medido (v2.44): 8,3 puntos** — ni el bucle de A.15 ni el instrumento de políticas explican esto ya; descartados los dos, lo que queda es el catálogo |
| Decisiones de `last`/`worst` dedicadas a una sola opción | **< 45 %** | atribución por opción. **Cuando falla, se arregla la POLÍTICA, no el juego** (§12.9, regla de no degeneración). Era < 40 % y **es inalcanzable (v2.25)**: con la regla, una opción todavía se lleva dos de cada tres apariciones de su plantilla, y `succession` es el 60 % de lo que se pregunta a las adversas — dos tercios de 60 son 40. El techo es estructural; el umbral se pone encima. **Medido (v2.44): pasa por primera vez — 43,9 % y 41,3 %.** |
| Mediana del pico de población | 65 – 85 | `prudent` · era 65–82 y fallaba por un habitante (v2.25): fallar por uno es ruido. **Medido (v2.44): 82** |
| Mapa lleno (8 campos, 16 casas) antes del año 120 | ≥ 60 % de las semillas | `prudent` · **medido (v2.44): 96,7 %** |
| Población visible al final de la primera generación | ≥ 26 en la mediana | `prudent` · **medido (v2.44): 41** |
| **Encrucijadas por generación** | **media entre 1 y 5**, y ninguna semilla por encima de 7. Se mide **excluyendo `forest_cut` y `wolf_winter` hasta que exista M-15** (sin bosque que mengüe, `forestLeft` está congelado y sus disparos son artefacto) y **con la fundación real**, no un banco de pruebas que reparta catorce casas y una fragua desde el tick 0. Deuda registrada: volver a medir con las dos plantillas dentro y con la fundación de M-13/M-14 en cuanto estén fusionados. **Medido (v2.23): la media pasa en las cuatro políticas (3,78–4,41), pero el máximo de `last`/`worst` sube a 9,37** — una partida que se dispersa en diez años concentra sus tres sucesiones en pocas generaciones. Consecuencia del final más corto de Anexo A.15, no del catálogo. **Vuelto a medir (v2.44), con las partidas viviendo más: media 3,32–4,22, máximo 4,60–6,05 — dentro de banda en las cuatro.** |
| Intervalos pegados al techo | < 40 % — diagnóstico, no objetivo |
| Fracción de ticks elegibles, por plantilla | < 1 % · **medido (v2.44): falla en cuatro casos, todos al filo** — `smith_feud` con `prudent` (1,42 %), `succession` con `first` (2,52 %) y `last` (2,21 %), `strangers_at_the_ford` con `worst` (1,02 %) |
| Bosque restante en el año 100 | 40 % – 70 % del inicial. **Aguas abajo de la extinción (v2.16):** falla por arriba, no por abajo — el valle que se queda sin gente conserva sus árboles porque no hay quien los tale. Medido: 24 de 40 valles en banda, uno solo por debajo del 40 % y quince por encima del 70 %. No se ajusta hasta que la extinción esté en banda. |
| Choque del 90 % de bajas en el año 40 → extinción | ≥ 25 % |
| Cualquier estadística fuera de rango o `NaN` | 0 casos |
| **Ninguna plantilla del catálogo a cero apariciones** | — · comprobación de cobertura, no aserto del banco | **Medido (v2.44), sumando las 240 partidas de las cuatro políticas: solo `forest_cut` se queda a cero.** El resto aparece con alguna política aunque falte con otra — `tithe_demand`, `feud_inherited` y `smith_feud` no salen con `last`/`worst` pero sí con `prudent`/`first`. |

**El presupuesto de la sucesión.** El rango era 1–4 y estaba mal calibrado: lo
fijé antes de que existiera el catálogo. Medido, la sucesión sola consume un
tercio del total —unas 7 por siglo, que es lo que da una tenencia de 13 o 14
años para un líder elegido a los cuarenta— y **eso es correcto, no un exceso**:
la muerte del líder es el latido del bucle largo, no ruido que apretar. Con 20
encrucijadas por siglo y 7 sucesiones quedan 13 para las otras dieciséis
plantillas, menos de una por plantilla y siglo. El rango sube a 1–5 para
reconocerlo en vez de disimularlo sacando la sucesión de la cuenta.

La fila de `worst` es la que hace cumplir el principio 4 de `valle.md`: **la
aldea solo muere si el jugador la mata.** Si esa cifra baja del 25 %, las
encrucijadas no tienen dientes suficientes y hay que endurecer sus efectos, no el
mundo. Y la fila de la horquilla es la que hace cumplir el principio 2: si jugar
bien y jugar mal acaban en el mismo sitio, el jugador sobra.

**De las dos, manda la horquilla (v2.25).** El 25 % es una suposición de la
v2.0, escrita antes de que existiera el catálogo y sin nada medido detrás — de
la misma cosecha que el rango 1–4 de encrucijadas por generación, que resultó
estar mal en cuanto se midió y se corrigió a 1–5 en la v2.10. No hay razón para
tratar este número con más respeto que aquel.

Lo que encarna el principio 2 no es una cifra absoluta de aldeas muertas: es la
**separación**. Una aldea que aguanta el desastre no incumple nada —hay juegos
enteros construidos sobre resistir—; una donde da exactamente igual lo que se
elija, sí. Si algún día la horquilla llega a los 20 puntos con `worst` en el
18 %, el juego cumple: jugar mal cuesta cuatro veces más que jugar bien, y eso
es un jugador que importa. Al revés —`worst` en el 30 % con `prudent` en el
28 %— no cumple nada, y con el aserto viejo habría pasado.

**Medido (v2.23), con A.15 en pie: las dos filas pasan, de sobra.** `worst`
termina el 100 % de las partidas —muy por encima del 25 %— y la horquilla con
`prudent` es de 98,3 puntos. Esa es también la condición que decide si toca
hablar de los efectos del catálogo: solo se abriría esa conversación si `worst`
siguiera por debajo del 25 % estando ya fuera del bucle de `succession`. No es
el caso. Lo que sigue fallando —la fila de arriba, y la cadencia máxima de
`last`/`worst` en 9,37— es harina de otro costal: ambas políticas contestan
`no_one` el 100 % de las veces que se les pregunta, por cómo deciden, no por lo
que la plantilla ofrezca a cambio. Ver §2.23.

**Y desde R-1 (v3.75) esta suite mide un juego que ya no existe:** sus 37
aserciones se escribieron cuando sólo las encrucijadas movían el mundo. No se
«arreglan»: se remiden con los sucesos dentro y se reescriben contra los
números nuevos, **cuando el dueño lo pida** (`docs/rework.md` §5). Hasta
entonces la puerta es la suite rápida y las jornadas.

### 12.10 Los sucesos del valle (`FATE`, R-1)

La tabla de §7.10 con sus números. Todo vive en `FATE` (`balance.ts`), con
`// TUNE:` y lo medido al lado; el informe que los fijó es
`tools/fate-report.ts` (seis semillas × cuarenta años, jugadas con `run` y la
política prudente), y hay que pasarlo antes y después de mover cualquiera.

| Constante | Valor | Por qué |
|---|---|---|
| `WEEKLY_CHANCE` | 0,35 | la de una **aldea hecha**: con `MIN_GAP_WEEKS` 2 salen 13 al año, uno cada tres o cuatro semanas |
| `FATED_FULL_PEOPLE` | 20 | la población a la que la cadencia es la de arriba; por debajo se reparte en proporción |
| `FATED_LEAST_SHARE` | 0,25 | el suelo de esa proporción, para que un caserío tenga vida y no silencio |
| `MIN_GAP_WEEKS` | 2 | un suceso pegado a otro no se lee |
| `FEAST_IS_A_RITE` | true | sorteada, la fiesta salía una vez cada veinte años |
| `WEIGHT` | rayo 3 · riada 3 · lobos 3 · boda 0,6 · buhonero 2 · pesca 2 · tejado 3 · fiesta 1 (no se sortea) · riña 1 · oso 0,6 · niño 0,5 · forastero 1 | tercera vuelta; las dos anteriores en `docs/rework.md` §2.5 |
| `WEIGHT` de las visitas | buhonero 2 · factor 2 · tratante 1,5 · salinero 1 | M-0: el listón es el del buhonero, que ya pesaba 2 — una visita es una cosa que pasa, no una rareza |
| `OFFER.WEEKS` | 2 | lo que espera quien ha subido antes de seguir camino |
| `OFFER.MIN_PEOPLE` | 8 | **medido**: sin suelo, aceptar ofertas bajaba la población mediana de 47 a 15 y mataba seis aldeas de dieciséis, casi todas parejas que vendían lo que las mantenía vivas |
| `OFFER.FACTOR_KEEP_YEARS` | 2 | **medido**: con uno, la semilla 9 se extinguía en el año 2 |
| `OFFER.AGAIN_WEEKS` | buhonero 24 · factor 48 · tratante 48 · salinero 96 | **medido**: sin plazo, el factor subía 1 181 veces en dieciséis partidas de sesenta años y tapaba al resto |
| `TITHE.SILVER_SHARE`, `GRAIN_OF_SURPLUS`, `MIN_PEOPLE` | 0,1 · 0,1 · 10 | el diezmo se lleva una parte de la plata, o del grano que **sobra**, y no visita un caserío |
| `WORLD.STONE_IDLE_CAP` | 210 | lo que cuesta una iglesia, una muralla y una casa: no es un almacén, es tener piedra a mano |
| `MOOD_FACE` | 20 · 40 · 70 | los tres cortes de la cara del ánimo (§11.1.1) |
| `LIGHTNING_HOUSE_WEIGHT`, `LIGHTNING_MORALE` | 3, −4 | como el incendio de §5.9. **Sin puertas desde v3.76** (decisión del dueño, §7.10): `LIGHTNING_MIN_HOUSES`/`LIGHTNING_MIN_PEOPLE` existieron y se quitaron; el rayo sólo pide tormenta y madera en pie |
| `FLOOD_WET_DAYS`, `FLOOD_GRAIN_LOSS`, `FLOOD_MORALE` | 3, 0,08, −3 | tres jornadas cerradas de siete; el 8 % del granero |
| `WOLVES_HENS`, `WOLVES_MORALE` | [1, 2], −1 | |
| `WEDDING_MIN_ADULTS`, `WEDDING_MORALE`, `WEDDING_FAITH` | 6, +5, +2 | con 4 adultos había boda cada nueve meses |
| `PEDLAR_WOOD`, `PEDLAR_GRAIN` | 15, 30 | sólo si hay el doble de leña |
| `CATCH_GRAIN`, `CATCH_MORALE` | [15, 35], +2 | |
| `ROOF_SNOW_DAYS`, `ROOF_BLOCK_WEEKS`, `ROOF_WOOD`, `ROOF_MORALE` | 2, 2, 15, −2 | |
| `FEAST_MIN_PEOPLE`, `FEAST_MORALE`, `FEAST_FAITH` | 4, +6, +3 | |
| `QUARREL_OPINION`, `QUARREL_MORALE` | −12, −1 | el empujón de §7.10; con −12 hay rencor a la cuarta riña entre los mismos |
| `BEAR_FOREST`, `BEAR_WEEKS`, `BEAR_MORALE` | 0,2, 2, −3 | |
| `CHILD_MORALE`, `STRANGER_MORALE` | −3, +1 | |

Los factores por rasgo no son constantes sino ramas de `weightOf`: lobos ×1,6
y oso ×2 en `old_forest`; riada y lobos ×0,5 en `bare_hills`. R-3 los
multiplica (`docs/rework.md` §4).

**Medido con la proporción puesta** (v3.78, doce semillas × cuarenta años,
`foundGame`): **tres valles de doce se rompen** —uno por extinción, dos por
abandono— y los nueve que aguantan llegan con 57, 48, 44, 39, 34, 34, 34, 31 y
20 habitantes. Los sucesos por partida van de 22 en el valle que muere en el año
seis a 502 en el que llega a los cuarenta.

**Medido sin la proporción** (v3.75, con las puertas del rayo puestas): 13,0
sucesos al año en 240 años de aldea; por año, riña 2,47, forastero 2,33, pesca
2,04, oso 1,05, niño 1,02, lobos 0,89, fiesta 0,89, boda 0,86, rayo 0,58,
buhonero 0,49, tejado 0,27, riada 0,15; rencores en cuarenta años entre 4 y 11;
distancia entre valles 0,16.

**Vuelto a medir sin las puertas del rayo** (v3.76, doce semillas × cuarenta
años): 12,3 sucesos al año en 286 años de aldea —286 y no 480, porque 8 de las
12 semillas acaban antes de los cuarenta años—; por año, forastero 3,57, riña
2,96, pesca 2,26, oso 1,55, buhonero 0,43, **rayo 0,32**, lobos 0,28, fiesta
0,29, riada 0,27, niño 0,23, boda 0,10, tejado 0,10; rencores casi siempre 2
por partida (0 en las dos semillas que no llegan a los ocho años); distancia
entre valles 0,22. El detalle y las causas de fin están en `docs/rework.md`
§2.5 y §2.6.

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

Se guarda cada 20 ticks, al ocultarse la pestaña (`visibilitychange`) y en
`pagehide`, antes de detener el bucle. El oyente de `pagehide` pertenece a la
aplicación, no a una instancia del bucle: fundar otra aldea no acumula oyentes.

Cada solicitud clona su `SaveFile` en el momento de pedirla y entra en una cola
de escritura única. Terminar, archivar y fundar de nuevo son mutaciones
consecutivas que pueden solicitar dos guardados casi a la vez; IndexedDB debe
recibirlos en ese orden para que la instantánea terminada no pueda completar
después y sustituir a la sucesora viva.

Durante el letargo, una solicitud intermedia fecha la instantánea restando de
`now` los ticks que aún debe procesar. Así ocultar o cerrar entre dos lotes no
convierte una puesta al día parcial en una partida actual. El último lote es un
límite de persistencia propio: solicita una instantánea con la hora actual antes
de mostrar el parte y arrancar el bucle ordinario.

**Esquema actual: 2 (v2.67).** El esquema 1 se migra de forma aditiva: su única
`seed` pasa también a `terrainSeed`; `peakPeople` toma el mayor valor de
`params.people` conservado en la crónica o la población presente. No se atribuye
al guardado antiguo una precisión que nunca almacenó.

`deserialize` solo devuelve una forma que motor y render puedan recorrer. La
validación incluye los escalares finitos, todos los flujos aleatorios, las seis
capas tipadas de 2.016 celdas y sus dominios, las colecciones del estado con la
forma de cada entrada y cada `ArchivedGame` con crónica y máscara completas.
Encrucijadas, decisiones y semillas deben resolver sus referencias en el
catálogo estable y conservar todas las letras necesarias del reparto. Una
condición diferida debe además caer dentro de los dominios que §8.2 cierra por
enumeración: `stat` entre las cinco cifras, `ratio` entre los cuatro cocientes,
`minWeek` entre 0 y `WEEKS_PER_SEASON − 1`, más `op`, `season`, `role`, `trait`
y `building` (v2.81). Resolver la referencia no basta si el nombre que lleva
dentro no lo puede leer el motor. Los campos abiertos por diseño —el nombre de
una bandera, el umbral de un rencor— siguen siéndolo. No demuestra equilibrio ni
vuelve a ejecutar invariantes semanales: si falla esta frontera, `loadSave`
devuelve `null` antes de llamar a `boot`.

### 13.2 Letargo

Al cargar:

```
elapsed = min(now − savedAtMs, LETHARGY_CAP_MS)
ticks   = floor(elapsed / REAL_MS_PER_TICK)      // máx. 960
```

**El tope son 960 ticks y eso no se ha movido en v3.72** —es una generación
(§4.1) y es el caso de esfuerzo de §11.4—; lo que cambió es cuánto tiempo de
pared valen: nueve días y medio a ×1 en vez de cuatro horas, porque la semana
pasó de quince segundos a catorce minutos. Un idle que se mira de fondo pide
justo eso: volver al día siguiente y encontrar dos años de crónica.

**Y una pestaña que se oculta recupera a la velocidad que estaba puesta**
(`resumeAfterHidden`, v3.72), no a ×1. El arranque en frío no puede: el guardado
no lleva la velocidad. Queda anotado como deuda en `docs/handover.md`.

Se ejecutan esos ticks en lotes de 64 dentro de `requestAnimationFrame`, con una
pantalla de progreso que ya muestra el valle dibujándose. 960 ticks tardan menos
de 2 s.

Si había una encrucijada pendiente, **sigue pendiente**: la aldea ha vivido esas
semanas sin decisión, con las consecuencias que eso tenga. No se resuelve sola,
no caduca y no mata (§1).

Al terminar, se abre el **parte de bienvenida** (§9.2).

**El letargo tiene dos puertas, no una** (v2.84). Arrancar con un guardado
viejo es la evidente. La otra es **volver de una pestaña oculta**: un móvil que
bloquea la pantalla mantiene la página viva, no la vuelve a arrancar, y hasta
la v2.84 ese tiempo se perdía entero — el valle se quedaba congelado y la
promesa «la aldea sigue sin ti» era falsa justo en lo más corriente que hace un
jugador. Medido en un Android real: catorce minutos de reloj de pared dieron
siete años en vez de dieciocho.

Al ocultarse se anota la hora; al volver se deben los ticks de esa ausencia,
con el mismo tope de cuatro horas y los mismos lotes. Dos precisiones:

- **En pausa no se debe nada.** Quien paró el reloj y cambió de aplicación lo
  encuentra parado, igual que §2.60 deja esperando una decisión.
- **El parte de bienvenida pide una ausencia que contar**: al menos una
  estación completa. Por debajo, el resumen no tendría casi nada que decir y un
  modal por cada ojeada a otra aplicación es peor que el silencio que sustituye.
  El umbral es la estación de §5.1, no una cifra elegida para la ocasión.

### 13.3 Herencia entre partidas

Al terminar una aldea por cualquiera de las tres causas de `EndState`, la
partida se cierra y su crónica completa se archiva junto con la unión de las
ruinas existentes y la máscara de sus edificios en pie. La siguiente partida
usa una `seed` maestra nueva, genera un mapa nuevo con la misma `terrainSeed` y
**siembra las ruinas de la anterior** en `map.ruins`.

```ts
export function archiveGame(state: GameState): ArchivedGame; // exige state.ended
export function foundSuccessor(game: ArchivedGame, seed: number): GameState;
```

Las ruinas heredadas no tienen efecto mecánico: no dan recursos, no bloquean la
construcción de madera, no modifican ningún número. Están ahí para verse. Darles
efecto convertiría la derrota en una moneda y la ruina en un recurso, que es
justo lo contrario de lo que buscan los principios 4 y 3.

La interfaz detiene el reloj y descarta la pantalla de encrucijada al detectar
`ended`. El epitafio nombra causa, duración y pico de población, permite abrir
la crónica completa y exige **«Begin again»** para llamar a `foundSuccessor`.
El archivo conserva todas las partidas cerradas; una misma pareja
`(seed, ended.tick)` solo se añade una vez. La semilla de una sucesora no puede
ser ninguna del archivo: si la extracción coincide, avanza módulo `2³²` hasta
la primera libre. Así esa pareja sigue siendo una identidad inequívoca.

La pantalla de crónica expone el archivo completo tras la fundación siguiente.
Las entradas se renderizan con `makeBundle(ArchivedGame.seed)`: el flujo
`chronicle` nunca avanza (§9.1), así que la semilla reconstruye la misma voz sin
guardar otro estado aleatorio ni subir el esquema. La partida terminada que aún
se muestra como estado actual no se duplica en el selector.

### 13.4 Instalable y sin conexión

`CLAUDE.md` describe el proyecto como PWA desde el primer día y este documento
nunca dijo qué significaba eso. Queda dicho aquí, porque el hito 6 depende de
ello: una partida de varios días en un móvil real atraviesa túneles, aviones,
Wi-Fi que se caen y despliegues a media tarde. **Un juego que promete sobrevivir
a que lo cierres y contesta con una página en blanco cuando no hay red no está
midiendo su ritmo: está midiendo la cobertura.**

**Instalable.** Un `manifest.webmanifest` con nombre, `display: standalone`,
orientación vertical, color de tema y fondo, e iconos de 192 y 512 px, uno de
ellos `maskable`. El criterio de §15 incluye el deseo de volver, y no es lo
mismo un icono entre las aplicaciones que una pestaña perdida entre veinte.
Medir lo segundo y llamarlo lo primero sesga el hito por una causa que no es del
juego.

**Sin conexión.** Un service worker con dos políticas, y la separación es
normativa:

| Qué | Política | Por qué |
|---|---|---|
| El documento (`navigate`) | **red primero, saltando también la caché HTTP** (`cache: 'reload'`), caché del trabajador como respaldo | Un despliegue nuevo tiene que alcanzar a un dispositivo ya instalado. Y no basta con pedirlo antes que a la caché propia: Pages sirve el documento con `Cache-Control: max-age=600`, así que un `fetch` corriente lo contesta la caché del navegador sin tocar la red (v2.86) |
| Todo lo demás del propio origen | **caché primero**, y se guarda al traerlo | Vite marca los recursos con su hash: un nombre distinto es un contenido distinto, así que la copia nunca puede quedar obsoleta |

**Lo que el service worker no hace.** No toca IndexedDB —no puede, y la partida
es de §13.1, no suya—. No intercepta nada que no sea `GET` del mismo origen. No
sirve un documento viejo cuando hay red. Al activarse borra toda caché cuyo
nombre no sea el suyo: **la versión de la caché es el único mecanismo de
invalidación**, y por eso es un nombre y no una fecha.

**Los modelos 3D también se precachean, y no era opcional** (v3.66). El
documento no los referencia: los pide el renderer en marcha, leyendo
`assets/valley3d/manifest.json`. Con «caché primero, y se guarda al traerlo»
quedaban guardados **sólo si la primera visita duraba lo suficiente** para que
bajaran los 2,7 MB. Medido: abriendo y recargando sin esperar no llegan, y
entonces sin red el relevo a WebGL falla y el valle abre en Canvas — abre, sí, y
la promesa se cumple a la letra, pero no es el juego que se publica, y el día
que no haya Canvas al que caer no abre en absoluto. Así que el trabajador lee el
manifiesto en su instalación y guarda los treinta y nueve modelos con el resto
del casco. Cuesta 2,7 MB de una vez y es el precio de que «abre en modo avión»
signifique lo mismo mañana.

**Desde cuándo abre sin red, exactamente.** Desde la **segunda apertura**, y la
precisión no es pedantería: es la frontera medida. En su instalación el
trabajador precachea el documento, el manifest, los iconos, el paquete y los
modelos —todo lo que `index.html` referencia, leído del propio documento, más el
manifiesto de recursos— así que tras una sola visita está todo guardado y
`fetch` lo sirve sin red perfectamente. Y aun así,
en esa primera vuelta **el paquete no carga como módulo**: el navegador da
`ERR_FAILED` sobre una entrada que la caché tiene y que el mismo trabajador
entrega si se la pide de otra manera. Medido, no deducido (§2.82). A partir de
la segunda apertura, cuando esa navegación ya ha pasado entera por el
trabajador, la aldea abre en modo avión sin excepción.

Para el hito 6 esto basta —una partida de varios días abre decenas de veces—,
pero queda escrito como lo que es: **una limitación conocida y no una promesa
cumplida**, para que quien la resuelva sepa dónde estaba.

**Ruta base relativa.** El mismo `dist/` tiene que servir desde la raíz de un
dominio y desde el subdirectorio de GitHub Pages sin reconstruirse. Con
`base: './'` los recursos, el manifest y el registro del service worker se
resuelven contra el documento, y el ámbito del trabajador queda acotado a su
propio directorio sin escribir la ruta en ningún sitio. Un recorrido sirve el
mismo `dist/` bajo un prefijo y lo comprueba (v2.83): sin él, esta afirmación
solo se verificaría desplegando.

**Qué lo falsaría:** que la aldea no cargue con el modo avión puesto a partir de
la segunda apertura, **o que cargue en Canvas cuando debería cargar en 3D** —hay
recorrido que lo comprueba mirando `data-render`, y no el lienzo, porque el
lienzo de WebGL se crea antes de que el renderer cargue y se queda puesto aunque
falle—; que un despliegue nuevo no llegue a un dispositivo que ya
tenía la anterior; que el service worker responda a algo que no sea `GET` del
mismo origen; o que quedarse sin red pierda la partida guardada —el trabajador
no toca IndexedDB, así que perderla significaría que algo más la está borrando.

---

## 14. Pruebas

**Tres niveles, y cada uno con su presupuesto escrito** (el tercero es de
v3.66). La razón de que sean tres y no dos: la suite rápida fija veinte
segundos, y llegó a tardar noventa y uno porque siete ficheros habían empezado
a vivir jornadas escénicas enteras en seis semillas dentro de ella. No eran
pruebas mal escritas — eran pruebas de otro nivel. Separadas, la rápida volvió a
cumplir su presupuesto sin tocar una sola aserción.

| Nivel | Qué prueba | Presupuesto | Orden | Cuándo |
|---|---|---|---|---|
| `tests/fast/` | Propiedades puras: determinismo, invariantes, contratos, DSL, interfaz | **< 30 s** (mide 23,7) | `npm test` | Cada cambio |
| `tests/journeys/` | Jornadas escénicas y siglos, en varias semillas | **< 5 min** (mide 221 s) | `npm run test:journeys` | Cada cambio, en CI |
| `tests/balance/` | Sesenta semillas, doscientos años, cuatro políticas | **< 45 min** | `npm run test:balance` | Aparte, de noche |

> **Los tres presupuestos suben en v3.68, y se dice por qué.** El mapa grande
> cuadruplica el valle (§7) y un tick cuesta **1,67 veces** lo que costaba
> —medido: 642 ms contra 1 073 ms por cuarenta años—, generar un valle 8,9 ms
> contra 3,7. No es proporcional al área porque lo que escala con el área es
> poco, y lo que lo hacía se arregló en esa misma ronda:
>
> - **A* pedía y rellenaba tres arrays del tamaño del mapa por cada ruta**, y
>   `routesFor` pide una por aldeano y semana: dos millones de escrituras por
>   tick para usar cien celdas. Ahora marca la visita con un contador y no
>   rellena nada (`astar.ts`, `scratchFor`).
> - **`placeBuilding` recorría el mapa entero por cada solar**, hasta ocho veces
>   por tick, cuando la aldea sólo puede construir en el corazón. Acotado ahí.
> - Y dos barridos de prueba que eran generosos cuando un valle costaba un
>   tercio: 200 valles pasan a 80 en `mapgen.test.ts`, y 12 × 100 años a 10 × 80
>   en la cobertura rápida del catálogo.
>
> Lo que queda —23,7 s— son tres ficheros que simulan mil años cada uno, y
> bajarlo de ahí es quitar cobertura, no grasa. El presupuesto sube a 30 s con
> ese número escrito, en vez de dejar la regla incumplida y en silencio.

`npm run test:all` corre los dos primeros. **La puerta de un módulo son los dos
primeros más `typecheck` y `lint`**; el banco de balance se lanza aparte porque
una tarde no cabe en él.

Y una regla que vale para los tres niveles: **un umbral nunca se fija con una
sola semilla**, ni —en la capa de vida— con una sola jornada, porque cada
jornada tiene su propia semilla (`seedOfDay`). El día 0 de seis semillas son
seis muestras, no seis aldeas.

### 14.1 Suite rápida (`tests/fast/`, segundos)

Se ejecuta en cada commit. Prohibido que tarde más de 30 s (v3.68; ver la
tabla de arriba, que cuenta de dónde vienen los diez segundos nuevos).

- **Determinismo.** Misma semilla + mismas decisiones → estado idéntico a los
  5 000 ticks. Se compara un hash del estado serializado.
- **Aislamiento de flujos.** Consumir 1 000 números del flujo `chronicle` no
  cambia el estado de la simulación.
- **Arquitectura.** `src/engine/` no contiene `Math.random`, `Date`, `document`,
  `window`, ni importa de `render/`, `render3d/`, `derive/` ni `ui/`. Y en la
  otra frontera (v3.66): `src/derive/` no importa nada que dibuje ni tiene la
  huella de haber pintado algo, porque de él dependen los dos renders.
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

Se lanza aparte (`npm run test:balance`), en CI nocturna a las **03:00 UTC** y
antes de tocar §12. También admite disparo manual.
Comprueba los umbrales de §12.9. **Nunca se fija un umbral con una sola
semilla**: dos partidas divergen desde el primer tick y una sola es ruido.

Salida: una tabla por consola y un CSV con las series de población, grano, ánimo
y edificios, para poder mirar la forma de las curvas y no solo el aserto.

**Presupuesto: 10 minutos** (v2.16; antes 5). Los cinco minutos se fijaron cuando
esta suite todavía no medía nada. Se lanza aparte y en nocturna, así que el
presupuesto está para que no se descontrole, no para forzar decisiones: **no se
degrada la medición para caber en él.** Si un módulo nuevo lo desborda, se
informa y se decide; no se recortan semillas ni años por su cuenta.

**Medido (v2.44): cruzado, 638,4 s.** No por un módulo más caro de calcular:
las partidas adversas, que antes se dispersaban hacia el año 25 por el bucle de
A.15 sin consecuencias, ahora sobreviven mucho más cerca del horizonte de 200
años — el mismo arreglo que abrió la horquilla alarga el bucle principal del
banco. Sin recortar semillas, años ni políticas. Sin resolver esta ronda.

### 14.2.1 Suite de recorridos (`tests/journeys/`, minutos)

Siete ficheros que **viven una jornada escénica entera o corren miles de ticks**,
en varias semillas: los trastos de V-09, las escenas de V-07, los animales de
V-08, la elección de V-06, los sitios de V-10, las obras del motor y el
determinismo a cinco mil ticks.

Lo que distingue este nivel del primero no es que sea lento: es **qué clase de
afirmación sostiene**. Una prueba rápida dice «esta función cumple esta
propiedad»; una de recorrido dice «una aldea entera, vivida de principio a fin,
se comporta así». La segunda no se puede escribir barata y no se puede tirar.

Presupuesto: **menos de tres minutos.** Si sube, o se reparte en más semillas de
las que hacen falta o hay algo que medir.

### 14.3 Capturas (`tools/screenshots.ts`, Playwright)

**Obligatorio desde el primer día que se dibuje algo** (`valle.md` §12).

**Y una lección que costó todo el programa de interfaz** (v3.66): una reja de
capturas roja que nadie mira no mitiga ningún riesgo. Ocho de trece recorridos
llevaban fallando desde U-01 sin que nadie lo supiera, porque CI sólo dispara en
`main` o en un pull request y el trabajo llevaba 167 commits en una rama.
**Un recorrido de navegador tiene que decir además contra qué render corre**:
los dos que había pasaban por no tener WebGL —el relevo a 3D fallaba en
silencio, que es lo correcto para el jugador y desastroso para una prueba— así
que medían el Canvas creyendo medir el juego. Se pide explícito en la dirección
(`?render=canvas`) o se exige explícito en `data-render`; lo que no vale es
dejarlo al azar del entorno.

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
| **1** | Valle visible | Se ve la aldea y las estaciones; sin jugador | M-13 … M-19 · **alcanzado v2.74** |
| **2** | Encrucijadas | Una decisión que cambia el valle de forma visible | M-20 … M-22 · **alcanzado v2.61** |
| **3** | Generaciones | Envejecen, mueren, heredan; la aldea recuerda | M-04, M-05, M-06 · **alcanzado v2.69** |
| **4** | Fracaso y herencia | Una aldea puede extinguirse; quedan ruinas | M-24, M-25 · **alcanzado v2.68** |
| **5** | Idle | Tiempo real, letargo, parte de bienvenida | M-20, M-23 · **alcanzado v2.69** |
| **6** | Guardado | Persistencia; primera partida real de varios días | M-23 completo; aceptación humana pendiente |

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

## 16. Hitos 4 a 6 — estado

Nacieron como esbozos porque dependían de cómo se sintiera el juego. M-20 a M-25
ya permiten evaluarlos: aquí queda separado lo implementado de las aceptaciones
que todavía requieren una persona jugando.

### 16.1 Hito 4 — Fracaso y herencia

Contrato que el resto del código debe respetar desde ya:

- `GameState.ended: EndState | null` existe desde el principio y el bucle lo
  comprueba en el paso 17.
- `SaveFile.archive` existe desde el principio, aunque esté vacío.
- `ValleyMap.ruins` se rellena y se dibuja desde el hito 1, aunque solo lo use
  el incendio.

**Hito alcanzado en M-25 (v2.68).** M-24 aporta archivo, semilla de terreno
separada, pico de población y transición pura. M-25 detiene el reloj, presenta
causa, duración y pico, deja releer la crónica completa y funda la sucesora solo
por gesto explícito. La huella heredada se ve como cimentación continua. El
archivo conserva todas las partidas; una política de poda exigiría primero
evidencia real de presión de almacenamiento.

### 16.2 Hito 5 — Idle

**Alcanzado en v2.69.** El contrato de §13.2 está implementado por M-20 y M-23:
reloj real, pausa y cuatro velocidades, letargo acotado y parte de bienvenida. Lo
que sigue necesitando juego humano es el ajuste de los tiempos de §12.1. La
estación de 3 minutos y la generación de 4 horas son una hipótesis razonada, no
un dato. Ese ajuste consiste en cambiar `REAL_MS_PER_TICK` y nada más — por eso
el motor cuenta en ticks y no en minutos — y no reabre el hito mientras el flujo
funcional permanezca entero.

### 16.3 Hito 6 — Guardado

**M-23 implementado; hito pendiente.** §13.1 funciona en IndexedDB y M-24 ya
resolvió la primera política de migración: esquema 1 a 2, aditiva y sin inventar
el pico histórico ausente. Falta el criterio que no automatiza ninguna suite:
una partida real de varios días. Hasta entonces el guardado está verificado,
pero el hito no está aceptado.

**Primera sesión humana real (11 sep 2026): el hito NO se acepta, y la razón no
es el guardado.** Instalada en un Android, jugada unos treinta y cinco minutos
y abandonada. Palabras del jugador: *«no sé ni qué está pasando, solo veo a los
aldeanos salir de sus casas, dar un par de vueltas y volver a dormir»*, y *«no
me pidas que me entren ganas de volver al juego»*. El criterio de §15 pregunta
si vuelves; la respuesta fue no, y llegó sin necesidad de los varios días.

**No es un fallo de persistencia y conviene no confundirlo.** El guardado
funcionó; lo que falló fue que la aldea no cuenta lo que le pasa. Su crónica de
esa misma sesión registra, en los veinte años que estuvo mirando, un asalto al
granero repelido, una muerte a manos de otro, un incendio, la fragua encendida,
una sucesión y dos encrucijadas decididas — **unos quince sucesos notables en
veinte años, uno por minuto de pantalla** — y ninguno tenía un píxel en el
valle. Dos causas medidas y atacadas en la v2.84: §11.6 (los sucesos no se
veían) y §13.2 (el reloj se paraba en segundo plano y nadie lo recuperaba, así
que la mitad del tiempo jugado no existió).

Queda anotado como evidencia, no como veredicto definitivo del hito: la sesión
se interrumpió antes del protocolo de varios días, y **hay que repetirla cuando
el valle sepa contar lo que ocurre**. Lo que sí queda cerrado es que la pregunta
tiene, por primera vez, una respuesta de una persona.

---

## 17. Briefs por módulo

**Programa gráfico nuevo:** briefs G-00–G-12 en Anexo D.12, con dependencias
en D.13. Se mantienen los briefs M como contrato del juego de producción hasta
la migración explícita de G-12.

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
export function resolveDeaths(state: GameState, ctx: TickContext): DeathEvent[];
export function resolveBirths(state: GameState, ctx: TickContext): BirthEvent[];
export function resolveMigration(state: GameState): MigrationEvent[];
export function workforce(state: GameState): number;
export function population(state: GameState): number;
```
**Reglas.** Fórmulas de §6.5 y §5.7 exactas. `TickContext` transporta `severity`,
`cold` y el brote activo; la demografía no los calcula. Las listas se fotografían
al empezar: un recién nacido no muere en su mismo tick.

**No hay `ageEveryone`.** La edad se deriva de `bornTick` (§6.5), así que en el
borde del año no hay ningún campo que incrementar y la función sería un no-op en
el contrato público del módulo de personas. Lo que sí pasa en la semana 0 es el
paso 2 del tick y vive en `sim.ts` (M-10).

**Tests.** Una aldea de 20 personas sin hambre ni peste crece; con `severity = 1`
sostenido deja de reproducirse por completo y encoge —la extinción la produce el
paso 7 del tick, `STARVATION_RATE`, que es de M-06 y se asevera allí—; la
esperanza de vida al nacer cae entre 28 y 38 años sobre 20 000 aldeanos
simulados con la tabla **pura**, sin hambre ni frío ni brote, porque medida
dentro de una partida con hambre baja de 28 y el test fallaría sin que nada
estuviera mal; en torno a dos de cada tres llegan a los 15; la migración respeta
todas sus puertas.
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
existen entre nombrados. **No se limpian al morir alguien**: que uno no
perdonara a un muerto es material narrativo, y con ocho nombrados vivos el coste
de guardarlo es cero. `driftOpinions` sí se salta a los muertos en ambos
sentidos — un muerto no cambia de opinión, ni sobre él se ablanda nadie solo con
el tiempo.
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
export function renderUiText(key: string, params?: Record<string,string|number>): string;
```
**Reglas.** El banco del Anexo B, 3–5 variantes por clave. Prohibiciones de
§9.3. La prosa narrativa vive en `BANK`; las etiquetas estables, en `UI_BANK`.
Ningún otro módulo escribe texto: empujan claves y parámetros.
**Tests.** Toda clave usada por el catálogo existe en el banco; toda clave del
banco tiene al menos 3 variantes; ningún texto contiene `!`, ` you `, ` your `;
todos los parámetros de una plantilla se sustituyen (no quedan `{}` sin
resolver) sobre 5 000 entradas generadas. El banco estable cubre el armazón y
cada identificador de edificio, terreno, rasgo y memoria que llega a una ficha.
**Terminado cuando.** `renderYear` de una partida de 60 años se lee de corrido.

**Estado de interfaz (v2.78): implementado.** Todo texto visible y accesible de
las cinco pantallas se resuelve mediante `renderEntry` o `renderUiText`.

---

### M-10 · Orquestación y runner de consola

**Objetivo.** El tick completo y el entregable del hito 0.
**Depende de.** M-04, M-06, M-07, M-08, M-09.
**Ficheros.** `src/engine/sim.ts`, `src/engine/found.ts`, `src/cli/chronicle.ts`,
`tools/reader-packet-content.ts`, `tools/reader-packet.ts`.
**Contrato.**
```ts
export function foundGame(seed: number, inherited?: {
  terrainSeed: number; ruins: Uint8Array;
}): GameState;
export function tick(state: GameState, catalogue: Catalogue, decision?: Decision): TickReport;
export function run(state: GameState, ticks: number, policy: Policy, catalogue: Catalogue): TickReport[];
export type Policy = 'first' | 'last' | 'random' | 'worst' | 'prudent'
  | ((state: GameState, options: readonly string[]) => string);
```
El catálogo se inyecta como en M-07, para probar escenarios sin introducir un
catálogo global en la orquestación. `run` devuelve los informes semanales que
usa la instrumentación; `TickReport.deaths` abarca todas las causas de la semana.
Estas firmas hacen explícita la API ya implementada en M-10.
**Reglas.** El orden de §4.2 es normativo y el código lo refleja con 17 llamadas
numeradas y comentadas. `tick` no dibuja ni escribe por consola.
**Tests.** El test de determinismo de §4.3; el orden del tick verificado con
espías; 1 000 ticks sin excepciones en 20 semillas.
**Terminado cuando.** `npm run chronicle -- --seed 7 --years 60` imprime una
crónica legible. **Este es el hito 0.**

**Estado del paquete ciego (v2.79): implementado.** Su contenido es puro y una
prueba rápida fija los cuatro ficheros entregables, el cegado y la pregunta. La
aceptación humana de §9.5 permanece pendiente.

---

### M-11 · Suite rápida

**Objetivo.** Que romper algo se note en segundos.
**Depende de.** M-10.
**Ficheros.** `tests/fast/**`.
**Contrato.** Los nueve grupos enumerados en §14.1.
**Reglas.** Los tests describen propiedades del diseño, no detalles de
implementación. Nada de comprobar que una función llama a otra.
**Tests.** Son el entregable.
**Terminado cuando.** `npm test` tarda menos de 20 s y cubre los nueve grupos.
Hasta implementar M-13/M-14, M-20 y M-23, las propiedades de geometría, mapa,
cámara y guardado figuran pendientes: no se sustituyen por pruebas del andamiaje.

**Estado (v2.65): implementado.** Los nueve grupos tienen pruebas propietarias;
la suite ejecuta 620 pruebas sin pendientes en 17,53 s.

---

### M-12 · Banco de pruebas de balance

**Objetivo.** Poder tocar §12 sin volar el juego.
**Depende de.** M-10.
**Ficheros.** `tests/balance/**`, `tools/balance-report.ts`.
**Contrato.** `npm run test:balance` ejecuta 60 semillas × 200 años con las
políticas `prudent`, `first`, `last` y `worst`, comprueba los umbrales de §12.9, imprime una tabla
y escribe `artifacts/balance.csv`.
**Reglas.** Ningún umbral se fija con una sola semilla. Las series se guardan
para poder mirar la forma de las curvas.
**Tests.** Son el entregable.
**Terminado cuando.** Los umbrales aplicables de §12.9 pasan, las comprobaciones
pendientes de módulos posteriores o de aclaración de política están resueltas,
y la ejecución completa tarda menos de 15 minutos. **Subido de 10 a 15 en la
v2.45, y es la última vez que se sube sin optimizar:** el coste creció a 638,4 s
porque las partidas adversas ya no se dispersan hacia el año 25 y llegan al
horizonte de 200 años. Es el mundo sano, no instrumentación cara. Pero un
presupuesto que se amplía cada vez que se cruza deja de ser un presupuesto.

**Estado (v2.12): no cerrado.** 19 de 25 asertos pasan en 187,55 s. `first` pasa
los seis umbrales que le aplican. Quedan cuatro fallos, enumerados en §2.12: la
cadencia de `last`/`worst` (arrastrada por `succession`, elegible en el 78 % de
los ticks), la elegibilidad de `wolf_winter` (pendiente de M-15), el pico de
`last` y el 60 % de mapas llenos. Ninguno se ha relajado. Las dos pruebas
pendientes son la banda de extinción «neutra» —sin política asignada— y el
bosque restante al año 100, de M-15.

---

### M-13 · Generación del mapa

**Objetivo.** Un valle creíble y siempre igual para la misma semilla.
**Depende de.** M-02.
**Ficheros.** `src/engine/world/mapgen.ts`, `tiles.ts`.
La ronda v2.12 incluye sus constantes en `balance.ts` (`MAPGEN`), las pruebas en
`tests/fast/mapgen.test.ts` y el volcado ASCII en `tools/map-dump.ts`
(`npm run map -- --seed 7`); la conexión con `found.ts` pertenece a M-10.
`idx` y `neighbours4` viven en `tiles.ts`, para que M-14 y M-15 tengan la
topología sin arrastrar el generador, y `mapgen.ts` las reexporta para que el
contrato de abajo se lea de un solo import.
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

**Estado (v2.12): hecho.** Nueve pruebas sobre 200 semillas: río continuo de
borde a borde y de una sola masa de agua, bosque en la banda, claro de 12×12 de
pradera sin marisma adyacente, pureza de `generateMap`, reproducibilidad celda a
celda y más del 15 % de celdas distintas entre semillas. El volcado de la
semilla 7 se reconoce como valle.

---

### M-14 · Edificios, colocación y obras

**Objetivo.** Que la aldea se construya sola y con criterio.
**Depende de.** M-13, M-06.
**Ficheros.** `src/engine/world/buildings.ts`, `placement.ts`, `works.ts`,
`upgrade.ts`.
La ronda v2.12 incluye las constantes en `balance.ts` (`BUILDING_RULES`), las
pruebas en `tests/journeys/works.test.ts` y en `tests/balance/`, y la integración
M-10 en `found.ts`/`sim.ts`. El contrato M-07 ya garantiza `build.free: true`;
no se cambia su API, el catálogo ni sus efectos. `nextProject` devuelve también
las mejoras, y el tipo `Upgrade` vive en `upgrade.ts` junto a `upgradeSpot`, que
es quien sabe que una iglesia es más grande que su capilla.
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

**Estado (v2.12): hecho, con un objetivo de §12.9 sin alcanzar.** La semilla 108
llega al año 120 con 49 edificios en pie —16 casas de piedra, 8 campos, 3
graneros, capilla, molino, fragua, pozo y 18 tramos de muralla— y 45 vivos. En
60 semillas × 200 años × tres políticas no hay **ni un** solapamiento entre
edificios u obras, ni un edificio sobre agua o marisma, ni un tope de §7.2
superado. Lo que no llega es el 60 % de mapas con 8 campos y 16 casas antes del
año 120: `first` da 46,7 %, y el techo lo pone la extinción (61,7 %), no la
construcción. Ver §2.12.

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
export function fellForest(state: GameState, wood: number, permanent?: boolean): number;
export function fellForestWithLocation(
  state: GameState, wood: number, permanent?: boolean,
): { wood: number; firstCell: number | null };
export function regrowForest(state: GameState): void;
```
**Reglas.** Umbrales y decaimiento de §12.7. La tala consume la celda de bosque
más cercana al núcleo. El rebrote necesita 3 vecinas y 8 años.
**Tests.** Con tráfico constante, una celda alcanza `path = 2` en el número de
ticks esperado ±5 %; sin tráfico, un camino desaparece; el bosque nunca baja de
0 ni sube del total inicial; el rebrote no ocurre bajo un edificio.
**Terminado cuando.** A los 100 años, el bosque restante cae en el rango de
§12.9 en al menos 20 de 30 semillas.

**Estado (v2.15): implementado, con el criterio de cierre sin alcanzar.** Las
cinco funciones del contrato están, con veintiuna pruebas: el coste del suelo,
que el trayecto es contiguo y determinista y prefiere la calzada al bosque, que
una celda llega a sendero en el número de semanas que sale de la fórmula ±5 %,
que sin tráfico el camino se borra, que la calzada necesita fragua, que la
madera nunca baja de cero ni sube del total inicial en un siglo, y que el
rebrote necesita sus tres vecinas y sus ocho años y no ocurre bajo un edificio.
Lo que no llega es la fila del bosque: 24 de 40 valles, y quince de los fallos
son por conservar **de más**. Ver §2.15.

---

### M-16 · Terreno y paletas

**Objetivo.** Que el valle se vea, y que la estación se reconozca por el color.
**Depende de.** M-13, M-00.
**Ficheros.** `src/derive/palette.ts` (era `src/render/palette.ts`; v3.66 la
sacó a la capa de derivación, porque el suelo del 3D la lee igual),
`src/render/layers/terrain.ts`,
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

**Estado (v2.50): implementado.** El fondo cacheado pinta regiones de terreno y
caminos; la hoja de 16 estados muestra cuatro estaciones inconfundibles. La
tabla se corrigió porque sus colores originales no podían superar el test de
silueta que ella misma imponía; evidencia y valores están en §2.50.

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

**Estado (v2.51): implementado.** Trece clases de edificio, ruina, aldeano y
nombrado pasan la auditoría de píxeles a 9 y 10 px; la hoja móvil distingue las
siete familias principales sin rótulos. Las aspas quedan quietas por el contrato
de caché documentado en §2.51.

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

**Estado (v2.57): cerrado.** Posiciones puras, rutas cacheadas, domingo en la
plaza, noche vacía, límite de 80 y presupuesto verificados. El GIF de veinte
segundos sobre un valle determinista de 80 habitantes muestra salida, trabajo,
regreso, noche y nuevo ciclo con la fracción temporal real de M-20.

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

**Estado (v2.49): implementado.** Ruta determinista, geometría móvil, 32
capturas y hoja de contacto verificadas antes de empezar M-16. El lienzo
diagnóstico es deliberadamente plano: su único contrato es recibir el pintado
real sin volver a diseñar la automatización.

---

### M-20 · Armazón de aplicación

**Objetivo.** Que el juego corra en una pantalla.
**Depende de.** M-10, M-16, M-17.
**Ficheros.** `src/ui/app.ts`, `loop.ts`, `speed.ts`, `src/main.ts`.
**Contrato.**
```ts
export function boot(root: HTMLElement, save?: SaveFile): App;
export interface App {
  setSpeed(s: 0|1|4|16): void;
  state(): Readonly<GameState>;
  decide(optionId: string): boolean;   // v2.60 — ver abajo
}
```
**La decisión pendiente (v2.60).** `decide` **encola**, no aplica. La opción la
consume el **paso 3 del tick**, que es donde §4.2 pone las decisiones, y así todo
cambio de estado sigue pasando por el tick: la interfaz nunca llama a
`applyOption`. Si lo hiciera, mutaría el estado fuera del orden normativo y
rompería el registro de decisiones del que depende la reproducción de §13.1.

Cuatro reglas, y las cuatro son contrato:

1. **Se consume exactamente una vez.** Si no hay encrucijada pendiente, o ya hay
   una decisión encolada, `decide` devuelve `false` y **no sustituye** a la
   anterior. Decidido es decidido: un doble toque no puede cambiar algo que ya va
   camino de `history`.
2. **Encolar fuerza el tick siguiente de inmediato**, sea cual sea la velocidad.
   Sin esto, el jugador toca y no pasa nada hasta quince segundos después a ×1, y
   la decisión más pesada del juego se siente rota. Con esto, el efecto aparece
   en el acto y sigue habiendo un solo camino de mutación.
3. **En pausa la decisión espera.** §8.7 dice que la simulación no se detiene por
   una encrucijada pendiente, no que el jugador no pueda pausar el juego.
4. **El motor informa; la interfaz enfoca.** `TickReport` devuelve los
   `VisualEffect` aplicados **con sus coordenadas de mapa**. El motor no sabe que
   existe una cámara (§2.4) y no dice «enfoca aquí»: dice «esto ha cambiado, en
   estas celdas». Los dos segundos de §11.2 los decide la interfaz con esa lista.

**Reglas.** El bucle acumula tiempo real y ejecuta ticks enteros; el render
interpola con la fracción sobrante. Si la pestaña estuvo oculta, no se acumulan
ticks: eso lo resuelve el letargo (M-23). Nunca más de 8 ticks por fotograma.
**Tests.** Lógica de acumulación de tiempo probada sin DOM: a ×4 y 60 fps, 12
minutos reales dan exactamente 192 ticks.
**Terminado cuando.** Se abre en un móvil, se ve el valle y las estaciones pasan.

**Estado (v2.56): implementado.** La prueba pura produce 192 ticks exactos y
mantiene la deuda tras el tope por fotograma. Playwright abre la aplicación a
390×844, acciona las velocidades y adelanta el reloj hasta comprobar un
cambio de estación.

**Estado de `decide` (v2.61): implementado.** `attemptDecision` — la lógica
pura de las cuatro reglas — se prueba sin DOM; `boot` la envuelve con el reloj
real. Playwright confirma que decidir cierra la encrucijada y cambia la
transformación del lienzo (§17 M-22).

---

### M-21 · HUD diegético y fichas

**Objetivo.** Informar sin números en pantalla.
**Depende de.** M-20.
**Ficheros.** `src/ui/inspect.ts`, `gestures.ts`, `src/render/layers/tells.ts`.
**Contrato.**
```ts
export function tellsFor(state: GameState): Tell[];         // humo, velas, cruces, granero
export function inspectAt(state, x: number, y: number, tickFraction?: number): InspectTarget | null;
export function panelFor(t: InspectTarget, state): PanelModel;
```
**Reglas.** La tabla de §11.1 completa. La ficha muestra la cifra exacta: el
juego no esconde datos. Gestos de §11.3, en un módulo sin DOM y con tests.
**Tests.** `inspectAt` acierta el objetivo en los bordes de las cajas; `tellsFor`
es pura; el reconocimiento de gestos se prueba con secuencias de eventos
sintéticas.

**Estado (v2.59): implementado.** Señales, inspección, fichas y reconocimiento
de los seis gestos tienen pruebas sin DOM; la adaptación de puntero abre el panel
inferior, sigue nombrados y aplica zoom. Playwright verifica el toque en un valle
maduro y conserva una escena de hambre sin cifras ni ficha abiertas.
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
Al decidir, la cámara enfoca durante 2 s el efecto visible. El enfoque lo elige
la interfaz a partir de los `VisualEffect` con coordenadas que devuelve el
`TickReport` (M-20): el motor informa de qué cambió y dónde, nunca de adónde
mirar.
**Tests.** Todas las opciones de las 16 plantillas se renderizan sin
desbordamiento a 390 px de ancho; el enfoque posterior apunta a una celda
válida.
**Terminado cuando.** Una decisión cambia el valle de forma visible. **Este es
el hito 2.**

**Estado (v2.61): implementado — hito 2 alcanzado.** El precio de las tres
opciones se lee sin desplazar a 390 px de ancho reales (GIF y hallazgos en
§2.61). `boot` (M-20) abre la encrucijada él mismo en cuanto hay una pendiente
—incluida la primera pintura, para una partida guardada o una ruta de depuración
que ya aterrice sobre una— y conecta el deslizar hacia arriba a `openChronicle`,
que hasta ahora no tenía oyente. Sin botón de cerrar: un deslizar hacia abajo
devuelve al valle y dibuja una marca discreta que reabre la misma encrucijada.

---

### M-23 · Guardado y letargo

**Objetivo.** Que la aldea siga sin ti.
**Depende de.** M-20, M-10.
**Ficheros.** `src/engine/save.ts`, `src/ui/lethargy.ts`, `src/ui/welcome.ts`.
**Contrato.**
```ts
// v2.63: `serialize` gana dos parámetros que el esquema original no traía.
// `SaveFile` necesita `archive` (partidas anteriores; no las deriva `state`) y
// `savedAtMs` (reloj de pared) y ninguno de los dos sale de `(state,
// decisions)` — y `src/engine/` no puede leer el reloj él mismo (CLAUDE.md).
export function serialize(
  state: GameState, decisions: DecisionRecord[],
  archive: ArchivedGame[], savedAtMs: number,
): SaveFile;
export function deserialize(raw: unknown): SaveFile;          // valida y migra
export function catchUp(state: GameState, elapsedMs: number): CatchUpReport;
```
**Reglas.** §13 completa. Guardado cada 20 ticks y en `visibilitychange`. Tope
de letargo de 4 h. Una encrucijada pendiente sigue pendiente. Lotes de 64 ticks
dentro de `requestAnimationFrame`.
**Tests.** Ida y vuelta idéntica; un guardado corrupto, incluido un contenedor
interno parcial, se rechaza antes de `boot`; `catchUp` de 4 h ejecuta
exactamente 960 ticks y tarda menos de 2 s;
reproducir el registro de decisiones desde la semilla da el mismo estado que la
instantánea; una instantánea entre lotes conserva exactamente la deuda restante
y el estado completado se solicita antes de abrir el parte; una condición
diferida fuera de los dominios cerrados de §8.2 se rechaza, y las 65 que el
catálogo escribe hoy se aceptan.
**Terminado cuando.** Cerrar y abrir a las cuatro horas presenta un parte de
bienvenida coherente. Esto cierra M-23 y deja listo el hito 6; la aceptación
adicional de varios días reales permanece en §15.

**Estado (v2.81): módulo implementado; hito 6 pendiente de aceptación humana
según §15.** La firma del contrato no cambia desde v2.63; lo que se estrecha en
v2.81 es lo que `deserialize` acepta dentro de una condición diferida (§13.1). `catchUp` corre los 960 ticks en un solo lote síncrono (es lo que su
propia prueba mide en menos de 2 s); el letargo de la interfaz (`ui/lethargy.ts`)
es un bucle distinto sobre lotes de 64, la misma separación pura/DOM que
`loop.ts`. El guardado real vive en IndexedDB (`ui/idb.ts`, fuera del contrato
de este módulo: ninguno de los tres ficheros lo abre por su cuenta) y
`app.ts`/`main.ts` quedan enganchados: guardan cada 20 ticks, al ocultar la
pestaña y en `pagehide` antes de detener el bucle; cargan al abrir, ponen al día
antes de que el bucle normal toque el mismo estado y muestran el parte de
bienvenida antes que nada más. Verificado
con Playwright y reloj falso: cerrar y volver a las cuatro horas, sin esperar,
entrega un parte legible y la instantánea completada alcanza IndexedDB. Un
cierre entre lotes conserva en su fecha la deuda exacta que falta (§2.80);
§2.63 trae el texto real y lo que no se entiende a la primera lectura.

---

### M-24 · Núcleo de fracaso y herencia

**Objetivo.** Que una aldea terminada pueda convertirse, sin interfaz, en la
memoria visual de la siguiente.
**Depende de.** M-23, M-13, M-14.
**Ficheros.** `src/engine/state.ts`, `found.ts`, `save.ts`, `sim.ts`.
**Contrato.** `GameState.terrainSeed`, `GameState.peakPeople`, `archiveGame` y
`foundSuccessor` tal como se fijan en §13.3.
**Reglas.** Una aldea viva no se archiva. La máscara une ruinas previas y
edificios finales. La sucesora cambia `seed`, conserva `terrainSeed`; la ruina
es solo visible. El pico se observa al cierre de tick. Esquema 1 migra según
§13.1.
**Tests.** Migración aditiva; copia aislada; huella completa; terreno y máscara
idénticos; personas distintas; ruina sin ocupación mecánica.
**Terminado cuando.** La transición pura completa pasa ida y vuelta y no hace
ninguna elección de interfaz. **No alcanza todavía el hito 4.**

**Estado (v2.67): implementado.** Las decisiones pendientes permanecen en
§16.1 y requieren jugar la pantalla que las presente.

---

### M-25 · Epitafio y herencia visible

**Objetivo.** Cerrar una aldea ante el jugador y convertir su huella en el
comienzo visible de la siguiente.
**Depende de.** M-24, M-22, M-23.
**Ficheros.** `src/ui/app.ts`, `src/ui/screens/epitaph.ts`,
`src/ui/screens/crossroad.ts`, `src/render/layers/buildings.ts`, banco y render
de crónica, ruta de depuración y Playwright.
**Contrato.** El primer `EndState` detiene el bucle y archiva una sola vez. El
epitafio presenta causa, años y `peakPeople`; «Read the chronicle» abre el
registro cerrado y «Begin again» llama a `foundSuccessor` con semilla nueva.
Las escrituras de guardado mantienen el orden de solicitud fijado en §13.1.
**Reglas.** Ninguna opción se decide al cerrar; las ruinas son visibles e
inertes; la máscara usa la regla gráfica de §10.4; el archivo es acumulativo.
La semilla nueva no repite ninguna del archivo. Todo texto visible procede del
banco.
**Tests.** Pantalla y controles a 390 × 844; crónica abrible y cerrable; sucesora
en `ANNO I`; huella visible; guardado vivo con un solo archivo después de entrar
de nuevo por la ruta normal.
**Terminado cuando.** Las dos capturas se han mirado, el flujo completo pasa y
una recarga no devuelve la aldea muerta.

**Estado (v2.68): implementado. Hito 4 alcanzado.**

---

### M-26 · Lector de crónicas archivadas

**Objetivo.** Que las historias conservadas por §13.3 sigan al alcance después
de fundar otra aldea.
**Depende de.** M-25, M-22, M-09.
**Ficheros.** `src/ui/app.ts`, `src/ui/screens/chronicle.ts`,
`src/engine/chronicle/render.ts`, `bank.en.ts`, pruebas rápida y Playwright.
**Contrato.** `App.archive(): readonly ArchivedGame[]` expone lectura;
`renderChronicleYear(entries, rng, year, minWeight?)` compone una fuente sin
exigir un `GameState`. `renderYear` delega y no cambia de firma.
**Reglas.** El selector vive dentro de la pantalla 4; actual primero,
antepasadas en orden inverso de archivo. La partida actual terminada no se
duplica. La voz se reconstruye desde `seed`, sin migración.
**Tests.** Igualdad de prosa actual/archivada; dos opciones tras la primera
sucesora; selección cambia el cuerpo; cierre por gesto; captura móvil mirada.
**Terminado cuando.** Una crónica anterior se puede leer completa desde el
valle sucesor y el selector cabe a 390 px.

**Estado (v2.71): implementado y mirado.**

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
                                   │
                                 M-24 ─ M-25  ← HITO 4
                                         └─ M-26  (archivo legible)
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
**Requiere** `season = winter`, `seasonWeek ≥ 6`, `grainToHarvest < 0.9`, `flag vassal` sin poner
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
| **The pit** | No one will forget who chose it | `faith −20`, brote −3 semanas, `opinion A→leader −40` | `scar grave_row` | `unquiet_ground`, 6–18 años: `faith −10`, `morale −8` |
| **Burn the houses of the dead** | Roofs for ash | `destroy house 2` con suelo bloqueado 20 años, brote −4 semanas, `morale −14` | `ruin house` ×2 | `the_burnt_row`, 3–10 años: entrada de crónica y cicatriz |

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
| **Silence {A}** | The village keeps its priest and loses its faith | `faith −30`, `morale −5` | `douse` de la capilla 3 años | `no_shepherd`, 4–10 años: `faith −15` si entonces no hay cura |
| **Say nothing** | It will find its own end | `morale −12`, `faith −8`, brote +2 semanas | `gather square 4` | `whispers`, 5–12 años: `grudge` nuevo entre dos nombrados al azar |

---

### A.7 `smith_feud` · feud

**Peso** 9 · **Reposo** 15 años
**Requiere** `grudge min 45`, `people > 20` — con 55 no dispara nunca: la ventana en que alguien odia a otro por más de 55, hay más de veinte personas y el reposo ha vencido, no llega a solaparse en 2 000 años de aldea
**Reparto** `A = anyNamed`, `B = grudgeAgainst A`

> **The Anvil and the Altar**
> It has been building for years. This morning {A} put a hand on {B} in front
> of the whole village, and now both are waiting to see what you do.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Side with {A}** | {B} withdraws | `opinion B→A −30`, `lit` del edificio de B apagado 4 años, obra −15 % 4 años | `douse` del edificio de B | `the_withdrawn`, 6–14 años: B se marcha con 2 personas |
| **Side with {B}** | {A} withdraws | Simétrico | `douse` del edificio de A | Simétrico |
| **Make them build something together** | Neither forgives it, and the wall goes up | `build palisade free` ×4, `morale +8`, ambas opiniones −15 | `raise palisade` | `uneasy_truce`, 10–25 años, 50 %: el rencor vuelve peor, `opinion −70` |

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
| **The chapel** | The next harvest comes in one fifth lighter | `build chapel free`, `faith +20`, `morale +10`, próxima cosecha ×0.8 | `raise chapel` | `the_faithful_valley`, 15–30 años: si `faith > 70`, `arrive 4` peregrinos |
| **The granary** | {A} will remember which you chose | `build granary free`, `opinion A→leader −35`, `faith −10` | `raise granary` | `a_priest_without_a_roof`, 8–16 años: `role priest null`, `faith −15` |

---

### A.10 `relic_pedlar` · faith

**Peso** 6 · **Reposo** 25 años
**Requiere** `has chapel`, `faith > 30`, `grainYears > 0.6` — se retira el tope de 70: la deriva de §5.6 estabiliza la fe por encima de esa cifra en cuanto hay capilla, así que la franja se abandonaba para no volver (§8.1, regla de la aldea madura). Y una aldea próspera y devota es justo donde aparecería un vendedor de reliquias
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
**Requiere** `forestLeft > 0.12`, `neededFields > fields`, `people > 25` — el 0.3 original era **inalcanzable**: la generación de mapa tope en 0.26 (§12.7), así que la plantilla estaba muerta desde el tick cero. El bosque es aquí una **puerta** («queda madera que valga la pena talar»); el disparador episódico es `neededFields > fields`, y por eso `forest_cut` es contenido de la primera mitad **por diseño**: no se roturan más campos que el tope de ocho
**Reparto** `A = woodward`

> **The Old Wood**
> The fields will not feed another winter's worth of children. The nearest
> flat ground is under three hundred years of oak. {A} has walked it twice
> and come back with nothing to say.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Fell it** | The wood does not come back in your lifetime | `fell 900 permanent`, `build field free` ×2, `wood +900`, `faith −10` | `scar felled_wood` + `raise field` | `bare_slopes`, 20–40 años: `flag flood_prone 0`; el clima ruinoso pasa a ser un 5 % más probable |
| **Take only the edge** | Slower, and the children are hungry now | `fell 300`, `build field free` ×1, `wood +300`, `severity` mínima 0.5 una semana | `raise field` | — |
| **Leave it standing** | {A} sleeps well; nobody else does | `morale −8`, `faith +12`, `opinion A→leader +40` | `gather ford 2` | `the_wood_holds`, 15–35 años: si `forestLeft > 0.5`, `arrive 3` y `morale +10` |

---

### A.12 `wolf_winter` · forest

**Peso** 7 · **Reposo** 12 años
**Requiere** `season = winter`, `forestLeft > 0.25`, `people > 15` — y ese 0.25
es **inalcanzable**, la misma errata que el 0.3 de A.11: el valle fundaba entre
0.20 y 0.26 (`MAPGEN.FOREST_FRACTION`) y `forestLeft` sólo baja desde ahí con la
tala, así que ninguna semilla cruza el umbral (medido 0.177–0.244 en cuatro
semillas × sesenta años, cero apariciones). El bosque es aquí una **puerta**
—«queda bosque suficiente para que los lobos sean una amenaza»— y no el motor
del episodio, que son el invierno y la gente.

> **Y el mapa grande lo arregló solo** (medido el 15 sep 2026 al fusionar la
> rama que venía a bajarlo). v3.68 redefinió `forestLeft` contra el corazón
> productivo, y con eso el 0.25 **ya se cruza**: `crossroads-reachability.test.ts`
> encuentra la plantilla elegible sin tocar el umbral. Así que el umbral se
> queda, el cambio de la rama se deshizo, y lo que sí queda rojo es otra cosa
> que esa misma prueba destapó: **`plague_blame` y `bandits` no cumplen
> condiciones nunca** en seis semillas × sesenta años. Eso se queda escrito y
> declarado —no se mete en la lista de excepciones— porque es un hallazgo, y el
> sistema de encrucijadas se va a rehacer casi entero.
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

**Peso** 10 · **Reposo** 20 años
**Requiere** `people ≥ 12`, `housingFree ≥ 2`, `not flag hostile`, `morale ≥ 55`
**Reparto** `A = leader`, `B = reeve`

> **Nine at the Ford**
> Nine of them, with a cart and no oxen. They say their village is ash and
> will not say who burned it. {B} has counted the grain twice.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Take them in** | Nine more mouths before the harvest | `arrive 9`, `grain −40`, `morale +6` | `gather ford 4` | `whoever_burned_it`, 3–10 años, 40 %: `flag threatened 3`, `kill random fraction 0.10` |
| **Feed them and send them on** | Sixty bushels, and they leave before nightfall | `grain −60`, `faith +10`, `morale −3` | `gather ford 2` | — |
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
**Requiere** `not role leader alive`, `not flag interregnum`
**Reparto** `A = anyNamed` **filtrado** a 20–60 años, `B = anyNamed excluding [A]` (igual). Si no llegan a dos candidatos en la banda, se ensancha; el respaldo es la excepción, no la regla.

> **Who Speaks Now**
> {leaderName} is buried. Two people in this valley expect to be asked, and
> only one of them is going to be.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **{A}** | {B} will remember it | `role A leader`, `opinion B→A −45`, `memory B was_passed_over 4` | `gather square 3` | `the_passed_over`, 5–20 años: si `opinion B→A < −60`, dispara `smith_feud` |
| **{B}** | {A} will remember it | Simétrico | `gather square 3` | Simétrico |
| **No one** | Nobody joins a valley with nobody in charge | `morale −12`, `faith −6`, obra ×0.8 durante 2 años, **`flag interregnum` los mismos años que tarde la semilla**, **llegadas bloqueadas y marchas ×2 mientras no haya líder**; al **tercer «No one» seguido**, la aldea se dispersa (abandono) | `douse` general 1 año | `the_leaderless_years`, 2–4 años: levanta `interregnum` y se vuelve a disparar `succession` |

*Nota de diseño: es la única plantilla que ignora el intervalo mínimo, y el
latido del bucle largo. Cada generación el jugador reparte una herencia y crea
un rencor.*

**Por qué quedarse sin líder tiene que doler (v2.22).** `interregnum` bajó la
elegibilidad de la plantilla del 78 % de los ticks al 5,5 %, pero no arregló lo
de fondo: **«No one» es una opción que no resuelve nada y vuelve a plantear la
misma pregunta.** Medido, `last` y `worst` dedican el **93 % de todas sus
decisiones** —unas 54,5 por partida— a rechazar el liderazgo, y les quedan unas
250 para el resto del catálogo entero. Rechazar salía gratis.

Ahora no. Mientras el puesto esté vacante **ningún forastero se une** —nadie se
muda a un sitio donde nadie manda— y **las marchas de §5.7 se duplican**; al
tercer «No one» consecutivo sin líder de por medio, la aldea se dispersa. No
hace falta tocar ni un efecto del catálogo: bastan mecanismos que ya existen.

**Medido (v2.23).** Funciona, y de más: `last` y `worst` pasan de terminar
prácticamente nunca a terminar el **100 %** de las 60 partidas, casi siempre
antes del año 46. Pero `no_one` sigue siendo el **68,2 %** de sus decisiones —
no el 93 % de antes, pero tampoco menos del 40 % que pide el nuevo aserto de
§12.9—, porque ambas políticas contestan `no_one` **las 178 veces que se les
pregunta, sin una sola excepción**: `last` porque es la última opción de la
lista, que es todo lo que mira; `worst` porque su coste inmediato de ánimo y fe
(18) supera al de nombrar a alguien (0, ninguno de los efectos de `choose_a`
puntúa en `immediateCost`). Ningún castigo que se le añada a `no_one` cambia
esa aritmética, porque ninguna de las dos políticas mira más allá de la semana
en curso. Ver §2.23; la puerta que decidiría si tocar los efectos del
catálogo —`worst` por debajo del 25 % de terminación estando ya fuera del
bucle— no se cruza: está en el 100 %.

**Por qué la bandera `interregnum`.** Sin ella, elegir «No one» deja el puesto
vacante, la vacante vuelve a hacer elegible la plantilla al tick siguiente, y
`succession` pasa a ser elegible el 78 % de los ticks: bajo cualquier política
que rechace a los dos candidatos, la aldea vive preguntándose quién manda y no
queda presupuesto para nada más. La semilla ya decía que la aldea pasa dos a
cuatro años a gritos antes de volver a preguntar; la bandera es la mitad que
faltaba para que eso se cumpliera de verdad.

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
| **The wall** | Cold houses for a generation | Habilita `wall`, leña de invierno ×1.5 durante 20 años, `morale +6` | `raise wall` | `behind_the_wall`, 20–40 años: plantillas de `lord` y `stranger` con peso ×0.4 |
| **The houses** | The valley is rich and open | Habilita `stone_house`, incendios ×0.3, `morale +12` | `raise stone_house` | `worth_taking`, 15–30 años: `flag threatened 8` |

---

### A.17 `quiet_years` · reserva

Plantilla de reserva para la garantía por generación cuando no hay ninguna otra
elegible. **Está fuera del reparto normal**: `eligible()` la salta siempre y solo
se alcanza por el camino de la garantía. Tenerla en la baraja la convertía en una
de cada seis encrucijadas. Requiere solo `grainYears > 1.0`. Ofrece dos usos de un excedente
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

## Anexo D · Programa gráfico 3D y producción remota

### D.0 Autoridad, estado y lectura

**Este anexo gobierna el render del juego.** Forma parte de la fuente única, no
es una segunda especificación. **Estado: G-00 a G-12 cerradas.** Desde G-12
(14 sep 2026) el 3D no es un piloto: es lo que el jugador ve, decidido por el
dueño del diseño con el riesgo escrito delante —todo lo medido de rendimiento es
de un portátil, porque G-09 quedó parcial por no haber dispositivo real—.

Lo que era excepción del piloto es ahora la regla: cámara 3D, representación
temporal D.6, geometría GLB en vez de sprites, selección por proyección y
recursos GPU. **No son, ni fueron nunca, excepciones al aislamiento del motor,
al guardado, al balance ni a la veracidad de los efectos.**

§10 describe el Canvas 2D que queda como puerta de vuelta (`?render=canvas`), y
§11 sigue gobernando las pantallas, que son las mismas para los dos. Lo que §10
y §11 comparten con este anexo vive en `src/derive/`: funciones puras del estado
que ninguno de los dos renders puede permitirse duplicar.

**Una nota de método que este anexo se debe a sí mismo.** El brief de G-12 pedía
actualizar §10, §11 y los briefs M afectados «antes de activar 3D por defecto»,
y la activación se hizo sin la actualización: el commit tocó cinco ficheros de
código y ninguno de documentación. Durante un día la especificación describió un
juego que ya no se jugaba, y de ahí salieron dos regresiones que nadie vio —las
reuniones de §11.8 y la reja de capturas—. **Una migración sin su documentación
no está hecha, está escondida.**

Lectura común: §1–4, D.0–D.2, D.5–D.7, D.11 y el brief asignado. Después,
solo las secciones que el brief nombre. El artista añade D.3–D.4 y D.8; el
responsable de rendimiento D.9–D.10. No se pide leer todo el historial.

Los informes de ronda y prompts son entregables derivados. No pueden introducir
decisiones permanentes: el orquestador las ratifica aquí, con motivo y versión.
Cada ronda informa si una afirmación es **verificada**, **decidida**, **hipótesis**
o **pendiente**. Una captura de Blender no verifica el aspecto dentro del juego.

### D.1 Diagnóstico de partida y alternativas

Hechos inspeccionados en el repositorio:

| Elemento actual | Reutilización y trabajo necesario |
|---|---|
| TypeScript, Vite, PWA, sin dependencia 3D en `package.json` | Mantener aplicación web; incorporar Three.js y fijar versión con lockfile después del diagnóstico |
| `src/engine/` independiente del DOM y del render | Conservar simulación, semillas, decisiones y guardados; un renderer no puede añadir consumo de RNG |
| `renderer.ts`: `paint(state, tickFraction)` y `track(id)` | Conservar una fachada durante transición; hacen falta ciclo de vida, selección y reloj de presentación explícitos |
| `crowd.ts`: rutas derivadas, interpolación, hasta 80 figuras | Reutilizar significado de casa/destino y presencia; sus desplazamientos para anclar sprites no son coordenadas 3D reutilizables sin conversión |
| `world/paths.ts`: destinos y rutas cacheados | Leer APIs puras existentes; no añadir otro sistema de trabajo, tráfico o productividad en el render |
| `ui/inspect.ts` calcula selección usando figuras 2D | Separar elección geométrica del contenido de ficha; conservar `panelFor` y la identidad por id |
| `ui/app.ts` ya permite pinch mediante escala CSS | Sustituir por zoom ortográfico y encuadre; no afirmar que el proyecto carece de zoom |
| Mapa 36 × 56, presentación diseñada para celdas de 9–10 px | Cambiar composición: vista general y acercamiento donde sí se lean gestos y siluetas |
| Capturas Playwright y pruebas PWA existentes | Ampliar para piloto y comparación; no reemplazar cobertura existente por una captura bonita |
| `artifacts/*` está ignorado por Git | Un informe remoto necesita adjuntos o almacenamiento deliberado; una ruta local ignorada no es una entrega remota |
| La base v2.88 incluye animales domésticos y fauna ambiental en el render | Incluirlos en la auditoría de paridad; su representación derivada no autoriza inventar un sistema ganadero en el motor |

Opciones consideradas: mejorar sprites requiere menos infraestructura, pero no
cubre la preferencia por personajes volumétricos; articular piezas 2D es viable
pero limita las vistas; migrar a otro motor introduce portabilidad y reescritura
sin evidencia de necesidad. Se elige **Three.js + modelos GLB + cámara fija**
porque mantiene la aplicación y permite compartir un rig y animaciones.
La recomendación es de ingeniería, no una medición de rendimiento ya realizada.

Las referencias citadas por el usuario expresan cualidades: cercanía de los
personajes, pueblo legible, profundidad, color y ambiente. No se copiarán sus
personajes, escenarios ni recursos. El resultado debe tener identidad propia.

Capacidades verificadas en G-00/G-01: Blender 5.2.1 LTS ejecuta Python en segundo
plano desde una ruta con espacios; guarda `.blend`, exporta GLB y renderiza PNG.
Chrome 153 carga ese GLB mediante Three.js 0.185.0 y Playwright; la GPU disponible
produce capturas repetibles en este host. Sigue deshabilitado el control de
aplicaciones nativas, que el flujo ya no necesita. La recuperación de la evidencia
desde un segundo dispositivo y el rendimiento en móvil siguen pendientes.

### D.2 Decisiones, alcance y puertas

**Decidido:** maqueta medieval estilizada, cámara ortográfica inclinada con
orientación fija, desplazamiento y zoom; habitantes 3D; arte original generado
mediante scripts editables; Blender como herramienta de autoría preferida;
Three.js como renderer propuesto; motor y guardados conservados.

**A validar:** proporciones, inclinación, materiales, calidad de sombra, rig,
cadencia visual, rendimiento, tamaño descargable y dispositivo objetivo.
No se fijan polígonos, huesos, FPS garantizados ni megabytes sin medir.

Fuera de esta fase: interiores explorables, cámara libre, relieve que cambie
rutas, físicas de personajes, combate nuevo, simulación de colisiones sociales,
editores dentro del juego y generación de modelos durante la partida. El
relieve inicial es visual y no puede representar una barrera transitable falsa.

Puertas, en orden:

| Puerta | Evidencia necesaria | Consecuencia de no pasar |
|---|---|---|
| P0 · Fabricación remota | Crear → exportar → cargar → capturar sin interacción de escritorio | Reparar herramientas; no producir catálogo |
| P1 · Dirección artística | Un rincón de aldea y un habitante legibles en el navegador, general y cerca | Iterar forma/paleta/escala; no multiplicar modelos |
| P2 · Vida | Caminar, trabajar y cargar; pausa y velocidades resueltas | Corregir rig, rutas y reloj antes de nuevas acciones |
| P3 · Escala | Escena representativa, dispositivo identificado y métricas repetibles | Reducir coste y revisar presupuesto, sin degradar silenciosamente criterios |
| P4 · Paridad | Efectos, interacción, guardado, letargo y PWA verificados | Mantener Canvas como producción |
| P5 · Sustitución | Revisión visual aceptada y regresiones cerradas | Activación explícita, reversible y documentada |

El orquestador puede iterar autónomamente dentro de una dirección aprobada.
Para P1 y P5 pide una decisión remota sobre un resultado concreto. Mientras no
llegue, puede completar validaciones independientes, pero no registrar aprobación
por silencio. No se requiere al usuario delante del ordenador.

#### D.2.1 · P1, decidida (v3.15)

**Puerta P1 cerrada.** El usuario vio las cuatro imágenes de G-03 —las dos
direcciones, de lejos y de cerca— y decidió. Esto es la decisión remota que D.2
exige y que no puede darse por silencio.

**Las dos direcciones dejan de competir.** No se elige A ni B: pasan a ser **dos
materiales de casa** dentro de un mismo estilo. Una aldea con casas de teja y
casas de paja es más creíble que una uniforme, y de paso aprovecha las dos
producciones de G-03 en vez de tirar una.

| Qué | Decisión |
|---|---|
| **Varía por casa** | Tejado (teja `#7A382B` o paja `#C7984A`), yeso, entramado |
| **Común a todo el valle** | Árboles suavizados de 16 caras, prado `#94AE68`, luz clara |
| **Variedad, por ahora** | Material y color únicamente |
| **Variedad, más adelante** | Cuatro o cinco formas de casa distintas |
| **Ropa** | Integrada en los tonos tierra del pueblo |

**Lo que la vista de cerca destapó, y por eso hacía falta.** De lejos parecía que
A y B sólo se diferenciaban en el tejado. De cerca se vio que difieren también
en cosas que **no son de la casa**: las copas de los árboles son de 7 caras sin
suavizar en A y de 16 suavizadas en B, y los verdes del prado no son los mismos.
Eso no puede convivir — no hay árboles facetados junto a árboles redondeados
según qué casa tengan al lado. De ahí la separación entre lo que varía y lo
común.

**Una tensión declarada, no resuelta con la paleta.** El usuario pidió también
que la escena se lea de lejos, y de cerca se ve que el aldeano de A **se camufla
con su propia casa** porque viste el tono de la madera. Con la ropa integrada,
el color no va a separar a la gente del fondo.

**Se resuelve por silueta, no por color, y es criterio de entrada de G-04:** un
aldeano tiene que reconocerse por su forma y su tamaño a la escala de juego, con
la paleta en contra. Si G-04 no lo consigue, la decisión de ropa vuelve a estar
sobre la mesa — pero se decide con una imagen, no antes.

**Qué falsaría esta decisión:** que a 390 px de ancho, con la aldea entera en
pantalla, no se distinga a una persona del suelo que pisa.

### D.3 Dirección artística y criterios de lectura

Intención: un valle que apetezca observar y cuya historia se pueda leer al
acercarse. Formas compactas, volúmenes claros, superficies mates y detalle
concentrado en puertas, herramientas, tejados y gestos. La iluminación ayuda
a leer el volumen sin ocultar escasez, ruina o enfermedad.

**Composición.** En vista general deben distinguirse núcleo, campos, bosque,
río y huellas de abandono. En vista cercana, manos/herramientas y dirección de
marcha. Reservar aire para las fichas y controles en vertical; ajustar encuadre
al área útil real, no restar una altura fija como nuevo contrato. Ofrecer
restablecer vista; la selección no debe perderse al abrir una ficha.

**Habitantes.** Cabeza y manos ligeramente enfatizadas, postura reconocible,
ropa medieval simplificada. Comparar articulación de piezas rígidas y malla
deformable simple sobre el mismo personaje antes de cerrar el rig. Evitar
adoptar muñecos de cápsulas como arte final por comodidad. Personalidad mediante
silueta, accesorios, postura y color; las variaciones son estables por id.
Una variante no puede sugerir un oficio que la persona no tiene. Edad derivada
del estado, sin guardar edades o apariencias nuevas en la partida.

**Arquitectura.** Muros anchos y tejados con silueta clara; casa, granero y
fragua deben distinguirse sin texto. Madera y piedra son familias coherentes,
no un simple cambio de color. Mejoras y ruinas conservan identidad y huella.
No reducir edificios del estado a una colección de casas genéricas.

**Terreno.** Grandes masas de color antes que detalle. Senderos continuos,
orillas legibles y árboles agrupados con variación limitada y determinista.
La decoración no oculta destinos, no inventa puentes ni cambia transitabilidad.
No se mueve el edificio real para mejorar una composición de captura.

**Color y material.** Paleta maestra con roles semánticos: tierra, hierba,
follaje, agua, madera, piedra, cubierta, piel, tejido, luz y acento de selección.
Probar temperaturas cálida/neutra y saturación contenida manteniendo la misma
cámara y geometría. Materiales exportables sencillos; los nodos de Blender
que no viajan a glTF necesitan horneado o sustitución verificada. Las sombras
no se pintan en texturas si después contradicen la luz dinámica.

**Estaciones y crisis.** Silueta/ocupación y signos además del color. Nieve
dosificada, bosque talado con claros y restos, campos cosechados realmente
distintos. El granero expresa cantidad usando el estado; hambre, fe, peste y
fragua apagada conservan el significado de §11.1. Evitar embellecer una crisis
hasta que deje de reconocerse. No añadir iconografía que prometa mecánicas.

Ficha obligatoria de aceptación visual: silueta a tamaño de juego, escala junto
a humano/puerta/celda, orientación, cuatro estaciones, color y grises,
intersecciones y lectura de estado. Clasificar cada defecto como bloqueo,
mejora o preferencia. P1 se falsea si solo resulta atractivo en el render de
Blender, si los trabajos no se distinguen al acercarse o si los edificios tapan
el pueblo a la distancia de uso.

### D.4 Fabricación reproducible de modelos y animaciones

Flujo preferido: **receta y parámetros → Blender en segundo plano → `.blend`
de inspección → `.glb` de ejecución → visor Three.js → capturas y clips → revisión**.
La interfaz gráfica es opcional para diagnóstico futuro, nunca requisito de
la construcción. No se sustituye revisión visual por inspección del script.

Estructura prevista, creada por los módulos correspondientes:

```text
art/recipes/                 # parámetros y paleta; fuente de autoría
art/source/                  # fuentes manuales solo si se declaran canónicas
art/catalog.json             # identidad, procedencia, variantes y estado de cada recurso
tools/art/                   # scripts Python/Blender y runner TypeScript
tools/graphics/              # visor, captura, validación y medición
src/render3d/                # escena, cámara, adaptación, animación, selección
public/assets/valley3d/       # GLB y manifiesto aprobados para distribución
artifacts/graphics/<ronda>/   # resultados generados; no se asumen publicados
docs/graphics-rounds/        # briefs ejecutados, evidencias resumidas y decisiones
```

No mantener dos fuentes editables para un mismo recurso. Por defecto la receta
es canónica y el `.blend` es generado. Si hace falta edición manual, promover
explícitamente ese `.blend` a fuente con procedencia; no sobrescribirlo mediante
el generador. Scripts compartidos separan construir geometría, asignar material,
crear rig, animar, exportar y preparar capturas. No un script monolítico por pueblo.

Cada recurso declara id, versión, receta/fuente, versión de Blender/exportador,
materiales, clips, dimensiones, origen, conectores, estadísticas y procedencia.
Identidad del recurso estable; contenido distribuido con hash. Los ficheros
generados no se editan a mano. Exportación a temporal, validación y promoción
atómica: un proceso interrumpido no reemplaza el último recurso válido.
G-02 verificó que dos exportaciones equivalentes pueden diferir en bytes: se
comparan estructura, materiales, animación, caja y captura, y el catálogo conserva
además el hash del binario concreto promovido. Blender solo cuenta como éxito si
deja marca explícita y productos completos, aunque su proceso devuelva código 0.

Convención espacial: una celda del motor es una unidad de escena. Mapa `(x,y)`
se proyecta a escena `(x,0,y)`, eje vertical `+Y` en ejecución. Origen de edificio
en su esquina lógica, geometría local sobre la huella `w × h`; aldeano con origen
en el suelo entre los pies y frente local `+Z`. Blender usa su convención nativa
y la exportación hace la conversión; probar con un recurso asimétrico marcado
con ejes para evitar una doble rotación. Nombres de conectores: `door`,
`work_anchor`, `hand_r`, `hand_l`; manifiesto especifica cuáles exige cada tipo.
Las unidades son contrato de coordenadas, no una estimación artística de metros.

Para el primer personaje, comparar piezas rígidas frente a piel sencilla en
un banco común. El rig ganador comparte jerarquía y nombres entre variantes.
Ropa y herramientas no requieren un rig por aldeano. Exportar acciones como
clips con nombres estables; hornear restricciones cuando corresponda y verificar
el GLB, no asumir que un control de Blender existe en el navegador.

Clips iniciales: `idle`, `walk`, `work_hoe`, `carry_walk`. Locomoción **in-place**:
el controlador mueve el nodo raíz; el clip mueve el cuerpo. Asociar longitud
de zancada para sincronizar velocidad y evitar deslizar los pies. Las acciones
posteriores (`work_hammer`, `work_chop`, etc.) necesitan un brief y destino
válido antes de producirse. La carga es un accesorio, no un segundo cuerpo.

Validación de entrega: archivo cargable, escala/ejes, normales, geometría finita,
materiales soportados, texturas resueltas localmente, conectores presentes,
clips exigidos no vacíos, rig consistente y bucles sin salto visible. Un render
de referencia frontal/lateral ayuda a detectar fallos; el juicio final ocurre
con la cámara del juego. Reconstrucción reproducible significa equivalencia
de geometría/material/animación; no exigir bytes idénticos de `.blend` si sus
metadatos cambian. Registrar hashes de los artefactos concretos entregados.

#### D.4.1 · Piel y marcha del aldeano, decididas (v3.16, repasado en v3.17)

**El aldeano se ata rígido.** Cada pieza pesa 1 sobre un solo hueso. D.4 pedía
comparar piezas rígidas frente a piel sencilla en un banco común antes de fijar
una; el banco fue `tools/graphics/skin-bench.ts` —retirado en V-12 con el resto
del piloto, la decisión ya tomada— y construía las dos con la misma
receta.

El coste salió idéntico —916 triángulos, 222 916 bytes y 2,8 s en las dos—, así
que la elección fue entera de aspecto. Las piezas son un cajón y unos cilindros,
sin cortes de malla en codos ni rodillas, de modo que los pesos por proximidad
no tienen geometría con la que doblarse: en vez de un codo producen un torso
cizallado. Se pagaba deformación sin comprar ningún doblez. La rígida es además
la que corresponde a la talla de madera que fijó D.2.1.

Si alguna vez hace falta un codo de verdad, la conversación no es de pesos sino
de meter cortes de malla en la receta primero. El banco queda para repetir la
comparación cuando eso pase.

**El atado va por grupo de vértices, no emparentando la pieza al hueso.** Blender
emparenta a la **cola** del hueso, así que la pieza pivota por el extremo
equivocado; la primera versión dejaba la cabeza flotando separada del torso con
la validación entera en verde. Se vio mirando una hoja de contactos del ciclo de
andar. Es el mismo patrón que ya costó caro en el motor y ratifica §14.3.

**Locomoción in-place, verificada en el navegador.** `animation-audit.ts` mide
sobre el GLB cargado, no sobre la acción de Blender, porque entre las dos hay un
exportador, un muestreo y un cargador —y ya se perdieron tres clips por ahí una
vez. La deriva de la raíz de los cuatro clips es 0,0000 m.

**La zancada llega al catálogo.** El catálogo gana un campo `motion`, separado
del índice `clips`: el índice son los nombres y `motion` son los hechos de
reproducción —duración, bucle y zancada—. El controlador reproducirá a
`velocidad / zancada` ciclos por segundo; con cualquier otro ritmo los pies
patinan. El campo es añadido y nunca exigido: los cinco recursos anteriores lo
dejan vacío y siguen siendo válidos sin tocarlos, y la validación rechaza un
`motion` que hable de un clip que el índice no lista.

**Una bisagra dobla sólo hacia su lado, y hay que comprobarlo.** Una rodilla
lleva el talón atrás y un codo lleva la mano adelante: en huesos que apuntan
hacia abajo, eso es signo positivo para una y negativo para el otro. El signo
estuvo cambiado dos veces, en las espinillas primero y en los antebrazos
después, y las dos veces todo lo demás pasó en verde. El ángulo de una
articulación no distingue una rodilla de una rodilla del revés, así que la
auditoría mide además el sentido, y la receta declara hacia dónde dobla cada
bisagra.

**Un clip tiene que bastarse solo.** Un hueso sin clave conserva la pose que
dejó el clip anterior, así que un clip que no toca la columna hereda la del que
venía: al pasar de azadonar a andar, el aldeano andaba encorvado. No es un
defecto del reproductor, porque el juego encadenará clips en un orden que nadie
decide de antemano. Los cuatro mueven el mismo juego de huesos y el torso al
andar queda a 0,0 grados de la vertical venga de donde venga.

**La zancada se mide, no se elige.** Es la que dan las piernas, y la medida
correcta es la única que no se puede falsear: en cada instante el pie que está
más abajo es el que pisa, y lo que ese pie retrocede es lo que el cuerpo avanza.
Las dos medidas anteriores —separación máxima entre tobillos, y recorrido de un
pie por debajo de un umbral de altura— daban números plausibles y falsos, y
ninguna se desmentía a ojo.

**La equivalencia con lo aprobado presupone la misma receta.** El catálogo
guarda el hash de la receta con la que se hizo lo aprobado y sólo compara cuando
no ha cambiado. Sin esa condición, ningún cambio deliberado de geometría podía
promoverse: al añadir las cuentas de codo y rodilla, la promoción se negó a
seguir porque el artefacto anterior no tenía esas piezas.

**Deuda anotada.** El aldeano no tiene frente: por delante y por detrás es casi
la misma silueta, y en el valle giran hacia donde caminan. Es asunto de
geometría y de P1, no del rig. Informe completo en
`docs/graphics-rounds/G-04.md`.

### D.5 Fronteras de software y contrato propuesto

Flujo de datos: `GameState` → adaptación de solo lectura → escena derivada →
presentación y GPU. La selección devuelve identidad al DOM; las decisiones
siguen entrando por la API de juego existente. Ningún objeto Three.js, rig,
reloj cosmético o cámara entra en el guardado. Los recursos no importan motor.

El render vive en `src/render3d/` y **sustituyó a `src/render/` en G-12**, que
queda como puerta de vuelta en `?render=canvas` hasta que alguien abra el juego
en un teléfono. Datos artificiales de estrés se etiquetan y no cuentan como
evidencia de balance.

**Lo que los dos renders comparten vive en `src/derive/`** (v3.66), y esta
frontera es tan normativa como las otras dos. Al migrar quedó que
`src/render3d/` importaba ocho módulos de `src/render/` —paleta, animales,
ánimos, señales, encuentros, reuniones— para saber *qué hay que contar*: el
render que se juega dependía del que ya no se juega. `src/derive/` son funciones
puras de `GameState` que no dibujan; `render/` y `render3d/` ponen la tinta.
Ninguno de los dos es dueño de la lectura del estado.

Contrato a materializar por G-01 en `src/render3d/contracts.ts`, importando
`GameState` desde el motor; todavía no es una API existente:

```ts
export type GraphicsTarget =
  | { kind: 'building'; id: number }
  | { kind: 'villager'; id: number }
  | { kind: 'terrain'; x: number; y: number };

export interface GraphicsFrame {
  readonly tickFraction: number;
  readonly presentationSeconds: number;
  readonly deltaSeconds: number;
  readonly speed: 0 | 1 | 4 | 16 | 64;
  readonly reducedMotion: boolean;
  readonly discontinuity: boolean;
}

export interface GraphicsViewport {
  readonly widthCss: number;
  readonly heightCss: number;
  readonly pixelRatio: number;
}

export interface GraphicsRenderer {
  resize(viewport: GraphicsViewport): void;
  paint(state: Readonly<GameState>, frame: GraphicsFrame): void;
  pick(localXCss: number, localYCss: number): GraphicsTarget | null;
  track(id: number | null): void;
  dispose(): void;
}

export interface GraphicsRendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly assetBaseUrl: string;
  readonly quality: 'low' | 'standard';
}

export function createGraphicsRenderer(
  options: GraphicsRendererOptions,
): Promise<GraphicsRenderer>;
```

`pick` consulta la última escena pintada, con coordenadas CSS locales al canvas;
no recalcula otra multitud. Tipos estructuralmente compatibles con `InspectTarget`;
el renderer no importa UI. `Readonly` superficial no basta como garantía:
prohibición de mutación respaldada por pruebas sobre estado serializado y RNG.
El adaptador debe copiar vectores y listas que vaya a modificar.

El reloj entra desde un propietario único de presentación, fuera del motor.
La implementación decide estructura interna de cachés; no agrega campos
inventados de profesión, destino o animación al `GameState`. G-01 valida tipos
y límites; G-06 materializa el contrato. No publicar métodos vacíos para cumplir
una interfaz. Hasta entonces los contratos son tipos, no un renderer ficticio.

La carga asíncrona muestra estado de carga y error recuperable. El controlador
de aplicación evita duplicar arranques y destruye una carga que terminó tras
cerrar su vista. `dispose` libera listeners, mezcladores y recursos propios;
geometrías/texturas compartidas tienen propietario explícito. No se destruyen
recursos aún usados por otro habitante. Iniciar/detener renderer no inicia ni
detiene ticks adicionales.

### D.6 Tiempo, rutas y comportamiento visual

La simulación conserva §4 íntegra. El piloto introduce un reloj de presentación
acumulado con tiempo real visible y controlado por pruebas. No usa hora de pared
para determinar la apariencia en capturas. Pausa congela desplazamiento y clips;
la cámara y fichas siguen respondiendo. Ocultar pestaña suspende presentación.
Al volver o terminar letargo se reconstruye desde el estado final sin representar
todo el intervalo omitido. `discontinuity` cancela trayectos/transiciones obsoletos.

**Decisión para el piloto:** el día escénico se desacopla de la semana, también
a ×1. Su duración se calibra en G-05 y no escala automáticamente con ×4/×16.
Así la marcha resulta legible en todas las velocidades; los cambios reales de
estado siguen reflejándose al tick. Esto reemplaza el día por tick únicamente
en el piloto. Las capturas especifican tick y tiempo de presentación por separado.

Cada actor presente posee estado efímero de representación: en casa, saliendo,
caminando, trabajando, regresando. La máquina no produce recursos. La actividad
usa destinos derivados y validados; si faltan, se representa reposo o salida
a un destino permitido, nunca se inventa un taller. El domingo/reuniones
conserva su condición semántica cuando proceda, pero no obliga a reproducir
trayectos completos por cada semana acelerada.

Moverse por tramos transitables, girar según tangente y resolver las esquinas
sin recortar por agua o edificios. Las rutas actuales pueden usar centros
interiores de edificios: adaptar visualmente entrada/salida mediante `door`
y ocultación dentro de la huella, sin cambiar el algoritmo económico de tráfico.
Este caso se prueba antes de sustituir `crowd.ts`.

Cambio de casa/destino: invalidar la ruta visual pertinente; replanificar desde
posición válida. Muerte o marcha: retirar actor y selección sin seguir una ruta
antigua. Demolición/tala: invalidar anclas afectadas. Nueva partida/guardado:
vaciar cachés ligadas a la anterior. Las transiciones no pueden hacer aparecer
muertos trabajando ni terminar una cosecha visual como si produjera grano.

El máximo visible inicial conserva el límite actual; priorizar seleccionado y
nombrados, completar con orden estable. No clonar habitantes para llenar escenas.
Representación reducida puede disminuir animación, detalle y efectos, pero
conserva señales relevantes. G-05 define y verifica `prefers-reduced-motion`:
sin balanceos ambientales ni destellos; selección y estados siguen legibles.

### D.7 Cámara, interacción y continuidad de producto

Cámara inclinada fija: calibrar ángulo contra río, densidad de casas y lectura
de personajes; no asumir que 45 grados es automáticamente óptimo. Zoom modifica
el volumen ortográfico y mantiene el punto bajo el gesto. Arrastre limitado al
valle, encuadre inicial legible y restauración de vista. Probar retrato, paisaje,
distintas densidades de píxel, fichas abiertas y cambio de tamaño.

Selección en espacio de pantalla: prioridad para actor visible cercano al toque,
después edificio y terreno; resolver ambigüedades de forma estable. El tamaño
táctil sigue §11.6; no exigir acertar en una mano de pocos píxeles. Probar techos
y árboles delante del objetivo. Primera solución: encuadre y resalte de selección;
si hace falta ocultación selectiva, incorporarla con brief, sin transparentar todo
el pueblo indiscriminadamente. Los objetos decorativos no interceptan la ficha.

Conservar fichas DOM, accesibilidad y crónica. Acciones de cámara no son decisiones
del juego. La carga 3D no consume tiempo de simulación ocultamente; guardar/cerrar
en carga o tras error conserva los contratos de §13. Cuando el dispositivo no
pueda iniciar WebGL o pierda el contexto, ofrecer recuperación o Canvas sin
recargar ni borrar la partida. Canvas y WebGL requieren canvases distintos al
cambiar de tipo de contexto: no intentar convertir el mismo contexto ya creado.

### D.8 Catálogo y orden de producción artística

Primero un conjunto mínimo coherente: casa, campo, camino, árbol, habitante y
azada/carga. Modelo junto a otros para evaluar escala. Después granero y fragua
para probar cantidad y luz; por último el resto del catálogo. Nunca producir
variantes de todo antes de que P1 y P2 estén resueltas.

Matriz de cobertura G-10, derivada del `BuildingKind` real al iniciar la ronda:

| Familia | Recursos y variaciones obligatorias |
|---|---|
| Vivienda | `house`, `stone_house`: construcción, ocupación/luz, mejora y ruina aplicables |
| Sustento | `field`, `granary`, `mill`: estación, cosecha, grano y funcionamiento según estado disponible |
| Comunidad | `well`, `chapel`, `church`, `grave_yard`: identidad y señales de reunión, fe y muerte existentes |
| Trabajo | `smithy`: actividad y apagado identificables, herramienta vinculada a actividad |
| Defensa | `palisade`, `wall`, `watchtower`: piezas que respetan huellas y no cierran pasos inexistentes |
| Mundo | Todos los terrenos, tres estados actuales de camino, bosque talado/rebrote y ruinas heredadas |
| Habitantes | Variación estable, nombrados distinguibles, edad/rol cuando el estado permita afirmarlos |
| Fauna existente | Animales y fauna ambiental del render vigente: inventariar especies, anclas y comportamiento al abrir G-10, conservando su naturaleza cosmética |

Cada fila se cruza con obras, desaparición y efectos de §8/§11 que le afecten.
Si el estado no contiene un detalle, el arte no lo presenta como dato exacto.
Por ejemplo, no inventar una reserva individual transportada porque el juego
solo tenga una cantidad global. Cada lote declara qué cubre y qué falta.

#### D.6.1 · El día escénico, calibrado (v3.19)

**Un día escénico dura sesenta segundos reales, a cualquier velocidad.** D.6
dejó la duración para calibrar en G-05 y éste es el número, que no es una
preferencia sino lo que cuesta el ciclo de andar.

El ciclo de andar del aldeano cubre **0,713 celdas por segundo**: es su zancada
medida sobre el GLB dividida por su duración medida, las dos de G-04. Los viajes
de este valle van de 3 a 13 celdas, con mediana 6, y la jornada de §11.9 dedica
el 15 % de sí misma a viajar. Seis celdas a ese paso son 8,4 segundos, así que
el día tiene que durar cerca de un minuto para que la gente llegue andando.

**Lo que se descartó y por qué.** Atar el día a la semana —quince segundos, que
es lo que dura un tick a ×1— hacía que cada aldeano cruzara el valle en dos
segundos y cuarto: 2,7 celdas por segundo, casi cinco ciclos de piernas por
segundo. Una aldea de esprínters, todo el día, para siempre.

**El precio, dicho claro:** a ×1 pasan unas cuatro semanas por día escénico, así
que el día ya no se corresponde con la semana. D.6 lo autoriza expresamente y
dice que una semana acelerada no le debe al jugador un trayecto completo. No
había tercera opción sin cambiar **cuánto mide un aldeano contra una celda del
mapa**, que es una pregunta sobre el recurso y no sobre el reloj.

**Esa pregunta quedó abierta y se cerró enseguida:** D.6.2 fija el aldeano en
0,65 celdas, la zancada baja a 0,32 y el día escénico se recalibra a **ciento
veinte segundos**. Seis celdas a 0,238 celdas por segundo son 25 segundos de
marcha, que querrían un día de 168; ciento veinte es el punto medio, con la
jornada mediana andando a 1,4 veces la cadencia del clip —paso vivo, no
paseo— y un día que un jugador todavía llega a ver entero.

Medido tras calibrar: el más rápido del valle en su instante más rápido va a
1,00 celdas por segundo. La mediana anda a su paso.

#### D.6.2 · Cuánto mide un aldeano, decidido (v3.20)

**Una celda del mapa son tres metros, y un aldeano mide 0,65 celdas.** El
usuario lo decidió mirando el piloto: quiere que al entrar se vea la aldea
entera y la gente se vea muy pequeña, y que haya que acercarse para verla con
detalle. Panorámica primero, zoom para el detalle.

El número no es una preferencia, sale de lo que ya hay construido. Una casa
ocupa **dos por dos celdas** y una casa de aldea mide unos seis metros de lado,
así que una celda son tres metros. Una persona de 1,95 son 0,65 celdas. A 390 px
de ancho la celda mide 10 px, de modo que un aldeano ocupa unos **seis
píxeles**: la personita que se pidió.

Antes de esto el aldeano medía **dos celdas**, o sea tanto como el ancho de la
casa en la que vivía, y el valle entero medía dieciocho aldeanos de ancho.

**Cómo se aplica.** La receta se sigue escribiendo en metros, porque un aldeano
de 1,95 se dibuja mejor que uno de 0,65, y declara un `scale` que el generador
aplica a las raíces al final, antes de exportar. Arrastra a todo: piezas,
esqueleto y las traslaciones de hueso de los clips. La zancada medida baja en la
misma proporción, de 0,95 a 0,32 celdas, sin tocar ninguna clave.

**Lo que arrastró.** El día escénico de D.6.1 se recalibra de sesenta a **ciento
veinte segundos**: el ciclo de andar pasa a dar 0,238 celdas por segundo y la
jornada mediana de seis celdas cuesta 25 segundos de marcha. Y los umbrales de
la auditoría de animación, que estaban en unidades absolutas, pasan a ser
proporción del alto del recurso: al escalar, empezaron a denunciar clips que no
habían cambiado, porque lo que medían era el tamaño de la figura y no su
animación. **Un umbral absoluto en una cadena que escala recursos es un umbral
que caduca.**

#### D.6.3 · El encuadre de partida, decidido (v3.21)

**Lo que se encuadra al entrar es la aldea con su entorno, no el mapa entero.**
Casi todo el valle es prado vacío. Encuadrar las treinta y seis por cincuenta y
seis celdas dejaba el pueblo del tamaño de una moneda en el centro de una
pantalla vertical, ocupando menos de la sexta parte del alto.

El encuadre toma la caja de lo construido, la ensancha nueve celdas por cada
lado y la recorta al mapa. Se rehace cuando el pueblo cambia de forma, que son
unas pocas veces al año, y no en cada fotograma. Así el pueblo llena la pantalla
y un aldeano de 0,65 celdas cae en unos pocos píxeles: la ciudad entera con la
gente muy pequeña, que es lo que D.6.2 pidió. Acercarse es trabajo de gestos y
es de G-07.

Y se ajusta **proyectando las esquinas de esa caja** al espacio de la cámara, no
por el radio de la escena. Una zona rectangular vista en isométrica no es un
círculo sino un rombo mucho más ancho que alto, y ajustar por radio deja
márgenes que no hacen falta.

#### D.6.4 · La jornada pertenece al día, no a la semana (v3.22)

Tres fallos vistos jugando la demo, dos de ellos con la misma causa.

**El plan de la jornada se sortea con el día escénico, no con el tick.** Un tick
es una semana y dura quince segundos reales; un día escénico dura ciento veinte.
Sorteando con el tick, el plan de cada aldeano —a qué hora sale, a qué paso
anda, cuándo vuelve— se rehacía **ocho veces por día escénico a ×1 y ciento
veintiocho a ×16**, y cada rehecho lo teletransportaba a donde le tocara estar
con el plan nuevo. Lo que se veía era gente parpadeando por el valle.

**El destino se congela al amanecer.** El motor reasigna quién trabaja qué campo
cada semana: medido, el 6,7 % de las persona-semanas cambia de destino, con
saltos de nueve celdas de mediana. Alguien no cambia de opinión sobre qué campo
está arando a media mañana, así que la decisión se toma al amanecer y dura el
día. Lo que el motor reasigne durante la semana entra al día siguiente. **El
tráfico y la economía no se tocan**: sigue decidiendo el motor, y esto sólo
elige cuándo se entera.

Esto es el «estado efímero de representación» que D.6 ya concedía a cada actor.
No entra en el guardado, no produce recursos y se rehace solo al amanecer, en
una partida nueva y en cualquier fotograma marcado como discontinuo. Quien no
tenía destino al amanecer reposa en su casa y sale mañana: darle uno a media
jornada lo hacía aparecer de golpe en el tajo, que es el mismo teletransporte
por otra puerta.

**Y el puesto de trabajo se reparte por la parcela.** Todos los que iban al mismo
campo terminaban su ruta en la misma celda y trabajaban amontonados en un punto
mientras el resto del campo quedaba vacío. Un campo mide tres por dos celdas, y
lo que se reparte ahora es esa huella. El puesto **forma parte de la ruta**, no
es un desvío añadido al llegar: contarlo aparte hacía que el suelo recorrido no
cuadrara con el camino hasta en un veinte por ciento en un viaje corto, que es
exactamente el patinaje que la zancada existe para evitar.

#### D.6.5 · La faena y la velocidad, corregidas (v3.23)

**Se cava quieto y se dan unos pasos al surco siguiente.** La versión anterior
reproducía el golpe de azada en el sitio mientras el cuerpo se desplazaba
alrededor del puesto, y eso se lee como deslizarse por poco que sea el
desplazamiento. La regla, dicha entera: **un clip en el sitio exige un cuerpo en
el sitio, y un cuerpo que se mueve exige el clip de andar**, sea cual sea la
actividad. Los surcos empiezan y acaban en el puesto, de modo que llegar y
marcharse son continuos.

**El día escénico sigue la velocidad entera** (v3.68, 15 sep 2026). Lo decidió
el dueño del diseño con las tres opciones delante y esta queja por medio: «hay
muchas cosas del reloj que están mal… los personajes no van al ritmo que
deberían ir».

Lo que arregla es la única incoherencia del reloj que el jugador puede ver sin
contar nada: **cuántas semanas caben en una jornada ya no depende del botón.**
Con la raíz cuadrada que esto decía antes, pasaban ocho semanas por jornada a
×1 y treinta y dos a ×16, así que el calendario y el sol contaban dos historias
distintas y la segunda cambiaba cada vez que se tocaba la velocidad.

> **Y en v3.72 dejan de ser ocho semanas por jornada: son siete jornadas por
> semana.** Con la velocidad entera ya resuelta, lo que quedaba por cuadrar era
> la proporción, y no se arregla tocando la jornada —a menos de 60 s la luz
> parpadea y la gente esprinta, medido aquí— sino **alargando la semana**:
> `REAL_MS_PER_TICK` pasa de 15 s a 840 s, que son exactamente siete jornadas
> (§12.1). Desde ahí una jornada de sol **es un día**, y la cabecera puede decir
> la hora (§11.2). La jornada no se ha tocado: sigue durando 120 s escénicos y
> `scenicRate` sigue siendo la velocidad entera.

Las dos puntas que ya se habían probado, para que no se vuelvan a probar: **sin
atar** (la jornada fija), apretar ×16 no cambiaba nada visible salvo el marcador
y el botón parecía roto; **con la raíz**, el término medio que esta revisión
retira, se veía correr el tiempo pero la jornada seguía sin cuadrar con el
calendario.

**El coste, con su arreglo.** A ×64 la jornada dura 1,9 s reales: el sol saldría
y se pondría dos veces cada cuatro segundos y las sombras darían la vuelta al
valle en ese tiempo. No es una noche, es un parpadeo, y tapa justo lo que uno
mira a ×64 —que el valle crece, que llega el invierno—. Así que a ×16 y ×64 la
jornada de **luz** se aplana hacia la de media mañana (`LIGHT_STEADY`, 0,55 y
0,95): a ×64 la luz deja de contar la hora, porque a ×64 la hora del día no es
información que nadie pueda seguir (§10.3). A ×1 y ×4 la cuenta entera. Las
ventanas encendidas van con la misma regla, o serían un render que no sabe qué
hora es.

#### D.6.6 · El suelo no es una cuadricula (v3.58)

El valle estaba dibujado con un cuadrado de color plano por celda. Mientras todo
era plano se pasaba; con arboles, casas y gente en tres dimensiones encima, lo
que se lee es papel milimetrado verde, y el dueno del diseno lo dijo asi: «queda
fatal esa base verde con formas cuadradas… el suelo debe tener diferentes
colores y formas, en funcion del terreno, pero no puede ser cuadrado».

Tres reglas, y ninguna cambia el mapa: el terreno que dice el motor es el mismo,
lo que cambia es como se pinta.

1. **Las esquinas de la cuadricula se mueven de su sitio** hasta 0,22 celdas, y
   la linde entre dos terrenos deja de ser una escalera de peldanos iguales. El
   desplazamiento sale de las coordenadas de la esquina y no de la celda, que es
   la condicion de que las cuatro celdas que la tocan la muevan igual y la malla
   no se abra. El borde del mapa no se mueve: el valle sigue siendo un
   rectangulo porque ahi se acaba el mundo.
2. **Cada esquina lleva algo del color de las celdas que la tocan** —la suya
   pesa 0,46 y las otras tres 0,18 cada una—, asi que dos terrenos vecinos se
   encuentran en un degradado de una celda en vez de en un escalon. Promediar
   del todo disolveria un campo de tres por dos en el prado; por eso la propia
   celda pesa mas que sus vecinas juntas.
3. **La variacion de tono va por esquina y en dos escalas**: una fina, de
   esquina a esquina, y otra lenta cada seis celdas. La fina sola se promedia a
   la distancia a la que se juega y el prado vuelve a ser una sabana de un solo
   verde; la lenta es la que hace que un prado tenga zonas.

La lamina de agua usa las mismas esquinas movidas, o el rio asomaria por fuera
de su cauce. `elevationAt` sigue devolviendo la cota de la cuadricula sin mover:
el desplazamiento es horizontal y lo que separa la superficie dibujada de la
calculada no llega a diez centimetros, que es menos que el grosor de una bota.


#### D.6.7 · El estado de la jornada (v3.59)

Un tick es una semana y una jornada escenica dura ciento veinte segundos de
tiempo escenico. Como la jornada y el mundo corren los dos a la velocidad
entera desde v3.68 (D.6.1), **dentro de un solo amanecer-anochecer la aldea vive
ocho semanas, y ocho a cualquier velocidad** — que es exactamente lo que esa
revision vino a arreglar:

| | x1 | x4 | x16 | x64 |
|---|---|---|---|---|
| Semanas por jornada visible | 8 | 8 | 8 | 8 |
| Segundos reales por jornada | 120 | 30 | 7,5 | 1,9 |

La tabla de antes de v3.68 —8, 16, 32 y 64 semanas por jornada— es la
incoherencia que se retiro: el sol cambiaba de ritmo respecto al calendario cada
vez que se tocaba la velocidad.

Todo lo que el render deriva del tick cambia, por tanto, **a media vista**: la
querencia de una vaca, el puesto de una gallina en la fila de la cabana, la ruta
de un aldeano, la casa que estrena corral. En un valle que se mira eso no se lee
como «ha pasado una semana»: se lee como un teletransporte, y costo tres rondas
en tres sistemas distintos.

Hasta v3.58 cada sistema se defendia solo —`fauna` guardaba su semana, su cabana
y su pueblo; los actores guardaban sus rutas; la reunion se preguntaba desde el
amanecer anterior—, y eso tenia un coste que no se ve en pantalla: **un sistema
nuevo nacia con el fallo dentro y nada se quejaba.** No hay error de tipos ni
prueba que salte; solo un salto que hay que ver para saber que esta.

**La regla, ahora:** `paint` pide el estado de la jornada y reparte ese. Lo que
llega a los sistemas viene quieto, y el sistema que se escriba manana lo hereda
sin enterarse. El defecto se invierte: antes habia que acordarse de congelar,
ahora hay que pedir lo vivo, que es lo raro y se ve al leerlo.

**El relevo es al anochecer, no al amanecer.** Es el unico numero de la decision
y se toma de `NIGHT`, la misma linea en la que los animales se recogen, en vez
de escribirlo otra vez. Al amanecer el ganado esta en pantalla cuando le cambia
la querencia —hasta dos celdas— y el salto se ve: uno por jornada en vez de
ciento veintiocho, pero se ve. Al anochecer no se ve ninguno, porque el ganado,
los cuervos y los peces dejan de dibujarse en esa misma linea (§10.6), la gente
esta dentro y el lobo empieza ya en su sitio nuevo. **Quien no esta no salta.** Y
como entre el anochecer y el amanecer siguiente no se releva nada, las rutas que
los actores tomaban «al amanecer» son exactamente estas: los dos momentos son el
mismo, y por eso un solo relevo sirve a los dos sistemas que antes lo hacian
cada uno por su lado.

La copia es superficial donde basta y profunda donde el motor **escribe dentro**
—edificios y aldeanos—, que es lo que hace fallar a la copia ingenua: construir
empuja sobre el mismo array y morir escribe en el aldeano que ya estaba. §4.3
sigue intacto: aqui se lee y se copia, nunca se escribe ni se consume azar.

**Lo que esto no arregla, dicho para que nadie lo confunda:** el desfase sigue
ahi. La jornada sigue durando ocho semanas; lo unico que cambia es que ya no se
ve cambiar. Hacer el tick mas fino tampoco lo arreglaria —con tick diario serian
cincuenta y seis pasos por jornada en vez de ocho—, porque el desfase es
estructural a D.6.1 y no al tamano del paso.

#### D.6.8 · El cuenco: las montanas van fuera del mapa (v3.63)

El valle se llamaba valle y no lo parecia: el mapa acababa en un corte recto
contra el cielo, y la niebla de D.5 estaba puesta ahi para disimularlo. Lo que
faltaba eran las montanas que lo cierran.

**Se midio antes de escribir nada, y la primera idea no salia.** Levantar el
borde del propio mapa —roca intransitable en el contorno— cuesta esto:

| Anillo | Celdas | Del bosque | Edificios afectados |
|---|---|---|---|
| 2 celdas | 352 (17 %) | **135 de 419 (32 %)** | 13 |
| 3 celdas | 516 (26 %) | 191 (46 %) | 26 |
| 4 celdas | 672 (33 %) | 240 (57 %) | 42 |

Un tercio de la lena del valle vive en las dos celdas del contorno, mas trece
edificios de una partida de cuarenta anos, mas el cauce por donde el rio entra y
sale. Cerrar el borde habria quitado la lena, tapiado el rio y derribado casas:
todo eso es balance del motor, y por una montana decorativa.

**La regla, por tanto: el cuenco empieza donde el mapa acaba.** La sierra vive
en coordenadas de fuera del rectangulo jugable, en `render3d/world/ridge.ts`, y
el motor no sabe que existe — ni una constante de §12, ni un tick, ni un byte
del fichero de guardado. Hay una prueba que lo vigila celda a celda, porque el
dia que alguien la meta dentro «para que se vea mejor» estara quitandole al
valle un tercio de su bosque.

Tres decisiones dentro de eso:

1. **La falda sube en coseno y no en recta.** Con una recta, el pie de la sierra
   hace un doblez justo en el borde del mapa y se lee como el corte que se venia
   a quitar. Hay una prueba con el escalon maximo por celda.
2. **El ruido va interpolado.** La primera version tomaba el nudo mas cercano y
   la ladera daba escalones de 3,47 celdas de una a la siguiente: un muro, no
   una montana.
3. **El color sale de la altura**, no de un `TERRAIN_CODE` nuevo: del prado del
   pie al monte bajo y de ahi a la roca. Anadir un terreno habria tocado
   paletas, colores y todas las pruebas que cuentan terrenos, para nada.

La sierra **no proyecta sombra**: con el sol bajo, la del este echaria una
sombra sobre medio pueblo, y lo que hay que ver es el pueblo.

**Lo que esto no es:** relieve jugable. El valle sigue siendo plano por dentro
—0,23 celdas de desnivel en todo el mapa, derivadas del tipo de terreno— y una
roca rodando por una ladera sigue sin tener donde ocurrir. Eso pide una capa de
altura en `ValleyMap` y es trabajo del generador de mapas.

### D.8b Los pinos de la ladera, y la sombra que parpadeaba (18 sep 2026)

**Dos cosas del render que el dueño del diseño revisó mirando el valle rodado.**

**Los pinos van en la loma, no en el bosque.** La primera versión los ponía
dentro del bosque cercano a la falda —una conífera en lugar de un árbol de hoja,
en las celdas de bosque a menos de siete de la montaña— y su veredicto fue
directo: «los pinos deben salir en la loma de la montaña, están mal puestos».
Ahora salen de la **ladera**: celdas de montaña con la cota entre 0,2 y 1,6, que
es la banda baja medida —la montaña ocupa media hoja y sube de 0,15 a 6,00; por
debajo está el pie llano del prado, donde ya planta el bosque, y por encima la
roca pelada—.

Las otras dos condiciones son suyas y están medidas en las cuatro semillas:

| | Qué se pidió | Qué sale |
|---|---|---|
| Corros | «en grupos de 3, 2 y 1» | los tres tamaños en las cuatro semillas, con el dos como el más común; nunca cuatro |
| Alturas | «de diferentes tamaños» | tres escalas (0,78, 1 y 1,2), las tres presentes en cada valle |
| Sitio | «por los alrededores del mapa más pegado a la montaña» | de 96 a 122 pinos en 45 a 59 corros, todos en la ladera |

Un corro se elige por la celda y no por una tirada (§4.3): el mismo valle da los
mismos pinos. Y los pinos **no son bosque**: no se talan, no salen en
`forestLooks` y un árbol que cae es siempre de hoja.

**La sombra que parpadeaba era el campo.** El recurso del sembrado lleva hileras
facetadas, y con esas caras proyectando y recibiendo sombra a la vez el shadow
map dibujaba una sombra por cada diente: al moverse el sol, el campo entero
parpadeaba. Un campo es **suelo trabajado**, no un volumen que tenga que
oscurecer la aldea, así que se queda con la luz directa y sin auto-sombra
(`world/buildings.ts`). Medido después, en una toma de seis segundos a ×64 con
quince fotogramas por segundo: el salto medio entre fotogramas es de 1,9 sobre
255 y el único pico —19,9— es el cambio de medianoche, cuando la fase pasa de
0,997 a 0,031.

Y la otra mitad de la sombra, que entró antes: la cámara del sol se ajusta al
**mapa** y no a lo que se ve (`SUN_SHADOW`, `visual-config.ts`), así que acercar
la cámara ya no mueve las sombras.

---

### D.9 Rendimiento: presupuesto antes de ampliar

§10.7 contiene objetivos del Canvas, no mediciones ni garantías trasladables
a 3D. El banco 3D conserva como escena de comparación los 80 habitantes y
45 edificios del objetivo actual. También cubre escenas pequeñas, maduras,
bosque denso, invierno, crisis y cámara cercana. El modelo exacto de móvil,
navegador y modo energético aún deben identificarse en G-00/G-09.

G-09 mide y el orquestador ratifica aquí una tabla con valor objetivo, límite,
perfil, escena, dispositivo, fecha y artefacto. Filas obligatorias: tiempo de
frame mediano/p95/p99, carga fría y caliente, bytes transferidos por recurso,
tiempo de parseo/subida, draw calls, triángulos, texturas y sus dimensiones,
estimación de memoria GPU claramente etiquetada, memoria observable y estabilidad
en sesión sostenida. Sin acceso fiable a GPU timing se informa tiempo CPU y
cadencia, sin llamar al primero tiempo GPU. Emulación móvil no sustituye hardware.

No se inventan límites numéricos en esta revisión. G-09 propone presupuestos
basándose en pruebas y no se supera P3 hasta incorporarlos como asertos. El
objetivo de fluidez se expresa en tiempo de frame y estabilidad, no solo FPS
medio. El objetivo histórico de 60 fps se contrasta; cualquier cambio requiere
decisión visible, no rebajar el test hasta pasar.

Orden de optimización: medir; compartir geometrías/materiales; agrupar estáticos
o instanciar árboles; evitar reconstrucción de escena cada frame; limitar pixel
ratio; comparar sombras sencillas y sombras dinámicas; reducir animación lejana;
solo después compresión o shaders especializados. Instanciar árboles no implica
que 80 mallas con esqueletos puedan compartir animación con la misma técnica.
Prueba específica compara coste de rig/variantes antes de cerrar producción.

#### D.9.1 · Presupuesto propuesto por G-09 (v3.27)

**Medido sin dispositivo real, y por eso parcial.** El banco corrió en un Chrome
de escritorio sin ventana sobre una RTX 4080. D.9 dice que la emulación no
sustituye al hardware, así que **ninguna de estas cifras cierra P3**. Lo que sí
vale de ellas es lo que no depende de la máquina.

| Métrica | Objetivo | Límite | Medido |
|---|---|---|---|
| Llamadas de dibujo, escena de comparación | ≤ 400 | 950 | 275 |
| Llamadas de dibujo, peor escena | ≤ 500 | 1 200 | 324 (bosque) |
| Triángulos, peor escena | ≤ 300 000 | 450 000 | 249 412 |
| Bytes por la red al arrancar | ≤ 600 KB | 1 MB | 502 KB |
| Programas de shader | ≤ 8 | 12 | 6 |
| Deriva en sesión sostenida | ≈ 0 | ±1 ms | −0,19 a +0,09 ms |

**El presupuesto de triángulos se corrigió, y el motivo importa.** La primera
propuesta lo puso en 90 000 de objetivo y 120 000 de límite, medido sobre un
valle **que no tenía un solo árbol**: era un número sacado de una escena a la
que le faltaba el mundo. Al plantar el bosque, la peor escena pasó a 249 412
triángulos y el coste **no se movió**: 1,40 ms de CPU de mediana antes y después,
y seis llamadas de dibujo más en total, porque los árboles van instanciados.

La lección, escrita para que nadie revierta la corrección creyendo que arregla
algo: **con instanciación, el número de triángulos deja de ser un buen indicio
del coste.** Lo que sigue siguiendo al coste son las llamadas de dibujo y el
tiempo de CPU. El límite de triángulos se conserva porque la memoria de vértices
sí es real, no porque prediga los milisegundos.

**Los tiempos de fotograma quedan sin presupuestar hasta medir en un teléfono.**
Un número de milisegundos sacado de una tarjeta de escritorio sería inventado.
Lo medido aquí: 3,0 a 4,7 ms de CPU de mediana y 4,8 a 8,5 en el p95. La
cadencia salió clavada a 56 fps en las siete escenas, que es lo que un navegador
sin ventana entrega y no lo que la escena permite: **la cadencia de este banco
no dice nada.**

**El hallazgo, y lo que se hizo con él.** Los aldeanos eran el **87 % de las
llamadas de dibujo**: dieciocho mallas cada uno, y en la escena de bosque
cincuenta y cinco aldeanos ponían 990 de las 1 143. Esa cuenta es la misma en un
teléfono. Una receta puede declarar ahora `mergeByMaterial`, y el generador une
las mallas por material **después de atar y de animar** —unir antes dejaría una
sola malla atada entera a un solo hueso—.

Medido antes y después, como D.9 exige: de 18 mallas a **3**, de 914 llamadas a
**269**, y el tiempo de CPU de la escena de comparación de 3,60 a **1,30 ms** de
mediana. **Los triángulos no se mueven ni uno** y la auditoría de animación
devuelve los mismos números dígito a dígito: lo que cambia es en cuántas tandas
se envía lo mismo. Informe completo en `docs/graphics-rounds/G-09.md`.

Perfil bajo degrada sombra, vegetación decorativa, resolución y efectos en ese
orden a validar, manteniendo personas y señales de crisis. Los valores visuales
se centralizan en futura `src/render3d/visual-config.ts` y recetas artísticas;
son una excepción acotada a la regla general de constantes en `engine/balance.ts`:
**solo** presentación, jamás balance. D.9 será su fuente numérica una vez calibrada.
Las proporciones exploratorias se registran como hipótesis en recetas, no límites
de test arbitrarios. No duplicar valores entre Python y TypeScript.

### D.10 Pruebas y evidencia

1. **Aislamiento:** mismo estado/decisiones con Canvas, 3D y sin renderer;
   variar número de frames, cámara, calidad y animación; estados serializados y
   flujos RNG idénticos tras avanzar. No exigir píxeles idénticos entre GPUs.
2. **Recursos:** generar en carpeta limpia, validar exportación y cargar GLB en
   navegador; conectores/huellas, clips y texturas; fallos no promueven salida.
3. **Actores:** pausas, cambios de velocidad, desaparición, nueva partida,
   ruta inválida, terreno modificado, casa ausente y retorno tras letargo.
4. **Selección:** mismo actor dibujado y tocado, zoom/pan, solapamiento,
   desaparición y fichas; objetivos táctiles y movimiento reducido.
5. **Ciclo GPU:** abrir/cerrar/reintentar, carga cancelada y pérdida de contexto;
   recursos propios vuelven a una base estable, sin exigir cero objetos internos
   de Three.js. No publicar como memoria real una estimación sin etiqueta.
6. **Paridad visual:** fixtures reproducibles de escasez, frío, peste, tala,
   fragua apagada, mejora, ruina, muerte y herencia; tabla estado → señal → captura.
7. **PWA:** GLB y texturas locales bajo el prefijo de despliegue, primera apertura
   online y posteriores offline, actualización entre versiones, recurso ausente,
   cuota insuficiente y caché parcial. No descargar recursos críticos de CDN.
8. **Rendimiento:** series repetidas con escena, duración y calentamiento
   registrados. Si no hay móvil accesible, P3 queda pendiente con diagnóstico PC.

Cada entrega visual congela semilla, decisiones/fixture, tick, tiempo escénico,
cámara, perfil, viewport, pixel ratio, versión del código y hash de recursos.
Las comparaciones cambian una variable deliberada. Capturas pequeñas de juego
además del detalle; hoja de contacto color/grises y clip para animación.
La revisión del agente debe abrir las imágenes y describir defectos concretos.
Una revisión humana remota juzga atractivo; un test no puede certificarlo.

Al cerrar módulo ejecutable: typecheck, suite rápida, lint y build; añadir las
pruebas de navegador/recursos afectadas. Banco largo solo si se toca simulación
o aparece evidencia de regresión que lo justifique. Un cambio exclusivamente
documental se comprueba por diff, referencias y coherencia, no ejecutando balance.

### D.11 Operación remota y gobierno de rondas

El flujo debe funcionar sin sesión de Blender abierta: runner lanza procesos
acotados en segundo plano, guarda logs y produce informes. Orden conceptual:
`doctor → build asset → validate → preview → capture → report`. G-00/G-02
implementarán los comandos; estos nombres no son comandos disponibles hoy.
Fijar rutas mediante configuración local explícita, sin buscar ejecutables en
cada frame. Si se necesita instalar, el agente concreta paquete, versión,
procedencia y destino y respeta los permisos del entorno.

**Requisitos físicos:** el host ejecutor debe estar encendido, accesible y sin
suspensión durante los trabajos. No hay continuidad automática garantizada con
el ordenador apagado o la tarea detenida. G-00 prueba el canal remoto realmente
disponible: enviar trabajo, recuperar progreso y abrir una evidencia fuera del
host. Si falta, propone un ejecutor siempre disponible o CI con artefactos,
especificando coste/credenciales; no lo contrata ni publica por inferencia.
No abrir puertos públicos ni depender de escritorio remoto para el pipeline.

Reanudación: cada ejecución tiene id, revisión de spec, commit, inputs, comandos,
etapas completas, outputs y error. Reejecutar solo etapas invalidadas; scripts
idempotentes sobre su directorio de salida. Un bloqueo de GPU puede permitir
autoría/exportación y pruebas CPU, pero no se registra validación gráfica.
Límites de tiempo y cancelación limpian procesos propios; no matar todos los
Blender del equipo. Ningún diálogo modal puede ser parte del camino feliz.

Entrega remota: breve informe y hoja de contacto/clip adjuntos donde el canal
los soporte, o artefacto privado accesible verificado. Las rutas locales se
conservan para reproducir, pero no se consideran enlaces accesibles desde el
móvil. No se crean automatizaciones ni servicios persistentes en esta ronda de
planificación. La primera ejecución remota confirma capacidades, sin promesas
de acceso que no se hayan ensayado.

Roles: **orquestador** diseña, asigna, revisa y versiona esta spec; **agente de
arte** implementa recetas/modelos/rig; **agente de render** integra escena y
comportamiento; **verificador** reproduce y examina evidencia. Pueden ser roles
secuenciales del mismo sistema. La función de orquestación no escribe código
de producción. Paralelizar solo briefs sin ficheros compartidos ni contratos
pendientes. No crear tareas de usuario automáticamente para simular delegación.

Solo el orquestador integra cambios en la spec y ficheros compartidos de
configuración. Al empezar: `git status`, revisión actual y diff local. No
sobrescribir trabajo concurrente. Si el estado cambia, releer la sección
afectada y aplicar una modificación acotada sobre la última copia. Ramas siguen
la convención §2.5; el usuario decide publicación/merge según autorización.

Formato de cada ronda:

- **Cabecera:** id, versión, lecturas obligatorias y alcance excluido.
- **PARTE 0 — Cierres:** decisiones previas y comprobaciones pendientes; si una
  dependencia necesaria no está verificada, no iniciar su trabajo dependiente.
- **PARTE 1 — Experimento:** hipótesis, alcance de archivos, contrato, tests y
  evidencia posible hoy. No pedir métricas de módulos aún inexistentes.
- **Entrega:** qué cambió, cómo reproducir, capturas abiertas/revisadas, mediciones,
  límites, desviaciones y qué resultado falsaría la hipótesis.

Arbitraje: ratificar con evidencia, rechazar explicando la restricción, o promover
una decisión que la spec no cubría. Registrar motivo antes de la ronda siguiente.
Para ahorrar uso: construir solo recursos afectados, compartir bibliotecas,
hojas de contacto compactas, no cargar todo el historial ni repetir bancos
sin cambios. Presupuesto de tiempo/créditos explícito cuando el usuario lo dé;
si se agota, dejar checkpoint reproducible, nunca marcar aprobado lo pendiente.

### D.12 Briefs por módulo

Los ficheros indicados son el alcance autorizado al despachar cada brief, no una
orden de implementar todos ahora. Nuevos paths se crean en su ronda. Todos
entregan informe `docs/graphics-rounds/G-XX.md` y evidencia en su carpeta
`artifacts/graphics/G-XX/`. Los informes no son fuente normativa.

#### G-00 · Entorno y circuito remoto

**Objetivo:** demostrar herramientas y acceso sin presencia física.
**Depende de:** nada. **Lectura:** D.0–D.2, D.4, D.11.
**Ficheros:** `tools/graphics/doctor.ts`, informe/evidencia G-00.
**Contrato:** diagnóstico invocable mediante el `tsx` local; salida estructurada
con herramienta, ruta, versión, comprobación, resultado y motivo de fallo.
No exponer secretos ni volcar variables de entorno completas.
**Reglas:** buscar instalaciones alternativas acotadas; si hay Blender ejecutar
un trabajo mínimo en background que guarde una imagen y GLB en artifacts;
documentar dependencia faltante sin fingir ejecución. No instalar por sorpresa.
**Tests exigidos:** rutas con espacios, falta de ejecutable, código de salida;
abrir imagen y demostrar carga del GLB si están disponibles las herramientas.
**Terminado cuando:** pipeline mínimo comprobado y canal remoto con evidencia,
o bloqueo preciso que impide P0. No cerrar P0 con una lista de programas.

#### G-01 · Costuras, contratos y banco de captura

**Objetivo:** piloto separado y evidencia repetible antes de arte complejo.
**Depende de:** diagnóstico G-00; no exige Blender para la escena de prueba.
**Lectura:** D.5, D.7, D.10. **Ficheros:** `src/render3d/contracts.ts`,
`tools/graphics/viewer.html`, `tools/graphics/viewer.ts`,
`tools/graphics/capture.ts`, `tests/fast/graphics-contracts.test.ts`.
**Contrato:** tipos D.5; visor de desarrollo recibe fixture, cámara y tiempo
explícitos y emite ready/error después de carga real, sin sleeps arbitrarios.
**Reglas:** propuesta de dependencia Three.js/versionado a orquestador;
`package.json` y lockfile los integra el responsable único de configuración.
**Tests exigidos:** aislamiento, captura repetible dentro del mismo entorno,
error de recurso visible al runner. **Terminado cuando:** una geometría asimétrica
se ve y captura, contratos compilan y juego Canvas sigue funcionando.

#### G-02 · Pipeline de arte y contrato GLB

**Objetivo:** regenerar y validar un recurso desde fuentes.
**Depende de:** G-00/P0 herramientas, G-01. **Lectura:** D.4 y D.10–D.11.
**Ficheros:** `tools/art/`, `art/recipes/axis-marker.json`,
`art/catalog.json`, `tests/fast/art-manifest.test.ts`.
**Contrato:** comandos de runner `build`, `validate`, `report` con id de recurso
y carpeta de salida; salida no cero en fallo; manifiesto con campos D.4.
**Reglas:** fijar Blender/exportador ensayados; fuente única; promoción atómica.
**Tests exigidos:** reconstruir carpeta limpia, ejes/escala y carga en visor,
interrupción no corrompe aprobado. **Terminado cuando:** P0 reproducible completo.

#### G-03 · Rincón de aldea y dirección artística

**Objetivo:** cerrar lenguaje visual con un conjunto pequeño.
**Depende de:** G-02. **Lectura:** D.3–D.4, D.8.
**Ficheros:** `art/recipes/palette.json`, `art/recipes/village-kit/`,
`art/recipes/villager-study/`, informe G-03; cambios de catálogo por propietario.
Si las formas aprobadas no caben en las primitivas de G-02, el orquestador puede
transferir de forma explícita `tools/art/schema.ts`, `tools/art/blender-build.py`
y sus pruebas para añadir primitivas generales, nunca lógica propia de un recurso.
**Contrato:** casa, campo, camino, árbol y estudio de habitante exportables bajo D.4.
**Reglas:** comparar variantes controladas; parámetros etiquetados exploratorios;
no reutilizar recursos de los juegos de referencia.
**Tests exigidos:** huellas, materiales, capturas en cámara común y grises;
leer a tamaño de móvil. **Terminado cuando:** P1 aceptada sobre visor real.
**Falsación:** si necesita posproducción externa para resultar legible, revisar arte.

#### G-04 · Habitante, rig y biblioteca inicial

**Objetivo:** personaje terminado y cuatro clips iniciales coherentes.
**Depende de:** G-03/P1. **Lectura:** D.3–D.4, D.6.
**Ficheros:** `art/recipes/villager/`, `tools/art/rig.py`, `tools/art/animate.py`
(el brief los proponía como carpetas; son dos guiones),
`tools/graphics/animation-audit.ts`.
**Contrato:** clips y conectores D.4, misma jerarquía en variantes; locomoción in-place.
**Reglas:** comparar rígido/deformable antes de fijar elección; probar manos,
ropa y accesorios; no prometer expresividad solo por existir keyframes.
**Tests exigidos:** duración/curvas válidas, no deriva raíz, clips cargados,
bucles y transiciones inspeccionados en vídeo. **Terminado cuando:** caminar,
trabajar y cargar se reconocen desde la cámara de juego sin deformaciones graves.

#### G-05 · Reloj de presentación y actores

**Objetivo:** vida continua sincronizada con verdad del estado.
**Depende de:** G-04. **Lectura:** §4, §7.6, D.5–D.6.
**Ficheros:** `src/render3d/presentation-clock.ts` y `src/render3d/clips.ts`
sobreviven; `src/render3d/actors/` y sus escenarios los borró V-12, y lo que
queda de su prueba es `tests/fast/graphics-clock.test.ts` — el reloj, que sigue
siendo el dueño único del tiempo de presentación.
**Contrato:** `GraphicsFrame`; actores derivados por id, sin campos nuevos guardados.
**Reglas:** acceso a rutas existente, anclas validadas, poses y retirada D.6;
calibrar duración escénica y zancada, llevar decisión a D.9 antes del cierre.
**Tests exigidos:** pausa/velocidades, letargo, muerte, mudanza, ruta fallida,
esquinas y no mutación. **Terminado cuando:** P2 con clips en todas las velocidades
y ausencia de saltos/lógicas económicas nuevas.

#### G-06 · Escena conectada a una partida

**Objetivo:** terreno, edificios y actores de estado real, incrementales.
**Depende de:** G-03, G-05. **Lectura:** §3.5, D.5–D.6, D.8–D.10.
**Ficheros:** `src/render3d/renderer.ts`, `src/render3d/world/`,
`src/render3d/assets.ts`, `src/render3d/visual-config.ts`,
`tests/fast/graphics-world.test.ts`, visor G-01 bajo propietario acordado.
**Contrato:** implementación completa de `createGraphicsRenderer`/D.5;
selección básica de geometría se perfecciona en G-07, nunca método vacío.
**Reglas:** invalidar cambios relevantes, recursos compartidos con dueño,
errores recuperables; no reconstruir todo cada fotograma.
**Tests exigidos:** construcción/ruina/tala, nueva partida, disposición/cancelación,
estado idéntico con distinto número de frames. **Terminado cuando:** una partida
real produce escena correcta y el ciclo de vida no filtra recursos propios.

#### G-07 · Cámara, tacto e integración de interfaz

**Objetivo:** jugar y seleccionar desde móvil con el piloto.
**Depende de:** G-06. **Lectura:** §11, D.5 y D.7.
**Ficheros:** `src/render3d/camera.ts`, `src/ui/app.ts`, `src/ui/inspect.ts`,
`src/ui/gestures.ts`, `src/ui/loop.ts`, `src/ui/backend.ts` y
`tests/fast/graphics-picking.test.ts`. **La selección no tiene fichero propio:**
el brief proponía `picking.ts` y `pick` vive en `renderer.ts`, que es quien
posee la última escena pintada — D.5 lo exige así, «`pick` consulta la última
escena pintada, no recalcula otra multitud». Las capturas del 3D se miran con
`tools/graphics/shot.mjs`, que no es un recorrido de Playwright.
**Contrato:** `pick` D.5 y contenido existente de `panelFor`; selector de backend
de desarrollo con Canvas por defecto; reloj de presentación sin tocar acumulador.
**Reglas:** un solo propietario de app/loop; zoom real, no CSS; Canvas separado
al volver de WebGL. **Tests exigidos:** tap/pinch/pan, solapamiento, paneles,
pausa, reducido, resize y arranque asíncrono. **Terminado cuando:** mismas acciones
del juego utilizables en piloto sin perder partidas ni accesibilidad.

#### G-08 · Estaciones y consecuencias visibles

**Objetivo:** que la belleza conserve el valle como HUD.
**Depende de:** G-06; interacción de G-07 para evidencia final.
**Lectura:** §8, §10–11 relevantes, D.3 y D.8.
**Ficheros:** `src/render3d/effects/` y —propuestos y **nunca creados**, que es
la deuda declarada de la ronda— `art/recipes/effects/`,
`tools/graphics/consequence-scenarios.ts`, `tools/graphics-parity.shots.ts`, más
`tests/fast/graphics-effects.test.ts`.
**Contrato:** matriz de efecto/estado real → señal 3D → evidencia reproducible;
reutilizar significado existente de `tellsFor` o adaptarlo sin duplicar reglas.
**Reglas:** resolver condiciones exactas vigentes al abrir el brief; no
representar consecuencias por temporizadores independientes de su expiración.
**Tests exigidos:** estación/crisis antes y después de caducar, ruina/herencia,
legibilidad en grises. **Terminado cuando:** ninguna consecuencia cubierta en
Canvas desaparece del contrato visual 3D; pendientes de catálogo identificados.

#### G-09 · Banco y presupuesto móvil

**Objetivo:** decidir si el enfoque escala antes del catálogo completo.
**Depende de:** G-06 y primer conjunto representativo G-08.
**Lectura:** D.9–D.10. **Ficheros:** `tools/graphics/benchmark.ts`, escenarios
de rendimiento, informe G-09; optimizaciones posteriores se asignan al dueño
del módulo medido. **Contrato:** informe estructurado con métricas/contexto D.9.
**Reglas:** no confundir headless con dispositivo real; no cambiar balance para
bajar población; usar instancias provisionales etiquetadas si faltan modelos.
**Tests exigidos:** repetición, sesión sostenida y ciclo de recursos; medir antes
y después de optimizar. **Terminado cuando:** P3 y presupuesto incorporado a D.9;
si hardware no está disponible, resultado parcial explícito.

#### G-10 · Catálogo completo por lotes

**Objetivo:** sustituir recursos provisionales con coherencia y cobertura.
**Depende de:** P1–P3, G-08. **Lectura:** D.3–D.4 y D.8–D.9.
**Ficheros:** subcarpeta `art/recipes/<familia>/` asignada por lote; publicación
en `public/assets/valley3d/` por integrador; catálogo con escritor único.
**Contrato:** una entrada verificable por kind/estado exigible de D.8.
**Reglas:** dividir vivienda, sustento, comunidad/defensa y mundo en rondas;
no modificar rig/paleta compartidos sin elevar propuesta.
**Tests exigidos:** pipeline de recursos y presupuesto por lote, escenas reales
jóvenes/maduras/ruinosas. **Terminado cuando:** cobertura sin placeholders y
sin regresión de presupuesto con el catálogo real.

#### G-11 · Distribución, PWA y recuperación

**Objetivo:** uso instalable/offline y recuperación con recursos 3D.
**Depende de:** G-07, G-10. **Lectura:** §13.4 y D.7/D.10/D.11.
**Ficheros:** `src/ui/pwa.ts`, `public/sw.js`, `vite.config.ts`,
`tools/valley.pwa.ts`, `tools/subpath.pwa.ts`, `tools/stale.pwa.ts`;
`src/render3d/assets.ts` mediante transferencia explícita de propiedad.
**Contrato:** manifiesto versionado; recursos bajo base de despliegue;
fallback conserva estado en memoria. **Reglas:** no purgar caché activa antes
de disponer de actualización completa; sin publicación como parte de la prueba.
**Tests exigidos:** casos PWA D.10, error/cancelación y pérdida de contexto.
**Terminado cuando:** P4 en build de producción, incluido subdirectorio.

#### G-12 · Aceptación y migración de la especificación — **cerrada en dos mitades**

**Estado.** La activación se hizo el 14 sep 2026 y **la migración de la
especificación no**, aunque este brief la pedía en la misma ronda. La segunda
mitad se completó al auditar el 15 sep (v3.66): §1, §2.1, §2.4, §10, §13.4, §14,
D.0 y D.5 describen ahora el juego que se juega.

**Lo que costó ese día de desfase**, y queda escrito porque es la evidencia de
que este brief tenía razón en pedir las dos cosas juntas:

- Las reuniones de §11.8 dejaron de ocurrir y nadie lo supo (E.0).
- La reja de capturas de §14.3 medía el Canvas creyendo medir el juego, y ocho
  de trece recorridos llevaban rojos desde U-01.
- Los modelos 3D no se precacheaban, así que sin red el valle abría en 2D.
- Ocho módulos del render nuevo importaban del viejo (D.5).

Ninguna de las cuatro era difícil de arreglar. Las cuatro eran invisibles.

**Objetivo:** activar solo lo demostrado y cerrar convivencia temporal.
**Depende de:** G-00–G-11 y aceptación visual remota.
**Ficheros:** `docs/design.md`, `CLAUDE.md`, `docs/handover.md` por orquestador;
activación por agente de integración con brief acotado sobre app/config.
**Contrato:** §10/§11 y briefs M afectados describen ahora el comportamiento
aprobado; fuente única de reloj/constantes/presupuestos. **Reglas:** conservar
historia; decidir mantenimiento del fallback antes de borrar Canvas; no retirar
tests solo porque ahora fallan. **Tests exigidos:** suite rápida, tipos, lint,
build, navegador y PWA sobre release candidata; paridad de guardados y checklist
visual con evidencia. **Terminado cuando:** P5, activación reversible y ninguna
regla Canvas vigente contradice la arquitectura activada.

### D.13 Dependencias, paralelismo y próximo paso

```text
G-00 → G-01 → G-02 → G-03 → G-04 → G-05 → G-06
                                               ├→ G-07 ───────────┐
                                               └→ G-08 → G-09     │
                                                          ↓       │
                                                        G-10 ─────┤
                                                                  ↓
                                                                G-11 → G-12
```

G-07 y G-08 pueden avanzar en paralelo con propiedad de archivos acordada.
Tras P3, lotes de G-10 se pueden repartir por familias. El orquestador serializa
catálogo, paleta, contratos y configuración. No adelantar biblioteca completa
mientras se desconozca el coste del rig. Revisión visual y medición tienen
autor distinto cuando haya agentes disponibles, sin duplicar implementación.

G-00–G-02 ejecutados en v2.90–v2.92: la cadena local crea, exporta, sirve,
carga, valida y promueve sin GUI. P0 queda parcial únicamente por la comprobación
externa desde un segundo dispositivo. Próxima ronda: **G-03**, primer estudio
artístico comparado. Ese trabajo local puede avanzar mientras espera la
comprobación externa; P1 requiere aceptación del usuario sobre imágenes concretas.
La guía no incluye estimaciones en horas: herramientas, capacidad remota y
criterio artístico siguen sin medir. Tras P0/P1 se estimará por recursos
aprobados y rondas observadas, con incertidumbre explícita.

### D.14 Fuentes técnicas y límites de evidencia

Documentación primaria consultada para justificar el enfoque; G-00/G-02 deben
verificar APIs contra la versión instalada, no asumir compatibilidad por estas
referencias:

- [Blender: argumentos de ejecución en segundo plano y Python](https://docs.blender.org/manual/en/3.0/advanced/command_line/arguments.html).
  Verifica la existencia del mecanismo; no prueba una instalación local.
- [Three.js: sistema de animación](https://threejs.org/manual/en/animation-system.html).
  Soporta clips, huesos y transformaciones; no garantiza buen rig ni rendimiento.
- [Three.js: cámara ortográfica](https://threejs.org/docs/pages/OrthographicCamera.html).
- [Three.js: carga GLTF](https://threejs.org/docs/pages/GLTFLoader.html).
- [Three.js: SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html).
- [Three.js: liberación de recursos](https://threejs.org/manual/en/how-to-dispose-of-objects.html).

### D.15 Registro detallado de esta revisión

v2.92 arbitra G-02. Se ratifican receta canónica, generador reutilizable,
candidato separado, carga Three.js y promoción atómica. Dos ejecuciones dieron
GLB distintos en bytes pero idénticos en caja, nombres, materiales, 504 triángulos
y captura; por ello se conserva la equivalencia semántica definida en D.4 y el
hash exacto de cada entrega. Se promueve que clips y conectores vacíos solo son
correctos para estudios que los declaran vacíos. G-03 puede ampliar primitivas
del pipeline únicamente mediante transferencia explícita y general. Informe:
`docs/graphics-rounds/G-02.md`.

v2.91 arbitra G-01. Se ratifican la exportación Y-up sin reparación, el encuadre
por caja, el tiempo de presentación explícito y la captura repetible: dos PNG
640 × 640 comparten SHA-256 en Chrome 153. Se promueve que `normalBias` y volumen
de sombra se deriven de la caja. Three.js se fija en 0.185.0 con tipos 0.185.4:
r186 estaba publicado pero no tenía tipos alineados. La suite nueva tarda 3 ms;
la suite completa observada en 22,11 s supera el objetivo histórico por pruebas
de simulación existentes, no por G-01. Informe: `docs/graphics-rounds/G-01.md`.

v2.90 arbitra G-00. Se ratifica Blender en segundo plano con 5.2.1 LTS y Chrome
del sistema como navegador Playwright. El diagnóstico no confía en el código de
salida de Blender: exige marca de finalización, los tres productos y cabecera
GLB. Se promueve esta regla porque dos excepciones Python devolvieron 0 durante
la construcción del propio diagnóstico. P0 permanece parcial: G-01 debe cargar
el GLB en Three.js y la evidencia aún debe abrirse desde fuera del host. Informe:
`docs/graphics-rounds/G-00.md`.

v2.89 añade el programa sin cambiar código de producción. Motivos: separar
capacidad de generar modelos de capacidad de manejar una GUI; hacer comprobable
la continuidad remota; conservar inversión del motor; dar prioridad a escala,
legibilidad, animación y medición antes de fabricar catálogo. Módulos afectados
en futuras rondas: M-16–M-18, M-19/M-20, M-21, accesibilidad, persistencia/PWA
y sus pruebas. No se declara completado ningún trabajo pendiente anterior.
La base incorporaba revisiones hasta v2.88; se conserva íntegra y se añade este
anexo. El sello temporal usa la fecha observada del entorno, aunque el historial
anterior tenga fechas posteriores.

## Anexo E · La vida del valle: cuerpos, impulsos y elección

### E.0 Autoridad, estado y lectura

Este anexo es normativo para todo lo que vive en `src/render3d/life/`. Nace de
una queja del dueño del diseño que el Anexo D no podía resolver: *«el pueblo no
se siente vivo»*. Se ratificó con un descarte medido (V-00) y se construyó por
fases.

**Estado (v3.68): el Anexo E entero cerrado.** V-00 a V-14, con V-11 —«lo que
el motor manda»— cerrada el 15 sep 2026: `life/staging.ts` convierte una
reunión de §11.8 en un `Place` con aforo de aldea, hora fija y compañía en vez
de deber, y del 77 % al 100 % de la aldea va donde la decisión dijo. De las tres
órdenes del contrato sólo se sirve `gather`; la riña de §7.9 y el duelo esperan
un cambio del motor —la crónica guarda los nombres y no los `id`, y `quarrelOf`
consume azar, así que `life/` no puede llamarlo (§4.3).

**Y cómo se destapó lo que V-11 arregló, que es la lección que queda:** las
reuniones de §11.8 sólo existían en el camino viejo. Dejaron de ocurrir el día
de G-12 y nadie lo vio, porque la prueba que las vigilaba llamaba a `actorsFor`
directamente y siguió verde sobre un camino que el juego ya no recorría. V-12
borró ese camino y la propiedad quedó roja y declarada, con el número: el más
lejano a 12,4 celdas del sitio, y luego a más de dieciséis con el mapa grande.
Cerrada V-11, entre 8,0 y 11,3 según la semilla y el sitio.

**Las tres trampas que V-11 costó, medidas, porque ninguna era obvia:** dejar la
cabaña en la lista de ofertas el día de la reunión manda a la aldea entera con
los animales —una gallina a una celda gana a la aldea entera a once—; obedecer
una orden imposible deja a veintitrés personas plantadas con `doing: null`; y el
punto que el motor da para «en la capilla» cae **dentro** de la capilla, que
para un cuerpo es una pared.

**Lectura obligatoria antes de tocar la capa:** E.1 (el diagnóstico, para no
volver a construir lo que se retira), E.3 (los innegociables, que son seis y
cortos), E.6 (por qué lo que hay en el juego hoy es peor que el descarte, que es
lo primero que un agente nuevo va a ver) y E.7 (las trampas ya pagadas, para no
pagarlas dos veces). Después, el brief de la fase que se despacha en E.8.

Los informes de ronda están en `docs/life-rounds/V-XX.md` y **no son fuente
normativa**: cuentan qué pasó y qué se midió. Lo que manda es este anexo.

### E.1 Diagnóstico: el valle no se simula, se dibuja

**Este diagnóstico está cumplido y lo que describe ya no existe** (V-12 lo
borró el 15 sep 2026). Se conserva entero, y en presente, porque es el argumento
de por qué la capa de vida existe: quien venga a «simplificar» volviendo a
derivar posiciones de una fórmula del reloj tiene que leer esto primero.

`src/render3d/actors/index.ts` —1 328 líneas, 32 funciones— era una función pura
que responde a una pregunta: *«¿dónde estaría esta persona en este instante?»*.
Nadie anda. Es animación paramétrica, una curva que se evalúa en el segundo 37,
y no una simulación.

Se ve en los nombres de sus ayudantes: `lane`, `laneWidth`, `elbowRoom`,
`leash`, `skirt`, `unwind`, `pullString`, `aroundWalls`, `detour`,
`trimIndoors`, `clearBetween`. **Todo eso emula lo que un cuerpo con posición y
velocidad hace solo.** `lane` existe para que dos no se solapen, porque no
pueden chocar. `detour` rodea una pared, porque no hay colisión. `leash` ata a
alguien a su puesto, porque no tiene voluntad.

Y de ahí sale la lista de defectos de G-05 a G-11. Los teletransportes de
aldeanos, de animales, de puertas, de rutas, el brinco de `ashore`: **no son
doce fallos, son uno, doce veces**. Cuando la posición es `f(tick, fase)` y el
tick cambia a media jornada, la fórmula da otro resultado y el cuerpo aparece en
otro sitio. El estado de la jornada (D.6.7) tapa el síntoma; no toca la causa.

Lo que el dueño del diseño pide —que se choquen, que uno persiga a otro, que
se encuentren y hablen, que uno tire una pelota, que acaricien a un perro—
**no es difícil con esa arquitectura: es imposible**, caso por caso:

| Lo que se quiere | Por qué no puede ser con `actorsFor` |
|---|---|
| Que se choquen | No hay dos cuerpos: hay dos evaluaciones independientes de una fórmula |
| Que uno persiga a otro | El destino se fija al amanecer y no cambia en toda la jornada |
| Que se encuentren y hablen | Los encuentros se precalculan al amanecer; no ocurren, se recitan |
| Tirar una pelota | Sólo existen las entidades que el motor conoce; una pelota no está en `GameState` |
| Acariciar un perro | Gente y animales se calculan en sistemas separados que no se ven |
| Caos, sorpresa, cada aldea otra | Una función determinista del reloj da siempre la misma coreografía |

Y encima hay un muro: el render no puede escribir en `GameState` (§4.3). Así que
con dos capas, cualquier cosa que pase entre dos personas tendría que existir
en el motor, y el motor avanza una semana por tick. Lo que se quiere pasa en
segundos.

### E.2 Las tres capas

Hay dos capas donde debería haber tres. La que falta es la del medio, y es la
que se ve.

| Capa | Ritmo | ¿Se guarda? | Manda sobre | Estado |
|---|---|---|---|---|
| **1 · El motor** (`src/engine/`) | 1 tick = 1 semana | Sí, es la partida | Quién nace, quién muere, cuánto grano | Existe y no se toca |
| **2 · La vida** (`src/render3d/life/`) | paso fijo de 1/30 s escénico | **No.** Se reconstruye | Dónde está cada cuerpo y qué hace ahora | En construcción |
| **3 · El render** (`src/render3d/`) | por fotograma | No | Pintar lo que la capa 2 dice | Existe; hoy hace además el trabajo de la 2 |

La clave que lo hace viable: **la capa 2 no escribe en `GameState`**. Tiene
estado propio, efímero, que no viaja en el fichero de guardado. Corre a paso
fijo desde un estado congelado (el de la jornada, D.6.7) con una semilla
derivada del día, así que es reproducible sin guardarse. Perderla no pierde
nada: se vuelve a vivir el día, y vivir un día entero de ochenta personas
cuesta **8 ms** medidos.

Lo que esto cuesta y hay que aceptar por escrito: **el caos que se ve no tiene
consecuencias mecánicas**. Dos que se empujan en la plaza no cambian sus
opiniones. Las consecuencias siguen viniendo del motor —riñas de §7.9, rencores
de §6.4— y la vida las escenifica (V-11), añadiendo encima textura que no
cuenta. Es a propósito: el día que la vida escriba en el motor, la partida deja
de reproducirse desde su semilla, porque dependería de cuánto tiempo real
estuvo abierta la pestaña. Si algún día se quiere cruzar esa línea, se diseña
aparte y con su ronda de balance.

### E.3 Innegociables de la capa

Seis reglas. Romper cualquiera convierte el refactor en una deuda peor que la
que sustituye.

1. **La vida nunca escribe en `GameState`.** Ni una propiedad. Lo que necesita
   del motor lo lee del estado de la jornada.
2. **La vida nunca consume el azar del motor.** Flujo propio, sembrado con
   `seedOfDay(seed, día)` = `hash32(seed, "life:" + día)`. Todo azar de la
   capa sale de ahí por funciones puras. Tener la pestaña abierta más rato no
   desplaza una sola tirada de la simulación.
3. **Paso fijo, siempre.** `LIFE_STEP = 1/30` s escénico. Nada depende de
   cuántos fotogramas por segundo dé el móvil. Acumulador con tope de 240 pasos
   por fotograma y **sin arrastre**: lo que un fotograma atragantado no pudo
   simular se tira, porque una deuda impagable crece sola y deja el valle a
   cámara lenta para siempre.
4. **Reconstruible.** Perder el estado no puede perder nada: se vuelve a vivir
   la jornada desde su amanecer (`rebuildTo`). Es la cura del letargo.
5. **Determinista dentro de la jornada.** Mismo estado congelado + mismo día +
   mismo número de pasos = misma aldea, cuerpo a cuerpo. Hay prueba.
6. ~~**Se apaga entera.**~~ **Cumplida y retirada en V-12.** La bandera
   `valley.life` devolvía el render al camino viejo mientras el refactor estaba
   a medias, y el Anexo E condicionaba borrarla a aprobación humana viendo la
   capa funcionar. Hecho: la bandera no existe, y con ella se fueron 3 052
   líneas del camino viejo y del descarte. **La regla que deja en su lugar:**
   una bandera de convivencia es una deuda con fecha, no una comodidad
   permanente — y mientras existe, cada prueba que corre por el lado apagado es
   una prueba que no vigila el juego.

Y una séptima que no es de la capa sino del método, aprendida a golpes en E.6:
**no se ajusta una constante a ciegas más de dos veces seguidas.** Si a la
tercera no cuadra, es el modelo y no el número, y se para a mirar.

### E.4 El mecanismo: el mundo ofrece, el agente elige

De la combinación de cuatro entidades y un mecanismo sale el caos sin escribir
un guion.

**Entidades:**

- **Cuerpo** (`body.ts`): posición, velocidad, radio, orientación. Colisiona.
  Lo tienen personas y animales por igual.
- **Agente** (`village.ts`, `Dweller`): un cuerpo con impulsos, carácter e
  intención. Elige.
- **Trasto** (V-09, pendiente): pelota, cubo, jarra, leña. Se coge, se suelta,
  rueda. No decide nada.
- **Sitio** (`offers.ts`, `Place`): el pozo, la fragua, la era, la capilla.
  Fijo, con aforo, y *ofrece cosas que hacer*.

**El mecanismo.** Cada sitio, trasto o persona ofrece acciones a quien pase
cerca (`Offer`: qué, dónde, cuánto cabe, qué calma, cuánto dura). Cada agente
lleva seis impulsos que suben solos y bajan al satisfacerse (`Needs`: cansancio,
sed, compañía, aburrimiento, irritación, deber). La elección (`decide.ts`) es
por **utilidad, no por árbol**:

```
score = Σ needs[k] · offer.gives[k]   ×   biasOf(traits, offer)   ×   falloff(distancia)   ×   (0,85 + dado · 0,3)
```

Un árbol diría «si tiene sed, al pozo», y entonces todo el que tenga sed va al
pozo siempre. Con utilidad, el sediento que además está agotado y tiene el pozo
a veinte pasos se sienta, y eso no lo ha escrito nadie.

**Por qué esto da caos:** la misma persona con el mismo carácter hace cosas
distintas según cómo lleve el día, quién pase cerca y qué haya a mano. Dos
aldeas con la misma semilla divergen en cuanto un cuerpo se aparta un palmo. Y
añadir una `Offer` nueva añade comportamiento a **todo el mundo** sin tocar a
nadie: «lavar en el río» es una entrada en una tabla, no una rama en un árbol.

**La regla que sostiene esto, con prueba que la vigila:** ninguna oferta
conoce a ningún agente concreto. En cuanto una diga «si pasa Aelric, entonces…»
esto deja de ser un mundo con cosas y es un guion con disfraz. La prueba mira la
forma del catálogo —una oferta es qué, dónde, cuánto cabe y qué calma— y salta
si alguna gana un campo que nombre a una persona, un oficio o una decisión.

**Dónde entra el carácter, y son dos sitios distintos:**

1. En la *velocidad* a la que suben los impulsos (`needs.ts`, tabla `TEMPER`):
   un `hot_tempered` acumula irritación tres veces más rápido, un `secretive`
   echa de menos a la gente a un tercio de lo normal.
2. En la *inclinación* hacia una acción (`decide.ts`, tabla `LEANING`): un
   `devout` va a rezar aunque no le apriete nada; un `secretive` esquiva el
   corro.

Un rasgo que no aparece en esas tablas no cambia la vida, y eso está bien: los
rasgos ya deciden otras cosas en el motor (§6.3). Los rasgos vienen del motor y
todo el mundo los tiene desde v3.61.

### E.5 Lo construido, con sus medidas

Cada fase cerrada tiene su informe en `docs/life-rounds/`. Aquí, lo que
entregó y el número que lo prueba.

| Fase | Ficheros | Lo que entregó | Medido |
|---|---|---|---|
| **V-00** | `life/spike/*` | El descarte: ocho cuerpos, charlas, empujones, palos, pelota, en un prado; luego el mismo `step` sobre el valle real con 80 y 200 | 80 cuerpos: 236 µs por paso, 0 en muros, paso máx 0,109. Jornada reconstruida en 8 ms. Aldeas de paz (0 empujones) y de bronca (7–8) según quién vive |
| **V-01** | `life/clock.ts` | Paso fijo con acumulador, semilla por jornada, `rebuildTo` | 300 pasos por 10 s tanto a 60 Hz como a sorbos desiguales. `NaN` no envenena el acumulador |
| **V-02** | `life/body.ts`, `grid.ts`, `steering.ts` | Cuerpos con radio, separación, evitación de muros, resolución de solapes con tope, **rejilla espacial** | Coste por cuerpo plano con la multitud: 1,5 µs con 80, 2,1 µs con 200 (el descarte, n², daba 6,9). Nadie en un muro en 6 valles |
| **V-03** | `life/navigate.ts`, `terrain.ts` | A* propio sobre la máscara (8 direcciones, sin cortar esquinas, coste entero), recorte por línea de vista, caché por par de celdas, `reachableFrom` | 80 personas, jornada entera, >200 viajes completados, 0 en muros |
| **V-04** | `life/needs.ts` | Seis impulsos, velocidad por carácter, remedio por acción, el hambre agria | Dos caracteres distintos acaban el día distintos; ninguno se sale de 0..1 en seis jornadas |
| **V-05** | `life/offers.ts` | Catálogo de ofertas, sitios sacados de los edificios, aforo, **cada plaza con su sitio** | Todo edificio del catálogo ofrece algo; ninguna oferta en pared ni fuera del mapa |
| **V-06** | `life/decide.ts`, `village.ts`, `cast.ts` | Utilidad, inercia, reserva de plaza al decidir, la aldea entera ensamblada, el puente a `Cast` | Misma jornada = misma aldea cuerpo a cuerpo; dos jornadas ≠. Aforo: 0 excesos. Forcejeos 1 003 → 369 |
| **V-07** | `life/scenes.ts` | Escenas de dos: charla, rechazo, encaro, pelea devuelta, con papeles distintos | Ninguna aldea de 38 se queda en cero encontronazos, pero varían de 1 a 17 según quién vive en ella. `castOf` no patina: 3 290 tramos, desajuste de orden 10⁻¹⁴ s |
| **V-08** | `life/beasts.ts` | Gallinas, cerdos y vacas como `Dweller` con impulso propio, y una `Place` móvil que ofrece `pet`/`chase`/`feed` | 0 animales en el agua en 6 semillas; interacción persona-animal en todas las semillas con cabaña (1 411 a 4 895 instantes); `ashore` de 1,08 a 0,326 celdas |
| **V-10** | `life/places.ts` | La plaza, el vado y el claro: sitios que no son un edificio | Los tres se detectan y son alcanzables en 6 de 6 semillas; visitados en la mayoría (plaza 4/6, claro 5/6, vado 3/6) |
| **V-13** | `tests/fast/life-perf.test.ts` | La medida del coste por cuerpo, continua | 0,75 µs con 80, 1,02 µs con 200: sube un 36 % al multiplicar por 2,5 la gente |
| **V-09** (abierta) | `life/props.ts` | Pelota, palo, cubo, haz: se reparten, se cogen, se sueltan, se tiran y ruedan; física del descarte | Un trasto nunca en dos manos, nunca bajo el agua, 6 semillas. Pero 0–0,20 pases por persona contra 0,30 del descarte: jugar gana el concurso de utilidad el 6 % de las veces y el receptor no recoge. Está en `docs/next-plan.md` (V-09b) |
| **V-14** | `world/ridge.ts` | El cuenco, fuera del mapa | 0 celdas del valle tocadas; 32 % del bosque vive en el borde y habría desaparecido |
| **(arreglo)** | `life/offers.ts`, `decide.ts` | Las plazas del corro se comprueban al montar el sitio, y `decide` prueba la siguiente oferta si no hay camino | Sin nada que hacer, 33 % → **0 %**; andando, 26 % → **75 %**, que es la cifra del descarte |

El total en producción son **1 873 líneas** en once ficheros, con 60 pruebas
propias que corren en la suite rápida. El descarte son otras 1 715 en
`life/spike/`, que **V-12 borra** cuando V-07 y V-09 hayan portado de él lo que
falta.

### E.6 Por qué la demo en el juego es peor que el descarte

Lo primero que va a ver quien coja esto es que la aldea viva dentro del juego
parece rota al lado del descarte de V-00, y el dueño del diseño lo dijo así:
*«no tiene nada que ver; se quedan pillados, dando vueltas, no se chocan,
tienen como un imán entre ellos; no interactúan con los objetos»*. Tres de esas
cosas eran fallos con causa y están arregladas (E.7). La cuarta no es un fallo:
**es que faltan las fases.**

El descarte tiene *todo* en un fichero: cuerpos, charlas, empujones, palos,
pelota, coger, tirar, golpear. Se construyó para responder «¿se ve vivo?», y
respondió que sí. Luego se rehízo en serio, fase a fase: reloj, cuerpos,
navegación, impulsos, ofertas, elección. Eso es la fontanería. **Ninguna de las
cosas que hacían que el descarte pareciera vivo —las escenas y los trastos—
está en producción todavía**: son V-07 y V-09. Así que en el juego la gente
sólo puede andar de una puerta a otra y quedarse de pie, y eso, comparado con
gente que se para a hablar, se empuja y se pasa una pelota, es menos. Es
exactamente lo que se ve.

El error fue de método y conviene nombrarlo para no repetirlo: **se enseñó lo
vistoso, se construyó lo invisible, y se presentó como progreso.** Seis fases
sin volver a enseñar nada, y la primera demo tras ellas es una regresión desde
el asiento del que mira. La regla que sale de aquí: **cada fase que cambie lo
que se ve se enseña antes de cerrar la siguiente**, y una fase de fontanería no
se presenta sola.

Lo que además sigue abierto y no está resuelto:

**El reparto entre andar y hacer: contestado, y no como se creía.** Esta
sección decía que entre el 74 % y el 81 % de la jornada se iba en tránsito, que
cuatro ajustes no lo habían bajado y que por tanto «no es el número, es el
modelo». **Las dos mitades resultaron falsas**, y conviene dejarlo escrito
porque es la clase de error que se repite:

- **El 74–81 % era de una sola semilla.** Medido luego en ocho (`docs/
  life-rounds/sonda-linea-base.md`), la mediana era otra cosa. `CLAUDE.md` ya
  dice que un umbral no se fija con una semilla; un diagnóstico, tampoco.
- **Y para cuando se escribió, la cifra ya se había dado la vuelta por un
  fallo.** El arreglo del imán de V-06 repartió las plazas de cada oferta en
  corro sin comprobar el suelo, así que muchas caían en una pared o en el río:
  `decide` pedía ruta, no había, y devolvía nada sin probar otra oferta. La
  aldea pasó de andar demasiado a **quedarse clavada** entre el 24 % y el 33 %
  del día. Se estaba discutiendo el reparto de una aldea que estaba rota.

Con las plazas comprobadas al montarlas (`seatsOn`, `offers.ts`) y `decide`
probando la siguiente oferta cuando no hay camino, la producción **iguala al
descarte**: 75 % del día andando contra su 74–76 %, y 0 % sin nada que hacer.

Así que la hipótesis de esta sección se sostiene entera: **no hay que bajar el
andar**. Andar es lo que hace el descarte que gustó. Lo que falta es lo otro
que hace, y ahí sí queda distancia medida:

| Por persona y jornada | Producción | Descarte |
|---|---|---|
| Tiempo en escena | 12 % | 24–26 % |
| Charlas de verdad | 0,84 | 1,99 |
| Rechazos | 2,48 | no existen |
| Pases de pelota y golpes | — (V-09) | 0,56 |

**Tres de cada cuatro encuentros acaban en un rechazo**, que es lo que V-07
introdujo para que un «no» dejara rastro, y a esta proporción la aldea se lee
como un sitio donde todo el mundo desaira a todo el mundo. Eso y los trastos
que faltan (V-09) son la diferencia que queda con el descarte, y son cosas
concretas, no «el modelo».

**«No se desplazan como en la demo»: la mitad técnica, descartada.** V-07 midió
`castOf` sobre una jornada entera de ochenta personas —3 290 tramos de camino— y
el mayor desajuste entre lo que el clip de andar debería avanzar y lo que avanza
es de orden 10⁻¹⁴ segundos: coma flotante, no un fallo. La prueba queda en
`life-scenes.test.ts`. La otra mitad —percepción— sólo se contesta mirando, y a
eso se añade desde U-01 una cosa medida que no es percepción: en el encuadre de
reposo **una persona ocupa seis píxeles**, así que juzgar una charla o un encaro
a esa escala no es posible. Quien enseñe la demo, que se acerque.

### E.7 Trampas ya pagadas

Cada una costó entre una vuelta y una tarde, y **todas se encontraron
midiendo, ninguna leyendo el código**. Están aquí para que no se paguen dos
veces. Cuando un agente crea que está viendo un fallo nuevo, que mire primero
si es uno de éstos.

**Del terreno y la navegación**

- **El río parte el valle y eso es el valle.** `ford()` no es un puente:
  devuelve tierra junto al agua. El `stepCost` del motor da `null` para agua.
  Ninguna celda de agua lleva camino en ninguna semilla. Sólo el **37 %** del
  suelo libre está conectado con el centro. Lo que hace falta no es abrir el
  agua —se probó y fue peor— sino `reachableFrom` y no mandar a nadie a la
  otra orilla. Quien piense «falta el vado» está a punto de perder una tarde.
- **El A\* del motor no sirve para la gente.** Navega el terreno para §7.6 y no
  sabe que hay edificios. La capa tiene el suyo sobre la máscara. Lo único que
  se le copia es que todo coste es entero.
- **La máscara del terreno vive en un sitio.** `terrainOf(state)` en
  `terrain.ts`. Se copió tres veces en pruebas antes de tener casa y cada copia
  perdía un detalle. No se vuelve a copiar.
- **Una diagonal no corta una esquina.** Sin la comprobación de las dos celdas
  adyacentes, la ruta pasa por el vértice donde se tocan dos paredes y en
  pantalla se lee como atravesar la casa.

**De los cuerpos**

- **La rejilla se rehace dentro de `resolve`**, no se hereda del principio del
  paso: entre medias los cuerpos se han movido y una rejilla caducada esconde a
  los vecinos que acaban de acercarse. Medido: dos cuerpos a 0,295 celdas con
  radios de 0,32.
- **La corrección de solapes lleva tope** (`FIX_CAP = 0,06`). Sin él, en una
  plaza llena un cuerpo recibe empujón de cinco vecinos en la misma pasada y se
  va de golpe: 0,26 celdas por paso con ochenta, 1,06 con doscientos. Es el
  teletransporte de siempre por la puerta de atrás, y sólo aparece con
  multitud. Lo que no cabe corregir hoy se corrige mañana.
- **Quien trastabilla también choca.** El primer empujón integraba velocidad
  sin mirar paredes y metía al empujado dentro de una casa.
- **Separar no puede meter a nadie en una pared.** Quien no tiene sitio se
  queda y el otro carga con todo el apartarse.
- **Se cede el paso por un lado, y sólo a quien viene de frente.** Dos que se
  cruzan se empujan en línea recta, la fuerza es simétrica y ninguno gana. Con
  un componente lateral al que viene de frente (producto escalar de la
  velocidad con la separación > 0), forcejeos de 1 003 a 369 en una jornada.
- **El margen de pared es 0,62** (`WALL_CLEAR`). Con 0,45 se pegaban tanto que
  acababan cruzando la esquina de una casa.

**De las ofertas y la elección**

- **Las ofertas se ponen donde un cuerpo puede estar.** A 0,6 de la fachada
  eran inalcanzables porque `avoid` mantiene a la gente a `radio + 0,62`.
  Nadie llegaba nunca. Ahora a `0,32 + WALL_CLEAR + 0,25`.
- **Se llega al alcance (`reach`), no al punto.** En sitios apretados entre
  casas el punto exacto no se puede pisar.
- **La plaza se reserva al decidir, no al llegar.** El aforo se contaba una vez
  al empezar el paso, así que los veinte que decidían en ese instante veían el
  mismo pozo libre y se iban los veinte. Es *el imán*. Setenta y cinco excesos
  de aforo por jornada, ahora cero.
- **Cada plaza tiene su sitio** (`seatAt`, en corro con el ángulo de oro). Una
  oferta de cuatro plazas con un solo punto es cuatro personas empujándose en
  el mismo palmo de suelo.
- **No se replantea uno la vida de camino.** Con `RETHINK = 45` pasos, la gente
  cambiaba de destino antes de llegar. Se replantea al llegar, al terminar, o
  si el viaje se ha hecho eterno (`GIVE_UP = 600`).
- **El deber no puede correr más que los demás.** Con `duty` a 1/60 era el
  impulso más rápido, ganaba siempre, y la aldea entera se iba a los campos. Un
  impulso que siempre gana es una orden.
- **Todos en la misma orilla.** El corazón del valle es el sitio con más
  vecinos a mano, no el primero de la lista, y sólo cuentan los sitios de esa
  orilla. Alguien dejado en la otra anda para siempre sin llegar.

**Del reloj**

- **`Math.max(0, NaN)` es `NaN`.** Un delta inválido envenenaba el acumulador y
  el reloj se quedaba parado para siempre. Se descarta antes de sumar. La
  prueba comprueba que el reloj sigue vivo *después* del dato malo, que es lo
  que ninguna prueba miraba.
- **El estado de la jornada se releva una vez, al anochecer.** La primera
  versión relevaba también al cambiar el número de día, que ocurre al amanecer
  a la vista de todos. Y **congela el mapa**: el motor tala y desgasta caminos
  escribiendo en los mismos arrays.

**Del método**

- **Un umbral sobre una muestra es ruido.** `CLAUDE.md` lo dice para las
  semillas y vale igual para el tiempo: una prueba que mire una ventana de
  veinte semanas o un solo rebaño acusa al motor de lo que es suerte del
  escenario. Seis pruebas cayeron a la vez por esto en v3.61 y ninguna por un
  fallo del código.
- **Medir antes de tocar.** Cuatro diagnósticos equivocados seguidos en V-03
  («se atascan», «falta el vado», «es congestión», «es el radio de búsqueda»)
  y los cuatro se habrían evitado con la sonda que se acabó escribiendo al
  final. Se escribe la sonda primero.
- **Un fotograma atragantado tira, no arrastra.** Ver E.3.3.

### E.8 Briefs por módulo

Los ficheros indicados son el alcance autorizado. Todos entregan informe en
`docs/life-rounds/V-XX.md` con lo medido, y **todos los que cambien lo que se
ve entregan además la demo publicada** antes de cerrar (regla de E.6). Cada
brief lista lo que existe para reutilizar y lo que no se debe reinventar.

Convenciones comunes a todos: código en `src/render3d/life/`, pruebas en
`tests/fast/life-*.test.ts`, constantes de la capa en el propio módulo con
`// TUNE:` (no en `engine/balance.ts`: esto es presentación y no toca una cifra
de la simulación, igual que `SCENIC_DAY_SECONDS` vive en
`presentation-clock.ts`). El motor no se toca en ninguna fase; si hace falta
algo de él, se lee.

---

#### V-07 · Escenas de dos

**Objetivo.** Que dos personas que se cruzan puedan pararse a hablar,
encararse, empujarse o pelear, con papeles distintos para cada una. Es el
corazón del encargo y **lo que hace que el tránsito se lea como vida y no como
hormigas** (E.6).
**Depende de.** V-06. **Lectura:** E.4, E.6, E.7 y `life/spike/life.ts` entero,
que ya tiene esto funcionando y medido.
**Ficheros.** Nuevo `life/scenes.ts`; toca `life/village.ts` (el enganche en
`step`) y `life/cast.ts` (para que `talking` y el clip salgan de la escena).
**Lo que existe y se porta, no se reinventa:** en `spike/life.ts`, el bloque
`bout`/`role`/`talkingTo`/`shoveAt`/`reelUntil`/`paidBack`, las constantes
`CHAT_GAP = 0,95`, `SHOVE_GAP = 0,72`, `WIND_UP = 0,7`, `BOUT = 3,4`,
`SHOVE_PUSH = 2,8`, `REEL = 0,75`, `HOT_ENOUGH = 0,62`, `SHOVE_ODDS = 0,22`, y
la decisión de encuentro con umbral (no proporcional). Están medidos: aldeas
de paz con cero empujones y aldeas de bronca con siete u ocho, según quién
vive en ellas, y hablar siempre por encima de pegar.
**Contrato.**
```ts
export type SceneKind = 'chat' | 'shove' | 'brawl';
export interface Scene {
  readonly kind: SceneKind;
  readonly a: number; readonly b: number;      // ids de cuerpo
  roleA: 'gives' | 'takes' | 'peer';
  roleB: 'gives' | 'takes' | 'peer';
  readonly since: number;                     // paso
  until: number;
  beat: number;                               // en qué compás va la escena
}
/** Si estos dos, al cruzarse, tienen algo. Determinista con `seed` y `step`. */
export function propose(a: Dweller, b: Dweller, opinion: number,
  seed: number, step: number): Scene | null;
/** Un paso de la escena: coloca, empuja, hace trastabillar, termina. */
export function play(scene: Scene, a: Dweller, b: Dweller, step: number): void;
/** Si la escena sigue en pie: nadie se ha muerto, nadie se ha ido. */
export function alive(scene: Scene, dwellers: readonly Dweller[]): boolean;
```
**Reglas.** Uno propone y el otro **acepta o rechaza** según carácter, opinión
(`opinionOf` del motor, sólo lectura) e impulsos: un rechazo también es una
escena (apartar la vista y seguir). Mientras dura, los dos cuerpos quedan bajo
la misma escena con papeles distintos. El empujón **da velocidad, no
posición**: lo integra el mismo `integrate` que todo lo demás, y por eso se ve
como un trastabilleo y no como un salto (prueba de saltos en pie: `< 0,12`
por paso). Se devuelve una vez, no se monta una trifulca; si esto llegara a
más, en el juego lo dirá el motor (V-11). Ninguna escena conoce a nadie por
nombre: propone por rasgos y opinión.
**Trampas de esta fase** (E.7 aplica entero, y además): los que hablan **se
colocan**, no se congelan — la primera versión del descarte los dejaba quietos
donde les pillara y quedaban metidos el uno en el otro. Y comprobar lo primero
lo de E.6: que `castOf` alimente el clip de andar (`travelled` continuo, `clip
= 'walk'`), con prueba.
**Tests exigidos.** Nadie queda atrapado en una escena que no termina; una
escena rota a medias (uno muere o se va) deja al otro libre y en pie; dos que
se detestan rechazan más que dos que se aprecian, medido; las escenas por
jornada caen en una banda (ni cero ni guirigay) en seis semillas; hay aldeas
sin un empujón en todo el día y aldeas con varios; hablar sigue siendo lo
corriente; el paso máximo no pasa de 0,12.
**Terminado cuando.** Se mira una jornada entera en el juego —modelos reales,
detrás de la bandera— y se ven encuentros que nadie escribió. **Y se enseña
antes de empezar V-09.**

---

#### V-08 · Los animales, iguales que la gente

**Objetivo.** Que un perro sea un agente con otros impulsos, y entonces se le
pueda acariciar. Y que nadie vuelva a salir del agua de un brinco.
**Depende de.** V-07. **Lectura:** E.4, §7.7, §10.6, `effects/fauna.ts` y
`render/animals.ts`.
**Ficheros.** Nuevo `life/beasts.ts`; adelgaza `render3d/effects/fauna.ts` a
pintar instancias; toca `life/village.ts` y `life/offers.ts` (un animal ofrece
`pet`).
**Contrato.** Los animales pasan a ser `Dweller` con `traits: []` y una tabla de
impulsos propia (`BEAST_RISE`): la gallina picotea, el cerdo hoza, la vaca
pasta, el perro busca gente. Cada uno es una `Place` móvil con una oferta
(`pet`, `chase`, `feed`) y aforo uno.
**Reglas.** La cuenta por clase sale del estado congelado (`state.herd`), no del
tick vivo (D.6.7). Un cuerpo que colisiona con el agua **no se mete** en ella,
así que `ashore` desaparece con su brinco de 1,08 celdas. Los cuervos y los
peces siguen en `fauna.ts` como lo que son: decorado que no elige.
**Tests exigidos.** Ningún animal de tierra pisa el agua en una jornada, seis
semillas; la cuenta por clase coincide con la cabaña del estado; existe al
menos una escena persona–animal y ocurre; el rebaño no salta (la prueba de
G-10 sigue en pie con el umbral de 0,06 restaurado, y se borra la nota del 1,1).
**Terminado cuando.** Un niño acariciando un perro, visto en pantalla sin que
nadie lo guionizara.

---

#### V-09 · Trastos

**Objetivo.** La pelota, el cubo, la jarra, el haz de leña. Cosas que se cogen,
se sueltan, se tiran y ruedan. La tercera clase de cosa del valle.
**Depende de.** V-07. **Lectura:** E.4, `spike/life.ts` (bloque `Prop`, `fling`,
`loose`, la física de los pasos 7b), D.4 para los GLB.
**Ficheros.** Nuevo `life/props.ts`; toca `life/offers.ts` (un trasto en el
suelo es una `Place` con oferta `play`/`carry`), `life/village.ts`,
`life/cast.ts` (qué lleva cada uno en la mano); recursos nuevos por la vía de
producción de D.4.
**Lo que existe y se porta:** en `spike/life.ts`, `Prop`, `GRAVITY = 14`,
`ROLL_DRAG = 1,6`, `PICKUP = 0,75`, `FETCH = 7`, `THROW = 5,2`, `LOFT = 3,4`,
`PLAYED_OUT = [11, 26]` (el descanso tras jugar, sin el cual salían 58 pases
por jornada). Y las tres lecciones: la pelota se **va a buscar** cuando se ve,
no sólo se coge al pisarla; el que la lleva se encara a quien se la va a
tirar; y nadie hereda la pelota del martes.
**Contrato.**
```ts
export interface Prop {
  readonly id: number; readonly kind: 'ball' | 'stick' | 'bucket' | 'bundle';
  x: number; z: number; y: number; vx: number; vz: number; vy: number;
  held: number | null; restUntil: number;
}
export function scatter(state: GameState, land: Terrain, seed: number): Prop[];
export function settle(props: Prop[], land: Terrain, seconds: number): void; // física
export function take(prop: Prop, by: Dweller): boolean;
export function drop(prop: Prop, by: Dweller, land: Terrain): void;
export function fling(prop: Prop, from: Dweller, at: Point, force: number, loft: number): void;
```
**Reglas.** Efímeros como todo lo de la capa: se reparten al amanecer con la
semilla del día y desaparecen al acabar. Un trasto no está en dos manos. Soltar
lo deja en suelo pisable, nunca en pared ni en río. Quien muere, entra en casa
o empieza una escena suelta lo que llevaba.
**Tests exigidos.** Un trasto no está en dos manos a la vez; soltar lo deja en
suelo pisable; quien se va o entra en casa suelta lo que llevaba; se juega
(pases > 0) y no se come la jornada (pases < 30 por persona); una pelota que
cae al río acaba en la orilla o se pierde, nunca rueda por debajo del agua.
**Terminado cuando.** Dos críos pasándose una pelota un rato largo, en el
juego, sin que se quede pegada ni se pierda.

---

#### V-10 · Sitios con vida

**Objetivo.** La plaza, el pozo, la era, el vado, la taberna. Donde la aldea se
junta sin que nadie la convoque, y a su hora.
**Depende de.** V-06. Puede ir en paralelo con V-07/V-09. **Lectura:** E.4,
§7.2, `life/offers.ts`.
**Ficheros.** Toca `life/offers.ts` (hora punta por oferta) y nuevo
`life/places.ts` (sitios que no son un edificio: la plaza como celdas libres
rodeadas de casas, la orilla del vado, el claro del bosque).
**Contrato.**
```ts
export interface Place { /* + */ readonly hours?: readonly [number, number]; } // fase de la jornada
export function commons(state: GameState, land: Terrain): Place[]; // plaza, vado, claro
```
**Reglas.** Cada sitio tiene su hora: el pozo por la mañana, la era al
mediodía, la plaza al caer la tarde. Fuera de su hora una oferta vale menos, no
cero. Eso da forma a la jornada sin guionizar a nadie: la gente va porque le
apetece y coincide porque a muchos les apetece a la vez. Si la taberna no existe
como edificio, es motor y va aparte; mientras, la plaza hace de taberna.
**Tests exigidos.** Ningún sitio se pasa de aforo; la aldea se reparte (nadie
va todo el mundo al mismo sitio a la misma hora); cada sitio recibe visita en
una jornada, seis semillas; la plaza se detecta en las seis y está en suelo
libre.
**Terminado cuando.** Una jornada donde se ve a la aldea juntarse y dispersarse
sola, tres veces y en tres sitios.

---

#### V-11 · Lo que el motor manda

**Objetivo.** Que una riña de §7.9 se escenifique de verdad, y que una reunión
de §11.8 reúna. La dirección del dato es de una sola mano: el motor manda, la
vida obedece.
**Depende de.** V-07, V-10. **Lectura:** E.2 (la consecuencia aceptada), §7.9,
§11.8, `render/gatherings.ts` (o donde viva `gatheringsAt`), `engine/sim.ts`
(la crónica de `quarrel.*`).
**Ficheros.** Nuevo `life/staging.ts`; toca `life/village.ts`.
**Contrato.**
```ts
export type Order =
  | { kind: 'quarrel'; a: VillagerId; b: VillagerId; blows: boolean }
  | { kind: 'gather'; at: Point; days: number }
  | { kind: 'mourn'; who: VillagerId };
export function ordersOf(state: GameState, since: number): Order[]; // del estado congelado
export function stage(order: Order, life: Village, seed: number): void;
```
**Reglas.** Órdenes que bajan, nunca suben. Una riña que el motor decidió se
convierte en una escena `brawl` con sus papeles y su sitio, a la hora que la
vida decida dentro de la jornada. Una reunión es una `Place` temporal con aforo
alto y hora fija. Nadie de `life/` importa de `engine/` salvo tipos y funciones
de lectura; hay una prueba en `module-graph.test.ts` que lo vigila.
**Tests exigidos.** Toda riña de la crónica de la jornada se ve como escena;
toda reunión del catálogo junta gente donde dice §11.8; la prueba de grafo pasa;
las señales visibles de §11.8 que ya existían siguen viéndose.
**Terminado cuando.** Las señales de §11.8 se ven igual que antes, y las riñas
además.

---

#### V-12 · Retirada — **cerrada (15 sep 2026)**

**Objetivo.** Borrar la capa vieja y el descarte. La fase más agradecida.
**Se cerró antes que V-11 y a propósito**, contra el orden de E.9: la auditoría
midió que el camino viejo **ya no se ejecutaba** desde G-12, así que no era una
capa de repuesto sino código muerto que además tenía treinta pruebas verdes
vigilándolo. Borrarlo no quitó nada al juego; lo que hizo fue dejar a la vista
lo que el juego había perdido sin decirlo.

**Qué se fue, 6 011 líneas:** `actors/index.ts` (1 337, la función que evaluaba
una curva del reloj), `actors/day.ts`, `life/spike/` entero (1 715, el descarte
de V-00), sus dos bancos, la sonda que los comparaba, y las herramientas del
piloto que se quedaron sin piloto al que servir.

**Qué se conservó, porque `Cast` lo necesita:** los cuatro clips, que pasan a
`render3d/clips.ts`; y el contrato de figura —`Actor` y `Activity`—, que pasa a
`contracts.ts`, donde vive la frontera entre la capa 2 y la capa 3. `MAX_ACTORS`
**no** se conservó: protegía un presupuesto de ochenta figuras que la capa de
vida no aplica, y un número que no recorta nada es un número que miente.
`scenic-state.ts` se queda, que la vida lee de él.

**Lo que dejó al descubierto, y es de V-11:** las reuniones de §11.8. Ver E.0.

**La lección, que no es sobre borrar:** una prueba que llama a una función
directamente no sabe si el juego la llama. Treinta pruebas verdes guardaban el
camino muerto mientras el vivo no tenía ninguna. **Cuando un camino se vuelve
opcional, sus pruebas hay que mudarlas al camino vivo el mismo día**, no cuando
se borre el viejo.

---

#### V-13 · Que corra en el móvil

**Objetivo.** Transversal, se mide desde V-02 y se cierra aquí.
**Presupuesto.** Ochenta agentes y treinta trastos a 60 fps en el móvil de
referencia de D.9. Reconstruir una jornada entera por debajo de 120 ms (hoy 8
ms sin escenas ni trastos). El paso de vida por debajo de 1 000 µs con todo
(hoy 236 sin escenas).
**Ficheros.** `tools/graphics/bench-life.ts` (retirado en V-12) y una prueba en
`life-*.test.ts` que falle si el coste por cuerpo deja de ser plano.
**Terminado cuando.** Medido en el móvil de verdad, no en el portátil, y
escrito en `docs/life-rounds/V-13.md`.

---

#### V-15 · El valle grande

**Aparcada a propósito, con el coste medido para cuando toque.** A los cien
años la aldea entera cabe en 23×21 de un mapa de 36×56 y ocupa el 11,7 % del
suelo. Agrandarlo hoy da prado vacío y obliga a recalibrar un balance que ya
falla diez pruebas. Primero lo que llena el mapa; el mapa crece cuando se le
quede pequeño. Crecer son dos constantes (`WORLD.WIDTH/HEIGHT`) y un tipo
literal (`width: 36` en `state.ts`). Una ruta que cruza el valle cuesta 0,09
ms; con un mapa nueve veces mayor, ~1 ms, y con cincuenta rutas por tick, 50 ms
contra los 234 de un tick a ×64. `MAX_FIELDS` y `MAX_HOUSES` son topes absolutos
y no escalan.

#### V-16 · La comarca

**Aparcada, y va con V-15.** Relieve de verdad dentro del mapa. Es una ronda de
motor: capa `relief` en `ValleyMap` (sube `SCHEMA_VERSION` a 4, rompe
partidas), `mapgen` casi entero, A\* con coste de subida, `placement` sin
ladera, diez módulos del motor que leen el terreno, dieciséis del render,
veintitrés pruebas, y una pasada completa de balance. No antes que la capa de
vida: el relieve obliga a repasar cómo anda la gente, y hacerlo antes es
escribir el andar dos veces. **El valle real es plano** hoy (0,23 celdas de
desnivel en todo el mapa) y el cuenco de V-14 es una silueta fuera del mapa que
el motor no conoce.

### E.9 Dependencias, paralelismo y próximo paso

```text
V-00 → V-01 → V-02 → V-03 → V-04 ─┐
                       └→ V-05 ─┤→ V-06 ─→ V-07 ─→ V-08 ─┐
                                          │           ├→ V-11 → V-12
                                          ├→ V-09 ────┤
                                          └→ V-10 ────┘
V-14 ✓ (independiente)          V-13 transversal desde V-02
V-15 ═ V-16 (juntas, después de V-12)
```

**Estado:** V-00 a V-07, V-10 y V-14 cerradas. La demo se ha vuelto a enseñar
en el juego (build jugable, no capturas), y el reparto entre andar y hacer
(E.6) está pendiente del veredicto de quien la mira: la regla de «cuándo
parar» de abajo sigue en pie hasta entonces. **En marcha: V-08.** V-09 va por
el camino crítico y no arranca hasta que ese veredicto llegue.

**Reparto sugerido con varios agentes:**

| Carril | Fases | Notas |
|---|---|---|
| A · el camino crítico | V-07 ✓ → V-09 → V-11 → V-12 | La mano con más contexto; porta del descarte |
| B · los sitios | V-10 ✓ → V-08 | No toca `scenes.ts` |
| C · la medida | V-13 ✓, y sigue si hace falta | Sólo mide; no cambia comportamiento |

**Cuándo parar:** tras V-07, si con escenas el valle sigue leyéndose como
hormigas, el problema es el modelo de ofertas y se para a rediseñar con el
dueño del diseño delante, no a mover constantes. En cualquier punto, si no
cabe en el móvil.

### E.10 Registro de esta revisión

v3.64 escribe este anexo. Hasta aquí el plan vivía en una página publicada
fuera del repositorio, y un agente que llegara al código no podía encontrarlo.
Se ratifican las tres capas, los seis innegociables y el mecanismo de ofertas.
Se registran V-00 a V-06 y V-14 como hechas con sus medidas, y se escribe E.6
—por qué la demo en el juego es hoy peor que el descarte— como la primera cosa
que hay que leer, porque es la primera cosa que se va a ver. Se añade la regla
séptima de método (no ajustar a ciegas más de dos veces) y la regla de E.6
(cada fase que cambie lo que se ve, se enseña antes de cerrar la siguiente),
las dos aprendidas en esta misma ronda. Informes: `docs/life-rounds/V-00.md` a
`V-06.md`.

---

*Fin del documento. Toda modificación a este fichero exige actualizar la tabla
de decisiones de §1 y avisar a los módulos afectados.*
