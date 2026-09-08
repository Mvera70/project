// M-19 · Deterministic debug route for automated screenshots.

import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { run } from '@engine/sim';
import type { GameState, Season } from '@engine/state';
import { SEASONS } from '@engine/time';

export interface DebugRequest {
  seed: number;
  year: number;
  season: Season;
}

export function parseDebugRequest(search: string): DebugRequest | null {
  const query = new URLSearchParams(search);
  if (query.get('debug') !== '1') return null;
  const seed = Number(query.get('seed') ?? 7);
  const year = Number(query.get('year') ?? 1);
  const requested = query.get('season') ?? 'spring';
  const season = SEASONS.find((value) => value === requested);
  if (!Number.isInteger(seed) || !Number.isInteger(year) || year < 0 || season === undefined) {
    throw new Error('Invalid debug route: seed and year must be integers and season must be valid.');
  }
  return { seed, year, season };
}

export function stateAt(request: DebugRequest): GameState {
  const state = foundGame(request.seed);
  const seasonIndex = SEASONS.indexOf(request.season);
  const targetTick = request.year * TIME.WEEKS_PER_YEAR + seasonIndex * TIME.WEEKS_PER_SEASON;
  run(state, targetTick, 'prudent', CATALOG);
  return state;
}

function diagnosticCanvas(root: HTMLElement, state: GameState, request: DebugRequest): void {
  root.replaceChildren();
  const shell = document.createElement('main');
  shell.id = 'valley-shell';
  shell.style.cssText = 'width:390px;height:844px;display:grid;place-items:start center;background:#b9c9cf;color:#3c3a34';
  const canvas = document.createElement('canvas');
  canvas.id = 'valley';
  canvas.width = 720;
  canvas.height = 1120;
  canvas.style.cssText = 'width:360px;height:560px;margin-top:22px;background:#8fae5b';
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D is unavailable.');
  ctx.scale(2, 2);
  ctx.fillStyle = '#8fae5b';
  ctx.fillRect(0, 0, 360, 560);
  ctx.fillStyle = '#3c3a34';
  ctx.font = '16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('M-19 · render diagnostic', 180, 260);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`seed ${request.seed} · year ${request.year} · ${request.season}`, 180, 286);
  ctx.fillText(`${population(state)} villagers · tick ${state.tick}`, 180, 308);
  shell.append(canvas);
  root.append(shell);
}

export function mountDebug(root: HTMLElement, request: DebugRequest): GameState {
  const state = stateAt(request);
  diagnosticCanvas(root, state, request);
  document.documentElement.dataset.debugReady = 'true';
  return state;
}

