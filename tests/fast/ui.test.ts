import { describe, expect, it } from 'vitest';
import { UI_BANK } from '@engine/chronicle/bank.en';
import { foundGame } from '@engine/found';
import { inspectAt, panelFor } from '@ui/inspect';
import { recogniseGesture } from '@ui/gestures';
import { hungerSeverity, tellsFor } from '@render/layers/tells';
import { crowdPositions } from '@render/crowd';

describe('M-21 · gestos puros', () => {
  it('distingue toque, pulsación y deslizamientos verticales', () => {
    expect(recogniseGesture({ points: [{ x: 1, y: 1, atMs: 0 }, { x: 3, y: 2, atMs: 100 }] })).toBe('tap');
    expect(recogniseGesture({ points: [{ x: 1, y: 1, atMs: 0 }, { x: 2, y: 2, atMs: 600 }] })).toBe('hold');
    expect(recogniseGesture({ points: [{ x: 1, y: 80, atMs: 0 }, { x: 2, y: 10, atMs: 200 }] })).toBe('swipe_up');
    expect(recogniseGesture({ points: [{ x: 1, y: 10, atMs: 0 }, { x: 2, y: 80, atMs: 200 }] })).toBe('swipe_down');
  });

  it('reconoce un pellizco por el cambio entre dos distancias', () => {
    expect(recogniseGesture({ points: [], secondStartDistance: 30, secondEndDistance: 55 })).toBe('pinch');
  });
});

describe('M-21 · inspección y señales', () => {
  it('incluye los bordes de la caja de un edificio y da su cifra exacta', () => {
    const state = foundGame(7);
    const building = state.buildings[0]!;
    const target = inspectAt(state, building.x + building.w, building.y + building.h, 0.9);
    expect(target).toEqual({ kind: 'building', id: building.id });
    expect(panelFor(target!, state).lines.length).toBeGreaterThan(1);
  });

  it('deriva las señales sin mutar el estado', () => {
    const state = foundGame(7);
    const before = JSON.stringify(state);
    expect(tellsFor(state).length).toBeGreaterThan(0);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('hace visible el hambre sin añadir estado', () => {
    const state = foundGame(7);
    const normal = crowdPositions(state, 0.3).length;
    state.flags['forced_hunger'] = state.tick + 8;
    expect(hungerSeverity(state)).toBe(0.5);
    expect(crowdPositions(state, 0.3).length).toBeLessThan(normal);
  });

  it('el banco cubre el armazón y cada identificador que llega a una ficha', () => {
    const fixed = [
      'app.valley', 'app.year', 'app.speed.controls', 'app.speed.pause',
      'app.speed.multiplier', 'crossroad.waiting', 'welcome.title',
      'inspect.raised', 'inspect.granary', 'inspect.house', 'inspect.house.named',
      'inspect.role.empty', 'inspect.role.holder', 'inspect.villager',
      'inspect.opinion.trusts', 'inspect.opinion.resents', 'inspect.memory',
      'inspect.age', 'inspect.traits.none', 'inspect.gone', 'inspect.terrain.people',
    ];
    const buildings = [
      'house', 'field', 'granary', 'chapel', 'smithy', 'well', 'mill',
      'palisade', 'wall', 'church', 'stone_house', 'watchtower', 'grave_yard',
    ].map((kind) => `building.${kind}`);
    const terrain = ['meadow', 'forest', 'water', 'rock', 'marsh', 'cleared', 'land']
      .map((kind) => `terrain.${kind}`);
    const traits = [
      'ambitious', 'devout', 'spiteful', 'craven', 'generous', 'stubborn',
      'cunning', 'kind', 'hot_tempered', 'frail', 'hardy', 'greedy', 'loyal',
      'proud', 'secretive',
    ].map((kind) => `trait.${kind}`);
    const memories = [
      'lost_child', 'was_blamed', 'was_saved', 'was_passed_over', 'went_hungry',
      'lost_home', 'stole', 'unspoken',
    ].map((kind) => `memory.${kind}`);

    expect([...fixed, ...buildings, ...terrain, ...traits, ...memories]
      .filter((key) => UI_BANK[key] === undefined)).toEqual([]);
  });

  it('una ficha compuesta no filtra claves ni identificadores internos', () => {
    const state = foundGame(7);
    const person = state.people.villagers.find((item) => item.named)!;
    const other = state.people.villagers.find((item) => item.named && item.id !== person.id)!;
    person.traits = ['hot_tempered'];
    person.memories = [{ tick: 0, kind: 'was_passed_over', aboutId: other.id, weight: 5 }];
    person.opinions[other.id] = -70;

    const panel = panelFor({ kind: 'villager', id: person.id }, state);
    expect([panel.title, ...panel.lines].join(' ')).not.toMatch(/\[|hot_tempered|was_passed_over/);

    state.map.terrain[0] = 5;
    expect(panelFor({ kind: 'terrain', x: 0, y: 0 }, state).title).toBe('clearing');
  });
});
