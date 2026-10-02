// AR-2 · La mina en el motor: la veta, cuándo se abre, la Edad del Hierro y el
// acopio. docs/plan-meta.md AR-2, docs/design.md §7.20.
import { describe, expect, it } from 'vitest';
import { MINE, TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { foundGame } from '../../src/engine/found';
import { deserialize, serialize } from '../../src/engine/save';
import { run } from '../../src/engine/sim';
import { TERRAIN_CODE, type GameState } from '../../src/engine/state';
import { allocateLabour } from '../../src/engine/subsistence/labour';
import { ironAge, mouthFacing } from '../../src/engine/world/mine';
import { plazaCentre } from '../../src/engine/world/plaza';
import { walkableTerrain } from '../../src/engine/world/spatial';

/** Juega hasta que se abre la mina (o se acaba el plazo), anotando lo que importa. */
function untilIron(seed: number, extraWeeks = 0): { state: GameState; maxOre: number; stoneFirst: boolean; minersBefore: number } {
  const state = foundGame(seed);
  let maxOre = 0;
  let stoneFirst = true;
  let minersBefore = 0;
  const limit = 20 * TIME.WEEKS_PER_YEAR;
  while (!ironAge(state) && state.tick < limit && state.ended === null) {
    minersBefore += allocateLabour(state).miners;
    run(state, 1, 'prudent', CATALOG);
    maxOre = Math.max(maxOre, state.village.ore);
  }
  if (ironAge(state) && !state.buildings.some((b) => b.tier === 1 && b.kind !== 'mine')) stoneFirst = false;
  for (let n = 0; n < extraWeeks && state.ended === null; n += 1) {
    run(state, 1, 'prudent', CATALOG);
    maxOre = Math.max(maxOre, state.village.ore);
  }
  return { state, maxOre, stoneFirst, minersBefore };
}

const SEEDS = [7, 11, 23];
const games = SEEDS.map((seed) => ({ seed, ...untilIron(seed, 3 * TIME.WEEKS_PER_YEAR) }));

describe('AR-2 · la mina en el motor', () => {
  it('la primera mina abre la Edad del Hierro, después de la piedra, en las semillas medidas', () => {
    for (const game of games) {
      expect(ironAge(game.state), `semilla ${game.seed}`).toBe(true);
      expect(game.stoneFirst, `semilla ${game.seed}: la edad del metal va después de la de piedra`).toBe(true);
      // Una sola línea de edad, de peso 3, por valle.
      const opened = game.state.chronicle.filter((entry) => entry.templateKey === 'mine.opened');
      expect(opened).toHaveLength(1);
      expect(opened[0]!.weight).toBe(3);
    }
  });

  it('antes de la mina no baja nadie a ella ni hay mineral', () => {
    for (const game of games) expect(game.minersBefore, `semilla ${game.seed}`).toBe(0);
  });

  it('la boca está al pie de la montaña, con roca detrás, vía libre delante y fuera del caserío', () => {
    for (const { state, seed } of games) {
      const mine = state.buildings.find((b) => b.kind === 'mine');
      expect(mine, `semilla ${seed}`).toBeDefined();
      const { map } = state;
      expect(map.terrain[mine!.y * map.width + mine!.x]).not.toBe(TERRAIN_CODE.mountain);
      const facing = mouthFacing(map, mine!.x, mine!.y);
      expect(facing, `semilla ${seed}: la boca da la espalda a la montaña`).not.toBeNull();
      expect(map.terrain[(mine!.y - facing!.dy) * map.width + mine!.x - facing!.dx]).toBe(TERRAIN_CODE.mountain);
      for (let n = 1; n <= MINE.RAIL_CELLS; n += 1) {
        expect(walkableTerrain(map.terrain[(mine!.y + facing!.dy * n) * map.width + mine!.x + facing!.dx * n])).toBe(true);
      }
      const centre = plazaCentre(state.plaza);
      expect(Math.hypot(mine!.x + 0.5 - centre.x, mine!.y + 0.5 - centre.y)).toBeGreaterThanOrEqual(MINE.MIN_DISTANCE);
    }
  });

  it('la mina saca mineral y el acopio nunca pasa de su tope; los mineros, nunca más que la cuadrilla', () => {
    for (const game of games) {
      expect(game.maxOre, `semilla ${game.seed}`).toBeGreaterThan(0);
      expect(game.maxOre).toBeLessThanOrEqual(MINE.ORE_STORE);
      expect(allocateLabour(game.state).miners).toBeLessThanOrEqual(MINE.CREW);
    }
  });

  it('con la fragua gastando, la mina sigue trabajando años después de abrirse', () => {
    // Sin gasto el acopio se llenaba en año y medio y la mina se paraba para
    // siempre (medido en la semilla 7): una mina muerta no es una mina.
    const working = games.filter((game) => allocateLabour(game.state).miners > 0).length;
    expect(working).toBeGreaterThanOrEqual(2);
  });

  it('una partida guardada sin mineral carga con cero, y con mina se guarda y se carga igual', () => {
    const { state } = games[0]!;
    const saved = serialize(state, state.history, [], 1_726_000_000_000);
    const loaded = deserialize(structuredClone(saved));
    expect(loaded.state.village.ore).toBe(state.village.ore);
    const old = structuredClone(saved) as unknown as { state: { village: Record<string, unknown> } };
    delete old.state.village['ore'];
    expect(deserialize(old).state.village.ore).toBe(0);
  });
});
