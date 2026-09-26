// Presas silvestres de la caza real. Son cuerpos efímeros: su conducta nunca
// cobra alimento ni escribe cambios en la partida.

import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import type { Animal } from '@derive/animals';
import { fellingTarget } from '@engine/world/forest';
import { fitsCircle, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import { LIFE_STEP } from './clock';
import { canReach, reachableFrom, reachableNear } from './terrain';

export type WildKind = 'partridge' | 'rabbit' | 'boar';

export interface WildPrey {
  readonly kind: WildKind;
  readonly body: Body;
  readonly home: Point;
  phase: 'roam' | 'flee' | 'charge' | 'down' | 'gone';
  health: number;
  altitude: number;
  readonly expiresAt: number;
  target: Point;
  readonly start: number;
  /** Cuándo echó a volar (la perdiz), y si aún está despegando. */
  fleeSince?: number;
  takingOff?: boolean;
}

const IDS: Record<WildKind, number> = { partridge: 42_000, rabbit: 42_001, boar: 42_002 };
const RADII: Record<WildKind, number> = { partridge: 0.2, rabbit: 0.25, boar: 0.38 };
const SPEEDS: Record<WildKind, number> = { partridge: 1.5, rabbit: 1.15, boar: 0.85 };
const MAX_RANGE = 11;
/** Lo que dura el despegue de la perdiz, en pasos: el clip `takeoff` (1,17 s). */
const TAKEOFF_STEPS = Math.round(1.17 / LIFE_STEP);

function preferred(kind: WildKind, code: number): boolean {
  if (kind === 'boar') return code === TERRAIN_CODE.forest;
  if (kind === 'rabbit') return code === TERRAIN_CODE.meadow || code === TERRAIN_CODE.forest;
  return code === TERRAIN_CODE.meadow;
}

/** Busca una celda transitable en la zona que alimenta la caza del valle. */
export function createWildPrey(
  state: GameState, land: Terrain, seed: number, heart: Point, kind: WildKind,
): WildPrey | null {
  const tree = fellingTarget(state);
  if (tree === null) return null;
  const tx = tree % land.width, tz = Math.floor(tree / land.width);
  const connected = reachableNear(land, heart);
  const search = (nearTree: boolean): { x: number; z: number; score: number } | null => {
    let best: { x: number; z: number; score: number } | null = null;
    const minZ = nearTree ? Math.max(1, tz - MAX_RANGE) : 1;
    const maxZ = nearTree ? Math.min(land.height - 2, tz + MAX_RANGE) : land.height - 2;
    const minX = nearTree ? Math.max(1, tx - MAX_RANGE) : 1;
    const maxX = nearTree ? Math.min(land.width - 2, tx + MAX_RANGE) : land.width - 2;
    for (let z = minZ; z <= maxZ; z += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const cell = z * land.width + x;
        if (!preferred(kind, state.map.terrain[cell] ?? -1) || connected[cell] !== 1) continue;
        const px = x + 0.5, pz = z + 0.5;
        const d2 = (x - tx) ** 2 + (z - tz) ** 2;
        if (d2 < 4 || (nearTree && d2 > MAX_RANGE * MAX_RANGE)
          || Math.hypot(px - heart.x, pz - heart.z) < 8
          || !fitsCircle(land, px, pz, RADII[kind])) continue;
        // Se prioriza proximidad y se desempata con hash estable, sin RNG compartido.
        const score = d2 * 1000 + hash32(seed, `${kind}:${cell}`) % 1000;
        if (best === null || score < best.score) best = { x: px, z: pz, score };
      }
    }
    return best;
  };
  // El árbol de tala puede quedar en la otra orilla o detrás de una muralla.
  // La caza sigue ocurriendo en suelo accesible y no desaparece en esa aldea.
  const best = search(true) ?? search(false);
  if (best === null) return null;
  const home = { x: best.x, z: best.z };
  return {
    kind, home,
    body: { id: IDS[kind], ...home, vx: 0, vz: 0, facing: 0, radius: RADII[kind], pace: SPEEDS[kind] },
    phase: 'roam', health: 1, altitude: 0, target: home, start: 0,
    expiresAt: 240 + hash32(seed, `prey-duration:${kind}`) % 211,
  };
}

function escapeTarget(prey: WildPrey, threat: Point, land: Terrain): Point {
  const { body } = prey;
  const away = Math.atan2(body.z - threat.z, body.x - threat.x);
  const connected = reachableFrom(land, body);
  for (const distance of [8, 6, 4]) {
    for (const turn of [0, 0.55, -0.55, 1.1, -1.1, 1.7, -1.7]) {
      const p = { x: body.x + Math.cos(away + turn) * distance, z: body.z + Math.sin(away + turn) * distance };
      if (fitsCircle(land, p.x, p.z, body.radius) && canReach(land, connected, p)) return p;
    }
  }
  return prey.home;
}

export function stepWildPrey(
  prey: WildPrey, land: Terrain, seed: number, step: number,
  people: readonly { body: Point }[],
): void {
  if (prey.phase === 'down' || prey.phase === 'gone') return;
  const { body } = prey;
  let nearest: Point | null = null, nearestD = Infinity;
  for (const person of people) {
    const d = Math.hypot(body.x - person.body.x, body.z - person.body.z);
    if (d < nearestD) { nearest = person.body; nearestD = d; }
  }
  if (step >= prey.expiresAt) { prey.phase = 'gone'; return; }
  else if (prey.kind === 'boar' && nearest !== null && nearestD < 4) {
    prey.phase = 'charge'; prey.target = nearest;
  } else if (nearest !== null && nearestD < (prey.kind === 'boar' ? 7 : 4)) {
    if (prey.phase !== 'flee') { prey.target = escapeTarget(prey, nearest, land); prey.fleeSince = step; }
    prey.phase = 'flee';
  }
  const distance = Math.hypot(prey.target.x - body.x, prey.target.z - body.z);
  const speed = prey.phase === 'charge' ? 1.2 : SPEEDS[prey.kind];
  body.vx = distance > 0.18 ? speed * (prey.target.x - body.x) / distance : 0;
  body.vz = distance > 0.18 ? speed * (prey.target.z - body.z) / distance : 0;
  integrate(body, land, LIFE_STEP);
  if (Math.hypot(body.vx, body.vz) > 0.01) turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  // El aleteo de la perdiz es bajo y de duración corta, suficiente para leerse en pantalla.
  // El despegue va antes que el aleteo: el modelo de Vera trae `takeoff`, de
  // una vez, y mientras dura la perdiz sube poco a poco en vez de saltar de
  // golpe a su altura de vuelo.
  const since = prey.fleeSince === undefined ? TAKEOFF_STEPS : step - prey.fleeSince;
  prey.takingOff = prey.kind === 'partridge' && prey.phase === 'flee' && since < TAKEOFF_STEPS;
  const lift = Math.min(1, since / TAKEOFF_STEPS);
  prey.altitude = prey.kind === 'partridge' && prey.phase === 'flee'
    ? lift * (0.18 + Math.max(0, Math.sin((step - prey.start) * 0.18)) * 0.24) : 0;
  if (prey.phase === 'charge' && distance < 0.7) { body.vx = 0; body.vz = 0; }
  // seed se conserva en la API para que la trayectoria pueda ampliarse con variación estable.
  void seed;
}

export function wildPreyPosition(prey: WildPrey | null): Animal[] {
  if (prey === null || prey.phase === 'gone') return [];
  return [{ id: prey.body.id, kind: prey.kind, x: prey.body.x, y: prey.body.z,
    altitude: prey.altitude,
    action: prey.phase === 'down' ? 'down'
      : prey.kind === 'partridge' && prey.phase === 'flee' ? prey.takingOff === true ? 'takeoff' : 'flight'
        : prey.kind === 'rabbit' && prey.phase === 'flee' ? 'flee'
          : prey.kind === 'boar' && prey.phase === 'charge' ? 'charge' : undefined }];
}
