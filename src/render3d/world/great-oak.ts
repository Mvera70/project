// UI-W · El roble del valle, en 3D: el árbol del escudo del título a la orilla
// del lago (`derive/landmark.ts` dice dónde).
//
// La malla del catálogo conserva la silueta del árbol del escudo. Las
// primitivas anteriores quedan de respaldo si falta el GLB en una publicación.
//
// Es **más grande que cualquier árbol del bosque** a propósito: es el que se
// reconoce desde lejos, el emblema. Tronco ancho con raíces que asoman, ramas
// abiertas y una copa en cúpula de muchos cogollos. Las hojas se tiñen con la
// estación como las del bosque (`tintFoliage`): el verde lo decide la paleta.

import type {
  Color} from 'three';
import { ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Mesh, MeshStandardMaterial,
  type Material, type Object3D,
} from 'three';
import { hash32 } from '@engine/rng';
import type { Palette } from '@derive/palette';
import type { ValleyMap } from '@engine/state';
import { greatOakCell } from '@derive/landmark';
import { elevationAt } from './ground';
import { seasonTree, tintFoliage } from './forest';

export interface GreatOak {
  readonly group: Group;
  /** La celda que ocupa, o `null` si el valle no tiene lago. */
  readonly cell: number | null;
  season(palette: Palette): void;
  dispose(): void;
}

/** Escala del respaldo procedural; el GLB ya llega medido en celdas. */
const SCALE = 1.35;

function tintOakFoliage(material: Material, palette: Palette): void {
  const painted = material as Material & { color?: Color };
  if (painted.color === undefined) return;
  if (material.name.includes('foliage_shadow')) painted.color.set(palette.forestDark);
  else if (material.name.includes('foliage_light')) painted.color.set(palette.forest).multiplyScalar(1.35);
  else if (material.name.includes('foliage')) painted.color.set(palette.forest);
}

function unit(key: string): number {
  return hash32(0x0a4c, `great-oak:${key}`) / 4_294_967_296;
}

export function buildGreatOak(map: ValleyMap, palette: Palette, instance?: (id: string) => Object3D | undefined): GreatOak {
  const group = new Group();
  group.name = 'Valley_GreatOak';
  const cell = greatOakCell(map);
  const model = cell === null ? undefined : instance?.('great-oak');
  if (cell !== null && model !== undefined) {
    const materials = seasonTree(model, palette);
    for (const material of materials) tintOakFoliage(material, palette);
    model.traverse((object) => {
      const mesh = object as Object3D & { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (mesh.isMesh !== true) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    group.add(model);
    const x = cell % map.width + .5;
    const z = Math.floor(cell / map.width) + .5;
    group.position.set(x, elevationAt(map, x, z), z);
    group.rotation.y = unit('facing') * Math.PI * 2;
    return {
      group,
      cell,
      season(next: Palette): void { for (const material of materials) tintOakFoliage(material, next); },
      dispose(): void { for (const material of materials) material.dispose(); },
    };
  }
  const bark = new MeshStandardMaterial({ name: 'great-oak-bark', color: '#5b4130', roughness: 1, flatShading: true });
  const leaf = new MeshStandardMaterial({ name: 'great-oak-leaf', color: palette.forestDark, roughness: .9, flatShading: true });
  const leafLight = new MeshStandardMaterial({ name: 'great-oak-leaf-light', color: palette.forest, roughness: .9, flatShading: true });
  const materials: Material[] = [bark, leaf, leafLight];
  const geometries: { dispose(): void }[] = [];
  const add = (mesh: Mesh): void => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    geometries.push(mesh.geometry);
    group.add(mesh);
  };

  if (cell !== null) {
    // El tronco: ancho abajo, con un leve giro para que no sea un tubo.
    const trunk = new Mesh(new CylinderGeometry(.2, .36, 1.15, 7), bark);
    trunk.position.y = .575;
    trunk.rotation.y = .3;
    add(trunk);
    // Las raíces: cuñas que salen del pie hacia fuera.
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 + unit(`root:${i}`) * .6;
      const root = new Mesh(new ConeGeometry(.11, .55, 5), bark);
      root.position.set(Math.cos(angle) * .3, .1, Math.sin(angle) * .3);
      root.rotation.set(0, -angle, Math.PI / 2 - .35);
      root.rotation.order = 'YZX';
      add(root);
    }
    // Las ramas: cinco brazos que se abren desde lo alto del tronco.
    const tips: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 + unit(`branch:${i}`) * .8;
      const length = .8 + unit(`branch-len:${i}`) * .3;
      const tilt = .75 + unit(`branch-tilt:${i}`) * .25;
      const branch = new Mesh(new CylinderGeometry(.06, .13, length, 6), bark);
      const mx = Math.cos(angle) * Math.sin(tilt) * length / 2;
      const my = Math.cos(tilt) * length / 2;
      const mz = Math.sin(angle) * Math.sin(tilt) * length / 2;
      branch.position.set(mx, 1.05 + my, mz);
      branch.lookAt(mx * 2, 1.05 + my * 2, mz * 2);
      branch.rotateX(Math.PI / 2);
      add(branch);
      tips.push({ x: mx * 2, y: 1.05 + my * 2, z: mz * 2 });
    }
    // La copa: un cogollo grande en el centro, uno en la punta de cada rama y
    // un anillo de pequeños por debajo, que es lo que le da la cúpula ancha
    // del emblema. Dos tonos, como el bosque.
    const clump = (x: number, y: number, z: number, r: number, light: boolean, key: string): void => {
      const mesh = new Mesh(new IcosahedronGeometry(r, 0), light ? leafLight : leaf);
      mesh.position.set(x, y, z);
      mesh.rotation.set(unit(`${key}:rx`) * 3, unit(`${key}:ry`) * 3, 0);
      add(mesh);
    };
    clump(0, 2.0, 0, .8, false, 'crown');
    clump(.1, 2.3, -.05, .55, true, 'crown-top');
    tips.forEach((tip, i) => {
      clump(tip.x * 1.05, tip.y + .2, tip.z * 1.05, .52 + unit(`tip:${i}`) * .14, i % 2 === 0, `tip:${i}`);
    });
    // Y un faldón ancho por fuera, más bajo que la copa: el roble del escudo es
    // más ancho que alto, y sin esto salía una bola.
    for (let i = 0; i < 9; i += 1) {
      const angle = (i / 9) * Math.PI * 2 + .4;
      const reach = 1.35 + unit(`skirt-reach:${i}`) * .2;
      clump(Math.cos(angle) * reach, 1.55 + unit(`skirt:${i}`) * .18, Math.sin(angle) * reach,
        .42 + unit(`skirt-r:${i}`) * .12, i % 3 === 0, `skirt:${i}`);
    }

    const x = cell % map.width + .5;
    const z = Math.floor(cell / map.width) + .5;
    group.position.set(x, elevationAt(map, x, z), z);
    group.rotation.y = unit('facing') * Math.PI * 2;
    group.scale.setScalar(SCALE);
  }

  return {
    group,
    cell,
    season(next: Palette): void {
      tintFoliage(leaf, next);
      tintFoliage(leafLight, next);
    },
    dispose(): void {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
