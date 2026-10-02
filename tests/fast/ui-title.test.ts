// Lo lento de este fichero vive en `tests/journeys/ui-title-long.test.ts` (v5.56).
//
// U-10 · El menú de inicio: lo que se puede probar sin pantalla.
import { describe, expect, it } from 'vitest';
import { parseSeed, parseYear } from '../../src/ui/screens/title';
import { openAtYear } from '../../src/ui/debug';
import { foundGame } from '@engine/found';

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

describe('el año de taller · U-10b', () => {
  it('acepta el año que la cabecera lee, y vacío es fundar y mirar', () => {
    expect(parseYear('1')).toBe(1);
    expect(parseYear('21')).toBe(21);
    expect(parseYear(' 120 ')).toBe(120);
    expect(parseYear('')).toBe(1);
  });

  it('y con cualquier otra cosa se queda en el año 1, en vez de congelar la pantalla', () => {
    // El cero no existe: el valle recién fundado ya está en el año 1. Y de
    // «veinte» no se puede adivinar un año, así que se funda y se mira.
    for (const text of [' ', '0', '-5', '7.5', '1e3', 'veinte', '2 0']) {
      expect(parseYear(text), JSON.stringify(text)).toBe(1);
    }
  });

  it('un año por encima del techo se recorta al techo, y no se ignora en silencio', () => {
    // **El fallo que el dueño encontró a los diez minutos.** El campo traía un
    // «1» puesto, escribió 50 detrás, quedó «150», y el menú abría el año 1
    // con la pareja fundadora: hacía lo contrario de lo que le pedía, callado.
    // Ahora el campo va vacío y se selecciona al tocarlo —eso es lo que
    // impide que vuelva a pasar— y, si aun así se cuela un número grande, se
    // recorta: pedir mucho da mucho, nunca nada.
    expect(parseYear('150')).toBe(120);
    expect(parseYear('9999')).toBe(120);
    expect(parseYear('121')).toBe(120);
    expect(parseYear('120')).toBe(120);
  });

  it('el año 1 no mueve el valle: el juego de siempre', () => {
    for (const year of [0, 1]) {
      const state = foundGame(7);
      openAtYear(state, year);
      expect(state.tick, `año ${year}`).toBe(0);
    }
  });
});
