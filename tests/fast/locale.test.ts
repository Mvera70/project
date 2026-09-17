import { afterEach, describe, expect, it } from 'vitest';
import { locale, renderUiText, setLocale } from '../../src/engine/chronicle/render';

afterEach(() => setLocale('en'));

describe('idioma de presentación', () => {
  it('mantiene inglés por defecto y cambia las etiquetas de la interfaz', () => {
    expect(locale()).toBe('en');
    expect(renderUiText('title.new')).toBe('Found a new valley');
    setLocale('es');
    expect(renderUiText('title.new')).toBe('Fundar un valle nuevo');
    expect(renderUiText('app.clock.date', { year: 4, season: 'Primavera', day: 2 }))
      .toBe('Año 5 · Primavera, día 2');
  });

  it('conserva el respaldo inglés para una clave aún no traducida', () => {
    setLocale('es');
    expect(renderUiText('title.seed')).toBe('Número del valle');
    expect(renderUiText('chronicle.source')).toBe('Crónica del valle');
    expect(renderUiText('missing.key')).toBe('[missing.key]');
  });
});
