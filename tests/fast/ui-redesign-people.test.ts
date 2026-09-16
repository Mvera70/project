// UI-R4 · Propiedades puras de `redesign/people-panel.ts` y
// `redesign/inspect-panel.ts`. `docs/ui-redesign/implementation-plan.md`
// §2.5, §4; `docs/ui-redesign/acceptance-scenarios.md` AC-9, AC-10, AC-11,
// AC-12.
//
// Este proyecto no trae jsdom (`docs/ui-redesign/rounds/UI-R1.md` §4), así
// que lo que se comprueba aquí es exactamente lo que los dos módulos dejan
// puro a propósito: qué villagers entran en la lista, qué id habría que
// seguir dado el estado real, y qué enseña la ficha de alguien que ya no
// está. La integración real —clic real sobre una fila, cierre real
// cancelando el seguimiento— se acredita con capturas (`docs/ui-redesign/
// rounds/UI-R4.md`), no aquí.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { isHere, population } from '@engine/people/demography';
import { run } from '@engine/sim';
import { yearOf } from '@engine/time';
import { panelFor } from '@ui/inspect';
import { trackedIdFor } from '@ui/redesign/inspect-panel';
import { namedPresent, peopleScope } from '@ui/redesign/people-panel';

describe('namedPresent · filtro nombrados/presentes (U-08, AC-9)', () => {
  it('coincide exactamente con nombrados && isHere, en el orden del motor', () => {
    const state = foundTwenty(7);
    run(state, 20 * TIME.WEEKS_PER_YEAR, 'first', CATALOG);
    const expected = state.people.villagers.filter((v) => v.named && isHere(v));
    expect(expected.length).toBeGreaterThan(0);
    expect(namedPresent(state)).toEqual(expected);
  });

  it('a los veinte años hay nombrados muertos o marchados que la lista no enseña', () => {
    // La propia lista de U-08 ya lo comprobaba (`tests/fast/ui.test.ts`): esto
    // repite la misma propiedad contra la función pura que ahora usa el panel.
    const state = foundTwenty(7);
    run(state, 20 * TIME.WEEKS_PER_YEAR, 'first', CATALOG);
    const gone = state.people.villagers.filter((v) => v.named && !isHere(v));
    expect(gone.length).toBeGreaterThan(0);
    const shown = namedPresent(state);
    for (const v of gone) expect(shown).not.toContain(v);
  });

  it('es pura: la misma llamada con dos estados distintos nunca mezcla sus resultados', () => {
    // AC-9: "volver a la lista no selecciona otra identidad". No hay estado
    // interno que perpetuar entre dos partidas: se comprueba llamando dos
    // veces seguidas con estados distintos y viendo que ninguna arrastra nada
    // de la otra.
    const a = foundTwenty(7);
    const z = foundTwenty(42);
    const first = namedPresent(a);
    const second = namedPresent(z);
    expect(namedPresent(a)).toEqual(first);
    expect(second).not.toEqual(first);
  });
});

describe('peopleScope · la cifra global puede ser mayor (§2.5)', () => {
  it('el total de población nunca es menor que los nombrados que se enseñan', () => {
    const state = foundTwenty(7);
    run(state, 10 * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    const scope = peopleScope(state);
    expect(scope.named).toBe(namedPresent(state).length);
    expect(scope.population).toBe(population(state));
    expect(scope.population).toBeGreaterThanOrEqual(scope.named);
  });
});

describe('identidad por id, nunca por nombre (AC-9)', () => {
  it('dos nombrados con el mismo nombre siguen distinguiéndose por id', () => {
    const state = foundTwenty(7);
    const [a, b] = state.people.villagers.filter((v) => v.named);
    if (a === undefined || b === undefined) throw new Error('la fundación no nombró a dos');
    a.name = 'Same';
    b.name = 'Same';
    a.traits = ['kind'];
    b.traits = ['spiteful'];
    const panelA = panelFor({ kind: 'villager', id: a.id }, state);
    const panelB = panelFor({ kind: 'villager', id: b.id }, state);
    expect(panelA.title).toBe('Same');
    expect(panelB.title).toBe('Same');
    // Los títulos son iguales a propósito; lo que prueba que la identidad
    // viaja por id es que el resto del contenido, que sí depende de cada
    // villager por separado, diverge.
    expect(panelA.lines).not.toEqual(panelB.lines);
  });
});

describe('trackedIdFor · a quién apunta el backend (AC-10, AC-11, AC-12)', () => {
  it('nunca sigue a un edificio ni a un terreno, aunque se pida', () => {
    const state = foundTwenty(7);
    expect(trackedIdFor({ kind: 'building', id: state.buildings[0]?.id ?? 0 }, state, true)).toBeNull();
    expect(trackedIdFor({ kind: 'terrain', x: 0, y: 0 }, state, true)).toBeNull();
  });

  it('no pedido, no se sigue', () => {
    const state = foundTwenty(7);
    const person = state.people.villagers.find((v) => v.named);
    if (person === undefined) throw new Error('sin nombrados');
    expect(trackedIdFor({ kind: 'villager', id: person.id }, state, false)).toBeNull();
  });

  it('a alguien presente, pedirlo sigue su id', () => {
    const state = foundTwenty(7);
    const person = state.people.villagers.find((v) => v.named && isHere(v));
    if (person === undefined) throw new Error('sin nombrados presentes');
    expect(trackedIdFor({ kind: 'villager', id: person.id }, state, true)).toBe(person.id);
  });

  it('un fallecido cancela el seguimiento aunque se siga pidiendo (AC-11)', () => {
    const state = foundTwenty(7);
    const person = state.people.villagers.find((v) => v.named);
    if (person === undefined) throw new Error('sin nombrados');
    person.diedTick = state.tick;
    expect(trackedIdFor({ kind: 'villager', id: person.id }, state, true)).toBeNull();
  });

  it('un emigrado cancela el seguimiento aunque se siga pidiendo (AC-11)', () => {
    const state = foundTwenty(7);
    const person = state.people.villagers.find((v) => v.named);
    if (person === undefined) throw new Error('sin nombrados');
    person.leftTick = state.tick;
    expect(trackedIdFor({ kind: 'villager', id: person.id }, state, true)).toBeNull();
  });

  it('una referencia que ya no existe también cancela el seguimiento (AC-11)', () => {
    const state = foundTwenty(7);
    expect(trackedIdFor({ kind: 'villager', id: 999_999 }, state, true)).toBeNull();
  });
});

describe('panelFor de quien ya no está (§2.5, AC-11) — CLAUDE.md "sólo datos reales"', () => {
  it('un fallecido no enseña su edad de hoy, sino la de su muerte', () => {
    const state = foundTwenty(7);
    const person = state.people.villagers.find((v) => v.named);
    if (person === undefined) throw new Error('sin nombrados');
    const diedTick = state.tick + 5 * TIME.WEEKS_PER_YEAR;
    person.diedTick = diedTick;
    // Se mira mucho después de la muerte: si la ficha calculara la edad con el
    // tick de hoy en vez de con el de la muerte, mentiría por veinte años.
    const laterState = { ...state, tick: diedTick + 20 * TIME.WEEKS_PER_YEAR };
    const model = panelFor({ kind: 'villager', id: person.id }, laterState);
    expect(model.title).toBe(person.name);
    // Y no se inventa presente: una sola línea, nada de rasgos, recuerdos u
    // opiniones de alguien que ya no puede tenerlos.
    expect(model.lines).toEqual([
      `Died in ANNO ${yearOf(diedTick) + 1}, ${yearOf(diedTick) - yearOf(person.bornTick)} winters old.`,
    ]);
  });

  it('un emigrado no se presenta como muerto ni como vivo', () => {
    const state = foundTwenty(7);
    const person = state.people.villagers.find((v) => v.named);
    if (person === undefined) throw new Error('sin nombrados');
    person.leftTick = state.tick + 3 * TIME.WEEKS_PER_YEAR;
    const model = panelFor({ kind: 'villager', id: person.id }, state);
    expect(model.lines).toEqual([`Left the valley in ANNO ${yearOf(person.leftTick) + 1}.`]);
    expect(model.lines.join(' ')).not.toMatch(/[Dd]ied/);
  });

  it('una referencia que ya no existe usa el estado vacío de siempre', () => {
    const state = foundTwenty(7);
    expect(panelFor({ kind: 'villager', id: 999_999 }, state)).toEqual({ title: 'Gone', lines: [] });
  });
});
