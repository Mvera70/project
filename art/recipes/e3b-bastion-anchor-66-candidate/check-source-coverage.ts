/** Inventario reproducible de fuentes candidatas para las dos villas de cierre. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { elevatedRingOf, type ElevatedRingSegment, type ElevatedRingVariant } from '../../../src/derive/elevated-ring';
import { elevatedAssetYaw } from '../../../src/render3d/world/elevated-orientation';
import { missingRingAssets, ringCandidateAssetsOf, unresolvedRingSeams } from '../../../src/render3d/world/elevated-ring-assets';
import { combinedWall } from './wall-combined-source';

const root = resolve(import.meta.dirname, '../../..');
const all: ElevatedRingVariant[] = ['straight', 'turn', 'diagonal', 'mixed',
  'gate-cardinal', 'gate-diagonal', 'gate-mixed', 'bastion-crossing', 'bastion-return'];
const mixed = new Map<number, string>([
  [130, 'mixed-e-nw'], [66, 'mixed-e-sw'], [33, 'mixed-n-se'], [65, 'mixed-n-sw'],
  [20, 'mixed-s-ne'], [132, 'mixed-s-nw'], [24, 'mixed-w-ne'], [40, 'mixed-w-se'],
]);
type Direction = readonly [number, number];
const cardinal = (x: number, z: number): Direction => [Math.sign(x), Math.sign(z)];
const pairKey = (directions: readonly Direction[]): string => directions.map(([x, z]) => `${x},${z}`).sort().join('|');
const rotated = ([x, z]: Direction, turns: number): Direction => {
  let result: Direction = [x, z];
  for (let i = 0; i < turns; i++) result = [-result[1], result[0]];
  return result;
};
function sourceDirections(source: Record<string, unknown>, variant: ElevatedRingVariant): Direction[] {
  const metadata = (source.metadata ?? {}) as Record<string, unknown>;
  if (variant === 'bastion-crossing' && metadata.mask === 6) {
    return [metadata.incoming, metadata.outgoing].map(value => cardinal(...value as [number, number]));
  }
  const ports = (source.ports ?? metadata.ports) as { normal?: number[] }[] | undefined;
  if (ports?.every(port => port.normal !== undefined)) {
    return ports.map(port => cardinal(port.normal![0]!, port.normal![1]!));
  }
  const route = (source.routeXZ ?? metadata.routeXZ) as [number, number][] | undefined;
  assert.ok(route !== undefined && route.length >= 2, 'Source has no route or port metadata');
  return [route[0]!, route.at(-1)!].map(([x, z]) => cardinal(x - .5, z - .5));
}
function sourceSection(source: Record<string, unknown>): { floorY: number | undefined; widths: number[] } {
  const metadata = (source.metadata ?? {}) as Record<string, unknown>;
  const ports = (source.ports ?? metadata.ports) as
    { clearWidth?: number; width?: number; deckTop?: number }[] | undefined;
  const listed = ports?.map(port => port.clearWidth ?? port.width).filter((width): width is number =>
    typeof width === 'number') ?? [];
  const fallback = source.clearWidth ?? source.requiredClearWidth ?? metadata.clearWidth;
  return { floorY: (source.floorY ?? metadata.floorY ?? ports?.[0]?.deckTop) as number | undefined,
    widths: listed.length > 0 ? listed : typeof fallback === 'number' ? [fallback] : [] };
}
const pathFor = (segment: ElevatedRingSegment, returnToGate: boolean): string | null => {
  switch (segment.variant) {
    case 'straight': case 'turn': case 'diagonal':
      return `art/recipes/e3b-walltop-finish-candidate/e3b-walltop-finish-${segment.variant}-candidate.json`;
    case 'mixed': {
      const name = mixed.get(segment.mask);
      return name === undefined ? null : `art/recipes/e3b-walltop-mixed-finish-candidate/${name}.mesh.json`;
    }
    case 'gate-mixed':
      return [24, 65].includes(segment.mask)
        ? `art/recipes/e3b-gate-crossing-candidate/e3b-gate-crossing-${segment.mask}-light-finish-candidate.mesh.json` : null;
    case 'bastion-crossing':
      return segment.mask === 24
        ? 'art/recipes/e3b-bastion-crossing-24-candidate/e3b-bastion-crossing-24-candidate.mesh.json'
        : segment.mask === 6 ? 'art/recipes/e3b-bastion-turn-candidate/e3b-bastion-turn-candidate.json' : null;
    case 'bastion-return':
      return segment.mask !== 66 ? null : returnToGate
        ? 'art/recipes/e3b-bastion-anchor-66-candidate/e3b-anchor66-gate24-combined-candidate.mesh.json'
        : 'art/recipes/e3b-bastion-anchor-66-candidate/e3b-bastion-anchor-66-candidate.json';
    default: return null;
  }
};
const reports = [];
const published = JSON.parse(await readFile(resolve(root, 'public/assets/valley3d/manifest.json'), 'utf8')) as {
  assets: { id: string }[];
};
const publishedIds = new Set(published.assets.map(asset => asset.id));
for (const seed of [23, 91]) {
  const state = foundGame(seed);
  run(state, 3846, 'prudent', CATALOG);
  const anchor = state.buildings.find(building => building.kind === 'bastion' && building.lostTick === null);
  assert.ok(anchor);
  const ring = elevatedRingOf(state, anchor, { approvedVariants: all, lane: 'center' });
  assert.ok(ring.topologyClosed);
  const placements = ringCandidateAssetsOf(ring);
  assert.ok(placements, `No asset plan for seed ${seed}`);
  const combinedPlacement = placements.find(placement => placement.replaces.length === 2);
  assert.ok(combinedPlacement, `No combined return for seed ${seed}`);
  const combinedIds = new Set(combinedPlacement.replaces);
  assert.equal(combinedIds.size, 2, 'Combined source must replace two distinct buildings');
  assert.equal(placements.filter(placement => placement.replaces.some(id => combinedIds.has(id))).length,
    1, 'Combined buildings may not also receive separate decks');
  const southwest = state.buildings.find(building => building.x === anchor.x - 1 && building.y === anchor.y + 1
    && building.lostTick === null);
  const returnToGate = southwest?.kind === 'gate';
  const combinedSource = returnToGate
    ? JSON.parse(await readFile(resolve(root,
      'art/recipes/e3b-bastion-anchor-66-candidate/e3b-anchor66-gate24-combined-candidate.mesh.json'),
    'utf8')) as Record<string, unknown> : combinedWall();
  assert.equal(combinedSource.id, combinedPlacement.asset);
  const combinedSection = sourceSection(combinedSource);
  assert.equal(combinedSection.floorY, 1.02);
  assert.ok(combinedSection.widths.every(width => width >= .7 - 1e-6));
  const combinedParts = combinedSource.parts as { triangles: unknown[] }[];
  const combinedTriangles = combinedParts.reduce((sum, part) => sum + part.triangles.length, 0);
  const combinedBudget = combinedSource.budget as { maxStaticTriangles: number };
  assert.ok(combinedTriangles <= combinedBudget.maxStaticTriangles);
  const counts: Record<string, number> = {};
  const yaws: Record<string, number> = {};
  const missing: { id: number; variant: string; mask: number }[] = [];
  const directionFailures: { id: number; variant: string; mask: number; source: Direction[];
    expected: Direction[] }[] = [];
  const sectionFailures: { id: number; variant: string; floorY: number | undefined; widths: number[] }[] = [];
  for (const segment of ring.segments) {
    if (combinedIds.has(segment.buildingId)) continue;
    const path = pathFor(segment, returnToGate);
    if (path === null || !existsSync(resolve(root, path))) {
      missing.push({ id: segment.buildingId, variant: segment.variant, mask: segment.mask });
      continue;
    }
    const source = JSON.parse(await readFile(resolve(root, path), 'utf8')) as Record<string, unknown>;
    if (segment.variant === 'mixed' || segment.variant === 'gate-mixed') assert.equal(source.mask, segment.mask);
    const actual = sourceDirections(source, segment.variant);
    const expected: Direction[] = [cardinal(segment.incoming.x, segment.incoming.z),
      cardinal(segment.outgoing.x, segment.outgoing.z)];
    const turns = ['straight', 'turn', 'diagonal'].includes(segment.variant) ? [0, 1, 2, 3] : [0];
    if (!turns.some(turn => pairKey(actual.map(direction => rotated(direction, turn))) === pairKey(expected))) {
      directionFailures.push({ id: segment.buildingId, variant: segment.variant,
        mask: segment.mask, source: actual, expected });
    }
    const section = sourceSection(source);
    if (section.floorY === undefined || Math.abs(section.floorY - 1.02) > 1e-6
      || section.widths.length === 0 || section.widths.some(width => width < .7 - 1e-6)) {
      sectionFailures.push({ id: segment.buildingId, variant: segment.variant, ...section });
    }
    const key = `${segment.variant}:${segment.mask}`;
    counts[key] = (counts[key] ?? 0) + 1;
    if (['straight', 'turn', 'diagonal'].includes(segment.variant)) {
      const yaw = elevatedAssetYaw(segment);
      assert.notEqual(yaw, null, `No quarter-turn fits ${key}`);
      yaws[key] = yaw!;
    }
  }
  assert.deepEqual(missing, []);
  reports.push({ seed, anchor: anchor.id, returnToGate, segments: ring.segments.length,
    placements: placements.length, unpublishedAssets: missingRingAssets(placements, publishedIds),
    combinedSource: { asset: combinedPlacement.asset, replaces: [...combinedIds],
      triangles: combinedTriangles, budget: combinedBudget.maxStaticTriangles },
    unresolvedSeams: unresolvedRingSeams(ring),
    returnNeighbour: ring.segments.find(segment => segment.cell.x === anchor.x - 1
      && segment.cell.z === anchor.y + 1) ?? null,
    counts, yaws, missing,
    directionFailures, sectionFailures,
    limit: 'Source identity, ports and declared sections only; GLB admission and runtime seams remain unproved.' });
}
console.log(JSON.stringify(reports));
assert.ok(reports.every(report => report.directionFailures.length === 0), 'Candidate ports differ from the real ring');
assert.ok(reports.every(report => report.sectionFailures.length === 0), 'Candidate floor or clear width differs');
