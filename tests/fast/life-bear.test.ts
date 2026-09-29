import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { bearPosition, createBear, stepBear, type Bear } from '../../src/render3d/life/bear';
import { stepDeer, type Deer } from '../../src/render3d/life/deer';
import { terrainOf } from '../../src/render3d/life/terrain';
import { fitsCircle, indexSolids, type Solid, type Terrain } from '../../src/render3d/life/body';
import { scatterTransform } from '../../src/render3d/world/forest';
import { TERRAIN_CODE } from '@engine/state';
import { elevationAt } from '../../src/render3d/world/ground';

describe('visita del oso', () => {
  it('sólo aparece durante el suceso real, estable y sobre suelo transitable', () => {
    const state = foundTwenty(7);
    const land = terrainOf(state);
    const heart = { x: state.map.width / 2, z: state.map.height / 2 };
    expect(createBear(state, land, heart)).toBeNull();
    state.flags['bear'] = state.tick + 2;
    expect(createBear(state, land, heart)).toBeNull();
    state.flags['hunt:boar'] = 0;
    const before = JSON.stringify(state);
    const first = createVillage(state, 0), second = createVillage(state, 0);
    const bear = first.wildlife.filter(animal => animal.kind === 'bear');
    expect(bear).toHaveLength(1);
    expect(bear).toEqual(second.wildlife.filter(animal => animal.kind === 'bear'));
    expect(fitsCircle(land, bear[0]!.x, bear[0]!.y, 0.52)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    first.dispose(); second.dispose();
    state.tick += 2;
    expect(createBear(state, land, heart)).toBeNull();
  });

  it('AN-4d · la cueva está al pie de la montaña, con la roca detrás, aunque el bosque tenga troncos', () => {
    // `solidTerrain` pone el tronco del árbol publicado en cada celda de
    // bosque; con él, buscando la guarida entre árboles, la visita no nacía
    // nunca en partida (AN-4c). La cueva va en la montaña (Vera, 29 sep 2026),
    // y así nace con los troncos puestos: aquí, una caja de 0,3 donde el juego
    // planta cada árbol.
    const state = foundTwenty(7);
    state.flags['bear'] = state.tick + 2;
    state.flags['hunt:boar'] = 0;
    const bare = terrainOf(state);
    const trunks: Solid[] = [];
    for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
      if (state.map.terrain[cell] !== TERRAIN_CODE.forest) continue;
      const { x, z } = scatterTransform(bare.width, cell);
      trunks.push({ minX: x - 0.15, minZ: z - 0.15, maxX: x + 0.15, maxZ: z + 0.15 });
    }
    const land: Terrain = { ...bare, solids: indexSolids(bare.width, bare.height, trunks) };
    // La cota del suelo que pinta el juego, la misma que le pasa el renderer.
    const ground = (x: number, z: number): number => elevationAt(state.map, x, z);
    const village = createVillage(state, 0, { land, ground });
    const bear = village.wildlife.filter(animal => animal.kind === 'bear');
    expect(bear, 'el oso nace con los troncos puestos').toHaveLength(1);
    expect(fitsCircle(land, bear[0]!.x, bear[0]!.y, 0.52)).toBe(true);
    // La cueva toca la montaña, y la montaña queda detrás: el claro está al otro lado.
    const den = village.bearDen!;
    const cx = Math.floor(den.x), cz = Math.floor(den.z);
    let behindX = 0, behindZ = 0;
    for (let dz = -1; dz <= 1; dz += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if (state.map.terrain[(cz + dz) * land.width + cx + dx] === TERRAIN_CODE.mountain) { behindX += dx; behindZ += dz; }
    }
    expect(Math.hypot(behindX, behindZ), 'la cueva está al pie de la montaña').toBeGreaterThan(0);
    const toClearing = { x: den.clearingX - den.x, z: den.clearingZ - den.z };
    expect(toClearing.x * behindX + toClearing.z * behindZ, 'la boca mira al valle, no a la roca').toBeLessThan(0);
    // Y a la espalda del modelo —la contraria al claro— hay roca seguida y la
    // ladera sube: no es una mota de roca suelta en la pradera.
    const length = Math.hypot(toClearing.x, toClearing.z);
    const back = { x: -toClearing.x / length, z: -toClearing.z / length };
    for (let k = 1; k <= 3; k += 1) {
      const cell = Math.floor(den.z + back.z * k) * land.width + Math.floor(den.x + back.x * k);
      expect(state.map.terrain[cell], `roca a ${k} celdas detrás`).toBe(TERRAIN_CODE.mountain);
    }
    const rise = ground(den.x + back.x * 2, den.z + back.z * 2) - ground(den.x, den.z);
    expect(rise, 'la montaña sube detrás de la cueva').toBeGreaterThanOrEqual(0.5);
    // Y el oso nace en la boca, por delante del modelo y mirando al claro, no
    // en su centro, donde la roca lo tapaba (la receta de `bear-den`).
    const facing = Math.atan2(toClearing.x, toClearing.z);
    const out = Math.atan2(bear[0]!.x - den.x, bear[0]!.y - den.z);
    expect(Math.hypot(bear[0]!.x - den.x, bear[0]!.y - den.z)).toBeGreaterThan(0.5);
    expect(Math.abs(Math.atan2(Math.sin(out - facing), Math.cos(out - facing)))).toBeLessThan(0.01);
    village.dispose();
  });

  const meadow = (): Terrain => ({ width: 24, height: 24, blocked: new Uint8Array(24 * 24) });
  const visitor = (): Bear => ({
    body: { id: 50_000, x: 10, z: 10, vx: 0, vz: 0, facing: 0, radius: 0.52, pace: 0.56 },
    den: { x: 10, z: 10 }, mouth: { x: 10, z: 10 }, clearing: { x: 13, z: 10 }, pasture: [],
    phase: 'approach', target: { x: 13, z: 10 }, nextChoice: 0,
    warningUntil: 0, choices: 0,
  });

  it('se detiene y enseña el zarpazo ante quien se acerca; si se aparta, vuelve a lo suyo (AN-5d)', () => {
    const land = meadow();
    const bear = visitor();
    stepBear(bear, land, 7, 0, [{ body: { x: 12, z: 10 } }]);
    expect(bear.phase).toBe('warning');
    expect(bearPosition(bear)[0]?.action).toBe('attack');
    // AN-3a · el aviso dura lo que el clip `attack` del oso (3 s): a los dos
    // segundos todavía amenaza.
    for (let step = 1; step < 60; step++) stepBear(bear, land, 7, step, []);
    expect(bear.phase).toBe('warning');
    // AN-5d · Y la visita no se acaba ahí (Vera, 29 sep: «hay que ampliarla»):
    // con la gente apartada, vuelve al claro y sigue fuera medio día después.
    for (let step = 60; step < 1200; step++) stepBear(bear, land, 7, step, []);
    expect(bear.phase === 'approach' || bear.phase === 'forage').toBe(true);
    expect(bearPosition(bear)).toHaveLength(1);
  });

  it('acosado de cerca, o con tres avisos, se mete en la cueva (AN-5d)', () => {
    const land = meadow();
    // Alguien encima al acabar el aviso: se retira.
    const pressed = visitor();
    for (let step = 0; step < 200; step++) stepBear(pressed, land, 7, step, [{ body: { x: pressed.body.x + 1.2, z: pressed.body.z } }]);
    expect(pressed.phase === 'retreat' || pressed.phase === 'gone').toBe(true);
    // Alguien que se queda a su distancia de aviso: se alza, se calma, vuelve a
    // alzarse… y a la tercera se va.
    const watched = visitor();
    let warnings = 0, rising = false;
    for (let step = 0; step < 900 && watched.phase !== 'gone'; step++) {
      stepBear(watched, land, 7, step, [{ body: { x: watched.body.x + 2.8, z: watched.body.z } }]);
      const up = watched.phase === 'warning';
      if (up && !rising) warnings += 1;
      rising = up;
    }
    expect(warnings).toBe(3);
    expect(watched.phase).toBe('gone');
  });

  it('con el valle entero, la visita dura mucho más que un aviso (AN-5d)', () => {
    // La jornada con su gente y los troncos puestos, como en el juego: antes, el
    // leñador del claro lo espantaba en el primer momento y la visita duraba el
    // aviso (3 s) y la vuelta a la cueva.
    const state = foundTwenty(7);
    state.flags['bear'] = state.tick + 2;
    state.flags['hunt:boar'] = 0;
    const bare = terrainOf(state);
    const trunks: Solid[] = [];
    for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
      if (state.map.terrain[cell] !== TERRAIN_CODE.forest) continue;
      const { x, z } = scatterTransform(bare.width, cell);
      trunks.push({ minX: x - 0.15, minZ: z - 0.15, maxX: x + 0.15, maxZ: z + 0.15 });
    }
    const land: Terrain = { ...bare, solids: indexSolids(bare.width, bare.height, trunks) };
    const village = createVillage(state, 0, { land, ground: (x, z) => elevationAt(state.map, x, z) });
    let out = 0;
    for (let step = 0; step < 1500; step++) {
      village.step();
      if (village.wildlife.some(animal => animal.kind === 'bear')) out += 1;
    }
    expect(out * (1 / 30), 'segundos fuera de la cueva').toBeGreaterThan(20);
    village.dispose();
  });

  it('espanta al ciervo y la visita no altera GameState', () => {
    const land: Terrain = { width: 24, height: 24, blocked: new Uint8Array(24 * 24) };
    const deer: Deer = {
      body: { id: 40_000, x: 14, z: 12, vx: 0, vz: 0, facing: 0, radius: 0.34, pace: 0.72 },
      home: { x: 14, z: 12 }, pasture: [], target: { x: 14, z: 12 },
      nextChoice: 300, nextAlarm: 0, fleeingUntil: 0, choices: 0,
    };
    for (let step = 0; step < 45; step++) {
      stepDeer([deer], land, 7, step, [], null, { x: 10, z: 12 });
    }
    expect(deer.body.x).toBeGreaterThan(15);
    const state = foundTwenty(7);
    state.flags['bear'] = state.tick + 2;
    state.flags['hunt:boar'] = 0;
    const before = JSON.stringify(state);
    const village = createVillage(state, 0);
    expect(village.wildlife.some(animal => animal.kind === 'bear')).toBe(true);
    for (let step = 0; step < 240; step++) village.step();
    expect(JSON.stringify(state)).toBe(before);
    village.dispose();
  });
});
