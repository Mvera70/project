// «Graphics» · La resolución adaptativa (30 sep 2026). Lo que la revisión de
// rendimiento encontró roto (§4, RV-3) y lo que se guarda: un fotograma largo
// suelto no mueve la escala, se decide una vez por ventana, un aparato lento
// de verdad sigue bajando, y un tope de 60 en una pantalla de 90 Hz no se toma
// por lentitud. Y desde v5.65, que una bajada que no acorta el fotograma se
// deshace: la tablet de Vera dibujaba al 50 % sin ganar nada.

import { describe, expect, it } from 'vitest';
import { ADAPT, adaptScale, adaptWindow, dropPaid, windowFrameSeconds } from '../../src/render3d/adaptive-scale';
import { DEFAULT_GRAPHICS, resolveProfile } from '../../src/render3d/profile';
import { frameDue } from '../../src/ui/loop';

const at60 = resolveProfile(DEFAULT_GRAPHICS, true);
/** Una adaptativa con el valle ya abierto: pasado el calentamiento. */
const warm = (): ReturnType<typeof adaptWindow> => ({ ...adaptWindow(), warmed: ADAPT.warmSeconds });

/** Pasa una lista de huecos (en segundos) por la adaptativa y devuelve la escala final. */
function feed(gaps: readonly number[], scale = 1): number {
  const window = warm();
  let now = scale;
  for (const gap of gaps) now = adaptScale(window, gap, now, at60);
  return now;
}
const steady = (seconds: number, gap: number): number[] => Array.from({ length: Math.round(seconds / gap) }, () => gap);

/**
 * Un aparato: lo que tarda su fotograma a una escala. La CPU (vida, envío de
 * llamadas) no depende de la resolución; la GPU, con los píxeles, que van con
 * el cuadrado de la escala. Van en paralelo: manda el más lento.
 */
const device = (cpu: number, gpuAtFull: number) => (scale: number): number => Math.max(cpu, gpuAtFull * scale * scale);

/** Hace correr ese aparato `seconds` por la adaptativa y devuelve las escalas por las que pasó. */
function run(frame: (scale: number) => number, seconds: number, scale = 1): number[] {
  const window = warm();
  const visited = [scale];
  let now = scale;
  for (let t = 0; t < seconds;) {
    const gap = frame(now);
    t += gap;
    const next = adaptScale(window, gap, now, at60);
    if (next !== now) visited.push(next);
    now = next;
  }
  return visited;
}

describe('la resolución adaptativa', () => {
  it('un fotograma largo suelto no cambia la escala', () => {
    // Un relevo de jornada, una recolección de basura, volver de otra pestaña:
    // antes, con la media exponencial, uno solo de 100 ms la bajaba un 15 %.
    for (const hiccup of [0.1, 0.4, 1]) {
      const gaps = [...steady(1, 1 / 60), hiccup, ...steady(3, 1 / 60)];
      expect(feed(gaps), `${hiccup * 1000} ms`).toBe(1);
    }
  });

  it('los primeros segundos del valle no deciden: recién abierto, todo fotograma es lento', () => {
    const window = adaptWindow();
    let scale = 1;
    for (const gap of steady(ADAPT.warmSeconds - 0.5, 0.1)) scale = adaptScale(window, gap, scale, at60);
    expect(scale).toBe(1);
    for (const gap of steady(ADAPT.everySeconds + 1, 0.1)) scale = adaptScale(window, gap, scale, at60);
    expect(scale).toBeLessThan(1);
  });

  it('decide una vez por ventana, cambie o no: una racha lenta más corta que una ventana no la baja en el acto', () => {
    const window = warm();
    let scale = 1;
    for (const gap of steady(2.1, 1 / 60)) scale = adaptScale(window, gap, scale, at60);
    expect(window.seconds).toBeLessThan(ADAPT.everySeconds);
    // Medio segundo lento empieza una ventana nueva y no decide hasta cerrarla.
    for (const gap of steady(0.5, 0.05)) scale = adaptScale(window, gap, scale, at60);
    expect(scale).toBe(1);
  });

  it('un aparato lento por los píxeles baja a pasos, hasta el suelo del perfil', () => {
    expect(feed(steady(2.05, 0.05))).toBeCloseTo(1 - ADAPT.step);
    const gpuBound = run(device(0.005, 0.08), 60);
    expect(gpuBound.at(-1)).toBe(at60.lowestScale);
  });

  it('un aparato lento por la CPU no pierde resolución: la bajada que no paga se deshace y no se repite', () => {
    // La tablet de Vera, 2 oct 2026: «resolución 50 %» y dientes de sierra. Si
    // lo que pesa es la vida o el envío de llamadas, el fotograma tarda lo
    // mismo a cualquier escala, y antes cada ventana lenta bajaba otro 15 %.
    for (const cpu of [0.025, 0.04, 0.1]) {
      const visited = run(device(cpu, 0.004), 120);
      expect(visited.at(-1), `${cpu * 1000} ms de CPU`).toBe(1);
      // Una prueba y su vuelta, nada más: la resolución no baila cada 4 s.
      expect(visited.length, `${cpu * 1000} ms de CPU`).toBeLessThanOrEqual(3);
    }
  });

  it('con el ruido de un aparato de verdad, el que pesa por la CPU no acaba en el suelo', () => {
    // La media de una ventana de 2 s baila: medido en el navegador, un 6–10 %
    // entre ventanas con cinco fotogramas cada una. Aquí, ±10 % por ventana,
    // en doce semillas: ninguna acaba en el suelo y casi todas en 1.
    let atFull = 0;
    for (let seed = 1; seed <= 12; seed += 1) {
      let noise = seed * 7919;
      let bucket = -1;
      let factor = 1;
      let clock = 0;
      const frame = (scale: number): number => {
        const now = Math.floor(clock / ADAPT.everySeconds);
        if (now !== bucket) {
          bucket = now;
          noise = (noise * 1103515245 + 12345) % 2147483648;
          factor = 0.9 + 0.2 * (noise / 2147483648);
        }
        const gap = device(0.04, 0.004)(scale) * factor;
        clock += gap;
        return gap;
      };
      const final = run(frame, 120).at(-1)!;
      expect(final, `semilla ${seed}`).toBeGreaterThan(at60.lowestScale);
      if (final === 1) atFull += 1;
    }
    expect(atFull).toBeGreaterThanOrEqual(10);
  });

  it('a medias, baja mientras paga y se queda donde la CPU empieza a mandar', () => {
    // 30 ms de CPU y 60 ms de GPU a escala 1: hasta ~0,71 bajar acorta el
    // fotograma; por debajo, no. El último paso que todavía paga puede
    // pasarse un poco, nunca más de un paso.
    const visited = run(device(0.03, 0.06), 120);
    const final = visited.at(-1)!;
    expect(final).toBeGreaterThanOrEqual(Math.sqrt(0.03 / 0.06) - ADAPT.step);
    expect(final).toBeLessThan(1);
  });

  it('una bajada que no pagó se vuelve a probar si el fotograma empeora (otra escena)', () => {
    const window = warm();
    let scale = 1;
    const feedFor = (seconds: number, frame: (s: number) => number): void => {
      for (let t = 0; t < seconds;) { const gap = frame(scale); t += gap; scale = adaptScale(window, gap, scale, at60); }
    };
    feedFor(20, device(0.03, 0.004));
    expect(scale).toBe(1);
    expect(window.unpaidAt).not.toBeNull();
    // Ahora pesan los píxeles: una villa mayor, otra cámara.
    feedFor(20, device(0.03, 0.09));
    expect(scale).toBeLessThan(1);
  });

  it('pagar es acortar al menos la mitad de lo que acortaría si todo fueran píxeles', () => {
    // De 1 a 0,85 los píxeles bajan un 27,75 %: hace falta ganar un 13,9 %.
    expect(dropPaid(1, 0.85, 0.04, 0.034)).toBe(true);
    expect(dropPaid(1, 0.85, 0.04, 0.036)).toBe(false);
    expect(dropPaid(1, 0.85, 0.04, 0.04)).toBe(false);
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
