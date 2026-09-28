// Las expediciones (28 sep 2026). design.md §7.13.
//
// Lo pidió el dueño del diseño con estas palabras: «el jugador podrá decidir si
// mandar a uno o a X trabajadores adultos a cumplir algún objetivo. Las
// primeras simples, como ir al bosque a recolectar setas, y luego
// complicándose, como ir a la montaña. […] Las más avanzadas costarán dinero,
// y la gente puede volver con vida o no, o no haber conseguido el objetivo, o
// sí lograrlo y volver con la recompensa: un juego de doble filo».
//
// **El jugador dice cuántos; la aldea dice quiénes.** Es el principio del carro
// (M-2: «tú no les dices qué hacer») aplicado a una misión: se mandan manos, y
// la aldea elige a los que mejor sirven —el herbolario al bosque, el herrero a
// la veta—, nunca a quien la manda, y siempre deja gente en casa.
//
// **Los que se van, se van de verdad.** Mientras dura, cada uno lleva
// `leftTick` puesto, que es la palabra de §5.7 para «no está en el valle»: no
// trabaja, no come del granero, no cuenta para el cerco, y la capa de vida no
// le da cuerpo en casa. Al volver se le quita. No hay un segundo «no está»
// que cada sistema tuviera que aprender a leer; lo que distingue una expedición
// de una partida para siempre es que su id está en `state.expeditions`.
//
// **El resultado se tira al volver, no al salir**, y en su propio flujo
// (`expeditions`): mandar gente no desplaza ninguna otra tirada del mundo, y
// una misma partida con las mismas órdenes vuelve con los mismos muertos.

import { EXPEDITION, LIFE } from '../balance';
import { isHere } from '../people/demography';
import { ageOf } from '../people/villagers';
import { next } from '../rng';
import type { ChronicleEntry, Expedition, ExpeditionEnd, GameState, MissionId, Role, Season, StatName, Villager, VillagerId } from '../state';
import { MISSION_IDS } from '../state';
import { seasonOf } from '../time';

/** Adónde se va: al bosque se les ve; a la montaña y al camino, se les ve irse. */
export type MissionWhere = 'forest' | 'mountain' | 'road';

export interface MissionSpec {
  readonly where: MissionWhere;
  /** Cuántos pueden ir, como poco y como mucho. */
  readonly people: readonly [number, number];
  /** Cuántas semanas están fuera. */
  readonly weeks: number;
  /** Lo que cuesta mandarla, en plata. Se paga al salir, vuelvan o no. */
  readonly silver: number;
  /** Desde cuánta gente en el valle se anuncia. */
  readonly minPeople: number;
  readonly seasons: readonly Season[];
  /** Probabilidad de lograrlo con los mínimos, y lo que suma cada uno de más. */
  readonly success: number;
  readonly perExtra: number;
  /** Probabilidad de que cada uno no vuelva. */
  readonly death: number;
  readonly cause: 'violence' | 'mishap';
  /** Lo que traen si lo logran. Con `perHead`, por cada uno que vuelve. */
  readonly reward: Partial<Record<StatName, number>>;
  readonly perHead: boolean;
  /** Los oficios que la aldea prefiere mandar. */
  readonly roles: readonly Role[];
}

export function missionSpec(id: MissionId): MissionSpec {
  return EXPEDITION.MISSIONS[id] as MissionSpec;
}

/** Las que siguen fuera (las recién vueltas se quedan una semana, con su final). */
export function outNow(state: GameState): Expedition[] {
  return state.expeditions.filter((e) => e.end === null);
}

/** Los que están fuera ahora mismo, en alguna expedición. */
export function awayIds(state: GameState): ReadonlySet<VillagerId> {
  return new Set(outNow(state).flatMap((e) => e.who));
}

/** La expedición en la que está alguien, si está fuera. */
export function expeditionOf(state: GameState, id: VillagerId): Expedition | null {
  return outNow(state).find((e) => e.who.includes(id)) ?? null;
}

function adult(state: GameState, v: Villager): boolean {
  const age = ageOf(v, state.tick);
  return isHere(v) && age >= LIFE.ADULT[0] && age <= LIFE.ADULT[1];
}

/** Quién puede ir: adultos en el valle que no mandan. */
function candidates(state: GameState): Villager[] {
  const crown = state.crown?.id ?? null;
  return state.people.villagers.filter((v) => adult(state, v) && v.role !== 'leader' && v.id !== crown);
}

/** Por qué una misión no se puede mandar ahora, o `null` si se puede. */
export type MissionRefusal = 'season' | 'small' | 'hands' | 'silver' | 'away' | 'ended';

export interface MissionOpen {
  readonly id: MissionId;
  readonly spec: MissionSpec;
  /** `null` si se puede mandar. */
  readonly refusal: MissionRefusal | null;
  /** Cuántos se pueden mandar ahora como mucho (0 si no se puede). */
  readonly most: number;
}

/**
 * Lo que el tablón anuncia esta semana: las misiones que la aldea conoce ya
 * (por gente), con si se pueden mandar y cuántos como mucho. Las que piden más
 * gente de la que hay no se anuncian: el tablón crece con el valle.
 */
export function missionsOpen(state: GameState): MissionOpen[] {
  const people = state.people.villagers.filter(isHere).length + awayIds(state).size;
  const season = seasonOf(state.tick);
  const hands = candidates(state).length - EXPEDITION.MIN_HOME;
  return MISSION_IDS.filter((id) => people >= missionSpec(id).minPeople).map((id) => {
    const spec = missionSpec(id);
    const most = Math.max(0, Math.min(spec.people[1], hands));
    const refusal: MissionRefusal | null = state.ended !== null ? 'ended'
      : outNow(state).some((e) => e.mission === id) ? 'away'
        : !spec.seasons.includes(season) ? 'season'
          : state.village.silver < spec.silver ? 'silver'
            : most < spec.people[0] ? 'hands' : null;
    return { id, spec, refusal, most: refusal === null ? most : 0 };
  });
}

/** Lo que devuelve mandar una: la línea de crónica, o por qué no salió. */
export interface SendOutcome {
  readonly sent: boolean;
  readonly refusal: MissionRefusal | null;
  readonly entry: Omit<ChronicleEntry, 'tick'> | null;
}

/**
 * Paso 1b · el jugador manda `count` a `mission`. La aldea elige quiénes: los
 * del oficio que la misión prefiere, y entre ellos y el resto, los más jóvenes
 * de los adultos —los que mejor andan—, a igualdad por id. Sin dados.
 */
export function sendExpedition(state: GameState, mission: MissionId, count: number, year: number): SendOutcome {
  const open = missionsOpen(state).find((m) => m.id === mission);
  if (open === undefined) return { sent: false, refusal: 'small', entry: null };
  if (open.refusal !== null) return { sent: false, refusal: open.refusal, entry: null };
  const spec = open.spec;
  const n = Math.max(spec.people[0], Math.min(open.most, Math.floor(count)));
  const chosen = candidates(state)
    .sort((a, b) => Number(spec.roles.includes(b.role as Role)) - Number(spec.roles.includes(a.role as Role))
      || b.bornTick - a.bornTick || a.id - b.id)
    .slice(0, n);
  state.village.silver -= spec.silver;
  for (const v of chosen) v.leftTick = state.tick;
  state.expeditions.push({
    mission, who: chosen.map((v) => v.id), sentTick: state.tick, dueTick: state.tick + spec.weeks, end: null, dead: [],
  });
  return {
    sent: true,
    refusal: null,
    entry: {
      kind: 'expedition',
      templateKey: `expedition.${mission}.sent`,
      params: { year, season: seasonOf(state.tick), names: namesOf(state, chosen.map((v) => v.id)), count: chosen.length, silver: spec.silver },
      weight: spec.silver > 0 ? 2 : 1,
    },
  };
}

function namesOf(state: GameState, ids: readonly VillagerId[]): string {
  const names = ids.map((id) => state.people.villagers.find((v) => v.id === id)?.name ?? '?');
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export type { ExpeditionEnd };

export interface ReturnOutcome {
  readonly mission: MissionId;
  readonly end: ExpeditionEnd;
  readonly back: readonly VillagerId[];
  readonly dead: readonly VillagerId[];
  readonly entry: Omit<ChronicleEntry, 'tick'>;
}

/**
 * Paso 1c · vuelven los que tocaba. Una tirada de éxito y una por cabeza, en
 * el flujo `expeditions` y en orden de id, así que el orden de la lista no
 * mueve el resultado.
 */
export function returnExpeditions(state: GameState, year: number): ReturnOutcome[] {
  const out: ReturnOutcome[] = [];
  // Las que volvieron la semana pasada ya se han contado y enseñado.
  state.expeditions = state.expeditions.filter((e) => e.end === null || e.dueTick >= state.tick);
  const due = state.expeditions.filter((e) => e.end === null && e.dueTick <= state.tick);
  for (const trip of due) {
    const spec = missionSpec(trip.mission);
    const extra = Math.max(0, trip.who.length - spec.people[0]);
    const chance = Math.min(EXPEDITION.MAX_SUCCESS, spec.success + spec.perExtra * extra);
    const won = next(state.rng, 'expeditions') < chance;
    const back: VillagerId[] = [];
    const dead: VillagerId[] = [];
    for (const id of [...trip.who].sort((a, b) => a - b)) {
      const v = state.people.villagers.find((x) => x.id === id);
      if (v === undefined) continue;
      v.leftTick = null;
      if (next(state.rng, 'expeditions') < spec.death) {
        v.diedTick = state.tick;
        v.causeOfDeath = spec.cause;
        dead.push(id);
      } else {
        back.push(id);
      }
    }
    state.village.morale = Math.max(0, state.village.morale + EXPEDITION.GRIEF * dead.length);
    // Como toda muerte: fuera de la lista de personajes (`demography.ts`).
    if (dead.length > 0) state.people.namedIds = state.people.namedIds.filter((id) => !dead.includes(id));
    const end: ExpeditionEnd = back.length === 0 ? 'lost'
      : won ? (dead.length > 0 ? 'back_mourning' : 'back')
        : (dead.length > 0 ? 'empty_mourning' : 'empty');
    trip.end = end;
    trip.dead = dead;
    trip.dueTick = state.tick;
    const params: Record<string, string | number> = {
      year, names: namesOf(state, back), dead: namesOf(state, dead), count: back.length, fallen: dead.length,
    };
    if (end === 'back' || end === 'back_mourning') {
      for (const [stat, amount] of Object.entries(spec.reward) as [StatName, number][]) {
        const got = Math.round(amount * (spec.perHead ? back.length : 1));
        state.village[stat] = stat === 'morale' || stat === 'faith'
          ? Math.min(100, state.village[stat] + got) : state.village[stat] + got;
        params[stat] = got;
      }
    }
    out.push({
      mission: trip.mission, end, back, dead,
      entry: {
        kind: 'expedition',
        // La vuelta con lo prometido tiene su frase por misión; las otras
        // cuatro, por sitio (bosque, montaña, camino): lo que se cuenta de un
        // fracaso es dónde fue, no qué se buscaba.
        templateKey: end === 'back' ? `expedition.${trip.mission}.back` : `expedition.${end}.${spec.where}`,
        params,
        weight: dead.length > 0 ? 3 : spec.silver > 0 || end === 'back' ? 2 : 1,
      },
    });
  }
  return out;
}
