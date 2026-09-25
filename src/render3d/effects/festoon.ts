// El valle más vivo (25 sep 2026) · La plaza engalanada.
//
// Cuando hay fiesta (`festivityOf`: boda, cosecha, barril) la plaza se viste:
// cuatro postes en corro con guirnaldas de banderines de colores entre ellos,
// que se mecen con el viento, y un farolillo en cada poste que se enciende al
// caer la tarde. Se cuelga con la fiesta y se descuelga cuando pasa. Decorado:
// no toca el estado ni tira dados; los colores salen del índice.

import {
  BufferAttribute, BufferGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PointLight, SphereGeometry,
} from 'three';

const POSTS = 4;
const FLAGS_PER_SPAN = 9;
const RADIUS = 2.4;
const POST_HEIGHT = 1.35;
/** Colores de banderín, alegres pero apagados como el resto del valle. */
const COLOURS = ['#b8483a', '#d9a441', '#4f7a8a', '#e6dcc4', '#6d8a3f'];

export interface Festoon {
  readonly group: Group;
  readonly up: boolean;
  place(plaza: { x: number; y: number }, ground: (x: number, z: number) => number): void;
  /** Cuelga o descuelga, y mece con el tiempo; enciende los farolillos de tarde. */
  step(festive: boolean, phase: number, seconds: number): void;
  dispose(): void;
}

export function createFestoon(): Festoon {
  const group = new Group();
  group.name = 'Valley_Festoon';
  group.visible = false;
  const wood = new MeshStandardMaterial({ color: '#6b4a2e', roughness: 1, flatShading: true });
  const postGeometry = new CylinderGeometry(0.04, 0.05, POST_HEIGHT, 6);
  postGeometry.translate(0, POST_HEIGHT / 2, 0);
  const lanternGeometry = new SphereGeometry(0.08, 8, 6);
  const lanternMaterial = new MeshBasicMaterial({ color: '#ffd27a' });
  const lights: PointLight[] = [];
  const corners: { x: number; z: number }[] = [];
  for (let n = 0; n < POSTS; n += 1) {
    const angle = (n / POSTS) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(angle) * RADIUS;
    const z = Math.sin(angle) * RADIUS;
    corners.push({ x, z });
    const post = new Mesh(postGeometry, wood);
    post.position.set(x, 0, z);
    group.add(post);
    const lantern = new Mesh(lanternGeometry, lanternMaterial);
    lantern.position.set(x, POST_HEIGHT + 0.02, z);
    group.add(lantern);
    const light = new PointLight('#ffc070', 0, 3.5, 1.8);
    light.position.set(x, POST_HEIGHT, z);
    group.add(light);
    lights.push(light);
  }
  // Los banderines: un triángulo por bandera, colgado de la cuerda que va de un
  // poste al siguiente, con su comba.
  const flagCount = POSTS * FLAGS_PER_SPAN;
  const positions = new Float32Array(flagCount * 9);
  const colours = new Float32Array(flagCount * 9);
  const flagGeometry = new BufferGeometry();
  flagGeometry.setAttribute('position', new BufferAttribute(positions, 3));
  flagGeometry.setAttribute('color', new BufferAttribute(colours, 3));
  const flagMaterial = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide });
  const flags = new Mesh(flagGeometry, flagMaterial);
  flags.frustumCulled = false;
  group.add(flags);
  for (let f = 0; f < flagCount; f += 1) {
    const hex = COLOURS[f % COLOURS.length]!;
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    for (let v = 0; v < 3; v += 1) colours.set([r, g, b], f * 9 + v * 3);
  }
  let time = 0;
  let shown = false;

  const hang = (): void => {
    for (let span = 0; span < POSTS; span += 1) {
      const a = corners[span]!;
      const b = corners[(span + 1) % POSTS]!;
      for (let k = 0; k < FLAGS_PER_SPAN; k += 1) {
        const f = span * FLAGS_PER_SPAN + k;
        const t0 = (k + 0.15) / FLAGS_PER_SPAN;
        const t1 = (k + 0.85) / FLAGS_PER_SPAN;
        const sag = (t: number): number => POST_HEIGHT - 0.35 * Math.sin(Math.PI * t);
        const sway = Math.sin(time * 2.2 + f * 0.7) * 0.05;
        const p0 = { x: a.x + (b.x - a.x) * t0, z: a.z + (b.z - a.z) * t0, y: sag(t0) };
        const p1 = { x: a.x + (b.x - a.x) * t1, z: a.z + (b.z - a.z) * t1, y: sag(t1) };
        const tipT = (t0 + t1) / 2;
        const tip = { x: a.x + (b.x - a.x) * tipT + sway, z: a.z + (b.z - a.z) * tipT + sway, y: sag(tipT) - 0.18 };
        positions.set([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, tip.x, tip.y, tip.z], f * 9);
      }
    }
    (flagGeometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
  };

  return {
    group,
    get up() { return shown; },
    place(plaza, ground): void {
      group.position.set(plaza.x, ground(plaza.x, plaza.y), plaza.y);
    },
    step(festive, phase, seconds): void {
      shown = festive;
      group.visible = festive;
      if (!festive) return;
      time += Math.max(0, seconds);
      hang();
      // Los farolillos, de la caída de la tarde al alba.
      const evening = phase >= 0.7 || phase < 0.08 ? 1 : 0;
      lanternMaterial.color.set(evening > 0 ? '#ffd27a' : '#c9a86a');
      for (const light of lights) light.intensity = 1.6 * evening * (0.9 + 0.1 * Math.sin(time * 7));
    },
    dispose(): void {
      wood.dispose();
      postGeometry.dispose();
      lanternGeometry.dispose();
      lanternMaterial.dispose();
      flagGeometry.dispose();
      flagMaterial.dispose();
    },
  };
}
