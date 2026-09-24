/** Fuente aislada: una sola fábrica para el bastión 66 y su muro SO mixto 24. */
import { writeFile } from 'node:fs/promises';
import { corridor, inside, partition, prism, rect, type P } from './combined-source';
import { directory } from './generate';

export function combinedWall() {
  // Coordenadas locales al bastión. El muro SO ocupa X=-1..0, Z=1..2.
  // El ancla existente termina en su centro (-0,5;1,5); se elimina el brazo
  // NE separado del muro, que duplicaría el tablero diagonal del bastión.
  const disk = (p: P, radius: number): P[] => Array.from({ length: 16 }, (_, i) =>
    [p[0] + radius / Math.cos(Math.PI / 16) * Math.cos(i * Math.PI / 8),
      p[1] + radius / Math.cos(Math.PI / 16) * Math.sin(i * Math.PI / 8)]);
  const floors = [rect(0, 0, 1, 1), rect(.05, 1, .95, 1.65),
    corridor([.5, .5], [-.5, 1.5], .9),
    corridor([-.5, 1.5], [-1, 1.5], .9), disk([-.5, 1.5], .45)];
  const routeXZ: P[] = [[1, .5], [.5, .5], [-.5, 1.5], [-1, 1.5]];
  const clear = [corridor([.5, .5], [1.4, .5], .7),
    corridor([.5, .5], [-.5, 1.5], .7),
    corridor([-.5, 1.5], [-1.4, 1.5], .7),
    corridor([.5, .5], [.5, 2], .7), disk([.5, .5], .35), disk([-.5, 1.5], .35)];
  const inFloor = (p: P): boolean => floors.some(floor => inside(p, floor));
  const deckPolys = partition(floors, inFloor);
  const railPolys = partition([...floors, ...clear],
    point => inFloor(point) && !clear.some(opening => inside(point, opening)));
  const stone = [155 / 255, 149 / 255, 138 / 255];
  const mortar = [134 / 255, 96 / 255, 68 / 255];
  const courses = [
    { name: 'StoneCourse1', low: 0, high: .23, color: stone },
    { name: 'MortarBed1', low: .23, high: .24, color: mortar },
    { name: 'StoneCourse2', low: .24, high: .47, color: stone },
    { name: 'MortarBed2', low: .47, high: .48, color: mortar },
    { name: 'StoneCourse3', low: .48, high: .70, color: stone },
    { name: 'MortarBed3', low: .70, high: .71, color: mortar },
    { name: 'StoneCourse4', low: .71, high: .94, color: stone },
  ];
  const parts = [
    ...deckPolys.map((poly, i) => ({ ...prism(`Deck_${i}`, poly, .94, 1.02), colorLinear: stone })),
    ...railPolys.map((poly, i) => ({ ...prism(`Parapet_${i}`, poly, 1.02, 1.2), colorLinear: stone })),
    ...courses.flatMap(course => deckPolys.map((poly, i) => ({
      ...prism(`${course.name}_${i}`, poly, course.low, course.high), colorLinear: course.color,
    }))),
    ...Array.from({ length: 14 }, (_, i) => prism(`Stair_${i + 1}`,
      rect(.14, 2.65 - (i + 1) / 14, .86, 2.65 - i / 14),
      0, (i + 1) * 1.02 / 14)),
  ];
  return { format: 'valley-candidate-explicit-mesh-v1',
    id: 'e3b-anchor66-wall24-combined-candidate',
    coordinateSystem: 'world XYZ local to bastion cell36,41',
    status: 'source_geometry_only',
    ownership: 'Replaces bastion283 and wall192 in seed23; no old wall arm remains underneath.',
    budget: { maxStaticTriangles: 3800, textures: 0, staticMaterials: 1 },
    material: { name: 'stone', roughness: .95, colorLinear: [155 / 255, 149 / 255, 138 / 255] },
    routeXZ, stairRouteXZ: [[.5, 2.65], [.5, 1.65], [.5, .58]],
    floorY: 1.02, clearWidth: .7, mask: 66, replacesWallMask: 24,
    parts, floors, deckPolys, railPolys,
    limits: ['Fuente geométrica, sin GLB, texturizado ni revisión visual.',
      'La resistencia estructural no se deduce de contacto geométrico.',
      'La colisión y el tránsito en runtime siguen pendientes.'] };
}

if (process.argv.includes('--write-wall-source')) {
  await writeFile(`${directory}e3b-anchor66-wall24-combined-candidate.mesh.json`,
    `${JSON.stringify(combinedWall(), null, 2)}\n`);
}
