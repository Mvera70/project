// V-06 · De la vida al reparto que el render ya sabe pintar. Anexo E.
//
// El puente entre la capa de vida y `Cast`, que es lo que pone los modelos en
// la escena. Existe para que la aldea viva se pueda ver **con los modelos y las
// escalas de verdad** sin tocar el render: el banco pinta cada celda como un
// cubo y una casa de dos por dos sale como cuatro bloques pegados, que es
// imposible de juzgar.
//
// **Desde V-12 es el camino único.** La capa vieja —`actors/index.ts`, una
// función que evaluaba una curva del reloj— ya no existe, y con ella se fue la
// bandera que permitía volver a ella.

import { indoors } from './home';
import { occupationOf } from '../world/models';
import type { VillagerId } from '@engine/state';
import type { Activity, Actor } from '../contracts';
import type { ClipName } from '../clips';
import { clipTime } from '../clips';
import type { Prop } from './props';
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
  if (moving) return dweller.holding !== null ? 'carry_walk' : 'walk';
  if (talkingOf(dweller)) return 'talk';
  if (dweller.scene === null && dweller.doing?.there === true
    && (dweller.residence === undefined || dweller.residence.stage === 'day')) {
    const action = dweller.doing.offer.id, place = dweller.doing.place.id;
    if (action === 'work') return place.startsWith('field:') ? 'work_hoe' : place.startsWith('felling:') ? 'chop'
      : place.startsWith('granary:') || place.startsWith('mill:') ? 'sort' : 'hammer';
    if (action === 'deliver' || action === 'deliver-stone') return 'sort';
    if (action === 'sit') return 'sit';
    if (action === 'pray') return 'pray';
    if (action === 'drink') return 'drink';
    if (action === 'play') return 'play';
  }
  return 'idle';
}

/** Y qué actividad, de las cinco que el render conoce. */
function activityOf(dweller: Dweller, moving: boolean): Activity {
  if (moving) return 'walking';
  if (dweller.scene !== null || dweller.doing === null) return 'resting';
  return dweller.doing.there && ['work', 'deliver'].includes(dweller.doing.offer.id) ? 'working' : 'resting';
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
  return dweller.scene !== null && dweller.scene.kind === 'chat' && roleOf(dweller) === 'peer' && dweller.scene.beat > 0;
}

/**
 * IA-6 · Si está en la riña de la plaza.
 *
 * `Dweller.quarrel` lo pone `village.ts` con los dos `id` que el motor guardó
 * en `happenings[].who` (§7.10), así que esto es un hecho real y no una
 * inferencia. Va aparte de `talkingOf` porque **nadie del render lo leía**: la
 * riña se montaba, se movía y terminaba, y se veía igual que dos vecinos
 * charlando. Ya existía el icono (`quarrel` en `effects/bubbles.ts`), pero lo
 * disparaba `derive/moods.ts` por rencores viejos, que es otra cosa: un rencor
 * es un estado y esto es un suceso.
 */
function arguingOf(dweller: Dweller): boolean {
  return (dweller.quarrel ?? null) !== null;
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
    if (indoors(dweller)) continue;
    const { body } = dweller;
    const speed = dweller.motionSpeed ?? Math.hypot(body.vx, body.vz);
    const moving = speed > 0.05;
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
      load: dweller.holding !== null && dweller.holding <= -1_000_000 ? 'stone'
        : dweller.holding !== null && dweller.holding < 0 ? 'bundle' : null,
      poseSeconds: seconds,
      // El clip de andar lo mueve el suelo recorrido (G-04); los de estarse
      // quieto, el reloj, con un desfase por persona para que ochenta vecinos
      // no respiren a la vez.
      clipSeconds: clipTime(clip, dweller.travelled, seconds, (dweller.villager % 11) / 11),
      travelled: dweller.travelled,
      cell: cellZ * width + cellX,
      named: named.has(dweller.villager),
      age: ages.get(dweller.villager) ?? 30,
      // **Sólo una escena de verdad.** Aquí había además «o está en una oferta
      // de cotilleo», que contradecía el comentario de `talkingOf` tres
      // párrafos arriba —«`talking` sale de la escena, no de la oferta»— y se
      // vio en la primera captura de G-13: **doce de veinte aldeanos llevaban
      // nube de diálogo a la vez**, porque el corro de cotilleo tiene plazas
      // para media aldea y estar sentado en una no es estar hablando. Una señal
      // que marca al 60 % de la gente no señala a nadie (§11.1.1).
      talking: talkingOf(dweller) && !moving && dweller.scene !== null
        && Math.floor((life.steps - dweller.scene.since) / 54) % 2 === (body.id === dweller.scene.a ? 0 : 1),
      arguing: arguingOf(dweller),
      // La figura del oficio permanece durante el trayecto y los descansos.
      occupation: dweller.dayPlan?.job !== null && dweller.dayPlan?.job !== undefined
        ? occupationOf(dweller.dayPlan.job.place, dweller.dayPlan.job.offer)
        : dweller.dayPlan === undefined && dweller.doing?.there === true ? occupationOf(dweller.doing.place.id, dweller.doing.offer.id) : null,
      // El cargo real llega al selector de modelo.
      role: dweller.dayPlan?.role ?? null,
    });
  }
  return actors;
}

/**
 * Un trasto, listo para pintarse: dónde está y quién lo lleva. V-09.
 *
 * `props.ts` sólo sabe de cuerpos —`held` es un id de cuerpo, para no
 * conocer `VillagerId` (E.3: la vida no toca el motor)—; traducir ese id al
 * `VillagerId` que el render sabe pintar es justo el trabajo de este fichero,
 * el mismo que ya hace `castOf` con `dweller.villager`.
 *
 * `Props` dibuja los que están en el suelo. Los que van en la mano se traducen
 * también aquí para que `Cast` equipe el recurso sobre el hueso correspondiente.
 */
export interface PropSighting {
  readonly id: number;
  readonly kind: Prop['kind'];
  readonly x: number;
  readonly z: number;
  readonly y: number;
  /** Quién lo lleva ahora, o nada si está por el suelo. */
  readonly heldBy: VillagerId | null;
}

/** Los trastos de esta jornada, tal como el render los necesitaría. Puro,
 *  igual que `castOf`: no toca la vida ni el estado, sólo los traduce. */
export function propsOf(life: Village): PropSighting[] {
  const byBody = new Map(life.dwellers.map((dweller) => [dweller.body.id, dweller.villager]));
  return life.props.map((prop) => ({
    id: prop.id,
    kind: prop.kind,
    x: prop.x,
    z: prop.z,
    y: prop.y,
    heldBy: prop.held === null ? null : byBody.get(prop.held) ?? null,
  }));
}
