// M-19 · Deterministic debug route for automated screenshots.

import { skyAt } from '../derive/weather';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { GameState, Season } from '@engine/state';
import { SEASONS } from '@engine/time';
import { paintVillageBackground, sizeCanvas } from '@render/canvas';
import { paletteFor } from '@derive/palette';
import { auditSprites } from '@render/sprites/audit';
import { crowdPositions } from '@render/crowd';
import { paintFigures, paintFigureShadows } from '@render/layers/figures';

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

/**
 * U-13 · Adelanta el valle hasta una semana cuya **primera jornada** sea de
 * tormenta, y devuelve cuántas semanas hizo falta.
 *
 * Una tormenta sale en el 4 % de las jornadas, así que esperarla mirando no es
 * una forma de fotografiarla: esto es lo que le da a `?weather=storm` una
 * tormenta segura en el primer fotograma. La jornada que el juego pinta al
 * abrir es `tick · DAYS_PER_WEEK` —el tiempo escénico se lee del tick desde
 * v3.72—, así que basta con probar semanas hasta que esa jornada truene.
 */
export function runToStorm(state: GameState, limitWeeks = 400): number {
  for (let weeks = 0; weeks < limitWeeks; weeks += 1) {
    if (skyAt(state, state.tick * TIME.DAYS_PER_WEEK).kind === 'storm') return weeks;
    run(state, 1, 'prudent', CATALOG);
  }
  return limitWeeks;
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
  ctx.drawImage(paintVillageBackground(state, palette, 10), 0, 0);
  const figures = crowdPositions(state, 0.45);
  paintFigureShadows(ctx, figures, 10);
  paintFigures(ctx, figures, palette, 10);
  shell.append(canvas);
  root.append(shell);
}

export function mountDebug(root: HTMLElement, request: DebugRequest): GameState {
  const state = stateAt(request);
  diagnosticCanvas(root, state, request);
  document.documentElement.dataset.debugReady = 'true';
  document.documentElement.dataset.spriteAudit = JSON.stringify(auditSprites());
  return state;
}
