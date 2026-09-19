// R-1 · Los sucesos del valle. design.md §4.2 (paso 2b), §7.10, §12.10.
//
// El rework empieza aquí. El dueño del diseño lo pidió el 15 sep 2026 —«esto
// tiene que ser mucho más aleatorio y con mucha más vida»— y el diagnóstico de
// `docs/medidas/findings-drama.md` dice por qué hacía falta: todo lo dramático del
// motor colgaba de las encrucijadas, y las encrucijadas salen diez veces en
// cuarenta años. Las opiniones sólo se movían con ellas, así que no había
// rencores, así que no había riñas, así que media docena de plantillas no salía
// nunca. Un ciclo que necesitaba un empujón que nadie daba.
//
// **Aquí el mundo pasa cosas por su cuenta.** Cada semana se tira contra una
// tabla de sucesos, y el que sale cambia el estado, escribe en la crónica y
// **se ve** —reutiliza los efectos visibles de §11.5, los mismos que las
// opciones de encrucijada—. No hay decisión que tomar: pasan, como pasa un
// incendio. Y pesan distinto según el cielo, la estación y los rasgos del
// valle, que es lo que hace que dos valles con la misma fila de clima no se
// parezcan.
//
// Determinista por el flujo `fate` y nada más: ningún suceso toca otro flujo,
// y hay prueba. El cielo lo pregunta a `world/sky.ts`, que no consume tiradas.

import { DISASTER, FATE, LIFE, MEANS, OFFER, TIME } from '../balance';
import { flagSet, ratioOf } from '../crossroads/conditions';
import type { VisualEffect } from '../crossroads/schema';
import { isHere, population } from '../people/demography';
import { adjustOpinion, opinionOf } from '../people/opinions';
import { scarFire } from '../people/scars';
import { ageOf } from '../people/villagers';
import { int, next, weighted } from '../rng';
import type { Building, ChronicleEntry, GameState, HappeningId, HappeningRecord, VillagerId } from '../state';
import { HAPPENINGS } from '../state';
import { count, has, standing } from '../subsistence/building-counts';
import { seasonOf, weekOf } from '../time';
import { destroyBuilding } from './buildings';
import { herdCapacity, herdDensity } from '../subsistence/herd';
import { storageCapacity } from '../subsistence/harvest';
import { aleWindow } from './means';
import { will } from '../people/crown';
import { factorWants, postOffer } from './road';
import { weekWeather } from './sky';

/** Lo que `rollFate` devuelve al tick: el registro y la línea de crónica. */
export interface FateOutcome {
  readonly record: HappeningRecord;
  readonly entry: Omit<ChronicleEntry, 'tick'>;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function moraleBy(state: GameState, delta: number): void {
  state.village.morale = clamp(state.village.morale + delta, 0, 100);
}

function faithBy(state: GameState, delta: number): void {
  state.village.faith = clamp(state.village.faith + delta, 0, 100);
}

/** Los adultos vivos, por edad de §12.4. */
function adults(state: GameState) {
  return state.people.villagers.filter((v) =>
    isHere(v) && ageOf(v, state.tick) >= LIFE.ADULT[0] && ageOf(v, state.tick) <= LIFE.ADULT[1]);
}

function children(state: GameState) {
  return state.people.villagers.filter((v) => isHere(v) && ageOf(v, state.tick) < LIFE.ADULT[0]);
}

/** Lo que puede arder: madera en pie. La misma lista que el incendio de §5.9. */
function wooden(state: GameState): Building[] {
  return state.buildings.filter((b) =>
    b.lostTick === null && b.tier === 0
    && (DISASTER.FIRE_KINDS as readonly string[]).includes(b.kind));
}

/**
 * M-1 · **Los sucesos que destruyen, contra una aldea que todavía no ha
 * decidido nada.** Devuelve el factor con el que pesan.
 *
 * La decisión 4 del dueño del diseño: el mundo no mata sin motivo y de primeras
 * no mata. Una aldea de cuatro personas en su tercer año no ha tomado ninguna
 * decisión que la pueda tumbar, así que romperla no cuenta una historia. No es
 * una puerta —el rayo sigue pudiendo caer sobre la única casa, que es §2.6— es
 * un peso.
 */
function grace(state: GameState, people: number): number {
  // **Joven Y pequeña, no una de las dos.** Medido, y es el error que casi se
  // queda dentro: con «pequeña» a secas, las muertas de treinta y dos partidas
  // bajaban de nueve a **una**, porque un valle que se está apagando pasa por
  // debajo de seis personas y a partir de ahí era casi inmune a lo que
  // destruye. Eso no es la decisión del dueño —«de primeras la aldea no tiene
  // por qué morirse»— es un escudo permanente para el que va perdiendo, y borra
  // el caos que él mismo pidió («que haya partidas que se rompan es la idea»).
  // La gracia es de los primeros años, no del tamaño.
  const young = state.tick < FATE.GRACE_YEARS * TIME.WEEKS_PER_YEAR;
  return young && people < FATE.GRACE_PEOPLE ? FATE.GRACE_FACTOR : 1;
}

/** Si hay algo que un lobo tenga que saltar para llegar al corral. */
function walled(state: GameState): boolean {
  return count(state, 'palisade') > 0 || count(state, 'wall') > 0 || count(state, 'watchtower') > 0;
}

/** Cuánto pesa un rasgo del valle en un suceso: 1 si no lo tiene. */
function trait(state: GameState, name: string, factor: number): number {
  return (state.traits as readonly string[]).includes(name) ? factor : 1;
}

interface Context {
  readonly season: ReturnType<typeof seasonOf>;
  readonly week: number;
  readonly sky: ReturnType<typeof weekWeather>;
  readonly people: number;
}

/**
 * Cuánto pesa cada suceso esta semana, o cero si no puede pasar. Es la tabla
 * de §12.10 leída con el estado delante: la estación abre y cierra sucesos, el
 * cielo pesa los que dependen de él, y los rasgos del valle inclinan el resto.
 * Un peso cero es «imposible ahora», no «raro».
 */
function weightOf(state: GameState, id: HappeningId, ctx: Context): number {
  const w = FATE.WEIGHT[id];
  switch (id) {
    case 'lightning_fire':
      // Sin puertas: el dueño del diseño pidió que el caos sea el juego y que
      // una partida pueda romperse (`docs/historico/rework.md` §2.6). El rayo pide sólo
      // lo que la física pide, tormenta y algo de madera en pie, aunque eso
      // sea la única casa de la pareja fundadora — lo que M-1 le quita es
      // poder dejar a la aldea **sin ninguna** (ver `happen`).
      return ctx.sky.storms > 0 && wooden(state).length > 0
        ? w * ctx.sky.storms * grace(state, ctx.people) : 0;
    case 'river_flood':
      // M-1 · **y con el bosque talado, más.** El agua que el bosque no para
      // baja al río: es la consecuencia de haber talado, que es una decisión
      // del jugador y no del cielo.
      return ctx.season === 'spring' && ctx.sky.wet >= FATE.FLOOD_WET_DAYS
        ? w * trait(state, 'bare_hills', 0.5) * grace(state, ctx.people)
          * (1 + FATE.FLOOD_PER_FELLED * (1 - ratioOf(state, 'forestLeft')))
        : 0;
    case 'wolves_at_the_coop':
      // M-1 · **los lobos van a donde hay ganado.** Cada cerdo y cada vaca los
      // llaman; una empalizada o una atalaya los aparta. Las gallinas siguen
      // siendo la condición porque son lo que primero se llevan.
      return ctx.season === 'winter' && state.herd.hens > 0
        ? w * trait(state, 'old_forest', 1.6) * trait(state, 'bare_hills', 0.5)
          * grace(state, ctx.people)
          * (1 + FATE.WOLVES_PER_HEAD * (state.herd.pigs + state.herd.cows))
          * (walled(state) ? FATE.WOLVES_WALLED : 1)
        : 0;
    case 'wedding':
      // M-2 · **y después de un barril, mucho más.** Una fiesta es donde se
      // conoce la gente, y es la cara buena del medio más barato.
      return adults(state).length >= FATE.WEDDING_MIN_ADULTS
        ? w * (aleWindow(state) ? FATE.ALE_WEDDING : 1) : 0;
    case 'pedlar':
      // M-0 · una visita no sube mientras hay otra esperando en el camino.
      return visitable(state, 'pedlar') && ctx.season === 'summer' && state.village.wood >= OFFER.PEDLAR_WOOD * 2 ? w : 0;
    case 'factor_visit':
      // Cuando sobra grano, y el doble en los tres meses después de la siega,
      // que es cuando sobra de verdad.
      return visitable(state, 'factor_visit') && factorWants(state) > 0
        ? w * (afterHarvest(ctx) ? 2 : 1) : 0;
    case 'drover_visit':
      // En primavera, con corral para otra vaca y plata para pagarla.
      return visitable(state, 'drover_visit') && ctx.season === 'spring'
        && state.herd.cows < herdCapacity(state).cows
        && state.village.silver >= OFFER.DROVER_SILVER ? w : 0;
    case 'salt_visit':
      // Antes del invierno, a quien tiene carne que guardar y plata; no a quien
      // ya tiene sal.
      return visitable(state, 'salt_visit') && (ctx.season === 'autumn' || ctx.season === 'winter')
        && state.herd.pigs + state.herd.cows > 0
        && !flagSet(state, 'salted')
        && state.village.silver >= OFFER.SALT_SILVER ? w : 0;
    case 'good_catch':
      return (ctx.season === 'spring' || ctx.season === 'summer') && ctx.sky.wet <= 3 ? w : 0;
    case 'roof_under_snow':
      return ctx.season === 'winter' && ctx.sky.snow >= FATE.ROOF_SNOW_DAYS && count(state, 'house') > 0
        ? w : 0;
    case 'harvest_feast':
      // Sólo entra en el sorteo si no es un rito; como rito lo trata `rollFate`.
      return !FATE.FEAST_IS_A_RITE && feastDue(state, ctx) ? w : 0;
    case 'quarrel_in_the_square':
      // M-2 · **y la otra cara del barril.** El mismo medio que trae bodas trae
      // riñas: es lo que hace que darlo sea una decisión y no una compra.
      return state.people.namedIds.filter((id) => {
        const v = state.people.villagers.find((x) => x.id === id);
        return v !== undefined && isHere(v);
      // K-2 · y un rey de mal genio la hace más probable: es el empujón a las
      // opiniones que R-1 dio con la riña, ahora con un motivo con nombre.
      }).length >= 2
        ? w * (aleWindow(state) ? FATE.ALE_QUARREL : 1) * will(state).quarrel : 0;
    case 'bear_in_the_wood':
      // En verano y otoño, que es cuando el oso baja a comer; en un valle de
      // bosque viejo, el doble.
      // En un valle de bosque viejo baja cada verano; en los demás sólo si
      // queda mucho bosque en pie. Es lo que hace que un valle tenga osos y
      // otro no, que es la clase de diferencia que se compara.
      return (ctx.season === 'summer' || ctx.season === 'autumn')
        && (trait(state, 'old_forest', 2) > 1 || ratioOf(state, 'forestLeft') >= FATE.BEAR_FOREST)
        ? w * trait(state, 'old_forest', 2) : 0;
    case 'child_lost':
      return children(state).length > 0 ? w : 0;
    case 'stranger_passes':
      return flagSet(state, 'hostile') ? 0 : w;
    // ----------------------------------------------------------------- M-2
    case 'ale_feast':
      // No se sortea nunca: la fiesta del barril la paga el jugador y la sirve
      // `rollFate` como rito, igual que la de la cosecha.
      return 0;
    case 'pig_slaughter':
      // La cara buena de tener cerdos, y sólo en la semana de la fiesta: una
      // matanza es parte de la fiesta, no un suceso suelto.
      return feastDue(state, ctx) && state.herd.pigs >= FATE.SLAUGHTER_MIN_PIGS ? w : 0;
    case 'rats_in_the_granary':
      // Y la cara mala de tener el granero lleno, que es a donde lleva el
      // arado. En invierno, que es cuando el grano lleva meses quieto.
      return ctx.season === 'winter' && has(state, 'granary')
        && state.village.grain > FATE.RATS_FULL * storageCapacity(state) ? w : 0;
    default:
      return 0;
  }
}

/**
 * M-0 · Si alguien puede subir por el camino esta semana: nadie mientras otro
 * espera respuesta, y nadie a un valle hostil.
 */
function visitable(state: GameState, id: keyof typeof OFFER.AGAIN_WEEKS): boolean {
  if (state.offer !== null || flagSet(state, 'hostile')) return false;
  // Y no mientras hay una decisión sin contestar: esa ocupa la pantalla entera
  // (§11.2), así que la oferta se leería debajo del velo y caducaría sin que
  // nadie la hubiera visto. Era la regla del canal viejo y se queda.
  if (state.crossroad !== null) return false;
  if (population(state) < OFFER.MIN_PEOPLE) return false;
  // La última visita de esta clase, buscada desde el final: las visitas son
  // raras y la lista de sucesos crece hacia atrás en el tiempo.
  for (let i = state.happenings.length - 1; i >= 0; i -= 1) {
    const past = state.happenings[i];
    if (past === undefined) continue;
    if (state.tick - past.tick >= OFFER.AGAIN_WEEKS[id]) break;
    if (past.id === id) return false;
  }
  return true;
}

/** Las doce semanas siguientes a la siega, que es cuando sobra grano. */
function afterHarvest(ctx: Context): boolean {
  const since = (ctx.week - TIME.HARVEST_WEEK + TIME.WEEKS_PER_YEAR) % TIME.WEEKS_PER_YEAR;
  return since >= 1 && since <= TIME.WEEKS_PER_SEASON;
}

/** La semana de la fiesta: la siguiente a la siega, con grano en el granero y gente. */
function feastDue(state: GameState, ctx: Context): boolean {
  return ctx.week === TIME.HARVEST_WEEK + 1 && ctx.people >= FATE.FEAST_MIN_PEOPLE
    && state.village.grain > 0;
}

/**
 * Los dos nombrados que peor se llevan, para la riña de la plaza. Si nadie se
 * lleva mal todavía, los dos primeros: es el empujón inicial que
 * `docs/medidas/findings-drama.md` §1 dice que nadie daba.
 */
function worstPair(state: GameState): [VillagerId, VillagerId] | null {
  const named = state.people.namedIds.filter((id) => {
    const v = state.people.villagers.find((x) => x.id === id);
    return v !== undefined && isHere(v);
  });
  if (named.length < 2) return null;
  let best: [VillagerId, VillagerId] | null = null;
  let lowest = Number.POSITIVE_INFINITY;
  for (const a of named) {
    for (const b of named) {
      if (a >= b) continue;
      const mutual = opinionOf(state, a, b) + opinionOf(state, b, a);
      if (mutual < lowest) {
        lowest = mutual;
        best = [a, b];
      }
    }
  }
  return best;
}

function nameOf(state: GameState, id: VillagerId): string {
  return state.people.villagers.find((v) => v.id === id)?.name ?? '';
}

/**
 * Aplica el suceso al estado y devuelve el registro y su línea. Cada rama es
 * un suceso entero: el efecto, lo que se cuenta y lo que se ve. Consume azar
 * sólo del flujo `fate`.
 */
function happen(state: GameState, id: HappeningId, ctx: Context): FateOutcome {
  const params: Record<string, string | number> = { season: ctx.season, year: Math.floor(state.tick / TIME.WEEKS_PER_YEAR) };
  const visible: VisualEffect[] = [];
  const who: VillagerId[] = [];
  let weight: 1 | 2 | 3 = 2;
  let key = `fate.${id}`;

  switch (id) {
    case 'lightning_fire': {
      // M-1 · **un rayo destruye una casa, nunca la última.** Decisión 4 del
      // dueño del diseño, con sus palabras: «que caiga un rayo en una casa y
      // eso ya se muera no tiene gracia». Con un solo techo en pie, el rayo cae
      // en otra cosa —el granero, un campo, la empalizada— y si no hay otra
      // cosa, cae y no se lleva nada: se ve, se cuenta y no acaba la partida.
      const roofs = standing(state, 'house').length + standing(state, 'stone_house').length;
      const burnable = roofs > 1
        ? wooden(state)
        : wooden(state).filter((b) => b.kind !== 'house');
      if (burnable.length === 0) {
        moraleBy(state, FATE.LIGHTNING_MORALE);
        key = 'fate.lightning_fire.spared';
        weight = 2;
        break;
      }
      const target = weighted(state.rng, 'fate', burnable, (b) =>
        b.kind === 'house' ? FATE.LIGHTNING_HOUSE_WEIGHT : 1);
      // Como el incendio de §5.9: la marca antes de la ruina, porque después
      // nadie tiene `homeId` apuntando a ella.
      scarFire(state, target.id);
      destroyBuilding(state, target.id);
      moraleBy(state, FATE.LIGHTNING_MORALE);
      params['building'] = target.kind;
      visible.push({ k: 'ruin', kind: target.kind });
      weight = 3;
      break;
    }
    case 'river_flood': {
      const lost = Math.round(state.village.grain * FATE.FLOOD_GRAIN_LOSS);
      state.village.grain = Math.max(0, state.village.grain - lost);
      moraleBy(state, FATE.FLOOD_MORALE);
      params['grain'] = lost;
      visible.push({ k: 'gather', where: 'ford', days: 1 });
      break;
    }
    case 'wolves_at_the_coop': {
      const taken = Math.min(state.herd.hens, int(state.rng, 'fate', FATE.WOLVES_HENS[0], FATE.WOLVES_HENS[1]));
      state.herd.hens -= taken;
      moraleBy(state, FATE.WOLVES_MORALE);
      params['count'] = taken;
      // M-1 · **y con el corral lleno se llevan un cerdo.** Es la otra cara de
      // tener ganado: lo que alimenta a la aldea en invierno también alimenta
      // a los lobos, y un corral apretado es una despensa a la vista.
      if (state.herd.pigs > 0 && herdDensity(state) >= FATE.WOLVES_PIG_DENSITY) {
        state.herd.pigs -= 1;
        key = 'fate.wolves_at_the_coop.pig';
        weight = 2;
      }
      break;
    }
    case 'wedding': {
      moraleBy(state, FATE.WEDDING_MORALE);
      faithBy(state, FATE.WEDDING_FAITH);
      visible.push({ k: 'gather', where: has(state, 'chapel') || has(state, 'church') ? 'chapel' : 'square', days: 2 });
      break;
    }
    case 'pedlar': {
      // M-0 · el buhonero ya no se lleva la leña: la **pide**, y el jugador dice.
      postOffer(state, id,
        [{ k: 'stat', stat: 'silver', amount: OFFER.PEDLAR_SILVER }],
        [{ k: 'stat', stat: 'wood', amount: OFFER.PEDLAR_WOOD }]);
      params['wood'] = OFFER.PEDLAR_WOOD;
      params['silver'] = OFFER.PEDLAR_SILVER;
      visible.push({ k: 'gather', where: 'square', days: 1 });
      break;
    }
    case 'factor_visit': {
      const grain = factorWants(state);
      const silver = Math.max(1, Math.round(grain * OFFER.SILVER_PER_GRAIN));
      postOffer(state, id,
        [
          { k: 'stat', stat: 'silver', amount: silver },
          // El precio de verdad, el mismo que tenía la encrucijada del factor:
          // quien vende su grano en el camino es un valle del que se habla, y
          // las plantillas del señor leen `watched`.
          { k: 'flag', flag: 'watched', years: OFFER.FACTOR_WATCHED_YEARS },
        ],
        [{ k: 'stat', stat: 'grain', amount: grain }]);
      params['grain'] = grain;
      params['silver'] = silver;
      visible.push({ k: 'gather', where: 'square', days: 1 });
      break;
    }
    case 'drover_visit': {
      postOffer(state, id,
        [{ k: 'herd', kind: 'cows', amount: 1 }],
        [{ k: 'stat', stat: 'silver', amount: OFFER.DROVER_SILVER }]);
      params['silver'] = OFFER.DROVER_SILVER;
      visible.push({ k: 'gather', where: 'square', days: 1 });
      break;
    }
    case 'salt_visit': {
      postOffer(state, id,
        [{ k: 'flag', flag: 'salted', years: OFFER.SALT_YEARS }],
        [{ k: 'stat', stat: 'silver', amount: OFFER.SALT_SILVER }]);
      params['silver'] = OFFER.SALT_SILVER;
      params['years'] = OFFER.SALT_YEARS;
      visible.push({ k: 'gather', where: 'square', days: 1 });
      break;
    }
    case 'good_catch': {
      const grain = int(state.rng, 'fate', FATE.CATCH_GRAIN[0], FATE.CATCH_GRAIN[1]);
      state.village.grain += grain;
      moraleBy(state, FATE.CATCH_MORALE);
      params['grain'] = grain;
      visible.push({ k: 'gather', where: 'ford', days: 1 });
      break;
    }
    case 'roof_under_snow': {
      const houses = standing(state, 'house').filter((b) => b.blockedUntil === null);
      const house = houses.length > 0 ? weighted(state.rng, 'fate', houses, () => 1) : null;
      if (house !== null) house.blockedUntil = state.tick + FATE.ROOF_BLOCK_WEEKS;
      state.village.wood = Math.max(0, state.village.wood - FATE.ROOF_WOOD);
      moraleBy(state, FATE.ROOF_MORALE);
      params['wood'] = FATE.ROOF_WOOD;
      break;
    }
    case 'harvest_feast': {
      // K-2 · un rey cura mira mal la bebida, así que la fiesta vale la mitad de
      // ánimo. La fe no se toca: lo que le molesta es la juerga, no la cosecha.
      moraleBy(state, FATE.FEAST_MORALE * will(state).feast);
      faithBy(state, FATE.FEAST_FAITH);
      visible.push({ k: 'gather', where: has(state, 'chapel') || has(state, 'church') ? 'chapel' : 'square', days: 2 });
      break;
    }
    case 'quarrel_in_the_square': {
      const pair = worstPair(state);
      if (pair !== null) {
        adjustOpinion(state, pair[0], pair[1], FATE.QUARREL_OPINION);
        adjustOpinion(state, pair[1], pair[0], FATE.QUARREL_OPINION);
        who.push(pair[0], pair[1]);
        params['A'] = nameOf(state, pair[0]);
        params['B'] = nameOf(state, pair[1]);
      }
      moraleBy(state, FATE.QUARREL_MORALE);
      visible.push({ k: 'gather', where: 'square', days: 1 });
      break;
    }
    case 'bear_in_the_wood': {
      state.flags['bear'] = state.tick + FATE.BEAR_WEEKS;
      moraleBy(state, FATE.BEAR_MORALE);
      break;
    }
    case 'child_lost': {
      moraleBy(state, FATE.CHILD_MORALE);
      const child = weighted(state.rng, 'fate', children(state), () => 1);
      if (child.named) who.push(child.id);
      key = child.named ? 'fate.child_lost.named' : 'fate.child_lost';
      if (child.named) params['A'] = child.name;
      visible.push({ k: 'gather', where: 'ford', days: 1 });
      break;
    }
    case 'ale_feast': {
      // M-2 · **el barril, y es el medio que le da al ánimo el reloj del
      // jugador**: sube de golpe esta semana, no dentro de un año.
      // K-2 · y con un rey cura, el barril vale la mitad: es lo que hace que ese
      // medio y ese rey no se lleven bien, y una decisión del jugador que se
      // nota.
      moraleBy(state, FATE.ALE_MORALE * will(state).feast);
      faithBy(state, FATE.ALE_FAITH);
      visible.push({ k: 'gather', where: 'square', days: 2 });
      break;
    }
    case 'pig_slaughter': {
      const grain = int(state.rng, 'fate', FATE.SLAUGHTER_GRAIN[0], FATE.SLAUGHTER_GRAIN[1]);
      state.village.grain += grain;
      state.herd.pigs = Math.max(0, state.herd.pigs - 1);
      moraleBy(state, FATE.SLAUGHTER_MORALE);
      params['grain'] = grain;
      visible.push({ k: 'gather', where: 'square', days: 1 });
      break;
    }
    case 'rats_in_the_granary': {
      const lost = Math.round(state.village.grain * FATE.RATS_GRAIN_LOSS);
      state.village.grain = Math.max(0, state.village.grain - lost);
      moraleBy(state, FATE.RATS_MORALE);
      params['grain'] = lost;
      visible.push({ k: 'gather', where: 'square', days: 1 });
      break;
    }
    case 'stranger_passes': {
      moraleBy(state, FATE.STRANGER_MORALE);
      // M-0 · y paga la cama: la primera plata de un valle joven.
      state.village.silver += FATE.STRANGER_SILVER;
      params['silver'] = FATE.STRANGER_SILVER;
      visible.push({ k: 'gather', where: 'square', days: 1 });
      weight = 1;
      break;
    }
    default:
      break;
  }

  return {
    record: { tick: state.tick, id, visible, who },
    entry: { kind: 'happening', templateKey: key, params, weight },
  };
}

/**
 * Paso 2b del tick (§4.2). Una tirada por semana contra `FATE.WEEKLY_CHANCE`;
 * si sale, el sorteo por peso entre los sucesos que hoy pueden pasar. Nunca
 * dos semanas seguidas: un suceso pegado a otro no se lee, se apila.
 *
 * Devuelve `null` casi siempre. Cuando no, el estado ya está cambiado y el
 * tick sólo tiene que contar y enseñar.
 */
/**
 * M-1 · Cuánto pesa un suceso **ahora mismo**, con el estado delante.
 *
 * Lo mismo que `rollFate` usa para sortear, expuesto para poder medirlo: lo que
 * M-1 promete es que el peso de lo que destruye **va con lo que la aldea ha
 * acumulado** (más ganado, más lobos; más bosque talado, más riada), y eso se
 * comprueba comparando dos estados, no jugando cien partidas y mirando el
 * resultado. `tools/reports/fate-report.ts` puede usarlo igual.
 */
export function weightNow(state: GameState, id: HappeningId): number {
  return weightOf(state, id, {
    season: seasonOf(state.tick),
    week: weekOf(state.tick),
    sky: weekWeather(state.seed, state.weather.index, state.tick),
    people: population(state),
  });
}

export function rollFate(state: GameState): FateOutcome | null {
  const ctx: Context = {
    season: seasonOf(state.tick),
    week: weekOf(state.tick),
    sky: weekWeather(state.seed, state.weather.index, state.tick),
    people: population(state),
  };
  // Los ritos no se sortean: la fiesta de la cosecha se celebra si se puede.
  // Va antes del hueco mínimo porque una fiesta pegada a otro suceso no se
  // apila: es la semana de la siega y punto.
  if (FATE.FEAST_IS_A_RITE && feastDue(state, ctx)) return happen(state, 'harvest_feast', ctx);
  // M-2 · **y el barril es un rito pagado.** El jugador lo ha comprado esta
  // semana, así que la fiesta se celebra: no se sortea, no espera hueco y no
  // compite con nada. Es la única forma de que un medio se vea el mismo día.
  if (state.flags['ale'] === state.tick + MEANS.ALE_WEEKS) return happen(state, 'ale_feast', ctx);

  const last = state.happenings[state.happenings.length - 1];
  if (last !== undefined && state.tick - last.tick < FATE.MIN_GAP_WEEKS) return null;
  // La densidad va con la gente que hay (`FATED_FULL_PEOPLE`,
  // `FATED_LEAST_SHARE`, y el motivo largo está en `balance.ts`): la tirada
  // plana daba la misma cadencia a una pareja que a una aldea de cuarenta.
  const share = Math.max(
    FATE.FATED_LEAST_SHARE,
    Math.min(1, ctx.people / FATE.FATED_FULL_PEOPLE),
  );
  if (next(state.rng, 'fate') >= FATE.WEEKLY_CHANCE * share) return null;
  const candidates = HAPPENINGS.filter((id) => weightOf(state, id, ctx) > 0);
  if (candidates.length === 0) return null;
  const id = weighted(state.rng, 'fate', candidates, (c) => weightOf(state, c, ctx));
  return happen(state, id, ctx);
}
