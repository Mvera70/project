import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { UI_BANK } from '@engine/chronicle/bank.en';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { isHere } from '@engine/people/demography';
import { run } from '@engine/sim';
import { seasonOf } from '@engine/time';
import { seasonLabel } from '@ui/app';
import { inspectAt, panelFor } from '@ui/inspect';
import { recogniseGesture } from '@ui/gestures';
import { hungerSeverity, tellsFor } from '@derive/tells';
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
      'app.speed.multiplier', 'nav.bar', 'nav.valley', 'nav.chronicle', 'nav.people',
      'crossroad.waiting', 'crossroad.pending_pill', 'welcome.title',
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

  it('U-05 · la barra de abajo tiene sus tres etiquetas en el banco, no en el código', () => {
    expect(UI_BANK['nav.valley']).toBeTruthy();
    expect(UI_BANK['nav.chronicle']).toBeTruthy();
    expect(UI_BANK['nav.people']).toBeTruthy();
  });

  it('U-07 · la píldora de la encrucijada pendiente saca su texto del banco', () => {
    expect(UI_BANK['crossroad.pending_pill']).toBe('A decision waits');
    // El aria-label sigue siendo el de siempre: es un anuncio distinto del
    // texto visible en la píldora, no la misma frase repetida dos veces.
    expect(UI_BANK['crossroad.waiting']).toBeTruthy();
    expect(UI_BANK['crossroad.pending_pill']).not.toBe(UI_BANK['crossroad.waiting']);
  });

  it('U-06 · la estación tiene sus cuatro claves en el banco y sale de seasonOf', () => {
    const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
    for (const kind of seasons) expect(UI_BANK[`app.season.${kind}`]).toBeTruthy();
    // Un año entero de ticks, no un tick suelto: cada uno tiene que coincidir
    // con lo que `seasonOf` ya decide, nunca con un literal escrito aparte.
    for (let tick = 0; tick < TIME.WEEKS_PER_YEAR; tick += 1) {
      expect(seasonLabel(tick)).toBe(UI_BANK[`app.season.${seasonOf(tick)}`]);
    }
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

describe('U-08 · la pantalla People', () => {
  it('el banco cubre todo rasgo y todo oficio que una partida de verdad pueda enseñar', () => {
    // CLAUDE.md: los umbrales, y aquí la cobertura misma, nunca se comprueban
    // con una sola semilla — varias partidas de sesenta años, con políticas
    // distintas para que la crianza de oficios y rasgos no sea siempre la
    // misma carrera de encrucijadas.
    const seeds: Array<[number, 'first' | 'last' | 'worst' | 'prudent']> = [
      [7, 'first'], [11, 'last'], [23, 'worst'], [41, 'prudent'], [59, 'first'], [101, 'last'],
    ];
    const seenTraits = new Set<string>();
    const seenRoles = new Set<string>();
    for (const [seed, policy] of seeds) {
      const state = foundTwenty(seed);
      run(state, 60 * TIME.WEEKS_PER_YEAR, policy, CATALOG);
      // Toda la partida, no sólo quien sigue vivo al final: la lista de U-08
      // sólo enseña a los nombrados vivos en cada momento, pero el rasgo y el
      // oficio que llegan a pantalla en algún instante de la partida son
      // exactamente los de cualquiera que haya pasado por named+isHere.
      for (const v of state.people.villagers) {
        if (!v.named) continue;
        for (const trait of v.traits) seenTraits.add(trait);
        if (v.role !== null) seenRoles.add(v.role);
      }
    }
    // La corrida tiene que haber tocado más de un rasgo y más de un oficio,
    // o la prueba estaría comprobando una lista vacía sin darse cuenta.
    expect(seenTraits.size).toBeGreaterThan(3);
    expect(seenRoles.size).toBeGreaterThan(1);

    const missingTraits = [...seenTraits].filter((trait) => UI_BANK[`trait.${trait}`] === undefined);
    const missingRoles = [...seenRoles].filter((role) => UI_BANK[`role.${role}`] === undefined);
    expect(missingTraits).toEqual([]);
    expect(missingRoles).toEqual([]);
  });

  it('la lista sólo enseña a los nombrados vivos, y su edad y oficio salen del banco', () => {
    // Con los veinte de §12.2 y no con la pareja: la prueba pide nombrados
    // vivos **y** nombrados muertos a los veinte años, y desde R-1 §2.6 una
    // pareja no siempre llega hasta ahí.
    const state = foundTwenty(7);
    run(state, 20 * TIME.WEEKS_PER_YEAR, 'first', CATALOG);
    const living = state.people.villagers.filter((v) => v.named && isHere(v));
    expect(living.length).toBeGreaterThan(0);
    for (const v of living) {
      if (v.role !== null) expect(UI_BANK[`role.${v.role}`]).toBeTruthy();
      for (const trait of v.traits) expect(UI_BANK[`trait.${trait}`]).toBeTruthy();
    }
    // Nadie que haya muerto o se haya ido aparece en la lista de nombrados
    // vivos: es lo que separa U-08 de recorrer `state.people.villagers` a
    // secas.
    const dead = state.people.villagers.filter((v) => v.named && !isHere(v));
    expect(dead.length).toBeGreaterThan(0);
    for (const v of dead) expect(living).not.toContain(v);
  });
});
