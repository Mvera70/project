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
import type { RngBundle } from '../rng';
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
export function rollTraits(b: RngBundle, role: Role | null): Trait[] {
  const leaning = leaningOf(role);
  const count = int(b, 'cast', TRAIT_COUNT[0], TRAIT_COUNT[1]);

  const chosen: Trait[] = [];
  let pool = [...ALL_TRAITS];

  for (let i = 0; i < count; i += 1) {
    const t = weighted(b, 'cast', pool, (x) => leaning[x] ?? TRAIT_WEIGHT_BASE);
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
