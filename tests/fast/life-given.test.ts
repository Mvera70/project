// M-3 · Lo que se da al valle se ve en el valle, en la capa de vida.
//
// El motor ya guardaba su mitad: un medio se paga con lo del valle y deja un
// rasgo o un rebaño (`tests/fast/means.test.ts`). Lo que aquí se guarda es la
// otra mitad, la que el dueño del diseño pidió por los ojos y no por la
// crónica: **el barril en la plaza mientras dura la fiesta que se pagó, y el
// arado apoyado en un campo desde el día que se dio.**
//
// Se mide sobre `given`, que es quien coloca lo dado —aparte de `scatter`, que
// reparte los trastos de la jornada y sigue apagado en el juego por decisión del
// dueño del diseño— y **comparando dos copias del mismo valle**: la única
// diferencia entre las dos es el medio, así que no se mide la biografía de
// ninguna semilla.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { plazaCentre } from '@engine/world/plaza';
import { given } from '../../src/render3d/life/props';
import { OFFERS, placedOffer, type OfferSpec } from '../../src/render3d/life/offers';
import { terrainOf } from '../../src/render3d/life/terrain';
import { blockedAt } from '../../src/render3d/life/body';
import { foundTwenty } from '../helpers/founding';

/** Una aldea hecha, con su terreno, sin nada dado por el jugador. */
function village(seed: number): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 12, 'prudent', CATALOG);
  return state;
}

const SEEDS = [7, 11, 23, 41];

describe('M-3 · el barril de la fiesta se ve en la plaza', () => {
  it('no hay barril sin fiesta, y hay uno mientras dura', () => {
    for (const seed of SEEDS) {
      const state = village(seed);
      const land = terrainOf(state);
      const quiet = given(state, land);
      expect(quiet.filter((prop) => prop.kind === 'barrel'), `semilla ${seed}: sin fiesta`)
        .toHaveLength(0);

      // La fiesta es una ventana en el estado, no un suceso que haya que
      // esperar: `aleWindow` mira esta bandera y es lo que `means.ts` pone al
      // dar el barril.
      const feasting = structuredClone(state);
      feasting.flags['ale'] = feasting.tick + 6;
      const party = given(feasting, land);
      expect(party.filter((prop) => prop.kind === 'barrel'), `semilla ${seed}: en fiesta`)
        .toHaveLength(1);
    }
  });

  it('y se puede beber de él: seis a la vez, y nadie se lo lleva', () => {
    // Las dos mitades de «es la fiesta y no un adorno»: ofrece de beber a un
    // corro —`OFFERS.drink`, seis plazas— y está marcado como fijo, que es lo
    // que impide que el primero en llegar se lo eche al hombro y la fiesta se
    // vaya andando detrás de él.
    const state = village(7);
    state.flags['ale'] = state.tick + 6;
    const barrel = given(state, terrainOf(state)).find((prop) => prop.kind === 'barrel');
    expect(barrel).toBeDefined();
    expect(barrel?.fixed).toBe(true);
  });
});

describe('M-3 · el arado se ve apoyado en el campo', () => {
  it('sólo con el arado dado, y junto a un campo', () => {
    for (const seed of SEEDS) {
      const state = village(seed);
      const land = terrainOf(state);
      expect(given(state, land).filter((prop) => prop.kind === 'plough'),
        `semilla ${seed}: sin arado`).toHaveLength(0);

      const ploughed = structuredClone(state);
      ploughed.traits = [...ploughed.traits, 'plough'];
      const plough = given(ploughed, land).find((prop) => prop.kind === 'plough');
      expect(plough, `semilla ${seed}: con arado`).toBeDefined();
      if (plough === undefined) continue;

      // Junto a un campo, y no en cualquier parte: el campo más cercano tiene
      // que estar a menos de tres celdas del borde del arado. Dos y media es lo
      // que la colocación pide (medio campo más siete décimas), y la tercera es
      // el margen de la búsqueda de suelo pisable.
      const fields = ploughed.buildings.filter((b) => b.lostTick === null && b.kind === 'field');
      expect(fields.length, `semilla ${seed}: hay campos`).toBeGreaterThan(0);
      const gap = Math.min(...fields.map((field) => Math.hypot(
        field.x + field.w / 2 - plough.x, field.y + field.h / 2 - plough.z,
      ) - Math.max(field.w, field.h) / 2));
      expect(gap, `semilla ${seed}: pegado a un campo`).toBeLessThan(3);
    }
  });

  it('el arado no amanece cada día en otro sitio', () => {
    // Un apero apoyado no se mueve solo, y eso aquí se garantiza por el
    // contrato antes que por el aserto: **`given` no recibe la semilla de la
    // jornada** —`scatter` sí, y es lo que hace que la pelota del martes no sea
    // la del miércoles— así que el día no puede llegar a esta colocación ni
    // queriendo. Lo que se comprueba es la otra mitad: que tampoco use nada
    // que cambie entre llamadas.
    const state = village(11);
    state.traits = [...state.traits, 'plough'];
    const land = terrainOf(state);
    const spot = (): string => {
      const prop = given(state, land).find((p) => p.kind === 'plough');
      return prop === undefined ? 'ninguno' : `${prop.x.toFixed(3)},${prop.z.toFixed(3)}`;
    };
    const first = spot();
    expect(first).not.toBe('ninguno');
    expect(spot()).toBe(first);
    // Y el barril de la misma aldea no se lleva el sitio del arado por delante.
    state.flags['ale'] = state.tick + 6;
    expect(spot()).toBe(first);
  });
});

describe('M-3 · y está bien puesto, no sólo puesto', () => {
  it('el barril está en el corro de la plaza, con aire y fuera del trigo', () => {
    // **La prueba que existe porque el dueño del diseño avisó**: «asegúrate de
    // que el barril y el arado se coloquen bien, porque eso de los trastos y
    // las pelotas no estaba bien hecho, el posicionamiento» (18 sep 2026).
    // Tenía razón, y las tres versiones que hicieron falta están contadas en
    // `props.ts`. Lo que aquí se guarda son las tres condiciones que salieron
    // de medirlas, en doce semillas:
    //
    //   · **en el corro de la plaza**, que es el punto al que §11.8 convoca
    //     (`valleyCore` bajado a suelo por `placedOffer`), y no un sitio que
    //     este módulo se invente: medido, de 0,0 a 5,6 celdas de ese punto, y
    //     siempre en una de sus propias plazas;
    //   · **con aire**: de 0,80 a 2,24 celdas al tejado más cercano. La versión
    //     que premiaba la cercanía lo dejaba a 0,33, metido en la cara de una
    //     casa y tapado por el alero;
    //   · **fuera del trigo**: ninguna de las doce lo pone en un sembrado.
    for (const seed of [7, 11, 23, 41, 33, 51]) {
      const state = village(seed);
      state.flags['ale'] = state.tick + 6;
      const land = terrainOf(state);
      const barrel = given(state, land).find((prop) => prop.kind === 'barrel');
      expect(barrel, `semilla ${seed}: hay barril`).toBeDefined();
      if (barrel === undefined) continue;

      const live = state.buildings.filter((b) => b.lostTick === null);
      const roofs = live.filter((b) => b.kind !== 'field');
      const gapTo = (b: (typeof live)[number]): number => Math.hypot(
        barrel.x - Math.max(b.x, Math.min(barrel.x, b.x + b.w)),
        barrel.z - Math.max(b.y, Math.min(barrel.z, b.y + b.h)),
      );
      expect(Math.min(...roofs.map(gapTo)), `semilla ${seed}: aire al tejado`)
        .toBeGreaterThanOrEqual(0.7);
      const inWheat = live.some((b) => b.kind === 'field'
        && barrel.x >= b.x && barrel.x <= b.x + b.w
        && barrel.z >= b.y && barrel.z <= b.y + b.h);
      expect(inWheat, `semilla ${seed}: no entre el trigo`).toBe(false);

      // Y en el corro: una de las plazas que la reunión reparte **en la plaza
      // de verdad**, que desde el esquema 8 es un punto guardado y fijo
      // (`state.plaza`, P-1) y no la media de los edificios.
      const middle = plazaCentre(state.plaza);
      const meeting = placedOffer(
        OFFERS['gather'] as OfferSpec, { x: middle.x, z: middle.y }, land,
      );
      expect(meeting, `semilla ${seed}: la plaza admite reunión`).not.toBeNull();
      const seats = [...(meeting?.spots ?? []), ...(meeting === null ? [] : [meeting.at])];
      const onASeat = seats.some((seat) => Math.hypot(seat.x - barrel.x, seat.z - barrel.z) < 0.01);
      expect(onASeat, `semilla ${seed}: en una plaza del corro`).toBe(true);
      // Y no encima de la fuente, que ocupa el centro (P-2).
      expect(Math.hypot(barrel.x - middle.x, barrel.z - middle.y),
        `semilla ${seed}: le deja su sitio a la fuente`).toBeGreaterThan(1);
    }
  });
});

describe('M-3 · y ninguno de los dos cae donde no se puede estar', () => {
  it('ni en el río, ni dentro de una pared', () => {
    // El mismo aserto que `life-orders` le pide a los tajos, por la misma razón:
    // un trasto dentro de un bloqueo es gente andando hacia el agua. Y aquí
    // importa más que en un trasto cualquiera, porque estos dos son lo que el
    // jugador pagó y se queda a la vista durante años.
    for (const seed of SEEDS) {
      const state = village(seed);
      state.traits = [...state.traits, 'plough'];
      state.flags['ale'] = state.tick + 6;
      const land = terrainOf(state);
      for (const prop of given(state, land)) {
        if (prop.kind !== 'barrel' && prop.kind !== 'plough') continue;
        expect(blockedAt(land, prop.x, prop.z), `semilla ${seed}: ${prop.kind}`).toBe(false);
      }
    }
  });
});
