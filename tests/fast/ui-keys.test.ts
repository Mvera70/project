// Ninguna clave armada con datos puede llegar a la pantalla entre corchetes.
//
// **Por qué existe, y son tres veces ya.** `renderUiText` devuelve la clave
// entre corchetes cuando no está en el banco, y eso es lo único de la interfaz
// que el jugador lee como un fallo del programa. Ha pasado tres veces, y las
// tres las cazó una persona mirando y no una prueba:
//
//  · `[cart.no.feasting]` — pedir un segundo barril (C4, 18 sep 2026).
//  · `[language.english]` — el selector de idioma del menú de inicio, o sea la
//    pantalla con la que empieza toda partida (18 sep, en la primera captura
//    del paquete de prensa).
//  · `[building.gate]` — tocar el portón en el valle (19 sep, en el repaso que
//    trajo esta prueba). El portón es de A2 y su frase nunca se escribió.
//
// Las claves escritas a mano en el código no son el problema: son setenta y seis
// y las tres que faltaban no estaban ahí. **El problema son las que se arman con
// un dato** —`building.${kind}`, `role.${role}`, `trait.${trait}`— porque la que
// falta sólo aparece el día que el dato aparece, y hay dieciocho familias así.
//
// Lo que esta prueba hace es cruzar **cada familia contra su dominio completo**.
// Y el dominio sale de donde manda:
//
//  · de una lista del motor cuando existe (`BUILDINGS`, `MEANS_IDS`,
//    `ALL_TRAITS`), así que un edificio nuevo la rompe sin que nadie la toque;
//  · y de un `Record<Tipo, true>` cuando el dominio es sólo un tipo
//    (`Role`, `MemoryKind`, las causas del final, las eras). Es a propósito y no
//    es una lista escrita a mano: si alguien añade un papel al tipo, **el
//    typecheck falla aquí** y hay que venir a decir qué frase le toca.

import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '@engine/balance';
import { renderUiText } from '@engine/chronicle/render';
import { ALL_TRAITS } from '@engine/people/traits';
import { MEANS_IDS } from '@engine/state';
import type { BuildingKind, EndState, MemoryKind, Role } from '@engine/state';
import type { Era } from '@derive/era';

/** Si el banco no tiene esa clave, `renderUiText` la devuelve entre corchetes. */
function missing(key: string): boolean {
  return renderUiText(key).startsWith('[');
}

/**
 * Los dominios que sólo existen como tipo, escritos como mapa exhaustivo.
 *
 * `Record<Role, true>` obliga a que estén los ocho: quitar uno o añadir otro al
 * tipo rompe el typecheck **aquí**, que es justo lo que una lista escrita a mano
 * no hace. Es el mismo truco que la especificación pide para cualquier lista que
 * crezca (`CLAUDE.md`: nada de congelar una lista literal que crece).
 */
const ROLES: Record<Role, true> = {
  leader: true,
  smith: true,
  midwife: true,
  priest: true,
  woodward: true,
  reeve: true,
  herbalist: true,
  stranger: true,
};

const MEMORIES: Record<MemoryKind, true> = {
  lost_child: true,
  was_blamed: true,
  was_saved: true,
  was_passed_over: true,
  went_hungry: true,
  lost_home: true,
  stole: true,
  unspoken: true,
};

const ENDINGS: Record<EndState['cause'], true> = {
  extinction: true,
  abandoned: true,
  dispersed: true,
  stormed: true,
};

const ERAS: Record<Era, true> = { hamlet: true, village: true, town: true };

describe('ninguna clave de la interfaz llega entre corchetes', () => {
  it('cada edificio tiene nombre en su ficha', () => {
    // El dominio sale de `BUILDINGS`, que es la tabla de §7.2: un edificio nuevo
    // rompe esta prueba el día que se añade, sin que nadie la actualice. Así se
    // cazó `[building.gate]`.
    const kinds = Object.keys(BUILDINGS) as BuildingKind[];
    expect(kinds.length, 'la tabla de §7.2 no está vacía').toBeGreaterThan(10);
    for (const kind of kinds) {
      expect(missing(`building.${kind}`), `building.${kind}`).toBe(false);
    }
  });

  it('cada oficio tiene nombre', () => {
    for (const role of Object.keys(ROLES) as Role[]) {
      expect(missing(`role.${role}`), `role.${role}`).toBe(false);
    }
  });

  it('cada rasgo tiene nombre', () => {
    expect(ALL_TRAITS.length, 'los rasgos de §6.1').toBeGreaterThan(10);
    for (const trait of ALL_TRAITS) {
      expect(missing(`trait.${trait}`), `trait.${trait}`).toBe(false);
    }
  });

  it('cada cosa que le pasa a alguien se puede contar en su vida', () => {
    for (const kind of Object.keys(MEMORIES) as MemoryKind[]) {
      expect(missing(`memory.${kind}`), `memory.${kind}`).toBe(false);
    }
  });

  it('cada cosa que se puede dar tiene nombre y qué hace', () => {
    for (const id of MEANS_IDS) {
      expect(missing(`cart.${id}`), `cart.${id}`).toBe(false);
      expect(missing(`cart.${id}.what`), `cart.${id}.what`).toBe(false);
    }
  });

  it('cada manera de acabar tiene su lápida entera', () => {
    // Tres claves por final: el rótulo, la capitular y la inscripción (F3b).
    for (const cause of Object.keys(ENDINGS) as EndState['cause'][]) {
      expect(missing(`epitaph.${cause}`), `epitaph.${cause}`).toBe(false);
      expect(missing(`epitaph.initial.${cause}`), `epitaph.initial.${cause}`).toBe(false);
      expect(missing(`epitaph.inscription.${cause}`), `epitaph.inscription.${cause}`).toBe(false);
    }
  });

  it('cada fase del valle tiene nombre', () => {
    for (const era of Object.keys(ERAS) as Era[]) {
      expect(missing(`era.${era}`), `era.${era}`).toBe(false);
    }
  });
});
