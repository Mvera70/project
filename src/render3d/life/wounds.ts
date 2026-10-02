// La vida en porcentaje y el daño por arma (2 oct 2026, v5.81).
//
// Vera, con sus palabras: «el cuero no debe proteger mucho»; «una flecha quita
// un 15 %, una espada un 50–60 %»; «la armadura, para unas cosas sí y para
// otras no: el cuero quizá para una flecha, pero no para una espada»; y para
// más adelante, el metal —casco, cota, pechera, arnés— con **probabilidad de
// que la flecha rebote**, como el rebote de los juegos de balas.
//
// Hasta aquí el combate contaba golpes: una flecha tumbaba y la mano necesitaba
// tres. Ahora cada cuerpo tiene **vida, de 1 a 0**, cada arma quita una parte,
// y lo que lleva puesto decide **cuánto pasa** y **si rebota**. La tabla es
// arma × pieza y admite ya las cuatro piezas de la escalera de la armadura
// (`docs/plan-meta.md`): sólo el cuero existe hoy; las de metal están escritas
// para que su llegada sea una fila y no un rediseño.
//
// **Vive en la escena, no en el motor**: la pelea en físico no es determinista
// (§1b) y su resultado entra al motor por `PlayerAct` `battle`. Las tiradas de
// rebote no gastan azar del motor: salen de un hash del paso y del cuerpo, así
// que el informe sin navegador puede repetir una batalla y comparar.
//
// **Todos los números son de sistema, no de nivelado** (Vera, 2 oct 2026:
// «estamos creando sistemas, se nivelará todo junto después»): razonables,
// medidos y marcados `TUNE`.

import { hash32 } from '@engine/rng';

/** Con qué se pega. La espada no la lleva nadie todavía; la tabla ya la sabe. */
export type Weapon = 'arrow' | 'spear' | 'sword';

/**
 * Lo que se lleva puesto, en el orden de la escalera de la armadura
 * (`docs/plan-meta.md`): Edad del Cuero, del Hierro, del Acero y de los
 * Caballeros. Sólo `jerkin` se fabrica hoy (el encargo de la herrería, K5).
 */
export type Armour = 'jerkin' | 'mail' | 'plate' | 'harness';

/**
 * Cuánta vida quita un golpe limpio, sin nada encima.
 *
 * TUNE: la flecha, el 15 % que dijo Vera (siete flechas tumban; antes, una).
 * La espada, el 55 %, en medio de su 50–60 % (dos golpes). La lanza, el 34 %:
 * tres golpes, lo que el cuerpo a cuerpo pedía antes de esta ronda, para que la
 * pelea en la puerta no cambie de ritmo por cambiar de cuenta.
 */
export const DAMAGE: Readonly<Record<Weapon, number>> = {
  arrow: 0.15,
  spear: 0.34,
  sword: 0.55,
};

/** Lo que hace una pieza con un arma: qué parte del daño pasa, y con qué probabilidad rebota entero. */
export interface Guard {
  /** De 0 a 1: la parte del daño que atraviesa si no rebota. */
  readonly pass: number;
  /** De 0 a 1: la probabilidad de que el golpe rebote y no haga nada. */
  readonly ricochet: number;
}

/**
 * La tabla arma × pieza.
 *
 * TUNE, todas. El cuero, poco: algo contra la flecha, menos contra la lanza y
 * nada contra la espada («el cuero no debe proteger mucho … quizá para una
 * flecha, pero no para una espada»). El metal sube por escalones: la cota para
 * mucho de la flecha y algo del filo; las placas hacen rebotar la flecha la
 * mitad de las veces; el arnés entero casi siempre. Contra el filo, el metal
 * rebota menos que contra la flecha: el golpe pesa y la placa lo reparte.
 */
export const GUARD: Readonly<Record<Armour, Readonly<Record<Weapon, Guard>>>> = {
  jerkin: {
    arrow: { pass: 0.6, ricochet: 0.1 },
    spear: { pass: 0.85, ricochet: 0 },
    sword: { pass: 1, ricochet: 0 },
  },
  mail: {
    arrow: { pass: 0.4, ricochet: 0.3 },
    spear: { pass: 0.6, ricochet: 0.05 },
    sword: { pass: 0.5, ricochet: 0.1 },
  },
  plate: {
    arrow: { pass: 0.25, ricochet: 0.5 },
    spear: { pass: 0.4, ricochet: 0.2 },
    sword: { pass: 0.35, ricochet: 0.15 },
  },
  harness: {
    arrow: { pass: 0.1, ricochet: 0.75 },
    spear: { pass: 0.25, ricochet: 0.35 },
    sword: { pass: 0.25, ricochet: 0.25 },
  },
};

/** Lo que hace falta de un cuerpo para herirlo. */
export interface Wounded {
  /** De 1 (entero) a 0 (en el suelo). Sin campo, entero. */
  health?: number;
  /** Lo que lleva puesto. Sin campo, nada. */
  readonly armour?: Armour;
}

/** Lo que pasó con un golpe. */
export interface Blow {
  /** Si rebotó entero en lo que llevaba puesto. */
  readonly ricocheted: boolean;
  /** La vida que quitó, ya con la armadura. */
  readonly damage: number;
  /** La que habría quitado sin nada encima: la sombra de lo que la armadura paró. */
  readonly bare: number;
  /** Si con esto cae. */
  readonly felled: boolean;
}

/**
 * Un golpe de `weapon` sobre `body`, el paso `step`.
 *
 * El rebote se tira con un hash del paso, del cuerpo y del arma —nunca con
 * `Math.random`, y nunca con un flujo del motor—: la misma batalla repetida da
 * los mismos rebotes, que es lo que deja comparar con y sin armadura.
 */
export function strike(body: Wounded, id: number, weapon: Weapon, step: number): Blow {
  const bare = DAMAGE[weapon];
  const guard = body.armour === undefined ? null : GUARD[body.armour][weapon];
  const roll = hash32(step >>> 0, `wound:${id}:${weapon}`) / 0x1_0000_0000;
  const ricocheted = guard !== null && roll < guard.ricochet;
  const damage = ricocheted ? 0 : bare * (guard?.pass ?? 1);
  const before = body.health ?? 1;
  // Un poco de holgura: tres lanzazos de 0,34 tienen que tumbar, aunque la
  // suma en coma flotante se quede en 0,98 o en -0,0200001.
  body.health = Math.max(0, before - damage);
  return { ricocheted, damage, bare, felled: before > 0 && body.health <= 1e-6 };
}

/** Cuántos golpes limpios de `weapon` tumban a quien lleva `armour`, sin rebotes. Para las pruebas y el informe. */
export function blowsToFell(weapon: Weapon, armour?: Armour): number {
  const pass = armour === undefined ? 1 : GUARD[armour][weapon].pass;
  return Math.ceil((1 - 1e-6) / (DAMAGE[weapon] * pass));
}
