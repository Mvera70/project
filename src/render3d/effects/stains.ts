// E4 · Gore contenido: la mancha que queda donde cae alguien.
//
// Decisión del dueño del diseño, 25 sep 2026: «contenido» — una salpicadura
// corta al recibir el golpe (las astillas de sangre de `work-chips.ts`) y
// **una mancha bajo el cuerpo que se desvanece**. Legible desde la cámara de
// juego, sin detalle: un charco oscuro y plano, de borde irregular, que se
// pega al suelo y se va en unas horas de juego (`GORE.STAIN_HOURS`).
//
// Decorado puro: no toca el estado, no tira dados del motor, y la forma de
// cada mancha sale de un hash de quien cayó, así que es la misma en cada
// máquina.

import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, type Texture } from 'three';
import { GORE } from '@engine/balance';
import { SCENIC_DAY_SECONDS } from '../presentation-clock';

function unit(seed: number, salt: number): number {
  let v = (seed * 374761393 + salt * 668265263) | 0;
  v = (v ^ (v >>> 13)) * 1274126177;
  v ^= v >>> 16;
  return (v >>> 0) / 4_294_967_296;
}

/** Un charco de borde irregular: varios discos juntos, oscuros en el centro. */
function stainTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    for (let blob = 0; blob < 7; blob += 1) {
      const angle = unit(blob, 1) * Math.PI * 2;
      const reach = blob === 0 ? 0 : 14 + unit(blob, 2) * 22;
      const x = 64 + Math.cos(angle) * reach;
      const y = 64 + Math.sin(angle) * reach * 0.8;
      const r = blob === 0 ? 34 : 10 + unit(blob, 3) * 14;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.75, 'rgba(255, 255, 255, .9)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return new CanvasTexture(canvas);
}

interface Stain { mesh: Mesh; material: MeshBasicMaterial; age: number }

export class Stains {
  readonly group = new Group();
  // Perezosa: el reparto se crea también en pruebas sin navegador, y ahí no
  // hay `document` con que dibujarla. Sin ella la mancha va lisa.
  private texture: Texture | null = null;
  private readonly geometry = new PlaneGeometry(1, 1);
  private readonly stains = new Map<number, Stain>();

  constructor() {
    this.group.name = 'Valley_Stains';
  }

  /** Una mancha nueva bajo `id`, en el suelo `(x, y, z)`. Una por cuerpo. */
  add(id: number, x: number, y: number, z: number): void {
    if (this.stains.has(id)) return;
    if (this.texture === null && typeof document !== 'undefined') this.texture = stainTexture();
    const material = new MeshBasicMaterial({
      map: this.texture, color: GORE.STAIN_COLOUR, transparent: true, depthWrite: false,
      opacity: GORE.STAIN_OPACITY, polygonOffset: true, polygonOffsetFactor: -2,
    });
    const mesh = new Mesh(this.geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = unit(id, 4) * Math.PI * 2;
    const size = GORE.STAIN_SIZE * (0.8 + unit(id, 5) * 0.4);
    mesh.scale.set(size, size, 1);
    mesh.position.set(x, y + 0.012, z);
    this.group.add(mesh);
    this.stains.set(id, { mesh, material, age: 0 });
  }

  /** Avanza el tiempo escénico y desvanece: primero se oscurece y seca, luego se va. */
  step(seconds: number): void {
    const life = GORE.STAIN_HOURS * SCENIC_DAY_SECONDS / 24;
    for (const [id, stain] of this.stains) {
      stain.age += Math.max(0, seconds);
      const t = stain.age / life;
      if (t >= 1) {
        this.group.remove(stain.mesh);
        stain.material.dispose();
        this.stains.delete(id);
        continue;
      }
      // Crece un poco al principio —se extiende— y se apaga en la segunda mitad.
      const spread = Math.min(1, 0.4 + t * 6);
      const base = stain.mesh.scale.x / (stain.mesh.userData.spread ?? 1);
      stain.mesh.userData.spread = spread;
      stain.mesh.scale.set(base * spread, base * spread, 1);
      stain.material.opacity = GORE.STAIN_OPACITY * (t < 0.5 ? 1 : 1 - (t - 0.5) * 2);
    }
  }

  get count(): number { return this.stains.size; }

  clear(): void {
    for (const stain of this.stains.values()) {
      this.group.remove(stain.mesh);
      stain.material.dispose();
    }
    this.stains.clear();
  }

  dispose(): void {
    this.clear();
    this.geometry.dispose();
    this.texture?.dispose();
  }
}
