// IA-anim · Las astillas del golpe: madera en el tajo, piedra en la cantera.
//
// Tinta y nada más: no cuentan leña ni piedra, no tocan el estado y no tiran
// dados. Cada golpe suelta unas pocas, con direcciones sacadas de un hash del
// aldeano y del número de golpe, así que dos máquinas ven las mismas.

import { BoxGeometry, Color, DynamicDrawUsage, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';

/** Cuántas astillas vivas como mucho a la vez: un tajo lleno y una cantera. */
const POOL = 96;
/** Por golpe. TUNE: cinco se leen como un chasquido; más, como una explosión. */
const PER_HIT = 5;
/** Vida de una astilla en segundos de presentación. */
const LIFE = 0.7;
/** Gravedad en celdas por segundo al cuadrado: una celda son tres metros. */
const GRAVITY = 3.3;

const COLOURS = { wood: new Color('#c9a26a'), stone: new Color('#a39d92') } as const;

interface Chip { x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; spin: number; kind: 'wood' | 'stone' }

function unit(seed: number): number {
  // xorshift de 32 bits sobre la semilla: estable y sin estado compartido.
  let v = seed | 0;
  v ^= v << 13; v ^= v >>> 17; v ^= v << 5;
  return (v >>> 0) / 4_294_967_296;
}

export class WorkChips {
  readonly mesh: InstancedMesh;
  private readonly chips: (Chip | null)[] = Array.from({ length: POOL }, () => null);
  private next = 0;
  private readonly matrix = new Matrix4();
  private readonly rotation = new Quaternion();
  private readonly axis = new Vector3(0.3, 1, 0.5).normalize();

  constructor() {
    this.mesh = new InstancedMesh(new BoxGeometry(0.028, 0.018, 0.022),
      new MeshStandardMaterial({ roughness: 1 }), POOL);
    this.mesh.name = 'Valley_WorkChips';
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    for (let i = 0; i < POOL; i += 1) this.mesh.setColorAt(i, COLOURS.wood);
  }

  /** Un golpe en `at`, del material que toque. `seed` distingue golpes y aldeanos. */
  hit(at: Vector3, kind: 'wood' | 'stone', seed: number): void {
    for (let n = 0; n < PER_HIT; n += 1) {
      const a = unit(seed * 97 + n * 7919 + 1), b = unit(seed * 31 + n * 104_729 + 7), c = unit(seed * 13 + n * 15_485_863 + 3);
      const angle = a * Math.PI * 2, speed = 0.35 + b * 0.45;
      this.chips[this.next] = {
        x: at.x, y: at.y, z: at.z,
        vx: Math.cos(angle) * speed, vy: 0.6 + c * 0.7, vz: Math.sin(angle) * speed,
        age: 0, spin: a * 20, kind,
      };
      this.next = (this.next + 1) % POOL;
    }
  }

  /** Avanza lo vivo y cae al suelo que diga `ground`. */
  step(seconds: number, ground: (x: number, z: number) => number): void {
    let drawn = 0;
    for (let i = 0; i < POOL; i += 1) {
      const chip = this.chips[i];
      if (chip === null || chip === undefined) continue;
      chip.age += seconds;
      if (chip.age >= LIFE) { this.chips[i] = null; continue; }
      chip.vy -= GRAVITY * seconds;
      chip.x += chip.vx * seconds; chip.y += chip.vy * seconds; chip.z += chip.vz * seconds;
      const floor = ground(chip.x, chip.z) + 0.01;
      if (chip.y < floor) { chip.y = floor; chip.vx *= 0.3; chip.vz *= 0.3; chip.vy = 0; }
      this.rotation.setFromAxisAngle(this.axis, chip.spin * chip.age);
      const shrink = chip.age > LIFE * 0.7 ? 1 - (chip.age - LIFE * 0.7) / (LIFE * 0.3) : 1;
      this.matrix.compose(new Vector3(chip.x, chip.y, chip.z), this.rotation, new Vector3(shrink, shrink, shrink));
      // Las vivas se compactan al principio del buffer: `count` las dibuja todas.
      this.mesh.setMatrixAt(drawn, this.matrix);
      this.mesh.setColorAt(drawn, COLOURS[chip.kind]);
      drawn += 1;
    }
    this.mesh.count = drawn;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor !== null) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Cuántas hay en el aire, para la traza. */
  get alive(): number { return this.chips.filter(chip => chip !== null).length; }

  clear(): void { this.chips.fill(null); this.mesh.count = 0; }

  dispose(): void { this.mesh.geometry.dispose(); (this.mesh.material as MeshStandardMaterial).dispose(); }
}
