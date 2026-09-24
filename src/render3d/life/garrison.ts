// C2 · La guarnición, con cuerpo. design.md §1b, fase 4; Anexo E.
//
// `derive/garrison.ts` dice **cuántos suben, a qué puesto y con qué**. Esto lo
// baja a la jornada: convierte cada puesto en un sitio donde se puede estar de
// verdad y lo entrega como un `Place` más, para que el reparto de la jornada lo
// asigne igual que asigna la fragua o el granero (`day.ts`). Ninguna otra parte
// de esta capa necesita saber que la guarnición existe, que es la propiedad que
// hace que esto sea barato.
//
// **Un puesto no es donde se pisa.** La celda de una estaca, de un portón o de
// una atalaya está cerrada para un cuerpo (`life/terrain.ts` cierra lo
// construido), así que el sitio es **la celda de al lado que da adentro**: un
// vecino guardando su puerta está detrás de ella, no plantado en medio de la
// hoja. Se elige la más cercana al corazón del pueblo, que es lo que distingue
// estar de guardia de estar esperando fuera a que te abran.
//
// **Y sube quien la aldea manda, no quien se aburre.** Las dos ofertas son
// `routineOnly`, así que la elección ambiental no las ve: nadie se va a la
// muralla porque le apetezca, y una aldea en paz no tiene puestos que ofrecer
// porque `garrisonOf` no los da.

import { garrisonOf, type Arm, type Post } from '@derive/garrison';
import { bastionAccessOf } from '@derive/bastion-access';
import { bastionWalkwayOf, type BastionWalkway } from '@derive/bastion-walkway';
import type { ElevatedRing } from '@derive/elevated-ring';
import type { GameState } from '@engine/state';
import type { Point, Terrain } from './body';
import { fitsCircle } from './body';
import { canReach } from './terrain';
import { elevatedPostOf, elevatedWallRoute, elevatedRingCircuit, type ElevatedPost } from './elevated-post';
import { OFFERS, placedOffer, type OfferSpec, type Place } from './offers';

/** La escena puede negar una junta cuando un tronco real ocupa su tablero. */
export type WalkwaySelector = (state: GameState, bastion: GameState['buildings'][number]) => BastionWalkway | null;
export type RingSelector = (state: GameState, bastion: GameState['buildings'][number]) => ElevatedRing;

/** Un puesto ocupado: el sitio donde se está y lo que se sabe de él. */
export interface Manned {
  readonly place: Place;
  readonly post: Post;
  /** E3a · Acceso privado al bastión; no es una plaza de navegación pública. */
  readonly elevated?: ElevatedPost;
  /** E3b · Variante elegida una vez; el combate no la deduce por coordenadas. */
  readonly elevatedVariant?: 'bastion' | 'wall' | 'ring';
  /** Celdas del circuito acreditado para construir su suelo físico en batalla. */
  readonly ring?: ElevatedRing;
  /** Dos celdas de adarve que comparten plataforma física con el bastión. */
  readonly walkway?: { readonly firstWall: Point; readonly nextWall: Point };
  /** Hacia dónde mira quien está ahí: afuera, que es de donde vienen. */
  readonly facing: Point;
}

/** Sólo baja a la cota de tablero las celdas de piedra que sostienen una ruta asignada. */
export function mannedPlatformCells(manned: readonly Manned[]): Point[] {
  return manned.flatMap(post => post.elevated === undefined
    ? [] : post.elevatedVariant === 'ring' && post.ring !== undefined
      // El portón necesita un tablero propio sin tapiar el paso público inferior.
      ? post.ring.segments.filter(segment => segment.kind !== 'gate').map(segment => segment.cell)
      : post.elevatedVariant === 'wall' && post.walkway !== undefined
        ? [{ x: post.post.x, z: post.post.y }, post.walkway.firstWall, post.walkway.nextWall]
        : [{ x: post.elevated.post.x, z: post.elevated.post.z }]);
}

/** El radio de un cuerpo, para preguntar si cabe. El mismo de `body.ts`. */
const BODY = 0.32;

/**
 * El sitio de un puesto: la celda pisable de al lado que más adentro está.
 *
 * Se prueban las ocho, y no las cuatro en cruz, porque desde A2c el anillo es
 * un círculo rasterizado y avanza en diagonal cada pocos pasos: la celda que da
 * adentro de una estaca puede estar en esquina.
 */
export function postSpot(
  land: Terrain, post: Post, heart: Point, reach?: Uint8Array,
  /**
   * Las celdas que ya ocupa otro puesto, para no poner a dos en la misma.
   *
   * **Hacía falta, y lo encontró una toma del observatorio.** Tres puestos
   * seguidos del anillo —`20,53`, `20,51` y `19,53`— daban **el mismo punto**
   * en pantalla: la celda de dentro más cercana al corazón es la misma para
   * varias estacas vecinas, así que los tres arqueros se plantaban en el mismo
   * palmo de suelo empujándose, que es exactamente el defecto que `seatsOn`
   * arregló para los corros en IA-1. Se pasa el conjunto de lo ya cogido y cada
   * puesto se queda con la mejor celda **libre**.
   */
  taken?: ReadonlySet<number>,
): Point | null {
  // **Dos anillos, y el segundo hizo falta**: con los puestos vecinos del
  // círculo compartiendo su única celda de dentro, exigir celda distinta dejaba
  // la guarnición en **uno de tres** (medido en la toma de la semilla 7). Un
  // defensor una celda más atrás sigue guardando su tramo; dos ya no, y por eso
  // no se busca más lejos: se prefiere perder el puesto a poner a alguien en
  // medio del pueblo diciendo que está en la muralla.
  for (let ring = 1; ring <= POST_RINGS; ring += 1) {
    let best: Point | null = null;
    let bestGap = Number.POSITIVE_INFINITY;
    for (let dz = -ring; dz <= ring; dz += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const col = post.x + dx;
        const row = post.y + dz;
        if (taken?.has(row * land.width + col) === true) continue;
        const at = { x: col + 0.5, z: row + 0.5 };
        if (!fitsCircle(land, at.x, at.z, BODY)) continue;
        if (reach !== undefined && !canReach(land, reach, at)) continue;
        const gap = Math.hypot(at.x - heart.x, at.z - heart.z);
        if (gap >= bestGap) continue;
        bestGap = gap;
        best = at;
      }
    }
    if (best !== null) return best;
  }
  return null;
}

/** Cuántas celdas hacia dentro se busca sitio para un puesto. Ver arriba. */
const POST_RINGS = 2;

/** Qué oferta corresponde a un arma. */
function offerFor(arm: Arm): OfferSpec {
  return OFFERS[arm === 'bow' ? 'archer' : 'guard'] as OfferSpec;
}

/**
 * Los puestos de hoy, ya con sitio y aforo de uno.
 *
 * Devuelve lista vacía cuando la aldea está en paz, cuando no le han dado nada
 * con que defenderse y cuando ninguno de sus puestos tiene una celda pisable
 * adentro —un cerco tan apretado que no se puede ni guardar—. Ninguna de las
 * tres es un error: son tres aldeas distintas.
 */
export function garrisonPlaces(
  state: GameState, land: Terrain, heart: Point, reach?: Uint8Array,
  ground?: (x: number, z: number) => number,
  walkwayOf: WalkwaySelector = bastionWalkwayOf,
  ringOf?: RingSelector,
): Manned[] {
  const garrison = garrisonOf(state);
  if (!garrison.manned) return [];
  const manned: Manned[] = [];
  const taken = new Set<number>();
  const postKey = (post: Post): string => `${post.x},${post.y}`;
  const ringCircuits = new Map<string, { route: ElevatedPost; ring: ElevatedRing }>();
  if (ringOf !== undefined) {
    for (const post of garrison.posts) {
      const bastion = state.buildings.find(building => building.kind === 'bastion'
        && building.lostTick === null && building.x === post.x && building.y === post.y);
      if (bastion === undefined) continue;
      const access = bastionAccessOf(state, bastion);
      if (access === null) continue;
      const ring = ringOf(state, bastion);
      if (!ring.geometryReady) continue;
      const stair = elevatedPostOf(land, reach, { x: bastion.x, z: bastion.y }, access, ground, .65);
      const circuit = stair === null ? null : elevatedRingCircuit(stair, ring);
      if (circuit !== null) ringCircuits.set(postKey(post), { route: circuit, ring });
    }
  }
  // La celda del pie puede ser también el sitio preferido de un puesto de
  // portón. Asignar primero el único acceso al anillo y dar al portón otra
  // celda pisable; devolver después el orden táctico original de puestos.
  const order = new Map(garrison.posts.map((post, index) => [postKey(post), index]));
  const posts = [...garrison.posts].sort((a, b) =>
    Number(ringCircuits.has(postKey(b))) - Number(ringCircuits.has(postKey(a))));
  for (const post of posts) {
    // Se busca por el edificio real, no por `post.on`: ambos bastión y
    // atalaya son `tower` para la táctica, pero sólo el primero tiene escalera.
    const bastion = state.buildings.find(building => building.kind === 'bastion'
      && building.lostTick === null && building.x === post.x && building.y === post.y);
    const access = bastion === undefined ? null : bastionAccessOf(state, bastion);
    const elevated = access === null || bastion === undefined
      ? null : elevatedPostOf(land, reach, { x: bastion.x, z: bastion.y }, access, ground);
    const walkway = elevated === null || bastion === undefined ? null : walkwayOf(state, bastion);
    const circuit = ringCircuits.get(postKey(post)) ?? null;
    const route = circuit?.route ?? (elevated === null || bastion === undefined ? null : walkway === null
      ? elevated
      : elevatedWallRoute({ x: bastion.x, z: bastion.y }, walkway.access, elevated.approach.y));
    const entry = route?.approach;
    const entryCell = entry === undefined ? -1 : Math.floor(entry.z) * land.width + Math.floor(entry.x);
    const usingElevated = entry !== undefined && !taken.has(entryCell);
    // `Place` sólo entiende suelo X/Z: la cota queda exclusivamente en la
    // ruta privada y no puede filtrarse al router como un destino elevado.
    const at = usingElevated
      ? { x: entry.x, z: entry.z }
      : postSpot(land, post, heart, reach, taken);
    if (at === null) continue;
    taken.add(Math.floor(at.z) * land.width + Math.floor(at.x));
    // Una plaza y su sitio dado: un puesto es de uno, y no se reparte en corro
    // alrededor de la estaca —que es campo abierto por el otro lado—.
    const offer = placedOffer(offerFor(post.arm), at, land, undefined, [at]);
    if (offer === null) continue;
    manned.push({
      place: { id: `post:${post.on}:${post.x},${post.y}`, at, offers: [offer] },
      post,
      ...(route === null || !usingElevated ? {} : {
        elevated: route,
        elevatedVariant: circuit !== null ? 'ring' : walkway === null ? 'bastion' : 'wall',
        ...(circuit === null ? {} : { ring: circuit.ring }),
        ...(walkway === null || circuit !== null ? {} : { walkway: {
          firstWall: { x: bastion!.x + walkway.side.x, z: bastion!.y + walkway.side.z },
          nextWall: { x: bastion!.x + walkway.side.x * 2, z: bastion!.y + walkway.side.z * 2 },
        } }),
      }),
      // E3b termina en el segundo muro: desde allí el centro del bastión queda
      // a la espalda. E3a y el suelo conservan su referencia previa.
      facing: route !== null && usingElevated && walkway !== null && circuit === null
        ? { x: route.post.x - walkway.access.x, z: route.post.z - walkway.access.z }
        // Mirando afuera: el puesto está entre quien lo ocupa y el camino, así
        // que la celda de la muralla **es** la dirección de la amenaza.
        : { x: post.x + 0.5, z: post.y + 0.5 },
    });
  }
  return manned.sort((a, b) => (order.get(postKey(a.post)) ?? 0) - (order.get(postKey(b.post)) ?? 0));
}

/** Si un sitio de la jornada es un puesto del cerco. Lo usan `day.ts` y D2. */
export function isPost(placeId: string): boolean {
  return placeId.startsWith('post:');
}
