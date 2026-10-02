// Lo lento de `tests/fast/graphics-budget.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 9 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// G-09 · design.md D.9 — presupuesto antes de ampliar.
//
// El banco de verdad corre en un navegador y no cabe aquí. Lo que sí cabe, y es
// lo que D.9 pide bajo «ciclo de recursos», es que montar y desmontar la escena
// una y otra vez no deje nada detrás. Una fuga no se ve en un fotograma: se ve
// en la sesión sostenida, y para entonces ya está pagada.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { buildGround } from '../../src/render3d/world/ground';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { PALETTES } from '@derive/palette';
import { buildForest } from '../../src/render3d/world/forest';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

describe('G-10 · el bosque', () => {
  /** Un arbolito de mentira: tres mallas, como el de verdad. */
  function sapling(): Group {
    const tree = new Group();
    for (let piece = 0; piece < 3; piece += 1) {
      const mesh = new Mesh(new BoxGeometry(1, 2, 1), new MeshStandardMaterial());
      mesh.position.set(0, 1 + piece, 0);
      tree.add(mesh);
    }
    return tree;
  }

  it('cuesta una malla por material, no una por árbol', () => {
    // D.9 nombra este caso: instanciar árboles. Un objeto suelto por celda de
    // bosque serían varios cientos de llamadas de dibujo en un valle maduro.
    const state = village(16);
    const forest = buildForest(state, sapling());
    expect(forest.count).toBeGreaterThan(200);
    expect(forest.group.children.length).toBe(3);
    for (const child of forest.group.children) {
      expect((child as { isInstancedMesh?: boolean }).isInstancedMesh).toBe(true);
    }
    forest.dispose();
    expect(forest.group.children.length).toBe(0);
  });
});

describe('G-09 · el ciclo de recursos', () => {
  it('el suelo se suelta entero, y soltarlo dos veces no rompe', () => {
    const state = village(8);
    for (let round = 0; round < 20; round += 1) {
      const ground = buildGround(state.map, PALETTES.summer);
      ground.dispose();
      ground.dispose();
    }
  });
});
