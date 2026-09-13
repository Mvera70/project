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
  Color, DirectionalLight, Fog, Group, HemisphereLight, PCFSoftShadowMap,
  Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer, type Object3D,
} from 'three';
import { ford } from '@engine/sim';
import { clockOf } from '@engine/time';
import { paletteFor } from '@render/palette';
import { moodsFor } from '@render/moods';
import { createValleyCamera } from './camera';
import { TERRAIN_CODE, type GameState, type VillagerId } from '@engine/state';
import { actorsFor, createActorMemory, type Actor } from './actors';
import { loadAssets, type AssetLibrary } from './assets';
import type {
  GraphicsFrame, GraphicsRenderer, GraphicsRendererOptions, GraphicsStats, GraphicsTarget,
  GraphicsViewport,
} from './contracts';
import { VALLEY_COLOURS } from './visual-config';
import { buildGround, elevationAt, type Ground } from './world/ground';
import { buildFord, type Ford } from './world/ford';
import { buildForest, scatterCells, scatterOn, shoreCells, type Forest } from './world/forest';
import { BUILDING_ASSETS, Village } from './world/buildings';
import { Cast } from './world/cast';
import { dayPhase } from './presentation-clock';
import { daylightAt } from './effects/daylight';
import { Bubbles, type Bubble } from './effects/bubbles';
import { Fauna } from './effects/fauna';
import { Tells } from './effects/tells';
import { isQuiet, planChange, planFor, type ScenePlan } from './world/plan';

const VILLAGER = 'villager';
const TREE = 'tree';
const ROCK = 'rock';
const REED = 'reed';
const FORD = 'ford-stone';

/**
 * Las clases de §7.7, cada una con su recurso. El nombre del recurso es el de
 * la clase: no hay correspondencia que escribir porque no hace falta.
 */
const FAUNA = ['cow', 'pig', 'hen', 'wolf', 'crow', 'fish'] as const;
/** Todo lo que el valle sabe pintar hoy. Lo que no este aqui, no se descarga. */
/**
 * Los recursos que este renderer pide al catalogo.
 *
 * Se exporta porque hay dos sitios que necesitan saberlo: el que los carga y el
 * que arma la demo publicable metiendolos dentro de la pagina. La demo lo
 * raspaba de este fichero a base de expresiones regulares, y se dejo los juncos
 * fuera sin que nadie lo notara: una orilla pelada no parece un fallo.
 */
export const WANTED = [
  VILLAGER, TREE, ROCK, REED, FORD, 'hoe', 'bundle', 'field-cut', 'ruin-wood', 'ruin-stone',
  ...FAUNA,
  ...new Set(Object.values(BUILDING_ASSETS)),
];

/**
 * Cuanto campo se deja alrededor de lo construido, en celdas.
 *
 * **Era nueve y se quedo en dos y media**, porque el margen se inflaba en la
 * caja y la caja se ajusta a la pantalla por el lado que peor cabe. En un movil
 * de 390 por 844 el ancho se divide por una proporcion de 0,46, asi que cada
 * celda de margen a lo ancho costaba **dos celdas de alto**: la aldea entera
 * quedaba del tamano de un sello en medio de un cielo vacio. El aire de
 * alrededor lo pone ahora la camara, que lo suma igual en los dos lados.
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
const FRAME_MARGIN = 2.5;

/**
 * Que parte de lo construido entra en el encuadre de partida.
 *
 * TUNE: cuatro quintos. Deja fuera el campo perdido al otro lado del rio y la
 * atalaya del cerro, que son los que estiran la caja, y deja dentro la aldea
 * con sus campos. Quien quiera verlo todo se aleja con los dedos: el limite de
 * zoom sigue siendo el mapa.
 */
const CORE_SHARE = 0.8;

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
  const ambient = new HemisphereLight('#FFF6DF', '#776F62', 1.5);
  scene.add(ambient, sun, sun.target);

  /**
   * Lo lejos que hay que estar para que la niebla se coma el valle.
   *
   * El fondo es un color plano, asi que sin niebla el borde del mapa es un
   * corte limpio contra el cielo y el valle parece una maqueta sobre una mesa.
   * La niebla lo funde, y de paso da la profundidad que un encuadre casi
   * cenital no tiene por si mismo. Se calibra con el tamano del mapa al
   * encuadrar, no aqui: un valle mas grande necesita mas aire.
   */
  scene.fog = new Fog(VALLEY_COLOURS.sky, 1, 1000);

  /**
   * Donde empieza y acaba la niebla.
   *
   * Se mide **desde la camara**, no desde el mapa. Calibrarla con el radio del
   * valle dejaba la niebla empezando a treinta y seis unidades cuando la camara
   * panoramica esta a mas de cien: el valle entero desaparecia y quedaba una
   * pantalla del color del cielo. Lo que hay que fundir es el borde lejano, y
   * eso esta siempre un poco mas lejos que el sitio al que se mira.
   */
  function fogAround(centre: Vector3): void {
    if (scene.fog === null) return;
    const fog = scene.fog as Fog;
    const distance = camera.position.distanceTo(centre);
    fog.near = distance * 0.85;
    fog.far = distance * 2.3;
  }

  /** De que color es la luz a esta hora del dia escenico. */
  function light(phase: number): void {
    const day = daylightAt(phase);
    sun.color.set(day.sunColour);
    sun.intensity = day.sunIntensity;
    ambient.color.set(day.skyColour);
    ambient.groundColor.set(day.groundBounce);
    ambient.intensity = day.ambientIntensity;
    (scene.background as Color).set(day.background);
    if (scene.fog !== null) (scene.fog as Fog).color.set(day.background);
    renderer.setClearColor(new Color(day.background));
    // El sol gira alrededor del valle, y con el las sombras. Lo que no cambia es
    // a que apunta: alumbra el valle entero y no lo que se ve, asi que
    // acercarse no puede mover una sombra.
    if (mapWidth > 0) {
      const centre = new Vector3(mapWidth / 2, 0, mapHeight / 2);
      const radius = Math.hypot(mapWidth, mapHeight) / 2 + 1;
      sun.position.copy(centre).add(
        new Vector3(day.sun.x, Math.max(0.35, day.sun.y), day.sun.z).multiplyScalar(radius * 2.2),
      );
      sun.target.position.copy(centre);
    }
  }

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
  const cast = new Cast(villager, () => library.instance(VILLAGER), (id) => library.instance(id));
  const tells = new Tells();
  const fauna = new Fauna((kind) => library.instance(kind));
  const bubbles = new Bubbles();
  world.add(village.group, cast.group, tells.group, fauna.group, bubbles.group);

  let ground: Ground | null = null;
  let forest: Forest | null = null;
  let stones: Forest | null = null;
  let reeds: Forest | null = null;
  let crossing: Ford | null = null;
  let plan: ScenePlan | null = null;
  let viewport: GraphicsViewport = { widthCss: 1, heightCss: 1, pixelRatio: 1 };
  let tracked: VillagerId | null = null;
  // La cota del suelo, que la burbuja necesita para flotar sobre la cabeza y no
  // sobre el nivel del mar.
  let groundFloor: (x: number, z: number) => number = () => 0;
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

    // **El nucleo, no todo lo construido.**
    //
    // Un campo nuevo al otro lado del rio estiraba la caja hasta que la camara
    // enseñaba el mapa entero con la aldea del tamano de un sello: en una
    // pantalla de movil, cada celda de ancho cuesta dos de alto. Se encuadra
    // donde esta la aldea y lo de fuera se deja fuera, que para eso estan los
    // dedos. Se descarta por distancia a la mediana y no por tipo de edificio:
    // un campo pegado a las casas es aldea, y uno a quince celdas no.
    const centres = buildings.map((building) => ({
      x: building.x + building.w / 2,
      z: building.z + building.h / 2,
      building,
    }));
    const middle = (values: number[]): number => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)] ?? 0;
    };
    const heartX = middle(centres.map((item) => item.x));
    const heartZ = middle(centres.map((item) => item.z));
    const byDistance = [...centres].sort((a, b) => (
      (a.x - heartX) ** 2 + (a.z - heartZ) ** 2
    ) - (
      (b.x - heartX) ** 2 + (b.z - heartZ) ** 2
    ));
    const core = byDistance.slice(0, Math.max(1, Math.ceil(byDistance.length * CORE_SHARE)));

    let minX = Number.MAX_SAFE_INTEGER;
    let minZ = Number.MAX_SAFE_INTEGER;
    let maxX = 0;
    let maxZ = 0;
    for (const { building } of core) {
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
    sun.target.position.copy(centre);
    fogAround(centre);
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
    const palette = paletteFor(clock.season, clock.seasonWeek);
    ground = buildGround(state.map, palette);
    // La nieve en los tejados sale de la misma paleta que la del suelo: cuando
    // §10.3 pone el prado blanco es que ha nevado, y la nieve no elige donde
    // cuajar. TUNE: 0,72 y no 1, que un tejado del color exacto del prado
    // nevado deja de leerse como tejado.
    const snowing = clock.season === 'winter' ? 0.72 : 0;
    village.season(snowing, palette.accent);
    world.add(ground.mesh);

    // El bosque y los pedregales se replantan con el suelo, que es cuando
    // alguien tala o el terreno cambia.
    for (const scattered of [forest, stones, reeds, crossing]) {
      if (scattered === null) continue;
      world.remove(scattered.group);
      scattered.dispose();
    }
    forest = null;
    stones = null;
    reeds = null;
    crossing = null;

    const sapling = library.get(TREE);
    if (sapling !== undefined) {
      forest = buildForest(state.map, sapling.original as Object3D, palette);
      world.add(forest.group);
    }
    const boulder = library.get(ROCK);
    if (boulder !== undefined) {
      stones = scatterOn(state.map, boulder.original as Object3D, TERRAIN_CODE.rock);
      stones.group.name = 'Valley_Rocks';
      world.add(stones.group);
    }
    const reed = library.get(REED);
    if (reed !== undefined) {
      // La orilla se replanta con el suelo por el mismo motivo que el bosque: el
      // rio no se mueve, pero un camino nuevo pegado al agua si le quita sitio.
      reeds = scatterCells(state.map, reed.original as Object3D, shoreCells(state.map), palette);
      reeds.group.name = 'Valley_Reeds';
      world.add(reeds.group);
    }
    // El vado. Donde esta lo dice el motor, que es quien lo define: calcularlo
    // aqui seria tener dos vados, y ya hay uno de mas en el render 2D.
    const crossingAt = ford(state);
    crossing = buildFord(state.map, crossingAt.x, crossingAt.y, () => library.instance(FORD));
    world.add(crossing.group);
    // Todo lo que pisa el valle pregunta al suelo por su cota. Antes no hacia
    // falta porque el suelo era plano.
    const map = state.map;
    const floor = (x: number, z: number): number => elevationAt(map, x, z);
    groundFloor = floor;
    cast.standOn(floor);
    fauna.standOn(floor);
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
        fauna.clear();
        bubbles.clear();
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

      // §11.1.1 · la nube sobre la cabeza de quien esta viviendo algo. Lo que
      // lleva sale del estado; que este parado hablando lo dice el actor.
      const moods = moodsFor(state as GameState);
      const carried = new Map<VillagerId, Bubble>();
      const heads = new Map<VillagerId, { x: number; y: number; z: number }>();
      for (const actor of lastActors) {
        const mood = moods.get(actor.id);
        const bubble: Bubble | undefined = mood ?? (actor.talking ? 'chat' : undefined);
        if (bubble === undefined) continue;
        carried.set(actor.id, bubble);
        heads.set(actor.id, { x: actor.x, y: groundFloor(actor.x, actor.z), z: actor.z });
      }
      bubbles.update(heads, carried);
      // La hora escenica: la piden el rebano, las luces y el sol.
      const phase = dayPhase(frame.presentationSeconds);
      // Las señales cambian con la semana, no con el fotograma: `update` se sale
      // solo cuando nada ha cambiado.
      tells.update(state as GameState);
      // El humo y las luces si son de cada fotograma: uno sube y las otras se
      // encienden cuando cae el dia.
      tells.drift(frame.presentationSeconds, phase);
      // Y el rio corre. Un rio quieto es un suelo azul.
      ground?.ripple(frame.presentationSeconds);
      // La cabaña sí cambia en cada fotograma: los animales pastan, y un rebaño
      // congelado entre semana y semana sería peor que no tenerlo.
      fauna.update(state as GameState, phase);
      // Y la luz que hace a esa hora. Va despues de todo lo que se coloca porque
      // no depende de nada de ello: solo de la hora.
      light(phase);
      // El zoom mueve la camara, asi que la niebla se recalibra con ella: si no,
      // acercarse metia el pueblo dentro de la bruma.
      if (mapWidth > 0) fogAround(new Vector3(mapWidth / 2, 0, mapHeight / 2));

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
      fauna.dispose();
      bubbles.dispose();
      cast.dispose();
      village.dispose();
      if (ground !== null) {
        world.remove(ground.mesh);
        ground.dispose();
        ground = null;
      }
      for (const scattered of [forest, stones, reeds, crossing]) {
        if (scattered === null) continue;
        world.remove(scattered.group);
        scattered.dispose();
      }
      forest = null;
      stones = null;
      reeds = null;
      crossing = null;
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
