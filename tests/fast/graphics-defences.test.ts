import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { foundTwenty } from '../helpers/founding';
import type { Building } from '../../src/engine/state';
import { DEFENCE_DIAGONALS, DEFENCE_DIRECTIONS, defenceConnections } from '../../src/render3d/world/defences';
import { planChange, planFor } from '../../src/render3d/world/plan';
import { buildFromAsset } from '../../src/render3d/world/buildings';

const ROOT = resolve(import.meta.dirname, '..', '..');

function publishedGlb(id: string): ArrayBuffer {
  const bytes = readFileSync(resolve(ROOT, 'public/assets/valley3d', `${id}.glb`));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function wall(id: number, x: number, y: number, kind: 'wall' | 'palisade' = 'wall'): Building {
  return { id, x, y, kind, w: 1, h: 1, builtTick: 0, lostTick: null,
    blockedUntil: null, tier: kind === 'wall' ? 1 : 0, lit: false };
}

function bastion(id: number, x: number, y: number): Building {
  return { ...wall(id, x, y), kind: 'bastion' };
}

describe('G-21 · conexiones de defensas', () => {
  it('el portón sigue el material del cerco sin cambiar su edificio ni su eje', () => {
    const state = foundTwenty(7);
    const gate: Building = { ...wall(1, 10, 10, 'palisade'), kind: 'gate' };
    state.buildings = [gate, wall(2, 9, 10, 'palisade'), wall(3, 11, 10, 'palisade')];
    const timber = planFor(state).buildings.find((building) => building.id === gate.id)!;
    expect(timber.asset).toBe('gate-timber');
    state.buildings[1] = wall(2, 9, 10);
    expect(planFor(state).buildings.find((building) => building.id === gate.id)?.asset).toBe('gate-timber');
    state.buildings[2] = wall(3, 11, 10);
    const stone = planFor(state).buildings.find((building) => building.id === gate.id)!;
    expect(stone.asset).toBe('gate');
    expect(stone.id).toBe(timber.id);
    expect(stone.gate).toBe(timber.gate);
  });
  it('resuelve las 16 combinaciones, mezcla materiales y no cambia la partida', () => {
    for(let mask=0;mask<16;mask++) {
      const buildings=[wall(1,10,10),...DEFENCE_DIRECTIONS.filter(d=>mask&d.bit)
        .map((d,i)=>wall(i+2,10+d.x,10+d.z,'palisade'))];
      const before=JSON.stringify(buildings);
      expect(defenceConnections(buildings).get(1)).toBe(mask);
      expect(JSON.stringify(buildings)).toBe(before);
      expect(defenceConnections([...buildings].reverse()).get(1)).toBe(mask);
    }
  });
  it('conecta diagonales sin codo, no ruinas, y actualiza al vecino al construir o destruir', () => {
    const state=foundTwenty(7);
    state.buildings=[wall(1,10,10),wall(2,11,11)];
    const before=planFor(state);
    expect(before.buildings[0]?.connections).toBe(32);
    state.buildings.push(wall(3,11,10));
    const joined=planFor(state);
    expect(planChange(before,joined).changed.map(b=>b.id)).toEqual([1,2]);
    state.buildings[2]!.lostTick=1;
    state.map.ruins[10 * state.map.width + 11] = 1;
    const broken=planFor(state);
    expect(broken.buildings[0]?.connections).toBe(32);
    expect(broken.buildings[2]?.connections).toBeUndefined();
    expect(planChange(joined,broken).changed.map(b=>b.id)).toEqual([1,2,3]);
  });
  it('las cardinales quedan en la celda y las diagonales sólo sangran por su esquina', () => {
    const state=foundTwenty(7);
    state.buildings=[wall(1,10,10)];
    const planned=planFor(state).buildings[0]!;
    const source=new Group();
    const mesh=new Mesh(new BoxGeometry(1,.8,.3),new MeshStandardMaterial());
    mesh.position.set(.5,.4,-.5);source.add(mesh);
    for(let mask=0;mask<256;mask++) {
      const model=buildFromAsset({...planned,connections:mask},source.clone(true));
      const bounds=new Box3().setFromObject(model.object);
      const bleed = .34 * Math.SQRT1_2 / 2;
      const diagonal = DEFENCE_DIAGONALS.filter(d => mask & d.bit);
      expect(bounds.min.x).toBeGreaterThanOrEqual(10 - (diagonal.some(d => d.x < 0) ? bleed : 0) - 1e-6);
      expect(bounds.max.x).toBeLessThanOrEqual(11 + (diagonal.some(d => d.x > 0) ? bleed : 0) + 1e-6);
      expect(bounds.min.z).toBeGreaterThanOrEqual(10 - (diagonal.some(d => d.z < 0) ? bleed : 0) - 1e-6);
      expect(bounds.max.z).toBeLessThanOrEqual(11 + (diagonal.some(d => d.z > 0) ? bleed : 0) + 1e-6);
      for(const d of DEFENCE_DIRECTIONS.filter(d=>mask&d.bit)) {
        const endpoint=new Vector3(10.5+d.x*.5,.4,10.5+d.z*.5);
        expect(bounds.distanceToPoint(endpoint)).toBeLessThan(1e-6);
      }
      model.dispose();
    }
    mesh.geometry.dispose();(mesh.material as MeshStandardMaterial).dispose();
  });
  it('los GLB publicados cierran cada unión diagonal con una sección compartida y sin sangrado amplio', async () => {
    const loader = new GLTFLoader();
    for (const kind of ['wall', 'palisade'] as const) {
      const gltf = await loader.parseAsync(publishedGlb(kind), '');
      const thickness = kind === 'wall' ? .34 : .18;
      const bleed = thickness * Math.SQRT1_2 / 2;
      for (const direction of DEFENCE_DIAGONALS) {
        const state = foundTwenty(7);
        state.buildings = [wall(1, 10, 10, kind), wall(2, 10 + direction.x, 10 + direction.z, kind)];
        const [first, second] = planFor(state).buildings;
        expect(first?.connections).toBe(direction.bit);
        expect(second?.connections).toBe(DEFENCE_DIAGONALS.find(d => d.x === -direction.x && d.z === -direction.z)?.bit);
        const firstModel = buildFromAsset(first!, gltf.scene);
        const secondModel = buildFromAsset(second!, gltf.scene);
        try {
          const a = new Box3().setFromObject(firstModel.object);
          const b = new Box3().setFromObject(secondModel.object);
          const corner = new Vector3(10.5 + direction.x * .5, 0, 10.5 + direction.z * .5);
          for (const axis of ['x', 'z'] as const) {
            // Antes las cajas sólo coincidían en el vértice. El GLB de estacas
            // afina su remate, así que comprobamos solape geométrico positivo,
            // y que nunca pueda superar la media sección autorizada.
            const overlap = Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]);
            expect(overlap).toBeGreaterThan(1e-4);
            const aBleed = direction[axis] > 0
              ? a.max[axis] - corner[axis] : corner[axis] - a.min[axis];
            const bBleed = direction[axis] > 0
              ? corner[axis] - b.min[axis] : b.max[axis] - corner[axis];
            expect(aBleed).toBeGreaterThan(1e-4);
            expect(aBleed).toBeLessThanOrEqual(bleed + 1e-5);
            expect(bBleed).toBeGreaterThan(1e-4);
            expect(bBleed).toBeLessThanOrEqual(bleed + 1e-5);
          }
        } finally { firstModel.dispose(); secondModel.dispose(); }
      }
    }
  });
  it('el tramo llega también al portón real sin convertirlo en muro', () => {
    const gate = { ...wall(2, 11, 10), kind: 'gate' as const };
    const connections = defenceConnections([wall(1, 10, 10), gate]);
    expect(connections.get(1)).toBe(2);
    expect(connections.has(2)).toBe(false);
  });
  it('cierra la esquina diagonal del portón de piedra sin invadir su paso', async () => {
    const state = foundTwenty(91);
    const gate: Building = { ...wall(71, 33, 40), kind: 'gate', tier: 0 };
    state.buildings = [gate, wall(198, 34, 39)];
    const planned = planFor(state).buildings;
    const gatePlan = planned.find((building) => building.id === 71)!;
    const wallPlan = planned.find((building) => building.id === 198)!;
    expect(gatePlan.asset).toBe('gate');
    expect(gatePlan.gateCornerLinks).toBe(16);
    expect(wallPlan.connections).toBe(64);
    const loader = new GLTFLoader();
    const [gateGltf, wallGltf] = await Promise.all([
      loader.parseAsync(publishedGlb('gate'), ''), loader.parseAsync(publishedGlb('wall'), ''),
    ]);
    const gateModel = buildFromAsset({ ...gatePlan, gate: 'z' }, gateGltf.scene);
    const wallModel = buildFromAsset(wallPlan, wallGltf.scene);
    try {
      const joint = gateModel.object.getObjectByName('GateCornerJoint_16')!;
      expect(joint).toBeDefined();
      const bounds = new Box3().setFromObject(joint);
      expect(bounds.min.x).toBeGreaterThanOrEqual(33.92 - 1e-6);
      expect(bounds.min.z).toBeLessThan(40.12);
      expect(bounds.max.z).toBeGreaterThan(40.328);
      let touchesWallMesh = false;
      wallModel.object.traverse((node) => {
        if (node instanceof Mesh && bounds.intersectsBox(new Box3().setFromObject(node))) touchesWallMesh = true;
      });
      expect(touchesWallMesh).toBe(true);
    } finally { gateModel.dispose(); wallModel.dispose(); }
    state.buildings[1]!.lostTick = 1;
    expect(planFor(state).buildings.find((building) => building.id === 71)?.gateCornerLinks).toBe(0);
  });
  it('mantiene las cuatro esquinas conectadas con el muro en ambos ejes del portón', async () => {
    const loader = new GLTFLoader();
    const [gateGltf, wallGltf] = await Promise.all([
      loader.parseAsync(publishedGlb('gate'), ''), loader.parseAsync(publishedGlb('wall'), ''),
    ]);
    for (const axis of ['x', 'z'] as const) for (const direction of DEFENCE_DIAGONALS) {
      const state = foundTwenty(91);
      state.buildings = [{ ...wall(1, 10, 10), kind: 'gate', tier: 0 },
        wall(2, 10 + direction.x, 10 + direction.z)];
      const planned = planFor(state).buildings;
      const gatePlan = planned.find((building) => building.id === 1)!;
      const wallPlan = planned.find((building) => building.id === 2)!;
      expect(gatePlan.gateCornerLinks).toBe(direction.bit);
      const gateModel = buildFromAsset({ ...gatePlan, gate: axis }, gateGltf.scene.clone(true));
      const wallModel = buildFromAsset(wallPlan, wallGltf.scene.clone(true));
      try {
        const joint = gateModel.object.getObjectByName(`GateCornerJoint_${direction.bit}`)!;
        expect(joint).toBeDefined();
        const bounds = new Box3().setFromObject(joint);
        const across = axis === 'z' ? 'x' : 'z';
        // El portón ancho candidato deja 0,84 entre jambas: 10,08..10,92.
        expect(bounds.max[across] <= 10.08 + 1e-5 || bounds.min[across] >= 10.92 - 1e-5).toBe(true);
        let touchesWallMesh = false;
        wallModel.object.traverse((node) => {
          if (node instanceof Mesh && bounds.intersectsBox(new Box3().setFromObject(node))) touchesWallMesh = true;
        });
        expect(touchesWallMesh).toBe(true);
      } finally { gateModel.dispose(); wallModel.dispose(); }
    }
  });
  it('une cada cardinal y diagonal del bastión vivo, sin ensamblarlo ni unir su ruina', () => {
    for (const kind of ['wall', 'palisade'] as const) {
      for (const direction of DEFENCE_DIRECTIONS) {
        const connections = defenceConnections([wall(1, 10, 10, kind), bastion(2, 10 + direction.x, 10 + direction.z)]);
        expect(connections.get(1)).toBe(direction.bit);
        expect(connections.has(2)).toBe(false);
      }
    }
    const diagonal = defenceConnections([wall(1, 10, 10), bastion(2, 11, 11)]);
    expect(diagonal.get(1)).toBe(32);
    const ruined = bastion(2, 10, 9);
    ruined.lostTick = 1;
    expect(defenceConnections([wall(1, 10, 10), ruined]).get(1)).toBe(0);
  });
  it('planifica el bastión propio en su celda y reconstruye sólo el muro vecino al cambiar', () => {
    const state = foundTwenty(7);
    state.buildings = [wall(1, 10, 10)];
    const before = planFor(state);
    state.buildings.push(bastion(2, 10, 9));
    const joinedState = JSON.stringify(state);
    const joined = planFor(state);
    expect(JSON.stringify(state)).toBe(joinedState);
    const plannedBastion = joined.buildings.find((building) => building.id === 2)!;
    expect(plannedBastion.asset).toBe('bastion');
    expect(plannedBastion.connections).toBeUndefined();
    expect(planChange(before, joined).changed.map((building) => building.id)).toEqual([1]);
    const source = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 1.36, 1), new MeshStandardMaterial());
    mesh.position.set(.5, .68, .5); source.add(mesh);
    const model = buildFromAsset(plannedBastion, source);
    const bounds = new Box3().setFromObject(model.object);
    expect(bounds.min.x).toBeCloseTo(10);
    expect(bounds.max.x).toBeCloseTo(11);
    expect(bounds.min.z).toBeCloseTo(9);
    expect(bounds.max.z).toBeCloseTo(10);
    model.dispose(); mesh.geometry.dispose(); (mesh.material as MeshStandardMaterial).dispose();
    state.buildings[1]!.lostTick = 1;
    state.map.ruins[9 * state.map.width + 10] = 1;
    const lostState = JSON.stringify(state);
    const lost = planFor(state);
    expect(JSON.stringify(state)).toBe(lostState);
    expect(lost.buildings.find((building) => building.id === 1)?.connections).toBe(0);
    expect(lost.buildings.find((building) => building.id === 2)?.connections).toBeUndefined();
    expect(planChange(joined, lost).changed.map((building) => building.id)).toEqual([1, 2]);
  });
  it('coloca el GLB publicado del bastión en una celda y lo mantiene más alto que el muro', async () => {
    const loader = new GLTFLoader();
    const [bastionGltf, wallGltf] = await Promise.all([
      loader.parseAsync(publishedGlb('bastion'), ''), loader.parseAsync(publishedGlb('wall'), ''),
    ]);
    const state = foundTwenty(7);
    state.buildings = [wall(1, 10, 10), bastion(2, 10, 9)];
    const planned = planFor(state);
    const plannedBastion = planned.buildings.find((building) => building.id === 2)!;
    const plannedWall = planned.buildings.find((building) => building.id === 1)!;
    expect(plannedWall.connections).toBe(1);
    const model = buildFromAsset(plannedBastion, bastionGltf.scene);
    const wallModel = buildFromAsset(plannedWall, wallGltf.scene);
    try {
      const bounds = new Box3().setFromObject(model.object);
      const wallBounds = new Box3().setFromObject(wallModel.object);
      expect(bounds.min.x).toBeCloseTo(10);
      expect(bounds.max.x).toBeCloseTo(11);
      expect(bounds.min.z).toBeCloseTo(9);
      expect(bounds.max.z).toBeCloseTo(10);
      expect(bounds.getSize(new Vector3()).y).toBeGreaterThan(wallBounds.getSize(new Vector3()).y);
      expect(wallBounds.min.x).toBeGreaterThanOrEqual(10 - 1e-6);
      expect(wallBounds.max.x).toBeLessThanOrEqual(11 + 1e-6);
      expect(wallBounds.min.z).toBeCloseTo(10);
      expect(wallBounds.max.z).toBeLessThanOrEqual(11 + 1e-6);
      expect(wallBounds.min.z).toBeCloseTo(bounds.max.z);
    } finally { model.dispose(); wallModel.dispose(); }
  });
});
