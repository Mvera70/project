// G-23 · Clips de Blender siguiendo el desplazamiento real, sin mover el motor.
//
// AN-1 (29 sep 2026) · Cuatro cosas medidas en la matriz de animación y
// corregidas aquí, todas de presentación:
//
//   · **El rumbo es el de la vida.** El cuerpo se giraba hacia el
//     desplazamiento entre dos fotogramas con un umbral de 0,00001 celdas, así
//     que un animal apretado contra una valla oscilaba de cara, y el perro
//     ladraba mirando adonde iba y no al forastero al que la vida lo encara
//     (`companions.ts`, `body.facing`). Cuando `Animal.facing` viene, manda;
//     si no (cuervo, pez, mula, manada de la sierra), se deduce del
//     desplazamiento, pero sólo cuando el cuerpo avanza de verdad.
//   · **Toda carrera va por suelo recorrido.** `charge` y `flee` iban por
//     reloj: el jabalí embestía a 1,25 ciclos por segundo tapando 0,96 celdas
//     por ciclo contra las 0,51 que declara, y el conejo huía a 1,1 saltos por
//     segundo a 2,4 celdas/s. Ahora se llevan como `walk` y `run`: por
//     distancia, con la zancada del catálogo.
//   · **Los gestos entran con mezcla.** Ladrar, jugar, huir, embestir,
//     volar, atacar y despegar entraban y salían a peso 1 de golpe. Un fundido
//     de una décima larga, independiente de la tasa de fotogramas.
//   · **Caer no es un giro instantáneo.** `down` ponía el cuerpo de costado en
//     un fotograma; ahora se tumba en un tercio de segundo.
import { AnimationMixer, Group, LoopOnce, Mesh, SkinnedMesh, type AnimationAction, type Object3D } from 'three';
import type { LoadedAsset } from '../assets';
import type { Animal } from '@derive/animals';
import { dogGestures } from './animal-gestures';

/** Correr abre la zancada lo mismo que abre las patas (`animal-gestures.ts`). */
const RUN_STRIDE = 1.6;
/**
 * TUNE: cuánto salta un conejo que huye respecto a la zancada que declara su
 * clip `flee` (0,26 celdas, medida por los pies al cerrarse). Un clip que va
 * en el sitio no puede decir cuánto vuela cada salto; un conejo huyendo salta
 * metro y medio (0,5–0,6 celdas), o sea ×2,2: a 2,4 celdas/s son cuatro
 * saltos por segundo, y no nueve.
 */
const FLEE_HOP = 2.2;
/**
 * Cuánto tiene que haberse desplazado **en neto** un cuerpo sin rumbo de la
 * vida antes de girarle la cara hacia donde ha ido, en celdas. TUNE: 0,05 (quince
 * centímetros), como `TURN_MIN_PROGRESS` de `body.ts` (0,3) pero más corto, que
 * aquí no hay ruta que rectificar: un cuervo que deriva despacio se gira a los
 * pocos centímetros, y un temblor contra una valla —que no va a ningún sitio—
 * no gira a nadie. Andar sí se mezcla con cualquier avance (el mismo 0,002 de
 * siempre): quedarse quieto deslizando es peor que un pie que se arrastra.
 */
const TURN_PROGRESS = 0.05;
/** Constantes de tiempo de las mezclas, en segundos (63 % del camino). */
const BLEND = { walk: 0.1, gesture: 0.08, down: 0.14 };
/** Una vuelta de la cara por segundo, como `TURN_RATE` de `body.ts` (seis radianes). */
const TURN = 12;

const ease = (seconds: number, delta: number): number => 1 - Math.exp(-delta / seconds);

export class AnimalMotion {
  readonly group = new Group();
  private readonly mixer: AnimationMixer;
  private readonly idle: AnimationAction | undefined;
  private readonly walk: AnimationAction | undefined;
  /** Los gestos cíclicos que sustituyen a andar mientras duran, con su zancada si van por suelo. */
  private readonly gestures = new Map<string, { action: AnimationAction; stride: number | null }>();
  // El valle más vivo · correr, ladrar y jugar: los del GLB si los trae, si no
  // fabricados sobre su esqueleto (`animal-gestures.ts`). Hoy, sólo el perro.
  private readonly run: AnimationAction | undefined;
  // El despegue de la perdiz de Vera: de una vez, desde que echa a volar.
  private readonly takeoff: AnimationAction | undefined;
  private takeoffStartedAt: number | undefined;
  private readonly attack: AnimationAction | undefined;
  private attackStartedAt: number | undefined;
  private readonly stride: number;
  private previous: { x: number; y: number } | undefined;
  /** Desde dónde se mide el avance neto para deducir el rumbo, y el rumbo deducido. */
  private anchor: { x: number; y: number } | undefined;
  private heading: number | undefined;
  private blend = 0;
  private gestureBlend = 0;
  private gestureNow: string | null = null;
  private oneShotBlend = 0;
  private downBlend = 0;
  private distance = 0;
  private readonly phase: number;

  constructor(readonly kind: Animal['kind'], object: Object3D, asset: LoadedAsset, id: number) {
    this.group.name = `Animal_${kind}_${id}`;
    this.group.add(object);
    object.traverse(node => {
      // Sin sombra (27 sep 2026): un animal a esta distancia apenas la deja ver,
      // y cada malla con sombra se dibuja dos veces. Eran 177 llamadas en la villa.
      if (node instanceof Mesh) node.castShadow = false;
      // Y se recorta por pantalla (27 sep 2026): antes se dibujaban todos,
      // estuvieran donde estuvieran. La esfera es la de la geometría en reposo
      // —compartida y calculada una vez por modelo; la de `SkinnedMesh`
      // recorre cada vértice por los huesos y costaba un 2 % de la CPU al
      // crear animales—, agrandada al triple: un ala abierta o un salto no se
      // salen de ella.
      if (node instanceof SkinnedMesh) {
        if (node.geometry.boundingSphere === null) node.geometry.computeBoundingSphere();
        const sphere = node.geometry.boundingSphere!.clone();
        sphere.radius *= 3;
        node.boundingSphere = sphere;
      }
    });
    this.mixer = new AnimationMixer(object);
    const extra = kind === 'dog' ? dogGestures(asset.clips, object) : [];
    const named = (name: string) => asset.clips.find(clip => clip.name === name) ?? extra.find(clip => clip.name === name);
    const declared = (name: string): number | null => asset.motion.find(clip => clip.name === name)?.strideLength ?? null;
    const idle = named('idle');
    const walk = named('walk') ?? named('hop');
    this.idle = idle === undefined ? undefined : this.mixer.clipAction(idle).play();
    this.walk = walk === undefined ? undefined : this.mixer.clipAction(walk).play();
    // La zancada es la que declara el clip, también la del ciervo. Hasta el 27
    // sep se le imponía un mínimo de 0,55 celdas, que su pata (0,30 de largo)
    // no podía dar: el casco patinaba. Su paso nuevo (`plant-gait.cjs`) planta
    // el casco y declara lo que de verdad avanza, 0,333.
    this.stride = declared('walk') ?? declared('hop') ?? 0.2;
    for (const name of ['flight', 'flee', 'charge', 'bark', 'play']) {
      const clip = named(name);
      if (clip === undefined) continue;
      // Huir y embestir avanzan: van por suelo recorrido con su zancada. Volar,
      // ladrar y jugar no tienen zancada y van por reloj.
      const stride = name === 'flee' ? (declared('flee') ?? this.stride * RUN_STRIDE) * FLEE_HOP
        : name === 'charge' ? declared('charge') ?? this.stride * RUN_STRIDE : null;
      this.gestures.set(name, { action: this.mixer.clipAction(clip).play(), stride });
    }
    const run = named('run');
    this.run = run === undefined ? undefined : this.mixer.clipAction(run).play();
    const takeoff = named('takeoff');
    this.takeoff = takeoff === undefined ? undefined : this.mixer.clipAction(takeoff);
    this.takeoff?.setLoop(LoopOnce, 1);
    if (this.takeoff !== undefined) this.takeoff.clampWhenFinished = true;
    const attack = named('attack');
    this.attack = attack === undefined ? undefined : this.mixer.clipAction(attack);
    this.attack?.setLoop(LoopOnce, 1);
    if (this.attack !== undefined) this.attack.clampWhenFinished = true;
    this.phase = ((Math.imul(id, 2654435761) >>> 0) % 1000) / 1000;
  }

  place(animal: Animal, floor: number, seconds: number, delta: number): void {
    const dx = this.previous === undefined ? 0 : animal.x - this.previous.x;
    const dz = this.previous === undefined ? 0 : animal.y - this.previous.y;
    const distance = Math.hypot(dx, dz);
    // Un cambio de jornada puede recolocar el ancla: no es una zancada.
    const step = delta > 0 && distance < 0.5 ? distance : 0;
    const speed = delta > 0 ? step / delta : 0;
    const moving = animal.action === 'walk' || animal.action === 'run' || animal.action === 'charge'
      || animal.action === 'flee' || speed > 0.002;
    // El rumbo: el de la vida si lo trae; si no, el del avance neto desde la
    // última vez que se giró, cuando pasa de `TURN_PROGRESS`. Frente local -X.
    if (animal.facing !== undefined) {
      this.heading = Math.atan2(Math.cos(animal.facing), -Math.sin(animal.facing));
    } else {
      if (this.anchor === undefined || distance >= 0.5) this.anchor = { x: animal.x, y: animal.y };
      const nx = animal.x - this.anchor.x, nz = animal.y - this.anchor.y;
      if (Math.hypot(nx, nz) >= TURN_PROGRESS) { this.heading = Math.atan2(nz, -nx); this.anchor = { x: animal.x, y: animal.y }; }
    }
    if (this.heading !== undefined && delta > 0) {
      const difference = Math.atan2(Math.sin(this.heading - this.group.rotation.y), Math.cos(this.heading - this.group.rotation.y));
      this.group.rotation.y += difference * (1 - Math.exp(-TURN * delta));
    }
    this.distance += step;
    if (delta > 0) this.blend += ((moving ? 1 : 0) - this.blend) * ease(BLEND.walk, delta);
    const takingOff = animal.action === 'takeoff' && this.takeoff !== undefined;
    if (takingOff && this.takeoffStartedAt === undefined) { this.takeoffStartedAt = seconds; this.takeoff!.reset().play(); }
    else if (!takingOff && this.takeoffStartedAt !== undefined) { this.takeoff?.stop(); this.takeoffStartedAt = undefined; }
    const attacking = animal.action === 'attack' && this.attack !== undefined;
    // Un gesto de una vez (golpe o despegue) apaga los demás mientras dura.
    const oneShot = attacking || takingOff;
    const gesture = animal.action !== undefined && this.gestures.has(animal.action) && !oneShot ? animal.action : null;
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
    // Las mezclas: el gesto cíclico entra y sale en una décima larga; cambiar
    // de gesto a gesto (ladrar → jugar) corta, porque los dos son poses
    // plantadas y el fundido entre ellas sí se vería como un tirón.
    if (delta > 0) {
      if (gesture !== null && this.gestureNow !== null && gesture !== this.gestureNow) this.gestureBlend = 0;
      this.gestureBlend += ((gesture !== null ? 1 : 0) - this.gestureBlend) * ease(BLEND.gesture, delta);
      this.oneShotBlend += ((oneShot ? 1 : 0) - this.oneShotBlend) * ease(BLEND.gesture, delta);
      this.downBlend += ((down ? 1 : 0) - this.downBlend) * ease(BLEND.down, delta);
    } else {
      this.gestureBlend = gesture !== null ? 1 : 0;
      this.oneShotBlend = oneShot ? 1 : 0;
      this.downBlend = down ? 1 : 0;
    }
    if (gesture !== null) this.gestureNow = gesture;
    else if (this.gestureBlend < 0.001) this.gestureNow = null;
    const gestureWeight = Math.min(1, this.gestureBlend + this.oneShotBlend + this.downBlend);
    const locomotion = 1 - gestureWeight;
    if (this.idle !== undefined) {
      this.idle.time = (seconds + this.phase * this.idle.getClip().duration) % this.idle.getClip().duration;
      this.idle.setEffectiveWeight(locomotion * (1 - this.blend));
    }
    if (this.walk !== undefined) {
      this.walk.time = ((this.distance / this.stride + this.phase) % 1) * this.walk.getClip().duration;
      this.walk.setEffectiveWeight(locomotion * (running ? 0 : this.blend));
    }
    if (this.run !== undefined) {
      this.run.time = ((this.distance / (this.stride * RUN_STRIDE) + this.phase) % 1) * this.run.getClip().duration;
      this.run.setEffectiveWeight(locomotion * (running ? this.blend : 0));
    }
    for (const [name, { action, stride }] of this.gestures) {
      const clip = action.getClip();
      action.time = stride === null
        ? (seconds + this.phase * clip.duration) % clip.duration
        : ((this.distance / stride + this.phase) % 1) * clip.duration;
      action.setEffectiveWeight(name === this.gestureNow ? this.gestureBlend * (1 - this.oneShotBlend) : 0);
    }
    if (takingOff) {
      this.takeoff!.time = Math.min(this.takeoff!.getClip().duration - 0.001, Math.max(0, seconds - this.takeoffStartedAt!));
      this.takeoff!.setEffectiveWeight(this.oneShotBlend);
      this.attack?.setEffectiveWeight(0);
    } else if (attacking) {
      this.attack!.time = Math.min(this.attack!.getClip().duration - 0.001,
        Math.max(0, seconds - this.attackStartedAt!));
      this.attack!.setEffectiveWeight(this.oneShotBlend);
    }
    this.mixer.update(0);
    const settle = this.downBlend * this.downBlend * (3 - 2 * this.downBlend);
    this.group.rotation.z = -Math.PI / 2 * settle;
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
