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
import { daylightAt } from './daylight';
import { tellsFor, type Tell } from '@render/layers/tells';

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
      // **Esta señal se había perdido al pasar a tres dimensiones.** En 2D la
      // luz se pinta sobre el dibujo de la casa; aquí la casa es un volumen, y
      // el punto que da `tellsFor` cae dentro de sus paredes, así que el
      // resplandor quedaba encerrado y no se veía ni una luz en todo el valle.
      //
      // Se saca a la fachada, que es la cara de -Y: es donde la receta pone la
      // puerta y las ventanas. La casa se busca por el punto, y si no aparece
      // —porque alguien mueva el ancla del 2D— se deja donde venía, que es peor
      // pero no es un fallo.
      const home = at === undefined ? undefined : at(tell.x, tell.y);
      const spot = home === undefined
        ? { x: tell.x, z: tell.y, free: true }
        : outsideOf(home, at as (x: number, y: number) => Building | undefined);
      // Sin cara libre, la luz sube al caballete: encerrada entre dos casas no
      // la ve nadie, y la señal existe para verse. Arriba es **un resplandor
      // pequeño y no la ventana**: una ventana de tres metros flotando sobre el
      // tejado se lee como un panel encendido, no como una casa habitada. Lo
      // que sale por el caballete de una casa medieval es la luz del hogar por
      // el agujero del humo, y eso es del tamaño de un puño.
      const height = spot.free ? HEIGHT.light : HEIGHT.roofGlow;
      const shape = spot.free
        ? new BoxGeometry(0.7, 0.42, 0.06)
        : new BoxGeometry(0.22, 0.1, 0.22);
      const lit = mark(shape, TONE.light, true, spot.x, height, spot.z, 0.85);
      lit.object.userData.lamp = 0.85;
      return [lit];
    }
    case 'plague':
      // Por encima del caballete, no a media altura de la pared. A media altura
      // quedaba dentro de la casa, como la luz: la peste es una alarma y una
      // alarma que hay que buscar no es una alarma.
      return [mark(new SphereGeometry(0.13, 6, 5), TONE.plague, false, tell.x, HEIGHT.plague, tell.y)];
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
  drift(presentationSeconds: number, dayPhase = 1): void {
    // Las luces se encienden cuando cae el día y se apagan al salir el sol.
    // §10.3 dice **luz al caer el día**, y una ventana encendida a mediodía no
    // dice que haya alguien en casa: dice que el render no sabe qué hora es.
    const dusk = 1 - daylightAt(dayPhase).daylight;
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
