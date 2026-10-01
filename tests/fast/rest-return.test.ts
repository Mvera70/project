// RD-2 (Vera, 30 sep 2026) · Volver: la ausencia corre a la velocidad a la que
// se dejó, por las dos puertas, y el parte dice lo que espera.
//
// Hasta aquí la pestaña oculta recuperaba a la velocidad puesta y la apertura
// en frío a ×1, porque el guardado no llevaba la velocidad (§13.2): la misma
// ausencia daba dos valles distintos. Y la pausa no sobrevivía a cerrar.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { deserialize, serialize, ticksOwed } from '@engine/save';
import { run } from '@engine/sim';
import { resumeAfterHidden } from '@ui/app';
import { pendingLines } from '@ui/welcome';

describe('RD-2 · la velocidad viaja con la partida', () => {
  it('el guardado conserva la velocidad, también la pausa; uno viejo vuelve a ×1', () => {
    const state = foundGame(7);
    for (const speed of TIME.SPEEDS) {
      const back = deserialize(structuredClone(serialize(state, [], [], 0, speed)));
      expect(back.speed, `×${speed}`).toBe(speed);
    }
    expect(deserialize(structuredClone(serialize(state, [], [], 0))).speed).toBeUndefined();
    const forged = { ...structuredClone(serialize(state, [], [], 0)), speed: 3 };
    expect(deserialize(forged).speed, 'una velocidad que no existe no entra').toBeUndefined();
  });

  it('la misma ausencia debe las mismas semanas por la pestaña oculta y por la apertura nueva', () => {
    const hour = 60 * 60 * 1000;
    for (const speed of TIME.SPEEDS) {
      for (const away of [10 * 60 * 1000, hour, 8 * hour]) {
        expect(resumeAfterHidden(away, speed).ticks, `×${speed}, ${away} ms`).toBe(ticksOwed(away, speed));
      }
    }
    // Y en pausa, nada, por las dos.
    expect(ticksOwed(8 * hour, 0)).toBe(0);
    expect(resumeAfterHidden(8 * hour, 0).ticks).toBe(0);
  });
});

describe('RD-2 · el parte dice lo que espera', () => {
  it('la pregunta sin contestar y el asalto anunciado, con su nombre y sus semanas', () => {
    const state = foundGame(11);
    run(state, 10, 'prudent', CATALOG);
    const template = CATALOG.find((t) => t.options.length >= 2)!;
    state.crossroad = { templateId: template.id, posedTick: state.tick, cast: {}, optionIds: template.options.map((o) => o.id) };
    state.threat.comingTick = state.tick + 6;
    const lines = pendingLines(state);
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(line).not.toMatch(/\{\w+\}|welcome\./u);
    expect(lines[1]).toMatch(/6 weeks/u);
    // Sin nada pendiente, el parte no inventa.
    state.crossroad = null;
    state.threat.comingTick = null;
    expect(pendingLines(state)).toHaveLength(0);
  });
});
