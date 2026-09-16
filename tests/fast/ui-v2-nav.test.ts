// UI-V2 · `navSkinFor` (`src/ui/redesign/shell.ts`), la piel de la barra de
// abajo según la ruta. `docs/ui-redesign/piel/plan-piel.md` §3.4, §3.2, §3.3:
// pergamino con subrayado de ocre por defecto (el valle y las órdenes, que se
// abren desde ahí, prototipo 01); una placa de madera en la pestaña activa
// cuando la ruta es la crónica (prototipo 02); madera entera cuando es la
// gente o una ficha (prototipo 03). Pura y sin DOM, como sus vecinas
// `navTabFor`/`contentRouteFor` en `tests/fast/ui-redesign-shell.test.ts`,
// que esta prueba no toca ni duplica.

import { describe, expect, it } from 'vitest';
import { navSkinFor } from '@ui/redesign/shell';
import type { SheetRoute } from '@ui/redesign/contracts';

describe('navSkinFor · plan-piel.md §3.4, la navegación cambia de piel con la ruta', () => {
  it('el valle lleva pergamino por defecto', () => {
    expect(navSkinFor({ kind: 'valley' })).toBe('default');
  });

  it('las órdenes se abren desde el valle y comparten su piel (§11.2 punto 1)', () => {
    expect(navSkinFor({ kind: 'orders' })).toBe('default');
  });

  it('la crónica lleva la placa de madera del prototipo 02', () => {
    expect(navSkinFor({ kind: 'chronicle' })).toBe('plaque');
  });

  it('la gente lleva la madera entera del prototipo 03', () => {
    expect(navSkinFor({ kind: 'people' })).toBe('wood');
  });

  it('una ficha lleva la misma madera entera, venga de donde venga (el plan no distingue)', () => {
    const target = { kind: 'terrain', x: 0, y: 0 } as const;
    expect(navSkinFor({ kind: 'inspect', target, from: 'valley' })).toBe('wood');
    expect(navSkinFor({ kind: 'inspect', target, from: 'people' })).toBe('wood');
  });

  it('cubre las cinco variantes de SheetRoute sin caer al valor por defecto por accidente', () => {
    const target = { kind: 'building', id: 1 } as const;
    const routes: SheetRoute[] = [
      { kind: 'valley' },
      { kind: 'chronicle' },
      { kind: 'people' },
      { kind: 'orders' },
      { kind: 'inspect', target, from: 'valley' },
    ];
    for (const route of routes) expect(['default', 'plaque', 'wood']).toContain(navSkinFor(route));
  });
});
