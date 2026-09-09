// Shared by tests/fast/sim.test.ts (§4.3's determinism) and
// tests/fast/save.test.ts (§13.1's decision replay): both need to say two
// states are the same state, not just superficially similar.
import { createHash } from 'node:crypto';
import type { GameState } from '@engine/state';

/**
 * Hash every state field, including typed map arrays, works and pending choices.
 *
 * Fed to the digest in pieces rather than as one `JSON.stringify(s)`. A village
 * that survives five thousand ticks carries thousands of chronicle entries and
 * hundreds of villagers with their memories, and the five map layers stringify
 * as objects with two thousand numeric keys each: the single string was large
 * enough to take the vitest worker down when two of them existed at once.
 * Streaming covers exactly the same bytes without ever holding them all.
 */
export function fingerprint(s: GameState): string {
  const h = createHash('sha256');
  const bytes = (a: Uint8Array | Uint16Array): void => {
    h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  };
  h.update(`${s.version}|${s.seed}|${s.terrainSeed}|${s.tick}|${s.peakPeople}|${s.map.width}x${s.map.height}`);
  bytes(s.map.terrain);
  bytes(s.map.traffic);
  bytes(s.map.path);
  bytes(s.map.ruins);
  bytes(s.map.forestAge);
  bytes(s.map.forestStock);
  h.update(JSON.stringify(s.rng));
  h.update(JSON.stringify(s.village));
  h.update(JSON.stringify(s.weather));
  h.update(JSON.stringify(s.outbreak));
  h.update(JSON.stringify(s.ended));
  h.update(JSON.stringify(s.dwindlingSince));
  h.update(JSON.stringify(s.noOneStreak));
  h.update(JSON.stringify(s.harvestModifier));
  h.update(JSON.stringify(s.flags));
  h.update(JSON.stringify(s.crossroad));
  h.update(JSON.stringify(s.works));
  h.update(JSON.stringify(s.people.namedIds));
  for (const v of s.people.villagers) h.update(JSON.stringify(v));
  for (const g of s.people.grudges) h.update(JSON.stringify(g));
  for (const b of s.buildings) h.update(JSON.stringify(b));
  for (const e of s.chronicle) h.update(JSON.stringify(e));
  for (const d of s.history) h.update(JSON.stringify(d));
  for (const seed of s.seeds) h.update(JSON.stringify(seed));
  return h.digest('hex');
}
