// V-03 · La navegación. Anexo E.
//
// Lo que estas pruebas guardan es que **la gente llega**. El empuje local de
// V-02 saca a alguien de un tropiezo pero no de un rincón cóncavo: sin ruta,
// quien va a un sitio detrás de una casa se queda empujando la pared, y eso en
// pantalla se lee como que el juego se ha colgado.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import { hash32 } from '@engine/rng';
import { blockedAt, gap, integrate, turnTo, type Body, type Terrain } from '../../src/render3d/life/body';
import { createNeighbourhood } from '../../src/render3d/life/grid';
import { canReach, reachableFrom, terrainOf } from '../../src/render3d/life/terrain';
import { avoid, drive, resolve, seek, separate } from '../../src/render3d/life/steering';
import { clearBetween, createRouter, follow, pathTo, type Waypoint } from '../../src/render3d/life/navigate';
import { LIFE_STEP, STEPS_PER_DAY } from '../../src/render3d/life/clock';

/** Un patio con una U: el caso que el empuje local no sabe resolver. */
function pocket(): Terrain {
  const width = 20;
  const height = 20;
  const blocked = new Uint8Array(width * height);
  const wall = (x: number, z: number): void => { blocked[z * width + x] = 1; };
  // Tres paredes mirando al oeste: el fondo queda a la vista desde dentro y
  // tapado desde fuera, que es justo donde una recta se clava.
  for (let z = 6; z <= 14; z += 1) { wall(12, z); }
  for (let x = 8; x <= 12; x += 1) { wall(x, 6); wall(x, 14); }
  return { width, height, blocked };
}

function valley(seed: number): Terrain {
  const state = foundGame(seed);
  run(state, 40 * 48, 'prudent', CATALOG);
  return terrainOf(state);
}

function freeSpots(land: Terrain, count: number, seed: number): Waypoint[] {
  const spots: Waypoint[] = [];
  for (let n = 0; spots.length < count && n < count * 200; n += 1) {
    const x = 1 + (hash32(seed, `x:${n}`) / 4_294_967_296) * (land.width - 2);
    const z = 1 + (hash32(seed, `z:${n}`) / 4_294_967_296) * (land.height - 2);
    if (!blockedAt(land, x, z)) spots.push({ x, z });
  }
  return spots;
}

describe('V-03 · la navegación', () => {
  it('la misma pregunta da siempre la misma ruta', () => {
    // §4.3 otra vez: mirar el valle no puede cambiarlo. Y sin esto no hay forma
    // de reproducir un atasco para arreglarlo.
    const land = valley(7);
    const from = { x: 3.5, z: 3.5 };
    const to = { x: land.width - 3.5, z: land.height - 3.5 };
    const once = pathTo(land, from, to);
    const twice = pathTo(land, from, to);
    expect(twice).toEqual(once);
  });

  it('sin camino posible, lo dice en vez de inventarlo', () => {
    // Lo que hacía el render viejo y por eso la gente cruzaba el río. Decir que
    // no hay es una respuesta, no un fallo.
    const land = valley(7);
    // Un destino dentro de la roca: no hay manera de estar ahí.
    let walled = -1;
    for (let c = 0; c < land.blocked.length; c += 1) if (land.blocked[c] === 1) { walled = c; break; }
    expect(walled).toBeGreaterThanOrEqual(0);
    const to = { x: (walled % land.width) + 0.5, z: Math.floor(walled / land.width) + 0.5 };
    expect(pathTo(land, { x: 2.5, z: 2.5 }, to)).toBeNull();
  });

  it('rodea un rincón cóncavo, que es lo que el empuje solo no sabe hacer', () => {
    const land = pocket();
    // Dentro de la U, y el destino al otro lado de su fondo.
    const from = { x: 10.5, z: 10.5 };
    const to = { x: 16.5, z: 10.5 };
    expect(clearBetween(land, from, to), 'el destino está tapado').toBe(false);

    const route = pathTo(land, from, to);
    expect(route, 'hay salida').not.toBeNull();
    // Y la ruta sale por la boca: pasa por encima o por debajo de la U, nunca
    // por el fondo.
    const passesWall = (route ?? []).some((at) => blockedAt(land, at.x, at.z));
    expect(passesWall, 'ningún punto de paso cae en una pared').toBe(false);
  });

  it('la ruta va por sitio pisable de punta a punta', () => {
    // No basta con que los puntos de paso estén libres: el tramo entre dos
    // también, o el cuerpo se mete en la pared yendo de uno al siguiente.
    for (const seed of [7, 11, 23]) {
      const land = valley(seed);
      const spots = freeSpots(land, 24, seed);
      let found = 0;
      for (let i = 0; i + 1 < spots.length; i += 2) {
        const from = spots[i] as Waypoint;
        const route = pathTo(land, from, spots[i + 1] as Waypoint);
        if (route === null) continue;
        found += 1;
        let at = from;
        for (const next of route) {
          expect(clearBetween(land, at, next),
            `semilla ${seed}: un tramo de ruta cruza algo`).toBe(true);
          at = next;
        }
      }
      expect(found, `semilla ${seed}: ninguna ruta salió`).toBeGreaterThan(0);
    }
  });

  it('la caché responde lo mismo y pregunta mucho menos', () => {
    const land = valley(7);
    const router = createRouter();
    const spots = freeSpots(land, 6, 11);
    const first: Array<Waypoint[] | null> = [];
    for (const to of spots) first.push(router.to(land, { x: 3.5, z: 3.5 }, to));

    // Las mismas seis preguntas, veinte veces.
    for (let round = 0; round < 20; round += 1) {
      spots.forEach((to, i) => {
        const again = router.to(land, { x: 3.5, z: 3.5 }, to);
        expect(again).toEqual(first[i]);
      });
    }
    expect(router.asked).toBe(6 * 21);
    expect(router.solved, `resueltas ${router.solved} de ${router.asked}`).toBe(6);
  });

  it('ochenta personas cruzan el valle un día entero sin atascarse', () => {
    // El criterio de terminado de V-03, y el que de verdad importa: que nadie se
    // quede empujando una pared. Se mide por lo que avanzan, no por dónde
    // acaban: llegar es del comportamiento, y esto es navegación.
    for (const seed of [7, 23]) {
      const land = valley(seed);
      const around = createNeighbourhood(land.width, land.height);
      const router = createRouter();
      // **Un destino por cabeza y no ocho para ochenta.** Con ocho, diez
      // personas se apiñan en cada uno y las de fuera del montón no pueden
      // avanzar: eso es congestión, y medirla aquí sería confundirla con un
      // atasco de navegación. En el juego cada uno va a lo suyo.
      // **Todos en la misma orilla, y los destinos también.** El río parte el
      // valle y no se cruza: sólo el 37 % del suelo libre está conectado con el
      // centro. Repartir gente por todo el mapa y mandarla a cualquier parte
      // mide otra cosa —cuánta hay al otro lado— y no si la navegación funciona.
      const anchor = freeSpots(land, 1, seed)[0] as Waypoint;
      const shore = reachableFrom(land, anchor);
      const here = (at: Waypoint): boolean => canReach(land, shore, at);
      const spots = freeSpots(land, 260, seed + 5).filter(here).slice(0, 40);
      expect(spots.length, `semilla ${seed}: pocos destinos en esta orilla`).toBeGreaterThan(20);

      const bodies: Body[] = [];
      const routes = new Map<number, Waypoint[]>();
      const placed = freeSpots(land, 900, seed).filter(here).slice(0, 80);
      expect(placed.length, `semilla ${seed}: no cabe la aldea en esta orilla`).toBe(80);
      placed.forEach((at, id) => {
        bodies.push({ id, x: at.x, z: at.z, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.3 });
      });

      // **Se mide lo que se completa, no lo que se está quieto.** Estar parado
      // diez segundos es lo que hace quien acaba de llegar, quien espera a que
      // pase otro o quien cede el paso en una calle estrecha: contarlo como
      // atasco mezcla el comportamiento con la navegación. Lo que dice que ésta
      // funciona es que **la gente llega a sitios**, una y otra vez.
      let trips = 0;
      let trapped = 0;
      const goals = new Map<number, Waypoint>();

      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        around.rebuild(bodies);
        for (const body of bodies) {
          let route = routes.get(body.id);
          if (route === undefined || route.length === 0) {
            const before = goals.get(body.id);
            if (before !== undefined && gap(body, before) < 1.2) trips += 1;
            const to = spots[(body.id * 7 + Math.floor(n / 450)) % spots.length] as Waypoint;
            goals.set(body.id, to);
            route = [...(router.to(land, body, to) ?? [])];
            routes.set(body.id, route);
          }
          const next = follow(body, route);
          const want = next === null ? { x: 0, z: 0 } : seek(body, next);
          const push = separate(body, around);
          const wall = avoid(body, land);
          drive(body, { x: want.x + push.x + wall.x, z: want.z + push.z + wall.z });
          integrate(body, land, LIFE_STEP);
          const speed = Math.hypot(body.vx, body.vz);
          if (speed > 0.05) turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
          if (blockedAt(land, body.x, body.z)) trapped += 1;
        }
        resolve(bodies, around, land);
      }

      expect(trapped, `semilla ${seed}: alguien dentro de un muro`).toBe(0);
      // Dos minutos escénicos, ochenta personas y un valle de treinta y seis por
      // cincuenta y seis. Si la navegación funciona, esto son cientos de viajes.
      expect(trips, `semilla ${seed}: sólo ${trips} viajes completados`)
        .toBeGreaterThan(200);
    }
  });
});
