// IA-12 · Acciones compartidas por los esqueletos del catálogo, sin cambiar sus GLB.
import { type AnimationClip, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from 'three';
import { VILLAGER_CLIPS, type ClipName } from './clips';

/**
 * Los clips que este módulo **fabrica**, y que por tanto no están en el GLB ni
 * en `art/catalog.json`.
 *
 * Está exportada porque `VILLAGER_CLIPS` es un superconjunto del catálogo desde
 * IA-12 y alguien tiene que poder comprobar por qué: un nombre en la tabla que
 * ni venga del GLB ni se fabrique aquí es un clip que nadie puede reproducir, y
 * eso en pantalla es un aldeano en pose de descanso haciendo como que trabaja.
 * Lo vigila `tests/fast/graphics-clock.test.ts`.
 */
export const ACTION_CLIPS: readonly ClipName[] = [
  'sit', 'talk', 'pray', 'hammer', 'chop', 'play', 'drink', 'sort',
  'bow_draw', 'bow_loose', 'gate_strike', 'spear_thrust', 'hit_take', 'fall', 'flee',
];

export function actionClips(idle: AnimationClip): AnimationClip[] {
  return ACTION_CLIPS.map(name => {
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
    if (name === 'flee') {
      // Carrera de silueta grande: piernas y brazos opuestos, torso echado
      // hacia delante y dos apoyos idénticos por ciclo. Se fabrica aparte de
      // `walk`: a la distancia de juego acelerar el paseo no se lee como huir.
      turn('thigh.L', x, t => 0.85 * wave(t));
      turn('shin.L', x, t => 0.65 + 0.45 * Math.max(0, -wave(t)));
      turn('thigh.R', x, t => -0.85 * wave(t));
      turn('shin.R', x, t => 0.65 + 0.45 * Math.max(0, wave(t)));
      turn('upperarm.L', x, t => -0.8 * wave(t));
      turn('forearm.L', x, () => -1.05);
      turn('upperarm.R', x, t => 0.8 * wave(t));
      turn('forearm.R', x, () => -1.05);
      turn('spine', x, t => 0.2 + 0.04 * Math.abs(wave(t)));
    } else if (name === 'bow_draw' || name === 'bow_loose') {
      // Tensado sostenible: extremos idénticos, respiración leve. La suelta
      // empieza con la mano ya separándose de la mejilla, sin anticipación
      // que desplace el nacimiento físico de la flecha.
      const release = (t: number): number => name === 'bow_draw' ? 0 : Math.min(1, t * 4);
      turn('upperarm.L', x, t => -1.4 + 0.45 * release(t));
      turn('forearm.L', x, () => -0.12);
      turn('upperarm.R', new Vector3(1, 0, -0.55).normalize(), t => -1.3 + 0.25 * release(t));
      turn('forearm.R', x, t => -2.5 + 1.1 * release(t));
      // El rig no tiene dedos articulados: la apertura se lee en la palma
      // que gira y se libera, ya en t=0 de la flecha, y después en el brazo.
      turn('hand.R', z, t => name === 'bow_draw' ? 0 : 0.35 * (1 - t));
      turn('spine', z, t => name === 'bow_draw' ? 0.025 * wave(t) : -0.1 * Math.sin(Math.PI * t));
    } else if (name === 'gate_strike') {
      // El contacto es t=0; después se retiran ambos brazos y el torso.
      for (const side of ['L', 'R']) {
        turn(`upperarm.${side}`, x, t => -1.45 + 0.8 * t);
        turn(`forearm.${side}`, x, t => -0.1 - 0.7 * t);
      }
      turn('spine', x, t => 0.3 * (1 - t));
    } else if (name === 'spear_thrust') {
      // Contacto en cero, como el daño real. Recuperación sin mover el cuerpo
      // físico: un nuevo golpe puede interrumpir los 0,9 s del encargo.
      const recoil = (t: number): number => Math.min(1, t * 3);
      turn('upperarm.R', x, t => -1.55 + 1.1 * recoil(t));
      turn('forearm.R', x, t => -0.08 - 0.8 * recoil(t));
      turn('upperarm.L', x, t => -0.7 + 0.4 * recoil(t));
      turn('forearm.L', x, () => -0.65);
      turn('spine', x, t => 0.22 * (1 - recoil(t)));
      turn('thigh.L', x, t => -0.2 * (1 - recoil(t)));
      turn('shin.L', x, t => 0.25 * (1 - recoil(t)));
    } else if (name === 'hit_take') {
      const recoil = (t: number): number => (1 - t) * (1 - t);
      turn('spine', x, t => -0.3 * recoil(t));
      turn('head', x, t => -0.12 * recoil(t));
      for (const side of ['L', 'R']) {
        turn(`upperarm.${side}`, x, t => -0.8 * recoil(t));
        turn(`forearm.${side}`, x, t => -0.9 * recoil(t));
      }
      turn('thigh.R', x, t => 0.15 * recoil(t));
      turn('shin.R', x, t => 0.2 * recoil(t));
    } else if (name === 'fall') {
      const settle = (t: number): number => t * t * (3 - 2 * t);
      // De espaldas, brazos separados y rodillas flexionadas; el cuerpo gira
      // desde la cadera y baja hasta apoyar el torso. Todo queda inmóvil al final.
      turn('hips', x, t => -Math.PI / 2 * settle(t));
      for (const side of ['L', 'R']) {
        turn(`thigh.${side}`, x, t => -0.2 * settle(t));
        turn(`shin.${side}`, x, t => 0.4 * settle(t));
        turn(`upperarm.${side}`, z, t => (side === 'L' ? -0.65 : 0.65) * settle(t));
        turn(`forearm.${side}`, x, t => -0.3 * settle(t));
      }
      const root = idle.tracks.find(track => track.name === 'hips.position');
      if (root !== undefined) {
        const at = Array.from(root.values.slice(0, 3)), times: number[] = [], values: number[] = [];
        for (let n = 0; n <= 24; n++) {
          const t = n / 24; times.push(t * duration);
          values.push(at[0]!, at[1]! + (0.16 - at[1]!) * settle(t), at[2]!);
        }
        clip.tracks = clip.tracks.filter(track => track.name !== root.name);
        clip.tracks.push(new VectorKeyframeTrack(root.name, times, values));
      }
    } else if (name === 'sit') {
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
