// Hornear los clips de una receta en un GLB ya exportado, sin Blender. AN-1, 29 sep 2026.
//
// El camino canónico de D.4 es receta → Blender → GLB (`tools/art/index.ts`),
// y sigue siéndolo. Esta herramienta existe para el caso en que la receta
// cambia **sólo en sus clips** y no hay Blender a mano: lee las pistas de la
// receta (`clips[].tracks[].keys`, grados Euler XYZ de Blender, y `location`
// en el eje del hueso), las muestrea fotograma a fotograma como hace el
// exportador (`export_force_sampling`, 24 fps, claves en los fotogramas
// 1..N) y reescribe las animaciones del GLB con esas muestras, dejando la
// geometría, los materiales, el esqueleto y las demás animaciones intactos.
// Determinista: misma receta y mismo GLB de entrada, mismos bytes de salida.
//
//   node tools/art/bake-clips.mjs <receta.json> <entrada.glb> <salida.glb> [--clips walk,carry_walk]
//   node tools/art/bake-clips.mjs art/recipes/villager/villager.json public/assets/valley3d/villager.glb out.glb --check
//
// `--check` no escribe: hornea los clips de la receta tal como está y los
// compara con los que trae el GLB, para comprobar que las convenciones
// (orden de Euler, marco de reposo del hueso, unidades del `location`) son
// las del exportador. Medido con la receta publicada del aldeano (29 sep
// 2026): 0,03° de diferencia en las claves y hasta 5° entre claves, porque
// Blender interpola con Bézier de asas automáticas y aquí se usa una cúbica
// monótona. Por eso un clip que se hornee aquí lleva claves densas (cada dos
// fotogramas) e `interpolation: 'LINEAR'` en la receta: así Blender y esta
// herramienta producen las mismas muestras y no hay dos verdades.
//
// Lo que **no** hace: no toca huesos que la receta no anima (siguen con su
// reposo, muestreado constante, como los exporta Blender), no cambia
// `scale`, y no mide la zancada: eso es de `tools/reports/gait-report.ts` y
// de `animation-audit.ts`, y es lo que hay que escribir en la receta y en el
// catálogo después.

import { readFileSync, writeFileSync } from 'node:fs';

const FPS = 24;
const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith('--'));
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const check = args.includes('--check');
const [recipePath, input, output] = positional;
if (!recipePath || !input || (!output && !check)) {
  throw new Error('Uso: bake-clips.mjs <receta.json> <entrada.glb> <salida.glb> [--clips a,b] [--check]');
}
const recipe = JSON.parse(readFileSync(recipePath, 'utf8'));
const wanted = opt('clips')?.split(',') ?? recipe.clips.map((clip) => clip.name);

// --- GLB -------------------------------------------------------------------
const glb = readFileSync(input);
if (glb.subarray(0, 4).toString('ascii') !== 'glTF') throw new Error('No es un GLB.');
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
const binStart = 20 + jsonLength;
const binLength = glb.readUInt32LE(binStart);
const bin = glb.subarray(binStart + 8, binStart + 8 + binLength);
const nodes = gltf.nodes ?? [];
const nodeIndex = new Map(nodes.map((node, index) => [node.name, index]));
const SIZES = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 };

function readAccessor(index) {
  const accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  const n = SIZES[accessor.type];
  const floats = new Float32Array(bin.buffer, bin.byteOffset + view.byteOffset + (accessor.byteOffset ?? 0), accessor.count * n);
  return { n, values: Array.from(floats) };
}

// --- cuaterniones y Euler ----------------------------------------------------
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
const rotateVector = (q, v) => {
  const p = mul(mul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]);
  return [p[0], p[1], p[2]];
};
/** Euler XYZ de Blender (gira X, luego Y, luego Z, en los ejes del hueso). */
function eulerXYZ(degrees) {
  const rad = degrees.map((d) => (d * Math.PI) / 180);
  return mul(axisAngle([0, 0, 1], rad[2]), mul(axisAngle([0, 1, 0], rad[1]), axisAngle([1, 0, 0], rad[0])));
}

// --- interpolación entre claves ---------------------------------------------
/**
 * Cúbica monótona (Fritsch–Carlson) por componente: como las asas
 * automáticas y acotadas de Blender, no sobrepasa un extremo entre dos claves.
 * `linear` reproduce la interpolación LINEAR de la receta.
 */
function sampler(keys, linear) {
  const xs = keys.map((k) => k.frame);
  const ys = keys.map((k) => k.value);
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const slopes = [];
  for (let i = 0; i < n - 1; i += 1) slopes.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n).fill(0);
  m[0] = slopes[0]; m[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i += 1) m[i] = slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  for (let i = 0; i < n - 1; i += 1) {
    if (slopes[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / slopes[i], b = m[i + 1] / slopes[i];
    const h = Math.hypot(a, b);
    if (h > 3) { m[i] = 3 * a / h * slopes[i]; m[i + 1] = 3 * b / h * slopes[i]; }
  }
  return (frame) => {
    if (frame <= xs[0]) return ys[0];
    if (frame >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (frame > xs[i + 1]) i += 1;
    const h = xs[i + 1] - xs[i], t = (frame - xs[i]) / h;
    if (linear) return ys[i] + (ys[i + 1] - ys[i]) * t;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i]
      + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// --- horneado ---------------------------------------------------------------
/** Las muestras de un clip, por hueso: `{ rotation: [q...], translation: [v...] }`, N fotogramas. */
function bake(clip) {
  const frames = clip.frames;
  const linear = clip.interpolation === 'LINEAR';
  const out = new Map();
  for (const track of clip.tracks) {
    const index = nodeIndex.get(track.bone);
    if (index === undefined) throw new Error(`La receta anima '${track.bone}' y el GLB no lo tiene.`);
    const node = nodes[index];
    const rest = node.rotation ?? [0, 0, 0, 1];
    const restAt = node.translation ?? [0, 0, 0];
    const rotations = [];
    const keys = [0, 1, 2].map((axis) => sampler(track.keys.map((k) => ({ frame: k.frame, value: k.rotation[axis] })), linear));
    for (let frame = 1; frame <= frames; frame += 1) {
      rotations.push(mul(rest, eulerXYZ(keys.map((f) => f(frame)))));
    }
    let translations = null;
    if (Array.isArray(track.location) && track.location.length > 0) {
      const moves = [0, 1, 2].map((axis) => sampler(track.location.map((k) => ({ frame: k.frame, value: k.offset[axis] })), linear));
      translations = [];
      for (let frame = 1; frame <= frames; frame += 1) {
        // El desplazamiento va en los ejes del hueso y la receta en metros:
        // el GLB lleva la escala en la raíz del armazón, así que aquí no se toca.
        const offset = rotateVector(rest, moves.map((f) => f(frame)));
        translations.push([restAt[0] + offset[0], restAt[1] + offset[1], restAt[2] + offset[2]]);
      }
    }
    out.set(index, { rotations, translations });
  }
  return out;
}

const results = [];
const appended = [];
for (const name of wanted) {
  const clip = recipe.clips.find((c) => c.name === name);
  if (clip === undefined) throw new Error(`La receta no tiene el clip '${name}'.`);
  const animation = (gltf.animations ?? []).find((a) => a.name === name);
  if (animation === undefined) throw new Error(`El GLB no tiene la animación '${name}'.`);
  const baked = bake(clip);
  if (check) {
    let worstKey = 0, worstBetween = 0, compared = 0;
    for (const channel of animation.channels) {
      const samples = baked.get(channel.target.node);
      if (samples === undefined) continue;
      const source = readAccessor(animation.samplers[channel.sampler].output);
      const times = readAccessor(animation.samplers[channel.sampler].input).values;
      const track = clip.tracks.find((t) => t.bone === nodes[channel.target.node].name);
      const keyFrames = new Set(track.keys.map((k) => k.frame));
      for (let k = 0; k < times.length; k += 1) {
        const frame = Math.round(times[k] * FPS);
        const mine = channel.target.path === 'rotation' ? samples.rotations[frame - 1]
          : channel.target.path === 'translation' ? samples.translations?.[frame - 1] : null;
        if (mine === undefined || mine === null) continue;
        const theirs = source.values.slice(k * source.n, (k + 1) * source.n);
        let error;
        if (channel.target.path === 'rotation') {
          // Ángulo entre cuaterniones, en grados (q y −q son la misma rotación).
          const dot = Math.min(1, Math.abs(mine[0] * theirs[0] + mine[1] * theirs[1] + mine[2] * theirs[2] + mine[3] * theirs[3]));
          error = (2 * Math.acos(dot) * 180) / Math.PI;
        } else error = Math.hypot(mine[0] - theirs[0], mine[1] - theirs[1], mine[2] - theirs[2]) * 1000; // milímetros
        compared += 1;
        if (keyFrames.has(frame)) worstKey = Math.max(worstKey, error); else worstBetween = Math.max(worstBetween, error);
      }
    }
    results.push({ clip: name, compared, worstAtKeys: Number(worstKey.toFixed(3)), worstBetweenKeys: Number(worstBetween.toFixed(3)) });
    continue;
  }
  // Reescribir: cada canal animado por la receta recibe muestras nuevas; los
  // canales de huesos que la receta no toca se dejan como están.
  const times = Array.from({ length: clip.frames }, (_, k) => (k + 1) / FPS);
  const timeAccessor = pushData(times, 'SCALAR');
  for (const channel of animation.channels) {
    const samples = baked.get(channel.target.node);
    if (samples === undefined) continue;
    if (channel.target.path === 'rotation') {
      animation.samplers[channel.sampler] = { input: timeAccessor, output: pushData(samples.rotations.flat(), 'VEC4'), interpolation: 'LINEAR' };
    } else if (channel.target.path === 'translation') {
      const values = samples.translations ?? times.map(() => nodes[channel.target.node].translation ?? [0, 0, 0]);
      animation.samplers[channel.sampler] = { input: timeAccessor, output: pushData(values.flat(), 'VEC3'), interpolation: 'LINEAR' };
    } else if (channel.target.path === 'scale') {
      const scale = nodes[channel.target.node].scale ?? [1, 1, 1];
      animation.samplers[channel.sampler] = { input: timeAccessor, output: pushData(times.flatMap(() => scale), 'VEC3'), interpolation: 'LINEAR' };
    }
  }
  results.push({ clip: name, frames: clip.frames, seconds: clip.frames / FPS, tracks: clip.tracks.length });
}

function pushData(floats, type) {
  const data = Buffer.from(new Float32Array(floats).buffer);
  const view = gltf.bufferViews.push({ buffer: 0, byteOffset: -1, byteLength: data.length }) - 1;
  appended.push({ view, data });
  const accessor = { bufferView: view, componentType: 5126, count: floats.length / SIZES[type], type };
  if (type === 'SCALAR') { accessor.min = [Math.min(...floats)]; accessor.max = [Math.max(...floats)]; }
  return gltf.accessors.push(accessor) - 1;
}

if (check) {
  process.stdout.write(`${JSON.stringify({ recipe: recipe.id, check: results }, null, 2)}\n`);
} else {
  // Compactar: sólo viajan los bufferViews que algo referencia todavía.
  const used = new Set();
  for (const accessor of gltf.accessors) if (accessor.bufferView !== undefined) used.add(accessor.bufferView);
  for (const image of gltf.images ?? []) if (image.bufferView !== undefined) used.add(image.bufferView);
  const referenced = new Set();
  const mark = (index) => { if (index !== undefined) referenced.add(gltf.accessors[index].bufferView); };
  for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives) {
    for (const value of Object.values(primitive.attributes ?? {})) mark(value);
    mark(primitive.indices);
    for (const target of primitive.targets ?? []) for (const value of Object.values(target)) mark(value);
  }
  for (const skin of gltf.skins ?? []) mark(skin.inverseBindMatrices);
  for (const animation of gltf.animations ?? []) for (const s of animation.samplers) { mark(s.input); mark(s.output); }
  for (const image of gltf.images ?? []) if (image.bufferView !== undefined) referenced.add(image.bufferView);
  const chunks = [];
  const remap = new Map();
  let offset = 0;
  gltf.bufferViews.forEach((view, index) => {
    if (!referenced.has(index)) return;
    const bytes = view.byteOffset === -1 ? appended.find((a) => a.view === index).data
      : bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    while (offset % 4 !== 0) { chunks.push(Buffer.alloc(1)); offset += 1; }
    remap.set(index, chunks.length);
    chunks.push({ view: { ...view, byteOffset: offset }, bytes });
    offset += bytes.length;
  });
  const newViews = [];
  const viewIndex = new Map();
  const parts = [];
  for (const chunk of chunks) {
    if (Buffer.isBuffer(chunk)) { parts.push(chunk); continue; }
    viewIndex.set(chunk.view, newViews.length);
    newViews.push(chunk.view);
    parts.push(chunk.bytes);
  }
  const oldToNew = new Map();
  for (const [oldIndex, chunkIndex] of remap) oldToNew.set(oldIndex, viewIndex.get(chunks[chunkIndex].view));
  // Los accessors que ya nadie usa se quedan sin bufferView (y sin nadie que los lea).
  const liveAccessors = new Set();
  for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives) {
    for (const value of Object.values(primitive.attributes ?? {})) liveAccessors.add(value);
    if (primitive.indices !== undefined) liveAccessors.add(primitive.indices);
    for (const target of primitive.targets ?? []) for (const value of Object.values(target)) liveAccessors.add(value);
  }
  for (const skin of gltf.skins ?? []) if (skin.inverseBindMatrices !== undefined) liveAccessors.add(skin.inverseBindMatrices);
  for (const animation of gltf.animations ?? []) for (const s of animation.samplers) { liveAccessors.add(s.input); liveAccessors.add(s.output); }
  const accessorRemap = new Map();
  const newAccessors = [];
  gltf.accessors.forEach((accessor, index) => {
    if (!liveAccessors.has(index)) return;
    accessorRemap.set(index, newAccessors.length);
    newAccessors.push({ ...accessor, bufferView: oldToNew.get(accessor.bufferView) });
  });
  const re = (index) => (index === undefined ? undefined : accessorRemap.get(index));
  for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives) {
    for (const key of Object.keys(primitive.attributes ?? {})) primitive.attributes[key] = re(primitive.attributes[key]);
    if (primitive.indices !== undefined) primitive.indices = re(primitive.indices);
    for (const target of primitive.targets ?? []) for (const key of Object.keys(target)) target[key] = re(target[key]);
  }
  for (const skin of gltf.skins ?? []) if (skin.inverseBindMatrices !== undefined) skin.inverseBindMatrices = re(skin.inverseBindMatrices);
  for (const animation of gltf.animations ?? []) for (const s of animation.samplers) { s.input = re(s.input); s.output = re(s.output); }
  for (const image of gltf.images ?? []) if (image.bufferView !== undefined) image.bufferView = oldToNew.get(image.bufferView);
  gltf.bufferViews = newViews;
  gltf.accessors = newAccessors;
  let body = Buffer.concat(parts);
  while (body.length % 4 !== 0) body = Buffer.concat([body, Buffer.alloc(1)]);
  gltf.buffers[0].byteLength = body.length;
  let json = Buffer.from(JSON.stringify(gltf), 'utf8');
  while (json.length % 4 !== 0) json = Buffer.concat([json, Buffer.from(' ')]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + body.length, 8);
  const chunk = (length, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(length, 0); b.writeUInt32LE(type, 4); return b; };
  writeFileSync(output, Buffer.concat([header, chunk(json.length, 0x4e4f534a), json, chunk(body.length, 0x004e4942), body]));
  process.stdout.write(`${JSON.stringify({ recipe: recipe.id, output, baked: results, bytes: 12 + 8 + json.length + 8 + body.length }, null, 2)}\n`);
}
