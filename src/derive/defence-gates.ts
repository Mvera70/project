import { BUILDING_RULES } from '@engine/balance';
import { type Building, type ValleyMap } from '@engine/state';
import { walkableTerrain } from '@engine/world/spatial';


/**
 * Por dónde se atraviesa la muralla: el edificio que hace de paso y en qué eje.
 *
 * **A2 · Desde que el portón se construye, el paso es el portón.** Hasta aquí
 * esto elegía una estaca de cada tramo y la declaraba puerta, y esa elección
 * **se movía**: la aldea levanta muralla pieza a pieza, así que el tramo cambia
 * de forma cada pocas semanas y con él la estaca elegida. Es la misma
 * enfermedad que tenía el anillo antes de v3.88 —una defensa recalculada cada
 * vez se pasea— y la misma cura: la aldea lo construye y se queda donde está.
 *
 * Lo derivado que queda es sólo **el eje**, que no es una decisión sino una
 * lectura del terreno: por un portón se pasa por donde hay suelo a los dos
 * lados. Y se conserva la derivación antigua **para el valle que todavía no ha
 * levantado su puerta**: mientras haya muralla y no haya portón, la aldea sigue
 * entrando por donde puede, que es lo que hacía antes de A2.
 */
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
    return walkableTerrain(tile);
  };
  // Los portones de verdad, si los hay. El eje es por donde se pasa: el que
  // tiene suelo pisable a los dos lados. Si los dos ejes valen —una puerta en
  // una esquina— gana `x`, y da igual cuál sea: lo que el render necesita saber
  // es hacia dónde miran las jambas.
  const built = state.buildings.filter((b) => b.lostTick === null && b.kind === 'gate');
  if (built.length > 0) {
    for (const gate of built) {
      const open = (['x', 'z'] as const).find((axis) => {
        const dx = axis === 'x' ? 1 : 0;
        const dz = axis === 'z' ? 1 : 0;
        return free(gate.x - dx, gate.y - dz) && free(gate.x + dx, gate.y + dz);
      });
      gates.set(gate.id, open ?? 'x');
    }
    return gates;
  }

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
    if (component.length < BUILDING_RULES.GATE_MIN_RUN) continue;
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
