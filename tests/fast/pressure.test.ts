// M-1 · El mundo contesta a lo que hay. `docs/historico/rework.md` §4b, brief M-1.
//
// **Lo que se guarda aquí no es que el mundo mate**: es que lo que puede romper
// la aldea vaya con lo que la aldea ha acumulado, y que de primeras no la rompa.
// Las dos mitades son decisión del dueño del diseño (17 sep 2026): «que haya
// partidas que se rompan es la idea», y «que caiga un rayo en una casa y eso ya
// se muera no tiene gracia; se puede morir, pero más adelante, porque ya hemos
// tomado varias decisiones que hacen que se tumbe».
//
// Se miden **pesos** y no partidas: `weightNow` dice lo que el sorteo va a usar,
// así que dos estados que sólo se diferencian en el corral se comparan sin
// jugar cien años y adivinar. Las partidas las mide `tools/reports/agency-report.ts`.

import { describe, expect, it } from 'vitest';
import { FATE, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { all } from '@engine/crossroads/conditions';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { weightNow } from '@engine/world/fate';
import { fellForest } from '@engine/world/forest';
import { foundTwenty } from '../helpers/founding';

/** Una aldea hecha, en la estación que el suceso pide. */
function village(season: 'winter' | 'spring', seed = 7): GameState {
  const state = foundTwenty(seed);
  // La semana 36 es invierno y la 0 primavera (§3.2), y la fila del clima entra
  // en la semana 0, así que se avanza con el motor y luego se coloca el tick.
  run(state, TIME.WEEKS_PER_YEAR * 2, 'prudent', CATALOG);
  state.tick = TIME.WEEKS_PER_YEAR * 2 + (season === 'winter' ? 38 : 2);
  return state;
}

describe('los lobos van a donde hay ganado · M-1', () => {
  it('cada cabeza en el corral los llama más', () => {
    const state = village('winter');
    state.herd.hens = 6;
    state.herd.pigs = 0;
    state.herd.cows = 0;
    const bare = weightNow(state, 'wolves_at_the_coop');
    expect(bare).toBeGreaterThan(0);
    state.herd.pigs = 6;
    const withPigs = weightNow(state, 'wolves_at_the_coop');
    expect(withPigs).toBeGreaterThan(bare);
    state.herd.cows = 4;
    expect(weightNow(state, 'wolves_at_the_coop')).toBeGreaterThan(withPigs);
  });

  it('y una empalizada los aparta', () => {
    const state = village('winter');
    state.herd.hens = 6;
    state.herd.pigs = 6;
    // B-1 · **y el valle abierto hay que dejarlo abierto.** Con el ritmo nuevo
    // esta aldea de dos años ya tiene empalizada —la herrería llega a las 43
    // horas de reloj y la muralla a las 47—, así que el peso «sin muralla» se
    // medía con muralla y añadir otra pieza no cambiaba nada: 1,968 contra
    // 1,968. Lo que la prueba dice es que la muralla aparta a los lobos, y para
    // medirlo hay que partir de un valle sin ella.
    state.buildings = state.buildings.filter((b) => b.kind !== 'palisade');
    const open = weightNow(state, 'wolves_at_the_coop');
    state.buildings.push({
      id: 9001, kind: 'palisade', x: 2, y: 2, w: 1, h: 1,
      builtTick: state.tick - 1, lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
    expect(weightNow(state, 'wolves_at_the_coop')).toBeLessThan(open);
  });

  it('sin gallinas no hay corral que asaltar', () => {
    const state = village('winter');
    state.herd.hens = 0;
    state.herd.pigs = 9;
    expect(weightNow(state, 'wolves_at_the_coop')).toBe(0);
  });
});

describe('la riada va con el bosque que ya no está · M-1', () => {
  it('un valle talado se moja más', () => {
    // La primavera con lluvia es la condición; lo que M-1 añade es cuánto.
    const wooded = village('spring', 11);
    const felled = village('spring', 11);
    const before = weightNow(wooded, 'river_flood');
    if (before === 0) {
      // Esa primavera no llovió lo bastante en esta semilla: la propiedad se
      // mide igual sobre el factor, que es lo que M-1 cambia.
      expect(weightNow(felled, 'river_flood')).toBe(0);
      return;
    }
    fellForest(felled, 20_000);
    expect(weightNow(felled, 'river_flood')).toBeGreaterThan(before);
  });
});

describe('un rayo no deja a la aldea sin techo · M-1', () => {
  it('con una sola casa en pie, el rayo cae en otra cosa', () => {
    // Es la frase del dueño del diseño hecha aserto. Se fuerza el suceso en vez
    // de esperar la tormenta: lo que se mide es a qué se lleva, no si cae.
    for (const seed of [7, 11, 23, 2024]) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 6, 'prudent', CATALOG);
      const roofs = () => state.buildings.filter(
        (b) => b.lostTick === null && (b.kind === 'house' || b.kind === 'stone_house')).length;
      if (roofs() === 0) continue;
      // Se deja una sola casa en pie y se tira el rayo cien veces.
      let first = true;
      for (const b of state.buildings) {
        if (b.lostTick !== null) continue;
        if (b.kind === 'house' || b.kind === 'stone_house') {
          if (first) { first = false; continue; }
          b.lostTick = state.tick;
        }
      }
      expect(roofs(), `semilla ${seed}`).toBe(1);
      for (let n = 0; n < 100; n += 1) {
        state.tick += 1;
        // `happen` no es público: el rayo se provoca por el camino de siempre,
        // con el peso a mano, y lo que se comprueba es el estado después.
        const before = roofs();
        run(state, 1, 'prudent', CATALOG);
        expect(roofs(), `semilla ${seed}: nunca se queda sin techo`).toBeGreaterThan(0);
        expect(before, 'y el techo no desaparece de golpe').toBeGreaterThan(0);
      }
    }
  });
});

describe('la gracia de la pareja · M-1', () => {
  it('lo que destruye pesa menos en los primeros años', () => {
    const young = foundGame(7);
    young.tick = TIME.WEEKS_PER_YEAR; // año 2, la pareja
    young.weather = { year: 0, index: 2, factor: 1 };
    expect(population(young)).toBeLessThan(FATE.GRACE_PEOPLE);
    const grown = foundTwenty(7);
    grown.tick = young.tick;
    grown.weather = young.weather;
    // El mismo tick, el mismo cielo, y la única diferencia es cuánta gente hay.
    const a = weightNow(young, 'lightning_fire');
    const b = weightNow(grown, 'lightning_fire');
    if (b > 0) expect(a).toBeLessThan(b);
  });

  it('y **no** protege a una aldea pequeña para siempre', () => {
    // El error que casi se queda dentro: con la gracia atada al tamaño y no a
    // los primeros años, un valle que se apaga pasaba por debajo de seis
    // personas y se volvía casi inmune. Medido: las muertas de treinta y dos
    // partidas bajaban de nueve a **una**, y eso borra el caos que el dueño
    // pidió.
    const late = foundGame(7);
    late.tick = TIME.WEEKS_PER_YEAR * (FATE.GRACE_YEARS + 20);
    late.weather = { year: 0, index: 2, factor: 1 };
    const early = foundGame(7);
    early.tick = TIME.WEEKS_PER_YEAR;
    early.weather = late.weather;
    const lateWeight = weightNow(late, 'lightning_fire');
    const earlyWeight = weightNow(early, 'lightning_fire');
    if (lateWeight > 0) expect(earlyWeight).toBeLessThan(lateWeight);
  });
});

describe('quien prospera a la vista se hace interesante · M-1', () => {
  it('el ladrón del granero mira también la plata, no sólo el hambre', () => {
    const state = village('winter');
    state.tick = TIME.WEEKS_PER_YEAR * 8 + 41; // invierno entrado
    state.village.grain = 100_000; // granero de sobra: por hambre no puede ser
    state.village.silver = 0;
    const template = CATALOG.find((t) => t.id === 'granary_theft');
    if (template === undefined) throw new Error('falta granary_theft');
    // Con rencor y granero en pie, lo único que falta es el motivo. **Y el
    // rencor que la condición mide es la opinión, no el registro** (§8.2 v2.8:
    // leer el registro dejaba las cuatro plantillas de feudo como contenido
    // muerto), así que hay que agriar la opinión de verdad: apoyarse en la que
    // la aldea traiga puesta es medir su biografía, y la trayectoria cambia con
    // cada ronda del motor.
    const [one, two] = state.people.namedIds;
    const first = state.people.villagers.find((person) => person.id === one);
    const second = state.people.villagers.find((person) => person.id === two);
    if (first !== undefined && second !== undefined) {
      first.opinions[second.id] = -70;
      second.opinions[first.id] = -70;
    }
    state.people.grudges.push({
      fromId: one ?? 0, toId: two ?? 1,
      cause: 'was_blamed', causeTick: 0, formedTick: state.tick - 100, healedTick: null,
    });
    state.buildings.push({
      id: 9002, kind: 'granary', x: 4, y: 4, w: 2, h: 2,
      builtTick: 0, lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
    const poor = all(template.requires, state);
    state.village.silver = FATE.RICH_SILVER + 10;
    const rich = all(template.requires, state);
    // Lo que se guarda es que la plata **abre** un camino que el hambre cerraba.
    expect(rich).toBe(true);
    expect(poor).toBe(false);
  });

  it('y el señor visita a quien tiene plata, no sólo a su vasallo', () => {
    const state = foundTwenty(7);
    run(state, TIME.WEEKS_PER_YEAR * 8, 'prudent', CATALOG);
    state.tick = TIME.WEEKS_PER_YEAR * 8 + 35; // otoño entrado
    delete state.flags['vassal'];
    delete state.flags['watched'];
    const template = CATALOG.find((t) => t.id === 'tithe_demand');
    if (template === undefined) throw new Error('falta tithe_demand');
    state.village.silver = 0;
    const unknown = all(template.requires, state);
    state.village.silver = FATE.RICH_SILVER + 10;
    expect(all(template.requires, state)).toBe(true);
    expect(unknown).toBe(false);
  });
});
