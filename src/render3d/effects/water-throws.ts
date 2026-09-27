// El agua que se tira, y la que cae. 26 sep 2026.
//
// Vera: «cuando hacemos lo de apagar, que el agua sea física y se vea cómo se
// tira». La brigada de cubos (E4) soltaba cinco astillas de 3 cm del color del
// agua (`work-chips.ts`): desde la cámara, nada. Esto es un chorro:
//
//   · **el cubo vaciado**: veinte gotas salen de la mano hacia delante, con su
//     parábola, estiradas en la dirección en que vuelan —que es como se lee el
//     agua en el aire—, y al tocar el suelo **salpican**: rebotan tres gotas
//     pequeñas y se abre un anillo;
//   · **la lluvia en el suelo**: mientras llueve, anillos pequeños se abren
//     alrededor de lo que se mira. Sobre el río los pinta el agua viva
//     (`world/water-surface.ts`); estos son los de la tierra.
//
// Física de partícula —gravedad, choque con el suelo, rebote—, no Rapier: un
// cuerpo rígido por gota costaría más que toda la brigada y no se vería mejor.
// Tinta y nada más: no toca el estado ni tira dados; las direcciones salen de
// un hash del golpe, así que dos máquinas ven el mismo chorro.

import {
  AdditiveBlending, Color, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedMesh, Matrix4, MeshBasicMaterial,
  MeshStandardMaterial, Quaternion, RingGeometry, Vector3,
} from 'three';

/** Gotas vivas como mucho: cuatro cubos en el aire a la vez. TUNE. */
const DROPS = 240;
/** Por cubo. TUNE visual: con menos de quince el chorro se lee como piedras. */
const PER_THROW = 20;
/** Anillos vivos como mucho, de salpicadura y de lluvia. */
const RINGS = 96;
/** Gravedad en celdas por segundo al cuadrado: una celda son tres metros. */
const GRAVITY = 3.3;
/** Lo que vive un anillo, en segundos de presentación. */
const RING_LIFE = 0.7;
/** Lo que se abre, en celdas: el de una salpicadura y el de una gota de lluvia. */
const RING_SPLASH = 0.3;
const RING_RAIN = 0.12;
/** Anillos de lluvia por segundo a plena lluvia, en lo que se mira. TUNE visual. */
const RAIN_RINGS = 40;
/** Lo lejos de lo que se mira que caen, en celdas. */
const RAIN_RADIUS = 9;

interface Drop {
  x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; size: number; bounces: number;
  /** Si va escurriendo por una pared: cae despacio, pegada a ella. */
  sliding: boolean;
}

/**
 * Lo que hay sólido en el aire, para que el agua choque: si el punto está
 * dentro de una pared. Sin ello las gotas atravesaban la casa que ardía.
 */
export type Solid = (x: number, y: number, z: number) => boolean;

/**
 * Cada cuánto camino salpica quien vadea, en celdas: una pisada. TUNE visual:
 * un aldeano da un paso de unos 0,25 celdas (75 cm).
 */
const STRIDE = 0.3;
/** Salpicaduras por segundo al pie de las cascadas, entre todas. TUNE visual. */
const CHURN = 14;
/** Lo que se abre el anillo de una pisada en el agua, en celdas. */
const RING_WADE = 0.16;

/** Lo deprisa que escurre el agua por una pared, en celdas por segundo. TUNE visual. */
const SLIDE = 0.55;
interface Ring { x: number; y: number; z: number; age: number; size: number }

function unit(seed: number): number {
  let v = seed | 0;
  v ^= v << 13; v ^= v >>> 17; v ^= v << 5;
  return (v >>> 0) / 4_294_967_296;
}

const RING_TINT = new Color(0.34, 0.4, 0.44);
const UP = new Vector3(0, 1, 0);

export class WaterThrows {
  readonly group = new Group();
  private readonly drops: InstancedMesh;
  private readonly rings: InstancedMesh;
  private readonly live: (Drop | null)[] = Array.from({ length: DROPS }, () => null);
  private readonly ringsLive: (Ring | null)[] = Array.from({ length: RINGS }, () => null);
  private nextDrop = 0;
  private nextRing = 0;
  private rainClock = 0;
  /** Quién vadea: dónde pisó la última vez y cuánto lleva andado desde entonces. */
  private readonly waders = new Map<number, { x: number; z: number; walked: number; steps: number; seen: number }>();
  private wadeFrame = 0;
  private churnClock = 0;
  private churnCount = 0;
  private rainCount = 0;
  private readonly matrix = new Matrix4();
  private readonly rotation = new Quaternion();
  private readonly flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
  private readonly direction = new Vector3();
  private readonly scale = new Vector3();
  private readonly at = new Vector3();
  private readonly fade = new Color();

  constructor() {
    this.group.name = 'Valley_WaterThrows';
    this.drops = new InstancedMesh(new IcosahedronGeometry(1, 0),
      new MeshStandardMaterial({ color: '#d4e8f0', roughness: 0.1, metalness: 0, transparent: true, opacity: 0.85 }), DROPS);
    this.drops.name = 'Valley_WaterDrops';
    this.drops.instanceMatrix.setUsage(DynamicDrawUsage);
    this.drops.count = 0;
    this.drops.frustumCulled = false;
    // Los anillos suman luz: apagarse es ir hacia el negro, sin ordenar
    // transparencias.
    this.rings = new InstancedMesh(new RingGeometry(0.78, 1, 18),
      new MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: AdditiveBlending, depthWrite: false }), RINGS);
    this.rings.name = 'Valley_WaterRings';
    this.rings.instanceMatrix.setUsage(DynamicDrawUsage);
    this.rings.count = 0;
    this.rings.frustumCulled = false;
    for (let i = 0; i < RINGS; i += 1) this.rings.setColorAt(i, RING_TINT);
    this.group.add(this.drops, this.rings);
  }

  /** Un cubo vaciado desde `from` hacia `forward` (horizontal). `seed` distingue cubos y aldeanos. */
  throw(from: Vector3, forward: Vector3, seed: number): void {
    const side = new Vector3(-forward.z, 0, forward.x);
    for (let n = 0; n < PER_THROW; n += 1) {
      const a = unit(seed * 97 + n * 7919 + 1), b = unit(seed * 31 + n * 104_729 + 7), c = unit(seed * 13 + n * 15_485_863 + 3);
      // El chorro: delante, abriéndose poco a los lados, las primeras gotas más
      // rápidas que las últimas, como sale el agua de un cubo que se vuelca.
      const push = 1.4 + a * 1.2;
      const spread = (b - 0.5) * 0.7;
      this.live[this.nextDrop] = {
        x: from.x, y: from.y, z: from.z,
        vx: forward.x * push + side.x * spread, vy: 0.9 + c * 0.8, vz: forward.z * push + side.z * spread,
        age: -n * 0.006, size: 0.03 + c * 0.025, bounces: 0, sliding: false,
      };
      this.nextDrop = (this.nextDrop + 1) % DROPS;
    }
  }

  /** Un anillo en el suelo o en el agua. */
  ring(x: number, y: number, z: number, size: number): void {
    this.ringsLive[this.nextRing] = { x, y, z, age: 0, size };
    this.nextRing = (this.nextRing + 1) % RINGS;
  }

  /**
   * La lluvia en la tierra: `rain` de 0 a 1, alrededor de `centre`. Las gotas
   * salen de un hash del reloj, no de un dado: la misma lluvia en todas las máquinas.
   */
  rain(rain: number, centre: { x: number; z: number }, seconds: number, ground: (x: number, z: number) => number,
    dry: (x: number, z: number) => boolean): void {
    if (rain <= 0) { this.rainClock = 0; return; }
    this.rainClock += seconds * RAIN_RINGS * rain;
    while (this.rainClock >= 1) {
      this.rainClock -= 1;
      this.rainCount += 1;
      const angle = unit(this.rainCount * 2_654_435 + 11) * Math.PI * 2;
      const reach = Math.sqrt(unit(this.rainCount * 40_503 + 5)) * RAIN_RADIUS;
      const x = centre.x + Math.cos(angle) * reach, z = centre.z + Math.sin(angle) * reach;
      if (!dry(x, z)) continue;
      this.ring(x, ground(x, z) + 0.015, z, RING_RAIN);
    }
  }

  /**
   * Alguien anda por el agua —el vado, la orilla—: cada pisada abre un anillo
   * y levanta dos gotas. Se llama por fotograma con quien está en el agua; a
   * quien sale se le olvida solo.
   */
  wade(id: number, x: number, y: number, z: number): void {
    const was = this.waders.get(id);
    if (was === undefined) { this.waders.set(id, { x, z, walked: 0, steps: 0, seen: this.wadeFrame }); return; }
    was.walked += Math.hypot(x - was.x, z - was.z);
    was.x = x; was.z = z; was.seen = this.wadeFrame;
    if (was.walked < STRIDE) return;
    was.walked -= STRIDE;
    was.steps += 1;
    // Un pie y el otro: el anillo cae a un lado y al otro del camino.
    const side = was.steps % 2 === 0 ? 0.04 : -0.04;
    this.ring(x + side, y + 0.02, z - side, RING_WADE);
    for (let k = 0; k < 2; k += 1) {
      const angle = unit(id * 7919 + was.steps * 31 + k) * Math.PI * 2;
      this.live[this.nextDrop] = {
        x: x + side, y: y + 0.03, z: z - side,
        vx: Math.cos(angle) * 0.35, vy: 0.55 + k * 0.15, vz: Math.sin(angle) * 0.35,
        age: 0, size: 0.018, bounces: 1, sliding: false,
      };
      this.nextDrop = (this.nextDrop + 1) % DROPS;
    }
  }

  /**
   * La espuma al pie de una cascada: gotas cortas sobre la espuma del material,
   * a ritmo fijo y sin dados (`world/waterfalls.ts`).
   */
  churn(feet: readonly { x: number; y: number; z: number }[], seconds: number): void {
    if (feet.length === 0) return;
    this.churnClock += seconds * CHURN;
    while (this.churnClock >= 1) {
      this.churnClock -= 1;
      this.churnCount += 1;
      const foot = feet[this.churnCount % feet.length]!;
      const n = this.churnCount;
      const ox = (unit(n * 7_919 + 3) - 0.5) * 0.5, oz = (unit(n * 104_729 + 5) - 0.5) * 0.5;
      // Una caída continua no dibuja círculos concéntricos de gotas aisladas.
      // La espuma la pinta su lámina; aquí sólo salta un poco de agua.
      const angle = unit(n * 15_485_863 + 9) * Math.PI * 2;
      this.live[this.nextDrop] = {
        x: foot.x + ox, y: foot.y + 0.05, z: foot.z + oz,
        vx: Math.cos(angle) * 0.28, vy: 0.4 + unit(n * 13 + 2) * 0.25, vz: Math.sin(angle) * 0.28,
        age: 0, size: 0.018, bounces: 1, sliding: false,
      };
      this.nextDrop = (this.nextDrop + 1) % DROPS;
    }
  }

  /** Olvida a quien no ha vadeado en el último fotograma. */
  endWading(): void {
    for (const [id, was] of this.waders) if (was.seen !== this.wadeFrame) this.waders.delete(id);
    this.wadeFrame += 1;
  }

  /**
   * Avanza las gotas y los anillos; las gotas caen al suelo que diga `ground`
   * y, si se da `solid`, chocan con las paredes y escurren por ellas.
   */
  step(seconds: number, ground: (x: number, z: number) => number, solid?: Solid): void {
    let drawn = 0;
    for (let i = 0; i < DROPS; i += 1) {
      const drop = this.live[i];
      if (drop === null || drop === undefined) continue;
      drop.age += seconds;
      if (drop.age < 0) continue;
      if (drop.age > 2.5) { this.live[i] = null; continue; }
      if (drop.sliding) {
        drop.y -= SLIDE * seconds;
      } else {
        drop.vy -= GRAVITY * seconds;
        const nx = drop.x + drop.vx * seconds, ny = drop.y + drop.vy * seconds, nz = drop.z + drop.vz * seconds;
        if (drop.bounces === 0 && solid?.(nx, ny, nz) === true) {
          // Contra la pared: se queda en la cara donde tocó y escurre hacia
          // abajo; y un poco de agua rebota hacia atrás.
          drop.sliding = true;
          for (let k = 0; k < 2; k += 1) {
            const angle = unit(i * 173 + k * 29 + Math.round(drop.y * 100)) - 0.5;
            this.live[this.nextDrop] = {
              x: drop.x, y: drop.y, z: drop.z,
              vx: -drop.vx * 0.25 + angle * 0.3, vy: 0.3 + k * 0.2, vz: -drop.vz * 0.25 - angle * 0.3,
              age: 0, size: drop.size * 0.4, bounces: 1, sliding: false,
            };
            this.nextDrop = (this.nextDrop + 1) % DROPS;
          }
        } else {
          drop.x = nx; drop.y = ny; drop.z = nz;
        }
      }
      const floor = ground(drop.x, drop.z) + 0.01;
      if (drop.y <= floor) {
        // La salpicadura: la gota grande rebota en tres pequeñas y deja anillo;
        // las pequeñas se quedan en el suelo.
        if (drop.bounces === 0) {
          this.ring(drop.x, floor + 0.005, drop.z, RING_SPLASH * (0.6 + drop.size * 10));
          for (let k = 0; k < 3; k += 1) {
            const angle = unit(i * 131 + k * 17 + Math.round(drop.x * 100)) * Math.PI * 2;
            this.live[this.nextDrop] = {
              x: drop.x, y: floor + 0.02, z: drop.z,
              vx: Math.cos(angle) * 0.5 + drop.vx * 0.15, vy: 0.7 + k * 0.15, vz: Math.sin(angle) * 0.5 + drop.vz * 0.15,
              age: 0, size: drop.size * 0.45, bounces: 1, sliding: false,
            };
            this.nextDrop = (this.nextDrop + 1) % DROPS;
          }
        }
        this.live[i] = null;
        continue;
      }
      // Estirada en la dirección en que vuela: así se lee agua y no granizo. La
      // que escurre, estirada hacia abajo y más fina: es un reguero.
      if (drop.sliding) this.direction.set(0, -SLIDE * 2, 0);
      else this.direction.set(drop.vx, drop.vy, drop.vz);
      const speed = this.direction.length();
      this.rotation.setFromUnitVectors(UP, this.direction.multiplyScalar(1 / Math.max(speed, 1e-4)));
      this.scale.set(drop.size, drop.size * (1 + speed * 0.9), drop.size);
      this.matrix.compose(this.at.set(drop.x, drop.y, drop.z), this.rotation, this.scale);
      this.drops.setMatrixAt(drawn, this.matrix);
      drawn += 1;
    }
    this.drops.count = drawn;
    this.drops.instanceMatrix.needsUpdate = true;

    let rings = 0;
    for (let i = 0; i < RINGS; i += 1) {
      const ring = this.ringsLive[i];
      if (ring === null || ring === undefined) continue;
      ring.age += seconds;
      if (ring.age >= RING_LIFE) { this.ringsLive[i] = null; continue; }
      const t = ring.age / RING_LIFE;
      const size = ring.size * (0.2 + 0.8 * Math.sqrt(t));
      this.matrix.compose(this.at.set(ring.x, ring.y, ring.z), this.flat, this.scale.set(size, size, size));
      this.rings.setMatrixAt(rings, this.matrix);
      this.rings.setColorAt(rings, this.fade.copy(RING_TINT).multiplyScalar(1 - t));
      rings += 1;
    }
    this.rings.count = rings;
    this.rings.instanceMatrix.needsUpdate = true;
    if (this.rings.instanceColor !== null) this.rings.instanceColor.needsUpdate = true;
  }

  /** Cuántas gotas hay en el aire, para la traza y las pruebas. */
  get airborne(): number { return this.live.filter(drop => drop !== null && drop.age >= 0).length; }
  /** Cuántos anillos hay abiertos. */
  get open(): number { return this.ringsLive.filter(ring => ring !== null).length; }

  clear(): void { this.live.fill(null); this.ringsLive.fill(null); this.waders.clear(); this.drops.count = 0; this.rings.count = 0; }

  dispose(): void {
    this.drops.geometry.dispose(); (this.drops.material as MeshStandardMaterial).dispose();
    this.rings.geometry.dispose(); (this.rings.material as MeshBasicMaterial).dispose();
  }
}
