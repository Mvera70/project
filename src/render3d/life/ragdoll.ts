// D6 · Cuerpo articulado sobre Rapier. La vida entrega una pose absoluta del
// rig publicado; este módulo sólo la convierte en cápsulas y articulaciones.

import type RAPIER_NS from '@dimforge/rapier3d-compat';
import type {
  PhysicalRotation, PhysicalVector, RagdollPose, RagdollSeed, RagdollSeedPart,
} from '../contracts';

type Rapier = typeof RAPIER_NS;

interface PartRuntime {
  readonly seed: RagdollSeedPart;
  readonly body: RAPIER_NS.RigidBody;
  readonly boneOffset: PhysicalVector;
  readonly boneRotation: PhysicalRotation;
}

export interface RagdollRuntime {
  readonly id: number;
  readonly bornAt: number;
  readonly bodyCount: number;
  snapshot(): RagdollPose;
  sleep(): void;
  remove(): void;
}

const vector = (x: number, y: number, z: number): PhysicalVector => ({ x, y, z });
const conjugate = (q: PhysicalRotation): PhysicalRotation => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w });
function multiply(a: PhysicalRotation, b: PhysicalRotation): PhysicalRotation {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}
function rotate(q: PhysicalRotation, v: PhysicalVector): PhysicalVector {
  const p = multiply(multiply(q, { x: v.x, y: v.y, z: v.z, w: 0 }), conjugate(q));
  return vector(p.x, p.y, p.z);
}
function localPoint(part: RagdollSeedPart, point: PhysicalVector): PhysicalVector {
  return rotate(conjugate(part.body.rotation), vector(
    point.x - part.body.at.x, point.y - part.body.at.y, point.z - part.body.at.z,
  ));
}
function finiteSeed(seed: RagdollSeed): boolean {
  const numbers = seed.parts.flatMap((part) => [
    part.joint.x, part.joint.y, part.joint.z,
    part.hingeAxis.x, part.hingeAxis.y, part.hingeAxis.z,
    part.body.at.x, part.body.at.y, part.body.at.z,
    part.body.rotation.x, part.body.rotation.y, part.body.rotation.z, part.body.rotation.w,
    part.body.halfLength, part.body.radius,
    part.boneAt.x, part.boneAt.y, part.boneAt.z,
    part.boneRotation.x, part.boneRotation.y, part.boneRotation.z, part.boneRotation.w,
  ]);
  return Number.isFinite(seed.id) && Number.isFinite(seed.bornAt)
    && seed.parts.length > 1 && numbers.every(Number.isFinite);
}

/**
 * Crea una marioneta de once piezas. Hombros, caderas y columna son rótulas;
 * codos y rodillas son bisagras limitadas: que las piezas caigan juntas no
 * basta, tienen que seguir siendo un cuerpo.
 */
export function buildRagdoll(
  RAPIER: Rapier,
  world: RAPIER_NS.World,
  seed: RagdollSeed,
): RagdollRuntime | null {
  if (!finiteSeed(seed)) return null;
  const parts = new Map<string, PartRuntime>();
  const joints: RAPIER_NS.ImpulseJoint[] = [];
  let removed = false;
  let cached: RagdollPose = { id: seed.id, sleeping: false, bones: [] };

  try {
    for (const part of seed.parts) {
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(part.body.at.x, part.body.at.y, part.body.at.z)
          .setRotation(part.body.rotation)
          .setLinearDamping(LINEAR_DAMPING)
          .setAngularDamping(ANGULAR_DAMPING)
          .setCcdEnabled(true),
      );
      world.createCollider(
        RAPIER.ColliderDesc.capsule(part.body.halfLength, part.body.radius)
          .setDensity(PART_DENSITY)
          .setFriction(PART_FRICTION)
          .setRestitution(0)
          // Las cápsulas unidas se solapan en cada articulación. Sólo chocan
          // con el grupo estático (suelo y obstáculos), no entre ellas.
          .setCollisionGroups(RAGDOLL_COLLISION_GROUPS),
        body,
      );
      const inverse = conjugate(part.body.rotation);
      parts.set(part.bone, {
        seed: part,
        body,
        boneOffset: localPoint(part, part.boneAt),
        boneRotation: multiply(inverse, part.boneRotation),
      });
    }

    for (const part of parts.values()) {
      if (part.seed.parent === null) continue;
      const parent = parts.get(part.seed.parent);
      if (parent === undefined) continue;
      const parentAnchor = localPoint(parent.seed, part.seed.joint);
      const childAnchor = localPoint(part.seed, part.seed.joint);
      const hinged = part.seed.bone.startsWith('forearm') || part.seed.bone.startsWith('shin');
      const parentAxis = rotate(conjugate(parent.seed.body.rotation), part.seed.hingeAxis);
      const childAxis = rotate(conjugate(part.seed.body.rotation), part.seed.hingeAxis);
      const data = hinged
        ? RAPIER.JointData.revoluteWithAxes(parentAnchor, childAnchor, parentAxis, childAxis)
        : RAPIER.JointData.spherical(parentAnchor, childAnchor);
      if (hinged) {
        data.limitsEnabled = true;
        // TUNE: una bisagra humana sin hiperextensión; el rango ancho deja que
        // la caída sea distinta sin convertir rodillas y codos en goma.
        data.limits = [-0.08, 2.35];
      }
      joints.push(world.createImpulseJoint(data, parent.body, part.body, true));
    }

    // TUNE: basta una inclinación pequeña y estable para romper el equilibrio
    // perfecto de la pose vertical. Sale del id, no del reloj ni del fotograma.
    const hips = parts.get('hips')?.body;
    if (hips !== undefined) hips.setAngvel({ x: 0.72, y: 0, z: seed.id % 2 === 0 ? 0.22 : -0.22 }, true);
  } catch {
    for (const joint of joints) world.removeImpulseJoint(joint, false);
    for (const part of parts.values()) world.removeRigidBody(part.body);
    return null;
  }

  const read = (): RagdollPose => {
    if (removed) return cached;
    const bones = [...parts.values()].map(({ seed: part, body, boneOffset, boneRotation }) => {
      const at = body.translation();
      const rotation = body.rotation();
      const offset = rotate(rotation, boneOffset);
      const q = multiply(rotation, boneRotation);
      return {
        name: part.bone,
        at: vector(at.x + offset.x, at.y + offset.y, at.z + offset.z),
        rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
      };
    });
    cached = { id: seed.id, sleeping: [...parts.values()].every((part) => part.body.isSleeping()), bones };
    return cached;
  };

  return {
    id: seed.id,
    bornAt: seed.bornAt,
    bodyCount: parts.size,
    snapshot: read,
    sleep(): void {
      if (removed) return;
      cached = read();
      for (const part of parts.values()) part.body.sleep();
      cached = { ...cached, sleeping: true };
    },
    remove(): void {
      if (removed) return;
      cached = read();
      removed = true;
      for (const joint of joints) world.removeImpulseJoint(joint, false);
      for (const part of parts.values()) world.removeRigidBody(part.body);
      cached = { ...cached, sleeping: true };
    },
  };
}

// TUNE: densidad y amortiguación escénicas. Conservan peso sin rebotes de
// muñeco de goma; no intervienen en daño ni balance del motor.
const PART_DENSITY = 7;
const PART_FRICTION = 0.86;
const LINEAR_DAMPING = 0.82;
const ANGULAR_DAMPING = 1.35;
const RAGDOLL_COLLISION_GROUPS = 0x0002_0001;
