// V-02 · Lo que empuja a un cuerpo. design.md Anexo E.
//
// Tres fuerzas y una corrección, y entre las cuatro sustituyen a quince
// ayudantes de `actors/index.ts`:
//
// | Aquí | Lo que emulaba |
// |---|---|
// | `seek` | `along`, `headingAround`, `lengthOf` |
// | `separate` | `lane`, `laneWidth`, `window`, `elbowRoom` |
// | `avoid` | `detour`, `aroundWalls`, `trimIndoors`, `clearBetween`, `skirt` |
// | `resolve` | nada: no había garantía, sólo esperanza |
//
// No es que sean mejores: es que un cuerpo con posición y velocidad **no
// necesita** que le repartan carriles ni que le tracen un rodeo. Se aparta
// porque no cabe.

import { blockedAt, WALL_CLEAR, type Body, type Point, type Terrain } from './body';
import type { Neighbourhood } from './grid';

/** Un empujón. No es una posición: es a dónde quiere ir el cuerpo. */
export interface Push { x: number; z: number }

/**
 * Desde dónde se empieza a frenar al llegar, en celdas.
 *
 * Sin frenada, llegar es pasarse y volver, y lo que se ve es a alguien
 * temblando sobre su destino.
 */
const BRAKE = 2.2;

/** Ir hacia un punto, frenando al acercarse. */
export function seek(body: Body, to: Point): Push {
  const away = Math.hypot(to.x - body.x, to.z - body.z);
  if (away < 1e-6) return { x: 0, z: 0 };
  const want = body.pace * Math.min(1, away / BRAKE);
  return { x: (to.x - body.x) / away * want, z: (to.z - body.z) / away * want };
}

/** El palmo que se deja además de los dos radios, al apartarse. */
const ELBOW = 0.25;

/**
 * Apartarse de quien viene.
 *
 * **Esto es lo que `lane` emulaba** y aquí sale solo: dos cuerpos no caben en el
 * mismo sitio, así que se empujan. No hay carriles que repartir porque no hay
 * carriles.
 */
export function separate(body: Body, around: Neighbourhood): Push {
  let x = 0;
  let z = 0;
  around.near(body, (other) => {
    const apart = Math.hypot(other.x - body.x, other.z - body.z);
    const touching = body.radius + other.radius + ELBOW;
    if (apart >= touching || apart < 1e-6) return;
    const push = (touching - apart) / touching;
    x += (body.x - other.x) / apart * push * body.pace * 1.8;
    z += (body.z - other.z) / apart * push * body.pace * 1.8;
  });
  return { x, z };
}

/**
 * Apartarse de lo que no se pisa.
 *
 * Las ocho casillas de alrededor y ninguna más: da igual que el valle tenga
 * cinco casas o noventa y nueve edificios con río y roqueda, esto vale lo mismo.
 */
export function avoid(body: Body, land: Terrain): Push {
  let x = 0;
  let z = 0;
  const hereX = Math.floor(body.x);
  const hereZ = Math.floor(body.z);
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const cx = hereX + dx;
      const cz = hereZ + dz;
      if (!blockedAt(land, cx + 0.5, cz + 0.5)) continue;
      // El punto de esa casilla que más cerca queda del cuerpo.
      const nx = Math.max(cx, Math.min(body.x, cx + 1));
      const nz = Math.max(cz, Math.min(body.z, cz + 1));
      const apart = Math.hypot(body.x - nx, body.z - nz);
      const clear = body.radius + WALL_CLEAR;
      if (apart >= clear) continue;
      if (apart < 1e-6) { x += 1; continue; }
      const push = (clear - apart) / clear;
      x += (body.x - nx) / apart * push * body.pace * 3.2;
      z += (body.z - nz) / apart * push * body.pace * 3.2;
    }
  }
  return { x, z };
}

/**
 * Lo más que puede mover a un cuerpo la corrección de solapes, por paso.
 *
 * TUNE: 0,06 celdas, que es lo que anda alguien en un paso. **Sin tope esto es
 * un teletransporte por la puerta de atrás**: en una plaza llena un cuerpo
 * recibe empujón de cinco vecinos en la misma pasada y se va de golpe. Medido
 * en el valle real: 0,26 celdas por paso con ochenta cuerpos y 1,06 con
 * doscientos, contra las 0,06 de quien anda.
 *
 * Lo que no cabe corregir hoy se corrige en el paso siguiente: el solape dura
 * un fotograma más y no lo ve nadie.
 */
const FIX_CAP = 0.06;

/**
 * Separa a los que hayan quedado encima, después de mover a todos.
 *
 * `separate` es la fuerza —se ven venir y se apartan— y esto es la garantía: dos
 * que llegan a la vez por caminos opuestos pueden acabar solapados un instante,
 * y eso se resuelve moviéndolos, no empujándolos. Es lo que en un motor de
 * físicas se llama resolver, y sin ello la separación es sólo una intención.
 *
 * Recorre los cuerpos en el orden en que vengan, que es el de identificador:
 * dos partidas iguales tienen que resolver en el mismo orden.
 */
export function resolve(
  bodies: readonly Body[],
  around: Neighbourhood,
  land: Terrain,
  passes = 2,
): void {
  const fixX = new Float64Array(bodies.length);
  const fixZ = new Float64Array(bodies.length);
  const seat = new Map<number, number>();
  bodies.forEach((body, i) => seat.set(body.id, i));

  for (let pass = 0; pass < passes; pass += 1) {
    // **La rejilla se rehace en cada pasada**, y no se hereda del principio del
    // paso: entre medias los cuerpos se han movido, y una rejilla caducada
    // esconde justo a los vecinos que acaban de acercarse. Medido: con la
    // rejilla del principio del paso, dos cuerpos llegaban a 0,295 celdas con
    // radios de 0,32, o sea metidos el uno en el otro. Rehacerla son ochenta
    // escrituras en un array de enteros.
    around.rebuild(bodies);
    for (let i = 0; i < bodies.length; i += 1) {
      const body = bodies[i] as Body;
      around.near(body, (other) => {
        // Cada pareja se toca una vez por pasada, no dos.
        if (other.id < body.id) return;
        const apart = Math.hypot(other.x - body.x, other.z - body.z);
        const room = body.radius + other.radius;
        if (apart >= room || apart < 1e-6) return;

        const half = (room - apart) / 2;
        const ux = (other.x - body.x) / apart;
        const uz = (other.z - body.z) / apart;
        const j = seat.get(other.id);
        if (j === undefined) return;

        // Separar no puede ser meter a nadie en una pared: quien no tiene sitio
        // se queda donde está y el otro carga con todo el apartarse.
        const mineFits = !blockedAt(land, body.x - ux * half, body.z - uz * half);
        const theirsFits = !blockedAt(land, other.x + ux * half, other.z + uz * half);
        if (mineFits) {
          body.x -= ux * half; body.z -= uz * half;
          fixX[i] = (fixX[i] ?? 0) - ux * half;
          fixZ[i] = (fixZ[i] ?? 0) - uz * half;
        }
        if (theirsFits) {
          other.x += ux * half; other.z += uz * half;
          fixX[j] = (fixX[j] ?? 0) + ux * half;
          fixZ[j] = (fixZ[j] ?? 0) + uz * half;
        }
      });
    }
  }

  // Y se recorta lo que se haya pasado, devolviendo al cuerpo hacia donde
  // estaba — salvo que allí ya no quepa, porque otro lo empujó contra un muro.
  for (let i = 0; i < bodies.length; i += 1) {
    const moved = Math.hypot(fixX[i] ?? 0, fixZ[i] ?? 0);
    if (moved <= FIX_CAP) continue;
    const body = bodies[i] as Body;
    const back = (moved - FIX_CAP) / moved;
    const x = body.x - (fixX[i] ?? 0) * back;
    const z = body.z - (fixZ[i] ?? 0) * back;
    if (!blockedAt(land, x, z)) { body.x = x; body.z = z; }
  }
}

/**
 * Suaviza el empujón hacia la velocidad y la aplica.
 *
 * La velocidad **persigue** a lo que se quiere en vez de saltar a ello: sin
 * esto, cambiar de idea da un tirón, y un valle de tirones se lee como un valle
 * de errores.
 */
export function drive(body: Body, want: Push): void {
  // Constante y no por segundo: el paso de esta capa es fijo (V-01), así que
  // pasarle el tiempo sería pasarle siempre el mismo número.
  const EASE = 0.22;
  body.vx += (want.x - body.vx) * EASE;
  body.vz += (want.z - body.vz) * EASE;

  const speed = Math.hypot(body.vx, body.vz);
  const top = body.pace * 1.6;
  if (speed > top) {
    body.vx = body.vx / speed * top;
    body.vz = body.vz / speed * top;
  }
}
