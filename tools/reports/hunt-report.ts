// El reparto de finales de la caza, sin navegador. AN-5 (29 sep 2026).
//
// La caza sola (`auto`, lo que juega el juego desde el 27 sep) en muchas
// semillas por especie y arma: cuántas se cobran, cuántas se van malheridas y
// cuántas ilesas, cuántos golpes y tiros lleva cada una y cuánto dura. Existe
// para que un cambio de cómo se decide el tiro llegue con su cifra (skill
// `fisica-combate`, regla 9: el balance es del dueño).
//
//   npx tsx tools/reports/hunt-report.ts [--seeds 60] [--valleys 7,11,23,3,5] [--year 30]
//     [--only campo|valle]
//
// Dos escenarios. **Campo**: un llano de 50 × 50 sin obstáculos, la presa en el
// centro y el cazador a doce celdas en una dirección sembrada. **Valle**: el
// valle de cada semilla en el año pedido con el suelo que usa el juego: el
// relieve (`elevationAt`) y los sólidos de `solidTerrain` sacados de los GLB
// publicados —el tronco de cada árbol, los trastos del corral, el camposanto—,
// la presa donde la pone el juego y el cazador saliendo del corazón de la
// aldea. No toca el motor ni guarda nada.

import { readFileSync } from 'node:fs';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { hash32 } from '../../src/engine/rng';
import type { GameState } from '../../src/engine/state';
import type { HuntSpecies, HuntWeapon } from '../../src/engine/world/hunting';
import type { Animal } from '../../src/derive/animals';
import { valleyCore } from '../../src/derive/anchors';
import { stateAt, huntedNow } from '../../src/ui/debug';
import { createHuntEncounter, type HuntEncounter } from '../../src/render3d/life/hunt-encounter';
import { createContactWorld, type ContactWorld } from '../../src/render3d/life/physics';
import { standingOf } from '../../src/render3d/life/hunt-bodies';
import { createWildPrey, type WildKind, type WildPrey } from '../../src/render3d/life/wild-prey';
import { createBear } from '../../src/render3d/life/bear';
import { createDeer } from '../../src/render3d/life/deer';
import { fitsCircle, type Body, type Terrain } from '../../src/render3d/life/body';
import { solidTerrain } from '../../src/render3d/world/obstacles';
import { elevationAt } from '../../src/render3d/world/ground';
import { LIFE_STEP } from '../../src/render3d/life/clock';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : fallback;
};
const seedCount = Number(opt('seeds', '60'));
const valleys = opt('valleys', '7,11,23,3,5').split(',').map(Number);
const year = Number(opt('year', '30'));
const only = opt('only', '');

const PAIRS: readonly (readonly [HuntSpecies, HuntWeapon])[] = [
  ['partridge', 'sling'], ['partridge', 'bow'], ['rabbit', 'sling'], ['rabbit', 'bow'],
  ['deer', 'bow'], ['deer', 'spear'], ['boar', 'bow'], ['boar', 'spear'], ['bear', 'spear'],
];
const MAX_STEPS = 2400;

interface Tally {
  killed: number; wounded: number; clean: number; hits: number; shots: number; steps: number; runs: number;
  /** AN-5 · Qué tocó cada tiro o estocada: el pecho, el cuarto trasero, de refilón, algo de pie, el suelo o nada. */
  strokes: Record<'hit' | 'wound' | 'graze' | 'standing' | 'ground' | 'miss', number>;
  /**
   * RV-3b · Los valles en que la presa no pudo nacer, por semilla. Antes se
   * saltaban en silencio, y las filas del ciervo y del jabalí eran de dos
   * valles de cinco sin que el informe lo dijera.
   */
  missing: Set<number>;
}
const empty = (): Tally => ({ killed: 0, wounded: 0, clean: 0, hits: 0, shots: 0, steps: 0, runs: 0,
  strokes: { hit: 0, wound: 0, graze: 0, standing: 0, ground: 0, miss: 0 }, missing: new Set() });

/** Corre un encuentro hasta su parte, contando los tiros que salen. */
function play(encounter: HuntEncounter, wildlife: () => readonly Animal[], tally: Tally): void {
  const seen = new Set<number>();
  let steps = 0;
  for (; steps < MAX_STEPS && encounter.completed === null; steps += 1) {
    encounter.step(wildlife());
    for (const shot of encounter.projectiles) seen.add(shot.id);
  }
  const report = encounter.completed;
  tally.runs += 1;
  tally.steps += steps;
  tally.shots += encounter.strokes.length;
  for (const stroke of encounter.strokes) tally.strokes[stroke.outcome] += 1;
  void seen;
  if (report === null) { tally.clean += 1; return; }
  tally.hits += report.hits;
  if (report.killed) tally.killed += 1; else if (report.hits > 0) tally.wounded += 1; else tally.clean += 1;
}

function wildAt(kind: WildKind, x: number, z: number, seed: number): WildPrey {
  const radius = { partridge: 0.2, rabbit: 0.25, boar: 0.38 }[kind];
  const pace = { partridge: 1.5, rabbit: 1.15, boar: 0.85 }[kind];
  const home = { x, z };
  return { kind, home, body: { id: 42_000 + ['partridge', 'rabbit', 'boar'].indexOf(kind), x, z, vx: 0, vz: 0,
    facing: 0, radius, pace }, phase: 'roam', health: 1, altitude: 0, target: home, start: 0,
    expiresAt: 240 + hash32(seed, `prey-duration:${kind}`) % 211 };
}

function hunterAt(x: number, z: number, seed: number): Body {
  return { id: 80_000 + seed % 10_000, x, z, vx: 0, vz: 0, facing: 0, radius: 0.3, pace: 1.15 };
}

async function field(species: HuntSpecies, weapon: HuntWeapon): Promise<Tally> {
  const tally = empty();
  const state = stateAt({ seed: 31, year: 1, season: 'summer' });
  const land: Terrain = { width: 50, height: 50, blocked: new Uint8Array(2500) };
  const world = (await createContactWorld(land, { ground: () => 0 }))!;
  for (let n = 1; n <= seedCount; n += 1) {
    const seed = n * 7919;
    const angle = (hash32(seed, 'report-hunter') % 360) * Math.PI / 180;
    const hunter = hunterAt(25 + Math.cos(angle) * 12, 25 + Math.sin(angle) * 12, seed);
    const animal: Animal = { id: species === 'bear' ? 50_000 : 40_000, kind: species, x: 25, y: 25 };
    const wild = species === 'partridge' || species === 'rabbit' || species === 'boar' ? wildAt(species, 25, 25, seed) : null;
    const encounter = createHuntEncounter(state, land, species, weapon, () => 0,
      wild === null ? [animal] : [], seed, species === 'bear' ? { x: 25, z: 25 } : null, true, { hunter, prey: wild, world });
    if (encounter === null) continue;
    play(encounter, () => (wild === null ? [animal] : []), tally);
  }
  world.dispose();
  return tally;
}

interface Valley {
  state: GameState; land: Terrain; ground: (x: number, z: number) => number; heart: { x: number; z: number };
  world: ContactWorld;
}

/** Los modelos publicados, por id, para que `solidTerrain` mida lo mismo que en el juego. */
const models = new Map<string, Object3D>();
async function loadModels(): Promise<void> {
  const manifest = JSON.parse(readFileSync('public/assets/valley3d/manifest.json', 'utf8')) as { assets: { id: string; file: string }[] };
  const loader = new GLTFLoader();
  for (const asset of manifest.assets) {
    const bytes = readFileSync(`public/assets/valley3d/${asset.file}`);
    try {
      const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
      models.set(asset.id, gltf.scene);
    } catch { /* un recurso que no se abre sin navegador no pone sólido: como en un valle a medio catalogar */ }
  }
}

async function valleyOf(seed: number): Promise<Valley> {
  const state = stateAt({ seed, year, season: 'summer' });
  huntedNow(state, ['partridge', 'rabbit', 'deer', 'boar']);
  const land = solidTerrain(state, id => models.get(id)?.clone());
  const core = valleyCore(state);
  // El cazador sale de la aldea: la celda libre más cerca del corazón.
  let heart = { x: core.x, z: core.y };
  search: for (let r = 0; r < 12; r += 1) for (let dz = -r; dz <= r; dz += 1) for (let dx = -r; dx <= r; dx += 1) {
    const at = { x: Math.floor(core.x) + dx + 0.5, z: Math.floor(core.y) + dz + 0.5 };
    if (fitsCircle(land, at.x, at.z, 0.3)) { heart = at; break search; }
  }
  const ground = (x: number, z: number): number => elevationAt(state.map, x, z);
  const world = (await createContactWorld(land, { ground, standing: standingOf(state) }))!;
  return { state, land, ground, heart, world };
}

function valley(species: HuntSpecies, weapon: HuntWeapon, places: readonly Valley[]): Tally {
  const tally = empty();
  const per = Math.max(1, Math.round(seedCount / places.length));
  for (const place of places) {
    const { state, land, ground, heart, world } = place;
    for (let n = 1; n <= per; n += 1) {
      const seed = hash32(state.seed, `report:${n}`);
      const hunter = hunterAt(heart.x, heart.z, seed);
      let wild: WildPrey | null = null;
      let animal: Animal | null = null;
      let den: { x: number; z: number } | null = null;
      if (species === 'partridge' || species === 'rabbit' || species === 'boar') {
        wild = createWildPrey(state, land, seed, heart, species);
        if (wild === null) { tally.missing.add(state.seed); continue; }
      } else if (species === 'deer') {
        // RV-3b · El ciervo, donde lo pone el juego (`createDeer`, la vida de la
        // aldea). Antes se ponía donde nacería un jabalí, y con él faltaba en
        // los mismos valles.
        const found = createDeer(state, land, seed, heart)[0];
        if (found === undefined) { tally.missing.add(state.seed); continue; }
        animal = { id: found.body.id, kind: 'deer', x: found.body.x, y: found.body.z };
      } else {
        const visiting = { ...state, flags: { ...state.flags, bear: state.tick + 2, 'hunt:boar': 0 } } as GameState;
        const bear = createBear(visiting, land, heart, ground);
        if (bear === null) { tally.missing.add(state.seed); continue; }
        animal = { id: 50_000, kind: 'bear', x: bear.clearing.x, y: bear.clearing.z };
        den = bear.mouth;
      }
      const encounter = createHuntEncounter(state, land, species, weapon, ground,
        animal === null ? [] : [animal], seed, den, true, { hunter, prey: wild, world });
      if (encounter === null) { tally.missing.add(state.seed); continue; }
      const fixed = animal;
      play(encounter, () => (fixed === null ? [] : [fixed]), tally);
    }
  }
  return tally;
}

const percent = (part: number, whole: number): string => whole === 0 ? '  —' : `${Math.round(100 * part / whole)}`.padStart(3);
function line(label: string, tally: Tally): string {
  const runs = Math.max(1, tally.runs);
  const { hit, wound, graze, standing, ground, miss } = tally.strokes;
  return `${label.padEnd(16)} ${String(tally.runs).padStart(4)}   ${percent(tally.killed, tally.runs)} %   ${percent(tally.wounded, tally.runs)} %   ${percent(tally.clean, tally.runs)} %`
    + `   ${(tally.hits / runs).toFixed(2).padStart(5)}   ${(tally.shots / runs).toFixed(1).padStart(5)}   ${(tally.steps / runs * LIFE_STEP).toFixed(1).padStart(6)}`
    + `   ${hit}/${wound}/${graze}/${standing}/${ground}/${miss}`
    + (tally.missing.size === 0 ? '' : `   sin presa en ${[...tally.missing].join(', ')}`);
}

const header = `${'especie · arma'.padEnd(16)} ${'cazas'.padStart(4)}   cobrada  malherida  ilesa   golpes  tiros  segundos   pecho/trasero/roce/de pie/suelo/aire`;
if (only !== 'valle') {
  console.log(`CAMPO · llano de 50 × 50, presa en el centro, cazador a 12 celdas, ${seedCount} semillas`);
  console.log(header);
  for (const [species, weapon] of PAIRS) console.log(line(`${species} · ${weapon}`, await field(species, weapon)));
}
if (only !== 'campo') {
  await loadModels();
  const places = await Promise.all(valleys.map(valleyOf));
  console.log(`\nVALLE · semillas ${valleys.join(', ')}, año ${year}, relieve y troncos, cazador desde la aldea`);
  console.log(header);
  for (const [species, weapon] of PAIRS) console.log(line(`${species} · ${weapon}`, valley(species, weapon, places)));
  for (const place of places) place.world.dispose();
}
