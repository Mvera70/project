// G-05 · El reloj de presentación, y la tabla de clips. design.md D.6, D.4.
//
// Lo que queda de `graphics-actors.test.ts` después de V-12. Aquel fichero
// probaba dos cosas a la vez: un reloj que reparte tiempo escénico y una
// función que, dado un instante, decía dónde estaría cada persona. La segunda
// se borró con el camino viejo —el valle ya no evalúa una curva, simula
// cuerpos, y sus propiedades se prueban en `life-*.test.ts`—. El reloj sigue
// entero y sigue siendo el dueño único del tiempo de presentación.
//
// La tabla de clips se queda aquí porque es lo mismo que el reloj: un contrato
// con el recurso exportado, y una copia que nadie comprueba es una copia que se
// separa en silencio.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TIME } from '@engine/balance';
import { resolve } from 'node:path';
import {
  createPresentationClock, dayPhase, SCENIC_DAY_SECONDS,
} from '../../src/render3d/presentation-clock';
import { VILLAGER_CLIPS } from '../../src/render3d/clips';

describe('G-05 · el reloj de presentación', () => {
  it('en pausa no avanza ni un segundo escénico', () => {
    // D.6: la pausa congela desplazamiento y clips. La cámara y las fichas
    // siguen respondiendo, pero eso no es asunto del reloj.
    const clock = createPresentationClock();
    clock.frame({ realMs: 0, tick: 10, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    const running = clock.frame({ realMs: 16, tick: 10, tickFraction: 0.1, speed: 1, reducedMotion: false, hidden: false });
    expect(running.deltaSeconds).toBeGreaterThan(0);

    const before = clock.seconds;
    for (let step = 1; step <= 30; step += 1) {
      const paused = clock.frame({
        realMs: 16 + step * 16, tick: 10, tickFraction: 0.1, speed: 0, reducedMotion: false, hidden: false,
      });
      expect(paused.deltaSeconds).toBe(0);
      expect(paused.speed).toBe(0);
    }
    expect(clock.seconds).toBe(before);
  });

  it('cuántas semanas caben en una jornada no depende del botón', () => {
    // D.6.1, decidido el 15 sep 2026: **la jornada sigue la velocidad entera.**
    //
    // Es la propiedad y no la fórmula. Lo que el jugador puede ver sin contar
    // nada es que el calendario y el sol cuenten lo mismo, y con la raíz
    // cuadrada que había antes no lo contaban: a ×1 pasaban ocho semanas por
    // jornada y a ×16 pasaban treinta y dos, así que el sol cambiaba de ritmo
    // cada vez que se tocaba la velocidad. Si alguien vuelve a meter un término
    // medio aquí, esta prueba se pone roja por la razón correcta.
    const perDay = (speed: 1 | 4 | 16 | 64): number => {
      const clock = createPresentationClock();
      clock.frame({ realMs: 0, tick: 0, tickFraction: 0, speed, reducedMotion: false, hidden: false });
      // Fotogramas de 16 ms: por debajo del paso máximo del reloj, así que
      // ninguno se recorta y lo que se mide es el reparto y no el tope.
      let ticks = 0;
      for (let step = 1; step <= 600; step += 1) {
        ticks = (step * speed * 16) / TIME.REAL_MS_PER_TICK;
        clock.frame({
          realMs: step * 16, tick: Math.floor(ticks),
          // La fracción de verdad, porque desde v3.72 es de donde sale la hora:
          // con cero, este banco dejaba el reloj clavado en el amanecer del
          // lunes y la cuenta de abajo dividía por cero.
          tickFraction: ticks % 1, speed, reducedMotion: false, hidden: false,
        });
      }
      // Semanas por jornada escénica.
      return ticks / (clock.seconds / SCENIC_DAY_SECONDS);
    };
    const base = perDay(1);
    for (const speed of [4, 16, 64] as const) {
      expect(perDay(speed), `a ×${speed}`).toBeCloseTo(base, 6);
    }
    // Y la cuenta de verdad, que es la que hay que mirar si esto cambia:
    // **un séptimo de semana por jornada de sol**, a cualquier velocidad. Es la
    // identidad de §12.1 vista desde el otro lado —siete jornadas por semana— y
    // hasta v3.72 eran ocho semanas por jornada, que es la incoherencia que el
    // dueño del diseño veía sin contar nada.
    expect(base).toBeCloseTo(1 / TIME.DAYS_PER_WEEK, 6);
    expect(base).toBeCloseTo((SCENIC_DAY_SECONDS * 1000) / TIME.REAL_MS_PER_TICK, 6);
  });

  it('en pausa no hay jornada, y cada velocidad reparte lo suyo', () => {
    // El banco mueve el mundo como lo mueve el bucle: la velocidad decide
    // cuántas semanas pasan, y desde v3.72 el tiempo escénico **es** ése. Con
    // la fracción clavada en cero —como estaba escrito— el reloj no avanzaba y
    // esto medía la nada.
    const advanced = (speed: 0 | 1 | 4 | 16 | 64): number => {
      const clock = createPresentationClock();
      clock.frame({ realMs: 0, tick: 0, tickFraction: 0, speed, reducedMotion: false, hidden: false });
      for (let step = 1; step <= 60; step += 1) {
        const weeks = (step * speed * 16) / TIME.REAL_MS_PER_TICK;
        clock.frame({
          realMs: step * 16, tick: Math.floor(weeks),
          tickFraction: weeks % 1, speed, reducedMotion: false, hidden: false,
        });
      }
      return clock.seconds;
    };
    const base = advanced(1);
    expect(advanced(0)).toBe(0);
    expect(advanced(4)).toBeCloseTo(base * 4, 6);
    expect(advanced(16)).toBeCloseTo(base * 16, 6);
    expect(advanced(64)).toBeCloseTo(base * 64, 6);
  });

  it('un letargo no se representa: se salta y se avisa', () => {
    // D.6: al volver se reconstruye desde el estado final sin representar el
    // intervalo omitido, y `discontinuity` cancela lo que estuviera en marcha.
    const clock = createPresentationClock();
    clock.frame({ realMs: 0, tick: 100, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    const steady = clock.frame({ realMs: 16, tick: 100, tickFraction: 0.1, speed: 1, reducedMotion: false, hidden: false });
    expect(steady.discontinuity).toBe(false);

    const woken = clock.frame({
      realMs: 32, tick: 940, tickFraction: 0.1, speed: 1, reducedMotion: false, hidden: false,
    });
    expect(woken.discontinuity).toBe(true);
    // Y ochocientas semanas de golpe no valen ochocientas semanas de animación.
    expect(woken.deltaSeconds).toBeLessThanOrEqual(0.1);
  });

  it('la pestaña oculta suspende, y volver es discontinuo', () => {
    const clock = createPresentationClock();
    clock.frame({ realMs: 0, tick: 5, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    const away = clock.frame({ realMs: 16, tick: 5, tickFraction: 0, speed: 1, reducedMotion: false, hidden: true });
    expect(away.deltaSeconds).toBe(0);
    expect(away.discontinuity).toBe(true);

    const back = clock.frame({
      realMs: 120_000, tick: 5, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false,
    });
    expect(back.discontinuity).toBe(true);
    expect(back.deltaSeconds).toBe(0);
  });

  it('un fotograma lento avanza lo que puede, no lo que le falta', () => {
    // Cuatrocientos milisegundos de fotograma son 0,4 s escénicos a ×1, y el
    // paso se recorta a `MAX_STEP_SECONDS`: lo que se acota es **cuánto andan
    // los cuerpos**, no qué hora es. Desde v3.72 la hora la lleva el motor, así
    // que el mundo avanza esos 400 ms y `seconds` los recoge enteros; el que se
    // queda corto es el paso de la animación, que es lo que dice el aserto.
    const clock = createPresentationClock();
    clock.frame({ realMs: 0, tick: 1, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    const slow = clock.frame({
      realMs: 400, tick: 1, tickFraction: 400 / TIME.REAL_MS_PER_TICK,
      speed: 1, reducedMotion: false, hidden: false,
    });
    expect(slow.deltaSeconds).toBeCloseTo(0.1, 6);
    expect(slow.presentationSeconds).toBeCloseTo(TIME.DAYS_PER_WEEK * SCENIC_DAY_SECONDS + 0.4, 6);
    expect(slow.discontinuity).toBe(false);
  });

  it('el tiempo escénico sólo crece, y reset lo pone en la hora del motor', () => {
    const clock = createPresentationClock();
    let last = -1;
    for (let step = 0; step <= 200; step += 1) {
      const frame = clock.frame({
        realMs: step * 16, tick: step, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false,
      });
      expect(frame.presentationSeconds).toBeGreaterThanOrEqual(last);
      last = frame.presentationSeconds;
    }
    clock.reset();
    expect(clock.seconds).toBe(0);
    // Y el primer fotograma tras el reset **se pone en hora con el tick**
    // (v3.72): antes volvía a cero y el sol pintaba el alba de la semana uno
    // sobre una partida de la semana tres. Cargar una partida de ochenta años
    // es este mismo caso con otro número.
    const fresh = clock.frame({ realMs: 9_999, tick: 3, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    expect(fresh.discontinuity).toBe(true);
    expect(fresh.presentationSeconds).toBe(3 * TIME.DAYS_PER_WEEK * SCENIC_DAY_SECONDS);
  });

  it('la fase del día da la vuelta y nunca sale de [0,1)', () => {
    for (const seconds of [0, 1, SCENIC_DAY_SECONDS - 0.001, SCENIC_DAY_SECONDS, 1_000, 86_400]) {
      const phase = dayPhase(seconds);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
    expect(dayPhase(0)).toBeCloseTo(dayPhase(SCENIC_DAY_SECONDS), 9);
  });
});


describe('G-04 · los clips del aldeano', () => {
  it('la tabla de clips es la del catálogo, no una copia que se ha ido de él', () => {
    // G-04 midió estos números sobre el GLB exportado. Aquí hay una copia
    // porque el manifiesto de recursos es de G-06; una copia que nadie
    // comprueba es una copia que se separa en silencio.
    const catalog = JSON.parse(readFileSync(
      resolve(import.meta.dirname, '..', '..', 'art', 'catalog.json'), 'utf8',
    )) as { assets: Array<{ id: string; motion: Array<{ name: string; seconds: number; loop: boolean; strideLength: number | null }> }> };
    const villager = catalog.assets.find((asset) => asset.id === 'villager');
    expect(villager).toBeDefined();

    for (const motion of villager?.motion ?? []) {
      const mine = VILLAGER_CLIPS[motion.name as keyof typeof VILLAGER_CLIPS];
      expect(mine, `falta el clip '${motion.name}'`).toBeDefined();
      expect(mine.seconds).toBeCloseTo(motion.seconds, 6);
      expect(mine.loop).toBe(motion.loop);
      expect(mine.strideLength).toBe(motion.strideLength);
    }
    expect(Object.keys(VILLAGER_CLIPS).length).toBe(villager?.motion.length);
  });
});
