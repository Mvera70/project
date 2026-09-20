// E0d · Solares de obra procedurales: presentación efímera, no obstáculos.

import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PlannedWork } from './plan';

interface WorkModel {
  readonly object: Group;
  dispose(): void;
}

function stageOf(progress: number): number {
  return progress < 1 / 3 ? 0 : progress < 2 / 3 ? 1 : 2;
}

function build(work: PlannedWork): WorkModel {
  const group = new Group();
  group.name = `Work_${work.id}`;
  group.position.set(work.x, 0.03, work.z);
  const baseGeometry = new BoxGeometry(work.w, 0.08, work.h);
  const baseMaterial = new MeshStandardMaterial({ color: '#76543a', roughness: 1 });
  const base = new Mesh(baseGeometry, baseMaterial);
  base.position.set(work.w / 2, 0.04, work.h / 2);
  base.receiveShadow = true;
  group.add(base);

  const stage = stageOf(work.progress);
  const height = [0.32, 0.62, 0.9][stage]!;
  const frameGeometry = new BoxGeometry(work.w * 0.78, height, 0.1);
  const frameMaterial = new MeshStandardMaterial({ color: stage === 2 ? '#8a9a9d' : '#b17a45', roughness: 0.9 });
  for (const z of [work.h * 0.22, work.h * 0.78]) {
    const frame = new Mesh(frameGeometry, frameMaterial);
    frame.position.set(work.w / 2, height / 2, z);
    frame.castShadow = true;
    group.add(frame);
  }
  return {
    object: group,
    dispose(): void {
      baseGeometry.dispose(); baseMaterial.dispose(); frameGeometry.dispose(); frameMaterial.dispose(); group.clear();
    },
  };
}

/** Registro propio: los ids de obra nunca entran en el registro de edificios. */
export class Works {
  readonly group = new Group();
  private readonly models = new Map<number, WorkModel>();

  constructor() { this.group.name = 'Valley_Works'; }

  add(work: PlannedWork): void {
    this.remove(work.id);
    const model = build(work);
    this.models.set(work.id, model);
    this.group.add(model.object);
  }

  remove(id: number): void {
    const model = this.models.get(id);
    if (model === undefined) return;
    this.group.remove(model.object);
    model.dispose();
    this.models.delete(id);
  }

  clear(): void { for (const id of [...this.models.keys()]) this.remove(id); }
  dispose(): void { this.clear(); }
  get count(): number { return this.models.size; }
}
