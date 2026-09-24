// UI-W · El roble del emblema tiene sitio en cada valle (Vera, 24 sep 2026: «el
// árbol del título debe tener representación física en el juego; ponlo al lado
// del lago»). Sin lago —17 valles de cada 60— va a la orilla del río, fuera
// del corazón, donde no se construye.

import { describe, expect, it } from 'vitest';
import { TERRAIN_CODE } from '@engine/state';
import { foundGame } from '@engine/found';
import { inHeart } from '@engine/world/tiles';
import { greatOakCell } from '@derive/landmark';

const SEEDS = [1, 2, 3, 7, 11, 23, 31, 42];

describe('UI-W · el roble del valle', () => {
  it('todo valle tiene su roble, en un prado de la orilla y fuera de los caminos', () => {
    for (const seed of SEEDS) {
      const map = foundGame(seed).map;
      const cell = greatOakCell(map);
      expect(cell, `semilla ${seed}`).not.toBeNull();
      if (cell === null) continue;
      expect(map.terrain[cell], `semilla ${seed}`).toBe(TERRAIN_CODE.meadow);
      expect(map.path[cell] ?? 0, `semilla ${seed}`).toBe(0);
      const x = cell % map.width;
      const z = Math.floor(cell / map.width);
      const sides = [cell - 1, cell + 1, cell - map.width, cell + map.width].map((side) => map.terrain[side]);
      const byLake = sides.includes(TERRAIN_CODE.lake);
      expect(byLake || sides.includes(TERRAIN_CODE.water), `semilla ${seed}`).toBe(true);
      if (!byLake) expect(inHeart(x, z), `semilla ${seed}: sin lago, fuera del corazón`).toBe(false);
    }
  });

  it('el mismo valle da siempre el mismo sitio', () => {
    for (const seed of [7, 23]) expect(greatOakCell(foundGame(seed).map)).toBe(greatOakCell(foundGame(seed).map));
  });
});
