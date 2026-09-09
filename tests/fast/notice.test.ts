// M-28 · design.md §11.6, §9.2.
//
// The filter is the whole design decision here: which of a tick's entries the
// valley interrupts for. §9.2 already answered it for the chronicle screen,
// and this must not invent a second answer.
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { tick } from '@engine/sim';
import type { ChronicleEntry } from '@engine/state';
import { noticeworthy } from '@ui/notice';

const entry = (weight: 1 | 2 | 3, templateKey: string): ChronicleEntry =>
  ({ tick: 1, kind: 'season', templateKey, params: {}, weight });

describe('noticeworthy · §9.2', () => {
  it('toma los pesos 2 y 3, que son los que la crónica muestra por defecto', () => {
    const entries = [entry(1, 'a'), entry(2, 'b'), entry(3, 'c'), entry(1, 'd')];
    expect(noticeworthy(entries).map((e) => e.templateKey)).toEqual(['b', 'c']);
  });

  it('un tick tranquilo no interrumpe', () => {
    expect(noticeworthy([entry(1, 'a')])).toEqual([]);
    expect(noticeworthy([])).toEqual([]);
  });

  it('en una partida real interrumpe pocas veces, no en cada tick', () => {
    // Si esto se disparase constantemente, el valle sería un teletipo y el
    // aviso dejaría de significar «ha pasado algo».
    const state = foundGame(7);
    let ticks = 0;
    let noticed = 0;
    for (let i = 0; i < 480 && state.ended === null; i += 1) { // diez años
      const report = tick(state, CATALOG);
      ticks += 1;
      if (noticeworthy(report.entries).length > 0) noticed += 1;
    }
    expect(noticed).toBeGreaterThan(0); // ...pero alguna vez tiene que hablar
    expect(noticed / ticks).toBeLessThan(0.25);
  });
});
