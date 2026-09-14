// G-05 · What each clip costs in time and ground. design.md D.4, D.6.
//
// The numbers come from `art/catalog.json`, which G-04 filled by measuring the
// exported GLB. They are repeated here because G-05 has no asset manifest yet —
// that is G-06's `assets.ts` — and a renderer that cannot start until the
// manifest exists would block this round on the next one.
//
// A copy that nobody checks is a copy that drifts, so
// `tests/fast/graphics-actors.test.ts` reads the catalogue and asserts these
// match. When G-06 lands the manifest, this table becomes its default and the
// test keeps pointing at the same truth.

export interface ClipMotion {
  readonly seconds: number;
  readonly loop: boolean;
  /**
   * Ground covered in one cycle, in scene units. One unit is one map cell (D.4).
   *
   * Un aldeano mide 0,65 celdas y su zancada 0,32, porque una celda de este
   * valle son unos tres metros: una casa ocupa dos por dos y una casa mide seis
   * metros de lado. Ver D.6.2.
   *
   * `null` for a clip that stays put. For one that walks, this is what stops the
   * feet sliding: the clip is played at `speed / strideLength` cycles per
   * second, so the ground passes under the foot exactly as fast as the foot
   * pushes it back. Playing at a fixed rate instead is the classic skating
   * villager, and it is visible at any size.
   */
  readonly strideLength: number | null;
}

export type ClipName = 'idle' | 'walk' | 'work_hoe' | 'carry_walk';

export const VILLAGER_CLIPS: Readonly<Record<ClipName, ClipMotion>> = {
  idle: { seconds: 4, loop: true, strideLength: null },
  walk: { seconds: 4 / 3, loop: true, strideLength: 0.317 },
  work_hoe: { seconds: 2, loop: true, strideLength: null },
  carry_walk: { seconds: 4 / 3, loop: true, strideLength: 0.26 },
};

/**
 * Where a clip should be, in its own seconds, for an actor at this instant.
 *
 * A clip that travels is driven by **distance covered**, never by wall time. A
 * clip that stays put is driven by scenic time, offset per actor so that two
 * neighbours standing still do not breathe in unison.
 */
export function clipTime(
  clip: ClipName, distance: number, presentationSeconds: number, offset: number,
): number {
  const motion = VILLAGER_CLIPS[clip];
  if (motion.strideLength === null) {
    return (presentationSeconds + offset * motion.seconds) % motion.seconds;
  }
  const cycles = distance / motion.strideLength;
  return ((cycles % 1) + 1) % 1 * motion.seconds;
}
