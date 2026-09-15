// R-1 · Los sucesos del valle. design.md §4.2 (paso 2b), §7.10, §12.10.
//
// El rework empieza aquí. El dueño del diseño lo pidió el 15 sep 2026 —«esto
// tiene que ser mucho más aleatorio y con mucha más vida»— y el diagnóstico de
// `docs/findings-drama.md` dice por qué hacía falta: todo lo dramático del
// motor colgaba de las encrucijadas, y las encrucijadas salen diez veces en
// cuarenta años. Las opiniones sólo se movían con ellas, así que no había
// rencores, así que no había riñas, así que media docena de plantillas no salía
// nunca. Un ciclo que necesitaba un empujón que nadie daba.
//
// **Aquí el mundo pasa cosas por su cuenta.** Cada semana se tira contra una
// tabla de sucesos, y el que sale cambia el estado, escribe en la crónica y
// **se ve** —reutiliza los efectos visibles de §11.5, los mismos que las
// opciones de encrucijada—. No hay decisión que tomar: pasan, como pasa un
// incendio. Y pesan distinto según el cielo, la estación y los rasgos del
// valle, que es lo que hace que dos valles con la misma fila de clima no se
// parezcan.
//
// Determinista por el flujo `fate` y nada más: ningún suceso toca otro flujo,
// y hay prueba. El cielo lo pregunta a `world/sky.ts`, que no consume tiradas.

import { DISASTER, FATE, LIFE, TIME } from '../balance';
import { flagSet, ratioOf } from '../crossroads/conditions';
import type { VisualEffect } from '../crossroads/schema';
import { isHere, population } from '../people/demography';
import { adjustOpinion, opinionOf } from '../people/opinions';
import { scarFire } from '../people/scars';
import { ageOf } from '../people/villagers';
import { int, next, weighted } from '../rng';
import type { Building, ChronicleEntry, GameState, HappeningId, HappeningRecord, VillagerId } from '../state';
import { HAPPENINGS } from '../state';
import { count, has, standing } from '../subsistence/building-counts';
import { seasonOf, weekOf } from '../time';
import { destroyBuilding } from './buildings';
import { weekWeather } from './sky';

/** Lo que `rollFate` devuelve al tick: el registro y la línea de crónica. */
export interface FateOutcome {
  readonly record: HappeningRecord;
  readonly entry: Omit<ChronicleEntry, 'tick'>;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function moraleBy(state: GameState, delta: number): void {
  state.village.morale = clamp(state.village.morale + delta, 0, 100);
}

function faithBy(state: GameState, delta: number): void {
  state.village.faith = clamp(state.village.faith + delta, 0, 100);
}

/** Los adultos vivos, por edad de §12.4. */
function adults(state: GameState) {
  return state.people.villagers.filter((v) =>
    isHere(v) && ageOf(v, state.tick) >= LIFE.ADULT[0] && ageOf(v, state.tick) <= LIFE.ADULT[1]);
}

function children(state: GameState) {
  return state.people.villagers.filter((v) => isHere(v) && ageOf(v, state.tick) < LIFE.ADULT[0]);
}

/** Lo que puede arder: madera en pie. La misma lista que el incendio de §5.9. */
function wooden(state: GameState): Building[] {
  return state.buildings.filter((b) =>
    b.lostTick === null && b.tier === 0
    && (DISASTER.FIRE_KINDS as readonly string[]).includes(b.kind));
}

/** Cuánto pesa un rasgo del valle en un suceso: 1 si no lo tiene. */
function trait(state: GameState, name: string, factor: number): number {
  return (state.traits as readonly string[]).includes(name) ? factor : 1;
}

interface Context {
  readonly season: ReturnType<typeof seasonOf>;
  readonly week: number;
  readonly sky: ReturnType<typeof weekWeather>;
  readonly people: number;
}

/**
 * Cuánto pesa cada suceso esta semana, o cero si no puede pasar. Es la tabla
 * de §12.10 leída con el estado delante: la estación abre y cierra sucesos, el
 * cielo pesa los que dependen de él, y los rasgos del valle inclinan el resto.
 * Un peso cero es «imposible ahora», no «raro».
 */
function weightOf(state: GameState, id: HappeningId, ctx: Context): number {
  const w = FATE.WEIGHT[id];
  switch (id) {
    case 'lightning_fire':
      // Sin puertas: el dueño del diseño pidió que el caos sea el juego y que
      // una partida pueda romperse (`docs/rework.md` §2.6). El rayo pide sólo
      // lo que la física pide, tormenta y algo de madera en pie, aunque eso
      // sea la única casa de la pareja fundadora.
      return ctx.sky.storms > 0 && wooden(state).length > 0 ? w * ctx.sky.storms : 0;
    case 'river_flood':
      return ctx.season === 'spring' && ctx.sky.wet >= FATE.FLOOD_WET_DAYS
        ? w * trait(state, 'bare_hills', 0.5) : 0;
    case 'wolves_at_the_coop':
      return ctx.season === 'winter' && state.herd.hens > 0
        ? w * trait(state, 'old_forest', 1.6) * trait(state, 'bare_hills', 0.5) : 0;
    case 'wedding':
      return adults(state).length >= FATE.WEDDING_MIN_ADULTS ? w : 0;
    case 'pedlar':
      return ctx.season === 'summer' && state.village.wood >= FATE.PEDLAR_WOOD * 2 ? w : 0;
    case 'good_catch':
      return (ctx.season === 'spring' || ctx.season === 'summer') && ctx.sky.wet <= 3 ? w : 0;
    case 'roof_under_snow':
      return ctx.season === 'winter' && ctx.sky.snow >= FATE.ROOF_SNOW_DAYS && count(state, 'house') > 0
        ? w : 0;
    case 'harvest_feast':
      // Sólo entra en el sorteo si no es un rito; como rito lo trata `rollFate`.
      return !FATE.FEAST_IS_A_RITE && feastDue(state, ctx) ? w : 0;
    case 'quarrel_in_the_square':
      return state.people.namedIds.filter((id) => {
        const v = state.people.villagers.find((x) => x.id === id);
        return v !== undefined && isHere(v);
      }).length >= 2 ? w : 0;
    case 'bear_in_the_wood':
      // En verano y otoño, que es cuando el oso baja a comer; en un valle de
      // bosque viejo, el doble.
      // En un valle de bosque viejo baja cada verano; en los demás sólo si
      // queda mucho bosque en pie. Es lo que hace que un valle tenga osos y
      // otro no, que es la clase de diferencia que se compara.
      return (ctx.season === 'summer' || ctx.season === 'autumn')
        && (trait(state, 'old_forest', 2) > 1 || ratioOf(state, 'forestLeft') >= FATE.BEAR_FOREST)
        ? w * trait(state, 'old_forest', 2) : 0;
    case 'child_lost':
      return children(state).length > 0 ? w : 0;
    case 'stranger_passes':
      return flagSet(state, 'hostile') ? 0 : w;
    default:
      return 0;
  }
}

/** La semana de la fiesta: la siguiente a la siega, con grano en el granero y gente. */
function feastDue(state: GameState, ctx: Context): boolean {
  return ctx.week === TIME.HARVEST_WEEK + 1 && ctx.people >= FATE.FEAST_MIN_PEOPLE
    && state.village.grain > 0;
}

/**
 * Los dos nombrados que peor se llevan, para la riña de la plaza. Si nadie se
 * lleva mal todavía, los dos primeros: es el empujón inicial que
 * `findings-drama.md` §1 dice que nadie daba.
 */
function worstPair(state: GameState): [VillagerId, VillagerId] | null {
  const named = state.people.namedIds.filter((id) => {
    const v = state.people.villagers.find((x) => x.id === id);
    return v !== undefined && isHere(v);
  });
  if (named.length < 2) return null;
  let best: [VillagerId, VillagerId] | null = null;
  let lowest = Number.POSITIVE_INFINITY;
  for (const a of named) {
    for (const b of named) {
      if (a >= b) continue;
      const mutual = opinionOf(state, a, b) + opinionOf(state, b, a);
      if (mutual < lowest) {
        lowest = mutual;
        best = [a, b];
      }
    }
  }
  return best;
}

function nameOf(state: GameState, id: VillagerId): string {
  return state.people.villagers.find((v) => v.id === id)?.name ?? '';
}

/**
 * Aplica el suceso al estado y devuelve el registro y su línea. Cada rama es
 * un suceso entero: el efecto, lo que se cuenta y lo que se ve. Consume azar
 * sólo del flujo `fate`.
 */
function happen(state: GameState, id: HappeningId, ctx: Context): FateOutcome {
  const params: Record<string, string | number> = { season: ctx.season, year: Math.floor(state.tick / TIME.WEEKS_PER_YEAR) };
  const visible: VisualEffect[] = [];
  const who: VillagerId[] = [];
  let weight: 1 | 2 | 3 = 2;
  let key = `fate.${id}`;

  switch (id) {
    case 'lightning_fire': {
      const target = weighted(state.rng, 'fate', wooden(state), (b) =>
        b.kind === 'house' ? FATE.LIGHTNING_HOUSE_WEIGHT : 1);
      // Como el incendio de §5.9: la marca antes de la ruina, porque después
      // nadie tiene `homeId` apuntando a ella.
      scarFire(state, target.id);
      destroyBuilding(state, target.id);
      moraleBy(state, FATE.LIGHTNING_MORALE);
      params['building'] = target.kind;
      visible.push({ k: 'ruin', kind: target.kind });
      weight = 3;
      break;
    }
    case 'river_flood': {
      const lost = Math.round(state.village.grain * FATE.FLOOD_GRAIN_LOSS);
      state.village.grain = Math.max(0, state.village.grain - lost);
      moraleBy(state, FATE.FLOOD_MORALE);
      params['grain'] = lost;
      visible.push({ k: 'gather', where: 'ford', days: 1 });
      break;
    }
    case 'wolves_at_the_coop': {
      const taken = Math.min(state.herd.hens, int(state.rng, 'fate', FATE.WOLVES_HENS[0], FATE.WOLVES_HENS[1]));
      state.herd.hens -= taken;
      moraleBy(state, FATE.WOLVES_MORALE);
      params['count'] = taken;
      break;
    }
    case 'wedding': {
      moraleBy(state, FATE.WEDDING_MORALE);
      faithBy(state, FATE.WEDDING_FAITH);
      visible.push({ k: 'gather', where: has(state, 'chapel') || has(state, 'church') ? 'chapel' : 'square', days: 2 });
      break;
    }
    case 'pedlar': {
      state.village.wood = Math.max(0, state.village.wood - FATE.PEDLAR_WOOD);
      state.village.grain += FATE.PEDLAR_GRAIN;
      params['wood'] = FATE.PEDLAR_WOOD;
      params['grain'] = FATE.PEDLAR_GRAIN;
      visible.push({ k: 'gather', where: 'square', days: 1 });
      break;
    }
    case 'good_catch': {
      const grain = int(state.rng, 'fate', FATE.CATCH_GRAIN[0], FATE.CATCH_GRAIN[1]);
      state.village.grain += grain;
      moraleBy(state, FATE.CATCH_MORALE);
      params['grain'] = grain;
      visible.push({ k: 'gather', where: 'ford', days: 1 });
      break;
    }
    case 'roof_under_snow': {
      const houses = standing(state, 'house').filter((b) => b.blockedUntil === null);
      const house = houses.length > 0 ? weighted(state.rng, 'fate', houses, () => 1) : null;
      if (house !== null) house.blockedUntil = state.tick + FATE.ROOF_BLOCK_WEEKS;
      state.village.wood = Math.max(0, state.village.wood - FATE.ROOF_WOOD);
      moraleBy(state, FATE.ROOF_MORALE);
      params['wood'] = FATE.ROOF_WOOD;
      break;
    }
    case 'harvest_feast': {
      moraleBy(state, FATE.FEAST_MORALE);
      faithBy(state, FATE.FEAST_FAITH);
      visible.push({ k: 'gather', where: has(state, 'chapel') || has(state, 'church') ? 'chapel' : 'square', days: 2 });
      break;
    }
    case 'quarrel_in_the_square': {
      const pair = worstPair(state);
      if (pair !== null) {
        adjustOpinion(state, pair[0], pair[1], FATE.QUARREL_OPINION);
        adjustOpinion(state, pair[1], pair[0], FATE.QUARREL_OPINION);
        who.push(pair[0], pair[1]);
        params['A'] = nameOf(state, pair[0]);
        params['B'] = nameOf(state, pair[1]);
      }
      moraleBy(state, FATE.QUARREL_MORALE);
      visible.push({ k: 'gather', where: 'square', days: 1 });
      break;
    }
    case 'bear_in_the_wood': {
      state.flags['bear'] = state.tick + FATE.BEAR_WEEKS;
      moraleBy(state, FATE.BEAR_MORALE);
      break;
    }
    case 'child_lost': {
      moraleBy(state, FATE.CHILD_MORALE);
      const child = weighted(state.rng, 'fate', children(state), () => 1);
      if (child.named) who.push(child.id);
      key = child.named ? 'fate.child_lost.named' : 'fate.child_lost';
      if (child.named) params['A'] = child.name;
      visible.push({ k: 'gather', where: 'ford', days: 1 });
      break;
    }
    case 'stranger_passes': {
      moraleBy(state, FATE.STRANGER_MORALE);
      visible.push({ k: 'gather', where: 'square', days: 1 });
      weight = 1;
      break;
    }
    default:
      break;
  }

  return {
    record: { tick: state.tick, id, visible, who },
    entry: { kind: 'happening', templateKey: key, params, weight },
  };
}

/**
 * Paso 2b del tick (§4.2). Una tirada por semana contra `FATE.WEEKLY_CHANCE`;
 * si sale, el sorteo por peso entre los sucesos que hoy pueden pasar. Nunca
 * dos semanas seguidas: un suceso pegado a otro no se lee, se apila.
 *
 * Devuelve `null` casi siempre. Cuando no, el estado ya está cambiado y el
 * tick sólo tiene que contar y enseñar.
 */
export function rollFate(state: GameState): FateOutcome | null {
  const ctx: Context = {
    season: seasonOf(state.tick),
    week: weekOf(state.tick),
    sky: weekWeather(state.seed, state.weather.index, state.tick),
    people: population(state),
  };
  // Los ritos no se sortean: la fiesta de la cosecha se celebra si se puede.
  // Va antes del hueco mínimo porque una fiesta pegada a otro suceso no se
  // apila: es la semana de la siega y punto.
  if (FATE.FEAST_IS_A_RITE && feastDue(state, ctx)) return happen(state, 'harvest_feast', ctx);

  const last = state.happenings[state.happenings.length - 1];
  if (last !== undefined && state.tick - last.tick < FATE.MIN_GAP_WEEKS) return null;
  if (next(state.rng, 'fate') >= FATE.WEEKLY_CHANCE) return null;
  const candidates = HAPPENINGS.filter((id) => weightOf(state, id, ctx) > 0);
  if (candidates.length === 0) return null;
  const id = weighted(state.rng, 'fate', candidates, (c) => weightOf(state, c, ctx));
  return happen(state, id, ctx);
}
