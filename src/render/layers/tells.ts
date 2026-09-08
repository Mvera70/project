// M-21 · Exact state translated into marks on the valley.

import { FOOD } from '@engine/balance';
import { isHere, population } from '@engine/people/demography';
import { storageCapacity } from '@engine/subsistence/harvest';
import type { GameState } from '@engine/state';
import type { DrawingContext } from '../sprites';
import type { Palette } from '../palette';

export type Tell =
  | { kind: 'granary'; x: number; y: number; fraction: number }
  | { kind: 'smoke'; x: number; y: number; intensity: number }
  | { kind: 'light'; x: number; y: number }
  | { kind: 'candles'; x: number; y: number; count: number }
  | { kind: 'plague'; x: number; y: number };

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
  for (const building of state.buildings) {
    if (building.lostTick !== null) continue;
    if (building.kind === 'granary') tells.push({ kind: 'granary', x: building.x, y: building.y, fraction: Math.min(1, state.village.grain / storageCapacity(state)) });
    if ((building.kind === 'house' || building.kind === 'stone_house') && occupied.has(building.id)) {
      tells.push({ kind: 'smoke', x: building.x + building.w / 2, y: building.y, intensity: state.village.morale / 100 });
      tells.push({ kind: 'light', x: building.x + building.w / 2, y: building.y + building.h * 0.7 });
      if (state.outbreak !== null && state.outbreak.endsTick > state.tick) tells.push({ kind: 'plague', x: building.x + building.w * 0.8, y: building.y + building.h * 0.8 });
    }
    if (building.kind === 'chapel' || building.kind === 'church') tells.push({ kind: 'candles', x: building.x + building.w / 2, y: building.y + building.h * 0.7, count: Math.ceil(state.village.faith / 20) });
  }
  return tells;
}

export function paintTells(ctx: DrawingContext, tells: readonly Tell[], palette: Palette, cell: number, fraction: number): void {
  for (const tell of tells) {
    if (tell.kind === 'smoke') {
      ctx.fillStyle = `rgba(70,70,65,${(0.15 + tell.intensity * 0.55).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(tell.x * cell, (tell.y - 0.25) * cell, 0.2 * cell, 0, Math.PI * 2); ctx.fill();
    } else if (tell.kind === 'light' && fraction >= 0.8) {
      ctx.fillStyle = '#e6b85c'; ctx.fillRect((tell.x - 0.13) * cell, (tell.y - 0.1) * cell, 0.26 * cell, 0.2 * cell);
    } else if (tell.kind === 'granary') {
      ctx.fillStyle = palette.field; ctx.fillRect((tell.x + 0.48) * cell, (tell.y + 1.35 - tell.fraction * 0.7) * cell, 1.04 * cell, tell.fraction * 0.7 * cell);
    } else if (tell.kind === 'candles') {
      ctx.fillStyle = '#e6b85c'; for (let i = 0; i < tell.count; i += 1) ctx.fillRect((tell.x - 0.3 + i * 0.15) * cell, tell.y * cell, 0.08 * cell, 0.18 * cell);
    } else if (tell.kind === 'plague') {
      ctx.strokeStyle = '#f2f4f6'; ctx.lineWidth = Math.max(1, cell * 0.12); ctx.beginPath(); ctx.moveTo((tell.x - 0.2) * cell, tell.y * cell); ctx.lineTo((tell.x + 0.2) * cell, tell.y * cell); ctx.moveTo(tell.x * cell, (tell.y - 0.2) * cell); ctx.lineTo(tell.x * cell, (tell.y + 0.2) * cell); ctx.stroke();
    }
  }
}
