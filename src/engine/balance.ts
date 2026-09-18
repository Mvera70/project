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
  // TUNE: **cuánto levanta un albañil en una semana, y cuántas manos tiene
  // garantizada la obra** (B-1, 18 sep 2026). Los dos números de esta pareja
  // eran 2,0 y 0,15 desde M-02, y los dos se fijaron cuando la aldea se fundaba
  // con veinte personas: con la fundación en pareja de v3.69, un caserío de
  // cinco pone **0,45 albañiles a 0,9 puntos por semana** y una casa de 40
  // puntos cuesta **cuarenta y cuatro semanas** — casi un año de aldea entera
  // para cinco camas. Ese era el techo de todo lo demás: sin camas no llega
  // gente, sin gente no se abren las puertas de §7.3, y sin obras no hay piedra.
  //
  // Medido en 16 semillas × 30 años, en horas de reloj de pared a ×1 (que es la
  // unidad que el dueño del diseño puso: «la edad de piedra en 60/70 horas»):
  //
  //   | bp · reserva | 15 pers | granero | capilla | herrería | piedra | obra de piedra |
  //   |---|---|---|---|---|---|---|
  //   | 2 · 0,15 (antes) | 70 h | 61 h | 102 h | 153 h | 153 h | 177 h |
  //   | 3 · 0,30 | 42 h | 45 h | 54 h | 60 h | 60 h | 94 h |
  //   | **4 · 0,30** | **34 h** | 56 h | 44 h | 55 h | 55 h | **72 h** |
  //   | 5 · 0,30 | 31 h | 42 h | 51 h | 49 h | 49 h | 70 h |
  //
  // 4 y 0,3 es el codo: con 5 la escalera ya no se mueve (70 h contra 72) y una
  // casa bajaría de diez a ocho semanas-persona, que deja de parecer una casa.
  // Y no es sólo velocidad: las semanas con el ánimo por debajo de 25 caen del
  // 27 % al 7 % y ningún valle de dieciséis se acaba, porque lo que hundía el
  // ánimo era dormir en el suelo.
  BP_PER_BUILDER: 4.0, // build points per week
  WORKS_RESERVE: 0.3, // minimum fraction of W given to works
  CUTTER_SHARE: 0.4, // of what is left after the fields
  // ---------------------------------------------------------------------------
  // **El balanceo del 17 sep 2026: la aldea corta la leña que necesita.**
  //
  // Pedido por el dueño del diseño al cerrar las cinco fases: «lo primero es
  // balancearlo un poco … sobre todo de los recursos básicos, las decisiones
  // deben complementarse». Y lo que la medida enseñó es que la cuota fija de
  // `CUTTER_SHARE` hacía las dos cosas mal a la vez (24 semillas × 60 años):
  //
  //   · un valle que no recibe nada del jugador pasa **82 semanas de invierno
  //     con la leñera vacía** —el frío de §5.4— porque manda al bosque una
  //     parte de lo que sobra y no lo que hace falta;
  //   · y uno con arado acaba con **20 415 de leña** en el almacén, que es leña
  //     cortada para nada mientras la obra y la cantera esperan manos.
  //
  // Con la necesidad delante, las dos se arreglan con la misma regla y **las
  // decisiones se complementan**: el hacha (M-4) deja de ser leña que se apila
  // y pasa a ser **manos libres**, porque la misma necesidad se cubre con menos
  // leñadores; y el arado sigue siendo lo que libera brazos del campo.
  // ---------------------------------------------------------------------------
  /**
   * Cuántas semanas de invierno se quiere tener en la leñera.
   *
   * TUNE: doce, que es un invierno entero (§3.2). Con menos, un año de nieve
   * larga deja a la aldea al raso; con mucho más, vuelve el almacén de veinte
   * mil.
   */
  WOOD_TARGET_WEEKS: 12,
  /**
   * Y el fondo de obra: madera en la leñera por encima del invierno, para que
   * §7.3 pueda abrir el proyecto siguiente sin esperar a que alguien vaya al
   * bosque.
   *
   * TUNE: 250, que es un granero (120) y una casa (60) con margen.
   */
  WOOD_WORKS_STOCK: 250,
  /**
   * El suelo de leñadores, como parte de lo que sobra tras el campo.
   *
   * TUNE: 0,1. Existe por dos razones y ninguna es el balance: con la leñera
   * llena, cero leñadores dejaría el bosque sin nadie y el valle se lee vacío
   * (§11.1, el valle es el HUD); y un suelo evita que una semana de abundancia
   * apague la tala y la siguiente la encienda a tope, que en pantalla es gente
   * andando de un lado a otro sin motivo.
   */
  CUTTER_FLOOR_SHARE: 0.1,
  /**
   * Y el **techo** de leñadores, como parte de lo que sobra tras el campo.
   *
   * No es un número de gusto: es el suelo de la obra visto del otro lado. Sin
   * él, una leñera vacía se lleva **todas** las manos libres al bosque y la
   * aldea deja de construir, que es «el pecado capital de este juego» escrito
   * en §5.2 desde la v2.0 —y lo que cazó `forage.test.ts` al balancear: «la
   * aldea hambrienta sigue construyendo: la reserva de obras sobrevive»—.
   *
   * TUNE: 0,6, que es lo que la cuota fija dejaba en su posición más extrema
   * hacia el bosque (`RESTING_TIMBER` era 0,4 y la palanca llegaba a 1, pero la
   * reserva de obra de §5.2 ya apartaba su parte antes). Con esto, la obra
   * conserva cuatro de cada diez manos libres en el peor invierno.
   */
  CUTTER_CAP_SHARE: 0.6,
  /**
   * En cuántas semanas se quiere cubrir lo que falta.
   *
   * TUNE: 8. No es un número de balance sino de suavidad: cubrir el hueco en
   * una sola semana manda a todo el mundo al bosque de golpe y lo vacía la
   * semana siguiente.
   */
  WOOD_CATCH_UP_WEEKS: 8,
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
  // TUNE: la probabilidad de arriba es la de una aldea hecha. **En un caserío
  // se reparte a la baja, en proporción a la gente que hay**, y no por
  // protegerlo: por proporción. Con la tirada plana, una pareja y una aldea de
  // cuarenta tenían la misma densidad de sucesos —doce al año—, o sea que la
  // pareja recibía una catástrofe por trimestre y no se recuperaba nunca:
  // medido en doce semillas a cuarenta años, **ocho se rompían** y el ánimo
  // pasaba por debajo de 25 entre dieciocho y treinta y siete años de cada
  // cuarenta. Y eso no es lo que el dueño del diseño pidió: «que una partida
  // salga mal por casualidad está bien, que casi todas se vayan a romper no es
  // la idea; no hay que poner límites, hay que equilibrar».
  //
  // No es una puerta: no impide **ningún** suceso, ni siquiera el rayo sobre la
  // única casa. Sólo hace que en un caserío de tres pase algo cada muchas
  // semanas y en una aldea de cuarenta cada dos, que además es más variedad
  // entre valles y no menos: el caserío tiene una vida callada y la aldea un
  // noticiario, y eso se compara.
  //
  // **B-1 (18 sep 2026): el suelo sube de 0,25 a 0,5**, y es una corrección de
  // fecha, no de gusto. Ese 0,25 se midió en v3.78 **antes** de que M-1 pusiera
  // la gracia de la pareja (`GRACE_PEOPLE`/`GRACE_YEARS`/`GRACE_FACTOR`, 17
  // sep): lo que rompía ocho valles de doce no era la cantidad de sucesos, era
  // que los destructivos pesaban igual en una aldea de tres que en una de
  // cuarenta, y eso ya lo amortigua la gracia. Con la gracia puesta, el suelo
  // en 0,5 sale **gratis**, medido en 24 semillas × 20 años: los sucesos del
  // primer año pasan de 3 a 7, y las muertas (0 de 24), el ánimo (26 % de
  // semanas por debajo de 25) y la población del año 20 (22 contra 23) no se
  // mueven. Con 1 —o sea con la tirada plana de v3.75— vuelve el destrozo: la
  // población del año 20 cae a 12.
  //
  // Y el motivo de subirlo es del dueño del diseño, con el juego delante: «en
  // los primeros meses deben pasar eventos ya, dinamismo por favor». A catorce
  // minutos por semana, 3 sucesos al año es uno cada cuatro horas de reloj de
  // pared; 7 es uno cada hora y media.
  FATED_FULL_PEOPLE: 20,
  FATED_LEAST_SHARE: 0.5,
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
    // M-0 · las visitas del camino. El buhonero ya pesaba 2 y ése es el
    // listón: una visita tiene que ser una cosa que pasa, no una rareza.
    // TUNE: medido con `tools/agency-report.ts` contra «la plata entra y sale
    // al menos una vez por década» (brief M-0).
    factor_visit: 2,
    drover_visit: 1.5,
    salt_visit: 1,
    // M-2 · lo que los medios abren. `ale_feast` no se sortea —la paga el
    // jugador— y las otras dos piden el corral o el granero lleno.
    ale_feast: 0,
    pig_slaughter: 1.5,
    rats_in_the_granary: 2,
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
  // TUNE: el buhonero, en verano y sólo si hay leña de sobra (el doble de lo
  // que se lleva). Desde M-0 **compra** la leña con plata en vez de cambiarla
  // por grano, y sólo si el jugador acepta: ver `OFFER`.
  PEDLAR_WOOD: 15,
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
  // ---------------------------------------------------------------------------
  // M-1 · **El mundo contesta a lo que hay.** `docs/rework.md` §4b.
  //
  // No es «el mundo mata solo»: la decisión 4 del dueño del diseño dice que una
  // aldea no se muere sin motivo y que de primeras no se muere —«que caiga un
  // rayo en una casa y eso ya se muera no tiene gracia; se puede morir, pero
  // más adelante, porque ya hemos tomado varias decisiones que hacen que se
  // tumbe»—. Así que lo que el mundo puede romper **escala con lo que el
  // jugador ha metido**: más ganado, más lobos; más bosque talado, más riada;
  // más grano y más plata, más ladrones y más señor.
  //
  // Todos TUNE, medidos con `tools/agency-report.ts`: un valle intocado tiene
  // que morir lo mismo que antes de M-1, y un valle cargado de animales y con
  // el bosque talado, bastante más.
  // ---------------------------------------------------------------------------
  /** Por cabeza de cerdo o vaca en el corral, cuánto más pesan los lobos. */
  WOLVES_PER_HEAD: 0.15,
  /** Y cuánto menos si hay empalizada o atalaya en pie: algo que saltar. */
  WOLVES_WALLED: 0.4,
  /** Con el corral lleno, los lobos se llevan un cerdo y no sólo gallinas. */
  WOLVES_PIG_DENSITY: 0.6,
  /** Por cada parte del bosque del corazón que ya no está, cuánto sube la riada. */
  FLOOD_PER_FELLED: 2,
  /** La plata a partir de la cual un valle es «rico» para el ladrón y el señor. */
  RICH_SILVER: 40,
  /**
   * **La gracia de la pareja.** Mientras la aldea sea más pequeña que esto o
   * más joven que `GRACE_YEARS`, lo que destruye pesa una cuarta parte.
   *
   * No es una puerta —el rayo puede caer igual, que es §2.6— y no protege para
   * siempre: es que una aldea de cuatro personas en su tercer año no ha tomado
   * todavía ninguna decisión que la pueda tumbar, así que romperla no cuenta
   * una historia, sólo corta una.
   */
  GRACE_PEOPLE: 6,
  GRACE_YEARS: 5,
  GRACE_FACTOR: 0.25,
  // ---------------------------------------------------------------------------
  // M-2 · Las dos caras de cada medio, en pesos.
  // ---------------------------------------------------------------------------
  /** Cerdos mínimos para que la fiesta de la cosecha tenga matanza. */
  SLAUGHTER_MIN_PIGS: 3,
  /** Lo que la matanza deja: comida y ánimo. */
  SLAUGHTER_GRAIN: [20, 40],
  SLAUGHTER_MORALE: 3,
  /** Las ratas: piden el granero por encima de esta parte de su capacidad. */
  RATS_FULL: 0.8,
  RATS_GRAIN_LOSS: 0.1,
  RATS_MORALE: -2,
  /** La fiesta del barril: lo que sube de golpe, y lo que la fe piensa de ello. */
  ALE_MORALE: 8,
  ALE_FAITH: -1,
  /** Y lo que el barril hace probable durante su ventana: bodas… y riñas. */
  ALE_WEDDING: 3,
  ALE_QUARREL: 3,
  // TUNE (M-0): lo que deja un forastero que duerme en la aldea. Es la plata
  // de antes de la primera venta: sin ella un valle joven no ve ni una moneda
  // hasta que tiene excedente que vender.
  STRANGER_SILVER: 2,
} as const;

// ---------------------------------------------------------------------------
// M-0 · Las ofertas del camino y el diezmo. `docs/plan-medios.md` §6
// ---------------------------------------------------------------------------

/**
 * **Los precios de quien sube por el camino.** Todos TUNE, y la escala sale de
 * lo medido y no de un gusto: la leña **no es escasa** en este juego —el
 * comentario del factor de grano en `catalog/trade.ts` midió existencias de
 * 507 a 43 000 en cien años— y el grano sobrante es corriente (2 600 de
 * mediana a los sesenta años, `plan-medios.md` §1). Así que lo que vale es la
 * **plata**, que no se produce dentro, y los tratos se miden en ella.
 */
export const OFFER = {
  // TUNE: cuántas semanas espera quien ha subido antes de seguir camino.
  WEEKS: 2,
  // El buhonero compra leña.
  PEDLAR_WOOD: 80,
  PEDLAR_SILVER: 6,
  // El factor compra el grano que sobra por encima de `FACTOR_KEEP_YEARS` años
  // de comida, redondeado a diez y con tope. Llega en otoño, después de la
  // siega, que es cuando sobra. Vender es dejarse ver: pone `watched`, que es
  // el precio de verdad que la encrucijada del factor ya tenía.
  // TUNE, medido: con un año, la pareja fundadora que aceptaba vendía el grano
  // que la separaba del hambre y **la semilla 9 se extinguía en el año 2**. Dos
  // años de comida en el granero no los compra nadie.
  FACTOR_KEEP_YEARS: 2,
  FACTOR_MIN_GRAIN: 60,
  FACTOR_MAX_GRAIN: 400,
  SILVER_PER_GRAIN: 0.05,
  FACTOR_WATCHED_YEARS: 15,
  // El tratante vende una vaca en primavera si hay corral para ella.
  DROVER_SILVER: 12,
  // El salinero vende sal: la carne se guarda más (`salted`, `herd.ts`).
  SALT_SILVER: 5,
  SALT_YEARS: 12,
  // La visita del tratante y del salinero no llega a una aldea que no puede
  // pagarla: una oferta que nadie puede aceptar no es una oferta.
  //
  // TUNE, medido: un caserío no recibe comerciantes. Sin este suelo, aceptar
  // ofertas bajaba la población mediana a los sesenta años de 47 a 15 y mataba
  // seis aldeas de dieciséis, casi todas parejas que vendían lo que las
  // mantenía vivas. Las encrucijadas de comercio pedían diez personas; ocho
  // deja entrar al camino una década antes.
  MIN_PEOPLE: 8,
  // TUNE, medido: semanas mínimas entre dos visitas **de la misma clase**. Sin
  // ellas el factor subía 1 181 veces en dieciséis partidas de sesenta años
  // —más de una al año— y tapaba al resto de sucesos. El ritmo que el dueño
  // pide («cada semana, cada mes, cada tres meses que pasen cosas») es de
  // cosas distintas, no del mismo hombre con el mismo carro.
  AGAIN_WEEKS: {
    pedlar: 24,
    factor_visit: 48,
    drover_visit: 48,
    salt_visit: 96,
  },
} as const;

/**
 * M-0 · **El ánimo se enseña como cara, no como cifra** (decisión del dueño del
 * diseño, 17 sep 2026: «creo que no varía nada, siempre está en 55, 50, 60»).
 *
 * Y medido, la cifra engañaba: en sesenta años el ánimo va de 6 a 79 y pasa el
 * 17 % de las semanas por debajo de 10 (`docs/plan-medios.md` §6.2). Lo que
 * pasa es que vive a escala de años —lo mueve la cosecha, una vez— y se mira a
 * escala de semanas, así que un número que no se mueve en una sesión se lee
 * como un número muerto. Una cara dice lo mismo sin prometer precisión.
 *
 * TUNE: los tres cortes. Por debajo de `LOW` la aldea está hundida —y medido,
 * ahí pasa una semana de cada seis—, y por encima de `GLAD` está contenta,
 * que es el año bueno.
 */
export const MOOD_FACE = {
  LOW: 20,
  GRIM: 40,
  GLAD: 70,
} as const;

// ---------------------------------------------------------------------------
// M-2 · Los medios: lo que el jugador mete en el valle. `plan-medios.md` §3
// ---------------------------------------------------------------------------

/**
 * **Los precios, y de dónde sale su escala.** Todos TUNE.
 *
 * Lo que el dueño del diseño decidió el 17 sep: un medio **cuesta lo del
 * valle** —«no quiero que sea gratis»— y no hay contador de espera, así que el
 * límite es el granero y la leñera. Y la escala sale de lo medido: la leña no
 * es escasa (de 507 a 43 000 en cien años) y el grano sobrante es corriente
 * (2 600 de mediana a los sesenta años), así que **lo que de verdad limita es
 * la plata**, que no se produce dentro del valle y entra a cuentagotas por el
 * camino (M-0: unas dos docenas por década).
 *
 * De ahí que los tres cuesten plata: con doce por el arado y ocho por los
 * cerdos, un valle que comercia puede dar dos o tres medios por década, y uno
 * que no comercia, casi ninguno. Eso es una decisión de verdad y no una compra.
 */
export const MEANS = {
  /** Semanas que la fiesta del barril sigue tiñendo lo que pasa. */
  ALE_WEEKS: 4,
  /**
   * El arado: un campo se trabaja con esta parte de las manos que pedía.
   *
   * TUNE. No sube la cosecha: **libera brazos**, que es la diferencia entre un
   * medio y un número mejor. Lo que la aldea haga con los brazos que sobran lo
   * decide `allocateLabour` por necesidades, y ahí el jugador no manda.
   */
  PLOUGH_CREW: 0.6,
  /**
   * El hacha buena: cada leñador trae esta proporción de leña.
   *
   * TUNE. Y su cara mala no hay que inventarla: el bosque del corazón retrocede
   * más rápido, y la riada pesa con el bosque que ya no está (M-1). Un hacha es
   * leña ahora a cambio de agua después.
   */
  AXE_WOOD: 1.4,
  /**
   * Y lo que el hacha hace en la obra, que es **lo que la vuelve una decisión**.
   *
   * TUNE, y con su motivo medido: con sólo `AXE_WOOD`, el hacha no cambiaba
   * nada —39 de población contra 38, y el mismo reparto de manos (76/10/12
   * contra 77/10/12)—. La causa no era el número sino la aritmética: **la leña
   * ocupa la décima parte de las manos**, así que multiplicarla sólo podía
   * liberar un 3 % de la aldea. Una herramienta que sólo mejora una tarea
   * pequeña no es una decisión.
   *
   * Un hacha buena no es sólo para talar: es la herramienta con la que se
   * escuadran las vigas. Así que también levanta la obra, y con eso **las tres
   * decisiones se complementan** en vez de repetirse: el arado libera manos del
   * campo, el hacha hace que esas manos rindan más en la obra, y la reliquia
   * abre la capilla que ninguna de las dos abre.
   */
  AXE_WORKS: 1.15,
  /**
   * La reliquia: a dónde deriva la fe con ella en la capilla.
   *
   * TUNE. La fe abre la capilla (§7.3 pide 45) y con ella el cura y el ánimo
   * que sostiene; la reliquia es la forma de llegar ahí sin esperar una
   * generación. Su precio no es sólo la plata: un valle con reliquia es un valle
   * del que se habla, y de eso vive el señor (`watched`).
   */
  RELIC_FAITH: 62,
  RELIC_WATCHED_YEARS: 12,
  // C1 · **el señor cuenta las armas** (§7.12). Doce años, los mismos que la
  // reliquia: las dos cosas hacen que se hable del valle, y de eso vive
  // Wealdmere. No es un castigo aparte, es `watched` de siempre.
  ARMS_WATCHED_YEARS: 12,
  /** El forastero que se queda: los inviernos que ya tiene al llegar. */
  HAND_AGE: 24,
} as const;

/** El señor cobra cada otoño. Decisión del dueño del diseño, 17 sep 2026. */
export const TITHE = {
  // TUNE: semanas después de la siega. Cuatro: el grano ya está en el granero.
  WEEKS_AFTER_HARVEST: 4,
  // TUNE: la parte de la plata que se lleva.
  SILVER_SHARE: 0.1,
  // TUNE: sin plata, se cobra en grano **sólo de lo que sobra** por encima de un
  // año de comida, al cambio de `OFFER.SILVER_PER_GRAIN`: el diezmo no puede
  // matar de hambre a nadie (decisión 4 del dueño: el mundo no mata sin motivo).
  GRAIN_OF_SURPLUS: 0.1,
  // TUNE: un caserío no le interesa al señor.
  MIN_PEOPLE: 10,
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

/**
 * §1b · **El clan del valle vecino** (B1, 18 sep 2026).
 *
 * Quien ataca es otro valle, por decisión del dueño del diseño, y de ahí salen
 * las dos mitades de esta tabla: **lo que el clan junta corre con los años**
 * —es un valle que se desarrolla en paralelo y no sabe que existes— y **lo que
 * tú has juntado decide si bajan y con cuántos**, que es §1 visto desde la otra
 * ladera: la letalidad sale de lo que el jugador acumuló.
 *
 * Todos TUNE, y todos con la misma advertencia escrita: **son la primera talla
 * y se nivelan al final**, que es donde el dueño puso el balance. Lo que esta
 * tabla tiene que hacer bien hoy es que la amenaza exista, crezca y llegue;
 * cuánto duele es de la fase G.
 */
export const THREAT = {
  /**
   * Cuántos hombres junta el clan cada año. Dos: al cabo de veinte años son
   * cuarenta, del orden de lo que una aldea hecha tiene de gente (mediana 48 a
   * los sesenta años, medido en B-1), así que el vecino es un igual y no una
   * marea. Con la variación de abajo, dos valles vecinos no crecen igual.
   */
  GROWTH_PER_YEAR: 2,
  /** Cuánto varía ese crecimiento, arriba y abajo. Medio: de 1 a 3 al año. */
  GROWTH_SPREAD: 0.5,
  /**
   * **Y el techo, porque el vecino es un valle y no una marea.** Sesenta
   * hombres: medido en B-1, un valle llega a 48 personas de mediana y 80 en el
   * mejor caso a los sesenta años, así que sesenta es «todos los que el valle
   * de al lado puede armar» y no un ejército de la nada.
   *
   * Hacía falta por la forma, no por el balance: sin techo, el clan crecía dos
   * al año para siempre y a los ochenta años bajaban **partidas de 152
   * hombres** contra aldeas de cuarenta y ocho (medido con
   * `tools/threat-report.ts`). Eso no es el valle de al lado, es una invasión.
   */
  STRENGTH_CAP: 60,
  /**
   * Antes de este año no baja nadie, por muy rica que sea la aldea.
   *
   * Cinco, y es la misma idea que la gracia de la pareja de M-1: una aldea que
   * no ha tomado todavía ninguna decisión no tiene nada que se le pueda volver
   * en contra, y que la maten en el año dos no cuenta una historia, corta una.
   */
  MIN_YEAR: 5,
  /**
   * Cuánto tienta un valle. Lo que se mira es **lo que se ve desde fuera**:
   * la plata, el grano del granero y el ganado suelto. No las casas: nadie baja
   * de la sierra por unas vigas.
   */
  WORTH_PER_SILVER: 1,
  WORTH_PER_GRAIN: 0.02,
  WORTH_PER_HEN: 0.5,
  WORTH_PER_PIG: 2,
  WORTH_PER_COW: 4,
  /**
   * El valor a partir del cual la aldea tienta del todo. 120, y sale de medir
   * qué vale un valle hecho: a los cuarenta años la mediana ronda ese número
   * (`tools/threat-report.ts`). Por debajo, la probabilidad baja en proporción.
   */
  WORTH_FULL: 120,
  /** La probabilidad anual de que bajen, con la aldea tentando del todo. */
  YEARLY_CHANCE: 0.35,
  /**
   * Semanas entre que el clan decide bajar y llega. Ocho: dos meses de juego,
   * que a ×1 son casi dos horas de reloj. Es el hueco en el que B2 mete el
   * aviso y el jugador puede hacer algo.
   */
  WARNING_WEEKS: 8,
  /**
   * De cuánto es la partida que baja: una parte de lo que el clan tiene, mayor
   * cuanto más tienta la aldea. Un valle pobre ve bajar a cuatro; uno rico, a
   * todos los que el vecino puede armar.
   */
  BAND_LEAST_SHARE: 0.25,
  /** Y nunca menos de esto, o no es una partida, es un paseo. */
  BAND_MIN: 4,
  /**
   * C1 · **Las armas**: lo que la aldea armada se lleva de menos. Dos tercios
   * de lo que se llevarían, y **no más**: unas lanzas en la herrería no son una
   * guarnición. Lo que de verdad cambia un asalto es la gente en la muralla, y
   * eso es la fase 4.
   */
  ARMS_SACK: 0.66,
  /**
   * C1 · **Los arcos**: lo que deja de tentar un valle del que se sabe que
   * dispara. Se aplica al valor que el clan ve (`worthOf`), así que baja a la
   * vez la probabilidad de que bajen y el tamaño de la partida.
   */
  BOWS_TEMPTATION: 0.7,
  /**
   * Y su cara mala: cuando por fin bajan, bajan con más gente. Quien se arma
   * deja de ser un sitio al que se va a robar y pasa a ser un sitio al que hay
   * que ir en serio.
   */
  BOWS_BAND: 1.3,
  /**
   * C1 · **La atalaya**: las semanas de aviso pasan de ocho a esto. Catorce, o
   * sea un trimestre largo: tiempo para meter el ganado, esconder el grano o
   * mandar la plata, que son exactamente las tres salidas que B2 ofrece.
   */
  WATCH_WARNING_WEEKS: 14,
  /**
   * B2 · Lo que cuesta que se den la vuelta. Treinta de plata: lo mismo que
   * cuesta una corona (`CROWN.SILVER`), y es a propósito — pagar a quien viene
   * a robarte cuesta lo que coronar a un hombre, y las dos son decisiones de
   * las que se toman una vez cada muchos años.
   */
  PAY_OFF_SILVER: 30,
  /**
   * B2 · Lo que se salva la aldea que se prepara (`braced`): esconde el ganado,
   * mete el grano y atranca. Se llevan la mitad.
   */
  BRACED_SACK: 0.5,
  /**
   * B2 · Y lo que cuesta pagar, a la larga: el vecino que cobró una vez vuelve
   * **antes**. La marca `known_to_pay` multiplica la probabilidad anual de que
   * bajen mientras dura.
   */
  KNOWN_TO_PAY_CHANCE: 1.8,
  /**
   * Lo que se llevan cuando saquean: esta parte de la plata y del grano.
   *
   * **Es la mitad pequeña de «caer»** (§1b): entran, se llevan lo que pueden y
   * se van, y la aldea sigue con lo que queda. La mitad grande —la que acaba la
   * partida— necesita la batalla física y no está hecha.
   */
  SACK_SHARE: 0.4,
  /**
   * Y lo que la muralla cerrada les quita. Con el anillo cerrado y su portón
   * en pie se llevan una cuarta parte de lo que se llevarían a campo abierto:
   * no es inmunidad —lo de dentro no está a salvo hasta que haya quien lo
   * defienda (C) y la puerta aguante (D)— es la diferencia entre un pueblo
   * abierto y uno cerrado.
   */
  WALLED_SACK: 0.25,
  /**
   * B3 · **Lo que vale el cerco cuando hay que contarlo como defensa.**
   *
   * El anillo cerrado vale cuatro manos y su puerta dos más
   * (`world/garrison.ts`, `resistance`). No son un número de gusto: son lo que
   * hace que **la muralla decida** en la cuenta de si una partida entra o sólo
   * saquea. Con el valle hecho —siete manos con todo dado— un cerco cerrado con
   * puerta lleva la resistencia de 7 a 13, o sea que dobla lo que hace falta
   * para tomar el valle. Medido en doce semillas: sin esto, **cayeron 12 de 12**
   * antes del año sesenta; con esto, cae lo que se cuenta en el registro de B3.
   *
   * Y es la traducción de §1b a números: «uno grande que rompa el portón y entre
   * entero acaba la partida» — el portón es lo primero que hay que romper, así
   * que tiene precio.
   */
  WALL_WORTH: 4,
  GATE_WORTH: 2,
  /**
   * B3 · **Cuántas veces la resistencia tiene que ser la partida para entrar.**
   *
   * TUNE: **cuatro**, y está medido en doce semillas × ochenta años con las dos
   * maneras de jugar que importan:
   *
   *   tres  → tomados **12 de 12** sin dar nada, 2 de 12 dándola. El juego se
   *           acaba siempre, y la escalera del ritmo lo dijo sin rodeos: 23 de
   *           24 partidas acabadas, 22 de ellas tomadas.
   *   cuatro → tomados **3 de 12** sin dar nada (a las 304–819 h de reloj) y
   *           **0 de 12** dándola. Hay caos y la defensa sirve.
   *   cinco → **0 de 12** en las dos. La mecánica no se dispara nunca.
   *
   * Cuatro es además la regla de asedio de siempre con el margen que el cerco
   * merece —hacen falta tres o cuatro contra uno para tomar una posición
   * fortificada— y deja el juego donde el dueño del diseño lo quiere: «que haya
   * partidas que se rompan es la idea», tres de doce, y «si la vas cagando, el
   * valle puede morir». El nivelado fino es suyo y va al final (G4).
   *
   * **Y esto es sólo la mitad determinista.** Desde B4, el resultado de la
   * batalla física puede entrar por la puerta de `PlayerAct` y decir otra cosa:
   * esta cuenta es lo que pasa cuando nadie ha mirado la pelea.
   */
  STORM_ODDS: 4,
  /**
   * B3 · **Lo que vale cada adulto de la aldea defendiendo su casa.**
   *
   * TUNE: ver la medida en el registro de B3. No son soldados —los soldados son
   * la guarnición de C2, que sale de lo que se dio— pero tampoco son cero:
   * quien entra a robar en un pueblo de treinta se pelea con treinta.
   *
   * Hizo falta porque sin esto la resistencia de un caserío eran dos manos y
   * **cualquier** partida la triplicaba: cayeron 12 de 12 valles, el primero a
   * las 58 h de reloj, con seis hombres. Eso no es «caer» (§1b), es un juego que
   * no se puede jugar.
   */
  HOMESTEAD_SHARE: 0.5,
  /**
   * B3 · **Y el techo de eso, que es lo que hace que la defensa importe.**
   *
   * Sin techo, la resistencia de una aldea grande la pone su censo y no sus
   * decisiones: medido, la semilla 7 llegaba a **28,5 de resistencia con dos
   * manos**, o sea que hacían falta 86 hombres para tomarla cuando el clan tiene
   * un techo de 60 — inmortal por ser numerosa, y eso es justo lo contrario de
   * «se cae por las decisiones» (§1b).
   *
   * TUNE: **diez**, medido junto a `STORM_ODDS` (ver arriba). Es lo que valen
   * las manos sin entrenar de un pueblo entero, del orden de la guarnición de
   * siete que sale de haber dado lanzas, arcos y fragua: así lo que decide es
   * **lo que se dio**, y el censo sólo evita que a un caserío se lo lleven seis
   * hombres.
   */
  HOMESTEAD_CAP: 10,
  /**
   * B3 · Hasta dónde se lleva por delante el cerco la partida que entra, en
   * celdas alrededor del portón.
   *
   * Dos: la puerta y las dos estacas de cada lado, que es el boquete por el que
   * cabe un grupo. No es el anillo entero —una aldea tomada sigue teniendo su
   * muralla, con un agujero— y eso importa para lo que se ve: un cerco con el
   * portón arrancado cuenta lo que pasó mejor que un solar vacío.
   */
  BREACH: 2,
} as const;

/**
 * C2 · **La guarnición: quién sube a la muralla cuando bajan.**
 *
 * §1b lo dice literal —«el tower defense es literal: las torres son aldeanos
 * en la muralla disparando»— y con la regla que manda sobre todo lo demás:
 * **nada se coloca con el dedo**. Aquí no hay una orden del jugador; hay una
 * cuenta de cuántas manos deja la aldea de hacer lo suyo para ir al cerco, y de
 * con qué suben, que sale de lo que se le dio (C1: `arms`, `bows`, `tower`).
 *
 * Quien va lo elige la aldea —el reparto de la jornada, por cercanía al puesto,
 * como reparte los oficios (`life/day.ts`)— y no esta tabla.
 */
export const GARRISON = {
  /**
   * Cuántas semanas antes de que lleguen se sube al cerco.
   *
   * TUNE: dos. El aviso de B2 llega **ocho** semanas antes (catorce con
   * atalaya), y ocho semanas de gente plantada en la muralla son casi dos horas
   * de reloj a ×1 en las que la aldea no siembra ni tala: eso no es una
   * guarnición, es una aldea paralizada. Dos semanas son veintiocho minutos de
   * reloj, que es lo que dura una víspera.
   *
   * Y el aviso sigue haciendo lo suyo durante las otras seis: es la encrucijada
   * de B2 —esconder, pagar, esperar— la que ocupa esa espera.
   *
   * Medido en diez semillas jugadas sesenta años dando la defensa en cuanto se
   * puede: **la primera guardia sube a las 59–126 h de reloj**, y sube **una
   * sola mano** —la del portón— porque a esa altura el valle todavía no ha
   * podido pagar ni lanzas ni arcos. La guarnición de siete llega después, con
   * lo dado.
   */
  ALERT_WEEKS: 2,
  /**
   * Las manos que sube una aldea sin nada dado: **una**, la del portón.
   *
   * No es cero a propósito. Un pueblo que sabe que bajan pone a alguien en la
   * puerta aunque no tenga con qué; lo que no tiene es con qué pelear, y eso lo
   * deciden los medios de C1. Que la defensa se construya **dando** significa
   * que sin dar nada hay un vecino mirando el camino, no que no haya nadie.
   */
  BASE_HANDS: 1,
  /** Lo que suman las lanzas de la herrería (`arms`, C1). */
  ARMS_HANDS: 2,
  /** Lo que suman los arcos (`bows`, C1): los que de verdad disparan (D2). */
  BOWS_HANDS: 3,
  /** Y el herrero, que las hizo, sube también. */
  SMITH_HANDS: 1,
  /**
   * Lo que pone de más un rey herrero.
   *
   * K-2 ya hace que ese rey levante muralla sin esperar amenaza; esto es la
   * otra mitad de la misma frase del dueño («si eliges al herrero, pues haces
   * más armas») en un juego donde las armas son la muralla y quien la ocupa.
   */
  KING_HANDS: 2,
  /**
   * Y el techo de verdad: **que la aldea no deje de vivir por estar de guardia.**
   *
   * TUNE: un tercio de los adultos, y lo medido dice que en un valle hecho **no
   * llega a morder**: con todo dado (lanzas, arcos, fragua) suben **siete** en
   * las diez semillas, que es del 13 % al 30 % de sus adultos. Donde manda es
   * en el caserío, que es para lo que está: una aldea de nueve adultos sube
   * tres y no siete, y sigue sembrando.
   *
   * Se mide en adultos y no en población porque los niños y los viejos no
   * suben (`LIFE.ADULT`).
   */
  MOST_SHARE: 1 / 3,
} as const;

export const MIGRATION = {
  ARRIVE_CHANCE: 0.3,
  // TUNE: **cada cuántas semanas se pregunta si llega alguien** (B-1, 18 sep
  // 2026). Estaba escrito en el código —`weekOf(tick) !== 0`, o sea una tirada
  // al año— y era el techo del crecimiento: con 0,7 de probabilidad y de dos a
  // cuatro personas por llegada, una aldea joven crece **dos o tres personas al
  // año** y las veinte personas cuestan doce años, que a ×1 son ciento treinta
  // y ocho horas. El dueño del diseño puso el objetivo en horas reales («la
  // edad de piedra en 60/70 horas, en los primeros meses deben pasar eventos
  // ya»), y a catorce minutos por semana una hora real es un mes de juego: una
  // tirada al año es una tirada cada once horas de juego.
  //
  // Una aldea hecha sigue recibiendo una vez al año —es la llamada del valle,
  // no una feria—; **la joven, una vez por estación**, que es lo que mide el
  // número de abajo. No es una puerta y no regala nadie: la tirada es la misma
  // contra las mismas condiciones (ánimo, grano, hostilidad, que haya quien
  // mande), sólo se pregunta más veces mientras el valle tiene sitio.
  // Medido (24 semillas × 20 años, con lo demás de B-1 puesto): con la tirada
  // anual las veinte personas llegan a las 130 h de reloj, por estación a las
  // 90 y **al mes a las 38**; las quince, de 70 h a 23. Ni una muerta más en
  // ningún caso y el ánimo mejora, porque lo que hundía el ánimo era el
  // apretón y ahora hay casas. Mensual mientras el valle es pequeño: la voz
  // corre, y las puertas de siempre (ánimo, grano, hostilidad, que haya quien
  // mande) siguen decidiendo quién entra.
  ARRIVE_EVERY_WEEKS: 48,
  ARRIVE_EVERY_WEEKS_SMALL: 4,
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
  // K-4 · y la sala del rey: es de madera y paja, así que arde como lo demás. El
  // caos es el juego, y una casa de madera que no arde es una excepción que
  // habría que explicar.
  FIRE_KINDS: ['house', 'granary', 'chapel', 'smithy', 'mill', 'hall'],
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
  // M-3 · TUNE: cuántos cerdos más caben con la pocilga del carro (§7.12). Tres
  // es lo que hace que el corral se **vea** distinto: con las casas de una aldea
  // hecha el techo es de dos a cuatro, así que la pocilga lo casi duplica.
  STY_PIGS: 3,
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

// ---------------------------------------------------------------------------
// §6.7 · El rey (K-1, 18 sep 2026)
//
// El plan entero está en `docs/plan-rey.md`. Aquí sólo las cifras, y cada una
// con de dónde sale: ninguna se inventa, todas se apoyan en un número que el
// juego ya tenía medido.
// ---------------------------------------------------------------------------

export const CROWN = {
  /**
   * Cuánta gente hace falta para que haya a quién coronar.
   *
   * TUNE: 30, que es `BUILDING_RULES.CHAPEL_PEOPLE`. Una aldea que puede tener
   * capilla puede tener corte; y un rey de seis personas es una broma.
   */
  MIN_PEOPLE: 30,
  /**
   * Lo que cuesta la corona, en plata.
   *
   * TUNE: 30, el precio de la reliquia (`MEANS_SPEC.relic`), que es el medio más
   * caro. §7.12 midió que con esos precios «un medio pasa a ser una decisión de
   * década»; la corona tiene que ser la decisión de una generación.
   */
  SILVER: 30,
  /** La banda de edad de la que sale un rey: la misma de la sucesión (A.15). */
  CANDIDATE_AGES: [20, 60] as readonly [number, number],
  /** Lo que el desplazado piensa del coronado. El de A.15, sin tocar. */
  SET_ASIDE_OPINION: -45,
  /** El peso del recuerdo de haber sido pasado por alto. El de A.15. */
  SET_ASIDE_MEMORY: 4,
  /**
   * Qué estilo da cada oficio.
   *
   * Es un **dato y no código**: mover a la comadrona de sitio no toca una línea.
   * Los tres que el dueño del diseño nombró —herrero, granjero, noble— y el cura
   * como cuarto, porque la fe ya es una cifra del valle y tenía dueño.
   */
  STYLE_OF_TRADE: {
    smith: 'forge', reeve: 'plough', woodward: 'plough', midwife: 'plough',
    herbalist: 'plough', priest: 'chapel', leader: 'court', stranger: 'court',
  } as const,
  /**
   * Cuánto más se siembra con un rey del campo.
   *
   * TUNE: 1,3. Entre las dos paradas que E1 midió para la palanca retirada
   * (`enough` 1 y `heavy` 1,5): la de arriba dejaba a la aldea sin manos para la
   * obra, y 1 no se distinguiría de no tener rey.
   */
  /**
   * Entre qué dos números se recorta lo que el rey quiere sembrar.
   *
   * K-7: era `INTENT_RANGE.fields` en `state.ts`, el rango de la palanca de
   * v2.0, y se muda aquí con la palanca retirada. Sigue siendo una garantía y no
   * un ajuste: lo que impide que una cifra nueva de esta tabla deje a la aldea
   * sin sembrar o sembrando el doble de lo que puede.
   */
  FIELDS_RANGE: [0.5, 2] as readonly [number, number],
  PLOUGH_FIELDS: 1.3,
  /**
   * Cuántos campos más de los ocho de §12 rotura un rey del campo.
   *
   * TUNE: 2, o sea diez en vez de ocho. **Y este número existe porque el otro no
   * bastaba**: medido al escribir la prueba de K-2, `PLOUGH_FIELDS` solo no
   * cambia nada en una aldea hecha —§5.2 trabaja `min(campos, necesarios,
   * dotables)` y con cuarenta personas los ocho campos ya están todos
   * trabajados—, así que el rey del campo era un rey sin efecto. Dos campos más
   * son 1 200 de cosecha llena al año, que es comida para once personas: se ve
   * en el granero y se ve en el mapa.
   */
  PLOUGH_MORE_FIELDS: 2,
  /**
   * Y cuántos graneros más de los tres de §12.
   *
   * TUNE: 1. **Es la mitad que faltaba**, y también salió de medir: con la
   * tierra sola el rey del campo no se veía —siete campos, cinco trabajados y
   * 2 189 de grano contra 2 272 sin rey, en 24 partidas de sesenta años—, porque
   * lo que limita el grano guardado no es la tierra sino el sitio donde
   * guardarlo. Un granero son mil fanegas más de bodega.
   */
  PLOUGH_MORE_GRANARIES: 1,
  /**
   * Lo que el rey herrero le añade al interés del señor.
   *
   * TUNE: 1,5, como candidato `story` de la categoría `lord` (§8.6). Un valle
   * que hace armas se mira desde fuera; es el precio de la muralla.
   */
  FORGE_LORD: 1.5,
  /**
   * Hacia qué fe deriva el valle con un rey cura.
   *
   * TUNE: 50. La deriva base es 40 y la reliquia la sube a 62; la capilla pide
   * 45, así que con este rey la capilla llega sola.
   */
  CHAPEL_FAITH_TO: 50,
  /**
   * Lo que valen las fiestas con un rey cura.
   *
   * TUNE: 0,5. El barril vale la mitad: es lo que un rey así le quita al valle,
   * y hace que el medio del barril y este rey no se lleven bien.
   */
  CHAPEL_FEAST: 0.5,
  /**
   * Lo que la obra rinde con un rey cura.
   *
   * TUNE: 0,9. **Es su precio, y hacía falta uno**: medido en 24 partidas de
   * sesenta años, el rey cura salía siendo una mejora limpia —fe 82 contra 34,
   * población 49 contra 42, más grano y más campos— y la mitad de ánimo de las
   * fiestas no lo compensaba porque las fiestas son pocas. Las manos que están
   * en la capilla no están en el andamio: un diez por ciento menos de obra es lo
   * que cuesta tener un valle devoto.
   */
  CHAPEL_WORKS: 0.9,
  /**
   * El ánimo por semana que da tener corte, con la sala en pie.
   *
   * TUNE: 0,1. La capilla da 0,15, y una corte no puede valer más que la iglesia.
   */
  COURT_MORALE: 0.1,
  /**
   * Cuántos años lleva el valle «vigilado» tras coronar a un noble.
   *
   * TUNE: 20. El factor pone 15 y la reliquia 12; un rey de corte es lo que más
   * llama la atención del señor, así que dura más.
   */
  COURT_WATCHED_YEARS: 20,
  /** Cuánta gente hace falta para que la aldea levante la sala. = MIN_PEOPLE. */
  HALL_PEOPLE: 30,
  /** Camas de la sala del rey. = `LIFE.HOUSE_CAPACITY`: es una casa. */
  HALL_BEDS: 5,
  /**
   * La obra del rey ambicioso.
   *
   * TUNE: 1,05, y **no es un número nuevo**: §6.3 prometía «el líder ambicioso
   * levanta un 5 % más de obra» desde el primer día y nadie lo había escrito.
   */
  AMBITIOUS_WORKS: 1.05,
  /**
   * Lo que el hambre cuesta de ánimo con un rey generoso.
   *
   * TUNE: 0,75, y tampoco es nuevo: §6.3 decía «−3 · severidad en vez de −4»,
   * que es exactamente tres cuartos.
   */
  GENEROUS_HUNGER: 0.75,
  /**
   * La puerta de los que llegan, con un rey miedoso.
   *
   * TUNE: 0,7. Nuevo. Es la misma dimensión que `CHARACTER.CRAVEN_LEAVES` visto
   * desde el trono: el cobarde que se iba del valle, mandando, cierra la puerta.
   */
  CRAVEN_GATE: 0.7,
  /**
   * El peso de la riña de la plaza con un rey de mal genio.
   *
   * TUNE: 1,5. Nuevo, y es el empujón a las opiniones que R-1 dio con la riña,
   * ahora con un motivo con nombre.
   */
  TEMPER_QUARREL: 1.5,
} as const;

// ---------------------------------------------------------------------------
// §7.4b · La plaza (P-1, 18 sep 2026)
// ---------------------------------------------------------------------------

export const PLAZA = {
  /**
   * El radio del círculo de la plaza, en celdas.
   *
   * TUNE: tres celdas, que son nueve metros de radio y dieciocho de lado a lado
   * (D.6.2: una celda son tres metros). Es la medida de una plaza de pueblo de
   * verdad y cabe la aldea entera de pie: el corro de una reunión de §11.8
   * reparte de once a veintiocho plazas, y con este radio caben todas dentro
   * sin pisarse. Con dos celdas la fuente del centro se comería el sitio; con
   * cuatro, el círculo se traga la mitad del casco —los topes de §12 son
   * absolutos: dieciséis casas y ocho campos— y la aldea se desparrama.
   *
   * El dueño del diseño la pidió «un círculo grande, con separación».
   */
  RADIUS: 3,
  /**
   * Cuánta calle se deja entre el borde de la plaza y la casa fundadora al
   * elegirla.
   *
   * TUNE: uno, el mismo `BUILDING_RULES.STREET_GAP` que se deja entre dos
   * edificios con paredes. La plaza se elige pegada a esa casa y sin esto su
   * borde quedaría contra su muro, que es justo lo contrario de la separación
   * que se pidió.
   */
  STREET: 1,
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
  // M-0 · TUNE: hasta dónde cantea la aldea cuando no tiene nada que levantar.
  // Con la fragua en pie y la obra parada, los puntos de la semana se van a la
  // cantera en vez de perderse, y el montón queda para lo que venga —una obra
  // de piedra o lo que el jugador compre con ella—. El tope es lo que cuesta la
  // iglesia (120) más una muralla (40) y una casa (50): no es un almacén, es
  // tener algo a mano.
  STONE_IDLE_CAP: 210,
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
  // TUNE: el hueco mínimo entre dos encrucijadas. **Eran 120 ticks, y el número
  // se eligió cuando eso era media hora de reloj** —la especificación lo dice
  // con esas palabras, «30 minutos reales a ×1»—: v3.72 puso la semana en
  // catorce minutos y los mismos 120 ticks pasaron a ser **veintiocho horas**
  // sin que nadie tocara la constante. Medido con el catálogo real (16 semillas
  // × 30 años), el techo mandaba el **68 % de los intervalos**, y §8.6 dice que
  // por encima del 40 % «manda el reloj, no el contenido».
  //
  // Con 48 —un año de juego, once horas de reloj— baja al 34 % y el intervalo
  // mediano lo pone el contenido: 76 semanas. Bajarlo más no cambia el número
  // de decisiones (13 contra 14 en treinta años) porque lo que las limita es
  // qué hay elegible, así que se queda en el menor cambio que arregla la señal.
  MIN_TICKS_BETWEEN: 48,
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
  // A2 · **el portón** (§1b, fase 3). Ocupa una celda de la línea de muralla,
  // como un tramo, y cuesta el doble que él: una hoja de roble con sus goznes
  // es carpintería, no estacas clavadas. **Tope dos** (`MAX_GATES`), y es del
  // valle y no de la obra: la aldea abre una sola —§7.3 se para en la primera—
  // y la segunda la paga el jugador por el carro (M-2).
  gate: { w: 1, h: 1, wood: 60, stone: 0, bp: 40, cap: 2, tier: 0, upgradeOf: null, byCrossroad: false },
  // K-4 · **la sala del rey**, la casa que se diferencia. Tres por tres como la
  // iglesia, y la construcción de madera más cara del valle: más obra que el
  // molino (180/140) y la misma madera que la iglesia, porque es lo más grande
  // que la aldea levanta en madera. Tope uno, y sólo se pide con rey (§7.3,
  // punto 2b). Arde como cualquier casa de madera: el caos es el juego.
  hall: { w: 3, h: 3, wood: 200, stone: 0, bp: 160, cap: 1, tier: 0, upgradeOf: null, byCrossroad: false }, // CROWN.HALL_BEDS
  grave_yard: { w: 3, h: 2, wood: 0, stone: 0, bp: 25, cap: 1, tier: 0, upgradeOf: null, byCrossroad: true }, // MOOD.MORALE_GRAVEYARD
  wall: { w: 1, h: 1, wood: 0, stone: 40, bp: 60, cap: null, tier: 1, upgradeOf: 'palisade', byCrossroad: false },
  stone_house: { w: 2, h: 2, wood: 0, stone: 50, bp: 70, cap: null, tier: 1, upgradeOf: 'house', byCrossroad: false }, // does not burn
  church: { w: 3, h: 3, wood: 0, stone: 120, bp: 200, cap: 1, tier: 1, upgradeOf: 'chapel', byCrossroad: false }, // MOOD.*_CHURCH
  // C3 · **`byCrossroad` pasa a `false`**, y ya era mentira antes de esta ronda:
  // C1 le puso un segundo camino (el carro, `MEANS_SPEC.tower`). Desde C3 la
  // aldea se la levanta sola cuando la han saqueado (`WATCHTOWER_AFTER_RAIDS`),
  // así que los tres caminos existen y este campo dice la verdad.
  watchtower: { w: 2, h: 2, wood: 0, stone: 60, bp: 90, cap: 2, tier: 1, upgradeOf: null, byCrossroad: false },
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
  // TUNE: **las cinco puertas de §7.3, remedidas contra la aldea que existe**
  // (B-1, 18 sep 2026). Eran 25, 30 (con fe 45), 35 y 45 personas, y están
  // escritas para la aldea de veinte de antes de v3.69: un valle mediano llega
  // a **23 personas en veinte años**, así que el molino pedía más gente de la
  // que el juego tiene nunca y la capilla pedía además una fe de 45 que —medido
  // con `npm run eligibility`— **falla en el 99 % de los ticks**. El resultado
  // era una escalera con los cuatro peldaños de arriba pintados: molino en 12
  // valles de 16 al año 44, capilla en **1 de 16 en ochenta años**, y ninguna
  // obra de piedra nunca.
  //
  // Ahora piden lo que pide una aldea que se está haciendo, y la escalera se
  // sube entera (16 semillas × 30 años): pozo a las 26 h de reloj, capilla a
  // las 44, herrería a las 55, molino a las 77 y la primera obra de piedra a
  // las 72. La fe baja a 30 porque es donde vive de verdad (mediana 34): pedir
  // 45 era pedir una devoción que sólo da una reliquia.
  WELL_PEOPLE: 10, // §7.3 point 4
  CHAPEL_PEOPLE: 12, // §7.3 point 5
  CHAPEL_FAITH: 30, // §7.3 point 5
  SMITHY_PEOPLE: 14, // §7.3 point 6
  MILL_PEOPLE: 18, // §7.3 point 7
  GRANARY_FULL: 0.8, // §7.3 point 3: grain above 80 % of capacity
  GRANARY_HOUSE_DISTANCE: 6, // §7.4: "a menos de 6 celdas de una casa"
  // TUNE: **cuántas piezas de muralla tiene que tener un tramo para merecer un
  // portón.** Tres, o sea nueve metros (D.6.2), y el número sale de un defecto
  // que el dueño del diseño vio en una captura el 18 sep 2026 —«veo que hay
  // puertas que se colocan solas sin muralla al lado, no debería pasar»—:
  // medido en cuatro semillas al año 60, de 6 a 17 portones por valle y de 5 a
  // 11 de ellos en tramos de una sola pieza, una puerta de pie en la hierba.
  // Por un tramo de una o dos piezas se da la vuelta andando.
  //
  // Vivía en `derive/defence-gates.ts`, que es donde se calculaba el paso
  // cuando un portón no era nada. Desde A2 el portón se construye, así que el
  // número es de balance y vive aquí.
  GATE_MIN_RUN: 3,
  /**
   * A2b · **El paso del portón, reservado como se reserva la plaza.**
   *
   * Lo pidió el dueño del diseño señalando el mecanismo que ya existe: «al
   * igual que la aldea reserva una serie de espacios —el centro de la aldea, la
   * plaza—, justamente el portón». Y hacía falta, con dos casos medidos al
   * hacer D3: en la semilla 41 al año 20 el interior transitable de la aldea
   * eran **232 celdas de 8 064** con el portón dando a una bolsa que no
   * conectaba con las casas, y en la semilla 7 el portón tenía **tres lados
   * tapiados y una bolsa de ocho celdas**. Una puerta que no lleva a ninguna
   * parte no es una puerta, y la gente no podía salir a sus campos por ella.
   *
   * TUNE: dos celdas y media de radio, o sea siete metros y medio alrededor de
   * la puerta. Es lo que hace falta para que quepa el paso por los dos lados
   * —dos celdas dentro y dos fuera— con el margen de una casa que se apoye en
   * el borde. Menos no garantiza el paso; más se come el solar de un pueblo que
   * ya crece apretado dentro de su anillo.
   *
   * **La muralla es la excepción**, y tiene que serlo: la línea del anillo pasa
   * por la puerta y las piezas que la flanquean son lo que la convierte en una
   * puerta y no en un hueco.
   */
  GATE_CLEAR: 2.5,
  /**
   * A2b · **Cuántas puertas puede tener un valle. Dos**, y la segunda se paga.
   *
   * Del dueño del diseño: «debería haber una, y después que haya posibilidad de
   * construirse otra más, dos en total de momento, con un momento en el que
   * tengas que pagar». La primera la levanta la aldea sola cuando hay muralla
   * que atravesar (§7.3); la segunda es del jugador y entra por el carro, que
   * es donde vive todo lo que se da (M-2).
   */
  MAX_GATES: 2,
  /**
   * A2c · **Lo lejos que tiene que estar la segunda puerta de la primera**, en
   * radios del anillo.
   *
   * Con el anillo de una sola capa ya salían dos puertas funcionales en las
   * diez semillas medidas, pero **en nueve de las diez caían pegadas**: dos
   * celdas seguidas del mismo tramo, que no son dos puertas sino un portillo
   * ancho. Dos puertas son dos por dónde entrar, y eso importa cuando lo que
   * entre sea una partida armada: una segunda puerta al lado de la primera no
   * cambia nada de la defensa.
   *
   * TUNE: un radio de separación, que en un anillo de once son once celdas y
   * unos sesenta grados de arco. Se mide en radios y no en celdas para que un
   * valle de anillo pequeño no se quede sin segunda puerta: lo que se pide es
   * «en otro lado del cerco», y eso es proporcional al cerco.
   */
  GATE_APART: 1,
  /**
   * C3 · **Cuántos asaltos hacen falta para que la aldea se levante su propia
   * atalaya.**
   *
   * TUNE: uno. Hasta aquí la atalaya sólo llegaba de dos maneras y las dos eran
   * del jugador —una encrucijada que la concede (§8.4) o el carro (C1)— así que
   * un valle al que nadie le daba nada no la tenía nunca, por muchas veces que
   * le robaran. Y es la obra que más sentido tiene que salga de la aldea: no
   * quita ni un golpe, **avisa** —catorce semanas en vez de ocho— y eso es
   * exactamente lo que un pueblo aprende a querer **después** del primer saqueo.
   *
   * Uno y no dos porque la lección de un saqueo no se olvida, y porque con dos
   * la atalaya llegaba después de la segunda visita, que es cuando ya no hace
   * falta aprender nada. Es reactiva a propósito: el jugador la puede tener
   * **antes** pagándola, y esa diferencia —prever o aprender— es la decisión.
   */
  WATCHTOWER_AFTER_RAIDS: 1,
  PALISADE_DILATION: 2, // §7.4: "envolvente convexa del núcleo, dilatada 2 celdas"
  // TUNE: **cuántas casas espera la muralla** (B-1, 18 sep 2026). Lo pidió el
  // dueño del diseño mirando el problema: «para hacerlo más sencillo, la
  // muralla se podría hacer a partir de X número de casas», y es la regla
  // buena, porque **el anillo se fija una sola vez** (v3.88, y es lo que hace
  // que la muralla sea una y no confeti) y hasta aquí se fijaba alrededor de
  // una aldea que todavía no existía: medido en doce semillas con el ritmo
  // nuevo, la herrería llega a las 43 horas de reloj y la muralla detrás, así
  // que el anillo quedaba en radio 6 a 10 **en el año 2 a 7**, mientras las
  // casas de ese mismo valle acaban llegando al radio 9,6 (mediana; hasta
  // 10,5). El resultado era una rosca de 49 piezas en un círculo de 44 celdas
  // con media aldea construida fuera de su propia muralla.
  //
  // Once, y sale de medir cuándo el pueblo deja de extenderse:
  //
  //   | casas | radio de las casas | % de lo que llegará a ocupar |
  //   |---|---|---|
  //   | 5 | 4,7 | 49 % |
  //   | 8 | 7,4 | 77 % |
  //   | **11** | **8,7** | **91 %** |
  //   | 13 | 9,5 | 99 % |
  //
  // Antes de la novena casa el valle se está extendiendo todavía, y con once ya
  // sabe la forma que va a tener: el anillo se fija donde va a hacer falta. No
  // es un tope de defensa —la amenaza sigue mandando— es esperar a tener pueblo
  // que amurallar.
  PALISADE_HOUSES: 11,
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

const TRAIT_WEIGHT_ROLE = 3;
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
