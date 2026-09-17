// IA-12 · El trabajo pertenece a una persona durante la jornada, no al azar de cada pausa.
import { LIFE } from '@engine/balance';
import { ageOf } from '@engine/people/villagers';
import { allocateLabour } from '@engine/subsistence/labour';
import type { GameState, Role } from '@engine/state';
import { gap, fitsCircle, type Terrain, type Point } from './body';
import { pathTo } from './navigate';
import { homeRoutine } from './home';
import { OFFERS, placedOffer, type Place } from './offers';

export interface DayJob { readonly place: string; readonly offer: string; readonly seat?: number }
export interface DayPlan { readonly role: Role | null; readonly job: DayJob | null }

export function dayPlans(state: GameState, places: readonly Place[], land: Terrain, starts?: ReadonlyMap<number, Point>): ReadonlyMap<number, DayPlan> {
  const plans = new Map<number, DayPlan>(), used = new Map<string, number>(), reserved = new Set<string>();
  const alive = state.people.villagers.filter(v => v.diedTick === null && v.leftTick === null).sort((a, b) => a.id - b.id);
  const available = (p: Place, offer: string): boolean => (used.get(p.id) ?? 0) < (p.offers.find(o => o.id === offer)?.seats ?? 0);
  const choose = (from: Point, candidates: readonly Place[], offer: string): DayJob | null => {
    for (const p of [...candidates].sort((a, b) => gap(from, a.at) - gap(from, b.at) || (a.id < b.id ? -1 : 1))) {
      if (!available(p, offer)) continue;
      const seat = p.offers.find(o => o.id === offer)?.spots?.findIndex((at, i) => !reserved.has(`${p.id}:${i}`) && pathTo(land, from, at, 0.32) !== null) ?? -1;
      if (seat < 0) continue;
      reserved.add(`${p.id}:${seat}`);
      used.set(p.id, (used.get(p.id) ?? 0) + 1); return { place: p.id, offer, seat };
    }
    return null;
  };
  const hands = allocateLabour(state);
  const quotas = [
    { prefix: 'felling', count: Math.round(hands.cutters) },
    { prefix: 'works:', count: Math.round(hands.builders) },
    { prefix: 'field:', count: Math.round(hands.farmers) },
  ];
  const idle = new Map<number, Point>();
  for (const v of alive) {
    const home = state.buildings.find(b => b.id === v.homeId && b.lostTick === null);
    const from = home === undefined ? starts?.get(v.id) ?? places[0]?.at : homeRoutine(home, land).approach;
    const age = ageOf(v, state.tick); let job: DayJob | null = null;
    if (from !== undefined && age >= LIFE.ADULT[0] && age <= LIFE.ADULT[1]) {
      const role = v.role;
      const target = role === 'smith' ? ['smithy:', 'work'] : role === 'priest' ? ['church:|chapel:', 'pray']
        : role === 'woodward' ? ['felling', 'work'] : role === 'reeve' ? ['granary:', 'work']
          : role === 'leader' ? ['square', 'gossip'] : null;
      if (target !== null) job = choose(from, places.filter(p => target[0]!.split('|').some(prefix => p.id.startsWith(prefix))), target[1]!);
      else if (role === null || role === 'stranger') idle.set(v.id, from);
    }
    plans.set(v.id, { role: v.role, job });
  }
  // Primero los tajos escasos, por proximidad, y luego los campos repartidos.
  // El orden de ids no debe enviar al recién llegado al bosque del otro extremo.
  for (const quota of quotas) {
    const candidates = places.filter(p => p.id.startsWith(quota.prefix));
    while (quota.count > 0 && idle.size > 0) {
      const pairs = [...idle].flatMap(([id, from]) => candidates.filter(p => available(p, 'work'))
        .map(place => ({ id, from, place, distance: gap(from, place.at) })))
        .sort((a, b) => a.distance - b.distance || a.id - b.id);
      let assigned = false;
      for (const pair of pairs) {
        const job = choose(pair.from, [pair.place], 'work');
        if (job === null) continue;
        plans.set(pair.id, { ...plans.get(pair.id)!, job }); idle.delete(pair.id); quota.count--; assigned = true; break;
      }
      if (!assigned) break;
    }
  }
  return plans;
}

/** Espacios próximos para pasear o jugar sin ocupar puertas ni inventar edificios. */
export function leisurePlaces(land: Terrain, home: Point, child: boolean, id: number, elder = false): Place[] {
  const out: Place[] = [];
  for (let n = 0; n < 8; n++) {
    const angle = n * 2.39996 + id, distance = 2 + n % 3;
    const at = { x: home.x + Math.cos(angle) * distance, z: home.z + Math.sin(angle) * distance };
    if (!fitsCircle(land, at.x, at.z, 0.65) || pathTo(land, home, at, 0.32) === null) continue;
    const offer = placedOffer(child ? { ...OFFERS.play!, seats: 1, seconds: [3, 6], gives: { boredom: 0.5, company: 0.1 } }
      : elder && n % 2 === 0 ? { ...OFFERS.sit!, seats: 1 }
        : { ...OFFERS.loiter!, id: 'wander', seats: 1, seconds: [4, 9] }, at, land, undefined, [at]);
    if (offer !== null) out.push({ id: `leisure:${id}:${n}`, at, offers: [offer] });
  }
  return out;
}
