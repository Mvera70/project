// E2 · El valle obedece, y se ve. docs/historico/plan-juego.md, Anexo E.4.
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
//
// **Y desde el juego de los medios (M-2) el jugador ya no manda manos a ningún
// sitio.** Las tres palancas de órdenes se retiraron por decisión del dueño del
// diseño —«sí se retiran, no me gustan para nada», 17 sep 2026— así que la
// postura `intent.timber` no mueve nada y los dos casos que la usaban medían un
// verbo que no existe: con 0,85 y con 0,1 salía **una plaza en el tajo y una
// plaza en el tajo**. Lo que decide ahora cuánta gente hay en el bosque es la
// **necesidad** de leña (§7.13), y eso es lo que se mide aquí. La traducción
// —manos a plazas, y el tajo donde de verdad se tala— no ha cambiado: es la
// razón de este fichero y sigue en pie.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { allocateLabour } from '@engine/subsistence/labour';
import { placesOf } from '../../src/render3d/life/offers';
import { terrainOf } from '../../src/render3d/life/terrain';
import { fellingTarget, fellForestWithLocation } from '../../src/engine/world/forest';

// Sin postura: `intent` ya no lo escribe nadie y no mueve nada (M-2). Pasarlo
// aquí haría creer que este fichero mide una orden del jugador.
function village(years: number, seed = 7): GameState {
  const state = foundTwenty(seed);
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
    const state = village(12, 7);
    const target = fellingTarget(state);
    expect(target).not.toBeNull();
    expect(placesOf(state, terrainOf(state)).some(place => place.id === `felling:${target}`)).toBe(true);
    const clone = structuredClone(state);
    expect(fellForestWithLocation(clone, 1).firstCell).toBe(target);
  });

  it('una leñera vacía abre un tajo en el bosque, y una llena lo cierra', () => {
    // Es la respuesta visual más directa que le queda al juego: la misma aldea,
    // la misma semana, y gente en otro sitio porque la aldea necesita otra cosa.
    // **Se comparan dos copias del mismo valle** y la única diferencia es lo que
    // hay en la leñera, así que no se mide la biografía de ninguna semilla.
    //
    // Medido a los doce años, cuatro semillas (17 sep 2026), leñadores con la
    // leñera a cero contra la leñera a 4 000:
    //
    //   semilla  7 → 0,81 contra 0,13    ·   semilla 11 → 3,00 contra 0,50
    //   semilla 23 → 1,80 contra 0,30    ·   semilla 41 → 1,80 contra 0,30
    //
    // En plazas eso son 3 contra 1, y 2 contra 1, **salvo en la semilla 7**: su
    // necesidad y su holgura caben las dos por debajo de una persona, y una
    // persona entera es la plaza más pequeña que se puede ver. Así que lo
    // estricto se le pide a las manos —que es donde vive la regla— y a las
    // plazas se les pide no contradecirla.
    for (const seed of [7, 11, 23, 41]) {
      const base = village(12, seed);
      const bare = structuredClone(base);
      bare.village.wood = 0;
      const full = structuredClone(base);
      full.village.wood = 4_000;
      expect(allocateLabour(bare).cutters, `semilla ${seed}: manos en el bosque`)
        .toBeGreaterThan(allocateLabour(full).cutters);
      expect(seatsAt(bare, 'felling'), `semilla ${seed}: plazas en el tajo`)
        .toBeGreaterThanOrEqual(seatsAt(full, 'felling'));
      expect(seatsAt(bare, 'felling'), `semilla ${seed}: y hay tajo`).toBeGreaterThan(0);
    }
  });

  it('y la leña que ya está cortada pone gente en el andamio', () => {
    // La otra cara de lo mismo: lo que no hace falta traer del bosque se queda
    // en la obra. Medido en las mismas cuatro semillas, plazas en el andamio con
    // la leñera vacía contra llena: 1 y 2, 2 y 5, 0 y 0, 2 y 3.
    for (const seed of [7, 11, 23, 41]) {
      const base = village(12, seed);
      const bare = structuredClone(base);
      bare.village.wood = 0;
      const full = structuredClone(base);
      full.village.wood = 4_000;
      // Sólo si hay algo levantándose: una aldea sin obra en marcha no tiene
      // andamio, y eso no es un fallo —la semilla 23 es ese caso—.
      if (full.works.length === 0) continue;
      expect(seatsAt(full, 'works'), `semilla ${seed}`)
        .toBeGreaterThanOrEqual(seatsAt(bare, 'works'));
    }
  });

  it('las plazas del tajo son las manos que la aldea manda, no un número fijo', () => {
    // La propiedad que hace que esto sea una respuesta y no una decoración: si
    // las plazas fueran fijas, el tajo se vería igual con cualquier semana.
    const state = village(15, 7);
    state.village.wood = 0;
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
      const state = village(18, seed);
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
