// V-11 · Lo que el motor manda, y hoy no llega. design.md Anexo E, §11.8.
//
// **Esta prueba está roja a propósito y declara una regresión medida.**
//
// §11.8 dice que veinticinco de las cincuenta y seis opciones del catálogo
// convocan a la aldea, y el principio 1 del juego exige que toda opción cambie
// algo en pantalla. Hasta G-11 eso lo cumplía `actorsFor`: el día que había
// reunión, nadie iba al tajo y todos compartían destino.
//
// G-12 puso la capa de vida por defecto y `actorsFor` dejó de ejecutarse. Nadie
// se dio cuenta porque la prueba que vigilaba la reunión llamaba a `actorsFor`
// directamente, así que siguió verde sobre un camino que el juego ya no
// recorría. V-12 borró ese camino; esto es lo que quedó al descubierto.
//
// `life/` no conoce la palabra `gather`. Lo que falta es `life/staging.ts` —el
// brief de V-11 en E.8—: las órdenes bajan del motor a la vida, y una reunión
// es un `Place` temporal con aforo alto y hora fija.
//
// Se deja como `it.fails` con la propiedad del brief intacta, que es el patrón
// que `docs/roadmap.md` fija para lo que no llega: no se baja el listón y no se
// borra la propiedad. Cuando V-11 cierre, se quita el `.fails` y pasa.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { gatheringsAt } from '@derive/gatherings';
import { createVillage } from '../../src/render3d/life/village';

/** Una decisión con `gather` puesta a mano, para no simular veinte años. */
function summon(state: GameState): GameState {
  const called = structuredClone(state);
  const template = CATALOG.find((candidate) => candidate.options.some(
    (option) => option.visible.some((effect) => effect.k === 'gather'),
  ));
  const option = template?.options.find(
    (candidate) => candidate.visible.some((effect) => effect.k === 'gather'),
  );
  expect(template, 'el catálogo tiene alguna opción que convoca').toBeDefined();
  called.history.push({
    tick: called.tick, templateId: template?.id ?? '', optionId: option?.id ?? '', cast: {},
  });
  return called;
}

function village(years: number, seed = 7): GameState {
  const state = foundGame(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

/** Lo lejos que está del sitio de la reunión el que más lejos está. */
function spread(state: GameState, day: number): number {
  const life = createVillage(state, day);
  // Media jornada: si la aldea se junta, a estas alturas ya está junta.
  for (let step = 0; step < 900; step += 1) life.step();
  const [meeting] = gatheringsAt(state, CATALOG, state.tick - 8);
  if (meeting === undefined) return Number.NaN;
  let worst = 0;
  for (const dweller of life.dwellers) {
    worst = Math.max(worst, Math.hypot(dweller.body.x - meeting.x, dweller.body.z - meeting.y));
  }
  return worst;
}

describe('V-11 · la reunión de §11.8 en la capa de vida', () => {
  it('el motor sabe que hay reunión, y dice dónde', () => {
    // La mitad del motor funciona: esto es lo que la vida tendría que obedecer.
    const called = summon(village(12));
    const meetings = gatheringsAt(called, CATALOG, called.tick - 8);
    expect(meetings.length).toBeGreaterThanOrEqual(1);
    expect(meetings[0]?.x).toBeGreaterThanOrEqual(0);
    expect(meetings[0]?.y).toBeGreaterThanOrEqual(0);
  });

  it.fails('la aldea se junta donde la decisión dijo', () => {
    // La propiedad del brief, intacta: con reunión convocada, a media jornada
    // la aldea está en el sitio de la reunión. Tres celdas es generoso —una
    // reunión no es una formación— y aun así no se cumple: la vida reparte a
    // cada uno por sus propias ofertas y no ha oído la orden.
    const called = summon(village(12));
    expect(spread(called, 0)).toBeLessThan(3);
  });

  it('y mientras no se junte, queda medido cuánto se dispersa', () => {
    // Lo que hay hoy, para que la ronda que lo arregle tenga contra qué
    // comparar. No es un umbral de diseño: es el estado de las cosas.
    const called = summon(village(12));
    const worst = spread(called, 0);
    expect(Number.isFinite(worst)).toBe(true);
    expect(worst, `hoy el más lejano está a ${worst.toFixed(1)} celdas del sitio`)
      .toBeGreaterThan(3);
  });
});
