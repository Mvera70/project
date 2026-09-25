// B1 · El clan del valle vecino. design.md §1b.
//
// **Quien ataca es otro valle**, y lo decidió el dueño del diseño el 18 sep
// 2026: no bandidos, no el señor de Wealdmere —esos siguen donde están, el
// ladrón del granero y el diezmo— sino un clan que crece en la ladera de al
// lado y que un día baja.
//
// De esa elección salen las dos mitades de este módulo, y conviene no
// mezclarlas nunca:
//
//  · **Lo que el clan junta corre con los años.** Es un valle que se desarrolla
//    en paralelo al tuyo y que no sabe que existes, así que crece igual en un
//    caserío miserable que en una villa rica. Con su propia variación, para que
//    dos partidas no tengan el mismo vecino.
//  · **Lo que tú has juntado decide si bajan y con cuántos.** Eso es §1 —«la
//    fuente de letalidad es la acumulación de lo que el jugador metió»— visto
//    desde la otra ladera: lo que se ve desde fuera (plata, grano, ganado) es
//    el premio, y un premio grande trae a más gente.
//
// **Lo que este módulo NO hace, y es deliberado:** resolver la batalla. La
// mitad grande de «caer» —el ejército que entra, rompe y mata— se resuelve en
// físico y no es determinista (§1b), y no está hecha. Lo que hay aquí es la
// mitad pequeña que el dueño ya decidió: **entran, se llevan lo que pueden y se
// van**, y la aldea sigue con lo que queda.

import { THREAT, TIME } from '../balance';
import { defenders, resistance } from './garrison';
import { flagSet } from '../crossroads/conditions';
import { next } from '../rng';
import { hasTrait, TERRAIN_CODE, type GameState, type HerdKind } from '../state';
import { burnBuilding } from './buildings';
import { yearOf } from '../time';

/**
 * B2 · Lo que el paso del clan deja esta semana: o el aviso de que vienen, o lo
 * que se llevaron al llegar. Nunca las dos cosas a la vez.
 */
export interface ThreatEvent {
  /**
   * `coming` el aviso, `turned_back` los que cobraron y se fueron, `sacked` el
   * asalto que se aguanta, y **`stormed` el que no**: B3, la mitad grande de
   * «caer» (§1b). Un valle tomado no vuelve: `state.ended` queda puesto.
   *
   * B4 mete dos más, y son las dos mitades de una misma semana: `assault` es
   * «están en el portón y esto no aguanta», que se cuenta **la semana que
   * llegan**, y `held`/`stormed` es cómo acabó, que se resuelve **la siguiente**
   * —con el parte de la batalla física si alguien la peleó, y con la cuenta de
   * B3 si nadie miró—. Esa semana de espera es lo que deja que la pelea tenga
   * la última palabra sin que el motor tenga que deshacer nada.
   */
  kind: 'coming' | 'sacked' | 'turned_back' | 'assault' | 'held' | 'stormed';
  /** Con cuántos vienen o vinieron. */
  band: number;
  /** El saqueo, cuando `kind` es `sacked` o `stormed`. */
  sack: Sack | null;
  /**
   * B3 · Cuántos cayeron defendiendo, sólo cuando hay pelea.
   *
   * Es la primera vez que este sistema mata a alguien, y es deliberado: lo que
   * acaba una partida tiene que costar gente o no es un final, es un número.
   */
  fallen: number;
  /**
   * B4 · Y cuántos del clan quedaron en el valle, si alguien peleó la batalla.
   *
   * Cero cuando nadie la peleó, y eso es exacto: sin parte no se sabe qué les
   * costó, así que no se inventa. Lo que sí baja igual es su fuerza, porque los
   * que se dejaron aquí no vuelven (`settle`).
   */
  slain: number;
  /**
   * E4 · Las flechas incendiarias de un asalto aguantado: cuántas casas ardieron
   * y cuántas salvó la aldea con cubos. `null` cuando no hubo flechas.
   */
  fired?: { burnt: number; saved: number } | null;
}

/** Lo que un asalto se lleva, para que la crónica pueda contarlo. */
export interface Sack {
  band: number;
  silver: number;
  grain: number;
  /** El animal que se llevaron, o `null` si no había ninguno suelto. */
  beast: HerdKind | null;
  /** Si la aldea lo recibió tras su muralla cerrada. */
  walled: boolean;
  /** E4 · Cuántas casas quemaron al irse (o al entrar, si la tomaron). */
  burnt: number;
}

/**
 * Lo que este valle vale visto desde la ladera de enfrente.
 *
 * **Lo que se ve, no lo que se tiene**: la plata, el grano del granero y el
 * ganado suelto por el prado. Las casas no cuentan —nadie baja de la sierra por
 * unas vigas— y la gente tampoco: un valle con mucha gente no es más apetecible,
 * es más difícil.
 */
export function worthOf(state: GameState): number {
  return state.village.silver * THREAT.WORTH_PER_SILVER
    + state.village.grain * THREAT.WORTH_PER_GRAIN
    + state.herd.hens * THREAT.WORTH_PER_HEN
    + state.herd.pigs * THREAT.WORTH_PER_PIG
    + state.herd.cows * THREAT.WORTH_PER_COW;
}

/**
 * Cuánto tienta, de cero a uno.
 *
 * C1 · **Y los arcos descuentan**: un valle del que se sabe que dispara desde
 * la cerca tienta menos. Se aplica aquí y no en el tamaño de la partida porque
 * la disuasión es sobre la decisión de venir, no sobre cuántos vienen — lo
 * segundo lo empeora, que es la cara mala del que se arma.
 */
function temptation(state: GameState): number {
  const worth = worthOf(state) * (hasTrait(state, 'bows') ? THREAT.BOWS_TEMPTATION : 1);
  return Math.max(0, Math.min(1, worth / THREAT.WORTH_FULL));
}

/**
 * A2 · **Si la aldea está cerrada**: tiene su anillo con el portón en pie.
 *
 * No pregunta si el anillo está completo (`ringClosed`) sino si hay muralla y
 * puerta, que es lo que cambia lo que un saqueador puede hacer: un pueblo con
 * un cerco y una puerta se defiende peor o mejor, pero se defiende; uno abierto
 * no tiene ni dónde plantarse.
 */
function walled(state: GameState): boolean {
  const standing = state.buildings.filter((b) => b.lostTick === null);
  return standing.some((b) => b.kind === 'gate')
    // A3 · el bastión es una pieza de muralla, así que cuenta como ella.
    && standing.some((b) => b.kind === 'palisade' || b.kind === 'wall' || b.kind === 'bastion');
}

/**
 * El paso del clan, una vez al año. Devuelve el saqueo si esta semana llegaron.
 *
 * **Una tirada al año y en la semana 0**, como la migración y el clima: lo que
 * se decide es si el vecino se organiza esta temporada, no si esta semana le
 * apetece. Que la partida tarde en llegar (`WARNING_WEEKS`) es lo que deja
 * sitio para el aviso de B2.
 */
export function advanceThreat(state: GameState, battle?: Battle): ThreatEvent | null {
  const year = yearOf(state.tick);

  // B4 · **0 · ¿Hay un asalto de la semana pasada por resolver?**
  //
  // Va primero porque es de la semana anterior, y porque un valle tomado no
  // tiene nada más que resolver este año. La marca la puso `arrive` y dura una
  // semana: si nadie peleó la batalla, la cuenta de B3 decide (fue ella la que
  // marcó), y si alguien la peleó, **manda el parte** (§1b).
  const pending = state.flags['assault'];
  if (pending !== undefined) {
    delete state.flags['assault'];
    return settle(state, battle);
  }

  // 1 · El vecino crece, pase lo que pase aquí.
  if (state.tick % TIME.WEEKS_PER_YEAR === 0 && state.tick > 0) {
    const spread = (next(state.rng, 'raid') * 2 - 1) * THREAT.GROWTH_SPREAD;
    state.threat.strength = Math.min(THREAT.STRENGTH_CAP,
      state.threat.strength + THREAT.GROWTH_PER_YEAR * (1 + spread));
  }

  // 2 · ¿Baja este año? Sólo se pregunta si no hay ya una partida en camino.
  if (state.tick % TIME.WEEKS_PER_YEAR === 0
    && state.threat.comingTick === null
    && year >= THREAT.MIN_YEAR) {
    // B2 · y el que cobró una vez vuelve antes: es lo que cuesta pagar.
    const chance = THREAT.YEARLY_CHANCE * temptation(state)
      * (flagSet(state, 'known_to_pay') ? THREAT.KNOWN_TO_PAY_CHANCE : 1);
    if (next(state.rng, 'raid') < chance) {
      const share = THREAT.BAND_LEAST_SHARE
        + (1 - THREAT.BAND_LEAST_SHARE) * temptation(state);
      // C1 · la atalaya los ve venir antes: el aviso pasa de ocho semanas a
      // catorce, que es tiempo para hacer algo con él (B2).
      const warning = hasTrait(state, 'watch')
        ? THREAT.WATCH_WARNING_WEEKS
        : THREAT.WARNING_WEEKS;
      state.threat.comingTick = state.tick + warning;
      // Y los arcos, su cara mala: quien se arma deja de ser un sitio al que se
      // va a robar y pasa a ser un sitio al que hay que ir en serio.
      const band = state.threat.strength * share
        * (hasTrait(state, 'bows') ? THREAT.BOWS_BAND : 1);
      state.threat.comingBand = Math.max(THREAT.BAND_MIN, Math.round(band));
      // B2 · **y el valle se entera.** Lo que hace que las ocho semanas de
      // `WARNING_WEEKS` sirvan de algo: alguien los vio en el camino, y a
      // partir de aquí `crisisOf` deja pasar la pregunta de §8.6 por encima
      // del techo hasta que lleguen.
      return { kind: 'coming', band: state.threat.comingBand, sack: null, fallen: 0, slain: 0 };
    }
  }

  // 3 · ¿Llegan esta semana?
  if (state.threat.comingTick === null || state.tick < state.threat.comingTick) return null;

  // B2 · **si se les pagó, se dan la vuelta.** La plata la cobró la opción de
  // la encrucijada al contestarla; lo que hace la marca es que no lleguen. Es
  // el trato de A.1 para lo que el DSL de §8.4 no sabe decir: la decisión se
  // apunta como bandera y la mecánica se queda con quien la posee.
  if (flagSet(state, 'bought_off')) {
    const band = state.threat.comingBand;
    state.threat.comingTick = null;
    state.threat.comingBand = 0;
    return { kind: 'turned_back', band, sack: null, fallen: 0, slain: 0 };
  }
  // B3 · **¿Entran, o sólo saquean?** La mitad grande de «caer» (§1b), y la
  // decisión del dueño del diseño del 18 sep: «un asalto pequeño se aguanta o se
  // sufre; uno grande que rompa el portón y entre entero acaba la partida».
  //
  // Se compara la partida con lo que el valle pone contra ella —las manos del
  // cerco más lo que vale el cerco (`world/garrison.ts`)— y hace falta triplicar
  // esa cuenta para tomar el sitio, que es la regla de asedio de siempre. Lo que
  // hace que esto sea letalidad **por las decisiones** y no por un dado: las dos
  // mitades de la cuenta las escribió el jugador. La partida crece con lo que la
  // aldea acumuló y tienta (§1); la resistencia es lo que se le dio.
  const band = state.threat.comingBand;
  // **La cuenta de B3 decide si esto es un asalto o un saqueo**, pero ya no lo
  // resuelve aquí: lo marca. El saqueo se cobra igual —están en el portón y se
  // llevan lo que alcanzan— y lo que queda en el aire es si entran, que es lo
  // que la batalla física va a contestar (B4).
  const assault = band >= resistance(state) * THREAT.STORM_ODDS;
  const sack = arrive(state);
  if (!assault) return { kind: 'sacked', band, sack, fallen: 0, slain: 0 };
  state.flags['assault'] = state.tick + 1;
  return { kind: 'assault', band, sack, fallen: 0, slain: 0 };
}

/**
 * B4 · **El parte de la batalla física**, tal como llega del mundo (§1b).
 *
 * No es un tipo del motor porque no es una decisión del motor: es lo que la
 * capa de vida vio pasar. Llega por `PlayerAct` (`kind: 'battle'`).
 */
export interface Battle {
  slain: number;
  lost: number;
  breached: boolean;
}

/**
 * B4 · Cómo acabó el asalto de la semana pasada.
 *
 * **Con parte, manda el parte; sin parte, manda la cuenta.** Las dos ramas
 * hacen lo mismo con lo que la pelea costó —el clan pierde los hombres que
 * perdió, la aldea los suyos— y se diferencian en una sola cosa: si entraron.
 *
 * Y lo que el clan pierde **se queda perdido**: `threat.strength` baja, así que
 * una defensa que mata a veinte hombres compra años de paz. Ésa es la
 * consecuencia que hace que valga la pena mirar la batalla en vez de dejar que
 * el motor la resuelva solo, y es la primera vez que lo que pasa en pantalla
 * cambia el mundo.
 */
function settle(state: GameState, battle?: Battle): ThreatEvent {
  const band = state.threat.lastBand;
  const slain = Math.max(0, Math.min(band, battle?.slain ?? 0));
  const lost = battle?.lost ?? 0;

  // **Y el parte no salva por existir: salva si adelgazó la partida.** La
  // primera versión se creía el `breached` del parte tal cual, y con la escena
  // de hoy —donde nadie puede romper el portón todavía (D5)— eso hacía que
  // mirar la pantalla volviera al valle inmortal. Lo que de verdad decide es lo
  // que queda en pie: si a los que siguen enteros les sigue sobrando para tomar
  // el sitio, entran igual, y si la muralla los ha dejado por debajo de la
  // cuenta de B3, el asalto se rompe contra ella. Así lo que salva al valle es
  // **lo que la defensa hizo**, no que alguien estuviera mirando.
  //
  // El `breached` del parte manda en la otra dirección, y ahí sí es absoluto:
  // si la escena vio entrar a alguien, entraron, dijera lo que dijera la cuenta.
  // Eso es lo que hará que D5 —el portón que cede— pueda perder una partida que
  // los números daban por salvada, que es §1b: la pelea decide.
  const left = band - slain;
  const breached = battle === undefined
    || battle.breached
    || left >= resistance(state) * THREAT.STORM_ODDS;

  // Los hombres que el clan dejó en el valle no vuelven a bajar.
  if (slain > 0) {
    state.threat.strength = Math.max(0, state.threat.strength - slain);
  }
  // Y los nuestros, si el parte dice que cayeron. Sin parte los cuenta `storm`.
  const ours = breached ? 0 : Math.min(lost, defenders(state));
  const buried = fall(state, ours);

  if (!breached) {
    // E4 · el cerco aguantó, pero desde fuera prendieron tejados.
    const fired = fireArrows(state, band);
    return { kind: 'held', band, sack: null, fallen: buried, slain, fired };
  }
  const taken = storm(state);
  return { kind: 'stormed', band, sack: taken.sack, fallen: taken.fallen + buried, slain };
}

/**
 * Entierra a `howMany` de los que defendían, los mayores primero.
 *
 * Los mayores por la razón más simple: el que sube a la muralla de un pueblo no
 * es el niño. Devuelve cuántos de verdad cayeron, que puede ser menos de los
 * que se piden si la aldea no tiene tanta gente.
 */
function fall(state: GameState, howMany: number): number {
  if (howMany <= 0) return 0;
  const fighters = state.people.villagers
    .filter((v) => v.diedTick === null && v.leftTick === null)
    .sort((a, b) => a.bornTick - b.bornTick)
    .slice(0, howMany);
  for (const fighter of fighters) {
    fighter.diedTick = state.tick;
    fighter.causeOfDeath = 'violence';
  }
  return fighters.length;
}

/**
 * E4 · **Queman las casas de madera más cercanas a por donde entraron.**
 *
 * El portón si lo hay y, si no, el centro del mapa, que es donde está la aldea.
 * Por distancia y, a igualdad, por id: sin dados, así que el mismo asalto quema
 * siempre las mismas casas. `spareLast` guarda la última casa en pie, como el
 * rayo: el saqueo no puede dejar a la aldea sin techo. Devuelve cuántas quemó.
 */
function torch(state: GameState, howMany: number, spareLast: boolean): number {
  if (howMany <= 0) return 0;
  const gate = state.buildings.find((b) => b.kind === 'gate');
  const from = gate === undefined
    ? { x: state.map.width / 2, y: state.map.height / 2 }
    : { x: gate.x + gate.w / 2, y: gate.y + gate.h / 2 };
  const roofs = state.buildings.filter((b) => b.lostTick === null && (b.kind === 'house' || b.kind === 'stone_house')).length;
  const wooden = state.buildings
    .filter((b) => b.lostTick === null && b.kind === 'house' && b.tier === 0)
    .sort((a, b) => Math.hypot(a.x + a.w / 2 - from.x, a.y + a.h / 2 - from.y)
      - Math.hypot(b.x + b.w / 2 - from.x, b.y + b.h / 2 - from.y) || a.id - b.id);
  const allowed = spareLast ? Math.min(howMany, Math.max(0, roofs - 1)) : howMany;
  const doomed = wooden.slice(0, allowed);
  for (const house of doomed) burnBuilding(state, house.id);
  return doomed.length;
}

/**
 * E4 · **Flechas incendiarias contra un cerco que aguanta.**
 *
 * Los tejados de madera más cercanos a la muralla —la estacada, la muralla, el
 * portón o el bastión—, uno o dos según la fuerza del clan. Cada uno se salva si
 * tiene agua a `THREAT.SAVE_REACH` (la aldea llega con cubos: marca
 * `doused:<id>`, que la pantalla enseña como un fuego que se apaga) o arde
 * entero (`burnBuilding`). Sin dados.
 */
function fireArrows(state: GameState, band: number): { burnt: number; saved: number } {
  const ring = state.buildings.filter((b) => b.lostTick === null
    && (b.kind === 'palisade' || b.kind === 'wall' || b.kind === 'gate' || b.kind === 'bastion'));
  if (ring.length === 0) return { burnt: 0, saved: 0 };
  const centre = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const toRing = (b: { x: number; y: number; w: number; h: number }): number => {
    const c = centre(b);
    return Math.min(...ring.map((r) => Math.hypot(centre(r).x - c.x, centre(r).y - c.y)));
  };
  const roofs = band >= resistance(state) ? THREAT.ARROW_ROOFS_STRONG : THREAT.ARROW_ROOFS;
  const targets = state.buildings
    .filter((b) => b.lostTick === null && b.kind === 'house' && b.tier === 0)
    .sort((a, b) => toRing(a) - toRing(b) || a.id - b.id)
    .slice(0, roofs);
  const water = waterPoints(state);
  for (const key of Object.keys(state.flags)) {
    if (key.startsWith('doused:') && (state.flags[key] ?? 0) <= state.tick) delete state.flags[key];
  }
  let burnt = 0;
  let saved = 0;
  for (const house of targets) {
    const c = centre(house);
    const near = water.some((w) => Math.hypot(w.x - c.x, w.y - c.y) <= THREAT.SAVE_REACH);
    if (near) {
      state.flags[`doused:${house.id}`] = state.tick + 1;
      saved += 1;
    } else {
      burnBuilding(state, house.id);
      burnt += 1;
    }
  }
  return { burnt, saved };
}

/** Dónde hay agua para los cubos: los pozos en pie, el río y el lago. */
function waterPoints(state: GameState): { x: number; y: number }[] {
  const points = state.buildings
    .filter((b) => b.kind === 'well' && b.lostTick === null)
    .map((b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 }));
  const { width, terrain } = state.map;
  for (let cell = 0; cell < terrain.length; cell += 1) {
    const t = terrain[cell];
    if (t === TERRAIN_CODE.water || t === TERRAIN_CODE.lake) {
      points.push({ x: cell % width + 0.5, y: Math.floor(cell / width) + 0.5 });
    }
  }
  return points;
}

/**
 * B3 · **Entran, y se acaba.**
 *
 * Lo que §1b describe con las palabras del dueño: «que el ejército rival consiga
 * entrar y rompa todo». Así que se llevan **todo** lo que se ve —la plata, el
 * grano, el corral entero—, el portón y la estacada que rodearon quedan
 * perdidos como ruinas, **los que defendían mueren**, y la partida termina con
 * una causa que no existía: `stormed`.
 *
 * **Y no mata a todo el mundo**, a propósito. Los otros tres finales dejan el
 * valle a cero porque son un valle que se acaba; éste es un valle **tomado**, y
 * quien no estaba en la muralla sigue vivo cuando la crónica se cierra. Eso es
 * lo que hace que la última línea pueda tener un nombre y una viuda, que es lo
 * que §9.2 pide de un titular de peso 3.
 *
 * Lo que aquí **no** se decide: cómo se ve (D6), qué se rompe exactamente en
 * pantalla (D5), ni si la batalla física podría haberlo evitado (B4). Esto es
 * lo que pasa cuando nadie ha mirado la pelea.
 */
function storm(state: GameState): { sack: Sack; fallen: number } {
  const band = state.threat.comingBand;
  const silver = state.village.silver;
  const grain = state.village.grain;
  state.village.silver = 0;
  state.village.grain = 0;
  let beast: HerdKind | null = null;
  for (const kind of ['cows', 'pigs', 'hens'] as const) {
    if (state.herd[kind] > 0 && beast === null) beast = kind;
    state.herd[kind] = 0;
  }

  // El cerco roto: el portón primero, que es por donde entraron, y con él las
  // estacas de al lado. Son ruinas como cualquier otra pérdida (§7.4), así que
  // la pantalla ya sabe enseñarlas sin que nadie escriba nada.
  const gate = state.buildings.find((b) => b.kind === 'gate' && b.lostTick === null);
  if (gate !== undefined) {
    gate.lostTick = state.tick;
    for (const wall of state.buildings) {
      if (wall.lostTick !== null) continue;
      if (wall.kind !== 'palisade' && wall.kind !== 'wall') continue;
      if (Math.max(Math.abs(wall.x - gate.x), Math.abs(wall.y - gate.y)) > THREAT.BREACH) continue;
      wall.lostTick = state.tick;
    }
  }

  // Los que defendían: los sube `defenders` y los entierra `fall`.
  const buried = fall(state, defenders(state));
  // E4 · y la calle del portón arde: es lo que la lápida enseña.
  const burnt = torch(state, THREAT.STORM_BURN, false);

  state.threat.comingTick = null;
  state.threat.comingBand = 0;
  state.threat.raids += 1;
  state.threat.arrivedTick = state.tick;
  state.threat.lastBand = band;
  state.ended = {
    tick: state.tick,
    cause: 'stormed',
    lastId: state.people.villagers
      .filter((v) => v.diedTick === state.tick && v.causeOfDeath === 'violence')
      .at(-1)?.id ?? null,
  };
  // **Sin campo nuevo en el esquema**: cuántos cayeron sólo hace falta esta
  // semana, para la línea de crónica, así que vuelve por aquí en vez de
  // guardarse. Un número más que migrar por un titular no vale la pena.
  return { sack: { band, silver, grain, beast, walled: walled(state), burnt }, fallen: buried };
}

/**
 * Llegan, se llevan lo que pueden y se van.
 *
 * **Esta es la mitad pequeña de «caer»** (§1b) y la única que se puede resolver
 * sin la batalla física. Lo que se llevan sale de lo que hay, no de una tabla:
 * una parte de la plata y del grano, y una cabeza del corral si la hay. La
 * muralla cerrada con su puerta les quita las tres cuartas partes del botín.
 */
function arrive(state: GameState): Sack {
  const band = state.threat.comingBand;
  const behindWall = walled(state);
  // B2 · la aldea que se preparó esconde la mitad de lo que se llevarían.
  const braced = flagSet(state, 'braced');
  // C1 · y las armas: la aldea que las tiene se lleva menos golpe. Unas lanzas
  // en la herrería no son una guarnición —eso es la fase 4— pero un valle con
  // hierro en las manos no es un valle que se deja saquear.
  const share = THREAT.SACK_SHARE
    * (behindWall ? THREAT.WALLED_SACK : 1)
    * (braced ? THREAT.BRACED_SACK : 1)
    * (hasTrait(state, 'arms') ? THREAT.ARMS_SACK : 1);

  const silver = Math.round(state.village.silver * share);
  const grain = Math.round(state.village.grain * share);
  state.village.silver -= silver;
  state.village.grain -= grain;

  // Una cabeza, la mayor que haya: un saqueador se lleva la vaca antes que la
  // gallina. A campo abierto; tras la muralla el ganado está dentro.
  let beast: HerdKind | null = null;
  if (!behindWall && !braced) {
    for (const kind of ['cows', 'pigs', 'hens'] as const) {
      if (state.herd[kind] > 0) { state.herd[kind] -= 1; beast = kind; break; }
    }
  }

  state.threat.comingTick = null;
  state.threat.comingBand = 0;
  state.threat.raids += 1;
  // D3 · y queda apuntado que llegaron, para que la jornada pueda enseñarlos.
  state.threat.arrivedTick = state.tick;
  state.threat.lastBand = band;
  // B2 · la semana de después: `after_the_raid` pregunta qué se hace con lo que
  // queda mientras esta marca dure. Un año, que es lo que una aldea tarda en
  // dejar de hablar de ello.
  state.flags['just_sacked'] = state.tick + TIME.WEEKS_PER_YEAR;
  // E4 · a una aldea abierta le queman una casa al irse; tras la muralla no
  // entraron, y nunca la última casa.
  const burnt = behindWall ? 0 : torch(state, THREAT.SACK_BURN, true);
  return { band, silver, grain, beast, walled: behindWall, burnt };
}
