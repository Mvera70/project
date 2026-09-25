// G-23 · Clips de Blender siguiendo el desplazamiento real, sin mover el motor.
import { AnimationMixer, Group, LoopOnce, Mesh, SkinnedMesh, type AnimationAction, type Object3D } from 'three';
import type { LoadedAsset } from '../assets';
import type { Animal } from '@derive/animals';
import { dogGestures } from './animal-gestures';

/** Correr abre la zancada lo mismo que abre las patas (`animal-gestures.ts`). */
const RUN_STRIDE = 1.6;

export class AnimalMotion {
  readonly group = new Group();
  private readonly mixer: AnimationMixer;
  private readonly idle: AnimationAction | undefined;
  private readonly walk: AnimationAction | undefined;
  private readonly flight: AnimationAction | undefined;
  private readonly flee: AnimationAction | undefined;
  private readonly charge: AnimationAction | undefined;
  private readonly attack: AnimationAction | undefined;
  // El valle más vivo · correr, ladrar y jugar: los del GLB si los trae, si no
  // fabricados sobre su esqueleto (`animal-gestures.ts`). Hoy, sólo el perro.
  private readonly run: AnimationAction | undefined;
  private readonly bark: AnimationAction | undefined;
  private readonly play: AnimationAction | undefined;
  private attackStartedAt: number | undefined;
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
    const walk = asset.clips.find(clip => clip.name === 'walk' || clip.name === 'hop');
    this.idle = idle === undefined ? undefined : this.mixer.clipAction(idle).play();
    this.walk = walk === undefined ? undefined : this.mixer.clipAction(walk).play();
    this.flight = asset.clips.find(clip => clip.name === 'flight') === undefined ? undefined
      : this.mixer.clipAction(asset.clips.find(clip => clip.name === 'flight')!).play();
    this.flee = asset.clips.find(clip => clip.name === 'flee') === undefined ? undefined
      : this.mixer.clipAction(asset.clips.find(clip => clip.name === 'flee')!).play();
    this.charge = asset.clips.find(clip => clip.name === 'charge') === undefined ? undefined
      : this.mixer.clipAction(asset.clips.find(clip => clip.name === 'charge')!).play();
    const extra = kind === 'dog' ? dogGestures(asset.clips, object) : [];
    const named = (name: string) => asset.clips.find(clip => clip.name === name) ?? extra.find(clip => clip.name === name);
    const run = named('run');
    const bark = named('bark');
    const play = named('play');
    this.run = run === undefined ? undefined : this.mixer.clipAction(run).play();
    this.bark = bark === undefined ? undefined : this.mixer.clipAction(bark).play();
    this.play = play === undefined ? undefined : this.mixer.clipAction(play).play();
    const attack = asset.clips.find(clip => clip.name === 'attack');
    this.attack = attack === undefined ? undefined : this.mixer.clipAction(attack);
    this.attack?.setLoop(LoopOnce, 1);
    if (this.attack !== undefined) this.attack.clampWhenFinished = true;
    const declaredStride = asset.motion.find(clip => clip.name === 'walk' || clip.name === 'hop')?.strideLength ?? 0.2;
    // Los recursos antiguos del ciervo declaraban 0,2 celdas y ciclaban tan
    // deprisa que las patas parecían fijas entre fotogramas. La receta nueva
    // declara 0,55; este mínimo mantiene compatibles las partidas ya abiertas.
    this.stride = kind === 'deer' ? Math.max(0.55, declaredStride) : declaredStride;
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
    if (delta > 0) this.blend += ((animal.action === 'walk' || speed > 0.002 ? 1 : 0) - this.blend)
      * (1 - Math.exp(-10 * delta));
    const attacking = animal.action === 'attack' && this.attack !== undefined;
    const special = animal.action === 'flight' ? this.flight
      : animal.action === 'flee' ? this.flee
        : animal.action === 'charge' ? this.charge
          : animal.action === 'bark' ? this.bark
            : animal.action === 'play' ? this.play : undefined;
    // Correr es andar más largo: se lleva por la distancia, como la marcha.
    const running = animal.action === 'run' && this.run !== undefined;
    const down = animal.action === 'down';
    if (attacking && this.attackStartedAt === undefined) {
      this.attackStartedAt = seconds;
      this.attack!.reset().play();
    } else if (!attacking && this.attackStartedAt !== undefined) {
      this.attack?.stop();
      this.attackStartedAt = undefined;
    }
    if (this.idle !== undefined) {
      this.idle.time = (seconds + this.phase * this.idle.getClip().duration) % this.idle.getClip().duration;
      this.idle.setEffectiveWeight(attacking || special !== undefined || down ? 0 : 1 - this.blend);
    }
    if (this.walk !== undefined) {
      this.walk.time = ((this.distance / this.stride + this.phase) % 1) * this.walk.getClip().duration;
      this.walk.setEffectiveWeight(attacking || special !== undefined || down || running ? 0 : this.blend);
    }
    if (this.run !== undefined) {
      this.run.time = ((this.distance / (this.stride * RUN_STRIDE) + this.phase) % 1) * this.run.getClip().duration;
      this.run.setEffectiveWeight(running && special === undefined && !attacking && !down ? this.blend : 0);
    }
    for (const clip of [this.flight, this.flee, this.charge, this.bark, this.play]) {
      if (clip === undefined) continue;
      clip.time = (seconds + this.phase * clip.getClip().duration) % clip.getClip().duration;
      clip.setEffectiveWeight(clip === special ? 1 : 0);
    }
    if (attacking) {
      this.attack!.time = Math.min(this.attack!.getClip().duration - 0.001,
        Math.max(0, seconds - this.attackStartedAt!));
      this.attack!.setEffectiveWeight(1);
    }
    this.mixer.update(0);
    this.group.rotation.z = down ? -Math.PI / 2 : 0;
    this.group.position.set(animal.x, floor + (animal.altitude ?? 0), animal.y);
    this.previous = { x: animal.x, y: animal.y };
  }

  get walkWeight(): number { return this.blend; }

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
