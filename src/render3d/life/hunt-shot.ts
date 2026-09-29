// Proyectiles y estocadas de caza a paso fijo.
//
// AN-5b (29 sep 2026) · **Lo que toca lo decide el contacto.** El vuelo es la
// parábola de siempre; en cada paso se barre el tramo recorrido contra el mundo
// de contacto de Rapier (`createContactWorld`): el cuerpo que se pinta de la
// presa, lo que está de pie con su altura y el suelo. Antes decidía una bola de
// «huella + 0,06» a 0,42 del suelo, sin muros ni troncos: la flecha cruzaba la
// empalizada y la lanza tocaba por distancia, a través de la madera.

import { aimAt } from './archery';
import { LIFE_STEP } from './clock';
import type { Contact, ContactWorld } from './physics';
import type { HuntWeapon } from '@engine/world/hunting';

const GRAVITY = 9.81 / 3;
const MAX_AGE = Math.round(2.5 / LIFE_STEP);

/** TUNE: celdas por segundo al soltar; la flecha, más rápida y más recta que la piedra. */
export const SHOT_SPEED = { bow: 12, sling: 9 } as const;
/**
 * El radio de lo que toca, en celdas: la punta de la flecha (el astil pintado
 * mide 0,05 de grueso, `world/arrows.ts`) y la piedra de la honda (una piedra
 * de puño, 0,04: doce centímetros).
 */
export const SHOT_RADIUS = { bow: 0.025, sling: 0.04 } as const;

/**
 * Un punto del cuerpo del cazador en el instante que decide, en su marco (+z
 * delante, x a la derecha del mundo cuando mira a +z), **medido sobre el GLB
 * publicado con el montaje del juego** (`world/cast.ts`, el arma colgada de la
 * mano por su `grip`) y vigilado por `tests/fast/hunt-gestures.test.ts`.
 */
export interface BodyPoint { readonly x: number; readonly y: number; readonly z: number }

/**
 * La lanza en el contacto (t = 0 de las tres estocadas): la mano derecha y la
 * punta. La estocada es el tramo de una a otra; lo que se cruce en él es lo que
 * toca la lanza. La de siempre (`spear_thrust`, la del asalto) clava a la
 * altura del pecho, 0,35 (el oso); la alta, a 0,50 (el ciervo); la baja entra
 * hacia abajo y clava a 0,20, en el lomo del jabalí.
 */
export const THRUST = {
  chest: { clip: 'spear_thrust', hand: { x: 0.011, y: 0.404, z: 0.262 }, tip: { x: -0.145, y: 0.346, z: 0.532 } },
  high: { clip: 'spear_thrust_high', hand: { x: -0.001, y: 0.481, z: 0.255 }, tip: { x: -0.17, y: 0.501, z: 0.522 } },
  low: { clip: 'spear_thrust_low', hand: { x: 0.021, y: 0.337, z: 0.253 }, tip: { x: -0.123, y: 0.202, z: 0.5 } },
} as const;

/** La estocada que clava más cerca del centro del tronco, a esa altura sobre los pies. */
export function thrustFor(height: number): keyof typeof THRUST {
  let best: keyof typeof THRUST = 'chest';
  for (const variant of ['low', 'chest', 'high'] as const) {
    if (Math.abs(THRUST[variant].tip.y - height) < Math.abs(THRUST[best].tip.y - height)) best = variant;
  }
  return best;
}

/** De dónde sale el tiro al soltar (t = 0 de `bow_loose`): la mano del arco y la de la honda. */
export const RELEASE: Readonly<Record<'bow' | 'sling', BodyPoint>> = {
  bow: { x: -0.021, y: 0.429, z: 0.244 },
  sling: { x: 0.061, y: 0.408, z: 0.439 },
};

/** Un punto del marco del cuerpo, llevado al mundo: `facing` 0 mira a +z. */
export function worldOf(at: { x: number; z: number }, feet: number, facing: number, point: BodyPoint):
  { x: number; y: number; z: number } {
  const cos = Math.cos(facing), sin = Math.sin(facing);
  return { x: at.x + point.x * cos + point.z * sin, y: feet + point.y, z: at.z - point.x * sin + point.z * cos };
}

export interface HuntShot {
  readonly id: number;
  readonly weapon: 'bow' | 'sling';
  readonly from: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number;
  spent: boolean;
}

/**
 * La velocidad con que sale un tiro hacia `target`, con su parábola; null si
 * no llega. A quemarropa —menos de media celda, donde la parábola de `aimAt` no
 * tiene solución— se tira recto: con el jabalí encima, el arquero no apunta al
 * cielo, suelta.
 */
export function aimHuntShot(from: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number }, weapon: 'bow' | 'sling'): { x: number; y: number; z: number } | null {
  const dx = target.x - from.x, dy = target.y - from.y, dz = target.z - from.z;
  const distance = Math.hypot(dx, dy, dz);
  if (Math.hypot(dx, dz) < 0.5 && distance > 1e-6) {
    const speed = SHOT_SPEED[weapon] / distance;
    return { x: dx * speed, y: dy * speed, z: dz * speed };
  }
  return aimAt(from, target, SHOT_SPEED[weapon]);
}

/** Un tiro que sale de `from` con esa velocidad. La lanza no se tira: no hay tiro. */
export function launchHuntShot(from: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number } | null, weapon: HuntWeapon,
  hunterId: number, shotId: number): HuntShot | null {
  if (weapon === 'spear' || velocity === null) return null;
  return { id: shotId, weapon, from: hunterId,
    x: from.x, y: from.y, z: from.z, vx: velocity.x, vy: velocity.y, vz: velocity.z,
    age: 0, spent: false };
}

/**
 * Un paso de vuelo: avanza la parábola y devuelve lo primero que toca el tramo
 * recorrido, con la punta donde tocó. Un tiro que toca, o que se cansa de
 * volar, queda gastado; el llamante decide qué le hace a la presa y si se queda
 * clavado.
 */
export function stepHuntShot(shot: HuntShot, world: ContactWorld): Contact | null {
  if (shot.spent) return null;
  const before = { x: shot.x, y: shot.y, z: shot.z };
  shot.x += shot.vx * LIFE_STEP;
  shot.y += shot.vy * LIFE_STEP - 0.5 * GRAVITY * LIFE_STEP * LIFE_STEP;
  shot.z += shot.vz * LIFE_STEP;
  shot.vy -= GRAVITY * LIFE_STEP;
  shot.age += 1;
  const contact = world.cast(before, { x: shot.x, y: shot.y, z: shot.z }, SHOT_RADIUS[shot.weapon]);
  if (contact !== null) {
    shot.x = contact.at.x; shot.y = contact.at.y; shot.z = contact.at.z;
    shot.spent = true;
  } else if (shot.age >= MAX_AGE) shot.spent = true;
  return contact;
}

/**
 * La estocada: el tramo de la mano a la punta con el cuerpo mirando a
 * `facing`, contra el mundo. Lo primero que se cruza es lo que toca la lanza:
 * la presa, o la madera o la piedra que haya delante —y ahí se clava—.
 */
export function thrustContact(world: ContactWorld, at: { x: number; z: number }, feet: number, facing: number,
  variant: keyof typeof THRUST): Contact | null {
  const { hand, tip } = THRUST[variant];
  return world.cast(worldOf(at, feet, facing, hand), worldOf(at, feet, facing, tip), 0.03);
}

/** El giro de la punta respecto a donde mira el cuerpo: la lanza cruza delante, hacia la izquierda. */
export function tipYaw(variant: keyof typeof THRUST): number {
  const { tip } = THRUST[variant];
  return Math.atan2(tip.x, tip.z);
}

/** Lo que alcanza la punta, desde los pies, en horizontal. */
export function tipReach(variant: keyof typeof THRUST): number {
  const { tip } = THRUST[variant];
  return Math.hypot(tip.x, tip.z);
}
