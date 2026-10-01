// M-08 · Cobertura del catálogo. design.md §14.2, Anexo A.
//
// **Contra el juego, no contra un banco.** Esta prueba sustituye a
// `tests/balance/catalog-coverage.test.ts`, que barría 30 semillas × 150 años
// sobre `tests/helpers/catalogue-bench.ts` y **daba muertas plantillas que el
// juego plantea en todos los valles**.
//
// La causa estaba escrita en el propio banco desde el principio: funda con
// **veinte personas en el tick 0** —la aldea de antes de la pareja fundadora,
// 15 sep 2026— y las mantiene ahí, con su propio bucle de tick escrito a mano.
// La premisa que lo justificaba («la partida real tarda siglos en visitar estos
// estados, y el contenido muerto tiene que cazarse por la forma de sus
// condiciones») **caducó**: con la fundación de dos y el ritmo de 4.16, la
// partida real los visita.
//
// Medido el 19 sep 2026 con `foundGame` + `run` y la política prudente:
//
// | banco | mudas |
// |---|---|
// | 8 semillas × 60 años, 21 s | `plague_blame`, `quiet_years` |
// | 12 × 60, 28 s | `plague_blame`, `quiet_years` |
// | **12 × 100, 49 s** | **`quiet_years`** |
// | 24 × 60, 57 s | `plague_blame`, `quiet_years` |
// | 24 × 100, 95 s | `quiet_years` |
//
// Las tres que las dos pruebas viejas daban por muertas o excusaban a mano
// —`chapel_or_granary`, `one_at_the_ford`, `breaking_ground`— salen en 24, 24 y
// 11 valles de 24. No había contenido muerto: había un banco que no es el juego.
//
// **Y vive en las jornadas, no en el banco de balance**, que es la otra mitad
// del arreglo: en `tests/balance/` nadie la corría, porque ese banco cuesta más
// que su propio presupuesto de 45 minutos. Aquí cuesta 49 s de los menos de
// cinco minutos que `CLAUDE.md` le da a las jornadas, y se ejecuta con
// `npm run test:all`.

import { describe, expect, it } from 'vitest';
import { CROSSROAD_EFFECTS, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { evaluate } from '@engine/crossroads/conditions';
import type { CrossroadCategory } from '@engine/crossroads/schema';
import { foundGame } from '@engine/found';
import { ageOf } from '@engine/people/villagers';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';

/**
 * `quiet_years` es la **reserva de garantía** de §8.6: existe para que nunca
 * haya un silencio largo, y no compite con las demás. Que no salga nunca con
 * el catálogo lleno es su contrato cumpliéndose, no contenido muerto — y es
 * además decisión escrita del dueño del diseño (`task-log.md` §4): «se queda
 * donde está».
 */
const RESERVE = 'quiet_years';

/**
 * RD-3 · Una foto del estado cada vez que se plantea una de las cuatro
 * reescritas cuyas propiedades sólo se ven jugando (quién es B, qué edificios
 * hay, si cabe otro campo). Se clona sólo en esos casos: cuesta lo que cuestan
 * unas decenas de clones en doce partidas de cien años.
 */
interface Posed { seed: number; id: string; tick: number; state: GameState }
const SNAPSHOT = ['feud_inherited', 'smith_feud', 'forest_cut', 'first_stone'];

/** Los valles que llegan a ver cada plantilla planteada, jugando de verdad. */
function coverage(seeds: number, years: number): {
  valleys: Map<string, number>;
  posed: Posed[];
  perSeed: Map<number, Map<string, number>>;
} {
  const valleys = new Map<string, number>();
  const posed: Posed[] = [];
  const perSeed = new Map<number, Map<string, number>>();
  for (let seed = 0; seed < seeds; seed += 1) {
    const state = foundGame(seed);
    const here = new Set<string>();
    const mine = new Map<string, number>();
    perSeed.set(seed, mine);
    // Se cuenta la **transición** a planteada y no el tick con una pendiente:
    // una decisión sin contestar se queda semanas en `state.crossroad` (§8.6 no
    // plantea dos), así que contar ticks contaría la espera, no la pregunta.
    let pending: string | null = null;
    for (let week = 0; week < years * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
      run(state, 1, 'prudent', CATALOG);
      const now = state.crossroad?.templateId ?? null;
      if (now !== null && now !== pending) {
        here.add(now);
        mine.set(now, (mine.get(now) ?? 0) + 1);
        if (SNAPSHOT.includes(now)) posed.push({ seed, id: now, tick: state.tick, state: structuredClone(state) });
      }
      pending = now;
    }
    for (const id of here) valleys.set(id, (valleys.get(id) ?? 0) + 1);
  }
  return { valleys, posed, perSeed };
}

describe('M-08 · el catálogo entero llega a plantearse, jugando', () => {
  const { valleys: seen, posed, perSeed } = coverage(12, 100);

  it('ninguna plantilla se queda a cero, salvo la reserva', () => {
    // Contenido muerto de verdad: condiciones que no se cumplen nunca en una
    // partida. Con veintiuna plantillas escritas a mano es el fallo más fácil
    // de cometer y el más difícil de ver — y el más fácil de diagnosticar mal,
    // que es lo que pasó durante meses.
    const silent = CATALOG.filter((t) => t.id !== RESERVE && (seen.get(t.id) ?? 0) === 0)
      .map((t) => t.id);
    expect(silent, `sin salir nunca: ${silent.join(', ')}`).toEqual([]);
  });

  it('ninguna categoría se queda muda', () => {
    const byCategory = new Set(
      CATALOG.filter((t) => (seen.get(t.id) ?? 0) > 0).map((t) => t.category),
    );
    // RD-3 (1 oct 2026): `faith` ya no tiene plantillas vivas —`chapel_or_granary`
    // y `relic_pedlar` se retiraron del sorteo— y no se pide que hable.
    for (const c of [
      'famine', 'plague', 'lord', 'feud', 'forest', 'stranger', 'succession', 'hamlet',
    ] as CrossroadCategory[]) {
      expect(byCategory.has(c), c).toBe(true);
    }
  });

  it('y la reserva sigue siendo reserva', () => {
    // Si `quiet_years` empezara a salir con el catálogo lleno, lo que estaría
    // diciendo es que el resto del catálogo se ha quedado sin condiciones que
    // cumplir. Es el canario, y por eso se afirma su silencio en vez de
    // excusarlo.
    expect(seen.get(RESERVE) ?? 0, 'la reserva ha empezado a salir').toBe(0);
  });
  // ---- RD-3 (1 oct 2026) · las encrucijadas reescritas, plantadas jugando ----
  //
  // Lo que `tests/fast/rd3-catalogue.test.ts` no puede ver porque pasa cuando la
  // pregunta se plantea en una partida de verdad: quién es B, qué hay en pie.
  const of = (id: string): Posed[] => posed.filter((p) => p.id === id);
  const SIX = ['plague_blame', 'tithe_demand', 'chapel_or_granary', 'relic_pedlar', 'wolf_winter', 'bandits'];

  it('RD-3 · `feud_inherited`: B tiene nombre ya en la tarjeta, es adulto y odia de verdad a A', () => {
    // RD-0 midió la llave `{B}` literal en 12 de 12 y un oficio de herrero a una
    // chica de catorce años.
    const cases = of('feud_inherited');
    expect(cases.length, 'nunca se planteó en 12 × 100').toBeGreaterThan(0);
    for (const { seed, state } of cases) {
      const cast = state.crossroad!.cast;
      const a = state.people.villagers.find((v) => v.id === cast['A']);
      const b = state.people.villagers.find((v) => v.id === cast['B']);
      expect(b?.named, `semilla ${seed}: B nombrado`).toBe(true);
      expect(b?.name, `semilla ${seed}: B sin llave {B}`).not.toBe('');
      expect(ageOf(b!, state.tick), `semilla ${seed}: B adulto`).toBeGreaterThanOrEqual(18);
      expect(b?.opinions[a!.id] ?? 0, `semilla ${seed}: rencor real`)
        .toBeLessThanOrEqual(-CROSSROAD_EFFECTS.FEUD_INHERITED_MIN_OPINION);
      // El oficio de herrero sólo se ofrece sin herrero, y nunca por debajo de
      // lo que el oficio pide (`ROLE_MIN_AGE.smith`).
      if (state.crossroad!.optionIds.includes('give_b_the_smithy')) {
        expect(state.people.villagers.some((v) => v.diedTick === null && v.leftTick === null && v.role === 'smith')).toBe(false);
        expect(ageOf(b!, state.tick), `semilla ${seed}: edad para herrero`).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('RD-3 · `smith_feud`: la riña existe, y no sale exactamente cuatro veces en cada semilla', () => {
    const cases = of('smith_feud');
    expect(cases.length).toBeGreaterThan(0);
    for (const { seed, state } of cases) {
      const cast = state.crossroad!.cast;
      const b = state.people.villagers.find((v) => v.id === cast['B']);
      expect(b?.opinions[cast['A']!] ?? 0, `semilla ${seed}`)
        .toBeLessThanOrEqual(-CROSSROAD_EFFECTS.SMITH_FEUD_MIN_OPINION);
    }
    // RD-0: «exactamente 4 por semilla» (el reposo de quince años mandaba).
    const counts = [...perSeed.values()].map((m) => m.get('smith_feud') ?? 0);
    expect(new Set(counts).size, `cuentas por semilla: ${counts.join(',')}`).toBeGreaterThan(1);
  });

  it('RD-3 · `forest_cut`: sale con sitio para otro campo, y no cuatro veces clavadas', () => {
    const cases = of('forest_cut');
    expect(cases.length).toBeGreaterThan(0);
    for (const { seed, state } of cases) {
      expect(evaluate({ k: 'room', building: 'field' }, state), `semilla ${seed}: hay sitio`).toBe(true);
    }
    const counts = [...perSeed.values()].map((m) => m.get('forest_cut') ?? 0);
    expect(counts.every((n) => n === 4), `todas exactamente 4: ${counts.join(',')}`).toBe(false);
  });

  it('RD-3 · `first_stone`: llega con la iglesia en pie y el cerco sin cerrar, mucho antes del año 41', () => {
    const cases = of('first_stone');
    expect(cases.length).toBeGreaterThan(0);
    for (const { seed, tick, state } of cases) {
      expect(state.buildings.some((b) => b.kind === 'church' && b.lostTick === null), `semilla ${seed}: iglesia`).toBe(true);
      expect(state.flags['wall_closed'], `semilla ${seed}: cerco sin cerrar`).toBeUndefined();
      expect(tick / TIME.WEEKS_PER_YEAR, `semilla ${seed}: año`).toBeLessThan(40);
    }
  });

  it('RD-3 · las seis retiradas no se plantean nunca', () => {
    for (const [seed, counts] of perSeed) {
      for (const id of SIX) expect(counts.get(id) ?? 0, `${seed}: ${id}`).toBe(0);
    }
  });
});
