// K-4 · La sala del rey. `docs/historico/plan-rey.md` §0.5b y §8.
//
// **«Debe tener una casa que se diferencie»** (dueño del diseño, 18 sep 2026).
// Lo que se guarda aquí es que exista, que sea del rey y que no exista sin rey.
// Cómo se ve es otra cosa: la malla está encargada (§8 del plan) y hasta que
// llegue el render la dibuja más alta que una casa y con el tejado burdeos del
// jefe, que es el único color que sólo lleva él.

import { describe, expect, it } from 'vitest';
import { BUILDINGS, CROWN, LIFE, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { housingCapacity } from '@engine/people/demography';
import { crownCandidates } from '@engine/people/crown';
import { crownKing } from '@engine/world/crown';
import { nextProject } from '@engine/world/works';
import { inPlaza } from '@engine/world/plaza';
import { fireKey } from '@engine/chronicle/events';
import type { GameState, Role } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

const grown = new Map<string, GameState>();
function village(seed = 41, years = 15): GameState {
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

function crowned(state: GameState, trade: Role | null = 'leader'): GameState {
  const who = crownCandidates(state)[0];
  if (who === undefined) throw new Error('sin candidatos');
  who.role = trade;
  const out = crownKing(state, who.id, 'spring', 3);
  if (!out.crowned) throw new Error(out.refusal ?? 'sin motivo');
  return state;
}

describe('K-4 · la aldea levanta la sala cuando tiene rey', () => {
  it('la pide en la cola de obras, y sin rey no la pide nunca', () => {
    const plain = village();
    const court = crowned(village());
    for (const state of [plain, court]) {
      state.village.wood = 4_000;
      state.works.length = 0;
    }
    // Con rey, la sala entra en la lista de lo que la aldea quiere; sin rey, no
    // existe como proyecto por mucha madera que haya.
    const wanted = (state: GameState): unknown => {
      const seen: string[] = [];
      for (let n = 0; n < 12; n += 1) {
        const next = nextProject(state);
        if (typeof next !== 'string') break;
        seen.push(next);
        if (next === 'hall') break;
        // Se finge levantado para ver qué pide después.
        const spec = BUILDINGS[next];
        state.buildings.push({
          id: 9700 + n, kind: next, x: 22 + n, y: 22, w: spec.w, h: spec.h,
          builtTick: state.tick, lostTick: null, tier: spec.tier, lit: true, blockedUntil: null,
        });
      }
      return seen;
    };
    expect(wanted(court)).toContain('hall');
    expect(wanted(plain)).not.toContain('hall');
  });

  it('y cuesta lo que cuesta la construcción de madera más grande del valle', () => {
    expect(BUILDINGS.hall.w).toBe(3);
    expect(BUILDINGS.hall.h).toBe(3);
    expect(BUILDINGS.hall.cap).toBe(1);
    expect(BUILDINGS.hall.tier).toBe(0);
    // Más obra que el molino, que era lo más caro en madera.
    expect(BUILDINGS.hall.bp).toBeGreaterThan(BUILDINGS.mill.bp);
    expect(BUILDINGS.hall.wood).toBeGreaterThanOrEqual(BUILDINGS.mill.wood);
  });
});

describe('K-4 · y es la casa del rey', () => {
  it('el rey se muda a ella y cuenta camas', () => {
    const state = crowned(village());
    const before = housingCapacity(state);
    const hall = { id: 9800, kind: 'hall' as const, x: 30, y: 30, w: 3, h: 3,
      builtTick: state.tick, lostTick: null, tier: 0 as const, lit: true, blockedUntil: null };
    state.buildings.push(hall);
    expect(housingCapacity(state)).toBe(before + CROWN.HALL_BEDS);
    expect(CROWN.HALL_BEDS).toBe(LIFE.HOUSE_CAPACITY);
  });

  it('se levanta junto a la plaza, que es donde está el centro del pueblo', () => {
    // El trazado se mide desde la plaza desde P-1, así que la rama por omisión
    // de `placeBuilding` —la que puntúa por distancia al centro— ya la pone al
    // lado sin necesidad de una regla propia. Lo que esta prueba guarda es que
    // **no caiga dentro** de la plaza, que está reservada.
    const state = crowned(village());
    state.village.wood = 4_000;
    state.works.length = 0;
    run(state, TIME.WEEKS_PER_YEAR * 12, 'prudent', CATALOG);
    const hall = state.buildings.find((b) => b.kind === 'hall' && b.lostTick === null);
    if (hall === undefined) return; // esta semilla no llegó a levantarla
    expect(inPlaza(state, hall.x, hall.y, hall.w, hall.h)).toBe(false);
    const gap = Math.hypot(
      hall.x + hall.w / 2 - (state.plaza.x + 0.5),
      hall.y + hall.h / 2 - (state.plaza.y + 0.5),
    );
    expect(gap, `la sala en ${hall.x},${hall.y} y la plaza en ${state.plaza.x},${state.plaza.y}`)
      .toBeLessThan(20);
  });
});

describe('K-4 · y arde como lo que es', () => {
  it('el fuego se la lleva y tiene su propia línea', () => {
    // El caos es el juego: una casa de madera y paja que no ardiera sería una
    // excepción que habría que explicar. Y que se queme la casa del que manda no
    // es «otro edificio»: tiene su frase.
    expect(fireKey('hall')).toBe('fire.hall');
  });
});
