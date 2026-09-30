// Los sucesos del mundo que se oyen: la muralla, el monte y la cueva.
//
// **El contrato de sucesos de la caza y el combate** (fase 5 de
// `docs/plan-audio-mundo.md`). No hay un flujo de sucesos en el juego: hay
// estado que se lee. El renderer publica cuentas que sólo suben
// (`GraphicsStats.moments`, de sólo lectura, sin azar del motor) y aquí se saca
// de la diferencia entre dos fotogramas **qué acaba de pasar**. Es puro: lo que
// suena se decide sin navegador y se prueba sin él, como `ambience.ts`.
//
// Quien quiera que un suceso nuevo suene —el cuerno del cerco, un muro que
// cede— añade su cuenta al contrato, su `MomentKind` aquí y su fila en
// `MOMENT_CUE`; ni el motor ni la capa de vida saben que existe el sonido.
//
// **El oso se alza y no suena**: `bear_rises` es un suceso del contrato, pero
// su fila es `null`. Un gruñido es una voz de animal, y una voz sintética se
// descartó en U-09 (decisión 1 de §6): hasta que haya voces grabadas o
// generadas, calla. Está publicado para que el día que existan sólo falte el
// fichero. **Y hoy calla todo lo demás** hasta que Vera apruebe un sonido.

import type { WorldMoments } from '../render3d/contracts';
import type { Cue } from './sound';

export type MomentKind =
  | 'arrow_loosed'
  | 'arrow_struck'
  | 'blow'
  | 'raider_down'
  | 'defender_down'
  | 'gate_struck'
  | 'gate_broken'
  | 'hunt_struck'
  | 'hunt_missed'
  | 'bear_rises';

/**
 * Qué suena por cada suceso. `null` es «existe y todavía no tiene voz».
 *
 * **Hoy todos son `null`.** Los siete sonidos de la primera tanda (30 sep 2026)
 * los descartó Vera entera —«suenan a juguetes de niño pequeño, timbales»— y
 * la causa está medida: cuerpos de golpe con una resonancia que aguantaba
 * 200–260 ms a 420–460 Hz, que es un timbal (`tools/ui/tonality.py`). Los
 * sonidos nuevos entran aquí, uno a uno, cuando ella los apruebe; el contrato,
 * las cuentas y el cableado del juego ya están.
 */
export const MOMENT_CUE: Readonly<Record<MomentKind, Cue | null>> = {
  arrow_loosed: null,
  arrow_struck: null,
  blow: null,
  raider_down: null,
  defender_down: null,
  gate_struck: null,
  gate_broken: null,
  hunt_struck: null,
  hunt_missed: null,
  bear_rises: null,
};

/** Un suceso, con dónde pasó (celdas del mapa) o `null` si el contrato no lo sabe. */
export interface Moment {
  readonly kind: MomentKind;
  readonly at: { readonly x: number; readonly z: number } | null;
}

/**
 * Cuánto ha subido una cuenta. **Una cuenta que baja es una jornada nueva**
 * (la capa de vida se rehace cada día y sus contadores vuelven a cero): lo que
 * lleva ahora es todo nuevo, no un número negativo.
 */
function rose(before: number, after: number): number {
  return after >= before ? after - before : after;
}

/** Cuántos sucesos de una misma clase caben en un fotograma. */
const MAX_PER_FRAME = 3;

/** Los cazadores aciertan o fallan; lo que sólo roza o da en la madera no es un acierto. */
function struck(outcome: string): boolean {
  return outcome === 'hit' || outcome === 'wound';
}

/**
 * Qué ha pasado entre dos fotogramas. **Sin fotograma anterior no pasa nada**:
 * abrir una partida a mitad de un cerco no suelta de golpe todo lo que llevaba
 * contado. Los bloques que aparecen (un asalto que empieza) parten de cero.
 */
export function momentsFrom(before: WorldMoments | null, after: WorldMoments): Moment[] {
  if (before === null) return [];
  const out: Moment[] = [];
  const push = (kind: MomentKind, count: number, at: Moment['at']): void => {
    // Un tope por fotograma: una jornada que se rehace a mitad de un cerco
    // devuelve toda la cuenta de golpe, y el oído sólo necesita saber que pasó.
    for (let n = 0; n < Math.min(count, MAX_PER_FRAME); n += 1) out.push({ kind, at });
  };

  const battle = after.battle;
  if (battle !== null) {
    const was = before.battle ?? { loosed: 0, hits: 0, arrowHits: 0, fallen: 0, lost: 0, gate: null };
    const at = battle.gate?.at ?? null;
    push('arrow_loosed', rose(was.loosed, battle.loosed), at);
    push('arrow_struck', rose(was.arrowHits, battle.arrowHits), at);
    // De lo que dio, lo que no fue flecha fue lanza o mano: un choque.
    push('blow', rose(was.hits - was.arrowHits, battle.hits - battle.arrowHits), at);
    push('raider_down', rose(was.fallen, battle.fallen), at);
    push('defender_down', rose(was.lost, battle.lost), at);
    if (battle.gate !== null) {
      // Sin portón en el fotograma anterior no se puede decir que acabe de
      // ceder: una jornada que se abre con el portón ya roto no lo rompe otra vez.
      const gateBefore = was.gate ?? { hits: 0, broken: battle.gate.broken, at: battle.gate.at };
      push('gate_struck', rose(gateBefore.hits, battle.gate.hits), battle.gate.at);
      if (battle.gate.broken && !gateBefore.broken) push('gate_broken', 1, battle.gate.at);
    }
  }

  const hunt = after.hunt;
  if (hunt !== null && hunt.last !== null) {
    const seen = before.hunt?.strokes ?? 0;
    // Una escena nueva vuelve a contar desde uno: baja, y todo lo que hay es nuevo.
    if (rose(seen, hunt.strokes) > 0) {
      push(struck(hunt.last.outcome) ? 'hunt_struck' : 'hunt_missed', 1, hunt.at);
    }
  }

  const bear = after.bear;
  if (bear !== null) push('bear_rises', rose(before.bear?.warnings ?? 0, bear.warnings), bear.at);

  return out;
}

/**
 * Los sucesos del mundo callan por las mismas compuertas que el fondo, y una
 * más: a ×16 y ×64 una jornada dura dos segundos y una muralla entera pasaría
 * en un latido; un cerco a esa velocidad es un avance rápido, no una batalla.
 */
export function momentsAudible(world: { speed: number; catchingUp: boolean; hidden: boolean },
  fastFrom: number): boolean {
  return world.speed !== 0 && !world.catchingUp && !world.hidden && world.speed < fastFrom;
}
