// E3b.3 · El adarve generado desde el anillo real, sin un GLB por esquina.
//
// E3b.2 intentó cerrar el adarve con una malla aprobada por cada combinación
// de vecinos, y cada villa nueva traía una máscara que no existía: el retorno
// 66 de la semilla 91, el cruce 24, el codo 6… Dieciséis carpetas de
// candidatos y ninguna villa aleatoria cubierta. Los muros ya se componen por
// código en `defences.ts`; el adarve hace lo mismo sobre ellos.
//
// Este fichero es **puro**: sólo describe prismas en coordenadas de celda. La
// malla (`rampart-mesh.ts`), las colisiones de Rapier y la ruta del guardia
// salen de la misma descripción, así que dibujo y física no pueden divergir.

import type { BastionAccess } from '@derive/bastion-access';
import type { RingCell } from '@derive/elevated-ring';

/**
 * Cotas del adarve. Suelo, paso y pretiles son los de la familia walltop
 * medida en E3b.2 (`art/recipes/e3b-walltop-candidate/`): tablero de 0,90,
 * pretiles en las bandas 0,35…0,45 y paso libre de 0,70. Las alturas de pretil
 * y almena son las del bastión G-27 (`bastion-access-candidate.json`), para que
 * torre y muro remate a la misma cota y la flecha, que nace a 1,45, las libre.
 * La losa baja hasta 0,84 para tapar la coronación del muro publicado (0,885)
 * y la del portón (0,865); las ménsulas son acabado de render, no de juego.
 */
export const RAMPART = {
  floor: 1.02,
  deckBottom: 0.84,
  halfWidth: 0.45,
  parapetInner: 0.35,
  parapetOuter: 0.45,
  parapetTop: 1.16,
  merlonTop: 1.36,
  merlonLength: 0.14,
  corbelBottom: 0.64,
  corbelFace: 0.17,
  corbelLength: 0.08,
  /** Escalera prolongada de la fuente ancla66: libra una diagonal hacia dentro. */
  stairShift: 0.65,
  /** Banda de pretil del bastión, desde el borde de la celda (G-27: 0,08 ± 0,07). */
  bastionParapet: [0.01, 0.15] as const,
} as const;

export interface RampartBastion {
  readonly id: number;
  readonly cell: RingCell;
  /** `null` para un bastión que el anillo cruza pero que no tiene escalera. */
  readonly access: BastionAccess | null;
  readonly stairShift: number;
  /** Direcciones (±1, ±1) hacia los vecinos con tablero. */
  readonly links: readonly RingCell[];
}

export interface RampartLayout {
  /** Pares de celdas contiguas con tablero, sin repetir. */
  readonly edges: readonly (readonly [RingCell, RingCell])[];
  readonly bastions: readonly RampartBastion[];
  /** Portones bajo el tablero: sin ménsulas sobre el paso público. */
  readonly gates: readonly RingCell[];
  /** Punto de referencia interior; las almenas miran hacia fuera de él. */
  readonly centre: { readonly x: number; readonly z: number };
  readonly signature: string;
}

export interface Planar { readonly x: number; readonly z: number }

export type RampartPart = 'deck' | 'corbel' | 'parapet' | 'merlon' | 'landing';

/** Un prisma recto: contorno convexo en planta entre dos cotas. */
export interface RampartPrism {
  readonly outline: readonly Planar[];
  readonly bottom: number;
  readonly top: number;
  readonly part: RampartPart;
}

/** Caja orientada, el formato de `PhysicsObstacle` sin importar la vida. */
export interface RampartBox {
  readonly at: { readonly x: number; readonly y: number; readonly z: number };
  readonly half: { readonly x: number; readonly y: number; readonly z: number };
  /** Giro alrededor de Y que lleva +X local a la dirección del tramo. */
  readonly yaw: number;
}

const key = (cell: RingCell): string => `${cell.x},${cell.z}`;
const add = (a: Planar, b: Planar, k = 1): Planar => ({ x: a.x + b.x * k, z: a.z + b.z * k });
const unit = (v: Planar): Planar => { const l = Math.hypot(v.x, v.z) || 1; return { x: v.x / l, z: v.z / l }; };
/** Normal a la izquierda de la marcha, con +X este y +Z sur. */
const left = (u: Planar): Planar => ({ x: u.z, z: -u.x });
const dot = (a: Planar, b: Planar): number => a.x * b.x + a.z * b.z;

/** Rectángulo de plataforma del bastión, en celdas del mundo. */
export interface Rect { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number }

/** Torre más descansillo: la escalera desplazada deja suelo a 1,02 hacia dentro. */
export function bastionRect(bastion: Pick<RampartBastion, 'cell' | 'access' | 'stairShift'>): Rect {
  const { x, z } = bastion.cell;
  const rect = { minX: x, maxX: x + 1, minZ: z, maxZ: z + 1 };
  const a = bastion.access;
  if (a === null || bastion.stairShift === 0) return rect;
  const s = bastion.stairShift;
  return {
    minX: a.x < 0 ? rect.minX - s : rect.minX, maxX: a.x > 0 ? rect.maxX + s : rect.maxX,
    minZ: a.z < 0 ? rect.minZ - s : rect.minZ, maxZ: a.z > 0 ? rect.maxZ + s : rect.maxZ,
  };
}

const inside = (rect: Rect, p: Planar, margin = 0): boolean =>
  p.x > rect.minX + margin && p.x < rect.maxX - margin && p.z > rect.minZ + margin && p.z < rect.maxZ - margin;

/** Un tramo con ingletes: cuadriláteros convexos alrededor del eje `points`. */
function band(points: readonly Planar[], half: number): Planar[][] {
  if (points.length < 2) return [];
  const normals = points.slice(1).map((p, i) => left(unit({ x: p.x - points[i]!.x, z: p.z - points[i]!.z })));
  const offset = (i: number, side: number): Planar => {
    const p = points[i]!;
    if (i === 0) return add(p, normals[0]!, side * half);
    if (i === points.length - 1) return add(p, normals.at(-1)!, side * half);
    const n1 = normals[i - 1]!, n2 = normals[i]!;
    const k = half / (1 + dot(n1, n2));
    return add(p, { x: n1.x + n2.x, z: n1.z + n2.z }, side * k);
  };
  const quads: Planar[][] = [];
  for (let i = 0; i + 1 < points.length; i += 1) {
    quads.push([offset(i, 1), offset(i + 1, 1), offset(i + 1, -1), offset(i, -1)]);
  }
  return quads;
}

/** Caja en planta alrededor de un centro, alineada con `u`. */
function box(centre: Planar, u: Planar, alongHalf: number, acrossHalf: number,
  bottom: number, top: number, part: RampartPart): RampartPrism {
  const n = left(u);
  const corner = (a: number, b: number): Planar => add(add(centre, u, a * alongHalf), n, b * acrossHalf);
  return { outline: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], bottom, top, part };
}

/** Un trozo de suelo a 1,02: tablero o torre. El pretil se mide desde su borde. */
interface Floor {
  readonly outline: readonly Planar[];
  /** Banda del pretil hacia dentro desde el borde: [desde, hasta]. */
  readonly inset: readonly [number, number];
  /** Arista sin pretil: la cara de la escalera de una torre. */
  readonly open: number | null;
  readonly tower: boolean;
}

function insideConvex(outline: readonly Planar[], p: Planar): boolean {
  let sign = 0;
  for (let i = 0; i < outline.length; i += 1) {
    const a = outline[i]!, b = outline[(i + 1) % outline.length]!;
    const cross = (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
    if (Math.abs(cross) < 1e-12) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

interface Node { readonly cell: RingCell; readonly links: RingCell[] }

/** Paso de muestreo del borde. Un centímetro de celda son tres de piedra. */
const STEP = 0.01;
/** Distancia a la que se sondea fuera del borde para saber si sigue habiendo suelo. */
const PROBE = 0.03;
const MERLON_PITCH = 0.33;

/**
 * Todos los prismas del adarve, torres incluidas, en coordenadas de celda.
 *
 * El pretil no se dibuja por tramo sino **sobre el borde de la unión de los
 * suelos**: tableros, planta de cada torre y su descansillo. Así una boca
 * diagonal abre la esquina justa, el descansillo no queda cruzado por el
 * pretil del tramo que pasa encima, y un tramo parcial se cierra solo en su
 * extremo. La cara de la escalera queda sin pretil, igual que en G-27.
 */
export function rampartPrisms(layout: RampartLayout): RampartPrism[] {
  const nodes = new Map<string, Node>();
  const node = (cell: RingCell): Node => {
    let found = nodes.get(key(cell));
    if (found === undefined) { found = { cell, links: [] }; nodes.set(key(cell), found); }
    return found;
  };
  for (const [a, b] of layout.edges) {
    node(a).links.push({ x: b.x - a.x, z: b.z - a.z });
    node(b).links.push({ x: a.x - b.x, z: a.z - b.z });
  }
  const bastions = new Map(layout.bastions.map(bastion => [key(bastion.cell), bastion]));
  const gates = new Set(layout.gates.map(key));
  const rects = layout.bastions.map(bastionRect);
  const prisms: RampartPrism[] = [];
  const floors: Floor[] = [];
  const deckInset = [0, RAMPART.parapetOuter - RAMPART.parapetInner] as const;
  const mid = (cell: RingCell, d: RingCell): Planar => ({ x: cell.x + 0.5 + d.x / 2, z: cell.z + 0.5 + d.z / 2 });
  const deck = (path: readonly Planar[]): void => {
    for (const quad of band(path, RAMPART.halfWidth)) {
      floors.push({ outline: quad, inset: deckInset, open: null, tower: false });
      prisms.push({ outline: quad, bottom: RAMPART.deckBottom, top: RAMPART.floor, part: 'deck' });
    }
  };

  for (const bastion of layout.bastions) {
    const rect = bastionRect(bastion);
    const outline = [{ x: rect.minX, z: rect.minZ }, { x: rect.maxX, z: rect.minZ },
      { x: rect.maxX, z: rect.maxZ }, { x: rect.minX, z: rect.maxZ }];
    const a = bastion.access;
    // Aristas en orden: norte, este, sur, oeste.
    const open = a === null ? null : a.z < 0 ? 0 : a.x > 0 ? 1 : a.z > 0 ? 2 : 3;
    floors.push({ outline, inset: RAMPART.bastionParapet, open, tower: true });
    if (a !== null && bastion.stairShift > 0) {
      // Descansillo macizo entre la torre y la escalera desplazada.
      const u = { x: a.x, z: a.z };
      prisms.push(box(add({ x: bastion.cell.x + 0.5, z: bastion.cell.z + 0.5 }, u, 0.5 + bastion.stairShift / 2),
        u, bastion.stairShift / 2, 0.47, 0, RAMPART.floor, 'landing'));
    }
  }

  const corbelMid = (RAMPART.corbelFace + RAMPART.halfWidth) / 2;
  const corbelHalf = (RAMPART.halfWidth - RAMPART.corbelFace) / 2;
  for (const item of nodes.values()) {
    const centre = { x: item.cell.x + 0.5, z: item.cell.z + 0.5 };
    if (bastions.has(key(item.cell))) {
      // La torre ya tiene suelo a 1,02. Una boca ortogonal cabe entera en su
      // planta; la diagonal saca el tablero por la esquina hasta el vecino.
      for (const link of item.links) if (link.x !== 0 && link.z !== 0) deck([centre, mid(item.cell, link)]);
      continue;
    }
    const links = item.links.slice(0, 2);
    // Un extremo de tramo parcial se alarga hasta el borde del paso y se cierra.
    const path = links.length === 2 ? [mid(item.cell, links[0]!), centre, mid(item.cell, links[1]!)]
      : [add(centre, unit(links[0]!), -RAMPART.halfWidth), centre, mid(item.cell, links[0]!)];
    deck(path);
    if (gates.has(key(item.cell))) continue;
    for (const end of [path[0]!, path[2]!]) {
      const length = Math.hypot(end.x - centre.x, end.z - centre.z);
      const u = unit({ x: end.x - centre.x, z: end.z - centre.z });
      const n = left(u);
      for (const s of length > 0.6 ? [0.12, 0.37, 0.62] : [0.12, 0.37]) {
        for (const side of [-1, 1]) {
          const at = add(add(centre, u, s), n, side * corbelMid);
          if (rects.some(rect => inside(rect, at))) continue;
          prisms.push(box(at, u, RAMPART.corbelLength / 2, corbelHalf, RAMPART.corbelBottom, RAMPART.deckBottom, 'corbel'));
        }
      }
    }
  }

  // Rejilla por celda para no comparar cada muestra con todo el anillo.
  const buckets = new Map<string, Floor[]>();
  for (const floor of floors) {
    const xs = floor.outline.map(p => p.x), zs = floor.outline.map(p => p.z);
    for (let z = Math.floor(Math.min(...zs)); z <= Math.floor(Math.max(...zs)); z += 1) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.floor(Math.max(...xs)); x += 1) {
        const list = buckets.get(`${x},${z}`) ?? [];
        list.push(floor);
        buckets.set(`${x},${z}`, list);
      }
    }
  }
  const floored = (p: Planar): boolean =>
    (buckets.get(`${Math.floor(p.x)},${Math.floor(p.z)}`) ?? []).some(floor => insideConvex(floor.outline, p));

  for (const floor of floors) {
    const count = floor.outline.length;
    for (let edge = 0; edge < count; edge += 1) {
      if (edge === floor.open) continue;
      const a = floor.outline[edge]!, b = floor.outline[(edge + 1) % count]!;
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      if (length < 1e-6) continue;
      const u = unit({ x: b.x - a.x, z: b.z - a.z });
      // Hacia fuera es la normal cuyo lado no pertenece al propio contorno.
      const probe = add(add(a, u, length / 2), left(u), 1e-3);
      const outward = insideConvex(floor.outline, probe) ? { x: -left(u).x, z: -left(u).z } : left(u);
      const steps = Math.max(1, Math.round(length / STEP));
      let start: number | null = null;
      const flush = (end: number): void => {
        if (start === null) return;
        const s0 = (start / steps) * length, s1 = (end / steps) * length;
        start = null;
        if (s1 - s0 < 0.06) return;
        const p = add(a, u, s0), q = add(a, u, s1);
        const [i0, i1] = floor.inset;
        prisms.push({ outline: [add(p, outward, -i0), add(q, outward, -i0), add(q, outward, -i1), add(p, outward, -i1)],
          bottom: RAMPART.floor, top: RAMPART.parapetTop, part: 'parapet' });
        const across = (i1 - i0) / 2;
        const line = (s: number): Planar => add(add(a, u, s), outward, -(i0 + across));
        if (floor.tower) {
          const merlons = s1 - s0 >= 0.6 ? [s0 + 0.11, (s0 + s1) / 2, s1 - 0.11] : s1 - s0 >= 0.22 ? [s0 + 0.11, s1 - 0.11] : [];
          for (const s of merlons) prisms.push(box(line(s), u, 0.1, across, RAMPART.parapetTop, RAMPART.merlonTop, 'merlon'));
          return;
        }
        // Almenas sólo hacia fuera de la aldea: el lado interior queda llano.
        const midpoint = line((s0 + s1) / 2);
        if (dot(outward, { x: midpoint.x - layout.centre.x, z: midpoint.z - layout.centre.z }) <= 0) return;
        for (let s = s0 + 0.12; s <= s1 - 0.07; s += MERLON_PITCH) {
          prisms.push(box(line(s), u, RAMPART.merlonLength / 2, across, RAMPART.parapetTop, RAMPART.merlonTop, 'merlon'));
        }
      };
      for (let i = 0; i <= steps; i += 1) {
        const at = add(a, u, (i / steps) * length);
        const boundary = i < steps && !floored(add(at, outward, PROBE));
        if (boundary && start === null) start = i;
        if (!boundary) flush(i);
      }
      flush(steps);
    }
  }
  return prisms;
}

/** Pretiles y almenas como cajas orientadas, para Rapier. */
export function rampartBoxes(prisms: readonly RampartPrism[]): RampartBox[] {
  return prisms.filter(prism => prism.part === 'parapet' || prism.part === 'merlon').map(prism => {
    const [p0, p1, p2, p3] = prism.outline as [Planar, Planar, Planar, Planar];
    const a = { x: (p0.x + p3.x) / 2, z: (p0.z + p3.z) / 2 };
    const b = { x: (p1.x + p2.x) / 2, z: (p1.z + p2.z) / 2 };
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const u = unit({ x: b.x - a.x, z: b.z - a.z });
    const width = Math.hypot(p0.x - p3.x, p0.z - p3.z);
    return {
      at: { x: (a.x + b.x) / 2, y: (prism.bottom + prism.top) / 2, z: (a.z + b.z) / 2 },
      // Los ingletes dejan cuñas de milímetros: la caja las cubre alargándose.
      half: { x: length / 2 + 0.02, y: (prism.top - prism.bottom) / 2, z: width / 2 },
      yaw: Math.atan2(-u.z, u.x),
    };
  });
}

/** Celdas con suelo a 1,02 para la física: tablero y torres, no el paso del portón. */
export function rampartPlatformCells(layout: RampartLayout): RingCell[] {
  const gates = new Set(layout.gates.map(key));
  const cells = new Map<string, RingCell>();
  for (const [a, b] of layout.edges) for (const cell of [a, b]) if (!gates.has(key(cell))) cells.set(key(cell), cell);
  return [...cells.values()];
}
