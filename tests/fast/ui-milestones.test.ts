// design.md §11.6, §9.2 — `src/ui/milestones.ts`.
//
// What is protected here is the same thing `notice.test.ts` protects for the
// chronicle band: that the derivation is pure, that it never repeats an event
// it has already told, and that a real sixty-year village produces a handful
// of these, not zero and not a teletype.
//
// The sixty-year games are built once, at module scope, and shared across the
// properties below — `run` and `foundGame` are the expensive part, and
// `milestonesAt` is read-only, so five games played once cost the same as
// five games played five times over.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { BANK } from '@engine/chronicle/bank.en';
import { renderEntry } from '@engine/chronicle/render';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { yearOf } from '@engine/time';
import type { Policy } from '@engine/sim';
import type { GameState } from '@engine/state';
import { milestonesAt } from '@ui/milestones';
import type { Milestone } from '@ui/milestones';

const YEARS = 60;
const TOTAL_TICKS = YEARS * TIME.WEEKS_PER_YEAR;
const POLICY: Policy = 'prudent';
const SEEDS = [7, 42, 108, 999, 2024];

/** Plays a whole game in fixed-size chunks, collecting every milestone as it goes. */
function sweep(seed: number, chunkTicks: number, totalTicks: number): { state: GameState; milestones: Milestone[] } {
  const state = foundTwenty(seed);
  const milestones: Milestone[] = [];
  while (state.tick < totalTicks && state.ended === null) {
    const since = state.tick;
    const step = Math.min(chunkTicks, totalTicks - since);
    run(state, step, POLICY, CATALOG);
    milestones.push(...milestonesAt(state, since));
  }
  return { state, milestones };
}

// One sixty-year game per seed, swept year by year — the games every test
// below reads from, played exactly once.
const GAMES = SEEDS.map((seed) => ({ seed, ...sweep(seed, TIME.WEEKS_PER_YEAR, TOTAL_TICKS) }));

/** Sorted, weight-and-tick-independent view for set comparison across chunkings. */
const canonical = (ms: readonly Milestone[]): unknown[] =>
  [...ms]
    .sort((a, b) => a.tick - b.tick || a.key.localeCompare(b.key))
    .map((m) => ({ kind: m.kind, key: m.key, tick: m.tick, weight: m.weight, params: m.params }));

describe('milestonesAt · first_of_kind se cuenta una sola vez', () => {
  it('cada clase de edificio que aparece en una partida de sesenta años se celebra exactamente una vez', () => {
    for (const { seed, state, milestones } of GAMES) {
      const firsts = milestones.filter((m) => m.kind === 'first_of_kind');

      // Ninguna clave repetida: si "milestone.first_of_kind.chapel" saliera dos
      // veces, la capilla se estaría celebrando dos veces.
      const counts = new Map<string, number>();
      for (const m of firsts) counts.set(m.key, (counts.get(m.key) ?? 0) + 1);
      for (const [key, count] of counts) expect(count, `${key} (seed ${seed})`).toBe(1);

      // Y coincide con los edificios que la aldea realmente tiene, salvo casa
      // y campo: la fundación ya los levanta en el tick 0 (found.ts), así que
      // su "primera vez" queda fuera de cualquier intervalo con sinceTick ≥ 0
      // y nunca se celebra — no hay tick al que atribuírsela.
      const kinds = new Set(
        state.buildings.map((b) => b.kind).filter((k) => k !== 'house' && k !== 'field'),
      );
      expect(counts.size, `seed ${seed}`).toBe(kinds.size);
    }
  });
});

describe('milestonesAt · el mismo hito no se repite, se agrupe como se agrupe', () => {
  it('tramos de una semana y tramos de un año dan el mismo conjunto de hitos', () => {
    // Sólo veinte años y dos semillas: la propiedad no depende de la duración
    // ni del número de semillas, y un barrido semana a semana es caro (2 880
    // llamadas frente a 60). Las cinco semillas de sesenta años ya cubren la
    // variedad de partidas; esto sólo comprueba que el tamaño del tramo no
    // cambia el conjunto.
    const shortTicks = 20 * TIME.WEEKS_PER_YEAR;
    for (const seed of [7, 999]) {
      const weekly = sweep(seed, 1, shortTicks);
      const yearly = sweep(seed, TIME.WEEKS_PER_YEAR, shortTicks);
      expect(canonical(weekly.milestones), `seed ${seed}`).toEqual(canonical(yearly.milestones));
    }
  });
});

describe('milestonesAt · función pura', () => {
  it('la misma llamada da lo mismo dos veces, y no toca el estado', () => {
    const state = foundTwenty(7);
    run(state, 20 * TIME.WEEKS_PER_YEAR, POLICY, CATALOG);
    const sinceTick = 5 * TIME.WEEKS_PER_YEAR;

    const before = JSON.stringify(state);
    const first = milestonesAt(state, sinceTick);
    const second = milestonesAt(state, sinceTick);
    expect(JSON.stringify(state)).toBe(before);
    expect(second).toEqual(first);
  });
});

describe('milestonesAt · toda clave existe en el banco', () => {
  it('cada key devuelta es una entrada real de BANK, nunca una clave cruda en pantalla', () => {
    for (const { seed, milestones } of GAMES) {
      expect(milestones.length, `seed ${seed}`).toBeGreaterThan(0);
      for (const m of milestones) {
        expect(Object.prototype.hasOwnProperty.call(BANK, m.key), `${m.key} (seed ${seed})`).toBe(true);
      }
    }
  });
});

describe('milestonesAt · ni una aldea sin historia ni un teletipo', () => {
  it('una partida de sesenta años da entre unos pocos y unas docenas de hitos', () => {
    // Medido en las cinco semillas de SEEDS (7, 42, 108, 999, 2024), política
    // 'prudent': 28, 33, 36, 33 y 31 hitos por partida de sesenta años —
    // first_of_kind entre 6 y 8, peak_people entre 4 y 6, turn_of_decade fijo
    // en 6 (sesenta años son seis décadas y ningún siglo), work_done entre 12
    // y 16 (casas que pasan a piedra, sobre todo, una vez que el mapa se
    // llena — §7.3 punto 9). Ni una sola vez cero, ni una sola vez cerca de
    // cien: una aldea con historia, no un teletipo.
    // La cota se aprieta a lo medido con margen, no a «más que cero y menos
    // que cien»: entre 28 y 36 en las cinco semillas, así que una partida que
    // baje de veinte o pase de sesenta ha cambiado de comportamiento y hay que
    // enterarse. Una cota floja aquí deja pasar exactamente lo que esta prueba
    // dice vigilar.
    //
    // **Y desde R-1 §2.6 no todas las partidas llegan a los sesenta años.** El
    // dueño del diseño lo pidió así: «que haya caos y que haya partidas que se
    // rompan y no se pueda seguir jugando es la idea del juego». Una partida
    // que se rompió en el año 49 —la semilla 999— tiene menos historia porque
    // tuvo menos vida, y medirla contra la cota de sesenta años era medir el
    // caos como si fuera un fallo. Así que la cota de arriba se pide a las que
    // llegan, y a las que se rompen se les pide lo que sí prometen: que su
    // historia sea proporcional a lo que vivieron y nunca cero.
    const full = GAMES.filter(({ state }) => state.tick >= TOTAL_TICKS);
    const broken = GAMES.filter(({ state }) => state.tick < TOTAL_TICKS);
    expect(full.length, 'alguna de las cinco semillas debe llegar a los sesenta años').toBeGreaterThan(0);
    for (const { seed, milestones } of full) {
      expect(milestones.length, `seed ${seed}: ${milestones.length} hitos`)
        .toBeGreaterThanOrEqual(20);
      expect(milestones.length, `seed ${seed}: ${milestones.length} hitos`)
        .toBeLessThanOrEqual(60);
    }
    for (const { seed, state, milestones } of broken) {
      const lived = state.tick / TIME.WEEKS_PER_YEAR;
      expect(milestones.length, `seed ${seed}: ${milestones.length} hitos en ${lived.toFixed(0)} años`)
        .toBeGreaterThan(0);
      expect(milestones.length, `seed ${seed}: ${milestones.length} hitos en ${lived.toFixed(0)} años`)
        .toBeLessThanOrEqual(60);
    }
    // turn_of_decade es el mismo reloj para cualquier partida que llegue a los
    // sesenta años: seis décadas, ningún siglo.
    for (const { seed, state, milestones } of GAMES) {
      const decades = milestones.filter((m) => m.kind === 'turn_of_decade');
      // Seis décadas para quien llega; para quien se rompe, las que vivió.
      const lived = Math.floor(state.tick / (10 * TIME.WEEKS_PER_YEAR));
      expect(decades.length, `seed ${seed}`).toBe(state.tick >= TOTAL_TICKS ? 6 : lived);
    }
  });
});

describe('el año que dice un hito es el año que dice la cabecera', () => {
  it('no suma uno dos veces', () => {
    // El fallo que esto cierra, medido y no supuesto. E4 movió el «+1» de los
    // años absolutos a la **presentación** (`chronicle/render.ts`), que es lo
    // correcto: así una partida guardada de antes se lee bien sin migrarla. Lo
    // que no se revisó entonces es que este módulo ya lo sumaba por su cuenta
    // antes de entregar los parámetros, así que desde E4 la cartela de hito
    // decía **dos años más** que la cabecera: ANNO IV arriba y «in year 5»
    // debajo, en la misma pantalla y en el mismo instante.
    //
    // Es exactamente la clase de fallo que hacía que los mensajes se leyeran
    // raros, y la razón de que se pruebe con los dos rendidos a la vez: por
    // separado los dos números están bien.
    const state = foundTwenty(7);
    run(state, TIME.WEEKS_PER_YEAR * 3, POLICY, CATALOG);
    const passed = milestonesAt(state, 0);
    const dated = passed.filter((m) => typeof m.params['year'] === 'number');
    expect(dated.length, 'hay hitos con fecha que comprobar').toBeGreaterThan(0);
    for (const milestone of dated) {
      // Lo que el motor sabe: el año en base cero del tick del hito.
      const engineYear = yearOf(milestone.tick);
      expect(milestone.params['year'], `${milestone.key} lleva el año del motor`)
        .toBe(engineYear);
      // Y lo que el jugador lee, por el mismo camino que lo pinta `app.ts`.
      const line = renderEntry({
        tick: milestone.tick, kind: 'season', templateKey: milestone.key,
        params: milestone.params, weight: milestone.weight,
      }, state.rng);
      const said = /year (\d+)/u.exec(line);
      if (said === null) continue;
      expect(Number(said[1]), `«${line}» contra la cabecera`).toBe(engineYear + 1);
    }
  });
});
