// v5.74 · Los usos del cinturón: el bosque de ladera.
//
// Con el valle de forma natural delante (v5.73), Vera eligió que lo que era
// cinturón muerto alrededor del contorno tuviera uso —pasto, bosque de ladera y
// cantera— y que fuera vida, sin tocar el balance. Lo que se guarda aquí son
// esas propiedades por el camino que el juego usa: `buildForest` con el bosque
// de ladera (lo que pinta `rebuildForest`) y `solidTerrain` (el terreno de la
// capa de vida que monta el renderer). El pasto tiene su prueba en
// `life-falda.test.ts`, y la cantera la suya con el albañil, en
// `life-resources.test.ts`.
//
// Medido al escribirlo, en doce valles: de 172 a 387 pinos y de 93 a 123
// árboles de hoja; de 94 a 132 de ellos, en suelo de andar.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Matrix4, Vector3, type InstancedMesh, type Object3D } from 'three';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { buildForest, builtCells } from '../../src/render3d/world/forest';
import { solidTerrain } from '../../src/render3d/world/obstacles';
import { fitsCircle } from '../../src/render3d/life/body';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SEEDS = [3, 7, 11, 19, 23, 31];

async function model(file: string): Promise<Object3D> {
  const bytes = readFileSync(resolve(ROOT, 'public/assets/valley3d', file));
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return (await new GLTFLoader().parseAsync(data, '')).scene;
}

/** Dónde está cada árbol del bosque de ladera que el juego pinta. */
function slopeTrees(state: GameState, tree: Object3D, pine: Object3D): { x: number; z: number }[] {
  const forest = buildForest(state, tree, undefined, new Set(), pine, true);
  const trees: { x: number; z: number }[] = [];
  forest.group.traverse((object) => {
    if (object.name !== 'Valley_SlopeWood') return;
    // Un árbol son varias piezas instanciadas con las mismas matrices: basta la primera.
    let first: InstancedMesh | null = null;
    object.traverse((piece) => { if (first === null && (piece as InstancedMesh).isInstancedMesh) first = piece as InstancedMesh; });
    if (first === null) return;
    const mesh = first as InstancedMesh;
    const instance = new Matrix4();
    const at = new Vector3();
    for (let slot = 0; slot < mesh.count; slot += 1) {
      mesh.getMatrixAt(slot, instance);
      at.setFromMatrixPosition(instance);
      trees.push({ x: at.x, z: at.z });
    }
  });
  forest.dispose();
  return trees;
}

describe('v5.74 · el bosque de ladera', () => {
  it('crece fuera del valle, en el cinturón, y nunca sobre lo construido ni sobre una senda', async () => {
    const tree = await model('tree.glb');
    const pine = await model('tree-pine.glb');
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      const trees = slopeTrees(state, tree, pine);
      // Medido en doce valles: de 285 a 509. Un cinturón con uso, no cuatro pinos sueltos.
      expect(trees.length, `semilla ${seed}`).toBeGreaterThan(200);
      const built = builtCells(state);
      for (const { x, z } of trees) {
        const cell = Math.floor(z) * state.map.width + Math.floor(x);
        expect(state.map.heart[cell], `semilla ${seed}: un árbol de ladera dentro del valle`).toBe(0);
        expect(built.has(cell), `semilla ${seed}: un árbol de ladera sobre una obra`).toBe(false);
        expect(state.map.path[cell] ?? 0, `semilla ${seed}: un árbol de ladera sobre una senda`).toBe(0);
      }
      // Y sólo es el juego quien lo planta: sin él, el bosque es el de siempre.
      const plain = buildForest(state, tree, undefined, new Set(), pine);
      let named = 0;
      plain.group.traverse((object) => { if (object.name === 'Valley_SlopeWood') named += 1; });
      plain.dispose();
      expect(named).toBe(0);
    }
  });

  it('cada árbol que se ve en suelo de andar es un tronco para la capa de vida', async () => {
    // Sin esto, la gente, el oso y el rebaño de la falda cruzaban los robles
    // del prado por en medio: el árbol es del render y el terreno de la vida
    // sólo sabía de la montaña.
    const tree = await model('tree.glb');
    const pine = await model('tree-pine.glb');
    const source = (id: string): Object3D | undefined => id === 'tree' ? tree.clone() : id === 'tree-pine' ? pine.clone() : undefined;
    let walkable = 0;
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      const land = solidTerrain(state, source);
      for (const { x, z } of slopeTrees(state, tree, pine)) {
        const cell = Math.floor(z) * land.width + Math.floor(x);
        if (land.blocked[cell] === 1) continue;
        walkable += 1;
        expect(fitsCircle(land, x, z, 0.1), `semilla ${seed}: se puede estar dentro del tronco en ${x.toFixed(2)},${z.toFixed(2)}`).toBe(false);
      }
    }
    // Que la prueba mire de verdad: hay árboles de ladera en el prado.
    expect(walkable).toBeGreaterThan(SEEDS.length * 20);
  });
});
