// G-06 · The villagers on stage. design.md D.5, D.6.
//
// One clone of the shared villager per actor, each with its own skeleton and its
// own mixer, each posed from the `Actor` that G-05 derived. The clip's time
// comes from the actor and not from a delta, so a paused game freezes mid-stride
// and a clock that jumps forwards lands where it should without playing the gap.
//
// Ownership, which D.5 insists on: this owns the clones and the mixers. The
// geometry, the materials and the clips belong to the asset library and are
// shared by every villager in the valley. Disposing a clone must not touch them.

import {
  AnimationMixer, Color, Group, type AnimationClip, type Material, type Object3D,
} from 'three';
import type { VillagerId } from '@engine/state';
import type { Actor } from '../actors';
import type { LoadedAsset } from '../assets';

type Action = NonNullable<ReturnType<AnimationMixer['clipAction']>>;

interface Player {
  readonly object: Object3D;
  readonly mixer: AnimationMixer;
  readonly actions: Map<string, Action>;
  /** Los materiales propios de este aldeano, que hay que soltar con el. */
  readonly owned: Material[];
  playing: string | null;
}

/**
 * La talla de alguien de esta edad, contra la de un adulto.
 *
 * El aldeano del catalogo mide 0,65 celdas (D.6.2) y esa es la talla de un
 * adulto. Un nino de seis anos no mide lo mismo, y desde arriba —que es donde no
 * hay fichas que leer— la diferencia de tamano es lo unico que dice que ahi hay
 * un nino. El viejo encoge un poco, que tambien es verdad.
 *
 * TUNE: de 0,62 al nacer a 1 a los dieciseis. Curva y no recta porque un nino
 * crece deprisa de pequeno; con una recta, los de ocho anos parecian enanos.
 */
function statureAt(age: number): number {
  if (age >= 60) return 0.97 - Math.min(0.05, (age - 60) * 0.003);
  if (age >= 16) return 1;
  return 0.62 + 0.38 * Math.sqrt(Math.max(0, age) / 16);
}

/**
 * Un numero estable entre 0 y 1 sacado de un identificador.
 *
 * No de un flujo de azar: §4.3 prohibe que el render consuma azar, y ademas una
 * aldea que se cambiara de ropa en cada fotograma seria peor que una vestida
 * toda igual. El mismo aldeano viste lo mismo en todas las maquinas y para
 * siempre.
 */
function stable(id: number, salt: number): number {
  const mixed = Math.imul((id + 1) * 2_246_822_507 + salt * 374_761_393, 2_654_435_761) >>> 0;
  return (mixed % 100_003) / 100_003;
}

/**
 * Cuanto puede variar un color de una persona a otra.
 *
 * TUNE: en tono, media vuelta de nada —cuatro centesimas— y en claridad un
 * quinto. Lo justo para que una multitud deje de leerse como copias sin que
 * aparezca nadie vestido de un color que P1 no eligio: la paleta sigue mandando,
 * esto solo la despeina.
 */
const CLOTH_HUE = 0.04;
const CLOTH_LIGHT = 0.2;

export class Cast {
  readonly group = new Group();
  private readonly players = new Map<VillagerId, Player>();

  constructor(
    private readonly asset: LoadedAsset,
    private readonly instance: () => Object3D | undefined,
  ) {
    this.group.name = 'Valley_Cast';
  }

  /**
   * Put the stage in the state these actors describe.
   *
   * Whoever is not in the list goes: D.6 asks that a death or a departure remove
   * the actor rather than leave it walking, and the honest way to do that is to
   * treat the list as the whole truth every frame instead of listening for
   * events that a lethargy would swallow.
   */
  show(actors: readonly Actor[]): void {
    const present = new Set<VillagerId>();

    for (const actor of actors) {
      present.add(actor.id);
      let player = this.players.get(actor.id);
      if (player === undefined) {
        const object = this.instance();
        if (object === undefined) continue;
        object.name = `Villager_${actor.id}`;
        object.traverse((child) => { child.userData.villagerId = actor.id; });
        const mixer = new AnimationMixer(object);
        player = { object, mixer, actions: new Map(), owned: dress(object, actor.id), playing: null };
        this.players.set(actor.id, player);
        this.group.add(object);
      }

      player.object.position.set(actor.x, 0, actor.z);
      player.object.rotation.set(0, actor.facing, 0);
      // La talla se pone en cada pasada y no al crear: un nino cumple anos sin
      // dejar de ser el mismo actor, y tiene que ir creciendo.
      player.object.scale.setScalar(statureAt(actor.age));
      this.pose(player, actor.clip, actor.clipSeconds);
    }

    for (const id of [...this.players.keys()]) {
      if (!present.has(id)) this.retire(id);
    }
  }

  /**
   * Set a clone to one instant of one clip.
   *
   * The mixer is driven to an absolute time rather than advanced by a delta.
   * That is what keeps the picture a function of the instant: two paints of the
   * same instant give the same pose, however many frames happened in between,
   * and a suspended tab that wakes up does not have to replay anything.
   */
  private pose(player: Player, clip: string, seconds: number): void {
    let action = player.actions.get(clip);
    if (action === undefined) {
      const found = this.asset.clips.find((candidate: AnimationClip) => candidate.name === clip);
      if (found === undefined) return;
      const made = player.mixer.clipAction(found);
      if (made === null) return;
      action = made;
      player.actions.set(clip, action);
    }
    if (player.playing !== clip) {
      for (const [name, other] of player.actions) if (name !== clip) other.stop();
      action.reset().play();
      player.playing = clip;
    }
    action.time = seconds;
    player.mixer.setTime(seconds);
  }

  private retire(id: VillagerId): void {
    const player = this.players.get(id);
    if (player === undefined) return;
    player.mixer.stopAllAction();
    player.mixer.uncacheRoot(player.object);
    this.group.remove(player.object);
    // La ropa si era suya: se clono para el y se suelta con el. Lo que no se
    // toca es la geometria, que es de la biblioteca.
    for (const material of player.owned) material.dispose();
    // The clone's own nodes go; the geometry and the materials do not, because
    // they were never this actor's to free. Freeing them here would take the
    // rest of the village with the first villager who died.
    this.players.delete(id);
  }

  get count(): number {
    return this.players.size;
  }

  clear(): void {
    for (const id of [...this.players.keys()]) this.retire(id);
  }

  dispose(): void {
    this.clear();
  }
}

/**
 * Viste a un aldeano con lo suyo.
 *
 * Cada uno se lleva su propia copia de los materiales, retocada a partir de la
 * paleta. **No cuesta una llamada de dibujo mas**: cada clon ya tiene sus
 * mallas, y lo que cuenta una llamada es la malla, no el material. Lo que si
 * cuesta es una copia del material por persona, y por eso se hace una vez al
 * entrar en escena y no en cada pasada.
 *
 * Sin esto, veintisiete personas en pantalla eran veintisiete copias del mismo
 * senor. La variacion es pequena a proposito: la paleta de P1 sigue mandando y
 * esto solo la despeina.
 */
function dress(object: Object3D, id: number): Material[] {
  const owned: Material[] = [];
  const tone = new Color();
  object.traverse((child) => {
    const mesh = child as Object3D & { isMesh?: boolean; material?: Material | Material[] };
    if (mesh.isMesh !== true || mesh.material === undefined || Array.isArray(mesh.material)) return;
    const source = mesh.material as Material & { color?: Color; clone(): Material };
    if (source.color === undefined) return;
    const copy = source.clone() as Material & { color: Color };
    tone.copy(source.color);
    const hsl = { h: 0, s: 0, l: 0 };
    tone.getHSL(hsl);
    copy.color.setHSL(
      (hsl.h + (stable(id, 3) - 0.5) * 2 * CLOTH_HUE + 1) % 1,
      hsl.s,
      Math.max(0.08, Math.min(0.92, hsl.l * (1 + (stable(id, 5) - 0.5) * 2 * CLOTH_LIGHT))),
    );
    mesh.material = copy;
    owned.push(copy);
  });
  return owned;
}
