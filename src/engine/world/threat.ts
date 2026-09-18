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
import { hasTrait, type GameState, type HerdKind } from '../state';
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
   */
  kind: 'coming' | 'sacked' | 'turned_back' | 'stormed';
  /** Con cuántos vienen o vinieron. */
  band: number;
  /** El saqueo, cuando `kind` es `sacked` o `stormed`. */
  sack: Sack | null;
  /**
   * B3 · Cuántos cayeron defendiendo, sólo cuando entran.
   *
   * Es la primera vez que este sistema mata a alguien, y es deliberado: lo que
   * acaba una partida tiene que costar gente o no es un final, es un número.
   */
  fallen: number;
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
    && standing.some((b) => b.kind === 'palisade' || b.kind === 'wall');
}

/**
 * El paso del clan, una vez al año. Devuelve el saqueo si esta semana llegaron.
 *
 * **Una tirada al año y en la semana 0**, como la migración y el clima: lo que
 * se decide es si el vecino se organiza esta temporada, no si esta semana le
 * apetece. Que la partida tarde en llegar (`WARNING_WEEKS`) es lo que deja
 * sitio para el aviso de B2.
 */
export function advanceThreat(state: GameState): ThreatEvent | null {
  const year = yearOf(state.tick);

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
      return { kind: 'coming', band: state.threat.comingBand, sack: null, fallen: 0 };
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
    return { kind: 'turned_back', band, sack: null, fallen: 0 };
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
  if (band >= resistance(state) * THREAT.STORM_ODDS) {
    const taken = storm(state);
    return { kind: 'stormed', band, sack: taken.sack, fallen: taken.fallen };
  }
  return { kind: 'sacked', band, sack: arrive(state), fallen: 0 };
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

  // Los que defendían. `defenders` dice cuántos subieron, y mueren los mayores
  // primero por la razón más simple: el que sube a la muralla de un pueblo no es
  // el niño, y `LIFE.ADULT` ya dice quién es adulto.
  const fighters = state.people.villagers
    .filter((v) => v.diedTick === null && v.leftTick === null)
    .sort((a, b) => a.bornTick - b.bornTick)
    .slice(0, defenders(state));
  for (const fighter of fighters) {
    fighter.diedTick = state.tick;
    fighter.causeOfDeath = 'violence';
  }

  state.threat.comingTick = null;
  state.threat.comingBand = 0;
  state.threat.raids += 1;
  state.threat.arrivedTick = state.tick;
  state.threat.lastBand = band;
  state.ended = {
    tick: state.tick,
    cause: 'stormed',
    lastId: fighters.at(-1)?.id ?? null,
  };
  // **Sin campo nuevo en el esquema**: cuántos cayeron sólo hace falta esta
  // semana, para la línea de crónica, así que vuelve por aquí en vez de
  // guardarse. Un número más que migrar por un titular no vale la pena.
  return { sack: { band, silver, grain, beast, walled: walled(state) }, fallen: fighters.length };
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
  return { band, silver, grain, beast, walled: behindWall };
}
