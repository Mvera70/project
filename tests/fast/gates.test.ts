// Un portón pertenece a una muralla. `derive/defence-gates.ts`.
//
// **La prueba existe porque el dueño del diseño lo vio en una captura**, el 18
// sep 2026: «veo que hay puertas que se colocan solas sin muralla al lado, no
// debería pasar». Y era verdad: la aldea levanta la empalizada pieza a pieza a
// lo largo de la envolvente del núcleo (§7.4), y `defenceGates` daba un portón
// **por cada tramo conectado**, así que un trozo suelto de una sola pieza se
// convertía en una puerta de pie en la hierba.
//
// Medido antes de arreglarlo, cuatro semillas al año 60: de 6 a 17 portones por
// valle, y de 5 a 11 de ellos en tramos de una sola pieza. Después: de 1 a 7
// portones, ninguno suelto.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { defenceGates } from '@derive/defence-gates';
import type { GameState } from '@engine/state';

/** Los tramos de muralla en pie, por celda. */
function wallsByCell(state: GameState): Map<number, number> {
  const out = new Map<number, number>();
  for (const b of state.buildings) {
    if (b.lostTick !== null) continue;
    // A3 · **el bastión también es muralla aquí**, y olvidarlo costó un rojo:
    // el motor ya lo cuenta como pieza del cerco en `touchesWall`, `wallRuns`,
    // `resistance`, `walled` y el libro de cuentas, pero esta prueba llevaba su
    // propia copia de la idea. Con la trayectoria movida, la semilla 41 acabó
    // con un portón que tenía un bastión al lado y ninguna estaca, y esto lo
    // leyó como «un portón solo en el prado» cuando estaba pegado a su torre.
    if (b.kind !== 'wall' && b.kind !== 'palisade' && b.kind !== 'bastion') continue;
    out.set(b.y * state.map.width + b.x, b.id);
  }
  return out;
}

describe('ningún portón se queda solo en el prado', () => {
  it('cada portón tiene muralla pegada', () => {
    // **Dos semillas y dos edades, no cuatro por tres**: la versión larga son
    // 5,6 segundos y la suite rápida tiene veinte de presupuesto entera
    // (`CLAUDE.md`). Se quedan las dos que más portones sueltos daban —la 41
    // tenía once al año 60 y la 11 seis— porque la propiedad se rompe primero
    // donde más murallas hay. Las cuatro semillas siguen midiéndose a mano
    // cuando alguien toque `GATE_MIN_RUN`; están apuntadas en la cabecera.
    for (const seed of [11, 41]) {
      const state = foundGame(seed);
      for (const year of [40, 60]) {
        run(state, year * TIME.WEEKS_PER_YEAR - state.tick, 'prudent', CATALOG);
        const cells = wallsByCell(state);
        for (const [id] of defenceGates(state)) {
          const gate = state.buildings.find((b) => b.id === id);
          expect(gate, `semilla ${seed}, año ${year}: el portón existe`).toBeDefined();
          if (gate === undefined) continue;
          const neighbours = ([[0, -1], [1, 0], [0, 1], [-1, 0]] as const).filter(
            ([dx, dz]) => cells.has((gate.y + dz) * state.map.width + gate.x + dx),
          );
          expect(neighbours.length, `semilla ${seed}, año ${year}: portón en ${gate.x},${gate.y} sin muralla al lado`)
            .toBeGreaterThan(0);
        }
      }
    }
  });

  it('y un recinto de verdad sigue teniendo el suyo', () => {
    // La otra mitad: el mínimo no puede dejar sin puerta a una muralla que
    // encierra algo, porque entonces la gente se quedaría fuera de su casa.
    // Un anillo de empalizada de ocho piezas es un recinto con todas las letras.
    const state = foundGame(7);
    const template = state.buildings[0];
    expect(template).toBeDefined();
    if (template === undefined) return;
    const ring = [];
    for (let z = 40; z <= 42; z += 1) {
      for (let x = 40; x <= 42; x += 1) {
        if (x === 41 && z === 41) continue;
        ring.push({ ...template, id: 900 + ring.length, kind: 'palisade' as const, x, y: z, w: 1, h: 1 });
      }
    }
    state.buildings = [...state.buildings, ...ring];
    const gates = defenceGates(state);
    const mine = [...gates].filter(([id]) => id >= 900);
    expect(mine.length, 'el anillo tiene su portón').toBe(1);
  });
});
