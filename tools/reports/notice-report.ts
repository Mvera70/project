// Qué frases lee de verdad el jugador. design.md §9.3, §11.6.
//
// «Los mensajes que aparecen ahí son horrorosos. Tanto los mensajes rápidos
// como los mensajes entre eras» — el dueño del diseño, dos veces. Y arreglar
// eso a ojo es imposible, porque el banco tiene cientos de variantes y **el
// jugador no las lee casi ninguna**: el aviso de §11.6 sólo saca las entradas
// de peso ≥ 2, y de ésas unas salen cada dos años y otras no salen nunca.
//
// Esto las cuenta. Una partida corriente, varias semillas, y la lista ordenada
// por cuántas veces aparece cada clave sobre el valle. Lo que sale arriba es lo
// que hay que escribir bien; lo que no sale es banco que no se lee.
//
//   npx tsx tools/reports/notice-report.ts [semillas...] [--years 60] [--all]
//
// `--all` cuenta también las entradas de peso 1, que son las que van a la
// crónica y no a la pantalla, para poder comparar las dos voces.
//
// No decide nada: imprime.

import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { renderEntry } from '@engine/chronicle/render';
import { run } from '@engine/sim';
import type { Policy } from '@engine/sim';
import { TIME } from '@engine/balance';
import type { ChronicleEntry, GameState } from '@engine/state';

const args = process.argv.slice(2);
const yearsAt = args.indexOf('--years');
const YEARS = yearsAt >= 0 ? Number(args[yearsAt + 1]) : 60;
const ALL = args.includes('--all');
// El valor de `--years` es un número y no una semilla: sin esto, medir cuarenta
// años medía la semilla cuarenta.
const given = args
  .filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--years')
  .map(Number);
const seeds = given.length > 0 ? given : [7, 11, 23, 31, 41];
const POLICY: Policy = 'prudent';

/** Cuántas veces sale cada clave, y un ejemplo ya resuelto de cada una. */
const times = new Map<string, number>();
const sample = new Map<string, string>();
const weights = new Map<string, number>();

function count(state: GameState, entry: ChronicleEntry): void {
  const key = entry.templateKey;
  times.set(key, (times.get(key) ?? 0) + 1);
  weights.set(key, entry.weight);
  if (!sample.has(key)) sample.set(key, renderEntry(entry, state.rng));
}

let seen = 0;
for (const seed of seeds) {
  const state = foundGame(seed);
  let read = 0;
  for (let year = 0; year < YEARS; year += 1) {
    run(state, TIME.WEEKS_PER_YEAR, POLICY, CATALOG);
    // La crónica crece por el final, así que basta con leer lo nuevo.
    for (const entry of state.chronicle.slice(read)) {
      if (ALL || entry.weight >= 2) count(state, entry);
    }
    read = state.chronicle.length;
    if (state.ended !== null) break;
  }
  seen += read;
}

const ranked = [...times.entries()].sort((a, b) => b[1] - a[1]);
const shown = ranked.reduce((total, [, n]) => total + n, 0);
process.stdout.write(
  `${seeds.length} semillas × ${YEARS} años · ${seen} entradas de crónica · `
  + `${shown} ${ALL ? 'contadas' : 'sobre el valle'} · ${ranked.length} claves distintas\n\n`,
);
for (const [key, n] of ranked) {
  const per = (n / seeds.length).toFixed(1);
  process.stdout.write(`${String(n).padStart(4)}  ${per.padStart(5)}/partida  p${weights.get(key)}  ${key}\n`);
  process.stdout.write(`                            «${sample.get(key) ?? ''}»\n`);
}
