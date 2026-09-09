// M-29 · design.md §7.7, §5.2 — la caza y la pesca.
//
// Lo que hay que proteger son tres cosas y ninguna es un número concreto:
// que la aldea harta NO salga, que la aldea hambrienta SÍ salga sin dejar de
// construir, y que lo que trae dependa de lo que el valle tiene todavía.
import { describe, expect, it } from 'vitest';
import { FOOD, FORAGE, LABOUR, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { run } from '@engine/sim';
import { forage, foragingUrgency, hasRiver } from '@engine/subsistence/forage';
import { allocateLabour } from '@engine/subsistence/labour';
import { TERRAIN_CODE, type GameState } from '@engine/state';

function village(years: number, seed = 7): GameState {
  const state = foundGame(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

/** Deja la despensa en los años de grano que se pidan. */
function withGrainYears(state: GameState, years: number): GameState {
  state.village.grain = population(state) * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON * years;
  return state;
}

describe('quién sale y cuándo · §7.7', () => {
  it('una aldea con la despensa llena no manda a nadie al bosque', () => {
    const state = withGrainYears(village(20), 3);
    const a = allocateLabour(state);
    expect(a.hunters + a.fishers).toBe(0);
  });

  it('justo en el umbral todavía no sale nadie', () => {
    const state = withGrainYears(village(20), FORAGE.THRESHOLD_YEARS);
    expect(allocateLabour(state).hunters + allocateLabour(state).fishers).toBe(0);
  });

  it('cuanta menos comida, más brazos salen', () => {
    const many = allocateLabour(withGrainYears(village(20), 0.1));
    const few = allocateLabour(withGrainYears(village(20), 0.6));
    expect(many.hunters + many.fishers).toBeGreaterThan(few.hunters + few.fishers);
  });

  it('nunca se lleva más de la mitad de los brazos libres', () => {
    const state = withGrainYears(village(20), 0);
    const a = allocateLabour(state);
    const spare = a.workforce - a.farmers;
    expect(a.hunters + a.fishers).toBeLessThanOrEqual(spare * FORAGE.MAX_SHARE + 1e-9);
  });

  it('la aldea hambrienta sigue construyendo: la reserva de obras sobrevive', () => {
    // §5.2 dice que un valle que deja de cambiar es el pecado capital. Pasar
    // hambre no puede ser una excusa para congelarlo.
    const state = withGrainYears(village(20), 0);
    const a = allocateLabour(state);
    expect(a.builders).toBeGreaterThan(0);
    expect(a.cutters).toBeGreaterThan(0);
  });

  it('una aldea sin nadie no sale a cazar', () => {
    const state = village(20);
    for (const v of state.people.villagers) v.diedTick = state.tick;
    expect(foragingUrgency(state, 0)).toBe(0);
  });
});

describe('qué traen · §7.7', () => {
  it('lo que traen entra en la despensa', () => {
    const state = withGrainYears(village(20), 0.2);
    const a = allocateLabour(state);
    const before = state.village.grain;
    const got = forage(state, a, 0.25);
    expect(got.hunted + got.fished).toBeGreaterThan(0);
    expect(state.village.grain - before).toBeCloseTo(got.hunted + got.fished);
  });

  it('un valle talado da menos carne que uno entero', () => {
    const state = withGrainYears(village(20), 0.2);
    const a = allocateLabour(state);
    const whole = forage({ ...state, village: { ...state.village } }, a, 0.25).hunted;
    const cut = forage({ ...state, village: { ...state.village } }, a, 0.15).hunted;
    expect(cut).toBeLessThan(whole);
    expect(cut).toBeGreaterThan(0);
  });

  it('bajo el suelo de bosque no se caza nada', () => {
    const state = withGrainYears(village(20), 0.2);
    const a = allocateLabour(state);
    expect(forage(state, a, FORAGE.MIN_FOREST / 2).hunted).toBe(0);
  });

  it('el río no se agota: rinde igual con el bosque en pie o raso', () => {
    const state = withGrainYears(village(20), 0.2);
    const a = allocateLabour(state);
    const wooded = forage({ ...state, village: { ...state.village } }, a, 0.25).fished;
    const bare = forage({ ...state, village: { ...state.village } }, a, 0).fished;
    expect(bare).toBeCloseTo(wooded);
  });

  it('con río, la mitad de los brazos va al agua', () => {
    // Este hueco lo destapó una mutación: mandar a todos al bosque teniendo
    // río pasaba las trece pruebas anteriores sin que ninguna se quejara.
    const state = withGrainYears(village(20), 0.2);
    expect(hasRiver(state)).toBe(true);
    const a = allocateLabour(state);
    expect(a.fishers).toBeGreaterThan(0);
    expect(a.fishers).toBeCloseTo(a.hunters);
  });

  it('sin agua en el mapa no se pesca, y todos los brazos van al bosque', () => {
    const state = withGrainYears(village(20), 0.2);
    state.map.terrain = state.map.terrain.map((t) =>
      (t === TERRAIN_CODE.water ? TERRAIN_CODE.meadow : t)) as typeof state.map.terrain;
    expect(hasRiver(state)).toBe(false);
    const a = allocateLabour(state);
    expect(a.fishers).toBe(0);
    expect(a.hunters).toBeGreaterThan(0);
  });

  it('un prado pelado no da ni carne ni pescado', () => {
    const state = withGrainYears(village(20), 0);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    const a = allocateLabour(state);
    const got = forage(state, a, 0);
    expect(got.hunted).toBe(0);
    expect(got.fished).toBe(0);
  });
});

describe('el forrajeo no desplaza nada · §4.3', () => {
  it('no consume una sola tirada de ningún flujo', () => {
    const state = withGrainYears(village(20), 0);
    const a = allocateLabour(state);
    const before = { ...state.rng };
    forage(state, a, 0.25);
    expect(state.rng).toEqual(before);
  });

  it('cazar y pescar no toca la mano de obra de las obras de §5.2', () => {
    // El reparto sale de `spare`, nunca de los constructores ya reservados.
    const fed = allocateLabour(withGrainYears(village(20), 3));
    const hungry = allocateLabour(withGrainYears(village(20), 0));
    const reserve = fed.workforce * LABOUR.WORKS_RESERVE;
    expect(hungry.cutters + hungry.builders).toBeGreaterThanOrEqual(reserve * 0.5);
  });
});
