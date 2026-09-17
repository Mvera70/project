// Los edificios perdidos son historia. Sólo se dibuja su ruina si el solar
// sigue marcado como tal y ninguna construcción posterior lo ha ocupado.
import type { Building, ValleyMap } from '@engine/state';

export function visibleBuildings(state: { readonly buildings: readonly Building[]; readonly map: ValleyMap }): Building[] {
  const result = state.buildings.filter(building => building.lostTick === null);
  const overlaps = (a: Building, b: Building): boolean => a.x < b.x + b.w && a.x + a.w > b.x
    && a.y < b.y + b.h && a.y + a.h > b.y;
  const ruins = state.buildings.filter(building => building.lostTick !== null)
    .sort((a, b) => (b.lostTick ?? 0) - (a.lostTick ?? 0) || b.id - a.id);
  for (const ruin of ruins) {
    if (result.some(building => overlaps(ruin, building))) continue;
    let remains = true;
    for (let z = ruin.y; z < ruin.y + ruin.h; z += 1) {
      for (let x = ruin.x; x < ruin.x + ruin.w; x += 1) {
        if (state.map.ruins[z * state.map.width + x] !== 1) remains = false;
      }
    }
    if (remains) result.push(ruin);
  }
  return result.sort((a, b) => a.id - b.id);
}
