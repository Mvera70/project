// La cara de la cantera. 27 sep 2026.
//
// Mientras una obra necesita piedra, la aldea pica en la roca más cercana que
// se alcance andando (`life/resource-sites.ts`, `quarryCells`), y eso se
// dibujaba como los cantos sueltos de siempre: nada decía «aquí se saca
// piedra». Encargos pendientes lo tenía apuntado: «que la roca cambie al
// picarla». Ahora, en esa celda, se levanta el frente de cantera de Astra, y
// cambia con lo que la obra lleva sacado: **entera** al empezar, **explotada**
// a media obra y **agotada** al final.
//
// Decorado: lee el estado y el sitio del día; no toca el motor.

import { Group, type Object3D } from 'three';

export type QuarryStage = 'intact' | 'mined' | 'exhausted';

/** El modelo publicado de cada estado. */
export const QUARRY_ASSETS: Readonly<Record<QuarryStage, string>> = {
  intact: 'quarry-face-intact', mined: 'quarry-face-mined', exhausted: 'quarry-face-exhausted',
};

/**
 * En qué estado está el frente según la piedra sacada de la que pide la obra.
 * TUNE visual: un tercio y cuatro quintos, para que los tres estados se vean
 * en una obra corta.
 */
export function quarryStage(done: number, need: number): QuarryStage {
  const share = need <= 0 ? 1 : done / need;
  if (share < 1 / 3) return 'intact';
  if (share < 0.8) return 'mined';
  return 'exhausted';
}

export interface QuarryFace {
  readonly group: Group;
  /** Qué se ve ahora, para la traza y las pruebas. */
  readonly shown: { cell: number; stage: QuarryStage } | null;
  /**
   * `cell`, la celda que se pica hoy (o `null` si no hay cantera); `toward`,
   * hacia dónde da el frente —la obra—; `model`, una copia del recurso.
   */
  show(cell: number | null, stage: QuarryStage, width: number, toward: { x: number; z: number },
    ground: (x: number, z: number) => number, model: (id: string) => Object3D | undefined): void;
}

export function createQuarryFace(): QuarryFace {
  const group = new Group();
  group.name = 'Valley_QuarryFace';
  let shown: { cell: number; stage: QuarryStage } | null = null;
  return {
    group,
    get shown() { return shown; },
    show(cell, stage, width, toward, ground, model): void {
      if (cell === shown?.cell && stage === shown.stage) return;
      if (cell === null && shown === null) return;
      for (const child of [...group.children]) group.remove(child);
      shown = null;
      if (cell === null) return;
      const piece = model(QUARRY_ASSETS[stage]);
      if (piece === undefined) return;
      const x = cell % width + 0.5, z = Math.floor(cell / width) + 0.5;
      piece.position.set(x, ground(x, z), z);
      // El modelo da el frente a +Z; se gira hacia la obra, que es de donde
      // llega quien pica.
      piece.rotation.y = Math.atan2(toward.x - x, toward.z - z);
      group.add(piece);
      shown = { cell, stage };
    },
  };
}
