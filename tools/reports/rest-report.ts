// RD-2 · Qué le pasa a un valle mientras nadie lo mira, con cada regla de descanso.
//
// El letargo de §13.2 simula las semanas ausentes con el tick normal y sin
// jugador: no contesta nada, pero **sí deja que un asalto se resuelva por la
// cuenta de B3 y que la partida acabe**. El goal del rework de ritmo (30 sep
// 2026) lo prohíbe: ninguna decisión importante ni derrota irreversible se
// resuelve mientras la aldea descansa. Este informe mide, sobre las mismas
// semillas, tres reglas:
//
//   hoy  el letargo de §13.2 tal cual (todo avanza, nada para).
//   A    se para ante el primer hecho que pide atención: una encrucijada
//        planteada, el aviso de un asalto, una crisis nueva o la semana que
//        acabaría la partida (esa semana se deshace).
//   A′   la encrucijada se queda esperando sin parar (como en §13.2); paran el
//        aviso de un asalto y la semana que acabaría la partida.
//
// Juega cada valle con `run(…, 'prudent')` hasta la hora de salida —nunca un
// bucle de `tick` sin contestar, que no mide este juego (CLAUDE.md)— y desde ahí
// avanza con `tick` sin decisión, que es lo que hace el letargo.
//
//   npx tsx tools/reports/rest-report.ts                          # 24 semillas
//   npx tsx tools/reports/rest-report.ts --seeds 8 --from 1,8 --away 34,960
//
// `--from` son horas de reloj a ×1 jugadas antes de irse; `--away`, semanas de
// ausencia (34 ≈ una noche de 8 h a ×1; 548 ≈ 8 h a ×16; 960 es el tope).

import { CATALOG } from '../../src/engine/crossroads/catalog';
import { crisisOf } from '../../src/engine/crossroads/select';
import { foundGame } from '../../src/engine/found';
import { run, tick } from '../../src/engine/sim';
import type { GameState } from '../../src/engine/state';
import { TIME } from '../../src/engine/balance';

const arg = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1]! : fallback;
};
const SEEDS = Array.from({ length: Number(arg('seeds', '24')) }, (_, i) => i + 1);
const FROM = arg('from', '0.2,1,8,40').split(',').map(Number);
const AWAY = arg('away', '34,548,960').split(',').map(Number);
const WEEK_HOURS = TIME.REAL_MS_PER_TICK / 3_600_000;

type Rule = 'hoy' | 'A' | "A′";
const RULES: readonly Rule[] = ['hoy', 'A', "A′"];

interface Outcome { weeks: number; stop: string; ended: string | null; posed: number; raids: number; deaths: number }

function absent(state: GameState, weeks: number, rule: Rule): Outcome {
  const out: Outcome = { weeks: 0, stop: 'tope', ended: null, posed: 0, raids: 0, deaths: 0 };
  const crisis0 = crisisOf(state);
  for (; out.weeks < weeks && state.ended === null; out.weeks += 1) {
    const before = rule === 'hoy' ? null : structuredClone(state);
    const report = tick(state, CATALOG);
    if (state.ended !== null && before !== null) {
      Object.assign(state, before);
      out.stop = 'la partida acabaría';
      break;
    }
    out.deaths += report.deaths.length;
    if (report.posed !== null) out.posed += 1;
    const warned = report.entries.some((e) => e.templateKey === 'raid.coming');
    out.raids += report.entries.filter((e) => ['raid.held', 'raid.stormed', 'raid.turned_back',
      'raid.walled', 'raid.open'].includes(e.templateKey)).length;
    if (rule === 'hoy') continue;
    if (warned) { out.weeks += 1; out.stop = 'aviso de asalto'; break; }
    if (rule === 'A') {
      if (report.posed !== null) { out.weeks += 1; out.stop = 'encrucijada'; break; }
      const crisis = crisisOf(state);
      if (crisis !== null && crisis !== crisis0) { out.weeks += 1; out.stop = `crisis ${crisis}`; break; }
    }
  }
  out.ended = state.ended?.cause ?? null;
  return out;
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? NaN;
};

console.log(`Descanso · ${SEEDS.length} semillas · política prudente hasta la salida · semana = ${(WEEK_HOURS * 60).toFixed(0)} min a ×1\n`);
for (const hours of FROM) {
  const bases = SEEDS.map((seed) => {
    const state = foundGame(seed);
    run(state, Math.round(hours / WEEK_HOURS), 'prudent', CATALOG);
    return state;
  }).filter((state) => state.ended === null);
  for (const weeks of AWAY) {
    for (const rule of RULES) {
      const outcomes = bases.map((base) => absent(structuredClone(base), weeks, rule));
      const stops = new Map<string, number>();
      for (const o of outcomes) stops.set(o.stop, (stops.get(o.stop) ?? 0) + 1);
      const ended = outcomes.filter((o) => o.ended !== null);
      const sum = (key: 'posed' | 'raids' | 'deaths'): number => outcomes.reduce((n, o) => n + o[key], 0);
      console.log([
        `salida ${hours} h · ausencia ${weeks} sem · ${rule.padEnd(3)}`,
        `avanza mediana ${median(outcomes.map((o) => o.weeks))} sem`,
        `para: ${[...stops].map(([k, v]) => `${k} ${v}`).join(', ')}`,
        `acabadas ${ended.length}${ended.length ? ` (${ended.map((o) => o.ended).join(', ')})` : ''}`,
        `asaltos resueltos ${sum('raids')}`, `encrucijadas planteadas ${sum('posed')}`, `muertes ${sum('deaths')}`,
      ].join(' · '));
    }
  }
  console.log('');
}
