// Autoría original de perdiz: receta canónica para el pipeline común de Blender.
const fs = require('node:fs');
const bird = {
  schemaVersion: 1, id: 'partridge', scale: 1 / 3, mergeByMaterial: true,
  metadata: { cellUnit: 1, kind: 'partridge', footprint: [1, 1] },
  materials: [['coat', '#806953'], ['cream', '#ded0ac'], ['dark', '#302c27'], ['red', '#b55538']].map(([name, color]) => ({name, color, roughness: 0.95})),
  groups: [{name: 'Root', location: [0, 0, 0], parent: null}],
  primitives: [], rig: {bones: [], bind: {}}, clips: [], connectors: [],
  referenceRender: {width: 600, height: 600, cameraLocation: [-1.2, -1.5, 1], cameraTarget: [0, 0, 0.095], orthoScale: 0.40, worldColor: '#bec9c0'},
};
function bone(name, head, parent) {
  bird.rig.bones.push({name, head, tail: [head[0], head[1], head[2] + 0.07], parent});
}
function ell(name, location, dimensions, material, binding, segments = 8, rings = 4) {
  bird.primitives.push({type: 'sphere', name, location, dimensions, radius: 1, segments, rings, material, parent: 'Root'});
  bird.rig.bind[name] = binding;
}
function box(name, location, dimensions, material, binding) {
  bird.primitives.push({type: 'cube', name, location, dimensions, material, parent: 'Root'});
  bird.rig.bind[name] = binding;
}
bone('root', [0, 0, 0], null);
bone('body', [0, 0, 0.25], 'root');
bone('neck', [-0.15, 0, 0.35], 'body');
bone('head', [-0.23, 0, 0.43], 'neck');
bone('tail', [0.2, 0, 0.28], 'body');
ell('Body', [0.025, 0, 0.285], [0.52, 0.31, 0.36], 'coat', 'body', 10, 6);
ell('Breast', [-0.11, 0, 0.26], [0.3, 0.285, 0.28], 'cream', 'body');
ell('NeckCollar', [-0.18, 0, 0.39], [0.205, 0.20, 0.21], 'dark', 'neck');
ell('Throat', [-0.24, 0, 0.425], [0.16, 0.17, 0.16], 'cream', 'head');
ell('Crown', [-0.205, 0, 0.493], [0.225, 0.205, 0.155], 'coat', 'head');
// Pico corto triangular; sin cresta ni cola vertical de gallina.
bird.primitives.push({type: 'cone', name: 'Beak', location: [-0.346, 0, 0.465], radius: 0.035, depth: 0.095, vertices: 4, rotationDegrees: [0, -90, 0], material: 'red', parent: 'Root'});
bird.rig.bind.Beak = 'head';
for (const [side, sign] of [['L', -1], ['R', 1]]) {
  const y = sign * 0.077;
  bone('leg' + side, [0.01, y, 0.18], 'body');
  bone('foot' + side, [0.01, y, 0.036], 'leg' + side);
  bone('wing' + side, [-0.005, sign * 0.12, 0.34], 'body');
  ell('EyeRing' + side, [-0.257, sign * 0.092, 0.49], [0.075, 0.029, 0.065], 'red', 'head');
  ell('Eye' + side, [-0.265, sign * 0.107, 0.495], [0.037, 0.014, 0.035], 'dark', 'head', 6, 3);
  box('Shin' + side, [0.01, y, 0.105], [0.026, 0.024, 0.15], 'red', 'leg' + side);
  for (let k = -1; k <= 1; k++) box('Toe' + side + (k + 1), [-0.025, y + k * 0.02, 0.012], [0.11, 0.014, 0.024], 'red', 'foot' + side);
  ell('Wing' + side, [0.065, sign * 0.143, 0.265], [0.35, 0.073, 0.26], 'coat', 'wing' + side);
  for (let k = 0; k < 3; k++) {
    ell('FlightFeather' + side + k, [0.10 + k * 0.064, sign * (0.157 + k * 0.014), 0.187 + k * 0.018], [0.105, 0.04, 0.24], 'coat', 'wing' + side, 6, 3);
    box('FlankBar' + side + k, [-0.045 + k * 0.082, sign * 0.153, 0.233], [0.027, 0.012, 0.104], 'dark', 'wing' + side);
    box('FlankLight' + side + k, [-0.02 + k * 0.082, sign * 0.155, 0.234], [0.021, 0.014, 0.095], 'cream', 'wing' + side);
  }
}
for (let k = -1; k <= 1; k++) ell('TailFeather' + (k + 1), [0.28, k * 0.042, 0.275], [0.23, 0.075, 0.065], 'red', 'tail', 6, 3);
function track(boneName, frames, rotations) {
  return {bone: boneName, keys: rotations.map((rotation, i) => ({frame: 1 + i * (frames - 1) / (rotations.length - 1), rotation}))};
}
bird.clips = [
  {name: 'idle', frames: 97, loop: true, tracks: [
    track('head', 97, [[0,0,0], [0,8,-14], [0,0,0], [0,-8,9], [0,0,0]]),
    track('neck', 97, [[0,0,0], [0,0,-8], [0,0,0], [0,0,3], [0,0,0]]),
  ]},
  {name: 'walk', frames: 25, loop: true, strideLength: 0.055, tracks: [
    track('legL', 25, [[0,0,24], [0,0,0], [0,0,-24], [0,0,0], [0,0,24]]),
    track('legR', 25, [[0,0,-24], [0,0,0], [0,0,24], [0,0,0], [0,0,-24]]),
    track('footL', 25, [[0,0,-24], [0,0,-16], [0,0,24], [0,0,0], [0,0,-24]]),
    track('footR', 25, [[0,0,24], [0,0,0], [0,0,-24], [0,0,-16], [0,0,24]]),
    track('neck', 25, [[0,0,-4], [0,0,5], [0,0,-4], [0,0,5], [0,0,-4]]),
  ]},
  {name: 'flight', frames: 13, loop: true, tracks: [
    track('wingL', 13, [[-30,0,0], [-105,0,0], [-30,0,0], [18,0,0], [-30,0,0]]),
    track('wingR', 13, [[30,0,0], [105,0,0], [30,0,0], [-18,0,0], [30,0,0]]),
    track('legL', 13, [[0,0,-55], [0,0,-55]]),
    track('legR', 13, [[0,0,-55], [0,0,-55]]),
    track('neck', 13, [[0,0,-12], [0,0,-18], [0,0,-12]]),
    track('tail', 13, [[0,0,5], [0,0,-8], [0,0,5]]),
  ]},
];
fs.writeFileSync('art/recipes/partridge/partridge.json', JSON.stringify(bird, null, 2) + '\n');
const catalog = JSON.parse(fs.readFileSync('art/catalog.json', 'utf8'));
if (!catalog.assets.some(a => a.id === bird.id)) {
  catalog.assets.unshift({id: bird.id, artifactRound: 'G-35', status: 'study', recipe: 'art/recipes/partridge/partridge.json', generator: 'tools/art/blender-build.py', blenderVersion: '5.2.1 LTS', approved: null, bounds: null, recipeSha256: null, materials: bird.materials.map(m => m.name), clips: bird.clips.map(c => c.name), motion: [], connectors: [], statistics: null, hashes: {}, provenance: {kind: 'original', source: 'Original low-poly partridge for The Valley, 23 Sep 2026. Local procedural authorship; no external provider.', license: 'Project original'}});
  fs.writeFileSync('art/catalog.json', JSON.stringify(catalog, null, 2) + '\n');
}

