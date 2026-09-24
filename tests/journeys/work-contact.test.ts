// IA-anim · El hachazo toca el tronco y el pico, la roca: en villas jugadas.
//
// Vera preguntó si el golpe tenía contacto físico, y no lo tenía: el hacha se
// quedaba de 0,1 a 0,3 celdas del tronco y el pico fuera de la roca. Medido el
// 24 sep 2026 con esta misma sonda: de −0,06 a 0,19 en las semillas 7, 11 y 23.
import { expect, it } from 'vitest';
import { foundGame } from '../../src/engine/found';
import { run } from '../../src/engine/sim';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { createVillage } from '../../src/render3d/life/village';
import { solidTerrain } from '../../src/render3d/world/obstacles';
import { scatterTransform } from '../../src/render3d/world/forest';
import { STRIKE_HEAD } from '../../src/render3d/clips';
const head = (b: { x: number; z: number; facing: number }, clip: 'chop' | 'mine') => {
  const h = STRIKE_HEAD[clip], c = Math.cos(b.facing), s = Math.sin(b.facing);
  return { x: b.x + h.x * c + h.z * s, z: b.z - h.x * s + h.z * c };
};
it('la cabeza de la herramienta queda a menos de 0,2 de la superficie que golpea', () => {
  const gaps: number[] = [];
  for (const [seed, ticks] of [[11, 21 * 48], [23, 30 * 48], [7, 1418]] as const) {
    const st = foundGame(seed); run(st, ticks, 'prudent', CATALOG);
    const land = solidTerrain(st, () => undefined);
    const life = createVillage(st, st.tick * 7, { land });
    while (life.steps < 1500) life.step();
    const out: string[] = [];
    for (const d of life.dwellers) {
      const id = d.doing?.place.id ?? '';
      if (!d.doing?.there || d.doing.offer.id !== 'work') continue;
      if (id.startsWith('felling:')) {
        const p = head(d.body, 'chop'); let gap = 9;
        for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
          const c = (Math.floor(p.z) + dz) * st.map.width + Math.floor(p.x) + dx;
          if (st.map.terrain[c] !== 1 || st.map.forestStock[c]! <= 0) continue;
          const t = scatterTransform(st.map.width, c); gap = Math.min(gap, Math.hypot(p.x - t.x, p.z - t.z) - 0.34 / 3 * t.scale);
        }
        out.push(`tala gap ${gap.toFixed(2)}`); gaps.push(gap);
      } else if (id.startsWith('quarry:')) {
        const cell = Number(id.split(':')[1]); const cx = cell % st.map.width, cz = Math.floor(cell / st.map.width); const p = head(d.body, 'mine');
        const inside = Math.min(p.x - cx, cx + 1 - p.x, p.z - cz, cz + 1 - p.z);
        out.push(`pico dentro ${inside.toFixed(2)}`); gaps.push(Math.max(0, -inside));
      }
    }
    console.log(seed, ticks, out.join(' | ') || 'nadie trabajando en tajo/cantera');
  }
  expect(gaps.length).toBeGreaterThanOrEqual(4);
  for (const gap of gaps) expect(gap).toBeLessThan(0.2);
});
