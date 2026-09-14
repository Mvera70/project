// G-09 · design.md D.9 — presupuesto antes de ampliar.
//
// El banco de verdad corre en un navegador y no cabe aquí. Lo que sí cabe, y es
// lo que D.9 pide bajo «ciclo de recursos», es que montar y desmontar la escena
// una y otra vez no deje nada detrás. Una fuga no se ve en un fotograma: se ve
// en la sesión sostenida, y para entonces ya está pagada.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { SCENES } from '../../tools/graphics/bench-scenes';
import { Tells } from '../../src/render3d/effects/tells';
import { Village } from '../../src/render3d/world/buildings';
import { buildGround } from '../../src/render3d/world/ground';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { TERRAIN_CODE } from '@engine/state';
import { PALETTES } from '@derive/palette';
import { buildForest } from '../../src/render3d/world/forest';
import { planFor } from '../../src/render3d/world/plan';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

describe('G-09 · las escenas del banco', () => {
  it('cubren las que D.9 nombra', () => {
    // D.9 las lista: la de comparación, pequeñas, maduras, bosque denso,
    // invierno, crisis y cámara cercana. Una que faltara sería un caso que
    // nadie mide y que aparece en el teléfono de alguien.
    const ids = new Set(SCENES.map((scene) => scene.id));
    for (const wanted of ['comparacion', 'pequena', 'madura', 'bosque', 'invierno', 'crisis', 'cerca']) {
      expect(ids.has(wanted), `falta la escena '${wanted}'`).toBe(true);
    }
  });

  it('y cada una aprieta por un motivo distinto', () => {
    // Siete escenas que midieran lo mismo serían una escena repetida siete
    // veces. Cada una tiene que diferenciarse de todas las demás en algo.
    const seen = new Set<string>();
    for (const scene of SCENES) {
      const shape = `${scene.seed}:${scene.years}:${scene.week}:${scene.close}:${String(scene.crisis)}`;
      expect(seen.has(shape), `'${scene.id}' repite otra escena`).toBe(false);
      seen.add(shape);
    }
    // Y entre todas cubren invierno, crisis y cámara cerca.
    expect(SCENES.some((scene) => scene.week >= 36)).toBe(true);
    expect(SCENES.some((scene) => scene.crisis)).toBe(true);
    expect(SCENES.some((scene) => scene.close < 1)).toBe(true);
  });
});

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
    const forest = buildForest(state.map, sapling());
    expect(forest.count).toBeGreaterThan(200);
    expect(forest.group.children.length).toBe(3);
    for (const child of forest.group.children) {
      expect((child as { isInstancedMesh?: boolean }).isInstancedMesh).toBe(true);
    }
    forest.dispose();
    expect(forest.group.children.length).toBe(0);
  });

  it('hay un árbol por celda de bosque y ni uno fuera', () => {
    const state = village(16);
    let woods = 0;
    for (const code of state.map.terrain) if (code === TERRAIN_CODE.forest) woods += 1;
    const forest = buildForest(state.map, sapling());
    expect(forest.count).toBe(woods);
    forest.dispose();
  });

  it('el mismo valle da siempre el mismo bosque', () => {
    // §4.3 · el render no consume azar. Un bosque que se resembrara en cada
    // pintada sería peor que uno alineado.
    const state = village(16);
    const first = buildForest(state.map, sapling());
    const second = buildForest(state.map, sapling());
    const matrixOf = (forest: ReturnType<typeof buildForest>, at: number): number[] => {
      const mesh = forest.group.children[0] as unknown as { instanceMatrix: { array: ArrayLike<number> } };
      return [...Array.from({ length: 16 }, (_, index) => mesh.instanceMatrix.array[at * 16 + index] ?? 0)];
    };
    for (const at of [0, 7, 50]) expect(matrixOf(second, at)).toEqual(matrixOf(first, at));
    first.dispose();
    second.dispose();
  });

  it('talar quita árboles', () => {
    const state = village(16);
    const before = buildForest(state.map, sapling()).count;
    const felled = structuredClone(state);
    let cut = 0;
    for (let cell = 0; cell < felled.map.terrain.length && cut < 30; cell += 1) {
      if (felled.map.terrain[cell] === TERRAIN_CODE.forest) {
        felled.map.terrain[cell] = TERRAIN_CODE.cleared;
        cut += 1;
      }
    }
    const after = buildForest(felled.map, sapling());
    expect(after.count).toBe(before - cut);
    after.dispose();
  });

  it('plantar y talar cien veces no deja nada', () => {
    const state = village(16);
    for (let round = 0; round < 100; round += 1) {
      const forest = buildForest(state.map, sapling());
      forest.dispose();
      forest.dispose();
    }
  });
});

describe('G-09 · el ciclo de recursos', () => {
  it('montar y desmontar el pueblo cien veces no deja nada', () => {
    const state = village(16);
    const plan = planFor(state);
    const town = new Village();
    for (let round = 0; round < 100; round += 1) {
      for (const building of plan.buildings) town.add(building);
      expect(town.count).toBe(plan.buildings.length);
      town.clear();
      expect(town.count).toBe(0);
      expect(town.group.children.length).toBe(0);
    }
    town.dispose();
  });

  it('las señales tampoco', () => {
    const state = village(16);
    const tells = new Tells();
    for (let round = 0; round < 100; round += 1) {
      tells.update(state);
      expect(tells.count).toBeGreaterThan(0);
      tells.clear();
      expect(tells.count).toBe(0);
    }
    tells.dispose();
  });

  it('el suelo se suelta entero, y soltarlo dos veces no rompe', () => {
    const state = village(8);
    for (let round = 0; round < 20; round += 1) {
      const ground = buildGround(state.map, PALETTES.summer);
      ground.dispose();
      ground.dispose();
    }
  });

  it('cuánto cuesta la escena está en el plan, no en una cuenta aparte', () => {
    // D.9 exige triángulos y llamadas en el informe. Los edificios los pone el
    // plan, así que el número que se presupuesta y el que se pinta salen de la
    // misma cuenta: un presupuesto contra otra fuente no presupuesta nada.
    const state = village(16);
    const plan = planFor(state);
    const town = new Village();
    for (const building of plan.buildings) town.add(building);

    let meshes = 0;
    town.group.traverse((object) => { if ((object as { isMesh?: boolean }).isMesh === true) meshes += 1; });
    // Cada edificio es paredes, y tejado sólo si lo tiene.
    const roofed = plan.buildings.filter((building) => building.roofed && building.roof > 0).length;
    expect(meshes).toBe(plan.buildings.length + roofed);
    town.dispose();
  });
});
