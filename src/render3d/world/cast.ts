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
  AnimationMixer, Color, DoubleSide, Group, LoopOnce, Mesh, MeshBasicMaterial, Quaternion, RingGeometry,
  Vector3, type AnimationClip, type Material, type Object3D,
} from 'three';
import type { VillagerId } from '@engine/state';
import type { Actor, RagdollPose, RagdollSeed, RagdollSeedPart } from '../contracts';
import type { LoadedAsset } from '../assets';
import { actionClips } from '../action-clips';
import { clipTime, combatClip, STRIKE_AT, STRIKE_HEAD, VILLAGER_CLIPS, type ClipName } from '../clips';
import { WorkChips } from '../effects/work-chips';
import { handTool } from '../hand-tools';
import { displayScaleFor, modelFor } from './models';

type Action = NonNullable<ReturnType<AnimationMixer['clipAction']>>;

/**
 * VZ-5 · el color con el que se enciende a quien se sigue, y cuánto.
 *
 * Es el oro de la piel (`--skin-sun`, #C39A3F, muestreado del disco del sol del
 * prototipo 01): el juego ya usa ese oro para decir «mira aquí» —la hoja de
 * roble del hito, los puntos de la crónica— así que seguir a alguien habla el
 * mismo idioma. La fuerza es baja a propósito: se busca que el cuerpo destaque
 * sobre el prado, no que parezca una farola.
 */
const HIGHLIGHT = 0xC39A3F;
/**
 * Y **cuánto**, que es lo que esta ronda baja.
 *
 * Estaba en 1 —emisión de oro a tope en toda la ropa del seguido— y el dueño
 * del diseño lo cortó al verlo: «lo de iluminarse es un poco exagerado; quizás
 * debería hacerse mucho más sutil». Tenía razón: lo que identifica a quien se
 * sigue es el anillo del suelo (es lo que la ficha promete, «rings them on the
 * map»), y la ropa encendida sólo tiene que **confirmar** que es ése, no
 * convertirlo en una farola. A 0,22 la tela se calienta lo justo para que se
 * distinga del vecino sin dejar de parecer tela.
 */
/**
 * El anillo que se le pone en el suelo, en celdas de radio.
 *
 * Encender la ropa sola no bastaba: medido en el juego, a la distancia a la que
 * se juega el cuerpo mide unos pocos píxeles y la diferencia se confundía con
 * el color de su propia tela. El anillo se ve de un vistazo y es además lo que
 * la ficha promete —«marks them on the map»—. Va pegado al suelo, sin escribir
 * profundidad, para no pelearse con el prado.
 */
const RING_INNER = 0.34;
const RING_OUTER = 0.46;
const HIGHLIGHT_STRENGTH = 0.22;

interface Player {
  readonly model: string;
  readonly object: Object3D;
  readonly mixer: AnimationMixer;
  readonly actions: Map<string, Action>;
  /** Los materiales propios de este aldeano, que hay que soltar con el. */
  readonly owned: Material[];
  /** Lo que lleva en la mano, por clip. Vacio si el catalogo no lo tiene. */
  readonly held: Map<string, Object3D>;
  /** Pose local publicada, para que una jornada nueva no herede traslaciones del ragdoll. */
  readonly bind: Map<string, { readonly position: Vector3; readonly rotation: Quaternion }>;
  playing: string | null;
  previous: Action | null;
  changedAt: number;
  ragdolled: boolean;
  /** IA-anim · Fase del gesto de herramienta en el pintado anterior, para ver el golpe. */
  strikePhase?: number;
  strikes?: number;
}

/**
 * Las cápsulas siguen el esqueleto publicado, no una segunda figura inventada.
 * El orden es también el orden de padres: permite reconstruir las matrices
 * locales después de recibir una pose absoluta de Rapier.
 */
const RAGDOLL_SEGMENTS: readonly {
  readonly bone: string; readonly end: string; readonly parent: string | null;
}[] = [
  { bone: 'hips', end: 'spine', parent: null },
  { bone: 'spine', end: 'head', parent: 'hips' },
  { bone: 'head', end: 'head', parent: 'spine' },
  { bone: 'upperarmL', end: 'forearmL', parent: 'spine' },
  { bone: 'forearmL', end: 'handL', parent: 'upperarmL' },
  { bone: 'upperarmR', end: 'forearmR', parent: 'spine' },
  { bone: 'forearmR', end: 'handR', parent: 'upperarmR' },
  { bone: 'thighL', end: 'shinL', parent: 'hips' },
  { bone: 'shinL', end: 'footL', parent: 'thighL' },
  { bone: 'thighR', end: 'shinR', parent: 'hips' },
  { bone: 'shinR', end: 'footR', parent: 'thighR' },
];

/**
 * Que se lleva en la mano en cada clip, y en cual.
 *
 * El clip de cavar esta bien hecho —la espalda se dobla, los brazos bajan— y aun
 * asi no se leia como cavar, porque cavar sin azada no es cavar: es agacharse.
 * Los conectores `hand_l` y `hand_r` los dejo G-04 en el aldeano justo para
 * esto, y hasta ahora no colgaba nada de ellos.
 */
interface HeldSpec {
  readonly key: string;
  readonly asset: string;
  readonly hand: string;
  readonly scale?: number;
  /** Sólo los gestos viejos tienen sustituto procedimental. */
  readonly fallback?: boolean;
  /**
   * G-40 · Giro de agarre para un recurso con `grip` construido con el mango en
   * +Y y la cabeza en el eje X (hacha y pico). Es el mismo que lleva dentro el
   * respaldo de `hand-tools.ts`, medido en el banco de gestos.
   */
  readonly turn?: readonly [number, number, number, number];
}

/** El agarre de hacha y pico, medido en el banco de gestos (`hand-tools.ts`). */
const HAFT_GRIP: readonly [number, number, number, number] = [0.6794, 0.2790, 0.6522, 0.1878];

const HELD: Readonly<Record<string, Omit<HeldSpec, 'key'>>> = {
  work_hoe: { asset: 'hoe', hand: 'hand_r', fallback: true },
  carry_walk: { asset: 'bundle', hand: 'hand_l' },
  hammer: { asset: 'hammer', hand: 'hand_r', fallback: true },
  chop: { asset: 'axe', hand: 'hand_r', fallback: true, turn: HAFT_GRIP },
  mine: { asset: 'pickaxe', hand: 'hand_r', fallback: true, turn: HAFT_GRIP },
  drink: { asset: 'cup', hand: 'hand_r', fallback: true },
};

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
  /** IA-anim · Astillas de los golpes de hacha y pico; el renderer las avanza. */
  readonly chips: WorkChips;
  /** IA-anim · Aviso de cada golpe, para que el árbol lo acuse. */
  onStrike: ((at: Vector3, kind: 'wood' | 'stone', seed: number) => void) | null = null;
  private readonly players = new Map<VillagerId, Player>();
  private readonly extraClips: AnimationClip[];

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
    // Fuera de `group` y de `mark`: las pruebas leen sus hijos por índice.
    this.chips = new WorkChips();
    this.ring = new Mesh(
      new RingGeometry(RING_INNER, RING_OUTER, 28),
      new MeshBasicMaterial({
        // Y el anillo, más callado: 0,55 en vez de 0,85, por lo mismo que la
        // ropa. Sigue siendo lo que se ve de un vistazo —es su trabajo— pero
        // deja de ser el objeto más brillante de la pantalla.
        color: HIGHLIGHT, transparent: true, opacity: 0.55,
        depthWrite: false, side: DoubleSide,
      }),
    );
    this.ring.name = 'Valley_Cast_Ring';
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 3;
    this.ring.visible = false;
    // **En su propio grupo, no en el del reparto.** `cast.group.children` son
    // los cuerpos y varias pruebas los leen por índice: metiendo el anillo ahí,
    // el primer hijo dejaba de ser el primer aldeano y caían siete.
    this.mark.name = 'Valley_Cast_Mark';
    this.mark.add(this.ring);
    const idle = asset.clips.find(clip => clip.name === 'idle');
    this.extraClips = idle === undefined ? [] : actionClips(idle);
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

  /**
   * Enciende a uno y apaga al anterior. `null` apaga y no enciende a nadie.
   *
   * Idempotente a propósito: `renderer.track` la llama en cada fotograma desde
   * VZ-4, y volver a pintar los mismos dos colores sesenta veces por segundo
   * sería trabajo por nada.
   */
  highlight(id: VillagerId | null): void {
    if (id === this.lit) return;
    this.dim();
    this.lit = id;
    if (id === null) return;
    const player = this.players.get(id);
    if (player === undefined) return;
    for (const material of player.owned) {
      const lightable = material as Material & { emissive?: Color; emissiveIntensity?: number };
      if (lightable.emissive === undefined) continue;
      this.wasLit.set(material, {
        color: lightable.emissive.clone(),
        intensity: lightable.emissiveIntensity ?? 1,
      });
      lightable.emissive.setHex(HIGHLIGHT);
      lightable.emissiveIntensity = HIGHLIGHT_STRENGTH;
    }
  }

  /** Devuelve a quien estuviera encendido el color que traía. */
  private dim(): void {
    for (const [material, before] of this.wasLit) {
      const lightable = material as Material & { emissive?: Color; emissiveIntensity?: number };
      if (lightable.emissive === undefined) continue;
      lightable.emissive.copy(before.color);
      lightable.emissiveIntensity = before.intensity;
    }
    this.wasLit.clear();
  }

  private ground: (x: number, z: number) => number = () => 0;

  /**
   * VZ-5 · **A quién sigue el jugador, encendido.**
   *
   * Seguir a alguien centraba la cámara en él y nada más: en un valle con
   * ochenta personas del tamaño de un dedal, saber a cuál sigues era imposible.
   * Lo pidió el dueño del diseño: «lo de la silueta del aldeano que se resalte
   * y que lo siga, lo quiero». La cámara ya va detrás desde VZ-4; esto es el
   * resalte.
   *
   * **Se enciende su propia ropa, no una pieza nueva encima.** `dress` clona
   * el material de cada malla para cada aldeano —es lo que les da su color de
   * tela— así que subirle la emisión a uno no toca a nadie más. Un contorno
   * postizo habría que clonarlo y posarlo cada fotograma sobre un cuerpo con
   * esqueleto; esto son dos colores.
   *
   * Y se guarda lo que había para devolverlo: un aldeano que deja de seguirse
   * tiene que volver a ser uno cualquiera.
   */
  private lit: VillagerId | null = null;

  private wasLit = new Map<Material, { color: Color; intensity: number }>();

  /** El anillo del suelo. Uno, reutilizado: sólo se sigue a una persona. */
  private readonly ring: Mesh;

  /** Donde vive el anillo, para que lo cuelgue quien monta la escena. */
  readonly mark = new Group();

  /**
   * Put the stage in the state these actors describe.
   *
   * Whoever is not in the list goes: D.6 asks that a death or a departure remove
   * the actor rather than leave it walking, and the honest way to do that is to
   * treat the list as the whole truth every frame instead of listening for
   * events that a lethargy would swallow.
   */
  show(actors: readonly Actor[], ragdolls: readonly RagdollPose[] = []): void {
    const present = new Set<VillagerId>();
    const physical = new Map(ragdolls.map((pose) => [pose.id, pose]));

    for (const actor of actors) {
      present.add(actor.id);
      let player = this.players.get(actor.id);
      if (player !== undefined && player.model !== modelFor(actor)) { this.retire(actor.id); player = undefined; }
      if (player === undefined) {
        const object = this.instance(actor);
        if (object === undefined) continue;
        object.name = `Villager_${actor.id}`;
        object.traverse((child) => { child.userData.villagerId = actor.id; });
        const mixer = new AnimationMixer(object);
        player = {
          model: modelFor(actor),
          object, mixer, actions: new Map(), owned: dress(object, actor.id),
          held: new Map(), bind: bindPose(object), playing: null, previous: null, changedAt: 0, ragdolled: false,
        };
        this.players.set(actor.id, player);
        this.group.add(object);
      }

      player.object.position.set(actor.x, actor.y ?? this.ground(actor.x, actor.z), actor.z);
      player.object.rotation.set(0, actor.facing, 0);
      // La talla se pone en cada pasada y no al crear: un nino cumple anos sin
      // dejar de ser el mismo actor, y tiene que ir creciendo.
      const scale = displayScaleFor(actor);
      player.object.scale.setScalar(scale);
      // La zancada del recurso también se escala: un niño necesita más pasos
      // para recorrer la misma distancia, un adulto realzado necesita menos.
      const seconds = actor.clip === 'walk' || actor.clip === 'carry_walk' || actor.clip === 'flee'
        ? clipTime(actor.clip, actor.travelled / scale, 0, 0) : actor.clipSeconds;
      const ragdoll = physical.get(actor.id);
      if (player.ragdolled && ragdoll === undefined) this.leaveRagdoll(player);
      this.pose(player, actor.clip, seconds, actor.poseSeconds ?? actor.clipSeconds);
      this.equip(player, actor);
      this.strike(player, actor, seconds);
      if (ragdoll !== undefined) this.applyRagdoll(player, ragdoll);
    }

    for (const id of [...this.players.keys()]) {
      if (!present.has(id)) this.retire(id);
    }

    // El anillo va donde esté quien se sigue, y se apaga si no se sigue a
    // nadie o si esa persona ya no está en pantalla.
    const lit = this.lit === null ? undefined : this.players.get(this.lit);
    this.ring.visible = lit !== undefined;
    if (lit !== undefined) {
      this.ring.position.set(
        lit.object.position.x,
        lit.object.position.y + 0.02,
        lit.object.position.z,
      );
    }
  }

  /**
   * Captura la pose canónica de nacimiento de un ragdoll.
   *
   * Se evalúa aquí `fall(0)`, aunque el fotograma visible hubiese avanzado:
   * así suspender una pestaña o pintar a 15/60 fps no cambia el impulso inicial.
   * La talla ya está en `object.scale`, incluida la de niños y nombrados.
   */
  captureRagdoll(id: VillagerId, bornAt: number,
    placement?: { readonly x: number; readonly y?: number; readonly z: number; readonly facing: number }): RagdollSeed | null {
    const player = this.players.get(id);
    if (player === undefined) return null;
    if (placement !== undefined) {
      player.object.position.set(placement.x, placement.y ?? this.ground(placement.x, placement.z), placement.z);
      player.object.rotation.set(0, placement.facing, 0);
    }
    this.restoreBind(player);
    player.mixer.stopAllAction();
    player.playing = null;
    player.previous = null;
    this.pose(player, 'fall', 0, 0);
    player.object.updateMatrixWorld(true);

    const parts: RagdollSeedPart[] = [];
    const up = new Vector3(0, 1, 0);
    for (const segment of RAGDOLL_SEGMENTS) {
      const bone = player.object.getObjectByName(segment.bone);
      const endBone = player.object.getObjectByName(segment.end);
      if (bone === undefined || endBone === undefined) return null;
      const from = bone.getWorldPosition(new Vector3());
      let to = endBone.getWorldPosition(new Vector3());
      // La cabeza no tiene otro hueso por encima. Su cápsula prolonga el
      // último tramo del cuello a la escala real del rig.
      if (segment.bone === segment.end) {
        const neck = player.object.getObjectByName('spine')?.getWorldPosition(new Vector3()) ?? from.clone();
        const direction = from.clone().sub(neck).normalize();
        to = from.clone().add(direction.lengthSq() === 0 ? new Vector3(0, 0.08, 0) : direction.multiplyScalar(0.08 * player.object.scale.y));
      }
      const length = Math.max(0.025, from.distanceTo(to));
      const radius = segment.bone === 'head'
        ? Math.max(0.04 * player.object.scale.y, Math.min(0.06, length * 0.55))
        : Math.max(0.018, Math.min(0.055, length * 0.24));
      const bodyRotation = new Quaternion().setFromUnitVectors(up, to.clone().sub(from).normalize());
      const boneRotation = bone.getWorldQuaternion(new Quaternion());
      const hingeAxis = new Vector3(1, 0, 0).applyQuaternion(boneRotation).normalize();
      const centre = from.clone().add(to).multiplyScalar(0.5);
      parts.push({
        bone: segment.bone,
        parent: segment.parent,
        joint: { x: from.x, y: from.y, z: from.z },
        hingeAxis: { x: hingeAxis.x, y: hingeAxis.y, z: hingeAxis.z },
        body: {
          at: { x: centre.x, y: centre.y, z: centre.z },
          rotation: { x: bodyRotation.x, y: bodyRotation.y, z: bodyRotation.z, w: bodyRotation.w },
          halfLength: Math.max(0.006, length / 2 - radius), radius,
        },
        boneAt: { x: from.x, y: from.y, z: from.z },
        boneRotation: { x: boneRotation.x, y: boneRotation.y, z: boneRotation.z, w: boneRotation.w },
      });
    }
    return { id, bornAt, parts };
  }

  /** Pasa una pose mundial de Rapier al espacio local de cada hueso. */
  private applyRagdoll(player: Player, pose: RagdollPose): void {
    player.object.updateMatrixWorld(true);
    for (const part of pose.bones) {
      const bone = player.object.getObjectByName(part.name);
      if (bone === undefined || bone.parent === null) continue;
      const worldAt = new Vector3(part.at.x, part.at.y, part.at.z);
      bone.position.copy(bone.parent.worldToLocal(worldAt));
      const parentRotation = bone.parent.getWorldQuaternion(new Quaternion()).invert();
      bone.quaternion.copy(parentRotation.multiply(new Quaternion(
        part.rotation.x, part.rotation.y, part.rotation.z, part.rotation.w,
      )));
      bone.updateMatrixWorld(true);
    }
    player.ragdolled = true;
  }

  private restoreBind(player: Player): void {
    for (const [name, bind] of player.bind) {
      const bone = player.object.getObjectByName(name);
      if (bone === undefined) continue;
      bone.position.copy(bind.position);
      bone.quaternion.copy(bind.rotation);
    }
    player.object.updateMatrixWorld(true);
  }

  private leaveRagdoll(player: Player): void {
    this.restoreBind(player);
    player.mixer.stopAllAction();
    player.playing = null;
    player.previous = null;
    player.ragdolled = false;
  }

  /**
   * Set a clone to one instant of one clip.
   *
   * The mixer is driven to an absolute time rather than advanced by a delta.
   * That is what keeps the picture a function of the instant: two paints of the
   * same instant give the same pose, however many frames happened in between,
   * and a suspended tab that wakes up does not have to replay anything.
   */
  private pose(player: Player, clip: string, seconds: number, now: number): void {
    let action = player.actions.get(clip);
    if (action === undefined) {
      const found = [...this.asset.clips, ...this.extraClips].find((candidate: AnimationClip) => candidate.name === clip);
      if (found === undefined) return;
      const made = player.mixer.clipAction(found);
      if (made === null) return;
      action = made;
      if (VILLAGER_CLIPS[clip as ClipName]?.loop === false) {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      player.actions.set(clip, action);
    }
    // Un gesto fechado no puede mezclarse desde el fotograma que llegamos a
    // ver: saltar directamente a su final debe dar la misma pose que verlo
    // entero. También al salir de él se descarta el historial del mixer.
    if (combatClip(clip) || (player.playing !== null && combatClip(player.playing))) {
      for (const other of player.actions.values()) if (other !== action) other.stop();
      player.previous = null;
      player.playing = clip;
      action.play();
      action.enabled = true;
      action.paused = false;
      action.setEffectiveWeight(1);
      action.time = seconds;
      player.mixer.update(0);
      return;
    }
    if (player.playing !== clip) {
      player.previous?.stop();
      player.previous = player.playing === null ? null : player.actions.get(player.playing) ?? null;
      player.changedAt = now;
      action.reset().play();
      player.playing = clip;
    }
    const weight = Math.min(1, Math.max(0, (now - player.changedAt) / 0.22));
    action.setEffectiveWeight(player.previous === null ? 1 : weight);
    if (player.previous !== null) {
      player.previous.setEffectiveWeight(1 - weight);
      if (weight >= 1) { player.previous.stop(); player.previous = null; }
    }
    action.time = seconds;
    player.mixer.update(0);
  }

  /**
   * Le pone en la mano lo que pide el clip, y le quita lo demas.
   *
   * La herramienta se cuelga del conector una sola vez y luego solo se enciende
   * y se apaga: colgarla y descolgarla en cada cambio de clip seria rehacer
   * objetos por fotograma, que es lo que D.6 prohibe. Y cuelga del hueso, asi
   * que la anima el mismo esqueleto sin que nadie la mueva a mano.
   */
  private equip(player: Player, actor: Actor): void {
    const key = actor.clip === 'carry_walk' && actor.load === 'stone' ? 'carry_stone'
      : actor.clip === 'carry_walk' && actor.load === 'grain' ? 'carry_grain' : actor.clip;
    const wanted: HeldSpec[] = [];
    const action = key === 'carry_stone'
      ? { asset: 'rock', hand: 'hand_l', scale: 0.18 }
      : key === 'carry_grain' ? { asset: 'bundle', hand: 'hand_l', scale: 0.8 }
        : HELD[actor.clip];
    if (action !== undefined) wanted.push({ key, ...action });
    if (actor.weapon !== null && actor.weapon !== undefined) {
      wanted.push({ key: `weapon_${actor.weapon}`, asset: actor.weapon,
        hand: actor.weapon === 'bow' || actor.weapon === 'sling' ? 'hand_l' : 'hand_r' });
    }
    if (actor.shield === true) wanted.push({ key: 'shield', asset: 'shield', hand: 'hand_l' });
    for (const item of wanted) {
      if (player.held.has(item.key)) continue;
      const tool = this.prop?.(item.asset) ?? (item.fallback === true ? handTool(actor.clip) : undefined);
      const hand = player.object.getObjectByName(item.hand);
      if (tool !== undefined && hand !== undefined) {
        tool.name = `Held_${item.key}`;
        if (item.scale !== undefined) tool.scale.multiplyScalar(item.scale);
        // El respaldo ya trae el giro dentro; el recurso publicado lo recibe aquí.
        if (item.turn !== undefined && tool.userData.ownedTool !== true) tool.quaternion.set(...item.turn);
        // La herramienta no se selecciona: quien la lleva si. Sin esto, tocar la
        // azada no devolvia a nadie.
        tool.traverse((child) => { child.userData.villagerId = player.object.userData.villagerId; });
        hand.add(tool);
        // La raíz de los recursos vive en el suelo para que sirva al visor y a
        // los trastos. En una mano manda el conector `grip`: se lleva a origen
        // **después** de colgarlo y escalarlo, con las matrices reales del rig,
        // para que una lanza no nazca a los pies ni se despegue al crecer un niño.
        tool.updateMatrixWorld(true);
        const grip = tool.getObjectByName('grip');
        if (grip !== undefined) {
          // Los recursos con `grip` salen de Blender en metros y los huesos
          // llevan la reducción metros→celdas. Sólo éstos la deshacen: los
          // trastos anteriores no tienen tal contrato y conservan su escala
          // heredada exactamente como antes.
          const actorScale = player.object.getWorldScale(new Vector3());
          const handScale = hand.getWorldScale(new Vector3());
          tool.scale.multiply(new Vector3(
            actorScale.x / handScale.x,
            actorScale.y / handScale.y,
            actorScale.z / handScale.z,
          ));
          tool.updateMatrixWorld(true);
          const offset = hand.worldToLocal(grip.getWorldPosition(new Vector3()));
          tool.position.sub(offset);
        }
        player.held.set(item.key, tool);
      }
    }
    const visible = new Set(wanted.map(item => item.key));
    for (const [name, tool] of player.held) tool.visible = visible.has(name);
  }

  /**
   * IA-anim · Suelta astillas en el instante en que el ciclo cruza el golpe.
   *
   * Desde la cabeza de la herramienta que el aldeano lleva de verdad, no desde
   * un punto fijo delante: si el gesto no llega al tronco, las astillas
   * tampoco, y eso se ve.
   */
  private strike(player: Player, actor: Actor, seconds: number): void {
    if (actor.clip !== 'chop' && actor.clip !== 'mine') { delete player.strikePhase; return; }
    const phase = seconds / VILLAGER_CLIPS[actor.clip].seconds;
    const before = player.strikePhase;
    player.strikePhase = phase;
    if (before === undefined) return;
    const moment = STRIKE_AT[actor.clip];
    const crossed = before <= phase ? before < moment && moment <= phase : before < moment || moment <= phase;
    if (!crossed) return;
    const tool = player.held.get(actor.clip);
    if (tool === undefined || !tool.visible) return;
    player.strikes = (player.strikes ?? 0) + 1;
    // Desde el punto de golpe medido (`STRIKE_HEAD`), que vale para el
    // respaldo y para el recurso publicado sin depender de cómo esté montado.
    const head = STRIKE_HEAD[actor.clip];
    player.object.updateMatrixWorld(true);
    const at = player.object.localToWorld(new Vector3(head.x, head.y, head.z));
    const kind = actor.clip === 'chop' ? 'wood' : 'stone';
    this.chips.hit(at, kind, actor.id * 1009 + player.strikes);
    this.onStrike?.(at, kind, actor.id * 1009 + player.strikes);
  }

  private retire(id: VillagerId): void {
    const player = this.players.get(id);
    if (player === undefined) return;
    // Si era el que se seguía, se apaga antes de soltar sus materiales: si no,
    // `dim` intentaría devolver el color a un material ya liberado.
    if (id === this.lit) { this.dim(); this.lit = null; }
    player.mixer.stopAllAction();
    player.mixer.uncacheRoot(player.object);
    this.group.remove(player.object);
    // La ropa si era suya: se clono para el y se suelta con el. Lo que no se
    // toca es la geometria, que es de la biblioteca.
    for (const material of player.owned) material.dispose();
    for (const tool of player.held.values()) if (tool.userData.ownedTool === true) tool.traverse(child => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
      }
    });
    // The clone's own nodes go; the geometry and the materials do not, because
    // they were never this actor's to free. Freeing them here would take the
    // rest of the village with the first villager who died.
    this.players.delete(id);
  }

  /** Posiciones de las mallas colocadas, para contrastarlas con sus cuerpos. */
  snapshot(): { id: number; x: number; y: number; z: number; scale: number; clip: string | null; weight: number; held: string[] }[] {
    return [...this.players].map(([id, player]) => ({ id, x: player.object.position.x, y: player.object.position.y,
      z: player.object.position.z,
      scale: player.object.scale.x,
      clip: player.playing, weight: player.playing === null ? 0 : player.actions.get(player.playing)?.getEffectiveWeight() ?? 0,
      held: [...player.held].filter(([, object]) => object.visible).map(([name]) => name),
    }));
  }

  get count(): number {
    return this.players.size;
  }

  clear(): void {
    for (const id of [...this.players.keys()]) this.retire(id);
  }

  dispose(): void {
    this.ring.geometry.dispose();
    (this.ring.material as Material).dispose();
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

/** Copia pequeña de la pose local con la que llegó el GLB. */
function bindPose(object: Object3D): Map<string, { readonly position: Vector3; readonly rotation: Quaternion }> {
  const bind = new Map<string, { readonly position: Vector3; readonly rotation: Quaternion }>();
  object.traverse((node) => {
    if (node.type !== 'Bone') return;
    bind.set(node.name, { position: node.position.clone(), rotation: node.quaternion.clone() });
  });
  return bind;
}
