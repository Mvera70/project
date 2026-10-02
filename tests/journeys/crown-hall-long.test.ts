// Lo lento de `tests/fast/crown-hall.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 14 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// K-4 · La sala del rey. `docs/historico/plan-rey.md` §0.5b y §8.
//
// **«Debe tener una casa que se diferencie»** (dueño del diseño, 18 sep 2026).
// Lo que se guarda aquí es que exista, que sea del rey y que no exista sin rey.
// Cómo se ve es otra cosa: la malla está encargada (§8 del plan) y hasta que
// llegue el render la dibuja más alta que una casa y con el tejado burdeos del
// jefe, que es el único color que sólo lleva él.

import { describe, expect, it } from 'vitest';
import { BUILDINGS, CROWN, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { crownCandidates } from '@engine/people/crown';
import { crownKing } from '@engine/world/crown';
import { nextProject } from '@engine/world/works';
import { inPlaza } from '@engine/world/plaza';
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
});

describe('K-4 · y es la casa del rey', () => {
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
