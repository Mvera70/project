// Los clips de un animal de nodos rígidos. 25 sep 2026.
//
// Vera rehizo once modelos (`deliverables/marked-models-trial/`, con su propio
// script de Blender). Los animales vienen **articulados con nodos rígidos**
// —sin esqueleto— y con los mismos nombres de articulación que el generador de
// G-23 (`body`, `neck`, `head`, `foreL`/`foreLLower`…, `tail`), pero sin los
// clips `idle` y `walk` que el juego necesita. Esta herramienta **no toca su
// geometría**: abre el GLB, añade las pistas de rotación de esos clips sobre
// sus nodos y lo vuelve a escribir. Determinista: mismos bytes de entrada,
// mismos bytes de salida.
//
//   node tools/art/rigid-clips.mjs <entrada.glb> <salida.glb> <especie>
//
// Imprime en JSON el `motion` que el catálogo tiene que declarar (duración y
// zancada de cada clip), porque el juego lleva la marcha por distancia.

import { readFileSync, writeFileSync } from 'node:fs';

const [input, output, species] = process.argv.slice(2);
if (!input || !output || !species) throw new Error('Uso: rigid-clips.mjs <entrada.glb> <salida.glb> <especie>');

// --- GLB -------------------------------------------------------------------
const glb = readFileSync(input);
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
const binStart = 20 + jsonLength;
const binLength = glb.readUInt32LE(binStart);
let bin = Buffer.from(glb.subarray(binStart + 8, binStart + 8 + binLength));

const nodes = gltf.nodes ?? [];
const byName = new Map(nodes.map((node, index) => [node.name, index]));
const parentOf = new Map();
nodes.forEach((node, index) => (node.children ?? []).forEach((child) => parentOf.set(child, index)));

function worldY(index) {
  let y = 0;
  for (let at = index; at !== undefined; at = parentOf.get(at)) y += nodes[at].translation?.[1] ?? 0;
  return y;
}

function pushData(floats, type, count) {
  while (bin.length % 4 !== 0) bin = Buffer.concat([bin, Buffer.alloc(1)]);
  const data = Buffer.from(new Float32Array(floats).buffer);
  const view = gltf.bufferViews.push({ buffer: 0, byteOffset: bin.length, byteLength: data.length }) - 1;
  bin = Buffer.concat([bin, data]);
  const accessor = { bufferView: view, componentType: 5126, count, type };
  if (type === 'SCALAR') { accessor.min = [Math.min(...floats)]; accessor.max = [Math.max(...floats)]; }
  return gltf.accessors.push(accessor) - 1;
}

// --- cuaterniones ----------------------------------------------------------
const mul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const axisAngle = (axis, angle) => {
  const s = Math.sin(angle / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
};
// En glTF el animal mira a −X con Y arriba: Z es el eje lateral (patas, cuello,
// cabeceo) e Y el vertical (la cola de lado a lado). Girar +Z lleva la punta de
// un hueso que cuelga hacia +X, o sea, hacia atrás; y baja la cabeza.
const Z = [0, 0, 1];
const Y = [0, 1, 0];

const SAMPLES = 32;
function clip(name, seconds, spec) {
  const channels = [];
  const samplers = [];
  const times = Array.from({ length: SAMPLES + 1 }, (_, n) => (n / SAMPLES) * seconds);
  const timeAccessor = pushData(times, 'SCALAR', times.length);
  for (const [nodeName, turns] of Object.entries(spec.rotate ?? {})) {
    const node = byName.get(nodeName);
    if (node === undefined) continue;
    const base = nodes[node].rotation ?? [0, 0, 0, 1];
    const values = [];
    for (let n = 0; n <= SAMPLES; n += 1) {
      const t = n / SAMPLES;
      let q = base;
      for (const [axis, angle] of turns) q = mul(q, axisAngle(axis, angle(t)));
      values.push(...q);
    }
    samplers.push({ input: timeAccessor, output: pushData(values, 'VEC4', SAMPLES + 1), interpolation: 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node, path: 'rotation' } });
  }
  for (const [nodeName, lift] of Object.entries(spec.lift ?? {})) {
    const node = byName.get(nodeName);
    if (node === undefined) continue;
    const base = nodes[node].translation ?? [0, 0, 0];
    const values = [];
    for (let n = 0; n <= SAMPLES; n += 1) values.push(base[0], base[1] + lift(n / SAMPLES), base[2]);
    samplers.push({ input: timeAccessor, output: pushData(values, 'VEC3', SAMPLES + 1), interpolation: 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node, path: 'translation' } });
  }
  gltf.animations ??= [];
  gltf.animations = gltf.animations.filter((animation) => animation.name !== name);
  gltf.animations.push({ name, channels, samplers });
}

// --- las especies ----------------------------------------------------------
const wave = (t, cycles = 1, offset = 0) => Math.sin((t * cycles + offset) * Math.PI * 2);
// Cuánto abre las patas cada una al andar, en radianes. TUNE: lo que se lee a
// la distancia de juego sin que el animal parezca que patina ni que salta.
const QUADS = { wolf: 0.45, dog: 0.5, mule: 0.38, bear: 0.3, boar: 0.4 };
const motion = [];
// El `rear` del oso es su amenaza, lo que el juego llama `attack`. El `takeoff`
// de la perdiz se conserva con su nombre: es un despegue de una vez, y el juego
// repite `flight` en bucle (se fabrica abajo, batiendo las alas).
const rename = { bear: { rear: 'attack' } };

for (const animation of gltf.animations ?? []) {
  const to = rename[species]?.[animation.name];
  if (to !== undefined) animation.name = to;
}

/**
 * El ángulo de una pata a lo largo del ciclo, como la marcha del generador de
 * G-23 (`animals-g23.mjs`): **apoyo en línea recta** el 62 % del ciclo —el pie
 * va hacia atrás a la velocidad a la que avanza el cuerpo, así que se queda
 * quieto en el suelo— y **vuelo** el resto, de vuelta adelante. La primera
 * versión era una sinusoide y el pie patinaba todo el ciclo.
 */
const STANCE = 0.62;
function legAngle(p, travel, length) {
  const swing = p > STANCE;
  const u = swing ? (p - STANCE) / (1 - STANCE) : p / STANCE;
  // Hacia atrás es +X, y girar +Z lleva el pie hacia +X.
  const dx = swing ? travel / 2 - travel * (0.5 - 0.5 * Math.cos(Math.PI * u)) : -travel / 2 + travel * u;
  return Math.asin(Math.max(-0.95, Math.min(0.95, dx / length)));
}

function quadruped(amp) {
  const hip = worldY(byName.get('foreL'));
  // Lo que recorre el pie en el apoyo, y de ahí la zancada del ciclo: el cuerpo
  // avanza `travel` mientras el pie apoya, que es el 62 % del ciclo.
  const travel = 2 * hip * Math.sin(amp);
  const stride = travel / STANCE;
  const legs = { foreL: 0, hindR: 0, foreR: 0.5, hindL: 0.5 }; // al trote: en diagonal
  const gait = (gain, bend) => {
    const rotate = {};
    for (const [leg, phase] of Object.entries(legs)) {
      rotate[leg] = [[Z, (t) => legAngle((t + phase) % 1, travel * gain, hip)]];
      // La rodilla se dobla sólo en el vuelo: la de delante lleva el casco
      // atrás y el corvejón de la de atrás lo lleva adelante (el primer banco
      // las doblaba igual y las traseras parecían rotas).
      const hind = leg.startsWith('hind') ? -1 : 1;
      rotate[`${leg}Lower`] = [[Z, (t) => {
        const p = (t + phase) % 1;
        return p > STANCE ? hind * bend * Math.sin(Math.PI * (p - STANCE) / (1 - STANCE)) : 0;
      }]];
    }
    rotate.neck = [[Z, (t) => 0.05 * wave(t, 2)]];
    rotate.tail = [[Y, (t) => 0.18 * wave(t, 1)]];
    return rotate;
  };
  const walkSeconds = 1.2;
  clip('walk', walkSeconds, {
    rotate: gait(1, 0.7),
    lift: { body: (t) => 0.006 * Math.abs(wave(t, 2)) },
  });
  motion.push({ name: 'walk', seconds: walkSeconds, loop: true, strideLength: Number(stride.toFixed(3)) });
  // Quieto: baja la cabeza a olisquear y la sube, la cola se mueve despacio y
  // las orejas se sacuden de vez en cuando. Nada de patas.
  const idleSeconds = 4;
  clip('idle', idleSeconds, {
    rotate: {
      neck: [[Z, (t) => 0.22 * Math.max(0, wave(t, 1, 0.75)) ** 2]],
      tail: [[Y, (t) => 0.12 * wave(t, 1)]],
      'ear-1': [[Z, (t) => 0.3 * Math.max(0, wave(t, 3)) ** 8]],
      ear1: [[Z, (t) => 0.3 * Math.max(0, wave(t, 3, 0.2)) ** 8]],
    },
    lift: { body: (t) => 0.003 * wave(t, 1) },
  });
  motion.push({ name: 'idle', seconds: idleSeconds, loop: true, strideLength: null });
  if (species === 'boar') {
    // La carga: la marcha más abierta y más rápida, con la cabeza gacha.
    const charge = gait(1.5, 0.9);
    charge.neck = [[Z, () => 0.25]];
    clip('charge', 0.8, { rotate: charge, lift: { body: (t) => 0.012 * Math.abs(wave(t, 2)) } });
    motion.push({ name: 'charge', seconds: 0.8, loop: true, strideLength: Number((stride * 1.5).toFixed(3)) });
    // El golpe: la cabeza baja y sube de un tirón, con los colmillos.
    // Con envolvente: empieza y acaba exactamente en reposo, como todo clip.
    clip('attack', 1.2, { rotate: { neck: [[Z, (t) => Math.sin(Math.PI * t)
      * (0.4 * Math.exp(-(((t - 0.3) / 0.12) ** 2)) - 0.35 * Math.exp(-(((t - 0.45) / 0.08) ** 2)))]] } });
    motion.push({ name: 'attack', seconds: 1.2, loop: false, strideLength: null });
  }
  if (species === 'bear' || species === 'wolf') {
    const attack = gltf.animations.find((animation) => animation.name === 'attack');
    if (attack !== undefined) motion.push({ name: 'attack', seconds: durationOf(attack), loop: false, strideLength: null });
  }
}

function bird() {
  const hip = worldY(byName.get('legL'));
  const amp = 0.55;
  const walkSeconds = 0.6;
  const travel = 2 * hip * Math.sin(amp) * STANCE;
  clip('walk', walkSeconds, {
    rotate: {
      // Apoyo en línea recta, como los cuadrúpedos: el pie no patina.
      legL: [[Z, (t) => legAngle(t % 1, travel, hip)]],
      legR: [[Z, (t) => legAngle((t + 0.5) % 1, travel, hip)]],
      footL: [[Z, (t) => (t % 1 > STANCE ? -0.6 * Math.sin(Math.PI * ((t % 1) - STANCE) / (1 - STANCE)) : 0)]],
      footR: [[Z, (t) => ((t + 0.5) % 1 > STANCE ? -0.6 * Math.sin(Math.PI * (((t + 0.5) % 1) - STANCE) / (1 - STANCE)) : 0)]],
      // El cabeceo de ave: la cabeza adelante y atrás a cada paso.
      neck: [[Z, (t) => 0.12 * wave(t, 2)]],
      tail: [[Z, (t) => 0.08 * wave(t, 2)]],
    },
    lift: { body: (t) => 0.004 * Math.abs(wave(t, 2)) },
  });
  motion.push({ name: 'walk', seconds: walkSeconds, loop: true, strideLength: Number((travel / STANCE).toFixed(3)) });
  const idleSeconds = 4;
  clip('idle', idleSeconds, {
    // Picotea: baja la cabeza dos veces seguidas y mira alrededor.
    rotate: { neck: [[Z, (t) => 0.5 * (Math.exp(-(((t - 0.3) / 0.05) ** 2)) + Math.exp(-(((t - 0.45) / 0.05) ** 2)))],
      // y mira a un lado y vuelve: empieza y acaba en cero, para cerrar el ciclo.
      [Y, (t) => (t > 0.6 ? 0.35 * Math.sin((Math.PI * (t - 0.6)) / 0.4) : 0)]] },
  });
  motion.push({ name: 'idle', seconds: idleSeconds, loop: true, strideLength: null });
  // El vuelo en bucle: las alas arriba y abajo, las patas recogidas. La altura
  // la pone el juego (`altitude`), no el clip.
  clip('flight', 0.3, {
    rotate: {
      wingL: [[[1, 0, 0], (t) => -0.9 * wave(t)]],
      wingR: [[[1, 0, 0], (t) => 0.9 * wave(t)]],
      legL: [[Z, () => 0.8]],
      legR: [[Z, () => 0.8]],
    },
  });
  motion.push({ name: 'flight', seconds: 0.3, loop: true, strideLength: null });
  const takeoff = gltf.animations.find((animation) => animation.name === 'takeoff');
  if (takeoff !== undefined) motion.push({ name: 'takeoff', seconds: durationOf(takeoff), loop: false, strideLength: null });
}

function durationOf(animation) {
  return Math.max(...animation.samplers.map((sampler) => gltf.accessors[sampler.input].max?.[0] ?? 0));
}

if (QUADS[species] !== undefined) quadruped(QUADS[species]);
else if (species === 'partridge') bird();
else throw new Error(`Especie sin clips: ${species}`);

// --- escribir --------------------------------------------------------------
while (bin.length % 4 !== 0) bin = Buffer.concat([bin, Buffer.alloc(1)]);
gltf.buffers[0].byteLength = bin.length;
let json = Buffer.from(JSON.stringify(gltf), 'utf8');
while (json.length % 4 !== 0) json = Buffer.concat([json, Buffer.from(' ')]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const chunk = (length, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(length, 0); b.writeUInt32LE(type, 4); return b; };
writeFileSync(output, Buffer.concat([header, chunk(json.length, 0x4e4f534a), json, chunk(bin.length, 0x004e4942), bin]));
process.stdout.write(JSON.stringify({ species, clips: gltf.animations.map((a) => a.name), motion }) + '\n');
