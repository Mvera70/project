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

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { actorsFor } from '../../src/render3d/actors';
import { loadAssets } from '../../src/render3d/assets';
import { SCENIC_DAY_SECONDS } from '../../src/render3d/presentation-clock';
import { VALLEY_COLOURS } from '../../src/render3d/visual-config';
import { Village } from '../../src/render3d/world/buildings';
import { PALETTES } from '@render/palette';
import { buildGround, cellColour } from '../../src/render3d/world/ground';
import { groundSignature, isQuiet, planChange, planFor } from '../../src/render3d/world/plan';
import { fingerprint } from '../helpers/fingerprint';

const ROOT = resolve(import.meta.dirname, '..', '..');

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

function frameAt(seconds: number) {
  return {
    tickFraction: 0.5, presentationSeconds: seconds, deltaSeconds: 1 / 60,
    speed: 1 as const, reducedMotion: false, discontinuity: false,
  };
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
    for (let step = 0; step < 100; step += 1) {
      const actors = actorsFor(state, frameAt((step / 100) * SCENIC_DAY_SECONDS));
      expect(actors.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(planFor(state))).toBe(JSON.stringify(once));
  });

  it('construir añade una casa y nada más', () => {
    const state = village(10);
    const before = planFor(state);
    const grownUp = village(16);
    const change = planChange(before, planFor(grownUp));
    // Dieciséis años después hay más edificios, y el plan pide añadir los que
    // faltan en vez de rehacer el pueblo entero.
    expect(change.cleared).toBe(false);
    expect(change.added.length).toBeGreaterThan(0);
    expect(change.removed.length).toBe(0);
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
    if (target !== undefined) target.lostTick = burnt.tick;

    const change = planChange(before, planFor(burnt));
    expect(change.added.length).toBe(0);
    expect(change.removed.length).toBe(0);
    expect(change.changed.length).toBe(1);
    const ruin = change.changed[0];
    expect(ruin?.id).toBe(standing?.id);
    expect(ruin?.ruin).toBe(true);
    expect(ruin?.roofed).toBe(false);
    expect(ruin?.walls).toBeLessThan(standing?.walls ?? 0);
    expect(ruin?.wallColour).not.toBe(standing?.wallColour);
  });

  it('demoler retira, y sólo a ése', () => {
    const state = village(12);
    const before = planFor(state);
    const doomed = before.buildings[Math.floor(before.buildings.length / 2)];
    expect(doomed).toBeDefined();

    const gone = structuredClone(state);
    gone.buildings = gone.buildings.filter((building) => building.id !== doomed?.id);

    const change = planChange(before, planFor(gone));
    expect(change.removed).toEqual([doomed?.id]);
    expect(change.added.length).toBe(0);
    expect(change.changed.length).toBe(0);
  });

  it('talar cambia el suelo y nada más', () => {
    // El bosque es terreno, no edificio: la tala tiene que mover la firma del
    // suelo sin tocar un solo edificio.
    const state = village(10);
    const before = planFor(state);
    const felled = structuredClone(state);
    let cut = 0;
    for (let cell = 0; cell < felled.map.terrain.length && cut < 5; cell += 1) {
      if (felled.map.terrain[cell] === 1) {
        felled.map.terrain[cell] = 5;
        cut += 1;
      }
    }
    expect(cut).toBeGreaterThan(0);

    const change = planChange(before, planFor(felled));
    expect(change.ground).toBe(true);
    expect(change.added.length).toBe(0);
    expect(change.changed.length).toBe(0);
    expect(change.removed.length).toBe(0);
  });

  it('un camino nuevo también cambia el suelo', () => {
    const state = village(10);
    const before = groundSignature(state.map, state.tick);
    const worn = structuredClone(state);
    worn.map.path[100] = 3;
    expect(groundSignature(worn.map, worn.tick)).not.toBe(before);
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
  it('tiene un cuadrado por celda y ni uno más', () => {
    const state = village(6);
    const ground = buildGround(state.map, PALETTES.summer);
    const cells = state.map.width * state.map.height;
    expect(ground.mesh.geometry.getIndex()?.count).toBe(cells * 6);
    expect(ground.mesh.geometry.getAttribute('position').count).toBe(cells * 4);
    ground.dispose();
  });

  it('un camino tapa el terreno que hay debajo', () => {
    const state = village(6);
    const cell = state.map.path.findIndex((wear) => wear > 0);
    expect(cell).toBeGreaterThanOrEqual(0);
    const bare = structuredClone(state);
    bare.map.path[cell] = 0;
    expect(cellColour(state.map, cell, PALETTES.summer)).not.toBe(cellColour(bare.map, cell, PALETTES.summer));
  });

  it('usa los colores que P1 decidió', () => {
    // La paleta es la entrada de autoría de Blender y esto es tiempo de
    // ejecución, así que hay dos copias. Una copia que nadie comprueba se
    // separa, y las dos direcciones de G-03 dejarían de ser el mismo valle.
    const palette = JSON.parse(readFileSync(
      resolve(ROOT, 'art', 'recipes', 'palette.json'), 'utf8',
    )) as { valley: Record<string, string> };
    for (const [role, colour] of Object.entries(VALLEY_COLOURS)) {
      const authored = palette.valley[role];
      if (authored === undefined) continue;
      expect(colour.toUpperCase(), `el papel '${role}'`).toBe(authored.toUpperCase());
    }
  });
});

describe('G-06 · el pueblo', () => {
  it('añade, reemplaza y retira sin tocar a los vecinos', () => {
    const state = village(12);
    const plan = planFor(state);
    const town = new Village();
    for (const building of plan.buildings) town.add(building);
    expect(town.count).toBe(plan.buildings.length);
    expect(town.group.children.length).toBe(plan.buildings.length);

    // Reemplazar el mismo id no duplica: una casa que se convierte en ruina es
    // la misma casa, no una segunda encima.
    const first = plan.buildings[0];
    if (first !== undefined) town.add({ ...first, ruin: true, roofed: false, walls: 0.2 });
    expect(town.count).toBe(plan.buildings.length);

    const before = town.count;
    if (first !== undefined) town.remove(first.id);
    expect(town.count).toBe(before - 1);
    // Y retirar a alguien que no está no rompe nada ni se lleva a otro por medio.
    if (first !== undefined) town.remove(first.id);
    expect(town.count).toBe(before - 1);

    town.dispose();
    expect(town.count).toBe(0);
    expect(town.group.children.length).toBe(0);
  });

  it('un edificio lleva su identidad para que se pueda tocar', () => {
    // D.7 · la selección devuelve identidad al DOM, y para eso la geometría
    // tiene que saber de quién es.
    const state = village(8);
    const planned = planFor(state).buildings[0];
    expect(planned).toBeDefined();
    const town = new Village();
    if (planned !== undefined) town.add(planned);
    const group = town.group.children[0];
    expect(group?.userData.buildingId).toBe(planned?.id);
    for (const part of group?.children ?? []) {
      expect(part.userData.buildingId).toBe(planned?.id);
    }
    town.dispose();
  });
});

describe('G-06 · el manifiesto de recursos', () => {
  const manifestPath = resolve(ROOT, 'public', 'assets', 'valley3d', 'manifest.json');

  it('publica el aldeano con sus clips y su hash', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      schemaVersion: number;
      assets: Array<{ id: string; file: string; sha256: string; motion: Array<{ name: string }> }>;
    };
    expect(manifest.schemaVersion).toBe(1);
    const villager = manifest.assets.find((asset) => asset.id === 'villager');
    expect(villager).toBeDefined();
    expect(villager?.file).toBe('villager.glb');
    expect(villager?.sha256).toMatch(/^[0-9A-F]{64}$/u);
    expect(villager?.motion.map((clip) => clip.name).sort())
      .toEqual(['carry_walk', 'idle', 'walk', 'work_hoe']);
  });

  it('lo publicado es lo que el catálogo aprobó', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      assets: Array<{ id: string; sha256: string }>;
    };
    const catalog = JSON.parse(readFileSync(resolve(ROOT, 'art', 'catalog.json'), 'utf8')) as {
      assets: Array<{ id: string; hashes: Record<string, string> | null }>;
    };
    for (const published of manifest.assets) {
      const approved = catalog.assets.find((asset) => asset.id === published.id);
      const hash = approved?.hashes?.[`${published.id}.glb`];
      expect(hash, `'${published.id}' no está en el catálogo`).toBeDefined();
      expect(published.sha256).toBe(hash);
    }
  });

  it('un manifiesto que no se entiende falla al cargarlo, no al usarlo', async () => {
    const reply = (body: unknown, ok = true): Promise<Response> => Promise.resolve({
      ok, status: ok ? 200 : 404, json: () => Promise.resolve(body),
    } as Response);

    await expect(loadAssets({ baseUrl: '/none/', fetcher: () => reply(null, false) }))
      .rejects.toThrow('No asset manifest');
    await expect(loadAssets({ baseUrl: '/none/', fetcher: () => reply({ schemaVersion: 9, assets: [] }) }))
      .rejects.toThrow('unknown schemaVersion');
    await expect(loadAssets({ baseUrl: '/none/', fetcher: () => reply({ schemaVersion: 1 }) }))
      .rejects.toThrow('no assets');
    await expect(loadAssets({
      baseUrl: '/none/', fetcher: () => reply({ schemaVersion: 1, assets: [{ id: 'x' }] }),
    })).rejects.toThrow('has no file');
  });

  it('y una biblioteca vacía se puede soltar sin haber cargado nada', async () => {
    const library = await loadAssets({
      baseUrl: '/none/',
      fetcher: () => Promise.resolve({
        ok: true, status: 200, json: () => Promise.resolve({ schemaVersion: 1, assets: [] }),
      } as Response),
    });
    expect(library.get('villager')).toBeUndefined();
    expect(library.instance('villager')).toBeUndefined();
    library.dispose();
    library.dispose();
  });
});
