// Punto 3 · Visibilidad del asalto. Sólo presentación; no toca el mapa.

import { Vector3, type Camera } from 'three';

/** Un volumen que debe seguir siendo legible a través del bosque. */
export interface ForestRevealTarget {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Radio visual en unidades de escena, no alcance ni colisión. */
  readonly radius: number;
}

/** Centro y radio aproximado de la copa de una instancia. */
export interface ForestOccluder {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
}

/**
 * Índices de árboles que tapan alguno de los objetivos desde esta cámara.
 *
 * La cámara es ortográfica: en su espacio local, `x/y` son exactamente el
 * plano visible y `z` dice qué está delante. Comparar ahí evita una franja fija
 * del mapa que sólo funcionaría desde el ángulo inicial. El radio de la copa se
 * suma al del objetivo para atenuar el árbol entero antes de que su centro lo
 * cruce; un árbol detrás del objetivo nunca entra.
 */
export function forestOccluders(
  trees: readonly ForestOccluder[],
  camera: Camera,
  targets: readonly ForestRevealTarget[],
): number[] {
  if (targets.length === 0 || trees.length === 0) return [];
  camera.updateMatrixWorld(true);
  const inView = targets.map(target => ({
    point: new Vector3(target.x, target.y, target.z).applyMatrix4(camera.matrixWorldInverse),
    radius: Math.max(0, target.radius),
  }));
  const revealed: number[] = [];
  const tree = new Vector3();
  for (let slot = 0; slot < trees.length; slot += 1) {
    const candidate = trees[slot]!;
    tree.set(candidate.x, candidate.y, candidate.z).applyMatrix4(camera.matrixWorldInverse);
    const blocks = inView.some(target => {
      // En Three la cámara mira hacia -Z: un valor mayor (menos negativo) está
      // más cerca. El epsilon deja quieto lo que comparte plano con el objetivo.
      if (tree.z <= target.point.z + 0.01 || tree.z >= 0) return false;
      const reach = target.radius + candidate.radius;
      return (tree.x - target.point.x) ** 2 + (tree.y - target.point.y) ** 2 <= reach ** 2;
    });
    if (blocks) revealed.push(slot);
  }
  return revealed;
}
