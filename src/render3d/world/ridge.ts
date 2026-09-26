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
  BufferAttribute, BufferGeometry, Color, DataTexture, LinearFilter,
  LinearMipmapLinearFilter, Mesh, MeshStandardMaterial, RepeatWrapping,
  RGBAFormat, SRGBColorSpace,
} from 'three';
import { hash32 } from '@engine/rng';
import type { ValleyMap } from '@engine/state';
import { PALETTES, type Palette } from '@derive/palette';
import { GROUND_BIAS } from '../visual-config';
import { elevationAt, groundBorderNormalAt, groundColourAt } from './ground';
import { valleyShoulder } from './valley-profile';
import { paintFacets } from './mountains';
import { riverExtensionAt } from './river-extension';

/**
 * Lo ancho que es la falda, en celdas, desde el borde del mapa hacia fuera.
 *
 * TUNE visual: 96 celdas. El relieve exterior alcanza el borde del encuadre
 * panorámico para que no aparezca un plano vacío detrás de la montaña.
 */
export const SKIRT = 96;

/**
 * Lo alto que llega la cumbre, en celdas.
 *
 * TUNE visual: 11.5. Las lomas exteriores se leen como montaña; el perfil las
 * eleva gradualmente para no levantar una pared junto al borde jugable.
 */
const PEAK = 19;

/** Cada cuántas celdas se toma un vértice de la sierra. */
const STRIDE = 2;

/**
 * Una textura mineral muy pequeña, creada una sola vez al montar la sierra.
 * El dibujo mezcla grano, vetas horizontales y manchas amplias. Es deliberadamente
 * casi gris para que la estación siga mandando a través del color por vértice.
 */
function rockTexture(seed: number): DataTexture {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const broad = periodicNoise(seed + 1_907, x, y, 32, size) - 0.5;
      const grain = periodicNoise(seed + 3_271, x, y, 8, size) - 0.5;
      const fleck = grain > 0.36 ? 0.025 : 0;
      // Grano mineral discreto: las antiguas bandas largas se repetían como
      // zigzags negros a escala panorámica y ocultaban la forma de la roca.
      const stone = Math.max(0.88, Math.min(1, 0.975 + broad * 0.1 + grain * 0.06 + fleck));
      const blend = Math.max(0, Math.min(1, (Math.min(x, size - x) - 2) / 8));
      const value = 1 + (stone - 1) * blend;
      const at = (y * size + x) * 4;
      pixels[at] = Math.round(value * 255);
      pixels[at + 1] = Math.round(value * 255);
      pixels[at + 2] = Math.round(value * 255);
      pixels[at + 3] = 255;
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.name = 'Valley_Rock_Texture';
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

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
/** Lo de siempre, para no salirse del mapa al preguntar por su borde. */
function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

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

  // **Y arranca desde la cota del borde del mapa, no desde cero.** Desde el mapa
  // grande el cinturón de montaña llega hasta el borde levantado seis celdas
  // (`ground.ts`, `risesOf`), así que una sierra que empieza en cero dibujaba un
  // escalón de dieciocho metros justo en el borde: la roca de dentro quedaba
  // **más alta** que la sierra de fuera, y el valle se leía como una tarta. Se
  // vio en una captura al alejarse del todo.
  const edge = elevationAt(map, clamp(x, 0, map.width), clamp(z, 0, map.height));
  // Dentro del rectángulo jugable, la sierra **es** el suelo: así el vértice del
  // borde vale lo mismo en las dos mallas y la junta no existe. Devolver cero
  // aquí era un escalón de seis celdas —los dieciocho metros que el cinturón de
  // montaña se ha levantado— en el borde exacto del mapa.
  if (out <= 0) return edge;

  // El macizo del propio mapa puede medir seis celdas. Fuera del mapa se
  // convierte gradualmente en montañas redondeadas: prolongarlo desde el borde dibujaba
  // una pared oscura que dominaba incluso la vista panorámica.
  const descent = Math.min(1, out / 22);
  const eased = descent * descent * (3 - 2 * descent);
  const climb = Math.min(1, out / 20);
  const profile = climb * climb * (3 - 2 * climb);

  // Y la cresta no es lisa: dos escalas de ruido, una para los macizos y otra
  // para que la silueta no sea un arco de circunferencia.
  const big = noise(seed, x, z, 11);
  const fine = noise(seed + 811, x, z, 4);
  // Y crestas: un ruido «de arista» (1 − |2n − 1|) hace líneas de cumbre en
  // vez de cúpulas. Sin él la sierra eran lomas redondas (Vera, 26 sep 2026:
  // «las montañas tienen una textura muy mejorable»).
  const crest = 1 - Math.abs(2 * noise(seed + 419, x, z, 7) - 1);
  const rough = 0.42 + big * 0.75 + crest * 0.45 + fine * 0.2;

  // En la salida del río la ribera se mantiene bajo su lámina de agua.
  const wet = exteriorWaterAt(map, seed, x, z, 2.8);
  if (wet) return edge * (1 - eased) - 0.16 * eased;
  return edge * (1 - eased) + profile * PEAK * rough * valleyShoulder(map, x, z);
}

/** Ruido periodico: el primer y ultimo texel empalman al repetirse la piedra. */
function periodicNoise(seed: number, x: number, z: number, scale: number, period: number): number {
  const knots = period / scale;
  const gx = x / scale;
  const gz = z / scale;
  const rawX = Math.floor(gx);
  const rawZ = Math.floor(gz);
  const wrap = (value: number): number => ((value % knots) + knots) % knots;
  const x0 = wrap(rawX);
  const z0 = wrap(rawZ);
  const x1 = wrap(rawX + 1);
  const z1 = wrap(rawZ + 1);
  const fx = (1 - Math.cos((gx - rawX) * Math.PI)) / 2;
  const fz = (1 - Math.cos((gz - rawZ) * Math.PI)) / 2;
  const a = knot(seed, x0, z0);
  const b = knot(seed, x1, z0);
  const c = knot(seed, x0, z1);
  const d = knot(seed, x1, z1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/** El cauce continúa fuera del mapa, siguiendo las celdas de agua del borde. */
export function exteriorWaterAt(map: ValleyMap, seed: number, x: number, z: number, halfWidth = 1.35): boolean {
  if (z > 0 && z < map.height) return false;
  const distance = z <= 0 ? -z : z - map.height;
  return distance >= 0 && distance <= SKIRT - 4
    && riverExtensionAt(map, seed, x, z, halfWidth);
}

/**
 * Los colores de la malla siguen la misma paleta que el prado y el bosque.
 *
 * Desde el 26 sep 2026 cada cara tiene **un solo color**, el de su altura y su
 * pendiente (`faceColour`, `mountains.ts`): la sierra es facetada, como el
 * resto del valle. Sólo la franja que toca el borde del mapa conserva el
 * degradado por vértice, que es lo que casa su color con el del suelo.
 */
export function seasonRidge(mesh: Mesh, map: ValleyMap, palette: Palette, snow = 0): void {
  const position = mesh.geometry.getAttribute('position');
  const colour = mesh.geometry.getAttribute('color') as BufferAttribute;
  const values = colour.array as Float32Array;
  const foot = new Color(palette.meadow);
  const hillColour = new Color(palette.meadowAlt);
  const stoneColour = new Color(palette.stone);
  const tint = new Color();
  const smooth = (value: number): number => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const outside = Math.hypot(Math.max(0, -x, x - map.width), Math.max(0, -z, z - map.height));
    const edgeX = Math.max(0, Math.min(map.width, x));
    const edgeZ = Math.max(0, Math.min(map.height, z));
    tint.copy(groundColourAt(map, edgeX, edgeZ, palette));
    const crossing = smooth(outside / 4);
    tint.lerp(foot, crossing);
    tint.lerp(hillColour, 0.34 * crossing);
    // El ruido desplaza la frontera de roca sin seguir los cuadros de la rejilla.
    const drift = (noise(91, x, z, 7) - 0.5) * 2;
    const rise = Math.max(0, position.getY(i) - GROUND_BIAS);
    const rock = smooth((outside + drift - 1.5) / 4.5) * smooth((rise + 0.5) / 3);
    tint.lerp(stoneColour, rock * 0.9);
    const at = i * 4;
    values[at] = tint.r;
    values[at + 1] = tint.g;
    values[at + 2] = tint.b;
  }
  colour.needsUpdate = true;
  // La franja del borde conserva el color del suelo sólo donde es llana: en
  // la garganta es pared, y con el prado salían láminas verdes pegadas a ella.
  paintFacets(mesh.geometry, palette, snow, (y) => y - GROUND_BIAS,
    (x, z, rise, up) => up > 0.9 && rise < 1.2
      && Math.hypot(Math.max(0, -x, x - map.width), Math.max(0, -z, z - map.height)) < SEAM);
}

/** Lo ancha que es la franja del borde que conserva el color fundido con el suelo, en celdas. */
const SEAM = 3;

/**
 * La sierra que rodea el valle, como una sola malla.
 *
 * Una malla y no una montaña por celda: son unos miles de triángulos y no
 * cambian nunca, así que se construyen al cargar el valle y no se vuelven a
 * tocar. El coste por fotograma es el de dibujar un objeto más.
 */
export function buildRidge(map: ValleyMap, seed: number, palette: Palette = PALETTES.spring, snow = 0): Mesh {
  // Tres celdas a cada lado del empalme tienen paso uno; lejos, dos y seis.
  const axis = (size: number): number[] => {
    const values = new Set<number>([0, size, -SKIRT, size + SKIRT]);
    for (let at = -SKIRT; at <= -12; at += 6) values.add(at);
    for (let at = -12; at <= -3; at += STRIDE) values.add(at);
    for (let at = -3; at <= 3; at += 1) values.add(at);
    for (let at = 3; at <= size - 3; at += STRIDE) values.add(at);
    for (let at = size - 3; at <= size + 3; at += 1) values.add(at);
    for (let at = size + 3; at <= size + 12; at += STRIDE) values.add(at);
    for (let at = size + 12; at <= size + SKIRT; at += 6) values.add(at);
    return [...values].sort((a, b) => a - b);
  };
  const xs = axis(map.width), zs = axis(map.height);
  const cols = xs.length, rows = zs.length;

  const points = new Float32Array(cols * rows * 3);
  const tint = new Float32Array(cols * rows * 4);
  const uvs = new Float32Array(cols * rows * 2);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = xs[col]!;
      const z = zs[row]!;
      const y = ridgeAt(map, seed, x, z);
      const pointAt = (row * cols + col) * 3;
      points[pointAt] = x;
      points[pointAt + 1] = GROUND_BIAS + y;
      points[pointAt + 2] = z;

      // UV continuas en coordenadas del mundo. Elegir el eje según la ladera
      // producía un pliegue enorme en las esquinas y bandas en vista móvil.
      const uvAt = (row * cols + col) * 2;
      uvs[uvAt] = x / 17;
      uvs[uvAt + 1] = z / 17;

      const colourAt = (row * cols + col) * 4;
      tint[colourAt] = 1;
      tint[colourAt + 1] = 1;
      tint[colourAt + 2] = 1;
      // El último tramo se funde con el suelo lejano de la misma paleta.
      const outside = Math.hypot(Math.max(0, -x, x - map.width), Math.max(0, -z, z - map.height));
      const fade = Math.max(0, Math.min(1, (SKIRT - outside) / 9));
      tint[colourAt + 3] = fade * fade * (3 - 2 * fade);
    }
  }

  // **Se cose todo lo que está fuera del rectángulo jugable, tenga altura o
  // no.** El interior se salta porque ahí pinta el suelo de siempre, y una
  // segunda superficie a cota cero asomaría por el cauce del río, que baja
  // catorce centésimas.
  //
  // Antes la condición era «tiene algo de altura», y eso dejaba un hueco: entre
  // el borde del mapa y el punto donde la ladera empieza a subir no se dibujaba
  // nada, así que **se veía el fondo de la página por debajo del valle** y el
  // primer anillo de cuadros con altura dibujaba una silueta triangular con
  // aristas duras. Se vio en la primera captura de G-13 sin saber qué era: una
  // cuña marrón enorme sobre el río. Y encima mentía la luz — `computeVertexNormals`
  // sobre una malla con un agujero le da a los vértices del borde una normal
  // sacada sólo de los cuadros que sí están, así que el pie de la sierra cogía
  // luz como si fuera una pared.
  const faces: number[] = [];
  const extraPoints: number[] = [];
  const extraTint: number[] = [];
  const extraUvs: number[] = [];
  const borderVertex = (x: number, z: number): number => {
    const index = cols * rows + extraPoints.length / 3;
    extraPoints.push(x, GROUND_BIAS + ridgeAt(map, seed, x, z), z);
    extraTint.push(1, 1, 1, 1);
    extraUvs.push(0, (x === 0 || x === map.width ? z : x) / 17);
    return index;
  };
  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const a = row * cols + col;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      const x = xs[col]!;
      const z = zs[row]!;
      const inside = x >= 0 && z >= 0 && xs[col + 1]! <= map.width && zs[row + 1]! <= map.height;
      if (inside) continue;
      // En el borde hay una esquina de suelo por celda. Se añade solo la
      // esquina intermedia del anillo inmediato; lejos se conserva el LOD.
      const vertical = zs[row + 1]! - z === 2 && z >= 0 && zs[row + 1]! <= map.height;
      if (vertical && x === -1 && xs[col + 1] === 0) {
        const middle = borderVertex(0, z + 1);
        faces.push(a, c, b, b, c, middle, middle, c, d);
        continue;
      }
      if (vertical && x === map.width && xs[col + 1] === map.width + 1) {
        const middle = borderVertex(map.width, z + 1);
        faces.push(a, middle, b, middle, c, b, b, c, d);
        continue;
      }
      const horizontal = xs[col + 1]! - x === 2 && x >= 0 && xs[col + 1]! <= map.width;
      if (horizontal && z === -1 && zs[row + 1] === 0) {
        const middle = borderVertex(x + 1, 0);
        faces.push(a, c, b, b, c, middle, b, middle, d);
        continue;
      }
      if (horizontal && z === map.height && zs[row + 1] === map.height + 1) {
        const middle = borderVertex(x + 1, map.height);
        faces.push(a, c, middle, middle, c, b, b, c, d);
        continue;
      }
      faces.push(a, c, b, b, c, d);
    }
  }

  const shape = new BufferGeometry();
  shape.setAttribute('position', new BufferAttribute(Float32Array.from([...points, ...extraPoints]), 3));
  shape.setAttribute('color', new BufferAttribute(Float32Array.from([...tint, ...extraTint]), 4));
  shape.setAttribute('uv', new BufferAttribute(Float32Array.from([...uvs, ...extraUvs]), 2));
  shape.setIndex(faces);
  shape.computeVertexNormals();
  const normals = shape.getAttribute('normal') as BufferAttribute;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = xs[col]!;
      const z = zs[row]!;
      const border = (x === 0 || x === map.width) && z >= 0 && z <= map.height
        || (z === 0 || z === map.height) && x >= 0 && x <= map.width;
      if (!border) continue;
      const normal = groundBorderNormalAt(map, x, z);
      normals.setXYZ(row * cols + col, normal.x, normal.y, normal.z);
    }
  }
  for (let index = 0; index < extraPoints.length / 3; index += 1) {
    const x = extraPoints[index * 3]!;
    const z = extraPoints[index * 3 + 2]!;
    const normal = groundBorderNormalAt(map, x, z);
    normals.setXYZ(cols * rows + index, normal.x, normal.y, normal.z);
  }

  const texture = rockTexture(seed);
  // Sin índices, para que cada cara pueda tener su propio color; la luz
  // facetada la pone `flatShading`.
  const faceted = shape.toNonIndexed();
  shape.dispose();
  const rock = new Mesh(faceted, new MeshStandardMaterial({
    flatShading: true,
    vertexColors: true,
    map: texture,
    bumpMap: texture,
    bumpScale: 0.018,
    // Suelo opaco: escribe profundidad para ocultar árboles tras las lomas y
    // permitir que el agua transparente se dibuje después sobre su cauce.
    transparent: false,
    depthWrite: true,
    // Mate: una sierra que brilla parece plástico, y además compite con los
    // tejados, que son lo que hay que mirar.
    roughness: 1,
    metalness: 0,
    // El hemisférico solo deja la falda lejana casi negra de noche. El render
    // regula esta tenue luz reflejada con la hora, sin añadir otra lámpara.
    emissive: '#000000',
    emissiveIntensity: 0,
  }));
  rock.name = 'Valley_Ridge';
  rock.receiveShadow = false;
  // No proyecta: con el sol bajo, la sierra del este echaría una sombra sobre
  // medio pueblo y lo que hay que ver es el pueblo.
  rock.castShadow = false;
  seasonRidge(rock, map, palette, snow);
  return rock;
}
