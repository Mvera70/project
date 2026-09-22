// G-15 · Los trastos del corral. design.md D.8, §7.4.
//
// Tres objetos que no son edificios: un almiar, la leña y una carreta. Lo que
// se prueba aquí no es que se vean —eso es una captura— sino que **están donde
// alguien los habría dejado**: junto a algo, en suelo pisable, y nunca dos
// encima del mismo sitio. Un objeto en medio del prado se lee como decorado.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { MOST_STEADED, STEADING_ASSETS, steadingOf } from '../../src/render3d/world/steading';
import { PLAZA } from '@engine/balance';
import { plazaCentre } from '@engine/world/plaza';
import { foundTwenty } from '../helpers/founding';

function village(years: number, seed = 7): GameState {
  const state = foundGame(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

describe('G-15 · dónde se dejan los trastos del corral', () => {
  it('nada sobre el agua, la marisma, la roca, el bosque ni lo construido', () => {
    // La razón de cada exclusión es la misma: nadie apila leña en un robledal
    // ni deja una carreta en el río. Se comprueba en varias semillas porque un
    // mapa concreto puede no tener ni marisma.
    for (const seed of [7, 11, 23, 41]) {
      const state = village(20, seed);
      const built = new Set<number>();
      for (const one of state.buildings) {
        if (one.lostTick !== null) continue;
        for (let row = 0; row < one.h; row += 1) {
          for (let column = 0; column < one.w; column += 1) {
            built.add((one.y + row) * state.map.width + one.x + column);
          }
        }
      }
      for (const place of steadingOf(state, state.terrainSeed)) {
        const kind = state.map.terrain[place.cell];
        expect([TERRAIN_CODE.meadow, TERRAIN_CODE.cleared],
          `semilla ${seed}: ${place.asset} en terreno ${kind}`).toContain(kind);
        expect(built.has(place.cell), `semilla ${seed}: ${place.asset} dentro de un edificio`)
          .toBe(false);
      }
    }
  });

  it('ni dos cosas en la misma celda', () => {
    const state = village(30, 11);
    const places = steadingOf(state, state.terrainSeed);
    expect(new Set(places.map((one) => one.cell)).size).toBe(places.length);
  });

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

  it('ni cuatro almiares en fila, que se leen como un campamento', () => {
    // El defecto que se vio en la primera captura: los candidatos son el anillo
    // de un campo y el anillo se recorre seguido, así que los cuatro salían
    // pegados. La separación es lo que los convierte en la cosecha de cuatro
    // campos en vez de en cuatro tiendas.
    for (const seed of [7, 11, 23]) {
      const state = village(25, seed);
      const places = steadingOf(state, state.terrainSeed);
      for (const asset of STEADING_ASSETS) {
        const mine = places.filter((one) => one.asset === asset);
        for (let a = 0; a < mine.length; a += 1) {
          for (let b = a + 1; b < mine.length; b += 1) {
            const one = mine[a]!;
            const other = mine[b]!;
            const dx = Math.abs((one.cell % state.map.width) - (other.cell % state.map.width));
            const dz = Math.abs(
              Math.floor(one.cell / state.map.width) - Math.floor(other.cell / state.map.width),
            );
            expect(Math.max(dx, dz), `semilla ${seed}: dos ${asset} a ${dx},${dz}`)
              .toBeGreaterThanOrEqual(3);
          }
        }
      }
    }
  });

  it('y nunca más de los que una aldea justifica', () => {
    const state = village(40, 23);
    const places = steadingOf(state, state.terrainSeed);
    for (const asset of STEADING_ASSETS) {
      expect(places.filter((one) => one.asset === asset).length)
        .toBeLessThanOrEqual(MOST_STEADED[asset]);
    }
  });

  it('el mismo estado da los mismos sitios, pintadas las veces que sea', () => {
    // §4.3: pintar no puede depender de cuántas veces se ha pintado. Si esto
    // falla, los trastos bailan por el valle de un fotograma al siguiente.
    const state = village(18);
    const first = steadingOf(state, state.terrainSeed);
    const again = steadingOf(state, state.terrainSeed);
    expect(again).toEqual(first);
    expect(first.length, 'y hay algo que comparar').toBeGreaterThan(0);
  });

  it('la pareja recién fundada no finge una cosecha ni una leñera asentada', () => {
    const state = foundGame(7);
    const places = steadingOf(state, state.terrainSeed);
    expect(places.filter(place => place.asset === 'haystack')).toEqual([]);
    expect(places.filter(place => place.asset === 'log-pile')).toEqual([]);
    expect(places.filter(place => place.asset === 'shed')).toEqual([]);
  });

  it('la leña, los cobertizos y los almiares responden a las reservas, no a contar casas y campos', () => {
    const state = foundGame(7);
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
