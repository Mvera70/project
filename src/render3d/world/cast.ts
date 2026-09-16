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
import type { Actor } from '../contracts';
import type { LoadedAsset } from '../assets';

type Action = NonNullable<ReturnType<AnimationMixer['clipAction']>>;

interface Player {
  readonly object: Object3D;
  readonly mixer: AnimationMixer;
  readonly actions: Map<string, Action>;
  /** Los materiales propios de este aldeano, que hay que soltar con el. */
  readonly owned: Material[];
  /** Lo que lleva en la mano, por clip. Vacio si el catalogo no lo tiene. */
  readonly held: Map<string, Object3D>;
  playing: string | null;
}

/**
 * Que se lleva en la mano en cada clip, y en cual.
 *
 * El clip de cavar esta bien hecho —la espalda se dobla, los brazos bajan— y aun
 * asi no se leia como cavar, porque cavar sin azada no es cavar: es agacharse.
 * Los conectores `hand_l` y `hand_r` los dejo G-04 en el aldeano justo para
 * esto, y hasta ahora no colgaba nada de ellos.
 */
const HELD: Readonly<Record<string, { asset: string; hand: string }>> = {
  work_hoe: { asset: 'hoe', hand: 'hand_r' },
  carry_walk: { asset: 'bundle', hand: 'hand_l' },
};

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
/**
 * Lo que levanta del suelo tener nombre.
 *
 * TUNE: un 8 %. El render 2D ya dibuja al nombrado mas alto que al anonimo
 * —1,8 contra 1,5— y esto es lo mismo dicho en tres dimensiones. D.8 pide que
 * los nombrados se distingan, y la aldea ya tenia un lenguaje para decirlo: no
 * hacia falta inventar otro.
 */
const NAMED_TALLER = 1.08;

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

  /**
   * `prop` da una copia de una herramienta del catalogo, o `undefined` si no la
   * tiene. Sin ella el aldeano trabaja con las manos vacias, que es lo que
   * hacia hasta ahora: un valle a medio catalogar sigue siendo un valle.
   *
   * `instance` recibe el `role` del actor y decide qué modelo clonar —
   * `villager-smith`, `villager-priest`... — y `undefined` si el catálogo no
   * tiene ese oficio todavía, en cuyo caso quien llama cae al aldeano base.
   * `asset` sigue siendo uno solo: los ocho recursos comparten huesos y clips
   * con el mismo nombre (D.4), así que un `AnimationClip` sacado de cualquiera
   * de ellos anima a los demás sin retocar nada.
   */
  constructor(
    private readonly asset: LoadedAsset,
    /**
     * V-15b: recibe **el actor entero**, no sólo su oficio.
     *
     * Antes era `(role) => ...`, y con eso la malla sólo podía depender del
     * oficio — que en este juego son siete y **casi nadie tiene uno**. Un niño,
     * un anciano, un leñador o un albañil no cabían: no son oficios. Ahora la
     * regla vive en `world/models.ts` (`modelFor`) y mira la edad, el oficio y
     * lo que la persona está haciendo, en ese orden.
     */
    private readonly instance: (actor: Actor) => Object3D | undefined,
    private readonly prop?: (id: string) => Object3D | undefined,
  ) {
    this.group.name = 'Valley_Cast';
  }

  /**
   * Que cota tiene el suelo en cada punto.
   *
   * Lo pone quien construye el valle, y cambia cuando cambia el terreno. Por
   * defecto el suelo es plano, que es lo que era hasta que el rio tuvo cauce:
   * sin esto un aldeano flota sobre el camino hundido y se mete en la orilla.
   */
  standOn(ground: (x: number, z: number) => number): void {
    this.ground = ground;
  }

  private ground: (x: number, z: number) => number = () => 0;

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
        const object = this.instance(actor);
        if (object === undefined) continue;
        object.name = `Villager_${actor.id}`;
        object.traverse((child) => { child.userData.villagerId = actor.id; });
        const mixer = new AnimationMixer(object);
        player = {
          object, mixer, actions: new Map(), owned: dress(object, actor.id),
          held: new Map(), playing: null,
        };
        this.players.set(actor.id, player);
        this.group.add(object);
      }

      player.object.position.set(actor.x, this.ground(actor.x, actor.z), actor.z);
      player.object.rotation.set(0, actor.facing, 0);
      // La talla se pone en cada pasada y no al crear: un nino cumple anos sin
      // dejar de ser el mismo actor, y tiene que ir creciendo.
      player.object.scale.setScalar(statureAt(actor.age) * (actor.named ? NAMED_TALLER : 1));
      this.pose(player, actor.clip, actor.clipSeconds);
      this.equip(player, actor.clip);
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

  /**
   * Le pone en la mano lo que pide el clip, y le quita lo demas.
   *
   * La herramienta se cuelga del conector una sola vez y luego solo se enciende
   * y se apaga: colgarla y descolgarla en cada cambio de clip seria rehacer
   * objetos por fotograma, que es lo que D.6 prohibe. Y cuelga del hueso, asi
   * que la anima el mismo esqueleto sin que nadie la mueva a mano.
   */
  private equip(player: Player, clip: string): void {
    const wanted = HELD[clip];
    if (wanted !== undefined && !player.held.has(clip) && this.prop !== undefined) {
      const tool = this.prop(wanted.asset);
      const hand = player.object.getObjectByName(wanted.hand);
      if (tool !== undefined && hand !== undefined) {
        tool.name = `Held_${clip}`;
        // La herramienta no se selecciona: quien la lleva si. Sin esto, tocar la
        // azada no devolvia a nadie.
        tool.traverse((child) => { child.userData.villagerId = player.object.userData.villagerId; });
        hand.add(tool);
        player.held.set(clip, tool);
      }
    }
    for (const [name, tool] of player.held) tool.visible = name === clip;
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

  /** Posiciones de las mallas colocadas, para contrastarlas con sus cuerpos. */
  snapshot(): { id: number; x: number; z: number }[] {
    return [...this.players].map(([id, player]) => ({ id, x: player.object.position.x, z: player.object.position.z }));
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
