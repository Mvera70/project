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

import { visiting } from './visitors';
import { indoors } from './home';
import { occupationOf } from '../world/models';
import type { ArrowSighting } from '../world/arrows';
import type { VillagerId } from '@engine/state';
import type { Activity, Actor } from '../contracts';
import type { ClipName } from '../clips';
import { clipTime } from '../clips';
import { LIFE_STEP } from './clock';
import { meleePose } from './melee';
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
  // E1: huir no es un gesto de combate. Lo mueve el suelo recorrido y sólo se
  // enseña mientras el cuerpo avanza; al refugiarse vuelve a `idle`.
  if (dweller.flight?.sheltered === true) return 'idle';
  if (moving && dweller.flight !== null && dweller.flight !== undefined) return 'flee';
  if (moving) return dweller.holding !== null ? 'carry_walk' : 'walk';
  if (talkingOf(dweller)) return 'talk';
  if (dweller.scene === null && dweller.doing?.there === true
    && (dweller.residence === undefined || dweller.residence.stage === 'day')) {
    const action = dweller.doing.offer.id, place = dweller.doing.place.id;
    if (action.startsWith('prepare')) return 'sort';
    if (action === 'harvest') return 'sort';
    // E4 · la brigada de cubos contra el fuego.
    if (action === 'douse') return 'douse';
    // El valle más vivo · sentados a comer y al fuego de la noche.
    if (action === 'meal' || action === 'hearth') return 'sit';
    // IA-fields · en el campo, el gesto de la fase: horca, voleo o azada.
    const task = dweller.doing.place.task;
    if (action === 'work' && place.startsWith('field:')) return task === 'spread' ? 'spread' : task === 'sow' ? 'sow' : 'work_hoe';
    if (action === 'work') return place.startsWith('field:') ? 'work_hoe' : place.startsWith('felling:') ? 'chop'
      : place.startsWith('quarry:') ? 'mine'
        : place.startsWith('granary:') || place.startsWith('mill:') ? 'sort' : 'hammer';
    if (action.startsWith('deliver')) return 'sort';
    if (action === 'sit') return 'sit';
    if (action === 'pray') return 'pray';
    if (action === 'drink') return 'drink';
    // El valle más vivo · con lluvia, encogido bajo el alero.
    if (action === 'shelter') return 'shelter';
    if (action === 'play') return 'play';
  }
  return 'idle';
}

/** Y qué actividad, de las cinco que el render conoce. */
function activityOf(dweller: Dweller, moving: boolean): Activity {
  if (moving) return 'walking';
  if (dweller.scene !== null || dweller.doing === null) return 'resting';
  return dweller.doing.there
    && (dweller.doing.offer.id === 'work' || dweller.doing.offer.id === 'harvest'
      || dweller.doing.offer.id.startsWith('deliver') || dweller.doing.offer.id.startsWith('prepare')) ? 'working' : 'resting';
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
  // `steps` cuenta los pasos terminados; el último hecho lleva índice steps-1.
  const combatSeconds = Math.max(0, life.steps - 1) * LIFE_STEP;
  const actors: Actor[] = [];
  for (const dweller of life.dwellers) {
    if (indoors(dweller)) continue;
    const { body } = dweller;
    const speed = dweller.motionSpeed ?? Math.hypot(body.vx, body.vz);
    const moving = speed > 0.05;
    const combat = dweller.combat;
    const clip = combat?.clip ?? clipOf(dweller, moving);
    const cellX = Math.max(0, Math.min(width - 1, Math.floor(body.x)));
    const cellZ = Math.max(0, Math.min(life.land.height - 1, Math.floor(body.z)));
    actors.push({
      id: dweller.villager,
      x: body.x,
      z: body.z,
      ...(body.y === undefined ? {} : { y: body.y }),
      facing: combat?.facing ?? body.facing,
      activity: activityOf(dweller, moving),
      clip,
      load: dweller.holding !== null && dweller.holding <= -2_000_000 ? 'grain'
        : dweller.holding !== null && dweller.holding <= -1_000_000 ? 'stone'
        : dweller.holding !== null && dweller.holding < 0 ? 'bundle' : null,
      poseSeconds: seconds,
      // El clip de andar lo mueve el suelo recorrido (G-04); los de estarse
      // quieto, el reloj, con un desfase por persona para que ochenta vecinos
      // no respiren a la vez.
      clipSeconds: combat === undefined
        ? clipTime(clip, dweller.travelled, seconds, (dweller.villager % 11) / 11)
        : clipTime(clip, 0, combatSeconds, 0, combat.since * LIFE_STEP),
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

  // D3 · **Y la partida del valle vecino, si hoy hay una** (§1b, fase 4).
  //
  // Entran por aquí y no por `dwellers` porque no son vecinos: no tienen
  // `VillagerId`, ni casa, ni necesidades, ni oficio. Lo único que comparten
  // con la gente del valle es que son cuerpos que andan, y eso es exactamente
  // lo que un `Actor` describe.
  //
  // E2 · El clan vecino no es el forastero civil del valle. La identidad de
  // presentación lo expresa sin contaminar `Role` ni el estado del juego; la
  // cadena conserva `villager-stranger` y `villager` como respaldos mientras
  // el recurso nuevo aún no esté disponible.
  for (const raider of life.raiders) {
    if (raider.phase === 'gone') continue;
    const { body } = raider;
    const speed = Math.hypot(body.vx, body.vz);
    const moving = speed > 0.05;
    const melee = meleePose(raider, Math.max(0, life.steps - 1));
    const clip = raider.phase === 'down' ? 'fall'
      : melee !== null ? melee.clip
        : raider.phase === 'breaking' && raider.blowAt !== undefined ? 'gate_strike'
          // D6 · el saqueo tiene cuerpo: remover/cargar ante el edificio y
          // volver con el bulto en la mano. No se concede la carga durante el
          // camino de ida; `sack.ts` sólo la pone al completar el gesto.
          : raider.phase === 'sacking' ? 'sort'
             : moving ? raider.load === null || raider.load === undefined ? 'walk' : 'carry_walk' : 'idle';
    const since = clip === 'fall' ? raider.downAt ?? 0 : melee?.since ?? raider.blowAt ?? 0;
    const cellX = Math.max(0, Math.min(width - 1, Math.floor(body.x)));
    const cellZ = Math.max(0, Math.min(life.land.height - 1, Math.floor(body.z)));
    actors.push({
      id: body.id,
      x: body.x,
      z: body.z,
      ...(body.y === undefined ? {} : { y: body.y }),
      facing: raider.phase === 'down' ? raider.meleeFacing ?? body.facing : melee?.facing ?? body.facing,
      // Andando o plantado. `walking`/`resting` son las dos únicas actividades
      // que un forastero puede tener: no trabaja, no vuelve a casa y no tiene
      // casa a la que volver.
      activity: moving ? 'walking' : 'resting',
      clip,
      load: raider.load ?? null,
      poseSeconds: seconds,
      clipSeconds: clipTime(clip, raider.travelled ?? 0, combatSeconds, 0,
        clip === 'fall' || clip === 'gate_strike' || melee !== null ? since * LIFE_STEP : undefined),
      travelled: raider.travelled ?? 0,
      cell: cellZ * width + cellX,
      named: false,
      age: 30,
      talking: false,
      arguing: false,
      occupation: null,
      role: 'stranger',
      visualIdentity: 'neighbor',
    });
  }

  // El valle más vivo · Y los que vienen por el camino (`visitors.ts`): el
  // buhonero y los tratantes con su fardo, el forastero con las manos vacías.
  // Éstos sí son el `stranger` civil, así que sin identidad de vecino.
  for (const visitor of life.visitors) {
    if (!visiting(visitor)) continue;
    const { body } = visitor;
    const moving = Math.hypot(body.vx, body.vz) > 0.05;
    // Con mula, la carga va a lomos y él lleva el ramal: anda con las manos
    // libres. Sólo carga él mismo el que viene a vender sin mula.
    const carries = visitor.pack && visitor.beast === null;
    const clip = moving ? carries ? 'carry_walk' : 'walk' : 'idle';
    const cellX = Math.max(0, Math.min(width - 1, Math.floor(body.x)));
    const cellZ = Math.max(0, Math.min(life.land.height - 1, Math.floor(body.z)));
    actors.push({
      id: body.id,
      x: body.x,
      z: body.z,
      facing: body.facing,
      activity: moving ? 'walking' : 'resting',
      clip,
      load: carries && moving ? 'bundle' : null,
      poseSeconds: seconds,
      clipSeconds: clipTime(clip, visitor.travelled, seconds, 0),
      travelled: visitor.travelled,
      cell: cellZ * width + cellX,
      named: false,
      age: 40,
      // Plantado en la plaza, charla: es a lo que ha venido.
      talking: visitor.phase === 'staying',
      arguing: false,
      occupation: null,
      role: 'stranger',
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
/**
 * D2b · Las flechas de la jornada, para quien las dibuja.
 *
 * Sale de aquí y no del renderer por lo mismo que `propsOf`: el renderer no
 * conoce la capa de vida por dentro. Se listan **todas las que están en el
 * mundo**, volando y clavadas: una flecha clavada en el suelo junto al portón es
 * la marca de que ahí hubo una pelea, y se retira cuando la arquería la retira
 * (`ARROW_LIFE`).
 */
export function arrowsOf(life: Village): ArrowSighting[] {
  return life.arrows.map((arrow, index) => {
    const at = arrow.body.at;
    const velocity = arrow.body.velocity;
    return {
      // El identificador es el orden en que se soltaron: estable dentro de la
      // jornada, que es todo lo que un objeto de esta capa necesita (E.2).
      id: index,
      x: at.x, y: at.y, z: at.z,
      vx: velocity.x, vy: velocity.y, vz: velocity.z,
    };
  });
}

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
