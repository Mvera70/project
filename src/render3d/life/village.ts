// V-06 · La aldea viva, entera. design.md Anexo E.
//
// Aquí se juntan las seis fases: el reloj de paso fijo (V-01), los cuerpos que
// ocupan sitio (V-02), la navegación (V-03), lo que a cada uno le pide el
// cuerpo (V-04), lo que el mundo ofrece (V-05) y la elección (V-06).
//
// **Un paso de esta función es un instante del valle.** Todo lo que pase en
// pantalla sale de aquí, y nada de aquí sale del reloj de la pared ni escribe
// una coma en `GameState`.

import type { GameState, Trait, VillagerId } from '@engine/state';
import { FOOD } from '@engine/balance';
import { population } from '@engine/people/demography';
import { hash32 } from '@engine/rng';
import { integrate, turnTo, type Body, type Terrain } from './body';
import { createNeighbourhood, type Neighbourhood } from './grid';
import { avoid, drive, resolve, seek, separate } from './steering';
import { createRouter, follow, type Router } from './navigate';
import { canReach, reachableFrom, terrainOf } from './terrain';
import { drift, freshNeeds, type Doing, type Needs } from './needs';
import { placesOf, seatAt, seatKey, type Place } from './offers';
import { commons } from './places';
import { decide, satisfy, RETHINK, type Intent } from './decide';
import { LIFE_STEP, seedOfDay } from './clock';

/**
 * Lo que se aguanta yendo a un sitio antes de pensárselo otra vez, en pasos.
 *
 * TUNE: 600, veinte segundos escénicos. Cruzar el valle entero son unos quince,
 * así que esto sólo salta cuando algo ha salido mal: el sitio se llenó mientras
 * se iba, o hay medio pueblo cortando el paso.
 */
const GIVE_UP = 600;

/** Una persona, entera: cuerpo, cabeza y lo que está haciendo. */
export interface Dweller {
  readonly body: Body;
  readonly villager: VillagerId;
  readonly traits: readonly Trait[];
  readonly needs: Needs;
  doing: Intent | null;
  /** En qué paso le toca replantearse la vida. Escalonado, no todos a la vez. */
  rethinkAt: number;
  /**
   * Suelo recorrido desde que empezó a andar, en celdas.
   *
   * Lo que mueve el clip de la zancada (G-04): la animación avanza con el suelo
   * que se pisa, no con el reloj, y por eso los pies no patinan. Se pone a cero
   * al pararse, que es cuando empieza otra caminata.
   */
  travelled: number;
}

export interface Village {
  readonly land: Terrain;
  readonly places: readonly Place[];
  readonly dwellers: readonly Dweller[];
  /** Un paso de vida para todos. */
  step(): void;
  /** Cuántos pasos lleva la jornada. */
  readonly steps: number;
  /** Qué está haciendo la aldea ahora, para poder contarlo. */
  tally(): Record<string, number>;
}

/**
 * Monta la aldea de una jornada sobre el estado del motor.
 *
 * El estado llega **congelado** (§D.6.7): lo que el motor decida durante el día
 * entra mañana. Aquí no se lee nada que pueda cambiar a media jornada.
 */
export function createVillage(state: GameState, day: number): Village {
  const land = terrainOf(state);
  const seed = seedOfDay(state.seed, day);
  const places = [...placesOf(state, land), ...commons(state, land)];
  const around: Neighbourhood = createNeighbourhood(land.width, land.height);
  const router: Router = createRouter();

  // El hambre de la aldea, que agria a todo el mundo (§7.9). Se lee una vez: es
  // del tick, y el tick no cambia dentro de una jornada.
  const people = Math.max(1, population(state));
  const weeks = state.village.grain / (people * FOOD.GRAIN_PER_PERSON);
  const hunger = Math.max(0, Math.min(1, 1 - weeks / 12));

  // Quién vive aquí. Sólo los que están y sólo donde se puede estar: alguien al
  // otro lado del río no tiene nada que hacer en esta orilla, y el río no se
  // cruza (ver `terrain.ts`).
  const dwellers: Dweller[] = [];
  // El corazón es el sitio con más vecinos a mano, no el primero de la lista:
  // el primero puede caer al otro lado del río y entonces «esta orilla» sería
  // la que no tiene pueblo.
  let heart = places[0]?.at ?? { x: land.width / 2, z: land.height / 2 };
  let most = -1;
  for (const place of places) {
    const near = places.filter(
      (other) => Math.hypot(other.at.x - place.at.x, other.at.z - place.at.z) < 14,
    ).length;
    if (near > most) { most = near; heart = place.at; }
  }
  const shore = reachableFrom(land, heart);
  // **Y sólo cuentan los sitios de esta orilla.** El río no se cruza, así que un
  // sitio del otro lado no es un sitio para esta gente: dejar a alguien allí era
  // condenarle a andar sin llegar nunca, y se veía — medido, hasta el 83 % de la
  // jornada en tránsito en las semillas donde el pueblo queda partido.
  const mine = places.filter((place) => canReach(land, shore, place.at));

  const alive = state.people.villagers.filter((v) => v.diedTick === null && v.leftTick === null);
  alive.forEach((villager, n) => {
    // Se le deja junto a un sitio de la aldea, repartidos.
    const spot = mine[n % Math.max(1, mine.length)]?.at ?? heart;
    let x = spot.x;
    let z = spot.z;
    for (let ring = 0; ring < 40; ring += 1) {
      const angle = ring * 2.39996;
      const reach = 0.6 + ring * 0.35;
      const tryX = spot.x + Math.sin(angle) * reach;
      const tryZ = spot.z + Math.cos(angle) * reach;
      if (tryX <= 1 || tryZ <= 1 || tryX >= land.width - 1 || tryZ >= land.height - 1) continue;
      if (!canReach(land, shore, { x: tryX, z: tryZ })) continue;
      if (dwellers.some((d) => Math.hypot(d.body.x - tryX, d.body.z - tryZ) < 0.8)) continue;
      x = tryX; z = tryZ; break;
    }
    const pace = 1.05 + (hash32(seed, `pace:${villager.id}`) / 4_294_967_296) * 0.6;
    dwellers.push({
      body: { id: n, x, z, vx: 0, vz: 0, facing: 0, radius: 0.32, pace },
      villager: villager.id,
      traits: villager.traits,
      needs: freshNeeds(),
      doing: null,
      travelled: 0,
      // Escalonados: si todos se replantean la vida en el mismo paso, la aldea
      // entera cambia de idea a la vez y se ve el mecanismo.
      rethinkAt: Math.floor((hash32(seed, `think:${villager.id}`) / 4_294_967_296) * RETHINK),
    });
  });

  const bodies = dwellers.map((d) => d.body);
  let steps = 0;

  /** Cuánta gente hay en cada oferta ahora mismo. */
  function seats(): Map<string, number> {
    const taken = new Map<string, number>();
    for (const dweller of dwellers) {
      if (dweller.doing === null) continue;
      const key = seatKey(dweller.doing.place, dweller.doing.offer);
      taken.set(key, (taken.get(key) ?? 0) + 1);
    }
    return taken;
  }

  return {
    land,
    places: mine,
    dwellers,
    get steps(): number { return steps; },

    tally(): Record<string, number> {
      const count: Record<string, number> = {};
      for (const dweller of dwellers) {
        const what = dweller.doing === null ? 'nada'
          : dweller.doing.there ? dweller.doing.offer.id : 'andando';
        count[what] = (count[what] ?? 0) + 1;
      }
      return count;
    },

    step(): void {
      const taken = seats();
      // Se va actualizando conforme la gente decide: ver el comentario de abajo.
      around.rebuild(bodies);

      for (const dweller of dwellers) {
        const { body } = dweller;

        // 1 · ¿Toca replantearse?
        //
        //     **No mientras se va de camino**, que fue el fallo gordo de la
        //     primera versión: replanteándose cada segundo y medio, la gente
        //     cambiaba de destino antes de llegar y se pasaba el día andando.
        //     Medido: entre el 72 % y el 91 % de la jornada en tránsito, y casi
        //     nadie haciendo nada. Uno decide ir al pozo y va; no reconsidera su
        //     vida cada dos pasos.
        //
        //     Con un tope, eso sí: si el camino se ha hecho eterno —porque el
        //     sitio se llenó, o porque hay medio pueblo por medio— se replantea
        //     igual. Quedarse andando para siempre es el otro modo de fallar.
        const onTheWay = dweller.doing !== null && !dweller.doing.there;
        const tooLong = dweller.doing !== null && steps - dweller.doing.since > GIVE_UP;
        if (steps >= dweller.rethinkAt && (!onTheWay || tooLong)) {
          dweller.rethinkAt = steps + RETHINK;
          const before = dweller.doing;
          dweller.doing = decide(
            { traits: dweller.traits, needs: dweller.needs, at: body, id: body.id, doing: before },
            mine, taken, land, router, seed, steps,
          );
          // **La plaza se reserva al decidir, no al llegar**, y ése era el imán
          // que se veía en pantalla: el aforo se contaba una vez al empezar el
          // paso, así que los veinte que decidían en ese instante veían el mismo
          // pozo libre y se iban los veinte. Medido: setenta y cinco veces más
          // gente de la que cabe yendo al mismo sitio en una sola jornada.
          if (before !== null) {
            const old = seatKey(before.place, before.offer);
            taken.set(old, Math.max(0, (taken.get(old) ?? 1) - 1));
          }
          if (dweller.doing !== null) {
            const now = seatKey(dweller.doing.place, dweller.doing.offer);
            taken.set(now, (taken.get(now) ?? 0) + 1);
          }
        }

        // 2 · ¿Se acabó lo que estaba haciendo?
        if (dweller.doing !== null && dweller.doing.there && steps >= dweller.doing.until) {
          dweller.doing = null;
          dweller.rethinkAt = steps;
        }

        // 3 · Andar hacia ello, o estarse haciéndolo.
        //
        //     **Se llega cuando se está a su alcance, no cuando se pisa el
        //     punto.** Para eso existe `reach` en la oferta, y no usarlo fue la
        //     segunda mitad del mismo fallo: en sitios apretados entre casas, el
        //     empujón de las paredes impide clavarse en el punto exacto y la
        //     gente se quedaba dando vueltas al lado de donde quería estar.
        if (dweller.doing !== null && !dweller.doing.there) {
          const spot = seatAt(dweller.doing.offer, dweller.doing.seat);
          if (Math.hypot(spot.x - body.x, spot.z - body.z) <= dweller.doing.offer.reach * 0.6) {
            dweller.doing.there = true;
            dweller.doing.route.length = 0;
          }
        }
        const next = dweller.doing === null || dweller.doing.there
          ? null
          : follow(body, dweller.doing.route);
        if (dweller.doing !== null && !dweller.doing.there && next === null) {
          dweller.doing.there = true;
        }

        const want = next === null ? { x: 0, z: 0 } : seek(body, next);
        const push = separate(body, around);
        const wall = avoid(body, land);
        drive(body, { x: want.x + push.x + wall.x, z: want.z + push.z + wall.z });
        integrate(body, land, LIFE_STEP);

        const speed = Math.hypot(body.vx, body.vz);
        if (speed > 0.05) {
          turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
          dweller.travelled += speed * LIFE_STEP;
        } else {
          dweller.travelled = 0;
        }

        // 4 · Y lo que eso le hace por dentro.
        let company = false;
        around.near(body, (other) => {
          if (!company && Math.hypot(other.x - body.x, other.z - body.z) < 2.2) company = true;
        });
        const doing: Doing = {
          moving: speed > 0.25,
          withOthers: company,
          working: dweller.doing?.there === true && dweller.doing.offer.id === 'work',
          hunger,
        };
        drift(dweller.needs, dweller.traits, doing, LIFE_STEP);
        if (dweller.doing?.there === true) satisfy(dweller.needs, dweller.doing.offer, LIFE_STEP);
      }

      resolve(bodies, around, land);
      steps += 1;
    },
  };
}
