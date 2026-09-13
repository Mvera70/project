// §11.1.1 · La burbuja sobre la cabeza. design.md §11.1.1, §11.9.
//
// Qué está viviendo cada uno lo decide `moodsFor`, que es estado y nada más;
// quién está parado hablando lo dice el propio actor. Esto sólo decide qué
// forma tiene la nube y dónde se pone.
//
// **Es lo único de la escena que no está en el mundo sino delante de él**: una
// nube de cómic no es un objeto del valle, es una anotación encima. Por eso va
// en carteles que siempre miran a la cámara y por eso no proyecta sombra ni la
// recibe: si se inclinara con el terreno dejaría de leerse en cuanto la cámara
// girase, y dejar de leerse es lo único que no puede hacer.
//
// Los iconos se dibujan **por código** sobre un lienzo, como los sprites del
// render 2D (§10.5): son seis dibujos de diez trazos y meterlos como ficheros
// habría sido seis peticiones más por la red para lo mismo.

import {
  CanvasTexture, Group, LinearFilter, Sprite, SpriteMaterial, type Texture,
} from 'three';
import type { VillagerId } from '@engine/state';
import type { Mood } from '@render/moods';

/** Lo que puede decir una burbuja: lo que el estado dice, más la charla. */
export type Bubble = Mood | 'chat';

/**
 * A qué altura flota, en celdas.
 *
 * TUNE: 0,92. El aldeano mide 0,65 (D.6.2), así que esto la deja un palmo por
 * encima de la coronilla, que es donde se pone una nube de cómic. Más arriba se
 * despega de la persona y deja de decirse de quién es.
 */
const OVER_THE_HEAD = 0.92;

/**
 * Lo ancha que es, en celdas.
 *
 * TUNE: 0,5. A la distancia panorámica son unos pocos píxeles y se lee como
 * «ahí pasa algo», que es lo que tiene que decir de lejos; acercándose se lee
 * el icono. Más grande y una aldea con cinco burbujas es una aldea de nubes.
 */
const SIZE = 0.5;

/** El color del trazo de cada burbuja, de la paleta de P1. */
const INK: Readonly<Record<Bubble, string>> = {
  grief: '#3F5A78',
  birth: '#C7984A',
  quarrel: '#8C3B34',
  chat: '#5C6650',
};

/**
 * El dibujo de cada icono, en un lienzo de 64 por 64 ya centrado.
 *
 * Trazos gordos a propósito: esto se ve a veinte píxeles de ancho, y una línea
 * fina a ese tamaño es un píxel gris.
 */
const DRAW: Readonly<Record<Bubble, (ctx: CanvasRenderingContext2D) => void>> = {
  // Tres puntos: alguien está hablando. Es el icono que todo el mundo conoce.
  chat: (ctx) => {
    for (const x of [20, 32, 44]) {
      ctx.beginPath();
      ctx.arc(x, 32, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  // Una exclamación: una riña de §6.4 recién estallada.
  quarrel: (ctx) => {
    ctx.fillRect(28, 14, 8, 22);
    ctx.beginPath();
    ctx.arc(32, 46, 5, 0, Math.PI * 2);
    ctx.fill();
  },
  // Una lágrima.
  grief: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(32, 14);
    ctx.bezierCurveTo(44, 32, 44, 48, 32, 48);
    ctx.bezierCurveTo(20, 48, 20, 32, 32, 14);
    ctx.fill();
  },
  // Una estrella: ha nacido alguien.
  birth: (ctx) => {
    ctx.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const angle = (point / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = point % 2 === 0 ? 20 : 8.5;
      ctx.lineTo(32 + Math.cos(angle) * radius, 32 + Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  },
};

/**
 * El cartel de una burbuja: la nube pálida y el icono encima.
 *
 * Se dibuja una vez por clase y se comparte entre todos los que la lleven. Seis
 * texturas para toda la partida.
 */
function textureFor(bubble: Bubble): Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    // La nube: un redondel claro con borde oscuro, para que se recorte igual
    // sobre un tejado de paja que sobre el bosque en invierno.
    ctx.fillStyle = 'rgba(242,244,246,0.94)';
    ctx.strokeStyle = 'rgba(48,48,41,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK[bubble];
    ctx.strokeStyle = INK[bubble];
    DRAW[bubble](ctx);
  }
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

interface Held {
  readonly sprite: Sprite;
  readonly material: SpriteMaterial;
  bubble: Bubble;
}

/**
 * Las burbujas puestas, seguidas persona a persona.
 *
 * Ni se reconstruyen por fotograma ni se rehacen al cambiar de estado: un
 * cartel por persona que lleve algo, y lo único que cambia es a qué textura
 * apunta y dónde está.
 */
export class Bubbles {
  readonly group = new Group();
  private readonly held = new Map<VillagerId, Held>();
  private readonly textures = new Map<Bubble, Texture>();

  constructor() {
    this.group.name = 'Valley_Bubbles';
    // Delante de todo: una anotación tapada por un tejado no es una anotación.
    this.group.renderOrder = 10;
  }

  private texture(bubble: Bubble): Texture {
    const known = this.textures.get(bubble);
    if (known !== undefined) return known;
    const made = textureFor(bubble);
    this.textures.set(bubble, made);
    return made;
  }

  /**
   * Pone la burbuja de quien lleve alguna, y quita la de quien ya no.
   *
   * `where` da la posición de cada uno ahora mismo, que cambia cada fotograma;
   * `what` dice qué lleva, que cambia con la semana. Separarlos es lo que deja
   * mover la nube sin tocar la textura.
   */
  update(
    where: ReadonlyMap<VillagerId, { x: number; y: number; z: number }>,
    what: ReadonlyMap<VillagerId, Bubble>,
  ): void {
    for (const [id, bubble] of what) {
      const at = where.get(id);
      if (at === undefined) continue;
      let held = this.held.get(id);
      if (held === undefined) {
        const material = new SpriteMaterial({ map: this.texture(bubble), transparent: true, depthTest: false });
        const sprite = new Sprite(material);
        sprite.scale.set(SIZE, SIZE, SIZE);
        sprite.renderOrder = 10;
        this.group.add(sprite);
        held = { sprite, material, bubble };
        this.held.set(id, held);
      }
      if (held.bubble !== bubble) {
        held.material.map = this.texture(bubble);
        held.material.needsUpdate = true;
        held.bubble = bubble;
      }
      held.sprite.position.set(at.x, at.y + OVER_THE_HEAD, at.z);
    }

    for (const id of [...this.held.keys()]) {
      if (!what.has(id)) this.retire(id);
    }
  }

  private retire(id: VillagerId): void {
    const held = this.held.get(id);
    if (held === undefined) return;
    this.group.remove(held.sprite);
    // El material es suyo y se suelta; la textura es compartida y no.
    held.material.dispose();
    this.held.delete(id);
  }

  get count(): number {
    return this.held.size;
  }

  clear(): void {
    for (const id of [...this.held.keys()]) this.retire(id);
  }

  dispose(): void {
    this.clear();
    for (const texture of this.textures.values()) texture.dispose();
    this.textures.clear();
  }
}
