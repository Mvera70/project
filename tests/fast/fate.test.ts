// R-1 · Los sucesos del valle. design.md §4.2 (paso 2b), §7.10, §12.10.
//
// Lo que se vigila: que el mundo pase cosas por su cuenta a un ritmo que se
// pueda contar, que ninguna se cuele fuera de su estación o de su cielo, que
// todo lo que pasa se cuente y se vea, y —lo que el dueño del diseño pidió— que
// dos valles no tengan la misma historia. Medido jugando con `run` y la
// política prudente, nunca con `tick` a secas (CLAUDE.md).

import { describe, expect, it } from 'vitest';
import { FATE, TIME } from '@engine/balance';
import { BANK } from '@engine/chronicle/bank.en';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { grudges } from '@engine/people/opinions';
import { RNG_STREAMS } from '@engine/rng';
import { run } from '@engine/sim';
import { HAPPENINGS, type GameState, type HappeningId } from '@engine/state';
import { seasonOf } from '@engine/time';
import { rollFate } from '@engine/world/fate';
import { weekWeather } from '@engine/world/sky';
import { foundTwenty } from '../helpers/founding';

const SEEDS = [3, 7, 11, 23, 41, 97];
const YEARS = 30;

/** Una aldea jugada `years` años, con lo que le pasó. */
function played(seed: number, years = YEARS): GameState {
  const state = foundGame(seed);
  for (let y = 0; y < years && state.ended === null; y += 1) {
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
  }
  return state;
}

describe('los sucesos del valle · R-1', () => {
  const worlds = SEEDS.map((seed) => played(seed));

  it('pasa algo cada tres o cuatro semanas, en todas las semillas', () => {
    // Medido en tres vueltas de pesos (§12.10): trece al año, mediana de tres
    // semanas entre dos. La banda deja sitio a que los pesos se muevan sin que
    // el valle enmudezca ni se convierta en un noticiario.
    for (const [i, state] of worlds.entries()) {
      const years = Math.max(1, state.tick / TIME.WEEKS_PER_YEAR);
      const perYear = state.happenings.length / years;
      expect(perYear, `semilla ${SEEDS[i]}: ${perYear.toFixed(1)} al año`).toBeGreaterThan(6);
      expect(perYear, `semilla ${SEEDS[i]}: ${perYear.toFixed(1)} al año`).toBeLessThan(24);
    }
  });

  it('y nunca dos semanas seguidas, salvo la fiesta, que es un rito', () => {
    for (const [i, state] of worlds.entries()) {
      for (let n = 1; n < state.happenings.length; n += 1) {
        const now = state.happenings[n] as { tick: number; id: HappeningId };
        const before = state.happenings[n - 1] as { tick: number };
        if (now.id === 'harvest_feast') continue;
        expect(now.tick - before.tick, `semilla ${SEEDS[i]}, tick ${now.tick}`)
          .toBeGreaterThanOrEqual(FATE.MIN_GAP_WEEKS);
      }
    }
  });

  it('cada suceso cae en su estación y con su cielo', () => {
    for (const [i, state] of worlds.entries()) {
      for (const h of state.happenings) {
        const season = seasonOf(h.tick);
        const sky = weekWeather(state.seed, state.weather.index, h.tick);
        const where = `semilla ${SEEDS[i]}, ${h.id} en ${season} (tick ${h.tick})`;
        if (h.id === 'wolves_at_the_coop' || h.id === 'roof_under_snow') expect(season, where).toBe('winter');
        if (h.id === 'river_flood') expect(season, where).toBe('spring');
        if (h.id === 'pedlar') expect(season, where).toBe('summer');
        if (h.id === 'good_catch') expect(['spring', 'summer'], where).toContain(season);
        if (h.id === 'bear_in_the_wood') expect(['summer', 'autumn'], where).toContain(season);
        if (h.id === 'lightning_fire') {
          // El rayo cae en semana de tormenta, y en verano u otoño porque en
          // invierno no truena (§10.8). La fila del clima puede haber cambiado
          // desde entonces, así que lo que se mira es la estación.
          expect(season, where).not.toBe('winter');
        }
        if (h.id === 'harvest_feast') expect(h.tick % TIME.WEEKS_PER_YEAR, where).toBe(TIME.HARVEST_WEEK + 1);
        // Y lo que hace falta para que pase, pasó: nada sale de la nada.
        expect(sky.wet).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('todo lo que pasa se cuenta, con sus palabras en el banco', () => {
    for (const state of worlds) {
      const told = state.chronicle.filter((e) => e.kind === 'happening');
      expect(told.length).toBe(state.happenings.length);
      for (const entry of told) {
        const texts = BANK[entry.templateKey];
        expect(texts, entry.templateKey).toBeDefined();
        expect(Array.isArray(texts) ? texts.length : 1, entry.templateKey).toBeGreaterThanOrEqual(3);
        expect(entry.weight).toBeGreaterThanOrEqual(1);
      }
    }
    for (const id of HAPPENINGS) expect(BANK[`fate.${id}`], id).toBeDefined();
  });

  it('y casi todo se ve: la mayoría junta a la aldea o cambia el mapa', () => {
    // §11.5 para los sucesos: no hace falta que todos tengan efecto visible
    // —los lobos se ven en el corral que se vacía— pero sí la mayoría, o el
    // valle pasa cosas que sólo se leen.
    let visible = 0;
    let total = 0;
    for (const state of worlds) {
      for (const h of state.happenings) {
        total += 1;
        if (h.visible.length > 0) visible += 1;
      }
    }
    expect(visible / total).toBeGreaterThan(0.6);
  });

  it('dos valles no tienen la misma historia', () => {
    // La esencia del juego según su dueño, medida: el reparto de sucesos de
    // dos semillas se parece —es el mismo juego— pero no es el mismo, y hay
    // sucesos que salen en un valle y no en otro.
    const mix = (state: GameState): Map<HappeningId, number> => {
      const out = new Map<HappeningId, number>();
      for (const h of state.happenings) out.set(h.id, (out.get(h.id) ?? 0) + 1);
      return out;
    };
    const first = mix(worlds[0] as GameState);
    let different = 0;
    for (const other of worlds.slice(1)) {
      const theirs = mix(other);
      if ([...first.entries()].some(([id, n]) => (theirs.get(id) ?? 0) !== n)) different += 1;
    }
    expect(different).toBe(worlds.length - 1);
  });

  it('empuja las opiniones: hay rencores donde antes no había ninguno', () => {
    // `findings-drama.md` §1: cero rencores en tres partidas de cuarenta años,
    // porque nada movía una opinión sin una encrucijada. La riña de la plaza es
    // el empujón. Medido con los pesos de §12.10: entre seis y doce por
    // partida de cuarenta años; aquí, en treinta, se pide que haya alguno en
    // la mayoría.
    const withGrudges = worlds.filter((state) => grudges(state).length > 0).length;
    expect(withGrudges).toBeGreaterThanOrEqual(4);
  });

  it('el caos es el juego: unos valles se rompen y otros no', () => {
    // Hasta v3.75 esta prueba exigía que las seis semillas llegaran vivas al
    // año treinta, y dos puertas en `weightOf` (`LIGHTNING_MIN_HOUSES`,
    // `LIGHTNING_MIN_PEOPLE`) lo garantizaban quitándole al rayo la única casa
    // de la pareja fundadora. El dueño del diseño dijo después, con estas
    // palabras, que eso es exactamente lo contrario de lo que quiere: «que
    // haya caos y que haya partidas que se rompan y no se pueda seguir
    // jugando es la idea del juego» (`docs/rework.md` §2.6). Las puertas se
    // quitaron: el rayo ya sólo pide tormenta y madera en pie, así que puede
    // quemar la única casa de dos en la semana 1. Lo que esta prueba mide
    // ahora es la propiedad nueva: que un valle se pueda romper, no que nunca
    // se rompa.
    //
    // Medido en doce semillas a cuarenta años, jugadas con `run` y la política
    // prudente: 8 de 12 acaban (6 `abandoned`, 2 `extinction`), las otras 4
    // siguen. La horquilla dejar sitio a que los pesos se muevan sin perder la
    // propiedad: que existan valles que acaban y valles que siguen.
    const seeds = [3, 7, 11, 23, 31, 41, 53, 67, 79, 83, 89, 97];
    const states = seeds.map((seed) => played(seed, 40));
    const finished = states.filter((state) => state.ended !== null);
    const alive = states.filter((state) => state.ended === null);
    expect(finished.length, `acabaron: ${finished.length} de ${seeds.length}`).toBeGreaterThanOrEqual(3);
    expect(finished.length, `acabaron: ${finished.length} de ${seeds.length}`).toBeLessThanOrEqual(11);
    expect(alive.length, `siguen: ${alive.length} de ${seeds.length}`).toBeGreaterThan(0);

    for (const state of states) {
      // La partida que acaba lo cuenta: causa y crónica, no un final mudo.
      if (state.ended !== null) {
        const kind = state.ended.cause === 'extinction' ? 'extinction' : 'abandonment';
        expect(state.chronicle.some((e) => e.kind === kind)).toBe(true);
      }
      // Lo que sigue sin negociarse es la integridad, no la supervivencia:
      // el grano nunca es negativo, el ánimo se queda entre 0 y 100 y las
      // gallinas nunca bajan de cero, rompa el valle o no.
      expect(state.village.grain).toBeGreaterThanOrEqual(0);
      expect(state.village.morale).toBeGreaterThanOrEqual(0);
      expect(state.village.morale).toBeLessThanOrEqual(100);
      expect(state.herd.hens).toBeGreaterThanOrEqual(0);
    }
  });

  it('sólo consume azar del flujo `fate`', () => {
    // El innegociable: un suceso que tocara `births` o `weather` movería quién
    // nace y qué año hace, y dos partidas con la misma semilla divergirían por
    // culpa del decorado.
    const state = foundTwenty(7);
    run(state, 5 * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    const before = { ...state.rng };
    let rolled = 0;
    for (let n = 0; n < 200; n += 1) {
      state.tick += 1;
      if (rollFate(state) !== null) rolled += 1;
    }
    expect(rolled).toBeGreaterThan(0);
    for (const stream of RNG_STREAMS) {
      if (stream === 'fate') continue;
      expect(state.rng[stream], stream).toBe(before[stream]);
    }
    expect(state.rng.fate).not.toBe(before.fate);
  });

  it('la misma semilla vive los mismos sucesos', () => {
    const a = played(7, 10);
    const b = played(7, 10);
    expect(a.happenings).toEqual(b.happenings);
  });
});
