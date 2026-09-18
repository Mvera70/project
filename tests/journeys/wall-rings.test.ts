// P-4 · La muralla se levanta en anillo, no en cachos. §7.4c.
//
// **Lo pidió el dueño del diseño mirando una captura**, el 18 sep 2026: «¿podemos
// también evitar esos cachos sueltos? Sé que es complicado porque la aldea tiene
// que ir creciendo, pero la muralla también tendrá que quedarse por secciones.
// Es decir, si la aldea crece a un cierto punto, se construye la muralla
// alrededor y después la siguiente sección de construcción va fuera de la
// muralla».
//
// **Vive en las jornadas** porque son cuatro partidas de sesenta años.
//
// Lo que había: la empalizada se levantaba sobre la envolvente convexa del
// núcleo, que crece con la aldea, así que cada pieza caía sobre la envolvente de
// su año. Medido entonces, al año 60: **de 7 a 19 tramos desconectados por
// valle**, y el más largo con la cuarta parte de las piezas.
//
// Lo que hay: un anillo escrito en el estado (`GameState.ring`) alrededor de la
// plaza, que no se mueve mientras quepa una pieza más, y otro tres celdas más
// afuera cuando se llena. Medido igual:
//
//   año 20 · [4] · [4] · [] · [4]            (semillas 7, 11, 23, 41)
//   año 40 · [8] · [28] · [4] · [8]          un solo tramo en las cuatro
//   año 60 · [12] · [41,15,4,1,1] · [25] · [57,19,19,14,11,2,2,1,1,1,1]

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { Building, GameState } from '@engine/state';

/** Los tramos de muralla conectados, de mayor a menor. */
function runs(state: GameState): number[] {
  const walls = state.buildings.filter(
    (b) => b.lostTick === null && (b.kind === 'wall' || b.kind === 'palisade'),
  );
  const byCell = new Map(walls.map((b) => [b.y * state.map.width + b.x, b]));
  const seen = new Set<number>();
  const sizes: number[] = [];
  for (const wall of walls) {
    if (seen.has(wall.id)) continue;
    const run: Building[] = [wall];
    seen.add(wall.id);
    for (let n = 0; n < run.length; n += 1) {
      const b = run[n];
      if (b === undefined) continue;
      for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
        const next = byCell.get((b.y + dz) * state.map.width + b.x + dx);
        if (next !== undefined && !seen.has(next.id)) { seen.add(next.id); run.push(next); }
      }
    }
    sizes.push(run.length);
  }
  return sizes.sort((a, b) => b - a);
}

const SEEDS = [7, 11, 23, 41];

describe('P-4 · la muralla es una muralla', () => {
  it('a los cuarenta años, lo levantado es un solo tramo', () => {
    // La propiedad más fuerte que el anillo concede, y la que cierra el defecto
    // que se vio: mientras la aldea cabe en su primer anillo, su muralla es una
    // sola. Medido: 8, 28, 4 y 8 piezas, un tramo cada valle.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
      const sizes = runs(state);
      expect(sizes.length, `semilla ${seed}: ${JSON.stringify(sizes)}`).toBeLessThanOrEqual(1);
    }
  });

  it('y a los sesenta, lo que hay es anillos y no confeti', () => {
    // A los sesenta años los valles grandes han cerrado su primer anillo y han
    // empezado otro, así que hay más de un tramo **a propósito**. Lo que no
    // puede volver es el confeti: antes el tramo mayor tenía el 25 % de las
    // piezas (10 de 40 en la semilla 41); ahora, del 45 % al 100 %.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 60, 'prudent', CATALOG);
      const sizes = runs(state);
      const total = sizes.reduce((sum, n) => sum + n, 0);
      if (total === 0) continue;
      const longest = sizes[0] ?? 0;
      expect(longest / total, `semilla ${seed}: ${JSON.stringify(sizes)}`).toBeGreaterThan(0.4);
      // Y ninguna aldea llena el valle de piezas de una sola: como mucho una de
      // cada diez, que son los restos de un anillo que se quedó sin sitio.
      const lonely = sizes.filter((n) => n === 1).length;
      expect(lonely / Math.max(1, total), `semilla ${seed}: sueltas ${lonely} de ${total}`)
        .toBeLessThan(0.12);
    }
  });

  it('el anillo se escribe una vez y se respeta', () => {
    // `GameState.ring` es el radio en curso. Mientras quepa una pieza más, no
    // cambia; y cada pieza nueva cae en él.
    const state = foundGame(41);
    run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
    const ring = state.ring;
    expect(ring, 'a los cuarenta años ya hay anillo').not.toBeNull();
    if (ring === null) return;
    const centre = { x: state.plaza.x + 0.5, y: state.plaza.y + 0.5 };
    for (const b of state.buildings) {
      if (b.lostTick !== null || (b.kind !== 'wall' && b.kind !== 'palisade')) continue;
      const gap = Math.hypot(b.x + 0.5 - centre.x, b.y + 0.5 - centre.y);
      expect(Math.abs(gap - ring), `pieza en ${b.x},${b.y} fuera del anillo ${ring}`)
        .toBeLessThanOrEqual(0.75);
    }
  });
});
