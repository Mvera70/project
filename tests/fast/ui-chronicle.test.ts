// UI-R3 · Propiedades puras de `src/ui/screens/chronicle.ts` (`chroniclePanel`).
//
// El proyecto no trae `jsdom` (`docs/ui-redesign/rounds/UI-R1.md` §4), así
// que lo único de un panel que una prueba rápida puede examinar es la parte
// que no toca el DOM — el mismo criterio que aisló `nextIntentForLever`/
// `nextIntentForPriority` de `orders.ts` en UI-R2. La integración real (el
// montaje en `shell.content`, el cierre por gesto, que una entrada nueva no
// mueva el scroll) se acredita con capturas y con `tools/valley.shots.ts`,
// que ya cubre abrir/cerrar la crónica desde la barra (UI-R1 §6) y el regreso
// desde el epitafio — ninguno de los dos se toca en esta ronda.
//
// Las dos propiedades que importan de verdad, del brief de UI-R3:
//
// 1. Una sucesora (`foundSuccessor`, tras el epitafio) es «la partida
//    actual» igual que la que reemplaza, pero con una crónica que empieza de
//    cero — confundir las dos identidades mezclaría dos aldeas en una sola
//    lectura. `chronicleIdentity` es la guardia que decide cuándo hace falta
//    reconstruir la lista entera en vez de sólo actualizar el año en curso.
// 2. El selector de archivo no repite la partida que ya se lee como «This
//    valley», y ofrece las demás de la más reciente a la más antigua.

import { describe, expect, it } from 'vitest';
import type { ArchivedGame } from '@engine/state';
import { chronicleIdentity, selectableArchive } from '@ui/screens/chronicle';

describe('chronicleIdentity · docs/ui-redesign/implementation-prompt.md UI-R3', () => {
  it('la misma semilla, sin archivo elegido, es siempre la misma identidad', () => {
    expect(chronicleIdentity(null, 7)).toBe(chronicleIdentity(null, 7));
  });

  it('una sucesora (otra semilla) es una identidad distinta, aunque las dos sean «actual»', () => {
    // v3.69/§12.2: tras el epitafio, `foundSuccessor` funda una aldea nueva
    // que sigue siendo «la partida actual» — pero su crónica no es la de la
    // anterior, y `chroniclePanel` no puede tratarlas como la misma fuente.
    expect(chronicleIdentity(null, 7)).not.toBe(chronicleIdentity(null, 11));
  });

  it('elegir un archivo cambia la identidad aunque la semilla actual no cambie', () => {
    expect(chronicleIdentity(null, 7)).not.toBe(chronicleIdentity(0, 7));
  });

  it('dos índices de archivo distintos son identidades distintas', () => {
    expect(chronicleIdentity(0, 7)).not.toBe(chronicleIdentity(1, 7));
  });

  it('dos identidades archivadas con la misma semilla «actual» de fondo no chocan', () => {
    // La identidad de un archivo no depende de la semilla en curso: es su
    // propio índice el que la distingue, no la partida que se esté jugando
    // encima mientras tanto.
    expect(chronicleIdentity(2, 7)).toBe(chronicleIdentity(2, 99));
  });
});

const archivedGame = (over: Partial<ArchivedGame>): ArchivedGame => ({
  seed: 1,
  terrainSeed: 1,
  endedTick: 480,
  cause: 'extinction',
  peakPeople: 20,
  chronicle: [],
  ruins: new Uint8Array(0),
  ...over,
});

describe('selectableArchive · docs/ui-redesign/implementation-prompt.md UI-R3', () => {
  it('sin partidas archivadas, no hay nada que elegir', () => {
    expect(selectableArchive([], 7, undefined)).toEqual([]);
  });

  it('conserva el índice original de cada partida, para poder recuperarla luego', () => {
    const archive = [archivedGame({ seed: 11 }), archivedGame({ seed: 23 })];
    const picked = selectableArchive(archive, 999, undefined);
    expect(picked.map((p) => p.index)).toEqual([1, 0]);
  });

  it('de la más reciente a la más antigua, no en el orden en que se archivaron', () => {
    const archive = [archivedGame({ seed: 1 }), archivedGame({ seed: 2 }), archivedGame({ seed: 3 })];
    const picked = selectableArchive(archive, 999, undefined);
    expect(picked.map((p) => p.game.seed)).toEqual([3, 2, 1]);
  });

  it('no repite la partida que ya se ve como «This valley»', () => {
    // Justo al terminar una partida, antes de fundar la sucesora, la que se
    // está leyendo también aparece en `archive` (la fila la escribe
    // `archiveGame` en cuanto el estado se guarda) — sin este filtro
    // saldrían dos entradas para la misma aldea.
    const archive = [
      archivedGame({ seed: 7, endedTick: 480 }),
      archivedGame({ seed: 11, endedTick: 720 }),
    ];
    const picked = selectableArchive(archive, 7, 480);
    expect(picked.map((p) => p.game.seed)).toEqual([11]);
  });

  it('una partida archivada con la misma semilla pero otro cierre no se confunde con la actual', () => {
    // Dos partidas de la misma semilla (jugadas en momentos distintos) tienen
    // ticks de cierre distintos: sólo el par exacto (semilla, tick) identifica
    // la que ya se está leyendo.
    const archive = [archivedGame({ seed: 7, endedTick: 240 })];
    const picked = selectableArchive(archive, 7, 480);
    expect(picked).toHaveLength(1);
  });
});
