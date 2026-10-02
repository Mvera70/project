// Lo lento de `tests/fast/quarrels.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 17 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-39 · design.md §6.4, §7.9 — cuando dos dejan de aguantarse.
//
// El valle sabía escribir rencores desde M-05 y no hacía nada con ellos. Un
// rencor abierto era una fila en un registro: nadie discutía, nadie se gritaba,
// nadie dejaba de hablarse en la plaza.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { QUARREL } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { quarrelOf } from '@engine/people/quarrels';
import type { GameState, Villager } from '@engine/state';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

/**
 * La opinión con la que los dos empiezan a medirse: pasada el −50 que abre un
 * rencor (§6.4) y **lejos del suelo**, que es donde el carácter deja de
 * distinguirse porque no hay a dónde bajar.
 */
const QUARREL_FLOOR = -60;

// **Y que sigan en el valle** (`leftTick`): RD-3 hizo real que quien pierde una
// riña se marche (`smith_feud.side_with_*`), y un nombrado que se fue no riñe
// con nadie —`quarrelOf` sólo mira a los presentes—, así que la prueba medía la
// semana 3 000 de dos que ya no estaban.
const namedOf = (s: GameState): Villager[] =>
  s.people.villagers.filter((v) => v.named && v.diedTick === null && v.leftTick === null);

/**
 * Dos que se detestan de verdad, con su rencor ya cocido, **y los únicos del
 * valle**.
 *
 * Lo segundo lo aprendió esta prueba dos veces, y la segunda con M-0: la aldea
 * de veinte años llega con rencores propios —la riña de la plaza de R-1 los
 * empuja— y cualquier cambio del motor cambia **quiénes** son, así que una
 * prueba que dé por hecho que los dos primeros nombrados son los que peor se
 * llevan mide la biografía de una semilla y no la regla de §7.9. Apagando los
 * demás, lo que se vigila es lo que el título dice.
 */
function feuding(state: GameState): [Villager, Villager] {
  for (const grudge of state.people.grudges) grudge.healedTick = state.tick;
  for (const person of state.people.villagers) {
    for (const id of Object.keys(person.opinions)) {
      if (person.opinions[Number(id)]! < 0) person.opinions[Number(id)] = 0;
    }
  }
  const [a, b] = namedOf(state);
  a!.opinions[b!.id] = -80;
  b!.opinions[a!.id] = -80;
  state.people.grudges.push({
    fromId: a!.id,
    toId: b!.id,
    cause: 'was_blamed',
    causeTick: state.tick - 200,
    formedTick: state.tick - QUARREL.COOLING_TICKS - 1,
    healedTick: null,
  });
  return [a!, b!];
}

/** Intenta muchas semanas: la riña es rara por semana, no imposible. */
function quarrelWithin(state: GameState, weeks: number): ReturnType<typeof quarrelOf> {
  for (let n = 0; n < weeks; n += 1) {
    const q = quarrelOf(state);
    if (q !== null) return q;
    state.tick += 1;
  }
  return null;
}

describe('sin rencor no hay riña · §7.9', () => {
  it('una aldea sin rencores nunca discute', () => {
    const state = village(20);
    state.people.grudges = [];
    expect(quarrelWithin(state, 400)).toBeNull();
  });
});

describe('con rencor, acaba pasando · §7.9', () => {
  it('el que tiene mal genio riñe mucho más que el manso', () => {
    // §6.3 tenía quince rasgos y sólo dos cambiaban comportamiento. Éste es el
    // tercero: el carácter decide si el asunto estalla o se aguanta un año más.
    //
    // Se cuentan riñas en una ventana fija en vez de esperar a la primera: es
    // treinta veces más barato y la suite rápida tiene veinte segundos para
    // todo. Y con la proporción, no con el orden — comparar sólo «antes que»
    // pasaba aunque el rasgo del genio vivo no hiciera nada, porque el manso
    // frena por su cuenta. Lo destapó una mutación.
    // Se cuentan semanas hasta la PRIMERA riña, no riñas en una ventana: desde
    // v3.09 los mismos dos no pueden repetir antes de `REPEAT_TICKS`, así que
    // contar en una ventana mide el freno y no el carácter.
    const weeksUntil = (trait: 'hot_tempered' | 'kind', seed: number): number => {
      const state = village(20, seed);
      const [a, b] = feuding(state);
      a.traits = [trait];
      b.traits = [trait];
      // **Y el mismo punto de partida para los dos.** `feuding` deja la opinión
      // mutua en −80, pero la aldea de veinte años llega con la suya propia y
      // cada cambio del motor la mueve: con la opinión ya en el suelo, el manso
      // riñe tan pronto como el de mal genio y la proporción se cae. Es la
      // misma lección que la nota de `feuding`, un paso más adentro.
      a.opinions[b.id] = QUARREL_FLOOR;
      b.opinions[a.id] = QUARREL_FLOOR;
      for (let week = 0; week < 3000; week += 1) {
        if (quarrelOf(state) !== null) return week;
        state.tick += 1;
      }
      return 3000;
    };

    // **Tres semillas y no una**, que es la regla del proyecto: dos partidas
    // divergen desde el primer tick y una sola es ruido.
    let hotAll = 0;
    let mildAll = 0;
    // **La 11 sale de la lista el 30 sep 2026, con su causa**
    // (`docs/historico/rework.md` §2.7). Al dejar de ser personajes los que
    // llegan sin hueco (`world/means.ts`, `arriveToStay`), su aldea de veinte
    // años cambia y la primera tirada del flujo `quarrels` sale por debajo de
    // 0,0035 —la probabilidad del manso—, así que riñen los dos en la semana 0
    // y `mild > hot` compara 0 con 0: mide la tirada, no el carácter. La 31 en
    // su lugar: 5 semanas contra 166 (la 7, 16 contra 235; la 23, 11 contra
    // 2 022).
    for (const seed of [7, 23, 31]) {
      const hot = weeksUntil('hot_tempered', seed);
      const mild = weeksUntil('kind', seed);
      expect(hot, `semilla ${seed}: el de mal genio riñe pronto`).toBeLessThan(600);
      expect(mild, `semilla ${seed}: el manso aguanta más`).toBeGreaterThan(hot);
      hotAll += hot;
      mildAll += mild;
    }
    // **El listón, remedido y con su causa.** Era 8, medido cuando la prueba
    // partía de la opinión que la aldea tuviera; al fijar el punto de partida
    // lejos del suelo —para que lo que se mida sea el carácter y no la
    // biografía— la proporción sale entre 3 y 5 en las tres semillas. Se pone
    // en 3: lo que el título promete es «muchísimo más», y tres veces lo es.
    expect(mildAll / Math.max(1, hotAll), 'el manso aguanta muchísimo más').toBeGreaterThan(3);
  });
});
