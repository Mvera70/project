// AR-2 · La mina, vista: el minero entra por la boca, desaparece dentro y
// vuelve a salir, y la vagoneta sale llena, descarga en el acopio y vuelve a
// entrar vacía. docs/plan-meta.md AR-2, docs/design.md §7.20.
//
// Vera: «que la mina tuviese una entrada que se viese como la cueva del oso,
// más grande, y que entrasen y se viesen entrar, desaparecer y salir;
// carruajes con el mineral: que lleguen llenos, se descarguen y salgan vacíos
// para adentro».
//
// **Es la cueva del oso con oficio** (`bear.ts`): el centro de la boca está
// dentro de la roca y no se llega andando, así que el último tramo —entrar y
// salir— se recorre a mano en línea recta, sin `integrate`, como el oso al
// meterse. Todo lo demás pasa en la recta de los raíles, que el motor dejó
// libre al elegir la veta (`MINE.RAIL_CELLS`, `world/mine.ts`).
//
// Efímero como toda la vida: el mineral lo decide el motor (`village.ore`); lo
// que aquí se cuenta (`loads`) es sólo lo que se ha visto volcar.

import { hash32 } from '@engine/rng';
import type { GameState } from '@engine/state';
import { mouthFacing } from '@engine/world/mine';
import { fitsCircle, type Body, type Point, type Terrain } from './body';
import { LIFE_STEP } from './clock';

/**
 * La boca, en celdas por delante del centro de la celda de la mina. TUNE: la
 * de la cueva del oso (0,55) escalada a una boca más grande, como pide el
 * encargo de Astra (`mine-mouth`, bloque 4: «la receta de la cueva, más
 * grande»).
 */
export const MOUTH = 0.62;
/** Dónde se para la vagoneta para volcar, en celdas desde el centro. TUNE: casi al final de los raíles. */
const STOP = 2.35;
/** Cuánto se aparta el acopio de los raíles, a un lado. TUNE: lo justo para que el volcado caiga encima. */
const PILE_SIDE = 0.9;
/** El minero empuja desde detrás de la vagoneta, a esta distancia de su centro. TUNE. */
const PUSH_GAP = 0.55;
/** Dentro de la galería, en segundos escénicos: lo que tarda en llenar la vagoneta. TUNE. */
const INSIDE: readonly [number, number] = [7, 12];
/** Lo que dura el volcado. TUNE: lo del clip `sort`, que es el gesto de descargar. */
export const UNLOAD_SECONDS = 3;
/** Una tanda de pico en la ladera junto a la boca. TUNE. */
const PICK: readonly [number, number] = [6, 10];
/** Empujar va más despacio que andar. TUNE. */
const PUSH_PACE = 0.55;
/**
 * A partir de esta fase de la jornada no se empieza nada dentro: quien está
 * dentro sale, y la rutina de casa (`home.ts`) puede llamarle. TUNE: antes de
 * que el regreso más largo empiece (`DUSK` 0,78 menos 0,3 de anticipo como
 * mucho, `home.ts`), con margen para salir.
 */
export const SHIFT_END = 0.5;

/** La mina en la vida: la boca, la recta de los raíles y el acopio. */
export interface MineSite {
  /** El edificio del motor. */
  readonly id: number;
  /** El centro de la celda, dentro de la roca: donde se desaparece. */
  readonly den: Point;
  /** La boca: donde se aparece y se desaparece. */
  readonly mouth: Point;
  /** Delante de la boca, en suelo pisable: la plaza del oficio. */
  readonly stand: Point;
  /** Hacia el valle, unitario y en cruz. */
  readonly out: Point;
  /** Hacia dónde mira la boca, en radianes (`atan2(x, z)`, como `facing`). */
  readonly facing: number;
  /** El final de los raíles, donde la vagoneta vuelca. */
  readonly stop: Point;
  /** El montón de mineral, a un lado del final de los raíles. */
  readonly pile: Point;
  /** Donde se pica la ladera junto a la boca, y hacia dónde se mira al picar. */
  readonly face: Point;
  readonly faceFacing: number;
  /** Cuántas celdas de raíl salen de la boca (las pinta `world/mine-works.ts`). */
  readonly rails: number;
}

/** Una vagoneta: efímera, compartida por los mineros de la boca. */
export interface Cart {
  x: number;
  z: number;
  facing: number;
  full: boolean;
  /** 0 de pie, 1 volcada del todo. */
  tilt: number;
  /** El cuerpo que la empuja, o null si espera dentro. */
  by: number | null;
}

/** El turno de un minero. Lo mueve esta escena y no su rutina (como `hunting`). */
export interface Shaft {
  stage: 'enter' | 'inside' | 'haul' | 'unload' | 'return' | 'emerge' | 'to-face' | 'pick' | 'done';
  until: number;
  /** Cuando se le pide salir, sale en cuanto puede (al final del viaje o de dentro). */
  ending: boolean;
  /** La vagoneta que lleva, si lleva. */
  cart: Cart | null;
  /** Desde qué paso dura la etapa (para fechar el gesto). */
  since: number;
}

/** Lo que la mina tiene en la jornada: el sitio, las vagonetas y lo volcado. */
export interface MineScene {
  readonly site: MineSite;
  readonly carts: Cart[];
  loads: number;
}

const add = (a: Point, b: Point, k: number): Point => ({ x: a.x + b.x * k, z: a.z + b.z * k });

/**
 * El sitio de la mina en pie, o null. Sale entero del edificio del motor y de
 * su veta (`mouthFacing`): nada se guarda ni se sortea.
 */
export function mineSiteOf(state: GameState, land: Terrain): MineSite | null {
  const building = state.buildings.find((b) => b.kind === 'mine' && b.lostTick === null);
  if (building === undefined) return null;
  const facing = mouthFacing(state.map, building.x, building.y);
  if (facing === null) return null;
  const out = { x: facing.dx, z: facing.dy };
  const den = { x: building.x + 0.5, z: building.y + 0.5 };
  const stand = add(den, out, 1);
  if (!fitsCircle(land, stand.x, stand.z, 0.32)) return null;
  // El acopio va al lado de los raíles que tenga suelo; si ninguno, delante.
  const side = { x: -out.z, z: out.x };
  const end = add(den, out, STOP);
  const pileSide = [1, -1].find((k) => fitsCircle(land, end.x + side.x * PILE_SIDE * k, end.z + side.z * PILE_SIDE * k, 0.4));
  const pile = pileSide === undefined ? add(den, out, STOP + 0.8) : add(end, side, PILE_SIDE * pileSide);
  // Se pica la ladera junto a la boca, del lado contrario al acopio: de pie
  // un palmo al costado de la plaza y mirando en diagonal a la roca, que el
  // pico (0,39 por delante, `STRIKE_HEAD.mine`) toque el monte y no el hueco.
  const faceSide = pileSide === undefined ? 1 : -pileSide;
  const aside = add(stand, side, 0.32 * faceSide);
  const face = fitsCircle(land, aside.x, aside.z, 0.32) ? aside : stand;
  const toward = { x: -out.x + side.x * faceSide * 0.8, z: -out.z + side.z * faceSide * 0.8 };
  return {
    id: building.id, den, mouth: add(den, out, MOUTH), stand, out,
    facing: Math.atan2(out.x, out.z), stop: end, pile, face,
    faceFacing: Math.atan2(toward.x, toward.z), rails: Math.ceil(STOP),
  };
}

/** Una vagoneta por mina: la vía es una sola. Empieza dentro, vacía. */
export function createMineScene(site: MineSite): MineScene {
  return { site, carts: [{ x: site.den.x, z: site.den.z, facing: site.facing + Math.PI, full: false, tilt: 0, by: null }], loads: 0 };
}

/** Lo adentro que está un punto, en celdas detrás de la boca (positivo = dentro). */
function depth(site: MineSite, at: Point): number {
  return -((at.x - site.mouth.x) * site.out.x + (at.z - site.mouth.z) * site.out.z);
}

/** Si un cuerpo o una vagoneta están ya dentro de la roca, y no se ven. TUNE: un palmo detrás de la boca. */
export function swallowed(site: MineSite, at: Point): boolean {
  return depth(site, at) > 0.15;
}

/** Si este minero está dentro de la mina: no se pinta ni choca con nadie. */
export function underground(shaft: Shaft | undefined, site: MineSite | null, body: Point): boolean {
  if (shaft === undefined || site === null) return false;
  return shaft.stage === 'inside' || swallowed(site, body);
}

const span = (seed: number, key: string, [low, high]: readonly [number, number]): number =>
  Math.round((low + (hash32(seed, key) / 4_294_967_296) * (high - low)) / LIFE_STEP);

/** Avanza un cuerpo en línea recta hacia `to`. Devuelve si ha llegado. */
function walk(body: Body, to: Point, pace: number): { arrived: boolean; moved: number } {
  const dx = to.x - body.x, dz = to.z - body.z;
  const distance = Math.hypot(dx, dz);
  const stride = pace * LIFE_STEP;
  body.vx = 0;
  body.vz = 0;
  if (distance <= stride) {
    body.x = to.x;
    body.z = to.z;
    return { arrived: true, moved: distance };
  }
  body.x += (dx / distance) * stride;
  body.z += (dz / distance) * stride;
  body.facing = Math.atan2(dx, dz);
  return { arrived: false, moved: stride };
}

/** Empieza el turno de quien ha llegado a la plaza de la boca. */
export function startShift(steps: number): Shaft {
  return { stage: 'enter', until: steps, ending: false, cart: null, since: steps };
}

/**
 * Un paso del turno. Devuelve lo andado (para la zancada) y si el turno sigue:
 * cuando devuelve `active: false`, el minero está otra vez fuera, de pie en la
 * plaza, y la rutina normal recupera el cuerpo.
 */
export function stepShift(
  shaft: Shaft, body: Body, scene: MineScene, steps: number, seed: number,
): { active: boolean; moved: number } {
  const { site } = scene;
  const pace = body.pace;
  const go = (stage: Shaft['stage'], until = steps): void => { shaft.stage = stage; shaft.until = until; shaft.since = steps; };
  switch (shaft.stage) {
    case 'enter': {
      const step = walk(body, site.den, pace);
      if (step.arrived) go('inside', steps + span(seed, `mine:in:${body.id}:${steps}`, INSIDE));
      return { active: true, moved: step.moved };
    }
    case 'inside': {
      if (steps < shaft.until) return { active: true, moved: 0 };
      const cart = scene.carts.find((one) => one.by === null && swallowed(site, one));
      if (!shaft.ending && cart !== undefined) {
        // Sale empujando la vagoneta llena: ella delante, él detrás.
        cart.by = body.id;
        cart.full = true;
        cart.tilt = 0;
        cart.x = site.den.x + site.out.x * PUSH_GAP;
        cart.z = site.den.z + site.out.z * PUSH_GAP;
        cart.facing = site.facing;
        shaft.cart = cart;
        go('haul');
        return { active: true, moved: 0 };
      }
      go('emerge');
      return { active: true, moved: 0 };
    }
    case 'haul': {
      const cart = shaft.cart!;
      const step = walk(body, add(site.stop, site.out, -PUSH_GAP), pace * PUSH_PACE);
      cart.x = body.x + site.out.x * PUSH_GAP;
      cart.z = body.z + site.out.z * PUSH_GAP;
      cart.facing = site.facing;
      body.facing = site.facing;
      if (step.arrived) go('unload', steps + Math.round(UNLOAD_SECONDS / LIFE_STEP));
      return { active: true, moved: step.moved };
    }
    case 'unload': {
      const cart = shaft.cart!;
      // Se vuelca y se endereza: sube en el primer tercio, se queda, y baja.
      const t = 1 - (shaft.until - steps) / Math.round(UNLOAD_SECONDS / LIFE_STEP);
      cart.tilt = t < 0.35 ? t / 0.35 : t < 0.7 ? 1 : Math.max(0, (1 - t) / 0.3);
      body.facing = Math.atan2(site.pile.x - body.x, site.pile.z - body.z);
      if (cart.full && t >= 0.5) { cart.full = false; scene.loads += 1; }
      if (steps >= shaft.until) { cart.tilt = 0; go('return'); }
      return { active: true, moved: 0 };
    }
    case 'return': {
      const cart = shaft.cart!;
      // De vuelta adentro, vacía: ella delante (hacia la boca), él detrás.
      const target = add(site.den, site.out, PUSH_GAP);
      const step = walk(body, target, pace * PUSH_PACE);
      cart.x = body.x - site.out.x * PUSH_GAP;
      cart.z = body.z - site.out.z * PUSH_GAP;
      cart.facing = site.facing + Math.PI;
      body.facing = site.facing + Math.PI;
      if (step.arrived) {
        cart.by = null;
        shaft.cart = null;
        go('inside', steps + span(seed, `mine:back:${body.id}:${steps}`, INSIDE));
      }
      return { active: true, moved: step.moved };
    }
    case 'emerge': {
      // Sale a pie: a picar la ladera si hay jornada, o a la plaza si acaba.
      const step = walk(body, site.stand, pace);
      if (!step.arrived) return { active: true, moved: step.moved };
      if (shaft.ending) { go('done'); return { active: false, moved: step.moved }; }
      go('to-face');
      return { active: true, moved: step.moved };
    }
    case 'to-face': {
      const step = walk(body, site.face, pace);
      if (step.arrived) {
        body.facing = site.faceFacing;
        go('pick', steps + span(seed, `mine:pick:${body.id}:${steps}`, PICK));
      }
      return { active: true, moved: step.moved };
    }
    case 'pick': {
      body.facing = site.faceFacing;
      if (steps < shaft.until) return { active: true, moved: 0 };
      if (shaft.ending) { go('done'); return { active: false, moved: 0 }; }
      go('enter');
      return { active: true, moved: 0 };
    }
    case 'done':
      return { active: false, moved: 0 };
  }
}

/** El gesto del minero, para el reparto: picar, empujar, descargar o andar. */
export function shaftGesture(shaft: Shaft): 'mine' | 'push' | 'unload' | 'walk' | 'idle' {
  switch (shaft.stage) {
    case 'pick': return 'mine';
    case 'haul': case 'return': return 'push';
    case 'unload': return 'unload';
    case 'enter': case 'emerge': case 'to-face': return 'walk';
    default: return 'idle';
  }
}

/**
 * Si quien empuja se queda sin turno a medias (una huida, el fin de la
 * jornada), su vagoneta vuelve adentro sola y vacía: no se queda en los
 * raíles para siempre ni se queda con dueño.
 */
export function abandonShift(shaft: Shaft, scene: MineScene): void {
  if (shaft.cart === null) return;
  Object.assign(shaft.cart, { x: scene.site.den.x, z: scene.site.den.z, by: null, full: false, tilt: 0 });
  shaft.cart = null;
}
