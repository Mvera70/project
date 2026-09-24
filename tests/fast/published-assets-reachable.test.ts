import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WANTED } from '../../src/render3d/renderer';

const ROOT = resolve(import.meta.dirname, '..', '..');
// Piezas de calibración y estudios de esquina: no representan objetos del juego.
const STUDIES = new Set(['axis-marker', 'village-corner-a', 'village-corner-b']);

describe('inventario de GLB publicados', () => {
  it('solicita en la partida cada recurso jugable publicado', () => {
    const manifest = JSON.parse(readFileSync(resolve(ROOT, 'public/assets/valley3d/manifest.json'), 'utf8')) as {
      assets: Array<{ id: string }>;
    };
    const ids = manifest.assets.map(asset => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      if (STUDIES.has(id)) continue;
      expect(WANTED, `El GLB publicado ${id} no se carga en la partida`).toContain(id);
    }
    expect(ids.filter(id => STUDIES.has(id)).sort()).toEqual([...STUDIES].sort());
  });
});
