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
const shellSkin = readFileSync(resolve(ROOT, 'src/ui/redesign/shell.css'), 'utf8');
const closeSources = [
  'src/ui/redesign/shell.ts', 'src/ui/redesign/cart.ts',
  'src/ui/screens/chronicle.ts', 'src/ui/screens/annals.ts',
].map((file) => readFileSync(resolve(ROOT, file), 'utf8')).join('\n');
const overlayScreens = [
  'src/ui/screens/crossroad.ts', 'src/ui/screens/annals.ts',
  'src/ui/screens/epitaph.ts', 'src/ui/screens/title.ts',
].map((file) => readFileSync(resolve(ROOT, file), 'utf8')).join('\n');

/** El valor de un token, tal como está escrito en `tokens.css`. */
function token(name: string): string {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens);
  expect(match, `${name} no está en tokens.css`).not.toBeNull();
  return (match?.[1] ?? '').trim();
}

describe('UI-V0 · la paleta sigue la dirección actual del juego', () => {
  /**
   * La dirección aceptada se aparta de los colores de prototipo que Vera
   * rechazó: piedra neutra, marfil, tinta oscura, ámbar y navegación oscura.
   */
  const SAMPLED: readonly [string, string][] = [
    ['--skin-parchment', '#F1EBDD'],
    ['--skin-parchment-deep', '#E7DFD0'],
    ['--skin-page', '#D8D0C0'],
    ['--skin-parchment-aged', '#C9B99E'],
    ['--skin-ink', '#202D33'],
    ['--skin-ink-soft', '#3C4B50'],
    ['--skin-gold', '#A36E24'],
    ['--skin-gold-lit', '#FFF0C7'],
    ['--skin-ochre', '#9A6725'],
    ['--skin-wood', '#203740'],
    ['--skin-wood-soft', '#31525A'],
    ['--skin-wood-plaque', '#29464E'],
    ['--skin-red', '#6A2521'],
    ['--skin-red-deep', '#5B1A1B'],
    ['--skin-red-ink', '#4E0504'],
  ];

  it('cada color es el que dio la muestra del prototipo', () => {
    for (const [name, hex] of SAMPLED) expect(token(name), name).toBe(hex);
  });

  it('mantiene el secundario legible sobre las superficies claras', () => {
    expect(token('--skin-ink-faded')).toBe('#596565');
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
  it('las familias narrativas se declaran con `@font-face` y ficheros locales', () => {
    // `CLAUDE.md` prohíbe una fuente de red: la demo abre sin servidor.
    expect(skin).toContain("font-family: 'Cinzel'");
    expect(skin).toContain("font-family: 'EB Garamond'");
    for (const file of ['cinzel.woff2', 'garamond.woff2', 'garamond-italic.woff2']) {
      expect(skin, file).toContain(`./fonts/${file}`);
    }
    expect(skin, 'ninguna fuente puede venir de fuera').not.toMatch(/https?:\/\/fonts\./u);
  });

  it('reserva la serif a la narración y usa sans para controles y lectura funcional', () => {
    for (const name of ['--skin-font-voice', '--skin-font-read']) {
      const stack = token(name);
      expect(stack, name).toMatch(/sans-serif$/u);
      expect(stack.split(',').length, `${name} necesita respaldo`).toBeGreaterThan(2);
    }
    expect(token('--skin-font-story')).toMatch(/serif$/u);
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
    '.skin-nav', '.skin-nav-tab',
    '.skin-scroll-edge', '.skin-ornament', '.skin-icon',
  ];

  it('están todas', () => {
    for (const name of PRIMITIVES) expect(skin, name).toContain(name);
  });

  it('la superficie de lectura usa curvas topográficas tenues y evita el papel envejecido', () => {
    expect(token('--skin-map-pattern')).toContain('radial-gradient');
    expect(token('--skin-parchment-texture')).toBe('none');
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

describe('UI-V11 · paneles legibles y cierres visibles', () => {
  it('la pestaña seleccionada se distingue con su placa, sin una raya sobre el rótulo', () => {
    expect(skin).not.toContain('.skin-nav-tab[aria-pressed="true"]::after');
    expect(skin).toContain('.skin-nav-tab[aria-pressed="true"]');
  });

  it('los paneles laterales no cubren todo el valle en pantallas anchas', () => {
    expect(shellSkin).toContain('width: min(100%, 760px)');
    expect(skin).toContain('#root .ui-shell-content:has(.chronicle-scrim)');
    expect(skin).toContain('background-color: transparent;\n  background-image: none;\n  box-shadow: none;');
  });

  it('las demás hojas de pantalla también dejan el valle visible en escritorio', () => {
    expect(overlayScreens.match(/width: min\(100%, 760px\)/gu)?.length).toBeGreaterThanOrEqual(6);
  });

  it('los cierres muestran su acción con texto en vez de una X diminuta', () => {
    expect(closeSources).not.toMatch(/textContent\s*=\s*['"]×['"]/u);
    expect(shellSkin).toContain('min-height: var(--ui-tap-min)');
  });
});

describe('UI-V0 · los activos que el plan promete', () => {
  it('el sprite trae los iconos que la interfaz nombra, y ninguno lleva color propio', () => {
    const sprite = readFileSync(resolve(ROOT, 'public/ui/icons.svg'), 'utf8');
    for (const id of ['people', 'wheat', 'logs', 'face', 'mountains', 'book',
      'footprints', 'oak-leaf', 'sun', 'seal-tree',
      // M-0 · las dos existencias nuevas y las cuatro caras del ánimo.
      'stone', 'silver', 'face-low', 'face-grim', 'face-calm', 'face-glad',
      // K-8 · la corona del rey, que la lista de la gente y la ficha pintan.
      'crown']) {
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
