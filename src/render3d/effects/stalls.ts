// El valle más vivo (25 sep 2026) · Lo que trae cada visita, puesto en la plaza.
//
// Los que vienen por el camino (`life/visitors.ts`) se plantaban en la plaza y
// charlaban; no se veía a qué venían. Mientras se quedan, montan delante de sí
// lo suyo, según lo que la crónica cuenta de cada uno:
//
//   · **el buhonero**, un tenderete con toldo a rayas y baratijas encima;
//   · **el factor**, que viene a comprar grano, una mesa con el libro de
//     cuentas abierto, una balanza de platos y sacos vacíos apilados;
//   · **el salinero**, sus sacos en el suelo, uno abierto con el montón de sal.
//
// El tratante no monta nada: lo que vende es la vaca que trae detrás. Se monta
// al llegar y se recoge al irse. Decorado: no toca el estado ni tira dados.

import {
  BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry,
  type BufferGeometry, type Material,
} from 'three';

import type { StallKind } from '../life/visitors';

export interface Stall {
  readonly id: number;
  readonly kind: StallKind;
  readonly x: number;
  readonly z: number;
  /** Hacia dónde da el mostrador: hacia el centro de la plaza. */
  readonly facing: number;
}

/** Lo que se lleva la mula del que cerró el trato: la leña o el grano comprados. */
export interface MuleLoad {
  readonly id: number;
  readonly kind: 'bundle' | 'grain';
  readonly x: number;
  readonly z: number;
}

export interface Stalls {
  readonly group: Group;
  readonly shown: number;
  show(stalls: readonly Stall[], ground: (x: number, z: number) => number): void;
  /** La carga sobre la albarda, siguiendo a la mula cada fotograma. */
  carry(loads: readonly MuleLoad[], ground: (x: number, z: number) => number): void;
  dispose(): void;
}

export function createStalls(): Stalls {
  const group = new Group();
  group.name = 'Valley_Stalls';
  const mat = (color: string, extra: Partial<{ side: typeof DoubleSide }> = {}): MeshStandardMaterial =>
    new MeshStandardMaterial({ color, roughness: 1, flatShading: true, ...extra });
  const materials = {
    wood: mat('#7a5534'), plank: mat('#9a7048'), awningA: mat('#b8483a', { side: DoubleSide }),
    awningB: mat('#e6dcc4', { side: DoubleSide }), sack: mat('#b9a37a'), salt: mat('#f1efe8'),
    ledger: mat('#efe6cf'), brass: mat('#b8913a'), pot: mat('#8a5a3c'), cloth: mat('#4f7a8a'),
    cloth2: mat('#6d8a3f'), jar: mat('#c9b48a'),
  };
  const geometries: BufferGeometry[] = [];
  const box = (w: number, h: number, d: number): BoxGeometry => { const g = new BoxGeometry(w, h, d); geometries.push(g); return g; };
  const cyl = (r: number, h: number, n = 8): CylinderGeometry => { const g = new CylinderGeometry(r, r, h, n); geometries.push(g); return g; };
  const add = (parent: Group, geometry: BufferGeometry, material: Material, x: number, y: number, z: number): Mesh => {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const table = (parent: Group, w: number, d: number, h: number): void => {
    add(parent, box(w, 0.03, d), materials.plank, 0, h, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(parent, box(0.03, h, 0.03), materials.wood, sx * (w / 2 - 0.03), h / 2, sz * (d / 2 - 0.03));
  };
  const sack = (parent: Group, x: number, z: number, height: number, open = false): void => {
    add(parent, cyl(0.07, height, 7), materials.sack, x, height / 2, z);
    if (open) {
      const heap = new Mesh(new ConeGeometry(0.065, 0.05, 7), materials.salt);
      geometries.push(heap.geometry);
      heap.position.set(x, height + 0.02, z);
      parent.add(heap);
    } else {
      add(parent, cyl(0.035, 0.04, 6), materials.sack, x, height + 0.02, z);
    }
  };

  const builders: Record<StallKind, (g: Group) => void> = {
    // El tenderete: mesa, dos postes detrás y el toldo a rayas inclinado.
    pedlar: (g) => {
      table(g, 0.7, 0.3, 0.28);
      for (const sx of [-1, 1]) add(g, box(0.03, 0.62, 0.03), materials.wood, sx * 0.34, 0.31, -0.2);
      const stripes = 5;
      for (let n = 0; n < stripes; n += 1) {
        const strip = new Mesh(new PlaneGeometry(0.72 / stripes, 0.46), n % 2 === 0 ? materials.awningA : materials.awningB);
        geometries.push(strip.geometry);
        strip.position.set(-0.36 + (n + 0.5) * (0.72 / stripes), 0.56, 0.0);
        strip.rotation.x = -Math.PI / 2 + 0.45;
        g.add(strip);
      }
      // Baratijas: telas enrolladas, un cacharro, tarros.
      for (const [x, m] of [[-0.24, materials.cloth], [-0.14, materials.cloth2]] as const) {
        const roll = add(g, cyl(0.03, 0.2, 7), m, x, 0.33, 0.02);
        roll.rotation.x = Math.PI / 2;
      }
      add(g, cyl(0.045, 0.07, 8), materials.pot, 0.04, 0.33, 0.03);
      for (const x of [0.15, 0.22, 0.28]) add(g, cyl(0.022, 0.05, 6), materials.jar, x, 0.32, -0.04 + x * 0.2);
    },
    // El factor: mesa con el libro abierto y la balanza; sacos vacíos al lado.
    factor_visit: (g) => {
      table(g, 0.5, 0.28, 0.26);
      for (const sx of [-1, 1]) {
        const page = add(g, box(0.07, 0.012, 0.1), materials.ledger, -0.1 + sx * 0.037, 0.285, 0);
        page.rotation.z = sx * -0.12;
      }
      add(g, box(0.012, 0.16, 0.012), materials.brass, 0.13, 0.35, 0);
      add(g, box(0.16, 0.01, 0.01), materials.brass, 0.13, 0.43, 0);
      for (const sx of [-1, 1]) add(g, cyl(0.035, 0.008, 8), materials.brass, 0.13 + sx * 0.08, 0.37, 0);
      for (let n = 0; n < 3; n += 1) {
        const flat = add(g, box(0.2, 0.035, 0.13), materials.sack, 0.42, 0.02 + n * 0.035, -0.05);
        flat.rotation.y = n * 0.3;
      }
    },
    // El salinero: sacos en el suelo, uno abierto con la sal a la vista.
    salt_visit: (g) => {
      sack(g, -0.18, 0, 0.2);
      sack(g, -0.03, -0.08, 0.22);
      sack(g, 0.12, 0.02, 0.18, true);
      add(g, cyl(0.05, 0.03, 8), materials.wood, 0.28, 0.015, 0.08);
    },
  };

  let key = '';
  let shown = 0;
  // La carga: tres troncos atados, o dos sacos llenos, a la altura del lomo.
  const loadGroup = new Group();
  group.add(loadGroup);
  const loads = new Map<number, Group>();
  const buildLoad = (kind: MuleLoad['kind']): Group => {
    const piece = new Group();
    if (kind === 'bundle') {
      for (let n = 0; n < 3; n += 1) {
        const log = add(piece, cyl(0.035, 0.34, 6), materials.wood, (n - 1) * 0.06, n === 1 ? 0.05 : 0, 0);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = Math.PI / 2;
      }
    } else {
      for (const side of [-1, 1]) add(piece, cyl(0.07, 0.16, 7), materials.sack, side * 0.09, 0.02, 0);
    }
    return piece;
  };
  /** Altura del lomo de la mula, en celdas (receta: cadera 0,86 m y tronco 0,6 m, a un tercio). */
  const BACK = 0.5;
  return {
    group,
    get shown() { return shown; },
    show(stalls, ground): void {
      const next = stalls.map((s) => `${s.id}:${s.kind}:${s.x.toFixed(2)}:${s.z.toFixed(2)}`).join('|');
      if (next === key) return;
      key = next;
      for (const child of [...group.children]) if (child !== loadGroup) group.remove(child);
      for (const stall of stalls) {
        const piece = new Group();
        builders[stall.kind](piece);
        piece.position.set(stall.x, ground(stall.x, stall.z), stall.z);
        // El modelo mira a +Z; se gira para que el mostrador dé a la plaza.
        piece.rotation.y = stall.facing;
        group.add(piece);
      }
      shown = stalls.length;
    },
    carry(list, ground): void {
      for (const [id, piece] of loads) {
        if (list.some((load) => load.id === id)) continue;
        loadGroup.remove(piece);
        loads.delete(id);
      }
      for (const load of list) {
        let piece = loads.get(load.id);
        if (piece === undefined) {
          piece = buildLoad(load.kind);
          loads.set(load.id, piece);
          loadGroup.add(piece);
        }
        piece.position.set(load.x, ground(load.x, load.z) + BACK, load.z);
      }
    },
    dispose(): void {
      for (const child of [...group.children]) group.remove(child);
      for (const g of geometries) g.dispose();
      for (const m of Object.values(materials)) m.dispose();
    },
  };
}
