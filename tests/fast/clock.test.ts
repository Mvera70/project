// U-12 · El reloj que lee el jugador. design.md §11.2, §12.1, D.6.1.
//
// Lo que se vigila aquí es **una identidad y una coherencia**, no un formato:
// que la semana del motor y la jornada de sol duren lo mismo medidas en días, y
// que la hora que dice la cabecera sea la misma que se ve por la ventana. Las
// dos se pueden romper sin que falle nada más, y romperlas devuelve el juego a
// la incoherencia que v3.72 cerró: ocho semanas por amanecer.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { clockOf, seasonOf } from '@engine/time';
import { DAYS_PER_SEASON, scenicSecondsAt, valleyClock } from '../../src/derive/clock';
import { dayPhase, SCENIC_DAY_SECONDS } from '../../src/render3d/presentation-clock';
import { DAWN, DUSK, hourAt, NIGHT, NOON } from '../../src/render3d/effects/day-phases';

describe('el reloj del valle · U-12', () => {
  it('una semana del motor son siete jornadas de sol, exactamente', () => {
    // La identidad de §12.1, que es de donde sale `REAL_MS_PER_TICK`. Cambiar
    // la jornada de sol o los días de la semana sin cambiar el tick con ellos
    // deja el calendario corriendo por delante del sol otra vez.
    expect(TIME.REAL_MS_PER_TICK).toBe(TIME.DAYS_PER_WEEK * SCENIC_DAY_SECONDS * 1000);
    expect(TIME.DAYS_PER_WEEK).toBe(7);
  });

  it('la partida abre a media mañana, la misma que ve el sol', () => {
    // §11.2 y v3.34: abrir el valle a oscuras es la peor primera impresión de
    // un sitio que se vende por estar vivo. La hora tiene que decir lo mismo.
    const open = valleyClock(0, 0);
    expect(open.sunPhase).toBeCloseTo(TIME.DAY_START_PHASE, 9);
    // Las ocho de la mañana: la fase de apertura (0,28) cae entre la mañana
    // (0,18) y el mediodía (0,45), y eso es lo que el cielo enseña.
    expect(hourAt(open.sunPhase)).toBe(8);
    // El año del motor, contando desde cero: el uno lo suma el banco.
    expect(open.year).toBe(0);
    expect(open.season).toBe('spring');
    expect(open.dayOfSeason).toBe(1);
    expect(open.dayOfWeek).toBe(0);
  });

  it('la hora de la cabecera es la del sol que se ve, en toda la semana', () => {
    // La coherencia entera, en un aserto: el sol se pinta con `dayPhase` sobre
    // los segundos escénicos, y la cabecera con `valleyClock` sobre la fracción
    // de tick. Si las dos cuentas se separan, el jugador ve mediodía con el
    // reloj en la madrugada.
    for (let step = 0; step <= 200; step += 1) {
      const fraction = step / 200;
      const sun = dayPhase(scenicSecondsAt(3, fraction, SCENIC_DAY_SECONDS));
      expect(valleyClock(3, fraction).sunPhase, `fracción ${fraction}`).toBeCloseTo(sun, 6);
    }
  });

  it('la semana tiene siete días y ni uno más, y todas las horas son horas', () => {
    const days = new Set<number>();
    let wraps = 0;
    let previous = valleyClock(0, 0);
    for (let step = 1; step <= 7000; step += 1) {
      const now = valleyClock(0, step / 7000);
      expect(now.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(now.dayOfWeek).toBeLessThan(TIME.DAYS_PER_WEEK);
      const hour = hourAt(now.sunPhase);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThan(24);
      expect(Number.isInteger(hour)).toBe(true);
      days.add(now.dayOfWeek);
      if (now.dayOfWeek !== previous.dayOfWeek) wraps += 1;
      previous = now;
    }
    expect([...days].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(wraps).toBe(TIME.DAYS_PER_WEEK - 1);
  });

  it('el día de la estación va de uno a ochenta y cuatro, y la estación la manda el motor', () => {
    const seen = new Set<number>();
    for (let week = 0; week < TIME.WEEKS_PER_SEASON; week += 1) {
      for (let step = 0; step < TIME.DAYS_PER_WEEK; step += 1) {
        const fraction = (step + 0.5) / TIME.DAYS_PER_WEEK;
        const now = valleyClock(week, fraction);
        expect(now.season).toBe(seasonOf(week));
        expect(now.dayOfSeason).toBe(week * TIME.DAYS_PER_WEEK + step + 1);
        seen.add(now.dayOfSeason);
      }
    }
    expect(seen.size).toBe(DAYS_PER_SEASON);
    expect(Math.max(...seen)).toBe(DAYS_PER_SEASON);
    expect(Math.min(...seen)).toBe(1);
  });

  it('el año y la estación son los de la crónica, no otros', () => {
    // La cabecera y las cabeceras de año de la crónica (`screens/chronicle.ts`)
    // tienen que decir el mismo año: es el mismo valle. El reloj entrega el
    // año del motor y el uno lo pone el banco al presentar, que es la
    // convención de `ABSOLUTE_YEARS`; pasarlo ya sumado da «Year 2» en el
    // primer amanecer, y así se vio en una captura.
    for (const tick of [0, 1, 47, 48, 49, 500, 4_800]) {
      const now = valleyClock(tick, 0.5);
      expect(now.year).toBe(clockOf(tick).year);
      expect(now.season).toBe(clockOf(tick).season);
    }
  });

  it('una fracción imposible no rompe el reloj', () => {
    // El bucle entrega 1 justo antes de avanzar el tick, y un `NaN` es lo que
    // deja una resta de tiempos en el primer fotograma.
    for (const fraction of [1, 1.5, -0.2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const now = valleyClock(10, fraction);
      expect(now.dayOfWeek, `fracción ${fraction}`).toBeGreaterThanOrEqual(0);
      expect(now.dayOfWeek).toBeLessThan(TIME.DAYS_PER_WEEK);
      expect(hourAt(now.sunPhase)).toBeGreaterThanOrEqual(0);
      expect(hourAt(now.sunPhase)).toBeLessThan(24);
    }
  });

  it('la hora es la que el cielo enseña, no una regla de tres', () => {
    // El fallo que se vio en la primera captura de U-12: el reloj marcaba la
    // 01:00 sobre un valle a pleno sol, porque la hora salía de multiplicar la
    // fase por veinticuatro y la jornada **comprime la noche**. Los cuatro
    // momentos que pinta `daylight.ts` son los que mandan.
    expect(hourAt(DAWN)).toBe(5);
    expect(hourAt(NOON)).toBe(12);
    expect(hourAt(DUSK)).toBe(19);
    expect(hourAt(NIGHT)).toBe(22);
    expect(hourAt(0)).toBe(0);
  });

  it('la hora sólo sube, y pasa por las veinticuatro', () => {
    const hours = new Set<number>();
    let previous = -1;
    for (let step = 0; step < 4000; step += 1) {
      const hour = hourAt(step / 4000);
      expect(hour, `fase ${step / 4000}`).toBeGreaterThanOrEqual(previous);
      previous = hour;
      hours.add(hour);
    }
    expect(hours.size).toBe(24);
  });
});
