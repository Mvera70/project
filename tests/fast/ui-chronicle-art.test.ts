// UI-V3 · `illustrationFor` (`src/ui/redesign/chronicle-art.ts`), fila a fila
// contra la tabla de `docs/ui-redesign/piel/plan-piel.md` §3.6.
//
// Pura, sin DOM (este proyecto no trae `jsdom`, mismo motivo que
// `ui-chronicle.test.ts`/`ui-chronicle-links.test.ts`): cada prueba construye
// la entrada mínima que hace falta —`kind` y `tick` son los únicos campos que
// la función mira— y comprueba el nombre de fichero exacto de la tabla.

import { describe, expect, it } from 'vitest';
import type { ChronicleEntry, ChronicleKind, HappeningId, HappeningRecord } from '@engine/state';
import { illustrationFor } from '@ui/redesign/chronicle-art';

/** Una entrada mínima: `templateKey`/`params`/`weight` no los mira la función. */
function entry(kind: ChronicleKind, tick = 0): ChronicleEntry {
  return { tick, kind, templateKey: 'x', params: {}, weight: 2 };
}

function happening(id: HappeningId, tick = 0): HappeningRecord {
  return { tick, id, visible: [], who: [] };
}

// Un tick por estación (design.md §5.1: TIME.WEEKS_PER_SEASON = 12).
const SPRING = 0;
const SUMMER = 12;
const AUTUMN = 24;
const WINTER = 36;

describe('illustrationFor · plan-piel.md §3.6, una prueba por fila', () => {
  it('founding → founding.svg', () => {
    expect(illustrationFor(entry('founding'), [])).toBe('founding.svg');
  });

  it('season → season-<estación>.svg, las cuatro', () => {
    expect(illustrationFor(entry('season', SPRING), [])).toBe('season-spring.svg');
    expect(illustrationFor(entry('season', SUMMER), [])).toBe('season-summer.svg');
    expect(illustrationFor(entry('season', AUTUMN), [])).toBe('season-autumn.svg');
    expect(illustrationFor(entry('season', WINTER), [])).toBe('season-winter.svg');
  });

  it('birth → birth.svg', () => {
    expect(illustrationFor(entry('birth'), [])).toBe('birth.svg');
  });

  it('death, extinction → death.svg', () => {
    expect(illustrationFor(entry('death'), [])).toBe('death.svg');
    expect(illustrationFor(entry('extinction'), [])).toBe('death.svg');
  });

  it('harvest, forage → harvest.svg', () => {
    expect(illustrationFor(entry('harvest'), [])).toBe('harvest.svg');
    expect(illustrationFor(entry('forage'), [])).toBe('harvest.svg');
  });

  it('famine → famine.svg', () => {
    expect(illustrationFor(entry('famine'), [])).toBe('famine.svg');
  });

  it('plague → plague.svg', () => {
    expect(illustrationFor(entry('plague'), [])).toBe('plague.svg');
  });

  it('fire → fire.svg', () => {
    expect(illustrationFor(entry('fire'), [])).toBe('fire.svg');
  });

  it('built → built.svg', () => {
    expect(illustrationFor(entry('built'), [])).toBe('built.svg');
  });

  it('lost, abandonment → lost.svg', () => {
    expect(illustrationFor(entry('lost'), [])).toBe('lost.svg');
    expect(illustrationFor(entry('abandonment'), [])).toBe('lost.svg');
  });

  it('arrival, departure → road.svg', () => {
    expect(illustrationFor(entry('arrival'), [])).toBe('road.svg');
    expect(illustrationFor(entry('departure'), [])).toBe('road.svg');
  });

  it('grudge → grudge.svg', () => {
    expect(illustrationFor(entry('grudge'), [])).toBe('grudge.svg');
  });

  it('succession → succession.svg', () => {
    expect(illustrationFor(entry('succession'), [])).toBe('succession.svg');
  });

  it('crossroad_posed, crossroad_taken, consequence → sin dibujo (documento sellado)', () => {
    expect(illustrationFor(entry('crossroad_posed'), [])).toBeNull();
    expect(illustrationFor(entry('crossroad_taken'), [])).toBeNull();
    expect(illustrationFor(entry('consequence'), [])).toBeNull();
  });

  it('happening → lightning_fire → fire.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('lightning_fire', 5)])).toBe('fire.svg');
  });

  it('happening → river_flood → flood.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('river_flood', 5)])).toBe('flood.svg');
  });

  it('happening → wolves_at_the_coop → wolf.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('wolves_at_the_coop', 5)])).toBe('wolf.svg');
  });

  it('happening → wedding → wedding.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('wedding', 5)])).toBe('wedding.svg');
  });

  it('happening → pedlar → pedlar.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('pedlar', 5)])).toBe('pedlar.svg');
  });

  it('happening → good_catch → fish.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('good_catch', 5)])).toBe('fish.svg');
  });

  it('happening → roof_under_snow → season-winter.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('roof_under_snow', 5)])).toBe('season-winter.svg');
  });

  it('happening → harvest_feast → harvest.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('harvest_feast', 5)])).toBe('harvest.svg');
  });

  it('happening → quarrel_in_the_square → grudge.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('quarrel_in_the_square', 5)])).toBe('grudge.svg');
  });

  it('happening → bear_in_the_wood → bear.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('bear_in_the_wood', 5)])).toBe('bear.svg');
  });

  it('happening → child_lost → child.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('child_lost', 5)])).toBe('child.svg');
  });

  it('happening → stranger_passes → road.svg', () => {
    expect(illustrationFor(entry('happening', 5), [happening('stranger_passes', 5)])).toBe('road.svg');
  });

  it('happening sin registro del mismo tick (no debería darse) no inventa dibujo', () => {
    expect(illustrationFor(entry('happening', 5), [happening('bear_in_the_wood', 9)])).toBeNull();
  });
});
