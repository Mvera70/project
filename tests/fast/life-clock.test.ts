// V-01 · El reloj de la vida. Anexo E.
//
// Las cuatro propiedades que el plan le exige, y una quinta que salió del
// descarte. No prueban un módulo: prueban que la capa de vida puede existir,
// porque todo lo que venga encima da por hecho que el paso es fijo y que la
// jornada se puede volver a vivir.

import { describe, expect, it } from 'vitest';
import {
  createLifeClock, LIFE_STEP, seedOfDay, stepOfPhase, STEPS_PER_DAY,
} from '../../src/render3d/life/clock';

/** Anota en qué paso se la llamó, para poder comparar dos recorridos. */
function recorder(): { at: number[]; step: (n: number) => void } {
  const at: number[] = [];
  return { at, step: (n: number): void => { at.push(n); } };
}

describe('V-01 · el reloj de la vida', () => {
  it('no pierde ni dobla un paso, se le dé el tiempo como se le dé', () => {
    // La propiedad de la que cuelga todo: dos móviles con distinta tasa de
    // refresco tienen que ver la misma aldea. Sin esto no hay forma de
    // reproducir nada, y toda la capa deja de poder probarse.
    const steady = createLifeClock();
    const jerky = createLifeClock();
    const one = recorder();
    const two = recorder();

    for (let n = 0; n < 600; n += 1) steady.advance(1 / 60, one.step);
    // Los mismos diez segundos, a sorbos desiguales como los da un móvil real.
    const gaps = [0.016, 0.033, 0.008, 0.05, 0.021, 0.004];
    let given = 0;
    let n = 0;
    while (given < 10) {
      const gap = gaps[n % gaps.length] as number;
      jerky.advance(gap, two.step);
      given += gap;
      n += 1;
    }

    expect(steady.steps, 'diez segundos son trescientos pasos').toBe(300);
    expect(jerky.steps).toBe(steady.steps);
    expect(two.at).toEqual(one.at);
  });

  it('el tiempo sólo va hacia delante', () => {
    // Un delta negativo —un reloj que se ajusta, una pestaña que vuelve— no
    // puede retroceder la vida: la deja quieta. Quien quiera volver atrás
    // reconstruye, que es otra cosa y tiene su método.
    const clock = createLifeClock();
    const seen = recorder();
    clock.advance(1, seen.step);
    const was = clock.steps;
    clock.advance(-5, seen.step);
    expect(clock.steps, 'no retrocede').toBe(was);
    clock.advance(Number.NaN, seen.step);
    expect(clock.steps, 'ni se rompe con un número que no lo es').toBe(was);
    // **Y el reloj sigue vivo después.** `Math.max(0, NaN)` es `NaN`, así que
    // la primera versión lo sumaba al acumulador y lo envenenaba: el valle se
    // quedaba parado para siempre y ninguna prueba que sólo mirase el paso
    // siguiente al fallo se habría enterado.
    clock.advance(1, seen.step);
    expect(clock.steps, 'un dato malo no congela el valle').toBe(was + 30);
  });

  it('un fotograma atragantado no se traga media jornada ni deja deuda', () => {
    // Dos mitades. Un móvil que se cuelga un segundo no puede devolver el
    // control tras simular tres minutos de valle; y lo que se deja sin simular
    // **no se arrastra**, porque una deuda que no se puede pagar crece sola y
    // deja el valle a cámara lenta para siempre.
    const clock = createLifeClock();
    const seen = recorder();
    const given = clock.advance(120, seen.step);

    expect(given, 'se para en el tope').toBe(240);
    expect(clock.steps).toBe(240);

    // Y el fotograma siguiente empieza limpio: un paso de tiempo, un paso de
    // vida, sin cobrar nada de lo anterior.
    const next = clock.advance(LIFE_STEP, seen.step);
    expect(next, 'sin deuda heredada').toBe(1);
  });

  it('volver a vivir la jornada deja el valle donde estaba', () => {
    // La cura del letargo, y la razón por la que esta capa puede ser efímera:
    // en vez de guardar dónde estaba cada cuerpo, se vuelve a vivir el día. Si
    // no se guarda nada, no se puede corromper nada.
    const lived = createLifeClock();
    const rebuilt = createLifeClock();
    const one = recorder();
    const two = recorder();

    for (let n = 0; n < 900; n += 1) lived.advance(LIFE_STEP, one.step);
    const given = rebuilt.rebuildTo(lived.steps, two.step);

    expect(given).toBe(900);
    expect(rebuilt.steps).toBe(lived.steps);
    expect(two.at).toEqual(one.at);

    // Y pedirle que reconstruya hacia atrás no hace nada: eso es una jornada
    // nueva y la decide el llamante con `reset`.
    expect(rebuilt.rebuildTo(10, two.step)).toBe(0);
    expect(rebuilt.steps).toBe(900);
  });

  it('reconstruir una jornada entera es barato', () => {
    // El número que hace viable no guardar nada. Con el paso vacío mide el
    // reloj; con cuerpos dentro, el descarte lo midió en 8 ms para ochenta.
    const clock = createLifeClock();
    let count = 0;
    const started = performance.now();
    clock.rebuildTo(STEPS_PER_DAY, () => { count += 1; });
    const spent = performance.now() - started;

    expect(count).toBe(STEPS_PER_DAY);
    expect(spent, `el reloj de una jornada cuesta ${spent.toFixed(1)} ms`).toBeLessThan(50);
  });

  it('empezar de cero es empezar de cero', () => {
    const clock = createLifeClock();
    const seen = recorder();
    clock.advance(5.5, seen.step);
    expect(clock.steps).toBeGreaterThan(0);
    clock.reset();
    expect(clock.steps).toBe(0);
    expect(clock.seconds).toBe(0);
    // Y el resto acumulado se tira con todo lo demás: si sobrevive, la jornada
    // nueva empieza con un paso de más y deja de ser reproducible.
    const after = recorder();
    clock.advance(LIFE_STEP * 0.5, after.step);
    expect(clock.steps, 'medio paso no es un paso').toBe(0);
  });

  it('la jornada siembra su propio azar, y no el del motor', () => {
    // §4.3. Dos días distintos del mismo valle dan semillas distintas, el mismo
    // día da siempre la misma, y nada de esto toca los flujos de la simulación:
    // tener la pestaña abierta más rato no desplaza una sola tirada.
    expect(seedOfDay(7, 3)).toBe(seedOfDay(7, 3));
    expect(seedOfDay(7, 3)).not.toBe(seedOfDay(7, 4));
    expect(seedOfDay(7, 3)).not.toBe(seedOfDay(11, 3));
    const spread = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((day) => seedOfDay(7, day)));
    expect(spread.size, 'ocho días dan ocho semillas').toBe(8);
  });

  it('la hora del valle se traduce a pasos de vida', () => {
    expect(stepOfPhase(0)).toBe(0);
    expect(stepOfPhase(0.5)).toBe(STEPS_PER_DAY / 2);
    expect(stepOfPhase(0.999)).toBeLessThan(STEPS_PER_DAY);
    // Y la vuelta de la jornada no se sale por arriba ni por abajo.
    expect(stepOfPhase(1)).toBe(0);
    expect(stepOfPhase(-0.25)).toBe(STEPS_PER_DAY * 0.75);
  });
});
