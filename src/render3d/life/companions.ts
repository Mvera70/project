// El valle más vivo (25 sep 2026) · El perro, el zorro y los patos.
//
// Pedidos por Vera con la tanda de la vida («niños jugando y un perro»; «un
// zorro de noche, patos en el río»), y quedaron apuntados porque no había
// modelo. Ya lo hay (`tools/art/lots/animals-g23.mjs`), así que tienen cuerpo:
//
//   · **El perro** de una casa: de día va detrás de los niños que juegan en la
//     calle, sale a ver al forastero que llega por el camino y se queda
//     plantado delante de él; si no hay nada de eso, ronda su puerta, y de
//     noche duerme en ella.
//   · **El zorro**, de noche: sale de la linde del bosque, se acerca al
//     gallinero, se lo piensa y vuelve. No se lleva nada —eso lo decide el
//     motor, con el lobo—; y si alguien anda cerca, huye.
//   · **Los patos**, en el agua más cercana al pueblo: tres que nadan despacio
//     y se paran, cada uno a su aire.
//
// Como el resto de la capa: paso fijo, sin escribir en `GameState` y sin azar
// del motor; la variación sale de un hash de la jornada.

import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type Building, type GameState } from '@engine/state';
import type { Animal } from '@derive/animals';
import { fitsCircle, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import { LIFE_STEP } from './clock';
import { clearBetween, pathTo, type Waypoint } from './navigate';
import { edgeOfWood } from './rabbits';
import { nearestReachable, reachableNear } from './terrain';

/** Fuera de los ciervos (40 000), la caza (42 000) y los conejos (43 000). */
const DOG_ID = 44_000;
const FOX_ID = 44_100;
const DUCK_ID = 44_200;

// --- andar -------------------------------------------------------------------

interface Walker {
  readonly body: Body;
  route: Waypoint[];
  goal: Point | null;
  replanAt: number;
}

/**
 * Anda hacia `goal` por una ruta de verdad, rehecha cada tanto o si la meta se
 * ha movido. Lo mismo que hace un vecino (`village.ts`): un punto de la ruta
 * sólo se da por pasado si desde aquí se ve limpio el siguiente.
 */
function walk(walker: Walker, land: Terrain, goal: Point, pace: number, step: number, stopAt = 0.3): boolean {
  const { body } = walker;
  const moved = walker.goal === null || Math.hypot(goal.x - walker.goal.x, goal.z - walker.goal.z) > 1.5;
  if (moved || step >= walker.replanAt) {
    walker.goal = goal;
    walker.route = pathTo(land, body, goal, body.radius) ?? [];
    walker.replanAt = step + REPLAN_STEPS;
  }
  const away = Math.hypot(goal.x - body.x, goal.z - body.z);
  if (away <= stopAt) { body.vx = 0; body.vz = 0; return true; }
  const route = walker.route;
  while (route.length > 1 && Math.hypot(route[0]!.x - body.x, route[0]!.z - body.z) < 0.4
    && clearBetween(land, body, route[1]!, body.radius)) route.shift();
  const to = route[0] ?? goal;
  const span = Math.hypot(to.x - body.x, to.z - body.z) || 1;
  const speed = Math.min(pace, span / LIFE_STEP);
  body.vx = ((to.x - body.x) / span) * speed;
  body.vz = ((to.z - body.z) / span) * speed;
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  integrate(body, land, LIFE_STEP);
  return false;
}

/** Cada cuánto se rehace una ruta, en pasos: medio segundo escénico largo. */
const REPLAN_STEPS = 45;

function still(body: Body): void {
  body.vx = 0;
  body.vz = 0;
}

function actionOf(body: Body): 'walk' | undefined {
  return Math.hypot(body.vx, body.vz) > 0.02 ? 'walk' : undefined;
}

// --- el perro ----------------------------------------------------------------

/**
 * TUNE: una aldea de cuatro casas ya tiene perro; antes, dos o tres familias
 * recién llegadas no se lo pueden permitir. Uno solo: dos perros sueltos en la
 * calle se leen como jauría.
 */
const DOG_FROM_HOUSES = 4;
const DOG_PACE = 1.25;
const DOG_RADIUS = 0.22;
/** A cuánto sale a ver a un forastero, y cuánto rato se le queda mirando. */
// TUNE: 16. Con 10, medido en el navegador (semillas 7 y 11, año 20), el
// perro no llegaba a ver al buhonero: su casa quedaba a 13 celdas de la plaza y
// se quedaba con los niños. Un forastero en el pueblo es cosa de todo el perro.
const STRANGER_REACH = 16;
const STARE_STEPS = 360;
/** A cuánto va detrás de un niño, y desde cuán lejos lo ve. */
const CHILD_REACH = 14;
const HEEL = 1.1;
/** A cuánto oye al zorro, de día o de noche. */
const FOX_BARK = 9;

export interface Dog extends Walker {
  readonly door: Point;
  mode: 'home' | 'child' | 'ball' | 'stranger' | 'sleep';
  /**
   * Si está ladrando ahora: plantado ante el forastero o ante el zorro. No
   * hay sonido en el juego (se borró el sintetizado, 24 sep 2026), así que el
   * ladrido se dibuja (`effects/barks.ts`).
   */
  barking: boolean;
  /** Hasta cuándo mira al forastero, y a partir de cuándo puede volver a ir. */
  stareUntil: number;
  stareAgain: number;
  idleUntil: number;
  wander: Point | null;
  wanders: number;
}

function doorOf(house: Building): Point {
  // La fachada está a +Z (`homeRoutine`); si allí no se puede estar, el
  // llamador busca la celda libre más cercana.
  return { x: house.x + house.w / 2, z: house.y + house.h + 0.6 };
}

export function createDog(state: GameState, land: Terrain, seed: number, heart: Point): Dog | null {
  const houses = state.buildings.filter((b) => b.kind === 'house' && b.lostTick === null);
  if (houses.length < DOG_FROM_HOUSES) return null;
  // La casa del perro sale de la semilla del valle, no de la jornada: el perro
  // vive siempre en la misma.
  const house = houses[hash32(state.seed, 'dog:house') % houses.length]!;
  const shore = reachableNear(land, heart);
  const door = nearestReachable(land, shore, doorOf(house), DOG_RADIUS);
  if (door === null) return null;
  return {
    body: { id: DOG_ID, x: door.x, z: door.z, vx: 0, vz: 0, facing: 0, radius: DOG_RADIUS, pace: DOG_PACE },
    route: [], goal: null, replanAt: 0,
    door, mode: 'home', barking: false, stareUntil: 0, stareAgain: 0, idleUntil: 0, wander: null,
    wanders: hash32(seed, 'dog:wander') % 7,
  };
}

export function stepDog(
  dog: Dog | null, land: Terrain, seed: number, step: number, night: boolean,
  children: readonly Point[], strangers: readonly Point[],
  /** La pelota, si está en juego: en la mano de alguien o rodando. */
  balls: readonly Point[] = [],
  /** El zorro, si ronda: le ladra aunque sea de noche. */
  fox: Point | null = null,
): void {
  if (dog === null) return;
  const { body } = dog;
  dog.barking = false;
  // El zorro despierta al perro: se planta y le ladra desde donde esté, sin
  // perseguirlo (un perro de casa no se mete en el bosque de noche).
  if (fox !== null && Math.hypot(fox.x - body.x, fox.z - body.z) < FOX_BARK) {
    still(body);
    body.facing = Math.atan2(fox.x - body.x, fox.z - body.z);
    dog.barking = true;
    return;
  }
  if (night) {
    dog.mode = 'sleep';
    if (walk(dog, land, dog.door, DOG_PACE, step)) still(body);
    return;
  }
  // El forastero manda sobre los niños: es lo que un perro no deja pasar.
  const stranger = nearest(body, strangers, STRANGER_REACH);
  if (stranger !== null && (dog.mode === 'stranger' ? step < dog.stareUntil : step >= dog.stareAgain)) {
    if (dog.mode !== 'stranger') { dog.mode = 'stranger'; dog.stareUntil = step + STARE_STEPS; }
    if (walk(dog, land, stranger, DOG_PACE, step, 2.2)) {
      body.facing = Math.atan2(stranger.x - body.x, stranger.z - body.z);
      dog.barking = true;
    }
    return;
  }
  if (dog.mode === 'stranger') { dog.mode = 'home'; dog.stareAgain = step + STARE_STEPS * 2; }
  // La pelota en juego antes que el niño: es a por lo que va un perro.
  const ball = nearest(body, balls, CHILD_REACH);
  if (ball !== null) {
    dog.mode = 'ball';
    walk(dog, land, ball, DOG_PACE * 1.3, step, 0.45);
    return;
  }
  const child = nearest(body, children, CHILD_REACH);
  if (child !== null) {
    dog.mode = 'child';
    walk(dog, land, child, DOG_PACE, step, HEEL);
    return;
  }
  // Ronda su puerta: un sitio cerca, un rato quieto, y otro.
  dog.mode = 'home';
  if (dog.wander === null || step >= dog.idleUntil) {
    dog.wanders += 1;
    const angle = (hash32(seed, `dog:${dog.wanders}:a`) % 628) / 100;
    const far = 1 + (hash32(seed, `dog:${dog.wanders}:r`) % 250) / 100;
    const spot = { x: dog.door.x + Math.cos(angle) * far, z: dog.door.z + Math.sin(angle) * far };
    dog.wander = fitsCircle(land, spot.x, spot.z, DOG_RADIUS) ? spot : dog.door;
    dog.idleUntil = step + 240 + (hash32(seed, `dog:${dog.wanders}:t`) % 240);
  }
  if (walk(dog, land, dog.wander, DOG_PACE * 0.6, step)) still(body);
}

function nearest(from: Point, points: readonly Point[], reach: number): Point | null {
  let best: Point | null = null;
  let gap = reach;
  for (const point of points) {
    const d = Math.hypot(point.x - from.x, point.z - from.z);
    if (d < gap) { gap = d; best = point; }
  }
  return best;
}

export function dogPosition(dog: Dog | null): Animal[] {
  if (dog === null) return [];
  return [{ id: dog.body.id, kind: 'dog', x: dog.body.x, y: dog.body.z, action: actionOf(dog.body) }];
}

// --- el zorro ----------------------------------------------------------------

const FOX_PACE = 0.95;
const FOX_FLEE = 2.2;
const FOX_RADIUS = 0.2;
/**
 * A cuánto del gallinero se para a mirarlo, y a cuánto de alguien huye. TUNE:
 * con cinco celdas de alarma huía siempre antes de llegar —medido en las
 * semillas 7, 11, 23 y 41 al año 20: a la caída de la tarde aún hay gente
 * volviendo a casa junto al corral—; con tres y media llega y mira.
 */
const COOP_GAP = 3;
const FOX_ALARM = 3.5;
/** Lo que descansa en la madriguera entre dos salidas, en pasos: de 10 a 20 s. */
const FOX_REST: readonly [number, number] = [300, 300];
/** Lo lejos del pueblo que vive: fuera del corro de casas, como los conejos. */
const DEN_FROM_HEART = 12;
const DEN_FROM_BUILDING = 5;

export interface Fox extends Walker {
  readonly den: Point;
  readonly coop: Point;
  phase: 'den' | 'creeping' | 'watching' | 'back' | 'fleeing';
  until: number;
}

export function createFox(state: GameState, land: Terrain, seed: number, heart: Point, coop: Point): Fox | null {
  const shore = reachableNear(land, heart);
  const buildings = state.buildings.filter((b) => b.lostTick === null);
  let den: Point | null = null;
  let best = Infinity;
  for (let z = 1; z < land.height - 1; z += 1) {
    for (let x = 1; x < land.width - 1; x += 1) {
      if (!edgeOfWood(state, x, z) || shore[z * land.width + x] !== 1) continue;
      const at = { x: x + 0.5, z: z + 0.5 };
      const far = Math.hypot(at.x - coop.x, at.z - coop.z);
      // La madriguera, en la linde más cercana al gallinero que no esté pegada
      // al pueblo; el hash desempata entre linderos parecidos. **Lejos de las
      // casas**: la primera versión la dejaba a siete celdas y media de la plaza
      // (semilla 7, año 20, en el navegador) y siempre había alguien a menos de
      // `FOX_ALARM`, así que el zorro huía sin haber salido y no se veía nunca.
      if (far < 8 || Math.hypot(at.x - heart.x, at.z - heart.z) < DEN_FROM_HEART
        || !fitsCircle(land, at.x, at.z, FOX_RADIUS)) continue;
      if (buildings.some((b) => Math.hypot(Math.max(b.x - at.x, 0, at.x - b.x - b.w),
        Math.max(b.y - at.z, 0, at.z - b.y - b.h)) < DEN_FROM_BUILDING)) continue;
      const score = far + (hash32(seed, `fox:${x}:${z}`) % 100) / 100;
      if (score < best) { best = score; den = at; }
    }
  }
  if (den === null) return null;
  const toward = Math.atan2(den.z - coop.z, den.x - coop.x);
  const near = nearestReachable(land, shore, {
    x: coop.x + Math.cos(toward) * COOP_GAP, z: coop.z + Math.sin(toward) * COOP_GAP,
  }, FOX_RADIUS) ?? coop;
  return {
    body: { id: FOX_ID, x: den.x, z: den.z, vx: 0, vz: 0, facing: 0, radius: FOX_RADIUS, pace: FOX_PACE },
    route: [], goal: null, replanAt: 0, den, coop: near, phase: 'den', until: 0,
  };
}

export function stepFox(fox: Fox | null, land: Terrain, seed: number, step: number, night: boolean,
  people: readonly Point[]): void {
  if (fox === null) return;
  const { body } = fox;
  if (!night) {
    // De día, en la madriguera: no se ve.
    fox.phase = 'den';
    body.x = fox.den.x; body.z = fox.den.z; still(body);
    return;
  }
  if (fox.phase !== 'fleeing' && nearest(body, people, FOX_ALARM) !== null) {
    fox.phase = 'fleeing';
    fox.goal = null;
  }
  switch (fox.phase) {
    case 'den':
      if (step >= fox.until) fox.phase = 'creeping';
      else still(body);
      return;
    case 'creeping':
      if (walk(fox, land, fox.coop, FOX_PACE, step)) {
        fox.phase = 'watching';
        fox.until = step + 180 + hash32(seed, `fox:watch:${step}`) % 240;
        body.facing = Math.atan2(fox.coop.x - body.x, fox.coop.z - body.z);
      }
      return;
    case 'watching':
      still(body);
      if (step >= fox.until) fox.phase = 'back';
      return;
    case 'back':
    case 'fleeing':
      if (walk(fox, land, fox.den, fox.phase === 'fleeing' ? FOX_FLEE : FOX_PACE, step)) {
        fox.phase = 'den';
        fox.until = step + FOX_REST[0] + hash32(seed, `fox:rest:${step}`) % FOX_REST[1];
      }
      return;
  }
}

export function foxPosition(fox: Fox | null): Animal[] {
  if (fox === null || fox.phase === 'den' && Math.hypot(fox.body.x - fox.den.x, fox.body.z - fox.den.z) < 0.2) return [];
  return [{ id: fox.body.id, kind: 'fox', x: fox.body.x, y: fox.body.z,
    action: fox.phase === 'fleeing' ? 'flee' : actionOf(fox.body) }];
}

// --- los patos ---------------------------------------------------------------

/** TUNE: tres patos; dos se leen como pareja y cuatro como granja. */
const DUCKS = 3;
const DUCK_PACE = 0.35;
/** Dónde buscan agua: la más cercana al corazón del pueblo, a menos de esto. */
const DUCK_REACH = 26;

export interface Duck {
  readonly id: number;
  x: number;
  z: number;
  facing: number;
  readonly home: Point;
  target: Point;
  moving: boolean;
  nextChoice: number;
  choices: number;
}

function wet(state: GameState, x: number, z: number): boolean {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  if (cx < 0 || cz < 0 || cx >= state.map.width || cz >= state.map.height) return false;
  const t = state.map.terrain[cz * state.map.width + cx];
  return t === TERRAIN_CODE.water || t === TERRAIN_CODE.lake;
}

/** Que el trayecto sea todo agua: un pato no cruza el prado nadando. */
function swimmable(state: GameState, from: Point, to: Point): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) * 10));
  for (let k = 0; k <= n; k += 1) {
    if (!wet(state, from.x + (to.x - from.x) * (k / n), from.z + (to.z - from.z) * (k / n))) return false;
  }
  return true;
}

export function createDucks(state: GameState, seed: number, heart: Point): Duck[] {
  const { width, height } = state.map;
  const cells: Point[] = [];
  for (let z = 0; z < height; z += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!wet(state, x, z)) continue;
      const at = { x: x + 0.5, z: z + 0.5 };
      if (Math.hypot(at.x - heart.x, at.z - heart.z) <= DUCK_REACH) cells.push(at);
    }
  }
  if (cells.length === 0) return [];
  // Cerca del pueblo antes que lejos, y el hash desempata entre orillas.
  cells.sort((a, b) => Math.hypot(a.x - heart.x, a.z - heart.z) - Math.hypot(b.x - heart.x, b.z - heart.z)
    || hash32(seed, `duck:${a.x}:${a.z}`) - hash32(seed, `duck:${b.x}:${b.z}`));
  const pond = cells[hash32(seed, 'duck:pond') % Math.min(cells.length, 6)]!;
  return Array.from({ length: DUCKS }, (_, n) => {
    const at = { x: pond.x + ((hash32(seed, `duck:${n}:x`) % 60) - 30) / 100, z: pond.z + ((hash32(seed, `duck:${n}:z`) % 60) - 30) / 100 };
    const home = wet(state, at.x, at.z) ? at : pond;
    return { id: DUCK_ID + n, ...home, facing: n, home, target: home, moving: false, nextChoice: 40 * n, choices: 0 };
  });
}

export function stepDucks(ducks: readonly Duck[], state: GameState, seed: number, step: number): void {
  for (const duck of ducks) {
    if (step >= duck.nextChoice) {
      duck.choices += 1;
      const angle = (hash32(seed, `duck:${duck.id}:${duck.choices}:a`) % 628) / 100;
      const far = 0.6 + (hash32(seed, `duck:${duck.id}:${duck.choices}:r`) % 220) / 100;
      const spot = { x: duck.home.x + Math.cos(angle) * far, z: duck.home.z + Math.sin(angle) * far };
      // Si no llega nadando sin pisar tierra, se queda donde está: volver «a
      // casa» en línea recta también puede cortar una punta de la orilla.
      duck.target = swimmable(state, duck, spot) ? spot : { x: duck.x, z: duck.z };
      duck.nextChoice = step + 200 + hash32(seed, `duck:${duck.id}:${duck.choices}:t`) % 300;
    }
    const gap = Math.hypot(duck.target.x - duck.x, duck.target.z - duck.z);
    duck.moving = gap > 0.05;
    if (!duck.moving) continue;
    const move = Math.min(gap, DUCK_PACE * LIFE_STEP);
    const heading = Math.atan2(duck.target.x - duck.x, duck.target.z - duck.z);
    duck.x += ((duck.target.x - duck.x) / gap) * move;
    duck.z += ((duck.target.z - duck.z) / gap) * move;
    let turn = heading - duck.facing;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    duck.facing += Math.sign(turn) * Math.min(Math.abs(turn), 3 * LIFE_STEP);
  }
}

export function duckPositions(ducks: readonly Duck[]): Animal[] {
  return ducks.map((duck) => ({ id: duck.id, kind: 'duck' as const, x: duck.x, y: duck.z,
    action: duck.moving ? 'walk' as const : undefined }));
}
