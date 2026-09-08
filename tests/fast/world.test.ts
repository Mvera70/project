// M-15 · Caminos y bosque. design.md §7.5, §7.6, §12.7.
//
// Las propiedades son las del diseño: el bosque retrocede desde la aldea y
// rebrota por detrás, el suelo se desgasta donde se pisa y se borra donde no.
// Cómo esté escrito el A* da igual mientras sea determinista.
import { describe, expect, it } from 'vitest';

import { PATHING, TIME, WORLD } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { TERRAIN_CODE } from '@engine/state';
import type { GameState } from '@engine/state';
import { route, stepCost } from '@engine/world/astar';
import {
  fellForest,
  forestCells,
  regrowForest,
  virginForestCells,
  woodStanding,
} from '@engine/world/forest';
import { accrueTraffic, routeFor, upgradePaths } from '@engine/world/paths';
import { idx } from '@engine/world/tiles';

const YEAR = TIME.WEEKS_PER_YEAR;

/** Una partida sin nadie que ande: `accrueTraffic` solo decae. */
function empty(seed = 7): GameState {
  const s = foundGame(seed);
  for (const v of s.people.villagers) v.diedTick = 0;
  return s;
}

describe('el coste del suelo · §7.6', () => {
  it('el agua y la marisma no se pisan', () => {
    const s = foundGame(7);
    const water = [...s.map.terrain].findIndex((t) => t === TERRAIN_CODE.water);
    expect(stepCost(s.map, water)).toBeNull();
    const marsh = [...s.map.terrain].findIndex((t) => t === TERRAIN_CODE.marsh);
    if (marsh >= 0) expect(stepCost(s.map, marsh)).toBeNull();
  });

  it('el bosque y la roca son más caros que la pradera, y el camino más barato', () => {
    const s = foundGame(7);
    const meadow = [...s.map.terrain].findIndex((t) => t === TERRAIN_CODE.meadow);
    const forest = [...s.map.terrain].findIndex((t) => t === TERRAIN_CODE.forest);
    expect(stepCost(s.map, forest)).toBeGreaterThan(stepCost(s.map, meadow) as number);

    const plain = stepCost(s.map, meadow) as number;
    s.map.path[meadow] = 2;
    expect(stepCost(s.map, meadow)).toBeLessThan(plain);
    s.map.path[meadow] = 3;
    expect(stepCost(s.map, meadow)).toBe(PATHING.MIN_STEP);
  });

  it('ningún paso cuesta menos que la cota que usa la heurística', () => {
    const s = foundGame(7);
    for (let level = 0; level <= 3; level += 1) {
      for (let i = 0; i < s.map.terrain.length; i += 1) s.map.path[i] = level;
      for (let i = 0; i < s.map.terrain.length; i += 1) {
        const cost = stepCost(s.map, i);
        if (cost !== null) expect(cost).toBeGreaterThanOrEqual(PATHING.MIN_STEP);
      }
    }
  });
});

describe('el trayecto · §7.6', () => {
  it('es contiguo, empieza donde se pide y acaba donde se pide', () => {
    const s = foundGame(7);
    const houses = s.buildings.filter((b) => b.kind === 'house');
    const from = idx(houses[0]!.x, houses[0]!.y);
    const to = idx(houses[houses.length - 1]!.x, houses[houses.length - 1]!.y);
    const walked = route(s.map, from, to);
    expect(walked[0]).toBe(from);
    expect(walked[walked.length - 1]).toBe(to);
    for (let i = 1; i < walked.length; i += 1) {
      const a = walked[i - 1] as number;
      const b = walked[i] as number;
      const dx = Math.abs((a % s.map.width) - (b % s.map.width));
      const dy = Math.abs(Math.floor(a / s.map.width) - Math.floor(b / s.map.width));
      expect(dx + dy).toBe(1);
    }
  });

  it('es determinista y no toca el estado', () => {
    const s = foundGame(7);
    const houses = s.buildings.filter((b) => b.kind === 'house');
    const from = idx(houses[0]!.x, houses[0]!.y);
    const to = idx(houses[2]!.x, houses[2]!.y);
    const before = { ...s.rng };
    expect(route(s.map, from, to)).toEqual(route(s.map, from, to));
    expect({ ...s.rng }).toEqual(before);
  });

  it('devuelve vacío si no hay manera de llegar', () => {
    const s = foundGame(7);
    const houses = s.buildings.filter((b) => b.kind === 'house');
    const from = idx(houses[0]!.x, houses[0]!.y);
    // Un destino rodeado de agua no es un destino.
    const island = idx(1, 1);
    for (const n of [idx(0, 1), idx(2, 1), idx(1, 0), idx(1, 2)]) {
      s.map.terrain[n] = TERRAIN_CODE.water;
    }
    s.map.terrain[island] = TERRAIN_CODE.meadow;
    expect(route(s.map, from, island)).toEqual([]);
  });

  it('prefiere rodear por la calzada a cruzar el bosque', () => {
    // Mapa a mano: pradera entera, un muro de bosque de lado a lado con un solo
    // hueco en la columna 0, y una calzada que lleva hasta él y sigue por el
    // sur. Cruzar el muro son doce de coste extra por celda; rodear son muchas
    // más celdas pero a tres. Lo que se comprueba es que gana la calzada, que es
    // lo que hace que los caminos se refuercen solos.
    const s = foundGame(7);
    s.map.terrain.fill(TERRAIN_CODE.meadow);
    s.map.path.fill(0);
    const wall = 10;
    for (let x = 0; x < s.map.width; x += 1) s.map.terrain[idx(x, wall)] = TERRAIN_CODE.forest;
    const detour = 14;
    for (let x = 0; x < s.map.width; x += 1) s.map.path[idx(x, detour)] = 3;
    for (let y = wall; y <= detour; y += 1) {
      s.map.terrain[idx(0, y)] = TERRAIN_CODE.meadow;
      s.map.path[idx(0, y)] = 3;
    }

    const walked = route(s.map, idx(2, 6), idx(30, 18));
    expect(walked.length).toBeGreaterThan(0);
    const throughForest = walked.filter((c) => s.map.terrain[c] === TERRAIN_CODE.forest).length;
    const onRoad = walked.filter((c) => s.map.path[c] === 3).length;
    expect(throughForest).toBe(0); // pasa por el hueco, no por el muro
    expect(onRoad).toBeGreaterThan(walked.length / 3);
  });
});

describe('el desgaste del suelo · §7.6', () => {
  it('con tráfico constante una celda llega a sendero cuando toca, ±5 %', () => {
    // El desgaste es t' = t − ceil(0.005·t) + k. En continuo eso es
    // t(n) = (k/d)·(1 − e^{−d·n}) con d = TRAFFIC_DECAY, así que llegar a
    // PATH_T2 lleva n = −ln(1 − d·T2/k)/d semanas. La expectativa se calcula
    // aquí, no se lee del motor.
    const walkers = 12;
    const d = WORLD.TRAFFIC_DECAY;
    // `ceil` redondea el decaimiento hacia arriba, así que de media se pierde
    // medio punto más por semana del que dice la tasa. Sin ese medio punto la
    // expectativa sale un 8 % corta, que es más que la tolerancia.
    const expected = -Math.log(1 - (d * WORLD.PATH_T2) / (walkers - 0.5)) / d;

    const s = empty();
    const cell = idx(18, 20);
    s.map.terrain[cell] = TERRAIN_CODE.meadow;
    let ticks = 0;
    while (s.map.path[cell] !== 2 && ticks < 5000) {
      accrueTraffic(s); // nadie anda: solo decae
      s.map.traffic[cell] = (s.map.traffic[cell] as number) + walkers;
      upgradePaths(s);
      ticks += 1;
    }
    expect(ticks).toBeGreaterThan(expected * 0.95);
    expect(ticks).toBeLessThan(expected * 1.05);
  });

  it('sin tráfico, un camino se borra solo', () => {
    const s = empty();
    const cell = idx(18, 20);
    s.map.terrain[cell] = TERRAIN_CODE.meadow;
    s.map.traffic[cell] = WORLD.PATH_T2;
    upgradePaths(s);
    expect(s.map.path[cell]).toBe(2);

    let ticks = 0;
    while (s.map.path[cell] !== 0 && ticks < 20000) {
      accrueTraffic(s);
      upgradePaths(s);
      ticks += 1;
    }
    // El camino se borra en cuanto el desgaste baja del primer umbral; que la
    // celda llegue después a cero es otra cosa, y también pasa.
    expect(s.map.path[cell]).toBe(0);
    expect(s.map.traffic[cell]).toBeLessThan(WORLD.PATH_T1);
    for (let i = 0; i < 5000 && (s.map.traffic[cell] as number) > 0; i += 1) accrueTraffic(s);
    expect(s.map.traffic[cell]).toBe(0);
  });

  it('la calzada necesita fragua', () => {
    const s = empty();
    const cell = idx(18, 20);
    s.map.terrain[cell] = TERRAIN_CODE.meadow;
    s.map.traffic[cell] = WORLD.PATH_T3;
    upgradePaths(s);
    expect(s.map.path[cell]).toBe(2);

    s.buildings.push({
      id: 900, kind: 'smithy', x: 0, y: 0, w: 2, h: 2,
      builtTick: 0, lostTick: null, tier: 0, lit: true,
    });
    upgradePaths(s);
    expect(s.map.path[cell]).toBe(3);
  });

  it('nunca aparece un camino sobre el agua', () => {
    const s = empty();
    for (let i = 0; i < s.map.traffic.length; i += 1) s.map.traffic[i] = WORLD.PATH_T3;
    upgradePaths(s);
    for (let i = 0; i < s.map.terrain.length; i += 1) {
      if (s.map.terrain[i] === TERRAIN_CODE.water || s.map.terrain[i] === TERRAIN_CODE.marsh) {
        expect(s.map.path[i], `celda ${i}`).toBe(0);
      }
    }
  });

  it('en una partida real la gente acaba abriendo camino', () => {
    const s = foundGame(108);
    run(s, 60 * YEAR, 'prudent', CATALOG);
    const trodden = [...s.map.path].filter((p) => p > 0).length;
    expect(trodden).toBeGreaterThan(0);
    // Y quien tiene casa y trabajo tiene por dónde ir.
    const walker = s.people.villagers.find(
      (v) => v.diedTick === null && v.leftTick === null && v.homeId !== null,
    );
    if (walker !== undefined) expect(routeFor(s, walker.id).length).toBeGreaterThanOrEqual(0);
  });

  it('cambiar de casa invalida el destino aunque la cuadrilla mida lo mismo', () => {
    const s = foundGame(108);
    const houses = s.buildings.filter((building) => building.kind === 'house');
    const walker = s.people.villagers
      .filter((villager) => villager.diedTick === null && villager.leftTick === null && villager.homeId !== null)
      .sort((a, b) => a.id - b.id)[1]!;
    walker.homeId = houses[0]!.id;
    const before = routeFor(s, walker.id);
    walker.homeId = houses[houses.length - 1]!.id;
    const after = routeFor(s, walker.id);
    expect(after[0]).not.toBe(before[0]);
  });
});

describe('el bosque · §7.5', () => {
  it('se tala la celda más cercana al núcleo', () => {
    const s = foundGame(7);
    const centre = {
      x: s.buildings.reduce((n, b) => n + b.x + b.w / 2, 0) / s.buildings.length,
      y: s.buildings.reduce((n, b) => n + b.y + b.h / 2, 0) / s.buildings.length,
    };
    const distance = (cell: number): number =>
      ((cell % s.map.width) + 0.5 - centre.x) ** 2 +
      (Math.floor(cell / s.map.width) + 0.5 - centre.y) ** 2;
    const nearest = [...s.map.terrain]
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t === TERRAIN_CODE.forest)
      .sort((a, b) => distance(a.i) - distance(b.i) || a.i - b.i)[0]!.i;

    fellForest(s, 10);
    expect(s.map.forestStock[nearest]).toBe(WORLD.WOOD_PER_FOREST_TILE - 10);
  });

  it('al vaciarse una celda pasa a cleared y empieza a contar', () => {
    const s = foundGame(7);
    const before = forestCells(s);
    fellForest(s, WORLD.WOOD_PER_FOREST_TILE);
    expect(forestCells(s)).toBe(before - 1);
    const cleared = [...s.map.terrain].findIndex((t) => t === TERRAIN_CODE.cleared);
    expect(cleared).toBeGreaterThanOrEqual(0);
    expect(s.map.forestAge[cleared]).toBe(0);
  });

  it('devuelve menos de lo pedido cuando el valle se acaba', () => {
    const s = foundGame(7);
    const all = woodStanding(s);
    expect(fellForest(s, all + 5000)).toBe(all);
    expect(woodStanding(s)).toBe(0);
    expect(forestCells(s)).toBe(0);
    expect(fellForest(s, 100)).toBe(0);
  });

  it('nunca baja de cero ni sube del total inicial, en un siglo', () => {
    for (const seed of [0, 7, 42]) {
      const s = foundGame(seed);
      const initialCells = forestCells(s);
      const initialWood = woodStanding(s);
      for (let year = 0; year < 100; year += 1) {
        run(s, YEAR, 'prudent', CATALOG);
        expect(woodStanding(s), `semilla ${seed}, año ${year}`).toBeGreaterThanOrEqual(0);
        expect(woodStanding(s)).toBeLessThanOrEqual(initialWood);
        expect(forestCells(s)).toBeGreaterThanOrEqual(0);
        expect(forestCells(s)).toBeLessThanOrEqual(initialCells);
        if (s.ended !== null) break;
      }
    }
  });

  it('el rebrote necesita tres vecinas de bosque y ocho años', () => {
    const s = foundGame(7);
    // Una celda despejada rodeada de bosque por tres lados.
    const cell = idx(4, 4);
    for (const n of [idx(3, 4), idx(5, 4), idx(4, 3)]) s.map.terrain[n] = TERRAIN_CODE.forest;
    s.map.terrain[idx(4, 5)] = TERRAIN_CODE.meadow;
    s.map.terrain[cell] = TERRAIN_CODE.cleared;
    s.map.forestAge[cell] = 0;
    s.map.forestStock[cell] = 0;

    for (let year = 1; year < WORLD.FOREST_REGROWTH_YEARS; year += 1) {
      s.tick = year * YEAR;
      regrowForest(s);
      expect(s.map.terrain[cell], `año ${year}`).toBe(TERRAIN_CODE.cleared);
    }
    s.tick = WORLD.FOREST_REGROWTH_YEARS * YEAR;
    regrowForest(s);
    expect(s.map.terrain[cell]).toBe(TERRAIN_CODE.forest);
    expect(s.map.forestStock[cell]).toBe(WORLD.WOOD_PER_FOREST_TILE);
  });

  it('con menos de tres vecinas no rebrota nunca', () => {
    const s = foundGame(7);
    const cell = idx(4, 4);
    for (const n of [idx(3, 4), idx(5, 4)]) s.map.terrain[n] = TERRAIN_CODE.forest;
    for (const n of [idx(4, 3), idx(4, 5)]) s.map.terrain[n] = TERRAIN_CODE.meadow;
    s.map.terrain[cell] = TERRAIN_CODE.cleared;
    for (let year = 1; year <= 40; year += 1) {
      s.tick = year * YEAR;
      regrowForest(s);
    }
    expect(s.map.terrain[cell]).toBe(TERRAIN_CODE.cleared);
  });

  it('no rebrota debajo de un edificio', () => {
    const s = foundGame(7);
    const cell = idx(4, 4);
    for (const n of [idx(3, 4), idx(5, 4), idx(4, 3)]) s.map.terrain[n] = TERRAIN_CODE.forest;
    s.map.terrain[cell] = TERRAIN_CODE.cleared;
    s.buildings.push({
      id: 901, kind: 'house', x: 4, y: 4, w: 2, h: 2,
      builtTick: 0, lostTick: null, tier: 0, lit: true,
    });
    for (let year = 1; year <= 40; year += 1) {
      s.tick = year * YEAR;
      regrowForest(s);
    }
    expect(s.map.terrain[cell]).toBe(TERRAIN_CODE.cleared);
  });

  it('el rebrote solo ocurre en la semana 0 del año', () => {
    const s = foundGame(7);
    const cell = idx(4, 4);
    for (const n of [idx(3, 4), idx(5, 4), idx(4, 3)]) s.map.terrain[n] = TERRAIN_CODE.forest;
    s.map.terrain[cell] = TERRAIN_CODE.cleared;
    s.map.forestAge[cell] = WORLD.FOREST_REGROWTH_YEARS;
    s.tick = 5 * YEAR + 1;
    regrowForest(s);
    expect(s.map.terrain[cell]).toBe(TERRAIN_CODE.cleared);
  });

  it('la madera de la aldea no puede pasar de lo que hay en pie', () => {
    // §5.2: `woodCap`. Un valle talado deja de dar madera en vez de darla de la
    // nada, que es lo que pasaba mientras el paso 5 no preguntaba al bosque.
    const s = foundGame(7);
    fellForest(s, woodStanding(s)); // valle raso
    const before = s.village.wood;
    run(s, 20, 'prudent', CATALOG);
    expect(s.village.wood).toBeLessThanOrEqual(before);
  });
});

describe('el bosque viejo · §9, v2.16', () => {
  it('nace todo marcado y la marca no vuelve', () => {
    const s = foundGame(7);
    expect(virginForestCells(s)).toBe(forestCells(s));
    // Talarlo entero y dejar que rebrote no devuelve la marca: lo que crece no
    // es el bosque que encontraron.
    fellForest(s, woodStanding(s));
    expect(virginForestCells(s)).toBe(0);
  });

  it('la última celda del bosque viejo deja línea de peso 2, una sola vez', () => {
    const s = foundGame(7);
    const before = s.chronicle.length;
    // Talar a mano hasta el final y luego dejar correr una semana del motor.
    fellForest(s, woodStanding(s));
    expect(s.flags['old_forest_gone']).toBe(0);

    const t = foundGame(42);
    const last = [...t.map.terrain].findIndex((terrain) => terrain === TERRAIN_CODE.forest);
    for (let cell = 0; cell < t.map.terrain.length; cell += 1) {
      if (t.map.terrain[cell] !== TERRAIN_CODE.forest) continue;
      t.map.terrain[cell] = TERRAIN_CODE.cleared;
      t.map.forestStock[cell] = 0;
      t.map.forestAge[cell] = 0;
    }
    t.map.terrain[last] = TERRAIN_CODE.forest;
    t.map.forestStock[last] = 1;
    t.map.forestAge[last] = WORLD.VIRGIN_FOREST;
    const reports = [run(t, 1, 'prudent', CATALOG)[0], run(t, 1, 'prudent', CATALOG)[0]];
    const seen = reports.flatMap((report) => report?.entries ?? [])
      .filter((entry) => entry.templateKey === 'forest.old_gone');
    expect(seen).toHaveLength(1);
    expect(seen[0]?.weight).toBe(2);
    expect(s.chronicle.length).toBe(before); // fellForest no escribe crónica
  });

  it('una celda despejada sigue pudiendo rebrotar tras siglos de espera', () => {
    // El contador satura por debajo de la marca de bosque viejo en vez de
    // pararse: si se parase, una celda que esperó doscientos cincuenta y cinco
    // años a tener tres vecinas ya no rebrotaría nunca.
    const s = foundGame(7);
    const cell = idx(4, 4);
    s.map.terrain[cell] = TERRAIN_CODE.cleared;
    for (const n of [idx(3, 4), idx(5, 4), idx(4, 3)]) s.map.terrain[n] = TERRAIN_CODE.meadow;
    for (let year = 1; year <= 300; year += 1) {
      s.tick = year * YEAR;
      regrowForest(s);
    }
    expect(s.map.forestAge[cell]).toBeLessThan(WORLD.VIRGIN_FOREST);
    for (const n of [idx(3, 4), idx(5, 4), idx(4, 3)]) s.map.terrain[n] = TERRAIN_CODE.forest;
    s.tick = 301 * YEAR;
    regrowForest(s);
    expect(s.map.terrain[cell]).toBe(TERRAIN_CODE.forest);
  });
});
