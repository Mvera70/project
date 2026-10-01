// M-23 · design.md §9.2, §13.2.
//
// `welcomeDigest` (M-09) already proves the shape — one headline, up to four
// weight-2 entries, the summary. What is new here is the TEXT: that it reads,
// with no hole left unresolved, and with the numbers where §9.2 puts them.
import { describe, expect, it } from 'vitest';
import { welcomeDigest } from '@engine/chronicle/digest';
import { foundGame } from '@engine/found';
import type { GameState } from '@engine/state';
import { pendingLines, welcomeLines } from '@ui/welcome';

/**
 * El parte sin lo pendiente del final. Desde RD-2 (v5.45) el parte acaba con lo
 * que espera —la pregunta del vado está abierta desde la fundación—, y estas
 * pruebas, que miran el resumen, lo buscaban en las tres últimas líneas.
 */
function told(state: GameState, lines: string[]): string[] {
  return lines.slice(0, lines.length - pendingLines(state).length);
}

describe('welcomeLines · §9.2', () => {
  it('trae el titular primero, sin huecos, y el resumen numérico al final', () => {
    const state = foundGame(7);
    state.tick = 100;
    state.chronicle = [
      { tick: 10, kind: 'harvest', templateKey: 'harvest.fair', params: { year: 1, grain: 900, people: 20 }, weight: 2 },
      { tick: 90, kind: 'fire', templateKey: 'fire.house', params: { year: 2, season: 'summer' }, weight: 3 },
    ];

    const digest = welcomeDigest(state, 0);
    const lines = told(state, welcomeLines(state, digest));

    for (const line of lines) expect(line, line).not.toMatch(/\{\w+\}/);
    expect(lines[0]).toContain('house'); // el titular: el incendio, peso 3
    // La línea del tiempo, en semanas o en años: cien ticks son dos años, y
    // una ausencia de años se cuenta en años porque «96 weeks passed» es una
    // división que el jugador tendría que hacer él.
    expect(lines.at(-3)).toMatch(/weeks|years/);
    expect(lines.at(-2)).toMatch(/\bpeople\b|valley/);
    expect(lines.at(-1)).toMatch(/raised|went up|Building/);
  });

  it('una ausencia sin sucesos no deja de traer el resumen', () => {
    const state = foundGame(7);
    state.tick = 20;
    const digest = welcomeDigest(state, 0);
    const lines = welcomeLines(state, digest);

    // Sin titular ni entradas notables: solo las tres líneas del resumen, y lo pendiente.
    expect(told(state, lines)).toHaveLength(3);
    for (const line of lines) expect(line, line).not.toMatch(/\{\w+\}/);
  });

  it('el resumen cuenta lo que cambió, no solo cuántos quedan', () => {
    const state = foundGame(7);
    state.tick = 48;
    state.chronicle = [
      { tick: 5, kind: 'birth', templateKey: 'birth.anon.many', params: { count: 3, people: 23 }, weight: 1 },
      { tick: 10, kind: 'death', templateKey: 'death.old.anon.many', params: { count: 1, people: 22 }, weight: 1 },
    ];
    const digest = welcomeDigest(state, 0);
    const lines = told(state, welcomeLines(state, digest));
    const peopleLine = lines.at(-2) as string;
    expect(peopleLine).toMatch(/\b3\b/); // nacidos
    expect(peopleLine).toMatch(/\b1\b/); // muertos
  });
});

describe('welcomeLines · cuánto tiempo se ha perdido', () => {
  it('una ausencia larga se cuenta en años, no en novecientas semanas', () => {
    // El letargo llega a cuatro horas de reloj de pared (§13.4), que son 960
    // semanas. «960 weeks passed» es un número que nadie puede sentir.
    const state = foundGame(7);
    state.tick = 960;
    const lines = told(state, welcomeLines(state, welcomeDigest(state, 0)));
    const time = lines.at(-3) ?? '';
    expect(time).toMatch(/\b20 years\b/);
    expect(time).not.toMatch(/weeks/);
  });

  it('y una corta sigue contándose en semanas', () => {
    // Dos años es la frontera: por debajo, «un año y cuarto» redondeado a un
    // año pierde más de lo que aclara, y las semanas se sienten bien.
    const state = foundGame(7);
    state.tick = 30;
    const lines = told(state, welcomeLines(state, welcomeDigest(state, 0)));
    expect(lines.at(-3) ?? '').toMatch(/\b30 weeks\b/);
  });
});
