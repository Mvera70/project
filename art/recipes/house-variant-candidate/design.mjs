import { readFile, writeFile } from 'node:fs/promises';
const here = new URL('./', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, here), 'utf8'));
const cube = (name, location, dimensions, material) => ({ type: 'cube', name, location, dimensions, material, parent: 'Root' });
const gable = (name, location, width, depth, height, rotation = 0) => ({ type: 'gable', name, location, width, depth, height, rotationDegrees: [0, 0, rotation], material: 'roof', parent: 'Root' });

// Las carpinterías conservan los anclajes del modelo publicado.
const wood = await read('../house/house.json');
wood.id = 'house-twin-gable';
wood.metadata.note = 'Candidato original: dos crujías escalonadas de entramado y paja. Puerta y tres ventanas conservan los anclajes publicados.';
wood.primitives = wood.primitives.filter(p => !/House_(Walls|Roof|Eaves|Ridge|ThatchCourse|Chimney|Lintel|SideLintel)/.test(p.name));
wood.primitives.push(
  cube('House_MainWalls', [2.01,3,1.38], [3.18,5.16,2.76], 'plaster'),
  cube('House_LowerWalls', [4.59,3,1.1], [1.98,5.16,2.2], 'plaster'),
  gable('House_MainRoof', [1.95,3,2.76], 3.9,6,1.56),
  gable('House_LowerRoof', [4.86,3,2.2], 2.28,6,1.14),
  cube('House_MainRidge', [1.95,3,4.33], [.2,6,.13], 'roof'),
  cube('House_LowerRidge', [4.86,3,3.35], [.19,6,.13], 'roof'),
  cube('House_ValleyFlashing', [3.77,3,2.4], [.14,6,.14], 'wood'),
  cube('House_Chimney', [3.25,4.4,3.45], [.48,.48,2.3], 'stone'),
  cube('House_ChimneyCap', [3.25,4.4,4.59], [.64,.64,.15], 'stone'),
  cube('House_ChimneyOpening', [3.25,4.4,4.674], [.36,.36,.018], 'window'),
);
for (const y of [.4,5.6]) {
  wood.primitives.push(cube(`House_MainBeam_${y}`, [2.01,y,2.7], [3.35,.17,.17], 'wood'));
  wood.primitives.push(cube(`House_LowerBeam_${y}`, [4.59,y,2.15], [2.1,.17,.17], 'wood'));
  wood.primitives.push(cube(`House_PartyPost_${y}`, [3.6,y,1.4], [.16,.16,2.7], 'wood'));
}
for (const [center,width,base,height] of [[1.95,3.9,2.76,1.56],[4.86,2.28,2.2,1.14]]) {
  for (const sign of [-1,1]) for (const fraction of [.35,.72]) {
    wood.primitives.push(cube(`House_Thatch_${center}_${sign}_${fraction}`, [center+sign*width*.5*fraction,3,base+height*(1-fraction)+.025], [.1,5.98,.07], 'roof'));
  }
}

const stone = await read('../stone-house/stone-house.json');
stone.id = 'stone-house-cross-gable';
stone.metadata.note = 'Candidato original: casa de mampostería con hastial central elevado, cubierta en cruz y dos alas bajas. Puerta y ventanas conservan anclajes publicados.';
stone.primitives = stone.primitives.filter(p => !/Stone_(Roof|Ridge|TileCourse)/.test(p.name));
stone.primitives.push(
  gable('Stone_MainRoof', [3,3,2.6], 6,6,1.45,90),
  cube('Stone_EntryUpperWall', [3,1.7,2.9], [1.7,2.62,.6], 'stone'),
  gable('Stone_EntryRoof', [3,1.62,3.2], 2.2,3.24,1.4),
  cube('Stone_EntryRidge', [3,1.62,4.6], [.17,3.24,.16], 'roof'),
  cube('Stone_RearRidge', [3,3,4.06], [6,.18,.14], 'roof'),
);
// Las hiladas del tejado transversal se cortan donde entra el hastial.
for (const y of [.55,1.3,2.05,3.95,4.7,5.45]) {
  const z = 2.6 + 1.45 * (1-Math.abs(y-3)/3) + .025;
  if (y < 3) for (const x of [.95,5.05]) stone.primitives.push(cube(`Stone_Tiles_${x}_${y}`, [x,y,z], [1.86,.09,.06], 'roof'));
  else stone.primitives.push(cube(`Stone_Tiles_${y}`, [3,y,z], [5.98,.09,.06], 'roof'));
}
for (const x of [2.25,2.6,3.4,3.75]) {
  const z=3.2+1.4*(1-Math.abs(x-3)/1.1)+.02;
  stone.primitives.push(cube(`Stone_EntryTiles_${x}`, [x,1.62,z], [.08,3.22,.06], 'roof'));
}
const pyramid = (name, x, y, width, base, height) => ({ type: 'cone', name, location: [x,y,base+height/2], radius: width/Math.sqrt(2), depth: height, vertices: 4, rotationDegrees: [0,0,45], material: 'roof', parent: 'Root', smooth: false });
const hip = await read('../house/house.json');
hip.id = 'house-hip-roof';
hip.metadata.note = 'Segunda variante original: cuerpo alto de entramado bajo cubierta piramidal de cuatro aguas. Exactamente tres ventanas y puerta originales; sin huecos nuevos.';
hip.primitives = hip.primitives.filter(p => !/House_(Roof|Eaves|Ridge|ThatchCourse|Chimney)/.test(p.name));
for (const p of hip.primitives) {
  if (p.name==='House_Walls') { p.location[2]=1.42; p.dimensions[2]=2.84; }
  if (/House_(Lintel|SideLintel)/.test(p.name)) p.location[2]=2.77;
  if (/House_(FrontPost|BackPost|SidePost)/.test(p.name)) { p.location[2]=1.52; p.dimensions[2]=2.57; }
}
hip.primitives.push(pyramid('House_HipRoof',3,3,6,2.84,2.12));
// Bandas de paja en cuatro vertientes, anillos cerrados y ninguna ventana extra.
for (const fraction of [.25,.55,.8]) {
  const width=6*(1-fraction),z=2.84+2.12*fraction+.025;
  for (const sign of [-1,1]) {
    hip.primitives.push(cube(`House_HipCourseX_${fraction}_${sign}`,[3,3+sign*width/2,z],[width+.07,.09,.07],'roof'));
    hip.primitives.push(cube(`House_HipCourseY_${fraction}_${sign}`,[3+sign*width/2,3,z],[.09,width+.07,.07],'roof'));
  }
}
hip.primitives.push(cube('House_Chimney',[4.55,4.55,3.65],[.45,.45,1.7],'stone'),cube('House_ChimneyCap',[4.55,4.55,4.47],[.61,.61,.15],'stone'),cube('House_ChimneyOpening',[4.55,4.55,4.554],[.34,.34,.018],'window'));

const loft = await read('../stone-house/stone-house.json');
loft.id = 'stone-house-tower-loft';
loft.metadata.note = 'Segunda variante original: vivienda compacta con altillo lateral alto y cubierta piramidal independiente, sin almenas ni iconografía militar; tres ventanas y puerta originales.';
loft.primitives=loft.primitives.filter(p=>!/Stone_(Roof|Ridge|TileCourse|Chimney)/.test(p.name));
loft.primitives.push(
  gable('Stone_LowRoof',[3,3,2.6],6,6,1.03,90),
  cube('Stone_LoftWalls',[4.7,4.7,3.53],[2.04,2.04,2.14],'stone'),
  cube('Stone_LoftBelt',[4.7,4.7,3.62],[2.16,2.16,.15],'stone'),
  pyramid('Stone_LoftRoof',4.7,4.7,2.6,4.6,1.03),
  cube('Stone_LowRidge',[1.8,3,3.63],[3.6,.19,.13],'roof'),
  cube('Stone_Chimney',[1.4,4.4,3.2],[.52,.52,1.9],'stone'),
  cube('Stone_ChimneyCap',[1.4,4.4,4.14],[.68,.68,.15],'stone'),
  cube('Stone_ChimneyOpening',[1.4,4.4,4.224],[.38,.38,.018],'window'),
);
for (const y of [.6,1.45,2.3,3.7,4.55,5.4]) {
  const z=2.6+1.03*(1-Math.abs(y-3)/3)+.025;
  const width=y>3.6?3.62:5.98;
  loft.primitives.push(cube(`Stone_LowTile_${y}`,[width/2+.01,y,z],[width,.09,.065],'roof'));
}
for (const x of [3.72,5.68]) for (const y of [3.72,5.68]) {
  loft.primitives.push(cube(`Stone_LoftQuoin_${x}_${y}`,[x,y,4.1],[.22,.22,.65],'stone'));
}
for (const recipe of [wood,stone,hip,loft]) {
  for (const p of recipe.primitives) p.name=p.name.replaceAll('.', '_').replaceAll('-', 'n');
  await writeFile(new URL(`${recipe.id}.json`,here), JSON.stringify(recipe,null,2)+'\n');
}
