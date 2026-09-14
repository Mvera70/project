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

  it('el día escénico se acelera con la raíz de la velocidad, no con ella', () => {
    // Las dos puntas estaban mal y las dos se probaron. Atado a la velocidad, a
    // ×16 la gente cruzaba el valle con las piernas a dieciséis ciclos por
    // segundo. Sin atar, apretar ×16 no cambiaba nada visible y el botón
    // parecía roto: así lo describió quien lo probó.
    const advanced = (speed: 0 | 1 | 4 | 16): number => {
      const clock = createPresentationClock();
      clock.frame({ realMs: 0, tick: 0, tickFraction: 0, speed, reducedMotion: false, hidden: false });
      for (let step = 1; step <= 60; step += 1) {
        clock.frame({
          realMs: step * 16, tick: Math.floor(step * speed * 16 / 15_000),
          tickFraction: 0, speed, reducedMotion: false, hidden: false,
        });
      }
      return clock.seconds;
    };
    const base = advanced(1);
    expect(advanced(4)).toBeCloseTo(base * 2, 6);
    expect(advanced(16)).toBeCloseTo(base * 4, 6);
    expect(advanced(0)).toBe(0);
    // Y por debajo de la velocidad del juego, que es lo que evita el borrón.
    expect(advanced(16)).toBeLessThan(base * 16);
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
    const clock = createPresentationClock();
    clock.frame({ realMs: 0, tick: 1, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    const slow = clock.frame({ realMs: 400, tick: 1, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    expect(slow.deltaSeconds).toBeCloseTo(0.1, 6);
    expect(slow.discontinuity).toBe(false);
  });

  it('el tiempo escénico sólo crece, y reset lo devuelve a cero', () => {
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
    const fresh = clock.frame({ realMs: 9_999, tick: 3, tickFraction: 0, speed: 1, reducedMotion: false, hidden: false });
    expect(fresh.discontinuity).toBe(true);
    expect(fresh.presentationSeconds).toBe(0);
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
