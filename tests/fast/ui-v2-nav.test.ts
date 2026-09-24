// La barra conserva el fondo oscuro común en todas las rutas; sólo cambia la
// pestaña activa. Pura y sin DOM, como sus vecinas
// `navTabFor`/`contentRouteFor` en `tests/fast/ui-redesign-shell.test.ts`,
// que esta prueba no toca ni duplica.

import { describe, expect, it } from 'vitest';
import { navSkinFor } from '@ui/redesign/shell';
import type { SheetRoute } from '@ui/redesign/contracts';

describe('navSkinFor · fondo constante, selección por pestaña', () => {
  it('mantiene la madera oscura en las tres pestañas y en las hojas del valle', () => {
    expect(navSkinFor({ kind: 'valley' })).toBe('wood');
    expect(navSkinFor({ kind: 'chronicle' })).toBe('wood');
    expect(navSkinFor({ kind: 'people' })).toBe('wood');
    expect(navSkinFor({ kind: 'cart' })).toBe('wood');
  });

  it('una ficha conserva el mismo fondo, venga de donde venga', () => {
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
      { kind: 'cart' },
      { kind: 'inspect', target, from: 'valley' },
    ];
    for (const route of routes) expect(navSkinFor(route)).toBe('wood');
  });
});
