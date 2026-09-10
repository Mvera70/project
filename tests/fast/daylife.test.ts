// M-35 · design.md §11.9 — que la aldea parezca viva.
//
// Este fichero mide lo que un jugador llamó «aburrido y repetitivo»: que todos
// hicieran lo mismo a la vez, todos los días, apilados en la misma celda y sin
// hablar con nadie. Cada prueba es una de esas cuatro cosas.
import { describe, expect, it } from 'vitest';
import { ENCOUNTER } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run, tick } from '@engine/sim';
import { crowdPositions } from '@render/crowd';
import { routesFor } from '@engine/world/paths';
import { seasonOf } from '@engine/time';
import { fingerprint } from '../helpers/fingerprint';
import { TERRAIN_CODE, type GameState } from '@engine/state';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

/** Una semana de trabajo, que no sea la de reunión del domingo. */
function workweek(state: GameState): GameState {
  if (state.tick % 4 === 0) state.tick += 1;
  return state;
}

const positionsAt = (s: GameState, f: number): Map<number, { x: number; y: number }> =>
  new Map(crowdPositions(s, f).map((p) => [p.id, { x: p.x, y: p.y }]));

describe('no todos hacen lo mismo a la vez · §11.9', () => {
  it('a lo largo del día siempre hay alguien andando', () => {
    // Antes había dos picos —todos salen, todos vuelven— y un valle muerto en
    // medio donde nadie se movía. Eso es lo que se leía como un mecanismo.
    const state = workweek(village(20));
    let quietMoments = 0;
    let checked = 0;
    let previous = positionsAt(state, 0.02);
    for (let f = 0.06; f < 0.75; f += 0.06) {
      const now = positionsAt(state, f);
      let walking = 0;
      for (const [id, p] of now) {
        const was = previous.get(id);
        if (was !== undefined && Math.hypot(p.x - was.x, p.y - was.y) > 0.15) walking += 1;
      }
      if (walking < now.size * 0.15) quietMoments += 1;
      checked += 1;
      previous = now;
    }
    expect(checked).toBeGreaterThan(5);
    expect(quietMoments, 'no debe haber ratos muertos en la jornada').toBe(0);
  });

  it('ni todos salen de casa en el mismo instante', () => {
    const state = workweek(village(20));
    // Al principio del día tiene que haber gente ya fuera y gente aún dentro.
    const early = crowdPositions(state, 0.08);
    const later = crowdPositions(state, 0.2);
    const moved = (a: typeof early, b: typeof later): number => {
      const before = new Map(a.map((p) => [p.id, p]));
      let n = 0;
      for (const p of b) {
        const was = before.get(p.id);
        if (was !== undefined && Math.hypot(p.x - was.x, p.y - was.y) > 0.5) n += 1;
      }
      return n;
    };
    expect(moved(early, later)).toBeGreaterThan(0);
    expect(moved(early, later)).toBeLessThan(early.length);
  });
});

describe('no es el mismo día una y otra vez · §11.9', () => {
  it('la mayoría está en otro sitio que la semana pasada', () => {
    const state = workweek(village(20));
    const before = positionsAt(state, 0.3);
    tick(state, CATALOG);
    const after = positionsAt(state, 0.3);

    let same = 0;
    let compared = 0;
    for (const [id, p] of after) {
      const was = before.get(id);
      if (was === undefined) continue;
      compared += 1;
      if (Math.hypot(p.x - was.x, p.y - was.y) < 0.3) same += 1;
    }
    expect(compared).toBeGreaterThan(10);
    expect(same / compared, 'más de la mitad tiene que haber cambiado').toBeLessThan(0.5);
  });
});

describe('el año se nota · §11.9', () => {
  it('en invierno no se ara: el campo se queda vacío', () => {
    // Un valle donde en enero se sale al campo igual que en julio es un valle
    // sin estaciones, y era exactamente lo que había.
    const onFields = (s: GameState): number => {
      let n = 0;
      for (const cells of routesFor(s).values()) {
        const last = cells[cells.length - 1];
        if (last === undefined) continue;
        const x = last % s.map.width;
        const y = Math.floor(last / s.map.width);
        if (s.buildings.some((b) => b.kind === 'field' && b.lostTick === null
          && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) n += 1;
      }
      return n;
    };

    const state = village(20);
    // Busca una semana de verano y otra de invierno del mismo valle.
    let summer = 0;
    let winter = -1;
    for (let week = 0; week < 48 && (summer === 0 || winter < 0); week += 1) {
      tick(state, CATALOG);
      if (seasonOf(state.tick) === 'summer' && summer === 0) summer = onFields(state);
      if (seasonOf(state.tick) === 'winter' && winter < 0) winter = onFields(state);
    }
    expect(summer, 'en verano hay gente en los campos').toBeGreaterThan(0);
    expect(winter, 'en invierno no').toBe(0);
  });

  it('y en invierno el bosque se llena', () => {
    const state = village(20);
    let inWood = -1;
    for (let week = 0; week < 48 && inWood < 0; week += 1) {
      tick(state, CATALOG);
      if (seasonOf(state.tick) !== 'winter') continue;
      inWood = 0;
      for (const cells of routesFor(state).values()) {
        const last = cells[cells.length - 1];
        if (last !== undefined && state.map.terrain[last] === TERRAIN_CODE.forest) inWood += 1;
      }
    }
    expect(inWood).toBeGreaterThan(0);
  });
});

describe('la gente no se apila · §11.9', () => {
  it('trabajan repartidos, no todos en la misma celda', () => {
    const state = workweek(village(20));
    const figures = crowdPositions(state, 0.35);
    let stacked = 0;
    for (const a of figures) {
      for (const b of figures) {
        if (a.id >= b.id) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < 0.3) stacked += 1;
      }
    }
    const pairs = (figures.length * (figures.length - 1)) / 2;
    expect(figures.length).toBeGreaterThan(8);
    expect(stacked / pairs, 'casi nadie debe estar encima de otro').toBeLessThan(0.06);
  });

  it('la tierra se reparte: no van todos al campo más cercano', () => {
    // Umbral medido, y con dos semillas porque una sola es ruido. Repartiendo
    // salen de 6 a 9 destinos distintos; dejando que cada uno vaya al más
    // cercano a su casa —y las casas están juntas— bajan a 4 o 5.
    for (const seed of [7, 3]) {
      const state = workweek(village(20, seed));
      const targets = new Set<number>();
      for (const cells of routesFor(state).values()) {
        const last = cells[cells.length - 1];
        if (last !== undefined) targets.add(last);
      }
      expect(targets.size, `semilla ${seed}`).toBeGreaterThan(5);
    }
  });
});

describe('los oficios se ven · §11.9', () => {
  const spotOf = (s: GameState, id: number): { x: number; y: number } | undefined =>
    crowdPositions(s, 0.35).find((f) => f.id === id);

  const centreOf = (s: GameState, kind: string): { x: number; y: number } | undefined => {
    const b = s.buildings.find((v) => v.kind === kind && v.lostTick === null);
    return b === undefined ? undefined : { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  };

  it('el herrero pasa el día en la fragua, no en el campo', () => {
    // El reparto de §5.2 cuenta brazos, no personas, así que el herrero era un
    // labrador más. Los ocho con nombre son los únicos que el jugador sigue.
    const state = workweek(village(25));
    const smith = state.people.villagers.find((v) => v.role === 'smith' && v.diedTick === null);
    const forge = centreOf(state, 'smithy');
    expect(smith, 'la aldea de 25 años debe tener herrero').toBeDefined();
    expect(forge, 'y fragua').toBeDefined();

    const at = spotOf(state, smith!.id);
    expect(at).toBeDefined();
    expect(Math.hypot(at!.x - forge!.x, at!.y - forge!.y)).toBeLessThan(4);
  });

  it('el alguacil, junto al granero', () => {
    const state = workweek(village(25));
    const reeve = state.people.villagers.find((v) => v.role === 'reeve' && v.diedTick === null);
    const granary = centreOf(state, 'granary');
    if (reeve === undefined || granary === undefined) return;
    const at = spotOf(state, reeve.id);
    expect(at).toBeDefined();
    expect(Math.hypot(at!.x - granary.x, at!.y - granary.y)).toBeLessThan(5);
  });

  it('y si la fragua se pierde, el herrero vuelve al campo', () => {
    // Sin taller no hay sitio propio: no se le deja plantado en un solar.
    const state = workweek(village(25));
    const smith = state.people.villagers.find((v) => v.role === 'smith' && v.diedTick === null);
    if (smith === undefined) return;
    const withForge = spotOf(state, smith.id);

    const razed = workweek(village(25));
    for (const b of razed.buildings) if (b.kind === 'smithy') b.lostTick = razed.tick - 100;
    const without = spotOf(razed, smith.id);

    expect(withForge).toBeDefined();
    expect(without).toBeDefined();
    expect(without).not.toEqual(withForge);
  });
});

describe('se habla en corro, no sólo de dos en dos · §11.9', () => {
  it('hay grupos de más de dos', () => {
    // Una plaza con dos parejas y nadie más parece un tablero.
    const state = workweek(village(20));
    const figures = crowdPositions(state, 0.3);
    let biggest = 0;
    for (const f of figures) {
      const near = figures.filter((o) => Math.hypot(o.x - f.x, o.y - f.y) < 1.1).length;
      biggest = Math.max(biggest, near);
    }
    expect(biggest, 'algún corro tiene que pasar de dos').toBeGreaterThan(2);
  });

  it('pero no se junta la aldea entera en un punto', () => {
    const state = workweek(village(20));
    const figures = crowdPositions(state, 0.3);
    for (const f of figures) {
      const near = figures.filter((o) => Math.hypot(o.x - f.x, o.y - f.y) < 1.1).length;
      expect(near, 'un corro no es una asamblea').toBeLessThanOrEqual(ENCOUNTER.MAX_KNOT + 1);
    }
  });
});

describe('los rencores se ven · §11.9, §6.4', () => {
  it('dos que se detestan trabajan más lejos que dos que se llevan bien', () => {
    // Un rencor de §6.4 dejaba de ser una fila en un registro sólo cuando el
    // catálogo lo usaba veinte años después. Ahora se ve todos los días.
    // Hacen falta dos que trabajen CERCA: apartarse sólo tiene sentido de
    // quien tienes al lado, y los dos primeros nombrados de la semilla 7
    // trabajan a siete celdas. La primera versión de esta prueba los cogía a
    // ciegas y daba exactamente el mismo número en los dos casos.
    const base = workweek(village(20));
    const figures = crowdPositions(base, 0.35);
    const namedIds = new Set(
      base.people.villagers.filter((v) => v.named && v.diedTick === null).map((v) => v.id),
    );
    let pair: [number, number] | null = null;
    for (const one of figures) {
      for (const two of figures) {
        if (one.id >= two.id) continue;
        if (!namedIds.has(one.id) || !namedIds.has(two.id)) continue;
        if (Math.hypot(one.x - two.x, one.y - two.y) < 3) pair = [one.id, two.id];
      }
    }
    expect(pair, 'la semilla debe tener dos nombrados trabajando cerca').not.toBeNull();

    const distanceBetween = (hate: boolean): number => {
      const state = workweek(village(20));
      const a = state.people.villagers.find((v) => v.id === pair![0])!;
      const b = state.people.villagers.find((v) => v.id === pair![1])!;
      a.opinions[b.id] = hate ? -90 : 60;
      b.opinions[a.id] = hate ? -90 : 60;

      const now = crowdPositions(state, 0.35);
      const one = now.find((f) => f.id === a.id);
      const two = now.find((f) => f.id === b.id);
      if (one === undefined || two === undefined) return -1;
      return Math.hypot(one.x - two.x, one.y - two.y);
    };

    const apart = distanceBetween(true);
    const together = distanceBetween(false);
    expect(apart).toBeGreaterThan(0);
    expect(together).toBeGreaterThan(0);
    expect(apart, 'los que se odian acaban más separados').toBeGreaterThan(together);
  });
});

describe('y sigue sin romper nada · §4.3, §10.6', () => {
  it('dibujar no escribe en el estado', () => {
    const state = workweek(village(20));
    const before = fingerprint(state);
    for (const f of [0, 0.1, 0.3, 0.5, 0.7]) crowdPositions(state, f);
    expect(fingerprint(state)).toBe(before);
  });

  it('dibujar no consume una sola tirada', () => {
    const state = workweek(village(20));
    const before = { ...state.rng };
    for (const f of [0, 0.2, 0.4, 0.6]) crowdPositions(state, f);
    expect(state.rng).toEqual(before);
  });

  it('el mismo instante da la misma foto', () => {
    const a = workweek(village(20));
    const b = structuredClone(a);
    expect(crowdPositions(a, 0.33)).toEqual(crowdPositions(b, 0.33));
  });

  it('de noche no hay nadie fuera', () => {
    const state = workweek(village(20));
    expect(crowdPositions(state, 0.85)).toEqual([]);
  });
});
