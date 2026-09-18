// M-2 · Los medios: lo que el jugador mete en el valle.
// `docs/plan-medios.md` §3, brief en `docs/rework.md` §4b.
//
// **El principio, con las palabras del dueño del diseño** (17 sep 2026): «es
// como si cogieras a un grupo de personas y le dieses una pala, o un martillo.
// Depende de lo que le des van a hacer diferentes cosas. Tú realmente no le
// estás diciendo qué tienen que hacer, sino que ciertas cosas dan lugar a
// otras». Así que aquí **no se ordena nada**: se da una cosa, y lo que la aldea
// haga con ella lo deciden sus propios sistemas —el reparto de manos, la tabla
// de sucesos, las opiniones—.
//
// Es lo que sustituye a las tres palancas de órdenes de la versión 2.0, y el
// motivo está medido en `plan-medios.md` §1: una orden global que la aldea
// obedece a ciegas mata cuando el jugador se equivoca —a dos muescas del reposo
// moría media aldea, y tarde, sin que nada avisara—, y aprender eso enseña a no
// tocar. Un medio no puede hacer eso porque no manda sobre nadie.
//
// Cada medio **cuesta lo del valle** (decisión suya: «no quiero que sea
// gratis») y abre algo bueno **y** algo malo; los pesos de lo segundo viven en
// `FATE` y los aplica `world/fate.ts`. Aquí sólo está qué cuesta, qué deja y qué
// se cuenta.

import { MEANS, PEOPLE, TIME } from '../balance';
import { housingCapacity, population } from '../people/demography';
import { MALE_NAMES, FEMALE_NAMES } from '../people/names';
import { ALL_TRAITS } from '../people/traits';
import { hash32 } from '../rng';
import { withinCap } from './buildings';
import { placeBuilding } from './placement';
import { requestBuild } from './works';
import type { BuildingKind, ChronicleEntry, GameState, MeansId, VillageStats, Villager } from '../state';
import { herdCapacity } from '../subsistence/herd';

/** Lo que un medio cuesta y lo que deja al darlo. */
export interface MeansSpec {
  /** Lo que se paga, de lo que el valle tiene. */
  readonly cost: Partial<Record<keyof VillageStats, number>>;
  /**
   * Si es un rasgo del valle, cuál. Un rasgo **no se da dos veces**: cambia un
   * número de la economía para siempre, que es lo que E5 escribió de los rasgos
   * de fundación (§7.11) — un medio es uno de esos, puesto a mitad de partida y
   * pagado.
   */
  readonly trait?: 'plough' | 'sty' | 'axe' | 'relic' | 'arms' | 'bows' | 'watch';
  /** Si mete animales en el corral, cuántos y de qué. */
  readonly herd?: { readonly kind: 'pigs' | 'cows'; readonly count: number };
  /** Si lo que deja es una fiesta esta semana. */
  readonly feast?: boolean;
  /** M-4 · si lo que llega es una persona que se queda. */
  readonly hand?: boolean;
  /** M-4 · banderas que el medio deja puestas, con sus años. */
  readonly flags?: readonly { readonly flag: string; readonly years: number }[];
  /**
   * C1 · Si lo que se da es un edificio, y se levanta puesto.
   *
   * **Puesto y no en la cola de obras**, que es la diferencia entre dar y
   * mandar: el jugador paga la madera y la atalaya está ahí, en vez de entrar
   * en §7.3 a esperar turno detrás de tres casas. Usa la misma puerta que una
   * encrucijada que concede un edificio (`requestBuild` con `free`), así que no
   * hay maquinaria nueva.
   */
  readonly build?: BuildingKind;
}

export const MEANS_SPEC: Readonly<Record<MeansId, MeansSpec>> = {
  // **El arado.** Un campo rinde con menos manos (`subsistence/labour.ts`), así
  // que sobran brazos y la aldea los reparte donde ella quiera. Lo malo llega
  // solo: el granero se llena, y un granero lleno atrae al ladrón y al señor
  // (M-1) y a las ratas.
  plough: { cost: { wood: 40, silver: 20 }, trait: 'plough' },
  // **Una pocilga y dos cerdos.** Comida en invierno y la matanza de la fiesta;
  // y lobos, que van a donde hay ganado (M-1), y la peste del corral apretado
  // (§7.7).
  //
  // **Da sitio y no sólo animales**, y eso lo obligó la medida: el corral se
  // llena solo (`tendHerd` cría hasta la capacidad de las casas), así que dar
  // dos cerdos a una aldea hecha era una negativa por `room` casi siempre — un
  // medio que no se puede dar no es un medio. Con la pocilga, el techo sube y
  // los dos que entran se quedan.
  pigs: { cost: { grain: 30, silver: 14 }, trait: 'sty', herd: { kind: 'pigs', count: 2 } },
  // **Un barril.** Una fiesta esta semana: ánimo de golpe, bodas después… y
  // riñas, que es lo que una fiesta también trae. Es el medio que le da al ánimo
  // el reloj del jugador (`plan-medios.md` §6.2).
  ale: { cost: { grain: 25, silver: 10 }, feast: true },
  // **Un hacha buena.** Cada leñador trae más leña, así que la obra y la piedra
  // llegan antes; y el bosque del corazón retrocede, que es de donde la riada
  // saca su peso (M-1). Leña ahora a cambio de agua después.
  axe: { cost: { grain: 20, silver: 18 }, trait: 'axe' },
  // **Una reliquia.** La fe deriva alto, y con fe hay capilla y cura (§7.3).
  // Y el camino se entera: un valle con reliquia es un valle del que se habla,
  // y de eso vive el señor.
  relic: {
    cost: { silver: 30 },
    trait: 'relic',
    flags: [{ flag: 'watched', years: MEANS.RELIC_WATCHED_YEARS }],
  },
  // **Un par de manos.** El forastero que pasaba y se queda: lo más caro que
  // hay en este valle, porque todo lo demás sale de las manos que haya. No trae
  // oficio puesto —eso lo decide la aldea cuando haya un puesto vacante
  // (§6.2)— y no se coloca: duerme donde haya sitio, como cualquiera.
  hand: { cost: { grain: 60, silver: 24 }, hand: true },

  // -------------------------------------------------------------------------
  // C1 · Lo que se da para aguantar un asalto (§1b, fase 4).
  //
  // **Tres medios y tres ejes distintos, y eso es lo que los hace una
  // elección**: uno aguanta el golpe, otro lo ve venir y el tercero hace que no
  // venga. Si los tres hicieran lo mismo con números distintos serían un solo
  // medio con tres precios, que es exactamente lo que `plan-medios.md` §3.2
  // prohíbe. Y cada uno tiene su cara mala, como todos los demás desde M-2.
  // -------------------------------------------------------------------------

  // **Armas para la herrería.** La aldea se defiende y se lleva menos golpe:
  // un valle con hierro en las manos no es un valle que se deja saquear. Lo
  // malo es viejo y está escrito en §7.12 —«las armas son la muralla y el señor
  // que la cuenta»—: un valle armado es un valle del que se habla, y de eso
  // vive Wealdmere.
  arms: {
    cost: { wood: 40, silver: 22 },
    trait: 'arms',
    flags: [{ flag: 'watched', years: MEANS.ARMS_WATCHED_YEARS }],
  },
  // **Arcos.** No pelean: disuaden. Un valle del que se sabe que dispara desde
  // la cerca tienta menos, y el clan de al lado prefiere otro sitio. Y la cara
  // mala es la del que se arma: **cuando por fin bajan, bajan con más gente**,
  // porque saben a qué vienen.
  bows: { cost: { wood: 30, silver: 16 }, trait: 'bows' },
  // **Una atalaya.** No quita ni un golpe: lo ve venir antes. Las semanas de
  // aviso de §1b pasan de ocho a catorce, y eso es tiempo para meter el ganado,
  // esconder el grano o mandar la plata. Se levanta de verdad —es el edificio
  // `watchtower`, que hasta hoy sólo llegaba por encrucijada— y por eso cuesta
  // madera de obra y no sólo plata.
  tower: { cost: { wood: 90, silver: 12 }, trait: 'watch', build: 'watchtower' },
};

/**
 * **Los precios, medidos y no elegidos a ojo.** Con la plata a 12, 8 y 4, un
 * valle compraba **cincuenta y un barriles en sesenta años** —fiesta permanente,
 * catorce compras de cerdos— porque la plata que entra por el camino (unas dos
 * docenas por década) daba para eso y más. Con 20, 14 y 10, y sin poder
 * encadenar barriles, salen unos pocos medios por partida: un medio pasa a ser
 * una decisión de década y no una compra de semana. Ver `docs/task-log.md`.
 */

/**
 * M-4 · **El forastero que se queda.**
 *
 * Entra como un adulto de `MEANS.HAND_AGE` inviernos, con nombre y sin oficio:
 * lo que la aldea haga con él lo decide §6.2 cuando haya un puesto vacante, que
 * es el principio del carro aplicado a una persona.
 *
 * **Y su nombre sale de un hash y no del flujo de nombres**, que es lo que
 * mantiene la invariante de todos los actos del jugador: dar algo no mueve una
 * sola tirada del mundo (§4.3). `hash32` es puro; `makeName` habría consumido
 * del flujo `names` y con eso un forastero habría desplazado la partida entera.
 */
function settle(state: GameState): void {
  const female = hash32(state.tick, 'means-hand') % 2 === 0;
  const bank = female ? FEMALE_NAMES : MALE_NAMES;
  const used = new Set(state.people.villagers.map((person) => person.name));
  const free = bank.filter((name) => !used.has(name));
  const pool = free.length > 0 ? free : bank;
  const name = pool[hash32(state.tick, 'means-hand-name') % pool.length] ?? 'Stranger';
  const id = state.people.nextId;
  state.people.nextId += 1;
  state.people.villagers.push({
    id,
    name,
    named: true,
    role: null,
    female,
    bornTick: state.tick - MEANS.HAND_AGE * TIME.WEEKS_PER_YEAR,
    diedTick: null,
    causeOfDeath: null,
    leftTick: null,
    // Los rasgos salen del mismo hash: un forastero tiene carácter, y el mismo
    // en la misma partida, pero no cuesta una tirada.
    traits: [
      ALL_TRAITS[hash32(state.tick, 'means-hand-a') % ALL_TRAITS.length],
      ALL_TRAITS[hash32(state.tick, 'means-hand-b') % ALL_TRAITS.length],
    ].filter((trait, index, all): trait is Villager['traits'][number] =>
      trait !== undefined && all.indexOf(trait) === index),
    homeId: null,
    parentIds: [null, null],
    memories: [],
    opinions: {},
  });
  if (state.people.namedIds.length < PEOPLE.MAX_NAMED) state.people.namedIds.push(id);
}

/** Por qué no se puede dar algo, o `null` si se puede. */
export type MeansRefusal = 'cost' | 'already' | 'room' | 'feasting';

export function refusalFor(state: GameState, id: MeansId): MeansRefusal | null {
  const spec = MEANS_SPEC[id];
  if (spec.trait !== undefined && (state.traits as readonly string[]).includes(spec.trait)) {
    return 'already';
  }
  // El sitio se mide **después** de lo que el propio medio trae: una pocilga
  // sube el techo, así que preguntarle si cabe en el corral de antes sería
  // preguntarle por un corral que ya no va a existir.
  if (spec.herd !== undefined && spec.trait === undefined
    && state.herd[spec.herd.kind] + spec.herd.count > herdCapacity(state)[spec.herd.kind]) {
    return 'room';
  }
  // **Un barril cada vez.** Nadie compra el siguiente mientras se está bebiendo
  // el primero, y sin esto la fiesta se podía encadenar semana a semana: medido,
  // cincuenta y un barriles en una partida de sesenta años.
  if (spec.feast === true && aleWindow(state)) return 'feasting';
  // C1 · Y una atalaya necesita dónde levantarse: si el valle ya tiene las suyas
  // (§7.2 le pone tope) o no queda solar, no se puede dar. Se comprueba **antes**
  // de cobrar, que es la promesa de M-2: no se cobra a medias.
  if (spec.build !== undefined
    && (!withinCap(state, spec.build) || placeBuilding(state, spec.build) === null)) {
    return 'room';
  }
  // Y un forastero necesita dónde dormir: sin cama libre no se queda, que es la
  // misma regla que §5.7 aplica a quien llega por su cuenta.
  if (spec.hand === true && housingCapacity(state) <= population(state)) return 'room';
  for (const [stat, amount] of Object.entries(spec.cost)) {
    if (state.village[stat as keyof VillageStats] < (amount ?? 0)) return 'cost';
  }
  return null;
}

export function canGive(state: GameState, id: MeansId): boolean {
  return refusalFor(state, id) === null;
}

export interface MeansOutcome {
  readonly id: MeansId;
  readonly given: boolean;
  readonly refusal: MeansRefusal | null;
  readonly entry: Omit<ChronicleEntry, 'tick'> | null;
}

/**
 * Da un medio al valle. No consume ninguna tirada: lo que el jugador hace no
 * puede desplazar la partida (§4.3), igual que una oferta del camino.
 *
 * Lo que **no** hace: colocar nada. «En este juego no se coloca nada; todo se
 * decide y el mapa interactúa solo» (dueño del diseño, 17 sep 2026). El arado
 * va al campo que la aldea trabaje, los cerdos al corral que tenga y el barril
 * a la plaza, y de eso se encarga quien ya sabe dónde está cada cosa.
 */
export function giveMeans(state: GameState, id: MeansId, season: string, year: number): MeansOutcome {
  const refusal = refusalFor(state, id);
  if (refusal !== null) return { id, given: false, refusal, entry: null };
  const spec = MEANS_SPEC[id];
  for (const [stat, amount] of Object.entries(spec.cost)) {
    const key = stat as keyof VillageStats;
    state.village[key] = Math.max(0, state.village[key] - (amount ?? 0));
  }
  // El rasgo primero: si sube el techo del corral, los animales que vengan
  // detrás tienen dónde entrar.
  if (spec.trait !== undefined) state.traits.push(spec.trait);
  if (spec.herd !== undefined) {
    state.herd[spec.herd.kind] = Math.min(
      state.herd[spec.herd.kind] + spec.herd.count,
      herdCapacity(state)[spec.herd.kind],
    );
  }
  // La fiesta del barril no se sortea: se paga y se celebra. La sirve
  // `world/fate.ts` la semana que la bandera está puesta, que es donde viven
  // los sucesos y sus efectos visibles.
  if (spec.feast === true) state.flags['ale'] = state.tick + MEANS.ALE_WEEKS;
  for (const flag of spec.flags ?? []) {
    state.flags[flag.flag] = state.tick + flag.years * TIME.WEEKS_PER_YEAR;
  }
  // C1 · **La atalaya se abre como obra pagada.** El jugador pone la madera y
  // la aldea la levanta, que es el trato de M-2 de punta a punta: se da, no se
  // coloca. Usa la misma puerta que una encrucijada que concede un edificio
  // (A.16), así que no hay maquinaria nueva. Si no cabe —ya hay dos atalayas, o
  // no hay solar— la madera igualmente se pagó: dar algo que no cabe es una
  // negativa, y por eso `refusalFor` lo comprueba antes.
  if (spec.build !== undefined) requestBuild(state, spec.build);
  if (spec.hand === true) settle(state);
  return {
    id,
    given: true,
    refusal: null,
    entry: {
      kind: 'means',
      templateKey: `means.${id}.given`,
      params: { season, year },
      weight: 2,
    },
  };
}

/** Las semanas que la fiesta del barril sigue tiñendo lo que pasa. */
export function aleWindow(state: GameState): boolean {
  const until = state.flags['ale'];
  return until !== undefined && (until === 0 || until > state.tick);
}

/** Cuánto cuesta un medio, para que la pantalla lo pueda enseñar sin inventarlo. */
export function costOf(id: MeansId): Partial<Record<keyof VillageStats, number>> {
  return MEANS_SPEC[id].cost;
}
