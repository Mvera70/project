// K8+K9 · Los tablones de la herrería y de la iglesia (`world/boards.ts`).
//
// Lo que guardan estas pruebas son las decisiones de Vera del 2 oct 2026: los
// encargos de la herrería duran un año y cada uno inclina hacia un recurso (el
// hacha y el arado del carro pasan a la fragua); la misa sube el ánimo y sólo
// cuesta el día de trabajo, nunca sale mal; la rogativa cuesta fe y bendice la
// siega. Y la regla de todos los actos: ninguno tira dados.
//
// Las semillas se buscan entre candidatas por su precondición (una aldea con
// herrería, herrero, capilla y cura), nunca se fijan.

import { describe, expect, it } from 'vitest';
import { BOARDS, LABOUR, MEANS, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run, tick } from '@engine/sim';
import { produce, allocateLabour } from '@engine/subsistence/labour';
import { harvest } from '@engine/subsistence/harvest';
import { deserialize, serialize } from '@engine/save';
import type { GameState } from '@engine/state';
import { holdRite, liveOrder, orderSmithy, ritesOpen, smithyOrdersOpen, smithyWeek } from '@engine/world/boards';
import { refusalFor } from '@engine/world/means';
import { gatheringsAt } from '@derive/gatherings';
import { foundTwenty } from '../helpers/founding';

const CANDIDATES = [3, 7, 11, 17, 23, 31, 41];
const ENOUGH = 3;

const here = (s: GameState, role: string): boolean =>
  s.people.villagers.some((v) => v.diedTick === null && v.leftTick === null && v.role === role);
const ready = (s: GameState): boolean =>
  s.buildings.some((b) => b.kind === 'smithy' && b.lostTick === null && b.lit)
  && s.buildings.some((b) => (b.kind === 'chapel' || b.kind === 'church') && b.lostTick === null)
  && here(s, 'smith') && here(s, 'priest');

/** Aldeas con los dos edificios y sus oficios, jugadas como el juego (`run`, prudente). */
const villages: GameState[] = [];
for (const seed of CANDIDATES) {
  if (villages.length >= ENOUGH) break;
  const s = foundTwenty(seed);
  for (let year = 0; year < 12 && !ready(s); year += 1) run(s, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
  if (ready(s)) {
    s.village.wood = 400;
    s.village.silver = 60;
    s.village.faith = 80;
    s.village.morale = 40;
    villages.push(s);
  }
}

const clone = (s: GameState): GameState => structuredClone(s);

describe('K8 · el tablón de la herrería', () => {
  it('hay aldeas de prueba', () => {
    expect(villages.length).toBe(ENOUGH);
  });

  it('un encargo se paga, dura un año y la herrería hace uno cada vez', () => {
    for (const base of villages) {
      const s = clone(base);
      const rng = JSON.stringify(s.rng);
      const out = orderSmithy(s, 'axes', 1);
      expect(out.done).toBe(true);
      expect(s.village.wood).toBe(400 - BOARDS.ORDERS.axes.wood);
      expect(s.village.silver).toBe(60 - BOARDS.ORDERS.axes.silver);
      expect(liveOrder(s)).toEqual({ order: 'axes', until: s.tick + BOARDS.ORDER_WEEKS });
      expect(smithyOrdersOpen(s).every((o) => o.refusal === 'busy')).toBe(true);
      expect(JSON.stringify(s.rng), 'un acto no tira dados').toBe(rng);
      // Al año se acaba, se cuenta y el herrero queda libre.
      s.tick += BOARDS.ORDER_WEEKS;
      const done = smithyWeek(s, 2);
      expect(done.map((e) => e.templateKey)).toContain('smithy.axes.done');
      expect(liveOrder(s)).toBeNull();
      expect(smithyOrdersOpen(s).find((o) => o.id === 'axes')!.refusal).toBeNull();
    }
  });

  it('sin herrería no hay tablón, y sin con qué pagar no se encarga', () => {
    const s = clone(villages[0]!);
    s.village.silver = 0;
    expect(smithyOrdersOpen(s).find((o) => o.id === 'axes')!.refusal).toBe('cost');
    for (const b of s.buildings) if (b.kind === 'smithy') b.lostTick = s.tick;
    expect(smithyOrdersOpen(s).every((o) => o.refusal === 'smithy')).toBe(true);
  });

  it('las hachas inclinan hacia la madera y las rejas hacia el grano, como el hacha y el arado', () => {
    for (const base of villages) {
      const plain = clone(base);
      const axes = clone(base);
      orderSmithy(axes, 'axes', 1);
      const a = allocateLabour(plain);
      // Mismas manos: lo que cambia es lo que trae cada una.
      const woodPlain = produce(plain, a).wood;
      const woodAxes = produce(axes, a).wood;
      expect(woodAxes / woodPlain).toBeCloseTo(MEANS.AXE_WOOD, 5);
      const ploughed = clone(base);
      orderSmithy(ploughed, 'ploughshares', 1);
      expect(allocateLabour(ploughed).farmers, 'el arado libera manos del campo').toBeLessThan(allocateLabour(clone(base)).farmers);
    }
  });

  it('los herrajes convierten madera en plata: la del camino en una década, en un año', () => {
    const s = clone(villages[0]!);
    orderSmithy(s, 'ironware', 1);
    const silver = s.village.silver;
    for (let k = 0; k < BOARDS.ORDER_WEEKS; k += 1) { s.tick += 1; smithyWeek(s, 1); }
    const sold = Math.floor(BOARDS.ORDER_WEEKS / BOARDS.WARES_EVERY) * BOARDS.WARES_SILVER;
    expect(s.village.silver - silver).toBe(sold);
    expect(sold).toBeGreaterThan(BOARDS.ORDERS.axes.silver * 2);
  });

  it('con herrería, el hacha y el arado ya no se piden al carro', () => {
    const s = clone(villages[0]!);
    expect(refusalFor(s, 'axe')).toBe('smithy');
    expect(refusalFor(s, 'plough')).toBe('smithy');
    expect(refusalFor(s, 'ale')).not.toBe('smithy');
  });
});

describe('K8 · el tablón de la iglesia', () => {
  it('la misa sube el ánimo con la fe, nunca lo baja, y cuesta el día de trabajo', () => {
    for (const base of villages) {
      for (const faith of [0, 40, 100]) {
        const s = clone(base);
        s.village.faith = faith;
        const morale = s.village.morale;
        expect(holdRite(s, 'mass', 1).done).toBe(true);
        expect(s.village.morale - morale).toBe(Math.round(BOARDS.MASS_MORALE * faith / 100));
        expect(s.village.morale).toBeGreaterThanOrEqual(morale);
      }
      // El día de trabajo: la semana de la misa la obra y la leña rinden menos.
      const plain = clone(base);
      const mass = clone(base);
      holdRite(mass, 'mass', 1);
      const a = allocateLabour(plain);
      expect(produce(mass, a).buildPoints / produce(plain, a).buildPoints).toBeCloseTo(1 - BOARDS.MASS_WORK_LOSS, 5);
      // Y una por temporada.
      expect(ritesOpen(mass).find((r) => r.id === 'mass')!.refusal).toBe('soon');
    }
  });

  it('la misa se ve: la aldea se junta en la capilla', () => {
    const s = clone(villages[0]!);
    holdRite(s, 'mass', 1);
    const chapel = s.buildings.find((b) => (b.kind === 'chapel' || b.kind === 'church') && b.lostTick === null)!;
    const met = gatheringsAt(s, CATALOG);
    expect(met.some((g) => Math.hypot(g.x - (chapel.x + chapel.w / 2), g.y - (chapel.y + chapel.h / 2)) < 0.01)).toBe(true);
  });

  it('la rogativa cuesta fe y la siega siguiente rinde más, una vez', () => {
    for (const base of villages) {
      const s = clone(base);
      const faith = s.village.faith;
      expect(holdRite(s, 'rogation', 1).done).toBe(true);
      expect(s.village.faith).toBe(faith - BOARDS.ROGATION_FAITH);
      expect(ritesOpen(s).find((r) => r.id === 'rogation')!.refusal).toBe('blessed');
      // A la semana de la siega, la misma cosecha con y sin bendición.
      const at = s.flags['rite:rogation']!;
      const blessed = clone(s);
      const plain = clone(base);
      blessed.tick = at; plain.tick = at;
      const a = allocateLabour(plain);
      const yieldBlessed = harvest(blessed, a).yielded;
      const yieldPlain = harvest(plain, a).yielded;
      expect(yieldBlessed / yieldPlain).toBeCloseTo(BOARDS.ROGATION_YIELD, 5);
    }
  });

  it('sin cura no hay rito, y sin fe no hay procesión', () => {
    const s = clone(villages[0]!);
    s.village.faith = BOARDS.ROGATION_FAITH - 1;
    expect(ritesOpen(s).find((r) => r.id === 'rogation')!.refusal).toBe('faith');
    for (const v of s.people.villagers) if (v.role === 'priest') v.role = null;
    expect(ritesOpen(s).every((r) => r.refusal === 'priest')).toBe(true);
  });
});

describe('K8 · por la puerta de los actos', () => {
  it('entran por `PlayerAct`, se apuntan, y la partida guardada los recarga', () => {
    const s = clone(villages[0]!);
    tick(s, CATALOG, undefined, [{ kind: 'smithy', order: 'ironware' }, { kind: 'rite', rite: 'mass' }]);
    const mine = s.acts.filter((a) => a.tick === s.tick);
    expect(mine.map((a) => a.act.kind)).toEqual(['smithy', 'rite']);
    expect(mine.every((a) => a.done)).toBe(true);
    expect(s.chronicle.some((e) => e.templateKey === 'smithy.ironware.ordered')).toBe(true);
    expect(s.chronicle.some((e) => e.templateKey === 'rite.mass.held')).toBe(true);
    const back = deserialize(structuredClone(serialize(s, [], [], 0))).state;
    expect(back.acts.slice(-2).map((a) => a.act.kind)).toEqual(['smithy', 'rite']);
    void LABOUR;
  });
});
