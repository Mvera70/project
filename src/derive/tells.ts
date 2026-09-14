// Lo que el estado dice de sí mismo, traducido a señales sobre el valle.
//
// M-21 lo escribió para el Canvas y por eso vivía en `render/layers/`. Ni una
// línea de esto dibuja: son coordenadas y cantidades que salen del estado, y
// las leen los dos renders —`render/layers/tells.ts` las pinta en 2D y
// `render3d/effects/tells.ts` en 3D—. Vive aquí desde que el 3D pasó a ser el
// juego: el render nuevo no puede depender del viejo para saber qué hay que
// contar (ver `src/derive/README.md`).

import { FOOD } from '@engine/balance';
import { isHere, population } from '@engine/people/demography';
import { storageCapacity } from '@engine/subsistence/harvest';
import type { GameState } from '@engine/state';
import { bannersAt, dousedAt } from './marks';
import { CATALOG } from '@engine/crossroads/catalog';

export type Tell =
  | { kind: 'granary'; x: number; y: number; fraction: number }
  | { kind: 'smoke'; x: number; y: number; intensity: number }
  | { kind: 'light'; x: number; y: number }
  | { kind: 'candles'; x: number; y: number; count: number }
  | { kind: 'plague'; x: number; y: number }
  | { kind: 'banner'; x: number; y: number; colour: string };

export function hungerSeverity(state: GameState): number {
  const people = population(state);
  if (people === 0) return 0;
  const shortage = Math.max(0, people * FOOD.GRAIN_PER_PERSON - state.village.grain) / (people * FOOD.GRAIN_PER_PERSON);
  const until = state.flags['forced_hunger'];
  return Math.max(shortage, until !== undefined && (until === 0 || until > state.tick) ? 0.5 : 0);
}

export function tellsFor(state: GameState): Tell[] {
  const tells: Tell[] = [];
  const occupied = new Set(state.people.villagers.filter(isHere).map((person) => person.homeId));
  // §11.8, v3.01: los que una decisión mandó apagar. Sin humo, sin luz y sin
  // velas mientras dure — que es exactamente lo que `douse` prometía y lo que
  // ninguna de las ocho opciones que lo declaran llegaba a enseñar.
  const doused = dousedAt(state, CATALOG);
  for (const building of state.buildings) {
    if (building.lostTick !== null) continue;
    if (doused.has(building.id)) continue;
    if (building.kind === 'granary') tells.push({ kind: 'granary', x: building.x, y: building.y, fraction: Math.min(1, state.village.grain / storageCapacity(state)) });
    if ((building.kind === 'house' || building.kind === 'stone_house') && occupied.has(building.id)) {
      tells.push({ kind: 'smoke', x: building.x + building.w / 2, y: building.y, intensity: state.village.morale / 100 });
      tells.push({ kind: 'light', x: building.x + building.w / 2, y: building.y + building.h * 0.7 });
      if (state.outbreak !== null && state.outbreak.endsTick > state.tick) tells.push({ kind: 'plague', x: building.x + building.w * 0.8, y: building.y + building.h * 0.8 });
    }
    if (building.kind === 'chapel' || building.kind === 'church') tells.push({ kind: 'candles', x: building.x + building.w / 2, y: building.y + building.h * 0.7, count: Math.ceil(state.village.faith / 20) });
  }
  for (const banner of bannersAt(state, CATALOG)) {
    tells.push({ kind: 'banner', x: banner.x, y: banner.y, colour: banner.colour });
  }
  return tells;
}
