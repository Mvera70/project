#!/usr/bin/env tsx
/**
 * G4 · **Qué decisiones acumulan la caída.** `docs/plan-meta.md`, fase G4.
 *
 *   npx tsx tools/reports/lethality-report.ts [--seeds 12] [--years 60] [--cap 12]
 *
 * La pregunta de G4 es causal —«qué decisiones acumulan la caída»— y una
 * correlación no la contesta: las políticas adversas eligen mal **en todo**, así
 * que en su tabla toda opción que ellas tocan sale letal. Lo que hace esto es un
 * **contrafactual por decisión**: juega el valle, apunta cada pregunta que
 * contestó, y **lo vuelve a jugar desde el principio cambiando una sola
 * respuesta**. Lo que separe a las dos partidas es de esa respuesta.
 *
 * **El ruido es inherente y por eso se promedia.** Al divergir, el flujo
 * `crossroads` diverge con la partida, así que dos ramas del mismo valle no se
 * separan sólo por la decisión. Se suman semillas y ocasiones: el ruido se
 * cancela y lo que queda es la diferencia media.
 *
 * Observacional: no afirma nada y no cambia nada. Y juega con `run`, nunca con
 * `tick` en un bucle — `CLAUDE.md` cuenta la media página de conclusiones falsas
 * que costó medir un valle donde nadie contestaba.
 */
import { TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog/index';
import { foundGame } from '../../src/engine/found';
import { population } from '../../src/engine/people/demography';
import { decide, run } from '../../src/engine/sim';
import type { Policy } from '../../src/engine/sim';
import type { GameState } from '../../src/engine/state';

const arg = (name: string, fallback: number): number => {
  const at = process.argv.indexOf(`--${name}`);
  const value = at === -1 ? Number.NaN : Number(process.argv[at + 1]);
  return Number.isFinite(value) ? value : fallback;
};
const SEED_COUNT = arg('seeds', 12);
const YEARS = arg('years', 60);
/** Cuántas decisiones por valle se contrafactualizan. Cada una es una partida más. */
const CAP = arg('cap', 12);
/**
 * **De dónde salen las semillas, y por qué se puede elegir.**
 *
 * Medido el 19 sep 2026 al escribir esto, y es el hallazgo que más cuesta si se
 * olvida: con la misma política y los mismos años, **la banda de semillas cambia
 * la tasa de caída ocho veces**.
 *
 * | banda (30 semillas, 100 años) | caen |
 * |---|---|
 * | `0..29` | 1/30 |
 * | `100..129` | 6/30 |
 * | `3+7i` (la de `pace-report`) | 9/30 |
 *
 * No es la magnitud de la semilla —la banda alta queda en medio—: es que caer
 * es un suceso raro y **veinticuatro semillas no bastan para medirlo**. Es la
 * regla de `CLAUDE.md` («los umbrales nunca se fijan con una sola semilla»)
 * llevada un paso más allá: para una caída, veinticuatro son una sola.
 *
 * Por eso la banda se pide (`--from 3 --step 7` da la de `pace-report`) y por
 * eso lo primero que imprime este informe es cuántos valles caen en la suya: sin
 * caídas en la rama base no hay letalidad que atribuir, y la tabla sale de ruido.
 */
const SEED_FROM = arg('from', 0);
const SEED_STEP = arg('step', 1);
const SEED_LIST = Array.from({ length: SEED_COUNT }, (_, i) => SEED_FROM + i * SEED_STEP);

/** Cómo acabó una rama, que es lo único que se compara. */
interface Outcome {
  readonly ended: boolean;
  /** El año en que acabó, o el horizonte si llegó viva. */
  readonly endedYear: number;
  readonly people: number;
}

/** Una respuesta que el valle dio, con dónde la dio. */
interface Answer {
  readonly nth: number;
  readonly templateId: string;
  readonly optionId: string;
}

/**
 * Juega un valle, opcionalmente **torciendo una respuesta**.
 *
 * `twist` recibe el número de decisión y las opciones, y devuelve la que se
 * toma o `null` para dejar que decida la prudente. Es una política de función
 * (`Policy`), que es la puerta que el motor ya ofrece para esto: el contador de
 * decisiones vive aquí fuera y el motor no se entera.
 */
function play(
  seed: number, years: number,
  twist: ((nth: number, options: readonly string[]) => string | null) | null,
): { outcome: Outcome; answers: Answer[] } {
  const state = foundGame(seed);
  const answers: Answer[] = [];
  let nth = 0;
  const policy: Policy = (s: GameState, options: readonly string[]): string => {
    const templateId = s.crossroad?.templateId ?? '?';
    const forced = twist === null ? null : twist(nth, options);
    const chosen = forced ?? decide(s, CATALOG, 'prudent') ?? options[0]!;
    answers.push({ nth, templateId, optionId: chosen });
    nth += 1;
    return chosen;
  };
  for (let week = 0; week < years * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
    run(state, 1, policy, CATALOG);
  }
  return {
    outcome: {
      ended: state.ended !== null,
      endedYear: Math.round(state.tick / TIME.WEEKS_PER_YEAR),
      people: population(state),
    },
    answers,
  };
}

/** Lo que se acumula por opción: qué pasó cuando se tomó y cuando no. */
interface Effect {
  /** Ocasiones en que el valle la tomó y se comparó con no tomarla. */
  pairs: number;
  /** De esas, cuántas veces cayó tomándola. */
  fellTaking: number;
  /** Y cuántas cayó no tomándola. */
  fellLeaving: number;
  /** Diferencia de población al final, tomándola menos no tomándola. */
  peopleDelta: number;
}

const effects = new Map<string, Effect>();
const bump = (key: string): Effect => {
  const found = effects.get(key) ?? { pairs: 0, fellTaking: 0, fellLeaving: 0, peopleDelta: 0 };
  effects.set(key, found);
  return found;
};

let baseFell = 0;
let branches = 0;
const started = Date.now();

for (const seed of SEED_LIST) {
  const base = play(seed, YEARS, null);
  if (base.outcome.ended) baseFell += 1;
  const answered = base.answers.slice(0, CAP);
  for (const answer of answered) {
    // La rama toma **otra** opción en esa misma decisión y sigue prudente
    // después: lo que cambia entre las dos partidas es una respuesta.
    //
    // Se elige de entre las opciones **crudas** que el motor ofrece, no de las
    // que `withoutRepeats` deja: esa regla existe para que una política no se
    // atasque contestando siempre lo mismo (§12.9, v2.22), y aquí lo que se
    // busca es justo la respuesta que el jugador prudente no dio.
    const alternative = (options: readonly string[]): string | null => {
      const other = options.find((id) => id !== answer.optionId);
      return other ?? null;
    };
    const branch = play(seed, YEARS, (nth, options) => (
      nth === answer.nth ? alternative(options) : null
    ));
    branches += 1;
    // La rama puede no llegar a esa decisión —la partida diverge antes por el
    // azar del mundo, o se acaba— y entonces no hay par que comparar.
    const mirrored = branch.answers.find((a) => a.nth === answer.nth);
    if (mirrored === undefined || mirrored.optionId === answer.optionId) continue;
    const effect = bump(`${answer.templateId}:${answer.optionId}`);
    effect.pairs += 1;
    if (base.outcome.ended) effect.fellTaking += 1;
    if (branch.outcome.ended) effect.fellLeaving += 1;
    effect.peopleDelta += base.outcome.people - branch.outcome.people;
  }
  console.info(`  semilla ${seed}: ${answered.length} decisiones, ${base.outcome.ended ? `cae año ${base.outcome.endedYear}` : `viva con ${base.outcome.people}`}`);
}

const hours = (years: number): number => (years * TIME.WEEKS_PER_YEAR * TIME.REAL_MS_PER_TICK) / 3_600_000;

console.info(`\n## La letalidad por decisión · ${SEED_COUNT} semillas (${SEED_FROM}, paso ${SEED_STEP}) × ${YEARS} años = ${hours(YEARS).toFixed(0)} h de reloj a ×1`);
console.info(`   ${branches} ramas contrafactuales · ${baseFell}/${SEED_COUNT} valles caen jugando prudente · ${((Date.now() - started) / 1000).toFixed(0)}s\n`);

const rows = [...effects.entries()]
  .filter(([, e]) => e.pairs >= 2)
  .map(([key, e]) => ({
    key,
    pairs: e.pairs,
    /** Puntos de caída que suma tomarla, frente a no tomarla. */
    lethality: (e.fellTaking - e.fellLeaving) / e.pairs,
    people: e.peopleDelta / e.pairs,
  }))
  .sort((a, b) => b.lethality - a.lethality || a.people - b.people);

console.info('| decisión | pares | letalidad | personas al final |');
console.info('|---|---:|---:|---:|');
for (const row of rows) {
  const sign = row.lethality > 0 ? '+' : '';
  console.info(`| ${row.key} | ${row.pairs} | ${sign}${(row.lethality * 100).toFixed(0)} pp | ${row.people > 0 ? '+' : ''}${row.people.toFixed(1)} |`);
}
if (rows.length === 0) console.info('| (ningún par comparable) | | | |');
console.info(`\nDe ${CATALOG.length} plantillas del catálogo, ${new Set(rows.map((r) => r.key.split(':')[0])).size} aparecen con pares comparables.`);
console.info('Letalidad positiva = tomarla acaba la partida más veces que no tomarla.');
