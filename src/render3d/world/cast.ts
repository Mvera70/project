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

import { AnimationMixer, Group, type AnimationClip, type Object3D } from 'three';
import type { VillagerId } from '@engine/state';
import type { Actor } from '../actors';
import type { LoadedAsset } from '../assets';

type Action = NonNullable<ReturnType<AnimationMixer['clipAction']>>;

interface Player {
  readonly object: Object3D;
  readonly mixer: AnimationMixer;
  readonly actions: Map<string, Action>;
  playing: string | null;
}

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
        player = { object, mixer, actions: new Map(), playing: null };
        this.players.set(actor.id, player);
        this.group.add(object);
      }

      player.object.position.set(actor.x, 0, actor.z);
      player.object.rotation.set(0, actor.facing, 0);
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
