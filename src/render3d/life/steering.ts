import { fitsCircle } from './body';
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

import { hash32 } from '@engine/rng';
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
    const touching = (body.contactRadius ?? body.radius) + (other.contactRadius ?? other.radius)
      + (body.contactRadius === undefined ? ELBOW : 0.05);
    if (apart >= touching || apart < 1e-6) return;
    const push = (touching - apart) / touching;
    const awayX = (body.x - other.x) / apart;
    const awayZ = (body.z - other.z) / apart;
    x += awayX * push * body.pace * 1.8;
    z += awayZ * push * body.pace * 1.8;

    // **Y se cede siempre por el mismo lado.**
    //
    // Dos que se cruzan de frente se empujan en línea recta el uno contra el
    // otro: la fuerza es simétrica, ninguno gana y los dos se quedan
    // forcejeando. Es lo que se veía como quedarse pillados —medido, 691 pasos
    // con velocidad y sin avanzar en una jornada— y lo que la gente de verdad
    // resuelve apartándose todos hacia el mismo lado.
    //
    // Sólo cuando vienen de frente: a quien va en la misma dirección no hay
    // que esquivarlo, hay que seguirlo.
    const closing = body.vx * (other.x - body.x) + body.vz * (other.z - body.z);
    if (closing <= 0) return;
    x += -awayZ * push * body.pace * 1.1;
    z += awayX * push * body.pace * 1.1;
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

  // **Quien nace atrapado en su propia celda no tiene «punto más cercano».**
  // El resto de esta función busca el punto de una celda vecina cerrada más
  // próximo al cuerpo, y ese punto sólo tiene sentido si el cuerpo está fuera
  // de esa celda. Cuando la celda cerrada es la **propia** (E.7: el ancla de
  // un animal, el punto de reunión dentro de una capilla), el cuerpo entero
  // cae dentro de ella y ese punto coincide siempre con el cuerpo mismo —el
  // vector que los separa es cero en cualquier instante, no sólo justo en el
  // borde—, así que no hay fuerza que crezca al acercarse a un borde y morir
  // en el otro (rework.md §3.5.1: probado, un cuerpo se quedaba clavado a
  // 0,04 celdas de la salida porque la vecina que lo empujaba dejaba de
  // hacerlo antes de que la propia celda aportara nada). Se empuja hacia el
  // borde más próximo de la propia celda —el que menos queda por cruzar—, y
  // el resto del bucle no vuelve a tratar esta celda como vecina.
  if (blockedAt(land, hereX + 0.5, hereZ + 0.5)) {
    const fx = body.x - hereX;
    const fz = body.z - hereZ;
    x += (fx < 0.5 ? -1 : 1) * body.pace * 3.2;
    z += (fz < 0.5 ? -1 : 1) * body.pace * 3.2;
  }

  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dz === 0) continue;
      const cx = hereX + dx;
      const cz = hereZ + dz;
      if (!blockedAt(land, cx + 0.5, cz + 0.5)) continue;
      // El punto de esa casilla que más cerca queda del cuerpo.
      const nx = Math.max(cx, Math.min(body.x, cx + 1));
      const nz = Math.max(cz, Math.min(body.z, cz + 1));
      const apart = Math.hypot(body.x - nx, body.z - nz);
      // **El margen con la pared es proporcional al cuerpo, no absoluto.**
      // `WALL_CLEAR` se calibró con una persona (radio 0,32), y aplicado tal
      // cual dejaba a una gallina de radio 0,14 guardando 0,76 celdas de
      // distancia —más de cinco veces su propio radio— mientras su sitio de
      // picoteo está pegado a la casa. Resultado medido: `seek` tirando hacia
      // el muro y `avoid` empujando hacia fuera, las dos a la vez, y los
      // animales andando al 30 % de su paso sin llegar nunca (0,17 celdas por
      // segundo con un paso de 0,50, sin un solo vecino a menos de 0,6). De
      // ahí salía que las tres especies pasaran del 65 % al 96 % de la jornada
      // «andando» y que la vaca pastara el 1,5 %.
      //
      // Dos radios de holgura, con el tope de siempre: una persona guarda lo
      // mismo que antes (0,32 × 2 = 0,64, capado a 0,62) y una gallina 0,28,
      // que es lo que le permite picotear junto a la fachada. Es el mismo
      // criterio que ya siguen `TURN_MIN_SPEED` y el umbral de avance: lo que
      // se le pide a un cuerpo se mide con ese cuerpo.
      const clear = body.radius + Math.min(WALL_CLEAR, body.radius * 2);
      if (apart >= clear) continue;
      // **Justo en el borde compartido, el punto más cercano es el propio
      // cuerpo** (rework.md §3.5.1): con el círculo colisionando de verdad, un
      // cuerpo puede quedarse parado exactamente en la línea que separa su
      // celda de una cerrada — antes se cruzaba de largo y esto no se notaba
      // nunca—. El vector `(cuerpo − punto)` es cero ahí y no dice hacia dónde
      // empujar; **la casilla bloqueada sí lo dice**, es la de `(dx, dz)` de
      // este mismo bucle —nunca `(0, 0)`, esa celda se trató aparte arriba—,
      // así que empujar en `(-dx, -dz)` aparta siempre de ella y no siempre
      // hacia +X como antes: medido, una gallina clavada en `z = 48,0000`
      // para toda la jornada, con `avoid` sólo empujando en X mientras el
      // muro estaba al norte.
      if (apart < 1e-6) {
        const away = Math.hypot(dx, dz);
        x += -dx / away * body.pace * 3.2;
        z += -dz / away * body.pace * 3.2;
        continue;
      }
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
 * Si el círculo entero cabe ahí, no sólo el centro.
 *
 * rework.md §3.5.1: `resolve` corregía solapes mirando sólo si el centro de
 * destino caía en celda cerrada, así que podía dejar el círculo —medio cuerpo—
 * metido en un muro con el centro todavía en celda libre, justo lo que
 * `integrate` (`body.ts`) ya no deja hacer al andar. Sin este mismo criterio
 * aquí, la corrección de solapes deshacía en un paso lo que el andar tardaba
 * en evitar: medido, una aldea entera de personas y bestias apretadas junto a
 * un muro donde `integrate` las frenaba, siendo empujadas por `resolve` a
 * posiciones con el círculo ya dentro — 13 % de los cuerpo-segundos contra el
 * 1,3 % de antes de tocar nada.
 */

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
        const room = (body.contactRadius ?? body.radius) + (other.contactRadius ?? other.radius);
        if (apart >= room) return;

        // **Dos cuerpos en el mismo punto exacto se separaban por una dirección
        // inventada, o no se separaban nunca.** Esta línea decía
        // `apart < 1e-6 → return`: rendirse. Y el vector que los separa es cero,
        // así que no había por dónde empujar.
        //
        // Pasa de verdad y se midió: la oferta de acariciar un animal está
        // **en** el punto del animal (`beasts.ts`, `giftPlaceOf`), así que quien
        // va a acariciarlo acaba dentro de él —la bestia 10041 y la persona 54
        // en 41,88 / 54,84, las dos, seiscientos pasos después—. Y ahí se
        // quedaban para siempre, porque el separador se rendía.
        //
        // La dirección sale de los dos ids con `hash32`, no del reloj ni de un
        // ángulo fijo: dos máquinas separan la misma pareja hacia el mismo lado
        // (§4.3) y dos parejas distintas no se abren todas hacia el este.
        const coincident = apart < 1e-6;
        const turn = (hash32(body.id, `apart:${other.id}`) / 4_294_967_296) * Math.PI * 2;
        const half = coincident ? room / 2 : (room - apart) / 2;
        let ux = coincident ? Math.cos(turn) : (other.x - body.x) / apart;
        let uz = coincident ? Math.sin(turn) : (other.z - body.z) / apart;
        const j = seat.get(other.id);
        if (j === undefined) return;

        // Separar no puede ser meter a nadie en una pared: quien no tiene sitio
        // se queda donde está y el otro carga con todo el apartarse. Con el
        // círculo entero (`fitsCircle`), no sólo el centro — ver el comentario
        // de arriba.
        let mineFits = fitsCircle(land, body.x - ux * half, body.z - uz * half, body.radius);
        let theirsFits = fitsCircle(land, other.x + ux * half, other.z + uz * half, other.radius);
        // **Y en el mismo punto exacto, si esa dirección no cabe, se prueban las
        // otras tres.** Con una sola dirección quedaba el caso peor sin
        // arreglar: dos cuerpos dentro del mismo punto, contra un muro, y
        // ninguno de los dos podía moverse hacia donde tocaba, así que se
        // quedaban dentro el uno del otro para siempre. Cuatro cuartos de vuelta
        // desde el ángulo sorteado: sigue siendo determinista y ya no depende de
        // que la primera salga bien.
        for (let quarter = 1; quarter < 4 && coincident && !mineFits && !theirsFits; quarter += 1) {
          const angle = turn + quarter * (Math.PI / 2);
          ux = Math.cos(angle);
          uz = Math.sin(angle);
          mineFits = fitsCircle(land, body.x - ux * half, body.z - uz * half, body.radius);
          theirsFits = fitsCircle(land, other.x + ux * half, other.z + uz * half, other.radius);
        }
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
    if (fitsCircle(land, x, z, body.radius)) { body.x = x; body.z = z; }
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
