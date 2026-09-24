// Conejo original de malla facetada; la receta alimenta el pipeline común.
const fs = require('node:fs');
const rabbit = {
  schemaVersion: 1, id: 'rabbit', scale: 1 / 3, mergeByMaterial: true,
  metadata: {cellUnit: 1, kind: 'rabbit', footprint: [1, 1]},
  materials: [['coat', '#997b60'], ['cream', '#e0d0b2'], ['ear', '#bb8472'], ['dark', '#302823']].map(([name, color]) => ({name, color, roughness: 0.95})),
  groups: [{name: 'Root', location: [0, 0, 0], parent: null}],
  primitives: [], rig: {bones: [], bind: {}}, clips: [], connectors: [],
  referenceRender: {width: 600, height: 600, cameraLocation: [-1.3, -1.8, 1.05], cameraTarget: [0, 0, 0.14], orthoScale: 0.43, worldColor: '#bec9c0'},
};
function bone(name, head, parent) {
  rabbit.rig.bones.push({name, head, tail: [head[0], head[1], head[2] + 0.09], parent});
}
function ell(name, location, dimensions, material, binding, segments = 8, rings = 4, rotationDegrees = [0, 0, 0]) {
  rabbit.primitives.push({type: 'sphere', name, location, dimensions, radius: 1, segments, rings, rotationDegrees, material, parent: 'Root'});
  rabbit.rig.bind[name] = binding;
}
bone('root', [0, 0, 0], null);
bone('body', [0.03, 0, 0.23], 'root');
bone('head', [-0.22, 0, 0.32], 'body');
bone('tail', [0.30, 0, 0.25], 'body');
ell('Barrel', [0.035, 0, 0.275], [0.56, 0.32, 0.34], 'coat', 'body', 10, 6);
ell('Chest', [-0.16, 0, 0.25], [0.28, 0.26, 0.33], 'coat', 'body');
ell('Belly', [-0.015, 0, 0.18], [0.37, 0.28, 0.16], 'cream', 'body');
ell('Head', [-0.29, 0, 0.39], [0.32, 0.235, 0.255], 'coat', 'head', 10, 5);
ell('Muzzle', [-0.415, 0, 0.355], [0.19, 0.19, 0.12], 'cream', 'head');
ell('Nose', [-0.509, 0, 0.369], [0.037, 0.067, 0.045], 'dark', 'head', 6, 3);
ell('CottonTail', [0.338, 0, 0.287], [0.145, 0.145, 0.145], 'cream', 'tail');
for (const [side, sign] of [['L', -1], ['R', 1]]) {
  const earY = sign * 0.074;
  bone('ear' + side, [-0.215, earY, 0.469], 'head');
  ell('Ear' + side, [-0.19, earY, 0.65], [0.105, 0.077, 0.42], 'coat', 'ear' + side, 8, 4, [sign * -9, 9, 0]);
  ell('EarInner' + side, [-0.227, earY - sign * 0.012, 0.651], [0.033, 0.05, 0.305], 'ear', 'ear' + side, 6, 3, [sign * -9, 9, 0]);
  ell('Eye' + side, [-0.364, sign * 0.106, 0.421], [0.052, 0.021, 0.056], 'dark', 'head', 6, 3);
  bone('fore' + side, [-0.175, sign * 0.089, 0.226], 'body');
  bone('foreFoot' + side, [-0.20, sign * 0.089, 0.041], 'fore' + side);
  ell('Foreleg' + side, [-0.19, sign * 0.089, 0.142], [0.072, 0.078, 0.212], 'coat', 'fore' + side);
  ell('FrontPaw' + side, [-0.225, sign * 0.089, 0.031], [0.15, 0.089, 0.062], 'cream', 'foreFoot' + side);
  bone('hind' + side, [0.16, sign * 0.113, 0.24], 'body');
  bone('hindFoot' + side, [0.127, sign * 0.125, 0.062], 'hind' + side);
  ell('Haunch' + side, [0.17, sign * 0.111, 0.205], [0.29, 0.21, 0.305], 'coat', 'hind' + side, 8, 5);
  ell('HindPaw' + side, [0.045, sign * 0.126, 0.040], [0.285, 0.115, 0.08], 'cream', 'hindFoot' + side);
}
function track(boneName, frames, rotations) {
  return {bone: boneName, keys: rotations.map((rotation, i) => ({frame: 1 + i * (frames - 1) / (rotations.length - 1), rotation}))};
}
const still = [[0,0,0], [0,0,0]];
rabbit.clips.push({name: 'idle', frames: 97, loop: true, tracks: [
  track('head', 97, [[0,0,0], [0,8,-5], [0,0,0], [0,-6,4], [0,0,0]]),
  track('earL', 97, [[0,0,0], [-16,0,-10], [0,0,0], [8,0,0], [0,0,0]]),
  track('earR', 97, [[0,0,0], [0,0,0], [12,0,9], [0,0,0], [0,0,0]]),
  {...track('body', 97, still), location: [{frame: 1, offset: [0,0,0]}, {frame: 49, offset: [0,0.006,0]}, {frame: 97, offset: [0,0,0]}]},
]});
// El salto mueve solo el cuerpo en vertical: el controlador decide la trayectoria.
for (const [name, frames, height, amplitude, strideLength] of [['hop', 33, 0.07, 1, 0.15], ['flee', 21, 0.125, 1.3, 0.26]]) {
  const body = track('body', frames, [[0,0,0], [0,0,7], [0,0,-5], [0,0,-2], [0,0,0]]);
  body.location = [0, height * 0.55, height, height * 0.4, 0].map((rise, i) => ({frame: 1 + i * (frames - 1) / 4, offset: [0, rise, 0]}));
  const tracks = [body, track('head', frames, [[0,0,0], [0,0,-4], [0,0,6], [0,0,4], [0,0,0]])];
  for (const [side, sign] of [['L', -1], ['R', 1]]) {
    tracks.push(track('fore' + side, frames, [0, -15, -40, 16, 0].map(v => [0,0,v * amplitude])));
    tracks.push(track('foreFoot' + side, frames, [0, 8, 25, -12, 0].map(v => [0,0,v * amplitude])));
    tracks.push(track('hind' + side, frames, [0, -25, 15, 10, 0].map(v => [0,0,v * amplitude])));
    tracks.push(track('hindFoot' + side, frames, [0, 8, -25, -8, 0].map(v => [0,0,v * amplitude])));
    tracks.push(track('ear' + side, frames, [0, -12, -20, -7, 0].map(v => [sign * 3,0,v * amplitude])));
  }
  rabbit.clips.push({name, frames, loop: true, strideLength, tracks});
}
fs.writeFileSync('art/recipes/rabbit/rabbit.json', JSON.stringify(rabbit, null, 2) + '\n');
const catalog = JSON.parse(fs.readFileSync('art/catalog.json', 'utf8'));
if (!catalog.assets.some(a => a.id === rabbit.id)) {
  catalog.assets.unshift({id: rabbit.id, artifactRound: 'G-36', status: 'study', recipe: 'art/recipes/rabbit/rabbit.json', generator: 'tools/art/blender-build.py', blenderVersion: '5.2.1 LTS', approved: null, bounds: null, recipeSha256: null, materials: rabbit.materials.map(m => m.name), clips: rabbit.clips.map(c => c.name), motion: [], connectors: [], statistics: null, hashes: {}, provenance: {kind: 'original', source: 'Original low-poly rabbit for The Valley, 23 Sep 2026. Local procedural authorship; no external provider.', license: 'Project original'}});
  fs.writeFileSync('art/catalog.json', JSON.stringify(catalog, null, 2) + '\n');
}
