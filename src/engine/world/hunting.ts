// La caza física entrega resultados al motor; la partida decide cuándo hay
// ocasión, qué armas existen y qué premio corresponde a una presa real.

import { HUNT } from '../balance';
import { ratioOf } from '../crossroads/conditions';
import { hash32 } from '../rng';
import type { GameState, PlayerAct } from '../state';

export const HUNT_ORDER = ['partridge', 'rabbit', 'deer', 'boar', 'bear'] as const;
export type HuntSpecies = (typeof HUNT_ORDER)[number];
export type HuntWeapon = 'sling' | 'bow' | 'spear';
export type HuntAct = Extract<PlayerAct, { kind: 'hunt' }>;

const WEAPONS: Record<HuntSpecies, readonly HuntWeapon[]> = {
  partridge: ['sling', 'bow'], rabbit: ['sling', 'bow'],
  deer: ['bow', 'spear'], boar: ['bow', 'spear'], bear: ['spear'],
};

export interface HuntOpportunity {
  readonly species: HuntSpecies;
  readonly weapons: readonly HuntWeapon[];
  readonly tick: number;
}

/** Una oportunidad por semana. Las especies anteriores siguen regresando. */
export function huntOpportunity(state: GameState): HuntOpportunity | null {
  if (ratioOf(state, 'forestLeft') < 0.1 || state.ended !== null) return null;
  const available = (species: HuntSpecies): boolean => {
    const index = HUNT_ORDER.indexOf(species);
    return HUNT_ORDER.slice(0, index).every(previous => state.flags[`hunt:${previous}`] === 0);
  };
  for (const species of [...HUNT_ORDER].reverse()) {
    if (!available(species) || (species === 'bear' && state.flags['hunt:bear'] === 0)) continue;
    const found = species === 'bear'
      // El encuentro final necesita el avistamiento raro del motor.
      ? (state.flags['bear'] ?? -1) > state.tick
      : hash32(state.seed, `hunt:${state.tick}:${species}`) % 100 < HUNT.chance[species];
    if (!found) continue;
    const weapons = WEAPONS[species].filter(weapon => weapon === 'sling'
      || (weapon === 'bow' && state.traits.includes('bows'))
      || (weapon === 'spear' && state.traits.includes('arms')));
    if (weapons.length > 0) return { species, weapons, tick: state.tick };
  }
  return null;
}

/** Sólo acepta un parte de la semana observada y una vez por encuentro. */
export function settleHunt(state: GameState, act: HuntAct): boolean {
  // Un encuentro puede durar más de una semana a velocidad alta. El parte
  // conserva la semana de inicio y se acepta con un margen acotado.
  if (act.sourceTick >= state.tick || state.tick - act.sourceTick > 4
    || act.hits < 0 || !Number.isInteger(act.hits)) return false;
  if (state.acts.some(record => record.act.kind === 'hunt'
    && record.act.sourceTick === act.sourceTick && record.done)) return false;
  const previous = { ...state, tick: act.sourceTick };
  const encounter = huntOpportunity(previous);
  if (encounter === null || encounter.species !== act.species
    || !encounter.weapons.includes(act.weapon)) return false;
  if (act.killed) {
    if (act.hits < 1) return false;
    state.village.grain += HUNT.meat[act.species];
    state.flags[`hunt:${act.species}`] = 0;
  }
  return true;
}
