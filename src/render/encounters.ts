// M-35 · La vida social de la jornada. design.md §11.9.
//
// El día del valle era el mismo para todos y todos los días: salir de casa,
// ir a un punto, dar vueltas con el mismo vaivén, volver. Nadie se paraba con
// nadie. Una aldea donde cuarenta personas coinciden en un campo y ninguna
// habla con otra no parece una aldea.
//
// Esto empareja a los que se cruzan. **Derivado y determinista**: quién se para
// con quién sale de un hash de la semana y de los dos identificadores, nunca de
// un flujo de azar — §4.3 prohíbe que el dibujo consuma aleatoriedad, porque
// entonces mirar la pantalla cambiaría la partida.
//
// Y lo decide la opinión, que es lo que hace que dos partidas con los mismos
// sucesos cuenten historias distintas: dos que se aprecian se paran a hablar a
// menudo, dos que se detestan no se paran nunca.

import { ENCOUNTER } from '@engine/balance';
import { opinionOf } from '@engine/people/opinions';
import type { GameState, VillagerId } from '@engine/state';

export interface Encounter {
  /** El otro. */
  withId: VillagerId;
  /** Dónde se paran, en celdas. */
  x: number;
  y: number;
  /** Tramo de la jornada en que están juntos, en fracción de tick. */
  from: number;
  to: number;
}

/**
 * Un pseudoaleatorio estable en 0..1 a partir de tres enteros.
 *
 * El mismo truco que usan los animales de §7.7 y por el mismo motivo: parece
 * azar, no lo es, y no toca ningún flujo.
 */
function noise(a: number, b: number, c: number): number {
  let h = Math.imul(a + 0x9e37, 0x85eb_ca6b) ^ Math.imul(b + 0x79b9, 0xc2b2_ae35);
  h = Math.imul(h ^ (h >>> 13), 0x27d4_eb2f) ^ Math.imul(c + 0x1656, 0x1656_67b1);
  h ^= h >>> 16;
  return ((h >>> 0) % 100_000) / 99_999;
}

/**
 * Las ganas que estos dos tienen de pararse a hablar, de 0 a 1.
 *
 * La opinión manda: por debajo de `COLD_BELOW` no se paran jamás — de eso trata
 * un rencor —, y por encima de neutral la probabilidad sube hasta `WARM_CHANCE`.
 * Un valle donde todos se llevan bien tiene las calles llenas de corrillos, y
 * uno roto por las rencillas se queda en silencio. Eso es exactamente lo que
 * debe verse desde fuera sin leer una sola línea de crónica.
 */
function appetite(state: GameState, a: VillagerId, b: VillagerId): number {
  const mutual = (opinionOf(state, a, b) + opinionOf(state, b, a)) / 2;
  if (mutual <= ENCOUNTER.COLD_BELOW) return 0;
  const warmth = Math.max(0, Math.min(1, (mutual - ENCOUNTER.COLD_BELOW) / (100 - ENCOUNTER.COLD_BELOW)));
  return ENCOUNTER.BASE_CHANCE + warmth * (ENCOUNTER.WARM_CHANCE - ENCOUNTER.BASE_CHANCE);
}

interface Spot { id: VillagerId; x: number; y: number }

/**
 * Quién se para con quién esta semana.
 *
 * Se resuelve una vez por tick sobre los destinos, no fotograma a fotograma
 * sobre las posiciones: emparejar sobre posiciones haría que dos que se cruzan
 * un instante se quedaran pegados, y además sería cuadrático en cada pintada.
 *
 * Cada uno se para con uno como mucho. Se recorre por identificador para que
 * el resultado no dependa del orden en que llegue la lista.
 */
export function encountersAmong(state: GameState, spots: readonly Spot[]): Map<VillagerId, Encounter> {
  const out = new Map<VillagerId, Encounter>();
  const ordered = [...spots].sort((p, q) => p.id - q.id);

  for (let i = 0; i < ordered.length; i += 1) {
    const a = ordered[i] as Spot;
    if (out.has(a.id)) continue;

    for (let j = i + 1; j < ordered.length; j += 1) {
      const b = ordered[j] as Spot;
      if (out.has(b.id)) continue;

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy > ENCOUNTER.RANGE * ENCOUNTER.RANGE) continue;

      const want = appetite(state, a.id, b.id);
      if (want <= 0) continue;
      if (noise(state.tick, a.id, b.id) >= want) continue;

      // A media jornada y por un rato distinto cada vez: dos personas que se
      // paran siempre en el mismo minuto del día vuelven a ser un mecanismo.
      const start = ENCOUNTER.EARLIEST
        + noise(a.id, b.id, state.tick) * (ENCOUNTER.LATEST - ENCOUNTER.EARLIEST);
      const span = ENCOUNTER.MIN_SPAN
        + noise(b.id, state.tick, a.id) * (ENCOUNTER.MAX_SPAN - ENCOUNTER.MIN_SPAN);
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;

      out.set(a.id, { withId: b.id, x, y, from: start, to: start + span });
      out.set(b.id, { withId: a.id, x, y, from: start, to: start + span });
      break;
    }
  }
  return out;
}
