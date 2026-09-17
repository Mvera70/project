// UI-R1 · La carcasa: propiedades puras de `src/ui/redesign/shell.ts`.
//
// `boot()` necesita un DOM real que esta suite no abre (`tests/fast/app.test.ts`
// ya lo dice de `App.decide`), y este proyecto no trae jsdom: por eso lo que se
// comprueba aquí es la lógica que `shell.ts` deja pura a propósito —qué pestaña
// corresponde a una ruta, y qué mensaje gana el hueco compartido— siguiendo el
// mismo patrón que separó `attemptDecision` de `boot` en M-20. La integración
// real (un solo canvas, foco, `data-screen`) se acredita con capturas, no aquí.

import { describe, expect, it } from 'vitest';
import { contentRouteFor, navTabFor } from '@ui/redesign/shell';
import type { SheetRoute } from '@ui/redesign/contracts';

describe('navTabFor · docs/design.md §11.2, cinco rutas', () => {
  it('el valle y la crónica y la gente encienden su propia pestaña', () => {
    expect(navTabFor({ kind: 'valley' })).toBe('valley');
    expect(navTabFor({ kind: 'chronicle' })).toBe('chronicle');
    expect(navTabFor({ kind: 'people' })).toBe('people');
  });

  it('las órdenes se abren desde el valle: no tienen pestaña propia (§11.2 punto 1)', () => {
    expect(navTabFor({ kind: 'cart' })).toBe('valley');
  });

  it('la ficha enciende la pestaña de donde vino, no una cuarta (regla de S-05)', () => {
    const target = { kind: 'terrain', x: 0, y: 0 } as const;
    expect(navTabFor({ kind: 'inspect', target, from: 'valley' })).toBe('valley');
    expect(navTabFor({ kind: 'inspect', target, from: 'people' })).toBe('people');
  });

  it('cubre las cinco variantes de SheetRoute sin caer al valor por defecto por accidente', () => {
    const target = { kind: 'building', id: 1 } as const;
    const routes: SheetRoute[] = [
      { kind: 'valley' },
      { kind: 'chronicle' },
      { kind: 'people' },
      { kind: 'cart' },
      { kind: 'inspect', target, from: 'valley' },
    ];
    for (const route of routes) expect(['valley', 'chronicle', 'people']).toContain(navTabFor(route));
  });
});

describe('contentRouteFor · qué monta la bandeja de la carcasa (UI-R5)', () => {
  it('órdenes, ficha, crónica y gente piden un panel dentro de `content`', () => {
    const target = { kind: 'terrain', x: 0, y: 0 } as const;
    expect(contentRouteFor({ kind: 'cart' })).toBe('cart');
    expect(contentRouteFor({ kind: 'inspect', target, from: 'valley' })).toBe('inspect');
    expect(contentRouteFor({ kind: 'chronicle' })).toBe('chronicle');
    expect(contentRouteFor({ kind: 'people' })).toBe('people');
  });

  it('sólo el valle no monta nada en la bandeja: es el valle mismo, sin hoja encima', () => {
    expect(contentRouteFor({ kind: 'valley' })).toBeNull();
  });
});

// VZ-02 · **las pruebas de `resolveMessageSlot` se mudan, no se pierden.**
//
// Guardaban la primera fila de la tabla de coincidencias de visual-reference
// §5 —«pista de órdenes + aviso de crónica → ocupa el mensaje el aviso; pista
// pendiente, sin marcar como vista»— y esa propiedad sigue exigida, ahora en
// `tests/fast/ui-voice.test.ts`, que la comprueba para las **cuatro** voces y
// no sólo para dos: «la pista no se marca vista por ceder». La función que
// arbitraba a dos se retiró con la cola.
