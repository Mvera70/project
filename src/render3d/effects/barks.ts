// El valle más vivo (25 sep 2026) · El ladrido, dibujado.
//
// El juego no tiene sonido (se borró el sintetizado el 24 sep 2026 y queda el
// hueco para ficheros), así que el perro que ladra al forastero o al zorro lo
// enseña: tres ondas que salen del hocico y se desvanecen, en golpes de medio
// segundo, como las de una viñeta. Decorado: no toca el estado ni tira dados.

import { CanvasTexture, Group, Sprite, SpriteMaterial, type Texture } from 'three';

/** Un golpe de ladrido, en segundos: guau, pausa, guau. */
const BARK_SECONDS = 0.55;
/** A qué altura sale y cuánto se adelanta del cuerpo, en celdas. */
const MOUTH = { up: 0.17, ahead: 0.24 };

function wavesTexture(): Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    // Trazo oscuro con halo claro: se lee igual sobre la hierba, el barro de
    // la plaza y la nieve. La primera versión, blanca y aditiva, desaparecía
    // sobre el suelo claro de la plaza.
    ctx.lineCap = 'round';
    for (const [style, extra] of [['rgba(250,244,228,0.9)', 4], ['rgba(58,44,32,1)', 0]] as const) {
      ctx.strokeStyle = style;
      for (let n = 0; n < 3; n += 1) {
        ctx.lineWidth = 5 - n + extra;
        ctx.beginPath();
        ctx.arc(8, 32, 12 + n * 14, -0.6, 0.6);
        ctx.stroke();
      }
    }
  }
  return new CanvasTexture(canvas);
}

export interface Barks {
  readonly group: Group;
  step(dog: { readonly x: number; readonly z: number; readonly facing: number; readonly barking: boolean } | null,
    ground: (x: number, z: number) => number, seconds: number, right: { readonly x: number; readonly z: number }): void;
  dispose(): void;
}

export function createBarks(): Barks {
  const group = new Group();
  group.name = 'Valley_Barks';
  const map = wavesTexture();
  const material = new SpriteMaterial({ transparent: true, depthWrite: false,
    opacity: 0, ...(map === null ? {} : { map }) });
  const sprite = new Sprite(material);
  sprite.center.set(0, 0.5);
  sprite.visible = false;
  group.add(sprite);
  let time = 0;

  return {
    group,
    step(dog, ground, seconds, right): void {
      time += Math.max(0, seconds);
      if (dog === null || !dog.barking) { sprite.visible = false; return; }
      const beat = (time % BARK_SECONDS) / BARK_SECONDS;
      const x = dog.x + Math.sin(dog.facing) * MOUTH.ahead;
      const z = dog.z + Math.cos(dog.facing) * MOUTH.ahead;
      sprite.visible = true;
      sprite.position.set(x, ground(x, z) + MOUTH.up, z);
      // Crece y se va en cada golpe; el sprite mira siempre a la cámara, así
      // que se voltea para que las ondas salgan hacia el lado al que mira.
      const size = 0.24 + 0.16 * beat;
      const side = Math.sin(dog.facing) * right.x + Math.cos(dog.facing) * right.z >= 0 ? 1 : -1;
      sprite.scale.set(size * side, size, 1);
      material.opacity = 0.85 * (1 - beat);
    },
    dispose(): void {
      material.dispose();
      map?.dispose();
    },
  };
}
