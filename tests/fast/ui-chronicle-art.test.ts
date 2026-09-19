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
  it('founding → founding.png', () => {
    expect(illustrationFor(entry('founding'), [])).toBe('founding.png');
  });

  it('season → season-<estación>.png, las cuatro', () => {
    expect(illustrationFor(entry('season', SPRING), [])).toBe('season-spring.png');
    expect(illustrationFor(entry('season', SUMMER), [])).toBe('season-summer.png');
    expect(illustrationFor(entry('season', AUTUMN), [])).toBe('season-autumn.png');
    expect(illustrationFor(entry('season', WINTER), [])).toBe('season-winter.png');
  });

  it('birth → birth.png', () => {
    expect(illustrationFor(entry('birth'), [])).toBe('birth.png');
  });

  it('death, extinction → death.png', () => {
    expect(illustrationFor(entry('death'), [])).toBe('death.png');
    expect(illustrationFor(entry('extinction'), [])).toBe('death.png');
  });

  it('harvest, forage → harvest.png', () => {
    expect(illustrationFor(entry('harvest'), [])).toBe('harvest.png');
    expect(illustrationFor(entry('forage'), [])).toBe('harvest.png');
  });

  it('famine → famine.png', () => {
    expect(illustrationFor(entry('famine'), [])).toBe('famine.png');
  });

  it('plague → plague.png', () => {
    expect(illustrationFor(entry('plague'), [])).toBe('plague.png');
  });

  it('fire → fire.png', () => {
    expect(illustrationFor(entry('fire'), [])).toBe('fire.png');
  });

  it('built genérico → built.png', () => {
    expect(illustrationFor(entry('built'), [])).toBe('built.png');
  });

  it.each([
    ['wall.closed', 'wall-closed.png'],
    ['built.gate', 'built-gate.png'],
    ['built.wall', 'built-wall.png'],
    ['built.wall.year', 'built-wall.png'],
    ['built.watchtower', 'built-watchtower.png'],
    ['built.watchtower.year', 'built-watchtower.png'],
  ])('obra temática %s → %s', (templateKey, expected) => {
    expect(illustrationFor({ ...entry('built'), templateKey }, [])).toBe(expected);
  });

  it('lost, abandonment → lost.png', () => {
    expect(illustrationFor(entry('lost'), [])).toBe('lost.png');
    expect(illustrationFor(entry('abandonment'), [])).toBe('lost.png');
  });

  it('arrival, departure → road.png', () => {
    expect(illustrationFor(entry('arrival'), [])).toBe('road.png');
    expect(illustrationFor(entry('departure'), [])).toBe('road.png');
  });

  it('grudge → grudge.png', () => {
    expect(illustrationFor(entry('grudge'), [])).toBe('grudge.png');
  });

  it('succession → succession.png', () => {
    expect(illustrationFor(entry('succession'), [])).toBe('succession.png');
  });

  it('crossroad_posed, crossroad_taken, consequence → sin dibujo (documento sellado)', () => {
    expect(illustrationFor(entry('crossroad_posed'), [])).toBeNull();
    expect(illustrationFor(entry('crossroad_taken'), [])).toBeNull();
    expect(illustrationFor(entry('consequence'), [])).toBeNull();
  });

  it('happening → lightning_fire → fire.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('lightning_fire', 5)])).toBe('fire.png');
  });

  it('happening → river_flood → flood.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('river_flood', 5)])).toBe('flood.png');
  });

  it('happening → wolves_at_the_coop → wolf.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('wolves_at_the_coop', 5)])).toBe('wolf.png');
  });

  it('happening → wedding → wedding.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('wedding', 5)])).toBe('wedding.png');
  });

  it('happening → pedlar → pedlar.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('pedlar', 5)])).toBe('pedlar.png');
  });

  it('happening → good_catch → fish.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('good_catch', 5)])).toBe('fish.png');
  });

  it('happening → roof_under_snow → season-winter.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('roof_under_snow', 5)])).toBe('season-winter.png');
  });

  it('happening → harvest_feast → harvest.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('harvest_feast', 5)])).toBe('harvest.png');
  });

  it('happening → quarrel_in_the_square → grudge.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('quarrel_in_the_square', 5)])).toBe('grudge.png');
  });

  it('happening → bear_in_the_wood → bear.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('bear_in_the_wood', 5)])).toBe('bear.png');
  });

  it('happening → child_lost → child.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('child_lost', 5)])).toBe('child.png');
  });

  it('happening → stranger_passes → road.png', () => {
    expect(illustrationFor(entry('happening', 5), [happening('stranger_passes', 5)])).toBe('road.png');
  });

  it('happening sin registro del mismo tick (no debería darse) no inventa dibujo', () => {
    expect(illustrationFor(entry('happening', 5), [happening('bear_in_the_wood', 9)])).toBeNull();
  });

  it.each([
    ['means.plough.given', 'means-plough.png'],
    ['means.pigs.given', 'means-pigs.png'],
    ['means.axe.given', 'means-axe.png'],
    ['means.relic.given', 'means-relic.png'],
    ['means.arms.given', 'means-arms.png'],
    ['means.bows.given', 'means-bows.png'],
    ['means.tower.given', 'means-tower.png'],
    ['means.gate.given', 'means-gate.png'],
    ['means.hand.given', 'means-hand.png'],
    ['means.ale.given', 'means-ale.png'],
  ])('means estable %s → %s', (templateKey, expected) => {
    expect(illustrationFor({ ...entry('means'), templateKey }, [])).toBe(expected);
  });

  it('un medio futuro sin arte cae al respaldo', () => {
    expect(illustrationFor({ ...entry('means'), templateKey: 'means.future.given' }, [])).toBeNull();
  });

  it('raid sigue sin arte mientras su contrato está en desarrollo', () => {
    expect(illustrationFor(entry('raid'), [])).toBeNull();
  });
});
