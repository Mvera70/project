import { TERRAIN_CODE, type Building, type ValleyMap } from '@engine/state';

/** Un portón por recinto conectado. Se conserva el edificio y su defensa;
 * sólo se deriva el paso físico. Prioridad a caminos existentes y tramos rectos. */
export function defenceGates(state: { buildings: readonly Building[]; map: ValleyMap }): ReadonlyMap<number, 'x' | 'z'> {
  const walls = state.buildings.filter(b => b.lostTick === null && (b.kind === 'wall' || b.kind === 'palisade'));
  const cells = new Map(walls.map(b => [b.y * state.map.width + b.x, b]));
  const visited = new Set<number>();
  const gates = new Map<number, 'x' | 'z'>();
  const solid = new Set<number>();
  for (const b of state.buildings) {
    if (b.lostTick !== null || ['field', 'grave_yard'].includes(b.kind)) continue;
    for (let z = b.y; z < b.y + b.h; z++) for (let x = b.x; x < b.x + b.w; x++) solid.add(z * state.map.width + x);
  }
  const free = (x: number, z: number): boolean => {
    if (x < 0 || z < 0 || x >= state.map.width || z >= state.map.height || solid.has(z * state.map.width + x)) return false;
    // Se usa la misma lista de agua y roca que la navegación de vida.
    const tile = state.map.terrain[z * state.map.width + x];
    return tile !== TERRAIN_CODE.water && tile !== TERRAIN_CODE.rock
      && tile !== TERRAIN_CODE.mountain && tile !== TERRAIN_CODE.lake;
  };
  for (const wall of walls) {
    if (visited.has(wall.id)) continue;
    const component = [wall]; visited.add(wall.id);
    for (let n = 0; n < component.length; n++) {
      const b = component[n]!;
      for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        if (b.x + dx! < 0 || b.x + dx! >= state.map.width || b.y + dz! < 0 || b.y + dz! >= state.map.height) continue;
        const neighbour = cells.get((b.y + dz!) * state.map.width + b.x + dx!);
        if (neighbour !== undefined && !visited.has(neighbour.id)) { visited.add(neighbour.id); component.push(neighbour); }
      }
    }
    const options = component.flatMap(b => (['x', 'z'] as const).flatMap(axis => {
      const dx = axis === 'x' ? 1 : 0, dz = axis === 'z' ? 1 : 0;
      if (!free(b.x - dx, b.y - dz) || !free(b.x + dx, b.y + dz)) return [];
      const wear = (state.map.path[(b.y - dz) * state.map.width + b.x - dx] ?? 0)
        + (state.map.path[(b.y + dz) * state.map.width + b.x + dx] ?? 0);
      return [{ b, axis, wear }];
    })).sort((a, b) => b.wear - a.wear || a.b.id - b.b.id);
    const chosen = options[0];
    if (chosen !== undefined) gates.set(chosen.b.id, chosen.axis);
  }
  return gates;
}
