// M-02 · Every number in the game. design.md §12, plus the building table of
// §7.2 — the one declared exception, transcribed here as BUILDINGS.
//
// Data and nothing else: no logic, no functions, no imports. This file is a
// leaf of the dependency graph so that anything may read it.
//
// A constant a module needs and that is in neither §12 nor §7.2 is added here
// marked `// TUNE:` and mentioned in the PR.

// ---------------------------------------------------------------------------
// §12.1 · Time
// ---------------------------------------------------------------------------

export const TIME = {
  WEEKS_PER_SEASON: 12,
  WEEKS_PER_YEAR: 48,
  HARVEST_WEEK: 35,
  GENERATION_YEARS: 20,
  // TUNE: **una semana son siete jornadas de sol** (v3.72, y lo pidió el dueño
  // del diseño: «debe ser real el paso del tiempo, como si fuese la vida
  // real»). De ahí sale este número y no de un gusto:
  //
  //     REAL_MS_PER_TICK = DAYS_PER_WEEK · SCENIC_DAY_SECONDS · 1000
  //                      = 7 · 120 s = 840 s
  //
  // Hasta aquí eran 15 s, y con la jornada de sol en 120 s eso hacía **ocho
  // semanas por amanecer**: el calendario corría por delante del sol y el
  // reloj de la cabecera no podía decir una hora sin mentir. La identidad de
  // arriba la vigila una prueba (`tests/fast/clock.test.ts`), porque romperla
  // es volver a la incoherencia sin que nada falle.
  //
  // **El coste, escrito.** A ×1 una semana son catorce minutos y un año once
  // horas: a esa velocidad el juego es una jornada de la aldea, no su
  // historia. Lo que antes pasaba a ×1 pasa ahora a ×64 (un año en diez
  // minutos y medio), y lo que pasa mientras el juego está cerrado lo paga el
  // letargo, que llega hasta una generación entera. Es deliberado: §1 dice que
  // esto es un idle para mirar de fondo.
  //
  // **Los dos diales, si hay que acelerar.** `SCENIC_DAY_SECONDS` (120 → 60 es
  // el suelo medido en D.6.1: por debajo la luz parpadea y la gente esprinta) y
  // `DAYS_PER_WEEK` (7 → 3 deja de parecerse a una semana). Cambiar cualquiera
  // obliga a cambiar este número con él, o la identidad se rompe.
  REAL_MS_PER_TICK: 840_000,
  // TUNE: cuántas jornadas de sol tiene una semana del motor (v3.72). Siete,
  // porque una semana tiene siete días y el reloj de §11.2 se lee como el de
  // la vida real. El motor no sabe que existen: es el reparto del tiempo de
  // presentación, y vive aquí porque `derive/clock.ts` y la jornada escénica
  // tienen que estar de acuerdo en él.
  DAYS_PER_WEEK: 7,
  // TUNE: en qué punto de la jornada abre el valle, de 0 (alba) a 1 (alba
  // siguiente). 0,28 es media mañana, cuando la aldea está entera en la calle:
  // abrir el juego a oscuras, con todo el mundo dentro de casa, es la peor
  // primera impresión posible de un sitio que se vende por estar vivo (v3.34).
  // Vivía en `presentation-clock.ts`; desde v3.72 el reloj de la cabecera
  // cuenta las horas desde el mismo origen que el sol, así que hay una sola.
  DAY_START_PHASE: 0.28,
  // §12.1. Geometric, each one four times the last. 64x exists to make the
  // pace question of §16.2 testable in a sitting: a year in ten minutes and a
  // half instead of eleven hours (v2.85, remedido en v3.72).
  SPEEDS: [0, 1, 4, 16, 64],
  // **Una generación, y esa identidad es la decisión** (§4.1, y hay prueba en
  // `tests/fast/balance.test.ts`): volver tras la ausencia máxima es volver una
  // generación después. Son 960 ticks, los mismos que antes de v3.72 —el caso
  // de esfuerzo de §11.4, «960 ticks en dos segundos», sigue midiendo lo
  // mismo—; lo que cambió es lo que duran en la pared: nueve días y medio a ×1
  // en vez de cuatro horas. Escrito como el producto para que no se pueda
  // cambiar el tick y dejar esto atrás.
  LETHARGY_CAP_MS: 20 * 48 * 840_000,
  LETHARGY_BATCH: 64, // §13.2: ticks per requestAnimationFrame while catching up
  // TUNE: how long a notable event stays legible over the valley (§11.6,
  // v2.84). Long enough to read one sentence, short enough that a village at
  // 16x does not queue a backlog. Real time on purpose and cut hard, never
  // faded: §11.4 forbids an interface animation that a clock jump can catch
  // half-way.
  NOTICE_MS: 5_000,
  // TUNE: how long a milestone holds the screen (§11.6, U-02). Longer than a
  // notice because it is rarer and worth reading twice — the first stone house,
  // the wall closed, a hundred years of the valley — and short enough that it
  // never becomes something to dismiss. Real time and cut hard, like the
  // notice, for the same reason: §11.4 forbids an interface animation a clock
  // jump can catch half-way.
  MOMENT_MS: 7_000,
  // TUNE: how long the vitals strip's "bump" lasts when a figure changes
  // (§11.1.1, U-06). Real time and cut hard like NOTICE_MS and MOMENT_MS, for
  // the same reason: §11.4 forbids an interface animation a clock jump can
  // catch half-way. Short enough to read as a pulse, not a fade.
  VITAL_BUMP_MS: 150,
  // TUNE: U-11, el inicio guiado. Cuánto tarda la cámara en bajar desde la
  // sierra hasta la aldea al fundar un valle —«la aldea al principio debe
  // verse desde lo alto, así impresiona más ver lo grande que es el mapa»,
  // dueño del diseño, 15 sep 2026— y cuánto espera la primera pista después.
  INTRO_FLIGHT_MS: 9000,
  INTRO_HINT_AFTER_MS: 800,
  // §13.1. Uno, desde v3.72: con la semana en catorce minutos, veinte ticks
  // son cuatro horas y media de juego, y un cierre que no pase por `pagehide`
  // —un navegador que mata la pestaña— se llevaría la tarde entera.
  SAVE_EVERY_TICKS: 1,
} as const;

// ---------------------------------------------------------------------------
// §12.2 · The founding
// ---------------------------------------------------------------------------

export const FOUNDING = {
  // **Una pareja, desde el 15 sep 2026.** Lo decidió el dueño del diseño: «la
  // aldea debe comenzar con una sola pareja, un hombre y una mujer». Hasta
  // aquí eran veinte —seis con nombre y catorce sin él— y todo el primer
  // decenio del motor estaba calibrado para veinte: cuatro casas, dos campos,
  // encrucijadas que piden diez habitantes. Con dos, **la aldea crece con los
  // que llegan**: ver `MIGRATION.ARRIVE_SMALL_BELOW`. Los números de §12.2 que
  // dependían de veinte se han recontado para dos, y cada uno dice cómo.
  POPULATION: 2,
  ADULTS: 2,
  CHILDREN: 0,
  ELDERS: 0,
  // Un año de comida para dos (2 × 48 = 96) y la mitad de otro de margen: la
  // primera cosecha llega en la semana 35 y un campo de dos manos da 600.
  // Antes eran 800 —exactamente `BASE_STORAGE`, para no nacer pudriéndose—; con
  // dos personas 800 serían ocho años de despensa y ninguna razón para sembrar.
  GRAIN: 150,
  // Leña para el primer invierno de dos (0,4 × 2 × 12 = 10) y una casa más (60)
  // para cuando lleguen los primeros, que no tienen dónde dormir.
  WOOD: 100,
  MORALE: 55,
  FAITH: 50,
  HOUSES: 1,
  FIELDS: 1,
  // TUNE: §12.2 said nothing about animals. Lo que dos pueden traer consigo:
  // unas gallinas. La vaca la traerá quien venga.
  HERD: { hens: 3, pigs: 0, cows: 0 },
  // TUNE: una pareja joven. Inclusive, en años.
  AGE_RANGES: { adults: [18, 30], children: [1, 13], elders: [60, 70] },
  // TUNE: a founding that cannot reproduce is not interesting variance, it is
  // a game dead on arrival — and it is the first thing the player sees. The
  // draw is corrected upwards until this many adult women fall inside
  // LIFE.FERTILE **y hay al menos `MIN_MEN` hombres**: con dos personas, «dos
  // mujeres» salía una de cada cuatro veces.
  MIN_FERTILE_WOMEN: 1,
  MIN_MEN: 1,
} as const;

// ---------------------------------------------------------------------------
// §12.3 · Subsistence
// ---------------------------------------------------------------------------

export const FOOD = {
  GRAIN_PER_PERSON: 1.0, // per week
  FIELD_YIELD: 600, // per field, full harvest
  FIELD_CREW: 4, // adults to work a whole field
  MIN_FIELD_CREW: 2, // below this a field yields nothing at all (§5.2, v2.14)
  MAX_FIELDS: 8,
  BASE_STORAGE: 800,
  GRANARY_CAPACITY: 650,
  MAX_GRANARIES: 3,
  SPOILAGE: 0.08, // weekly, on the surplus
  STARVATION_RATE: 0.025, // deaths/week as a fraction, by severity
  MILL_BONUS: 1.15,
  // TUNE: §5.2 writes neededFields inline as people · 48 · 1.3 / FIELD_YIELD.
  // The 1.3 is the margin the village sows above what it eats.
  NEEDED_FIELDS_MARGIN: 1.3,
  // TUNE: the harvest's morale factor, written inline in §5.3 as
  // (0.8 + 0.4 · morale/100). Runs 0.80 at despair to 1.20 at elation.
  HARVEST_MORALE_BASE: 0.8,
  HARVEST_MORALE_SPAN: 0.4,
  // TUNE: §5.3 orders the starving "over 60 first, then under 5". Strictly
  // over and strictly under, as written — note these are not §5.8's bands.
  STARVE_ELDER_OVER: 60,
  STARVE_CHILD_UNDER: 5,
} as const;

export const LABOUR = {
  WOOD_PER_CUTTER: 3.0, // per week
  BP_PER_BUILDER: 2.0, // build points per week
  WORKS_RESERVE: 0.15, // minimum fraction of W given to works
  CUTTER_SHARE: 0.4, // of what is left after the fields
  /**
   * La postura con la que arranca una aldea, y es la del juego de antes.
   *
   * `fields: 1` son «los campos que la población necesita» y `timber:
   * CUTTER_SHARE` es el reparto fijo que la fórmula hacía sola. No es timidez:
   * es lo que permite comprobar que meter las palancas no ha movido el balance
   * —la suite tiene que dar lo mismo con esta postura— y por tanto lo que hace
   * medible cualquier otra. Ver `docs/plan-juego.md`, decisión D-6.
   */
  RESTING_FIELDS: 1,
  RESTING_TIMBER: 0.4, // el mismo valor que CUTTER_SHARE, y por eso está al lado
  /**
   * TUNE (§7.6, v3.07): cuántas celdas de bosque se consideran como destino.
   *
   * Se tala cerca del pueblo, no en el confín del valle, así que mirar las
   * quinientas celdas arboladas para cada leñador era además de caro, falso.
   * Desde v3.03 el invierno manda al bosque a la aldea entera y el coste se
   * disparó: el banco de §12.9 pasó de once minutos a cuarenta y tres.
   */
  WOOD_CHOICES: 48,
  SMITHY_BONUS: 1.2,
  WINTER_WOOD: 0.4, // per person and week
  COLD_HOUSES_WOOD_MULTIPLIER: 1.5,
  COLD_MORTALITY: 1.4,
  // TUNE: §5.2 writes the workforce formula inline and §12 keeps none of it.
  // W = (adults 15-59) · 1.0 + (12-14 and 60-69) · 0.5
  HALF_WORKER_YOUNG: [12, 14],
  HALF_WORKER_OLD: [60, 69],
  HALF_WORKER_SHARE: 0.5,
} as const;

/** Factor and probability. The probabilities add up to 1. */
export const WEATHER = [
  { f: 0.6, p: 0.15 }, // ruinous
  { f: 0.8, p: 0.2 }, // lean
  { f: 1.0, p: 0.4 }, // fair
  { f: 1.2, p: 0.15 }, // good
  { f: 1.45, p: 0.1 }, // abundant
] as const;

/**
 * §10.8 · El cielo de cada jornada (U-13, v3.73).
 *
 * Lo pidió el dueño del diseño: «crear efectos meteorológicos, como tormentas
 * con rayos». **Es presentación y no simulación**: el motor tira el clima una
 * vez al año (`WEATHER`, §5.1) y de ahí sale la cosecha; esto sólo decide qué
 * se ve por la ventana, se deriva en `derive/weather.ts` y no consume ni una
 * tirada. Vive aquí porque ningún número del juego se inventa en otro sitio.
 *
 * Las probabilidades son **por jornada de sol**, que desde v3.72 es un día.
 * Medidas con `tools/sky-report.ts` antes de fijarse: en un año normal salen
 * unas dieciséis tormentas y sesenta y siete días de cielo cerrado de
 * trescientos treinta y seis, o sea una tormenta cada tres semanas y lluvia una
 * quinta parte del tiempo. Un valle ruinoso llueve el doble que uno abundante, y
 * eso es lo que hace que dos valles del mismo año se vean distintos.
 */
export const SKY = {
  // TUNE: probabilidad de cielo cerrado por jornada, por fila de `WEATHER`
  // (ruinoso → abundante). Que el año malo llueva más no es una regla del
  // motor: es lo que hace que el cielo cuente lo mismo que la cosecha.
  WET_BY_YEAR: [0.34, 0.26, 0.2, 0.15, 0.1],
  // TUNE: de las jornadas cerradas, cuántas son tormenta y cuántas sólo nubes.
  // El resto es lluvia sin rayos. En invierno la tormenta no sale: nieva.
  STORM_SHARE: 0.25,
  OVERCAST_SHARE: 0.35,
  // TUNE: por debajo de esto no se pinta. Un chispeo que no se ve es peor que
  // un cielo claro: el jugador nota que algo pasa y no encuentra qué.
  MIN_INTENSITY: 0.45,
  // TUNE: cuánta luz tapa el cielo, de 0 a 1, a intensidad plena. La tormenta
  // tapa más, y ni una ni otra llega a apagar el día: una tormenta que se lee
  // como noche cerrada discute con el reloj de §11.2.
  DIM_WET: 0.35,
  DIM_STORM: 0.6,
  // TUNE: cuántos rayos caen en una jornada de tormenta, de la más suave a la
  // más fuerte. Con menos no es una tormenta; con más, es un estroboscopio.
  BOLTS_MIN: 2,
  BOLTS_MAX: 7,
  // TUNE: cuánto dura el destello y cuánto tarda el trueno, en segundos reales.
  // El trueno llega después porque el sonido va más despacio que la luz, y ese
  // retardo es lo que hace que una tormenta se sienta lejos o encima.
  FLASH_SECONDS: 0.12,
  THUNDER_DELAY: [0.4, 2.2],
  // TUNE: partículas a intensidad plena. Una sola malla para todas (D.9), así
  // que esto es el techo de la escena entera y no por celda.
  DROPS: 1200,
  FLAKES: 800,
} as const;

/**
 * §12.10 · Los sucesos del valle (R-1, v3.75).
 *
 * El primer paso del rework que pidió el dueño del diseño —«mucho más azar y
 * mucha más vida»—: cada semana el valle tira contra esta tabla y lo que sale
 * pasa sin que nadie decida nada (`world/fate.ts`). Los pesos son relativos
 * entre los sucesos que **pueden** pasar esa semana; la estación, el cielo y
 * los rasgos del valle abren, cierran y pesan. Todo TUNE, y todo medido con
 * `tools/fate-report.ts` antes de escribirse aquí.
 */
export const FATE = {
  // TUNE: la probabilidad semanal de que pase algo, y el hueco mínimo entre
  // dos sucesos. Con 0,35 y dos semanas salen unos catorce al año: uno cada
  // tres o cuatro semanas, que es lo que se puede contar sin que se apile.
  WEEKLY_CHANCE: 0.35,
  MIN_GAP_WEEKS: 2,
  // TUNE: el peso de cada suceso entre los posibles. La fiesta pesa mucho
  // porque sólo puede pasar una semana al año; el rayo se multiplica por las
  // jornadas de tormenta de la semana.
  // Medido en dos vueltas de seis semillas × cuarenta años: en la primera el
  // forastero y el oso eran la mitad del libro y la fiesta salía una vez cada
  // veinte años; en la segunda la riña era una entrada de cada cuatro y había
  // boda cada nueve meses. Los pesos de abajo son la tercera. Ver §7.10.
  WEIGHT: {
    lightning_fire: 3,
    river_flood: 3,
    wolves_at_the_coop: 3,
    wedding: 0.6,
    pedlar: 2,
    good_catch: 2,
    roof_under_snow: 3,
    harvest_feast: 1, // no se sortea: es un rito, ver `FEAST_IS_A_RITE`
    quarrel_in_the_square: 1,
    bear_in_the_wood: 0.6,
    child_lost: 0.5,
    stranger_passes: 1,
  },
  // La fiesta de la cosecha no es suerte: si hay grano y hay gente, la semana
  // después de la siega se celebra. Medido sin esto: una vez cada veinte años,
  // porque una sola semana al año casi nunca coincidía con el sorteo.
  FEAST_IS_A_RITE: true,
  // TUNE: el rayo quema como el incendio de §5.9, y prefiere las casas igual.
  LIGHTNING_HOUSE_WEIGHT: 3,
  LIGHTNING_MORALE: -4,
  // TUNE: el río se sale en primavera tras una semana de agua: cuántas jornadas
  // cerradas hacen falta, qué parte del granero se lleva, y el ánimo.
  FLOOD_WET_DAYS: 3,
  FLOOD_GRAIN_LOSS: 0.08,
  FLOOD_MORALE: -3,
  // TUNE: los lobos del corral, en invierno.
  WOLVES_HENS: [1, 2],
  WOLVES_MORALE: -1,
  // TUNE: una boda pide gente; sube el ánimo y un poco la fe.
  WEDDING_MIN_ADULTS: 6,
  WEDDING_MORALE: 5,
  WEDDING_FAITH: 2,
  // TUNE: el buhonero cambia leña por grano a este precio, en verano y sólo si
  // hay leña de sobra (el doble de lo que se lleva).
  PEDLAR_WOOD: 15,
  PEDLAR_GRAIN: 30,
  // TUNE: una buena pesca, en primavera o verano con el cielo abierto.
  CATCH_GRAIN: [15, 35],
  CATCH_MORALE: 2,
  // TUNE: un tejado cede bajo la nieve: cuántas jornadas de nieve hacen falta,
  // cuánto tiempo queda la casa sin techo y qué cuesta arreglarlo.
  ROOF_SNOW_DAYS: 2,
  ROOF_BLOCK_WEEKS: 2,
  ROOF_WOOD: 15,
  ROOF_MORALE: -2,
  // TUNE: la fiesta de la cosecha, la semana después de la siega.
  FEAST_MIN_PEOPLE: 4,
  FEAST_MORALE: 6,
  FEAST_FAITH: 3,
  // TUNE: la riña en la plaza baja la opinión mutua de los dos que peor se
  // llevan. Es el empujón que `findings-drama.md` §1 dice que nadie daba: sin
  // él ninguna opinión llegaba a −50 y no había rencores nunca.
  QUARREL_OPINION: -12,
  QUARREL_MORALE: -1,
  // TUNE: el oso, si queda bosque; deja una bandera dos semanas para quien
  // quiera leerla (la capa de vida, la caza) y baja el ánimo.
  BEAR_FOREST: 0.2,
  BEAR_WEEKS: 2,
  BEAR_MORALE: -3,
  // TUNE: un niño perdido y encontrado, y un forastero que pasa.
  CHILD_MORALE: -3,
  STRANGER_MORALE: 1,
} as const;

// ---------------------------------------------------------------------------
// §12.4 · Demography
// ---------------------------------------------------------------------------

export const LIFE = {
  BIRTH_BASE: 0.0038, // per fertile woman and week
  FERTILE: [16, 40],
  ADULT: [15, 59],
  MORTALITY: [
    // annual, by age bracket. The infant bracket is deliberately the second
    // highest: the curve is a bathtub, not a ramp (design.md §12.4).
    { to: 4, rate: 0.06 },
    { to: 14, rate: 0.012 },
    { to: 39, rate: 0.015 },
    { to: 59, rate: 0.035 },
    { to: 74, rate: 0.12 },
    { to: 200, rate: 0.3 },
  ],
  HOUSE_CAPACITY: 5,
  MAX_HOUSES: 16, // 16 × 5 = 80, the maximum roll of the village
  HARDY: 0.7,
  FRAIL: 1.6,
} as const;

export const MIGRATION = {
  ARRIVE_CHANCE: 0.3,
  // Dos desde la fundación en pareja: si hicieran falta ocho para que llegara
  // alguien, nadie llegaría nunca.
  ARRIVE_MIN_PEOPLE: 2,
  // TUNE: mientras la aldea es más pequeña que los veinte con los que se fundaba
  // antes, llega gente con esta probabilidad al año en vez de con
  // `ARRIVE_CHANCE`. Un valle con sitio, agua y un techo atrae; es lo que
  // convierte una pareja en aldea en la primera década y no en la tercera.
  // Medido con `tools/founding-report.ts` antes de fijarlo.
  ARRIVE_SMALL_BELOW: 20,
  ARRIVE_CHANCE_SMALL: 0.7,
  // TUNE: y el ánimo que se le pide a una aldea pequeña para que llegue gente.
  // Con el umbral normal (50) y el ánimo derivando hacia 50, la puerta era una
  // moneda al aire: medido, la semilla 23 se quedó cinco años en dos personas
  // con el ánimo en 49. Quien viene a un valle con tierra libre no le pregunta
  // a la pareja qué tal está; lo que sí le cierra el paso es el hambre y la
  // hostilidad, que siguen mandando.
  ARRIVE_MIN_MORALE_SMALL: 35,
  ARRIVE_MIN_MORALE: 50,
  ARRIVE_MIN_GRAIN_YEARS: 0.5,
  ARRIVE_MIN_FREE_BEDS: 2,
  ARRIVE_COUNT: [2, 4],
  LEAVE_BELOW_MORALE: 30,
  LEAVE_COUNT: [1, 3],
  // TUNE: §5.7 writes the leaving chance inline as (30 - morale)/60.
  LEAVE_SCALE: 60,
  // TUNE: §5.7 says the arrivals are "a mix of young adults and children"
  // without fixing either the ages or the mix. The children reuse
  // FOUNDING.AGE_RANGES.children.
  ARRIVE_ADULT_AGE: [16, 30],
  ARRIVE_CHILD_SHARE: 0.35,
  // §5.7, v2.16 · Abandonment. A settlement this small for this long is not a
  // village any more, and the people left in it walk out. MIN_FIELD_CREW does
  // not reach this case: two adults still crew one field, so the harvest keeps
  // coming and the hamlet neither dies nor recovers.
  // Dos, y no seis: una pareja no es una aldea que se apaga, es una que empieza.
  // Por debajo de dos —una persona sola— sí cuenta como apagarse (§5.7).
  VIABLE_POPULATION: 2,
  ABANDON_YEARS: 5,
  // Annex A.15, v2.22 · Refusing a leader stops being free. Measured, `last`
  // and `worst` spent 93 % of every decision on `succession:no_one` and paid
  // nothing for it — nobody joins while the post is vacant, departures double,
  // and after this many `no_one` answers running, with no leader appointed
  // between them, the village gives up on itself rather than ask a fourth time.
  NO_LEADER_DISPERSAL_STREAK: 3,
} as const;

// ---------------------------------------------------------------------------
// §12.5 · Disasters
// ---------------------------------------------------------------------------

export const DISASTER = {
  PLAGUE_BASE: 0.014, // annual; people/2500 is added
  PLAGUE_WELL: 0.6,
  PLAGUE_WEEKS: [6, 10],
  PLAGUE_HAZARD_ADULT: 0.05, // weekly, during the outbreak
  PLAGUE_HAZARD_WEAK: 0.09, // 0-4 and 60+
  FIRE_CHANCE: 0.035, // annual
  FIRE_GRAIN_LOSS: 0.45, // if a granary burns
  FIRE_MORALE: -6,
  // TUNE: §5.8 gives the weak band in prose: "4 years or under, or 60 or over".
  PLAGUE_WEAK_MAX_AGE: 4,
  PLAGUE_WEAK_MIN_AGE: 60,
  // TUNE: §5.8 writes the annual chance inline as PLAGUE_BASE + people/2500.
  // A bigger village is a likelier one to catch it.
  PLAGUE_PER_PEOPLE: 2500,
  // TUNE: §5.9 says the fire takes a wooden building at random "preferring the
  // houses" without saying by how much. This is the weight a house carries
  // against every other wooden building's 1.
  FIRE_HOUSE_WEIGHT: 3,
  // §5.9, v2.13: what can actually catch. A wooden building **with a roof**,
  // enumerated in the section itself. `field`, `well`, `palisade` and
  // `grave_yard` are tier 0 by accident of §7.2's table, not because fire
  // should take them: losing a field costs 600 of harvest for ever and reads
  // wrong in the chronicle.
  FIRE_KINDS: ['house', 'granary', 'chapel', 'smithy', 'mill'],
} as const;

// ---------------------------------------------------------------------------
// §12.6 · Morale and faith
// ---------------------------------------------------------------------------

export const MOOD = {
  MORALE_DRIFT_TO: 50,
  MORALE_DRIFT: 0.02,
  MORALE_PER_DEATH: -1.5,
  MORALE_HUNGER: -4.0, // × severity
  MORALE_CROWDING: -0.4, // per person without a bed
  MORALE_CHAPEL: 0.15,
  MORALE_CHURCH: 0.3,
  MORALE_MILL: 0.05,
  MORALE_GRAVEYARD: 0.05, // the effect §7.2 gives to `grave_yard`
  MORALE_OUTBREAK: -0.8,
  MORALE_HARVEST: 25, // × (weather factor − 1)
  FAITH_DRIFT_TO: 40,
  FAITH_DRIFT: 0.01,
  FAITH_CHAPEL: 0.2,
  FAITH_CHURCH: 0.35,
  FAITH_DEVOUT_PRIEST: 0.13, // 0.10 froze faith at exactly 50.0 (§5.6)
  FAITH_NO_PRIEST: -0.15,
  FAITH_OUTBREAK: -0.6,
  // TUNE: §5.6 writes it inline as unexplainedDeathsThisTick · 0.30.
  FAITH_UNEXPLAINED_DEATH: -0.3,
  // §5.6: an unexplained death is a `natural` one between these ages. Younger
  // and the village mourns a child; older and it buries an elder. Neither is
  // read as a sign.
  UNEXPLAINED_MIN_AGE: 5,
  UNEXPLAINED_MAX_AGE: 59,
  MORALE_FLOOR_FROM_FAITH: 0.25,
} as const;

// ---------------------------------------------------------------------------
// §12.7 · The valley
// ---------------------------------------------------------------------------

/** Map-generation parameters from §7.1; unspecified choices are marked TUNE. */
export const MAPGEN = {
  // Por dónde entra el río, **en coordenadas del corazón** y no del mapa: el
  // río es la espina del valle productivo, así que entra por donde entraba
  // cuando el mapa era el corazón. `mapgen` le suma el margen.
  RIVER_ENTRY: [10, 26],
  RIVER_FORWARD_CHANCE: 0.65,
  RIVER_WIDTH: 2,
  RIVER_LOWER_WIDTH: 3,
  NOISE_SCALES: [8, 4],
  // **Fracción del corazón, no del mapa** (`WORLD.HEART_WIDTH`). Era del mapa
  // entero, y ahí estaba la trampa que tenía esta fase aparcada: ver el
  // comentario de `WORLD.HEART_WIDTH`, que la cuenta con los números.
  //
  // La roca no necesita lo mismo: `ROCK_PATCHES` y `ROCK_SIZE` ya son cuentas
  // absolutas. Y la marisma tampoco: es una franja a lo largo del río, así que
  // depende de lo que el río corre y no de lo que el mapa mide — un río más
  // largo merece más marisma.
  FOREST_FRACTION: [0.20, 0.26],
  ROCK_PATCHES: [3, 6],
  ROCK_SIZE: [6, 14],
  MARSH_WIDTH: [1, 2],
  CLEARING_SIZE: 12,
  // --- El mapa grande, paso 3: lo que llena el valle fuera del corazón ---
  //
  // TUNE los cuatro, y los cuatro son geometría y no economía: ni la montaña ni
  // el lago dan madera, forraje o solar, así que ninguno de estos números puede
  // mover un solo número de §12.9. Lo que deciden es lo que se ve.
  //
  // Dónde empieza el pie de la montaña y dónde es ya roca maciza, en celdas
  // desde el borde del corazón. Cuatro y catorce: quedan diez celdas de ladera
  // —treinta metros— para que la roca salga del prado sin un escalón, que es la
  // misma razón por la que la sierra de `ridge.ts` arranca plana y se empina.
  MOUNTAIN_FOOT: 4,
  MOUNTAIN_FULL: 14,
  // Cuánto desordena el ruido ese límite, en celdas. Sin esto, el corazón se
  // lee como un rectángulo dibujado con tiralíneas, que es exactamente lo que
  // un valle no es.
  MOUNTAIN_ROUGH: 5,
  // El lago: una mancha, en celdas. Entre cuarenta y ochenta es un lago que se
  // ve entero desde la aldea y que no se puede rodear de un paso.
  LAKE_SIZE: [40, 80],
  // TUNE: hasta dónde se busca la otra orilla al tallar el vado, en celdas.
  // Catorce: más ancho que eso no es un río que se vadee. El mismo número que
  // el 3D usaba para dibujar las losas, que es de donde sale la geometría.
  FORD_SPAN: 14,
  SITE_RIVER_DISTANCE: [3, 6],
  RIVER_MEANDER: 3, // TUNE: bound lateral drift so either bank can hold a clearing.
  FINE_NOISE_WEIGHT: 0.5, // TUNE: relative amplitude of the second octave.
  SLOPE_BIAS: 0.22, // TUNE: modest forest preference for the east/west slopes.
  NORTH_BIAS: 0.12, // TUNE: modest forest preference for the northern end.
  ROCK_RIVER_DISTANCE: 5, // TUNE: preferred minimum distance from water.
} as const;

// ---------------------------------------------------------------------------
// §7.7 · The livestock
//
// TUNE: none of these are in §12 because they move no number of the game. The
// herd is derived and cosmetic (§7.7, v2.87): it is not state, it is not
// saved, and it feeds nobody. They live here rather than in the render because
// the day they DO feed somebody, this is where §12 will look for them.
// ---------------------------------------------------------------------------

export const ANIMALS = {
  HENS_PER_HOUSE: 2,
  HOUSES_PER_PIG: 2, // a pig needs surplus: only once the granary stands
  FIELDS_PER_COW: 2, // and a cow needs pasture, so it follows the fields
  MAX_PER_KIND: 24, // a village of eighty must not become a farmyard of hundreds
  // How far from its anchor an animal drifts, in cells. Small on purpose:
  // livestock that wanders like people reads as people.
  WANDER: 0.55,
  // TUNE (§11.9, v3.06): y cuánto se desplaza su querencia de una semana a
  // otra. El movimiento de dentro del día era el mismo círculo cada semana
  // —no dependía del tick— así que una vaca llevaba veinte años pastando
  // exactamente el mismo metro cuadrado. Un rebaño que no cambia de sitio es
  // un adorno pintado en el fondo.
  GRAZE: 1.6,

  // Wildlife (§7.7, v2.88). Still cosmetic: they eat nothing yet.
  FIELDS_PER_CROW: 2,
  CROWS_MAX: 8,
  // Crows come as the grain ripens, not all year: the weeks before the
  // reaping of week 35 (§5.1) are when there is something on the field worth
  // taking.
  CROW_WEEKS_BEFORE_HARVEST: 6,
  // TUNE (11.9, v3.12): qué parte de la bandada espanta una vigilancia
  // completa. No todos: un guarda ahuyenta cuervos, no los borra del valle, y
  // un campo sin un solo pájaro en agosto se lee como un campo muerto.
  CROW_SCARED: 0.6,
  // --- Mechanics (§7.7, v2.91). These DO move numbers of the game. -------
  //
  // TUNE: §12 had no livestock. Sized against FOOD.GRAIN_PER_PERSON = 1.0 so
  // that the whole herd a village can hold eats a small but real share of the
  // food bill: about twenty hens, eight pigs and four cows come to 3.0 a week,
  // roughly a fourteenth of what forty people eat.
  UPKEEP: { hens: 0.02, pigs: 0.15, cows: 0.35 },
  // What a slaughtered head is worth, in the same units: person-weeks of food.
  // A cow is a week and a half for forty people; the whole herd is a buffer of
  // the order of half a granary, and it walks.
  MEAT: { hens: 2, pigs: 25, cows: 60 },
  // Breeding: one head every this many weeks, and only with a full year of
  // grain in hand. Slow on purpose — the herd must not outrun a bad winter.
  BREED_EVERY: 8,
  BREED_GRAIN_YEARS: 1.0,
  // TUNE (§7.8, v2.95): what salt is worth. A salted carcass keeps, so more of
  // it is eaten and less of it spoils. A third more out of every head is the
  // difference between a cow feeding the village for a week and a week and a
  // half, which is what the salt trade was actually for.
  SALTED_MEAT: 1.35,
  // A winter week without a palisade. Per week, not per night: the tick is a
  // week (§4.1) and the wolves of §7.7 come with the cold, not on a schedule.
  WOLF_RAID_CHANCE: 0.08,
  WOLVES_MAX: 3,
  // How far into the trees a wolf may show, measured from the village centre.
  WOLF_RANGE: 14,
  FISH_MAX: 4,
  FISH_RANGE: 12,
} as const;

/**
 * The traders' own clock (§7.8, v2.97). They do not compete for §8.6's decision
 * budget and do not spend its rest: a pedlar at the door is not a disputed
 * succession and must not take its turn. So they get a channel of their own,
 * and a pace of their own that is measured separately.
 */
export const TRADE = {
  // TUNE: years between one trader and the next, on their own clock. Long
  // enough that a trader is an event; short enough that a player sees more
  // than one in a lifetime.
  MIN_YEARS_BETWEEN: 18,
  // TUNE: weekly chance of somebody coming up the road, drawn only on the
  // weeks where a trader could actually arrive — the right season, a village
  // big enough, no crisis on. Over the twelve weeks of one season that is
  // about one chance in three, so a trader is likely but never a metronome.
  ARRIVE_CHANCE: 0.035,
} as const;

/**
 * Murrain, the cattle plague (§7.7, v2.94). Built in the image of §5.8's human
 * plague, because it is the same kind of thing: a base annual chance plus a
 * term for how much there is to catch it, halved by clean water.
 *
 * This is what the herd was missing. Until now a big herd only cost grain, and
 * it should also frighten. Every number is TUNE.
 */
export const MURRAIN = {
  // TUNE: annual chance at an empty pen, before the density term. Lower than
  // DISASTER.PLAGUE_BASE: losing animals must be commoner than losing people
  // in count, and rarer in occurrence.
  BASE: 0.010,
  // TUNE: added to the annual chance at a herd sitting on its ceiling. A full
  // pen is roughly four times as likely to break out as an empty one, which is
  // the pressure that makes a big herd a gamble rather than a free buffer.
  PER_DENSITY: 0.030,
  // TUNE: the well again (§5.8 gives DISASTER.PLAGUE_WELL 0.6 for people).
  // Slightly kinder than for people because a trough is easier to keep clean
  // than a village, and because the well needed a second reason to exist.
  WELL: 0.55,
  // TUNE: share of the affected kind that dies in an outbreak. Never all of
  // it: a village that loses every cow in one week has nothing to decide
  // afterwards, and §7.7's whole point is that the herd is a thing you manage.
  TOLL: 0.5,
} as const;

/**
 * The crows (§7.7, v2.93). They were already on the fields in the weeks before
 * the reaping; now they take something. The answer is not a building but
 * hands: somebody has to stand in the field and keep them off, and those are
 * the same hands the woods and the works want. Every number is TUNE.
 */
export const CROWS = {
  // TUNE: share of the coming harvest lost per unwatched week. Over the six
  // weeks of ANIMALS.CROW_WEEKS_BEFORE_HARVEST an entirely unwatched field
  // loses about a seventh of the year, which hurts without being a disaster.
  BITE_PER_WEEK: 0.024,
  // TUNE: hands needed to keep the birds off one worked field. Under a fifth
  // of FOOD.FIELD_CREW: watching is cheap next to reaping, and it must be
  // cheap or no village would ever choose it over the woods.
  WARDEN_PER_FIELD: 0.75,
  // TUNE: however bad the year, the birds never take more than this. A harvest
  // that can go to zero from crows alone would make one bad allocation fatal.
  MAX_BITE: 0.35,
} as const;

/**
 * Hunting and fishing (§7.7, v2.92). The village sends hands to the woods and
 * the river when the granary is low, and only then: this is the bad-year food,
 * not a second industry. Every number here is TUNE — §12 predates it.
 */
export const FORAGE = {
  // TUNE: below this many years of grain in store the village starts foraging.
  // Three quarters of a year is roughly "we will not reach the next harvest",
  // which is when a real village went to the woods.
  THRESHOLD_YEARS: 0.75,
  // TUNE: at most this fraction of the hands left after the fields. Foraging
  // must never empty the works reserve of §5.2 or the valley stops changing.
  MAX_SHARE: 0.5,
  // TUNE: bushel-equivalents a week, at a full forest. Half of what the same
  // hand yields in a field (600 per field-year over four crew is about 3.1 a
  // week): hunting fed people, but never as well as farming them.
  MEAT_PER_HUNTER: 1.5,
  // TUNE: the river does not run out the way the wood does, so the fisher's
  // yield is flat — and lower, because that is the trade for not depending on
  // anything.
  FISH_PER_FISHER: 1.2,
  // TUNE: under this much forest left there is nothing worth hunting. It is
  // the same floor `forest_cut` uses to stop offering the woods (§12).
  MIN_FOREST: 0.1,
  // TUNE: what counts as a full forest, as a fraction of the whole valley.
  // Measured, not guessed: five seeds found 0.215-0.251 of the map wooded at
  // the founding, and 0.131-0.184 after a hundred years of cutting. So a
  // valley opens at a hunting factor of about 1 and falls to about two thirds
  // by the second century, which is the decline this is meant to express.
  FULL_FOREST: 0.25,
  // TUNE: cuántas semanas de gracia tiene una temporada de caza antes de
  // considerarse acabada (§9.2, §11.6). Dos: una semana suelta en la que no
  // sale nadie no cierra la temporada, así que el valle no anuncia una
  // temporada nueva cada quince días. Con una, el aviso volvía a salir en
  // cuanto el reparto de manos caía a cero una semana.
  SPELL_GRACE: 2,
} as const;

/**
 * Cuánto mueve cada rasgo del valle. E5 de `docs/plan-juego.md`.
 *
 * TUNE, los cuatro. Buscados para que **cambien la postura que funciona** y no
 * sólo el ritmo: un 15 % de cosecha es la diferencia entre sembrar de más y no
 * molestarse, y un 30 % de madera por celda es la diferencia entre poder mandar
 * gente al bosque y tener que racionarlo. Por debajo de un 10 % nada de esto se
 * nota en cuarenta años y el rasgo sería un adorno en la crónica.
 *
 * Dos suben y dos bajan a propósito: un valle con dos rasgos buenos y otro con
 * dos malos son dos partidas, y eso es lo que se buscaba.
 */
export const TRAITS = {
  /** Buena arcilla: lo que se levanta cuesta menos madera. */
  GOOD_CLAY_WOOD: 0.8,
  /** Tierra delgada: el campo da menos. */
  THIN_SOIL_YIELD: 0.85,
  /** Bosque viejo: cada celda arbolada guarda más leña. */
  OLD_FOREST_WOOD: 1.3,
  /**
   * Lomas peladas: la mitad de pedregales en el mapa.
   *
   * **La primera versión de este rasgo prohibía cantear del todo y estaba mal.**
   * Medido: cuatro de cinco semillas salían con él, y sin cantera desaparecen
   * **todos** los hitos de obra —quince de treinta y seis en la semilla 2024,
   * que son las casas que pasan a piedra— así que la partida normal pasaba a ser
   * la pobre. Un rasgo tiene que cambiar la partida, no amputarla.
   *
   * Medio pedregal es proporcional, **se ve en el mapa** —hay la mitad de
   * piedras por el prado— y sigue siendo una decisión: en un valle así la
   * piedra llega tarde y conviene apostar por la fe y los oficios antes que por
   * las murallas.
   */
  BARE_HILLS_ROCK: 0.5,
} as const;

export const WORLD = {
  /**
   * El valle jugable, en celdas. Una celda son tres metros (D.6.2).
   *
   * **Setenta y dos por ciento doce desde el mapa grande** (paso 3,
   * `docs/next-plan.md`): cuatro veces el mapa de 36 × 56 que el juego tuvo
   * desde M-13. Lo pidió el dueño del diseño con estas palabras —«el mapa sigue
   * siendo muy pequeño, dijimos que iba a ser mucho más grande; el valle es el
   * centro del mapa pero debe ser más amplio»— y lo que hace que se pueda hacer
   * sin tocar la economía es el corazón de abajo.
   *
   * El coste, contado antes de crecer: una ruta que cruza el valle costaba 0,09
   * ms y con cuatro veces el área son unos 0,4; con cincuenta rutas por tick,
   * 20 ms contra los 234 que dura un tick a ×64.
   */
  WIDTH: 72,
  HEIGHT: 112,
  /**
   * El corazón: la superficie **productiva** del valle, alrededor de la
   * fundación, y lo único que la economía mide.
   *
   * 36 × 56, que es exactamente el mapa entero de antes. Ahí van el bosque, la
   * roca y la marisma, en las mismas cantidades que siempre; lo que llena el
   * resto es montaña y lago, que no dan madera, ni forraje, ni solar, y que A*
   * no cruza.
   *
   * **Esto es lo que desactiva la trampa medida del brief.** El bosque era una
   * fracción del mapa entero (`forestCount = CELLS * fraction`), así que un mapa
   * cuatro veces mayor cuadruplicaba la madera en pie, la madera dejaba de ser
   * escasa para siempre y §5.4 —media economía— dejaba de apretar. Y
   * `forestLeft`, que es lo que abre `forest_cut` y lo que gobierna la caza,
   * dividía por el mapa entero: con el bosque quieto y el mapa cuatro veces
   * mayor se habría hundido de 0,24 a 0,06, por debajo de los tres umbrales del
   * catálogo y del suelo de `FORAGE.MIN_FOREST`. Las dos cuentas se hacen contra
   * el corazón, y las dos dan hoy exactamente lo que daban ayer.
   */
  HEART_WIDTH: 36,
  HEART_HEIGHT: 56,
  FOREST_TARGET: [0.18, 0.3],
  WOOD_PER_FOREST_TILE: 300,
  FOREST_REGROWTH_YEARS: 8,
  FOREST_REGROWTH_NEIGHBOURS: 3,
  BARREN_CLEARING: 254, // a crossroad felled it for a lifetime (§A.11)
  FLOOD_PRONE_SHIFT: 0.05, // ruinous weather borrowed from the fair row
  PATH_T1: 400,
  PATH_T2: 1600,
  PATH_T3: 6000,
  TRAFFIC_DECAY: 0.005, // per tick
  STONE_PER_BP: 0.5, // build points converted to stone, with a smithy
  // §9, v2.16: the mark `forestAge` carries on a cell of the wood that was
  // standing at the founding. Cleared cells count years there instead, and a
  // cell that has been felled once can never carry it again.
  VIRGIN_FOREST: 255,
} as const;

/**
 * §7.6 gives the shape of the A* cost — "penaliza bosque y roca y premia
 * `path`" — and none of the numbers, so all of them are TUNE. Integers, because
 * two machines that round a float differently would route differently, and a
 * route that differs by one cell puts the traffic somewhere else.
 */
export const PATHING = {
  STEP: 10, // TUNE: the cost of crossing an ordinary meadow cell.
  FOREST: 12, // TUNE: going round the wood is worth about two cells of detour.
  ROCK: 20, // TUNE: an outcrop is worth going round unless it is very close.
  // TUNE: lo que cuesta cruzar el vado, sumado al paso. Treinta: cruzar de
  // piedra en piedra con las manos ocupadas cuesta cuatro veces un prado, así
  // que se cruza cuando hace falta y no por atajar. Un vado gratis convertiría
  // el río en una calle; un vado prohibido es lo que había, y partía la aldea.
  FORD: 30,
  // TUNE: what each level of `path` takes off the step. Index is map.path:
  // 0 none, 1 trodden, 2 track, 3 road.
  PATH_DISCOUNT: [0, 3, 5, 7],
  MIN_STEP: 3, // STEP - PATH_DISCOUNT[3]; the A* heuristic reads it.
} as const;


// ---------------------------------------------------------------------------
// §12.8 · Crossroads
// ---------------------------------------------------------------------------

export const CROSSROADS = {
  MIN_TICKS_BETWEEN: 120, // 30 real minutes at ×1
  GUARANTEE_TICKS: 960, // at least one per generation
  CRISIS_MULTIPLIER: 4.0,
  FEUD_RIPE_MULTIPLIER: 4.0,
  BEHIND_WALL_MULTIPLIER: 0.4,
  VALLEY_NAME_LORD_MULTIPLIER: 0.5,
  // §8.6, v2.43: two `story` modifiers on the same category do not multiply —
  // the strongest wins, and this is the net it cannot fall through however many
  // stack. Muro and reputation alone already reach 0.4; a third would have gone
  // lower still and left the category mute right when the late game needs it.
  STORY_FLOOR: 0.25,
  NOVELTY_MULTIPLIER: 0.4, // if it already came up this game
  DEFAULT_COOLDOWN_YEARS: 25,
} as const;

// ---------------------------------------------------------------------------
// §7.2 · Buildings
//
// The declared exception to "every number is in §12". Size in cells, cost in
// wood, stone and build points, and the cap on how many may stand.
//
//   cap: null      no limit (palisade and wall are segments)
//   stone: 0       a wooden building; tier 0
//   upgradeOf      the wooden building this replaces (§7.3 point 9)
//   byCrossroad    the village never builds it on its own; only §8.4 `build`
//
// The `Efecto` column of the table is not repeated here: each of those numbers
// already lives in §12 and is named in the comment, so the two cannot drift.
// ---------------------------------------------------------------------------

export const BUILDINGS = {
  house: { w: 2, h: 2, wood: 60, stone: 0, bp: 40, cap: 16, tier: 0, upgradeOf: null, byCrossroad: false }, // +LIFE.HOUSE_CAPACITY of roll
  field: { w: 3, h: 2, wood: 0, stone: 0, bp: 60, cap: 8, tier: 0, upgradeOf: null, byCrossroad: false }, // +FOOD.FIELD_YIELD of base harvest
  granary: { w: 2, h: 2, wood: 120, stone: 0, bp: 80, cap: 3, tier: 0, upgradeOf: null, byCrossroad: false }, // +FOOD.GRANARY_CAPACITY
  well: { w: 1, h: 1, wood: 40, stone: 0, bp: 30, cap: 1, tier: 0, upgradeOf: null, byCrossroad: false }, // plague ×DISASTER.PLAGUE_WELL
  chapel: { w: 2, h: 2, wood: 150, stone: 0, bp: 120, cap: 1, tier: 0, upgradeOf: null, byCrossroad: false }, // MOOD.*_CHAPEL; enables `priest`
  smithy: { w: 2, h: 2, wood: 140, stone: 0, bp: 100, cap: 1, tier: 0, upgradeOf: null, byCrossroad: false }, // LABOUR.SMITHY_BONUS; enables stone
  mill: { w: 2, h: 2, wood: 180, stone: 0, bp: 140, cap: 1, tier: 0, upgradeOf: null, byCrossroad: false }, // FOOD.MILL_BONUS
  palisade: { w: 1, h: 1, wood: 30, stone: 0, bp: 20, cap: null, tier: 0, upgradeOf: null, byCrossroad: false }, // one segment
  grave_yard: { w: 3, h: 2, wood: 0, stone: 0, bp: 25, cap: 1, tier: 0, upgradeOf: null, byCrossroad: true }, // MOOD.MORALE_GRAVEYARD
  wall: { w: 1, h: 1, wood: 0, stone: 40, bp: 60, cap: null, tier: 1, upgradeOf: 'palisade', byCrossroad: false },
  stone_house: { w: 2, h: 2, wood: 0, stone: 50, bp: 70, cap: null, tier: 1, upgradeOf: 'house', byCrossroad: false }, // does not burn
  church: { w: 3, h: 3, wood: 0, stone: 120, bp: 200, cap: 1, tier: 1, upgradeOf: 'chapel', byCrossroad: false }, // MOOD.*_CHURCH
  watchtower: { w: 2, h: 2, wood: 0, stone: 60, bp: 90, cap: 2, tier: 1, upgradeOf: null, byCrossroad: true },
} as const;

/**
 * §7.3's build priority and §7.4's placement, as numbers.
 *
 * The population gates and the granary threshold are written in §7.3 itself and
 * are transcribed literally. The two placement distances are marked TUNE: §7.4
 * gives the preferences in prose ("a menos de 6 celdas de una casa", "dilatada
 * 2 celdas") and one of them is a number, the other is not.
 */
export const BUILDING_RULES = {
  WELL_PEOPLE: 25, // §7.3 point 4
  CHAPEL_PEOPLE: 30, // §7.3 point 5
  CHAPEL_FAITH: 45, // §7.3 point 5
  SMITHY_PEOPLE: 35, // §7.3 point 6
  MILL_PEOPLE: 45, // §7.3 point 7
  GRANARY_FULL: 0.8, // §7.3 point 3: grain above 80 % of capacity
  GRANARY_HOUSE_DISTANCE: 6, // §7.4: "a menos de 6 celdas de una casa"
  PALISADE_DILATION: 2, // §7.4: "envolvente convexa del núcleo, dilatada 2 celdas"
  CHAPEL_SET_BACK: 2, // TUNE: §7.4 wants the chapel "algo apartada"; cells past the core rim.
  // TUNE: cells of street left between two buildings that have walls. One is
  // enough for a lane: at three metres a cell (design.md D.6.2) that is a cart
  // wide. Without it the village grew as one solid block — six houses in a row
  // with no gap in a measured game — so a door opened onto the neighbour's wall
  // and nobody could reach their own house without walking through somebody
  // else's. Fields, walls and graveyards are exempt: they have no inside.
  STREET_GAP: 1,
} as const;

// ---------------------------------------------------------------------------
// Births and deaths
//
// TUNE: §6.5 writes both formulas inline and §12.4 keeps only BIRTH_BASE and
// the mortality table. The rest of those two formulas is transcribed here so
// that no number of the game lives in a function.
// ---------------------------------------------------------------------------

export const BIRTH = {
  FOOD_WEEKS: 24, // foodFactor = clamp(grain / (people · 24), 0, 1.2)
  FOOD_FACTOR_MAX: 1.2,
  MORALE_BASE: 0.6, // moraleFactor = 0.6 + 0.8 · morale/100
  MORALE_SPAN: 0.8,
  HOUSING_GOOD_BEDS: 3, // freeBeds >= 3 -> 1.3
  HOUSING_GOOD: 1.3,
  HOUSING_SOME_BEDS: 1, // freeBeds >= 1 -> 1.0
  HOUSING_SOME: 1.0,
  HOUSING_NONE: 0.15, // no free bed at all
} as const;

export const DEATH = {
  HUNGER_MULT: 2, // weekly rate × (1 + 2 · severity)
} as const;

// ---------------------------------------------------------------------------
// Traits
//
// TUNE: §6.3 says the traits are drawn with weights per role and names two of
// the leanings ("a priest has a high probability of `devout`, a leader of
// `ambitious` or `proud`"), but never writes the table. This is it.
//
// A trait the role leans towards weighs 3; every trait not listed weighs 1.
// That is the whole rule — a table of data, not a chain of ifs, so that a new
// role is a new row and nothing else. A role of null (an anonymous villager
// promoted with no office) draws uniformly.
//
// The leanings read as the job: the reeve counts other people's grain, the
// woodward works alone at the treeline, the stranger either came to make
// something of themselves or came running from something.
// ---------------------------------------------------------------------------

export const TRAIT_WEIGHT_ROLE = 3;
export const TRAIT_WEIGHT_BASE = 1;

export const TRAIT_WEIGHTS = {
  leader: { ambitious: TRAIT_WEIGHT_ROLE, proud: TRAIT_WEIGHT_ROLE },
  smith: { stubborn: TRAIT_WEIGHT_ROLE, proud: TRAIT_WEIGHT_ROLE },
  midwife: { kind: TRAIT_WEIGHT_ROLE, hardy: TRAIT_WEIGHT_ROLE },
  priest: { devout: TRAIT_WEIGHT_ROLE },
  woodward: { secretive: TRAIT_WEIGHT_ROLE, loyal: TRAIT_WEIGHT_ROLE },
  reeve: { greedy: TRAIT_WEIGHT_ROLE, cunning: TRAIT_WEIGHT_ROLE },
  herbalist: { kind: TRAIT_WEIGHT_ROLE, secretive: TRAIT_WEIGHT_ROLE },
  stranger: { ambitious: TRAIT_WEIGHT_ROLE, craven: TRAIT_WEIGHT_ROLE },
} as const;

/** How many traits a named villager gets. design.md §6.3: "3 or 4". */
export const TRAIT_COUNT = [3, 4] as const;

// ---------------------------------------------------------------------------
// §6.4 · Memory, opinions and grudges
//
// TUNE: §6.4 gives the table in prose and none of it reaches §12.
// ---------------------------------------------------------------------------

/**
 * What the world leaves on people (§6.4, §7.9, v2.99). Until now only the
 * player's decisions wrote memories; a famine or a fire happened to nobody in
 * particular. Every number here is TUNE.
 */
export const SCARS = {
  // TUNE: below this a short week is not something anyone remembers for life.
  // §5.3's severity is 0 with a full granary and 1 with an empty one.
  HUNGER_MIN: 0.15,
  // TUNE: the severity at which a hunger leaves the heaviest mark it can. Well
  // below 1: a village does not need the granary completely empty for the year
  // to be the one people talk about.
  HUNGER_FULL: 0.6,
  // TUNE: losing the roof over your head. Near the top of MEMORY's range and
  // fixed, not scaled: there are no degrees of your house burning down.
  LOST_HOME_WEIGHT: 4,
} as const;

/**
 * Las marcas que una decisión deja en el valle (§11.8, v3.01). Son sólo de
 * presentación: no mueven un número del juego y no se guardan. Están aquí, y
 * no en el render, porque §2 dice que ningún número del juego se inventa en
 * un fichero suelto — y cuánto dura un apagón es un número.
 */
/**
 * Las burbujas de estado (§11.1.1, v3.53). Igual que los encuentros: sólo de
 * presentación, sin azar y sin guardarse. Aquí porque §2 no deja que un número
 * del juego viva suelto en un fichero de dibujo.
 */
export const BUBBLE = {
  // TUNE: cuántas semanas se le queda a alguien la cara de lo que le ha pasado.
  // Seis es una estación y media: bastante para verlo a ×16 sin que la aldea se
  // pase la partida entera de luto.
  WEEKS: 6,
  // TUNE: qué escasez hay que tener para que se le note en la cara. Por debajo
  // de un cuarto la aldea aprieta el cinturón y sigue; por encima, pasa hambre.
  HUNGRY_AT: 0.25,
} as const;

/**
 * Los encuentros de la jornada (§11.9, v3.03). Sólo de presentación: no mueven
 * un número del juego, no se guardan y no consumen azar. Están aquí porque
 * §2 dice que ningún número del juego vive suelto en un fichero de dibujo.
 */
export const ENCOUNTER = {
  // TUNE: a cuántas celdas hay que estar para pararse a hablar con alguien.
  RANGE: 4.5,
  // TUNE: por debajo de esta opinión no se paran jamás. Un rencor de §6.4 vive
  // en −50, así que dos enemigos declarados nunca coinciden a propósito.
  COLD_BELOW: -20,
  // TUNE: probabilidad de pararse entre dos que no sienten nada especial.
  BASE_CHANCE: 0.35,
  // TUNE: y entre dos que se aprecian de verdad. La diferencia entre las dos
  // es lo que hace que una aldea unida se vea distinta de una rota.
  WARM_CHANCE: 0.8,
  // TUNE: el tramo del día en que puede empezar una conversación, en fracción
  // de tick. Después de llegar al destino y antes de volver a casa.
  EARLIEST: 0.2,
  LATEST: 0.45,
  // TUNE: lo que dura, en fracción de tick.
  MIN_SPAN: 0.08,
  MAX_SPAN: 0.22,
  // TUNE: cuánto se separa cada uno del centro de su destino. Sin esto, los
  // ocho que trabajan el mismo campo se dibujan todos en la misma celda y el
  // valle enseña un borrón de figuras superpuestas en vez de gente trabajando.
  // Medido antes de ponerlo: 145 parejas superpuestas de media con 32 figuras.
  SPREAD: 1.35,
  // TUNE: y cuánto se separan en una reunión convocada (§11.8). Mucho menos:
  // una reunión es gente apiñada escuchando, no gente repartida trabajando. Sin
  // esta distinción, veintiséis personas en la misma celda abrían un corro de
  // siete celdas de radio y la reunión se veía MÁS suelta que un día de campo.
  MEETING_SPREAD: 0.45,
  // TUNE (§11.9, v3.10): cuántos caben en un corrillo. La gente no habla sólo
  // de dos en dos, y una plaza con dos parejas y nadie más parece un tablero.
  MAX_KNOT: 4,
  // TUNE: y cuántas ganas hay que tener para unirse a uno que ya está formado.
  // Más que para empezar una conversación: cuesta menos acercarse a un corro
  // que abordar a alguien.
  JOIN_BONUS: 1.4,
} as const;

/**
 * La forma de la jornada (§11.9, v3.03). Sólo de presentación.
 *
 * Antes de esto, los cuarenta salían de casa en el mismo instante, llegaban a
 * la vez, se quedaban lo mismo y volvían juntos, con un desfase por persona de
 * apenas el 4 % del día. Eso es lo que se leía como un mecanismo en vez de como
 * gente: en cualquier momento del día, todo el mundo estaba haciendo lo mismo.
 */
export const DAY = {
  // TUNE: el margen dentro del cual cada uno sale de su casa. Amplio a
  // propósito: es lo que hace que a media mañana todavía haya alguien saliendo
  // mientras otro lleva un rato en el campo.
  LEAVE_SPAN: 0.13,
  // TUNE: y el margen en que cada uno da el día por terminado.
  RETURN_EARLIEST: 0.52,
  RETURN_SPAN: 0.16,
  // TUNE: lo que se tarda en ir y en volver, en fracción de tick.
  TRAVEL: 0.15,
  // TUNE: por debajo y por encima de estas edades la jornada es más corta —
  // los críos y los viejos vuelven antes. En fracción de la jornada.
  SHORT_DAY: 0.75,
  CHILD_UNDER: 12,
  ELDER_OVER: 60,
  // TUNE: cuántas veces recorre su parcela durante la jornada. Trabajar no es
  // estarse quieto en un punto: es ir y venir por el mismo trozo de campo. Con
  // el vaivén de antes —un seno de amplitud 0,18— la gente parecía clavada.
  WORK_LAPS: 2.5,
  // TUNE: lo que se aleja de su puesto al hacerlo, en celdas.
  WORK_REACH: 0.9,
  // TUNE: cuánto más se mueve un crío que un adulto. Los menores de
  // `CHILD_UNDER` no trabajan: andan por delante de las casas, y andan mucho.
  // Es el movimiento que más se ve, porque ocurre donde el jugador mira.
  CHILD_ENERGY: 2.2,
  // TUNE: cuánto se aparta cada uno del eje del camino, en celdas. Dos vecinos
  // con la misma ruta iban por la misma línea exacta, uno tapando al otro: en
  // pantalla eran una figura, no dos. La gente anda al lado del camino, no
  // sobre una raya pintada.
  LANE: 0.35,
  // TUNE: cuánto varía el paso de una persona a otra. El viejo llega más tarde
  // que el mozo aunque salgan juntos, y eso es lo que rompe la marcha en bloque.
  GAIT: 0.35,
  // TUNE (§11.9, v3.08): cuánto se aparta uno de alguien a quien no soporta.
  // Dos con un rencor abierto no se paran a hablar —eso ya lo hacía v3.03— pero
  // tampoco pasan la jornada codo con codo como si nada. Se dan la espalda, y
  // eso se ve sin leer una línea de crónica.
  SHUN: 1.8,
  /**
   * TUNE (§11.9, v3.13): lo más lejos que alguien puede acabar de su destino.
   *
   * Reparto, apartarse de un enemigo y el vaivén del trabajo se suman, y la
   * suma no la controlaba nadie: medido sobre una captura, había figuras a
   * **13,4 celdas** de su sitio, solas en medio del prado. Un campo mide tres
   * por dos; a más de dos celdas ya no estás en él.
   *
   * Esto no lo vio ninguna prueba. Lo vio una imagen.
   */
  MAX_DRIFT: 2.4,
} as const;

export const MARKS = {
  // TUNE: cuánto dura a oscuras un edificio que una decisión apagó. El esquema
  // de `douse` dice qué se apaga y no cuánto. Ocho semanas se ve a ×16 sin
  // convertirse en un edificio roto para siempre.
  DOUSE_TICKS: 8,
} as const;

/**
 * Las riñas (§6.4, §7.9, v3.07). El valle sabía escribir rencores desde M-05 y
 * no hacía nada con ellos: un rencor abierto era una fila en un registro y
 * nadie discutía nunca. Todo TUNE — §6.4 nombraba el rencor, no la riña.
 */
export const QUARREL = {
  // TUNE: probabilidad semanal de que un rencor vivo estalle. Baja a
  // propósito: sale a una riña cada tres o cuatro años por rencor abierto, y
  // una aldea con dos rencores tiene un mal día cada año y medio.
  WEEKLY: 0.022,
  // TUNE: y de que la cosa pase de gritos a manos.
  TO_BLOWS: 0.25,
  // TUNE: los rasgos de §6.3 por fin deciden algo además de quién sale en las
  // encrucijadas. Doce de los quince no cambiaban ningún comportamiento.
  HOT_TEMPERED: 3,
  SPITEFUL: 1.8,
  KIND: 0.4,
  // TUNE: lo que hay que esperar desde que nace el rencor. Un rencor recién
  // escrito no estalla la misma semana: se cuece.
  COOLING_TICKS: 24,
  /**
   * TUNE: y lo que los mismos dos tardan en volver a las andadas.
   *
   * Sin esto hay un bucle: la riña hunde la opinión, una opinión más baja hace
   * más probable la riña siguiente, y los que ya se detestan no trabajan juntos
   * —se apartan (§11.9)— así que la convivencia no les llega nunca. Medido: sin
   * freno, 224 riñas en cinco partidas de 120 años, contra las 21 que hubo
   * antes de que la convivencia existiera. Dos que se pelean cada tres semanas
   * durante treinta años no son dos enemigos: son un mecanismo atascado.
   */
  REPEAT_TICKS: 2 * 48,
  // TUNE: lo que la riña le resta a lo que ya se tenían.
  AFTER_WORDS: -8,
  AFTER_BLOWS: -20,
  // TUNE: y el peso del recuerdo que deja cada uno del otro.
  MEMORY_WORDS: 2,
  MEMORY_BLOWS: 4,
} as const;

/**
 * La convivencia (§6.4, §7.9, v3.09). El contrapeso que faltaba: hasta aquí
 * todas las fuerzas sobre las opiniones empujaban hacia abajo, y un valle así
 * acaba siempre siendo un valle de gente que no se aprecia. Todo TUNE.
 */
export const NEIGHBOUR = {
  // TUNE: lo que sube por semana entre dos que trabajan en el mismo sitio.
  //
  // Tiene que ser MAYOR que OPINION.DRIFT_PER_WEEK, que es 0,05 y lleva todo
  // hacia cero: con 0,04 —el primer valor probado— la convivencia no llegaba
  // nunca a superar al olvido y la mejor opinión de cinco partidas de 120 años
  // era 0,6. Aun así es diminuto al lado de una riña (−8) o del hambre (−18).
  PER_WEEK: 0.12,
  // TUNE: el techo al que llega la convivencia sola. Se puede apreciar a
  // alguien de tanto segar a su lado; para quererlo hace falta que pase algo,
  // y eso lo cuenta el catálogo.
  CEILING: 35,

  // --- §7.9, v3.60 · y la otra cara -----------------------------------------
  //
  // Hasta aquí la convivencia **siempre acercaba**, y era la única fuerza
  // continua del mundo sobre las opiniones: todo lo demás —las tres de §6.4, la
  // riña— necesita una encrucijada, y salen entre siete y doce en cuarenta años
  // (`findings-drama.md` §2). El valle derivaba por tanto hacia la concordia sin
  // remedio, ningún par llegaba jamás a −50, y sin ese cruce no hay rencor, sin
  // rencor no hay riña y sin riña nada empuja una opinión hacia abajo. **Un ciclo
  // que necesitaba un empujón que nadie daba.** Medido: cero rencores y cero
  // riñas en tres partidas de cuarenta años.
  //
  // Esto es el empujón, y no es un número suelto: es que la convivencia deje de
  // ser incondicional. Verse todos los días acerca o desgasta según con quién y
  // según cómo venga el año, que es lo que pasa de verdad.

  /**
   * TUNE: lo que **resta** por semana el roce entre dos caracteres ásperos.
   *
   * Negativo y algo mayor que `PER_WEEK`, porque el desgaste tiene que ganarle
   * al olvido de §6.4 (0,05 hacia cero) para llegar a alguna parte: neto −0,13
   * por semana compartida. Ocho años de segar el mismo campo al lado del mismo
   * hombre difícil para llegar a detestarlo. Un feudo se cuece despacio, y ése
   * es justamente el punto: el catálogo da los estallidos, esto da el poso.
   */
  FRICTION: -0.12,
  /**
   * Los caracteres que se rozan. Son los cinco que el valle ya trataba como
   * difíciles —`temper` en las riñas pesa tres de ellos—, así que esto no
   * inventa una tipología nueva: la usa donde faltaba.
   */
  HARSH: ['spiteful', 'proud', 'stubborn', 'hot_tempered', 'greedy'],
  /**
   * Y los que la desactivan. Basta uno de los dos: alguien amable al lado
   * aguanta a cualquiera, y eso ya es lo que `kind` hace en la riña (×0,4).
   * Sin esta válvula, ocho nombrados con rasgos ásperos repartidos daban un
   * valle donde nadie se aguanta, que es el error contrario al de partida.
   */
  GENTLE: ['kind', 'generous'],
  /**
   * TUNE: cuánto agria el hambre el roce de todos con todos.
   *
   * La convivencia se multiplica por `1 − severity · SOURS`, así que un tercio
   * de hambre la anula y el hambre entera la vuelve del revés. Es la pieza que
   * conecta jugar mal con que la aldea se rompa por dentro: pasar hambre no
   * sólo mata gente, enemista a la que queda. §12.9 pide veinte puntos de
   * distancia entre la política prudente y la adversa y había once; este es el
   * bucle que faltaba, porque hasta ahora el hambre sólo le pasaba factura al
   * líder (`OPINION.HUNGER_TO_LEADER`) y no a los vecinos entre sí.
   */
  SOURS: 3,
  /**
   * TUNE: hasta dónde puede hundir el trato diario, y no más.
   *
   * Simétrico a `CEILING` y con la misma razón: la convivencia sola llega a
   * detestar —cruza el −50 de `OPINION.GRUDGE_AT`, que es lo que desbloquea el
   * ciclo— pero no al odio de los cien puntos. Para eso tiene que **pasar**
   * algo, y eso lo cuenta el catálogo.
   */
  FLOOR: -60,
} as const;

/**
 * §6.3, v3.61 · Lo que el carácter decide fuera del catálogo.
 *
 * Hasta aquí `ambitious`, `craven`, `cunning` y `secretive` no hacían **nada**:
 * estaban en la declaración de tipos y en los pesos de las encrucijadas, y
 * fuera de una decisión del jugador no cambiaban un solo resultado. Cuatro de
 * los quince rasgos eran etiquetas.
 *
 * Esto los pone a decidir, y cada uno en el sitio donde ese carácter se nota de
 * verdad: quién se va cuando la cosa se tuerce, quién aguanta el hambre, quién
 * se toma a mal que el puesto sea de otro, quién no llega a atarse a nadie.
 * Todo TUNE, y todo sobre sorteos que ya existían: antes eran uniformes —daba
 * igual quién fueras— y ahora pesan.
 */
export const CHARACTER = {
  /** TUNE: el cobarde se marcha de los primeros cuando el ánimo cae (§5.7). */
  CRAVEN_LEAVES: 2.5,
  /** TUNE: y el leal es de los últimos en irse. */
  LOYAL_STAYS: 0.4,
  /**
   * TUNE: lo que el astuto se las arregla para comer cuando no hay (§5.3).
   *
   * No es inmunidad: es la mitad de probabilidad de ser el que cae dentro de su
   * propio tramo de edad. El orden de §5.3 —primero los viejos, luego los
   * niños— no se toca; lo que cambia es a quién de ellos le toca.
   */
  CUNNING_SURVIVES: 0.5,
  /**
   * TUNE: lo que le sienta al ambicioso que el puesto sea de otro (§6.2).
   *
   * Más que una acusación pública no, pero se acumula: un ambicioso al que
   * pasan por alto tres veces acaba detestando a quien se lo quedó, y ahí está
   * el empujón que §6.4 nunca tuvo. Es la mitad del catálogo de feudos
   * llegando por donde tenía que llegar: por el carácter de alguien.
   */
  AMBITIOUS_PASSED_OVER: -22,
  /** TUNE: lo poco que ata el reservado, para bien y para mal (§7.9). */
  SECRETIVE_BOND: 0.45,
} as const;

export const MEMORY = {
  MAX: 12, // per named villager
  WEIGHT_MIN: 1,
  WEIGHT_MAX: 5,
  DECAY_PER_YEAR: 0.02,
} as const;

export const OPINION = {
  MIN: -100,
  MAX: 100,
  /** "Living together without incident: +0.05/week, towards 0 from the ends." */
  DRIFT_PER_WEEK: 0.05,
  SPITEFUL_RECOVERY: 0.5, // a spiteful villager forgives at half speed
  LOYAL_RECOVERY: 2.0, // a loyal one at double
  /** A grudge forms when an opinion crosses this going down. */
  GRUDGE_AT: -50,
  /** And heals when it climbs back above this. It is never deleted. */
  GRUDGE_HEALS_AT: -20,
  // The three named events of the §6.4 table. The crossroad templates of M-08
  // quote these rather than writing their own numbers.
  LOST_CHILD_TO_LEADER: -35,
  PUBLICLY_BLAMED: -30,
  WAS_SAVED: 25,
  // §7.9, v3.02 · Lo que el mundo mueve por su cuenta, sin encrucijada de por
  // medio. Los dos son TUNE: §6.4 sólo nombraba los tres sucesos de arriba,
  // que salen todos del catálogo.
  //
  // TUNE: lo que un año de hambre le resta al líder en la cabeza de quien la
  // pasó, en su peor grado. Menos que `PUBLICLY_BLAMED`, porque el hambre rara
  // vez es culpa de una persona y todo el mundo lo sabe — pero se acumula año
  // tras año, y ahí está su fuerza.
  HUNGER_TO_LEADER: -18,
  // TUNE: lo que acerca compartir una desgracia. Perder la casa en el mismo
  // fuego que otro es de las pocas cosas que unen sin que nadie lo decida.
  SHARED_LOSS: 12,
} as const;

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export const PEOPLE = {
  /** §6.1: how many people the player can hold in their head at once. */
  MAX_NAMED: 8,
  /**
   * The age floor for taking an office. §6.2 weighs age when filling a
   * vacancy but said nothing about the founding, and without a floor the
   * village was founded by seventeen-year-old midwives.
   *
   * `herbalist` and `stranger` have no floor: one arises out of need, the
   * other walks in from outside.
   */
  ROLE_MIN_AGE: {
    leader: 25,
    midwife: 28,
    priest: 25,
    smith: 20,
    woodward: 18,
    reeve: 22,
  },
  /**
   * §6.2: the top of the band a vacancy is filled from. Above it, only if
   * nobody in the band will do.
   *
   * Reading "chosen by age" as "the oldest" ages the whole cast in a few
   * decades: the offices always go to elders, the elders die soon, and the
   * succession — which should be the beat of a generation — fires at twice its
   * natural rate. Measured: 9.55 successions a century against the 3.6 a
   * forty-year-old leader earns under the table of §12.4.
   */
  ROLE_MAX_PREFERRED: 55,
} as const;

// ---------------------------------------------------------------------------
// `src/ui/milestones.ts` — design.md §11.6
// ---------------------------------------------------------------------------

export const MILESTONES = {
  // TUNE: `milestonesAt`'s peak_people only fires on a round multiple of this
  // many people, so a growing village does not celebrate a new record every
  // week it takes in one more mouth. No source in §12 gives this number; ten
  // is the smallest step that still reads as "a while since the last one"
  // against the population the balance tables put in a mature valley.
  PEAK_PEOPLE_STEP: 10,
} as const;

// ---------------------------------------------------------------------------
// `src/ui/sound.ts` — U-09, design.md §11.1, §11.4, §11.6
//
// Presentation only, the same standing as BUBBLE, ENCOUNTER and DAY above:
// none of this moves a number of the game and none of it is saved, but §2
// still forbids a number of the game living loose in a drawing file, and a
// duration or a gain is a number. Everything here is synthesised with Web
// Audio — no file, ever (CLAUDE.md) — so what needs fixing is timings and
// levels, never a byte count.
// ---------------------------------------------------------------------------

export const SOUND = {
  // TUNE: gain of the wind bed, 0..1, by season. No source in §12 sets a
  // mood for the seasons in sound; the valley already reads winter as the
  // hard season (§5.5's wood, §12.3's cold) and summer as the easy one, so
  // the wind follows that same shape — loudest in autumn and winter, softest
  // in summer — rather than inventing a second one.
  WIND_BY_SEASON: { spring: 0.32, summer: 0.18, autumn: 0.5, winter: 0.75 },
  // TUNE: the river's own gain. Constant and modest — it must sit under the
  // wind, never compete with it, the way a real river does at the distance a
  // village stands from its bank.
  RIVER_GAIN: 0.22,
  // TUNE: how loud one anvil strike or one toll of the bell is against the
  // ambient bed.
  FORGE_GAIN: 0.5,
  BELL_GAIN: 0.4,
  // TUNE: real seconds between one anvil strike and the next, and between one
  // toll and the next — wall clock on purpose, like NOTICE_MS and MOMENT_MS
  // above: this is decorated background, not a schedule the chronicle keeps,
  // and no seed has to reproduce it. Wide enough apart that neither reads as
  // a metronome; the forge quicker than the bell because a smith's hammer
  // falls far oftener than a chapel calls anyone to anything.
  FORGE_INTERVAL_S: [7, 14],
  BELL_INTERVAL_S: [40, 70],
  // TUNE: how long a layer takes to fade in or out when what it represents
  // appears or disappears (a smithy lighting its forge, a chapel going up).
  // A jump would read as a splice; this is long enough to be a fade and short
  // enough that the change still lands near the moment that caused it.
  AMBIENT_FADE_S: 2.5,
  // TUNE: the accent's own gain and length (§11.6, §11.8's "raro" principle
  // read onto sound): a beat, not a fanfare, over in about a second.
  // TUNE: el trueno de U-13. Más largo y más grave que los otros acentos
  // —un trueno rueda, no repica— y algo más bajo, porque puede caer varias
  // veces en la misma tormenta y un trueno al volumen de un hito cansa.
  THUNDER_GAIN: 0.42,
  THUNDER_DURATION_S: 2.4,
  ACCENT_GAIN: 0.55,
  ACCENT_DURATION_S: 1.1,
  // TUNE: the minimum real time between two accents. §11.4's own case — a
  // speed jump, or the batch a single animation frame can run — can call the
  // trigger more than once before any sound has actually played; this is the
  // wall-clock floor that keeps two of those from stacking into one ugly
  // instant rather than the rare, single beat the design asks for. Wall clock
  // on purpose: what this guards against is a playback artefact, not
  // something that happened in the game.
  ACCENT_MIN_GAP_MS: 2_500,
} as const;
