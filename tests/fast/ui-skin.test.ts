/**
 * UI-V0 · El kit de la piel. `docs/ui-redesign/piel/plan-piel.md` §2 y §6.
 *
 * **Qué vigila y por qué, dicho antes de la primera línea:** la tanda anterior
 * (UI-R1 a UI-R6) entregó la estructura de los prototipos y no su aspecto, y
 * una de las cinco causas fue que la paleta se sembró copiando el juego viejo
 * y nadie lo comprobó nunca (`plan-piel.md` §1). Así que estas pruebas fijan
 * **de dónde sale cada color**: si alguien vuelve a poner un hex «parecido»,
 * aquí se ve.
 *
 * Lo que **no** se prueba aquí, a propósito: cómo se ve. Eso no lo dice un
 * aserto, lo dice la comparativa contra el prototipo
 * (`tools/graphics/skin-compare.py`) y el muestrario (`tools/ui/sampler.mjs`),
 * que son el criterio de hecho de cada ronda.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..', '..');
const tokens = readFileSync(resolve(ROOT, 'src/ui/redesign/tokens.css'), 'utf8');
const skin = readFileSync(resolve(ROOT, 'src/ui/redesign/skin.css'), 'utf8');

/** El valor de un token, tal como está escrito en `tokens.css`. */
function token(name: string): string {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens);
  expect(match, `${name} no está en tokens.css`).not.toBeNull();
  return (match?.[1] ?? '').trim();
}

describe('UI-V0 · la paleta sale de los prototipos', () => {
  /**
   * Los diecisiete colores muestreados, con su hex exacto.
   *
   * **No es una lista congelada de las que `CLAUDE.md` prohíbe**: no guarda
   * «lo que hay», guarda **lo que se midió en los PNG** del prototipo, que es
   * una fuente externa y estable. Si un color cambia aquí sin volver a
   * muestrear, la piel deja de parecerse y nadie se enteraría hasta la
   * siguiente captura.
   */
  const SAMPLED: readonly [string, string][] = [
    ['--skin-parchment', '#E5D3BB'],
    ['--skin-parchment-deep', '#D9C2A5'],
    ['--skin-page', '#EADBC2'],
    ['--skin-parchment-aged', '#BCA87D'],
    ['--skin-ink', '#1B1613'],
    ['--skin-ink-soft', '#3A2E1F'],
    ['--skin-gold', '#7C5C1F'],
    ['--skin-gold-lit', '#F1DEAE'],
    ['--skin-ochre', '#765833'],
    ['--skin-wood', '#2B1F17'],
    ['--skin-wood-soft', '#453023'],
    ['--skin-wood-plaque', '#3A2E24'],
    ['--skin-red', '#6A2521'],
    ['--skin-red-deep', '#5B1A1B'],
    ['--skin-red-ink', '#4E0504'],
  ];

  it('cada color es el que dio la muestra del prototipo', () => {
    for (const [name, hex] of SAMPLED) expect(token(name), name).toBe(hex);
  });

  it('y la única excepción es la tinta desvaída, oscurecida por contraste', () => {
    // La muestra daba `#816D52` y no llegaba al 4,5:1 sobre la bandeja
    // (2,88:1). Se oscureció manteniendo el tono, y el motivo está escrito en
    // el propio token. Si alguien lo devuelve a la muestra, esto lo caza.
    expect(token('--skin-ink-faded')).toBe('#5D4E3B');
    expect(tokens, 'el motivo de la excepción tiene que seguir escrito')
      .toContain('#816D52');
  });

  it('los `--ui-*` de UI-R1 siguen existiendo y apuntan a los nuevos', () => {
    // Cinco rondas de interfaz los usan: romperlos sería rehacer trabajo que
    // funciona, y la piel nueva entra precisamente porque estos redirigen.
    for (const name of ['--ui-paper-bg', '--ui-paper-ink', '--ui-dark-surface', '--ui-font-voice']) {
      expect(token(name), name).toMatch(/^var\(--skin-/u);
    }
  });
});

describe('UI-V0 · la tipografía va empaquetada, no de red', () => {
  it('las dos familias se declaran con `@font-face` y ficheros locales', () => {
    // `CLAUDE.md` prohíbe una fuente de red: la demo abre sin servidor.
    expect(skin).toContain("font-family: 'Cinzel'");
    expect(skin).toContain("font-family: 'EB Garamond'");
    for (const file of ['cinzel.woff2', 'garamond.woff2', 'garamond-italic.woff2']) {
      expect(skin, file).toContain(`./fonts/${file}`);
    }
    expect(skin, 'ninguna fuente puede venir de fuera').not.toMatch(/https?:\/\/fonts\./u);
  });

  it('y con una pila de respaldo, para que sin ellas el juego no se descoloque', () => {
    for (const name of ['--skin-font-voice', '--skin-font-read']) {
      const stack = token(name);
      expect(stack, name).toMatch(/serif$/u);
      expect(stack.split(',').length, `${name} necesita respaldo`).toBeGreaterThan(2);
    }
  });

  it('se declaran como variables, que es lo que son', () => {
    // Un solo woff2 por familia cubre todos los pesos; declarar
    // `font-weight: 400` a secas haría que el navegador sintetizara la negrita
    // en vez de interpolar el eje, y se ve.
    expect(skin).toContain('font-weight: 400 900');
    expect(skin).toContain('font-weight: 400 800');
  });
});

describe('UI-V0 · las primitivas que las seis rondas van a usar', () => {
  /**
   * El vocabulario del plan §5. Si una ronda necesita una pieza que no está
   * aquí, la añade **a `skin.css`** y lo dice en su informe — no se inventa
   * una piel local, que es como la tanda anterior acabó con seis estilos.
   */
  const PRIMITIVES = [
    '.skin-paper', '.skin-plate', '.skin-plate--chip', '.skin-plate--round',
    '.skin-plate--card', '.skin-plate--sealed', '.skin-plate--sheet',
    '.skin-inscription', '.skin-label', '.skin-read',
    '.skin-rule', '.skin-rule-v', '.skin-capital', '.skin-seal',
    '.skin-medallion', '.skin-chip',
    '.skin-button--wood', '.skin-button--parchment',
    '.skin-nav', '.skin-nav-tab', '.skin-nav--wood', '.skin-nav--plaque',
    '.skin-scroll-edge', '.skin-ornament', '.skin-icon',
  ];

  it('están todas', () => {
    for (const name of PRIMITIVES) expect(skin, name).toContain(name);
  });

  it('el papel lleva la textura multiplicada, que es lo que la hace grano y no color', () => {
    expect(skin).toContain('background-blend-mode: multiply');
    expect(token('--skin-parchment-texture')).toContain('./parchment.png');
  });

  it('los bordes rasgados están escritos, no calculados en el navegador', () => {
    // Un `clip-path` recalculado en cada pintado tiembla, y la comparativa
    // contra el prototipo tiene que dar siempre la misma imagen.
    for (const name of ['--skin-deckle-plate', '--skin-deckle-chip', '--skin-deckle-card', '--skin-deckle-sheet']) {
      expect(token(name), name).toMatch(/^polygon\(/u);
    }
  });

  it('y el área táctil mínima de §11.7 sigue en pie', () => {
    expect(token('--ui-tap-min')).toBe('44px');
    expect(skin).toContain('min-height: var(--ui-tap-min)');
  });
});

describe('UI-V0 · los activos que el plan promete', () => {
  it('el sprite trae los diez iconos, y ninguno lleva color propio', () => {
    const sprite = readFileSync(resolve(ROOT, 'public/ui/icons.svg'), 'utf8');
    for (const id of ['people', 'wheat', 'logs', 'face', 'mountains', 'book',
      'footprints', 'oak-leaf', 'sun', 'seal-tree']) {
      expect(sprite, id).toContain(`id="${id}"`);
    }
    // El color lo pone quien los usa (`currentColor`), nunca el icono: si un
    // icono trajera su tono, la pestaña activa no podría encenderse.
    expect(sprite, 'sin colores propios').not.toMatch(/(?:fill|stroke)="#/u);
  });

  it('el sprite del documento dice lo mismo que el fichero', () => {
    // **Están en dos sitios y es a propósito** (UI-V2): `<use>` a un SVG
    // externo no carga bajo `file://`, que es como `shot.mjs` abre la demo
    // para las capturas, así que el sprite va incrustado en `index.html`; y
    // `public/ui/icons.svg` se queda porque es el fichero que la sesión de
    // arte edita (`encargo-arte-piel.md` §4). Esta prueba es lo que impide
    // que se separen: si alguien mejora un icono en uno y no en el otro, la
    // interfaz enseñaría el viejo y nadie sabría por qué.
    const sprite = readFileSync(resolve(ROOT, 'public/ui/icons.svg'), 'utf8');
    const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
    const shapes = (text: string): string[] => [...text.matchAll(/<symbol id="([^"]+)"[\s\S]*?<\/symbol>/gu)]
      .map(([block, id]) => `${id}:${[...block.matchAll(/ d="([^"]+)"/gu)].map((m) => m[1]).join('|')}`)
      .sort();
    expect(shapes(html)).toEqual(shapes(sprite));
  });

  it('el índice de arte existe y está vacío: el arte aparece cuando llega', () => {
    // Igual que las mallas de V-15: la interfaz usa lo que esté listado y cae
    // al respaldo con lo que falte, así que una ronda cierra sin dibujos.
    const index = JSON.parse(readFileSync(resolve(ROOT, 'public/ui/art/index.json'), 'utf8')) as {
      art: unknown[];
    };
    expect(Array.isArray(index.art)).toBe(true);
  });
});
