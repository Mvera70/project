// E3b.3 · Sonda geométrica del adarve generado: suelo, paso y borde cerrado.
//
// Mide sobre los mismos prismas que se dibujan y que Rapier recibe, no sobre
// una copia: la ruta del guardia se muestrea cada centímetro de celda.

import { bastionRect, rampartPrisms, type Planar, type RampartLayout } from '../../src/render3d/world/rampart';

/** Radio del cuerpo que recorre el adarve, el mismo de `life/elevated-post.ts`. */
export const BODY_RADIUS = 0.32;

function insideConvex(outline: readonly Planar[], p: Planar): boolean {
  let sign = 0;
  for (let i = 0; i < outline.length; i += 1) {
    const a = outline[i]!, b = outline[(i + 1) % outline.length]!;
    const cross = (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
    if (Math.abs(cross) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

function distance(outline: readonly Planar[], p: Planar): number {
  if (insideConvex(outline, p)) return 0;
  let best = Infinity;
  for (let i = 0; i < outline.length; i += 1) {
    const a = outline[i]!, b = outline[(i + 1) % outline.length]!;
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t));
  }
  return best;
}

export interface RampartProbe {
  readonly samples: number;
  /** Muestras de la ronda sin tablero ni torre debajo. */
  readonly unsupported: number;
  /** Menor distancia de la ronda a un pretil o almena. */
  readonly clearance: number;
  /** Muestras con el borde a 0,42 del eje sin suelo ni pretil. */
  readonly openEdge: number;
  /** Dónde falla, para diagnosticar: hasta diez muestras de cada defecto. */
  readonly where: { readonly tight: Planar[]; readonly open: Planar[] };
}

export function probeRampart(layout: RampartLayout, route: readonly Planar[]): RampartProbe {
  const prisms = rampartPrisms(layout);
  const floors = [
    ...prisms.filter(prism => prism.part === 'deck').map(prism => prism.outline),
    ...layout.bastions.map(bastionRect).map(r => [{ x: r.minX, z: r.minZ }, { x: r.maxX, z: r.minZ },
      { x: r.maxX, z: r.maxZ }, { x: r.minX, z: r.maxZ }]),
  ];
  const walls = prisms.filter(prism => prism.part === 'parapet' || prism.part === 'merlon').map(prism => prism.outline);
  const parapets = prisms.filter(prism => prism.part === 'parapet').map(prism => prism.outline);
  let samples = 0, unsupported = 0, openEdge = 0, clearance = Infinity;
  const tight: Planar[] = [], open: Planar[] = [];
  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1]!, b = route[i]!;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 1e-9) continue;
    const u = { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
    const steps = Math.ceil(length / 0.01);
    for (let k = 0; k <= steps; k += 1) {
      const p = { x: a.x + u.x * length * k / steps, z: a.z + u.z * length * k / steps };
      samples += 1;
      if (!floors.some(outline => insideConvex(outline, p))) unsupported += 1;
      for (const outline of walls) {
        if (Math.abs(outline[0]!.x - p.x) > 2 || Math.abs(outline[0]!.z - p.z) > 2) continue;
        const d = distance(outline, p);
        if (d < BODY_RADIUS - 1e-6 && tight.length < 10) tight.push(p);
        clearance = Math.min(clearance, d);
      }
      for (const side of [-1, 1]) {
        const edge = { x: p.x + u.z * side * 0.42, z: p.z - u.x * side * 0.42 };
        if (!floors.some(outline => insideConvex(outline, edge))
          && !parapets.some(outline => insideConvex(outline, edge))) {
          openEdge += 1;
          if (open.length < 10) open.push(edge);
        }
      }
    }
  }
  return { samples, unsupported, clearance, openEdge, where: { tight, open } };
}
