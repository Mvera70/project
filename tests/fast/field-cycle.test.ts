// IA-fields · El año del campo: abonar, arar, sembrar, crecer, madurar,
// cosechar, rastrojo, reposo y vuelta. Y la crónica lo cuenta.
import { describe, expect, it } from 'vitest';
import { FIELD_CYCLE, TIME } from '@engine/balance';
import { CROPS, cropOf, fieldEvents, fieldMoment, type FieldPhase } from '@engine/world/crops';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { BANK } from '@engine/chronicle/bank.en';

describe('IA-fields · el año de una parcela', () => {
  it.each(CROPS)('%s recorre las fases en orden y vuelve a empezar', (crop) => {
    const order: FieldPhase[] = [];
    let growth = -1;
    for (let week = 0; week < TIME.WEEKS_PER_YEAR * 2; week += 1) {
      const moment = fieldMoment(crop, week);
      if (order.at(-1) !== moment.phase) order.push(moment.phase);
      if (moment.phase === 'grow') { expect(moment.growth).toBeGreaterThanOrEqual(growth); growth = moment.growth; }
      if (moment.phase === 'fallow') growth = -1;
    }
    // Un año entero y el principio del siguiente: el bucle se cierra.
    expect(order).toEqual(['manure', 'plough', 'sow', 'grow', 'ripe', 'stubble', 'fallow',
      'manure', 'plough', 'sow', 'grow', 'ripe', 'stubble', 'fallow']);
    // Crece de forma continua y está hecho antes de la cosecha del motor.
    expect(fieldMoment(crop, FIELD_CYCLE.RIPE_AT[crop]).growth).toBe(1);
    expect(fieldMoment(crop, TIME.HARVEST_WEEK).phase).toBe('ripe');
  });

  it('cada cultivo crece a su ritmo: el cereal se siembra antes y madura después', () => {
    const week = 20;
    expect(fieldMoment('cabbage', week).growth).toBeGreaterThan(fieldMoment('grain', week).growth);
  });

  it('la primera vez es noticia y después es rutina', () => {
    const fields = [0, 1, 2].map(id => ({ id, kind: 'field' as const, lostTick: null }));
    const flags: Record<string, number> = {};
    const firstYear = fieldEvents(fields, flags, FIELD_CYCLE.SOW_FROM.grain);
    const sowing = firstYear.find(event => event.templateKey === 'fields.first_sowing.grain')!;
    expect(sowing.weight).toBe(2);
    flags[sowing.flag!] = 0;
    const nextYear = fieldEvents(fields, flags, TIME.WEEKS_PER_YEAR + FIELD_CYCLE.SOW_FROM.grain);
    expect(nextYear.map(event => [event.templateKey, event.weight])).toEqual([['fields.sown.grain', 1]]);
    // Sin campos, nada que contar.
    expect(fieldEvents([], {}, FIELD_CYCLE.PLOUGH_FROM)).toEqual([]);
  });

  it('todo suceso del campo tiene su texto en el banco', () => {
    const keys = ['fields.first_manure', 'fields.manured', 'fields.first_plough', 'fields.ploughed',
      ...CROPS.flatMap(crop => [`fields.first_sowing.${crop}`, `fields.sown.${crop}`, `fields.ripe.${crop}`])];
    for (const key of keys) expect(BANK[key]?.length, key).toBeGreaterThanOrEqual(3);
  });

  it('una partida jugada cuenta su primera siembra y no toca el grano', () => {
    const state = foundGame(7);
    run(state, TIME.WEEKS_PER_YEAR + 10, 'prudent', CATALOG);
    const keys = state.chronicle.map(entry => entry.templateKey);
    expect(keys.some(key => key.startsWith('fields.first_sowing.'))).toBe(true);
    expect(keys).toContain('fields.first_plough');
    // Una sola vez cada primera siembra.
    for (const crop of CROPS) expect(keys.filter(key => key === `fields.first_sowing.${crop}`).length).toBeLessThanOrEqual(1);
    const field = state.buildings.find(building => building.kind === 'field')!;
    expect(CROPS).toContain(cropOf(field));
  });
});
