// El valle más vivo (25 sep 2026) · Gestos del perro, fabricados.
//
// Vera, al ver el perro: «persigue a los niños y al balón; tiene que tener más
// animaciones que solamente andar». El GLB trae `idle` y `walk` (generador de
// G-23) y ella está rehaciendo los modelos de los animales, así que los gestos
// no se meten en el GLB: se fabrican aquí sobre su esqueleto, como
// `action-clips.ts` hace con los aldeanos. Sirven para cualquier perro que
// tenga los huesos del generador (`body`, `neck`, `head`, `ear±1`, patas
// `fore/hind L/R` con `Lower` y `Foot`, `tail`); si el nuevo no los tiene, no
// se fabrica nada y se queda con lo suyo.
//
//   · **run**: la marcha de `walk` con las patas abiertas un 60 % más, el
//     cuerpo cabeceando y la cola alta; se lleva por distancia, como andar.
//   · **bark**: plantado, dos tirones de cuello y cabeza por golpe, la cola
//     tiesa moviéndose y las orejas atrás.
//   · **play**: la reverencia del perro que invita a jugar: la delantera baja,
//     la grupa arriba y la cola de lado a lado.
//
// Los ejes no se suponen: se leen de los propios clips (el cuello cabecea en
// `idle`, la cola se mueve en `walk`), así un esqueleto con otros ejes sigue
// funcionando.

import { AnimationClip, Quaternion, QuaternionKeyframeTrack, Vector3, type Object3D } from 'three';

type Track = QuaternionKeyframeTrack;

function trackOf(clip: AnimationClip, bone: string): Track | undefined {
  return clip.tracks.find((track) => track.name === `${bone}.quaternion`) as Track | undefined;
}

function keyAt(track: Track, index: number): Quaternion {
  return new Quaternion().fromArray(track.values, index * 4);
}

/** El eje en el que más gira un hueso a lo largo de un clip, con su signo. */
function axisOf(track: Track): Vector3 | null {
  const first = keyAt(track, 0);
  const inverse = first.clone().invert();
  let best: Vector3 | null = null;
  let angle = 0;
  for (let n = 1; n < track.times.length; n += 1) {
    const delta = inverse.clone().multiply(keyAt(track, n));
    const a = 2 * Math.acos(Math.min(1, Math.abs(delta.w)));
    if (a > angle) {
      angle = a;
      best = new Vector3(delta.x, delta.y, delta.z).multiplyScalar(Math.sign(delta.w) || 1);
    }
  }
  return best === null || best.lengthSq() < 1e-10 ? null : best.normalize();
}

const SAMPLES = 32;

/** Un clip de giros sobre la pose base de `idle`: `turns[bone] = (t) => ángulo`. */
function sculpt(name: string, seconds: number, idle: AnimationClip, root: Object3D,
  turns: Readonly<Record<string, readonly { axis: Vector3; angle: (t: number) => number }[]>>): AnimationClip {
  const tracks: Track[] = [];
  for (const [bone, list] of Object.entries(turns)) {
    // El reposo del hueso es el del modelo. La primera versión lo sacaba de la
    // primera clave de `idle`, y el perro de nodos rígidos de Vera —cuyo
    // `idle` no mueve las patas ni el cuerpo— se quedaba sin reverencia.
    const node = root.getObjectByName(bone);
    if (node === undefined) continue;
    const name = trackOf(idle, bone)?.name ?? `${node.name}.quaternion`;
    const rest = node.quaternion.clone();
    const times: number[] = [];
    const values: number[] = [];
    for (let n = 0; n <= SAMPLES; n += 1) {
      const t = n / SAMPLES;
      times.push(t * seconds);
      const q = rest.clone();
      for (const { axis, angle } of list) q.multiply(new Quaternion().setFromAxisAngle(axis, angle(t)));
      values.push(...q.toArray());
    }
    tracks.push(new QuaternionKeyframeTrack(name, times, values));
  }
  // Los huesos que no se tocan se quedan en su pose de `idle`, fija.
  for (const track of idle.tracks) {
    if (tracks.some((t) => t.name === track.name) || !track.name.endsWith('.quaternion')) continue;
    const rest = keyAt(track as Track, 0).toArray();
    tracks.push(new QuaternionKeyframeTrack(track.name, [0, seconds], [...rest, ...rest]));
  }
  return new AnimationClip(name, seconds, tracks);
}

/** `walk` con los giros de cada hueso agrandados respecto a su reposo. */
function amplified(name: string, walk: AnimationClip, root: Object3D, gain: number,
  extra: Readonly<Record<string, (q: Quaternion, t: number) => void>>): AnimationClip {
  const tracks = walk.tracks.map((source) => {
    if (!source.name.endsWith('.quaternion')) return source.clone();
    const track = source as Track;
    const bone = track.name.slice(0, -'.quaternion'.length);
    const rest = root.getObjectByName(bone)?.quaternion.clone() ?? keyAt(track, 0);
    const inverse = rest.clone().invert();
    const values: number[] = [];
    for (let n = 0; n < track.times.length; n += 1) {
      const delta = inverse.clone().multiply(keyAt(track, n));
      const identity = new Quaternion();
      // Agrandar un giro es alargar su camino desde la identidad.
      const bigger = identity.clone().slerp(delta, gain);
      const q = rest.clone().multiply(bigger);
      extra[bone]?.(q, track.times[n]! / walk.duration);
      values.push(...q.toArray());
    }
    return new QuaternionKeyframeTrack(track.name, Array.from(track.times), values);
  });
  return new AnimationClip(name, walk.duration, tracks);
}

/**
 * El sentido de un giro, **medido sobre el modelo**: gira `bone` un poco sobre
 * `axis` y mira cuánto se mueve `probe` en el marco del animal (frente a −X,
 * arriba +Y). Devuelve el eje con el signo que hace crecer ese movimiento.
 *
 * Porque el signo no se puede suponer: en el perro del generador de G-23 el
 * cuello cabeceaba al revés de lo que parecía (medido en el banco), y el de
 * Vera, de nodos rígidos, gira sobre otros ejes locales.
 */
function signed(root: Object3D, bone: string, probe: string, axis: Vector3, along: Vector3): Vector3 {
  const node = root.getObjectByName(bone);
  const tip = root.getObjectByName(probe);
  if (node === undefined || tip === undefined) return axis.clone();
  const saved = node.quaternion.clone();
  root.updateMatrixWorld(true);
  const before = root.worldToLocal(tip.getWorldPosition(new Vector3()));
  node.quaternion.multiply(new Quaternion().setFromAxisAngle(axis, 0.1));
  root.updateMatrixWorld(true);
  const after = root.worldToLocal(tip.getWorldPosition(new Vector3()));
  node.quaternion.copy(saved);
  root.updateMatrixWorld(true);
  return after.sub(before).dot(along) >= 0 ? axis.clone() : axis.clone().negate();
}

/** El primer hijo de un hueso con otro nombre: la punta con que se mide su giro. */
function tipOf(root: Object3D, bone: string): string {
  const node = root.getObjectByName(bone);
  const child = node?.children.find((one) => one.name !== '' && one.name !== bone);
  return child?.name ?? bone;
}

/** Los gestos que le faltan a un perro, fabricados; vacío si el esqueleto no es el esperado. */
export function dogGestures(clips: readonly AnimationClip[], root: Object3D): AnimationClip[] {
  const idle = clips.find((clip) => clip.name === 'idle');
  const walk = clips.find((clip) => clip.name === 'walk');
  if (idle === undefined || walk === undefined) return [];
  const neckIdle = trackOf(idle, 'neck');
  const tailWalk = trackOf(walk, 'tail');
  const foreWalk = trackOf(walk, 'foreL');
  // El eje de cabeceo es el del cuello en `idle` (o, si no se mueve, el de la
  // pata al andar: los dos giran en el plano del cuerpo). Y la cola, el de su
  // meneo al andar. Lo que no se supone es el signo: se mide (`signed`).
  const pitch = neckIdle !== undefined ? axisOf(neckIdle) : foreWalk !== undefined ? axisOf(foreWalk) : null;
  const wag = tailWalk === undefined ? null : axisOf(tailWalk);
  if (pitch === null || wag === null) return [];
  const up = new Vector3(0, 1, 0);
  const ahead = new Vector3(-1, 0, 0);
  const raise = signed(root, 'neck', 'head', pitch, up);
  const bowDown = signed(root, 'body', 'neck', pitch, up.clone().negate());
  const reach = signed(root, 'foreL', tipOf(root, 'foreL'), pitch, ahead);
  const hindBack = signed(root, 'hindL', tipOf(root, 'hindL'), pitch, ahead.clone().negate());
  const tailUp = signed(root, 'tail', tipOf(root, 'tail'), pitch, up);
  const have = new Set(clips.map((clip) => clip.name));
  const out: AnimationClip[] = [];
  const pulse = (t: number, at: number, width = 0.08): number => Math.exp(-(((t - at) / width) ** 2));
  const wave = (t: number, cycles = 1): number => Math.sin(t * Math.PI * 2 * cycles);

  if (!have.has('run')) {
    const tilt = (q: Quaternion, t: number, amount: number): void => {
      q.multiply(new Quaternion().setFromAxisAngle(bowDown, amount * wave(t, 2)));
    };
    // TUNE: 1,35. Con 1,6 la marcha amplia del perro de Vera acababa con las
    // patas casi horizontales (banco del 25 sep).
    out.push(amplified('run', walk, root, 1.35, {
      body: (q, t) => tilt(q, t, 0.07),
      neck: (q) => q.multiply(new Quaternion().setFromAxisAngle(raise, 0.2)),
      tail: (q) => q.multiply(new Quaternion().setFromAxisAngle(tailUp, 0.5)),
    }));
  }
  if (!have.has('bark')) {
    // Medio segundo por golpe: dos tirones de cabeza hacia arriba y adelante.
    const jerk = (t: number): number => pulse(t, 0.2) + 0.7 * pulse(t, 0.55);
    out.push(sculpt('bark', 0.55, idle, root, {
      neck: [{ axis: raise, angle: (t) => 0.35 + 0.3 * jerk(t) }],
      head: [{ axis: raise, angle: (t) => 0.15 + 0.3 * jerk(t) }],
      tail: [{ axis: tailUp, angle: () => 0.7 }, { axis: wag, angle: (t) => 0.25 * wave(t, 2) }],
      'ear-1': [{ axis: raise.clone().negate(), angle: (t) => 0.25 * jerk(t) }],
      ear1: [{ axis: raise.clone().negate(), angle: (t) => 0.25 * jerk(t) }],
    }));
  }
  if (!have.has('play')) {
    // La reverencia: el cuerpo pica hacia delante, las manos se estiran por
    // delante para no clavarse, las patas de atrás se enderezan, la cabeza
    // mira arriba y la cola va de lado a lado deprisa.
    // TUNE: 0,24 de reverencia y las manos 0,85 adelante. Con 0,32 y 0,5 las
    // manos del perro de Vera se hundían en el suelo (banco del 25 sep).
    const bow = 0.24;
    out.push(sculpt('play', 1.2, idle, root, {
      body: [{ axis: bowDown, angle: (t) => bow + 0.04 * wave(t, 2) }],
      foreL: [{ axis: reach, angle: () => 0.85 }],
      foreR: [{ axis: reach, angle: () => 0.85 }],
      hindL: [{ axis: hindBack, angle: () => bow * 0.6 }],
      hindR: [{ axis: hindBack, angle: () => bow * 0.6 }],
      neck: [{ axis: raise, angle: () => bow + 0.35 }],
      head: [{ axis: raise, angle: () => 0.15 }],
      tail: [{ axis: tailUp, angle: () => 0.6 }, { axis: wag, angle: (t) => 0.5 * wave(t, 4) }],
    }));
  }
  return out;
}
