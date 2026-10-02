// K7 · Que la muerte de una aldea se entienda (2 oct 2026).
//
// `derive/fall.ts` cuenta por qué cayó un valle con lo que su crónica ya dijo:
// el mejor momento, lo que se lo llevó desde entonces, la decisión que la
// crónica apuntó cerca y el último golpe. Lo que se prueba aquí son las
// propiedades de ese relato, no su redacción:
//
//  · **no inventa**: todo lo que cuenta pasó después del mejor momento y antes
//    del final, y sus cuentas no pasan de lo que la crónica registra;
//  · **es corto**: como mucho `FALL.LINKS` cosas, en el orden en que pasaron;
//  · **el último golpe no es una causa**: un valle asaltado no cuenta el asalto
//    que lo tomó entre lo que se lo llevó, lo cuenta como final;
//  · **cita, no parafrasea**: la decisión es una entrada de la crónica;
//  · y **ninguna frase falta en el banco**.
//
// Las aldeas que caen se **buscan** entre semillas candidatas por la causa que
// necesitan, nunca se fija «la semilla N cae en el año M» (goal §4a): medido
// el 2 oct 2026 con `tools/reports/fall-report.ts`, la prudente cae de hambre
// en el arranque en 129 (extinción, año 2) y 108 (abandono, año 5), y la
// adversa asalta 129 y 108 antes del año 10.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { renderUiText } from '@engine/chronicle/render';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { archiveGame } from '@engine/save';
import { run, type Policy } from '@engine/sim';
import type { ArchivedGame, EndState } from '@engine/state';
import { FALL, fallOf, heaviestOf, type FallLinkKind } from '@derive/fall';

/** Candidatas, en el orden de la banda de `pace-report` donde más se cae. */
const CANDIDATES = [129, 108, 157, 45, 73, 164, 31, 24];
/** Lo que se le deja a una partida para caer: el arranque, donde caen las baratas. */
const YEARS = 10;

const found = new Map<string, ArchivedGame | null>();
/** La primera candidata que acaba por `cause` con la política `policy`. */
function fallen(cause: EndState['cause'], policy: Policy): ArchivedGame | null {
  const key = `${cause}:${String(policy)}`;
  if (found.has(key)) return found.get(key)!;
  for (const seed of CANDIDATES) {
    const state = foundGame(seed);
    run(state, TIME.WEEKS_PER_YEAR * YEARS, policy, CATALOG);
    if (state.ended?.cause === cause) {
      const game = archiveGame(state);
      found.set(key, game);
      return game;
    }
  }
  found.set(key, null);
  return null;
}

const KINDS: readonly FallLinkKind[] = ['hunger', 'plague', 'cold', 'fire', 'violence', 'natural', 'old_age', 'left', 'raids'];
const CAUSES: readonly EndState['cause'][] = ['extinction', 'abandoned', 'dispersed', 'stormed'];

describe('K7 · por qué cayó', () => {
  const cases: [EndState['cause'], Policy][] = [['extinction', 'prudent'], ['abandoned', 'prudent'], ['stormed', 'worst']];

  for (const [cause, policy] of cases) {
    it(`${cause}: cuenta lo que pasó entre el mejor momento y el final, y nada más`, () => {
      const game = fallen(cause, policy);
      expect(game, `ninguna candidata acaba por ${cause} en ${YEARS} años`).not.toBeNull();
      const story = fallOf(game!);
      expect(story.peak).toBeGreaterThan(0);
      expect(story.peakTick).toBeLessThanOrEqual(game!.endedTick);
      expect(story.links.length).toBeGreaterThan(0);
      expect(story.links.length).toBeLessThanOrEqual(FALL.LINKS);
      for (let i = 0; i < story.links.length; i += 1) {
        const link = story.links[i]!;
        expect(link.tick, link.kind).toBeGreaterThanOrEqual(story.peakTick);
        expect(link.tick, link.kind).toBeLessThanOrEqual(game!.endedTick);
        if (i > 0) expect(link.tick).toBeGreaterThanOrEqual(story.links[i - 1]!.tick);
      }
      // Sus cuentas no pasan de lo que el libro de la partida registra.
      const dead = story.links.filter((l) => l.kind !== 'left' && l.kind !== 'raids').reduce((a, l) => a + l.count, 0);
      const gone = story.links.find((l) => l.kind === 'left')?.count ?? 0;
      expect(dead).toBeLessThanOrEqual(game!.ledger!.died);
      expect(gone).toBeLessThanOrEqual(game!.ledger!.left);
      // La decisión citada es una decisión de la crónica, y no posterior al final.
      if (story.decision !== null) {
        const said = game!.chronicle[story.decision]!;
        expect(said.kind).toBe('crossroad_taken');
        expect(said.tick).toBeLessThanOrEqual(game!.endedTick);
      }
    });
  }

  it('el asalto que tomó el valle es el final, no una de las causas', () => {
    const game = fallen('stormed', 'worst');
    expect(game).not.toBeNull();
    const story = fallOf(game!);
    const last = [...game!.chronicle].reverse().find((e) => e.templateKey === 'raid.stormed')!;
    expect(story.band).toBe(last.params['count']);
    // Ningún eslabón llega a la semana del último golpe.
    for (const link of story.links) expect(link.tick).toBeLessThan(last.tick);
    // Y las bajadas que cuenta son las de antes: el saqueo del último asalto
    // (`raid.assault`, la semana anterior) sí cuenta, el golpe no.
    const raids = story.links.find((l) => l.kind === 'raids');
    if (raids !== undefined) {
      const before = game!.chronicle.filter((e) => ['raid.open', 'raid.walled', 'raid.assault'].includes(e.templateKey)
        && e.tick >= story.peakTick && e.tick < last.tick).length;
      expect(raids.count).toBe(before);
    }
  });

  it('lo que se recuerda al fundar el siguiente es lo que más pesó', () => {
    const game = fallen('stormed', 'worst');
    expect(game).not.toBeNull();
    const story = fallOf(game!);
    const heaviest = heaviestOf(story);
    expect(heaviest).not.toBeNull();
    for (const link of story.links) expect(heaviest!.count).toBeGreaterThanOrEqual(link.count);
    expect(heaviestOf({ ...story, links: [] })).toBeNull();
  });

  it('una crónica podada no cuenta nada que no sepa', () => {
    // Las partidas viejas del archivo guardan sólo los titulares (F3a,
    // decisión 3): sin `people` ni muertes, el relato sale vacío y el epitafio
    // no enseña la sección.
    const story = fallOf({ cause: 'extinction', endedTick: 500, chronicle: [] });
    expect(story.peak).toBe(0);
    expect(story.links).toEqual([]);
    expect(story.decision).toBeNull();
  });

  it('ninguna frase del «por qué» falta en el banco', () => {
    const params = { count: 3, year: 4, silver: 12, grain: 40, peak: 30, band: 40, left: 9 };
    const keys = ['epitaph.why.title', 'epitaph.why.peak', 'epitaph.why.decision',
      ...KINDS.flatMap((k) => [`epitaph.why.${k}`, `epitaph.why.${k}.one`]),
      ...CAUSES.map((c) => `epitaph.why.end.${c}`), 'epitaph.why.end.abandoned.one',
      ...CAUSES.map((c) => `successor.fell.${c}`)];
    for (const key of keys) {
      const text = renderUiText(key, params);
      expect(text.startsWith('['), key).toBe(false);
      expect(text, key).not.toMatch(/\{\w+\}/);
    }
  });
});
