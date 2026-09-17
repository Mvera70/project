// V-09b · Los trastos, pintados. design.md Anexo E.
//
// Pelota, palo y cubo conservan las primitivas pequeñas de V-09. El haz ya tiene
// recurso publicado: cuando queda en el suelo se usa su GLB; mientras alguien
// lo lleva lo pinta `Cast`, unido al hueso de la mano.
//
// El mismo patrón que `Bubbles` (`effects/bubbles.ts`): un grupo, un trasto
// por id, se crea al aparecer y se retira cuando `propsOf` deja de listarlo —
// que es la vez que se suelta al morir/irse el `Village` entero, porque un
// trasto no sobrevive a la jornada (E.2).

import {
  CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry,
  type BufferGeometry, type Material, type Object3D,
} from 'three';
import type { PropSighting } from '../life/cast';

type Kind = PropSighting['kind'];

/**
 * El tamaño de cada trasto, en celdas.
 *
 * TUNE: pequeño a propósito. El aldeano mide 0,65 (D.6.2, `world/cast.ts`);
 * un trasto que compitiera en tamaño con la persona que lo lleva se leería
 * como un segundo actor, y esto es un objeto que se coge con una mano.
 */
const BALL_RADIUS = 0.14;
const OTHER_RADIUS = 0.11;
const OTHER_HEIGHT = 0.28;

/** El color de cada clase, de la paleta de P1: tinta y latón, sin colores que
 *  no estén ya en la aldea. */
const COLOUR: Readonly<Record<Kind, number>> = {
  ball: 0xb5502c,
  stick: 0x6b4a2b,
  bucket: 0x4a4a46,
  bundle: 0x8a6a3c,
  stone: 0x8f8a84,
};

interface Shown {
  readonly object: Object3D;
  readonly kind: Kind;
}

export class Props {
  readonly group = new Group();
  private readonly shown = new Map<number, Shown>();
  private readonly geometry: Readonly<Record<Kind, BufferGeometry>>;
  private readonly materials = new Map<Kind, Material>();

  constructor(private readonly instance?: (id: string) => Object3D | undefined) {
    this.group.name = 'Valley_Props';
    const ball = new SphereGeometry(BALL_RADIUS, 10, 8);
    const other = new CylinderGeometry(OTHER_RADIUS, OTHER_RADIUS, OTHER_HEIGHT, 8);
    this.geometry = { ball, stick: other, bucket: other, bundle: other, stone: other };
  }

  private materialFor(kind: Kind): Material {
    let material = this.materials.get(kind);
    if (material === undefined) {
      material = new MeshStandardMaterial({ color: COLOUR[kind], roughness: 0.85 });
      this.materials.set(kind, material);
    }
    return material;
  }

  /**
   * Pone cada trasto donde `propsOf` dice que está ahora, y retira el que ya
   * no sale en la lista — el mismo trato que `Cast.show` da a la gente.
   *
   * `ground` da la cota del suelo en cada punto, igual que `Cast.standOn`:
   * `sighting.y` es la altura *sobre* ese suelo (`props.ts`, `Prop.y`: cero es
   * el suelo, por encima va por el aire o en la mano), así que la posición
   * final es siempre la suma de las dos.
   */
  update(sightings: readonly PropSighting[], ground: (x: number, z: number) => number): void {
    const present = new Set<number>();
    for (const sighting of sightings) {
      // `Cast` ya cuelga el GLB del haz de la mano durante `carry_walk`.
      // Pintarlo también en sus coordenadas físicas produciría dos cargas.
      if ((sighting.kind === 'bundle' || sighting.kind === 'stone') && sighting.heldBy !== null) continue;
      present.add(sighting.id);
      let held = this.shown.get(sighting.id);
      if (held === undefined || held.kind !== sighting.kind) {
        if (held !== undefined) this.retire(sighting.id);
        const model = sighting.kind === 'bundle' ? this.instance?.('bundle')
          : sighting.kind === 'stone' ? this.instance?.('rock') : undefined;
        const object = model ?? new Mesh(this.geometry[sighting.kind], this.materialFor(sighting.kind));
        object.name = `Prop_${sighting.id}`;
        object.traverse(child => { child.castShadow = true; });
        if (model !== undefined) {
          // El recurso cuelga hacia abajo cuando va en la mano. En tierra se
          // tumba, se hace menor que una carga completa y se levanta medio
          // grosor para no enterrarlo.
          if (sighting.kind === 'bundle') object.rotation.x = Math.PI / 2;
          object.scale.setScalar(sighting.kind === 'stone' ? 0.24 : 0.65);
          object.userData.groundLift = sighting.kind === 'stone' ? 0.08 : 0.11;
        }
        this.group.add(object);
        held = { object, kind: sighting.kind };
        this.shown.set(sighting.id, held);
      }
      const lift = typeof held.object.userData.groundLift === 'number'
        ? held.object.userData.groundLift : 0;
      held.object.position.set(sighting.x, ground(sighting.x, sighting.z) + sighting.y + lift, sighting.z);
    }

    for (const id of [...this.shown.keys()]) {
      if (!present.has(id)) this.retire(id);
    }
  }

  private retire(id: number): void {
    const held = this.shown.get(id);
    if (held === undefined) return;
    this.group.remove(held.object);
    this.shown.delete(id);
  }

  get count(): number {
    return this.shown.size;
  }

  clear(): void {
    for (const id of [...this.shown.keys()]) this.retire(id);
  }

  dispose(): void {
    this.clear();
    // `stick`/`bucket`/`bundle` comparten una geometría: se libera una vez,
    // no tres.
    for (const geometry of new Set(Object.values(this.geometry))) geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
  }
}
