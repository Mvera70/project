// V-00b · El banco, pero en el valle de verdad. Anexo E.
//
// **La pregunta que este segundo banco responde es la única que puede matar el
// plan**: ¿esto aguanta ochenta personas en el mapa real, en un móvil?
//
// Ocho cuerpos en un prado liso con siete destinos no prueba nada de eso. El
// valle de verdad tiene noventa y nueve edificios, un río con su cauce que no
// se cruza salvo por el vado, bosque, roqueda y marisma; y las calles entre las
// casas son estrechas, que es donde una multitud se atasca si se va a atascar.
//
// Lo demás es igual: el mismo `step` de `life.ts`, sin una línea distinta. Que
// el mismo código valga para cinco casas y para el valle entero es, en sí, la
// respuesta a media pregunta.

import { TERRAIN_CODE, type GameState } from '@engine/state';
import { createWorld, type Point, type World } from './life';

/** Lo que no se pisa: el agua, la roca, y lo que esté construido. */
function maskFrom(state: GameState): Uint8Array {
  const { width, height } = state.map;
  const blocked = new Uint8Array(width * height);
  for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
    const kind = state.map.terrain[cell];
    if (kind === TERRAIN_CODE.water || kind === TERRAIN_CODE.rock) blocked[cell] = 1;
  }
  // Y los edificios. Los campos no: por un campo se anda, y de hecho es donde
  // se trabaja. Lo que corta el paso es lo que tiene paredes.
  const WALLED = new Set([
    'house', 'stone_house', 'granary', 'chapel', 'church',
    'smithy', 'mill', 'watchtower', 'palisade', 'wall',
  ]);
  for (const building of state.buildings) {
    if (building.lostTick !== null || !WALLED.has(building.kind)) continue;
    for (let z = building.y; z < building.y + building.h; z += 1) {
      for (let x = building.x; x < building.x + building.w; x += 1) {
        if (x >= 0 && z >= 0 && x < width && z < height) blocked[z * width + x] = 1;
      }
    }
  }
  return blocked;
}

/**
 * Los sitios por los que se pasa, sacados del pueblo de verdad.
 *
 * El pozo, la era, las puertas de lo que hay construido, el vado. En el juego
 * esto sería `placesOf` (V-10) y saldría de las ofertas de cada edificio; aquí
 * basta con que sean sitios reales y repartidos, porque lo que se mide es si la
 * aldea se atasca yendo de unos a otros.
 */
function hauntsFrom(state: GameState, blocked: Uint8Array): Point[] {
  const { width, height } = state.map;
  const free = (x: number, z: number): boolean => {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    return cx >= 1 && cz >= 1 && cx < width - 1 && cz < height - 1
      && blocked[cz * width + cx] !== 1;
  };

  const spots: Point[] = [];
  for (const building of state.buildings) {
    if (building.lostTick !== null) continue;
    // Un punto a la puerta, o en medio si es un campo.
    const candidates: Point[] = [
      { x: building.x + building.w / 2, z: building.y + building.h + 0.6 },
      { x: building.x - 0.6, z: building.y + building.h / 2 },
      { x: building.x + building.w / 2, z: building.y - 0.6 },
      { x: building.x + building.w / 2, z: building.y + building.h / 2 },
    ];
    const spot = candidates.find((c) => free(c.x, c.z));
    if (spot !== undefined) spots.push(spot);
  }
  return spots.length >= 4 ? spots : [{ x: width / 2, z: height / 2 }];
}

/**
 * El valle de verdad, con la gente que tenga.
 *
 * Se apoya en `createWorld` para no repetir el reparto de caracteres ni el de
 * trastos: lo que cambia es el suelo, los destinos y cuánta gente hay.
 */
export function createValley(state: GameState, seed: number, count: number): World {
  const world = createWorld(seed, count);
  const blocked = maskFrom(state);
  const haunts = hauntsFrom(state, blocked);
  const { width, height } = state.map;

  const built: World = {
    ...world,
    width,
    height,
    obstacles: [],
    blocked,
    haunts,
  };

  // A cada uno se le deja donde quepa, repartidos por los sitios del pueblo.
  built.bodies.forEach((body, i) => {
    const spot = haunts[i % haunts.length] as Point;
    let x = spot.x;
    let z = spot.z;
    for (let ring = 0; ring < 24; ring += 1) {
      const angle = ring * 2.39996;
      const reach = 0.4 + ring * 0.42;
      const tryX = spot.x + Math.sin(angle) * reach;
      const tryZ = spot.z + Math.cos(angle) * reach;
      const cx = Math.floor(tryX);
      const cz = Math.floor(tryZ);
      if (cx >= 1 && cz >= 1 && cx < width - 1 && cz < height - 1
        && blocked[cz * width + cx] !== 1) { x = tryX; z = tryZ; break; }
    }
    body.x = x;
    body.z = z;
    body.goal = null;
  });

  // Y los trastos, en suelo pisable del pueblo.
  built.props.forEach((prop, i) => {
    const spot = haunts[(i * 7 + 3) % haunts.length] as Point;
    prop.x = spot.x;
    prop.z = spot.z;
    prop.y = 0;
    prop.vx = 0;
    prop.vz = 0;
    prop.held = null;
  });

  return built;
}
