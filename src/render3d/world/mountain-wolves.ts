// Lobos de las laderas: presencia escénica fuera del mapa jugable.
// No son los lobos del suceso del corral y no afectan a la simulación.
import { hash32 } from '@engine/rng';
import type { ValleyMap } from '@engine/state';
import type { Animal } from '@derive/animals';
import { SKIRT } from './ridge';

const PERIOD = 480;
const CROSSING = 360;
// Dos o tres pasos entre ambos: desde la vista panorámica se leen como manada.
const PACK_DELAY = 2.5;
const PACK_SIZE = 2;
const START_OFFSET = 160;

/** Una pequeña manada cruza uno de los flancos y se pierde en el borde lejano. */
export function mountainWolves(map: ValleyMap, seed: number, seconds: number): Animal[] {
  const wolves: Animal[] = [];
  if (!Number.isFinite(seconds)) return wolves;
  const scenicTime = Math.max(0, seconds) + START_OFFSET;

  for (let member = 0; member < PACK_SIZE; member += 1) {
    const time = scenicTime - member * PACK_DELAY;
    const passage = Math.floor(time / PERIOD);
    const elapsed = time - passage * PERIOD;
    if (elapsed < 0 || elapsed > CROSSING) continue;

    const west = (hash32(seed, `mountain-wolves:side:${passage}`) & 1) === 0;
    const northbound = (hash32(seed, `mountain-wolves:direction:${passage}`) & 1) === 0;
    const phase = hash32(seed, `mountain-wolves:curve:${passage}`) / 4_294_967_296 * Math.PI * 2;
    const from = -SKIRT + 3;
    const to = map.height + SKIRT - 3;
    const travel = elapsed / CROSSING;
    const z = northbound ? to + (from - to) * travel : from + (to - from) * travel;
    // En la falda, junto a los pinos. Nunca entra en una celda jugable.
    const outside = 10.5 + Math.sin(z * 0.055 + phase) * 2 + member * 0.7;
    const x = west ? -outside : map.width + outside;
    wolves.push({ id: 30_000 + member, kind: 'wolf', x, y: z });
  }
  return wolves;
}
