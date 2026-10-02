// Suite de recorridos. Simula jornadas y siglos en varias semillas.
//
// El tercer nivel, entre la suite rápida y el banco de balance. Nació al
// auditar el proyecto: `npm test` prometía menos de 20 s y tardaba 91, y siete
// ficheros se comían la mitad del reloj. No son pruebas lentas por estar mal
// escritas: viven un día escénico entero de ochenta cuerpos en seis semillas, o
// corren cinco mil ticks de motor. Eso vale lo que cuesta, pero no puede estar
// en el bucle de trabajo de cada cambio.
//
// Presupuesto: **menos de tres minutos.** Si sube de ahí, o se reparte en más
// semillas de las que hacen falta o hay algo que medir.
//
// Desde v5.56 (1 oct 2026) aquí vive también todo lo que pasaba de diez
// segundos en el trabajo `fast` de CI, y en CI corren en seis trozos
// repartidos **por peso** (`tests/journeys/shard-weights.ts`), no por el hash
// de la ruta que usa vitest: con el hash, los tres trozos de entonces tardaban
// 11, 33 y 30 minutos.
import { defineConfig } from 'vitest/config';
import { BaseSequencer, type WorkspaceSpec } from 'vitest/node';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JOURNEY_WEIGHTS } from './tests/journeys/shard-weights';

const weightOf = (spec: WorkspaceSpec): number => {
  const known = JOURNEY_WEIGHTS[basename(spec.moduleId, '.test.ts')];
  if (known !== undefined) return known;
  const all = Object.values(JOURNEY_WEIGHTS).sort((a, b) => a - b);
  return all[Math.floor(all.length / 2)] ?? 1;
};

// El más pesado primero, al trozo que menos lleva. Determinista: cada trozo
// hace la misma cuenta con la misma lista y se queda con su parte, así que
// entre todos cubren cada fichero una sola vez.
class WeightedSequencer extends BaseSequencer {
  override async shard(files: WorkspaceSpec[]): Promise<WorkspaceSpec[]> {
    const { index, count } = this.ctx.config.shard!;
    const heaviest = [...files].sort((a, b) => weightOf(b) - weightOf(a) || (a.moduleId < b.moduleId ? -1 : 1));
    const loads = new Array<number>(count).fill(0);
    const mine: WorkspaceSpec[] = [];
    for (const spec of heaviest) {
      let lightest = 0;
      for (let i = 1; i < count; i += 1) if (loads[i]! < loads[lightest]!) lightest = i;
      loads[lightest]! += weightOf(spec);
      if (lightest === index - 1) mine.push(spec);
    }
    return mine;
  }

  // Dentro del trozo, también el más pesado primero: un fichero corre entero
  // en un solo hilo, y si el largo empieza el último, el trozo lo espera.
  override async sort(files: WorkspaceSpec[]): Promise<WorkspaceSpec[]> {
    return [...files].sort((a, b) => weightOf(b) - weightOf(a));
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
      '@derive': fileURLToPath(new URL('./src/derive', import.meta.url)),
      '@render': fileURLToPath(new URL('./src/render', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ['tests/journeys/**/*.test.ts'],
    testTimeout: 120_000,
    sequence: { sequencer: WeightedSequencer },
    reporters: 'default',
  },
});
