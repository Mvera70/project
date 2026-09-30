// «Graphics» · La resolución adaptativa (30 sep 2026). Lo que la revisión de
// rendimiento encontró roto (§4, RV-3) y lo que se guarda: un fotograma largo
// suelto no mueve la escala, se decide una vez por ventana, un aparato lento
// de verdad sigue bajando, y un tope de 60 en una pantalla de 90 Hz no se toma
// por lentitud.

import { describe, expect, it } from 'vitest';
import { ADAPT, adaptScale, adaptWindow, windowFrameSeconds } from '../../src/render3d/adaptive-scale';
import { DEFAULT_GRAPHICS, resolveProfile } from '../../src/render3d/profile';
import { frameDue } from '../../src/ui/loop';

const at60 = resolveProfile(DEFAULT_GRAPHICS, true);

/** Pasa una lista de huecos (en segundos) por la adaptativa y devuelve la escala final. */
function feed(gaps: readonly number[], scale = 1): number {
  const window = adaptWindow();
  let now = scale;
  for (const gap of gaps) now = adaptScale(window, gap, now, at60);
  return now;
}
const steady = (seconds: number, gap: number): number[] => Array.from({ length: Math.round(seconds / gap) }, () => gap);

describe('la resolución adaptativa', () => {
  it('un fotograma largo suelto no cambia la escala', () => {
    // Un relevo de jornada, una recolección de basura, volver de otra pestaña:
    // antes, con la media exponencial, uno solo de 100 ms la bajaba un 15 %.
    for (const hiccup of [0.1, 0.4, 1]) {
      const gaps = [...steady(1, 1 / 60), hiccup, ...steady(3, 1 / 60)];
      expect(feed(gaps), `${hiccup * 1000} ms`).toBe(1);
    }
  });

  it('decide una vez por ventana, cambie o no: una racha lenta más corta que una ventana no la baja en el acto', () => {
    const window = adaptWindow();
    let scale = 1;
    for (const gap of steady(2.1, 1 / 60)) scale = adaptScale(window, gap, scale, at60);
    expect(window.seconds).toBeLessThan(ADAPT.everySeconds);
    // Medio segundo lento empieza una ventana nueva y no decide hasta cerrarla.
    for (const gap of steady(0.5, 0.05)) scale = adaptScale(window, gap, scale, at60);
    expect(scale).toBe(1);
  });

  it('un aparato lento de verdad baja a pasos, hasta el suelo del perfil', () => {
    expect(feed(steady(2.05, 0.05))).toBeCloseTo(1 - ADAPT.step);
    expect(feed(steady(30, 0.05))).toBe(at60.lowestScale);
  });

  it('los largos que no son sueltos cuentan: medio fotograma de cada dos lento baja la escala', () => {
    const gaps = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 1 / 60 : 0.1));
    expect(windowFrameSeconds(gaps)).toBeGreaterThan(at60.slowSeconds);
    expect(feed(gaps)).toBeLessThan(1);
  });

  it('se recupera tras seis segundos holgados, un paso', () => {
    expect(feed(steady(6.2, 1 / 60), 0.7)).toBeCloseTo(0.7 + ADAPT.step);
    expect(feed(steady(3, 1 / 60), 0.7)).toBe(0.7);
  });

  it('con un tope de 60, ninguna pantalla más rápida hunde la resolución (90 Hz incluida)', () => {
    // Las dos correcciones juntas: el tope acumula citas y la adaptativa mide
    // la media de la ventana, así que los huecos de 11 y 22 ms que alterna una
    // pantalla de 90 Hz promedian 16,7 y no son lentos.
    for (const hz of [60, 72, 75, 90, 120, 144]) {
      let dueAt: number | null = null;
      let last: number | null = null;
      const gaps: number[] = [];
      for (let i = 0; i < hz * 20; i += 1) {
        const now = i * (1000 / hz);
        const due = frameDue(now, dueAt, 1000 / 60);
        if (due === null) continue;
        dueAt = due;
        if (last !== null) gaps.push((now - last) / 1000);
        last = now;
      }
      expect(feed(gaps), `${hz} Hz`).toBe(1);
    }
  });
});
