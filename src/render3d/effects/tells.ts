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
import type { GameState } from '@engine/state';
import { tellsFor, type Tell } from '@render/layers/tells';

/** Alturas en celdas. Una celda son unos tres metros (D.6.2). */
const HEIGHT = {
  smoke: 1.35,
  light: 0.35,
  plague: 0.55,
  candles: 0.6,
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
function bodyOf(tell: Tell): Array<{ object: Object3D; dispose(): void }> {
  switch (tell.kind) {
    case 'smoke': {
      // Tres bolas cada vez más altas y más tenues: una columna, no una mancha.
      // La intensidad viene del ánimo, y una aldea hundida humea poco.
      return [0, 1, 2].map((step) => mark(
        new SphereGeometry(0.09 + step * 0.035, 6, 5), TONE.smoke, false,
        tell.x, HEIGHT.smoke + step * 0.22, tell.y,
        (0.18 + tell.intensity * 0.45) * (1 - step * 0.25),
      ));
    }
    case 'light':
      return [mark(new BoxGeometry(0.16, 0.2, 0.06), TONE.light, true, tell.x, HEIGHT.light, tell.y)];
    case 'plague':
      return [mark(new SphereGeometry(0.11, 6, 5), TONE.plague, false, tell.x, HEIGHT.plague, tell.y)];
    case 'candles':
      return Array.from({ length: Math.max(1, Math.min(5, tell.count)) }, (_, index) => mark(
        new BoxGeometry(0.05, 0.12, 0.05), TONE.candles, true,
        tell.x + (index - 2) * 0.11, HEIGHT.candles, tell.y,
      ));
    case 'banner':
      return [mark(
        new BoxGeometry(0.07, 0.42, 0.02), BANNER_TONES[tell.colour] ?? '#8C3B34', false,
        tell.x, HEIGHT.banner, tell.y,
      )];
    case 'granary': {
      // El grano se ve por cuánto llena, no por su color: una caja que sube.
      const tall = Math.max(0.04, tell.fraction * 0.55);
      return [mark(
        new BoxGeometry(1.2, tall, 1.2), TONE.grain, false,
        tell.x + 1, HEIGHT.grain + tall / 2, tell.y + 1,
      )];
    }
    default:
      return [];
  }
}

export class Tells {
  readonly group = new Group();
  private owned: Array<{ dispose(): void }> = [];
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
    for (const tell of tells) {
      for (const piece of bodyOf(tell)) {
        this.group.add(piece.object);
        this.owned.push(piece);
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
    this.signature = '';
  }

  dispose(): void {
    this.clear();
  }
}
