// K5 · Las pieles de la caza (`world/hunting.ts`, `world/fate.ts`, `world/boards.ts`,
// `world/threat.ts`). docs/plan-meta.md, K5; decisiones de Vera del 2 oct 2026.
//
// Lo que guardan estas pruebas es el dilema, no la aritmética: **la piel sale
// de la caza grande** —que sólo existe con el arco o la lanza dados—, y luego
// **o se vende al buhonero** por plata **o se hace peto en la herrería**, y el
// peto **levanta a parte de los que caen en un cerco que aguanta**. Y la regla
// de todos los actos: quien no caza no ve moverse nada.
//
// Las semillas se buscan entre candidatas por su precondición; nunca se fijan.

import { describe, expect, it } from 'vitest';
import { BOARDS, HIDES, THREAT, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run, tick } from '@engine/sim';
import type { GameState, PlayerAct } from '@engine/state';
import { huntOpportunity, type HuntOpportunity, type HuntSpecies } from '@engine/world/hunting';
import { defenders, resistance } from '@engine/world/garrison';
import { smithyOrdersOpen } from '@engine/world/boards';
import { offerLine } from '../../src/ui/offer-line';
import { foundTwenty } from '../helpers/founding';

const SEEDS = [3, 7, 11];

/**
 * Cuatro años con un cazador que toca todas las señales y acierta siempre: la
 * cota de arriba del informe (`tools/reports/k5-report.ts`). Devuelve qué
 * piezas se cobraron y cuántas pieles dejó cada una.
 */
function hunted(seed: number, armed: boolean): { kills: HuntSpecies[]; gained: Record<HuntSpecies, number>; state: GameState } {
  const state = foundTwenty(seed);
  if (armed) state.traits.push('bows', 'arms');
  const gained: Record<HuntSpecies, number> = { partridge: 0, rabbit: 0, deer: 0, boar: 0, bear: 0 };
  const kills: HuntSpecies[] = [];
  let pending: HuntOpportunity | null = null;
  for (let t = 0; t < TIME.WEEKS_PER_YEAR * 4 && state.ended === null; t += 1) {
    const offered: HuntOpportunity | null = pending;
    const acts: PlayerAct[] = offered === null ? [] : [{
      kind: 'hunt', sourceTick: offered.tick, species: offered.species,
      weapon: offered.weapons[offered.weapons.length - 1]!, hits: 1, killed: true,
    }];
    const before = state.village.hides;
    // Ni el buhonero ni los petos: aquí sólo se mira lo que entra.
    state.offer = null;
    tick(state, CATALOG, undefined, acts);
    if (offered !== null && state.acts.at(-1)?.done === true) {
      kills.push(offered.species);
      gained[offered.species] += state.village.hides - before;
    }
    pending = huntOpportunity(state);
  }
  return { kills, gained, state };
}

describe('K5 · la piel sale de la caza grande', () => {
  it('con la honda sola no sale ninguna piel; con arco y lanza, cada pieza grande deja la suya', () => {
    let big = 0;
    for (const seed of SEEDS) {
      const sling = hunted(seed, false);
      expect(sling.kills.length, `semilla ${seed}: con honda se caza`).toBeGreaterThan(0);
      expect(sling.state.village.hides, `semilla ${seed}: perdices y conejos no dan piel`).toBe(0);
      const armed = hunted(seed, true);
      for (const species of ['partridge', 'rabbit', 'deer', 'boar', 'bear'] as const) {
        const n = armed.kills.filter((k) => k === species).length;
        expect(armed.gained[species], `semilla ${seed}, ${species}`).toBe(n * HIDES.PER_KILL[species]);
      }
      big += armed.kills.filter((k) => k === 'deer' || k === 'boar' || k === 'bear').length;
    }
    expect(big, 'y en tres valles armados sale alguna pieza grande').toBeGreaterThan(0);
  });
});

describe('K5 · o se vende al buhonero', () => {
  it('con pieles en los bastidores, el buhonero pide pieles y paga plata', () => {
    let sold = 0;
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      state.village.hides = HIDES.PEDLAR_MAX_HIDES * 3;
      const accept = (s: GameState): PlayerAct[] =>
        s.offer?.id === 'pedlar' ? [{ kind: 'offer', accept: true }] : [];
      for (let t = 0; t < TIME.WEEKS_PER_YEAR * 6 && state.ended === null; t += 1) {
        const offer = state.offer;
        if (offer?.id === 'pedlar') {
          // Todas las que hay, hasta el tope: vender es quedarse sin petos.
          const all = Math.min(HIDES.PEDLAR_MAX_HIDES, Math.floor(state.village.hides));
          expect(offer.takes, 'pide pieles, todas, no leña').toEqual([{ k: 'stat', stat: 'hides', amount: all }]);
          expect(offerLine(offer), 'y la voz lo dice').toContain(`${all} hides`);
        }
        const before = { hides: state.village.hides, silver: state.village.silver };
        const [report] = run(state, 1, 'prudent', CATALOG, accept);
        if (report?.offer?.accepted === true && report.offer.id === 'pedlar') {
          sold += 1;
          const all = Math.min(HIDES.PEDLAR_MAX_HIDES, Math.floor(before.hides));
          expect(before.hides - state.village.hides, 'se van todas, hasta el tope').toBe(all);
          expect(state.village.silver - before.silver, 'a su precio').toBe(all * HIDES.PEDLAR_SILVER_PER_HIDE);
          expect(state.chronicle.at(-1)?.templateKey === 'offer.pedlar.hides.taken'
            || state.chronicle.some((e) => e.templateKey === 'offer.pedlar.hides.taken'), 'y se cuenta').toBe(true);
        }
      }
    }
    expect(sold, 'en tres valles y seis años el buhonero compra cuero alguna vez').toBeGreaterThan(0);
  });

  it('sin pieles, el buhonero sigue pidiendo leña', () => {
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      for (let t = 0; t < TIME.WEEKS_PER_YEAR * 6 && state.ended === null; t += 1) {
        run(state, 1, 'prudent', CATALOG);
        if (state.offer?.id === 'pedlar') {
          expect(state.offer.takes.every((g) => g.k !== 'stat' || g.stat === 'wood'), `semilla ${seed}`).toBe(true);
        }
      }
      expect(state.village.hides, 'y nadie inventa una piel').toBe(0);
    }
  });
});

describe('K5 · o se hace peto en la herrería', () => {
  it('el encargo de petos se paga con pieles y no toca la leña del invierno', () => {
    const state = foundTwenty(7);
    let id = state.buildings.reduce((n, b) => Math.max(n, b.id + 1), 0);
    state.buildings.push({
      id: id++, kind: 'smithy', x: 30, y: 44, w: 2, h: 2, builtTick: 0,
      lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
    state.people.villagers.find((v) => v.diedTick === null && v.leftTick === null && v.bornTick < -16 * TIME.WEEKS_PER_YEAR)!.role = 'smith';
    const price = BOARDS.ORDERS.jerkins;
    state.village.wood = 0;
    state.village.silver = price.silver;
    state.village.hides = price.hides - 1;
    const short = smithyOrdersOpen(state).find((o) => o.id === 'jerkins')!;
    expect(short.refusal, 'sin pieles bastantes, no').toBe('cost');
    state.village.hides = price.hides;
    const open = smithyOrdersOpen(state).find((o) => o.id === 'jerkins')!;
    expect(open.refusal, 'con las pieles, sí, aunque la leñera esté vacía').toBeNull();
    tick(state, CATALOG, undefined, [{ kind: 'smithy', order: 'jerkins' }]);
    expect(state.village.hides, 'las pieles se van a la fragua').toBe(0);
    expect(state.chronicle.some((e) => e.templateKey === 'smithy.jerkins.ordered'), 'y se cuenta').toBe(true);
  });
});

/** Una aldea con cerco y una partida que basta para tomarla, llegando ya (como `battle-act.test.ts`). */
function assaulted(seed: number): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 2, 'prudent', CATALOG);
  let id = state.buildings.reduce((n, b) => Math.max(n, b.id + 1), 0);
  const put = (kind: 'palisade' | 'gate', x: number, y: number): void => {
    state.buildings.push({
      id: id++, kind, x, y, w: 1, h: 1, builtTick: state.tick,
      lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
  };
  put('gate', 30, 40);
  for (let n = 1; n <= 6; n += 1) put('palisade', 30 + n, 40);
  state.threat.comingTick = state.tick + 1;
  state.threat.comingBand = Math.ceil(resistance(state) * THREAT.STORM_ODDS) + 1;
  return state;
}

describe('K5 · y el peto levanta a los que caen en el cerco', () => {
  it('con los petos en marcha, de los caídos en un asalto aguantado se levanta la mitad', () => {
    for (const seed of SEEDS) {
      const results = [false, true].map((jerkins) => {
        const state = assaulted(seed);
        // El encargo en marcha, como lo deja `orderSmithy`.
        if (jerkins) state.flags['smithy:jerkins'] = state.tick + BOARDS.ORDER_WEEKS;
        tick(state, CATALOG);
        const dead = state.people.villagers.filter((v) => v.causeOfDeath === 'violence').length;
        // Que caigan todos los que subieron al cerco.
        const lost = defenders(state);
        tick(state, CATALOG, undefined, [{
          kind: 'battle', slain: Math.round(state.threat.lastBand * 0.6), lost, breached: false,
        }]);
        expect(state.ended, `semilla ${seed}: el cerco aguantó`).toBeNull();
        return {
          lost,
          fell: state.people.villagers.filter((v) => v.causeOfDeath === 'violence').length - dead,
          said: state.chronicle.find((e) => e.templateKey === 'raid.held.jerkins'),
        };
      });
      const [bare, wearing] = results;
      const lost = bare!.lost;
      const up = Math.floor(lost * BOARDS.JERKIN_SAVE);
      expect(lost, `semilla ${seed}: suben al menos dos`).toBeGreaterThanOrEqual(2);
      expect(bare!.fell, `semilla ${seed}: sin peto caen los ${lost}`).toBe(lost);
      expect(wearing!.fell, `semilla ${seed}: con peto se levantan ${up}`).toBe(lost - up);
      expect(bare!.said, 'sin peto no hay línea del cuero').toBeUndefined();
      expect(wearing!.said?.params['count'], 'y la crónica cuenta a los que se levantaron').toBe(up);
    }
  });

  it('v5.81 · con un parte que trae `spared`, el peto ya obró en la escena: no se levanta nadie más, y se cuenta', () => {
    for (const seed of SEEDS) {
      const state = assaulted(seed);
      state.flags['smithy:jerkins'] = state.tick + BOARDS.ORDER_WEEKS;
      tick(state, CATALOG);
      const dead = state.people.villagers.filter((v) => v.causeOfDeath === 'violence').length;
      const lost = defenders(state);
      tick(state, CATALOG, undefined, [{
        kind: 'battle', slain: Math.round(state.threat.lastBand * 0.6), lost, breached: false, spared: 2,
      }]);
      expect(state.ended, `semilla ${seed}: el cerco aguantó`).toBeNull();
      const fell = state.people.villagers.filter((v) => v.causeOfDeath === 'violence').length - dead;
      expect(fell, `semilla ${seed}: caen todos los del parte, sin levantar a la mitad otra vez`).toBe(lost);
      const said = state.chronicle.find((e) => e.templateKey === 'raid.held.jerkins');
      expect(said?.params['count'], 'la crónica cuenta a los que el peto dejó en pie').toBe(2);
    }
  });
});
