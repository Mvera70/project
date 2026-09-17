// M-06 · Plague and fire. design.md §5.8, §5.9.
//
// Neither §5.8 nor §5.9 is named in any module's brief — a gap in the document,
// not a decision. They live here because they are the other two annual rolls of
// step 2, alongside the weather, and because §5.5 and §5.6 already read the
// outbreak they produce.
//
// Both are checked once a year, in week 0, and both guard on it themselves —
// the same discipline as `resolveMigration` (§5.7).

import { DISASTER } from '../balance';
import { population } from '../people/demography';
import { int, next, weighted } from '../rng';
import type { FireResult, GameState, Outbreak } from '../state';
import { weekOf } from '../time';
import { has } from './building-counts';

/**
 * §5.8. `p = PLAGUE_BASE + people/2500`, times 0.6 if there is a well. Lasts
 * 6 to 10 weeks.
 *
 * A typical outbreak takes between a quarter and half the village. It has to
 * feel like a catastrophe, not a tax — which is why the weekly hazard of §6.5
 * is as high as it is and why the duration is short.
 *
 * Returns the outbreak for M-10 to install in `state.outbreak`; an outbreak
 * already running is never replaced by a second one.
 */
export function rollPlague(state: GameState): Outbreak | null {
  if (weekOf(state.tick) !== 0) return null;
  if (outbreakActive(state, state.outbreak)) return null;

  const people = population(state);
  if (people === 0) return null;

  let p = DISASTER.PLAGUE_BASE + people / DISASTER.PLAGUE_PER_PEOPLE;
  if (has(state, 'well')) p *= DISASTER.PLAGUE_WELL;

  if (next(state.rng, 'plague') >= p) return null;

  const weeks = int(state.rng, 'plague', DISASTER.PLAGUE_WEEKS[0], DISASTER.PLAGUE_WEEKS[1]);
  return { startedTick: state.tick, endsTick: state.tick + weeks, deaths: 0 };
}

/**
 * §5.9. Annual chance FIRE_CHANCE. Takes one roofed wooden building at random,
 * preferring the houses; a granary also costs 45 % of the stored grain, and the
 * village loses 6 morale either way. Stone does not burn — that is the
 * mechanical reward for the late progression. Neither do the fields, the well,
 * the palisade or the graveyard: they are tier 0 because §7.2's table has no
 * other column for them, not because they have anything to burn.
 *
 * **This destroys nothing.** It reports which building caught and what it
 * costs; M-14 owns the buildings and executes it. Until M-14 exists the fire is
 * rolled, recorded and not applied, which is why the roll still consumes from
 * the stream: the sequence must not shift when M-14 lands.
 *
 * Returns null if nothing caught, and also if the valley has nothing wooden
 * left to burn.
 */
export function rollFire(state: GameState): FireResult | null {
  if (weekOf(state.tick) !== 0) return null;
  if (next(state.rng, 'world') >= DISASTER.FIRE_CHANCE) return null;

  // v2.13: tier 0 **and roofed** (§5.9). The draw still happens above whatever
  // the valley holds, so narrowing this set does not shift the stream.
  const wooden = state.buildings.filter(
    (b) => b.lostTick === null && b.tier === 0 &&
      (DISASTER.FIRE_KINDS as readonly string[]).includes(b.kind),
  );
  // **M-1 · el fuego no se lleva el último techo.** La decisión del dueño del
  // diseño del 17 sep 2026 se dijo del rayo —«que caiga un rayo en una casa y
  // eso ya se muera no tiene gracia»— y vale igual para el incendio de §5.9,
  // que es el mismo hecho con otro nombre: sin esto, el rayo de `world/fate.ts`
  // respetaba la última casa y el fuego de aquí la quemaba dos semanas después.
  // Lo cazó una prueba que forzaba un solo techo (`tests/fast/pressure.test.ts`).
  // La tirada de `FIRE_CHANCE` ya se ha gastado arriba, así que esto no decide
  // **si** hay fuego, sólo a qué se lleva. Lo que sí cambia, y se dice porque
  // es verdad: cuando lo único de madera en pie es esa última casa, el sorteo
  // ponderado no llega a tirarse, y eso mueve el flujo `world` respecto a un
  // build anterior a M-1. La partida sigue siendo reproducible —misma semilla,
  // misma partida— y M-1 mueve esa secuencia de todas formas al cambiar los
  // pesos de §7.10.
  const roofs = state.buildings.filter(
    (b) => b.lostTick === null && (b.kind === 'house' || b.kind === 'stone_house'),
  ).length;
  const burnable = roofs > 1 ? wooden : wooden.filter((b) => b.kind !== 'house');
  if (burnable.length === 0) return null;

  const target = weighted(state.rng, 'world', burnable, (b) =>
    b.kind === 'house' ? DISASTER.FIRE_HOUSE_WEIGHT : 1,
  );

  return {
    buildingId: target.id,
    kind: target.kind,
    grainLost: target.kind === 'granary' ? state.village.grain * DISASTER.FIRE_GRAIN_LOSS : 0,
    moraleDelta: DISASTER.FIRE_MORALE,
  };
}

/** Whether an outbreak is running on this tick. §5.8. */
export function outbreakActive(state: GameState, outbreak: Outbreak | null): boolean {
  if (outbreak === null) return false;
  return state.tick >= outbreak.startedTick && state.tick < outbreak.endsTick;
}
