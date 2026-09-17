// VZ-04 · Las dos pantallas que seguían sin vestir.
// plan-voz.md §5 VZ-04a/VZ-04b; `.claude/skills/piel-del-valle/SKILL.md` §2.
//
// El parte de bienvenida (§9.2) y el epitafio (§13.3) se pintaban con los
// tokens de U-01 —la noche, la serif de voz, la letra llana— y sin una sola
// clase de la piel, mientras la crónica, la decisión y la portada usaban
// `--skin-page` con su grano. Lo dijo el dueño del diseño mirando la crónica en
// la tablet: «los fondos que hay detrás de los textos, usa siempre el mismo; el
// de la crónica es el bueno. No estamos estandarizando las cosas».
//
// Esta prueba lee las hojas de los dos módulos y guarda tres propiedades: que
// usan el papel de la crónica, que no queda ni un token de antes del rediseño,
// y que el contenido va en la columna de 390 px de la directriz. Lee el fichero
// fuente a propósito: el estilo se inyecta con `ensureStyle` en `document.head`
// y este proyecto no trae `jsdom` en la suite rápida (ver `orders.ts`).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Los tokens de U-01 que estas dos pantallas eran las últimas en leer. */
const TOKENS_VIEJOS = ['--night', '--voice', '--plain', '--paper-dim', '--gild-lit', '--parchment,', '--ink,'];

const PANTALLAS = [
  { nombre: 'el parte de bienvenida (§9.2)', fichero: 'src/ui/welcome.ts', clase: '.welcome' },
  { nombre: 'el epitafio (§13.3)', fichero: 'src/ui/screens/epitaph.ts', clase: '.epitaph' },
] as const;

/** Sólo el bloque de estilo, para no juzgar los comentarios en prosa. */
function hoja(fichero: string): string {
  const fuente = readFileSync(fichero, 'utf8');
  const desde = fuente.indexOf('const STYLE = `');
  const hasta = fuente.indexOf('`;', desde);
  expect(desde, `${fichero} tiene que declarar su hoja`).toBeGreaterThan(-1);
  return fuente.slice(desde, hasta);
}

describe('VZ-04 · el parte y el epitafio llevan la piel, no los tokens de U-01', () => {
  for (const { nombre, fichero, clase } of PANTALLAS) {
    it(`${nombre} se pinta con el papel de la crónica`, () => {
      const css = hoja(fichero);
      expect(css).toContain('var(--skin-page)');
      expect(css).toContain('var(--skin-parchment-texture)');
      // Y la tinta y las letras son las de la piel.
      expect(css).toContain('var(--skin-ink');
      expect(css).toContain('var(--skin-font-read)');
    });

    it(`${nombre} no lee ni un token de antes del rediseño`, () => {
      const css = hoja(fichero);
      for (const token of TOKENS_VIEJOS) {
        expect(css, `${fichero} sigue leyendo ${token}`).not.toContain(`var(${token}`);
      }
    });

    it(`${nombre} acota su contenido a la columna de 390 px`, () => {
      // La directriz de `piel-del-valle` §1: la superficie cruza la pantalla y
      // su contenido va en columna. Sin esto, a 1240 px de ancho quedaba un
      // renglón de texto perdido en una llanura de pergamino.
      const css = hoja(fichero);
      expect(css).toContain(`${clase} > *`);
      expect(css).toContain('max-width: 390px');
      expect(css).toContain('margin-inline: auto');
    });

    it(`${nombre} atenúa el valle en vez de taparlo (§11.2)`, () => {
      // Un velo del 18 %, el mismo de la decisión: §11.2 pide el valle
      // atenuado y no apagado. El velo de noche que había tapaba la aldea.
      const css = hoja(fichero);
      expect(css).toContain('rgba(27, 22, 19, .18)');
      expect(css).not.toContain('.84');
    });

    it(`${nombre} lleva el canto rasgado, el mismo de las tres secciones`, () => {
      // VZ-2 · **la franja de fusión se queda sin degradado.** Antes la
      // transición entre el valle y la página era un degradado de 64 px, y
      // cada superficie tenía el suyo; ahora la hace el desgarro del papel
      // (`.skin-torn-top`), que es el mismo en las tres secciones y en las
      // tres superposiciones. Lo eligió el dueño del diseño de entre tres
      // alternativas: «me gusta más el borde como de hoja rota».
      const fuente = readFileSync(fichero, 'utf8');
      expect(fuente).toContain('skin-torn-top');
      // La franja se queda, sin degradado: sigue reservando el hueco por el
      // que se ve el valle por encima de la página.
      const css = hoja(fichero);
      expect(css).toContain('-fade { flex: 0 0 64px; }');
      expect(css).not.toContain('linear-gradient(to bottom, transparent');
    });
  }

  it('el epitafio usa los botones de la piel y no esquinas de 10 px propias', () => {
    const fuente = readFileSync('src/ui/screens/epitaph.ts', 'utf8');
    expect(fuente).toContain('skin-button--wood');
    expect(fuente).toContain('skin-button--parchment');
    // Las dos únicas acciones de §13.3: leer la crónica de la que fue, o fundar
    // de nuevo sobre sus ruinas.
    expect(fuente).toContain("renderUiText('epitaph.begin')");
    expect(fuente).toContain("renderUiText('epitaph.chronicle')");
    // Y el sello, que es lo que lo hermana con la decisión.
    expect(fuente).toContain('seal-tree');
  });
});
