/** Lee las bocas reales de ambos bastiones; no genera archivos ni abre GPU. */
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { elevatedRingOf, type ElevatedRingVariant } from '../../../src/derive/elevated-ring';

const variants: ElevatedRingVariant[] = ['straight', 'turn', 'diagonal', 'mixed',
  'gate-cardinal', 'gate-diagonal', 'gate-mixed', 'bastion-crossing', 'bastion-return'];

for (const seed of [23, 91]) {
  const state = foundGame(seed);
  run(state, 3846, 'prudent', CATALOG);
  const anchor = state.buildings.find(item => item.kind === 'bastion' && item.lostTick === null);
  if (anchor === undefined) throw new Error(`No bastion in seed ${seed}`);
  const ring = elevatedRingOf(state, anchor, { approvedVariants: variants, lane: 'center' });
  const bastions = ring.segments.filter(segment => segment.kind === 'bastion');
  console.log(JSON.stringify({ seed, tick: state.tick, anchor: { id: anchor.id,
    cell: { x: anchor.x, z: anchor.y }, access: ring.access }, topologyClosed: ring.topologyClosed,
  bastions: bastions.map(segment => ({ id: segment.buildingId, cell: segment.cell,
    variant: segment.variant, mask: segment.mask, incoming: segment.incoming,
    outgoing: segment.outgoing })) }));
}
