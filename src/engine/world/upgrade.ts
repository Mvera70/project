// M-14 · The stone upgrades. design.md §7.2, §7.3 point 9.

import { BUILDINGS } from '../balance';
import type { Building, BuildingId, BuildingKind, GameState } from '../state';
import { canPlace } from './placement';

export interface Upgrade { kind: 'stone_house' | 'wall' | 'church'; buildingId: BuildingId }

function flagActive(state: GameState, flag: string): boolean {
  const until = state.flags[flag];
  return until !== undefined && (until === 0 || until > state.tick);
}

/**
 * Where the replacement stands. Same corner when it is the same size.
 *
 * A `church` is 3×3 over a 2×2 `chapel`, so it has to grow by one cell in each
 * axis, and a chapel placed snugly beside the houses has neighbours in the way.
 * Any of the four anchors that still contains the chapel is a legitimate
 * "upgrade in place", so all four are tried in row-major order and the first
 * that fits wins — otherwise the church would be unreachable in almost every
 * village, and §7.3 point 9 would end at the walls.
 */
export function upgradeSpot(
  state: GameState,
  kind: BuildingKind,
  source: Building,
): { x: number; y: number } | null {
  const spec = BUILDINGS[kind];
  for (let y = source.y + source.h - spec.h; y <= source.y; y += 1) {
    for (let x = source.x + source.w - spec.w; x <= source.x; x += 1) {
      if (canPlace(state, kind, x, y, source.id)) return { x, y };
    }
  }
  return null;
}

/** The order is normative: houses, palisades, chapel. Source ids break ties. */
export function nextUpgrade(state: GameState): Upgrade | null {
  for (const kind of ['stone_house', 'wall', 'church'] as const) {
    if (kind === 'stone_house' && !flagActive(state, 'stone_house_unlocked')) continue;
    if (kind === 'wall' && !flagActive(state, 'wall_unlocked')) continue;
    for (const source of [...state.buildings].sort((a, b) => a.id - b.id)) {
      if (source.lostTick !== null || source.kind !== BUILDINGS[kind].upgradeOf) continue;
      if (state.works.some((work) => work.upgradeOf === source.id)) continue;
      if (upgradeSpot(state, kind, source) !== null) return { kind, buildingId: source.id };
    }
  }
  return null;
}
