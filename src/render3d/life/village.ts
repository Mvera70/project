// V-06 · La aldea viva, entera. design.md Anexo E.
//
// Aquí se juntan las seis fases: el reloj de paso fijo (V-01), los cuerpos que
// ocupan sitio (V-02), la navegación (V-03), lo que a cada uno le pide el
// cuerpo (V-04), lo que el mundo ofrece (V-05) y la elección (V-06).
//
// **Un paso de esta función es un instante del valle.** Todo lo que pase en
// pantalla sale de aquí, y nada de aquí sale del reloj de la pared ni escribe
// una coma en `GameState`.

import type { GameState, Trait, VillagerId } from '@engine/state';
import { FOOD } from '@engine/balance';
import { population } from '@engine/people/demography';
import { opinionOf } from '@engine/people/opinions';
import { hash32 } from '@engine/rng';
import { blockedAt, integrate, turnTo, type Body, type Terrain } from './body';
import { meetingPlace, ordersOf } from './staging';
import { createNeighbourhood, type Neighbourhood } from './grid';
import { avoid, drive, resolve, seek, separate } from './steering';
import { createRouter, follow, type Router } from './navigate';
import { canReach, reachableFrom, terrainOf } from './terrain';
import { drift, freshNeeds, type Doing, type Needs } from './needs';
import { OFFERS, placesOf, seatAt, seatKey, type Offer, type Place } from './offers';
import { commons } from './places';
import { decide, satisfy, RETHINK, type Intent } from './decide';
import { alive as sceneAlive, play, propose, SCENE_COOLDOWN, SCENE_EARSHOT, type Scene } from './scenes';
import { LIFE_STEP, seedOfDay } from './clock';
import { createBeasts, stepBeasts, type Beast } from './beasts';
import {
  carryAt, drop, findMate, fling, LOFT, PLAYED_OUT, propPlaces, PROP_PLACE_PREFIX,
  REST_AFTER_THROW, scatter, settle, take, THROW, THROW_AHEAD, type Prop,
} from './props';

/**
 * Lo que se aguanta yendo a un sitio antes de pensárselo otra vez, en pasos.
 *
 * TUNE: 600, veinte segundos escénicos. Cruzar el valle entero son unos quince,
 * así que esto sólo salta cuando algo ha salido mal: el sitio se llenó mientras
 * se iba, o hay medio pueblo cortando el paso.
 */
const GIVE_UP = 600;

/**
 * A qué distancia se coge un pase sin pasar por `decide`. V-09b.
 *
 * El número lo da el brief tal cual («a menos de dos celdas de ese cuerpo»),
 * no una medida: es el umbral con el que `fling` ya tira —`THROW` manda la
 * pelota a por lo menos varias celdas— así que un receptor que se ha quedado
 * quieto donde estaba cuando se la tiraron cae dentro sin más ajuste.
 */
const CATCH_RANGE = 2;

/** Una persona, entera: cuerpo, cabeza y lo que está haciendo. */
export interface Dweller {
  readonly body: Body;
  readonly villager: VillagerId;
  readonly traits: readonly Trait[];
  readonly needs: Needs;
  doing: Intent | null;
  /** En qué paso le toca replantearse la vida. Escalonado, no todos a la vez. */
  rethinkAt: number;
  /**
   * Suelo recorrido desde que empezó a andar, en celdas.
   *
   * Lo que mueve el clip de la zancada (G-04): la animación avanza con el suelo
   * que se pisa, no con el reloj, y por eso los pies no patinan. Se pone a cero
   * al pararse, que es cuando empieza otra caminata.
   */
  travelled: number;
  /**
   * Con quién tiene algo ahora mismo, si tiene. V-07.
   *
   * El mismo objeto vive en los dos `Dweller` que participan: no hay copia,
   * hay referencia compartida, que es lo que le deja a `alive()` comprobar por
   * `id` de cuerpo en vez de llevar la cuenta por separado.
   */
  scene: Scene | null;
  /** Hasta qué paso no le apetece volver a pararse con nadie, tras la última
   *  escena. V-07, ported de `spike/life.ts` (`cooldown`). */
  sceneCooldownUntil: number;
  /**
   * V-09: qué trasto lleva en la mano ahora mismo, si lleva alguno. Id de
   * `Prop`, no de cuerpo.
   *
   * La cabaña (`beasts.ts`, V-08) no coge nada y lo lleva siempre a `null`:
   * mejor un campo obligatorio que nunca cambia que uno opcional que obliga a
   * preguntar `?? null` en cada uso, que es lo que hacía la primera versión.
   */
  holding: number | null;
  /** V-09: a quién apunta mientras espera para tirar lo que lleva. Id de
   *  cuerpo. */
  aimAt: number | null;
  /**
   * V-09b: hasta qué instante escénico no le apetece volver a jugar, tras el
   * último pase. Ported de spike (`playedUntil`, `PLAYED_OUT` en `props.ts`).
   *
   * Obligatorio, como `holding`/`aimAt` (E.3.7 aprendido en la primera
   * versión de V-09: un campo opcional obliga a preguntar `?? 0` en cada
   * lectura). La cabaña (`beasts.ts`) no juega nunca y lo lleva a `0` para
   * siempre.
   */
  playedUntil: number;
}

/**
 * Un pase, para poder medir una cadena. V-09b.
 *
 * `to` es nada cuando se tiró hacia delante por gusto porque no había con
 * quién jugar (`THROW_AHEAD`): eso cuenta como pase pero no puede ser parte
 * de una cadena, porque no hay un segundo cuerpo al que seguirle la pista.
 */
export interface PassRecord {
  readonly from: number;
  readonly to: number | null;
  readonly step: number;
}

export interface Village {
  readonly land: Terrain;
  readonly places: readonly Place[];
  readonly dwellers: readonly Dweller[];
  /** La cabaña, V-08: gallinas, cerdos y vacas, con el mismo trato que la gente. */
  readonly beasts: readonly Beast[];
  /** Los trastos de la jornada, V-09: la pelota, el palo, el cubo, el haz de
   *  leña. Repartidos al amanecer con la semilla del día (`scatter`), y como
   *  el resto de esta capa, no sobreviven a la jornada. */
  readonly props: readonly Prop[];
  /** Un paso de vida para todos. */
  step(): void;
  /** Cuántos pasos lleva la jornada. */
  readonly steps: number;
  /** Pases de pelota dados en la jornada, V-09: lo que sale de jugar. */
  readonly passes: number;
  /** Cada pase, en orden, con quién lo dio y a quién iba. V-09b: lo que hace
   *  falta para medir una cadena — `passes` sólo da el total. */
  readonly passLog: readonly PassRecord[];
  /** Qué está haciendo la aldea ahora, para poder contarlo. */
  tally(): Record<string, number>;
}

/**
 * Monta la aldea de una jornada sobre el estado del motor.
 *
 * El estado llega **congelado** (§D.6.7): lo que el motor decida durante el día
 * entra mañana. Aquí no se lee nada que pueda cambiar a media jornada.
 */
/**
 * Lo que una jornada puede llevar además de la gente y la cabaña.
 *
 * `props` son los trastos de V-09 —la pelota, el palo, el cubo, el haz—, y
 * **en el juego van apagados** (15 sep 2026). Eran el descarte de físicas de
 * `spike/life.ts` portado tal cual, y el dueño del diseño lo dijo sin rodeos:
 * «esas pelotas eran de prueba, ahora mismo no tiene ningún sentido que haya
 * pelotas por ahí, además están atravesando el suelo». Tenía razón en las dos
 * cosas. La maquinaria se queda —se prueba con esta opción encendida— por si
 * algún día un trasto tiene sentido en su sitio: un cubo junto al pozo, un haz
 * junto a la leñera. Repartidos por el prado, no.
 */
export interface DayOptions {
  readonly props?: boolean;
}

export function createVillage(state: GameState, day: number, options: DayOptions = {}): Village {
  const land = terrainOf(state);
  const seed = seedOfDay(state.seed, day);
  // V-11 · **Y lo que el motor haya ordenado para hoy manda sobre todo esto.**
  //
  // Si una decisión del jugador convocó a la aldea (§11.8), el sitio de la
  // reunión **sustituye** a los destinos del día en vez de competir con ellos, y
  // eso es deliberado: es lo que hacía el camino viejo que G-12 apagó —«el día
  // que había reunión, nadie iba al tajo y todos compartían destino»— y es lo
  // único que cumple el principio 1 del juego, que toda opción de encrucijada
  // cambie algo en pantalla. Compitiendo no se cumple: medido en la prueba de
  // V-11, con la reunión como una oferta más el más lejano se quedaba a más de
  // tres celdas y la mitad de la aldea seguía en sus campos.
  //
  // Lo que sí sigue en pie es el cuerpo: la cabaña y los trastos entran en la
  // lista igual que siempre (más abajo), porque un animal que pasa por delante
  // no deja de estar ahí porque haya reunión. Y si el sitio de la reunión no
  // admite a nadie —agua, roca— no se sustituye nada: mejor la jornada de
  // siempre que una aldea sin ningún sitio adonde ir.
  const meetings = ordersOf(state)
    .map((order, index) => meetingPlace(order, land, index))
    .filter((place): place is Place => place !== null);
  const places = [...placesOf(state, land), ...commons(state, land)];
  const around: Neighbourhood = createNeighbourhood(land.width, land.height);
  const router: Router = createRouter();

  // El hambre de la aldea, que agria a todo el mundo (§7.9). Se lee una vez: es
  // del tick, y el tick no cambia dentro de una jornada.
  const people = Math.max(1, population(state));
  const weeks = state.village.grain / (people * FOOD.GRAIN_PER_PERSON);
  const hunger = Math.max(0, Math.min(1, 1 - weeks / 12));

  // Quién vive aquí. Sólo los que están y sólo donde se puede estar: alguien al
  // otro lado del río no tiene nada que hacer en esta orilla, y el río no se
  // cruza (ver `terrain.ts`).
  const dwellers: Dweller[] = [];
  // El corazón es el sitio con más vecinos a mano, no el primero de la lista:
  // el primero puede caer al otro lado del río y entonces «esta orilla» sería
  // la que no tiene pueblo.
  let heart = places[0]?.at ?? { x: land.width / 2, z: land.height / 2 };
  let most = -1;
  for (const place of places) {
    const near = places.filter(
      (other) => Math.hypot(other.at.x - place.at.x, other.at.z - place.at.z) < 14,
    ).length;
    if (near > most) { most = near; heart = place.at; }
  }
  const shore = reachableFrom(land, heart);
  // **Y sólo cuentan los sitios de esta orilla.** El río no se cruza, así que un
  // sitio del otro lado no es un sitio para esta gente: dejar a alguien allí era
  // condenarle a andar sin llegar nunca, y se veía — medido, hasta el 83 % de la
  // jornada en tránsito en las semillas donde el pueblo queda partido.
  //
  // V-08: la cabaña se crea aquí, no antes, porque su ancla (`doorOf`, junto a
  // casa o campo) no depende de `mine` pero lo que ofrece a la gente —`pet`,
  // `chase`, `feed`— sí entra en la misma lista que el resto de sitios: para
  // `decide()` un animal cerca no es distinto de un pozo cerca.
  const beasts = createBeasts(state, land, heart, seed);
  // V-11 · **Y cuando hay reunión, la reunión es lo único que se ofrece.**
  //
  // Medido, porque mi primera versión sólo sustituía los sitios del valle y
  // dejaba la cabaña en la lista: de veinticuatro personas, **veinticuatro se
  // fueron con los animales** y una a por un trasto. Ninguna a la reunión. Una
  // oferta que da compañía entera a once celdas pierde contra una gallina que
  // da un tercio a una celda, y así es como tiene que ser el resto del año.
  //
  // Lo que §11.8 pide no es que la reunión compita: es que la aldea esté ahí.
  // Así que ese día la lista es la reunión, igual que en el camino que G-12
  // apagó —«nadie iba al tajo y todos compartían destino»—. Los animales y los
  // trastos siguen en el valle, con su cuerpo y su deriva; lo que no hacen es
  // ofrecer nada mientras la aldea está convocada.
  //
  // Y **el sitio de la reunión tiene que estar en esta orilla**, como cualquier
  // otro sitio: una reunión al otro lado del río es una orden que no se puede
  // cumplir, y dejar la lista vacía por obedecerla fue mi segundo error —
  // medido: veintitrés personas con `doing: null` toda la jornada, plantadas
  // donde nacieron—. Si no se puede llegar, la jornada es la de siempre.
  const summons = meetings.filter((place) => canReach(land, shore, place.at));
  /** Si el motor ha convocado a la aldea hoy y hay dónde reunirse. */
  const summoned = summons.length > 0;
  const mine = summoned
    ? summons
    : [
      ...places.filter((place) => canReach(land, shore, place.at)),
      ...beasts.map((beast) => beast.gift),
    ];

  // V-09: los trastos de la jornada, anclados a puertas de verdad y por tanto
  // ya en la orilla que se usa (`scatter`, `props.ts`). `propsById` es cómo
  // `village.ts` vuelve de «qué trasto lleva éste» (un id) al trasto mismo.
  const props: Prop[] = options.props === true ? scatter(state, land, seed) : [];
  const propsById = new Map(props.map((prop) => [prop.id, prop]));

  const alive = state.people.villagers.filter((v) => v.diedTick === null && v.leftTick === null);
  alive.forEach((villager, n) => {
    // Se le deja junto a un sitio de la aldea, repartidos.
    const spot = mine[n % Math.max(1, mine.length)]?.at ?? heart;
    // **El sitio de partida, si los cuarenta anillos fallan, ya no es el punto
    // exacto del sitio.** Era `spot` a secas, y eso es un montón: dos personas
    // cuyos anillos fallan los dos nacen en **la misma coordenada exacta**, que
    // es el único solape que el separador de `steering.ts` no podía deshacer
    // —el vector que separa dos puntos iguales es cero—. Con el mapa grande
    // pasó de raro a visible. El sorteo sale de `hash32` y de la persona, así
    // que dos máquinas colocan la misma aldea igual (§4.3).
    const scatterAngle = (hash32(seed, `spawn:${villager.id}`) / 4_294_967_296) * Math.PI * 2;
    let x = spot.x + Math.cos(scatterAngle) * 0.45;
    let z = spot.z + Math.sin(scatterAngle) * 0.45;
    if (blockedAt(land, x, z)) { x = spot.x; z = spot.z; }
    for (let ring = 0; ring < 40; ring += 1) {
      const angle = ring * 2.39996;
      const reach = 0.6 + ring * 0.35;
      const tryX = spot.x + Math.sin(angle) * reach;
      const tryZ = spot.z + Math.cos(angle) * reach;
      if (tryX <= 1 || tryZ <= 1 || tryX >= land.width - 1 || tryZ >= land.height - 1) continue;
      if (!canReach(land, shore, { x: tryX, z: tryZ })) continue;
      // **Y las bestias también ocupan sitio.** Esto miraba sólo a la gente, y
      // la cabaña se crea antes (V-08), así que alguien podía nacer **encima**
      // de una vaca. Dos cuerpos en el mismo punto exacto son el único caso que
      // el separador no puede arreglar: empuja a lo largo del vector que los
      // separa, y ese vector es cero. Medido con el mapa grande: la bestia
      // 10039 y la persona 52 en 23,03 / 67,13, las dos, seiscientos pasos
      // después de empezar ahí.
      if (dwellers.some((d) => Math.hypot(d.body.x - tryX, d.body.z - tryZ) < 0.8)) continue;
      if (beasts.some((b) => Math.hypot(b.dweller.body.x - tryX, b.dweller.body.z - tryZ) < 0.8)) continue;
      x = tryX; z = tryZ; break;
    }
    const pace = 1.05 + (hash32(seed, `pace:${villager.id}`) / 4_294_967_296) * 0.6;
    dwellers.push({
      body: { id: n, x, z, vx: 0, vz: 0, facing: 0, radius: 0.32, pace },
      villager: villager.id,
      traits: villager.traits,
      needs: freshNeeds(),
      doing: null,
      travelled: 0,
      scene: null,
      sceneCooldownUntil: 0,
      holding: null,
      aimAt: null,
      playedUntil: 0,
      // Escalonados: si todos se replantean la vida en el mismo paso, la aldea
      // entera cambia de idea a la vez y se ve el mecanismo.
      rethinkAt: Math.floor((hash32(seed, `think:${villager.id}`) / 4_294_967_296) * RETHINK),
    });
  });

  // V-08: la cabaña colisiona con la gente y con ella misma — la misma rejilla
  // y la misma `resolve()`, así que un niño y una gallina se apartan el uno del
  // otro exactamente como se apartarían dos personas.
  const bodies = [...dwellers.map((d) => d.body), ...beasts.map((b) => b.dweller.body)];
  const byId = new Map(dwellers.map((d) => [d.body.id, d]));
  // Las escenas vivas ahora mismo. Un mismo objeto lo referencian los dos
  // `Dweller` que participan (ver `Dweller.scene`); esta lista es sólo para no
  // tener que recorrer a toda la aldea buscando quién está en una.
  let scenes: Scene[] = [];
  let steps = 0;
  // V-09: pases de pelota dados en la jornada. Contados igual que en
  // `spike/life.ts` (`world.passes += 1`): cualquier tirada de una pelota a
  // alguien cuenta, aunque no haya nadie a quien apuntar y se tire hacia
  // delante por gusto (`finishHolding`, más abajo).
  let passes = 0;
  // V-09b: el registro de cada pase, para poder medir una cadena — `passes`
  // por sí solo no dice quién se la pasó a quién.
  const passLog: PassRecord[] = [];

  /** Cuánta gente hay en cada oferta ahora mismo. */
  function seats(): Map<string, number> {
    const taken = new Map<string, number>();
    for (const dweller of dwellers) {
      if (dweller.doing === null) continue;
      const key = seatKey(dweller.doing.place, dweller.doing.offer);
      taken.set(key, (taken.get(key) ?? 0) + 1);
    }
    return taken;
  }

  return {
    land,
    places: mine,
    dwellers,
    beasts,
    props,
    get steps(): number { return steps; },
    get passes(): number { return passes; },
    get passLog(): readonly PassRecord[] { return passLog; },

    tally(): Record<string, number> {
      const count: Record<string, number> = {};
      for (const dweller of dwellers) {
        const what = dweller.doing === null ? 'nada'
          : dweller.doing.there ? dweller.doing.offer.id : 'andando';
        count[what] = (count[what] ?? 0) + 1;
      }
      return count;
    },

    step(): void {
      const now = steps * LIFE_STEP;
      const taken = seats();
      // Se va actualizando conforme la gente decide: ver el comentario de abajo.
      around.rebuild(bodies);

      // V-09: los trastos sueltos ahora mismo, como opciones más para decidir
      // — se rehace cada paso porque un trasto deja de ofrecer nada en cuanto
      // alguien lo coge, cosa que un edificio nunca hace (`propPlaces`,
      // `props.ts`). Compartido entre todos: lo que cambia persona a persona
      // (V-09b, `PLAYED_OUT`) se filtra más abajo, al llamar a `decide` por
      // cada uno — no aquí, que es de todos, y no dentro de `decide`, que no
      // puede saber quién pregunta (E.4).
      const propOptions = props.length === 0 ? [] : propPlaces(props, now, land);

      // 0 · Vivir las escenas que ya estaban en marcha. V-07.
      //
      //    Antes que nada, porque lo que una escena decida esta vez —colocar,
      //    empujar, hacer trastabillar— es lo que el resto del paso tiene que
      //    respetar para esos dos cuerpos: ninguno de los dos vuelve a pasar
      //    por el `want`/`push`/`wall`/`drive` normal más abajo.
      //
      //    Cerrarla no puede dejar a nadie atrapado: si el paso ya pasó de
      //    `until`, o si uno de los dos ha dejado de estar en la aldea —se
      //    murió, se fue— se suelta a quien quede, con su enfriamiento, y
      //    sigue su vida en el mismo paso.
      const done: Scene[] = [];
      for (const scene of scenes) {
        const dwA = byId.get(scene.a);
        const dwB = byId.get(scene.b);
        if (dwA === undefined || dwB === undefined || !sceneAlive(scene, dwellers)
          || steps >= scene.until) {
          if (dwA !== undefined && dwA.scene === scene) {
            dwA.scene = null;
            dwA.sceneCooldownUntil = steps + Math.round(SCENE_COOLDOWN / LIFE_STEP);
            dwA.rethinkAt = steps;
          }
          if (dwB !== undefined && dwB.scene === scene) {
            dwB.scene = null;
            dwB.sceneCooldownUntil = steps + Math.round(SCENE_COOLDOWN / LIFE_STEP);
            dwB.rethinkAt = steps;
          }
          done.push(scene);
          continue;
        }
        play(scene, dwA, dwB, steps);
      }
      if (done.length > 0) scenes = scenes.filter((scene) => !done.includes(scene));

      for (const dweller of dwellers) {
        const { body } = dweller;

        // Quien está en una escena ya ha recibido su velocidad de `play`: sólo
        // falta integrarla —**nunca se escribe `x`/`z` a mano**, es el mismo
        // `integrate` de `body.ts` el que la mueve, chocando con lo que haya— y
        // contar el suelo que eso pisa, para que el clip de andar no patine si
        // el encuentro incluye un traspié. No se replantea la vida mientras
        // dura: es quien decide dejar de andar un momento, no quien decide su
        // día entero.
        if (dweller.scene !== null) {
          integrate(body, land, LIFE_STEP);
          const speed = Math.hypot(body.vx, body.vz);
          dweller.travelled = speed > 0.05 ? dweller.travelled + speed * LIFE_STEP : 0;

          let company = false;
          around.near(body, (other) => {
            if (!company && Math.hypot(other.x - body.x, other.z - body.z) < 2.2) company = true;
          });
          drift(dweller.needs, dweller.traits, {
            moving: speed > 0.25, withOthers: company, working: false, hunger,
          }, LIFE_STEP);
          continue;
        }

        // 1 · ¿Toca replantearse?
        //
        //     **No mientras se va de camino**, que fue el fallo gordo de la
        //     primera versión: replanteándose cada segundo y medio, la gente
        //     cambiaba de destino antes de llegar y se pasaba el día andando.
        //     Medido: entre el 72 % y el 91 % de la jornada en tránsito, y casi
        //     nadie haciendo nada. Uno decide ir al pozo y va; no reconsidera su
        //     vida cada dos pasos.
        //
        //     Con un tope, eso sí: si el camino se ha hecho eterno —porque el
        //     sitio se llenó, o porque hay medio pueblo por medio— se replantea
        //     igual. Quedarse andando para siempre es el otro modo de fallar.
        const onTheWay = dweller.doing !== null && !dweller.doing.there;
        const tooLong = dweller.doing !== null && steps - dweller.doing.since > GIVE_UP;
        // V-09 · Con un trasto ya en la mano y a la espera de soltarlo, tampoco
        // se replantea la vida: la jugada dura menos que `RETHINK` (1,5 s) a
        // propósito —«no se come la jornada»—, y sin este freno el rethink de
        // en medio ganaba casi siempre en cuanto `satisfy()` vaciaba el
        // aburrimiento que hacía atractivo jugar, dejando a la pelota
        // pegada en la mano para el resto del día. Medido: 3 139 pasos con la
        // pelota en la mano y cero pases en la semilla 3, antes de este freno.
        const heldSteady = dweller.holding !== null && dweller.doing?.there === true;
        if (!heldSteady && steps >= dweller.rethinkAt && (!onTheWay || tooLong)) {
          dweller.rethinkAt = steps + RETHINK;
          const before = dweller.doing;
          // V-09b · Hasta que se le pasen las ganas (`PLAYED_OUT`), a éste no
          // se le ofrece `play`: se filtra aquí, al montar las opciones de
          // *este* dweller, no dentro de `decide` — una oferta no puede saber
          // quién pregunta (E.4). El resto de la aldea sigue viendo la pelota
          // como siempre.
          const playedOut = now < dweller.playedUntil;
          // V-11: con la aldea convocada no se ofrecen trastos, por lo mismo
          // que no se ofrece la cabaña — ver `mine` arriba.
          const options = summoned
            ? mine
            : !playedOut || propOptions.length === 0
              ? [...mine, ...propOptions]
              : [...mine, ...propOptions.filter((place) => place.offers[0]?.id !== 'play')];
          dweller.doing = decide(
            { traits: dweller.traits, needs: dweller.needs, at: body, id: body.id, doing: before },
            options, taken, land, router, seed, steps,
          );
          // **La plaza se reserva al decidir, no al llegar**, y ése era el imán
          // que se veía en pantalla: el aforo se contaba una vez al empezar el
          // paso, así que los veinte que decidían en ese instante veían el mismo
          // pozo libre y se iban los veinte. Medido: setenta y cinco veces más
          // gente de la que cabe yendo al mismo sitio en una sola jornada.
          if (before !== null) {
            const old = seatKey(before.place, before.offer);
            taken.set(old, Math.max(0, (taken.get(old) ?? 1) - 1));
          }
          if (dweller.doing !== null) {
            const now = seatKey(dweller.doing.place, dweller.doing.offer);
            taken.set(now, (taken.get(now) ?? 0) + 1);
          }
        }

        // 2 · ¿Se acabó lo que estaba haciendo?
        if (dweller.doing !== null && dweller.doing.there && steps >= dweller.doing.until) {
          // V-09: si se acaba con un trasto en la mano, se resuelve. Una
          // pelota se tira —encarado a quien tocara, o hacia delante si nadie
          // quiso jugar— y cualquier otra cosa se suelta donde se está.
          if (dweller.holding !== null) {
            const held = propsById.get(dweller.holding);
            if (held !== undefined) {
              if (held.kind === 'ball') {
                const mate = dweller.aimAt === null ? undefined : byId.get(dweller.aimAt);
                const at = mate !== undefined
                  ? { x: mate.body.x, z: mate.body.z }
                  : {
                    x: body.x + Math.sin(body.facing) * THROW_AHEAD,
                    z: body.z + Math.cos(body.facing) * THROW_AHEAD,
                  };
                fling(held, dweller, at, THROW, LOFT, land, mate?.body.id ?? null);
                held.restUntil = now + REST_AFTER_THROW;
                passes += 1;
                passLog.push({ from: dweller.body.id, to: mate?.body.id ?? null, step: steps });
                // V-09b · Se le pasan las ganas por un rato, como en el
                // descarte: sin esto el rethink de en medio ganaba en cuanto
                // `satisfy()` vaciaba el aburrimiento, y la pelota volvía a la
                // misma mano una y otra vez.
                const rest = hash32(seed, `playedout:${dweller.body.id}:${steps}`) / 4_294_967_296;
                dweller.playedUntil = now + PLAYED_OUT[0] + rest * (PLAYED_OUT[1] - PLAYED_OUT[0]);
              } else {
                drop(held, dweller, land);
              }
            }
            dweller.holding = null;
          }
          dweller.aimAt = null;
          dweller.doing = null;
          dweller.rethinkAt = steps;
        }

        // 3 · Andar hacia ello, o estarse haciéndolo.
        //
        //     **Se llega cuando se está a su alcance, no cuando se pisa el
        //     punto.** Para eso existe `reach` en la oferta, y no usarlo fue la
        //     segunda mitad del mismo fallo: en sitios apretados entre casas, el
        //     empujón de las paredes impide clavarse en el punto exacto y la
        //     gente se quedaba dando vueltas al lado de donde quería estar.
        const wasThere = dweller.doing?.there === true;
        if (dweller.doing !== null && !dweller.doing.there) {
          const spot = seatAt(dweller.doing.offer, dweller.doing.seat);
          if (Math.hypot(spot.x - body.x, spot.z - body.z) <= dweller.doing.offer.reach * 0.6) {
            dweller.doing.there = true;
            dweller.doing.route.length = 0;
          }
        }
        const next = dweller.doing === null || dweller.doing.there
          ? null
          : follow(body, dweller.doing.route);
        if (dweller.doing !== null && !dweller.doing.there && next === null) {
          dweller.doing.there = true;
        }
        // V-09 · Primera lección del descarte: al llegar junto a un trasto
        // suelto se coge, no hace falta pisarlo. Sólo en el instante de
        // llegar (`!wasThere`), y sólo si de verdad hay algo que ofrezca
        // `play`/`carry` ahí: el aforo ya reservó la plaza al decidir, así
        // que en condiciones normales sigue libre.
        if (dweller.doing !== null && dweller.doing.there && !wasThere
          && dweller.holding === null
          && dweller.doing.place.id.startsWith(PROP_PLACE_PREFIX)) {
          const prop = propsById.get(Number(dweller.doing.place.id.slice(PROP_PLACE_PREFIX.length)));
          if (prop !== undefined && take(prop, dweller)) {
            dweller.aimAt = dweller.doing.offer.id === 'play'
              ? (findMate(dweller, dwellers)?.body.id ?? null)
              : null;
          }
        }

        const want = next === null ? { x: 0, z: 0 } : seek(body, next);
        const push = separate(body, around);
        const wall = avoid(body, land);
        drive(body, { x: want.x + push.x + wall.x, z: want.z + push.z + wall.z });
        integrate(body, land, LIFE_STEP);

        const speed = Math.hypot(body.vx, body.vz);
        if (speed > 0.05) {
          turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
          dweller.travelled += speed * LIFE_STEP;
        } else {
          dweller.travelled = 0;
          // V-09 · Segunda lección del descarte: quien va a tirar la pelota
          // se encara a quien se la va a tirar antes de soltarla.
          if (dweller.doing?.there === true && dweller.doing.offer.id === 'play'
            && dweller.aimAt !== null) {
            const mate = byId.get(dweller.aimAt);
            if (mate !== undefined) {
              turnTo(body, Math.atan2(mate.body.x - body.x, mate.body.z - body.z), LIFE_STEP);
            }
          }
        }

        // 4 · Y lo que eso le hace por dentro.
        let company = false;
        around.near(body, (other) => {
          if (!company && Math.hypot(other.x - body.x, other.z - body.z) < 2.2) company = true;
        });
        const doing: Doing = {
          moving: speed > 0.25,
          withOthers: company,
          working: dweller.doing?.there === true && dweller.doing.offer.id === 'work',
          hunger,
        };
        drift(dweller.needs, dweller.traits, doing, LIFE_STEP);
        if (dweller.doing?.there === true) satisfy(dweller.needs, dweller.doing.offer, LIFE_STEP);
      }

      // 7b · Los trastos. V-09. Los sueltos caen y ruedan (`settle`, física
      //      pura); los que alguien lleva van en su mano (`carryAt`) — eso no
      //      puede vivir dentro de `settle`, que no conoce los cuerpos.
      settle(props, land, LIFE_STEP);
      for (const dweller of dwellers) {
        if (dweller.holding === null) continue;
        const held = propsById.get(dweller.holding);
        if (held !== undefined) carryAt(held, dweller);
      }

      // 7c · Recibir un pase es una reacción, no una elección. V-09b.
      //
      //    Después de la física del paso (7b), con la pelota ya parada donde
      //    va a parar: si una pelota lanzada a alguien (`Prop.for`) está
      //    quieta a menos de dos celdas de ese cuerpo, y ese `Dweller` no está
      //    en escena, no lleva nada ya y no está en `PLAYED_OUT`, la coge y se
      //    pone a jugar directamente — **sin pasar por `decide`**, la misma
      //    clase de cosa que una escena de V-07: una interacción entre dos que
      //    no es una oferta y por tanto no nombra a nadie (E.4, `propPlaces`
      //    no cambia). Sin esto el receptor tenía que volver a ganar el mismo
      //    concurso de utilidad que cualquier otra oferta para coger lo que le
      //    acababan de tirar, y casi nunca lo ganaba: la cadena moría en el
      //    primer pase (medido, `docs/life-rounds/V-09.md`).
      //
      //    **La plaza se sigue reservando al decidir, no al llegar** (V-06,
      //    E.7): si la pelota lleva ya un paso quieta y ofreciéndose de
      //    verdad (`propPlaces`), alguien puede haberla elegido por el
      //    concurso normal de utilidad antes de que el destinatario llegara a
      //    tiempo. Robársela igualmente rompía esa garantía — medido: un
      //    exceso de aforo en `life-decide.test.ts` («nadie se apiña, nadie
      //    se pasa del aforo»), el mismo síntoma que V-06 ya cerró una vez
      //    para los sitios normales. Aquí no hay `taken` que consultar
      //    (7c corre después del reparto de plazas del paso), así que se
      //    mira directamente si alguien más ya tiene esta plaza como destino.
      for (const prop of props) {
        if (prop.kind !== 'ball' || prop.for === null || prop.held !== null) continue;
        // Quieta: mismo criterio que `propPlaces` para «se puede coger».
        if (prop.y > 0.001 || Math.hypot(prop.vx, prop.vz) > 0.05) continue;
        const target = byId.get(prop.for);
        if (target === undefined || target.scene !== null || target.holding !== null) continue;
        if (now < target.playedUntil) continue;
        const gap = Math.hypot(target.body.x - prop.x, target.body.z - prop.z);
        if (gap >= CATCH_RANGE) continue;
        const placeId = `${PROP_PLACE_PREFIX}${prop.id}`;
        const claimed = dwellers.some((other) => other.body.id !== target.body.id
          && other.doing !== null && other.doing.place.id === placeId);
        if (claimed) continue;
        // Vive en el catálogo (`offers.ts`) y no puede faltar, pero `OFFERS`
        // es un `Record<string, OfferSpec>` y TypeScript no lo sabe estático.
        const spec = OFFERS.play;
        if (spec === undefined) continue;
        if (!take(prop, target)) continue;

        const dice = hash32(seed, `catch:${target.body.id}:${steps}`) / 4_294_967_296;
        const span = Math.round((spec.seconds[0] + dice * (spec.seconds[1] - spec.seconds[0])) * 30);
        const at = { x: target.body.x, z: target.body.z };
        const offer: Offer = { ...spec, at };
        target.doing = {
          place: { id: placeId, at, offers: [offer] },
          offer,
          route: [],
          seat: 0,
          since: steps,
          until: steps + span,
          there: true,
        };
        target.rethinkAt = steps + RETHINK;
        target.aimAt = findMate(target, dwellers)?.body.id ?? null;
      }

      // 8 · La cabaña vive su propio paso. V-08.
      //
      //    Después de la gente y antes de `resolve()`, para que la corrección
      //    final de solapes vea las posiciones ya movidas de todo el mundo —
      //    persona y animal por igual. No entra en escenas (eso sigue siendo
      //    cosa de `dwellers`, sólo personas): lo que un animal ofrece a quien
      //    pase ya está en `mine`, y quien lo elige es la gente decidiendo,
      //    no una escena de dos.
      stepBeasts(beasts, land, around, router, seed, steps);

      resolve(bodies, around, land);

      // 9 · ¿Quién se ha encontrado con quién? V-07.
      //
      //    Después de mover y resolver a todos, con las posiciones ya
      //    definitivas del paso: un encuentro que no estaba escrito al
      //    amanecer, ocurre porque dos cuerpos se han acercado andando. Cada
      //    pareja se mira una vez (`other.id > body.id`), y sólo entran los
      //    que no están ya en algo y no acaban de salir de otra cosa.
      around.rebuild(bodies);
      for (const dweller of dwellers) {
        if (dweller.scene !== null || steps < dweller.sceneCooldownUntil) continue;
        around.near(dweller.body, (otherBody) => {
          if (dweller.scene !== null || otherBody.id <= dweller.body.id) return;
          const other = byId.get(otherBody.id);
          if (other === undefined || other.scene !== null
            || steps < other.sceneCooldownUntil) return;
          const apart = Math.hypot(otherBody.x - dweller.body.x, otherBody.z - dweller.body.z);
          if (apart > SCENE_EARSHOT) return;

          // Sólo lectura del motor, y de los dos sentidos: ninguna escena
          // conoce a nadie por nombre, pero el trato entre estos dos sí puede
          // pesar en si se paran o no.
          const opinion = (opinionOf(state, dweller.villager, other.villager)
            + opinionOf(state, other.villager, dweller.villager)) / 2;
          const scene = propose(dweller, other, opinion, seed, steps);
          if (scene === null) return;
          // V-09 · Quien empieza una escena suelta lo que llevaba: no se
          // habla, ni se empuja, ni se pelea con las manos ocupadas.
          if (dweller.holding !== null) {
            const held = propsById.get(dweller.holding);
            if (held !== undefined) drop(held, dweller, land);
          }
          if (other.holding !== null) {
            const held = propsById.get(other.holding);
            if (held !== undefined) drop(held, other, land);
          }
          dweller.scene = scene;
          other.scene = scene;
          scenes.push(scene);
        });
      }

      steps += 1;
    },
  };
}
