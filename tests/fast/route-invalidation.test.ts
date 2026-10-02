// v5.71 · Que una obra no tire todas las rutas, y que lo que se ahorra no cambie
// la partida. `docs/medidas/ci-lentitud-2026-10-02.md` §6.1.
//
// Hasta v5.71 cada casa u obra que aparecía o desaparecía, y cada senda que se
// mejoraba, tiraba la caché entera y A* volvía a correr para toda la aldea. Lo
// que eso garantizaba es que, justo después, cada ruta era la que A* daba
// desde cero sobre el mapa de ese momento. Estas pruebas guardan esa misma
// propiedad sin pedir el recálculo: lo comparan con una copia del estado, que
// no tiene caché y lo calcula todo.
import { describe, expect, it } from 'vitest';
import { BUILDINGS, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState, VillagerId } from '@engine/state';
import { routeSearches, routesFor } from '@engine/world/paths';
import { walkingBlocked } from '@engine/world/spatial';
import { foundTwenty } from '../helpers/founding';

function fresh(state: GameState): Map<VillagerId, number[]> {
  return routesFor(structuredClone(state));
}

function plain(routes: Map<VillagerId, number[]>): [VillagerId, number[]][] {
  return [...routes].map(([id, cells]) => [id, [...cells]] as [VillagerId, number[]]).sort((a, b) => a[0] - b[0]);
}

/** Lo que hasta v5.71 tiraba la caché: las casas y obras en pie, la plaza y las sendas. */
function footprint(state: GameState): string {
  return state.buildings.filter(b => b.lostTick === null).map(b => `${b.kind}:${b.x},${b.y},${b.w},${b.h}`).join('|')
    + '/' + state.works.map(w => `${w.kind}:${w.x},${w.y},${w.w},${w.h}`).join('|')
    + `/${state.plaza.x},${state.plaza.y}/` + state.map.path.join('');
}

function palisade(state: GameState, x: number, y: number): void {
  const spec = BUILDINGS.palisade;
  state.buildings.push({ id: Math.max(...state.buildings.map(b => b.id)) + 1, kind: 'palisade', x, y, w: spec.w, h: spec.h,
    tier: spec.tier, builtTick: state.tick, lostTick: null, blockedUntil: null, lit: true });
}

/**
 * Dos estacas simétricas respecto al centro de las casas, para que el centro
 * del pueblo —de donde salen los árboles y orillas que se reparten— no se
 * mueva y los destinos sigan siendo los mismos. `pick` decide si la primera
 * celda vale, y con `both` también la segunda; si no, basta con que esté libre.
 */
function pairOfStakes(state: GameState, pick: (cell: number) => boolean, both: boolean): number | null {
  const width = state.map.width;
  const live = state.buildings.filter(b => b.lostTick === null);
  const cx = Math.round(live.reduce((n, b) => n + b.x + Math.floor(b.w / 2), 0) / live.length);
  const cy = Math.round(live.reduce((n, b) => n + b.y + Math.floor(b.h / 2), 0) / live.length);
  const blocked = walkingBlocked(state);
  const free = (x: number, y: number): boolean => x > 0 && y > 0 && x < width - 1 && y < state.map.height - 1
    && blocked[y * width + x] === 0;
  for (let r = 2; r < 30; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      for (const dy of [r - Math.abs(dx), Math.abs(dx) - r]) {
        const a = { x: cx + dx, y: cy + dy }, b = { x: cx - dx, y: cy - dy };
        if (!free(a.x, a.y) || !free(b.x, b.y)) continue;
        const cell = a.y * width + a.x;
        if (!pick(cell)) continue;
        if (both && !pick(b.y * width + b.x)) continue;
        palisade(state, a.x, a.y);
        palisade(state, b.x, b.y);
        return cell;
      }
    }
  }
  return null;
}

const OFF_ROUTE = new WeakMap<GameState, (cell: number) => boolean>();
function offRoute(state: GameState): (cell: number) => boolean {
  let known = OFF_ROUTE.get(state);
  if (known === undefined) {
    const walked = new Set([...routesFor(state).values()].flat());
    known = (cell: number) => !walked.has(cell);
    OFF_ROUTE.set(state, known);
  }
  return known;
}

function grown(seed: number, years: number): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
  return state;
}

describe('una obra no tira las rutas que no cruza (v5.71)', () => {
  it('dos estacas lejos de toda ruta no lanzan ni un A*, y las rutas son las de un cálculo desde cero', () => {
    for (const seed of [7, 23, 41]) {
      const state = grown(seed, 2);
      // Primero un par que se lleve lo pendiente. Lo que se abarata entre dos
      // obras —un árbol talado, una senda que mejora— se comprueba en la obra
      // siguiente, y si esa es la que se mide, sus búsquedas se le cuentan a
      // ella. Con el valle de forma natural (v5.73), las aldeas de las semillas
      // 7 y 23 llegaban aquí con una y dos rutas así: idénticas al buscarlas de
      // nuevo, pero buscadas.
      expect(pairOfStakes(state, offRoute(state), true), `semilla ${seed}: sitio para las primeras estacas`).not.toBeNull();
      routesFor(state);
      OFF_ROUTE.delete(state);
      const before = plain(routesFor(state));
      const searches = routeSearches(state);
      expect(pairOfStakes(state, offRoute(state), true), `semilla ${seed}: sitio para las estacas`).not.toBeNull();

      const after = plain(routesFor(state));
      expect(routeSearches(state), `semilla ${seed}`).toBe(searches);
      expect(after).toEqual(before);
      expect(after).toEqual(plain(fresh(state)));
    }
  });

  it('una estaca sobre una ruta la recalcula, y la nueva la rodea', () => {
    for (const seed of [7, 23, 41]) {
      const state = grown(seed, 2);
      const routes = routesFor(state);
      // Una celda del medio de una ruta: los extremos son fachadas de casas.
      const middle = new Set([...routes.values()].flatMap(cells => cells.slice(2, -2)));
      const searches = routeSearches(state);
      const cell = pairOfStakes(state, c => middle.has(c), false);
      expect(cell, `semilla ${seed}: una ruta que cortar`).not.toBeNull();

      const after = routesFor(state);
      expect(routeSearches(state), `semilla ${seed}`).toBeGreaterThan(searches);
      for (const cells of after.values()) expect(cells).not.toContain(cell);
      expect(plain(after)).toEqual(plain(fresh(state)));
    }
  });
});

describe('lo que se ahorra no cambia la partida (v5.71)', () => {
  it('cada vez que cambian casas, obras o sendas, las rutas son las que A* daría desde cero', () => {
    let checked = 0;
    for (const seed of [7, 23, 41]) {
      const state = foundTwenty(seed);
      let last = footprint(state);
      for (let week = 0; week < TIME.WEEKS_PER_YEAR * 3 && state.ended === null; week += 1) {
        run(state, 1, 'prudent', CATALOG);
        const now = footprint(state);
        if (now === last) continue;
        last = now;
        expect(plain(routesFor(state)), `semilla ${seed}, semana ${week}`).toEqual(plain(fresh(state)));
        checked += 1;
      }
    }
    // Que la prueba mire de verdad: en tres años pasan decenas de cambios.
    expect(checked).toBeGreaterThan(30);
  });
});
