// Lo lento de `tests/fast/graphics-effects.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 18 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// G-08 · design.md §10.3, D.3, D.8 — estaciones y consecuencias visibles.
//
// El objetivo de la ronda dicho por el brief: **que la belleza conserve el valle
// como HUD**. Lo que el jugador tiene que poder leer sin abrir una ficha es que
// hay hambre, que hay peste, que el granero está lleno o vacío, que una casa se
// quemó. El render 2D ya lo dice; lo que estas pruebas guardan es que el 3D no
// pierda ninguna de esas señales por el camino.
//
// La regla que las gobierna todas: **ninguna consecuencia se representa por un
// temporizador propio.** Se lee del estado, y cuando el estado deja de decirla,
// desaparece. Una peste vencida que siguiera manchando casas sería el mismo
// fallo que la v2.18 pagó con cinco rondas de balance.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { SEASONS } from '@engine/time';
import type { GameState } from '@engine/state';
import { PALETTES, TURN_WEEKS } from '@derive/palette';
import { tellsFor } from '@derive/tells';
import {
  BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D,
} from 'three';
import { animalPositions, wildlifePositions, type Animal } from '@derive/animals';
import { valleyCore } from '@derive/anchors';
import { Fauna } from '../../src/render3d/effects/fauna';
import { cellColour } from '../../src/render3d/world/ground';
import { ANIMALS, TIME } from '@engine/balance';
import { TERRAIN_CODE } from '@engine/state';
import { groundSignature } from '../../src/render3d/world/plan';
const grown = new Map<string, GameState>();
/**
 * La aldea de este fichero **se funda con los veinte de §12.2**, no con la
 * pareja.
 *
 * Lo que estas pruebas miden es lo que el valle **enseña sin abrir una ficha**:
 * el humo de una fragua encendida, la luz de una capilla, el nivel del granero,
 * las vacas y los peces. O sea que necesitan una aldea que **tenga** esas
 * cosas, y eso es lo que `foundTwenty` garantiza y una pareja no.
 *
 * Con `foundGame` cuatro de ellas fallaban, y es exactamente la misma causa que
 * movió a dieciocho fixtures en IA-0 (`docs/historico/life-rounds/IA-0.md` §3): el valle
 * de catorce años de la pareja ya no tiene fragua, ni capilla, ni granero, ni
 * vaca. La convención está en `CLAUDE.md` desde v3.69 y este fichero no se había
 * migrado — se descubrió al cerrar IA-5, cuando el agente demostró que esas
 * cuatro rojas no eran de su fase sino preexistentes.
 */
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

/** El mismo valle en la semana que se pida, sin volver a simular. */
function atTick(state: GameState, tick: number): GameState {
  const moved = structuredClone(state);
  moved.tick = tick;
  return moved;
}

describe('G-08 · las estaciones', () => {
  it('el valle cambia de color cuatro veces al año', () => {
    // Sin esto el suelo sólo se reconstruía cuando alguien talaba un árbol, y
    // el valle seguía verde en enero.
    const state = village(10);
    const seen = new Set<number>();
    for (let week = 0; week < 48; week += 1) {
      seen.add(groundSignature(state.map, week));
    }
    // Cuatro estaciones y `TURN_WEEKS` semanas de transición en cada una: una
    // firma por paso, ni una más.
    expect(seen.size).toBe(SEASONS.length * (TURN_WEEKS + 1));
  });

  it('el invierno no se parece al verano en ninguna celda de prado', () => {
    const state = village(10);
    let different = 0;
    let checked = 0;
    for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
      if ((state.map.terrain[cell] ?? 0) !== 0 || (state.map.path[cell] ?? 0) > 0) continue;
      checked += 1;
      if (cellColour(state.map, cell, PALETTES.winter) !== cellColour(state.map, cell, PALETTES.summer)) {
        different += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(different).toBe(checked);
  });
});

describe('G-08 · las consecuencias', () => {
  it('el valle dice sin abrir una ficha qué le pasa a la aldea', () => {
    // La matriz que el brief pide: cada señal existe y sale del estado.
    const state = village(14);
    const kinds = new Set(tellsFor(state).map((tell) => tell.kind));
    // Humo y luz en las casas habitadas, y el granero con su nivel: son las
    // tres que una aldea viva tiene siempre.
    expect(kinds.has('smoke')).toBe(true);
    expect(kinds.has('light')).toBe(true);
    expect(kinds.has('granary')).toBe(true);
  });

  it('una peste se ve mientras dura y deja de verse al vencerla', () => {
    // La regla entera de la ronda: no hay temporizador propio. Cuando el estado
    // deja de decir peste, la mancha desaparece sola.
    const state = village(14);
    const sick = structuredClone(state);
    sick.outbreak = { startedTick: sick.tick, endsTick: sick.tick + 6, deaths: 0 };
    const during = tellsFor(sick).filter((tell) => tell.kind === 'plague');
    expect(during.length).toBeGreaterThan(0);

    // Vencida: el mismo estado, con la peste ya caducada.
    const cured = structuredClone(sick);
    cured.tick = sick.outbreak.endsTick;
    expect(tellsFor(cured).filter((tell) => tell.kind === 'plague')).toEqual([]);
  });
});

describe('IA-5 · el lobo tiene una sola fuente en 3D', () => {
  function model(): Object3D {
    const group = new Group();
    group.add(new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshStandardMaterial()));
    return group;
  }

  it('la fórmula vieja ya no pone lobos en la escena 3D, aunque siga dándolos para Canvas', () => {
    // Noche de invierno: la ventana en la que el lobo decorativo
    // (`wildlifePositions`) sale siempre que haga frío, pase o no
    // `wolves_at_the_coop` esa semana en concreto — es justo la doble fuente
    // que esta fase quita del 3D. Canvas (`render/renderer.ts`) sigue
    // llamando a `wildlifePositions` directamente y no pasa por `Fauna`, así
    // que su lobo no se toca: se comprueba aquí que la función lo sigue dando.
    //
    // **El valle se busca entre varios, por lo que tiene** (2 oct 2026). Los
    // lobos de la fórmula bajan de la linde del bosque que queda a
    // `ANIMALS.WOLF_RANGE` del pueblo, así que la propiedad sólo se puede mirar
    // en un valle que tenga bosque a ese alcance. Con el valle de forma natural
    // (v5.73) la aldea de la semilla 7 —la única que miraba esta prueba— ya no
    // lo guardaba a los veinte años y la fórmula no daba ni un lobo. Es la
    // misma causa y el mismo arreglo que la prueba gemela de la suite rápida
    // (`tests/fast/animals.test.ts`, «los lobos son de noche y de invierno»).
    // Medido a los veinte años en las cinco candidatas: con el contorno sólo la
    // 11 tiene bosque a ese alcance (94 celdas; el árbol más cercano de las
    // otras queda a 16–17 del centro del pueblo), y en `main` cuatro de cinco.
    const near = (candidate: GameState): boolean => {
      const core = valleyCore(candidate);
      return candidate.map.terrain.some((terrain, cell) => terrain === TERRAIN_CODE.forest
        && Math.hypot(cell % candidate.map.width - core.x, Math.floor(cell / candidate.map.width) - core.y)
          <= ANIMALS.WOLF_RANGE);
    };
    let base: GameState | undefined;
    for (const seed of [7, 3, 11, 19, 23]) {
      const candidate = village(20, seed);
      if (near(candidate)) { base = candidate; break; }
    }
    expect(base, 'algún valle con bosque cerca del pueblo').toBeDefined();
    if (base === undefined) return;
    const winter = TIME.WEEKS_PER_SEASON * 3 + 4;
    const moment = atTick(
      base, Math.floor(base.tick / TIME.WEEKS_PER_YEAR) * TIME.WEEKS_PER_YEAR + winter,
    );
    const formulaWolves = wildlifePositions(moment, 0.95).filter((a) => a.kind === 'wolf');
    expect(formulaWolves.length, 'la fórmula sigue dando lobos, para Canvas').toBeGreaterThan(0);
    // Y de noche el resto de la cabaña está recogida (§10.6), así que si algo
    // se pinta a esta hora sólo puede ser el lobo de la fórmula — el que no
    // tiene que colarse.
    expect(animalPositions(moment, 0.95)).toEqual([]);

    const fauna = new Fauna(() => model());
    fauna.update(moment, 0.95); // sin `live`: nada de la fórmula debe colarse.
    expect(fauna.count).toBe(0);
    fauna.dispose();
  });

  it('con un lobo vivo, la escena pinta exactamente ése', () => {
    const state = village(20);
    const fauna = new Fauna(() => model());
    const live: Animal[] = [{ id: 20_000, kind: 'wolf', x: 5, y: 5 }];
    // De noche, para que la cabaña de la fórmula no aporte nada y lo único
    // que pueda haber en escena sea `live`.
    fauna.update(state, 0.95, live);
    expect(fauna.count).toBe(1);
    fauna.dispose();
  });
});
