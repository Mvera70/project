// V-02/V-03/V-08 · Cuerpos y bestias, en marcha de verdad. rework.md §3.
//
// El dueño: «los animales ahora mismo es que están fatal, atraviesan paredes,
// dan vueltas sobre sí mismos». `tools/life-report.ts` midió las cuatro cosas
// del brief (§3.4) sobre `createVillage`/`life.step()` — nunca con `tick` en
// un bucle (`CLAUDE.md`) — antes y después de tocar `body.ts`, `steering.ts`,
// `navigate.ts` y `beasts.ts`. Esta prueba guarda las mismas propiedades para
// que no se rompan otra vez, con una muestra más pequeña que el informe
// —tres semillas y dos jornadas, no seis y cuatro— porque aquí sí importa el
// coste: `tools/life-report.ts` con seis semillas y cuatro jornadas tarda unos
// 23 s, y la suite rápida entera tiene que quedarse por debajo de 30 s
// (`CLAUDE.md`). Sigue siendo «varias semillas y varias jornadas», nunca una
// sola (`CLAUDE.md`, Anexo E.7 «un umbral sobre una muestra es ruido»).
//
// Medido con esta misma muestra (tres semillas × dos jornadas, 29 280
// cuerpo-segundos de personas y bestias juntas):
//
//               centro en muro   círculo en muro   giros/seg   parados ≥ 0,9
//   antes            0               ~1,3 %          ~4,8 %        ~0,2 %
//   después           0              ~0,11 %         ~0,38 %       ~0,02 %
//
// La tabla completa, con las seis semillas y cuatro jornadas del brief, está
// en `docs/rework.md` §3.6.

import { beforeAll, describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { TIME } from '@engine/balance';
import { run } from '@engine/sim';
import { foundTwenty } from '../helpers/founding';
import {
  blockedAt, integrate, type Body, type Terrain,
} from '../../src/render3d/life/body';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { terrainOf } from '../../src/render3d/life/terrain';
import { createVillage } from '../../src/render3d/life/village';
import { avoid, drive } from '../../src/render3d/life/steering';

/** Las mismas semillas que `tools/life-report.ts` usa por defecto, en un
 *  subconjunto de tres: cuestan tres veces menos y siguen siendo «varias». */
const SEEDS = [7, 23, 97];
const DAYS = 2;
const SAMPLE_EVERY = 30;

/** Si algún punto del círculo cae en celda cerrada, además del centro —los
 *  mismos cinco puntos que `tools/life-report.ts`. */
function circleBlocked(land: Terrain, body: Body): boolean {
  const { x, z, radius } = body;
  return blockedAt(land, x, z)
    || blockedAt(land, x - radius, z) || blockedAt(land, x + radius, z)
    || blockedAt(land, x, z - radius) || blockedAt(land, x, z + radius);
}

interface Totals {
  bodySeconds: number;
  centreInWall: number;
  circleInWall: number;
  spins: number;
}

let totals: Totals;

beforeAll(() => {
  totals = { bodySeconds: 0, centreInWall: 0, circleInWall: 0, spins: 0 };

  for (const seed of SEEDS) {
    const state = foundTwenty(seed);
    run(state, 12 * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    const land = terrainOf(state);

    for (let day = 0; day < DAYS; day += 1) {
      const life = createVillage(state, day);
      const bodies = [...life.dwellers, ...life.beasts.map((b) => b.dweller)];
      const lastFacing = new Map<number, number>();

      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        if ((n + 1) % SAMPLE_EVERY !== 0) continue;
        for (const d of bodies) {
          const { body } = d;
          totals.bodySeconds += 1;
          if (blockedAt(land, body.x, body.z)) totals.centreInWall += 1;
          if (circleBlocked(land, body)) totals.circleInWall += 1;

          const speed = Math.hypot(body.vx, body.vz);
          const previous = lastFacing.get(body.id);
          if (previous !== undefined && speed < 0.1) {
            let turn = body.facing - previous;
            while (turn > Math.PI) turn -= Math.PI * 2;
            while (turn < -Math.PI) turn += Math.PI * 2;
            if (Math.abs(turn) > Math.PI / 2) totals.spins += 1;
          }
          lastFacing.set(body.id, body.facing);
        }
      }
    }
  }
}, 30_000);

describe('V-02/V-03/V-08 · cuerpos y bestias en marcha', () => {
  it('nadie tiene el centro en celda cerrada', () => {
    expect(totals.bodySeconds).toBeGreaterThan(0);
    expect(totals.centreInWall, `${totals.centreInWall} de ${totals.bodySeconds} cuerpo-segundos`)
      .toBe(0);
  });

  it('el círculo casi nunca cae en una pared, muy por debajo del antes', () => {
    // Antes de tocar `integrate`/`resolve`/`avoid`, esta misma muestra daba
    // ~1,3 % (`docs/rework.md` §3.6). El uno por ciento de margen deja hueco
    // de sobra al ruido de una muestra pequeña sin dejar que la regresión
    // vuelva a colarse sin que la suite lo note.
    const ratio = totals.circleInWall / totals.bodySeconds;
    expect(ratio, `${totals.circleInWall} de ${totals.bodySeconds} (${(100 * ratio).toFixed(2)}%)`)
      .toBeLessThan(0.01);
  });

  // IA-10: el caso antes marcado como fallo esperado pasa con el disco exacto.
  it('el círculo nunca cae en una pared, ni una vez', () => {
    expect(totals.circleInWall).toBe(0);
  });

  it('los giros sobre sí mismo se quedan por debajo del 2 % de los cuerpo-segundos', () => {
    // El listón literal del brief (rework.md §3.5.3). Antes del arreglo esta
    // misma muestra daba ~4,8 %; después, ~0,38 %.
    const ratio = totals.spins / totals.bodySeconds;
    expect(ratio, `${totals.spins} de ${totals.bodySeconds} (${(100 * ratio).toFixed(2)}%)`)
      .toBeLessThan(0.02);
  });
});

describe('V-02 · quien nace atrapado consigue salir', () => {
  /** Un pasillo estrecho con el cuerpo colocado a mano dentro de la pared —
   *  el caso de E.7: el ancla de un animal, el punto de reunión que cae
   *  dentro de una capilla. */
  function walledRoom(): Terrain {
    const width = 12;
    const height = 12;
    const blocked = new Uint8Array(width * height);
    for (let z = 4; z <= 7; z += 1) {
      for (let x = 4; x <= 7; x += 1) blocked[z * width + x] = 1;
    }
    return { width, height, blocked };
  }

  it('un cuerpo con el centro en celda cerrada sale de ahí, no se queda preso', () => {
    const land = walledRoom();
    // Justo dentro del bloque, cerca de un borde: lo que `anchorOf`
    // (`beasts.ts`) o `meetingPlace` (`staging.ts`) podrían dejar sin querer.
    const body: Body = { id: 0, x: 4.3, z: 4.3, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.2 };
    expect(blockedAt(land, body.x, body.z), 'nace de verdad dentro del muro').toBe(true);

    for (let n = 0; n < 300; n += 1) {
      const push = avoid(body, land);
      drive(body, push);
      integrate(body, land, 1 / 30);
    }

    expect(blockedAt(land, body.x, body.z), 'trescientos pasos después, sigue libre').toBe(false);
  });
});
