// IA-4 · La evidencia que `tools/reports/life-report.ts` no da: cuánto cuerpo-tiempo
// pasa cada especie en cada actividad, y cuántos sitios distintos usa un
// animal en una jornada.
//
// `tools/reports/life-report.ts` no está entre los ficheros autorizados de esta fase
// (`docs/life-ai-implementation-prompt.md`, sección IA-4 del brief): mide las
// cuatro cifras de docs/historico/rework.md §3.4, comunes a personas y bestias, y no dice
// nada de qué actividad hace cada animal ni de cuántos sitios usa — que es
// justo lo que el brief pide como evidencia de esta fase. Esto es una
// herramienta nueva, no una que sustituya a la anterior, y corre con el mismo
// método: nunca `tick` en un bucle (CLAUDE.md), se funda con `foundTwenty` y
// se juega con `run(state, años·48, 'prudent', CATALOG)`.
//
//   npx tsx tools/reports/life-report-species.ts [semillas...] [--days N]
//
// Por cada segundo escénico muestreado (cada 30 pasos, `LIFE_STEP = 1/30`):
// si el animal está `there` haciendo algo, se cuenta un cuerpo-segundo para
// esa especie y esa actividad (`doing.offer.id`) — «nada» si `doing` es la
// pausa de emergencia (`pause:*`, IA-1/IA-4) o si no hay `doing.there`. Y por
// animal, a lo largo del día, se guarda el conjunto de sitios distintos
// (redondeados a un décimo de celda, para no contar dos veces el mismo punto
// por el temblor de la colisión) donde `there` se puso a cierto en alguna
// actividad propia (no en el regalo, que sigue al cuerpo y no cuenta como
// «sitio»).

import { CATALOG } from '@engine/crossroads/catalog';
import { TIME } from '@engine/balance';
import { run } from '@engine/sim';
import { foundTwenty } from '../../tests/helpers/founding';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { createVillage } from '../../src/render3d/life/village';
import type { BeastKind } from '../../src/render3d/life/beasts';

const args = process.argv.slice(2);
const daysAt = args.indexOf('--days');
const DAYS = daysAt >= 0 ? Number(args[daysAt + 1]) : 2;
const given = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--days').map(Number);
const SEEDS = given.length > 0 ? given : [7, 23, 97];

const SAMPLE_EVERY = 30;

const activitySeconds = new Map<BeastKind, Map<string, number>>();
const bodySeconds = new Map<BeastKind, number>();
// Sitios distintos usados por animal-jornada: una entrada por (kind, id, día),
// con el conjunto de puntos redondeados que ha pisado haciendo algo suyo.
const spotsUsed: { kind: BeastKind; id: number; seed: number; day: number; spots: Set<string> }[] = [];
// Cuántas reacciones (feed/pet/chase de verdad, no la oferta pasiva) empiezan
// y cuántas terminan, para demostrar que la interacción tiene principio y fin.
let reactionsStarted = 0;
let reactionsEnded = 0;

function addActivity(kind: BeastKind, activity: string, seconds: number): void {
  const perKind = activitySeconds.get(kind) ?? new Map<string, number>();
  perKind.set(activity, (perKind.get(activity) ?? 0) + seconds);
  activitySeconds.set(kind, perKind);
  bodySeconds.set(kind, (bodySeconds.get(kind) ?? 0) + seconds);
}

for (const seed of SEEDS) {
  const state = foundTwenty(seed);
  run(state, 12 * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);

  for (let day = 0; day < DAYS; day += 1) {
    const life = createVillage(state, day);
    const spotsByBeast = new Map<number, { kind: BeastKind; spots: Set<string> }>();
    for (const beast of life.beasts) {
      spotsByBeast.set(beast.dweller.body.id, { kind: beast.kind, spots: new Set() });
    }

    const wasReacting = new Map<number, boolean>();
    for (let n = 0; n < STEPS_PER_DAY; n += 1) {
      life.step();

      // Cuenta el principio y el final de una reacción de verdad (IA-4),
      // sea cual sea el paso: no hace falta muestrear esto cada segundo, una
      // reacción dura bastante más que un paso.
      for (const beast of life.beasts) {
        const reacting = beast.reaction.stage !== null;
        const before = wasReacting.get(beast.dweller.body.id) ?? false;
        if (reacting && !before) reactionsStarted += 1;
        if (!reacting && before) reactionsEnded += 1;
        wasReacting.set(beast.dweller.body.id, reacting);
      }

      if ((n + 1) % SAMPLE_EVERY !== 0) continue;
      for (const beast of life.beasts) {
        const { doing } = beast.dweller;
        const activity = beast.reaction.stage !== null
          ? `reaccionando (${beast.reaction.stage})`
          : doing !== null && doing.there
            ? (doing.place.id.startsWith('pause:') ? 'nada (pausa)' : doing.offer.id)
            : 'andando/nada';
        addActivity(beast.kind, activity, 1);

        if (doing !== null && doing.there && !doing.place.id.startsWith('pause:')
          && !doing.place.id.endsWith(':gift')) {
          const entry = spotsByBeast.get(beast.dweller.body.id);
          if (entry !== undefined) {
            const spot = `${Math.round(beast.dweller.body.x * 10)}:${Math.round(beast.dweller.body.z * 10)}`;
            entry.spots.add(spot);
          }
        }
      }
    }

    for (const [id, entry] of spotsByBeast) {
      spotsUsed.push({ kind: entry.kind, id, seed, day, spots: entry.spots });
    }
  }
}

process.stdout.write(`\n=== IA-4 · cuerpo-segundos por especie y actividad ===\n`);
process.stdout.write(`${SEEDS.length} semillas × ${DAYS} jornadas: ${SEEDS.join(', ')}\n\n`);
for (const kind of ['hen', 'pig', 'cow'] as const) {
  const total = bodySeconds.get(kind) ?? 0;
  process.stdout.write(`-- ${kind} (${total} cuerpo-segundos) --\n`);
  const perKind = activitySeconds.get(kind) ?? new Map();
  const rows = [...perKind.entries()].sort((a, b) => b[1] - a[1]);
  for (const [activity, seconds] of rows) {
    const pct = total === 0 ? '—' : `${(100 * seconds / total).toFixed(1)}%`;
    process.stdout.write(`   ${activity.padEnd(16)} ${String(seconds).padStart(6)} s  (${pct})\n`);
  }
}

process.stdout.write(`\n=== IA-4 · sitios distintos usados por animal-jornada ===\n`);
for (const kind of ['hen', 'pig', 'cow'] as const) {
  const rows = spotsUsed.filter((r) => r.kind === kind).map((r) => r.spots.size);
  if (rows.length === 0) { process.stdout.write(`${kind}: sin datos\n`); continue; }
  const avg = rows.reduce((a, b) => a + b, 0) / rows.length;
  process.stdout.write(
    `${kind}: media ${avg.toFixed(2)} sitios/jornada, mínimo ${Math.min(...rows)},`
    + ` máximo ${Math.max(...rows)}, sobre ${rows.length} animal-jornadas\n`,
  );
}

process.stdout.write(`\n=== IA-4 · reacciones a una persona (feed/pet/chase como interacción) ===\n`);
process.stdout.write(`empiezan ${reactionsStarted} · terminan ${reactionsEnded}\n`);
