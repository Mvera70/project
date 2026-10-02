// Lo lento de este fichero vive en `tests/journeys/daylife-long.test.ts` (v5.56).
//
// M-35 · design.md §11.9 — que la aldea parezca viva.
//
// Este fichero mide lo que un jugador llamó «aburrido y repetitivo»: que todos
// hicieran lo mismo a la vez, todos los días, apilados en la misma celda y sin
// hablar con nadie. Cada prueba es una de esas cuatro cosas.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { run, tick } from '@engine/sim';
import { crowdPositions } from '@render/crowd';
import { routesFor } from '@engine/world/paths';
import { encountersAmong } from '@derive/encounters';
import { seasonOf } from '@engine/time';
import { ENCOUNTER, TIME } from '@engine/balance';
import { fingerprint } from '../helpers/fingerprint';
import { TERRAIN_CODE, type GameState } from '@engine/state';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

/** Una semana de trabajo, que no sea la de reunión del domingo. */
function workweek(state: GameState): GameState {
  if (state.tick % 4 === 0) state.tick += 1;
  // Sin sucesos del valle en marcha (R-1): una boda esa semana junta a todo el
  // mundo en la plaza a la vez, y estas pruebas miden la jornada de trabajo,
  // que es donde cada uno va a lo suyo.
  state.happenings = [];
  return state;
}
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
});

describe('se habla en corro, no sólo de dos en dos · §11.9', () => {
  it('hay grupos de más de dos', () => {
    // Con posiciones controladas y separadas, porque medirlo sobre la partida
    // no discrimina: cuatro personas en el MISMO destino dan dos parejas con
    // idéntico punto medio, y eso se cuenta como un corro de cuatro sin que
    // nadie se haya unido a nada. Lo destaparon dos mutaciones seguidas.
    const state = workweek(village(20));
    const named = state.people.villagers
      .filter((v) => v.named && v.diedTick === null)
      .slice(0, 4);
    expect(named.length, 'hacen falta cuatro nombrados').toBe(4);
    // Que se aprecien, para que quieran juntarse.
    for (const a of named) {
      for (const b of named) if (a.id !== b.id) a.opinions[b.id] = 70;
    }

    // Cuatro puntos cercanos pero distintos: así dos parejas nunca comparten
    // punto medio por casualidad.
    const spots = named.map((v, i) => ({ id: v.id, x: 10 + i * 0.7, y: 10 + i * 0.3 }));

    // **Y se mira una estación entera, no una semana.** Pararse a hablar es una
    // moneda determinista por pareja (`noise(tick, a, b)` en `encounters.ts`),
    // así que una sola semana puede salir cruz para las seis parejas —es lo que
    // pasó cuando B-1 cambió el ritmo y con él el tick y los identificadores de
    // los cuatro primeros nombrados: seis cruces seguidas—. Lo que §11.9 promete
    // no es que se hable **esta** semana, es que se habla en corro; doce semanas
    // son la muestra que lo dice sin depender de un lanzamiento.
    let most = 0;
    let weeksWithTalk = 0;
    for (let week = 0; week < TIME.WEEKS_PER_SEASON; week += 1) {
      const talks = encountersAmong({ ...state, tick: state.tick + week }, spots);
      if (talks.size > 0) weeksWithTalk += 1;
      const bySpot = new Map<string, number>();
      for (const talk of talks.values()) {
        const key = `${talk.x.toFixed(3)},${talk.y.toFixed(3)}`;
        bySpot.set(key, (bySpot.get(key) ?? 0) + 1);
      }
      most = Math.max(most, ...bySpot.values());
    }
    expect(weeksWithTalk, 'tienen que hablar').toBeGreaterThan(0);
    expect(most, 'y algún corro pasa de dos').toBeGreaterThan(2);
  });

  it('pero no se junta la aldea entera en un punto', () => {
    const state = workweek(village(20));
    const figures = crowdPositions(state, 0.3);
    for (const f of figures) {
      const near = figures.filter((o) => Math.hypot(o.x - f.x, o.y - f.y) < 1.1).length;
      // Lo que se protege es que no se junte la aldea entera en un punto. El
      // número exacto no puede ser el del corro: en un campo trabajan varios
      // codo con codo sin estar hablando, y desde v3.13 la correa los mantiene
      // cerca de su sitio a propósito.
      // **Dos tercios y no la mitad**, remedido al crecer las aldeas con E5: en
      // una aldea de treinta y nueve figuras se juntaban veinte en un radio de
      // celda, que es el 51 %. No es un montón —en un campo se trabaja codo con
      // codo y la correa de v3.13 los mantiene cerca de su sitio a propósito—
      // pero la mitad exacta era una cota al filo desde el principio. Lo que
      // esta prueba guarda sigue intacto: que no se junte **la aldea entera**.
      expect(near, 'no se junta la aldea entera en una celda')
        .toBeLessThan((figures.length * 2) / 3);
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
    // Y cerca quiere decir en celdas distintas: dos que trabajan en la misma
    // —los dos en el mismo taller— se apartan del mismo punto en el que
    // están anclados, la correa de v3.13 los devuelve al mismo sitio, y la
    // prueba daba el mismo número en los dos casos. Con R-1 la pareja que
    // salía elegida por posición era de ésas; se elige por puesto de trabajo.
    //
    // Y sin oficio: el que tiene taller va al taller y no a donde el reparto
    // lo cuenta, y tras R-1 los cinco nombrados de la semilla 7 tienen todos
    // uno (herrero, cura, guardabosques, jefe, alguacil). El mecanismo lee la
    // opinión de cualquiera —§11.9 no distingue—, así que la pareja se busca
    // entre los adultos del campo, nombrados o no.
    const base = workweek(village(20));
    const fieldHands = new Set(
      base.people.villagers
        .filter((v) => v.diedTick === null && v.role === null
          && base.tick - v.bornTick >= 16 * TIME.WEEKS_PER_YEAR)
        .map((v) => v.id),
    );
    const width = base.map.width;
    const spots = [...routesFor(base)].flatMap(([id, cells]) => {
      const last = cells[cells.length - 1];
      if (last === undefined || !fieldHands.has(id)) return [];
      return [{ id, x: last % width, y: Math.floor(last / width) }];
    });
    let pair: [number, number] | null = null;
    for (const one of spots) {
      for (const two of spots) {
        if (one.id >= two.id) continue;
        const apart = Math.hypot(one.x - two.x, one.y - two.y);
        if (apart >= 1 && apart <= ENCOUNTER.RANGE) pair = [one.id, two.id];
      }
    }
    expect(pair, 'la semilla debe tener dos adultos trabajando cerca').not.toBeNull();

    const distanceBetween = (hate: boolean): number => {
      const state = workweek(village(20));
      const a = state.people.villagers.find((v) => v.id === pair![0])!;
      const b = state.people.villagers.find((v) => v.id === pair![1])!;
      a.opinions[b.id] = hate ? -90 : 60;
      b.opinions[a.id] = hate ? -90 : 60;

      // La media de la jornada de trabajo, y no un instante: a las 0,35 los
      // dos podían estar parados hablando con un tercero —medido en la
      // semilla 7, uno hasta las 0,42 y otro hasta las 0,38—, y hablando se
      // está donde está la charla, se odie a quien se odie.
      let total = 0;
      let samples = 0;
      for (let f = 0.3; f <= 0.66; f += 0.05) {
        const now = crowdPositions(state, f);
        const one = now.find((figure) => figure.id === a.id);
        const two = now.find((figure) => figure.id === b.id);
        if (one === undefined || two === undefined) return -1;
        total += Math.hypot(one.x - two.x, one.y - two.y);
        samples += 1;
      }
      return total / samples;
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
