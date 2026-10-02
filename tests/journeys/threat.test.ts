// B1 · El clan del valle vecino. design.md §1b.
//
// **Vive en las jornadas** porque lo que se mide son partidas de ochenta años:
// el vecino tarda cinco años en poder bajar y la primera partida llega hacia el
// año nueve.
//
// Lo que se guarda son las dos mitades de la decisión del dueño del diseño —el
// clan crece con los años, tu riqueza decide si bajan y con cuántos— y la mitad
// pequeña de «caer»: entran, se llevan lo que pueden y la aldea sigue. **La
// mitad grande no está hecha** (la batalla física, §1b) y por eso aquí no se
// mide ninguna muerte.

import { describe, expect, it } from 'vitest';
import { THREAT, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';

const SEEDS = [3, 14, 25, 36, 47, 58];
const YEARS = 80;

/** Una partida jugada, con las entradas de asalto que salieron. */
function played(seed: number, years = YEARS): { state: GameState; raids: string[] } {
  const state = foundGame(seed);
  const raids: string[] = [];
  for (let week = 0; week < years * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
    for (const report of run(state, 1, 'prudent', CATALOG)) {
      for (const entry of report.entries) {
        if (entry.kind === 'raid') raids.push(entry.templateKey);
      }
    }
  }
  return { state, raids };
}

describe('B1 · el clan crece por su cuenta', () => {
  it('junta gente con los años, y no con tu riqueza', () => {
    // La mitad que el dueño del diseño decidió al elegir quién ataca: «otro
    // valle», o sea alguien que se desarrolla en paralelo y no sabe que
    // existes. Se comprueba dejando el valle en la miseria: el vecino crece
    // igual.
    const poor = foundGame(14);
    run(poor, TIME.WEEKS_PER_YEAR * 20, 'prudent', CATALOG);
    poor.village.silver = 0;
    poor.village.grain = 0;
    poor.herd.hens = 0; poor.herd.pigs = 0; poor.herd.cows = 0;
    const before = poor.threat.strength;
    run(poor, TIME.WEEKS_PER_YEAR * 10, 'prudent', CATALOG);
    expect(poor.threat.strength, 'el vecino no deja de crecer porque tú seas pobre')
      .toBeGreaterThan(before);
  });

  it('pero no sin techo: el vecino es un valle, no una marea', () => {
    for (const seed of SEEDS) {
      const { state } = played(seed);
      expect(state.threat.strength, `semilla ${seed}`)
        .toBeLessThanOrEqual(THREAT.STRENGTH_CAP);
    }
  });

  it('y nadie baja antes de que la aldea tenga algo que perder', () => {
    // La misma idea que la gracia de la pareja de M-1: una aldea que no ha
    // tomado ninguna decisión todavía no tiene nada que se le pueda volver en
    // contra.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * THREAT.MIN_YEAR, 'prudent', CATALOG);
      expect(state.threat.raids, `semilla ${seed}: asaltos antes del año ${THREAT.MIN_YEAR}`)
        .toBe(0);
    }
  });
});

describe('B1 · y baja por lo que tú has juntado', () => {
  it('un valle que tienta recibe visitas, y todos acaban teniéndolas', () => {
    // Medido al cerrar B1 (12 semillas × 80 años): el primer asalto en el año
    // 9,2 de mediana —103 h de reloj a ×1— y ningún valle se libra. Lo que se
    // guarda es la propiedad, no la cifra: si un valle prospera, alguien baja.
    let raided = 0;
    for (const seed of SEEDS) {
      const { state, raids } = played(seed);
      if (state.threat.raids > 0) raided += 1;
      expect(raids.length, `semilla ${seed}: entradas contra asaltos`)
        .toBeGreaterThanOrEqual(state.threat.raids);
    }
    expect(raided, `${raided} de ${SEEDS.length} valles recibieron visita`).toBe(SEEDS.length);
  });

  it('la partida que baja no es más grande de lo que el clan puede armar', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      for (let week = 0; week < YEARS * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
        run(state, 1, 'prudent', CATALOG);
        if (state.threat.comingTick === null) continue;
        expect(state.threat.comingBand, `semilla ${seed}`)
          .toBeLessThanOrEqual(Math.max(THREAT.BAND_MIN, Math.round(state.threat.strength)));
      }
    }
  });

  it('avisa antes de llegar, que es donde B2 meterá el aviso', () => {
    const state = foundGame(25);
    for (let week = 0; week < YEARS * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
      run(state, 1, 'prudent', CATALOG);
      if (state.threat.comingTick === null) continue;
      expect(state.threat.comingTick - state.tick,
        'entre la decisión y la llegada hay semanas de margen')
        .toBeLessThanOrEqual(THREAT.WARNING_WEEKS);
      expect(state.threat.comingTick).toBeGreaterThanOrEqual(state.tick);
      return;
    }
    throw new Error('la semilla 25 no recibió ninguna partida en ochenta años');
  });
});
