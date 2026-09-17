// U-10 · El menú de inicio: lo que se puede probar sin pantalla.
import { describe, expect, it } from 'vitest';
import { parseSeed, parseYear } from '../../src/ui/screens/title';
import { openAtYear } from '../../src/ui/debug';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { TIME } from '@engine/balance';
import { yearOf } from '@engine/time';

describe('el número del valle · U-10', () => {
  it('acepta un entero de 32 bits escrito a mano, con espacios alrededor', () => {
    expect(parseSeed('7', 1)).toBe(7);
    expect(parseSeed('  4294967295 ', 1)).toBe(4294967295);
    expect(parseSeed('0', 1)).toBe(0);
  });

  it('y con cualquier otra cosa se queda con el que había', () => {
    // Un menú que fundara un valle distinto del que el jugador cree haber
    // escrito rompería lo único que configura: poder comparar valles.
    for (const text of ['', ' ', '-7', '7.5', '1e3', 'siete', '4294967296', '12345678901', '7 7']) {
      expect(parseSeed(text, 42), JSON.stringify(text)).toBe(42);
    }
  });
});

describe('el año de taller · U-10b', () => {
  it('acepta el año que la cabecera lee, y vacío es fundar y mirar', () => {
    expect(parseYear('1')).toBe(1);
    expect(parseYear('21')).toBe(21);
    expect(parseYear(' 120 ')).toBe(120);
    expect(parseYear('')).toBe(1);
  });

  it('y con cualquier otra cosa se queda en el año 1, en vez de congelar la pantalla', () => {
    // El cero no existe: el valle recién fundado ya está en el año 1. Y de
    // «veinte» no se puede adivinar un año, así que se funda y se mira.
    for (const text of [' ', '0', '-5', '7.5', '1e3', 'veinte', '2 0']) {
      expect(parseYear(text), JSON.stringify(text)).toBe(1);
    }
  });

  it('un año por encima del techo se recorta al techo, y no se ignora en silencio', () => {
    // **El fallo que el dueño encontró a los diez minutos.** El campo traía un
    // «1» puesto, escribió 50 detrás, quedó «150», y el menú abría el año 1
    // con la pareja fundadora: hacía lo contrario de lo que le pedía, callado.
    // Ahora el campo va vacío y se selecciona al tocarlo —eso es lo que
    // impide que vuelva a pasar— y, si aun así se cuela un número grande, se
    // recorta: pedir mucho da mucho, nunca nada.
    expect(parseYear('150')).toBe(120);
    expect(parseYear('9999')).toBe(120);
    expect(parseYear('121')).toBe(120);
    expect(parseYear('120')).toBe(120);
  });

  it('abrir en un año da una partida de verdad de ese año, no un decorado', () => {
    // La propiedad que importa: lo que se abre tiene que ser jugable y
    // coherente —gente, edificios y crónica— y estar donde se pidió. Si esto
    // se rompiera, el dueño estaría probando un valle que el juego no produce.
    //
    // **Y un valle puede morirse antes de llegar al año que se pidió**, que es
    // el juego y no un fallo: 3 de 12 se rompen a los cuarenta años
    // (`rework.md`, decisión del dueño). Medido aquí: la semilla 23 se acaba en
    // el año 18. Entonces se abre lo que quedó, y por eso el aserto es «el año
    // pedido, **o** el final», nunca sólo el primero.
    const YEAR = 21;
    let ruined = 0;
    for (const seed of [7, 11, 23]) {
      const state = foundGame(seed);
      const before = population(state);
      openAtYear(state, YEAR);
      if (state.ended === null) {
        // El año que se pide es el que la cabecera lee: el 21 es el tick 960.
        expect(state.tick, `semilla ${seed}`).toBe((YEAR - 1) * TIME.WEEKS_PER_YEAR);
        expect(yearOf(state.tick) + 1).toBe(YEAR);
        // El que aguanta tiene que haber crecido y haber construido, **y lo
        // que ha construido va con la gente que tiene**. Esto último lo enseñó
        // M-0: la semilla 23 se acababa en el año 18 y con la trayectoria nueva
        // llega al 21 **con tres personas**, un campo y una casa. No está
        // muerta, no se está apagando —el mínimo viable de §5.7 son dos— y no
        // hay más que levantar: pedirle cuatro edificios era pedirle una aldea
        // que no es. Lo que ningún valle vivo puede no tener es de qué comer y
        // dónde dormir.
        const live = state.buildings.filter((b) => b.lostTick === null);
        expect(population(state), `semilla ${seed}: gente`).toBeGreaterThan(before);
        expect(live.some((b) => b.kind === 'field'), `semilla ${seed}: campo`).toBe(true);
        expect(live.some((b) => b.kind === 'house' || b.kind === 'stone_house'),
          `semilla ${seed}: techo`).toBe(true);
        if (population(state) >= 8) {
          expect(live.length, `semilla ${seed}: una aldea hecha construye`).toBeGreaterThan(3);
        }
        // **Las encrucijadas se contestaron**, que es la diferencia entre esto
        // y un bucle de `tick`: sin contestar, la primera planteada se queda
        // pendiente para siempre y con ella se van sus consecuencias, sus
        // semillas y las obras que conceden (`CLAUDE.md`). Sólo se le exige al
        // valle que sigue vivo: el de la semilla 23 se muere en el año 18 sin
        // que le hayan planteado ninguna —la garantía de §8.6 son 960 ticks—.
        expect(state.history.length, `semilla ${seed}: decisiones`).toBeGreaterThan(0);
      } else {
        ruined += 1;
        expect(state.tick, `semilla ${seed}: no sigue tras el final`)
          .toBeLessThanOrEqual((YEAR - 1) * TIME.WEEKS_PER_YEAR);
      }
      expect(state.chronicle.length, `semilla ${seed}: crónica`).toBeGreaterThan(5);
    }
    // Y no todos se rompen, que es la otra mitad del equilibrio: si los tres
    // acabaran en ruinas, el año de taller no serviría para mirar una aldea.
    expect(ruined, 'valles rotos de tres a los veinte años').toBeLessThan(3);
  });

  it('y es determinista: el mismo año del mismo valle, dos veces igual', () => {
    const once = foundGame(11);
    const twice = foundGame(11);
    openAtYear(once, 13);
    openAtYear(twice, 13);
    expect(JSON.stringify(once.people)).toBe(JSON.stringify(twice.people));
    expect(once.village).toEqual(twice.village);
  });

  it('el año 1 no mueve el valle: el juego de siempre', () => {
    for (const year of [0, 1]) {
      const state = foundGame(7);
      openAtYear(state, year);
      expect(state.tick, `año ${year}`).toBe(0);
    }
  });
});
