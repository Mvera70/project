// Lo lento de `tests/fast/graphics-world.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 24 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// G-06 · design.md D.5, D.6 — la escena conectada a una partida.
//
// Lo que se prueba aquí es la contabilidad, no la imagen: qué tiene que estar en
// la escena, qué cambia cuando el mundo cambia y qué se suelta cuando algo se
// va. La imagen la juzga una persona, y para eso hace falta G-07.
//
// El renderer entero no cabe en la suite rápida porque necesita WebGL. Lo que sí
// cabe —y es donde viven los fallos que no se ven mirando— es el plan de escena,
// que es una función pura del estado, y las dos piezas que gestionan objetos:
// el pueblo y el reparto.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { ford, run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import type { Actor } from '../../src/render3d/contracts';
import type { LoadedAsset } from '../../src/render3d/assets';
import { TERRAIN_CODE } from '@engine/state';
import { Cast } from '../../src/render3d/world/cast';
import { fordCells } from '../../src/render3d/world/ford';
import { createVillage } from '../../src/render3d/life/village';
import { castOf } from '../../src/render3d/life/cast';
import { LIFE_STEP } from '../../src/render3d/life/clock';
import { PALETTES } from '@derive/palette';
import { buildGround, elevationAt } from '../../src/render3d/world/ground';
import { isQuiet, planChange, planFor } from '../../src/render3d/world/plan';
import { fingerprint } from '../helpers/fingerprint';
const grown = new Map<string, GameState>();
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

/**
 * Un valle que haya tenido tiempo de abrir camino de verdad (§7.6).
 *
 * Buscando entre semillas en vez de fiando en una: cuánto se pisa depende de
 * por dónde reparte la gente sus destinos, y eso cambia de partida en partida.
 * En v3.61 el carácter movió las rutas y la semilla 7 dejó de tener ninguna
 * celda de nivel 2 a los catorce años, con lo que dos pruebas del suelo se
 * quedaron sin sitio que medir y acusaron al dibujo de un fallo que no era.
 */
function trodden(): { state: GameState; cell: number } {
  for (const seed of [7, 11, 23, 41, 97, 3]) {
    for (const years of [14, 30, 60]) {
      const state = village(years, seed);
      const cell = state.map.path.findIndex(
        (wear, at) => wear >= 2 && state.map.terrain[at] === 0,
      );
      if (cell >= 0) return { state, cell };
    }
  }
  throw new Error('ninguna partida abrió camino de nivel 2');
}

describe('G-06 · el plan de escena', () => {
  it('planificar no escribe en el estado ni consume una tirada', () => {
    const state = village(10);
    const before = fingerprint(state);
    for (let step = 0; step < 30; step += 1) planFor(state);
    expect(fingerprint(state)).toBe(before);
  });

  it('un fotograma quieto no pide tocar nada', () => {
    // D.6: no reconstruir todo cada fotograma. La mayoría de los fotogramas no
    // tienen nada que reconstruir, y esto es lo que lo dice en voz alta.
    const state = village(10);
    const first = planFor(state);
    const second = planFor(state);
    expect(isQuiet(planChange(first, second))).toBe(true);
  });

  it('el mismo estado da el mismo plan, pinte los fotogramas que pinte', () => {
    // El estado tiene que quedar idéntico se pinten uno o cien fotogramas, y el
    // plan también: si pintar cambiara algo, no habría forma de reproducir una
    // partida al volver de un letargo.
    const state = village(10);
    const once = planFor(state);
    let drawn = 0;
    // V-12: quien produce el reparto es la capa de vida, no una fórmula del
    // reloj. La propiedad que esta prueba guarda no cambia —vivir la jornada no
    // puede tocar el plan— pero ahora se comprueba sobre quien de verdad la
    // vive, que es el único camino que queda.
    const life = createVillage(state, 0);
    for (let step = 0; step < 100; step += 1) {
      life.step();
      drawn += castOf(life, step * LIFE_STEP, new Map(), new Set()).length;
    }
    // Que se haya dibujado gente **en el día**, no en cada fotograma: desde
    // v3.62 la noche no tiene a nadie fuera, y exigir un actor en todos los
    // instantes era pedir que alguien durmiera en la calle. Lo que esta prueba
    // guarda es lo de la última línea: pintar no cambia el plan.
    expect(drawn, 'a lo largo del día se dibuja gente').toBeGreaterThan(0);
    expect(JSON.stringify(planFor(state))).toBe(JSON.stringify(once));
  });

  it('el crecimiento añade edificios y retira los solares perdidos ya reutilizados', () => {
    const state = village(10);
    const before = planFor(state);
    const grownUp = village(16);
    const change = planChange(before, planFor(grownUp));
    // Dieciséis años después hay más edificios, y el plan pide añadir los que
    // faltan en vez de rehacer el pueblo entero.
    expect(change.cleared).toBe(false);
    expect(change.added.length).toBeGreaterThan(0);
    for (const id of change.removed) {
      const historical = grownUp.buildings.find(building => building.id === id);
      expect(historical).toBeDefined();
      expect(historical?.lostTick).not.toBeNull();
    }
  });

  it('una ruina deja de ser una casa: más baja, más gris y sin tejado', () => {
    // §7.4 deja la ruina en el mapa, así que tiene que leerse como ruina desde
    // la panorámica, donde una persona mide seis píxeles y nadie lee etiquetas.
    const state = village(12);
    const before = planFor(state);
    const standing = before.buildings.find((building) => !building.ruin && building.roofed);
    expect(standing).toBeDefined();

    const burnt = structuredClone(state);
    const target = burnt.buildings.find((building) => building.id === standing?.id);
    if (target !== undefined) {
      target.lostTick = burnt.tick;
      for (let z = target.y; z < target.y + target.h; z += 1) {
        for (let x = target.x; x < target.x + target.w; x += 1) burnt.map.ruins[z * burnt.map.width + x] = 1;
      }
    }

    const change = planChange(before, planFor(burnt));
    expect(change.added.length).toBe(0);
    expect(change.removed.length).toBe(0);
    // **La que se arruina cambia, y con ella la valla que se le apoyaba.**
    // Medido el 18 sep 2026, tras P-1: al arruinar el granero de la semilla 7
    // en (29,56) cambian dos —el granero y la empalizada de (31,56)— porque una
    // valla se dibuja según sus vecinas (`world/plan.ts`), y con la plaza
    // reservada el trazado dejó a las dos pegadas. Pedir exactamente una era
    // pedir que el granero no tuviera vecinos, que es la biografía de un
    // trazado y no la propiedad: lo que esta prueba guarda es **cómo se lee una
    // ruina**, así que se busca la ruina entre lo que cambió.
    expect(change.changed.length).toBeGreaterThanOrEqual(1);
    const ruin = change.changed.find((entry) => entry.id === standing?.id);
    expect(ruin, 'la que se arruina está entre las que cambian').toBeDefined();
    expect(ruin?.ruin).toBe(true);
    expect(ruin?.roofed).toBe(false);
    expect(ruin?.walls).toBeLessThan(standing?.walls ?? 0);
    expect(ruin?.wallColour).not.toBe(standing?.wallColour);
  });

  it('demoler retira, y sólo a ése', () => {
    // **Y se demuele algo que esté solo**, no un tramo de valla. Lo enseñó M-1:
    // esta prueba cogía «el edificio de en medio» y, con la trayectoria nueva,
    // ése pasó a ser un tramo de empalizada — cuyo vecino **sí** cambia de
    // forma al quedarse sin él, porque una valla sabe con quién enlaza
    // (`connections`). Eso no es un defecto del plan: es lo que el plan tiene
    // que hacer, y va en la prueba de abajo. Aquí se mide lo que el título
    // dice, sobre una pieza que no se da la mano con nadie.
    const state = village(12);
    const before = planFor(state);
    const doomed = before.buildings.find(
      (building) => building.kind !== 'palisade' && building.kind !== 'wall');
    expect(doomed).toBeDefined();

    const gone = structuredClone(state);
    gone.buildings = gone.buildings.filter((building) => building.id !== doomed?.id);

    const change = planChange(before, planFor(gone));
    expect(change.removed).toEqual([doomed?.id]);
    expect(change.added.length).toBe(0);
    expect(change.changed.length).toBe(0);
  });

  it('pero quitar un tramo de valla cambia la forma de sus vecinos', () => {
    // La otra mitad, y es una propiedad del plan que no estaba escrita: los
    // tramos de empalizada se dibujan según con cuántos lados enlazan, así que
    // abrir un hueco en la cerca **tiene** que cambiar a los de al lado. Si
    // algún día deja de hacerlo, la valla saldrá con una esquina suelta.
    const state = village(12);
    const before = planFor(state);
    const fence = before.buildings.filter((building) => building.kind === 'palisade');
    if (fence.length < 2) return; // este valle no levantó cerca; no hay nada que medir
    const doomed = fence[Math.floor(fence.length / 2)];
    const gone = structuredClone(state);
    gone.buildings = gone.buildings.filter((building) => building.id !== doomed?.id);

    const change = planChange(before, planFor(gone));
    expect(change.removed).toEqual([doomed?.id]);
    expect(change.changed.length).toBeGreaterThan(0);
    for (const changed of change.changed) expect(changed.kind).toBe('palisade');
  });

  it('otra partida se tira entera, no se actualiza', () => {
    // Actualizar una casa de otro valle para convertirla en una de éste dejaría
    // en pie lo que las dos partidas casualmente compartieran.
    const mine = planFor(village(10, 7));
    const other = planFor(village(10, 23));
    const change = planChange(mine, other);
    expect(change.cleared).toBe(true);
    expect(change.ground).toBe(true);
    expect(change.added.length).toBe(other.buildings.length);
  });
});

describe('G-06 · el suelo', () => {
  const vertexAt = (x: number, z: number, width: number): number => z * (width + 1) + x;
  const cornersOf = (cell: number, width: number): readonly [number, number, number, number] => {
    const x = cell % width;
    const z = Math.floor(cell / width);
    return [
      vertexAt(x, z, width), vertexAt(x + 1, z, width),
      vertexAt(x + 1, z + 1, width), vertexAt(x, z + 1, width),
    ];
  };

  it('un camino muy pisado deja rodada', () => {
    // El paso se lleva la hierba y luego la tierra. Lo que se ve desde arriba
    // no es el hundimiento, es la sombra de su borde.
    const { state, cell: worn } = trodden();
    const ground = buildGround(state.map, PALETTES.summer);
    const position = ground.mesh.geometry.getAttribute('position');
    const lowest = (cell: number): number => {
      let value = Infinity;
      for (const vertex of cornersOf(cell, state.map.width)) value = Math.min(value, position.getY(vertex));
      return value;
    };
    expect(worn).toBeGreaterThanOrEqual(0);
    const bare = state.map.terrain.findIndex(
      (kind, cell) => kind === 0 && (state.map.path[cell] ?? 0) === 0,
    );
    expect(lowest(worn)).toBeLessThan(lowest(bare));
    ground.dispose();
  });
});
describe('G-10 · lo que pisa el valle sigue su cota', () => {
  it('un aldeano no flota sobre el camino hundido', () => {
    // En cuanto el suelo dejó de ser plano dejó de valer ponerlo todo a cero.
    const { state, cell: worn } = trodden();
    const model = (): Object3D => {
      const group = new Group();
      group.add(new Mesh(new BoxGeometry(0.2, 0.6, 0.2), new MeshStandardMaterial()));
      return group;
    };
    const person = (id: number, x: number, z: number): Actor => ({
      id: id as Actor['id'], x, z, facing: 0, activity: 'resting',
      clip: 'idle', clipSeconds: 0, travelled: 0, cell: 0, named: false, age: 30, talking: false,
    arguing: false,
    occupation: null,
      role: null,
    });
    const cast = new Cast({ clips: [] } as unknown as LoadedAsset, model);
    cast.standOn((x, z) => elevationAt(state.map, x, z));

    const bare = state.map.terrain.findIndex((kind, cell) => kind === 0 && (state.map.path[cell] ?? 0) === 0);
    expect(worn).toBeGreaterThanOrEqual(0);
    const at = (cell: number): [number, number] => [
      (cell % state.map.width) + 0.5, Math.floor(cell / state.map.width) + 0.5,
    ];
    cast.show([person(1, ...at(worn)), person(2, ...at(bare))]);
    const [onPath, onGrass] = cast.group.children;
    expect(onPath?.position.y).toBeLessThan(onGrass?.position.y ?? 0);
    cast.dispose();
  });
});

describe('G-10 · el vado', () => {
  it('usa exactamente el paso que está marcado en el mapa', () => {
    // El mapa grande guarda el agua somera como terreno propio. Volver a buscar
    // agua desde una orilla inventaba una segunda geometría y podía dibujar una
    // hilera de hasta catorce losas fuera del paso real.
    const state = village(14);
    const at = ford(state);
    const cells = fordCells(state.map, at.x, at.y);
    const marked = [...state.map.terrain.keys()]
      .filter((cell) => state.map.terrain[cell] === TERRAIN_CODE.ford);
    expect(cells).toEqual(marked);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThanOrEqual(6);
  });
});
