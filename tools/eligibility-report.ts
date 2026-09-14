// Por qué medio catálogo no sale nunca. docs/findings-drama.md §2, §4.
//
// **El frente que decide si hay juego.** Medido desde hace semanas: el jugador
// toma entre siete y doce decisiones en cuarenta años, y diez de las veinte
// plantillas no salieron ni una vez en cinco partidas. Eso convierte un idle
// tranquilo en una pantalla que se mira.
//
// Lo que faltaba no era saberlo: era saber **por qué**. «No sale» puede ser
// tres cosas muy distintas, y cada una se arregla de otra manera:
//
//   1. Nunca es elegible — alguna condición no se cumple jamás. Es de diseño:
//      la condición pide un estado que el motor no alcanza.
//   2. Es elegible a menudo y pierde el sorteo — es de peso, un número.
//   3. Es elegible poco pero cuando lo es, sale — no hay nada que arreglar.
//
// Esto las separa, y para las del primer grupo dice **qué condición concreta**
// es la que bloquea, contando cuántos ticks falla cada una. Eso convierte
// «medio catálogo está muerto» en una lista de causas con nombre.
//
//   npx tsx tools/eligibility-report.ts [semillas...] [--years 60]
//
// No decide nada: imprime. Qué hacer con esto —relajar condiciones, añadir
// plantillas ligeras que salgan a menudo, o aceptar el ritmo— es la pregunta de
// diseño de `docs/roadmap.md` §1, y la contesta el dueño del diseño.

import { CATALOG } from '@engine/crossroads/catalog';
import { all, evaluate } from '@engine/crossroads/conditions';
import { eligible } from '@engine/crossroads/select';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { Policy } from '@engine/sim';
import { TIME } from '@engine/balance';
import type { Condition, GameState } from '@engine/state';

const args = process.argv.slice(2);
const yearsAt = args.indexOf('--years');
const YEARS = yearsAt >= 0 ? Number(args[yearsAt + 1]) : 60;
const SEEDS = args.filter((a) => /^\d+$/.test(a)).map(Number);
const seeds = SEEDS.length > 0 ? SEEDS : [7, 11, 23, 31, 37, 41, 13, 25];
/** La política con la que se juega mientras se mide: la del jugador razonable. */
const POLICY: Policy = 'prudent';

/** Una condición, dicha en una línea, para poder contarla y leerla. */
function nameOf(c: Condition): string {
  switch (c.k) {
    case 'stat': return `${c.stat} ${c.op} ${c.v}`;
    case 'ratio': return `${c.ratio} ${c.op} ${c.v}`;
    case 'season': return `season=${c.season}${c.minWeek === undefined ? '' : `+${c.minWeek}`}`;
    case 'year': return `year ${c.op} ${c.v}`;
    case 'has': return `has ${c.building}`;
    case 'flag': return `flag ${c.flag}=${String(c.set)}`;
    case 'outbreak': return `outbreak=${String(c.active)}`;
    case 'role': return `role ${c.role} alive=${String(c.alive)}`;
    case 'grudge': return `grudge >= ${c.min}`;
    case 'trait': return `${c.role} is ${c.trait}`;
    case 'not': return `not(${nameOf(c.c)})`;
    case 'any': return `any(${c.cs.map(nameOf).join(' | ')})`;
    default: return 'unknown';
  }
}

interface Tally {
  /** Ticks en que las condiciones `requires` se cumplían todas. */
  passes: number;
  /** Ticks en que además pasó los filtros de `eligible` (año, cooldown, tope). */
  offered: number;
  /** Veces que de verdad se le planteó al jugador. */
  posed: number;
  /** Ticks en que cada condición suya falló. */
  blockedBy: Map<string, number>;
}

function fresh(): Tally {
  return { passes: 0, offered: 0, posed: 0, blockedBy: new Map() };
}

const totals = new Map<string, Tally>();
for (const template of CATALOG) totals.set(template.id, fresh());
let ticksSeen = 0;
let posedTotal = 0;

for (const seed of seeds) {
  const state: GameState = foundGame(seed);
  const wanted = YEARS * TIME.WEEKS_PER_YEAR;
  let lastPosed = 0;

  while (state.tick < wanted && state.ended === null) {
    // Antes del tick: el estado que `selectCrossroad` mirará.
    const offeredNow = new Set(eligible(state, CATALOG).map((s) => s.template.id));
    for (const template of CATALOG) {
      const tally = totals.get(template.id) as Tally;
      if (all(template.requires, state)) tally.passes += 1;
      else {
        for (const condition of template.requires) {
          if (evaluate(condition, state)) continue;
          const key = nameOf(condition);
          tally.blockedBy.set(key, (tally.blockedBy.get(key) ?? 0) + 1);
        }
      }
      if (offeredNow.has(template.id)) tally.offered += 1;
    }
    ticksSeen += 1;

    // **Con política, no con `tick` a secas.** La primera versión llamaba a
    // `tick` sin decidir nada, así que la encrucijada inicial se quedaba
    // pendiente sesenta años y bloqueaba a todas las demás: el informe decía
    // que quince de veinte plantillas no salían nunca, y lo que medía era su
    // propia instrumentación. `run` de un tick decide como decidiría un
    // jugador prudente y deja avanzar la cola.
    run(state, 1, POLICY, CATALOG);
    // Lo que se le acabó planteando al jugador, contado del propio estado.
    const pending = state.crossroad;
    if (pending !== null && pending.posedTick > lastPosed) {
      lastPosed = pending.posedTick;
      const tally = totals.get(pending.templateId);
      if (tally !== undefined) tally.posed += 1;
      posedTotal += 1;
    }
  }
}

const rows = [...totals.entries()].map(([id, t]) => ({ id, ...t }));
rows.sort((a, b) => a.posed - b.posed || a.offered - b.offered);

const pct = (n: number): string => `${((100 * n) / Math.max(1, ticksSeen)).toFixed(2)} %`;

console.log(`\n## Elegibilidad del catálogo · ${seeds.length} semillas × ${YEARS} años`);
console.log(`   ${ticksSeen} ticks mirados · ${posedTotal} encrucijadas planteadas en total`);
console.log(`   (${(posedTotal / seeds.length).toFixed(1)} por partida, ${(posedTotal / seeds.length / (YEARS / 10)).toFixed(1)} por década)\n`);

console.log('| plantilla | condiciones OK | ofrecida | planteada | lo que la bloquea |');
console.log('|---|---|---|---|---|');
for (const row of rows) {
  const worst = [...row.blockedBy.entries()].sort((a, b) => b[1] - a[1])[0];
  const why = row.passes === ticksSeen ? '—'
    : worst === undefined ? '—'
      : `\`${worst[0]}\` (${pct(worst[1])} de los ticks)`;
  console.log(`| ${row.id} | ${pct(row.passes)} | ${pct(row.offered)} | **${row.posed}** | ${why} |`);
}

const never = rows.filter((r) => r.posed === 0);
console.log(`\n### Las que no salieron ni una vez: ${never.length} de ${rows.length}\n`);
for (const row of never) {
  const blockers = [...row.blockedBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const verdict = row.offered > 0
    ? `**elegible ${pct(row.offered)} del tiempo y aun así nunca sale: es el sorteo, no la condición**`
    : row.passes > 0
      ? '**cumple condiciones pero nunca llega a ofrecerse: año mínimo, cooldown o tope**'
      : '**nunca cumple condiciones**';
  console.log(`- \`${row.id}\` — ${verdict}`);
  for (const [name, count] of blockers) console.log(`    · falla \`${name}\` en ${pct(count)} de los ticks`);
}
console.log('');
