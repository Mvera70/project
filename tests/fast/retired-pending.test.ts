// RD-0 · Una encrucijada retirada que quedó pendiente en un guardado.
//
// El rework de ritmo va a retirar plantillas vivas, y una partida guardada puede
// tener una de ellas esperando respuesta. Con `catalogue.find` a secas cargaba
// pero no se enseñaba ni se resolvía, y como sólo hay una pregunta a la vez
// (§8.6) el valle no volvía a preguntar nunca (medido: 303 semanas sin ninguna,
// `docs/medidas/rd0-encrucijadas-2026-09-30.md` §6).

import { describe, expect, it } from 'vitest';
import { CATALOG, RETIRED_TEMPLATES, templateOf } from '@engine/crossroads/catalog';
import { deserialize, serialize } from '@engine/save';
import { run, tick } from '@engine/sim';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

function withRetiredPending(seed: number): GameState {
  const state = foundTwenty(seed);
  run(state, 30, 'prudent', CATALOG);
  const retired = RETIRED_TEMPLATES[0]!;
  const alive = state.people.villagers.filter((p) => p.diedTick === null && p.leftTick === null);
  state.crossroad = {
    templateId: retired.id,
    posedTick: state.tick,
    cast: Object.fromEntries(retired.cast.map((c, i) => [c.as, alive[i]!.id])),
    optionIds: retired.options.map((o) => o.id),
  };
  // Como lo guarda el juego: clon estructurado (IndexedDB), no JSON.
  const saved = structuredClone(serialize(state, [], [], 0)) as unknown;
  return deserialize(saved).state;
}

describe('RD-0 · una pendiente retirada sigue siendo una pregunta', () => {
  it('se puede enseñar: tiene plantilla, título y opciones', () => {
    const state = withRetiredPending(7);
    const template = templateOf(CATALOG, state.crossroad!.templateId);
    expect(template?.title).toBeTruthy();
    expect(template?.options.length).toBeGreaterThan(0);
  });

  it('se puede contestar, y después el valle vuelve a preguntar', () => {
    for (const seed of [7, 11, 23]) {
      const state = withRetiredPending(seed);
      const pending = state.crossroad!;
      tick(state, CATALOG, { templateId: pending.templateId, optionId: pending.optionIds[0]! });
      expect(state.history.some((d) => d.templateId === pending.templateId), `semilla ${seed}`).toBe(true);
      expect(state.crossroad?.templateId ?? null).not.toBe(pending.templateId);
      // Y no se vuelve a plantear: lo retirado no entra en la selección.
      let asked = false;
      for (let week = 0; week < 400 && !asked && state.ended === null; week += 1) {
        const report = tick(state, CATALOG);
        if (report.posed !== null) {
          expect(RETIRED_TEMPLATES.some((t) => t.id === report.posed)).toBe(false);
          asked = true;
        }
      }
      expect(asked, `semilla ${seed}: vuelve a haber preguntas`).toBe(true);
    }
  });
});
