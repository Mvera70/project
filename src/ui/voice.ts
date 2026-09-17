// VZ-01 · La voz del valle: una frase, elegida por una cola.
// docs/ui-redesign/piel/plan-voz.md §3.3; design.md §11.6, §11.4, §9.2.
//
// **Un sitio, una frase, una cola.** Hasta este módulo el valle hablaba por
// cuatro bocas con tres temporizadores y dos arbitrajes que no se conocían
// entre sí: el aviso de `notice.ts` con su `setTimeout`, la cartela de hito de
// `moment.ts` con el suyo, la pista del inicio guiado cediendo el hueco por
// `resolveMessageSlot`, y la frase de actividad pintada aparte. Tres de ellas
// flotaban sobre el valle con geometrías propias, y cada ronda de interfaz
// volvía a ajustarlas. El dueño del diseño lo cortó mirando la secuencia del
// inicio en su tablet: «esta forma de arreglarlo me parece una chapuza; estos
// mensajes que salen por encima no cuadran con la interfaz».
//
// Y la regla correcta estaba escrita desde antes de que nadie la construyera,
// en `docs/visual-reference/README.md` §5: «una única pila … no compiten cuatro
// `bottom` independientes … **más de un aviso: uno según prioridad**, agrupar
// novedad en crónica, **sin una cola interminable de cartelas**». Esto es esa
// frase hecha función.
//
// **Aquí no se escribe texto** (CLAUDE.md): quien ofrece una frase la trae ya
// compuesta desde el banco de plantillas. Y aquí no se mide el tiempo: `nowMs`
// entra siempre por parámetro, así que este módulo es puro y una prueba lo
// recorre sin montar un DOM ni mover un reloj.

import { TIME } from '@engine/balance';

/**
 * Los cuatro papeles, de menos a más prioridad.
 *
 * - `state`: lo que la aldea **está haciendo** (`doing.ts`). Es el fondo: no
 *   caduca, se sustituye cada tick y se lee cuando nadie más habla.
 * - `hint`: la pista del inicio guiado (U-11). Pegajosa: espera su turno sin
 *   marcarse vista y vuelve sola cuando lo transitorio se retira.
 * - `event`: lo que **acaba de pasar** (§11.6) — una entrada de peso 2 o 3, la
 *   respuesta de la aldea a una orden que no puede cumplir, el rasgo del valle
 *   al fundarlo.
 * - `milestone`: lo que pasa **una vez** (U-02) — la primera capilla, la
 *   fundación. Gana a un suceso del mismo instante y vive algo más.
 */
export type VoiceRole = 'state' | 'hint' | 'event' | 'milestone';

/** Una frase ya compuesta por quien la produce, con el instante en que se dijo. */
export interface Utterance {
  readonly role: VoiceRole;
  readonly text: string;
  /** Reloj de **pared** (`Date.now()`), puesto por quien ofrece. */
  readonly saidAtMs: number;
}

/**
 * Las tres casillas, y son tres a propósito: **no hay cola de cartelas.**
 *
 * `transient` guarda un único suceso o hito. Un suceso nuevo sustituye al
 * anterior y el anterior no vuelve: queda en la crónica, que es donde vive el
 * pasado de la aldea (§9.2). Guardar una lista sería el teletipo que §11.6
 * prohíbe con dos cotas medidas (`tests/journeys/notices.test.ts`).
 */
export interface VoiceState {
  readonly state: Utterance | null;
  readonly hint: Utterance | null;
  readonly transient: Utterance | null;
}

/** El único estado inicial: el valle callado. */
export const SILENT: VoiceState = { state: null, hint: null, transient: null };

/**
 * Cuánto vive lo transitorio, en milisegundos de reloj de pared.
 *
 * **Las dos cifras son las de siempre y salen de `balance.ts`**, que es donde
 * viven todas las constantes (CLAUDE.md): el suceso dura `NOTICE_MS` y el hito
 * `MOMENT_MS`, que es lo que la cartela le daba —7 s contra 5— y lo que una
 * prueba guarda con estas palabras: «una cosa que pasa una vez se lee más rato
 * que una que pasa a menudo». Se retiró la cartela, no su medida.
 */
export function ttlMs(role: 'event' | 'milestone'): number {
  return role === 'milestone' ? TIME.MOMENT_MS : TIME.NOTICE_MS;
}

/** Si una frase transitoria sigue viva en `nowMs`. */
function alive(u: Utterance | null, nowMs: number): boolean {
  if (u === null) return false;
  if (u.role !== 'event' && u.role !== 'milestone') return false;
  return nowMs - u.saidAtMs < ttlMs(u.role);
}

/**
 * Ofrece una frase. Pura: devuelve un estado nuevo y no toca el que entra.
 *
 * **El instante del ofrecimiento es `u.saidAtMs`**, y con eso basta para
 * aplicar la regla de U-02 sin pedir el reloj: un suceso ofrecido mientras un
 * hito está vivo no lo desplaza —si en el mismo tick la aldea levanta su
 * primera capilla y además se le quema un cobertizo, lo que se lee es la
 * capilla, que es lo raro—, y un hito sí desplaza a otro hito.
 */
export function offer(v: VoiceState, u: Utterance): VoiceState {
  switch (u.role) {
    case 'state':
      return { ...v, state: u };
    case 'hint':
      return { ...v, hint: u };
    case 'event':
      if (v.transient !== null && v.transient.role === 'milestone' && alive(v.transient, u.saidAtMs)) {
        return v;
      }
      return { ...v, transient: u };
    case 'milestone':
      return { ...v, transient: u };
  }
}

/**
 * Durante un letargo el valle no habla de lo que pasa (§11.6): novecientos
 * ticks de avisos son un teletipo, y esa ausencia la cuenta el parte de
 * bienvenida de §9.2. La pista y el estado sí se guardan: no son sucesos.
 */
export function offerUnlessMuted(v: VoiceState, u: Utterance, muted: boolean): VoiceState {
  if (muted && (u.role === 'event' || u.role === 'milestone')) return v;
  return offer(v, u);
}

/**
 * Retira lo transitorio que ya ha caducado.
 *
 * **Y esto es lo que sustituye a los tres `setTimeout`.** §11.4 permite el
 * reloj de pared si lo que lo usa tiene estado definido en cada instante y
 * sobrevive a un salto del reloj del juego: una resta contra `saidAtMs`
 * cumple las dos cosas mejor que un temporizador, que un salto deja a medias.
 */
export function expire(v: VoiceState, nowMs: number): VoiceState {
  if (v.transient === null || alive(v.transient, nowMs)) return v;
  return { ...v, transient: null };
}

/**
 * La pista se ha tocado y se retira. No la retira nunca ceder el hueco: quien
 * la mira no ha avanzado su paso, sólo se le ha tapado un instante (UI-R1).
 */
export function dismissHint(v: VoiceState): VoiceState {
  if (v.hint === null) return v;
  return { ...v, hint: null };
}

/**
 * Lo que el valle está diciendo ahora: lo transitorio vivo, si no la pista, si
 * no el estado. `null` sólo cuando no hay nada, que en una partida viva no
 * pasa: `doingNow` siempre tiene algo que decir mientras quede alguien.
 */
export function speaking(v: VoiceState, nowMs: number): Utterance | null {
  if (alive(v.transient, nowMs)) return v.transient;
  if (v.hint !== null) return v.hint;
  return v.state;
}
