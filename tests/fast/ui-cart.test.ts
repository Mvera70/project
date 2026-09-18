// C4 · La fila del carro: el precio y el motivo. plan-meta.md, fila C4.
//
// **El carro es donde se decide si el valle cae**, desde que C1 metió los tres
// medios de defensa y A2b la segunda puerta: lo que se da es lo que sube a la
// muralla (C2), lo que dispara (D2) y lo que aguanta un asalto (B3). Y era la
// pantalla menos vigilada del juego.
//
// Lo que estas pruebas cierran son las dos maneras en que esta fila miente, y
// las dos estaban pasando:
//
//  1 · **Una clave que no está en el banco.** `renderUiText` devuelve
//      `[cart.no.feasting]` —un corchete con una clave dentro— y eso es lo
//      único de este módulo que el jugador ve como un fallo. Pasaba con
//      `feasting`, que `refusalFor` devuelve desde M-2 y nadie escribió.
//  2 · **Una frase que dice otra cosa.** `cart.no.room` está escrita para la
//      pocilga («no room in the pen») y desde C1/A2b la devuelven también la
//      atalaya, el portón y el par de manos: a quien pedía una segunda puerta
//      se le contestaba que el corral estaba lleno.
//
// No se prueba el DOM —el proyecto no trae `jsdom` (UI-R1 §4)— sino el
// contrato del que la fila depende: **para cada cosa que se puede dar y cada
// negativa que el motor puede darle, hay una frase y dice lo suyo.**

import { describe, expect, it } from 'vitest';
import { renderUiText } from '@engine/chronicle/render';
import { MEANS_SPEC } from '@engine/world/means';
import { MEANS_IDS, type MeansId } from '@engine/state';
import type { MeansRefusal } from '@engine/world/means';

/** Si el banco no tiene esa clave, `renderUiText` la devuelve entre corchetes. */
function missing(key: string): boolean {
  return renderUiText(key).startsWith('[');
}

/** La frase que la fila enseña: la de esa cosa, o la general. */
function reasonFor(id: MeansId, refusal: string): string {
  const mine = renderUiText(`cart.no.${refusal}.${id}`);
  return mine.startsWith('[') ? renderUiText(`cart.no.${refusal}`) : mine;
}

/**
 * Las negativas que el motor puede devolver **por cada cosa**, leídas de su
 * propia ficha y no escritas a mano: `refusalFor` mira el rasgo (`already`), el
 * corral y el sitio (`room`), la fiesta (`feasting`), la cama (`room`) y, al
 * final, el precio (`cost`). Si mañana una ficha gana un campo, esta cuenta lo
 * sigue sin que nadie la actualice.
 */
function refusalsFor(id: MeansId): MeansRefusal[] {
  const spec = MEANS_SPEC[id];
  const some: MeansRefusal[] = ['cost'];
  if (spec.trait !== undefined) some.push('already');
  if (spec.herd !== undefined || spec.hand === true || spec.build !== undefined) some.push('room');
  if (spec.feast === true) some.push('feasting');
  return some;
}

describe('C4 · la fila del carro', () => {
  it('cada cosa que se puede dar tiene nombre y qué hace', () => {
    for (const id of MEANS_IDS) {
      expect(missing(`cart.${id}`), `cart.${id}`).toBe(false);
      expect(missing(`cart.${id}.what`), `cart.${id}.what`).toBe(false);
    }
  });

  it('y cada negativa que el motor puede dar tiene su frase', () => {
    // La prueba que habría pillado `[cart.no.feasting]` el día que se escribió
    // `refusalFor`.
    for (const id of MEANS_IDS) {
      for (const refusal of refusalsFor(id)) {
        const said = reasonFor(id, refusal);
        expect(said.startsWith('['), `${id} · ${refusal}: ${said}`).toBe(false);
        expect(said.length, `${id} · ${refusal}: vacía`).toBeGreaterThan(3);
      }
    }
  });

  it('a quien pide una puerta no se le habla del corral', () => {
    // El segundo fallo, hecho aserto y nombrando lo que decía. Las tres cosas
    // que devuelven `room` sin ser ganado tienen que decir cada una la suya.
    const pen = renderUiText('cart.no.room');
    for (const id of ['tower', 'gate', 'hand'] as const) {
      expect(reasonFor(id, 'room'), `${id} no habla del corral`).not.toBe(pen);
    }
    // Y los cerdos sí: la frase general es la suya y se queda.
    expect(reasonFor('pigs', 'room'), 'los cerdos, en el corral').toBe(pen);
  });

  it('lo que cuesta se puede pagar con fichas de la cabecera', () => {
    // El precio se pinta con los iconos de la cabecera —una ficha por cosa que
    // se paga (§11.1)— así que ninguna ficha puede quedarse sin icono. Los
    // cuatro que hay son los cuatro que la cabecera enseña.
    const COINS = new Set(['grain', 'wood', 'stone', 'silver']);
    for (const id of MEANS_IDS) {
      const cost = Object.entries(MEANS_SPEC[id].cost);
      expect(cost.length, `${id}: algo cuesta`).toBeGreaterThan(0);
      for (const [stat, amount] of cost) {
        expect(COINS.has(stat), `${id} paga en ${stat}, que no es una ficha`).toBe(true);
        expect(amount ?? 0, `${id}: ${stat} a cero no es un precio`).toBeGreaterThan(0);
      }
    }
  });

  it('los cuatro medios de defensa están en el carro', () => {
    // La fila C4 existe por esto: C1 y A2b metieron cuatro cosas que deciden si
    // el valle cae, y el carro es el único sitio donde el jugador las ve.
    for (const id of ['arms', 'bows', 'tower', 'gate'] as const) {
      expect((MEANS_IDS as readonly string[]).includes(id), `${id} en el carro`).toBe(true);
    }
  });
});
