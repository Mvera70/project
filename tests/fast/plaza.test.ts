// P-1 · La plaza existe, no se mueve, y nadie construye dentro.
//
// Es lo que el dueño del diseño pidió el 18 sep 2026 —«me gustaría que la plaza
// fuese un espacio que tuviese un círculo grande, con separación; las cosas se
// deberían mover para que esa plaza parezca una plaza de verdad»— y lo que se
// guarda aquí es lo barato de la mitad del motor: que haya un sitio y que esté
// donde tiene que estar. **Que no se mueva en sesenta años y que la aldea le
// deje su espacio se prueba en `tests/journeys/plaza-long.test.ts`**, porque
// ocho partidas de sesenta años son 23 segundos y la suite rápida tiene veinte
// de presupuesto entera.
//
// **Lo que había antes y por qué no servía**, medido en ocho semillas: la plaza
// era `valleyCore`, la media de los centros de los edificios en pie, y entre la
// fundación y el año 60 se desplazaba **de 4,2 a 10,8 celdas**. Empedrar eso es
// empedrar un sitio que se muda.

import { describe, expect, it } from 'vitest';
import { PLAZA } from '@engine/balance';
import { foundGame } from '@engine/found';
import { TERRAIN_CODE } from '@engine/state';

const SEEDS = [7, 11, 23, 41, 33, 51, 101, 2024];

describe('P-1 · la plaza es un sitio', () => {
  it('cada valle tiene la suya, y en suelo que se pisa', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const { x, y } = state.plaza;
      expect(Number.isInteger(x) && Number.isInteger(y), `semilla ${seed}: en celdas`).toBe(true);
      // Dentro del mapa y sobre suelo abierto: una plaza en el río no es una
      // plaza. Se comprueba el centro, que es donde irá la fuente.
      const tile = state.map.terrain[y * state.map.width + x];
      for (const closed of [TERRAIN_CODE.water, TERRAIN_CODE.marsh, TERRAIN_CODE.mountain, TERRAIN_CODE.lake]) {
        expect(tile, `semilla ${seed}: el centro no es agua ni roca`).not.toBe(closed);
      }
    }
  });

  it('y está al lado de la casa con la que se fundó la aldea', () => {
    // No encima: la pareja levanta su casa antes de que exista la plaza, así
    // que la plaza se busca pegada a ella. La distancia esperada es el medio
    // ancho de la casa, más la calle, más el radio.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const house = state.buildings.find((b) => b.kind === 'house');
      expect(house, `semilla ${seed}: hay casa fundadora`).toBeDefined();
      if (house === undefined) continue;
      const gap = Math.hypot(
        state.plaza.x - (house.x + house.w / 2), state.plaza.y - (house.y + house.h / 2),
      );
      expect(gap, `semilla ${seed}: ni encima de la casa`).toBeGreaterThan(PLAZA.RADIUS);
      expect(gap, `semilla ${seed}: ni en la otra punta del valle`)
        .toBeLessThanOrEqual(PLAZA.RADIUS + PLAZA.STREET + Math.max(house.w, house.h));
    }
  });
});
