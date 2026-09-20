import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { BattleDebris, type DebrisPhysics, type DebrisPhysicsBody, type DebrisSpec } from '../../src/render3d/world/battle-debris';
import { Village } from '../../src/render3d/world/buildings';
import type { PlannedBuilding } from '../../src/render3d/world/plan';

const gate = (id: number): PlannedBuilding => ({
  id, kind: 'gate', x: 4, z: 5, w: 1, h: 1, ruin: false, walls: 1, roof: 0,
  roofed: false, wallColour: '#765432', roofColour: '#765432', asset: null, gate: 'z',
});

interface RecordedBody extends DebrisPhysicsBody {
  at: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  velocity: { x: number; y: number; z: number };
  resting: boolean;
  removed: number;
}

function physics(): { physics: DebrisPhysics; specs: DebrisSpec[]; bodies: RecordedBody[] } {
  const specs: DebrisSpec[] = [];
  const bodies: RecordedBody[] = [];
  return {
    specs,
    bodies,
    physics: {
      debris(spec) {
        specs.push(spec);
        const body: RecordedBody = {
          at: { ...spec.at },
          rotation: spec.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
          velocity: { x: 0, y: 0, z: 0 },
          resting: false,
          removed: 0,
          remove(): void { body.removed += 1; },
        };
        bodies.push(body);
        return body;
      },
    },
  };
}

describe('D6 · el boquete deja tablas físicas, no otra puerta intacta', () => {
  it.each(['x', 'z'] as const)('crea una tanda acotada en eje %s una sola vez y copia la pose de Rapier', axis => {
    const fake = physics();
    const debris = new BattleDebris(fake.physics);
    try {
      const floor = (x: number, z: number): number => x === 8 && z === 9 ? 0.42 : -0.14;
      expect(debris.breakGate({ id: 12, x: 4.5, z: 5.5, axis }, floor)).toBe(true);
      expect(debris.breakGate({ id: 12, x: 4.5, z: 5.5, axis }, floor), 'la misma lectura no duplica tablas').toBe(false);
      expect(fake.specs).toHaveLength(6);
      expect(debris.count).toBe(6);
      expect(fake.specs.every(spec => spec.ttlSteps === 3600 && spec.halfExtents.y > 0)).toBe(true);
      expect(fake.specs.every(spec => spec.at.y > -0.14), 'la tabla parte sobre la cota real, no y=0').toBe(true);
      const firstSpec = fake.specs[0];
      expect(firstSpec).toBeDefined();
      if (firstSpec === undefined) return;
      // Caja mundial: la semiextensión larga local X gira una vez. Es la
      // comprobación que detecta invertir ejes *y* aplicar yaw otra vez.
      const yaw = 2 * Math.atan2(firstSpec.rotation?.y ?? 0, firstSpec.rotation?.w ?? 1);
      const worldX = Math.abs(Math.cos(yaw)) * firstSpec.halfExtents.x
        + Math.abs(Math.sin(yaw)) * firstSpec.halfExtents.z;
      const worldZ = Math.abs(Math.sin(yaw)) * firstSpec.halfExtents.x
        + Math.abs(Math.cos(yaw)) * firstSpec.halfExtents.z;
      if (axis === 'x') expect(worldZ).toBeGreaterThan(worldX);
      else expect(worldX).toBeGreaterThan(worldZ);

      const first = fake.bodies[0];
      const mesh = debris.group.children[0];
      expect(first).toBeDefined();
      expect(mesh).toBeDefined();
      if (first === undefined || mesh === undefined) return;
      first.at = { x: 8, y: 0.12, z: 9 };
      first.rotation = { x: 0, y: 0.5, z: 0, w: 0.8660254 };
      debris.step();
      expect(mesh.position.toArray()).toEqual([8, 0.12, 9]);
      expect(mesh.quaternion.y).toBeCloseTo(0.5);
    } finally {
      debris.dispose();
    }
    expect(fake.bodies).toHaveLength(6);
    expect(fake.bodies.every(body => body.removed === 1), 'dispose suelta cada rígido una vez').toBe(true);
  });

  it('limpia de forma idempotente antes de reconstruir la escena', () => {
    const fake = physics();
    const debris = new BattleDebris(fake.physics);
    debris.breakGate({ id: 1, x: 4.5, z: 5.5, axis: 'x' }, () => 0);
    debris.clear();
    debris.clear();
    expect(debris.count).toBe(0);
    expect(debris.group.children).toHaveLength(0);
    expect(fake.bodies.every(body => body.removed === 1)).toBe(true);
    debris.dispose();
  });

  it('oculta sólo la hoja, no su marco, y una escena nueva la restituye', () => {
    const geometry = new BoxGeometry(1, 1, 0.1);
    const material = new MeshStandardMaterial();
    const source = new Group();
    const frame = new Mesh(geometry, material); frame.name = 'frame';
    const leaf = new Mesh(geometry, material); leaf.name = 'gate_door';
    source.add(frame, leaf);
    const village = new Village(() => source.clone(true));
    try {
      village.add({ ...gate(1), asset: 'gate' });
      village.add({ ...gate(2), x: 8, asset: 'gate' });
      expect(village.gatePoses()[0]).toMatchObject({ id: 1, x: 4.5, z: 5.5, axis: 'z' });
      expect(village.breakGate(1)).toBe(true);
      expect(village.breakGate(1), 'repetir el estado abajo no reabre ni rompe dos veces').toBe(false);
      expect(village.gatePoses().map(pose => pose.id),
        'la pose del roto se conserva: una lectura posterior no elige el otro portón').toEqual([1, 2]);
      expect(village.group.getObjectByName('DoorHinge')?.visible).toBe(false);
      expect(village.group.getObjectByName('frame')?.visible).toBe(true);

      village.clear();
      village.add({ ...gate(1), asset: 'gate' });
      expect(village.group.getObjectByName('DoorHinge')?.visible, 'otra escena empieza con el portón entero').toBe(true);
    } finally {
      village.dispose();
      geometry.dispose();
      material.dispose();
    }
  });
});
