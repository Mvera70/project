// V-14 · El cuenco. design.md Anexo E, D.5.
//
// Las montañas que cierran el valle. **Van fuera del mapa jugable**, y esa es
// toda la decisión de diseño:
//
// El primer plan era levantar el borde del propio mapa. Se midió antes de
// escribirlo y no salía: en las dos celdas del contorno viven **el 32 % del
// bosque del valle** —135 celdas de 419—, trece edificios de una partida de
// cuarenta años, y el cauce por el que el río entra y sale. Cerrar el borde con
// roca intransitable habría quitado un tercio de la leña, tapiado el río y
// derribado casas, y todo eso es balance del motor.
//
// Así que el cuenco empieza donde el mapa acaba. El motor no sabe que existe:
// ni una constante, ni un tick, ni un byte del fichero de guardado. Y hace
// exactamente lo que hacía falta, que era que el valle se vea como un valle.
//
// De paso retira un parche: el mapa terminaba en un corte recto contra el cielo
// y había niebla puesta ahí para disimularlo (D.5). Un valle que se cierra solo
// no necesita que se lo tapen.
//
// §4.3 intacto: la forma sale de `terrainSeed` por una función pura, así que la
// misma partida da siempre la misma sierra y nadie consume azar del motor.

import {
  BufferAttribute, BufferGeometry, Color, Mesh, MeshStandardMaterial,
} from 'three';
import { hash32 } from '@engine/rng';
import type { ValleyMap } from '@engine/state';

/**
 * Lo ancho que es la falda, en celdas, desde el borde del mapa hacia fuera.
 *
 * TUNE: dieciséis, y empezó en veintiséis. Con la falda larga la sierra sube
 * tan despacio que desde la aldea no se ve montaña ninguna: se ve el prado
 * inclinándose, que es justo lo que el dueño del diseño dijo —«el cuenco no
 * parece un cuenco, no aprecio el desnivel»—. Una ladera corta y alta se lee
 * como ladera; una larga y baja se lee como nada.
 */
const SKIRT = 16;

/**
 * Lo alto que llega la cumbre, en celdas.
 *
 * TUNE: quince. Una celda es tres metros (D.6.2), así que son cuarenta y cinco:
 * una loma alta, no un pico alpino. Más arriba, la ladera del sur —que queda
 * entre la cámara y el pueblo— empieza a comérselo; más abajo no cierra nada y
 * el valle sigue pareciendo una alfombra sobre una mesa.
 */
const PEAK = 15;

/** Cada cuántas celdas se toma un vértice de la sierra. */
const STRIDE = 2;

/** Un número estable en [0,1) para un nudo de la rejilla del ruido. */
function knot(seed: number, a: number, b: number): number {
  return hash32(seed, `ridge:${a}:${b}`) / 4_294_967_296;
}

/**
 * Ruido suave: el valor de los cuatro nudos que rodean al punto, mezclados.
 *
 * **Interpolado y no escalonado**, que fue el primer error: tomando el nudo más
 * cercano, el ruido saltaba de golpe al cruzar la mitad entre dos, y la ladera
 * daba un escalón de 3,47 celdas de una celda a la siguiente. Eso no es una
 * montaña, es un muro. La mezcla en coseno pasa de un nudo al otro sin que se
 * vea dónde.
 */
function noise(seed: number, x: number, z: number, scale: number): number {
  const gx = x / scale;
  const gz = z / scale;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const fx = (1 - Math.cos((gx - x0) * Math.PI)) / 2;
  const fz = (1 - Math.cos((gz - z0) * Math.PI)) / 2;
  const a = knot(seed, x0, z0);
  const b = knot(seed, x0 + 1, z0);
  const c = knot(seed, x0, z0 + 1);
  const d = knot(seed, x0 + 1, z0 + 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/**
 * Cuánto sube el terreno en un punto, dentro o fuera del mapa.
 *
 * Cero dentro del valle y en su orilla, y de ahí hacia fuera sube con una curva
 * suave. **La curva importa**: con una recta, el pie de la sierra hace una
 * arruga visible justo en el borde del mapa y se lee como el corte que se venía
 * a quitar. Con el coseno, el prado sale hacia arriba sin que se vea dónde.
 */
export function ridgeAt(map: ValleyMap, seed: number, x: number, z: number): number {
  // Lo lejos que está del rectángulo jugable, por fuera.
  const outX = Math.max(0, Math.max(-x, x - map.width));
  const outZ = Math.max(0, Math.max(-z, z - map.height));
  const out = Math.hypot(outX, outZ);
  if (out <= 0) return 0;

  // **Arranca plana y se empina.** El coseno sube ya en la primera celda —1,35
  // de golpe con la falda corta— y eso es el doblez en el borde del mapa que la
  // sierra venía a quitar. Con el cubo suavizado, el pie sale del prado sin que
  // se vea dónde y la pendiente se guarda para arriba, que es donde una ladera
  // escarpada se lee como montaña en vez de como error.
  const climb = Math.min(1, out / SKIRT);
  const eased = climb * climb * climb;

  // Y la cresta no es lisa: dos escalas de ruido, una para los macizos y otra
  // para que la silueta no sea un arco de circunferencia.
  const big = noise(seed, x, z, 11);
  const fine = noise(seed + 811, x, z, 4);
  const rough = 0.62 + big * 0.55 + fine * 0.22;

  return eased * PEAK * rough;
}

/**
 * La sierra que rodea el valle, como una sola malla.
 *
 * Una malla y no una montaña por celda: son unos miles de triángulos y no
 * cambian nunca, así que se construyen al cargar el valle y no se vuelven a
 * tocar. El coste por fotograma es el de dibujar un objeto más.
 */
export function buildRidge(map: ValleyMap, seed: number): Mesh {
  const from = -SKIRT;
  const toX = map.width + SKIRT;
  const toZ = map.height + SKIRT;
  const cols = Math.ceil((toX - from) / STRIDE) + 1;
  const rows = Math.ceil((toZ - from) / STRIDE) + 1;

  const points = new Float32Array(cols * rows * 3);
  const tint = new Float32Array(cols * rows * 3);

  // Del prado del pie a la roca de la cumbre, pasando por el monte bajo. El
  // color sale de la altura y no de un tipo de terreno nuevo: así no hay que
  // tocar paletas, ni `TERRAIN_CODE`, ni las pruebas que cuentan terrenos.
  const foot = new Color('#6E8C4F');
  const scrub = new Color('#4B6138');
  const stone = new Color('#7C7768');
  const mix = new Color();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = from + col * STRIDE;
      const z = from + row * STRIDE;
      const y = ridgeAt(map, seed, x, z);
      const at = (row * cols + col) * 3;
      points[at] = x;
      points[at + 1] = y;
      points[at + 2] = z;

      const high = Math.min(1, y / PEAK);
      if (high < 0.45) mix.copy(foot).lerp(scrub, high / 0.45);
      else mix.copy(scrub).lerp(stone, (high - 0.45) / 0.55);
      tint[at] = mix.r;
      tint[at + 1] = mix.g;
      tint[at + 2] = mix.b;
    }
  }

  // Sólo se cosen los cuadros que tienen algo de altura: el interior del valle
  // lo pinta el suelo de siempre, y solaparlos daría el parpadeo de dos
  // superficies peleándose por el mismo píxel.
  const faces: number[] = [];
  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const a = row * cols + col;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      const tallest = Math.max(
        points[a * 3 + 1] ?? 0, points[b * 3 + 1] ?? 0,
        points[c * 3 + 1] ?? 0, points[d * 3 + 1] ?? 0,
      );
      if (tallest <= 0.001) continue;
      faces.push(a, c, b, b, c, d);
    }
  }

  const shape = new BufferGeometry();
  shape.setAttribute('position', new BufferAttribute(points, 3));
  shape.setAttribute('color', new BufferAttribute(tint, 3));
  shape.setIndex(faces);
  shape.computeVertexNormals();

  const rock = new Mesh(shape, new MeshStandardMaterial({
    vertexColors: true,
    // Mate: una sierra que brilla parece plástico, y además compite con los
    // tejados, que son lo que hay que mirar.
    roughness: 1,
    metalness: 0,
  }));
  rock.name = 'Valley_Ridge';
  rock.receiveShadow = true;
  // No proyecta: con el sol bajo, la sierra del este echaría una sombra sobre
  // medio pueblo y lo que hay que ver es el pueblo.
  rock.castShadow = false;
  return rock;
}
