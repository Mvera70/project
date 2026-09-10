/**
 * G-09 · El banco del piloto. design.md D.9.
 *
 * Monta una escena, la pinta durante unos segundos y anota lo que cuesta. Corre
 * dentro del navegador porque es el único sitio donde existen la GPU, el
 * compilador de shaders y el reloj que importa.
 *
 * **Lo que mide y lo que no.** Mide el tiempo de CPU de cada fotograma y la
 * cadencia real a la que el navegador los entrega. No mide tiempo de GPU, y D.9
 * prohíbe llamarlo así sin acceso fiable: sin `EXT_disjoint_timer_query` lo
 * único honesto es decir cuánto tarda el hilo y cada cuánto llega un fotograma.
 */
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { isHere } from '@engine/people/demography';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { createGraphicsRenderer } from '../../src/render3d/renderer';
import { createPresentationClock } from '../../src/render3d/presentation-clock';
import type { GraphicsStats } from '../../src/render3d/contracts';
import { SCENES, type SceneSpec } from './bench-scenes';

export interface SceneResult {
  readonly id: string;
  readonly note: string;
  readonly villagers: number;
  readonly buildings: number;
  readonly frames: number;
  /** Tiempo de CPU por fotograma, en milisegundos. */
  readonly cpu: { median: number; p95: number; p99: number; worst: number };
  /** Lo que tarda el navegador entre fotogramas: la cadencia de verdad. */
  readonly cadence: { median: number; p95: number; fps: number };
  readonly stats: GraphicsStats;
  /** Deriva del tiempo de CPU entre el primer tercio y el último. */
  readonly drift: number;
  readonly memoryMb: number | null;
}

export interface BenchReport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly device: {
    readonly userAgent: string;
    readonly pixelRatio: number;
    readonly viewport: { width: number; height: number };
    readonly cores: number | null;
    readonly gpu: string | null;
    /** Verdadero sólo en hardware real; una emulación no cuenta (D.9). */
    readonly realDevice: boolean;
  };
  readonly load: { coldMs: number; warmMs: number; bytes: number };
  readonly scenes: readonly SceneResult[];
}

declare global {
  interface Window {
    valleyBench?: (specs: readonly SceneSpec[], secondsEach: number) => Promise<BenchReport>;
    valleyBenchDone?: BenchReport;
  }
}

function quantile(sorted: readonly number[], at: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * at)));
  return sorted[index] ?? 0;
}

function gpuName(): string | null {
  try {
    const probe = document.createElement('canvas').getContext('webgl2');
    const info = probe?.getExtension('WEBGL_debug_renderer_info');
    if (probe === null || probe === undefined || info === null || info === undefined) return null;
    return String(probe.getParameter(info.UNMASKED_RENDERER_WEBGL));
  } catch {
    return null;
  }
}

/** Una aldea de la edad que pida la escena, en la semana del año que pida. */
function villageFor(spec: SceneSpec): GameState {
  const state = foundGame(spec.seed);
  run(state, Math.round(spec.years * 48), 'prudent', CATALOG);
  run(state, ((spec.week - (state.tick % 48)) + 48) % 48, 'prudent', CATALOG);
  if (spec.crisis) {
    // Una crisis no se simula: se declara. Lo que el banco mide es lo que
    // cuesta pintarla, no lo que cuesta llegar a ella.
    state.outbreak = { startedTick: state.tick, endsTick: state.tick + 8, deaths: 0 };
    state.village.grain = 0;
    state.village.morale = 8;
  }
  return state;
}

async function measure(
  canvas: HTMLCanvasElement, spec: SceneSpec, seconds: number, assetBaseUrl: string,
): Promise<SceneResult> {
  const state = villageFor(spec);
  const renderer = await createGraphicsRenderer({ canvas, assetBaseUrl, quality: 'standard' });
  const clock = createPresentationClock();
  const width = window.innerWidth;
  const height = Math.round(window.innerHeight);
  renderer.resize({ widthCss: width, heightCss: height, pixelRatio: window.devicePixelRatio });

  // Un fotograma de calentamiento antes de medir: el primero compila shaders y
  // sube geometría, y mezclarlo con el resto ensucia la mediana sin decir nada
  // que la carga fría no diga mejor.
  renderer.paint(state, clock.frame({
    realMs: performance.now(), tick: state.tick, tickFraction: 0.4,
    speed: 1, reducedMotion: false, hidden: false,
  }));
  if (spec.close !== 1) renderer.zoom(spec.close, width / 2, height / 2);

  const cpu: number[] = [];
  const cadence: number[] = [];
  let previous = performance.now();
  const until = previous + seconds * 1000;

  await new Promise<void>((done) => {
    const step = (now: number): void => {
      cadence.push(now - previous);
      previous = now;
      const before = performance.now();
      renderer.paint(state, clock.frame({
        realMs: now, tick: state.tick, tickFraction: 0.4,
        speed: 1, reducedMotion: false, hidden: false,
      }));
      cpu.push(performance.now() - before);
      if (now < until) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });

  const stats = renderer.stats();
  const sortedCpu = [...cpu].sort((a, b) => a - b);
  const sortedCadence = [...cadence].sort((a, b) => a - b);
  const third = Math.max(1, Math.floor(cpu.length / 3));
  const mean = (values: readonly number[]): number =>
    values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

  renderer.dispose();

  return {
    id: spec.id,
    note: spec.note,
    villagers: state.people.villagers.filter(isHere).length,
    buildings: state.buildings.filter((building) => building.lostTick === null).length,
    frames: cpu.length,
    cpu: {
      median: quantile(sortedCpu, 0.5),
      p95: quantile(sortedCpu, 0.95),
      p99: quantile(sortedCpu, 0.99),
      worst: sortedCpu.at(-1) ?? 0,
    },
    cadence: {
      median: quantile(sortedCadence, 0.5),
      p95: quantile(sortedCadence, 0.95),
      fps: 1000 / Math.max(0.001, quantile(sortedCadence, 0.5)),
    },
    stats,
    // Sesión sostenida: si el último tercio cuesta más que el primero, algo se
    // acumula. Es la forma barata de ver una fuga sin un perfilador.
    drift: mean(cpu.slice(-third)) - mean(cpu.slice(0, third)),
    memoryMb: memory === undefined ? null : Math.round(memory.usedJSHeapSize / 1_048_576),
  };
}

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const seconds = Number(params.get('seconds') ?? '4');
  const assetBaseUrl = params.get('assets') ?? '/assets/valley3d/';

  // Un lienzo da un contexto y sólo uno, y soltarlo lo pierde para siempre. Cada
  // medida se lleva el suyo: reutilizar el de la sonda anterior dejaba a
  // Three.js leyendo `precision` de un contexto nulo, que es la misma regla que
  // obliga a Canvas y WebGL a vivir en elementos distintos.
  const stage = (): HTMLCanvasElement => {
    const old = document.querySelector<HTMLCanvasElement>('#stage');
    const fresh = document.createElement('canvas');
    fresh.id = 'stage';
    if (old === null) document.body.append(fresh);
    else old.replaceWith(fresh);
    return fresh;
  };

  // Carga fría contra caliente: la primera trae el manifiesto y el GLB por red,
  // la segunda los encuentra en la caché del navegador.
  const coldAt = performance.now();
  const probe = await createGraphicsRenderer({ canvas: stage(), assetBaseUrl, quality: 'standard' });
  const coldMs = performance.now() - coldAt;
  probe.dispose();

  const warmAt = performance.now();
  const second = await createGraphicsRenderer({ canvas: stage(), assetBaseUrl, quality: 'standard' });
  const warmMs = performance.now() - warmAt;
  second.dispose();

  const bytes = performance.getEntriesByType('resource')
    .filter((entry) => entry.name.includes('valley3d'))
    .reduce((total, entry) => total + ((entry as PerformanceResourceTiming).encodedBodySize || 0), 0);

  const scenes: SceneResult[] = [];
  for (const spec of SCENES) {
    document.documentElement.dataset.benchScene = spec.id;
    scenes.push(await measure(stage(), spec, seconds, assetBaseUrl));
  }

  const report: BenchReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    device: {
      userAgent: navigator.userAgent,
      pixelRatio: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      cores: navigator.hardwareConcurrency ?? null,
      gpu: gpuName(),
      // D.9 · una emulación no sustituye a un dispositivo. Quien corre esto
      // decide, y por defecto se declara que no.
      realDevice: params.get('real') === 'true',
    },
    load: { coldMs, warmMs, bytes },
    scenes,
  };
  window.valleyBenchDone = report;
  document.documentElement.dataset.benchState = 'done';
}

main().catch((error: unknown) => {
  document.documentElement.dataset.benchState = 'error';
  document.documentElement.dataset.benchMessage = error instanceof Error ? error.message : String(error);
});
