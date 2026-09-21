// P-2 · La fuente de la plaza. `docs/task-log.md` §4.0b.
//
// El empedrado lo pinta el suelo (`ground.ts`, `cellColour`); esto es lo que va
// **en el centro**, y es lo que el dueño del diseño pidió con estas palabras:
// «en el centro quizás puedo poner una fuente, que eso habrá que hacerlo con
// 3D».
//
// **Mientras no exista la malla, una fuente de apaño de tres primitivas**, y por
// la misma razón que el barril y el arado la tienen (§7.14): una plaza empedrada
// con un agujero en medio no se lee como una plaza. En cuanto `fountain.glb`
// esté publicado —el encargo está escrito en `docs/encargos/encargo-fuente.md`—
// `instance('fountain')` lo devuelve y esto no se usa.

import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial,
  type BufferGeometry, type Material, type Object3D,
} from 'three';
import type { Era } from '@derive/era';

/**
 * Las medidas de la fuente, en celdas. Una celda son tres metros (D.6.2), así
 * que el pilón mide 2,4 m de ancho y la columna llega a 1,5 m: la altura del
 * pecho de una persona de 1,95 celdas... no, de las 0,65 celdas que mide un
 * aldeano. La fuente le llega por encima de la cabeza al pilón y no la tapa.
 *
 * TUNE: el pilón 0,8 de diámetro (2,4 m) cabe de sobra en un círculo de radio 3
 * y se ve desde la cámara de este juego; la columna, 0,5 de alto (1,5 m), es lo
 * que hace que el centro de la plaza tenga algo vertical que mirar.
 */
const BASIN_RADIUS = 0.4;
const BASIN_HEIGHT = 0.14;
const COLUMN_RADIUS = 0.09;
const COLUMN_HEIGHT = 0.5;

/** Piedra de la aldea y agua quieta: los dos colores salen de lo que ya hay. */
const STONE = 0x9a958c;
const WATER = 0x5c7f86;

export class PlazaFountain {
  readonly group = new Group();
  private readonly fountainOwn: BufferGeometry[] = [];
  private readonly fountainMaterials: Material[] = [];
  private readonly ambienceOwn: BufferGeometry[] = [];
  private readonly ambienceMaterials: Material[] = [];
  private at: string | null = null;
  private groundAt: ((x: number, z: number) => number) | null = null;
  private ambience: Group | null = null;
  private ambienceKey: string | null = null;

  constructor(private readonly instance?: (id: string) => Object3D | undefined) {
    this.group.name = 'Valley_Plaza';
  }

  /**
   * Pone la fuente en el centro de la plaza. `ground` da la cota del suelo, como
   * a los trastos y a los cuerpos.
   *
   * Se rehace sólo cuando la plaza cambia de sitio —o sea, al abrir otro valle—,
   * porque la plaza de un valle no se mueve (P-1): llamar cada fotograma no
   * cuesta nada y no reconstruye nada.
   */
  show(
    plaza: { x: number; y: number }, ground: (x: number, z: number) => number, era: Era = 'hamlet',
    isFree: (x: number, z: number) => boolean = () => true,
  ): void {
    const key = `${plaza.x},${plaza.y}`;
    if (this.at !== key || this.groundAt !== ground) {
      this.at = key;
      this.groundAt = ground;
      this.clear();
      const model = this.instance?.('fountain');
      const object = model ?? this.standIn();
      object.position.set(plaza.x, ground(plaza.x, plaza.y), plaza.y);
      object.traverse((child) => { child.castShadow = true; child.receiveShadow = true; });
      this.group.add(object);
    }
    const wanted = era === 'village' ? 2 : era === 'town' ? 4 : 0;
    const candidates = [
      [-1.25, -1.25], [1.25, 1.25], [-1.25, 1.25], [1.25, -1.25],
      [-1.7, -0.85], [1.7, 0.85], [-1.7, 0.85], [1.7, -0.85],
    ] as const;
    const spots = candidates
      .map(([dx, dz]) => [plaza.x + dx, plaza.y + dz] as const)
      .filter(([x, z]) => {
        // Se comprueba toda la pequeña huella del banco, no sólo su centro.
        const footprint = [[0, 0], [-0.32, 0], [0.32, 0], [0, -0.18], [0, 0.18]] as const;
        return footprint.every((offset) => isFree(x + offset[0], z + offset[1]));
      })
      .slice(0, wanted);
    const ambienceKey = `${key}:${era}:${spots.map(([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`).join('|')}`;
    if (this.ambienceKey === ambienceKey) return;
    this.clearAmbience();
    this.ambienceKey = ambienceKey;
    if (era === 'hamlet') return;
    const props = new Group();
    props.name = 'Valley_Plaza_Ambience';
    // Las diagonales dejan libres el centro y los dos ejes que conectan los
    // accesos de la plaza. Son sólo lectura visual: no entran en la navegación.
    for (const [x, z] of spots) {
      const stoolShape = new CylinderGeometry(0.18, 0.2, 0.28, 7);
      const topShape = new BoxGeometry(0.56, 0.12, 0.26);
      const wood = new MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.82 });
      this.ambienceOwn.push(stoolShape, topShape);
      this.ambienceMaterials.push(wood);
      const stool = new Mesh(stoolShape, wood);
      const top = new Mesh(topShape, wood);
      stool.position.set(x, ground(x, z) + 0.14, z);
      top.position.set(x, ground(x, z) + 0.34, z);
      stool.castShadow = top.castShadow = true;
      props.add(stool, top);
    }
    this.ambience = props;
    this.group.add(props);
  }

  /** El pilón, el agua y la columna. */
  private standIn(): Object3D {
    const group = new Group();
    const stone = new MeshStandardMaterial({ color: STONE, roughness: 0.8 });
    const water = new MeshStandardMaterial({ color: WATER, roughness: 0.25, metalness: 0.1 });
    this.fountainMaterials.push(stone, water);

    const basinShape = new CylinderGeometry(BASIN_RADIUS, BASIN_RADIUS * 0.94, BASIN_HEIGHT, 14);
    const waterShape = new CylinderGeometry(BASIN_RADIUS * 0.82, BASIN_RADIUS * 0.82, 0.02, 14);
    const columnShape = new CylinderGeometry(COLUMN_RADIUS, COLUMN_RADIUS * 1.25, COLUMN_HEIGHT, 8);
    this.fountainOwn.push(basinShape, waterShape, columnShape);

    const basin = new Mesh(basinShape, stone);
    basin.position.y = BASIN_HEIGHT / 2;
    const pool = new Mesh(waterShape, water);
    pool.position.y = BASIN_HEIGHT * 0.92;
    const column = new Mesh(columnShape, stone);
    column.position.y = BASIN_HEIGHT + COLUMN_HEIGHT / 2;
    group.add(basin, pool, column);
    return group;
  }

  private clear(): void {
    this.clearAmbience();
    this.clearFountain();
    this.group.clear();
  }

  private clearAmbience(): void {
    if (this.ambience !== null) this.group.remove(this.ambience);
    for (const geometry of this.ambienceOwn) geometry.dispose();
    for (const material of this.ambienceMaterials) material.dispose();
    this.ambienceOwn.length = 0;
    this.ambienceMaterials.length = 0;
    this.ambience = null;
    this.ambienceKey = null;
  }

  private clearFountain(): void {
    for (const geometry of this.fountainOwn) geometry.dispose();
    for (const material of this.fountainMaterials) material.dispose();
    this.fountainOwn.length = 0;
    this.fountainMaterials.length = 0;
  }

  dispose(): void {
    this.clear();
    this.at = null;
    this.groundAt = null;
  }
}
