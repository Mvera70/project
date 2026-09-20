// D1/D6 · El mundo físico del asedio, a un paso fijo por paso de vida.

import type RAPIER_NS from '@dimforge/rapier3d-compat';
import type { PhysicalRotation, PhysicalVector, RagdollPose, RagdollSeed } from '../contracts';
import { LIFE_STEP } from './clock';
import type { Point, Solid, Terrain } from './body';
import { buildRagdoll, type RagdollRuntime } from './ragdoll';

type Rapier = typeof RAPIER_NS;
let loading: Promise<Rapier> | null = null;

/** Rapier se paga sólo cuando hay una batalla. */
export async function loadPhysics(): Promise<Rapier | null> {
  loading ??= import('@dimforge/rapier3d-compat').then(async (mod) => { await mod.init(); return mod; });
  try { return await loading; } catch { loading = null; return null; }
}

export interface PhysicsBody {
  readonly at: PhysicalVector;
  readonly rotation: PhysicalRotation;
  readonly velocity: PhysicalVector;
  readonly resting: boolean;
  remove(): void;
}

export interface PhysicsObstacle {
  readonly at: PhysicalVector;
  readonly halfExtents: PhysicalVector;
  readonly rotation?: PhysicalRotation;
}

export interface DebrisSpec {
  readonly id: string;
  readonly at: PhysicalVector;
  readonly halfExtents: PhysicalVector;
  readonly rotation?: PhysicalRotation;
  readonly velocity?: PhysicalVector;
  readonly angularVelocity?: PhysicalVector;
  readonly density?: number;
  readonly ttlSteps?: number;
}

export interface PhysicsOptions {
  /** La misma función que `Cast.standOn`/`groundFloor`; nunca se sustituye por y=0. */
  readonly ground?: ((x: number, z: number) => number) | undefined;
  readonly obstacles?: readonly PhysicsObstacle[];
  readonly maxRagdolls?: number;
  readonly maxDebris?: number;
}

export interface PhysicsRagdoll {
  readonly id: number;
  snapshot(): RagdollPose;
  remove(): void;
}

export interface PhysicsSnapshot {
  readonly ragdolls: readonly RagdollPose[];
  readonly stats: {
    readonly steps: number; readonly bodies: number; readonly ragdolls: number;
    readonly activeRagdolls: number; readonly debris: number;
  };
}

export interface Physics {
  step(): void;
  launch(at: PhysicalVector, velocity: PhysicalVector): PhysicsBody;
  /** Idempotente por `id+bornAt`; devuelve null si el rig no vale o se alcanzó el tope. */
  articulate(seed: RagdollSeed): PhysicsRagdoll | null;
  debris(spec: DebrisSpec): PhysicsBody;
  snapshot(): PhysicsSnapshot;
  clearBattle(): void;
  readonly count: number;
  dispose(): void;
}

interface LiveBody {
  readonly kind: 'projectile' | 'debris'; readonly body: RAPIER_NS.RigidBody;
  readonly bornAt: number; readonly ttlSteps: number | null; public: PhysicsBody;
  remove(): void;
}

/** Gravedad real pasada a celdas: una celda son tres metros. */
const GRAVITY = -9.81 / 3;
const WALL_HEIGHT = 2;
const ARROW_RADIUS = 0.08;
const ARROW_DRAG = 0.2;
const RESTING_SPEED = 0.5;
// TUNE: la batalla enseña 12 atacantes y como mucho otros tantos defensores.
const MAX_RAGDOLLS = 24;
const MAX_DEBRIS = 24;
// TUNE: ocho segundos bastan para caer y asentarse. Después se duerme y se conserva la pose.
const RAGDOLL_ACTIVE_STEPS = 8 / LIFE_STEP;

export async function createPhysics(land: Terrain, options: PhysicsOptions = {}): Promise<Physics | null> {
  const RAPIER = await loadPhysics();
  if (RAPIER === null) return null;
  const rapier: Rapier = RAPIER;
  const world = new rapier.World({ x: 0, y: GRAVITY, z: 0 });
  world.timestep = LIFE_STEP;
  const ground = options.ground ?? (() => 0);
  addGround(rapier, world, land, ground);
  addObstacles(rapier, world, land, ground, options.obstacles ?? []);

  const bodies = new Set<LiveBody>();
  const ragdolls = new Map<string, {
    runtime: RagdollRuntime; public: PhysicsRagdoll; sleeping: boolean; createdAt: number;
  }>();
  const debrisOrder: LiveBody[] = [];
  let steps = 0;
  let disposed = false;

  function rigidBody(kind: LiveBody['kind'], at: PhysicalVector, velocity: PhysicalVector,
    rotation: PhysicalRotation, collider: RAPIER_NS.ColliderDesc,
    angularVelocity: PhysicalVector | undefined, ttlSteps: number | null): PhysicsBody {
    if (disposed) return deadBody(at, velocity, rotation);
    const body = world.createRigidBody(rapier.RigidBodyDesc.dynamic()
      .setTranslation(at.x, at.y, at.z).setRotation(rotation)
      .setLinvel(velocity.x, velocity.y, velocity.z)
      .setAngvel(angularVelocity ?? ZERO)
      .setLinearDamping(kind === 'projectile' ? ARROW_DRAG : DEBRIS_DRAG)
      .setAngularDamping(kind === 'projectile' ? 0 : DEBRIS_ANGULAR_DRAG).setCcdEnabled(true));
    world.createCollider(collider, body);
    let lastAt = { ...at }, lastVelocity = { ...velocity }, lastRotation = { ...rotation };
    let removed = false;
    let remove = (): void => {};
    const refresh = (): void => {
      if (removed || disposed) return;
      lastAt = finiteVector(body.translation(), lastAt);
      lastVelocity = finiteVector(body.linvel(), lastVelocity);
      lastRotation = finiteRotation(body.rotation(), lastRotation);
    };
    const shown: PhysicsBody = {
      get at() { refresh(); return lastAt; }, get velocity() { refresh(); return lastVelocity; },
      get rotation() { refresh(); return lastRotation; },
      get resting() { refresh(); return removed || squared(lastVelocity) < RESTING_SPEED * RESTING_SPEED; },
      remove(): void { remove(); },
    };
    const handle: LiveBody = { kind, body, bornAt: steps, ttlSteps, public: shown, remove(): void {
      if (removed) return; refresh(); removed = true; bodies.delete(handle); world.removeRigidBody(body);
    } };
    remove = (): void => { handle.remove(); };
    bodies.add(handle);
    if (kind === 'debris') debrisOrder.push(handle);
    return shown;
  }

  const api: Physics = {
    step(): void {
      if (disposed) return;
      world.step(); steps += 1;
      for (const body of [...bodies]) if (body.ttlSteps !== null && steps - body.bornAt >= body.ttlSteps) body.remove();
      for (const entry of ragdolls.values()) if (!entry.sleeping
        && steps - entry.createdAt >= RAGDOLL_ACTIVE_STEPS) {
        entry.runtime.sleep(); entry.sleeping = true;
      }
    },
    launch(at, velocity): PhysicsBody {
      return rigidBody('projectile', at, velocity, IDENTITY,
        rapier.ColliderDesc.ball(ARROW_RADIUS), undefined, null);
    },
    articulate(seed): PhysicsRagdoll | null {
      if (disposed) return null;
      const key = `${seed.id}:${seed.bornAt}`;
      const previous = ragdolls.get(key);
      if (previous !== undefined) return previous.public;
      if (ragdolls.size >= (options.maxRagdolls ?? MAX_RAGDOLLS)) return null;
      const runtime = buildRagdoll(rapier, world, seed);
      if (runtime === null) return null;
      let removed = false;
      const handle: PhysicsRagdoll = { id: seed.id, snapshot: () => runtime.snapshot(), remove(): void {
        if (removed) return; removed = true; runtime.remove(); ragdolls.delete(key);
      } };
      ragdolls.set(key, { runtime, public: handle, sleeping: false, createdAt: steps });
      return handle;
    },
    debris(spec): PhysicsBody {
      while (debrisOrder.filter((body) => bodies.has(body)).length >= (options.maxDebris ?? MAX_DEBRIS)) {
        const oldest = debrisOrder.shift(); if (oldest === undefined) break; oldest.remove();
      }
      return rigidBody('debris', spec.at, spec.velocity ?? ZERO, spec.rotation ?? IDENTITY,
        rapier.ColliderDesc.roundCuboid(Math.max(0.005, spec.halfExtents.x),
          Math.max(0.005, spec.halfExtents.y), Math.max(0.005, spec.halfExtents.z), 0.004)
          .setDensity(spec.density ?? 0.8).setFriction(0.82).setRestitution(0.05),
        spec.angularVelocity, Math.max(1, spec.ttlSteps ?? DEFAULT_DEBRIS_STEPS));
    },
    snapshot(): PhysicsSnapshot {
      const entries = [...ragdolls.values()];
      return { ragdolls: entries.map((entry) => entry.runtime.snapshot()), stats: {
        steps, bodies: bodies.size + entries.reduce((sum, entry) => sum + entry.runtime.bodyCount, 0),
        ragdolls: entries.length, activeRagdolls: entries.filter((entry) => !entry.sleeping).length,
        debris: [...bodies].filter((body) => body.kind === 'debris').length,
      } };
    },
    clearBattle(): void {
      if (disposed) return;
      for (const body of [...bodies]) body.remove();
      for (const entry of ragdolls.values()) entry.runtime.remove();
      ragdolls.clear(); debrisOrder.length = 0;
    },
    // Se consulta en cada fixed-step. Contar no lee once transforms por
    // ragdoll: las poses pertenecen al render/observatorio, no al hot path.
    get count(): number {
      return bodies.size + [...ragdolls.values()].reduce((sum, entry) => sum + entry.runtime.bodyCount, 0);
    },
    dispose(): void { if (disposed) return; api.clearBattle(); disposed = true; world.free(); },
  };
  return api;
}

function addGround(RAPIER: Rapier, world: RAPIER_NS.World, land: Terrain,
  ground: (x: number, z: number) => number): void {
  const heights = new Float32Array((land.height + 1) * (land.width + 1));
  let at = 0;
  // Rapier recibe la matriz en column-major: columna x por fuera, fila z por
  // dentro. En un mapa rectangular invertirlo transpone laderas y alturas.
  for (let x = 0; x <= land.width; x += 1) for (let z = 0; z <= land.height; z += 1) {
    heights[at++] = safeGround(ground, x, z);
  }
  world.createCollider(RAPIER.ColliderDesc.heightfield(land.height, land.width, heights,
    { x: land.width, y: 1, z: land.height }).setTranslation(land.width / 2, 0, land.height / 2).setFriction(0.9));
}

function addObstacles(RAPIER: Rapier, world: RAPIER_NS.World, land: Terrain,
  ground: (x: number, z: number) => number, extra: readonly PhysicsObstacle[]): void {
  for (let z = 0; z < land.height; z += 1) for (let x = 0; x < land.width; x += 1) {
    if (land.blocked[z * land.width + x] !== 1) continue;
    const y = safeGround(ground, x + 0.5, z + 0.5);
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, WALL_HEIGHT / 2, 0.5)
      .setTranslation(x + 0.5, y + WALL_HEIGHT / 2, z + 0.5));
  }
  const seen = new Set<Solid>();
  for (const list of land.solids?.values() ?? []) for (const solid of list) {
    if (seen.has(solid)) continue; seen.add(solid);
    const x = (solid.minX + solid.maxX) / 2, z = (solid.minZ + solid.maxZ) / 2;
    const y = safeGround(ground, x, z);
    world.createCollider(RAPIER.ColliderDesc.cuboid(Math.max(0.01, (solid.maxX - solid.minX) / 2),
      WALL_HEIGHT / 2, Math.max(0.01, (solid.maxZ - solid.minZ) / 2)).setTranslation(x, y + WALL_HEIGHT / 2, z));
  }
  for (const obstacle of extra) {
    const desc = RAPIER.ColliderDesc.cuboid(obstacle.halfExtents.x, obstacle.halfExtents.y, obstacle.halfExtents.z)
      .setTranslation(obstacle.at.x, obstacle.at.y, obstacle.at.z);
    if (obstacle.rotation !== undefined) desc.setRotation(obstacle.rotation);
    world.createCollider(desc);
  }
}

function safeGround(ground: (x: number, z: number) => number, x: number, z: number): number {
  const height = ground(x, z); return Number.isFinite(height) ? height : 0;
}
function squared(v: PhysicalVector): number { return v.x * v.x + v.y * v.y + v.z * v.z; }
function finiteVector(value: PhysicalVector, fallback: PhysicalVector): PhysicalVector {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)
    ? { x: value.x, y: value.y, z: value.z } : fallback;
}
function finiteRotation(value: PhysicalRotation, fallback: PhysicalRotation): PhysicalRotation {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z) && Number.isFinite(value.w)
    ? { x: value.x, y: value.y, z: value.z, w: value.w } : fallback;
}
function deadBody(at: PhysicalVector, velocity: PhysicalVector, rotation: PhysicalRotation): PhysicsBody {
  return { at: { ...at }, velocity: { ...velocity }, rotation: { ...rotation }, resting: true, remove(): void {} };
}

const ZERO: PhysicalVector = { x: 0, y: 0, z: 0 };
const IDENTITY: PhysicalRotation = { x: 0, y: 0, z: 0, w: 1 };
// TUNE: tablas amortiguadas, sin patinar por el valle ni rebotar como piedra.
const DEBRIS_DRAG = 0.55;
const DEBRIS_ANGULAR_DRAG = 0.9;
const DEFAULT_DEBRIS_STEPS = 60 / LIFE_STEP;

/** Nacimiento histórico de las flechas desde lo alto de la muralla. */
export function fromWall(at: Point, height = WALL_HEIGHT): PhysicalVector {
  return { x: at.x, y: height, z: at.z };
}
