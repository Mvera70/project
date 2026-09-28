// §7.15 · Las expediciones del tablón (28 sep 2026). Lo que el dueño del
// diseño pidió, como propiedades: el jugador dice cuántos y la aldea quiénes;
// nunca se vacía la aldea ni se va quien manda; los que se van no están; y es
// un juego de doble filo — con muchas salidas salen todos los finales.

import { describe, expect, it } from 'vitest';
import { EXPEDITION, LIFE, TIME } from '@engine/balance';
import { BANK } from '@engine/chronicle/bank.en';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { isHere, population } from '@engine/people/demography';
import { ageOf } from '@engine/people/villagers';
import { deserialize, serialize } from '@engine/save';
import { run, tick } from '@engine/sim';
import type { GameState, MissionId } from '@engine/state';
import { MISSION_IDS } from '@engine/state';
import { seasonOf } from '@engine/time';
import { missionSpec, missionsOpen, returnExpeditions, sendExpedition, type ExpeditionEnd } from '@engine/world/expeditions';
import { foundTwenty } from '../helpers/founding';

const SEEDS = [7, 23, 41];

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

function adultsHere(state: GameState): number {
  return state.people.villagers.filter((v) => isHere(v)
    && ageOf(v, state.tick) >= LIFE.ADULT[0] && ageOf(v, state.tick) <= LIFE.ADULT[1]).length;
}

describe('las expediciones del tablón · §7.15', () => {
  it('el tablón crece con el valle: la pareja no anuncia nada, una aldea hecha anuncia las sencillas', () => {
    expect(missionsOpen(foundGame(7))).toHaveLength(0);
    for (const seed of SEEDS) {
      const open = missionsOpen(summerVillage(seed));
      expect(open.find((m) => m.id === 'mushrooms')?.refusal, `semilla ${seed}`).toBeNull();
      // Y en el orden del tablón, de la más sencilla a la más arriesgada.
      expect(open.map((m) => m.id)).toEqual(MISSION_IDS.slice(0, open.length));
    }
  });

  it('el jugador dice cuántos; la aldea elige, no manda al líder y deja gente en casa', () => {
    for (const seed of SEEDS) {
      const state = summerVillage(seed);
      const before = population(state);
      const home = adultsHere(state);
      const most = missionsOpen(state).find((m) => m.id === 'mushrooms')!.most;
      const out = sendExpedition(state, 'mushrooms', 99, 12);
      expect(out.sent).toBe(true);
      const trip = state.expeditions[0]!;
      expect(trip.who).toHaveLength(most);
      expect(population(state)).toBe(before - most);
      expect(adultsHere(state)).toBeGreaterThanOrEqual(Math.min(home, EXPEDITION.MIN_HOME));
      for (const id of trip.who) {
        const v = state.people.villagers.find((x) => x.id === id)!;
        expect(v.role).not.toBe('leader');
        expect(v.id).not.toBe(state.crown?.id);
      }
      // No se manda dos veces la misma mientras está fuera.
      expect(sendExpedition(state, 'mushrooms', 1, 12).refusal).toBe('away');
    }
  });

  it('los que se van no están, y vuelven cuando toca', () => {
    for (const seed of SEEDS) {
      const state = summerVillage(seed);
      tick(state, CATALOG, undefined, [{ kind: 'expedition', mission: 'mushrooms', count: 2 }]);
      const trip = state.expeditions[0]!;
      expect(trip).toBeDefined();
      for (let w = 0; w < missionSpec('mushrooms').weeks - 1; w += 1) {
        tick(state, CATALOG);
        for (const id of trip.who) expect(isHere(state.people.villagers.find((v) => v.id === id)!)).toBe(false);
      }
      tick(state, CATALOG);
      // Vuelve: la semana de la vuelta se queda con su final, y después se va.
      expect(state.expeditions[0]!.end).not.toBeNull();
      expect(missionsOpen(state).find((m) => m.id === 'mushrooms')?.refusal).not.toBe('away');
      const alive = trip.who.map((id) => state.people.villagers.find((v) => v.id === id)!).filter((v) => v.diedTick === null);
      for (const v of alive) expect(v.leftTick).toBeNull();
      expect(state.chronicle.some((e) => e.kind === 'expedition' && e.tick === state.tick)).toBe(true);
    }
  });

  it('es de doble filo: en muchas salidas a la veta salen todos los finales', () => {
    const seen = new Set<ExpeditionEnd>();
    for (const seed of SEEDS) {
      const base = summerVillage(seed, 20);
      for (let trial = 0; trial < 60; trial += 1) {
        const state = structuredClone(base);
        state.rng.expeditions = (state.rng.expeditions + trial * 2654435761) >>> 0;
        state.village.silver = 100;
        const sent = sendExpedition(state, 'high_seam', 2, 20);
        if (!sent.sent) break;
        state.tick += missionSpec('high_seam').weeks;
        for (const back of returnExpeditions(state, 20)) seen.add(back.end);
      }
    }
    for (const end of ['back', 'back_mourning', 'empty', 'empty_mourning', 'lost'] as const) {
      expect(seen.has(end), `sale «${end}»`).toBe(true);
    }
  });

  it('cuesta lo que dice, y la vuelta con éxito paga lo que dice', () => {
    const state = summerVillage(23, 20);
    state.village.silver = 50;
    const before = state.village.silver;
    expect(sendExpedition(state, 'wolf_den', 3, 20).sent).toBe(true);
    expect(state.village.silver).toBe(before - missionSpec('wolf_den').silver);
  });

  it('es determinista, y volver no toca ninguna otra tirada', () => {
    const a = summerVillage(7), b = summerVillage(7);
    for (const s of [a, b]) tick(s, CATALOG, undefined, [{ kind: 'expedition', mission: 'mushrooms', count: 3 }]);
    for (let w = 0; w < 6; w += 1) { tick(a, CATALOG); tick(b, CATALOG); }
    expect(a.chronicle).toEqual(b.chronicle);
    expect(a.people.villagers).toEqual(b.people.villagers);
    const c = summerVillage(41, 20);
    c.village.silver = 100;
    sendExpedition(c, 'high_seam', 3, 20);
    c.tick += missionSpec('high_seam').weeks;
    const others = (rng: typeof c.rng): Record<string, number> =>
      Object.fromEntries(Object.entries(rng).filter(([stream]) => stream !== 'expeditions'));
    const before = others(c.rng);
    returnExpeditions(c, 20);
    expect(others(c.rng)).toEqual(before);
  });

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
