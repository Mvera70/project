// M-0 · La frase de una oferta del camino. `docs/historico/plan-medios.md` §6.
//
// Pura y sin DOM, como `person-card.ts` y por el mismo motivo: así lo que se
// puede comprobar sin navegador es **qué dice la oferta**, y no el HTML que la
// envuelve. Aquí no se escribe texto (CLAUDE.md): la frase sale del banco y lo
// único que hace este módulo es sacar las cifras de la oferta y dárselas.

import { renderUiText } from '@engine/chronicle/render';
import type { Offer } from '@engine/state';

/**
 * Las cifras de una oferta, con el nombre de su bien: `{wood: 80, silver: 6}`.
 *
 * El mismo hueco vale para lo que se da y para lo que se pide, y no hace falta
 * distinguirlos: la frase del banco ya dice quién da qué («A pedlar wants
 * {wood} wood for {silver} silver»), que es como lo diría una persona.
 */
export function offerParams(offer: Offer): Record<string, number> {
  const params: Record<string, number> = {};
  for (const good of [...offer.gives, ...offer.takes]) {
    if (good.k === 'stat') params[good.stat] = Math.round(good.amount);
    else if (good.k === 'herd') params[good.kind] = good.amount;
    else params['years'] = good.years;
  }
  return params;
}

/** Lo que la voz de la bandeja lee cuando hay alguien esperando en el camino. */
export function offerLine(offer: Offer): string {
  return renderUiText(`offer.${offer.id}.say`, offerParams(offer));
}
