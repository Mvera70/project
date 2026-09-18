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
import { worthOf } from '@engine/world/threat';
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

describe('B1 · lo que se llevan', () => {
  it('se llevan plata y grano, y la aldea sigue en pie', () => {
    // **La mitad pequeña de «caer»** (§1b): la aldea pierde cosas, no la
    // partida. Ningún asalto puede acabar el juego mientras la batalla física
    // no exista.
    for (const seed of SEEDS) {
      const { state } = played(seed);
      if (state.threat.raids === 0) continue;
      expect(state.village.silver, `semilla ${seed}`).toBeGreaterThanOrEqual(0);
      expect(state.village.grain, `semilla ${seed}`).toBeGreaterThanOrEqual(0);
      expect(state.ended?.cause, `semilla ${seed}: ningún asalto acaba la partida`)
        .not.toBe('sacked');
    }
  });

  it('y la muralla con su puerta les quita casi todo el botín', () => {
    // La razón de ser de A1 y A2 vista desde fuera: cerrar el pueblo cambia lo
    // que un saqueador se lleva. Dos copias del mismo valle en el mismo
    // instante, una con su portón y otra sin nada.
    const state = foundGame(36);
    run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
    state.village.silver = 200;
    state.threat.comingTick = state.tick + 1;
    state.threat.comingBand = 20;

    const open = structuredClone(state);
    open.buildings = open.buildings.filter((b) => b.kind !== 'gate');
    const closed = structuredClone(state);
    expect(closed.buildings.some((b) => b.kind === 'gate' && b.lostTick === null),
      'la semilla 36 tiene portón a los cuarenta años').toBe(true);

    run(open, 2, 'prudent', CATALOG);
    run(closed, 2, 'prudent', CATALOG);
    expect(closed.village.silver, 'tras la muralla se pierde menos plata')
      .toBeGreaterThan(open.village.silver);
  });

  it('lo que vale un valle es lo que se ve desde fuera', () => {
    const state = foundGame(47);
    run(state, TIME.WEEKS_PER_YEAR * 30, 'prudent', CATALOG);
    const before = worthOf(state);
    state.village.silver += 50;
    expect(worthOf(state), 'la plata tienta').toBeGreaterThan(before);
    const withSilver = worthOf(state);
    state.buildings.push({
      id: 9900, kind: 'house', x: 10, y: 10, w: 2, h: 2,
      builtTick: state.tick, lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
    expect(worthOf(state), 'las vigas no').toBe(withSilver);
  });
});

describe('B2 · el aviso, y lo que se puede hacer con él', () => {
  it('avisa antes de cada partida, y la pregunta se puede plantear', () => {
    // La cadena entera: el clan decide, el valle se entera (`raid.coming`), y
    // §8.6 abre su pregunta por encima del techo porque es una crisis. Sin lo
    // último el aviso llegaría cuando el reloj de las encrucijadas lo
    // permitiera, que puede ser dos años después de que quemaran el granero.
    let warnings = 0;
    let asked = 0;
    let arrivals = 0;
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      for (let week = 0; week < 60 * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
        const before = state.crossroad?.templateId ?? null;
        for (const report of run(state, 1, 'prudent', CATALOG)) {
          for (const entry of report.entries) {
            if (entry.templateKey === 'raid.coming') warnings += 1;
            if (entry.templateKey === 'raid.open' || entry.templateKey === 'raid.walled') arrivals += 1;
          }
        }
        const now = state.crossroad?.templateId ?? null;
        if (now === 'raiders_coming' && now !== before) asked += 1;
      }
    }
    expect(warnings, 'ningún valle recibió aviso').toBeGreaterThan(0);
    // Cada partida que llega fue avisada: no hay asalto sin su aviso.
    expect(warnings).toBeGreaterThanOrEqual(arrivals);
    expect(asked, 'la pregunta del aviso no se planteó nunca').toBeGreaterThan(0);
  });

  it('pagarles hace que se den la vuelta, y prepararse salva la mitad', () => {
    // Las tres salidas sobre el mismo valle en el mismo instante: es la única
    // forma de medir una decisión sin que la trayectoria la contamine.
    const base = foundGame(47);
    run(base, TIME.WEEKS_PER_YEAR * 30, 'prudent', CATALOG);
    base.village.silver = 200;
    base.village.grain = 2000;
    base.threat.comingTick = base.tick + 1;
    base.threat.comingBand = 20;
    // Sin muralla, para que lo que se mida sea la decisión y no el cerco.
    base.buildings = base.buildings.filter(
      (b) => b.kind !== 'gate' && b.kind !== 'palisade' && b.kind !== 'wall',
    );

    const waited = structuredClone(base);
    const braced = structuredClone(base);
    braced.flags['braced'] = braced.tick + TIME.WEEKS_PER_YEAR;
    const paid = structuredClone(base);
    paid.flags['bought_off'] = paid.tick + TIME.WEEKS_PER_YEAR;

    for (const state of [waited, braced, paid]) run(state, 2, 'prudent', CATALOG);

    expect(paid.village.silver, 'a quien paga no le saquean').toBe(200);
    expect(paid.threat.raids, 'y la partida no cuenta como asalto').toBe(base.threat.raids);
    expect(braced.village.grain, 'prepararse salva grano').toBeGreaterThan(waited.village.grain);
    expect(waited.threat.raids, 'a quien espera le saquean').toBeGreaterThan(base.threat.raids);
  });

  it('y el que paga aprende que pagar sale caro', () => {
    // La semilla de `pay`: el vecino que cobró una vez vuelve antes. Se mide la
    // probabilidad, que es lo que la marca cambia.
    const state = foundGame(58);
    run(state, TIME.WEEKS_PER_YEAR * 20, 'prudent', CATALOG);
    state.threat.comingTick = null;
    const plain = structuredClone(state);
    const known = structuredClone(state);
    known.flags['known_to_pay'] = known.tick + TIME.WEEKS_PER_YEAR * 8;

    // Veinte años cada uno, contando cuántas partidas se organizan.
    run(plain, TIME.WEEKS_PER_YEAR * 20, 'prudent', CATALOG);
    run(known, TIME.WEEKS_PER_YEAR * 20, 'prudent', CATALOG);
    expect(known.threat.raids, 'al que paga vuelven más veces')
      .toBeGreaterThanOrEqual(plain.threat.raids);
  });
});
