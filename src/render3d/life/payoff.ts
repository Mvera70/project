// E0 · La plata que compra la vuelta se vive en el portón, no en el motor.

import { THREAT, TIME } from '@engine/balance';
import { flagSet } from '@engine/crossroads/conditions';
import { hasTrait, type GameState } from '@engine/state';
import { gap, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import type { Neighbourhood } from './grid';
import { follow, pathTo, type Waypoint } from './navigate';
import { drive, separate } from './steering';
import { LIFE_STEP } from './clock';

/** Un porte de plata: sale por el portón y sigue ladera arriba. */
export interface PayoffTrip {
  /** Ancla que la ruta cruza: es el portón real, no una dirección aproximada. */
  readonly gate: Point;
  route: Waypoint[];
}

/** La semana exacta que el motor devuelve `turned_back`, ya sin amenaza en camino. */
export function payoffActive(state: GameState, day: number): boolean {
  if (!flagSet(state, 'bought_off') || state.threat.comingTick !== null) return false;
  let payment = undefined;
  for (let index = state.history.length - 1; index >= 0; index -= 1) {
    const record = state.history[index];
    if (record?.templateId === 'raiders_coming' && record.optionId === 'pay') {
      payment = record;
      break;
    }
  }
  if (payment === undefined) return false;
  const warning = hasTrait(state, 'watch') ? THREAT.WATCH_WARNING_WEEKS : THREAT.WARNING_WEEKS;
  return state.tick === payment.tick + warning && day === state.tick * TIME.DAYS_PER_WEEK;
}

/** El portón real y el lado de la ladera al que tienen que subir. */
export function payoffRoute(
  land: Terrain, origin: Point, gate: Point, approach: Point, radius: number,
): PayoffTrip | null {
  const dx = approach.x - gate.x;
  const dz = approach.z - gate.z;
  const length = Math.hypot(dx, dz);
  if (length <= 1e-6) return null;
  const ux = dx / length;
  const uz = dz / length;
  const outside = { x: gate.x + ux * 1.15, z: gate.z + uz * 1.15 };
  // La ruta se parte en el ancla de la puerta: no hay atajo geométrico que
  // convierta una salida por el portón en un paseo por otro lado del cerco.
  const toGate = pathTo(land, origin, gate, radius);
  const throughGate = pathTo(land, gate, outside, radius);
  const uphill = pathTo(land, outside, approach, radius);
  if (toGate === null || throughGate === null || uphill === null) return null;
  return { gate: { ...gate }, route: [...toGate, ...throughGate, ...uphill] };
}

/** La salida nace donde ya estaba el cuerpo: sólo se limpia su inercia anterior. */
export function beginPayoff(body: Body): void {
  body.vx = 0;
  body.vz = 0;
}

/** Un paso de salida: mismas colisiones y misma navegación que cualquier vecino. */
export function stepPayoff(body: Body, trip: PayoffTrip, land: Terrain, around: Neighbourhood): boolean {
  const next = follow(body, trip.route);
  if (next === null) {
    body.vx = 0;
    body.vz = 0;
    return false;
  }
  const distance = gap(body, next);
  const want = distance <= 1e-9 ? { x: 0, z: 0 } : {
    x: (next.x - body.x) / distance * Math.min(body.pace, distance / LIFE_STEP),
    z: (next.z - body.z) / distance * Math.min(body.pace, distance / LIFE_STEP),
  };
  const push = separate(body, around);
  drive(body, { x: want.x + push.x * 0.25, z: want.z + push.z * 0.25 });
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  integrate(body, land, LIFE_STEP);
  return true;
}
