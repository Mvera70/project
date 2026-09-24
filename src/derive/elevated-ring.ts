// E3b.2c.1 · Topología de piedra del anillo, separada de la aprobación de mallas.
import { bastionAccessOf, type BastionAccess, type BastionAccessState } from '@engine/world/bastion-access';
import { bastionWalkwayOf } from '@engine/world/bastion-walkway';
import type { Building } from '@engine/state';

export interface RingCell { readonly x: number; readonly z: number }
export interface RingPoint extends RingCell { readonly y: 1.02 }
export type ElevatedRingVariant = 'straight' | 'turn' | 'diagonal' | 'mixed' | 'gate-cardinal' | 'gate-diagonal' | 'gate-mixed' | 'bastion-crossing' | 'bastion-return';
export type RingBlock = 'access' | 'gap' | 'branch' | 'wood' | 'ruin' | 'work' | 'interior' | 'obstacle' | 'variant';

export interface ElevatedRingSegment {
  readonly buildingId: number;
  readonly kind: 'wall' | 'gate' | 'bastion';
  readonly cell: RingCell;
  readonly mask: number;
  readonly variant: ElevatedRingVariant;
  readonly incoming: RingCell;
  readonly outgoing: RingCell;
  readonly orientation: number;
  readonly from: RingPoint;
  readonly to: RingPoint;
  readonly eligible: boolean;
  readonly reason: RingBlock | null;
}

export interface ElevatedRing {
  readonly access: BastionAccess | null;
  readonly side: BastionAccess | null;
  readonly status: 'ready' | 'partial' | 'fallback' | 'unavailable';
  readonly topologyClosed: boolean;
  readonly geometryReady: boolean;
  readonly segments: readonly ElevatedRingSegment[];
  /** Centros candidatos en orden, incluso si la geometría sigue sin aprobar. */
  readonly topologyRoute: readonly RingPoint[];
  /** Sólo los centros que tienen suelo aprobado sin huecos desde la escalera. */
  readonly route: readonly RingPoint[];
  readonly blocked: Readonly<{ cell: RingCell; reason: RingBlock }> | null;
}

export interface ElevatedRingOptions {
  /** La escena entrega únicamente variantes ya medidas y publicadas. */
  readonly approvedVariants?: readonly ElevatedRingVariant[];
  /** Volumen exacto del tronco o cualquier obstáculo de escena. */
  readonly blockedAt?: (cell: RingCell) => boolean;
  /** El tablero E3b.1 va hacia dentro; la nueva fábrica de piedra centra el paso. */
  readonly lane?: 'inner' | 'center';
}

const DIRECTIONS = [
  { bit: 1, x: 0, z: -1 }, { bit: 2, x: 1, z: 0 },
  { bit: 4, x: 0, z: 1 }, { bit: 8, x: -1, z: 0 },
  { bit: 16, x: 1, z: -1 }, { bit: 32, x: 1, z: 1 },
  { bit: 64, x: -1, z: 1 }, { bit: 128, x: -1, z: -1 },
] as const;
/** Radio medido del cuerpo que recorre el adarve; life/elevated-post comparte 0,32. */
const RING_BODY_RADIUS = 0.32;

const key = (cell: RingCell): string => `${cell.x},${cell.z}`;
const covers = (item: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }, cell: RingCell): boolean =>
  cell.x >= item.x && cell.x < item.x + item.w && cell.z >= item.y && cell.z < item.y + item.h;
/** Distancia exacta en planta entre el eje de un tramo y una parcela rectangular. */
function distanceToFootprint(from: RingPoint, to: RingPoint,
  item: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }): number {
  const vx = to.x - from.x, vz = to.z - from.z;
  const minX = item.x, maxX = item.x + item.w;
  const minZ = item.y, maxZ = item.y + item.h;
  // Las parcelas lejanas dominan la lista: descartar sin resolver la distancia.
  if (Math.max(from.x, to.x) <= minX - RING_BODY_RADIUS
    || Math.min(from.x, to.x) >= maxX + RING_BODY_RADIUS
    || Math.max(from.z, to.z) <= minZ - RING_BODY_RADIUS
    || Math.min(from.z, to.z) >= maxZ + RING_BODY_RADIUS) {
    return Number.POSITIVE_INFINITY;
  }
  const breaks = [0, 1];
  for (const [start, speed, low, high] of [
    [from.x, vx, minX, maxX], [from.z, vz, minZ, maxZ],
  ] as const) {
    if (speed === 0) continue;
    for (const edge of [low, high]) {
      const t = (edge - start) / speed;
      if (t > 0 && t < 1) breaks.push(t);
    }
  }
  breaks.sort((a, b) => a - b);
  const distanceAt = (t: number): number => {
    const x = from.x + vx * t, z = from.z + vz * t;
    return Math.hypot(Math.max(minX - x, 0, x - maxX), Math.max(minZ - z, 0, z - maxZ));
  };
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < breaks.length; i += 1) {
    const low = breaks[i - 1]!, high = breaks[i]!;
    const middle = (low + high) / 2;
    const x = from.x + vx * middle, z = from.z + vz * middle;
    const targetX = x < minX ? minX : x > maxX ? maxX : null;
    const targetZ = z < minZ ? minZ : z > maxZ ? maxZ : null;
    const speedSquared = (targetX === null ? 0 : vx * vx) + (targetZ === null ? 0 : vz * vz);
    const optimum = speedSquared === 0 ? middle : Math.max(low, Math.min(high,
      ((targetX === null ? 0 : vx * (targetX - from.x))
        + (targetZ === null ? 0 : vz * (targetZ - from.z))) / speedSquared));
    best = Math.min(best, distanceAt(low), distanceAt(optimum), distanceAt(high));
  }
  return best;
}
const standing = (building: Building): boolean => building.lostTick === null;
const defence = (building: Pick<Building, 'kind'>): boolean =>
  building.kind === 'wall' || building.kind === 'palisade' || building.kind === 'gate' || building.kind === 'bastion';
function stone(building: Building, buildings: readonly Building[]): boolean {
  if (!standing(building) || building.w !== 1 || building.h !== 1) return false;
  if (building.kind === 'wall' || building.kind === 'bastion') return building.tier === 1;
  if (building.kind !== 'gate') return false;
  // El portón conserva tier=0 incluso al dibujarse en piedra. La escena usa
  // primero la empalizada vecina y después el muro/bastión para elegir su GLB.
  const nearby = buildings.filter(other => other.id !== building.id && standing(other)
    && Math.abs(other.x - building.x) <= 1 && Math.abs(other.y - building.y) <= 1);
  return !nearby.some(other => other.kind === 'palisade')
    && nearby.some(other => (other.kind === 'wall' || other.kind === 'bastion') && other.tier === 1);
}

function neighbours(cell: RingCell, occupied: ReadonlyMap<string, Building>): readonly { building: Building; direction: typeof DIRECTIONS[number] }[] {
  return DIRECTIONS.flatMap(direction => {
    const next = occupied.get(key({ x: cell.x + direction.x, z: cell.z + direction.z }));
    if (next === undefined) return [];
    // Igual que defenceConnections: un codo cardinal existente anula la diagonal.
    if (direction.bit >= 16 && (occupied.has(key({ x: cell.x + direction.x, z: cell.z }))
      || occupied.has(key({ x: cell.x, z: cell.z + direction.z })))) return [];
    return [{ building: next, direction }];
  });
}

function routePoint(building: Building, before: Building, after: Building | undefined,
  inset: number): RingPoint {
  const inX = building.x - before.x, inZ = building.y - before.y;
  const outX = after === undefined ? inX : after.x - building.x;
  const outZ = after === undefined ? inZ : after.y - building.y;
  const inLength = Math.hypot(inX, inZ), outLength = Math.hypot(outX, outZ);
  const alongX = inX / inLength + outX / outLength;
  const alongZ = inZ / inLength + outZ / outLength;
  const norm = Math.hypot(alongX, alongZ) || 1;
  // A la izquierda del sentido de marcha queda el interior del anillo.
  // E3b.1 exige 0,29; las fuentes nuevas llevan el paso centrado en la celda.
  return { x: building.x + 0.5 - alongZ / norm * inset,
    z: building.y + 0.5 + alongX / norm * inset, y: 1.02 };
}

function variantOf(building: Building, incoming: RingCell, outgoing: RingCell): ElevatedRingVariant {
  // A second bastion needs its own joint. Approving `mixed` must never imply
  // a walkable surface through the bastion volume.
  if (building.kind === 'bastion') return 'bastion-crossing';
  const a = Math.abs(incoming.x) + Math.abs(incoming.z) === 2;
  const b = Math.abs(outgoing.x) + Math.abs(outgoing.z) === 2;
  if (building.kind === 'gate') return a && b ? 'gate-diagonal' : a || b ? 'gate-mixed' : 'gate-cardinal';
  if (a && b) return 'diagonal';
  if (a || b) return 'mixed';
  return incoming.x === -outgoing.x && incoming.z === -outgoing.z ? 'straight' : 'turn';
}

/** Recorre la componente desde la escalera en el sentido heredado de E3b.1. */
export function elevatedRingOf(state: BastionAccessState, bastion: Building, options: ElevatedRingOptions = {}): ElevatedRing {
  const inset = options.lane === 'center' ? 0 : 0.29;
  const access = bastionAccessOf(state, bastion);
  const side = access === null ? null : { x: access.z, z: -access.x } as BastionAccess;
  const empty = (reason: RingBlock): ElevatedRing => ({ access, side, status: 'unavailable', topologyClosed: false,
    geometryReady: false, segments: [], topologyRoute: [], route: [], blocked: { cell: { x: bastion.x, z: bastion.y }, reason } });
  if (access === null || side === null || !stone(bastion, state.buildings) || bastion.kind !== 'bastion') return empty('access');

  const occupied = new Map<string, Building>();
  for (const building of state.buildings.filter(building => standing(building) && defence(building))) {
    if (building.w === 1 && building.h === 1) occupied.set(key({ x: building.x, z: building.y }), building);
  }
  const approved = new Set(options.approvedVariants ?? ['straight']);
  const first = occupied.get(key({ x: bastion.x + side.x, z: bastion.y + side.z }));
  if (first === undefined || !stone(first, state.buildings)) return empty(first === undefined ? 'gap' : 'wood');
  if (neighbours({ x: bastion.x, z: bastion.y }, occupied).length > 2) return empty('branch');

  const ordered: Building[] = [bastion];
  let previous = bastion;
  let current = first;
  let closed = false;
  let blocked: ElevatedRing['blocked'] = null;
  const visited = new Set<number>([bastion.id]);
  while (ordered.length <= occupied.size) {
    if (visited.has(current.id)) { blocked = { cell: { x: current.x, z: current.y }, reason: 'branch' }; break; }
    visited.add(current.id);
    ordered.push(current);
    const at = { x: current.x, z: current.y };
    const edges = neighbours(at, occupied);
    if (edges.length !== 2) { blocked = { cell: at, reason: edges.length > 2 ? 'branch' : 'gap' }; break; }
    const next = edges.filter(edge => edge.building.id !== previous.id);
    if (next.length !== 1) { blocked = { cell: at, reason: 'branch' }; break; }
    const target = next[0]!.building;
    if (target.id === bastion.id) { closed = true; break; }
    if (!stone(target, state.buildings)) { blocked = { cell: { x: target.x, z: target.y }, reason: target.lostTick === null ? 'wood' : 'ruin' }; break; }
    previous = current; current = target;
  }
  if (!closed && blocked === null) blocked = { cell: { x: current.x, z: current.y }, reason: 'branch' };

  const candidates: ElevatedRingSegment[] = [];
  const points = ordered.map((building, index): RingPoint => {
    if (index === 0) return { x: building.x + 0.5 + access.x * 0.08,
      z: building.y + 0.5 + access.z * 0.08, y: 1.02 };
    const after = ordered[index + 1] ?? (closed ? bastion : undefined);
    return routePoint(building, ordered[index - 1]!, after, inset);
  });
  for (let i = 1; i < ordered.length; i += 1) {
    const building = ordered[i]!;
    const before = ordered[i - 1]!;
    const after = ordered[i + 1] ?? (closed ? bastion : undefined);
    if (after === undefined) break;
    const cell = { x: building.x, z: building.y };
    const incoming = { x: before.x - building.x, z: before.y - building.y };
    const outgoing = { x: after.x - building.x, z: after.y - building.y };
    const mask = neighbours(cell, occupied).reduce((sum, edge) => sum | edge.direction.bit, 0);
    const variant = variantOf(building, incoming, outgoing);
    // El corredor interior depende del sentido de marcha, no del centro de
    // pies: en la fábrica nueva el centro coincide con la celda y daría cero.
    const inward = { x: incoming.z - outgoing.z,
      z: outgoing.x - incoming.x };
    const interior = { x: building.x + (Math.abs(inward.x) >= Math.abs(inward.z) ? Math.sign(inward.x) : 0),
      z: building.y + (Math.abs(inward.z) >= Math.abs(inward.x) ? Math.sign(inward.z) : 0) };
    let reason: RingBlock | null = null;
    if (state.works.some(work => work.kind !== 'field'
      && (covers(work, cell) || covers(work, interior)
        || distanceToFootprint(points[i - 1]!, points[i]!, work) < RING_BODY_RADIUS))) reason = 'work';
    else if (state.buildings.some(item => standing(item) && !defence(item) && item.kind !== 'field'
      && (covers(item, interior)
        || distanceToFootprint(points[i - 1]!, points[i]!, item) < RING_BODY_RADIUS))) reason = 'interior';
    else if (options.blockedAt?.(cell) || options.blockedAt?.(interior)) reason = 'obstacle';
    else if (!approved.has(variant)) reason = 'variant';
    candidates.push({ buildingId: building.id, kind: building.kind as ElevatedRingSegment['kind'], cell, mask, variant,
      incoming, outgoing, orientation: Math.atan2(-incoming.z, incoming.x),
      from: points[i - 1]!, to: points[i]!, eligible: reason === null, reason });
  }
  if (closed) {
    const last = ordered.at(-1)!;
    const cell = { x: bastion.x, z: bastion.y };
    const variant: ElevatedRingVariant = 'bastion-return';
    const reason: RingBlock | null = options.blockedAt?.(cell) ? 'obstacle'
      : approved.has(variant) ? null : 'variant';
    candidates.push({ buildingId: bastion.id, kind: 'bastion', cell,
      mask: neighbours(cell, occupied).reduce((sum, edge) => sum | edge.direction.bit, 0),
      variant, incoming: { x: last.x - bastion.x, z: last.y - bastion.y },
      outgoing: { x: first.x - bastion.x, z: first.y - bastion.y },
      orientation: Math.atan2(bastion.y - last.y, last.x - bastion.x),
      from: points.at(-1)!, to: points[0]!, eligible: reason === null, reason });
  }

  const safe: RingPoint[] = [points[0]!];
  for (const candidate of candidates) {
    if (!candidate.eligible) { blocked ??= { cell: candidate.cell, reason: candidate.reason! }; break; }
    safe.push(candidate.to);
  }
  const fallback = bastionWalkwayOf(state, bastion);
  const fallbackClear = fallback !== null && [1, 2].every(distance => {
    const cell = { x: bastion.x + side.x * distance, z: bastion.y + side.z * distance };
    const interior = { x: cell.x + access.x, z: cell.z + access.z };
    return !options.blockedAt?.(cell) && !options.blockedAt?.(interior);
  });
  if (safe.length < 3 && fallbackClear) {
    // La primera junta certificada conserva prioridad mientras faltan nuevas mallas.
    const fallbackRoute = points.slice(0, 3).map((point, index) => index === 0 ? point
      : routePoint(ordered[index]!, ordered[index - 1]!, ordered[index + 1], 0.29));
    return { access, side, status: 'fallback', topologyClosed: closed, geometryReady: false,
      segments: candidates, topologyRoute: closed ? [...points, points[0]!] : points,
      route: fallbackRoute, blocked };
  }
  const geometryReady = closed && candidates.length === ordered.length && candidates.every(segment => segment.eligible);
  return { access, side, status: geometryReady ? 'ready' : safe.length > 1 ? 'partial' : 'unavailable',
    topologyClosed: closed, geometryReady, segments: candidates,
    topologyRoute: closed ? [...points, points[0]!] : points, route: safe, blocked };
}
