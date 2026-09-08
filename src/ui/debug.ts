// M-19 · Deterministic debug route for automated screenshots.

import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { GameState, Season } from '@engine/state';
import { SEASONS } from '@engine/time';
import { makeBackground, sizeCanvas } from '@render/canvas';
import { paletteFor } from '@render/palette';

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
  const targetTick = request.year * TIME.WEEKS_PER_YEAR + seasonIndex * TIME.WEEKS_PER_SEASON + 6;
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
  sizeCanvas(canvas, 10, 2);
  canvas.style.marginTop = '22px';
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D is unavailable.');
  const palette = paletteFor(request.season, 6);
  shell.style.background = palette.void;
  ctx.scale(2, 2);
  ctx.drawImage(makeBackground(state.map, palette, 10), 0, 0);
  shell.append(canvas);
  root.append(shell);
}

export function mountDebug(root: HTMLElement, request: DebugRequest): GameState {
  const state = stateAt(request);
  diagnosticCanvas(root, state, request);
  document.documentElement.dataset.debugReady = 'true';
  return state;
}
