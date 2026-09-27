// Índice verificable de una toma del observatorio; no modifica su evidencia.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, relative, resolve, sep } from 'node:path';

const [take] = process.argv.slice(2);
if (take === undefined || process.argv.length !== 3) {
  throw new Error('Uso: node tools/graphics/evidence-index.mjs <carpeta-toma>');
}

const root = resolve(take);
const fail = (message) => { throw new Error(`Evidencia inválida: ${message}`); };
const json = (name) => {
  const path = resolve(root, name);
  try { return { path, value: JSON.parse(readFileSync(path, 'utf8')) }; }
  catch (error) { fail(`${name} no es JSON legible (${error instanceof Error ? error.message : String(error)}).`); }
};
const finite = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${label} debe ser finito.`);
  return value;
};
const optional = (value) => value === undefined ? null : value;
const inside = (file) => {
  if (typeof file !== 'string' || file.length === 0 || extname(file).toLowerCase() !== '.png') fail('frames[].file debe ser un PNG.');
  const path = resolve(root, file);
  const rel = relative(root, path);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith('/') || rel.startsWith('\\') || basename(path) !== basename(file)) {
    fail(`la ruta de fotograma escapa de la carpeta: ${file}`);
  }
  if (!existsSync(path)) fail(`falta el PNG ${file}.`);
};

const trace = json('trace.json');
const summary = json('summary.json').value;
if (trace.value === null || typeof trace.value !== 'object' || Array.isArray(trace.value)) fail('trace.json debe ser un objeto.');
if (summary === null || typeof summary !== 'object' || Array.isArray(summary)) fail('summary.json debe ser un objeto.');
const frames = trace.value.frames;
if (!Array.isArray(frames) || frames.length === 0) fail('frames debe ser un array no vacío.');

let previousSeconds = -Infinity;
for (const [index, frame] of frames.entries()) {
  if (frame === null || typeof frame !== 'object' || Array.isArray(frame)) fail(`frames[${index}] debe ser un objeto.`);
  const seconds = finite(frame.seconds, `frames[${index}].seconds`);
  if (seconds < previousSeconds) fail('los tiempos de frames deben estar ordenados.');
  previousSeconds = seconds;
  finite(frame.engineTick, `frames[${index}].engineTick`);
  inside(frame.file);
}

const firstTick = frames[0].engineTick;
const lastTick = frames.at(-1).engineTick;
if (summary.firstTick !== firstTick || summary.lastTick !== lastTick) fail('summary.json no coincide con los ticks extremos de trace.json.');
if ('sampledPeople' in summary && summary.sampledPeople !== frames[0].life?.people?.length) fail('summary.json no coincide con las personas del primer fotograma.');
if ('sampledBeasts' in summary && summary.sampledBeasts !== frames[0].life?.beasts?.length) fail('summary.json no coincide con los animales del primer fotograma.');

const warnings = [];
if (typeof trace.value.mode === 'string' && trace.value.mode.includes('live') && firstTick === lastTick) {
  warnings.push('Modo vivo sin avance de tick: evidencia insuficiente para persistencia.');
}
const index = {
  schemaVersion: 1,
  sourceTraceSha256: createHash('sha256').update(readFileSync(trace.path)).digest('hex'),
  mode: optional(trace.value.mode),
  seed: optional(trace.value.seed),
  year: optional(trace.value.year),
  fps: optional(trace.value.fps),
  speed: optional(trace.value.speed),
  lead: optional(trace.value.lead),
  advanceWeeks: optional(trace.value.advanceWeeks),
  firstTick,
  lastTick,
  frameCount: frames.length,
  missingFiles: [],
  errors: Array.isArray(trace.value.errors) ? trace.value.errors : [],
  warnings,
};
writeFileSync(resolve(root, 'evidence-index.json'), `${JSON.stringify(index, null, 2)}\n`);
process.stdout.write(`${resolve(root, 'evidence-index.json')} · ${frames.length} fotogramas · ${warnings.length} advertencias\n`);
