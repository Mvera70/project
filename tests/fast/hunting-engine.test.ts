import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { huntOpportunity, settleHunt } from '../../src/engine/world/hunting';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { tick } from '../../src/engine/sim';
import { renderEntry } from '../../src/engine/chronicle/render';

describe('progresión de la caza', () => {
  it('no ofrece ciervos al inicio aunque haya arco y deja la primera pieza en la crónica', () => {
    const state = foundTwenty(11);
    state.traits.push('bows');
    expect(huntOpportunity(state)?.species).not.toBe('deer');
    // Ni un guardado con un hito intermedio suelto puede saltarse la perdiz.
    state.flags['hunt:rabbit'] = 0;
    expect(huntOpportunity(state)?.species).not.toBe('deer');
    state.flags['hunt:partridge'] = 0;
    let offer = huntOpportunity(state);
    for (let wait = 0; wait < 100 && offer?.species !== 'deer'; wait += 1) {
      state.tick += 1;
      offer = huntOpportunity(state);
    }
    expect(offer?.species).toBe('deer');
    const sourceTick = state.tick;
    tick(state, CATALOG, undefined, [{ kind: 'hunt', sourceTick,
      species: 'deer', weapon: 'bow', hits: 1, killed: true }]);
    const first = state.chronicle.find(entry => entry.templateKey === 'hunt.first.deer');
    expect(first?.weight).toBe(3);
    expect(first === undefined ? '' : renderEntry(first, state.rng)).toMatch(/first deer/i);
  });

  it('abre las cinco presas en orden y sólo impide repetir al oso', () => {
    const state = foundTwenty(23);
    state.traits.push('bows', 'arms');
    for (const species of ['partridge', 'rabbit', 'deer', 'boar'] as const) {
      let offer = huntOpportunity(state);
      for (let wait = 0; wait < 100 && offer?.species !== species; wait += 1) {
        state.tick += 1;
        offer = huntOpportunity(state);
      }
      expect(offer?.species).toBe(species);
      if (offer === null) return;
      const sourceTick = state.tick;
      state.tick += 1;
      const act = { kind: 'hunt' as const, sourceTick, species,
        weapon: offer.weapons[0]!, hits: species === 'boar' ? 2 : 1, killed: true };
      expect(settleHunt(state, act)).toBe(true);
      state.acts.push({ tick: state.tick, act, done: true });
    }
    state.flags['bear'] = state.tick + 2;
    const final = huntOpportunity(state);
    expect(final?.species).toBe('bear');
    const sourceTick = state.tick;
    state.tick += 1;
    const bear = { kind: 'hunt' as const, sourceTick, species: 'bear' as const,
      weapon: 'spear' as const, hits: 4, killed: true };
    expect(settleHunt(state, bear)).toBe(true);
    expect(huntOpportunity(state)?.species).not.toBe('bear');
    expect(settleHunt(state, bear)).toBe(false);
    let returning = huntOpportunity(state);
    for (let wait = 0; wait < 100 && returning?.species !== 'boar'; wait += 1) {
      state.tick += 1;
      returning = huntOpportunity(state);
    }
    expect(returning?.species).toBe('boar');
  });
  it('empieza por perdices, permite su regreso y abre los conejos tras un impacto', () => {
    const state = foundTwenty(7);
    let encounter = huntOpportunity(state);
    while (encounter === null && state.tick < 100) {
      state.tick += 1;
      encounter = huntOpportunity(state);
    }
    expect(encounter?.species).toBe('partridge');
    const sourceTick = state.tick;
    state.tick += 1;
    expect(settleHunt(state, { kind: 'hunt', sourceTick, species: 'partridge',
      weapon: 'sling', hits: 1, killed: true })).toBe(true);
    expect(state.flags['hunt:partridge']).toBe(0);
    expect(state.village.grain).toBeGreaterThan(0);
    const next = huntOpportunity(state);
    expect(next === null || ['partridge', 'rabbit'].includes(next.species)).toBe(true);
  });

  it('rechaza presa inventada, arma no disponible y segundo parte de una semana', () => {
    const state = foundTwenty(11);
    let opportunity = huntOpportunity(state);
    while (opportunity === null && state.tick < 100) {
      state.tick += 1;
      opportunity = huntOpportunity(state);
    }
    expect(opportunity?.species).toBe('partridge');
    const sourceTick = state.tick;
    const grain = state.village.grain;
    state.tick += 1;
    expect(settleHunt(state, { kind: 'hunt', sourceTick, species: 'bear',
      weapon: 'spear', hits: 1, killed: true })).toBe(false);
    expect(settleHunt(state, { kind: 'hunt', sourceTick, species: 'partridge',
      weapon: 'bow', hits: 1, killed: true })).toBe(false);
    expect(settleHunt(state, { kind: 'hunt', sourceTick, species: 'partridge',
      weapon: 'sling', hits: 0, killed: true })).toBe(false);
    expect(state.village.grain).toBe(grain);
    const valid = { kind: 'hunt' as const, sourceTick, species: 'partridge' as const,
      weapon: 'sling' as const, hits: 1, killed: true };
    expect(settleHunt(state, valid)).toBe(true);
    state.acts.push({ tick: state.tick, act: valid, done: true });
    expect(settleHunt(state, valid)).toBe(false);
  });

  it('el oso sólo aparece tras el jabalí y se resuelve una única vez', () => {
    const state = foundTwenty(13);
    state.traits.push('arms');
    state.flags['bear'] = state.tick + 2;
    state.flags['hunt:partridge'] = 0;
    state.flags['hunt:rabbit'] = 0;
    state.flags['hunt:deer'] = 0;
    expect(huntOpportunity(state)?.species).not.toBe('bear');
    state.flags['hunt:boar'] = 0;
    expect(huntOpportunity(state)).toEqual({ species: 'bear', weapons: ['spear'], tick: state.tick });
    state.flags['hunt:bear'] = 0;
    expect(huntOpportunity(state)?.species).not.toBe('bear');
  });
});
