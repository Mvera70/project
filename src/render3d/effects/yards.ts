// El valle más vivo (25 sep 2026) · La ropa tendida y el huerto de cada casa.
//
// Dónde va cada cosa lo dice `derive/yards.ts`; esto la dibuja. El tendedero
// son dos postes, una cuerda y unas prendas que se mecen con el viento
// (`windStrength`), y que **se recogen** cuando llueve, nieva o es de noche:
// la cuerda vacía también cuenta algo. El huerto es un bancal de tierra con
// tres hileras de matas que siguen la estación: brotes en primavera, verde en
// verano, dorado en otoño y la tierra desnuda en invierno. Decorado: no toca
// el estado ni tira dados; los colores salen del `id` de la casa.

import {
  BoxGeometry, CylinderGeometry, DodecahedronGeometry, DoubleSide, Group, Mesh,
  MeshStandardMaterial, PlaneGeometry,
} from 'three';
import { hash32 } from '@engine/rng';
import type { Season } from '@engine/state';
import type { Yard } from '../../derive/yards';
import type { SkyKind } from '../../derive/weather';
import { windStrength } from './wind';

const POST_HEIGHT = 0.95;
const LINE_SPAN = 1.6;
/** Colores de ropa de casa: lino, lana teñida, nada chillón. */
const CLOTHS = ['#e8dfc8', '#c9b48a', '#7d8fa3', '#a8574a', '#d8cfb4', '#6f7f5a'];
const CROP: Readonly<Record<Season, string | null>> = {
  spring: '#9cc26a', summer: '#4f8a3a', autumn: '#b8903e', winter: null,
};

export interface Yards {
  readonly group: Group;
  /** Cuántas prendas hay tendidas ahora (para la traza). */
  readonly hung: number;
  show(yards: readonly Yard[], ground: (x: number, z: number) => number): void;
  step(phase: number, season: Season, sky: SkyKind, seconds: number): void;
  dispose(): void;
}

export function createYards(): Yards {
  const group = new Group();
  group.name = 'Valley_Yards';
  const wood = new MeshStandardMaterial({ color: '#6b4a2e', roughness: 1, flatShading: true });
  const rope = new MeshStandardMaterial({ color: '#cbb994', roughness: 1 });
  const soil = new MeshStandardMaterial({ color: '#5a3f28', roughness: 1, flatShading: true });
  const crop = new MeshStandardMaterial({ color: '#4f8a3a', roughness: 1, flatShading: true });
  const clothMaterials = CLOTHS.map((color) => new MeshStandardMaterial({ color, roughness: 1, side: DoubleSide }));
  const postGeometry = new CylinderGeometry(0.035, 0.045, POST_HEIGHT, 5);
  postGeometry.translate(0, POST_HEIGHT / 2, 0);
  const ropeGeometry = new CylinderGeometry(0.008, 0.008, LINE_SPAN, 3);
  ropeGeometry.rotateZ(Math.PI / 2);
  const clothGeometry = new PlaneGeometry(0.28, 0.34);
  // Colgada de su borde de arriba, para que se meza desde la cuerda.
  clothGeometry.translate(0, -0.17, 0);
  const bedGeometry = new BoxGeometry(1.5, 0.06, 0.8);
  const tuftGeometry = new DodecahedronGeometry(0.09, 0);
  let cloths: Mesh[] = [];
  let tufts: Mesh[] = [];
  let key = '';
  let time = 0;
  let hung = 0;

  const clear = (): void => {
    for (const child of [...group.children]) group.remove(child);
    cloths = [];
    tufts = [];
  };

  return {
    group,
    get hung() { return hung; },
    show(yards, ground): void {
      const next = yards.map((y) => `${y.house}:${y.kind}:${y.x}:${y.z}`).join('|');
      if (next === key) return;
      key = next;
      clear();
      for (const yard of yards) {
        const piece = new Group();
        piece.position.set(yard.x, ground(yard.x, yard.z), yard.z);
        if (yard.along === 'z') piece.rotation.y = Math.PI / 2;
        if (yard.kind === 'line') {
          for (const end of [-1, 1]) {
            const post = new Mesh(postGeometry, wood);
            post.position.x = end * LINE_SPAN / 2;
            piece.add(post);
          }
          const line = new Mesh(ropeGeometry, rope);
          line.position.y = POST_HEIGHT - 0.04;
          piece.add(line);
          const count = 3 + (hash32(yard.house, 'yard:cloths') % 3);
          for (let n = 0; n < count; n += 1) {
            const material = clothMaterials[hash32(yard.house, `yard:cloth:${n}`) % clothMaterials.length]!;
            const cloth = new Mesh(clothGeometry, material);
            cloth.position.set(-LINE_SPAN / 2 + (n + 1) * LINE_SPAN / (count + 1), POST_HEIGHT - 0.05, 0);
            cloth.userData.sway = n * 1.3 + yard.house * 0.7;
            piece.add(cloth);
            cloths.push(cloth);
          }
        } else {
          const bed = new Mesh(bedGeometry, soil);
          bed.position.y = 0.02;
          piece.add(bed);
          for (let row = 0; row < 3; row += 1) {
            for (let n = 0; n < 5; n += 1) {
              const tuft = new Mesh(tuftGeometry, crop);
              tuft.position.set(-0.56 + n * 0.28, 0.1, -0.24 + row * 0.24);
              tuft.rotation.y = hash32(yard.house, `yard:tuft:${row}:${n}`) % 6;
              piece.add(tuft);
              tufts.push(tuft);
            }
          }
        }
        group.add(piece);
      }
    },
    step(phase, season, sky, seconds): void {
      time += Math.max(0, seconds);
      // Se recoge con lluvia, nieve o de noche; se tiende con buen tiempo de día.
      const out = phase > 0.2 && phase < 0.76 && (sky === 'clear' || sky === 'overcast');
      const wind = windStrength();
      hung = 0;
      for (const cloth of cloths) {
        cloth.visible = out;
        if (!out) continue;
        hung += 1;
        const offset = cloth.userData.sway as number;
        cloth.rotation.x = (0.15 + 0.35 * wind) * Math.sin(time * (1.8 + wind) + offset);
      }
      const colour = CROP[season];
      for (const tuft of tufts) tuft.visible = colour !== null;
      if (colour !== null) {
        crop.color.set(colour);
        const size = season === 'spring' ? 0.6 : 1;
        for (const tuft of tufts) tuft.scale.setScalar(size);
      }
    },
    dispose(): void {
      clear();
      for (const material of [wood, rope, soil, crop, ...clothMaterials]) material.dispose();
      for (const geometry of [postGeometry, ropeGeometry, clothGeometry, bedGeometry, tuftGeometry]) geometry.dispose();
    },
  };
}
