// M-23 · design.md §9.2, §13.2.
//
// `welcomeDigest` (M-09) already proves the shape — one headline, up to four
// weight-2 entries, the summary. What is new here is the TEXT: that it reads,
// with no hole left unresolved, and with the numbers where §9.2 puts them.
import { describe, expect, it } from 'vitest';
import { welcomeDigest } from '@engine/chronicle/digest';
import { foundGame } from '@engine/found';
import { welcomeLines } from '@ui/welcome';

describe('welcomeLines · §9.2', () => {
  it('trae el titular primero, sin huecos, y el resumen numérico al final', () => {
    const state = foundGame(7);
    state.tick = 100;
    state.chronicle = [
      { tick: 10, kind: 'harvest', templateKey: 'harvest.fair', params: { year: 1, grain: 900, people: 20 }, weight: 2 },
      { tick: 90, kind: 'fire', templateKey: 'fire.house', params: { year: 2, season: 'summer' }, weight: 3 },
    ];

    const digest = welcomeDigest(state, 0);
    const lines = welcomeLines(state, digest);

    for (const line of lines) expect(line, line).not.toMatch(/\{\w+\}/);
    expect(lines[0]).toContain('house'); // el titular: el incendio, peso 3
    expect(lines.at(-3)).toMatch(/weeks/);
    expect(lines.at(-2)).toMatch(/\bpeople\b|valley/);
    expect(lines.at(-1)).toMatch(/raised|went up|Building/);
  });

  it('una ausencia sin sucesos no deja de traer el resumen', () => {
    const state = foundGame(7);
    state.tick = 20;
    const digest = welcomeDigest(state, 0);
    const lines = welcomeLines(state, digest);

    // Sin titular ni entradas notables: solo las tres líneas del resumen.
    expect(lines).toHaveLength(3);
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
    const lines = welcomeLines(state, digest);
    const peopleLine = lines.at(-2) as string;
    expect(peopleLine).toMatch(/\b3\b/); // nacidos
    expect(peopleLine).toMatch(/\b1\b/); // muertos
  });
});
