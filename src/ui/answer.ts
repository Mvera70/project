// E4 · La aldea contesta. docs/plan-juego.md, §5.2, §11.6.
//
// **Una orden que no se puede obedecer y no lo dice es una orden que parece no
// hacer nada.** El jugador pone «sembrar de más», la aldea no tiene más campos
// que arar, y en pantalla no pasa nada: desde fuera eso es idéntico a un mando
// roto. Era la mitad de «los recursos no sirven para nada» — no porque no
// sirvieran, sino porque no contestaban.
//
// Lo que hay aquí es puro: compara lo que el jugador pidió con lo que
// `allocateLabour` pudo dar, y devuelve **una clave del banco**, nunca una
// frase (§9.3: los sistemas empujan claves y parámetros). Quien la pinta es el
// aviso de §11.6, que es la voz que ya tiene el juego para «ha pasado algo»: una
// segunda voz para «no se ha podido» sería otro lenguaje visual que aprender.
//
// Y se dice **una vez por orden dada**, no cada semana: un roce que se repite
// cincuenta veces deja de ser una respuesta y se convierte en una regañina.

import { FOOD, LABOUR, TIME } from '@engine/balance';
import { population, workforce } from '@engine/people/demography';
import type { GameState } from '@engine/state';
import { count } from '@engine/subsistence/building-counts';
import { allocateLabour } from '@engine/subsistence/labour';

/** Lo que la aldea tiene que decir de la última orden, o nada si la cumplió. */
export interface Answer {
  /** Clave del banco (`BANK`). Nunca una frase. */
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/**
 * Por qué la aldea no está haciendo lo que se le pidió, si es que no lo hace.
 *
 * Sólo los roces que el jugador puede **arreglar**, y eso descarta más de los
 * que parece. Que el granero esté vacío no es un roce: es una consecuencia, y ya
 * la cuenta la crónica. Un roce es «te he entendido y no puedo», que es la única
 * cosa que el jugador no puede deducir mirando el valle.
 */
export function answerFor(state: GameState): Answer | null {
  const hands = allocateLabour(state);
  const people = population(state);
  if (people === 0) return null;

  // ---- La siembra ------------------------------------------------------
  // Cuántos campos pidió el jugador, con la misma cuenta que `allocateLabour`.
  const asked = Math.ceil(
    (people * TIME.WEEKS_PER_YEAR * FOOD.NEEDED_FIELDS_MARGIN * state.intent.fields)
    / FOOD.FIELD_YIELD,
  );
  const have = count(state, 'field');
  const crewable = Math.floor((workforce(state) * (1 - LABOUR.WORKS_RESERVE)) / FOOD.MIN_FIELD_CREW);

  if (hands.workedFields < asked) {
    // Dos causas distintas y el jugador hace cosas distintas con cada una: si
    // faltan campos, hay que construirlos —y eso es la tercera palanca—; si
    // faltan manos, hay que esperar a que nazca gente o soltar otra cosa.
    if (have <= hands.workedFields && have < FOOD.MAX_FIELDS) {
      return { key: 'answer.no_more_fields', params: { count: have } };
    }
    if (crewable <= hands.workedFields) {
      return { key: 'answer.no_more_hands', params: { count: hands.workedFields } };
    }
    if (have >= FOOD.MAX_FIELDS) {
      return { key: 'answer.all_the_land', params: { count: have } };
    }
  }

  // ---- Las manos que sobran -------------------------------------------
  // La reserva de obra es un suelo que el motor recupera de los leñadores: un
  // valle que no cambia es el pecado capital de este juego, así que la orden
  // «todo al bosque» nunca se cumple del todo. Decirlo es más honesto que
  // dejar que el jugador piense que la palanca llega más lejos de lo que llega.
  const spare = hands.cutters + hands.builders;
  if (spare > 0 && state.intent.timber > 0.8 && hands.builders > 0.01) {
    return { key: 'answer.someone_must_build', params: {} };
  }

  // ---- La obra ---------------------------------------------------------
  // Pedir una familia que no tiene nada pendiente no es un fallo, pero sí es
  // silencio: el jugador ha tocado algo y no ha pasado nada.
  if (state.intent.priority !== 'none' && state.works.length === 0 && state.village.wood < 20) {
    return { key: 'answer.no_wood_to_build', params: {} };
  }

  return null;
}
