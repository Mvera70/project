// AR-2 · La mina, pintada: la boca entibada en la ladera, los raíles, el
// acopio de mineral y la vagoneta. docs/plan-meta.md AR-2.
//
// **Los modelos son de Astra** (`docs/encargos/encargo-astra-tanda-larga-2026-10-02.md`,
// bloque 4: `mine-mouth`, `minecart`/`minecart-full`, `ore-pile`, `rails`).
// Mientras no estén publicados se pinta un respaldo procedural con **la misma
// forma, el mismo origen y el mismo frente**, para que el día que lleguen sea
// cambiar uno por otro sin tocar la vida ni esta colocación:
//
//   - `mine-mouth`: origen en el centro de la celda de la mina, a ras de suelo,
//     frente a +Z (hacia el valle); la boca a `MOUTH` celdas por delante.
//     El respaldo es la cueva del oso (`bear-den`) más grande con un marco de
//     entibado (dos postes y un dintel) y el hueco oscuro.
//   - `rails`: un tramo recto de una celda, origen en su centro, a lo largo de Z.
//   - `minecart` / `minecart-full`: origen en la base, frente a +Z; el mineral
//     de la llena en su propia malla (`ore_load`), como pide el encargo.
//   - `ore-pile`: el montón, origen en su base; se escala por lo que hay en el
//     acopio (cuatro tamaños, `MINE.ORE_STORE`).
//
// Decorado: lee el estado y la escena del día (`life/mine.ts`); no toca el
// motor. Seis o siete llamadas de dibujo en total, ninguna con sombra salvo la
// boca (lo que pasa de una celda de alto, regla del encargo).

import {
  BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry,
  type Object3D,
} from 'three';
import { MINE } from '@engine/balance';
import type { Cart, MineScene } from '../life/mine';
import { MOUTH, swallowed } from '../life/mine';
import { mergeStatic } from './merge-static';

/** Los recursos del encargo de Astra, con los nombres que pide. */
export const MINE_ASSETS = ['mine-mouth', 'minecart', 'minecart-full', 'ore-pile', 'rails'] as const;

const TIMBER = new MeshStandardMaterial({ color: '#6E4B2E', roughness: 1, flatShading: true });
const IRON = new MeshStandardMaterial({ color: '#3D3A38', roughness: 0.8, metalness: 0.3, flatShading: true });
const ORE = new MeshStandardMaterial({ color: '#8A4A32', roughness: 1, flatShading: true });
const DARK = new MeshStandardMaterial({ color: '#141412', roughness: 1 });
const ROCK = new MeshStandardMaterial({ color: '#7F7B6A', roughness: 1, flatShading: true });

/** Cuatro tamaños de montón, como el bastidor de pieles: un cuarto del acopio cada uno. */
export function pileSize(ore: number): 0 | 1 | 2 | 3 | 4 {
  if (ore <= 0) return 0;
  return Math.min(4, Math.ceil((ore / MINE.ORE_STORE) * 4)) as 1 | 2 | 3 | 4;
}

function box(w: number, h: number, d: number, material: MeshStandardMaterial, x: number, y: number, z: number): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/** La boca de respaldo: la cueva del oso más grande, entibada. */
function mouthStandIn(den: Object3D | undefined): Group {
  const group = new Group();
  group.name = 'mine-mouth';
  if (den !== undefined) {
    // La receta del oso: entrada a 0,55 delante del centro; la boca de la mina
    // está a `MOUTH` (0,62), así que la cueva escala 1,13 en planta y algo más
    // en alto, «más grande» y hundida en la montaña como ella.
    den.scale.set(1.35, 1.5, 1.13);
    den.position.y = -0.1;
    group.add(den);
  } else {
    // Sin la cueva siquiera: un peñasco facetado que tapa la galería.
    const crag = new Mesh(new ConeGeometry(0.95, 1.3, 6), ROCK);
    crag.position.set(0, 0.55, -0.2);
    group.add(crag);
  }
  // El hueco oscuro, un palmo detrás del marco: tras él desaparece quien entra.
  const recess = new Mesh(new PlaneGeometry(0.56, 0.7), DARK);
  recess.position.set(0, 0.35, MOUTH - 0.12);
  group.add(recess);
  // El entibado: dos postes y un dintel, de madera.
  group.add(box(0.09, 0.78, 0.09, TIMBER, -0.33, 0.39, MOUTH));
  group.add(box(0.09, 0.78, 0.09, TIMBER, 0.33, 0.39, MOUTH));
  group.add(box(0.84, 0.1, 0.12, TIMBER, 0, 0.8, MOUTH));
  return group;
}

/** Un tramo de raíles de respaldo: dos carriles y dos traviesas, una celda a lo largo de Z. */
function railsStandIn(): Group {
  const group = new Group();
  group.name = 'rails';
  group.add(box(0.04, 0.04, 1, IRON, -0.15, 0.03, 0));
  group.add(box(0.04, 0.04, 1, IRON, 0.15, 0.03, 0));
  for (const z of [-0.25, 0.25]) group.add(box(0.46, 0.03, 0.09, TIMBER, 0, 0.012, z));
  return group;
}

/** La vagoneta de respaldo: la caja, cuatro ruedas y el mineral en malla aparte (`ore_load`). */
function cartStandIn(): Group {
  const group = new Group();
  group.name = 'minecart';
  const body = box(0.42, 0.24, 0.56, TIMBER, 0, 0.22, 0);
  body.name = 'body';
  group.add(body);
  const wheel = new CylinderGeometry(0.08, 0.08, 0.05, 8);
  for (const [x, z] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]] as const) {
    const mesh = new Mesh(wheel, IRON);
    mesh.name = `wheel_${x < 0 ? 'l' : 'r'}${z < 0 ? 'b' : 'f'}`;
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, 0.08, z);
    group.add(mesh);
  }
  const load = new Mesh(new ConeGeometry(0.26, 0.16, 6), ORE);
  load.name = 'ore_load';
  load.scale.set(1, 1, 1.3);
  load.position.set(0, 0.4, 0);
  group.add(load);
  return group;
}

function pileStandIn(): Group {
  const group = new Group();
  group.name = 'ore-pile';
  const mesh = new Mesh(new ConeGeometry(0.42, 0.32, 7), ORE);
  mesh.position.y = 0.16;
  group.add(mesh);
  return group;
}

export interface MineWorks {
  readonly group: Group;
  /** Lo que se ve ahora, para la traza y las pruebas. */
  readonly shown: { readonly id: number; readonly carts: number; readonly pile: number } | null;
  /**
   * Pone la mina del día (o la quita con `null`), el montón según el mineral
   * del motor, y cada vagoneta donde la tenga la vida. Se llama por fotograma;
   * lo estático sólo se rehace al cambiar de mina.
   */
  show(scene: MineScene | null, ore: number, ground: (x: number, z: number) => number,
    model: (id: string) => Object3D | undefined): void;
}

export function createMineWorks(): MineWorks {
  const group = new Group();
  group.name = 'Valley_Mine';
  const statics = new Group();
  const pileHolder = new Group();
  const carts = new Group();
  group.add(statics, pileHolder, carts);
  let shownId: number | null = null;
  let shownPile = -1;
  const cartModels: { empty: Object3D; full: Object3D; pivot: Group }[] = [];

  const clear = (): void => {
    for (const holder of [statics, pileHolder, carts]) for (const child of [...holder.children]) holder.remove(child);
    cartModels.length = 0;
    shownId = null;
    shownPile = -1;
  };

  const placeCart = (cart: Cart, slot: { empty: Object3D; full: Object3D; pivot: Group }, scene: MineScene,
    ground: (x: number, z: number) => number): void => {
    // Dentro de la roca no se ve: entra y sale por la boca.
    slot.pivot.visible = !swallowed(scene.site, cart);
    slot.pivot.position.set(cart.x, ground(cart.x, cart.z), cart.z);
    slot.pivot.rotation.y = cart.facing;
    slot.full.visible = cart.full;
    slot.empty.visible = !cart.full;
    // Se vuelca de lado, hacia el acopio: el giro va en el eje de la vía.
    const toPile = Math.sign((scene.site.pile.x - scene.site.stop.x) * Math.cos(cart.facing)
      - (scene.site.pile.z - scene.site.stop.z) * Math.sin(cart.facing)) || 1;
    for (const one of [slot.empty, slot.full]) one.rotation.z = -toPile * cart.tilt * 1.1;
  };

  return {
    group,
    get shown() {
      return shownId === null ? null : { id: shownId, carts: cartModels.length, pile: shownPile };
    },
    show(scene, ore, ground, model): void {
      if (scene === null) { if (shownId !== null) clear(); return; }
      const { site } = scene;
      if (shownId !== site.id) {
        clear();
        shownId = site.id;
        const mouth = model('mine-mouth') ?? mouthStandIn(model('bear-den'));
        mouth.position.set(site.den.x, ground(site.den.x, site.den.z) - 0.04, site.den.z);
        mouth.rotation.y = site.facing;
        mouth.traverse((child) => { if (child instanceof Mesh) child.castShadow = true; });
        statics.add(mouth);
        // Los raíles, de la boca al final de la vía: una pieza por celda.
        const rails = new Group();
        for (let n = 0; n < site.rails; n += 1) {
          const piece = model('rails') ?? railsStandIn();
          const along = MOUTH + 0.5 + n;
          const x = site.den.x + site.out.x * along, z = site.den.z + site.out.z * along;
          piece.position.set(x, ground(x, z), z);
          piece.rotation.y = site.facing;
          rails.add(piece);
        }
        mergeStatic(rails);
        statics.add(rails);
        for (let n = 0; n < scene.carts.length; n += 1) {
          const pivot = new Group();
          const empty = model('minecart') ?? cartStandIn();
          const full = model('minecart-full') ?? cartStandIn();
          // El respaldo vacío no lleva mineral; el del GLB vacío ya no lo trae.
          empty.getObjectByName('ore_load')?.removeFromParent();
          pivot.add(empty, full);
          carts.add(pivot);
          cartModels.push({ empty, full, pivot });
        }
      }
      const size = pileSize(ore);
      if (size !== shownPile) {
        for (const child of [...pileHolder.children]) pileHolder.remove(child);
        shownPile = size;
        if (size > 0) {
          const pile = model('ore-pile') ?? pileStandIn();
          const k = 0.55 + size * 0.17;
          pile.scale.multiplyScalar(k);
          pile.position.set(site.pile.x, ground(site.pile.x, site.pile.z), site.pile.z);
          pileHolder.add(pile);
        }
      }
      scene.carts.forEach((cart, index) => {
        const slot = cartModels[index];
        if (slot !== undefined) placeCart(cart, slot, scene, ground);
      });
    },
  };
}
