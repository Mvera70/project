// U-10 · El menú de inicio: lo que se puede probar sin pantalla.
import { describe, expect, it } from 'vitest';
import { parseSeed } from '../../src/ui/screens/title';

describe('el número del valle · U-10', () => {
  it('acepta un entero de 32 bits escrito a mano, con espacios alrededor', () => {
    expect(parseSeed('7', 1)).toBe(7);
    expect(parseSeed('  4294967295 ', 1)).toBe(4294967295);
    expect(parseSeed('0', 1)).toBe(0);
  });

  it('y con cualquier otra cosa se queda con el que había', () => {
    // Un menú que fundara un valle distinto del que el jugador cree haber
    // escrito rompería lo único que configura: poder comparar valles.
    for (const text of ['', ' ', '-7', '7.5', '1e3', 'siete', '4294967296', '12345678901', '7 7']) {
      expect(parseSeed(text, 42), JSON.stringify(text)).toBe(42);
    }
  });
});
