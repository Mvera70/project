// G-06 · The renderer. design.md D.5, D.6.
//
// The whole contract, implemented. D.5 forbids publishing an empty method to
// satisfy an interface, so `pick` really picks and `track` really frames.
//
// The one rule this file exists to keep: **the renderer never writes to
// `GameState` and never draws a random number.** It reads a state and a frame
// and moves objects. Everything it needs that the state does not hold —where a
// villager is at this instant, what the ground looks like— is derived, and the
// same instant derives the same answer however many times it is asked.

import {
  Color, DirectionalLight, Group, HemisphereLight, PCFSoftShadowMap,
  Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer, type Object3D,
} from 'three';
import { clockOf } from '@engine/time';
import { paletteFor } from '@render/palette';
import { createValleyCamera } from './camera';
import { TERRAIN_CODE, type GameState, type VillagerId } from '@engine/state';
import { actorsFor, createActorMemory, type Actor } from './actors';
import { loadAssets, type AssetLibrary } from './assets';
import type {
  GraphicsFrame, GraphicsRenderer, GraphicsRendererOptions, GraphicsStats, GraphicsTarget,
  GraphicsViewport,
} from './contracts';
import { VALLEY_COLOURS } from './visual-config';
import { buildGround, type Ground } from './world/ground';
import { buildForest, scatterOn, type Forest } from './world/forest';
import { BUILDING_ASSETS, Village } from './world/buildings';
import { Cast } from './world/cast';
import { Tells } from './effects/tells';
import { isQuiet, planChange, planFor, type ScenePlan } from './world/plan';

const VILLAGER = 'villager';
const TREE = 'tree';
const ROCK = 'rock';
/** Todo lo que el valle sabe pintar hoy. Lo que no este aqui, no se descarga. */
const WANTED = [VILLAGER, TREE, ROCK, ...new Set(Object.values(BUILDING_ASSETS))];

/**
 * Cuanto campo se deja alrededor de lo construido, en celdas.
 *
 * El encuadre de partida es **la aldea con su entorno**, no el mapa entero. Casi
 * todo el mapa es prado vacio, y encuadrarlo entero dejaba el pueblo del tamano
 * de una moneda en el centro de una pantalla vertical: medido, ocupaba menos de
 * la sexta parte del alto.
 *
 * Lo que se pidio es ver la ciudad entera con la gente muy pequenita, y esto es
 * eso: el pueblo llena la pantalla y un aldeano de 0,65 celdas cae en unos pocos
 * pixeles. Acercarse mas es el trabajo de gestos de G-07.
 */
const FRAME_MARGIN = 9;

export async function createGraphicsRenderer(
  options: GraphicsRendererOptions,
): Promise<GraphicsRenderer> {
  const renderer = new WebGLRenderer({ canvas: options.canvas, antialias: options.quality !== 'low' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = options.quality !== 'low';
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(new Color(VALLEY_COLOURS.sky));

  const scene = new Scene();
  scene.background = new Color(VALLEY_COLOURS.sky);
  const view = createValleyCamera();
  const camera = view.camera;
  const world = new Group();
  world.name = 'Valley';
  scene.add(world);

  const sun = new DirectionalLight('#FFF4D8', 2.6);
  sun.castShadow = options.quality !== 'low';
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(new HemisphereLight('#FFF6DF', '#776F62', 1.5), sun, sun.target);

  // Only the villager, and only because that is all the catalogue holds. Loading
  // the whole of it to show one asset is the waste D.9 asks the pilot not to do.
  //
  // A library brought by the caller belongs to the caller, so `dispose` leaves
  // it alone: freeing something we were lent would take it out from under
  // whoever else is using it.
  const borrowed = options.library !== undefined;
  const library: AssetLibrary = (options.library as AssetLibrary | undefined)
    ?? await loadAssets({ baseUrl: options.assetBaseUrl, wanted: WANTED });
  const villager = library.get(VILLAGER);
  if (villager === undefined) throw new Error("The asset manifest has no 'villager'.");

  const village = new Village((id) => library.instance(id));
  const cast = new Cast(villager, () => library.instance(VILLAGER));
  const tells = new Tells();
  world.add(village.group, cast.group, tells.group);

  let ground: Ground | null = null;
  let forest: Forest | null = null;
  let stones: Forest | null = null;
  let plan: ScenePlan | null = null;
  let viewport: GraphicsViewport = { widthCss: 1, heightCss: 1, pixelRatio: 1 };
  let tracked: VillagerId | null = null;
  let lastActors: Actor[] = [];
  // D.6 · el estado efimero de los actores. Vive aqui, no en `GameState`, y se
  // rehace al amanecer de cada dia escenico y en cada partida nueva.
  const memory = createActorMemory();
  let mapWidth = 0;
  let mapHeight = 0;
  let disposed = false;

  const raycaster = new Raycaster();

  /**
   * La caja que hay que encuadrar: lo construido mas su margen, recortado al
   * mapa. Sin nada construido, el mapa entero, que es lo que hay que mirar en
   * una partida recien fundada.
   */
  function framed(): { minX: number; minZ: number; maxX: number; maxZ: number } {
    const buildings = plan?.buildings ?? [];
    if (buildings.length === 0) return { minX: 0, minZ: 0, maxX: mapWidth, maxZ: mapHeight };
    let minX = Number.MAX_SAFE_INTEGER;
    let minZ = Number.MAX_SAFE_INTEGER;
    let maxX = 0;
    let maxZ = 0;
    for (const building of buildings) {
      minX = Math.min(minX, building.x);
      minZ = Math.min(minZ, building.z);
      maxX = Math.max(maxX, building.x + building.w);
      maxZ = Math.max(maxZ, building.z + building.h);
    }
    return {
      minX: Math.max(0, minX - FRAME_MARGIN),
      minZ: Math.max(0, minZ - FRAME_MARGIN),
      maxX: Math.min(mapWidth, maxX + FRAME_MARGIN),
      maxZ: Math.min(mapHeight, maxZ + FRAME_MARGIN),
    };
  }

  function frameCamera(): void {
    if (mapWidth === 0 || mapHeight === 0) return;
    const box = framed();
    view.frame(box, { width: viewport.widthCss, height: viewport.heightCss });

    // El sol alumbra el valle entero, no lo que se ve: acercarse no puede
    // cambiar donde caen las sombras.
    const centre = new Vector3(mapWidth / 2, 0, mapHeight / 2);
    const radius = Math.hypot(mapWidth, mapHeight) / 2 + 1;
    sun.position.copy(centre).add(new Vector3(-radius, radius * 2.2, radius * 0.8));
    sun.target.position.copy(centre);
    const reach = radius * 1.2;
    sun.shadow.camera.left = -reach;
    sun.shadow.camera.right = reach;
    sun.shadow.camera.top = reach;
    sun.shadow.camera.bottom = -reach;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = radius * 8;
    sun.shadow.camera.updateProjectionMatrix();
  }

  function rebuildGround(state: GameState): void {
    if (ground !== null) {
      world.remove(ground.mesh);
      ground.dispose();
    }
    // §10.3 · la paleta de la estación, la misma que usa el render 2D.
    const clock = clockOf(state.tick);
    ground = buildGround(state.map, paletteFor(clock.season, clock.seasonWeek));
    world.add(ground.mesh);

    // El bosque y los pedregales se replantan con el suelo, que es cuando
    // alguien tala o el terreno cambia.
    for (const scattered of [forest, stones]) {
      if (scattered === null) continue;
      world.remove(scattered.group);
      scattered.dispose();
    }
    forest = null;
    stones = null;

    const sapling = library.get(TREE);
    if (sapling !== undefined) {
      forest = buildForest(state.map, sapling.original as Object3D);
      world.add(forest.group);
    }
    const boulder = library.get(ROCK);
    if (boulder !== undefined) {
      stones = scatterOn(state.map, boulder.original as Object3D, TERRAIN_CODE.rock);
      stones.group.name = 'Valley_Rocks';
      world.add(stones.group);
    }
    mapWidth = state.map.width;
    mapHeight = state.map.height;
    frameCamera();
  }

  return {
    resize(next: GraphicsViewport): void {
      if (disposed) return;
      viewport = next;
      renderer.setPixelRatio(Math.min(next.pixelRatio, 2));
      renderer.setSize(next.widthCss, next.heightCss, false);
      // Girar el movil cambia cuanto valle cabe, pero no tiene por que
      // devolver al jugador al encuadre de partida si se habia acercado.
      view.resize({ width: next.widthCss, height: next.heightCss });
    },

    paint(state: Readonly<GameState>, frame: GraphicsFrame): void {
      if (disposed) return;
      const next = planFor(state as GameState);
      const change = planChange(plan, next);

      if (change.cleared) {
        // A different valley. Everything built for the last one goes, rather
        // than being updated into place: what the two happened to share would
        // otherwise survive into a game it never belonged to.
        village.clear();
        cast.clear();
        tells.clear();
      }
      if (change.ground || change.cleared) rebuildGround(state as GameState);
      for (const id of change.removed) village.remove(id);
      for (const building of [...change.added, ...change.changed]) village.add(building);
      plan = next;
      // El encuadre sigue a lo construido, asi que se rehace cuando el pueblo
      // cambia de forma y no en cada fotograma.
      if (!isQuiet(change)) frameCamera();

      // Actors are derived every frame because they change every frame; the
      // village is not, because it changes a few times a year.
      lastActors = actorsFor(state as GameState, frame, { tracked, memory });
      cast.show(lastActors);
      // Las señales cambian con la semana, no con el fotograma: `update` se sale
      // solo cuando nada ha cambiado.
      tells.update(state as GameState);

      renderer.render(scene, camera);
    },

    pick(localXCss: number, localYCss: number): GraphicsTarget | null {
      if (disposed || mapWidth === 0) return null;
      const point = new Vector2(
        (localXCss / Math.max(1, viewport.widthCss)) * 2 - 1,
        -(localYCss / Math.max(1, viewport.heightCss)) * 2 + 1,
      );
      raycaster.setFromCamera(point, camera);
      const hits = raycaster.intersectObject(world, true);

      // Order of preference, from D.7: a villager first, then a building, then
      // the ground. A person is six pixels across at the panoramic framing, so
      // whoever is nearest the touch has to win over the barn behind them.
      for (const hit of hits) {
        const id = idOf(hit.object, 'villagerId');
        if (id !== undefined) return { kind: 'villager', id };
      }
      for (const hit of hits) {
        const id = idOf(hit.object, 'buildingId');
        if (id !== undefined) return { kind: 'building', id };
      }
      const first = hits[0];
      if (first === undefined) return null;
      return {
        kind: 'terrain',
        x: Math.max(0, Math.min(mapWidth - 1, Math.floor(first.point.x))),
        y: Math.max(0, Math.min(mapHeight - 1, Math.floor(first.point.z))),
      };
    },

    track(id: number | null): void {
      tracked = id;
      if (id === null) return;
      // Seguir a alguien es mirarle, no acercarse a el: la distancia la elige
      // el jugador y no se le quita de las manos.
      const followed = lastActors.find((actor) => actor.id === id);
      if (followed !== undefined) view.look(followed.x, followed.z);
    },

    zoom(factor: number, atXCss: number, atYCss: number): void {
      if (disposed) return;
      view.zoom(factor, atXCss, atYCss);
    },

    pan(dxCss: number, dyCss: number): void {
      if (disposed) return;
      view.pan(dxCss, dyCss);
    },

    resetView(): void {
      if (disposed) return;
      view.reset();
    },

    stats(): GraphicsStats {
      const info = renderer.info;
      return {
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? 0,
        actors: cast.count,
        buildings: village.count,
      };
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      tells.dispose();
      cast.dispose();
      village.dispose();
      if (ground !== null) {
        world.remove(ground.mesh);
        ground.dispose();
        ground = null;
      }
      for (const scattered of [forest, stones]) {
        if (scattered === null) continue;
        world.remove(scattered.group);
        scattered.dispose();
      }
      forest = null;
      stones = null;
      if (!borrowed) library.dispose();
      lastActors = [];
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

/** Walks up from a hit to whichever ancestor carries the id we are after. */
function idOf(object: Object3D, key: 'villagerId' | 'buildingId'): number | undefined {
  let node: Object3D | null = object;
  while (node !== null) {
    const value: unknown = node.userData[key];
    if (typeof value === 'number') return value;
    node = node.parent;
  }
  return undefined;
}
