// El contenido de los accesos de taller exige jugar años enteros: jornada,
// no prueba rápida de la portada.
import { describe, expect, it } from 'vitest';
import { DEV_PRESETS } from '../../src/ui/screens/title';
import { foundGame } from '@engine/found';
import { openAtYear } from '../../src/ui/debug';
import { eraOf } from '@derive/era';
import { yearOf } from '@engine/time';

describe('partidas preparadas del menú Dev', () => {
  it('abren partidas vivas y reales de la era anunciada', () => {
    for (const preset of DEV_PRESETS) {
      const state = foundGame(preset.seed);
      openAtYear(state, preset.year);
      expect(state.ended, preset.id).toBeNull();
      expect(yearOf(state.tick) + 1, preset.id).toBe(preset.year);
      expect(eraOf(state), preset.id).toBe(preset.id);
    }
  });
});
