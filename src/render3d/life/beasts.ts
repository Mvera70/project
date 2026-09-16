// V-08 · Los animales, iguales que la gente. design.md Anexo E.
//
// **Un animal deja de ser una fórmula del reloj y pasa a ser un cuerpo con
// impulsos**, exactamente el mismo `Dweller` que ya vive en `village.ts`: un
// cuerpo que colisiona (V-02), que navega (V-03), que le pide algo por dentro
// (V-04) y que elige (V-06). Con `traits: []` porque un cerdo no tiene
// carácter, y con su propia tabla de impulsos —`BEAST_RISE`— porque el
// carácter que sí tiene es la especie: la gallina picotea, el cerdo hoza, la
// vaca pasta, cada uno a su ritmo.
//
// **La consecuencia que pedía el brief sale sola, no se programa aparte**: un
// animal es también un cuerpo que `integrate()` no deja meter en el agua —el
// mismo `Terrain.blocked` que para la gente— así que no hace falta ningún
// `ashore()` que lo saque de un empujón después. El brinco de 1,08 celdas que
// medía G-10 no es que se arregle: es que deja de poder pasar, porque el
// animal nunca llega a pisar el agua.
//
// Lo que NO se hace aquí: cuervos y peces. No eligen (E.8), siguen siendo
// decorado puro en `effects/fauna.ts`, con las mismas `wildlifePositions` de
// siempre. Y el rebaño no se cuenta del tick vivo — se cuenta de
// `state.herd`, el estado de anoche, exactamente como el resto de la capa lee
// el estado congelado y no lo que el motor decida a media jornada (D.6.7).

import { ANIMALS } from '@engine/balance';
import { hash32 } from '@engine/rng';
import type { GameState } from '@engine/state';
import {
  blockedAt, gap, integrate, turnTo, TURN_MIN_PROGRESS, TURN_MIN_SPEED,
  type Body, type Point, type Terrain,
} from './body';
import { LIFE_STEP } from './clock';
import {
  decide, freshProgress, moveSeat, noProgress, pauseHere, satisfy, PROGRESS_CHECK, RETHINK,
  type ProgressState,
} from './decide';
import type { Neighbourhood } from './grid';
import { freshNeeds, type Needs, type NeedName } from './needs';
import { follow, type Router } from './navigate';
import { doorOf, OFFERS, seatAt, type Offer, type Place } from './offers';
import { avoid, drive, seek, separate } from './steering';
import { canReach, nearestReachable } from './terrain';
import type { Dweller } from './village';

/** Las tres clases que hoy tienen cuerpo, cabaña y nombre en `state.herd`. */
export type BeastKind = 'hen' | 'pig' | 'cow';

/**
 * El radio de un cuerpo, por clase, en celdas.
 *
 * TUNE: nadie mide esto en el brief ni en `spike/life.ts` — ninguno de los dos
 * tenía animales con cuerpo. Se parte del radio de una persona (0,32,
 * `village.ts`) y se escala a ojo por tamaño relativo: una gallina es un
 * tercio de una persona, un cerdo algo más de la mitad, una vaca algo mayor.
 * Sin ver esto en pantalla no se puede afinar más — queda anotado en el
 * informe de ronda como lo que hace falta mirar primero.
 */
const RADIUS: Readonly<Record<BeastKind, number>> = {
  hen: 0.14,
  pig: 0.24,
  cow: 0.4,
};

/**
 * Lo que anda cada clase sin que nada le retenga, en celdas por segundo.
 *
 * TUNE: mismo origen que `RADIUS`. Una persona anda a 1,05-1,65
 * (`village.ts`, `pace`); un corral no se aleja de casa, así que todo va por
 * debajo de eso. La gallina picotea a saltos y por eso es la más rápida de
 * las tres pese a ser la más pequeña; la vaca pasta despacio.
 */
const PACE: Readonly<Record<BeastKind, number>> = {
  hen: 0.55,
  pig: 0.4,
  cow: 0.32,
};

/**
 * Cuánto sube el aburrimiento por segundo, para cada clase. La tabla de
 * impulsos propia que pide el brief.
 *
 * Un animal no tiene rasgos (`traits: []`), así que aquí no hay `TEMPER`
 * (`needs.ts`) que multiplique nada: el carácter que hace que la gallina
 * picotee sin parar y la vaca se lo tome con calma **es la especie**, y por
 * eso la tabla vive en la clase y no en un rasgo. Ningún otro impulso de los
 * seis de `Needs` sube nunca para un animal —queda en el valor de salida de
 * `freshNeeds()`— porque nada en su catálogo de ofertas lo pide: `worth()`
 * sólo mira los impulsos que una oferta declara en `gives`, y el autoOffer de
 * cada clase sólo declara aburrimiento.
 *
 * TUNE: calibrado igual que `RISE` en `needs.ts` contra la jornada de ciento
 * veinte segundos — que a un animal le apetezca volver a su ocupación varias
 * veces al día y no una sola vez ni cincuenta.
 */
const BEAST_RISE: Readonly<Record<BeastKind, number>> = {
  hen: 1 / 20,
  pig: 1 / 35,
  cow: 1 / 55,
};

/**
 * Lo que cada clase hace sola, junto a su ancla. `gives`/`seconds` en la
 * misma escala que `OFFERS` (`offers.ts`): no hay otra referencia de la que
 * partir. `seats` y `spots` (checklist IA-1, punto 2) los pone
 * `selfPlaceOf()` a partir de aquí — este molde ya no lleva un asiento fijo.
 */
const SELF_OFFER: Readonly<Record<BeastKind, {
  readonly id: string;
  readonly reach: number;
  readonly gives: Partial<Record<NeedName, number>>;
  readonly seconds: readonly [number, number];
}>> = {
  hen: { id: 'peck', reach: 1.0, gives: { boredom: 0.6 }, seconds: [4, 10] },
  pig: { id: 'root', reach: 1.1, gives: { boredom: 0.55 }, seconds: [8, 18] },
  cow: { id: 'graze', reach: 1.3, gives: { boredom: 0.5 }, seconds: [15, 30] },
};

/**
 * Cuántos puntos de su propia oferta tiene cada animal para elegir.
 *
 * TUNE: tres o cuatro, tal cual pide el checklist IA-1 (punto 2): tres para
 * la gallina y el cerdo, cuatro para la vaca, que es la que más celda de
 * pasto necesita para no leerse como clavada en un punto. No es una medida
 * en pantalla, es el rango literal del brief.
 */
const SPOT_COUNT: Readonly<Record<BeastKind, number>> = { hen: 3, pig: 3, cow: 4 };

/**
 * Los puntos alrededor del ancla donde un animal hace lo suyo, todos en
 * celda libre y en la misma orilla que el resto de la aldea.
 *
 * Checklist IA-1, punto 2: con un solo punto, un animal vuelve siempre al
 * mismo palmo de corral en cuanto se le da un rato — es lo que el dueño ve
 * como «dan vueltas» sin moverse de sitio. Con varios y la elección al azar
 * entre los libres que ya hace `decide()` (`decide.ts`, «al azar entre las
 * libres»), un cerdo hoza por el corral entero en vez de volver siempre al
 * mismo palmo.
 *
 * TUNE: de 0,8 a 1,5 celdas del ancla, el rango que pide el checklist. Hasta
 * veinte intentos por punto porque un corral apretado entre dos casas puede
 * tener pocas celdas libres alrededor; si ninguno cuaja para un punto dado,
 * el propio ancla —ya libre y conectada por `anchorOf`— entra en su lugar,
 * para no dejar la oferta con menos plazas de las que promete.
 */
function spotsAround(
  land: Terrain, reach: Uint8Array, anchor: Point, seed: number, id: number, count: number,
): Point[] {
  const spots: Point[] = [];
  for (let n = 0; n < count; n += 1) {
    let found: Point | null = null;
    for (let attempt = 0; attempt < 20 && found === null; attempt += 1) {
      const angle = (hash32(seed, `beast:spot:${id}:${n}:${attempt}:a`) / 4_294_967_296) * Math.PI * 2;
      const dist = 0.8 + (hash32(seed, `beast:spot:${id}:${n}:${attempt}:d`) / 4_294_967_296) * 0.7;
      const at = { x: anchor.x + Math.cos(angle) * dist, z: anchor.z + Math.sin(angle) * dist };
      if (at.x <= 0.5 || at.z <= 0.5 || at.x >= land.width - 0.5 || at.z >= land.height - 0.5) continue;
      if (blockedAt(land, at.x, at.z)) continue;
      if (!canReach(land, reach, at)) continue;
      found = at;
    }
    spots.push(found ?? anchor);
  }
  return spots;
}

/** Lo que cada clase ofrece a quien pase, del catálogo central (`offers.ts`). */
const GIFT_OFFER: Readonly<Record<BeastKind, string>> = {
  hen: 'chase',
  pig: 'feed',
  cow: 'pet',
};

/**
 * El espacio de identificadores de los animales, aparte del de las personas.
 *
 * Mismo criterio que `wildlifePositions` (`render/animals.ts`): «su propio
 * rango, para que un cuervo nunca comparta id con una gallina». Aquí, para
 * que ningún animal comparta id de cuerpo con una persona — `village.ts`
 * junta los dos en la misma rejilla de vecinos y los dos tienen que poder
 * convivir en el mismo `Map` por id.
 */
const BEAST_ID_BASE = 10_000;

/**
 * Cuánto se aguanta yendo al ancla antes de replantearse. Mismo criterio que
 * `GIVE_UP` en `village.ts`: el ancla de un animal está siempre a un paso de
 * donde ya estaba, así que esto casi nunca salta — es la red por si el paso
 * se llena de gente por medio.
 */
const GIVE_UP = 600;

/** Un animal, entero: el mismo `Dweller` que una persona, más lo que le hace falta. */
export interface Beast {
  readonly dweller: Dweller;
  readonly kind: BeastKind;
  /**
   * El punto fijo junto a su casa o su campo. No es el cuerpo: es a donde
   * vuelve. La gallina se aparta de aquí para picotear y `separate()`/`avoid()`
   * la empujan un poco más, pero siempre hay un sitio al que decide regresar.
   */
  readonly anchor: Point;
  /**
   * Lo que ofrece a quien pase: `pet`, `chase` o `feed`, aforo uno. Su `at` es
   * el cuerpo del animal —la misma referencia—, así que sigue al bicho sin que
   * nadie tenga que reescribirlo paso a paso.
   */
  readonly gift: Place;
  /** Lo que el bicho hace solo, junto al ancla. */
  readonly self: Place;
  /**
   * Lo que `noProgress()` (`decide.ts`) necesita recordar para saber si el
   * viaje en marcha avanza. Checklist IA-1, punto 6. Vive aquí y no en
   * `Dweller` porque `Dweller` lo construyen también ficheros ajenos a esta
   * fase (pruebas de escenas) y añadirle campos obligatorios les rompería el
   * tipo.
   */
  readonly progress: ProgressState;
}

/** Lo de siempre entre cero y uno, igual que en `needs.ts`. */
function hold(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Un paso de vida para el único impulso que le corre a un animal. */
export function driftBeast(needs: Needs, kind: BeastKind, seconds: number): void {
  needs.boredom = hold(needs.boredom + BEAST_RISE[kind] * seconds);
}

function selfPlaceOf(
  kind: BeastKind, id: number, anchor: Point, land: Terrain, reach: Uint8Array, seed: number,
): Place {
  const spec = SELF_OFFER[kind];
  const spots = spotsAround(land, reach, anchor, seed, id, SPOT_COUNT[kind]);
  return {
    id: `beast:${id}:self`,
    at: anchor,
    offers: [{ ...spec, at: anchor, seats: spots.length, spots }],
  };
}

function giftPlaceOf(kind: BeastKind, id: number, body: Point): Place {
  const spec = OFFERS[GIFT_OFFER[kind]] as Offer;
  return { id: `beast:${id}:gift`, at: body, offers: [{ ...spec, at: body }] };
}

/**
 * La cabaña de esta jornada, con cuerpo y sitio para cada cabeza.
 *
 * **Cuenta lo que `state.herd` dice, no lo que el tick vivo tenga** (D.6.7,
 * regla del brief): el estado llega congelado y una matanza o una cría de hoy
 * no se ve hasta mañana, exactamente como con las personas.
 *
 * El ancla sale de `doorOf`, la misma función que pone las ofertas de los
 * edificios: junto a una casa para gallinas y cerdos, junto a un campo para
 * las vacas (§7.7). Si un edificio no tiene puerta libre —encajonado del
 * todo, rarísimo— se cae al corazón de la aldea en vez de perder la cabeza:
 * la cuenta por clase tiene que cuadrar siempre con la cabaña, y un animal sin
 * sitio bueno sigue siendo un animal.
 */
export function createBeasts(
  state: GameState, land: Terrain, heart: Point, seed: number, shore: Uint8Array,
): Beast[] {
  const houses = state.buildings
    .filter((b) => (b.kind === 'house' || b.kind === 'stone_house') && b.lostTick === null)
    .sort((a, b) => a.id - b.id);
  const fields = state.buildings
    .filter((b) => b.kind === 'field' && b.lostTick === null)
    .sort((a, b) => a.id - b.id);

  const beasts: Beast[] = [];
  let n = 0;

  const spawn = (kind: BeastKind, anchor: Point): void => {
    const id = BEAST_ID_BASE + n;
    const paceDice = hash32(seed, `beast:pace:${id}`) / 4_294_967_296;
    const body: Body = {
      id, x: anchor.x, z: anchor.z, vx: 0, vz: 0, facing: 0,
      radius: RADIUS[kind], pace: PACE[kind] * (0.85 + paceDice * 0.3),
    };
    const dweller: Dweller = {
      body,
      // No es una persona: ningún villager real tiene este id. `opinionOf`
      // devuelve 0 para quien no encuentra un villager (`opinions.ts`), y
      // como un animal nunca entra en la lista que `scenes.ts` mira
      // (`village.ts` la construye sólo de `dwellers`), este campo no llega a
      // usarse — está aquí porque `Dweller` lo exige, no porque nadie lo lea.
      villager: -1 - id,
      traits: [],
      needs: freshNeeds(),
      doing: null,
      travelled: 0,
      faceAnchor: { x: anchor.x, z: anchor.z },
      scene: null,
      sceneCooldownUntil: 0,
      // V-09: la cabaña no coge trastos. Nunca cambian.
      holding: null,
      aimAt: null,
      // V-09b: la cabaña no juega, así que nunca se le pasan las ganas.
      playedUntil: 0,
      rethinkAt: Math.floor((hash32(seed, `beast:think:${id}`) / 4_294_967_296) * RETHINK),
    };
    beasts.push({
      dweller,
      kind,
      anchor,
      self: selfPlaceOf(kind, id, anchor, land, shore, seed),
      gift: giftPlaceOf(kind, id, body),
      progress: freshProgress(),
    });
    n += 1;
  };

  const anchorOf = (
    building: { x: number; y: number; w: number; h: number } | undefined,
    id: number,
  ): Point => {
    if (building === undefined) return heart;
    const door = doorOf(land, building.x, building.y, building.w, building.h);
    if (door === null) return heart;
    // **No al mismo punto exacto que la gente.** `doorOf` es determinista y
    // sin este empujón un animal se plantaba en el mismo palmo que la oferta
    // `sit` del propio edificio — la puerta es un único punto, y compartirlo
    // no es «junto a la casa», es «encima del banco». Medido: 865 forcejeos
    // de 9600 con el punto compartido, contra 768 como techo de la prueba de
    // V-06 (que no toca esta ronda). Un empujón lateral, corto y determinista
    // por bicho, saca al animal del mismo palmo sin alejarlo de la casa.
    const angle = (hash32(seed, `beast:corner:${id}`) / 4_294_967_296) * Math.PI * 2;
    const nudge = { x: door.x + Math.cos(angle) * 1.4, z: door.z + Math.sin(angle) * 1.4 };
    const inBounds = nudge.x > 0.5 && nudge.z > 0.5
      && nudge.x < land.width - 0.5 && nudge.z < land.height - 0.5;
    const candidate = inBounds && !blockedAt(land, nudge.x, nudge.z) ? nudge : door;
    // **Checklist IA-1, punto 1: libre y conectada, no sólo libre.** Antes,
    // caer en celda cerrada volvía a la puerta sin más comprobación — y la
    // puerta está a 0,82 celdas del muro, así que un cerdo de radio 0,24 se
    // pasaba el día apretado contra él. Ahora se exige además que la celda
    // esté en la misma orilla que el corazón de la aldea (`shore`,
    // `reachableFrom` en `village.ts`): un patio sin salida es tan inútil
    // como una celda dentro del muro (E.7). Si ni la puerta lo cumple, se
    // busca la celda libre y conectada más cercana (`nearestReachable`,
    // `terrain.ts`); si el valle entero estuviera cerrado —no ocurre en la
    // práctica, el corazón siempre tiene suelo alrededor— el corazón mismo
    // cierra el reparto.
    if (canReach(land, shore, candidate)) return candidate;
    return nearestReachable(land, shore, candidate) ?? heart;
  };

  // Gallinas: dos por casa, como en `render/animals.ts` (`HENS_PER_HOUSE`).
  for (let i = 0; i < state.herd.hens; i += 1) {
    const house = houses[Math.floor(i / ANIMALS.HENS_PER_HOUSE) % Math.max(1, houses.length)];
    spawn('hen', anchorOf(house, BEAST_ID_BASE + n));
  }
  // Cerdos: uno de cada dos casas (`HOUSES_PER_PIG`).
  for (let i = 0; i < state.herd.pigs; i += 1) {
    const house = houses[(i * ANIMALS.HOUSES_PER_PIG) % Math.max(1, houses.length)];
    spawn('pig', anchorOf(house, BEAST_ID_BASE + n));
  }
  // Vacas: junto a los campos, dos por cabeza (`FIELDS_PER_COW`).
  for (let i = 0; i < state.herd.cows; i += 1) {
    const field = fields[(i * ANIMALS.FIELDS_PER_COW) % Math.max(1, fields.length)];
    spawn('cow', anchorOf(field, BEAST_ID_BASE + n));
  }

  return beasts;
}

/**
 * Un paso de vida para toda la cabaña.
 *
 * **Igual que el paso de una persona en `village.ts`, con una cosa menos**: no
 * entra en escenas (`scenes.ts` sólo mira `dwellers`, las personas). Elige de
 * una lista de una sola oferta —la suya, `beast.self`—, pero desde el
 * checklist IA-1 (punto 3) esa oferta tiene varios asientos (`spotsAround`) y
 * el aforo se cuenta de verdad con el mismo `taken` que ya usó la gente este
 * paso (`village.ts`, `seats()`): así dos animales que compartieran ancla no
 * elegirían el mismo asiento sin fin, y un bicho que vuelve solo a lo suyo no
 * ve siempre «cero ocupado» sin que nadie lo cuente.
 *
 * Colisiona con lo que haya —gente, otros animales, paredes— con el mismo
 * `integrate`/`avoid`/`separate` de siempre, y por eso nunca pisa el agua: la
 * misma `Terrain.blocked` que para la gente lo impide antes de que haga falta
 * corregir nada después.
 */
export function stepBeasts(
  beasts: readonly Beast[],
  land: Terrain,
  around: Neighbourhood,
  router: Router,
  seed: number,
  step: number,
  taken: Map<string, number>,
): void {
  for (const beast of beasts) {
    const { dweller, self, progress } = beast;
    const { body } = dweller;

    const onTheWay = dweller.doing !== null && !dweller.doing.there;
    // Espera creciente, no `GIVE_UP` fijo (checklist IA-1, punto 6): igual
    // que en `village.ts`, ver `decide.ts` (`noProgress`).
    const tooLong = noProgress(dweller.doing, progress, body, step, GIVE_UP);
    if (step >= dweller.rethinkAt && (!onTheWay || tooLong)) {
      dweller.rethinkAt = step + RETHINK;
      const before = dweller.doing;
      // Checklist IA-1, punto 5: si no hay nada alcanzable que valga, una
      // pausa local siempre lo es — igual que en `village.ts`.
      dweller.doing = decide(
        { traits: [], needs: dweller.needs, at: body, id: body.id, doing: before },
        [self], taken, land, router, seed, step,
      ) ?? pauseHere(body, land, router, seed, body.id, step);
      moveSeat(taken, before, dweller.doing);
      if (dweller.doing !== before) {
        progress.at = step + PROGRESS_CHECK;
        progress.gap = Number.POSITIVE_INFINITY;
        progress.stalls = 0;
      }
    }

    if (dweller.doing !== null && dweller.doing.there && step >= dweller.doing.until) {
      dweller.doing = null;
      dweller.rethinkAt = step;
    }

    if (dweller.doing !== null && !dweller.doing.there) {
      const spot = seatAt(dweller.doing.offer, dweller.doing.seat);
      if (Math.hypot(spot.x - body.x, spot.z - body.z) <= dweller.doing.offer.reach * 0.6) {
        dweller.doing.there = true;
        dweller.doing.route.length = 0;
      }
    }
    // **Llegar es alcanzar la zona válida, no vaciar la ruta** (checklist
    // IA-1, punto 6): la comprobación de arriba ya cubre el caso normal, y si
    // la ruta se vacía sin haber pasado por ahí el cuerpo se queda de pie con
    // `there` en `false` hasta que `noProgress()` note que no se acerca.
    const next = dweller.doing === null || dweller.doing.there ? null : follow(body, dweller.doing.route);

    const want = next === null ? { x: 0, z: 0 } : seek(body, next);
    const push = separate(body, around);
    const wall = avoid(body, land);
    // La intención cumplida frena de verdad, igual que la gente en
    // `village.ts` (rework.md §3.5.3): `doing.there === true`, no «no hay
    // ruta» —`next` también es nulo sin intención todavía, y frenar ahí de
    // raíz le corta las alas a `avoid()` para sacar a la bestia de un mal
    // sitio, dejándola arrastrarse sin escapar nunca del todo—. Sin este
    // matiz, un animal que ya había llegado a su ancla seguía empujado por
    // `separate`/`avoid` con la velocidad vieja de fondo y oscilaba apretado
    // contra sus compañeros de corral.
    if (dweller.doing?.there === true) { body.vx = 0; body.vz = 0; }
    drive(body, { x: want.x + push.x + wall.x, z: want.z + push.z + wall.z });
    integrate(body, land, LIFE_STEP);

    const speed = Math.hypot(body.vx, body.vz);
    if (speed > 0.05) {
      dweller.travelled += speed * LIFE_STEP;
    } else {
      dweller.travelled = 0;
    }

    // La cara sólo sigue al cuerpo cuando el cuerpo anda de verdad: mismo
    // criterio y mismas constantes que la gente (`body.ts`,
    // `TURN_MIN_SPEED`/`TURN_MIN_PROGRESS`), porque una gallina apretada en la
    // puerta con dos compañeras da la misma vuelta sobre sí misma que una
    // persona en la misma aprieto.
    if (speed <= TURN_MIN_SPEED * body.pace) {
      dweller.faceAnchor = { x: body.x, z: body.z };
    } else if (gap(dweller.faceAnchor, body) > TURN_MIN_PROGRESS) {
      turnTo(body, Math.atan2(body.x - dweller.faceAnchor.x, body.z - dweller.faceAnchor.z), LIFE_STEP);
      dweller.faceAnchor = { x: body.x, z: body.z };
    }

    driftBeast(dweller.needs, beast.kind, LIFE_STEP);
    if (dweller.doing?.there === true) satisfy(dweller.needs, dweller.doing.offer, LIFE_STEP);
  }
}

/**
 * Dónde está cada animal ahora, para quien tenga que pintarlo.
 *
 * Forma propia y no `Animal` de `@render/animals`: la capa de vida no conoce
 * el render (E.2), y esto es sólo `{id, kind, x, y}` — lo bastante parecido
 * para que quien lo consuma lo adapte sin ceremonia, y lo bastante propio para
 * no importar de fuera de `life/`.
 */
export interface BeastSighting {
  readonly id: number;
  readonly kind: BeastKind;
  readonly x: number;
  readonly y: number;
}
