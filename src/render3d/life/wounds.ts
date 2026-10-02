// La vida en porcentaje y el daño por arma (2 oct 2026, v5.81).
//
// Vera, con sus palabras: «el cuero no debe proteger mucho»; «la armadura,
// para unas cosas sí y para otras no: el cuero quizá para una flecha, pero no
// para una espada»; y, corrigiendo la primera lectura, **«no quita un 15 %: el
// cuero protege un 15 %, la flecha quita 85»**. Y para más adelante, el metal
// —casco, cota, pechera, arnés— con **probabilidad de que la flecha rebote**,
// como el rebote de los juegos de balas.
//
// Hasta aquí el combate contaba golpes: una flecha tumbaba y la mano necesitaba
// tres. Ahora cada cuerpo tiene **vida, de 1 a 0**; cada arma quita una parte
// **a cuerpo descubierto** (la flecha, todo: sigue tumbando de un tiro), y lo
// que lleva puesto **protege** una parte de cada arma y puede hacerla rebotar.
// La tabla es pieza × arma y admite ya las cuatro piezas de la escalera de la
// armadura (`docs/plan-meta.md`): sólo el cuero existe hoy; las de metal están
// escritas para que su llegada sea una fila y no un rediseño.
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
 * Cuánta vida quita un golpe limpio **a cuerpo descubierto**.
 *
 * La flecha, toda: a cuerpo descubierto tumba de un tiro, como hasta hoy
 * (Vera: «la flecha quita 85» contra el cuero, así que sin él quita el 100 %).
 * TUNE: la lanza, el 34 % —tres golpes, lo que el cuerpo a cuerpo pedía antes
 * de esta ronda, para que la pelea en la puerta no cambie de ritmo—, y la
 * espada, el 55 % —dos golpes; la primera idea de Vera era un 50–60 %—.
 */
export const DAMAGE: Readonly<Record<Weapon, number>> = {
  arrow: 1,
  spear: 0.34,
  sword: 0.55,
};

/**
 * Dónde da el golpe. **Hoy todo es `torso`**: el impacto no sabe todavía dónde
 * toca (eso pide el contacto físico de F-0/F-1). La ronda de las partes del
 * cuerpo (`docs/ideas.md`: la cabeza multiplica el daño, brazos y piernas
 * menos) sólo tendrá que pasar la zona a `strike` y escribir sus factores.
 */
export type Zone = 'head' | 'torso' | 'arms' | 'legs';

/**
 * Qué zonas cubre cada pieza. Una pieza sólo protege donde está: así el casco
 * será una pieza que cubre `head`, y las grebas, una que cubre `legs`, sin
 * cambiar la forma de la tabla. TUNE: la cota baja por los brazos; el arnés
 * lo cubre todo.
 */
export const COVERS: Readonly<Record<Armour, readonly Zone[]>> = {
  jerkin: ['torso'],
  mail: ['torso', 'arms'],
  plate: ['torso'],
  harness: ['head', 'torso', 'arms', 'legs'],
};

/** Lo que hace una pieza contra un arma: cuánto protege, y con qué probabilidad rebota entero. */
export interface Guard {
  /** De 0 a 1: la parte del daño que la pieza para si no rebota. */
  readonly protects: number;
  /** De 0 a 1: la probabilidad de que el golpe rebote y no haga nada. */
  readonly ricochet: number;
}

/**
 * La tabla pieza × arma: **cuánto protege cada pieza** contra cada arma.
 *
 * El cuero, el 15 % contra la flecha (Vera: «el cuero protege un 15 %, la
 * flecha quita 85»): quien lo lleva aguanta un flechazo y cae con el segundo.
 * Contra la lanza, TUNE, un 10 %, que ya basta para que aguante un lanzazo más
 * (cuatro en vez de tres). Contra la espada, nada («el cuero quizá para una
 * flecha, pero no para una espada»). Y no rebota: el cuero no es duro.
 *
 * El metal, TUNE todo, sube por escalones: la cota para casi la mitad de la
 * flecha; las placas, siete de cada diez y la hacen rebotar casi la mitad de
 * las veces; el arnés entero casi todo y casi siempre. Contra el filo y la
 * punta el metal rebota menos que contra la flecha: el golpe pesa y la placa
 * lo reparte en vez de desviarlo.
 */
export const GUARD: Readonly<Record<Armour, Readonly<Record<Weapon, Guard>>>> = {
  jerkin: {
    arrow: { protects: 0.15, ricochet: 0 },
    spear: { protects: 0.1, ricochet: 0 },
    sword: { protects: 0, ricochet: 0 },
  },
  mail: {
    arrow: { protects: 0.45, ricochet: 0.2 },
    spear: { protects: 0.35, ricochet: 0.05 },
    sword: { protects: 0.4, ricochet: 0.1 },
  },
  plate: {
    arrow: { protects: 0.7, ricochet: 0.45 },
    spear: { protects: 0.55, ricochet: 0.2 },
    sword: { protects: 0.6, ricochet: 0.15 },
  },
  harness: {
    arrow: { protects: 0.85, ricochet: 0.7 },
    spear: { protects: 0.75, ricochet: 0.35 },
    sword: { protects: 0.75, ricochet: 0.25 },
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
export function strike(body: Wounded, id: number, weapon: Weapon, step: number, zone: Zone = 'torso'): Blow {
  const bare = DAMAGE[weapon];
  const guard = body.armour === undefined || !COVERS[body.armour].includes(zone) ? null : GUARD[body.armour][weapon];
  const roll = hash32(step >>> 0, `wound:${id}:${weapon}`) / 0x1_0000_0000;
  const ricocheted = guard !== null && roll < guard.ricochet;
  const damage = ricocheted ? 0 : bare * (1 - (guard?.protects ?? 0));
  const before = body.health ?? 1;
  // Un poco de holgura: tres lanzazos de 0,34 tienen que tumbar, aunque la
  // suma en coma flotante se quede en 0,98 o en -0,0200001.
  body.health = Math.max(0, before - damage);
  return { ricocheted, damage, bare, felled: before > 0 && body.health <= 1e-6 };
}

/** Cuántos golpes limpios de `weapon` tumban a quien lleva `armour`, sin rebotes. Para las pruebas y el informe. */
export function blowsToFell(weapon: Weapon, armour?: Armour): number {
  const pass = armour === undefined ? 1 : 1 - GUARD[armour][weapon].protects;
  return Math.ceil((1 - 1e-6) / (DAMAGE[weapon] * pass));
}
