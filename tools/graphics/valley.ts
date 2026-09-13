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

  // `?gather=1` convoca a la aldea a mano.
  //
  // Las reuniones de §11.8 son raras —dos en treinta años en una partida
  // medida— así que esperar a que salga una para mirarla no es un método. Esto
  // empuja una decisión con `gather` al historial, que es de donde
  // `gatheringsAt` las lee: no hay camino especial ni estado nuevo, es una
  // partida en la que se acaba de decidir algo.
  if (number('gather', 0) > 0) {
    const template = CATALOG.find((candidate) => candidate.options.some(
      (option) => option.visible.some((effect) => effect.k === 'gather'),
    ));
    const option = template?.options.find(
      (candidate) => candidate.visible.some((effect) => effect.k === 'gather'),
    );
    if (template !== undefined && option !== undefined) {
      state.history.push({ tick: state.tick, templateId: template.id, optionId: option.id, cast: {} });
    }
  }

  // `?stir=1` revuelve la aldea a mano, para poder mirar las burbujas.
  //
  // Las de §11.1.1 salen de sucesos que son raros a proposito —2,6 % de
  // persona-semana medido en cuarenta anos—, asi que esperar a que salga un
  // duelo para ver como queda el icono no es un metodo. Esto pone un brote y
  // entierra a alguien; el resto lo deriva `moodsFor` como siempre.
  if (number('stir', 0) > 0) {
    state.outbreak = { startedTick: state.tick, endsTick: state.tick + 8, deaths: 0 };
    const child = state.people.villagers.find(
      (person) => person.diedTick === null && person.parentIds.some((id) => id !== null),
    );
    if (child !== undefined) {
      child.diedTick = state.tick;
      child.causeOfDeath = 'plague';
    }
  }

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
  // Acercarse antes de la segunda pintada, para poder juzgar el catalogo de
  // cerca sin montar otra pagina.
  const close = number('close', 1);
  if (close !== 1) renderer.zoom(close, width / 2, height / 2);
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
