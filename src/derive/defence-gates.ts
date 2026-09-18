import { TERRAIN_CODE, type Building, type ValleyMap } from '@engine/state';

/**
 * Cuántas piezas de muralla tiene que tener un tramo para merecer un portón.
 *
 * TUNE: tres, o sea nueve metros de muralla (D.6.2). **Y el número sale de un
 * defecto que el dueño del diseño vio en una captura**, el 18 sep 2026: «veo
 * que hay puertas que se colocan solas sin muralla al lado, no debería pasar».
 * Tenía razón, y la causa era esta función: daba un portón **por cada tramo
 * conectado**, y la aldea levanta la empalizada pieza a pieza a lo largo de la
 * envolvente (§7.4), así que un trozo suelto de una sola pieza también contaba
 * como recinto.
 *
 * Medido en cuatro semillas al año 60: **de 6 a 17 portones por valle, y de 5 a
 * 11 de ellos en tramos de una sola pieza** —una puerta de pie en la hierba, sin
 * nada a los lados—. Con el mínimo en tres, la semilla 41 pasa de 17 portones a
 * 5, y los que quedan están todos en un tramo por el que de verdad hay que
 * pasar. Una puerta pertenece a una muralla: por un tramo de una o dos piezas se
 * da la vuelta andando.
 */
const GATE_MIN_RUN = 3;

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
    // Un tramo corto no lleva portón: no hay recinto que abrir y lo que se veía
    // era una puerta suelta en medio del prado (ver `GATE_MIN_RUN`).
    if (component.length < GATE_MIN_RUN) continue;
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
