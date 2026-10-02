// Lo lento de `tests/fast/marks.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 37 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-33 · design.md §11.8 — el estandarte y el apagón.
//
// Lo que se protege: que un estandarte ondee los años que dice el catálogo y
// ni uno más, que apagar un edificio le quite de verdad el humo y la luz, que
// `who` apague la casa de esa persona y no otra, y que nada de esto escriba
// en el estado ni gaste una tirada.
import { standing } from '@engine/subsistence/building-counts';
import type { BuildingKind } from '@engine/state';
import { foundTwenty, villageWhere } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { MARKS } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import type { Catalogue } from '@engine/crossroads/schema';
import { run } from '@engine/sim';
import { bannersAt, dousedAt } from '@derive/marks';
import { tellsFor } from '@derive/tells';
import type { GameState } from '@engine/state';

// **Un valle de casas de madera (RD-3, 1 oct 2026).** La pregunta de la primera
// piedra sale ahora con la iglesia —año 4 a 8— y la política prudente contesta
// «las casas»: a los veinte años todas son `stone_house`, y `dousedAt` sin `who`
// apaga «la primera casa **de madera** en pie» (`kind: 'house'`), que ya no hay.
// Lo que estas pruebas guardan es el apagón y no la piedra, así que el valle se
// juega sin esa pregunta.
const WOODEN: Catalogue = CATALOG.filter((t) => t.id !== 'first_stone');

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, years * 48, 'prudent', WOODEN);
    grown.set(key, base);
  }
  return structuredClone(base);
}

/**
 * Una opción del catálogo que declara este efecto visible.
 *
 * `banner` pide además que dure un número concreto de años, porque el primero
 * del catálogo lleva `years: 0` — que es «para siempre» (§3.1) — y una prueba
 * de caducidad sobre él no mediría nada.
 *
 * `douse` pide que sea sobre una casa: el primero del catálogo apaga una
 * fragua, y `tellsFor` no dibuja humo ni luz en las fraguas, así que apagarla
 * no cambiaría la imagen y la prueba pasaría por la razón equivocada.
 */
function optionWith(
  kind: 'banner' | 'douse',
  want: 'any' | 'lasting' | 'house' = 'any',
): { templateId: string; optionId: string } {
  for (const t of CATALOG) {
    for (const o of t.options) {
      const effect = o.visible.find((v) => v.k === kind);
      if (effect === undefined) continue;
      if (want === 'lasting' && effect.k === 'banner' && effect.years === 0) continue;
      if (want === 'house' && effect.k === 'douse' && effect.kind !== 'house') continue;
      return { templateId: t.id, optionId: o.id };
    }
  }
  throw new Error(`el catálogo no tiene ningún ${kind} de tipo ${want}`);
}

function record(
  state: GameState,
  kind: 'banner' | 'douse',
  want: 'any' | 'lasting' | 'house' = 'any',
  cast = {},
): void {
  const { templateId, optionId } = optionWith(kind, want);
  state.history.push({ tick: state.tick, templateId, optionId, cast });
}
describe('el estandarte · §11.8', () => {
  it('sin decisiones no ondea ninguno', () => {
    const state = village(20);
    state.history = [];
    expect(bannersAt(state, CATALOG)).toEqual([]);
  });

  it('una decisión lo iza', () => {
    const state = village(20);
    state.history = [];
    record(state, 'banner');
    expect(bannersAt(state, CATALOG).length).toBe(1);
  });
});

/**
 * Una aldea con en pie **el tipo de edificio que apaga la opción que esta
 * prueba usa**, leído del propio catálogo y no escrito a mano: si mañana el
 * primer `douse` del catálogo apaga otra cosa, esto sigue midiendo lo mismo.
 *
 * Hace falta desde R-1 §2.6, porque el rayo quema y ninguna puerta lo impide:
 * la semilla 7 llegaba a los veinte años sin el edificio, `dousedAt` no tenía
 * nada que apagar y la prueba fallaba por la suerte de un valle. Ver
 * `villageWhere` (`tests/helpers/founding.ts`).
 */
function dousedKind(): BuildingKind {
  const { templateId, optionId } = optionWith('douse');
  const option = CATALOG.find((t) => t.id === templateId)?.options.find((o) => o.id === optionId);
  const effect = option?.visible.find((v) => v.k === 'douse');
  return effect !== undefined && effect.k === 'douse' ? (effect.kind as BuildingKind) : 'house';
}

function doused(): GameState {
  const kind = dousedKind();
  const found = villageWhere(20, (s) => standing(s, kind).length > 0, undefined, WOODEN);
  expect(found, `alguna semilla debe llegar a los 20 años con ${kind} en pie`).not.toBeNull();
  return found as GameState;
}

describe('el apagón · §11.8', () => {
  it('una decisión apaga un edificio', () => {
    // El valle se elige por tener algo encendido que apagar, no por su número
    // (R-1 §2.6: el rayo quema fraguas y capillas, y la semilla 7 se queda sin
    // ninguna). La propiedad medida no cambia.
    const state = doused();
    state.history = [];
    record(state, 'douse');
    expect(dousedAt(state, CATALOG).size).toBeGreaterThan(0);
  });

  it('se vuelve a encender pasado su plazo', () => {
    const state = doused();
    state.history = [];
    record(state, 'douse');

    state.tick += MARKS.DOUSE_TICKS - 1;
    expect(dousedAt(state, CATALOG).size, 'la última semana sigue a oscuras').toBeGreaterThan(0);

    state.tick += 1;
    expect(dousedAt(state, CATALOG).size, 'y a la siguiente ya no').toBe(0);
  });

  it('apagar le quita el humo y la luz a ese edificio', () => {
    // Lo único que de verdad importa: que el apagón se note en la imagen.
    //
    // Sobre varias semillas y no sobre una: apagar «una casa» no quita nada si
    // en esa aldea concreta las casas no tenían señal que quitar, y entonces la
    // prueba no mide el apagón sino la suerte del escenario. Pasó en v3.61,
    // cuando el carácter cambió las partidas.
    let quieted = 0;
    let tried = 0;
    for (const seed of [7, 11, 23, 41, 97]) {
      const state = village(20, seed);
      state.history = [];
      const before = tellsFor(state).length;
      record(state, 'douse', 'house');
      const after = tellsFor(state).length;
      expect(after, `semilla ${seed}: apagar nunca añade señales`).toBeLessThanOrEqual(before);
      if (after < before) quieted += 1;
      tried += 1;
    }
    expect(quieted, `apagar se nota en la imagen (${quieted}/${tried} aldeas)`)
      .toBeGreaterThan(0);
  });
});
