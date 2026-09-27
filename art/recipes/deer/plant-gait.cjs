// El paso del ciervo con el casco plantado. 27 sep 2026.
//
// Vera: «la animación del ciervo al andar está rota … siguen pareciendo que
// deslizan». Dos causas medidas en el GLB publicado:
//
//   1. El GLB era anterior a `repair-gait.cjs`: las patas giraban sobre su
//      propio eje (Y local, a lo largo del hueso). Se arregla reconstruyendo.
//   2. Y aun reconstruido, el paso era un péndulo: la pata iba adelante y
//      atrás con el casco a ras de suelo todo el ciclo, así que «apoyado» el
//      casco iba tanto hacia delante como hacia atrás — patinaba el 99 %. Y la
//      zancada declarada (0,55 celdas) no la podía dar una pata de 0,30.
//
// Aquí el paso se hace al revés: se fija dónde está el casco en cada fotograma
// —apoyado, retrocede en línea recta a la velocidad del cuerpo; en el aire,
// vuelve adelante levantado— y la cadera y la rodilla salen de una cinemática
// inversa de dos huesos en el plano de la marcha. El casco va vertical. El
// cuerpo baja un poco al andar para que la pata llegue sin estirarse del todo.
//
//   node art/recipes/deer/plant-gait.cjs      (reescribe el clip `walk` de deer.json)
const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, 'deer.json');
const recipe = JSON.parse(fs.readFileSync(source, 'utf8'));
if (recipe.id !== 'deer') throw new Error(`Unexpected recipe: ${source}`);
const walk = recipe.clips.find((clip) => clip.name === 'walk');
if (walk === undefined) throw new Error('deer: walk clip missing');

/** TUNE visual, en unidades de receta (el GLB va a `recipe.scale`). */
const GAIT = {
  stance: 0.62,   // fracción del ciclo con el casco en el suelo
  sweep: 0.62,    // lo que retrocede el casco apoyado
  lift: 0.24,     // lo que sube en el aire
  dip: 0.07,      // lo que baja el cuerpo al andar, para que la pata llegue
  bob: 0.015,     // y el cabeceo, dos veces por ciclo
};

const bone = (name) => {
  const found = recipe.rig.bones.find((b) => b.name === name);
  if (found === undefined) throw new Error(`deer: bone ${name} missing`);
  return found;
};
const upper = (side) => Math.abs(bone(side).head[2] - bone(`${side}Lower`).head[2]);
const lower = (side) => Math.abs(bone(`${side}Lower`).head[2] - bone(`${side}Foot`).head[2]);
const footLength = (side) => Math.abs(bone(`${side}Foot`).head[2] - bone(`${side}Foot`).tail[2]);

// Diagonales a la par, como el paso que tenía: mano izquierda con pie derecho.
const PHASE = { foreL: 0, hindR: 0, foreR: 0.5, hindL: 0.5 };
const frames = walk.frames;
const degrees = (radians) => Math.round(radians * 180 / Math.PI * 100) / 100;

/** El casco, respecto a la cadera en reposo: [adelante(+)/atrás(-), altura sobre el suelo]. */
function hoofAt(p) {
  if (p < GAIT.stance) {
    const u = p / GAIT.stance;
    return { back: -GAIT.sweep / 2 + GAIT.sweep * u, up: 0 };
  }
  const q = (p - GAIT.stance) / (1 - GAIT.stance);
  return { back: GAIT.sweep / 2 - GAIT.sweep * (0.5 - 0.5 * Math.cos(Math.PI * q)), up: GAIT.lift * Math.sin(Math.PI * q) };
}

const tracks = [];
for (const [side, phase] of Object.entries(PHASE)) {
  const a = upper(side), b = lower(side), f = footLength(side);
  const hipZ = bone(side).head[2];
  const groundZ = bone(`${side}Foot`).tail[2];
  const hip = [], knee = [], foot = [];
  for (let frame = 1; frame <= frames; frame += 1) {
    const p = (((frame - 1) / (frames - 1)) + phase) % 1;
    const cycle = (frame - 1) / (frames - 1);
    const drop = GAIT.dip + GAIT.bob * Math.cos(4 * Math.PI * cycle);
    const hoof = hoofAt(p);
    // Del tobillo (arriba del casco) a la cadera bajada. +X de la receta es
    // hacia atrás (la cabeza mira a -X); `back` positivo es hacia +X.
    const dx = hoof.back;
    const dz = (groundZ + f + hoof.up) - (hipZ - drop);
    const d = Math.min(Math.hypot(dx, dz), (a + b) * 0.999);
    // Ángulos positivos = girar el casco hacia -X (medido en el GLB: +Z local
    // lleva el casco adelante). La mano dobla con la articulación hacia
    // delante (el carpo) y la pata de atrás al revés (el corvejón apunta
    // atrás), como un ciervo.
    const hind = side.startsWith('hind') ? -1 : 1;
    const alpha = Math.atan2(-dx, -dz);
    const beta = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
    const bend = hind * (Math.PI - Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - d * d) / (2 * a * b)))));
    const t1 = alpha - hind * beta;
    hip.push({ frame, rotation: [0, 0, degrees(t1)] });
    knee.push({ frame, rotation: [0, 0, degrees(bend)] });
    foot.push({ frame, rotation: [0, 0, degrees(-(t1 + bend))] });
  }
  tracks.push({ bone: side, keys: hip }, { bone: `${side}Lower`, keys: knee }, { bone: `${side}Foot`, keys: foot });
}

// El cuerpo baja y cabecea con el paso; el hueso raíz apunta a +Z, así que su
// Y local es la vertical.
const rootTrack = walk.tracks.find((track) => track.bone === 'root');
rootTrack.location = Array.from({ length: frames }, (_, k) => {
  const cycle = k / (frames - 1);
  return { frame: k + 1, offset: [0, -(GAIT.dip + GAIT.bob * Math.cos(4 * Math.PI * cycle)), 0] };
});

walk.tracks = [
  ...walk.tracks.filter((track) => !/^(fore|hind)[LR](Lower|Foot)?$/.test(track.bone)),
  ...tracks,
];
// La zancada: lo que avanza el cuerpo por ciclo mientras el casco apoyado
// retrocede `sweep` en la fracción `stance`, pasado a celdas.
walk.strideLength = Math.round(GAIT.sweep / GAIT.stance * recipe.scale * 1000) / 1000;
fs.writeFileSync(source, `${JSON.stringify(recipe, null, 2)}\n`);
console.log(`deer walk: ${tracks.length} leg tracks x ${frames} keys, stride ${walk.strideLength} cells`);
