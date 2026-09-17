// IA-12 · Acciones compartidas por los esqueletos del catálogo, sin cambiar sus GLB.
import { type AnimationClip, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from 'three';
import { VILLAGER_CLIPS, type ClipName } from './clips';

export function actionClips(idle: AnimationClip): AnimationClip[] {
  const actions: ClipName[] = ['sit', 'talk', 'pray', 'hammer', 'chop', 'play', 'drink', 'sort'];
  return actions.map(name => {
    const duration = VILLAGER_CLIPS[name].seconds;
    const clip = idle.clone(); clip.name = name; clip.duration = duration;
    for (const track of clip.tracks) track.times = Float32Array.from(track.times, t => t * duration / idle.duration);
    const turn = (bone: string, axis: Vector3, angle: (t: number) => number): void => {
      // GLTFLoader elimina los puntos del nombre del hueso al crear los tracks.
      const original = idle.tracks.find(track => track.name === `${bone.replaceAll('.', '')}.quaternion`);
      if (original === undefined) return;
      const base = new Quaternion().fromArray(original.values, 0), times: number[] = [], values: number[] = [];
      for (let n = 0; n <= 24; n++) {
        const t = n / 24; times.push(t * duration);
        values.push(...base.clone().multiply(new Quaternion().setFromAxisAngle(axis, angle(t))).toArray());
      }
      clip.tracks = clip.tracks.filter(track => track.name !== original.name);
      clip.tracks.push(new QuaternionKeyframeTrack(original.name, times, values));
    };
    const x = new Vector3(1, 0, 0), z = new Vector3(0, 0, 1);
    const wave = (t: number): number => Math.sin(t * Math.PI * 2);
    if (name === 'sit') {
      for (const side of ['L', 'R']) {
        turn(`thigh.${side}`, x, () => -1.35); turn(`shin.${side}`, x, () => 0.5);
        turn(`upperarm.${side}`, x, () => -0.35); turn(`forearm.${side}`, x, () => -0.8);
      }
      const root = idle.tracks.find(track => track.name === 'hips.position');
      if (root !== undefined) {
        clip.tracks = clip.tracks.filter(track => track.name !== root.name);
        const at = Array.from(root.values.slice(0, 3)); at[1] = at[1]! - 0.55;
        clip.tracks.push(new VectorKeyframeTrack(root.name, [0, duration], [...at, ...at]));
      }
    } else if (name === 'talk') {
      turn('forearm.R', x, t => -0.7 - 0.25 * wave(t));
      turn('upperarm.R', z, t => 0.12 + 0.08 * wave(t));
      turn('head', x, t => 0.06 * wave(t));
    } else if (name === 'pray') {
      for (const side of ['L', 'R']) { turn(`upperarm.${side}`, x, () => -0.55); turn(`forearm.${side}`, x, () => -1.1); }
      turn('head', x, () => 0.2);
    } else if (name === 'hammer' || name === 'chop') {
      turn('upperarm.R', x, t => -0.5 - 0.65 * (1 + wave(t)));
      turn('forearm.R', x, t => -0.6 - 0.35 * (1 - wave(t)));
      turn('spine', x, t => 0.08 + 0.08 * wave(t));
      if (name === 'chop') { turn('upperarm.L', x, t => -0.6 - 0.55 * (1 + wave(t))); turn('forearm.L', x, () => -0.7); }
    } else if (name === 'sort') {
      for (const side of ['L', 'R']) {
        turn(`upperarm.${side}`, x, t => -0.55 - 0.25 * wave(t));
        turn(`forearm.${side}`, x, t => -0.8 + 0.2 * wave(t));
      }
      turn('spine', x, t => 0.1 + 0.08 * wave(t));
    } else if (name === 'drink') {
      turn('upperarm.R', x, () => -0.8); turn('forearm.R', x, t => -1.4 + 0.12 * wave(t));
      turn('head', x, t => -0.1 - 0.05 * wave(t));
    } else {
      turn('upperarm.L', z, t => -0.2 - 0.15 * wave(t)); turn('upperarm.R', z, t => 0.2 + 0.15 * wave(t));
      turn('spine', z, t => 0.08 * wave(t));
    }
    return clip;
  });
}
