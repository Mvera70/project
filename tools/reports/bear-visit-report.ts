// Cuánto se deja ver el oso en su visita, sin navegador. AN-5d (29 sep 2026).
//
// La visita del oso (`life/bear.ts`) en valles de verdad: el día entero de la
// aldea con su gente (la capa de vida, `createVillage`), el terreno del juego
// con los troncos medidos sobre el GLB (`solidTerrain`) y su relieve. Cuenta
// cuántos segundos está el oso fuera de la cueva, cuántas veces se alza y por
// qué se mete. Vera, 29 sep: «la visita del oso hay que ampliarla, claramente».
//
//   npx tsx tools/reports/bear-visit-report.ts [--seeds 7,11,23,3,5] [--year 30]
//
// Los segundos son escénicos: a ×1 una jornada son 120 s y se ven igual.

import { readFileSync } from 'node:fs';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { stateAt, huntedNow } from '../../src/ui/debug';
import { createVillage } from '../../src/render3d/life/village';
import { solidTerrain } from '../../src/render3d/world/obstacles';
import { elevationAt } from '../../src/render3d/world/ground';
import { LIFE_STEP, STEPS_PER_DAY } from '../../src/render3d/life/clock';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : fallback;
};
const seeds = opt('seeds', '7,11,23,3,5').split(',').map(Number);
const year = Number(opt('year', '30'));

const models = new Map<string, Object3D>();
const manifest = JSON.parse(readFileSync('public/assets/valley3d/manifest.json', 'utf8')) as { assets: { id: string; file: string }[] };
for (const asset of manifest.assets) {
  const bytes = readFileSync(`public/assets/valley3d/${asset.file}`);
  try {
    models.set(asset.id, (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene);
  } catch { /* sin navegador no se abre: no pone sólido */ }
}

console.log(`La visita del oso · año ${year}, un día entero de vida por valle`);
console.log('semilla   fuera (s)   primer aviso (s)   avisos   se mete porque');
let total = 0;
for (const seed of seeds) {
  const state = stateAt({ seed, year, season: 'summer' });
  huntedNow(state, ['partridge', 'rabbit', 'deer', 'boar']);
  state.flags['bear'] = state.tick + 2;
  const land = solidTerrain(state, id => models.get(id)?.clone());
  const village = createVillage(state, 0, { land, ground: (x, z) => elevationAt(state.map, x, z) });
  let out = 0, firstWarning = -1, warnings = 0, rising = false, ended = 'sigue fuera al acabar el día';
  let seen = false;
  for (let step = 0; step < STEPS_PER_DAY; step += 1) {
    village.step();
    const bear = village.wildlife.find(animal => animal.kind === 'bear');
    if (bear === undefined) {
      if (seen) { ended = step >= STEPS_PER_DAY * 0.78 - 2 ? 'se le acaba el día' : warnings >= 3 ? 'ha avisado tres veces' : 'lo han acosado de cerca'; break; }
      continue;
    }
    seen = true;
    out += 1;
    const up = bear.action === 'attack';
    if (up && !rising) { warnings += 1; if (firstWarning < 0) firstWarning = step; }
    rising = up;
  }
  if (!seen) ended = 'no sale';
  total += out;
  console.log(`${String(seed).padStart(7)}   ${(out * LIFE_STEP).toFixed(1).padStart(9)}   ${(firstWarning < 0 ? '—' : (firstWarning * LIFE_STEP).toFixed(1)).padStart(16)}   ${String(warnings).padStart(6)}   ${ended}`);
  village.dispose();
}
console.log(`media fuera: ${(total / seeds.length * LIFE_STEP).toFixed(1)} s`);
