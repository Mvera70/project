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
import { TERRAIN_CODE, type GameState, type Role, type VillagerId } from '@engine/state';
import { loadAssets, type AssetLibrary } from './assets';
import type {
  Actor, GraphicsFrame, GraphicsRenderer, GraphicsRendererOptions, GraphicsStats, GraphicsTarget,
  GraphicsViewport,
} from './contracts';
import { VALLEY_COLOURS } from './visual-config';
import { buildGround, elevationAt, type Ground } from './world/ground';
import { buildRidge } from './world/ridge';
import { buildFord, type Ford } from './world/ford';
import {
  buildForest, builtCells, scatterCells, scatterOn, shoreCells, type Forest,
} from './world/forest';
import { BUILDING_ASSETS, Village } from './world/buildings';
import { Steading, STEADING_ASSETS, steadingOf } from './world/steading';
import { Cast } from './world/cast';
import { dayNumber, dayPhase } from './presentation-clock';
import { createScenicState } from './scenic-state';
import { createVillage, type Village as LifeVillage } from './life/village';
import { castOf, propsOf } from './life/cast';
import { Props } from './world/props';
import { LIFE_STEP } from './life/clock';
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
 * Que recurso clona cada oficio con nombre. design.md D.6.2.
 *
 * Los siete son los que existen de verdad en el estado (§3.4); `stranger` no
 * tiene modelo propio porque es "sin oficio todavia" y no un oficio. Todos
 * comparten huesos y clips con el aldeano base, asi que solo cambia que malla
 * se clona.
 */
const VILLAGER_BY_ROLE: Readonly<Record<Exclude<Role, 'stranger'>, string>> = {
  leader: 'villager-leader',
  smith: 'villager-smith',
  midwife: 'villager-midwife',
  priest: 'villager-priest',
  woodward: 'villager-woodward',
  reeve: 'villager-reeve',
  herbalist: 'villager-herbalist',
};

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
  // G-15 · los trastos del corral, que es lo que dice que aquí vive alguien.
  ...STEADING_ASSETS,
  VILLAGER, ...Object.values(VILLAGER_BY_ROLE), TREE, ROCK, REED, FORD, 'hoe', 'bundle', 'ball', 'stick', 'bucket', 'field-cut', 'ruin-wood', 'ruin-stone',
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

  /**
   * De que color es la luz a esta hora del dia escenico, a esta velocidad.
   *
   * La velocidad entra porque desde D.6.1 la jornada la sigue entera: a x64 el
   * dia dura menos de dos segundos, y una jornada de luz de dos segundos es un
   * parpadeo. `daylightAt` la aplana; aqui solo se le pasa el dato.
   */
  function light(phase: number, speed: GraphicsFrame['speed']): void {
    const day = daylightAt(phase, speed);
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
  // El oficio elige el recurso; sin oficio, o si el catálogo aún no tiene el
  // suyo, cae al aldeano base — que es el mismo criterio que ya usaba todo el
  // mundo antes de que hubiera más de un modelo.
  const cast = new Cast(villager, (role) => {
    const wanted = role === null || role === 'stranger' ? undefined : VILLAGER_BY_ROLE[role];
    return (wanted === undefined ? undefined : library.instance(wanted)) ?? library.instance(VILLAGER);
  }, (id) => library.instance(id));
  const tells = new Tells();
  const fauna = new Fauna((kind) => library.instance(kind));
  const bubbles = new Bubbles();
  const props = new Props();
  world.add(village.group, cast.group, tells.group, fauna.group, bubbles.group, props.group);

  let ground: Ground | null = null;
  let forest: Forest | null = null;
  let stones: Forest | null = null;
  let reeds: Forest | null = null;
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
  let lifeCarry = 0;
  let mapWidth = 0;
  let mapHeight = 0;
  // U-12 · la fase de la última jornada pintada, para poder mirarla desde fuera.
  let paintedPhase = 0;
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
    const reach = radius * 1.2;
    sun.shadow.camera.left = -reach;
    sun.shadow.camera.right = reach;
    sun.shadow.camera.top = reach;
    sun.shadow.camera.bottom = -reach;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = radius * 8;
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

  function rebuildGround(state: GameState, clock: ReturnType<typeof clockOf>): void {
    if (ground !== null) {
      world.remove(ground.mesh);
      ground.dispose();
    }
    // §10.3 · la paleta de la estación, la misma que usa el render 2D.
    const palette = paletteFor(clock.season, clock.seasonWeek);
    ground = buildGround(state.map, palette);
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
    for (const scattered of [forest, stones, reeds, crossing]) {
      if (scattered === null) continue;
      world.remove(scattered.group);
      scattered.dispose();
    }
    forest = null;
    stones = null;
    reeds = null;
    crossing = null;

    // Lo construido no lleva vegetacion encima.
    const taken = builtCells(state);
    const sapling = library.get(TREE);
    if (sapling !== undefined) {
      forest = buildForest(state.map, sapling.original as Object3D, palette, taken);
      world.add(forest.group);
    }
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
      reeds = scatterCells(state.map, reed.original as Object3D, shoreCells(state.map, taken), palette);
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
      }
      // El suelo se rehace cuando cambia el terreno **o cuando cambia la
      // estación del reloj vivo**, que es lo que le da el color. La clave lleva
      // la semana dentro de la estación porque §10.3 deshiela mezclando durante
      // las dos primeras.
      const live = clockOf(state.tick);
      const colour = `${live.season}:${Math.min(2, live.seasonWeek)}`;
      if (change.ground || change.cleared || colour !== painted) {
        rebuildGround(shown, live);
        painted = colour;
      }
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
      if (life === null || lifeDay !== today || frame.discontinuity) {
        life = createVillage(shown, today);
        lifeDay = today;
        lifeCarry = 0;
      }
      lifeCarry += frame.deltaSeconds;
      let given = 0;
      while (lifeCarry >= LIFE_STEP && given < 240) {
        life.step();
        lifeCarry -= LIFE_STEP;
        given += 1;
      }
      const ages = new Map<VillagerId, number>();
      const named = new Set<VillagerId>();
      for (const villager of shown.people.villagers) {
        ages.set(villager.id, clockOf(shown.tick).year - clockOf(villager.bornTick).year);
        if (villager.named) named.add(villager.id);
      }
      lastActors = castOf(life, frame.presentationSeconds, ages, named);
      // V-09b: la pelota, el palo, el cubo, el haz de leña.
      props.update(propsOf(life), groundFloor);
      cast.show(lastActors);

      // §11.1.1 · la nube sobre la cabeza de quien esta viviendo algo. Lo que
      // lleva sale del estado; que este parado hablando lo dice el actor.
      const moods = moodsFor(shown);
      const carried = new Map<VillagerId, Bubble>();
      const heads = new Map<VillagerId, { x: number; y: number; z: number }>();
      for (const actor of lastActors) {
        const mood = moods.get(actor.id);
        const bubble: Bubble | undefined = mood ?? (actor.talking ? 'chat' : undefined);
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
            const stateA = a === 'chat' ? 1 : 0;
            const stateB = b === 'chat' ? 1 : 0;
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
      tells.update(shown);
      // El humo y las luces si son de cada fotograma: uno sube y las otras se
      // encienden cuando cae el dia.
      tells.drift(frame.presentationSeconds, phase, frame.speed);
      // Y el rio corre. Un rio quieto es un suelo azul.
      ground?.ripple(frame.presentationSeconds);
      // La cabaña sí cambia en cada fotograma: los animales pastan, y un rebaño
      // congelado entre semana y semana sería peor que no tenerlo.
      fauna.update(shown, phase);
      // Y la luz que hace a esa hora. Va despues de todo lo que se coloca porque
      // no depende de nada de ello: solo de la hora.
      light(phase, frame.speed);
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
        sunPhase: paintedPhase,
      };
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      tells.dispose();
      fauna.dispose();
      bubbles.dispose();
      props.dispose();
      cast.dispose();
      village.dispose();
      steading.dispose();
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
