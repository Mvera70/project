// E3/G-27 · El menú no abre una tabla sintética: juega el valle con la política
// prudente hasta el año pedido. Esta jornada guarda que su primer bastión con
// escalera sale de ese mismo camino histórico.
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { bastionAccessOf } from '@engine/world/bastion-access';
import { ringClosed } from '@engine/world/placement';

describe('E3/G-27 · bastión accesible en la historia del menú', () => {
  it('la semilla 7 al año 60 conserva anillo, puerta y al menos una escalera válida', () => {
    const state = foundGame(7);
    // `openAtYear(60)` del menú avanza (60 - 1) años: el inicio ya se presenta
    // como Year 1, de modo que el estado esperado es exactamente tick 2832.
    run(state, (60 - 1) * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);

    expect(state.tick).toBe(2832);
    expect(state.ended).toBeNull();
    expect(ringClosed(state)).toBe(true);
    expect(state.buildings.some(building => building.kind === 'gate' && building.lostTick === null)).toBe(true);
    const accessible = state.buildings.filter(building => building.kind === 'bastion'
      && bastionAccessOf(state, building) !== null);
    expect(accessible.length, `bastiones: ${state.buildings.filter(building => building.kind === 'bastion').map(building =>
      `${building.id}@${building.x},${building.y}`).join(', ')}`).toBeGreaterThanOrEqual(1);
  });
});
