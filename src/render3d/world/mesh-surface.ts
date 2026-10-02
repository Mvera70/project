// La cota de una malla tal como se dibuja (2 oct 2026).
//
// La sierra no es su fórmula: lleva un vértice cada una, dos o cuatro celdas,
// apartados de su nudo, y entre vértices es un plano. Lo que va pegado a ella
// —la senda de la garganta y quien anda por la senda— tiene que preguntar a la
// malla y no a `ridgeAt`: preguntándole a la fórmula, la cinta iba hasta
// veintidós celdas por encima de la roca que se ve (semilla 11; Vera, 2 oct
// 2026: «el camino sigue flotando»).
//
// Se monta una vez con la malla: los triángulos se reparten por cubos de una
// celda y cada consulta mira sólo los de su cubo.

import type { BufferGeometry } from 'three';

/** La cota de lo dibujado en un punto, o −∞ si no hay nada debajo. */
export type Surface = (x: number, z: number) => number;

export function meshSurface(geometry: BufferGeometry): Surface {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const corners = index === null ? position.count : index.count;
  const triangles = Math.floor(corners / 3);
  const at = (corner: number): number => (index === null ? corner : index.getX(corner));
  // Los vértices de cada triángulo, seguidos: x, y, z tres veces.
  const tri = new Float32Array(triangles * 9);
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (let t = 0; t < triangles; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      const v = at(t * 3 + k);
      const x = position.getX(v), z = position.getZ(v);
      tri[t * 9 + k * 3] = x;
      tri[t * 9 + k * 3 + 1] = position.getY(v);
      tri[t * 9 + k * 3 + 2] = z;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }
  if (triangles === 0) return () => Number.NEGATIVE_INFINITY;
  const x0 = Math.floor(minX), z0 = Math.floor(minZ);
  const columns = Math.floor(maxX) - x0 + 1, rows = Math.floor(maxZ) - z0 + 1;
  // Cada triángulo, en los cubos que toca su caja: primero se cuentan y luego
  // se llenan, en un solo arreglo.
  const span = (t: number): [number, number, number, number] => {
    const a = tri[t * 9]!, b = tri[t * 9 + 3]!, c = tri[t * 9 + 6]!;
    const d = tri[t * 9 + 2]!, e = tri[t * 9 + 5]!, f = tri[t * 9 + 8]!;
    return [
      Math.floor(Math.min(a, b, c)) - x0, Math.floor(Math.max(a, b, c)) - x0,
      Math.floor(Math.min(d, e, f)) - z0, Math.floor(Math.max(d, e, f)) - z0,
    ];
  };
  const start = new Uint32Array(columns * rows + 1);
  for (let t = 0; t < triangles; t += 1) {
    const [c0, c1, r0, r1] = span(t);
    for (let r = r0; r <= r1; r += 1) for (let c = c0; c <= c1; c += 1) start[r * columns + c + 1]! += 1;
  }
  for (let cell = 0; cell < columns * rows; cell += 1) start[cell + 1]! += start[cell]!;
  const fill = start.slice(0, columns * rows);
  const members = new Uint32Array(start[columns * rows]!);
  for (let t = 0; t < triangles; t += 1) {
    const [c0, c1, r0, r1] = span(t);
    for (let r = r0; r <= r1; r += 1) for (let c = c0; c <= c1; c += 1) members[fill[r * columns + c]!++] = t;
  }
  return (x, z) => {
    const c = Math.floor(x) - x0, r = Math.floor(z) - z0;
    if (c < 0 || r < 0 || c >= columns || r >= rows) return Number.NEGATIVE_INFINITY;
    let best = Number.NEGATIVE_INFINITY;
    for (let m = start[r * columns + c]!; m < start[r * columns + c + 1]!; m += 1) {
      const o = members[m]! * 9;
      const ax = tri[o]!, ay = tri[o + 1]!, az = tri[o + 2]!;
      const bx = tri[o + 3]!, by = tri[o + 4]!, bz = tri[o + 5]!;
      const cx = tri[o + 6]!, cy = tri[o + 7]!, cz = tri[o + 8]!;
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-12) continue;
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
      const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
      if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
      const y = ay * u + by * v + cy * (1 - u - v);
      if (y > best) best = y;
    }
    return best;
  };
}
