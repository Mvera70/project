// M-03 · Traits. design.md §6.3.
//
// Three or four per named villager, drawn with weights per role. The weights
// are a table in balance.ts, not a chain of ifs: a new role is a new row.
//
// The traits do exactly three things (§6.3): they weigh crossroad options, they
// modulate opinion drift, and six of them modify one documented number each.
// The other nine are narrative. That is deliberate — a number on every trait
// would turn the villagers into a skill tree.

import { TRAIT_COUNT, TRAIT_WEIGHTS, TRAIT_WEIGHT_BASE } from '../balance';
import type { RngBundle, RngStream } from '../rng';
import { int, weighted } from '../rng';
import type { Role, Trait } from '../state';

/** Every trait of §3.4, in a fixed order. Iteration order must not vary. */
export const ALL_TRAITS: readonly Trait[] = [
  'ambitious',
  'devout',
  'spiteful',
  'craven',
  'generous',
  'stubborn',
  'cunning',
  'kind',
  'hot_tempered',
  'frail',
  'hardy',
  'greedy',
  'loyal',
  'proud',
  'secretive',
] as const;

/** The two traits that pull against each other: nobody is both. */
const OPPOSED: ReadonlyArray<readonly [Trait, Trait]> = [['hardy', 'frail']];

/** What a role leans towards, or nothing if the role has no leaning. */
function leaningOf(role: Role | null): Partial<Record<Trait, number>> {
  if (role === null) return {};
  return TRAIT_WEIGHTS[role] ?? {};
}

/**
 * Three or four traits, no duplicates, weighted by the role's leaning.
 *
 * Draws from the 'cast' stream, not 'names': the traits are what the casting of
 * a crossroad weighs (§8.1 `traitWeight`), and keeping them off the naming
 * stream means a village that renames nobody still rolls the same characters.
 *
 * Consumes 1 + n draws: one for how many, one per trait.
 */
export function rollTraits(
  b: RngBundle,
  role: Role | null,
  stream: RngStream = 'cast',
): Trait[] {
  const leaning = leaningOf(role);
  const count = int(b, stream, TRAIT_COUNT[0], TRAIT_COUNT[1]);

  const chosen: Trait[] = [];
  let pool = [...ALL_TRAITS];

  for (let i = 0; i < count; i += 1) {
    const t = weighted(b, stream, pool, (x) => leaning[x] ?? TRAIT_WEIGHT_BASE);
    chosen.push(t);
    // No duplicates, and nobody is both hardy and frail: §6.3 gives the two
    // opposite multipliers on the same number, and holding both is incoherent.
    const banned = new Set<Trait>([t]);
    for (const [a, z] of OPPOSED) {
      if (t === a) banned.add(z);
      if (t === z) banned.add(a);
    }
    pool = pool.filter((x) => !banned.has(x));
  }

  return chosen;
}

/**
 * El carácter con el que se nace. §6.3, v3.61.
 *
 * **Sin rol, porque nadie nace con oficio**, y por el flujo `minds`, que es el
 * del carácter y no el del reparto: así una aldea que promueve a otra gente
 * sigue teniendo a las mismas personas dentro, y añadir esto no desplaza las
 * encrucijadas de una partida ya sembrada.
 *
 * Hasta aquí los rasgos los repartía `promoteToNamed`, o sea que **la
 * personalidad la fabricaba el cargo**: el herrero salía terco porque era
 * herrero. Ahora es al revés, que es como funciona: se es terco desde niño y
 * por eso, entre otras cosas, se acaba en la fragua. Lo que el oficio pesa hoy
 * es a quién se elige (`suitsRole`), no en quién se convierte.
 */
export function rollCharacter(b: RngBundle): Trait[] {
  return rollTraits(b, null, 'minds');
}

/**
 * Cuánto pega este carácter con este oficio, para elegir entre candidatos.
 *
 * Es la misma tabla de §6.3 leída al revés: si el oficio de líder se inclina
 * hacia `ambitious` y `proud`, entonces entre dos candidatos de la misma edad
 * se prefiere al que ya los tenga. No es azar: es lo que hace que los oficios
 * caigan en quien encaja, ahora que el carácter viene de antes.
 */
export function suitsRole(traits: readonly Trait[], role: Role | null): number {
  const leaning = leaningOf(role);
  let fit = 0;
  for (const t of traits) fit += (leaning[t] ?? TRAIT_WEIGHT_BASE) - TRAIT_WEIGHT_BASE;
  return fit;
}
