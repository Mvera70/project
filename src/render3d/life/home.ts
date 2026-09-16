// IA-10 · Volver a la puerta propia, esperar el turno y dormir dentro.
import type { Building } from '@engine/state';
import { DUSK, DAWN } from '../effects/day-phases';
import { fitsCircle, gap, integrate, turnTo, type Point, type Terrain } from './body';
import { pathTo } from './navigate';
import { drive, seek, separate } from './steering';
import type { Neighbourhood } from './grid';
import type { Dweller } from './village';
import { LIFE_STEP } from './clock';

export interface HomeRoutine {
  readonly building: number;
  readonly facing: number;
  readonly approach: Point;
  readonly threshold: Point;
  stage: 'day' | 'returning' | 'opening' | 'entering' | 'sleeping' | 'leaving' | 'unreachable';
  route: Point[];
  until: number;
  retryAt: number;
}

/** Casas actuales: fachada hacia +Z, puerta centrada en X (recetas G-21). */
export function homeRoutine(building: Building, land?: Terrain, from?: Point): HomeRoutine {
  const cx = building.x + building.w / 2, cz = building.y + building.h / 2;
  const candidates = [0, -Math.PI / 2, Math.PI / 2, Math.PI].map(facing => {
    const dx = Math.round(Math.sin(facing)), dz = Math.round(Math.cos(facing));
    const edgeX = cx + dx * building.w / 2, edgeZ = cz + dz * building.h / 2;
    return { facing, approach: { x: edgeX + dx * 0.5, z: edgeZ + dz * 0.5 },
      threshold: { x: edgeX + dx * 0.34, z: edgeZ + dz * 0.34 } };
  });
  const entry = candidates.find(candidate => land === undefined || (
    fitsCircle(land, candidate.approach.x, candidate.approach.z, 0.32)
    && fitsCircle(land, candidate.threshold.x, candidate.threshold.z, 0.32)
    && (from === undefined || pathTo(land, from, candidate.approach) !== null))) ?? candidates[0]!;
  return { building: building.id, ...entry, stage: 'day', route: [], until: 0, retryAt: 0 };
}

export const isNight = (phase: number): boolean => phase >= DUSK || phase < DAWN;
export const indoors = (dweller: Dweller): boolean => dweller.residence?.stage === 'sleeping';

/** Devuelve true si esta rutina posee el movimiento; nunca atraviesa un muro.
 * El interior se representa retirando el cuerpo exterior sólo al llegar al umbral. */
export function stepHome(dweller: Dweller, phase: number, step: number, land: Terrain,
  around: Neighbourhood, people: readonly Dweller[]): boolean {
  const home = dweller.residence;
  if (home === undefined) return false;
  const { body } = dweller;
  const night = isNight(phase);
  if (!night && home.stage === 'day') return false;
  if (!night && home.stage !== 'leaving') {
    if (home.stage !== 'sleeping') { home.stage = 'day'; dweller.rethinkAt = step; return false; }
    // Una puerta sólo da paso a una persona. Al despertar se mantiene dentro
    // mientras otro miembro de la casa está saliendo.
    if (people.some(other => other !== dweller && other.residence?.building === home.building
      && other.residence.stage === 'leaving')) return true;
    home.stage = 'leaving'; home.until = step + 15;
  }
  if (night && home.stage === 'day') {
    dweller.doing = null;
    home.stage = 'returning'; home.retryAt = step;
  }
  if (home.stage === 'sleeping') { body.vx = 0; body.vz = 0; dweller.travelled = 0; return true; }
  if (home.stage === 'opening') {
    body.vx = 0; body.vz = 0;
    if (step >= home.until) home.stage = 'entering';
    return true;
  }
  let target: Point | null = null;
  if (home.stage === 'returning' || home.stage === 'unreachable') {
    if (step >= home.retryAt) {
      const route = pathTo(land, body, home.approach);
      home.route = route ?? []; home.stage = route === null ? 'unreachable' : 'returning';
      home.retryAt = step + 90; // TUNE: reintento cada tres segundos, visible en la traza.
    }
    if (home.stage === 'unreachable') { body.vx = 0; body.vz = 0; return true; }
    // No se recorta una esquina por estar cerca: el disco debe alcanzar
    // el punto seguro antes de empezar el siguiente tramo de la ruta.
    while (home.route.length > 1 && gap(body, home.route[0]!) < 0.1) home.route.shift();
    target = home.route[0] ?? home.approach;
    const owner = people.find(other => other !== dweller && other.residence?.building === home.building
      && ['opening', 'entering', 'leaving'].includes(other.residence.stage));
    // Esperar pegado a quien entra impide que alcance el umbral.
    if (owner !== undefined && gap(body, home.approach) < 1.2) {
      const dx = Math.round(Math.sin(home.facing)), dz = Math.round(Math.cos(home.facing));
      target = [
        { x: home.approach.x + dx, z: home.approach.z + dz },
        { x: home.approach.x + dz, z: home.approach.z - dx },
        { x: home.approach.x - dz, z: home.approach.z + dx },
      ].filter(point => fitsCircle(land, point.x, point.z, body.radius))
        .sort((a, b) => gap(body, a) - gap(body, b))[0] ?? null;
    }
    if (gap(body, home.approach) < 0.45) {
      if (owner === undefined) { home.stage = 'opening'; home.until = step + 15; target = null; }
    }
  } else if (home.stage === 'entering') {
    target = home.threshold;
    if (gap(body, home.threshold) < 0.12) {
      home.stage = 'sleeping'; body.vx = 0; body.vz = 0; return true;
    }
  } else if (home.stage === 'leaving') {
    target = step < home.until ? null : home.approach;
    if (step >= home.until && gap(body, home.approach) < 0.06) { home.stage = 'day'; dweller.rethinkAt = step; }
  }
  const before = { x: body.x, z: body.z };
  const want = target === null ? { x: 0, z: 0 } : seek(body, target);
  // Las curvas de la ruta no son destinos donde detenerse.
  if (target !== null && home.stage === 'returning' && home.route.length > 1
    && gap(body, home.approach) > 1.2) {
    const distance = gap(body, target);
    const speed = Math.min(body.pace, distance / LIFE_STEP);
    if (distance > 0) { want.x = (target.x - body.x) / distance * speed; want.z = (target.z - body.z) / distance * speed; }
  }
  // En el tramo autorizado hasta el umbral no hay repulsión de fachada;
  // la colisión sólida sigue activa. Fuera de él se usa el movimiento común.
  const portal = gap(body, home.approach) < 1 || home.stage === 'entering' || home.stage === 'leaving';
  const push = portal ? { x: 0, z: 0 } : separate(body, around);
  // La ruta ya rodea los sólidos. Sumar aquí una repulsión de pared capaz
  // de anular seek impedía recorrer las calles de una celda de ancho.
  drive(body, { x: want.x + push.x, z: want.z + push.z });
  integrate(body, land, LIFE_STEP);
  const moved = gap(body, before);
  dweller.travelled = moved > 0.00001 ? dweller.travelled + moved : 0;
  if (moved > 0.00001) turnTo(body, Math.atan2(body.x - before.x, body.z - before.z), LIFE_STEP);
  return true;
}
