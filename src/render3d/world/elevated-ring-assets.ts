import type { ElevatedRing, ElevatedRingSegment, RingCell } from '@derive/elevated-ring';
import { elevatedAssetYaw } from './elevated-orientation';

/** Inventario de fuentes E3b.2; estos identificadores aún no autorizan su publicación. */
export interface RingAssetPlacement {
  readonly asset: string;
  /** El cruce aislado necesita el portón ancho completo bajo el tablero. */
  readonly companionAssets: readonly string[];
  readonly cell: RingCell;
  readonly yaw: number;
  /** Edificios cuya fábrica estática sustituye la pieza. */
  readonly replaces: readonly number[];
  /** El conjunto combinado lleva piedra, pero necesita la hoja con bisagra. */
  readonly gateLeaf: Readonly<{ buildingId: number; asset: string }> | null;
}

export interface RingSeamGap {
  readonly kind: 'anchor66-wall';
  readonly bastionId: number;
  readonly wallId: number;
}

const MIXED_ASSET = new Map<number, string>([
  [130, 'mixed-e-nw-finish'], [66, 'mixed-e-sw-finish'],
  [33, 'mixed-n-se-finish'], [65, 'mixed-n-sw-finish'],
  [20, 'mixed-s-ne-finish'], [132, 'mixed-s-nw-finish'],
  [24, 'mixed-w-ne-finish'], [40, 'mixed-w-se-finish'],
]);

function singleAsset(segment: ElevatedRingSegment): string | null {
  switch (segment.variant) {
    case 'straight': case 'turn': case 'diagonal':
      return `e3b-walltop-finish-${segment.variant}-candidate`;
    case 'mixed': return MIXED_ASSET.get(segment.mask) ?? null;
    case 'gate-mixed':
      return segment.mask === 24 || segment.mask === 65
        ? `e3b-gate-crossing-${segment.mask}-light-finish-candidate` : null;
    case 'bastion-crossing':
      return segment.mask === 24 ? 'e3b-bastion-crossing-24-candidate'
        : segment.mask === 6 ? 'e3b-bastion-turn-candidate' : null;
    case 'bastion-return':
      return segment.mask === 66 ? 'e3b-bastion-anchor-66-candidate' : null;
    default: return null;
  }
}

/**
 * Selecciona la fábrica completa de un anillo candidato. El retorno 66 de la
 * villa 91 comparte piedra con su portón SO: se representa por una sola malla,
 * nunca por dos tableros solapados. No se activa en producción hasta validar
 * los GLB, la hoja articulada y la física de esas mismas piezas.
 */
export function ringCandidateAssetsOf(ring: ElevatedRing): readonly RingAssetPlacement[] | null {
  if (!ring.geometryReady || !ring.topologyClosed) return null;
  const return66 = ring.segments.at(-1);
  const gateBesideReturn = return66?.variant === 'bastion-return' && return66.mask === 66
    ? ring.segments.find(segment => segment.kind === 'gate' && segment.variant === 'gate-mixed'
      && segment.mask === 24 && segment.cell.x === return66.cell.x - 1
      && segment.cell.z === return66.cell.z + 1) : undefined;
  const wallBesideReturn = return66?.variant === 'bastion-return' && return66.mask === 66
    ? ring.segments.find(segment => segment.kind === 'wall' && segment.variant === 'mixed'
      && segment.mask === 24 && segment.cell.x === return66.cell.x - 1
      && segment.cell.z === return66.cell.z + 1) : undefined;
  const placements: RingAssetPlacement[] = [];
  for (const segment of ring.segments) {
    if (segment === gateBesideReturn || segment === wallBesideReturn) continue;
    if (segment === return66 && gateBesideReturn !== undefined) {
      placements.push({ asset: 'e3b-anchor66-gate24-combined-candidate', cell: segment.cell,
        companionAssets: [], yaw: 0, replaces: [segment.buildingId, gateBesideReturn.buildingId],
        gateLeaf: { buildingId: gateBesideReturn.buildingId,
          asset: 'e3b-gate-wide-light-finish-candidate' } });
      continue;
    }
    if (segment === return66 && wallBesideReturn !== undefined) {
      placements.push({ asset: 'e3b-anchor66-wall24-combined-candidate', cell: segment.cell,
        companionAssets: [], yaw: 0, replaces: [segment.buildingId, wallBesideReturn.buildingId],
        gateLeaf: null });
      continue;
    }
    const asset = singleAsset(segment);
    if (asset === null) return null;
    const yaw = ['straight', 'turn', 'diagonal'].includes(segment.variant)
      ? elevatedAssetYaw(segment) : 0;
    if (yaw === null) return null;
    placements.push({ asset, cell: segment.cell,
      companionAssets: segment.variant === 'gate-mixed'
        ? ['e3b-gate-wide-light-finish-candidate'] : [],
      yaw, replaces: [segment.buildingId], gateLeaf: null });
  }
  return placements;
}

/** La fuente combinada de muro sigue sin GLB ni revisión en escena. */
export function unresolvedRingSeams(ring: ElevatedRing): readonly RingSeamGap[] {
  const anchor = ring.segments.at(-1);
  if (anchor?.variant !== 'bastion-return' || anchor.mask !== 66) return [];
  const southwest = ring.segments.find(segment => segment.kind === 'wall'
    && segment.cell.x === anchor.cell.x - 1 && segment.cell.z === anchor.cell.z + 1);
  return southwest === undefined ? [] : [{ kind: 'anchor66-wall',
    bastionId: anchor.buildingId, wallId: southwest.buildingId }];
}

/** Inventario de recursos de la carga atómica; las juntas pendientes se comprueban aparte. */
export function missingRingAssets(placements: readonly RingAssetPlacement[],
  available: ReadonlySet<string>): readonly string[] {
  const required = new Set<string>();
  for (const placement of placements) {
    required.add(placement.asset);
    for (const companion of placement.companionAssets) required.add(companion);
    if (placement.gateLeaf !== null) required.add(placement.gateLeaf.asset);
  }
  return [...required].filter(asset => !available.has(asset)).sort();
}
