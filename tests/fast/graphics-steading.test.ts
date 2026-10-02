// Lo lento de este fichero vive en `tests/journeys/graphics-steading-long.test.ts` (v5.56).
//
// G-15 · Los trastos del corral. design.md D.8, §7.4.
//
// Tres objetos que no son edificios: un almiar, la leña y una carreta. Lo que
// se prueba aquí no es que se vean —eso es una captura— sino que **están donde
// alguien los habría dejado**: junto a algo, en suelo pisable, y nunca dos
// encima del mismo sitio. Un objeto en medio del prado se lee como decorado.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { steadingOf } from '../../src/render3d/world/steading';
import { PLAZA } from '@engine/balance';
import { plazaCentre } from '@engine/world/plaza';
import { foundTwenty } from '../helpers/founding';

describe('G-15 · dónde se dejan los trastos del corral', () => {
  it('ningún cobertizo invade la plaza, incluido el borde de su tejado', () => {
    for (const seed of [7, 11, 23, 41]) {
      const state = foundTwenty(seed);
      state.tick = 1;
      state.village.wood = 360;
      const square = plazaCentre(state.plaza);
      const sheds = steadingOf(state, state.terrainSeed).filter(one => one.asset === 'shed');
      expect(sheds.length, `semilla ${seed}: no se comprobó ningún cobertizo`).toBeGreaterThan(0);
      for (const place of sheds) {
        const x = place.cell % state.map.width + 0.5;
        const z = Math.floor(place.cell / state.map.width) + 0.5;
        expect(Math.hypot(x - square.x, z - square.y), `semilla ${seed}: cobertizo en plaza`)
          .toBeGreaterThan(PLAZA.RADIUS + 0.75);
      }
    }
  });

  it('la pareja recién fundada no finge una cosecha ni una leñera asentada', () => {
    const state = foundGame(7);
    const places = steadingOf(state, state.terrainSeed);
    expect(places.filter(place => place.asset === 'haystack')).toEqual([]);
    expect(places.filter(place => place.asset === 'log-pile')).toEqual([]);
    expect(places.filter(place => place.asset === 'shed')).toEqual([]);
  });

  it('la leña, los cobertizos y los almiares responden a las reservas, no a contar casas y campos', () => {
    // IA-piles · en la aldea de veinte: la recién fundada tiene una sola casa
    // pegada a la plaza y su leñero cabe en una celda, con reservas o sin ellas.
    const state = foundTwenty(7);
    state.tick = 1;
    state.village.wood = 0;
    state.village.grain = 0;
    expect(steadingOf(state, state.terrainSeed)
      .filter(place => place.asset === 'log-pile' || place.asset === 'haystack')).toEqual([]);

    state.village.wood = 60;
    state.village.grain = 200;
    const scant = steadingOf(state, state.terrainSeed);
    state.village.wood = 180;
    state.village.grain = 600;
    const stocked = steadingOf(state, state.terrainSeed);
    expect(stocked.filter(place => place.asset === 'log-pile').length)
      .toBeGreaterThan(scant.filter(place => place.asset === 'log-pile').length);
    expect(stocked.filter(place => place.asset === 'haystack').length)
      .toBeGreaterThan(scant.filter(place => place.asset === 'haystack').length);
    expect(stocked.filter(place => place.asset === 'shed').length)
      .toBeGreaterThan(scant.filter(place => place.asset === 'shed').length);
  });
});
