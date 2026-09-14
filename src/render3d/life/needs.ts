// V-04 · Lo que a cada uno le pide el cuerpo. design.md Anexo E.
//
// Seis impulsos y no veinte. El criterio para que uno entre: **tiene que poder
// explicarse en una frase y verse en pantalla**. Un impulso que nadie puede
// mirar y decir «está cansado» es un número que complica la elección sin
// cambiar lo que se ve, y de ésos el juego ya tiene bastantes.
//
// Suben solos con el tiempo y bajan al satisfacerlos. Lo que hace que dos
// personas con el mismo día hagan cosas distintas no es el azar: es que **el
// carácter cambia la velocidad a la que suben**. Un `hot_tempered` acumula
// irritación tres veces más rápido, y ahí está media película.
//
// Las constantes viven aquí y no en `engine/balance.ts`, contra lo que el plan
// suponía: esto es presentación y no toca una sola cifra de la simulación, igual
// que `SCENIC_DAY_SECONDS` vive en `presentation-clock.ts`. Meterlas en el
// balance sería decir que el motor depende de ellas, y no depende.

import type { Trait } from '@engine/state';

/**
 * Lo que uno lleva encima ahora mismo. Todo de cero a uno.
 *
 * Cero es «esto no me pide nada» y uno es «no puedo pensar en otra cosa».
 */
export interface Needs {
  /** El cansancio. Sube andando y trabajando, baja parado. */
  rest: number;
  /** La sed. Sube siempre, y más deprisa con el esfuerzo. */
  thirst: number;
  /** Las ganas de compañía. Suben a solas y bajan acompañado. */
  company: number;
  /** El aburrimiento. Sube haciendo lo mismo mucho rato. */
  boredom: number;
  /** La irritación. Sube con los roces y con el hambre de la aldea. */
  irritation: number;
  /** El deber: lo que tira de uno hacia el tajo. Sube y baja con la jornada. */
  duty: number;
}

export type NeedName = keyof Needs;

export const NEED_NAMES: readonly NeedName[] = [
  'rest', 'thirst', 'company', 'boredom', 'irritation', 'duty',
] as const;

/**
 * Lo que sube cada impulso por segundo escénico, sin hacer nada.
 *
 * Todo TUNE, y calibrado contra la jornada de ciento veinte segundos (D.6): un
 * impulso que tarda más de una jornada en llegar a uno nunca decide nada, y uno
 * que llega en diez segundos manda siempre. Los números de abajo llenan un
 * impulso entre media jornada y tres, que es donde se cruzan.
 */
const RISE: Readonly<Record<NeedName, number>> = {
  rest: 1 / 150,
  thirst: 1 / 110,
  company: 1 / 80,
  boredom: 1 / 90,
  irritation: 1 / 320,
  // **El deber no puede correr más que los demás.** Con 1/60 era el más rápido
  // de los seis, ganaba siempre la elección y la aldea entera se iba a los
  // campos: medido, hasta el 34 % trabajando y el resto andando hacia allí,
  // porque los campos están lejos. Un impulso que siempre gana no es un impulso,
  // es una orden.
  duty: 1 / 130,
};

/**
 * Cuánto más deprisa sube un impulso según el carácter.
 *
 * **Aquí está el reparto de personalidades**, y se lee al derecho: el solitario
 * no echa de menos a nadie, el hablador no aguanta la soledad, el de mal genio
 * se enciende solo. Un rasgo que no aparece aquí no cambia los impulsos, y eso
 * está bien: los rasgos ya deciden otras cosas en el motor (§6.3).
 */
const TEMPER: Partial<Record<Trait, Partial<Record<NeedName, number>>>> = {
  hot_tempered: { irritation: 3 },
  spiteful: { irritation: 1.8 },
  kind: { irritation: 0.4, company: 1.3 },
  generous: { company: 1.4 },
  secretive: { company: 0.35 },
  craven: { company: 1.2, irritation: 1.3 },
  hardy: { rest: 0.6, thirst: 0.8 },
  frail: { rest: 1.7, thirst: 1.3 },
  stubborn: { duty: 1.4, boredom: 0.7 },
  ambitious: { duty: 1.5 },
  loyal: { duty: 1.3 },
  cunning: { boredom: 1.4 },
  proud: { irritation: 1.4 },
  greedy: { duty: 1.2 },
  devout: { boredom: 0.8 },
};

/** Nadie empieza el día a cero: se amanece con algo de todo. */
export function freshNeeds(): Needs {
  return { rest: 0.1, thirst: 0.15, company: 0.2, boredom: 0.1, irritation: 0.05, duty: 0.3 };
}

/** Lo de siempre entre cero y uno. */
function hold(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Cuánto le corre a esta persona este impulso, por su carácter. */
export function paceOf(traits: readonly Trait[], need: NeedName): number {
  let rate = RISE[need];
  for (const trait of traits) {
    const bias = TEMPER[trait]?.[need];
    if (bias !== undefined) rate *= bias;
  }
  return rate;
}

/** En qué anda uno ahora, para saber qué le cansa y qué le calma. */
export interface Doing {
  /** Si se está moviendo. Andar cansa y da sed. */
  moving: boolean;
  /** Si hay alguien al lado. La compañía calma las ganas de compañía. */
  withOthers: boolean;
  /** Si está en su tajo. El deber se calma trabajando. */
  working: boolean;
  /** Cuánta hambre pasa la aldea, de cero a uno. Agria a todo el mundo (§7.9). */
  hunger: number;
}

/**
 * Un paso de vida para lo que uno lleva dentro.
 *
 * Muta en vez de devolver copia: esto corre treinta veces por segundo y por
 * persona, y un objeto nuevo por impulso y por paso es basura que el recolector
 * acaba cobrando en un tirón, justo cuando hay mucha gente en pantalla.
 *
 * No consume azar: los mismos impulsos con el mismo carácter y lo mismo hecho
 * dan siempre lo mismo (§4.3).
 */
export function drift(
  needs: Needs,
  traits: readonly Trait[],
  doing: Doing,
  seconds: number,
): void {
  // El cansancio sube andando y **baja parado**, que es lo que hace que sentarse
  // un rato sea una decisión y no una pérdida de tiempo.
  needs.rest = hold(needs.rest
    + paceOf(traits, 'rest') * seconds * (doing.moving ? 1 : -0.7));

  needs.thirst = hold(needs.thirst
    + paceOf(traits, 'thirst') * seconds * (doing.moving ? 1.4 : 1));

  // La compañía es el único que se calma **por estar**, sin hacer nada: basta
  // con tener a alguien cerca.
  needs.company = hold(needs.company
    + paceOf(traits, 'company') * seconds * (doing.withOthers ? -1.6 : 1));

  needs.boredom = hold(needs.boredom
    + paceOf(traits, 'boredom') * seconds * (doing.working ? 1.3 : 0.6));

  // Y la irritación sube sola, pero el hambre de la aldea la multiplica: es la
  // misma idea de §7.9, que un año de hambre agria el trato de todos con todos.
  needs.irritation = hold(needs.irritation
    + paceOf(traits, 'irritation') * seconds * (1 + doing.hunger * 3));

  needs.duty = hold(needs.duty
    + paceOf(traits, 'duty') * seconds * (doing.working ? -1.8 : 1));
}

/** El impulso que más aprieta ahora mismo, y cuánto. */
export function loudest(needs: Needs): { need: NeedName; level: number } {
  let need: NeedName = 'rest';
  let level = -1;
  for (const name of NEED_NAMES) {
    if (needs[name] > level) { level = needs[name]; need = name; }
  }
  return { need, level };
}
