// U-13 · El cielo de cada jornada. design.md §10.7, §12.3.
//
// Lo que se vigila: que el cielo **no toque la simulación** —ni una tirada, ni
// un tick— y que lo que se ve tenga sentido con el año y la estación. Lo
// segundo se mide con muchas jornadas y no con una: un cielo es un sorteo, y
// una muestra es ruido (CLAUDE.md).

import { describe, expect, it } from 'vitest';
import { SKY, TIME } from '@engine/balance';
import { foundGame } from '@engine/found';
import { seasonOf } from '@engine/time';
import { boltPlace, boltsInDay, overcastOf, skyAt } from '../../src/derive/weather';

/** Un año entero de jornadas, empezando en la estación que se pida. */
function daysOfYear(from = 0): number[] {
  const out: number[] = [];
  const total = TIME.WEEKS_PER_YEAR * TIME.DAYS_PER_WEEK;
  for (let day = from; day < from + total; day += 1) out.push(day);
  return out;
}

describe('el cielo · U-13', () => {
  it('no consume azar del motor ni mueve el tick', () => {
    // El innegociable de CLAUDE.md: una tirada en el render desplazaría la
    // simulación, y entonces añadir nubes cambiaría quién nace.
    const state = foundGame(7);
    const before = JSON.stringify(state.rng);
    const tick = state.tick;
    for (const day of daysOfYear()) {
      skyAt(state, day);
      boltsInDay(state, day);
      boltPlace(state, day, 0);
    }
    expect(JSON.stringify(state.rng)).toBe(before);
    expect(state.tick).toBe(tick);
  });

  it('la misma jornada da siempre el mismo cielo', () => {
    const state = foundGame(7);
    for (const day of [0, 1, 83, 200, 5_000]) {
      expect(skyAt(state, day)).toEqual(skyAt(state, day));
      expect(boltsInDay(state, day)).toEqual(boltsInDay(state, day));
      expect(boltPlace(state, day, 2)).toEqual(boltPlace(state, day, 2));
    }
  });

  it('dos valles no tienen el mismo verano', () => {
    // La esencia del juego según su dueño: que se puedan comparar. Dos valles
    // del mismo año no pueden llover los mismos días.
    const a = foundGame(7);
    const b = foundGame(11);
    const same = daysOfYear().filter((day) => skyAt(a, day).kind === skyAt(b, day).kind).length;
    const total = daysOfYear().length;
    expect(same).toBeGreaterThan(total * 0.5); // casi todo es «claro» en los dos
    expect(same).toBeLessThan(total); // pero no todo
  });

  it('nieva sólo en invierno, y en invierno no truena', () => {
    for (const seed of [3, 7, 11, 23]) {
      const state = foundGame(seed);
      for (const day of daysOfYear()) {
        const winter = seasonOf(Math.floor(day / TIME.DAYS_PER_WEEK)) === 'winter';
        const kind = skyAt(state, day).kind;
        if (kind === 'snow') expect(winter, `jornada ${day}`).toBe(true);
        if (kind === 'storm') expect(winter, `jornada ${day}`).toBe(false);
      }
    }
  });

  it('un año ruinoso llueve más que uno abundante, y ninguno llueve siempre', () => {
    // Medido con `tools/sky-report.ts` en seis semillas y sesenta años: del
    // 33,9 % de jornadas cerradas en la fila ruinosa al 9,2 % en la abundante.
    const state = foundGame(7);
    const wetShare = (index: number): number => {
      state.weather = { year: 0, index, factor: 1 };
      const days = daysOfYear();
      return days.filter((day) => skyAt(state, day).kind !== 'clear').length / days.length;
    };
    const ruinous = wetShare(0);
    const abundant = wetShare(4);
    expect(ruinous).toBeGreaterThan(abundant * 2);
    expect(ruinous).toBeLessThan(0.5);
    expect(abundant).toBeGreaterThan(0.02);
  });

  it('cuando el cielo se cierra, se ve: nada de chispeos invisibles', () => {
    const state = foundGame(7);
    for (const day of daysOfYear()) {
      const sky = skyAt(state, day);
      if (sky.kind === 'clear') {
        expect(sky.intensity).toBe(0);
        expect(overcastOf(sky)).toBe(0);
        continue;
      }
      expect(sky.intensity).toBeGreaterThanOrEqual(SKY.MIN_INTENSITY);
      expect(sky.intensity).toBeLessThanOrEqual(1);
      // Y ni la peor tormenta apaga el día: eso discutiría con el reloj de §11.2.
      expect(overcastOf(sky)).toBeGreaterThan(0);
      expect(overcastOf(sky)).toBeLessThanOrEqual(SKY.DIM_STORM);
    }
  });

  it('los rayos caen sólo en tormenta, repartidos por la jornada y dentro del mapa', () => {
    const state = foundGame(7);
    let storms = 0;
    for (const day of daysOfYear()) {
      const bolts = boltsInDay(state, day);
      if (skyAt(state, day).kind !== 'storm') {
        expect(bolts, `jornada ${day}`).toEqual([]);
        continue;
      }
      storms += 1;
      expect(bolts.length).toBeGreaterThanOrEqual(SKY.BOLTS_MIN);
      expect(bolts.length).toBeLessThanOrEqual(SKY.BOLTS_MAX);
      let previous = -1;
      for (const [index, phase] of bolts.entries()) {
        expect(phase).toBeGreaterThanOrEqual(0);
        expect(phase).toBeLessThan(1);
        expect(phase, 'y en orden, no dos a la vez').toBeGreaterThan(previous);
        previous = phase;
        const where = boltPlace(state, day, index);
        expect(where.x).toBeGreaterThanOrEqual(0);
        expect(where.x).toBeLessThan(state.map.width);
        expect(where.z).toBeGreaterThanOrEqual(0);
        expect(where.z).toBeLessThan(state.map.height);
      }
    }
    // Y hay tormentas que mirar: una cada tres semanas, más o menos.
    expect(storms).toBeGreaterThan(5);
    expect(storms).toBeLessThan(40);
  });
});

describe('la lluvia y el rayo, como mallas · U-13', () => {
  it('son tres mallas y ni una más, y con cielo claro no se dibuja ninguna', async () => {
    // D.9 cuenta llamadas de dibujo, no partículas: la lluvia, la nieve y el
    // rayo son una malla cada una y se reutilizan. Con cielo claro están
    // invisibles, así que una partida sin nubes no paga nada por esto.
    const { Scene } = await import('three');
    const { createWeather } = await import('../../src/render3d/effects/weather');
    const scene = new Scene();
    const weather = createWeather(scene);
    expect(scene.children.length).toBe(3);
    expect(scene.children.every((child) => !child.visible)).toBe(true);

    weather.set('rain', 0.8);
    expect(scene.children.filter((child) => child.visible).length).toBe(1);
    weather.step(0.1, { x: 36, z: 56 }, 0.016);
    weather.set('snow', 0.5);
    expect(scene.children.filter((child) => child.visible).length).toBe(1);

    // Un rayo se enciende y se apaga con el reloj real, no con el escénico: un
    // destello es un destello a cualquier velocidad.
    weather.strike(36, 56, 0);
    expect(scene.children.filter((child) => child.visible).length).toBe(2);
    weather.step(0, { x: 36, z: 56 }, 1);
    expect(scene.children.filter((child) => child.visible).length).toBe(1);

    weather.clear();
    expect(scene.children.every((child) => !child.visible)).toBe(true);
    weather.dispose();
    expect(scene.children.length).toBe(0);
  });
});
