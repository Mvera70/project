/**
 * G-05 · Escenarios de actores. design.md D.6.
 *
 * Las pruebas rápidas dicen que cada propiedad se cumple. Esto dice qué aspecto
 * tiene la jornada: cuánta gente hay fuera a cada hora, qué clip reproduce cada
 * uno, cuánto se mueven. Son las cifras con las que se calibra, y las que hacen
 * falta para saber si el valle parece vivo antes de que exista una escena que
 * mirar.
 *
 * No sustituye al juicio visual, que llega en G-06 cuando haya algo que ver.
 * Sirve para lo que una imagen no da: si a media tarde no hay nadie fuera, aquí
 * sale como un cero y no como una impresión.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { foundGame } from '../../src/engine/found';
import { run } from '../../src/engine/sim';
import { isHere } from '../../src/engine/people/demography';
import type { GameState, VillagerId } from '../../src/engine/state';
import { actorsFor, VILLAGER_CLIPS, type Actor } from '../../src/render3d/actors';
import {
  createPresentationClock, SCENIC_DAY_SECONDS, type ClockInput,
} from '../../src/render3d/presentation-clock';

const ROOT = resolve(import.meta.dirname, '..', '..');
const OUTPUT = resolve(ROOT, 'artifacts', 'graphics', 'G-05');
/** Instantes por día escénico. Suficientes para ver la forma de la jornada. */
const SAMPLES = 48;

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : (process.argv[index + 1] ?? fallback);
}

function village(seed: number, years: number): GameState {
  const state = foundGame(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

/** Un fotograma de un reloj de verdad, alimentado con tiempo real inventado. */
function drive(clock: ReturnType<typeof createPresentationClock>, steps: ClockInput[]): void {
  for (const step of steps) clock.frame(step);
}

interface DayShape {
  /** Cuántos actores hay en cada actividad, por instante. */
  readonly out: number[];
  readonly clips: Record<string, number>;
  readonly busiest: { phase: number; outside: number };
  readonly quietest: { phase: number; outside: number };
  readonly spread: number;
}

function shapeOfDay(state: GameState): DayShape {
  const out: number[] = [];
  const clips: Record<string, number> = {};
  let busiest = { phase: 0, outside: -1 };
  let quietest = { phase: 0, outside: Number.MAX_SAFE_INTEGER };
  let spread = 0;

  for (let sample = 0; sample < SAMPLES; sample += 1) {
    const phase = sample / SAMPLES;
    const actors = actorsFor(state, {
      tickFraction: 0.5,
      presentationSeconds: phase * SCENIC_DAY_SECONDS,
      deltaSeconds: 1 / 60,
      speed: 1,
      reducedMotion: false,
      discontinuity: false,
    });
    const outside = actors.filter((actor) => actor.activity !== 'home').length;
    out.push(outside);
    for (const actor of actors) clips[actor.clip] = (clips[actor.clip] ?? 0) + 1;
    if (outside > busiest.outside) busiest = { phase, outside };
    if (outside < quietest.outside) quietest = { phase, outside };
    // Cuántas celdas distintas ocupan: una aldea viva no se apila en un punto.
    spread = Math.max(spread, new Set(actors.map((actor) => actor.cell)).size);
  }

  return { out, clips, busiest, quietest, spread };
}

/** Una barra de texto para leer la jornada de un vistazo. */
function sparkline(values: number[]): string {
  const marks = ' .:-=+*#';
  const top = Math.max(1, ...values);
  return values.map((value) => marks[Math.min(marks.length - 1, Math.round((value / top) * (marks.length - 1)))]).join('');
}

async function main(): Promise<void> {
  const seed = Number(argument('seed', '7'));
  const years = Number(argument('years', '12'));
  const state = village(seed, years);
  const alive = state.people.villagers.filter(isHere).length;
  const report: Record<string, unknown> = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    invocation: 'npx tsx tools/graphics/actor-scenarios.ts',
    seed, years, villagers: alive, scenicDaySeconds: SCENIC_DAY_SECONDS,
  };

  process.stdout.write(`Semilla ${seed}, ${years} años, ${alive} aldeanos vivos.\n\n`);

  // 1 · La forma de la jornada.
  const shape = shapeOfDay(state);
  process.stdout.write(`Jornada  |${sparkline(shape.out)}|  fuera de casa\n`);
  process.stdout.write(
    `         punta ${shape.busiest.outside} al ${(shape.busiest.phase * 100).toFixed(0)} %`
    + `, valle ${shape.quietest.outside} al ${(shape.quietest.phase * 100).toFixed(0)} %`
    + `, hasta ${shape.spread} celdas distintas ocupadas\n`,
  );
  const total = Object.values(shape.clips).reduce((sum, count) => sum + count, 0);
  const mix = Object.entries(shape.clips)
    .sort((a, b) => b[1] - a[1])
    .map(([clip, count]) => `${clip} ${((count / total) * 100).toFixed(0)} %`)
    .join(', ');
  process.stdout.write(`         clips: ${mix}\n\n`);
  report.day = shape;

  // 2 · Las velocidades. El día escénico no puede acelerarse con ellas.
  const perSpeed: Record<string, number> = {};
  for (const speed of [0, 1, 4, 16] as const) {
    const clock = createPresentationClock();
    const steps: ClockInput[] = [];
    for (let step = 0; step <= 120; step += 1) {
      steps.push({
        realMs: step * 16, tick: state.tick + Math.floor((step * 16 * speed) / 15_000),
        tickFraction: 0, speed, reducedMotion: false, hidden: false,
      });
    }
    drive(clock, steps);
    perSpeed[`x${speed}`] = Number(clock.seconds.toFixed(4));
  }
  process.stdout.write(`Velocidades (2 s reales de tiempo escénico): ${
    Object.entries(perSpeed).map(([speed, seconds]) => `${speed} → ${seconds.toFixed(2)} s`).join(', ')
  }\n`);
  report.speeds = perSpeed;

  // 3 · Letargo: dos horas fuera y la vuelta no representa el hueco.
  const clock = createPresentationClock();
  clock.frame({ realMs: 0, tick: state.tick, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
  const before = clock.seconds;
  const back = clock.frame({
    realMs: 7_200_000, tick: state.tick + 480, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false,
  });
  process.stdout.write(
    `Letargo: 480 semanas de golpe → discontinuidad ${back.discontinuity}`
    + `, tiempo escénico añadido ${(clock.seconds - before).toFixed(3)} s\n`,
  );
  report.lethargy = { discontinuity: back.discontinuity, added: clock.seconds - before };

  // 4 · Retirada: quien muere deja de salir, sin seguir ninguna ruta vieja.
  const midday = {
    tickFraction: 0.5, presentationSeconds: SCENIC_DAY_SECONDS * 0.4,
    deltaSeconds: 1 / 60, speed: 1 as const, reducedMotion: false, discontinuity: false,
  };
  const cast = actorsFor(state, midday);
  const victim = cast[Math.floor(cast.length / 2)];
  const dead = structuredClone(state);
  const person = dead.people.villagers.find((candidate) => candidate.id === victim?.id);
  if (person !== undefined) {
    person.diedTick = dead.tick;
    person.causeOfDeath = 'old_age';
  }
  const after = actorsFor(dead, midday);
  process.stdout.write(
    `Retirada: ${cast.length} en escena, muere ${victim?.id ?? '?'}, quedan ${after.length}`
    + `, ¿sigue apareciendo? ${after.some((actor) => actor.id === victim?.id)}\n`,
  );
  report.removal = { before: cast.length, after: after.length, id: victim?.id ?? null };

  // 5 · Sin destino: reposo, nunca un taller inventado.
  const stranded = actorsFor(state, midday, { plan: { routes: new Map<VillagerId, number[]>() } });
  const resting = stranded.filter((actor) => actor.activity === 'resting').length;
  process.stdout.write(`Sin ruta: ${stranded.length} en escena, ${resting} en reposo\n`);
  report.stranded = { shown: stranded.length, resting };

  // 6 · Continuidad: a qué velocidad se mueve el que más, a lo largo del día.
  let jump = 0;
  let previous = new Map<VillagerId, Actor>();
  for (let sample = 0; sample <= SAMPLES * 8; sample += 1) {
    const actors = actorsFor(state, {
      ...midday, presentationSeconds: (sample / (SAMPLES * 8)) * SCENIC_DAY_SECONDS,
    });
    const now = new Map(actors.map((actor) => [actor.id, actor]));
    for (const [id, actor] of now) {
      const was = previous.get(id);
      if (was !== undefined) jump = Math.max(jump, Math.hypot(actor.x - was.x, actor.z - was.z));
    }
    previous = now;
  }
  // En celdas por segundo escénico, que es la cifra que significa algo: el
  // ciclo de andar del aldeano da 0,713, y nada deberia ir muy por encima.
  const perSample = SCENIC_DAY_SECONDS / (SAMPLES * 8);
  const cadence = (VILLAGER_CLIPS.walk.strideLength ?? 1) / VILLAGER_CLIPS.walk.seconds;
  process.stdout.write(
    `Continuidad: nadie pasa de ${(jump / perSample).toFixed(2)} celdas/s`
    + ` (su ciclo de andar da ${cadence.toFixed(2)})
`,
  );
  report.continuity = {
    fastestCellsPerSecond: Number((jump / perSample).toFixed(3)),
    walkCycleCellsPerSecond: Number(cadence.toFixed(3)),
    samples: SAMPLES * 8,
  };

  await mkdir(OUTPUT, { recursive: true });
  const file = resolve(OUTPUT, 'actor-scenarios.json');
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`\nEscrito ${relative(ROOT, file)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
