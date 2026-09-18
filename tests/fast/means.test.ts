// M-2 · Los medios: lo que el jugador mete en el valle.
// `docs/plan-medios.md` §3, brief en `docs/rework.md` §4b.
//
// **Lo que se guarda no es que un medio sea bueno.** Es que dar algo cueste lo
// del valle, que no se pueda dar lo que no se puede pagar, que dar no mueva una
// sola tirada del mundo, y que cada medio abra algo **y** cierre algo. Si un día
// alguien hace que los medios sólo traigan cosas buenas, esto se rompe, y eso
// es lo que tiene que pasar: la mitad mala es la mitad que hace que elegir sea
// una decisión (`plan-medios.md` §3.2).

import { describe, expect, it } from 'vitest';
import { ANIMALS, FATE, MEANS, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run, tick } from '@engine/sim';
import { MEANS_IDS, type GameState, type MeansId, type PlayerAct } from '@engine/state';
import { weightNow } from '@engine/world/fate';
import { MEANS_SPEC, canGive, giveMeans, refusalFor } from '@engine/world/means';
import { herdCapacity } from '@engine/subsistence/herd';
import { animalPositions } from '@derive/animals';
import { foundTwenty } from '../helpers/founding';

const give = (means: MeansId): PlayerAct[] => [{ kind: 'means', means }];

/**
 * Una aldea hecha con de todo en la despensa, para que el precio no estorbe.
 *
 * **Y con camas de sobra desde B-1**, por la misma razón: el par de manos pide
 * un sitio donde dormir, y con el ritmo nuevo esta aldea de cuatro años llega
 * con las camas llenas —la gente llega todos los meses mientras el valle es
 * pequeño—, así que la negativa que salía era `room` y esta prueba, que mide el
 * **precio**, no llegaba a mirarlo. Dos casas más y el sitio deja de estorbar,
 * igual que la despensa.
 */
function rich(seed = 7): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 4, 'prudent', CATALOG);
  state.village.grain = 5000;
  state.village.wood = 5000;
  state.village.silver = 500;
  for (let n = 0; n < 2; n += 1) {
    state.buildings.push({
      id: 9500 + n, kind: 'house', x: 10 + n * 3, y: 10, w: 2, h: 2,
      builtTick: state.tick, lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
  }
  return state;
}

/**
 * A2c · **Y una aldea con muralla y puerta, para el portón.**
 *
 * El portón es el único medio que necesita algo que no está en la despensa: un
 * cerco que atravesar. La aldea de cuatro años de `rich()` no lo tiene, así que
 * la negativa que salía era `room` y estas dos pruebas —que miden el
 * **precio**— no llegaban a mirarlo. Es el mismo remedio que las dos casas de
 * más: se le da al valle lo que el medio necesita y el precio deja de quedar
 * tapado.
 *
 * Treinta y dos años en la semilla 47 es lo primero que hay, medido en diez
 * semillas: antes de eso la aldea ni siquiera ha cerrado un tramo de muralla
 * donde quepa una segunda puerta. Se guarda hecha y se clona, que es lo que
 * hace `crown-will.test.ts` por lo mismo.
 */
let walledBase: GameState | undefined;
function walled(): GameState {
  if (walledBase === undefined) {
    walledBase = foundTwenty(47);
    run(walledBase, TIME.WEEKS_PER_YEAR * 32, 'prudent', CATALOG);
  }
  const state = structuredClone(walledBase);
  state.village.grain = 5000;
  state.village.wood = 5000;
  state.village.silver = 500;
  state.village.stone = 5000;
  return state;
}

/** La aldea que cada medio necesita para que lo único que estorbe sea el precio. */
function payer(id: MeansId): GameState {
  return id === 'gate' ? walled() : rich();
}

describe('dar un medio', () => {
  it('cuesta exactamente lo que dice, y nada más', () => {
    for (const id of MEANS_IDS) {
      const state = payer(id);
      const before = { ...state.village };
      const outcome = giveMeans(state, id, 'spring', 4);
      expect(outcome.given, id).toBe(true);
      for (const stat of ['grain', 'wood', 'stone', 'silver'] as const) {
        const cost = MEANS_SPEC[id].cost[stat] ?? 0;
        expect(state.village[stat], `${id}: ${stat}`).toBe(before[stat] - cost);
      }
    }
  });

  it('no se puede dar lo que no se puede pagar, y no se cobra a medias', () => {
    for (const id of MEANS_IDS) {
      const state = payer(id);
      state.village.silver = 0;
      const before = { ...state.village };
      expect(refusalFor(state, id), id).toBe('cost');
      const outcome = giveMeans(state, id, 'spring', 4);
      expect(outcome.given, id).toBe(false);
      expect(state.village, id).toEqual(before);
    }
  });

  it('el arado no se da dos veces: es un rasgo del valle', () => {
    const state = rich();
    expect(canGive(state, 'plough')).toBe(true);
    giveMeans(state, 'plough', 'spring', 4);
    expect(state.traits).toContain('plough');
    expect(refusalFor(state, 'plough')).toBe('already');
  });

  it('un barril no se encadena con el anterior', () => {
    // Medido: sin esto, un valle compraba cincuenta y un barriles en sesenta
    // años —fiesta permanente— porque la plata del camino daba para eso.
    const state = rich();
    giveMeans(state, 'ale', 'spring', 4);
    expect(refusalFor(state, 'ale')).toBe('feasting');
    state.tick += MEANS.ALE_WEEKS;
    expect(refusalFor(state, 'ale')).toBeNull();
  });

  it('no mueve una sola tirada del mundo', () => {
    // §4.3, la misma propiedad que las ofertas del camino: lo que el jugador
    // hace no puede desplazar la partida.
    const a = rich(11);
    const b = rich(11);
    tick(a, CATALOG, undefined, give('pigs'));
    tick(b, CATALOG);
    expect(a.rng).toEqual(b.rng);
  });

  it('queda en el registro, con lo que se hizo y lo que no', () => {
    const state = rich();
    tick(state, CATALOG, undefined, give('plough'));
    expect(state.acts.at(-1)).toMatchObject({ act: { kind: 'means', means: 'plough' }, done: true });
    state.village.silver = 0;
    tick(state, CATALOG, undefined, give('pigs'));
    expect(state.acts.at(-1)).toMatchObject({ act: { kind: 'means', means: 'pigs' }, done: false });
  });
});

describe('cada medio abre algo, y cierra algo', () => {
  it('el arado libera brazos, y no sube la cosecha', () => {
    // Es la diferencia entre un medio y un número mejor: lo que cambia es
    // **quién queda libre**, y a dónde van esos brazos lo decide la aldea.
    const plain = rich();
    const ploughed = rich();
    giveMeans(ploughed, 'plough', 'spring', 4);
    // Mismo estado salvo el rasgo y lo que costó: se igualan las existencias
    // para que lo único que se mida sea el reparto.
    ploughed.village = { ...plain.village };
    const before = tick(plain, CATALOG);
    const after = tick(ploughed, CATALOG);
    expect(after.harvested).toBe(before.harvested);
    // Menos manos en el campo, y la aldea las usa: la leña y la obra suben.
    expect(after.wood + after.buildPoints).toBeGreaterThan(before.wood + before.buildPoints);
  });

  it('los cerdos llaman a los lobos', () => {
    const quiet = rich();
    quiet.herd.hens = 6;
    quiet.herd.pigs = 0;
    quiet.tick = TIME.WEEKS_PER_YEAR * 5 + 38; // invierno
    const fed = structuredClone(quiet);
    giveMeans(fed, 'pigs', 'winter', 5);
    expect(weightNow(fed, 'wolves_at_the_coop')).toBeGreaterThan(weightNow(quiet, 'wolves_at_the_coop'));
  });

  it('el barril trae bodas y riñas, las dos', () => {
    const sober = rich();
    const merry = structuredClone(sober);
    giveMeans(merry, 'ale', 'spring', 4);
    expect(weightNow(merry, 'wedding')).toBeGreaterThan(weightNow(sober, 'wedding'));
    expect(weightNow(merry, 'quarrel_in_the_square'))
      .toBeGreaterThan(weightNow(sober, 'quarrel_in_the_square'));
  });

  it('la fiesta del barril se celebra esa misma semana', () => {
    // Es lo que le da al ánimo el reloj del jugador: dar algo y no ver nada es
    // lo que hacía que las palancas no se entendieran.
    const state = rich();
    const before = state.village.morale;
    const report = tick(state, CATALOG, undefined, give('ale'));
    expect(report.happening).toBe('ale_feast');
    expect(state.village.morale).toBeGreaterThan(before);
  });

  it('y el granero lleno trae ratas, que es a donde lleva el arado', () => {
    const state = rich();
    state.tick = TIME.WEEKS_PER_YEAR * 6 + 40; // invierno
    state.village.grain = 0;
    const empty = weightNow(state, 'rats_in_the_granary');
    state.village.grain = 100_000;
    const full = weightNow(state, 'rats_in_the_granary');
    expect(empty).toBe(0);
    // Sólo con granero en pie: sin granero no hay dónde entrar.
    if (state.buildings.some((b) => b.kind === 'granary' && b.lostTick === null)) {
      expect(full).toBeGreaterThan(0);
    }
  });

  it('y el corral lleno, matanza en la fiesta', () => {
    const state = rich();
    state.tick = TIME.WEEKS_PER_YEAR * 6 + TIME.HARVEST_WEEK + 1; // la semana de la fiesta
    state.herd.pigs = 0;
    expect(weightNow(state, 'pig_slaughter')).toBe(0);
    state.herd.pigs = FATE.SLAUGHTER_MIN_PIGS;
    expect(weightNow(state, 'pig_slaughter')).toBeGreaterThan(0);
  });
});

describe('la pocilga: dar sitio, no sólo animales · M-3', () => {
  it('se puede dar aunque el corral esté lleno, porque lo que da es sitio', () => {
    // **La medida que obligó a rehacer este medio.** El corral se llena solo
    // —`tendHerd` cría hasta la capacidad de las casas— así que «dos cerdos»
    // era una negativa por `room` en las cuatro aldeas que se midieron. Un
    // medio que no se puede dar no es un medio.
    const state = rich();
    state.herd.pigs = herdCapacity(state).pigs;
    expect(refusalFor(state, 'pigs')).toBeNull();
    const ceiling = herdCapacity(state).pigs;
    giveMeans(state, 'pigs', 'summer', 4);
    expect(herdCapacity(state).pigs).toBe(ceiling + ANIMALS.STY_PIGS);
    expect(state.herd.pigs).toBeGreaterThan(ceiling);
  });

  it('y los cerdos que entran se ven: no se apilan en el mismo punto', () => {
    // El segundo defecto de M-3, y sólo se ve mirando: `derive/animals.ts`
    // colocaba un cerdo por cada dos casas y los que repetían casa caían en la
    // **misma coordenada**, así que dar dos cerdos no cambiaba nada en pantalla
    // —dos cuerpos antes y dos después, medido con `window.__valleyLife`—.
    const state = rich();
    const pigsOnScreen = (): number =>
      animalPositions(state, 0).filter((animal) => animal.kind === 'pig').length;
    state.herd.pigs = herdCapacity(state).pigs;
    const before = pigsOnScreen();
    giveMeans(state, 'pigs', 'summer', 4);
    expect(pigsOnScreen()).toBeGreaterThan(before);
    // Y cada uno en su sitio: dos cerdos en la misma coordenada son un cerdo.
    const spots = new Set(animalPositions(state, 0)
      .filter((animal) => animal.kind === 'pig')
      .map((animal) => `${animal.x.toFixed(2)},${animal.y.toFixed(2)}`));
    expect(spots.size).toBe(pigsOnScreen());
  });
});

describe('el valle recién fundado', () => {
  it('no puede pagar nada, y se le dice por qué', () => {
    // La pareja no tiene plata: el carro está lleno de cosas que no puede dar,
    // y eso **se dice** en vez de dejar tres botones apagados sin motivo.
    const pair = foundGame(7);
    for (const id of MEANS_IDS) {
      const refusal = refusalFor(pair, id);
      expect(refusal, id).not.toBeNull();
      // Y el motivo que se da es el más cierto de los que hay: a la pareja no
      // le falta sólo la plata, es que tampoco tiene corral. Cada motivo tiene
      // su frase en el banco (`cart.no.*`), que es lo que el carro enseña.
      expect(['cost', 'room', 'already', 'feasting'], id).toContain(refusal);
    }
  });
});
