// Reparación de las fuentes del ciervo y del oso derivado de su rig.
// Y local sigue la pierna; la marcha debe flexionarla sobre Z local.
const fs = require('node:fs');
const path = require('node:path');

for (const kind of ['deer', 'bear']) {
  const source = path.resolve(__dirname, `../${kind}/${kind}.json`);
  const recipe = JSON.parse(fs.readFileSync(source, 'utf8'));
  if (recipe.id !== kind) throw new Error(`Unexpected recipe: ${source}`);
  const legs = /^(fore|hind)[LR](Lower|Foot)?$/;
  const tracks = recipe.clips.flatMap(clip => clip.tracks.filter(track => legs.test(track.bone)));
  if (tracks.length < 12) throw new Error(`${kind}: incomplete leg animation`);
  let changed = 0;
  for (const track of tracks) {
    for (const key of track.keys) {
      const [x, y, z] = key.rotation;
      if (y === 0) continue;
      if (z !== 0) throw new Error(`${kind}: ambiguous leg rotation ${track.bone}`);
      key.rotation = [x, 0, y];
      changed += 1;
    }
  }
  if (changed === 0 && !tracks.some(track => track.keys.some(key => Math.abs(key.rotation[2]) > 1))) {
    throw new Error(`${kind}: no articulated leg keys found`);
  }
  // Un hueso vertical da al casco el mismo eje sagital que la rodilla.
  for (const bone of recipe.rig.bones.filter(bone => /^(fore|hind)[LR]Foot$/.test(bone.name))) {
    bone.tail = [bone.head[0], bone.head[1], bone.head[2] - 0.1];
  }
  const walk = recipe.clips.find(clip => clip.name === 'walk');
  if (walk === undefined) throw new Error(`${kind}: walk clip missing`);
  walk.strideLength = 0.55;
  fs.writeFileSync(source, `${JSON.stringify(recipe, null, 2)}\n`);
  process.stdout.write(`${kind}: ${changed} leg keys repaired\n`);
}
