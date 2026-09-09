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
  REAL_MS_PER_TICK: 15_000,
  // §12.1. Geometric, each one four times the last. 64x exists to make the
  // pace question of §16.2 testable in a sitting: a year in eleven seconds
  // instead of forty-five (v2.85).
  SPEEDS: [0, 1, 4, 16, 64],
  LETHARGY_CAP_MS: 4 * 60 * 60 * 1000,
  LETHARGY_BATCH: 64, // §13.2: ticks per requestAnimationFrame while catching up
  // TUNE: how long a notable event stays legible over the valley (§11.6,
  // v2.84). Long enough to read one sentence, short enough that a village at
  // 16x does not queue a backlog. Real time on purpose and cut hard, never
  // faded: §11.4 forbids an interface animation that a clock jump can catch
  // half-way.
  NOTICE_MS: 5_000,
  SAVE_EVERY_TICKS: 20, // §13.1
} as const;

// ---------------------------------------------------------------------------
// §12.2 · The founding
// ---------------------------------------------------------------------------

export const FOUNDING = {
  POPULATION: 20, // 6 named + 14 anonymous
  ADULTS: 13,
  CHILDREN: 5,
  ELDERS: 2,
  GRAIN: 800, // exactly BASE_STORAGE: the village must not be born spoiling
  WOOD: 200,
  MORALE: 55,
  FAITH: 50,
  HOUSES: 4,
  FIELDS: 2,
  // TUNE: §12.2 said nothing about animals. They arrive with what a party of
  // twenty could drive: hens, and one milk cow — exactly the cow that two
  // fields can pasture (§7.7), so the founding herd is already at its ceiling
  // and the first growth has to wait for the third field.
  HERD: { hens: 4, pigs: 0, cows: 1 },
  // TUNE: §12.2 gives the head count of each age group but not the ages
  // themselves, and M-03 has to draw them. Inclusive ranges, in years.
  AGE_RANGES: { adults: [16, 45], children: [1, 13], elders: [60, 70] },
  // TUNE: a founding that cannot reproduce is not interesting variance, it is
  // a game dead on arrival — and it is the first thing the player sees. The
  // draw is corrected upwards until this many adult women fall inside
  // LIFE.FERTILE.
  MIN_FERTILE_WOMEN: 4,
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
  ARRIVE_MIN_PEOPLE: 8,
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
  VIABLE_POPULATION: 6,
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
  RIVER_ENTRY: [10, 26],
  RIVER_FORWARD_CHANCE: 0.65,
  RIVER_WIDTH: 2,
  RIVER_LOWER_WIDTH: 3,
  NOISE_SCALES: [8, 4],
  FOREST_FRACTION: [0.20, 0.26],
  ROCK_PATCHES: [3, 6],
  ROCK_SIZE: [6, 14],
  MARSH_WIDTH: [1, 2],
  CLEARING_SIZE: 12,
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

  // Wildlife (§7.7, v2.88). Still cosmetic: they eat nothing yet.
  FIELDS_PER_CROW: 2,
  CROWS_MAX: 8,
  // Crows come as the grain ripens, not all year: the weeks before the
  // reaping of week 35 (§5.1) are when there is something on the field worth
  // taking.
  CROW_WEEKS_BEFORE_HARVEST: 6,
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
} as const;

export const WORLD = {
  WIDTH: 36,
  HEIGHT: 56,
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
