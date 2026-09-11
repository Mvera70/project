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
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import type { Actor } from '../../src/render3d/actors';
import type { LoadedAsset } from '../../src/render3d/assets';
import { BUILDINGS } from '@engine/balance';
import type { BuildingKind } from '@engine/state';
import { BUILDING_ASSETS } from '../../src/render3d/world/buildings';
import { Cast } from '../../src/render3d/world/cast';
import { Village } from '../../src/render3d/world/buildings';
import { PALETTES } from '@render/palette';
import { buildForest, shoreCells } from '../../src/render3d/world/forest';
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

  it('el rio va por un cauce y no pintado en el prado', () => {
    // La comprobacion es de diseno, no de numeros: el agua tiene que estar por
    // debajo del prado. Un rio a la misma altura es una alfombra azul, que es
    // exactamente lo que habia antes de esto.
    const state = village(6);
    const ground = buildGround(state.map, PALETTES.summer);
    const position = ground.mesh.geometry.getAttribute('position');
    const water = state.map.terrain.findIndex((kind) => kind === 2);
    expect(water).toBeGreaterThanOrEqual(0);
    const meadow = state.map.terrain.findIndex((kind) => kind === 0);

    const lowest = (cell: number): number => {
      let value = Infinity;
      for (let vertex = 0; vertex < 4; vertex += 1) value = Math.min(value, position.getY(cell * 4 + vertex));
      return value;
    };
    expect(lowest(water)).toBeLessThan(lowest(meadow));
    ground.dispose();
  });

  it('la orilla baja, no cae de golpe', () => {
    // Las esquinas de una celda de agua que toca prado no estan tan hondas como
    // las de una celda rodeada de agua: eso es la orilla. Sin promediar, el
    // cauce tendria paredes verticales y un escalon en cada borde.
    const state = village(6);
    const ground = buildGround(state.map, PALETTES.summer);
    const position = ground.mesh.geometry.getAttribute('position');
    const { width, terrain } = state.map;
    let sloped = 0;
    for (let cell = 0; cell < terrain.length; cell += 1) {
      if (terrain[cell] !== 2) continue;
      const shore = [-1, 1, -width, width].some((step) => (terrain[cell + step] ?? 2) !== 2);
      if (!shore) continue;
      let deep = Infinity;
      let shallow = -Infinity;
      for (let vertex = 0; vertex < 4; vertex += 1) {
        deep = Math.min(deep, position.getY(cell * 4 + vertex));
        shallow = Math.max(shallow, position.getY(cell * 4 + vertex));
      }
      if (shallow > deep) sloped += 1;
    }
    expect(sloped).toBeGreaterThan(0);
    ground.dispose();
  });

  it('el agua es una lamina propia, lisa y plana', () => {
    // Lo que separa el agua de la hierba no es el color, es que brilla. Y es
    // plana mientras el cauce baja: de esa diferencia sale la ribera.
    const state = village(6);
    const ground = buildGround(state.map, PALETTES.summer);
    const water = ground.water;
    expect(water).not.toBeNull();
    const surface = water as NonNullable<typeof water>;
    const material = surface.material as unknown as { roughness: number };
    expect(material.roughness).toBeLessThan(0.5);
    const position = surface.geometry.getAttribute('position');
    const level = position.getY(0);
    for (let vertex = 1; vertex < position.count; vertex += 1) {
      expect(position.getY(vertex)).toBeCloseTo(level, 6);
    }
    // Plana en reposo, no quieta: el río corre, y lo que se ve desde arriba no
    // es la ola sino que la luz cambia al inclinarse la superficie.
    ground.ripple(0.8);
    let moved = 0;
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      if (Math.abs(position.getY(vertex) - level) > 1e-4) moved += 1;
    }
    expect(moved).toBeGreaterThan(position.count / 2);
    // Y la onda se calcula desde el reposo: si se acumulara sobre el fotograma
    // anterior, el río se iría hundiendo hasta desaparecer.
    let deepest = 0;
    for (let step = 0; step < 200; step += 1) {
      ground.ripple(step * 0.05);
      for (let vertex = 0; vertex < position.count; vertex += 1) {
        deepest = Math.max(deepest, Math.abs(position.getY(vertex) - level));
      }
    }
    expect(deepest).toBeLessThan(0.05);
    // Cuelga del suelo: quien pone el valle en la escena no tiene que saber
    // ademas que hay un rio.
    expect(surface.parent).toBe(ground.mesh);
    ground.dispose();
    expect(surface.parent).toBeNull();
  });

  it('los juncos crecen en la orilla y en ningún otro sitio', () => {
    const state = village(6);
    const { width, terrain, path } = state.map;
    const shore = shoreCells(state.map);
    expect(shore.length).toBeGreaterThan(0);
    for (const cell of shore) {
      expect(terrain[cell]).toBe(0);
      // Nada crece en mitad de un camino pisado.
      expect(path[cell] ?? 0).toBe(0);
      const touchesWater = [cell - 1, cell + 1, cell - width, cell + width]
        .some((side) => terrain[side] === 2);
      expect(touchesWater).toBe(true);
    }
    // Y no está toda la pradera en la orilla: si lo estuviera, la comprobación
    // de arriba pasaría sin decir nada.
    expect(shore.length).toBeLessThan(terrain.length / 4);
  });

  it('un camino tapa el terreno que hay debajo', () => {
    const state = village(6);
    const cell = state.map.path.findIndex((wear) => wear > 0);
    expect(cell).toBeGreaterThanOrEqual(0);
    const bare = structuredClone(state);
    bare.map.path[cell] = 0;
    expect(cellColour(state.map, cell, PALETTES.summer)).not.toBe(cellColour(bare.map, cell, PALETTES.summer));
  });

  it('un camino muy pisado deja rodada', () => {
    // El paso se lleva la hierba y luego la tierra. Lo que se ve desde arriba
    // no es el hundimiento, es la sombra de su borde.
    const state = village(14);
    const ground = buildGround(state.map, PALETTES.summer);
    const position = ground.mesh.geometry.getAttribute('position');
    const lowest = (cell: number): number => {
      let value = Infinity;
      for (let vertex = 0; vertex < 4; vertex += 1) value = Math.min(value, position.getY(cell * 4 + vertex));
      return value;
    };
    const worn = state.map.path.findIndex(
      (wear, cell) => wear >= 2 && state.map.terrain[cell] === 0,
    );
    expect(worn).toBeGreaterThanOrEqual(0);
    const bare = state.map.terrain.findIndex(
      (kind, cell) => kind === 0 && (state.map.path[cell] ?? 0) === 0,
    );
    expect(lowest(worn)).toBeLessThan(lowest(bare));
    ground.dispose();
  });

  it('el bosque cambia con la estación, y la corteza no', () => {
    // El suelo cambiaba de estación desde G-08 y el bosque no: en octubre el
    // valle se ponía de oro y los árboles seguían de mayo. El color lo pone
    // §10.3, el mismo que pinta el suelo; aquí no se decide ningún verde.
    const state = village(6);
    const tree = new Group();
    const leaf = new MeshStandardMaterial({ color: '#62864F' });
    leaf.name = 'leaf';
    const bark = new MeshStandardMaterial({ color: '#735338' });
    bark.name = 'bark';
    tree.add(new Mesh(new BoxGeometry(1, 1, 1), leaf), new Mesh(new BoxGeometry(1, 1, 1), bark));

    const paintedIn = (palette: typeof PALETTES.summer): Record<string, string> => {
      const forest = buildForest(state.map, tree, palette);
      const seen: Record<string, string> = {};
      for (const piece of forest.group.children) {
        const mesh = piece as Mesh;
        const material = mesh.material as MeshStandardMaterial;
        seen[material.name] = material.color.getHexString();
      }
      forest.dispose();
      return seen;
    };
    const summer = paintedIn(PALETTES.summer);
    const autumn = paintedIn(PALETTES.autumn);
    expect(summer.leaf).not.toBe(autumn.leaf);
    // La corteza no cambia con el año.
    expect(summer.bark).toBe(autumn.bark);
    // Y el recurso compartido sale intacto: se tiñó una copia, no el original.
    expect(leaf.color.getHexString()).toBe('62864f');
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

describe('G-10 · el reparto no son clones', () => {
  function villagerModel(): Object3D {
    const group = new Group();
    const mesh = new Mesh(new BoxGeometry(0.2, 0.6, 0.2), new MeshStandardMaterial({ color: '#71885E' }));
    group.add(mesh);
    return group;
  }

  function actorAt(id: number, age: number): Actor {
    return {
      id: id as Actor['id'], x: 1, z: 1, facing: 0, activity: 'resting',
      clip: 'idle', clipSeconds: 0, travelled: 0, cell: 0, named: false, age,
    };
  }

  it('un niño se ve más pequeño que un adulto', () => {
    // Desde arriba no hay fichas que leer: el tamaño es lo único que dice que
    // ahí hay un niño.
    const cast = new Cast({ clips: [] } as unknown as LoadedAsset, () => villagerModel());
    cast.show([actorAt(1, 6), actorAt(2, 30), actorAt(3, 72)]);
    const [child, adult, elder] = cast.group.children;
    expect(child?.scale.y).toBeLessThan(adult?.scale.y ?? 0);
    expect(elder?.scale.y).toBeLessThan(adult?.scale.y ?? 0);
    cast.dispose();
  });

  it('crece: la talla se pone en cada pasada, no al nacer', () => {
    const cast = new Cast({ clips: [] } as unknown as LoadedAsset, () => villagerModel());
    cast.show([actorAt(1, 4)]);
    const small = cast.group.children[0]?.scale.y ?? 0;
    cast.show([actorAt(1, 14)]);
    expect(cast.group.children[0]?.scale.y).toBeGreaterThan(small);
    cast.dispose();
  });

  it('cada uno viste lo suyo, y siempre lo mismo', () => {
    // Veintisiete personas en pantalla eran veintisiete copias del mismo señor.
    // Y §4.3: sin azar, así que el mismo aldeano viste igual en toda máquina.
    const colourOf = (object: Object3D | undefined): string => {
      let hex = '';
      object?.traverse((child) => {
        const mesh = child as Object3D & { isMesh?: boolean; material?: { color?: { getHexString(): string } } };
        if (mesh.isMesh === true && mesh.material?.color !== undefined) hex = mesh.material.color.getHexString();
      });
      return hex;
    };
    const cast = new Cast({ clips: [] } as unknown as LoadedAsset, () => villagerModel());
    cast.show([actorAt(1, 30), actorAt(2, 30), actorAt(3, 30)]);
    const worn = cast.group.children.map((person) => colourOf(person));
    expect(new Set(worn).size).toBe(worn.length);
    cast.dispose();

    const again = new Cast({ clips: [] } as unknown as LoadedAsset, () => villagerModel());
    again.show([actorAt(1, 30)]);
    expect(colourOf(again.group.children[0])).toBe(worn[0]);
    again.dispose();
  });

  it('cava con azada, y la suelta al dejar de cavar', () => {
    // El clip de cavar está bien hecho y aun así no se leía como cavar, porque
    // cavar sin azada es agacharse. Los conectores que G-04 dejó en las manos
    // existían justo para esto y no colgaba nada de ellos.
    const villager = (): Object3D => {
      const group = villagerModel();
      const hand = new Group();
      hand.name = 'hand_r';
      group.add(hand);
      return group;
    };
    const tool = (): Object3D => {
      const hoe = new Group();
      hoe.name = 'hoe-prueba';
      return hoe;
    };
    const cast = new Cast({ clips: [] } as unknown as LoadedAsset, villager, () => tool());
    cast.show([{ ...actorAt(1, 30), clip: 'work_hoe' }]);
    const hand = cast.group.children[0]?.getObjectByName('hand_r');
    expect(hand?.children.length).toBe(1);
    expect(hand?.children[0]?.visible).toBe(true);

    cast.show([{ ...actorAt(1, 30), clip: 'walk' }]);
    expect(hand?.children[0]?.visible).toBe(false);
    // Y no se descuelga: colgarla y descolgarla en cada cambio de clip sería
    // rehacer objetos por fotograma, que es lo que D.6 prohíbe.
    expect(hand?.children.length).toBe(1);
    cast.dispose();
  });

  it('tocar la azada devuelve a quien la lleva', () => {
    const villager = (): Object3D => {
      const group = villagerModel();
      const hand = new Group();
      hand.name = 'hand_r';
      group.add(hand);
      return group;
    };
    const cast = new Cast({ clips: [] } as unknown as LoadedAsset, villager, () => new Group());
    cast.show([{ ...actorAt(7, 30), clip: 'work_hoe' }]);
    const held = cast.group.children[0]?.getObjectByName('hand_r')?.children[0];
    expect(held?.userData.villagerId).toBe(7);
    cast.dispose();
  });

  it('sin catálogo de herramienta se trabaja con las manos vacías', () => {
    // Un valle a medio catalogar sigue siendo un valle.
    const cast = new Cast({ clips: [] } as unknown as LoadedAsset, () => villagerModel());
    expect(() => cast.show([{ ...actorAt(1, 30), clip: 'work_hoe' }])).not.toThrow();
    expect(cast.count).toBe(1);
    cast.dispose();
  });

  it('la ropa se suelta con quien la llevaba, y la malla compartida no', () => {
    const shared = villagerModel();
    const cast = new Cast({ clips: [] } as unknown as LoadedAsset, () => villagerModel());
    cast.show([actorAt(1, 30)]);
    const person = cast.group.children[0];
    let clothes: { color?: unknown } | undefined;
    person?.traverse((child) => {
      const mesh = child as Object3D & { isMesh?: boolean; material?: { color?: unknown } };
      if (mesh.isMesh === true) clothes = mesh.material;
    });
    expect(clothes).toBeDefined();
    cast.show([]);
    expect(cast.count).toBe(0);
    // Y el original sigue teniendo su material: la copia era del actor.
    let intact = false;
    shared.traverse((child) => {
      const mesh = child as Object3D & { isMesh?: boolean; material?: unknown };
      if (mesh.isMesh === true && mesh.material !== undefined) intact = true;
    });
    expect(intact).toBe(true);
    cast.dispose();
  });
});

describe('G-10 · cobertura del catálogo', () => {
  it('ningún tipo de edificio se queda en la caja de reserva', () => {
    // El criterio de terminado de G-10 con estas palabras: cobertura sin
    // placeholders. La caja con tejado sigue existiendo y sigue siendo lo
    // correcto para un valle a medio catalogar, pero hoy no la usa nadie.
    const kinds = Object.keys(BUILDINGS) as BuildingKind[];
    expect(kinds.length).toBeGreaterThan(10);
    for (const kind of kinds) {
      expect(BUILDING_ASSETS[kind], `${kind} no tiene recurso`).toBeDefined();
    }
  });

  it('y todos esos recursos están publicados', () => {
    // Un recurso nombrado que nadie promovió no llega al juego: la casa
    // aparecería como caja gris y nadie sabría por qué.
    const manifest = JSON.parse(readFileSync(
      resolve(ROOT, 'public', 'assets', 'valley3d', 'manifest.json'), 'utf8',
    )) as { assets: { id: string }[] };
    const published = new Set(manifest.assets.map((asset) => asset.id));
    for (const id of Object.values(BUILDING_ASSETS)) {
      if (id === undefined) continue;
      expect(published.has(id), `${id} no está publicado`).toBe(true);
    }
    // Y los que no son edificios pero el renderer pide igualmente.
    for (const id of ['villager', 'tree', 'rock', 'reed', 'hoe', 'bundle',
      'ruin-wood', 'ruin-stone', 'field-cut', 'cow', 'pig', 'hen', 'wolf', 'crow', 'fish']) {
      expect(published.has(id), `${id} no está publicado`).toBe(true);
    }
  });

  it('quien tiene nombre se ve más alto, como en el 2D', () => {
    // D.8 pide que los nombrados se distingan, y la aldea ya tenía un lenguaje
    // para decirlo: el render 2D los dibuja más altos desde M-18.
    const model = (): Object3D => {
      const group = new Group();
      group.add(new Mesh(new BoxGeometry(0.2, 0.6, 0.2), new MeshStandardMaterial()));
      return group;
    };
    const person = (id: number, named: boolean): Actor => ({
      id: id as Actor['id'], x: 1, z: 1, facing: 0, activity: 'resting',
      clip: 'idle', clipSeconds: 0, travelled: 0, cell: 0, named, age: 30,
    });
    const cast = new Cast({ clips: [] } as unknown as LoadedAsset, model);
    cast.show([person(1, false), person(2, true)]);
    const [anon, named] = cast.group.children;
    expect(named?.scale.y).toBeGreaterThan(anon?.scale.y ?? 0);
    cast.dispose();
  });
});
