// GV-4b · Lo que una búsqueda fallida ya demostró (revisión del 30 sep 2026,
// `docs/medidas/revision-rendimiento-2026-09-30.md` §3).
//
// `finePathTo` guarda la región cerrada que recorre cada búsqueda que no llega
// y contesta «no» a las siguientes que salgan de dentro sin volver a recorrer
// la rejilla. Lo que se vigila es la propiedad que lo hace aceptable: **no
// cambia ninguna ruta**. Cada pregunta se hace dos veces, contra el terreno que
// va acumulando regiones y contra una copia nueva que no tiene ninguna, y las
// dos respuestas tienen que ser la misma, sin ruta incluida.
//
// El terreno es de prueba y pequeño para que quepa en la suite rápida: postes
// sueltos como troncos, un corral cerrado de postes al que no se llega y una
// empalizada con una rendija más estrecha que un cuerpo, que obliga a rodear.

import { describe, expect, it } from 'vitest';
import { indexSolids, type Point, type Solid, type Terrain } from '../../src/render3d/life/body';
import { pathTo } from '../../src/render3d/life/navigate';

const W = 40, H = 30, BODY = 0.32;

function post(x: number, z: number, half = 0.15): Solid {
  return { minX: x - half, minZ: z - half, maxX: x + half, maxZ: z + half };
}

/** Un generador congruencial: el terreno y las preguntas salen igual siempre. */
function lcg(seed: number): () => number {
  let h = seed >>> 0;
  return () => (h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function field(seed: number): { land: Terrain; pen: { minX: number; minZ: number; maxX: number; maxZ: number } } {
  const random = lcg(seed);
  const solids: Solid[] = [];
  // El corral: postes cada 0,4 celdas, huecos de 0,1 que no deja pasar a nadie.
  const pen = { minX: 26, minZ: 5, maxX: 33, maxZ: 12 };
  for (let x = pen.minX; x <= pen.maxX + 1e-9; x += 0.4) solids.push(post(x, pen.minZ), post(x, pen.maxZ));
  for (let z = pen.minZ; z <= pen.maxZ + 1e-9; z += 0.4) solids.push(post(pen.minX, z), post(pen.maxX, z));
  // La empalizada: de z = 0 a z = 20 en x = 15, con una rendija de medio cuerpo.
  for (let z = 0.2; z < 20; z += 0.4) if (Math.abs(z - 9) > 0.35) solids.push(post(15, z));
  // Y los troncos sueltos, fuera del corral.
  for (let n = 0; n < 90; n += 1) {
    const x = 1 + random() * (W - 2), z = 1 + random() * (H - 2);
    if (x > pen.minX - 1 && x < pen.maxX + 1 && z > pen.minZ - 1 && z < pen.maxZ + 1) continue;
    solids.push(post(x, z, 0.2));
  }
  return { land: { width: W, height: H, blocked: new Uint8Array(W * H), solids: indexSolids(W, H, solids) }, pen };
}

describe('GV-4b · las regiones cerradas no cambian ninguna ruta', () => {
  it.each([3, 11, 29])('semilla %i: con y sin lo que las búsquedas fallidas dejaron, la misma respuesta', (seed) => {
    const { land, pen } = field(seed);
    const random = lcg(seed * 7919);
    const anywhere = (): Point => ({ x: 1 + random() * (W - 2), z: 1 + random() * (H - 2) });
    const inside = (): Point => ({ x: pen.minX + 1 + random() * (pen.maxX - pen.minX - 2), z: pen.minZ + 1 + random() * (pen.maxZ - pen.minZ - 2) });
    const queries: [Point, Point][] = [];
    // Al corral desde fuera, varias veces desde los mismos sitios: es lo que la
    // caché contesta sin buscar. Y pares cualesquiera, que rodean la empalizada.
    const starts = Array.from({ length: 6 }, anywhere);
    for (const from of starts) for (let n = 0; n < 4; n += 1) queries.push([from, inside()]);
    for (let n = 0; n < 40; n += 1) queries.push([anywhere(), anywhere()]);
    // Y desde dentro del corral hacia fuera, que tampoco se alcanza.
    for (let n = 0; n < 6; n += 1) queries.push([inside(), anywhere()]);

    let none = 0, found = 0;
    for (const [from, to] of queries) {
      const remembered = pathTo(land, from, to, BODY);
      const fresh = pathTo({ ...land }, from, to, BODY);
      expect(remembered, `${JSON.stringify(from)} → ${JSON.stringify(to)}`).toEqual(fresh);
      if (fresh === null) none += 1; else found += 1;
    }
    // Que la prueba pruebe algo: hay preguntas sin ruta que repetir y rutas que
    // encontrar.
    expect(none).toBeGreaterThanOrEqual(20);
    expect(found).toBeGreaterThanOrEqual(20);
  });
});
