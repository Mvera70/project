// El cerco sin salida (v5.89): **ningún pueblo queda encerrado por su propio
// cerco.**
//
// La regla del portón (`placeBuilding`, A2b) pedía que la cara de fuera de la
// puerta diera «fuera del anillo», y fuera era cualquier celda más allá de él.
// Con el valle de forma natural (#48, v5.73) el cerco sale a la falda y se
// apoya en la montaña, y entre los dos quedan bolsas de prado: un portón
// abierto a una de ellas comunica el pueblo con tres celdas y la sierra. Medido
// a los cuarenta años en las semillas 1 a 24, el pueblo alcanzaba menos de 500
// celdas en tres (la 6, la 13 y la 17: 364, 448 y 399); con la regla nueva
// —fuera es lo que llega a las gargantas— en ninguna, y la más pequeña de esas
// tres alcanza 1 027 (`docs/medidas/cerco-sin-salida-2026-10-02.md`).
//
// La propiedad del diseño es la de la puerta: **cada portón en pie da, por
// fuera, a suelo que comunica con una garganta**, que es por donde llega el
// resto del valle. Y la cifra que el informe vigila, con su umbral escrito.
// Es una jornada porque son cuatro partidas de cuarenta años (unos cuarenta
// segundos).

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { floodCells, plotAccess, walkableTerrain, walkingBlocked } from '@engine/world/spatial';

/** Las tres que se encerraban y la 11, cuyo portón se movió de sitio. */
const SEEDS = [6, 11, 13, 17];
const YEARS = 40;

function play(seed: number): GameState {
  const state = foundGame(seed);
  for (let t = 1; t <= YEARS * TIME.WEEKS_PER_YEAR && state.ended === null; t += 1) {
    run(state, 1, 'prudent', CATALOG);
  }
  return state;
}

/** Lo que comunica con las filas de los dos extremos del mapa, con lo construido cerrando el paso. */
function gorgeSide(state: GameState): Uint8Array {
  const blocked = walkingBlocked(state);
  const { width, height } = state.map;
  const starts: number[] = [];
  for (let x = 0; x < width; x++) {
    if (blocked[x] === 0) starts.push(x);
    if (blocked[(height - 1) * width + x] === 0) starts.push((height - 1) * width + x);
  }
  return floodCells(state.map, blocked, starts);
}

describe('el cerco sin salida', () => {
  const games = SEEDS.map((seed) => ({ seed, state: play(seed) }));

  it('cada portón en pie da, por un lado, a suelo que llega a una garganta', () => {
    for (const { seed, state } of games) {
      const outside = gorgeSide(state);
      const { width } = state.map;
      for (const gate of state.buildings.filter((b) => b.kind === 'gate' && b.lostTick === null)) {
        const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (gate.y + dy!) * width + gate.x + dx!);
        expect(sides.some((cell) => walkableTerrain(state.map.terrain[cell]) && outside[cell] === 1),
          `semilla ${seed}: el portón de ${gate.x},${gate.y} no da a ninguna garganta`).toBe(true);
      }
    }
  });

  it('a los cuarenta años el pueblo alcanza al menos 500 celdas', () => {
    for (const { seed, state } of games) {
      if (state.ended !== null) continue;
      const blocked = walkingBlocked(state);
      const reach = floodCells(state.map, blocked,
        plotAccess(state.map, blocked, { x: state.plaza.x, y: state.plaza.y, w: 1, h: 1 }))
        .reduce((n, v) => n + v, 0);
      expect(reach, `semilla ${seed}`).toBeGreaterThanOrEqual(500);
    }
  });
});
