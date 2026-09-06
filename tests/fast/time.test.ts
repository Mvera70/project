// M-01 · design.md §3.2, §4.1, §5.1. El calendario del juego: 48 semanas por
// año, cuatro estaciones de doce. Los bordes son lo que importa, porque el paso
// 2 del tick (§4.2) sólo dispara en week === 0 y la cosecha sólo en la 35.
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import type { Season } from '@engine/state';
import { SEASONS, clockOf, seasonOf, weekOf, yearOf } from '@engine/time';

const { WEEKS_PER_SEASON, WEEKS_PER_YEAR } = TIME;

describe('time · unidades', () => {
  it('el año tiene cuatro estaciones de doce semanas', () => {
    expect(WEEKS_PER_SEASON).toBe(12);
    expect(WEEKS_PER_YEAR).toBe(48);
    expect(SEASONS).toEqual(['spring', 'summer', 'autumn', 'winter']);
    expect(SEASONS.length * WEEKS_PER_SEASON).toBe(WEEKS_PER_YEAR);
  });
});

describe('time · clockOf en los bordes de estación', () => {
  // design.md §5.1: spring 0–11, summer 12–23, autumn 24–35, winter 36–47.
  const boundaries: ReadonlyArray<readonly [number, Season, number]> = [
    [0, 'spring', 0],
    [11, 'spring', 11],
    [12, 'summer', 0],
    [23, 'summer', 11],
    [24, 'autumn', 0],
    [35, 'autumn', 11], // semana de la cosecha
    [36, 'winter', 0],
    [47, 'winter', 11],
  ];

  for (const [week, season, seasonWeek] of boundaries) {
    it(`la semana ${week} es ${season} ${seasonWeek}`, () => {
      const c = clockOf(week);
      expect(c.season).toBe(season);
      expect(c.seasonWeek).toBe(seasonWeek);
      expect(c.week).toBe(week);
      expect(c.year).toBe(0);
    });
  }

  it('cada estación dura exactamente doce semanas', () => {
    const weeks = new Map<Season, number>();
    for (let w = 0; w < WEEKS_PER_YEAR; w += 1) {
      const s = seasonOf(w);
      weeks.set(s, (weeks.get(s) ?? 0) + 1);
    }
    for (const s of SEASONS) expect(weeks.get(s)).toBe(WEEKS_PER_SEASON);
  });

  it('la estación sólo cambia en los múltiplos de doce', () => {
    for (let w = 1; w < WEEKS_PER_YEAR; w += 1) {
      const changed = seasonOf(w) !== seasonOf(w - 1);
      expect(changed).toBe(w % WEEKS_PER_SEASON === 0);
    }
  });

  it('seasonWeek recorre 0..11 dentro de cada estación', () => {
    for (let w = 0; w < WEEKS_PER_YEAR; w += 1) {
      expect(clockOf(w).seasonWeek).toBe(w % WEEKS_PER_SEASON);
    }
  });

  it('la semana 35 de cualquier año es la última de otoño', () => {
    // El paso 9 del tick depende de esto (design.md §4.2).
    for (const year of [0, 1, 20, 60, 120]) {
      const c = clockOf(year * WEEKS_PER_YEAR + 35);
      expect(c.week).toBe(35);
      expect(c.season).toBe('autumn');
      expect(c.seasonWeek).toBe(11);
      expect(c.year).toBe(year);
    }
  });
});

describe('time · clockOf en los bordes de año', () => {
  it('el tick 47 cierra el año 0 y el 48 abre el año 1 en primavera', () => {
    expect(clockOf(47)).toEqual({
      tick: 47,
      week: 47,
      year: 0,
      season: 'winter',
      seasonWeek: 11,
    });
    expect(clockOf(48)).toEqual({
      tick: 48,
      week: 0,
      year: 1,
      season: 'spring',
      seasonWeek: 0,
    });
  });

  it('el año cambia exactamente en los múltiplos de 48', () => {
    for (let t = 1; t < WEEKS_PER_YEAR * 5; t += 1) {
      const changed = yearOf(t) !== yearOf(t - 1);
      expect(changed).toBe(t % WEEKS_PER_YEAR === 0);
      if (changed) expect(weekOf(t)).toBe(0);
    }
  });

  it('week === 0 marca el arranque del año, y sólo eso', () => {
    // El paso 2 del tick (ANNUAL) se dispara aquí (design.md §4.2).
    for (let t = 0; t < WEEKS_PER_YEAR * 4; t += 1) {
      expect(weekOf(t) === 0).toBe(t % WEEKS_PER_YEAR === 0);
    }
  });

  it('aguanta los siglos que simula la suite de balance', () => {
    // 200 años son 9 600 ticks; ningún desbordamiento ni deriva.
    const t = 200 * WEEKS_PER_YEAR;
    expect(clockOf(t)).toEqual({
      tick: t,
      week: 0,
      year: 200,
      season: 'spring',
      seasonWeek: 0,
    });
    const last = t - 1;
    expect(clockOf(last).year).toBe(199);
    expect(clockOf(last).week).toBe(47);
  });
});

describe('time · coherencia', () => {
  it('clockOf dice lo mismo que weekOf, yearOf y seasonOf', () => {
    for (let t = 0; t < WEEKS_PER_YEAR * 6; t += 1) {
      const c = clockOf(t);
      expect(c.tick).toBe(t);
      expect(c.week).toBe(weekOf(t));
      expect(c.year).toBe(yearOf(t));
      expect(c.season).toBe(seasonOf(t));
    }
  });

  it('tick = year · 48 + week reconstruye el tick', () => {
    for (let t = 0; t < WEEKS_PER_YEAR * 6; t += 1) {
      const c = clockOf(t);
      expect(c.year * WEEKS_PER_YEAR + c.week).toBe(t);
    }
  });

  it('week y seasonWeek nunca se salen de rango', () => {
    for (let t = 0; t < WEEKS_PER_YEAR * 10; t += 1) {
      const c = clockOf(t);
      expect(c.week).toBeGreaterThanOrEqual(0);
      expect(c.week).toBeLessThan(WEEKS_PER_YEAR);
      expect(c.seasonWeek).toBeGreaterThanOrEqual(0);
      expect(c.seasonWeek).toBeLessThan(WEEKS_PER_SEASON);
      expect(SEASONS).toContain(c.season);
    }
  });

  it('es pura: el mismo tick da siempre el mismo reloj', () => {
    expect(clockOf(1234)).toEqual(clockOf(1234));
  });

  it('una generación son 20 años, 960 ticks', () => {
    // design.md §4.1.
    expect(clockOf(960).year).toBe(20);
    expect(clockOf(960).week).toBe(0);
  });
});
