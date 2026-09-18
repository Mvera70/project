import { visibleBuildings } from '@derive/visible-buildings';
import { plazaOf } from '@derive/plaza';
import { PlazaFountain } from './world/plaza';
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
  ACESFilmicToneMapping,
  Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer, type Mesh, type Object3D,
} from 'three';
import { ford } from '@engine/sim';
import { clockOf } from '@engine/time';
import { paletteFor } from '@derive/palette';
import { moodsFor } from '@derive/moods';
import { createValleyCamera } from './camera';
import { TERRAIN_CODE, type GameState, type VillagerId } from '@engine/state';
import { loadAssets, type AssetLibrary } from './assets';
import type {
  Actor, ActorDoing, GraphicsFrame, GraphicsRenderer, GraphicsRendererOptions, GraphicsStats, GraphicsTarget,
  GraphicsViewport,
} from './contracts';
import { SUN_SHADOW, VALLEY_COLOURS } from './visual-config';
import { buildGround, elevationAt, type Ground } from './world/ground';
import { buildRidge } from './world/ridge';
import { buildFord, type Ford } from './world/ford';
import {
  buildForest, builtCells, scatterCells, scatterOn, scrubCells, shoreCells, type Forest,
} from './world/forest';
import { BUILDING_ASSETS, Village } from './world/buildings';
import { Steading, STEADING_ASSETS, steadingOf } from './world/steading';
import { isNight, type HomeRoutine } from './life/home';
import { fitsCircle, penetration } from './life/body';
import { solidTerrain } from './world/obstacles';
import { Cast } from './world/cast';
import { VILLAGER_MODELS, modelChainFor } from './world/models';
import { dayNumber, dayPhase } from './presentation-clock';
import { SKY } from '@engine/balance';
import { boltPlace, boltsInDay, overcastOf, skyAt, type SkyKind } from '../derive/weather';
import { createWeather } from './effects/weather';
import { createScenicState } from './scenic-state';
import { createVillage, type Village as LifeVillage } from './life/village';
import type { DayPlan } from './life/day';
import { castOf, propsOf } from './life/cast';
import { Props } from './world/props';
import { LIFE_STEP } from './life/clock';
import { daylightAt } from './effects/daylight';
import { Bubbles, type Bubble } from './effects/bubbles';
import { Fauna } from './effects/fauna';
import { Tells } from './effects/tells';
import { TreeFalls, type TreeFallSighting } from './effects/tree-falls';
import { FIELD_CROPS, isQuiet, planChange, planFor, type ScenePlan } from './world/plan';

const VILLAGER = 'villager';
const TREE = 'tree';
const ROCK = 'rock';
const REED = 'reed';
const SCRUB = 'scrub';
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
  ...FIELD_CROPS,
  // G-15 · los trastos del corral, que es lo que dice que aquí vive alguien.
  ...STEADING_ASSETS,
  // V-15b · todo lo que la cadena de `modelFor` puede pedir, exista ya o no.
  ...VILLAGER_MODELS, TREE, ROCK, REED, SCRUB, FORD, 'hoe', 'bundle', 'ball', 'stick', 'bucket', 'field-cut', 'ruin-wood', 'ruin-stone',
  // P-2 · la fuente de la plaza, cuando exista (`docs/encargo-fuente.md`).
  'fountain',
  // M-3 · lo que el jugador mete en el valle. Ninguno de los dos está
  // publicado todavía —el encargo es `docs/encargo-arado.md`— y por eso se
  // piden aquí: `WANTED` es lo que el renderer puede pedir, exista ya o no,
  // y mientras no exista `world/props.ts` los dibuja con primitivas.
  'barrel', 'plough',
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

/** Cuántas nubes de §11.1.1 pueden verse a la vez. TUNE: tres; ver el uso. */
const MOST_BUBBLES = 3;

/**
 * Que parte de lo construido entra en el encuadre de partida.
 *
 * TUNE: cuatro quintos. Deja fuera el campo perdido al otro lado del rio y la
 * atalaya del cerro, que son los que estiran la caja, y deja dentro la aldea
 * con sus campos. Quien quiera verlo todo se aleja con los dedos: el limite de
 * zoom sigue siendo el mapa.
 */
const CORE_SHARE = 0.8;

/**
 * Cuánta sierra alcanza la vista al alejarse del todo, en celdas fuera del mapa.
 *
 * TUNE: catorce de las dieciséis que mide la falda (§D.6.8). Alcanzar la cresta
 * entera dejaría la aldea del tamaño de un sello, y lo que cierra el valle no es
 * la cumbre: es la ladera subiendo detrás de los tejados.
 */
const RIDGE_REACH = 14;

/**
 * La exposición con la que se revela el valle.
 *
 * TUNE: 0,62. La escena estaba iluminada para un recorte duro —4,1 de luz
 * combinada a mediodía— así que al poner ACES hay que bajar la exposición o el
 * blanco vuelve por otra puerta. Con esto el prado de primavera llega a
 * pantalla como verde y la noche sigue leyéndose.
 */
const TONE_EXPOSURE = 0.62;


export async function createGraphicsRenderer(
  options: GraphicsRendererOptions,
): Promise<GraphicsRenderer> {
  const renderer = new WebGLRenderer({ canvas: options.canvas, antialias: options.quality !== 'low' });
  renderer.outputColorSpace = SRGBColorSpace;
  // **El valle estaba sobreexpuesto, y era la causa de que se viera lavado.**
  //
  // Sin mapeo de tonos, Three recorta en seco todo lo que pase de 1,0. A
  // mediodía el sol vale 2,60 y el cielo 1,50 (`effects/daylight.ts`): 4,1 de
  // luz combinada. Un prado de primavera —`#96b562`, que es verde de verdad en
  // la paleta de §10.3— multiplicado por eso se sale de rango en los tres
  // canales y llega a pantalla como blanco roto. Sólo sobrevivían las cosas
  // oscuras: las copas de los árboles y los tejados. Medido mirando: el suelo
  // del valle, que es la mayor superficie de la pantalla, salía casi blanco en
  // todas las capturas desde G-06, y con él se perdía el desgaste del camino,
  // el relieve de la orilla y la diferencia entre prado y campo.
  //
  // ACES comprime las altas luces en vez de cortarlas, así que el mismo sol
  // deja de quemar y el verde llega. La exposición se compensa hacia abajo
  // porque la escena estaba iluminada para un recorte duro: subirla devolvería
  // el problema por otra puerta.
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = TONE_EXPOSURE;
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
  sun.shadow.mapSize.set(SUN_SHADOW.mapSize, SUN_SHADOW.mapSize);
  sun.shadow.bias = SUN_SHADOW.bias;
  sun.shadow.normalBias = SUN_SHADOW.normalBias;
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

  /**
   * De que color es la luz a esta hora del dia escenico, a esta velocidad.
   *
   * La velocidad entra porque desde D.6.1 la jornada la sigue entera: a x64 el
   * dia dura menos de dos segundos, y una jornada de luz de dos segundos es un
   * parpadeo. `daylightAt` la aplana; aqui solo se le pasa el dato.
   */
  function light(phase: number, speed: GraphicsFrame['speed'], overcast = 0): void {
    const day = daylightAt(phase, speed, overcast);
    sun.color.set(day.sunColour);
    sun.intensity = day.sunIntensity;
    // Puesto el sol no hay sombra que echar, asi que tampoco hay mapa de
    // sombras que calcular: se apaga la pasada entera mientras dura la noche.
    // Con intensidad cero no oscurecia nada de todos modos; esto es el ahorro,
    // no el arreglo.
    sun.castShadow = options.quality !== 'low' && day.sunIntensity > 0;
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
  // G-15 · el almiar, la leña y la carreta. Se montan con lo construido porque
  // cuelgan de ello: un almiar toca un campo y la leña toca una casa.
  const steading = new Steading();
  world.add(steading.group);
  // **V-15b · la malla la decide `modelFor`, y si no existe se cae al aldeano
  // base.** La regla entera —manda la edad, luego el oficio, luego lo que se
  // está haciendo— vive en `world/models.ts`; aquí sólo queda pedirla y el
  // respaldo, que es el mismo criterio que ya había antes de que hubiera más de
  // un modelo.
  //
  // Ese respaldo es lo que permite que el arte entre **una malla a la vez**: el
  // día que el taller entregue `villager-child`, los críos del valle cambian de
  // figura sin tocar una línea, y mientras no llegue se ven como hoy. No hay un
  // paso de integración; hay mallas que aparecen.
  const cast = new Cast(villager, (actor) => {
    for (const wanted of modelChainFor(actor)) {
      const object = library.instance(wanted);
      if (object !== undefined) return object;
    }
    return library.instance(VILLAGER);
  }, (id) => library.instance(id));
  // U-13 · la lluvia, la nieve y el rayo. Tres mallas, creadas una vez.
  const weather = createWeather(scene);
  const tells = new Tells();
  const fauna = new Fauna((kind) => library.instance(kind), (kind) => library.get(kind));
  const bubbles = new Bubbles();
  const props = new Props((id) => library.instance(id));
  // P-2 · la fuente del centro de la plaza. El empedrado lo pinta el suelo.
  const plaza = new PlazaFountain((id) => library.instance(id));
  const treeFalls = new TreeFalls(() => library.instance(TREE));
  world.add(village.group, cast.group, cast.mark, tells.group, fauna.group, bubbles.group, props.group, plaza.group, treeFalls.group);

  let ground: Ground | null = null;
  let forest: Forest | null = null;
  let stones: Forest | null = null;
  let reeds: Forest | null = null;
  let scrub: Forest | null = null;
  let crossing: Ford | null = null;
  let plan: ScenePlan | null = null;
  /** La sierra de V-14. Vive con el valle y se rehace sólo si cambia el mapa. */
  let ridge: Mesh | null = null;
  let viewport: GraphicsViewport = { widthCss: 1, heightCss: 1, pixelRatio: 1 };
  // La cota del suelo, que la burbuja necesita para flotar sobre la cabeza y no
  // sobre el nivel del mar.
  let groundFloor: (x: number, z: number) => number = () => 0;
  let lastActors: Actor[] = [];
  /**
   * Si el jugador ha movido la cámara desde el último encuadre automático.
   *
   * **El zoom se perdía solo**, y se vio mirando el juego como un vídeo: la
   * cámara se reencuadra cada vez que la aldea cambia de forma —un campo que se
   * termina— y con eso tiraba a la basura lo que el jugador acababa de acercar.
   * Tres segundos después de hacer zoom, la vista saltaba afuera. Es la mitad de
   * «no se puede mover bien el mapa». Desde que toca la cámara, el encuadre es
   * suyo; volver a lo automático es `resetView`, que es el doble toque.
   */
  let disturbed = false;
  /**
   * U-11 · El vuelo de entrada, si lo hay. `from` es la altura de la sierra y
   * `to` la del reposo; la altura baja en progresión geométrica —lo que el ojo
   * lee como velocidad constante al acercarse— con una suavizada en los dos
   * extremos. `wantedFlight` guarda la petición hasta que haya un valle que
   * encuadrar, porque `flyIn` puede llegar antes del primer fotograma.
   */
  let flight: { readonly seconds: number; elapsed: number; readonly from: number; readonly to: number } | null = null;
  let wantedFlight: number | null = null;

  function beginFlight(seconds: number): void {
    frameCamera();
    view.reset();
    const to = view.view.height;
    // Desde lo más lejos que el dedo puede apartarse (D.6.8, la sierra): en
    // las capturas es el valle entero con sus montañas. Se probó `contain` del
    // cuenco y salía a 367 celdas, una tira con el mapa de sello.
    const from = view.limits.furthest;
    if (seconds <= 0 || from <= to) return;
    view.lift(from);
    disturbed = true;
    flight = { seconds, elapsed: 0, from, to };
  }

  function stepFlight(deltaSeconds: number): void {
    if (flight === null) return;
    flight.elapsed += deltaSeconds;
    const t = Math.min(1, flight.elapsed / flight.seconds);
    const eased = t * t * (3 - 2 * t);
    const height = flight.from * Math.pow(flight.to / flight.from, eased);
    // Directo a la altura, no por `zoom`: `zoom` recorta a `furthest` y mueve
    // el centro para dejar quieto lo que hay bajo el dedo, y aquí no hay dedo.
    // Medido con `data-view-height`: por `zoom`, la vista se quedaba clavada
    // en la sierra cinco segundos y bajaba en cuatro.
    view.lift(height);
    if (t >= 1) {
      // Aterriza exactamente en el reposo, y la vista vuelve a ser automática.
      flight = null;
      disturbed = false;
      frameCamera();
      view.reset();
    }
  }
  // El estado de la jornada, quieto desde anoche. Es lo que se pinta: ver
  // `scenic-state.ts` para por que no se pinta el vivo.
  const scenic = createScenicState();

  /**
   * Anexo E · la capa de vida. **El único camino desde V-12.**
   *
   * La bandera `valley.life` existió mientras hubo un camino de vuelta: una
   * línea devolvía el valle a `actors/index.ts`, la función que evaluaba una
   * curva del reloj. V-12 borró esa función, así que la bandera ya no tenía
   * nada que apagar y se fue con ella.
   */
  let life: LifeVillage | null = null;
  let lifeDay = -1;
  let lifeState: GameState | null = null;
  let observedState: Readonly<GameState> | null = null;
  let observedFrame: GraphicsFrame | null = null;
  let sampling = false;
  let observing = false;
  let lifeCarry = 0;
  let mapWidth = 0;
  let mapHeight = 0;
  // U-12 · la fase de la última jornada pintada, para poder mirarla desde fuera.
  let paintedPhase = 0;
  let steppedPhase = 0.28;
  const nightOutcomes: { tick: number; residents: number; sleeping: number; pending: number[] }[] = [];
  // U-13 · el cielo de la jornada que se está pintando, y los rayos que han
  // caído. `bolts` sólo sube: `app.ts` mira cuánto ha subido para tronar.
  let paintedSky: SkyKind = 'clear';
  let bolts = 0;
  let boltPhase = 0;
  let boltDay = -1;
  let flashLeft = 0;
  const FLASH_WHITE = new Color('#FFFDF2');
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
    // Hasta dónde puede apartarse la vista: el valle con su sierra alrededor
    // (§D.6.8). Sin esto, alejarse del todo seguía enseñando la aldea y las
    // montañas quedaban fuera de cámara para siempre.
    const ridgeBox = {
      minX: -RIDGE_REACH, minZ: -RIDGE_REACH,
      maxX: mapWidth + RIDGE_REACH, maxZ: mapHeight + RIDGE_REACH,
    };
    view.frame(box, { width: viewport.widthCss, height: viewport.heightCss }, ridgeBox);

    // El sol alumbra el valle entero, no lo que se ve: acercarse no puede
    // cambiar donde caen las sombras.
    const centre = new Vector3(mapWidth / 2, 0, mapHeight / 2);
    const radius = Math.hypot(mapWidth, mapHeight) / 2 + 1;
    sun.target.position.copy(centre);
    fogAround(centre);
    const reach = radius * SUN_SHADOW.reachMargin;
    sun.shadow.camera.left = -reach;
    sun.shadow.camera.right = reach;
    sun.shadow.camera.top = reach;
    sun.shadow.camera.bottom = -reach;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = radius * SUN_SHADOW.farMultiplier;
    sun.shadow.camera.updateProjectionMatrix();
  }

  /**
   * El color del valle sale del reloj **vivo**, no del de la jornada.
   *
   * Es la única cosa que se pinta del estado vivo, y es a propósito. La cabecera
   * dice la estación de ahora (U-06) y el valle se pintaba con la paleta del
   * estado congelado, que a ×64 es de hasta sesenta y cuatro semanas atrás: el
   * juego se contradecía a sí mismo en pantalla —«aparece que es invierno y no
   * se ve que sea invierno», dicho por el dueño del diseño probando la demo—.
   *
   * Y es lo único que puede seguir al reloj vivo sin romper nada, porque **un
   * cambio de color no mueve a nadie de sitio**. Relevar el estado entero más a
   * menudo sí: se midió, y el rebaño saltaba 5,096 celdas (ver `scenic-state.ts`).
   */
  let painted = '';
  let paintedSteading = '';

  function rebuildForest(state: GameState, palette: ReturnType<typeof paletteFor>): void {
    if (forest !== null) {
      world.remove(forest.group);
      forest.dispose();
      forest = null;
    }
    const sapling = library.get(TREE);
    if (sapling === undefined) return;
    forest = buildForest(state, sapling.original as Object3D, palette, treeFalls.suppressed);
    world.add(forest.group);
  }

  function rebuildGround(state: GameState, clock: ReturnType<typeof clockOf>): void {
    if (ground !== null) {
      world.remove(ground.mesh);
      ground.dispose();
    }
    // §10.3 · la paleta de la estación, la misma que usa el render 2D.
    const palette = paletteFor(clock.season, clock.seasonWeek);
    treeFalls.season(palette);
    // P-2 · con su plaza empedrada. El radio viene de `derive/plaza.ts`, que es
    // quien traduce la constante del motor a esta capa.
    ground = buildGround(state.map, palette, plazaOf(state));
    // La nieve en los tejados sale de la misma paleta que la del suelo: cuando
    // §10.3 pone el prado blanco es que ha nevado, y la nieve no elige donde
    // cuajar. TUNE: 0,72 y no 1, que un tejado del color exacto del prado
    // nevado deja de leerse como tejado.
    const snowing = clock.season === 'winter' ? 0.72 : 0;
    village.season(snowing, palette.accent);
    world.add(ground.mesh);

    // V-14 · la sierra que cierra el valle. Fuera del mapa jugable y por tanto
    // fuera del motor: no cuesta una constante de balance ni un byte de
    // guardado. Se arma una vez con el valle, porque no cambia nunca.
    if (ridge !== null) {
      world.remove(ridge);
      ridge.geometry.dispose();
      (ridge.material as { dispose(): void }).dispose();
    }
    ridge = buildRidge(state.map, state.terrainSeed);
    world.add(ridge);

    // El bosque y los pedregales se replantan con el suelo, que es cuando
    // alguien tala o el terreno cambia.
    for (const scattered of [forest, stones, reeds, scrub, crossing]) {
      if (scattered === null) continue;
      world.remove(scattered.group);
      scattered.dispose();
    }
    forest = null;
    stones = null;
    reeds = null;
    scrub = null;
    crossing = null;

    // Lo construido no lleva vegetacion encima.
    const taken = builtCells(state);
    rebuildForest(state, palette);
    // G-15 · y los trastos del corral, que cuelgan de lo construido: el almiar
    // toca un campo, la leña toca una casa, la carreta está en el camino. Se
    // montan aquí porque se rehacen exactamente cuando eso cambia.
    steading.build(
      steadingOf(state, state.terrainSeed),
      (asset) => library.get(asset)?.original as Object3D | undefined,
      groundFloor,
      state.map.width,
    );

    const boulder = library.get(ROCK);
    if (boulder !== undefined) {
      stones = scatterOn(state.map, boulder.original as Object3D, TERRAIN_CODE.rock, undefined, taken);
      stones.group.name = 'Valley_Rocks';
      world.add(stones.group);
    }
    const reed = library.get(REED);
    if (reed !== undefined) {
      // La orilla se replanta con el suelo por el mismo motivo que el bosque: el
      // rio no se mueve, pero un camino nuevo pegado al agua si le quita sitio.
      reeds = scatterCells(state.map, reed.original as Object3D, shoreCells(state.map, taken), palette, true);
      reeds.group.name = 'Valley_Reeds';
      world.add(reeds.group);
    }
    const undergrowth = library.get(SCRUB);
    if (undergrowth !== undefined) {
      const scrubTaken = new Set(taken);
      // La leña y los carros viven fuera de la huella del edificio.
      for (const prop of steadingOf(state, state.terrainSeed)) scrubTaken.add(prop.cell);
      scrub = scatterCells(state.map, undergrowth.original as Object3D, scrubCells(state.map, scrubTaken), palette, true);
      scrub.group.name = 'Valley_Scrub';
      world.add(scrub.group);
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
    treeFalls.standOn(floor);
    mapWidth = state.map.width;
    mapHeight = state.map.height;
    if (!disturbed) frameCamera();
  }

  // **El enganche de taller: poder mirar el juego como si fuera un vídeo.**
  //
  // Lo pidió el dueño del diseño el 16 sep 2026, y el problema que resuelve es
  // real: quien revisa este juego no puede ver la pantalla en movimiento, sólo
  // capturas, y «la IA se ve torpe» es imposible de arreglar mirando fotos
  // sueltas. Con esto, `tools/graphics/film.mjs` toma decenas de fotogramas
  // seguidos y, en cada uno, **pregunta al juego dónde está cada cuerpo y qué
  // está haciendo**. Los píxeles dicen si algo se ve mal; esto dice qué es.
  //
  // **No puede desplazar la simulación, y eso es lo que lo hace admisible**
  // (§4.3, y el innegociable de `CLAUDE.md`): sólo lee valores que el
  // fotograma acaba de calcular, no tira ningún dado, no toca el estado y no
  // existe para el juego —nadie de `src/` lo llama—. Si se borrara, no
  // cambiaría un solo píxel.
  //
  // Va sin puerta, como `window.__valleySound`, por el mismo motivo: una
  // bandera que hay que encender es una bandera que un día no está encendida
  // cuando hace falta, y lo que se quiere mirar casi nunca se repite a la
  // segunda.
  window.__valleyLife = () => {
    if (life === null) return null;
    const round = (value: number): number => Math.round(value * 1000) / 1000;
    const screen = (x: number, z: number): { x: number; y: number } => {
      const point = new Vector3(x, groundFloor(x, z) + 0.1, z).project(camera);
      return { x: round((point.x + 1) * viewport.widthCss / 2), y: round((1 - point.y) * viewport.heightCss / 2) };
    };
    return {
      renderedPeople: cast.snapshot(),
      bubbles: bubbles.snapshot(),
      buildings: (lifeState === null ? [] : visibleBuildings(lifeState)).map(building => ({ id: building.id, kind: building.kind,
        x: building.x, z: building.y, w: building.w, h: building.h, ruin: building.lostTick !== null })),
      viewport: { width: viewport.widthCss, height: viewport.heightCss },
      map: { width: life.land.width, height: life.land.height, blocked: Array.from(life.land.blocked) },
      renderedAnimals: fauna.snapshot().map(animal => ({ ...animal, screen: screen(animal.x, animal.z) })),
      day: lifeDay,
      steps: life.steps,
      timberDeliveries: life.timberDeliveries,
      stoneDeliveries: life.stoneDeliveries,
      harvestDeliveries: life.harvestDeliveries,
      // Con dónde está y dónde se ve: sin eso, un trasto en la traza sólo dice
      // que existe, y para mirar si el barril está en la plaza hay que poder
      // ir a su píxel (M-3).
      props: propsOf(life).map(prop => ({
        id: prop.id, kind: prop.kind, heldBy: prop.heldBy,
        x: round(prop.x), z: round(prop.z), y: round(prop.y), screen: screen(prop.x, prop.z),
      })),
      forest: {
        standing: forest?.count ?? 0,
        stumps: forest?.stumpCount ?? 0,
        regrowth: forest?.regrowthCount ?? 0,
        suppressed: treeFalls.suppressed.size,
        falls: treeFalls.snapshot(),
      },
      phase: round(paintedPhase),
      interactions: { ...life.interactions },
      nightOutcomes: nightOutcomes.map(night => ({ ...night, pending: [...night.pending] })),
      people: life.dwellers.map((dweller) => ({
        id: dweller.villager,
        bodyId: dweller.body.id,
        dayPlan: dweller.dayPlan ?? null,
        ageGroup: dweller.ageGroup ?? 'adult',
        penetration: round(penetration(life!.land, dweller.body.x, dweller.body.z, dweller.body.radius)),
        screen: screen(dweller.body.x, dweller.body.z),
        home: dweller.home ?? null,
        residence: dweller.residence ?? null,
        routePoints: (dweller.residence?.stage !== 'day' && dweller.residence !== undefined ? dweller.residence.route : dweller.doing?.route ?? []).map(point => ({ ...point, screen: screen(point.x, point.z) })),
        partners: dweller.scene === null ? [] : [dweller.scene.a, dweller.scene.b],
        x: round(dweller.body.x),
        z: round(dweller.body.z),
        vx: round(dweller.body.vx),
        vz: round(dweller.body.vz),
        facing: round(dweller.body.facing),
        pace: round(dweller.body.pace),
        needs: Object.fromEntries(
          Object.entries(dweller.needs).map(([name, value]) => [name, round(value as number)]),
        ) as Record<string, number>,
        // Lo que está haciendo, con el sitio y la oferta por su nombre: es lo
        // que convierte «no se mueve» en «lleva ciento veinte pasos yendo a
        // la plaza 3 del campo 7 y no llega».
        doing: dweller.doing === null ? null : {
          place: dweller.doing.place.id,
          offer: dweller.doing.offer.id,
          seat: dweller.doing.seat,
          there: dweller.doing.there,
          until: dweller.doing.until,
          route: dweller.doing.route.length,
        },
        scene: dweller.scene === null ? null : dweller.scene.kind,
        quarrel: dweller.quarrel !== null,
        holding: dweller.holding,
      })),
      beasts: life.beasts.map((beast) => ({
        id: beast.dweller.body.id,
        penetration: round(penetration(life!.land, beast.dweller.body.x, beast.dweller.body.z, beast.dweller.body.radius)),
        screen: screen(beast.dweller.body.x, beast.dweller.body.z),
        routePoints: (beast.dweller.doing?.route ?? []).map(point => ({ ...point, screen: screen(point.x, point.z) })),
        kind: beast.kind,
        reaction: { stage: beast.reaction.stage, commitment: beast.reaction.commitmentId },
        x: round(beast.dweller.body.x),
        z: round(beast.dweller.body.z),
        doing: beast.dweller.doing === null ? null : beast.dweller.doing.offer.id,
      })),
      // Del reparto sólo lo que la capa de vida no sabe: qué clip se está
      // pintando y qué burbuja lleva. Es la única forma de cazar un cuerpo que
      // se mueve con el clip de estarse quieto, o al revés.
      actors: lastActors.map((actor) => ({
        id: actor.id,
        age: actor.age,
        named: actor.named,
        clip: actor.clip,
        load: actor.load ?? null,
        activity: actor.activity,
        talking: actor.talking,
        arguing: actor.arguing,
        occupation: actor.occupation,
      })),
    };
  };

  // Captura síncrona: se vuelve a pintar sin dar pasos y se leen píxeles y
  // estado en la misma tarea JavaScript. Ningún RAF puede colarse entre ambos.
  window.__valleyCapture = (follow?: number, zoom = 1) => {
    if (follow !== undefined && follow >= 0 || zoom !== 1) { flight = null; disturbed = true; }
    const person = life?.dwellers.find(dweller => dweller.villager === follow);
    const target = person?.body ?? life?.beasts.find(beast => beast.dweller.body.id === follow)?.dweller.body;
    if (target !== undefined) view.look(target.x, target.z);
    if (zoom !== 1) view.zoom(zoom, viewport.widthCss / 2, viewport.heightCss / 2);
    renderer.render(scene, camera);
    return { image: options.canvas.toDataURL('image/png'), life: window.__valleyLife?.() ?? null };
  };
  let observingLive = false;
  window.__valleyObserveLive = () => { observingLive = true; };

  window.__valleyAdvance = (steps: number, reset = false) => {
    if (!Number.isInteger(steps) || steps < 0 || steps > 3600) throw new Error('Invalid observation steps');
    sampling = true;
    try {
      if (reset && observedState !== null && observedFrame !== null) {
        observing = true;
        observedState = structuredClone(observedState);
        fauna.clear(); cast.clear();
        graphics.paint(observedState, { ...observedFrame, presentationSeconds: 0, deltaSeconds: 0,
          realDeltaSeconds: 0, discontinuity: true });
      }
      for (let n = 0; n < steps; n += 1) {
        if (observedState === null || observedFrame === null) break;
        graphics.paint(observedState, { ...observedFrame, deltaSeconds: LIFE_STEP, realDeltaSeconds: LIFE_STEP,
          presentationSeconds: observedFrame.presentationSeconds + LIFE_STEP, discontinuity: false });
      }
    } finally { sampling = false; }
  };

  const graphics: GraphicsRenderer = {
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
      if (observing && !sampling) return;
      observedState = state; observedFrame = frame;
      if (disposed) return;
      // La hora escenica primero, porque de ella cuelga todo lo demas: es la
      // que dice que jornada se esta pintando y, con ella, que estado.
      const phase = dayPhase(frame.presentationSeconds);
      paintedPhase = phase;
      const today = dayNumber(frame.presentationSeconds);
      // Un fotograma discontinuo —partida nueva, carga, letargo— trae un estado
      // que no es la continuacion del anterior, asi que la jornada guardada no
      // vale: se estrena una. `presentation-clock` ya distingue los tres casos.
      if (frame.discontinuity) scenic.reset();
      // **Y a partir de aqui se pinta esto y no `state`.** El de la jornada,
      // quieto desde anoche: ver `scenic-state.ts` para por que. Lo vivo solo lo
      // mira quien tenga una razon para mirarlo, y hoy no la tiene nadie.
      const shown = scenic.of(state as GameState, phase);

      const next = planFor(shown);
      const change = planChange(plan, next);
      let fallingChanged = treeFalls.observe(state.map, frame.discontinuity);

      if (change.cleared) {
        // A different valley. Everything built for the last one goes, rather
        // than being updated into place: what the two happened to share would
        // otherwise survive into a game it never belonged to.
        village.clear();
        cast.clear();
        tells.clear();
        fauna.clear();
        bubbles.clear();
        props.clear();
        weather.clear();
        treeFalls.reset(state.map);
        fallingChanged = false;
        disturbed = false;
        paintedSky = 'clear';
      }
      const acceptedForest = treeFalls.acceptShown(shown.map);
      // El suelo se rehace cuando cambia el terreno **o cuando cambia la
      // estación del reloj vivo**, que es lo que le da el color. La clave lleva
      // la semana dentro de la estación porque §10.3 deshiela mezclando durante
      // las dos primeras.
      const live = clockOf(state.tick);
      const colour = `${live.season}:${Math.min(2, live.seasonWeek)}`;
      // Los almiares y leñeras se cuantizan a partir de reservas reales. Su
      // recuento puede cambiar en un tick sin que cambie terreno ni estación.
      const steadingKey = `${shown.tick === 0 ? 0 : Math.floor(shown.village.wood / 60)}:${Math.floor(shown.village.grain / 200)}`;
      if (change.ground || change.cleared || colour !== painted || steadingKey !== paintedSteading) {
        rebuildGround(shown, live);
        painted = colour;
        paintedSteading = steadingKey;
      } else if (change.forest || fallingChanged || acceptedForest) {
        rebuildForest(shown, paletteFor(live.season, live.seasonWeek));
      }
      treeFalls.step(frame.speed === 0 ? 0 : frame.realDeltaSeconds);
      for (const id of change.removed) village.remove(id);
      for (const building of [...change.added, ...change.changed]) village.add(building);
      plan = next;
      // El encuadre sigue a lo construido, asi que se rehace cuando el pueblo
      // cambia de forma y no en cada fotograma.
      if (!isQuiet(change) && !disturbed) frameCamera();
      if (wantedFlight !== null && mapWidth > 0) {
        beginFlight(wantedFlight);
        wantedFlight = null;
      }
      // El vuelo va con el reloj real: la primera versión iba con el escénico
      // y se veía en la secuencia —tres fotogramas quietos y un salto—, porque
      // ese reloj lleva la velocidad y se para en pausa.
      stepFlight(frame.realDeltaSeconds);

      // La gente se recoloca en cada fotograma porque en cada fotograma se ha
      // movido; la aldea no, porque cambia unas cuantas veces al año.
      //
      // La aldea vive por su cuenta: una jornada es una vida, y al amanecer se
      // estrena otra con la gente que el motor diga.
      if (life === null || lifeState !== shown || frame.discontinuity) {
        const previous = life;
        life = createVillage(shown, today, { land: solidTerrain(shown, id => library.instance(id)) });
        // El relevo del estado no recoloca a los supervivientes. Sólo una
        // discontinuidad explícita permite reconstruir toda la presentación.
        if (previous !== null && !frame.discontinuity) {
          for (const person of life.dwellers) {
            const old = previous.dwellers.find(other => other.villager === person.villager);
            if (old === undefined || !fitsCircle(life.land, old.body.x, old.body.z, person.body.radius)) continue;
            Object.assign(person.body, { x: old.body.x, z: old.body.z, facing: old.body.facing, vx: old.body.vx, vz: old.body.vz });
            person.travelled = old.travelled;
            if (person.residence !== undefined && old.residence?.building === person.residence.building) {
              // El relevo escénico puede ocurrir durante el regreso: conservar
              // el desvío y el turno, traduciendo sus relojes al nuevo paso cero.
              Object.assign(person.residence, old.residence, {
                route: old.residence.route.map(point => ({ ...point })),
                until: old.residence.until - previous.steps,
                retryAt: old.residence.retryAt - previous.steps,
                progressAt: (old.residence.progressAt ?? previous.steps) - previous.steps,
                returnCheck: 0,
              });
            }
          }
          for (const beast of life.beasts) {
            const old = previous.beasts.find(other => other.dweller.body.id === beast.dweller.body.id && other.kind === beast.kind);
            if (old !== undefined && fitsCircle(life.land, old.dweller.body.x, old.dweller.body.z, beast.dweller.body.radius)) {
              Object.assign(beast.dweller.body, { x: old.dweller.body.x, z: old.dweller.body.z, facing: old.dweller.body.facing });
            }
          }
        }
        lifeDay = today;
        lifeState = shown;
        lifeCarry = 0;
      }
      lifeCarry += frame.deltaSeconds;
      if (frame.discontinuity) { steppedPhase = phase; nightOutcomes.length = 0; }
      // Una entrada puede empezar y terminar dentro del mismo fotograma a
      // velocidades altas. Se acumulan los pulsos de todos los pasos de vida,
      // no sólo el estado final que queda al terminar el bucle.
      const activeDoors = new Set<number>();
      const rememberDoors = (): void => {
        for (const person of life!.dwellers) {
          const home = person.residence;
          if (home !== undefined && (home.stage === 'opening' || home.stage === 'entering' || home.stage === 'leaving')) {
            activeDoors.add(home.building);
          }
        }
      };
      let given = 0;
      while (lifeCarry >= LIFE_STEP && given < 240) {
        const stepPhase = (phase - (lifeCarry - LIFE_STEP) / 120 + 1) % 1;
        if (isNight(steppedPhase) && !isNight(stepPhase)) {
          const residents = life.dwellers.filter(person => person.residence !== undefined);
          const pending = residents.filter(person => person.residence!.stage !== 'sleeping').map(person => person.villager);
          nightOutcomes.push({ tick: state.tick, residents: residents.length, sleeping: residents.length - pending.length, pending });
          if (nightOutcomes.length > 64) nightOutcomes.shift();
        }
        steppedPhase = stepPhase;
        life.step(stepPhase);
        rememberDoors();
        lifeCarry -= LIFE_STEP;
        given += 1;
      }
      rememberDoors();
      const ages = new Map<VillagerId, number>();
      const named = new Set<VillagerId>();
      for (const villager of shown.people.villagers) {
        ages.set(villager.id, clockOf(shown.tick).year - clockOf(villager.bornTick).year);
        if (villager.named) named.add(villager.id);
      }
      const entrances = new Map(life.dwellers.filter(person => person.residence !== undefined)
        .map(person => [person.residence!.building, person.residence!.facing]));
      village.entrances(entrances);
      // La hoja es una animación legible para el jugador: usa tiempo real y se
      // congela en pausa. La jornada y los cuerpos siguen usando tiempo
      // escénico, como antes.
      village.doors(activeDoors, frame.speed === 0 ? 0 : frame.realDeltaSeconds);
      lastActors = castOf(life, frame.presentationSeconds, ages, named);
      // V-09b: la pelota, el palo, el cubo, el haz de leña.
      props.update(propsOf(life), groundFloor);
      plaza.show(plazaOf(shown), groundFloor);
      cast.show(lastActors);

      // §11.1.1 · la nube sobre la cabeza de quien esta viviendo algo. Lo que
      // lleva sale del estado; que este parado hablando lo dice el actor.
      const moods = moodsFor(shown);
      const carried = new Map<VillagerId, Bubble>();
      const heads = new Map<VillagerId, { x: number; y: number; z: number }>();
      for (const actor of lastActors) {
        const mood = moods.get(actor.id);
        // IA-6: la riña de §7.10 manda sobre el humor y sobre la charla. Es un
        // suceso que está pasando ahora y con dos nombres detrás; un humor es
        // un estado de fondo y una charla es lo corriente.
        const bubble: Bubble | undefined = actor.arguing
          ? 'quarrel'
          : actor.talking ? 'chat' : (actor.clip === 'idle' && Math.floor(frame.presentationSeconds + actor.id * 1.7) % 12 < 3 ? mood : undefined);
        if (bubble === undefined) continue;
        carried.set(actor.id, bubble);
        heads.set(actor.id, { x: actor.x, y: groundFloor(actor.x, actor.z), z: actor.z });
      }
      // **Y como mucho tres a la vez.** Mirando diez frames seguidos, lo que más
      // se movía en pantalla eran las nubes «…»: ocho o diez a la vez sobre la
      // plaza, el glifo de relleno convertido en lo más visible del valle. Una
      // nube dice «ahí pasa algo»; diez dicen «esto está roto». Se quedan las
      // que llevan un estado de verdad —hambre, luto— antes que las de charla, y
      // de las que quedan, las más cerca de donde se mira.
      if (carried.size > MOST_BUBBLES) {
        const centre = view.view.centre;
        const kept = [...carried.entries()]
          .sort(([idA, a], [idB, b]) => {
            const stateA = a === 'quarrel' ? 0 : a === 'chat' ? 1 : 2;
            const stateB = b === 'quarrel' ? 0 : b === 'chat' ? 1 : 2;
            if (stateA !== stateB) return stateA - stateB;
            const headA = heads.get(idA);
            const headB = heads.get(idB);
            const nearA = headA === undefined ? Infinity : Math.hypot(headA.x - centre.x, headA.z - centre.z);
            const nearB = headB === undefined ? Infinity : Math.hypot(headB.x - centre.x, headB.z - centre.z);
            return nearA - nearB;
          })
          .slice(0, MOST_BUBBLES);
        carried.clear();
        for (const [id, bubble] of kept) carried.set(id, bubble);
        for (const id of [...heads.keys()]) if (!carried.has(id)) heads.delete(id);
      }
      bubbles.update(heads, carried);
      // Las señales cambian con la semana, no con el fotograma: `update` se sale
      // solo cuando nada ha cambiado.
      tells.update(shown, entrances);
      // El humo y las luces si son de cada fotograma: uno sube y las otras se
      // encienden cuando cae el dia.
      tells.drift(frame.presentationSeconds, phase, frame.speed);
      // Y el rio corre. Un rio quieto es un suelo azul.
      ground?.ripple(frame.presentationSeconds);
      // La cabaña sí cambia en cada fotograma: los animales pastan, y un rebaño
      // congelado entre semana y semana sería peor que no tenerlo.
      // IA-5: y el lobo del corral, si lo hay hoy, viene de la vida
      // (`life.wildlife`) y no de la fórmula — ver el comentario de `update`
      // en `effects/fauna.ts` sobre por qué sólo él.
      fauna.update(shown, phase, [...life.wildlife, ...life.beasts.map(beast => ({
        id: beast.dweller.body.id, kind: beast.kind, x: beast.dweller.body.x, y: beast.dweller.body.z,
      }))], frame.presentationSeconds);
      // Y la luz que hace a esa hora. Va despues de todo lo que se coloca porque
      // no depende de nada de ello: solo de la hora.
      // **U-13 · el cielo.** Se deriva (`derive/weather.ts`): la fila del clima
      // del año dice cuánto llueve en este valle y un `hash32` de la jornada
      // dice qué toca hoy, sin tocar el motor ni consumir una tirada.
      const sky = skyAt(shown, today);
      if (sky.kind !== paintedSky) {
        weather.set(sky.kind, sky.intensity);
        paintedSky = sky.kind;
      }
      // Los rayos de la jornada están decididos de antemano —fases fijas—, así
      // que aquí sólo se mira cuáles se han cruzado desde el fotograma
      // anterior. A ×64 un fotograma puede cruzar dos: cuentan los dos y se
      // dibuja el último, que es lo que se vería.
      if (today !== boltDay) {
        boltDay = today;
        // Desde **aquí**, no desde el amanecer: al abrir el juego la jornada ya
        // va por 0,28 (`DAY_START_PHASE`), y arrancando en cero caía un rayo en
        // el primer fotograma de cualquier día de tormenta. Los que cayeron
        // antes de mirar, cayeron sin nadie delante.
        boltPhase = phase;
      }
      for (const [index, at] of boltsInDay(shown, today).entries()) {
        if (at <= boltPhase || at > phase) continue;
        const where = boltPlace(shown, today, index);
        weather.strike(where.x, where.z, index);
        flashLeft = SKY.FLASH_SECONDS;
        bolts += 1;
      }
      boltPhase = phase;
      // En pausa no se apaga: el destello y la lluvia se quedan como están,
      // igual que todo lo que se mueve (§11.4). Y así se puede fotografiar un
      // rayo, que dura 0,12 s y no hay captura que lo alcance corriendo.
      const flashDelta = frame.speed === 0 ? 0 : frame.realDeltaSeconds;
      weather.step(frame.deltaSeconds, view.view.centre, flashDelta);
      // Y la luz que hace a esa hora, con el cielo que haga encima.
      light(phase, frame.speed, overcastOf(sky));
      if (flashLeft > 0) {
        // El destello: el hemisférico a tope y el fondo casi blanco mientras
        // dura. Se hace **después** de `light` a propósito, porque es un
        // instante y no una hora: la hora vuelve sola en el fotograma
        // siguiente sin que nadie tenga que restaurar nada.
        flashLeft -= flashDelta;
        ambient.intensity *= 2.4;
        sun.intensity *= 1.6;
        (scene.background as Color).lerp(FLASH_WHITE, 0.55);
        if (scene.fog !== null) (scene.fog as Fog).color.copy(scene.background as Color);
        renderer.setClearColor(scene.background as Color);
      }
      // El zoom mueve la camara, asi que la niebla se recalibra con ella: si no,
      // acercarse metia el pueblo dentro de la bruma.
      if (mapWidth > 0) fogAround(new Vector3(mapWidth / 2, 0, mapHeight / 2));

      if (!sampling && !observingLive) renderer.render(scene, camera);
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

    doing(id: number): ActorDoing | null {
      // VZ-6 · del mismo `lastActors` con el que se pintó el último fotograma:
      // lo que la ficha dice es literalmente lo que se está viendo.
      const found = lastActors.find((actor) => actor.id === id);
      if (found === undefined) return null;
      return { activity: found.activity, load: found.load ?? null };
    },

    look(x: number, z: number): void {
      if (disposed) return;
      // VZ-6 · lo que §11.5 pide al contestar una decisión: mirar a lo que esa
      // decisión ha cambiado. Sin tocar la altura, como `track`: acercarse es
      // del jugador.
      //
      // Cuenta como mover la cámara —`flight` fuera, `disturbed` puesto— y no
      // por gusto: contestar cambia el estado, y el encuadre automático de
      // `paint` (`if (!isQuiet(change) && !disturbed) frameCamera()`) se comía
      // el enfoque en el fotograma siguiente. Es la misma razón por la que
      // `pan` y `zoom` lo hacen.
      flight = null;
      disturbed = true;
      view.look(x, z);
    },

    track(id: number | null): void {
      // VZ-5 · **y se le enciende la ropa**, que es lo que hace que sepas a
      // quién sigues: en un valle con ochenta personas del tamaño de un dedal,
      // centrar la cámara no basta. Lo dibuja `cast.highlight` subiendo la
      // emisión de los materiales propios de ese aldeano —`dress` se los clona
      // a cada uno— así que no toca a nadie más. Idempotente: `app.ts` llama a
      // esto en cada fotograma desde VZ-4 para que la cámara vaya detrás.
      cast.highlight(id);
      if (id === null) return;
      // Seguir a alguien es mirarle, no acercarse a el: la distancia la elige
      // el jugador y no se le quita de las manos.
      const followed = lastActors.find((actor) => actor.id === id);
      if (followed !== undefined) view.look(followed.x, followed.z);
    },

    zoom(factor: number, atXCss: number, atYCss: number): void {
      if (disposed) return;
      flight = null;
      disturbed = true;
      view.zoom(factor, atXCss, atYCss);
    },

    pan(dxCss: number, dyCss: number): void {
      if (disposed) return;
      flight = null;
      disturbed = true;
      view.pan(dxCss, dyCss);
    },

    orbit(dYaw: number, dPitch: number): void {
      if (disposed) return;
      flight = null;
      disturbed = true;
      view.orbit(dYaw, dPitch);
    },

    resetView(): void {
      if (disposed) return;
      flight = null;
      wantedFlight = null;
      disturbed = false;
      frameCamera();
      view.reset();
    },

    flyIn(seconds: number): void {
      if (disposed) return;
      wantedFlight = seconds;
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
        viewHeight: view.view.height,
        viewCentre: { x: view.view.centre.x, z: view.view.centre.z },
        sunPhase: paintedPhase,
        sky: paintedSky,
        bolts,
      };
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      weather.dispose();
      tells.dispose();
      fauna.dispose();
      bubbles.dispose();
      props.dispose();
      plaza.dispose();
      treeFalls.dispose();
      cast.dispose();
      village.dispose();
      steading.dispose();
      if (ground !== null) {
        world.remove(ground.mesh);
        ground.dispose();
        ground = null;
      }
      for (const scattered of [forest, stones, reeds, scrub, crossing]) {
        if (scattered === null) continue;
        world.remove(scattered.group);
        scattered.dispose();
      }
      forest = null;
      stones = null;
      reeds = null;
      scrub = null;
      crossing = null;
      if (!borrowed) library.dispose();
      lastActors = [];
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  return graphics;
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

declare global {
  interface Window {
    /**
     * El enganche de taller de arriba. Opcional porque el juego no lo necesita
     * y porque una prueba que corra sin renderer no lo tiene.
     */
    __valleyLife?: () => LifeSnapshot | null;
    __valleyAdvance?: (steps: number, reset?: boolean) => void;
    __valleyCapture?: (follow?: number, zoom?: number) => { image: string; life: LifeSnapshot | null };
    __valleyObserveLive?: () => void;
  }
}

/** Lo que el enganche devuelve. Nada de esto se usa dentro del juego. */
interface ScreenPoint { readonly x: number; readonly y: number }
interface ObservedPoint { readonly x: number; readonly z: number; readonly screen: ScreenPoint }
interface LifeSnapshot {
  readonly nightOutcomes: readonly { readonly tick: number; readonly residents: number; readonly sleeping: number; readonly pending: readonly number[] }[];
  readonly renderedPeople: readonly { readonly id: number; readonly x: number; readonly z: number;
    readonly scale: number }[];
  readonly bubbles: readonly { readonly id: number; readonly kind: Bubble }[];
  readonly buildings: readonly { readonly id: number; readonly kind: string; readonly x: number;
    readonly z: number; readonly w: number; readonly h: number; readonly ruin: boolean }[];
  readonly viewport: { readonly width: number; readonly height: number };
  readonly map: { readonly width: number; readonly height: number; readonly blocked: readonly number[] };
  readonly renderedAnimals: readonly { readonly id: number; readonly kind: string; readonly x: number;
    readonly z: number; readonly walkWeight: number | null; readonly screen: ScreenPoint }[];
  readonly day: number;
  readonly steps: number;
  readonly timberDeliveries: number;
  readonly stoneDeliveries: number;
  readonly harvestDeliveries: number;
  readonly props: readonly {
    readonly id: number; readonly kind: string; readonly heldBy: number | null;
    readonly x: number; readonly z: number; readonly y: number;
    readonly screen: { readonly x: number; readonly y: number };
  }[];
  readonly forest: {
    readonly standing: number;
    readonly stumps: number;
    readonly regrowth: number;
    readonly suppressed: number;
    readonly falls: readonly TreeFallSighting[];
  };
  readonly phase: number;
  readonly interactions: Readonly<Record<string, number>>;
  readonly people: readonly {
    readonly id: number;
    readonly residence: HomeRoutine | null;
    readonly penetration: number;
    readonly bodyId: number; readonly screen: ScreenPoint;
    readonly dayPlan: DayPlan | null;
    readonly ageGroup: string;
    readonly home: { readonly x: number; readonly z: number } | null;
    readonly routePoints: readonly ObservedPoint[]; readonly partners: readonly number[];
    readonly x: number; readonly z: number;
    readonly vx: number; readonly vz: number;
    readonly facing: number; readonly pace: number;
    readonly needs: Readonly<Record<string, number>>;
    readonly doing: {
      readonly place: string; readonly offer: string; readonly seat: number;
      readonly there: boolean; readonly until: number; readonly route: number;
    } | null;
    readonly scene: string | null;
    readonly quarrel: boolean;
    readonly holding: number | null;
  }[];
  readonly beasts: readonly {
    readonly id: number; readonly kind: string;
    readonly penetration: number;
    readonly reaction: { readonly stage: string | null; readonly commitment: string | null };
    readonly screen: ScreenPoint; readonly routePoints: readonly ObservedPoint[];
    readonly x: number; readonly z: number; readonly doing: string | null;
  }[];
  readonly actors: readonly {
    readonly id: number; readonly age: number; readonly named: boolean;
    readonly clip: string; readonly load: 'bundle' | 'stone' | 'grain' | null; readonly activity: string;
    readonly talking: boolean; readonly arguing: boolean;
    readonly occupation: string | null;
  }[];
}
