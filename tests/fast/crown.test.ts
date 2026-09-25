// K-1 · La corona. `docs/historico/plan-rey.md`.
//
// **Lo que se guarda aquí es que dar la corona sea un acto del jugador como dar
// un arado**: se paga con lo del valle, se apunta, se cuenta, y **no mueve una
// sola tirada**. Lo que el rey hace con ella lo mide `crown-will.test.ts`.
//
// El encargo del dueño del diseño, con sus palabras (18 sep 2026): «el rey se
// podrá elegir en algún momento de la partida; sustituirá a lo que tenemos
// actualmente como líder».

import { describe, expect, it } from 'vitest';
import { CROWN, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run, tick } from '@engine/sim';
import { population } from '@engine/people/demography';
import { crownCandidates, crownRefusal, kingOf, RESTING_WILL, styleOf, will } from '@engine/people/crown';
import { crownKing } from '@engine/world/crown';
import { applyEffect } from '@engine/crossroads/resolve';
import { CROSSROAD_BANK, UI_BANK } from '@engine/chronicle/bank.en';
import { crownRow, roleKeyFor } from '@derive/crown';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

/**
 * Una aldea con gente y plata de sobra: coronar no es lo que se está midiendo.
 *
 * **Semilla 41 y quince años**, y el número está medido: la corona pide treinta
 * personas (`CROWN.MIN_PEOPLE`, el umbral de la capilla) y la semilla 7 —la de
 * costumbre en estas pruebas— sólo tiene 19 al año 15 y 25 al 35. La 41 llega a
 * 40 al año 15. Medido en seis semillas antes de elegirla.
 */
const grown = new Map<string, GameState>();
function rich(seed = 41, years = 15): GameState {
  // **Se juega una vez y se clona**, que es lo que hace `graphics-effects`:
  // quince años cuestan medio segundo y doce pruebas los pagaban doce veces
  // (6,7 s de los veinte que tiene la suite rápida entera). Clonar cuesta
  // milisegundos y cada prueba sigue teniendo su copia para destrozarla.
  const key = `${seed}:${years}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
    base.village.silver = CROWN.SILVER * 3;
    grown.set(key, base);
  }
  return structuredClone(base);
}

describe('K-1 · la corona se da, y se paga', () => {
  it('cuesta exactamente su plata y nada más', () => {
    const state = rich();
    const before = { ...state.village };
    const who = crownCandidates(state)[0];
    expect(who, 'hay a quién coronar').toBeDefined();
    if (who === undefined) return;
    const out = crownKing(state, who.id, 'spring', 3);
    expect(out.crowned).toBe(true);
    expect(state.village.silver).toBe(before.silver - CROWN.SILVER);
    expect(state.village.grain).toBe(before.grain);
    expect(state.village.wood).toBe(before.wood);
    expect(state.village.stone).toBe(before.stone);
  });

  it('el rey ocupa el asiento del jefe, y su oficio queda anotado', () => {
    // Es la sustitución que se pidió: «sustituirá a lo que tenemos actualmente
    // como líder». El asiento es el mismo —siete plantillas lo reparten— y lo
    // que cambia es quién lo ocupa y que **el oficio de antes se recuerda**,
    // porque es lo que decide el estilo.
    const state = rich();
    // Un herrero **vivo**: la prueba cogía al primero con nombre, y cuando el
    // cielo pasó a cambiar con la estación (25 sep 2026) el de la semilla 41
    // murió antes del año quince y la corona, con razón, no se le daba.
    const smith = state.people.villagers.find((v) => v.role === 'smith' && v.named
      && v.diedTick === null && v.leftTick === null);
    const who = smith ?? crownCandidates(state)[0];
    expect(who).toBeDefined();
    if (who === undefined) return;
    const trade = who.role;
    const out = crownKing(state, who.id, 'spring', 3);
    expect(out.crowned).toBe(true);
    expect(who.role).toBe('leader');
    expect(state.crown?.id).toBe(who.id);
    expect(state.crown?.trade).toBe(trade);
    expect(kingOf(state)?.id).toBe(who.id);
    expect(will(state).style).toBe(styleOf(trade));
  });

  it('y el desplazado se queda sin puesto, y no lo olvida', () => {
    const state = rich();
    // **El que manda vivo**, no el primero con el asiento en la lista: un jefe
    // muerto conserva su `role` hasta que `fillVacancies` reparte el puesto, y
    // buscar sin mirar si está presente saca al difunto (medido: en la semilla
    // 41 al año 15 hay un `leader` muerto con id 3 y el vivo es el 5).
    const old = state.people.villagers.find(
      (v) => v.role === 'leader' && v.diedTick === null && v.leftTick === null,
    );
    const who = crownCandidates(state).find((v) => v.id !== old?.id);
    expect(old).toBeDefined();
    expect(who).toBeDefined();
    if (old === undefined || who === undefined) return;
    // La opinión **baja** lo que A.15 cobra; no acaba en ese número. El
    // desplazado podía tenerle aprecio al coronado —medido: +1,91 en la semilla
    // 41— y lo que el desaire hace es restar, no fijar.
    const before = old.opinions[who.id] ?? 0;
    const out = crownKing(state, who.id, 'spring', 3);
    expect(out.setAside).toBe(old.id);
    expect(old.role).toBeNull();
    expect(old.opinions[who.id] ?? 0).toBeCloseTo(before + CROWN.SET_ASIDE_OPINION, 6);
    expect(old.memories.some((m) => m.kind === 'was_passed_over' && m.aboutId === who.id)).toBe(true);
    expect(out.entries.some((e) => e.templateKey === 'crown.set_aside')).toBe(true);
  });

  it('coronar al que ya mandaba no crea enemigo', () => {
    const state = rich();
    const old = state.people.villagers.find(
      (v) => v.role === 'leader' && v.diedTick === null && v.leftTick === null,
    );
    expect(old).toBeDefined();
    if (old === undefined) return;
    const out = crownKing(state, old.id, 'spring', 3);
    expect(out.crowned).toBe(true);
    expect(out.setAside).toBeNull();
    expect(state.crown?.trade).toBe('leader');
    expect(out.entries).toHaveLength(1);
  });
});

describe('K-1 · y no se da a cualquiera ni de cualquier manera', () => {
  it('cada negativa tiene su motivo, y el estado no cambia', () => {
    const small = foundTwenty(7);
    small.village.silver = CROWN.SILVER * 3;
    expect(population(small)).toBeLessThan(CROWN.MIN_PEOPLE);
    expect(crownRefusal(small)).toBe('small');

    const poor = rich();
    expect(population(poor)).toBeGreaterThanOrEqual(CROWN.MIN_PEOPLE);
    poor.village.silver = CROWN.SILVER - 1;
    expect(crownRefusal(poor)).toBe('cost');

    const state = rich();
    const before = JSON.stringify(state);
    const anon = state.people.villagers.find((v) => !v.named);
    if (anon !== undefined) {
      const out = crownKing(state, anon.id, 'spring', 3);
      expect(out.crowned).toBe(false);
      expect(out.refusal).toBe('who');
      expect(JSON.stringify(state)).toBe(before);
    }

    const twice = rich();
    const who = crownCandidates(twice)[0];
    if (who !== undefined) {
      crownKing(twice, who.id, 'spring', 3);
      const again = crownCandidates(twice)[1] ?? who;
      const out = crownKing(twice, again.id, 'spring', 3);
      expect(out.crowned).toBe(false);
      expect(out.refusal).toBe('already');
    }
  });

  it('los candidatos son los nombrados presentes en la banda de la sucesión', () => {
    const state = rich();
    const [young, old] = CROWN.CANDIDATE_AGES;
    for (const v of crownCandidates(state)) {
      expect(v.named).toBe(true);
      expect(v.diedTick).toBeNull();
      expect(v.leftTick).toBeNull();
      const age = Math.floor((state.tick - v.bornTick) / TIME.WEEKS_PER_YEAR);
      expect(age).toBeGreaterThanOrEqual(young);
      expect(age).toBeLessThanOrEqual(old);
    }
    // Y ordenados por id, para que la lista no dependa del orden del array.
    const ids = crownCandidates(state).map((v) => v.id);
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
  });
});

describe('K-1 · coronar no mueve el azar', () => {
  it('ni una tirada, en ningún flujo', () => {
    // La garantía de §4.3 para un acto del jugador, la misma que `means.test.ts`
    // le pide a los medios: el jugador elige a quién, el estilo sale de una
    // tabla y el precio es plata. Si esto se rompiera, coronar desplazaría la
    // partida entera y dos jugadores con la misma semilla verían valles
    // distintos.
    const a = rich();
    const b = rich();
    const who = crownCandidates(a)[0];
    expect(who).toBeDefined();
    if (who === undefined) return;
    crownKing(a, who.id, 'spring', 3);
    expect(a.rng).toEqual(b.rng);
  });

  it('y una partida coronada en el mismo tick es la misma partida', () => {
    const play = (): GameState => {
      const state = rich(11, 15);
      const who = crownCandidates(state)[0];
      if (who !== undefined) crownKing(state, who.id, 'spring', 3);
      run(state, TIME.WEEKS_PER_YEAR * 20, 'prudent', CATALOG);
      return state;
    };
    expect(JSON.stringify(play())).toBe(JSON.stringify(play()));
  });
});

describe('K-1 · sin corona, el valle es el de siempre', () => {
  it('la voluntad de un valle sin rey es la de reposo', () => {
    // **Es la garantía de §13.1 hecha aserto**: una partida sin coronar tiene
    // que ser byte a byte la de antes de esta fase, y lo que lo asegura es que
    // `will()` devuelva exactamente lo que el motor leía de la postura retirada.
    const state = foundTwenty(7);
    expect(state.crown).toBeNull();
    expect(will(state)).toEqual(RESTING_WILL);
    run(state, TIME.WEEKS_PER_YEAR * 20, 'prudent', CATALOG);
    expect(will(state)).toEqual(RESTING_WILL);
    expect(kingOf(state)).toBeNull();
  });

  it('y el jefe de la fundación manda sin ejercer nada', () => {
    const state = foundTwenty(7);
    const leader = state.people.villagers.find((v) => v.role === 'leader');
    expect(leader, 'la fundación pone un jefe').toBeDefined();
    expect(kingOf(state), 'pero no es rey hasta que se le corona').toBeNull();
  });
});

describe('K-1 · el acto entra por el tick y queda apuntado', () => {
  it('la coronación se juega en el paso 1b y se cuenta', () => {
    const state = rich();
    const who = crownCandidates(state)[0];
    expect(who).toBeDefined();
    if (who === undefined) return;
    const report = tick(state, CATALOG, undefined, [{ kind: 'crown', who: who.id }]);
    expect(report.crown?.crowned).toBe(true);
    expect(state.acts.at(-1)?.act).toEqual({ kind: 'crown', who: who.id });
    expect(state.acts.at(-1)?.done).toBe(true);
    expect(state.chronicle.some((e) => e.templateKey.startsWith('crown.given.'))).toBe(true);
  });

  it('y una coronación imposible queda apuntada como no hecha', () => {
    const state = foundTwenty(7);
    const someone = state.people.villagers.find((v) => v.named);
    expect(someone).toBeDefined();
    if (someone === undefined) return;
    const report = tick(state, CATALOG, undefined, [{ kind: 'crown', who: someone.id }]);
    expect(report.crown?.crowned).toBe(false);
    expect(state.acts.at(-1)?.done).toBe(false);
    expect(state.crown).toBeNull();
  });
});

describe('K-3 · la corona pasa por la sucesión', () => {
  it('el sucesor la toma con el estilo de su oficio', () => {
    // A.15 pregunta a quién le toca mandar cuando el que mandaba muere, y desde
    // la corona esa pregunta decide también **qué clase de rey** viene: un rey
    // del arado muere, le sucede el herrero, y la aldea empieza a mirar a las
    // murallas. Sin plantilla nueva: la pregunta ya existía.
    const state = rich();
    const first = crownCandidates(state)[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    first.role = 'reeve';
    crownKing(state, first.id, 'spring', 3);
    expect(will(state).style).toBe('plough');

    // El rey muere y otro toma el asiento por el camino de siempre: el efecto
    // `role: 'leader'` de la decisión.
    const heir = state.people.villagers.find(
      (v) => v.id !== first.id && v.named && v.diedTick === null && v.leftTick === null,
    );
    expect(heir).toBeDefined();
    if (heir === undefined) return;
    heir.role = 'smith';
    first.diedTick = state.tick;
    // Con el trono vacante, la aldea vuelve a hacer lo que hacía sola.
    expect(will(state)).toEqual(RESTING_WILL);

    applyEffect(state, { A: heir.id, B: heir.id }, { k: 'role', who: 'A', role: 'leader' }, {
      templateId: 'succession', optionId: 'choose_a', killed: [], left: [], arrived: [],
      seedsPlanted: [], build: [], destroy: [], fell: [], visible: [],
    });
    expect(state.crown?.id).toBe(heir.id);
    expect(state.crown?.trade).toBe('smith');
    expect(will(state).style).toBe('forge');
  });

  it('y la pregunta de la sucesión no dice «jefe» ni «rey»', () => {
    // La propiedad del texto: el mismo cartel vale para un valle con jefe y para
    // uno con rey, porque es la misma pregunta. Si alguien vuelve a escribir «the
    // leader is buried», un valle con rey recién enterrado leería algo falso.
    const body = CROSSROAD_BANK['crossroad.succession.body'];
    expect(typeof body).toBe('string');
    expect(String(body).toLowerCase()).not.toContain('leader');
    expect(String(body).toLowerCase()).not.toContain('king');
  });
});

describe('K-5 · lo que la pantalla lee de la corona', () => {
  it('sin rey, la fila trae candidatos con lo que hace falta para elegir', () => {
    const state = rich();
    const row = crownRow(state, TIME.WEEKS_PER_YEAR);
    expect(row.style).toBeNull();
    expect(row.candidates.length).toBeGreaterThan(0);
    for (const who of row.candidates) {
      expect(who.name.length).toBeGreaterThan(0);
      expect(who.age).toBeGreaterThanOrEqual(CROWN.CANDIDATE_AGES[0]);
      // **Hacia dónde tiraría el valle con él**, que es la información nueva y
      // la que hace legible la elección.
      expect(who.styleKey.startsWith('crown.style.')).toBe(true);
      expect(UI_BANK[who.styleKey], who.styleKey).toBeDefined();
      for (const key of who.traitKeys) expect(UI_BANK[key], key).toBeDefined();
      if (who.roleKey !== null) expect(UI_BANK[who.roleKey], who.roleKey).toBeDefined();
    }
  });

  it('con rey, la fila no ofrece nada y dice desde cuándo reina', () => {
    // La corona no se quita ni se cambia de cabeza: cuando el rey muera la
    // pasará la sucesión (§6.6), que es lo que cobra el interregno.
    const state = rich();
    const who = crownCandidates(state)[0];
    if (who === undefined) return;
    crownKing(state, who.id, 'spring', 3);
    const row = crownRow(state, TIME.WEEKS_PER_YEAR);
    expect(row.candidates).toHaveLength(0);
    expect(row.style).not.toBeNull();
    expect(row.kingName).toBe(who.name);
    expect(row.sinceYear).toBeGreaterThan(0);
  });

  it('y el asiento se lee «king» sólo cuando hay corona', () => {
    // El identificador del motor sigue siendo `leader` para siempre —siete
    // plantillas lo reparten y se guarda en las partidas—, así que la palabra la
    // pone esta capa y nada más.
    const state = rich();
    const leader = state.people.villagers.find(
      (v) => v.role === 'leader' && v.diedTick === null && v.leftTick === null,
    );
    expect(leader).toBeDefined();
    if (leader === undefined) return;
    expect(roleKeyFor(state, leader)).toBe('role.leader');
    crownKing(state, leader.id, 'spring', 3);
    expect(roleKeyFor(state, leader)).toBe('role.king');
    expect(UI_BANK['role.king']).toBeDefined();
  });
});
