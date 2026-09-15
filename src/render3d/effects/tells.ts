// G-08 · Las señales del valle, en tres dimensiones. design.md D.3, D.8, §10.
//
// **No hay ninguna regla nueva aquí.** Qué señal corresponde a qué estado lo
// decide `tellsFor`, que es el mismo que usa el render 2D, y sale en coordenadas
// de mapa porque nunca fue código de dibujo. Esto sólo decide qué forma tiene
// cada señal en el espacio. Duplicar las condiciones habría hecho que los dos
// valles se separaran en cuanto alguien ajustara un umbral, y G-08 lo prohíbe
// con esas palabras.
//
// Ninguna señal tiene temporizador propio. Se leen del estado en cada
// reconstrucción, y cuando el estado deja de decirlas, desaparecen: una peste
// vencida que siguiera manchando casas sería el fallo que la v2.18 costó cinco
// rondas de balance.

import {
  BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  SphereGeometry, type Object3D,
} from 'three';
import type { Building, GameState } from '@engine/state';
import { BUILDING_ASSETS } from '../world/buildings';
import { daylightAt } from './daylight';
import { tellsFor, type Tell } from '@derive/tells';

/** Alturas en celdas. Una celda son unos tres metros (D.6.2). */
const HEIGHT = {
  smoke: 1.55,
  light: 0.47,
  plague: 1.62,
  // Justo sobre el caballete, para la luz que no encuentra fachada libre. La
  // casa mide 2,3 de pared y 2,1 de tejado, o sea 1,47 celdas: por debajo de
  // eso el resplandor se mete dentro del tejado y se apaga.
  roofGlow: 1.55,
  candles: 0.42,
  banner: 1.1,
  grain: 0.05,
} as const;

const TONE = {
  smoke: '#5A5A52',
  light: '#E6B85C',
  plague: '#7C5B7A',
  candles: '#F2D48A',
  grain: '#D8B25E',
} as const;

const BANNER_TONES: Record<string, string> = {
  red: '#8C3B34', grey: '#7D8489', white: '#E8E4DA',
  black: '#2F2C29', green: '#4D6B45', blue: '#3F5A78',
};

/**
 * Una firma de lo que las señales dicen ahora mismo.
 *
 * Las señales cambian con el tick, no con el fotograma, así que reconstruirlas
 * sesenta veces por segundo sería tirar trabajo. Comparar la firma cuesta menos
 * que rehacer treinta objetos.
 */
function signatureOf(tells: readonly Tell[]): string {
  return tells.map((tell) => {
    const at = `${tell.kind}:${tell.x.toFixed(2)},${tell.y.toFixed(2)}`;
    if (tell.kind === 'granary') return `${at}:${tell.fraction.toFixed(2)}`;
    if (tell.kind === 'smoke') return `${at}:${tell.intensity.toFixed(2)}`;
    if (tell.kind === 'candles') return `${at}:${tell.count}`;
    if (tell.kind === 'banner') return `${at}:${tell.colour}`;
    return at;
  }).join('|');
}

/**
 * Donde tiene ventanas cada casa, en celdas desde su esquina.
 *
 * **La luz sale por las ventanas.** Antes era un rectangulo pegado a la
 * fachada, del tamano de medio muro y sin relacion con ningun hueco: se leia
 * como un cartel encendido, no como una casa con alguien dentro.
 *
 * Los numeros son los de la receta divididos por tres, porque la receta se
 * escribe en metros y una celda son tres (D.6.2). Estan aqui **repetidos a
 * proposito**, y hay una prueba que los compara con la receta: la alternativa
 * era leer el GLB en tiempo de ejecucion para sacar la posicion de un hueco,
 * que es mucho aparato para seis numeros que no cambian.
 *
 * Los numeros estan **en coordenadas de la receta**, o sea las de Blender, que
 * es donde se escribieron y con las que la prueba los compara. La escena no usa
 * las mismas: el exportador de glTF pone `z_escena = -y_blender`, asi que un
 * edificio ocupa de `-fondo` a `0` en Z y se coloca sumandole su fondo. La
 * conversion se hace en un solo sitio, `atFace`, en vez de dejar los numeros ya
 * girados aqui y que nadie sepa de donde salieron.
 */
export interface Window {
  readonly x: number;
  readonly z: number;
  readonly up: number;
  readonly wide: number;
  readonly tall: number;
  /** Hacia donde mira, para sacar el resplandor un dedo del muro. */
  readonly out: readonly [number, number];
}

export const WINDOWS: Readonly<Record<string, readonly Window[]>> = {
  house: [
    { x: 0.483, z: 0.12, up: 0.467, wide: 0.267, tall: 0.233, out: [0, -1] },
    { x: 1.517, z: 0.12, up: 0.467, wide: 0.267, tall: 0.233, out: [0, -1] },
    { x: 0.12, z: 1.133, up: 0.467, wide: 0.267, tall: 0.233, out: [-1, 0] },
  ],
  'stone-house': [
    { x: 0.467, z: 0.103, up: 0.517, wide: 0.25, tall: 0.267, out: [0, -1] },
    { x: 1.533, z: 0.103, up: 0.517, wide: 0.25, tall: 0.267, out: [0, -1] },
    { x: 0.103, z: 1.167, up: 0.517, wide: 0.25, tall: 0.267, out: [-1, 0] },
  ],
};

/**
 * Donde cae en la escena un punto escrito en coordenadas de la receta.
 *
 * La fachada —la cara de la puerta, `y = 0` en Blender— es el **borde de +Z**
 * del edificio en la escena, que es el que mira a la camara.
 */
function atFace(home: Building, hole: Window): { x: number; z: number; out: readonly [number, number] } {
  return {
    x: home.x + hole.x,
    z: home.y + home.h - hole.z,
    out: [hole.out[0], -hole.out[1]] as const,
  };
}

/**
 * Un punto justo fuera del edificio, en una cara que no tape nadie.
 *
 * La fachada —la cara de -Y, donde la receta pone la puerta— es la primera
 * opción, pero en este valle **las casas se tocan**: la de delante puede estar
 * pegada, y entonces la luz cae dentro de su pared trasera y vuelve a estar
 * enterrada. Se prueban las cuatro caras y se elige la que esté libre.
 *
 * Si no hay ninguna libre, no hay sitio en el suelo: la señal se va por encima
 * de los tejados, que desde ahí se ve siempre.
 */
const FACES = [[0, -1], [1, 0], [-1, 0], [0, 1]] as const;
const CLEAR = 0.12;

/** Lo que sobresale del muro un cristal encendido, en celdas: un dedo. */
const GLASS = 0.03;

function outsideOf(
  home: Building, at: (x: number, y: number) => Building | undefined,
): { x: number; z: number; free: boolean } {
  const x = home.x + home.w / 2;
  const z = home.y + home.h / 2;
  for (const [dx, dz] of FACES) {
    const px = dx === 0 ? x : home.x + (dx > 0 ? home.w + CLEAR : -CLEAR);
    const pz = dz === 0 ? z : home.y + (dz > 0 ? home.h + CLEAR : -CLEAR);
    if (at(px, pz) === undefined) return { x: px, z: pz, free: true };
  }
  return { x, z, free: false };
}

/** Un cuerpo pequeño que no proyecta sombra: es una señal, no un objeto. */
function mark(
  geometry: BoxGeometry | SphereGeometry, colour: string, glows: boolean,
  x: number, y: number, z: number, opacity = 1,
): { object: Object3D; dispose(): void } {
  const material = glows
    ? new MeshBasicMaterial({ color: new Color(colour), transparent: opacity < 1, opacity })
    : new MeshStandardMaterial({ color: new Color(colour), roughness: 1, transparent: opacity < 1, opacity });
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return {
    object: mesh,
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}

/**
 * Qué forma tiene cada señal.
 *
 * D.3 pide que se lean en escala de grises, así que ninguna depende sólo del
 * color: el humo va arriba, la luz en la puerta, la peste en una esquina, las
 * velas en fila. **La posición y la forma son la señal; el color acompaña.**
 */
function bodyOf(tell: Tell, at?: (x: number, y: number) => Building | undefined): Array<{ object: Object3D; dispose(): void }> {
  switch (tell.kind) {
    case 'smoke': {
      // Tres bolas cada vez más altas y más tenues: una columna, no una mancha.
      // La intensidad viene del ánimo, y una aldea hundida humea poco.
      return [0, 1, 2].map((step) => {
        const piece = mark(
          // Material sin luz a proposito. Con luz, un gris oscuro bajo el sol de
          // este valle sale blanco: las bocanadas se veian como huevos puestos
          // en el tejado. El humo no se ilumina, se ve.
          new SphereGeometry(0.09 + step * 0.035, 6, 5), TONE.smoke, true,
          tell.x, HEIGHT.smoke, tell.y,
          (0.18 + tell.intensity * 0.45),
        );
        // Cada bola sube por su cuenta, desfasada un tercio de vuelta: eso es
        // lo que hace columna en vez de tres bolas que suben a la vez. El
        // desfase de la chimenea viene de dónde está, así que dos casas no
        // humean al unísono como un coro.
        piece.object.userData.plume = {
          base: HEIGHT.smoke,
          peak: 0.18 + tell.intensity * 0.45,
          phase: (step / 3 + (tell.x * 0.37 + tell.y * 0.19)) % 1,
        };
        return piece;
      });
    }
    case 'light': {
      // **Esta senal se habia perdido al pasar a tres dimensiones.** En 2D la
      // luz se pinta sobre el dibujo de la casa; aqui la casa es un volumen, y
      // el punto que da `tellsFor` cae dentro de sus paredes, asi que el
      // resplandor quedaba encerrado y no se veia ni una luz en todo el valle.
      //
      // Ahora sale **por las ventanas**, una por hueco, del tamano del hueco y
      // un dedo por fuera del muro. La primera version la sacaba a la fachada
      // como un solo rectangulo de medio muro, y se leia como un cartel.
      const home = at === undefined ? undefined : at(tell.x, tell.y);
      const holes = home === undefined ? undefined : WINDOWS[BUILDING_ASSETS[home.kind] ?? ''];
      if (home === undefined || holes === undefined) {
        // Una familia sin ventanas catalogadas —o un ancla que ya no cae en
        // ninguna casa— conserva el resplandor sobre el caballete, que es
        // pequeno y siempre se ve.
        const glow = mark(
          new BoxGeometry(0.22, 0.1, 0.22), TONE.light, true,
          tell.x, HEIGHT.roofGlow, tell.y, 0.85,
        );
        glow.object.userData.lamp = 0.85;
        return [glow];
      }
      return holes.map((hole) => {
        const at = atFace(home, hole);
        const lit = mark(
          new BoxGeometry(
            at.out[0] === 0 ? hole.wide : GLASS,
            hole.tall,
            at.out[1] === 0 ? hole.wide : GLASS,
          ),
          TONE.light, true,
          at.x + at.out[0] * GLASS,
          hole.up,
          at.z + at.out[1] * GLASS,
          0.95,
        );
        lit.object.userData.lamp = 0.95;
        // Va sobre el muro, que es donde van las ventanas: la prueba que exige
        // que ninguna senal quede enterrada tiene que saberlo.
        lit.object.userData.mounted = true;
        return lit;
      });
    }
    case 'plague': {
      // **Una cruz en la pared, junto a la puerta**, que es lo que §11.1 dice
      // con esas palabras. Estuvo dentro del muro hasta v3.42 y encima del
      // caballete despues, y encima del caballete era una bola morada flotando
      // sobre el tejado: se leia como un globo, no como una casa marcada.
      //
      // Va siempre en la fachada, la cara de -Y, **sin mirar si el vecino esta
      // pegado**. Es la diferencia con la luz: la luz encerrada entre dos casas
      // no la ve nadie, pero una cruz es pintura sobre el muro y se ve desde
      // donde se ve el muro, que es de donde mira la camara.
      const home = at === undefined ? undefined : at(tell.x, tell.y);
      if (home === undefined) {
        return [mark(new SphereGeometry(0.12, 6, 5), TONE.plague, false, tell.x, HEIGHT.plague, tell.y)];
      }
      const x = home.x + home.w * 0.78;
      // La fachada es el borde de +Z, que es el que mira a la camara.
      const z = home.y + home.h + GLASS;
      const arm = mark(new BoxGeometry(0.26, 0.07, GLASS), TONE.plague, false, x, 0.52, z, 1);
      const post = mark(new BoxGeometry(0.08, 0.32, GLASS), TONE.plague, false, x, 0.52, z, 1);
      for (const piece of [arm, post]) piece.object.userData.mounted = true;
      return [post, arm];
    }
    case 'candles': {
      // Las velas se ponen en la fachada de la capilla por el mismo motivo que
      // la luz: dentro no las ve nadie.
      const chapel = at === undefined ? undefined : at(tell.x, tell.y);
      const spot = chapel === undefined
        ? { x: tell.x, z: tell.y, free: true }
        : outsideOf(chapel, at as (x: number, y: number) => Building | undefined);
      const height = spot.free ? HEIGHT.candles : HEIGHT.roofGlow;
      return Array.from({ length: Math.max(1, Math.min(5, tell.count)) }, (_, index) => {
        const candle = mark(
          new BoxGeometry(0.05, 0.16, 0.05), TONE.candles, true,
          spot.x + (index - 2) * 0.13, height, spot.z, 0.95,
        );
        candle.object.userData.lamp = 0.95;
        return candle;
      });
    }
    case 'banner':
      return [mark(
        new BoxGeometry(0.07, 0.42, 0.02), BANNER_TONES[tell.colour] ?? '#8C3B34', false,
        tell.x, HEIGHT.banner, tell.y,
      )];
    case 'granary': {
      // El grano se ve por cuánto llena, no por su color: un montón que sube.
      //
      // Y sube **delante** del granero, no en su centro: en el centro quedaba
      // debajo del granero, que va sobre postes, y desde arriba no se veía
      // crecer nada. Delante es donde se apila el grano de todas formas.
      const barn = at === undefined ? undefined : at(tell.x + 1, tell.y + 1);
      const tall = Math.max(0.04, tell.fraction * 0.5);
      const spot = barn === undefined
        ? { x: tell.x + 1, z: tell.y + 1, free: true }
        : outsideOf(barn, at as (x: number, y: number) => Building | undefined);
      // El montón no se va al tejado cuando no hay cara libre: se queda pegado
      // al granero, que va sobre postes y por debajo se ve algo. Un montón de
      // grano flotando sobre el caballete no sería una señal, sería un error.
      return [mark(
        new BoxGeometry(1.15, tall, 0.6), TONE.grain, false,
        spot.x, HEIGHT.grain + tall / 2, spot.z,
      )];
    }
    default:
      return [];
  }
}

/**
 * Cuánto tarda una bocanada en subir y deshacerse, en segundos.
 *
 * TUNE: seis. Es humo de leña visto desde lejos, no vapor de una locomotora:
 * más rápido parece que la casa arde, y la casa que arde ya tiene su señal.
 */
const PLUME_SECONDS = 6;

/** Lo que sube una bocanada antes de deshacerse, en celdas. */
const PLUME_RISE = 1.05;

interface Plume {
  readonly mesh: Object3D;
  readonly base: number;
  readonly peak: number;
  readonly phase: number;
}

/** Una señal que sólo alumbra de noche, con la opacidad que le toca de pleno. */
interface Lamp {
  readonly mesh: Object3D;
  readonly peak: number;
}

export class Tells {
  readonly group = new Group();
  private owned: Array<{ dispose(): void }> = [];
  private plumes: Plume[] = [];
  private lamps: Lamp[] = [];
  private signature = '';

  constructor() {
    this.group.name = 'Valley_Tells';
  }

  /** Pone las señales al día. Sin cambios, no toca nada. */
  update(state: GameState): void {
    const tells = tellsFor(state);
    const signature = signatureOf(tells);
    if (signature === this.signature) return;
    // El orden importa: `clear` borra la firma, así que guardarla antes la
    // perdía y todo se reconstruía en cada fotograma. Lo cazó la prueba
    // comparando si el primer objeto seguía siendo el mismo.
    this.clear();
    this.signature = signature;
    // Qué casa hay en un punto. Se arma una vez por reconstrucción, no una por
    // señal: son unas pocas decenas de edificios y unas pocas señales, pero
    // buscar dentro del bucle sería multiplicarlos.
    const standing = state.buildings.filter((building) => building.lostTick === null);
    const at = (x: number, y: number): Building | undefined => standing.find(
      (building) => x >= building.x && x < building.x + building.w
        && y >= building.y && y < building.y + building.h,
    );
    for (const tell of tells) {
      for (const piece of bodyOf(tell, at)) {
        this.group.add(piece.object);
        this.owned.push(piece);
        const plume = piece.object.userData.plume as Omit<Plume, 'mesh'> | undefined;
        if (plume !== undefined) this.plumes.push({ mesh: piece.object, ...plume });
        const lamp = piece.object.userData.lamp as number | undefined;
        if (lamp !== undefined) this.lamps.push({ mesh: piece.object, peak: lamp });
      }
    }
  }

  /**
   * Mueve el humo.
   *
   * Esto sí es de cada fotograma, y es lo único que lo es: el resto de señales
   * cambia con la semana. Una bocanada sube, se hincha y se deshace, y vuelve a
   * empezar. La hora sale del reloj de presentación y de nada más, así que dos
   * máquinas en el mismo instante dibujan el mismo humo (§4.3).
   *
   * Una columna quieta era lo que delataba que el valle era una maqueta: todo
   * lo demás se movía menos lo que por definición no puede estarse quieto.
   */
  drift(presentationSeconds: number, dayPhase = 1, speed: 0 | 1 | 4 | 16 | 64 = 1): void {
    // Las luces se encienden cuando cae el día y se apagan al salir el sol.
    // §10.3 dice **luz al caer el día**, y una ventana encendida a mediodía no
    // dice que haya alguien en casa: dice que el render no sabe qué hora es.
    //
    // Con la velocidad, y no sólo con la hora: a ×64 la jornada de luz se queda
    // quieta (D.6.1) y unas ventanas encendiéndose dos veces por segundo sobre
    // un valle a pleno sol serían exactamente eso, un render que no sabe qué
    // hora es.
    const dusk = 1 - daylightAt(dayPhase, speed).daylight;
    for (const lamp of this.lamps) {
      const material = (lamp.mesh as Object3D & { material?: { opacity: number; transparent: boolean } }).material;
      lamp.mesh.visible = dusk > 0.02;
      if (material !== undefined) {
        material.transparent = true;
        material.opacity = lamp.peak * dusk;
      }
    }

    for (const plume of this.plumes) {
      const turn = (presentationSeconds / PLUME_SECONDS + plume.phase) % 1;
      plume.mesh.position.y = plume.base + turn * PLUME_RISE;
      // Se hincha al subir, como el humo de verdad, y se apaga al final.
      //
      // Poco, y menos de lo que pedia el primer intento: hinchandose al doble y
      // medio, de cerca eran discos grises del tamano de un tejado. El humo
      // tiene que verse de lejos y no taparle la casa a nadie de cerca.
      plume.mesh.scale.setScalar(1 + turn * 0.7);
      const mesh = plume.mesh as Object3D & { material?: { opacity: number; transparent: boolean } };
      if (mesh.material !== undefined) {
        mesh.material.transparent = true;
        mesh.material.opacity = plume.peak * 0.55 * Math.max(0, 1 - turn) * (0.35 + 0.65 * Math.min(1, turn * 4));
      }
    }
  }

  get count(): number {
    return this.group.children.length;
  }

  clear(): void {
    this.group.clear();
    for (const piece of this.owned) piece.dispose();
    this.owned = [];
    this.plumes = [];
    this.lamps = [];
    this.signature = '';
  }

  dispose(): void {
    this.clear();
  }
}
