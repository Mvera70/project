import type { ElevatedRingSegment } from '@derive/elevated-ring';

type Direction = Readonly<{ x: number; z: number }>;

/**
 * Las tres recetas reutilizables tienen una planta base. Las otras fuentes
 * llevan máscara y mano propias: girarlas por parecido rompería sus bocas.
 */
const BASE_PORTS = {
  straight: [{ x: -1, z: 0 }, { x: 1, z: 0 }],
  turn: [{ x: 0, z: -1 }, { x: 1, z: 0 }],
  diagonal: [{ x: -1, z: -1 }, { x: 1, z: 1 }],
} as const;

function quarterTurn(direction: Direction, turns: number): Direction {
  let result = direction;
  for (let index = 0; index < turns; index++) result = { x: -result.z, z: result.x };
  return result;
}

function samePair(a: readonly Direction[], b: readonly Direction[]): boolean {
  return a.every(one => b.some(other => one.x === other.x && one.z === other.z));
}

/** Ángulo Three.js alrededor del centro de la celda, o null si no hay encaje. */
export function elevatedAssetYaw(segment: Pick<ElevatedRingSegment, 'variant' | 'incoming' | 'outgoing'>): number | null {
  const base = BASE_PORTS[segment.variant as keyof typeof BASE_PORTS];
  if (base === undefined) return null;
  const target = [segment.incoming, segment.outgoing];
  for (let turns = 0; turns < 4; turns++) {
    if (samePair(base.map(direction => quarterTurn(direction, turns)), target)) {
      // Three aplica +Y como X→−Z; un cuarto de vuelta en planta XZ es −Y.
      return turns === 0 ? 0 : -turns * Math.PI / 2;
    }
  }
  return null;
}
