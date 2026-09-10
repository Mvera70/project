/**
 * G-06 · Una partida real, pintada. design.md D.5, D.6.
 *
 * Funda una aldea, la corre los años que se le pidan y le pide al renderer que
 * la pinte en un instante concreto de un día escénico. Es la evidencia de la
 * ronda: el brief la da por terminada cuando una partida real produce una escena
 * correcta, y eso no se demuestra con un test.
 *
 * Todos los parámetros entran por la URL para que una captura diga exactamente
 * qué se pintó: semilla, años, tick y tiempo de presentación por separado, que
 * es lo que D.6 exige de una captura.
 */
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { isHere } from '@engine/people/demography';
import { createGraphicsRenderer } from '../../src/render3d/renderer';
import { actorsFor } from '../../src/render3d/actors';
import { SCENIC_DAY_SECONDS } from '../../src/render3d/presentation-clock';

interface SceneReport {
  seed: number;
  years: number;
  tick: number;
  dayPhase: number;
  villagers: number;
  onStage: number;
  buildings: number;
  activities: Record<string, number>;
  clips: Record<string, number>;
}

declare global {
  interface Window { valleySceneReport?: SceneReport }
}

const root = document.documentElement;
const status = document.querySelector<HTMLOutputElement>('#status');
const params = new URLSearchParams(location.search);

function number(name: string, fallback: number): number {
  const raw = params.get(name);
  const value = raw === null ? fallback : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function say(state: 'loading' | 'ready' | 'error', message: string): void {
  root.dataset.graphicsState = state;
  root.dataset.graphicsMessage = message;
  if (status !== null) status.textContent = message;
}

async function main(): Promise<void> {
  const seed = number('seed', 7);
  const years = number('years', 14);
  const phase = number('phase', 0.35);
  const width = number('width', 390);
  const height = number('height', 640);

  say('loading', `Founding seed ${seed} and running ${years} years`);
  const state = foundGame(seed);
  run(state, Math.round(years * 48), 'prudent', CATALOG);
  // Adelantar hasta la semana del año que se pida, para poder ver el mismo
  // valle en las cuatro estaciones sin fundar cuatro aldeas distintas.
  const week = number('week', -1);
  if (week >= 0) run(state, ((week - (state.tick % 48)) + 48) % 48, 'prudent', CATALOG);

  const canvas = document.querySelector<HTMLCanvasElement>('#stage');
  if (canvas === null) throw new Error('No canvas.');
  document.body.style.width = `${width}px`;

  const renderer = await createGraphicsRenderer({
    canvas, assetBaseUrl: '/assets/valley3d/', quality: 'standard',
  });
  renderer.resize({ widthCss: width, heightCss: height, pixelRatio: 1 });

  const frame = {
    tickFraction: 0.5,
    presentationSeconds: phase * SCENIC_DAY_SECONDS,
    deltaSeconds: 1 / 60,
    speed: 1 as const,
    reducedMotion: false,
    discontinuity: true,
  };
  // Dos veces a propósito: el mismo instante tiene que dar la misma imagen, y
  // la segunda pintada es la que prueba que la primera no dejó nada a medias.
  renderer.paint(state, frame);
  renderer.paint(state, { ...frame, discontinuity: false });

  const actors = actorsFor(state, frame);
  const activities: Record<string, number> = {};
  const clips: Record<string, number> = {};
  for (const actor of actors) {
    activities[actor.activity] = (activities[actor.activity] ?? 0) + 1;
    clips[actor.clip] = (clips[actor.clip] ?? 0) + 1;
  }

  window.valleySceneReport = {
    seed, years, tick: state.tick, dayPhase: phase,
    villagers: state.people.villagers.filter(isHere).length,
    onStage: actors.length,
    buildings: state.buildings.length,
    activities, clips,
  };
  say('ready', `tick ${state.tick} · ${actors.length} en escena · ${state.buildings.length} edificios`);
}

main().catch((error: unknown) => {
  say('error', error instanceof Error ? error.message : String(error));
});
