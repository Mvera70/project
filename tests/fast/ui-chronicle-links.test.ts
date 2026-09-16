// UI-R5 · Propiedades puras del enlace crónica → ficha
// (`src/ui/screens/chronicle.ts`, `personLinksFor`).
//
// El brief de UI-R5 prohíbe adivinar una identidad analizando frases o
// comparando nombres (pueden repetirse, AC-9 de UI-R4). El único
// identificador real y estable que una entrada de la crónica puede llevar
// hasta hoy es el de un suceso del valle (R-1, `kind: 'happening'`):
// `world/fate.ts` deja el `VillagerId` real en `state.happenings[n].who`, en
// el mismo tick que la línea de crónica, y sólo para dos sucesos
// (`quarrel_in_the_square`, `child_lost` nombrado). `personLinksFor`
// empareja el nombre ya escrito en `entry.params` con el id que ocupa su
// misma posición en `who` — nunca al revés.
//
// No hay prueba rápida para `linkChronicleNames`/`linkNamesInParagraph`
// (tocan el DOM y este proyecto no trae `jsdom`, mismo motivo que
// `ui-chronicle.test.ts` §1): esa parte se verificó con un recorrido de
// Playwright real, documentado en `docs/ui-redesign/rounds/UI-R5.md`.

import { describe, expect, it } from 'vitest';
import type { ChronicleEntry, HappeningRecord } from '@engine/state';
import { personLinksFor } from '@ui/screens/chronicle';

function happening(who: readonly number[], tick = 100): HappeningRecord {
  return { tick, id: 'quarrel_in_the_square', visible: [], who: [...who] };
}

function entry(params: Record<string, string | number>, tick = 100): ChronicleEntry {
  return { tick, kind: 'happening', templateKey: 'fate.quarrel_in_the_square', params, weight: 2 };
}

describe('personLinksFor · docs/ui-redesign/implementation-prompt.md UI-R5, deber 2', () => {
  it('una riña empareja A y B, en ese orden, con el mismo orden de `who`', () => {
    const links = personLinksFor(entry({ A: 'Hereburh', B: 'Alfred' }), happening([3, 7]));
    expect(links).toEqual([{ name: 'Hereburh', id: 3 }, { name: 'Alfred', id: 7 }]);
  });

  it('un niño perdido y nombrado sólo lleva A', () => {
    const links = personLinksFor(
      entry({ A: 'Wynn' }, 200),
      happening([5], 200),
    );
    expect(links).toEqual([{ name: 'Wynn', id: 5 }]);
  });

  it('sin nadie implicado (`who` vacío, el peor par no existía) no hay enlace', () => {
    expect(personLinksFor(entry({}), happening([]))).toEqual([]);
  });

  it('un nombre sin id en su misma posición no se enlaza — nunca se inventa uno', () => {
    // B tiene nombre en los parámetros pero `who` no llega a la segunda
    // posición: es la garantía de que un suceso futuro que no siga la
    // convención A/B ↔ who[] no produce un enlace falso, sólo ninguno.
    const links = personLinksFor(entry({ A: 'Hereburh', B: 'Alfred' }), happening([3]));
    expect(links).toEqual([{ name: 'Hereburh', id: 3 }]);
  });

  it('dos nombres que coinciden en texto llevan igualmente su propio id — no se comparan nombres', () => {
    // AC-9 (`docs/ui-redesign/acceptance-scenarios.md`, ya probado por UI-R4
    // para People): dos aldeanos pueden llamarse igual. `personLinksFor` no
    // mira el texto para decidir la identidad, sólo la posición.
    const links = personLinksFor(entry({ A: 'Hereburh', B: 'Hereburh' }), happening([3, 9]));
    expect(links).toEqual([{ name: 'Hereburh', id: 3 }, { name: 'Hereburh', id: 9 }]);
  });
});
