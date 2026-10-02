// Lo lento de `tests/fast/ui-title.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 25 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// U-10 · El menú de inicio: lo que se puede probar sin pantalla.
import { describe, expect, it } from 'vitest';
import { openAtYear } from '../../src/ui/debug';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { TIME } from '@engine/balance';
import { yearOf } from '@engine/time';

describe('el año de taller · U-10b', () => {
  it('abrir en un año da una partida de verdad de ese año, no un decorado', () => {
    // La propiedad que importa: lo que se abre tiene que ser jugable y
    // coherente —gente, edificios y crónica— y estar donde se pidió. Si esto
    // se rompiera, el dueño estaría probando un valle que el juego no produce.
    //
    // **Y un valle puede morirse antes de llegar al año que se pidió**, que es
    // el juego y no un fallo: 3 de 12 se rompen a los cuarenta años
    // (`docs/historico/rework.md`, decisión del dueño). Medido aquí: la semilla 23 se acaba en
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
        //
        // **Y el listón de «aldea hecha» se vuelve a medir tras el juego de los
        // medios y el balanceo de la leña**, porque la puerta en ocho personas
        // se quedó justo encima del caso raro. Ocho semillas en el año 21
        // (17 sep 2026):
        //
        //   semilla  23 → 10 personas y  3 edificios (el caso raro)
        //   semilla 101 → 11 personas y  9 edificios
        //   semilla  33 → 22 y 13  ·  2024 → 23 y 13  ·  7 → 23 y 17
        //   semilla  11 → 25 y 16  ·    42 → 32 y 20  · 51 → 45 y 43
        //
        // Hay un valle que llega al año 21 con **diez personas metidas en tres
        // edificios** —un campo y dos techos— y sigue vivo: es la aldea que se
        // apiña y no construye, y es una partida legítima. Del resto, el que
        // menos gente tiene ya ha levantado nueve cosas. Así que la puerta sube
        // a doce, por encima del caso raro y muy por debajo del grupo: lo que
        // la propiedad dice es que **una aldea de una docena ha construido más
        // que un campo y un techo**, no que nadie pueda apiñarse.
        const live = state.buildings.filter((b) => b.lostTick === null);
        expect(population(state), `semilla ${seed}: gente`).toBeGreaterThan(before);
        expect(live.some((b) => b.kind === 'field'), `semilla ${seed}: campo`).toBe(true);
        expect(live.some((b) => b.kind === 'house' || b.kind === 'stone_house'),
          `semilla ${seed}: techo`).toBe(true);
        if (population(state) >= 12) {
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
});
