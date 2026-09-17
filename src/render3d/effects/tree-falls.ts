import { Group, type Material, type Object3D } from 'three';
import type { Palette } from '@derive/palette';
import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import { scatterTransform, seasonTree } from '../world/forest';

const FALL_SECONDS = 1.5;
const KEEP_SECONDS = 7;
const MOST_SIMULTANEOUS = 4;

interface Fall {
  readonly cell: number;
  readonly root: Group;
  readonly owned: readonly Material[];
  elapsed: number;
}

export interface TreeFallSighting {
  readonly cell: number;
  readonly progress: number;
  readonly fallen: boolean;
}

/**
 * Transición escénica entre dos estados reales del motor.
 *
 * Compara mapas vivos para no fingir que cada hachazo derriba un árbol. La
 * celda queda suprimida del bosque instanciado hasta que el estado escénico la
 * recibe al anochecer. El clon cae con tiempo real y no toca `GameState`.
 */
export class TreeFalls {
  readonly group = new Group();
  readonly suppressed = new Set<number>();
  private previous: Uint8Array | null = null;
  private readonly active = new Map<number, Fall>();
  private ground: (x: number, z: number) => number = () => 0;
  private palette: Palette | null = null;

  constructor(private readonly instance: () => Object3D | undefined) {
    this.group.name = 'Valley_TreeFalls';
  }

  standOn(ground: (x: number, z: number) => number): void { this.ground = ground; }
  season(palette: Palette): void { this.palette = palette; }

  /** Devuelve si hay que reinstanciar el bosque por una supresión nueva. */
  observe(map: ValleyMap, discontinuity = false): boolean {
    if (discontinuity || this.previous === null || this.previous.length !== map.terrain.length) {
      this.reset(map);
      return false;
    }
    let changed = false;
    for (let cell = 0; cell < map.terrain.length; cell += 1) {
      if (this.previous[cell] !== TERRAIN_CODE.forest
        || map.terrain[cell] === TERRAIN_CODE.forest) continue;
      changed = !this.suppressed.has(cell) || changed;
      this.suppressed.add(cell);
      if (this.active.size >= MOST_SIMULTANEOUS || this.active.has(cell)) continue;
      const tree = this.instance();
      if (tree === undefined) continue;
      const owned = this.palette === null ? [] : seasonTree(tree, this.palette);
      const at = scatterTransform(map.width, cell);
      const root = new Group();
      root.name = `FallingTree_${cell}`;
      root.position.set(at.x, this.ground(at.x, at.z), at.z);
      root.rotation.y = at.facing;
      root.scale.setScalar(at.scale);
      root.add(tree);
      this.group.add(root);
      this.active.set(cell, { cell, root, owned, elapsed: 0 });
    }
    this.previous = map.terrain.slice();
    return changed;
  }

  /** Libera supresiones cuando el estado escénico ya contiene el claro. */
  acceptShown(map: ValleyMap): boolean {
    let changed = false;
    for (const cell of [...this.suppressed]) {
      if (map.terrain[cell] === TERRAIN_CODE.forest) continue;
      this.suppressed.delete(cell);
      changed = true;
    }
    return changed;
  }

  step(deltaSeconds: number): void {
    for (const [cell, fall] of this.active) {
      fall.elapsed += Math.max(0, deltaSeconds);
      const t = Math.min(1, fall.elapsed / FALL_SECONDS);
      const eased = 1 - (1 - t) ** 3;
      fall.root.rotation.z = eased * Math.PI * 0.47;
      if (fall.elapsed < KEEP_SECONDS) continue;
      this.retire(cell, fall);
    }
  }

  snapshot(): TreeFallSighting[] {
    return [...this.active.values()].map(fall => ({
      cell: fall.cell,
      progress: Math.min(1, fall.elapsed / FALL_SECONDS),
      fallen: fall.elapsed >= FALL_SECONDS,
    }));
  }

  reset(map?: ValleyMap): void {
    for (const [cell, fall] of this.active) this.retire(cell, fall);
    this.active.clear();
    this.suppressed.clear();
    this.previous = map?.terrain.slice() ?? null;
  }

  dispose(): void { this.reset(); }

  private retire(cell: number, fall: Fall): void {
    this.group.remove(fall.root);
    for (const material of fall.owned) material.dispose();
    this.active.delete(cell);
  }
}
