// E3b.3 · La tinta del adarve generado: dos mallas para todo el anillo.

import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Vector3, type Material, type Object3D } from 'three';
import { RAMPART, rampartPrisms, type RampartLayout, type RampartPrism } from './rampart';

/** Añade un prisma recto con caras planas y normales hacia fuera. */
function pushPrism(positions: number[], normals: number[], prism: RampartPrism): void {
  const ring = prism.outline;
  const centre = ring.reduce((sum, p) => ({ x: sum.x + p.x / ring.length, z: sum.z + p.z / ring.length }), { x: 0, z: 0 });
  const triangle = (a: Vector3, b: Vector3, c: Vector3, want: Vector3): void => {
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    if (normal.lengthSq() < 1e-14) return;
    // Se ordena el triángulo según la cara que debe mirar fuera.
    const [p, q] = normal.dot(want) >= 0 ? [b, c] : [c, b];
    normal.normalize();
    if (normal.dot(want) < 0) normal.negate();
    for (const v of [a, p, q]) { positions.push(v.x, v.y, v.z); normals.push(normal.x, normal.y, normal.z); }
  };
  const top = ring.map(p => new Vector3(p.x, prism.top, p.z));
  const bottom = ring.map(p => new Vector3(p.x, prism.bottom, p.z));
  for (let i = 1; i + 1 < ring.length; i += 1) {
    triangle(top[0]!, top[i]!, top[i + 1]!, new Vector3(0, 1, 0));
    triangle(bottom[0]!, bottom[i]!, bottom[i + 1]!, new Vector3(0, -1, 0));
  }
  for (let i = 0; i < ring.length; i += 1) {
    const j = (i + 1) % ring.length;
    const a = ring[i]!, b = ring[j]!;
    const out = new Vector3((a.x + b.x) / 2 - centre.x, 0, (a.z + b.z) / 2 - centre.z);
    triangle(bottom[i]!, bottom[j]!, top[j]!, out);
    triangle(bottom[i]!, top[j]!, top[i]!, out);
  }
}

function geometryOf(prisms: readonly RampartPrism[]): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const prism of prisms) pushPrism(positions, normals, prism);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

export interface RampartModel {
  readonly object: Group;
  dispose(): void;
}

/**
 * El adarve entero en dos mallas: tablero y el resto de la piedra.
 *
 * El tablero comparte cota con la plataforma de la torre allí donde una boca
 * diagonal pasa por su esquina. Empujarlo en profundidad deja ganar a la torre
 * sin parpadeo y sin inventar un escalón que el guardia tendría que salvar.
 */
export function buildRampart(layout: RampartLayout, stone: Material): RampartModel {
  const prisms = rampartPrisms(layout);
  const deckMaterial = stone.clone();
  deckMaterial.polygonOffset = true;
  deckMaterial.polygonOffsetFactor = 1;
  deckMaterial.polygonOffsetUnits = 1;
  const deck = new Mesh(geometryOf(prisms.filter(prism => prism.part === 'deck')), deckMaterial);
  deck.name = 'Rampart_Deck';
  const fabric = new Mesh(geometryOf(prisms.filter(prism => prism.part !== 'deck')), stone);
  fabric.name = 'Rampart_Fabric';
  const group = new Group();
  group.name = 'Valley_Rampart';
  for (const mesh of [deck, fabric]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return {
    object: group,
    dispose(): void {
      deck.geometry.dispose();
      fabric.geometry.dispose();
      deckMaterial.dispose();
      group.clear();
    },
  };
}

/** Recorta un triángulo por el plano y = `top`, conservando lo de abajo. */
function clipBelow(source: BufferGeometry, top: number, shift: ((centroidZ: number) => number) | null): BufferGeometry {
  const flat = source.index === null ? source : source.toNonIndexed();
  const position = flat.getAttribute('position');
  const out: number[] = [];
  for (let i = 0; i < position.count; i += 3) {
    const tri = [0, 1, 2].map(k => new Vector3().fromBufferAttribute(position, i + k));
    const offset = shift === null ? 0 : shift((tri[0]!.z + tri[1]!.z + tri[2]!.z) / 3);
    let polygon: Vector3[] = [];
    for (let j = 0; j < 3; j += 1) {
      const a = tri[j]!, b = tri[(j + 1) % 3]!;
      if (a.y <= top) polygon.push(a);
      if ((a.y <= top) !== (b.y <= top)) polygon.push(a.clone().lerp(b, (top - a.y) / (b.y - a.y)));
    }
    if (polygon.length < 3) continue;
    polygon = polygon.map(v => new Vector3(v.x, v.y, v.z + offset));
    for (let j = 1; j + 1 < polygon.length; j += 1) {
      for (const v of [polygon[0]!, polygon[j]!, polygon[j + 1]!]) out.push(v.x, v.y, v.z);
    }
  }
  if (flat !== source) flat.dispose();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(out, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * La torre bajo el adarve: su fábrica hasta el suelo de 1,02, sin pretiles.
 *
 * Los pretiles y almenas de G-27 cerrarían las bocas; los dibuja el adarve,
 * sobre el borde real de todo el suelo. Con `stairShift` los catorce peldaños
 * (Z local > 1 en la receta) se apartan hacia dentro y el descansillo los une.
 */
export function rampartTower(source: Object3D, stairShift: number): { object: Group; dispose(): void } {
  const group = new Group();
  const owned: BufferGeometry[] = [];
  source.updateMatrixWorld(true);
  source.traverse(node => {
    if (!(node instanceof Mesh)) return;
    const placed = (node.geometry as BufferGeometry).clone().applyMatrix4(node.matrixWorld);
    // Medio milímetro sobre el suelo: conserva la cara de la plataforma.
    const geometry = clipBelow(placed, RAMPART.floor + 5e-4,
      stairShift > 0 ? (z: number) => (z > 1 ? stairShift : 0) : null);
    placed.dispose();
    owned.push(geometry);
    const mesh = new Mesh(geometry, node.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return { object: group, dispose: () => owned.forEach(geometry => geometry.dispose()) };
}
