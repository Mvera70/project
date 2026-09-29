// GV-3 · El experimento de suavizado sólo se enciende si se pide por la
// dirección: sin `?aa=`, el renderer usa el del perfil y nada cambia.

import { describe, expect, it } from 'vitest';
import { aaTrialOf } from '../../src/render3d/effects/screen-aa';

describe('GV-3 · el suavizado del experimento', () => {
  it('sin pedirlo no hay experimento, y lo que no se conoce tampoco', () => {
    expect(aaTrialOf({ search: '' })).toBeNull();
    expect(aaTrialOf({ search: '?seed=7' })).toBeNull();
    expect(aaTrialOf({ search: '?aa=smaa' })).toBeNull();
  });

  it('los tres brazos se piden por su nombre', () => {
    expect(aaTrialOf({ search: '?aa=none' })).toBe('none');
    expect(aaTrialOf({ search: '?debug=1&aa=msaa' })).toBe('msaa');
    expect(aaTrialOf({ search: '?aa=fxaa' })).toBe('fxaa');
  });
});
