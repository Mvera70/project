// G-23 · Clips de Blender siguiendo el desplazamiento real, sin mover el motor.
import { AnimationMixer, Group, Mesh, SkinnedMesh, type AnimationAction, type Object3D } from 'three';
import type { LoadedAsset } from '../assets';
import type { Animal } from '@derive/animals';

export class AnimalMotion {
  readonly group = new Group();
  private readonly mixer: AnimationMixer;
  private readonly idle: AnimationAction | undefined;
  private readonly walk: AnimationAction | undefined;
  private readonly stride: number;
  private previous: { x: number; y: number } | undefined;
  private blend = 0;
  private distance = 0;
  private readonly phase: number;

  constructor(readonly kind: Animal['kind'], object: Object3D, asset: LoadedAsset, id: number) {
    this.group.name = `Animal_${kind}_${id}`;
    this.group.add(object);
    object.traverse(node => {
      if (node instanceof Mesh) { node.castShadow = true; node.frustumCulled = false; }
    });
    this.mixer = new AnimationMixer(object);
    const idle = asset.clips.find(clip => clip.name === 'idle');
    const walk = asset.clips.find(clip => clip.name === 'walk');
    this.idle = idle === undefined ? undefined : this.mixer.clipAction(idle).play();
    this.walk = walk === undefined ? undefined : this.mixer.clipAction(walk).play();
    this.stride = asset.motion.find(clip => clip.name === 'walk')?.strideLength ?? 0.2;
    this.phase = ((Math.imul(id, 2654435761) >>> 0) % 1000) / 1000;
  }

  place(animal: Animal, floor: number, seconds: number, delta: number): void {
    const dx = this.previous === undefined ? 0 : animal.x - this.previous.x;
    const dz = this.previous === undefined ? 0 : animal.y - this.previous.y;
    const distance = Math.hypot(dx, dz);
    // Un cambio de jornada puede recolocar el ancla: no es una zancada.
    const step = delta > 0 && distance < 0.5 ? distance : 0;
    const speed = delta > 0 ? step / delta : 0;
    if (step > 0.00001) {
      const target = Math.atan2(dz, -dx); // Frente local -X.
      const difference = Math.atan2(Math.sin(target - this.group.rotation.y), Math.cos(target - this.group.rotation.y));
      this.group.rotation.y += difference * (1 - Math.exp(-12 * delta));
    }
    this.distance += step;
    if (delta > 0) this.blend += ((speed > 0.002 ? 1 : 0) - this.blend) * (1 - Math.exp(-10 * delta));
    if (this.idle !== undefined) {
      this.idle.time = (seconds + this.phase * this.idle.getClip().duration) % this.idle.getClip().duration;
      this.idle.setEffectiveWeight(1 - this.blend);
    }
    if (this.walk !== undefined) {
      this.walk.time = ((this.distance / this.stride + this.phase) % 1) * this.walk.getClip().duration;
      this.walk.setEffectiveWeight(this.blend);
    }
    this.mixer.update(0);
    this.group.position.set(animal.x, floor, animal.y);
    this.previous = { x: animal.x, y: animal.y };
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
    // Geometrías/materiales pertenecen a la biblioteca; cada clon sí posee su esqueleto.
    const skeletons = new Set<SkinnedMesh['skeleton']>();
    this.group.traverse(node => { if (node instanceof SkinnedMesh) skeletons.add(node.skeleton); });
    for (const skeleton of skeletons) skeleton.dispose();
    this.group.removeFromParent();
  }
}
