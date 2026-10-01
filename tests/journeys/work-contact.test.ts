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
// **Era `it.fails` y vuelve a `it`** (1 oct 2026, RD-1). Declarada en rojo el
// 30 sep con tres villas fijas (11, 23 y 7 en el paso 1500): sólo 2 muestras
// golpeando, y en la 11 el leñador a 0,44 del tronco. RD-1 deja planteada la
// encrucijada del vado desde el tick 0 y mueve la trayectoria de toda villa
// jugada con `run` desde `foundGame`: esas tres villas dejaron de ser las
// mismas y la prueba pasó sin que nadie tocara la capa de vida —un `it.fails`
// verde-por-azar, que es lo que la regla de «no fijar un umbral con una
// semilla» prohíbe en las dos direcciones—. Remedido en las semillas 1, 2 y 7 a 12 × los
// tres instantes originales: 18 muestras en las seis que tienen a alguien
// golpeando, la peor a 0,19 (semilla 1) y el resto a 0,16 o menos; ninguna
// a 0,44. Por eso la propiedad se mira ahora en seis semillas que tienen
// muestras en esos instantes (1, 2, 7, 9, 11, 12), con la cota y el número de
// muestras intactos. Si una trayectoria futura vuelve a dar un cuerpo a más de
// 0,2 del tronco, esto se pone rojo, que es lo correcto: el defecto de
// llegada del corro (`offers.ts`) no se ha arreglado, sólo no sale.
//
// **Y con RD-5 encima vuelve a salir: `it.fails`, con la propiedad intacta**
// (`CLAUDE.md`, «cuando algo no llega»). RD-5 (sucesos del caserío y las
// consecuencias cortas del vado) mueve otra vez la trayectoria y, con las mismas
// seis semillas y los mismos tres instantes, la semilla 7 en el paso 1500 del
// instante 1440 deja a un leñador a **0,57** del tronco (el otro, a −0,06; en
// el instante 1418 de la misma semilla, 0,11 y 0,14); el resto de las muestras
// de la lista (1, 9 y 12) queda a 0,05 o menos. Son 7 muestras con alguien
// golpeando, así que el número de muestras se cumple y lo que falla es la cota:
// es el defecto de llegada del corro de la 11 de antes (0,44), con otra cifra.
// Cuando una ronda lo arregle, esto se pone rojo y se quita el `.fails`.
it.fails('la cabeza de la herramienta queda a menos de 0,2 de la superficie que golpea', () => {
  const gaps: number[] = [];
  for (const seed of [1, 2, 7, 9, 11, 12]) for (const ticks of [21 * 48, 30 * 48, 1418]) {
    const st = foundGame(seed); run(st, ticks, 'prudent', CATALOG);
    const land = solidTerrain(st, () => undefined);
    const life = createVillage(st, st.tick * 7, { land });
    while (life.steps < 1500) life.step();
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
        gaps.push(gap);
      } else if (id.startsWith('quarry:')) {
        const cell = Number(id.split(':')[1]); const cx = cell % st.map.width, cz = Math.floor(cell / st.map.width); const p = head(d.body, 'mine');
        const inside = Math.min(p.x - cx, cx + 1 - p.x, p.z - cz, cz + 1 - p.z);
        gaps.push(Math.max(0, -inside));
      }
    }
  }
  expect(gaps.length).toBeGreaterThanOrEqual(4);
  for (const gap of gaps) expect(gap).toBeLessThan(0.2);
});
