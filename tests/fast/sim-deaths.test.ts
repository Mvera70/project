import { describe, expect, it } from 'vitest';
import { FOOD, MOOD, TIME } from '@engine/balance';
import type { Catalogue, CrossroadTemplate } from '@engine/crossroads/schema';
import { foundGame } from '@engine/found';
import { makeVillager } from '@engine/people/villagers';
import { tick } from '@engine/sim';

function violentCatalogue(): Catalogue {
  const template: CrossroadTemplate = {
    id: 'test_deaths', category: 'feud', weight: 1, cooldownYears: 1,
    requires: [], cast: [], title: 'test.title', body: 'test.body',
    options: [{
      id: 'kill', label: 'test.label', cost: 'test.cost',
      effects: [{ k: 'kill', who: 'A', count: 1 }],
      visible: [{ k: 'scar', what: 'grave_row' }],
      seeds: [{
        id: 'revenge', delayYears: [1, 1],
        effects: [{ k: 'kill', who: 'B', count: 1 }],
        visible: [{ k: 'scar', what: 'grave_row' }], chronicleKey: 'test.revenge',
      }],
    }],
  };
  return [template];
}

describe('all deaths reach the weekly chronicle (§9.4)', () => {
  it('gives a starving named elder their epitaph, without counting them as anonymous', () => {
    const state = foundGame(7);
    const elder = state.people.villagers.find((v) => v.named)!;
    for (const v of state.people.villagers) v.bornTick = -20 * TIME.WEEKS_PER_YEAR;
    elder.bornTick = -70 * TIME.WEEKS_PER_YEAR;
    elder.memories = [{ tick: 0, kind: 'was_blamed', aboutId: null, weight: 5 }];
    // Exactly two starvation deaths, including the only elder, in every seed.
    const total = 2 / FOOD.STARVATION_RATE;
    while (state.people.villagers.length < total) {
      state.people.villagers.push(makeVillager({
        id: state.people.nextId++, bornTick: -20 * TIME.WEEKS_PER_YEAR, female: false,
      }));
    }
    state.village.grain = 0;
    // v2.91: una aldea con rebaño se lo come antes de dejar morir a nadie
    // (§7.7). Lo que esta prueba mide es la crónica del hambre, así que el
    // corral tiene que estar vacío para que el hambre llegue a la gente.
    state.herd = { hens: 0, pigs: 0, cows: 0 };
    const report = tick(state, []);
    const hunger = report.entries.filter((e) => e.templateKey.startsWith('death.hunger.'));
    expect(hunger.find((e) => e.params.name === elder.name)).toMatchObject({
      weight: 3, templateKey: 'death.hunger.named',
      params: { age: 70, tail: 'death.named.was_blamed', sinceYear: 0 },
    });
    const represented = hunger.reduce((n, e) => n + (e.params.name ? 1 : Number(e.params.count)), 0);
    expect(represented).toBe(2);
    expect(report.deaths.filter((d) => d.cause === 'hunger')).toHaveLength(2);
    expect(state.chronicle.filter((e) => e.kind === 'death' && e.params.name === elder.name)).toHaveLength(1);
  });

  it('records decision and seed victims once, in order, and charges both to this week’s morale', () => {
    const state = foundGame(7);
    state.tick = 11; // A season entry precedes the decision on the next tick.
    const [a, b] = state.people.villagers.filter((v) => v.named);
    if (a === undefined || b === undefined) throw new Error('Missing founding cast');
    a.memories = [{ tick: 0, kind: 'was_blamed', aboutId: null, weight: 5 }];
    b.memories = [{ tick: 0, kind: 'was_saved', aboutId: a.id, weight: 5 }];
    const cast = { A: a.id, B: b.id };
    state.crossroad = { templateId: 'test_deaths', posedTick: 11, cast, optionIds: ['kill'] };
    state.seeds.push({
      id: 'test_deaths:kill:revenge:0', fromTemplateId: 'test_deaths', fromOptionId: 'kill',
      plantedTick: 0, firesAtTick: 12, cast, condition: null, firedTick: null, witheredTick: null,
    });
    const moraleBefore = state.village.morale;
    const report = tick(state, violentCatalogue(), { templateId: 'test_deaths', optionId: 'kill' });
    const entries = state.chronicle.filter((e) => e.tick === 12);
    expect(entries.map((e) => e.templateKey)).toEqual([
      'season.summer', 'crossroad.test_deaths.kill', 'death.violence.named',
      'test.revenge', 'death.violence.named',
    ]);
    expect(report.entries).toEqual(entries);
    expect(entries[2]?.params).toMatchObject({ name: a.name, tail: 'death.named.was_blamed' });
    expect(entries[4]?.params).toMatchObject({ name: b.name, tail: 'death.named.was_saved', other: a.name });
    expect(report.deaths.map((d) => d.id)).toEqual([a.id, b.id]);
    expect(state.village.morale).toBeCloseTo(
      moraleBefore + (MOOD.MORALE_DRIFT_TO - moraleBefore) * MOOD.MORALE_DRIFT + 2 * MOOD.MORALE_PER_DEATH,
    );
    tick(state, []);
    for (const victim of [a, b]) {
      expect(state.chronicle.filter((e) => e.kind === 'death' && e.params.name === victim.name)).toHaveLength(1);
    }
  });
});
