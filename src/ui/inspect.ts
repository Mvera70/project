// M-21 · Hit testing and panel content without DOM dependencies.

import { population, isHere } from '@engine/people/demography';
import { ageOf } from '@engine/people/villagers';
import type { Building, GameState, Villager } from '@engine/state';
import { yearOf } from '@engine/time';
import { capacityOf } from '@engine/world/buildings';
import { crowdPositions } from '@render/crowd';

export type InspectTarget =
  | { kind: 'building'; id: number }
  | { kind: 'villager'; id: number }
  | { kind: 'terrain'; x: number; y: number };
export interface PanelModel { title: string; lines: string[] }

export function inspectAt(state: GameState, x: number, y: number, tickFraction = 0.45): InspectTarget | null {
  if (x < 0 || y < 0 || x > state.map.width || y > state.map.height) return null;
  const figures = crowdPositions(state, tickFraction);
  const figure = [...figures].reverse().find((item) => Math.hypot(x - item.x - 0.5, y - item.y - 0.8) <= 0.9);
  if (figure !== undefined) return { kind: 'villager', id: figure.id };
  const building = [...state.buildings].reverse().find((item) => item.lostTick === null &&
    x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
  if (building !== undefined) return { kind: 'building', id: building.id };
  const cellX = Math.floor(x); const cellY = Math.floor(y);
  if (cellX >= state.map.width || cellY >= state.map.height) return null;
  return { kind: 'terrain', x: cellX, y: cellY };
}

function buildingPanel(building: Building, state: GameState): PanelModel {
  const residents = state.people.villagers.filter((person) => isHere(person) && person.homeId === building.id);
  const lines = [`Raised in ANNO ${yearOf(building.builtTick) + 1}.`];
  if (building.kind === 'granary') lines.push(`${Math.floor(state.village.grain)} grain of ${capacityOf(state).storage} capacity.`);
  if (building.kind === 'house' || building.kind === 'stone_house') {
    const named = residents.filter((person) => person.named).map((person) => person.name);
    lines.push(`${residents.length} people under this roof${named.length > 0 ? `: ${named.join(', ')}` : '.'}`);
  }
  const role = building.kind === 'smithy' ? 'smith' : building.kind === 'chapel' || building.kind === 'church' ? 'priest' : null;
  if (role !== null) {
    const holder = state.people.villagers.find((person) => isHere(person) && person.role === role);
    lines.push(holder === undefined ? `No ${role} serves here.` : `${holder.name || `Villager ${holder.id}`} serves here as ${role}.`);
  }
  return { title: building.kind.replaceAll('_', ' '), lines };
}

function villagerPanel(person: Villager, state: GameState): PanelModel {
  const strong = Object.entries(person.opinions).filter(([, value]) => Math.abs(value) >= 40)
    .map(([id, value]) => `${value > 0 ? 'Trusts' : 'Resents'} ${state.people.villagers.find((v) => v.id === Number(id))?.name || `#${id}`}: ${value}.`)
    .slice(0, 2);
  const memories = [...person.memories].sort((a, b) => b.weight - a.weight || b.tick - a.tick).slice(0, 2)
    .map((memory) => `${memory.kind.replaceAll('_', ' ')} — ANNO ${yearOf(memory.tick) + 1}.`);
  return { title: person.name || `Villager ${person.id}`, lines: [
    `${ageOf(person, state.tick)} winters old.`,
    person.traits.length > 0 ? person.traits.join(', ') : 'No named traits.',
    ...memories, ...strong,
  ] };
}

export function panelFor(target: InspectTarget, state: GameState): PanelModel {
  if (target.kind === 'building') {
    const building = state.buildings.find((item) => item.id === target.id);
    return building === undefined ? { title: 'Gone', lines: [] } : buildingPanel(building, state);
  }
  if (target.kind === 'villager') {
    const person = state.people.villagers.find((item) => item.id === target.id);
    return person === undefined ? { title: 'Gone', lines: [] } : villagerPanel(person, state);
  }
  const code = state.map.terrain[target.y * state.map.width + target.x];
  const names = ['meadow', 'forest', 'water', 'rock', 'marsh'] as const;
  return { title: names[code ?? 0] ?? 'land', lines: [`${population(state)} people live in the valley.`] };
}
