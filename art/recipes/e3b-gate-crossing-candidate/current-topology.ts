/** Sonda CPU del estado presente: máscaras y eje de los portones de referencia. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { TIME } from '../../../src/engine/balance';
import { defenceGates } from '../../../src/derive/defence-gates';

const root = resolve(import.meta.dirname, '../../..');
const directions = [
  { bit: 1, dx: 0, dz: -1 }, { bit: 2, dx: 1, dz: 0 },
  { bit: 4, dx: 0, dz: 1 }, { bit: 8, dx: -1, dz: 0 },
  { bit: 16, dx: 1, dz: -1 }, { bit: 32, dx: 1, dz: 1 },
  { bit: 64, dx: -1, dz: 1 }, { bit: 128, dx: -1, dz: -1 },
] as const;
const result = [];
for (const [seed, year] of [[7, 50], [91, 80]] as const) {
  const state = foundGame(seed);
  run(state, year * TIME.WEEKS_PER_YEAR + 6, 'prudent', CATALOG);
  const live = state.buildings.filter(b => b.lostTick === null);
  const byCell = new Map(live.map(b => [`${b.x},${b.y}`, b]));
  const axes = defenceGates(state);
  const gates = live.filter(b => b.kind === 'gate').map(gate => {
    const neighbours = directions.flatMap(d => {
      const b = byCell.get(`${gate.x + d.dx},${gate.y + d.dz}`);
      if (b === undefined || !['wall', 'palisade', 'gate', 'bastion'].includes(b.kind)) return [];
      if (d.bit >= 16 && (byCell.has(`${gate.x + d.dx},${gate.y}`)
        || byCell.has(`${gate.x},${gate.y + d.dz}`))) return [];
      return [{ bit: d.bit, kind: b.kind, cell: [b.x, b.y] }];
    });
    return { id: gate.id, cell: [gate.x, gate.y], axis: axes.get(gate.id),
             mask: neighbours.reduce((n, v) => n | v.bit, 0), neighbours };
  });
  result.push({ seed, year, tick: state.tick, gates });
}
const output = resolve(root, 'artifacts/graphics/E3b2-candidates/round-2/current-topology.json');
mkdirSync(resolve(root, 'artifacts/graphics/E3b2-candidates/round-2'), { recursive: true });
writeFileSync(output, `${JSON.stringify({ method: 'foundGame + run prudent, current working tree', result }, null, 2)}\n`);
console.log(JSON.stringify(result.map(r => ({ seed: r.seed, gates: r.gates }))));
