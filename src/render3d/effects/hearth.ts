// El valle más vivo · La hoguera de la plaza.
//
// La gente se reúne al fuego al final de la tarde (`OFFERS.hearth`, franja
// 0,58–0,66 en `places.ts`) y la hoguera tiene que estar ahí: un cerco de
// piedras, unos leños y una llama pequeña que se enciende antes de la reunión
// y se apaga después. A un lado de la fuente, que ocupa el centro. Decorado:
// no toca el estado ni tira dados.

import {
  AdditiveBlending, CanvasTexture, CylinderGeometry, DodecahedronGeometry, Group, Mesh,
  MeshStandardMaterial, PointLight, Sprite, SpriteMaterial, type Texture,
} from 'three';

/** Cuándo arde, en fase de jornada: un poco antes y un poco después del corro. */
const LIT_FROM = 0.55;
const LIT_TO = 0.7;
/** Cuánto se aparta del centro de la plaza, para no pisar la fuente. */
const OFFSET = { x: 1.8, z: 1.1 };

function flameTexture(): Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    const g = ctx.createRadialGradient(16, 50, 2, 16, 40, 30);
    g.addColorStop(0, 'rgba(255,240,180,1)');
    g.addColorStop(0.4, 'rgba(255,160,50,.9)');
    g.addColorStop(1, 'rgba(200,40,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(4, 62); ctx.quadraticCurveTo(2, 30, 16, 2); ctx.quadraticCurveTo(30, 30, 28, 62);
    ctx.closePath();
    ctx.fill();
  }
  return new CanvasTexture(canvas);
}

export interface Hearth {
  readonly group: Group;
  /** Cuánto arde ahora, de 0 a 1. */
  readonly burning: number;
  place(plaza: { x: number; y: number }, ground: (x: number, z: number) => number): void;
  step(phase: number, seconds: number): void;
  dispose(): void;
}

/** Cuánto arde a esta hora: sube y baja en un tramo corto a cada lado. */
export function hearthAt(phase: number): number {
  if (phase < LIT_FROM || phase > LIT_TO) return 0;
  const ramp = 0.02;
  return Math.min(1, (phase - LIT_FROM) / ramp, (LIT_TO - phase) / ramp);
}

export function createHearth(): Hearth {
  const group = new Group();
  group.name = 'Valley_Hearth';
  const stone = new MeshStandardMaterial({ color: '#8a857c', roughness: 1, flatShading: true });
  const wood = new MeshStandardMaterial({ color: '#5a3b24', roughness: 1, flatShading: true });
  const geometries = [new DodecahedronGeometry(0.09, 0), new CylinderGeometry(0.035, 0.04, 0.5, 5)];
  for (let n = 0; n < 9; n += 1) {
    const angle = (n / 9) * Math.PI * 2;
    const rock = new Mesh(geometries[0], stone);
    rock.position.set(Math.cos(angle) * 0.32, 0.05, Math.sin(angle) * 0.32);
    rock.rotation.set(n, n * 2, 0);
    group.add(rock);
  }
  for (let n = 0; n < 4; n += 1) {
    const log = new Mesh(geometries[1], wood);
    log.position.y = 0.08;
    log.rotation.set(Math.PI / 2 - 0.35, (n / 4) * Math.PI * 2, 0, 'YXZ');
    group.add(log);
  }
  const map = flameTexture();
  const flames: Sprite[] = [];
  for (let n = 0; n < 3; n += 1) {
    const flame = new Sprite(new SpriteMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, ...(map === null ? {} : { map }) }));
    flame.center.set(0.5, 0);
    flame.position.set((n - 1) * 0.06, 0.06, (n % 2) * 0.05);
    group.add(flame);
    flames.push(flame);
  }
  const light = new PointLight('#ff9a40', 0, 5, 1.6);
  light.position.y = 0.5;
  group.add(light);
  group.visible = false;
  let time = 0;
  let burning = 0;

  return {
    group,
    get burning() { return burning; },
    place(plaza, ground): void {
      const x = plaza.x + OFFSET.x;
      const z = plaza.y + OFFSET.z;
      group.position.set(x, ground(x, z), z);
      group.visible = true;
    },
    step(phase, seconds): void {
      time += Math.max(0, seconds);
      burning = hearthAt(phase);
      flames.forEach((flame, n) => {
        const flicker = 0.8 + 0.2 * Math.sin(time * (11 + n * 3) + n);
        flame.visible = burning > 0.01;
        flame.scale.set(0.3 * burning, 0.55 * burning * flicker, 1);
        (flame.material as SpriteMaterial).opacity = burning;
      });
      light.intensity = 2.5 * burning * (0.85 + 0.15 * Math.sin(time * 13));
    },
    dispose(): void {
      for (const geometry of geometries) geometry.dispose();
      stone.dispose();
      wood.dispose();
      for (const flame of flames) flame.material.dispose();
      map?.dispose();
    },
  };
}
