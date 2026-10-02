// «Graphics» (29 sep 2026): lo que el jugador elige y lo que el renderer
// hace con ello, sin pantalla. Propiedades del diseño, no de la implementación.
import { describe, expect, it } from 'vitest';
import { DEFAULT_GRAPHICS, resolveProfile, sanitiseGraphics } from '../../src/render3d/profile';
import { frameDue } from '../../src/ui/loop';

describe('el perfil de render', () => {
  it('«auto» es lo que el renderer hacía solo: medio en táctil, alto en ordenador', () => {
    // Quien no toque las opciones tiene que ver exactamente el juego de ayer:
    // 1,5 de densidad y sombras de 1024 en la tablet, 2 y 2048 en el portátil.
    const handheld = resolveProfile(DEFAULT_GRAPHICS, true);
    const desk = resolveProfile(DEFAULT_GRAPHICS, false);
    expect(handheld.level).toBe('medium');
    expect(handheld.pixelRatioCap).toBe(1.5);
    expect(handheld.shadowMapSize).toBe(1024);
    expect(handheld.antialias).toBe(false);
    expect(desk.level).toBe('high');
    expect(desk.pixelRatioCap).toBe(2);
    expect(desk.shadowMapSize).toBe(2048);
    expect(desk.antialias).toBe(true);
  });

  it('cada nivel pide menos que el anterior, y «bajo» apaga las sombras', () => {
    const high = resolveProfile({ quality: 'high', frameRate: 60 }, true);
    const medium = resolveProfile({ quality: 'medium', frameRate: 60 }, true);
    const low = resolveProfile({ quality: 'low', frameRate: 60 }, true);
    expect(high.pixelRatioCap).toBeGreaterThan(medium.pixelRatioCap);
    expect(medium.pixelRatioCap).toBeGreaterThan(low.pixelRatioCap);
    expect(high.shadowMapSize).toBeGreaterThan(medium.shadowMapSize);
    expect(low.shadows).toBe(false);
    expect(low.lowestScale).toBeLessThan(medium.lowestScale);
    // Una elección explícita no depende del aparato.
    expect(resolveProfile({ quality: 'low', frameRate: 60 }, false)).toEqual(low);
  });

  it('en Alto y Medio la adaptativa no baja de un píxel dibujado por píxel CSS', () => {
    // Vera, 2 oct 2026, Medium en su tablet: «se ve muy mal y con dientes de
    // sierra todo», con la resolución al 50 %: 0,75 píxeles por píxel CSS.
    for (const quality of ['high', 'medium'] as const) {
      const profile = resolveProfile({ quality, frameRate: 60 }, true);
      expect(profile.pixelRatioCap * profile.lowestScale, quality).toBeGreaterThanOrEqual(1 - 1e-9);
    }
  });

  it('los umbrales de la adaptativa salen del objetivo, y a 60 caben en una pantalla de 60 Hz', () => {
    const at60 = resolveProfile(DEFAULT_GRAPHICS, false);
    const at30 = resolveProfile({ ...DEFAULT_GRAPHICS, frameRate: 30 }, false);
    // Un fotograma de 16,7 ms tiene que contar como holgado a 60, o la
    // resolución bajada no se recuperaría nunca en una pantalla de 60 Hz.
    expect(at60.easySeconds).toBeGreaterThan(1 / 60);
    expect(at60.slowSeconds).toBeGreaterThan(at60.easySeconds);
    expect(at30.slowSeconds).toBeGreaterThan(at60.slowSeconds);
    expect(at30.slowSeconds).toBeGreaterThan(1 / 30);
  });

  it('un ajuste guardado que no vale vuelve a lo de fábrica, campo a campo', () => {
    expect(sanitiseGraphics(null)).toEqual(DEFAULT_GRAPHICS);
    expect(sanitiseGraphics({ quality: 'ultra', frameRate: 144 })).toEqual(DEFAULT_GRAPHICS);
    expect(sanitiseGraphics({ quality: 'low', frameRate: 'sixty' })).toEqual({ quality: 'low', frameRate: 60 });
    expect(sanitiseGraphics({ quality: 'medium', frameRate: 30 })).toEqual({ quality: 'medium', frameRate: 30 });
  });
});

describe('el tope de fotogramas del bucle', () => {
  /** Cuántos fotogramas se dibujan en `seconds` con rAF a `hz` y un tope de `cap`, y sus huecos. */
  function paints(hz: number, cap: number, seconds = 4, jitter: (frame: number) => number = () => 0): { count: number; gaps: number[] } {
    let dueAt: number | null = null;
    let last: number | null = null;
    const gaps: number[] = [];
    let count = 0;
    for (let i = 0; i < hz * seconds; i += 1) {
      const now = i * (1000 / hz) + jitter(i);
      const due = frameDue(now, dueAt, cap > 0 ? 1000 / cap : 0);
      if (due === null) continue;
      dueAt = due;
      if (last !== null) gaps.push(now - last);
      last = now;
      count += 1;
    }
    return { count, gaps };
  }

  it('sin tope, o antes del primer dibujo, siempre toca', () => {
    expect(frameDue(100, null, 1000 / 60)).not.toBeNull();
    expect(frameDue(100, 99, 0)).not.toBeNull();
    expect(paints(90, 0).count).toBe(360);
  });

  it('a 60 en una pantalla de 60 Hz no se pierde ninguno, aunque el fotograma llegue unas décimas antes', () => {
    // El navegador entrega los fotogramas a 16,67 ms con un poco de ruido; sin
    // margen, la mitad de ellos llegaría «pronto» y se saltarían.
    expect(paints(60, 60, 2, (i) => (i % 2 === 0 ? -0.4 : 0)).count).toBe(120);
  });

  it('a 30 en una pantalla de 60 Hz se dibuja uno de cada dos, y a 60 en una de 120 igual', () => {
    expect(paints(60, 30).count).toBe(120);
    expect(paints(120, 60).count).toBe(240);
    expect(paints(60, 60).count).toBe(240);
  });

  it('con un tope de 60 se dibujan 60 por segundo en cualquier pantalla más rápida, también a 90 Hz', () => {
    // La revisión del 30 sep: contando desde el último dibujo, 90 Hz pintaba a
    // 45 y 144 a 72, y 72–75 Hz no topaba. Con las citas acumuladas, la media
    // es la del tope: en cuatro segundos, 240 fotogramas, uno arriba o abajo.
    for (const hz of [72, 75, 90, 120, 144]) {
      const { count, gaps } = paints(hz, 60);
      expect(Math.abs(count - 240), `${hz} Hz`).toBeLessThanOrEqual(1);
      const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      expect(mean, `${hz} Hz`).toBeCloseTo(1000 / 60, 0);
    }
  });

  it('tras un tirón no dibuja en ráfaga para recuperar lo perdido', () => {
    const dueAt = frameDue(0, null, 1000 / 60)!;
    // Medio segundo sin fotogramas: la cita siguiente sale de ahora, no de la vieja.
    expect(frameDue(500, dueAt, 1000 / 60)).toBeCloseTo(500 + 1000 / 60);
  });
});
