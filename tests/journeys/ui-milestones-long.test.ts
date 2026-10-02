// Lo lento de `tests/fast/ui-milestones.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 16 s en el trabajo `fast` de CI, y además pagaba ~189 s (en local) al
// recogerse, porque juega sus partidas en el cuerpo del `describe`. Mismo
// cuerpo y mismo umbral; lo barato se queda allí.
//
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
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
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
    // **Y el juego de los medios (M-0 a M-4) más el balanceo de la leña movieron
    // esa cota, así que se vuelve a medir.** Diez semillas con `foundTwenty`,
    // política 'prudent', sesenta años, barrido año a año (17 sep 2026):
    //
    //   semilla  7 → 12   42 → 39   108 → 24   999 → 36   2024 → 18
    //   semilla 11 → 35   23 → 25    33 → 14    51 → 42    101 → 15
    //
    // El rango es **12 a 42** y lo que baja es una sola clase: `work_done`
    // pasa de las 12–16 de antes a 0 en dos semillas y 1–4 en otras tres. No
    // es que se construya menos —la 33 acaba con 94 edificios— sino que la
    // aldea ya no apila veinte mil de leña con la que reformar casas a piedra
    // sin parar (§7.13), y `turn_of_decade`, `peak_people` y `first_of_kind`
    // se quedan donde estaban. Así que la cota baja a **diez**, por debajo de
    // la mínima medida y todavía muy por encima de cero: lo que la prueba
    // vigila es que ninguna partida entera se quede sin historia.
    //
    // **Y desde R-1 §2.6 no todas las partidas llegan a los sesenta años.** El
    // dueño del diseño lo pidió así: «que haya caos y que haya partidas que se
    // rompan y no se pueda seguir jugando es la idea del juego». Una partida
    // que se rompió en el año 49 —la semilla 999— tiene menos historia porque
    // tuvo menos vida, y medirla contra la cota de sesenta años era medir el
    // caos como si fuera un fallo. Así que la cota de arriba se pide a las que
    // llegan, y a las que se rompen se les pide lo que sí prometen: que su
    // historia sea proporcional a lo que vivieron y nunca cero.
    //
    // **Y RD-3 (1 oct 2026) la sube de 60 a 80, medida y con su causa.** La
    // primera piedra llega ahora con la piedra —la iglesia, año 4 a 8— y no al
    // año 41, y la política prudente contesta «las casas», así que las casas
    // pasan a piedra dentro de los sesenta años en vez de a partir del cuarenta
    // y uno. Medido con las cinco semillas de SEEDS (`foundTwenty`, prudent, 60
    // años): 67, 68, 68, 68 y 67 hitos, y lo único que sube es `work_done`
    // (12–16 en la medida vieja, 41–42 ahora; `stone_house` no es una clase de
    // rutina y repite una vez por casa): `first_of_kind` 13, `peak_people` 7–8,
    // `turn_of_decade` 6. Son los mismos hitos de siempre, ocurren antes. Una
    // partida que pase de ochenta ha cambiado de comportamiento; si Vera no
    // quiere ese goteo de «una casa de piedra» el sitio para quitarlo es
    // `ROUTINE_KINDS` de `src/ui/milestones.ts`, que no es de este carril.
    const full = GAMES.filter(({ state }) => state.tick >= TOTAL_TICKS);
    const broken = GAMES.filter(({ state }) => state.tick < TOTAL_TICKS);
    expect(full.length, 'alguna de las cinco semillas debe llegar a los sesenta años').toBeGreaterThan(0);
    for (const { seed, milestones } of full) {
      expect(milestones.length, `seed ${seed}: ${milestones.length} hitos`)
        .toBeGreaterThanOrEqual(10);
      expect(milestones.length, `seed ${seed}: ${milestones.length} hitos`)
        .toBeLessThanOrEqual(80);
    }
    for (const { seed, state, milestones } of broken) {
      const lived = state.tick / TIME.WEEKS_PER_YEAR;
      expect(milestones.length, `seed ${seed}: ${milestones.length} hitos en ${lived.toFixed(0)} años`)
        .toBeGreaterThan(0);
      expect(milestones.length, `seed ${seed}: ${milestones.length} hitos en ${lived.toFixed(0)} años`)
        .toBeLessThanOrEqual(80);
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
