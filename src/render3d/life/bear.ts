// La visita del oso se apoya en el suceso real `bear_in_the_wood`.
// Es una escena efímera: la moral y la crónica ya las decidió el motor.

import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { fellingTarget } from '@engine/world/forest';
import type { Animal } from '@derive/animals';
import { blockedAt, fitsCircle, integrate, turnTo, type Body, type Point, type Terrain } from './body';
import { LIFE_STEP, stepOfPhase } from './clock';
import { canReach, reachableNear } from './terrain';

const BEAR_ID = 50_000;
// TUNE: un ejemplar, radio 0,52; sólo vive mientras dura el suceso.
const RADIUS = 0.52;
const PACE = 0.56;
const ALARM = 5;
// AN-3a · El aviso dura lo que el clip `attack` del oso de Vera (3 s, en el
// catálogo): se alza en el primer segundo y medio y amenaza el resto. Con 1,55 s
// se cortaba a media subida y se iba andando.
const WARNING_STEPS = Math.round(3 / LIFE_STEP);
/**
 * AN-4c · La boca de la guarida, en celdas por delante de su centro.
 *
 * Sale del modelo publicado (`art/recipes/bear-den`): «la entrada está a 0,55
 * por delante del centro, mirando al claro; el oso se retira hacia dentro y se
 * esconde tras el hueco oscuro». El oso nacía en el centro, dentro de la roca,
 * y su aviso de 3 s no se veía (toma de 11/21 en AN-4b).
 */
const DEN_MOUTH = 0.55;
/**
 * AN-4d · Lo que tiene que subir la montaña detrás de la cueva, en celdas, a
 * dos celdas de ella; y cuántas celdas de roca seguidas tiene que haber.
 *
 * Medido el 29 sep en 23/30, 11/21 y 7/30: en el borde de la montaña el suelo
 * sube poco en casi todas partes (mediana 0,05–0,2 a dos celdas) porque la
 * roca crece con la hondura (`world/ground.ts`, `risesOf`); con una sola celda
 * de montaña al lado, la primera versión puso la cueva de 23/30 junto a una
 * mota de roca plana, con pradera detrás. Con tres celdas seguidas la subida
 * mediana pasa a 0,32–0,38, y medio metro y pico de ladera (0,5, lo que se ve
 * detrás del arco del modelo) queda en unas cien celdas por valle.
 */
const DEN_RISE = 0.5;
const DEN_ROCK = 3;
const VISIT_END = stepOfPhase(0.78);

export interface Bear {
  readonly body: Body;
  /** El centro de la cueva, dentro de la roca: donde desaparece al entrar. */
  readonly den: Point;
  /** La boca (AN-4c): donde nace y adonde vuelve antes de meterse. */
  readonly mouth: Point;
  readonly clearing: Point;
  readonly pasture: readonly Point[];
  phase: 'approach' | 'forage' | 'warning' | 'retreat' | 'gone';
  target: Point;
  nextChoice: number;
  warningUntil: number;
  choices: number;
}

function clearLine(land: Terrain, from: Point, to: Point): boolean {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const segments = Math.max(1, Math.ceil(distance * 4));
  for (let n = 0; n <= segments; n += 1) {
    const t = n / segments;
    if (!fitsCircle(land, from.x + (to.x - from.x) * t,
      from.z + (to.z - from.z) * t, RADIUS)) return false;
  }
  return true;
}

/**
 * AN-4d · Hacia dónde queda la montaña desde una celda: la media de las
 * direcciones a sus vecinas de montaña, o null si no toca ninguna (o la tiene
 * a los dos lados, que es una garganta y no un pie de ladera).
 */
function mountainSide(state: GameState, width: number, height: number, x: number, z: number): Point | null {
  let sx = 0, sz = 0;
  for (let dz = -1; dz <= 1; dz += 1) for (let dx = -1; dx <= 1; dx += 1) {
    const nx = x + dx, nz = z + dz;
    if ((dx === 0 && dz === 0) || nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
    if (state.map.terrain[nz * width + nx] === TERRAIN_CODE.mountain) { sx += dx; sz += dz; }
  }
  const length = Math.hypot(sx, sz);
  return length < 1e-9 ? null : { x: sx / length, z: sz / length };
}

/**
 * La cueva al pie de la montaña, con la roca detrás, y un claro delante.
 *
 * AN-4d · **La cueva del oso está en la montaña** (Vera, 29 sep 2026: «la
 * cueva del oso debe salir en la montaña»), que es para lo que se hizo el
 * modelo (`art/recipes/bear-den`: «hundir la base en la montaña», la boca
 * mirando al frente). Antes se buscaba entre los árboles del tajo, y con los
 * troncos que el juego pone en cada celda de bosque no cabía en ninguna: la
 * visita no nacía nunca en partida (AN-4c, medido en 7/30, 11/21 y 23/30).
 * Al pie de la montaña hay sitio en todos los valles medidos: de 82 a 189
 * celdas alcanzables donde cabe el oso, a 12–26 del corazón de la aldea.
 * Entre ellas se elige la del claro más cerca del bosque que se tala, que es
 * a donde baja el oso de `bear_in_the_wood`.
 */
export function createBear(state: GameState, land: Terrain, heart: Point,
  /** La cota del suelo que pinta el juego (`elevationAt`); sin ella, sólo la roca seguida. */
  ground?: (x: number, z: number) => number): Bear | null {
  // La guarida es el encuentro final: los avistamientos tempranos quedan en
  // la crónica, pero no adelantan una pelea antes de superar al jabalí.
  if (state.flags['hunt:boar'] !== 0 || state.flags['hunt:bear'] === 0
    || (state.flags['bear'] ?? -1) <= state.tick) return null;
  const tree = fellingTarget(state);
  if (tree === null) return null;
  const treeAt = { x: tree % land.width + 0.5, z: Math.floor(tree / land.width) + 0.5 };
  const shore = reachableNear(land, heart);
  const open = new Uint8Array(land.width * land.height);
  const dens: { at: Point; away: Point }[] = [];
  const meadows: Point[] = [];
  for (let z = 1; z < land.height - 1; z++) {
    for (let x = 1; x < land.width - 1; x++) {
      const kind = state.map.terrain[z * land.width + x];
      if (kind === TERRAIN_CODE.mountain) continue;
      const at = { x: x + 0.5, z: z + 0.5 };
      if (Math.hypot(at.x - heart.x, at.z - heart.z) < 8 || blockedAt(land, at.x, at.z)) continue;
      // El centro de la cueva no tiene que admitir al oso: el modelo está
      // hundido en la roca, y una celda pegada de lado a la montaña no admite
      // nunca un círculo de 0,52 en su centro (hay 0,5 hasta la roca). Exigirlo
      // dejaba sólo las celdas que tocan la montaña por una esquina, que son
      // las motas sueltas. El que tiene que caber es el oso en la boca.
      const side = mountainSide(state, land.width, land.height, x, z);
      if (side !== null) dens.push({ at, away: { x: -side.x, z: -side.z } });
      if (kind === TERRAIN_CODE.meadow && canReach(land, shore, at) && fitsCircle(land, at.x, at.z, RADIUS)) {
        meadows.push(at); open[z * land.width + x] = 1;
      }
    }
  }
  // Un claro delante de la boca —hacia el valle, no por el costado de la
  // roca—, a entre 1,5 y 5 celdas y con suelo libre hasta él.
  // Roca seguida a la espalda del modelo —la contraria al claro— y una ladera
  // que sube: la cueva se mete en la montaña, no se apoya en una mota suelta.
  // Si un valle no tiene ninguna así, la mejor que haya, antes que ninguna visita.
  const slopeBehind = (den: Point, clearing: Point, distance: number): boolean => {
    const bx = (den.x - clearing.x) / distance, bz = (den.z - clearing.z) / distance;
    for (let k = 1; k <= DEN_ROCK; k += 1) {
      const cx = Math.floor(den.x + bx * k), cz = Math.floor(den.z + bz * k);
      if (cx < 0 || cz < 0 || cx >= land.width || cz >= land.height
        || state.map.terrain[cz * land.width + cx] !== TERRAIN_CODE.mountain) return false;
    }
    return ground === undefined || ground(den.x + bx * 2, den.z + bz * 2) - ground(den.x, den.z) >= DEN_RISE;
  };
  let best: { clearing: Point; den: Point; score: number } | null = null;
  let fallback: { clearing: Point; den: Point; score: number } | null = null;
  for (const { at: den, away } of dens) {
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
      const cx = Math.floor(den.x) + dx, cz = Math.floor(den.z) + dz;
      if (cx < 0 || cz < 0 || cx >= land.width || cz >= land.height || open[cz * land.width + cx] !== 1) continue;
      const clearing = { x: cx + 0.5, z: cz + 0.5 };
      const distance = Math.hypot(clearing.x - den.x, clearing.z - den.z);
      if (distance < 1.5 || distance > 5) continue;
      if (((clearing.x - den.x) * away.x + (clearing.z - den.z) * away.z) / distance < 0.5) continue;
      const mouth = { x: den.x + (clearing.x - den.x) / distance * DEN_MOUTH, z: den.z + (clearing.z - den.z) / distance * DEN_MOUTH };
      if (!fitsCircle(land, mouth.x, mouth.z, RADIUS) || !canReach(land, shore, mouth) || !clearLine(land, mouth, clearing)) continue;
      const fromTree = Math.hypot(clearing.x - treeAt.x, clearing.z - treeAt.z);
      const noise = hash32(state.terrainSeed, `bear:${clearing.x}:${clearing.z}:${den.x}:${den.z}`) / 4_294_967_296;
      const score = fromTree + Math.abs(distance - 3) * 0.4 + noise;
      if (fallback === null || score < fallback.score) fallback = { clearing, den, score };
      if ((best === null || score < best.score) && slopeBehind(den, clearing, distance)) best = { clearing, den, score };
    }
  }
  const chosen = best ?? fallback;
  if (chosen === null) return null;
  const { clearing, den } = chosen;
  const pasture = meadows.filter(at => Math.hypot(at.x - clearing.x, at.z - clearing.z) < 3.5
    && clearLine(land, clearing, at));
  // Nace en la boca, mirando al claro.
  const toward = Math.hypot(clearing.x - den.x, clearing.z - den.z);
  const mouth = { x: den.x + (clearing.x - den.x) / toward * DEN_MOUTH, z: den.z + (clearing.z - den.z) / toward * DEN_MOUTH };
  return {
    body: { id: BEAR_ID, x: mouth.x, z: mouth.z, vx: 0, vz: 0,
      facing: Math.atan2(clearing.x - den.x, clearing.z - den.z), radius: RADIUS, pace: PACE },
    den, mouth, clearing, pasture, phase: 'approach', target: clearing,
    nextChoice: 0, warningUntil: 0, choices: 0,
  };
}

/** Sale de su cueva, hoza en el claro y se retira al ver gente. */
export function stepBear(bear: Bear, land: Terrain, seed: number, step: number,
  people: readonly { readonly body: Point }[]): void {
  if (bear.phase === 'gone') return;
  const { body } = bear;
  const nearPerson = people.some(person => Math.hypot(person.body.x - body.x,
    person.body.z - body.z) < ALARM);
  if (bear.phase !== 'warning' && bear.phase !== 'retreat' && nearPerson) {
    bear.phase = 'warning';
    bear.warningUntil = step + WARNING_STEPS;
    body.vx = 0; body.vz = 0;
  }
  if (bear.phase === 'warning') {
    body.vx = 0; body.vz = 0;
    if (step >= bear.warningUntil) {
      bear.phase = 'retreat';
      bear.target = bear.mouth;
    } else return;
  }
  if (step >= VISIT_END && bear.phase !== 'retreat') {
    bear.phase = 'retreat';
    bear.target = bear.mouth;
  }
  const distance = Math.hypot(bear.target.x - body.x, bear.target.z - body.z);
  if (distance < 0.22) {
    body.vx = 0; body.vz = 0;
    // En la boca, se mete: el último tramo va hacia el centro de la cueva.
    if (bear.phase === 'retreat' && bear.target === bear.mouth) { bear.target = bear.den; return; }
    if (bear.phase === 'retreat') bear.phase = 'gone';
    else if (bear.phase === 'approach') {
      bear.phase = 'forage';
      bear.nextChoice = step + 75;
    } else if (step >= bear.nextChoice) {
      const choices = bear.pasture.filter(at => clearLine(land, body, at));
      const index = choices.length === 0 ? -1
        : hash32(seed, `bear-graze:${bear.choices++}`) % choices.length;
      bear.target = index < 0 ? bear.clearing : choices[index]!;
      bear.nextChoice = step + 120 + hash32(seed, `bear-rest:${bear.choices}`) % 100;
    }
    return;
  }
  body.vx = PACE * (bear.target.x - body.x) / distance;
  body.vz = PACE * (bear.target.z - body.z) / distance;
  // Entrando en la cueva, la roca del modelo no está en la máscara de la vida
  // (la montaña sí): el último medio metro va en línea recta y sin chocar.
  if (bear.phase === 'retreat' && bear.target === bear.den) {
    body.x += body.vx * LIFE_STEP;
    body.z += body.vz * LIFE_STEP;
  } else integrate(body, land, LIFE_STEP);
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
}

export function bearPosition(bear: Bear | null): Animal[] {
  if (bear === null || bear.phase === 'gone') return [];
  return [{ id: bear.body.id, kind: 'bear', x: bear.body.x, y: bear.body.z, facing: bear.body.facing,
    action: bear.phase === 'warning' ? 'attack' : undefined }];
}
