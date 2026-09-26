// V-14 · El valle abierto. Anexo E.
//
// Lo que estas pruebas guardan es la decisión, no el dibujo: **la sierra vive
// fuera del mapa jugable**. Si algún día alguien la mete dentro «para que se
// vea mejor», aquí salta, porque meterla dentro es quitarle al valle un tercio
// de su bosque y tapiar el río.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { CATALOG } from '@engine/crossroads/catalog';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { PALETTES } from '@derive/palette';
import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import { elevationAt } from '../../src/render3d/world/ground';
import { GROUND_BIAS } from '../../src/render3d/visual-config';
import { buildRidge, exteriorWaterAt, ridgeAt } from '../../src/render3d/world/ridge';
import { valleyAxis } from '../../src/render3d/world/valley-profile';
import { buildBackdrop } from '../../src/render3d/world/backdrop';
import { riverSection } from '../../src/render3d/world/river-extension';

const grown = new Map<number, GameState>();
function village(seed: number): GameState {
  let base = grown.get(seed);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, 20 * 48, 'prudent', CATALOG);
    grown.set(seed, base);
  }
  return base;
}

describe('V-14 · el valle', () => {
  it('no pisa ni una celda del valle', () => {
    // La propiedad que lo hace gratis. Medido antes de escribirlo: en las dos
    // celdas del borde del mapa viven el 32 % del bosque, trece edificios de
    // una partida de cuarenta años y el cauce por donde el río entra y sale.
    // La sierra empieza donde el mapa acaba, y por eso no cuesta balance.
    //
    // **Y «no pisa» se dice contra el suelo, no contra el cero** (mapa grande).
    // Dentro del rectángulo jugable `ridgeAt` **es** el suelo, para que el
    // vértice del borde valga lo mismo en las dos mallas: con el cinturón de
    // montaña levantado seis celdas, devolver cero ahí dejaba un escalón de
    // dieciocho metros justo en el borde del mapa. Lo que esta prueba guarda
    // sigue siendo lo mismo: la sierra **no añade nada** sobre el valle.
    for (const seed of [7, 11, 23]) {
      const state = village(seed);
      for (let z = 0; z <= state.map.height; z += 1) {
        for (let x = 0; x <= state.map.width; x += 1) {
          expect(ridgeAt(state.map, state.terrainSeed, x, z),
            `semilla ${seed}: la sierra sube dentro del valle en ${x},${z}`)
            .toBe(elevationAt(state.map, x, z));
        }
      }
    }
  });

  it('mantiene bajos los extremos del eje y levanta los flancos', () => {
    const state = village(7);
    const { width, height } = state.map;
    const high = (x: number, z: number): number => ridgeAt(state.map, state.terrainSeed, x, z);
    for (const z of [-26, height + 26]) {
      const x = valleyAxis(state.map, z);
      expect(high(x, z), `el extremo del eje queda alto en ${x},${z}`).toBeLessThan(4);
    }
    for (const x of [-26, width + 26]) {
      expect(high(x, height / 2), `falta un flanco elevado en ${x}`).toBeGreaterThan(4);
    }
  });

  it('sube sin escalón: el pie de la sierra no deja una arruga en el borde', () => {
    // Con una recta en vez de la curva, el pie hacía un doblez justo donde
    // acaba el mapa y se leía como el corte que la sierra venía a quitar.
    //
    // **Se mide el pie y no la sierra entera**, que es donde está la propiedad:
    // arriba una ladera escarpada es lo propio de una montaña —y desde v3.64 lo
    // es a propósito, porque una falda larga y baja no se lee como desnivel—,
    // pero el arranque tiene que salir del prado sin que se vea dónde.
    const state = village(7);
    let worst = 0;
    for (let z = 0; z < state.map.height; z += 4) {
      const a = ridgeAt(state.map, state.terrainSeed, 0, z);
      const b = ridgeAt(state.map, state.terrainSeed, -1, z);
      worst = Math.max(worst, Math.abs(b - a));
    }
    // Menos de media celda de subida por celda andada en las cinco primeras: el
    // pie se confunde con el prado.
    expect(worst, `el mayor escalón del pie es ${worst.toFixed(2)} celdas`).toBeLessThan(0.5);
  });

  it('la misma partida da siempre la misma sierra', () => {
    // §4.3: el render no consume azar. La forma sale de `terrainSeed` por una
    // función pura, así que mirar el valle no lo cambia.
    const state = village(11);
    for (const [x, z] of [[-8, 10], [-20, 30], [40, -9], [12, 70]] as const) {
      const once = ridgeAt(state.map, state.terrainSeed, x, z);
      expect(ridgeAt(state.map, state.terrainSeed, x, z)).toBe(once);
    }
    // Y dos valles distintos dan dos sierras distintas.
    const other = village(23);
    let same = 0;
    let seen = 0;
    for (let x = -24; x < -4; x += 2) {
      seen += 1;
      if (ridgeAt(state.map, state.terrainSeed, x, 20)
        === ridgeAt(other.map, other.terrainSeed, x, 20)) same += 1;
    }
    expect(same, `${same} de ${seen} puntos coinciden entre dos valles`).toBeLessThan(seen / 2);
  });

  it('se arma una sola malla, y no una montaña por celda', () => {
    const state = village(7);
    const ridge = buildRidge(state.map, state.terrainSeed);
    const position = ridge.geometry.getAttribute('position');
    expect(position.count, 'tiene vértices').toBeGreaterThan(100);
    // Sin índices desde la sierra facetada (26 sep 2026): cada cara lleva su
    // propio color, así que cada tres vértices son un triángulo.
    const triangles = (ridge.geometry.getIndex()?.count ?? position.count) / 3;
    expect(triangles, `la malla exterior tiene ${triangles} triángulos`).toBeLessThan(16_000);
    expect(ridge.geometry.getAttribute('color'), 'el color va por vértice').toBeDefined();
    // Y ningún vértice de dentro del valle se despega del suelo: el suelo de
    // siempre es quien pinta el interior, y dos superficies a distinta altura en
    // el mismo sitio son una junta abierta. **Contra el suelo y no contra cero**
    // desde el mapa grande: el cinturón de montaña levanta el borde, y la
    // sierra tiene que empalmar con él. Ver la primera prueba de este fichero.
    let inside = 0;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      // Con el borde incluido: sin índices, la malla ya no guarda los vértices
      // del interior que ninguna cara usaba, y el empalme es el propio borde.
      if (x >= 0 && z >= 0 && x <= state.map.width && z <= state.map.height) {
        expect(position.getY(i), 'un vértice despegado del suelo dentro del valle')
          .toBeCloseTo(GROUND_BIAS + elevationAt(state.map, x, z), 5);
        inside += 1;
      }
    }
    expect(inside, 'la malla llega hasta el valle').toBeGreaterThan(0);
    ridge.geometry.dispose();
  });

  it('el río sigue teniendo por dónde entrar y salir', () => {
    // Lo que mató al primer diseño: una montaña en el borde del mapa tapia el
    // cauce. Con la sierra fuera, el agua del contorno sigue siendo agua.
    for (const seed of [7, 11, 23]) {
      const state = village(seed);
      const { width, height, terrain } = state.map;
      let edgeWater = 0;
      for (let c = 0; c < terrain.length; c += 1) {
        const x = c % width;
        const z = Math.floor(c / width);
        const edge = x === 0 || z === 0 || x === width - 1 || z === height - 1;
        if (edge && terrain[c] === TERRAIN_CODE.water) edgeWater += 1;
      }
      expect(edgeWater, `semilla ${seed}: el río no toca el borde`).toBeGreaterThan(0);
      let extended = 0;
      for (let cell = 0; cell < terrain.length; cell += 1) {
        if (terrain[cell] !== TERRAIN_CODE.water) continue;
        const x = cell % width, z = Math.floor(cell / width);
        if (x === 0 && exteriorWaterAt(state.map, state.terrainSeed, -0.5, z + 0.5)) extended += 1;
        if (x === width - 1 && exteriorWaterAt(state.map, state.terrainSeed, width + 0.5, z + 0.5)) extended += 1;
        if (z === 0 && exteriorWaterAt(state.map, state.terrainSeed, x + 0.5, -0.5)) extended += 1;
        if (z === height - 1 && exteriorWaterAt(state.map, state.terrainSeed, x + 0.5, height + 0.5)) extended += 1;
      }
      expect(extended, `semilla ${seed}: el agua exterior no empalma`).toBeGreaterThan(0);
    }
  });

  it('la prolongación del río nace en ambas salidas sin saltos y es estable', () => {
    for (const seed of [7, 11, 23]) {
      const state = village(seed);
      for (const [edgeZ, nextZ] of [[0, -0.01], [state.map.height, state.map.height + 0.01]] as const) {
        const edge = riverSection(state.map, state.terrainSeed, edgeZ);
        const next = riverSection(state.map, state.terrainSeed, nextZ);
        expect(edge).not.toBeNull();
        expect(next).not.toBeNull();
        expect(Math.abs(next!.left - edge!.left)).toBeLessThan(0.01);
        expect(Math.abs(next!.right - edge!.right)).toBeLessThan(0.01);
        expect(riverSection(state.map, state.terrainSeed, nextZ)).toEqual(next);
      }
    }
  });

  it('bosque y terreno exterior siguen la paleta sin tocar el mapa', () => {
    const state = village(7);
    const before = Array.from(state.map.terrain);
    const leaf = new Mesh(new BoxGeometry(1, 2, 1), new MeshStandardMaterial());
    leaf.material.name = 'leaf-light';
    const backdrop = buildBackdrop(state.map, state.terrainSeed, PALETTES.spring, leaf);
    expect(backdrop.treeCount).toBeGreaterThan(0);
    expect(backdrop.treeCount).toBeLessThanOrEqual(256);
    const spring = Array.from(backdrop.ridge.geometry.getAttribute('color').array);
    backdrop.season(PALETTES.autumn);
    const autumn = Array.from(backdrop.ridge.geometry.getAttribute('color').array);
    expect(autumn).not.toEqual(spring);
    expect(Array.from(state.map.terrain)).toEqual(before);
    backdrop.dispose();
    leaf.geometry.dispose();
    leaf.material.dispose();
  });
});
