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

type LabourKind = 'field:' | 'felling' | 'works:' | 'quarry:';

const WEEK_DAYS = 7;

/**
 * Convierte manos semanales fraccionarias en una parrilla de jornadas enteras.
 *
 * El redondeo se hace sobre la semana completa y entre todos los trabajos: si
 * cada fracción se redondea por separado cada día, algunas jornadas piden más
 * personas de las que existen y la última cuota desaparece. El reparto por
 * restos mayores conserva la mezcla de `allocateLabour`; el segundo paso la
 * esparce por las plazas de la semana para no concentrar la tala en dos días.
 */
function weeklyRoster(
  shares: readonly { readonly kind: LabourKind; readonly days: number }[],
  peoplePerDay: number,
  day: number,
): ReadonlyMap<LabourKind, number> {
  const capacity = peoplePerDay * WEEK_DAYS;
  if (capacity <= 0) return new Map();

  const wanted = shares.map(share => ({ ...share, days: Math.max(0, share.days) }));
  const wantedTotal = wanted.reduce((sum, share) => sum + share.days, 0);
  const assignedTotal = Math.min(capacity, Math.round(wantedTotal));
  const scale = wantedTotal > capacity ? capacity / wantedTotal : 1;
  const counts = wanted.map(share => {
    const exact = share.days * scale;
    return { kind: share.kind, exact, count: Math.floor(exact) };
  });
  let remaining = assignedTotal - counts.reduce((sum, share) => sum + share.count, 0);
  for (const share of [...counts].sort((a, b) => (b.exact - b.count) - (a.exact - a.count)
    || a.kind.localeCompare(b.kind))) {
    if (remaining <= 0) break;
    share.count += 1;
    remaining -= 1;
  }

  const idle = capacity - counts.reduce((sum, share) => sum + share.count, 0);
  const lanes: { readonly kind: LabourKind | null; readonly count: number; done: number }[] = [
    ...counts.map(share => ({ kind: share.kind, count: share.count, done: 0 })),
    { kind: null, count: idle, done: 0 },
  ];
  const slots: (LabourKind | null)[] = [];
  for (let slot = 0; slot < capacity; slot += 1) {
    const lane = [...lanes].sort((a, b) =>
      ((slot + 1) * b.count / capacity - b.done) - ((slot + 1) * a.count / capacity - a.done)
      || (a.kind ?? 'zz').localeCompare(b.kind ?? 'zz'))[0]!;
    slots.push(lane.kind);
    lane.done += 1;
  }

  const weekDay = ((day % WEEK_DAYS) + WEEK_DAYS) % WEEK_DAYS;
  const today = new Map<LabourKind, number>();
  for (const kind of slots.slice(weekDay * peoplePerDay, (weekDay + 1) * peoplePerDay)) {
    if (kind !== null) today.set(kind, (today.get(kind) ?? 0) + 1);
  }
  return today;
}

export function dayPlans(
  state: GameState,
  places: readonly Place[],
  land: Terrain,
  starts?: ReadonlyMap<number, Point>,
  day = 0,
): ReadonlyMap<number, DayPlan> {
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
  const adults = alive.filter(v => {
    const age = ageOf(v, state.tick);
    return age >= LIFE.ADULT[0] && age <= LIFE.ADULT[1];
  });
  const idle = new Map<number, Point>();
  for (const v of alive) {
    const home = state.buildings.find(b => b.id === v.homeId && b.lostTick === null);
    const from = home === undefined ? starts?.get(v.id) ?? places[0]?.at : homeRoutine(home, land).approach;
    const age = ageOf(v, state.tick); let job: DayJob | null = null;
    if (from !== undefined && age >= LIFE.ADULT[0] && age <= LIFE.ADULT[1]) {
      const role = v.role;
      const target = role === 'smith' ? ['smithy:', 'work'] : role === 'priest' ? ['church:|chapel:', 'pray']
        : role === 'woodward' ? ['felling', 'work'] : role === 'reeve' ? ['granary:', 'work']
          // En una aldea ya formada el líder conserva la plaza. Cuando sólo
          // quedan dos adultos, sus catorce jornadas hacen falta para comer,
          // talar y construir: dirigir no puede apartar a media población.
          : role === 'leader' && adults.length > 2 ? ['square', 'gossip'] : null;
      if (target !== null) job = choose(from, places.filter(p => target[0]!.split('|').some(prefix => p.id.startsWith(prefix))), target[1]!);
      // Un cargo sin edificio o al otro lado del río no deja a la persona
      // parada: vuelve al reparto común de subsistencia.
      if (job === null) idle.set(v.id, from);
    }
    plans.set(v.id, { role: v.role, job });
  }

  // El guardabosques que conserva su puesto ya representa una jornada de tala
  // cada día; se descuenta antes de repartir el resto para no duplicarla.
  const fixedCutters = [...plans.values()].filter(plan => plan.job?.place.startsWith('felling')).length;
  const hasQuarry = places.some(place => place.id.startsWith('quarry:'));
  const buildingDays = hands.builders * WEEK_DAYS;
  const roster = weeklyRoster([
    { kind: 'field:', days: hands.farmers * WEEK_DAYS },
    { kind: 'felling', days: Math.max(0, hands.cutters - fixedCutters) * WEEK_DAYS },
    { kind: 'quarry:', days: hasQuarry ? buildingDays / 2 : 0 },
    { kind: 'works:', days: hasQuarry ? buildingDays / 2 : buildingDays },
  ], idle.size, day);
  const quotas = ([
    { prefix: 'felling' as const },
    { prefix: 'quarry:' as const },
    { prefix: 'works:' as const },
    { prefix: 'field:' as const },
  ]).map(quota => ({ ...quota, count: roster.get(quota.prefix) ?? 0 }));
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
