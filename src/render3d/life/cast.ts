// V-06 · De la vida al reparto que el render ya sabe pintar. Anexo E.
//
// El puente entre la capa de vida y `Cast`, que es lo que pone los modelos en
// la escena. Existe para que la aldea viva se pueda ver **con los modelos y las
// escalas de verdad** sin tocar el render: el banco pinta cada celda como un
// cubo y una casa de dos por dos sale como cuatro bloques pegados, que es
// imposible de juzgar.
//
// Es la pieza que V-12 convertirá en el camino único cuando se retire la capa
// vieja. Hasta entonces convive con ella detrás de una bandera.

import type { VillagerId } from '@engine/state';
import type { Actor } from '../actors';
import type { ClipName } from '../actors/clips';
import { clipTime } from '../actors/clips';
import type { Activity } from '../actors/day';
import type { Dweller, Village } from './village';

/**
 * Qué clip le toca a lo que uno está haciendo.
 *
 * V-07: **el clip también sale de la escena**, no sólo de la oferta. Mientras
 * dura, lo que `doing` recuerde queda en pausa (`village.ts` no lo toca) y
 * puede ser un tajo a medias; sin este primer corte, alguien parado a media
 * charla seguiría cavando con la azada.
 */
function clipOf(dweller: Dweller, moving: boolean): ClipName {
  if (moving) return 'walk';
  if (dweller.scene === null && dweller.doing?.there === true
    && dweller.doing.offer.id === 'work') return 'work_hoe';
  return 'idle';
}

/** Y qué actividad, de las cinco que el render conoce. */
function activityOf(dweller: Dweller, moving: boolean): Activity {
  if (moving) return 'walking';
  if (dweller.scene !== null || dweller.doing === null) return 'resting';
  return dweller.doing.offer.id === 'work' ? 'working' : 'resting';
}

/**
 * El papel de éste en su propia escena, si tiene una. V-07.
 *
 * `Scene` guarda `roleA`/`roleB` por posición (`scene.a`/`scene.b`, ids de
 * cuerpo), no por persona: hay que mirar de qué lado está éste.
 */
function roleOf(dweller: Dweller): 'gives' | 'takes' | 'peer' | null {
  const { scene } = dweller;
  if (scene === null) return null;
  return dweller.body.id === scene.a ? scene.roleA : scene.roleB;
}

/**
 * Si esto se lee como una charla, y no como un empujón o un rechazo.
 *
 * V-07: **`talking` sale de la escena**, no de la oferta de cotilleo. Sólo un
 * `chat` con los dos de igual a igual —`peer`— es una conversación de verdad:
 * un `chat` con `gives`/`takes` es el rechazo, «apartar la vista y seguir», y
 * eso no lleva nube de diálogo encima porque no ha habido diálogo.
 */
function talkingOf(dweller: Dweller): boolean {
  return dweller.scene !== null && dweller.scene.kind === 'chat' && roleOf(dweller) === 'peer';
}

/**
 * El reparto de esta jornada, tal como el render lo espera.
 *
 * Puro: no toca la vida ni el estado, sólo los traduce. Se llama una vez por
 * fotograma, después de que la vida haya dado sus pasos.
 */
export function castOf(
  life: Village,
  seconds: number,
  ages: ReadonlyMap<VillagerId, number>,
  named: ReadonlySet<VillagerId>,
): Actor[] {
  const width = life.land.width;
  const actors: Actor[] = [];
  for (const dweller of life.dwellers) {
    const { body } = dweller;
    const speed = Math.hypot(body.vx, body.vz);
    const moving = speed > 0.25;
    const clip = clipOf(dweller, moving);
    const cellX = Math.max(0, Math.min(width - 1, Math.floor(body.x)));
    const cellZ = Math.max(0, Math.min(life.land.height - 1, Math.floor(body.z)));
    actors.push({
      id: dweller.villager,
      x: body.x,
      z: body.z,
      facing: body.facing,
      activity: activityOf(dweller, moving),
      clip,
      // El clip de andar lo mueve el suelo recorrido (G-04); los de estarse
      // quieto, el reloj, con un desfase por persona para que ochenta vecinos
      // no respiren a la vez.
      clipSeconds: clipTime(clip, dweller.travelled, seconds, (dweller.villager % 11) / 11),
      travelled: dweller.travelled,
      cell: cellZ * width + cellX,
      named: named.has(dweller.villager),
      age: ages.get(dweller.villager) ?? 30,
      talking: talkingOf(dweller)
        || (dweller.doing?.there === true && dweller.doing.offer.id === 'gossip'),
    });
  }
  return actors;
}
