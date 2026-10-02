// Lo lento de este fichero vive en `tests/journeys/expeditions-long.test.ts` (v5.56).
//
// §7.15 · Las expediciones del tablón (28 sep 2026). Lo que el dueño del
// diseño pidió, como propiedades: el jugador dice cuántos y la aldea quiénes;
// nunca se vacía la aldea ni se va quien manda; los que se van no están; y es
// un juego de doble filo — con muchas salidas salen todos los finales.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { BANK } from '@engine/chronicle/bank.en';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { deserialize, serialize } from '@engine/save';
import { run, tick } from '@engine/sim';
import type { GameState, MissionId } from '@engine/state';
import { MISSION_IDS } from '@engine/state';
import { seasonOf } from '@engine/time';
import { missionSpec } from '@engine/world/expeditions';
import { foundTwenty } from '../helpers/founding';
const grown = new Map<string, GameState>();
/** Una aldea hecha, en verano (todas las misiones abren en verano). Una copia cada vez. */
function summerVillage(seed: number, years = 12): GameState {
  const key = `${seed}:${years}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
    while (seasonOf(base.tick) !== 'summer') tick(base, CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}
describe('las expediciones del tablón · §7.15', () => {
  it('cada misión y cada final tienen su frase en la crónica', () => {
    const keys = new Set(Object.keys(BANK));
    for (const id of MISSION_IDS as readonly MissionId[]) {
      expect(keys.has(`expedition.${id}.sent`), id).toBe(true);
      expect(keys.has(`expedition.${id}.back`), id).toBe(true);
      for (const end of ['back_mourning', 'empty', 'empty_mourning', 'lost']) {
        expect(keys.has(`expedition.${end}.${missionSpec(id).where}`), `${end}.${missionSpec(id).where}`).toBe(true);
      }
    }
  });

  it('una partida con caza, batalla y gente fuera se guarda y se carga', () => {
    const state = summerVillage(7);
    tick(state, CATALOG, undefined, [
      { kind: 'expedition', mission: 'mushrooms', count: 1 },
      { kind: 'battle', slain: 0, lost: 0, breached: false },
      { kind: 'hunt', sourceTick: state.tick, species: 'deer', weapon: 'bow', hits: 1, killed: true },
    ]);
    expect(state.expeditions.length).toBeGreaterThan(0);
    const back = deserialize(structuredClone(serialize(state, [], [], 0)));
    expect(back.state.expeditions).toEqual(state.expeditions);
    expect(back.state.acts).toEqual(state.acts);
    // Y una guardada antes de las expediciones carga con la lista vacía.
    const old = structuredClone(serialize(foundGame(7), [], [], 0));
    const raw = old.state as unknown as Record<string, unknown> & { rng: Record<string, number | undefined> };
    delete raw['expeditions'];
    delete raw.rng['expeditions'];
    expect(deserialize(old).state.expeditions).toEqual([]);
  });
});
