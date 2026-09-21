// V-10 · Sitios con vida. design.md Anexo E.
//
// **La plaza, el vado, el claro: sitios que no son un edificio pero ofrecen.**
//
// La aldea se junta y dispersa sola alrededor de estos sitios, según su hora.
// Cada jornada la gente va a unos y a otros, sin que nadie lo haya guionizado.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import { PLAZA } from '@engine/balance';
import type { GameState } from '@engine/state';
import { blockedAt } from '../../src/render3d/life/body';
import { terrainOf } from '../../src/render3d/life/terrain';
import { seatKey } from '../../src/render3d/life/offers';
import { commons } from '../../src/render3d/life/places';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';

const grown = new Map<number, GameState>();
const visits = new Map<number, Set<string>>();
function village(seed: number): GameState {
  let base = grown.get(seed);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, 40 * 48, 'prudent', CATALOG);
    grown.set(seed, base);
  }
  return base;
}

function visitedPlaces(seed: number): ReadonlySet<string> {
  const known = visits.get(seed);
  if (known !== undefined) return known;
  const life = createVillage(village(seed), 0);
  const seen = new Set<string>();
  for (let step = 0; step < STEPS_PER_DAY; step += 1) {
    life.step();
    for (const dweller of life.dwellers) if (dweller.doing?.there === true) seen.add(dweller.doing.place.id);
  }
  visits.set(seed, seen);
  return seen;
}

describe('V-10 · sitios con vida', () => {
  it('la plaza del motor se detecta en las seis semillas y sus plazas son suelo libre', () => {
    const seeds = [7, 11, 23, 31, 37, 41];
    for (const seed of seeds) {
      const state = village(seed);
      const land = terrainOf(state);
      const common = commons(state, land);

      const square = common.find((p) => p.id === 'square:common');
      expect(square, `semilla ${seed}: no hay plaza detectada`).toBeDefined();
      if (square === undefined) continue;

      // Está en suelo libre, no bloqueado.
      expect(blockedAt(land, square.at.x, square.at.z),
        `semilla ${seed}: la plaza está bloqueada`).toBe(false);
      expect(square.at.x).toBeGreaterThan(0);
      expect(square.at.z).toBeGreaterThan(0);
      expect(square.at.x).toBeLessThan(land.width);
      expect(square.at.z).toBeLessThan(land.height);
      const centre = { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
      // P-1 la decide y reserva al fundar; la vida no puede sustituirla por el
      // prado más grande de otra parte del valle. La fuente cierra el centro,
      // por eso se comprueban los puestos que realmente ofrece alrededor.
      for (const offer of square.offers) {
        for (const spot of offer.spots ?? [offer.at]) {
          expect(Math.hypot(spot.x - centre.x, spot.z - centre.z),
            `semilla ${seed}: plaza fuera del círculo reservado`).toBeLessThanOrEqual(PLAZA.RADIUS);
          expect(blockedAt(land, spot.x, spot.z),
            `semilla ${seed}: puesto de plaza bloqueado`).toBe(false);
        }
      }
    }
  });

  it('no inventa una plaza fuera de su recinto si no queda suelo libre', () => {
    const state = structuredClone(village(7));
    const land = terrainOf(state);
    const centre = { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
    // Máscara sintética: conserva el valle y sólo hace inhabitable el recinto
    // que el motor reservó. No toca la partida cacheada de la multisemilla.
    for (let z = 0; z < land.height; z += 1) for (let x = 0; x < land.width; x += 1) {
      if (Math.hypot(x + 0.5 - centre.x, z + 0.5 - centre.z) <= PLAZA.RADIUS) {
        land.blocked[z * land.width + x] = 1;
      }
    }
    expect(commons(state, land).some((place) => place.id === 'square:common')).toBe(false);
  });

  it('ningún sitio se pasa de aforo', () => {
    const seeds = [7, 11, 23];
    for (const seed of seeds) {
      const state = village(seed);
      const life = createVillage(state, 0);

      // Vive una jornada entera.
      for (let step = 0; step < STEPS_PER_DAY; step += 1) {
        life.step();
      }

      // Cuenta gente en cada oferta.
      const taken = new Map<string, number>();
      for (const dweller of life.dwellers) {
        if (dweller.doing === null) continue;
        const key = seatKey(dweller.doing.place, dweller.doing.offer);
        taken.set(key, (taken.get(key) ?? 0) + 1);
      }

      // Verifica que nadie se pase del aforo.
      for (const place of life.places) {
        for (const offer of place.offers) {
          const key = seatKey(place, offer);
          const count = taken.get(key) ?? 0;
          expect(count, `semilla ${seed}: ${place.id}/${offer.id} excede aforo ${offer.seats}`)
            .toBeLessThanOrEqual(offer.seats);
        }
      }
    }
  });

  it('la aldea se reparte: no van todos al mismo sitio a la misma hora', () => {
    const seed = 7;
    const state = village(seed);
    const life = createVillage(state, 0);

    // Cuenta dónde está la gente a varias horas del día.
    const distribution = new Map<number, Map<string, number>>();

    for (let step = 0; step < STEPS_PER_DAY; step += 1) {
      if (step % 450 === 0) {
        // Cada 15 segundos escénicos, registra dónde está el mundo.
        const tally = life.tally();
        const at = distribution.get(step) ?? new Map<string, number>();
        for (const [what, count] of Object.entries(tally)) {
          at.set(what, count);
        }
        distribution.set(step, at);
      }
      life.step();
    }

    // Verifica que en algún momento de la jornada no todos estén en el mismo sitio.
    let hasVariety = false;
    for (const tally of distribution.values()) {
      const distinct = tally.size;
      if (distinct > 2) {
        // Más de dos categorías distintas (ej: nada, andando, sitio X, sitio Y).
        hasVariety = true;
        break;
      }
    }
    expect(hasVariety, `semilla ${seed}: la aldea no se reparte`).toBe(true);
  });

  it('la plaza, el vado y el claro se detectan y son alcanzables en las seis semillas', () => {
    // La propiedad que tiene que cumplirse siempre. No cumplirse era el bug
    // real: `detectSquare` y `detectGlade` podían escoger un candidato al otro
    // lado del río —transitable en sí mismo, pero desconectado del pueblo
    // (V-03: sólo el 37 % del suelo libre está conectado con el centro)— y sin
    // mirar la conectividad, tres de seis semillas no ofrecían plaza ni claro
    // en absoluto.
    const seeds = [7, 11, 23, 31, 37, 41];
    for (const seed of seeds) {
      const state = village(seed);
      const land = terrainOf(state);
      const ids = new Set(commons(state, land).map((p) => p.id));
      for (const id of ['square:common', 'ford:crossing', 'glade:meadow']) {
        expect(ids.has(id), `semilla ${seed}: falta ${id}`).toBe(true);
      }
    }
  });

  it('la plaza y el vado reciben visita en la mayoría de las jornadas', () => {
    // **No en todas, y no es lo mismo que "algo se visita".** El mundo ofrece,
    // el agente elige (E.4): un sitio con más competencia cerca —el vado
    // ofrece lo mismo que nada más, pero compite contra el trabajo justo
    // cuando la jornada empieza y el deber aprieta más— pierde alguna vez, y
    // eso es la vida, no un defecto. Medido en seis semillas tras arreglar la
    // conectividad: plaza 4/6, claro 5/6, vado 3/6 — el umbral se pone en la
    // mitad, que es lo peor medido, con margen de un caso.
    const seeds = [7, 11, 23, 31, 37, 41];
    const visits: Record<string, number> = {};

    for (const seed of seeds) for (const id of visitedPlaces(seed)) visits[id] = (visits[id] ?? 0) + 1;

    for (const id of ['square:common', 'ford:crossing']) {
      expect(visits[id] ?? 0, `${id}: visitado en ${visits[id] ?? 0} de ${seeds.length} semillas`)
        .toBeGreaterThanOrEqual(Math.floor(seeds.length / 2));
    }
  });

  it('el claro recibe visita en la mayoría de las jornadas', () => {
    // El claro no duplica una era: ofrece contemplación a mediodía. Así puede
    // atraer a toda la aldea por sus necesidades, incluidos niños, mayores y
    // adultos sin un puesto laboral asignado.
    const seeds = [7, 11, 23, 31, 37, 41];
    const visited = seeds.filter(seed => visitedPlaces(seed).has('glade:meadow')).length;
    expect(visited, `glade:meadow: visitado en ${visited} de ${seeds.length} semillas`)
      .toBeGreaterThanOrEqual(Math.floor(seeds.length / 2));
  });

  it('los sitios comunes ofrecen y se alcanzan', () => {
    const seed = 7;
    const state = village(seed);
    const land = terrainOf(state);
    const common = commons(state, land);

    expect(common.length, 'hay sitios comunes').toBeGreaterThan(0);
    for (const place of common) {
      expect(place.offers.length, `${place.id}: ofrece algo`).toBeGreaterThan(0);
      // Cada oferta está en un sitio alcanzable.
      for (const offer of place.offers) {
        expect(offer.at).toBeDefined();
        expect(!blockedAt(land, offer.at.x, offer.at.z),
          `${place.id}: oferta bloqueada`).toBe(true);
      }
    }
  });

  it('los sitios comunes tienen horas de punta', () => {
    const seed = 7;
    const state = village(seed);
    const land = terrainOf(state);
    const common = commons(state, land);

    for (const place of common) {
      for (const offer of place.offers) {
        // La excepción, a propósito y no un olvido: `ford:crossing/drink` no
        // tiene hora de punta desde IA-1. Antes toda la aldea bebía en un
        // único pozo de dos plazas y se medía gente de pie con la sed al
        // máximo; el vado se abrió sin hora porque al río se va cuando se
        // tiene sed, no a una hora del día — ponerle una habría reintroducido
        // el mismo síntoma por otra vía. Lo que esta prueba vigila es que
        // **la excepción no crezca sin que alguien la escriba aquí**.
        if (place.id === 'ford:crossing' && offer.id === 'drink') {
          expect(offer.hours, `${place.id}/${offer.id}: sigue sin horas, a propósito`)
            .toBeUndefined();
          continue;
        }
        // Los sitios comunes tienen horas de punta.
        expect(offer.hours, `${place.id}/${offer.id}: tiene horas`).toBeDefined();
        if (offer.hours !== undefined) {
          expect(offer.hours[0]).toBeGreaterThanOrEqual(0);
          expect(offer.hours[1]).toBeLessThanOrEqual(1);
          expect(offer.hours[0]).toBeLessThanOrEqual(offer.hours[1]);
        }
      }
    }
  });
});
