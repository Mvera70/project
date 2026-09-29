// El paso del aldeano con el pie plantado y la zancada larga. AN-1, 29 sep 2026.
//
// Medido en AN-0 (`tools/reports/gait-report.ts`): el `walk` de G-04 cubre
// 0,317 celdas por ciclo (0,95 m, el paso de un paseo) y la vida mueve a la
// gente a 1,05–1,65 celdas por segundo (`village.ts`, `pace`), así que las
// piernas daban de 3,3 a 5,2 ciclos por segundo: la aldea de hormigas de la
// que D.6.1 quiso huir. La solución honrada no es frenar a nadie —la jornada
// está calibrada en ciento veinte segundos— ni patinar los pies: es que cada
// ciclo cubra más suelo. Aquí el paso se construye al revés que en G-04, como
// `deer/plant-gait.cjs`: se fija dónde va el tobillo en cada fotograma
// —apoyado, retrocede en línea recta a la velocidad del cuerpo, con el talón
// que se levanta al final; en el aire, vuelve adelante levantado— y cadera y
// rodilla salen de una cinemática inversa de dos huesos. Los brazos van en
// oposición, la cadera baja un poco y cabecea dos veces por ciclo.
//
// Claves cada dos fotogramas e `interpolation: 'LINEAR'`, para que Blender
// (`npm run art -- all villager`) y `tools/art/bake-clips.mjs` produzcan las
// mismas muestras. Después: hornear, medir con `gait-report.ts --only villager
// --glb <candidato>`, escribir la zancada medida aquí abajo y en
// `art/catalog.json`, y publicar.
//
//   node art/recipes/villager/plant-gait.mjs [--nominal]   (reescribe `walk` y `carry_walk` en villager.json)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = resolve(dirname(fileURLToPath(import.meta.url)), 'villager.json');
const recipe = JSON.parse(readFileSync(source, 'utf8'));
if (recipe.id !== 'villager') throw new Error(`Receta inesperada: ${source}`);

/**
 * TUNE visual, en metros de receta (el GLB va a `recipe.scale` = 1/3).
 *
 * `front`/`back` es cuánto llega el tobillo por delante y por detrás de la
 * cadera apoyado; el alcance por delante lo limita la pierna estirada
 * (0,76 m) con la cadera bajada `dip`, y el de atrás lo alarga el talón que se
 * levanta (`heel`). La zancada por ciclo es `(front + back) / stance`; con
 * estos números, 1,32 m = 0,44 celdas para andar y 1,05 m = 0,35 cargando.
 */
const GAITS = {
  // TUNE: con `dip` 0,06 la rodilla no se estiraba nunca (29° al apoyar el talón);
  // con 0,04 apoya casi recta (14°) y sigue llegando por delante.
  walk: { stance: 0.6, front: 0.28, back: 0.51, heel: 0.16, lift: 0.11, dip: 0.04, bob: 0.02, arm: 30, elbow: [12, 30], lean: 3 },
  carry_walk: { stance: 0.62, front: 0.24, back: 0.41, heel: 0.13, lift: 0.09, dip: 0.05, bob: 0.015, arm: 0, elbow: [48, 48], lean: 7 },
};

const bone = (name) => {
  const found = recipe.rig.bones.find((b) => b.name === name);
  if (found === undefined) throw new Error(`villager: falta el hueso ${name}`);
  return found;
};
const thighLength = bone('thigh.L').head[2] - bone('shin.L').head[2];
const shinLength = bone('shin.L').head[2] - bone('foot.L').head[2];
const hipHeight = bone('thigh.L').head[2];
const ankleHeight = bone('foot.L').head[2];
const degrees = (radians) => Math.round((radians * 180) / Math.PI * 100) / 100;
const smooth = (u) => u * u * (3 - 2 * u);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** El tobillo respecto a la cadera en reposo: `forward` (m, + delante) y `up` (m, sobre el suelo). */
function ankleAt(p, g) {
  if (p < g.stance) {
    const u = p / g.stance;
    // El talón se levanta en el último tercio del apoyo: el tobillo sube.
    const rise = g.heel * smooth(clamp((u - 0.66) / 0.34, 0, 1));
    return { forward: g.front - (g.front + g.back) * u, up: ankleHeight + rise, pitch: rise / g.heel };
  }
  const q = (p - g.stance) / (1 - g.stance);
  const forward = -g.back + (g.front + g.back) * (0.5 - 0.5 * Math.cos(Math.PI * q));
  // En el aire: sale con el talón alto, sube, y llega con la punta arriba.
  const up = ankleHeight + g.heel * (1 - smooth(clamp(q / 0.5, 0, 1))) + g.lift * Math.sin(Math.PI * q);
  return { forward, up, pitch: 1 - q * 1.35 };
}

function legTracks(g, frames) {
  const tracks = [];
  for (const [side, phase] of [['L', 0], ['R', 0.5]]) {
    const thigh = [], shin = [], foot = [];
    for (let frame = 1; frame <= frames; frame += 2) {
      const cycle = (frame - 1) / (frames - 1);
      const p = (cycle + phase) % 1;
      const dip = g.dip + g.bob * Math.cos(4 * Math.PI * cycle);
      const ankle = ankleAt(p, g);
      const dx = ankle.forward;
      const dy = (hipHeight - dip) - ankle.up;
      const reach = Math.min(Math.hypot(dx, dy), (thighLength + shinLength) * 0.995);
      // De la cadera al tobillo, medido desde la vertical: positivo hacia delante.
      const alpha = Math.atan2(dx, dy);
      const beta = Math.acos(clamp((thighLength ** 2 + reach ** 2 - shinLength ** 2) / (2 * thighLength * reach), -1, 1));
      const bend = Math.PI - Math.acos(clamp((thighLength ** 2 + shinLength ** 2 - reach ** 2) / (2 * thighLength * shinLength), -1, 1));
      // En el GLB, +X local del muslo lleva el pie hacia atrás; la rodilla
      // dobla hacia atrás con +X de la espinilla; +X del pie baja la punta.
      const thighAngle = -(alpha + beta);
      const footAngle = -(thighAngle + bend) + ankle.pitch * (Math.PI / 180) * 38;
      thigh.push({ frame, rotation: [degrees(thighAngle), 0, 0] });
      shin.push({ frame, rotation: [degrees(bend), 0, 0] });
      foot.push({ frame, rotation: [degrees(footAngle), 0, 0] });
    }
    // Frame 32 = frame 1: el bucle cierra donde empezó.
    for (const [track] of [[thigh], [shin], [foot]]) track.push({ ...track[0], frame: frames });
    tracks.push({ bone: `thigh.${side}`, keys: thigh }, { bone: `shin.${side}`, keys: shin }, { bone: `foot.${side}`, keys: foot });
  }
  return tracks;
}

function bodyTracks(g, frames) {
  const hips = [], spine = [], head = [], location = [];
  const upperL = [], upperR = [], foreL = [], foreR = [];
  for (let frame = 1; frame <= frames; frame += 2) {
    const cycle = (frame - 1) / (frames - 1);
    const swing = Math.cos(2 * Math.PI * cycle); // +1: pierna izquierda delante
    const dip = g.dip + g.bob * Math.cos(4 * Math.PI * cycle);
    // La cadera gira con las piernas y el torso la compensa.
    hips.push({ frame, rotation: [0, 4 * swing, 0] });
    spine.push({ frame, rotation: [g.lean, -3 * swing, 0] });
    head.push({ frame, rotation: [-g.lean * 0.5, 3 * swing, 0] });
    location.push({ frame, offset: [0, -dip, 0] });
    // Brazos en oposición: pierna izquierda delante, brazo izquierdo atrás
    // (+X del brazo lleva la mano atrás); el codo dobla más con el brazo delante.
    const [least, most] = g.elbow;
    upperL.push({ frame, rotation: [g.arm * swing, 0, -3] });
    upperR.push({ frame, rotation: [-g.arm * swing, 0, 3] });
    foreL.push({ frame, rotation: [-(least + (most - least) * (1 - swing) / 2), 0, 0] });
    foreR.push({ frame, rotation: [-(least + (most - least) * (1 + swing) / 2), 0, 0] });
  }
  for (const track of [hips, spine, head, location, upperL, upperR, foreL, foreR]) track.push({ ...track[0], frame: frames });
  if (g.arm === 0) {
    // Cargando: los brazos sostienen el haz por delante y no se mueven.
    for (const track of [upperL, upperR]) for (const key of track) key.rotation = [-58, 0, key.rotation[2]];
  }
  return [
    { bone: 'hips', keys: hips, location },
    { bone: 'spine', keys: spine },
    { bone: 'head', keys: head },
    { bone: 'upperarm.L', keys: upperL }, { bone: 'forearm.L', keys: foreL },
    { bone: 'upperarm.R', keys: upperR }, { bone: 'forearm.R', keys: foreR },
  ];
}

for (const [name, g] of Object.entries(GAITS)) {
  const clip = recipe.clips.find((c) => c.name === name);
  if (clip === undefined) throw new Error(`villager: falta el clip ${name}`);
  clip.interpolation = 'LINEAR';
  clip.tracks = [...bodyTracks(g, clip.frames), ...legTracks(g, clip.frames)];
  // La zancada nominal: lo que avanza el cuerpo mientras el tobillo apoyado
  // recorre `front + back` en la fracción `stance`, en celdas. **La medida
  // sobre el GLB manda** (`gait-report.ts --only villager --glb <candidato>`,
  // 29 sep 2026: 0,423 y 0,339 contra 0,439 y 0,349 nominales, porque el
  // tobillo no está plantado del todo mientras el talón se levanta), así que
  // la que ya está escrita en la receta se conserva; `--nominal` la sustituye
  // para volver a medir desde cero tras cambiar `GAITS`.
  const nominal = Math.round(((g.front + g.back) / g.stance) * recipe.scale * 1000) / 1000;
  if (process.argv.includes('--nominal') || typeof clip.strideLength !== 'number') clip.strideLength = nominal;
  console.log(`${name}: ${clip.tracks.length} pistas, zancada nominal ${nominal} celdas, escrita ${clip.strideLength}`);
}
writeFileSync(source, `${JSON.stringify(recipe, null, 2)}\n`);
