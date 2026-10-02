// K8 · Los tablones de la herrería y de la iglesia (2 oct 2026).
//
// El mismo tablón que el de la plaza (`notice-board.ts`, §7.15), clavado en la
// fachada del edificio que mira a la plaza: así se ve de qué edificio es y la
// gente no tiene que rodearlo, porque queda dentro de la huella del edificio,
// que ya está cerrada al paso. Dónde está lo dice esto y nada más, para que el
// render lo dibuje y lo toque en el mismo sitio.

import type { Building, GameState } from '@engine/state';
import { plazaOf } from './plaza';
import { visibleBuildings } from './visible-buildings';

/** De qué es cada tablón: el de misiones de la plaza, el de la fragua y el de la capilla. */
export type BoardWhich = 'plaza' | 'smithy' | 'church';

export interface BuildingBoardPlace {
  readonly which: Exclude<BoardWhich, 'plaza'>;
  readonly buildingId: number;
  readonly x: number;
  readonly z: number;
  /** Giro en Y para que la cara (+Z del modelo) mire hacia la plaza. */
  readonly yaw: number;
}

/** TUNE visual: cuánto se mete el tablón dentro de la huella, desde su borde, en celdas. */
const INSET = 0.18;

function onFacade(b: Building, plaza: { x: number; y: number }): { x: number; z: number; yaw: number } {
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  const dx = plaza.x - cx, dz = plaza.y - cz;
  // La fachada que mira a la plaza: la del eje en que la plaza está más lejos.
  if (Math.abs(dx) / b.w >= Math.abs(dz) / b.h) {
    const x = dx >= 0 ? b.x + b.w - INSET : b.x + INSET;
    return { x, z: cz, yaw: dx >= 0 ? Math.PI / 2 : -Math.PI / 2 };
  }
  const z = dz >= 0 ? b.y + b.h - INSET : b.y + INSET;
  return { x: cx, z, yaw: dz >= 0 ? 0 : Math.PI };
}

/** Los tablones de los edificios que los tienen en pie: la herrería y la capilla (o iglesia). */
export function buildingBoardsOf(state: Pick<GameState, 'buildings' | 'map' | 'plaza'>): BuildingBoardPlace[] {
  const plaza = plazaOf(state as GameState);
  const standing = visibleBuildings(state);
  const out: BuildingBoardPlace[] = [];
  const smithy = standing.find((b) => b.kind === 'smithy');
  if (smithy !== undefined) out.push({ which: 'smithy', buildingId: smithy.id, ...onFacade(smithy, plaza) });
  const chapel = standing.find((b) => b.kind === 'church') ?? standing.find((b) => b.kind === 'chapel');
  if (chapel !== undefined) out.push({ which: 'church', buildingId: chapel.id, ...onFacade(chapel, plaza) });
  return out;
}
