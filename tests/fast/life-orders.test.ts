// E2 · El valle obedece, y se ve. docs/plan-juego.md, Anexo E.4.
//
// La queja era «no hay respuesta visual», y al buscarla salió que faltaba la
// mitad del mundo: `placesOf` saca los sitios de los **edificios**, y de los
// tres destinos que el jugador manda sólo uno es un edificio. Los campos sí;
// **talar y construir no tenían sitio ninguno en el valle**, así que los
// leñadores y los albañiles eran una cifra de la hoja de cálculo y en pantalla
// no había nadie haciéndolo.
//
// Lo que se prueba aquí es la traducción: manos → plazas. Que la gente elija esa
// plaza y se vaya andando ya lo prueban `life-decide` y `life-places`; que se
// vea, lo prueba una captura.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState, Intent } from '@engine/state';
import { allocateLabour } from '@engine/subsistence/labour';
import { placesOf } from '../../src/render3d/life/offers';
import { terrainOf } from '../../src/render3d/life/terrain';
import { fellingTarget, fellForestWithLocation } from '../../src/engine/world/forest';

function village(years: number, seed = 7, intent?: Intent): GameState {
  const state = foundTwenty(seed);
  if (intent !== undefined) state.intent = { ...intent };
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

function seatsAt(state: GameState, prefix: string): number {
  const land = terrainOf(state);
  return placesOf(state, land)
    .filter((place) => place.id === prefix || place.id.startsWith(`${prefix}:`))
    .flatMap((place) => place.offers)
    .reduce((total, offer) => total + offer.seats, 0);
}

describe('E2 · la orden del jugador tiene sitio donde verse', () => {
  it('el tajo visible es el mismo árbol del que el motor obtiene la madera', () => {
    const state = village(12, 7, { fields: 1, timber: 0.85, priority: 'none' });
    const target = fellingTarget(state);
    expect(target).not.toBeNull();
    expect(placesOf(state, terrainOf(state)).some(place => place.id === `felling:${target}`)).toBe(true);
    const clone = structuredClone(state);
    expect(fellForestWithLocation(clone, 1).firstCell).toBe(target);
  });

  it('mandar las manos al bosque abre un tajo en el bosque', () => {
    // Y mandarlas a la obra lo cierra. Es la respuesta visual más directa que
    // tiene el juego: la misma aldea, la misma semana, y gente en otro sitio.
    for (const seed of [7, 11, 23]) {
      const wood = village(12, seed, { fields: 1, timber: 0.85, priority: 'none' });
      const works = village(12, seed, { fields: 1, timber: 0.1, priority: 'none' });
      expect(seatsAt(wood, 'felling'), `semilla ${seed}: plazas en el tajo`)
        .toBeGreaterThan(seatsAt(works, 'felling'));
      expect(seatsAt(wood, 'felling'), `semilla ${seed}: y hay tajo`).toBeGreaterThan(0);
    }
  });

  it('y mandarlas a la obra pone gente en el andamio', () => {
    for (const seed of [7, 11, 23]) {
      const works = village(12, seed, { fields: 1, timber: 0.1, priority: 'none' });
      const wood = village(12, seed, { fields: 1, timber: 0.85, priority: 'none' });
      // Sólo si hay algo levantándose: una aldea sin obra en marcha no tiene
      // andamio, y eso no es un fallo.
      if (works.works.length === 0) continue;
      expect(seatsAt(works, 'works'), `semilla ${seed}`)
        .toBeGreaterThanOrEqual(seatsAt(wood, 'works'));
    }
  });

  it('las plazas del tajo son las manos que el jugador manda, no un número fijo', () => {
    // La propiedad que hace que esto sea una respuesta y no una decoración: si
    // las plazas fueran fijas, el tajo se vería igual con cualquier orden.
    const state = village(15, 7, { fields: 1, timber: 0.85, priority: 'none' });
    const hands = allocateLabour(state);
    const seats = seatsAt(state, 'felling');
    expect(seats).toBeGreaterThan(0);
    // Techo y no redondeo: si hay 1,27 de semana-persona en el bosque, van dos
    // personas parte de la semana, y lo que se ve son dos. Ver `offers.ts`.
    expect(seats).toBeLessThanOrEqual(Math.ceil(hands.cutters));
  });

  it('un tajo no cae donde no se puede estar', () => {
    // `seatsOn` reparte las plazas en corro y `placedOffer` las comprueba contra
    // el suelo, pero el **punto** del tajo lo elige este módulo: un tajo dentro
    // del río o de una pared sería gente andando hacia el agua. Es el mismo
    // fallo que V-06 pagó con la aldea clavada, así que se comprueba.
    for (const seed of [7, 11, 23, 41]) {
      const state = village(18, seed, { fields: 1, timber: 0.85, priority: 'none' });
      const land = terrainOf(state);
      for (const place of placesOf(state, land)) {
        const x = Math.floor(place.at.x);
        const z = Math.floor(place.at.z);
        expect(land.blocked[z * land.width + x], `semilla ${seed}: ${place.id}`)
          .not.toBe(1);
      }
    }
  });

  it('y el valle sigue teniendo dónde beber, rezar y sentarse', () => {
    // Los tajos se **añaden**: si al meterlos hubieran desplazado a las ofertas
    // de siempre, la aldea trabajaría y no viviría, que es justo lo contrario de
    // lo que el Anexo E existe para conseguir.
    const state = village(20, 7);
    const land = terrainOf(state);
    const kinds = new Set(placesOf(state, land).flatMap((p) => p.offers.map((o) => o.id)));
    for (const needed of ['drink', 'sit', 'work']) {
      expect(kinds, `sigue habiendo ${needed}`).toContain(needed);
    }
  });
});
