// F-0 · La flecha que toca, en sombra. 29 sep 2026,
// `docs/diagnostico-fisica-combate-2026-09-29.md` §3.
//
// Lo que se guarda aquí es **el contrato del experimento**, no su resultado:
// que Rapier vea la cápsula del cuerpo que se pinta y diga a qué altura se la
// toca; que las sondas no toquen nada —una flecha vuela igual con ellas que
// sin ellas—; y que la bitácora en sombra no cambie ni un resultado de la
// arquería. Cuánto discrepa el contacto del cilindro es una medida de
// `tools/reports/battle-report.ts --shadow`, no un aserto: la batalla no es
// determinista por decisión del dueño (§1b).

import { describe, expect, it } from 'vitest';
import { archersOf, archeryShadow, stepArchery, type Arrow } from '../../src/render3d/life/archery';
import { createPhysics, type Physics } from '../../src/render3d/life/physics';
import type { Terrain } from '../../src/render3d/life/body';
import type { Manned } from '../../src/render3d/life/garrison';
import type { Raider } from '../../src/render3d/life/raiders';

/** Un valle de juguete, todo suelo, y una muralla de una celda en (20, 10). */
function land(wall = false): Terrain {
  const width = 32, height = 32;
  const blocked = new Uint8Array(width * height);
  if (wall) blocked[10 * width + 20] = 1;
  return { width, height, blocked };
}

/** El aldeano publicado mide 0,65 de alto y 0,10–0,17 de radio (medido el 29 sep). */
const BODY = { radius: 0.12, height: 0.65 };

async function world(wall = false): Promise<Physics> {
  const physics = await createPhysics(land(wall));
  expect(physics, 'Rapier tiene que cargar en este entorno').not.toBeNull();
  return physics!;
}

function raider(id: number, x: number, z: number): Raider {
  return { body: { id, x, z, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.4 },
    road: { x: 0, z: 0 }, post: { x, z }, inside: { x: 10, z: 10 },
    phase: 'breaking', route: [], deadline: 999, standingUntil: 0, forced: false, hits: 0, entered: false };
}

describe('F-0 · la sonda del cuerpo', () => {
  it('Rapier ve la cápsula del cuerpo que se pinta, y dice a qué altura se la toca', async () => {
    const physics = await world();
    try {
      physics.probes([{ id: 7, x: 10, z: 10 }], BODY);
      physics.step();
      // De frente, a la altura del pecho: da, y a esa altura.
      const chest = physics.sweep({ x: 8, y: 0.4, z: 10 }, { x: 12, y: 0.4, z: 10 });
      expect(chest?.id).toBe(7);
      expect(chest!.height).toBeCloseTo(0.4, 1);
      // Y el punto está en la piel del cuerpo, del lado de donde viene la flecha.
      expect(chest!.at.x).toBeCloseTo(10 - BODY.radius, 2);
      // Por los tobillos también: el cuerpo tiene pies, no es un huevo.
      expect(physics.sweep({ x: 8, y: 0.1, z: 10 }, { x: 12, y: 0.1, z: 10 })?.id).toBe(7);
      // Al lado, a más de un cuerpo y una flecha: no.
      expect(physics.sweep({ x: 8, y: 0.4, z: 10.3 }, { x: 12, y: 0.4, z: 10.3 })).toBeNull();
      // Por encima de la coronilla: no.
      expect(physics.sweep({ x: 8, y: 0.8, z: 10 }, { x: 12, y: 0.8, z: 10 })).toBeNull();
      expect(physics.snapshot().stats.probes).toBe(1);
      // La que falta en la lista se quita.
      physics.probes([], BODY);
      physics.step();
      expect(physics.sweep({ x: 8, y: 0.4, z: 10 }, { x: 12, y: 0.4, z: 10 })).toBeNull();
      expect(physics.snapshot().stats.probes).toBe(0);
    } finally { physics.dispose(); }
  });

  it('con lo sólido, el muro que está antes tapa al cuerpo que está detrás', async () => {
    const physics = await world(true);
    try {
      physics.probes([{ id: 3, x: 21.5, z: 10.5 }], BODY);
      physics.step();
      const through = { from: { x: 18, y: 0.4, z: 10.5 }, to: { x: 23, y: 0.4, z: 10.5 } };
      // Sólo sondas: el muro no cuenta y el cuerpo sí.
      expect(physics.sweep(through.from, through.to)?.id).toBe(3);
      // Con lo sólido: lo primero es el muro.
      const solid = physics.sweep(through.from, through.to, true);
      expect(solid).not.toBeNull();
      expect(solid!.id).toBeNull();
      expect(solid!.at.x).toBeLessThan(20.01);
    } finally { physics.dispose(); }
  });

  it('las sondas no tocan nada: una flecha vuela igual con ellas que sin ellas', async () => {
    const plain = await world(), probed = await world();
    try {
      // Una sonda justo en el camino de la flecha, y otra a su lado.
      const path: number[][] = [[], []];
      const arrows = [plain, probed].map((physics) => physics.launch({ x: 4, y: 2, z: 10 }, { x: 10, y: 1, z: 0 }));
      for (let step = 0; step < 90; step += 1) {
        probed.probes([{ id: 1, x: 8 + step * 0.01, z: 10 }, { id: 2, x: 9, z: 10.4 }], BODY);
        for (const [n, physics] of [plain, probed].entries()) {
          physics.step();
          const at = arrows[n]!.at;
          path[n]!.push(at.x, at.y, at.z);
        }
      }
      expect(path[1]).toEqual(path[0]);
    } finally { plain.dispose(); probed.dispose(); }
  });
});

describe('F-0 · la arquería en sombra', () => {
  it('la bitácora no cambia ningún resultado, y apunta lo que habría dicho Rapier', async () => {
    const runs = await Promise.all([false, true].map(async (shadowed) => {
      const physics = await world();
      const post = { place: { id: 'bow', at: { x: 10, z: 10 } }, post: { arm: 'bow' } } as Manned;
      const archers = archersOf([post]);
      const raiders = [raider(-1, 15, 10), raider(-2, 17, 12.5)];
      const arrows: Arrow[] = [];
      const shadow = shadowed ? archeryShadow() : null;
      const path: number[] = [];
      try {
        for (let step = 0; step <= 200; step += 1) {
          if (shadowed) {
            physics.probes(raiders.filter((r) => r.phase !== 'down').map((r) => ({ id: r.body.id, x: r.body.x, z: r.body.z })), BODY);
          }
          physics.step();
          stepArchery(archers, raiders, arrows, physics, step, new Set(['bow']), new Map(), shadow);
          for (const arrow of arrows) path.push(arrow.body.at.x, arrow.body.at.y, arrow.body.at.z);
        }
        return { outcome: raiders.map((r) => [r.phase, r.downAt ?? null, r.hits]), loosed: arrows.map((a) => a.loosed), path, shadow };
      } finally { physics.dispose(); }
    }));
    const [plain, shadowed] = runs as [typeof runs[0], typeof runs[0]];
    expect(shadowed.outcome).toEqual(plain.outcome);
    expect(shadowed.loosed).toEqual(plain.loosed);
    expect(shadowed.path).toEqual(plain.path);
    // Algo tiene que haber dado, o la prueba no mide nada. Desde v5.81 una
    // flecha ya no tumba (`wounds.ts`): lo que se mira es que haya aciertos.
    expect(plain.outcome.some(([, , hits]) => (hits as number) > 0)).toBe(true);
    // Una entrada por flecha, y la que dio a alguien dice quién para los dos jueces.
    const log = shadowed.shadow!.arrows;
    expect(log).toHaveLength(shadowed.loosed.length);
    const decided = log.filter((entry) => entry.cylinder !== null);
    expect(decided.length).toBeGreaterThan(0);
    for (const entry of decided) {
      expect(entry.done).toBe(true);
      if (entry.rapier !== null) expect(entry.rapier.height).toBeGreaterThanOrEqual(0);
    }
  });
});
