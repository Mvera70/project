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
  it('sin tope, o antes del primer dibujo, siempre toca', () => {
    expect(frameDue(100, null, 1000 / 60)).toBe(true);
    expect(frameDue(100, 99, 0)).toBe(true);
  });

  it('a 60 en una pantalla de 60 Hz no se pierde ninguno, aunque el fotograma llegue unas décimas antes', () => {
    // El navegador entrega los fotogramas a 16,67 ms con un poco de ruido; sin
    // margen, la mitad de ellos llegaría «pronto» y se saltarían.
    let last: number | null = null;
    let painted = 0;
    for (let i = 0; i < 120; i += 1) {
      const now = i * (1000 / 60) - (i % 2 === 0 ? 0.4 : 0);
      if (frameDue(now, last, 1000 / 60)) { painted += 1; last = now; }
    }
    expect(painted).toBe(120);
  });

  it('a 30 en una pantalla de 60 Hz se dibuja uno de cada dos, y a 60 en una de 120 igual', () => {
    const count = (hz: number, cap: number): number => {
      let last: number | null = null;
      let painted = 0;
      for (let i = 0; i < 240; i += 1) {
        const now = i * (1000 / hz);
        if (frameDue(now, last, 1000 / cap)) { painted += 1; last = now; }
      }
      return painted;
    };
    expect(count(60, 30)).toBe(120);
    expect(count(120, 60)).toBe(120);
    expect(count(60, 60)).toBe(240);
  });
});
